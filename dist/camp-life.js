'use strict';
// Camp decoration is separate from hotspots and progression. Static details share
// the existing camp cache; only fog, particles and small local effects animate.
function campPebble(x,y,w=28){
 x=Math.round(x);y=Math.round(y);
 poly('#49364f',[[x-w/2,y],[x-w/2+4,y-6],[x+w/2-3,y-6],[x+w/2,y+2],[x+w/2-4,y+7],[x-w/2+2,y+7]]);
 rect('#a28bb0',x-w/2+4,y-6,w-8,3);rect('#80658f',x-w/2+3,y-3,w-6,6);
}
function campPath(a,b){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/32));
 for(let i=0;i<=n;i++){const q=i/n,x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q;campPebble(x+(i%2?5:-5),y,25+hash(i,4)*9);}
}
function campGrass(x,y,seed){
 rect('#40374f',x-10,y,24,4);
 for(let i=0;i<4;i++){const h=5+Math.floor(hash(seed,i)*4)*3;rect(i%2?'#a48cbe':'#786894',x-7+i*5,y-h,3,h);}
}
function campMushroom(x,y,scale=1){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
 rect('#cfb8d3',-2,-8,4,10);rect('#795988',-9,-13,18,7);rect('#b091d1',-6,-17,12,5);rect('#edd3ed',-5,-13,3,3);rect('#d5b1e6',3,-11,3,3);ctx.restore();
}
function campLog(x,y,w=64){
 rect('#281c32',x-w/2-3,y+4,w+6,13);rect('#634057',x-w/2,y-5,w,16);rect('#af7b78',x-w/2,y-5,w,4);
 for(let i=0;i<3;i++)rect('#7e5266',x-w/2+10+i*16,y+2,10,3);
 rect('#cf9f86',x-w/2-2,y-4,10,14);rect('#855b63',x-w/2+1,y,4,6);
}
function campCrate(x,y,w=28){
 rect('#332237',x-2,y-2,w+4,w+4);rect('#825464',x,y,w,w);rect('#ba8590',x,y,w,4);
 rect('#bd8790',x,y,4,w);rect('#614053',x+w-4,y+4,4,w-4);
 for(let i=5;i<w-5;i+=4)rect('#b27b83',x+i,y+i,5,4);
}
function drawCampGroundDetails(s,f){
 const center={x:s.fire.x,y:s.fire.y+35};
 campPath(center,{x:s.tree.x,y:s.tree.y+70});
 campPath({x:s.fire.x-55,y:s.fire.y+20},{x:s.tent.x+20,y:s.tent.y+68});
 campPath({x:s.fire.x+55,y:s.fire.y+20},{x:s.forge.x-10,y:s.forge.y+78});
 campPath({x:s.fire.x,y:s.fire.y+62},{x:s.portal.x,y:s.portal.y-65});
 for(const side of [-1,1])for(let i=0;i<7;i++){
  const x=f.x+side*f.w*(.26+hash(i,41)*.14),y=f.top+f.h*(.42+hash(i,42)*.25);
  queueCampGrass(Math.round(x),Math.round(y),i);if(i%3===0)campMushroom(x+12,y-2,.85);
 }
 // A rug, two bowls and a chew toy identify the companion corner.
 const x=s.tent.x+106,y=s.tent.y+77;
 rect('#4d304f',x-41,y-19,82,38);rect('#b1819f',x-38,y-17,76,32);rect('#79506e',x-31,y-10,62,18);
 for(const side of [-1,1])rect('#d4acba',x+side*29-2,y-13,4,25);
 for(const dx of [-24,5]){rect('#32233e',x+dx,y+24,23,10);rect('#b5a3bc',x+dx,y+22,23,5);rect(dx<0?'#7198bd':'#ba9675',x+dx+4,y+23,15,3);}
 rect('#d1b9bd',x+33,y+21,17,4);rect('#ead3d0',x+31,y+18,5,10);rect('#ead3d0',x+47,y+18,5,10);
}
function drawCampProps(s,f){
 // A resting place around the fire keeps the central crossing open.
 campLog(s.fire.x-104,s.fire.y+50,65);campLog(s.fire.x+104,s.fire.y+50,65);
 const x=s.fire.x+61,y=s.fire.y+8;
 rect('#251b30',x-10,y-6,23,18);rect('#84768f',x-12,y-9,27,6);rect('#c3adbc',x-9,y-10,21,2);rect('#38283f',x-7,y-7,17,3);
 rect('#ccadab',s.fire.x-115,s.fire.y+30,9,10);rect('#ccadab',s.fire.x-106,s.fire.y+32,4,5);
 // Tools and supplies sit just outside the workshop silhouette.
 const fx=s.forge.x+106,fy=s.forge.y+20;
 campCrate(fx,fy,29);campCrate(fx+31,fy+5,23);
 campLog(s.forge.x-87,s.forge.y+78,48);campLog(s.forge.x-86,s.forge.y+65,43);
 rect('#c7a9bf',fx+7,fy-17,5,17);rect('#80678d',fx,fy-21,21,7);
 rect('#4a304b',fx+37,fy-28,4,33);rect('#b9a3c4',fx+31,fy-29,17,6);
 // A tiny perch and a rope toy beside the pet rug.
 const px=s.tent.x+162,py=s.tent.y+48;
 rect('#4a3049',px-4,py-51,7,64);rect('#bd8d96',px-22,py-52,43,5);rect('#c9a498',px+12,py-47,2,18);rect('#b582bc',px+9,py-29,8,8);
}
(() => {
 let sky=null,skyKey='',mist=null;
 const reducedMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 const clock=()=>reducedMotion?0:anim;
 function prepareSky(){
  const key=Math.ceil(W)+':'+Math.ceil(H);if(skyKey===key)return;
  skyKey=key;sky=document.createElement('canvas');sky.width=Math.ceil(W/3);sky.height=Math.ceil(H/3);
  const original=ctx;ctx=sky.getContext('2d');ctx.save();ctx.scale(1/3,1/3);
  rect('#100d23',0,0,W,H);
  // Broad, stepped layers suggest immense depth without a detailed texture.
  for(let band=0;band<7;band++){
   const y=H*(.18+band*.12),c=['#17132d','#1d1736','#20193c','#251d44','#282047','#211b3c','#19152f'][band];
   const p=[[0,H]];for(let x=0;x<=W+48;x+=48)p.push([x,y+Math.round(Math.sin(x*.003+band)*H*.045/9)*9]);p.push([W,H]);poly(c,p);
  }
  // Distant suspended rock terraces and the silhouettes of abandoned towers.
  for(let i=0;i<13;i++){
   const left=i%2===0,x=left?W*(.015+hash(i,30)*.15):W*(.83+hash(i,30)*.15),y=H*(.08+hash(i,31)*.79),w=36+hash(i,32)*95,h=35+hash(i,33)*115;
   const color=i%3?'#332747':'#453151';
   poly(color,[[x-w/2,y],[x+w/2,y-8],[x+w/2+8,y+9],[x+12,y+h],[x-4,y+h*.72],[x-w/2,y+14]]);
   rect('#5b4269',x-w/2,y,w,5);
   if(i%3===0){rect('#3f304e',x-12,y-55,24,57);rect('#5b4269',x-17,y-58,34,7);rect('#a078b0',x-3,y-36,5,11);}
  }
  // A broken monumental arch hangs high above the camp.
  const ax=W*.79,ay=H*.12;
  rect('#3e2d52',ax-35,ay-34,13,66);rect('#3e2d52',ax+24,ay-34,13,48);
  poly('#49345e',[[ax-39,ay-30],[ax-22,ay-53],[ax+8,ay-58],[ax+34,ay-39],[ax+25,ay-31],[ax+5,ay-46],[ax-17,ay-42],[ax-28,ay-25]]);
  for(let i=0;i<45;i++){const x=hash(i,61)*W,y=hash(i,62)*H;rect(i%5?'#655076':'#c4a1cc',x,y,i%5?2:3,2);}
  ctx.restore();ctx=original;
 }
 function prepareMist(){
  if(mist)return;mist=document.createElement('canvas');mist.width=192;mist.height=64;
  const b=mist.getContext('2d');
  // Alpha falls off in coarse strips so the fog keeps the sprite art's pixel grid.
  for(let y=0;y<64;y+=2)for(let x=0;x<192;x+=3){
   const dx=(x-96)/96,dy=(y-32)/30;
   const a=Math.max(0,1-dx*dx-dy*dy)*(.16+.04*Math.sin(x*.12+y*.1));
   if(a>0){b.fillStyle='rgba(168,139,196,'+a+')';b.fillRect(x,y,3,2);}
  }
 }
 const oldBackground=background;
 background=function(){
  if(state!=='camp'){oldBackground();return;}
  prepareSky();ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(sky,0,0,W,H);
  const time=clock();
  for(let i=0;i<12;i++){
   const left=i%2===0,x=W*(left?.025+hash(i,5)*.11:.86+hash(i,5)*.12)+Math.round(Math.sin(time*.12+i)*8),y=(hash(i,4)*H+time*(2+i%3))%(H+50)-25;
   const n=7+hash(i,6)*13;poly('#58416b',[[x,y],[x+n,y-5],[x+n+5,y+6],[x+5,y+22],[x,y+12]]);rect('#9470a4',x,y,n,3);
  }
  ctx.restore();
 };
 const oldAtmosphere=drawWorldAtmosphere;
 drawWorldAtmosphere=function(){if(state!=='camp')oldAtmosphere();};
 function fog(){
  prepareMist();const time=clock(),points=campOutline(),f=campFrame();
  ctx.save();ctx.beginPath();ctx.rect(-W,-H,W*3,H*3);
  const inner=points.map(([x,y])=>[f.x+(x-f.x)*.965,f.top+f.h*.57+(y-(f.top+f.h*.57))*.965]);
  inner.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip('evenodd');
  ctx.imageSmoothingEnabled=false;
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length],x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;
   for(let layer=0;layer<2;layer++){
    const drift=Math.round(Math.sin(time*.12+i+layer)*24),lift=Math.round(Math.cos(time*.09+i)*9);
    ctx.globalAlpha=layer?.65:.9;ctx.drawImage(mist,x-210+drift,y-23+layer*31+lift,420,100+layer*30);
   }
  }ctx.restore();
 }
 function lanternPost(x,y,active=true){
  rect('#44304e',x-3,y-47,6,50);rect('#a5809b',x-7,y-48,20,4);rect('#31223b',x+7,y-46,13,22);
  rect(active?'#f4bf75':'#665270',x+10,y-40,7,12);if(active)rect('#ffe7b6',x+12,y-38,3,7);rect('#806278',x+6,y-26,15,4);
 }
 function trophies(s){
  const stages=[2,3,5];
  stages.forEach((stage,i)=>{
   const x=s.tree.x+(i-1)*60,y=s.tree.y+74,won=save.completed.includes(stage);
   rect('#42304e',x-17,y,34,12);rect('#b295bd',x-19,y-4,38,5);
   if(won){poly(i===2?'#e7bc7e':'#bc8ed8',[[x,y-35],[x+12,y-23],[x+8,y-9],[x-8,y-9],[x-12,y-23]]);rect('#f6d5e9',x-3,y-28,6,7);}
   else rect('#70567e',x-6,y-1,12,3);
  });
 }
 function campAnimation(){
  const s=campPoints(),f=campFrame();
  // Larger wind, smoke and leaf effects are drawn by camp-motion.js.
  for(const side of [-1,1]){lanternPost(f.x+side*f.w*.23,f.top+f.h*.69);if(save.completed.length>=2)lanternPost(f.x+side*f.w*.29,f.top+f.h*.53);}
  trophies(s);
  // Restored stonework and additional warm lights reflect real cleared floors.
  if(save.completed.length>=3){const x=f.x-f.w*.38,y=f.top+f.h*.36;rect('#8b709b',x-48,y-100,20,11);rect('#b39bc0',x-48,y-100,20,3);}
 }
 const oldScene=campScene;
 campScene=function(){oldScene();ctx.save();campAnimation();ctx.restore();fog();};
 refreshCampArt();
})();
