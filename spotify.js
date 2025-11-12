const redirectUri = 'https://yousif-pi.vercel.app/spotify.html';
const CLIENT_ID = 'd35862ff5a9d403db6fa8a321327b7f4';

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const controls = document.getElementById('controls');
const rangeSelect = document.getElementById('range-select');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const tracksList = document.getElementById('tracks-list');
const artistsList = document.getElementById('artists-list');
const groupedTracksContent = document.getElementById('grouped-tracks-content');
const groupedArtistsContent = document.getElementById('grouped-artists-content');

let token = null;
let currentAudio = null;
let currentTab = 'tracks';

// Simple scroll handler
let ticking = false;
const header = document.querySelector('.spotify-header');
const gradientBg = document.querySelector('.gradient-bg');

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const scrollY = window.pageYOffset;
            if (scrollY > 50) {
                header?.classList.add('scrolled');
            } else {
                header?.classList.remove('scrolled');
            }
            if (gradientBg) {
                gradientBg.style.transform = `translateY(${scrollY * 0.5}px)`;
            }
            ticking = false;
        });
        ticking = true;
    }
}, { passive: true });

// PKCE Functions
function generateCodeVerifier() {
    const array = new Uint32Array(28);
    crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function parseAuthCode() {
    const params = new URLSearchParams(window.location.search);
    return {
        code: params.get('code'),
        error: params.get('error')
    };
}

async function exchangeCodeForToken(code, codeVerifier) {
    const response = await fetch('/api/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, code_verifier: codeVerifier })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Token exchange failed');
    }
    return await response.json();
}

async function login() {
    const scopes = 'user-top-read';
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);
    
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}` +
        `&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;
    
    window.location.href = authUrl;
}

// API Functions
async function fetchTopItems(type, range, limit = 50, offset = 0) {
    const url = `https://api.spotify.com/v1/me/top/${type}?limit=${limit}&offset=${offset}&time_range=${range}`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch data');
    return response.json();
}

async function fetchAllItems(type, range) {
    // Fetch first 50 items
    const firstPage = await fetchTopItems(type, range, 50, 0);
    // Fetch next 50 items
    const secondPage = await fetchTopItems(type, range, 50, 50);
    
    // Combine and return exactly 100 items
    const allItems = [...(firstPage.items || []), ...(secondPage.items || [])];
    return allItems.slice(0, 100);
}

