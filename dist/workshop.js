'use strict';
let selectedRecipe='fang',pickedItemId=null,itemDrag=null,suppressItemClick=false;
const itemTier=tier=>['I','II','III'][tier-1];
function gearSlotHTML(member,detail=false){
 const item=equippedItem(member),label=SPECIES[member.species].name+': '+(item?ITEM_TYPES[item.type].name+' '+itemTier(item.tier):'пустой слот предмета');
 return `<button class="gear-slot ${item?'filled':''} ${detail?'detail-slot':''}" data-item-slot="${member.id}" aria-label="${label}"><span>${item?ITEM_TYPES[item.type].icon:'+'}</span>${item?'<small>'+itemTier(item.tier)+'</small>':''}</button>`;
}
function workshopStatsHTML(member){
 const spec=SPECIES[member.species],passive=PET_PASSIVES[member.species],item=equippedItem(member);
 return `<div class="smith-pet-heading"><h3>${spec.name}</h3><span>Ур. ${member.level} / ${save.unlocked}</span></div><dl><div><dt>HP</dt><dd>${petMaxHealth(member)}</dd></div><div><dt>Урон</dt><dd>${petDamage(member)}</dd></div><div><dt>Атака</dt><dd>${petAttackInterval(member).toFixed(2)} с</dd></div><div><dt>Опыт</dt><dd>${member.xp||0}/${xpNeeded(member.level)}</dd></div></dl><div class="smith-abilities"><span><small>Навык</small>${spec.skill}</span><span><small>Пассивка</small>${passive.name}</span></div><div class="smith-equipped">${gearSlotHTML(member,true)}<span><small>ПРЕДМЕТ · 1 СЛОТ</small><strong>${item?ITEM_TYPES[item.type].name+' '+itemTier(item.tier):'Пусто'}</strong>${item?'<em>'+itemEffect(item)+'</em>':''}</span><button id="unequip-item" class="gear-remove" ${item?'':'disabled'} aria-label="Снять предмет">Снять</button></div>`;
}
function recipeFor(type,member){
 const current=equippedItem(member),existing=current?.type===type?current:null,tier=existing?existing.tier+1:1,recipe=ITEM_TYPES[type];
 return {type,recipe,existing,tier,max:tier>3,cost:recipe.costs[tier-1]||0,gate:recipe.gates[tier-1]||0};
}
function renderWorkshop(id){
 if(state!=='camp')return;
 const retain=panel==='workshop',scroll=retain?$('workshop-collection')?.scrollTop||0:0,itemScroll=retain?$('item-inventory')?.scrollTop||0:0;
 if(!retain)pickedItemId=null;
 if(typeof id==='string')workshopMemberId=id;
 const member=save.pets.find(p=>p.id===workshopMemberId)||save.pets[0];workshopMemberId=member.id;inspectedPetId=member.id;
 if(!save.items.some(item=>item.id===pickedItemId))pickedItemId=null;
 const plan=recipeFor(selectedRecipe,member),picked=save.items.find(item=>item.id===pickedItemId);
 const collection=save.pets.map(p=>`<div class="smith-pet ${p.id===member.id?'selected':''}">${petTile(p,'workshop-icon-'+p.id,`data-workshop-pet="${p.id}" aria-pressed="${p.id===member.id}"`)}${gearSlotHTML(p)}</div>`).join('');
 const recipes=Object.entries(ITEM_TYPES).map(([key,type])=>{const step=recipeFor(key,member);return `<button class="recipe-cell ${key===selectedRecipe?'selected':''}" data-recipe="${key}" aria-pressed="${key===selectedRecipe}"><b>${type.icon}</b><span>${type.name}</span><small>${step.max?'Максимум':step.gate>save.unlocked?'Этаж '+step.gate:'◆ '+step.cost}</small></button>`;}).join('');
 const inventory=save.items.map(item=>{const assigned=save.pets.find(p=>p.itemId===item.id),type=ITEM_TYPES[item.type];return `<button class="item-cell ${item.id===pickedItemId?'picked':''} ${assigned?'assigned':''}" data-workshop-item="${item.id}" aria-pressed="${item.id===pickedItemId}" aria-label="${type.name} ${itemTier(item.tier)}${assigned?', '+SPECIES[assigned.species].name:''}"><span class="item-symbol" data-item-handle="true">${type.icon}<small>${itemTier(item.tier)}</small></span><span class="item-name">${type.name}</span><span class="item-owner">${assigned?SPECIES[assigned.species].name:'В рюкзаке'}</span></button>`;}).join('');
 showPanel('workshop',`<h1 id="dialog-title">Мастерская</h1><div class="smith-layout"><section class="smith-companions"><h2>Коллекция <span>${save.pets.length}</span></h2><div id="workshop-collection" class="collection-list">${collection}</div><aside id="pet-inspection" class="pet-inspection"></aside></section><section class="craft-column"><h2>Крафт</h2><div class="recipe-grid">${recipes}</div><div class="craft-preview"><div class="craft-emblem">${plan.recipe.icon}</div><h3>${plan.recipe.name}</h3><span class="craft-tier">${plan.max?'III':itemTier(plan.tier)}</span><p>${itemEffect({type:selectedRecipe,tier:Math.min(3,plan.tier)})}</p><span class="craft-requirement">${plan.max?'Максимальный ранг':plan.gate>save.unlocked?'Открывается на этаже '+plan.gate:plan.existing?'Усиление предмета питомца':'Новый предмет'}</span></div><button id="craft-item" class="action primary" ${plan.max||save.coins<plan.cost||save.unlocked<plan.gate?'disabled':''}>${plan.max?'Максимум':(plan.existing?'Усилить':'Создать')+' · ◆ '+plan.cost}</button></section><section class="smith-inventory" data-item-store="true"><h2>Предметы <span>${save.items.length}</span></h2><div id="item-inventory" class="item-grid">${inventory||'<span class="empty-collection">—</span>'}</div><div class="item-summary">${picked?'<strong>'+ITEM_TYPES[picked.type].icon+' '+ITEM_TYPES[picked.type].name+' '+itemTier(picked.tier)+'</strong><p>'+itemEffect(picked)+'</p>':''}</div></section></div><div id="equipment-status" class="sr-only" role="status"></div>`);
 $('pet-inspection').innerHTML=workshopStatsHTML(member);
 for(const pet of save.pets)drawPetPortrait($('workshop-icon-'+pet.id),pet);
 $('workshop-collection').scrollTop=scroll;$('item-inventory').scrollTop=itemScroll;
 $('dialog').querySelectorAll('[data-workshop-pet]').forEach(tile=>tile.onclick=()=>renderWorkshop(tile.dataset.workshopPet));
 $('dialog').querySelectorAll('[data-recipe]').forEach(button=>button.onclick=()=>{selectedRecipe=button.dataset.recipe;renderWorkshop(member.id);});
 $('craft-item').onclick=()=>{const item=craftItem(selectedRecipe,plan.existing?.id||null);if(item){pickedItemId=item.id;renderWorkshop(member.id);$('equipment-status').textContent='Создан '+ITEM_TYPES[item.type].name;}};
 $('dialog').querySelectorAll('[data-workshop-item]').forEach(tile=>{
  tile.addEventListener('pointerdown',startItemDrag);
  tile.onclick=()=>{if(suppressItemClick)return;pickedItemId=pickedItemId===tile.dataset.workshopItem?null:tile.dataset.workshopItem;renderWorkshop(member.id);};
 });
 $('dialog').querySelectorAll('[data-item-slot]').forEach(slot=>slot.onclick=()=>{if(pickedItemId)finishItemDrop(pickedItemId,slot.dataset.itemSlot);else renderWorkshop(slot.dataset.itemSlot);});
 $('unequip-item').onclick=()=>{if(equipItem(member.id,null)){renderWorkshop(member.id);$('equipment-status').textContent='Предмет снят';}};
}
function finishItemDrop(itemId,petId){
 if(state!=='camp'||panel!=='workshop')return false;
 const item=save.items.find(item=>item.id===itemId);if(!item)return false;
 const owner=save.pets.find(p=>p.itemId===itemId),target=petId==='inventory'?owner?.id:petId;
 if(!target||!equipItem(target,petId==='inventory'?null:itemId))return false;
 pickedItemId=null;beep(520);renderWorkshop(petId==='inventory'?workshopMemberId:petId);
 $('equipment-status').textContent=petId==='inventory'?'Предмет в рюкзаке':'Экипирован '+ITEM_TYPES[item.type].name;return true;
}
function startItemDrag(ev){
 if(panel!=='workshop'||state!=='camp'||ev.button>0||ev.isPrimary===false)return;
 const tile=ev.currentTarget;
 itemDrag={id:tile.dataset.workshopItem,pointer:ev.pointerId,x:ev.clientX,y:ev.clientY,tile,active:false,ghost:null,touch:ev.pointerType==='touch',handle:Boolean(ev.target.closest('[data-item-handle]'))};
 try{tile.setPointerCapture(ev.pointerId);}catch{}
}
function itemDropTarget(x,y){
 const hit=document.elementFromPoint(x,y),slot=hit?.closest('[data-item-slot]');
 if(slot&&$('dialog').contains(slot))return {node:slot,petId:slot.dataset.itemSlot};
 const store=hit?.closest('[data-item-store]');return store&&$('dialog').contains(store)?{node:store,petId:'inventory'}:null;
}
function clearItemDrag(){
 if(!itemDrag)return;
 itemDrag.ghost?.remove();itemDrag.tile?.classList.remove('drag-source');
 try{if(itemDrag.tile.hasPointerCapture(itemDrag.pointer))itemDrag.tile.releasePointerCapture(itemDrag.pointer);}catch{}
 $('dialog').querySelectorAll('.gear-drop-target').forEach(node=>node.classList.remove('gear-drop-target'));itemDrag=null;
}
function moveItemDrag(ev){
 if(!itemDrag||ev.pointerId!==itemDrag.pointer)return;
 const dx=ev.clientX-itemDrag.x,dy=ev.clientY-itemDrag.y;
 if(!itemDrag.active){
  if(Math.hypot(dx,dy)<8)return;
  if(itemDrag.touch&&!itemDrag.handle&&Math.abs(dy)>Math.abs(dx))return;
  const item=save.items.find(item=>item.id===itemDrag.id);if(!item){clearItemDrag();return;}
  itemDrag.active=true;itemDrag.tile.classList.add('drag-source');
  const ghost=document.createElement('div');ghost.className='item-drag-ghost';ghost.setAttribute('aria-hidden','true');ghost.innerHTML=`<span>${ITEM_TYPES[item.type].icon}</span><small>${itemTier(item.tier)}</small>`;document.body.append(ghost);itemDrag.ghost=ghost;
 }
 ev.preventDefault();itemDrag.ghost.style.left=(ev.clientX+12)+'px';itemDrag.ghost.style.top=(ev.clientY-25)+'px';
 $('dialog').querySelectorAll('.gear-drop-target').forEach(node=>node.classList.remove('gear-drop-target'));
 itemDropTarget(ev.clientX,ev.clientY)?.node.classList.add('gear-drop-target');
}
function endItemDrag(ev){
 if(!itemDrag||ev.pointerId!==itemDrag.pointer)return;
 const {id,active}=itemDrag,target=active?itemDropTarget(ev.clientX,ev.clientY):null;clearItemDrag();
 if(active){suppressItemClick=true;setTimeout(()=>suppressItemClick=false,0);if(target)finishItemDrop(id,target.petId);}
}
document.addEventListener('pointermove',moveItemDrag,{passive:false});
document.addEventListener('pointerup',endItemDrag);
document.addEventListener('pointercancel',clearItemDrag);
window.addEventListener('blur',clearItemDrag);
