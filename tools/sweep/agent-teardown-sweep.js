export const meta = {
  name: 'agent-teardown-sweep',
  description: 'Acquire ~50 closed-source agentic coding clients, extract bundles, sweep for hidden workspace-upload machinery (ZCode pattern), adversarially verify hits, grade each target',
  phases: [
    { title: 'Acquire', detail: 'locate download URL, fetch installer, extract JS bundles' },
    { title: 'Scan', detail: '7 indicator-family greps per extracted target' },
    { title: 'Verify', detail: 'skeptic lenses over suspicious hits' },
    { title: 'DeepDive', detail: '4 end-to-end trace lanes per hot target' },
    { title: 'Critic', detail: 'completeness gap review' },
  ],
}

const ROOT = process.env.SWEEP_ROOT || '<corpus>'
const ASAR = ROOT + '/tools/node_modules/.bin/asar'

const RULES = `CONTEXT: We audit proprietary AI-coding clients for a HIDDEN WORKSPACE-UPLOAD mechanism.
Confirmed precedent (ZCode IDE, static teardown): on every prompt it tar.gz'd the ENTIRE workspace (later incl. .git/ and app config), AES-encrypted it, RSA-wrapped the AES key with a vendor public key, fetched OSS upload credentials from a vendor endpoint (/api/v1/snapshot/upload-credential), direct-uploaded via OSS PostObject, then registered the object via OSS callback. Invisible in UI; the only settings copy described it as a local "index"; real gate was server-side credential issuance.
Your job for this target: find or rule out the same pattern via STATIC ANALYSIS ONLY.
HARD RULES:
- Never run/install/login the app. Never send any network request other than downloading the official installer/package itself.
- Write ONLY under ${ROOT} (installers/, extracted/, reports/). NEVER write to /tmp (it is nearly full).
- Installer cap 1GB, extracted tree cap 2GB. If exceeded, stop, clean up, report blocker.
- Clean up partial files on failure. Be honest about blockers — do NOT bypass logins/paywalls.
- rg, 7z, ar, jq, node, npm available. asar at ${ASAR}. No unsquashfs (for AppImage use './x --appimage-extract' with cwd inside your extract dir).`

