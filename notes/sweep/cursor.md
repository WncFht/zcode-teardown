# Cursor 3.21.16 — 判定：多条内容外发管线（隐藏上传 + 披露失真并存）

**包/来源**: `cursor.com/api/download` 官方 deb（198MB，`cursor_3.21.16_amd64.deb`，commit `8ae78e8e`）；app 未打 asar，`resources/app/` 裸目录 · **解包**: `extracted/cursor` · **覆盖**: acq+7scan+ 双镜 verify+5lane

## 结论

Cursor 不存在 ZCode 式单一"整包 tar.gz 上传"，但有**至少四条独立的工作区内容外发通道**，其中最接近 ZCode 形状的是 **codebase-telemetry v2 影子 git packfile 上传**和**调试数据 zip → S3 presigned PUT**（服务端凭证签发→直传对象存储→UI 不可见）。consent 模型是全局 `PrivacyMode` 枚举 + 服务端 flag 的混合：onboarding 的 "Recommended" 分享卡片会在 **24 小时后静默升级**为 `USAGE_CODEBASE_TRAINING_ALLOWED`，自动接通索引上传；FileSync（Tab 补全）**逐键击发文件正文且完全不查 privacy mode**。

## 上传机制

### A. Codebase Telemetry v2（影子 git packfile —— 最贴近 ZCode 形状）

- **捕获**: Rust 引擎 `extensions/cursor-retrieval/node_modules/@anysphere/file-service/file_service.linux-x64-gnu.node`（gix_snapshot + codebase-snapshot-history crate）在 `userData/snapshots` 维护工作区影子 git 仓库，文件增删改即 `queueChange` 提交快照 commit
- **打包**: `generatePackfile()` 产出真实 git packfile（blob=工作区文件内容），`GitHistoryUploader` 另打包真实 repo 提交史
- **凭证**: `aiserver.v1.CodebaseSnapshotService/CreatePackfileUpload{pack_id, content_sha256, size_bytes}` → 服务端签发 `upload_uuid` + 分块大小（api2.cursor.sh，Bearer）
- **传输**: `UploadPackfileChunk{codebase_uuid, upload_uuid, chunk_index, data}` ≤64MiB/块
- **注册**: `CompletePackfileUpload` + `RegisterCodebaseSnapshot{commit_hash,tree_hash}` + `RegisterCodebase{codebase_uuid, path:<本地绝对路径>}`
- **门槛**: 服务端 flag `codebase_telemetry_v2` + `CheckCodebaseTelemetryPolicy`（5min 缓存，`codebase_protection_client_enforcement` 默认 false → repo-deny 仅 advisory）+ `privacyMode===USAGE_CODEBASE_TRAINING_ALLOWED`

### B. Codebase Indexing v1（逐文件全量同步 → repo42.cursor.sh）

- `cursor-retrieval` 的 `RepoIndexWatcher`：`**` 文件监听 + `setInterval(doUpdate, 600s)` merkle-diff 循环
- `FastRepoInitHandshakeV2`（服务端发 `path_encryption_key`/`repo42_auth_token`）→ `SyncMerkleSubtreeV2` 对比 → `syncFile()` 读文件全文，`FastUpdateFileV2Request{file_updates:[{local_file:{relative_workspace_path, contents:<明文全文>}, unencrypted_relative_workspace_path:<明文>}]}`
- **注意**: 路径 aes-256-ctr 加密是摆设——`unencrypted_relative_workspace_path` 明文同发，privacy mode 下 key 本身也经握手发给服务端
- 上限：`maxConcurrentUploads:50`、`absoluteMaxNumberFiles:1e5`、auto-index ≤1e4 文件、单文件 10MiB；尊重 `.cursorindexingignore`/`.gitignore`/admin blocklist
- **捕获范围含竞品 agent 数据**：`~/.claude`（含 `projects/`、`history.jsonl`、`plans/`、`skills/` 等 14 项 allowlist）、`~/.codex`（sessions/history.jsonl）、`~/.agents`、`~/.cursor`

