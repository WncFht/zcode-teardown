# 跨厂商深剖报告 —— 8 家 agentic coding 客户端的隐藏工作区内容上传管线

46 目标横向扫描（[README.md](README.md) 判定矩阵：17 confirmed / 11 披露失真 / 7 clean / 3 dormant）中完成 5-lane 深潜 + 版本考古的 8 个重点目标的旗舰对照报告。审计窗口 2026-09-22 ~ 2026-09-25；**全部为静态分析**——未运行任何目标二进制、未登录、未触网验证；引用 file:line 均相对 `~/src/agent-teardown/extracted/<tid>/`。语料规模：installers 9.5G / extracted 30G / evidence 2.7G（`~/src/agent-teardown/`，非 git）。

## 一、摘要

| 目标 | 版本 | 一句话定性 |
| --- | --- | --- |
| [Copilot Chat](copilot-chat.md) | 0.48.1 | 服务端可远程热翻转的 onExp 实验开关，每次 `@workspace` 语义搜索先把文件全文 POST 到 `api.github.com/external/code/ingest` |
| [CodeBuddy CLI](codebuddy-cli.md) | 2.157.0 | 纯服务端任务队列遥控的 collect→zip→COS STS→putObject→回报管线，`allWorkspaces` 扫全部工作区 + 跨产品日志目录 |
| [CodeBuddy IDE](codebuddy-ide.md) | 4.12.0 | 四条独立服务端门控内容外发通道（文件历史全文+diff / 编辑快照 / merkle→COS 直传 / 日志→COS），UI 零数据收集开关 |
| [Cursor](cursor.md) | 3.21.16 | 逐 agent 请求的影子 git packfile（含 `~/.claude`/`~/.codex`）+ 逐键击 FileSync 不查 privacyMode + OOM 自动 S3 zip |
| [Kiro](kiro.md) | 1.1.14 | 每 3s 完整会话转录（tool_result 含文件内容）常开上传 `runtime.*.kiro.dev`，唯一门槛是区域白名单，opt-out 头不覆盖 |
| [Qoder](qoder.md) | 1.31.0 | merkle 缺漏文件明文 zip 上行 center.qoder.sh + 零 UI 的 back_flow 原文遥测（文件原文/prompt/diff/remote URL） |
| [Trae intl](trae-intl.md) | 3.5.91 | 服务端驱动的日志 tar.gz→ImageX 管线（JS+原生 .so 双实现）+ `packCodexSessions` 竞品 agent 转录收割 + 伪造用户反馈单 |
| [MiniMax Desktop](minimax-desktop.md) | 3.0.73 | 登录即开的 eval capture：每次物理 LLM 调用上传完整上下文（system prompt+全 messages+工具结果=文件原文）+工作区指纹 |

## 二、方法

- **静态拆解**：官方渠道获取安装包（marketplace vspackage / npm tarball / 官方 deb / NSIS，全部无鉴权）→ 解包（`7z`/`ar`/`asar`/`objcopy .bun`/pclntab 恢复）→ 7 族指标扫描（pack/crypto/cloud/egress/index/consent/urls）。流水线与口径见 [reproduce.md](reproduce.md)。
- **双镜对抗 verify**：每个可疑命中跑 evidence 镜（追到 socket/HTTP 调用点证明内容离机）与 refute 镜（死代码？vendored SDK 未接线？已披露用户特性？）；两镜皆 refuted 才判 clean。本报告已吸收复核修正——被推翻的论断不计入（见各页"复核"节）。
- **版本考古**：逐版本下载历史安装包扫特征字面量二分首现版本（[timeline.md](timeline.md)）；用于区分"首发即带"与"中途引入"、观察门槛演化。
- **"confirmed"的含义**：二进制中存在完整的"收集→打包→（凭证签发→）传输→（注册）"调用链且非死代码、非用户触发路径、无诚实 consent 面。服务端 flag 的当前取值、厂商侧是否实收/留存，静态分析不可证。
- **安全约束**：绝不运行目标；不绕登录/鉴权；不访问付费端点；安装包 ≤1GB；不写 `/tmp`。

