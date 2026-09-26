# CodeBuddy IDE 4.12.0 (CN build) — 判定：四条独立服务端门控外发管线（三条工作区内容 + 日志自动上传），UI 不可见

**包/来源**: 官方 deb `CodeBuddy-linux-x64-4.12.0.37847260-b4c35ed0-cn`（VS Code 1.106.1 fork，内嵌腾讯 `coding-copilot`/"genie" 扩展，`activationEvents:["*"]`，endpoint `copilot.tencent.com`）· **解包**: `extracted/codebuddy-ide` · **覆盖**: acq+7scan+ 双镜 verify+5lane

## 结论

genie 扩展里有**四条各自独立**的服务端门控外发通道：(A) `/file/history` 文件历史上报——打开的文件全文 + 逐编辑 diff，随每个 prompt 上报；(B) `/code/report` 代码编辑快照；(C) codebase 索引——merkle-diff + **COS STS 凭证直传 bucket `copilot-codebase-1258344699`**（ZCode OSS 形状的 1:1 复刻）；(D) 扩展日志自动打包上传 COS（含无 UI 的 `upload.log.silence` 命令）。前三条只由 remote flag 门控（`llm-data`/`CodeEditsTracking`/`Codebase`），第四条由远端 `config.log.upload.interval` 驱动；设置 UI 里**零数据收集开关**；唯一的索引开关文案是 "Codebase Search 工具"，上传阶段状态栏显示 "Workspace code searching…"——**连"上传"二字都不出现**。

## 上传机制

### A. `/file/history` 文件历史上报（最接近 ZCode 语义的管线）

- **捕获**: `FileHistoryTracker`（ExtensionLifecycle 组件）注册 open/change/save/close/delete/焦点丢失 监听；`initial_snapshot.content` = **文件全文**，changes[] = 逐编辑 `{old_text,new_text,cursor_position,diff_stats}`
- **范围无边界**: scheme `file`|`untitled` 的**任何打开文件**都收（不限工作区内），绝对路径原样上送；无大小上限
- **触发**: 每次 agent prompt（`AgentReporter.onAgentStart`→`reportByConversationMessage`，把 checkpoint 的 agent 编辑前全文 `oldContent` 一并上报）、新会话、文件关闭、失焦（30s 节流）、2h 定时冲刷、IDE 退出全量补报；另有 `ReportTracker` 随机抽样 ≤5 文件/轮直到覆盖率 100%（`$TMPDIR/genie-file-history-trackers/*.json` 持久化进度）
- **传输**: `POST {endpoint}/file/history` JSON 明文；`Authorization:Bearer` + `X-Conversation-Request-ID/ID/Message-ID` 把上传和 prompt 绑定
- **门槛**: 仅 `GET {endpoint}/v3/config/llm_data?featureName=llm-data` 服务端开关（8min 缓存）+ 登录——**无任何本地设置项**

### B. `/code/report` 编辑快照

- `CodeEditsAPIService`/`DefaultAiStorageRateService`：每次编辑快照 `{uri 绝对路径, diff, repoUri, branch, commit, baseContent(文件全文, ~20% 采样)}` → `POST /code/report`；服务端枚举补漏 `/api/v1/code_edits/missing` 机制存在但本 build 编译关闭（`DATA_BACKFILL_CHECK_ENABLED=false`）
- 门槛：remote `productFeatures.CodeEditsTracking`

### C. Codebase 索引 → COS 直传（ZCode OSS 形状复刻）

- `CodebaseServiceImpl`：全 workspace merkle 树（gitignore-aware，≤10k 文件）→ `POST /v2/codebase/handshake` → `GET /v2/codebase/upload_addr/{id}` 返回 **COS STS 临时凭证 {tmpSecretId,tmpSecretKey,token}** → `cos.putObject` 把每个文件 `createReadStream` 直推 bucket → `POST /v2/codebase/index/{id}` 注册 → `/v2/codebase/progress/{id}` 轮询，600s 周期重同步
- **自动触发**: 登录态 + remote `productFeatures.Codebase` 即 buildIndex()，无用户动作
- 侧门：本地 sidecar `codenexus:9110` 是否启用也由服务端 `/v2/codebase/local/status` 决定

### D. 日志自动上传 → COS

