import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeAudio, FakeElement, installBrowserGlobals } from './helpers/fake-dom.js';

installBrowserGlobals();

const records = [
  { id: 'local-a', title: 'Local A', artist: { id: 'artist-a', name: 'Artist A' }, album: { id: 'album', name: 'Album' }, language: 'Hindi', genre: 'Devotional', popularity: 0, catalogRank: 1, audioUrl: './a.mp3', source: 'local' },
  { id: 'local-b', title: 'Local B', artist: { id: 'artist-b', name: 'Artist B' }, album: { id: 'album', name: 'Album' }, language: 'Punjabi', genre: 'Punjabi Pop', popularity: 0, catalogRank: 2, audioUrl: './b.mp3', source: 'local' },
  { id: 'meta-c', title: 'Meta C', artist: { id: 'artist-c', name: 'Artist C' }, album: { id: 'album', name: 'Album' }, language: 'Haryanvi', genre: 'Haryanvi Pop', popularity: 0, catalogRank: 20, audioUrl: null, source: 'catalog' }
];
globalThis.fetch = async () => ({ ok: true, json: async () => records });

const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, new FakeElement());
  return elements.get(id);
};
elements.set('audioElement', new FakeAudio());

const listeners = {};
const viewButtons = [{ dataset: { view: 'home' }, classList: new FakeElement().classList }];
globalThis.document = {
  getElementById: element,
  querySelectorAll: selector => selector === '[data-view]' ? viewButtons : [],
  querySelector: () => null,
  addEventListener: (type, handler) => { (listeners[type] ||= []).push(handler); },
  dispatchEvent: () => true
};
globalThis.CSS = { escape: value => String(value) };
globalThis.window.prompt = () => 'Renamed';
globalThis.window.confirm = () => true;
globalThis.window.scrollTo = () => {};

const wait = (ms = 30) => new Promise(resolve => setTimeout(resolve, ms));
const click = matches => {
  const target = { closest: selector => matches[selector] || null };
  for (const handler of listeners.click || []) handler({ target, preventDefault() {} });
};

await import('../yr music project/js/app.js');
const { state } = await import('../yr music project/js/state.js');
await wait();

test('booting renders the greeting, catalog sections, and playlist library', () => {
  assert.match(element('greeting').textContent, /^Good (morning|afternoon|evening|night)$/);
  assert.ok(element('trendingTracks').innerHTML.includes('Local A'));
  assert.ok(element('hindiTracks').innerHTML.includes('Local A'));
  assert.ok(element('punjabiTracks').innerHTML.includes('Local B'));
  assert.ok(element('haryanviTracks').innerHTML.includes('Meta C'));
  assert.ok(element('popularArtists').innerHTML.includes('Artist A'));
  assert.ok(element('playlistList').innerHTML.includes('Your library is waiting.'));
});

test('clicking a track wires the catalog queue and starts playback', () => {
  click({ '[data-play]': { disabled: false, dataset: { play: 'local-a' } } });
  assert.equal(state.current.id, 'local-a');
  assert.deepEqual(state.queue.map(track => track.id), ['local-a', 'local-b', 'meta-c']);
  assert.equal(element('audioElement').src, './a.mp3');
  assert.equal(element('nowTitle').textContent, 'Local A');
});

test('liking the current track updates the library and home section', () => {
  element('likeButton').click();
  assert.deepEqual(state.liked.map(track => track.id), ['local-a']);
  assert.ok(element('likedTracks').innerHTML.includes('Local A'));
  assert.equal(element('likeButton').getAttribute('aria-pressed'), 'true');
  element('likeButton').click();
  assert.equal(state.liked.length, 0);
});

test('creating a playlist persists it and blocks duplicate names', () => {
  element('playlistName').value = 'Road Trip';
  element('playlistForm').dispatch('submit');
  assert.equal(state.playlists.length, 1);
  assert.equal(JSON.parse(localStorage.getItem('yr-playlists'))[0].name, 'Road Trip');
  assert.ok(element('playlistList').innerHTML.includes('Road Trip'));
  assert.equal(element('playlistCount').textContent, '1 playlist');

  element('playlistName').value = 'road trip';
  element('playlistForm').dispatch('submit');
  assert.equal(state.playlists.length, 1);
  assert.match(element('toast').textContent, /already exists/);
});

test('view switches relabel the shared results panel and hide catalog filters', () => {
  click({ '[data-view]': { dataset: { view: 'liked' } } });
  assert.equal(element('searchTitle').textContent, 'Liked songs');
  assert.equal(element('searchEyebrow').textContent, 'Your library');
  assert.equal(element('filterRow').classList.contains('hidden'), true);
  assert.equal(element('homeView').classList.contains('hidden'), true);

  click({ '[data-view]': { dataset: { view: 'search' } } });
  assert.equal(element('searchTitle').textContent, 'Search results');
  assert.equal(element('filterRow').classList.contains('hidden'), false);
});

test('playlist playback starts at the first verified track', () => {
  state.playlists[0].trackIds = ['meta-c', 'local-b'];
  click({ '[data-playlist-play]': { disabled: false, dataset: { playlistPlay: 'playlist-missing' } } });
  assert.match(element('toast').textContent, /verified audio|no tracks/i);

  const playlist = state.playlists[0];
  click({ '[data-playlist-play]': { disabled: false, dataset: { playlistPlay: playlist.id } } });
  assert.equal(state.current.id, 'local-b');
  assert.deepEqual(state.queue.map(track => track.id), ['meta-c', 'local-b']);
});