## 三、逐家深剖

### Copilot Chat 0.48.1（Microsoft / GitHub）— [copilot-chat.md](copilot-chat.md)

- **管线**：`ExternalIngestIndex` reconcile 全树（`findFiles("**/*")`+sqlite `codebase-external.sqlite`+FS watcher）→ 每次 `@workspace` 语义搜索静默 `doIngest`（noop progress）→ `POST api.github.com/external/code/ingest` → `/batch`（**服务端挑选 doc_ids**）→ 逐文件 `POST /document`（b64 全文+相对路径）→ `/finalize`（extension.js:2363/2409）。
- **门槛**：`chat.workspace.codeSearchExternalIngest.enabled` default false、tags `[advanced,onExp]`（常规视图不显眼、仍可搜索）；未设值时回落 ExP-TAS treatment var——**微软可对未设值用户中会话热翻转**；`"force"` 时 ingest 取代 remote-index。
- **载荷**：fileset uuid、wasm GeoFilter 指纹、coded_symbols、b64 文件全文、`<folderId>/<relPath>`；Bearer=静默 GitHub session。
- **范围**：wasm 过滤 3B–350KB、deny pem/key/pfx/p12/crt/cer/jks；**`.env`/`id_rsa`/`.npmrc`/`credentials.json` 放行**。
- **consent**：零——`promptForExpandedLocalIndexing` 两处实现皆死代码；官方 docs "uploads your data to GitHub" 是唯一用上 upload 的表面，产品内文案全是 "index"。
- **附带**：捆绑 CLI（Claude Code fork）`git bundle --all`+stash WIP→`/v1/files`；`CLAUDE_CODE_OAUTH_TOKEN` 注入沙箱 env；transcript 分享 `rawTranscriptJsonl` 绕过打码；`rt='1'` 遥测发整 message 数组。
- **引入**：≤0.45.1 缺席 → **0.48.1（2026-05-15）首个可获取携带版**，落地即完全体。

### CodeBuddy CLI 2.157.0（腾讯）— [codebuddy-cli.md](codebuddy-cli.md)

- **管线**：启动订阅服务端推送 `log.upload.{enabled,interval,allowedEnvironments}`→ 每拍轮询 `GET /v2/logs/upload_task/check`（硬编码 HMAC key `log_collection_secret_key`）→ collect→zlib-9 zip→`GET /v2/logs/upload_credentials`→COS STS `putObject`→`PUT /v2/logs/upload_task` 回报——与 ZCode collect→zip→credential→OSS→inform 形状 1:1。
- **载荷**：服务端任务恒传 `allWorkspaces:true`——**全部**工作区日志（每文件首行 `Workspace Path:<绝对路径>`）+ `collectRecentIdeLogFiles` 跨产品目录（`~/.workbuddy/logs` 等，mtime<24h 无扩展名过滤）。
- **门槛**：纯服务端；任何 product*.json 无本地默认；`DISABLE_TELEMETRY` 不覆盖；`allowedEnvironments` 校验失败仍武装（fail-open）；仅 `dist/codebuddy.js`（TUI）含真实 archiver/COS。
- **复核修正**：`extraUploadPathsProvider`"服务端注入任意路径"**已推翻**——裸 Symbol DI token 全包零实现；真实越界面是硬编码跨产品收集。
- **附带**：Galileo OTLP 无条件 `file.path`/`command`/MCP-input 属性；`/agenttool/v1/intent/recall` 发完整 prompt 且**显式绕过 DISABLE_TELEMETRY**；`/v1/runtime-proxy/audits` `resolvedFiles` 工具触及文件原文 ≤32KB；`WeComReply` needsApproval=false 任意 ≤20MB 文件外发；`/v3/config?repos[]=` 泄漏每个 git remote。
- **引入**：unlisted nightly **1.25.0-next.bd7d324.20251107（2025-11-07）**；2.97.4（2026-05-21）升级任务队列+HMAC+跨产品收集。

### CodeBuddy IDE 4.12.0（腾讯）— [codebuddy-ide.md](codebuddy-ide.md)

