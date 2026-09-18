#!/usr/bin/env python3
"""extract_signatures.py — signature snapshot extractor for ZCode version trees.

usage:
    extract_signatures.py <ver>            extracted/<ver>/ -> signatures/<ver>.json
    extract_signatures.py --validate <f>   validate signatures/<ver>.json vs schema
    extract_signatures.py <ver> --out <f>  write to a custom path
    extract_signatures.py <ver> --print    print JSON to stdout (also writes file)

Reads the resources tree produced by unpack.sh + MANIFEST.json and greps
signature categories out of JS/JSON/TOML/MD text plus `strings` output of
embedded-JS ELF engines (2.x: glm/zcode-acp, opencode, codex-acp).

Deterministic: all list outputs sorted, deduped; no file-content dumps.
"""

import json
import os
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# corpus layout
# ---------------------------------------------------------------------------

# top-level dirs (relative to extracted/<ver>/) whose text files get grepped.
# app/ is special-cased to app/out only (app/node_modules is vendor noise).
TEXT_DIRS = [
    "config",
    "glm",
    "gemini",
    "acp",
    "acp-proxy-runtime",
    "opencode",
    "codex",
    "mcp",
    "server",
    "app/out",
]
# scoped engine packages inside node_modules that ARE product code, not vendor.
TEXT_EXTRA_DIRS = [
    "acp/node_modules/@agentclientprotocol",
    "codex/node_modules/@zed-industries",
]
# root-level files worth grepping (ours MANIFEST.json/HOST.json are excluded).
ROOT_GLOBS = ("*.yml", "*.yaml")

TEXT_GLOBS = [
    "*.js",
    "*.cjs",
    "*.mjs",
    "*.jsx",
    "*.ts",
    "*.d.ts",
    "*.json",
    "*.toml",
    "*.yml",
    "*.yaml",
    "*.sb",
    "*.txt",
]
EXCLUDE_GLOBS = [
    "*.map",
    "*/node_modules/*",
    "*.node",
    "*.wasm",
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.gif",
    "*.ico",
    "*.icns",
    "*.woff",
    "*.woff2",
    "*.ttf",
    "*.otf",
    "*.asar",
    "*.mp3",
    "*.wav",
    "*.mp4",
    "*.webm",
    "*.pdf",
    "MANIFEST.json",
    "HOST.json",
]
# directories whose ELF executables carry embedded JS worth running strings on
BINARY_DIRS = ["glm", "opencode", "codex", "gemini", "acp", "acp-proxy-runtime"]
MIN_BINARY_SIZE = 1_000_000  # skip tiny shims
# scoped packages whose binaries are engine code even inside node_modules
BINARY_NM_SCOPES = (
    "@zed-industries",
    "@agentclientprotocol",
    "@anthropic-ai",
    "@openai",
)

STRINGS_CACHE = os.path.join(ROOT, "tmp", "lane-b1", "strings-cache")

# ---------------------------------------------------------------------------
# category patterns
# ---------------------------------------------------------------------------

MODEL_PREFIXES = [
    r"GLM-[A-Za-z0-9][A-Za-z0-9._-]*",
    r"glm-[a-z0-9][a-z0-9._-]*",
    r"gemini-[a-zA-Z0-9][a-zA-Z0-9._-]*",
    r"claude-[a-zA-Z0-9][a-zA-Z0-9._-]*",
    r"gpt-[a-zA-Z0-9][a-zA-Z0-9._-]*",
    r"kimi-[a-z0-9][a-z0-9._-]*",
    r"k[0-9]+\.[0-9]+[a-zA-Z0-9._-]*",
    r"deepseek-[a-zA-Z0-9._-]+",
    r"qwen[0-9][a-zA-Z0-9._-]*",
    r"o[134]-[a-z0-9._-]+",
    r"codex-[a-z0-9._-]+",
    r"codegeex[a-z0-9._-]*",
    r"charglm[a-z0-9._-]*",
    r"moonshot-[a-z0-9._-]+",
    r"doubao-[a-z0-9._-]+",
    r"cogview[a-z0-9._-]*",
    r"cogvideox[a-z0-9._-]*",
    r"emohaa[a-z0-9._-]*",
]
MODEL_RE = re.compile(r"\b(?:" + "|".join(MODEL_PREFIXES) + r")\b")
MODEL_JUNK = re.compile(
    r"(?:api[-_]?key|cli|agent[-_]?acp|oauth2?|login|auth|token|secret|sdk|"
    r"plugin[s]?|runtime|proxy|browser[-_]?agent|desktop|electron|app|web|"
    r"code[-_]?rev|code|cli-browser-agent|provider[s]?|models?)$",
    re.IGNORECASE,
)
MODEL_JUNK_EXACT = {
    "gemini-cli",
    "gemini-api-key",
    "gemini-cli-api-key",
    "gemini-cli-browser-agent",
    "claude-code",
    "claude-cli",
    "claude-agent-acp",
    "claude-ai",
    "gpt-api",
}

