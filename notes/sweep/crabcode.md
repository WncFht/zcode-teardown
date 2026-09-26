# CrabCode (Acosmi) 1.1.15 — 全仓 git bundle 上传（用户触发但范围/披露失真 + 服务端可翻转）

**包/来源**: GitHub release `acosmi/crabcode` v1.1.15 stable：`crabcode-1.1.15-linux-x64.tar.gz`（146MB）+ `oauthapi-llm-x64-linux.zip`（17.5MB），sha256 对照 release checksums 验证
**解包**: `~/src/agent-teardown/extracted/crabcode/`（Claude-Code 衍生，三份同构 bundle：dist/、runtime/worker/、runtime/bridge-host/）
**覆盖**: acq + 7 族扫描 + 双镜 verify + 5 lane，证据 `evidence/crabcode/journal-digest.json`

## 结论

存在完整的 **capture→pack→upload→register** 管线（"CCR seed"）：`git stash create` 快照未提交 WIP + `git bundle create --all`（**全部 ref 的完整历史**）→ multipart POST `acosmi.com/api/v1/files` → `seed_bundle_file_id` 绑定进 `POST /v1/sessions`。触发面是用户显式调用的远端会话功能（`--remote`、`/ultraplan`、`/ultrareview`——后者**无条件强走 bundle**），而非每轮 prompt；但 GrowthBook 远端 flag `tengu_ccr_bundle_seed_enabled` 可让厂商在不更新客户端的情况下把非 GitHub 会话翻转为 bundle 上传——服务端门控属性与 ZCode 一致。

## 上传机制

1. **捕获**: `git stash create` + `update-ref refs/seed/stash`——把**已跟踪文件的未提交 WIP** 折进上传（潜在 secrets 随之入包）；未跟踪文件（如新 `.env`）不收。
2. **打包**: `git bundle create ccr-seed-*.bundle --all refs/seed/stash`——`--all` = 所有分支/tag/remote-tracking ref 的完整对象图，**任何分支历史里曾经 commit 过的 secret 全收**；超 `tengu_ccr_bundle_max_bytes`（默认 100MB，远端可调）降级 HEAD-only → squashed-root tree。**零文件/路径/扩展名过滤、零内容扫描**。
3. **上传**: `uploadFile2` multipart/form-data POST `${baseUrl||https://acosmi.com/api}/v1/files`，Bearer OAuth，500MB/文件，3 次重试，TLS 明文——**无客户端加密、无 OSS/STS**。
4. **注册**: `seed_bundle_file_id` 绑进 `session_context`；显式环境路径还把 `CRABCODE_OAUTH_TOKEN`（**活 OAuth token**）塞进 `environment_variables` 转发进云会话。
5. **门**: `checkGate("tengu_ccr_bundle_seed_enabled")` env→config→GrowthBook 远端 features——服务端可翻转；`/ultrareview` 显式环境路径**不查门直接 useBundle:!0**。

## consent 面

- 全部 i18n 表（en/zh）**零**提及 "bundle"/"seed"/上传 repo；远端功能文案只说执行位置，从不说数据外发。
- 唯一可见报错 "Repo is too large to teleport" 间接暴露上传存在。
- 遥测点 `tengu_ccr_bundle_upload`/`tengu_teleport_bundle_mode` 仅 debug 日志。
- 失败路径有用户可见错误，但成功路径**完全静默**。

## 通道清单

| 通道                                   | 内容                               | 门槛                                 | 判定             |
| -------------------------------------- | ---------------------------------- | ------------------------------------ | ---------------- |
| ccr-seed bundle → acosmi.com/v1/files  | 全 git 历史 + WIP stash            | 用户调用远端功能 + GrowthBook 可翻转 | **范围失真上传** |
| session event mirror（Remote Control） | 会话事件 + 转发的 OAuth token      | opt-in 特性                          | 披露但泄露 token |
| BYOC uploadSessionFiles                | session outputs 目录内本轮改动文件 | 远端沙箱内运行                       | 合规             |
| /skill-store/upload                    | 插件发布                           | 用户发起                             | 合规             |
| archiveRemoteSession                   | 生命周期 POST                      | —                                    | 非外发           |

## 证据锚点

`dist/index.js:6108`（git stash create）；`_bundleWithFallback`、`createAndUploadGitBundle`、`uploadFile2`、`teleportToRemote`（三份 bundle 同构）；`checkGate_CACHED_OR_BLOCKING("tengu_ccr_bundle_seed_enabled")`；`session_context.seed_bundle_file_id`；`environment_variables.CRABCODE_OAUTH_TOKEN`。
