const selectors = {
  connectBtn: document.getElementById('connectSpotify'),
  logoutBtn: document.getElementById('logoutSpotify'),
  refreshBtn: document.getElementById('refreshSpotify'),
  status: document.getElementById('statusMessage'),
  profileSection: document.getElementById('profileSection'),
  profileDetails: document.getElementById('profileDetails'),
  topArtistsSection: document.getElementById('topArtistsSection'),
  topArtistsList: document.getElementById('topArtistsList'),
  topTracksSection: document.getElementById('topTracksSection'),
  topTracksList: document.getElementById('topTracksList'),
  recommendedSection: document.getElementById('recommendedSection'),
  recommendedGrid: document.getElementById('recommendedGrid')
};

const state = {
  loading: false,
  connected: false
};

document.addEventListener('DOMContentLoaded', () => {
  wireEvents();
  hydrateFromHash();
  loadSpotifyData();
});

function wireEvents() {
  if (selectors.connectBtn) {
    selectors.connectBtn.addEventListener('click', () => setStatus('Redirecting to Spotify…'));
  }

  if (selectors.logoutBtn) {
    selectors.logoutBtn.addEventListener('click', async () => {
      toggleLoading(true, 'Disconnecting…');
      try {
        await fetch('/auth/spotify/logout', { method: 'POST', credentials: 'include' });
        state.connected = false;
        clearUI();
        setStatus('Disconnected from Spotify.', 'info');
      } catch (error) {
        console.error(error);
        setStatus('Could not disconnect. Please try again.', 'error');
      } finally {
        toggleLoading(false);
      }
    });
  }

  if (selectors.refreshBtn) {
    selectors.refreshBtn.addEventListener('click', () => loadSpotifyData(true));
  }
}

