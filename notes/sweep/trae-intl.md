# Trae intl (ByteDance) 3.5.91 / build 2.3.73738 — 判定：服务端驱动的日志采集管线（ZCode 同构×2 实现）+ 伪装反馈单，零 consent 面

**包/来源**: 官方 deb `TraeCode-linux-x64-2.3.73738`（VS Code 1.107.1 fork）· **解包**: `extracted/trae-intl` · **覆盖**: acq+7scan+ 双镜 verify+5lane

## 结论

`sharedProcessMain.js` 里的 aLog 服务无条件实例化，跑**两条服务端驱动的采集循环**：(a) 消费版每 10min 轮询 `/icube/api/v1/device/log/check`——服务端任务可打 `packCodexSessions` 标志把 **`~/.codex/sessions`、`~/.claude/projects`、`~/.cursor` agent transcripts（竞品的完整对话记录）** 一并打包上传 ByteDance ImageX，再 callback 注册；SSH 远程主机的日志也会被拉回上传；(b) ToB 版每小时轮询 `log_collection/poll`，**先伪造一条用户反馈单**（`/tob-admin/report/create`，issue_description 写 "automatically uploaded by the client"）再打包上传。另有**原生 Rust 孪生实现** `liblogifier_retrieval.so`（服务端推送 pack_rule/path_patterns/RunCommand）。**全程零 consent 面、零 UI 描述**——唯一门是 `storeRegion!==USTTP`（国际版用户恒真）+ 服务端任务标志。

## 上传机制

### A. 消费版设备日志采集（ZCode 同构五段式）

- **触发**: `POST {icube-normal.trae.ai}/icube/api/v1/device/log/check` 每 10min（首启 30s），未登录也跑；另有 frontier WSS 推送 `onDidFrontierUploadDeviceLog`（需登录；直入 `ib` 跳过 action 过滤）
- **采集**: `packLogs()` 收 [start,end] 窗口内全部 app 会话日志 + `aha_log/` + 服务端 `extraDirs`；`packCodexSessions=true` 时追加 `~/.codex/sessions/<近3天>`、`~/.claude/projects/*`（**含工作区内容的完整 Claude Code 转录**）、`~/.cursor/projects/*/agent-transcripts`、`~/.trae/.git-ai-tob` daemon 日志
- **打包**: npm `tar.create` gzip → `logs_<start>_<end>_<id>.tar.gz`（单文件 >200MB 跳过）
- **凭证**: `POST /icube/api/v1/report/token` → ImageX STS
- **传输**: vendored `@byted-icube/uploader` `useDirectUpload` serviceType imagex → `imagexsg-normal.trae.ai`，object key `i18n/<userId>/log/...tar.gz`；**载荷无加密**（内嵌 RSA-2048 pubkey 只加密 device-id 头 `x-icube-device`——厂商独钥读设备指纹）
- **注册**: `POST /icube/api/v1/device/log/callback {id,status,logPath}`
- **远程变体**: 任务带 `windowId` → SSH-remote 的 trae-server 打包日志拉回本地再传同管线，传完删远程副本

### B. ToB/SAAS 主动采集（伪装反馈单）

- `account.scope==SAAS` 时每 60min 轮询 `/trae/gtm/tob/api/v1/log_collection/poll`（服务端可调 `next_poll_after_sec`）
- **先伪造用户报告**: `POST /tob-admin/report/create` 填 `[ToB Auto Collect] The report was automatically uploaded by the client` + 用户邮箱——服务端视角看像用户主动反馈
- 然后同链：`/api/ide/v1/report/pre_signed_url` → PUT tar.gz → `/tob-admin/report/log/callback` + `log_collection/status`

### C. 原生孪生 `liblogifier_retrieval.so`

- 主 trae 二进制 dlopen（`use_logifier`/region 门控），服务端推送 `pack_rule/path_patterns/filters` + `RunCommand`，产物 `log_upload.tar.gz`/`lgpk` 分片上传 + ack/finish——**JS 管线之外的第二实现，能力更强（可执行命令）**

## 载荷解剖

