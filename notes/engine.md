# C8 引擎专题：agent 引擎架构全解析

C8 topical lane —— 跨全语料回答引擎本身怎么组织、怎么演化。证据链主力：webcrack 反混淆输出（3.12.3 zcode.cjs → 2479 模块 + index.tsv + **toplevel**.js，函数名经 `a(x,"name")` 标注还原）、2.13.0 zcode-acp 内嵌 JS 按 SEA 资源拆出的 1371 个__带真实文件路径__的模块、`extracted/<ver>/`、各版本 minified bundle 的 `a(x,"name")` 名称清单对比。

## architecture（3.x 引擎内部）

### 交付形态与启动

3.x 引擎是单个 esbuild bundle `glm/zcode.cjs`（shebang `#!/usr/bin/env node`，11.4MB@3.12.3），在 Electron 内嵌 Node（24.14.0）上运行。`glm/.node-bundle-meta.json` 源路径 `apps/zcode-cli/packages/cli/dist/zcode.cjs` —— 即 zcode-cli monorepo 的 cli 包产物。

同一个 bundle 是多模式 CLI（`extracted/3.12.3/glm/zcode.cjs` 末尾 `main()` + 反混淆模块 `2479_WZn.js:381-587`）：

| 子命令/flag                                 | 作用                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `app-server` / `agent-server`               | ZCode Protocol stdio 服务器（IDE 面向的 RPC 端点；两模式共用 `WMs()` 入口，help 只公开文档化 app-server） |
| `tui`                                       | 交互式终端 UI —— 引擎脱离 IDE 也可独立跑                                                                  |
| `--prompt` / `--target`                     | 无头一次性 prompt（支持 `--surface terminal \| desktop`、`--browser-use`、`--attach`）                    |
| `login` / `logout` / `doctor`               | 认证（OAuth，`--no-browser` 可选）与诊断                                                                  |
| `plugins` / `skills` / `commands` / `hooks` | 插件、技能、斜杠命令、hook 管理子命令                                                                     |
| `__internal-search`                         | 隐藏内嵌搜索后端（见 tools/ 节）                                                                          |
| `--prepare-storage`                         | 存储准备模式（跳过 env 加载主路径）                                                                       |

引擎在 IDE 侧的"运行时描述符"（`wc-3.12.3/modules/0159_her.js:3` 起）：`{binaryKind:"native-binary", binaryEnvVar:"GLM_BINARY_PATH", bundledResourceDir:"glm", version:"0.13.3", spawnArgs:["app-server","--stdio"], nativeConfigDir:".zcode/cli", nativeConfigFileName:"config.json", nodeBundleEntryFile:"zcode.cjs"}` —— **同一引擎有两种载体**：平台原生二进制 `zcode-agent`（`resolvePlatformBinaryName("zcode-agent",platform)`，远程部署用）或 node bundle `zcode.cjs`（本机 Electron 用）。spawn 命令即 `app-server --stdio`。

IDE↔引擎传输：Electron main spawn 子进程后先做 `zcode-hello` 握手（`extracted/3.12.3/app/out/main/chunk-VYL53EM6.js`，含握手超时、stderr 限长截断、退出码诊断），之后 stdout 上跑__换行分隔的 JSON-RPC__（bundle 内 73× "newline"、大量 `JSON.stringify`→stdout；无 Content-Length 帧）。stderr 上引擎写带 `zX` 前缀标记的结构化进程错误诊断（`writeProcessErrorDiagnostic`，bundle 末尾）。

### 线协议：两张 RPC 表

反混淆模块 `0136_qge.js:1728-1793` 定义 `dr` 方法表（zod 校验契约），`2420_X9n.js:176-364` 是 `ZCodeProtocolAgentServer.dispatchRequest` 的分发 switch；`1763_KLe.js:172-200` 定义第二张 `iu` 表。**这是自定义协议，不是标准 ACP**——标准 ACP 的 `session/new|prompt|update` 被全部改名重设计：

