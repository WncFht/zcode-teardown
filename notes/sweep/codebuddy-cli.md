# CodeBuddy CLI 2.157.0（腾讯 `@tencent-ai/codebuddy-code`）— 隐藏上传（服务端遥控日志管线）

**包**: npm `@tencent-ai/codebuddy-code` · **解包**: `extracted/codebuddy-cli/package` · **覆盖**: 全链（acq + 7 扫描 + 双镜 verify + 5 lane）

## 结论

**隐藏上传确认——纯服务端遥控的收集→打包→凭证→上传→回报管线**，结构上与 ZCode 完全同构（collect → zip → COS STS 凭证 → `putObject` → `informUploadResult`），差别只在载荷是**日志文件**而非工作区 tar、走腾讯 COS 而非 OSS。代码存在于全部三个入口（`dist/codebuddy.js`、`codebuddy-headless.js`、`codebuddy-lite-wb.mjs`）和 `dist-server/6929.codebuddy.js`，但仅 `dist/codebuddy.js`（TUI 默认路径）打包真实 archiver/COS 实现——dist-server 与 headless/lite-wb 变体中为空桩模块，武装后只能轮询并回报 `failed`。

## 上传机制

1. **触发（全远端）**：启动时 `@PostConstruct` 订阅 `productManager.configuration`（`GET /v3/config` 拉取的服务端推送配置）——`log.upload.interval>0` 就武装循环定时器；每拍 `doCheckAndUpload` 轮询厂商任务队列 `GET /v2/logs/upload_task/check`（硬编码 HMAC key `"log_collection_secret_key"` 签名），按服务端入队任务执行 `upload(allWorkspaces:true)`。_*任何 product*.json 里都没有静态默认值——启用与否完全由服务端推送决定。_*
2. **收集**：`LoggerStorageService.retrieve` → `collectLogFiles`（每个工作区的 `basename__md5.log`，`allWorkspaces=true` 时扫**所有**工作区；每个文件头部带字面量 `Workspace Path: <绝对路径>`）+ `collectExtraFiles`（任意路径打包原语——但其输入 `LoggerExtraUploadPathsProvider` 在本包**零实现**，服务端不可达，属休眠扩展点）+ `collectExtraLogPaths`/`collectRecentIdeLogFiles`（默认开，递归扫 `~/.workbuddy/logs`、`~/Library/Logs/WorkBuddy`、CodeBuddyExtension 等**他产品**日志目录，mtime<24h、无扩展名过滤——真实越界面在此）。
3. **打包**：vendored archiver zip（zlib-9）→ `os.tmpdir()`。
4. **凭证**：`GET v2/logs/upload_credentials` → `{bucket,region,url,credential:{tmpSecretId,tmpSecretKey,token}}`——与 ZCode `/snapshot/upload-credential` 同角色的服务端硬门。
5. **上传 + 回报**：`cos-nodejs-sdk-v5 putObject` 直传厂商桶 `<base>/<userId>/<zip>` → `PUT v2/logs/upload_task` 回写 downloadURL。

## 载荷解剖

按外发通道分 lane（静态字节级解剖 2026-09-24；`6929`=dist-server/6929.codebuddy.js，`dist:`=dist/codebuddy.js）。

