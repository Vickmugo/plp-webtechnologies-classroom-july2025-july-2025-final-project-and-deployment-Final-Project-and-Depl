import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

dotenv.config();

const {
  SPOTIFY_CLIENT_ID: CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI: REDIRECT_URI,
  POST_LOGIN_REDIRECT,
  COOKIE_SECRET,
  PORT = 3000,
  NODE_ENV
} = process.env;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error(
    'Missing Spotify credentials. Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI in your environment.'
  );
  process.exit(1);
}

if (!COOKIE_SECRET) {
  console.warn('Warning: COOKIE_SECRET is not set. Spotify session cookies will not be signed.');
}

const isProduction = NODE_ENV === 'production';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const useSignedCookies = Boolean(COOKIE_SECRET);
const app = express();
const cookieOptionsBase = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
  signed: useSignedCookies
};

const STATE_COOKIE_KEY = 'spotify_auth_state';
const ACCESS_COOKIE_KEY = 'spotify_access_token';
const REFRESH_COOKIE_KEY = 'spotify_refresh_token';
const EXPIRY_COOKIE_KEY = 'spotify_token_expires_at';

const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-top-read',
  'user-read-recently-played'
].join(' ');

app.use(cookieParser(COOKIE_SECRET));
app.use(express.json());

// Serve the static frontend assets
app.use(express.static(ROOT_DIR, { extensions: ['html'] }));

