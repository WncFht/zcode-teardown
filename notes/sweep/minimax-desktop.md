# MiniMax Code Desktop 3.0.73 — 隐藏上传 CONFIRMED

**包/来源**：官方 Windows 构建 3.0.73（JS 与平台无关；`.env.local` 为 prod CN，`NEXT_PUBLIC_DOMAIN_URL=https://agent.minimax.cn`） · **解包**：`agent-teardown/extracted/minimax-desktop/`（app-asar + app-root，~1.2G） · **覆盖**：7 族扫描 + 双镜 verify（refute 镜 `refuted:false`）+ 5 lane 全 `upload_pipeline=true`

## 结论

存在 ZCode 同构的隐藏工作区内容上传，且比 ZCode 更宽。**头条：eval capture 管线**——任何 packaged build + 登录态无条件开启，逐次物理 LLM 调用上传完整请求快照（system prompt + 全 messages + 工具读到的文件原文），外加每会话一次工作区清单与沙箱/goal 事件流到 `agent.minimax.cn`，无开关、无 UI、无远端 flag。次条：工作区索引 zip→OSS 真实存在但默认关，开关文案只说"语义索引"不提上传。

## 上传机制

**eval capture（隐藏，always-on）**：`resolveDesktopEvalCaptureConfig`（`dist/main/modules/local-runtime/index.js:1086-1098`）对任何 packaged build 返回 endpoint；utility 进程 `entry.js:244-258` 硬编码 `enabled:true`；`canReport()` 仅查 `enabled && accessToken`。`runLocalRuntimeEvalTurn` 包裹每个 turn；`beforeLlmCallHook` 在每次物理 LLM 调用前发 snapshot。`/eval/snapshot/report` 收 `{system_prompt, messages 全数组, tools, thinking_level}`（≤16MB）；`/eval/steps/report` 收 user message、tool argsJson/resultJson（=文件原文）、usage、meta_info（每会话一次：工作区目录树 ≤2000 项、git 信息、PATH 可执行清单 ≤2000）；steps 的 runtime_event 还整流上送沙箱策略 before/after、逐条拒绝裁决与 thread-goal 决策。脱敏仅覆盖 credential 形 key——**文件内容不遮**。

**工作区索引（opt-in，披露失真）**：session 开始全量 `workspace.zip`（真文件字节 DEFLATE）+ `manifest.json` → `POST /mavis/api/v1/mcp/workspace-indexing/uploads/presign` → PUT OSS → `revisions/register` → 轮询 status → 下载服务端 embedding 索引；每 turn 增量 revision；`/query-embedding` 发搜索 query 原文。卫生面好于 ZCode：`.git` 排除、~25 种 secret denylist、10k/100MB/10MB 上限、gitignore-aware、仅用户自选项目。但 internal/test build 强制开且忽略 put()。

**加密**：无客户端加密（区别于 ZCode AES+RSA wrap）——全部 TLS 明文；唯一加密的错误上报 key=HKDF(登录 token)，服务端可解。

## 载荷解剖

按外发通道分 lane（3.0.73 asar 静态字节级解剖 2026-09-25；`A/`=app-asar、`R/`=app-root/resources；除标注外默认 `Bearer accessToken` + UA `MiniMaxAgent`、TLS 明文 JSON/字节）。

