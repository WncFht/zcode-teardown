# Lane c3 — 3.2.x → 3.3.x line analysis (3.1.3→3.3.6, 13 boundaries)

## Cross-cutting caveat discovered: THREE signature generations in this range

Endpoint/plan churn in this lane's diffs is dominated by **extractor-version artifacts**, not product changes. Verified by re-grepping the extracted trees:

- **gen-old** (scanned `*.md`, no junk-host blocklist): signatures 3.1.3 (456 eps), 3.2.2, 3.2.3, 3.2.5 (422 eps each). `docjunk` count 32, `ooxml` 7, `example.com` 3.
- **gen-mid** (junk hosts blocked, `*.md` still scanned): 3.3.0–3.3.6 except 3.3.2 (376–378 eps). docjunk 0, ooxml 7, example 3.
- **gen-new** (junk hosts blocked + `*.md` dropped from TEXT_GLOBS — current `tools/extract_signatures.py`): 3.2.0, 3.2.1, 3.2.4 (371 eps), 3.3.2 (364 eps). docjunk 0, ooxml 0, example 0.

Proof the dropped strings are artifacts, not removals: `extracted/3.2.3/app/out/renderer/assets/chunk-K5T4RW27-COPdmeCz.js` and the 3.2.4 file are **byte-identical** (sha256 `01a9295f…`) and both contain all `chevrotain.io/docs/*` URLs — yet 3.2.4's signature lacks them. Within that same file, `github.com/chevrotain/*` URLs survived in 3.2.4's signature because github.com isn't in `URL_JUNK_HOSTS`. Same story for `plan:lesson_plan` (provenance: `glm/packages/document-skills-plugin/skills/docx/references/design-system.md` — an `.md` file) and every ooxml/fonts.googleapis/texdoc/drop-sh/example.com endpoint (all `.md`-sourced under `glm/packages/**` or junk-listed).

Consequences: ±51-endpoint swings (3.2.2→3.2.4→3.2.5), the ±12 set (3.3.1↔3.3.2↔3.3.3), and the lesson_plan toggles are **100% tooling artifacts**. Signature files for 3.2.0/3.2.1/3.2.4/3.3.2 should be regenerated for clean cross-boundary comparison. This also means ~51 of the 89 "removed" endpoints at 3.1.3→3.2.0 and ~40 of the 48 "removed" at 3.2.5→3.3.0 are artifacts — real deltas enumerated below only count same-generation comparisons or tree-verified changes.

