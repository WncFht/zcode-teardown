# 多客户端隐藏上传扫描（Agent Teardown Sweep）

ZCode 工作区快照上传机制的横向推广审计：把 [28 项追踪指标](../snapshot-tracking.json) 泛化为 7 个扫描族，对 **46 个闭源 agentic coding 客户端**批量逆向，找同款"伪装成本地索引/遥测的工作区内容上传"。

- **语料仓**: `~/src/agent-teardown/`（installers 20G 含历史版本 / extracted 12G / evidence 2.8G，非 git）
- **流水线**: [tools/sweep/](../../tools/sweep/README.md)（Workflow 脚本 + 判定口径 + 已知坑）
- **复现指南**: [reproduce.md](reproduce.md)（通用流水线 + 每目标获取/解包命令 + 证据引用约定）
- **引入时间线**: [timeline.md](timeline.md)（8 个重点目标的管线版本考古：签名二分定位首现版本）
- **深度报告**: [deep-report.md](deep-report.md)（8 家逐家深剖：载荷解剖 / 宣称对照 / 对抗复核 / 横向矩阵）
- **图素材手册**: [figure-book.md](figure-book.md)（ZCode+8 家：流程图数据 / 重构载荷 / 举证片段 / 时间线 / 作图清单 F01–F17）
- **成图**: [figures/](figures/)（已出 12 张：F01–F09 每目标管线泳道图、F10 九家六维矩阵、F11 引入时间线、F15 三段式同构对比；frag 源 + pdf/png/svg/transparent）
- **地面真源**: workflow journal `wf_8ed8c294-94a`（判定）+ `wf_686c7520-9ca`（版本考古）+ `wf_57214b00-077`（深剖）；已按目标拆分为 `evidence/<tid>/journal-digest.json`
- **审计日期**: 2026-09-22 ~ 2026-09-25；全部为静态分析，不运行目标、不绕登录

## 判定矩阵

### 隐藏上传 confirmed（工作区/会话内容离机，无诚实 consent 面）

| 目标                                         | 厂商      | 判定要点                                                                                                                                                         |
| -------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AStudio](astudio.md) 3.4.1                  | iFlytek   | **本批最严重**：3 条常开管线——session jsonl 全量转录上传、小时级日志上报、placebo 开关的 OTLP 每轮 prompt+ 工具内容；硬编码密钥 AES 埋点                         |
| [MiniMax Desktop](minimax-desktop.md) 3.0.73 | MiniMax   | eval capture 每轮上传完整 LLM 上下文（含文件原文）+ 工作区清单，登录即开、零 consent 面；"Help improve" 为 placebo 开关                                          |
| [Cursor](cursor.md) 3.21.16                  | Anysphere | codebase-telemetry v2：shadow-git packfile 每 agent 请求 → api2.cursor.sh；范围含 `~/.claude` `~/.codex` `~/.agents`；privacy off 时密钥发服务端；策略 fail-open |
| [Qoder](qoder.md) 1.31.0                     | Alibaba   | Merkle-diff 文件上传 → center.qoder.sh；自动索引默认开（<10k 文件）；consent flag 在服务端；RSA+AES-GCM EncryptedLogService                                      |
| [CodeBuddy IDE](codebuddy-ide.md) 4.12.0     | Tencent   | **三条独立工作区内容外发管线**全部服务端门控、UI 不可见；远端 flag 驱动 buildIndex → 逐文件原文传 COS                                                            |
| [Comate IDE (Zulu)](comate-ide.md) 3.10.1    | Baidu     | CodebaseArchiveUploader 每次查询前后执行**运行时从服务端拉取的** upload_to_bos.sh；零 UI；比 ZCode 更隐蔽（仅限内网环境触发）                                    |
| [Trae intl](trae-intl.md) 3.5.91             | ByteDance | 服务端驱动的日志采集管线（ZCode 同构 ×2 实现）+ 伪装反馈单；零 consent 面，仅 storeRegion 门控                                                                   |
| [CodeFlicker](codeflicker.md) 1.0.29         | Kuaishou  | **最恶劣形态之一**：`@ks-radar/electron-log-recall` 每 10min 轮询，服务端点名任意路径（`~`/env 展开、无白名单、递归 glob）打包 tar.gz 拉回                       |
| [aiXcoder](aixcoder.md) 5.3.0                | aiXcoder  | 隐藏上传 + 服务端任意文件拉取（`reference_files_needed` 支持 `../` 穿越工作区外文件）；stat-code 守护进程每次编辑传全文                                          |
| [CodeBuddy CLI](codebuddy-cli.md) 2.157.0    | Tencent   | 纯服务端遥控的日志收集→zip→COS STS→putObject→回报管线；`allWorkspaces` 扫全部工作区 + 可注入任意路径                                                             |
| [Copilot Chat](copilot-chat.md) 0.48.1       | Microsoft | `external ingest` 把工作区文件全文 POST `api.github.com/external/code/ingest`；隐藏设置 `onExp` 门控且**服务端可远程翻转**                                       |
| [JoyCode](joycode.md) 3.8.71                 | JD        | 多通道：csr-core 登录即自动 merkle+ 原文上传（声明的开关是死代码）+ Shenyi WS 远程拉文件 + commit 钩子走**明文 HTTP** 传原文                                     |
| [iFlyCode](iflycode.md) 3.4.2                | iFlytek   | RAG `incbatchload` 源码原文自动上传零 consent（UI 谎称"本地代码库"）；默认开 SM4 代码监控（硬编码 key）                                                          |
| [Qodo Gen](qodo-gen.md) 2.2.6                | Qodo      | commit 完整 diff + accept 代码片段 + 任务目录树，纯服务端 flag 门控，UI 零披露                                                                                   |
| [Tabnine](tabnine.md) 0.35.0                 | Tabnine   | `/log/v1` 每次 write/edit 上传完整生成内容、`/attribution/recitation/v2` 写入前 snippet 上传，纯服务端 flag 门控                                                 |
| [Zencoder](zencoder.md) 3.85.9005            | Zencoder  | 每次 run 的 finally 上传完整会话轨迹（含文件内容）；唯一开关 `telemetry.enabled` 未声明；OTLP 默认开；RudderStack 恒真                                           |
| [Kiro](kiro.md) 1.1.14                       | AWS       | `ActivityLogPublisher` 每 3s 把完整会话转录（含文件内容）POST runtime.kiro.dev，无开关；休眠的工作区上传 SDK                                                     |

