# 复现指南 —— 如何重做每个目标的审计

本文档记录扫描流水线的完整复现方法：通用步骤（获取 → 解包 → 7 族扫描 → 双镜 verify → 深潜 lane）、证据引用约定，以及每个目标的具体获取/解包命令。

- 审计日期：2026-09-22 ~ 2026-09-24；厂商可能已发新版，复现前先核对版本号
- 语料仓：`~/src/agent-teardown/`（非 git）；本仓 `tools/sweep/agent-teardown-sweep.js` 是原始 Workflow 脚本存档
- 安全约束：纯静态分析，**绝不运行目标二进制**、不绕登录/鉴权；安装包 ≤1GB（个别可覆写）、解出 ≤2GB；不往 `/tmp` 写（tmpfs 易满）

## 一、通用流水线

### 1. 获取（acquire）

按目标形态选渠道，优先级：**官方 CDN/官网 > 公共包仓库 > 应用内更新 API**。所有渠道均无鉴权：

| 形态           | 渠道模式                                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| VS Code 扩展   | `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/{publisher}/vsextensions/{name}/{version}/vspackage`（无 auth，直接下载） |
| JetBrains 插件 | `plugins.jetbrains.com/api/plugins/{id}/updates` 拿 updateId → `downloads.marketplace.jetbrains.com/files/{pluginId}/{updateId}/{file}.zip`     |
| npm CLI        | `npm view {pkg} dist.tarball` → 下载 tgz；注意 stub 壳包要再拿 `optionalDependencies` 里的平台二进制包                                          |
| Electron IDE   | 官网/下载页 → 直链 `.deb`/`.tar.gz`；下载页是 JS 渲染的就去抓 webpack chunk 里的 URL 字面量                                                     |
| 其他           | GitHub Release、snapcraft（`snap download`）、厂商 APT 源（先拉 `Packages` 索引再取 pool 路径）、应用内更新 manifest API                        |

陷阱：

- marketplace vspackage 偶尔返回 **gzip 包裹的 zip**（aixcoder、gitlab-duo、lingma 都中过），`file` 一下，`7z x` 一般能自动穿透
- npm 包名可能是 stub（amp、droid、copilot-cli、claude-code、tabnine）：stub 只有 loader，真身在其 `optionalDependencies` 的 `-linux-x64` 平台包里
- 无 Linux 构建的桌面端（astudio、minimax-desktop、inscode）用 **Windows NSIS 安装包做替代**——JS 载荷与平台无关，`7z x` 直接解 NSIS

### 2. 解包（extract）

```bash
# .deb / .rpm
ar x pkg.deb && tar xf data.tar.xz        # data.tar.{gz,xz,zst} 都有可能
# .tar.gz / .tgz / .zip / .vsix / .snap / NSIS
7z x pkg                                   # 7z 通吃，snap 是 squashfs 也能解
# asar（Electron 打包）
npx asar extract resources/app.asar app/   # 很多新应用不打 asar，resources/app/ 是裸目录
# Bun 单文件 ELF（claude-code、droid、amp、codearts-cli、mimo）
objcopy --dump-section .bun=bundle.js binary   # 编译后的 JS 模块图在 .bun section 里
# AppImage
./x --appimage-extract                     # 需在目标 extract dir 内运行
```

解包完成后记录 `extract_dir`，后续所有扫描以此为根。

### 3. 扫描（7 个指标族）

对 `extract_dir` 跑 `rg -F -n -i`，命中即记录 `file:line + snippet + assessment`。原始字面量清单（来自 `tools/sweep/agent-teardown-sweep.js`）：