const TARGETS = [
  { id: 'cursor', name: 'Cursor', vendor: 'Anysphere', kind: 'electron-ide', hints: 'cursor.com downloader; known suspect endpoint repo42.cursor.sh; also cursor.sh/cursorapi.com domains; check Projects sync feature' },
  { id: 'qoder', name: 'Qoder', vendor: 'Alibaba', kind: 'electron-ide', hints: 'qoder.com; aliyuncs.com OSS; RepoWiki/Quest server-side codebase indexing; CN vs intl builds if distinguishable' },
  { id: 'codebuddy-ide', name: 'CodeBuddy IDE', vendor: 'Tencent', kind: 'electron-ide', hints: 'codebuddy.ai / copilot.tencent.com; myqcloud.com COS; #Codebase indexing + Typed Memory + cloud MCP' },
  { id: 'comate-ide', name: 'Comate AI IDE (Zulu)', vendor: 'Baidu', kind: 'electron-ide', hints: 'comate.baidu.com; bcebos.com/baidubce; markets data-stays-onshore; codebase index + private knowledge base' },
  { id: 'trae-intl', name: 'Trae intl', vendor: 'ByteDance', kind: 'electron-ide', hints: 'trae.ai; byteoversea.com/volces.com/tos- endpoints; telemetry controversy documented; indexing upload pipeline itself unexamined' },
  { id: 'devin-desktop', name: 'Devin Desktop (ex-Windsurf)', vendor: 'Cognition', kind: 'electron-ide', hints: 'windsurf.com/devin; renamed via OTA 2026-06; post-acquisition infra unknown' },
  { id: 'antigravity', name: 'Antigravity', vendor: 'Google', kind: 'electron-ide', hints: 'antigravity.google; IDE + 2.0 desktop app + CLI; googleapis storage' },
  { id: 'kiro', name: 'Kiro', vendor: 'AWS', kind: 'electron-ide', hints: 'kiro.dev; Code-OSS base; amazonaws endpoints' },
  { id: 'codearts-ide', name: 'CodeArts IDE', vendor: 'Huawei', kind: 'electron-ide', hints: 'huaweicloud.com codearts; .deb; obs.myhuaweicloud; codebase index billed per-file-quota' },
  { id: 'codeflicker', name: 'CodeFlicker', vendor: 'Kuaishou', kind: 'electron-ide', hints: 'codeflickeride.com; brand-new, zero public audit' },
  { id: 'astudio', name: 'AStudio', vendor: 'iFlytek', kind: 'electron-ide', hints: 'released 2026-09-15; self-built ACode harness connects local projects' },
  { id: 'kimi-desktop', name: 'Kimi Code Desktop', vendor: 'Moonshot', kind: 'electron-ide', hints: 'released 2026-09-21; CLI is open-source but Desktop is not — the diff IS the risk' },
  { id: 'minimax-desktop', name: 'MiniMax Code Desktop', vendor: 'MiniMax', kind: 'electron-ide', hints: 'desktop app deliberately closed while CLI open-sourced; local project access + computer use + long-term memory' },
  { id: 'pieces', name: 'Pieces', vendor: 'Pieces', kind: 'electron-ide', hints: 'pieces.app; markets your-code-never-leaves while auto-capturing workflow context + optional cloud sync — claim verification target. IMPORTANT: the desktop app is only a Flutter UI client to a local companion service PiecesOS (http://0.0.0.0:5323) which does the actual capture/sync — the snap package pieces-os (~1.9GB, snapcraft download https://api.snapcraft.io/api/v1/snaps/download/kcEQ2ZezK6F1pXhVPYLhopWADuWDUawc_119.snap or flatpak repo builds.pieces.app) is the real audit target. CAP OVERRIDE for this target only: installer up to 2.5GB allowed; extract the squashfs with 7z x into extracted/pieces-os/ and point bundle_files/extract_dir there.' },
  { id: 'warp', name: 'Warp', vendor: 'Warp', kind: 'desktop-native', hints: 'warp.dev; closed Rust terminal; Oz cloud agents; mandatory-login history' },
  { id: 'inscode', name: 'InsCode agent', vendor: 'CSDN', kind: 'desktop-native', hints: 'agent.inscode.net; ~30MB native client; scans other local agent assets (claims read-only + credential denylist — verify)' },
  { id: 'crabcode', name: 'CrabCode', vendor: 'Acosmi', kind: 'desktop-native', hints: 'github.com/acosmi/crabcode releases; closed TUI+GUI binary; behavior pushed dynamically via Acosmi SDK' },
  { id: 'claude-code', name: 'Claude Code', vendor: 'Anthropic', kind: 'npm-cli', hints: 'npm @anthropic-ai/claude-code; obfuscated blob; BASELINE — document its telemetry egress to define normal' },
  { id: 'copilot-cli', name: 'GitHub Copilot CLI', vendor: 'GitHub', kind: 'npm-cli', hints: 'npm @github/copilot or gh extension dist' },
  { id: 'amp', name: 'Amp', vendor: 'Sourcegraph', kind: 'npm-cli', hints: 'npm @sourcegraph/amp' },
  { id: 'auggie', name: 'auggie', vendor: 'Augment Code', kind: 'npm-cli', hints: 'npm @augmentcode/auggie; enterprise context-engine indexing' },
  { id: 'droid', name: 'Droid', vendor: 'Factory', kind: 'npm-cli', hints: 'factory.ai droid CLI; check npm or install script' },
  { id: 'rovo', name: 'Rovo Dev', vendor: 'Atlassian', kind: 'npm-cli', hints: 'Atlassian rovo dev CLI; acli or npm package' },
  { id: 'zencoder', name: 'Zencoder', vendor: 'Zencoder', kind: 'npm-cli', hints: 'zencoder cli or IDE plugin bundles' },
  { id: 'qodo', name: 'Qodo', vendor: 'Qodo', kind: 'npm-cli', hints: 'qodo command / qodo-gen' },
  { id: 'codebuddy-cli', name: 'CodeBuddy CLI', vendor: 'Tencent', kind: 'npm-cli', hints: 'npm package; same evidence chain as codebuddy-ide' },
  { id: 'qoder-cli', name: 'Qoder CLI', vendor: 'Alibaba', kind: 'npm-cli', hints: 'npm package; same evidence chain as qoder' },
  { id: 'codearts-cli', name: 'codearts CLI', vendor: 'Huawei', kind: 'npm-cli', hints: 'huawei codearts cli/tui' },
  { id: 'tabnine', name: 'Tabnine', vendor: 'Tabnine', kind: 'npm-cli', hints: 'Tabnine CLI + plugins; markets local/air-gapped — verify claim vs wire behavior' },
  { id: 'copilot-chat', name: 'Copilot Chat ext', vendor: 'Microsoft', kind: 'vsix', hints: 'VS Marketplace item GitHub.copilot-chat; agent mode + cloud workspace features' },
  { id: 'jb-ai', name: 'JetBrains AI/Junie', vendor: 'JetBrains', kind: 'vsix', hints: 'JetBrains Marketplace AI Assistant / Junie plugin zip → jars; strings+grep literals in .class files' },
  { id: 'gitlab-duo', name: 'GitLab Duo ext', vendor: 'GitLab', kind: 'vsix', hints: 'VS Marketplace gitlab.gitlab-workflow duo agent' },
  { id: 'qodo-gen', name: 'Qodo Gen ext', vendor: 'Qodo', kind: 'vsix', hints: 'VS Marketplace qodo extension' },
  { id: 'lingma', name: 'Tongyi Lingma ext', vendor: 'Alibaba', kind: 'vsix', hints: 'VS Marketplace alibaba-cloud tongyi-lingma' },
  { id: 'raccoon', name: 'Raccoon ext', vendor: 'SenseTime', kind: 'vsix', hints: '商汤代码小浣熊 VS Code/JetBrains plugin' },
  { id: 'joycode', name: 'JoyCode ext', vendor: 'JD', kind: 'vsix', hints: '京东 JoyCode plugin; private knowledge-base upload surface' },
  { id: 'fitten', name: 'Fitten Code ext', vendor: 'Fitten', kind: 'vsix', hints: 'VS Marketplace fitten code' },
  { id: 'aixcoder', name: 'aiXcoder ext', vendor: 'aiXcoder', kind: 'vsix', hints: 'VS Marketplace aixcoder' },
  { id: 'codefuse', name: 'CodeFuse ext', vendor: 'Ant Group', kind: 'vsix', hints: '蚂蚁 codefuse plugin; model open but plugin closed' },
  { id: 'iflycode', name: 'iFlyCode ext', vendor: 'iFlytek', kind: 'vsix', hints: '讯飞 iflycode plugin' },
  { id: 'blackbox', name: 'Blackbox ext', vendor: 'Blackbox', kind: 'vsix', hints: 'VS Marketplace blackbox extension' },
  { id: 'bito', name: 'Bito ext', vendor: 'Bito', kind: 'vsix', hints: 'VS Marketplace bito extension' },
  { id: 'codegpt', name: 'CodeGPT ext', vendor: 'Judini', kind: 'vsix', hints: 'VS Marketplace CodeGPT extension' },
  { id: 'codebuddy-ext', name: 'CodeBuddy ext', vendor: 'Tencent', kind: 'vsix', hints: 'VS Marketplace tencent codebuddy' },
  { id: 'kepler', name: 'Kepler', vendor: 'GitKraken', kind: 'desktop-native', hints: 'gitkraken.dev/kepler or gitkraken.com; orchestrates other agents sessions — sees all threads' },
]

