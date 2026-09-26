# Tabnine CLI 0.35.0（stardrop，gemini-cli fork）— 隐藏上传：每次写入的完整代码内容，纯服务端 flag 门控

**包/来源**: npm `tabnine` wrapper + `stardrop-<plat>-<arch>` 二进制（注：npm 上 stardrop-* 平台包现为 security holding 占位，实际分析用 0.35.0 bundle）· **解包**: `extracted/tabnine` · **覆盖**: 全链

## 结论

无 ZCode 式批量捕获/打包/对象存储管线：无 upload-credential/presigned/PostObject/OSS 端点；tar.gz 只用于**下载** ripgrep/更新；唯一 AES-256-GCM 加密的是本地凭据文件 `~/.gemini/tabnine-credentials.json`（静态存储，非传输载荷）。全部 egress 是直连 POST 到用户配置的 `tabnineHost`（支持 on-prem）。

但存在**ZCode 形状的"真门在服务端"内容外发**（范围是每次写入的生成代码，非整工作区）：

1. **`/log/v1` code-acceptance 上传（最接近 ZCode）**：`registerCodeAcceptanceLoggingHook` 在每个 `write_file`/`replace` 工具调用后 gzip-POST **完整 `content`/`new_string`**（即写进用户工作区的全部生成代码）到 `{baseUrl}/log/v1`。hook 在 `Config._initialize` 无条件注册（hooks 默认开）。**唯一门槛是 `GET /auth/user` 下发的 `settings.codeAcceptanceLogging.isEnabled`**——全 bundle 无本地设置键/env/UI 字符串。厂商翻服务端 flag，每个写入文件的内容静默离机。
2. **`/attribution/recitation/v2`**：每个 write_file/replace **写入前** POST `{snippet, model, lang}`——新文件发全文，已有文件本地 diff 后发新增行（会读真实磁盘文件）。同样只有服务端 `settings.attribution.isEnabled` 门控；响应可返回 `decision:'deny'` **审查并阻止写入**。
3. **`/attribution-log/action`**：attribution 命中时泄漏本地 `file_path`。

## consent 面

- `/notify/v1` 分析：`usageStatisticsEnabled` 是**硬编码字面量 true**（`gemini-D6DZJBKM.mjs:8911`），不在 settings schema 里；唯二 kill switch 是未文档化 env `TABNINE_ANALYTICS_DISABLED`/`TABNINE_DISABLE_TELEMETRY`。
- `telemetry.logPrompts` **默认 true** 且其 schema 文案只说 OTLP——实际同时门控 Conseca 事件里**原始 prompt+ 工具上下文**进分析管道（需 `security.enableConseca` opt-in，默认关）。
- BYOK key 外发有显式用户对话框；indexer/MCP/`/chat/openai/v1` 是披露的产品功能。

## 通道清单

| 通道                         | 内容                                      | 门槛                          |
| ---------------------------- | ----------------------------------------- | ----------------------------- |
| `/log/v1`                    | 每次 write/edit 完整生成内容              | **仅服务端 flag，无本地开关** |
| `/attribution/recitation/v2` | 写入前 snippet（新文件全文/旧文件新增行） | 仅服务端 flag；可 deny 写入   |
| `/chat/openai/v1`            | 全 prompt+ 工具输出                       | 产品固有                      |
| `/notify/v1` + Sentry        | 事件/崩溃                                 | 硬编码 true，env 可杀         |
| OTLP                         | traces/metrics                            | 默认关                        |

## 证据锚点

`chunk-D5OJRFT6.mjs:306828-306858`（sendCodeAcceptanceLog）、306890（extractCodeSnippet）、306918-307264（attribution hook + deny）、308056-308057（无条件注册）、`gemini-D6DZJBKM.mjs:8911`（硬编码 true）、227915（FileKeychain AES-GCM 仅本地）。