### 披露失真 / 条件触发（有外发但非典型隐藏管线，或门槛失真）

| 目标                                     | 厂商        | 判定要点                                                                                                                               |
| ---------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [CodeArts IDE](codearts-ide.md) 26.9.102 | Huawei      | ZCode 同构 OBS 管线（register→credential→OBS→callback 经 localhost:4096 agentkernelServer），但属 UI 可见特性；披露失真 + TLS 校验被关 |
| [Amp](amp.md) 0.0.1790179256             | Sourcegraph | git push 整树到厂商仅在 sandbox/orb/headless 模式自动执行；交互 TUI 不触发                                                             |
| [auggie](auggie.md) 0.36.0               | Augment     | `find-missing`→`batch-upload` 整库镜像明文上传；TUI consent 真实但文案只说 "index"；`--print`/`--mcp` 模式跳过提示                     |
| [Qodo Command](qodo.md) 0.36.0           | Qodo        | 单条 WSS 承载全量上下文 + 工具结果；服务端 `base_url` 可整体重定向 egress 面；shell `cat` 自动批准无目录限定                           |
| [Copilot CLI](copilot-cli.md) 1.0.88     | GitHub      | `local_diff_snapshot` 把 git diff 内容经受限遥测发出（客户端无开关）；无整包上传                                                       |
| [CrabCode](crabcode.md) 1.1.15           | Acosmi      | `git bundle --all`+WIP 全仓上传，用户触发但 `/ultrareview` 强制、GrowthBook 可翻转；还转发活 OAuth token                               |
| [Droid](droid.md) 0.225.2                | Factory     | daemon `push_cwd_file_to_url`（presigned S3 直传 cwd 任意文件）+ 默认开会话同步 + workstream 自动发布                                  |
| [Lingma](lingma.md) 2.6.10               | Alibaba     | 无整包上传（Go 调用图级否定）；但文件保存即自动 POST 代码块到 embedding API，服务端 flag 门控、本地零开关                              |
| [Warp](warp.md)                          | Warp        | indexing 传真实代码片段（有 consent）；handoff 快照默认开仅 `--no-snapshot` 可关；cloud 会话存储默认开                                 |
| [Qoder CLI](qoder-cli.md) 1.1.62         | Alibaba     | 无每轮隐藏上传；remote-control artifact 通道有三段式形状但有 registry 边界；aiCodeTracking 默认开；UI 文案全 XOR 混淆                  |
| [CodeArts CLI](codearts-cli.md) 26.9.3   | Huawei      | 非隐藏（显式 `/codebase/init`）但卫生恶劣：`.env*` 白名单进 zip + launcher 全局关 TLS 校验                                             |

### 休眠 / 部分 / clean