- **四通道**（各自独立服务端门控，UI 零数据收集开关）：
    - A `POST /file/history`：任意打开文件**全文**首快照+逐编辑 `{old_text,new_text,cursor_position}`+绝对路径+git 分支/commit；每 agent prompt/新会话/关闭/失焦(30s)/2h 定时/退出全量补报；门 `GET /v3/config/llm_data`（fail-closed）。
    - B `POST /code/report`：编辑快照 `{uri,diff,repoUri,branch,commit,baseContent(编辑前全文 ~20% 中链保留)}`；门 `productFeatures.CodeEditsTracking`；服务端可 `/api/v1/code_edits/missing` 点名回捞。
    - C codebase→**COS 直传**：merkle(≤10k,gitignore)→`handshake`→`upload_addr` 返 STS→`cos.putObject{Bucket:'copilot-codebase-1258344699',Body:createReadStream}`→`index` 注册+600s 重同步——ZCode OSS 形状 1:1；登录+`productFeatures.Codebase` 自动触发。
    - D 日志→COS：`config.log.upload.interval>0` 打包最近 1 日 zip→`upload_credentials`→putObject；`upload.log.silence` 命令**全程无 UI**。
- **consent**：32 个 `codingcopilot.*` 设置零数据键；上传中状态栏显示 "Workspace code **searching**…"（方法名 `setUploadingProgress`）；登录页 "Completed Locally" 直接矛盾。
- **范围漏洞**：FileFilter 仅管 A 通道（且删除路径跳内容扫描、agent 会话路径整体绕过）；COS 通道 DEFAULT_IGNORE 含 `.env*` 但**无密钥名黑名单**——`.npmrc/.pem/.key/.aws/.ssh` 直传 bucket。
- **附带**：`connect_cloud_service` 把**原始 accessToken** 注入模型上下文（"do NOT mention credentials"）；`cloud_studio_deploy` needUserConfirm:false 任意目录 zip 外发；config 拉取泄漏全部 git remote。
- **引入**：codebase lane ≤0.1.8（2025-07-22，最老可得即阳性）；完整签名 **4.3.3（2026-01-26）**；5.6.2 移除实现仅剩 flag 声明。

### Cursor 3.21.16（Anysphere）— [cursor.md](cursor.md)

- **A 影子 packfile**：`userData/snapshots` 影子 git 仓 → 每 agent 请求 `triggerSnapshot` → `aiserver.v1.CodebaseSnapshotService`（api2.cursor.sh）：RegisterCodebase{绝对路径}→CreatePackfileUpload→UploadPackfileChunk≤64MiB→Complete→RegisterSnapshot；Rust `file_service.node` 产真实 packfile（blob=工作区文件内容）+`GitHistoryUploader` 打包真实 repo 近 1 月史。
- **范围**：dot-dir allowlist 收 **`~/.claude`（14 项：projects/history.jsonl/plans/skills…）`~/.codex` `~/.agents` `~/.cursor`**——竞品 agent 数据进 packfile。
- **门槛**：`codebase_telemetry_v2` flag + `privacyMode===4` + `CheckCodebaseTelemetryPolicy`（**fail-open**，enforcement 默认关→repo-deny 仅 advisory）。
- **B 索引 v1**：repo42.cursor.sh 逐文件明文全文+`unencrypted_relative_workspace_path`——路径加密是摆设（privacy off 时 key 也发服务端）。
- **C 调试 zip→S3**：renderer OOM 自动 heap snapshot+24h 日志+**整个 userData/User 目录（state.vscdb token）**+7d transcripts→presigned PUT；privacyMode 时 URL 空→不上传。
- **D FileSync**：每击键 `FSSyncFile`/`FSUploadFile` 文件正文；`isFileSyncEnabled` **不查 privacyMode**（仅 privateInference 锁）；厂商自家 KLc egress map（编译进从不渲染）写明 "Every keystroke ships the file body…"。
- **consent**：onboarding "Recommended" 卡 24h 后 `hasEnoughTimeElapsedSinceOnboarding` 静默升 enum4→自动接通上传；Settings "All data is stored locally" 与事实矛盾。
- **引入**：字面量 **2.5.17（2026-02-17，零调用者 proto）→ 接线 2.6.11（2026-03-03）**；Lane C ≥1.0.1。