> 锚点：`SP`=out/vs/code/electron-utility/sharedProcess/sharedProcessMain.js · `MJ`=out/main.js · `WB`=out/vs/workbench/workbench.desktop.main.js · `SO`=liblogifier_retrieval.so · `CKG`=modules/ckg/binary/ckg_server_linux_x64 · `MAN`=manifest.json

### L1 aLog 设备日志管线（SP:98-100；旁路 MJ:2159-2179）

- **触发**: `Qk.start()` 30s 首延 + `C=10*60*1e3` 轮询，唯一门 `storeRegion!=="USTTP"`（intl 恒真）；任务 `action=="log"|"deviceLog"` 经 `eb()→ib()` dedupe 进 `mb()`；frontier push / `MESSAGE_CENTER_BACK_LOG`（盖 `i.windowId=e.sender.id`）直入 `ib` **跳过 action 过滤**（push 需登录）
- **端点**: `POST {iCubeApi}/icube/api/v1/device/log/check` → imagex `addFile`（STS←`POST /icube/api/v1/report/token`）→ `POST /icube/api/v1/device/log/callback`
- **字段**: check `{machineId,deviceId,userId,organization,platform,arch,packageType,productCode}`；头 `x-icube-token`+`x-icube-device`=RSA-OAEP-SHA256(deviceId)（硬编码公钥 `Bk` SP:99）+`x-icube-did` 明文 deviceId（RSA 包装零意义）；tar `logs_<s>_<e>_<id>.tar.gz`=`^\d{8}T\d{6}$` 会话目录∈[start,end] + `aha_log/` + `extraDirs` + `alog_*_large_files` 清单（>`Rk=200MB` 文件绝对路径）；storeKey `i18n|cn/<uid>/log/…`；callback `{id,status,message,logPath,platform,arch,buildVersion}`
- **服务端收到**: 按其控制的 10min 时刻表拿回全量客户端日志 tar.gz + 超大文件绝对路径清单 + 回执
- **范围**: `jk()` 窗口过滤（空→±1 邻）、遍历深≤8、deny 仅 `.DS_Store`/`log_uploader.log`；`extraDirs` 服务端任意指定、客户端无钳制；`extraFiles` 死参数

### L1b packCodexSessions — 竞品转录收集（SP:98/100）

- **触发**: 服务端任务打 `packCodexSessions:true` → `mb/jb` 调 `I2(userHome)+R2` 并入 extraDirs，同 tar 上行
- **字段**: `Ok()`=`~/.codex/sessions/<Y>/<M>/<D>`（`gh=[0,-1,-2]`）→`codex_sessions/`；`Nk()`=`~/.claude/projects/*` 子树（深≤`Pk=12`、含 mtime≤3d 文件者）→`claude_projects/`；`Tk()`=`~/.cursor/projects/*/agent-transcripts`→`cursor_agent_transcripts/`；`R2()`=`~/.trae/<df>/.git-ai-tob/**/internal/daemon/logs`（恒加）
- **服务端收到/范围**: 一个标志取走近 3 天 Codex CLI、近 3 天动过的全部 Claude Code 项目转录（完整 JSONL 含 prompt/代码/粘贴 secret）、Cursor agent 转录；仅 mtime≤3d + 200MB 总门，除 userHome 前缀无路径校验

### L2 frontier WSS 推送 + HTTP 兜底（MJ:2178-2179）