// Card Creation
function createCard(item, rank, isTrack) {
    const card = document.createElement('div');
    card.className = isTrack ? 'track-card' : 'artist-card';
    
    if (isTrack) {
        const img = item.album?.images?.[2]?.url || item.album?.images?.[0]?.url || '';
        const link = item.external_urls?.spotify || '#';
        const preview = item.preview_url;
        const trackName = item.name || 'Unknown Track';
        const artistNames = item.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
        
        card.innerHTML = `
            <div class="card-rank">${rank}</div>
            <a href="${link}" target="_blank" rel="noopener noreferrer" class="card-image-link">
                <img src="${img}" alt="${trackName}" class="card-image" loading="lazy">
            </a>
            <div class="card-info">
                <div class="card-title">${trackName}</div>
                <div class="card-subtitle">${artistNames}</div>
            </div>
            ${preview ? `<button class="preview-btn" data-url="${preview}" aria-label="Preview ${trackName}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </button>` : '<div class="preview-btn-placeholder"></div>'}
        `;
    } else {
        const img = item.images?.[2]?.url || item.images?.[0]?.url || '';
        const artistName = item.name || 'Unknown Artist';
        
        card.innerHTML = `
            <div class="card-rank">${rank}</div>
            <img src="${img}" alt="${artistName}" class="card-image" loading="lazy">
            <div class="card-info">
                <div class="card-title">${artistName}</div>
            </div>
            <div class="preview-btn-placeholder"></div>
        `;
    }
    
    return card;
}

// Preview Handler
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.preview-btn');
    if (!btn || !btn.dataset.url) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const url = btn.dataset.url;
    
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
});

// Tab Management
function switchTab(tabName) {
    currentTab = tabName;
    
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    // Load data if empty
    if (tabName === 'tracks' && tracksList.children.length === 0) {
        loadTracks();
    } else if (tabName === 'artists' && artistsList.children.length === 0) {
        loadArtists();
    } else if (tabName === 'grouped-tracks' && groupedTracksContent.children.length === 0) {
        loadGroupedTracks();
    } else if (tabName === 'grouped-artists' && groupedArtistsContent.children.length === 0) {
        loadGroupedArtists();
    }
}

// Load Functions
async function loadTracks() {
    tracksList.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const range = rangeSelect.value;
        const items = await fetchAllItems('tracks', range);
        
        tracksList.innerHTML = '';
        
        items.forEach((track, index) => {
            const rank = index + 1; // Start from 1
            const card = createCard(track, rank, true);
            tracksList.appendChild(card);
        });
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        tracksList.innerHTML = '<div class="error-message">Error loading tracks. Please try again.</div>';
    }
}

async function loadArtists() {
    artistsList.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const range = rangeSelect.value;
        const items = await fetchAllItems('artists', range);
        
        artistsList.innerHTML = '';
        
        items.forEach((artist, index) => {
            const rank = index + 1; // Start from 1
            const card = createCard(artist, rank, false);
            artistsList.appendChild(card);
        });
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        artistsList.innerHTML = '<div class="error-message">Error loading artists. Please try again.</div>';
    }
}

async function loadGroupedTracks() {
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
            section.innerHTML = `<h3 class="group-title">${r.label}</h3><div class="list"></div>`;
            const list = section.querySelector('.list');
            groupedTracksContent.appendChild(section);
            
            const items = await fetchAllItems('tracks', r.key);
            
            items.forEach((track, index) => {
                const rank = index + 1; // Start from 1
                const card = createCard(track, rank, true);
                list.appendChild(card);
            });
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        groupedTracksContent.innerHTML = '<div class="error-message">Error loading grouped tracks. Please try again.</div>';
    }
}

async function loadGroupedArtists() {
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
            section.innerHTML = `<h3 class="group-title">${r.label}</h3><div class="list"></div>`;
            const list = section.querySelector('.list');
            groupedArtistsContent.appendChild(section);
            
            const items = await fetchAllItems('artists', r.key);
            
            items.forEach((artist, index) => {
                const rank = index + 1; // Start from 1
                const card = createCard(artist, rank, false);
                list.appendChild(card);
            });
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        groupedArtistsContent.innerHTML = '<div class="error-message">Error loading grouped artists. Please try again.</div>';
    }
}

// Event Listeners
loginBtn.addEventListener('click', login);

tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(btn.dataset.tab);
    });
});

rangeSelect.addEventListener('change', () => {
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
});

// Initialize
window.addEventListener('load', async () => {
    const auth = parseAuthCode();
    
    if (auth.error) {
        document.querySelector('.results-section').innerHTML = 
            `<div class="error-message">Spotify authorization error: ${auth.error}</div>`;
        return;
    }
    
    if (auth.code) {
        const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
        if (!codeVerifier) {
            document.querySelector('.results-section').innerHTML = 
                '<div class="error-message">Error: Missing code verifier. Please try logging in again.</div>';
            return;
        }
        
        try {
            const tokenData = await exchangeCodeForToken(auth.code, codeVerifier);
            token = tokenData.access_token;
            sessionStorage.removeItem('spotify_code_verifier');
            window.history.replaceState({}, document.title, redirectUri);
            
            controls.style.display = 'block';
            loginBtn.style.display = 'none';
            
            switchTab('tracks');
        } catch (error) {
            document.querySelector('.results-section').innerHTML = 
                `<div class="error-message">Authentication failed: ${error.message}</div>`;
        }
    }
});

window.addEventListener('beforeunload', () => {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
});
