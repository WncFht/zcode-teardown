# Amp 0.0.1790179256-g22a153（Sourcegraph，CLI）— 条件触发的整树推送

**包**: `@ampcode/cli`（npm，Bun 编译）· **解包**: `extracted/amp` · **覆盖**: 全链（acq + 7 扫描 + 双镜 verify + 5 lane）

## 结论

**条件触发的内容上传（非默认路径）。** 存在完整的 ZCode 同构管线——凭证签发 → 内容直传 → 注册——但用 git 实现：`POST /api/threads/{tid}/diff-captures` 拿 `{captureID, captureRef, gitURL}` → `git push <gitURL> <projectedWorktreeSHA>:<captureRef>`（Bearer 经 http.extraHeader 注入）→ `POST /publish` 登记 manifest。

**关键限定**：`ensureWorkspaceSnapshotCaptured` 只在 `executorType==="sandbox"` 时执行——即 orb 云端线程、`--no-tui` headless、自托管 runner 模式。交互式 TUI（`local-client`）永不触发。所以这**不是**"每次 prompt 都传"的 ZCode 形态，而是服务端可见 "Changes" 特性的实现；但在 headless/orb 模式下，本地 worktree（含从未提交的 untracked 文件）在每次变更型工具运行后自动推送到厂商 git 基础设施，无逐项 UI consent。

## 上传机制

- 捕获：`Hde/Zce` 把 staged+unstaged+untracked 投影成 git objects（`hash-object -w --no-filters` 写入隔离的 `amp-snapshot-objects-*` GIT_OBJECT_DIRECTORY），含 symlink target 和未提交文件。
- 触发：非只读工具运行后 `onWorkspaceChanged` → `triggerWorkspaceSnapshotCapture`；另支持服务端主动索要（`onRequestCaptureRequest` → `handleExecutorRequestCapture`）。
- 服务端留存证据：`diff-captures/latest` + `/blob/{sha}/raw` 取回（"Changes" 特性用）。

## consent 面

- 沙箱模式下自动推送无逐项 consent；错误串自承 "Captures are recorded while the thread runs in an orb"（半披露）。
- 交互模式下仅发送 `workspaceChanged:bool`。
- **所有模式**（含交互）的 bootstrap 外发：`executor_environment_snapshot`（hostname/username/cwd/git branch）、`executor_guidance_snapshot`（**AGENTS.md 类 guidance 文件内容**，hash 去重）、skill 元数据（名称/描述/文件名列表，不含内容）。

## 通道清单

| 通道                      | 内容                         | 门槛                                    |
| ------------------------- | ---------------------------- | --------------------------------------- |
| diff-captures（git push） | 整个 worktree 投影           | sandbox executor（orb/headless/runner） |
| executor bootstrap        | 环境快照 + guidance 文件内容 | 所有模式                                |
| deploy / attachment       | presigned-URL 上传骨架       | 用户显式调用                            |

## 证据锚点

`extracted/amp` Bun bundle（`bun-section-utf8.txt`/`bun-section-new-utf8.txt`）：`nde/vpe`（captures POST）、`Yce`（git push）、`ensureWorkspaceSnapshotCaptured`（executorType 门）、`toolRunner.computeWorkspaceChanged`、`handleExecutorRequestCapture`、`Tbe`（latest/blob 取回）。