const FAMILIES = [
  { key: 'pack', desc: 'workspace packing/serialization before upload', lits: ['createGzip', 'gzip', 'tar-stream', 'adm-zip', 'archiver', 'jszip', 'snapshot', 'checkpoint', 'packWorkspace', 'workspaceSnapshot', 'compress', 'zlib', 'createTar', 'untar', 'tarball', '.tar.gz', 'pack('] },
  { key: 'crypto', desc: 'hybrid encryption / key-wrap of payload', lits: ['aes-256-ctr', 'aes-256-gcm', 'aes-256-cbc', 'aes-128', 'rsa-oaep', 'rsa-', 'publicEncrypt', 'privateDecrypt', 'keyWrap', 'wrapKey', 'SPKI', 'spki', 'publicKeyPem', '-----BEGIN PUBLIC KEY-----', 'generateKey', 'crypto.subtle', 'hybrid', 'envelope', 'encryptKey', 'sessionKey'] },
  { key: 'cloud', desc: 'object-storage direct upload + STS credential', lits: ['aliyuncs', 'PostObject', 'x-oss', 'OSS', 'cos.ap-', 'myqcloud', 'PutObject', 'putObject', 's3.', 'amazonaws', 'storage.googleapis', 'googleapis', 'obs.', 'myhuaweicloud', 'kodo', 'qiniu', 'bcebos', 'baidubce', 'volces', 'byteoversea', 'tos-', 'presigned', 'upload-credential', 'uploadCredential', 'SecurityToken', 'securityToken', 'STS', 'sts.', 'callback', 'Callback', 'multipart', 'FormData', 'form-data', 'signature', 'Signature', 'policy', 'Policy'] },
  { key: 'egress', desc: 'egress endpoints, telemetry & upload APIs', lits: ['/api/', '/v1/', '/v2/', 'upload', 'ingest', 'telemetry', 'analytics', 'statsig', 'sentry', 'amplitude', 'segment', 'posthog', 'datadog', 'mixpanel', 'track', 'metric', 'report', 'batch', 'beacon', 'collect', 'events', '/log', 'domain'] },
  { key: 'index', desc: 'workspace traversal / codebase indexing machinery', lits: ['indexing', 'index', 'codebase', 'codeBase', 'workspace', 'repoWiki', 'RepoWiki', 'repowiki', 'embedding', 'embed', 'readdir', 'walkdir', 'walk', 'ripgrep', 'glob', 'gitignore', 'ignore', '.git', 'tree-sitter', 'ctags', 'chunk', 'fileHash', 'sha256', 'md5', 'digest', 'manifest', 'fileList', 'scan'] },
  { key: 'consent', desc: 'consent gating, settings keys, UI disclosure', lits: ['Enabled', 'enabled', 'telemetry', 'privacy', 'Privacy', 'optOut', 'opt-out', 'optout', 'consent', 'Consent', 'anonymous', 'share', 'sync', 'indexingEnabled', 'improve', 'experience', 'Experience', 'dataCollection', 'collection', 'settings', 'toggle', 'allow', 'disclosure'] },
  { key: 'urls', desc: 'URL literal sweep — extract every https?:// literal and flag upload-shaped ones', lits: ['https://', 'http://', 'wss://'] },
]