- **session 生命周期**：`session/create|resume|list|subagents|requestRuntimePreferences|read|messages|events|subscribe|send|stop|cancelBackgroundTask|fork|compact|goal|close|setModel|setThoughtLevel|setMode|usage`（zcode.cjs:45,3435 等处；RPC enum `LJt` 权限模式 = `["build","edit","plan","yolo"]`，schema 层另有 `auto`）
- **v4/conversation 网关**（`iu` 表）：`v4/conversation/{subscribe,resync,unsubscribe,rowsRange,plans,fileChanges,fileRewindPreview,usage,attachmentRead,attachmentStat,frame}` + `v4/telemetry/event`——事件溯源式会话复制协议：客户端 subscribe 拿 initial wires（frame 消息回放）+ resync 续传，UI 渲染从引擎事件流投影
- **workspace/provider**：`workspace/{readPresentation,hooks/trustGrant,updateInteractionPreferences,updateModelIoPreferences,updateOffPeakToolPolicy,generateText,cancelGenerateText}`、`provider/{updateAccountConfig,testModelConnectivity}`
- **plugins 全生命周期**：`plugins/{list,referenceCatalog,resolveSuggestedReference,setEnabled,overview,marketplace/add|remove|update,install,cancelOperation,uninstall,update,restoreBuiltin,configure,resetConfig,validate,describe}` + `skills/referenceCatalog` —— 带 AbortController 的取消机制（`withPluginOperationSignal`）
- **automation/offPeak**：`automation/{create,update,checkTaskBinding,list,delete}`、`offPeak/{create,list}`
- **基础设施**：`mcp/list`、`usage/stats`、`process/childProcesses`、`interaction/{requestPermission,requestUserInput,requestProviderRuntimeHeaders,requestOfficialMcpAuthHeaders,browserList,browserExecute}`（后四类是引擎→客户端反向请求，不在 dispatch switch 内）
- **startup 存储协商**：`startup/{storagePath,storagePrepared,storageState,storagePathReady}`（`0136_qge.js:1818-1832` discriminated union）——客户端先协商存储路径引擎再开库

每个请求先经 `sessionResidentPool?.acquireOperation(sessionIds)` 拿租约（`2420_X9n.js:164`）再做 dispatch——会话驻留池在 RPC 边界上做并发控制。

### 会话层

**SessionResidentPool**（`2419_Y9n.js:3`）：常驻会话 LRU 池，`targetCount=8 / highWaterCount=16 / idleTimeoutMs=600000`（zcode.cjs:3424）。`acquireOperation` 按 sessionId 计租约、防止运行中的会话被驱逐，`rebalance()` 在释放时回收 idle 会话——引擎把"热"会话（含已加载对话+agent runtime）保活，冷会话 deactivate。

会话域模型（`0107_bw.js:3-114` 的 zod schema）：sessionKind ∈ `{interactive, fork, selection_side_chat, workflow_parent, workflow_child, subagent_child, nested_workflow_child}`；status ∈ `{idle,running,waiting,paused,completed,error}`；消息 origin ∈ `{real_user, agent_runtime, system, migration, import}`；事件源 ∈ `{background_task, fork, goal_state_change, goal-continuation, plugin_reference, rewind, selection_side_chat, subagent, subagent_message, todo_reminder, shared_context}`。**会话带 goal/target 实体**：objective + status `{active,paused,budget_limited,complete}` + `tokenBudget/tokensUsed/timeUsedSeconds`——目标导向 agent 循环，超预算停；`goal_verification` 是合成 timeline 条目（`0107_bw.js:47-61`）。token 用量细分 `input/output/reasoning/cache.{read,write}`（Anthropic 式 prompt-cache 记账）。

### AgentRuntime 与 turn 机

`AgentRuntime`（`1985_nUt.js:11-200`）是单会话运行时 god-object，构造函数注入 ~25 个 port/service：**port 化六边形架构**——`mcpPort, skillPort, subagentPort, executionPort, fileSystemPort, imageProcessorPort, pdfDocumentPort, providerRuntimeHeadersPort, browserControlPort, contextSourcePort` + `permissionService, permissionBroker, toolScheduler(maxConcurrency), hookRunner, workspaceHookAdmission, modelFactory, eventStore, sessionStore, artifactStore, runtimeTaskRegistry, agentTelemetry`。状态含 `runtimeCommandQueue`（串行命令队列）、`pendingInputReservations`（turn 进行中排队用户输入）、`activeForegroundExecution/foregroundPromotionLease`（前后台执行晋升）、`autoCompactConsecutiveFailures`（自动压缩带失败计数）、`mainTurnCacheHitAggregate`（cache 命中遥测）、`memoryRecallState/memoryExtractionScheduler/memoryDreamLastScanAtMs`。方法体由 `installAgentRuntimeMethods`（`1981_ICn.js`）从全 monorepo 的 methods 模块拼装——对应 2.13.0 里 `core/dist/runtime/methods/` 43 个文件的同一布局。

