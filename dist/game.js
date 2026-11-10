'use strict';
const $ = id => document.getElementById(id);
const canvas = $('game');
let ctx = canvas.getContext('2d');
let campBase = null;
function refreshCampArt(){campBase=null;}
function refreshActorArt(){
 partyHealthSignature='';syncHUD();
 if(panel==='pets')showPets();else if(panel==='workshop')showWorkshop();
 else if(panel==='hatch'&&$('hatched-pet'))drawPetPortrait($('hatched-pet'),save.pets[save.pets.length-1]);
}
const names = ['Лагерь', 'Забытый проход', 'Сломанные арки', 'Шёпот стражей', 'Сердце руин', 'Обугленная роща', 'Лавовые переправы', 'Горящий кратер', 'Пепельный лес', 'Трон Пламени'];
const bosses = ['', 'Хранитель прохода', 'Каменный дозорный', 'Пожиратель света', 'Сердце бездны', 'Угольный страж', 'Хранитель горна', 'Пепельный исполин', 'Сердце кальдеры', 'Пламенный древень'];
const STORAGE = 'abyss-five-v1';
let save = {coins: 0, level: 0, unlocked: 2, completed: []};
let loadedSave = null;
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE));
  if (stored && typeof stored === 'object') {
    loadedSave = stored;
    const integer = (v, max) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));
    save = {coins: integer(stored.coins, 1e8), level: integer(stored.level, 1000), unlocked: Math.max(2, integer(stored.unlocked, MAX_FLOOR)), completed: Array.isArray(stored.completed) ? [...new Set(stored.completed.filter(n => Number.isInteger(n) && n >= 2 && n <= MAX_FLOOR))] : []};
  }
} catch {}
if(save.completed.length)save.unlocked=Math.min(MAX_FLOOR,Math.max(save.unlocked,...save.completed.map(n=>n+1)));
save = restoreProgression(save, loadedSave);
let W = 1400, H = 850, unit = 1, dpr = 1;
let floor = 1, state = 'camp', paused = false, panel = null, selectedFloor = save.unlocked;
let t = 0, anim = 0, p = 0, abyss = -500, flash = 0;
let enemies = [], gems = [], effects = [], texts = [], boss = null, last = null, focusBefore = null;
let sound = false, audio = null, runStartCoins = 0;
let camper = {x: 0, y: 0, tx: 0, ty: 0}, pet = {x: 0, y: 0};
function persist() { try { localStorage.setItem(STORAGE, JSON.stringify(save)); } catch {} }
function beep(f = 440) {
  if (!sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = 'triangle'; osc.frequency.value = f;
    gain.gain.setValueAtTime(.025, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .13);
    osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + .13);
  } catch {}
}
function campFrame() { const h = Math.min(H*.73, 1100); return {x: W / 2, w: Math.min(W * .92, 1440), h, top: (H - h) * .39}; }
function campPoints() {
  const f = campFrame(), y = v => f.top + f.h * v;
  return {tree: {x: f.x, y: y(.33)}, fire: {x: f.x, y: y(.61)}, tent: {x: f.x - f.w * .27, y: y(.46)}, forge: {x: f.x + f.w * .29, y: y(.44)}, portal: {x: f.x, y: y(.88)}};
}
function resize() {
  const width = window.innerWidth, height = window.innerHeight;
  unit = Math.min(width / (width < 700 ? 800 : 1400), height / 850);
  W = width / unit; H = height / unit; dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr * unit, 0, 0, dpr * unit, 0, 0); ctx.imageSmoothingEnabled = false;
  if (state === 'camp') resetCamper();
  positionCampObjects();
  if (panel === 'tree') applyTreeView();
  campBase = null;
}
function resetCamper() {
  const f = campPoints().fire;
  camper = {x: f.x - 80, y: f.y - 55, tx: f.x - 80, ty: f.y - 55};
  pet = {x: camper.x + 63, y: camper.y - 4};
}
function syncHUD() {
  $('world').setAttribute('data-biome',floor>=6&&state!=='camp'?'firelands':'ruins');
  $('coins').textContent = save.coins;
  $('bestiary').disabled=panel==='result';
  $('camp-actions').hidden = state !== 'camp';
  $('location').textContent = state === 'camp' ? 'ЛАГЕРЬ' : 'ЭТАЖ ' + floor + (floor>=6?' · ОГНЕННЫЕ ЗЕМЛИ':'');
  $('timer').hidden = state === 'camp';
  syncProgressionHUD();
  syncPartyHealth();
  const sec = Math.max(0, Math.ceil(RUN_SECONDS - t));
  $('timer').textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
  $('bossbar').hidden = !boss || state !== 'run';
  if (boss) {
    $('bossname').textContent = bosses[floor - 1];
    $('bossprogress').value = Math.max(0, boss.hp / boss.max * 100);
  }
}
function showPanel(kind, markup, dismissible = true) {
  clearPetDrag(); clearTreePan(); clearItemDrag();
  if (!panel) focusBefore = document.activeElement;
  panel = kind;
  $('dialog').className = 'dialog' + (kind === 'tree' ? ' tree-dialog' : kind === 'pets' ? ' pets-dialog' : kind === 'workshop' ? ' workshop-dialog' : kind === 'floors' ? ' floors-dialog' : kind==='bestiary'?' bestiary-dialog':'');
  $('overlay').hidden = false;
  $('dialog').innerHTML = (dismissible ? '<button class="close" aria-label="Закрыть">×</button>' : '') + markup;
  if (dismissible) $('dialog').querySelector('.close').onclick = dismissPanel;
  $('dialog').querySelector('button:not(:disabled)')?.focus();
}
function closePanel() {
  clearPetDrag(); clearTreePan(); clearItemDrag(); pickedPetId = null;
  panel = null; $('overlay').hidden = true; $('dialog').innerHTML = '';
  if (focusBefore?.isConnected && !focusBefore.hidden) focusBefore.focus();
  focusBefore = null;
}
function dismissPanel() {
  if (panel === 'result') return;
  closePanel(); paused = false;
}
function camp() {
  closePanel(); state = 'camp'; floor = 1; paused = false;
  t = 0; p = 0; abyss = -500; boss = null; combatPets = []; petVitals.clear(); resetFirelands();
  enemies = []; gems = []; effects = []; texts = []; flash = 0;
  selectedFloor = Math.min(MAX_FLOOR, save.unlocked); resetCamper(); syncHUD();
}
function showFloors() {
  if (state !== 'camp') return;
  const floorButton = n => {
    const locked = n > save.unlocked, done = save.completed.includes(n);
    return `<button class="floor-choice ${selectedFloor === n ? 'selected' : ''}" data-floor="${n}" ${locked ? 'disabled' : ''} aria-pressed="${selectedFloor === n}"><span class="floor-number">${String(n).padStart(2,'0')}</span><span class="floor-name">${names[n - 1]}</span><span class="floor-state">${locked ? '⌑' : done ? '✓' : '◇'}</span></button>`;
  };
  const options='<section><h2>Руины</h2>'+[2,3,4,5].map(floorButton).join('')+'</section><section class="fire-floor-list"><h2>Огненные земли</h2>'+[6,7,8,9,10].map(floorButton).join('')+'</section>';
  showPanel('floors', '<h1 id="dialog-title">В бездну</h1><div class="biome-floors">' + options + '</div><div class="actions"><button id="enter-floor" class="action primary">Войти · этаж ' + selectedFloor + '</button></div>');
  $('dialog').querySelectorAll('[data-floor]').forEach(btn => btn.onclick = () => {
    const n = Number(btn.dataset.floor);
    if (n <= save.unlocked) { selectedFloor = n; showFloors(); }
  });
  $('enter-floor').onclick = () => start(selectedFloor);
}
let workshopMemberId = 'starter-cat';
function showWorkshop(id){renderWorkshop(id);}
function showSettings() {
  if (panel === 'result') return;
  paused = state === 'run';
  showPanel('settings', `<h1 id="dialog-title">${state === 'run' ? 'Пауза' : 'Меню'}</h1><div class="settings-actions"><button id="resume" class="action primary">${state === 'run' ? 'Продолжить' : 'Вернуться'}</button><button id="toggle-sound" class="action">Звук: ${sound ? 'вкл.' : 'выкл.'}</button>${state === 'run' ? '<button id="return-camp" class="action">Лагерь</button>' : ''}<button id="reset-progress" class="action danger-secondary">Сбросить прогресс</button></div>`);
  $('resume').onclick = dismissPanel;
  $('reset-progress').onclick = showResetConfirmation;
  $('toggle-sound').onclick = () => { sound = !sound; beep(450); showSettings(); };
  if ($('return-camp')) $('return-camp').onclick = camp;
}
function start(n) {
  if (!Number.isInteger(n) || n < 2 || n > MAX_FLOOR || n > save.unlocked) return false;
  closePanel(); floor = n; state = 'run'; paused = false;
  t = 0; p = 0; abyss = -600; flash = 0; runStartCoins = save.coins;
  combatPets = squadMembers().map(createCombatPet); rallyCooldown=0; resetFirelands();
  buildSkillButtons();
  effects = []; texts = []; gems = []; enemies = []; boss = null;
  const rules = FLOOR_RULES[n];
  for (let group = 0; group < 4; group++) {
    for (let j = 0; j < rules.count; j++) {
      const kind = j === rules.count - 1 && (group % 2 || n >= 4) ? 'guard' : 'shadow';
      enemies.push({p:350+group*350+j*25,off:(j%2?1:-1)*(24+j*12),...enemyStats(kind)});
    }
    for (let j = 0; j < 3; j++) gems.push({p:230+group*350+j*60,off:(j%2?1:-1)*110,value:3});
  }
  syncHUD(); beep(320); return true;
}
function path(v) { return W / 2 + Math.sin(v / 390 + floor) * (floor === 2 ? 34 : floor === 3 ? 72 : floor === 4 ? 95 : 55); }
function sy(v) { return H * .68 - (v - p) * .75; }
function hit(e, damage, ability = false) {
  if (e.hp <= 0) return;
  e.hp -= damage * (ability ? 1 : 1 - (e.armor || 0)); e.hit = .16;
  effects.push({p: e.p, off: e.off, life: .3, max: .3, r: 32});
  if (e.hp <= 0) {
    recordEncounter(e,true);grantBattleXP(e);
    awardCrystals((e.bounty || 0) + skillRank('bounty'));
    persist();
    for (let j = 0; j < (e.type === 'boss' ? 6 : 2); j++) gems.push({p: e.p + Math.random() * 65 - 30, off: e.off + Math.random() * 85 - 42, value: e.type === 'boss' ? 5 : 2});
    beep(190);
  }
}
function skill(index = 0) {
  const entry = combatPets[index];
  if (state !== 'run' || paused || panel || !entry || entry.hp <= 0 || entry.cooldown > 0) return;
  const spec = SPECIES[entry.member.species];
  entry.cooldown = petSkillCooldown(entry.member);
  const targets = enemies.filter(e => e.hp > 0 && Math.abs(e.p - p) < (entry.member.species === 'wolf' ? 310 : 250)).sort((a,b) => Math.abs(a.p-p) - Math.abs(b.p-p));
  const chosen = entry.member.species === 'wolf' ? targets.slice(0,3) : targets;
  effects.push({p, off: 0, life: .65, max: .65, r: 210, skill: true, color: entry.member.species === 'bat' ? '#a2dfff' : RARITIES[entry.member.rarity].color});
  chosen.forEach(e => { hit(e, skillDamage(entry.member), true); if(e.type==='guard'){e.brace=0;e.armor=.2;e.braceTimer=6;} interruptBoss(e); if (entry.member.species === 'bat' && e.hp > 0) e.frozen = Math.max(e.frozen,3); });
  beep(700); syncHUD();
}
function finish(win) {
  if (state !== 'run') return;
  state = win ? 'win' : 'lose'; paused = false;
  let reward = 0;
  if (win) {
    reward = 25 + floor * 5 + Math.max(0, Math.floor(RUN_SECONDS - t));
    // Crystals dropped by the boss are awarded before the result screen freezes the field.
    for (const gem of gems) if (!gem.collected && Math.abs(gem.p - boss.p) < 100) { reward += gem.value; gem.collected = true; }
    awardCrystals(reward);
    if (!save.completed.includes(floor)) save.completed.push(floor);
    save.unlocked = Math.min(MAX_FLOOR, Math.max(save.unlocked, floor + 1)); persist();
  }
  const hasNext = floor < MAX_FLOOR, retryFloor = floor;
  const title = !win ? (t>=RUN_SECONDS?'Время вышло':'Отряд пал') : hasNext ? 'Этаж пройден' : 'Бездна пройдена';
  const buttons = !win ? '<button id="retry" class="action primary">Повтор</button><button id="back-camp" class="action">Лагерь</button>' : (hasNext ? '<button id="next-floor" class="action primary">Дальше</button>' : '') + '<button id="back-camp" class="action' + (!hasNext ? ' primary' : '') + '">Лагерь</button>';
  const earned=Math.max(0,save.coins-runStartCoins);
  showPanel('result', `<h1 id="dialog-title">${title}</h1>${earned ? `<p class="reward">◆ ${earned}</p>` : ''}<div class="actions">${buttons}</div>`, false);
  if ($('retry')) $('retry').onclick = () => { camp(); start(retryFloor); };
  if ($('next-floor')) { $('next-floor').disabled=!combatPets.some(entry=>entry.hp>0); $('next-floor').onclick = () => start(retryFloor + 1); }
  $('back-camp').onclick = camp; syncHUD();
}
function update(dt) {
  if (paused || panel) return;
  anim += dt;
  if (state === 'camp') {
    const dx = camper.tx - camper.x, dy = camper.ty - camper.y, distance = Math.hypot(dx, dy);
    if (distance > 2) { const move = Math.min(distance, dt * 285); camper.x += dx / distance * move; camper.y += dy / distance * move; }
    const targetX = camper.x + 53, targetY = camper.y + 8;
    pet.x += (targetX - pet.x) * Math.min(1, dt * 6); pet.y += (targetY - pet.y) * Math.min(1, dt * 6);
    return;
  }
  if (state !== 'run') return;
  t = Math.min(RUN_SECONDS,t+dt); flash = Math.max(0, flash - dt);
  enemies.forEach(e => { e.hit = Math.max(0, e.hit - dt); e.frozen = Math.max(0, (e.frozen || 0) - dt); });
  rallyCooldown=Math.max(0,rallyCooldown-dt);
  combatPets.forEach(entry => { entry.cooldown = Math.max(0, entry.cooldown - dt); entry.attack -= dt;entry.rallyTime=Math.max(0,(entry.rallyTime||0)-dt);if(!entry.rallyTime)entry.rallyShield=0; });
  for(const e of enemies)if(e.hp>0&&Math.abs(e.p-p)<650)recordEncounter(e);
  updateEnemySkills(dt);
  const close = enemies.filter(e => e.hp > 0 && Math.abs(e.p - p) < 115);
  const threatening = close.filter(e => !e.frozen);
  if (p < 1830) p = Math.min(1830, p + dt * (threatening.length ? 24 : 97.5) * (1+.05*skillRank('speed')));
  if (p >= 1830 && !boss) spawnBoss();
  for (const entry of combatPets) {
    if(entry.hp <= 0)continue;
    const target = close.filter(e => e.hp > 0).sort((a,b) => a.p-b.p)[0];
    if (entry.attack <= 0 && target) { const before=target.hp; hit(target, petDamage(entry.member)); healPet(entry,Math.max(0,before-Math.max(0,target.hp))*(.01*skillRank('lifesteal')+itemBonus(entry.member).heal));petOnAttack(entry,target); entry.attack = petAttackInterval(entry.member); }
  }
  updateBoss(dt);
  if(floor>=6)updateFirelands(dt);
  const incoming = Math.min(16, threatening.filter(e=>e.hp>0).reduce((sum,e)=>sum+(e.dps||1.25)*(e===boss&&boss.enraged?1.2:1),0));
  if (incoming > 0) { damageSquad(dt * incoming); if (Math.sin(t * 9) > .8) flash = .1; }
  const rules=FLOOR_RULES[floor];
  if (t > rules.abyssDelay + skillRank('abyss')) abyss += dt * rules.abyssSpeed;
  if (owns('magnet')) {
    let picked = false;
    for (const gem of gems) if (!gem.collected && Math.hypot(path(gem.p) + gem.off - path(p), (gem.p - p) * .75) < crystalRadius()) { takeGem(gem); picked = true; }
    if (picked) persist();
  }
  if (p < abyss + 45) { damageSquad(dt * (8 + Math.max(0, abyss - p) * .04),true); flash = .1; }

  effects.forEach(e => e.life -= dt); effects = effects.filter(e => e.life > 0);
  texts.forEach(e => { e.life -= dt; e.p += dt * 25; }); texts = texts.filter(e => e.life > 0);
  if(combatPets.every(entry=>entry.hp<=0))finish(false); else if (boss && boss.hp <= 0) finish(true); else if(t>=RUN_SECONDS)finish(false);
}
function pointerPosition(ev) {
  const r = canvas.getBoundingClientRect();
  return {x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H};
}
function takeGem(gem) {
  if (gem.collected) return;
  gem.collected = true; const credited=awardCrystals(gem.value);
  texts.push({off: gem.off, p: gem.p, value: credited, life: .9}); beep(920);
}
function collect(ev) {
  if (state !== 'run' || paused || panel) return;
  const {x, y} = pointerPosition(ev); let changed = false;
  for (const gem of gems) {
    if (gem.collected || sy(gem.p) < 0 || sy(gem.p) > H) continue;
    if (Math.hypot(x - path(gem.p) - gem.off, y - sy(gem.p)) < Math.max(32, 18 / unit)) {
      takeGem(gem); changed = true;
    }
  }
  if (changed) { persist(); syncHUD(); }
}
function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
canvas.addEventListener('pointermove', collect);
canvas.addEventListener('pointerdown', ev => {
  if(clickEnemy(ev))return;
  collect(ev);
  if (state !== 'camp' || panel) return;
  const {x, y} = pointerPosition(ev), s = campPoints(), target = getCampTarget(x,y);
  if (target) { activateCampObject(target.id); return; }
  if (pointInPolygon(x, y, campOutline()) && y > s.tree.y + 25 && y < s.portal.y - 85) { camper.tx = x; camper.ty = y - 12; }
});
bindCampObjects();
$('settings').onclick = showSettings;
$('bestiary').onclick=()=>{bookSnapshot=null;showBestiary();};
$('overlay').addEventListener('pointerdown', ev => { if (ev.target === $('overlay')) dismissPanel(); });
window.addEventListener('keydown', ev => {
  if (ev.code === 'Escape') { ev.preventDefault(); if (panel) dismissPanel(); else showSettings(); }
  if(ev.code==='KeyQ'&&!ev.repeat)rally();
  if (/^Digit[1-4]$/.test(ev.code) && !panel) skill(Number(ev.code.slice(-1)) - 1);
  if (ev.code === 'Space' && !['BUTTON', 'INPUT'].includes(document.activeElement.tagName)) { ev.preventDefault(); skill(); }
  if (ev.key === 'Tab' && panel) {
    const nodes = Array.from($('dialog').querySelectorAll('button:not(:disabled)'));
    if (!nodes.length) return;
    const first = nodes[0], end = nodes[nodes.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); end.focus(); }
    else if (!ev.shiftKey && document.activeElement === end) { ev.preventDefault(); first.focus(); }
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'run' && !panel) showSettings(); });
$('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('world').requestFullscreen) await $('world').requestFullscreen();
    else $('fullscreen-status').textContent = 'Полноэкранный режим недоступен';
  } catch { $('fullscreen-status').textContent = 'Полноэкранный режим недоступен'; }
};
window.addEventListener('resize', resize);

