# Lane C4 — 3.4.0 → 3.6.5 line analysis

Range: 3.4.0, 3.4.1, 3.4.2, 3.5.2, 3.5.3, 3.6.1, 3.6.2, 3.6.4, 3.6.5 (9 boundaries incl. 3.3.6→3.4.0).
Formats: 3.4.0/3.4.1/3.6.1/3.6.2 = win-x64.exe substitutes; 3.4.2/3.5.2/3.5.3/3.6.5 = deb; 3.6.4 = AppImage. Release dates 2026-07-20 → 07-31; same-day pairs 3.4.1+3.4.2, 3.6.1+3.6.2.

## Per-boundary findings

### 3.3.6 → 3.4.0 (deb → exe substitute)

Feature-heavy minor release; exe format explains all native/tools subtractions.

- Remote-workspace host protocol lands. `app/out/host/index.js` gains `resolveServerEndpoints` deriving four URLs from a server base: `/api/server-info`, `/ws`, `/api/rpc-host-capability`, `/ws/host` (diffs/3.3.6__3.4.0.md endpoints; context verified at extracted/3.4.2/app/out/host/index.js:1465147 — http(s)/ws(s) protocol mapping). `zcode:bind-remote-workspace-session-context` added in preload (provenance: extracted/3.4.2/app/out/preload/index.cjs). ssh2 dep already present, so SSH-transport remoting predates this boundary.
- ACP refactor: `session/applyFileRewind`, `session/previewFileRewind`, `session/rewind`, `session/rewindCascade`, `session/steer` removed; `session/subagents` + `v4/conversation/frame` added. `rewind` and `turn.steerQueued/steerDrained` survive as part/event enums (extracted/3.4.2/glm/zcode.cjs @338767, @402929) — methods renamed/moved, not the feature. `v4/conversation/frame` pairs with `v4/telemetry/event` and clientMode enum `desktop-continuous`/`web-remote-replayable` (@11202552): a v4 stream protocol for remote/replayable clients.
- +45 feature_flags are mostly signature noise from a static command-spec table in zcode.cjs (@2130908, @2132503): per-CLI argv specs (`osqueryi`, `opa`, `open`, `osascript`…) used by the shell-command parser — real growth of the command-knowledge table, not bundled osquery. Genuine additions: `ZCODE_CUA_HELPER_INSTALL_VARIANT` (main/index.js, "preview"), E2E infra (`ZCODE_E2E_*`, `NODE_V8_COVERAGE`, `zcode:e2e:*` IPC for final-arms custom events), UI flags (`authenticationEnabled`, `titleGenerationEnabled`, `developerToolsEnabled`).
- Plans +`tier:enterprise`, +`plan:in_stock_subscription`, +`plan:order_subscription`; −`plan:lesson_plan` (platform artifact — returns in every linux tree).
- Official plugin marketplace CDN endpoints added (`cdn-zcode.z.ai/zcode/official-plugin/{assets,marketplace.json}`).
- Models +`kimi-k3`, +`kimi-k3-capabilities` (zcode.cjs hardcoded catalog; kimi-k3 has 1M context / video input per model-providers catalog).
- Platform artifacts: −10 native modules (linux pty/sshcrypto absent in win tree), −rg13, `host_pkg_version` → None.

### 3.4.0 → 3.4.1 (exe → exe)

Patch. +`glm-content` (main chunk), +`modelExecutionEnabled`. GitHub URL template var rename only.

### 3.4.1 → 3.4.2 (exe → deb)

Signature deltas are almost entirely linux-tree content reappearing: +10 native modules, +rg13, +13 endpoints (openxml/example.com/texdoc cluster), +`plan:lesson_plan`. Confirms all of these were exe-coverage artifacts at 3.4.0. Real net change vs 3.3.6 deb: `https://studio.example.com:3030` test string, asar/pkg churn. host_pkg_version `3.4.2-3624`.

### 3.4.2 → 3.5.2 (deb → deb) — the feature release

