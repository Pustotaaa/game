#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
godot_bin="${GODOT_BIN:-godot}"
version="$("$godot_bin" --version | head -1)"
python3 - "$version" <<'PY'
import re,sys
parts=tuple(map(int,re.match(r'(\d+)\.(\d+)\.(\d+)',sys.argv[1]).groups()))
assert parts>=(4,7,2), 'Godot 4.7.2 or newer is required'
PY
mkdir -p "$project_dir/builds/windows"
"$godot_bin" --headless --editor --path "$project_dir" --import --quit
python3 "$project_dir/tests/validate_assets.py"
"$godot_bin" --headless --path "$project_dir" --export-release 'Windows Desktop' "$project_dir/builds/windows/AbyssVoxel.exe"
cp "$project_dir/PLAY-WINDOWS.txt" "$project_dir/GODOT-LICENSE.txt" "$project_dir/GODOT-COPYRIGHT.txt" "$project_dir/builds/windows/"
python3 - "$project_dir" <<'PY'
import pathlib,zipfile,hashlib,sys,json
root=pathlib.Path(sys.argv[1]);folder=root/'builds/windows'
exe=(folder/'AbyssVoxel.exe').read_bytes()
assert exe[:2]==b'MZ' and (folder/'AbyssVoxel.pck').stat().st_size>10000
manifest={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir() if p.is_file()}
(folder/'SHA256.json').write_text(json.dumps(manifest,indent=2))
with zipfile.ZipFile(root/'builds/AbyssVoxel-Windows-x64.zip','w',zipfile.ZIP_DEFLATED,9) as archive:
 for p in sorted(folder.iterdir()):
  if p.is_file():archive.write(p,'AbyssVoxel/'+p.name)
print(root/'builds/AbyssVoxel-Windows-x64.zip')
PY
