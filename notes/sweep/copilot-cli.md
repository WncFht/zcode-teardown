# GitHub Copilot CLI 1.0.88 — 服务端门控的内容外发（无整包上传）

**包/来源**: npm `@github/copilot`（loader shim + optionalDependencies 平台二进制）+ GitHub release `github-copilot-1.0.88-linux-x64.tgz`（58MB 可读 JS 载荷 app.js）+ Rust `runtime.node`
**解包**: `~/src/agent-teardown/extracted/copilot-cli/`
**覆盖**: acq + 7 族扫描 + 双镜 verify + 5 lane，证据 `evidence/copilot-cli/journal-digest.json`

## 结论

**没有** ZCode 式整工作区 tar.gz 隐藏上传——tar/gzip 代码全是 vendored（npm pack、遥测 gzip、本地 git-blob 备份），无 OSS/S3/presigned 端点，无 AES/RSA wrap。但有**多条服务端门控的工作区/会话内容外发通道**，其中最接近先例的是受限遥测层的 `local_diff_snapshot`：把 `git status`/`git diff --raw` 的**未提交 diff 内容**序列化（gzip+base64）后经 `/telemetry/restrictedProperties` 发出，是否发射完全由服务端 `restricted_telemetry` 订阅位 + `LOCAL_DIFF_*` rollout flag 决定。

## 外发机制（按 ZCode 接近度排序）

1. **`local_diff_snapshot` 受限遥测**（Rust `github_telemetry/local_diff/mod.rs`）：对仓库及子仓库（CHILD_GIT_REPO_SCAN）跑 `git status --ignore-submodules=dirty` + `git diff --raw`，`diff_records` 携带 gzip+base64 的 **diff 内容**（含行数/路径；有 credential/path 脱敏与 paths-only 降级），经 `queue_worker.rs` 以 AppInsights/Hydro envelope 发往服务端下发的 `endpoints.telemetry`。授权由 `restricted_telemetry`/`enterprise_usage_telemetry` entitlement + rollout flag 服务端裁决——客户端无法自证关闭。
2. **远端会话导出 → Mission Control**：`remote_exporter` 把完整 session 事件流（prompt、assistant 消息/推理、**工具调用含输入输出** = 文件内容/shell 输出）POST 到 `/agents/sessions/{id}/events`。`SESSION_INDEXING` flag + `cloud_session_storage_enabled` 策略可在服务端自动激活；设置 `remoteExport`/`remoteSessions` 默认 true（opt-out），文案 "Export sessions to GitHub and enable remote steering by default"——**诚实但默认开**。
3. **chronicle reindex**：`reindex_cloud.rs` 把 session 事件批传云端会话存储，有 secret filter，filter 不可用时跳过上传。
4. **task_analytics turn_taxonomy**：把 user/agent 消息文本发给 judge 模型（gpt-5.6-luna-utility）。
5. **telemetry.capture.\*** 托管设置：把 prompt/响应/工具 args+ 输出/身份 路由到托管 OTLP 端点——Settings 可见、默认关、org 可配。
6. **图片上传**：凭证解析 → base64 POST uploads.github.com——ZCode 式「凭证→直传」形状但仅用户附图。

## consent 面

- `remoteExport`/`remoteSessions`：真门槛但 opt-out 默认开；"read-only; does not enable remote control" 的区分写清了。
- `local_diff` 遥测：**无任何用户可见开关**——全由服务端 entitlement/flag 决定，失败降级为 paths-only 而非不上传。
- `telemetry.capture.*`：Settings 可见 + 默认关，最干净的一条。

## 通道清单

| 通道                    | 内容                      | 门槛                              | 判定                    |
| ----------------------- | ------------------------- | --------------------------------- | ----------------------- |
| CAPI 模型调用           | prompt+ 上下文 + 工具结果 | 产品固有                          | 合规                    |
| local_diff 受限遥测     | git diff 内容             | 服务端订阅+flag，客户端无开关     | **披露失真/服务端门控** |
| remote session export   | 完整会话事件流            | 默认开 opt-out + 服务端可自动激活 | 披露失真 opt-out        |
| chronicle reindex       | 会话事件批                | 用户命令 + secret filter          | 用户触发                |
| task_analytics judge    | 会话文本→评审模型         | 默认遥测内                        | 低透明                  |
| telemetry.capture OTEL  | prompt/工具 IO            | 默认关，Settings 可见             | 合规                    |
| 图片上传                | 用户附图                  | 用户发起                          | 合规                    |
| cloud-task provisioning | repo clone 进远端沙箱     | 用户发起                          | 合规                    |

## 证据锚点

`app.js` 1.0.88（remote exporter / `SESSION_INDEXING` 接线）；Rust `runtime.node` strings/source-path 表（`local_diff_snapshot`、`queue_worker`、`reindex_cloud`）；`pkg-1.0.84` 托管设置 schema（`remoteExport`/`remoteSessions`/`telemetry.capture.*`）。