const LANES = [
  { key: 'pipeline', desc: 'end-to-end trace: capture trigger → pack → encrypt → credential issuance → upload → registration/callback. Produce the chain with file:line evidence at each hop. Answer: does workspace content actually leave the machine?' },
  { key: 'consent', desc: 'consent-truth: find every UI string / settings key that describes this feature. Does a toggle actually gate the upload path? What is the default? Does UI copy honestly describe server upload?' },
  { key: 'scope', desc: 'scope: exactly what enters the package — file filters, size caps, .git inclusion, secrets/credentials, app config, conversation content, paths. Quote filter lists and deny/allow rules.' },
  { key: 'exfil', desc: 'exfil mechanics: which endpoint issues upload credentials, what auth attaches, what callback/register call reports the object, who can decrypt (symmetric vs public-key wrap).' },
  { key: 'altpaths', desc: 'egress census: enumerate EVERY distinct channel that sends user/workspace-derived data to vendor infra — telemetry events, diagnostics/log bundles, crash reports, sync RPCs, feedback forms, share/export features, update checks carrying payloads. For each: trigger, exact content, endpoint, gate. The goal is a complete inventory, not just the main pipeline.' },
]

const ACQUIRE_SCHEMA = {
  type: 'object', required: ['target', 'status'], properties: {
    target: { type: 'string' },
    status: { type: 'string', enum: ['extracted', 'downloaded-no-extract', 'gated', 'not-found', 'platform-blocked', 'error'] },
    version: { type: 'string' },
    installer_path: { type: 'string' },
    extract_dir: { type: 'string' },
    bundle_files: { type: 'array', items: { type: 'string' } },
    method: { type: 'string' },
    blocker: { type: 'string' },
    notes: { type: 'string' }
  }
}

