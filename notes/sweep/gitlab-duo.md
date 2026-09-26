# GitLab Duo 扩展 6.91.0 — clean（全部为声明式特性外发）

**包/来源**: VS Marketplace `gitlab.gitlab-workflow` latest vsix（公共端点；响应 gzip 包裹需解一层）38MB
**解包**: `~/src/agent-teardown/extracted/gitlab-duo/`
**覆盖**: acq + 7 族扫描 + 双镜 verify + 5 lane，证据 `evidence/gitlab-duo/journal-digest.json`

## 结论

**无 ZCode 式隐藏工作区上传**。17 个命中全部核实为真实代码但均为**已声明、文档化**的 GitLab 特性：代码补全（`POST /api/v4/code_suggestions/completions` 携带光标上下文）、Duo Agent Platform（wss + REST + gRPC 双向流）、opt-in 实时 SAST 扫描、遥测。全部外发去**用户自配的 GitLab 实例**或 GitLab AI gateway——无工作区 tar 包、无对象存储直传、无隐藏索引器。

## 排除依据

- 所有 tar/zip/gzip 命中是 vendored 库（isomorphic-git、sandbox_worker 内 tar-parser、TS lib）；archiver 仅用于本地诊断 ZIP（经用户 save 对话框）。
- 无任何 createCipheriv/publicEncrypt/RSA-wrap/AES 用于用户载荷；node-forge 仅服务于捆绑 `srt` sandbox-runtime 的 TLS 终结代理（**限流**用途非外发）。
- 无 presigned/OSS/S3/workhorse 端点；direct_access 凭证是**已声明特性**的凭证签发。
- 所有上传类配置项（openTabsContext、realTimeSecurityScan、sandbox.enabled）都在 `package.json contributes.configuration` 里声明。

## consent 面（有门槛但姿态偏弱）

- 每条外发通道都有真客户端开关（LS policy-check：CodeSuggestionsEnabledCheck/AgentPlatformEnabledCheck 等）+ 服务端多层闸（duoFeaturesEnabled、license/seat、duoContextExclusionSettings）。
- 弱点：`openTabsContext` **默认开**（发打开标签页内容）；self-managed 实例遥测 `enabled=!0` 强制开无 opt-out；未声明的 `gitlab.trackingUrl` 可改 Snowplow 端点（需手改 settings.json）；`codesuggestions.gitlab.com` 是 sourcemap 里的死常量。

## 通道清单

| 通道               | 内容                                    | 门槛                             | 判定                                |
| ------------------ | --------------------------------------- | -------------------------------- | ----------------------------------- |
| code_suggestions   | 当前文件光标上下文 + open-tab 内容      | 声明配置 + direct_access 凭证    | 披露特性（默认开发_tab 上下文偏宽） |
| Duo Agent Platform | agent goal/工具事件/读文件结果          | 声明配置 + 实例 flag + license   | 披露特性                            |
| 实时 SAST          | 单文件 {file_path,content}              | 主开关默认关（开启后 save 自动） | opt-in 合规                         |
| Snowplow 遥测      | 事件元数据 → snowplowprd.trx.gitlab.net | 默认开；self-managed 强制        | 遥测（self-managed 强开扣分）       |
| sandbox-runtime    | 短命 CA + TLS 终结 agent 子进程         | 默认关                           | 限流机制非外发                      |

## 证据锚点

`extension.js`：`/api/v4/code_suggestions/{completions,direct_access}`、`/api/v4/ai/duo_workflows/ws`、`/DuoWorkflow/*` gRPC、`realTimeSecurityScan`、`openTabsContext`；`sandbox_worker.js`（vendored TLS 代理）；`package.json contributes.configuration`。
