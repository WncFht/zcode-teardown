# GitHub Copilot Chat 0.48.1 — 隐藏上传（实验门可远程翻转）

**包/来源**: VS Marketplace `GitHub.copilot-chat` vsix（公共 vspackage 端点，无需 auth）
**解包**: `~/src/agent-teardown/extracted/copilot-chat/`（extension/dist/extension.js ~20MB + 捆绑 Copilot CLI）
**覆盖**: acq + 7 族扫描 + 双镜 verify + 5 lane，证据 `evidence/copilot-chat/journal-digest.json`

## 结论

存在 ZCode 同构的工作区文件内容上传管线（internal name: **external ingest**）。默认关，但门槛是一个**服务端可远程翻转的实验开关**——设置项在常规视图不显眼（tagged advanced/onExp，仍可搜索），文案只说"语义索引"，不提文件内容上传。一旦开启，任何 `@workspace` 语义搜索都会先把变更文件上传到 `api.github.com`。

## 上传机制

1. **Gate**: `chat.workspace.codeSearchExternalIngest.enabled`——package.json 声明 `default:false`，tags `["advanced","onExp"]`（常规设置视图不显眼、仍可搜索/JSON 编辑），描述 "Enable external ingest for semantic codebase search."。`isExternalIngestEnabled()` 经 `getExperimentBasedConfig` 读取——**本地未设置时回落到 experimentation-service treatment variable**（experimentName `copilotchat.config.chat.advanced.workspace.codeSearchExternalIngest.enabled`），即微软可远程为未设值用户**中会话热翻转**（显式设值优先）；取 `"force"` 时 ingest **取代** remote-index 路径，且该门独立于可见的 `enableCodeSearch`（externalIngest 单独即令 search isAvailable）。
2. **Track（本地）**: `ExternalIngestIndex.initialize()` → `reconcileDbFiles()` 对每个 workspace folder 跑 `findFiles("**/*")`（VS Code 默认 excludes + Copilot content-exclusion 策略 + wasm 路径/大小/类型过滤；.gitignore 仅靠默认 `search.useIgnoreFiles` 兜底，非扩展级保证），状态入 sqlite `codebase-external.sqlite`（path/size/mtime/docSha/shouldIngest），并对每个 folder 注册 `FileSystemWatcher(**/*)` 持续跟踪。
3. **Trigger**: `doIngest` 两个调用点——(a) `ExternalIngestIndex.search()`，即每次 codebase 语义搜索先静默上传再回答；(b) 命令 `github.copilot.buildRemoteWorkspaceIndex` / 状态栏 "Build/Update Codebase Index"。无定时器上传。
4. **上传**: `ExternalIngestClient` → `POST https://api.github.com/external/code/ingest`（静默获取的 GitHub session Bearer）→ `/batch` 服务端挑 doc_ids → 逐文件读盘、base64 → `POST /external/code/ingest/document`（relativePath + 内容）→ `/finalize`。捆绑第一方 Rust wasm（GeoFilter/createCodedSymbols）做本地符号预提取。

## 载荷解剖

对象：`extension/dist/extension.js`（20.5MB webpack）+ `extension/dist/cli.js`（13.7MB，捆绑 Copilot CLI = Claude Code 2.1.112 fork）+ `external_ingest_utils_bg.wasm`；引用均为压缩文件 file:line，纯静态分析（2026-09-24/25）。

### external ingest 主通道（隐藏，服务端可翻）

- **触发**：`searchLocalDiff`（:2409）——每次 `@workspace` 语义搜索静默 `updateForceIncludeFiles`+`doIngest`（noop progress）；另走命令 `github.copilot.buildRemoteWorkspaceIndex`/状态栏。门链见上节。
- **端点**：`api.github.com/external/code/ingest{,/coded_symbols,/batch,/document,/finalize}` + GET/DELETE（`B4`，:2363）；Bearer=静默 GitHub session + `X-Client-{Application,Source,Feature}`（:2351）。
- **字段**：

