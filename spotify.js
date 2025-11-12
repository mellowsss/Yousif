const redirectUri = 'https://yousif-pi.vercel.app/spotify.html';

const loginBtn = document.getElementById('login-btn');
const controls = document.getElementById('controls');
const results = document.getElementById('results');
const rangeSelect = document.getElementById('range-select');
const loadTracksBtn = document.getElementById('load-tracks');
const loadArtistsBtn = document.getElementById('load-artists');
const groupTracksBtn = document.getElementById('group-tracks');
const groupArtistsBtn = document.getElementById('group-artists');
const header = document.querySelector('.spotify-header');
const CLIENT_ID = 'd35862ff5a9d403db6fa8a321327b7f4';
let token = null;
let currentAudio = null;

// Scroll-triggered animations with Intersection Observer
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Header scroll effect and parallax
let lastScroll = 0;
const gradientBg = document.querySelector('.gradient-bg');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    // Header effect
    if (currentScroll > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    // Parallax effect for gradient background
    if (gradientBg) {
        const parallaxSpeed = 0.5;
        gradientBg.style.transform = `translateY(${currentScroll * parallaxSpeed}px)`;
    }
    
    lastScroll = currentScroll;
}, { passive: true });

// Smooth scroll to top
function smoothScrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Generate code verifier for PKCE
function generateCodeVerifier() {
    const array = new Uint32Array(56 / 2);
    crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}

// Generate code challenge from verifier
async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Parse authorization code from URL query params
function parseAuthCode() {
    const params = new URLSearchParams(window.location.search);
    return {
        code: params.get('code'),
        error: params.get('error')
    };
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code, codeVerifier) {
    const response = await fetch('/api/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, code_verifier: codeVerifier })
    });
    
    if (!response.ok) {
        const error = await response.json();
        const err = new Error(error.error || 'Token exchange failed');
        err.error_description = error.error_description;
        throw err;
    }
    
    return await response.json();
}

async function login() {
    const scopes = 'user-top-read';
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);
    
    const authUrl =
        `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}` +
        `&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;
    
    window.location.href = authUrl;
}

async function fetchPage(type, range, offset) {
    const url = `https://api.spotify.com/v1/me/top/${type}?limit=50&offset=${offset}&time_range=${range}`;
    const response = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!response.ok) throw new Error('API error');
    return response.json();
}

async function fetchData(type) {
    const range = rangeSelect.value;
    const [page1, page2] = await Promise.all([
        fetchPage(type, range, 0),
        fetchPage(type, range, 50)
    ]);
    return { items: [...page1.items, ...page2.items].slice(0, 100) };
}

function createCardElement(item, rank, isTrack = true) {
    const div = document.createElement('div');
    div.className = isTrack ? 'track' : 'artist';
    
    if (isTrack) {
        const img = item.album.images[2]?.url || item.album.images[0]?.url || '';
        const link = item.external_urls?.spotify || '#';
        const preview = item.preview_url;
        
        div.innerHTML = `
            <span class="rank-number">${rank}</span>
            <a href="${link}" target="_blank" rel="noopener noreferrer">
                <img src="${img}" alt="${item.name}" loading="lazy">
            </a>
            <div class="meta">
                <div class="name">${item.name}</div>
                <div class="artist-names">${item.artists.map(a => a.name).join(', ')}</div>
            </div>
            ${preview ? `<button class="preview-btn" data-url="${preview}" aria-label="Preview ${item.name}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                Preview
            </button>` : ''}
        `;
        
        // Add preview functionality
        if (preview) {
            const previewBtn = div.querySelector('.preview-btn');
            previewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePreview(preview, previewBtn);
            });
        }
    } else {
        const img = item.images[2]?.url || item.images[0]?.url || '';
        div.innerHTML = `
            <span class="rank-number">${rank}</span>
            <img src="${img}" alt="${item.name}" loading="lazy">
            <div class="name">${item.name}</div>
        `;
    }
    
    // Add scroll animation
    div.style.opacity = '0';
    div.style.transform = 'translateY(30px) scale(0.95)';
    observer.observe(div);
    
    return div;
}