### Kiro 1.1.14（AWS）— [kiro.md](kiro.md)

- **管线**：`ActivityLogPublisher` 每 3s byte-cursor tail `messages.jsonl`+`sub-executions/*.jsonl` → `POST runtime.{us-east-1|us-west-2}.kiro.dev/agents/activity`（raw `https.request`，Bearer，≤25 条/批，dispose 时 finalFlush；extension.js:16669-16693）。
- **载荷**：完整转录——user 文本+base64 图片/文档、tool_call `args`（路径/命令）、**tool_result `content`=文件内容/终端输出**、`_meta.kiro.checkpoint.fileChanges{original,modified}` 第二文件内容通道、steering 文档体。
- **门槛**：唯一门 `region∈{us-east-1,us-west-2}`；会话 create/resume 无条件 startTimer；**无任何用户开关**；`contentCollection` opt-out 头只打在 Smithy 客户端，发布器裸 `https.request` 不携带——**opt-out 不停转录上传**。
- **宣称对照**："enterprise users automatically opted out" / "Pro users 不收遥测"——门链无 tier/IdP 检查，直接矛盾；遥测枚举文档遗漏最大采集。
- **附带**：infra-safety eval 把 fs_write 全文+≤128KB 上下文+**全部 AWS_* 环境变量**+CDK 模板 ≤4MB 送 `/mcp/stream`；vendored CodeWhisperer 工作区上传 SDK（CreateUploadUrl/CreateWorkspace+S3 multipart ~40 命令）**零调用点休眠**。
- **引入**：**0.12.155（2026-05-06）**；三段放宽（sandbox→+kiro-ide→1.0.116 去 env/client 检查默认开）。

### Qoder 1.31.0（阿里）— [qoder.md](qoder.md)

- **A 缺漏文件上传**：worktree 创建/commit 监控/RAG V2 → 服务端 merkle 比对（`bfDiscover`→`notFoundFileIds`）→ `files.zip`（≤9MiB 批）multipart `PUT/POST center.qoder.sh/api/v2/service/codebase/file/upload`（**明文 zip**，BigModel 签名头）→ `updateMerkleNodes` 注册。
- **门槛**：remote `upload.missing.files.enabled` + 登录 + autoIndex（**默认开**，≤10k 文件）；`.qoderignore`/`.gitignore` 真实生效——披露失真的 opt-out 而非 placebo。
- **B back_flow**：`doAgentBackFlow` 挂每次 doAsk 链尾 → `POST /api/v1/tracking` ~20 个 `*_gzip_b64` 字段（`file_content`/`prompt_user_input`/`edit_sequence`/`mtree` 整树/`git_remote_urls`/`memory`/`rules`/`mcp_tools`）；**零 UI、仅服务端 flag**；vendored SLS SDK 死代码（出口是厂商 tracking 非 SLS，已修正）。
- **consent**：`data_policy_not_agree` 只置 `X-Stilla=2` 标记——**上传照走**；"Automatic Indexing" 文案只说 "improves contextual understanding"；Privacy Mode 只管 back_flow 不管索引上传。
- **范围**：secrets deny-glob **漏 `.npmrc`**——registry token 随包上行；`ContainsSensitiveDataUs` 录名块=零引用诱饵，活路径是远控 `scanfile.regexlist` 注入分发。
- **附带**：`batchBuildCommitMsg` 送 raw commit diff；`initCodebase` 送 git remoteUrl+整树 simhash；诊断 zip 含 RSA-2048 密封会话日志（厂商独钥可读）且 `/issue/oss/policy` 无鉴权。
- **引入**：**0.3.0（2026-01-19）**；上传基础设施最老可得构建即有。

### Trae intl 3.5.91（字节）— [trae-intl.md](trae-intl.md)

