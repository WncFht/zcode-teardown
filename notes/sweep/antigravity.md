# Antigravity (Google) IDE 2.5.5 / CLI 1.2.7 — 完整上传管线存在但此 build 禁用（dormant）+ 常开轨迹遥测

**包/来源**：官方桌面/IDE/CLI 三件套（VSCode-base 1.107.0；CLI 为 224MB Go ELF） · **解包**: `extracted/antigravity` · **覆盖**：acq×5 + 7 扫描 + 双镜 verify×3 轮 + 5 lane（Go 二进制经 .gopclntab 符号恢复 + 反汇编核实）

## 结论

Antigravity 内含一条**与 ZCode 拓扑等价但用 git 原语实现的完整工作区上传管线**（shadow git repo → delta bundle → 服务端签发写凭证 → 续传上传 → frontier 记账），但在本 build 中被 `LocalFS` 检查硬禁用（"bundle persistence is unsupported in this build"）——管线存在、默认不跑。同时存在**两条常开的内容级遥测**（Clearcut 事件流 + Record* 轨迹 RPC，含 diff/prompt/文件路径）。判定：**dormant 管线 + 常开遥测**，非 clean。

## 上传机制

### Git bundle 上传管线（本 build 禁用）

在 `cli/antigravity`（Go 二进制，pclntab 恢复符号 + 反汇编核实可达性）：

- `snapshot_recorder.GitSnapshotRecorder`：每个 cascade step 把整个工作区 commit 进 shadow git repo（`commitAllChanges`/`AddAll`，遵守 .gitignore + `excludeLargeFiles` + `isNoiseArtifactPath`；commit 作者 `jetski <nobody@google.com>`）。
- `maybeSyncBundle` → `gitbundle.(*Syncer).MaybeSync`：`git bundle create --all --not <frontier>` 增量打包，`createVerifiedBundle` 校验，`cortex-bundle-*.bundle`/`%06d-<head>.bundle` 命名，`.inprogress` 临时文件。
- 凭证签发：`JetskiService/GetBundleWriteMint` RPC（`cloudcode-pa.googleapis.com`，REST `/v1internal:getBundleWriteMint`）→ `{bundle_dir, bundle_write_mint, mint_expiry_time}` —— 服务端签发的限时写凭证，与 ZCode upload-credential 同角色；`ProvisionConversationBundleDir` 按会话配目录。
- 上传：Google resumable-upload 协议（`X-Goog-Upload-Protocol/Offset/Status`）；`writeFrontier` 记账已传 commit；日志 `uploaded git bundle %s (%d new commits)`。
- 反向也存在：`refs/snapshots/*` fetch-into-fork、`ForkGitRepo`、`CascadeManager.provisionForkWorkspace/restoreWorkspaces`。
- **门槛**：`LocalFS` check 在本 build 返回不支持 → 管线不激活；失败静默降级本地（"continuing without bundle persistence"）。无 UI 文案提及远端同步。

### 常开遥测（活跃）

- **Clearcut**：IDE `main.js` 的 `antigravityAnalyticsMainService` 缓冲（≤20k 事件、5min/10k 批量）protobuf LogRequest POST `play.googleapis.com/log`（clientType=44, logSource=2747）；opt-out 只做 redact（`isRedacted=true`）**仍然上传**。
- _*Record* 轨迹流_*：language_server 的 `telemetryclient.(*AntigravityClient).Record*` + `v1internal.JetskiService Record*` 上传完整轨迹（`Trajectory.GetSteps` 含 `CortexStepCheckpoint{EditedFileMap, TrajectoryFileDiffs, UserRequests, ArtifactSnapshots}`）、prompt 文本（`RecordContextToPrompt`/`BatchRecordPrompts`）、completions 上下文 + `*ForTelemetry` 绝对/相对路径、`StateInitializationData`（有专用 redactor——说明厂商知道内容敏感）。

## consent 面

- git-bundle 管线无任何 UI/设置提及；本 build 未激活所以暂无实际 consent 问题，但管线就位后激活仅需配置翻转。
- Clearcut 的 opt-out 是 redact-not-block。
- Record* 轨迹的门槛是服务端 feature flag + redactor，本地无开关。

## 通道清单

| 通道                                | 内容                             | 门槛                      | 判定         |
| ----------------------------------- | -------------------------------- | ------------------------- | ------------ |
| git bundle → cloudcode-pa           | 全工作区 shadow repo 增量 bundle | 本 build 禁用             | dormant 管线 |
| Clearcut play.googleapis.com/log    | 事件流（opt-out 仅脱敏）         | 常开                      | 隐藏遥测     |
| Record* gRPC                        | 轨迹/prompt/diff/路径            | 服务端 flag               | 常开内容遥测 |
| feedback-pa                         | diagnostics.json.gz              | 用户触发 Provide Feedback | 合规         |
| aiplatform vertex_rag UploadRagFile | RAG 文件                         | 特性固有                  | 披露         |
| avatar presigned upload             | 头像                             | 用户触发                  | 合规         |

## 证据锚点

```
cli/antigravity (Go ELF): google3/third_party/jetski/cortex/snapshot_recorder/*
  GitSnapshotRecorder.RecordSnapshot → commitAllChanges → maybeSyncBundle
  gitbundle.(*Syncer).MaybeSync / ensureProvisioned / writeMint / writeFrontier
  ProvisionConversationBundleDir, GetBundleWriteMint (mint_expiry_time)
language_server: telemetryclient Record*, UploadStateInitializationData
IDE main.js: antigravityAnalyticsMainService → play.googleapis.com/log
```
