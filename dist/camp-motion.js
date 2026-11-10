'use strict';
// Static rock and masonry are cached with the camp. Moving layers use only campMotionTime().
const CAMP_MOTION={plants:[],foundation:[],bands:new Map(),reduced:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches};
function campMotionTime(){return CAMP_MOTION.reduced?0:anim;}
function campFoundationFill(points,rim=false){
 poly(rim?'#493455':'#34263f',points);ctx.save();ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
 const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
 for(let row=Math.floor(minY/28);row<maxY/28;row++)for(let col=Math.floor(minX/52)-1;col<maxX/52+1;col++){
  const x=col*52+(row%2)*26,y=row*28,n=hash(col,row);
  poly(n>.5?'#564064':'#44324f',[[x+2,y+2],[x+47,y+2],[x+50,y+7],[x+48,y+25],[x+4,y+25],[x+1,y+19]]);
  rect(rim?'#9b7da6':'#7a608a',x+5,y+2,40,3);if(n>.65){rect('#2a1c36',x+20,y+7,3,11);rect('#2a1c36',x+23,y+16,8,2);}
 }
 ctx.restore();
}
function beginCampScenery(){CAMP_MOTION.plants=[];CAMP_MOTION.foundation=[];}
function queueCampFoliage(x,y,size=1){CAMP_MOTION.plants.push({x,y,size});}
function queueCampGrass(x,y,seed){CAMP_MOTION.plants.push({x,y,size:1,seed,grass:true});}
function campRockBottom(point,index){
 const f=campFrame(),available=Math.max(70,H-57-point[1]),depth=Math.min(252+hash(index,134)*56,available);
 return [f.x+(point[0]-f.x)*.9,point[1]+depth];
}
function campFoundationFaces(){
 const points=campOutline(),faces=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];if(b[0]>=a[0])continue;
  faces.push({index:i,a,b,lowerA:campRockBottom(a,i),lowerB:campRockBottom(b,(i+1)%points.length)});
 }
 return faces.sort((a,b)=>(a.a[1]+a.b[1])-(b.a[1]+b.b[1]));
}
function drawCampFoundation(){
 const faces=campFoundationFaces();CAMP_MOTION.foundation=faces;
 for(const face of faces){
  const {a,b,lowerA,lowerB,index}=face,middleX=(lowerA[0]+lowerB[0])/2,middleY=(lowerA[1]+lowerB[1])/2;
  const rock=[[a[0],a[1]+25],[b[0],b[1]+25],lowerB,[middleX+22,middleY+19+hash(index,5)*15],[middleX-15,middleY-8],lowerA];
  campFoundationFill(rock);
  ctx.save();ctx.beginPath();rock.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
  const shade=ctx.createLinearGradient(0,Math.min(a[1],b[1]),0,Math.max(lowerA[1],lowerB[1])+30);shade.addColorStop(0,'#170f2420');shade.addColorStop(.45,index<7?'#20172d38':'#08071455');shade.addColorStop(1,'#080610bf');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.max(2,Math.round(length/65));
  for(let j=0;j<count;j++){
   const t=j/count,next=(j+1)/count,px=a[0]+(b[0]-a[0])*t,py=a[1]+(b[1]-a[1])*t+33,px2=a[0]+(b[0]-a[0])*next,py2=a[1]+(b[1]-a[1])*next+33;
   const bx=lowerA[0]+(lowerB[0]-lowerA[0])*t,by=lowerA[1]+(lowerB[1]-lowerA[1])*t,n=hash(index,j+200);
   poly(n>.5?'#7d65861c':'#09071324',[[px,py],[px2,py2],[bx+35,by+23],[bx-5,by-8]]);
   line('#1b1428',2,[[px+9,py+10],[px+4,py+42],[bx+12,by-47],[bx+4,by-20]]);
   line('#8e709044',1,[[px+11,py+11],[px+6,py+42],[bx+14,by-48]]);
   if(n>.52){line('#30242e',5,[[px+22,py-20],[px+18,py+37],[bx+25,by-55],[bx+16,by+5]]);line('#80605066',1.5,[[px+21,py-17],[px+17,py+34],[bx+24,by-54]]);}
  }
  ctx.restore();
  // A clearly dressed rim sits above the older, broken foundations.
  campFoundationFill([a,b,[b[0],b[1]+34],[a[0],a[1]+34]],true);
  line('#a28c9a',2,[a,b]);line('#130d1f99',3,[[a[0],a[1]+34],[b[0],b[1]+34]]);
  if(Math.abs(b[0]-a[0])>145){
   const x=a[0]*.43+b[0]*.57,y=a[1]*.43+b[1]*.57,base=lowerA[1]*.43+lowerB[1]*.57;
   poly('#382b45',[[x-16,y+25],[x+14,y+25],[x+8,base-15],[x-8,base+11],[x-20,base-6]]);line('#78617c',2,[[x-16,y+29],[x-18,base-9]]);
   for(let seam=y+54;seam<base-12;seam+=28)line('#181020',2,[[x-17,seam],[x+11,seam]]);
  }
 }
}
function campSpriteBand(name,start,end){
 const pixel=PIXEL_WORLD.getSprite(name),variant=pixel?'pixel':'detail',key=variant+name+':'+start+':'+end;let tile=CAMP_MOTION.bands.get(key);if(tile)return tile;
 const f=OBJECT_ART.frames[name],source=pixel||OBJECT_ART.image;if(!source)return null;
 const sx=pixel?0:f[0],sy=pixel?0:f[1],width=pixel?pixel.width:f[2],height=(pixel?pixel.height:f[3]);
 tile=document.createElement('canvas');tile.width=Math.max(1,Math.round(pixel?width:width/2));tile.height=Math.max(1,Math.round(height*(end-start)/(pixel?1:2)));const brush=tile.getContext('2d');brush.imageSmoothingEnabled=false;brush.drawImage(source,sx,sy+height*start,width,height*(end-start),0,0,tile.width,tile.height);CAMP_MOTION.bands.set(key,tile);return tile;
}
function drawCampTreeTrunk(x,y){
 const tile=campSpriteBand('tree',.55,1);if(!tile){tree(x,y);return;}
 ctx.drawImage(tile,x-207,y-278+324*.55,414,324*.45);
}
function drawCampCanopy(){
 const tile=campSpriteBand('tree',0,.57);if(!tile)return;const s=campPoints();
 drawCampObject('meta-tree',()=>{
  const sway=Math.sin(campMotionTime()*1.35)*.013+Math.sin(campMotionTime()*2.1)*.004;
  ctx.save();ctx.translate(s.tree.x,s.tree.y-93);ctx.rotate(sway);ctx.translate(Math.sin(campMotionTime()*.95)*3,-2+Math.sin(campMotionTime()*1.5)*1.5);ctx.drawImage(tile,-207,-185,414,324*.57);ctx.restore();
 });
}
function drawCampPlants(){
 if(!CAMP_MOTION.plants.length)return;
 for(const {x,y,size,seed,grass}of CAMP_MOTION.plants){const gust=Math.sin(campMotionTime()*1.7+x*.012)+Math.sin(campMotionTime()*.8+y*.013)*.4;
  ctx.save();ctx.translate(x+gust*1.5,y);ctx.transform(1,0,gust*.13,1,0,0);if(grass)campGrass(0,0,seed);else terrainProp('foliage',-33*size,-24*size,66*size,38*size);ctx.restore();
 }
}
function campBanner(x,y,phase,scale=1){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);const wind=Math.sin(campMotionTime()*2.1+phase)*5+Math.sin(campMotionTime()*3.4+phase)*1.5;
 line('#675064',2,[[0,0],[0,72]]);poly('#542b50',[[0,4],[19,6],[20+wind,61],[10+wind,55],[2+wind,65]]);line('#b18a7b',1,[[2,7],[16,8],[17+wind,57]]);line('#926479',1,[[7,10],[8+wind*.4,42]]);
 const cx=10+wind*.45,cy=30;line('#c8a27d',1,[[cx,cy-8],[cx+5,cy],[cx,cy+8],[cx-5,cy],[cx,cy-8]]);ctx.restore();
}
function drawCampBanners(){
 const s=campPoints();drawCampObject('pets',()=>campBanner(s.tent.x-107,s.tent.y-73,1,.82));drawCampObject('workshop',()=>campBanner(s.forge.x+111,s.forge.y-59,2,.73));
}
function drawCampLeafFall(){
 if(!PIXEL_WORLD.ready&&!OBJECT_ART.ready)return;const s=campPoints();
 for(let i=0;i<27;i++){
  const seed=hash(i,62),q=(campMotionTime()*(.115+seed*.055)+hash(i,66))%1,x=s.tree.x+(hash(i,63)-.5)*310+Math.sin(q*7+i)*22+q*36,y=s.tree.y-236+q*300;
  ctx.save();ctx.translate(x,y);ctx.rotate(q*8+i);ctx.globalAlpha=Math.sin(q*Math.PI)*.78;poly(i%3?'#b487c0':'#d5b0da',[[-3,0],[0,-2],[4,0],[0,3]]);ctx.restore();
 }
 drawCampObject('meta-tree',()=>{
  for(let i=0;i<3;i++){const ox=[-101,69,8][i],oy=[-153,-145,-201][i],dx=Math.sin(campMotionTime()*1.5+i)*6,dy=Math.sin(campMotionTime()*1.9+i)*3,x=s.tree.x+ox+dx,y=s.tree.y+oy+dy;
   line('#90749799',1,[[s.tree.x+ox,s.tree.y+oy-22],[x,y-6]]);glow(x,y,18,'#bc7ee444');poly('#bd86db',[[x,y-7],[x+4,y],[x,y+7],[x-4,y]]);rect('#edcaf3',x-1,y-3,2,6);
  }
 });
}
function drawCampFoundationLife(){
 if(!CAMP_MOTION.foundation.length)return;const f=campFrame();
 for(let i=0;i<7;i++){
  const side=i%2?1:-1,x=f.x+side*f.w*(.16+hash(i,88)*.33),y=H-37-hash(i,89)*69+Math.sin(campMotionTime()*1.15+i)*10,w=12+hash(i,90)*17;
  ellipse('#08061245',x,y+27,w*.6,5);poly('#554363',[[x-w/2,y],[x+4,y-8],[x+w/2,y-3],[x+8,y+11],[x-7,y+15]]);poly('#241b33',[[x-7,y+15],[x+8,y+11],[x+3,y+35],[x-4,y+24]]);line('#9b7fa5',1,[[x-w/2,y],[x+4,y-8],[x+w/2,y-3]]);
 }
 for(const face of CAMP_MOTION.foundation){
  if(Math.abs(face.b[0]-face.a[0])<90)continue;
  for(let i=0;i<3;i++){
   const at=(i+1)/4,x=face.a[0]+(face.b[0]-face.a[0])*at,y=face.a[1]+(face.b[1]-face.a[1])*at;
   const length=45+hash(face.index,i)*51,drift=Math.sin(campMotionTime()*1.4+x)*4;
   line('#44364b',2,[[x,y+4],[x+drift,y+length*.5],[x+drift*1.6,y+length]]);
   for(let leaf=0;leaf<4;leaf++){const yy=y+15+leaf*length/4,xx=x+drift*(leaf+1)/3,side=leaf%2?1:-1;poly(leaf%2?'#66576b':'#766274',[[xx,yy],[xx+side*7,yy-3],[xx+side*5,yy+3],[xx,yy+4]]);}
  }
 }
}
function drawCampPortalAura(){
 if(!PIXEL_WORLD.ready&&!OBJECT_ART.ready)return;const s=campPoints();
 drawCampObject('portal',()=>{
  ctx.save();ctx.globalAlpha=.4;ctx.strokeStyle='#ab7ed1';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(s.portal.x,s.portal.y+35,85,21,0,campMotionTime()*.55,campMotionTime()*.55+Math.PI*1.6);ctx.stroke();ctx.restore();
  for(let i=0;i<5;i++){const a=campMotionTime()*1.2+i*Math.PI*2/5,x=s.portal.x+Math.sin(a)*85,y=s.portal.y+35+Math.cos(a)*21;glow(x,y,11,'#b57fe33c');rect('#d8b8ee',x-1,y-2,3,3);}
 });
}
function drawCampLifeBehindActors(){
 drawCampFoundationLife();drawCampCanopy();drawCampPlants();drawCampBanners();drawCampLeafFall();drawCampLivingForge();drawCampEggOrbit();
}
function drawCampPortalSpiral(x,y,time){
 if(CAMP_MOTION.reduced)time=0;
 ctx.save();ctx.beginPath();ctx.ellipse(x,y-28,34,46,0,0,Math.PI*2);ctx.clip();rect('#371849',x-36,y-76,72,96);
 for(let arm=0;arm<3;arm++)for(let j=0;j<42;j++){
  const q=j/42,r=3+q*31,a=time*1.65+arm*Math.PI*2/3-q*8,px=Math.round(x+Math.sin(a)*r),py=Math.round(y-28+Math.cos(a)*r*1.3);
  ctx.globalAlpha=.44+q*.53;rect(arm===1?'#e7b0ff':'#ae65d8',px,py,j%4?3:4,3);
 }
 ctx.globalAlpha=.85;rect('#f5d4ff',x-2,y-31,4,5);ctx.restore();
}
function drawCampAnimatedPixelFire(x,y){
 const image=PIXEL_WORLD.getSprite('fire');
 if(image){
  const split=.66;ctx.drawImage(image,0,image.height*split,image.width,image.height*(1-split),x-48,y-65+88*split,96,88*(1-split));
  const pulse=1+Math.sin(campMotionTime()*8)*.09+Math.sin(campMotionTime()*13)*.025,width=96*(1+Math.sin(campMotionTime()*5)*.045),height=88*.7*pulse;
  ctx.save();ctx.translate(x,y-65+88*.7);ctx.transform(1,0,Math.sin(campMotionTime()*6)*.035,1,0,0);ctx.drawImage(image,0,0,image.width,image.height*.7,-width/2,-height,width,height);ctx.restore();
 }else{ellipse('#5b4165',x,y+16,44,15);poly('#eaa549',[[x-16,y+8],[x-9,y-13],[x,y-39],[x+8,y-15],[x+17,y+8]]);}
 glow(x,y-12,116+Math.sin(campMotionTime()*7)*9,'#f3b15a27');
 for(let i=0;i<15;i++){const q=(campMotionTime()*(.36+hash(i,11)*.23)+hash(i,4))%1;ctx.save();ctx.globalAlpha=(1-q)*.85;rect(i%3?'#ffbc67':'#ffe0a0',x+Math.sin(q*6+i)*22+q*8,y-22-q*(58+hash(i,12)*35),i%4?3:4,3);ctx.restore();}
 for(let i=0;i<3;i++){const q=(campMotionTime()*.14+i/3)%1;ctx.save();ctx.globalAlpha=(1-q)*.1;ellipse('#ccb7d1',x+Math.sin(q*5+i)*18,y-45-q*90,9+q*20,5+q*11);ctx.restore();}
}
const campOriginalForge=forge;
forge=function(x,y){
 const image=PIXEL_WORLD.getSprite('forge');if(state!=='camp'||!image){campOriginalForge(x,y);return;}
 const start=.25;ctx.drawImage(image,0,image.height*start,image.width,image.height*(1-start),x-125,y-154+205*start,250,205*(1-start));
};
function drawCampLivingForge(){
 const s=campPoints(),image=PIXEL_WORLD.getSprite('forge');if(!image)return;
 drawCampObject('workshop',()=>{
  ctx.save();ctx.translate(s.forge.x,s.forge.y-102);ctx.transform(1,0,Math.sin(campMotionTime()*1.6)*.045,1,Math.sin(campMotionTime()*1.15)*4,0);ctx.drawImage(image,0,0,image.width,image.height*.29,-125,-52,250,205*.29);ctx.restore();
  for(let i=0;i<6;i++){const q=(campMotionTime()*.19+i/6)%1,x=s.forge.x+40+Math.sin(q*4+i*.4)*9+q*19,y=s.forge.y-154-q*75;ctx.save();ctx.globalAlpha=(1-q)*.22;rect('#d7bddb',x-6-q*8,y,15+q*20,7+q*5);rect('#d7bddb',x-q*6,y-5-q*4,10+q*12,6+q*4);ctx.restore();}
  const x=s.forge.x+49,y=s.forge.y+26,pulse=Math.sin(campMotionTime()*11)*5;rect('#39203c',x-22,y-35,45,37);poly('#de803a',[[x-13,y],[x-8,y-14],[x-3,y-8],[x+1,y-28-pulse],[x+6,y-15],[x+12,y-19],[x+13,y]]);poly('#ffc36d',[[x-7,y],[x-4,y-15],[x+1,y-7],[x+5,y-19],[x+9,y]]);
  glow(x,y-12,55+Math.sin(campMotionTime()*9)*4,'#eeb15d25');
 });
}
function drawCampEggOrbit(){
 if(!PIXEL_WORLD.getSprite('eggs'))return;const s=campPoints();
 drawCampObject('egg-machine',()=>{
  const x=s.tent.x-94,y=s.tent.y+16;ctx.save();ctx.globalAlpha=.48;ctx.strokeStyle='#d3a4e5';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,48,13,-.18,campMotionTime()*.9,campMotionTime()*.9+Math.PI*1.7);ctx.stroke();ctx.restore();
  for(let i=0;i<4;i++){const a=campMotionTime()*1.6+i*Math.PI*.5,px=x+Math.sin(a)*48,py=y+Math.cos(a)*13;glow(px,py,10,'#d4a0ed32');rect(i%2?'#e8c8f1':'#c58add',px-1,py-1,3,3);}
 });
}
