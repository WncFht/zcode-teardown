# Devin Desktop (Cognition, ex-Windsurf) 3.10.35 — 无 ZCode 式隐藏上传；多条披露的产品固有 egress

**包/来源**：官方 deb（product 1.126.0, commit b98cc431, 2026-09-16 构建；Electron VSCode fork + Windsurf ext 1.48.2 + 193MB Go language_server + 184MB Rust `devin` agent） · **解包**: `extracted/devin-desktop` · **覆盖**：acq×5 + 7 扫描 + 双镜 verify×3 + 5 lane（Go 二进制自定义 .gopclntab 解析 + 反汇编调用图核实）

## 结论

**不存在** ZCode 式管线：无整工作区打包/tar.gz，无 AES/RSA 密钥包装，无 OSS/PostObject/对象存储 SDK，无 upload-credential 签发端点。git 快照原语（`GitCommitFS`、`refs/agents/*/checkpoints/turn/*`、isfs://）经调用图核实**纯本地**（无任何 push/upload RPC）。

但存在多条**真实的工作区内容 egress**——均为产品固有或披露特性，经 ConnectRPC/TLS 到 `api.codeium.com`/`server.codeium.com`/`inference.codeium.com`/`api.devin.ai`：持续轨迹上传、CaptureFile、GetEmbeddings、completions 流、附件上传。consent 门槛多为服务端（`GetDisableTelemetry`/`disable_code_snippet_telemetry`/`safe_for_code_telemetry`），与 ZCode 的"真实门槛在服务端"同型。

## 上传机制（无隐藏管线；以下为真实 egress）

- **轨迹上传**：`api_server_client.processTrajectoryStepUploads` + `RecordCortexTrajectory(Step)` —— `CortexStepWriteToFile.code_content`、`CortexStepViewFile.content/raw_content`、`CortexStepCheckpoint.edited_file_map`（path→UnifiedDiff）、`virtual_fs_serialized_overlay`；每步持续上送。
- **`UploadStateInitializationData`**（`exa/cortex/utils`）：`WorkspaceInitializationData{head_working_patch_string, merge_base_head_patch_string, merge_base_commit_hash}` = 工作树真实 unified diff，会话初始化即发。
- **`code_tracker.UserDataUploader`**：`RecordCodeTrackerUpdates` 流式上送 `CodeTrackerUpdate{byte_deltas/delta_text}`。
- **`CaptureFile`**：`file_path + original_file_content + completion_text`（补全事件时）。
- **`GetEmbeddings`**：原始代码 chunk 作 `prompts` 上送服务端向量化（索引本体本地）。
- **附件上传管线**（三段式，形状同 ZCode）：会话 `_meta["cognition.ai/httpUploadUrl"]`（服务端逐会话签发）→ multipart POST 文件字节 → 注册 `attachment_id`；仅限用户 @ 提及的超限文件，能力门槛 `cognition.ai/httpUpload` + maxBytes。
- **遥测**：`RecordAsyncTelemetry` 携带 `workspace_uri_for_telemetry` + 索引统计；`cognition.ai/snapshotContent` 把注入的 rules/skill 文件原文放进会话事件；Windsurf 1DS → `windsurf-telemetry.codeium.com`；Datadog RUM（Cognition appId；rum-slim、replay=0、mask 默认）。

## consent 面

- 设置 UI 有真门槛：`devin.acp.shareTerminalContext`/`shareUserEdits`/`spaces.shareContext`（均默认开）分别门控终端命令、编辑通知、跨会话摘要；`devin.allowCascadeAccessGitignoreFiles` 默认关（诚实）。
- 核心内容 egress 的真实门槛是**服务端** `UserStatus.GetDisableTelemetry` + `disable_code_snippet_telemetry` + `safe_for_code_telemetry`（`shouldDisableTelemetry`）——与 ZCode 的 server-side gate 同构。
- 无"本地上传"式欺骗性文案；无隐藏开关。

## 通道清单

| 通道                              | 内容                | 门槛                    | 判定           |
| --------------------------------- | ------------------- | ----------------------- | -------------- |
| RecordCortexTrajectory/Step       | 轨迹含文件内容/diff | 常开（云端 agent 固有） | 披露产品面     |
| RecordStateInitializationData     | 工作树 diff         | 会话初始化              | 披露但内容敏感 |
| CaptureFile / completions         | 文件路径 + 内容     | 每补全请求              | 特性固有       |
| GetEmbeddings                     | 代码 chunk          | 索引特性                | 披露           |
| httpUploadUrl 附件                | 用户附件字节        | 用户触发 + 服务端签发   | 合规           |
| AsyncTelemetry/CodeTracker        | 路径+byte delta     | 服务端 flag             | 遥测           |
| ShareCodeMap / conversation share | CodeMapJson/会话    | 用户触发                | 合规           |
| bug report                        | diagnostics+ 截图   | 用户触发                | 合规           |

## 证据锚点

```
language_server (Go): exa/cortex/utils.UploadStateInitializationData
  code_tracker.UserDataUploader{Run,UploadCodeTrackerUpdate}
  api_server_client.processTrajectoryStepUploads / RecordCortexTrajectoryStep
  Server.CaptureFile / GetEmbeddings / RecordCodeTrackerUpdates
workbench sessions.desktop.main.js:1417   _meta["cognition.ai/httpUpload{Url,MaxBytes}"]
agentHostMain.js: refs/agents/*/checkpoints/turn/*（纯本地，无 push）
```