- Embedded browser + browser-use feature: +44 acp_methods (browser action verbs: `navigate`, `click`, `type`, `snapshot`, `screenshot`, `playwright`, `cuaDrag/cuaKeypress/cuaScroll`, tab lifecycle `newTab/claimTab/listUserTabs/finalizeTabs`, handoff `markDeliverable/markHandoff/nameSession`, `codex/browserUse`, `codex/toolSurface`); +`plugin:browser-use@0.1.1` (glm/packages/browser-use-plugin/.zcode-plugin/plugin.json — "teaches agents when and how to drive ZCode's in-app browser (agent.browsers)"); skills `control-browser`, `web-gui-tester`; dep +`playwright-core@1.59.1`; IPC `zcode:browser-view-*` family (attach-guest, operation, screenshot-surface-*, viewport, visibility), `zcode:embedded-browser-javascript-dialog`, `zcode:import-chrome-browser-data`, `zcode:clear-embedded-browser-data`, `zcode:get-system-locale`; flags `browserUseEnabled`, `ZCODE_BROWSER_IMPORT_HELPER/V1`, `resolveRuntimeBrowserUseEnabled`.
- node-pty prebuild diet — PINNED at this boundary: native_modules 30 → 4. All @lydell/node-pty-darwin-*, darwin/win32 prebuilds, linux-arm64 builds dropped from the linux installer; only `prebuilds/linux-x64/pty.node#ce00b6` + `sshcrypto.node#c8f878` remain (×2 app trees). 3.6.5 MANIFEST shows the deps are now `@lydell/node-pty-linux-{arm64,x64}@1.2.0-beta.10` — platform-scoped packaging.
- Plugin runtime env roots: +`CLAUDE_PLUGIN_ROOT`, +`ZCODE_PLUGIN_ROOT` (Claude-Code-compatible plugin layout adopted).
- PDF (XFA) rendering: +XDP/XFA/XMP namespace endpoints + react-pdf annotation/text-layer refs. `rdf:*`/`dc:*`/`xdp:*`/`xfa:*` "ipc_channels" entries are extractor noise from XMP metadata strings.
- Agent/provider plumbing: `ZCODE_AGENT_PROVIDER`, `ZCODE_ENABLED_AGENT_PROVIDERS`, `ZCODE_AGENT_MODE_*`, `ZCODE_PROTOCOL_NAME/VERSION`, MCP meta keys, `ZCODE_FILE_LOCK_TIMEOUT`, `ZCODE_SETTING_WRITE_QUEUE_TIMEOUT_MS`, `ZCODE_KNOWN_TOOL_NAMES`, node-REPL flags (`nodeReplEnabled`, `ZCODE_NODE_REPL_BROWSER_BROKER_{SOCKET,TOKEN}`).
- Community surfaces: feishu chatter link + feedback form + `discord.gg/z9aBcQXZQ3` (confirmed in extracted/3.6.5/config community_urls: zh-CN→feishu, en-US→discord).
- −`ZCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX`.

### 3.5.2 → 3.5.3 (deb → deb)

Zero-signature rebuild (template var rename only). pkg 3869 → 3911.

### 3.5.3 → 3.6.1 (deb → exe substitute) — plumbing release

