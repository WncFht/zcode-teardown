# Runtime substrate across versions

追踪 ZCode linux-x64 全版本的运行时底座：Electron 宿主二进制、bundled tools（ripgrep/bfs/ugrep）、native .node 模块、捆绑的独立可执行运行时（claude/codex/zcode-acp/opencode）、app 依赖中与运行时相关的字段。数据源为 `repo/` git tag 中的 `MANIFEST.json`、`tools/*/.bundle-meta.json`、`.node` 与可执行 blob 的 ELF/strings 分析，以及留存 installer 中的二进制本体。当前覆盖 41/58 版（缺口见末节）。

## 宿主二进制与 Electron 版本

**结论：整个语料（2.2.0–3.12.3，2026-05-14 → 2026-09-16）宿主 Electron 二进制零变更**。所有已入库版本的 `MANIFEST.json → host.binary` 均为 size=206036184、sha256=`7f7881d04a9119cd865abe9e45d3cce510eab82a40cab823d7b243f7daf0b03b`，即每个 .deb 打包的是逐字节相同的 ELF。`host.binary.version` 字段全为 `unavailable:TimeoutExpired`（headless 下 `zcode --version` 挂起），但二进制本体可以确证版本：

- `installers/3.10.1.deb` 中 `opt/ZCode/zcode` 实物的 sha256 与 MANIFEST 指纹完全一致，strings 检出 `Electron/41.0.3`、`Chrome/146.0.7680.80`、`24.14.0/node`。
- `installers/3.0.1-mac-arm64.zip` 中 `Electron Framework.framework/Versions/A/Resources/Info.plist` 的 `CFBundleVersion=41.0.3`（`com.github.Electron.framework`），framework 二进制内同样检出 `Electron/41.0.3`、`Chrome/146.0.7680.80`、`BoringSSL` 与 V8 `14.6.650202`。

运行时栈为 **Electron 41.0.3 / Chromium 146.0.7680.80 / Node.js 24.14.0 / V8 14.6.650.x / BoringSSL**，linux 与 mac 产物同版本同构建。**binary-sha256 边界计数：0**，语料内未观测到 Electron 升级；若后续版本出现新 host.binary.sha256 即为首个升级候选点。

NODE_MODULE_VERSION：`app/node_modules/node-pty/bin/linux-arm64-145/` 目录名（prebuild 命名约定 `{platform}-{arch}-{modules}`）表明 classic ABI 目标为 145，即 Electron 41 → ABI 145。linux-x64 实际加载的 `prebuilds/linux-x64/pty.node` 为 N-API 模块不受 ABI 约束（见下节）。

## Bundled tools (resources/tools/)

每版 `MANIFEST.json → bundled_tools` 存 `{path: version-string}`；3.6.5 起每个工具附带 `.bundle-meta.json`（toolId/version/release/sha256/archiveSha256/platform/provider=`native-search-tool`）。

| 版本区间        | tools/ 内容                       | ripgrep                 | bfs   | ugrep |
| --------------- | --------------------------------- | ----------------------- | ----- | ----- |
| 2.2.0 – 3.5.3   | 仅 `tools/ripgrep/rg`             | 13.0.0 (rev af6b6c543b) | —     | —     |
| 3.6.5 – 3.10.2  | + bfs/ugrep + 3×.bundle-meta.json | 14.1.1 (rev 4649aa9700) | 4.1.1 | 7.5.0 |
| 3.11.1 – 3.12.3 | 同上                              | 14.1.1                  | 4.1.1 | 7.8.4 |

边界与指纹：rg 13.0.0 二进制 sha256=`7cdd80707c28…` 在 25 个版本间逐字节不变；rg14+bfs+ugrep 上线点位于 **3.5.3 → 3.6.5 之间**（隐藏构建 3.6.1/3.6.2/3.6.4 待入库收窄）；ugrep 7.5.0→7.8.4 位于 **3.10.2 → 3.11.1**（3.11.0 未构建，已是最窄边界）。bundle-meta 中 rg/bfs `source: official`、ugrep `source: producer`，`release` tag 形如 `v14.1.1-1`/`v4.1.1-2`/`v7.8.4-1`（厂商自托管 mirror 的再发行序号）。tools/ 目录除三工具与 .bundle-meta.json 外无其它文件（全语料 `git ls-tree v*:tools/` 核对）。

