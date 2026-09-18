# Lane c1 — the 2.x line (2.2.0 → 2.13.0)

14 versions, all real `linux-x64` deb builds (`manifest/provenance.json`: no substitutes in 2.x), released daily 2026-05-14 → 2026-05-29 (`manifest/versions.json`). Every version ships the same five-runtime stack under `resources/`: `gemini/` (gemini-cli fork JS bundle), `glm/zcode-acp` (~160-170MB ELF), `codex/` (codex-acp), `opencode/opencode` (~138-154MB ELF), `acp/` (claude-agent-acp), plus `acp-proxy-runtime/` (JS wire-format proxy). Engine label `gemini+acp+acp-proxy` never changes (`signatures/*.json` engine field).

The defining fact of the line: **the Electron host and four of five runtimes are nearly frozen; what moves is (a) the glm/zcode-cli engine build, (b) a packaging seesaw for the claude and codex agents, and (c) the host-side feature/billing surface.**

## Runtime roster (verified by hashing `extracted/<ver>/`)

| ver           | glm zcode-acp                | claude acp                                                                 | codex-acp                                               | opencode                                          | gemini |
| ------------- | ---------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- | ------ |
| 2.2.0         | 0.11.0                       | 0.29.2 (JS cli.js, SDK 0.2.112)                                            | zed 0.12.0 native                                       | 154M `0837383c`                                   | 0.37.0 |
| 2.3.0         | 0.11.0                       | 0.33.1 (native `claude` ELF 239M, SDK 0.2.132)                             | agentclientprotocol 0.0.44 JS + `@openai/codex` 0.128.0 | same                                              | 0.37.0 |
| 2.3.1         | 0.11.0                       | **revert → 0.29.2 JS**                                                     | agentclientprotocol 0.0.44 JS                           | same                                              | 0.37.0 |
| 2.4.0-2.4.1   | 0.12.0                       | 0.29.2 JS                                                                  | agentclientprotocol 0.0.44 JS                           | same                                              | 0.37.0 |
| 2.5.0         | 0.12.1                       | **0.35.0 native ELF 223M, SDK 0.3.143**                                    | agentclientprotocol 0.0.44 JS                           | same                                              | 0.37.0 |
| 2.6.0         | 0.12.2                       | 0.35.0 native                                                              | **back to zed 0.12.0 native**                           | same                                              | 0.37.0 |
| 2.7.0         | 0.12.3                       | 0.35.0 native                                                              | zed 0.12.0                                              | **138M `15a6e5f8` (opencode 1.15.6; prev 1.3.9)** | 0.37.0 |
| 2.8.0-2.11.0  | 0.12.5                       | 0.35.0 native; 2.11.0 **back to JS 0.29.2** (new adapter build `8a3de500`) | zed 0.12.0                                              | 138M `15a6e5f8`                                   | 0.37.0 |
| 2.12.0-2.13.0 | **0.13.0** (161M `e2c50535`) | 0.29.2 JS                                                                  | zed 0.12.0                                              | same                                              | 0.37.0 |

Frozen payloads proven by sha256: codex-acp ELF `dbe72331eb6d…` (204M) byte-identical in every zed-form version incl. 2.2.0 (`extracted/*/codex/node_modules/@zed-industries/codex-acp-linux-x64/bin/codex-acp`); claude `cli.js` `1c4c22f3f693…` (14M) byte-identical in every JS-form version (`extracted/*/acp/node_modules/@anthropic-ai/claude-agent-sdk/cli.js`); gemini's 12 chunk hashes identical 2.2.0→2.13.0 (`signatures/2.2.0.json` vs `2.13.0.json` `engine.components`); opencode has exactly two builds (`0837383c` 154M ≤2.6.0, `15a6e5f8` 138M ≥2.7.0). Only `zcode-acp` (glm) and the small `acp/dist/acp-agent.js` adapter actually evolve — and note `0.29.2` is **not an immutable label**: it ships four different adapter builds (`f112a7e7`@2.2.0, `b2d4e15f`@2.3.1-2.4.1, `8a3de500`@2.11.0, `80a8821a`@2.12.0-2.13.0), i.e. an in-house patched line that returns to the JS form each time while the pinned SDK 0.2.112 payload stays frozen.

## Per-boundary findings

### 2.2.0 → 2.3.0 (05-16) — the first packaging experiment + quota telemetry

