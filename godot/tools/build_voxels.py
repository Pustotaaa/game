"""Deterministic original models in MagicaVoxel VOX 150 format (Z up).
Run from any directory: python3 godot/tools/build_voxels.py.
No external assets. Files can be edited in MagicaVoxel and loaded by the game.
"""
from pathlib import Path
import struct, math, random, json, hashlib
OUT=Path(__file__).resolve().parents[1]/'assets'/'vox'
PALETTE=['#000000','#423b42','#765242','#ab7951','#d5a16b','#f0c68c','#c46048','#963f43','#e98555','#47625a','#65806a','#8fa474','#c0cc92','#234750','#397680','#75b8b9','#78858a','#a4aca1','#505d6b','#d8ddd0','#f8edcc','#9571ab','#614c83','#ceade6','#dda0c4','#f3be54','#fff0a7','#62c9cf','#baf9e1','#1d293a','#243850','#4a5477','#e67aa9','#eee9df']
def chunk(name,data): return name+struct.pack('<II',len(data),0)+data
class Model:
 def __init__(self,name): self.name=name;self.v={}
 def box(self,x,y,z,w,d,h,c):
  for a in range(int(x),int(x+w)):
   for b in range(int(y),int(y+d)):
    for e in range(int(z),int(z+h)):
     if c:self.v[a,b,e]=c
     else:self.v.pop((a,b,e),None)
  return self
 def ball(self,x,y,z,rx,ry,rz,c):
  for a in range(math.floor(x-rx),math.ceil(x+rx)+1):
   for b in range(math.floor(y-ry),math.ceil(y+ry)+1):
    for e in range(max(0,math.floor(z-rz)),math.ceil(z+rz)+1):
     if ((a-x)/rx)**2+((b-y)/ry)**2+((e-z)/rz)**2<=1:self.v[a,b,e]=c
  return self
 def save(self):
  lo=[min(p[i] for p in self.v) for i in range(3)];hi=[max(p[i] for p in self.v) for i in range(3)];size=[b-a+1 for a,b in zip(lo,hi)]
  assert max(size)<=256
  data=b''.join(bytes([p[0]-lo[0],p[1]-lo[1],p[2]-lo[2],c]) for p,c in sorted(self.v.items()))
  palette=b''.join(bytes.fromhex(c[1:])+b'\xff' for c in PALETTE[1:])+bytes((256-len(PALETTE)+1)*4)
  content=chunk(b'SIZE',struct.pack('<III',*size))+chunk(b'XYZI',struct.pack('<I',len(self.v))+data)+chunk(b'RGBA',palette)
  result=b'VOX '+struct.pack('<I',150)+b'MAIN'+struct.pack('<II',0,len(content))+content
  path=OUT/(self.name+'.vox');path.write_bytes(result)
  return dict(file=path.name,voxels=len(self.v),size=size,sha256=hashlib.sha256(result).hexdigest())
