const safeRead = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
export const storage = {
  get liked() { const value = safeRead('yr-liked', []); return Array.isArray(value) ? value : []; }, set liked(value) { safeWrite('yr-liked', value); },
  get recent() { const value = safeRead('yr-recent', []); return Array.isArray(value) ? value : []; }, set recent(value) { safeWrite('yr-recent', value); },
  get playlists() { const value = safeRead('yr-playlists', []); return Array.isArray(value) ? value : []; }, set playlists(value) { safeWrite('yr-playlists', value); },
  get volume() { const value = Number(safeRead('yr-volume', 0.8)); return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.8; }, set volume(value) { safeWrite('yr-volume', value); },
};
export const rememberTrack = track => { const recent = [track, ...storage.recent.filter(item => item.id !== track.id)].slice(0, 12); storage.recent = recent; return recent; };
