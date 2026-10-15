import { storage } from './storage.js';
const normalizeSavedTrack = track => ({ ...track, artist: typeof track.artist === 'string' ? { id: track.artist.toLowerCase().replace(/\W+/g, '-'), name: track.artist } : track.artist, album: typeof track.album === 'string' ? { id: track.album.toLowerCase().replace(/\W+/g, '-'), name: track.album, artwork: track.artwork || null } : track.album, audioUrl: track.audioUrl || track.src || null, language: track.language || 'Indian', genre: track.genre || 'Indian music', source: track.source || (track.local ? 'local' : 'catalog') });
export const state = { tracks: [], current: null, queue: [], queueIndex: -1, liked: storage.liked.map(normalizeSavedTrack), recent: storage.recent.map(normalizeSavedTrack), playlists: storage.playlists, shuffle: false, repeat: 0, view: 'home' };
export const isLiked = track => Boolean(track && state.liked.some(item => item.id === track.id));
export const setLiked = track => { state.liked = isLiked(track) ? state.liked.filter(item => item.id !== track.id) : [track, ...state.liked]; storage.liked = state.liked; };
export const setRecent = recent => { state.recent = recent; };
export const savePlaylists = () => { storage.playlists = state.playlists; };
