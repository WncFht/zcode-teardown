# Lane C5 — 3.7.x / 3.8.1 line analysis

Scope: 3.7.1–3.7.7, 3.8.1. Available in corpus: 3.7.3 (AppImage), 3.7.5, 3.7.6, 3.7.7, 3.8.1.
Missing: 3.7.1, 3.7.2, 3.7.4 (not yet recovered at time of writing). Existing diffs: 3.7.5__3.7.6, 3.7.6__3.7.7, 3.7.7__3.8.1.

## Boundary 3.7.5 → 3.7.6 (diffs/3.7.5__3.7.6.md)

Signature-silent bugfix-level release plus one piece of flag plumbing.

- feature_flags +2: `extractionEnabled`, `memoryExtractionEnabled`. The memory-extraction machinery already existed — `memoryExtractionScheduler` is present in 3.7.5's `glm/zcode.cjs` (schedules extraction at turn boundaries, drains on stop). What 3.7.6 adds is the gate: `e.config.memory?.extractionEnabled===!1` skip check plus runtime-config override propagation (`extracted/3.7.6/glm/zcode.cjs`). So this release exposed session→memory extraction as a configurable feature.
- endpoints −4 net: removed strings are placeholder/example URLs (`api.example.com`, `mcp.example.com`, `studio.example.com:3030`, an overflow-test URL, Apache-2.0 license URL) — test fixture cleanup, not real API changes. Added `api.github.com/repos/{}/{}/zipball/` template and a `${JP}`-var github URL (minifier var churn: `${VP}`→`${JP}` across the boundary).
- Everything else identical (114 acp, 677 models, 162 ipc, 353 flags baseline). host_pkg 3.7.5-4641 → 3.7.6-4691.

## Boundary 3.7.6 → 3.7.7 (diffs/3.7.6__3.7.7.md)

Model-drop release, otherwise quiet.

- models +3: `GLM-5.3`, `glm-5.3`, `glm-5.3-reasoning-depth` — new flagship model with a reasoning-depth variant.
- Only other change is `${JP}`→`${QP}` github-URL var churn (cosmetic).
- All other categories unchanged. host_pkg 4691 → 4926.

## Boundary 3.7.7 → 3.8.1 (diffs/3.7.7__3.8.1.md)

The substantive boundary of this lane. Five feature areas land at once.

### Coding Plan goes commercial

- Engine gains full zcode-plan proxy surface: `zcodePlanOpenAiBaseUrl=/api/v1/zcode-plan`, `zcodePlanAnthropicBaseUrl=/api/v1/zcode-plan/anthropic`, `zcodePlanBillingCurrentUrl`, `zcodePlanBillingBalanceUrl` (`extracted/3.8.1/glm/zcode.cjs`). The signature-added endpoints `/api/v1/zcode-plan/chat/completions` and `/api/v1/zcode-plan/anthropic/v1/messages` mean the plan proxies both OpenAI- and Anthropic-format APIs — i.e. the IDE can serve Claude-Code-compatible clients off the same subscription.
- Caveat: the provider IDs are NOT new — `builtin:zai-coding-plan`, `bigmodel-coding-plan`, `zai-start-plan` and the `/login [zai-coding-plan|...]` slash command already exist in 3.7.7's engine (47 `coding-plan` hits, same count as 3.8.1); `coding-plan-availability` cache key exists in 3.7.7 main. 3.8.1 adds the _purchase path_: `/api/pay/paypal/` endpoint, `isPaypalHostname` allowlist for the embedded browser (`app/out/main/index.js`), new preload `app/out/preload/codingPlanWebview.cjs`, `persist:zcode-coding-plan` session partition, IPC `zcode:coding-plan-purchase-complete` + `zcode:coding-plan:embedded`, plan class `provider_cls:ZaiCodingPlanSubscriptionProvider`. Renderer has `team-plan:${zaiCodingPlan}:` product IDs and `off-peak-task` kinds.
- Quota machinery: `/api/v1/coding-plan/reset` + `/api/monitor/usage/quota/limit` in `app/out/host/index.js`; `fiveHourEnabled`/`weekEnabled` flags are renderer-side (5-hour and weekly quota-window UI).