- **触发**: `FrontierService.initWebsocket` 开机经原生 AhaFrontier/ahaNet 长连 `iCubeApp.fws/frontier`（autoReconnect 5s/timeout 10s；连接需 userInfo/deviceId）
- **端点/字段**: WSS 帧 `gde{SeqID,service,method,payload_encoding:"json",frame_type:0,headers,payload}`，payload `{namespace:"iCube"|"remote"|"ug",data,type,context:RSA(commonApiParams)}`；connect `{appId,fpid,deviceId,appKey,appVersion,url,headers:W("map")}`+原生补 `installId:"1"` 等；headers `x-icube-context`=Em(JSON commonApiParams+scope)（同 `Bk` RSA）+`Authorization:Cloud-IDE-JWT`；`commonApiParams`(MJ:174)`{mid,did,uid,userRegion,organization,packageType,productCode,platform,branch,arch,tenant,tenantId,appVersion,buildVersion,traeVersionCode}`；HTTP 兜底 `Rde` POST `{...commonApiParams,token,params}`（300ms 超时切换、3 重试 `2^n*1e3` 退避）
- **服务端收到**: 常驻 push——`DEVICE_LOG` 帧直触 `Qk.ib`（绕过仅存在于轮询路径的 action 门→即时采集）、`ICUBE_CONFIG_UPDATE` 热推配置（含全部 iCubeApp 门控）、`AUDIT_RESULT` 广播
- **范围**: push 任务无 action 过滤（已证实）；namespace 限 remote/iCube/ug

### L3 ToB log_collection + 伪造反馈单（SP:100-102）

- **触发**: `sb()` 仅 `account.scope==SAAS`+token；+60s 首 poll 后 `G=1h`，`next_poll_after_sec` 服务端可调
- **端点**: `POST {$}/trae/gtm/tob/api/v1/log_collection/poll`（x-cloudide-token）→ `{$}/tob-admin/report/create` → `{$}/api/ide/v1/report/pre_signed_url` → PUT presigned `application/gzip` → `{$}/tob-admin/report/log/callback` → `{$}/trae/gtm/tob/api/v1/log_collection/status`（`$`=iCubeApi 去 `/icube`）
- **字段**: poll 消费 `{should_collect,tasks[],next_poll_after_sec}`；`vb()` 造单 `{issue_type:"其他",issue_description:"[ToB Auto Collect] The report was automatically uploaded by the client, batch_id=…, task_id=…",contact_info:account.email,appLog:!0,common_param:{source:"auto_collect",batch_id,icube_uid,user_id,tenant_id,tenant_name,organization,scope,…}}`；presign `{action_type:1,object_keys:["<prefix>.tar.gz"],expires:3600}`
- **服务端收到/范围**: 先以用户邮箱开"其他"类反馈单作载具，再收 tar.gz+状态回报；`vb()` 路径不传 `packCodexSessions`（仅服务端真任务带）；objectKeyPrefix 服务端定、expires 固定 3600s

### L4 SSH-remote 日志回拉（SP:100）

- **触发/端点**: 任务带 `windowId` → `gb()/hb()` 经 `Xk` channel `handleRemoteLogTask`→`downloadLogFile` 拉回 `remote-<taskId>-<win>-<ts>.tar.gz` → 同 imagex（storeKey `remote_` 前缀）→ 同 callback
- **服务端收到/范围**: SSH 远程机日志一并拿走——远程宿主自打包、本地中继、传后删本地副本；范围=远程 packer 自定

### L6 BrowserDataSync cookie jar（WB:7273/1849/1275 · SP:102 · MJ:2179）

- **触发**: `browser_*` 工具遇新 chatSessionId→`downloadAndRestore`；每次动作后 `cb()` 防抖 `bb=2min`→`packAndUpload`；`db()` 三门=`AI.agent.v2.browserDataSync`===true（WB:1275 默认 false）+登录+隐私模式≠On
- **端点**: `GET {remote.domain}/api/remote/v1/browser/data/presign-upload`（resp 带 `encryption_key`）/`presign-download`/`DELETE …/browser/data` → PUT presigned octet-stream
- **字段**: blob=`iv(12)‖ct‖tag(16)` AES-256-GCM（key=服务端 `encryption_key` utf8[:32]）over tar.gz{`cookies.json`[+远端透传 `local-storage.json`]}；cookie `{domain,path,name,value:明文,secure,http_only,same_site,expires}`（`fromPartition($p).cookies.get({})` 无过滤全量）；合并键 `domain|name|path` 本地优先
- **服务端收到**: 开启期间持续镜像登录态——厂商发 key 故 jar 厂商可读：$p 分区全量 cookie（自动化登录过的所有域会话 token 明文）~2min 刷新+每新会话首拉
- **范围**: 默认关+登录+隐私模式三门；>`R$=20MB` 中止；`local-storage.json` 仅远端透传（本构建无本地写入者）；SP:102 `syncUpload` 日志插值未定义 `localStorage`（抛错小 bug）

