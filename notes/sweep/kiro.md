# Kiro (AWS) 1.1.14 — 隐藏常开转录上传（ActivityLogPublisher）+ 休眠的工作区上传 SDK

**包/来源**：官方 stable（Code-OSS 1.131.0 base） · **解包**: `extracted/kiro` · **覆盖**：acq + 7 扫描 + 双镜 verify×3 + 5 lane

## 结论

无 ZCode 式整树打包上传（vendored CodeWhisperer 上传 SDK 全套协议——`CreateUploadUrl`/`CreateArtifactUploadUrl`/`CreateWorkspace`/`UploadIntent.WORKSPACE_CONTEXT` + S3 multipart——**零调用点**，休眠状态）。但确认一条**常开隐藏转录上传**：`ActivityLogPublisher` 每 3s tail 会话存储并 POST 完整转录（含 tool_result 文件内容）到 `runtime.<region>.kiro.dev`，无任何开关/UI。另有一条继承自 Copilot agent-host 的"受限遥测"（工作区文件清单 + 逐文件 diff），门槛在服务端 token claim。

## 上传机制

### ActivityLogPublisher —— 常开转录外发（最接近 ZCode 的发现）

- `extensions/kiro.kiro-agent` 内的 `ActivityLogPublisher`（sld）每 3s tail `messages.jsonl` + `sub-executions/*.jsonl`。
- 载荷：完整会话转录——user/assistant 文本、tool_call 参数（路径/shell 命令）、**tool_result 输出（含文件内容/终端输出）**、steering/metadata、`_meta.kiro.checkpoint.fileChanges`（逐文件编辑前/后体），批 25 条，`visibility:"external"`；hook 类 union 变体无 ACTIVITY_TYPE_MAP 映射，实际被静默跳过不外发。
- 端点：`https://runtime.<region>.kiro.dev/agents/activity`，Bearer 认证。
- 门槛：仅 `region ∈ {us-east-1, us-west-2}`（默认安装区域即中）；`startTimer` 在新建与恢复会话路径均无条件调用；dispose 时 finalFlush。**与 contentCollectionEnabled/usageAnalytics 无关，无用户设置可关**。
- 三轮 verify 反复复核：非死代码、非用户触发、非普通遥测——transcript 级持续外发。

### 继承的 Copilot "restricted telemetry"（条件触发）

- vendored Copilot agent-host 代码：`request.repoInfo` 事件携带**工作区文件相对路径清单 + `diffsJSON`（逐文件对 merge-base 的 patch 体，单文件 ≤1e5 字符）** + `conversation.messageText`（完整消息文本）→ `copilot-telemetry.githubusercontent.com/telemetry` 或 token 指定端点。
- 门槛：需 GitHub Copilot 资源 token 且厂商签发 token 带 `rt=1`/`isInternal` claim + repo 有 GitHub/GHE/ADO remote——纯 Kiro 用户不触发；一旦厂商签 rt=1 token 即默认开（唯一本地关闭是未文档化的 `disableRepoInfoTelemetry` 根配置）。

### 休眠面（值得记录）

- CodeWhisperer 完整上传协议栈 vendored 但零实例化（枚举了全部 `new *Command(` 仅 8 处，无一上传相关；S3 client/`PutObject`/`UploadPart` 零实例化）。
- `CodeWhispererRuntimeClient` 本身是活的（`q.<region>.amazonaws.com` 的用量/配置/补全调用），激活上传只需接线。
- `contentCollection` consent 字段 schema 默认 ON，仅以 `x-amzn-codewhisperer-optout` 头形式 opt-out——服务端门槛同型。

## 载荷解剖

### ActivityLogPublisher → `runtime.{region}.kiro.dev/agents/activity`（extension.js:16669-16693, :1687）