const SCAN_SCHEMA = {
  type: 'object', required: ['target', 'family', 'hits', 'summary'], properties: {
    target: { type: 'string' }, family: { type: 'string' },
    hits: {
      type: 'array', items: {
        type: 'object', required: ['file', 'indicator', 'assessment', 'suspicious'], properties: {
          file: { type: 'string' }, line: { type: 'integer' }, indicator: { type: 'string' }, snippet: { type: 'string' },
          assessment: { type: 'string' }, suspicious: { type: 'boolean' }
        }
      }
    },
    summary: { type: 'string' }
  }
}

const VERIFY_SCHEMA = {
  type: 'object', required: ['lens', 'refuted', 'reason'], properties: {
    lens: { type: 'string' }, refuted: { type: 'boolean' },
    reason: { type: 'string' },
    per_hit: { type: 'array', items: { type: 'object', properties: { hit: { type: 'string' }, verdict: { type: 'string' }, note: { type: 'string' } } } }
  }
}

const LANE_SCHEMA = {
  type: 'object', required: ['lane', 'finding', 'upload_pipeline', 'confidence'], properties: {
    lane: { type: 'string' }, finding: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' } },
    upload_pipeline: { type: 'boolean' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
  }
}

const acquirePrompt = t => `${RULES}

TASK: acquire + extract "${t.name}" (${t.vendor}), kind=${t.kind}. Hints: ${t.hints}

Recipe by kind:
- electron-ide: find the official LINUX x64 installer (prefer .deb/.tar.gz/.zip; AppImage last). WebSearch/WebFetch the vendor site or docs for the direct URL; try stable CDN endpoints. Download to ${ROOT}/installers/${t.id}/. Extract: .deb → ar x + tar xf data.tar.*; .zip/.tar.gz → 7z x; AppImage → chmod +x and run './x --appimage-extract' with cwd=${ROOT}/extracted/${t.id}. Then find resources/app.asar (or app-64.asar etc.) → ${ASAR} extract it into extracted/${t.id}/app-asar/. List the main JS bundles (out/**/*.js, dist/**, workbench*, main.js, index.js etc., and any nested .asar).
- npm-cli: 'npm view <pkg> dist.tarball' or 'npm pack <pkg> --pack-destination ${ROOT}/installers/${t.id}/' → tar xzf into extracted/${t.id}/. If package name unknown, WebSearch for the official install command.
- vsix: VS Marketplace public endpoint https://marketplace.visualstudio.com/_apis/public/gallery/publishers/{publisher}/vsextensions/{extension}/{version}/vspackage works without auth; or plugins.jetbrains.com download for JetBrains (zip of jars — list jar paths, literals inside .class are still greppable). Unzip into extracted/${t.id}/.
- desktop-native: download official linux binary/package (or note if only macOS/Windows exists → status=platform-blocked). Extract what you can; list binary paths.
If the vendor is macOS/Windows-only → status=platform-blocked. If download needs login/purchase → status=gated. If you cannot locate an official URL after honest effort → status=not-found.
Report via schema: status, version, extract_dir, bundle_files (up to 30 most relevant paths: main bundles, anything named like index/upload/snapshot/sync), method, blocker, notes.`

const scanPrompt = (t, f, acq) => `${RULES}

TASK: indicator-family scan on extracted client "${t.name}" (${t.vendor}).
extract_dir: ${acq.extract_dir}
Family: ${f.key} — ${f.desc}
Literals: ${f.lits.join(' | ')}

Vendor domain hints (for context): ${t.hints}
Main bundles reported at acquire time: ${(acq.bundle_files || []).slice(0, 15).join(' | ')}

Method:
1. rg -F -n -i with the literals over extract_dir (skip node_modules of bundled deps ONLY if clearly vendored; keep app/out, dist, extension, resources, jars/binaries via strings+rg -a).
2. For the strongest ~15 hits, read surrounding context (~40 lines) in the matched file.
3. Classify each: SUSPICIOUS = plausibly part of capture→pack→encrypt→credential→upload→register pipeline OR egress of workspace/file content to vendor infra. BENIGN = auto-updater zips, vendored SDKs with no app caller, test fixtures, comments, UI-only strings, OS keychain crypto, crash reporters that send only stack traces.
4. For family 'urls': extract distinct URL literals (rg -o -N 'https?://[A-Za-z0-9._~:/?#@!$&()*+,;=%-]+'), dedupe, and flag only those that look like upload/telemetry/indexing endpoints (paths containing upload|ingest|snapshot|index|collect|telemetry|event|batch|sync|report|credential|sts|token). Report vendor-infra domains separately from public docs/homepage noise.
Return ≤25 hits via schema, with file path (relative to extract_dir), line, literal, short snippet, your assessment, suspicious flag. summary: 2-3 sentences on this family's overall picture.`

const verifyPrompt = (t, lens, acq, hits) => `${RULES}

TASK: adversarial verification of suspicious hits for "${t.name}" (${t.vendor}), extract_dir: ${acq.extract_dir}
Your lens: ${lens === 'refute' ? 'REFUTE — assume each hit is noise and try hard to kill it: prove it is a vendored SDK with no app caller, dead code, test fixture, auto-updater, crash reporter, or standard auth crypto. Only leave standing what you cannot refute.' : 'EVIDENCE — for each hit, independently build the strongest case that it IS part of a workspace-content egress path: find callers, trace data flow from workspace files to network calls, identify the receiving endpoint.'}

Suspicious hits to judge:
${hits.slice(0, 20).map((h, i) => `${i + 1}. [${h.file}:${h.line || '?'}] ${h.indicator} — ${h.assessment}`).join('\n')}

Verify against the actual files — grep and read, do not take the assessments on faith.
Return schema: lens, refuted (true if the suspicious set collapses to benign under your lens), reason, per_hit verdicts.`

const lanePrompt = (t, l, acq, hits) => `${RULES}

TASK: deep-dive lane on "${t.name}" (${t.vendor}), extract_dir: ${acq.extract_dir}
Lane: ${l.key} — ${l.desc}
Already-flagged hits to start from:
${hits.slice(0, 15).map((h, i) => `${i + 1}. [${h.file}:${h.line || '?'}] ${h.indicator} — ${h.assessment}`).join('\n')}

Trace thoroughly — follow imports/callers across bundle files, not just the hit file. Minified code: use rg for identifiers, read generously.
Return schema: lane, finding (concrete narrative with the actual mechanism or definitive absence), evidence (file:line strings), upload_pipeline (true ONLY if you traced workspace/user content leaving to vendor infra — not telemetry events, not crash stacks), confidence.`

const CRITIC_SCHEMA = {
  type: 'object', required: ['gaps', 'notes'], properties: {
    gaps: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' }
  }
}

log(`teardown sweep: ${TARGETS.length} targets, low-concurrency batches acquire→scan(7)→verify→deepdive`)

const chunks = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o }

