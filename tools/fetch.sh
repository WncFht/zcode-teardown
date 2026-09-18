#!/usr/bin/env bash
# fetch.sh <version> [lane] — download installer per manifest, verify size (+sha512 when present)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${1:?usage: fetch.sh <version> [lane]}"
LANE="${2:-manual}"
DEB="$ROOT/installers/$VER.deb"
mkdir -p "$ROOT/installers"
emit(){ python3 "$ROOT/tools/emit_status.py" "$LANE" "$VER" "$@"; }

META="$(python3 - "$ROOT/manifest/versions.json" "$VER" <<'PY'
import json,sys
vs=json.load(open(sys.argv[1]))
v=next((x for x in vs if x["version"]==sys.argv[2]),None)
if not v: sys.exit("version not in manifest")
print(v["url"]); print(v["size"]); print(v.get("sha512") or "-")
PY
)"
URL=$(sed -n '1p' <<<"$META"); SIZE=$(sed -n '2p' <<<"$META"); SHA_B64=$(sed -n '3p' <<<"$META")

avail=$(df --output=avail -BG "$ROOT" | tail -1 | tr -dc '0-9')
if [ "$avail" -lt 15 ]; then emit download 0 '{}' "disk gate: ${avail}G free"; exit 2; fi

if ! curl -fL --retry 3 --retry-delay 2 -C - -o "$DEB" "$URL"; then
  emit download 0 "{\"url\":\"$URL\"}" "curl failed"; exit 1
fi
actual=$(stat -c%s "$DEB")
if [ "$actual" != "$SIZE" ]; then
  emit verify 0 "{\"size\":$actual,\"expected_size\":$SIZE}" "size mismatch vs manifest"; exit 1
fi
if [ "$SHA_B64" != "-" ]; then
  want=$(python3 -c "import base64;print(base64.b64decode('$SHA_B64').hex())")
  got=$(sha512sum "$DEB" | cut -d' ' -f1)
  if [ "$got" != "$want" ]; then
    emit verify 0 "{\"got\":\"$got\",\"want\":\"$want\"}" "sha512 mismatch"; exit 1
  fi
  emit download 1 "{\"size\":$actual,\"sha512\":\"verified\"}"
else
  emit download 1 "{\"size\":$actual,\"sha512\":\"absent\"}"
fi
