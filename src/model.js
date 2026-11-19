export const TITLE = ['Пеплосвет: Последний кордон', 'Ashglint: The Last Cordon'];
export const HOME = { x: 432, y: 1512 };
export const SIZE = { w: 2816, h: 2240 };
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const ITEMS = {
  scrap: { name: ['Металлолом', 'Scrap'], icon: 'scrap', weight: 1, price: 5 },
  wire: { name: ['Провод', 'Wire'], icon: 'wire', weight: .5, price: 8 },
  cloth: { name: ['Ткань', 'Cloth'], icon: 'cloth', weight: .3, price: 6 },
  crystal: { name: ['Изотоп', 'Isotope'], icon: 'crystal', weight: 1, price: 22 },
  biomass: { name: ['Биоматериал', 'Biomatter'], icon: 'biomass', weight: .5, price: 12 },
  ammo: { name: ['Патроны', 'Ammo'], icon: 'ammo', weight: .03, price: 2 },
  medkit: { name: ['Аптечка', 'Medkit'], icon: 'medkit', weight: .5, price: 30 },
  food: { name: ['Консервы', 'Ration'], icon: 'food', weight: .5, price: 16 },
  water: { name: ['Чистая вода', 'Clean water'], icon: 'water', weight: .5, price: 12 },
  antidote: { name: ['Антирад', 'Antirad'], icon: 'antidote', weight: .3, price: 26 },
  battery: { name: ['Энергоячейка', 'Power cell'], icon: 'battery', weight: 1, price: 30 },
};
export const WEAPONS = {
  pistol: { name: ['ПМ «Скиталец»', 'Wanderer pistol'], damage: 22, rate: .38, range: 235, pellets: 1, price: 0 },
  shotgun: { name: ['Дробовик «Сучок»', 'Bough shotgun'], damage: 11, rate: .85, range: 160, pellets: 5, price: 180, rep: 'wardens', rank: 10 },
  rifle: { name: ['Карабин «Искра»', 'Spark carbine'], damage: 27, rate: .18, range: 300, pellets: 1, price: 360, rep: 'wardens', rank: 20 },
};
export const FACTIONS = {
  wardens: { name: ['Дозор', 'The Watch'], color: '#c9ac68', desc: ['Защищают дороги и платят за мутантов.', 'Guard the roads. Pay for mutant bounties.'] },
  mechanics: { name: ['Артель', 'The Guild'], color: '#d38d59', desc: ['Собирают старый мир по винтику.', 'Rebuild the old world, one bolt at a time.'] },
  scientists: { name: ['Контур', 'The Circuit'], color: '#86baa3', desc: ['Ищут причину Пепельного всплеска.', 'Search for the cause of the Ash Event.'] },
};
export const RECIPES = {
  ammo: { name: ['Патроны ×18', 'Ammo ×18'], cost: { scrap: 2 }, output: { ammo: 18 } },
  medkit: { name: ['Полевая аптечка', 'Field medkit'], cost: { cloth: 3, biomass: 1 }, output: { medkit: 1 } },
  antidote: { name: ['Антирад', 'Antirad'], cost: { biomass: 2, crystal: 1 }, output: { antidote: 1 } },
  battery: { name: ['Энергоячейка', 'Power cell'], cost: { scrap: 3, wire: 2 }, output: { battery: 1 } },
  scanner: { name: ['Сканер частоты', 'Frequency scanner'], cost: { scrap: 5, wire: 3 }, upgrade: 'scanner', desc: ['Читает сигнал старой вышки.', 'Reads the old tower signal.'] },
  barrel: { name: ['Усиленный ствол', 'Reinforced barrel'], cost: { scrap: 10, wire: 3 }, upgrade: 'barrel', desc: ['+7 к урону каждого попадания.', '+7 damage per hit.'], rep: 'mechanics', rank: 10 },
  sight: { name: ['Коллиматор', 'Reflex sight'], cost: { scrap: 6, wire: 4 }, upgrade: 'sight', desc: ['+60 к дальности стрельбы.', '+60 firing range.'] },
  filter: { name: ['Фильтр «Мох»', 'Moss filter'], cost: { cloth: 5, crystal: 2 }, upgrade: 'filter', desc: ['На 65% меньше облучения.', '65% less radiation.'], rep: 'scientists', rank: 10 },
  armor: { name: ['Бронепластины', 'Armor plates'], cost: { scrap: 12, cloth: 4 }, upgrade: 'armor', desc: ['На 30% меньше входящего урона.', '30% less incoming damage.'] },
  bag: { name: ['Рюкзак следопыта', 'Pathfinder pack'], cost: { cloth: 6, wire: 2 }, upgrade: 'bag', desc: ['Вместимость: 65 кг вместо 40.', 'Capacity: 65 kg instead of 40.'] },
};
export const QUESTS = [
  { title: ['Собрать по осколкам', 'Piece by piece'], faction: 'mechanics', text: ['Мира чинит передатчик кордона. Найдите 5 металлолома и 2 провода в заброшенных дворах к востоку. Вернитесь к доске заданий.', 'Mira is fixing the cordon transmitter. Find 5 scrap and 2 wire in the abandoned yards to the east. Return to the mission board.'], need: { scrap: 5, wire: 2 }, reward: 80, rep: 12 },
  { title: ['Тихая дорога', 'A quiet road'], faction: 'wardens', text: ['Дозор потерял северную тропу. Уничтожьте 5 мутантов. Засчитываются все победы с начала игры.', 'The Watch lost the northern trail. Defeat 5 mutants. All kills since the start count.'], kills: 5, reward: 100, rep: 22 },
  { title: ['Голос в пепле', 'A voice in the ash'], faction: 'scientists', text: ['Создайте сканер на верстаке. Исследуйте радиовышку на севере: кто-то всё ещё передаёт сигнал.', 'Craft a scanner at the workbench. Investigate the radio tower in the north: someone is still broadcasting.'], flag: 'signal', reward: 140, rep: 12, target: { x: 1280, y: 592 } },
  { title: ['Живой изотоп', 'The living isotope'], faction: 'scientists', text: ['Сигнал питается Пеплосветом — живым минералом. Принесите 4 изотопа с Тихой топи и 3 биоматериала с мутантов.', 'The signal runs on Ashglint, a living mineral. Bring 4 isotopes from the Quiet Mire and 3 biomatter from mutants.'], need: { crystal: 4, biomass: 3 }, reward: 160, rep: 18, target: { x: 2032, y: 1712 } },
  { title: ['Два огня', 'Two lights'], faction: 'mechanics', text: ['Создайте 2 энергоячейки. Запитайте реле на Свалке и у станции «Ноль». Каждому реле нужна одна ячейка.', 'Craft 2 power cells. Power the relays at the Scrapyard and Station Zero. Each relay needs one cell.'], flags: ['relay1', 'relay2'], reward: 200, rep: 20, target: { x: 1456, y: 1168 } },
  { title: ['Последний кордон', 'The last cordon'], faction: 'wardens', text: ['Реле разбудили Хранителя у станции «Ноль». Победите его и вернитесь к кордону: сигнал выведет выживших домой.', 'The relays woke the Keeper at Station Zero. Defeat it and return to the cordon: the signal will guide survivors home.'], flag: 'keeper', reward: 400, rep: 30, target: { x: 2350, y: 490 } },
];
export function newGame() {
  return { version: 1, savedAt: 0, day: 1, time: 0, x: HOME.x, y: HOME.y, hp: 100, hunger: 100, thirst: 100, rad: 0, stamina: 100, credits: 45,
    inv: { scrap: 0, wire: 0, cloth: 0, crystal: 0, biomass: 0, ammo: 72, medkit: 2, food: 2, water: 3, antidote: 1, battery: 0 },
    weapon: 'pistol', weapons: ['pistol'], upgrades: [], rep: { wardens: 0, mechanics: 0, scientists: 0 }, quest: 0, kills: 0, flags: [], looted: [], dead: [], drops: [], explored: [], contract: 0, contractDay: 0, deaths: 0 };
}
export const capacity = s => s.upgrades.includes('bag') ? 65 : 40;
export const weight = s => Object.entries(ITEMS).reduce((n, [id, item]) => n + (s.inv[id] || 0) * item.weight, 0);
export const affordable = (s, cost) => Object.entries(cost).every(([id, n]) => s.inv[id] >= n);
export function exchange(s, cost = {}, gain = {}) {
  if (!affordable(s, cost)) return false;
  const next = { ...s, inv: { ...s.inv } };
  for (const [id, n] of Object.entries(cost)) next.inv[id] -= n;
  for (const [id, n] of Object.entries(gain)) next.inv[id] += n;
  if (weight(next) > capacity(s) + .001) return false;
  s.inv = next.inv;
  return true;
}
export function craft(s, id) {
  const r = RECIPES[id];
  if (!r || (r.upgrade && s.upgrades.includes(r.upgrade)) || (r.rep && s.rep[r.rep] < r.rank)) return false;
  if (!exchange(s, r.cost, r.output)) return false;
  if (r.upgrade) s.upgrades.push(r.upgrade);
  return true;
}
export function trade(s, id, buy) {
  if (!ITEMS[id]) return false;
  const qty = buy && id === 'ammo' ? 18 : 1;
  const price = buy ? Math.ceil(ITEMS[id].price * qty * 1.45 * (s.rep.mechanics >= 30 ? .85 : 1)) : ITEMS[id].price;
  if (buy && (s.credits < price || !exchange(s, {}, { [id]: qty }))) return false;
  if (!buy && !exchange(s, { [id]: qty })) return false;
  s.credits += buy ? -price : price;
  return true;
}
export function buyWeapon(s, id) {
  const w = WEAPONS[id];
  if (!w || s.weapons.includes(id) || s.credits < w.price || (w.rep && s.rep[w.rep] < w.rank)) return false;
  s.credits -= w.price; s.weapons.push(id); s.weapon = id;
  return true;
}
export function useItem(s, id) {
  const stat = { medkit: ['hp', 45], food: ['hunger', 45], water: ['thirst', 50], antidote: ['rad', -50] }[id];
  if (!stat || !s.inv[id] || (stat[1] > 0 ? s[stat[0]] >= 100 : s.rad <= 0)) return false;
  s.inv[id]--; s[stat[0]] = clamp(s[stat[0]] + stat[1], 0, 100);
  return true;
}
export function questReady(s) {
  const q = QUESTS[s.quest];
  return !!q && (!q.need || affordable(s, q.need)) && (!q.kills || s.kills >= q.kills) && (!q.flag || s.flags.includes(q.flag)) && (!q.flags || q.flags.every(f => s.flags.includes(f)));
}
export function claimQuest(s) {
  if (!questReady(s)) return false;
  const q = QUESTS[s.quest];
  if (q.need) exchange(s, q.need);
  s.credits += q.reward; s.rep[q.faction] = Math.min(100, s.rep[q.faction] + q.rep); s.quest++;
  return true;
}
export function respawn(s, died = false) {
  if (died) {
    for (const id of ['scrap', 'wire', 'cloth', 'biomass', 'crystal']) s.inv[id] = Math.floor(s.inv[id] * .7);
    s.deaths++;
  }
  Object.assign(s, { x: HOME.x, y: HOME.y, hp: 100, hunger: 100, thirst: 100, stamina: 100, rad: 0, day: s.day + 1, time: 0, looted: [], dead: [], drops: [] });
}
export function decodeSave(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || data.version !== 1 || !data.inv || typeof data.inv !== 'object' || !Number.isFinite(data.savedAt)) return null;
    const s = newGame();
    const bounds = { day: [1, 99999], time: [0, 1e8], x: [20, SIZE.w - 20], y: [20, SIZE.h - 20], hp: [1, 100], hunger: [0, 100], thirst: [0, 100], rad: [0, 100], stamina: [0, 100], credits: [0, 1e8], quest: [0, QUESTS.length], kills: [0, 1e7], contract: [0, 1e7], contractDay: [0, 99999], deaths: [0, 1e6], savedAt: [0, 1e15] };
    for (const [id, [lo, hi]] of Object.entries(bounds)) if (Number.isFinite(data[id])) s[id] = clamp(data[id], lo, hi);
    for (const id of ['day', 'quest', 'kills', 'contract', 'contractDay', 'deaths', 'credits']) s[id] = Math.floor(s[id]);
    for (const id of Object.keys(ITEMS)) s.inv[id] = Number.isFinite(data.inv[id]) ? clamp(Math.floor(data.inv[id]), 0, 9999) : 0;
    for (const id of Object.keys(FACTIONS)) s.rep[id] = Number.isFinite(data.rep?.[id]) ? clamp(Math.floor(data.rep[id]), 0, 100) : 0;
    const list = (id, filter) => Array.isArray(data[id]) ? [...new Set(data[id].filter(filter))].slice(0, 4096) : [];
    s.weapons = [...new Set(['pistol', ...list('weapons', id => Object.hasOwn(WEAPONS, id))])];
    s.weapon = s.weapons.includes(data.weapon) ? data.weapon : 'pistol';
    s.upgrades = list('upgrades', id => Object.values(RECIPES).some(r => r.upgrade === id));
    s.flags = list('flags', id => ['signal', 'relay1', 'relay2', 'keeper'].includes(id));
    for (const id of ['looted', 'dead', 'explored']) s[id] = list(id, v => typeof v === 'string' && /^[a-z0-9,-]{1,32}$/.test(v));
    if (Array.isArray(data.drops)) s.drops = data.drops.filter(d => d && /^de\d{1,3}$/.test(d.id) && Number.isFinite(d.x) && Number.isFinite(d.y) && d.contents && !s.looted.includes(d.id)).slice(0, 100).map(d => ({ id: d.id, x: clamp(d.x, 20, SIZE.w - 20), y: clamp(d.y, 20, SIZE.h - 20), type: 'drop', contents: Object.fromEntries(Object.entries(d.contents).filter(([id, n]) => Object.hasOwn(ITEMS, id) && Number.isInteger(n) && n > 0 && n <= 100)) }));
    return s;
  } catch { return null; }
}