- **触发**：会话 create 与 resume 均无条件 `startTimer`（:16690/:16691）；3s flush（`eld=3e3`），dispose 时 `finalFlush`；唯一门槛 `region∈{us-east-1,us-west-2}`（`old` Set, :16669）。
- **端点**：`POST https://runtime.{region}.kiro.dev/agents/activity`，raw `https.request`（30s 超时、代理感知）；头：`Authorization:Bearer`+`TokenType`（SSO_OIDC/EXTERNAL_IDP/KIRO_MACHINE_TOKEN/API_KEY）+`x-amzn-kiro-profile-arn`；**无 opt-out 头**。
- **字段**：`{payload:[≤25]}`；每条=sessionId/activityType（18 类映射）/role/`visibility:"external"`/seq + `content`（整条 JSONL record）——user：文本+contextItems+base64 `images`/`documents`；assistant：文本+reasoning 元数据；tool_call：`args`=完整工具入参（路径、shell 命令）；tool_result：`content`=**文件内容/终端输出**；steering_inclusion：文档体；`_meta.kiro.checkpoint.fileChanges[]={file,original,modified}`=**第二文件内容通道**。
- **服务端实收**：会话全生命周期每 3s 一批完整转录条目——用户输入与附件 blob、模型回复与 reasoning 元数据、每个工具调用完整参数与结果体（读到的文件、终端 stdout/stderr）、steering 文档、审批问答、逐文件编辑前/后内容。
- **范围/过滤**：byte-offset cursor（`publish.cursor`/`publish-sub.cursor`）仅成功 POST 后推进→失败原样重发；批 ≤25；agent_note/tool_revert/ContextualHookInvoked/session_start 无映射被静默跳过。

### 基础设施安全评估 → `runtime.{region}.kiro.dev/mcp/stream` `tools/call evaluate_infrastructure_safety`（:16620-16641, :16712, :16887）

- **触发**：pre/post-tool-use 钩子——文件工具作用于 yaml/yml/json（排除 package.json/tsconfig 等固定名）或命令以 `aws`/`cdk`/`sam`/`cloudformation` 前缀开头；需 ACP client initialize 声明 `infrastructureSafety` capability + `infraSafetyMonitor`（insider 实验**默认 true**）或 `infraSafetyEnforce`（默认 false）。
- **端点**：`POST {endpoint||runtime.us-east-1.kiro.dev}/mcp/stream`，InvokeMCPStreamCommand（JSON-RPC tools/call，Bearer+profileArn，SSE 响应）。
- **字段**：sessionId、toolName、`toolParams=JSON.stringify(args)`（**含 fs_write/str_replace 完整新文件文本**）、`conversationContext`≤128KB（最近 100 条消息渲染+steering 文档体）、toolResult、`currentTemplateContent`（读后盘重读 ≤256KB；CDK 模板 ≤4MB）、scopeKey=工作区标识、**deployEnv=全部 `AWS_*` 环境变量**。
- **服务端实收**：每次基础设施形态写/读/命令，AWS 收到待写文件全文、128KB 会话上下文、刚读文件的盘上字节、CDK 模板体、工作区标识与完整 AWS_* 环境变量集。
- **范围/过滤**：CFN 正则限定基础设施形态；不可解析→fail-open SAFE；monitor=异步排队、enforce=同步阻断写；`KIRO_DUMP_REQUESTS` 可把完整请求/响应 JSON dump 到磁盘（调试暴露面）。

### 其余通道

