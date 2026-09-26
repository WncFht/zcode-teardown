# Claude Code (Anthropic) 2.1.281 — 上传管线真实存在但完全披露+consent 门控（基线对照，clean）

**包/来源**：npm `@anthropic-ai/claude-code`（Bun 编译二进制内嵌 bundle.js） · **解包**: `extracted/claude-code` · **覆盖**：acq + 7 扫描 + 双镜 verify + 5 lane

## 结论

Claude Code 是本次 sweep 的**良性基线对照**：它确实实现了与 ZCode 拓扑完全一致的上传管线——服务端逐文件签发 `filestore_jwt` + `upload_path` 凭证 → 客户端 PUT 原始字节 → sha256 commit 注册——但每条路径都是**用户显式发起、UI 逐步披露、多层门控**的云会话/远程控制特性。ZCode 的决定性特征（隐藏、每 prompt、UI 不可见）被明确证伪。

## 上传机制

### 管线 A — teleport/seed bundle（一次性）

- 触发：`--teleport`/`--cloud`/`--remote` CLI flag、`/teleport` 命令、headless cloud create。
- 打包：`git bundle` 工作树（refs/seed/stash + refs/seed/root；squashed scope 含未提交 WIP——合成 commit-tree；untracked 文件**永不进包**）。上限 100MiB/bundle；credential 命名文件拒收（`leaveOutUncommittedCredentialFiles`）、硬链接/符号链接拒收、HIPAA 拒绝。
- 上传：multipart POST `{BASE_API_URL}/v1/files`（purpose=user_data）→ fileId → `POST /v1/code/sessions` 携带 `seed_bundle_file_id` 注册。
- UI：`"Packaging this repository → Uploading your working tree → Creating cloud session"` 逐步可见。

### 管线 B — dir-sync / synced_file（云会话挂载期间持续）

- 触发：cloud session / Remote Control attach。
- 凭证：`POST /v1/code/sessions/{id}/synced_file/uploads` → `{filestore_url, filesystem_id, filestore_jwt, upload_path}`（逐文件签发）。
- 上传：`POST {filestore_url}/v1/filestore/fs/createFile` multipart（Bearer filestore_jwt；filestore_url 经 origin allowlist 校验）→ `uploads/commit` 带 sha256。
- **这正是 ZCode 三段式拓扑**（凭证签发→直传→注册回调），差别在 consent 与披露。

## consent 面（与 ZCode 相反）

- 真实开关：`~/.claude.json` 的 per-directory `remoteFileMode`（`container_sync`/`device_tools`；未设置=未 opt-in→`consent_off` 直接不发）。
- consent 对话框文案诚实："Sync this project directory to the cloud?…Secrets, credentials, and gitignored files are never synced…"，默认焦点 `not_now` 且不持久化（会再问）。
- 多层门控：org policy（`allow_remote_sessions`）、claude.ai OAuth + org UUID + trusted-device token、HIPAA 拒绝、`essential-traffic-only`/`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`/`DO_NOT_TRACK` env kill-switch、服务端 reject parking。
- 传输 TLS + 短时令牌，无客户端加密包装。

## 通道清单

| 通道                         | 内容       | 门槛                          | 判定     |
| ---------------------------- | ---------- | ----------------------------- | -------- |
| git bundle → /v1/files       | 工作树快照 | 显式 cloud session + consent  | 披露合规 |
| synced_file / filestore      | 逐文件同步 | remoteFileMode=container_sync | 披露合规 |
| /feedback、transcript share  | 会话/诊断  | 用户触发 + 确认               | 合规     |
| Statsig/GrowthBook、错误上报 | 元数据     | env kill-switch 可关          | 披露遥测 |

## 证据锚点

```
bundle.js（bun 编译 claude 二进制内嵌）
  teleport: claude:199249249 (Vgr git bundle), claude:199197014 (xC/F4 → /v1/files),
            claude:203415535 (seed_bundle_file_id 注册)
  dir-sync: /v1/code/sessions/{id}/synced_file/uploads → /v1/filestore/fs/createFile → uploads/commit
  consent: cloud_sync_consent 对话框 + remoteFileMode per-dir 键
```