### C. 调试数据 zip → presigned S3 PUT

- `TracingService.captureAndSendDebuggingData`（`out/main.js:201`）：archiver 打包 renderer heapsnapshot + 24h 日志 + **整个 userData/User 目录**（≤2GB，含 globalStorage state.vscdb 里的 token、User/History 的文件副本）+ agent transcripts（≤7d，仅手动路径附带）+ `metadata.json{workspaceId}` → PUT 到服务端下发的 presigned URL
- URL 校验锁定 `cursor-user-debugging-data.s3*.amazonaws.com`（`main.js:200` `Wy()`）
- **自动触发**：renderer OOM——每个 webContents 挂 CDP debugger，`Debugger.paused reason=OOM` → heap snapshot → zip → PUT，无对话框；另有内存压力 emergency profile 下次启动自动补传。远端 gate `oom_crash_watcher`
- privacyMode 时 `GetDebuggingDataUploadUrl` 返回空 → 不上传；但手动 picker 文案明确"even in privacy mode"

### D. FileSync / Tab（逐键击）

- `FileSyncService.fSUploadFile{uuid, relative_workspace_path, contents, sha256_hash}` + `fSSyncFile` 增量 diff，每次击键触发
- `isFileSyncEnabled` **不查 privacyMode**：门槛只有 server flag、`cursor.isFileSyncClientEnabled`、Tab 开关（默认开）、付费层
- 厂商自己的 private-inference egress map（`KLc`，编译进 bundle 但从不渲染为 UI）写明："Every keystroke ships the file body, filename and edit history to Cursor's Tab model"

## 载荷解剖

### A — 影子 packfile → `CodebaseSnapshotService`（api2，逐 agent 请求）

- **触发/端点**：workbench CodebaseTelemetry contrib 挂 `composerEventService.onDidSendRequest/onDidFinishStreamChat` → `cursor.codebaseTelemetry.triggerSnapshot{reason:AGENT_REQUEST_START|END,requestId}`（workbench ~29608000；ext deobf 138274-138367；dedupe≤100）；门 `codebase_telemetry_v2`+privacy enum 4。Connect-RPC `api2.cursor.sh/aiserver.v1.CodebaseSnapshotService/{RegisterCodebase,CreatePackfileUpload,UploadPackfileChunk,CompletePackfileUpload,RegisterCodebaseSnapshot}`（h1.1+proto+gzip+60s，Bearer+DLe 头+`backupRequestId`，deobf 135173-135210）
- **字段**：`RegisterCodebase{codebase_uuid,path:<绝对路径>,kind,environment}`；`PackfileMetadata{pack_id,content_sha256,size_bytes}`→`{upload_uuid,chunk_size}`；`UploadPackfileChunk{codebase_uuid,upload_uuid,chunk_index,data}`≤64MiB；影子 commit msg `cursor-snapshot\n{"v":1,"reason":{…}}`（deobf 135633-135661）
- **服务端收到**：proto+gzip 的 `UploadPackfileChunk` POST 流（Bearer JWT、`x-cursor-client-version:3.21.16`、`x-ghost-mode:false`）——经 `RegisterCodebase` 拿工作区绝对路径，packfile 内含工作区全部文件 blob + `~/.claude`（agent-memory/plans/projects/history.jsonl 等 14 项 allowlist）+ `~/.codex`（sessions/history，15 项）+ `~/.agents/skills` + `~/.cursor`
- **范围/过滤**：`shouldAdmit=CheckCodebaseTelemetryPolicy` **fail-open**——RPC 错→放行，`telemetry_allowed=false` 仅当 `codebase_protection_client_enforcement` 服务端开启才拦（默认 advisory `would_block`，deobf 134683-134712）；dot-dir 由子 flag `_agent_dot_dirs` 门控（deobf 134509-134544 `Xce()`）；Rust gix-snapshot 产 packfile 于 `User/snapshots` 传后即删；commit 按请求、packfile 300s 批传

