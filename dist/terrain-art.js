'use strict';
const TERRAIN_ART={image:null,ready:false,cache:new Map(),frames:{paving:[20,20,478,478],wall:[529,20,478,478],ruins:[1038,20,478,478],foliage:[16,592,481,352],dais:[523,568,517,395],firepit:[1075,604,430,332]}};
if(typeof Image!=='undefined'){
 const atlas=new Image();atlas.onload=()=>{TERRAIN_ART.image=atlas;TERRAIN_ART.ready=true;TERRAIN_ART.cache.clear();if(typeof refreshCampArt==='function')refreshCampArt();};atlas.src='assets/terrain.png';
}
function terrainImage(name,width,height){
 const key=name+':'+width+':'+height;let tile=TERRAIN_ART.cache.get(key);
 if(!tile){tile=document.createElement('canvas');tile.width=Math.max(1,Math.round(width/2));tile.height=Math.max(1,Math.round(height/2));const brush=tile.getContext('2d');brush.imageSmoothingEnabled=false;brush.drawImage(TERRAIN_ART.image,...TERRAIN_ART.frames[name],0,0,tile.width,tile.height);TERRAIN_ART.cache.set(key,tile);}return tile;
}
function terrainProp(name,x,y,width,height){
 const tile=terrainImage(name,width,height);ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(tile,Math.round(x),Math.round(y),width,height);ctx.restore();
}
function terrainFill(points,name='paving',scroll=0){
 const tile=terrainImage(name,name==='wall'?160:224,name==='wall'?112:128),pattern=ctx.createPattern(tile,'repeat');
 ctx.save();ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.translate(0,scroll);
 // Texture pixels remain crisp while the projected paving is compressed vertically.
 ctx.scale(2,2);ctx.fillStyle=pattern;ctx.fillRect(-W,-H-scroll,W*2,H*3);ctx.globalAlpha=.1;ctx.fillStyle='#744e87';ctx.fillRect(-W,-H-scroll,W*2,H*3);ctx.restore();
}
function stoneRim(points,spacing=31,closed=true){
 for(let i=0;i<points.length-(closed?0:1);i++){
  const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.max(1,Math.round(length/spacing));
  for(let j=0;j<count;j++){
   const at=j/count,next=(j+1)/count,x=a[0]+(b[0]-a[0])*at,y=a[1]+(b[1]-a[1])*at,x2=a[0]+(b[0]-a[0])*next,y2=a[1]+(b[1]-a[1])*next,n=hash(i,j);
   const tx=(b[0]-a[0])/Math.max(1,length),ty=(b[1]-a[1])/Math.max(1,length),lx=x+tx,ly=y+ty,rx=x2-tx,ry=y2-ty;poly(n>.6?'#81708a':'#6b5a75',[[lx,ly-4],[rx,ry-4],[rx,ry+5],[lx,ly+5]]);line('#a38b9f',1,[[lx,ly-4],[rx,ry-4]]);line('#322638',1,[[rx,ry-3],[rx,ry+5]]);if(n>.65)line('#514158',1,[[lx+5,ly],[lx+8,ly+3]]);
  }
 }
}
function islandTerrain(points,depth=80,name='paving',scroll=0){
 const faces=[];
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(b[0]>=a[0])continue;const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,n=hash(i,8);faces.push([a,b,[b[0],b[1]+depth*(.72+n*.18)],[mx+10,my+depth*(1.1+n*.22)],[mx-15,my+depth*.86],[a[0],a[1]+depth*.87]]);}
 for(const face of faces){terrainFill(face,'wall',scroll);line('#100c1899',3,[face[2],face[3]]);}
 terrainFill(points,name,scroll);stoneRim(points);
}
function foliage(x,y,size=1){terrainProp('foliage',x-33*size,y-24*size,66*size,38*size);}
function stoneStairs(x,y,width,steps=6){
 for(let i=0;i<steps;i++){
  const w=width+i*10,top=y+i*8;
  terrainFill([[x-w/2,top-3],[x+w/2,top-3],[x+w/2+3,top+2],[x-w/2-3,top+2]],'paving');
  terrainFill([[x-w/2-3,top+2],[x+w/2+3,top+2],[x+w/2+3,top+8],[x-w/2-3,top+8]],'wall');
  line('#a18b9c',1,[[x-w/2,top-3],[x+w/2,top-3]]);line('#211a28',2,[[x-w/2-3,top+8],[x+w/2+3,top+8]]);
  for(let j=1;j<Math.floor(w/30);j++){const bx=x-w/2+j*30;line('#3f3045',1,[[bx,top+2],[bx,top+7]]);}
 }
}
function drawDetailedCampFloor(){
 const points=campOutline(),f=campFrame(),s=campPoints();islandTerrain(points,100);
 // Dressed stone platforms and carved circles replace the flat rectangle grid.
 terrainProp('dais',s.tree.x-198,s.tree.y-52,396,143);stoneStairs(s.tree.x,s.tree.y+39,135,7);
 terrainProp('dais',s.fire.x-155,s.fire.y-48,310,110);
 for(const side of [-1,1]){
  arch(f.x+side*f.w*.37,f.top+f.h*.39,1);arch(f.x+side*f.w*.43,f.top+f.h*.66,.7);
  for(let k=0;k<5;k++){const x=f.x+side*(f.w*.19+k*43),y=f.top+f.h*(.71-k*.007);poly('#55445d',[[x-18,y],[x+15,y-3],[x+18,y+10],[x-18,y+12]]);rect('#85708c',x-18,y,31,3);if(k%2===0)foliage(x+side*8,y-5,1.1);}
  lantern(f.x+side*f.w*.25,f.top+f.h*.64);lantern(s.tree.x+side*170,s.tree.y+14,true);
  foliage(f.x+side*f.w*.38,f.top+f.h*.48,1.6);foliage(f.x+side*f.w*.37,f.top+f.h*.68,1.4);foliage(s.tree.x+side*180,s.tree.y+24,1.15);
  foliage(s.portal.x+side*130,s.portal.y-54,1);
 }
 // Restrained seams in the masonry; emissive accents are drawn separately.
 line('#302136',3,[[f.x-f.w*.34,f.top+f.h*.56],[f.x-f.w*.23,f.top+f.h*.59],[f.x-f.w*.18,f.top+f.h*.56]]);
 drawCampObject('meta-tree',()=>tree(s.tree.x,s.tree.y));drawCampObject('pets',()=>tent(s.tent.x,s.tent.y));drawCampObject('workshop',()=>forge(s.forge.x,s.forge.y));drawCampObject('egg-machine',()=>eggStand(s.tent.x-94,s.tent.y+93));campInscriptions();
}
function ruinsWidth(v){const base=305+Math.sin(v/230+floor)*28;return v>1660?base+(Math.min(1,(v-1660)/210))*235:base+Math.max(0,Math.cos((v-350)/350*Math.PI*2))*70;}
function drawDetailedRuins(){
 const near=Math.floor((p-850)/64)*64,far=p+H/.75+200,left=[],right=[],scroll=(p*.75)%128;
 // Broken neighbouring terraces frame the route without changing its combat path.
 for(const side of [-1,1])for(let i=0;i<5;i++){
  const v=Math.floor(p/520)*520+(i-1)*520,y=sy(v),x=W/2+side*(Math.min(W*.35,430)+(i%2)*24);if(y< -170||y>H+180)continue;
  const outline=[[x-81,y-18],[x+51,y-35],[x+92,y+7],[x+66,y+44],[x-57,y+58],[x-95,y+24]];islandTerrain(outline,75,'paving',scroll);arch(x-4,y+14,.93);foliage(x-53,y+27,.75);if(i%2===0)column(x+62,y+27);
 }
 for(let v=near;v<=far;v+=64){const y=sy(v),x=path(v),half=ruinsWidth(v)/2;left.push([x-half,y]);right.push([x+half,y]);}
 // Side faces are separate from the continuous, scrolling top surface.
 for(const [edge,side]of [[left,-1],[right,1]])for(let i=0;i<edge.length-1;i++){const a=edge[i],b=edge[i+1];terrainFill([a,b,[b[0]+side*14,b[1]+57],[a[0]+side*14,a[1]+57]],'wall',scroll);}
 terrainFill([...left,...right.slice().reverse()],'ruins',scroll);stoneRim(left,34,false);stoneRim(right,34,false);
 for(let v=Math.floor((p-500)/175)*175;v<p+H/.75+180;v+=175){const y=sy(v),x=path(v),half=ruinsWidth(v)/2;if(y< -70||y>H+70)continue;
  for(const side of [-1,1]){const edge=x+side*(half-9);if(hash(v,side)>.45)foliage(edge,y,.5+hash(v,side+4)*.35);if(v%350===0){rect('#493851',edge-16,y-1,32,13);crystal(edge,y-12,1.05);}else if(hash(v,side)>.7){rect('#71617c',edge+side*4,y+7,13,9);}}
 }
 const ay=sy(1930),ax=path(1930);
 if(ay> -250&&ay<H+220){terrainProp('dais',ax-243,ay-83,486,185);for(const side of [-1,1]){arch(ax+side*245,ay-22,1.18);crystal(ax+side*168,ay+39,1.6);foliage(ax+side*207,ay+23,.8);}}
 drawRuinsTerrainFX();drawBattleActors();
}
function drawRuinsTerrainFX(){
 const ay=sy(1930),ax=path(1930);if(ay< -220||ay>H+200)return;
 ctx.save();ctx.globalAlpha=.26+Math.sin(anim*1.4)*.04;ctx.strokeStyle='#c298d8';ctx.lineWidth=1.5;for(const radius of [72,121,170]){ctx.beginPath();ctx.ellipse(ax,ay-12,radius,radius*.35,0,0,Math.PI*2);ctx.stroke();}ctx.restore();
}
function drawDetailedCampfire(x,y){
 terrainProp('firepit',x-59,y-15,118,65);
 // Flames, embers and their light remain animated canvas effects.
 objectLight(x,y-10,110,'#f7b25b35');
 const pulse=Math.sin(anim*7)*4;
 poly('#c87532',[[x-19,y+9],[x-18,y-11],[x-9,y-4],[x-3,y-39-pulse],[x+4,y-16],[x+11,y-27],[x+20,y+9]]);
 poly('#f5b65e',[[x-12,y+9],[x-8,y-13],[x-1,y-5],[x+5,y-25],[x+14,y+9]]);poly('#ffe0a0',[[x-4,y+9],[x-2,y-9],[x+5,y+9]]);
 for(let i=0;i<6;i++){const q=(anim*.35+i/6)%1;ctx.globalAlpha=1-q;rect('#eac583',x+Math.sin(i+q*4)*17,y-12-q*54,2,2);}ctx.globalAlpha=1;
}

