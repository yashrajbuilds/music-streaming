const safeRead = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
export const storage = {
  get liked() { return safeRead('yr-liked', []); }, set liked(value) { safeWrite('yr-liked', value); },
  get recent() { return safeRead('yr-recent', []); }, set recent(value) { safeWrite('yr-recent', value); },
  get volume() { return Number(safeRead('yr-volume', 0.8)); }, set volume(value) { safeWrite('yr-volume', value); },
  get searchHistory() { return safeRead('yr-search-history', []); }, set searchHistory(value) { safeWrite('yr-search-history', value); }
};
export const rememberTrack = (track) => { storage.recent = [track, ...storage.recent.filter(item => item.id !== track.id)].slice(0, 12); };
