// Runs the real game loop with a minimal DOM/canvas stand-in; no browser automation or test dependency.
import assert from 'node:assert/strict';
const elements = new Map(), storage = new Map(), events = new Map();
const context = new Proxy({}, { get: (o, k) => o[k] || (k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}), set: (o, k, v) => (o[k] = v, true) });
function element(id = '') {
  return { id, style: {}, children: [], dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, innerHTML: '', open: false,
    firstElementChild: { style: {}, remove() {} }, get firstChild() { return this.children[0]; }, append(c) { this.children.push(c); c.remove = () => { this.children = this.children.filter(n => n !== c); }; }, remove() {},
    addEventListener(type, handler) { events.set(id + ':' + type, handler); }, getContext: () => context, querySelectorAll: () => [],
    showModal() { this.open = true; }, close() { this.open = false; }, focus() {}, setPointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
  };
}
globalThis.document = { documentElement: {}, body: element('body'), hidden: false, head: element('head'), createElement: tag => element(tag), getElementById: id => { if (!elements.has(id)) elements.set(id, element(id)); return elements.get(id); }, addEventListener: (type, handler) => events.set('document:' + type, handler) };
globalThis.window = { addEventListener: (type, handler) => events.set(type, handler) };
globalThis.location = { hostname: 'localhost' }; globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
Object.defineProperty(globalThis, 'navigator', { value: { language: 'ru' }, configurable: true });
globalThis.matchMedia = () => ({ matches: false }); globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
let frame; globalThis.requestAnimationFrame = f => { frame = f; }; globalThis.setInterval = () => {}; globalThis.setTimeout = () => {};
await import('../src/game.js'); await new Promise(setImmediate);
let now = 0;
const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) { now += 1000 / 60; frame(now); } };
const key = (code, down) => events.get(down ? 'keydown' : 'keyup')({ code, repeat: false, preventDefault() {} });
const walk = (code, seconds) => { key(code, true); tick(seconds); key(code, false); };
const action = id => events.get('modal-body:click')({ target: { closest: () => ({ dataset: { action: id }, disabled: false }) } });
const snapshot = () => { events.get('pagehide')(); return JSON.parse(storage.get('peplosvet-save-v1')); };
action('start'); tick(.1);
assert.equal(snapshot().x, 432);
walk('KeyD', 3.2); walk('KeyW', .3); key('KeyE', true); key('KeyE', false); tick(.5);
assert.equal(snapshot().inv.scrap, 3, 'first crate can be collected using normal movement and E');
walk('KeyD', 1.55); walk('KeyW', .16); key('KeyE', true); key('KeyE', false); tick(.5);
assert.equal(snapshot().inv.scrap, 7, 'second tutorial crate collected');
walk('KeyA', 4.6); key('KeyE', true); key('KeyE', false); tick(.1);
assert.equal(elements.get('modal').open, true, 'returning to camp opens shelter');
action('tab:quests'); action('claim'); assert.equal(snapshot().quest, 1);
action('tab:craft'); action('craft:ammo'); assert.equal(snapshot().inv.ammo, 90);
const paused = snapshot(); walk('KeyD', 2); assert.equal(snapshot().x, paused.x); assert.equal(snapshot().time, paused.time, 'menus pause simulation');
action('close'); walk('KeyD', 5.8); walk('KeyW', .5); tick(.5);
key('KeyP', true); key('KeyP', false); action('auto'); action('close');
tick(15);
assert.ok(snapshot().kills > 0, 'real combat must kill an approaching mutant');
assert.ok(snapshot().inv.ammo < 90); assert.ok(snapshot().drops.length > 0, 'killed enemy leaves persistent loot');
events.get('blur')(); const hidden = snapshot(); tick(2); assert.equal(snapshot().time, hidden.time); events.get('focus')();
tick(.2); assert.ok(snapshot().time > hidden.time);
console.log('Runtime OK: move → loot → return → claim → craft → fight; menus and blur pause correctly.');
