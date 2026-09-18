# lane c6 — 3.9.1 → 3.12.3 (10 boundaries)

Scope: v3.9.1, v3.9.2, v3.10.0, v3.10.1, v3.10.2, v3.11.1, v3.11.2, v3.12.1, v3.12.2, v3.12.3 (3.9.0/3.11.0/3.12.0 never shipped). host_pkg build numbers in parentheses = `pipeline build` embedded in `app/out/main/index.js` (e.g. `var cv="pipeline-271558-34c163b6"`); build-meta at `extracted/<ver>/app/out/metadata/build-meta.json`.

## per-boundary findings

### v3.8.1 → v3.9.1 (build 5853) — Computer Use lands

- `diffs/3.8.1__3.9.1.md`: plugin `plugin:zcode-cua@0.5.10` + `skill:zcode-computer-use` + IPC `plugin:zcode-cua:computer-use`; ~25 `ZCODE_CUA_*` flags incl. gray-rollout set; deps `+@zcode/zcode-cua (catalog:)`, `+sharp 0.34.5`; native `+@img/sharp-linux-x64`.
- ACP `+6`: `tasks/{cancel,get,list,result}`, `permission_status`, `screen_capture_probe` (diffs file, acp_methods).
- IPC `+9`: `cua-permission-panel-state`, `get-cua-gray-enabled`, `cancel-cua-permission-onboarding`, `notify-cua-helper-permission-drag-ended`, `sync-active-task-session`, `bundled:zcode-app`; `-open-cua-accessibility-settings`.
- Internal repo leak: endpoint `https://dev.aminer.cn/codegeex/zcode-cua.git` (diffs file, endpoints; also `extracted/3.9.1/glm/packages/zcode-cua-plugin/package.json` repository field).
- Package matrix gains `.rpm` here (community intel; consistent with updater manifest formats later).
- models `+codegeex`.

### v3.9.1 → v3.9.2 (build 6069) — CUA mouse primitives

- `diffs/3.9.1__3.9.2.md`: ACP `+3` `mouse_down`, `mouse_up`, `move_to`; flag `-ZCODE_CUA_HELPER_ALLOW_DOWNGRADE`.
- deps: `browser-use 0.3.1→0.4.0`, `zcode-cua 0.5.10→0.5.12` (plugins_skills category).
- Changelog claims GLM-5.3-Flash — string `GLM-5.3-Flash` absent from entire `extracted/3.9.2` tree; first appears in files at `extracted/3.12.1/config/provider/zcode-builtin.json` (builtinModelIds). Server-side catalog only → REVIEW.

### v3.9.2 → v3.10.0 (build 6242) — rename + observability

- `diffs/3.9.2__3.10.0.md`: plugin id `zcode-cua→computer-use@0.5.13` (`skill:computer-use`, IPC `plugin:computer-use:computer-use`). Cosmetic only: dir stays `extracted/<ver>/glm/packages/zcode-cua-plugin/`, npm name stays `@zcode/zcode-cua-plugin`, `.zcode-plugin/plugin.json` `{name:"computer-use"}`.
- native `+koffi` (FFI for CUA native calls); deps `+4` OpenTelemetry (`@opentelemetry/*`), flag `+ZCODE_RENDERER_ACTION_TRACE_ENABLED`, IPC `+3` renderer-action-trace channels.
- endpoints `+oauth/cli/init`, `+zcode-plan/billing/{claim,preview}`; plans `+tier:off_peak`.
- deps bumps: `browser-use→0.4.1`, `document-skills→0.1.4`.

### v3.10.0 → v3.10.1 (build 6272, ~12h later) — i18n hotfix + full renderer re-bundle

- `diffs/3.10.0__3.10.1.md`: ALL-ZERO signature; zcode.cjs sha256 unchanged (`3597160465b67da2`).
- Git diff v3.10.0..v3.10.1 = 4886 files: every renderer modulepreload chunk rehashed + new `modulepreload-polyfill` chunk — bundler/toolchain-level re-bundle, not per-module edits.
- Real change found via mask-diff on `app/out/main/index.js`: CUA permission-window payload gains `locale:e.getLocale()` (i18n hotfix). Pipeline literal `pipeline-271558-34c163b6`→`pipeline-271785-5712af2e`; build-meta `Aug27→Aug28`, commit `34c163b6→5712af2e`.

### v3.10.1 → v3.10.2 (build 6414) — near-identical, real delta under rename cascade