| 通道 | 触发 | 端点 | 载荷要点 | 范围/过滤 |
| ---- | ---- | ---- | -------- | --------- |
| Copilot 受限遥测（agentHostMain.js:501/655/666） | turn begin/end；需 githubToken + token claim `rt=1`/`isInternal` | `copilot-telemetry.githubusercontent.com/telemetry`（AppInsights x-json-stream） | remoteUrl/repoId/headCommit/branch、`fileRelativePaths`、`diffsJSON`（逐文件 patch ≤1e5 字符，总 ≤400KB）、`messageText` 全文 | merge-base>30d/≥30 commits/≥100 files 跳过；`copilotIgnoreEnabled` 只压 diffs 不压路径；唯一开关=未文档化 `disableRepoInfoTelemetry` |
| Chat+远程 MCP（:15921/:16629/:17414） | 每轮对话/每次远程 MCP 调用 | `runtime.{region}.kiro.dev` `/generateAssistantResponse`·`/mcp`·`/mcp/stream` | 完整会话状态+toolUse/toolResult+steering；JSON-RPC `{params:{name,arguments}}` | 特性固有；opt-out 头仅打在此 lane |
| 云会话 BFF（:16672/:4710/:16724/:17532） | cloud-sandbox 远程会话生命周期 | `app.kiro.dev`（`KIRO_REMOTE_SESSIONS_ENDPOINT` 可覆盖） | CreateSpace{spaceType,providerResources}、StreamSendMessage `contentBlocks:[text\|image\|resource{uri,body}]`、RespondToPermission | spaceId=sessionId；仅已连接 provider 仓库；message/metaArgs 标 SensitiveString |
| feedback 截图（workbench:13658） | 仅用户提交反馈 | presignedurl→S3 PUT→`/form`（aperture-public-api.feedback.console.aws.dev） | presign{name,size,SHA256}、S3 原图+`scanstatus=NOT_SCANNED`、form{responses,metadata,S3Paths} | 图片 only；presign 无 credentials |
| Code-OSS telemetry（sharedProcessMain.js:521） | VS Code 遥测生命周期 | `{prod,gamma}.telemetry.desktop.kiro.dev`·beta `telemetry.kiro.aws.dev` | allowedEvents 白名单（startup/crash/gallery） | 纯操作遥测，无内容 |
| 会话导出/resume（:16720-16724/:18730-18732） | 用户导出/点分享链接 | 本地 zip / axios GET（S3 host 白名单+https+maxRedirects:0） | zip=`session.json`+`messages.jsonl`+`sub-executions/` | 仅本地产出+仅下载；证实服务端存 `{workspace/,.kiro/sessions/}` zip |
| 休眠上传 SDK（:17414） | **无**（零调用点） | `runtime.{region}.kiro.dev` `/createuploadurl`·`/CreateWorkspace` 等 | CreateUploadUrlRequest{contentMd5,uploadIntent,UploadContext∋WorkspaceContextUploadContext{workspaceId,relativePath,language}} | 全协议+S3 multipart vendored 未接线；~40 命令仅 ~6 在用 |

## consent 面

- ActivityLogPublisher：零 consent 面。
- Copilot 受限遥测：opt-in 名义上是 `restrictedTelemetryEnabled` + `telemetryLevel>=3`，但启用与否实际由 token claim 决定。
- 反馈截图上传（`presignedurl.aperture-public-api.feedback.console.aws.dev` → S3 PUT → register）是真三段式管线但仅用户触发、图片-only。

## 宣称对照