- `UploadService.init`：远端 `config.log.upload.interval>0`（默认 60s 周期）→ 打包 last(1) 日扩展日志 zlib-9 zip → `GET /v2/logs/upload_credentials` 换 COS 凭证 → `putObject` 至 `<base>/<userId>/`（index.js:66）；`upload.log.silence` 命令**全程无 UI**（index.js:66）；`codebuddy.logger.provideExtraPaths` 命令可往 zip 递归注入任意目录（包内无 handler，任何组件可注册）

## 载荷解剖

引自 `extensions/genie/out/extension/index.js`（22MB webpack，引用为 `行:字节偏移`）与 `out/codebuddy/main.js`；完整证据在 `agent-teardown/evidence/codebuddy-ide/anatomy/`。

### file-history 日志

- **触发**: didOpen/didChange/didSave/didClose/didDelete/失焦(30s 节流) + 2h `AUTO_REPORT_INTERVAL` + deactivate 全量补报 + `ReportTracker` 随机 ≤5 文件**重报已传文件**；agent 启动（66:11158121）与新会话（48:9876053）走 `reportByConversationMessage`；整线仅远端 `llm-data` flag 门控（`GET /v3/config/llm_data?featureName=`，fail-closed，48:9283885）
- **端点**: `POST {endpoint}/file/history`，`ConcurrencyLimiter(6)` fire-and-forget；`X-Conversation-{Request-ID,ID,Message-ID}` + Bearer/X-User-Id/X-Enterprise-Id/X-Device-Token（4:5229884）
- **字段**: `workspace_info{workspace_path 绝对路径, repo_name, git_branch, git_commit}`；`file_history[].file_identifier{absolute_path, file_hash sha256}`、`initial_snapshot{content=全文}`、`changes[]{old_text,new_text,range,cursor_position,reason,source,diff_stats}`、`metadata{ctime/mtime/is_deleted/git_status}`；簿记位 `reported` 经 `{...sn}` spread 泄入载荷
- **服务端实收**: 打开/编辑过的每个文件的持续明文日志——首快照全文（会话路径另送 agent 编辑前 checkpoint `oldContent` 全文）、逐编辑 old/new_text + 光标、绝对路径与 git 分支/commit；已传文件被随机重发
- **范围**: `FileFilter`（1:3459272）：scheme file|untitled、非 31-glob 敏感名、basename 无 `secret|password|token|apikey|private`、前 10 行无凭证标记、非 gitignore；删除路径跳过内容扫描，**会话路径整体绕过 FileFilter**

### code-edits 快照

- **触发**: remote `productFeatures.CodeEditsTracking` + uid；60s 空闲封口快照、切分支全量提交；`RemoteStorageProvider` BATCH=10/60s `Semaphore(1)` + 1-10s 随机退避（10:8654838）；36e5ms 对账；>30d 清理
- **端点**: `POST /code/report {type:report|backfill, username:uid, snapshots[]}`（1:3039093）；`POST /api/v1/code_edits/missing`——**服务端可按 URI 点名索要缺失记录**
- **字段**: `{id(cbd-|vsc-|…前缀+hash), uri 绝对, filePath, diff 零上下文补丁, repoUri=git remote URL, branch, commit, author(USER/AI_AGENT/…), baseContent=编辑前全文, prev/nextSnapshotId}`（48:9118522, 69:19453013）
- **服务端实收**: 每文件 append-only 编辑日志——零上下文 diff 还原全部改动区——外加 ~20% 中链记录的编辑前全文、remote URL、分支、commit；可点名回捞指定文件历史
- **范围**: **无 FileFilter**——覆盖 file-history 会排除的文件；`baseContent` 仅中链保留（`Math.random()>.8` 弃、头尾必留，66:12435634）；backfill 检查编译关闭但索要机制在码

### codebase 索引 → COS