| 族      | 关注点                        | 关键字面量（节选）                                                                                                                                                                                              |
| ------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pack    | 上传前的打包/序列化           | `createGzip` `gzip` `tar-stream` `archiver` `jszip` `snapshot` `workspaceSnapshot` `createTar` `.tar.gz` `pack(`                                                                                                |
| crypto  | 载荷混合加密/密钥包装         | `aes-256-ctr` `aes-256-gcm` `rsa-oaep` `publicEncrypt` `keyWrap` `SPKI` `-----BEGIN PUBLIC KEY-----` `crypto.subtle` `sessionKey`                                                                               |
| cloud   | 对象存储直传 + STS 凭证       | `aliyuncs` `PostObject` `x-oss` `cos.ap-` `myqcloud` `PutObject` `amazonaws` `storage.googleapis` `myhuaweicloud` `bcebos` `presigned` `upload-credential` `SecurityToken` `STS` `callback` `FormData` `policy` |
| egress  | 外发端点、遥测与上传 API      | `/api/` `upload` `ingest` `telemetry` `statsig` `sentry` `amplitude` `segment` `posthog` `datadog` `beacon` `collect` `batch` `/log`                                                                            |
| index   | 工作区遍历/索引机             | `indexing` `codebase` `workspace` `repoWiki` `embedding` `readdir` `ripgrep` `glob` `gitignore` `.git` `tree-sitter` `fileHash` `manifest` `fileList`                                                           |
| consent | consent 门控、设置键、UI 文案 | `telemetry` `privacy` `optOut` `consent` `anonymous` `indexingEnabled` `improve` `experience` `dataCollection` `toggle`                                                                                         |
| urls    | 全部 URL 字面量普查           | `rg -o -N 'https?://[A-Za-z0-9._~:/?#@!$&()*+,;=%-]+'`，只标记形似 upload/ingest/snapshot/index/collect/telemetry/credential/sts 的端点                                                                         |

复现命令示例（对单个目标手动跑一族）：

```bash
cd ~/src/agent-teardown/extracted/<target>
rg -F -n -i -e createGzip -e gzip -e tar-stream -e archiver -e jszip \
   -e snapshot -e workspaceSnapshot -e createTar -e '.tar.gz' . > pack.hits.txt
```

注意：二进制（`.node`、ELF、`.class`）用 `rg -a` 或 `strings | rg`；vendored `node_modules` 里的命中要区分"第三方 SDK 自带"与"应用自接"。

### 4. 双镜对抗 verify

对每个 `suspicious` 命中跑两个方向的核查：

- **evidence 镜**：证明"用户内容确实离机"——追到 socket/HTTP 调用点，确认载荷含文件字节/会话内容
- **refute 镜**：尽力证伪——死代码？vendored SDK 未接线？已披露的用户主动特性（日志上传、反馈表单）？

两镜都 refuted 才判 clean。`upload_pipeline=true` 只表示存在外发通道（元数据遥测算），**不等于**隐藏上传。

### 5. 深潜 lane（对未 refuted 目标）

| lane     | 任务                                                                                       |
| -------- | ------------------------------------------------------------------------------------------ |
| pipeline | 端到端链：触发 → 打包 → 加密 → 凭证签发 → 上传 → 注册回调，每一跳给 file:line              |
| consent  | consent 真实性：每个相关 UI 文案/设置键；开关是否真的门控上传路径？默认值？文案是否如实？  |
| scope    | 载荷范围：文件过滤、大小上限、是否含 `.git`/密钥/配置/对话内容，引用过滤清单原文           |
| exfil    | 外发机制：哪个端点发凭证、带什么 auth、谁回调注册、谁能解密（对称 vs 公钥包装）            |
| altpaths | 外发普查：枚举**所有**把用户/工作区数据发向厂商的通道——遥测、日志包、崩溃报告、sync RPC 等 |

## 二、证据引用约定

引用链分三层，从粗到细：

1. **判定页**：`notes/sweep/<target>.md` —— 结论、机制描述、`证据锚点` 一节列 file:line
2. **原始 agent 结果**：`~/src/agent-teardown/evidence/<tid>/journal-digest.json` —— 结构如下：
    - `acq._[]`：获取记录（`status/version/installer_path/extract_dir/method`；数组末位是最终态）
    - `scan.<family>[]`：7 族命中（`file/line/indicator/snippet/assessment/suspicious`）
    - `vfy.{refute,evidence}`：双镜结论（`refuted/reason/per_hit[]`）
    - `deep.{pipeline,consent,scope,exfil,altpaths}`：lane 结果（`finding/evidence[]/upload_pipeline/confidence`）
3. **代码锚点**：file:line 一律相对 `~/src/agent-teardown/extracted/<tid>/`；二进制符号用 `strings`/`rg -a` 复核

少数目标另有终判报告：`~/src/agent-teardown/reports/<tid>-verdict.md`（kimi-desktop、minimax-desktop、mimo）。

跨目标汇总产物在 `~/src/agent-teardown/evidence/_global/`；workflow 原始 journal 为 `wf_8ed8c294-94a/journal.jsonl`（digest 由它按目标拆出）。

## 三、按目标复现速查