### L7 chromeDataImport — macOS Chrome cookie 入 $p（SP:102-107 · MJ:2179）

- **触发**: channel `chromeDataImport{discover,importCookies}` 由 Browser Use 导入流程调起；darwin-only `nD()`
- **端点/字段**: 无直接网络——产物写 `$p` 分区（喂 L6）；key 经 `getChromeKeychainPassword`→`security find-generic-password -s "Chrome Safe Storage" -w`；input `{profileId≤128,allowlist≤100×≤253B}`；SQL 拉 `cookies` 全列；`v10`→PBKDF2(saltysalt,1003,SHA1)→AES-128-CBC（IV=16×0x20），dbVersion≥24 校验 sha256(host_key)；输出 `{url,name,value:明文,…}` 批≤50 cookie/≤512KB→`importCookieBatch`→`$p.cookies.set`
- **服务端收到/范围**: 真实 Chrome profile DB（+WAL 快照进 chmod700 tmp）+keychain 密码→明文 cookie 落 $p——L6 同步则上传或 browser-use agent 冒用登录态；realpath 前缀防逃逸、显示名脱敏；caps `sc{25MB,5000 cookie,批≤50/≤512KB}` 但 `j$()` 接 `iCubeApp.browserUse.configImportData` 任意正整数→**服务端可无上限放大**

### L8 uploadFile — 任意文件→imagex（SP:122）

- **触发/端点/字段**: `_g` 绑 `uploadFile`（调用方含 AutoProfiler `K()`）；`upload({filePath})`→basename tar.gz→tmpDir→同 imagex（STS `/icube/api/v1/report/token`）→`{fileUrl}`
- **服务端收到/范围**: 通用外泄原语——进程可读的任意文件均可送厂商存储；`filePath` **零校验**无前缀/范围限制

### L9 driveBoxUpload — 任意文件→调用方域名（SP:122）

- **触发/端点/字段**: `Eg` 绑 `driveBoxUpload`；`uploadFile{uploadCode,uploadDomain,filePath}`→`POST {uploadDomain}/space/api/box/stream/upload/authcode?code=…` octet-stream（<100MB→file_token；≥100MB prepare→block(adler32)→finish）
- **服务端收到/范围**: 任意本地文件发到**调用方自报域名**——客户端只要求 drive-box API 形状；无域名白名单

### L10 inspector — attach 任意 pid（SP:122）

- **触发/端点/字段**: `V4/Sg` 绑 `inspector`；`open({pid})`→`process._debugProcess(pid)||kill(pid,"SIGUSR1")`→CDP `Runtime.evaluate{includeCommandLineAPI,awaitPromise}`；profile 落 `tmpDir/trae/<type>-profile|heapsnapshot/`
- **服务端收到/范围**: 任意 pid 执行 JS+全量 V8 堆快照（内存字符串=token/secret 尽收）——产物距厂商存储只差一次 L8；SIGUSR1 使未 --inspect 进程也可 attach

### L11 AutoProfiler — profile→imagex→profileUrl（MJ:~47-65）

- **触发**: 服务端配置 `iCubeApp.autoProfile.*` 驱动 `g6/w6/v6/b6`；上传走 L8（`filePath` 须 `startsWith(tmpDir)`），报告 `zo.reportCpuProfile` 至服务端下发的 `profileUrl`
- **字段**: cpu `percentCPUUsage` 超阈→`MainThreadCPUProfile`/chrome trace（`chromeTraceDuration:5e3,bufferSizeInKb:30K`）；memory footprint 超阈→memory-infra detailed trace；heap `v8 usedSize∈[v8Min,v8Max]`→heapsnapshot（经 L10）；均落 `tmpDir/trae/autoprofile/`；阈值/`maxTimes` 全服务端调
- **服务端收到/范围**: 按厂商可调阈值自动抓 renderer/扩展宿主 CPU profile、chrome trace、**整堆 V8 快照**（内存全字符串）→imagex→回报对象 URL——可远程强制堆转储；上传路径限 tmpDir 但目标 pid 任意