URL_RE = re.compile(
    r"https?://[A-Za-z0-9][A-Za-z0-9.-]*(?::[0-9]{1,5})?"
    r"(?:/[A-Za-z0-9._~:/?&=#%+@${},;!\[\]-]*)?"
)
URL_JUNK_HOSTS = {
    # placeholder / schema / spec
    "example.com",
    "example.org",
    "example.net",
    "w3.org",
    "www.w3.org",
    "w3c.github.io",
    "schema.org",
    "json-schema.org",
    "schemas.xmlsoap.org",
    "purl.org",
    "spdx.org",
    "opensource.org",
    "apache.org",
    "datatracker.ietf.org",
    "tools.ietf.org",
    "www.rfc-editor.org",
    "rfc-editor.org",
    "ietf.org",
    "ecma-international.org",
    "tc39.es",
    "spec.whatwg.org",
    "html.spec.whatwg.org",
    "fetch.spec.whatwg.org",
    "url.spec.whatwg.org",
    "streams.spec.whatwg.org",
    "infra.spec.whatwg.org",
    "encoding.spec.whatwg.org",
    "dom.spec.whatwg.org",
    "xhr.spec.whatwg.org",
    "console.spec.whatwg.org",
    "mimesniff.spec.whatwg.org",
    "websockets.spec.whatwg.org",
    "wasm.spec.whatwg.org",
    # docs / Q&A / learning (never API endpoints)
    "developer.mozilla.org",
    "developer.chrome.com",
    "developers.google.com",
    "developer.android.com",
    "web.dev",
    "learn.microsoft.com",
    "support.google.com",
    "cloud.google.com",
    "firebase.google.com",
    "en.wikipedia.org",
    "stackoverflow.com",
    "serverfault.com",
    "superuser.com",
    "askubuntu.com",
    "docs.github.com",
    # language / framework / lib homepages + registries
    "nodejs.org",
    "www.nodejs.org",
    "bun.com",
    "bun.sh",
    "deno.land",
    "deno.com",
    "react.dev",
    "reactjs.org",
    "vuejs.org",
    "angular.io",
    "svelte.dev",
    "vitejs.dev",
    "vitest.dev",
    "webpack.js.org",
    "rollupjs.org",
    "babeljs.io",
    "typescriptlang.org",
    "www.typescriptlang.org",
    "eslint.org",
    "prettier.io",
    "jestjs.io",
    "mochajs.org",
    "playwright.dev",
    "puppeteer.github.io",
    "hono.dev",
    "expressjs.com",
    "fastify.dev",
    "nestjs.com",
    "ajv.js.org",
    "chevrotain.io",
    "dequeuniversity.com",
    "registry.npmjs.org",
    "www.npmjs.com",
    "npmjs.com",
    "npmjs.org",
    "yarnpkg.com",
    "pnpm.io",
    "crates.io",
    "pypi.org",
    "rubygems.org",
    "packagist.org",
    # badges / images / fonts / misc asset hosts
    "img.shields.io",
    "shields.io",
    "imgur.com",
    "i.imgur.com",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "www.gravatar.com",
    "gravatar.com",
    "unicode.org",
    "www.unicode.org",
    "emojipedia.org",
    "httpbin.org",
    "postman-echo.com",
    "gnu.org",
    "www.gnu.org",
}
# extra junk for binary-strings corpus: package metadata (repository/homepage
# fields) inside bundled node_modules is the dominant noise source there.
URL_JUNK_HOSTS_STRINGS = URL_JUNK_HOSTS | {
    "github.com",
    "www.github.com",
    "api.github.com",
    "gist.github.com",
    "raw.githubusercontent.com",
    "objects.githubusercontent.com",
    "codeload.github.com",
    "gitlab.com",
    "bitbucket.org",
    "sourceforge.net",
    "unpkg.com",
    "cdn.jsdelivr.net",
    "jsdelivr.net",
    "esm.sh",
    "skypack.dev",
}
URL_TRAIL = ".,;:!?'\"`)]}>"
TEMPLATE_RE = re.compile(r"\$\{[^}]*\}")

PATH_RE = re.compile(
    r"\"(/(?:api|v[0-9]+|oauth|auth|token|quota|monitor|usage|billing|"
    r"subscription|plans?|account|admin|internal|rpc|ws|mcp|acp)"
    r"[A-Za-z0-9._~{}/$-]{0,120})\""
)

