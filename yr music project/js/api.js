import { getPublishedSupabaseSongs, supabaseConfigured } from './supabase.js';
import { slugify } from './utils.js';

const catalogUrl = new URL('../data/songs.json', import.meta.url);
const asEntity = value => typeof value === 'string' ? { name: value } : (value || {});
const normalizeTrack = item => {
	const artist = asEntity(item.artist);
	const album = asEntity(item.album);
	const artistName = artist.name || 'Unknown artist';
	const albumName = album.name || 'Unknown album';
	return {
		id: item.id || slugify(`${artistName}-${item.title || 'track'}`),
		title: item.title || 'Untitled track',
		artist: { id: artist.id || slugify(artistName), name: artistName },
		album: { id: album.id || slugify(albumName), name: albumName, artwork: album.artwork || item.artwork || null },
		duration: Number.isFinite(item.duration) ? item.duration : null,
		language: item.language || 'Indian',
		genre: item.genre || 'Indian music',
		popularity: Math.max(0, Math.min(100, Number(item.popularity) || 0)),
		catalogRank: Number(item.catalogRank) || 999,
		previewUrl: item.previewUrl || null,
		audioUrl: item.audioUrl || null,
		externalUrl: item.externalUrl || null,
		source: item.source || 'catalog'
	};
};
let catalogPromise;
export const loadCatalog = async () => { if (!catalogPromise) catalogPromise = (async () => { if (supabaseConfigured) { try { const remote = await getPublishedSupabaseSongs(); if (remote?.length) return remote; } catch { /* Local catalog is the rollback path when Supabase is unavailable. */ } } const response = await fetch(catalogUrl); if (!response.ok) throw new Error('Catalog unavailable'); const records = await response.json(); if (!Array.isArray(records)) throw new Error('Catalog format invalid'); return records.map(normalizeTrack); })().catch(error => { catalogPromise = undefined; throw error; }); return catalogPromise; };
export const getCatalogTracks = async () => loadCatalog();
export const getTrendingTracks = async () => (await loadCatalog()).filter(track => track.catalogRank < 10).sort(sortByPopularity);
export const getHindiTracks = async () => (await loadCatalog()).filter(track => track.language === 'Hindi');
export const getHaryanviTracks = async () => (await loadCatalog()).filter(track => track.language === 'Haryanvi');
export const getPunjabiTracks = async () => (await loadCatalog()).filter(track => track.language === 'Punjabi');
export const getArtist = async artistId => (await loadCatalog()).filter(track => track.artist.id === artistId);
export const getAlbum = async albumId => (await loadCatalog()).filter(track => track.album.id === albumId);
export const searchTracks = async query => { const normalizedQuery = query.trim().toLowerCase(); return (await loadCatalog()).filter(track => [track.title, track.artist.name, track.album.name, track.language, track.genre].some(value => value.toLowerCase().includes(normalizedQuery))); };
const sortByPopularity = (a, b) => (b.popularity - a.popularity) || (a.catalogRank - b.catalogRank);