**TurnMachineImpl**（`1463_TDt.js:6-206`，zcode.cjs:2128）是纯函数式 turn 状态机，phase 流转：`ProcessingInput → AwaitingModelResponse → Streaming → SchedulingTools → (AwaitingPermission | ExecutingTools) → AggregatingResults → 回到 AwaitingModelResponse 或 Completing/Error`。toolCalls 逐条追踪 `scheduled/waiting_permission/running/completed/failed/permission_denied`；`getNextPhase()`（:170-190）实现循环——工具全成且无失败 → 回 AwaitingModelResponse 再请求模型；有失败/拒绝 → Completing。`pendingInputs` 队列支持 turn 中途注入用户输入；`resolvePermission` 允许 modify 决策改写 toolCall input（权限升级时参数可被编辑）。

### 工具面

规范工具表（`0210_vrr.js:2-36`）28 个，按 family 分组：`Read(file-read) | Write/Edit/ApplyPatch(file-write) | Bash(shell) | Glob/Grep/WebFetch/WebSearch/web_search(search) | TodoRead/TodoWrite(todo) | GoalRead/ReadSessionContext(goal/session-context) | AskUserQuestion | SendMessage/RespondToCoordinator(message) | TaskOutput/TaskStop(task-control) | js/js_reset/js_add_node_module_dir + mcp__node_repl__*(node-repl) | Agent/Task(agent) | Skill(skill)`。Claude-Code 式命名 + ApplyPatch（codex 血统）+ coordinator 消息对（多代理编排）+ 内嵌 node REPL（agent 可直接跑 JS）。

模型侧工具不止这 28 个：MCP 工具经 `mcpPort` 注册（`mcp__` 前缀），`OffPeakCreate`、`CronCreate` 等特化工具带完整 modelInstructions（`1724_pLt.js:51-52` OffPeakCreate 的 description+10 条使用规则——闲时任务"消耗免费排队配额、服务器决定何时跑、run 内禁止再建闲时任务"）。

### 模型层

vendored 并__打过补丁__的 Vercel AI SDK（`1269_uG.js`，3430 行）：`streamText/generateText/stepCountIs` 带 OTel span 名 `ai.streamText(.doStream)`，ZCode 自定义扩展 `tool-approval-request/tool-approval-response` 流事件类型（:640-645,1701,2950）——把人工审批嵌进 SDK 的 step 循环。外围：`AiSdkModelAdapter`（1316）、`AiSdkModelExecution`（1227）、`ApiProviderModelRuntime`（2323）、`ModelStreamIdleTimeoutError`（1229）、model option map DSL（`compileModelOptionMap`，zcode.cjs:45 区域——声明式 per-model 参数补丁）、attribution headers（1278）、`providerRuntimeHeadersPort`（1879 每次 model attempt 前刷新 headers）。

provider 协议种类（字符串证据）：`anthropic-messages, openai-chat-completions, openai-responses, gemini` + zhipu 系（`zhipu-account, zhipu-coding-plan-api-key, bigmodel-coding-plan` 等 27+24 处）+ azure/bedrock/ollama 字符串。`config/provider/zcode-builtin.json`（3.12.1 新增 resources 工件）声明内置模板：`zai-api`（Z.ai Coding Plan，anthropic-messages @ api.z.ai/api/anthropic，内置 GLM-5.3/GLM-5.3-Flash）与 `zai-standard-api`（openai-chat-completions @ api.z.ai/api/paas/v4，GLM-5.3→GLM-4.5 全谱系）。

### 记忆/压缩/持久化