FF_IDENT_RE = re.compile(r"\b[a-zA-Z_][a-zA-Z0-9_]{3,}(?:Enabled|Disabled)\b")
FF_GENERIC = {
    "isenabled",
    "setenabled",
    "getenabled",
    "resolveenabled",
    "updateenabled",
    "enabled",
    "disabled",
    "reenabled",
    "isdisabled",
    "setdisabled",
    "wasenabled",
    "defaultenabled",
    "notenabled",
    "checkenabled",
}
FF_SNAKE_RE = re.compile(r"\b(?:enable|disable)_[a-z0-9][a-z0-9_]{2,}\b")
FF_FF_RE = re.compile(r"\b(?:FF_[A-Z0-9_]+|ff_[a-z0-9_]+)\b")
FF_ZCODE_RE = re.compile(r"\bZCODE_[A-Z0-9_]+\b")
FF_FEATS_RE = re.compile(r"\bfeatures\.[A-Za-z][A-Za-z0-9_.-]*\b")
FF_GATE_RE = re.compile(r"\bfeature_gate[s]?[_-][a-z0-9_]+\b")
FF_CAPS_OK = re.compile(r"^(?:ZCODE_|FF_|ENABLE_|DISABLE_)")

ENV_RES = [
    re.compile(r"process\.env\.([A-Z_][A-Z0-9_]*)"),
    re.compile(r"process\.env\[['\"`]([A-Z_][A-Z0-9_]*)['\"`]"),
    re.compile(r"(?:os\.)?[Gg]etenv\(['\"`]([A-Z_][A-Z0-9_]*)"),
    re.compile(r"\benv\(['\"`]([A-Z_][A-Z0-9_]*)"),
]

PLAN_TIERS = (
    "free|lite|pro|max|ultra|standard|team|enterprise|trial|basic|premium|"
    "weekend|global|start|plus|personal|business|edu|ultimate|family|solo|duo|"
    "offpeak|off_peak|dev"
)
PLAN_TIER_RE = re.compile(r"\"(" + PLAN_TIERS + r")\"")
PLAN_SNAKE_RE = re.compile(
    r"\"([a-z][a-z0-9]*(?:_[a-z0-9]+)*_(?:plan|tier|subscription))\""
)
PLAN_PROVIDER_RE = re.compile(
    r"\b[A-Z][A-Za-z0-9]*(?:Plan|Subscription|Quota|Billing|Usage)Provider\b"
)
PLAN_QUOTA_RE = re.compile(
    r"\"([a-zA-Z_]*(?:quota|limit|maxRequests|rateLimit|weeklyLimit|monthlyLimit|"
    r"dailyLimit|tokenLimit|maxTokens|maxConcurrent|concurrencyLimit|"
    r"requestLimit|usageLimit|promptLimit|request_limit)[a-zA-Z_]*)\"\s*:\s*([0-9]+)"
)
PLAN_KV_RE = re.compile(
    r"\"(plan_id|planId|plan_type|planType|plan_name|planName|product_id|"
    r"productId|subscription_tier|subscriptionTier|tier)\"\s*:\s*\"([^\"]{1,60})\""
)

ACP_NS_RE = re.compile(
    r"\"((?:session|fs|terminal|mcp|account|agent|client|workspace|_claude|_meta|"
    r"acp|tools|prompts|resources|completion|logging|notifications|roots|"
    r"sampling|elicitation|initialize|authenticate|shutdown|codex|fsm|telemetry)"
    r"/[a-zA-Z0-9_][a-zA-Z0-9_/.-]*)\""
)
ACP_METHOD_RE = re.compile(
    r"\bmethod:\s*['\"]([a-zA-Z][a-zA-Z0-9_]*(?:/[a-zA-Z0-9_/.-]+)?)['\"]"
)
ACP_HTTP = {
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "HEAD",
    "OPTIONS",
    "CONNECT",
    "TRACE",
}
ACP_EVENT_RE = re.compile(r"\bacp\.[a-z][a-zA-Z0-9_.]{2,}\b")

