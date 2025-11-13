// ============================================================================
// Configuration
// ============================================================================
const CONFIG = {
    redirectUri: 'https://yousif-pi.vercel.app/spotify.html',
    clientId: 'd35862ff5a9d403db6fa8a321327b7f4',
    apiBase: 'https://api.spotify.com/v1',
    itemsPerPage: 50,
    maxItems: 100
};

// ============================================================================
// State Management
// ============================================================================
const state = {
    token: null,
    currentAudio: null,
    currentTab: 'tracks',
    isLoading: false
};

// ============================================================================
// DOM References
// ============================================================================
const elements = {
    loginSection: document.getElementById('login-section'),
    dashboard: document.getElementById('dashboard'),
    loginBtn: document.getElementById('login-btn'),
    rangeSelect: document.getElementById('range-select'),
    tabButtons: document.querySelectorAll('.tab-button'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    tracksList: document.getElementById('tracks-list'),
    artistsList: document.getElementById('artists-list'),
    groupedTracksContent: document.getElementById('grouped-tracks-content'),
    groupedArtistsContent: document.getElementById('grouped-artists-content'),
    header: document.querySelector('.header')
};

// ============================================================================
// Utility Functions
// ============================================================================
const utils = {
    generateCodeVerifier() {
        const array = new Uint32Array(28);
    crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
    },

    async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    },

    parseAuthCode() {
    const params = new URLSearchParams(window.location.search);
    return {
        code: params.get('code'),
        error: params.get('error')
    };
    },

    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// ============================================================================
// API Functions
// ============================================================================
const api = {
    async exchangeToken(code, codeVerifier) {
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
    },

    async fetchTopItems(type, range, limit = CONFIG.itemsPerPage, offset = 0) {
        const url = `${CONFIG.apiBase}/me/top/${type}?limit=${limit}&offset=${offset}&time_range=${range}`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${state.token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
    },

    async fetchAllItems(type, range) {
        const [page1, page2] = await Promise.all([
            this.fetchTopItems(type, range, CONFIG.itemsPerPage, 0),
            this.fetchTopItems(type, range, CONFIG.itemsPerPage, CONFIG.itemsPerPage)
        ]);
        
        const allItems = [...(page1.items || []), ...(page2.items || [])];
        return allItems.slice(0, CONFIG.maxItems);
    }
};

// ============================================================================
// Authentication
// ============================================================================
const auth = {
    async login() {
        const codeVerifier = utils.generateCodeVerifier();
        const codeChallenge = await utils.generateCodeChallenge(codeVerifier);
    
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);
    
        const params = new URLSearchParams({
            client_id: CONFIG.clientId,
            response_type: 'code',
            redirect_uri: CONFIG.redirectUri,
            scope: 'user-top-read',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        });
        
        window.location.href = `https://accounts.spotify.com/authorize?${params}`;
    },

    async handleCallback() {
        const { code, error } = utils.parseAuthCode();
        
        if (error) {
            this.showError(`Authorization error: ${error}`);
            return;
        }
        
        if (!code) return;
        
        const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
        if (!codeVerifier) {
            this.showError('Missing code verifier. Please try again.');
            return;
        }
        
        try {
            const tokenData = await api.exchangeToken(code, codeVerifier);
            state.token = tokenData.access_token;
            sessionStorage.removeItem('spotify_code_verifier');
            window.history.replaceState({}, document.title, CONFIG.redirectUri);
            
            this.showDashboard();
            tabs.switch('tracks');
        } catch (error) {
            this.showError(`Authentication failed: ${error.message}`);
        }
    },

    showDashboard() {
        elements.loginSection.style.display = 'none';
        elements.dashboard.style.display = 'block';
    },

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        elements.dashboard.innerHTML = '';
        elements.dashboard.appendChild(errorDiv);
        elements.dashboard.style.display = 'block';
    }
};

