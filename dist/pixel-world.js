'use strict';
const PIXEL_WORLD={getSprite:()=>null,ready:false};
// One shared atlas keeps the camp, portraits and moving party in the same art style.
(() => {
 const atlas = new Image(), sprites = new Map();
 const cells = {tree:[0,0],tent:[1,0],forge:[2,0],eggs:[3,0],portal:[0,1],arch:[1,1],column:[2,1],fire:[3,1],hero:[0,2],heroBack:[1,2],cat:[2,2],catBack:[3,2],wolf:[0,3],wolfBack:[1,3],bat:[2,3],batBack:[3,3]};
 function sprite(name) {
  if(!atlas.complete || !atlas.naturalWidth)return null;
  if(sprites.has(name))return sprites.get(name);
  const [col,row]=cells[name],cw=atlas.width/4,ch=atlas.height/4;
  const cell=document.createElement('canvas');cell.width=Math.floor(cw);cell.height=Math.floor(ch);
  const b=cell.getContext('2d');b.drawImage(atlas,Math.round(col*cw),Math.round(row*ch),Math.floor(cw),Math.floor(ch),0,0,cell.width,cell.height);
  const data=b.getImageData(0,0,cell.width,cell.height).data;
  let l=cell.width,r=0,t=cell.height,bot=0;
  for(let y=0;y<cell.height;y++)for(let x=0;x<cell.width;x++)if(data[(y*cell.width+x)*4+3]>100){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);bot=Math.max(bot,y);}
  const out=document.createElement('canvas');out.width=Math.max(1,Math.round((r-l+1)/5));out.height=Math.max(1,Math.round((bot-t+1)/5));
  const brush=out.getContext('2d');brush.imageSmoothingEnabled=false;brush.drawImage(cell,l,t,r-l+1,bot-t+1,0,0,out.width,out.height);
  sprites.set(name,out);return out;
 }
 function paint(name,x,y,w,h) {
  const im=sprite(name);if(!im)return false;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(im,Math.round(x),Math.round(y),Math.round(w),Math.round(h));ctx.restore();return true;
 }
 PIXEL_WORLD.getSprite=sprite;
 const originalActor=drawActorSprite;
 drawActorSprite=function(kind,x,y,scale=1,view='auto') {
  if(!sprite(kind))return originalActor(kind,x,y,scale,view);
  const dir=actorDirection(view),name=kind+(dir.back?'Back':''),sizes={hero:[54,68,35],cat:[40,38,18],wolf:[56,48,24],bat:[66,36,16]};
  const [w,h,feet]=sizes[kind],clock=state==='run'?t:anim;
  const bob=view==='portrait'?0:kind==='bat'?Math.round(Math.sin(clock*8)*3):dir.moving?Math.round(Math.sin(clock*12)*2):0;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(dir.flip?-scale:scale,scale);
  if(view!=='portrait')rect('#17102466',-Math.round(w*.28),feet-1,Math.round(w*.56),4);
  paint(name,-w/2,feet-h+bob,w,h);ctx.restore();return true;
 };
 const oldObject=drawObjectSprite;
 drawObjectSprite=function(name,x,y,w,h){return cells[name]&&sprite(name)?paint(name,x,y,w,h):oldObject(name,x,y,w,h);};
 function plaque(text,x,y,width=100) {
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 12px monospace';
  const w=Math.max(width,ctx.measureText(text).width+16);rect('#241733',x-w/2,y-11,w,23);rect('#b28cc5',x-w/2,y-11,w,2);ctx.fillStyle='#f0d9f5';ctx.fillText(text,Math.round(x),Math.round(y+1));ctx.restore();
 }
 campFloor=function(){
  const points=campOutline(),f=campFrame(),s=campPoints();
  drawCampFoundation();
  poly('#705782',points);line('#b393bf',4,[...points,points[0]]);
  ctx.save();ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
  for(let row=0;row<H/36;row++)for(let col=0;col<W/48;col++){
   const n=hash(col,row);if(n<.16){const x=col*48+(row%2)*20,y=row*36;rect('#5f486f',x,y,24,10);rect('#8c719b',x,y,24,3);}
  }ctx.restore();
  if(typeof drawCampGroundDetails==='function')drawCampGroundDetails(s,f);
  for(const side of [-1,1]){
   arch(f.x+side*f.w*.38,f.top+f.h*.36,.8);
   drawObjectSprite('column',f.x+side*f.w*.43-20,f.top+f.h*.62-66,40,74);
  }
  drawCampObject('meta-tree',()=>drawCampTreeTrunk(s.tree.x,s.tree.y));
  drawCampObject('pets',()=>tent(s.tent.x,s.tent.y));
  drawCampObject('workshop',()=>forge(s.forge.x,s.forge.y));
  drawCampObject('egg-machine',()=>eggStand(s.tent.x-94,s.tent.y+93));
  if(typeof drawCampProps==='function')drawCampProps(s,f);
  plaque('ДЕРЕВО',s.tree.x,s.tree.y+44);
  plaque('ОТРЯД',s.tent.x,s.tent.y+43);
  plaque('МАСТЕРСКАЯ',s.forge.x,s.forge.y+52,128);
  plaque('ЯЙЦА',s.tent.x-94,s.tent.y+143,65);
 };
 const oldPortal=portalArt;
 portalArt=function(x,y,time){
  if(!sprite('portal'))return oldPortal(x,y,time);
  drawObjectSprite('portal',x-108,y-143,216,215);
  drawCampPortalSpiral(x,y,time);
  plaque('БЕЗДНА',x,y-154,100);
 };
 drawDetailedCampfire=function(x,y){drawCampAnimatedPixelFire(x,y);};
 const oldLighting=drawCampObjectLighting,oldFX=drawCampObjectFX;
 drawCampObjectLighting=function(){if(state!=='camp')oldLighting();};
 drawCampObjectFX=function(){if(state!=='camp')oldFX();};
 drawCampTerrainLighting=function(){};
 atlas.onload=()=>{PIXEL_WORLD.ready=true;sprites.clear();refreshCampArt();refreshActorArt();};
 atlas.src='assets/pixel-world.png';
})();