function handlePreview(url, btn) {
    if (currentAudio && currentAudio.src === url) {
        if (currentAudio.paused) {
            currentAudio.play();
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
                </svg>
                Pause
            `;
        } else {
            currentAudio.pause();
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                Preview
            `;
        }
    } else {
        // Stop current audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            document.querySelectorAll('.preview-btn').forEach(b => {
                b.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    Preview
                `;
            });
        }
        
        // Play new audio
        currentAudio = new Audio(url);
        currentAudio.play();
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
            </svg>
            Pause
        `;
        
        currentAudio.addEventListener('ended', () => {
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                Preview
            `;
        });
    }
}

function displayTracks(data) {
    results.innerHTML = '<h2>Top 100 Tracks</h2><div class="list"></div>';
    const list = results.querySelector('.list');
    
    data.items.forEach((track, idx) => {
        const rank = idx + 1; // Start from 1
        const card = createCardElement(track, rank, true);
        list.appendChild(card);
    });
    
    // Scroll to top smoothly
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
}

function displayArtists(data) {
    results.innerHTML = '<h2>Top 100 Artists</h2><div class="list"></div>';
    const list = results.querySelector('.list');
    
    data.items.forEach((artist, idx) => {
        const rank = idx + 1; // Start from 1
        const card = createCardElement(artist, rank, false);
        list.appendChild(card);
    });
    
    // Scroll to top smoothly
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
}

loginBtn.addEventListener('click', login);

async function showTop(type) {
    results.classList.add('loading');
    results.innerHTML = '';
    smoothScrollToTop();
    
    try {
        const data = await fetchData(type);
        results.classList.remove('loading');
        
        if (type === 'tracks') {
            displayTracks(data);
        } else {
            displayArtists(data);
        }
    } catch (e) {
        results.classList.remove('loading');
        results.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7);">Error fetching data. Please try again.</div>';
    }
}

function setActive(btn) {
    [loadTracksBtn, loadArtistsBtn].forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

loadTracksBtn.addEventListener('click', () => { 
    setActive(loadTracksBtn); 
    showTop('tracks'); 
});

loadArtistsBtn.addEventListener('click', () => { 
    setActive(loadArtistsBtn); 
    showTop('artists'); 
});

groupTracksBtn.addEventListener('click', () => showGrouped('tracks'));
groupArtistsBtn.addEventListener('click', () => showGrouped('artists'));

async function fetchByRange(type, range) {
    const [page1, page2] = await Promise.all([
        fetchPage(type, range, 0),
        fetchPage(type, range, 50)
    ]);
    return { items: [...page1.items, ...page2.items].slice(0, 100) };
}

async function showGrouped(type) {
    results.innerHTML = '';
    results.classList.add('loading');
    smoothScrollToTop();
    
    const ranges = [
        { key: 'short_term', label: 'Last 4 weeks' },
        { key: 'medium_term', label: 'Last 6 months' },
        { key: 'long_term', label: 'All time' }
    ];
    
    try {
        for (const r of ranges) {
            const section = document.createElement('div');
            section.className = 'group-section';
            section.innerHTML = `<h2>${type === 'tracks' ? 'Top Tracks' : 'Top Artists'} — ${r.label}</h2><div class="list"></div>`;
            const list = section.querySelector('.list');
            results.appendChild(section);
            
            const data = await fetchByRange(type, r.key);
            
            data.items.forEach((item, idx) => {
                const rank = idx + 1; // Start from 1
                const card = createCardElement(item, rank, type === 'tracks');
                list.appendChild(card);
            });
        }
        
        results.classList.remove('loading');
        
        // Smooth scroll to first section
        setTimeout(() => {
            const firstSection = results.querySelector('.group-section');
            if (firstSection) {
                firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    } catch (e) {
        results.classList.remove('loading');
        results.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7);">Error fetching data. Please try again.</div>';
    }
}

window.addEventListener('load', async () => {
    const auth = parseAuthCode();
    
    if (auth.error) {
        results.innerHTML = '<div style="text-align: center; padding: 40px; color: #ff4444;">Spotify authorization error: ' + auth.error + '</div>';
        return;
    }
    
    if (auth.code) {
        const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
        if (!codeVerifier) {
            results.innerHTML = '<div style="text-align: center; padding: 40px; color: #ff4444;">Error: Missing code verifier. Please try logging in again.</div>';
            return;
        }
        
        try {
            results.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7);">Authenticating...</div>';
            const tokenData = await exchangeCodeForToken(auth.code, codeVerifier);
            token = tokenData.access_token;
            sessionStorage.removeItem('spotify_code_verifier');
            
            // Clean the URL
            window.history.replaceState({}, document.title, redirectUri);
            
            controls.style.display = 'block';
            loginBtn.style.display = 'none';
            results.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7); font-size: 1.1rem;">Choose a view: Top Tracks or Top Artists</div>';
            smoothScrollToTop();
        } catch (error) {
            let errorMsg = 'Authentication failed: ' + error.message;
            if (error.error_description) {
                errorMsg += '<br>' + error.error_description;
            }
            results.innerHTML = '<div style="text-align: center; padding: 40px; color: #ff4444;">' + errorMsg + '</div>';
        }
    }
});

// Cleanup audio on page unload
window.addEventListener('beforeunload', () => {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
});