IPC_ZCODE_RE = re.compile(r"\"zcode:[a-z0-9][a-z0-9:_-]{1,80}\"")
IPC_GENERIC_RE = re.compile(r"\"[a-z][a-z0-9]{1,24}:[a-z0-9][a-z0-9:-]{2,80}\"")
IPC_NS_JUNK = {
    "http",
    "https",
    "ws",
    "wss",
    "node",
    "persist",
    "about",
    "error",
    "file",
    "data",
    "blob",
    "chrome",
    "devtools",
    "dom",
    "fetch",
    "input",
    "page",
    "network",
    "runtime",
    "inspector",
    "media",
    "audio",
    "video",
    "font",
    "dns",
    "unix",
    "fc00",
    "fe80",
    "ff00",
    "mysql",
    "postgres",
    "redis",
    "mongodb",
    "amqp",
    "kafka",
    "s3",
    "gs",
    "mailto",
    "tel",
    "sms",
    "ssh",
    "ftp",
    "git",
    "svn",
    "ldap",
    "geo",
    "urn",
    "doi",
    "isbn",
    "info",
    "ver",
    "content",
    "javascript",
    "view-source",
    "chrome-extension",
    "moz-extension",
    "webkit",
    "indexeddb",
    "local",
    "session",
    "app",
    "bundle",
    "webpack",
}

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _run_rg(patterns, paths, globs=None, capture_group=None, timeout=300):
    """Run rg -o over paths+patterns; return {match: first_relpath}."""
    if not paths:
        return {}
    cmd = [
        "rg",
        "--no-mmap",
        "-o",
        "-N",
        "--no-heading",
        "--with-filename",
        "--color",
        "never",
    ]
    for g in globs or []:
        cmd += ["-g", g]
    for p in patterns:
        cmd += ["-e", p]
    cmd += list(paths)
    try:
        out = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout, check=False
        )
    except subprocess.TimeoutExpired:
        return {}
    hits = {}
    for line in out.stdout.splitlines():
        if ":" not in line:
            continue
        f, m = line.split(":", 1)
        if capture_group is not None:
            # rg -o prints whole match; group extraction happens in python
            mm = re.search(patterns[0] if len(patterns) == 1 else m, m)
            m = mm.group(capture_group) if mm and mm.lastindex else m
        rel = os.path.relpath(f, ROOT)
        if m not in hits or len(rel) < len(hits[m]):
            hits[m] = rel
    return hits


def _rg_files(patterns, files):
    """Run rg -o over a list of strings-cache files."""
    return _run_rg(patterns, files)


def _norm_url(u):
    u = TEMPLATE_RE.sub("{}", u)
    return u.rstrip(URL_TRAIL)


def _is_elf(path):
    try:
        with open(path, "rb") as f:
            return f.read(4) == b"\x7fELF"
    except OSError:
        return False


def _find_binaries(ver_root):
    bins = []
    for d in BINARY_DIRS:
        base = os.path.join(ver_root, d)
        if not os.path.isdir(base):
            continue
        for dirpath, dirs, files in os.walk(base):
            parts = dirpath.split(os.sep)
            if os.path.basename(dirpath) == "node_modules":
                dirs[:] = [x for x in dirs if x in BINARY_NM_SCOPES]
                continue
            if "node_modules" in parts:
                i = parts.index("node_modules")
                if i + 1 < len(parts) and parts[i + 1] not in BINARY_NM_SCOPES:
                    dirs[:] = []
                    continue
            for fn in files:
                p = os.path.join(dirpath, fn)
                try:
                    if os.path.getsize(p) < MIN_BINARY_SIZE:
                        continue
                except OSError:
                    continue
                if re.search(r"\.(node|so|a|o)(\.[0-9.]+)?$", fn):
                    continue
                if _is_elf(p):
                    bins.append(p)
    return bins


def _strings_cache(binpath, ver):
    rel = os.path.relpath(binpath, ROOT)
    slug = re.sub(r"[^A-Za-z0-9_.-]", "_", rel)
    cdir = os.path.join(STRINGS_CACHE, ver)
    os.makedirs(cdir, exist_ok=True)
    out = os.path.join(cdir, slug + ".txt")
    meta = out + ".meta"
    try:
        st = os.stat(binpath)
        key = f"{st.st_size}:{int(st.st_mtime)}"
        if os.path.exists(meta) and os.path.exists(out):
            with open(meta) as fh:
                if fh.read().strip() == key:
                    return out
    except OSError:
        key = ""
    with open(out, "w") as fh:
        subprocess.run(["strings", "-n", "8", binpath], stdout=fh, check=False)
    with open(meta, "w") as fh:
        fh.write(key)
    return out


# ---------------------------------------------------------------------------
# category extractors (each returns dict sig->provenance)
# ---------------------------------------------------------------------------


