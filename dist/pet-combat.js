'use strict';
// Positions and attack state belong to one run; they never enter the save file.
const PET_REACH={
 cat:{range:42,speed:265,melee:true,hop:18},
 wolf:{range:52,speed:285,melee:true,hop:23},
 bat:{range:210,speed:245,melee:false,hop:0}
};
let petShots=[];
function petRange(member){return PET_REACH[member.species].range;}
function enemyRadius(e){return e.type==='boss'?58:e.type==='guard'?26:19;}
function petFormation(index){
 const spread=(index-(combatPets.length-1)/2)*55;
 return {x:path(p+56)+spread,p:p+56+(index%2)*13};
}
function petMotion(entry,index=combatPets.indexOf(entry)){
 if(!entry.motion){
  const f=petFormation(index);
  entry.motion={x:f.x,p:f.p,vx:0,vp:0,hop:0,back:true,flip:false,moving:false,target:null,action:null,seed:index*2.4+.8};
 }
 return entry.motion;
}
function resetPetCombat(){petShots=[];for(const entry of combatPets)delete entry.motion;}
function petDistance(m,e){return Math.hypot(m.x-path(e.p)-(e.off||0),m.p-e.p);}
function petStrike(entry,target){
 if(entry.hp<=0||target.hp<=0)return;
 const before=target.hp;
 hit(target,petDamage(entry.member));
 healPet(entry,Math.max(0,before-Math.max(0,target.hp))*(.01*skillRank('lifesteal')+itemBonus(entry.member).heal));
 petOnAttack(entry,target);
}
function steerPet(m,gx,gp,speed,dt,index){
 const dx=gx-m.x,dp=gp-m.p,d=Math.hypot(dx,dp);
 // A curved approach eases into a stable contact slot, rather than orbiting the enemy.
 const bend=Math.sin(m.seed+d*.018)*Math.min(.38,d/220);
 let vx=0,vp=0;
 if(d>2){
  const pace=Math.min(speed,d*7);
  vx=(dx/d-dp/d*bend)*pace;vp=(dp/d+dx/d*bend)*pace;
  for(let j=0;j<combatPets.length;j++){
   if(j===index||combatPets[j].hp<=0||!combatPets[j].motion)continue;
   const other=combatPets[j].motion,ax=m.x-other.x,ap=m.p-other.p,apart=Math.hypot(ax,ap);
   if(apart>1&&apart<30){vx+=ax/apart*(30-apart)*4;vp+=ap/apart*(30-apart)*4;}
  }
 }
 const easing=1-Math.exp(-10*dt);
 m.vx+=(vx-m.vx)*easing;m.vp+=(vp-m.vp)*easing;
 const magnitude=Math.hypot(m.vx,m.vp),limit=Math.min(speed,magnitude);
 if(magnitude>0){m.vx*=limit/magnitude;m.vp*=limit/magnitude;}
 m.x+=m.vx*dt;m.p+=m.vp*dt;
 m.moving=Math.hypot(m.vx,m.vp)>15;
 if(m.moving){m.back=m.vp>0;m.flip=m.vx< -8;}
}
function updatePetCombat(dt){
 for(let index=0;index<combatPets.length;index++){
  const entry=combatPets[index],m=petMotion(entry,index),rules=PET_REACH[entry.member.species];
  if(entry.hp<=0){m.hop=0;m.action=null;continue;}
  if(m.action){
   const a=m.action;a.elapsed+=dt;
   const q=Math.min(1,a.elapsed/a.duration),lunge=Math.sin(Math.PI*q)*a.lunge;
   m.x=a.x+a.dx*lunge;m.p=a.p+a.dp*lunge;m.hop=Math.sin(Math.PI*q)*rules.hop;
   m.moving=true;
   if(!a.struck&&q>=.5){
    a.struck=true;
    if(a.target.hp>0&&petDistance(m,a.target)<=rules.range+enemyRadius(a.target)+4)petStrike(entry,a.target);
   }
   if(q>=1){m.action=null;m.hop=0;m.vx=0;m.vp=0;}
   continue;
  }
  const candidates=enemies.filter(e=>e.hp>0&&e.p>p-155&&e.p<p+270);
  if(!m.target||!candidates.includes(m.target)){
   m.target=candidates.sort((a,b)=>petDistance(m,a)-petDistance(m,b))[0]||null;
  }
  const target=m.target;
  if(!target){
   const f=petFormation(index);steerPet(m,f.x,f.p,rules.speed,dt,index);continue;
  }
  const tx=path(target.p)+(target.off||0),tp=target.p;
  const facing=Math.atan2(p-tp,path(p)-tx)+(index-(combatPets.length-1)/2)*.52;
  const radius=enemyRadius(target)+(rules.melee?rules.range*.48:rules.range*.78);
  steerPet(m,tx+Math.cos(facing)*radius,tp+Math.sin(facing)*radius,rules.speed,dt,index);
  m.back=tp>m.p;m.flip=tx<m.x-3;
  if(entry.attack>0||petDistance(m,target)>rules.range+enemyRadius(target))continue;
  entry.attack=petAttackInterval(entry.member);
  if(rules.melee){
   const d=Math.max(1,petDistance(m,target));
   m.action={elapsed:0,duration:Math.min(.32,entry.attack*.85),x:m.x,p:m.p,dx:(tx-m.x)/d,dp:(tp-m.p)/d,lunge:13,target,struck:false};
  }else{
   petShots.push({entry,target,x:m.x,p:m.p,age:0});
  }
 }
 for(const shot of petShots){
  shot.age+=dt;
  if(shot.entry.hp<=0||shot.target.hp<=0||shot.age>1.5){shot.done=true;continue;}
  const dx=path(shot.target.p)+(shot.target.off||0)-shot.x,dp=shot.target.p-shot.p,d=Math.hypot(dx,dp),move=dt*620;
  if(d<=move+enemyRadius(shot.target)*.35){petStrike(shot.entry,shot.target);shot.done=true;}
  else {shot.x+=dx/d*move;shot.p+=dp/d*move;}
 }
 petShots=petShots.filter(shot=>!shot.done);
}
function damagePetContacts(dt){
 // Basic melee damage follows contact with actual pets. Boss pulses remain area attacks.
 const attacks=[];
 for(const e of enemies){
  if(e.hp<=0||e.frozen>0)continue;
  const nearby=combatPets.filter(entry=>entry.hp>0&&petDistance(petMotion(entry),e)<=enemyRadius(e)+76);
  if(!nearby.length)continue;
  nearby.sort((a,b)=>(a.member.species==='wolf'?0:1)-(b.member.species==='wolf'?0:1)||petDistance(a.motion,e)-petDistance(b.motion,e));
  attacks.push({entry:nearby[0],dps:(e.dps||1.25)*(e===boss&&boss.enraged?1.2:1)});
 }
 const sum=attacks.reduce((v,a)=>v+a.dps,0),factor=sum>16?16/sum:1;
 for(const a of attacks)hurtPet(a.entry,dt*a.dps*factor*(1-.05*skillRank('armor'))*(a.entry.member.species==='wolf'?.88:1));
 if(sum&&Math.sin(t*9)>.8)flash=.1;
}
function drawMovingPet(entry,index){
 const m=petMotion(entry,index),y=sy(m.p),scale=1.15,feet={cat:18,wolf:24,bat:16}[entry.member.species]*scale;
 ellipse('#100e1c55',m.x,y+feet,entry.member.species==='wolf'?24:18,5);
 drawPet(entry.member,m.x,y-m.hop,scale,{back:m.back,flip:m.flip,moving:m.moving,hideShadow:true});
 if(entry.burning?.remaining>0)flame(m.x,y+15-m.hop,.35);
 if(entry.shield>0||entry.rallyShield>0){
  ctx.strokeStyle='#d7b575';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(m.x,y-m.hop,24,29,0,0,Math.PI*2);ctx.stroke();
 }
 if(m.action&&m.action.struck){
  const a=m.action,q=a.elapsed/a.duration;ctx.save();ctx.globalAlpha=Math.max(0,(1-q)*1.4);ctx.strokeStyle='#eee2bd';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(m.x+a.dx*20,y-a.dp*15,17,9,-Math.atan2(a.dp,a.dx),-.8,1.8);ctx.stroke();ctx.restore();
 }
}
function drawPetProjectiles(){
 for(const shot of petShots){
  const y=sy(shot.p),dx=path(shot.target.p)+(shot.target.off||0)-shot.x,dp=shot.target.p-shot.p,d=Math.max(1,Math.hypot(dx,dp));
  line('#8db9d188',2,[[shot.x-dx/d*13,y+dp/d*10],[shot.x,y]]);
  poly('#c5edf1',[[shot.x,y-4],[shot.x+4,y],[shot.x,y+4],[shot.x-4,y]]);
 }
}
function drawPetRange(){
 // Only inspect the range when the corresponding existing skill button is hovered or focused.
 const button=document.querySelector('#skills [data-skill]:hover')||document.activeElement;
 if(!button||button.dataset?.skill===undefined)return;
 const entry=combatPets[Number(button.dataset.skill)];if(!entry||entry.hp<=0)return;
 const m=petMotion(entry),radius=petRange(entry.member);
 ctx.save();ctx.strokeStyle=PET_REACH[entry.member.species].melee?'#d9d0ad77':'#9ccfe577';ctx.lineWidth=1;ctx.setLineDash([5,5]);
 ctx.beginPath();ctx.ellipse(m.x,sy(m.p)+18,radius,radius*.75,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