| 厂商宣称 | 出处 | 实际行为 | 判定 |
| -------- | ---- | -------- | ---- |
| （静默——无任何文档/设置/UI 描述持续转录上传） | docs 全站+设置 schema+扩展 manifest | ActivityLogPublisher 对白名单区域每会话无条件开启，3s/批上传完整转录 | **未披露** |
| "We do not collect telemetry from Kiro Pro/Pro+/Pro Max/Power users…through AWS IAM Identity Center or external IdP" | FAQ | 转录 lane 对全部白名单区域用户（含 enterprise IdP）开启；gate 链无 tier/IdP/admin 检查 | **矛盾** |
| "Kiro enterprise users are automatically opted out of telemetry and content collection" | Data protection | /agents/activity 对企业用户同样无条件；唯一 opt-out 头只打在 Smithy 客户端，发布器不携带 | **矛盾** |
| enterprise 内容仅当 admin 启用 prompt logging/activity report 时存入客户自选 S3 | Data protection | 无论开关如何，客户端持续把完整转录流到 AWS 运营端点；客户 S3 只是下游导出 | 误导 |
| "To opt out of content collection, uncheck…Content Collection for Service Improvement" | Data protection+产品设置 | 该开关只翻转 `x-amzn-codewhisperer-optout` 头且仅作用于 Smithy/Q 调用；转录 POST 无头无检查 | 误导 |
| "Usage Analytics…send usage data…to your organization's AWS account" | 产品内设置 | 非 enterprise 遥测实际发往厂商运营 telemetry.desktop.kiro.dev；仅 enterprise 报告导出进客户账户 | 误导 |
| "Types of telemetry collected: Usage data…Performance metrics…" | Data protection | 枚举自称采集清单，完全遗漏最大采集：每 3s 的完整转录流 | 误导 |
| "may store your questions, responses, and additional context such as code" | Data protection | 承认存 Q&A+context 但略去机制与范围：全量转录近实时常开上传 | 低估 |
| "user activity reports…collects user telemetry" | Enterprise docs | 报告输出为聚合计数，底层采集却是内容级全量转录，且不限于 opt-in enterprise；admin 开关只管导出 | 低估 |
| cloud sessions "state survives your machine…transcript replays" | Cloud sessions | 承认服务端存转录（最接近承认上传），但未提**本地**会话转录同样常开上传 | 低估 |
| .kiroignore "files that should remain private…not shared with external services" | kiroignore docs | 对 agent 上下文成立，但 agent 合法触及的一切内容都随转录上传 AWS | 低估 |
| runtime.us-east-1.kiro.dev="Kiro service (US East)"（防火墙域名表） | Firewalls docs | 该端点即转录上传目的地，泛化标签不暴露流量内容；且本构建白名单仅 {us-east-1,us-west-2}，docs 列的 eu-central-1 不上传 | 低估 |
| --telemetry "Shows all telemetry events which Kiro collects" | CLI 帮助 | 只显示 OTLP/append-log 事件；转录 POST 不建模为遥测事件，"all"排除最大外流 | 低估 |
| agentHost.config.disableRepoInfoTelemetry="Whether repository information telemetry is disabled" | 产品内 schema | Copilot 受限遥测唯一披露开关；载荷=文件清单+逐文件 diff+消息全文，描述只字未提，公开无文档 | 低估 |
| "Prompt Logging…send prompt logs…to your organization's AWS account" | 产品设置 | 准确描述 enterprise prompt-logging（admin 开、落客户 S3）；同面板恰无常开转录 lane 的任何控制 | 如实 |
| cloud sessions "your local working copy is never uploaded" | Cloud sessions | cloud-session 范围内属实（server-side clone）；但本地会话 agent 读到的文件仍经转录上传 | 如实 |
| "All communication…protected using TLS 1.2 or higher" | Data protection | publishBatch 走 https.request :443，一致 | 如实 |
| （静默——休眠工作区上传 SDK：CreateUploadUrl/CreateWorkspace+S3 multipart） | extension.js:17414 | 全协议栈 vendored、零调用点；文档只字未提 | 未披露 |

## 通道清单

| 通道                              | 内容                       | 门槛                  | 判定         |
| --------------------------------- | -------------------------- | --------------------- | ------------ |
| agents/activity                   | 完整会话转录（含文件内容） | region 白名单，无条件 | **隐藏上传** |
| Copilot repoInfo/messageText      | 文件清单+diffs+ 消息文本   | 厂商 token rt=1       | 条件内容遥测 |
| GenerateCompletions fileContext   | 补全上下文                 | 特性固有              | 披露         |
| runtime.kiro.dev agent chat       | 消息/工具结果              | 特性固有              | 披露         |
| OTLP → telemetry.desktop.kiro.dev | 操作遥测                   | getCanEnableTelemetry | 披露遥测     |
| feedback 截图 → S3                | 用户图片                   | 用户触发              | 合规         |
| resume-session 下载               | 会话 zip                   | 用户确认，仅下载方向  | 合规         |

## 证据锚点

```
extensions/kiro.kiro-agent/dist/extension.js:
  ActivityLogPublisher (sld) — 3s tail messages.jsonl/sub-executions → runtime.<region>.kiro.dev/agents/activity
  CodeWhisperer Smithy SDK（CreateUploadUrl 等）— 零调用点
  presignedurl.aperture-public-api.feedback.console.aws.dev — 反馈截图三段式
```

