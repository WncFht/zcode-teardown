#!/usr/bin/env python3
"""Diff two signature snapshots -> diffs/<a>__<b>.md.

usage:
  diff_signatures.py <a> <b>         # write diffs/<a>__<b>.md
  diff_signatures.py --all           # all adjacent pairs (version-sorted signatures/)
  diff_signatures.py <a> <b> --print # to stdout

Header records per-side provenance (SOURCE.json substitute format or
MANIFEST host.format) so format-artifact deltas (apparmor-profile absent in
AppImage, arch-native module hashes) are read in context.
"""

import json
import os
import re
import sys
from contextlib import suppress

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIST_CATS = [
    "models",
    "endpoints",
    "feature_flags",
    "env_vars",
    "plans",
    "acp_methods",
    "ipc_channels",
    "plugins_skills",
    "bundled_tools",
    "native_modules",
]
OBJ_CATS = ["engine", "deps"]
# entries whose presence/absence is packaging, not product
FORMAT_ARTIFACT = re.compile(r"apparmor|\.AppImage$|nsis|\.dmg$", re.IGNORECASE)


def load(ver):
    p = os.path.join(ROOT, "signatures", f"{ver}.json")
    with open(p) as f:
        return json.load(f)


def side_info(ver):
    """provenance for one side: (format, substitute_note or None)."""
    src = os.path.join(ROOT, "extracted", ver, "SOURCE.json")
    if os.path.isfile(src):
        with open(src) as f:
            d = json.load(f)
        fmt = d.get("format", "?")
        return fmt, f"substitute `{fmt}` for pulled linux-x64.deb"
    mf = os.path.join(ROOT, "extracted", ver, "MANIFEST.json")
    fmt = "deb"
    if os.path.isfile(mf):
        with suppress(Exception), open(mf) as f:
            fmt = json.load(f).get("host", {}).get("format") or "deb"
    note = None
    if fmt not in ("deb", None):
        note = f"non-deb source `{fmt}` (linux-x64.deb pulled from CDN)"
    return fmt, note


def fmt_delta(items):
    out = []
    for it in items:
        tag = " *(format artifact)*" if FORMAT_ARTIFACT.search(it) else ""
        out.append(f"- `{it}`{tag}")
    return out


def flat_obj(obj, prefix=""):
    """flatten nested dict to dotted-key -> scalar for change listing."""
    out = {}
    for k, v in sorted(obj.items()):
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            out.update(flat_obj(v, key + "."))
        else:
            out[key] = v
    return out


def diff_pair(a, b):
    sa, sb = load(a), load(b)
    ca, cb = sa["categories"], sb["categories"]
    fa, note_a = side_info(a)
    fb, note_b = side_info(b)

    lines = [f"# Signature diff {a} -> {b}", ""]
    lines.append(f"- engine: `{sa.get('engine')}` -> `{sb.get('engine')}`")
    lines.append(f"- source format: `{fa}` -> `{fb}`")
    lines.extend(f"- WARNING: {n}" for n in (note_a, note_b) if n)
    lines += ["", "## counts", ""]
    lines.append("| category | " + a + " | " + b + " | Δ |")
    lines.append("|---|---|---|---|")
    keys = sorted(set(sa.get("counts", {})) | set(sb.get("counts", {})))
    for k in keys:
        xa, xb = sa["counts"].get(k, 0), sb["counts"].get(k, 0)
        lines.append(f"| {k} | {xa} | {xb} | {xb - xa:+d} |")
    lines.append("")

    for cat in LIST_CATS:
        set_a, set_b = set(ca.get(cat, [])), set(cb.get(cat, []))
        add, rem = sorted(set_b - set_a), sorted(set_a - set_b)
        lines += [f"## {cat} (+{len(add)} / -{len(rem)})", ""]
        if not add and not rem:
            lines += ["_(no change)_", ""]
            continue
        if add:
            lines.append(f"### added ({len(add)})")
            lines.extend(fmt_delta(add))
            lines.append("")
        if rem:
            lines.append(f"### removed ({len(rem)})")
            lines.extend(fmt_delta(rem))
            lines.append("")

    for cat in OBJ_CATS:
        flat_a = flat_obj(ca.get(cat, {}) if isinstance(ca.get(cat), dict) else {})
        flat_b = flat_obj(cb.get(cat, {}) if isinstance(cb.get(cat), dict) else {})
        add = sorted(set(flat_b) - set(flat_a))
        rem = sorted(set(flat_a) - set(flat_b))
        chg = sorted(k for k in set(flat_a) & set(flat_b) if flat_a[k] != flat_b[k])
        lines += [f"## {cat} (+{len(add)} / -{len(rem)} / ~{len(chg)})", ""]
        if not (add or rem or chg):
            lines += ["_(no change)_", ""]
            continue
        lines.extend(f"- + `{k}` = `{flat_b[k]}`" for k in add)
        lines.extend(f"- - `{k}` (was `{flat_a[k]}`)" for k in rem)
        lines.extend(f"- ~ `{k}`: `{flat_a[k]}` -> `{flat_b[k]}`" for k in chg)
        lines.append("")

    return "\n".join(lines)


def ver_key(v):
    return tuple(int(x) for x in v.split("."))


def main():
    args = [x for x in sys.argv[1:] if x != "--print"]
    to_stdout = "--print" in sys.argv[1:]
    os.makedirs(os.path.join(ROOT, "diffs"), exist_ok=True)

    if args and args[0] == "--all":
        with open(os.path.join(ROOT, "manifest", "versions.json")) as f:
            manifest = json.load(f)
        order = [
            v["version"] for v in sorted(manifest, key=lambda x: ver_key(x["version"]))
        ]
        have = {
            f[:-5]
            for f in os.listdir(os.path.join(ROOT, "signatures"))
            if f.endswith(".json")
        }
        adjacent = list(zip(order, order[1:]))
        pairs = [(a, b) for a, b in adjacent if a in have and b in have]
        skipped = [(a, b) for a, b in adjacent if not (a in have and b in have)]
        for a, b in skipped:
            print(f"deferred (missing signature): {a}->{b}", file=sys.stderr)
    elif len(args) == 2:
        pairs = [tuple(args)]
    else:
        sys.exit(__doc__)

    for a, b in pairs:
        try:
            text = diff_pair(a, b)
        except FileNotFoundError as e:
            print(f"skip {a}->{b}: {e}", file=sys.stderr)
            continue
        if to_stdout or not os.path.isdir(os.path.join(ROOT, "diffs")):
            print(text)
        else:
            out = os.path.join(ROOT, "diffs", f"{a}__{b}.md")
            with open(out, "w") as f:
                f.write(text)
            print(f"wrote {out}")


if __name__ == "__main__":
    main()
