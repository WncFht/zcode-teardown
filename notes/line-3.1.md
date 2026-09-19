# Lane C2 — 3.1.x line (3.1.0 → 3.1.3)

First linux line of the new-engine era: single `glm/zcode.cjs` (~9.4MB esbuild bundle) replaces the 2.x five-runtime pile. The epoch transition itself is covered by `notes/epoch-gap.md`; this note characterizes what the young glm engine looked like at landing and what the three 3.1.x patches did.

Release cadence (manifest/versions.json): 3.1.0 2026-06-15, 3.1.1 2026-06-16, 3.1.2 2026-06-17, 3.1.3 2026-06-23. Two daily hotfixes, then a ~1-week feature patch.

## The glm engine at landing (3.1.0)

Subsystem inventory from signatures/3.1.0.json + extracted/3.1.0/:

- **Engine**: `glm/zcode.cjs` only (sha256:189b57036a52c0cd), runtime electron-node. `glm/packages/` holds 6 plugins: android-emulator, document-skills, ios-simulator, restore-legacy-sessions, skill-creator, superpowers@5.1.0 (extracted/3.1.0/glm/packages/). `model-providers/` holds one catalog file `models_catalog_china_llm_zcode_2026-06-03.json` — sha-identical to 3.0.0 mac per epoch-gap note.
- **Protocol surface**: 63 `acp_methods` (signatures/3.1.0.json, provenance → glm/zcode.cjs). Two families: ~34 standard MCP methods (initialize, prompts/_, resources/_, sampling/createMessage, notifications/_, tasks/_, tools/call, roots/list, elicitation/create, completion/complete, logging/setLevel, ping) and a custom "ZCode Protocol" family — `session/*` ×24 (create, send, steer, stop, compact, fork, rewind, goal, usage, event(s), subscribe, resume, read, list, messages, close, cancelBackgroundTask, setMode, setModel, setThoughtLevel, updateRuntimeModelConfig) plus `workspace/*` (readState, setDefaultModel/Mode/ThoughtLevel, upsertModelProvider, removeModelProvider, updateProviderRegistry). Host logs literally call it "ZCode Protocol": `extracted/3.1.3/app/out/host/index.js` — "开始请求 ZCode Protocol session/setModel".
- **Models**: 676 signature entries — gpt×135, claude×104, glm×98, qwen3×98, gemini×67, deepseek×59, kimi×36, doubao×31, qwen2×18 (python Counter over signatures/3.1.0.json categories.models). Multi-provider catalog baked in from day one; dominated by OpenAI/Anthropic naming but with the full Chinese-vendor set (glm/qwen/doubao/kimi/deepseek).
- **Plans/billing**: 15 entries — subscription tiers (basic/dev/family/global/lite/max/plus/pro/standard/start), `BigModelCodingPlanSubscriptionProvider` + `BigModelUsageQuotaProvider` provider classes, `plan:service_tier`. Monetization is provider-driven, not the 2.x kv:tier/plan:* scheme.
- **Feature flags**: 177 — heavy ZCODE_* env/flag surface: proxy (`ZCODE_HTTP_PROXY`), CA (`ZCODE_AGENT_CA_CERT`), agent spawn (`ZCODE_AGENT_SERVER_COMMAND/ARGS_JSON/CWD`), remote/dev (`ZCODE_REMOTE_DEV_AGENT_BUNDLE`, `ZCODE_WEB_REMOTE_CONTROL_*`), retry tuning (`ZCODE_MODEL_RETRY_*`), storage dirs, plus `features.{compact,css,mcp,memory,rewind,skill,subagent}` — memory/rewind/subagent/mcp/skills were gated features already at 3.1.0.
- **IPC**: 102 channels — remote SSH (`remote:ssh:`), web remote control (start/stop/status/pairing/sync), OAuth callbacks, payment callback, ARMS telemetry (`arms:rum-bridge`, `report-arms-custom-event`), docker listing, WSL distro listing, MCP user-directory load/save, tickets panel, process monitor, window/tab sync. Most of the later-era host surface already exists.
- **Endpoints**: 448 — z.ai family (api.z.ai×7, zcode.z.ai×5, docs.z.ai×5, chat.z.ai×3), bigmodel.cn family (bigmodel.cn, docs.bigmodel.cn, open.bigmodel.cn), api.anthropic.com, plus the /api path set: `/api/auth/z/login`, `/api/oauth/authorize`, `/api/biz/subscription/list`, `/api/biz/customer/getCustomerInfo`, `/api/monitor/usage/quota/limit`, `/api/pay`, `/v1/tickets`, `/v1/messages`.
- **Env vars**: 55 — plugin SDK vars (ANDROID_PLUGIN__, IOS_SIM__, JAVA_HOME), BRAINSTORM__service vars, playwright/pdf knobs, ZCODE__ config dirs.
- **Deps**: 25 app deps; @sentry/electron replaced by @arms/rum-electron (Alibaba RUM) + node-forge + @babel/runtime + @zcode/e2e-report added vs 2.13.0 (diffs/2.13.0__3.1.0.md deps section).
- **Native modules**: node-pty + @lydell/node-pty prebuilds (all platforms) + ssh2 sshcrypto — terminal and SSH remoting intact from 2.x.
- **Bundled tools**: ripgrep 13.0.0 only.

