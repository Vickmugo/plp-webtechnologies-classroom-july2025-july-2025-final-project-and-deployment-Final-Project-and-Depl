// server/index.js
const express = require('express');
const fetch = require('node-fetch'); // or native fetch in Node 18+
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
app.use(cookieParser());

// env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, REDIRECT_URI (e.g., https://yourdomain.com/auth/spotify/callback)
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const STATE_KEY = 'spotify_auth_state';

// 1) Start auth
app.get('/auth/spotify', (req, res) => {
  const state = Math.random().toString(36).slice(2);
  res.cookie(STATE_KEY, state, { httpOnly: true, secure: true, sameSite:'lax' });
  const scope = [
    'user-read-email',
    'user-read-private',
    'user-top-read',
    'user-read-recently-played'
  ].join(' ');
  const params = querystring.stringify({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope,
    state
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// 2) Callback to exchange code for tokens
app.get('/auth/spotify/callback', async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[STATE_KEY] : null;
  if(state === null || state !== storedState) {
    return res.redirect('/?error=state_mismatch');
  }
  // request tokens
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method:'POST',
    headers: { 'Content-Type':'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64') },
    body: querystring.stringify({ grant_type:'authorization_code', code, redirect_uri:REDIRECT_URI })
  });
  const tokenData = await tokenRes.json();
  // tokenData: access_token, refresh_token, expires_in
  // store tokens server-side linked to user session (or issue your own session cookie)
  // Redirect back to frontend
  res.redirect(`/spotify-connected?access_token=${tokenData.access_token}`);
});

// 3) Example API: get user's top artists (server endpoint that calls Spotify)
app.get('/api/spotify/top-artists', async (req, res) => {
  // Expect access_token from cookie/session or Authorization header
  const token = req.headers.authorization?.replace('Bearer ','') || req.query.access_token;
  if(!token) return res.status(401).json({ error:'no_token' });
  const r = await fetch('https://api.spotify.com/v1/me/top/artists?limit=10', { headers: { Authorization: `Bearer ${token}` }});
  const data = await r.json();
  // send back simplified array of artist names / ids
  res.json(data);
});

app.listen(3000, ()=> console.log('Server running on :3000'));
