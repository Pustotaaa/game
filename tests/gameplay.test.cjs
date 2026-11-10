'use strict';
// Run with: node --test tests/gameplay.test.cjs
// Tests game logic and drawing calls with a DOM/canvas stub; this is not a visual browser test.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..','dist');
const mockSource="\nconst mock={elements:new Map(),events:{},raf:[],images:[],paint:0,canvasCount:0,contexts:[]};\nfunction brush(){\n const state={measureText:s=>({width:String(s).length*7}),createPattern:()=>({pattern:true}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(Math.max(0,w*h*4))})};\n const noop=()=>{mock.paint++;};\n const c=new Proxy(state,{get(o,k){return k in o?o[k]:noop;},set(o,k,v){o[k]=v;return true;}});mock.contexts.push(c);return c;\n}\nfunction element(id='',tag='DIV'){\n let html='';\n const e={id,tagName:tag,hidden:false,disabled:false,isConnected:true,dataset:{},children:[],style:{setProperty(){}},classList:{toggle(){},add(){},remove(){},contains(){return false;}},getContext(){return this._ctx||(this._ctx=brush());},getBoundingClientRect(){return {left:0,top:0,width:1400,height:850};},setAttribute(){},getAttribute(){return '';},addEventListener(type,fn){(this.events||(this.events={}))[type]=fn;},removeEventListener(){},appendChild(v){this.children.push(v);},remove(){this.isConnected=false;},focus(){document.activeElement=this;},setPointerCapture(){},releasePointerCapture(){},querySelector(selector){if(selector[0]==='#')return mock.elements.get(selector.slice(1))||null;return this.children.find(x=>x.tagName==='BUTTON')||null;},querySelectorAll(selector){if(selector.includes('[data-skill]'))return this.children.filter(x=>x.dataset.skill!==undefined);return [];}};\n Object.defineProperty(e,'innerHTML',{get:()=>html,set(value){html=value;this.children=[];const re=/<([a-z][a-z0-9]*)\\b([^>]*?)>/gi;let match;while((match=re.exec(value))){const attrs=match[2],idmatch=/\\bid=\"([^\"]*)\"/.exec(attrs);if(!idmatch)continue;const child=element(idmatch[1],match[1].toUpperCase());const skill=/\\bdata-skill=\"([^\"]*)\"/.exec(attrs);if(skill)child.dataset.skill=skill[1];mock.elements.set(child.id,child);this.children.push(child);}}});\n return e;\n}\nconst document={readyState:'loading',activeElement:element('body','BODY'),body:element('body','BODY'),documentElement:element('html','HTML'),hidden:false,getElementById:id=>mock.elements.get(id)||null,createElement(tag){mock.canvasCount+=tag==='canvas'?1:0;return element('',tag.toUpperCase());},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(type,fn){(mock.events[type]||(mock.events[type]=[])).push(fn);},elementFromPoint(){return null;}};\nconst window={innerWidth:1400,innerHeight:850,devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};\nconst localStorage={getItem:()=>null,setItem(){}};\nconst matchMedia=()=>({matches:false});\nconst requestAnimationFrame=fn=>mock.raf.push(fn);\nclass Image{constructor(){this.width=1254;this.height=1254;this.complete=false;this.naturalWidth=0;mock.images.push(this);}set src(v){this._src=v;}get src(){return this._src;}}\nconst performance={now:()=>0};\n";
function boot(){
 const context=vm.createContext({});
 vm.runInContext(mockSource,context);
 const html=readFileSync(join(root,'index.html'),'utf8');
 for(const match of html.matchAll(/\bid="([^"]+)"/g))vm.runInContext('mock.elements.set('+JSON.stringify(match[1])+',element('+JSON.stringify(match[1])+'));',context);
 for(const name of ["progression.js","balance.js","camp.js","firelands.js","systems.js","workshop.js","object-art.js","terrain-art.js","actor-art.js","game.js","pixel-world.js","camp-life.js","camp-motion.js","pet-combat.js","abyss-nature.js"]){
  new vm.Script(readFileSync(join(root,name),'utf8'),{filename:name}).runInContext(context);
  assert.equal(vm.runInContext('mock.raf.length',context),0,'Animation started before all scripts loaded: '+name);
 }
 return {run:code=>vm.runInContext(code,context)};
}