### A2 — `GitHistorySession` 真实仓库史（Rust 旁路）

- **触发/端点**：codebase admit 后 `new GitHistorySession({snapshotsBaseDir,rpcBaseUrl,authToken,requestHeaders})`（deobf 136187-136212）；子门 `_git_history`，`Ype` 限主 worktree 根。`file_service.linux-x64-gnu.node` 内嵌 Rust Connect client → **同三个 packfile 端点**，额外头 `x-cursor-codebase-snapshot-rate-limit`；packfile=真实 repo 近 1 个月 commit/tree/blob
- **服务端收到/范围**：与 Lane A 同形 chunk 流但发自 Rust 模块——JS 层 hook 不可见；仅主 worktree（linked 排除），尊重 `.gitignore`/`.cursorignore`/`.cursorindexingignore`+`WalkDirConfig` blocklist

### B — `RepositoryService` 索引 v1 → repo42

- **触发/端点**：`RepoIndexWatcher` `**` watch + `setInterval(doUpdate,600s)` merkle diff（deobf 128985-129046）；门 `!localMode && !privateInference && accessToken && enum4 && !v2 取代`（deobf 130638-130727）。`repo42.cursor.sh/aiserver.v1.RepositoryService/{FastRepoInitHandshakeV2,SyncMerkleSubtreeV2,FastUpdateFileV2,FastRepoSyncComplete,EnsureIndexCreated}`；头 `x-codebase-indexing-enabled:'false'`
- **字段**：`RepositoryInfo{relative_workspace_path,remote_urls[],repo_name,repo_owner,workspace_uri}`（remote+owner+URI 明文）；merkle `LocalCodebaseFileInfo{encrypted_relative_path,hash,children[]}`；`FastUpdateFileV2.file_updates[].local_file{relative_workspace_path,contents:<明文全文>,file_git_context}`+`unencrypted_relative_workspace_path:<明文>`（deobf 129845-129897）
- **服务端收到/范围**：`FastUpdateFileV2` 逐文件明文全文+明文路径；privacyMode=false 时握手交出 `path_key`，`IndexingConfig` 可下发 default_user/team 路径密钥——"加密路径"对服务端透明。`Vme` 上限：并发50/总1e5/自动1e4/单文件10MiB/批2MiB/重试20；与 v2 互斥（`codebase_telemetry_v1_deprecation`）

### C — debugging-data zip → presigned S3

- **触发/端点**：每 webContents 挂 CDP debugger，`Debugger.paused reason==='OOM'` → `takeHeapSnapshot`(30s) → zip → PUT（out/main.js ~1919000；远端 gate `oom_crash_watcher`）；手动 `uploadDebuggingData`/`uploadEmergencyProfile` ~1924000。URL 由 workbench 每 600s 刷 `ClientLoggerService.GetDebuggingDataUploadUrl`（privacyMode→空）；PUT 仅 Content-Length 头，`Wy()` 锁 host `cursor-user-debugging-data.s3*.amazonaws.com`（byte 1884279）
- **字段**：zip=`snapshots/renderer.heapsnapshot`（legacy 跳）+`logs/`（24h 窗）+`user/`=**整个 userData/User**（state.vscdb token、User/History；仅 >2GiB/`excludeUserDirectory`/legacy&&!userInitiated 跳）+`agent-transcripts/`（≤7d、512MiB，仅手动路径附带）+`metadata.json{workspaceId,heapStatistics,processDiagnostics,…}`+feature-gates/extensions-summary
- **服务端收到/范围**：S3 收一个 zip——renderer 堆（JS 内存含文件内容/token）+24h 日志+User profile；`go/debugdata<key>` 挂进 Sentry RendererOOM 事件绑到用户。privacyMode→URL 空→zip 只落盘 `<userData>/debugging-data`；emergency-profiles 下次启动自动补传

### D — `FileSyncService` 逐键同步（Tab 后端）