const targetPipeline = batch => pipeline(batch,
  async (t) => {
    const a = await agent(acquirePrompt(t), { label: `acq:${t.id}`, phase: 'Acquire', schema: ACQUIRE_SCHEMA })
    if (a) a._id = t.id
    return a
  },
  async (acq, t) => {
    if (!acq || acq.status !== 'extracted' || !acq.extract_dir) return { tid: t.id, acq, scans: [], suspicious: [], votes: [], lanes: [], verdict: 'not-acquired' }
    const scans = []
    for (const grp of chunks(FAMILIES, 2)) {
      const part = (await parallel(grp.map(f => () =>
        agent(scanPrompt(t, f, acq), { label: `scan:${t.id}:${f.key}`, phase: 'Scan', schema: SCAN_SCHEMA })
      ))).filter(Boolean)
      scans.push(...part)
    }
    const suspicious = scans.flatMap(s => (s.hits || []).filter(h => h.suspicious).map(h => ({ ...h, family: s.family })))
    return { tid: t.id, acq, scans, suspicious }
  },
  async (sc, t) => {
    if (!sc) return null
    if (!sc.suspicious.length) return { ...sc, votes: [], lanes: [], verdict: sc.acq && sc.acq.status === 'extracted' ? 'clean-scan' : 'not-acquired' }
    const votes = (await parallel([
      () => agent(verifyPrompt(t, 'refute', sc.acq, sc.suspicious), { label: `vfy:${t.id}:refute`, phase: 'Verify', schema: VERIFY_SCHEMA }).then(v => v && ({ ...v, _lens: 'refute' })),
      () => agent(verifyPrompt(t, 'evidence', sc.acq, sc.suspicious), { label: `vfy:${t.id}:evidence`, phase: 'Verify', schema: VERIFY_SCHEMA }).then(v => v && ({ ...v, _lens: 'evidence' })),
    ])).filter(Boolean)
    return { ...sc, votes }
  },
  async (v, t) => {
    if (!v) return null
    if (v.verdict) return v
    const rv = (v.votes || []).filter(x => x._lens === 'refute')
    const ev = (v.votes || []).filter(x => x._lens === 'evidence')
    const refuted = rv.length && ev.length && rv.every(x => x.refuted) && ev.every(x => x.refuted)
    if (refuted) return { ...v, lanes: [], verdict: 'refuted-clean' }
    const lanes = []
    for (const grp of chunks(LANES, 2)) {
      const part = (await parallel(grp.map(l => () =>
        agent(lanePrompt(t, l, v.acq, v.suspicious), { label: `deep:${t.id}:${l.key}`, phase: 'DeepDive', schema: LANE_SCHEMA })
      ))).filter(Boolean)
      lanes.push(...part)
    }
    const traced = lanes.some(l => l.upload_pipeline === true && l.confidence !== 'low')
    return { ...v, lanes, verdict: traced ? 'confirmed-upload-path' : 'plausible' }
  }
)