| 调用 | 载荷 |
| --- | --- |
| POST `/ingest` | `fileset_name=vscode.copilot-chat.<uuid>`、`new_checkpoint=b64(sha256)`、`geo_filter=b64(wasm 概率集)`、`coded_symbols` |
| POST `/coded_symbols` | `{ingest_id,coded_symbols,coded_symbol_range}` 循环至空 |
| POST `/batch` | `{ingest_id,page_token}`→返回 doc_ids——**服务端挑选要哪些文件**（doc_id=b64 docSha over `<folderId>/<relPath>`+content） |
| POST `/document` | `{ingest_id,content=b64 全文,file_path=<folderId≤8字符>/<相对路径>,doc_id}`；读失败仍发空文档；500×3/429×10 重试 |
| `/finalize`、GET、DELETE | `{ingest_id}` / 列 fileset / `{fileset_name}` |

- **服务端实收**：以用户本人 OAuth 身份收到 fileset 名、全树 GeoFilter 指纹+符号清单，再对服务端自选的每个 doc_id 收完整 b64 文件内容与相对路径——reconciliation 服务端驱动，客户端只读盘发字节；明文 JSON over TLS，无客户端加密。
- **范围/过滤**：wasm IngestFilter——3B..350KB、路径≤1024B、~14 条 deny 正则 + pem/key/pfx/p12/crt/cer/jks 黑名单；**`.env`/`id_rsa`/`.npmrc`/`credentials.json` 全部放行**。枚举吃 `files.exclude`/`search.exclude`；`isCopilotIgnored` 生效；remote-index roots 跳过（diff forceInclude 除外）。本地态 `codebase-external.sqlite`+每 folder watcher，读并发 20。

### 其余扩展通道（extension.js）