- `diffs/3.10.1__3.10.2.md`: ALL-ZERO; zcode.cjs unchanged.
- Git diff = 44 files. `app/out/main/index.js` is pure metadata (version/commit/time literals). Styles chunk differs beyond hash-masking: identifier reshuffle + ~1.7KB net — consistent with changelog "subagent model-group display fix" but exact seed unpinned → REVIEW.
- build-meta `Aug28→Aug31`, commit `5712af2e→35824adf`.

### v3.10.2 → v3.11.1 (build 6745) — remote-runtime groundwork + ugrep pin

- `diffs/3.10.2__3.11.1.md` bundled_tools: **ugrep 7.5.0→7.8.4 lands HERE** (assigned anomaly — pinned boundary).
- flags `+11`: `ZCODE_REMOTE_HTTP_PROXY`, `ZCODE_REMOTE_NO_PROXY`, `ZCODE_REMOTE_PROVIDER_SYNC_{SESSION_CLOSED,STALE_SERVICE,STATE_CLEARED,SUPERSEDED}`, `ZCODE_REMOTE_RUNTIME_NETWORK_AUTHORITY`, `ZCODE_PLUGIN_SEED_INCOMPLETE`, `workspaceEnabled/Disabled`; env `+ZCODE_REMOTE_MEDIA_RANGE_PREVIEW_ENABLED`.
- IPC `+auth:zcode-jwt-invalid`. Feishu support QR link_token rotated (`f25o85c8…`→`47ag983c…`, endpoints category — content token, not code).
- `zcode.cjs` changes (`3597…`→`e9f1868c`) after 3-release freeze. Plugins `browser-use→0.4.2`, `computer-use→0.5.14` (last plugin version bump in range).
- Package matrix gains `.pkg.tar.zst` ~3.11.x (community intel; confirmed by manifest-format filter list in main bundle).

### v3.11.1 → v3.11.2 (build 6792) — pure rebuild churn, PROVEN

- `diffs/3.11.1__3.11.2.md`: ALL-ZERO incl. zcode.cjs sha. Assigned anomaly (a).
- 44-file git diff fully explained by rebuild metadata: host chunk embeds `var pn="3.11.x"`, `Ib=<buildCommitId>`, `Cb=<buildTime>` literals → vite content-hash cascade renames importer chunks. Verified: after masking `[A-Za-z0-9_-]{8}\.js` + version/commit/time literals, every renamed chunk pair is byte-identical (incl. 4.6MB styles chunk).
- Same-day rebuild: build-meta `Sep04 03:17 commit 87a07145` → `Sep04 08:04 commit 89817f5b` — second CI run of the same source state.

### v3.11.2 → v3.12.1 (build 7207) — provider-registry rewrite (largest boundary in range)

- `diffs/3.11.2__3.12.1.md`: models `681→296` (-526/+141), endpoints `-254/+28`, ACP `-10/+2`, IPC `+26/-7`, flags `-20/+18`.
- File-level: `model-providers/models_catalog_china_llm_zcode_2026-06-03.json` (137KB, schema `zcode.model-providers.v1`, 10 China providers) deleted → `config/provider/zcode-builtin.json` (150KB, `schemaVersion 1`, `revision 25`) with `providerConfigRules.templateRules` — 17 templates incl. first-party `openai`, `anthropic`, `xai`, `openrouter`, `opencode-zen-{responses,messages,chat}`; split `zai-api`/`zai-standard-api`, `bigmodel-api`/`bigmodel-standard-api`; coding-plan folded into access type. Rich `modelConfigRules{modelRules,modelApiRules,providerSiteRules,templateModelRules,builtinProviderModelRules}` carry per-model contextWindow/modalities/toolCall.
- deps `+@zcode/provider`, `+@zcode/provider-node` (`workspace:*`); ACP provider-mgmt methods migrate to IPC `builtin:*`/`account:*-plan`/`personal:updated`; IPC `openai:chat`/`openai:messages` removed; `process-monitor`→`resource-manager` rename.
- CUA gray flags removed → CUA effectively GA. `GLM-5.3-Flash` enters shipped files here (builtinModelIds). `zcode.cjs` `e9f1868c`→`5a80496a`.

### v3.12.1 → v3.12.2 (build 7410) — protocol/tooling expansion

