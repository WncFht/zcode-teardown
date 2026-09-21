# 开源包核对：zai-org/ZCode 源码发布

Scope：2026-09-20/21 官方于 GitHub 放出源码（`refs/ZCode`，clone 自 `github.com/zai-org/ZCode`）。git 史压扁为两个 commit——`77432b6` "Initial commit"（2026-09-20 20:06+08，**空树占位**，作者 zRzRzRzRzRzRzR \<Yuxuan.Zhang2@liverpool.ac.uk\>）→ `872ad96` "feat: open source"（2026-09-21 05:14+08，wuweiqi \<weiqi.wu@aminer.cn\>），6973 文件 / ~103 万行一次性落地。pnpm monorepo，root `package.json` version = **3.14.0**，Apache-2.0，距 3.14.0 二进制发布仅 ~2 天。核对方法：55-agent 并行审计（9 源码 mapper + 9 逐域 checker + 每条争议/新发现双人对抗验证 + 完整性 critic），全部论断 file:line 落证。

## 头条：开源树 ≠ 3.14.0 二进制——是"清洗过的兄弟树"

双向 diff 证实源码发布经过**第二次清洗**，且局部领先于已发二进制：

- **二进制有、源码无（被撤面）**：`/api/v1/marketing/touch{,/action}`（line-3.14 记为 3.14.0 新增）、`plan:claim_plan`/`plan:claim_zcode_plan`、`tier:basic/plus` 等营销/领取面在源码零命中——为开源而撤，非 3.14.0 不存在。
- **官方插件大半闭源**：`apps/zcode-cli/packages/bootstrap/src/app/official-plugin-definitions.ts` 播种 14 个官方插件，源码只有 3 个（browser-use-plugin、node-repl-host、superpowers-plugin）；android-emulator、ios-simulator、documents、pdf、presentations、spreadsheets、image-search、plugin-creator、skill-creator、zcode-guide、restore-legacy-sessions、computer-use 均为 `cdn-zcode.z.ai/zcode/official-plugin/assets` 预制品（`scripts/prepare-prebuilds.mjs`）——此前签名面"看不懂"的 env/flag 噪音多源于此。
- **CUA 是桩**：`packages/zcode-cua` 自述 "ships without Computer Use … fails closed"（README:3-7），真 51 文件 broker server 在内仓（`check-workspace-freshness.mjs:7` 明指独立 "zcode-cua 仓库"，`dev.aminer.cn/codegeex/zcode-cua.git`）；macOS helper `dev.zcode.cua-helper` 外部构建放入 `resources/cua-helper`（`desktopCuaHelperInstaller.ts:25-36`）。
- **IM bot 面未放出**：`@larksuiteoapi/node-sdk` 从 package.json/lockfile 删除，Lark 仅剩外部 `resources/tools/lark-cli` 二进制调用（`desktopRuntimeEnv.ts:372-394`，env `ZCODE_LARK_CLI_BINARY`）；Telegram 集成无源码。
- **web 远控宿主未放出**：`packages/web`（OAuth/share/`/remote`移动远控客户端）只随独立 `zcode-<ver>.tar.gz` server 包发行（`scripts/build-zcode.mjs:154-197`），桌面 .deb 不含——桌面侧远控宿主 IPC 在源码缺席。
- **清洗痕迹**：`DEFAULT_INTRANET_MACHINE_HOST` 置空（二进制含 `10.253.204.88:12345`/`studio.zcode-ai.com:12345`，`scripts/intranetDefaults.mjs`）；`@zcode/e2e-report` 全仓删除；`BIGMODEL` fallback secret 移除（`bigmodelProviderConfig.ts:40-43`）；`claude-plugins-official`→`zcode-plugins-official` 改名；遥测端点仅 env 注入，注释自承"构建产物不内嵌"；3 个内部 dep 从发行 manifest 剔除。
- **源码反而更新**：computer-use 插件 0.6.3（二进制 0.6.1）、`workflows/*` RPC 族、~16 个新 v4 方法、ultra gateway 路由、provider registry revision——开源树处于 3.14.0 之后的开发点。

## 快照上传面：全量复核确认，且看清"两刀"

