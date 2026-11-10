class_name VoxelWorld
extends Node3D
var batches:Dictionary={}
var objects:Array=[]
var grid:AStarGrid2D
var rng=RandomNumberGenerator.new()
const HOLE=Vector3(11,0,7)
func block(pos:Vector3,size:Vector3,color:String):
 if not batches.has(color):batches[color]=[]
 batches[color].append(Transform3D(Basis.IDENTITY.scaled(size),pos))
func flush():
 for color in batches:
  var material=StandardMaterial3D.new();material.albedo_color=Color(color);material.roughness=0.9
  var cube=BoxMesh.new();cube.size=Vector3.ONE;cube.material=material
  var mm=MultiMesh.new();mm.transform_format=MultiMesh.TRANSFORM_3D;mm.mesh=cube;mm.instance_count=batches[color].size()
  for i in mm.instance_count:mm.set_instance_transform(i,batches[color][i])
  var node=MultiMeshInstance3D.new();node.multimesh=mm;add_child(node)
 batches.clear()
func prop(id:String,pos:Vector3,scale_value:float=0.15,turn:float=0.0)->Node3D:
 var model=Vox.model(id,scale_value);model.position=pos;model.rotation.y=turn;add_child(model);return model
func lamp(pos:Vector3):
 prop("lantern",pos,0.1)
 var light=OmniLight3D.new();light.position=pos+Vector3(0.6,1.8,0);light.light_color=Color("ffca83");light.light_energy=1.1;light.omni_range=5;add_child(light)
func label3d(text:String,pos:Vector3):
 var label=Label3D.new();label.text=text;label.position=pos;label.billboard=BaseMaterial3D.BILLBOARD_ENABLED;label.font_size=35;label.pixel_size=0.020;label.modulate=Color("f3dfb4");label.outline_size=9;add_child(label)
func building(id:String,asset:String,pos:Vector3,entrance:Vector3,caption:String,size:Vector3,scale_value:float=0.15):
 var node=prop(asset,pos,scale_value)
 objects.append({"id":id,"node":node,"pos":pos,"entrance":entrance,"radius":size.x*0.45})
 var area=Area3D.new();area.set_meta("building",id);area.position=pos+Vector3(0,size.y/2,0)
 var collision=CollisionShape3D.new();var box=BoxShape3D.new();box.size=size;collision.shape=box;area.add_child(collision);add_child(area)
 label3d(caption,pos+Vector3(0,0.6,size.z*.5+0.5))
func stream(z:float)->float:return -1.5+sin(z*.12)*2.3
func camp_walkable(x:float,z:float)->bool:
 if abs(x)>21 or abs(z)>17:return false
 if Vector2(x-HOLE.x,z-HOLE.z).length()<6.5:return false
 if abs(x-stream(z))<1.6 and abs(z)>1.3:return false
 for object in objects:
  if object.id=="portal":continue
  if Vector2(x-object.pos.x,z-object.pos.z).length()<object.radius:return false
 return true