- **L1 eval-steps 逐轮轨迹**（`A/node_modules/@mavis/local-runtime/dist/eval/*`；`A/dist/main/modules/local-runtime/index.js:1086-1098`）：触发=每 agent turn `runLocalRuntimeEvalTurn` 包裹（host-hooks：beginTurn/beforeToolCall/afterToolCall/assistant 消息/reportUsage）；端点=`POST {DOMAIN_URL}/mavis/api/v1/eval/steps/report`（`X-Mavis-Desktop-Channel: desktop`，10s，会话内串行队列）；字段=steps[]≤16/批 `{seq,step_type,role,content,tool_call_id,args_json,result_json,usage_json,client_produced_ts}` + 每会话一次 meta_info{runtime,system{os,arch,tz,locale,shell},PATH 可执行清单≤2000,workspace{basename,目录树≤2000,按扩展名统计,git branch/commit},config_files} + runtime_event 流（sandbox 策略 before/after、逐条 violation{operation,source,target}、invocation trace、goal 决策，同时进父会话与 verifier 子轨迹）；服务端实收=每个登录会话逐轮的用户消息、工具原始参数/结果（=文件原文）、助手回复、用量，加会话级主机+工作区指纹与沙箱全事件流——足以重建工作区布局、工具链及 agent 触过的每个字节；范围=批≤16 步/≤6MiB、字段截断步≤1MiB、仅 15 个 credential 形 key 打码（文件内容不遮）、meta_info 排除 .git/node_modules 等（50k 文件上限）、event buffer 128/30min、fail-open 静默吞错。
- **L2 eval-snapshot 逐次 LLM 请求快照**（`eval/{snapshot,transport,host-hooks}.js`）：触发=`beforeLlmCallHook` 每次物理 LLM 调用前（含重试，比"每 turn"更频），同 packaged 门；端点=`POST …/eval/snapshot/report`（由 /steps/report 路径重写派生）；字段=`{trajectory_id,seq,snapshot_json:{schema:'mavis.cloud_eval_snapshot.v1',system_prompt,messages 全数组,tools[{name,description,schema}],target_model,thinking_level,turn_id}}`；服务端实收=模型所见完整请求体——system prompt+含工具结果（文件原文）的完整对话+工具定义，逐次调用；范围=≤16MiB，超限整轮跳过不截断，fail-open。
- **L3 workspace-indexing 工作区 zip→OSS**（`local-runtime/dist/workspace-indexing/*`；`local-runtime-v2/dist/service/workspace/indexing.js:34-52`）：触发=session 开始全量+每终态 turn `captureRevisionIfChanged` 增量；门=设置 `workspace-indexing-enabled` 或 internal/test build 强制（put() 被忽略）；端点=`POST …/mcp/workspace-indexing/{uploads/presign,revisions/register,revisions/status,query-embedding}` + presigned OSS PUT；字段=workspace.zip（JSZip DEFLATE-6 真文件字节+sha256 校验）、manifest.json{workspaceId=sha256(realpath),entries:[{path,size,mode,sha256,linkTarget}],archive{sha256,sizeBytes}}、register{revision_id,root_hash,archive_oss_key…}、query-embedding{query 原文→向量}；服务端实收=开启时项目全量字节快照+逐文件指纹清单，每 turn 增量，加语义搜索 query 原文；范围=10k 文件/100MB/10MB、~25 种 secret 文件名/扩展名 denylist + `.env`/`*.key`/`*.pem`/.ssh/.aws/.kube 等 glob 排除、gitignore-aware、仅用户自选工作区、consent 文案只说"语义索引加快搜索"。
- **L4 error-report AES-256-GCM 失败快照**（`local-runtime/dist/error-reporting/*`；`agent-core/dist/pi-turn-runner/metrics.js:667-682`）：触发=每次 LLM 请求失败含每次重试（abort 除外）+运行时错误；reporter 无条件创建（host-factory.js:49-56，连 dev build 登录也跑）；端点=`POST …/minimax-cloud/api/v1/observability/desktop-errors/batch?user_id=<realUserID>`；字段=`{events:[{event_type,occurred_at_ms,code_location,event_log:'v1.<nonce>.<ct+tag>'}]}`——key=HKDF(ikm=accessToken,salt 固定,info=userId)，AAD={event_type,occurred_at_ms}，厂商可解；明文自述"内容不脱敏"{request{api,baseUrl,model,provider,caller},error/providerError 深序列化含 stack/cause/Headers/二进制 b64}；服务端实收=每次失败的端点 URL/模型/provider+未脱敏错误对象；范围=事件>16KiB 丢、batch 20/5s 刷新/200 缓冲、静默丢弃。
- **L5 runtime-metrics**（`shared/dist/metrics-proxy.js`、`local-runtime/dist/runtime/host-metrics.js`）：触发=5s flush 计数/直方图聚合（managed runtime）；端点=`POST /matrix/api/v1/metrics/batch`——**无 Authorization**；字段=`{service:'local_runtime',metrics:[{name,labels{runtimeOwnerKind,appVersion,runtimeMode},value|histogram{count,sum,buckets}}]}`；服务端实收=运营指标（功能计数/延迟分布）带 runtime 种类/版本/模式——纯遥测无内容，端点匿名收；范围=≤1000 指标/批、≤50k series、≤20 labels、3s 超时 429/5xx 重试≤3。
- **L6 log-upload 诊断 zip**（`A/dist/main/ipc/system.ipc.js:294-467`、`modules/oss/index.js`、`utils/extra-log-source.js`）：触发=用户点 upload-log（侧栏/Settings→About/app 菜单）→IPC `SYSTEM_UPLOAD_LOG`→zip→OSS→删本地；端点=`POST /matrix/api/v1/log/upload{device_id,base_file_name}`→presigned PUT；字段=electron 日志（2 天窗口）、runtime 日志 error-context 模式（ERROR/WARN/FATAL±50 行≤5MB）、session artifacts{manifest,display,ledger,snapshot}、cli incidents、diagnostic-manifest.json 逐件清单；服务端实收=过滤后日志 zip（可含路径/命令行/上游 URL/会话元数据）——`messages.jsonl` 明确排除；范围=≤512MB/≤256 文件、仅用户触发。
- **L7 feedback-upload 同轨+全转录**（`system.ipc.js`、`@mavis/session-report/dist/session-report-service.js`）：触发=用户反馈 IPC `SYSTEM_UPLOAD_FEEDBACK_LOG`；端点=同 L6 轨；字段=upload_meta 反馈表单原文 + session report zip 递归打整 session 目录含 **`messages.jsonl` 全文（含工具调用）**、llm-call.json 全量、env-g*.json 快照、task-agent-definition.json；服务端实收=完整会话转录+原始 LLM dump+反馈文本——UX 只标"日志"；范围=仅忽略 .DS_Store、llm-call/、.history-mutation-* 等，symlink/路径逃逸检查在。
- **L8 diagnostic-bundle consent 门**（`modules/diagnostics/electron-diagnostics-provider.js:42-251`）：触发=uploadDiagnosticBundle，`body.confirm===true` 硬门否则 `diagnostic_upload_consent_required`；端点=同 L6 轨；字段=diagnostic-manifest.json（≤2MB）列举的 artifacts{name,path,bytes}；服务端实收=仅清单所列工件；范围=realpath 限 dataDir/diagnostics 内、禁 symlink、文件名黑名单 auth.json/credentials.enc/credentials.json、≤256/512MB、stat.size=manifest bytes TOCTOU 校验、重名拒绝。
- **L9 content-safety 逐轮送审**（`local-runtime/dist/content-safety/{api,api-v2,turn-api}.js`）：触发=每 turn 用户输入+助手流 chunk/thinking/final+config 字段；端点=`POST /mavis/api/v1/content` + `/v2/content?require_auth=true`（10s）；字段=v1`{content_text,scene∈{1,2,3,205,300},files[]}` / v2`{scene:DesktopUserQuery|Thinking|Reply,content_text,image_url,files}`→`{action:Allow|Block|Replace|Guide}`；服务端实收=每条用户 prompt 与模型输出/思考流+引用文件 URL，可阻断或改写回复；范围=v1 local_error/4xx fail-closed、api_error/5xx fail-open，v2 含 5xx 全 fail-closed。
- **L10 ASR 语音转写**（`A/dist/main/modules/local-runtime/asr-proxy-http.js`、`index.js:520-649`）：触发=WS 桥 `/audio/asr/stream`（subprotocol asr.browser.v1）停止时 PCM→WAV；端点=`POST /matrix/api/v1/asr/session_token{provider:'amadeus',region}`→`POST /matrix/asr/audio/transcribe`（Bearer session-token，`audio/wav`→SSE）；字段=WAV 原始字节；服务端实收=麦克风录音原文；范围=需 ASR 配置+登录，时长受上游 session 限。
- **L11 file-upload IPC 任意路径**（`A/dist/main/ipc/file.ipc.js:50`、`modules/file/index.js:60-67,961-978`）：触发=renderer `FILE_UPLOAD{files:[{file_path}]}`；端点=`POST {DOMAIN_URL}/matrix/api/v1/desktop/upload{device_id,base_file_name}`→presigned PUT 原字节；服务端实收=renderer 指定的任意绝对路径文件——**客户端零路径校验**（注释明写路径遍历/敏感文件防护"由 Agent 服务端负责，客户端不进行路径的安全检查"）；范围=无客户端侧约束。
- **L12 matrix-media get_upload_url**（`@mavis/agent-tools/dist/desktop/matrix-media-client.js`）：触发=matrix MCP 工具/website deploy `uploadFile(localPath)`；端点=`POST /mavis/api/v1/mcp/get_upload_url{filename,mime_type,ttl_seconds?,category?,size_bytes}`→PUT 流；字段=文件字节流或 ≤600KB base64 内联；服务端实收=agent/工具选定附件的文件字节；范围=≤500MB、filename 消毒至 `[A-Za-z0-9_-]`。
- **L13 website_deploy 站点发布**（`local-runtime/dist/website-deploy/*`、`agent-tools/dist/desktop/local-website-deploy.js`）：触发=模型可调用工具（描述要求"用户确认"措辞）；端点=get_upload_url→PUT zip→`POST /mavis/api/v1/drive/websites/publish_archive`（或 update_archive）；字段=站点目录 JSZip DEFLATE-6 真字节+`{oss_key,project_name,session_id,watermark_enabled?}`；服务端实收=整站字节+项目名并发布 CDN URL；范围=忽略 .git/node_modules/.DS_Store/.env.*、禁 symlink、≤200MiB、根须 index.html、限 workspace 内。
- **L14 session-handoff 云端接力**（`local-runtime-v2/dist/service/session-handoff/*`）：触发=用户"continue in cloud"：preflight→prepare→artifact PUT→`awaiting_approval` 审批门→native mavis-session-transfer-client 上送批准文件；端点=`/minimax-cloud/api/v1/session-dispatch/{preflight,prepare,resolve}` + artifact ticket PUT（origin 钉死 baseUrl）+ `…/sync{selected_paths}`；字段=prepare{checkpoint{turn_count,last_message_id},session_spec,artifacts[{kind,sha256,size}],workspace manifest}、imported_history=**单条摘要消息**（非全史；兜底=末≤12 条各截 400 字符）、file_manifest{files:[{relative_path,sha256,size,sensitive}]}（顶层恰 4 key）；服务端实收=handoff 摘要+目标串+用户批准的精确文件集字节+设备/会话 id；范围=显式审批门、未批准敏感路径 args 替换 `{redacted:true}`、artifact 端点 origin-pinned、native stdout ≤64KB。
- **L15 connector upload_temp_url**（`R/resources/mcode-tools/cli.mjs:23188-23900`）：触发=`mcode-tools upload-temp-url <file>`（CLI/MCP 可调）；端点=`POST /minimax-cloud/api/v1/connectors/tools/call{provider,runtime_tool_name:'connector__matrix__upload_temp_url',arguments_json:{filename,mime_type}}`→服务端签名表单→multipart POST 到指定 upload_host（强制 https）；服务端实收=broker 指定的 provider host 收用户/模型选文件字节；范围=≤100MB、--video-reference ≤50MB mp4/mov 时长 2-15s 探测。
- **L16 remote-control 配对桥**（`@mavis/remote-control-bridge/dist/*`、`local-runtime/dist/files/api.js:219-230,884-928`）：触发=显式配对（POST pairing/code→60s 一次性 ticket→wss connect）后 vendor relay 路由 `cmd.*` 进本地 daemon（`X-MCode-Request-Source: remote-control`）；端点=`/minimax-cloud/api/v1/remote-control/*` + `wss://<endpoint>?binding_id&ticket`；字段=`cmd.session.history`→`{messages_json=AgentMessageProtocol[] 全转录含工具调用}`、~16 路由（session/workspace/projects/model/pinned/permission/skill）、文件拉取 `GET /file/content{text|base64}`≤10MB、手机附件落 userData；服务端实收=配对手机经 vendor relay 明文读全转录、枚举工作区/项目/模型、发 prompt、答权限提示、拉任意工作区文件；范围=需显式配对+每连接一次性 ticket，超限 413。
- **L17 observability outbox→Guance RUM**（`A/dist/main/modules/observability/outbox.js`、chunk 94604）：触发=主进程探针（crash/renderer-gone/child-gone/unresponsive/session-end/utility-runtime/updater）入队 `userData/observability-outbox.jsonl`→renderer 经 `datafluxRum`；端点=`rum-openway.guance.com`（applicationId mavis_web，sessionReplay=0）；字段=枚举化 allowlist{platform,arch,reason,process_type,error_type,app_version}——无路径/消息/文件内容；服务端实收=崩溃/生命周期遥测带粗粒度枚举标签（第三方 Guance）；范围=≤200 事件/5MB、home 目录打码、beforeSend 遮 URL。
- **L18 sensors/meerkat 点击流**（chunk 94604）：触发=Sensors SDK autoTrack+heatmap/clickmap+login(userId)；端点=`data.hailuoai.com/meerkat-reporter/api/report?project=MiniMaxAgent`（intl `data.hailuo.ai`；test bigdata-test.*）；字段=点击流+点击坐标+公共 props{current_url,referrer,project_name,web_device,os,browser,version_tag}+hailuo_user_id/userId；服务端实收=UI 行为埋点+设备指纹+登录态 id（工作区 basename 可随 current_url 泄漏）；范围=dist/main 与设置均无 opt-out。
- **L19 renderer private upload（最严校验）**（chunk 90321 module 64045）：触发=renderer 附件/头像/反馈等选文件；端点=`POST /minimax-cloud/api/v1/uploads/prepare{purpose:int1..8,file_name,mime_type,size_bytes}`→multipart POST 到返回 url；字段=文件字节+服务端表单——客户端**先校验后上传**：object_key 须 UUID v1–v5、url 仅 https 且 hostname ∈ 硬编码 OSS 白名单（matrix-internal-cn/us-east-1）、根路径、form_fields 逐项全等（key=object_key、acl=private、forbid-overwrite=true、meta-mxa-{size,purpose}、签名齐备）否则 throw；服务端实收=用户选附件字节落私有 acl 对象键；范围=全 app 校验最严上传路、credentials:'omit'、600s。
- **L20 renderer legacy STS 直传**（chunk 90321 module 38699）：触发=renderer 旧式上传路；端点=`GET /v1/api/files/request_policy`→真 OSS STS 直传桶→`POST /v1/api/files/policy_callback`；字段=STS{accessKeyId,accessKeySecret,securityToken,bucketName,dir,expiration}（到期前 1h 自刷）+文件字节（≥1MiB 分片 ≤6 并发）+callback{originFileName,size,mimeType,fileMd5 全文 MD5}；服务端实收=renderer 握真 STS 凭证推文件全文+MD5+原文件名；范围=客户端强制 STS 过期。
- **L21 misc 控制面+placebo 开关**（chunk 94604）：触发=renderer 指标事件/设置切换；端点=`POST /matrix/api/v1/metric/report`（透传）+ `GET/POST /matrix/api/v1/user/{get,update}_data_contribution_setting`；字段=metric payload+`{data_contribution:boolean}`；服务端实收=小指标+服务端布尔——**placebo**：该字段全 bundle 零行为消费（仅 3 个 renderer chunk 引用，GET 回读只为渲染开关），真正的内容外发（eval capture）无任何开关；范围=见宣称对照。