- claude-agent-acp 0.29.2 → 0.33.1: swaps the JS SDK bundle for a **native `claude` ELF** (`acp/node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/claude`, 239M, `file`: unstripped x86-64 ELF; `extracted/2.3.0/…/package.json` deps `@anthropic-ai/claude-agent-sdk 0.2.132`). The 7 SDK `vendor/audio-capture/*.node` + `sharp-linux-x64.node` native modules disappear with the JS bundle (`diffs/2.2.0__2.3.0.md` native_modules −7).
- codex-acp `@zed-industries/codex-acp@0.12.0` → `@agentclientprotocol/codex-acp@0.0.44`: native Zed-fork ELF replaced by a JS adapter that spawns upstream `@openai/codex@0.128.0` (`extracted/2.3.0/codex/package.json`; binary at `…/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/codex/codex`, sha `ee37d1c3…`). Adds codex app-server ACP surface: `account/{login/*,logout,rateLimits/updated,read,updated}`, `thread/{list,loaded/list,read,resume,start}`, `turn/{start,interrupt}`, `providers/{list,set,disable}`, `model/list`, `skills/list`, `mcpServerStatus/list`, `config/read`, `fs/changed` (`diffs/2.2.0__2.3.0.md` acp_methods +29).
- Z.AI quota instrumentation lands: IPC `env:bigmodel-usage` (+1 ipc_channels), `provider_cls:BigModelUsageQuotaProvider` (plans +2; provenance `app/out/host/index.js`), endpoints `api.z.ai/api/monitor/usage/quota/limit`, `bigmodel.cn/api/monitor/usage/quota/limit`, `bigmodel.cn/coding-plan/personal/overview`, `z.ai/manage-apikey/subscription`, `zcode.z.ai/api/v1/snapshot/upload-credential` (endpoints added).
- Removed surface is almost entirely old-SDK string bleed: 71 removed `models` are `claude-code-*`/`claude-3*` strings and 10 removed `plans` (`plan:apple_subscription`, `plan:stripe_subscription`, `tengu_exit_plan_mode…`) are Claude-Code-internal literals that lived in SDK 0.2.112's cli.js — they vanish whenever cli.js is absent (see through-lines).

### 2.3.0 → 2.3.1 (05-17, next day) — hotfix revert + model-override routes

- claude-agent-acp **reverted to the 0.29.2 JS line** — same frozen cli.js payload but yet another adapter build (`b2d4e15f`, 83.7K vs 2.2.0's `f112a7e7` 91K); audio-capture modules + all SDK strings return (`diffs/2.3.0__2.3.1.md` models +64/native +7/plans +10 mirror the previous boundary's removals). `host_pkg_version` 899→904 — a 5-build hotfix, one day later.
- codex stays on `@agentclientprotocol/codex-acp@0.0.44`; its account/thread/turn ACP surface stays (only `_claude/origin` removed).
- New: `acp-proxy-runtime/dist/` gains **model-override routes** — `codexModelOverride.js`, `httpForwarding{Anthropic,Codex}ModelOverride.js` (present from 2.3.1, absent 2.3.0/2.2.0; `ls` verified). `codexModelOverride.js` reads an internal `x-zcode-codex-model-override` header and rewrites `body.model` before forwarding — its comment states Codex ACP may still write the gpt default into the body even when the workspace selected a third-party provider, so ZCode's header is authoritative. This is the mechanism that serves non-OpenAI models (GLM) through the codex/claude wire protocols. Signature surfaces as `codex-model-override` (models +1) and `gpt-5.5` (+1, from codex-acp 0.0.44 strings).

### 2.3.1 → 2.4.0 (05-18) — glm 0.12.0, internal mirror surfaces

