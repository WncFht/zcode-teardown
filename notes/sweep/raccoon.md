# Raccoon（商汤小浣熊）1.0.15 — 无批量上传管线；潜伏的服务端可控 embeddings 外发 + 遥测失实

**包/来源**: VS Marketplace `sensetime.raccoon` 1.0.15 linux-x64 vsix（Continue fork，31MB `extension.js`）· **解包**: `extracted/raccoon` · **覆盖**: 全链

## 结论

无 ZCode 式管线：无工作区归档、无内容加密（唯一的 app 级加密是硬编码 key `senseraccoon2023` 的 AES-128-CFB 加密登录手机号/密码——本地凭据存储）、无凭证签发、无 OSS/PostObject、无回调注册。厂商 API 面只有 `xiaohuanxiong.com`（或 `xiaohuanxiong.sensetime.com`）下 `/api/plugin/{auth,b,llm,mcp,setting}` 六族路由。

工作区内容照常经**功能固有**通道离机：chat-completions 全量消息表（含 codebase/folder/file/docs/terminal/diff context provider 收集的工作区代码）、FIM 补全（`{language_id,prefix,suffix}` 自动随输入发送，prefix 合并了其他文件最近编辑片段/剪贴板/diff）、`@cloudfile`/`@knowledgebase` MCP-know 通道（带全量 prompt）。

## 潜伏面（值得关注但当前休眠）

**服务端可控的 embeddings 外发开关**：`getProfileFromServer`（服务端 `chatv2` capability 激活）把服务端下发的每个 model 的 `apiPath` 重写为 `session.baseUrl+apiPath`；`configToRaccoonConfig` 可为任何 `roles:['embed']` 的 model 实例化 embeddings provider；`rectifySelectedModelsFromGlobalContext` 零用户操作自动选中 `embed[0]`；`CodebaseIndexer` 在激活和每次文件变更时自动 embed 工作区文件块 → `OpenAI._embed` 把**原始文件块** POST 到该服务端指定 URL。**仅因内置 profile 未配 embed-role model 而休眠**——厂商推一个 profile 即激活，UI 无任何提示。

## consent 面

- 唯一遥测开关 `raccoon.telemetryEnabled`（默认开）文案称"anonymous usage data, cleaned of PII"——**与事实矛盾**：每条载荷带 `machine_id`/`distinctId = vscode.env.machineId`（持久设备 UUID）。
- opt-out 半失效：`enabled` 只在 config.yaml watchFile/profile reload 时刷新，无 `onDidChangeConfiguration` watcher；`queueMetric`/`flushMetrics` 从不复查——关闭后已排队事件仍会在下个 20s flush 发出。
- `@codebase index` UI 文案称 "Local embeddings of your codebase / 本地代码库索引"——默认属实（bundled all-MiniLM transformers.js），但可被服务端 profile 静默改写为远端。

## 通道清单

| 通道                                  | 内容                         | 门槛                  |
| ------------------------------------- | ---------------------------- | --------------------- |
| `/api/plugin/llm/v1/chat-completions` | 全消息表 + 工作区上下文      | 用户触发              |
| `/api/plugin/llm/v1/completions`      | FIM prefix/suffix 多文件内容 | 登录后自动            |
| `/api/plugin/mcp/know/v1/message`     | 全 prompt                    | @cloudfile 触发       |
| `/api/plugin/b/v1/m`                  | 遥测 + 设备 UUID             | 20s flush，开关半失效 |
| embeddings（休眠）                    | 文件块→服务端指定 URL        | 服务端 profile        |

## 证据锚点

`extension/out/extension.js`：`getProfileFromServer` 73922-73928、`configToRaccoonConfig` 493547-566、`rectifySelectedModels` 81808-81814、`CodebaseIndexer` 497540/497819-948、`OpenAI._embed` 466841-877、`Telemetry` 70871-70958、`machine_id` 504412/520294。
