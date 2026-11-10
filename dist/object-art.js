'use strict';
// Diffuse object sprites. The atlas contains no light bloom or animated effects.
const OBJECT_ART={image:null,ready:false,cache:new Map(),frames:{
 tree:[6,11,405,396],tent:[437,19,377,372],forge:[847,27,399,367],
 eggs:[101,440,217,368],portal:[437,419,381,392],arch:[867,435,370,372],
 column:[98,851,218,380],crystals:[463,870,325,343],lantern:[987,860,118,365]
}};
function drawObjectSprite(name,x,y,w,h){
 if(!OBJECT_ART.ready||floor>=6)return false;
 const frame=OBJECT_ART.frames[name],key=name+':'+w+':'+h;
 let sprite=OBJECT_ART.cache.get(key);
 if(!sprite){
  sprite=document.createElement('canvas');sprite.width=Math.max(1,Math.round(w/2));sprite.height=Math.max(1,Math.round(h/2));
  const brush=sprite.getContext('2d');brush.imageSmoothingEnabled=false;brush.drawImage(OBJECT_ART.image,...frame,0,0,sprite.width,sprite.height);OBJECT_ART.cache.set(key,sprite);
 }
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite,Math.round(x),Math.round(y),Math.round(w),Math.round(h));ctx.restore();return true;
}
if(typeof Image!=='undefined'){
 const atlas=new Image();atlas.onload=()=>{OBJECT_ART.image=atlas;OBJECT_ART.ready=true;OBJECT_ART.cache.clear();if(typeof refreshCampArt==='function')refreshCampArt();};atlas.src='assets/ruins-objects.png';
}

// Lighting is drawn every frame, independently of the cached diffuse camp art.
function objectLight(x,y,r,color,phase=0){glow(x,y,r*(1+Math.sin(anim*2.5+phase)*.035),color);}
function drawCampObjectLighting(){
 if(!OBJECT_ART.ready||state!=='camp')return;
 const s=campPoints(),f=campFrame();
 drawCampObject('meta-tree',()=>objectLight(s.tree.x+63,s.tree.y-85,78,'#c18de42a',1));
 drawCampObject('pets',()=>{
  for(const [dx,dy]of [[-55,6],[90,0]]){objectLight(s.tent.x+dx,s.tent.y+dy,45,'#efae5d25',dx);rect('#e6b46b',s.tent.x+dx-2,s.tent.y+dy-3,4,6);}
 });
 drawCampObject('workshop',()=>{
  objectLight(s.forge.x+70,s.forge.y-7,64,'#e9a34c2a',2);
  for(const dx of [-107,15]){objectLight(s.forge.x+dx,s.forge.y-28,39,'#e5b66a21',dx);rect('#d9af6c',s.forge.x+dx-1,s.forge.y-31,3,5);}
 });
 drawCampObject('egg-machine',()=>objectLight(s.tent.x-94,s.tent.y+22,43,'#b797d71c',3));
 drawCampObject('portal',()=>{objectLight(s.portal.x,s.portal.y-20,92,'#a76bd523',4);});
 for(const side of [-1,1]){
  objectLight(f.x+side*f.w*.25,f.top+f.h*.64-25,48,'#e8b86e24',side);
  objectLight(s.tree.x+side*170,s.tree.y-11,44,'#b994d62b',side);
 }
}
function drawCrystalLight(x,y,size){objectLight(x,y-5*size,29*size,'#b988d421',x);ctx.save();ctx.globalAlpha=.45+Math.sin(anim*2+x)*.12;rect('#d7b1e9',x-2*size,y-13*size,Math.max(1,2*size),Math.max(2,5*size));ctx.restore();}

// Local object effects: a clipped portal opening, hearth fire and small motes.
function drawPortalObjectFX(x,y,time){
 ctx.save();ctx.beginPath();ctx.moveTo(x-38,y+26);ctx.lineTo(x-38,y-25);ctx.bezierCurveTo(x-38,y-53,x-20,y-66,x,y-80);ctx.bezierCurveTo(x+20,y-66,x+38,y-53,x+38,y-25);ctx.lineTo(x+38,y+26);ctx.closePath();ctx.clip();
 rect('#120e20',x-41,y-83,82,112);
 for(let i=0;i<7;i++){
  const radius=8+i*5,phase=time*.55+i*.73;ctx.strokeStyle=i%2?'#69438c':'#ad79c9';ctx.globalAlpha=.6+i*.045;ctx.lineWidth=i%2?2:1.5;
  ctx.beginPath();ctx.ellipse(x+Math.sin(phase)*2,y-24+Math.cos(phase)*2,radius,radius*1.25,phase,0,Math.PI*1.62);ctx.stroke();
 }
 ctx.globalAlpha=.65;for(let i=0;i<9;i++){const a=i*2.4+time*.7,r=10+(i*7)%29;rect(i%2?'#bd90d9':'#80589f',x+Math.sin(a)*r,y-24+Math.cos(a)*r*1.18,2,2);}ctx.restore();
}
function drawCampObjectFX(){
 if(!OBJECT_ART.ready||state!=='camp')return;
 const s=campPoints();
 drawCampObject('workshop',()=>{
  ctx.save();ctx.beginPath();ctx.rect(s.forge.x+43,s.forge.y-37,52,46);ctx.clip();
  const x=s.forge.x+70,y=s.forge.y+6,pulse=Math.sin(anim*7)*3;
  poly('#b6662e',[[x-12,y],[x-12,y-10],[x-5,y-6],[x-2,y-27-pulse],[x+3,y-13],[x+9,y-19],[x+12,y]]);
  poly('#e8a24d',[[x-8,y],[x-4,y-14],[x,y-8],[x+4,y-20],[x+9,y]]);poly('#efd19a',[[x-3,y],[x,y-10],[x+5,y]]);ctx.restore();
  for(let i=0;i<3;i++){const q=(anim*.14+i/3)%1;ctx.globalAlpha=(1-q)*.18;ellipse('#b5a0bb',s.forge.x+44+Math.sin(q*4+i)*5,s.forge.y-145-q*35,5+q*7,3+q*5);}ctx.globalAlpha=1;
 });
 drawCampObject('meta-tree',()=>{
  for(let i=0;i<8;i++){const a=anim*.18+i*2.4,r=55+i*11,x=s.tree.x+Math.sin(a)*r,y=s.tree.y-107+Math.cos(a*.83)*39;ctx.globalAlpha=.22+.18*Math.sin(anim*1.4+i);rect('#d1b0e3',x,y,2,2);}ctx.globalAlpha=1;
 });
 drawCampObject('egg-machine',()=>{
  const x=s.tent.x-94,y=s.tent.y+17;for(let i=0;i<2;i++){const a=anim*.7+i*Math.PI;rect('#bba1cc',x+Math.sin(a)*26,y+Math.cos(a)*8,2,2);}
 });
}