## consent 面

- "加速索引"开关真实管索引上传，但文案只说"生成语义索引加快搜索"——不提 zip 上云（ZCode 式 understatement）。
- "Help improve our services / 数据用于优化体验"是 **placebo**：唯一提"你的内容"的开关只写服务端 `data_contribution` 字段，客户端零引用。
- eval capture / 错误上报 / 运行时指标 / 神策埋点 / 内容安全审查：**零 consent 面**，设置里无对应项。隐私政策 §1.7 仅泛泛提"对话指令收集"。

## 宣称对照

| 厂商宣称                                                                             | 出处                                                                      | 实际行为                                                                                                                                                  | 判定   |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| "生成语义索引加快搜索"（索引开关文案）                                               | 设置项 `workspace-indexing-enabled`（`workspace-indexing/preference.js`） | 开启即 workspace.zip 真文件字节+manifest→OSS，每 turn 增量+query 原文；internal/test build 强制开                                                         | 误导   |
| "Help improve our services / 允许我们将你的对话内容用于优化 MiniMax Code 的使用体验" | 设置页 `data-contribution-setting`（chunk 87074，文案 chunk 60554）       | 仅写服务端 `data_contribution` 字段；全 bundle 仅 3 个 renderer chunk 引用、零行为消费；GET 非布尔时默认按 true 渲染（opt-out 姿态）；eval 上传不受其门控 | 误导   |
| 隐私政策 §1.7 泛泛"对话指令收集"                                                     | 隐私政策                                                                  | eval capture 实收完整 LLM 上下文+工具读到的文件原文+工作区目录树+PATH 可执行清单+沙箱/goal 事件流，远超"对话指令"                                         | 低估   |
| （沉默）eval steps/snapshot、错误上报、metrics、埋点                                 | 全部公开口径+设置项                                                       | 无任何 UI 串、设置键、远端 flag 或政策条目对应这些上传管线                                                                                                | 未披露 |
| "上传日志"入口文案                                                                   | 侧栏/Settings→About/app 菜单（`system.ipc.js:294-467`）                   | 日志路确为过滤日志 zip 且排除 messages.jsonl；反馈路同轨却打整 session 目录含完整转录+llm-call.json                                                       | 低估   |
| website_deploy 工具描述要求用户确认                                                  | 工具定义（`agent-tools/dist/desktop/local-website-deploy.js`）            | "确认"仅是 prompt 措辞无硬门；模型可发布整站字节至厂商 CDN                                                                                                | 低估   |
| event_log 加密注释"Gateway 必须使用相同的 HKDF 参数派生密钥"                         | `error-reporting/crypto.js:17-18`                                         | 自述服务端可解：key=HKDF(ikm=accessToken)，同一 token 作 Bearer 随请求上送——加密仅抗网络窃听不抗厂商                                                      | 如实   |

