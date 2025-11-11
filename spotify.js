const redirectUri = 'https://yousif-pi.vercel.app/spotify.html';

const loginBtn = document.getElementById('login-btn');
const controls = document.getElementById('controls');
const results = document.getElementById('results');
const rangeSelect = document.getElementById('range-select');
const loadTracksBtn = document.getElementById('load-tracks');
const loadArtistsBtn = document.getElementById('load-artists');
const groupTracksBtn = document.getElementById('group-tracks');
const groupArtistsBtn = document.getElementById('group-artists');
const scaleToggleBtn = document.getElementById('scale-toggle');
const CLIENT_ID = 'd35862ff5a9d403db6fa8a321327b7f4';
let token = null;

function scrollToTop() {
    // Try multiple ways to ensure top of the page with sticky header
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (results) {
        results.scrollIntoView({ block: 'start' });
    }
}

// Stronger scroll reset using multiple animation frames
function forceTop() {
    const doTop = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    };
    doTop();
    requestAnimationFrame(doTop);
    setTimeout(doTop, 0);
    setTimeout(doTop, 50);
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
    // Fetch up to 100 by combining two pages of 50
    const [page1, page2] = await Promise.all([
        fetchPage(type, range, 0),
        fetchPage(type, range, 50)
    ]);
    return { items: [...page1.items, ...page2.items].slice(0, 100) };
}

function displayTracks(data) {
    results.innerHTML = '<h2>Top 100 Tracks</h2>';
    data.items.forEach((track, idx) => {
        const div = document.createElement('div');
        div.className = 'track';
        const img = track.album.images[2]?.url || track.album.images[0]?.url || '';
        const link = track.external_urls?.spotify || '#';
        const preview = track.preview_url;
        div.innerHTML = `<span>${idx + 1}.</span>` +
            `<a href="${link}" target="_blank" rel="noopener noreferrer">` +
            `<img src="${img}" alt="album">` +
            `</a>` +
            `<div class="meta"><div>${track.name}</div>` +
            `<div style="font-size:0.9rem; color:#b3b3b3;">${track.artists.map(a => a.name).join(', ')}</div></div>` +
            `${preview ? `<button class="preview-btn" data-url="${preview}">Preview</button>` : ''}`;
        results.appendChild(div);
    });

    // simple preview playback (single audio element)
    const audio = new Audio();
    results.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-url');
            if (!url) return;
            if (audio.src !== url) {
                audio.src = url;
            }
            if (audio.paused) {
                audio.play();
                btn.textContent = 'Pause';
            } else {
                audio.pause();
                btn.textContent = 'Preview';
            }
        });
    });
}

function displayArtists(data) {
    results.innerHTML = '<h2>Top 100 Artists</h2>';
    data.items.forEach((artist, idx) => {
        const div = document.createElement('div');
        div.className = 'artist';
        const img = artist.images[2]?.url || artist.images[0]?.url || '';
        div.innerHTML = `<span>${idx + 1}.</span>` +
            `<img src="${img}" alt="artist">` +
            `<div>${artist.name}</div>`;
        results.appendChild(div);
    });
}

loginBtn.addEventListener('click', login);

async function showTop(type) {
    results.innerHTML = 'Loading...';
    forceTop();
    try {
        const data = await fetchData(type);
        // reset container before render to avoid leftover elements
        results.innerHTML = '';
        if (type === 'tracks') {
            displayTracks(data);
        } else {
            displayArtists(data);
        }
        // ensure view starts at the top and item #1 is visible (also handle Safari timing)
        const snapTop = () => {
            const firstItem = results.querySelector('.track, .artist');
            if (firstItem) firstItem.scrollIntoView({ block: 'start' });
            forceTop();
        };
        snapTop();
        setTimeout(snapTop, 0);
        setTimeout(snapTop, 60);
    } catch (e) {
        results.innerHTML = 'Error fetching data.';
    }
}

