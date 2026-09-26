# AStudio (iFlytek AstronCode) 3.4.1 — 隐藏上传 CONFIRMED（本批最严重）

**包/来源**：Windows NSIS 583MB（官网 releases API 仅发 win-x64/mac-arm64，无 Linux；acode harness runtime 1.0.5-rc.3，`@iflytek/astron-code-prod-win32-x64`） · **解包**: `extracted/astudio` · **覆盖**：acq + 7 扫描 + 双镜 verify + 5 lane，全部 high confidence

## 结论

AStudio 搭载**三条相互独立、全部常开、UI 完全不可见的内容外发管线**，门槛只有一个：登录态。另有一条硬编码密钥 AES 加密的 UI 埋点通道。无任何设置项可关闭；唯一存在 consent 文案的面板是死代码。对照 ZCode：不打包不加密（raw NDJSON/gzip-OTLP 直传），但覆盖面更广——不是上传工作区树，而是**持续上传全部历史会话转录（含工具读到的文件原文）**。

## 上传机制

### 管线 A — SessionRolloutUpload（最接近 ZCode 的类比）

- 接线：`createEffectServer` 无条件 yield（`index.mjs:104890`，经 `Layer.mergeAll` 93753）；启动跑一次 + `Effect.forever` 每小时循环（71120）。**无 mode 检查**（desktop/web 都跑）。
- 采集：递归扫 `~/.acode/sessions` + `acode-home-overlay/sessions` + `codex-home-overlay/sessions` 下所有 `*.jsonl`（70837-70904）——Codex 格式会话转录：用户 prompt、base instructions、工具参数、**工具输出（含 agent 读到的文件原文、shell 输出）**。
- 过滤：只认 `.jsonl` 后缀，无目录排除、无内容审查；单文件 >100MB 跳过；size+mtime 指纹，变动即整文件重传；**覆盖本机全部历史会话**，不止当前。
- 外发：原始字节 multipart `application/x-ndjson` POST 到 `https://astronstudio-api-volces-prod.xf-yun.com/api/v1/config-feedback/session/upload`（70933-70960），Bearer + X-Account-Id（模型 api_key，登录时从 `agent.xfyun.cn/xingchen-studio/bot/models/configs` 拉取缓存）。
- 门槛：仅 `readAstronMessageRatingCredentials`（未登录则抛错延后重试）；watch 文件跨重启去重。设置 schema（39940-39953）中**无任何 consent/telemetry 字段**。

### 管线 B — FeedbackLogUpload（小时级日志自动上报）

- 同样无条件 yield（104891），desktop mode 门槛（71792），启动 + 每小时（71835）。
- 采集最近 1 小时窗口的 `desktop-main.log` / `server.log` / `server-child.log` / `provider/events.log`（71286-71430；events.log 是 provider 事件 NDJSON 全量流，单事件 2MB、payload 截断 64KB）。
- 脱敏：仅 homeDir→`[REDACTED_HOME]` + credential 形 pattern（Bearer/sk-_/LTAI_/JWT）；**对话文本不脱敏**。
- 三段式 create→upload→complete：`POST /api/v1/config-feedback/log-report` → 逐文件 `/{sid}/upload` + `feedback.md` manifest → `/{sid}/complete`（71587-71641）。payload 字面标注 `details:"自动上报log"`（71695）。

### 管线 C — storage-tls OTLP（每轮转录导出，开关是 placebo）

- 启动时静默往 `~/.acode` 安装 bundled 插件市场 + 写 `config.toml` hooks=true + 注入模型 token 为 `experimental_bearer_token`（2880-2932, 69944, 104849-104869）。
- 每个 agent turn 结束时 Stop hook（`runtime.mjs:4328`）解析当轮转录，gzip protobuf POST OTLP LogRecords 到 `https://astroncode-otlp-prod.xf-yun.com/v1/logs`，属性含 `gen_ai.input.messages` / `gen_ai.output.messages` / `gen_ai.tool.call.arguments` / `gen_ai.tool.call.result`（每属性 ≤64KB）——**即每轮完整 prompt+ 工具/文件内容**。
- **开关形同虚设**：`withFixedStorageTlsSettings` 每次读写都强制 `enabled:true, region:cn-beijing, apiKeyConfigured:true`（3540-3549, 3669, 3716）；`sanitizeServerSettingsPatch` 剥掉用户的一切 `storageTls` patch（3596-3599）；schema 里的 enabled 是死配置。
- 失败的 payload 缓存重试，macOS 还注册了 LaunchAgent `com.astroncode.otlp-trace.retry`。

### 辅助通道

- **计费上报**：每轮 POST `schema_version 1.2` 的 `ClientTurnUsageReport` 到 `points/deduce-balance`，含**逐字 user_query** + 工具/技能调用参数 + 本地 artifact 路径。
- **IFlyCollector 埋点**：点击/表单事件批 → AES-128-ECB（**硬编码密钥 `abcdefgabcdefg12`**）→ `Image().src` 像素上报 `idatalog.iflysec.com/collect.jpg`；localStorage 离线队列。

## consent 面

- 三条主管线**零 consent 面**：locale 表、设置导航、对话框均无对应文案；端点藏在 `config-feedback` 命名空间下。
- storage-tls 的 UI 文案其实诚实（"completed session transcripts—including user requests, model replies, tool calls—are processed and uploaded"），但**该面板是死代码**：settingsNavigation 18 个 section 无 observability 项，`getStorageTlsStatus` 零调用点。
- 安装器会打印"数据访问说明"，但 app 以 `--non-interactive --force` 调用且 stdout/stderr 被吞——**通知被捕获后丢弃**。

## 通道清单

| 通道                 | 内容                            | 门槛                  | 判定                     |
| -------------------- | ------------------------------- | --------------------- | ------------------------ |
| session/upload       | 全部历史会话 jsonl 原文         | 登录                  | 隐藏上传                 |
| log-report           | 1h 窗口日志 + 事件流            | desktop+ 登录         | 隐藏上传                 |
| OTLP /v1/logs        | 每轮 prompt+ 工具 I/O+ 文件内容 | 强制开                | 隐藏上传（placebo 开关） |
| deduce-balance       | user_query 逐字 + 用法          | 每轮                  | 隐藏                     |
| idatalog.iflysec.com | UI 事件，AES 硬编码密钥         | 无                    | 隐藏埋点                 |
| feedback submit      | 日志 zip + ≤3 附件              | 用户触发              | 合规                     |
| artifact publish     | 工作区 artifact zip             | 用户触发 + 服务端审核 | 合规                     |

## 证据锚点

```
app-asar/apps/server/dist/index.mjs:70718-71123   SessionRolloutUpload 全体
index.mjs:104890-104891, 93753                    两条无条件 yield + mergeAll
index.mjs:71789-71835                             FeedbackLogUploadLive
index.mjs:3540-3599, 3669, 3716                   强制 enabled:true + patch 剥离
runtime.mjs:4328, 290-334                          Stop hook + OTLP 字段映射
otlp-http-exporter.mjs:21828, 22457-22556          OTLP 端点与传输
```
