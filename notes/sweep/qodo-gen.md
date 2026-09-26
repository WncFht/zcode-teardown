# Qodo Gen / Codium 2.2.6（VS Code 扩展）— 隐藏上传：commit diff + 代码片段，纯服务端 flag 门控

**包/来源**: VS Marketplace `Codium.qodogen` 0.14.2（VS2022）+ 姊妹项 `Codium.codium` 2.2.6（VS Code，实际分析对象）· **解包**: `extracted/qodo-gen/vscode-codium-2.2.6` · **覆盖**: 全链

## 结论

无 ZCode 式打包/加密/OSS 管线（全部 egress 是 JSON POST + Bearer 到硬编码 `https://api.gen.qodo.ai`）。但存在**三条服务端 flag 门控、UI 不可见的内容外发通道**，其中 commit-diff 上传最接近 ZCode 的"内容无条件离机、门在服务端"形状：

1. **GitCommitTracker（commit diff 上传）**：激活即初始化，`fs.watchFile(<gitroot>/.git/logs/HEAD, 60s)` 监听每次 commit，跑 `git show --pretty= HEAD`（**完整 diff**）+ `git log -1 %B` + branch + 本地仓库根路径（`repo_name` 是绝对路径，泄漏用户名）→ POST `/v1/analytics/qodo-impact` `{patch_diff_content}`。**唯一门槛是服务端 flag `code_change_count`**（GET `/v2/users/features` 下发），无本地设置、无通知。
2. **CodeUsedDataLogger（代码片段上传）**：每次 accept/save/insert/chat_auto_applied 上传 `code_snippet`；`chat_auto_applied` 传**编辑后整个文件内容**；`shouldDiff` 时对真实工作区文件跑 `git diff --no-index`（**真实文件行离机**）。门槛：服务端 `tierLevel===30` + `code_change_count` / `should_log_code_block_used`。
3. **agentic start-task 载荷**：每次任务 POST `/v2/agentic/start-task` 携带 project_structure（globby BFS 目录树，dot:!0 含点文件、gitignore 尊重、cap 200）、projects_root_path、current_file、open_tabs 全部路径、best_practices.md 与 agent-rules **文件内容**。

## consent 面

唯一 git 相关设置 `codium.git.showCommitNotification` 控制的是**另一个** review 通知弹窗，与上传无关——标准 ZCode 式错位：用户能看到的开关不门控上传，门控上传的开关用户看不到。完整事件流 `/v1/analytics/{track,identify,alias}` 在 `report_to_backend` 下含 `PrivateRecord` 映射。

## 通道清单

| 通道                                                         | 内容                                           | 门槛                                   |
| ------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------- |
| `/v1/analytics/qodo-impact`                                  | 每次 commit 完整 diff + 分支 + 本地路径        | 服务端 `code_change_count`，无本地开关 |
| `/v1/analytics/log-code-block-used` 或 `track` PrivateRecord | accept 的代码片段/编辑后全文件/diff 真实文件行 | 服务端 flag + tierLevel                |
| `/v2/agentic/start-task`                                     | 目录树/打开标签/规则文件内容                   | 每次任务自动                           |
| `/v1/analytics/track,identify,alias`                         | 事件流                                         | 服务端 `report_to_backend`             |

## 证据锚点

`extension/dist/extension.js`：`GitCommitTracker.initialize`/`onHeadLogChanged`/`fetchLatestCommit`/`uploadCommit`→`sendCommitData`；`CodeUsedDataLogger.logCodeUsedData` + `calculateDiffSnippet`（`temp_code_snippet.txt` + `git diff --no-index`）；`initializeTask→collectBaseData`→`buildDirectoryTreeAsString`；`GET /v2/users/features` flag 下发。
