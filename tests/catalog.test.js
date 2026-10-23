import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = join(root, 'yr music project');
const catalog = JSON.parse(await readFile(join(project, 'data', 'songs.json'), 'utf8'));

test('the shipped catalog keeps its editorial sections populated', () => {
  assert.ok(catalog.length >= 14);
  const languages = new Set(catalog.map(track => track.language));
  for (const language of ['Hindi', 'Haryanvi', 'Punjabi']) assert.ok(languages.has(language), `missing ${language} tracks`);
  assert.ok(catalog.filter(track => track.catalogRank < 10).length >= 3, 'trending section would be empty');
});

test('every catalog id is unique and slug-safe', () => {
  const ids = catalog.map(track => track.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/, `unsafe catalog id: ${id}`);
});

test('local tracks point at bundled, non-empty audio files', async () => {
  const local = catalog.filter(track => track.source === 'local');
  assert.equal(local.length, 2);
  for (const track of local) {
    assert.match(track.audioUrl, /^\.\//, `${track.id} must use a relative audio URL`);
    const file = await stat(resolve(project, decodeURIComponent(track.audioUrl)));
    assert.ok(file.size > 0, `${track.id} audio is empty`);
  }
});

test('metadata-only records never claim playable audio', () => {
  for (const track of catalog.filter(track => track.source !== 'local')) {
    assert.equal(track.audioUrl, null, `${track.id} should stay metadata-only`);
    assert.equal(track.previewUrl, null, `${track.id} should not invent a preview URL`);
  }
});

test('catalog records carry the fields the UI renders', () => {
  for (const track of catalog) {
    assert.ok(track.title && track.artist?.name && track.artist?.id, `incomplete artist data in ${track.id}`);
    assert.ok(track.album?.name && track.album?.id, `incomplete album data in ${track.id}`);
    assert.equal(typeof track.popularity, 'number');
    assert.ok(track.popularity >= 0 && track.popularity <= 100, `popularity out of range in ${track.id}`);
  }
});