- **触发/端点**：`cursor-always-local` `onDidChangeTextDocument` 每击键→`handleDocumentChange`（250ms debounce/20 updates）→`FSSyncFile`；漂移>100 版或失败→`syncFullDocument`→`FSUploadFile`；visible editors 变化→每个 tab 全量（dist/main.js ~4463787-4471817）。`geoCppBackendUrl` `aiserver.v1.FileSyncService/{FSUploadFile,FSSyncFile,FSGetFileContents,FSGetMultiFileContents,…}`；头 `x-fs-client-key:<32B hex>`
- **字段**：`FSUploadFile{uuid,relative_workspace_path,contents:<未保存全文>,model_version,sha256}`；`FSSyncFile.filesync_updates[]`；`SingleUpdateRequest{start_position,end_position,change_length,replaced_string:<键入文本>}`；`FSGetMultiFileContents{get_all_recent_files}`=服务端可回吐全部近期文件
- **服务端收到/范围**：每 ~250ms 一个 `FSSyncFile{path:'src/secret.ts',updates:[{replaced_string:'sk_live_…'}]}`；服务端文件态权威到 streamCpp 发 `currentFile.contents:''`+`relyOnFilesync:true`——Tab 模型从服务器读文件。`isFileSyncEnabled` **无 privacyMode 检查**（~4436450：仅 !privateInference+server flag+cpp 开关默认开+付费）；scheme 限 file/untitled/vscode-remote/notebook-cell，≤500KB，语言 denylist；10rps/burst100+per-path 熔断

### E — `OnlineMetricsService.ReportAgentSnapshot`（rl-5 diff 跟踪）

- **触发/端点**：workbench `$6o` 挂 `onDidFinishStreamChat`/abort→收集 agent 触及文件（codeblock URI+noCodeblock edit）start/endContents→`cursor.action.startTrackingRequest`（workbench ~29176xxx；ext deobf 132096-132615）；门仅 `!localMode && onlineMetricsConfig.enabled`（**无 privacyMode**）；api2 `ReportAgentSnapshot`，头 X-Request-ID+`X-Amzn-Trace-Id`
- **字段**：`ReportAgentSnapshotRequest{agent_request_id,initial_file_snapshots[],file_snapshots[],too_big_files[],name,snapshot_date_unix_ms}`；`RequestTrackingFileSnapshot{fs_path:<绝对路径>,file_uuid,size,lines,kind(ADDED/DELETED/MODIFIED),git_info{git_root,branch,commit_hash},diff_changes[],original_file_contents?}`；`DiffChange{行区间,added_lines:<新文本>}`
- **服务端收到/范围**：每 agent 请求收到全部触及文件的绝对路径+git root/branch/commit+行级 diff 新行文本+（`send_original_file_contents` 开时）编辑前完整原文；再按服务端 `timeIntervalsTrackedMinutes` 复拍+每 commit（≤numCommitsTracked）drift 快照。全部旋钮服务端下发（缓存5min）；超限文件只报路径；checkpoint 存 `globalStorage/checkpoints`，queue≤2000

### F — `agent.v1` 对话外发（KV 拉取+blob 上传+Ingest）

- **触发/端点**：(a) Run bidi 流内服务端 `KvServerMessage.get_blob_args{blob_id}`→客户端回 `blob_data`（**可拉任意本地 blob**，workbench ~14461185）；(b) `deepCloneComposer`→`NotifyConversationClone`（clone flag+!reactivePrivacy+!localMode，~24147357）；(c) `BlobUploadService` chunked `UploadConversationBlobs`（100 id/job、重试3，~24107700）；(d) `ConversationClassification`（team flag `cursor_blame`）→`IngestConversation`（**无 privacyMode 检查**，~18214792）。api2 `agent.v1.AgentService/*`+`aiserver.v1.AnalyticsService/IngestConversation`
- **字段**：blob 图覆盖 turns/messages/tool outputs/`fileStates{content,initialContent}`=<全文件快照>/`rootPromptMessagesJson`/todos/plan（TXe walk ~16356163）；`UploadLocalAgentRunToPromptQuality.invocations[]{model_id,messages:bytes[],response_messages:bytes[],tools_json,tokens}`=每次模型调用完整收发（`prompt-quality-upload` 门）；`IngestConversation{transcript:<全文>}`；`IdeEditorsStateFile{absolute_path,current_line_text}`=当前聚焦行
- **服务端收到/范围**：三条独立途径拿同一份对话——Run 流按 blob_id 索回解密字节、blob 图分块上传、Ingest 全文转录；媒体走 `GetSignedUrlForAttachedMedia` presigned。本地 EncryptedBlobStore AES-256-GCM 但服务端读取前客户端先解密；Ingest 由 team admin flag 门（非用户 privacy）

