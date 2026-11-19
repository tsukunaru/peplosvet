import { TITLE, HOME, SIZE, ITEMS, WEAPONS, FACTIONS, RECIPES, QUESTS, clamp, newGame, capacity, weight, affordable, exchange, craft, trade, buyWeapon, useItem, questReady, claimQuest, respawn } from './model.js';
import { POINTS, ZONES, distance, safe, radiation, zoneAt, makeWorld, collision, move, groundCanvas, drawItem, drawPerson, drawObject, drawEnemy, drawLoot } from './world.js';
import { platform } from './platform.js';

const $ = id => document.getElementById(id), canvas = $('world'), ctx = canvas.getContext('2d', { alpha: false });
const modal = $('modal'), body = $('modal-body'), mapCtx = $('minimap').getContext('2d');
let state = newGame(), world = makeWorld(), terrain = groundCanvas(), started = false, savedGame = null, screen = 'title', tab = 'trade';
let lang = 0, sound = true, touch = matchMedia('(pointer: coarse)').matches, autoFire = touch, active = false, last = 0, clock = 0, hudClock = 0, saveClock = 0, stepClock = 0;
let angle = 0, walk = 0, shotCooldown = 0, hurtCooldown = 0, interaction = null, interactCooldown = 0, lastZone = -1, zoneTimer = 0, hitFlash = 0, adBusy = false;
const holds = new Set(), keys = new Set(), mouse = { x: 0, y: 0, down: false, aim: false }, stick = { x: 0, y: 0, id: null }, cam = { x: 0, y: 0 };
let sprintTouch = false, bullets = [], particles = [], audio = null, ambient = null;
const tr = (ru, en) => lang ? en : ru, name = a => a[lang];
const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const button = (action, label, extra = '') => `<button data-action="${action}" ${extra}>${label}</button>`;
const icon = id => `<canvas class="item-icon" width="16" height="16" data-icon="${id}" aria-hidden="true"></canvas>`;
const label = id => name(ITEMS[id].name);
const qtyText = items => Object.entries(items).map(([id, n]) => `${label(id)} ×${n}`).join(' · ');

