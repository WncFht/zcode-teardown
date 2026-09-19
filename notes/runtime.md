# Runtime substrate across versions

追踪 ZCode linux-x64 全版本的运行时底座：Electron 宿主二进制、bundled tools（ripgrep/bfs/ugrep）、native .node 模块、捆绑的独立可执行运行时（claude/codex/zcode-acp/opencode）、app 依赖中与运行时相关的字段。数据源为 `repo/` git tag 中的 `MANIFEST.json`/`HOST.json`、`tools/*/.bundle-meta.json`、`.node` 与可执行 blob 的 ELF/strings 分析，以及留存 installer 中的二进制本体。当前覆盖 56/59 版，其中 15 版为替代格式恢复（win-exe×5:3.2.0/3.4.0/3.4.1/3.6.1/3.6.2；linux-x64 AppImage×7:3.2.5/3.3.1/3.3.3/3.3.4/3.3.5/3.6.4/3.7.3；linux-arm64 AppImage×2:3.2.4/3.3.2；mac dmg×1:3.2.1——见 `manifest/provenance.json` 与各树 `SOURCE.json`），缺 3.7.1/3.7.2/3.7.4（CDN 已撤，恢复循环进行中）。替代树的平台专属文件（宿主二进制、.node、tools/ 二进制）为对应平台构建，JS/asar/配置载荷与 linux-x64 一致。

## 宿主二进制与 Electron 版本

**结论：linux-x64 宿主 Electron 二进制在整个语料（2.2.0–3.14.0，2026-05-14 → 2026-09-19）零变更**。48 个 linux-x64 样本（41 deb + 7 x64-AppImage）的 `MANIFEST.json`/`HOST.json → host.binary` 均为 size=206036184、sha256=`7f7881d04a9119cd865abe9e45d3cce510eab82a40cab823d7b243f7daf0b03b`，即 deb 与 linux-x64 AppImage 打包的是逐字节相同的 ELF。宿主二进制本体不随 extracted/ 树入库（各树仅留 `HOST.json` 指纹），实物证据来自留存 installer：

- `installers/3.10.1.deb` 中 `opt/ZCode/zcode` 实物的 sha256 与 MANIFEST 指纹完全一致，strings 检出 `Electron/41.0.3`、`Chrome/146.0.7680.80`、`24.14.0/node`。
- `installers/3.0.1-mac-arm64.zip` 中 `Electron Framework.framework/Versions/A/Resources/Info.plist` 的 `CFBundleVersion=41.0.3`（`com.github.Electron.framework`），framework 二进制内同样检出 `Electron/41.0.3`、`Chrome/146.0.7680.80`、`BoringSSL` 与 V8 `14.6.650202`。

其它平台的宿主指纹（不可与 x64 ELF 直接 sha 比对）：

- **linux-arm64**（3.2.4、3.3.2 的 arm64 AppImage 替代树）：size=197528864、sha256=`abfeaa0efe8c5ec3…`，两版互相同，`version` 字段标 `unavailable:foreign-arch`（指纹采集时正确识别了异构 ELF）；arm64 实物未留存，Electron 版本串未 strings 验证，但同 sha 表明同构建。
- **win-x64**（3.2.0/3.4.0/3.4.1/3.6.1/3.6.2 的 exe 替代树）：ZCode.exe 均 222866328 B 但各版 sha 互不相同——PE 内嵌版本戳/签名块，sha 差异是格式固有噪声，不能据此判定宿主有变更。
- **mac-arm64**（3.2.1 dmg 替代树）：52944 B Mach-O stub，sha=`1429436d…`，`version` 同样标 foreign-arch。

运行时栈为 **Electron 41.0.3 / Chromium 146.0.7680.80 / Node.js 24.14.0 / V8 14.6.650.x / BoringSSL**（x64 ELF + mac framework 双侧证实）。**linux-x64 binary-sha256 边界计数：0**，arm64 两个样本内部亦为零变更；未观测到任何 Electron 升级，若后续版本出现新 host.binary.sha256 即为首个升级候选点。`host.binary.version` 字段 x64 全为 `unavailable:TimeoutExpired`（headless 下 `zcode --version` 挂起）。

NODE_MODULE_VERSION：`app/node_modules/node-pty/bin/linux-arm64-145/` 目录名（prebuild 命名约定 `{platform}-{arch}-{modules}`）表明 classic ABI 目标为 145，即 Electron 41 → ABI 145。linux-x64 实际加载的 `prebuilds/linux-x64/pty.node` 为 N-API 模块不受 ABI 约束（见下节）。

## Bundled tools (resources/tools/)