每条：`获取` → `解包`。`installers/`、`extracted/` 前缀均指 `~/src/agent-teardown/`。

### VS Code / JetBrains 扩展（marketplace 直链）

| 目标         | 版本                                           | 获取                                                                                                                                                                           |
| ------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| aixcoder     | 5.3.0                                          | `…/publishers/aixcoder-plugin/vsextensions/aixcoder/5.3.0/vspackage`；返回是 gzip 包 zip，`7z x` 自动穿透 → `extension/`                                                       |
| bito         | 1.7.0                                          | `…/publishers/Bito/vsextensions/Bito/1.7.0/vspackage` → unzip（已放弃审计，包仍在）                                                                                            |
| copilot-chat | 0.48.1                                         | `…/publishers/GitHub/vsextensions/copilot-chat/0.48.1/vspackage` → unzip                                                                                                       |
| fitten       | 1.1.4                                          | `…/publishers/fitten/vsextensions/fitten-code/1.1.4/vspackage` → unzip                                                                                                         |
| gitlab-duo   | 6.91.0                                         | `…/publishers/gitlab/vsextensions/gitlab-workflow/latest/vspackage`；gzip 包裹，先 gunzip 再 unzip                                                                             |
| iflycode     | 3.4.2                                          | `…/publishers/anhuizhuojiantechnology/vsextensions/iflycode/3.4.2/vspackage`；Open VSX 同步发布可互验                                                                          |
| joycode      | 3.8.71                                         | `…/publishers/JoyCoder/vsextensions/joycoder-fe/vspackage` → unzip                                                                                                             |
| lingma       | 2.6.10                                         | `…/publishers/Alibaba-Cloud/vsextensions/tongyi-lingma/2.6.10/vspackage`；gzip 包裹；嵌套载荷 `extension/dist/bin/lingma-2.6.10.zip`（202MB→562MB）再解                        |
| qodo-gen     | 0.14.2                                         | `…/publishers/Codium/vsextensions/qodogen/0.14.2/vspackage`（Visual Studio 扩展）；同 publisher 的 `codium` 2.2.6 是 VS Code 版                                                |
| raccoon      | 1.0.15                                         | `…/publishers/sensetime/vsextensions/raccoon/1.0.15/vspackage`（TargetPlatform=linux-x64）→ unzip                                                                              |
| zencoder     | 3.85.9005                                      | marketplace vspackage（pre-release flag）；darwin-arm64 + linux-x64 两个平台包                                                                                                 |
| jb-ai        | Junie 262.2144.120 / AI Assistant 262.10968.97 | `plugins.jetbrains.com/api/plugins/{id}/updates` 拿 updateId → `downloads.marketplace.jetbrains.com/files/{pluginId}/{updateId}/{file}.zip` → 7z；`.class` 里的字面量仍可 grep |

### npm CLI

| 目标          | 版本           | 获取                                                                                                                                                          |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auggie        | 0.36.0         | `npm view @augmentcode/auggie dist.tarball` → tgz → `tar xzf`（sha1 对 registry `dist.shasum`）                                                               |
| codebuddy-cli | 2.157.0        | `npm view @tencent-ai/codebuddy-code dist.tarball` → 55MB tgz → `tar xzf`                                                                                     |
| qoder-cli     | 1.1.62         | `@qoder-ai/qodercli/-/qodercli-1.1.62.tgz`（sha256 `60988bd5…`）→ `tar xzf`                                                                                   |
| qodo          | 0.36.0         | `npm pack @qodo/command` → `tar xzf`                                                                                                                          |
| claude-code   | 2.1.281        | `npm pack @anthropic-ai/claude-code`（27KB stub）+ `@anthropic-ai/claude-code-linux-x64`（101MB）；Bun ELF，`strings`/`rg -a` 或切 `/$bunfs/root/` 内嵌 chunk |
| amp           | 0.0.1790179256 | `@ampcode/cli` stub + `@ampcode/cli-linux-x64` 平台包 → 101MB Bun ELF；`objcopy --dump-section .bun` 切 JS bundle                                             |
| droid         | 0.225.2        | `npm pack droid`（loader）+ `@factory/cli-linux-x64@0.225.2` → 254MB ELF；`.bun` section 偏移 0x04d7f000，objcopy 切出                                        |
| copilot-cli   | 1.0.88         | `@github/copilot` stub + `@github/copilot-linux-x64` → 162MB Node SEA ELF；另有 GitHub release 同名资产可互验                                                 |
| tabnine       | 0.35.0         | `npm view tabnine` 只剩 wrapper；`stardrop-*` 平台包已被 npm 安全占位（444B）——真二进制需走其他渠道（见页面）                                                 |
| mimo          | 0.1.15         | `@mimo-ai/cli` postinstall 壳 + `@mimo-ai/mimocode-linux-x64`（129MB Bun ELF）；**MIT 开源**，可直接审 github.com/XiaomiMiMo/mimo-code                        |