## Per-boundary findings

### 2.13.0 → 3.1.0 (boundary in)

Engine swap — `gemini+acp+acp-proxy` → `glm-zcode`. Counts collapse everywhere as five runtimes' worth of strings vanish: acp_methods 162→63, endpoints 3288→448, env_vars 916→55, feature_flags 789→177, models 928→676 (diffs/2.13.0__3.1.0.md counts). Semantic changes beyond the swap:

- Protocol dialect changed: removed methods are the ACP/LSP-style set (`session/new`, `session/prompt`, `session/load`, `session/request_permission`, `terminal/*`, `fs/read_text_file|write_text_file`, `textDocument/*`, `workspace/didChange*`, `acp.*` lifecycle events, `notifications/claude/channel*`). Added is the ZCode Protocol `session/*` + `workspace/*` camelCase family — including agentic concepts with no 2.x analog: `session/steer`, `session/compact`, `session/fork`, `session/rewind`, `session/goal`, `session/cancelBackgroundTask`, `session/updateRuntimeModelConfig`.
- IPC: acp-proxy debugging channels removed (`zcode:acp-proxy-*` ×5); added `remote:ssh:` prefix, `arms:rum-bridge`, `settings-changed`, `get-desktop-session-activity`, `get-zcode-stdio-tap-dev-state`, `open-browser-url`.
- Policies internalized: gemini's `policy:{yolo,plan,read-only,...}` toml files gone; yolo/plan strings persist inside zcode.cjs (epoch-gap note).
- Skills surface jumped 18→31: plugin packages + 20 skills incl. superpowers set (brainstorming, systematic-debugging, test-driven-development, executing-plans, dispatching-parallel-agents, subagent-driven-development, using-git-worktrees, verification-before-completion…).

### 3.1.0 → 3.1.1 (host_pkg 3.1.0-1706 → 3.1.1-1762, ~1 day hotfix)

- Env-passing machinery extended in zcode.cjs: +`ZCODE_RUNTIME_ENV`, +`ZCODE_TOOL_ENV_PASSTHROUGH_JSON` (diffs/3.1.0__3.1.1.md feature_flags). Context: they sit in a module alongside existing `ZCODE_HTTP_PROXY`/`ZCODE_AGENT_CA_CERT` with a hardcoded passthrough allowlist `[NODE_ENV, ELECTRON_RUN_AS_NODE, NODE_NO_WARNINGS, HTTP_PROXY, HTTPS_PROXY, ALL_PROXY, NO_PROXY, NODE_EXTRA_CA_CERTS, SSL_CERT...]` (extracted/3.1.1/glm/zcode.cjs). The JSON flag makes tool-subprocess env passthrough configurable — likely fixing tools that lost needed env vars.
- +`ZCODE_WINDOWS_APP_INSTALL_DIR` in host/main index.js (extracted/3.1.1) — Windows install-dir resolution for the data-dir base path (`getDataBaseDir`). Windows parity fix shipped to all platforms.
- IPC +`zcode:sync-app-settings` — new channel enum SyncAppSettings for cross-window settings sync (extracted/3.1.1/app/out/main/chunk-3ZDTCZ7P.js).
- models −`claude-code-hint`: was a regex stripping `<claude-code-hint .../>` hint lines from tool output (extracted/3.1.0/glm/zcode.cjs, `stripClaudeCodeHintLines`). Removed — Claude Code output-compat shim dropped one release after landing.
- glm/zcode.cjs rebuilt (990 diff lines in repo diff v3.1.0..v3.1.1); plugins/model-providers untouched.

### 3.1.1 → 3.1.2 (host_pkg -1762 → -1788, ~1 day hotfix)

- +`ZCODE_NO_PROXY` added to the same env module in zcode.cjs (extracted/3.1.2/glm/zcode.cjs) — proxy bypass list support, completing the proxy story started in 3.1.1.
- IPC +`zcode:open-workspace-path` — OpenWorkspacePath channel (extracted/3.1.2/app/out/main/chunk-ZQEJ25R6.js): open a workspace by explicit path.
- endpoints +`http://www.apple.com/DTDs/PropertyList-1.0.dtd` — plist DTD string, almost certainly an embedded plist template (mac entitlement/Info handling), not a network call.
- No model/plan/plugin changes. glm/zcode.cjs rebuilt (~938 diff lines).

### 3.1.2 → 3.1.3 (host_pkg -1788 → -1871, ~6 days — the substantive patch)