def create():
 models=[];rng=random.Random(472)
 def m(name):
  a=Model(name);models.append(a);return a
 a=m('tent');a.box(-22,-16,0,44,32,2,3)
 for x in range(-23,24):
  top=32-abs(x)*1.3
  if top<1:continue
  a.box(x,-17,int(top),1,35,2,6 if x%5 else 8)
  if x<-3 or x>3:a.box(x,-17,2,1,1,max(1,int(top)-2),7)
 a.box(-24,-18,0,1,1,5,5).box(23,-18,0,1,1,5,5).box(0,0,0,1,1,36,4)
 a=m('workshop');a.box(-23,-18,0,46,36,3,16).box(-21,-16,3,42,32,22,17).box(-18,-17,3,18,2,16,1)
 a.box(3,-18,3,14,3,13,29).box(5,-20,4,10,4,8,8).box(8,-21,5,5,3,6,26)
 for x in range(-26,27):a.box(x,-21,25+(26-abs(x))//2,1,42,2,18 if x%4 else 16)
 for x in [-21,21]:
  for y in [-16,16]:a.box(x,y,3,3,3,23,3)
 a.box(12,7,24,7,8,24,16).box(10,5,46,11,12,3,17).box(12,7,48,7,8,1,1)
 a=m('pine');a.box(-2,-2,0,5,5,33,3)
 for z in range(9,49):
  radius=max(1,int((49-z)*.32+(z%10)*.33));a.box(-radius,-radius,z,radius*2+1,radius*2+1,1,9+(z//4)%3)
 a=m('tree');a.box(-4,-4,0,8,8,21,3).box(-6,-3,0,14,6,3,3)
 a.box(-11,-2,18,21,5,4,4).box(-14,-2,18,4,5,13,3).box(10,-2,18,4,5,13,3)
 for i in range(19):a.ball(rng.randint(-19,19),rng.randint(-10,10),rng.randint(28,37),rng.randint(5,9),6,5,10+i%3)
 for z in range(13,24):
  r=max(0,4-abs(z-18));a.box(-r,-2,z,r*2+1,4,1,27 if z%2 else 28)
 a=m('bridge');a.box(-18,-7,0,37,15,2,3)
 for x in range(-18,19,3):a.box(x,-8,2,2,17,1,4)
 for y in [-9,9]:
  for x in [-18,0,18]:a.box(x,y,0,2,2,11,3)
  a.box(-18,y,9,38,2,2,5)
 a=m('eggs');a.box(-12,-7,0,25,15,3,3)
 for y in [-7,7]:a.box(-12,y,2,25,1,7,4)
 for x in [-12,12]:a.box(x,-7,2,1,15,7,4)
 for i,x in enumerate([-7,0,7]):a.ball(x,0,10,3,4,5,[20,24,15][i])
 a=m('hero');a.box(-4,-3,1,3,5,5,1).box(2,-3,1,3,5,5,1).box(-6,-4,6,13,9,13,22).box(-7,2,9,15,3,12,7).box(-4,-4,20,9,8,7,5)
 a.box(-10,-8,26,21,17,2,21)
 for z in range(28,43):
  r=max(1,(43-z)//3);a.box(-r+(z-28)//7,-r,z,r*2+1,r*2+1,1,21 if z%3 else 22)
 a.box(9,-3,2,1,1,28,4).ball(9,-3,30,2,2,3,27).box(-3,-5,23,1,1,2,1).box(3,-5,23,1,1,2,1)
 a=m('cat');a.box(-4,-5,3,9,12,7,19).box(-5,-8,8,11,8,7,33)
 for x in [-4,3]:a.box(x,-8,14,3,3,5,33).box(x,-8,16,2,1,2,24).box(x,-3,0,2,8,4,19)
 a.box(-3,-9,11,2,1,2,14).box(3,-9,11,2,1,2,14).box(5,5,6,2,6,3,19).box(5,9,8,2,2,5,33)
 a=m('wolf');a.box(-5,-9,5,11,17,10,18).box(-5,-12,12,11,9,8,17).box(-3,-16,12,7,5,4,19)
 for x in [-5,3]:a.box(x,-10,19,3,4,5,18).box(x,-6,0,3,14,6,18)
 a.box(-4,-13,16,2,1,2,25).box(3,-13,16,2,1,2,25).box(-2,7,8,5,9,4,18)
 a=m('bat');a.box(-3,-2,6,7,5,9,21).box(-3,-2,14,2,2,4,23).box(2,-2,14,2,2,4,23)
 for x in range(-16,17):
  if abs(x)>3:a.box(x,-1,5+abs(x)//4,1,3,9-abs(x)//3,22 if x%3 else 23)
 a.box(-2,-3,11,1,1,2,28).box(2,-3,11,1,1,2,28)
 for name in ['shadow','guard','boss2','boss3','boss4']:
  a=m(name);big=name.startswith('boss');c=18 if name=='guard' else 30
  a.box(-6,-5,2,13,11,16,c).box(-7,-6,16,15,12,10,c).box(-5,-5,0,4,8,4,1).box(2,-5,0,4,8,4,1)
  a.box(-5,-7,21,3,1,2,32).box(3,-7,21,3,1,2,32)
  for x in [-9,7]:a.box(x,-2,9,3,4,12,c)
  if name=='guard':a.box(8,-6,3,3,12,18,16).box(11,-3,5,1,6,14,22)
  if big:
   for x in [-9,7]:a.box(x,-2,26,3,5,10,16).box(x+(-3 if x<0 else 3),-2,31,4,5,5,17)
   a.box(-5,-7,10,11,2,3,22).box(-2,-9,15,5,2,5,27)
   if name=='boss4':a.box(-10,-5,7,21,11,8,16)
 a=m('lantern');a.box(-1,-1,0,2,2,27,3).box(-1,-1,26,9,2,2,3).box(6,-1,21,1,1,6,3).box(4,-3,14,6,6,2,3).box(4,-3,21,6,6,2,3).box(5,-2,16,4,4,5,26)
 a=m('crate');a.box(-5,-5,0,11,11,10,3)
 for z in [0,8]:a.box(-6,-6,z,13,13,2,4)
 for x in [-5,4]:a.box(x,-6,0,2,1,10,5)
 a=m('bench');a.box(-10,-3,4,21,7,3,4).box(-8,-2,0,3,5,4,3).box(6,-2,0,3,5,4,3)
 a=m('crystal')
 for z in range(14):
  r=max(0,4-abs(z-7)//2);a.box(-r,-r,z,2*r+1,2*r+1,1,27 if z%2 else 28)
 a=m('pillar');a.box(-6,-6,0,13,13,3,17).box(-4,-4,3,9,9,29,16).box(-6,-6,31,13,13,3,17)
 for z in range(6,30,7):a.box(-5,-5,z,11,11,1,18)
 a=m('rubble');a.box(-7,-4,0,9,8,4,16).box(2,-2,0,7,7,7,17).box(-3,-2,4,6,6,4,18)
 OUT.mkdir(parents=True,exist_ok=True)
 manifest=[a.save() for a in models]
 (OUT/'manifest.json').write_text(json.dumps({'format':'MagicaVoxel VOX 150','authoring':'original procedural models; editable in MagicaVoxel','seed':472,'models':manifest},indent=2))
 print(f'{len(models)} original .vox models, {sum(len(a.v) for a in models)} occupied voxels')
if __name__=='__main__': create()