### Electron IDE（官方 deb / tar.gz）

| 目标          | 版本                                   | 获取                                                                                                                                                                                                         |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| cursor        | 3.21.16                                | `cursor.com/api/download?platform=linux-x64&releaseTrack=stable` → JSON 里的 `debUrl`（downloads.cursor.com）→ `ar x` + `tar xf data.tar.xz`；app 未打 asar                                                  |
| qoder         | 1.31.0                                 | `qoder.com/download` 是 Next.js 无静态链；抓 webpack chunk grep `downloadUrl` → `download.qoder.com/release/latest/qoder-ide_amd64.deb` → deb 解包；未打 asar                                                |
| codebuddy-ide | 4.12.0                                 | 腾讯 CDN `CodeBuddy-linux-x64-4.12.0.37847260-b4c35ed0-cn.deb`（159MB）→ deb 解包；`usr/share/buddycn/resources/app/` 裸目录                                                                                 |
| comate-ide    | 3.10.1                                 | `comate-ide.bj.bcebos.com` tar.gz（259.7MB，`product.json` 的 `serverDownloadUrlTemplate` 可证渠道）→ `tar xzf`；未打 asar                                                                                   |
| trae-intl     | 2.3.73738                              | `trae.ai` 下载页 deb（372MB，国际版，端点为 trae.ai/byteintl.net/byteoversea.com）→ deb 解包；未打 asar                                                                                                      |
| kiro          | 1.1.14                                 | `prod.download.desktop.kiro.dev` deb（185MB）；release 元数据存 `installers/kiro/metadata-linux-x64-stable.json`；app 裸目录                                                                                 |
| devin-desktop | 3.10.35                                | `docs.devin.ai/desktop/install` 给出 APT 源 `windsurf-stable.codeiumdata.com/wVxQEIWkwPUEAGf3/apt` → 拉 `dists/stable/main/binary-amd64/Packages` → pool 里 `Devin-linux-x64-3.10.35.deb`（248MB）→ deb 解包 |
| warp          | 0.2026.09.16                           | `app.warp.dev/download?package=deb` 页面内含直链 `releases.warp.dev/stable/…/warp-terminal_…_amd64.deb`（sha256 对 APT `Packages.index`）→ deb 解包                                                          |
| codearts-ide  | 26.9.102                               | `codearts-agent-obs-cdn.huaweicloud.com/codearts/ai/latest/codearts-agent-linux-arm64-…deb`（arm64；`codearts.huaweicloud.com/download.html` 列的 URL）→ deb 解包；未打 asar                                 |
| kimi-desktop  | 1.0.3                                  | `code.kimi.com/kimi-code/desktop/latest-linux.yml`（302→cdn.kimi.com）拿版本+sha512 → `…/binaries/1.0.3/KimiCode-1.0.3-linux-amd64.deb` → deb 解包                                                           |
| codeflicker   | 1.0.29                                 | 更新 API `www.codeflicker.ai/api/proxy/update/api/update/{platform}/stable/external/1` → CDN `h3.static.yximgs.com`；darwin zip + win NSIS 同 commit；`Resources/app` 裸目录                                 |
| antigravity   | IDE 2.5.5 / desktop 2.17.0 / CLI 1.2.7 | 抓 `antigravity.google/download`（Astro 页面直链）→ `edgedl.me.gvt1.com/…/Antigravity%20IDE.tar.gz` + `storage.googleapis.com` 桌面包                                                                        |

### 其他渠道 / 受限目标