报告（`2026-09-19-工作区快照上传.md`）全部核心论断经源码**逐条确认**：28 项追踪指标零命中；`repoSnapshot*`/`captureBeforePrompt`/`PostObject`/`/api/v1/snapshot/upload-credential`/`AES-256-CTR`/`RSA-OAEP`/三个 settings 键/settings.indexing 全部 i18n/repo-wiki 整族缺席；无任何替代性工作区收集通道（唯一存活 OSS 直传是反馈附件路，与快照无关；树内唯一加密是 AES-256-**GCM** 本地凭据存储）。

源码新增的视角：

- **切除是外科手术式且早于开源**：所有功能族标识符干净消失，无死代码、无注释残留；但疤痕可见——`networkTelemetryAggregator.ts:113,119` 的 ARMS 路径段白名单仍挂 `'snapshot'`/`'upload-credential'` 两条死项（报告 §14 预言的残留实证）；存储资源管理器留有孤儿 snapshot-layout 规则；`gitCheckpointStore.ts:33` 的 `checkpoints/` + `sha256(workspaceKey)` 共存结构仍在。
- **开源前又补了一刀**：`exportLogs.ts:140-147` 诊断导出排除表在二进制里是 `[agent-config, certs, repo-snapshots, repo-wiki, sessions, session-bindings, checkpoints]`，源码里 `repo-snapshots`/`repo-wiki` 被**进一步改写**为孤儿 `'repo'`——而树内无任何代码创建 `repo` 目录，证明该表为开源发布二次编辑过。
- REVIEW-16 部分可判：移除面在客户端无残留、无继任通道；服务端 ingest 是否保留仍不可判（服务端不在此仓）。

## 逐版分析勘误（对抗验证后成立）

- **`zcode:session_create:v1` 判错**（line-3.14 §协议）：非"首个带版本后缀的 zcode: IPC 通道"——实为 `telemetryCore.ts:27-35` `sessionCreateEventId()` 内的 SHA-256 事件 ID 命名空间种子；`channels.ts` 无任何 `:vN` 通道。签名口径应改记为遥测事件命名空间。
- **flags −33 部分误归因**：若干"移除"flag 在源码仍以代码常量存在（位于闭源/被撤部件内，二进制 strings 仍能扫到——移除的是键面非字面量）；repo-wiki 是整族缺席而非仅配置面收缩。
- **bundle-meta 归属修正**：`native-search-tools-config.mjs:386-409` 仅 ripgrep 为 `source:"official"`（Microsoft 官方预制品）；bfs 与 ugrep **均** `source:"producer"`（内建自产，pinned 上游源码，`v{ver}-{N}` prebuilt release——linux bfs v4.1.1-2 与此前记账一致）。bfs 上游从不发二进制，"official" 本就不成立。
- **engine 名 `glm-zcode` 是合成名**：源码无该字面量；实为 `ZCODE_AGENT_PROVIDER=glm`（`zcode-agent-policy.ts:5-6`）+ 产品名的拼接。但 `glm/` 包名获独立确认——远程部署组件 id 字面就是 `glm`（`prepare-prebuilds.mjs:484-515` 把 `glm/<platform>/zcode.cjs` + glm 官方插件上架）。
- **`acp_methods` 类目大部分噪音**：引擎线协议是自研 "ZCode Protocol"（v1 NDJSON JSON-RPC + V4 wire-v3 topic/subscription，CRC32+base64，CAS 命令封套），**非 ACP**；签名里的 acp/elicitation 串是捆绑依赖残渣 + 已退役时代遗迹（见下）。
- **line-3.14 内部不一致**：`acp_methods −5`（§5 签名面）vs `−7`（§CUA 段）两口径并存，应统一。
- **zcode.cjs +60% 名称跳变机制归因修正**：增量主体是 dynamic-workflow 引擎合入主 bundle（cli→bootstrap→dynamic-workflow 依赖链），非泛指"插件群膨胀"。
- **extensions 两处修正**：registry 分类与 CLI 面以源码为准（`plugins:install|uninstall|link|update|inspect` + `--plugin-dir/--plugins/--no-plugins/--skip-plugins`）。
- **runtime 细化**：bfs 是 linux-only 工具（win 树无 bfs.exe 属平台差异非版本差异）；darwin rg 钉在 v13.0.0-10 仅远程 darwin，桌面 darwin 仍 rg14；sshcrypto.node = ssh2 tarball 内 aarch64 死载荷（零打包校验）；`NODE_MODULE_VERSION 145` = Electron 41 ABI 确认。
- **"VS Code fork"非记录在案的社区宣称**（核对时误引）：community-intel.md 实录是 Codex-UI-复刻、opencode-抽取、Claude-Code-提示词同源、2.x gemini-cli fork 四条。源码证实的上游血统：VS Code 系仅 IPC 层（SocketProtocol/ChannelServer/VSBuffer 明注移植），工作台本体自研。