- **日志管线 `v2/logs/*`→COS**（`6929:221-225`）：触发=init 订阅远端配置 `interval>0` 武装轮询 `GET v2/logs/upload_task/check`（HMAC key `log_collection_secret_key`）→按任务 `upload(last(1),{allWorkspaces:!0})`；端点=`GET v2/logs/upload_credentials`→STS→`putObject`→`PUT v2/logs/upload_task?state=<hmac>`；字段=check 签名参数{clientType,platform,uid,timestamp,state}、zip 内 `logs/<date>/<ws>__<md5>.log`（首行字面量 `Workspace Path: <abs>`）+`extra/*`、回报{taskId,status,downloadURL,errMsg}；服务端实收=每任务拿到该用户**全部**工作区日志+他产品 24h 日志 zip 落自家 COS 桶并收 downloadURL 回报；范围=`allWorkspaces:!0` 且**无 maxRawSize 上限**、跨产品目录递归 mtime<24h 无扩展名过滤、`extraUploadPathsProvider` 为未实现 DI socket（见复核）。
- **Galileo KMS"加密" OTLP 遥测**（`dist:1677,514,1,2983`）：触发=远端 `galileo.enable===true`+`!DISABLE_TELEMETRY&&!DISABLE_GALILEO`；端点=`POST /v1/{traces,metrics,logs}`+`{aegis}/collect`，KMS `galileotelemetry.tencent.com/kms/generateDataKey`，body=gzip→base62→AES-128-ECB(base64)，头 `Encrypted: galileo-<RSA包裹DEK>`；字段=**无条件** span 属性 file.path、command（Bash 全文）、http.url、search.query、agent.prompt（全文）、mcp.{server,tool,input 全JSON}、tool.response_*/error≤500B、model.id/session/conversation/message ids；env 门控（默认关）tool_input/tool_result≤60KB、`llm.input.messages`≤32KB（需 `OTEL_SEMCONV=agentlens`）；服务端实收=DEK 由厂商 KMS 自签——"加密"只是信封混淆，collector 明文读到每个工具调用的路径/命令/URL/查询/MCP输入/子代理 prompt+每请求模型元数据；范围=重内容默认关，但路径命令类**无条件**流，用户只能靠 `DISABLE_GALILEO`/`DISABLE_TELEMETRY` env 阻断。
- **标准+模型事件上报 `/v2/report`、`/llm/data/report`**（`dist:2983`）：触发=事件入队 FIRE_DELAY=2s 批量 POST，门=`!DISABLE_TELEMETRY`+远端 `telemetry.report.standard.enabled`（product.json 默认 true）；字段=事件对象{eventCode,timestamp,reportDelay,...payload}含 codeDiff/交互码；服务端实收=按 X-User-Id/X-Enterprise-Id/X-Department-Info/X-Tenant-Id/X-Domain 头归属的命名事件批；范围=eventCode 词表服务端定义，字段集可随意解释。
- **摩擦召回 `/agenttool/v1/intent/recall`**（`dist:1806`）：触发=远端 `productFeatures.ChatPromptFrictionAnalysis===true`——**唯一门，显式绕过 DISABLE_TELEMETRY**，3s 超时 fire-and-forget；字段=body{query:**当前用户 prompt 全文不截断**}；服务端实收=每次提交的完整 prompt（含粘贴的代码/密钥），名义"摩擦分析"；范围=无任何本地开关。
- **运行时安全审计 `/v1/runtime-proxy/audits`**（`dist:891`，配置 `dist:47`）：触发=远端 `clientSecurity.config.runtimeSecurity` 在 prompt/toolCall/toolResult 拦截点发审计，出错 fail-open；字段=scene、metadata{sessionId≤128B,requestId≤1KB}、history 5×{role,content≤8KB}+当前 prompt、context{cwd≤8KB}、resolvedFiles[{path,content≤32KB}——**工具触及文件的原始字节**]、action{name,params≤32KB,result≤32KB}；服务端实收=会话尾+cwd+工具 I/O 全文+工作区文件原文（Read/Write/Edit 即文件内容），包装成安全扫描；范围=逐项截断 cap 如上，fail-open 不阻断调用，客户端不决定哪些文件进 resolvedFiles。
- **沙箱云审计 `xti.qq.com/api/v4/claw/audit`**（`dist:639`）：触发=post_exec_safety_filter 升级路径 fire-and-forget；端点=agentdr SDK cloud/observe，**硬编码共享 Bearer `6dapj60h…`**（env `AGENTDR_AUDIT_TOKEN/ENDPOINT` 可换）+X-Device-Id；字段={session_id,agent_id,conversationRequestId}、context{cwd,os,shell,sandbox版本}、action{exec,command:**完整命令串**}；服务端实收=每条被安全过滤升级的 shell 命令原文+cwd+设备/会话 id；范围=仅升级路径非逐命令，独立 env `CODEBUDDY_SANDBOX_CLOUD_AUDIT_DISABLED` 关闭，不查 DISABLE_TELEMETRY。
- **知识库分享 `uploadToKnowledge`→`workbuddy.link` 公开 URL**（`dist:2123`）：触发=模型工具上传用户命名的本地文件（仅 CN/iOA，intl 端点被 isInternationalEndpoint 挡）；端点=`POST space/api/view/import/uploadCredential`→PUT 原始字节→`importLocalFileAsync{supportShare:!0}`→轮询→兜底 `permission/set-permission{public:{role:'reader'}}`；字段=文件名/大小、文件原文、sha256 回报；服务端实收=任意可读本地文件全文入厂商存储并铸**公网可读** `workbuddy.link/p/` 链接；范围=路径由模型给出无扩展名/位置白名单，`supportShare` 硬编码 true。
- **语音转写 presign+`wb-asr`**（`dist:2117`）：触发=语音输入；端点=`POST /v2/as/support/presigned_url{object_keys:[uploads/<ts>-<rand>-<basename>]}`→PUT 音频原文→`/v2/async/tasks/create{model:'wb-asr',audio_url}`→轮询≤900s；服务端实收=音频 blob 落厂商对象存储（服务端命名、原文件名泄漏进 key）留存供 ASR；范围=Bearer 鉴权。
- **远端配置 `GET /v3/config?repos[]=`**（`dist:2971,2980`）：触发=每次 product-config 拉取（启动+刷新）；字段=**每个** git 仓库的 remote URL（GitInfoCollector 向上扫父目录+向下递归 maxDepth、批量10，跳 .git/隐藏目录；`CODEBUDDY_GIT_REPO_SCAN_DISABLED` 可关，默认扫描）；服务端实收=每次轮询获知工作区**及周边**全部仓库 remote（org/user/主机名=组织仓库清单），并回传武装其余所有通道的 flag；范围={url,branch,projectPath,isSubmodule} 中仅 url 上线。
- **休眠门 `skill-upload-policy/user-check`**（`6929:221`）：服务类完整实现（1.5s 超时/5min 缓存/30s fail-open，响应{allowed,policy_mode,max_size_bytes=10MB,require_review}），**2.157.0 零调用点**——待激活死代码；同族 connector-upload-policy、member-custom-model-policy；服务端实收=当前无流量，但按用户/企业授权门控 skill 上传的管线形状已备。
- **企业微信 AI-Bot 分块媒体 `wss://openws.work.weixin.qq.com`**（`dist:700,2141,390`）：触发=模型工具 `WeComReply`（**needsApproval=!1**，bot 连接即启用）接受 file_path/file_url/image_url；帧=aibot_subscribe{bot_id,secret}→aibot_upload_media_init{filename,total_size,md5}→chunk×N（base64，≤100×512KB≈50MB）→finish→aibot_send_msg{chatid,msgtype,media_id}；服务端实收=模型决定的任意≤20MB 本地文件或 fetch 来的远程 URL（file_url 为 SSRF 形）经 base64 分块流入指定 WeCom 会话；范围=模型决策到文件外发间无人工门，chatid 路由来自入站 platformData。
- **微信 iLink/KF CDN `novac2c.cdn.weixin.qq.com` AES-128-ECB**（`dist:683,672`）：触发=客服通道收发；端点=getUploadUrl{filekey,rawsize,rawfilemd5,**aeskey**,to_user_id}→PUT `/c2c/upload` 密文；服务端实收=**密文+密钥同握=等效明文**媒体，绑定 to_user_id；入向服务器 aes_key 本地解密后喂模型，临时文件落 `os.tmpdir()/codebuddy-wechat-media`；范围=凭证门控（iLink 凭据）非遥测门控，文件大小客户端无约束。
- **企业微信网关 REST `qyapi.weixin.qq.com/cgi-bin/*`**（`dist:785`）：触发=env `CODEBUDDY_GATEWAY_WECOM_{CORP_ID,CORP_SECRET,AGENT_ID}` 配置启用；端点=gettoken（**corpid+corpsecret 走 query**）→message/send{touser,agentid,text}→media/upload multipart≤20MB；服务端实收=corp secret 作 URL 参数（代理日志可见）+文本/媒体字节；范围=运营者配置的授权通道、非隐藏遥测，但文件体过腾讯服务器。

