# 断代分析：2.13.0 → 3.0.x(mac) → 3.1.0

C7 专题：用 mac-arm64.zip 补 3.0.0/3.0.1 缺失的 linux 断点，回答 2.x→3.x 之间到底换了什么、留了什么。

## TL;DR

断代不是"Electron 应用重写"，而是 **resources/ 下的 agent 运行时换血**：2.13.0 同时捆绑五套运行时的过渡形态（gemini fork + zcode-acp 原生二进制 + codex-acp + opencode 二进制 + claude-agent-acp，约 900MB 引擎载荷）在 3.0.0 被一次性砍掉，换成单个 `glm/zcode.cjs`（9.4MB JS bundle，electron-node 运行时）+ `glm/packages/*-plugin` 插件包 + `model-providers/` 目录化 provider 目录。Electron 宿主二进制、asar 宿主应用、`@zcode/*` workspace 依赖树、app-update.yml、tools/ripgrep 全部延续——`zcode` 主二进制在 2.13.0 与 3.1.0 之间 sha256 完全一致，证明外壳没动。3.0.x mac 的资源布局与 3.1.0 linux 逐项目一致，确认 3.0.x 已是新架构完成态，不是中间混合体。

## 时间线

| 版本   | releaseDate | 形态                   | 证据                                                                           |
| ------ | ----------- | ---------------------- | ------------------------------------------------------------------------------ |
| 2.13.0 | 2026-05-29  | linux 全系，最后 2.x   | manifest/versions.json；CDN latest-linux.yml                                   |
| 3.0.0  | 2026-06-13  | mac/win 首发，无 linux | releases/3.0.0/latest.yml（releaseDate 11:26:56Z）；mac zip last-modified 6/13 |
| 3.0.1  | 2026-06-14  | 同上                   | releases/3.0.1/latest.yml（releaseDate 12:58:35Z）                             |
| 3.1.0  | 2026-06-15  | linux 回归             | releases/3.1.0/latest-linux.yml（releaseDate 16:11:54Z）                       |

2.13.0 到 3.0.0 仅隔 15 天；3.0.0→3.1.0 只有 2 天。"断代"是一次集中发布，不是渐进演化。3.0.1 releaseNotes 明确承认代际切换："新增 ZCode V2 历史会话恢复能力，旧版本会话可以更顺畅地找回和继续使用"（releases/3.0.1/latest.yml）。

## resources/ 布局对比

| 成员                                  | 2.13.0 linux  | 3.0.0/3.0.1 mac       | 3.1.0 linux            |
| ------------------------------------- | ------------- | --------------------- | ---------------------- |
| `gemini/`（gemini-cli fork）          | ✓ 90MB        | ✗                     | ✗                      |
| `glm/zcode-acp`（168MB ELF）          | ✓             | ✗                     | ✗                      |
| `glm/zcode.cjs` + `glm/packages/`     | ✗             | ✓ 9.4MB + 4-5 plugins | ✓ 9.4MB + 6 plugins    |
| `codex/`（@zed-industries/codex-acp） | ✓ 204MB       | ✗                     | ✗                      |
| `opencode/opencode`（144MB ELF）      | ✓             | ✗                     | ✗                      |
| `acp/`（claude-agent-acp）            | ✓ 93MB        | ✗                     | ✗                      |
| `acp-proxy-runtime/`                  | ✓ 348K        | ✗                     | ✗                      |
| `model-providers/*.json`              | ✗             | ✓                     | ✓（sha 与 3.0.0 相同） |
| `tools/ripgrep/rg`                    | ✓             | ✓                     | ✓                      |
| `app.asar`                            | 186.9MB       | 187.9MB / 187.9MB     | 185.9MB                |
| `app.asar.unpacked`                   | node-pty+ssh2 | node-pty only         | node-pty+ssh2          |

证据：`extracted/2.13.0/`、`extracted-mac/3.0.0/`、`extracted-mac/3.0.1/`、`extracted/3.1.0/` 顶层目录清单；大小为 `du -sh` 实测；MANIFEST.json 计数见各目录。

