import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserGlobals } from './helpers/fake-dom.js';

const { store } = installBrowserGlobals();
const { storage, rememberTrack } = await import('../yr music project/js/storage.js');
const { state, isLiked, setLiked, setRecent, savePlaylists } = await import('../yr music project/js/state.js');

const track = id => ({ id, title: `Title ${id}`, artist: { id: 'a', name: 'Artist' }, album: { id: 'b', name: 'Album' } });

test('storage getters fall back when persisted JSON is corrupt', () => {
  localStorage.setItem('yr-liked', '{not json');
  localStorage.setItem('yr-playlists', '"a string"');
  assert.deepEqual(storage.liked, []);
  assert.deepEqual(storage.playlists, []);
});

test('volume is clamped and survives invalid input', () => {
  storage.volume = 5;
  assert.equal(storage.volume, 1);
  storage.volume = -2;
  assert.equal(storage.volume, 0);
  storage.volume = 'loud';
  assert.equal(storage.volume, 0.8);
  storage.volume = 0.42;
  assert.equal(storage.volume, 0.42);
  assert.equal(JSON.parse(store.get('yr-volume')), 0.42);
});

test('rememberTrack deduplicates and caps recent history', () => {
  localStorage.removeItem('yr-recent');
  for (let index = 0; index < 15; index += 1) rememberTrack(track(`t${index}`));
  assert.equal(storage.recent.length, 12);
  assert.equal(storage.recent[0].id, 't14');
  const replayed = rememberTrack(track('t5'));
  assert.equal(replayed.length, 12);
  assert.equal(replayed[0].id, 't5');
  assert.equal(replayed.filter(item => item.id === 't5').length, 1);
  assert.equal(storage.recent[0].id, 't5');
});

test('setLiked toggles a track and persists the result', () => {
  localStorage.removeItem('yr-liked');
  state.liked = [];
  setLiked(track('a'));
  assert.equal(isLiked(track('a')), true);
  assert.deepEqual(storage.liked.map(item => item.id), ['a']);

  setLiked(track('b'));
  assert.deepEqual(state.liked.map(item => item.id), ['b', 'a']);

  setLiked(track('a'));
  assert.equal(isLiked(track('a')), false);
  assert.deepEqual(storage.liked.map(item => item.id), ['b']);
  assert.equal(isLiked(null), false);
});

test('setRecent and savePlaylists keep persisted state in sync', () => {
  setRecent([track('recent-1')]);
  assert.equal(state.recent[0].id, 'recent-1');

  state.playlists = [{ id: 'playlist-1', name: 'Commute', trackIds: ['a'] }];
  savePlaylists();
  assert.deepEqual(storage.playlists, [{ id: 'playlist-1', name: 'Commute', trackIds: ['a'] }]);
});

test('malformed playlists are normalized when the state module boots', async () => {
  localStorage.setItem('yr-playlists', JSON.stringify([
    { id: 'p1', name: '  Keep  ', trackIds: ['a', 5, null] },
    { id: '', name: 'No id', trackIds: [] },
    { id: 'p2', name: '   ' },
    null
  ]));
  const fresh = await import('../yr music project/js/state.js?playlist-normalize');
  assert.deepEqual(fresh.state.playlists, [{ id: 'p1', name: 'Keep', trackIds: ['a'] }]);
});