### G — `CodebaseProtectionService` 仓库身份心跳

- **触发/端点**：`RAe`=1800000（30min）循环+repo 就绪等待；门 `codebase_protection_reporting`（deobf 137618-137760）。api2 `/{ReportWorkspaceRepositories,CheckCodebaseTelemetryPolicy}`；字段 `CodebaseRepositoryIdentity{host,repository_path}`=每个 git remote fetch/push URL 解析（规范化 ≤4096 字符/128 段）
- **服务端收到/范围**：每 30min 上报工作区全部 remote 的 host+path（如 `github.com/acme/secret-repo`）——无论遥测是否开的工作区清点心跳；fail-open 结果反哺 Lane A admission

### H — `MetricsService.ReportIncrement`（硬编码共享 token）

- **触发/端点**：`mainCrashMetricsUploader` crash/metric 事件（dedupe 120s，out/main.js ~1893400）。`api3.cursor.sh/aiserver.v1.MetricsService/ReportIncrement`；Bearer `rHggiuZiWj…`=全安装共享硬编码写 token；字段 `{metricsList:[{name,value,tags{channel,release_track,platform,arch,…}}]}`
- **服务端收到/范围**：带 channel/platform 标签的指标增量，token 同一枚无用户身份；**privacyMode 不拦**，唯一闸门 isEgressLocked（private-inference 锁）

## consent 面

- **全局 PrivacyMode 枚举**：0 UNSPECIFIED / 1 NO_STORAGE / 2 NO_TRAINING / 3 USAGE_DATA_TRAINING / 4 USAGE_CODEBASE_TRAINING。Settings 渲染为 "Share Data"/"Privacy Mode" 下拉；"Privacy Mode (Legacy)"（NO_STORAGE）只能退出不能进入（"You won't be able to switch back"）
- **onboarding 暗黑模式**：强制二选一卡片，"I am fine with Cursor learning from my code!" 标 **Recommended**；选分享后 `hasEnoughTimeElapsedSinceOnboarding(>864e5ms)` 到点即把 privacyMode 推断升级为 USAGE_CODEBASE_TRAINING_ALLOWED——**约 24h 后索引上传自动接通，无二次确认**
- Settings "Codebase" 区只有 "Index Repositories for Instant Grep — **All data is stored locally**"——索引上传无任何诚实文案
- 诚实的披露只存在于编译进的 egress map（private-inference-features.ts），供"锁死模式"判定用，**从不渲染**
- prompt-quality 上传有逐次真实对话框（"uploads prompts, code and context, tool arguments and results, and model responses"）；调试数据手动路径文案诚实但自动路径静默

## 宣称对照