## consent 面

- 整个链路**零本地 consent**：无设置项、无 UI 提及；`--serve` 是唯一跳过 init 的路径。
- `FileLogger.getLevel()` 读同一远端配置——**厂商可先远程把日志级别调到 Debug/Verbose 再下发上传任务**（先放大采集面再收割）。
- 附带发现：`WBEA1/asym-v1/$wbEncrypted` 静态加密产物 AES-256-GCM + 双层 wrap（userWrap 本地 + **developerWrap RSA-OAEP-256 到厂商 RSA-3072 公钥**），本地打开路径从不解 developerWrap——被跨产品日志收集扫到的任何 `$wbEncrypted` blob 厂商都能开。

## 宣称对照

证据快照：`agent-teardown/evidence/codebuddy-cli/disclosure/`（含 INDEX.md）；判定=宣称与二进制行为的差距。

| 厂商宣称                                                                                                      | 出处                                                                    | 实际行为                                                                                                                                                             | 判定      |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| "strict read-only permissions by default…only has the permissions you grant it"                               | security.md:13,30（随包+codebuddy.cn/docs/cli/security）                | 日志管线绕权限模型：`allWorkspaces` 扫全部工作区+跨产品目录递归收割，零提示（lite-wb:2511）                                                                          | 误导      |
| "Network Request Approval：网络请求工具默认需用户批准"                                                        | security.md:54                                                          | `/v3/config`、upload_task 轮询/回报、COS putObject 全由服务端遥控发起，无批准环节                                                                                    | 误导      |
| "Privacy Protections——详见 ToS/隐私政策"；IDE/troubleshooting 把日志说成"用户手动发送/附上"                   | security.md:43-50；troubleshooting.md:106-112；IDE FAQ                  | 两份政策均未披露服务端遥控 zip→COS 管线；实际无人值守 collect→zip→上传                                                                                               | 低估      |
| "DISABLE_TELEMETRY=1 has the highest priority and disables all telemetry"                                     | monitoring.md:184；env-vars.md:215,236                                  | 只门控 OTel/Galileo 与 standard report；日志上传从不读该变量，纯服务端 `log.upload.*` 武装                                                                           | 误导      |
| "Spans 默认不记录敏感信息（prompt/工具参数/输出）"                                                            | monitoring.md:44,197                                                    | 默认属实，但同一远端配置可先 `FileLogger.getLevel` 远程调级放大再整文件收割；`galileo.enable` 一开 file.path/command/URL/查询/MCP输入/子代理 prompt 即**无条件**上报 | 误导      |
| FAQ"上报仅 OTel 与 standard 两条独立通道"                                                                     | monitoring.md:205-207                                                   | 存在第三条未披露且最大的通道 `v2/logs/upload_*`+COS                                                                                                                  | 低估      |
| "用户反馈仅用于产品改进，不用于模型训练；保存 30 天"                                                          | 包内 README.md:20-22                                                    | 仅覆盖 /feedback；隐私声明 §2.6.3(4) 自述脱敏后用于模型优化（需主动联系客服关闭）；日志管线只字未提                                                                  | 低估      |
| "记录使用信息（但不会包含进入该服务后的操作）" §2.6                                                           | qq 隐私声明（privacy.qq.com）                                           | 工具调用/命令/文件读写逐条落工作区日志并可被远程收割；§2.6.1 又自述收集"操作记录"——自相矛盾                                                                          | 矛盾      |
| §2.6.2 日志数据=设备信息+事件级遥测枚举（qq/cn 两版同口径）                                                   | privacy.qq.com；codebuddy.cn/privacy                                    | 实际打包整份日志文件（绝对路径头+全工作区+他产品目录）直传，远超枚举                                                                                                 | 低估      |
| "本地操作……不会收集您的信息" §2.6.4(1)                                                                        | qq 隐私声明                                                             | 本地工具执行落日志并经服务端遥控直传厂商 COS                                                                                                                         | 矛盾      |
| "代码完全由您所有及控制……不用于未经授权场景" §2.7.3                                                           | qq 隐私声明                                                             | 收集面由服务端单方面决定（任务队列+远端调级），日志可携带代码上下文                                                                                                  | 误导      |
| "境内存储、目前不跨境传输或存储" §6.2                                                                         | qq 隐私声明                                                             | 境内 COS 上传表面不冲突；但日志通道未披露，承诺覆盖范围存疑（国际站走新加坡）                                                                                        | 如实      |
| §7.2"在您授权同意的情况下使用终端权限/资源"                                                                   | codebuddy.cn/agreement（cloud.tencent.com/document/product/301/106125） | 无人值守收割不经任何授权环节，"授权同意"前提被架空                                                                                                                   | 误导      |
| §9.4 输入/输出脱敏后授权用于模型优化，可经客服关闭                                                            | 同上                                                                    | 如实告知授权与退出路径（与 README"不用于训练"口径有张力）；未涉日志上传                                                                                              | 如实      |
| "Operation Log/Log data"元数据级枚举；§3.4 远程收集限定反作弊场景                                             | codebuddy.ai Privacy/DPSA/Service Agreement                             | 原始日志 zip 直传不在枚举；§3.4 兜底式宽泛授权无具体披露                                                                                                             | 低估      |
| "Diagnostic data: crash/error logs"                                                                           | workbuddy.ai 隐私政策                                                   | 未披露同厂商 CLI 扫 `~/.workbuddy/logs` 等目录（mtime<24h）随自家日志一并上传                                                                                        | 低估      |
| "无持久化会话……适合隐私敏感场景"(v2.125.1)；"环境变量禁用遥测"(v2.63.5)                                       | 随包 release notes                                                      | 会话持久化与日志落盘无关，照样被收割（低估）；env 管不到日志管线、纯服务端武装（误导）                                                                               | 低估/误导 |
| （沉默）v2.97.4 引入任务队列+HMAC+跨产品收集，发行说明零披露；全口径无 upload_task/COS/allWorkspaces 任何描述 | 全部公开口径                                                            | 最大收集面在所有文档/政策/发行说明中完全缺席                                                                                                                         | 未披露    |
| "Celebrated for built-in security"                                                                            | codebuddy.ai 营销页                                                     | 与隐藏的远程扩面收集能力并存：不升级客户端、不提示即可先调级放大再收割                                                                                               | 误导      |

