import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = join(root, 'yr music project');
const migrationPath = join(root, 'supabase', 'migrations', '202610150001_initial_schema.sql');
const catalogPath = join(project, 'data', 'songs.json');
const audioPaths = [join(project, 'Jai Shree Ram.mp3'), join(project, 'Ram Aayenge to Angana Sajaungi (Female Version).mp3')];
const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const catalogHashBefore = await hash(catalogPath);
const audioHashesBefore = await Promise.all(audioPaths.map(hash));
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const migration = (await readFile(migrationPath, 'utf8')).toLowerCase();
const requiredMigrationMarkers = [
  'enable row level security',
  'public.is_owner()',
  'songs_public_read',
  'songs_owner_all',
  'storage.buckets',
  'public = false',
  'storage.foldername(name))[1] = auth.uid()::text',
  'ingest_listening_event',
  'refresh_daily_analytics'
];
for (const marker of requiredMigrationMarkers) assert(migration.includes(marker.toLowerCase()), `Migration is missing required marker: ${marker}`);
assert(!/create policy listening_sessions_insert/i.test(migration), 'Direct anonymous listening-session insert policy must not exist.');
assert(!/drop\s+(database|schema|table)/i.test(migration), 'Migration contains a destructive database statement.');
assert(!/service_role|supabase_service_role/i.test(migration), 'Migration contains a service-role reference.');

const tempDirectory = await mkdtemp(join(tmpdir(), 'yr-music-supabase-'));
try {
  const output = join(tempDirectory, 'catalog.sql');
  const result = spawnSync(process.execPath, [join(root, 'scripts', 'export-catalog-sql.mjs'), output], { encoding: 'utf8' });
  assert(result.status === 0, `Catalog exporter failed: ${result.stderr || result.stdout}`);
  const seed = await readFile(output, 'utf8');
  assert(seed.includes('on conflict (legacy_id) do update'), 'Catalog seed is not idempotent by legacy_id.');
  for (const track of catalog) assert(seed.includes(`'${String(track.id).replaceAll("'", "''")}'`), `Catalog seed is missing ${track.id}.`);
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}

assert((await stat(audioPaths[0])).size > 0 && (await stat(audioPaths[1])).size > 0, 'A required local MP3 is missing or empty.');
assert(await hash(catalogPath) === catalogHashBefore, 'songs.json changed during verification.');
const audioHashesAfter = await Promise.all(audioPaths.map(hash));
assert(audioHashesAfter.every((value, index) => value === audioHashesBefore[index]), 'A local MP3 changed during verification.');
console.log(`Supabase foundation verification passed: ${catalog.length} catalog rows checked; migration markers, idempotent seed, and local audio preservation verified. No remote operation performed.`);