- **A aLog 设备日志**：`POST /icube/api/v1/device/log/check` 每 10min（首启 30s、未登录也跑）→ `packLogs()` tar.gz → `/icube/api/v1/report/token` imagex STS → 直传 `imagexsg-normal.trae.ai` → `/device/log/callback`——ZCode 五段式复刻；唯一门 `storeRegion!==USTTP`（国际版恒真=无门）；frontier WSS `DEVICE_LOG` push **绕过轮询 action 过滤**直触采集。
- **竞品收割**：服务端任务打 `packCodexSessions:true` → 同 tar 追加 `~/.codex/sessions`（近 3 天）、`~/.claude/projects/*`（mtime≤3d，**完整 Claude Code 转录含 prompt/代码/粘贴 secret**）、`~/.cursor` agent-transcripts。
- **B ToB lane**：SAAS scope 每小时 `log_collection/poll` → **先伪造反馈单** `POST /tob-admin/report/create`（issue_type "其他"+"[ToB Auto Collect]"+用户邮箱）→ presigned PUT → callback——服务端视角像用户主动反馈。
- **原生孪生**：`liblogifier_retrieval.so`（dlopen，`use_logifier` 门控休眠）任务模型含服务端 `path_patterns`/`filters`+**`RunCommand` 命令执行**——能力超 JS 管线。
- **附带**：`uploadFile` 任意路径→imagex 原语零校验；`inspector` attach 任意 pid 全堆快照；AutoProfiler 服务端可调阈值强制 heap dump→imagex；SSH-remote 日志回拉。BrowserDataSync cookies AES-256-GCM key 服务端下发（厂商可解）——已修正为 opt-in 默认关+本地触发。
- **宣称对照**："codebase files always remain on your local device"/"Zero Retention"直接矛盾；privacy-mode 只门 analytics SDK；`product.json` telemetry schema 被剥、privacyStatementUrl=`example.com`。
- **引入**：**≤1.0.5431（2025-01-20）最老可得即阳性**，不存在 absent 版本；四阶段演化（登录门移除→区域门→SSH 回拉/.so→ToB 伪装单+竞品收割）。

### MiniMax Desktop 3.0.73 — [minimax-desktop.md](minimax-desktop.md)

- **eval capture（头条）**：`resolveDesktopEvalCaptureConfig` 对任何 packaged build 返 endpoint、`entry.js:244-258` 硬编码 `enabled:true`、`canReport()` 仅查 `accessToken`——**登录即开，无开关无 UI 无远端 flag**。
    - `POST /mavis/api/v1/eval/snapshot/report`：**每次物理 LLM 调用前**发 `{system_prompt, messages 全数组, tools[{name,schema}], thinking_level}` ≤16MB——模型所见完整请求体（含工具结果=文件原文）。
    - `POST /mavis/api/v1/eval/steps/report`：每轮 steps[] `{user msg, args_json, result_json, usage}`+每会话一次 meta_info{工作区目录树 ≤2000、PATH 可执行清单 ≤2000、git、config_files}+沙箱策略/goal 决策事件流。
- **consent**："Help improve/数据用于优化体验"=**placebo**——`data_contribution` 字段全 bundle 零行为消费（仅渲染开关位置，非布尔默认按 true 显示）；eval lanes 无任何对应设置键。
- **加密**：无客户端加密；唯一加密的 error-report key=`HKDF(accessToken)` 且同一 token 作 Bearer 同请求上送——厂商可解，代码注释自述。
- **附带**：workspace-indexing zip→OSS 为 opt-in 披露失真（~25 种 secret denylist 真实，卫生好于多数目标）；`/matrix/api/v1/metrics/batch` **无 Authorization**；file-upload IPC 零路径校验（注释委托服务端）；反馈 zip 收整 session 含 `messages.jsonl` 全文（日志路反而排除）。
- **引入**：**3.0.58（2026-08-04）**；宿主 `@mavis/local-runtime` 3.0.53 已在（宿主先行）；gate 自引入零演化。

## 四、横向矩阵

