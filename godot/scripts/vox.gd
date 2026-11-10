class_name Vox
extends RefCounted
# Native MagicaVoxel SIZE/XYZI/RGBA reader. Single-model sources, Z up -> Godot Y up.
static var meshes: Dictionary = {}
static func model(id: String, size: float = 0.15) -> MeshInstance3D:
 var node := MeshInstance3D.new()
 if not meshes.has(id):
  meshes[id] = read_mesh("res://assets/vox/"+id+".vox")
 node.mesh = meshes[id]
 node.scale = Vector3.ONE * size
 return node
static func read_mesh(path: String) -> ArrayMesh:
 var f := FileAccess.open(path,FileAccess.READ)
 if f == null or f.get_buffer(4).get_string_from_ascii() != "VOX ":
  push_error("Invalid VOX source: "+path)
  return ArrayMesh.new()
 f.get_32()
 var bounds := Vector3i(1,1,1)
 var cells: Dictionary = {}
 var palette: Array[Color] = []
 palette.resize(256)
 palette.fill(Color.WHITE)
 while f.get_position()+12 <= f.get_length():
  var chunk := f.get_buffer(4).get_string_from_ascii()
  var length := f.get_32()
  f.get_32()
  var end := f.get_position()+length
  if chunk == "SIZE":
   bounds = Vector3i(f.get_32(),f.get_32(),f.get_32())
  elif chunk == "XYZI":
   var count := f.get_32()
   for i in count:
    var pos := Vector3i(f.get_8(),f.get_8(),f.get_8())
    cells[pos] = f.get_8()
  elif chunk == "RGBA":
   for i in 256:
    palette[(i+1)%256] = Color8(f.get_8(),f.get_8(),f.get_8(),f.get_8())
  f.seek(end)
 var st := SurfaceTool.new()
 st.begin(Mesh.PRIMITIVE_TRIANGLES)
 var dirs := [Vector3i(1,0,0),Vector3i(-1,0,0),Vector3i(0,1,0),Vector3i(0,-1,0),Vector3i(0,0,1),Vector3i(0,0,-1)]
 var normals := [Vector3.RIGHT,Vector3.LEFT,Vector3.BACK,Vector3.FORWARD,Vector3.UP,Vector3.DOWN]
 var corners := [[[1,0,0],[1,0,1],[1,1,1],[1,1,0]],[[0,0,0],[0,1,0],[0,1,1],[0,0,1]],[[0,1,0],[1,1,0],[1,1,1],[0,1,1]],[[0,0,0],[0,0,1],[1,0,1],[1,0,0]],[[0,0,1],[0,1,1],[1,1,1],[1,0,1]],[[0,0,0],[1,0,0],[1,1,0],[0,1,0]]]
 for p: Vector3i in cells:
  for side in 6:
   if cells.has(p+dirs[side]):continue
   st.set_normal(normals[side])
   st.set_color(palette[cells[p]])
   for index in [0,2,1,0,3,2]:
    var c: Array = corners[side][index]
    st.add_vertex(Vector3(p.x+c[0]-bounds.x/2.0,p.z+c[2],p.y+c[1]-bounds.y/2.0))
 st.index()
 var material := StandardMaterial3D.new()
 material.vertex_color_use_as_albedo = true
 material.roughness = 0.9
 material.vertex_color_is_srgb = true
 material.cull_mode = BaseMaterial3D.CULL_BACK
 st.set_material(material)
 return st.commit()
