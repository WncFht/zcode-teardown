# auggie 0.36.0（Augment Code，CLI）— 披露失真的整库镜像上传

**包**: `@augmentcode/auggie`（npm，13MB 单 bundle `augment.mjs`）· **解包**: `extracted/auggie` · **覆盖**: 全链（acq + 7 扫描 + 双镜 verify + 5 lane）

## 结论

**隐藏上传确认（"indexing" 名义下的全库内容镜像）。** 完整管线：文件遍历（.gitignore/.augmentignore 过滤）→ sha256(path‖content) blob 名 → **`find-missing` 让服务端挑选它还缺哪些文件内容** → `batch-upload` POST `{blobs:[{blob_name, path, content}]}` 明文文件内容 → `checkpoint-blobs` 注册，在服务端维护工作区文件清单的持续镜像。

与 ZCode 的机制差异：认证 JSON POST 代替 tar.gz+AES+OSS，无客户端加密；但"服务端挑选要哪些文件"这一点比 ZCode 更主动。

## 上传机制

- **遍历**：`PathIterator` 递归（除 `.git/`），`.gitignore`+`.augmentignore`+`.git/info/exclude` 过滤，二进制扩展名/非 UTF-8/>128KiB 拒收，≤250k 文件。
- **服务端选择**：`find-missing` POST 排序 blob 名清单 → 服务端回 `unknown_blob_names` → 只上传它没见过的文件内容（~1MB/128 文件/批）。
- **注册**：`checkpoint-blobs {checkpoint_id, added_blobs, deleted_blobs}` → `new_checkpoint_id`；`BlobsCheckpointManager`/`CheckpointBuilder`（batch 5000）。
- **每轮对话**：`createSnapshot()` 在 chatStream 前跑，`getChangesSince` 产 `{old_contents,new_contents}` diff 随 `chat_history.changed_files` 上传；completion 请求带 `edit_events{before_text,after_text}` 与 `recency_info{recent_changes,viewed_contents,tab_switch_events}`。
- **git 元数据**：`indexed-commits/register-blobset` 发 `{commit_sha,commit_time}+blobset`；`get-latest-blobset` 流式上传本地祖先 SHA。

## consent 面（真实但失真）

- **TUI/ACP 交互模式有真门槛**：`uOe()` 解析 `indexingAllowDirs/indexingDenyDirs`（settings.json）+ 硬否决（home 目录及其上级永远 "never"）；拒绝后装 dummy workspace manager（`initialize(){}`、`getChangesSince→[]`）——**拒绝是真的**，不是装饰。
- **但文案只说"index your workspace…Your data always stays secure, private and anonymized"**——与 ZCode 同款"本地索引"措辞，从不提文件内容上云。
- **`--print`/`--mcp` 模式完全跳过确认提示直接上传**（help 自承 "the indexing confirmation prompt is skipped in print mode"）；`--allow-indexing` 脚本化同意且交互模式下会写进 allowlist 持久化。
- 服务端 feature flag 含 `without-permission` 档（`maxTrackableFileCountWithoutPermission=150k`、`minUploadedPercentageWithoutPermission=90`）——无许可追踪档的存在说明服务端留了后门余地。

## 通道清单

| 通道                                       | 内容                        | 门槛                                          |
| ------------------------------------------ | --------------------------- | --------------------------------------------- |
| `batch-upload`                             | 文件全文 blob               | indexing consent（交互）/ 无门槛（print/mcp） |
| `find-missing`                             | blob 名清单（服务端挑文件） | 同上                                          |
| `checkpoint-blobs`、`register-blobset`     | 文件清单/提交 SHA 镜像      | 同上                                          |
| chatStream `changed_files` / `edit_events` | 逐轮 diff / 编辑事件全文    | agent 使用固有                                |
| `auggie artifact upload`                   | 凭证→presigned PUT          | 用户显式调用                                  |

## 证据锚点

`extracted/auggie/augment.mjs`：`uOe()`/`SN()`（consent 解析 7014/7049）、`eO` dummy manager（5802）、`JBr` TUI 确认屏（7049）、`pTr` 执行（7049）、`PathIterator`/`FilesystemChangeTracker`/`DiskFileManager`/`IsoGitIndexingService`/`BlobsCheckpointManager`/`CheckpointBuilder`。