### L12 telemetry/事件 egress（SP:98/102 · MJ）

- **端点**: `Ek`（channel `telemetryAppender`）5s/20 事件批 `fetch(no-cors)` POST `iCubeApp.telemetryEndpoint|telemetryBatchEndpoint`；`iCubePrivacyEventReporter` 按调用方 url 透传；注册 `POST /icube/api/v1/user`
- **字段**: `Ek` 附 `measurements.{memoryFree,memoryTotal}`+`properties.{common.deviceId,icube.userid|workspaceId,icube.deploymentType}`（`icube-telemetry-0.0.2`）；observability `trae_observability`（RpcSlow `attached_log:JSON(reportData)`、RpcCommandTrace）；disk_usage 各目录字节 `{system,trae_total,trae_logs,trae_db,ckg_*,ai_agent_*,chromium_web_storage,git_ai_*,aha_logs}`；diagnosis `trae_resource_pressure_top_processes` 带 `{进程名,cmdline,pid,ppid}+{cpu,mem}`
- **服务端收到/范围**: 设备关联遥测批+RPC 慢日志 blob+压力期全进程表（**进程名+命令行外泄**）+磁盘目录用量；端点全服务端可配，`piiPaths` 清洗表

### L13 liblogifier_retrieval.so — 原生 Rust 孪生（SO · ELF · MAN）

- **触发**: trae ELF 内嵌 aha `logifier_{host,worker,poll_worker}.cc`，`use_logifier` region/config 门控（默认关、休眠非死代码）→ FFI `logifier_new`/`logifier_start_poll_retrieval_task`
- **端点**: base=`MAN logifierDomain`=icube-normal.trae.ai；`GET /logifier/retrieval/server_time`；`POST /logifier/retrieval/tasks|/tasks/poll|/tasks/ack|/messages|/finish`；上传 `POST /logifier/files[/small]` multipart；头 `x-logifier-token=<task_secret>`
- **字段**: poll `{device_id,user_id,device_model,device_os,request_time_s,timestamp_us}`；任务 `{task_id,task_secret,time_range_s,interval_limit_sec,next_poll_sts,pack_rule{min_alauda_size_bytes,filters[RuleFilter],path_patterns[PackLogPathRule]},command[RunCommand]}`；产物 `log_upload.lgpk|.tar.gz`+manifest `logifier.json{path,create_time,modify_time,filter_out_reason}`；硬编码 key `9BB6JY32EHQA8MM98R8DCDPAZ8J2NFHG9WBQM3KX`
- **服务端收到/范围**: 休眠重炮——`path_patterns` 服务端任意 glob + 正则 `filters` + **`RunCommand` 服务端命令执行**，lgpk 分片上传带 per-part 进度；纯原生→JS 侧窗口/深度/deny 限制均不适用，`time_range_s` 客户端 mtime 窗

### L14 ckg_server（Go）知识库（CKG）

- **触发/端点**: CodeKG 拉起；`{base}/api/ide/v1/knowledgebase/uploadKnowledgebaseFiles`+`/uploadFilesLimitConfig`+`/uploadFileIDs`+`/files/split[_files]`+`/createUserKnowledgebase`+`/embedding_v`+`/retrieveV`+`/compareFullFileIDs`+`/ckg_config`（+entity_rerank/entity_outline_retrieve/report/clientsFileCreated/features）；另有 git upload-pack 会话可传 repo 对象
- **字段**: `file_path,content,files,uri,code_chunk,start_line,end_line,user_id,device_id,app_id,tenant_id,session_id,embedding,split_method,upload_type`；ctx 带 `model.TokenValue` 认证
- **服务端收到/范围**: 用户文件路径+内容+代码块（带行号）+文件 id 列表+embedding；批大小/速率/上限全由服务端 `/ckg_config` 下发

## consent 面