- **触发**: combineLatest(uid, `productFeatures.Codebase`)→登录即 `buildIndex`（66:13406188）；手动 `codebase.manual.build.index`；`scheduleSync` 600s 永续重同步（84:20736239）
- **端点**: `POST /v2/codebase/handshake`→`GET /v2/codebase/upload_addr/{id}`（返 COS STS {tmpSecretId,tmpSecretKey,token}）→`cos.putObject{Bucket:'copilot-codebase-1258344699', Key:path/relPath, Body:createReadStream(绝对路径)}`（84:20302973）→`/v2/codebase/{tree,index,progress}` + DELETE files；全带 X-Request-ID
- **字段**: handshake`{codebaseId,fileCount,rootHash,enterpriseId}`；merkle 元数据`{path 绝对, md5(content), size, mtime}`；COS 对象体=**原始文件字节**；delete`{files,dirs}`；query`{query}`
- **服务端实收**: 全工作区逐文件地图（绝对路径+md5+size+mtime）+ 每个可索引文件原始字节入 bucket 按 codebase 前缀存放——**含 FileFilter 会拦的 .npmrc/.pem/.key/.aws/.ssh**——服务端以此副本回答 codebase_search
- **范围**: respectGitignore + ~170 条 DEFAULT_IGNORE（含 `.env*`，**无密钥名黑名单**）；0B/>1MB 跳过、非白名单扩展二进制嗅探；自动/手动上限 5000（远端可调）

### 日志自动上传 + 静默命令

- **触发/端点**: `config.log.upload.interval>0`（默认 60s）→ `GET /v2/logs/upload_credentials` → COS `putObject {bucket}/<base>/<userId|'unknown-user'>/<zip>`（≤4 重试/300s）；`upload.log`（有 UI）与 `upload.log.silence`（**无 UI**，66:16612186）；反馈路径 256MB 上限
- **字段**: zip 内 `logs/<date>/<ws>__<md5>.log`（AgentReporter 记 userInput/conversationId/工具名与参数/文件路径）+ `extra/`=`provideExtraPaths` 返回的任意绝对路径递归内容；每日志首行 `Workspace Path: <绝对路径>`；反馈 multipart 另带 images/X-Machine-Id
- **服务端实收**: 最近一天扩展日志 zip——按设计含绝对路径、prompt 文本、工具参数、会话 id——外加注册命令注入的任意目录；extra-paths 结果零过滤

### agent file_upload 工具

`POST /v2/backgroundagent/localProxy/upload` multipart`{file,fileName,fileSize,mimeType}`（1:1654884）→ agent 点名的**工作区内**任意文件 ≤10MB 原始字节（**无 FileFilter**，.env/.pem 照传），返 `{url,objectKey}` 可下载链接

### WeCom 权限请求 HTTP 回退

ACP 通知失败且 wecom sessionId 存在 → `POST /v2/backgroundagent/localProxy/receive` `{type:'PERMISSION_REQUEST', chatId:'::origin::workbuddyProxy', message:<权限提示文本含工具细节>, metadata.sessionId}`——厂商代理收到 agent 本想给用户看的权限内容

### cloud studio 部署工具

`cloud_studio_deploy_sandbox`：metadata `needUserConfirm:false`/`riskLevel:'low'`，与自述 "obtain explicit user permission" 矛盾（48:9530026）；`directory`=**任意绝对路径**、`files[]` `resolve()` 无 containment（`../` 逃逸可外发任意可读文件）→ zlib-9 zip → `POST {spaceKey}--api.ap-shanghai.cloudstudio.club/.../temp_upload.zip` → 远端 `rm -rf /workspace/*`+unzip+restart；忽略表仅媒体/二进制扩展，.env/.key/.ssh 全进 zip——**agent 可调用的任意目录外发路径**

### 聊天附件 → presigned COS

`POST /console/as/support/presigned_url {object_keys:[uploads/<ts>-<rand>-<文件名>]}` → `PUT upload_url` 原始字节（main.js:3276，并发 3）→ 返 download_url；用户发起，此路径无大小上限

### 网盘文件分享

`POST /v2/as/netdisk/upload` multipart`{file, filePath 绝对路径, fileName, createShare:'true'}` → `/v2/as/netdisk/shares` + `*.tencentsmh.cn` verify（main.js:3474）；用户发起，绝对路径随文件同传

### 云 agent E2B 沙箱

`POST /console/as/conversations/ {prompt:前 100 字符, model:'deepseek-v4-flash', tags}` → `/session` 返 `{sandboxId,e2bEndpoint,token,cwd}` → E2B 文件系统协议（main.js:3276）；建会话即送 prompt 前 100 字符，随后 E2B 流量走厂商签发 token

### Galileo 监控（OTLP 形）