## 通道清单

| 通道                           | 内容                                                         | 门槛                      |
| ------------------------------ | ------------------------------------------------------------ | ------------------------- |
| `v2/logs/upload_*` → COS       | 全部工作区日志 + 他产品日志（任意路径注入=未实现 DI 扩展点） | 服务端推送配置 + 任务队列 |
| `FileLogger.getLevel` 远端调级 | 采集详细度                                                   | 服务端推送                |

## 证据锚点

`dist-server/6929.codebuddy.js` module 25840 (UploadService).`LoggerStorageService.collectLogFiles/collectExtraFiles/collectRecentIdeLogFiles`；`LoggerUploadAPIServiceImpl.getUploadTasks`；`COSFileUploader.getCOSInfo`（`v2/logs/upload_credentials`）；`informUploadResult`；`dist/codebuddy.js:2983-2985`。

## 复核

对抗性复核（2026-09-24，证据全部重新自 bundle 推导，非引用前 digest）：

- ✅**确认**——服务端推送 `log.upload.{enabled,interval,allowedEnvironments}` 武装 collect→zip→COS-STS→putObject→report 循环，本地零默认值、零 consent。边界：`--serve` 解除武装；管线仅 `dist/codebuddy.js` 功能完整（dist-server/headless/lite-wb 中 archiver 73638、cos 42773 为空桩，武装后只能轮询回报 `failed`）；需登录态（无 session 时 getUploadTasks 抛错）；`allowedEnvironments` 校验失败**仍武装**（fail-open）；`CODEBUDDY_DISABLE_FILE_LOGS=1` 碰巧掏空收集源；ENV 优先级 provider（`ACC_PRODUCT_CONFIG_V3/V2/ACC_PRODUCT_CONFIG/ACC_PRODUCT_CONFIG_PATH`，优先级 20000>CLOUD 10000）理论上可本地注入/否决 `log.upload.*`，但无出厂默认。
- ❌**推翻**——"extraUploadPathsProvider 让服务端注入任意路径"不成立：该 provider 是裸 Symbol DI token，全包**零实现**（仅声明+一处 `@Optional() @Autowired` 注入点），远端配置无路径字段、任务项只传 taskId——服务端不可达。真实越界面是硬编码 `collectRecentIdeLogFiles` 跨产品目录递归（mtime<24h 无类型过滤）+休眠的 `collectExtraFiles` 任意路径原语；上文 上传机制/通道清单/consent 面相关表述已修正。
- ✅**确认**——`allWorkspaces` 模式扫全部工作区：共享 `~/.codebuddy/logs/<date>/` 目录，服务端任务恒传 `allWorkspaces:!0` 绕过当前工作区文件名过滤（`t||e.startsWith(i)`），目录内非日志文件一并带走；`DateRangeUtils.last(1)`=近 24h。