**第二处 ripgrep**：2.x 的 `acp/node_modules/@anthropic-ai/claude-agent-sdk/vendor/ripgrep/` 内含 SDK 自带的六平台 rg（x64-linux 版实测 `ripgrep 14.1.1` +pcre2，PCRE2 10.43，sha256=`2ac4328af42c…`，与 tools/ 的 rg 不同构建）。该 vendor 树在 2.x 内反复出现/缺席（见 .node 节），3.x 起随 acp/ 目录整体消失。

## Native .node 模块

以 `(app/ | app.asar.unpacked/)node_modules/` 归一化（两处镜像同一文件）。ABI 归属：pty.node、koffi.node、sharp-linux-x64.node 为 **N-API**（`napi_*` 未定义符号，跨 ABI 稳定）；sshcrypto.node 为 **raw V8/NAN** 模块（直接引用 `_ZN2v8*` 符号，绑定 NODE_MODULE_VERSION，宿主冻结故始终兼容）。两版 sshcrypto 均为 GCC Debian 12.2.0-14+deb12u1 编译，build-id `92881f85…`→`2834a3cb…`，同链重编。

| 模块（canonical path）                                                                                                                                                        | 首现   | 末现   | 说明                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `node-pty/prebuilds/linux-x64/pty.node`                                                                                                                                       | 2.2.0  | 3.12.3 | N-API，sha256=`ce00b69d6524…` 全程未变，75976 B                                                                         |
| `ssh2/…/sshcrypto.node`                                                                                                                                                       | 2.2.0  | 3.12.3 | NAN/V8，82096 B；hash `c8f8788d…`（≤3.6.5）→ `f85819ee…`（≥3.7.5），重编点 **3.6.5 → 3.7.5 之间**（3.7.1–3.7.4 待收窄） |
| `acp/…/audio-capture/{arm64,x64}-{darwin,linux,win32}.node` ×6 + `acp/@img/sharp-linux-x64`                                                                                   | 2.2.0  | 2.13.0 | claude-agent-sdk vendor 物；仅在 vendor 树存在的 2.x 出现                                                               |
| node-pty 全平台 prebuilds（darwin-arm64/x64、linux-arm64、win32-arm64/x64 共 9 文件）+ `@lydell/node-pty-darwin-{arm64,x64}` 2 文件 + `bin/linux-arm64-145` + `build/Release` | 2.2.0  | 3.4.2  | linux 包曾携带全部跨平台 prebuilds，**3.5.2 起裁剪仅留 linux-x64**（3.5.0/3.5.1 未构建，已是最窄边界）                  |
| `glm/…/zcode-cua-plugin/@img/sharp-linux-x64/sharp-linux-x64.node`                                                                                                            | 3.9.1  | 3.12.3 | N-API；与 app deps `sharp 0.34.5` 同步出现（3.9.0 未构建，已是最窄边界）                                                |
| `glm/…/zcode-cua-plugin/koffi/build/koffi/linux_x64/koffi.node`                                                                                                               | 3.10.0 | 3.12.3 | N-API FFI 模块，2319632 B；出现点 **3.9.2 → 3.10.0**（已是最窄边界）                                                    |

每版 .node 计数：2.x 在 30/37 间振荡（+7 = acp vendor 的 audio-capture×6 + sharp×1；出现于 2.2.0/2.3.1/2.4.x/2.11.0–2.13.0，缺席于 2.3.0/2.5.0–2.10.0——与 acp 打包形态切换同步，见下节），3.1.0–3.4.2 稳定 30，3.5.2 起降为 4（linux-x64 pty + sshcrypto ×2 镜像），3.9.1 起 5（+sharp-cua），3.10.0 起 6（+koffi）。