| 厂商宣称 | 出处 | 实际行为 | 判定 |
| --- | --- | --- | --- |
| 不用 Inputs/Suggestions 训练，除非安全审查/主动上报/明确同意 | cursor.com/privacy（2025-10-06） | "明确同意"=一次 onboarding 点击，Recommended 卡 24h 后静默升 enum4→自动接通 packfile+indexing | 低估 |
| "Usage Data" 通用收集类别 | 同上 | 未提逐键文件正文、debugging zip 含整个 User 目录 | 未披露 |
| Privacy Mode→不训练+provider ZDR；临时缓存文件、客户端密钥加密、请求后即删 | data-use（2026-09-03） | 训练/ZDR 属实但 ZDR 仅管 provider；FileSync 不查 privacyMode、debug zip "even in privacy mode"；不披露每键频率/全文载荷/无 privacy 门 | 低估 |
| BYOK 请求仍走我们后端；Privacy off 可存储+训练 codebase | 同上 | 与二进制一致（enum3/4；enum4 实际还开 dot-dir 采集） | 如实 |
| 开启 Privacy Mode 后不训练；allowlist Cursor 后端域名 | security（2026-08-25） | Oct-2025 版 egress 细节全删；debug zip 去 `cursor-user-debugging-data.s3*.amazonaws.com` 不在任何公开域列表 | 低估 |
| keystroke 发 AI 请求 / merkle 索引 / x-ghost-mode replica | wayback security（Oct-2025） | 二进制+KLc 逐条证实；坦诚内容已从现页删除 | 如实 |
| 路径分段加密只存 obfuscated path、只扫打开的文件夹、privacy 下无明文代码 | 同上 + indexing doc/FAQ（已删） | telemetry-v2 明文 `unencrypted_relative_workspace_path`；`~/.claude/.codex/.agents` 越界入 packfile；llms.txt 已无 indexing 条目 | 矛盾 |
| 数据只经 LLM 请求+Cloud Agents 离开；Cloud Agents 是唯一需存代码的功能 | docs enterprise/privacy-and-data-governance | 二进制另有 ≥6 条通道（indexing/packfile/FileSync/debug-zip/prompt-quality/Ingest，KLc 自列） | 矛盾 |
| api2=most API、repo42=codebase search、api3=Tab | docs enterprise/network-configuration | "most API"含 packfile、"search"含全文索引上传；漏 S3 debugging host | 低估 |
| 新 codebase 全量上传、"each encrypted path" | blog secure-codebase-indexing | 上传属实；"encrypted path" 被明文路径字段矛盾；未提 telemetry v2 | 低估 |
| Privacy Mode 永不用于训练 | help/privacy.md | 对 training 属实，但以"不训练"顶替"private"全部含义 | 低估 |
| ZDR、只存加密 embedding、路径 obfuscated（danperks） | forum 52875 | 明文路径+FileSync+debug zip 反驳 | 矛盾 |
| Privacy mode 下不存你的数据（联创 arvid220u） | forum 2708 | 自家 picker 认 "even in privacy mode"；enum2 明确可存储 | 误导 |
| legacy=no storage、新 PM=临时存储；Cloud Agents 只为运行保留；Instant Grep 全本地 | forum support/staff + docs cloud-agent + blog | 与 enum1/enum2、trigram 本地索引实现一致 | 如实 |
| Recommended 分享卡"collect usage data" | 包内 onboarding legacy 变体 | 不提 24h 升 `USAGE_CODEBASE_TRAINING_ALLOWED`；new2 有 "After one day…learns" 但范围仍低估 | 误导 |
| onboarding Privacy 卡"none stored or learned by us or third-party" | 同上 | 被自家 "even in privacy mode" 上传文案+FileSync 证伪 | 误导 |
| Share Data="codebase…stored and trained" | 包内 settings | 与 enum4 一致（范围仍低估 dot-dirs） | 如实 |
| Privacy Mode (Legacy)="no storage" | 同上 | enum2 标签诚实；legacy "no storage"≠"no uploads"（OOM zip 仍传日志/transcripts） | 低估 |
| Tab "suggests as you type" | 包内设置+tab 文档 | 不提逐键上传文件正文+编辑史 | 未披露 |
| OOM 自动上传路径 | 无任何宣称 | gate 开即静默：heap+User 目录→S3，零交互零文档 | 未披露 |
| KLc egress map："Every keystroke ships the file body…" | 包内（编译进从不渲染） | 最完整披露无 UI 面，所列通道全被 RPC 字面量证实 | 如实 |
| 手动 debugging picker/prompt-quality/crash-watch confirm；git-history indexing 设置文案；SOC2/ISO/AIUC-1 | 包内+security | 手动路径如实有 consent；"metadata stored, code local" 精确；认证静态不可证但无矛盾 | 如实 |

