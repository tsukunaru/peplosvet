import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { newGame, exchange, craft, trade, buyWeapon, useItem, claimQuest, questReady, respawn, decodeSave, QUESTS, HOME, SIZE, capacity, weight } from '../src/model.js';
import { makeWorld, collision, move, POINTS, radiation } from '../src/world.js';

test('expedition economy: atomic transactions, campaign, unlocks, recovery, save round trip', () => {
  const s = newGame(), before = JSON.stringify(s);
  assert.equal(craft(s, 'ammo'), false);
  assert.equal(trade(s, 'ammo', true), false);
  assert.equal(claimQuest(s), false);
  assert.equal(JSON.stringify(s), before, 'failed actions must not consume resources');
  assert.ok(exchange(s, {}, { scrap: 7, wire: 3, cloth: 2 }));
  assert.ok(questReady(s)); assert.ok(claimQuest(s));
  assert.equal(s.quest, 1); assert.equal(s.rep.mechanics, 12); assert.equal(s.credits, 125);
  assert.ok(craft(s, 'ammo')); assert.equal(s.inv.ammo, 90);
  assert.equal(buyWeapon(s, 'shotgun'), false);
  s.kills = 5; assert.ok(claimQuest(s));
  assert.ok(buyWeapon(s, 'shotgun')); assert.equal(s.weapon, 'shotgun');
  assert.ok(exchange(s, {}, { scrap: 5, wire: 3 })); assert.ok(craft(s, 'scanner'));
  const afterScanner = JSON.stringify(s); assert.equal(craft(s, 'scanner'), false); assert.equal(JSON.stringify(s), afterScanner);
  s.flags.push('signal'); assert.ok(claimQuest(s));
  assert.ok(exchange(s, {}, { crystal: 4, biomass: 3 })); assert.ok(claimQuest(s));
  assert.equal(s.inv.crystal, 0); assert.equal(s.inv.biomass, 0);
  assert.ok(exchange(s, {}, { scrap: 6, wire: 4 })); assert.ok(craft(s, 'battery')); assert.ok(craft(s, 'battery'));
  assert.ok(exchange(s, { battery: 1 })); s.flags.push('relay1'); assert.equal(questReady(s), false);
  assert.ok(exchange(s, { battery: 1 })); s.flags.push('relay2'); assert.ok(claimQuest(s));
  s.flags.push('keeper'); assert.ok(claimQuest(s)); assert.equal(s.quest, QUESTS.length); assert.equal(claimQuest(s), false);
  assert.ok(buyWeapon(s, 'rifle'));
  s.hp = 10; assert.ok(useItem(s, 'medkit')); assert.equal(s.hp, 55);
  assert.equal(useItem(s, 'water'), false, 'do not waste full-stat consumables');
  s.inv.scrap = 40; const full = JSON.stringify(s); assert.equal(exchange(s, {}, { wire: 1 }), false); assert.equal(JSON.stringify(s), full);
  s.inv.scrap = 10; s.drops.push({ id: 'de5', x: 900, y: 1450, type: 'drop', contents: { biomass: 2 } });
  s.savedAt = Date.now(); assert.deepEqual(decodeSave(JSON.stringify(s)), s, 'uncollected drops and progress survive reload');
  respawn(s, true); assert.equal(s.inv.scrap, 7); assert.equal(s.hp, 100); assert.equal(s.day, 2); assert.deepEqual(s.drops, []);
  assert.equal(s.quest, QUESTS.length); assert.ok(s.weapons.includes('rifle')); assert.equal(s.x, HOME.x);
  assert.equal(decodeSave('{broken'), null); assert.equal(decodeSave('null'), null); assert.equal(decodeSave({ version: 99 }), null);
  const bad = decodeSave({ ...s, quest: 800.2, x: -5, inv: { scrap: -7, ammo: 1.8 }, weapons: ['<script>'], upgrades: ['imaginary'], drops: [null], rep: { mechanics: Infinity } });
  assert.equal(bad.quest, 6); assert.equal(bad.x, 20); assert.equal(bad.inv.scrap, 0); assert.equal(bad.inv.ammo, 1); assert.deepEqual(bad.weapons, ['pistol']);
  assert.equal(bad.rep.mechanics, 0); assert.deepEqual(bad.upgrades, []);
  assert.ok(weight(newGame()) < capacity(newGame()));
});

