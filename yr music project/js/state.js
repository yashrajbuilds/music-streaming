import { storage } from './storage.js';
export const localTracks = [
  { id: 'local-jai', title: 'Jai Shree Ram', artist: 'Hansraj Raghuwanshi', album: 'YR local library', artwork: null, src: 'Jai%20Shree%20Ram.mp3', local: true },
  { id: 'local-ram', title: 'Ram Aayenge To Angana Sajaungi', artist: 'Urvashi Kiran Sharma', album: 'YR local library', artwork: null, src: 'Ram%20Aayenge%20to%20Angana%20Sajaungi%20(Female%20Version).mp3', local: true }
];
export const state = { tracks: [...localTracks], current: null, queue: [], queueIndex: 0, liked: storage.liked, recent: storage.recent, shuffle: false, repeat: 0, view: 'home' };
export const isLiked = track => Boolean(track && state.liked.some(item => item.id === track.id));
export const setLiked = track => { state.liked = isLiked(track) ? state.liked.filter(item => item.id !== track.id) : [track, ...state.liked]; storage.liked = state.liked; };