Substitute-format artifacts observed (expected, flagged not as product changes): `rg: unavailable:OSError` on non-native-arch substitutes (3.2.1 dmg, 3.2.4 + 3.3.2 linux-**arm64** AppImages — can't exec arm64 rg on x64); native `.node` path/sha churn per platform; `host_binary_sha256` differs per substitute platform (exe `b1603a…`, dmg `1429436…`, arm64-appimage `abfeaa…`); 3.3.5's arm64 `pty.node` = empty-file sha `e3b0c44…` (0-byte placeholder in the arm64 AppImage, restored to `d8314c…` at 3.3.6 deb); `apparmor-profile` absent on AppImage trees; `host_pkg_version` = `None` on substitutes.

## Per-boundary findings

### 3.1.3 → 3.2.0 (deb → win-exe substitute) — the superpowers excision

REAL:

- `glm/packages/superpowers-plugin` deleted wholesale: `plugin:superpowers@5.1.0` + 14 skills (`brainstorming`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `receiving-code-review`, `requesting-code-review`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `writing-plans`, `writing-skills`) — diffs/3.1.3__3.2.0.md plugins_skills. Verified dir absent in `extracted/3.2.0/glm/packages/`.
- With it went the `BRAINSTORM_*` env vars (5: DIR/HOST/OWNER_PID/PORT/URL_HOST — the brainstorming skill's session server) and `RIPGREP_NODE_WASI`.
- Real endpoint removals (comparing same-gen 3.1.3→3.2.2, −38): the superpowers ecosystem — `agentskills.io/specification`, `claude.com/plugins/superpowers`, `github.com/obra/superpowers`(+`/issues`, `sponsors/obra`, raw `INSTALL.md`), `primeradiant.com`(+`/superpowers/`), `blog.fsck.com/2025/10/09/superpowers/`, `discord.gg/35wsABTejz`, `github.com/openai/plugins`, 12× `mintcdn.com/anthropic-claude-docs` agent-skills images. Plus `platform.claude.com/docs/…/context-windows`, `/v1/tickets`, `http://localhost:52341`.
- Product surfaces renamed: `docs.z.ai` → `https://zcode.z.ai/docs`; `feedback.zcode-ai.com` dropped entirely.
- Adds: `/api/v1`, `https://api.anthropic.com/api/web/domain_info` (Claude-domain reachability probe), `https://github.com/{}.git` clone template.
- +17 flags (diff): `ZCODE_BETA` channel; **embeddedSearch subsystem** — `embeddedSearchEnabled`, `embeddedSearchBranchEnabled`, `resolveRuntimeEmbeddedSearchEnabled`, `resolveSubagentEmbeddedSearchEnabled`, `ZCODE_EMBEDDED_SEARCH_COMMAND`, `subagentBackgroundEnabled`, `backgroundEnabled`; `optimizeAgentExperienceEnabled`; E2E fault injection `ZCODE_E2E_FS_FAULTS(+_ALLOW)`; `ZCODE_SESSION_ID`, `ZCODE_SKILL_DIR`, `ZCODE_RUNTIME_MODEL_MISMATCH`. Verified `embeddedSearchEnabled`×23 + `embeddedSearchBackend`×10 + `embeddedSearchShutdownSignals` live in `extracted/3.2.5/glm/zcode.cjs`.
- +3 acp: `mcp/list`, `session/rewindCascade`, `workspace/generateText` (all `glm/zcode.cjs` per signatures/3.2.2 provenance).
- IPC: `zcode:desktop-zoom-level-changed`, `zcode:get-desktop-zoom-level`, `zcode:window-controls-overlay-changed`, `zcode:window-controls-overlay-ready` replace `zcode:zoom-level-changed` — desktop zoom + Windows WCO titlebar work.
- plans +`tier:free`. models +`claude-code-hint`/`claude-hook` (zcode.cjs, still present at 3.2.2) — claude-code-compat hooks; −`claude-content`/`claude-docs`/`codex-tools.md` (all superpowers-plugin files), −obfuscated `k2.1cHc`/`o3-7df`.
- env +`ZCODE_ENV` (the env var that later drives the 3.3.0 URL refactor).
- zcode.cjs shrinks 9,453,789 → ~9.04 MB (≈ −400 KB ≈ the superpowers payload).

ARTIFACTS: −10 native_modules (linux .node paths absent in win-exe tree); −1 bundled rg (no linux rg in exe); the ~51 doc-URLs (extractor generation); host_binary sha (exe host).

### 3.2.0 → 3.2.1 (exe → dmg, both gen-new)

- REAL: +1 IPC `zcode:create-temp-text-attachment` (`app/out/preload/index.cjs`). Everything else zero.
- ARTIFACTS: darwin node-pty prebuild churn; `rg: unavailable:OSError`.

### 3.2.1 → 3.2.2 (dmg → deb; gen-new → gen-old)

- REAL: +2 acp `session/applyFileRewind`, `session/previewFileRewind` — completes the file-rewind trio begun by `rewindCascade` at 3.2.0 (all in `glm/zcode.cjs`). +1 env `NODE_DEBUG`.
- Note: `host_binary_sha256` returns to `7f7881…` — identical to 3.1.3's deb host, confirming the Electron shell didn't change at 3.2.x either.
- ARTIFACTS: +51 endpoints (gen-old coverage restored), +`plan:lesson_plan`, rg availability, linux .node set returns.

### 3.2.2 → 3.2.3 (deb → deb, same extractor — cleanest boundary in lane)

- REAL: **+7 plugins_skills — new first-party `plugin:zcode-guide-plugin@0.1.0`** with skills `diagnosing-commands`, `diagnosing-hooks`, `diagnosing-mcp`, `diagnosing-plugins`, `diagnosing-skills`, `zcode-configuration-guide`. Verified `extracted/3.2.3/glm/packages/zcode-guide-plugin/` exists. This is the in-house replacement for the ripped-out superpowers bundle — self-diagnosis instead of generic workflow skills.
- +1 flag `persistedDraftsEnabled`; +1 env `TEST_UPDATER_ARCH`.

### 3.2.3 → 3.2.4 (deb → arm64-appimage; gen-old → gen-new)

- REAL: **zero signature-visible deltas.** zcode.cjs rebuilt anyway (sha `5031c2…`→`388dd9…`).
- ALL −51 endpoints + −`plan:lesson_plan` are extractor artifacts (verified byte-identical chunk file above). rg/native/apparmor diffs are substitute artifacts.

### 3.2.4 → 3.2.5 (arm64-appimage → x64-appimage; gen-new → gen-old)

- REAL: **zero** — the +51/+1 are the mirror artifact. x64 host binary back to `7f7881…`.

### 3.2.5 → 3.3.0 (x64-appimage → deb; gen-old → gen-mid — comparable since both scan .md)

- REAL endpoint refactor — **hardcoded billing/console URLs become env-resolved paths**: literals `https://bigmodel.cn/apikey/platform`, `…/coding-plan/personal/overview` (×2 incl. www), `…/finance-center/finance/pay`, `https://api.z.ai/api/biz/subscription/list`, `https://api.z.ai/api/monitor/usage/quota/limit`, `https://zcode.z.ai/api/v1/snapshot/upload-credential` all disappear as absolutes. Verified in-tree: `extracted/3.3.0/app/out/renderer/assets/index-CD59NcFo.js` now builds `R({ZCODE_ENV:At},'/finance-center/finance/pay')`; `app/out/host/index.js` keeps `api.z.ai` base + relative `"/api/biz/subscription/list"`, `"/api/monitor/usage/quota/limit"`. Strings remain in tree — only the literal form changed (real refactor, not feature removal).
- `api.anthropic.com/api/web/domain_info` **removed** — added at 3.2.0, dead by 3.3.0 (one-line lifespan); `grep -rl domain_info extracted/3.3.0/` → empty.
- +2 endpoints: `/api/v1/snapshot/upload-credential` (relative form), `/api/v2/releases/latest`.
- +5 flags: `ZCODE_BIGMODEL_TEAM_PLAN_MEMBER_REQUIRED`, `authenticatedEnterpriseProductsEnabled`, `desktopChromiumHardwareAccelerationEnabled`, `extractBootstrapChromiumHardwareAccelerationEnabled` (main/index.js — GPU blacklist handling at bootstrap), `primaryActionDisabled`.
- +2 plans `tier:personal`, `tier:team` (both `app/out/host/index.js`) — team/enterprise plan ladder lands alongside existing `provider_cls:BigModelCodingPlanSubscriptionProvider`/`BigModelUsageQuotaProvider`.
- +1 IPC `zcode:select-files`.
- ARTIFACTS: the ~40 doc-URL removals (junk-host blocklist in gen-mid).

### 3.3.0 → 3.3.1 (deb → x64-appimage; both gen-mid)

- **Zero deltas in every category** — a true hidden build. zcode.cjs differs from byte 38, ~90% sampled-byte drift, −5.4 KB (9088643→9083233): real code churn beneath the signature surface.

### 3.3.1 → 3.3.2 (x64-appimage → arm64-appimage; gen-mid → gen-new)

- REAL: +2 flags `ZCODE_UPDATE_FEED_URL`, `ZCODE_UPDATE_RELEASE_ROOT_URL` (env-overridable update feed — `app/out/main/index.js`).
- ARTIFACTS: −12 endpoints (the `.md`/example set), −`lesson_plan`, rg OSError (arm64), host sha (arm64).

### 3.3.2 → 3.3.3 (arm64 → x64 appimage; gen-new → gen-mid)

- REAL: **zero** — +12 endpoints/+lesson_plan are the mirror artifact. This is the CDN-layout-migration release noted in provenance (flat `releases/<v>/` and nested `releases/<v>/<plat>/` both live at 3.3.3), but the product signature is unchanged; the update URL stays nested `releases/update/linux/x64/` throughout (app-update.yml, all versions).

### 3.3.3 → 3.3.4 (both x64-appimage, gen-mid)

- REAL: +`ZCODE_CREDENTIAL_DECRYPT_FAILED`; −`backgroundEnabled`, −`subagentBackgroundEnabled` — the two background-task flags added at 3.2.0 are retired (embeddedSearch background work reorganized).

### 3.3.4 → 3.3.5 (both x64-appimage, gen-mid) — **the CUA landing**

- **+20 flags, all Computer-Use-Agent infrastructure**: `ZCODE_CUA_HELPER_{DOWNLOAD_URL,DOWNLOAD_BASE_URL,DOWNLOAD_TIMEOUT_MS,MAX_DOWNLOAD_BYTES,VERSION,BUNDLE_ID,TEAM_ID,ALLOW_DOWNGRADE,ALLOW_UNSIGNED_LOCAL,ALLOW_UNAUTHENTICATED_LOCAL}`, `ZCODE_CUA_{LAUNCHER_PID,PRODUCT_HELPER}`, `ZCODE_CUA_PERMISSION_BROKER_{SOCKET,TOKEN,UNAVAILABLE}` — provenance splits: helper download/lifecycle in `app/out/host/index.js`, permission-broker transport in `glm/zcode.cjs`. Plus `ZCODE_AGENT_PROVIDER_NOT_READY`, `ZCODE_DEPS_BASE_URL`, `ZCODE_HOME`, `ZCODE_TARGET_ARCH`, `ZCODE_TARGET_OS`.
- +4 IPC (`app/out/preload/index.cjs`): `zcode:open-cua-accessibility-settings`, `zcode:open-cua-permission-onboarding`, `zcode:prepare-cua-helper-permission-drag`, `zcode:start-cua-helper-permission-drag` — macOS-style accessibility-permission onboarding + a drag-based permission grant flow.
- +2 acp (`app/out/host/index.js`): `authenticate`, `broker_info` — the permission broker's RPC verbs.
- +1 env: `ZCODE_CUA_HELPER_ALLOW_UNAUTHENTICATED_LOCAL`.
- ARTIFACTS: arm64 `pty.node` → empty sha `e3b0c44…`; `https://github.com/${a4` truncated-template endpoint (extraction noise).

### 3.3.5 → 3.3.6 (x64-appimage → deb; both gen-mid) — **auto-update built out**

- +7 IPC: `zcode:download-update`, `zcode:cancel-update-download`, `zcode:get-auto-update-preferences`, `zcode:set-auto-download-and-install-updates`, `zcode:skip-update-version`, `zcode:open-update-status-window`, `zcode:application-locale-changed` — a complete update UI control surface.
- +1 endpoint `/api/v1/releases/electron/manifest` — verified `MF="/api/v1/releases/electron/manifest"` next to `electron-updater` + yaml parse in `extracted/3.3.6/app/out/main/index.js`: a self-hosted manifest feed replacing the generic-provider flow.
- +8 flags: `ZCODE_AUTO_UPDATE_DEV`, `ZCODE_AUTO_UPDATE_DEV_VERSION`, `isDevAutoUpdateEnabled` (dev-channel updates), `ZCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX`, `ZCODE_AGENT_MCP_STATUS_MODE_UNSUPPORTED`, `ZCODE_E2E_RUNTIME_LOG_DIR`, `actionsDisabled`, `stickyScrollbarDisabled`; −`ZCODE_UPDATE_RELEASE_ROOT_URL` (lived 3.3.2→3.3.5 only).
- +3 env: `ZCODE_BASE_URL`, `ZCODE_ENDPOINT_ORIGIN` (more endpoint configurability — continues the 3.3.0 refactor), `ZCODE_E2E_RUNTIME_LOG_DIR`.
- **ANOMALY**: `extracted/3.3.6/app-update.yml` ships `url: http://localhost:8081` in the production deb — a dev feed address baked into a release artifact (see REVIEW).

## Through-lines

1. **Plugin stack nationalization**: third-party `superpowers` bundle (obra's plugin + 14 workflow skills, BRAINSTORM_* IPC server, its doc-URL tail) ripped out at 3.2.0; first-party `zcode-guide-plugin@0.1.0` (six `diagnosing-*` skills + config guide) appears at 3.2.3. Core plugin roster otherwise frozen at 23 entries: `document-skills-plugin@0.1.0`, `ios-simulator-plugin`, `android-emulator-plugin`, `restore-legacy-sessions-plugin`, `skill-creator-plugin` constant 3.1.3→3.3.6 (file lists byte-stable 3.2.2–3.2.5 checked).
2. **Frozen host, hot payload**: linux-x64 host binary is literally the same file all line — sha `7f7881d0…`, size 206,036,184 — 3.1.3 through 3.3.6. `host_pkg_version` (`-1871`→`-3198`) is a packaging stamp; `deps` frozen at 25 (`node-pty ^1.0.0` constant). Every change rides in `app.asar` + `glm/zcode.cjs` (9.04→9.21 MB net growth post-superpowers).
3. **Hidden builds are the norm**: 3.2.4, 3.3.1, 3.3.3, 3.3.4 boundaries carry ~zero signature deltas yet zcode.cjs is substantially rewritten each time (3.3.0→3.3.1: ~90% sampled-byte drift). This line shipped at least four invisible rebuilds — the "heavy hidden-build activity" is real but mostly sub-signature (internal refactors/fixes leave the endpoint/flag surface untouched).
4. **Endpoint configurability refactor**: 3.2.0 adds `ZCODE_ENV`; 3.3.0 converts billing/quota/subscription literals to env/base-resolved paths; 3.3.6 adds `ZCODE_BASE_URL`/`ZCODE_ENDPOINT_ORIGIN`. Direction: one binary, many deployments (prod/dev/test) driven by env.
5. **Update pipeline rebuilt in stages**: `ZCODE_UPDATE_FEED_URL`/`_RELEASE_ROOT_URL` (3.3.2) → custom `/api/v1/releases/electron/manifest` yaml feed + full update-UI IPC surface (3.3.6), with `TEST_UPDATER_ARCH`/`ZCODE_AUTO_UPDATE_DEV*` testability hooks. The static `app-update.yml` feed stays `cdn-zcode.z.ai/zcode/electron/releases/update/linux/x64/` throughout (already platform-nested before the CDN migration).
6. **Monetization ladder**: `tier:free` (3.2.0) → `tier:personal` + `tier:team` + `ZCODE_BIGMODEL_TEAM_PLAN_MEMBER_REQUIRED` + `authenticatedEnterpriseProductsEnabled` (3.3.0) — team/enterprise BigModel plans land with host-side subscription/quota providers.
7. **Feature arcs**: file-rewind (rewindCascade 3.2.0 → apply/previewFileRewind 3.2.2); embeddedSearch (flags 3.2.0 → background flags retired 3.3.4); CUA permission-broker (entire subsystem appears atomically at 3.3.5); auto-update UX (3.3.6). Models surface is flat: 672 entries, zero net changes after 3.2.0 — no new model onboarding in this whole line.
8. **ACP surface**: 65→72 methods: +`mcp/list`, `session/rewindCascade`, `workspace/generateText` (3.2.0); +`session/applyFileRewind`, `session/previewFileRewind` (3.2.2); +`authenticate`, `broker_info` (3.3.5, host-side broker not ACP-session). IPC 105→121, all adds no removals except the zoom-channel rename.

## REVIEW — unverifiable / flagged

- **Signatures for 3.2.0, 3.2.1, 3.2.4, 3.3.2 are gen-new** (junk-host blocklist + no `.md` scan) while neighbors are gen-old/gen-mid. Cross-boundary endpoint/plan diffs involving them are unusable without regeneration; I separated real deltas by comparing same-generation signatures (3.1.3→3.2.2) and grepping trees directly.
- **`app-update.yml` `url: http://localhost:8081` in 3.3.6 deb**: likely a dev feed leaked into the release artifact. Mitigating possibility: the new `ZCODE_UPDATE_FEED_URL`/`/api/v1/releases/electron/manifest` path may supersede the yml entirely, making it dead config rather than a functional break. Can't confirm which updater path wins without running the binary.
- **`docs.z.ai`/`feedback.zcode-ai.com` removal**: verified absent from same-gen signatures; presumed migrated to `zcode.z.ai/docs` (added same boundary) but feedback.* has no visible replacement — may have moved to `/api/v1/event/report` (already present) or been dropped.
- **app.asar cross-format identity**: can't be tested in-lane (no version has two formats). Asar sha differs across formats per boundary but no same-version deb/substitute pair exists. The x64-AppImage substitutes should carry the deb-identical asar; arm64 substitutes (3.2.4, 3.3.2) may legitimately differ in bundled native content.
- **`k2.1cHc`/`o3-7df` model removals at 3.2.0**: obfuscated ids in zcode.cjs — can't tell if real model removals or minification churn of the same models.
- **CUA target platform**: `open-cua-accessibility-settings`/`permission-drag` IPCs read as macOS a11y-permission flow, but signature comes from the linux build — the subsystem is cross-platform in code; actual gating can't be confirmed from signatures alone.
- **`http://localhost:52341` removed at 3.2.0**: real removal in the signature set but never resolved what service it was (likely a dev-mode callback port).
