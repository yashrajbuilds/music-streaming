import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const project = join(process.cwd(), 'yr music project');
const jsDirectory = join(project, 'js');
const files = (await readdir(jsDirectory)).filter(file => file.endsWith('.js'));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', join(jsDirectory, file)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
const catalog = JSON.parse(await readFile(join(project, 'data', 'songs.json'), 'utf8'));
if (!Array.isArray(catalog) || catalog.length === 0) throw new Error('Catalog must contain at least one track.');
const ids = new Set();
for (const track of catalog) {
  if (ids.has(track.id)) throw new Error(`Duplicate track id: ${track.id}.`);
  ids.add(track.id);
  for (const field of ['id', 'title', 'artist', 'album', 'language', 'genre', 'source']) {
    if (!track[field]) throw new Error(`Missing ${field} in ${track.id || 'catalog record'}.`);
  }
  if (typeof track.popularity !== 'number' || track.popularity < 0 || track.popularity > 100) throw new Error(`Invalid popularity in ${track.id}.`);
  if (track.audioUrl && track.source === 'local') {
    const audioPath = resolve(project, decodeURIComponent(track.audioUrl));
    try { await readFile(audioPath); } catch { throw new Error(`Missing local audio file for ${track.id}: ${track.audioUrl}`); }
  }
  if (track.audioUrl && !track.audioUrl.startsWith('./')) throw new Error(`Only relative audio URLs are allowed in the local catalog: ${track.id}.`);
}
const migration = await readFile(join(process.cwd(), 'supabase', 'migrations', '202610150001_initial_schema.sql'), 'utf8');
for (const required of ['enable row level security', 'owner_authorizations', 'ingest_listening_event', 'storage.buckets']) {
  if (!migration.toLowerCase().includes(required.toLowerCase())) throw new Error(`Supabase migration is missing ${required}.`);
}
for (const adminFile of ['admin.html', 'js/admin.js', 'js/analytics.js', 'css/admin.css', 'js/supabase.js']) {
  try { await readFile(join(project, adminFile)); } catch { throw new Error(`Missing admin integration file: ${adminFile}`); }
}
console.log(`YR MUSIC build check passed: ${files.length} modules, ${catalog.length} production records.`);