## 通道清单

| 通道                                                        | 内容                                                 | 门槛                       | 判定                     |
| ----------------------------------------------------------- | ---------------------------------------------------- | -------------------------- | ------------------------ |
| eval capture `/mavis/api/v1/eval/{steps,snapshot}/report`   | 完整 LLM 上下文 + 文件原文 + 工作区清单              | 登录即开，无开关           | **隐藏上传**             |
| 工作区索引 `…/workspace-indexing/*`                         | workspace.zip + manifest + 增量 + query              | 默认关；internal/test 强制 | feature-upload，披露失真 |
| 错误上报 `…/desktop-errors/batch`                           | LLM 失败深快照（明示不脱敏）≤16KiB                   | 无条件，登录即发           | 隐藏遥测（窄）           |
| 运行时指标 `/matrix/api/v1/metrics/batch`                   | 计数/直方图                                          | 无条件                     | 隐藏遥测                 |
| 神策+Guance RUM                                             | 点击流 + 工作区目录 basename + 4KB 错误              | 无 opt-out                 | 隐藏遥测（第三方）       |
| 内容安全 `/mavis/api/v1/content`                            | 每轮 input+ 输出流                                   | 无条件 fail-closed         | 托管固有可辩解           |
| 日志/反馈 `/matrix/api/v1/log/upload`                       | zip；反馈路径含完整 `messages.jsonl`+`llm-call.json` | 用户触发+confirm           | 合规但文案只说"日志"     |
| Cloud Handoff `session-dispatch/*`                          | 用户勾选文件包                                       | 显式审批                   | 合规                     |
| agent 工具 `/mavis/api/v1/drive/*` UploadPrepare→PUT→Commit | COMMAND_SCHEMAS/HANDLERS 已注释——**模型不可调用**    | 死代码                     | 不可达（见复核）         |
| 远程控制桥 `remote-control/*` + WSS                         | 配对手机经 relay 拉文件内容                          | 显式配对                   | 披露，vendor 明文        |
| ASR `/matrix/asr/audio/transcribe`                          | ≤500s WAV                                            | 配置 + 登录                | 披露                     |
| BYOK                                                        | chat → api.openai.com 等                             | 用户自配                   | 合规                     |