- **零 consent 面**：无任何 `telemetry.*` 设置读取、无命令/菜单/NLS 描述；`product.json` 里 telemetry schema 被剥掉（`enableTelemetry:true` 但设置 UI 无项）
- "Report Issue" 是唯一披露上传的 UI——但**默认全勾选**（System Info/Plugin Info/App Logs），"App Logs" 表述严重低估包内容；且用户触发路径走同一代码——**服务端照样能塞 packCodexSessions**
- `telemetry.feedback.enabled` 键被读取但**从未注册进 settings schema**——实际由服务端/策略推送控制
- 门槛 `storeRegion!==USTTP`：USTTP 是字节内部区域属性（auth 响应下发），国际版用户恒满足 → **等于无门**

## 宣称对照

| 厂商宣称                                                                      | 出处                   | 实际行为                                                                                           | 判定   |
| ----------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| "自动收集设备/网络信息…崩溃报告与性能日志"                                    | 隐私政策               | aLog 管线 10min 服务端驱动打包全量会话日志+竞品转录+服务端指定目录——"诊断信息"低估通用文件外泄通道 | 低估   |
| "User Content"=用户选择输入/生成的信息                                        | 隐私政策               | SSH 远程日志、竞品 IDE 转录、服务端 extraDirs 均非用户"选择输入"                                   | 误导   |
| 数据存于新加坡+马来西亚（范围=美国以外）                                      | 隐私政策               | product.json 硬编码美国端点 `icube-normal.traeapi.us`；USTTP 恰为被豁免人群→美国存储被隐去         | 误导   |
| privacy-mode "limit the use of your information"                              | 隐私政策               | 隐私模式仅门 mssdk/tea 分析 SDK；aLog 管线零隐私模式检查                                           | 误导   |
| "不存储你的实际 codebase 文件"；privacy-mode 可限制                           | ToS §7                 | 索引 lane 窄义成立；aLog tar.gz 持久化 ImageX 且可含嵌入工作区内容的转录                           | 矛盾   |
| 隐私模式开启则聊天/代码不用于分析/训练（登出失效）                            | docs privacy-mode      | 窄义属实——但 aLog 无论登录与否均跑且不受隐私模式影响，文档窄框掩盖                                 | 低估   |
| "Codebase files always remain on your local device"                           | docs what-is-trae      | 索引上传+设备日志管线两条上行直接证伪"always remain"                                               | 矛盾   |
| "Privacy Mode 可限制遥测收集"                                                 | blog 0819              | 最误导公开宣称：隐私模式只门 analytics SDK，重量级 aLog 无门运行                                   | 误导   |
| "数据存于美国、新加坡、马来西亚"                                              | blog 0819              | 与隐私政策"新马/非美范围"直接冲突——证实被隐去的美国存储                                            | 矛盾   |
| "Zero Retention/never stored；No logs retained"                               | enterprise 营销页      | tobActiveCollect 每小时 tar.gz→presigned PUT→callback——企业租户日志确被留存                        | 矛盾   |
| "SOC 2 Type 2 certified"                                                      | enterprise 营销页      | 同二进制伪造用户反馈单（issue_type"其他"+`[ToB Auto Collect]`+用户邮箱）                           | 矛盾   |
| cookie 同步"encrypted end-to-end for security"                                | 包内 i18n              | AES-256-GCM 但 key 由服务端 presign 下发→厂商可解，非真 E2E                                        | 误导   |
| "App Logs: Logs generated during TRAE usage"（默认全勾）                      | Report Issue modal     | 同路径可塞竞品转录/服务端目录；report/create 端点与 ToB 自动 lane 共用                             | 低估   |
| 手动压缩日志"send to the TRAE team"                                           | docs get-logs          | 唯一文档化路径为手动——10min/1h 自动 lane 只字未提                                                  | 未披露 |
| "Report Issue"=用户主动提交                                                   | docs support           | ToB lane 自动以用户邮箱造单——厂商代用户开票                                                        | 未披露 |
| cookies/SDK 追踪技术披露                                                      | cookie 政策            | 仅覆盖 web 追踪；日志管线、竞品转录、原生 .so RunCommand 全未提                                    | 未披露 |
| `enableTelemetry:true`+privacyStatementUrl                                    | product.json           | 声明 URL 为 `https://example.com` 占位符；icube 管线无 telemetry 设置——无可用 consent 面           | 未披露 |
| （无 security/trust 页、无设置项）                                            | 官网沉默               | `telemetry.feedback.enabled` 被读取但未注册 schema——服务端策略控制的幻影开关                       | 未披露 |
| （隐蔽采集能力）                                                              | 官网沉默               | 竞品转录打包、SSH 远程回拉、伪造工单、.so RunCommand——任何政策/文档/UI 均未披露                    | 未披露 |
| "Code files remain on local devices by default…plaintext permanently deleted" | docs ent-paygo         | 企业 SAAS 恰为 tobActiveCollect 目标——日志留存+伪造工单                                            | 矛盾   |
| 堆快照上传 toast 含取消按钮                                                   | nls.messages.json      | 唯一带通知+opt-out 的自动上传（AutoProfiler）——反衬主管线零披露                                    | 如实   |
| .ignore 项"sensitive data remains private"                                    | docs codebase-indexing | 索引 lane 成立；aLog 按目录/模式收集不读 .ignore                                                   | 低估   |