| 目标 | 载荷级别 | 触发 | 真实门槛 | consent 面 | 引入版本 | 最恶点 |
| --- | --- | --- | --- | --- | --- | --- |
| Copilot Chat | 工作区文件全文 | 每次语义搜索 | onExp 隐藏设置（服务端热翻） | 死代码 modal | 0.48.1 | `.env`/`id_rsa`/`credentials.json` 过 wasm 过滤 |
| CodeBuddy CLI | 全工作区+跨产品日志 | 服务端任务队列轮询 | 服务端推送 config，无本地默认 | 零 | 1.25.0-nightly 2025-11-07 | 先远程调日志级再收割；`recall` 绕过 DISABLE_TELEMETRY |
| CodeBuddy IDE | 打开文件全文+diff/工作区字节 | prompt/失焦/定时/登录自动 | 3×远端 flag+1×远端 config | 零数据键；状态栏谎称 searching | codebase ≤0.1.8 / 全签名 4.3.3 | `.npmrc/.pem/.key` 直传 COS 无密钥名黑名单 |
| Cursor | packfile 文件字节+git 史/逐键正文 | 每 agent 请求/每击键/OOM | flag+privacy enum4+fail-open policy | 24h 静默升级+文案矛盾 | 2.6.11（schema 2.5.17） | `~/.claude`/`~/.codex` 进 packfile；FileSync 无 privacy 检查 |
| Kiro | 完整转录（含文件内容） | 3s 定时，会话即开 | 仅 region 白名单 | 零；opt-out 头不覆盖 | 0.12.155 | 常开无门；infra eval 外发全部 AWS_* env |
| Qoder | 缺漏文件 zip+原文遥测 | worktree/commit/RAG/每轮 ask | 远端 flag+autoIndex 默认开+登录 | index 失真 opt-out；back_flow 零 UI | 0.3.0 | back_flow 原文上行全披露面零提及；`.npmrc` 漏网 |
| Trae intl | 全量日志+竞品转录 tar.gz | 10min 轮询/WSS push/服务端任务 | region≠USTTP（恒真）+任务标志 | 零；幻影 telemetry 键 | ≤1.0.5431 | `packCodexSessions` 收三家竞品转录；伪造反馈单；.so RunCommand |
| MiniMax | 完整 LLM 上下文+文件原文 | 每次物理 LLM 调用 | packaged+登录（`enabled:true` 硬编码） | placebo 开关 | 3.0.58 | 零门零旗标的 always-on；错误上报"加密"key 随 Bearer 同送 |

## 五、模式与趋势

1. **三段式凭证管线成事实标准**：`presign/credential 端点 → 直传对象存储 → register/callback`——CodeBuddy IDE/CLI（COS STS）、Trae（ImageX STS）、Cursor（presigned S3）、Qoder/MiniMax（OSS presign）、Copilot CLI（`/v1/files`）。客户端从不持长期云凭证，凭证由自家网关短时签发——**服务端是唯一硬门**。
2. **门槛全面服务端化**：8 家中 6 家的生效门是纯远端旋钮（onExp 实验变量 / productFeatures / 服务端推送 config / 任务队列 / remote flag）；本地有"默认值"的仅 MiniMax（`enabled:true`）与 Kiro/Trae（区域检查）——同样无用户控制。**引入时无一携带 consent 面**（timeline.md）。
3. **schema/宿主先行，接线后至**：Cursor 先发零调用者 proto 描述符（2.5.17）隔两周接线（2.6.11）；MiniMax 先发宿主模块（3.0.53）再注入 eval capture（3.0.58）；Kiro vendored 完整工作区上传 SDK 休眠待命；CodeBuddy CLI `skill-upload-policy` 全实现零调用；Trae 原生 .so 休眠重炮。**"当前不外发"的预置管线是常态**。
4. **consent 面是剧院**：placebo 开关（MiniMax `data_contribution` 零行为消费）、死代码（Copilot `promptForExpandedLocalIndexing`）、幻影键（Trae 未注册 schema 的 `telemetry.feedback.enabled`）、静默升级（Cursor onboarding 24h→enum4）、标记不拦截（Qoder `X-Stilla=2`）、文案欺诈（"searching"代替 uploading、"index"遮盖上传、伪造反馈单 `[ToB Auto Collect]`）。
5. **越界收割竞品 agent 数据**：Trae `packCodexSessions` 打三家（`~/.codex`/`~/.claude`/`~/.cursor`）转录；Cursor dot-dir allowlist 收 `~/.claude`/`~/.codex`/`~/.agents` 进 packfile；CodeBuddy CLI 扫 `~/.workbuddy` 等他产品日志——**用户家目录的 agent 资产已是采集目标**。
6. **凭据级载荷**：活 token 进上下文/沙箱（CodeBuddy IDE `connect_cloud_service`、Copilot CLI `CLAUDE_CODE_OAUTH_TOKEN` env）、cookie jar 用服务端密钥"加密"（Trae BrowserDataSync）、`state.vscdb` token 随 User 目录进 zip（Cursor OOM）、全部 `AWS_*` env 外发（Kiro infra eval）、加密 key=HKDF(Bearer token)（MiniMax）——**从"内容收集"滑向"会话凭据收集"**。
7. **fail-open 是默认姿态**：Cursor `CheckCodebaseTelemetryPolicy` RPC 错→放行；Qoder `data_policy_not_agree`→照传；CodeBuddy CLI `allowedEnvironments` 校验失败仍武装；策略"检查"不构成拦截。
8. **门槛演化方向不一但 consent 恒为零**：Kiro 三段放宽至默认开、Trae 移除登录门；CodeBuddy CLI 反向收紧（truthy 对象→显式 enabled+环境白名单+HMAC 回报）；Cursor 后期加子 flag 与策略 RPC；MiniMax gate 自引入字节级零演化——门槛可松可紧，用户侧 consent 面从未出现。

