'use strict';
const CAMP_OBJECT_SCALE=.9;
let hoveredCampObject = null;
function campObjectAnchor(id){const s=campPoints();return {'meta-tree':s.tree,pets:s.tent,workshop:s.forge,'egg-machine':{x:s.tent.x-94,y:s.tent.y+93},portal:s.portal}[id];}
function drawCampObject(id,draw){const a=campObjectAnchor(id);ctx.save();ctx.translate(a.x,a.y);ctx.scale(CAMP_OBJECT_SCALE,CAMP_OBJECT_SCALE);ctx.translate(-a.x,-a.y);draw();ctx.restore();}
function campAreas() {
  const s=campPoints();
  return [
    {id:'meta-tree',label:'Дерево бездны',x:s.tree.x-207,y:s.tree.y-278,w:414,h:324,shape:[[0,.16],[.2,0],[.79,0],[1,.18],[.89,.48],[.68,.63],[.66,1],[.33,1],[.34,.64],[.11,.48]]},
    {id:'pets',label:'Отряд',x:s.tent.x-118,y:s.tent.y-150,w:236,h:187,shape:[[0,.47],[.44,0],[1,.47],[.9,.53],[.9,1],[.1,1],[.1,.53]]},
    {id:'workshop',label:'Мастерская',x:s.forge.x-125,y:s.forge.y-154,w:250,h:205,shape:[[0,.39],[.32,.03],[.60,.16],[.60,0],[.79,0],[.79,.26],[1,.39],[1,.98],[.06,.98],[.06,.49]]},
    {id:'egg-machine',label:'Автомат яиц',x:s.tent.x-150,y:s.tent.y-46,w:112,h:174,shape:[[.2,0],[.8,0],[.98,.32],[.85,.6],[.85,.93],[1,1],[0,1],[.15,.93],[.15,.6],[.02,.32]]},
    {id:'portal',label:'Портал в бездну',x:s.portal.x-115,y:s.portal.y-150,w:230,h:223,shape:[[.08,1],[.08,.55],[.15,.22],[.3,.08],[.5,0],[.7,.08],[.85,.22],[.92,.55],[.92,1]]}
  ].map(area=>{const a=campObjectAnchor(area.id);return {...area,x:a.x+(area.x-a.x)*CAMP_OBJECT_SCALE,y:a.y+(area.y-a.y)*CAMP_OBJECT_SCALE,w:area.w*CAMP_OBJECT_SCALE,h:area.h*CAMP_OBJECT_SCALE};});
}
function campAreaPoints(area) {return area.shape.map(([x,y])=>[area.x+x*area.w,area.y+y*area.h]);}
function getCampTarget(x,y) {
  return campAreas().reverse().find(area=>pointInPolygon(x,y,campAreaPoints(area)))||null;
}
function positionCampObjects() {
  for(const area of campAreas()){
    const button=$(area.id);
    button.style.left=area.x*unit+'px';button.style.top=area.y*unit+'px';button.style.width=area.w*unit+'px';button.style.height=area.h*unit+'px';
    button.style.clipPath='polygon('+area.shape.map(([x,y])=>`${x*100}% ${y*100}%`).join(',')+')';
  }
}
function activateCampObject(id) {
  if(state!=='camp'||panel)return;
  const actions={'meta-tree':showTree,pets:showPets,workshop:showWorkshop,'egg-machine':showEggMachine,portal:showFloors};
  actions[id]?.();
}
function bindCampObjects() {
  for(const area of campAreas()){
    const button=$(area.id);
    button.onclick=()=>activateCampObject(area.id);
    button.addEventListener('pointerenter',()=>{if(state==='camp'&&!panel)hoveredCampObject=area.id;});
    button.addEventListener('pointerleave',()=>{if(document.activeElement!==button)hoveredCampObject=null;});
    button.addEventListener('focus',()=>hoveredCampObject=area.id);
    button.addEventListener('blur',()=>{if(hoveredCampObject===area.id)hoveredCampObject=null;});
  }
}
function campLettering(text,x,y,width,color='#cfb8a4',size=13) {
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  let font=Math.max(size,10.5/unit);ctx.font=font+'px Georgia';
  while(ctx.measureText(text).width>width&&font>10){font-=.5;ctx.font=font+'px Georgia';}
  ctx.fillStyle='#170d23';ctx.fillText(text,x+1,y+1);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
function campInscriptions() {
  if(TERRAIN_ART.ready){drawDetailedCampSigns();return;}
  const s=campPoints();
  // Stitched lettering on the tent's awning.
  drawCampObject('pets',()=>{
  line('#ad6b8b',1,[[s.tent.x-58,s.tent.y-93],[s.tent.x+36,s.tent.y-93]]);
  campLettering('ОТРЯД',s.tent.x-12,s.tent.y-82,95,'#d7a9b5');
  });
  // An old wooden sign hanging on the workshop front.
  drawCampObject('workshop',()=>{
  const x=s.forge.x-18,y=s.forge.y+26;
  line('#a28070',2,[[x-54,y-20],[x-54,y-8]]);line('#a28070',2,[[x+54,y-20],[x+54,y-8]]);
  poly('#33202c',[[x-79,y-10],[x+76,y-12],[x+79,y+14],[x-76,y+12]]);
  line('#815747',2,[[x-75,y-7],[x+72,y-9]]);line('#513246',1,[[x-67,y+8],[x+59,y+7]]);
  rect('#b18a69',x-69,y-5,3,3);rect('#b18a69',x+66,y-5,3,3);
  campLettering('МАСТЕРСКАЯ',x,y+1,132,'#d4b295');
  });
  // Letters cut into the machine's front plate.
  drawCampObject('egg-machine',()=>{
  const ex=s.tent.x-94,ey=s.tent.y+93;
  rect('#291b37',ex-33,ey-22,66,26);rect('#9f718d',ex-33,ey-22,66,2);
  campLettering('ЯЙЦА',ex,ey-8,58,'#d4a9df',12);
  });
  // Inscriptions carved into the tree plinth and portal lintel.
  drawCampObject('meta-tree',()=>campLettering('ДЕРЕВО',s.tree.x,s.tree.y+21,130,'#b9a2c6',15));
}
function drawCampHover() {
  if(!hoveredCampObject||panel)return;
  const area=campAreas().find(a=>a.id===hoveredCampObject);if(!area)return;
  ctx.save();glow(area.x+area.w/2,area.y+area.h*.6,area.w*.62,'#c890eb17');
  ctx.globalAlpha=.65;line('#d5a5ef',1.7,[...campAreaPoints(area),campAreaPoints(area)[0]]);ctx.restore();
}