## 捆绑的独立可执行运行时（2.x 特有）

2.x 时代 resources/ 内除 Electron 宿主外还捆绑多个 >130MB 的独立 agent 可执行文件，3.1.0 起全部消失（引擎改为 glm/zcode.cjs 等 JS bundle，跑在 Electron 内嵌 Node 上）。逐一鉴定：

| 路径                                                                           | 大小区间   | 运行时                                                                                          | 版本区间              |
| ------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------- | --------------------- |
| `glm/zcode-acp`                                                                | 160–169 MB | Node.js v24.14.0 单文件可执行（`node:embedded_snapshot_main`，与 Electron 内嵌 Node 同版本）    | 2.2.0 – 2.13.0        |
| `opencode/opencode`                                                            | 137–153 MB | **Bun v1.3.14** 编译单文件（`bun-linux-x64-baseline`，内嵌 sqlite/文件）                        | 2.2.0 – 2.13.0        |
| `acp/node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/claude`             | 222–238 MB | **Bun** 编译单文件（bun-profile/`__BUN`/`BUN_1.2` 标记；`v24.3.0` 为 Bun 的 Node 兼容层版本串） | 2.3.0、2.5.0 – 2.10.0 |
| `codex/…/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/codex/codex` | 216 MB     | Rust（musl 静态，OpenAI codex）                                                                 | 2.3.0 – 2.5.0         |
| `codex/…/@zed-industries/codex-acp-linux-x64/bin/codex-acp`                    | 203 MB     | Rust（`codex_core::`/`codex_api::` 符号，`rustc/59807616…` build marker，Zed ACP 适配分支）     | 2.2.0、2.6.0 – 2.13.0 |

打包形态振荡：claude（Bun 单文件）与 acp vendor 树（audio-capture×6 + vendor/ripgrep）在 2.x 内互斥——vendor 树出现时 claude 单文件缺席（2.3.1/2.4.x/2.11.0–2.13.0），反之亦然（2.3.0/2.5.0–2.10.0），说明 claude-agent-sdk 的 linux 分发在"npm vendor 树"与"编译单文件"两种形态间切换过。codex 亦在 `@openai/codex`（musl）与 `@zed-industries/codex-acp`（ACP 适配）两套包之间切换：2.3.0–2.5.0 为 @openai，2.6.0 起换回 @zed（2.2.0 已是 @zed）。

## app deps 中运行时相关字段

`app/package.json` 的 `engines`/`devDependencies` 全程为 null，无 electron 版本声明；`dependencies` 中运行时相关项：

| 版本区间      | 变化                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 2.2.0 – 3.4.2 | electron-updater ^6.8.3、node-pty ^1.0.0、ssh2 ^1.16.0、@lydell/node-pty-linux-{x64,arm64} 1.2.0-beta.10、undici ^6.23.0、ws ^8.20.0 |
| 3.5.2 起      | + playwright-core 1.59.1（与 .node 裁剪同点，CUA/browser 自动化落地）                                                                |
| 3.9.1 起      | + sharp 0.34.5                                                                                                                       |

deb control `Version` 为 `<ver>-<递增构建号>`（2.2.0-870 → 3.12.3-7463，单调 CI 计数）；`Depends` 全程 `libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0`，`Recommends: libappindicator3-1`，41 版零变化；`package-type` 全程 `deb`。

## 待办（随 fetch lanes 入库更新）

- 收窄边界：3.6.1/3.6.2/3.6.4（rg14+bfs+ugrep 上线点）、3.7.1–3.7.4（sshcrypto 重编点）。
- 补齐确认：3.2.0/3.2.1/3.2.4/3.2.5/3.3.1/3.3.2/3.3.4/3.3.5/3.4.0/3.4.1（2.x→3.x 过渡期细节）。
- 逐版确认 host.binary.sha256 无新值（已验 41/58 全同）。
