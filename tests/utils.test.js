import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, escapeHtml, formatTime, isPlayable, matchesFilter, slugify, uniqueById } from '../yr music project/js/utils.js';

test('escapeHtml neutralises markup in catalog values', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escapeHtml("Tom & Jerry's"), 'Tom &amp; Jerry&#39;s');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(42), '42');
});

test('formatTime renders playable durations and rejects junk', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(9.9), '0:09');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(3600), '60:00');
  assert.equal(formatTime(Number.NaN), '0:00');
  assert.equal(formatTime(Infinity), '0:00');
  assert.equal(formatTime(-4), '0:00');
  assert.equal(formatTime(undefined), '0:00');
});

test('clamp keeps numbers inside the allowed range', () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(clamp('0.4', 0, 1), 0.4);
  assert.equal(clamp('nope', 0.2, 1), 0.2);
});

test('slugify produces stable catalog ids', () => {
  assert.equal(slugify('  Jai Shree Ram!  '), 'jai-shree-ram');
  assert.equal(slugify('52 Gaj Ka Daman'), '52-gaj-ka-daman');
  assert.equal(slugify(''), '');
  assert.equal(slugify(undefined), '');
  assert.equal(slugify('x'.repeat(300)).length, 120);
});

test('isPlayable only accepts verified audio sources', () => {
  assert.equal(isPlayable({ audioUrl: './song.mp3' }), true);
  assert.equal(isPlayable({ previewUrl: './preview.mp3' }), true);
  assert.equal(isPlayable({ audioUrl: null, previewUrl: null }), false);
  assert.equal(isPlayable(null), false);
});

test('matchesFilter handles editorial trending and languages', () => {
  const hindi = { language: 'Hindi', catalogRank: 3 };
  const punjabi = { language: 'Punjabi', catalogRank: 30 };
  assert.equal(matchesFilter(hindi, 'All'), true);
  assert.equal(matchesFilter(hindi, ''), true);
  assert.equal(matchesFilter(hindi, 'Trending'), true);
  assert.equal(matchesFilter(punjabi, 'Trending'), false);
  assert.equal(matchesFilter(punjabi, 'Punjabi'), true);
  assert.equal(matchesFilter(punjabi, 'Hindi'), false);
});

test('uniqueById removes duplicates while preserving order', () => {
  const result = uniqueById([{ id: 'a', title: 'first' }, { id: 'b' }, { id: 'a', title: 'second' }, null]);
  assert.deepEqual(result.map(item => item.id), ['a', 'b']);
  assert.equal(result[0].title, 'second');
});