- `diffs/3.12.1__3.12.2.md`: flags `+49/-1` — `*_ENV_KEY` cluster formalizing runtime env plumbing (`ZCODE_{HTTP,NO}_PROXY_ENV_KEY`, `ZCODE_REMOTE_*_ENV_KEY`, `ZCODE_CUA_*_ENV_KEY`, `ZCODE_TOOL_ENV_PASSTHROUGH_ENV_KEY`, `ZCODE_RUNTIME_ENV_KEY`, `ZCODE_{APP_VERSION,BUILD_COMMIT_ID,BUILD_TIME}*_ENV*`), `ZCODE_PROTOCOL_V4_WIRE_VERSION`, `ZCODE_RPC_{CLIENT_MODE,HOST_CAPABILITY}_HEADER`, `ZCODE_SOURCE_HEADERS`, streaming tool-input preview knobs, `ZCODE_PROCESS_DIAGNOSTIC_*` limits, `ZCODE_ARMS_RUM_ENDPOINT`, `ZCODE_OFFICIAL_PLUGIN_MARKETPLACE_ID`, `ZCODE_JWT_INVALID_BROADCAST_CHANNEL`.
- ACP `+4` `startup/storage*`; IPC `+2` `zcode:database-startup-{control,state}` (changelog: DB init upgrade). plans `+coding_plan`, `+start_plan`. models `+7` incl. `provider:opencode-go-{chat,messages,responses}` + endpoint `https://opencode.ai/zen/go/v1` (changelog: OpenCode Go; provider registry rev 25→28, 20 templates).
- `+https://zcode.invalid` — crash-capture sentinel `dP="https://zcode.invalid/local-crash-only"` in `extracted/3.12.2/app/out/main/index.js`, feeding summarizeCrashDumpAnnotations/persistArchivedCrashDump pipeline.
- `zcode.cjs` `5a80496a`→`da61b066`.

### v3.12.2 → v3.12.3 (build 7463, same-day +12h) — Linux auto-update fix

- `diffs/3.12.2__3.12.3.md`: signature shows only `-61 endpoints` — **EXTRACTION ARTIFACT** (see REVIEW). zcode.cjs unchanged (`da61b066`); real delta is the updater fix.
- `extracted/3.12.2/app/out/main/index.js`: `var F_=[".pkg.tar.zst",".rpm",".deb"]; function $_(e,t){return t!=="linux"?e:e.filter(r=>!F_.some(o=>r.url.toLowerCase().endsWith(o)))}` annotated `i($_,"filterManifestAutoUpdateFiles")` — on linux this stripped every package-format URL; if the manifest had only .deb/.rpm/.pkg.tar.zst entries, the update list went empty → auto-update silently broken for package installs (very plausibly since .rpm@3.9.1 / .pkg.tar.zst@3.11.x joined the matrix).
- `extracted/3.12.3/app/out/main/index.js`: replaced by `function G_(e){return e instanceof M_?[".appimage"]:e instanceof O_?[".deb"]:e instanceof W_?[".rpm"]:e instanceof L_?[".pkg.tar.zst",".pacman"]:null}` annotated `i(G_,"getLinuxUpdateExtensions")` + new `import{Provider,AppImageUpdater,DebUpdater,RpmUpdater,PacmanUpdater}from"electron-updater"` — artifact selection is now typed per-updater. Changelog's "Linux auto-update fix" confirmed in code.
- Feed plumbing (present since 3.12.2 at least): manifest endpoint `N_="/api/v1/releases/electron/manifest"` w/ platform/device_mid/channel params; bases `ci={domestic:"https://cdn.codegeex.cn/zcode/electron/releases",overseas:"https://cdn.zcode-ai.com/zcode/electron/releases"}` chosen via `isChineseLocale`+`resolveLocalTimeZone`; override env `ZCODE_UPDATE_FEED_URL` / flag `--zcode-update-feed-url` / `ZCODE_AUTO_UPDATE_DEV[_VERSION]`.
- build-meta `Sep16 02:49 commit 4e1c9d87` → `Sep16 14:59 commit d7f8ea37`.

## through-lines