- 记忆子系统：`memoryRecallState/prefetch` + `memoryExtractionScheduler` + `project_memory_{extract,recall,dream}` 三种操作（zcode.cjs 匹配处；`buildMemoryExtractionPrompt/buildPersistentAgentMemoryPrompt/buildProjectMemoryIndexContent/collectMemoryPaths` 等 3.5.3→3.6.5 新增名）——后台提取 + 召回 + "dream" 扫描整理
- 压缩：`runCompactTurnInBackground`、`compactActiveConversationImpl`、`microcompact`（2.13.0 已有 `core/dist/compact/microcompact.js`）
- 持久化：**`node:sqlite`**（Node 24 内建）`~/.zcode/cli/db/db.sqlite`（zcode.cjs:1812,1214；默认配置 `storage.sessionDbPath`）；启动走 `sqlite_migration` 流程 + `startup/storagePath` RPC 协商；event store + event reducer 事件溯源

### tools/（rg/bfs/ugrep）如何被调用

三层机制（`0205_urr.js`、`2293_OUn.js`、zcode.cjs:3199）：

1. `resolveDefaultEmbeddedSearchBackend`：`ZCODE_EMBEDDED_SEARCH_COMMAND` env → `internal-cli` 模式（重 exec 自身 `__internal-search`）；否则 `native-binaries`：`findCommand=ZCODE_BFS_BINARY||bfs`、`grepCommand=ZCODE_UGREP_BINARY||ugrep`、`rgCommand=ZCODE_RG_BINARY||rg`；另有 `argv0-dispatch` 模式（`ARGV0=bfs|ugrep` busybox 式复用 server-bundle）
2. 描述符带版本钉：`bfs linux v4.1.1-2, ripgrep darwin v13.0.0-10/linux v14.1.1-1, ugrep linux v7.8.4-1`（与 `.bundle-meta.json` release tag 一致）+ `getRemoteRuntimeToolsForPlatform`——**远程部署也推这三个工具**
3. shell 函数包裹：`iEo/sEo` 生成 `find`/`grep` shell function（`command bfs <args> "$@"`、`command ugrep ...`），model 在持久 shell 里写的 `find`/`grep` 被路由到 bundled 二进制；检测逻辑 `unalias rg; command -v rg`（zcode.cjs:3199 附近）
4. 兜底：bundle 内置 **ripgrep WASM** worker（`0627_n9.js:34`，`import("ripgrep")`，超时即终止）——原生二进制不可用时降级

### 远程运行时

部署清单（`0095_F0e.js:2`）：`["server-bundle","node-runtime","node-pty","glm","bfs","ripgrep","ugrep"]`；IDE 侧 deployer（`chunk-VYL53EM6.js`）走 SSH exec `mkdir -p`/`chmod +x`/`mv -f`，远端根 `~/.zcode/server`，按 runtime 分目录（`glm/<tag>/zcode.cjs + packages/*`、`tools/...`），开发态按 sha 跳过重复上传，`ZCODE_REMOTE_DEV_AGENT_BUNDLE` env 覆盖。配套 `buildRemoteEnvironmentKey/buildSshRemoteHostKey/buildRemoteWorkspaceIdentity`（3.10→3.12 新增）+ `web-remote-replayable` session kind + WSL/SSH/docker/server remote_kind 遥测枚举。

## engine evolution

### 2.x→3.x：同一 monorepo，换载体

**决定性证据：2.13.0 zcode-acp 内嵌 JS 的模块路径与 3.x 逐层对应**（zcode-acp SEA 资源拆出的 index.tsv）：

- `../core/dist/agent/turn-machine.js`、`turn-state.js`、`message-history.js`、`session-history-hydrator.js` —— TurnMachine 已在
- `../core/dist/runtime/methods/` **43 个文件**：turn, turn-loop, turn-model-step(-usage), turn-stop, turn-tools, turn-tool-usage, turn-tool-warnings, turn-nested-model-usage, compact(-active,-persistence), microcompact, context(-usage), memory, memory-recall, rewind(-message), steering, streaming-recovery, streaming-tool-coordinator, streaming-tool-synthetic-result, subagent, target(-completion-verification), workspace-checkpoints, reasoning-stream, model(-status), session-title, hooks, mcp, resume, background, events, message-persistence, tool-part-*, usage-observability, config
- `../core/dist/tool/handlers/` 26 个：agent, apply-patch, ask-user-question, bash(+model-content), edit, glob, grep, read, send-message, skill, target, todo, webfetch(×8), workflow(+description), write —— **3.x 的 28 工具表在 2.13.0 已基本成形**
- `../contracts/dist/` tools×20/interfaces×17/events/model/workflow/skills/rewind/memory/hooks/compact/tracing —— 契约包，即 3.x `dr`/`iu` zod 表前身
- `../adapters/dist/` model×32/storage(session-store+repositories×10)/auth×8/config×8/mcp/skills/commands/fs/network/logging —— 端口适配器层
- `../bootstrap/dist/acp/` **27 个文件**：acp-entrypoint, app, event-forwarder, events, extensions, goal-command, history, model(-events,-injection,-state,-targets), acp-model-routing, notifications, permission(-elicitation,-result), prompt, replay, session(-config,-lifecycle,-message), todo-plan, tool-events, workflow, custom-commands —— 2.x 的 ACP 服务壳 = 3.x protocol server 前身

