'use strict';
const MAX_FLOOR=10;
// Fixed floor difficulty: buying upgrades makes the same encounters easier.
const FLOOR_RULES = {
  2: {health:38, guardHealth:58, count:3, bossHealth:340, damage:1, bossDps:5.3, pulseDamage:13, pulsePeriod:6.5, summonPeriod:11, abyssDelay:17, abyssSpeed:82},
  3: {health:60, guardHealth:90, count:3, bossHealth:560, damage:1.15, bossDps:6.3, pulseDamage:17, pulsePeriod:6, summonPeriod:10, abyssDelay:16, abyssSpeed:86},
  4: {health:88, guardHealth:132, count:4, bossHealth:1040, damage:1.3, bossDps:7.4, pulseDamage:21, pulsePeriod:5.5, summonPeriod:9, abyssDelay:15, abyssSpeed:90},
  5: {health:124, guardHealth:184, count:4, bossHealth:1780, damage:1.5, bossDps:8.8, pulseDamage:26, pulsePeriod:5, summonPeriod:8, abyssDelay:14, abyssSpeed:94},
  6: {health:185,guardHealth:275,count:4,bossHealth:3100,damage:1.95,bossDps:11,pulseDamage:30,pulsePeriod:5,summonPeriod:8,abyssDelay:14,abyssSpeed:98},
  7: {health:230,guardHealth:350,count:4,bossHealth:4400,damage:2.15,bossDps:12.5,pulseDamage:34,pulsePeriod:4.8,summonPeriod:7.5,abyssDelay:14,abyssSpeed:101},
  8: {health:285,guardHealth:430,count:5,bossHealth:6000,damage:2.4,bossDps:14,pulseDamage:38,pulsePeriod:4.6,summonPeriod:7,abyssDelay:13,abyssSpeed:104},
  9: {health:345,guardHealth:520,count:5,bossHealth:8000,damage:2.7,bossDps:16,pulseDamage:42,pulsePeriod:4.4,summonPeriod:6.5,abyssDelay:13,abyssSpeed:107},
  10:{health:420,guardHealth:640,count:5,bossHealth:10500,damage:3,bossDps:18,pulseDamage:48,pulsePeriod:4.2,summonPeriod:6,abyssDelay:12,abyssSpeed:110}
};
for(const n of [2,3,4,5]){
  const rules=FLOOR_RULES[n];rules.health=Math.round(rules.health*1.18);rules.guardHealth=Math.round(rules.guardHealth*1.18);rules.bossHealth=Math.round(rules.bossHealth*1.2);rules.damage*=1.12;rules.bossDps*=1.12;rules.pulseDamage=Math.round(rules.pulseDamage*1.1);rules.abyssDelay-=1;rules.abyssSpeed+=3;
}
for(const n of Object.keys(FLOOR_RULES))FLOOR_RULES[n].bossHealth=Math.round(FLOOR_RULES[n].bossHealth*(Number(n)<6?1.15:1.2));
function enemyStats(kind, summoned = false) {
  const rules = FLOOR_RULES[floor];
  const max = Math.round((kind === 'guard' ? rules.guardHealth : rules.health) * (summoned ? .65 : 1));
  return {hp:max,max,type:kind,armor:kind==='guard'?.2:0,dps:(kind==='guard'?2.1:1.25)*rules.damage,bounty:summoned?1:kind==='guard'?3:2,hit:0,frozen:0};
}
function summonGuards(initial = false) {
  const alive = enemies.filter(e=>e.hp>0&&e.type!=='boss'&&Math.abs(e.p-p)<300).length;
  const count = Math.min(initial ? Math.min(4,1+Math.floor(floor/2)) : 2, Math.max(0,6-alive));
  for(let j=0;j<count;j++) enemies.push({p:1850+j*24,off:j%2?91:-91,...enemyStats('shadow',true)});
}
function spawnBoss() {
  const rules=FLOOR_RULES[floor];
  boss={p:1910,off:0,hp:rules.bossHealth,max:rules.bossHealth,type:'boss',armor:0,dps:rules.bossDps,bounty:0,hit:0,frozen:0,pulse:3.8,windup:0,summon:rules.summonPeriod,enraged:false};
  enemies.push(boss);summonGuards(true);
}
function updateBoss(dt) {
  if(!boss||boss.hp<=0||boss.frozen>0)return;
  const rules=FLOOR_RULES[floor];
  boss.enraged=boss.hp<boss.max*.5;
  boss.summon-=dt;
  if(boss.summon<=0){summonGuards();boss.summon=rules.summonPeriod*(boss.enraged?.8:1);}
  if(boss.windup>0){
    boss.windup=Math.max(0,boss.windup-dt);
    if(boss.windup===0){damageSquad(rules.pulseDamage*(boss.enraged?1.2:1)*(1-.05*skillRank('blastResist')),true);if(floor>=6)ignitePets(2.5,(1.4+floor*.12)*(1-.05*skillRank('blastResist')));flash=.25;boss.pulse=rules.pulsePeriod*(boss.enraged?.8:1);effects.push({p,off:0,life:.65,max:.65,r:245,skill:true,color:'#f0649a'});}
  }else{
    boss.pulse-=dt;
    if(boss.pulse<=0)boss.windup=floor>=6?1.6:1.2;
  }
}
function interruptBoss(target) {
  if(target===boss && boss.windup>0){boss.windup=0;boss.pulse=FLOOR_RULES[floor].pulsePeriod;boss.frozen=Math.max(boss.frozen,.65);effects.push({p:boss.p,off:0,life:.4,max:.4,r:80,skill:true,color:'#fff0b6'});}
}
// Injuries carry across consecutive floors; the camp restores every owned pet.
const petVitals = new Map();
function petMaxHealth(member) {
  const base={cat:64,wolf:90,bat:44}[member.species];
  return Math.round((base+(member.level-1)*12)*Math.sqrt(RARITIES[member.rarity].mult)*(1+.1*skillRank('health'))*(1+itemBonus(member).hp));
}
function createCombatPet(member) {
  const maxHp=petMaxHealth(member),health=Math.min(maxHp,petVitals.get(member.id)??maxHp);
  return {member,maxHp,hp:health,shield:health>0&&owns('shield')?maxHp*(.05*skillRank('shield')):0,cooldown:0,attack:0,fallenAt:health<=0?65:null};
}
function hurtPet(entry,amount) {
  if(entry.hp<=0||amount<=0)return;
  const temporary=Math.min(entry.rallyShield||0,amount);entry.rallyShield=Math.max(0,(entry.rallyShield||0)-temporary);amount-=temporary;
  const absorbed=Math.min(entry.shield||0,amount);entry.shield=Math.max(0,(entry.shield||0)-absorbed);amount-=absorbed;
  entry.hp=Math.max(0,entry.hp-amount);petVitals.set(entry.member.id,entry.hp);
  if(entry.hp===0){entry.fallenAt=p+65+combatPets.indexOf(entry)*19;effects.push({p:entry.fallenAt,off:0,life:.6,max:.6,r:44,skill:true,color:'#d1c8e4'});}
}
function damageSquad(amount,area=false) {
  if(amount<=0)return;
  const alive=combatPets.filter(entry=>entry.hp>0);
  if(area)alive.forEach(entry=>hurtPet(entry,amount*(1-itemBonus(entry.member).resist)));
  else {
    // Wolves take the front line. Damage cannot hit a pet twice in one update.
    const front=alive.find(entry=>entry.member.species==='wolf')||alive[0];
    if(front)hurtPet(front,amount*(1-.05*skillRank('armor'))*(front.member.species==='wolf'?.88:1));
  }
}

function healPet(entry,amount) { if(entry.hp<=0||amount<=0)return;entry.hp=Math.min(entry.maxHp,entry.hp+amount);petVitals.set(entry.member.id,entry.hp); }