func make_camp():
 rng.seed=472
 for x in range(-32,33):
  for z in range(-27,28):
   var d=Vector2(x-HOLE.x,z-HOLE.z).length()
   if d<5.8:continue
   if abs(x-stream(z))<1.25:
    block(Vector3(x,-.37,z),Vector3(1.02,.12,1.02),"428a96")
    if rng.randf()<.22:block(Vector3(x,-.29,z),Vector3(.5,.05,.13),"92c8c0")
   else:
    block(Vector3(x,-.6,z),Vector3(1,1.05,1),["617a53","6e865b","587551","668158"].pick_random())
    if d<7:block(Vector3(x,-.04,z),Vector3(.85,.32,.85),"809080")
    elif rng.randf()<.045:block(Vector3(x,.08,z),Vector3(.12,.22,.12),["bfd59c","d6bf8c","d29eb5"].pick_random())
 # An actual open shaft with stepped rock strata, not a decal.
 for depth in range(0,13):
  var radius=5.8-depth*.12
  for i in range(64):
   var a=i*TAU/64
   block(HOLE+Vector3(cos(a)*radius,-depth-.5,sin(a)*radius),Vector3(.72,1.05,.72),["66717c","566371","485269","3d4561","343950"][mini(4,depth/3)])
 for ring in range(4):
  var r=3.5-ring*.65
  for i in range(32):
   var a=i*TAU/32
   block(HOLE+Vector3(cos(a)*r,-10.3-ring*.4,sin(a)*r),Vector3(.27,.1,.27),"996bb9")
 block(HOLE+Vector3(0,-13,0),Vector3(9,.5,9),"161c30")
 building("pets","tent",Vector3(-12,0,-6),Vector3(-12,0,-1.5),"ОТРЯД",Vector3(7.5,5.5,5.7),.16)
 building("eggs","eggs",Vector3(-17,0,2),Vector3(-17,0,4),"ЯЙЦА",Vector3(3,2.5,2.5),.13)
 building("workshop","workshop",Vector3(10,0,-10),Vector3(10,0,-5.5),"МАСТЕРСКАЯ",Vector3(8,8,6.5),.16)
 building("tree","tree",Vector3(0,0,-15),Vector3(4,0,-13),"ДЕРЕВО НАВЫКОВ",Vector3(5.5,8,5),.19)
 objects.append({"id":"portal","pos":HOLE,"entrance":Vector3(4,0,7),"radius":6.5})
 var area=Area3D.new();area.set_meta("building","portal");area.position=HOLE
 var col=CollisionShape3D.new();var sphere=SphereShape3D.new();sphere.radius=5.8;col.shape=sphere;area.add_child(col);add_child(area)
 label3d("СПУСК В БЕЗДНУ",Vector3(11,1,13))
 prop("bridge",Vector3(stream(0),0,0),.12)
 prop("bench",Vector3(-11,0,6),.15,PI*.2);prop("bench",Vector3(-5,0,4),.15,PI*.5)
 for i in 10:
  var a=i*TAU/10;block(Vector3(-8+cos(a)*.8,.15,4+sin(a)*.8),Vector3(.4,.3,.4),"9c9c88")
 for i in 8:
  block(Vector3(-8+rng.randf_range(-.3,.3),.3+i*.1,4+rng.randf_range(-.2,.2)),Vector3(.25,.35,.25),"ffbc67" if i%2 else "ffe4a1")
 var fire=OmniLight3D.new();fire.position=Vector3(-8,1.5,4);fire.light_color=Color("ffb15f");fire.light_energy=1.5;fire.omni_range=7;add_child(fire)
 for i in 65:
  var pos=Vector3(rng.randf_range(-23,23),0,rng.randf_range(-19,19))
  if abs(pos.x)<19 and pos.z> -16:continue
  prop("pine",pos,rng.randf_range(.13,.2),rng.randf()*TAU)
 for pos in [Vector3(-17,0,-7),Vector3(-15,0,8),Vector3(7,0,-6),Vector3(4,0,9)]:lamp(pos)
 for i in 15:
  var pos=Vector3(rng.randf_range(-20,20),0,rng.randf_range(-17,17))
  if camp_walkable(pos.x,pos.z):prop("rubble",pos,.07)
 for pos in [Vector3(-15,0,-4),Vector3(-9,0,-4),Vector3(13,0,-7)]:prop("crate",pos,.14)
 # Navigation uses the same bank, building and shaft footprint rules as keyboard movement.
 grid=AStarGrid2D.new();grid.region=Rect2i(-22,-18,45,37);grid.cell_size=Vector2.ONE;grid.diagonal_mode=AStarGrid2D.DIAGONAL_MODE_NEVER;grid.update()
 for x in range(-22,23):
  for z in range(-18,19):grid.set_point_solid(Vector2i(x,z),not camp_walkable(x,z))
 flush()
func route(from:Vector3,to:Vector3)->PackedVector3Array:
 var first=Vector2i(roundi(from.x),roundi(from.z));var end=Vector2i(roundi(to.x),roundi(to.z))
 if not grid.is_in_boundsv(first) or not grid.is_in_boundsv(end) or grid.is_point_solid(end):return PackedVector3Array()
 var points=grid.get_id_path(first,end);var result=PackedVector3Array()
 for point in points:result.append(Vector3(point.x,0,point.y))
 return result
static func path(p:float,stage:int)->Vector3:
 return Vector3(sin(p/390.0+stage)*[0,0,.95,2.02,2.66][clampi(stage,2,4)],0,-p*.028)
func make_floor(stage:int):
 rng.seed=stage*472
 for z in range(-61,14):
  var x=path(-z/.028,stage).x
  for w in range(-5,6):
   block(Vector3(round(x)+w,-.7,z),Vector3(1,1.3,1),["536359","607161","6f7c68"].pick_random())
   if abs(w)<2:block(Vector3(round(x)+w,-.015,z),Vector3(.94,.12,.94),["899489","97a18c","7d8d84"].pick_random())
   if abs(w)==5:block(Vector3(round(x)+w,-1.8,z),Vector3(1,2,1),"4e5b63")
  if z%7==0:
   for side in [-1,1]:
    prop("pillar",Vector3(x+side*4.6,0,z),.1)
    if z%14==0:prop("crystal",Vector3(x+side*3.5,0,z),.08)
  if z%5==0:
   prop("rubble",Vector3(x+4,0,z),.1)
 for x in range(-8,9):
  for z in range(-58,-50):block(Vector3(x,-.4,z),Vector3(1,.7,1),"73817a")
 for x in [-7,7]:prop("pillar",Vector3(x,0,-54),.2)
 flush()