def cat_models(ver_root, rg_dirs, str_files):
    hits = _run_rg(
        [MODEL_RE.pattern], rg_dirs, globs=[f"!{g}" for g in EXCLUDE_GLOBS] + TEXT_GLOBS
    )
    for m, s in _rg_files([MODEL_RE.pattern], str_files).items():
        hits.setdefault(m, s)
    out = {}
    for raw, src in hits.items():
        m = raw.strip()
        if m.lower() in MODEL_JUNK_EXACT or MODEL_JUNK.search(m):
            continue
        if "." in m and m.rsplit(".", 1)[-1] in ("js", "ts", "json", "map"):
            continue
        out.setdefault(m, src)
    # provider templates from config/provider/*.json
    provdir = os.path.join(ver_root, "config", "provider")
    if os.path.isdir(provdir):
        for fn in sorted(os.listdir(provdir)):
            if not fn.endswith(".json"):
                continue
            try:
                with open(os.path.join(provdir, fn)) as fh:
                    data = json.load(fh)
            except (OSError, json.JSONDecodeError):
                continue
            rules = (
                (data.get("config", {}) or {})
                .get("providerConfigRules", {})
                .get("templateRules", [])
            )
            for r in rules:
                tid = r.get("templateId")
                if tid:
                    out[f"provider:{tid}"] = os.path.join("config", "provider", fn)
                cfg = r.get("config", {}) or {}
                for mid in cfg.get("builtinModelIds", []) or []:
                    out.setdefault(mid, os.path.join("config", "provider", fn))
    return out


def _host_blocked(host, junk):
    host = host.lower()
    return any(host == j or host.endswith("." + j) for j in junk)


def cat_endpoints(rg_dirs, str_files):
    out = {}
    text_hits = _run_rg(
        [URL_RE.pattern], rg_dirs, globs=[f"!{g}" for g in EXCLUDE_GLOBS] + TEXT_GLOBS
    )
    for raw, src in text_hits.items():
        u = _norm_url(raw)
        if len(u) < 12 or u.endswith((".map", ".png", ".svg", ".css", ".ico", ".woff")):
            continue
        host = re.sub(r"^https?://", "", u).split(":")[0].split("/")[0]
        if _host_blocked(host, URL_JUNK_HOSTS):
            continue
        out.setdefault(u, src)
    for raw, src in _rg_files([URL_RE.pattern], str_files).items():
        u = _norm_url(raw)
        if len(u) < 12 or u.endswith((".map", ".png", ".svg", ".css", ".ico", ".woff")):
            continue
        host = re.sub(r"^https?://", "", u).split(":")[0].split("/")[0]
        if _host_blocked(host, URL_JUNK_HOSTS_STRINGS):
            continue
        out.setdefault(u, src)
    for m, src in _run_rg(
        [PATH_RE.pattern], rg_dirs, globs=[f"!{g}" for g in EXCLUDE_GLOBS] + TEXT_GLOBS
    ).items():
        p = m.strip('"')
        p = TEMPLATE_RE.sub("{}", p)
        if len(p) < 4:
            continue
        out.setdefault(p, src)
    for m, src in _rg_files([PATH_RE.pattern], str_files).items():
        p = TEMPLATE_RE.sub("{}", m.strip('"'))
        if len(p) >= 4:
            out.setdefault(p, src)
    return out


def cat_feature_flags(rg_dirs, str_files):
    pats = [
        FF_IDENT_RE.pattern,
        FF_SNAKE_RE.pattern,
        FF_FF_RE.pattern,
        FF_ZCODE_RE.pattern,
        FF_FEATS_RE.pattern,
        FF_GATE_RE.pattern,
    ]
    globs = [f"!{g}" for g in EXCLUDE_GLOBS] + TEXT_GLOBS
    hits = _run_rg(pats, rg_dirs, globs=globs)
    for m, s in _rg_files(pats, str_files).items():
        hits.setdefault(m, s)
    out = {}
    for m, src in hits.items():
        if m.endswith(("Enabled", "Disabled")) and not m.startswith("features."):
            stem = (
                m[: -len("Enabled")] if m.endswith("Enabled") else m[: -len("Disabled")]
            )
            if (
                m.isupper() or (stem and stem[0].isupper() and "_" in m)
            ) and not FF_CAPS_OK.match(m):
                continue
            if stem.lower() in FF_GENERIC:
                continue
            if len(stem) < 3:
                continue
        out.setdefault(m, src)
    return out


def cat_env_vars(rg_dirs, str_files):
    pats = [p.pattern for p in ENV_RES]
    globs = [f"!{g}" for g in EXCLUDE_GLOBS] + TEXT_GLOBS
    out = {}
    for pat in pats:
        cre = re.compile(pat)
        for m, src in _run_rg([pat], rg_dirs, globs=globs).items():
            mm = cre.search(m)
            if mm:
                out.setdefault(mm.group(1), src)
        for m, src in _rg_files([pat], str_files).items():
            mm = cre.search(m)
            if mm:
                out.setdefault(mm.group(1), src)
    return out