| 目标                                        | 版本             | 获取                                                                                                                                                     |
| ------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| astudio                                     | 3.4.1            | `agent.xfyun.cn/xingchen-studio/client/releases/latest` 只发 win/mac → win NSIS（583MB，sha512 对 API）`7z x` → `app/` + `app.asar` 再解                 |
| minimax-desktop                             | 3.0.73           | 无 Linux 构建；官方 win NSIS `filecdn.minimax.chat/public/minimax-agent-prod/release/MiniMax Code Setup 3.0.73.exe`（419MB）`7z x` → app-asar + app-root |
| inscode                                     | 2.2.11           | `raw.gitcode.com/inscode-codex/inscode-desktop-releases/latest.json` → gitcode releases 下 win NSIS + mac tar.gz；无 Linux 包                            |
| crabcode                                    | 1.1.15           | GitHub `acosmi/crabcode` release v1.1.15：`crabcode-1.1.15-linux-x64.tar.gz` + `oauthapi-llm-x64-linux.zip`，sha256 对 `checksums-sha256.txt`            |
| codearts-cli                                | 26.9.3           | `codearts_cli_versioninfo_v1.0.json` → `codearts-install-26.9.3-linux-x64.tar.gz`（72MB，OBS CDN）→ `agentkernel` Bun ELF                                |
| pieces                                      | pieces-os 12.6.2 | `snap download pieces-os`（api.snapcraft.io，1.9G 特例覆写上限）→ `7z x` squashfs；桌面 UI snap `pieces-for-developers` 同理                             |
| rovo                                        | acli 1.3.39      | 官方 APT `acli.atlassian.com/linux/deb` → `acli_1.3.39-stable_linux_amd64.deb`；rovodev payload 在令牌门后，**未获取**                                   |
| codefuse                                    | IDE 0.7.0 替代包 | VS Code 插件分发渠道已关死（登录 + 审批 + 域名收编内网）；仅 `CodeFuseIDESetup-win-x64.exe` 替代                                                         |
| blackbox / codegpt / codebuddy-ext / kepler | —                | 未获取（见各自页面 blocker 记录）                                                                                                                        |

## 四、常见问题

- **"扫描命中一堆但都是 vendored SDK"**：先 `rg -l` 看命中文件路径，vendored `node_modules/{aws-sdk,@aws-sdk,ali-oss,…}` 的字面量不算数——要找应用代码里的调用点。
- **"lane 报 upload_pipeline=true 但页面判 clean"**：`upload_pipeline` 只表示存在外发通道（含元数据遥测），判定读 `finding` 文本。
- **"Bun ELF 里 rg 不到明文"**：编译后 JS 在 `.bun` section，`objcopy --dump-section .bun=out.bin <elf>` 再对 out.bin 扫；或 `strings` 看 `/$bunfs/root/` 内嵌文件清单。
- **"marketplace 下载解不开"**：先 `file` 判类型，gzip 包 zip 的情况 `7z x` 能自动穿透；不行就 `gunzip -c x > x.vsix` 再解。
- **"页面 file:line 对不上"**：行号相对 `extracted/<tid>/` 下的具体 bundle 文件；minified 包行号极长，用 `rg -n '<标识符>'` 重新定位。

## 五、安装包指纹

下表为 8 个审计目标被审安装包的 sha256 指纹（截取前 16 字符）；全量哈希（含 history 存档、字节数、解包根清单）见 `~/src/agent-teardown/evidence/_global/installer-hashes.json`。复现下载后先对哈希，再谈解包。

| 目标 | 审计安装包 | sha256[:16] |
| --- | --- | --- |
| copilot-chat | `copilot-chat.vsix` | `7852df60c171be0b` |
| codebuddy-cli | `codebuddy-code-2.156.0.tgz` | `79c2c25f3d71c8bd` |
| codebuddy-cli | `codebuddy-code-2.157.0.tgz` | `d38ea7aa3777e08b` |
| codebuddy-ide | `CodeBuddy-linux-x64-4.12.0.37847260-b4c35ed0-cn.deb` | `1d6d88eb13bb04f4` |
| cursor | `cursor_3.21.16_amd64.deb` | `51b3556aa327c3c4` |
| kiro | `kiro-ide-1.1.14-stable-linux-x64.deb` | `a8def094f4303a39` |
| kiro | `metadata-linux-x64-stable.json` | `0d9e297be39b3c32` |
| qoder | `qoder-ide_amd64.deb` | `644298c4ca853d70` |
| trae-intl | `TraeCode-linux-x64-2.3.73738.deb` | `bdd45584a471c7cf` |
| minimax-desktop | `MiniMax-Code-Setup-3.0.73.exe` | `02a74ecc53d2bfc7` |
| minimax-desktop | `changelog.html` | `07ba405c5e3b35f7` |
