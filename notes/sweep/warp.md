# Warp 0.2026.09.16.08.27.stable.02 — 无隐藏上传；披露特性但默认开 + 文案低估

**包/来源**：官方 stable（Rust 二进制 warp + 姊妹 `oz` CLI，crate 路径一致） · **解包**: `extracted/warp` · **覆盖**：acq + 7 扫描 + 双镜 verify×2 + 5 lane（Rust 二进制 strings/symbol 级核实）

## 结论

Warp 的工作区内容外发全部映射到**公开文档化的特性**（codebase indexing、handoff snapshot、cloud conversation storage），有 GUI 页面、设置项、企业策略、文档链接——每轮 hidden-marker 测试都不满足。但两个残留点使它不算完全干净：**codebase 索引一旦 opt-in 上传的是文件内容片段（非哈希）**；**cloud 会话存储默认开**，`--no-snapshot` 是唯一关掉 end-of-run 快照上传的开关。

## 上传机制

### Codebase indexing（consent 门控，增量）

- 二进制实证：`full_source_code_embedding` 管线——per-repo 文件遍历（遵守 `.warpindexingignore`/`.cursorindexingignore`/`.codeiumignore`）→ 语义+naive chunker → Merkle 树 → 本地 `.warpindex` 快照 → GraphQL 同步：`syncMerkleTree{hashedNodes,repoMetadata,embeddingConfig}` reconcile → `updateMerkleTree` push → `generateCodeEmbeddings{fragments}` 服务端 embedding 往返。
- wire fragment 携带 `{content, contentHash, byteStart, byteEnd}`，`getRelevantFragments`/`rerankFragments` 返回 fragment 内容——**服务端存的是真实代码字节**，不只是哈希。
- 门槛：服务端 `codebaseContextConfig`（maxCodebaseIndices/maxFilesPerRepo）+ 团队 `CodebaseContextPolicy`——"后端决定"型门槛；本地有 consent prompt（"Optimize Warp for this codebase?"）+ `agent_mode_codebase_context`（默认 TRUE）+ `auto_indexing`（默认 FALSE）。
- UI 文案把已索引 repo 表述为"locally indexed"——understatement：索引其实同步到了云端。

### Handoff / checkpoint 快照（默认开，有 opt-out）

- 链路：JSONL `snapshot declarations`（逐文件绝对路径，`OZ_SNAPSHOT_DECLARATIONS_FILE/SCRIPT` env）→ 服务端签发 per-file "upload targets" + 限时 "initial snapshot token"（`expires_at`/`uploads`）→ presigned-URL multipart POST（`ContentData` 字段 + CRC32C）→ commit 注册（`harness-support/commit-snapshot`，"Checkpoint committed: generation="）。
- 范围有边界：git repo 内文件走 `git format-patch` diff，repo 外文件传原文 blob；per-file/per-run cap；"files inside an existing git repo" 显式跳过——**不是整树打包**。
- 默认：`oz agent run-cloud` 的 `--no-snapshot` help 证实**快照上传默认开**；`cloud_conversation_storage_enabled` 默认 TRUE（隐私设置"Store AI conversations in the cloud"未明说文件内容随行——披露失真点）。
- 企业可控：`cloud_conversation_storage`/`CodebaseContextPolicy`/`UgcDataCollectionPolicy` 团队策略。

## consent 面

- 有 GUI indexing 页（"index this codebase"/"auto-index new codebases"）、consent prompt、设置项、文档链接——披露的。
- 失真点：privacy gate 文案只说"存会话"，未提文件内容；`should_force_disable_cloud_handoff` + `auto_handoff_on_sleep_enabled`（默认关）存在但分散。

## 通道清单

| 通道                                                            | 内容                          | 门槛                   | 判定                    |
| --------------------------------------------------------------- | ----------------------------- | ---------------------- | ----------------------- |
| indexing syncMerkleTree/updateMerkleTree/generateCodeEmbeddings | 文件内容片段+embedding        | consent+ 服务端 policy | 披露 opt-in（文案低估） |
| handoff snapshot 三段式                                         | repo diff + 非 repo 文件 blob | 默认开，--no-snapshot  | 披露但默认开            |
| cloud conversation storage                                      | 终端 block/转录               | 默认开设置             | 披露但默认开            |
| transcript-envelope upload slots                                | 会话内容                      | 云会话特性             | 披露                    |
| presigned attachment 上传                                       | 用户附件                      | 用户触发               | 合规                    |

## 证据锚点

```
warp + oz 二进制（Rust）:
  crates/ai/src/index/full_source_code_embedding/{merkle_tree,snapshot}.rs
  app/src/ai/agent_sdk/driver/snapshot.rs, checkpoint_coordinator.rs
  app/src/server/server_api/presigned_upload.rs (UploadTarget/ContentData/CRC32C)
  app/src/ai/blocklist/handoff/{snapshot,pipeline,touched_repos}.rs
  OZ_SNAPSHOT_DECLARATIONS_FILE, --no-snapshot, cloud_conversation_storage_enabled
```