即 2.x 就已经是 `contracts + core(runtime/tool/agent/compact/memory/workflow/subagent/permission/hooks) + adapters + bootstrap/acp + cli` 的 pnpm monorepo（`apps/zcode-cli/packages/*`）。3.x 改的只有：编译单文件（Node SEA 168MB）→ electron-node 跑 JS bundle（9.4MB）；spawn 子命令 `acp` → `app-server --stdio`（2.13.0 `chunk-DZG5AG7F.js` glm 描述符 `spawnArgs:["acp"]` vs 3.12.3 `0159_her.js` `["app-server","--stdio"]`，其余字段 binaryEnvVar/bundledResourceDir/nativeConfigDir/missingBinaryMessage 逐字段同构）；线协议从标准 ACP 方言改为自定义 `session/*`+`v4/*` RPC。

注意 2.13.0 glm 引擎__已经扩展过标准 ACP__：`session/fork|resume|list` 存在于二进制（stock ACP 只有 new/prompt/load）；`session/create|send|compact` 是 3.1.0 起的定名（逐版 grep 证实 2.13.0 无 create/send/compact，3.1.0 起全套出现）。

### 3.x 逐版演化（名称清单 diff + bundle 体积）

`a(x,"name")` 函数名清单：3.1.0=5082 → 3.5.3=7247 → 3.6.5=8234 → 3.9.2=8908 → 3.10.0=9002 → 3.12.3=9361（+85%）→ **3.14.0≈21.6k**（口径注：标注函数字母随构建轮换，3.14.0 为 `r(`；按统一 `[a-z](x,"name")` 口径 3.12.3=13548 → 3.14.0=21639，+60% 为全语料最大单版跳跃）。bundle：9.43MB(3.1.0) → 8.99MB(3.2.0，收缩) → 11.73MB(3.4.0，+2.5MB 跳跃) → 13.13MB(3.7.6 峰值) → 11.42MB(3.12.3，3.12.x 瘦身 ~1.2MB) → **14.80MB(3.14.0，+3.4MB 新高)**。

