'use strict';
const RUN_SECONDS=45;
let rallyCooldown=0;
function rally(){
 if(state!=='run'||paused||panel||rallyCooldown>0)return false;
 const alive=combatPets.filter(entry=>entry.hp>0);if(!alive.length)return false;
 rallyCooldown=18;
 for(const entry of alive){entry.rallyShield=entry.maxHp*.2;entry.rallyTime=3;}
 effects.push({p,off:0,life:.7,max:.7,r:180,skill:true,color:'#d8c291'});beep(420);syncHUD();return true;
}
const ITEM_TYPES={
 fang:{name:'Коготь охотника',icon:'⚔',costs:[60,320,950],gates:[2,4,7],damage:[.30,.65,1.1],hp:[0,0,0],heal:[0,0,0],resist:[0,0,0]},
 heart:{name:'Каменное сердце',icon:'♥',costs:[55,300,900],gates:[2,4,7],damage:[0,0,0],hp:[.45,.95,1.65],heal:[0,0,0],resist:[0,0,0]},
 ember:{name:'Угольный амулет',icon:'✦',costs:[75,380,1100],gates:[3,5,8],damage:[.15,.35,.6],hp:[0,0,0],heal:[.015,.03,.05],resist:[.15,.3,.5]},
 ward:{name:'Печать стража',icon:'◇',costs:[65,350,1050],gates:[3,5,8],damage:[0,0,0],hp:[.2,.45,.75],heal:[0,0,0],resist:[.2,.35,.5]}
};
const PET_PASSIVES={cat:{name:'Девять жизней',text:'Каждая пятая атака лечит кошку на 6% максимального HP.'},wolf:{name:'Вожак',text:'Принимает удары первым и снижает урон ближнего боя на 12%.'},bat:{name:'Ледяное эхо',text:'Каждая четвёртая атака замораживает цель на 0,7 сек. Босса — на 0,25 сек.'}};
function equippedItem(member){return save.items.find(item=>item.id===member.itemId)||null;}
function itemBonus(member){const item=equippedItem(member);if(!item)return{damage:0,hp:0,heal:0,resist:0};const type=ITEM_TYPES[item.type],i=item.tier-1;return{damage:type.damage[i],hp:type.hp[i],heal:type.heal[i],resist:type.resist[i]};}
function itemEffect(item){const b=ITEM_TYPES[item.type],i=item.tier-1;return[b.damage[i]?'Урон +'+Math.round(b.damage[i]*100)+'%':'',b.hp[i]?'HP +'+Math.round(b.hp[i]*100)+'%':'',b.heal[i]?'Лечение от ударов '+Math.round(b.heal[i]*1000)/10+'%':'',b.resist[i]?'Защита от области '+Math.round(b.resist[i]*100)+'%':''].filter(Boolean).join(' · ');}
function craftItem(type,upgradeId=null){
 if(state!=='camp'||!ITEM_TYPES[type])return null;
 const existing=upgradeId?save.items.find(item=>item.id===upgradeId&&item.type===type):null;
 if(upgradeId&&!existing)return null;const next=existing?existing.tier+1:1;if(next>3)return null;
 const recipe=ITEM_TYPES[type],cost=recipe.costs[next-1];if(save.unlocked<recipe.gates[next-1]||save.coins<cost)return null;
 save.coins-=cost;
 const item=existing||(save.items[save.items.push({id:'item-'+save.nextId++,type,tier:0})-1]);item.tier=next;persist();syncHUD();beep(600);return item;
}
function equipItem(petId,itemId){
 if(state!=='camp')return false;const member=save.pets.find(p=>p.id===petId);if(!member)return false;
 if(itemId!==null&&!save.items.some(i=>i.id===itemId))return false;
 if(itemId)for(const other of save.pets)if(other.id!==petId&&other.itemId===itemId)other.itemId=null;
 member.itemId=itemId;persist();syncHUD();return true;
}
function xpNeeded(level){return 35+(level-1)*100;}
function grantBattleXP(enemy){
 const alive=combatPets.filter(e=>e.hp>0);if(!alive.length)return;
 const total=enemy.type==='boss'?18+floor*6:(enemy.type==='guard'?6:4)+floor;
 const each=Math.max(1,Math.floor(total*(1+.1*skillRank('trained'))/alive.length));
 for(const entry of alive){const member=entry.member;member.xp=(member.xp||0)+each;
  while(member.level<save.unlocked&&member.xp>=xpNeeded(member.level)){
   member.xp-=xpNeeded(member.level);member.level++;const previous=entry.maxHp;entry.maxHp=petMaxHealth(member);entry.hp=Math.min(entry.maxHp,entry.hp+entry.maxHp-previous);petVitals.set(member.id,entry.hp);effects.push({p:p+65,off:0,life:.6,max:.6,r:35,skill:true,color:'#f3ce7d'});
  }
  if(member.level>=save.unlocked)member.xp=Math.min(member.xp,xpNeeded(member.level)-1);
 }
}
function petOnAttack(entry,target){
 entry.hits=(entry.hits||0)+1;
 if(entry.member.species==='cat'&&entry.hits%5===0)healPet(entry,entry.maxHp*.06);
 if(entry.member.species==='bat'&&entry.hits%4===0&&target.hp>0)target.frozen=Math.max(target.frozen||0,target.type==='boss'?.25:.7);
}
let inspectedPetId='starter-cat';
function petStatsHTML(member){
 const spec=SPECIES[member.species],passive=PET_PASSIVES[member.species],item=equippedItem(member);
 return `<h2>${spec.name}</h2><span class="stat-level">Ур. ${member.level} / ${save.unlocked}</span><div class="stat-portrait"><canvas id="inspection-icon" width="120" height="100" aria-label="${spec.name}"></canvas></div><dl><div><dt>HP</dt><dd>${petMaxHealth(member)}</dd></div><div><dt>Урон</dt><dd>${petDamage(member)}</dd></div><div><dt>Атака</dt><dd>${petAttackInterval(member).toFixed(2)} сек.</dd></div><div><dt>${PET_REACH[member.species].melee?'Ближний бой':'Дальний бой'}</dt><dd>${petRange(member)}</dd></div><div><dt>Опыт</dt><dd>${member.xp||0}/${xpNeeded(member.level)}</dd></div></dl><section><small>НАВЫК</small><strong>${spec.icon} ${spec.skill}</strong><p>${spec.description} · ${skillDamage(member)} урона · ${petSkillCooldown(member).toFixed(1)} сек.</p></section><section><small>ПАССИВКА</small><strong>${passive.name}</strong><p>${passive.text}</p></section><section><small>ПРЕДМЕТ · 1 СЛОТ</small><strong>${item?ITEM_TYPES[item.type].icon+' '+ITEM_TYPES[item.type].name+' '+item.tier:'Пусто'}</strong>${item?'<p>'+itemEffect(item)+'</p>':''}</section>`;
}
function inspectPet(id){
 const member=save.pets.find(p=>p.id===id)||save.pets[0];inspectedPetId=member.id;
 if(!$('pet-inspection'))return;$('pet-inspection').innerHTML=petStatsHTML(member);drawPetPortrait($('inspection-icon'),member);
}
function bindPetInspection(){
 $('dialog').querySelectorAll('[data-inspect]').forEach(tile=>{tile.addEventListener('pointerenter',()=>inspectPet(tile.dataset.inspect));tile.addEventListener('focus',()=>inspectPet(tile.dataset.inspect));});
 inspectPet(inspectedPetId);
}
const BESTIARY_IDS=['ruins-shadow','ruins-guard','fire-shadow','fire-guard',...Array.from({length:9},(_,i)=>'boss-'+(i+2))];
function enemyBookId(enemy,stage=floor){return enemy.type==='boss'?'boss-'+stage:(stage>=6?'fire':'ruins')+'-'+enemy.type;}
function recordEncounter(enemy,killed=false){const id=enemyBookId(enemy);const fresh=!save.bestiary[id];const entry=save.bestiary[id]||(save.bestiary[id]={kills:0,floor});entry.floor=Math.max(entry.floor,floor);if(killed)entry.kills++;if(fresh)persist();}
function bestiaryName(id){if(id.startsWith('boss-'))return bosses[Number(id.slice(5))-1];return {'ruins-shadow':'Тень руин','ruins-guard':'Страж руин','fire-shadow':'Угольная тень','fire-guard':'Страж горна'}[id];}
let selectedBestiary='ruins-shadow',bookSnapshot=null;
function showBestiary(id=null,snapshot=null){
 if(panel==='result')return;
 if(state==='run')paused=true;
 if(typeof id==='string'&&BESTIARY_IDS.includes(id))selectedBestiary=id;
 if(snapshot)bookSnapshot=snapshot;
 if(!save.bestiary[selectedBestiary])selectedBestiary=BESTIARY_IDS.find(key=>save.bestiary[key])||'ruins-shadow';
 const record=save.bestiary[selectedBestiary],stage=bookSnapshot?.id===selectedBestiary?bookSnapshot.floor:record?.floor||2,bossEntry=selectedBestiary.startsWith('boss-'),guard=selectedBestiary.endsWith('guard'),rules=FLOOR_RULES[stage];
 const health=bookSnapshot?.id===selectedBestiary?bookSnapshot.max:bossEntry?rules.bossHealth:guard?rules.guardHealth:rules.health;
 const ability=bossEntry?'Разлом: удар по всем питомцам после подготовки. Прерывается навыком.':guard?'Щит бездны: каждые 6 сек. страж укрепляет броню на 2,5 сек. Навык питомца сбивает защиту.':'Без активного навыка. Быстро окружает переднего питомца.';
 const desc=record?`<h2>${bestiaryName(selectedBestiary)}</h2><span class="stat-level">Этаж ${stage} · Убито ${record.kills}</span><div class="book-art"><canvas id="book-enemy" width="240" height="250" aria-label="${bestiaryName(selectedBestiary)}"></canvas></div><dl><div><dt>Здоровье</dt><dd>${health}</dd></div><div><dt>Урон / сек.</dt><dd>${(bossEntry?rules.bossDps:(guard?2.1:1.25)*rules.damage).toFixed(1)}</dd></div><div><dt>Броня</dt><dd>${guard?'20%':'0%'}</dd></div></dl><h3>${guard?'Щит бездны':bossEntry?'Разлом':'Поведение'}</h3><p>${ability}</p>`:'<p>Нет записей</p>';
 showPanel('bestiary',`<h1 id="dialog-title">Бестиарий</h1><div class="bestiary-layout"><div class="bestiary-list">${BESTIARY_IDS.map(key=>`<button class="book-entry ${key===selectedBestiary?'selected':''}" data-book="${key}" ${save.bestiary[key]?'':'disabled'}>${save.bestiary[key]?bestiaryName(key):'Неизвестный'}</button>`).join('')}</div><section class="bestiary-page">${desc}</section></div>`);
 $('dialog').querySelectorAll('[data-book]').forEach(button=>button.onclick=()=>{bookSnapshot=null;showBestiary(button.dataset.book);});
 if(record){const original=ctx;ctx=$('book-enemy').getContext('2d');ctx.clearRect(0,0,240,250);const fake={hp:health,max:health,type:bossEntry?'boss':guard?'guard':'shadow',hit:0};if(selectedBestiary==='boss-10')drawFireTreant(fake,120,205);else if(stage>=6)drawFireEnemy(fake,120,150,stage);else drawRuinsEnemy(fake,120,150);ctx=original;}
}
function clickEnemy(ev){
 if(state!=='run'||panel||paused)return false;const point=pointerPosition(ev);
 const target=enemies.filter(e=>e.hp>0).sort((a,b)=>b.p-a.p).find(e=>Math.hypot(point.x-path(e.p)-e.off,point.y-sy(e.p))<(e.type==='boss'?105:35));
 if(!target)return false;recordEncounter(target);persist();showBestiary(enemyBookId(target),{id:enemyBookId(target),max:target.max,floor});return true;
}
function updateEnemySkills(dt){
 for(const enemy of enemies){
  if(enemy.hp<=0||enemy.type!=='guard'||Math.abs(enemy.p-p)>220||enemy.frozen>0)continue;
  if(enemy.brace>0){enemy.brace=Math.max(0,enemy.brace-dt);enemy.armor=enemy.brace>0?.55:.2;}
  else{enemy.braceTimer=(enemy.braceTimer??4)-dt;if(enemy.braceTimer<=0){enemy.brace=2.5;enemy.braceTimer=6;enemy.armor=.55;}}
 }
}