## 源码独有的新发现

**协议与架构**：ZCode Protocol 版本化迁移中——v3 legacy 方法（session/send|stop|fork 等）与 v4 command/gateway 模型并存（`zcode-protocol/index.ts:3573-3590`，`v4-bridge.ts:1125-1130`）；桌面进程模型 = 每窗一个 utilityProcess Host + 全局 zcode-cron-scheduler，renderer 经 ScopedServicePort 重连不重启；`agent-server`/`app-server` 完全同义；引擎描述版本冻结在 0.13.3；TUI = OpenTUI（非 ink）整体编入 zcode.cjs；远程 agent 跑独立 Node v22.16.0（产品内含两套 Node）；`web-remote-replayable` 与 `desktop-continuous` 双信任级，`/ws/host` 32 字节一次性 ticket 提权（`hostCapability.ts`）。

**隐私/出口面**（源级新增，二进制期不可见或仅猜测）：

- **官方网关静默改写**：`official-coding-plan-gateway.ts:22-68` 把指向 `api.z.ai`/`open.bigmodel.cn` 的 anthropic URL 透明重定向至 `zcode.z.ai/api/v1/ultra(-zai)/anthropic/v1/messages`，**含完整 auth 头**——即使用户自建 provider 也命中，按 URL 匹配不按身份；`NOTICE.md:39` 对此有明文披露。
- **本地 MITM CA**：`services/node.ts:~1387` `ensureAppCaCert()` 生成自签 CA 经 `NODE_EXTRA_CA_CERTS` 注入，供 agent 出口代理 MITM 出站流量。
- **持久设备指纹**：`deviceMid`（`~/.zcode/v2/telemetry-state.json` 随机 UUID）是跨通道指纹——ARMS `user.name`、`/event/report` `device_mid` 共用；`ZCODE_TELEMETRY_USER_SUBJECT_ID = sha256(account id)` 由桌面宿主注入。
- **数据仓库遥测**：目录化 UI 动作（发消息/开文件/切设置/远程连接，`userActionTraceCatalog.ts`）逐条上报 `/event/report`，带真实 `user_id`+Authorization；OTLP trace 采样 10%，env 门控 opt-out（无 UI 开关）。
- **强制更新开关**：`/api/v1/client/configs` 的 `minimalVersion` 可服务端封停低版本（`forceUpdateGuard.ts:24`）+ 远程配置注入面。
- **反馈附件面**：日志附件上限 1GiB 经 multipart 直传阿里云 OSS（`feedbackHttpClient.ts:130,191-193,512-544`）；导出包排除 checkpoints/sessions/credentials——报告 §14 预言的留存实证。
- **凭据存储密钥** = `sha256('zcode-credential-fallback:'+platform+homedir+username)` 确定性机器派生（`credentialCipherProvider.ts:24-37`）。
- **服务端认证薄弱**：`packages/server/src/http.ts:236-238` token 只罩 `/ws*`、`/api/*`，静态资产无保护，`ZCODE_SERVER_AUTH_TOKEN` 未设则全表面开放（loopback 内）；zcode-server-cli `server-core` 无 token 中间件，纯 loopback fail-closed（`http.ts:127-137`）。
- **node_repl js 内核实为不受限 Node**：vm context 拿真 `createRequire(cwd)`，`process.env` 全量暴露进内核（`node-repl-runtime-helpers.ts:5-21`）。
- **browser-use 可接管用户已开标签页**（`browser.user.openTabs()`→`claimTab`）+ `evaluate` 任意 JS 注入。
- **Windows helper 硬编码 Chrome App-Bound-Encryption flag keys**（`Program.cs:27-32`，默认关闭 `ZCODE_ENABLE_WINDOWS_BROWSER_IMPORT`）。