| 目标                                      | 厂商      | 判定                                                                                                |
| ----------------------------------------- | --------- | --------------------------------------------------------------------------------------------------- |
| [Antigravity](antigravity.md)             | Google    | **dormant**：完整 git-bundle 上传管线存在但此 build 无条件禁用；Clearcut opt-out 只脱敏仍上传       |
| [Fitten](fitten.md) 1.1.4                 | Fitten    | 完整管线休眠（`getUploadProjectConfig()="Off"` 硬编码）；但 10min 明文 HTTP beacon 活着，裸 IP 端点 |
| [Raccoon](raccoon.md) 1.0.15              | SenseTime | 无批量管线；休眠的服务端可控 embeddings 外发开关；遥测 "anonymous" 文案与持久 UUID 矛盾             |
| [Pieces](pieces.md)                       | Pieces    | 用户触发合规：备份管线形状同 ZCode 但是诚实标注的手动特性；备份内容极宽（OCR/剪贴板/音频转写）      |
| [Kimi Desktop](kimi-desktop.md) 1.0.2     | Moonshot  | **refuted-clean**：反馈上传为死代码；Remote Control relay 披露+opt-in；大陆区元数据遥测             |
| [Devin Desktop](devin-desktop.md) 3.10.35 | Cognition | **clean**（pclntab 调用图核实）；多条披露的产品固有 egress                                          |
| [Claude Code](claude-code.md) 2.1.281     | Anthropic | **clean 基线**：凭证→直传→注册拓扑存在但全披露 + 多层 consent 门控                                  |
| [JB AI/Junie](jb-ai.md)                   | JetBrains | **clean**：索引写契约全为零调用者的服务端协议面；JCP 分析镜像默认开（元数据级瑕疵）                 |
| [GitLab Duo](gitlab-duo.md) 6.91.0        | GitLab    | **clean**：全部外发为声明式特性；self-managed 遥测强开小瑕疵                                        |
| [MiMo-Code](mimo.md) 0.1.15               | Xiaomi    | **clean（开源）**：MIT OpenCode fork；唯一瑕疵 tracking.miui.com 元数据指标默认开未文档化           |

### 未审计 / 覆盖不足

| 目标                                                                                                      | 状态                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [InsCode](inscode.md) 2.2.11                                                                              | 仅 4 族扫描：`agent_assets` 模块扫描**其他 agent**（claude/codex/cursor/kimi/zcode/trae）的会话资产目录 + 签名 NDJSON 遥测导出——高危信号待复核 |
| [CodeFuse](codefuse.md)                                                                                   | 分发渠道已关死，仅替代包                                                                                                                       |
| [Bito](bito.md)                                                                                           | 已解包未扫：extension.js 有 snapshot/encrypt/OSS/createGzip 密集命中，**值得优先补**                                                           |
| [Rovo](rovo.md)                                                                                           | agent binary 在 as.atlassian.com 令牌门后                                                                                                      |
| [Blackbox](blackbox.md) / [CodeGPT](codegpt.md) / [CodeBuddy ext](codebuddy-ext.md) / [Kepler](kepler.md) | 未获取                                                                                                                                         |

## 结论速览

**17 个确认存在隐藏上传**（无 consent 面或 consent 失真/服务端遥控）：AStudio、MiniMax Desktop、Cursor、Qoder、CodeBuddy IDE、CodeBuddy CLI、Comate/Zulu、Trae intl、CodeFlicker、aiXcoder、Copilot Chat、JoyCode、iFlyCode、Qodo Gen、Tabnine、Zencoder、Kiro。

**11 个披露失真/条件触发**：CodeArts IDE、Amp、auggie、Qodo、Copilot CLI、CrabCode、Droid、Lingma、Warp、Qoder CLI、CodeArts CLI。

**7 个 clean 或用户触发合规**：Kimi Desktop、Devin Desktop、Claude Code（基线）、JB AI、GitLab Duo、MiMo-Code、Pieces。另有 3 个 dormant（Antigravity、Fitten、Raccoon）。

**共性模式**：

1. **三段式凭证管线**：`presign/credential 端点 → 直传对象存储 → register/commit 回调`。客户端不持长期云凭证，全部由自家网关短时签发。
2. **consent 与服务端绑定**：本地开关是 placebo（只写服务端字段、客户端不读）或死代码；文案只说"索引/改进体验"；真正门控是登录态 + 服务端 flag + GrowthBook/onExp 远程翻转。
3. **最恶劣形态**：服务端可点名任意路径拉回（CodeFlicker、aiXcoder、JoyCode Shenyi）——越过"只传工作区"的边界。
4. **卫生差异**：MiniMax/Qoder 有 secret denylist 与大小上限；ZCode 连 `.git/` 全收；CodeArts CLI 把 `.env*` 白名单进 zip 且全局关 TLS 校验。加密可有可无，结论与加密无关。
5. **基线对照**：Claude Code / GitLab Duo / JB AI / Devin 的外发均有文档化 consent 与元数据级载荷——"有遥测" ≠ "有隐藏上传"，判定点在**内容是否离机**与**consent 是否诚实有效**。

## 方法

见 [tools/sweep/README.md](../../tools/sweep/README.md)。46 目标 × (acquire + 7 族扫描) → 双镜 verify → 5 lane 深潜，共 ~600 agent 轮次（含限流重试与多轮 resume）。判定全部双镜对抗：evidence 镜证"内容离机"、refute 镜证伪，两镜均 refuted 才判 clean。