function setActive(btn) {
    [loadTracksBtn, loadArtistsBtn].forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

loadTracksBtn.addEventListener('click', () => { setActive(loadTracksBtn); forceTop(); showTop('tracks'); });
loadArtistsBtn.addEventListener('click', () => { setActive(loadArtistsBtn); forceTop(); showTop('artists'); });
groupTracksBtn.addEventListener('click', () => showGrouped('tracks'));
groupArtistsBtn.addEventListener('click', () => showGrouped('artists'));
if (scaleToggleBtn) {
    scaleToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('compact');
        scaleToggleBtn.textContent = document.body.classList.contains('compact') ? 'Compact' : 'Comfortable';
    });
}

async function fetchByRange(type, range) {
    const [page1, page2] = await Promise.all([
        fetchPage(type, range, 0),
        fetchPage(type, range, 50)
    ]);
    return { items: [...page1.items, ...page2.items].slice(0, 100) };
}

async function showGrouped(type) {
    results.innerHTML = '';
    forceTop();
    const ranges = [
        { key: 'short_term', label: 'Last 4 weeks' },
        { key: 'medium_term', label: 'Last 6 months' },
        { key: 'long_term', label: 'All time' }
    ];
    for (const r of ranges) {
        const section = document.createElement('div');
        section.innerHTML = `<h2>${type === 'tracks' ? 'Top Tracks' : 'Top Artists'} — ${r.label}</h2>`;
        const list = document.createElement('div');
        list.className = 'list';
        section.appendChild(list);
        results.appendChild(section);
        const data = await fetchByRange(type, r.key);
        if (type === 'tracks') {
            data.items.forEach((track, idx) => {
                const item = document.createElement('div');
                item.className = 'track';
                const img = track.album.images[2]?.url || track.album.images[0]?.url || '';
                const link = track.external_urls?.spotify || '#';
                const preview = track.preview_url;
                item.innerHTML = `<span>${idx + 1}.</span>` +
                    `<a href="${link}" target="_blank" rel="noopener noreferrer">` +
                    `<img src="${img}" alt="album">` +
                    `</a>` +
                    `<div class="meta"><div>${track.name}</div>` +
                    `<div style=\"font-size:0.9rem; color:#b3b3b3;\">${track.artists.map(a => a.name).join(', ')}</div></div>` +
                    `${preview ? `<button class=\"preview-btn\" data-url=\"${preview}\">Preview</button>` : ''}`;
                list.appendChild(item);
            });
        } else {
            data.items.forEach((artist, idx) => {
                const item = document.createElement('div');
                item.className = 'artist';
                const img = artist.images[2]?.url || artist.images[0]?.url || '';
                item.innerHTML = `<span>${idx + 1}.</span>` +
                    `<img src="${img}" alt="artist">` +
                    `<div>${artist.name}</div>`;
                list.appendChild(item);
            });
        }
    }
    // scroll to very top so first section starts at item #1
    const first = results.querySelector('.track, .artist');
    if (first) first.scrollIntoView({ block: 'start' });
    forceTop();
    setTimeout(forceTop, 0);
    setTimeout(forceTop, 60);
}

window.addEventListener('load', async () => {
    const auth = parseAuthCode();
    
    if (auth.error) {
        results.innerHTML = 'Spotify authorization error: ' + auth.error;
        return;
    }
    
    if (auth.code) {
        const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
        if (!codeVerifier) {
            results.innerHTML = 'Error: Missing code verifier. Please try logging in again.';
            return;
        }
        
        try {
            results.innerHTML = 'Authenticating...';
            const tokenData = await exchangeCodeForToken(auth.code, codeVerifier);
            token = tokenData.access_token;
            sessionStorage.removeItem('spotify_code_verifier');
            
            // Clean the URL
            window.history.replaceState({}, document.title, redirectUri);
            
            controls.style.display = 'block';
            loginBtn.style.display = 'none';
            // do not auto-load; let user choose time range first
            results.innerHTML = 'Choose a view: Top Tracks or Top Artists';
            forceTop();
        } catch (error) {
            let errorMsg = 'Authentication failed: ' + error.message;
            if (error.error_description) {
                errorMsg += '<br>' + error.error_description;
            }
            results.innerHTML = errorMsg;
        }
    }
});