**"ACP 时代"第一方实锤**：源码注释点名已退役存储域 `v2/acp-{auth,config,stream-diagnostics,traffic-proxy}`，并承认老用户目录可能残留 "hundreds of MB" 抓包流量与旧 auth 文件（`exportLogs.ts:131-135,675-749`；`storageCatalog.ts:93,104-105,169`）；`nonCliAcpRetirement` 测试套件强制 claude/codex/gemini/opencode provider 退役——二进制期推断的 MITM/流量代理时代获官方代码自证。

**生态兼容面**：插件引擎按序 ingest 三种 manifest——`.zcode-plugin/`、`.claude-plugin/`、`.codex-plugin/`（`marketplace.ts:53-56,2140-2151`），叠加 Claude-marketplace.json 目录、`${CLAUDE_*}` shell 别名展开、claude-native 会话导入（`services/src/session/claude-native/`）——"自研"引擎实为**刻意的 Claude Code 兼容运行时**；settings-sync 可从 ~17 个外部 agent 生态导入 skills/commands/plugins/MCP。

**模型/套餐面**：`zcode-builtin.json`（rev 30）目录超前所有社区快照——GLM-5.3/5.3-Flash、kimi-k3/k3-256k、gpt-6-astra、claude-fable-5-1/opus-5/sonnet-5、grok-4.6、deepseek-v4-pro、qwen3.8、mimo-v2.5(-pro)、MiniMax-M3（2026-09 时点目录）；隐藏 off-peak provider 走 `/api/v1/off-peak/anthropic`（`visibility:'hidden'`）；start-plan 流量经自家 `/api/v1/zcode-plan/anthropic` 代理；registry 远程更新通道走 `/api/v1/client/configs`→CDN URL，内置 `RETIRED_ZAPI_PROVIDER_ID` 退役护栏。plans 签名 26 项中 ~10 项锚定真实 plan 词汇，claim\*/tier:\* 系确属二进制独有（营销闭源面）。

**前瞻性威胁**：`scripts/compile-desktop-agent-bytecode.cjs` + `build-desktop-agent-bytecode.mjs` 实现 agent 引擎 V8 bytecode 打包（`ZCODE_DESKTOP_AGENT_BYTECODE` 门控，3.14.0 签名 env 已现该键），loader 以 `' '.repeat(sourceLength)` 抹掉明文源——一旦启用，strings 级二进制分析将失明，值得监控。

**签名口径校准**（供提取管道改进）：`zcode:*` 字面量三重过载（真 IPC 通道 vs 遥测 tag vs 存储 key vs 事件 ID 种子）；`acp_methods` 多为捆绑依赖残渣 + 退役遗迹；二进制独有 models（gpt-4o/o3-mini/claude-3-haiku 等）= 服务端下发/隐藏 provider 而非客户端目录；env*var 噪音可归因到 vendored 生态（`ANDROID*\_`/`CLAUDE\_\_`来自插件生态位）；16 个`**ZCODE\_\***` 编译期常量清单已建立。覆盖率：RPC registry 签名召回 38%、IPC enum 覆盖 98.5%、endpoint 覆盖 71%。

## REVIEW

- **补丁面未深挖**：`patches/@ai-sdk__anthropic` 加非上游 `type:"video"` 内容块（未发布能力）；`@arms__rum-electron` 补丁暴露遥测采集内部——值得专项。
- **`web-remote-replayable` 服务端 ingest/存储面**：源码揭示该模式但服务端正身不在仓内，其数据落地审计空白。
- **开源树与二进制的精确漂移清单**：当前为抽查级；做全量 "signature∩source" 三向对账（binary-only / source-only / 共有）可产出精确清洗清单。
- **compliance 面**：Apache-2.0 与 THIRD-PARTY-NOTICES（~2MB）一致性、`NOTICE.md` 披露完备性未逐条核。
- **两个 commit 的作者身份**：liverpool.ac.uk 学生邮箱 + aminer.cn 域名的组合与发布链可信度的关系未考。