## 通道清单

| 通道                                       | 载荷                                             | 门槛                                    | 判定                               |
| ------------------------------------------ | ------------------------------------------------ | --------------------------------------- | ---------------------------------- |
| codebase-telemetry v2 packfile             | 工作区文件内容+git 史+`~/.claude/.codex/.agents` | 服务端 flag+policy+privacy enum 4       | 披露失真（UI 称 "stored locally"） |
| codebase indexing v1                       | 逐文件明文全文 + 明文路径 → repo42               | 同上（enum 4）                          | 披露失真                           |
| FileSync/Tab                               | 逐键击文件正文 + 编辑史                          | 无 privacyMode 检查，Tab 默认开         | **隐藏/披露失真**                  |
| 调试数据 zip                               | User 目录 + 堆快照+transcripts → S3              | privacy off + 服务端 URL 下发；OOM 自动 | **隐藏自动触发**                   |
| UploadConversationBlobs/IngestConversation | 全对话+blob                                      | 服务端 flag；Ingest 无 privacy 门       | 披露失真                           |
| ReportAgentSnapshot (rl-5)                 | 跟踪文件 fs_path/diff/原文                       | server OnlineMetricsConfig              | 披露失真                           |
| AgentService artifact upload               | 服务端指令让 daemon 上传本地文件                 | cloud agent 会话                        | 特性固有（服务端拉取面）           |

## 证据锚点

- `usr/share/cursor/resources/app/out/main.js:200-201` — Wy() S3 bucket 校验 / captureAndSendDebuggingData 打包 PUT / OOM 自动触发
- `usr/share/cursor/resources/app/extensions/cursor-retrieval/dist/main.js` — RepoIndexWatcher 循环、FastUpdateFileV2 载荷、`Vme` 同步配置、`Xce()` dot-dir allowlist、`KLc` egress map
- `extensions/cursor-always-local/dist/main.js` — `isFileSyncEnabled()` 无 privacy 检查、`FSUploadFile` 载荷
- `out/vs/workbench/workbench.desktop.main.js` — KLc egress map 文案、privacyMode 推断升级、onboarding 卡片

## 复核

对 4 条核心论断做对抗性复核（独立重推 minified bundle：byte 偏移 grep→dd 抽取→跨文件调用链；原生 `.node` 查导出/字符串）——**四条全部成立，无一推翻**：

- ✅ **telemetry v2 packfile（含 `~/.claude`/`~/.codex`/`~/.agents`）**：`Xce()` dot-dir 规格 + 三重 server gate + `Pde(e)=e===4` + Rust `uploadViaChunksFromDisk` 全链接线；commit 按请求、packfile 300s 批传；`shouldAdmit` fail-open 属实
- ✅ **onboarding Recommended 卡 24h 静默升级**：`hasEnoughTimeElapsedSinceOnboarding>864e5`+`inferPrivacyModeFromLegacyValues`→enum4 实锤；legacy 卡只写 "usage data"、24h 翻转无任何提示（new/new2 卡片有 "After one day…learns" 文案，翻转本身仍无弹窗）
- ✅ **FileSync 逐键发文件正文不查 privacyMode**：门槛链零 privacy 检查，仅 privateInference 锁；同文件 `appendCppTelem` 反而有 `getPrivacyMode()` 早退——证明遗漏是事实而非模式
- ✅ **debugging zip OOM 自动上传**：CDP OOM→heap→zip→presigned PUT 全程无对话框；**范围有界**——auto-upload 仅对 sharing 模式生效（privacyMode→URL 空→只本地落盘），agent-transcripts 仅手动路径附带

## 版本考古