### Remote-workspace attach becomes a scoped port with handshake

- `zcode:remote-service-port` removed; `zcode:scoped-service-port` + `zcode:scoped-service-port-ready` added. In 3.8.1 main (`app/out/main/index.js`), main posts a MessagePort to the renderer carrying `{attachmentId, sessionId: remoteSessionId, target, workspacePath, workspaceIdentity}`; preload forwards it; renderer replies `ScopedServicePortReady` which main listens for (`Me.on(Jn.ScopedServicePortReady,...)`) with failure cleanup (`delivery-failed` → clears `pendingRendererAttachment`). So each renderer attachment now gets its own scoped service channel with an explicit ready/ack — vs the previous unnamed remote port.

### Browser-tab session recording

- New ACP methods `recordingStart`/`recordingStatus`/`recordingCancel` (schemas: `start(options?): Promise<BrowserRecordingJob>`, `unsupportedByDefaultIn:["extension","cdp"]` — engine `BrowserRecordingAPI`). Backed by brand-new files `app/out/main/browserWebmRecorder.js` (`createElectronBrowserWebmRecorder`) and `app/out/preload/browserVideoRecorder.cjs` (MessagePort `zcode-browser-video-recorder:port`). Neither file exists in ≤3.7.7. It's WebM capture of embedded browser tabs, exposed to the agent as part of the browser automation surface alongside `browserVisibilitySet`, `browserViewportSet`, `activateTab` etc.

### Workspace hooks trust model

- ACP `workspace/hooks/trustGrant` + flag `workspaceHookTrustEnabled`. Engine shows a full admission model: hook declarations carry `hookDeclarationDigest` (`sha256`), items have `trustState`, `admissionClass`, `effectiveRunnable`, `reviewItemId`, and resolution flags `sourceRootEnabled`, `declarationEnabled`, `runtimeHooksEnabled`, `configuredEnabled`, `resolveWritableDeclarationEnabled`, `resolveNextRootEnabled` — most of the boundary's +27 feature_flags belong to this system (`extracted/3.8.1/glm/zcode.cjs`). Hooks now declare, get admitted by policy, and require a user trust grant.

### Misc

- `workspace/cancelGenerateText` ACP: used by the repo-wiki lane — host has `agentLane:"repo-wiki"` with its own model generator/provider registry (`app/out/host/index.js`); `ZCODE_REPO_WIKI_MODEL_REQUEST_TIMEOUT_SECONDS` (normalized 60–3600s) and `ZCODE_E2E_REPO_WIKI_GENERATION_FIXTURE` are repo-wiki config/e2e hooks. Repo-wiki generation runs as a separate agent lane with a running-task reporter.
- `workspace/updateModelIoPreferences` ACP + `modelIoFullRetentionEnabled`/`fullRetentionEnabled`/`setModelIoFullRetentionEnabled`: per-workspace preference toggling full model-I/O retention; propagated to live sessions via `setModelIoFullRetentionEnabled` (engine `updateInteractionPreferences`). Ties to the `recordModelIO`/`model_io` trace path.
- `toolGroupingExploreEnabled`/`toolGroupingTerminalEnabled` default true, `toolGroupingChangesEnabled` default false (engine config schema) — message-stream grouping of tool calls.
- xlsx skill added (`skill:xlsx`, ~1300-line `xlsx.py`, scenes/templates/env_setup) — npmmirror/tuna endpoints in the signature come from `skills/{xlsx,docx}/env_setup/*` scripts (CN-mirror env bootstrap for office skills), NOT core app. pptx skill rewritten (`pptx_reference.py` removed → `general_judge.py`), pdf scripts touched. `z-cdn.chatglm.cn/office-skill/fonts/` endpoints serve NotoSansSC fonts for office generation.
- `plugin:browser-use` 0.2.1 → 0.3.0.
- `ZCODE_DESKTOP_CONTEXT_PROMPT_ENABLED`/`desktopContextPromptEnabled`, `assistantCodeCommentCardsEnabled`/`codeCommentProjectionEnabled`, `exportDisabled`/`importDisabled`/`refreshDisabled`, `e2eStoreBridgeEnabled`+`VITE_ZCODE_E2E_STORE_BRIDGE` — renderer/e2e-surface flags, not in engine.
- deps: `zod` removed from `app/node_modules` (bundled instead); `@arms/rum-electron` bumped.
- host_pkg 4926 → 5310.