function toast(text, bad = false) {
  const d = document.createElement('div'); d.className = 'toast' + (bad ? ' bad' : ''); d.textContent = text; $('toasts').append(d);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
  setTimeout(() => d.remove(), 4200);
}
function initAudio() {
  if (audio) { if (active && sound) audio.resume().catch(() => {}); return; }
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate), data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) { brown = (brown + (Math.random() * 2 - 1) * .02) / 1.02; data[i] = brown * 3; }
    ambient = audio.createBufferSource(); ambient.buffer = buffer; ambient.loop = true;
    const gain = audio.createGain(); gain.gain.value = .12; ambient.connect(gain).connect(audio.destination); ambient.start();
    sync();
  } catch { audio = null; }
}
function sfx(kind) {
  if (!audio || !sound || !active) return;
  const tone = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
  const [freq, duration, volume] = { shot: [110, .09, .065], hit: [66, .13, .045], loot: [540, .12, .035], step: [52, .035, .014], good: [770, .18, .035], knife: [170, .08, .04] }[kind] || [250, .1, .03];
  tone.type = kind === 'loot' || kind === 'good' ? 'sine' : 'triangle'; tone.frequency.setValueAtTime(freq, now); tone.frequency.exponentialRampToValueAtTime(freq * .35, now + duration);
  gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration); tone.connect(gain).connect(audio.destination); tone.start(now); tone.stop(now + duration);
}
function clearInput() { keys.clear(); mouse.down = false; stick.x = stick.y = 0; stick.id = null; $('stick').firstElementChild.style.transform = ''; }
function sync() {
  active = started && !modal.open && holds.size === 0;
  platform.gameplay(active);
  if (audio) { if (active && sound) audio.resume().catch(() => {}); else audio.suspend().catch(() => {}); }
  if (!active) clearInput();
}
function hold(id, value) { if (value) holds.add(id); else holds.delete(id); sync(); }
function save() {
  if (!started) return;
  platform.save(state); savedGame = state;
  if (platform.storageFailed) toast(tr('Сохранение в браузере недоступно. Не закрывайте игру до восстановления хранилища.', 'Browser saving is unavailable. Keep the game open until storage is restored.'), true);
}
function hydrate() {
  world = makeWorld(state.day);
  world.enemies = world.enemies.filter(e => !state.dead.includes(e.id) && (e.kind !== 'keeper' || !state.flags.includes('keeper')));
  world.loot = [...world.loot.filter(l => !state.looted.includes(l.id)), ...state.drops];
  if (collision(world, state.x, state.y)) { state.x = HOME.x; state.y = HOME.y; }
  bullets = []; particles = []; shotCooldown = hurtCooldown = 0;
}
function start(fresh = false) {
  state = fresh || !savedGame ? newGame() : structuredClone(savedGame); hydrate(); started = true;
  closeModal(); initAudio(); save(); updateHud();
  if (state.quest === 0 && !state.looted.length) toast(tr('Добро пожаловать на кордон. Два ящика с деталями — на дороге к востоку →', 'Welcome to the cordon. Two supply crates are on the road to the east →'));
}
function applyLanguage() {
  document.documentElement.lang = lang ? 'en' : 'ru'; document.title = name(TITLE);
  $('brand').textContent = tr('ПЕПЛОСВЕТ', 'ASHGLINT'); $('subtitle').textContent = tr('ПОСЛЕДНИЙ КОРДОН', 'THE LAST CORDON');
  $('map-label').textContent = tr('КАРТА СЕКТОРА', 'SECTOR MAP');
  $('inventory').innerHTML = `<kbd>I</kbd>${tr('Рюкзак', 'Inventory')}`; $('journal').innerHTML = `<kbd>J</kbd>${tr('Задания', 'Missions')}`;
  $('hint').textContent = tr('WASD — движение   ·   ЛКМ — огонь   ·   E — действие   ·   SHIFT — бег   ·   M — карта', 'WASD — move   ·   LMB — fire   ·   E — interact   ·   SHIFT — sprint   ·   M — map');
  $('pause').ariaLabel = tr('Пауза', 'Pause'); $('map-open').ariaLabel = tr('Карта', 'Map'); $('world').ariaLabel = tr('Мир Пеплосвета', 'World of Ashglint');
  $('stick').ariaLabel = tr('Джойстик движения', 'Movement joystick'); $('touch-attack').ariaLabel = tr('Атака', 'Attack'); $('touch-sprint').ariaLabel = tr('Бег', 'Sprint');
  document.body.classList.toggle('touch', touch);
  updateSound(); updateHud();
}
function updateSound() { $('sound').textContent = sound ? '♪' : '♩'; $('sound').ariaLabel = tr(sound ? 'Выключить звук' : 'Включить звук', sound ? 'Mute sound' : 'Enable sound'); }
function drawIcons() { body.querySelectorAll('[data-icon]').forEach(c => drawItem(c.getContext('2d'), c.dataset.icon)); }
function heading(title, overline = '', closable = true) {
  return `<div class="dialog-head"><div><div class="eyebrow">${overline}</div><h2>${title}</h2></div>${closable ? button('close', '×', `aria-label="${tr('Закрыть', 'Close')}"`) : ''}</div>`;
}
function openModal(which, newTab = tab) {
  screen = which; tab = newTab;
  if (!modal.open) modal.showModal();
  renderModal(); sync(); save();
}
function closeModal() { modal.close(); screen = ''; sync(); canvas.focus({ preventScroll: true }); }
function questProgress(q = QUESTS[state.quest]) {
  if (!q) return tr('Сигнал восстановлен. Кордон живёт.', 'The signal is restored. The cordon lives.');
  if (q.need) return Object.entries(q.need).map(([id, n]) => `${label(id)}: ${Math.min(state.inv[id], n)}/${n}`).join('<br>');
  if (q.kills) return `${tr('Мутанты', 'Mutants')}: ${Math.min(state.kills, q.kills)}/${q.kills}`;
  if (q.flags) return `${tr('Запитанные реле', 'Powered relays')}: ${q.flags.filter(f => state.flags.includes(f)).length}/2`;
  return `${tr('Цель', 'Objective')}: ${state.flags.includes(q.flag) ? tr('выполнена', 'complete') : tr('отмечена на карте', 'marked on the map')}`;
}
function questHTML(inCamp) {
  const q = QUESTS[state.quest];
  let content = q ? `<div class="quest-card"><div class="eyebrow">${tr('ГЛАВА', 'CHAPTER')} ${String(state.quest + 1).padStart(2, '0')} / 06 · ${name(FACTIONS[q.faction].name)}</div><h3>${name(q.title)}</h3><p>${name(q.text)}</p><div class="objectives">${questProgress()}</div><p>${tr('Награда', 'Reward')}: <strong>${q.reward} ◈</strong> · +${q.rep} ${tr('репутации', 'reputation')}</p>${button('claim', tr('Сдать задание', 'Complete mission'), `class="primary" ${!inCamp || !questReady(state) ? 'disabled' : ''}`)}${!inCamp ? `<small class="muted"> ${tr('Сдача заданий — на кордоне.', 'Turn in missions at the cordon.')}</small>` : ''}</div>` : `<div class="quest-card"><div class="eyebrow">${tr('КАМПАНИЯ ЗАВЕРШЕНА', 'CAMPAIGN COMPLETE')}</div><h3>${tr('В темноте зажёгся свет', 'A light in the darkness')}</h3><p>${tr('Мира слышит в эфире голоса. Выжившие идут к кордону. Ваша история здесь не закончена: исследуйте мир, улучшайте снаряжение и выполняйте контракты фракций.', 'Mira hears voices on the radio. Survivors are coming to the cordon. Your story continues: explore, upgrade your equipment, and complete faction contracts.')}</p></div>`;
  content += `<div class="section-title">${tr('Повторяемый контракт', 'Repeatable contract')}</div><div class="item-row"><div class="item-info"><b>${tr('Поставка для Артели', 'Guild supply run')}</b><small>${tr('6 металлолома + 2 ткани → 65 жетонов, +5 репутации. Один раз за игровой день.', '6 scrap + 2 cloth → 65 tokens, +5 reputation. Once per game day.')}</small></div>${button('contract', '65 ◈', `${!inCamp || state.contractDay === state.day || !affordable(state, { scrap: 6, cloth: 2 }) ? 'disabled' : ''}`)}</div>`;
  return content;
}
function factionHTML() {
  return `<div class="factions">${Object.entries(FACTIONS).map(([id, f]) => `<div class="faction"><b style="color:${f.color}">${name(f.name)}</b><p>${name(f.desc)}</p><strong>${state.rep[id]}</strong><small> / 100</small><div class="track" style="margin-top:12px"><div class="fill" style="width:${state.rep[id]}%;background:${f.color}"></div></div></div>`).join('')}</div><p class="muted">${tr('Дозор 10 / 20: доступ к дробовику / карабину. Артель 10: усиленный ствол, 30: скидка 15%. Контур 10: радиационный фильтр. Задания повышают доверие указанной фракции.', 'Watch 10 / 20: shotgun / carbine access. Guild 10: reinforced barrel, 30: 15% shop discount. Circuit 10: radiation filter. Missions raise trust with their faction.')}</p>`;
}
function renderModal() {
  if (screen === 'title') {
    body.innerHTML = `<div class="menu"><div class="eyebrow">${tr('ПИКСЕЛЬНАЯ ИСТОРИЯ ВЫЖИВАНИЯ', 'A PIXEL SURVIVAL STORY')}</div><div class="menu-emblem">✦</div><h1>${tr('ПЕПЛОСВЕТ', 'ASHGLINT')}</h1><div class="tagline">${tr('ПОСЛЕДНИЙ КОРДОН', 'THE LAST CORDON')}</div><p class="story">${tr('Мир стих. Радио — нет.<br>За воротами кордона остались ржавые дороги, чужие следы и сигнал, которого не должно быть.<br>Соберите то, что уцелело. Найдите тех, кто остался.', 'The world went quiet. The radio did not.<br>Beyond the cordon lie rusted roads, unfamiliar tracks, and a signal that should not exist.<br>Gather what survived. Find who remains.')}</p><div class="menu-actions">${button('start', savedGame ? tr('Продолжить путь →', 'Continue journey →') : tr('Начать путь →', 'Begin journey →'), 'class="primary"')}${savedGame ? button('new', tr('Новая игра', 'New game')) : ''}${button('help', tr('Как выжить', 'How to survive'))}${button('language', lang ? 'РУССКИЙ' : 'ENGLISH')}</div><div class="build-note">${tr('АЛЬФА 0.1 · ОТКРЫТЫЙ МИР · АВТОСОХРАНЕНИЕ', 'ALPHA 0.1 · OPEN WORLD · AUTOSAVE')}</div></div>`;
  } else if (screen === 'pause') {
    body.innerHTML = heading(tr('Тихая частота', 'A quiet frequency'), tr('ИГРА ПРИОСТАНОВЛЕНА', 'GAME PAUSED')) + `<p class="muted">${tr('Прогресс сохраняется автоматически. Отдохните — мир подождёт.', 'Progress is saved automatically. Take a breath. The world will wait.')}</p><div class="menu-actions">${button('close', tr('Продолжить →', 'Resume →'), 'class="primary"')}${button('help', tr('Управление', 'Controls'))}${button('sound', tr('Звук: ', 'Sound: ') + (sound ? tr('вкл.', 'on') : tr('выкл.', 'off')))}${button('auto', tr('Автоогонь: ', 'Auto fire: ') + (autoFire ? tr('вкл.', 'on') : tr('выкл.', 'off')))}${button('touch', tr('Сенсорное управление: ', 'Touch controls: ') + (touch ? tr('вкл.', 'on') : tr('выкл.', 'off')))}${button('language', lang ? 'РУССКИЙ' : 'ENGLISH')}${button('title', tr('Главное меню', 'Main menu'))}</div><p class="muted">${platform.storageFailed ? tr('Ошибка записи в браузер.', 'Browser save failed.') : tr('Локальное сохранение работает.', 'Local saving is available.')} ${platform.player ? platform.cloudFailed ? tr('Облако временно недоступно.', 'Cloud temporarily unavailable.') : tr('Облачная синхронизация подключена.', 'Cloud sync connected.') : tr('Облако не подключено.', 'Cloud not connected.')}</p>`;
  } else if (screen === 'help') {
    body.innerHTML = heading(tr('Памятка скитальца', 'The wanderer’s guide'), tr('УПРАВЛЕНИЕ И ВЫЖИВАНИЕ', 'CONTROLS & SURVIVAL')) + `<div class="help-grid"><b>WASD / ↑↓←→</b><span>${tr('Движение. Русская раскладка тоже работает.', 'Movement. Works with any keyboard layout.')}</span><b>${tr('ЛКМ / SHIFT', 'LMB / SHIFT')}</b><span>${tr('Стрелять в сторону курсора / бежать.', 'Shoot toward the cursor / sprint.')}</span><b>SPACE / Q</b><span>${tr('Удар ножом (без патронов) / сменить оружие.', 'Knife attack (no ammo needed) / switch weapon.')}</span><b>E</b><span>${tr('Обыскать, поговорить, включить реле.', 'Loot, talk, or activate a relay.')}</span><b>1 / 2 / 3 / 4</b><span>${tr('Аптечка / еда / вода / антирад.', 'Medkit / food / water / antirad.')}</span><b>I / J / M / ESC</b><span>${tr('Рюкзак / задания / карта / пауза.', 'Inventory / missions / map / pause.')}</span><b>${tr('Касание', 'Touch')}</b><span>${tr('Левый джойстик — движение. Бой и сбор добычи автоматические; нажмите » для бега. Оружие выбирается в рюкзаке. Сенсорное управление можно включить в паузе.', 'Left joystick moves. Combat and looting are automatic; tap » to sprint. Select weapons in inventory. Enable touch controls in the pause menu.')}</span></div><p class="muted">${tr('Первый путь: выйдите через восточные ворота → обыщите два ящика → вернитесь и откройте «Задания» на кордоне. На верстаке можно создавать патроны из металлолома.', 'First trip: leave through the east gate → search two crates → return and open Missions at the cordon. Craft ammo from scrap at the workbench.')}</p><p class="muted">${tr('Зелёные лужи облучают. Голод, жажда и сильная радиация отнимают здоровье. После гибели спасатели возвращают вас на базу: теряется 30% сырья, но оружие и сюжет остаются. Отдых на кордоне полностью восстанавливает силы и обновляет добычу и мутантов.', 'Green pools irradiate you. Starvation, dehydration, and high radiation drain health. Rescuers bring you home after defeat: lose 30% of raw materials, keep weapons and story progress. Rest at the cordon fully restores you and refreshes loot and mutants.')}</p>${button('back', tr('Понятно', 'Got it'), 'class="primary" style="padding:12px 22px"')}`;
  } else if (screen === 'new') {
    body.innerHTML = heading(tr('Начать сначала?', 'Start over?'), '', false) + `<p class="muted">${tr('Текущий прогресс будет заменён новой историей.', 'Your current progress will be replaced with a new story.')}</p><div class="menu-actions">${button('fresh', tr('Начать новую игру', 'Start new game'), 'class="danger"')}${button('back', tr('Вернуться', 'Go back'))}</div>`;
  } else if (screen === 'death') {
    body.innerHTML = heading(tr('Кордон не бросает своих', 'The cordon leaves no one behind'), tr('ВАС НАШЁЛ ДОЗОР', 'THE WATCH FOUND YOU'), false) + `<p class="muted">${tr('Спасатели вынесли вас с пустоши. Потеряно 30% металлолома, провода, ткани, изотопов и биоматериала. Оружие, улучшения, жетоны и сюжет сохранены. Начался новый день.', 'Rescuers carried you out. Lost 30% of scrap, wire, cloth, isotopes, and biomatter. Weapons, upgrades, tokens, and story progress are safe. A new day begins.')}</p><div class="menu-actions">${button('close', tr('Вернуться на кордон →', 'Return to the cordon →'), 'class="primary"')}</div>`;
  } else if (screen === 'inventory') {
    body.innerHTML = heading(tr('Всё, что уцелело', 'Everything that survived'), `${tr('РЮКЗАК', 'INVENTORY')} · ${weight(state).toFixed(1)} / ${capacity(state)} ${tr('КГ', 'KG')}`) + `<div class="grid">${Object.entries(ITEMS).map(([id, item]) => `<div class="item-row">${icon(id)}<div class="item-info"><b>${name(item.name)} <span style="color:var(--gold)">×${state.inv[id]}</span></b><small>${item.weight} ${tr('кг', 'kg')} · ${item.price} ◈</small></div>${['medkit', 'food', 'water', 'antidote'].includes(id) ? button(`use:${id}`, tr('Исп.', 'Use'), !state.inv[id] ? 'disabled' : '') : ''}</div>`).join('')}</div><div class="section-title">${tr('Оружие', 'Weapons')}</div><div class="grid">${state.weapons.map(id => `<div class="item-row"><div class="item-info"><b>${name(WEAPONS[id].name)}</b><small>${tr('Урон', 'Damage')} ${WEAPONS[id].damage + (state.upgrades.includes('barrel') ? 7 : 0)}${WEAPONS[id].pellets > 1 ? ' ×5' : ''}</small></div>${button(`equip:${id}`, state.weapon === id ? '✓' : tr('Взять', 'Equip'), state.weapon === id ? 'disabled' : '')}</div>`).join('')}</div><p class="muted">${tr('Улучшения', 'Upgrades')}: ${state.upgrades.map(id => name(RECIPES[id].name)).join(', ') || tr('пока нет', 'none yet')}</p>`;
  } else if (screen === 'journal') {
    body.innerHTML = heading(tr('По следу сигнала', 'Following the signal'), tr('ЖУРНАЛ СКИТАЛЬЦА', 'WANDERER’S JOURNAL')) + questHTML(false) + `<div class="section-title">${tr('Фракции', 'Factions')}</div>` + factionHTML();
  } else if (screen === 'map') {
    body.innerHTML = heading(tr('За пределами кордона', 'Beyond the cordon'), tr('КАРТА РАЙОНА', 'REGION MAP')) + '<canvas id="big-map" class="full-map" width="700" height="557"></canvas>' + `<div class="map-legend"><span style="color:#e8e3b6">● ${tr('Вы', 'You')}</span><span style="color:#91b58f">■ ${tr('Кордон', 'Cordon')}</span><span style="color:#d3b16d">◇ ${tr('Сюжетная цель', 'Mission target')}</span><span>${tr('Затемнённое — ещё не исследовано', 'Dimmed — unexplored')}</span></div>`;
    drawMap($('big-map').getContext('2d'), 700, 557, true);
  } else if (screen === 'camp') {
    const tabs = { trade: tr('Торговля', 'Trade'), craft: tr('Верстак', 'Workbench'), quests: tr('Задания', 'Missions'), factions: tr('Фракции', 'Factions'), rest: tr('Отдых', 'Rest') };
    body.innerHTML = heading(tr('Кордон «Тлеющий»', 'Ember Cordon'), `${tr('УБЕЖИЩЕ', 'SHELTER')} · ${state.credits} ◈`) + `<nav class="tabs">${Object.entries(tabs).map(([id, text]) => button(`tab:${id}`, text, tab === id ? 'class="active"' : '')).join('')}</nav>`;
    if (tab === 'trade') {
      body.innerHTML += `<div class="muted">${tr('Борис · интендант Дозора. «Детали беру. Патроны берегите».', 'Boris · Watch quartermaster. “I buy parts. Save your bullets.”')}</div><div class="section-title">${tr('Припасы', 'Supplies')}</div><div class="grid">${['ammo', 'medkit', 'food', 'water', 'antidote'].map(id => {
        const qty = id === 'ammo' ? 18 : 1, price = Math.ceil(ITEMS[id].price * qty * 1.45 * (state.rep.mechanics >= 30 ? .85 : 1));
        return `<div class="item-row">${icon(id)}<div class="item-info"><b>${label(id)}${qty > 1 ? ` ×${qty}` : ''}</b><small>${tr('В рюкзаке', 'In pack')}: ${state.inv[id]}</small></div>${button(`buy:${id}`, `${price} ◈`, state.credits < price ? 'disabled' : '')}</div>`;
      }).join('')}</div><div class="section-title">${tr('Продать сырьё', 'Sell materials')}</div><div class="grid">${['scrap', 'wire', 'cloth', 'crystal', 'biomass', 'battery'].map(id => `<div class="item-row">${icon(id)}<div class="item-info"><b>${label(id)} ×${state.inv[id]}</b><small>${tr('Продажа 1 шт.', 'Sell one')}</small></div>${button(`sell:${id}`, `+${ITEMS[id].price} ◈`, !state.inv[id] ? 'disabled' : '')}</div>`).join('')}</div><div class="section-title">${tr('Арсенал Дозора', 'Watch armory')}</div><div class="grid">${Object.entries(WEAPONS).filter(([id]) => id !== 'pistol').map(([id, w]) => `<div class="item-row"><div class="item-info"><b>${name(w.name)}</b><small>${tr('Репутация Дозора', 'Watch reputation')} ${w.rank} · ${tr('Урон', 'Damage')} ${w.damage}${w.pellets > 1 ? ' ×5' : ''}</small></div>${button(`weapon:${id}`, state.weapons.includes(id) ? '✓' : `${w.price} ◈`, state.weapons.includes(id) || state.credits < w.price || state.rep[w.rep] < w.rank ? 'disabled' : '')}</div>`).join('')}</div>`;
    } else if (tab === 'craft') {
      body.innerHTML += `<p class="muted">${tr('Мира · механик Артели. Улучшения устанавливаются сразу на всё оружие или снаряжение.', 'Mira · Guild mechanic. Upgrades apply immediately to all weapons or equipment.')}</p><div class="grid">${Object.entries(RECIPES).map(([id, r]) => {
        const installed = r.upgrade && state.upgrades.includes(r.upgrade), locked = r.rep && state.rep[r.rep] < r.rank;
        return `<div class="item-row">${icon(ITEMS[id] ? id : 'battery')}<div class="item-info"><b>${name(r.name)}</b><small>${qtyText(r.cost)}</small>${r.desc ? `<small>${name(r.desc)}</small>` : ''}${locked ? `<small style="color:var(--gold)">${name(FACTIONS[r.rep].name)}: ${r.rank}</small>` : ''}</div>${button(`craft:${id}`, installed ? '✓' : tr('Создать', 'Craft'), installed || locked || !affordable(state, r.cost) ? 'disabled' : '')}</div>`;
      }).join('')}</div>`;
    } else if (tab === 'quests') body.innerHTML += questHTML(true);
    else if (tab === 'factions') body.innerHTML += factionHTML();
    else body.innerHTML += `<div class="quest-card"><div class="eyebrow">${tr('У КОСТРА', 'BY THE FIRE')}</div><h3>${tr('Завтра будет новый день', 'Tomorrow is another day')}</h3><p>${tr('Бесплатный отдых восстанавливает здоровье, сытость и воду, снимает радиацию. Мир обновится: в пустоши появятся новые припасы и мутанты. Сюжетные объекты останутся активированы.', 'Free rest restores health, hunger, and thirst and removes radiation. The wasteland refreshes with supplies and mutants. Activated story objects stay active.')}</p>${button('rest', tr('Отдохнуть до утра', 'Rest until morning'), 'class="primary"')}</div><div class="item-row">${icon('medkit')}<div class="item-info"><b>${tr('Посылка снабжения', 'Supply delivery')}</b><small>${tr('Одна аптечка за добровольный просмотр рекламы.', 'One medkit for voluntarily watching an ad.')}${platform.local ? ' ' + tr('Доступно в Яндекс Играх.', 'Available on Yandex Games.') : ''}</small></div>${button('reward', tr('Смотреть рекламу', 'Watch ad'), platform.local || adBusy || weight(state) + .5 > capacity(state) ? 'disabled' : '')}</div>`;
  }
  drawIcons();
}

