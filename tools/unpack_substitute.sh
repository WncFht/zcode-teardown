#!/usr/bin/env bash
# unpack_substitute.sh <version> <installer-path> — extract resources/ tree from
# non-deb substitutes (AppImage any-arch, win NSIS exe, mac zip/dmg) into
# extracted/<ver>/ + HOST.json + SOURCE.json + asar extract.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${1:?usage: unpack_substitute.sh <version> <installer>}"
PKG="$(cd "$(dirname "${2:?}")" && pwd)/$(basename "$2")"
OUT="$ROOT/extracted/$VER"
WORK="$ROOT/tmp/unpacksub-$VER"
emit() { python3 "$ROOT/tools/emit_status.py" lead "$VER" "$@"; }
[ -f "$PKG" ] || {
  emit unpack 0 '{}' "installer missing: $PKG"
  exit 1
}
rm -rf "$WORK"
mkdir -p "$WORK" "$OUT"

case "$PKG" in
*.AppImage) kind=appimage ;;
*.exe) kind=exe ;;
*.zip) kind=zip ;;
*.dmg) kind=dmg ;;
*)
  emit unpack 0 '{}' "unknown format: $PKG"
  exit 1
  ;;
esac

RES=""
HOSTBIN=""
if [ "$kind" = appimage ]; then
  (cd "$WORK" && 7z x -y "$PKG" 'resources/*' zcode >/dev/null)
  RES="$WORK/resources"
  HOSTBIN="$WORK/zcode"
elif [ "$kind" = exe ]; then
  (cd "$WORK" && 7z x -y "$PKG" '$PLUGINSDIR/app-64.7z' >/dev/null &&
    mkdir -p inner && cd inner && 7z x -y "$WORK/\$PLUGINSDIR/app-64.7z" 'resources/*' 'ZCode.exe' >/dev/null)
  RES="$WORK/inner/resources"
  HOSTBIN="$WORK/inner/ZCode.exe"
elif [ "$kind" = zip ]; then
  (cd "$WORK" && unzip -q "$PKG")
  APP="$(find "$WORK" -maxdepth 2 -name '*.app' -type d | head -1)"
  RES="$APP/Contents/Resources"
  HOSTBIN="$APP/Contents/MacOS/ZCode"
elif [ "$kind" = dmg ]; then
  (cd "$WORK" && 7z x -y "$PKG" >/dev/null)
  APP="$(find "$WORK" -name '*.app' -type d | head -1)"
  RES="$APP/Contents/Resources"
  HOSTBIN="$APP/Contents/MacOS/ZCode"
fi
[ -d "$RES" ] || {
  emit unpack 0 "{\"format\":\"$kind\"}" "resources dir not found"
  exit 1
}

# host fingerprint (foreign-arch/OS binaries: hash only, no --version run)
python3 - "$HOSTBIN" "$OUT/HOST.json" "$kind" <<'PY'
import hashlib, json, os, sys
binp, outp, kind = sys.argv[1], sys.argv[2], sys.argv[3]
host = {"binary": None, "control": {}, "format": kind}
if binp and os.path.isfile(binp):
    h = hashlib.sha256()
    with open(binp, 'rb') as fh:
        for c in iter(lambda: fh.read(1 << 20), b''):
            h.update(c)
    host["binary"] = {"name": os.path.basename(binp), "size": os.path.getsize(binp),
                      "sha256": h.hexdigest(), "version": "unavailable:foreign-arch"}
json.dump(host, open(outp, 'w'), indent=1)
PY

# SOURCE.json provenance
python3 - "$PKG" "$OUT/SOURCE.json" "$VER" "$kind" <<'PY'
import hashlib, json, os, sys
pkg, outp, ver, kind = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
h = hashlib.sha256()
with open(pkg, 'rb') as fh:
    for c in iter(lambda: fh.read(1 << 20), b''):
        h.update(c)
json.dump({"version": ver, "substitute_for": "linux-x64.deb", "format": kind,
           "installer": os.path.basename(pkg), "size": os.path.getsize(pkg),
           "sha256": h.hexdigest(),
           "note": "linux-x64.deb pulled from CDN (404); resources/ recovered from this artifact. "
                   "Platform-specific files (native .node, tools/ binaries, host binary) differ "
                   "from linux-x64; JS/asar/config payloads are platform-identical."},
          open(outp, 'w'), indent=1)
PY

cp -a "$RES/." "$OUT/"
if [ -f "$OUT/app.asar" ] && [ ! -e "$OUT/app" ]; then
  npx -y @electron/asar extract "$OUT/app.asar" "$OUT/app" || {
    emit asar 0 '{}' "asar extract failed"
    exit 1
  }
fi
files=$(find "$OUT" -type f | wc -l)
bytes=$(du -sb "$OUT" | cut -f1)
emit unpack 1 "{\"files\":$files,\"bytes\":$bytes,\"format\":\"$kind\"}"
rm -rf "$WORK"
