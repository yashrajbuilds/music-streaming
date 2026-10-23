import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeElement, installBrowserGlobals } from './helpers/fake-dom.js';

const { toast } = installBrowserGlobals();
const { state } = await import('../yr music project/js/state.js');
const ui = await import('../yr music project/js/ui.js');

const track = overrides => ({
  id: 'a', title: 'Song', artist: { id: 'artist', name: 'Artist' }, album: { id: 'album', name: 'Album', artwork: null },
  language: 'Hindi', genre: 'Pop', audioUrl: './a.mp3', previewUrl: null, ...overrides
});

test('renderResults escapes catalog values and disables unplayable rows', () => {
  const container = new FakeElement();
  state.liked = [];
  ui.renderResults([
    track({ id: 'evil', title: '<img src=x onerror="alert(1)">', artist: { id: 'a', name: '<script>bad</script>' } }),
    track({ id: 'meta', title: 'Metadata', audioUrl: null })
  ], container);

  assert.ok(container.innerHTML.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
  assert.ok(!container.innerHTML.includes('<img src=x'));
  assert.ok(container.innerHTML.includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert.ok(container.innerHTML.includes('disabled'));
  assert.ok(container.innerHTML.includes('Metadata only'));
  assert.ok(container.innerHTML.includes('Verified audio'));
});

test('renderResults shows an empty state for no matches', () => {
  const container = new FakeElement();
  ui.renderResults([], container);
  assert.ok(container.innerHTML.includes('No music found'));
});

test('renderCatalogHome renders sections and survives missing artist data', () => {
  const elements = {
    trendingTracks: new FakeElement(), hindiTracks: new FakeElement(), haryanviTracks: new FakeElement(),
    punjabiTracks: new FakeElement(), recentTracks: new FakeElement(), likedTracks: new FakeElement(),
    popularArtists: new FakeElement()
  };
  state.liked = [];
  ui.renderCatalogHome({
    catalog: [track({ id: 'one' }), { ...track({ id: 'two' }), artist: undefined }],
    trending: [track({ id: 'one' })], hindi: [], haryanvi: [], punjabi: [], recent: [], liked: []
  }, elements);
  assert.ok(elements.trendingTracks.innerHTML.includes('Song'));
  assert.ok(elements.hindiTracks.innerHTML.includes('No Hindi songs found.'));
  assert.ok(elements.popularArtists.innerHTML.includes('Artist'));
  assert.ok(!elements.popularArtists.innerHTML.includes('undefined'));
});

test('renderPlaylists excludes duplicates and gates playback on verified audio', () => {
  const container = new FakeElement();
  const playlist = { id: 'p1', name: 'Mix', trackIds: ['a'] };
  ui.renderPlaylists([playlist], [track({ id: 'a', audioUrl: null }), track({ id: 'b', title: 'Playable' })], container);

  assert.ok(container.innerHTML.includes('Mix'));
  assert.ok(container.innerHTML.includes('Playable'));
  assert.ok(!/<option value="a"/.test(container.innerHTML), 'already-added track must not be offered again');
  assert.match(container.innerHTML, /data-playlist-play="p1" disabled/);
  assert.ok(container.innerHTML.includes('No tracks left to add') === false);

  const playable = new FakeElement();
  ui.renderPlaylists([playlist], [track({ id: 'a', audioUrl: './a.mp3' })], playable);
  assert.match(playable.innerHTML, /data-playlist-play="p1" >/);
  assert.ok(playable.innerHTML.includes('No tracks left to add'));
});

test('renderPlaylists shows the empty library state', () => {
  const container = new FakeElement();
  ui.renderPlaylists([], [], container);
  assert.ok(container.innerHTML.includes('Your library is waiting.'));
});

test('showToast writes the message and marks the toast visible', () => {
  ui.showToast('Saved.');
  assert.equal(toast.textContent, 'Saved.');
  assert.equal(toast.classList.contains('show'), true);
});