| 通道 | 触发 | 端点 | 载荷→服务端实收 | 范围/备注 |
| --- | --- | --- | --- | --- |
| fileset/repo 代码搜索 | ingest 后；`doCodeSearch` :2409 | `api.github.com` `/external/embeddings/code/search`、`/embeddings/code/search`、`/search/code`、`/repos/{nwo}/copilot_internal/embeddings_index` | `prompt`≤7800B 原文 + `scoping_query`=`fileset:`/`repo:` + `metis_1024_I16_Binary` → 逐字查询绑 fileset/repo | 404→2s 重试一次 |
| `/chunks` 嵌入 | 本地索引 `rhe` :6327 | POST `api.github.com/chunks` | `content`=**明文全文**+path+`language_id`+`local_hashes` → 全文明文 JSON | 空文件跳；并发 8（实验变量） |
| `/embeddings` 批量 | `gye` batch100 :7116 | POST `api.github.com/embeddings`，失败回落 `api.githubcopilot.com/embeddings` | `inputs`≤100 chunk 原文批 → 原文批送嵌入 | 无密钥过滤 |
| ADO 语义搜索 | ADO root `rae` :2363 | `almsearch.dev.azure.com` `search/*` 7.1-preview，Basic adoToken | `prompt`≤1e4 + `repo:{proj}/{repo}` | endpoint 可设置覆盖 |
| 聊天图片附件 | `sxe` :1689（仅 Chat* 端点） | POST `uploads.github.com/copilot/chat/attachments?name=&content_type=` | octet-stream 原图字节 → 原图+mime | 文件名消毒 `[a-zA-Z0-9._-]`；无大小上限 |
| Snippy 公共码匹配 | `Cye` :7130 | `origin-tracker.githubusercontent.com` twirp `SnippyAPI/Match`、`/FilesForMatch` | `{source:候选 snippet 原文}` | Bearer copilotToken；cursor 分页 |
| code-review agent | `Dpr` :2925 | POST `api.githubcopilot.com/agents/github-code-review`（`X-Copilot-Code-Review-Mode:ide`） | `headFileContents`/`baseFileContents`=**diff 文件前后全文**+指令 → 全文非 diff | snippet 模式仅发 path+行区间 |
| 云 SWE 任务 | `postCopilotAgentJob` :1729/:2895 | POST `api.githubcopilot.com/agents/swe/v1/jobs/{owner}/{repo}` | `problem_statement` 全文+`event_content`+PR 脚手架 | `jobs_url` 轮询 |
| agent memory | `mie` :1805 | GET/PUT `api.githubcopilot.com/agents/swe/internal/memory/v0/{owner}/{repo}` | `{subject,fact,citations,category}` 持久事实 | 仅 `.../enabled` 时写 |
| Chronicle 会话同步 | 每 chat/tool span 后翻译 :2903-2906；门 `chat.sessionSync.enabled`(F)+repo 不在 exclude+`LocalIndexEnabled` | `{copilotToken.endpoints.api}`（**token 定 base**）`/agents/sessions`、`/{id}/events`(500/批)、`/{id}/commands`、DELETE、`/agents/analytics/*` | 事件流：cwd/repo/branch/headCommit/模型、消息≤10240、`tool.execution_start` **全量参数**、结果≤5120；`GET /commands`+`completed_command_ids`=**服务端→客户端遥控**（Mission Control） | 上传前 20 正则+16 env-secret(raw+b64)+活 token 打码 `******`；>51200 字符丢事件 |
| 增强遥测 `rt='1'` | token claim :1668/:6985 | POST `copilot-telemetry.githubusercontent.com/telemetry` | `engine.messages`=**整 message 数组 JSON**、`currentFileContent` 全文、tools JSON、remoteUrl/branch/commit → 内容级数据上遥测端点 | 仅 `rt='1'`；>8192 切 `_01.._50`；常规遥测（OneCollector）只带属性名 |
| 内部 MSFT 遥测 | `isInternal` :6985 | 同 App Insights 管线 | +`common.userName`；编辑前/AI 后/用户后全文；`*.internal` 事件带 `remoteUrls` | 仅 isInternal |
| CAPI 头信封 | 每 CAPI 调用 :1557/:1681 | 全部 `api.githubcopilot.com` | Bearer+X-Request-Id+OpenAI-Intent；YSi 内加 **VScode-MachineId/DeviceId/SessionId**+Integration-Id+实验分配串 | machine/device ID **只发 CAPI，不发 api.github.com** |
| ExP-TAS 分配 | init+30min `g8a` :1113（isTelemetryEnabled 门） | GET `default.exp-tas.com/vscode/ab`（头即载荷） | `X-MSEdge-ClientId=machineId`+build/lang/population → 返回可翻隐藏 ingest 的 AssignmentContext | telemetry 关则全禁；30min 缓存并回显 CAPI |
| issue 反馈 | 用户命令 :5262/:5325 | VS Code issue reporter→github.com 表单 | 版本/request id/completion 片段 | 用户亲自提交 |
| scenario 本地 | SWE-bench `$be` :6987 | POST `localhost:4443/api/embeddings/code/search` | query≤7800B scoped repo | 仅 loopback |

### 捆绑 CLI 通道（cli.js）

