'use strict';
const ACTOR_ART={image:null,ready:false,cache:new Map(),frames:{
 hero:[[51,34,212,284],[367,34,201,290],[684,33,191,282],[996,33,206,291]],
 cat:[[59,392,209,202],[377,392,202,209],[679,384,201,210],[996,380,200,217]],
 wolf:[[43,656,240,245],[352,655,240,254],[675,641,227,269],[980,637,240,273]],
 bat:[[32,1008,231,188],[322,1029,286,159],[663,1008,234,192],[949,1030,289,162]]
},sizes:{hero:[54,74,35],cat:[38,40,18],wolf:[58,52,24],bat:[68,44,16]}};
if(typeof Image!=='undefined'){
 const sheet=new Image();sheet.onload=()=>{ACTOR_ART.image=sheet;ACTOR_ART.ready=true;ACTOR_ART.cache.clear();if(typeof refreshActorArt==='function')refreshActorArt();};sheet.src='assets/actors.png';
}
function actorDirection(view){
 if(view==='portrait')return {back:false,flip:false,moving:false};
 if(state==='run')return {back:true,flip:path(p+60)<path(p),moving:true};
 const dx=camper.tx-camper.x,dy=camper.ty-camper.y;
 return {back:dy< -2,flip:dx< -2,moving:Math.hypot(dx,dy)>3};
}
function drawActorSprite(kind,x,y,scale=1,view='auto'){
 if(!ACTOR_ART.ready)return false;
 const direction=actorDirection(view),clock=state==='run'?t:anim;
 const step=view==='portrait'?0:kind==='bat'?Math.floor(anim*7)%2:direction.moving?Math.floor(clock*7)%2:0;
 const index=(direction.back?2:0)+step,key=kind+index,frames=ACTOR_ART.frames[kind],[width,height,feet]=ACTOR_ART.sizes[kind];
 let sprite=ACTOR_ART.cache.get(key);
 if(!sprite){
  const bounds=frames[index],maxWidth=Math.max(...frames.map(f=>f[2])),maxHeight=Math.max(...frames.map(f=>f[3]));
  sprite=document.createElement('canvas');sprite.width=width;sprite.height=height;
  const brush=sprite.getContext('2d'),w=Math.round(bounds[2]/maxWidth*width),h=Math.round(bounds[3]/maxHeight*height);brush.imageSmoothingEnabled=false;
  brush.drawImage(ACTOR_ART.image,...bounds,Math.round((width-w)/2),height-h,w,h);ACTOR_ART.cache.set(key,sprite);
 }
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(direction.flip?-scale:scale,scale);ctx.imageSmoothingEnabled=false;
 if(view!=='portrait')ellipse('#100c163d',0,feet-1,width*.28,Math.max(3,width*.09));
 ctx.drawImage(sprite,-width/2,feet-height,width,height);ctx.restore();return true;
}
