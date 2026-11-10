'use strict';
// Forest camp: independent, resolution-independent illustration and walkable scene.
// No external art, credentials or provider jobs. Battle rendering remains unchanged.
const FOREST={cache:null,key:'',route:[],intent:null,keys:new Set(),fall:null,moving:false};
const forestPreviousBackground=background, forestPreviousUpdate=update, forestPreviousStart=start;
const forestOpenObject=activateCampObject, forestPreviousHUD=syncHUD;
function forestLayout(){
 const height=Math.max(900,H/W*(window.innerWidth<700?1000:1400)),tall=height>1300;
 return {height,tree:{x:tall?970:910,y:height*.36},tent:{x:tall?390:350,y:height*.44},forge:{x:tall?1050:1120,y:height*.51},eggs:{x:tall?310:230,y:height*.60},fire:{x:550,y:height*.57},portal:{x:930,y:height*.78},bridge:{x:735,y:height*.53}};
}
function forestView(){const mobile=window.innerWidth<700,scale=W/(mobile?1000:1400);return {scale,ox:mobile?-200*scale:0,oy:(H-forestLayout().height*scale)/2};}
function forestScreen(p){const v=forestView();return {x:p.x*v.scale+v.ox,y:p.y*v.scale+v.oy};}
function forestLocal(p){const v=forestView();return {x:(p.x-v.ox)/v.scale,y:(p.y-v.oy)/v.scale};}
function forestTransform(){const v=forestView();ctx.translate(v.ox,v.oy);ctx.scale(v.scale,v.scale);ctx.imageSmoothingEnabled=true;ctx.lineJoin='round';ctx.lineCap='round';}
function forestFill(points,fill,stroke=null,width=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function forestOval(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function forestGradient(x,y,r,inner,outer){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,inner);g.addColorStop(1,outer);return g;}
function forestStroke(points,color,width){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function forestPine(x,y,size,seed=0){
 ctx.save();ctx.translate(x,y);ctx.scale(size,size);
 forestOval(16,5,58,17,'#081f2455');forestFill([[-7,0],[-5,-160],[4,-165],[10,1]],'#483e36');
 for(let j=0;j<5;j++){const yy=-38-j*33,w=69-j*11;const g=ctx.createLinearGradient(-w,yy-50,w,yy+25);g.addColorStop(0,'#41655d');g.addColorStop(.45,'#254d49');g.addColorStop(1,'#153438');
 ctx.beginPath();ctx.moveTo(2,yy-70);ctx.bezierCurveTo(-8,yy-35,-w*.7,yy-3,-w,yy+10);ctx.quadraticCurveTo(-w*.4,yy+12,-w*.2,yy+3);ctx.quadraticCurveTo(w*.2,yy+26,w,yy+8);ctx.bezierCurveTo(w*.55,yy-12,13,yy-39,2,yy-70);ctx.fillStyle=g;ctx.fill();
 forestStroke([[-w*.71,yy+2],[-w*.4,yy-9],[-w*.15,yy-31]],'#64857744',2);
 }ctx.restore();
}
function forestRock(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);forestOval(2,6,25,10,'#102e2f55');forestFill([[-26,1],[-16,-17],[5,-23],[23,-12],[27,5],[6,13],[-18,11]],'#5c716d','#3b5352');forestFill([[-26,1],[-16,-17],[5,-23],[10,-7],[-5,3]],'#82938a');forestStroke([[-16,-17],[5,-23],[23,-12]],'#afbaa044',2);forestOval(-9,-10,12,4,'#6c8157');ctx.restore();}
function forestLantern(x,y){forestStroke([[x,y],[x,y-81],[x+14,y-81],[x+14,y-65]],'#6b5841',4);forestOval(x+14,y-51,55,55,forestGradient(x+14,y-51,55,'#ffbf5544','#ffbf5500'));forestFill([[x+6,y-63],[x+22,y-63],[x+24,y-43],[x+4,y-43]],'#ffd18c','#6b4e35',3);forestStroke([[x+4,y-65],[x+24,y-65]],'#4b3d32',4);}
function forestCrate(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);forestFill([[-26,-27],[3,-36],[30,-21],[0,-11]],'#b59362','#584b3c');forestFill([[-26,-27],[0,-11],[0,19],[-26,4]],'#795c3e','#584b3c');forestFill([[0,-11],[30,-21],[30,9],[0,19]],'#967448','#584b3c');forestStroke([[5,-6],[25,7]],'#c1a273',3);ctx.restore();}
function forestTent(p){
 const {x,y}=p;ctx.save();ctx.translate(x,y);forestOval(4,8,134,42,'#102f3266');
 forestFill([[-129,0],[-5,-142],[63,-118],[143,20],[13,49]],'#8e594e','#503e3b',3);
 const g=ctx.createLinearGradient(-110,-80,70,45);g.addColorStop(0,'#d7a076');g.addColorStop(1,'#a36152');
 forestFill([[-129,0],[-5,-142],[15,49]],g,'#deb085',2);
 forestFill([[-79,13],[-5,-104],[3,42]],'#332e33');forestFill([[-5,-104],[55,33],[3,42]],'#543e40');forestFill([[-5,-104],[12,-17],[55,33],[23,16]],'#b77b60');
 forestStroke([[-5,-145],[-5,-161]],'#d3b988',5);forestStroke([[-124,-4],[-153,33]],'#c5b189',2);forestStroke([[130,10],[158,48]],'#c5b189',2);
 for(let i=0;i<4;i++)forestStroke([[33+i*22,-91+i*27],[55+i*18,22+i*3]],'#dcad7533',2);
 forestCrate(-136,26,.7);forestCrate(111,41,.85);forestLantern(-148,-12);
 forestOval(-24,44,27,8,'#8b7d62');forestOval(-24,42,20,5,'#6b9d9a');ctx.restore();
}
function forestForge(p){
 ctx.save();ctx.translate(p.x,p.y);forestOval(0,10,131,37,'#112d3266');
 forestFill([[-107,-70],[17,-101],[106,-56],[106,17],[-10,49],[-107,5]],'#63716a','#344d4c',3);
 forestFill([[-107,-70],[-10,-24],[-10,49],[-107,5]],'#7b8070');
 for(let i=0;i<4;i++)forestStroke([[-102,-54+i*17],[-16,-14+i*17]],'#4b6259',2);
 forestFill([[-137,-74],[-29,-145],[131,-74],[15,-25]],'#657666','#344c48',3);
 forestFill([[-29,-145],[15,-25],[131,-74]],'#3c5b52');
 for(let i=0;i<5;i++)forestStroke([[-121+i*27,-78-i*14],[-4+i*24,-35-i*9]],'#90a08a66',2);
 forestFill([[56,-109],[56,-184],[84,-191],[105,-177],[105,-97],[81,-90]],'#78867a','#3b5550',3);
 forestFill([[52,-185],[83,-198],[110,-183],[83,-170]],'#a2aa8e');
 ctx.beginPath();ctx.moveTo(12,24);ctx.lineTo(12,-12);ctx.bezierCurveTo(12,-47,63,-52,72,-18);ctx.lineTo(72,8);ctx.closePath();ctx.fillStyle='#263b3a';ctx.fill();
 forestOval(43,0,32,44,forestGradient(43,0,44,'#ffb35cbb','#ffb35c00'));
 forestFill([[24,15],[27,-11],[37,0],[43,-32],[52,-8],[60,-15],[64,8]],'#ef9d54');forestFill([[35,11],[42,-12],[52,8]],'#ffdfa0');
 forestCrate(108,25,.8);forestStroke([[-77,19],[-39,29]],'#9c8c72',12);forestFill([[-75,2],[-54,-11],[-25,0],[-33,8],[-52,9],[-51,21],[-66,14]],'#455c60','#a6b1a2');forestLantern(-120,22);ctx.restore();
}
function forestTree(p){
 ctx.save();ctx.translate(p.x,p.y);forestOval(0,8,135,44,'#14333255');
 for(let i=0;i<8;i++){const a=i*Math.PI/4;forestRock(Math.cos(a)*76,Math.sin(a)*25,.5);}
 forestStroke([[-57,14],[-12,-24],[8,-73],[-13,-110],[6,-181]],'#4c4944',27);
 forestStroke([[0,-55],[49,-109],[73,-150]],'#5c594e',17);forestStroke([[-8,-91],[-63,-143],[-83,-167]],'#636454',17);
 forestStroke([[-17,5],[-2,-43],[16,-70],[4,-109]],'#b5a58577',6);
 for(let i=0;i<40;i++){const a=hash(i,31)*Math.PI*2,r=Math.sqrt(hash(i,32));const xx=Math.cos(a)*133*r,yy=-174+Math.sin(a)*58*r;const radius=32+hash(i,3)*24;forestOval(xx,yy,radius,20+hash(i,7)*16,forestGradient(xx-8,yy-7,radius,['#849d8b','#9cac95','#bcc4a2','#adc0aa','#c9cead'][i%5],'#607d7488'));}
 for(let i=0;i<190;i++){const a=hash(i,81)*Math.PI*2,r=Math.sqrt(hash(i,82)),xx=Math.cos(a)*137*r,yy=-174+Math.sin(a)*62*r;forestStroke([[xx,yy],[xx+5,yy-2]],i%3?'#dbe1b122':'#344f6522',2);}
 forestOval(0,-82,26,36,forestGradient(0,-82,36,'#b3e5d477','#b3e5d400'));forestFill([[0,-102],[9,-82],[0,-62],[-9,-82]],'#ceeedc','#8cc8c0');ctx.restore();
}
function forestEggs(p){ctx.save();ctx.translate(p.x,p.y);forestOval(0,8,64,21,'#152d3266');forestFill([[-46,-8],[0,-28],[46,-6],[0,15]],'#947b54','#4f5946',3);forestFill([[-43,-9],[-37,25],[0,40],[39,21],[44,-6],[0,14]],'#687d61','#3c564b',3);for(let i=0;i<3;i++){forestOval((i-1)*25,-22+(i%2)*9,15,21,['#c1d8bb','#d5bed7','#e5cca1'][i]);forestOval((i-1)*25-4,-29+(i%2)*9,4,6,'#ffffff66');}forestLantern(-62,8);ctx.restore();}
function forestRiverX(y){const h=forestLayout().height;return 650+Math.sin(y/h*5-.7)*115;}
function forestRiverPath(){const h=forestLayout().height;ctx.beginPath();ctx.moveTo(forestRiverX(-100),-100);for(let y=-100;y<h+150;y+=18)ctx.lineTo(forestRiverX(y),y);}
function forestBridge(){const b=forestLayout().bridge;ctx.save();ctx.translate(b.x,b.y);const x=forestRiverX(b.y)-b.x;ctx.translate(x,0);forestStroke([[-111,11],[111,-11]],'#152d35aa',76);for(let i=0;i<13;i++){const xx=-108+i*17;forestFill([[xx,-33-xx*.1],[xx+15,-35-xx*.1],[xx+15,30-xx*.1],[xx,32-xx*.1]],i%2?'#ac9972':'#bdab82','#6e6953',1.2);}for(const side of [-1,1]){forestStroke([[-113,side*36-24],[0,side*36-45],[114,side*36-46]],'#b8ad83',5);for(const xx of [-109,0,109])forestStroke([[xx,side*36-xx*.1],[xx,side*36-xx*.1-35]],'#7a795b',7);}ctx.restore();}
function forestHole(p,time=0){
 ctx.save();ctx.translate(p.x,p.y);
 forestOval(0,8,199,116,'#10252966');
 forestOval(0,0,181,105,'#5f6d66');forestOval(0,2,164,93,'#293843');
 const g=ctx.createRadialGradient(0,35,5,0,0,168);g.addColorStop(0,'#090e25');g.addColorStop(.38,'#201b44');g.addColorStop(.75,'#584d8d');g.addColorStop(.91,'#a48ad1');g.addColorStop(1,'#3d4957');forestOval(0,3,158,88,g);
 ctx.save();ctx.beginPath();ctx.ellipse(0,3,158,88,0,0,Math.PI*2);ctx.clip();
 for(let j=0;j<7;j++){ctx.beginPath();for(let i=0;i<110;i++){const q=i/109,a=q*Math.PI*4+time*.45+j*.89,r=13+q*144;const x=Math.cos(a)*r,y=34+Math.sin(a)*r*.54-q*28;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle=j%2?'#c0a3ef44':'#a28be433';ctx.lineWidth=j%2?2:5;ctx.stroke();}
 forestOval(0,29,43,26,forestGradient(0,29,43,'#060c21','#090e2500'));ctx.restore();
 for(let i=0;i<18;i++){const a=i/18*Math.PI*2;ctx.save();ctx.translate(Math.cos(a)*174,Math.sin(a)*99);ctx.rotate(Math.sin(a)*.25);forestRock(0,0,.48+hash(i,2)*.2);ctx.restore();}
 for(let i=0;i<8;i++){const a=time*.3+i*2.3,x=Math.cos(a)*134,y=Math.sin(a)*71-15;forestOval(x,y,2,2,'#e9d8ff');}
 ctx.restore();
}
function forestBuild(){
 const layer=document.createElement('canvas');layer.width=Math.ceil(W*unit*dpr);layer.height=Math.ceil(H*unit*dpr);const original=ctx;ctx=layer.getContext('2d');ctx.scale(unit*dpr,unit*dpr);forestTransform();const h=forestLayout().height,s=forestLayout();
 const g=ctx.createLinearGradient(0,0,1400,h);g.addColorStop(0,'#203f46');g.addColorStop(.46,'#42645b');g.addColorStop(1,'#1c3d42');ctx.fillStyle=g;ctx.fillRect(0,0,1400,h);
 // Broad translucent washes and restrained ground marks give the clearing a painted surface.
 for(let i=0;i<140;i++){const x=hash(i,18)*1400,y=hash(i,19)*h,r=40+hash(i,20)*120;forestOval(x,y,r,r*.42,forestGradient(x,y,r,['#9db37a18','#c6bd7b12','#163e4215'][i%3],'#42645b00'));}
 for(const [a,b] of [[s.tent,s.fire],[s.fire,{x:forestRiverX(s.bridge.y),y:s.bridge.y}],[{x:forestRiverX(s.bridge.y),y:s.bridge.y},s.forge],[s.forge,{x:s.portal.x,y:s.portal.y-125}],[s.fire,s.eggs],[s.tree,s.forge]]){forestStroke([[a.x,a.y+35],[b.x,b.y+35]],'#88917433',56);forestStroke([[a.x,a.y+35],[b.x,b.y+35]],'#b3aa7e22',36);}
 for(const [c,w]of [['#223e42',103],['#849584',84],['#335d65',66],['#477c82',51]]){forestRiverPath();ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();}
 for(let i=0;i<70;i++){const y=hash(i,71)*h,x=forestRiverX(y)+(hash(i,72)-.5)*45;forestStroke([[x-5,y],[x+7,y-2]],'#b6d6c155',1.5);}
 // Sparse forest opens around a central walkable glade.
 for(let i=0;i<30;i++){const y=110+hash(i,50)*(h-200),x=i%2?55+hash(i,51)*85:1250+hash(i,51)*120;forestPine(x,y,.8+hash(i,52)*.55,i);}
 for(let i=0;i<8;i++){const x=160+i*162;forestPine(x,210+hash(i,53)*55,.7+hash(i,54)*.35,i);}
 for(let i=0;i<220;i++){const x=100+hash(i,90)*1200,y=250+hash(i,91)*(h-300);if(Math.abs(x-forestRiverX(y))<60)continue;const c=['#aabd8866','#bfc18c66','#d2c19a77','#75987388'][i%4];forestStroke([[x-3,y+2],[x,y-5],[x+1,y+2],[x+5,y-2]],c,1.5);if(i%9===0){forestOval(x,y-6,2.5,2,['#e1c5b3','#bac7d7','#e4d5a7'][i%3]);}}
 for(let i=0;i<25;i++){const y=250+hash(i,81)*(h-300);forestRock(forestRiverX(y)+(i%2?-1:1)*(53+hash(i,83)*13),y,.35+hash(i,82)*.3);}
 forestBridge();
 // Fine pigment flecks are baked once, never generated per frame.
 for(let i=0;i<16000;i++){const x=hash(i,160)*1400,y=hash(i,161)*h;forestOval(x,y,.5+hash(i,162)*1.4,.4+hash(i,163),i%2?'#e0dbb308':'#0f28350c');}
 ctx=original;return layer;
}
function forestFire(p){ctx.save();ctx.translate(p.x,p.y);forestOval(0,0,118,65,forestGradient(0,0,118,'#f0b06633','#f0b06600'));for(let i=0;i<10;i++){const a=i*Math.PI/5;forestRock(Math.cos(a)*40,Math.sin(a)*19,.35);}forestStroke([[-27,-2],[25,9]],'#72523c',9);forestStroke([[-23,9],[23,-4]],'#a77d50',7);const sway=Math.sin(campMotionTime()*6)*4;ctx.beginPath();ctx.moveTo(-19,0);ctx.bezierCurveTo(-28,-20,0,-24,sway,-57);ctx.bezierCurveTo(25,-21,29,-4,15,5);ctx.closePath();ctx.fillStyle='#ef9c56';ctx.fill();forestOval(0,-9,9,17,'#ffe1a1');ctx.restore();}
function forestHero(x,y,hop=0){ctx.save();ctx.translate(x,y);forestOval(0,4,19,7,'#0c2a3277');ctx.translate(0,-hop);forestStroke([[-6,-1],[-8,-13]],'#3a3c4b',8);forestStroke([[7,-1],[6,-14]],'#3a3c4b',8);forestFill([[-13,-14],[-9,-41],[12,-40],[18,-12],[0,-7]],'#826f96','#514d68',2);forestFill([[-9,-35],[-30,-12],[-30,-32],[0,-41]],'#ae7877');forestOval(0,-45,12,13,'#efc8a5');forestFill([[-24,-49],[-12,-59],[-3,-85],[10,-66],[16,-52],[27,-47],[0,-43]],'#807199','#b5a4c0',1.5);forestOval(4,-45,1.5,2,'#3e3b4e');forestStroke([[19,-14],[26,-55]],'#ac956a',3);forestOval(27,-59,6,8,'#b5ddda');ctx.restore();}
function forestCompanion(member,x,y){if(member.species!=='cat'){ctx.save();ctx.imageSmoothingEnabled=true;drawPet(member,x,y-15,.8);ctx.restore();return;}ctx.save();ctx.translate(x,y);forestOval(0,0,15,5,'#12313b55');forestStroke([[11,-9],[21,-21],[17,-27]],'#d8ddd1',6);forestOval(0,-11,12,13,'#e2e4d7');forestOval(-1,-25,13,11,'#f1eddd');forestFill([[-12,-28],[-12,-43],[-2,-34]],'#efe9d9');forestFill([[4,-34],[12,-43],[12,-27]],'#efe9d9');forestOval(-6,-25,1.6,2.3,'#4d6470');forestOval(4,-25,1.6,2.3,'#4d6470');forestOval(-1,-20,2,1,'#b9909c');ctx.restore();}
function forestSign(id,p,text){const active=hoveredCampObject===id||FOREST.intent===id;ctx.save();const font=Math.max(13,11/(unit*forestView().scale)),height=font+15;ctx.font=font+'px Georgia';const w=Math.max(98,ctx.measureText(text).width+32);ctx.fillStyle=active?'#364b50ee':'#20383cdd';ctx.strokeStyle=active?'#d7c39c':'#94a68b99';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(p.x-w/2,p.y,w,height,height/2);ctx.fill();ctx.stroke();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#eee3c7';ctx.fillText(text,p.x,p.y+height/2);ctx.restore();}
function forestObjects(){const s=forestLayout();return [{id:'pets',p:s.tent,label:'ОТРЯД',draw:forestTent,w:290,h:190},{id:'meta-tree',p:s.tree,label:'ДЕРЕВО НАВЫКОВ',draw:forestTree,w:300,h:270},{id:'workshop',p:s.forge,label:'МАСТЕРСКАЯ',draw:forestForge,w:280,h:220},{id:'egg-machine',p:s.eggs,label:'ЯЙЦА',draw:forestEggs,w:150,h:120}];}
function forestReset(){const s=forestLayout();Object.assign(camper,forestScreen({x:s.fire.x-70,y:s.fire.y+65}));camper.tx=camper.x;camper.ty=camper.y;Object.assign(pet,forestScreen({x:s.fire.x-110,y:s.fire.y+90}));FOREST.route=[];FOREST.intent=null;FOREST.keys.clear();FOREST.fall=null;}
const forestOldReset=resetCamper;
resetCamper=function(){forestOldReset();forestReset();};
background=function(){if(state!=='camp'){forestPreviousBackground();return;}const key=[W,H,unit,dpr].join(':');if(key!==FOREST.key){FOREST.cache=forestBuild();FOREST.key=key;}ctx.drawImage(FOREST.cache,0,0,W,H);};
campScene=function(){
 ctx.save();forestTransform();const s=forestLayout(),time=campMotionTime();forestHole(s.portal,time);forestFire(s.fire);
 const a=forestLocal(camper),b=forestLocal(pet);const actors=[...forestObjects().map(o=>({y:o.p.y,draw:()=>o.draw(o.p)})),{y:a.y,draw:()=>{if(!FOREST.fall)forestHero(a.x,a.y,FOREST.moving?Math.abs(Math.sin(time*10))*3:0);}},...squadMembers().map((m,i)=>({y:b.y+i*15,draw:()=>forestCompanion(m,b.x+i*29,b.y+i*15)}))];
 actors.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
 for(const o of forestObjects())forestSign(o.id,{x:o.p.x,y:o.p.y+48},o.label);
 forestSign('portal',{x:s.portal.x,y:s.portal.y+122},'СПУСК В БЕЗДНУ');
 for(let i=0;i<22;i++){const x=160+hash(i,1)*1080+Math.sin(time*.3+i)*15,y=250+hash(i,2)*(s.height-350)+Math.cos(time*.5+i)*8;forestOval(x,y,2,2,`rgba(233,221,161,${.2+Math.sin(time+i)*.18})`);}
 if(FOREST.route.length){const dest=FOREST.route[FOREST.route.length-1];ctx.strokeStyle='#e5d5a577';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(dest.x,dest.y,12,6,0,0,Math.PI*2);ctx.stroke();}
 if(FOREST.fall){const f=FOREST.fall,q=Math.min(1,f.time/1.1);ctx.save();ctx.translate(s.portal.x,s.portal.y+q*30);ctx.scale(1-q*.85,1-q*.85);ctx.globalAlpha=1-q;forestHero(0,-(1-q)*55);ctx.restore();ctx.fillStyle=`rgba(12,14,35,${q*.98})`;ctx.fillRect(0,0,1400,s.height);}
 ctx.restore();
};
campAreas=function(){return [...forestObjects().map(o=>({id:o.id,label:o.label,x:o.p.x-o.w/2,y:o.p.y-o.h+30,w:o.w,h:o.h+50})),{id:'portal',label:'Спуск в бездну',x:forestLayout().portal.x-190,y:forestLayout().portal.y-105,w:380,h:260}].map(o=>{const a=forestScreen(o),v=forestView();return {...o,x:a.x,y:a.y,w:o.w*v.scale,h:o.h*v.scale,shape:[[0,0],[1,0],[1,1],[0,1]]};});};
// The river can only be crossed at the bridge. Object footprints and hole are solid.
function forestWalkable(x,y){const s=forestLayout();if(x<155||x>1245||y<280||y>s.height-90)return false;if(Math.abs(x-forestRiverX(y))<53&&Math.abs(y-s.bridge.y)>29)return false;if(((x-s.portal.x)/202)**2+((y-s.portal.y)/122)**2<1)return false;for(const o of forestObjects()){const rx=o.id==='meta-tree'?62:o.w*.40,ry=o.id==='meta-tree'?30:40;if(((x-o.p.x)/rx)**2+((y-o.p.y)/ry)**2<1)return false;}return true;}
function forestRoute(from,to){
 const step=20,cols=71,rows=Math.ceil(forestLayout().height/step)+1;
 const cell=p=>[Math.round(p.x/step),Math.round(p.y/step)],key=(x,y)=>y*cols+x;
 let [sx,sy]=cell(from),[ex,ey]=cell(to);
 if(!forestWalkable(ex*step,ey*step))return [];
 const queue=[[sx,sy]],seen=new Map([[key(sx,sy),null]]);let found=null;
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i],k=key(x,y);if(x===ex&&y===ey){found=k;break;}for(const [dx,dy]of [[0,1],[1,0],[0,-1],[-1,0]]){const nx=x+dx,ny=y+dy,nk=key(nx,ny);if(nx<0||nx>=cols||ny<0||ny>=rows||seen.has(nk)||!forestWalkable(nx*step,ny*step))continue;seen.set(nk,k);queue.push([nx,ny]);}}
 if(found===null)return [];const route=[];for(let k=found;seen.get(k)!==null;k=seen.get(k)){route.push({x:(k%cols)*step,y:Math.floor(k/cols)*step});}return route.reverse();
}
function forestGo(to,id=null){if(panel||FOREST.fall||state!=='camp')return;const a=forestLocal(camper);const route=forestRoute(a,to);if(!route.length&&Math.hypot(a.x-to.x,a.y-to.y)>30)return;FOREST.route=route;FOREST.intent=id;if(!route.length&&id){FOREST.intent=null;forestOpenObject(id);}}
activateCampObject=function(id){const s=forestLayout(),o=forestObjects().find(o=>o.id===id);forestGo(id==='portal'?{x:s.portal.x-100,y:s.portal.y-137}:{x:o.p.x,y:o.p.y+65},id);};
function forestPointer(ev){const p=forestLocal(pointerPosition(ev));const target=getCampTarget(pointerPosition(ev).x,pointerPosition(ev).y);if(target)activateCampObject(target.id);else forestGo(p);}
update=function(dt){
 if(state!=='camp'){forestPreviousUpdate(dt);return;}if(panel||paused)return;anim+=dt;
 if(FOREST.fall){FOREST.fall.time+=dt;if(FOREST.fall.time>=1.1){const n=FOREST.fall.floor;FOREST.fall=null;forestPreviousStart(n);}return;}
 const a=forestLocal(camper),speed=225;let next={...a},moving=false;
 const k=FOREST.keys,dx=(k.has('KeyD')||k.has('ArrowRight')?1:0)-(k.has('KeyA')||k.has('ArrowLeft')?1:0),dy=(k.has('KeyS')||k.has('ArrowDown')?1:0)-(k.has('KeyW')||k.has('ArrowUp')?1:0);
 if(dx||dy){FOREST.route=[];FOREST.intent=null;const length=Math.hypot(dx,dy);const x=a.x+dx/length*speed*dt,y=a.y+dy/length*speed*dt*.65;if(forestWalkable(x,a.y))next.x=x;if(forestWalkable(next.x,y))next.y=y;moving=next.x!==a.x||next.y!==a.y;}
 else if(FOREST.route.length){const b=FOREST.route[0],distance=Math.hypot(b.x-a.x,b.y-a.y),move=Math.min(distance,speed*dt);if(distance>.1){next={x:a.x+(b.x-a.x)/distance*move,y:a.y+(b.y-a.y)/distance*move};moving=true;}if(distance<=speed*dt+.1)FOREST.route.shift();}
 Object.assign(camper,forestScreen(next));camper.tx=camper.x;camper.ty=camper.y;FOREST.moving=moving;
 const target=forestScreen({x:next.x-35,y:next.y+20});pet.x+=(target.x-pet.x)*Math.min(1,dt*5);pet.y+=(target.y-pet.y)*Math.min(1,dt*5);
 if(!FOREST.route.length&&FOREST.intent){const id=FOREST.intent;FOREST.intent=null;forestOpenObject(id);}
};
const forestPreviousFloors=showFloors;
showFloors=function(){forestPreviousFloors();if(panel==='floors')$('enter-floor').onclick=()=>{closePanel();FOREST.route=[];FOREST.intent=null;FOREST.keys.clear();FOREST.fall={floor:selectedFloor,time:0};};};
syncHUD=function(){forestPreviousHUD();$('world').setAttribute('data-camp',state==='camp'?'forest':'');const hint=$('forest-hint');if(hint)hint.hidden=state!=='camp'||Boolean(panel)||Boolean(FOREST.fall);};
window.addEventListener('keydown',ev=>{if(state!=='camp'||panel||FOREST.fall)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(ev.code)){ev.preventDefault();FOREST.keys.add(ev.code);}if(ev.code==='KeyE'&&!ev.repeat){const a=forestLocal(camper),targets=forestObjects().map(o=>({id:o.id,p:{x:o.p.x,y:o.p.y+65}}));targets.push({id:'portal',p:{x:forestLayout().portal.x-100,y:forestLayout().portal.y-137}});const near=targets.sort((u,v)=>Math.hypot(u.p.x-a.x,u.p.y-a.y)-Math.hypot(v.p.x-a.x,v.p.y-a.y))[0];if(Math.hypot(near.p.x-a.x,near.p.y-a.y)<110)activateCampObject(near.id);}});
window.addEventListener('keyup',ev=>FOREST.keys.delete(ev.code));window.addEventListener('blur',()=>FOREST.keys.clear());document.addEventListener('visibilitychange',()=>FOREST.keys.clear());
const forestShowPanel=showPanel;showPanel=function(...args){FOREST.keys.clear();FOREST.moving=false;forestShowPanel(...args);};
forestReset();positionCampObjects();syncHUD();
