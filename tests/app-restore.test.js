import test from 'node:test';
import assert from 'node:assert/strict';
import { setupAppHarness } from './helpers/app-harness.js';

const records = [
  { id: 'local-a', title: 'Local A', artist: { id: 'artist-a', name: 'Artist A' }, album: { id: 'album', name: 'Album' }, language: 'Hindi', genre: 'Devotional', popularity: 0, catalogRank: 1, audioUrl: './a.mp3', source: 'local' }
];

const staleLiked = [{
  id: 'local-a', title: 'Stale title', artist: { id: 'artist-a', name: 'Artist A' }, album: { id: 'album', name: 'Album' },
  audioUrl: 'https://expired.example/a.mp3', language: 'Hindi', genre: 'Devotional', source: 'local'
}];

const { element } = setupAppHarness({ records, liked: staleLiked });
await import('../yr music project/js/app.js');
const { state } = await import('../yr music project/js/state.js');
await new Promise(resolve => setTimeout(resolve, 30));

test('saved likes are refreshed from the loaded catalog', () => {
  assert.equal(state.liked.length, 1);
  assert.equal(state.liked[0].audioUrl, './a.mp3');
  assert.equal(state.liked[0].title, 'Local A');
  assert.ok(element('likedTracks').innerHTML.includes('Local A'));
});