## 版本考古

**首现版本**：unlisted nightly `1.25.0-next.bd7d324.20251107`（2025-11-07T10:06Z，真实最早构建）；708 版本列表内首个为 `2.0.0`（2025-11-08，idx 113）。

| 版本                           | 日期              | 特征 | 备注                                                             |
| ------------------------------ | ----------------- | ---- | ---------------------------------------------------------------- |
| `0.0.1-beta.0`                 | —（idx 0）        | ✗    | 最旧，8 个字面量零命中                                           |
| `1.3.0`                        | —（idx 44）       | ✗    | 首个 24MB 构建（引入 dist-server），管线尚无                     |
| `1.25.0-next.fadc360.20251106` | 2025-11-05        | ✗    | 列表内最后 absent（idx 112）                                     |
| `1.25.0-next.7f18485.20251107` | 2025-11-07T04:06Z | ✗    | 最后 absent 构建（unlisted）                                     |
| `1.25.0-next.bd7d324.20251107` | 2025-11-07T10:06Z | ✓    | **真正首现**（unlisted nightly）                                 |
| `2.0.0`                        | 2025-11-08        | ✓    | 列表内首个 present；旧式 `upload_check`                          |
| `2.89.0` / `2.94.2` / `2.97.3` | —（抽样）         | ✓    | 旧式贯穿始终                                                     |
| `2.97.3-next.de842e2.20260519` | 2026-05-19        | ✓    | 最后旧式（idx 526）                                              |
| `2.97.4`                       | 2026-05-21        | ✓    | **首个新式**：`upload_task/check` + HMAC + `allowedEnvironments` |
| `2.158.0`                      | 2026-09-24        | ✓    | 最新（idx 706），新式；模块改号 6929→5399                        |