- Off-peak quota system: host gains `/api/v1/off-peak/{ticket,ticket/availability,ticket/status}` + `/api/v1/off-peak/anthropic/v1/messages` (provenance: app/out/host/index.js — the host proxies Anthropic-format requests behind server-issued tickets); `off-peak-run` automation task type alongside `cron-run` with `serverTicketId` (zcode.cjs @441115); ~15 `ZCODE_OFFPEAK_MOCK_*` flags + `enable_offpeak_task` + `isOffPeakMockEnabled` — shipped mock harness.
- Telemetry buildout: `ZCODE_TELEMETRY_{DEVICE_MID,USER_ID,USER_ID_HASH,IDENTITY_STATE,RUNTIME_SURFACE}`, `ZCODE_MODEL_TELEMETRY_ENABLED`, OTEL_* passthrough list, OTLP HTTP `localhost:4318`, Aliyun SLS APM endpoint `proj-xtrace-…cn-beijing.log.aliyuncs.com/apm/trace/opentelemetry`, `@arms/rum-electron` dep (3.6.5 MANIFEST). `buildAgentTelemetrySpawnEnv` (host/index.js @1568197) injects identity env into agent subprocesses; telemetry keys are deleted from user env to prevent spoofing. +`LOG_STREAM`/`LOG_TOKENS`.
- Search-tools wiring lands in JS: `ZCODE_BFS_BINARY` + `ZCODE_UGREP_BINARY` flags; `bundledResourceDir` map {bfs,ripgrep,ugrep} with per-binary env overrides (@477291); remote resource package IDs `[server-bundle, node-runtime, node-pty, glm, bfs, ripgrep, ugrep]` (@346876) — remote hosts are provisioned with the same toolset. Companion flags `findAndGrepEnabled`, `nativeSearchEnhancementsEnabled`.
- Document stack widened: openxml spreadsheetml/chart/drawing namespaces, jszip ref, `http://docx/` scheme, `get.webgl.org`; `/api/v1/agent/configs`.
- ACP +`session/requestRuntimePreferences`, +`workspace/updateInteractionPreferences`.
- Agent UX flags: askUserQuestion auto-resolution set (4), `isPersistentAgentMemoryEnabled`, `semanticRecallEnabled`, `keepAwake{Enabled,Disabled}`, `hasExplicitReasoning{Enabled,Disabled}`.
- plugin:browser-use 0.1.1 → 0.1.2. −`ZCODE_SERVER_RUNTIME_ROOT`.
- Platform artifacts: win32 prebuilds in / linux out, rg absent, pkg None.

### 3.6.1 → 3.6.2 (exe → exe)

Identical signatures; only `app_asar_sha256` (version string inside) + win host binary hash changed; `glm/zcode.cjs` byte-identical. Same-day repack/hotfix confined to the Electron shell/packaging layer.

### 3.6.2 → 3.6.4 (exe → AppImage, first linux tree since 3.5.3)

- Bundled tools CONFIRMED on linux: `tools/bfs` bfs 4.1.1, `tools/ripgrep` rg 14.1.1 (rev 4649aa9700; was 13.0.0 through 3.5.3), `tools/ugrep` ugrep 7.5.0 (+sse2, pcre2jit, zlib/bzip2/zstd/brotli/7z/tar/pax/cpio/zip). Exact boundary for binaries: 3.5.3 → 3.6.4; JS plumbing proves 3.6.1 intent, so tools almost certainly shipped in the 3.6.1 deb (unverifiable — see REVIEW).
- +`glm-coding` model (provenance: renderer styles chunk — possibly UI label), +endpoints `bigmodel.cn/glm-coding`, `z.ai/subscribe` (coding-plan subscription surfaces).
- +`offPeakCreationEnabled` (UI gate for off-peak task creation).
- +`ZCODE_BUILD_COMMIT_ID`, +`ZCODE_TELEMETRY_RUNTIME_DISTRIBUTION` (telemetry now records installer format), +`ZCODE_TELEMETRY_USER_SUBJECT_ID`; +env `TASK_MAX_OUTPUT_LENGTH`.
- Platform noise repeats: +12 endpoints are the linux-tree docx/example.com cluster returning; native swap win32→linux-x64+sshcrypto; `plan:lesson_plan` returns.
- `apparmor-profile` absent in this tree = AppImage format artifact (expected, not a removal).

### 3.6.4 → 3.6.5 (AppImage → deb)

Zero-signature version bump (var rename only). pkg `3.6.5-4145`.

## Through-lines