| 通道 | 触发 | 端点 | 载荷→服务端实收 | 范围/备注 |
| --- | --- | --- | --- | --- |
| git bundle 种子 | teleport bundle/env/flag :3048/:3060 | POST `{api.anthropic.com}/v1/files`（`files-api-2025-04-14` beta） | multipart `_source_seed.bundle`=**`git bundle --all`+`stash create` WIP**（全历史+未提交）→ Anthropic 收整个 repo 历史与工作区态 | ≤500MB 文件/100MiB bundle；超限逐级缩 scope；上传后删本地 bundle+refs |
| `/v1/sessions` | teleport `CF` :3060、`po1` :2890 | POST/PATCH/GET `/v1/sessions{,/{id}/events}`、`/teleport-events`、`/session_ingress` | title+**完整初始 prompt**+`session_context`{git url/branch 或 `seed_bundle_file_id`、outcomes repo、model、`environment_variables.CLAUDE_CODE_OAUTH_TOKEN`=**用户 OAuth token**+调用方 env} | env 可调用方扩展；`BASE_API_URL` 可覆盖 |
| bridge 遥控 | `tengu_ccr_bridge` flag :7066/:2890 | `/v1/environments{,/bridge,/{id}/work/poll·ack·stop·heartbeat,/bridge/reconnect}`、`/sessions/{id}/archive` | register：`machine_name`+**绝对 workdir**+branch+`git_repo_url` → `work/poll` 服务端派单遥控本地 CLI | 日志打码 token 类；需账号 flag |
| GH PR 操作 | `vbK` :5551 | POST `/v1/code/github/{create,merge}-pr` | `{session_id,repo,pr_number}` | 409 视为成功 |
| 1P 事件遥测 | OTel flush `aC1` :496/:500 | POST `/api/event_logging/batch` | ≤200 事件（`tengu_*`/Growthbook）：session/device/**email**/core/env/process+`additional_metadata` b64；**401 后无 auth 重发一次（匿名照发）** | `DISABLE_TELEMETRY`/`DO_NOT_TRACK`/采样/killswitch；失败落 `~/.claude/telemetry/` 重发 |
| OTel metrics | `Ds1` :2947 | POST `/api/claude_code/metrics`（前置 `metrics_enabled` 检查） | OTel 点，无文件内容 | org 关则静默跳过 |
| transcript 分享 | `/share`/调查 :8638 | POST `/api/claude_code_shared_session_transcripts` | `transcript` 全消息+`subagentTranscripts`+`rawTranscriptJsonl`；`p98/fu` 11 正则打码结构化字段，**rawTranscriptJsonl 在打码后 spread→未打码可含密钥** | 需 auth |
| `/feedback` | `/feedback`、`/bug` :5598 | POST `/api/claude_cli_feedback` | 反馈文本+context，`fu` 打码 | essential-traffic 拒绝 |
| 语音 STT | `Ed8` :4089（voice+OAuth） | WSS `wss://api.anthropic.com/api/ws/speech_to_text/voice_stream`（deepgram-nova3） | 二进制帧=**原始 PCM16 麦克风音频**+keyterms | KeepAlive 8s；feature 门 |
| upstream proxy | 沙箱内 `G7A` :8449（需 CCR env） | GET `/v1/code/upstreamproxy/ca-cert`→写信任库；WSS `/v1/code/upstreamproxy/ws` | **沙箱全部 HTTPS egress 经 Anthropic 终止代理**（授信 MITM）；aws `credential_process` 改写 | 仅远端沙箱内 |

## consent 面

- 设置项 tagged `advanced`/`onExp`，常规设置视图不显眼（仍可搜索）；唯一可见入口是 "Codebase Semantic Index" 状态项 + build/delete 命令——文案全是"index"，**无任何 "upload/上传" 字样**。
- 开关默认 false，但 ExP 实验可在用户零操作下置真——与 ZCode 的服务端门控同性质，区别是微软留了本地显式设值的余地。
- 与 ZCode 差异：直连 `api.github.com` Bearer REST（无 STS/OSS/PostObject/客户端加密）；遵守 `files.exclude`/`search.exclude` 与 Copilot 内容排除策略；按 repo-root 去重；.gitignore 依赖 VS Code 默认 ignore 行为（见复核）。

## 宣称对照

