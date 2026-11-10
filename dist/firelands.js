'use strict';
let fireVent=null,fireVentClock=7;
function resetFirelands(){fireVent=null;fireVentClock=7;}
function ignitePets(duration,dps){for(const entry of combatPets)if(entry.hp>0)entry.burning={remaining:Math.max(entry.burning?.remaining||0,duration),dps:Math.max(entry.burning?.dps||0,dps)};}
function updateFirelands(dt){
  for(const entry of combatPets)if(entry.hp>0&&entry.burning?.remaining>0){const duration=Math.min(dt,entry.burning.remaining);hurtPet(entry,duration*entry.burning.dps);entry.burning.remaining=Math.max(0,entry.burning.remaining-dt);}
  if(fireVent){fireVent.warning-=dt;if(fireVent.warning<=0){if(Math.abs(p-fireVent.p)<130){damageSquad(4+floor*.5,true);ignitePets(2,1.2);}effects.push({p:fireVent.p,off:0,life:.7,max:.7,r:165,skill:true,color:'#ffae42'});fireVent=null;}}
  else {fireVentClock-=dt;if(fireVentClock<=0){fireVent={p:p+85,warning:1.4};fireVentClock=Math.max(5.8,9-floor*.25);}}
}
function flame(x,y,size=1,phase=0){
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);
  const pulse=Math.sin(anim*8+phase)*5;
  glow(0,-15,48,'#fb6c2426');
  poly('#d44516',[[-18,3],[-22,-15],[-12,-8],[-6,-39-pulse],[2,-22],[12,-46+pulse],[15,-14],[23,-23],[21,6]]);
  poly('#ff9c2e',[[-13,4],[-9,-22],[-1,-13],[7,-32],[12,-8],[16,5]]);
  poly('#ffe29a',[[-5,5],[-2,-12],[3,-6],[7,-17],[10,5]]);ctx.restore();
}
function burntTree(x,y,size=1,burning=true){
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);ellipse('#100c0b',0,11,49,17);
  poly('#1a1612',[[-29,8],[-12,-29],[-15,-66],[-41,-95],[-35,-101],[-10,-82],[-5,-145],[4,-152],[11,-84],[35,-113],[43,-112],[30,-79],[15,-61],[12,-21],[36,10],[9,4],[0,-16],[-10,8]]);
  line('#504031',4,[[-21,3],[-6,-32],[-5,-91],[0,-132]]);line('#a2441e',2,[[7,-10],[4,-51],[23,-82],[27,-97]]);
  line('#332820',5,[[-8,-64],[-45,-70],[-55,-86]]);line('#30251c',4,[[10,-52],[43,-56],[54,-72]]);
  if(burning){flame(-19,-40,.6,x);flame(19,-86,.55,y);flame(1,-118,.45,x+y);}ctx.restore();
}
function drawFireSky(){
  rect('#100c09',0,0,W,H);
  const lava=ctx.createLinearGradient(0,0,W,H);lava.addColorStop(0,'#170e0a');lava.addColorStop(.4,'#471a0b');lava.addColorStop(.65,'#251008');lava.addColorStop(1,'#7a260b');ctx.fillStyle=lava;ctx.fillRect(0,0,W,H);
  for(let river=0;river<3;river++){
    const top=x=>H*(.18+river*.31)+Math.sin(x*.006+river*2)*55;
    const pts=[];for(let x=-30;x<=W+35;x+=35)pts.push([x,top(x)]);for(let x=W+35;x>=-30;x-=35)pts.push([x,top(x)+27+river*9]);
    poly('#8b2e0d',pts);line('#ed7523',4,pts.slice(0,Math.floor(pts.length/2)));line('#511b0a',8,pts.slice(Math.floor(pts.length/2)));
  }
  for(let i=0;i<8;i++){const y=hash(i,4)*H,x=hash(i,6)*W;glow(x,y,110+hash(i,8)*140,'#fb68151c');line('#5c250f',10,[[x-170,y-25],[x-73,y+13],[x,y-5],[x+150,y+70]]);line('#b84a13',2,[[x-170,y-25],[x-73,y+13],[x,y-5],[x+150,y+70]]);}
  for(let i=0;i<60;i++){const x=(hash(i,2)*W+Math.sin(anim*.4+i)*30+W)%W,y=(hash(i,3)*H-anim*(8+hash(i,7)*18)%H+H)%H;rect(i%4===0?'#ffbc5c':'#8c552f',x,y,i%3===0?3:2,3);}
}
function drawFireEnemy(e,x,y,stage=floor){
  if(e.type==='boss'&&stage===10){drawFireTreant(e,x,y);return;}
  ctx.save();ctx.translate(Math.round(x),Math.round(y));const scale=e.type==='boss'?3.1:e.type==='guard'?1.4:1.05;ctx.scale(scale,scale);
  ellipse('#110b07',0,18,22,8);glow(0,0,36,'#e65a1924');
  poly(e.hit?'#ffdb9a':'#231c17',[[-17,18],[-14,-10],[-3,-25],[10,-19],[18,-5],[19,18],[8,14],[0,23],[-8,15]]);
  poly(e.hit?'#ffe8ba':'#514232',[[-13,-9],[-3,-25],[10,-19],[14,-7],[2,-12]]);
  rect('#ff9e36',-8,-5,5,4);rect('#ff9e36',4,-5,5,4);line('#ce5c21',2,[[-3,-10],[1,-1],[-3,7],[2,15]]);
  if(e.type!=='shadow'){poly('#796044',[[-13,-7],[-25,-27],[-11,-18],[-2,-23]]);poly('#735739',[[9,-12],[23,-29],[21,-10],[16,1]]);poly('#3c3023',[[16,1],[30,9],[28,28],[15,31],[10,12]]);line('#f49437',2,[[19,7],[23,15],[18,22]]);}
  if(e.type==='boss'){flame(-14,-20,.5);flame(14,-28,.55,1);}ctx.restore();
  if(e.hp<e.max&&e.type!=='boss'){rect('#291710',x-18,y-34,36,3);rect('#d98a3a',x-18,y-34,36*Math.max(0,e.hp)/e.max,3);}
}
function drawFireTreant(e,x,y){
  ctx.save();ctx.translate(x,y);ellipse('#150b07',0,30,100,38);glow(0,-30,150,'#fb651b34');
  poly(e.hit?'#d9b38a':'#201812',[[-77,31],[-30,-15],[-35,-63],[-86,-110],[-71,-125],[-25,-89],[-16,-158],[4,-178],[23,-140],[28,-88],[71,-137],[91,-130],[74,-94],[39,-54],[41,5],[83,34],[32,23],[5,-13],[-18,27]]);
  line('#715138',8,[[-53,22],[-16,-19],[-17,-80],[-6,-146]]);line('#db6926',4,[[27,12],[10,-30],[17,-66],[45,-91],[57,-116]]);
  line('#35261b',13,[[-25,-64],[-82,-62],[-111,-94]]);line('#3e2d1f',11,[[28,-59],[88,-51],[113,-83]]);
  rect('#ffb23c',-19,-75,13,9);rect('#ffb23c',9,-75,13,9);poly('#ed6e20',[[-14,-51],[19,-51],[7,-32],[-9,-39]]);
  flame(-57,-94,1.1);flame(63,-106,1.15,2);flame(-6,-147,.9,3);flame(-82,-35,.7,4);flame(79,-20,.8,5);
  if(e.enraged){flame(0,-16,1.2,6);glow(0,-65,180,'#ffb13a20');}ctx.restore();
}
function drawFirelandsBattle(){
  // Islands of cooled basalt above moving lava, with a burnt forest along the route.
  const start=Math.floor((p-650)/52)*52,end=p+H/.75;
  for(let side of [-1,1])for(let i=0;i<5;i++){
    const v=Math.floor(p/450)*450+(i-1)*450,y=sy(v),x=W/2+side*Math.min(W*.35,420);
    if(y< -200||y>H+200)continue;
    poly('#1c1510',[[x-100,y-20],[x+78,y-36],[x+121,y+20],[x+40,y+70],[x-113,y+47]]);poly('#090807',[[x-113,y+47],[x-73,y+130],[x-20,y+61],[x+34,y+110],[x+121,y+20]]);
    line('#a34a1d',3,[[x-91,y+40],[x-37,y+30],[x+26,y+52],[x+88,y+15]]);
    burntTree(x-25,y+13,.85+(i%2)*.25);if(i%2)burntTree(x+60,y+9,.6);flame(x-83,y+22,.8,i);
  }
  for(let v=start+Math.ceil((end-start)/52)*52;v>=start;v-=52){
    const y=sy(v);if(y< -60||y>H+90)continue;const x=path(v),width=v>1750?490:315+(floor%3)*17;
    rect('#100d0a',x-width/2-12,y+16,width+24,39);
    for(let j=0;j<Math.ceil(width/45);j++){const bx=x-width/2+j*45,n=hash(v,j);poly(n>.6?'#3b3026':'#2a241e',[[bx,y+3],[bx+35,y],[bx+44,y+13],[bx+40,y+38],[bx+5,y+39],[bx-3,y+19]]);line('#67513a',2,[[bx+2,y+5],[bx+33,y+2],[bx+41,y+14]]);if(n>.52){line(n>.8?'#f4912c':'#96441c',2,[[bx+14,y+7],[bx+24,y+18],[bx+17,y+31]]);}}
    for(const side of [-1,1]){const edge=x+side*width/2;rect('#665039',edge-5,y,10,28);if(hash(v,side)>.55){glow(edge,y+16,38,'#f55c192c');line('#ffb747',2,[[edge,y+1],[edge+side*8,y+16],[edge,y+30]]);}}
  }
  for(let v=Math.floor((p-350)/280)*280;v<p+H/.75;v+=280){const y=sy(v);if(y> -100&&y<H+100){const x=path(v);burntTree(x-186,y,.52,v%560===0);flame(x+178,y+12,.65,v);}}
  const ay=sy(1930),ax=path(1930);if(ay> -220&&ay<H+200){
    glow(ax,ay,230,'#f1641d37');ellipse('#1d130c',ax,ay+8,223,90);ellipse('#76502d',ax,ay,218,84);ellipse('#2c1e13',ax,ay-6,202,76);
    for(let r of [100,150,180]){ctx.strokeStyle=r===150?'#e78b30':'#92532a';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(ax,ay-10,r,r*.36,0,0,Math.PI*2);ctx.stroke();}
    poly('#ce6824',[[ax,ay-43],[ax+44,ay-10],[ax,ay+24],[ax-44,ay-10]]);poly('#3e2313',[[ax,ay-34],[ax+31,ay-10],[ax,ay+14],[ax-31,ay-10]]);
    burntTree(ax-205,ay-15,1.15);burntTree(ax+205,ay-15,1.15);flame(ax-150,ay+30,1.3);flame(ax+150,ay+30,1.3,2);
  }
  if(fireVent){const y=sy(fireVent.p),x=path(fireVent.p);ellipse('#ff54142b',x,y,112,65);ctx.strokeStyle='#ffb845';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,112,65,0,0,Math.PI*2);ctx.stroke();for(let i=-1;i<=1;i++)flame(x+i*55,y+10,.45+(1.4-fireVent.warning)*.25,i);}
  drawBattleActors();
}
