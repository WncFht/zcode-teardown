#!/usr/bin/env python3
"""Generate extracted/<ver>/MANIFEST.json: tree listing + engine/tool/host fingerprints.

usage: tree_manifest.py <version> [lane]
"""

import contextlib
import hashlib
import json
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""):
            h.update(c)
    return h.hexdigest()


def tool_version(path):
    try:
        r = subprocess.run(
            [path, "--version"],
            capture_output=True,
            text=True,
            timeout=15,
            env={**os.environ, "DISPLAY": ""},
            check=False,
        )
        s = (r.stdout or "") + (r.stderr or "")
        return s.strip().splitlines()[0] if s.strip() else None
    except (OSError, subprocess.SubprocessError, UnicodeDecodeError) as e:
        return f"unavailable:{e.__class__.__name__}"


def main():
    ver = sys.argv[1]
    lane = sys.argv[2] if len(sys.argv) > 2 else "manual"
    out = os.path.join(ROOT, "extracted", ver)
    if not os.path.isdir(out):
        print(f"missing {out}", file=sys.stderr)
        sys.exit(1)

    files, total = [], 0
    for dp, dn, fn in os.walk(out):
        dn.sort()
        for f in sorted(fn):
            p = os.path.join(dp, f)
            rel = os.path.relpath(p, out)
            if rel == "MANIFEST.json":
                continue
            if os.path.islink(p):
                files.append({"p": rel, "s": 0, "h": None, "link": os.readlink(p)})
                continue
            s = os.path.getsize(p)
            total += s
            files.append({"p": rel, "s": s, "h": sha256(p)})

    engine = []
    if os.path.isdir(os.path.join(out, "gemini")):
        engine.append("gemini")
    if os.path.isfile(os.path.join(out, "glm", "zcode.cjs")):
        engine.append("glm-zcode")
    if os.path.isdir(os.path.join(out, "acp")):
        engine.append("acp")
    if os.path.isdir(os.path.join(out, "acp-proxy-runtime")):
        engine.append("acp-proxy")

    tools = {}
    tdir = os.path.join(out, "tools")
    if os.path.isdir(tdir):
        for dp, _, fn in os.walk(tdir):
            for f in sorted(fn):
                p = os.path.join(dp, f)
                if os.access(p, os.X_OK) and not f.endswith((".so", ".node")):
                    rel = os.path.relpath(p, out)
                    tools[rel] = tool_version(p)

    native = [
        {"p": f["p"], "s": f["s"], "h": f["h"]}
        for f in files
        if f["p"].endswith(".node")
    ]

    appmeta = {}
    pkg = os.path.join(out, "app", "package.json")
    if os.path.isfile(pkg):
        try:
            with open(pkg) as fh:
                pj = json.load(fh)
            appmeta = {
                "name": pj.get("name"),
                "version": pj.get("version"),
                "main": pj.get("main"),
                "deps": pj.get("dependencies"),
                "devDeps": pj.get("devDependencies"),
                "engines": pj.get("engines"),
            }
        except (OSError, ValueError) as e:
            appmeta = {"error": str(e)}

    host = {}
    hp = os.path.join(out, "HOST.json")
    if os.path.isfile(hp):
        with contextlib.suppress(OSError, ValueError), open(hp) as fh:
            host = json.load(fh)

    asar_info = {}
    ap = os.path.join(out, "app.asar")
    if os.path.isfile(ap):
        asar_info = {"size": os.path.getsize(ap), "sha256": sha256(ap)}

    man = {
        "version": ver,
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "engine": "+".join(engine) if engine else "unknown",
        "counts": {"files": len(files), "bytes": total},
        "app": appmeta,
        "app_asar": asar_info,
        "host": host,
        "bundled_tools": tools,
        "native_modules": native,
        "files": files,
    }
    with open(os.path.join(out, "MANIFEST.json"), "w") as f:
        json.dump(man, f, indent=1)
    subprocess.run(
        [
            sys.executable,
            os.path.join(ROOT, "tools", "emit_status.py"),
            lane,
            ver,
            "manifest",
            "1",
            json.dumps(man["counts"]),
        ],
        check=False,
    )
    print(f"{ver}: {len(files)} files, {total} bytes, engine={man['engine']}")


if __name__ == "__main__":
    main()