def cat_plans(rg_dirs, str_files):
    globs = [f"!{g}" for g in EXCLUDE_GLOBS] + TEXT_GLOBS
    out = {}
    for m, s in _run_rg([PLAN_TIER_RE.pattern], rg_dirs, globs=globs).items():
        out.setdefault("tier:" + m.strip('"').lower(), s)
    for m, s in _rg_files([PLAN_TIER_RE.pattern], str_files).items():
        out.setdefault("tier:" + m.strip('"').lower(), s)
    for m, s in _run_rg([PLAN_SNAKE_RE.pattern], rg_dirs, globs=globs).items():
        out.setdefault("plan:" + m.strip('"'), s)
    for m, s in _rg_files([PLAN_SNAKE_RE.pattern], str_files).items():
        out.setdefault("plan:" + m.strip('"'), s)
    for m, s in _run_rg([PLAN_PROVIDER_RE.pattern], rg_dirs, globs=globs).items():
        out.setdefault("provider_cls:" + m, s)
    for m, s in _rg_files([PLAN_PROVIDER_RE.pattern], str_files).items():
        out.setdefault("provider_cls:" + m, s)
    for m, s in _run_rg([PLAN_QUOTA_RE.pattern], rg_dirs, globs=globs).items():
        mm = re.match(PLAN_QUOTA_RE, m)
        if mm:
            out.setdefault(f"quota:{mm.group(1)}={mm.group(2)}", s)
    for m, s in _run_rg([PLAN_KV_RE.pattern], rg_dirs, globs=globs).items():
        mm = re.match(PLAN_KV_RE, m)
        if mm:
            out.setdefault(f"kv:{mm.group(1)}={mm.group(2)}", s)
    return out


def cat_acp_methods(rg_dirs, str_files):
    globs = [f"!{g}" for g in EXCLUDE_GLOBS] + TEXT_GLOBS
    out = {}
    for m, s in _run_rg([ACP_NS_RE.pattern], rg_dirs, globs=globs).items():
        out.setdefault(m.strip('"'), s)
    for m, s in _rg_files([ACP_NS_RE.pattern], str_files).items():
        out.setdefault(m.strip('"'), s)
    for m, s in _run_rg([ACP_METHOD_RE.pattern], rg_dirs, globs=globs).items():
        mm = ACP_METHOD_RE.search(m)
        val = mm.group(1) if mm else m
        if val.upper() not in ACP_HTTP and not val.startswith(("http", "urn")):
            out.setdefault(val, s)
    for m, s in _rg_files([ACP_METHOD_RE.pattern], str_files).items():
        mm = ACP_METHOD_RE.search(m)
        val = mm.group(1) if mm else m
        if val.upper() not in ACP_HTTP and not val.startswith(("http", "urn")):
            out.setdefault(val, s)
    for m, s in _run_rg([ACP_EVENT_RE.pattern], rg_dirs, globs=globs).items():
        out.setdefault(m, s)
    for m, s in _rg_files([ACP_EVENT_RE.pattern], str_files).items():
        out.setdefault(m, s)
    return out


def cat_ipc_channels(ver_root):
    dirs = [os.path.join(ver_root, "app", "out")]
    dirs = [d for d in dirs if os.path.isdir(d)]
    globs = [f"!{g}" for g in EXCLUDE_GLOBS] + TEXT_GLOBS
    out = {}
    for m, s in _run_rg(
        [IPC_ZCODE_RE.pattern, IPC_GENERIC_RE.pattern], dirs, globs=globs
    ).items():
        v = m.strip('"')
        ns = v.split(":", 1)[0]
        if ns in IPC_NS_JUNK:
            continue
        out.setdefault(v, s)
    return out


def cat_plugins_skills(ver_root):
    out = {}
    # 3.x: glm/packages/*/.zcode-plugin/plugin.json
    pkgs = os.path.join(ver_root, "glm", "packages")
    if os.path.isdir(pkgs):
        for pkg in sorted(os.listdir(pkgs)):
            pj = os.path.join(pkgs, pkg, ".zcode-plugin", "plugin.json")
            if os.path.isfile(pj):
                try:
                    with open(pj) as fh:
                        meta = json.load(fh)
                except (OSError, json.JSONDecodeError):
                    meta = {}
                name = meta.get("name") or pkg
                ver = meta.get("version") or "?"
                out[f"plugin:{name}@{ver}"] = os.path.relpath(pj, ver_root)
                for srv in meta.get("mcpServers") or {}:
                    out[f"plugin:{name}:mcp:{srv}"] = os.path.relpath(pj, ver_root)
    # skills: any SKILL.md outside node_modules
    for dirpath, dirs, files in os.walk(ver_root):
        dirs[:] = [d for d in dirs if d != "node_modules"]
        if "SKILL.md" in files:
            rel = os.path.relpath(dirpath, ver_root)
            out[f"skill:{os.path.basename(dirpath)}"] = rel
    # commands dirs
    for dirpath, dirs, files in os.walk(ver_root):
        dirs[:] = [d for d in dirs if d != "node_modules"]
        if os.path.basename(dirpath) == "commands":
            for fn in files:
                if fn.endswith(".md"):
                    rel = os.path.relpath(os.path.join(dirpath, fn), ver_root)
                    out[f"command:{os.path.splitext(fn)[0]}"] = rel
    # 2.x gemini policies + bundled third-party
    pold = os.path.join(ver_root, "gemini", "policies")
    if os.path.isdir(pold):
        for fn in sorted(os.listdir(pold)):
            if fn.endswith(".toml"):
                out[f"policy:{os.path.splitext(fn)[0]}"] = os.path.join(
                    "gemini", "policies", fn
                )
    bp = os.path.join(
        ver_root, "gemini", "bundled", "third_party", "bundled-packages.json"
    )
    if os.path.isfile(bp):
        try:
            with open(bp) as fh:
                pk = json.load(fh)
            bp_rel = "gemini/bundled/third_party/bundled-packages.json"
            for k, v in pk.items() if isinstance(pk, dict) else []:
                out[f"bundled_pkg:{k}@{v}"] = bp_rel
        except (OSError, json.JSONDecodeError):
            pass
    return out