## 六、边界与免责

- **静态分析能证**：调用链完整可达、载荷字段级内容、门控表达式、consent 面真假、版本引入点。**不能证**：服务端 flag 当前取值、实际触发频率、厂商是否实收/留存/二次使用、TLS 对端行为。
- **"存在管线"≠"某用户已被收集"**：多数通道生效于服务端翻转之后；但翻转权完全在厂商单侧，且全部无用户可感知面——这正是判定为"隐藏"的依据。
- **已被复核推翻的论断不计入**：CodeBuddy CLI `extraUploadPathsProvider`（DI 空壳）、Qoder back_flow→SLS（实为 `/api/v1/tracking`）、Trae BrowserDataSync"远程命令触发"（实为 opt-in 本地触发）、MiniMax drive files 模型可调（死代码）、Copilot "UI 隐藏"（实为不显眼可搜索）。
- **版本覆盖缺口**：Copilot 0.45.1→0.48.1 间 7 个预发布全 404（真首发或为不可获取的 0.46/0.47）；CodeBuddy CLI 708 版仅抽测 29；Cursor Lane C 边界 (0.44.9,1.0.1] 内 idx 41–79 未探测；Trae/CodeBuddy IDE/Qoder 最老可得即阳性（早于可获取历史）；win32 Inno 构建部分不可解。详见 [timeline.md](timeline.md) "覆盖缺口"。
- 审计日期 2026-09-24/25；厂商发新版后结论需以同样方法复核。

## 七、复现入口

- **总流水线与逐目标获取/解包命令、证据引用约定**：[reproduce.md](reproduce.md)（含安装包 sha256 指纹表）
- **8 目标版本考古汇总与缺口**：[timeline.md](timeline.md)
- **46 目标判定矩阵与方法口径**：[README.md](README.md)
- **逐目标判定页**：[copilot-chat.md](copilot-chat.md) · [codebuddy-cli.md](codebuddy-cli.md) · [codebuddy-ide.md](codebuddy-ide.md) · [cursor.md](cursor.md) · [kiro.md](kiro.md) · [qoder.md](qoder.md) · [trae-intl.md](trae-intl.md) · [minimax-desktop.md](minimax-desktop.md)
- **原始证据**：`~/src/agent-teardown/evidence/<tid>/journal-digest.json`（acq/scan/vfy/deep 分层）、`evidence/_global/installer-hashes.json`、history bisect 工件 `~/src/agent-teardown/history/<tid>/`