test('startup waits for all scripts; camp and late image callbacks render',()=>{
 const game=boot();
 assert.equal(game.run('mock.raf.length'),0);
 game.run('mock.events.DOMContentLoaded.forEach(fn=>fn());mock.events.DOMContentLoaded.forEach(fn=>fn());');
 assert.equal(game.run('mock.raf.length'),1);
 game.run('mock.raf.shift()(0)');
 assert.equal(game.run('mock.raf.length'),1);
 assert.equal(game.run('CAMP_MOTION.foundation.length'),7);
 assert.equal(game.run('CAMP_MOTION.plants.length'),14);
 assert.equal(game.run('ANCIENT_TREE.width'),144);
 game.run('mock.images.forEach(image=>image.onload?.());draw();');
});
for(const species of ['cat','wolf'])test(species+' approaches on a curve and strikes once during its jump',()=>{
 const game=boot();
 game.run("start(2);combatPets=[createCombatPet({id:'test',species:"+JSON.stringify(species)+",rarity:'common',level:1})];resetPetCombat();enemies=[{p:220,off:110,hp:1000,max:1000,type:'shadow',armor:0,dps:1,hit:0,frozen:0}];boss=null;");
 const result=game.run(`(()=>{
  const entry=combatPets[0],target=enemies[0],m=petMotion(entry),positions=[];
  updatePetCombat(.05);
  const farMiss=target.hp===1000&&!m.action;
  let frames=0;while(!m.action&&frames++<80){positions.push([m.x,m.p]);updatePetCombat(.05);}
  const inRange=Boolean(m.action)&&petDistance(m,target)<=petRange(entry.member)+enemyRadius(target)+1;
  const windup=target.hp===1000;
  updatePetCombat(.05);const beforeContact=target.hp===1000;
  updatePetCombat(.12);const once=target.hp===1000-petDamage(entry.member),jump=m.hop>0;
  updatePetCombat(.2);const noDuplicate=target.hp===1000-petDamage(entry.member)&&!m.action;
  let curved=false;
  for(let i=2;i<positions.length;i++){const a=positions[i-2],b=positions[i-1],c=positions[i];if(Math.abs((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))>.05)curved=true;}
  return {farMiss,inRange,windup,beforeContact,once,jump,noDuplicate,curved};
 })()`);
 for(const [name,passed]of Object.entries(result))assert.equal(passed,true,name);
});
test('ranged attacks travel, require range and cannot strike after their owner falls',()=>{
 const game=boot();
 game.run("start(2);combatPets=[createCombatPet({id:'bat-test',species:'bat',rarity:'common',level:1})];resetPetCombat();enemies=[{p:220,off:0,hp:1000,max:1000,type:'shadow',armor:0,dps:1,frozen:0}];boss=null;updatePetCombat(.05);");
 assert.equal(game.run('petShots.length'),1);
 assert.equal(game.run('enemies[0].hp'),1000);
 game.run('for(let i=0;i<12;i++)updatePetCombat(.05);');
 assert.equal(game.run('enemies[0].hp'),991);
 assert.equal(game.run('petShots.length'),0);
 game.run('combatPets[0].attack=0;updatePetCombat(.05);combatPets[0].hp=0;for(let i=0;i<12;i++)updatePetCombat(.05);');
 assert.equal(game.run('enemies[0].hp'),991);
 game.run("combatPets[0].hp=44;combatPets[0].attack=0;combatPets[0].motion.x=path(enemies[0].p)+700;combatPets[0].motion.p=enemies[0].p;updatePetCombat(.05);");
 assert.equal(game.run('petShots.length'),0);
 assert.equal(game.run('enemies[0].hp'),991);
});
test('enemy melee needs contact; death uses real position; camp and pause reset correctly',()=>{
 const game=boot();
 const result=game.run(`(()=>{
  start(2);enemies=[{p:220,off:0,hp:1000,max:1000,type:'shadow',armor:0,dps:1,frozen:0}];boss=null;
  const entry=combatPets[0],m=petMotion(entry);m.x=path(220)+700;m.p=220;
  const before=entry.hp;damagePetContacts(.1);const farMiss=entry.hp===before;
  m.x=path(220);m.p=175;damagePetContacts(.1);const contact=entry.hp<before;
  entry.hp=1;hurtPet(entry,10);const death=entry.fallenAt===m.p&&Math.abs(path(m.p)+entry.fallenOff-m.x)<.001;
  camp();const reset=petShots.length===0&&petVitals.size===0;
  start(2);const pm=petMotion(combatPets[0]),snapshot=[pm.x,pm.p,t];paused=true;update(.05);
  const pause=pm.x===snapshot[0]&&pm.p===snapshot[1]&&t===snapshot[2];
  paused=false;for(const n of [2,3,4,5,6,10]){floor=n;draw();}
  return {farMiss,contact,death,reset,pause};
 })()`);
 for(const [name,passed]of Object.entries(result))assert.equal(passed,true,name);
});
