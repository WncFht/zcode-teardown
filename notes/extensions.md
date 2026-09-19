# Lane c10 — Extensions topical (plugins, skills, commands, bundled tools, native modules)

## plugin system

**Manifest format.** Each bundled plugin lives at `glm/packages/<dir>/` with a manifest at `.zcode-plugin/plugin.json`. Discovery accepts three manifest paths — `.zcode-plugin/plugin.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` — i.e. ZCode implements a Claude-Code/Codex-compatible plugin contract (zcode.cjs:2105 `L_i`, :2109 `oxi/ixi/sxi`, :2115 `Bki/qki/Vki`). Env-var interpolation in manifests supports both `ZCODE_*` and `CLAUDE_*` names: `ZCODE_PLUGIN_ROOT`/`CLAUDE_PLUGIN_ROOT`, `ZCODE_PLUGIN_DATA`/`CLAUDE_PLUGIN_DATA`, `ZCODE_PROJECT_DIR`/`CLAUDE_PROJECT_DIR`, `ZCODE_SESSION_ID`/`CLAUDE_CODE_SESSION_ID`, plus `ZCODE_PLUGIN_ID`, `ZCODE_PLUGIN_NAME` (zcode.cjs:2101 `$m`, :2865 `CK`, :3419).

**Bundled registry.** zcode.cjs:3194 hardcodes a registry of official plugins: `{name, version, rootCandidates:["packages/<dir>","../<dir>","../../<dir>","../../../<dir>"], requiredSeedPaths, defaultEnabled?, listing:{author,category,displayName,displayName_i18n,icon}}`. `exs` (zcode.cjs:3195) probes each rootCandidate under `candidateBaseDirs()` for an on-disk `.zcode-plugin/plugin.json`. `defaultEnabled:!0` is set only on browser-use, document-skills, skill-creator, zcode-guide; android-emulator, ios-simulator, restore-legacy-sessions, computer-use are opt-in (no flag). Categories: developer-tools (android, ios), productivity (browser-use, document-skills, computer-use), utilities (restore-legacy-sessions, skill-creator), guides (zcode-guide). Icons are CDN URLs `https://cdn-zcode.z.ai/zcode/official-plugin/assets/<name>/icon.png` (zcode.cjs:2109 `nPt`).

**Two sourcing modes.** (1) Desktop: `glm/packages/*-plugin` dirs found via rootCandidates. (2) Standalone/SEA: plugins are embedded as `node:sea` assets under `zcode-official-plugins/` — `Q_s` reads `getAsset("zcode-official-plugins/manifest.json")` (zcode.cjs:3195). Seeds are extracted to `officialPluginCacheRoot()` into versioned dirs with `.zcode-plugin-seed.json` markers, `.seed-lock` dirs, `.backup` retention, and `ZCODE_PLUGIN_SEED_INCOMPLETE` error on missing `requiredSeedPaths` (zcode.cjs:3195 `NFn`, `H_s` top-level allowlist = `.mcp.json .zcode-plugin README.md agents commands dist docs hooks output-styles package.json sc…`).

**User/marketplace plugins.** Claude Code's marketplace model is ported wholesale: `known_marketplaces.json`, `installed_plugins.json`, `marketplace.json`, default marketplace id `claude-plugins-official`, plugin ids as `<name>@<marketplace>` (zcode.cjs:2109 `uMe`, `OG`), zip install via yauzl (zcode.cjs:2105 `F_i`), icon catalog fetched from `https://cdn-zcode.z.ai/zcode/official-plugin/assets/icon-sources.json` (zcode.cjs:2109 `Q_i`, 10MB cap `exi`). CLI surface at zcode.cjs:2413: `plugins:install|uninstall|link|update|inspect`, `--plugin-dir`, `--plugins`, `--no-plugins`, `--skip-plugins`, `plugin_marketplace_invalid`, `plugin_marketplace_source_unsupported` (zcode.cjs:2108/3195).

