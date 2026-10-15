const config = globalThis.YR_MUSIC_CONFIG?.supabase || {};
const url = String(config.url || '').replace(/\/$/, '');
const anonKey = config.anonKey || '';
const sessionKey = 'yr-supabase-session';

export const supabaseConfigured = Boolean(url && anonKey);
const headers = accessToken => ({ apikey: anonKey, Authorization: `Bearer ${accessToken || anonKey}`, 'Content-Type': 'application/json' });
const readSession = () => { try { return JSON.parse(localStorage.getItem(sessionKey)) || null; } catch { return null; } };
const writeSession = session => { try { if (!session) return localStorage.removeItem(sessionKey); const normalized = session.expires_at ? session : { ...session, expires_at: Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600) }; localStorage.setItem(sessionKey, JSON.stringify(normalized)); } catch {} };
const sessionNeedsRefresh = session => Boolean(session?.refresh_token && session?.expires_at && session.expires_at * 1000 < Date.now() + 60000);
const refreshSession = async session => { const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }) }); if (!response.ok) { writeSession(null); throw new Error('Supabase session expired. Sign in again.'); } const nextSession = await response.json(); writeSession(nextSession); return nextSession; };
const validAccessToken = async accessToken => { const session = readSession(); if (accessToken && session?.access_token === accessToken && sessionNeedsRefresh(session)) return (await refreshSession(session)).access_token; return accessToken; };

const request = async (path, options = {}, accessToken) => {
  if (!supabaseConfigured) throw new Error('Supabase is not configured.');
  let token = await validAccessToken(accessToken);
  let response = await fetch(`${url}${path}`, { ...options, headers: { ...headers(token), ...(options.headers || {}) } });
  if (response.status === 401 && token && readSession()?.refresh_token) { token = (await refreshSession(readSession())).access_token; response = await fetch(`${url}${path}`, { ...options, headers: { ...headers(token), ...(options.headers || {}) } }); }
  const body = await response.text();
  let data = null;
  try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || `Supabase request failed (${response.status}).`);
  return data;
};

export const supabaseAuth = {
  async signIn(email, password) { const session = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }); writeSession(session); return session; },
  async signOut() { const session = readSession(); if (session?.access_token) await request('/auth/v1/logout', { method: 'POST' }, session.access_token).catch(() => {}); writeSession(null); },
  session: readSession
};

export const supabaseRest = {
  async select(table, query = '', accessToken) { return request(`/rest/v1/${table}${query}`, { headers: { Accept: 'application/json' } }, accessToken); },
  async insert(table, value, accessToken) { return request(`/rest/v1/${table}`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(value) }, accessToken); },
  async update(table, query, value, accessToken) { return request(`/rest/v1/${table}${query}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(value) }, accessToken); },
  async remove(table, query, accessToken) { return request(`/rest/v1/${table}${query}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, accessToken); },
  async rpc(name, value, accessToken) { return request(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(value) }, accessToken); },
  async removeObject(bucket, path, accessToken) { return request(`/storage/v1/object/${bucket}/${encodeURIComponent(path).replaceAll('%2F', '/')}`, { method: 'DELETE' }, accessToken); },
  async upload(bucket, path, file, accessToken, onProgress) { return new Promise((resolve, reject) => { const xhr = new XMLHttpRequest(); xhr.open('POST', `${url}/storage/v1/object/${bucket}/${encodeURIComponent(path).replaceAll('%2F', '/')}`); xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`); xhr.setRequestHeader('apikey', anonKey); xhr.setRequestHeader('x-upsert', 'false'); xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(event.loaded / event.total); }; xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(JSON.parse(xhr.responseText || '{}')) : reject(new Error(`Upload failed (${xhr.status}).`)); xhr.onerror = () => reject(new Error('Upload network error.')); xhr.send(file); }); },
  async signedUrl(bucket, path, expires = 3600, accessToken) { const result = await request(`/storage/v1/object/sign/${bucket}/${encodeURIComponent(path).replaceAll('%2F', '/')}`, { method: 'POST', body: JSON.stringify({ expiresIn: expires }) }, accessToken); return `${url}/storage/v1${result.signedURL}`; }
};

export const getPublishedSupabaseSongs = async () => {
  if (!supabaseConfigured) return null;
  const rows = await supabaseRest.select('songs', '?select=*&publication_status=eq.published&order=catalog_rank.asc');
  return Promise.all(rows.map(async row => ({ ...row, id: row.legacy_id || row.id, supabaseId: row.id, artist: { id: row.artist.toLowerCase().replace(/\W+/g, '-'), name: row.artist }, album: { id: (row.album || 'unknown').toLowerCase().replace(/\W+/g, '-'), name: row.album || 'Unknown album', artwork: row.artwork_path ? await supabaseRest.signedUrl('yr-artwork', row.artwork_path).catch(() => null) : null }, duration: row.duration_seconds ? row.duration_seconds * 1000 : null, language: row.language, genre: row.genre, popularity: Number(row.metadata?.popularity) || 0, catalogRank: row.catalog_rank, audioUrl: row.local_audio_reference || (row.audio_path ? await supabaseRest.signedUrl('yr-audio', row.audio_path).catch(() => null) : null), previewUrl: null, source: row.source || 'supabase' })));
};