function updateHud() {
  const vitals = [
    ['hp', tr('ЗДОРОВЬЕ', 'HEALTH'), '#b4be8f'], ['hunger', tr('СЫТОСТЬ', 'HUNGER'), '#c2a270'], ['thirst', tr('ВОДА', 'WATER'), '#7fa9a8'], ['rad', tr('РАДИАЦИЯ', 'RADIATION'), '#b8c277'], ['stamina', tr('ВЫНОСЛИВОСТЬ', 'STAMINA'), '#869875'],
  ];
  $('vitals').innerHTML = `<div class="survivor"><canvas id="portrait" class="portrait" width="24" height="30"></canvas><div><b>${tr('СКИТАЛЕЦ', 'WANDERER')}</b><small>${safe(state) ? tr('НА КОРДОНЕ', 'AT THE CORDON') : tr('В ВЫЛАЗКЕ', 'ON EXPEDITION')}</small></div></div>${vitals.map(([id, text, color]) => `<div class="stat"><div class="stat-label"><span>${text}</span><span>${Math.ceil(state[id])}${id === 'rad' ? '%' : ''}</span></div><div class="track"><div class="fill" style="width:${state[id]}%;background:${id !== 'rad' && state[id] < 25 ? '#ce8068' : color}"></div></div></div>`).join('')}<div class="wallet"><b>◈ ${state.credits}</b><span>${weight(state).toFixed(1)} / ${capacity(state)} ${tr('кг', 'kg')}</span></div>`;
  drawPerson($('portrait').getContext('2d'), 12, 28, 0);
  const q = QUESTS[state.quest];
  $('mission').innerHTML = `<span class="eyebrow">${tr('ТЕКУЩАЯ ЦЕЛЬ', 'CURRENT OBJECTIVE')} <span>J ↗</span></span><b>${q ? name(q.title) : tr('Кордон живёт', 'The cordon lives')}</b><p>${q ? questProgress(q) : tr('Исследуйте. Созидайте. Выживайте.', 'Explore. Rebuild. Survive.')}</p><span class="mission-step">${q ? questReady(state) ? tr('✓ ВЕРНИТЕСЬ НА КОРДОН', '✓ RETURN TO THE CORDON') : `${tr('ГЛАВА', 'CHAPTER')} 0${state.quest + 1} / 06` : tr('КАМПАНИЯ ЗАВЕРШЕНА', 'CAMPAIGN COMPLETE')}</span>`;
  const minutes = Math.floor(state.time / 10), hour = 7 + Math.floor(minutes / 60);
  $('day').textContent = `${tr('ДЕНЬ', 'DAY')} ${String(state.day).padStart(2, '0')} · ${String(hour % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  $('location').textContent = `${safe(state) ? '⌂' : '◇'} ${name(ZONES[zoneAt(state)].name)}`;
  $('weapon-slot').innerHTML = `<canvas id="weapon-icon" width="40" height="20" aria-hidden="true"></canvas><div><b>${name(WEAPONS[state.weapon].name)}</b><small>${state.inv.ammo} ${tr('ПАТР.', 'ROUNDS')} · Q ↻</small></div>`;
  const g = $('weapon-icon').getContext('2d'); g.fillStyle = '#aeb5a0'; g.fillRect(4, 6, state.weapon === 'pistol' ? 24 : 34, 4); g.fillStyle = '#687e71'; g.fillRect(9, 9, 16, 3); g.fillStyle = '#b08f61'; g.fillRect(5, 10, 7, 7); g.fillRect(29, 8, 7, 2);
  if (!$('quick-items').children.length) {
    $('quick-items').innerHTML = ['medkit', 'food', 'water', 'antidote'].map((id, i) => `<button class="quick" data-item="${id}"><span class="key">${i + 1}</span>${icon(id)}<span class="qty"></span></button>`).join('');
    $('quick-items').querySelectorAll('[data-icon]').forEach(c => drawItem(c.getContext('2d'), c.dataset.icon));
  }
  $('quick-items').querySelectorAll('[data-item]').forEach((b, i) => { b.ariaLabel = `${label(b.dataset.item)}: ${state.inv[b.dataset.item]}`; b.title = `${label(b.dataset.item)} · ${i + 1}`; b.querySelector('.qty').textContent = state.inv[b.dataset.item]; });
  $('map-coords').innerHTML = `<span>${Math.floor(state.x / 32)} : ${Math.floor(state.y / 32)}</span><span>${safe(state) ? tr('● БЕЗОПАСНО', '● SAFE') : radiation(state) > .05 ? tr('☢ ФОН', '☢ RADIATION') : tr('● ПУСТОШЬ', '● WASTELAND')}</span>`;
  drawMap(mapCtx, 180, 130);
}

function objectivePoints() {
  if (questReady(state)) return [POINTS[0]];
  const q = QUESTS[state.quest];
  if (state.quest === 0) return [{ x: 858, y: 1445 }];
  if (q?.flags) return POINTS.filter(p => q.flags.includes(p.id) && !state.flags.includes(p.id));
  return q?.target ? [q.target] : [];
}
function drawMap(g, w, h, full = false) {
  g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false;
  g.drawImage(terrain, 0, 0, w, h); g.fillStyle = '#152c2566'; g.fillRect(0, 0, w, h);
  const sx = w / SIZE.w, sy = h / SIZE.h;
  for (const b of world.solids) if (b.w > 40) { g.fillStyle = '#899277'; g.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy); }
  g.fillStyle = '#0c171ba6';
  for (let y = 0; y < 14; y++) for (let x = 0; x < 18; x++) if (!state.explored.includes(`${x},${y}`)) g.fillRect(x * w / 18, y * h / 14, Math.ceil(w / 18), Math.ceil(h / 14));
  g.strokeStyle = '#cfce9920'; g.lineWidth = 1;
  for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 8); g.lineTo(w, i * h / 8); g.stroke(); }
  for (const p of POINTS) { g.fillStyle = p.id === 'home' ? '#aec393' : state.flags.includes(p.id) ? '#7db893' : '#8e947c'; g.fillRect(p.x * sx - 2, p.y * sy - 2, 5, 5); }
  if (full) for (const z of ZONES) { g.fillStyle = '#e3dfb9'; g.font = '12px Segoe UI, Arial'; g.textAlign = 'center'; g.fillText(name(z.name), z.x * sx, z.y * sy + 20); }
  for (const p of objectivePoints()) { g.strokeStyle = '#e4b973'; g.lineWidth = full ? 2 : 1; g.strokeRect(p.x * sx - 5, p.y * sy - 5, 10, 10); }
  const px = state.x * sx, py = state.y * sy; g.fillStyle = '#f2ebca'; g.beginPath(); g.moveTo(px + 5 * Math.cos(angle), py + 5 * Math.sin(angle)); g.lineTo(px + 4 * Math.cos(angle + 2.5), py + 4 * Math.sin(angle + 2.5)); g.lineTo(px + 4 * Math.cos(angle - 2.5), py + 4 * Math.sin(angle - 2.5)); g.closePath(); g.fill();
}

function consume(id) {
  if (!started) return;
  if (useItem(state, id)) { toast(`${label(id)} · ${tr('использовано', 'used')}`); sfx('good'); save(); updateHud(); }
  else toast(tr('Не требуется или предмет закончился.', 'Not needed, or none left.'), true);
}
function loot(l) {
  if (!exchange(state, {}, l.contents)) { toast(tr('Рюкзак полон. Продайте сырьё на кордоне.', 'Pack full. Sell materials at the cordon.'), true); interactCooldown = 3; return; }
  state.looted.push(l.id); state.drops = state.drops.filter(n => n.id !== l.id); world.loot = world.loot.filter(n => n !== l); sfx('loot'); toast('+ ' + qtyText(l.contents)); save(); updateHud();
}
function findInteraction() {
  if (safe(state) && distance(state, HOME) < 120) return { type: 'camp', label: tr('Кордон · торговля, верстак, задания', 'Cordon · trade, workbench, missions') };
  const l = world.loot.filter(o => distance(state, o) < 38).sort((a, b) => distance(a, state) - distance(b, state))[0];
  if (l) return { type: 'loot', object: l, label: tr('Собрать: ', 'Collect: ') + qtyText(l.contents) };
  const p = POINTS.find(p => p.id !== 'home' && distance(state, p) < 49);
  if (p) return { type: 'point', object: p, label: name(p.name) + (state.flags.includes(p.id) ? ' ✓' : tr(' · исследовать', ' · investigate')) };
  return null;
}
function interact() {
  if (!active || interactCooldown > 0) return;
  interaction = findInteraction(); if (!interaction) return;
  interactCooldown = .4;
  if (interaction.type === 'camp') openModal('camp', questReady(state) ? 'quests' : 'trade');
  else if (interaction.type === 'loot') loot(interaction.object);
  else {
    const p = interaction.object;
    if (state.flags.includes(p.id)) { toast(tr('Уже активировано. Сигнал стабилен.', 'Already active. Signal stable.')); return; }
    if (p.id === 'signal') {
      if (state.quest < 2) { toast(tr('Странный сигнал. «Контур» поможет его расшифровать в главе 3.', 'A strange signal. The Circuit can decode it in chapter 3.')); return; }
      if (!state.upgrades.includes('scanner')) { toast(tr('Нужен сканер частоты. Создайте его на верстаке.', 'A frequency scanner is required. Craft one at the workbench.'), true); return; }
      state.flags.push('signal'); toast(tr('«…станция Ноль… мы ещё здесь…» Сигнал записан.', '“…Station Zero… we are still here…” Signal recorded.'));
    } else {
      if (state.quest < 4) { toast(tr('Реле обесточено. Вернитесь по заданию «Два огня».', 'The relay is offline. Return during “Two lights”.')); return; }
      if (!exchange(state, { battery: 1 })) { toast(tr('Нужна энергоячейка с верстака.', 'Craft a power cell at the workbench.'), true); return; }
      state.flags.push(p.id); toast(tr('Реле запитано. Вдалеке ответил второй голос.', 'Relay powered. A second voice answers in the distance.'));
    }
    sfx('good'); save(); updateHud();
  }
}
function action(id) {
  if (adBusy) return;
  const [kind, arg] = id.split(':');
  if (kind === 'close') { if (started) closeModal(); else openModal('title'); return; }
  if (kind === 'start') { start(); return; }
  if (kind === 'fresh') { start(true); return; }
  if (kind === 'new') { openModal('new'); return; }
  if (kind === 'back') { openModal(started ? 'pause' : 'title'); return; }
  if (kind === 'help') { openModal('help'); return; }
  if (kind === 'title') { save(); started = false; openModal('title'); return; }
  if (kind === 'language') { lang = 1 - lang; applyLanguage(); renderModal(); return; }
  if (kind === 'sound') { sound = !sound; updateSound(); initAudio(); sync(); renderModal(); return; }
  if (kind === 'auto') { autoFire = !autoFire; renderModal(); return; }
  if (kind === 'touch') { touch = !touch; autoFire = touch; applyLanguage(); renderModal(); return; }
  if (!started) return;
  if (kind === 'tab') { tab = arg; renderModal(); return; }
  if (kind === 'use') { consume(arg); renderModal(); return; }
  if (kind === 'equip') { if (state.weapons.includes(arg)) state.weapon = arg; }
  if (['craft', 'buy', 'sell', 'weapon', 'claim', 'contract', 'rest', 'reward'].includes(kind) && (!safe(state) || screen !== 'camp')) return;
  let ok = true;
  if (kind === 'craft') ok = craft(state, arg);
  if (kind === 'buy' || kind === 'sell') ok = trade(state, arg, kind === 'buy');
  if (kind === 'weapon') ok = buyWeapon(state, arg);
  if (kind === 'claim') { ok = claimQuest(state); if (ok) toast(state.quest === QUESTS.length ? tr('Сигнал восстановлен. Вы дали кордону будущее.', 'Signal restored. You gave the cordon a future.') : tr('Задание выполнено. Открыта новая глава.', 'Mission complete. A new chapter begins.')); }
  if (kind === 'contract') {
    ok = state.contractDay !== state.day && exchange(state, { scrap: 6, cloth: 2 });
    if (ok) { state.credits += 65; state.rep.mechanics = Math.min(100, state.rep.mechanics + 5); state.contract++; state.contractDay = state.day; }
  }
  if (kind === 'rest') { respawn(state); hydrate(); toast(tr('Вы отдохнули. Новый день, новые возможности.', 'Well rested. A new day, new possibilities.')); }
  if (kind === 'reward') { reward(); return; }
  if (!ok) toast(tr('Недостаточно ресурсов, репутации или места в рюкзаке.', 'Not enough resources, reputation, or pack space.'), true);
  else { sfx('good'); save(); }
  renderModal(); updateHud();
}
async function reward() {
  if (platform.local || adBusy || weight(state) + .5 > capacity(state)) return;
  adBusy = true; renderModal();
  const granted = await platform.reward(value => hold('advert', value));
  adBusy = false;
  if (granted && exchange(state, {}, { medkit: 1 })) { save(); toast(tr('Посылка получена: аптечка ×1.', 'Delivery received: medkit ×1.')); }
  else toast(tr('Награда не получена: реклама не завершена или недоступна.', 'No reward: ad incomplete or unavailable.'));
  renderModal(); updateHud();
}

function lineClear(a, b) {
  const n = Math.ceil(distance(a, b) / 8);
  for (let i = 1; i < n; i++) if (collision(world, a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, 1)) return false;
  return true;
}
function visibleEnemies(range) { return world.enemies.filter(e => e.hp > 0 && (e.kind !== 'keeper' || state.quest >= 5) && distance(e, state) < range).sort((a, b) => distance(a, state) - distance(b, state)); }
function attack(knife = false, automatic = false) {
  if (shotCooldown > 0 || !active) return;
  const w = WEAPONS[state.weapon], range = w.range + (state.upgrades.includes('sight') ? 60 : 0);
  if (!state.inv.ammo) knife = true;
  if (automatic || knife || touch) {
    const target = visibleEnemies(knife ? 43 : range).find(e => lineClear(state, e));
    if (!target) { if (!automatic) shotCooldown = .15; return; }
    angle = Math.atan2(target.y - state.y, target.x - state.x);
  }
  if (knife) {
    shotCooldown = .42; sfx('knife');
    for (const e of visibleEnemies(43)) if (lineClear(state, e) && Math.cos(Math.atan2(e.y - state.y, e.x - state.x) - angle) > -.2) damageEnemy(e, 24);
    particles.push({ x: state.x + Math.cos(angle) * 20, y: state.y + Math.sin(angle) * 20, life: .15, max: .15, color: '#e0d4ae', size: 14 }); return;
  }
  state.inv.ammo--; shotCooldown = w.rate; sfx('shot');
  for (let i = 0; i < w.pellets; i++) {
    const a = angle + (i - (w.pellets - 1) / 2) * .075;
    bullets.push({ x: state.x, y: state.y - 5, vx: Math.cos(a) * 650, vy: Math.sin(a) * 650, remaining: range, damage: w.damage + (state.upgrades.includes('barrel') ? 7 : 0), hostile: false });
  }
  particles.push({ x: state.x + Math.cos(angle) * 24, y: state.y - 6 + Math.sin(angle) * 24, life: .07, max: .07, color: '#f3d694', size: 8 });
}
function damageEnemy(e, damage) {
  if (e.hp <= 0) return;
  e.hp -= damage; e.hit = .12;
  particles.push({ x: e.x, y: e.y - 15, life: .5, max: .5, color: '#e3c88e', text: String(damage), size: 2 });
  if (e.hp <= 0) {
    state.kills++; state.dead.push(e.id);
    if (e.kind === 'keeper') { state.flags.push('keeper'); toast(tr('Хранитель пал. Возвращайтесь на кордон.', 'The Keeper has fallen. Return to the cordon.')); }
    const drop = { id: 'd' + e.id, x: e.x, y: e.y, type: 'drop', contents: { biomass: e.kind === 'keeper' ? 5 : e.kind === 'brute' ? 2 : 1, ...(e.kind === 'keeper' ? { crystal: 5 } : {}) } };
    world.loot.push(drop); state.drops.push(drop);
    state.credits += e.kind === 'keeper' ? 100 : 4;
    sfx('hit'); save();
  }
}
function hurt(amount) {
  if (hurtCooldown > 0 || safe(state)) return;
  state.hp -= amount * (state.upgrades.includes('armor') ? .7 : 1); hurtCooldown = .6; hitFlash = .2; sfx('hit');
}
function update(dt) {
  state.time += dt; clock += dt; shotCooldown -= dt; hurtCooldown -= dt; interactCooldown -= dt; hitFlash = Math.max(0, hitFlash - dt);
  const safeZone = safe(state), speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') || sprintTouch) && state.stamina > 1 ? 136 : 86;
  let dx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + stick.x;
  let dy = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + stick.y;
  const len = Math.hypot(dx, dy); if (len > 1) { dx /= len; dy /= len; }
  if (len > .12) {
    move(world, state, dx * speed * dt, dy * speed * dt); walk += dt * (speed > 100 ? 18 : 12);
    if (touch || !mouse.aim) angle = Math.atan2(dy, dx);
    state.stamina = clamp(state.stamina + (speed > 100 ? -22 : 12) * dt, 0, 100);
    if (state.stamina <= 1) sprintTouch = false;
    stepClock += dt; if (stepClock > .32) { sfx('step'); stepClock = 0; }
  } else state.stamina = Math.min(100, state.stamina + dt * 18);
  if (!touch && mouse.aim) angle = Math.atan2(mouse.y + cam.y - state.y, mouse.x + cam.x - state.x);
  if (keys.has('Space')) attack(true);
  else if (mouse.down) attack(false, touch);
  else if (autoFire && !safeZone) attack(false, true);
  state.hunger = Math.max(0, state.hunger - dt * (speed > 100 && len > 0 ? .095 : .045));
  state.thirst = Math.max(0, state.thirst - dt * (speed > 100 && len > 0 ? .15 : .07));
  const rad = radiation(state);
  state.rad = clamp(state.rad + (rad > .04 ? rad * (state.upgrades.includes('filter') ? .35 : 1) * 2.6 : safeZone ? -3 : -.06) * dt, 0, 100);
  if (!safeZone) state.hp -= dt * ((state.hunger <= 0 ? 1.5 : 0) + (state.thirst <= 0 ? 2 : 0) + (state.rad > 70 ? (state.rad - 70) * .065 : 0));
  else state.hp = Math.min(100, state.hp + dt * 3);
  // ponytail: direct scans are sufficient for this fixed, small enemy population.
  for (const e of world.enemies) {
    if (e.hp <= 0 || distance(e, state) > 560) continue;
    e.hit = Math.max(0, e.hit - dt); e.cool -= dt;
    if (e.kind === 'keeper' && state.quest < 5) continue;
    const d = distance(e, state), chase = !safeZone && d < (e.kind === 'keeper' ? 340 : 230);
    let targetX = e.homeX + Math.cos(clock * .3 + e.phase) * 20, targetY = e.homeY + Math.sin(clock * .3 + e.phase) * 20;
    if (chase) { targetX = state.x; targetY = state.y; }
    const a = Math.atan2(targetY - e.y, targetX - e.x), speed = chase ? e.kind === 'hound' ? 65 : e.kind === 'keeper' ? 44 : 38 : 12;
    if ((!chase || d > (e.kind === 'spitter' ? 110 : 18)) && Math.hypot(targetX - e.x, targetY - e.y) > 3) {
      const beforeX = e.x, beforeY = e.y;
      move(world, e, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt, e.kind === 'keeper' ? 13 : 7);
      // ponytail: local steering handles sparse ruins; use grid pathfinding if denser layouts trap enemies.
      if (chase && Math.hypot(e.x - beforeX, e.y - beforeY) < speed * dt * .35) move(world, e, Math.cos(a + 1.1) * speed * dt, Math.sin(a + 1.1) * speed * dt);
    }
    if (chase && d < (e.kind === 'keeper' ? 35 : 25) && e.cool <= 0) { hurt(e.kind === 'keeper' ? 24 : e.kind === 'brute' ? 15 : 9); e.cool = e.kind === 'hound' ? .95 : 1.3; }
    if (chase && (e.kind === 'spitter' || e.kind === 'keeper') && d < 235 && d > 55 && e.cool <= 0 && lineClear(e, state)) {
      e.cool = e.kind === 'keeper' ? 1.3 : 2.1;
      for (let i = 0; i < (e.kind === 'keeper' ? 3 : 1); i++) { const aim = a + (e.kind === 'keeper' ? (i - 1) * .16 : 0); bullets.push({ x: e.x, y: e.y, vx: Math.cos(aim) * 125, vy: Math.sin(aim) * 125, remaining: 300, hostile: true, damage: e.kind === 'keeper' ? 17 : 12 }); }
    }
  }
  for (const b of bullets) {
    const travel = Math.hypot(b.vx, b.vy) * dt, steps = Math.max(1, Math.ceil(travel / 5));
    for (let i = 0; i < steps && b.remaining > 0; i++) {
      b.x += b.vx * dt / steps; b.y += b.vy * dt / steps; b.remaining -= travel / steps;
      if (collision(world, b.x, b.y, 1)) { b.remaining = 0; break; }
      if (b.hostile) { if (distance(b, state) < 10) { hurt(b.damage); b.remaining = 0; } }
      else { const e = world.enemies.find(e => e.hp > 0 && (e.kind !== 'keeper' || state.quest >= 5) && distance(e, { x: b.x, y: b.y + 5 }) < (e.kind === 'keeper' ? 24 : 13)); if (e) { damageEnemy(e, b.damage); b.remaining = 0; } }
    }
  }
  bullets = bullets.filter(b => b.remaining > 0); particles.forEach(p => { p.life -= dt; }); particles = particles.filter(p => p.life > 0);
  if (state.hp <= 0) { respawn(state, true); hydrate(); openModal('death'); updateHud(); return; }
  const gx = Math.floor(state.x / SIZE.w * 18), gy = Math.floor(state.y / SIZE.h * 14);
  for (let y = Math.max(0, gy - 1); y <= Math.min(13, gy + 1); y++) for (let x = Math.max(0, gx - 1); x <= Math.min(17, gx + 1); x++) if (!state.explored.includes(`${x},${y}`)) state.explored.push(`${x},${y}`);
  interaction = findInteraction();
  $('interact').hidden = !interaction;
  if (interaction) $('interact').innerHTML = `${touch ? '' : '<kbd>E</kbd>'}${esc(interaction.label)}`;
  if (touch && interaction?.type === 'loot' && interactCooldown <= 0) interact();
  const zone = zoneAt(state);
  if (lastZone !== zone) {
    lastZone = zone; $('zone-title').innerHTML = `<small>${name(ZONES[zone].sub)}</small>${name(ZONES[zone].name)}`; $('zone-title').classList.add('show'); zoneTimer = 3.5;
  }
  zoneTimer -= dt; if (zoneTimer <= 0) $('zone-title').classList.remove('show');
  hudClock += dt; saveClock += dt;
  if (hudClock >= .25) { hudClock = 0; updateHud(); }
  if (saveClock >= 10) { saveClock = 0; save(); }
}

function resize() {
  // Use CSS pixels / 2.5 for crisp, readable pixel art independent of device pixel ratio.
  const scale = innerWidth < 650 ? 2 : 2.5;
  canvas.width = Math.ceil(innerWidth / scale); canvas.height = Math.ceil(innerHeight / scale);
  ctx.imageSmoothingEnabled = false;
}
function render() {
  const w = canvas.width, h = canvas.height;
  cam.x = Math.floor(clamp(state.x - w / 2, 0, SIZE.w - w)); cam.y = Math.floor(clamp(state.y - h / 2 + 20, 0, SIZE.h - h));
  ctx.drawImage(terrain, cam.x, cam.y, w, h, 0, 0, w, h);
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  const inView = o => o.x > cam.x - 200 && o.y > cam.y - 120 && o.x < cam.x + w + 100 && o.y < cam.y + h + 180;
  for (const p of POINTS) {
    if (!inView(p)) continue;
    ctx.strokeStyle = p.id === 'home' ? '#c6c18e38' : '#b1c58d45'; ctx.lineWidth = 1; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.ellipse(p.x, p.y, p.id === 'home' ? 53 : 22, p.id === 'home' ? 25 : 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  const entities = [...world.decor.filter(inView).map(o => ({ y: o.y + (o.h || 0), draw: () => drawObject(ctx, o, clock, lang) })), ...world.loot.filter(inView).map(l => ({ y: l.y, draw: () => drawLoot(ctx, l, clock) })), ...world.enemies.filter(e => e.hp > 0 && inView(e)).map(e => ({ y: e.y, draw: () => drawEnemy(ctx, e, clock) })), { y: state.y, draw: () => { if (hurtCooldown <= 0 || Math.floor(clock * 20) % 2 === 0) drawPerson(ctx, state.x, state.y, angle, walk); } }];
  entities.sort((a, b) => a.y - b.y); entities.forEach(e => e.draw());
  for (const b of bullets) { ctx.fillStyle = b.hostile ? '#bfd38a' : '#eed6a0'; ctx.fillRect(Math.floor(b.x), Math.floor(b.y), b.hostile ? 4 : 3, b.hostile ? 4 : 1); }
  for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life / p.max * 2); ctx.fillStyle = p.color; if (p.text) { ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText(p.text, p.x, p.y - (p.max - p.life) * 25); } else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  ctx.globalAlpha = 1;
  for (const o of world.decor.filter(o => o.type === 'npc' && distance(state, o) < 150)) {
    const text = o.kind === 'trader' ? tr('БОРИС · ТОРГОВЛЯ', 'BORIS · TRADE') : o.kind === 'mechanic' ? tr('МИРА · ВЕРСТАК', 'MIRA · WORKBENCH') : tr('ЯН · КОНТУР', 'YAN · CIRCUIT');
    ctx.font = '6px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#17251be6'; ctx.fillRect(o.x - 38, o.y - 40, 76, 10); ctx.fillStyle = '#d4d2ab'; ctx.fillText(text, o.x, o.y - 33);
  }
  if (interaction?.object) { const l = interaction.object; ctx.strokeStyle = '#e4ca85'; ctx.lineWidth = 1; ctx.strokeRect(l.x - 15, l.y - 20, 30, 28); }
  ctx.restore();
  // A mild evening tint keeps the world legible; no opaque night filter.
  const night = Math.max(0, Math.sin(state.time / 800 - 1)) * .2;
  ctx.fillStyle = `rgba(12,29,36,${.06 + night})`; ctx.fillRect(0, 0, w, h);
  for (const o of world.decor.filter(o => (o.type === 'fire' || o.type === 'lamp') && inView(o))) {
    const x = o.x - cam.x, y = o.y - cam.y - (o.type === 'lamp' ? 40 : 8), radius = o.type === 'fire' ? 55 : 44;
    const gradient = ctx.createRadialGradient(x, y, 2, x, y, radius); gradient.addColorStop(0, '#e9b6602d'); gradient.addColorStop(1, '#e9b66000'); ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.fillStyle = '#cdd4b133';
  for (let i = 0; i < 32; i++) { const x = ((i * 97 + clock * (3 + i % 4) - cam.x * .2) % w + w) % w, y = ((i * 47 + clock * 3 - cam.y * .2) % h + h) % h; ctx.fillRect(x, y, 1, 1); }
  if (hitFlash > 0) { ctx.fillStyle = `rgba(153,59,42,${hitFlash})`; ctx.fillRect(0, 0, w, h); }
  const goal = objectivePoints()[0];
  if (goal && !safe(state) && distance(state, goal) > 120) {
    const a = Math.atan2(goal.y - state.y, goal.x - state.x), x = w / 2 + Math.cos(a) * 65, y = h / 2 - 20 + Math.sin(a) * 55;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#e6be75bb'; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -3); ctx.lineTo(-3, 3); ctx.fill(); ctx.restore();
  }
  if (!touch && mouse.aim && active) { ctx.strokeStyle = '#e5d8b0bb'; ctx.lineWidth = 1; const x = Math.floor(mouse.x), y = Math.floor(mouse.y); ctx.strokeRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#eee2b5'; ctx.fillRect(x, y, 1, 1); }
}
function frame(now) {
  const dt = Math.min((now - last) / 1000 || 0, .04); last = now;
  if (active) update(dt);
  render(); requestAnimationFrame(frame);
}

body.addEventListener('click', e => { const b = e.target.closest('[data-action]'); if (b && !b.disabled) action(b.dataset.action); });
$('quick-items').addEventListener('click', e => { const b = e.target.closest('[data-item]'); if (b && active) consume(b.dataset.item); });
$('inventory').onclick = () => { if (active) openModal('inventory'); };
$('journal').onclick = $('mission').onclick = () => { if (active) openModal('journal'); };
$('map-open').onclick = () => { if (active) openModal('map'); };
$('pause').onclick = () => { if (active) openModal('pause'); };
$('sound').onclick = () => { sound = !sound; updateSound(); initAudio(); sync(); };
$('interact').onclick = interact;
modal.addEventListener('cancel', e => { e.preventDefault(); if (adBusy) return; if (started && !['new', 'title'].includes(screen)) closeModal(); else openModal('title'); });
window.addEventListener('keydown', e => {
  if (active && ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'Escape') { if (active) { e.preventDefault(); openModal('pause'); } return; }
  if (!active) return;
  keys.add(e.code);
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyI' || e.code === 'Tab') openModal('inventory');
  if (e.code === 'KeyJ') openModal('journal');
  if (e.code === 'KeyM') openModal('map');
  if (e.code === 'KeyP') openModal('pause');
  if (e.code === 'KeyQ') { state.weapon = state.weapons[(state.weapons.indexOf(state.weapon) + 1) % state.weapons.length]; updateHud(); save(); }
  if (/^Digit[1-4]$/.test(e.code)) consume(['medkit', 'food', 'water', 'antidote'][Number(e.code.at(-1)) - 1]);
});
window.addEventListener('keyup', e => keys.delete(e.code));
canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width * canvas.width; mouse.y = (e.clientY - r.top) / r.height * canvas.height; mouse.aim = e.pointerType !== 'touch'; });
canvas.addEventListener('pointerdown', e => { if (active && e.button === 0 && e.pointerType !== 'touch') { canvas.setPointerCapture(e.pointerId); mouse.down = true; initAudio(); } });
window.addEventListener('pointerup', () => { mouse.down = false; });
window.addEventListener('pointercancel', () => { mouse.down = false; });
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());
window.addEventListener('blur', () => { hold('blur', true); save(); });
window.addEventListener('focus', () => hold('blur', false));
document.addEventListener('visibilitychange', () => { hold('hidden', document.hidden); if (document.hidden) save(); });
window.addEventListener('pagehide', save);
window.addEventListener('resize', resize);
const stickEl = $('stick');
function setStick(e) {
  const r = stickEl.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2, d = Math.max(1, Math.hypot(dx, dy) / 32);
  stick.x = dx / d / 32; stick.y = dy / d / 32; stickEl.firstElementChild.style.transform = `translate(${stick.x * 28}px,${stick.y * 28}px)`;
}
stickEl.onpointerdown = e => { if (!active) return; stick.id = e.pointerId; stickEl.setPointerCapture(e.pointerId); setStick(e); initAudio(); };
stickEl.onpointermove = e => { if (e.pointerId === stick.id) setStick(e); };
stickEl.onpointerup = stickEl.onpointercancel = e => { if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; stickEl.firstElementChild.style.transform = ''; } };
$('touch-attack').onpointerdown = e => { if (active) { e.currentTarget.setPointerCapture(e.pointerId); mouse.down = true; } };
$('touch-attack').onpointerup = $('touch-attack').onpointercancel = () => { mouse.down = false; };
$('touch-sprint').onclick = () => { sprintTouch = !sprintTouch; $('touch-sprint').style.borderColor = sprintTouch ? '#e4c589' : ''; };

async function boot() {
  resize(); requestAnimationFrame(frame);
  try {
    savedGame = await platform.init(value => hold('platform', value)); lang = platform.lang;
    if (savedGame) { state = structuredClone(savedGame); hydrate(); }
    applyLanguage(); openModal('title'); $('loading').remove(); render(); platform.ready();
    setInterval(() => platform.flush(), 15000);
  } catch {
    $('loading-text').textContent = 'Не удалось подключиться к Яндекс Играм. / Could not connect to Yandex Games.';
    const retry = document.createElement('button'); retry.textContent = 'Повторить / Retry'; retry.onclick = () => location.reload(); $('loading').append(retry);
  }
}
boot();