**The 8 plugins at v3.12.3** (manifests: extracted/3.12.3/glm/packages/*/.zcode-plugin/plugin.json):

| plugin (manifest name)  | dir                            | ver    | contributes                                                                                                                                                                                               |
| ----------------------- | ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| android-emulator        | android-emulator-plugin        | 0.1.0  | skills/android-dev, commands/android-dev.md, stdio MCP `android-emulator` (node dist/mcp/server.js), hooks/hooks.json (empty), templates/compose-app, userConfig (sdk_path, default_avd, api_level=35, …) |
| ios-simulator           | ios-simulator-plugin           | 0.1.0  | skills/ios-dev, commands/ios-dev.md, stdio MCP `ios-simulator`, hooks (empty), templates/swiftui-app, userConfig (default_device, ui_backend)                                                             |
| browser-use             | browser-use-plugin             | 0.4.2  | skills control-browser + web-gui-tester only (no MCP — CDP automation is in-app: "Desktop IAB and explicitly enabled CLI-managed headless CDP")                                                           |
| document-skills         | document-skills-plugin         | 0.1.5  | skills docx/pdf/pptx/xlsx, agents/, HTTP MCP `image_search` → `${ZCODE_BASE_URL}/api/v1/mcp/server/image_search` with `auth.type:"zcode_official", provider:"jwt_token"`, 90s timeout                     |
| computer-use            | zcode-cua-plugin               | 0.5.14 | skills/computer-use, stdio MCP `computer-use` (90s timeout), vendored node_modules incl. koffi + sharp                                                                                                    |
| restore-legacy-sessions | restore-legacy-sessions-plugin | 0.1.0  | skills + commands/restore-legacy-sessions.md ("restore legacy ACP-era ZCode sessions")                                                                                                                    |
| skill-creator           | skill-creator-plugin           | 0.1.0  | skills/skill-creator (SKILL.md only at 3.12.3)                                                                                                                                                            |
| zcode-guide             | zcode-guide-plugin             | 0.1.0  | 6 skills: zcode-configuration-guide, diagnosing-{commands,hooks,mcp,plugins,skills}                                                                                                                       |

Commands are thin prompts that pin a skill (e.g. `commands/android-dev.md` frontmatter `skills: android-dev`, body "Use the android-dev skill … start with android_preflight"). Plugin MCP servers spawn as `node ${ZCODE_PLUGIN_ROOT}/dist/mcp/server.js` with `cwd:${ZCODE_PROJECT_DIR}`.

**The 14 packages at v3.14.0** — `document-skills`（0.1.5）一拆五退场，node-repl-host / plugin-creator 首发：

| plugin (manifest name)  | dir                            | ver   | 变化                                                                                                                           |
| ----------------------- | ------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| android-emulator        | android-emulator-plugin        | 0.1.0 | 不变                                                                                                                           |
| ios-simulator           | ios-simulator-plugin           | 0.1.0 | 不变                                                                                                                           |
| browser-use             | browser-use-plugin             | 0.5.1 | skills only（同前）；node_modules 新增 `@img/sharp-linux-x64`                                                                  |
| documents               | documents-plugin               | 0.1.7 | **新**，skills/docx + agents/（document-skills 的 docx 半边）                                                                  |
| pdf                     | pdf-plugin                     | 0.1.7 | **新**，skills/pdf + agents/                                                                                                   |
| presentations           | presentations-plugin           | 0.1.7 | **新**，skills/pptx + agents/                                                                                                  |
| spreadsheets            | spreadsheets-plugin            | 0.1.7 | **新**，skills/xlsx + agents/                                                                                                  |
| image-search            | image-search-plugin            | 0.1.1 | **新**，无 skills；HTTP MCP `image_search`（URL/auth/timeout 与原 document-skills 逐字同）                                     |
| node-repl-host          | node-repl-host                 | 0.6.0 | **新**，23MB；"Shared node_repl runtime host，Not user-facing"——Browser Use/Computer Use 的共享执行宿主（含 dist/mcp + sharp） |
| computer-use            | zcode-cua-plugin               | 0.6.1 | **去 MCP 化**：`dist/mcp/server.js` 68k 行删除，plugin.json 只剩 skills；执行改挂 node-repl-host 桥，模型面与 Codex `cua` 同构 |
| plugin-creator          | plugin-creator-plugin          | 0.1.1 | **新**，"develop and validate ZCode plugins through a local dev marketplace"                                                   |
| restore-legacy-sessions | restore-legacy-sessions-plugin | 0.1.0 | 不变                                                                                                                           |
| skill-creator           | skill-creator-plugin           | 0.1.0 | 不变                                                                                                                           |
| zcode-guide             | zcode-guide-plugin             | 0.2.0 | +`commands/workflow.md` +`skills/dynamic-workflows/`（SKILL.md 1042 行 + examples/patterns）                                   |

## skills/commands (signature evolution)

plugins_skills entries: `plugin:<name>@<ver>`, `plugin:<name>:mcp:<srv>`, `skill:<name>`, `command:<name>`, plus 2.x-only `policy:<name>` and `bundled_pkg:<name>@<ver>`.

- **2.2.0–2.13.0: frozen.** Identical 18 entries across all 13 versions (signatures/*.json): 10 `policy:*` + `bundled_pkg:*`×7 + `skill:skill-creator`. No evolution.
- **2.13.0→3.1.0 (+30/−17):** plugin system debuts. All `policy:*` and `bundled_pkg:*` entries removed (gemini engine retired); 6 plugins + 18 skills + 3 commands added (diffs/2.13.0__3.1.0.md).
- **3.1.3→3.2.0 (−15):** `plugin:superpowers@5.1.0` and its 14 skills removed — superpowers was bundled verbatim (manifest author Jesse Vincent, repo github.com/obra/superpowers, v5.1.0, MIT) for exactly 3.1.0–3.1.3, then dropped.
- **3.2.2→3.2.3:** `plugin:zcode-guide@0.1.0` + 6 diagnosing-* skills.
- **3.4.2→3.5.2:** `plugin:browser-use@0.1.1` + skills control-browser, web-gui-tester.
- **3.6.5→3.7.3:** `skill:pptx` (document-skills gains pptx); browser-use 0.1.2→0.2.1.
- **3.7.7→3.8.1:** `skill:xlsx`; browser-use →0.3.0.
- **3.8.1→3.9.1:** `plugin:zcode-cua@0.5.10` + `mcp:computer-use` + `skill:zcode-computer-use`; document-skills 0.1.0→0.1.1 gains `mcp:image_search`; browser-use →0.3.1.
- **3.9.2→3.10.0:** rename `plugin:zcode-cua`→`plugin:computer-use` and `skill:zcode-computer-use`→`skill:computer-use`; document-skills 0.1.1→0.1.4; browser-use →0.4.1.
- **3.10.2→3.11.1:** browser-use →0.4.2, computer-use →0.5.14. **3.11.2→3.12.1:** document-skills →0.1.5.
- **3.12.3→3.14.0 (+14/−6):** document-skills 拆为 documents/pdf/presentations/spreadsheets @0.1.7 + image-search@0.1.1（接管 HTTP MCP）；+node-repl-host@0.6.0、+plugin-creator@0.1.1、`+command:workflow`、`+skill:dynamic-workflows`、`+skill:plugin-creator`；`plugin:computer-use:mcp:computer-use` 随 MCP server 删除消失；zcode-guide →0.2.0、browser-use →0.5.1、computer-use →0.6.1。
- Version cadence: browser-use bumped 6× (0.1.1→0.4.2), computer-use 4× (0.5.10→0.5.14, skips 0.5.11), document-skills 4× (→0.1.5); android-emulator, ios-simulator, restore-legacy-sessions, skill-creator, zcode-guide pinned at 0.1.0 for the entire corpus (per-tag plugin.json survey).

## 2.x analogs → what carried forward

The 2.x extension layer lives under `gemini/` (a gemini-cli fork): `gemini/policies/*.toml` (10 permission tiers: conseca, discovered, memory-manager, non-interactive, plan, read-only, sandbox-default, tracker, write, yolo — signature `policy:*`), `gemini/builtin/skill-creator/` (SKILL.md + init/package/validate .cjs scripts — gemini-branded), and `gemini/bundled/chrome-devtools-mcp.mjs` (11.6MB Google chrome-devtools-mcp bundle; `bundled/third_party/bundled-packages.json` → `bundled_pkg:*`: puppeteer-core 24.38.0, lighthouse 13.0.3, chrome-devtools-frontend 1.0.1592362, @modelcontextprotocol/sdk 1.27.1, core-js 3.48.0, debug 4.4.3, yargs 18.0.0).

At 3.1.0 the entire layer was replaced: policies vanished (permission model reimplemented inside the engine — see `plans` signature category), chrome-devtools-mcp's role was eventually filled by the first-party `browser-use` plugin (3.5.2+, CDP-based, no puppeteer/lighthouse), and `skill-creator` is the sole conceptual carryover — reborn as `skill-creator-plugin` with a rewritten ZCode-branded SKILL.md (2.x text explicitly says "extends Gemini CLI's capabilities"; 3.x drops the init/package/validate helper scripts entirely, SKILL.md only). superpowers (3.1.0–3.1.3) briefly supplied the workflow-skill set the gemini policies used to cover.

## bundled tools timeline

Binaries under `tools/<id>/<binary>` with `.bundle-meta.json` (`provider:"native-search-tool"`; ripgrep `source:"official"`, bfs/ugrep `source:"producer"`; releases `v14.1.1-1`, `v7.5.0-1/-2`, `v4.1.1-2`).

- **2.2.0–3.5.3:** `tools/ripgrep/rg` = ripgrep 13.0.0 (rev af6b6c543b) only. In 2.x it backs the gemini engine's grep tool ("powered by ripgrep", extracted/2.13.0/gemini/chunk-JS5WSGB2.js).
- **3.5.3→3.6.1 boundary: search-backend expansion.** 3.6.1 (win exe substitute) already ships `tools/ugrep/ugrep.exe` 7.5.0 + `tools/ripgrep/rg.exe` 14.1.1 bundle-metas, and zcode.cjs gains the full native-binaries code (9 tokens vs 1 in 3.5.3). `tools/bfs/bfs` 4.1.1 is unix-only — no bfs.exe exists — first visible on linux at 3.6.4 (x64 appimage substitute). Signature-visible boundary is 3.6.2→3.6.4 only because 3.6.1/3.6.2 are win-exe substitutes without linux binaries to execute.
- **3.10.2→3.11.1:** ugrep 7.5.0→7.8.4.
- Gaps in the signature stream (3.2.0 missing rg, 3.2.1/3.2.4/3.3.2 `unavailable:OSError`, 3.4.0 missing) are all provenance substitutes (exe/dmg/arm64-appimage), not real removals — verified against manifest/provenance.json.

**Invocation** (zcode.cjs:3199 `PUn`, :59 `NQ`, :3579): a "native search" provider resolves three tool descriptors — bfs→findCommand, ugrep→grepCommand, ripgrep→rgCommand — each overridable via `ZCODE_BFS_BINARY` / `ZCODE_RG_BINARY` / `ZCODE_UGREP_BINARY` (defaults "bfs"/"rg"/"ugrep" resolved from `bundledResourceDir`). If `ZCODE_EMBEDDED_SEARCH_COMMAND` is set, an "internal-cli" mode runs instead (`command:$VAR args:["__internal-…"]`). For SEA builds, tools download at runtime via `zcode-runtime-tools/manifest.json` + `.zcode-runtime-tool.json` markers (`Qpo={bfs,ripgrep,ugrep}`, `isSea()`-gated, zcode.cjs:3579). `ZCODE_EMBEDDED_SEARCH_COMMAND` already exists at 3.5.3 (the internal-cli path predates the native-binaries one).

## native modules

- **node-pty** (integrated terminal): present in all versions at `app/node_modules/node-pty/` + `app.asar.unpacked/` mirror. 2.x–3.4.2 ship the full cross-platform prebuild set — 12 .node files: `prebuilds/{darwin-x64,darwin-arm64,linux-x64,linux-arm64,win32-x64,win32-arm64}/pty.node`, `win32-*/conpty{,_console_list}.node`, `bin/linux-arm64-145/node-pty.node`, `build/Release/pty.node`. **3.4.2→3.5.2 trims to `prebuilds/linux-x64/pty.node` only** (real boundary — both versions are x64 debs); runtime now resolves per-platform `@lydell/node-pty-linux-{x64,arm64}` 1.2.0-beta.10 optional deps (3.7.3 MANIFEST.json). node-pty 1.1.0 at 3.12.3.
- **sshcrypto.node** (ssh2 1.17.0, crypto accel — SSH/remote features): all versions. **Anomaly: the shipped binary is ARM aarch64 inside otherwise x86-64 trees** — verified by `file` on 3.6.5, 3.7.3, and the real x64 deb at 3.12.3 (BuildID 2834a3cb…). Harmless (ssh2 falls back to JS) but a persistent upstream packaging bug. Hash churned once at 3.6.5→3.7.3 with ssh2 still 1.17.0 — toolchain rebuild, not a version bump.
- **audio-capture.node** (2.x only): 6 platform builds under `acp/node_modules/@anthropic-ai/claude-agent-sdk/vendor/audio-capture/` — audio capture for the ACP/Claude agent (voice feature). **Packaging oscillation**: loose vendor .node at 2.2.0/2.3.1–2.4.1/2.11.0–2.13.0 vs. `claude-agent-sdk-linux-x64` SEA package (`claude` binary, natives baked in) at 2.3.0 and 2.5.0–2.10.0 — real deb trees both sides. Removed entirely at 3.1.0 with the acp tree.
- **sharp** (`@img/sharp-linux-x64`, image processing): 2.x under `acp/node_modules/@img/`; dropped 3.1.0; **revived 3.9.1 inside `glm/packages/zcode-cua-plugin/` with the identical sha `fdbcd90b39941fb7`** — same binary re-vendored for computer-use screenshots. **3.14.0 起同 sha 副本再落两处**：`browser-use-plugin/node_modules/@img/` 与 `node-repl-host/node_modules/@img/`（树内共三份实体）。sharp 0.34.5 at 3.12.3.
- **koffi.node** (FFI — native input/windowing for computer-use): `glm/packages/zcode-cua-plugin/node_modules/koffi/build/koffi/linux_x64/koffi.node`, added 3.9.2→3.10.0; koffi 2.15.6 at 3.12.3.
- **Anomaly:** 3.3.5 ships an empty (0-byte) `app/node_modules/node-pty/prebuilds/linux-arm64/pty.node` (sha e3b0c44… = empty file), fixed at 3.3.6.
- Cross-platform `.node` churn at 3.2.0/3.2.1/3.4.0/3.5.3/3.6.1/3.6.2 boundaries is substitute-provenance noise (win/dmg trees), verified.

## REVIEW (unverifiable / open)

- **Exact expansion boundary for rg14/bfs/ugrep is 3.5.3→3.6.1** by code+bundle-meta evidence; cannot tell whether it landed in an unreleased 3.6.0 or 3.6.1 itself (no 3.6.0 tag in corpus).
- **Why superpowers was dropped at 3.2.0** — license/maintenance/product call is not recoverable from artifacts. Its skills are the only third-party-authored content in the plugin set.
- **audio-capture consumer** — which 2.x feature drove it (voice input? calls?) not confirmed; would need deeper acp code dig.
- **SEA-embedded plugin/tool assets** can't be enumerated from extracted trees (they live inside the binary); only the `node:sea getAsset` code path proves the mechanism.
- **`ZCODE_EMBEDDED_SEARCH_COMMAND` internal-cli mode** existed at 3.5.3 (before native-binaries); what it invoked then is undetermined.
- **defaultEnabled introduction** — not diffed per-version in zcode.cjs; assumed present since the registry appeared (3.1.0).
- **plugin.json ↔ registry drift**: the registry in zcode.cjs duplicates each plugin's version/dir — if a manifest and registry disagree, loader behavior is untested (registry likely wins for seeding).
