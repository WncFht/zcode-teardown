#!/usr/bin/env bash
# commit_version.sh <version> [lane] — commit extracted/<ver>/ tree into repo/ as tag v<ver>
# repo/ holds only .git (core.bare, no checkout on disk); each commit snapshots the
# extracted tree via --work-tree. bare suppresses phantom "deleted" status noise.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${1:?usage: commit_version.sh <version> [lane]}"
LANE="${2:-manual}"
SRC="$ROOT/extracted/$VER"
REPO="$ROOT/repo"
LOCK="$ROOT/tmp/commit.lock"
emit() { python3 "$ROOT/tools/emit_status.py" "$LANE" "$VER" "$@"; }
[ -d "$SRC" ] || {
  emit commit 0 '{}' "extracted tree missing: $SRC"
  exit 1
}
[ -f "$SRC/MANIFEST.json" ] || {
  emit commit 0 '{}' "MANIFEST.json missing in $SRC (run tree_manifest.py first)"
  exit 1
}
DATE="$(python3 -c "import json;vs=json.load(open('$ROOT/manifest/versions.json'));print(next(x['releaseDate'] for x in vs if x['version']=='$VER'))")"
mkdir -p "$ROOT/tmp" "$REPO"
exec 9>"$LOCK"
flock 9
[ -d "$REPO/.git" ] || git -C "$REPO" init -q
git -C "$REPO" config core.bare true
git -C "$REPO" config user.name >/dev/null 2>&1 || git -C "$REPO" config user.name "zcode-teardown"
git -C "$REPO" config user.email >/dev/null 2>&1 || git -C "$REPO" config user.email "teardown@localhost"
git -C "$REPO" --work-tree="$SRC" add -A -f
GIT_AUTHOR_DATE="$DATE" GIT_COMMITTER_DATE="$DATE" git -C "$REPO" --work-tree="$SRC" commit -q --allow-empty -m "v$VER"
git -C "$REPO" tag -f "v$VER" >/dev/null
flock -u 9
exec 9>&-
rm -f "$ROOT/installers/$VER.deb" "$ROOT/installers/$VER".*.ok "$ROOT/installers/$VER"-*
files=$(git -C "$REPO" ls-tree -r "v$VER" --name-only | wc -l)
emit commit 1 "{\"tag\":\"v$VER\",\"tree_files\":$files}"