每版 `MANIFEST.json → bundled_tools` 存 `{path: version-string}`（win 替代树该字段为空——`.exe` 无法就地 `--version` 探测，改以 tools/ 路径集合与 `.bundle-meta.json` 为证）；`.bundle-meta.json`（toolId/version/release/sha256/archiveSha256/platform/provider=`native-search-tool`）与扩展工具组同界出现：3.4.2/3.5.2/3.5.3 无，3.6.1（win 树）已有。

| 版本区间        | tools/ 内容                       | ripgrep                 | bfs   | ugrep |
| --------------- | --------------------------------- | ----------------------- | ----- | ----- |
| 2.2.0 – 3.5.3   | 仅 `tools/ripgrep/rg`             | 13.0.0 (rev af6b6c543b) | —     | —     |
| 3.6.1 – 3.10.2  | + bfs/ugrep + 3×.bundle-meta.json | 14.1.1 (rev 4649aa9700) | 4.1.1 | 7.5.0 |
| 3.11.1 – 3.14.0 | 同上                              | 14.1.1                  | 4.1.1 | 7.8.4 |

边界与指纹：rg 13.0.0 二进制 sha256=`7cdd80707c28…` 在 25 个版本间逐字节不变；rg14+bfs+ugrep 上线点收窄至 **3.5.3 → 3.6.1**（3.6.0 未构建，已是最窄边界）。证据链：① win-3.6.1 树 `tools/{ripgrep,ugrep}/.bundle-meta.json` 记 rg 14.1.1/`v14.1.1-1`、ugrep 7.5.0/`v7.5.0-1`（platform=win32-x64）；② 3.6.1（win）与 3.6.5（deb）的 `glm/zcode.cjs` 内嵌工具版本表逐字相同——`bfs:{versions:{linux:"v4.1.1-2"}}, ripgrep:{darwin:"v13.0.0-10",linux:"v14.1.1-1"}, ugrep:{linux:"v7.5.0-2"}`，即引擎在 3.6.1 已按 bfs 4.1.1 编录 linux 工具，**bfs 是 linux-only 工具**（win 树缺 bfs.exe 属平台分发差异而非版本差异），且 darwin 的 rg 停留在 v13.0.0-10（mac 构建未随 linux 升级 rg14）；③ 3.5.3 引擎 bundle 列表 `["server-bundle","node-runtime","node-pty","glm","ripgrep"]` 仅含 ripgrep，无 bfs/ugrep。ugrep 7.5.0→7.8.4 位于 **3.10.2 → 3.11.1**（3.11.0 未构建，已是最窄边界）。bundle-meta 中 rg/bfs `source: official`、ugrep `source: producer`，`release` tag 形如 `v14.1.1-1`/`v4.1.1-2`/`v7.8.4-1`（厂商自托管 mirror 的再发行序号，平台各自计数——ugrep win=v7.5.0-1 vs linux=v7.5.0-2）。tools/ 目录除三工具与 .bundle-meta.json 外无其它文件（全语料 `git ls-tree v*:tools/` 核对）。

**第二处 ripgrep**：2.x 的 `acp/node_modules/@anthropic-ai/claude-agent-sdk/vendor/ripgrep/` 内含 SDK 自带的六平台 rg（x64-linux 版实测 `ripgrep 14.1.1` +pcre2，PCRE2 10.43，sha256=`2ac4328af42c…`，与 tools/ 的 rg 不同构建）。该 vendor 树在 2.x 内反复出现/缺席（见 .node 节），3.x 起随 acp/ 目录整体消失。

## Native .node 模块

以 `(app/ | app.asar.unpacked/)node_modules/` 归一化（两处镜像同一文件）。ABI 归属：pty.node、koffi.node、sharp-linux-x64.node 为 **N-API**（`napi_*` 未定义符号，跨 ABI 稳定）；sshcrypto.node 为 **raw V8/NAN** 模块（直接引用 `_ZN2v8*` 符号，绑定 NODE_MODULE_VERSION）。**sshcrypto.node 在全部 linux-x64 树中是 aarch64 ELF（`file` 实测 2.2.0/2.13.0/3.1.0/3.5.3/3.6.5/3.8.1/3.10.0/3.12.3 全为 ARM aarch64）——x64 宿主永远无法加载，ssh2 在该平台只能走纯 JS crypto 回退**（win 树干脆不含此文件，殊途同归）；换言之它是打包链路混入的异构 dead payload。两版 sshcrypto 均为 GCC Debian 12.2.0-14+deb12u1 编译，build-id `92881f85…`→`2834a3cb…`，同链重编——重编的是错误架构的二进制。