## 通道清单

| 通道                                   | 载荷                                              | 门槛                                       | 判定                 |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------ | -------------------- |
| `/icube/.../log/check` 采集            | app 日志 + 竞品 agent 会话 tar.gz → ImageX        | region≠USTTP（国际版恒真）+ 服务端任务     | **隐藏上传**         |
| ToB `log_collection/poll`              | 同上 + 伪造反馈单                                 | SAAS scope+token                           | **隐藏上传**         |
| liblogifier_retrieval.so               | 服务端指定文件+RunCommand                         | region/use_logifier 门                     | **隐藏上传（原生）** |
| SSH-remote 日志回拉                    | 远程主机日志 tar.gz                               | 服务端任务带 windowId                      | **隐藏上传**         |
| ckg 知识库 `/uploadKnowledgebaseFiles` | 工作区文件内容                                    | 服务端 embedding_strategy                  | 披露失真             |
| BrowserDataSync                        | $p cookie tar（AES-GCM，key 服务端 presign 下发） | 注册设置默认关+登录+隐私模式门（本地触发） | 特性固有（opt-in）   |
| AutoProfiler                           | heap/cpu profile → profileUrl                     | 服务端阈值                                 | 披露失真             |
| 用户 Issue Reporter                    | 日志包                                            | 用户触发（默认全选）                       | 合规但低估范围       |

## 证据锚点

- `sharedProcessMain.js:98-100` — aLog 服务类 Qk/uc、`pullTask`、`packLogs`、`packCodexSessions` 分支
- `trae` 二进制 — `logifierDomain`/`LogifierWorker`/`liblogifier_retrieval.so` dlopen
- workbench `d8t` — 远程日志回拉 `handleRemoteLogTask`/`downloadLogFile`
- desktop-modules 814 chunk — Issue Reporter 默认勾选 modal

## 复核

- ✅ **icube 设备日志管线**（服务端驱动 tar.gz→ImageX→callback、唯一门 storeRegion!==USTTP、无登录/consent）——SP:98-100 逐行复验全中；补强：frontier push/`MESSAGE_CENTER_BACK_LOG` 直入 `Qk.ib` **跳过 action 过滤**（push 需登录，轮询不需要）；`packCodexSessions` 竞品转录扩展坐实
- ⚠️ **BrowserDataSync"远程命令触发的 cookie/localStorage jar 上传≈凭据窃取面"**——部分成立：$p 全量 cookie 明文导出+AES key 服务端下发（厂商可解）属实；但触发为本地（browser_* 首用恢复+动作后 2min 防抖，非远程命令）、门为注册设置默认关+登录+隐私模式、`local-storage.json` 仅远端透传（本构建无本地写入者）——降为 opt-in 特性固有能力，通道清单行已修正；另发现 SP:102 `eg.syncUpload` 日志插值未定义 `localStorage` 会抛错（小 bug）
- ✅ **tobActiveCollect 伪装反馈单**——机制全中：`/tob-admin/report/create` issue_type"其他"+`[ToB Auto Collect]`+`contact_info=account.email`，SAAS scope+token 门，poll 频率服务端可调
- ✅ **liblogifier_retrieval.so 原生孪生**——实质成立：`/logifier/retrieval/*` 独立命名空间但同构（poll→按服务端规则 pack→multipart 上传→ack/finish）；任务模型含 `RunCommand`+`path_patterns`——服务端可推任意命令/glob，能力超 JS 管线；`use_logifier` region 门控休眠非死代码