### 2.13.0 的五运行时堆（过渡态全貌）

2.13.0 是"全都要"的过渡版本，resources/ 下并排放了五代引擎方案：

- `gemini/`：gemini-cli fork 的 JS chunk 群——`gemini.js`（520K 入口）、3 份 `interactiveCli-*.js`（各 1.6MB）、3 份 `oauth2-provider-*.js`、`sandbox-macos-{permissive,restrictive,strict}-{open,proxied}.sb` 沙箱 profile、`policies/*.toml`（sandbox-default/yolo/plan/read-only/non-interactive/tracker/conseca/write/memory-manager/discovered 十种权限模式）、`builtin/skill-creator/`、`bundled/chrome-devtools-mcp.mjs`、`docs/`（4.5MB 文档）。见 `extracted/2.13.0/gemini/`。
- `glm/zcode-acp`：167,972,032 字节 x86-64 ELF，`extracted/2.13.0/glm/.bundle-meta.json` 记 `"provider":"glm","version":"0.13.0","source":"http://10.253.204.88:12345/zcode/deps/zcode-cli-0.13.0/zcode-linux-x64"`——即 zcode-cli 0.13.0 的编译产物，从内网 deps 服务器拉取。strings 内含大量嵌入 JS（含 React DevTools profiler 代码，指向 ink 类 TUI）与 GLM-4.5 系列 modelId。
- `codex/`：`zcode-codex-bundle 1.0.0`，依赖 `@zed-industries/codex-acp ^0.12.0`（extracted/2.13.0/codex/package.json），204MB node_modules。
- `opencode/opencode`：143,980,672 字节 x86-64 ELF（file 输出：dynamically linked, not stripped）。
- `acp/`：`@agentclientprotocol/claude-agent-acp 0.29.2`，deps `@agentclientprotocol/sdk 0.19.0` + `@anthropic-ai/claude-agent-sdk 0.2.112`（extracted/2.13.0/acp/package.json），93MB。
- `acp-proxy-runtime/dist/`：HTTP/WS 转发代理，文件名自证协议翻译职能——`geminiOpenaiChatCompat.js`、`httpForwardingCodexAnthropicCompat.js`、`httpForwardingCodexGeminiCompat.js`、`httpForwardingCodexModelOverride.js`、`proxyServer.js`、`wsUpgradeHandler.js`、`certificate.js`、`capture.js`。这是 2.x 多引擎并存的关键设施：用代理在 gemini/codex/anthropic 三种 wire format 间互转。

宿主侧证据：`extracted/2.13.0/app/out/main/index.js` 里 codex×42、gemini×32、opencode×27 引用，`chunk-DZG5AG7F.js` 里 acp-proxy×20、codex×19、opencode×15、gemini×18、zcode-acp×1——main 进程在运行时层做多引擎分发。

### 3.0.x/3.1.0 的单 bundle 形态

- `glm/zcode.cjs`：9,398,739（3.0.0 mac）→ 9,422,458（3.0.1 mac）→ 9,427,602（3.1.0 linux）字节。shebang `#!/usr/bin/env node`，esbuild 风格 bundle。`glm/.node-bundle-meta.json`：`{"runtime":"electron-node","entry":"zcode.cjs","source":"apps/zcode-cli/packages/cli/dist/zcode.cjs"}`（extracted-mac/3.0.0 与 extracted/3.1.0 同文）。
- 与 2.13.0 `.bundle-meta.json` 对照：同一 `zcode-cli` 项目，2.x 发 168MB 编译二进制，3.x 发改由 Electron 内嵌 node 跑的 9.4MB JS bundle。**引擎血统连续，载体换了**。
- bundle 内 provider 覆盖反而更全：zcode.cjs 内 GLM-×948、deepseek×1504、anthropic×735、gemini×959、opencode×18 字符串命中（grep -o 计数，extracted-mac/3.0.0/glm/zcode.cjs）；GLM modelId 与 zcode-acp 二进制内的集合同族（GLM-4.5-Air-Derestricted-Iceblink 系、GLM-4.6/4.7 等）。
- `zcode-acp` 与 `acp/`/`codex/`/`opencode/`/`acp-proxy-runtime/` 全部消失：3.0.x mac 全树 `find -iname "*acp*"` 零命中；zcode.cjs 内 `agentclientprotocol`/`claude-agent` 零命中。
- 宿主侧：`extracted-mac/3.0.0/app/out/main/chunk-EA6ULDLN.js` 仅 zcode.cjs×4，无任何旧引擎引用；`extracted/3.1.0/app/out/main/index.js` 里 codex×5、gemini×9、opencode×4 均为会话导入/迁移语义（对应 3.0.1+ "从其他工具导入历史会话"功能），`chunk-WYF2AB3G.js` zcode.cjs×4。

