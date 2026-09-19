# 3.12.3 → 3.14.0（单边界，跳号版）

Scope: v3.12.3（build 7463）→ v3.14.0（build 7681，build-meta commit `a1328db1`、buildTime `2026-09-19T01:46Z`、electron-builder 26.8.1）。**3.13.x 整条线未发布**——releases/{3.13.0..3.13.4}/linux-x64/*.deb HEAD 全 404，3.12.4/3.12.5 亦无；版本号从 3.12.3（09-16）直跳 3.14.0（09-19 03:29Z 上传 CDN，距 buildTime ~2h）。官方 `latest.yml`/`latest-linux.yml` feed 已于 2026-09-19 前后 CDN 级撤除（全部版本含已存档者均 404），本版无 releaseNotes 可考；`manifest/versions.json` 的 size/releaseDate 取自 deb HEAD（`last-modified`），sha512 为下载后自算。deb 162,038,244 B（+15.1MB vs 3.12.3）。

`diffs/3.12.3__3.14.0.md`：endpoints +10/−6、flags +15/−33、env +6/−6、acp_methods −5、ipc +6、plans +3、plugins_skills +8、native +2、deps +3；models 303 持平；engine glm-zcode、host 二进制 sha256 `7f7881d0…` 不变（Electron 41.0.3 底座零变更延续）。zcode.cjs 11.42→14.80MB（+3.4MB）、名称清单 ~13.5k→~21.6k（+60%，全语料最大单版跳跃）。git diff 6038 文件 +72.3 万/−27.8 万行。

## 头条：dynamic workflows 引擎化落地

签名面：`+workspace/updateDynamicWorkflowPolicy`（zcode.cjs `dr` 表新条目）、flags `+{dynamicWorkflowEnabled,isDynamicWorkflowModeEnabled,workflowTabEnabled,ZCODE_DYNAMIC_WORKFLOW_MODE{,_ENV},ZCODE_WORKFLOWS_RUNS_MAX_LIMIT}`、plugins_skills `+command:workflow`、`+skill:dynamic-workflows`。

实现面（全部新增于 `glm/packages/zcode-guide-plugin/` 与 `glm/zcode.cjs`）：

- `zcode-guide@0.2.0` 新增 `commands/workflow.md`（"Design and launch a dynamic workflow"）+ `skills/dynamic-workflows/`（SKILL.md 1042 行 + examples.md 661 + patterns.md 460）——命令体明示"先定 subagent topology（几个 subagent、谁共享 context、各返回什么），再写脚本并调 **`CreateWorkflow`** 工具"，并点名禁用 legacy `Workflow` 与 `Agent` 工具。
- 引擎侧 `createWorkflow*` 家族成体系出现：`CreateWorkflow`×46 + `createWorkflow{ChildRuntime,ConcurrencyGovernor,EscalationRegistry,Facade,Handler,Methods,ObservationDisplay,PhaseAlongside,…}` + `dynamicWorkflow{RunPort,SnippetPort,ChildSpawn}`（RunPort/SnippetPort 各 ~25/8 处）——工作流运行时、并发治理、升级登记、观测显示均已进 zcode.cjs 主 bundle，不是插件层贴纸。
- 会话域已有 `workflow_parent/workflow_child/nested_workflow_child` sessionKind（engine.md §会话层，3.12.x 已见）；本版补的是**动态**工作流——agent 运行期自行编排子代理拓扑并下发，区别于既有静态 workflow 定义。

## 次条：CUA 重写为 node-repl 共享宿主 + Codex `cua` 同构 API

`glm/packages/zcode-cua-plugin/dist/mcp/server.js` **68,048 行整体删除**（连同 `scripts/build-mcp.mjs`），签名 `plugin:computer-use:mcp:computer-use` 消失；computer-use 0.5.14→0.6.1 的 plugin.json 只剩 `skills`，不再声明 stdio MCP server。

- 新宿主 `glm/packages/node-repl-host/`（23MB，plugin `node-repl-host@0.6.0`）：manifest 自述"Shared node_repl runtime host … **Not user-facing**：no skill、不进 marketplace 列表；Browser Use 与 Computer Use 启用它并自带 skills/docs/资产"。即 CUA/browser-use 的执行面统一收进共享 node_repl 宿主（dist/ 内含其 mcp）。
- 新客户端 `zcode-cua-plugin/scripts/computer-use-client.mjs`（+1208 行）头注自证设计：**模型可见面与 Codex 的 `cua` 逐字同构**（基线 `@oai/cua@0.2.4` tinysky_alt 类型表，设计文档 `docs/refactor-port-specs/2026-09-10-cua-sdk-v3-api.md`；R1 同名同签、R2 附加成员为零、R3 安全语义只藏不删）。桥接经 `Symbol.for("zcode.node-repl.computer-use-bridge")`，存活工具面 `cua.computer`：`list_apps/list_windows/get_app_state/left_click/scroll/left_click_drag/type/set_value/select_text/…`。显式不融合 browser-use（无 browsers/getBrowser/getTab）。
- 老的 unix-socket helper broker 方法表同步瘦身（host/index.js）：`mouse_down/mouse_up/move_to/list_displays` 移除（`broker_info/capture_app/screen_capture_probe` 仍在）——与签名 acp_methods −7（`tasks/{cancel,get,list,result}` 亦撤，这些 MCP-spec 字面量此前在 3.7.3 撤过、3.9.1 回过，本次随 CUA MCP server 删除再度消失）互证。
- env 换血：旧 broker 套 `ZCODE_CUA_{BROKER_TOKEN_ENV_KEY,CANONICAL_MODEL_PREFIX,HELPER_ALLOW_UNAUTHENTICATED_LOCAL,HTTP_AUTH_TOKEN,PROVIDER_SPELLING_ALIAS_PREFIX,RUNTIME_PACKAGE_DIR}` 全删；新套 `ZCODE_CUA_{NODE_REPL_HOST{,_ENV_KEY},PLUGIN_ROOT,LIVE_NATIVE,MAX_ELEMENTS,ELEMENT_CLICK_EVENT_FIRST,DISABLE_CPS_ACTIVATION}` + `ZCODE_MCP_NODE_REPL_CUA_APP_META_KEY` + `ZCODE_CUA_BUNDLED_HELPER_APP_PATH`（指向 `~/.zcode/computer-use/dev`）。

## 插件面：document-skills 一拆五 + plugin-creator 首发

`glm/packages/` 8→14 目录。`document-skills-plugin`（0.1.5）删除，拆为 **documents@0.1.7（skills/docx）、pdf@0.1.7（skills/pdf）、presentations@0.1.7（skills/pptx）、spreadsheets@0.1.7（skills/xlsx）**——每插件各带 `agents/`；原 document-skills 的 HTTP MCP `image_search`（`${ZCODE_BASE_URL}/api/v1/mcp/server/image_search`，`zcode_official`+jwt_token，90s）迁入独立 **`image-search@0.1.1`**（无 skills，纯 MCP）。**plugin-creator@0.1.1 首发**："Develop and validate ZCode plugins through a local dev marketplace, installation, trials and updates"，skills 目录齐备——插件创作工具链进场（skill-creator 的插件版对偶）。zcode-guide 0.1.0→0.2.0（+workflow 命令 +dynamic-workflows skill）、browser-use 0.4.2→0.5.1、computer-use →0.6.1。native +2：`@img/sharp-linux-x64`（同 sha `fdbcd90b…`）复制进 browser-use-plugin 与 node-repl-host 的 node_modules（zcode-cua 原有的一份仍在，sharp 实体现三份）。

## 快照上传面：功能族整体移除

- 签名 endpoints `−/api/v1/snapshot/upload-credential`；全树 `rg` 确认该字面量在 3.14.0 任何文件中均不存在（`upload-credential` 一词仅存于 main/index.js 一个 ~50 词的 URL 路径段字典内）。`/mcp`、`/oauth/` 同版消失——两者均在已删除的 CUA `dist/mcp/server.js` 内（3.12.3 该文件 54 处命中），非控制平面变化。
- `repoSnapshot*`/`captureIntent*`/`enforceRepoSnapshotDiskQuota`/`repoSnapshotCaptureIntentScheduler` 标识符族在 `app/out/**` 全部消失；`PostObject` 字面量亦消失。
- 但 OSS **signature-v4** 表单字段（`x-oss-signature`/`x-oss-signature-version`/`x-oss-credential`/`x-oss-security-token`/`x-oss-date`、`e.oss.{path,policy,…}`、`callbackBody` base64）仍在 `host/index.js`，附着的调用方是通用上传族：`FeedbackUploadCanceledError`、`browserRecordingUploader`、`on{,Dynamic}UploadProgress`、`summarizeUploadCredentialBody`、`computeUploadTimeoutMs`。
- 判定：**工作区快照上传功能族整体移除**——工作区快照专用的标识符、设置键与凭证端点字面量全部撤出，存活的是反馈/录屏通用 OSS 直传面；28 项追踪指标本版归零，逐类清点见 `2026-09-19-工作区快照上传` 报告 §14。

## 其余签名增量

- **营销触达**：`+/api/v1/marketing/touch`（`GET ?seq=N`，带 locale，host/index.js `async query({locale})`）+ `+/api/v1/marketing/touch/action`（POST，body 含 `entity_changed`）——应用内营销触点查询与动作上报，与 plans 的 `plan:claim_plan`/`plan:claim_zcode_plan`（scheduler + zcode.cjs 通知动作 schema：`{type:"claim_plan",planId}`/`{type:"claim_zcode_plan",args:{plan_id}}`，配 `open_external`；呼应 rewardsWebview preload）构成触达→领取→上报闭环。
- **本地性能遥测**：`+zcode:report-local-ttft-batch`、`+zcode:report-renderer-heap-sample`、`+zcode:set-resource-usage-sampling-active`、`+zcode:set-shortcut-recording-active`；`localTtftFacts`/`localTtftNow`/`localTtftEnabled` + schema `{enabled,sampleRatio,dropped}`（本地 TTFT 采样上报，`ZCODE_LOCAL_TTFT_ENABLED` 门控）；`ZCODE_{CLI,MCP}_RESOURCE_SAMPLE_INTERVAL_MS` 资源采样间隔。deps `+@opentelemetry/exporter-metrics-otlp-proto 0.214.0`、`+@opentelemetry/sdk-metrics 2.6.1`——OTel 从 trace 扩到 metrics 导出。`+yauzl ^3.3.0`（host 内 zip 解包，`pu=8MiB/mg=32MiB/l3=128MiB` 限额 + `.bundle.json` 标记——插件/包安装链路）。
- **协议**：`dr` 表 `+sessionDebug:"session/debug"`（sessionCreate 旁）；IPC `+zcode:session_create:v1`（main/chunk-3FBMHTTY.js，**首个带版本后缀的 zcode: 通道**）。provider registry `config/provider/zcode-builtin.json` revision 28→30。
- **构建时常量编译化**：zcode.cjs 出现 `__ZCODE_{VERSION,COMMIT,BUILD_TIME,ENV,PRODUCT_FLAVOR}__` 占位常量（`normalizeZCodeProductFlavor` 归一），对应 env 移除 `ZCODE_VERSION`/`ZCODE_COMMIT`（连同 `LOG_STREAM`/`LOG_TOKENS` 调试 env）；新 `ZCODE_DESKTOP_HOME_DIR`/`ZCODE_DESKTOP_USE_ELECTRON_DEFAULT_USER_DATA`/`ZCODE_HOME`（telemetry device_mid 派生与 CUA helper 路径用）——`"ZCode Preview"` flavor 分支字面量佐证多渠道构建。
- **flags −33**：`ZCODE_AGENT_MODE_{ID_SET,OPTIONS}`、`ZCODE_PROVIDERS`、`ZCODE_REPO_WIKI_MODEL_REQUEST_TIMEOUT_SECONDS`、`ZCODE_E2E_REPO_WIKI_GENERATION_FIXTURE`、`ZCODE_ATTACHMENT_FAULT_CODES`、`ZCODE_MCP_ERROR_PRESENTATION_*` 等移除——repo-wiki/agent-mode 配置面收缩；`webRemoteControlFeatureEnabled`/`semanticRecallEnabled`/`instantGrepIndexingEnabled`/`repoSnapshotIndexingEnabled`/`optimizeAgentExperienceEnabled` 等 `*Enabled` 族一并消失（含 repoSnapshotIndexing——与快照面收缩同向）。

## 提取噪音（勿当产品变化）

- `WARNING: stopped searching binary file after match (found "\0" byte around offset 5205782)`：grep 对新增二进制命中截断产生的告警行被采集成签名（models/endpoints/flags/ipc/plans 各混入一条变体）。
- `aka.ms/tsc*`、`iso.org/iso-{3166,4217}`、`unstats.un.org`、`currency-iso.org`、`DefinitelyTyped`、`Microsoft/TypeScript` URL 族 + `TSC_*`/`VSCODE_INSPECTOR_OPTIONS`/`NODE_INSPECTOR_IPC` env + `ThrowProjectLanguageServiceDisabled`/`getOrCreateInferredProject…`/`hasJsonModuleEmitEnabled` 等 tsserver 内部函数名——vendored TypeScript 语言服务捆绑被本轮扫到（新噪音源，量级 ~30 条）。
- `moonshot-kimi-`（models −1）：模板前缀串消失，moonshot 系 modelId 在 `zcode-builtin.json` 仍在（rev 30），非目录删减。
- `https://github.com/${dre`→`${GU`、`vercel.com …${n`→`${r`：模板变量重排噪音（line-3.9-3.12 已立档）。
- `http://localhost`（endpoints +1）：node-repl-host 本地服务地址。

## through-lines

- **CUA 第三代**：unix-socket helper broker + 自研 MCP server（3.3.5–3.12.3）→ node-repl-host 共享运行时 + Codex `cua` 同构 SDK v3（3.14.0）。官方第一次公开对齐 Codex 工具面命名（此前 HN 风评"UI 是 Codex 复刻"只到界面层）。
- **agent 编排三级跳**：静态 workflow（2.13.0 已有 workflow handler）→ subagent/task 工具（3.x 全程）→ 运行期动态工作流 CreateWorkflow + 并发治理 + 策略 RPC（3.14.0）。
- **插件市场内循环闭环**：官方插件 → marketplace → **plugin-creator**（本地 dev marketplace 验证）→ zcode-guide 教写 workflow——插件生态开始自举。
- **包体构成换重心**：glm 45M(3.9.2)→80M 的增量主体不再是 zcode.cjs 本身而是 `packages/` 插件群（node-repl-host 23M 一家独大）；vendored 依赖随插件膨胀。
- **遥测第三次扩张**：ARMS RUM + crash dump（3.12.x）→ 本地 TTFT + renderer heap + 资源采样 + OTel metrics（3.14.0）——性能指标开始产品化回传。
- **信息披露面收缩**：`latest.yml` feed 撤除 + 快照凭证端点字面量消失 + agent-mode/repo-wiki 配置面裁剪，同期发生。

## REVIEW

- **`session/debug` 语义**：注册表新增但消费方未追踪（可能 remote-replay/debug 通道）。
- **`ZCODE_DYNAMIC_WORKFLOW_MODES` 枚举值**：env 表只露键名，模式集合未展开（dynamicWorkflowRunPort 的实现暗示可下发 run/snippet 两类执行）。
- **marketing touch 后端语义**：`entity_changed` 动作类型的具体上报内容未逐字段解。
- **3.13.x 去向**：linux-x64 404 已证；mac/win 是否发过 3.13 未探（语料口径为 linux-x64）。
