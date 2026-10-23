import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeElement, installBrowserGlobals } from './helpers/fake-dom.js';

installBrowserGlobals();

const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, new FakeElement());
  return elements.get(id);
};
globalThis.document = {
  getElementById: element,
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener() {},
  createElement: () => new FakeElement()
};
globalThis.CSS = { escape: value => String(value) };
globalThis.window.scrollTo = () => {};

// admin.html ships the owner console hidden until authentication succeeds.
element('adminPanel').classList.add('hidden');
await import('../yr music project/js/admin.js');

test('the admin console explains a missing Supabase configuration instead of failing silently', () => {
  assert.match(element('loginStatus').textContent, /Supabase is not configured/);
});

test('the admin login form refuses to sign in until configuration is supplied', () => {
  element('loginEmail').value = 'owner@example.com';
  element('loginPassword').value = 'secret';
  element('loginForm').dispatch('submit');
  assert.match(element('loginStatus').textContent, /Supabase is not configured/);
});

test('admin controls are wired even before authentication', () => {
  for (const id of ['loginForm', 'logoutButton', 'newSongButton', 'cancelSongButton', 'songSearch', 'languageFilter', 'genreFilter', 'statusFilter', 'songList', 'songPagination', 'songAudio', 'songArtwork', 'refreshAnalytics', 'exportAnalytics', 'songForm']) {
    assert.ok((element(id).listeners.get('click') || element(id).listeners.get('submit') || element(id).listeners.get('input') || element(id).listeners.get('change') || []).length > 0, `${id} has no handler`);
  }
});