const results = []
for (const batch of chunks(TARGETS, 4)) {
  const part = await targetPipeline(batch)
  results.push(...part)
  log(`batch done: ${results.length}/${TARGETS.length} targets processed`)
}

const verdicts = results.map((r, i) => {
  const t = TARGETS[i] || {}
  if (!r) return { id: t.id, name: t.name, vendor: t.vendor, status: 'agent-null', verdict: 'error' }
  return {
    id: t.id,
    name: t.name,
    vendor: t.vendor,
    status: r.acq ? r.acq.status : 'agent-null',
    blocker: r.acq ? r.acq.blocker : undefined,
    version: r.acq ? r.acq.version : undefined,
    extract_dir: r.acq ? r.acq.extract_dir : undefined,
    verdict: r.verdict,
    suspicious_hits: (r.suspicious || []).length,
    hit_summary: (r.scans || []).map(s => s.family + ': ' + (s.hits || []).filter(h => h.suspicious).length + ' susp / ' + (s.hits || []).length).join('; '),
    lane_findings: (r.lanes || []).map(l => ({ lane: l.lane, pipeline: l.upload_pipeline, conf: l.confidence, finding: (l.finding || '').slice(0, 400), evidence: (l.evidence || []).slice(0, 6) })),
  }
})

phase('Critic')
const critic = await agent(`${RULES}

You are the completeness critic for a batch teardown sweep. Here are the per-target verdicts (JSON):
${JSON.stringify(verdicts.map(v => ({ id: v.id, status: v.status, verdict: v.verdict, susp: v.suspicious_hits })), null, 1)}

Identify gaps: acquisition failures that had a retryable path (wrong URL guess, missed mirror, alternate package name, macOS-only but Linux build exists elsewhere, VSIX via alternate marketplace route), suspicious targets under-verified, families that should have been scanned but weren't, obvious high-value targets missing from the list. Be concrete — each gap should name a target and the retry action.`,
  { label: 'critic', phase: 'Critic', schema: CRITIC_SCHEMA })

return { verdicts, critic, totals: { targets: TARGETS.length, acquired: verdicts.filter(v => v.status === 'extracted').length, suspicious: verdicts.filter(v => v.suspicious_hits > 0).length, confirmed: verdicts.filter(v => v.verdict === 'confirmed-upload-path').length, plausible: verdicts.filter(v => v.verdict === 'plausible').length } }
