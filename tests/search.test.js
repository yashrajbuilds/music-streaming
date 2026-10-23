import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeElement, installBrowserGlobals } from './helpers/fake-dom.js';

installBrowserGlobals();
const { createSearch } = await import('../yr music project/js/search.js');

const catalog = [
  { id: 'a', title: 'Alpha', artist: { id: 'x', name: 'X' }, album: { id: 'm', name: 'M' }, language: 'Hindi', genre: 'Bollywood', catalogRank: 1 },
  { id: 'b', title: 'Beta', artist: { id: 'y', name: 'Y' }, album: { id: 'm', name: 'M' }, language: 'Punjabi', genre: 'Punjabi Pop', catalogRank: 20 },
  { id: 'c', title: 'Gamma', artist: { id: 'z', name: 'Z' }, album: { id: 'm', name: 'M' }, language: 'Haryanvi', genre: 'Haryanvi Pop', catalogRank: 30 }
];

const wait = (ms = 10) => new Promise(resolve => setTimeout(resolve, ms));

const setup = ({ search } = {}) => {
  const input = new FakeElement();
  const results = new FakeElement();
  const status = new FakeElement();
  let opened = 0;
  const controller = createSearch({
    input, results, status, openSearch: () => { opened += 1; },
    catalog, delay: 0,
    search: search || (async query => catalog.filter(track => track.title.toLowerCase().includes(query.toLowerCase())))
  });
  return { input, results, status, controller, opened: () => opened };
};

test('setCatalog renders the full catalog and reports the count', () => {
  const { results, status, controller } = setup();
  controller.setCatalog(catalog);
  assert.equal(status.textContent, '3 catalog tracks');
  assert.ok(results.innerHTML.includes('Alpha'));
  assert.ok(results.innerHTML.includes('Gamma'));
});

test('typing searches, opens the search view, and reports results', async () => {
  const { input, results, status, opened } = setup();
  input.value = 'alp';
  input.dispatch('input');
  await wait();
  assert.equal(opened(), 1);
  assert.equal(status.textContent, '1 result');
  assert.ok(results.innerHTML.includes('Alpha'));
  assert.ok(!results.innerHTML.includes('Beta'));
});

test('changing a filter re-runs the active query', async () => {
  const { input, results, status, controller } = setup({ search: async () => catalog });
  input.value = 'a';
  input.dispatch('input');
  await wait();
  assert.equal(status.textContent, '3 results');

  controller.setFilter('Punjabi');
  await wait();
  assert.equal(status.textContent, '1 result');
  assert.ok(results.innerHTML.includes('Beta'));
  assert.ok(!results.innerHTML.includes('Alpha'));
});

test('changing a filter without a query filters the loaded catalog', async () => {
  const { results, status, controller } = setup();
  controller.setCatalog(catalog);
  controller.setFilter('Trending');
  await wait();
  assert.equal(status.textContent, '1 Trending tracks');
  assert.ok(results.innerHTML.includes('Alpha'));
  assert.ok(!results.innerHTML.includes('Beta'));
});

test('empty queries clear the search and keep filters applied', async () => {
  const { input, results, status, controller } = setup();
  controller.setCatalog(catalog);
  controller.setFilter('Haryanvi');
  await wait();
  assert.equal(status.textContent, '1 Haryanvi tracks');

  input.value = '   ';
  input.dispatch('input');
  await wait();
  assert.equal(status.textContent, '1 Haryanvi tracks');
  assert.ok(results.innerHTML.includes('Gamma'));
  assert.ok(!results.innerHTML.includes('Alpha'));
});

test('rapid input keeps only the latest result', async () => {
  const { input, results, status } = setup({ search: async query => catalog.filter(track => track.title.startsWith(query)) });
  input.value = 'Al';
  input.dispatch('input');
  input.value = 'Ga';
  input.dispatch('input');
  await wait();
  assert.equal(status.textContent, '1 result');
  assert.ok(results.innerHTML.includes('Gamma'));
  assert.ok(!results.innerHTML.includes('Alpha'));
});

test('search failures surface a recoverable message', async () => {
  const { input, results, status } = setup({ search: async () => { throw new Error('offline'); } });
  input.value = 'alpha';
  input.dispatch('input');
  await wait();
  assert.equal(status.textContent, 'Search unavailable');
  assert.ok(results.innerHTML.includes('Music catalog unavailable'));
});