- **Update CDN migrated**: app-update.yml url `cdn.zcode-ai.com` → `cdn-zcode.z.ai` (repo diff v3.1.2..v3.1.3 -- app-update.yml) and new endpoint `https://cdn-zcode.z.ai/zcode/electron/releases` in code (diffs/3.1.2__3.1.3.md). Continues the zcode-ai.com → z.ai vendor migration noted at the epoch boundary.
- **Enterprise/team subscription purchase flow**: +`/subscription/enterprise/v2/order`, +`/subscription/enterprise/v2/order/calculate`, +`https://bigmodel.cn/finance-center/finance/pay`, +`docs.bigmodel.cn/cn/terms/{subscription-agreement-team,user-agreement}`, +`https://docs.z.ai`, +`https://www.bigmodel.cn` (all in extracted/3.1.3/app/out/host/index.js).
- **Removed `https://opencode.ai/config.json`** — the host no longer fetches opencode's config (was present in 3.1.2's host/index.js; remaining hit in node_modules/shadcn is vendored docs text). Last live opencode reference dropped.
- **WSL remote**: IPC +`remote:wsl:` — new session-id prefix constant alongside `remote:ssh:` in host/index.js (extracted/3.1.3), so remote workspaces now cover WSL. (Epoch-gap already notes WSL arrived by 3.1.0; this wires the `remote:wsl:` identity prefix.)
- **Model-setting telemetry**: acp_methods +`session/set_model`, +`workspace/set_default_model` — NOT new protocol methods. They are `Ix({action: ...})` analytics action names instrumenting `setModel`/`setWorkspaceDefaultModel` calls with timing (extracted/3.1.3/app/out/host/index.js). Signature extractor counts `x/y` strings, hence the +2.
- +`tooltipDisabled`, +`tooltipsDisabled` UI flags in renderer bundle (extracted/3.1.3/app/out/renderer/assets/index-uXmpeevL.js) — note the near-duplicate singular/plural names.
- Biggest patch of the line: 777 files changed, renderer index.html +42 lines, zcode.cjs rebuilt (~919 diff lines). glm/packages and model-providers still untouched.

## Through-lines

- **3.1.0 landed feature-complete, not minimal.** Sessions (fork/rewind/steer/compact/goal), workspace provider registry, plugins, skills (incl. superpowers), remote SSH, web remote control, OAuth+payment, telemetry, billing tiers — all present at first linux drop. The patches were hotfixes and hardening, not missing subsystems.
- **Patch themes**: .1/.2 = environment correctness (tool-subprocess env passthrough, proxy incl. NO_PROXY, Windows dirs) + small IPC additions (settings sync, open-workspace-path). .3 = business/plumbing (enterprise purchase flow, CDN migration to z.ai, WSL remote prefix, model-change telemetry). 证据：`diffs/3.1.0__3.1.1.md` → `diffs/3.1.2__3.1.3.md` 的 env_vars/ipc_channels/endpoints 节（NO_PROXY 落 3.1.1→3.1.2，enterprise/CDN/WSL 同落 3.1.2→3.1.3）。
- **De-Claude-ing continued post-swap**: `claude-code-hint` stripping removed in .1, `opencode.ai/config.json` fetch removed in .3 — vestigial competitor-tool compatibility steadily deleted. 证据：`diffs/3.1.0__3.1.1.md`、`diffs/3.1.2__3.1.3.md` endpoints 节。
- **Plugin/provider catalog frozen**: glm/packages (6 plugins) and model-providers (1 catalog file) byte-identical across all four versions (git diff v3.1.0..v3.1.3 -- glm/packages model-providers = empty). Engine churn was entirely in zcode.cjs + host/main chunks.
- **Two protocol dialects coexist**: engine speaks camelCase ZCode Protocol (session/setModel), host analytics uses snake_case action names (session/set_model). Signature acp_methods conflates them — worth remembering when interpreting counts in later lanes. 证据：`signatures/3.1.0.json` acp_methods 双语并存、引擎 RPC 注册表均为 camelCase、`notes/protocol.md` "two protocol eras"。

## REVIEW

- `session/set_model` / `workspace/set_default_model` verified as telemetry action strings in host/index.js, not wire methods — but I did not confirm whether the host also translates them into real outbound protocol calls; the surrounding code is the analytics wrapper around the camelCase call.
- `remote:wsl:` appears as a session-identity prefix constant; the full WSL remote wiring (spawn path, distro resolution) wasn't traced — only the prefix addition is proven.
- `ZCODE_TOOL_ENV_PASSTHROUGH_JSON` semantics inferred from name + neighboring allowlist constant; the JSON schema it accepts wasn't extracted.
- `ZCODE_RUNTIME_ENV` purpose not fully pinned — set/read sites in zcode.cjs not traced beyond the constant block.
- `tooltipDisabled` vs `tooltipsDisabled` near-duplicate: could be two distinct flags (singular feature vs global preference) or an intentional alias pair; not resolved.
- The plist DTD endpoint in 3.1.2 is assumed to be an embedded template string; no surrounding plist-generation code was read.
- Whether the 3.1.3 enterprise order endpoints are actually reachable from linux UI (vs. shared host code compiled for all platforms) not verified.