| 厂商宣称 | 出处 | 实际行为 | 判定 |
| --- | --- | --- | --- |
| "This feature uploads your data to GitHub to make it searchable" | docs.github.com repository-indexing | 与二进制逐字吻合（`/external/code/ingest*`）；唯一用上 "uploads" 的官方表面 | **如实** |
| "controlled by policy / disabled by default / 组织须显式开启" | 同上 | 个人用户门槛=微软 ExP 远程实验旗标，零用户操作可翻 | **低估** |
| "不会用索引仓库做训练" | 同上 | 二进制不可证，亦无矛盾 | **如实** |
| "parts of the index might come from remote sources"；"Copilot builds the semantic index for you…enabled for personal accounts" | code.visualstudio.com workspace-context（产品内 aka.ms 链接直达页） | 数据流向（文件内容→GitHub）整页未提；"other workspaces" 实为上传本地文件建索引 | **误导** |
| "GitHub builds and updates this index"（GH repo） | 同上 | GH repo 部分属实；但本地 diff/变更文件同样经 ingest 上传 | **低估** |
| ".gitignore 排除于语义索引" | 同上 | 默认 `search.useIgnoreFiles` 下成立——VS Code 行为兜底，非扩展保证 | **如实** |
| "semantic indexing…available in all workspaces…automatically" | VS Code 1.118 release notes | 发布公告零数据流披露 | **低估** |
| 状态项 "Indexes your codebase"；设置描述 "Enable external ingest…"；命令 "Build/Delete … Index" | 包内字符串 | 全包无一处用户可见 "upload"；consent modal 存在但死代码 | **误导** |
| Marketplace "collects usage data…telemetry"；通用隐私声明；IDE 问答页 | marketplace / 隐私政策 / docs | 遥测框架措辞；ingest 上传全程未提及 | **未披露** |
| 扩展开发者政策：禁未经 consent 收集个人数据、禁误导、须隐私告知 | GitHub Copilot Extension Developer Policy | 自家一方功能未达同一标准（无 consent、隐藏旗标、术语文案） | **矛盾** |
| content-exclusion "data is filtered…before being passed to Copilot" | docs.github.com | `isCopilotIgnored` 确实在 ingest 前过滤（agent mode 例外） | **如实** |
| issue #318726 产品内 "external ingest is disabled by your organization's policy"；maintainer "individuals…on by default" | GitHub issue（公开） | 唯一可见披露仅发给被挡用户；被开启的个人用户无任何提示 | **低估** |
| Trust Center 指向 MIT 开源 vscode-copilot-chat | copilot.github.trust.page | OSS 确有管线代码（可审计），但 shipped 开关是隐藏实验位、OSS package.json 无此设置；页面 JS 渲染无可检索宣称 | **低估** |
| "enabled for personal accounts, off by default for org/enterprise" | manage-policies 文档 | 实现为隐藏远程旗标而非用户可见默认开 | **低估** |

## 通道清单

| 通道                                   | 内容                               | 门槛                            | 判定         |
| -------------------------------------- | ---------------------------------- | ------------------------------- | ------------ |
| external ingest → api.github.com       | 工作区文件全文 + 相对路径 + docSha | hidden onExp 开关（服务端可翻） | **隐藏上传** |
| 捆绑 Copilot CLI teleport/session-sync | 会话事件 → Anthropic infra         | 用户发起                        | 合规         |
| 聊天图片上传 uploads.github.com        | 用户附图 base64                    | 用户发起                        | 合规         |
| 常规 LLM 请求                          | prompt + 上下文                    | 产品固有                        | 合规         |

## 证据锚点

`extension.js` `ExternalIngestIndex`/`ExternalIngestClient`（约 :2363）；package.json `chat.workspace.codeSearchExternalIngest.enabled`（onExp tag）；sqlite `codebase-external.sqlite`；`/external/code/ingest{,/batch,/document,/coded_symbols,/finalize}` 端点族。

## 复核