**结论**：Lane A 签名字面量首现 **2.5.17**（2026-02-17，仅 proto schema 未接线），首个完整接线版 **2.6.11**（2026-03-03）；Lane B 更早——夹逼于 (0.44.9, 1.0.1]，首个确认 **1.0.1**（2025-07-02）。15 个安装包留存于 `agent-teardown/installers/history-cursor/`，结果矩阵 `agent-teardown/history/cursor/bisect-hidden-upload.tsv`

| 版本    | 日期       | A packfile | B 调试zip | 备注                                                                                                        |
| ------- | ---------- | ---------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| 0.36.0  | 2024-07-03 | ✗          | ✗         | 最老样本；retrieval ext+file-service 已在（本地索引）；仅旧版已披露 UploadRepo 管线                         |
| 0.44.9  | 2024-12-26 | ✗          | ✗         |                                                                                                             |
| 1.0.1   | 2025-07-02 | ✗          | ✓         | Lane B 首个确认：zip→服务端 uploadUrl + OOM 自动触发已接线                                                  |
| 1.4.0   | 2025-08-25 | ✗          | ✓         |                                                                                                             |
| 1.6.26  | 2025-09-28 | ✗          | ✓         |                                                                                                             |
| 2.1.41  | 2026-01-09 | ✗          | ✓         |                                                                                                             |
| 2.3.14  | 2026-01-10 | ✗          | ✓         |                                                                                                             |
| 2.4.22  | 2026-02-05 | ✗          | ✓         |                                                                                                             |
| 2.4.23  | 2026-02-20 | ✗          | ✓         | Feb-20 重建版：证明 proto 未回填 2.4.x                                                                      |
| 2.4.37  | 2026-02-14 | ✗          | ✓         | semver 序最后一个 Lane A 缺席                                                                               |
| 2.5.17  | 2026-02-17 | schema     | ✓         | 字面量首现：CodebaseSnapshotService proto 描述符（3 bundle 各 1 次、零调用方）；.node 已有本地 gix-snapshot |
| 2.5.25  | 2026-02-24 | schema     | ✓         |                                                                                                             |
| 2.5.26  | 2026-02-26 | schema     | ✓         | 最后未接线版                                                                                                |
| 2.6.11  | 2026-03-03 | **接线**   | ✓         | 首个功能版：grpc 全调用 + `codebase_telemetry_v2`&privacyEnum==4 + triggerSnapshot + `~/.cursor/snapshots`  |
| 2.6.12  | 2026-03-05 | ✓          | ✓         |                                                                                                             |
| 3.21.16 | 2026-09-19 | ✓          | ✓         | 本地 deb；门槛已演化（见下）                                                                                |

- **门槛演化·A**：引入时（2.6.11）仅单 flag `codebase_telemetry_v2` + `privacyMode===4` 双门、随 gate/privacy 变更重估，无 per-repo 策略/子 flag/git 史通道；3.21.16 主门不变，增子 flag `_git_history`/`_agent_dot_dirs`/`codebase_protection_client_enforcement` + `CheckCodebaseTelemetryPolicy` RPC（repo-deny，enforcement 默认关→advisory）+ GitHistoryUploader（真实 repo 提交史）+ 身份感知 session 控制
- **门槛演化·B**：1.0.1 已有 zip→服务端签发 uploadUrl + OOM 自动触发（CDP OOM→heap snapshot→zip）；3.21.16 增打整个 `userData/User` 目录并挂远端 gate `oom_crash_watcher`（1.0.1 无此 flag）
- **边界**：Lane A `缺席 ≤2.4.37 / 字面量 ≥2.5.17 / 接线 ≥2.6.11`；Lane B `缺席 ≤0.44.9 / 存在 ≥1.0.1`。缺口：idx 41–79（0.44.10→1.0.0）未探测——Lane B 引入点只夹逼未钉版；list 最新 3.21.18 未下载（晚 2 patch、同世代）
- **判读注意**：file-service 原生包 ≥0.36.0 即在、.node 本地 shadow-git 采集 ≥2.5.17 已有——本地用途不等于上传接线；0.36.0 的旧 UploadRepo 属已披露索引上传，与 v2 packfile 不同通道
