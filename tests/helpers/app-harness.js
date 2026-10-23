// Boots app.js against a fake document so the wiring can be tested headlessly.
import { FakeAudio, FakeElement, installBrowserGlobals } from './fake-dom.js';

export const setupAppHarness = ({ records, liked = [] }) => {
  installBrowserGlobals();
  if (liked.length) localStorage.setItem('yr-liked', JSON.stringify(liked));
  globalThis.fetch = async () => ({ ok: true, json: async () => records });

  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, new FakeElement());
    return elements.get(id);
  };
  elements.set('audioElement', new FakeAudio());

  const listeners = {};
  const viewButtons = [new FakeElement()];
  viewButtons[0].dataset = { view: 'home' };
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
  const boot = async () => {
    await import('../../yr music project/js/app.js');
    await wait();
  };
  return { element, elements, listeners, click, wait, boot };
};