- ✅ **确认**：文件内容上传 `api.github.com/external/code/ingest*`——本轮精确化：仅 `/batch` 服务端自选的 doc_ids 发 `/document`（b64 全文+`<folderId>/<relPath>`），coded_symbols=docSha 集合对账，读失败仍发空文档（extension.js:2363）。
- ✅ **确认**：onExp 门服务端可翻——未设值走 ExP-TAS treatment var，可**中会话热翻转**；显式设值优先；`"force"` 令 ingest 取代 remote-index；且该门独立于 `enableCodeSearch`（:1195/:7115/:2409/:2387）。"UI 隐藏"修正为"常规视图不显眼、仍可搜索"（真实 contributed setting），已改上文两处表述。
- ✅ **确认**：零 consent——`promptForExpandedLocalIndexing` 两处实现均无调用点（死代码）；auth 全 silent；`search→doIngest` 用 noop progress（:2363/:6982/:7138）。
- ⚠️ **部分成立**："不读 .gitignore"——扩展自身不做 gitignore 处理（`useIgnoreFiles` 未传），但默认 `search.useIgnoreFiles`(on) 使默认配置下仍被尊重；已修正上文两处表述。
- 增补（本轮解剖新发现）：session-sync `GET /agents/sessions/{id}/commands` 为服务端→客户端遥控（Mission Control），base 由 copilotToken 决定；CLI `/v1/sessions` 把用户 OAuth token 注入沙箱 env；transcript 分享 `rawTranscriptJsonl` 绕过打码；`rt='1'` 遥测发全文；`upstreamproxy` 沙箱内授信 MITM。

## 版本考古

**结论**：hidden-upload 签名首见于 **0.48.1（2026-05-15）**——即当前可获取历史中的最新版（0.48.2/0.49.0/0.50.0/1.0.0 直连探针均 404）。

| 版本                     | 日期                    | 命中 | 备注                                                                                     |
| ------------------------ | ----------------------- | ---- | ---------------------------------------------------------------------------------------- |
| 0.8.0                    | 2023-10-05              | ✗    | 预提取工件；5 字面量全 0 hit                                                             |
| 0.29.2025061203 – 0.44.2 | 2025-06-12 – 2026-04-20 | ✗    | 8 个二分/单调性探针（0.29/0.36/0.39/0.41.2/0.42.3/0.43.x/0.44.1/0.44.2）全 0 hit         |
| 0.45.1                   | 2026-04-23              | ✗    | **最后一个**可获取的无签名版本                                                           |
| 0.48.1                   | 2026-05-15              | ✓    | **首个**可获取携带版；extension.js 5 字面量全中，package.json / nls / telemetry 同步出现 |

**门控/consent 演化**（签名仅存于 0.48.1，可获取历史内无演化可观察——落地即完全体）：

- onExp 隐藏设置 `workspace.codeSearchExternalIngest.enabled`（default false）与 experimentName 远程翻转接线（`getExperimentBasedConfig`）在引入版即全部就位。
- `isExternalIngestEnabled()` 门控 `getRemoteIndexState()`/索引更新；`/external/code/ingest*` 端点族 + `codebase-external.sqlite` 本地快照同步出现。
- 用户可见面只有 Developer 类命令 `deleteExternalIngestWorkspaceIndex`；任何可获取版本均无 consent 对话文案，默认值从未为 true。

**边界**：缺席 ≤0.45.1（2026-04-23），存在 ≥0.48.1（2026-05-15）。marketplace 全量列表（1125 版）两版之间零条目，0.45.2/0.46.0/0.47.0/0.48.0 及三个日期预发布号共 7 个探针全 404——真正首发可能是窗口内某个不可获取的 0.46/0.47 预发布版，0.48.1 仅为首个**可获取**携带者。

方法：208 条按日期排序版本列表二分（下载 → 7z 解 `extension/` → `rg -a -F` 扫 5 字面量），10 次全量下载 + 13 次 ranged HEAD + 端点复用。工件 `~/src/agent-teardown/history/copilot-chat/`（versions.json / externalIngest-bisect-results.txt / check.sh）。