域名对：prod CN `agent.minimax.cn` ↔ intl `agent.minimax.io`；staging `matrix-*.xaminim.com`；账号 `account.minimax.cn/.io`；埋点 `data.hailuoai.com`（神策）、`rum-openway.guance.com`。

## 证据锚点

```
dist/main/modules/local-runtime/index.js:1086-1098        eval endpoint 解析
dist/main/modules/local-runtime/utility/entry.js:244-258  evalCapture enabled:true
node_modules/@mavis/local-runtime/dist/eval/{transport,snapshot,reporter,payload,host-hooks}.js
node_modules/@mavis/shared/dist/eval-meta-info.js:77-130
node_modules/@mavis/local-runtime/dist/workspace-indexing/{capture,remote-worker,remote-client,scanner,workspace-archive-writer}.js
node_modules/@mavis/local-runtime-v2/dist/service/workspace/indexing.js:34-52
node_modules/@mavis/local-runtime/dist/error-reporting/{crypto,reporter,matrix-api-client,error-snapshot}.js
dist/main/ipc/system.ipc.js:294-467
node_modules/@mavis/session-report/dist/session-report-service.js:112-196
node_modules/@mavis/agent-tools/dist/cloud/mavis/upload.js
```

完整版：`agent-teardown/reports/minimax-desktop-verdict.md`。