- `glm 0.11.0 → 0.12.0` (`engine.components.glm`; zcode-acp sha `96b3c883`).
- First appearance of Z.AI's internal dep mirror in signatures: `http://10.253.204.88:12345/zcode/deps/zcode-cli-0.12.0/zcode-linux-x64` and `…/gemini-cli-0.37.0/gemini-cli-bundle.zip` (endpoints +3) — the gemini bundle is fetched from the internal mirror, not GitHub (the `github.com/google-gemini/gemini-cli/releases/…` URL is removed). Note the mirror predates its signature debut: `extracted/2.2.0/glm/.bundle-meta.json` already records `{"provider":"glm","version":"0.11.0","source":"http://10.253.204.88:12345/zcode/deps/zcode-cli-0.11.0/zcode-linux-x64"}` — zcode-acp is a compiled `zcode-cli` artifact fetched from this mirror (same file at 2.13.0 shows version `0.13.0`).
- Model catalog tweak: `deepseek-v4-pro-context-window-1m` → `deepseek-v4-context-window-1m` + `deepseek-v4-flash` (models +3/−1). New endpoint `bigmodel.cn/api/biz/subscription/list`.

### 2.4.0 → 2.4.1 (05-19) — signature-identical rebuild

Every category reports `(no change)`; only asar sha + `host_pkg_version` 923→936 differ (`diffs/2.4.0__2.4.1.md` in full). A pure rebuild/repack release.

### 2.4.1 → 2.5.0 (05-19, same day) — second attempt at native claude

- claude-agent-acp 0.29.2 → **0.35.0** (native `claude` ELF 223M sha `f75fdc3f`, SDK 0.3.143; this time it sticks for 6 versions). Same signature signature as the first attempt: cli.js strings out (`models −60`, `plans −10`, `acp_methods −17`), audio-capture `.node` modules out (native_modules −7).
- New SDK leaks an unreleased Anthropic codename: `claude-mythos-preview` (+1 models) plus `claude-acp`, `claude-code-acp` strings.
- glm 0.12.0→0.12.1 (internal mirror dep bumps `zcode-cli-0.12.1`).

### 2.5.0 → 2.6.0 (05-20) — codex returns to the Zed fork

- codex-acp `@agentclientprotocol/codex-acp@0.0.44` → `@zed-industries/codex-acp@0.12.0` (back to the byte-identical 204M ELF `dbe72331` from 2.2.0). The codex app-server ACP surface (account/_, thread/_, turn/_, providers/_, model/list, skills/list, mcpServerStatus/list, config/read, fs/changed) is removed wholesale (`acp_methods −18`), and its JS-dep env vars (`CODEX_CONFIG`, `CODEX_PATH`, `MODEL_PROVIDER`, `APP_SERVER_LOGS`, `INITIAL_AGENT_MODE`, `DEFAULT_AUTH_REQUEST`) leave (`env_vars −7`). The Zed binary is a cargo checkout `codex-9eee5d47a939c68c/e9fb493` of a codex-rs fork — strings show `multi_agents_v2` tool handlers, `codex-skill-install`, `codex-auto-review`, `codex-js-repl`, realtime (`gpt-realtime-1.5`) — all present since 2.2.0 (they only appear in diffs when strings-cache coverage exists; see REVIEW).
- `codex-apply-patch-repair` (+1 models); `gpt-5.5` leaves with the JS adapter.
- glm 0.12.1→0.12.2; new flags `ZCODE_ASCII_LOGO_LINES`, `ZCODE_WORDMARK` (zcode-acp branding), `ensureWorkspaceOpencodeAutoupdateDisabled` (opencode autoupdate kill-switch), `isRepoSnapshotIndexingEffectivelyEnabled`.
- New IPC `zcode:reset-web-remote-control-pairing` — first web-remote-control channel (the `ZCODE_WEB_REMOTE_CONTROL_{URL,RELAY_WS_URL}` env exist since 2.2.0).

### 2.6.0 → 2.7.0 (05-21) — model catalog refresh + feedback feature