## 3.0.x mac 揭示的中间态

3.0.x mac 与 3.1.0 linux 布局逐项相同（glm/zcode.cjs + glm/packages + model-providers + tools/ripgrep + app.asar(.unpacked)），连 model-providers 目录文件都 sha 一致（`models_catalog_china_llm_zcode_2026-06-03.json` = 3d75d97c…，3.0.0 mac 与 3.1.0 linux 相同；3.7.5 已换成 30282097…）。**3.0.x 就是新架构完成态，linux 缺席两周只是发布节奏**；3.1.0 相对 3.0.x 的增量是 `restore-legacy-sessions-plugin` 与 WSL 远程等外围功能。

`glm/packages/` 插件演化（各 `*/package.json` 的 name+version）：

| 版本         | 插件集                                                                                  |
| ------------ | --------------------------------------------------------------------------------------- |
| 3.0.0 mac    | android-emulator 0.1.0、document-skills 0.1.0、ios-simulator 0.1.0、skill-creator 0.1.0 |
| 3.0.1 mac    | + superpowers-plugin 5.1.0（唯一非 0.1.0 版本，外来引入）                               |
| 3.1.0 linux  | + restore-legacy-sessions-plugin 0.1.0（对应 releaseNotes "ZCode V2 历史会话恢复"）     |
| 3.12.3 linux | 8 个：+browser-use、zcode-cua、zcode-guide；glm/ 总 46MB                                |

插件格式为 `.zcode-plugin` 目录（package.json + .mcp.json + commands/hooks/skills/templates），与 2.x `gemini/builtin/skill-creator/`（SKILL.md + init/package/validate .cjs）是同一能力的两代封装。

`model-providers/` 是 3.x 新增的 resources 级工件：`schemaVersion: "zcode.model-providers.v1"`，每 provider 声明 `endpoints.baseURL` + `paths.{anthropic,openai-compatible}` 双 kind + 每模型 modalities/contextWindow/reasoning 档位的声明式目录；zcode.cjs 内 `model-providers` 引用×2 证明由引擎读取。2.13.0 resources 级无此目录（provider 信息编进 zcode-acp 二进制/gemini chunks）。`config/`（3.7.5 起）与 `acp/`+`acp-proxy-runtime/`（3.12.3 有、3.7.5 无）是更晚的再引入，不在断代点。

## 连续性清单（什么没换）

