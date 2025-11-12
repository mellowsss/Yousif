const redirectUri = 'https://yousif-pi.vercel.app/spotify.html';

const loginBtn = document.getElementById('login-btn');
const controls = document.getElementById('controls');
const rangeSelect = document.getElementById('range-select');
const CLIENT_ID = 'd35862ff5a9d403db6fa8a321327b7f4';
let token = null;
let currentAudio = null;
let currentTab = 'tracks';
let isRendering = false;

// Tab elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const tracksList = document.getElementById('tracks-list');
const artistsList = document.getElementById('artists-list');
const groupedTracksContent = document.getElementById('grouped-tracks-content');
const groupedArtistsContent = document.getElementById('grouped-artists-content');

// Performance: Batch DOM updates
function batchDOMUpdates(updates, batchSize = 10) {
    return new Promise((resolve) => {
        let index = 0;
        
        function processBatch() {
            const end = Math.min(index + batchSize, updates.length);
            
            for (let i = index; i < end; i++) {
                updates[i]();
            }
            
            index = end;
            
            if (index < updates.length) {
                setTimeout(processBatch, 0);
            } else {
                resolve();
            }
        }
        
        processBatch();
    });
}

// Performance: Use requestIdleCallback with fallback
function idleCallback(callback) {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 1000 });
    } else {
        setTimeout(callback, 0);
    }
}

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

// Header scroll effect - optimized
let scrollTimeout;
const header = document.querySelector('.spotify-header');
const gradientBg = document.querySelector('.gradient-bg');

window.addEventListener('scroll', () => {
    if (scrollTimeout) return;
    
    scrollTimeout = requestAnimationFrame(() => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        if (gradientBg) {
            gradientBg.style.transform = `translateY(${currentScroll * 0.5}px)`;
        }
        
        scrollTimeout = null;
    });
}, { passive: true });

// Smooth scroll to top
function smoothScrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    // Ensure we get exactly 100 items starting from index 0
    const allItems = [...page1.items, ...page2.items];
    return { items: allItems.slice(0, 100) };
}