## 复核

- ✅ **确认**——"每 ~3s POST 完整转录（含文件内容）"：活管线复验，`eld=3e3` setInterval + byte-cursor 增量 tail `messages.jsonl`/`sub-executions/*.jsonl` → POST `/agents/activity`（Bearer、≤25/批）；`tool_call.args`/`tool_result.content`/`checkpoint.fileChanges` 均携带文件体。
- ✅ **确认（加强）**——"无用户开关，gate=region 白名单"：唯一门槛 `s&&n&&old.has(n)`（:16688）；`contentCollectionForServiceImprovement` 仅给 Smithy 客户端打 opt-out 头，发布器 raw `https.request` 无头无检查——**opt-out 不停转录上传**。
- ✅ **确认**——"休眠上传 SDK 零调用"：:17414 ~40 命令聚合表，upload 类命令零实例化/零方法调用；实际使用仅 ~6 命令。
- ⚠️ **部分成立（已修正）**——原载荷清单列 "hooks"：union 变体 ContextualHookInvoked 无映射、`hook_execution` 键无生产者，hook 类记录被静默跳过不外发；"上传机制"一节已改。
- 另：lane 扫描新发现 **infra-safety eval**（/mcp/stream）与 **app.kiro.dev BFF** 两条此前未列通道，已并入"载荷解剖"（"通道清单"按规则未动）。

## 版本考古

**结论**：隐藏上传签名首见于 **0.12.155**（2026-05-06），≤0.11.133 确认不存在；签名始终定位于 `extensions/kiro.kiro-agent/dist/extension.js`。

| 版本     | 日期       | 签名 | 备注                                                                         |
| -------- | ---------- | ---- | ---------------------------------------------------------------------------- |
| 0.6.0    | —          | ✗    | 全 tarball 流扫描无命中；CreateUploadUrl SDK 已 vendored（先于发布器，无关） |
| 0.11.133 | 2026-04-22 | ✗    | 最后可获取的无签名版本；messages.jsonl 存储已存在                            |
| 0.12.155 | 2026-05-06 | ✓    | **首现**，机制已完整（3s flush / 批 25 / byte-offset cursor）                |
| 0.12.200 | —          | ✓    | 同 sandbox 门槛；ctor 增 client 参数                                         |
| 0.12.301 | —          | ✓    | 同 sandbox 门槛                                                              |
| 1.0.0    | —          | ✓    | 仍仅 sandbox 门槛；runtime.\${region}.kiro.dev helper 已内置                 |
| 1.0.52   | —          | ✓    | **第一次放宽**：`sandbox ∥ client==="kiro-ide"` + region 白名单              |
| 1.0.89   | —          | ✓    | 同 1.0.52                                                                    |
| 1.0.116  | —          | ✓    | **第二次放宽**：env/client 检查移除，endpoint 自动派生                       |
| 1.0.138  | —          | ✓    | 同最终形态                                                                   |
| 1.1.14   | 2026-09-14 | ✓    | deb 包确认，同最终形态                                                       |

- **三段式门槛，全程无用户开关**：①（0.12.155→1.0.0）仅 `environment==="sandbox" && endpoint`，桌面端不触发；②（1.0.52 起）桌面 kiro-ide 纳入，endpoint 取自 getKrsConfig 预置表，实际对白名单区域桌面用户生效；③（1.0.116→1.1.14）env/client 检查整体移除，endpoint 自动派生——任何白名单区域客户端默认开。
- consent 面始终为零：各版本 extension package.json 均无 activity/publish/upload 类设置；邻近的 `contentCollectionForServiceImprovement` 只控制另一标志，与本发布器无关。

**边界**：absent ≤0.11.133 / present ≥0.12.155，二者在可获取列表中相邻；中间 0.12.x 构建号未发布（HEAD 403）。**覆盖缺口**：阶段②起点只收敛到 1.0.0–1.0.52 区间、阶段③收敛到 1.0.89–1.0.116 区间，未逐版本精确定位；中间小版本日期不可得。
