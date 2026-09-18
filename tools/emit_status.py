#!/usr/bin/env python3
"""Append one status record to tmp/lane-<lane>/status.jsonl.

usage: emit_status.py <lane> <ver> <stage> <ok:0|1> [counts_json] [error]
"""

import json
import os
import sys
import time

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lane, ver, stage, ok = sys.argv[1:5]
counts = {}
if len(sys.argv) > 5 and sys.argv[5]:
    try:
        counts = json.loads(sys.argv[5])
    except json.JSONDecodeError:
        counts = {"raw": sys.argv[5]}
error = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] else None
rec = {
    "ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    "lane": lane,
    "ver": ver,
    "stage": stage,
    "ok": ok.lower() in ("1", "true"),
    "counts": counts,
    "error": error,
}
d = os.path.join(root, "tmp", f"lane-{lane}")
os.makedirs(d, exist_ok=True)
with open(os.path.join(d, "status.jsonl"), "a") as f:
    f.write(json.dumps(rec, ensure_ascii=False) + "\n")