| 模块（canonical path）                                                                                                                                                        | 首现   | 末现   | 说明                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node-pty/prebuilds/linux-x64/pty.node`                                                                                                                                       | 2.2.0  | 3.14.0 | N-API，sha256=`ce00b69d6524…` 全程未变，75976 B                                                                                                                                                                                                                              |
| `ssh2/…/sshcrypto.node`                                                                                                                                                       | 2.2.0  | 3.14.0 | NAN/V8，82096 B，**aarch64 dead payload**（x64 不可加载，ssh2 走 JS 回退；3.14.0 实测仍 aarch64、BuildID `2834a3cb…` 未变）；hash `c8f8788d…`（≤3.6.5）→ `f85819ee…`（≥3.7.3），重编点收窄至 **3.6.5 → 3.7.3**（3.7.3 为 linux-x64 AppImage 树；3.7.1/3.7.2 若入库可再收窄） |
| `acp/…/audio-capture/{arm64,x64}-{darwin,linux,win32}.node` ×6 + `acp/@img/sharp-linux-x64`                                                                                   | 2.2.0  | 2.13.0 | claude-agent-sdk vendor 物；仅在 vendor 树存在的 2.x 出现                                                                                                                                                                                                                    |
| node-pty 全平台 prebuilds（darwin-arm64/x64、linux-arm64、win32-arm64/x64 共 9 文件）+ `@lydell/node-pty-darwin-{arm64,x64}` 2 文件 + `bin/linux-arm64-145` + `build/Release` | 2.2.0  | 3.4.2  | linux 包曾携带全部跨平台 prebuilds，**3.5.2 起裁剪仅留 linux-x64**（3.5.0/3.5.1 未构建，已是最窄边界）                                                                                                                                                                       |
| `glm/…/zcode-cua-plugin/@img/sharp-linux-x64/sharp-linux-x64.node`                                                                                                            | 3.9.1  | 3.14.0 | N-API；与 app deps `sharp 0.34.5` 同步出现（3.9.0 未构建，已是最窄边界）；**3.14.0 起同 sha 副本再落 `browser-use-plugin/` 与 `node-repl-host/` 两处（树内共三份）**                                                                                                         |
| `glm/…/zcode-cua-plugin/koffi/build/koffi/linux_x64/koffi.node`                                                                                                               | 3.10.0 | 3.14.0 | N-API FFI 模块，2319632 B；出现点 **3.9.2 → 3.10.0**（已是最窄边界）                                                                                                                                                                                                         |

每版 .node 计数（linux 树口径）：2.x 在 30/37 间振荡（+7 = acp vendor 的 audio-capture×6 + sharp×1；出现于 2.2.0/2.3.1/2.4.x/2.11.0–2.13.0，缺席于 2.3.0/2.5.0–2.10.0——与 acp 打包形态切换同步，见下节），3.1.0–3.4.2 稳定 30，3.5.2 起降为 4（linux-x64 pty + sshcrypto ×2 镜像），3.9.1 起 5（+sharp-cua），3.10.0 起 6（+koffi），**3.14.0 起 8（+sharp 副本×2：browser-use-plugin、node-repl-host）**。win 替代树（3.2.0/3.4.0/3.4.1/3.6.1/3.6.2）的 .node 为 win32 构建且 ssh2 目录不含 `build/Release/sshcrypto.node`（win 包不编该绑定，ssh2 回退纯 JS crypto）；其 node-pty prebuilds 亦有同形裁剪——3.2.0/3.4.0/3.4.1 携带 darwin+win32 全平台，3.6.1/3.6.2 仅余 win32-x64 三件（pty/conpty/conpty_console_list ×2 镜像），与 linux 侧 3.5.2 裁剪同步。mac dmg 树（3.2.1）为 darwin 构建。以上均不计入 linux 计数。

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
| 3.14.0 起     | + `@opentelemetry/exporter-metrics-otlp-proto` 0.214.0、`@opentelemetry/sdk-metrics` 2.6.1（OTel 扩到 metrics 导出）、`yauzl` ^3.3.0 |

deb control `Version` 为 `<ver>-<递增构建号>`（2.2.0-870 → 3.14.0-7681，单调 CI 计数）；`Depends` 全程 `libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0`，`Recommends: libappindicator3-1`，40 版 deb 零变化；`package-type` 全程 `deb`（替代格式无 deb control，不参评）。

## 待办（随 fetch lanes 入库更新）

- 3.7.1/3.7.2/3.7.4 仍在恢复（CDN rolling-pull 循环中）：若入库，sshcrypto 重编点可再由 3.6.5→3.7.3 收窄，3.7.x 边界 diff 与签名同步补齐。
- host.binary.sha256 已验 56/59：linux-x64 48 样本全同（`7f7881d0…`）、linux-arm64 2 样本互同（`abfeaa0e…`）；win PE 与 mac Mach-O 宿主因格式固有差异不做跨版本 sha 比对。