## 复核

对抗性复核（2026-09-25，3 条 claim 全部自 3.0.73 asar 重新推导）：

- ✅**确认**——eval capture 上传完整 LLM 上下文+文件原文+工作区指纹，门槛=packaged+登录：live 路径为 v2 runtime 内嵌 v1 host（`entry.js:155`→`runtime.js:129`→`host-factory.js:46-48`→`local-agent-turn-runner.js:28`），`onLlmCallPreparedHook` 逐次物理 LLM 调用发 snapshot（`eval-reporter.js:77-107`、`agent-core turn.js:88,107-163`）——比"每 turn"更强；`enabled:true` 硬编码、`canReport()` 仅查 token。两处精确化：工作区 meta_info 为**每会话一次**（metaInfoQueued），非每 turn；snapshot >16MiB 整轮跳过。上文 结论/上传机制 已修正。
- ✅**确认**——"Help improve/数据用于优化体验"是 placebo：写服务端 `data_contribution`，全 bundle 仅 3 个 renderer chunk 引用（94604 API、87074 store/UI、60554 i18n），dist/main 与 node_modules/@mavis 零引用——无任何行为被其门控。一处不精确：客户端确有 GET 回读，但仅用于渲染开关位置；store 对非布尔响应默认 true（opt-out 姿态）。
- ✅**确认**——错误上报加密不防厂商：`hkdfSync('sha256', accessToken, 'mcode-desktop-event-log-v1', userId)`，同一 token 作 Bearer 随 `/desktop-errors/batch` 上送；代码注释自述"同一个 token 同时用于请求认证和上游派生 event_log 密钥""Gateway 必须使用相同的 HKDF 参数派生密钥"（`crypto.js:17-18`、`matrix-api-client.js:53-54`）。
- ❌**推翻**——"drive files upload 模型可调用"不成立：`/mavis/api/v1/drive/*` UploadPrepare→PUT→Commit 的 COMMAND_SCHEMAS/HANDLERS 已被注释（`agent-tools` schemas.js:316-320、dispatcher.js:77-80），属死代码；通道清单相应行已改判"不可达"。
- 增补（本轮解剖新发现）：`/matrix/api/v1/metrics/batch` 无 Authorization（匿名收）；file-upload IPC 客户端零路径校验（注释委托服务端）；`messages.jsonl` 日志路排除但反馈路全收——同轨不同披露；eval steps 的 runtime_event 还外发整条沙箱 observability 流（策略 before/after、逐条拒绝裁决）+ goal 决策至父/verifier 双轨迹。