- +81/−29 models — the line's one big catalog refresh: in come `glm-5.1{,-fast,-free,-6bit}`, `GLM-5.1-FP8/-TEE`, `GLM-5V-Turbo`, `glm-for-coding`, `deepseek-v4-flash/pro-6bit/-el`, `doubao-seed-2-0-{lite,mini,pro,code-preview}`, `kimi-k2.6/k2p6(-turbo)`, `kimi-k2-thinking-maas`, `qwen3.5/qwen3.6` family, `gemini-3.1-{flash-lite,pro}`, `gemini-3.5-flash`, `gpt-5.5(-pro)`, `claude-opus-4.7(-fast,-think)`, `claude-haiku/opus/sonnet-latest`; out go `GLM-4.5/4.6-*`, `claude-3*-v1` bedrock names, `deepseek-v3.2*`, `gemini-1.5*`, `qwen2.5*`, `codex-mini-latest`, `cogview-4`, `glm-image` (`diffs/2.6.0__2.7.0.md` models).
- Feedback/ticket feature: IPC `zcode:capture-window-screenshot` + `zcode:open-feedback-dialog` + `zcode:open-tickets-panel` (+3), env `ZCODE_FEEDBACK_API_BASE`, flag `ZCODE_JWT_TOKEN_KEY3`.
- Web-search capability toggles: `enable_web_search`, `enable_web_citations`, `enable_web_scraping`, `webSearchEnabled`, `disable_thinking` (feature_flags +16); search-provider envs `EXA_API_KEY`, `PARALLEL_API_KEY`, `CLOUDFLARE_*`.
- opencode env surface expands: `OPENCODE_{API_KEY,AUTH_CONTENT,DIRECT_TRACE,EDITOR_SSE_PORT,FAST_BOOT,PROCESS_ROLE,REPO_CLONE_GITHUB_BASE_URL,RUN_ID,WEBSEARCH_PROVIDER,WORKSPACE_ID,ZED_DB}` (env_vars +43); **opencode itself jumps upstream 1.3.9 → 1.15.6 this boundary** — `0837383c` 154M → `15a6e5f8` 138M (`engine.components.opencode/opencode`; versions from `strings` `opencode/x.y.z` in each binary), and much of the new model catalog lives in its strings (`doubao-seed-2-0-pro`, `qwen3.6`, `claude-opus-4.7`, `gemini-3-1-pro`, `gpt-5.5` provenance → `extracted_2.7.0_opencode_opencode.txt`). App-side model list entries (`glm-5.1`, `kimi-k2.6`) come from `app/out/{main,host}/index.js`.
- glm 0.12.2→0.12.3.

### 2.7.0 → 2.8.0 (05-22) — glm 0.12.5 + codex strings become visible

- glm 0.12.3→0.12.5 (skips .4); opencode unchanged (still `15a6e5f8`).
- +45 `models` are almost all `codex-*`/`gpt-*` strings from the codex-acp ELF (`codex-skill-install`, `codex-auto-review`, `codex-tui`, `codex-js-repl`, `gpt-realtime-1.5`, …) — **not a real change**: the binary is sha-identical since 2.6.0; this is the strings-cache first covering `codex-acp-linux-x64/bin/codex-acp` (provenance `tmp/lane-b1/strings-cache/2.8.0/…bin_codex-acp.txt`). Same caveat applies to the +114 endpoints (openai auth/docs URLs) and the `features.exec_permission_approvals`/`use_legacy_landlock` flags.
- Real adds: `glm-agent` model + `ZCODE_GLM_AGENT_CATALOG_ID` flag (glm agent catalog, both in `glm_zcode-acp` strings / zcode-acp provenance), `codex/imageDetail` acp method, `CODEX_JS_REPL_*`, `CODEX_THREAD_ID`, `LATEST_MODEL_*`, `OPENAI_API_KEY` envs.
- `@anthropic-ai/sdk` 0.97.1→0.98.0, hono 4.12.21→4.12.22 (endpoint artifact URLs).

### 2.8.0 → 2.9.0 (05-25, after weekend) — payments land

- Subscription/billing: `provider_cls:BigModelCodingPlanSubscriptionProvider` (plans +1; `app/out/host/index.js`), IPC `zcode:payment-callback` (+1), endpoints `/api/pay`, `/api/biz`, `api.z.ai/api/auth/z/login`, `js.stripe.com` + Stripe docs, Tencent captcha `turing.captcha.qcloud.com/TCaptcha.js`, legal docs `docs.z.ai/legal-agreement/*`, `docs.bigmodel.cn/cn/terms/*` (endpoints +17).
- `acp.error.CLAUDE_UNKNOWN_COMMAND{,_WITH_ARGS}` (+2 acp_methods); `ZCODE_BUILD_TIME` env dropped (−1).

### 2.9.0 → 2.10.0 (05-26) — no detectable real change

All removals (−44 models, −111 endpoints, −18 flags, −6 env) are the codex-acp strings-cache dropping out again (codex binary still `dbe72331`; every removed item is a codex-ELF string or its JS deps). plans/acp_methods/ipc/native/engine all `(no change)` except asar+`host_pkg_version` 1070→1089. Treat as a rebuild with zero signature-visible delta.

