import { HOME, SIZE } from './model.js';
export const POINTS = [
  { id: 'home', x: 432, y: 1512, name: ['Кордон «Тлеющий»', 'Ember Cordon'] },
  { id: 'signal', x: 1280, y: 592, name: ['Старая радиовышка', 'Old radio tower'] },
  { id: 'relay1', x: 1456, y: 1168, name: ['Реле Свалки', 'Scrapyard relay'] },
  { id: 'relay2', x: 2224, y: 720, name: ['Реле станции', 'Station relay'] },
];
export const ZONES = [
  { name: ['Последний кордон', 'The Last Cordon'], sub: ['БЕЗОПАСНАЯ ЗОНА', 'SAFE ZONE'], x: 432, y: 1512 },
  { name: ['Ржавые дворы', 'Rust Yards'], sub: ['СЛЕДЫ СТАРОГО МИРА', 'TRACES OF THE OLD WORLD'], x: 900, y: 1450 },
  { name: ['Глухолесье', 'Hollow Woods'], sub: ['НЕ СХОДИ С ТРОПЫ', 'STAY ON THE TRAIL'], x: 780, y: 560 },
  { name: ['Свалка', 'The Scrapyard'], sub: ['МЕТАЛЛ ПОМНИТ ВСЁ', 'METAL REMEMBERS'], x: 1470, y: 1080 },
  { name: ['Тихая топь', 'The Quiet Mire'], sub: ['ПОВЫШЕННАЯ РАДИАЦИЯ', 'HIGH RADIATION'], x: 2090, y: 1740 },
  { name: ['Станция «Ноль»', 'Station Zero'], sub: ['ЗДЕСЬ ВСЁ НАЧАЛОСЬ', 'WHERE IT ALL BEGAN'], x: 2300, y: 500 },
];
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const safe = p => Math.hypot(p.x - HOME.x, p.y - HOME.y) < 210;
export const radiation = p => Math.max(0, 1 - Math.hypot((p.x - 2100) / 1.15, p.y - 1730) / 360);
export function zoneAt(p) {
  if (safe(p)) return 0;
  if (p.x > 1850 && p.y > 1320) return 4;
  if (p.x > 1860 && p.y < 930) return 5;
  if (p.y < 950) return 2;
  if (p.x > 1190) return 3;
  return 1;
}
export function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let a = Math.imul(seed ^ seed >>> 15, 1 | seed); a ^= a + Math.imul(a ^ a >>> 7, 61 | a); return ((a ^ a >>> 14) >>> 0) / 4294967296; };
}
const road = (x, y) => Math.abs(y - (1512 - Math.max(0, x - 550) * .44)) < 44 || (Math.abs(x - 1280) < 38 && y > 480 && y < 1250) || (Math.abs(x - 2120) < 34 && y > 750 && y < 1830);
export function makeWorld(day = 1) {
  const random = rng(773), decor = [], solids = [], loot = [], enemies = [];
  const block = (x, y, w, h, type = 'building', extra = {}) => {
    decor.push({ x, y, w, h, type, ...extra }); solids.push({ x, y, w, h });
  };
  block(300, 1340, 136, 70, 'building', { tint: '#63694e', sign: 'АРТЕЛЬ / GUILD' });
  block(490, 1345, 130, 64, 'building', { tint: '#47615b', sign: 'КОНТУР / CIRCUIT' });
  block(290, 1580, 96, 55, 'building', { tint: '#726649', sign: 'ДОЗОР / WATCH' });
  for (let x = 240; x <= 650; x += 25) { block(x, 1290, 22, 5, 'fence'); block(x, 1690, 22, 5, 'fence'); }
  for (let y = 1315; y < 1690; y += 25) { block(240, y, 5, 22, 'fence'); if (y < 1460 || y > 1560) block(662, y, 5, 22, 'fence'); }
  for (const [x, y, w, h] of [[790, 1300, 144, 70], [1000, 1510, 100, 70], [980, 1070, 112, 55], [1230, 980, 100, 90], [1530, 1020, 144, 80], [1610, 1220, 90, 70], [2010, 490, 150, 95], [2360, 300, 180, 100], [2470, 610, 115, 75], [820, 540, 95, 64], [1810, 1870, 110, 70]]) block(x, y, w, h, 'building', { tint: ['#56604d', '#626552', '#576360'][Math.floor(random() * 3)] });
  for (const [x, y] of [[731, 1516], [1190, 1260], [1340, 1120], [1735, 978], [2160, 777], [1960, 1260], [1070, 1430], [1530, 910]]) block(x, y, 36, 19, 'car', { tint: random() > .5 ? '#8a7252' : '#547775' });
  decor.push({ x: 464, y: 1510, type: 'fire' }, { x: 335, y: 1450, type: 'npc', kind: 'trader' }, { x: 570, y: 1430, type: 'npc', kind: 'mechanic' }, { x: 515, y: 1580, type: 'npc', kind: 'scientist' }, { x: 439, y: 1440, type: 'board' }, { x: 612, y: 1510, type: 'lamp' }, { x: 280, y: 1510, type: 'lamp' });
  decor.push({ x: 1280, y: 557, type: 'tower' }, { x: 1456, y: 1154, type: 'relay' }, { x: 2224, y: 706, type: 'relay' });
  const blocked = (x, y, margin = 14) => solids.some(b => x > b.x - margin && x < b.x + b.w + margin && y > b.y - margin && y < b.y + b.h + margin);
  for (let i = 0; i < 680; i++) {
    const x = 60 + random() * (SIZE.w - 120), y = 80 + random() * (SIZE.h - 140);
    if (safe({ x, y }) || road(x, y) || blocked(x, y, 30) || POINTS.some(p => distance(p, { x, y }) < 80) || distance({ x: 2350, y: 490 }, { x, y }) < 105) continue;
    if (radiation({ x, y }) > .3 && random() > .35) continue;
    const dead = radiation({ x, y }) > .1 || random() > .87;
    decor.push({ x, y, type: dead ? 'deadTree' : 'tree', seed: Math.floor(random() * 10) });
    solids.push({ x: x - 5, y: y - 6, w: 10, h: 9 });
  }
  for (let i = 0; i < 95; i++) {
    const x = 80 + random() * (SIZE.w - 160), y = 80 + random() * (SIZE.h - 160);
    if (safe({ x, y }) || road(x, y) || blocked(x, y, 15) || POINTS.some(p => distance(p, { x, y }) < 50)) continue;
    block(x, y, 17, 12, 'rock');
  }
  const addLoot = (x, y, contents, type = 'crate') => loot.push({ id: `l${loot.length}`, x, y, contents, type });
  addLoot(714, 1468, { scrap: 3, wire: 1 }); addLoot(858, 1445, { scrap: 4, wire: 2, cloth: 2 });
  addLoot(790, 1408, { ammo: 18, food: 1 }); addLoot(963, 1470, { water: 2, cloth: 3 });
  addLoot(1185, 628, { wire: 4, scrap: 4 }); addLoot(1510, 1175, { wire: 4, scrap: 6 });
  for (let i = 0; i < 160; i++) {
    const x = 100 + random() * (SIZE.w - 200), y = 100 + random() * (SIZE.h - 200);
    if (safe({ x, y }) || blocked(x, y, 22) || loot.some(l => distance(l, { x, y }) < 48)) continue;
    if (radiation({ x, y }) > .15) addLoot(x, y, { crystal: 2 + Math.floor(random() * 2) }, 'crystal');
    else {
      const contents = { scrap: 2 + Math.floor(random() * 4) };
      contents[random() > .5 ? 'wire' : 'cloth'] = 1 + Math.floor(random() * 3);
      if (random() > .5) contents[['ammo', 'water', 'food'][Math.floor(random() * 3)]] = random() > .5 ? 2 : 1;
      addLoot(x, y, contents, random() > .6 ? 'barrel' : 'crate');
    }
  }
  const enemyRandom = rng(91 + day);
  const addEnemy = (x, y, kind) => {
    const hp = kind === 'keeper' ? 680 : kind === 'brute' ? 110 : kind === 'spitter' ? 65 : 48;
    enemies.push({ id: `e${enemies.length}`, x, y, homeX: x, homeY: y, kind, hp, maxHp: hp, cool: 1, hit: 0, phase: enemyRandom() * 6.28 });
  };
  for (const [x, y] of [[1040, 1410], [1100, 1250], [910, 1000], [1260, 800], [1490, 1270], [1660, 1100]]) addEnemy(x, y, 'hound');
  for (let i = 0; i < 66; i++) {
    const x = 500 + enemyRandom() * 2120, y = 190 + enemyRandom() * 1840;
    if (distance({ x, y }, HOME) < 460 || blocked(x, y, 25)) continue;
    addEnemy(x, y, radiation({ x, y }) > .12 ? 'spitter' : enemyRandom() > .7 ? 'brute' : 'hound');
  }
  addEnemy(2350, 490, 'keeper');
  return { decor, solids, loot, enemies, blocked };
}
export function collision(world, x, y, radius = 7) {
  return x < 20 || y < 20 || x > SIZE.w - 20 || y > SIZE.h - 20 || world.solids.some(b => x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h);
}
export function move(world, actor, dx, dy, radius = 7) {
  if (!collision(world, actor.x + dx, actor.y, radius)) actor.x += dx;
  if (!collision(world, actor.x, actor.y + dy, radius)) actor.y += dy;
}
export function groundCanvas() {
  const c = document.createElement('canvas'); c.width = SIZE.w; c.height = SIZE.h;
  const g = c.getContext('2d'), r = rng(42);
  g.fillStyle = '#485342'; g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < SIZE.h; y += 32) for (let x = 0; x < SIZE.w; x += 32) {
    const z = radiation({ x, y }), n = r();
    g.fillStyle = z > .1 ? ['#414f42', '#485545', '#4b5844', '#3b4d42'][Math.floor(n * 4)] : ['#485240', '#4a5543', '#4c5744', '#465140'][Math.floor(n * 4)];
    g.fillRect(x, y, 32, 32);
    for (let i = 0; i < 4; i++) { g.fillStyle = n > .4 ? '#586149' : '#3d493b'; g.fillRect(x + Math.floor(r() * 30), y + Math.floor(r() * 30), 2 + Math.floor(r() * 3), 1); }
  }
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (const [width, color] of [[92, '#424938'], [75, '#66644e'], [58, '#706d56']]) {
    g.strokeStyle = color; g.lineWidth = width; g.beginPath(); g.moveTo(280, 1512); g.lineTo(550, 1512); g.lineTo(2390, 702); g.stroke();
    g.lineWidth = width * .65; g.beginPath(); g.moveTo(1280, 1190); g.lineTo(1280, 480); g.moveTo(2120, 820); g.lineTo(2120, 1830); g.stroke();
  }
  g.fillStyle = '#72745b'; g.fillRect(255, 1300, 400, 380);
  for (let i = 0; i < 19000; i++) {
    const x = Math.floor(r() * SIZE.w), y = Math.floor(r() * SIZE.h), onRoad = road(x, y);
    g.fillStyle = onRoad ? (r() > .4 ? '#5a5c49' : '#817d63') : (r() > .4 ? '#667050' : '#374839');
    g.fillRect(x, y, r() > .8 ? 4 : 1, onRoad ? 1 : 2);
    if (!onRoad && r() > .88) g.fillRect(x + 2, y - 2, 1, 3);
  }
  // ponytail: a cached painted terrain fits this fixed map; chunk it only if the world grows.
  for (let i = 0; i < 18; i++) {
    const x = 1880 + r() * 440, y = 1470 + r() * 490, w = 20 + r() * 90, h = 12 + r() * 44;
    g.fillStyle = '#374d42'; g.fillRect(x - 4, y - 4, w + 8, h + 8); g.fillStyle = '#293f39'; g.fillRect(x, y, w, h);
    g.fillStyle = '#6a87594f'; g.fillRect(x + 5, y + 4, w - 10, 2); g.fillRect(x + 12, y + h - 5, w - 15, 1);
  }
  g.fillStyle = '#394336'; g.fillRect(2330, 210, 280, 10); g.fillRect(2310, 200, 6, 760); g.fillRect(2340, 200, 6, 760);
  g.fillStyle = '#8d8870'; for (let y = 200; y < 960; y += 18) g.fillRect(2304, y, 50, 4);
  return c;
}
const rect = (g, color, x, y, w, h) => { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), w, h); };
export function drawItem(g, id, x = 0, y = 0) {
  g.save(); g.translate(Math.floor(x), Math.floor(y));
  if (id === 'scrap') { rect(g, '#3a4541', 3, 5, 12, 9); rect(g, '#9ca99a', 2, 3, 5, 10); rect(g, '#73877d', 6, 6, 8, 4); rect(g, '#c0bc99', 11, 2, 3, 5); }
  else if (id === 'wire') { g.strokeStyle = '#cd9561'; g.lineWidth = 2; g.strokeRect(3, 3, 9, 9); g.strokeRect(5, 5, 5, 5); rect(g, '#768982', 11, 12, 4, 2); }
  else if (id === 'cloth') { rect(g, '#a9aa83', 2, 4, 12, 9); rect(g, '#d0cfaa', 2, 3, 12, 3); rect(g, '#747956', 4, 10, 9, 2); rect(g, '#c3c297', 4, 7, 6, 1); }
  else if (id === 'crystal' || id === 'biomass') { rect(g, id === 'crystal' ? '#518575' : '#667649', 3, 6, 10, 7); rect(g, id === 'crystal' ? '#8bd5b5' : '#b3c783', 6, 2, 4, 11); rect(g, '#e0e9b5', 7, 3, 2, 5); }
  else if (id === 'ammo') { for (let i = 0; i < 3; i++) { rect(g, '#c0a86c', 2 + i * 5, 5, 3, 9); rect(g, '#e1c78e', 2 + i * 5, 3, 3, 3); rect(g, '#625b42', 2 + i * 5, 10, 3, 1); } }
  else if (id === 'medkit') { rect(g, '#aeafa0', 1, 5, 14, 9); rect(g, '#777f6e', 5, 2, 6, 3); rect(g, '#d9d8bf', 2, 5, 12, 3); rect(g, '#a25648', 7, 6, 3, 7); rect(g, '#a25648', 5, 8, 7, 3); }
  else if (id === 'water' || id === 'antidote') { rect(g, '#a2b5a4', 6, 1, 5, 3); rect(g, id === 'water' ? '#6b9eac' : '#91a760', 4, 4, 9, 11); rect(g, '#c5d8bf', 5, 8, 7, 4); rect(g, '#e0e5c180', 5, 5, 2, 3); }
  else if (id === 'food') { rect(g, '#777f60', 3, 3, 11, 12); rect(g, '#b6b28d', 3, 2, 11, 3); rect(g, '#b59561', 3, 7, 11, 5); rect(g, '#5e6849', 6, 8, 5, 3); rect(g, '#c3b48e', 3, 14, 11, 1); }
  else if (id === 'battery') { rect(g, '#82917d', 4, 4, 9, 11); rect(g, '#c2b576', 6, 2, 5, 2); rect(g, '#c7be7d', 7, 6, 3, 6); }
  else { rect(g, '#a9ac8a', 3, 3, 10, 11); rect(g, '#606e5e', 5, 5, 6, 7); rect(g, '#ceba80', 7, 7, 2, 3); }
  g.restore();
}
export function drawPerson(g, x, y, angle = 0, frame = 0, npc = '') {
  g.save(); g.translate(Math.floor(x), Math.floor(y));
  rect(g, '#15211a70', -10, -2, 21, 7);
  const walk = Math.sin(frame) > 0 ? 1 : -1;
  rect(g, '#26332f', -5, -4, 4, 6 + walk); rect(g, '#26332f', 2, -4, 4, 6 - walk);
  rect(g, '#172520', -6, 1 + walk, 5, 2); rect(g, '#172520', 2, 1 - walk, 5, 2);
  rect(g, npc === 'scientist' ? '#a4b4a5' : npc === 'trader' ? '#9b8257' : '#b09a65', -7, -16, 14, 13);
  rect(g, '#56644d', -8, -13, 4, 10); rect(g, '#56644d', 4, -13, 4, 9);
  rect(g, '#6d7855', -4, -14, 8, 9); rect(g, '#bec198', -3, -13, 6, 2); rect(g, '#4b593f', -4, -6, 8, 2);
  rect(g, '#2f4038', -6, -24, 12, 9); rect(g, '#667857', -5, -25, 10, 5);
  rect(g, '#afae88', -4, -20, 8, 4); rect(g, '#172925', -5, -20, 10, 3); rect(g, '#a4cebd', 0, -20, 4, 2);
  if (!npc) { g.translate(1, -10); g.rotate(angle); rect(g, '#283631', 3, -2, 18, 4); rect(g, '#aeb6a2', 8, -3, 10, 2); rect(g, '#8e7959', 6, 1, 4, 4); }
  g.restore();
}
export function drawObject(g, o, time, lang = 0) {
  let x = Math.round(o.x), y = Math.round(o.y);
  if (o.type === 'tree') {
    rect(g, '#1c2d2550', x - 10, y - 3, 40, 12); rect(g, '#534d37', x - 3, y - 32, 6, 34); rect(g, '#897454', x - 1, y - 28, 2, 25);
    const shift = (o.seed % 3) * 2;
    for (const [dx, dy, w, h, color] of [[-20, -31, 42, 13, '#2c4133'], [-25, -41, 50, 15, '#314a37'], [-19, -53, 39, 19, '#39583d'], [-14, -63, 29, 22, '#425e3e'], [-7, -73, 15, 24, '#496542'], [-3, -80, 6, 15, '#57714b'], [-22, -40, 13, 4, '#607749'], [-12, -58, 12, 4, '#697e50'], [5, -34, 18, 3, '#526e42']]) rect(g, color, x + dx + shift, y + dy, w, h);
  } else if (o.type === 'deadTree') {
    rect(g, '#22372d55', x - 3, y - 1, 26, 6); rect(g, '#605e49', x - 3, y - 48, 6, 50); rect(g, '#8a7e5e', x - 1, y - 43, 2, 37);
    rect(g, '#605e49', x - 13, y - 34, 12, 4); rect(g, '#605e49', x - 13, y - 44, 3, 13); rect(g, '#605e49', x + 2, y - 24, 15, 4); rect(g, '#605e49', x + 13, y - 36, 3, 12);
  } else if (o.type === 'building') {
    const w = o.w, h = o.h;
    rect(g, '#15261c60', x + 8, y + 12, w + 6, h + 8); rect(g, '#252f29', x - 2, y - 19, w + 4, h + 26);
    rect(g, '#82806a', x, y, w, h + 4);
    for (let yy = y + 4; yy < y + h; yy += 7) { rect(g, '#646a54', x, yy, w, 1); for (let xx = x + (yy % 2) * 7; xx < x + w; xx += 14) rect(g, '#646a54', xx, yy - 5, 1, 5); }
    rect(g, '#292f25', x + w / 2 - 10, y + h - 24, 20, 28); rect(g, '#a29c73', x + w / 2 - 12, y + h - 25, 24, 3);
    for (const xx of [x + 13, x + w - 29]) { rect(g, '#344a43', xx, y + h - 22, 17, 13); rect(g, '#9b9c7a', xx - 1, y + h - 24, 19, 2); rect(g, '#b3b180', xx + 8, y + h - 22, 1, 13); rect(g, '#687966', xx, y + h - 16, 17, 1); }
    rect(g, '#303e33', x - 5, y - 23, w + 10, h - 7); rect(g, o.tint || '#56624e', x - 3, y - 24, w + 6, h - 10);
    for (let xx = x; xx < x + w; xx += 7) { rect(g, '#ffffff12', xx, y - 23, 1, h - 12); rect(g, '#00000018', xx + 2, y - 23, 1, h - 12); }
    rect(g, '#9a9a70', x - 4, y - 24, w + 8, 2); rect(g, '#879376', x - 4, y + h - 34, w + 8, 2);
    rect(g, '#766d51', x + w - 26, y - 34, 14, 24); rect(g, '#2e392d', x + w - 24, y - 34, 10, 5);
    if (o.sign) { rect(g, '#283b2e', x + 9, y + h - 2, w - 18, 12); g.font = '6px monospace'; g.textAlign = 'center'; g.fillStyle = '#c9c492'; g.fillText(o.sign.split(' / ')[lang], x + w / 2, y + h + 6); }
  } else if (o.type === 'car') {
    rect(g, '#23302870', x + 4, y + 4, 39, 20); rect(g, '#26332b', x + 3, y - 1, 7, 25); rect(g, '#26332b', x + 26, y - 1, 7, 25); rect(g, o.tint, x, y, 36, 20);
    rect(g, '#364e47', x + 10, y + 2, 14, 16); rect(g, '#a5ac88', x + 10, y + 2, 2, 15); rect(g, o.tint, x + 13, y + 2, 7, 16); rect(g, '#bdaf78', x + 34, y + 2, 3, 4); rect(g, '#bdaf78', x + 34, y + 14, 3, 4); rect(g, '#71553d', x + 2, y + 7, 5, 8);
  } else if (o.type === 'fence') {
    rect(g, '#343f3060', x + 2, y + 2, o.w, o.h + 2); rect(g, '#8a8970', x, y - 12, o.w, o.h); rect(g, '#444d3d', x, y - 14, 3, o.h + 16); rect(g, '#b6b08a', x, y - 15, 3, 3);
  } else if (o.type === 'rock') { rect(g, '#303e3250', x, y + 3, 22, 12); rect(g, '#697361', x, y, 17, 11); rect(g, '#89907a', x + 3, y - 3, 11, 5); rect(g, '#a1a38a', x + 5, y - 2, 4, 2); }
  else if (o.type === 'npc') drawPerson(g, x, y, 0, 0, o.kind);
  else if (o.type === 'fire') {
    rect(g, '#303a2d', x - 12, y - 5, 24, 13); rect(g, '#97947a', x - 10, y - 6, 6, 5); rect(g, '#97947a', x + 5, y - 6, 6, 5); rect(g, '#7a6344', x - 8, y, 17, 3);
    const f = Math.floor(time * 8) % 3; rect(g, '#d8763f', x - 6, y - 9 - f, 12, 10 + f); rect(g, '#e4ae58', x - 3, y - 14 + f, 6, 13); rect(g, '#ecdb99', x - 2, y - 7, 4, 7); rect(g, '#e1a255', x + f * 4 - 5, y - 22 - f * 2, 1, 2);
  } else if (o.type === 'lamp') { rect(g, '#3b4433', x, y - 49, 3, 49); rect(g, '#b1a371', x - 4, y - 51, 12, 3); rect(g, '#e2d49a', x - 2, y - 48, 8, 5); }
  else if (o.type === 'board') { rect(g, '#504e39', x - 12, y - 5, 3, 11); rect(g, '#504e39', x + 9, y - 5, 3, 11); rect(g, '#73694a', x - 16, y - 28, 33, 25); rect(g, '#484d38', x - 13, y - 25, 27, 19); rect(g, '#c0b687', x - 10, y - 22, 9, 12); rect(g, '#d1c99c', x + 3, y - 20, 8, 8); }
  else if (o.type === 'tower') {
    for (let i = 0; i < 4; i++) { rect(g, '#a29973', x - 25 + i * 5, y - 30 - i * 24, 50 - i * 10, 3); rect(g, '#4a5141', x - 25 + i * 5, y - 54 - i * 24, 3, 26); rect(g, '#4a5141', x + 22 - i * 5, y - 54 - i * 24, 3, 26); }
    rect(g, '#7c866b', x - 1, y - 160, 3, 60); rect(g, '#acada0', x - 24, y - 145, 49, 2); rect(g, Math.sin(time * 3) > 0 ? '#dc7a4b' : '#693e32', x - 2, y - 161, 5, 4);
  } else if (o.type === 'relay') { rect(g, '#2d3931', x - 13, y - 28, 26, 32); rect(g, '#8d9380', x - 11, y - 28, 22, 28); rect(g, '#344c40', x - 7, y - 24, 14, 12); rect(g, '#bdd18e', x - 5, y - 22, 4, 2); rect(g, '#b4a378', x - 6, y - 8, 12, 2); rect(g, '#65715f', x, y - 43, 2, 15); }
}
export function drawEnemy(g, e, time) {
  const x = Math.floor(e.x), y = Math.floor(e.y), hound = e.kind === 'hound', boss = e.kind === 'keeper', scale = boss ? 2.2 : 1;
  g.save(); g.translate(x, y); g.scale(scale, scale);
  rect(g, '#152a2270', -12, -1, 25, 7);
  const col = e.hit > 0 ? '#dfcdad' : e.kind === 'spitter' ? '#7e9561' : '#9b9472';
  const step = Math.sin(time * 12 + e.phase) > 0 ? 2 : 0;
  rect(g, '#4c5740', -9, -3, 4, 7 - step); rect(g, '#4c5740', 5, -3, 4, 5 + step);
  rect(g, col, -10, hound ? -13 : -22, 20, hound ? 13 : 23);
  rect(g, '#626c4d', -7, -13, 14, 8); rect(g, '#b1b58b', -7, hound ? -14 : -24, 14, 6);
  rect(g, col, -6, hound ? -15 : -26, 12, 12);
  rect(g, '#253b31', -5, hound ? -11 : -22, 10, 4); rect(g, boss ? '#ecb761' : '#d5cd81', -4, hound ? -11 : -22, 3, 2); rect(g, '#d5cd81', 2, hound ? -11 : -22, 3, 2);
  if (!hound) { rect(g, col, -14, -18, 5, 17); rect(g, col, 10, -18, 5, 17); rect(g, '#c1b88b', -15, -3, 4, 4); rect(g, '#c1b88b', 12, -3, 4, 4); }
  g.restore();
  if (e.hp < e.maxHp || boss) { rect(g, '#1b2c21', x - 15, y - (boss ? 72 : 33), 30, 3); rect(g, '#bf9068', x - 15, y - (boss ? 72 : 33), 30 * e.hp / e.maxHp, 2); }
}
export function drawLoot(g, l, time) {
  const x = Math.floor(l.x), y = Math.floor(l.y);
  if (l.type === 'crystal') { g.save(); g.translate(x - 10, y - 14); g.scale(1.3, 1.3); drawItem(g, 'crystal'); g.restore(); }
  else if (l.type === 'drop') drawItem(g, 'biomass', x - 8, y - 10);
  else if (l.type === 'barrel') { rect(g, '#333f30', x - 8, y - 13, 17, 19); rect(g, '#8a8260', x - 7, y - 14, 14, 18); rect(g, '#b2a779', x - 7, y - 13, 14, 3); rect(g, '#545f42', x - 7, y - 3, 14, 3); }
  else { rect(g, '#29382c60', x - 10, y - 2, 25, 11); rect(g, '#746d48', x - 10, y - 12, 21, 17); rect(g, '#a69968', x - 10, y - 14, 21, 5); rect(g, '#c3b07e', x - 8, y - 13, 3, 17); rect(g, '#c3b07e', x + 5, y - 13, 3, 17); rect(g, '#323e2d', x - 3, y - 4, 7, 5); }
  rect(g, '#e1cd8b', x - 1, y - 23 - Math.round(Math.sin(time * 2 + x) * 2), 2, 2);
}