## Through-lines

- The 3.7.x line is a quiet stabilization window punctuated by the GLM-5.3 model drop (3.7.7); nearly all feature mass lands in 3.8.1.
- Monetization: coding-plan providers existed since ≤3.7.7, but 3.8.1 wires the whole commercial loop — embedded purchase webview, PayPal, billing endpoints, quota windows (5h/weekly), `offPeakTaskId` automation (init/resume runs targeting off-peak pricing; `ZCODE_OFFPEAK_MOCK_SCENARIO` test flag arrived in the 3.7.x window).
- Safety/governance arc: memory extraction becomes gated (3.7.6), then 3.8.1 adds the workspace-hook declaration+trust-grant admission model and model-I/O retention preferences.
- Browser surface keeps growing: 3.7.x adds tab residency/suspend/restore + print-to-pdf IPC (cross-gap), 3.8.1 adds WebM recording and browser-use 0.3.0 — the embedded browser is becoming a first-class agent tool.
- `glm/zcode.cjs` sits ~12.8MB; per-release minifier var renames (`${VP}`→`${JP}`→`${QP}`→`${kD}` github URL) are cosmetic noise in endpoint diffs.

## REVIEW — provisional cross-gap

### 3.6.5 → 3.7.3 (spans missing 3.7.1, 3.7.2; signature-level)

- acp_methods −4/+3: `tasks/cancel|get|list|result` deregistered (schemas remain in bundle, 4 hits in 3.7.3 `zcode.cjs`), replaced by `server/discover` (params: `supportedVersions`, `capabilities`, `instructions` — MCP-style handshake), `subscriptions/listen`, `notifications/subscriptions/acknowledged`. The agent protocol moved from poll-based tasks to capability-discovery + subscription notifications.
- ipc_channels +10: `browser-view-{ensure-resident,report-residency,restore,restore-tabs,suspend,suspend-ready,close-tab-from-renderer}`, `desktop-window-chrome-state[-changed]`, `print-to-pdf` — embedded-browser tab residency lifecycle (suspend/resume to save resources), window-chrome state sync, PDF export.
- plugins: `skill:pptx` added; `browser-use` 0.1.2 → 0.2.1.
- flags +2: `ZCODE_OFFPEAK_MOCK_SCENARIO` (off-peak automation test hook — the earliest trace of the 3.8.1 monetization arc), `ZCODE_REDACTED_PATH_`.
- endpoints −8: all are doc/reference URLs inside libraries (gist url-regex, is-my-json-valid, is-base64, MCP spec draft, url-regex demo, openapi spec, safaribooksonline regex cookbook) — a validation/regex dependency was dropped or pruned, not an API change.
- `sshcrypto.node` hash changed (ssh2 rebuild — toolchain or version bump).
- Cannot attribute to a specific version inside the gap until 3.7.1/3.7.2 land.

### 3.7.3 → 3.7.5 (spans missing 3.7.4)

- Signature-identical across every category (114 acp / 677 models / 441 endpoints / 353 flags / 162 ipc / 27 plugins) — only `app_asar_sha256`, `components.glm/zcode.cjs` hash, and `host_pkg_version` (None→3.7.5-4641) differ. Whatever changed in 3.7.4/3.7.5 is below signature resolution; `zcode.cjs` differs (8a25adb6→0655eb0f) so code did change — likely bugfixes.
- Provenance caveat: 3.7.3 is AppImage-sourced (`host_pkg_version=None`, `apparmor-profile` absent) — cannot fully exclude format-induced signature bias, but counts match 3.7.5 exactly so impact looks nil.

### Unverifiable / deferred

- Per-version attribution inside 3.6.5→3.7.3 and 3.7.3→3.7.5 pending recovery of 3.7.1/3.7.2/3.7.4.
- Whether `tasks/*` deregistration and the subscription model landed in 3.7.1, 3.7.2, or 3.7.3 specifically.
- 3.7.3 AppImage vs deb: native binary diffs (sshcrypto hash) could partly be toolchain noise from the different format.