function drawWorldAtmosphere(){
 if(!TERRAIN_ART.ready||floor>=6)return;
 for(let i=0;i<7;i++){const x=(hash(i,72)*W+Math.sin(anim*.09+i)*60),y=H*(.78+hash(i,75)*.28);glow(x,y,130+hash(i,76)*150,i%2?'#75409f24':'#57347e28');}
}
function drawCampTerrainLighting(){
 if(!TERRAIN_ART.ready||state!=='camp')return;
 const s=campPoints(),f=campFrame();objectLight(s.tree.x,s.tree.y-25,154,'#b181d31d');objectLight(s.portal.x,s.portal.y-14,122,'#a256d72c');
 const points=campOutline();
 for(const side of [-1,1])for(const k of [.25,.4]){
  const x=f.x+side*f.w*k;let y=0;
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(x>=Math.min(a[0],b[0])&&x<=Math.max(a[0],b[0])&&a[0]!==b[0])y=Math.max(y,a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]));}
  const length=48+hash(x,8)*42;glow(x,y+35,63,'#a465cb1b');ctx.save();ctx.globalAlpha=.35+Math.sin(anim*1.2+x)*.06;line('#b082d6',2,[[x-8,y-7],[x+4,y-2],[x+2,y+17],[x+5,y+length]]);line('#d6abeb',1,[[x+5,y+8],[x+6,y+length*.72]]);ctx.restore();
 }
}
function drawCampPlaque(text,x,y,width=146){
 poly('#211728',[[x-width/2-7,y],[x-width/2,y-14],[x+width/2,y-14],[x+width/2+7,y],[x+width/2,y+14],[x-width/2,y+14]]);
 line('#a48c74',1.4,[[x-width/2-4,y],[x-width/2+2,y-11],[x+width/2-2,y-11],[x+width/2+4,y],[x+width/2-2,y+11],[x-width/2+2,y+11],[x-width/2-4,y]]);
 poly('#ba93c5',[[x-width/2+8,y-3],[x-width/2+11,y],[x-width/2+8,y+3],[x-width/2+5,y]]);poly('#ba93c5',[[x+width/2-8,y-3],[x+width/2-5,y],[x+width/2-8,y+3],[x+width/2-11,y]]);
 campLettering(text,x,y,width-28,'#e2d1bc',13);
}
function drawDetailedCampSigns(){
 const s=campPoints();drawCampObject('pets',()=>drawCampPlaque('ОТРЯД',s.tent.x-5,s.tent.y-74,125));drawCampObject('workshop',()=>drawCampPlaque('МАСТЕРСКАЯ',s.forge.x-18,s.forge.y+26,174));drawCampObject('egg-machine',()=>drawCampPlaque('ЯЙЦА',s.tent.x-94,s.tent.y+85,87));drawCampObject('meta-tree',()=>drawCampPlaque('ДЕРЕВО',s.tree.x,s.tree.y+21,135));
}
