import { slugify } from './utils.js';

// Shared limits with the Supabase storage buckets in the migration.
export const ASSET_RULES = {
  audio: { types: ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav'], max: 52428800, label: 'audio' },
  artwork: { types: ['image/jpeg', 'image/png', 'image/webp'], max: 10485760, label: 'artwork' }
};

export const validateAsset = (file, kind) => {
  const rules = ASSET_RULES[kind];
  if (!file) return null;
  if (!rules) return `Unknown asset kind: ${kind}.`;
  if (!rules.types.includes(file.type)) return `${rules.label} type ${file.type || 'unknown'} is not allowed.`;
  if (file.size > rules.max) return `${rules.label} exceeds the ${Math.round(rules.max / 1048576)} MB limit.`;
  return null;
};

export const buildSongId = (legacyId, title) => slugify(legacyId || title);

/**
 * Validates the owner song editor without touching the DOM.
 * `files` holds optional { audio, artwork } File objects, `existing` is the song
 * currently being edited (or undefined), `songs` is the full owner catalog.
 */
export const validateSongDraft = ({ values, files = {}, songs = [], currentId = '' }) => {
  const errors = [];
  const legacyId = buildSongId(values.legacyId, values.title);
  const existing = songs.find(song => song.id === currentId);

  for (const [key, label] of [['title', 'Title'], ['artist', 'Artist'], ['language', 'Language'], ['genre', 'Genre']]) {
    if (!String(values[key] || '').trim()) errors.push({ id: `song${label}`, message: `${label} is required.` });
  }
  if (!legacyId) errors.push({ id: 'songLegacyId', message: 'A stable song ID is required.' });

  const duplicate = songs.find(song => song.legacy_id === legacyId && song.id !== currentId);
  if (duplicate) errors.push({ id: 'songLegacyId', message: `The song ID ${legacyId} already exists.` });

  for (const kind of ['audio', 'artwork']) {
    const message = validateAsset(files[kind], kind);
    if (message) errors.push({ id: `song${kind === 'audio' ? 'Audio' : 'Artwork'}`, message });
  }

  const duration = Number(values.durationSeconds);
  if (values.durationSeconds !== '' && values.durationSeconds !== null && values.durationSeconds !== undefined
    && (!Number.isFinite(duration) || duration < 1 || duration > 86400)) {
    errors.push({ id: 'songDuration', message: 'Duration must be between 1 and 86400 seconds.' });
  }

  if (values.status === 'published' && !files.audio && !existing?.audio_path && !existing?.local_audio_reference) {
    errors.push({ id: 'songStatus', message: 'A published song must have verified audio or an approved local audio reference.' });
  }

  return { errors, legacyId };
};

export const songPayload = ({ values, existing, legacyId }) => ({
  legacy_id: legacyId,
  title: String(values.title || '').trim(),
  artist: String(values.artist || '').trim(),
  album: String(values.album || '').trim() || null,
  language: String(values.language || '').trim(),
  genre: String(values.genre || '').trim(),
  duration_seconds: values.durationSeconds ? Number(values.durationSeconds) : null,
  publication_status: values.status,
  metadata: {
    ...(existing?.metadata || {}),
    artist_id: slugify(values.artistId || values.artist),
    album_id: slugify(values.albumId || values.album) || null
  }
});