## 版本考古

**结论**：签名在**可获取的最老构建 1.0.5431（2025-01-20，intl 首发公开稳定版，VS Code 1.95.3 fork）中已存在**——引入早于可获取历史；Wayback CDX 无更早 trae-ai-us 安装包存档，很可能早于公开发布。

| 版本                        | 日期       | 签名 | 备注                                                                                                   |
| --------------------------- | ---------- | ---- | ------------------------------------------------------------------------------------------------------ |
| 1.0.5431 (dmg)              | 2025-01-20 | 有   | 最老可获取构建，check/callback+10min 轮询齐备；**唯一带登录门**；endpoint 硬编码于 product.json        |
| 1.0.12894 (dmg)             | 2025-05-21 | 有   | **登录门移除**（30s 延迟+无认证轮询）；+`onDidFrontinerUploadDeviceLog` WSS 推送（拼写错误）           |
| 1.0.18688 / 1.0.22462 (dmg) | 2025-08/11 | 有   | 同 1.0.12894 画像                                                                                      |
| 1.0.26261 (dmg)             | 2025-12-17 | 有   | **最后一个无区域门**构建（无 storeRegion/iCubeApi/x-icube-device/deviceLog）                           |
| 1.0.27215 (dmg)             | 2026-01-03 | 有   | **首个 stage-2**：`storeRegion!==USTTP` 门 + bootConfig.iCubeApi + action `deviceLog` + RSA 设备指纹头 |
| 1.0.27574 (dmg)             | 2026-01-11 | 有   | 同 stage-2；最后 1.0.x                                                                                 |
| 2.3.12786 (deb)             | 2026-03-09 | 有   | +SSH-remote 回拉 `handleRemoteLogTask`；+原生 `liblogifier_retrieval.so`                               |
| 2.3.73738 (deb)             | 2026-08-12 | 有   | 全签名：+ToB 伪装反馈单 lane + `packCodexSessions` + ImageX token；Frontiner 拼写修正                  |
| 2.3.88407 (deb)             | 2026-09-22 | 有   | 最新；stage-4 签名集不变（`tar.create` 字面量缺失系打包方式不同，无关）                                |

- **门演化**：登录门仅存于 1.0.5431（2025-05 前移除，此后无认证轮询）→ 区域门 `storeRegion!==USTTP` 在 1.0.26261→1.0.27215 窗口加入，但国际版用户恒真，**等于无门**。
- **端点/凭证**：product.json 硬编码 → 服务端 bootConfig.iCubeApi 下发（stage-2）；凭证 x-icube-token → +RSA 加密设备指纹头 `x-icube-device`/`x-icube-did` + ImageX STS。
- **能力扩张**：action `log`→`deviceLog` → +SSH 远程回拉与原生 .so 孪生（2.3.12786）→ +ToB 每小时 lane、伪装反馈单、竞品转录打包（2.3.73738）。
- **consent**：所有版本均无 consent UI/设置项——门全部是服务端侧（任务/区域/scope）或被直接移除。

**边界**：`present ≥1.0.5431`——最老可获取构建即阳性，**不存在 absent 版本**。覆盖缺口：stage-1→2 翻转由 dmg 夹在 1.0.26261→1.0.27215（12-17→01-03）窗口；其间 win32 构建 1.0.26850/26989/27216 为 Inno Setup 无法解包，未探测。