## 版本考古

**结论**：隐藏上传签名首现于 **3.0.58（2026-08-04）**；release 列表中其前一版 3.0.57（2026-07-30）签名全无。

| 版本   | 安装包日期 | 签名   | 备注                                                             |
| ------ | ---------- | ------ | ---------------------------------------------------------------- |
| 1.0.0  | 2026-01-19 | 无     | 全部特征字面量 0；local-runtime 模块尚不存在                     |
| 3.0.34 | 2026-06-01 | 无     | 字面量 0；模块仍缺席                                             |
| 3.0.53 | 2026-07-21 | 无     | `@mavis/local-runtime` 已存在，但 eval-capture 字面量全 0        |
| 3.0.57 | 2026-07-30 | 无     | asar 无 `dist/eval/`、无 `host-eval.js`                          |
| 3.0.58 | 2026-08-04 | **有** | 首现；快照作 runtime_event 走 steps/report，无独立 snapshot 端点 |
| 3.0.59 | 2026-08-05 | 有     | 同 3.0.58 特征画像                                               |
| 3.0.60 | 2026-08-06 | 有     | `eval/snapshot/report` 仍为 0                                    |
| 3.0.62 | 2026-08-12 | 有     | 专用 `/eval/snapshot/report` 首现（dmg；3.0.61 不在列表）        |
| 3.0.63 | 2026-08-12 | 有     | 含 snapshot 端点                                                 |
| 3.0.73 | 2026-09-18 | 有     | gate 逻辑与 3.0.58 字节级一致；新增 snapshot.js 构造器           |

- **gate 零演化**：`resolveDesktopEvalCaptureConfig` 在 3.0.58 与 3.0.73 相同——packaged + 登录是唯一事实门槛，`enabled:true` 硬编码，从不读 flag/设置/consent。
- **consent 零演化**：3.0.73 全量 grep `out/`+`dist/main`，evalCapture 无 UI 串、无设置键、无 renderer 引用。
- **范围演化**：3.0.58–3.0.60 快照作为 runtime_event 步进发 `/eval/steps/report`；3.0.62 起独立 `/eval/snapshot/report`（transport.js 路径重写派生）。工作区 meta_info 自引入即有。
- **宿主先于功能**：`@mavis/local-runtime` 3.0.53 已在；eval capture 是 3.0.58 注入既有模块，非随模块首发。

边界：**缺席 ≤3.0.57（2026-07-30），存在 ≥3.0.58（2026-08-04）**——release 列表相邻条目，已是最紧可钉位。缺口：3.0.20–3.0.23、3.0.41、3.0.71 为 dmg-only 未探测（均在边界区外）。方法：逐版本下载安装包（NSIS 7z 解 / dmg）后 `rg -a -F` 直扫 app.asar。
