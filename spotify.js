const redirectUri = window.location.origin + window.location.pathname;

const loginBtn = document.getElementById('login-btn');
const clientIdInput = document.getElementById('client-id');
const controls = document.getElementById('controls');
const results = document.getElementById('results');
const rangeSelect = document.getElementById('range-select');
const loadTracksBtn = document.getElementById('load-tracks');
const loadArtistsBtn = document.getElementById('load-artists');
const CLIENT_ID_PLACEHOLDER = 'YOUR_SPOTIFY_CLIENT_ID';
let token = null;

function parseAuthHash() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return {
        token: params.get('access_token'),
        error: params.get('error')
    };
}

function getClientId() {
    const stored = localStorage.getItem('spotifyClientId');
    const input = clientIdInput.value.trim();
    const id = input || stored;
    if (id && id !== stored) {
        localStorage.setItem('spotifyClientId', id);
    }
    return id;
}

function login() {
    const clientId = getClientId();
    if (!clientId || clientId === CLIENT_ID_PLACEHOLDER) {
        alert('Enter your Spotify Client ID first.');
        return;
    }
    const scopes = 'user-top-read';
    const authUrl =
        `https://accounts.spotify.com/authorize?client_id=${clientId}` +
        `&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}`;
    window.location.href = authUrl;
}

async function fetchData(type) {
    const range = rangeSelect.value;
    const url = `https://api.spotify.com/v1/me/top/${type}?limit=50&time_range=${range}`;
    const response = await fetch(url, {
        headers: { Authorization: 'Bearer ' + token }
    });
    if (!response.ok) throw new Error('API error');
    return response.json();
}

function displayTracks(data) {
    results.innerHTML = '<h2>Top Tracks</h2>';
    data.items.forEach((track, idx) => {
        const div = document.createElement('div');
        div.className = 'track';
        const img = track.album.images[2]?.url || track.album.images[0]?.url || '';
        div.innerHTML = `<span>${idx + 1}.</span>` +
            `<img src="${img}" alt="album">` +
            `<div><div>${track.name}</div>` +
            `<div style="font-size:0.9rem; color:#b3b3b3;">${track.artists.map(a => a.name).join(', ')}</div></div>`;
        results.appendChild(div);
    });
}

function displayArtists(data) {
    results.innerHTML = '<h2>Top Artists</h2>';
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
    try {
        const data = await fetchData(type);
        if (type === 'tracks') {
            displayTracks(data);
        } else {
            displayArtists(data);
        }
    } catch (e) {
        results.innerHTML = 'Error fetching data.';
    }
}

loadTracksBtn.addEventListener('click', () => showTop('tracks'));
loadArtistsBtn.addEventListener('click', () => showTop('artists'));

window.addEventListener('load', () => {
    const storedId = localStorage.getItem('spotifyClientId');
    if (storedId) {
        clientIdInput.value = storedId;
    }
    const auth = parseAuthHash();
    token = auth.token;
    if (auth.error) {
        results.innerHTML =
            'Spotify authorization error: ' + auth.error +
            '. Ensure \"Implicit Grant\" is enabled for your app.';
    }
=======
    token = getTokenFromHash();
    if (token) {
        // Clean the URL so the token is not visible after authentication
        window.location.hash = '';
        controls.style.display = 'block';
        loginBtn.style.display = 'none';
        showTop('tracks');
    }
});