1. Frozen Electron host: `host_binary_sha256` `7f7881d0…` byte-identical across every linux artifact observed — 3.3.6, 3.4.2, 3.5.2, 3.5.3, 3.6.4 (AppImage), 3.6.5, 3.7.3 (AppImage), 3.7.5, 3.7.6. The 206 MB Electron shell never relinks; all product change ships inside `app.asar` (hash changes every release). Win host binaries churn per-build (aa38fdb4/3f42be99/1bec1de1/1cfbf387 across the exe substitutes).
2. tools/ expansion pinned: rg 13.0.0 solo through 3.5.3 → bfs 4.1.1 + rg 14.1.1 + ugrep 7.5.0 first observed at 3.6.4. JS plumbing (`ZCODE_BFS_BINARY`, `ZCODE_UGREP_BINARY`, bundledResourceDir map, remote resource package IDs) lands at 3.6.1 — binaries almost certainly shipped in the pulled 3.6.1 deb; earliest verifiable tree is 3.6.4. Ugrep build flags (7z/tar/zip decompression) imply archive-content search as an agent capability.
3. node-pty diet pinned exactly: 3.4.2 → 3.5.2 (30 → 4 entries). Linux installer keeps only linux-x64 prebuild + sshcrypto; deps switched to `@lydell/node-pty-linux-{arm64,x64}` scoped packages.
4. sshcrypto.node rebuild pinned: `c8f8788d…` stable 3.3.6 → 3.6.5 → `f85819…` at 3.7.3 (AppImage, real linux .node). Boundary is 3.6.5 → 3.7.3 — one release earlier than the 3.6.5→3.7.5 guess in the brief. pty.node `ce00b69d…` unchanged through the whole window.
5. Remote-workspace stack assembled across the range: 3.4.0 adds the host HTTP/WS surface (`/ws/host`, `/api/rpc-host-capability`, `/api/server-info`) + preload binding + v4/conversation/frame protocol; ssh2/sshcrypto preexisting; 3.6.1 turns the host into an off-peak Anthropic-API proxy and defines resource packages provisioned onto remotes (incl. the new tools). browser-use matures into a compiled `dist/mcp/server.js` MCP plugin by 3.7.3 (out of range, flagged for c5).
6. Telemetry arrives as a subsystem at 3.6.1 (OTel/OTLP + Aliyun ARMS + agent-spawn identity env) and extends at 3.6.4 (RUNTIME_DISTRIBUTION, USER_SUBJECT_ID). Pre-range builds had no ZCODE_TELEMETRY_* at all.
7. Signature-extractor noise catalogued for downstream readers: (a) `feature_flags` picks up `--flag` argv specs from the zcode.cjs command-spec table (osqueryi/opa/etc. at 3.4.0, echarts-style `*Enabled` options); (b) `ipc_channels` picks up `rdf:*`/`dc:*`/`xdp:*`/`xfa:*` XMP strings (3.5.2) and CSS `clear:both`/`display:none` (3.6.1); (c) `plan:lesson_plan` + the openxml/example.com/texdoc endpoint cluster flip on/off tracking artifact format — present in every deb/AppImage tree, absent in every exe tree (3.4.0, 3.6.1, 3.6.4 boundaries).
8. Skipped-version corroboration: host pkg build numbers 3.4.2-3624 → 3.5.2-3869 → 3.5.3-3911 → 3.6.5-4145 → 3.7.5-4641 leave room for the never-shipped 3.5.0/3.5.1/3.6.0/3.6.3/3.7.x internal builds.

## REVIEW

- Cannot prove bfs/ugrep/rg14 binaries shipped in the 3.6.1 deb — both 3.6.1 and 3.6.2 artifacts are win substitutes; earliest verifiable linux tree is 3.6.4 AppImage. The JS wiring at 3.6.1 (env overrides + resource-package IDs) makes 3.6.1 the probable ship, but 3.6.4 remains the only certain boundary for binaries.
- Win-side contents for pulled versions are partially opaque: exe trees never list a `tools/` entry or rg at all — likely an extraction-coverage gap (win tools ship as .exe under a different layout) rather than windows shipping without ripgrep. Unverified.
- `glm-coding` model entry provenance is a renderer CSS/styles chunk — could be a UI label string, not a real model addition.
- Whether off-peak/telemetry paths are enabled by default cannot be read from flag presence; `enable_offpeak_task`/`ZCODE_MODEL_TELEMETRY_ENABLED` gate them but defaults are dynamic.
- `v4/conversation/frame` semantics inferred from surrounding enums (saturated/drained/closed, clientMode) — protocol shape verified, exact wire format not read.
- 3.7.3's sshcrypto hash is trustworthy (AppImage = linux build), but its `pkg=None` and substitute status mean the 3.7.3 deb could theoretically differ — boundary stated as 3.6.5→3.7.3 on best available evidence.