- **引入期（2025-11-07/08）**：门槛 = 服务端配置 `log.upload` 对象 truthy + `interval>0`（默认 60s）——无 enabled 布尔、无环境白名单；`upload_check` 接口已定义但自动循环**无条件上传**；`informUploadResult` 是空桩；休眠的 `collectExtraFiles` 任意路径打包原语与 `allWorkspaces` 扫盘首日即存在（服务端注入路径的 provider 从未实现，见复核）。
- **2.97.4 升级（2026-05-21）**：改显式 `enabled` 布尔 + `allowedEnvironments` 环境白名单 + 每拍轮询厂商任务队列；新增 `collectRecentIdeLogFiles`/`collectExtraLogPaths` 跨产品日志收集；回报改 `PUT upload_task?state=`（硬编码 `log_collection_secret_key` HMAC）——厂商侧管控增强，用户侧依旧零 consent。
- **全版本共性**：任何 product*.json 都无本地 `log.upload` 默认值，启用纯远端遥控；`log.upload.enabled` 字面量从不出现（嵌套路径 `e?.log?.upload?.enabled` 访问）——扫该字符串不能作判定依据。

**边界**：absent ≤`1.25.0-next.7f18485.20251107`（04:06Z）→ present ≥`1.25.0-next.bd7d324.20251107`（10:06Z），同日约 6h 窗口内引入；旧式→新式边界 ≤`2.97.3-next.de842e2` → ≥`2.97.4`。**覆盖缺口**：708 版本仅抽测 29 个 tarball（idx 0–112 间仅 5 个采样点 + 边界 nightly 探针），理论上不排除中间版本短暂引入又移除；连续 absent 至 idx 112 且 idx 113 起全 present，主结论稳健。原始数据：`history/codebuddy-cli/bisect-results.tsv`、`scratch/codebuddy-cli/{check.sh,enumerated.json}`（agent-teardown 仓）。