def cat_engine(ver_root, manifest):
    eng = {
        "engine": manifest.get("engine"),
        "app_name": (manifest.get("app") or {}).get("name"),
        "app_version": (manifest.get("app") or {}).get("version"),
        "app_asar_sha256": (manifest.get("app_asar") or {}).get("sha256"),
        "host_binary_sha256": ((manifest.get("host") or {}).get("binary") or {}).get(
            "sha256"
        ),
        "host_pkg_version": ((manifest.get("host") or {}).get("control") or {}).get(
            "Version"
        ),
        "components": {},
    }
    # component identities: top-level dir package.json + anchor engine files
    for f in manifest.get("files", []) or []:
        p = f.get("p", "")
        parts = p.split("/")
        if (
            len(parts) == 2
            and parts[0] in BINARY_DIRS
            and parts[1] in ("package.json", ".bundle-meta.json")
        ):
            rel = os.path.join(ver_root, p)
            try:
                with open(rel) as fh:
                    meta = json.load(fh)
            except (OSError, json.JSONDecodeError):
                meta = {}
            name = meta.get("name") or parts[0]
            ver = meta.get("version") or "?"
            eng["components"][parts[0]] = f"{name}@{ver}"
    # anchor engine binaries/bundles at depth 2 (path -> sha16)
    for f in manifest.get("files", []) or []:
        p = f.get("p", "")
        parts = p.split("/")
        if (
            len(parts) == 2
            and parts[0] in BINARY_DIRS
            and (f.get("s", 0) or 0) > 1_000_000
            and not parts[1].endswith((".json", ".md", ".toml"))
        ):
            eng["components"][p] = "sha256:" + f.get("h", "")[:16]
    # electron hint
    with suppress(OSError, subprocess.SubprocessError, UnicodeDecodeError):
        hits = _run_rg(
            [r"Electron/[0-9]+\.[0-9]+\.[0-9]+"], [os.path.join(ver_root, "app", "out")]
        )
        if hits:
            eng["electron_hint"] = min(hits)
    return eng


def cat_bundled_tools(manifest):
    out = {}
    for k, v in (manifest.get("bundled_tools") or {}).items():
        out[f"{k}: {v}"] = "MANIFEST.json"
    return out


def cat_native_modules(manifest):
    out = {}
    for m in manifest.get("native_modules", []) or []:
        p, h = m.get("p"), m.get("h", "")
        if p:
            out[f"{p}#{h[:16]}"] = "MANIFEST.json"
    return out


def cat_deps(manifest, ver_root):
    deps = (manifest.get("app") or {}).get("deps")
    if deps is None:
        try:
            with open(os.path.join(ver_root, "app", "package.json")) as fh:
                pj = json.load(fh)
            deps = pj.get("dependencies") or {}
        except (OSError, json.JSONDecodeError):
            deps = {}
    return deps or {}


# ---------------------------------------------------------------------------
# assemble + validate
# ---------------------------------------------------------------------------

CATEGORIES = [
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
    "engine",
    "deps",
]