// ============================================================================
// UI Components
// ============================================================================
const ui = {
    createItemCard(item, rank, isTrack) {
        const card = document.createElement('div');
        card.className = `item-card ${isTrack ? 'item-card--track' : 'item-card--artist'}`;
        
        if (isTrack) {
            const img = item.album?.images?.[2]?.url || item.album?.images?.[0]?.url || '';
            const link = item.external_urls?.spotify || '#';
            const preview = item.preview_url;
            const trackName = item.name || 'Unknown Track';
            const artistNames = item.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
            
            card.innerHTML = `
                <div class="item-rank">${rank}</div>
                <a href="${link}" target="_blank" rel="noopener noreferrer" class="item-image-link">
                    <img src="${img}" alt="${trackName}" class="item-image" loading="lazy">
                </a>
                <div class="item-info">
                    <div class="item-name">${trackName}</div>
                    <div class="item-artist">${artistNames}</div>
                </div>
                ${preview ? `
                    <button class="item-preview" data-url="${preview}" aria-label="Preview ${trackName}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                ` : '<div class="item-preview-placeholder"></div>'}
            `;
        } else {
            const img = item.images?.[2]?.url || item.images?.[0]?.url || '';
            const artistName = item.name || 'Unknown Artist';
            
            card.innerHTML = `
                <div class="item-rank">${rank}</div>
                <img src="${img}" alt="${artistName}" class="item-image" loading="lazy">
                <div class="item-info">
                    <div class="item-name">${artistName}</div>
                </div>
                <div class="item-preview-placeholder"></div>
            `;
        }
        
        return card;
    },

    showLoading(container) {
        container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    },

    showError(container, message) {
        container.innerHTML = `<div class="error">${message}</div>`;
    }
};

// ============================================================================
// Audio Player
// ============================================================================
const audioPlayer = {
    handlePreview(url, button) {
        if (state.currentAudio && state.currentAudio.src === url) {
            if (state.currentAudio.paused) {
                state.currentAudio.play();
                button.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
                    </svg>
                `;
            } else {
                state.currentAudio.pause();
                button.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                `;
            }
        } else {
            if (state.currentAudio) {
                state.currentAudio.pause();
                state.currentAudio.currentTime = 0;
                document.querySelectorAll('.item-preview').forEach(btn => {
                    btn.innerHTML = `
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    `;
                });
            }
            
            state.currentAudio = new Audio(url);
            state.currentAudio.play();
            button.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
                </svg>
            `;
            
            state.currentAudio.addEventListener('ended', () => {
                button.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                `;
            });
        }
    }
};

// ============================================================================
// Tab Management
// ============================================================================
const tabs = {
    switch(tabName) {
        if (state.isLoading) return;
        
        state.currentTab = tabName;
        
        elements.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        elements.tabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `tab-${tabName}`);
        });
        
        this.loadTabData(tabName);
    },

    async loadTabData(tabName) {
        const range = elements.rangeSelect.value;
        
        if (tabName === 'tracks') {
            if (elements.tracksList.children.length === 0) {
                await dataLoader.loadTracks(range);
            }
        } else if (tabName === 'artists') {
            if (elements.artistsList.children.length === 0) {
                await dataLoader.loadArtists(range);
            }
        } else if (tabName === 'grouped-tracks') {
            if (elements.groupedTracksContent.children.length === 0) {
                await dataLoader.loadGroupedTracks();
            }
        } else if (tabName === 'grouped-artists') {
            if (elements.groupedArtistsContent.children.length === 0) {
                await dataLoader.loadGroupedArtists();
            }
        }
    }
};

// ============================================================================
// Data Loading
// ============================================================================
const dataLoader = {
    async loadTracks(range) {
        if (state.isLoading) return;
        state.isLoading = true;
        
        ui.showLoading(elements.tracksList);
        
        try {
            const items = await api.fetchAllItems('tracks', range);
            elements.tracksList.innerHTML = '';
            
            items.forEach((track, index) => {
                const card = ui.createItemCard(track, index + 1, true);
                elements.tracksList.appendChild(card);
            });
            
            utils.scrollToTop();
        } catch (error) {
            ui.showError(elements.tracksList, 'Failed to load tracks. Please try again.');
        } finally {
            state.isLoading = false;
        }
    },

    async loadArtists(range) {
        if (state.isLoading) return;
        state.isLoading = true;
        
        ui.showLoading(elements.artistsList);
        
        try {
            const items = await api.fetchAllItems('artists', range);
            elements.artistsList.innerHTML = '';
            
            items.forEach((artist, index) => {
                const card = ui.createItemCard(artist, index + 1, false);
                elements.artistsList.appendChild(card);
            });
            
            utils.scrollToTop();
        } catch (error) {
            ui.showError(elements.artistsList, 'Failed to load artists. Please try again.');
        } finally {
            state.isLoading = false;
        }
    },

    async loadGroupedTracks() {
        if (state.isLoading) return;
        state.isLoading = true;
        
        ui.showLoading(elements.groupedTracksContent);
        
    const ranges = [
        { key: 'short_term', label: 'Last 4 weeks' },
        { key: 'medium_term', label: 'Last 6 months' },
        { key: 'long_term', label: 'All time' }
    ];
        
        try {
            elements.groupedTracksContent.innerHTML = '';
            
    for (const r of ranges) {
        const section = document.createElement('div');
                section.className = 'group-section';
                section.innerHTML = `
                    <h3 class="group-title">${r.label}</h3>
                    <div class="items-list"></div>
                `;
                const list = section.querySelector('.items-list');
                elements.groupedTracksContent.appendChild(section);
                
                const items = await api.fetchAllItems('tracks', r.key);
                items.forEach((track, index) => {
                    const card = ui.createItemCard(track, index + 1, true);
                    list.appendChild(card);
                });
            }
            
            utils.scrollToTop();
        } catch (error) {
            ui.showError(elements.groupedTracksContent, 'Failed to load grouped tracks.');
        } finally {
            state.isLoading = false;
        }
    },

    async loadGroupedArtists() {
        if (state.isLoading) return;
        state.isLoading = true;
        
        ui.showLoading(elements.groupedArtistsContent);
        
        const ranges = [
            { key: 'short_term', label: 'Last 4 weeks' },
            { key: 'medium_term', label: 'Last 6 months' },
            { key: 'long_term', label: 'All time' }
        ];
        
        try {
            elements.groupedArtistsContent.innerHTML = '';
            
            for (const r of ranges) {
                const section = document.createElement('div');
                section.className = 'group-section';
                section.innerHTML = `
                    <h3 class="group-title">${r.label}</h3>
                    <div class="items-list"></div>
                `;
                const list = section.querySelector('.items-list');
                elements.groupedArtistsContent.appendChild(section);
                
                const items = await api.fetchAllItems('artists', r.key);
                items.forEach((artist, index) => {
                    const card = ui.createItemCard(artist, index + 1, false);
                    list.appendChild(card);
                });
            }
            
            utils.scrollToTop();
        } catch (error) {
            ui.showError(elements.groupedArtistsContent, 'Failed to load grouped artists.');
        } finally {
            state.isLoading = false;
        }
    }
};

// ============================================================================
// Event Listeners
// ============================================================================
elements.loginBtn.addEventListener('click', () => auth.login());

elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabs.switch(btn.dataset.tab);
    });
});

elements.rangeSelect.addEventListener('change', () => {
    if (state.currentTab === 'tracks') {
        elements.tracksList.innerHTML = '';
        dataLoader.loadTracks(elements.rangeSelect.value);
    } else if (state.currentTab === 'artists') {
        elements.artistsList.innerHTML = '';
        dataLoader.loadArtists(elements.rangeSelect.value);
    } else if (state.currentTab === 'grouped-tracks') {
        elements.groupedTracksContent.innerHTML = '';
        dataLoader.loadGroupedTracks();
    } else if (state.currentTab === 'grouped-artists') {
        elements.groupedArtistsContent.innerHTML = '';
        dataLoader.loadGroupedArtists();
    }
});

document.addEventListener('click', (e) => {
    const previewBtn = e.target.closest('.item-preview');
    if (previewBtn && previewBtn.dataset.url) {
        e.preventDefault();
        audioPlayer.handlePreview(previewBtn.dataset.url, previewBtn);
    }
});

// Scroll handler
let scrollTicking = false;
window.addEventListener('scroll', () => {
    if (!scrollTicking) {
        window.requestAnimationFrame(() => {
            const scrollY = window.pageYOffset;
            if (scrollY > 50) {
                elements.header?.classList.add('scrolled');
            } else {
                elements.header?.classList.remove('scrolled');
            }
            scrollTicking = false;
        });
        scrollTicking = true;
    }
}, { passive: true });

// ============================================================================
// Initialization
// ============================================================================
window.addEventListener('load', () => {
    auth.handleCallback();
});

window.addEventListener('beforeunload', () => {
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio = null;
    }
});
