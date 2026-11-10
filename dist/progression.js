'use strict';
const RARITIES = {
  common: {name: 'Обычный', egg: 'Обычное', color: '#c4b7ce', mult: 1},
  rare: {name: 'Редкий', egg: 'Редкое', color: '#7db9fa', mult: 1.35},
  epic: {name: 'Эпический', egg: 'Эпическое', color: '#d28bff', mult: 1.8},
  legendary: {name: 'Легендарный', egg: 'Легендарное', color: '#f2c174', mult: 2.5}
};
const SPECIES = {
  cat: {name: 'Белая кошка', damage: 12, interval: .55, icon: '✦', skill: 'Лунный всплеск', description: 'Удар по области', skillDamage: 34, cooldown: 8},
  wolf: {name: 'Сумеречный волк', damage: 16, interval: .85, icon: '»', skill: 'Теневой рывок', description: 'Сильный удар по трём целям', skillDamage: 50, cooldown: 10},
  bat: {name: 'Ледяной крылан', damage: 9, interval: .4, icon: '❄', skill: 'Ледяной крик', description: 'Урон и заморозка на 3 сек.', skillDamage: 14, cooldown: 12}
};
const BRANCHES = [
  {id: 'squad', name: 'Отряд', icon: '♧', nodes: [
    {id: 'slot2', name: 'Второй спутник', effect: '2 места в отряде', cost: 45},
    {id: 'slot3', name: 'Третий спутник', effect: '3 места в отряде', cost: 150},
    {id: 'slot4', name: 'Четвёртый спутник', effect: '4 места в отряде', cost: 220},
    {id: 'skillPower', name: 'Лунная сила', effect: 'Урон навыков +30%', cost: 80, prerequisite:null},
    {id: 'cooldown', name: 'Быстрый отклик', effect: 'Перезарядка навыков −25%', cost: 90},
    {id:'armor',name:'Стальная шкура',effect:'Урон в ближнем бою −15%',cost:70,prerequisite:'health'},
    {id:'attackSpeed',name:'Инстинкт охоты',effect:'Скорость атак +15%',cost:95,prerequisite:'armor'},
    {id:'lifesteal',name:'Жажда жизни',effect:'Атаки восстанавливают 5% нанесённого урона',cost:120,prerequisite:'attackSpeed'},
    {id:'blastResist',name:'Единая стая',effect:'Урон атак босса по области −20%',cost:100,prerequisite:'skillPower'}
  ]},
  {id: 'eggs', name: 'Яйца', icon: '◈', nodes: [
    {id: 'rarity', name: 'Счастливая звезда', effect: 'Шанс редкого и выше: 55%', cost: 40},
    {id: 'discount', name: 'Бережливость', effect: 'Цена яйца −20%', cost: 45},
    {id:'rarity2',name:'Созвездие удачи',effect:'Шанс эпического и легендарного: 32%',cost:120,prerequisite:'rarity'},
    {id:'discount2',name:'Верный покупатель',effect:'Цена яйца: 20 кристаллов',cost:85,prerequisite:'discount'},
    {id:'trained',name:'Первые шаги',effect:'Опыт в бою +10%',cost:110,prerequisite:'rarity2'}
  ]},
  {id: 'run', name: 'Забег', icon: '◇', nodes: [
    {id: 'health', name: 'Крепкое сердце', effect: 'Здоровье питомцев +25%', cost: 25},
    {id: 'damage', name: 'Острые когти', effect: 'Весь урон +20%', cost: 40},
    {id: 'speed', name: 'Лёгкий шаг', effect: 'Скорость героя +15%', cost: 55},
    {id: 'abyss', name: 'Отсрочка тьмы', effect: 'Бездна наступает на 5 сек. позже', cost: 65},
    {id: 'magnet', name: 'Зов кристаллов', effect: 'Автосбор рядом с героем', cost: 50, prerequisite:null},
    {id:'bounty',name:'Трофеи бездны',effect:'За каждого врага +1 кристалл',cost:75,prerequisite:'damage'},
    {id:'magnet2',name:'Притяжение',effect:'Радиус автосбора: 205',cost:100,prerequisite:'magnet'},
    {id:'shield',name:'Защитный оберег',effect:'Живые питомцы начинают этаж со щитом 20% HP',cost:95,prerequisite:'health'}
  ]}
];
const TREE_NODES = BRANCHES.flatMap(branch => branch.nodes.map((node, i) => ({...node, branch: branch.id, tier: i, prerequisite: Object.hasOwn(node,'prerequisite')?node.prerequisite:(i?branch.nodes[i-1].id:null)})));
let combatPets = [], pendingPetRewards = [];
const LEGACY_SKILL_RANKS={health:3,damage:2,skillPower:3,cooldown:5,armor:3,attackSpeed:3,lifesteal:5,blastResist:4,rarity:5,discount:2,rarity2:5,discount2:4,trained:1,speed:3,abyss:5,magnet:1,bounty:1,magnet2:5,shield:4};
const skillMaxRank=id=>['slot2','slot3','slot4'].includes(id)?1:5;
function skillRank(id){return save.nodes.includes(id)?Math.max(1,Math.min(skillMaxRank(id),Math.floor(save.nodeRanks?.[id]||1))):0;}
const owns=id=>skillRank(id)>0;
function skillCost(id){const node=TREE_NODES.find(n=>n.id===id);return node?Math.ceil((skillMaxRank(id)===1?node.cost:(id==='magnet'?50:Math.ceil(node.cost*.8)))*(1+.15*skillRank(id))):Infinity;}
const squadCapacity=()=>owns('slot4')?4:owns('slot3')?3:owns('slot2')?2:1;
const eggPrice=()=>Math.max(10,Math.round(30*(1-.1*skillRank('discount'))-skillRank('discount2')));
function rarityOdds(){const a=skillRank('rarity'),b=skillRank('rarity2');return [60-3*a-3*b,28+1.4*a+.6*b,10+1.2*a+1.6*b,2+.4*a+.8*b].map(n=>Math.round(n*10)/10);}
const petAttackInterval=member=>SPECIES[member.species].interval/(1+.05*skillRank('attackSpeed'));
const petSkillCooldown=member=>SPECIES[member.species].cooldown*(1-.05*skillRank('cooldown'));
const crystalRadius=()=>135+Math.max(0,skillRank('magnet')-1)*15+skillRank('magnet2')*14;
function skillEffect(id,rank=skillRank(id)){
  const pct=n=>Math.round(n*1000)/10;
  const effects={health:`Здоровье питомцев +${rank*10}%`,damage:`Весь урон +${rank*10}%`,skillPower:`Урон навыков +${rank*10}%`,cooldown:`Перезарядка навыков −${rank*5}%`,armor:`Урон в ближнем бою −${rank*5}%`,attackSpeed:`Скорость атак +${rank*5}%`,lifesteal:`Лечение от атак: ${rank}% урона`,blastResist:`Урон атак босса по области −${rank*5}%`,rarity:`Шанс редкого и выше +${rank*3} п.п.`,rarity2:`Шанс эпического и легендарного +${pct(rank*.024)} п.п.`,discount:`Цена яйца −${rank*10}%`,discount2:`Дополнительная скидка: ${rank} крист.`,trained:`Опыт в бою +${rank*10}%`,speed:`Скорость героя +${rank*5}%`,abyss:`Бездна наступает на ${rank} сек. позже`,magnet:rank?`Автосбор в радиусе ${135+(rank-1)*15}`:'Автосбор выключен',magnet2:`Радиус автосбора +${rank*14}`,bounty:`Награда за врага +${rank} (до снижения дохода)`,shield:`Щит в начале этажа: ${rank*5}% HP`};
  return effects[id]||TREE_NODES.find(n=>n.id===id)?.effect||'';
}
function restoreProgression(base, stored) {
  const input = stored || {};
  const validRecord = r => r && typeof r === 'object' && typeof r.id === 'string' && /^[a-zA-Z0-9_-]{1,60}$/.test(r.id) && Object.hasOwn(SPECIES, r.species) && Object.hasOwn(RARITIES, r.rarity);
  const itemIds=new Set();
  const items=(Array.isArray(input.items)?input.items:[]).filter(i=>i&&typeof i.id==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(i.id)&&Object.hasOwn(ITEM_TYPES,i.type)&&!itemIds.has(i.id)&&itemIds.add(i.id)).map(i=>({id:i.id,type:i.type,tier:Math.max(1,Math.min(3,Math.floor(Number(i.tier)||1)))}));
  const usedItems=new Set();
  const seen = new Set();
  const pets = (Array.isArray(input.pets) ? input.pets : []).filter(r => validRecord(r) && !seen.has(r.id) && seen.add(r.id)).map(r => ({id: r.id, species: r.species, rarity: r.rarity, level: Math.max(1, Math.min(base.unlocked, Math.floor(Number(r.level) || 1))),xp:Math.max(0,Math.min(10000,Math.floor(Number(r.xp)||0))),itemId:items.some(i=>i.id===r.itemId)&&!usedItems.has(r.itemId)&&usedItems.add(r.itemId)?r.itemId:null}));
  if (!pets.some(r => r.id === 'starter-cat')) pets.unshift({id: 'starter-cat', species: 'cat', rarity: 'common', level: 1});
  const nodes = [],nodeRanks={};
  const rankedSave=Number(input.schema)>=6;
  const requested=new Map(TREE_NODES.map(node=>{
    const listed=Array.isArray(input.nodes)&&input.nodes.includes(node.id),raw=Number(input.nodeRanks?.[node.id]);
    return [node.id,rankedSave?Math.min(skillMaxRank(node.id),Math.max(0,Number.isFinite(raw)?Math.floor(raw):listed?1:0)):listed?(LEGACY_SKILL_RANKS[node.id]||1):0];
  }));
  for(let pass=0;pass<TREE_NODES.length;pass++)for(const node of TREE_NODES){const rank=requested.get(node.id);if(rank>0&&!nodes.includes(node.id)&&(!node.prerequisite||nodes.includes(node.prerequisite))){nodes.push(node.id);nodeRanks[node.id]=rank;}}
  const capacity = nodes.includes('slot4') ? 4 : nodes.includes('slot3') ? 3 : nodes.includes('slot2') ? 2 : 1;
  const squadSeen = new Set();
  const squad = Array.from({length: capacity}, (_, i) => {
    const id = Array.isArray(input.squad) ? input.squad[i] : null;
    if (pets.some(r => r.id === id) && !squadSeen.has(id)) { squadSeen.add(id); return id; }
    return null;
  });
  if (!squad.some(Boolean)) squad[0] = 'starter-cat';
  // Convert already paid eggs once; old incubation upgrades are refunded.
  const legacyEggs = (Array.isArray(input.eggs) ? input.eggs : []).slice();
  if (input.incubator?.egg) legacyEggs.push(input.incubator.egg);
  const eggIds = new Set();
  const eggs = legacyEggs.filter(r => validRecord(r) && !eggIds.has(r.id) && eggIds.add(r.id));
  const ids = [...pets, ...eggs, ...items].map(r => Number(r.id.match(/-(\d+)$/)?.[1]) || 0);
  let nextId = Math.max(1, Math.min(1e12, Math.floor(Number(input.nextId) || 1)), ...ids.map(id => id + 1));
  for (const egg of eggs) {
    const member = {id: 'pet-' + nextId++, species: egg.species, rarity: egg.rarity, level: 1};
    pets.push(member); pendingPetRewards.push(member.id);
  }
  const obsolete = {incubation: 25, autoHatch: 65, storage: 60};
  const refund = input.schema < 4 || !input.schema ? Object.entries(obsolete).reduce((sum, [id,cost]) => sum + (Array.isArray(input.nodes) && input.nodes.includes(id) ? cost : 0), 0) : 0;
  return {...base, coins: Math.min(1e8, base.coins + refund), schema: 7, crystalRemainder:Math.max(0,Math.min(14,(Number(input.schema)>=7?1:5)*Math.floor(Number(input.crystalRemainder)||0))), pets, squad, nodes, nodeRanks, nextId,items,bestiary:Object.fromEntries(Object.entries(input.bestiary||{}).filter(([id,r])=>BESTIARY_IDS.includes(id)&&r&&typeof r==='object').map(([id,r])=>[id,{kills:Math.max(0,Math.floor(Number(r.kills)||0)),floor:Math.max(2,Math.min(10,Math.floor(Number(r.floor)||2)))}]))};
}
function squadMembers() { return save.squad.slice(0, squadCapacity()).map(id => save.pets.find(r => r.id === id)).filter(Boolean); }
function petDamage(member) { return Math.round((SPECIES[member.species].damage + save.level * 4 + (member.level - 1) * 5) * RARITIES[member.rarity].mult * (1+.1*skillRank('damage'))*(1+itemBonus(member).damage)); }
function skillDamage(member) { return Math.round((SPECIES[member.species].skillDamage + save.level * 8 + (member.level - 1) * 4) * RARITIES[member.rarity].mult * (1+.1*skillRank('damage')) * (1+.1*skillRank('skillPower'))*(1+itemBonus(member).damage)); }
function buyEgg() {
  const price = eggPrice();
  if (state !== 'camp' || save.coins < price) return null;
  const roll = Math.random() * 100, odds = rarityOdds(); let threshold = 0, rarity = 'common';
  for (const [i, key] of Object.keys(RARITIES).entries()) { threshold += odds[i]; if (roll < threshold) { rarity = key; break; } }
  const member = {id: 'pet-' + save.nextId++, rarity, species: Object.keys(SPECIES)[Math.floor(Math.random() * 3)], level:1,xp:0,itemId:null};
  save.coins -= price; save.pets.push(member); persist(); beep(800); syncHUD(); return member;
}
function purchaseNode(id){
  const node=TREE_NODES.find(n=>n.id===id),rank=skillRank(id),cost=skillCost(id);
  if(state!=='camp'||!node||rank>=skillMaxRank(id)||save.coins<cost||(node.prerequisite&&!owns(node.prerequisite)))return false;
  save.coins-=cost;save.nodeRanks||={};save.nodeRanks[id]=rank+1;
  if(!save.nodes.includes(id))save.nodes.push(id);
  persist();syncHUD();beep(550);return true;
}
function equipPet(id, slot) {
  if (state !== 'camp' || !Number.isInteger(slot) || slot < 0 || slot >= squadCapacity() || !save.pets.some(r => r.id === id)) return false;
  const oldSlot = save.squad.indexOf(id), previous = save.squad[slot] || null;
  if (oldSlot === slot) return false;
  save.squad[slot] = id;
  if (oldSlot >= 0) save.squad[oldSlot] = previous;
  persist(); syncHUD(); return true;
}
function removeFromSquad(id) {
  if (state !== 'camp' || squadMembers().length <= 1) return false;
  const slot = save.squad.indexOf(id); if (slot < 0) return false;
  save.squad[slot] = null; persist(); syncHUD(); return true;
}
function showEggMachine() {
  if (state !== 'camp') return;
  const odds = rarityOdds();
  showPanel('eggs', `<h1 id="dialog-title">Автомат яиц</h1><div class="egg-display"><canvas id="machine-egg" width="120" height="100" aria-label="Яйцо бездны"></canvas></div><div class="egg-odds">${Object.entries(RARITIES).map(([key,r],i) => `<span style="--rarity:${r.color}">${r.name}<b>${odds[i]}%</b></span>`).join('')}</div><div class="actions"><button id="purchase-egg" class="action primary" ${save.coins < eggPrice() ? 'disabled' : ''}>Купить · ◆ ${eggPrice()}</button></div>`);
  drawEggPortrait($('machine-egg'), 'epic');
  $('purchase-egg').onclick = purchaseAndReveal;
}
function purchaseAndReveal() { const member = buyEgg(); if (member) showHatch(member); }
function showHatch(member) {
  const spec = SPECIES[member.species], rarity = RARITIES[member.rarity];
  showPanel('hatch', `<h1 id="dialog-title">${spec.name}</h1><div class="egg-reveal" style="--rarity:${rarity.color}"><div class="egg-shell shell-left"><canvas id="shell-left" width="120" height="100" aria-hidden="true"></canvas></div><div class="egg-shell shell-right"><canvas id="shell-right" width="120" height="100" aria-hidden="true"></canvas></div><canvas id="hatched-pet" class="revealed-pet" width="120" height="100" aria-label="${spec.name}"></canvas></div><p class="rarity-text" style="--rarity:${rarity.color}">${rarity.name} · Ур. ${member.level}</p><div class="actions"><button id="hatch-squad" class="action">Отряд</button><button id="purchase-egg" class="action primary" ${save.coins < eggPrice() ? 'disabled' : ''}>Ещё · ◆ ${eggPrice()}</button></div>`);
  drawEggPortrait($('shell-left'), member.rarity); drawEggPortrait($('shell-right'), member.rarity); drawPetPortrait($('hatched-pet'), member);
  $('hatch-squad').onclick = showPets; $('purchase-egg').onclick = purchaseAndReveal;
}
function showMigratedPets() {
  const members = pendingPetRewards.map(id => save.pets.find(p => p.id === id)).filter(Boolean); pendingPetRewards = [];
  if (!members.length) return;
  if (members.length === 1) { showHatch(members[0]); return; }
  showPanel('migration', `<h1 id="dialog-title">Получены питомцы</h1><div class="migrated-pets">${members.map(member => petTile(member, 'migrated-' + member.id)).join('')}</div><div class="actions"><button id="migrated-squad" class="action primary">Отряд</button></div>`);
  members.forEach(member => drawPetPortrait($('migrated-' + member.id), member));
  $('migrated-squad').onclick = showPets;
}
function petTile(member, canvasId, attributes = '') {
  const name = SPECIES[member.species].name;
  return `<button class="pet-tile" data-inspect="${member.id}" ${attributes} style="--rarity:${RARITIES[member.rarity].color}" aria-label="${name}, уровень ${member.level}, ${RARITIES[member.rarity].name}"><canvas id="${canvasId}" width="120" height="100" aria-hidden="true" draggable="false"></canvas><span class="tile-text"><span class="tile-name">${name}</span><span class="tile-level">Ур. ${member.level}</span></span></button>`;
}
let pickedPetId = null;
function showPets() {
  if (state !== 'camp') return;
  const oldScroll = panel === 'pets' ? $('collection-list')?.scrollTop || 0 : 0;
  const available = save.pets.filter(member => !save.squad.includes(member.id));
  const slots = Array.from({length:squadCapacity()}, (_, i) => {
    const member = save.pets.find(r => r.id === save.squad[i]);
    return member ? petTile(member, 'slot-pet-' + i, `data-drop-slot="${i}" data-pet="${member.id}" data-from-slot="${i}"`) : `<button class="pet-tile empty-slot" data-drop-slot="${i}" aria-label="Пустое место ${i+1}"><span>+</span></button>`;
  }).join('');
  showPanel('pets', `<h1 id="dialog-title">Питомцы</h1><div class="pets-body"><div class="squad-layout"><section class="squad-column"><h2>Отряд <span>${squadMembers().length}/${squadCapacity()}</span></h2><div id="squad-slots" class="squad-drop-slots">${slots}</div></section><section class="collection-column"><h2>Коллекция <span>${available.length}</span></h2><div id="collection-list" class="collection-list" data-collection="true">${available.map(member => petTile(member, 'roster-' + member.id, `data-pet="${member.id}"`)).join('')}${!available.length ? '<span class="empty-collection">—</span>' : ''}</div></section></div><aside id="pet-inspection" class="pet-inspection"></aside></div><div id="squad-status" class="sr-only" role="status"></div>`);
  for (let i=0;i<squadCapacity();i++) { const member=save.pets.find(r=>r.id===save.squad[i]); if(member)drawPetPortrait($('slot-pet-'+i),member); }
  available.forEach(member=>drawPetPortrait($('roster-'+member.id),member));
  $('collection-list').scrollTop = oldScroll;
  bindPetInspection();
  $('dialog').querySelectorAll('[data-pet]').forEach(tile => {
    tile.addEventListener('pointerdown', startPetDrag);
    tile.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectPetForDrop(tile.dataset.pet); }
    });
    tile.onclick = ev => { ev.preventDefault(); if (!suppressPetClick) selectPetForDrop(tile.dataset.pet); };
    if (tile.dataset.pet === pickedPetId) { tile.classList.add('picked'); tile.setAttribute('aria-pressed','true'); }
  });
  $('dialog').querySelectorAll('[data-drop-slot]').forEach(tile => {
    if (!tile.dataset.pet) tile.onclick = () => { if(pickedPetId) finishPetDrop(pickedPetId, Number(tile.dataset.dropSlot)); };
  });
}
function selectPetForDrop(id) {
  if(state !== 'camp' || panel !== 'pets')return;
  const slot = save.squad.indexOf(id);
  if(pickedPetId && slot >= 0 && pickedPetId !== id) { finishPetDrop(pickedPetId,slot); return; }
  inspectedPetId=id;
  pickedPetId = pickedPetId === id ? null : id;
  showPets();
  if(pickedPetId) $('squad-status').textContent = SPECIES[save.pets.find(p=>p.id===pickedPetId).species].name;
}
function finishPetDrop(id, slot) {
  const changed = slot === 'collection' ? removeFromSquad(id) : equipPet(id,slot);
  pickedPetId = null;
  if(changed)beep(500);
  if(panel==='pets')showPets();
  return changed;
}
let petDrag = null, suppressPetClick = false;
function startPetDrag(ev) {
  if(panel !== 'pets' || state !== 'camp' || ev.button > 0 || !ev.isPrimary)return;
  const tile = ev.currentTarget;
  petDrag = {id:tile.dataset.pet, pointer:ev.pointerId, x:ev.clientX, y:ev.clientY, tile, active:false, ghost:null, touch:ev.pointerType==='touch', handle:ev.target.tagName==='CANVAS'};
  try{tile.setPointerCapture(ev.pointerId);}catch{}
}
function clearPetDrag() {
  if(!petDrag)return;
  petDrag.ghost?.remove();petDrag.tile?.classList.remove('drag-source');
  try{if(petDrag.tile.hasPointerCapture(petDrag.pointer))petDrag.tile.releasePointerCapture(petDrag.pointer);}catch{}
  $('dialog').querySelectorAll('.drop-target').forEach(node=>node.classList.remove('drop-target'));
  petDrag=null;
}
function petDropTarget(x,y) {
  const hit=document.elementFromPoint(x,y);
  const slot=hit?.closest('[data-drop-slot]');
  if(slot && $('dialog').contains(slot))return {node:slot,slot:Number(slot.dataset.dropSlot)};
  const collection=hit?.closest('[data-collection]');
  return collection && $('dialog').contains(collection) ? {node:collection,slot:'collection'} : null;
}
function movePetDrag(ev) {
  if(!petDrag || ev.pointerId!==petDrag.pointer)return;
  const dx=ev.clientX-petDrag.x,dy=ev.clientY-petDrag.y;
  if(!petDrag.active){
    if(Math.hypot(dx,dy)<8)return;
    if(petDrag.touch && !petDrag.handle && Math.abs(dy)>Math.abs(dx))return;
    petDrag.active=true;petDrag.tile.classList.add('drag-source');
    const member=save.pets.find(p=>p.id===petDrag.id);
    const ghost=document.createElement('div');ghost.className='pet-drag-ghost';ghost.inert=true;ghost.setAttribute('aria-hidden','true');ghost.innerHTML=petTile(member,'drag-pet');document.body.append(ghost);drawPetPortrait($('drag-pet'),member);petDrag.ghost=ghost;
  }
  ev.preventDefault();
  petDrag.ghost.style.left=(ev.clientX+14)+'px';petDrag.ghost.style.top=(ev.clientY-24)+'px';
  $('dialog').querySelectorAll('.drop-target').forEach(node=>node.classList.remove('drop-target'));
  petDropTarget(ev.clientX,ev.clientY)?.node.classList.add('drop-target');
}
function endPetDrag(ev) {
  if(!petDrag || ev.pointerId!==petDrag.pointer)return;
  const {id,active}=petDrag,target=active?petDropTarget(ev.clientX,ev.clientY):null;
  clearPetDrag();
  if(active){suppressPetClick=true;setTimeout(()=>suppressPetClick=false,0);if(target)finishPetDrop(id,target.slot);}
}
let selectedTreeNode = 'slot2', treeView = {x:0,y:0,zoom:.7}, treeDrag = null;
const TREE_LAYOUT={slot2:[420,245],slot3:[250,165],slot4:[160,70],skillPower:[145,295],cooldown:[300,350],armor:[450,90],attackSpeed:[310,60],lifesteal:[130,175],blastResist:[80,415],rarity:[820,160],discount:[1010,305],rarity2:[1030,75],discount2:[1110,420],trained:[825,330],health:[420,575],damage:[240,615],speed:[145,755],abyss:[830,685],magnet:[555,470],bounty:[615,735],magnet2:[1110,565],shield:[615,560]};
const TREE_MAJOR=new Set(['slot2','slot4','rarity','discount','speed','abyss']);
function treePosition(node){const p=TREE_LAYOUT[node.id];return{x:p[0],y:p[1]};}
function treeIcon(id){
  if(['slot2','slot3','slot4','trained','rarity2'].includes(id))return '<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="9" cy="12" rx="4" ry="6"/><ellipse cx="18" cy="8" rx="4" ry="6"/><ellipse cx="28" cy="11" rx="4" ry="6"/><ellipse cx="34" cy="20" rx="4" ry="5"/><path d="M8 30C8 23 15 15 20 17C25 17 31 25 30 31C29 38 23 33 19 33C14 34 8 37 8 30Z"/></svg>';
  if(id==='rarity'||id==='discount'||id==='discount2')return '<svg viewBox="0 0 40 40" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.5" d="M20 4C12 4 6 21 7 28C8 39 33 39 33 28C33 20 28 4 20 4Z"/><circle cx="17" cy="15" r="2.5"/><circle cx="25" cy="25" r="3"/><circle cx="14" cy="29" r="2"/></svg>';
  const icons={skillPower:'⚔',cooldown:'◷',armor:'◈',attackSpeed:'ϟ',lifesteal:'♥',blastResist:'⛨',health:'♥',damage:'⚔',speed:'»',abyss:'⌛',magnet:'∩',bounty:'◆',magnet2:'⊕',shield:'⛨'};
  return '<span aria-hidden="true">'+(icons[id]||'◇')+'</span>';
}
function treeEdge(node){
  const to=treePosition(node),from=node.prerequisite?treePosition(TREE_NODES.find(n=>n.id===node.prerequisite)):{x:600,y:430};
  let c1={x:from.x,y:to.y},c2={x:to.x,y:from.y};
  if(node.id==='abyss'){c1={x:320,y:900};c2={x:750,y:850};}
  const at=t=>({x:(1-t)**3*from.x+3*(1-t)**2*t*c1.x+3*(1-t)*t*t*c2.x+t**3*to.x,y:(1-t)**3*from.y+3*(1-t)**2*t*c1.y+3*(1-t)*t*t*c2.y+t**3*to.y});
  const cls=owns(node.id)?'lit':!node.prerequisite||owns(node.prerequisite)?'reachable':'';
  const dots=[.2,.4,.6,.8].map(t=>{const p=at(t);return `<circle cx="${p.x}" cy="${p.y}" r="5"/>`;}).join('');
  return `<g class="${cls}"><path d="M${from.x} ${from.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}"/>${dots}</g>`;
}
function showTree(){
  if(state!=='camp')return;const retain=panel==='tree';
  const nodes=TREE_NODES.map(node=>{const p=treePosition(node),bought=owns(node.id),locked=node.prerequisite&&!owns(node.prerequisite),major=TREE_MAJOR.has(node.id);return `<button class="map-node ${major?'keystone':''} ${bought?'owned':locked?'locked':'available'} ${selectedTreeNode===node.id?'selected':''}" data-node="${node.id}" aria-label="${node.name}, уровень ${skillRank(node.id)} из ${skillMaxRank(node.id)}" aria-pressed="${selectedTreeNode===node.id}" style="left:${p.x}px;top:${p.y}px"><span class="map-orb">${treeIcon(node.id)}</span><span class="node-rank">${skillRank(node.id)}/${skillMaxRank(node.id)}</span>${major?'<span class="keystone-name">'+node.name+'</span>':''}</button>`;}).join('');
  const mini=TREE_NODES.map(node=>{const p=treePosition(node);return `<circle cx="${p.x}" cy="${p.y}" r="7" class="${owns(node.id)?'owned':''}"/>`;}).join('');
  showPanel('tree',`<div class="tree-heading"><h1 id="dialog-title">Карта навыков <span class="heading-count">${TREE_NODES.reduce((sum,n)=>sum+skillRank(n.id),0)} / ${TREE_NODES.reduce((sum,n)=>sum+skillMaxRank(n.id),0)}</span></h1></div><div class="tree-body"><div id="tree-map" class="tree-map" aria-label="Карта улучшений"><div id="tree-map-world" class="tree-map-world"><svg class="tree-paths" viewBox="0 0 1200 850" aria-hidden="true">${TREE_NODES.map(treeEdge).join('')}</svg><span class="map-branch-name" style="left:65px;top:5px">ОТРЯД</span><span class="map-branch-name" style="left:1000px;top:5px">ЯЙЦА</span><span class="map-branch-name" style="left:510px;top:800px">ЗАБЕГ</span><div class="map-root" style="left:600px;top:430px">◇</div>${nodes}</div><div class="map-navigation"><svg id="tree-minimap" class="tree-minimap" viewBox="0 0 1200 850" role="img" aria-label="Миникарта">${mini}<rect id="minimap-view" x="0" y="0" width="1200" height="850"/></svg><div class="map-controls"><button id="map-zoom-out" aria-label="Уменьшить">−</button><span id="map-percent"></span><button id="map-zoom-in" aria-label="Увеличить">+</button><button id="map-fit" aria-label="Показать всю карту">⛶</button></div></div></div><aside id="tree-details" class="tree-details"></aside></div>`);
  if(!retain){const map=$('tree-map');treeView.zoom=Math.max(.32,Math.min(1,map.clientWidth/1250,map.clientHeight/880));treeView.x=(map.clientWidth-1200*treeView.zoom)/2;treeView.y=(map.clientHeight-850*treeView.zoom)/2;}
  applyTreeView();showTreeDetails();
  $('dialog').querySelectorAll('[data-node]').forEach(btn=>btn.onclick=()=>{selectedTreeNode=btn.dataset.node;showTreeDetails();});
  $('tree-map').addEventListener('pointerdown',startTreePan);
  $('tree-map').addEventListener('wheel',ev=>{if(ev.target.closest('.map-navigation'))return;ev.preventDefault();zoomTree(Math.exp(-ev.deltaY*.0015),ev.clientX,ev.clientY);},{passive:false});
  $('map-zoom-in').onclick=()=>zoomTree(1.2);$('map-zoom-out').onclick=()=>zoomTree(1/1.2);$('map-fit').onclick=fitTreeMap;
  $('tree-minimap').addEventListener('pointerdown',ev=>{ev.stopPropagation();const r=$('tree-minimap').getBoundingClientRect();treeView.x=$('tree-map').clientWidth/2-(ev.clientX-r.left)/r.width*1200*treeView.zoom;treeView.y=$('tree-map').clientHeight/2-(ev.clientY-r.top)/r.height*850*treeView.zoom;applyTreeView();});
}
function showTreeDetails(){
  const node=TREE_NODES.find(n=>n.id===selectedTreeNode)||TREE_NODES[0];selectedTreeNode=node.id;
  const rank=skillRank(node.id),max=skillMaxRank(node.id),complete=rank>=max,cost=skillCost(node.id),locked=node.prerequisite&&!owns(node.prerequisite),need=node.prerequisite?TREE_NODES.find(n=>n.id===node.prerequisite).name:'';
  $('tree-details').innerHTML=`<span class="tree-detail-branch">${BRANCHES.find(b=>b.id===node.branch).name}</span><div class="tree-detail-icon">${treeIcon(node.id)}</div><h2>${node.name}</h2><div class="skill-rank-track" aria-label="Уровень ${rank} из ${max}">${Array.from({length:max},(_,i)=>`<i class="${i<rank?'filled':''}"></i>`).join('')}<span>${rank}/${max}</span></div><p class="tree-detail-effect">${rank?skillEffect(node.id,rank):'Не изучено'}${!complete?`<small>Следующий уровень<br>${skillEffect(node.id,rank+1)}</small>`:''}</p><div class="tree-requirement ${locked?'unmet':'met'}">${locked?'◇ Сначала: '+need:complete?'✓ Максимальный уровень':'✓ Требование выполнено'}</div><div class="tree-detail-cost"><span>${complete?'Изучено':'Стоимость уровня'}</span><strong>${complete?rank+'/'+max:'◆ '+cost}</strong></div><button id="unlock-node" class="action primary" ${complete||locked||save.coins<cost?'disabled':''}>${complete?'Максимум':(rank?'Улучшить':'Изучить')+' за '+cost}</button>`;
  $('dialog').querySelectorAll('[data-node]').forEach(btn=>{const selected=btn.dataset.node===node.id;btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',String(selected));});
  $('unlock-node').onclick=()=>{if(purchaseNode(node.id))showTree();};
}
function applyTreeView() {
  if(panel!=='tree'||!$('tree-map'))return;
  const w=$('tree-map').clientWidth,h=$('tree-map').clientHeight,z=treeView.zoom;
  treeView.x=Math.max(Math.min(0,w-1200*z)-120,Math.min(Math.max(0,w-1200*z)+120,treeView.x));
  treeView.y=Math.max(Math.min(0,h-850*z)-100,Math.min(Math.max(0,h-850*z)+100,treeView.y));
  $('tree-map-world').style.transform=`translate(${treeView.x}px,${treeView.y}px) scale(${z})`;
  if($('map-percent'))$('map-percent').textContent=Math.round(z*100)+'%';
  if($('minimap-view')){const rect=$('minimap-view');const mw=Math.min(1200,w/z),mh=Math.min(850,h/z);rect.setAttribute('x',Math.max(0,Math.min(1200-mw,-treeView.x/z)));rect.setAttribute('y',Math.max(0,Math.min(850-mh,-treeView.y/z)));rect.setAttribute('width',mw);rect.setAttribute('height',mh);}
}
function zoomTree(factor,clientX,clientY) {
  if(panel!=='tree')return;
  const map=$('tree-map'),rect=map.getBoundingClientRect(),x=clientX===undefined?map.clientWidth/2:clientX-rect.left,y=clientY===undefined?map.clientHeight/2:clientY-rect.top;
  const next=Math.max(.25,Math.min(1.7,treeView.zoom*factor)),ratio=next/treeView.zoom;
  treeView.x=x-(x-treeView.x)*ratio;treeView.y=y-(y-treeView.y)*ratio;treeView.zoom=next;applyTreeView();
}
function fitTreeMap() {
  if(panel!=='tree')return;const map=$('tree-map');treeView.zoom=Math.max(.25,Math.min(1,map.clientWidth/1280,map.clientHeight/930));treeView.x=(map.clientWidth-1200*treeView.zoom)/2;treeView.y=(map.clientHeight-850*treeView.zoom)/2;applyTreeView();
}
function startTreePan(ev) {
  if(panel!=='tree'||ev.button>0||!ev.isPrimary||ev.target.closest('button')||ev.target.closest('.map-navigation'))return;
  treeDrag={pointer:ev.pointerId,x:ev.clientX,y:ev.clientY,baseX:treeView.x,baseY:treeView.y};
  $('tree-map').classList.add('panning');try{$('tree-map').setPointerCapture(ev.pointerId);}catch{}ev.preventDefault();
}
function moveTreePan(ev) {
  if(!treeDrag||ev.pointerId!==treeDrag.pointer)return;
  ev.preventDefault();treeView.x=treeDrag.baseX+ev.clientX-treeDrag.x;treeView.y=treeDrag.baseY+ev.clientY-treeDrag.y;applyTreeView();
}
function clearTreePan() {
  if(!treeDrag)return;
  try{if($('tree-map')?.hasPointerCapture(treeDrag.pointer))$('tree-map').releasePointerCapture(treeDrag.pointer);}catch{}
  $('tree-map')?.classList.remove('panning');treeDrag=null;
}
document.addEventListener('pointermove',ev=>{movePetDrag(ev);moveTreePan(ev);},{passive:false});
document.addEventListener('pointerup',ev=>{endPetDrag(ev);if(treeDrag?.pointer===ev.pointerId)clearTreePan();});
document.addEventListener('pointercancel',()=>{clearPetDrag();clearTreePan();});
window.addEventListener('blur',()=>{clearPetDrag();clearTreePan();});
function buildSkillButtons() {
  $('skills').innerHTML = combatPets.map((entry, i) => `<button class="pet-skill" id="pet-skill-${i}" data-skill="${i}" style="--rarity:${RARITIES[entry.member.rarity].color}" aria-label="${SPECIES[entry.member.species].skill}"><span class="skill-symbol">${SPECIES[entry.member.species].icon}</span><span class="skill-cooldown" id="pet-cd-${i}"></span></button>`).join('')+'<button class="pet-skill" id="rally-skill" style="--rarity:#d8c291" aria-label="Оплот стаи: щит 20% HP на 3 сек., перезарядка 18 сек."><span class="skill-symbol">⛨</span><span class="skill-cooldown" id="rally-cd"></span></button>';
  $('rally-skill').onclick=rally;
  $('skills').querySelectorAll('[data-skill]').forEach(btn => btn.onclick = () => skill(Number(btn.dataset.skill)));
}
function syncProgressionHUD() {
  $('pets').setAttribute('aria-label','Отряд: '+squadMembers().length+' из '+squadCapacity());
  if($('purchase-egg'))$('purchase-egg').disabled=save.coins<eggPrice();
  $('skills').hidden=state!=='run';
  if($('rally-skill')){$('rally-skill').disabled=paused||Boolean(panel)||state!=='run'||rallyCooldown>0||!combatPets.some(entry=>entry.hp>0);$('rally-cd').textContent=rallyCooldown>0?Math.ceil(rallyCooldown):'';}
  combatPets.forEach((entry,i)=>{const button=$('pet-skill-'+i);if(!button)return;button.disabled=paused||Boolean(panel)||state!=='run'||entry.hp<=0||entry.cooldown>0;button.classList.toggle('fallen',entry.hp<=0);$('pet-cd-'+i).textContent=entry.hp<=0?'†':entry.cooldown>0?Math.ceil(entry.cooldown):'';button.setAttribute('aria-label',SPECIES[entry.member.species].name+': '+(entry.hp<=0?'пал':Math.ceil(entry.hp)+' из '+entry.maxHp+' здоровья')+'; '+SPECIES[entry.member.species].skill);});
}
function showResetConfirmation() {
  if(panel==='result')return;
  paused=state==='run';
  showPanel('reset', '<h1 id="dialog-title">Сбросить прогресс?</h1><p>Этажи, питомцы, кристаллы и улучшения будут удалены.</p><div class="actions"><button id="cancel-reset" class="action">Отмена</button><button id="confirm-reset" class="action danger">Сбросить</button></div>');
  $('cancel-reset').onclick=showSettings;
  $('confirm-reset').onclick=resetProgress;
  $('cancel-reset').focus();
}
function resetProgress() {
  save=restoreProgression({coins:0,level:0,unlocked:2,completed:[]},null);
  pendingPetRewards=[];selectedTreeNode='slot2';pickedPetId=null;workshopMemberId='starter-cat';hoveredCampObject=null;
  petVitals.clear();camp();persist();
}
let partyHealthSignature = '';
function syncPartyHealth() {
  const party=state==='camp'?squadMembers().map(member=>({member,hp:petMaxHealth(member),maxHp:petMaxHealth(member)})):combatPets;
  const signature=party.map(entry=>entry.member.id+':'+entry.member.species+':'+entry.member.rarity).join('|');
  if(signature!==partyHealthSignature || !$('party-health').children.length){
    partyHealthSignature=signature;
    $('party-health').innerHTML=party.map((entry,i)=>`<div class="party-vital" id="party-vital-${i}"><canvas id="party-icon-${i}" width="120" height="100" aria-hidden="true"></canvas><div class="party-vital-data"><span id="party-number-${i}" class="party-vital-number"></span><progress id="party-bar-${i}" max="${entry.maxHp}" value="${entry.hp}" aria-label="Здоровье ${SPECIES[entry.member.species].name}"></progress></div></div>`).join('');
    party.forEach((entry,i)=>drawPetPortrait($('party-icon-'+i),entry.member));
    $('world').style.setProperty('--party-size',party.length);
  }
  party.forEach((entry,i)=>{
    const current=Math.max(0,Math.ceil(entry.hp)),number=$('party-number-'+i),row=$('party-vital-'+i),bar=$('party-bar-'+i);
    const value=current+'/'+entry.maxHp;if(number.textContent!==value)number.textContent=value;
    bar.max=entry.maxHp;bar.value=entry.hp;
    row.classList.toggle('shielded',entry.shield>0||entry.rallyShield>0);row.classList.toggle('dead',entry.hp<=0);row.classList.toggle('critical',entry.hp>0&&entry.hp/entry.maxHp<=.3);
    row.setAttribute('aria-label',SPECIES[entry.member.species].name+': '+current+' из '+entry.maxHp);
  });
}

function awardCrystals(raw) {
  const factor=state!=='camp'&&floor>=2?floor+3:5;
  const total=Math.max(0,Math.floor(raw))*2*factor+(save.crystalRemainder||0),credit=Math.floor(total/15);
  save.crystalRemainder=total%15;save.coins+=credit;return credit;
}