def extract(ver):
    ver_root = os.path.join(ROOT, "extracted", ver)
    if not os.path.isdir(ver_root):
        msg = f"missing {ver_root}"
        raise SystemExit(msg)
    mpath = os.path.join(ver_root, "MANIFEST.json")
    manifest = {}
    if os.path.isfile(mpath):
        with open(mpath) as fh:
            manifest = json.load(fh)

    rg_dirs = [
        os.path.join(ver_root, d)
        for d in TEXT_DIRS
        if os.path.isdir(os.path.join(ver_root, d))
    ]
    rg_dirs += [
        os.path.join(ver_root, d)
        for d in TEXT_EXTRA_DIRS
        if os.path.isdir(os.path.join(ver_root, d))
    ]
    # root-level yml/yaml files (app-update.yml etc.)
    root_files = [
        os.path.join(ver_root, f)
        for f in os.listdir(ver_root)
        if f.endswith(ROOT_GLOBS) and os.path.isfile(os.path.join(ver_root, f))
    ]
    rg_dirs += root_files

    t0 = time.time()
    bins = _find_binaries(ver_root)
    with ThreadPoolExecutor(max_workers=4) as ex:
        str_files = list(ex.map(lambda b: _strings_cache(b, ver), bins))
    t_strings = time.time() - t0

    cats = {}
    prov = {}
    t1 = time.time()
    for name, fn in [
        ("models", lambda: cat_models(ver_root, rg_dirs, str_files)),
        ("endpoints", lambda: cat_endpoints(rg_dirs, str_files)),
        ("feature_flags", lambda: cat_feature_flags(rg_dirs, str_files)),
        ("env_vars", lambda: cat_env_vars(rg_dirs, str_files)),
        ("plans", lambda: cat_plans(rg_dirs, str_files)),
        ("acp_methods", lambda: cat_acp_methods(rg_dirs, str_files)),
        ("ipc_channels", lambda: cat_ipc_channels(ver_root)),
        ("plugins_skills", lambda: cat_plugins_skills(ver_root)),
        ("bundled_tools", lambda: cat_bundled_tools(manifest)),
        ("native_modules", lambda: cat_native_modules(manifest)),
        ("engine", lambda: cat_engine(ver_root, manifest)),
        ("deps", lambda: cat_deps(manifest, ver_root)),
    ]:
        res = fn()
        if name in ("engine", "deps"):
            cats[name] = res
            continue
        if name == "plugins_skills":
            prov[name] = res
            cats[name] = sorted(res)
            continue
        prov[name] = res
        cats[name] = sorted(res)
    t_extract = time.time() - t1

    counts = {c: len(cats[c]) for c in CATEGORIES}
    return {
        "version": ver,
        "engine": manifest.get("engine"),
        "generated": manifest.get("generated"),
        "counts": counts,
        "categories": cats,
        "provenance": prov,
        "_perf": {
            "strings_s": round(t_strings, 2),
            "extract_s": round(t_extract, 2),
            "binaries": [os.path.relpath(b, ver_root) for b in bins],
        },
    }


def validate(path):
    schema_path = os.path.join(ROOT, "tools", "signature_schema.json")
    with open(schema_path) as fh:
        schema = json.load(fh)
    with open(path) as fh:
        data = json.load(fh)
    errs = [f"missing required key: {k}" for k in schema["required"] if k not in data]
    if "version" in data and not isinstance(data["version"], str):
        errs.append("version must be string")
    cats = data.get("categories", {})
    list_cats = schema["properties"]["categories"]["list_categories"]
    obj_cats = schema["properties"]["categories"]["object_categories"]
    for c in list_cats:
        if c not in cats:
            errs.append(f"missing category: {c}")
        elif not isinstance(cats[c], list):
            errs.append(f"category {c} must be list")
        elif not all(isinstance(x, str) for x in cats[c]):
            errs.append(f"category {c} must be list[str]")
        elif cats[c] != sorted(cats[c]):
            errs.append(f"category {c} not sorted")
        elif len(set(cats[c])) != len(cats[c]):
            errs.append(f"category {c} has dupes")
    for c in obj_cats:
        if c not in cats:
            errs.append(f"missing category: {c}")
        elif not isinstance(cats[c], dict):
            errs.append(f"category {c} must be object")
    counts = data.get("counts", {})
    errs += [
        f"counts.{c}={counts.get(c)} != {len(cats[c])}"
        for c in list_cats + obj_cats
        if c in cats and counts.get(c) != len(cats[c])
    ]
    return errs


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    if args[0] == "--validate":
        errs = validate(args[1])
        if errs:
            for e in errs:
                print("INVALID:", e)
            return 1
        print(f"{args[1]}: schema-valid")
        return 0
    ver = args[0]
    out = os.path.join(ROOT, "signatures", f"{ver}.json")
    do_print = "--print" in args
    if "--out" in args:
        out = args[args.index("--out") + 1]
    sig = extract(ver)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(sig, f, indent=1, sort_keys=True, ensure_ascii=False)
        f.write("\n")
    print(f"{ver}: wrote {out}")
    print(" counts:", json.dumps(sig["counts"], sort_keys=True))
    print(" perf:", json.dumps(sig["_perf"], sort_keys=True)[:400])
    errs = validate(out)
    if errs:
        for e in errs:
            print("INVALID:", e)
        return 1
    print(" schema-valid")
    if do_print:
        print(json.dumps(sig, indent=1, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