app.get('/auth/spotify', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE_KEY, state, {
    ...cookieOptionsBase,
    maxAge: 5 * 60 * 1000
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    redirect_uri: REDIRECT_URI,
    state
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

app.get('/auth/spotify/callback', async (req, res, next) => {
  try {
    const { code = null, state = null, error = null } = req.query;

    if (error) {
      return res.redirect(`/spotify-connect.html#error=${encodeURIComponent(error)}`);
    }

    const storedState = getCookie(req, STATE_COOKIE_KEY);
    if (!state || state !== storedState) {
      return res.redirect('/spotify-connect.html#error=state_mismatch');
    }

    res.clearCookie(STATE_COOKIE_KEY, cookieOptionsBase);

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      console.error('Spotify token exchange failed', tokenResponse.status, text);
      return res.redirect('/spotify-connect.html#error=token_exchange_failed');
    }

    const tokenData = await tokenResponse.json();
    persistTokens(res, tokenData);

    const redirectTarget = POST_LOGIN_REDIRECT || '/spotify-connect.html';
    res.redirect(`${redirectTarget}#connected=1`);
  } catch (err) {
    next(err);
  }
});

app.post('/auth/spotify/logout', (req, res) => {
  clearTokens(res);
  res.status(204).end();
});

app.post('/auth/spotify/refresh', async (req, res, next) => {
  try {
    const refreshToken = getCookie(req, REFRESH_COOKIE_KEY);
    if (!refreshToken) {
      return res.status(401).json({ error: 'not_authenticated' });
    }

    const tokenData = await refreshAccessToken(refreshToken);
    persistTokens(res, tokenData, refreshToken);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.get('/api/vinyls', (_req, res) => {
  res.json(getVinylCatalog());
});

app.get('/api/spotify/profile', requireSpotifyAuth, async (req, res, next) => {
  try {
    const data = await spotifyRequest(req, res, '/me');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.get('/api/spotify/top-artists', requireSpotifyAuth, async (req, res, next) => {
  try {
    const data = await spotifyRequest(req, res, '/me/top/artists', { limit: 10 });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.get('/api/spotify/top-tracks', requireSpotifyAuth, async (req, res, next) => {
  try {
    const data = await spotifyRequest(req, res, '/me/top/tracks', { limit: 10 });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.get('/api/vinyls/recommended', requireSpotifyAuth, async (req, res, next) => {
  try {
    const [topArtists, topTracks] = await Promise.all([
      spotifyRequest(req, res, '/me/top/artists', { limit: 10 }),
      spotifyRequest(req, res, '/me/top/tracks', { limit: 10 })
    ]);

    const recommendations = buildVinylRecommendations(topArtists.items || [], topTracks.items || []);
    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, _next) => {
  if (err?.statusCode) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'internal_server_error' });
});

app.listen(PORT, () => {
  console.log(`254 Vinyls server running on http://localhost:${PORT}`);
});

function persistTokens(res, tokenData, fallbackRefreshToken) {
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || fallbackRefreshToken;
  const expiresInSeconds = tokenData.expires_in || 3600;
  const expiresAt = Date.now() + expiresInSeconds * 1000;

  res.cookie(ACCESS_COOKIE_KEY, accessToken, {
    ...cookieOptionsBase,
    maxAge: expiresInSeconds * 1000
  });

  if (refreshToken) {
    // 30 days default
    res.cookie(REFRESH_COOKIE_KEY, refreshToken, {
      ...cookieOptionsBase,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
  }

  res.cookie(EXPIRY_COOKIE_KEY, String(expiresAt), {
    ...cookieOptionsBase,
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function clearTokens(res) {
  [ACCESS_COOKIE_KEY, REFRESH_COOKIE_KEY, EXPIRY_COOKIE_KEY, STATE_COOKIE_KEY].forEach((key) => {
    res.clearCookie(key, { ...cookieOptionsBase, maxAge: 0 });
  });
}

async function requireSpotifyAuth(req, res, next) {
  try {
    const token = await ensureAccessToken(req, res);
    req.spotifyAccessToken = token;
    next();
  } catch (err) {
    if (err?.code === 'NO_SPOTIFY_TOKEN') {
      res.status(401).json({ error: 'not_authenticated' });
    } else {
      next(err);
    }
  }
}

async function ensureAccessToken(req, res) {
  const accessToken = getCookie(req, ACCESS_COOKIE_KEY);
  const refreshToken = getCookie(req, REFRESH_COOKIE_KEY);
  const expiryRaw = getCookie(req, EXPIRY_COOKIE_KEY);
  const expiry = Number(expiryRaw || 0);

  if (accessToken && expiry && expiry - Date.now() > 60 * 1000) {
    return accessToken;
  }

  if (!refreshToken) {
    const error = new Error('Spotify access token missing');
    error.code = 'NO_SPOTIFY_TOKEN';
    throw error;
  }

  const tokenData = await refreshAccessToken(refreshToken);
  persistTokens(res, tokenData, refreshToken);
  return tokenData.access_token;
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error('spotify_refresh_failed');
    error.details = text;
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  if (!data.refresh_token) {
    data.refresh_token = refreshToken;
  }
  return data;
}

async function spotifyRequest(req, res, endpoint, query = {}) {
  let accessToken = req.spotifyAccessToken || (await ensureAccessToken(req, res));

  const url = new URL(`https://api.spotify.com/v1${endpoint}`);
  Object.entries(query).forEach(([key, value]) => {
    if (typeof value !== 'undefined' && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  let response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (response.status === 401) {
    const refreshToken = getCookie(req, REFRESH_COOKIE_KEY);
    if (!refreshToken) {
      const error = new Error('not_authenticated');
      error.statusCode = 401;
      throw error;
    }
    const tokenData = await refreshAccessToken(refreshToken);
    persistTokens(res, tokenData, refreshToken);
    accessToken = tokenData.access_token;
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  }

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`spotify_api_error_${response.status}`);
    error.details = text;
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

function buildVinylRecommendations(artists, tracks) {
  const vinylCatalog = getVinylCatalog();
  const artistNames = new Set(artists.map((artist) => artist.name.toLowerCase()));
  const trackArtistNames = new Set(
    tracks.flatMap((track) => track.artists.map((artist) => artist.name.toLowerCase()))
  );

  const allNames = new Set([...artistNames, ...trackArtistNames]);

  const matched = vinylCatalog.filter((vinyl) => {
    return allNames.has(vinyl.artist.toLowerCase());
  });

  if (matched.length >= 6) {
    return matched.slice(0, 6);
  }

  const fallback = vinylCatalog
    .filter((vinyl) => vinyl.tags.some((tag) => tagMatchesListening(tag, artists, tracks)))
    .slice(0, 6 - matched.length);

  return [...matched, ...fallback];
}

function tagMatchesListening(tag, artists, tracks) {
  const tagLower = tag.toLowerCase();
  return (
    artists.some((artist) => {
      return (
        artist.genres?.some((genre) => genre.toLowerCase().includes(tagLower)) ||
        artist.name.toLowerCase().includes(tagLower)
      );
    }) ||
    tracks.some((track) =>
      track.artists.some((artist) => artist.name.toLowerCase().includes(tagLower))
    )
  );
}

function getVinylCatalog() {
  return [
    {
      id: 'adele-30',
      artist: 'Adele',
      title: '30',
      genre: 'Pop',
      releaseYear: 2021,
      popularity: 95,
      price: 4500,
      currency: 'KES',
      img: '/images/Adele.jpg',
      tags: ['soul', 'pop', 'adele'],
      trade: true,
      sale: false,
      description: 'Limited edition heavyweight pressing of Adele’s latest award-winning album.'
    },
    {
      id: 'sauti-sol-midnight-train',
      artist: 'Sauti Sol',
      title: 'Midnight Train',
      genre: 'Afro-pop',
      releaseYear: 2020,
      popularity: 92,
      price: 3800,
      currency: 'KES',
      img: '/images/Sauti Sol - Kenyan favorite.jpeg',
      tags: ['kenyan', 'afropop', 'sauti sol'],
      trade: false,
      sale: true,
      description: 'Celebrate Kenyan Afropop excellence with the fan favorite “Midnight Train.”'
    },
    {
      id: 'burna-boy-african-giant',
      artist: 'Burna Boy',
      title: 'African Giant',
      genre: 'Afrobeats',
      releaseYear: 2019,
      popularity: 97,
      price: 4200,
      currency: 'KES',
      img: '/images/coverimage.png',
      tags: ['afrobeats', 'burna boy', 'african'],
      trade: true,
      sale: false,
      description: 'Grammy-winning Afrobeats masterpiece featuring global hits like “Ye”.'
    },
    {
      id: 'wizkid-made-in-lagos',
      artist: 'Wizkid',
      title: 'Made in Lagos',
      genre: 'Afrobeats',
      releaseYear: 2020,
      popularity: 93,
      price: 4000,
      currency: 'KES',
      img: '/images/coverimage.png',
      tags: ['afrobeats', 'wizkid', 'lagos'],
      trade: true,
      sale: false,
      description: 'Silky smooth Afrobeats, pressed on 180g black vinyl for collectors.'
    },
    {
      id: 'temsbaby-leaf',
      artist: 'Tems',
      title: 'Leave the Message',
      genre: 'Alté',
      releaseYear: 2021,
      popularity: 88,
      price: 3900,
      currency: 'KES',
      img: '/images/coverimage.png',
      tags: ['tems', 'soul', 'alté'],
      trade: false,
      sale: false,
      description: 'Alté soul moods from Nigeria’s fastest-rising star.'
    },
    {
      id: 'kendrick-lamar-damn',
      artist: 'Kendrick Lamar',
      title: 'DAMN.',
      genre: 'Hip Hop',
      releaseYear: 2017,
      popularity: 96,
      price: 4700,
      currency: 'KES',
      img: '/images/coverimage.png',
      tags: ['hip hop', 'kendrick', 'rap'],
      trade: true,
      sale: false,
      description: 'Pulitzer-winning hip-hop classic with pristine analog mastering.'
    },
    {
      id: 'billie-eilish-happier-than-ever',
      artist: 'Billie Eilish',
      title: 'Happier Than Ever',
      genre: 'Pop',
      releaseYear: 2021,
      popularity: 90,
      price: 4100,
      currency: 'KES',
      img: '/images/coverimage.png',
      tags: ['pop', 'billie eilish', 'electropop'],
      trade: false,
      sale: false,
      description: 'Deluxe double LP with embossed gatefold and lyric booklet.'
    },
    {
      id: 'coldplay-everyday-life',
      artist: 'Coldplay',
      title: 'Everyday Life',
      genre: 'Alternative',
      releaseYear: 2019,
      popularity: 85,
      price: 3600,
      currency: 'KES',
      img: '/images/coverimage.png',
      tags: ['rock', 'coldplay', 'alternative'],
      trade: true,
      sale: true,
      description: 'Experimental world music and alternative rock blend from Coldplay.'
    }
  ];
}

function getCookie(req, key) {
  if (useSignedCookies) {
    const value = req.signedCookies[key];
    if (typeof value !== 'undefined') {
      return value;
    }
  }
  return req.cookies[key];
}