- **CUA lifecycle**: gated landing @3.9.1 (gray flags + permission panel + sharp screenshots + internal repo leak) → mouse primitives @3.9.2 → public rename `zcode-cua`→`computer-use` + koffi FFI @3.10.0 → locale hotfix @3.10.1 → per-workspace plugin seeding @3.11.1 → gray flags removed = GA @3.12.1. Plugin version frozen at 0.5.14 from 3.11.1 on; directory/npm names never renamed (`glm/packages/zcode-cua-plugin`, `@zcode/zcode-cua-plugin`).
- **Provider consolidation**: one-shot rewrite @3.12.1 (catalog file swap + `workspace:*` provider packages + ACP→IPC migration); first-party openai/anthropic/xai/openrouter/opencode templates arrive quietly — `opencode-zen` ×3 @3.12.1 (silent), `opencode-go` ×3 @3.12.2 (announced).
- **Plan/billing vocabulary**: `tier:off_peak` @3.10.0 → offpeak-idle-plan IPC + `zcode.z.ai/api/v1/off-peak/anthropic` endpoint @3.12.1 → `plan:coding_plan`/`plan:start_plan` @3.12.2; `plan:service_tier` dropped at 3.12.1.
- **Remote development**: @3.11.1 `ZCODE_REMOTE_*` proxy/sync env cluster → @3.12.2 formalized as `*_ENV_KEY` plumbing + `PROTOCOL_V4_WIRE_VERSION` + RPC capability headers.
- **Observability**: OTel deps + renderer action trace @3.10.0 → process-diagnostic limits + ARMS RUM @3.12.2 → `zcode.invalid/local-crash-only` crash-dump pipeline @3.12.2.
- **Release cadence**: engine `glm/zcode.cjs` frozen on hotfix releases (unchanged at 3.10.1, 3.10.2, 3.11.2, 3.12.3 — sha `35971604`, `35971604`, `e9f1868c`, `da61b066` respectively); engine changes ride feature boundaries. Patch releases in range are either same-day rebuilds (3.11.2, 3.12.3) or tiny targeted fixes (3.10.1, 3.10.2).
- **Rebuild-churn mechanism**: `buildCommitId`/`buildTime`/version literals in `app/out/main/index.js` + `metadata/build-meta.json` feed vite content-hashes → all-zero signature diffs can still carry 44–4886 file renames. Mask `{8-char hash}.js`, version, commitId, ISO timestamps before comparing.
- **Signature noise**: `https://github.com/${XX}` template-var rotates every boundary (identifier reshuffle inside template literal — always ignore); minified doc URLs from vendored libs (chevrotain, iconv, sharp, fonts.googleapis, example.com) ride along with whichever chunk embeds them.

## REVIEW

- **3.12.3 endpoint `-61` is an extraction artifact, not a product change.** All 61 "removed" URLs (chevrotain.io docs, whatwg encodings, fonts.googleapis, example.com placeholders) still live in byte-identical chunks: e.g. `app/out/renderer/assets/chunk-K5T4RW27-BfhT6BhR.js` md5-matches across extracted/3.12.2 and extracted/3.12.3, and a live rg re-scan of extracted/3.12.3 finds 21 hits. `signatures/3.12.3.json` `_perf.extract_s=0.67` vs 3.12.2's `1.32` and was generated 15:50 (before 3.12.2's 16:28 run) — it ran over a partially-extracted tree. Recommend regenerating signatures/3.12.3.json; true delta is only the updater fix above.
- **3.10.1→3.10.2 renderer seed**: styles chunk has a real ~1.7KB delta under identifier reshuffling (changelog says subagent model-group display fix) but the minified seed statement can't be pinned without a rename-aware differ. Claim accepted, mechanism unverified.
- **app-update.yml `localhost:8081`** present in ALL my versions (`extracted/<ver>/app-update.yml`) — but it's an inert stub: real feed is computed in-app (domestic/overseas CDN + `ZCODE_UPDATE_FEED_URL` override). It is NOT a 3.12.3 packaging defect. The switch from `cdn.zcode-ai.com` happened at 3.4.0 — **c4 lane boundary 3.3.6→3.4.0**, cross-lane handoff.
- **Whether auto-update ever worked on linux ≤3.12.2** for non-AppImage installs can't be fully proven client-side (depends on whether manifests ever carried AppImage URLs). The old filter provably strips .deb/.rpm/.pkg.tar.zst; if manifests listed only package formats, updates silently no-op'd. 3.12.3's typed selection fixes it either way.
- **GLM-5.3-Flash** (changelog @3.9.2): absent from all files until 3.12.1's builtin registry — server-side catalog item, not a shipped-binary change. Treat 3.9.x model claims as unverifiable from the corpus.
- **MCP protocol-version configurability** (3.10.0 changelog claim): no signature surface; `ZCODE_PROTOCOL_V4_WIRE_VERSION` only appears at 3.12.2.
