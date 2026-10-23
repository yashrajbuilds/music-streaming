import { readdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = process.cwd();
const project = join(root, 'yr music project');
const jsDirectory = join(project, 'js');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const exists = async path => { try { await stat(path); return true; } catch { return false; } };

const checkModules = async () => {
  const files = (await readdir(jsDirectory)).filter(file => file.endsWith('.js')).sort();
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', join(jsDirectory, file)], { encoding: 'utf8' });
    assert(result.status === 0, `Syntax error in js/${file}: ${result.stderr.trim()}`);
    const source = await readFile(join(jsDirectory, file), 'utf8');
    for (const [, specifier] of source.matchAll(/from\s+'(\.\/[^']+)'/g)) {
      assert(await exists(join(jsDirectory, specifier)), `js/${file} imports a missing module: ${specifier}`);
    }
    assert(!/service_role/i.test(source), `js/${file} must never reference a service-role key.`);
  }
  return files;
};

const checkCatalog = async () => {
  const catalog = JSON.parse(await readFile(join(project, 'data', 'songs.json'), 'utf8'));
  assert(Array.isArray(catalog) && catalog.length > 0, 'Catalog must contain at least one track.');
  const ids = new Set();
  const legacyIds = new Set();
  for (const track of catalog) {
    for (const field of ['id', 'title', 'language', 'genre', 'source']) {
      assert(typeof track[field] === 'string' && track[field].trim(), `Missing ${field} in ${track.id || 'catalog record'}.`);
    }
    assert(track.artist?.name && track.artist?.id, `Missing artist id/name in ${track.id}.`);
    assert(track.album?.name && track.album?.id, `Missing album id/name in ${track.id}.`);
    assert(!ids.has(track.id), `Duplicate track id: ${track.id}.`);
    ids.add(track.id);
    const legacyId = track.id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    assert(!legacyIds.has(legacyId), `Track id collides after slugification: ${track.id}.`);
    legacyIds.add(legacyId);
    assert(typeof track.popularity === 'number' && track.popularity >= 0 && track.popularity <= 100, `Invalid popularity in ${track.id}.`);
    assert(['local', 'catalog', 'supabase'].includes(track.source), `Unknown source "${track.source}" in ${track.id}.`);
    if (track.audioUrl) {
      assert(track.audioUrl.startsWith('./'), `Only relative audio URLs are allowed in the local catalog: ${track.id}.`);
      const audioPath = resolve(project, decodeURIComponent(track.audioUrl));
      assert(await exists(audioPath), `Missing local audio file for ${track.id}: ${track.audioUrl}`);
    }
    for (const url of [track.previewUrl, track.externalUrl, track.album.artwork]) {
      if (url) assert(!/^https?:/i.test(url) || track.source !== 'local', `Local track ${track.id} must not depend on a remote asset.`);
    }
  }
  return catalog;
};

const checkHtmlAssets = async () => {
  for (const page of ['index.html', 'admin.html']) {
    const html = await readFile(join(project, page), 'utf8');
    assert(!/service_role/i.test(html), `${page} must never reference a service-role key.`);
    for (const [, attribute, reference] of html.matchAll(/\b(src|href)="(\.\/[^"]+)"/g)) {
      const clean = decodeURIComponent(reference.split('?')[0]);
      assert(await exists(resolve(project, clean)), `${page} ${attribute} points at a missing file: ${reference}`);
    }
  }
};

const checkMigration = async () => {
  const migration = await readFile(join(root, 'supabase', 'migrations', '202610150001_initial_schema.sql'), 'utf8');
  for (const required of ['enable row level security', 'owner_authorizations', 'ingest_listening_event', 'storage.buckets']) {
    assert(migration.toLowerCase().includes(required.toLowerCase()), `Supabase migration is missing ${required}.`);
  }
  for (const adminFile of ['admin.html', 'js/admin.js', 'js/analytics.js', 'css/admin.css', 'js/supabase.js', 'js/validation.js', 'js/utils.js']) {
    assert(await exists(join(project, adminFile)), `Missing admin integration file: ${adminFile}`);
  }
};

try {
  const files = await checkModules();
  const catalog = await checkCatalog();
  await checkHtmlAssets();
  await checkMigration();
  console.log(`YR MUSIC build check passed: ${files.length} modules, ${catalog.length} production records, HTML assets verified.`);
} catch (error) {
  console.error(`YR MUSIC build check failed: ${error.message}`);
  process.exit(1);
}