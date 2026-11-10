'use strict';
// Small, cached pixel surfaces: diffuse art only. Wind, leaves and light stay in camp-motion.
let abyssGrassTile=null;
function grassSurface(){
 if(abyssGrassTile)return abyssGrassTile;
 const tile=document.createElement('canvas');tile.width=192;tile.height=144;
 const b=tile.getContext('2d');b.imageSmoothingEnabled=false;b.fillStyle='#16263e';b.fillRect(0,0,192,144);
 for(let i=0;i<145;i++){
  const x=Math.floor(hash(i,321)*96)*2,y=Math.floor(hash(i,322)*72)*2;
  b.fillStyle=i%3?'#1b2e48':'#1e334e';b.fillRect(x,y,8+Math.floor(hash(i,323)*6)*2,4);
 }
 for(let i=0;i<220;i++){
  const x=Math.floor(hash(i,324)*96)*2,y=Math.floor(hash(i,325)*72)*2,h=2+Math.floor(hash(i,326)*3)*2;
  b.fillStyle=['#233953','#29415e','#304c68','#1e3450'][i%4];b.fillRect(x,y-h,2,h);
  if(i%3===0){b.fillStyle='#365570';b.fillRect(x-2,y-4,2,2);b.fillRect(x+2,y-6,2,4);}
  if(i%41===0){b.fillStyle='#80728f';b.fillRect(x-2,y-4,2,2);}
 }
 abyssGrassTile=tile;return tile;
}
function drawAbyssGrass(points,scroll=0){
 ctx.save();ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
 ctx.fillStyle='#16263e';ctx.fillRect(0,0,W,H);
 const pattern=ctx.createPattern(grassSurface(),'repeat');
 if(pattern){ctx.translate(0,scroll);ctx.fillStyle=pattern;ctx.fillRect(-W,-H-scroll,W*3,H*3);}
 ctx.restore();
}
function abyssGrassTuft(x,y,seed){
 rect('#111e31',x-12,y,27,4);
 for(let i=0;i<5;i++){
  const h=7+Math.floor(hash(seed,i)*4)*3,dx=x-9+i*5;
  rect(i%2?'#41617b':'#294560',dx,y-h,3,h);rect('#52718b',dx,y-h,3,2);
 }
}
campGrass=abyssGrassTuft;
function makeAncientTree(){
 const tile=document.createElement('canvas');tile.width=144;tile.height=116;
 const b=tile.getContext('2d');b.imageSmoothingEnabled=false;
 function box(c,x,y,w,h){b.fillStyle=c;b.fillRect(Math.round(x),Math.round(y),w,h);}
 function shape(c,points){b.fillStyle=c;b.beginPath();points.forEach(([x,y],i)=>i?b.lineTo(x,y):b.moveTo(x,y));b.closePath();b.fill();}
 function limb(points,width,color){
  // Pixel steps replace antialiased strokes and keep branch silhouettes crisp at 3x scale.
  for(let i=1;i<points.length;i++){
   const [ax,ay]=points[i-1],[bx,by]=points[i],steps=Math.max(Math.abs(bx-ax),Math.abs(by-ay));
   for(let s=0;s<=steps;s++){const q=s/Math.max(1,steps);box(color,ax+(bx-ax)*q-width/2,ay+(by-ay)*q-width/2,width,width);}
  }
 }
 shape('#171b2c',[[23,104],[35,96],[108,96],[124,104],[116,113],[40,115]]);
 shape('#414052',[[25,102],[42,94],[107,96],[122,102],[109,110],[42,111]]);
 shape('#676074',[[30,101],[44,95],[106,97],[118,102],[108,104],[43,105]]);
 for(let i=0;i<9;i++){const x=34+i*9;box('#262b3e',x,105+(i%2),2,6);}
 // Wide, interwoven roots reach over the old ring of stone.
 for(const [points,width]of [
  [[[72,90],[58,100],[40,104],[29,102]],6],
  [[[77,88],[88,100],[105,104],[117,101]],6],
  [[[68,92],[61,105],[47,109]],5],
  [[[79,92],[84,107],[102,110]],5],
  [[[73,92],[72,108],[65,112]],7]
 ]){limb(points,width+3,'#1c1c31');limb(points,width,'#4a3b55');limb(points.map(([x,y])=>[x-1,y-1]),2,'#786075');}
 shape('#201b30',[[60,97],[65,84],[63,71],[66,56],[61,44],[70,40],[76,54],[79,68],[77,83],[87,99],[76,106]]);
 shape('#4d3a57',[[64,97],[69,83],[67,71],[69,56],[65,45],[70,44],[73,58],[76,70],[73,86],[81,99],[74,102]]);
 shape('#84657d',[[65,94],[70,81],[69,69],[72,62],[72,76],[69,90],[72,99],[68,99]]);
 shape('#2c2540',[[76,56],[79,69],[76,83],[84,98],[78,95],[72,82]]);
 const branches=[
  [[70,69],[57,56],[42,50],[30,33],[19,30]],
  [[70,62],[53,46],[47,29],[37,20]],
  [[71,56],[71,37],[62,24],[63,13]],
  [[74,65],[88,51],[105,46],[119,29],[128,26]],
  [[73,53],[88,39],[91,25],[103,17]],
  [[54,48],[31,43],[18,35]],[[91,49],[111,51],[130,41]]
 ];
 for(let i=0;i<branches.length;i++){
  limb(branches[i],i<5?7:4,'#201c31');limb(branches[i],i<5?4:2,'#69516d');
  limb(branches[i].map(([x,y])=>[x-1,y-1]),1,'#a17b99');
 }
 // A few old, exposed boughs frame the trunk below the living canopy.
 for(const branch of [
  [[67,77],[56,67],[47,68],[41,61]],
  [[77,76],[87,68],[97,65],[101,57]],
  [[55,66],[52,58],[46,54]]
 ]){limb(branch,4,'#211e32');limb(branch,2,'#80627c');}
 const crowns=[
  [23,33,16,11],[120,34,17,11],[43,23,19,12],[99,23,20,12],
  [69,15,19,11],[15,41,13,9],[132,42,10,9],
  [46,41,23,13],[93,43,22,13],[72,30,23,14],
  [31,32,17,12],[113,32,15,11],[64,44,15,12],[84,40,14,11]
 ];
 for(let c=0;c<crowns.length;c++){
  const [cx,cy,rx,ry]=crowns[c];
  // A scalloped, layered crown with deep gaps between the main boughs.
  for(let yy=-ry;yy<=ry;yy+=2)for(let xx=-rx;xx<=rx;xx+=2){
   const n=hash(xx+c*43,yy+c*13),edge=(xx*xx)/(rx*rx)+(yy*yy)/(ry*ry);
   if(edge>1+n*.16)continue;
   const shade=yy>ry*.25?'#493453':yy> -ry*.25?'#6f507d':'#9b70a6';
   box(edge>.84?'#302b47':shade,cx+xx,cy+yy,3,3);
   if(edge<.78&&n>.71)box(yy<0?'#c196ca':'#86658f',cx+xx,cy+yy,2,1);
   if(n<.1)box('#493a60',cx+xx,cy+yy,2,2);
  }
  for(let j=0;j<5;j++){
   const x=cx-rx*.7+hash(c,j+701)*rx*1.4,y=cy-ry*.65+hash(c,j+713)*ry*.8;
   box('#c6a0ce',x,y,3,1);box('#a17dab',x-1,y+1,2,1);
  }
 }
 // Bark grooves, tiny carved runes and a dormant crystal; no baked bloom.
 shape('#211f34',[[69,83],[72,85],[73,91],[70,94],[67,91],[67,87]]);
 limb([[68,84],[66,88],[67,93],[71,96]],1,'#aa829a');
 limb([[77,82],[79,88],[77,92],[79,98]],1,'#987389');
 limb([[76,59],[73,66],[76,73],[72,81]],1,'#ba91b1');
 limb([[67,72],[65,79],[68,85]],1,'#25213a');
 shape('#29253f',[[74,65],[79,72],[74,80],[69,73]]);
 shape('#9279a6',[[74,67],[77,72],[74,77],[71,73]]);
 box('#d3b7da',73,70,1,5);box('#d3b7da',72,72,4,1);
 for(const [x,y]of [[60,89],[82,88],[47,103],[94,104]]){box('#a88a9b',x,y,1,4);box('#a88a9b',x-1,y+1,3,1);}
 for(let i=0;i<13;i++){
  const x=30+hash(i,800)*84,y=101+hash(i,801)*10;
  if(x>57&&x<88)continue;
  box('#253950',x,y,2,4);box('#45617a',x+2,y-2,1,5);
 }
 return tile;
}
const ANCIENT_TREE=makeAncientTree();
const previousWorldSprite=PIXEL_WORLD.getSprite;
PIXEL_WORLD.getSprite=function(name){return name==='tree'?ANCIENT_TREE:previousWorldSprite(name);};
const previousTreeObject=drawObjectSprite;
drawObjectSprite=function(name,x,y,w,h){
 if(name!=='tree')return previousTreeObject(name,x,y,w,h);
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(ANCIENT_TREE,Math.round(x),Math.round(y),w,h);ctx.restore();return true;
};
// The grass moves with the world, while dressed paths and the boss dais stay stone.
const previousTerrainFill=terrainFill;
terrainFill=function(points,name='paving',scroll=0){
 if(state==='run'&&floor<6&&(name==='ruins'||name==='paving')){drawAbyssGrass(points,(p*.75)%144);return;}
 return previousTerrainFill(points,name,scroll);
};
CAMP_MOTION.bands.clear();refreshCampArt();
