"""Validate the actual MagicaVoxel files consumed by Godot, without a third-party parser."""
import hashlib,json,struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'assets/vox/manifest.json').read_text())
assert len(manifest['models'])==21
for entry in manifest['models']:
 data=(root/'assets/vox'/entry['file']).read_bytes()
 assert hashlib.sha256(data).hexdigest()==entry['sha256'],entry['file']
 assert data[:8]==b'VOX '+struct.pack('<I',150)
 assert data[8:12]==b'MAIN'
 assert struct.unpack_from('<II',data,12)==(0,len(data)-20)
 offset=20;chunks={}
 while offset<len(data):
  name=data[offset:offset+4];length,children=struct.unpack_from('<II',data,offset+4)
  assert children==0
  chunks[name]=data[offset+12:offset+12+length];offset+=12+length
 assert offset==len(data)
 bounds=struct.unpack('<III',chunks[b'SIZE']);count=struct.unpack_from('<I',chunks[b'XYZI'])[0]
 cells=list(struct.iter_unpack('BBBB',chunks[b'XYZI'][4:]))
 assert count==len(cells)==entry['voxels'] and list(bounds)==entry['size']
 assert len(chunks[b'RGBA'])==1024
 assert len({p[:3] for p in cells})==count
 assert all(all(p[i]<bounds[i] for i in range(3)) and p[3]>0 for p in cells)
print('PASS: 21 VOX 150 sources, bounds, palette, unique occupancy and SHA-256 manifest')
balance=json.loads((root/'assets/balance.json').read_text())
assert set(balance['floors'])=={'2','3','4'} and balance['runSeconds']==45
assert set(balance['species'])=={'cat','wolf','bat'}
print('PASS: only floors 2–4 and all three original pet species')