function hydrateFromHash() {
  if (window.location.hash.includes('connected=1')) {
    setStatus('Spotify account linked successfully! Gathering your data…', 'success');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const url = new URL(window.location.href);
  const error = url.searchParams.get('error');
  if (error) {
    setStatus('Spotify connection failed. Please retry.', 'error');
    url.searchParams.delete('error');
    window.history.replaceState({}, document.title, url.toString());
  }
}

async function loadSpotifyData(forceRefresh = false) {
  toggleLoading(true, 'Checking your Spotify connection…');
  try {
    const profile = await fetchJson('/api/spotify/profile');
    if (!profile) {
      state.connected = false;
      showConnectButton();
      setStatus('Connect your Spotify account to unlock personalized vinyl picks.');
      return;
    }

    state.connected = true;
    showAuthenticatedState(profile);

    const [topArtistsResponse, topTracksResponse, recommendationsResponse] = await Promise.all([
      fetchJson('/api/spotify/top-artists'),
      fetchJson('/api/spotify/top-tracks'),
      fetchJson('/api/vinyls/recommended')
    ]);

    renderTopArtists(topArtistsResponse?.items || []);
    renderTopTracks(topTracksResponse?.items || []);
    renderRecommendations(recommendationsResponse?.recommendations || []);

    if (forceRefresh) {
      setStatus('Spotify data refreshed.', 'success');
    } else {
      setStatus('Spotify data synced. Enjoy your tailored vinyl picks!', 'success');
    }
  } catch (error) {
    console.error(error);
    if (error.status === 401) {
      await attemptTokenRefresh();
      return;
    }
    setStatus('We could not reach Spotify right now. Please retry in a moment.', 'error');
  } finally {
    toggleLoading(false);
  }
}

async function attemptTokenRefresh() {
  try {
    const response = await fetch('/auth/spotify/refresh', {
      method: 'POST',
      credentials: 'include'
    });
    if (response.ok) {
      await loadSpotifyData();
    } else {
      clearUI();
      setStatus('Session expired. Please reconnect to Spotify.', 'warning');
    }
  } catch (error) {
    console.error(error);
    clearUI();
    setStatus('Session expired. Please reconnect to Spotify.', 'warning');
  }
}

function showConnectButton() {
  selectors.connectBtn?.classList.remove('hidden');
  selectors.logoutBtn?.classList.add('hidden');
}

function showAuthenticatedState(profile) {
  setStatus(`Welcome back ${profile.display_name || 'listener'}!`);
  selectors.connectBtn?.classList.add('hidden');
  selectors.logoutBtn?.classList.remove('hidden');

  selectors.profileSection?.classList.remove('hidden');
  selectors.profileDetails.innerHTML = renderProfile(profile);
}

function renderProfile(profile) {
  const image = profile.images?.[0]?.url || 'https://i.scdn.co/image/ab6761610000e5eb0c0000000000000000000000';
  const followers = new Intl.NumberFormat().format(profile.followers?.total || 0);
  const plan = profile.product ? profile.product.charAt(0).toUpperCase() + profile.product.slice(1) : 'Free';
  return `
    <div class="profile-info">
      <img src="${image}" alt="${profile.display_name || 'Spotify user'} avatar" class="profile-avatar" loading="lazy">
      <div>
        <p class="profile-name">${profile.display_name || 'Spotify User'}</p>
        <p class="profile-meta">
          <span>${followers} followers</span>
          <span>${profile.country || 'Global'}</span>
          <span>${plan} plan</span>
        </p>
      </div>
    </div>
  `;
}

function renderTopArtists(artists) {
  if (!selectors.topArtistsSection) return;
  if (!artists.length) {
    selectors.topArtistsSection.classList.add('hidden');
    return;
  }

  selectors.topArtistsSection.classList.remove('hidden');
  selectors.topArtistsList.innerHTML = artists
    .map(
      (artist) => `
        <span class="chip">
          <img src="${artist.images?.[2]?.url || artist.images?.[0]?.url || 'https://i.scdn.co/image/ab6761610000e5eb0c0000000000000000000000'}" alt="" loading="lazy">
          ${artist.name}
        </span>
      `
    )
    .join('');
}

function renderTopTracks(tracks) {
  if (!selectors.topTracksSection) return;
  if (!tracks.length) {
    selectors.topTracksSection.classList.add('hidden');
    return;
  }

  selectors.topTracksSection.classList.remove('hidden');
  selectors.topTracksList.innerHTML = tracks
    .map(
      (track) => `
        <span class="chip">
          <img src="${track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || 'https://i.scdn.co/image/ab67616d0000b273000000000000000000000000'}" alt="" loading="lazy">
          ${track.name}
        </span>
      `
    )
    .join('');
}

function renderRecommendations(recommendations) {
  if (!selectors.recommendedSection) return;

  if (!recommendations.length) {
    selectors.recommendedSection.classList.add('hidden');
    selectors.recommendedGrid.innerHTML = '';
    return;
  }

  selectors.recommendedSection.classList.remove('hidden');
  selectors.recommendedGrid.innerHTML = recommendations
    .map(
      (vinyl) => `
        <article class="vinyl-card">
          <img src="${vinyl.img}" alt="${vinyl.title} by ${vinyl.artist}" loading="lazy">
          <div class="card-body">
            <div class="card-title">
              <h3>${vinyl.title}</h3>
              ${vinyl.releaseYear ? `<span class="badge year">${vinyl.releaseYear}</span>` : ''}
            </div>
            <p class="artist">${vinyl.artist}${vinyl.genre ? ` • ${vinyl.genre}` : ''}</p>
            <p class="meta">${vinyl.description}</p>
            <div class="price-row">
              <span class="price">${formatVinylPrice(vinyl)}</span>
              <button class="btn small tertiary" type="button">Add to cart</button>
            </div>
            <div class="badges">
              ${vinyl.trade ? '<span class="badge">Trade-in</span>' : ''}
              ${vinyl.sale ? '<span class="badge sale">Sale</span>' : ''}
            </div>
          </div>
        </article>
      `
    )
    .join('');
}

function formatVinylPrice(vinyl) {
  const currency = vinyl.currency || 'KES';
  const formatter = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency
  });
  return formatter.format(vinyl.price || 0);
}

function clearUI() {
  selectors.profileSection?.classList.add('hidden');
  selectors.topArtistsSection?.classList.add('hidden');
  selectors.topTracksSection?.classList.add('hidden');
  selectors.recommendedSection?.classList.add('hidden');
  selectors.profileDetails.innerHTML = '';
  selectors.topArtistsList.innerHTML = '';
  selectors.topTracksList.innerHTML = '';
  selectors.recommendedGrid.innerHTML = '';
  showConnectButton();
}

async function fetchJson(url) {
  const response = await fetch(url, { credentials: 'include' });
  if (response.status === 204) return null;
  if (response.status === 401) {
    const error = new Error('unauthorized');
    error.status = 401;
    throw error;
  }
  if (!response.ok) {
    const message = await safeJson(response);
    const error = new Error(message?.error || 'request_failed');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (_err) {
    return null;
  }
}

function toggleLoading(isLoading, message) {
  state.loading = isLoading;
  if (isLoading) {
    setStatus(message || 'Loading…', 'info', true);
    selectors.refreshBtn?.setAttribute('disabled', 'true');
    selectors.logoutBtn?.setAttribute('disabled', 'true');
  } else {
    selectors.refreshBtn?.removeAttribute('disabled');
    selectors.logoutBtn?.removeAttribute('disabled');
  }
}

function setStatus(text, tone = 'info', replace = false) {
  if (!selectors.status) return;
  selectors.status.textContent = text;
  selectors.status.dataset.tone = tone;
  if (replace) {
    selectors.status.classList.add('loading');
  } else {
    selectors.status.classList.remove('loading');
  }
}