function rect(c,x,y,w,h){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}function poly(c,pts){ctx.fillStyle=c;ctx.beginPath();pts.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fill();}function glow(x,y,r,color){let g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function crystal(x,y,size=1){if(drawObjectSprite('crystals',x-12*size,y-22*size,24*size,36*size)){drawCrystalLight(x,y,size);return;}ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(size,size);glow(0,0,28,'#c542e64a');poly('#5a257b',[[-7,3],[0,-18],[8,-3],[5,13],[-4,13]]);poly('#c76cff',[[0,-18],[1,10],[-7,3]]);poly('#e5b1ff',[[0,-18],[8,-3],[1,10]]);rect('#f9dcff',0,-13,2,13);ctx.restore();}
function column(x,y){if(drawObjectSprite('column',x-24,y-90,48,113))return;rect('#1a1429',x-22,y+6,48,17);rect('#4c3d63',x-19,y,39,12);rect('#302840',x-13,y-80,26,82);rect('#69577e',x-13,y-80,6,79);rect('#493b60',x-3,y-80,7,77);rect('#6a567f',x-20,y-88,39,12);rect('#90779d',x-20,y-88,39,3);rect('#3a2d4e',x+8,y-85,5,14);rect('#201a2e',x-5,y-30,13,4);}
function cat(x,y,scale=1){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);rect('#1e1930',-12,11,25,6);rect('#b7afcd',-10,-6,20,22);rect('#eee6f3',-10,-9,20,20);rect('#fff5fc',-6,-12,16,15);poly('#f3eafa',[[-10,-7],[-9,-20],[-1,-11]]);poly('#f3eafa',[[3,-11],[11,-20],[11,-5]]);rect('#b390bb',-7,-15,3,5);rect('#b390bb',7,-15,2,5);rect('#3d234a',-5,-5,3,4);rect('#3d234a',5,-5,3,4);rect('#c492b3',0,0,3,2);rect('#e7daef',-7,10,5,8);rect('#e7daef',5,10,5,8);rect('#c8bddb',12,3,5,9);rect('#e6def1',15,-2,4,8);ctx.restore();}
function hero(x,y){if(drawActorSprite('hero',x,y))return;ctx.save();ctx.translate(Math.round(x),Math.round(y));rect('#0a0813',-17,22,35,8);rect('#252238',-12,1,25,24);rect('#6a527c',-10,4,20,5);rect('#262031',-9,22,7,14);rect('#262031',5,22,7,12);rect('#a696b2',-9,33,7,3);poly('#85364e',[[-9,1],[-13,25],[-40,19],[-25,7]]);poly('#d05269',[[-10,2],[-24,10],[-38,8],[-23,0]]);poly('#171322',[[-19,1],[-16,-20],[0,-37],[18,-17],[21,0]]);poly('#574263',[[-16,-15],[0,-33],[14,-16],[15,-1],[-15,-1]]);poly('#33283f',[[-15,-4],[-9,-20],[0,-29],[11,-15],[15,-2]]);rect('#b497b9',-10,-2,22,3);rect('#ebbbad',-4,-1,10,6);rect('#b0849c',-4,4,10,3);rect('#ddbdca',16,9,6,9);rect('#8c7a9d',22,7,5,23);rect('#e5d5e5',24,7,3,23);ctx.restore();}
function enemy(e,x,y){if(floor>=6)drawFireEnemy(e,x,y);else drawRuinsEnemy(e,x,y);if(e.brace>0){ctx.strokeStyle='#d6bb7a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,27,33,0,0,Math.PI*2);ctx.stroke();}}
function drawRuinsEnemy(e,x,y){ctx.save();ctx.translate(Math.round(x),Math.round(y));let big=e.type==='boss';ctx.scale(big?2.6:e.type==='guard'?1.35:1, big?2.6:e.type==='guard'?1.35:1);let c=e.hit>0?'#dbc5f6':'#27152f';rect('#090813',-15,13,31,8);poly(c,[[-16,16],[-12,-5],[-4,-17],[8,-16],[17,4],[15,20],[6,16],[0,21],[-7,16]]);poly(e.hit>0?'#fff0ff':'#4b2c60',[[-11,-4],[-4,-17],[9,-16],[13,-3]]);rect('#f4469c',-7,-3,5,4);rect('#f4469c',4,-3,5,4);if(e.type!=='shadow'){poly('#6d4b81',[[-12,-5],[-20,-20],[-10,-13],[-4,-18]]);poly('#6d4b81',[[9,-9],[18,-23],[19,-8],[13,0]]);rect('#805c9d',-15,4,4,18);poly('#9e57d4',[[15,0],[25,5],[23,20],[15,25],[12,8]]);rect('#e69cff',17,7,2,12);}ctx.restore();if(e.hp<e.max&&e.type!=='boss'){rect('#26172f',x-17,y-30,34,3);rect('#c88be7',x-17,y-30,34*Math.max(0,e.hp)/e.max,3);}}

function hash(a, b = 0) { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); }
function ellipse(c, x, y, rx, ry) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function line(c, width, points) { ctx.strokeStyle = c; ctx.lineWidth = width; ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke(); }
function campOutline() {
  const f = campFrame(), x = f.x, w = f.w, y = v => f.top + f.h * v;
  return [[x-w*.19,y(.22)],[x+w*.19,y(.22)],[x+w*.25,y(.36)],[x+w*.45,y(.34)],[x+w*.5,y(.53)],[x+w*.4,y(.71)],[x+w*.12,y(.81)],[x+w*.11,y(.97)],[x-w*.11,y(.97)],[x-w*.12,y(.81)],[x-w*.4,y(.71)],[x-w*.5,y(.53)],[x-w*.45,y(.34)],[x-w*.25,y(.36)]];
}
function tileFloor(points, stepX = 44, stepY = 24) {
  if(TERRAIN_ART.ready&&floor<6){islandTerrain(points,48);return;}
  poly('#242034', points);
  ctx.save(); ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
  const minX = Math.min(...points.map(p=>p[0])), maxX = Math.max(...points.map(p=>p[0]));
  const minY = Math.min(...points.map(p=>p[1])), maxY = Math.max(...points.map(p=>p[1]));
  for (let row = Math.floor(minY/stepY); row < maxY/stepY; row++) {
    for (let col = Math.floor(minX/stepX)-1; col < maxX/stepX+1; col++) {
      const x = col * stepX + (row % 2) * stepX/2, y = row * stepY, n = hash(col,row);
      rect(n > .7 ? '#4e405c' : n > .3 ? '#41364f' : '#362d46', x+1,y+1,stepX-2,stepY-2);
      rect('#675274',x+2,y+1,stepX-4,2);
      if (n>.72) { line('#271e38',1,[[x+15,y+2],[x+19,y+9],[x+14,y+15]]); }
      if (n>.9) {rect('#565643',x+5,y+stepY-4,12,3);rect('#686447',x+15,y+stepY-6,4,4);}
    }
  }
  ctx.restore();
  line('#776080',4,[...points,points[0]]);
  for (let i=0;i<points.length;i++) {
    const a=points[i], b=points[(i+1)%points.length], distance=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(let d=15;d<distance;d+=35) { const x=a[0]+(b[0]-a[0])*d/distance,y=a[1]+(b[1]-a[1])*d/distance;rect('#766182',x-9,y-4,18,9);rect('#51415f',x-9,y+5,18,8); }
  }
}
function arch(x,y,size=1) {
  if(drawObjectSprite('arch',x-88*size,y-134*size,176*size,158*size))return;
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);
  column(-66,0);column(66,0);
  for(let i=0;i<8;i++){const a=Math.PI+(i/7)*Math.PI;const bx=Math.cos(a)*65,by=-87+Math.sin(a)*43;rect('#31263f',bx-12,by+1,25,20);rect('#6a537a',bx-12,by-3,25,11);rect('#8a6c93',bx-11,by-3,23,2);}
  rect('#74324e',38,-76,20,65);poly('#ab5772',[[38,-76],[58,-76],[58,-11],[48,-22],[38,-11]]);line('#ce9b80',2,[[48,-60],[54,-51],[48,-42],[42,-51],[48,-60]]);
  ctx.restore();
}
function lantern(x,y,purple=false) {
  if(drawObjectSprite('lantern',x-9,y-44,18,59))return;
  const c=purple?'#b447f7':'#ffab49';
  glow(x,y-8,purple?65:55,purple?'#bb3cf025':'#ff9c3820');
  rect('#1b1429',x-9,y-29,18,34);rect('#8b5d6c',x-8,y-26,16,5);rect(c,x-5,y-19,10,16);rect('#ffe0aa',x-2,y-17,3,12);rect('#3a2036',x-10,y-3,20,6);rect('#d09a7b',x-9,y-4,18,2);
}
function tree(x,y) {
  if(drawObjectSprite('tree',x-207,y-278,414,324))return;
  ellipse('#1d142b',x,y+9,165,48);
  // Angular trunk and exposed roots.
  poly('#20122f',[[x-62,y],[x-27,y-51],[x-34,y-115],[x-86,y-161],[x-68,y-172],[x-14,y-138],[x-2,y-220],[x+15,y-205],[x+14,y-135],[x+63,y-176],[x+84,y-167],[x+38,y-112],[x+27,y-51],[x+72,y+5],[x+19,y-6],[x-3,y-36],[x-22,y+7]]);
  line('#633479',9,[[x-49,y],[x-17,y-55],[x-18,y-118],[x-47,y-148]]);
  line('#8c42a7',4,[[x+49,y],[x+14,y-51],[x+4,y-107],[x+15,y-189]]);
  for(let i=0;i<90;i++){const a=hash(i,11)*Math.PI*2,r=Math.sqrt(hash(i,22)),lx=x+Math.cos(a)*r*207,ly=y-179+Math.sin(a)*r*82;rect(i%4===0?'#782e9e':i%3===0?'#4c206c':'#341848',lx,ly,18+hash(i,5)*22,9+hash(i,6)*9);if(i%3===0)rect('#9343b1',lx+4,ly,15,3);}
  line('#3c2050',8,[[x-13,y-134],[x-90,y-182],[x-162,y-177]]);
  line('#512965',7,[[x+5,y-135],[x+88,y-195],[x+153,y-183]]);
  glow(x,y-91,85,'#cd4cfe25');
  line('#af58e7',2,[[x-117,y-134],[x-75,y-110],[x-12,y-103],[x+35,y-124],[x+94,y-142]]);
  for(let i=0;i<4;i++){const dx=[-115,-58,35,94][i],dy=[-134,-111,-124,-142][i];crystal(x+dx,y+dy,.55);}
  poly('#bf69f2',[[x,y-118],[x+17,y-94],[x,y-70],[x-17,y-94]]);
  poly('#3f185c',[[x,y-112],[x+11,y-94],[x,y-76],[x-11,y-94]]);
  rect('#f2c2ff',x-2,y-103,4,19);rect('#f2c2ff',x-7,y-95,14,3);
}
function tent(x,y) {
  if(drawObjectSprite('tent',x-118,y-150,236,187))return;
  ellipse('#20182e',x,y+15,116,35);
  rect('#3a2036',x-84,y-67,166,76);rect('#533045',x-91,y+2,182,15);
  for(let i=-70;i<80;i+=28)rect('#241727',x+i,y-60,5,64);
  poly('#231629',[[x-113,y-60],[x-75,y-93],[x-13,y-140],[x+75,y-87],[x+110,y-63]]);
  poly('#5c2d51',[[x-113,y-65],[x-70,y-98],[x-13,y-140],[x+78,y-90],[x+110,y-68],[x+65,y-58],[x+10,y-65],[x-40,y-57]]);
  line('#865273',3,[[x-110,y-65],[x-64,y-75],[x-13,y-140],[x+19,y-76],[x+108,y-68]]);
  rect('#211627',x-20,y-56,46,60);poly('#7a3d57',[[x-21,y-60],[x-10,y-53],[x-13,y+3],[x-32,y+3]]);poly('#7a3d57',[[x+26,y-60],[x+15,y-53],[x+19,y+3],[x+37,y+3]]);
  glow(x,y-13,70,'#f8973825');lantern(x+3,y-10);
  for(let i=0;i<3;i++){rect('#352238',x-74+i*22,y+7,22,18);rect('#81513e',x-74+i*22,y+7,22,3);}
}
function forge(x,y) {
  if(drawObjectSprite('forge',x-125,y-154,250,205))return;
  ellipse('#1b1428',x,y+22,122,37);
  rect('#2a1d2c',x-95,y-83,188,100);rect('#42343e',x-99,y+8,198,19);
  for(let i=-80;i<90;i+=40)rect('#523a48',x+i,y-80,6,92);
  poly('#21162a',[[x-119,y-80],[x-45,y-148],[x+102,y-88],[x+116,y-65],[x-16,y-90]]);
  poly('#503047',[[x-121,y-85],[x-44,y-149],[x+112,y-84],[x+97,y-68],[x+14,y-93],[x-40,y-82]]);
  for(let i=0;i<6;i++)line('#75445c',3,[[x-90+i*29,y-80],[x-44,y-143]]);
  rect('#3b2f3f',x+28,y-143,33,68);rect('#75556b',x+24,y-147,42,12);
  poly('#826075',[[x+10,y+12],[x+10,y-41],[x+24,y-63],[x+57,y-63],[x+75,y-43],[x+75,y+12]]);
  poly('#251526',[[x+21,y+10],[x+21,y-36],[x+33,y-48],[x+50,y-48],[x+63,y-36],[x+63,y+10]]);
  rect('#8f342a',x+24,y-20,36,27);rect('#e47f37',x+27,y-14,30,21);
  rect('#3c2838',x-70,y-11,60,25);rect('#9c7386',x-75,y-18,65,10);poly('#bea0ae',[[x-82,y-22],[x-17,y-22],[x-7,y-35],[x-73,y-32]]);rect('#574251',x-55,y-32,24,10);
  lantern(x-100,y+10);rect('#332638',x+88,y-7,28,27);rect('#786173',x+86,y-10,31,5);
}
function eggStand(x,y) {
  if(drawObjectSprite('eggs',x-56,y-139,112,174))return;
  ellipse('#21152f',x,y+15,53,18);rect('#4a2b5b',x-32,y-38,64,51);rect('#b58b9c',x-34,y+4,68,6);rect('#8d4f9c',x-35,y-40,70,8);
  ellipse('#3d245494',x,y-72,37,40);ctx.strokeStyle='#a771b7';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y-72,37,40,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<3;i++){ellipse(i===1?'#d7bce8':'#9460bd',x-20+i*19,y-65-(i%2)*14,10,15);rect('#ecd3f2',x-23+i*19,y-73-(i%2)*14,3,6);}
  ellipse('#5b3170',x,y-111,31,9);rect('#bc8ba1',x-30,y-115,60,5);crystal(x,y-124,.55);rect('#c59a83',x-6,y-13,12,13);
}
function portalArt(x,y,time) {
  if(OBJECT_ART.ready&&floor<6){drawPortalObjectFX(x,y,time);drawObjectSprite('portal',x-115,y-150,230,223);if(TERRAIN_ART.ready)drawCampPlaque('БЕЗДНА',x,y-130,147);else campLettering('БЕЗДНА',x,y-130,125,'#d3b3dc',14);return;}
  glow(x,y-45,150,'#9b27f13a');ellipse('#10091e',x,y-10,94,44);
  ctx.save();ctx.translate(x,y-38);ctx.scale(1,.84);
  for(let i=0;i<6;i++){
    const r=17+i*10;ctx.strokeStyle=i%2?'#8a2ad8':'#c751f9';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(Math.sin(time*1.6+i)*5,Math.cos(time*1.3+i)*4,r,r*.8,time*.3+i*.2,0,Math.PI*1.8);ctx.stroke();
  }
  ctx.restore();
  for(let side of [-1,1]){rect('#22172f',x+side*97-13,y-70,26,89);rect('#60416e',x+side*97-13,y-74,26,10);crystal(x+side*98,y-78,.9);}
  for(let i=0;i<13;i++){
    const a=Math.PI+i/12*Math.PI,bx=x+Math.cos(a)*79,by=y-36+Math.sin(a)*96;
    rect('#342140',bx-15,by-10,31,29);rect('#745580',bx-15,by-12,31,9);rect('#a47d9f',bx-14,by-12,29,2);if(i%3===0)rect('#bf67ed',bx-1,by-7,3,17);
  }
  poly('#49324f',[[x-73,y-144],[x+72,y-145],[x+77,y-116],[x-76,y-116]]);line('#94709c',2,[[x-72,y-143],[x+72,y-144]]);campLettering('БЕЗДНА',x,y-130,125,'#d3b3dc',14);
  for(let i=0;i<5;i++){rect('#32253e',x-82-i*4,y+12+i*10,164+i*8,11);rect('#836383',x-82-i*4,y+12+i*10,164+i*8,3);}
}
function campFloor() {
  if(TERRAIN_ART.ready){drawDetailedCampFloor();return;}
  const points=campOutline(),f=campFrame(),s=campPoints();
  poly('#21152e',points.map(([x,y])=>[x,y+54]));
  for(let i=0;i<points.length-1;i++){const [x,y]=points[i];poly('#33213e',[[x-14,y+20],[x+19,y+12],[x+7,y+86],[x-9,y+53]]);}
  tileFloor(points);
  // Raised platform and steps leading to the old tree.
  const tx=s.tree.x,ty=s.tree.y;
  ellipse('#24172e',tx,ty+13,196,68);ellipse('#6b4b77',tx,ty+2,192,60);ellipse('#382841',tx,ty-4,184,55);
  for(let i=0;i<7;i++){rect('#322439',tx-67-i*5,ty+37+i*9,134+i*10,10);rect('#896782',tx-67-i*5,ty+37+i*9,134+i*10,3);}
  for(let side of [-1,1]){
    arch(f.x+side*f.w*.37,f.top+f.h*.39,.9);
    arch(f.x+side*f.w*.43,f.top+f.h*.66,.63);
    for(let k=0;k<3;k++){const x=f.x+side*(f.w*.22+k*40),y=f.top+f.h*.69+k*11;rect('#49354f',x,y,35,13);rect('#77556f',x,y,35,3);}
    lantern(f.x+side*f.w*.25,f.top+f.h*.64);
    lantern(tx+side*170,ty+14,true);
  }
  // Old cracks that run across the stone.
  line('#6a278e',5,[[f.x-f.w*.31,f.top+f.h*.55],[f.x-f.w*.22,f.top+f.h*.58],[f.x-f.w*.18,f.top+f.h*.53]]);
  line('#a447c7',2,[[f.x-f.w*.31,f.top+f.h*.55],[f.x-f.w*.22,f.top+f.h*.58],[f.x-f.w*.18,f.top+f.h*.53]]);
  drawCampObject('meta-tree',()=>tree(s.tree.x,s.tree.y));
  drawCampObject('pets',()=>tent(s.tent.x,s.tent.y));
  drawCampObject('workshop',()=>forge(s.forge.x,s.forge.y));
  drawCampObject('egg-machine',()=>eggStand(s.tent.x-94,s.tent.y+93));
  campInscriptions();

}
function buildCampBase() {
  const layer=document.createElement('canvas');layer.width=Math.ceil(W);layer.height=Math.ceil(H);
  const original=ctx;ctx=layer.getContext('2d');ctx.imageSmoothingEnabled=false;beginCampScenery();campFloor();ctx=original;return layer;
}
function background() {
  if(state!=='camp'&&floor>=6){drawFireSky();return;}
  rect('#100c21',0,0,W,H);
  for(let i=0;i<12;i++){
    const x=hash(i,1)*W+Math.sin(anim*.1+i)*22,y=(hash(i,2)*H+anim*3*(i%2?1:-1)+H*4)%H;
    glow(x,y,100+hash(i,3)*170,i%2?'#8224b41b':'#48277922');
  }
  for(let i=0;i<22;i++){
    const x=hash(i,7)*W,y=(hash(i,9)*H+Math.sin(anim*.5+i)*8);
    if(x>W*.2&&x<W*.8&&y>H*.2&&y<H*.85)continue;
    const size=12+hash(i,3)*22;
    poly('#30233f',[[x,y],[x+size,y-6],[x+size+8,y+9],[x+size/2,y+17],[x-4,y+10]]);
    poly('#1f172e',[[x-4,y+10],[x+size/2,y+17],[x+size/2-4,y+size+20],[x+3,y+size]]);
    rect('#5c4071',x,y,size,3);
  }
}
function campScene() {
  if(!campBase)campBase=buildCampBase();
  ctx.drawImage(campBase,0,0,W,H);
  drawCampLifeBehindActors();
  const s=campPoints(),x=s.fire.x,y=s.fire.y;
  if(TERRAIN_ART.ready)drawCampTerrainLighting();
  if(OBJECT_ART.ready){drawCampObjectLighting();drawCampObjectFX();}
  else{drawCampObject('meta-tree',()=>glow(s.tree.x,s.tree.y-95,105,'#c83bfe18'));drawCampObject('workshop',()=>glow(s.forge.x+40,s.forge.y-4,70,'#ff92362a'));}
  // Fire and moving embers.
  if(TERRAIN_ART.ready)drawDetailedCampfire(x,y);
  else{glow(x,y-12,95+Math.sin(anim*7)*6,'#ff93363a');ellipse('#1a1425',x,y+14,59,24);
  for(let i=0;i<10;i++){let a=i*Math.PI*2/10;rect(i%2?'#92737d':'#655065',x+Math.cos(a)*44-10,y+Math.sin(a)*17,21,12);rect('#b59193',x+Math.cos(a)*44-10,y+Math.sin(a)*17,20,3);}
  line('#6b4137',11,[[x-24,y+3],[x+23,y+10]]);line('#9a6242',9,[[x-24,y+10],[x+22,y]]);
  poly('#e97832',[[x-23,y],[x-18,y-25],[x-6,y-14],[x+2,y-54-Math.sin(anim*8)*6],[x+12,y-25],[x+18,y-34],[x+24,y+2]]);
  poly('#ffc778',[[x-10,y],[x-7,y-24],[x,y-15],[x+6,y-34],[x+14,y+1]]);rect('#fff0ba',x-3,y-17,7,16);
  for(let i=0;i<9;i++){let q=(anim*.5+i*.11)%1;rect('#eeb15e',x+Math.sin(i*12+q*5)*23,y-20-q*70,2,3);}
  }
  hero(camper.x,camper.y+Math.sin(anim*3));
  squadMembers().forEach((member,i) => drawPet(member, pet.x + i * 36, pet.y + (i % 2) * 20 + Math.sin(anim*3+i), 1.2));
  drawCampObject('portal',()=>portalArt(s.portal.x,s.portal.y,anim));
  drawCampPortalAura();
  drawCampHover();
}
function battleScene() {
  if(TERRAIN_ART.ready){drawDetailedRuins();return;}
  const near=Math.floor((p-650)/48)*48,far=p+H/.75;
  for(let side of [-1,1]){
    for(let i=0;i<6;i++){
      const v=Math.floor(p/600)*600+i*600-600,y=sy(v),x=W/2+side*(Math.min(W*.34,435)+(i%2)*38);
      if(y< -150||y>H+150)continue;
      tileFloor([[x-65,y],[x+50,y-12],[x+67,y+32],[x+12,y+60],[x-64,y+32]],36,22);arch(x,y+14,.9);
    }
  }
  for(let v=near+Math.ceil((far-near)/48)*48;v>=near;v-=48){
    const y=sy(v);if(y< -50||y>H+60)continue;
    const x=path(v),width=v>1750?430:292;
    rect('#22192f',x-width/2-8,y+13,width+16,34);
    for(let j=0;j<Math.ceil(width/42);j++){
      const bx=x-width/2+j*42,n=hash(v,j);
      rect(n>.5?'#50415f':'#42364f',bx,y,40,34);rect('#705878',bx,y,40,2);
      if(n>.75){rect('#666042',bx+8,y+27,14,3);line('#2f243b',1,[[bx+20,y+4],[bx+16,y+15],[bx+22,y+20]]);}
    }
    rect('#89718f',x-width/2-9,y-2,10,31);rect('#77617e',x+width/2,y-2,10,31);
  }
  let ay=sy(1930),ax=path(1930);
  if(ay> -250&&ay<H+200){
    glow(ax,ay,200,'#a82cdd30');ellipse('#2a1d3c',ax,ay+8,174,70);ellipse('#73517e',ax,ay,170,65);ellipse('#332044',ax,ay-4,160,58);
    ctx.strokeStyle='#b552eb';ctx.lineWidth=3;
    for(let r of [72,99,130]){ctx.beginPath();ctx.ellipse(ax,ay-5,r,r*.38,0,0,Math.PI*2);ctx.stroke();}
    poly('#db92fd',[[ax,ay-40],[ax+44,ay-5],[ax,ay+30],[ax-44,ay-5]]);poly('#55316b',[[ax,ay-34],[ax+36,ay-5],[ax,ay+24],[ax-36,ay-5]]);
    for(let side of [-1,1]){arch(ax+side*185,ay-30,1.1);crystal(ax+side*127,ay+30,1.6);}
  }
  for(let v=Math.floor((p-400)/240)*240;v<p+H/.75;v+=240){let y=sy(v);if(y> -60&&y<H+60)for(let side of [-1,1]){let x=path(v)+side*140;rect('#39283c',x-15,y,30,13);glow(x,y-8,40,'#e77c292b');crystal(x,y-10,.9);}}
  drawBattleActors();
}
function drawBattleActors(){
  if(boss?.hp>0 && boss.windup>0){const intensity=1-boss.windup/(floor>=6?1.6:1.2);ellipse(floor>=6?'#e65a1425':'#bb284025',path(p),sy(p),145,88);ctx.strokeStyle=floor>=6?'#ffbc55':'#ff8ca8';ctx.lineWidth=3+intensity*3;ctx.beginPath();ctx.ellipse(path(p),sy(p),145*(1-intensity*.55),88*(1-intensity*.55),0,0,Math.PI*2);ctx.stroke();}
  if(boss?.hp>0 && boss.enraged)glow(path(boss.p),sy(boss.p),110,floor>=6?'#ff812028':'#f2406328');
  const entities=enemies.filter(e=>e.hp>0).map(e=>({p:e.p,kind:'enemy',e}));entities.push({p,kind:'hero'});
  combatPets.forEach((entry,i) => entities.push({p:entry.hp>0?p+65+i*19:entry.fallenAt,kind:entry.hp>0?'pet':'fallen',entry,member:entry.member,off:(i-(combatPets.length-1)/2)*43}));entities.sort((a,b)=>b.p-a.p);
  for(let e of entities){const y=sy(e.p);if(y< -150||y>H+150)continue;if(e.kind==='hero')hero(path(p),y+Math.sin(t*12)*1.5);else if(e.kind==='pet'){const px=path(e.p)+e.off;drawPet(e.member,px,y+Math.sin(t*16)*2,1.15);if(e.entry.burning?.remaining>0)flame(px,y+15,.35);if(e.entry.shield>0||e.entry.rallyShield>0){ctx.strokeStyle='#d7b575';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(px,y,24,29,0,0,Math.PI*2);ctx.stroke();}}else if(e.kind==='fallen'){const px=path(e.p)+e.off;ellipse('#201327',px,y+9,21,9);rect('#86718f',px-8,y-5,16,14);rect('#c2a3cb',px-2,y-3,4,13);rect('#c2a3cb',px-5,y,10,3);}else { enemy(e.e,path(e.p)+e.e.off,y); if(e.e.frozen) { glow(path(e.p)+e.e.off,y,40,'#75d3ff33');line('#b1e9ff',2,[[path(e.p)+e.e.off-15,y+15],[path(e.p)+e.e.off+15,y+15]]); } }}
  for(let gem of gems)if(!gem.collected){const y=sy(gem.p);if(y>0&&y<H)crystal(path(gem.p)+gem.off,y+Math.sin(anim*3+gem.p)*3,.7);}
  for(let e of effects){const x=path(e.p)+e.off,y=sy(e.p);ctx.strokeStyle=e.skill?(e.color||'#de9dff'):'#ffbd86';ctx.globalAlpha=e.life/e.max;ctx.lineWidth=e.skill?6:3;ctx.beginPath();ctx.ellipse(x,y,e.r*(1-e.life/e.max*.6),e.r*(1-e.life/e.max*.6)*.65,-.4,0,Math.PI*1.65);ctx.stroke();if(e.skill)glow(x,y,200,'#bc69e31c');ctx.globalAlpha=1;}
  for(let q of texts){ctx.fillStyle='#e6c6ff';ctx.font='bold 17px Georgia';ctx.fillText('+'+q.value,path(q.p)+q.off,sy(q.p));}
  const by=sy(abyss);
  if(by<H+50){
    let g=ctx.createLinearGradient(0,by-25,0,by+220);g.addColorStop(0,floor>=6?'#dc661900':'#b12cf400');g.addColorStop(.2,floor>=6?'#e5501577':'#a125ea77');g.addColorStop(.5,floor>=6?'#3b1005ed':'#240c42ed');g.addColorStop(1,'#090513');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,by);
    for(let x=0;x<=W+12;x+=12)ctx.lineTo(x,by+Math.sin(x*.045+anim*4)*13+Math.sin(x*.11)*8);
    ctx.lineTo(W,H+200);ctx.lineTo(0,H+200);ctx.fill();ctx.strokeStyle=floor>=6?'#ff9c35':'#cf63f9';ctx.lineWidth=3;ctx.beginPath();for(let x=0;x<=W+12;x+=12)ctx.lineTo(x,by+Math.sin(x*.045+anim*4)*13+Math.sin(x*.11)*8);ctx.stroke();
  }
  if(flash>0){rect(floor>=6?'#ff6a1013':'#b62d5b13',0,0,W,H);}
}
function draw() {
  background();drawWorldAtmosphere();
  if(state==='camp')campScene();else if(floor>=6)drawFirelandsBattle();else battleScene();
  const vignette=ctx.createRadialGradient(W/2,H*.5,Math.min(W,H)*.3,W/2,H*.5,Math.max(W,H)*.75);
  vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#05020bc9');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}
function drawPetPortrait(target, member = {species: 'cat', rarity: 'common'}) {
  const original=ctx;ctx=target.getContext('2d');ctx.clearRect(0,0,120,100);ctx.imageSmoothingEnabled=false;drawPet(member,60,56,ACTOR_ART.ready?(member.species==='cat'?2.1:1.65):2.1,'portrait');ctx=original;
}
resize();camp();persist();showMigratedPets();
function frame(now) {
  const dt=last===null?0:Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  update(dt);draw();syncHUD();requestAnimationFrame(frame);
}
// Later scripts extend the camp renderer. The first frame must wait for them.
let gameLoopStarted=false;
function startGameLoop(){
  if(gameLoopStarted)return;
  gameLoopStarted=true;requestAnimationFrame(frame);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startGameLoop,{once:true});
else startGameLoop();
function drawPet(member, x, y, scale = 1, view = 'auto') {
  const rarity = RARITIES[member.rarity];
  if (member.rarity !== 'common') glow(x, y, 35 * scale, rarity.color + '20');
  if(drawActorSprite(member.species,x,y,scale,view))return;
  if (member.species === 'cat') { cat(x, y, scale); return; }
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(scale, scale);
  if (member.species === 'wolf') {
    ellipse('#191121',0,17,29,8);
    poly('#45374e',[[-27,0],[-18,-11],[6,-11],[17,-4],[25,0],[23,11],[-20,12]]);
    poly('#75667e',[[-18,-9],[-10,-15],[13,-9],[19,-1],[-10,1]]);
    rect('#3a2c46',-19,9,6,13);rect('#3a2c46',9,9,6,13);rect('#8d7b94',-19,20,9,3);rect('#8d7b94',9,20,9,3);
    poly('#50405a',[[7,-8],[9,-27],[16,-17],[23,-25],[25,-3],[30,4],[20,9]]);
    rect('#e47cbb',13,-9,4,4);rect('#e47cbb',21,-9,4,4);rect('#b2a2bd',27,2,7,5);
    poly('#776384',[[-23,3],[-37,-3],[-31,-17],[-27,-5],[-18,-4]]);
  } else {
    const wing = Math.sin(anim * 8) * 6;
    ellipse('#160e23',0,15,19,5);
    poly('#452c68',[[-5,-3],[-22,-23-wing],[-38,-11-wing],[-31,-4],[-22,-9],[-15,5],[-7,9]]);
    poly('#452c68',[[5,-3],[22,-23-wing],[38,-11-wing],[31,-4],[22,-9],[15,5],[7,9]]);
    line('#9561bc',2,[[-5,-2],[-22,-23-wing],[-38,-11-wing]]);line('#9561bc',2,[[5,-2],[22,-23-wing],[38,-11-wing]]);
    ellipse('#73508f',0,1,10,14);poly('#8c67a5',[[-9,-5],[-8,-18],[-2,-9],[5,-9],[10,-17],[10,-1]]);
    rect('#b9e9ff',-5,-2,3,4);rect('#b9e9ff',3,-2,3,4);rect('#d8cbec',-3,8,2,4);rect('#d8cbec',2,8,2,4);
  }
  ctx.restore();
}
function drawEggPortrait(target, rarity = 'common') {
  const original=ctx;ctx=target.getContext('2d');ctx.clearRect(0,0,120,100);ctx.imageSmoothingEnabled=false;
  const color=RARITIES[rarity].color;
  glow(60,50,44,color+'30');ellipse('#1b1226',60,85,28,8);
  poly('#42284f',[[34,62],[36,40],[45,20],[58,8],[68,11],[82,31],[88,56],[84,75],[72,84],[48,84],[37,76]]);
  poly(color,[[39,60],[41,41],[49,23],[59,13],[67,17],[78,34],[83,56],[79,72],[68,79],[50,78],[41,71]]);
  poly('#ffffff66',[[48,28],[57,19],[57,39],[48,48],[45,41]]);
  poly('#592f7066',[[58,51],[70,40],[79,53],[72,67],[61,66]]);rect('#f6e4ff',58,54,4,9);rect('#f6e4ff',54,58,12,3);ctx=original;
}