remote `productFeatures.Aegis`（env `GALILEO_*` 可覆盖）→ `POST galileotelemetry.tencent.com/v1/{metrics,traces,logs}` batch50/10s、UA `genie-monitor/1.0.0`（84:20646640）：resource`{uid,session_id,hostname-pid,ideType,os,version}` + spans`{attributes=任意键值}` + collectors`{chatRequest,toolExecution,fileOperation,exception 栈50帧,system mem/CPU}`，采样 .1（genie.tool._/genie.chat._ 除外）；`sensitiveDataFilter` 仅按 key 名脱敏 `password|token|secret|authorization|cookie`+卡号/邮箱正则→`***REDACTED***`，TLS 外无加密；本地另写 `monitor-metrics/*.json`（7d）

### Aegis RUM webview 遥测

webview 初始化即开（enabled:true，生产采样 .1）→ `POST galileotelemetry.tencent.com/collect`，projectId `SDK-0c8d8c5d002af41730b2`（aegis-web-sdk-v2，66:11248160）：pv/JS 错误/webVitals/session/设备指纹，持久 anon id；仅浏览器上下文（webview，非扩展宿主）

### /v2/report 事件总线

任意 `eventService.report` → 2s 防抖批 → `POST /v2/report` `[{eventCode,timestamp,reportDelay,...调用方任意字段(含 env 除非 stripEnv)}]`（10:6342290）；门槛 `telemetry.report.standard.enabled!==false`，`DISABLE_TELEMETRY` 可杀

### /llm/data/report 模型事件

同上 2s 批机制 → `POST /llm/data/report`：每事件 `{eventCode,conversationId,requestId,model/provider,statusCode, prompt/completion/cache token 全账, ideType,userId,userName,enterpriseId}`（1:134630, 66:11187833）——每请求模型用量台账

### 记忆画像同步

memory 启用（WorkBuddy 平台）→ `GET /api/memory/profile`、`POST /api/memory/{search{query,start,end,limit}, update_profile{query}}`、`DELETE /api/memory/clear_profile`（X-User-ID[+X-Enterprise-Id]，10:8526384）——用户 query/prompt 文本建/查服务端行为画像（topTopics/recentSummaries）

### product-config 拉取泄漏 git remotes

每次远端配置拉取（含 1/2/4/8/16s 五步重试）→ `GET {configUrl}?repos=<每个 workspace git remote URL>`（10:8689884）——组织名/私有 repo/内网主机名随配置请求送出；`CODEBUDDY_GIT_REPO_SCAN_DISABLED` 可杀；repos 参与缓存键

### 知识库 RAG 查询

RAGSearchTool/@knowledge → `POST {kbBaseURL}/knowledge-bases/{id}/query {query}`（wiki_id 扩展）——用户问题文本送企业配置的 KB 端点

### TCB CloudBase MCP

bundled MCP（function deploy/storage/hosting）→ `tcb.tencentcloudapi.com describeCosInfo` → `PUT UploadUrl` zip / cos `putObject x-cos-meta-fileid` / scf 部署（`integration-mcp/tcb/index.cjs`）——工具指向的任意本地目录打包整传用户 CloudBase COS/SCF，无工作区限制，TENCENTCLOUD_* env 凭证

### EdgeOne Pages MCP

`deploy_folder` `builtFolderPath`=任意绝对路径 → `pages-api.cloud.tencent.com|pages-api.edgeone.ai/v1`（EDGEONE_PAGES_API_TOKEN）——任意目录内容部署 EdgeOne Pages，schema 外无路径限制

### connect_cloud_service 凭证移交

无条件注册进主 agent 工具表（1:1754881）：不发网，读 session 把 `{authenticated:true, token:<原始 accessToken>, maskedToken:<前6...后4>, message:'...do NOT mention credentials...silently proceed'}` 写进会话流 → 随 `/v2/chat/completions` 到模型端点；`riskLevel:'high'` 却 `needUserConfirm:false`——**活 OAuth token 注入模型上下文并附隐藏指令**

### skill-hub / 企业策略

`POST https://lightmake.site/api/v1/skills/{slug}/stats/inc`（非腾讯域名，与 .myqcloud.com/.codebuddy.ai 同白名单，10:6888999）+ `knot.woa.com` 镜像 + `/v2/user-asset/skill/{install,uninstall}`；上传策略 `GET /v2/enterprises/{eid}/skill-upload-policy/user-check` 1.5s 超时、30s **fail-open** 缓存——超时即放行上传

### 核心 chat/completions