test('world routes reach every story point, tutorial crates, and enough radioactive resources', () => {
  const world = makeWorld(), step = 12, width = Math.floor(SIZE.w / step), height = Math.floor(SIZE.h / step);
  const passable = new Uint8Array(width * height), reached = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) passable[y * width + x] = !collision(world, x * step, y * step);
  const initial = Math.round(HOME.y / step) * width + Math.round(HOME.x / step), queue = [initial]; reached[initial] = 1;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const i = queue[cursor], x = i % width, y = Math.floor(i / width);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const n = ny * width + nx;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && passable[n] && !reached[n]) { reached[n] = 1; queue.push(n); }
    }
  }
  const reachable = (p, radius = 32) => queue.some(i => Math.hypot((i % width) * step - p.x, Math.floor(i / width) * step - p.y) < radius);
  for (const p of [...POINTS, ...world.loot.slice(0, 4), { x: 2350, y: 490, id: 'keeper' }]) assert.ok(reachable(p), `unreachable: ${p.id}`);
  const isotopeCount = world.loot.filter(l => l.type === 'crystal' && reachable(l)).reduce((n, l) => n + l.contents.crystal, 0);
  assert.ok(isotopeCount >= 10, `not enough reachable isotopes: ${isotopeCount}`);
  assert.ok(queue.length > width * height * .7, 'the open world must be connected');
  assert.ok(radiation({ x: 2100, y: 1730 }) > .9); assert.equal(radiation(HOME), 0);
  const p = { x: 432, y: 1425 }; move(world, p, 0, -20); assert.equal(p.y, 1425, 'buildings block movement');
  assert.deepEqual(makeWorld(1).loot, makeWorld(2).loot, 'daily rest consistently renews resource nodes');
});

test('real gameplay loop completes a first expedition and combat', () => {
  const run = spawnSync(process.execPath, ['tests/runtime.mjs'], { encoding: 'utf8', timeout: 20000 });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});

test('Yandex boundary: guest backup, cloud merge, lifecycle, and ad reward rules', async () => {
  const values = new Map(), callbacks = {}, calls = [];
  globalThis.location = { hostname: 'yandex-game.example' };
  globalThis.localStorage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) };
  const local = newGame(); local.savedAt = 1000; local.credits = 123;
  values.set('peplosvet-save-v1', '{corrupt'); values.set('peplosvet-save-v1-backup', JSON.stringify(local));
  const cloud = newGame(); cloud.savedAt = 900;
  const sdk = { environment: { i18n: { lang: 'ru' } }, on: (id, cb) => { callbacks[id] = cb; }, getPlayer: async () => ({ getData: async () => ({ save: cloud }), setData: async data => calls.push(['save', data.save]) }), features: { LoadingAPI: { ready: () => calls.push('ready') }, GameplayAPI: { start: () => calls.push('start'), stop: () => calls.push('stop') } }, adv: { showRewardedVideo: ({ callbacks: cb }) => { callbacks.ad = cb; } } };
  globalThis.window = { YaGames: { init: async () => sdk } };
  const { platform } = await import('../src/platform.js');
  let paused = false;
  const loaded = await platform.init(v => { paused = v; }); assert.equal(loaded.credits, 123); assert.equal(platform.lang, 0);
  platform.ready(); platform.gameplay(true); platform.gameplay(true); platform.gameplay(false);
  assert.deepEqual(calls, ['ready', 'start', 'stop'], 'lifecycle transitions are not duplicated');
  callbacks.game_api_pause(); assert.equal(paused, true); callbacks.game_api_resume(); assert.equal(paused, false);
  let result = platform.reward(v => { paused = v; }); assert.equal(paused, true); callbacks.ad.onClose(); assert.equal(await result, false); assert.equal(paused, false);
  result = platform.reward(v => { paused = v; }); callbacks.ad.onRewarded(); callbacks.ad.onClose(); assert.equal(await result, true);
  result = platform.reward(v => { paused = v; }); callbacks.ad.onError(); assert.equal(await result, false);
  platform.save(loaded); await Promise.resolve(); assert.ok(decodeSave(values.get('peplosvet-save-v1'))); assert.equal(calls.at(-1)[0], 'save');
  cloud.savedAt = loaded.savedAt + 1000; cloud.credits = 900; assert.equal((await platform.load()).credits, 900);
});