### 2.10.0 → 2.11.0 (05-27) — native claude abandoned for good

- claude-agent-acp 0.35.0 → **0.29.2**: permanent return to the JS-packaged line — same frozen SDK payload (cli.js `1c4c22f3`, byte-identical since 2.2.0) but a **new** `acp-agent.js` adapter build (`8a3de500`, 96.7K vs earlier `f112a7e7`/`b2d4e15f`). audio-capture `.node` modules + sharp return (native_modules +7), all SDK-embedded strings return (`models +63`, `plans +10`, `acp_methods +17`), `claude-mythos-preview`, `claude-acp`, `claude-code-acp` removed. glm stays 0.12.5.
- The acp_methods removed (`providers/{list,set,disable}`, `after/before/first/second/split/test/unterminated`, `_claude/origin`) are SDK 0.3.143-era adapter strings.
- Verdict: after two attempts (2.3.0, 2.5.0-2.10.0) ZCode settles on the JS-packaged claude agent for the rest of the line. (Why: unknown — possibly audio-capture/driver or size issues; see REVIEW.)

### 2.11.0 → 2.12.0 (05-28) — glm 0.13.0, session messaging, precision tier

- glm 0.12.5→**0.13.0** (zcode-acp 170M→161M `e2c50535`; internal mirror `zcode-cli-0.13.0`).
- Session messaging/mailbox feature: `ZCODE_MESSAGE_ENABLED`, `messageEnabled`, `sessionMessagingEnabled`, `ZCODE_SESSION_MESSAGE_{SEND_REQUESTED,DELIVERY_RESULT}_METHOD`, `ZCODE_MAILBOX_ROOT`, `ZCODE_DATA_BASE_DIR_ENV_KEY`, `ZCODE_LOGO_LINES` (feature_flags +11; first appearance verified across all 14 signatures).
- "Precision" model tier: `glm-5.1-precision`, `deepseek-v4-pro-precision`, `kimi-k2.6-precision`, `kimi-k2.5-lightning`, `qwen3.6-27b-202k`, `qwen3.7-max`, `gemini-3-5-flash`, `glm-5p1-fast` (models +8); `plan:service_tier` (+1, from zcode-acp strings).
- IPC `zcode:web-remote-control-status-changed` (+1) — remote-control feature keeps growing.
- −1042 endpoints: bulk is zcode-acp dropping embedded JS deps — `jimp` image-pipeline docs (jimp-dev.github.io/*), tinycolor, xmlbuilder, badge/shield URLs (provenance: `extracted_2.11.0_glm_zcode-acp.txt`) — i.e., the 0.13.0 rebuild dropped jimp for something else, consistent with the 9MB size cut. Not a coverage artifact (verified: items like jimp URLs are gone from the new binary's strings).

### 2.12.0 → 2.13.0 (05-29) — last 2.x; signature deltas are extraction artifacts

- Engine: NO component change (glm/acp/codex/opencode/gemini identical; only asar+`host_pkg_version` 1137→1163).
- +44 models / +6 env / +20 flags = codex-acp strings-cache returns (same `dbe72331` binary).
- −1768 endpoints: spans zcode-acp (−607), gemini chunks (−497), acp/node_modules (−340), opencode (−296) — **but the underlying files are byte-identical** (zcode-acp `e2c50535`, opencode `15a6e5f8`, cli.js `1c4c22f3`, acp/ file list identical at 3625 files, gemini chunk shas identical). Spot-checked "removed" strings are still in the 2.13.0 binaries (`api.github.com/users/` ×60, `releases/latest` ×5, `anomalyco/opencode` ×7 in `extracted/2.13.0/{glm,opencode}`). Pure extraction anomaly — the 2.13.0 signature undercounts binary-derived strings ~40-60%. See REVIEW.
- Real change this boundary: nothing signature-visible beyond a recompile. (Endpoint +58 is the codex cache re-adding its strings.)

## Through-lines

1. **Two packaging regimes fighting for the JS-vs-native decision.** Both agent adapters seesaw between a JS bundle and a compiled binary on different schedules: claude-acp `0.29.2`(JS cli.js 14M) ↔ `0.33.1/0.35.0`(native `claude` ELF 239M→223M); codex-acp `zed 0.12.0`(native 204M) ↔ `agentclientprotocol 0.0.44`(JS + `@openai/codex` 0.128.0). Claude: JS@2.2.0 → native@2.3.0 → JS@2.3.1 → native@2.5.0-2.10.0 → JS@2.11.0+. Codex: native@2.2.0 → JS@2.3.0-2.5.0 → native@2.6.0+. The 2.3.1 next-day revert reads as a hotfix; the 2.11.0 revert is a final decision. Net effect on signatures: whenever cli.js is absent, ~490 env vars / ~120 flags / ~60 "models" / ~10 plan literals vanish — the env/flag/model "oscillation" in the counts table is this packaging flip, not feature churn (`signatures/*/provenance.env_vars` → `claude-agent-sdk/cli.js`).

2. **Frozen payloads, evolving glue.** The heavyweight artifacts barely move: codex-acp ELF identical since 2.2.0, claude cli.js identical in every JS-form version, gemini chunks identical all line, opencode upstream-bumped once (1.3.9→1.15.6 at 2.7.0, 154M→138M `15a6e5f8`). What evolves: `acp/dist/acp-agent.js` adapter (new hash every boundary), `acp-proxy-runtime/dist` (19→22 js at 2.3.1 adding model-override routes), `app/out/host` (provider classes, IPC), and `glm/zcode-acp` (the only runtime with real version progression 0.11.0→0.13.0, each a ~160-170M `zcode-cli` build from `http://10.253.204.88:12345/zcode/deps/`). zcode-acp is a Bun-compiled Fastify app speaking Anthropic-shaped requests to `bigmodel.cn/api/anthropic` + `*/api/coding/paas/v4` + `tokenByAuthCode` OAuth (binary strings).

3. **acp-proxy-runtime is the keystone.** `dist/` implements a wire-format matrix — `codexAnthropicCompat`, `codexGeminiCompat`, `codexOpenaiChatCompat`, `geminiOpenaiChatCompat`, `httpForwarding*` variants, `*ModelOverride`, plus `proxyServer`, `certificate.js`, `capture.js`, `trafficEventEmitter.js`, `wsUpgradeHandler.js` — so the host can route any agent runtime through Z.AI's anthropic-shaped PaaS while rewriting `body.model` via `x-zcode-codex-model-override` (2.3.1+). This is how GLM backs codex/claude/gemini UIs. The 3.x epoch-gap (`notes/epoch-gap.md`) shows this whole apparatus deleted when the five runtimes collapse into `zcode.cjs`.

4. **Z.AI service surface builds out in order: quota → auth → billing.** 2.3.0 quota monitoring (`env:bigmodel-usage`, `*/api/monitor/usage/quota/limit`, `BigModelUsageQuotaProvider`); 2.3.1 model-override proxy; 2.6.0 remote-control pairing reset + snapshot indexing flags; 2.7.0 feedback/tickets + web-search toggles; 2.9.0 Stripe+TCaptcha+`BigModelCodingPlanSubscriptionProvider`+`zcode:payment-callback`+`/api/pay`; 2.12.0 session messaging + `service_tier` + remote-control status IPC. By 2.13.0 the endpoint set covers `api.z.ai`/`bigmodel.cn`/`open.bigmodel.cn` (`/api/anthropic`, `/api/paas/v4`, `/api/coding/paas/v4`, quota-limit, `getCustomerInfo`, `tokenByAuthCode`), `zcode.z.ai` (oauth token, snapshot upload-credential, `/remote`, changelogs), `zcode-ai.com` (event report, feedback), CDN config (`cdn.zcode-ai.com/zcode/config/default.json`, `cdn.codegeex.cn` update releases).

5. **Feature chassis exists since 2.2.0.** `ZCODE_WORKFLOW_{START,LIST,GET,EVENT,RETRY,CANCEL}_METHOD`, `ZCODE_TURN_STEER_*`, `ZCODE_WEB_REMOTE_CONTROL_*`, `ZCODE_LARK_CLI_BINARY` (matches app dep `@larksuiteoapi/node-sdk` — Feishu/Lark integration), `ZCODE_MODEL_RETRY_*` (4 knobs), `ZCODE_REPO_SNAPSHOT_UPLOAD_CREDENTIAL_URL` (2.3.0+) are present in every 2.x signature — the line's work is mostly engine-packaging + monetization, not greenfield features. New-in-line: opencode autoupdate kill-switch + snapshot indexing (2.6.0), web search/citations (2.7.0), GLM agent catalog (2.8.0), payments (2.9.0), session messaging + service_tier (2.12.0).

6. **IPC surface is small and deliberate.** 93→100 channels, one at a time: `env:bigmodel-usage` (2.3.0), `zcode:reset-web-remote-control-pairing` (2.6.0), `zcode:{capture-window-screenshot,open-feedback-dialog,open-tickets-panel}` (2.7.0), `zcode:payment-callback` (2.9.0), `zcode:web-remote-control-status-changed` (2.12.0). Theme: remote-control + feedback + billing, all `zcode:`-namespaced.

7. **deps/plugins/tools frozen.** `app/package.json` deps identical (22: `@zcode/{client,rpc,server,services,shared,ui}` workspace, react 19.2.4, electron-updater 6.8.3, node-pty, ssh2, undici, ws, yazl, @sentry/electron, @larksuiteoapi/node-sdk 1.61.1…), `plugins_skills` = same 18 gemini bundled_pkgs, `bundled_tools` = ripgrep 13.0.0 throughout.

8. **Model catalog = one big refresh + rolling additions.** The wholesale swap is 2.7.0 (+81/−29: glm-5.1/doubao-seed-2/kimi-k2.6/qwen3.6/gemini-3.x/gpt-5.5/claude-4.7 in; GLM-4.x-TEE/deepseek-v3.2/gemini-1.5/qwen2.5 out). Otherwise small deltas: deepseek-v4 naming (2.4.0), precision tier (2.12.0). The catalog is spread across `glm/zcode-acp` strings, `opencode` strings (upstream catalog), and `app/out/{main,host}` (app-side model list) — it follows engine build cadence, not app releases.

## REVIEW — unverified or artifact-prone claims

1. **codex-acp strings-cache coverage is patchy**: present only for 2.8.0/2.9.0/2.13.0 (`signatures/*/provenance` paths under `tmp/lane-b1/strings-cache/*codex-acp*`). The byte-identical binary means 2.8.0's "+45 codex-* models / +114 endpoints" and 2.10.0's symmetric removals are coverage noise, not product change; the codex feature surface (skills, multi_agents_v2, realtime, landlock flags) existed since 2.2.0.
2. **2.13.0 signature undercounts binary strings ~40-60%** across zcode-acp/opencode/gemini/acp-node_modules despite byte-identical inputs (verified: removed items still in binaries; acp/ file list identical at 3625). Probably a truncated/different strings run for the last version — do not treat 2.12.0→2.13.0's −1768 endpoints as real.
3. **claude `claude` ELF (239M/223M, present 2.3.0 & 2.5.0-2.10.0) has zero strings coverage** in any signature (no `claude-agent-sdk-linux-x64/claude` provenance entries). For native-form versions the claude agent contributes almost nothing beyond package metadata — feature comparisons across the JS↔native boundary are partially blind.
4. **Why the claude reverts happened is undetermined.** 2.3.1 next-day revert suggests a hotfix; candidates: loss of `audio-capture` `.node` voice modules with the native build, or the 239M size. The permanent 2.11.0 revert coincides with no other visible change. Not verifiable from the corpus.
5. **`plan:service_tier` and `claude-mythos-preview`** are binary-string finds (zcode-acp / SDK) — presence of the string proves the code path exists, not that a user-facing feature shipped.
6. **attribution of the big ACP surface at 2.3.0**: the account/thread/turn/providers methods arrive with `@agentclientprotocol/codex-acp@0.0.44` and leave with it at 2.6.0 — they're codex app-server methods, not claude-acp's (initially ambiguous since both swapped at 2.3.0).
7. **opencode versions confirmed**: `opencode/1.3.9` (the `0837383c` build, 2.2.0-2.6.0) → `opencode/1.15.6` (`15a6e5f8`, ≥2.7.0) — a 12-minor-version upstream jump inside one app release. Whether upstream 1.15.6 was itself current at ship time is unverified.
8. env_vars/feature_flags counts include Chromium/library noise (e.g., `IsUndefinedDoubleEnabled`, `enable_bytecode_compiler_ablation`); only `ZCODE_*`, `OPENCODE_*`, `CODEX_*`, provider toggles were used for claims here.
