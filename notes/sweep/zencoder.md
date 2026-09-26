# Zencoder 3.85.9005（VS Code 扩展 + Bun CLI）— 隐藏上传：完整会话轨迹默认开，开关未声明

**包/来源**: VS Marketplace 预发布通道 vsix（darwin-arm64 + linux-x64）· **解包**: `extracted/zencoder/{extension,linux-x64}` · **覆盖**: 全链

## 结论

无 ZCode 式打包/加密/对象存储管线：`indexer.worker.js` 零网络调用，repo 索引只写本地 `keyValueStorage`，`/api/v1/repositories` 注册只发元数据 JSON（此 build 无调用者），Sentry Replay 是死 vendored 代码。端点面：`/api/v1/{repositories,connections,agents,agent-flows,…}`、`/api/oauth/*`、CLI 侧 `/api/v1/chat-sessions/trajectory` + `/otlp/http/v1/{traces,metrics,logs}`。

但存在**默认开、UI 未声明的内容外发**：

1. **trajectory 上传（最接近 ZCode）**：`zencoder-cli` 里 `L9H` 类在每个 run 的 **finally 块**把整个 JSON 序列化会话（system prompt、user/assistant 消息、**tool_use 输入含文件内容**、shell-result、diff，≤10MB）POST 到 `api.zencoder.ai/api/v1/chat-sessions/trajectory`，Bearer + 502/503/504 重试。`enabled ?? true` 双处默认开；唯一 opt-out 是 `.zencoder/settings.json` 的 `telemetry.enabled:false`——**该键未在 package.json contributes 声明**（仅 16 个 zencoder.* 键，无 telemetry/analytics），用户看不到。
2. **OTLP 默认开**：`telemetry.enabled ?? true` 同上，`otlpEndpoint` 默认 `https://api.zencoder.ai`，gzip POST traces+metrics+logs（带 `process.command_args`/`session.id`/`user.id`）。
3. **RudderStack 无条件开**：`isRudderStackEnabled()` = `pluginEnv==='production'||'pre-release'||setting`——此 build `pluginEnv='pre-release'`，stable 为 `production'`，**OR 恒真，设置项只能开不能关**；writeKey 内嵌 → `forgooditjxygd.dataplane.rudderstack.com`。扩展宿主与两个 webview 都开。
4. **远程 RAG MCP 静默注入**：`ZENCODER_RAG_MCP_SERVER {type:http, url:gateway+/rag-searcher/mcp/, Authorization:Bearer<token>}` 被注入 agent 的 MCP 集——代码搜索 query 离机，暗示厂商持有服务端索引。

## consent 面

contributes 只有 4 组设置（Permissions/Notifications/CLI paths/Other），**无索引开关、无会话上传、无分析、无遥测**。唯一索引相邻开关 `excludeGitIgnoreFromIndexing` 只管本地过滤，不门控任何 egress。自动索引在登录态/工作区变更/300s 间隔触发，无 consent 步。隐私面 vs 产品面严重错位——与 ZCode 同一模式。

## 通道清单

| 通道                               | 内容                       | 门槛                       |
| ---------------------------------- | -------------------------- | -------------------------- |
| `/api/v1/chat-sessions/trajectory` | 完整会话含文件内容         | 默认开，未声明 settings 键 |
| `/otlp/http/v1/*`                  | traces/metrics/logs+命令行 | 默认开                     |
| RudderStack dataplane              | 事件流                     | 恒真，无法关               |
| 远程 RAG MCP                       | 搜索 query                 | 静默注入                   |
| `/api/v1/repositories`             | repo 元数据                | 此 build 无调用者          |

## 证据锚点

`zencoder-cli`（Bun 编译）：`L9H` 类 finally 上传 + `summarizeSession` 二次上传、`qB` JSON.stringify ≤10MB、`llmAnalyticConfig.enabled ?? !0`；`extension.js`：`RepoIndexService.performRepoIndexing`/`canBeIndexed`、`isRudderStackEnabled`、`zencoder.repoIndex.repoId` 未声明键、`indexer.worker.js` 零网络。
