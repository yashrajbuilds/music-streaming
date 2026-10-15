import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(root, 'yr music project', 'data', 'songs.json');
const outputPath = process.argv[2] || join(root, 'supabase', 'seed', '0001_catalog.sql');
const catalog = JSON.parse(await readFile(sourcePath, 'utf8'));
if (!Array.isArray(catalog)) throw new Error('songs.json must contain an array.');

const sql = value => value === null || value === undefined ? 'null' : `'${String(value).replaceAll("'", "''")}'`;
const json = value => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const durationSeconds = value => Number.isFinite(value) ? Math.max(1, Math.round(value / 1000)) : null;
const rows = catalog.map(track => {
  const artist = typeof track.artist === 'string' ? track.artist : track.artist?.name;
  const album = typeof track.album === 'string' ? track.album : track.album?.name;
  const artwork = typeof track.album === 'object' ? track.album.artwork : track.artwork;
  const isLocal = track.source === 'local';
  return `(${[track.id, track.title, artist, album || null, track.language, track.genre, durationSeconds(track.duration), artwork || null, isLocal ? null : null, isLocal ? track.audioUrl : null, isLocal ? 'local' : 'supabase', isLocal ? 'published' : 'draft', track.catalogRank || 999, { popularity: track.popularity ?? 0, original_source: track.source ?? null }].map((value, index) => index === 13 ? json(value) : sql(value)).join(', ')})`;
});

const output = `-- Generated from yr music project/data/songs.json.\n-- Idempotent by legacy_id. Does not modify songs.json or copy/delete audio files.\n-- Local audio remains referenced by its existing relative URL until uploaded to Supabase Storage.\n\ninsert into public.songs (legacy_id, title, artist, album, language, genre, duration_seconds, artwork_path, audio_path, local_audio_reference, source, publication_status, catalog_rank, metadata)\nvalues\n${rows.join(',\n')}\non conflict (legacy_id) do update set\n  title = excluded.title, artist = excluded.artist, album = excluded.album, language = excluded.language, genre = excluded.genre, duration_seconds = excluded.duration_seconds, artwork_path = excluded.artwork_path, local_audio_reference = coalesce(public.songs.local_audio_reference, excluded.local_audio_reference), source = excluded.source, catalog_rank = excluded.catalog_rank, metadata = excluded.metadata, updated_at = timezone('utc', now());\n`;

await writeFile(outputPath, output, 'utf8');
console.log(`Wrote ${catalog.length} idempotent catalog rows to ${outputPath}`);
