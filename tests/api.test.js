import test from 'node:test';
import assert from 'node:assert/strict';

const records = [
  {
    id: 'trending-low', title: 'Low', artist: { id: 'x', name: 'X' }, album: { id: 'y', name: 'Y' },
    popularity: 20, catalogRank: 9, language: 'Hindi', genre: 'Bollywood', audioUrl: './low.mp3', source: 'local'
  },
  {
    id: 'trending-high', title: 'High', artist: { id: 'x', name: 'X' }, album: { id: 'y', name: 'Y' },
    popularity: 90, catalogRank: 3, language: 'Punjabi', genre: 'Punjabi Pop', previewUrl: './high.mp3', source: 'catalog'
  },
  {
    id: 'outside-trending', title: 'Later', artist: { id: 'z', name: 'Z' }, album: { id: 'w', name: 'W' },
    popularity: 100, catalogRank: 30, language: 'Haryanvi', genre: 'Haryanvi Pop', source: 'catalog'
  },
  {
    id: 'legacy-shaped', title: '', artist: 'String Artist', album: 'String Album',
    popularity: 300, catalogRank: '7', language: '', genre: '', duration: 'unknown', source: ''
  }
];

let fetchCount = 0;
globalThis.fetch = async () => {
  fetchCount += 1;
  return { ok: true, json: async () => records };
};

const api = await import('../yr music project/js/api.js');

test('catalog records are normalized and defensive', async () => {
  const catalog = await api.getCatalogTracks();
  assert.equal(catalog.length, 4);
  const legacy = catalog.find(track => track.id === 'legacy-shaped');
  assert.equal(legacy.title, 'Untitled track');
  assert.deepEqual(legacy.artist, { id: 'string-artist', name: 'String Artist' });
  assert.deepEqual(legacy.album, { id: 'string-album', name: 'String Album', artwork: null });
  assert.equal(legacy.album.name, 'String Album');
  assert.equal(legacy.duration, null);
  assert.equal(legacy.popularity, 100);
  assert.equal(legacy.catalogRank, 7);
  assert.equal(legacy.language, 'Indian');
  assert.equal(legacy.genre, 'Indian music');
  assert.equal(legacy.source, 'catalog');
});

test('the catalog is fetched once and shared by every accessor', async () => {
  const before = fetchCount;
  await api.getCatalogTracks();
  await api.getHindiTracks();
  await api.getTrendingTracks();
  assert.equal(fetchCount, before);
  assert.ok(fetchCount >= 1);
});

test('trending uses editorial rank and popularity ordering', async () => {
  const trending = await api.getTrendingTracks();
  assert.deepEqual(trending.map(track => track.id), ['legacy-shaped', 'trending-high', 'trending-low']);
});

test('language and lookup helpers filter the normalized catalog', async () => {
  assert.deepEqual((await api.getHindiTracks()).map(track => track.id), ['trending-low']);
  assert.deepEqual((await api.getPunjabiTracks()).map(track => track.id), ['trending-high']);
  assert.deepEqual((await api.getHaryanviTracks()).map(track => track.id), ['outside-trending']);
  assert.deepEqual((await api.getArtist('x')).map(track => track.id), ['trending-low', 'trending-high']);
  assert.deepEqual((await api.getAlbum('y')).map(track => track.id), ['trending-low', 'trending-high']);
});

test('search covers title, artist, album, language, and genre', async () => {
  assert.deepEqual((await api.searchTracks('HIGH')).map(track => track.id), ['trending-high']);
  assert.deepEqual((await api.searchTracks('string artist')).map(track => track.id), ['legacy-shaped']);
  assert.deepEqual((await api.searchTracks('haryanvi')).map(track => track.id), ['outside-trending']);
  assert.deepEqual((await api.searchTracks('punjabi pop')).map(track => track.id), ['trending-high']);
  assert.deepEqual(await api.searchTracks('nothing matches this'), []);
});

test('a failed load can be retried after the cached promise is cleared', async () => {
  const isolated = await import('../yr music project/js/api.js?failure-case=1');
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) throw new Error('offline');
    return { ok: true, json: async () => records };
  };
  try {
    await assert.rejects(isolated.getCatalogTracks(), /offline/);
    const catalog = await isolated.getCatalogTracks();
    assert.equal(catalog.length, 4);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('the Supabase adapter stays inert without browser configuration', async () => {
  const supabase = await import('../yr music project/js/supabase.js');
  assert.equal(supabase.supabaseConfigured, false);
  assert.equal(await supabase.getPublishedSupabaseSongs(), null);
});