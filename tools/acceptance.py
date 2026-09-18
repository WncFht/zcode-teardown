#!/usr/bin/env python3
"""Acceptance audit — verify all five mission criteria, print PASS/FAIL report.

  1. 58 extracted/<ver>/ trees, each with MANIFEST.json
  2. 58 git tags v* in repo/ (one per version)
  3. 58 signatures/<ver>.json, each schema-valid
  4. 57 diffs/<a>__<b>.md for consecutive released versions
  5. notes/*.md claims carry evidence chains (heuristic scan)

usage: acceptance.py [--json]
"""

import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def ver_key(v):
    return tuple(int(x) for x in v.split("."))


def main():
    with open(os.path.join(ROOT, "manifest", "versions.json")) as f:
        manifest = json.load(f)
    versions = sorted((v["version"] for v in manifest), key=ver_key)
    report = {"total_versions": len(versions), "criteria": {}}
    ok_all = True

    # 1: extracted trees + MANIFEST.json
    missing_tree = [v for v in versions if not os.path.isdir(f"{ROOT}/extracted/{v}")]
    missing_mf = [
        v
        for v in versions
        if os.path.isdir(f"{ROOT}/extracted/{v}")
        and not os.path.isfile(f"{ROOT}/extracted/{v}/MANIFEST.json")
    ]
    empty = [
        v
        for v in versions
        if os.path.isdir(f"{ROOT}/extracted/{v}")
        and not any(os.scandir(f"{ROOT}/extracted/{v}"))
    ]
    c1 = not missing_tree and not missing_mf and not empty
    report["criteria"]["1_extracted_trees"] = {
        "pass": c1,
        "missing_tree": missing_tree,
        "missing_manifest": missing_mf,
        "empty": empty,
    }
    ok_all &= c1

    # 2: tags
    tags = set(
        subprocess.run(
            ["git", "-C", f"{ROOT}/repo", "tag"],
            capture_output=True,
            text=True,
            check=False,
        ).stdout.split()
    )
    missing_tag = [v for v in versions if f"v{v}" not in tags]
    c2 = not missing_tag and len(tags) == len(versions)
    report["criteria"]["2_tags"] = {
        "pass": c2,
        "tag_count": len(tags),
        "missing": missing_tag,
    }
    ok_all &= c2

    # 3: signatures schema-valid (reuse extractor's validator)
    sigs = {f[:-5] for f in os.listdir(f"{ROOT}/signatures") if f.endswith(".json")}
    missing_sig = [v for v in versions if v not in sigs]
    invalid = []
    for v in sorted(sigs & set(versions), key=ver_key):
        r = subprocess.run(
            [
                "python3",
                f"{ROOT}/tools/extract_signatures.py",
                "--validate",
                f"{ROOT}/signatures/{v}.json",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if "schema-valid" not in r.stdout + r.stderr:
            invalid.append(v)
    c3 = not missing_sig and not invalid
    report["criteria"]["3_signatures"] = {
        "pass": c3,
        "count": len(sigs),
        "missing": missing_sig,
        "invalid": invalid,
    }
    ok_all &= c3

    # 4: diffs
    diffs_dir = f"{ROOT}/diffs"
    have_diffs = set(os.listdir(diffs_dir)) if os.path.isdir(diffs_dir) else set()
    want = [f"{a}__{b}.md" for a, b in zip(versions, versions[1:])]
    missing_diff = [d for d in want if d not in have_diffs]
    c4 = not missing_diff
    report["criteria"]["4_diffs"] = {
        "pass": c4,
        "count": len(have_diffs),
        "expected": len(want),
        "missing": missing_diff,
    }
    ok_all &= c4

    # 5: evidence chains in notes/ — every non-REVIEW bullet with a claim should
    # cite something (vX.Y.Z / diffs/ / file:line / signatures path)
    notes_dir = f"{ROOT}/notes"
    evidence_re = re.compile(
        r"(v\d+\.\d+\.\d+"  # version tag ref
        r"|\b\d+\.\d+\.[\dx]+\b"  # bare version number (incl. 3.11.x)
        r"|diffs/\S+\.md|signatures/\S+\.json"  # artifact refs
        r"|\b[a-f0-9]{7,40}\b"  # git sha / content hash
        r"|\w[\w./-]*\.(?:js|ts|json|cjs|toml|yml|py|sh|md):\d+"  # file:line
        r"|\w[\w./-]*\.(?:cjs|asar|node|exe|plist|toml|yml|yaml)\b"  # file path
        r"|\w[\w./-]*\.(?:AppImage|deb|dmg|zip)\b"
        r"|\b(?:zcode\.cjs|MANIFEST\.json|HOST\.json|SOURCE\.json"
        r"|app-update\.yml|bundle-meta)\b"
        r"|\b(?:glm|tools|app/out|model-providers|node_modules"
        r"|gemini|codex|opencode|acp|acp-proxy-runtime"
        r"|main|host)/[\w./-]*"  # main/ host/ = app/out shorthand
        r"|\bL\d+\b|tmp/lane-\S+|extracted/\S+|repo/\S+"
        r"|\[\^[\w-]+\])"  # footnote citation
    )
    table_sep_re = re.compile(r"^\|[\s:|-]+\|$")
    notes_report = {}
    if os.path.isdir(notes_dir):
        for fn in sorted(os.listdir(notes_dir)):
            if not fn.endswith(".md"):
                continue
            claims = cited = 0
            # section-context credit: bullets under a heading/preamble that
            # itself cites evidence inherit the chain (### a -> b (diffs/..),
            # "source: extracted/x.y/zcode.cjs" paragraphs); resets per heading
            section_cited = False
            in_review = False
            with open(os.path.join(notes_dir, fn)) as fh:
                rows = [ln.strip() for ln in fh]
            for i, s in enumerate(rows):
                if s.startswith("#"):
                    in_review = bool(re.search(r"\bREVIEW\b", s, re.IGNORECASE))
                    section_cited = bool(evidence_re.search(s))
                    continue
                if in_review:
                    continue  # REVIEW sections hold declared-uncertain findings
                if not s:
                    continue
                nxt = rows[i + 1] if i + 1 < len(rows) else ""
                if table_sep_re.match(s) or (
                    s.startswith("|") and table_sep_re.match(nxt)
                ):
                    continue  # table separator/header rows are structure, not claims
                if s.startswith(("- ", "* ", "| ")) and len(s) > 40:
                    claims += 1
                    if evidence_re.search(s) or section_cited:
                        cited += 1
                elif evidence_re.search(s):
                    # preamble line carrying the section's evidence
                    section_cited = True
            notes_report[fn] = {
                "claim_lines": claims,
                "cited": cited,
                "coverage": f"{cited}/{claims}",
            }
    report["criteria"]["5_evidence_heuristic"] = {
        "pass": None,
        "notes": notes_report,
        "note": "heuristic — bullets may inherit section-level citations; "
        "human review required for uncited claim lines",
    }

    print(json.dumps(report, indent=1) if "--json" in sys.argv else "")
    if "--json" not in sys.argv:
        print(f"versions: {len(versions)}")
        for k, c in report["criteria"].items():
            p = c.get("pass")
            mark = "PASS" if p else ("INFO" if p is None else "FAIL")
            print(f"[{mark}] {k}")
            for key in (
                "missing_tree",
                "missing_manifest",
                "empty",
                "missing",
                "invalid",
                "missing_diff",
            ):
                if c.get(key):
                    print(f"       {key}: {c[key]}")
            if k == "5_evidence_heuristic":
                for fn, r in c["notes"].items():
                    print(f"       {fn}: {r['coverage']} cited")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()