| 版本          | 落地特性（首现版本，grep 逐版验证）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.2.0         | `plugins/*` RPC 进入 bundle（3.1.0 无 `plugins/install` 命中，3.2.0 起有）；bundle 反缩 0.44MB                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 3.4.0         | **v4/conversation 网关 + automation/create RPC**（3.3.6 均为 0）——+2.5MB 跳跃主体；事件溯源会话复制协议上线                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 3.5.2         | `browserControlPort` 浏览器控制端口（3.4.0:0 → 3.5.2:11）——CUA/browser 自动化入引擎；同版 app deps 加 playwright-core 1.59.1（runtime.md）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 3.5.3→3.6.5   | OpenTelemetry 全套 vendored（ConsoleMetricExporter/SpanExporter/AsyncHooksContextManager/BoundedQueueExportPromiseHandler）；**持久 agent 记忆**（buildMemoryExtractionPrompt/ProjectMemoryIndex/memory recall/selector）；compaction/bash 性能遥测；AutomationCreateLimit；`config/default.json` 首现（feedback/community 配置）                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 3.6.5→3.7.3   | **SessionResidentPool + McpConnectionPool**（3.6.1:0 → 3.7.3:2/1）；offPeak schema 埋点（泛 `offPeak` 命中 3.6.5 起 ~9 处，此时只是策略/配额地基）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 3.7.7→3.8.1   | **workspace hooks**（workspaceHook 0→12：trustStore/reviewRequest/bundleSnapshot/admission + `zcode:permission-capability:official_cua`）；**ClientRequestSigningV4**（请求签名，0→2-4）；OAuth provider 适配（adaptOAuthProvider）；official CUA 帧鉴证（attestOfficialCuaFrameContent）；plugin reference catalog/skill qualified names                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3.9.1→3.10.0  | sharp 图像处理 + koffi FFI（CUA 截图管线，runtime.md .node 节）；glm/packages 增 zcode-cua-plugin                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 3.11.1→3.12.1 | **offPeak 上线**：`offPeak/create \| list`RPC +`OffPeakCreate`agent 工具（3.11.1 全 0 → 3.12.1 =1+6）+`assertNotOffPeakTurn/OffPeakTicketExpiredError`；SSH/web remote workspace 全套（buildSshRemoteHostKey/buildWebRemoteControlBridge…）；`config/provider/zcode-builtin.json` provider 模板表；**移除 thinking-toggle 子系统**（anthropicFixedThinking/createThinkingToggle*/disableOpenAiThinking 等 ~20 名在 3.11.2→3.12.1 消失，配合 bundle 瘦身——per-provider reasoning 档位逻辑重构）                                                                                                                                                                                                                                                                                            |
| 3.12.3→3.14.0 | **dynamic workflows 引擎化**：`CreateWorkflow`×46 + `createWorkflow{ChildRuntime,ConcurrencyGovernor,EscalationRegistry,Facade,Handler,Methods,ObservationDisplay,PhaseAlongside}` + `dynamicWorkflow{RunPort,SnippetPort,ChildSpawn}` + `workspace/updateDynamicWorkflowPolicy` RPC；`session/debug` 入 `dr` 表；`__ZCODE_{VERSION,COMMIT,BUILD_TIME,ENV,PRODUCT_FLAVOR}__` 编译期常量（替代 ZCODE_VERSION/ZCODE_COMMIT env）；**CUA SDK v3**——执行面迁出引擎入 `node-repl-host` 共享宿主（`zcode.node-repl.computer-use-bridge` Symbol），模型可见面与 Codex `cua` 同构；本地 TTFT 遥测（`localTtftFacts/localTtftNow` + sampleRatio/dropped schema）+ OTel metrics；`repoSnapshot*`/`captureIntent*` 标识符族消失（快照报告 lane 复裁）；bundle +3.4MB、名称 +60% 为全语料最大单版增长 |

2.x 内演化（要点，详见 c1/notes）：五运行时全部 2.2.0 已在（`ACP_BINARY_PATH/CODEX/GEMINI/GLM/OPENCODE_BINARY_PATH` env + bundledResourceDir 表）；claude 在 Bun 单文件↔npm vendor 树间振荡（`shouldRequireClaudeNativeRuntime(v,"0.35.0")` 版本门槛，index.js）；codex 在 @openai/musl 与 @zed/codex-acp 间切换、适配器 2.2.0 复用 Claude 型 → 2.13.0 独立 `createCodexSessionAdapter`；glm 全程 zcode-cli 编译二进制 0.x（2.13.0=0.13.0，3.12.3 描述符 version 已 0.13.3）。

## 2.x division of labor

**五运行时全部是 ACP server，IDE 是 ACP client，按 workspace 的 model 选择路由**（`extracted/2.13.0/app/out/main/index.js` + `chunk-DZG5AG7F.js`）：

| provider | 运行时                                                                 | 入口                              | session 适配器                                                                                               |
| -------- | ---------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| glm      | `glm/zcode-acp` 168MB Node-SEA 二进制（zcode-cli 0.13.0，自研）        | `zcode-acp acp`                   | Claude 型（"glm 首版按 Claude 风格 session 响应接入"注释，index.js adapters 表）                             |
| claude   | `acp/` @agentclientprotocol/claude-agent-acp（Anthropic 官方）         | npm vendor 树或 Bun 单文件 claude | Claude 型                                                                                                    |
| codex    | `codex/` @zed-industries/codex-acp（Rust bin + bin/codex-acp.js 入口） | `node …/codex-acp.js`             | 专用 Codex 型（models+modes + effort 方言 slash/bracket 兼容，注释"回滚 Zed runtime 后仍保留"）              |
| gemini   | `gemini/` gemini-cli fork JS chunks                                    | `gemini.js`                       | 复用 opencode 型（注释：v0.37.0 session/new 返回 models+modes，误用 Claude configOptions 曾致模型列表 0 项） |
| opencode | `opencode/opencode` 144MB Bun 二进制                                   | `opencode`（ACP 模式）            | opencode 型（models+modes）                                                                                  |

