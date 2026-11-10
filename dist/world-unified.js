'use strict';
// The refuge and the early ruins share one palette, pixel grid and material set.
// This file changes presentation only; combat, saves and hotspots keep their rules.
const REFUGE_ART={objects:null,actors:null,tree:null,terrain:null,cache:new Map(),tiles:new Map(),sky:null,skyKey:'',ready:0};
const REFUGE_COLORS={earth:'#152335',grass:'#1d334a',leaf:'#3c5870',stone:'#3c4758',edge:'#78808a',copper:'#9d7c66',ink:'#0c1422'};
const REFUGE_OBJECTS={tree:[0,0],tent:[1,0],forge:[2,0],eggs:[0,1],portal:[1,1],arch:[2,1],column:[0,2],fire:[1,2],rubble:[2,2]};
const REFUGE_ACTORS={hero:[0,0],heroBack:[1,0],cat:[2,0],catBack:[3,0],wolf:[0,1],wolfBack:[1,1],bat:[2,1],batBack:[3,1],shade:[0,2],shadeStep:[1,2],guard:[2,2],guardStep:[3,2],boss2:[0,3],boss3:[1,3],boss4:[2,3],boss5:[3,3]};
function refugeActive(){return state==='camp'||floor<6;}
function refugeClip(points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();}
function refugeSprite(name){
 const isObject=Object.hasOwn(REFUGE_OBJECTS,name),standalone=name==='tree'&&REFUGE_ART.tree,sheet=standalone|| (isObject?REFUGE_ART.objects:REFUGE_ART.actors);
 if(!sheet)return null;
 if(REFUGE_ART.cache.has(name))return REFUGE_ART.cache.get(name);
 const grid=isObject?3:4,[col,row]=(isObject?REFUGE_OBJECTS:REFUGE_ACTORS)[name]||[];
 if(col===undefined)return null;
 const rows=isObject?[0,1/3,2/3,1]:[0,.25,.473,.71,1];
 const cw=standalone?sheet.width:Math.floor(sheet.width/grid),sy=standalone?0:Math.round(sheet.height*rows[row]),ch=standalone?sheet.height:Math.round(sheet.height*rows[row+1])-sy,cell=document.createElement('canvas');cell.width=cw;cell.height=ch;
 const b=cell.getContext('2d');b.drawImage(sheet,standalone?0:col*cw,sy,cw,ch,0,0,cw,ch);
 const data=b.getImageData(0,0,cw,ch).data;let left=cw,right=-1,top=ch,bottom=-1;
 for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(data[(y*cw+x)*4+3]>80){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 if(right<left)return null;
 const out=document.createElement('canvas'),heights={tree:158,tent:94,forge:105,eggs:85,portal:112,arch:80,column:57,fire:30,rubble:26,hero:36,heroBack:36,cat:23,catBack:23,wolf:28,wolfBack:28,bat:22,batBack:22,shade:28,shadeStep:28,guard:40,guardStep:40,boss2:75,boss3:75,boss4:75,boss5:75};
 out.height=heights[name];out.width=Math.max(1,Math.round((right-left+1)/(bottom-top+1)*out.height));
 const brush=out.getContext('2d');brush.imageSmoothingEnabled=false;brush.drawImage(cell,left,top,right-left+1,bottom-top+1,0,0,out.width,out.height);
 REFUGE_ART.cache.set(name,out);return out;
}
function refugePaint(name,x,y,w,h){
 const im=refugeSprite(name);if(!im)return false;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(im,Math.round(x),Math.round(y),Math.round(w),Math.round(h));ctx.restore();return true;
}
function refugeShadow(x,y,rx,ry){ellipse('#09111d52',x+5,y+3,rx,ry);ellipse('#080e1b38',x+2,y+1,rx*.7,ry*.7);}
const refugePreviousSprite=PIXEL_WORLD.getSprite;
PIXEL_WORLD.getSprite=function(name){return refugeActive()?refugeSprite(name)||refugePreviousSprite(name):refugePreviousSprite(name);};
const refugePreviousObject=drawObjectSprite;
drawObjectSprite=function(name,x,y,w,h){
 if(refugeActive()&&Object.hasOwn(REFUGE_OBJECTS,name)&&refugePaint(name,x,y,w,h))return true;
 return refugePreviousObject(name,x,y,w,h);
};
const refugePreviousActor=drawActorSprite;
drawActorSprite=function(kind,x,y,scale=1,view='auto'){
 if(!refugeActive()||!REFUGE_ART.actors)return refugePreviousActor(kind,x,y,scale,view);
 const dir=actorDirection(view),name=kind+(dir.back?'Back':''),im=refugeSprite(name);
 if(!im)return refugePreviousActor(kind,x,y,scale,view);
 const sizes={hero:[54,72,35],cat:[43,44,18],wolf:[61,54,24],bat:[69,43,16]},[maxW,maxH,feet]=sizes[kind],fit=Math.min(maxW/im.width,maxH/im.height),w=Math.round(im.width*fit),h=Math.round(im.height*fit),clock=state==='run'?t:campMotionTime();
 const bob=view==='portrait'?0:kind==='bat'?Math.sin(clock*8)*3:dir.moving?Math.sin(clock*12)*1.6:Math.sin(clock*2)*.5;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(dir.flip?-scale:scale,scale);
 if(view!=='portrait'&&!dir.hideShadow)refugeShadow(0,feet-1,w*.3,5);
 const step=dir.moving&&kind!=='bat'?Math.sin(clock*12)*.025:0;
 ctx.save();ctx.translate(0,feet);ctx.rotate(step);refugePaint(name,-w/2,-h+bob,w,h);ctx.restore();ctx.restore();return true;
};
const refugePreviousEnemy=drawRuinsEnemy;
drawRuinsEnemy=function(e,x,y){
 if(!REFUGE_ART.actors){refugePreviousEnemy(e,x,y);return;}
 const big=e.type==='boss',guard=e.type==='guard',step=Math.sin(t*4+e.p)>.3;
 const name=big?'boss'+Math.max(2,Math.min(5,floor)):guard?(step?'guardStep':'guard'):(step?'shadeStep':'shade');
 const w=big?139:guard?71:47,h=big?158:guard?87:59,feet=big?45:guard?28:20;
 refugeShadow(x,y+feet,w*.31,big?15:6);
 const bob=e.frozen?0:Math.sin(t*(big?2:4)+e.p)*(big?1:2);
 ctx.save();if(e.hit>0)ctx.globalAlpha=.65+.35*Math.sin(t*90);
 refugePaint(name,x-w/2,y+feet-h+bob,w,h);ctx.restore();
 if(e.hp<e.max&&!big){rect('#101523',x-18,y-h+feet-7,36,3);rect('#a68db7',x-18,y-h+feet-7,36*Math.max(0,e.hp)/e.max,3);}
};
function refugeTile(kind='grass'){
 if(REFUGE_ART.tiles.has(kind))return REFUGE_ART.tiles.get(kind);
 const tile=document.createElement('canvas');tile.width=384;tile.height=288;
 const original=ctx;ctx=tile.getContext('2d');ctx.imageSmoothingEnabled=false;
 try{
  if(REFUGE_ART.terrain){
   const sheet=REFUGE_ART.terrain,cw=Math.floor(sheet.width/2),ch=Math.floor(sheet.height/2),cell=kind==='grass'?[0,0]:kind==='wall'?[0,1]:[1,0];
   // A two-world-pixel grid matches the objects and keeps fine texture from shimmering.
   const small=document.createElement('canvas');small.width=192;small.height=144;const b=small.getContext('2d');b.imageSmoothingEnabled=false;b.drawImage(sheet,cell[0]*cw,cell[1]*ch,cw,ch,0,0,192,144);ctx.drawImage(small,0,0,384,288);
   REFUGE_ART.tiles.set(kind,tile);return tile;
  }
  rect(kind==='grass'?'#162638':'#293444',0,0,384,288);
  if(kind==='grass'){
   for(let i=0;i<31;i++){
    const x=hash(i,921)*420-18,y=hash(i,922)*320-16,rx=17+hash(i,923)*42,ry=8+hash(i,924)*20,points=[];
    for(let k=0;k<12;k++){const a=k/12*Math.PI*2;points.push([Math.round((x+Math.cos(a)*rx*(.8+hash(i,k)*.3))/2)*2,Math.round((y+Math.sin(a)*ry)/2)*2]);}
    poly(['#1a2e42','#1c3147','#20364a','#172b3e'][i%4],points);
   }
   for(let i=0;i<145;i++){
    const x=Math.floor(hash(i,931)*192)*2,y=Math.floor(hash(i,932)*144)*2,n=3+Math.floor(hash(i,933)*5);
    for(let j=0;j<n;j++){
     const dx=(hash(i,j+10)-.5)*21,dy=hash(i,j+20)*8,h=3+hash(i,j+30)*7;
     poly(j%3?'#2a4358':'#345268',[[x+dx-2,y+dy],[x+dx-4,y+dy-h],[x+dx,y+dy-3],[x+dx+2,y+dy]]);
     if(j%4===0)rect('#476276',x+dx-3,y+dy-h,2,2);
    }
   }
   for(let i=0;i<15;i++){const x=hash(i,936)*384,y=hash(i,937)*288;rect('#716c80',x,y,3,2);rect('#3e4c60',x+2,y+2,4,2);}
  }else{
   for(let row=-1;row<9;row++)for(let col=-1;col<9;col++){
    const x=col*48+(row%2)*24,y=row*36,n=hash(col+51,row+19),shade=['#3b4655','#414c5a','#354250','#47515c'][Math.floor(n*4)];
    poly('#152333',[[x+2,y+2],[x+44,y],[x+48,y+28],[x+39,y+34],[x,y+31]]);
    poly(shade,[[x+4,y+3],[x+43,y+2],[x+45,y+26],[x+38,y+31],[x+2,y+29]]);
    line('#687280',1,[[x+5,y+4],[x+41,y+3]]);
    if(n>.65)line('#263344',1,[[x+24,y+5],[x+20,y+14],[x+27,y+20]]);
    if(n<.2){rect('#273e4c',x+6,y+26,17,4);rect('#36505b',x+8,y+25,9,2);}
   }
  }
 }finally{ctx=original;}
 REFUGE_ART.tiles.set(kind,tile);return tile;
}
function refugeSurface(points,kind='grass',scroll=0){
 ctx.save();refugeClip(points);ctx.fillStyle=kind==='grass'?'#162638':'#354150';ctx.fillRect(0,0,W,H);
 const pattern=ctx.createPattern(refugeTile(kind),'repeat');
 if(pattern){ctx.translate(0,scroll);ctx.fillStyle=pattern;ctx.fillRect(-W,-H-scroll,W*3,H*3);if(kind==='grass'){ctx.fillStyle='#0b17242b';ctx.fillRect(-W,-H-scroll,W*3,H*3);}}
 ctx.restore();
}
drawAbyssGrass=function(points,scroll=0){refugeSurface(points,'grass',scroll);};
function refugeRockFace(points,seed=1){
 poly('#172131',points);ctx.save();refugeClip(points);
 const loX=Math.min(...points.map(q=>q[0])),hiX=Math.max(...points.map(q=>q[0])),loY=Math.min(...points.map(q=>q[1])),hiY=Math.max(...points.map(q=>q[1]));
 if(REFUGE_ART.terrain){ctx.fillStyle=ctx.createPattern(refugeTile('wall'),'repeat');ctx.fillRect(loX,loY,hiX-loX,hiY-loY);ctx.globalAlpha=.23;}
 for(let i=Math.floor(loX/42);i<hiX/42+1;i++){
  const x=i*42,n=hash(i,seed),lean=(n-.5)*22;
  poly(i%3?'#253144':'#303b4e',[[x,loY-25],[x+38,loY-20],[x+35+lean,hiY-5],[x+20+lean,hiY+18],[x+lean-3,hiY-6]]);
  line('#485367',2,[[x+3,loY],[x+lean+2,hiY-8]]);
  for(let j=Math.floor(loY/39);j<hiY/39+1;j++)if(hash(i,j+seed)>.35)line('#131e2e',2,[[x+4,j*39+hash(i,j)*12],[x+34,j*39+8+hash(i,j)*12]]);
 }
 ctx.globalAlpha=1;const shade=ctx.createLinearGradient(0,loY,0,hiY);shade.addColorStop(0,'#0a122000');shade.addColorStop(.65,'#070d1755');shade.addColorStop(1,'#070b15d0');ctx.fillStyle=shade;ctx.fillRect(loX,loY,hiX-loX,hiY-loY);ctx.restore();
}
drawCampFoundation=function(){
 const faces=campFoundationFaces();CAMP_MOTION.foundation=faces;
 for(const face of faces){
  const {a,b,index}=face,depth=120+hash(index,711)*73;
  const ba=[a[0]+(campFrame().x-a[0])*.07,Math.min(H-36,a[1]+depth)],bb=[b[0]+(campFrame().x-b[0])*.07,Math.min(H-30,b[1]+depth*.93)],mid=[(ba[0]+bb[0])/2,(ba[1]+bb[1])/2+21];
  refugeRockFace([a,b,bb,mid,ba],index+41);
  poly('#3d4859',[a,b,[b[0],b[1]+20],[a[0],a[1]+20]]);
  line('#747b87',2,[a,b]);line('#101a29',2,[[a[0],a[1]+21],[b[0],b[1]+21]]);
  const count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/34);
  for(let j=0;j<count;j++){const q=j/count,x=a[0]+(b[0]-a[0])*q,y=a[1]+(b[1]-a[1])*q;line('#1b2939',2,[[x,y+3],[x+2,y+19]]);}
 }
};
function refugeCourt(x,y,rx,ry,seed=0){
 const points=[];for(let i=0;i<28;i++){const a=i/28*Math.PI*2,r=.97+hash(i,seed)*.04;points.push([x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r]);}
 poly('#182334',points.map(([a,b])=>[a,b+9]));refugeSurface(points,'stone');
 line('#707784',2,[...points,points[0]]);
 ctx.save();ctx.strokeStyle='#a58a6a77';ctx.lineWidth=1;ctx.setLineDash([9,8]);ctx.beginPath();ctx.ellipse(x,y,rx*.82,ry*.76,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function refugePath(a,b,width=36){
 const distance=Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),count=Math.max(2,Math.ceil(distance/18)),nx=-(b.y-a.y)/distance,ny=(b.x-a.x)/distance,left=[],right=[];
 for(let i=0;i<=count;i++){const q=i/count,x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q,r=width*.5*(.86+hash(i,12)*.25);left.push([x+nx*r,y+ny*r]);right.push([x-nx*r,y-ny*r]);}
 refugeSurface([...left,...right.reverse()],'stone',state==='run'?(p*.75)%288:0);
}
function refugeGrass(x,y,size=1,seed=0){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(size,size);refugeShadow(0,0,12,3);
 for(let i=0;i<7;i++){const dx=(i-3)*4,h=6+hash(seed,i)*13;poly(i%2?'#345168':'#253f56',[[dx-3,2],[dx-5,-h],[dx,-h*.4],[dx+2,-h-3],[dx+3,2]]);if(i%3===0)rect('#52697d',dx-4,-h,2,3);}
 ctx.restore();
}
campGrass=function(x,y,seed){refugeGrass(x,y,1,seed);};
drawCampProps=function(s,f){
 // The detailed tent and smithy already contain supplies. Keep the shared crossing open.
 const x=s.fire.x+62,y=s.fire.y+14;refugeShadow(x,y+8,14,4);
 ellipse('#1b2635',x,y,11,10);ellipse('#647080',x,y-5,12,4);ellipse('#152130',x,y-5,9,2);
 ctx.strokeStyle='#a5a0a0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-6,8,Math.PI,Math.PI*2);ctx.stroke();
 const px=s.tent.x+99,py=s.tent.y+56;
 poly('#322b3a',[[px-28,py-9],[px+25,py-12],[px+31,py+10],[px-25,py+13]]);
 line('#867364',1,[[px-22,py-6],[px+21,py-8],[px+25,py+7],[px-21,py+9],[px-22,py-6]]);
 for(const dx of [-13,12]){ellipse('#152033',px+dx,py+19,10,4);ellipse('#7a8188',px+dx,py+17,10,3);ellipse(dx<0?'#7e7160':'#416075',px+dx,py+17,7,2);}
};
foliage=function(x,y,size=1){
 if(!refugeActive()){terrainProp('foliage',x-33*size,y-24*size,66*size,38*size);return;}
 refugeGrass(x,y,size*1.2,Math.round(x+y));
 if(REFUGE_ART.objects)refugePaint('rubble',x-27*size,y-20*size,54*size,36*size);
};
campFloor=function(){
 const points=campOutline(),s=campPoints(),f=campFrame();drawCampFoundation();refugeSurface(points);
 ctx.save();refugeClip(points);
 refugeCourt(s.tree.x,s.tree.y+19,193,59,11);
 refugeCourt(s.fire.x,s.fire.y+18,185,62,12);
 refugeCourt(s.tent.x,s.tent.y+22,134,34,13);
 refugeCourt(s.forge.x,s.forge.y+34,143,39,14);
 refugeCourt(s.tent.x-94,s.tent.y+116,66,23,15);
 refugePath({x:s.fire.x,y:s.fire.y-36},{x:s.tree.x,y:s.tree.y+92},42);
 refugePath({x:s.fire.x-155,y:s.fire.y+5},{x:s.tent.x+55,y:s.tent.y+39},32);
 refugePath({x:s.fire.x+155,y:s.fire.y+5},{x:s.forge.x-45,y:s.forge.y+53},32);
 refugePath({x:s.fire.x,y:s.fire.y+65},{x:s.portal.x,y:s.portal.y-40},58);
 for(const side of [-1,1])for(let i=0;i<7;i++){
  const x=f.x+side*f.w*(.26+hash(i,41)*.14),y=f.top+f.h*(.42+hash(i,42)*.25);
  queueCampGrass(Math.round(x),Math.round(y),i);if(i%3===0)campMushroom(x+12,y-2,.65);
 }
 for(let i=0;i<45;i++){
  const x=f.x+(hash(i,36)-.5)*f.w,y=f.top+f.h*(.35+hash(i,37)*.38);
  if(Math.abs(x-f.x)<210)continue;
  if(i%5===0&&REFUGE_ART.objects)refugePaint('rubble',x-27,y-16,54,35);else refugeGrass(x,y,.5+hash(i,39)*.4,i);
 }
 ctx.restore();
 // A small terrace links the roots to the old road through the camp.
 for(let i=0;i<5;i++){const y=s.tree.y+52+i*7,w=106+i*11;rect('#293649',s.tree.x-w/2,y,w,8);rect('#77808a',s.tree.x-w/2,y,w,2);}
 for(const side of [-1,1]){
  const x=f.x+side*f.w*.38,y=f.top+f.h*.36;
  refugeShadow(x,y+12,64,17);arch(x,y,.8);
  refugeShadow(f.x+side*f.w*.43,f.top+f.h*.62,25,9);
  drawObjectSprite('column',f.x+side*f.w*.43-20,f.top+f.h*.62-66,40,74);
 }
 drawCampObject('meta-tree',()=>{refugeShadow(s.tree.x,s.tree.y+29,136,27);drawCampTreeTrunk(s.tree.x,s.tree.y);});
 drawCampObject('pets',()=>{refugeShadow(s.tent.x,s.tent.y+25,106,24);tent(s.tent.x,s.tent.y);});
 drawCampObject('workshop',()=>{refugeShadow(s.forge.x,s.forge.y+35,114,26);forge(s.forge.x,s.forge.y);});
 drawCampObject('egg-machine',()=>{refugeShadow(s.tent.x-94,s.tent.y+116,48,13);eggStand(s.tent.x-94,s.tent.y+93);});
 drawCampProps(s,f);
 // Labels become engraved name plates in the same stone as the refuge.
 for(const [label,x,y,w]of [['ДЕРЕВО',s.tree.x,s.tree.y+45,112],['ОТРЯД',s.tent.x,s.tent.y+44,101],['МАСТЕРСКАЯ',s.forge.x,s.forge.y+57,136],['ЯЙЦА',s.tent.x-94,s.tent.y+143,81]])drawCampPlaque(label,x,y,w);
};
drawCampCanopy=function(){
 const tile=campSpriteBand('tree',0,.57);if(!tile)return;const s=campPoints();
 drawCampObject('meta-tree',()=>{ctx.save();ctx.translate(s.tree.x,s.tree.y-93);ctx.rotate(Math.sin(campMotionTime()*1.2)*.004);ctx.drawImage(tile,-207,-185,414,324*.57);ctx.restore();});
};
forge=function(x,y){if(!drawObjectSprite('forge',x-125,y-154,250,205))campOriginalForge(x,y);};
drawCampLivingForge=function(){
 const s=campPoints(),clock=campMotionTime(),x=s.forge.x-38,y=s.forge.y-2;
 drawCampObject('workshop',()=>{
  for(let i=0;i<7;i++){const q=(clock*.15+i/7)%1;ctx.save();ctx.globalAlpha=(1-q)*.16;ellipse('#a3a5b2',s.forge.x+58+Math.sin(q*4+i)*8+q*12,s.forge.y-136-q*67,7+q*14,4+q*6);ctx.restore();}
  poly('#d18246',[[x-9,y+4],[x-7,y-8],[x-2,y-3],[x+2,y-22-Math.sin(clock*9)*4],[x+5,y-7],[x+11,y+4]]);poly('#f0c57d',[[x-4,y+4],[x-2,y-9],[x+2,y-3],[x+6,y+4]]);glow(x,y-4,60,'#f6b66322');
 });
};
drawCampAnimatedPixelFire=function(x,y){
 refugeShadow(x,y+15,48,14);
 if(!refugePaint('fire',x-53,y-7,106,47))ellipse('#566071',x,y+13,45,17);
 const clock=campMotionTime();
 for(let i=0;i<5;i++){
  const dx=(i-2)*8,height=22+Math.sin(clock*(7+i*.7)+i)*5+(i%2)*13;
  for(let band=0;band<height/3;band++){
   const q=band/(height/3),w=Math.max(2,Math.round((1-q)*12/2)*2),drift=Math.round(Math.sin(clock*6+i+q*3)*q*3);
   rect(i%2?'#d9904e':'#ba713d',x+dx-w/2+drift,y+7-band*3,w,4);
   if(q<.7)rect(q<.3?'#f5d390':'#e8ad62',x+dx-w/4+drift,y+7-band*3,Math.max(2,w/2),3);
  }
 }
 glow(x,y-10,115,'#f2b65b29');
 for(let i=0;i<13;i++){const q=(clock*(.3+hash(i,11)*.2)+hash(i,4))%1;ctx.save();ctx.globalAlpha=(1-q)*.8;rect(i%3?'#e8b779':'#fce3a7',x+Math.sin(q*5+i)*19,y-17-q*(48+hash(i,12)*30),2,2);ctx.restore();}
};
drawDetailedCampfire=drawCampAnimatedPixelFire;
portalArt=function(x,y,time){
 refugeShadow(x,y+54,103,24);drawObjectSprite('portal',x-108,y-133,216,205);drawCampPortalSpiral(x,y-1,time);drawCampPlaque('БЕЗДНА',x,y-120,129);
};
drawCampObjectLighting=function(){
 const s=campPoints();glow(s.tree.x,s.tree.y-67,150,'#a995d91b');glow(s.portal.x,s.portal.y-19,95,'#a57cd923');glow(s.tent.x,s.tent.y-5,83,'#efb36519');
};
drawCampObjectFX=function(){};
campScene=function(){
 if(!campBase)campBase=buildCampBase();ctx.drawImage(campBase,0,0,W,H);
 drawCampLifeBehindActors();drawCampObjectLighting();
 const s=campPoints();drawCampAnimatedPixelFire(s.fire.x,s.fire.y);
 const actors=[{x:camper.x,y:camper.y,hero:true},...squadMembers().map((member,i)=>({x:pet.x+i*36,y:pet.y+(i%2)*20,member}))];
 actors.sort((a,b)=>a.y-b.y);for(const a of actors){if(a.hero)hero(a.x,a.y+Math.sin(campMotionTime()*3));else drawPet(a.member,a.x,a.y+Math.sin(campMotionTime()*3),1.2);}
 drawCampObject('portal',()=>portalArt(s.portal.x,s.portal.y,campMotionTime()));drawCampPortalAura();
 // Cleared-floor trophies are worn copper seals set into the tree terrace.
 [2,3,5].forEach((level,i)=>{if(!save.completed.includes(level))return;const x=s.tree.x+(i-1)*38,y=s.tree.y+82;ellipse('#26313f',x,y,13,5);poly('#a18768',[[x,y-18],[x+7,y-10],[x,y-3],[x-7,y-10]]);rect('#d1bb8d',x-1,y-14,2,7);});
 for(const side of [-1,1]){
  const x=s.fire.x+side*252,y=s.fire.y+70;glow(x,y,70,'#ddac6711');
  const phase=campMotionTime()*.4+side;glow(x+Math.sin(phase)*20,y+61,133,'#68809b0b');
 }
 drawCampHover();
};
function refugeSky(){
 const key=Math.ceil(W)+':'+Math.ceil(H);if(REFUGE_ART.skyKey===key)return REFUGE_ART.sky;
 const sky=document.createElement('canvas');sky.width=Math.ceil(W/2);sky.height=Math.ceil(H/2);
 const original=ctx;ctx=sky.getContext('2d');ctx.scale(.5,.5);
 try{
  const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#0d1222');gradient.addColorStop(.5,'#172137');gradient.addColorStop(1,'#0b1120');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
  for(let band=0;band<4;band++){
   const points=[[0,H]];for(let x=0;x<=W+60;x+=60)points.push([x,H*(.35+band*.14)+Math.sin(x*.004+band)*50]);points.push([W,H]);poly(['#182237','#1c2940','#1b273b','#131e30'][band],points);
  }
  ctx.strokeStyle='#41405a40';ctx.lineWidth=11;ctx.beginPath();ctx.ellipse(W*.5,H*.3,244,155,-.25,Math.PI*.8,Math.PI*2.4);ctx.stroke();
  ctx.save();ctx.globalAlpha=.45;for(let i=0;i<16;i++){
   const side=i%2?1:-1,x=W*.5+side*(W*(.35+hash(i,31)*.17)),y=hash(i,32)*H,w=30+hash(i,33)*72;
   poly('#2c364b',[[x-w/2,y],[x+w*.4,y-9],[x+w*.5,y+6],[x+5,y+48+hash(i,34)*65],[x-w*.2,y+40]]);
   line('#47536a',2,[[x-w/2,y],[x+w*.4,y-9]]);
   if(i%4===0){rect('#2c354b',x-10,y-61,19,61);rect('#47536b',x-13,y-64,26,5);}
  }ctx.restore();
  for(let i=0;i<42;i++)rect(i%8?'#62718a44':'#a4a2b077',hash(i,41)*W,hash(i,42)*H,2,2);
 }finally{ctx=original;}
 REFUGE_ART.sky=sky;REFUGE_ART.skyKey=key;return sky;
}
const refugePreviousBackground=background;
background=function(){
 if(!refugeActive()){refugePreviousBackground();return;}
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(refugeSky(),0,0,W,H);ctx.restore();
 for(let i=0;i<5;i++){const clock=campMotionTime();glow(W*(i%2?.05:.95)+Math.sin(clock*.1+i)*40,H*(.4+i*.13),135,'#5360800d');}
};
drawWorldAtmosphere=function(){};
const refugePreviousWidth=ruinsWidth;
ruinsWidth=function(v){return floor>=6?refugePreviousWidth(v):v>1630?358+Math.min(1,(v-1630)/225)*165:340+Math.sin(v/250+floor)*29+Math.max(0,Math.cos((v-350)/350*Math.PI*2))*58;};
function refugeSideRuin(x,y,seed,side){
 const size=.65+hash(seed,floor)*.45,rx=64*size,ry=29*size,points=[[x-rx,y],[x-rx*.3,y-ry],[x+rx*.7,y-ry*.7],[x+rx,y+6],[x+rx*.25,y+ry],[x-rx*.8,y+ry*.6]];
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(b[0]<a[0])refugeRockFace([a,b,[b[0],b[1]+58],[x+8,y+99],[a[0],a[1]+50]],seed+i);}
 refugeSurface(points,'grass',(p*.75)%288);
 const type=(seed+floor)%4;
 if(type===0){arch(x,y+3,.6*size);foliage(x-side*36,y+22,.7);}
 else if(type===1){column(x-19,y+6);refugePaint('rubble',x+10,y-7,64,40);}
 else if(type===2){refugePaint('rubble',x-52,y-15,100,65);for(let i=0;i<3;i++)refugeGrass(x-28+i*27,y+11,.8,i+seed);}
 else {drawObjectSprite('column',x-11,y-56,31,70);refugePaint('rubble',x-53,y-13,60,39);campMushroom(x+24,y+13,.7);}
}
function drawRefugeRuins(){
 const near=Math.floor((p-850)/64)*64,far=p+H/.75+200,left=[],right=[];
 for(const side of [-1,1])for(let i=-1;i<5;i++){
  const index=Math.floor(p/520)+i,v=index*520+side*73+floor*19,y=sy(v),x=W/2+side*(Math.min(W*.35,440)+hash(index,floor)*65-25);
  if(y> -170&&y<H+170)refugeSideRuin(x,y,index+20+side*3,side);
 }
 for(let v=near;v<=far;v+=64){const y=sy(v),x=path(v),half=ruinsWidth(v)/2;left.push([x-half,y]);right.push([x+half,y]);}
 for(const [edge,side]of [[left,-1],[right,1]])for(let i=0;i<edge.length-1;i++){
  const a=edge[i],b=edge[i+1];refugeRockFace([a,b,[b[0]+side*10,b[1]+62],[a[0]+side*12,a[1]+62]],i+floor*31);
 }
 refugeSurface([...left,...right.slice().reverse()],'grass',(p*.75)%288);
 const trailLeft=[],trailRight=[];
 for(let v=near;v<=Math.min(far,1700);v+=48){const x=path(v)+Math.sin(v*.017)*14,y=sy(v),r=27+hash(Math.floor(v/48),floor)*10;trailLeft.push([x-r,y]);trailRight.push([x+r,y]);}
 if(trailLeft.length>1)refugeSurface([...trailLeft,...trailRight.reverse()],'stone',(p*.75)%288);
 for(const edge of [left,right])for(let i=0;i<edge.length-1;i++){
  const a=edge[i],b=edge[i+1];line('#6c7786',2,[a,b]);line('#293c4e',4,[[a[0],a[1]+3],[b[0],b[1]+3]]);
 }
 for(let v=Math.floor((p-500)/96)*96;v<p+H/.75+200;v+=96){
  const y=sy(v),x=path(v),half=ruinsWidth(v)/2;if(y< -90||y>H+90)continue;
  for(const side of [-1,1]){
   const edge=x+side*(half-11),seed=Math.round(v/96)+floor*101;
   refugeGrass(edge,y,.65+hash(seed,side)*.4,seed);
   if(seed%4===0)refugePaint('rubble',edge-33,y-17,66,41);
   if(seed%7===0){crystal(edge,y-13,.7);campMushroom(edge-side*20,y+14,.5);}
  }
 }
 const ax=path(1930),ay=sy(1930);
 if(ay> -240&&ay<H+220){
  refugeCourt(ax,ay+8,215,78,55);
  for(const side of [-1,1]){arch(ax+side*218,ay-13,.9);crystal(ax+side*163,ay+39,1.25);foliage(ax+side*207,ay+24,.8);}
  drawRuinsTerrainFX();
 }
 drawBattleActors();
}
battleScene=drawRefugeRuins;
function loadRefugeAtlas(kind,src){
 const sheet=new Image();sheet.onload=()=>{REFUGE_ART[kind]=sheet;REFUGE_ART.cache.clear();REFUGE_ART.tiles.clear();REFUGE_ART.ready++;CAMP_MOTION.bands.clear();refreshCampArt();refreshActorArt();};
 sheet.onerror=()=>{REFUGE_ART[kind]=null;refreshCampArt();};sheet.src=src;
}
loadRefugeAtlas('objects','assets/refuge-objects.png');
loadRefugeAtlas('actors','assets/refuge-actors.png');
loadRefugeAtlas('tree','assets/refuge-tree.png');
loadRefugeAtlas('terrain','assets/refuge-terrain.png');
CAMP_MOTION.bands.clear();refreshCampArt();