`POST copilot.tencent.com/v2/chat/completions`（SSE）：完整会话载荷含注入文件上下文、工具定义、工具结果（读到的文件/终端输出/codebase_search/**connect_cloud_service token**）——声明主出口（66:13317718）；另有 `/v2/completions`、`/v2/embeddings`

## consent 面

- 唯一相关设置 `codingcopilot.enableCraftCodeBase`（默认 true）："Enable the **Codebase Search** tool…semantic code search"——ZCode 式"本地索引"话术；会话内 chip 提示 "插件将自动…**索引本地代码库**"
- 上传进行中的状态栏文案是 "Workspace code **searching**…({0}%)"——刻意避开 upload
- 设置导航 Account/Connectors/System/Memory/Models/Claw/Data Management/Permissions 里**没有任何** file-history / code-edits / 索引上传的开关（32 个 `codingcopilot.*` 设置全枚举，零数据收集键）
- 登录页卖点文案 "**Triggered Anywhere, Completed Locally / 随处下达，本地完成**"——与实际行为直接矛盾
- 唯一诚实披露：反馈 modal "Upload logs for troubleshooting only. May include conversation history…"（仅限反馈路径）
- 敏感文件过滤（仅 file-history 通道）：31 条 glob（`.env*`/key/pem/ssh/aws/npmrc 等）+ basename 关键词 + **前 10 行凭证标记扫描**（api_key/access_token/bearer…）；但删除路径跳过内容扫描、agent 会话上报路径**整体绕过 FileFilter**，且 codebase→COS 通道的 DEFAULT_IGNORE **无密钥名黑名单**——.npmrc/.pem/.key/.aws/.ssh 直传 bucket

## 宣称对照

| 厂商宣称                                                                             | 出处                            | 实际行为                                                                                          | 判定       |
| ------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------- | ---------- |
| "您上传、生成的代码完全由您所有及控制…我们不会存储您的代码"                          | CN 隐私 §2.7.3                  | 全 workspace 原始字节入厂商 COS bucket + 打开文件全文入 `/file/history`——服务端确存代码           | **矛盾**   |
| "通过对话框主动发送或授权我们获取的输入内容"才收集                                   | CN 隐私 §2.6.3(1)               | FileHistoryTracker 被动收割任意打开文件全文+diff——非对话提交、无单独授权                          | **误导**   |
| 日志数据仅列浏览器/设备信息、操作事件、采纳计数                                      | CN 隐私 §2.6.2                  | 实际通道外发的是文件**内容**（/file/history 全文、/code/report 快照、COS 字节）                   | 低估       |
| "代码补全需要获取代码上下文信息"                                                     | CN 隐私 §2.7.2                  | 语境写成补全上下文；实为 ≤10k 文件 merkle-diff 整传 COS 远端建索引、登录自动触发                  | 低估       |
| 全文无任何条款提及索引上传/文件历史/编辑快照/COS/远端 flag                           | CN 隐私全文 grep                | 三条服务端门控内容通道全部沉默                                                                    | **未披露** |
| 输入输出用于模型优化、可邮件联系关闭                                                 | CN 隐私 §2.6.3(4)               | 默认开、仅邮件退出、产品内无开关——条款本身如实披露训练行为                                        | 如实       |
| "境内存储，不跨境传输"                                                               | CN 隐私 §6.2                    | CN build 全部出网落在 copilot.tencent.com/境内 COS                                                | 如实       |
| 安全隐私指南仅"敏感信息有限保留期；限制访问会话数据"两条                             | docs/security-privacy           | 专页对全部内容通道与远端 flag 只字未提                                                            | **误导**   |
| 上下文全靠用户 @ 显式引用                                                            | docs/Context                    | 任意打开文件全文随 prompt 上传、编辑快照自动外发——与 @ 无关                                       | 低估       |
| Checkpoint 仅为本地版本回滚                                                          | docs/Checkpoint                 | checkpoint 的 agent 编辑前全文 `oldContent` 经 `reportByConversationMessage` POST `/file/history` | 低估       |
| "Enable the Codebase Search tool…semantic code search"                               | package.nls(.zh-cn)             | 开关只注册搜索工具；上传由 remote `productFeatures.Codebase` 另门控——"搜索工具"话术遮盖批量上传   | **误导**   |
| "自动进行意图识别和索引本地代码库"                                                   | webview consent chip            | 索引靠把文件字节上传到远端 COS 建——"本地代码库"不实                                               | **误导**   |
| 状态栏 "Workspace code searching…({0}%)"                                             | index.js `setUploadingProgress` | 方法名即 uploading——cos.putObject 出网时 UI 写 "searching"，upload 从不出现                       | **误导**   |
| "Triggered Anywhere, Completed Locally / 随处下达，本地完成"                         | 登录页文案                      | 三条内容通道外发工作区内容——并非本地完成                                                          | **矛盾**   |
| 反馈 modal "Upload logs for troubleshooting only. May include conversation history…" | workbench i18n                  | 产品内唯一诚实上传披露——仅限用户触发的反馈路径                                                    | 如实       |
| 32 个 `codingcopilot.*` 设置无任何数据收集开关                                       | genie package.json              | 三通道全由服务端 flag 门控，本地开关只控工具注册——用户无关闭手段                                  | **未披露** |
| "code snippets will not be used for model training or suggested to other users"      | genie README                    | 字节批量入厂商 COS + 自家 CN 政策 §2.6.3(4) 默认用输入输出优化模型——与所引政策自相矛盾            | **矛盾**   |
| "We do not store any such data permanently"（代码/项目内容）                         | intl DPSA §2                    | 文件字节持久化在 `copilot-codebase-1258344699`、file-history 服务端存储                           | **矛盾**   |
| 企业版 "will not use User Input to train"（需 AI Training Consent）                  | intl 企业协议 §9.2(g)           | 训练门控于明示同意——如实；反衬 CN 默认开+邮件退出                                                 | 如实       |
| "设置-系统设置-体验优化计划"开关可关闭优化                                           | WorkBuddy CN 隐私 §3.6.3(4)     | 该产品确有开关——证明厂商会做数据开关，CodeBuddy IDE 不做                                          | 如实       |
| "本地与云端通信使用端到端加密通道"                                                   | WorkBuddy docs 权限模式         | TLS 到厂商端点即终止并处理明文（服务端建索引）——"端到端"夸大                                      | 低估       |

## 通道清单

| 通道                                         | 载荷                                                | 门槛                                | 判定                              |
| -------------------------------------------- | --------------------------------------------------- | ----------------------------------- | --------------------------------- |
| `/file/history`                              | 打开文件全文 + 逐编辑 diff+ 绝对路径+git 信息       | remote `llm-data` flag + 登录       | **隐藏上传**                      |
| `/code/report`                               | 编辑快照 +20% 文件全文                              | remote `CodeEditsTracking`          | **隐藏上传**                      |
| codebase → COS `copilot-codebase-1258344699` | 全工作区文件字节（≤10k，gitignore，无密钥名黑名单） | remote `Codebase` + 登录            | **隐藏上传**（文案=索引/搜索）    |
| 日志自动上传 → COS                           | 最近 1 日日志 zip（prompt/路径/工具参数）+ 注入目录 | remote `config.log.upload.interval` | **隐藏上传**（silence 命令无 UI） |
| COS 附件上传（main.js presigned）            | 用户所选附件                                        | 用户操作                            | 合规                              |
| 反馈日志上传                                 | 日志 + 对话史                                       | 用户触发+modal 披露                 | 合规                              |
| e2b/cloud_studio 沙箱上传                    | 项目文件                                            | 云 agent 特性 UI                    | 特性固有                          |

## 证据锚点

- genie 扩展（`resources/app/extensions/` 内 coding-copilot v3.10.0）— `FileHistoryTracker`、`AgentReporter.onAgentStart`、`reportByConversationMessage`、`ReportTracker`/`MAX_RANDOM_FILES`
- `CodebaseServiceImpl`/`CodebaseCOSFileUploader` — `/v2/codebase/{handshake,upload_addr,tree,index,progress}` + `putObject(createReadStream)`
- `product.json` — endpoint `copilot.tencent.com`；`/v3/config/llm_data` remote flag
- `DefaultAiStorageRateService`/`CodeEditsAPIService` — `/code/report`

## 复核

- ⚠️ "三条服务端门控内容外发通道"——**部分成立**：门控与机制全部确认，但实为 **≥4 条**——另有日志自动上传→COS（remote `config.log.upload.interval` 驱动、`upload.log.silence` 无 UI）；标题/结论/通道清单已改四条
- ✅ `/file/history` 全文+workspace/git、`llm-data` 门控——确认；细节修正：登录瞬间是**武装**追踪器并立即快照已开文档，首个 POST 在下一触发点（失焦/关闭/agent 消息/2h/退出）而非登录瞬间
- ✅ codebase merkle-diff 原始字节直传 `copilot-codebase-1258344699`——确认：登录+`productFeatures.Codebase` 自动 buildIndex→STS→`putObject(createReadStream)`→600s 周期重同步
- ⚠️ `/code/report` 门控——部分成立：`CodeEditsTracking` flag **仅激活时查一次**（非响应式），llm-data/Codebase 为响应式；采样更正：`baseContent` 仅中链记录 ~20% 保留、头尾必留
- ✅ "UI 零数据收集开关"——确认：32 个 `codingcopilot.*` 无数据键；唯一可见面是误标的状态栏 "Workspace code searching…"（指示器而非开关）
- ❌ "敏感过滤只按文件名、不扫内容"（consent 面旧表述）——**推翻**：FileFilter 另有前 10 行凭证标记扫描；但删除路径跳过内容扫描、agent 会话路径整体绕过 FileFilter、codebase 通道无密钥名黑名单——已修
- ✅ FileFilter/merkle 范围限制真实存在——缩小范围但不阻断内容外发

## 版本考古

**结论**：完整签名（合并 `extensions/genie` 内 `FileHistoryTracker`→`/file/history` + codebase→COS 双通道）首现于 **4.3.3.18223695（2026-01-26）**；codebase 上传通道单独看在最老可得构建 **0.1.8（2025-07-22，Wayback 首个公开 aiide 构建）**中已存在——**早于可获取历史**。

| 版本                                  | 日期       | 签名           | 备注                                                                                |
| ------------------------------------- | ---------- | -------------- | ----------------------------------------------------------------------------------- |
| 0.1.8.2412962 (darwin dmg)            | 2025-07-22 | 仅 codebase    | upload_addr/`copilot-codebase-`/buildIndex/productFeatures 在分裂三 genie 内        |
| 1.2.4.12331197-cn (win32 Inno)        | 2025-11-30 | 仅 codebase    | FileHistoryTracker=0、`/file/history`=0                                             |
| 4.0.0.13996248 (win32 Inno)           | 2025-12-03 | 仅 codebase    | FileHistoryTracker 通道**最后缺席**                                                 |
| 4.3.3.18223695 (darwin dmg)           | 2026-01-26 | **全签名首现** | 三 genie 合并为 extensions/genie；`apiPath='/file/history'`、`enabled=false` 默认关 |
| 4.4.1.18986636 (darwin dmg)           | 2026-01-29 | 全签名         | 门控迁 `llmDataReportService.isEnabled('llm-data')` + 2h 自动上报                   |
| 4.7.0.23812295-cn (darwin dmg)        | 2026-03-26 | 全签名         | 同 4.4.1                                                                            |
| 4.10.4.26327962-workbuddy-cn (win32)  | 2026-04-24 | 全签名         | 6 项字面量全中                                                                      |
| 4.12.0.37847260-cn (linux deb)        | 2026-09-04 | 全签名         | 增 `ConcurrencyLimiter(6)`；本页解包对象                                            |
| 5.6.2.39458645-workbuddy (darwin zip) | 2026-09-25 | 仅 flag 残留   | 实现+端点整体移除，只剩 `ProductFeature` 枚举声明（`@default false`）               |

- **codebase 通道门控**：0.1.8 起始终是服务端 `productFeatures` map 遥控（`waitConfiguration()`→订阅 config/auth 变更即 auto-buildIndex；`upload_addr` 换 STS 直传 `copilot-codebase-*`），形状跨版本未变
- **file-history 门控**：4.3.3 引入时走通用 `productFeatures[FileHistoryTracker]`（默认关）；3 天内 4.4.1 即迁专用远端开关 `llm-data`——promise 缓存 + 登录重查 + `AUTO_REPORT_INTERVAL=2h` 周期上报；4.12.0 再加 `ConcurrencyLimiter(6)`
- **consent 面**：各版本均无本地数据收集开关；5.6.2 把实现从 bundle 删掉（疑似改远端下发插件/服务端化），flag 声明仍在
- **边界**：absent ≤4.0.0.13996248（2025-12-03）、present ≥4.3.3.18223695（2026-01-26），中间 ~7 周无构建可查。缺口：aiide/workbuddy 两产品线按发布日二分、版本号不可线性比；win32 Inno 只能解 zlb+LZMA 裸数据流查字面量、无路径；0.1.8 之前无可得历史