- **宿主二进制**：`extracted/2.13.0/HOST.json` 与 `extracted/3.1.0/HOST.json` 的 binary.sha256 均为 `7f7881d04a9119cd865abe9e45d3cce510eab82a40cab823d7b243f7daf0b03b`、size 206,036,184——Electron 外壳逐字节相同，断代只动了 resources/。
- **app-update.yml**：两版逐字节同构，仅 update url 平台段不同（`update/linux/x64/` vs `update/mac/arm64/`）；provider generic、updaterCacheDirName '@zcodedesktop-updater' 一致。
- **宿主应用依赖**：`app/package.json` deps 22→25 项，@zcode/{client,rpc,server,services,shared,ui} workspace 全套保留；electron-updater ^6.8.3、node-pty ^1.0.0、@lydell/node-pty-* 1.2.0-beta.10、react/react-dom ^19.2.4、ssh2、undici、ws、yaml、yazl、semver、module-details-from-path、@fiahfy/icns、@larksuiteoapi/node-sdk 不变。增量：@arms/rum-electron（阿里 RUM，替下 @sentry/electron）、@babel/runtime、@zcode/e2e-report、node-forge。
- **main bundle 指纹**：3.0.0 mac 与 3.1.0 linux 的 out/main chunk 文件名大面积相同（chunk-D6GXJZZB/ORLA5R6F/R7L3MURM/7U5HQJ2V/BYDNK7AA/RHVRFAWL/EC2RJZ5P）——同一代码库跨平台构建。
- **tools/ripgrep/rg**：三版都在；`tools/{bfs,ugrep}` 直到 3.12.3 才出现（SKILL.md"两代都带 rg/bfs/ugrep"对 3.0.x–3.7.5 不成立）。
- **权限模式**：gemini/policies/*.toml 消失，但 `yolo`×23、`plan`×30 字符串在 zcode.cjs 内——模式概念内化进引擎。
- **skill-creator**：gemini/builtin/skill-creator → @zcode/skill-creator-plugin 0.1.0。
- **IPC/RPC**：两代 app deps 都含 @zcode/rpc；out/main 里裸 `ipcMain` 出现次数 2.13.0=1、3.0.0=0——宿主↔渲染走自定义 RPC 层，频道级清单归 C9 lane。
- **zcode:// scheme**：3.0.0 mac Info.plist CFBundleURLTypes 已注册。
- **vendor 域名**：deb control Vendor 从 `dev@zcode-ai.com` 换成 `dev@zcode.z.ai`（HOST.json control 节），CDN 域名迁移同向。

## 包体积

| 指标               | 2.13.0                       | 3.0.0 mac                  | 3.1.0                                                                    |
| ------------------ | ---------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| installer          | 278.6MB（deb x64）           | 140.5MB（zip arm64）       | 113.5MB（deb x64；arm64 deb 107.7MB/AppImage 153.4MB，latest-linux.yml） |
| 提取树             | 1,080,871,931B / 26,403 文件 | 392,173,666B / 21,821 文件 | 392,250,845B / 21,915 文件                                               |
| deb Installed-Size | 1,133,888KB                  | —                          | 462,470KB                                                                |
| app.asar           | 186.9MB                      | 187.9MB                    | 185.9MB                                                                  |

app.asar 三版几乎等大——腰斩全部来自 resources/ 下引擎载荷消失（五运行时 ~700MB→zcode.cjs 9.4MB）。

## REVIEW

- `ElectronAsarIntegrity`（mac Info.plist）= af4f328e…，与 app.asar 文件裸 sha256=2af6596a… 不符；推测 Electron 的完整性哈希按 asar 头/分块算而非整文件，未验证。若成立属正常，不是重打包证据。
- 2.13.0 默认引擎未证实：五运行时都在盘，out/main 全部有引用；运行时选择逻辑（gemini 兜底还是 zcode-acp 主力）需 C8 读 `chunk-DZG5AG7F.js`/`index.js` 的引擎分发分支确认。
- SKILL.md"3.0.0 起 OpenCode 派生自研引擎"只被间接证据支持：zcode.cjs 内 opencode 串×18（多为导入/迁移语境）、.node-bundle-meta 源路径 `apps/zcode-cli`。opencode 代码级血缘需 C8 拆 bundle 后比对，本报告不背书"派生"措辞。
- `acp/`+`acp-proxy-runtime/` 回归点未定位：3.0.x–3.7.5 无、3.12.3 有；中间版本由 A 系 lane 全量提取后可二分。
- mac unpacked 无 ssh2/sshcrypto（linux 两版都有）：平台差异还是 3.x mac 把 sshcrypto 收进 asar 未查；不影响主结论。
- `extracted/3.12.3/app-update.yml` url=http://localhost:8081——疑似 QA 构建混入 CDN 语料，转 A5 audit lane。
- tree_manifest.py 的引擎标记漏 `glm/zcode-acp` 二进制形态：2.13.0 MANIFEST engine="gemini+acp+acp-proxy" 未记 glm，建议 A5 补 zcode-acp 判定。