// Create card element - optimized
function createCardElement(item, rank, isTrack = true) {
    const div = document.createElement('div');
    div.className = isTrack ? 'track-card' : 'artist-card';
    
    if (isTrack) {
        const img = item.album?.images?.[2]?.url || item.album?.images?.[0]?.url || '';
        const link = item.external_urls?.spotify || '#';
        const preview = item.preview_url;
        
        div.innerHTML = `
            <div class="card-rank">${rank}</div>
            <a href="${link}" target="_blank" rel="noopener noreferrer" class="card-image-link">
                <img src="${img}" alt="${item.name}" loading="lazy" class="card-image">
            </a>
            <div class="card-info">
                <div class="card-title">${item.name || 'Unknown'}</div>
                <div class="card-subtitle">${item.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}</div>
            </div>
            ${preview ? `<button class="preview-btn" data-url="${preview}" data-action="preview" aria-label="Preview ${item.name}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </button>` : ''}
        `;
    } else {
        const img = item.images?.[2]?.url || item.images?.[0]?.url || '';
        div.innerHTML = `
            <div class="card-rank">${rank}</div>
            <img src="${img}" alt="${item.name}" loading="lazy" class="card-image">
            <div class="card-info">
                <div class="card-title">${item.name || 'Unknown'}</div>
            </div>
        `;
    }
    
    // Add scroll animation
    div.style.opacity = '0';
    div.style.transform = 'translateY(30px) scale(0.95)';
    observer.observe(div);
    
    return div;
}

// Event delegation for preview buttons
document.addEventListener('click', (e) => {
    if (e.target.closest('.preview-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const btn = e.target.closest('.preview-btn');
        const url = btn.dataset.url;
        if (url) {
            handlePreview(url, btn);
        }
    }
});

function handlePreview(url, btn) {
    if (currentAudio && currentAudio.src === url) {
        if (currentAudio.paused) {
            currentAudio.play();
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
                </svg>
            `;
        } else {
            currentAudio.pause();
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
        }
    } else {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            // Update all preview buttons
            idleCallback(() => {
                document.querySelectorAll('.preview-btn').forEach(b => {
                    b.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    `;
                });
            });
        }
        
        currentAudio = new Audio(url);
        currentAudio.play();
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
            </svg>
        `;
        
        currentAudio.addEventListener('ended', () => {
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
        });
    }
}

// Tab switching - optimized
function switchTab(tabName) {
    if (isRendering) return;
    
    currentTab = tabName;
    
    // Update tab buttons
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab contents
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    // Load data if needed
    idleCallback(() => {
        if (tabName === 'tracks' && tracksList.children.length === 0) {
            loadTracks();
        } else if (tabName === 'artists' && artistsList.children.length === 0) {
            loadArtists();
        } else if (tabName === 'grouped-tracks' && groupedTracksContent.children.length === 0) {
            loadGroupedTracks();
        } else if (tabName === 'grouped-artists' && groupedArtistsContent.children.length === 0) {
            loadGroupedArtists();
        }
    });
}

// Optimized load functions with batch rendering
async function loadTracks() {
    if (isRendering) return;
    isRendering = true;
    
    tracksList.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const data = await fetchData('tracks');
        tracksList.innerHTML = '';
        
        // Batch render cards
        const updates = data.items.map((track, idx) => {
            const rank = idx + 1; // Start from 1
            return () => {
                const card = createCardElement(track, rank, true);
                tracksList.appendChild(card);
            };
        });
        
        await batchDOMUpdates(updates, 15);
        smoothScrollToTop();
    } catch (e) {
        tracksList.innerHTML = '<div class="error-message">Error loading tracks. Please try again.</div>';
    } finally {
        isRendering = false;
    }
}

async function loadArtists() {
    if (isRendering) return;
    isRendering = true;
    
    artistsList.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const data = await fetchData('artists');
        artistsList.innerHTML = '';
        
        const updates = data.items.map((artist, idx) => {
            const rank = idx + 1; // Start from 1
            return () => {
                const card = createCardElement(artist, rank, false);
                artistsList.appendChild(card);
            };
        });
        
        await batchDOMUpdates(updates, 15);
        smoothScrollToTop();
    } catch (e) {
        artistsList.innerHTML = '<div class="error-message">Error loading artists. Please try again.</div>';
    } finally {
        isRendering = false;
    }
}

async function fetchByRange(type, range) {
    const [page1, page2] = await Promise.all([
        fetchPage(type, range, 0),
        fetchPage(type, range, 50)
    ]);
    const allItems = [...page1.items, ...page2.items];
    return { items: allItems.slice(0, 100) };
}

async function loadGroupedTracks() {
    if (isRendering) return;
    isRendering = true;
    
    groupedTracksContent.innerHTML = '<div class="loading-spinner"></div>';
    
    const ranges = [
        { key: 'short_term', label: 'Last 4 weeks' },
        { key: 'medium_term', label: 'Last 6 months' },
        { key: 'long_term', label: 'All time' }
    ];
    
    try {
        groupedTracksContent.innerHTML = '';
        
        for (const r of ranges) {
            const section = document.createElement('div');
            section.className = 'group-section';
            section.innerHTML = `
                <h3 class="group-title">${r.label}</h3>
                <div class="list"></div>
            `;
            const list = section.querySelector('.list');
            groupedTracksContent.appendChild(section);
            
            const data = await fetchByRange('tracks', r.key);
            
            const updates = data.items.map((item, idx) => {
                const rank = idx + 1; // Start from 1
                return () => {
                    const card = createCardElement(item, rank, true);
                    list.appendChild(card);
                };
            });
            
            await batchDOMUpdates(updates, 15);
        }
        
        smoothScrollToTop();
    } catch (e) {
        groupedTracksContent.innerHTML = '<div class="error-message">Error loading grouped tracks. Please try again.</div>';
    } finally {
        isRendering = false;
    }
}

async function loadGroupedArtists() {
    if (isRendering) return;
    isRendering = true;
    
    groupedArtistsContent.innerHTML = '<div class="loading-spinner"></div>';
    
    const ranges = [
        { key: 'short_term', label: 'Last 4 weeks' },
        { key: 'medium_term', label: 'Last 6 months' },
        { key: 'long_term', label: 'All time' }
    ];
    
    try {
        groupedArtistsContent.innerHTML = '';
        
        for (const r of ranges) {
            const section = document.createElement('div');
            section.className = 'group-section';
            section.innerHTML = `
                <h3 class="group-title">${r.label}</h3>
                <div class="list"></div>
            `;
            const list = section.querySelector('.list');
            groupedArtistsContent.appendChild(section);
            
            const data = await fetchByRange('artists', r.key);
            
            const updates = data.items.map((item, idx) => {
                const rank = idx + 1; // Start from 1
                return () => {
                    const card = createCardElement(item, rank, false);
                    list.appendChild(card);
                };
            });
            
            await batchDOMUpdates(updates, 15);
        }
        
        smoothScrollToTop();
    } catch (e) {
        groupedArtistsContent.innerHTML = '<div class="error-message">Error loading grouped artists. Please try again.</div>';
    } finally {
        isRendering = false;
    }
}

// Event listeners - optimized
loginBtn.addEventListener('click', login);

// Tab switching with event delegation
tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isRendering) return;
        const tabName = btn.dataset.tab;
        switchTab(tabName);
    }, { passive: true });
});

// Time range change - reload current tab
let rangeChangeTimeout;
rangeSelect.addEventListener('change', () => {
    if (isRendering) return;
    
    clearTimeout(rangeChangeTimeout);
    rangeChangeTimeout = setTimeout(() => {
        if (currentTab === 'tracks') {
            tracksList.innerHTML = '';
            loadTracks();
        } else if (currentTab === 'artists') {
            artistsList.innerHTML = '';
            loadArtists();
        } else if (currentTab === 'grouped-tracks') {
            groupedTracksContent.innerHTML = '';
            loadGroupedTracks();
        } else if (currentTab === 'grouped-artists') {
            groupedArtistsContent.innerHTML = '';
            loadGroupedArtists();
        }
    }, 100);
}, { passive: true });

window.addEventListener('load', async () => {
    const auth = parseAuthCode();
    
    if (auth.error) {
        document.querySelector('.results-section').innerHTML = '<div class="error-message">Spotify authorization error: ' + auth.error + '</div>';
        return;
    }
    
    if (auth.code) {
        const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
        if (!codeVerifier) {
            document.querySelector('.results-section').innerHTML = '<div class="error-message">Error: Missing code verifier. Please try logging in again.</div>';
            return;
        }
        
        try {
            const tokenData = await exchangeCodeForToken(auth.code, codeVerifier);
            token = tokenData.access_token;
            sessionStorage.removeItem('spotify_code_verifier');
            
            window.history.replaceState({}, document.title, redirectUri);
            
            controls.style.display = 'block';
            loginBtn.style.display = 'none';
            
            // Load initial tab
            idleCallback(() => {
                switchTab('tracks');
            });
        } catch (error) {
            let errorMsg = 'Authentication failed: ' + error.message;
            if (error.error_description) {
                errorMsg += '<br>' + error.error_description;
            }
            document.querySelector('.results-section').innerHTML = '<div class="error-message">' + errorMsg + '</div>';
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
