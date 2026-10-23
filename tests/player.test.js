import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerElements, installBrowserGlobals } from './helpers/fake-dom.js';

const { toast } = installBrowserGlobals({ volume: 0.35 });
const { state } = await import('../yr music project/js/state.js');
const { createPlayer } = await import('../yr music project/js/player.js');

const track = (id, playable = true, extra = {}) => ({
  id,
  title: `Title ${id}`,
  artist: { id: 'artist', name: 'Artist' },
  album: { id: 'album', name: 'Album', artwork: null },
  audioUrl: playable ? `./${id}.mp3` : null,
  previewUrl: null,
  language: 'Hindi',
  genre: 'Pop',
  source: 'local',
  ...extra
});

const setup = (tracks = [], index = 0) => {
  const elements = createPlayerElements();
  const player = createPlayer(elements);
  state.queue = [...tracks];
  state.queueIndex = tracks.length ? index : -1;
  state.current = null;
  state.shuffle = false;
  state.repeat = 0;
  state.liked = [];
  return { elements, player };
};

beforeEach(() => { toast.textContent = ''; });

test('stored volume is applied to the audio element and the slider', () => {
  const { elements } = setup();
  assert.equal(elements.audio.volume, 0.35);
  assert.equal(elements.volumeInput.value, '0.35');
});

test('setQueue clamps out-of-range indexes', () => {
  const { player } = setup();
  assert.equal(player.setQueue([track('a'), track('b')], 99), 2);
  assert.equal(state.queueIndex, 1);
  assert.equal(player.setQueue([track('a'), track('b')], -5), 2);
  assert.equal(state.queueIndex, 0);
  assert.equal(player.setQueue([]), 0);
  assert.equal(state.queueIndex, -1);
});

test('setCurrent refuses metadata-only tracks without touching the audio source', () => {
  const { elements, player } = setup();
  const result = player.setCurrent(track('meta', false));
  assert.equal(result, false);
  assert.equal(state.current.id, 'meta');
  assert.equal(elements.audio.src, '');
  assert.equal(elements.playButton.textContent, '▶');
  assert.match(toast.textContent, /metadata only/);
});

test('setCurrent loads and autoplays verified audio', () => {
  const { elements, player } = setup();
  assert.equal(player.setCurrent(track('a')), true);
  assert.equal(elements.audio.src, './a.mp3');
  assert.equal(elements.audio.paused, false);
  assert.equal(elements.nowTitle.textContent, 'Title a');
  assert.equal(elements.nowArtist.textContent, 'Artist');
  assert.equal(elements.playButton.textContent, 'Ⅱ');
});

test('next skips metadata-only tracks', () => {
  const { elements, player } = setup([track('a'), track('meta', false), track('c')], 0);
  player.setCurrent(state.queue[0]);
  player.next();
  assert.equal(state.queueIndex, 2);
  assert.equal(state.current.id, 'c');
  assert.equal(elements.audio.src, './c.mp3');
});

test('manual next wraps from the last track', () => {
  const { player } = setup([track('a'), track('b')], 1);
  player.next();
  assert.equal(state.queueIndex, 0);
  assert.equal(state.current.id, 'a');
});

test('natural end stops at the last track when repeat is off', () => {
  const { elements, player } = setup([track('a'), track('b')], 1);
  player.setCurrent(state.queue[1]);
  elements.audio.currentTime = 120;
  elements.audio.finish();
  assert.equal(state.current.id, 'b');
  assert.equal(elements.audio.paused, true);
  assert.equal(elements.audio.currentTime, 0);
  assert.equal(elements.playButton.textContent, '▶');
  assert.equal(elements.currentTime.textContent, '0:00');
});

test('repeat all wraps to the first playable track on natural end', () => {
  const { player } = setup([track('a'), track('b')], 1);
  state.repeat = 1;
  player.setCurrent(state.queue[1]);
  player.next(true);
  assert.equal(state.queueIndex, 0);
  assert.equal(state.current.id, 'a');
});

test('repeat one replays the same track on natural end', () => {
  const { elements, player } = setup([track('a')], 0);
  state.repeat = 2;
  player.setCurrent(state.queue[0]);
  const playCalls = elements.audio.playCalls;
  elements.audio.finish();
  assert.equal(state.current.id, 'a');
  assert.equal(elements.audio.paused, false);
  assert.ok(elements.audio.playCalls > playCalls);
});

test('shuffle never picks the current track', () => {
  const { player } = setup([track('a'), track('b'), track('meta', false)], 0);
  state.shuffle = true;
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    player.setCurrent(state.queue[0]);
    player.next();
    assert.equal(state.current.id, 'b');
    assert.equal(state.queueIndex, 1);
  } finally {
    Math.random = originalRandom;
  }
});

test('shuffle keeps playing past the last index when repeat is off', () => {
  const { player } = setup([track('a'), track('b')], 1);
  state.shuffle = true;
  player.setCurrent(state.queue[1]);
  player.next(true);
  assert.equal(state.current.id, 'a');
  assert.equal(state.queueIndex, 0);
});

test('previous restarts the current track when playback has progressed', () => {
  const { elements, player } = setup([track('a'), track('b')], 1);
  player.setCurrent(state.queue[1]);
  elements.audio.currentTime = 40;
  player.previous();
  assert.equal(state.current.id, 'b');
  assert.equal(elements.audio.currentTime, 0);
});

test('previous wraps backwards to the last playable track', () => {
  const { player } = setup([track('a'), track('meta', false), track('c')], 0);
  player.setCurrent(state.queue[0]);
  player.previous();
  assert.equal(state.current.id, 'c');
  assert.equal(state.queueIndex, 2);
});

test('next and previous explain an empty queue', () => {
  const { player } = setup([]);
  player.next();
  assert.match(toast.textContent, /queue is empty/);
  player.previous();
  assert.match(toast.textContent, /queue is empty/);
});

test('a queue with no verified audio reports instead of pretending to play', () => {
  const { elements, player } = setup([track('meta-1', false), track('meta-2', false)], 0);
  player.setCurrent(state.queue[0], false);
  player.next();
  assert.match(toast.textContent, /No playable tracks/);
  assert.equal(elements.audio.src, '');
});

test('shuffle and repeat buttons expose their state to assistive tech', () => {
  const { elements } = setup([], 0);
  elements.shuffleButton.click();
  assert.equal(elements.shuffleButton.getAttribute('aria-pressed'), 'true');
  assert.equal(state.shuffle, true);

  elements.repeatButton.click();
  assert.equal(elements.repeatButton.getAttribute('aria-pressed'), 'true');
  assert.equal(elements.repeatButton.textContent, '↻');
  elements.repeatButton.click();
  elements.repeatButton.click();
  assert.equal(elements.repeatButton.textContent, '↻');
  assert.equal(state.repeat, 0);
});