关键机制：

- **每 provider 独立配置隔离**：`acp-config/<provider>/<workspaceHash(sha256:12)>` + gemini 走 `.gemini`、glm 走 `.zcode/cli`（`getProviderWorkspaceConfigDir`，index.js）
- **模型选择即 provider 选择**：`modelProviderService.resolveWorkspaceModelSelection({acpProvider,workspacePath,workspaceIdentity,modelProviders,localPreference})`（renderer index-BI2MDF1h.js）——无全局默认引擎，用户选模型定 provider；GLM 系模型天然走 glm
- **acp-proxy-runtime**：session 级可选 MITM（`acpProxyUrl/acpProxyCaCertPath` 会话配置项），`proxyServer/capture/certificate/geminiOpenaiChatCompat/httpForwardingCodex{Anthropic,Gemini}Compat`——gemini/codex/anthropic 三种 wire format 互转 + 流量抓包，配套 `acpProxyTrafficWindow` 调试窗口（`../main/acpProxyTrafficWindow.ts` 源路径注释）——**协议翻译 + 调试设施，不是常设路径**
- 每 workspace 每 provider 一个 ACP 进程：`joinZCodeProcessName("acp",provider,workspaceTag)`（chunk-DZG5AG7F.js）

## REVIEW（未能确证/存疑处）

- **epoch-gap.md 一处勘误**："`acp/`+`acp-proxy-runtime/`（3.12.3 有、3.7.5 无）是更晚的再引入"不成立——`git ls-tree` 逐版验证 3.x 全语料（3.7.5/3.8.1/3.9.2/3.10.0/3.11.1/3.12.3）resources 下均无 acp/ 与 acp-proxy-runtime/ 目录；3.x 只新增 `config/`（3.5.3 起 default.json，3.12.1 起 provider/）。同文件"`config/`（3.7.5 起）"亦偏晚——3.5.3 已有。
- **agent-server 模式定位未确证**：与 app-server 同 case 处理（2479_WZn.js:564-567），help 未文档化；推测为无头/远程 agent 专用协议端点（vs app-server 的 IDE 全功能面），未找到独立 dispatch 证据。
- **"OpenCode 派生"未被代码级证据坐实**：zcode.cjs 内 opencode 串×18 多为语义引用；monorepo 结构（core/contracts/adapters/bootstrap）与工具集更像 Claude-Code 谱系 + ApplyPatch 等 codex 命名混入。引擎血缘=自研 zcode-cli，非直接 fork opencode——但 2.x 同时 bundle opencode 二进制说明深度参考。源码级 diff 不可行（无 opencode 源码对照），此判断基于结构相似性。
- **turn 机 vs AI SDK 关系**：TurnMachineImpl 是 ZCode 自有状态机（phases/toolCalls/pendingInputs），AI SDK streamText 的 stopWhen/prepareStep 循环被包进 turn-model-step——两层循环（turn 级 ZCode 状态机 + step 级 AI SDK）的确切边界由反混淆命名推断，未逐行走查 356 号 turn-model-step 实现确认。
- **sessionResidentPool.acquireOperation 的粒度**：参数经 `mRs(t.params)` 提取 sessionIds，确认按会话租约；但"哪些方法被池化"依赖 params schema，未逐方法核对。
- **`memoryDream` 语义**：`project_memory_dream` 操作类型存在（3.12.3），推断为后台记忆整理扫描（memoryDreamLastScanAtMs 节流字段佐证），具体 prompt/流程未读。
- **名称清单方法局限**：逐版名称清单提取自 `X(y,"name")` 模式，混有少量属性键/字符串参数（如 "a0","abort"）；计数是__特征面代理指标__不是精确函数数；边界版本均为两端 grep 验证过的才敢写进表。
- **3.2.0 bundle 收缩 0.44MB 原因未查明**：3.1.0→3.2.0 体积降但名称数升——可能是构建参数（tree-shaking/压缩）变化而非功能删除；未做二元 diff。
