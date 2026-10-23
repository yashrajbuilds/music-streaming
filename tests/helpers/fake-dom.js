// Minimal browser stand-ins so the ES modules can run under `node --test`
// without adding a DOM dependency.

export class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.filter(Boolean).forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const shouldAdd = force === undefined ? !this.values.has(name) : Boolean(force);
    if (shouldAdd) this.values.add(name);
    else this.values.delete(name);
    return shouldAdd;
  }
}

export class FakeElement {
  constructor() {
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.attributes = {};
    this.classList = new FakeClassList();
    this.listeners = new Map();
    this.focused = false;
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }
  removeEventListener(type, handler) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(entry => entry !== handler));
  }
  dispatch(type, event = {}) {
    for (const handler of [...(this.listeners.get(type) || [])]) {
      handler({ target: this, type, preventDefault() {}, ...event });
    }
  }
  click() { if (!this.disabled) this.dispatch('click'); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  focus() { this.focused = true; }
  closest() { return null; }
}

export class FakeAudio extends FakeElement {
  constructor() {
    super();
    this.src = '';
    this.volume = 1;
    this.muted = false;
    this.currentTime = 0;
    this.duration = 0;
    this.paused = true;
    this.ended = false;
    this.readyState = 4;
    this.playCalls = 0;
  }
  load() {
    this.ended = false;
    this.readyState = 4;
    if (this.src) this.dispatch('loadedmetadata');
  }
  play() {
    this.playCalls += 1;
    this.paused = false;
    this.ended = false;
    this.dispatch('play');
    return Promise.resolve();
  }
  pause() {
    const wasPlaying = !this.paused;
    this.paused = true;
    if (wasPlaying) this.dispatch('pause');
  }
  finish() {
    this.paused = true;
    this.ended = true;
    this.dispatch('ended');
  }
}

export const installBrowserGlobals = ({ volume } = {}) => {
  const store = new Map();
  if (volume !== undefined) store.set('yr-volume', JSON.stringify(volume));
  globalThis.localStorage = {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
    clear: () => store.clear()
  };

  const byId = new Map();
  const getElementById = id => {
    if (!byId.has(id)) byId.set(id, new FakeElement());
    return byId.get(id);
  };
  const toast = getElementById('toast');
  globalThis.document = {
    getElementById,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener() {},
    dispatchEvent() {}
  };
  globalThis.HTMLMediaElement = { HAVE_FUTURE_DATA: 3 };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  return { document: globalThis.document, toast, store };
};

export const createPlayerElements = () => ({
  audio: new FakeAudio(),
  nowArtwork: new FakeElement(),
  nowTitle: new FakeElement(),
  nowArtist: new FakeElement(),
  playButton: new FakeElement(),
  nextButton: new FakeElement(),
  previousButton: new FakeElement(),
  shuffleButton: new FakeElement(),
  repeatButton: new FakeElement(),
  seekInput: new FakeElement(),
  volumeInput: new FakeElement(),
  muteButton: new FakeElement(),
  currentTime: new FakeElement(),
  duration: new FakeElement(),
  likeButton: new FakeElement()
});