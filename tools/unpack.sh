#!/usr/bin/env bash
# unpack.sh <version> [lane] — .deb → extracted/<ver>/ (resources tree + HOST.json + asar extract)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${1:?usage: unpack.sh <version> [lane]}"
LANE="${2:-manual}"
DEB="$ROOT/installers/$VER.deb"
OUT="$ROOT/extracted/$VER"
WORK="$ROOT/tmp/unpack-$VER"
emit(){ python3 "$ROOT/tools/emit_status.py" "$LANE" "$VER" "$@"; }
[ -f "$DEB" ] || { emit unpack 0 '{}' "installer missing: $DEB"; exit 1; }
rm -rf "$WORK" "$OUT"; mkdir -p "$WORK" "$OUT"
(
  cd "$WORK"
  ar x "$DEB"
  ok=0
  for f in data.tar.*; do [ -e "$f" ] || continue; tar -xf "$f"; ok=1; done
  [ "$ok" = 1 ] || { echo "no data.tar.* in $DEB" >&2; exit 3; }
)
SRC="$WORK/opt/ZCode/resources"
if [ ! -d "$SRC" ]; then SRC="$(find "$WORK" -type d -name resources | head -1)"; fi
[ -d "$SRC" ] || { emit unpack 0 '{}' "resources dir not found under $WORK"; rm -rf "$WORK"; exit 1; }

# host fingerprint before cleanup (binary lives outside resources/, so capture here)
python3 - "$WORK" "$OUT/HOST.json" <<'PY'
import glob, hashlib, json, os, subprocess, sys, tarfile
work, outp = sys.argv[1], sys.argv[2]
top = os.path.join(work, "opt", "ZCode")
host = {"binary": None, "control": {}}
if os.path.isdir(top):
    best, bs = None, -1
    for f in os.listdir(top):
        p = os.path.join(top, f)
        if not (os.path.isfile(p) and os.access(p, os.X_OK)) or f.endswith('.so'):
            continue
        with open(p, 'rb') as fh:
            if fh.read(4) != b'\x7fELF':
                continue
        s = os.path.getsize(p)
        if s > bs:
            best, bs = p, s
    if best:
        h = hashlib.sha256()
        with open(best, 'rb') as fh:
            for c in iter(lambda: fh.read(1 << 20), b''):
                h.update(c)
        ver = None
        try:
            r = subprocess.run([best, '--no-sandbox', '--version'],
                               capture_output=True, text=True, timeout=20,
                               env={**os.environ, 'DISPLAY': ''})
            out_s = (r.stdout or '') + (r.stderr or '')
            ver = out_s.strip().splitlines()[0] if out_s.strip() else None
        except Exception as e:
            ver = f"unavailable:{e.__class__.__name__}"
        host["binary"] = {"name": os.path.basename(best), "size": bs,
                          "sha256": h.hexdigest(), "version": ver}
for ct in glob.glob(os.path.join(work, 'control.tar.*')):
    try:
        with tarfile.open(ct) as t:
            for m in t.getmembers():
                if os.path.basename(m.name) == 'control':
                    for line in t.extractfile(m).read().decode().splitlines():
                        if ':' in line:
                            k, v = line.split(':', 1)
                            host["control"][k.strip()] = v.strip()
    except Exception as e:
        host["control_error"] = str(e)
json.dump(host, open(outp, 'w'), indent=1)
PY

cp -a "$SRC/." "$OUT/"
if [ -f "$OUT/app.asar" ]; then
  if [ -e "$OUT/app" ]; then
    emit asar 0 '{}' "$OUT/app already exists, skipping asar extract"
  else
    if command -v asar >/dev/null 2>&1; then
      asar extract "$OUT/app.asar" "$OUT/app" || { emit asar 0 '{}' "asar extract failed"; rm -rf "$WORK"; exit 1; }
    else
      npx -y @electron/asar extract "$OUT/app.asar" "$OUT/app" || { emit asar 0 '{}' "npx asar extract failed"; rm -rf "$WORK"; exit 1; }
    fi
  fi
fi
files=$(find "$OUT" -type f | wc -l); bytes=$(du -sb "$OUT" | cut -f1)
emit unpack 1 "{\"files\":$files,\"bytes\":$bytes}"
rm -rf "$WORK"
