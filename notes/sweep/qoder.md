# Qoder 1.31.0 — 判定：真实工作区内容上传（默认开启的"索引"+ 服务端门控 back_flow；披露失真）

**包/来源**: 官方 deb `1.31.0-1789690586`（VS Code 1.106.3 fork + 110MB stripped Go daemon `resources/bin/x86_64_linux/Qoder`，pclntab 恢复 75349 函数）· **解包**: `extracted/qoder` · **覆盖**: acq+7scan+ 双镜 verify+5lane

## 结论

守护进程 `cosy` 模块里存在完整的工作区内容外发：merkle-diff 镜像同步 + 缺漏文件批量 zip 上传（`/api/v2/service/codebase/file/upload`），外加 `back_flow` 报告把 `file_content_gzip_b64`、prompt 原文、git remote URL 打进厂商 `/api/v1/tracking`（内嵌 SLS SDK 为死代码，见「复核」）。**与 ZCode 的差异**：不是整包 tar 而是 merkle 增量镜像；载荷明文 zip over TLS（RSA/AES 只用于请求签名与本地日志密封）。UI 上以 "代码库索引/Indexing" 名义披露——**"自动索引"默认开、文案只说改善理解不提上传**；back_flow 完全无 UI 面，只受服务端 flag + `data_policy_sign_status` 门控。

## 上传机制

### A. mtree 缺漏文件上传（索引同步核心）

- **触发**: worktree 创建（`WorktreeManagerImpl.ensureValidHead` → `git_worktree.go:512-556`）、git commit 监控（`worktree_commit_monitor.go:69`）、RAG 索引引擎（`ServerVecRetrieveEngine.HandleUploadFilesV2/HandleSyncServerNodesV2`）——全部先查远端 flag `upload.missing.files.enabled` + 登录态
- **diff**: 服务端 merkle 树比对——`checkMtreeLeavesSyncStatus`/`checkLeafBatchWithRetry` + `GetMissingFileIds`（`/file/bfDiscover`）返回 `notFoundFileIds`；`locateMtreeLeafFiles` 映射回本地路径
- **打包**: `upload_missing_file.go:273-335` 攒批至 9MiB → `archive/zip` 出 `files.zip`，multipart form 字段 `workspacePath/dimensions/isUploadMissingFile/isBackFlow`
- **传输**: PUT/POST `https://center.qoder.sh/api/v2/service/codebase/file/upload`（fallback：openapi.qoder.com.cn / gateway.qoder.com.cn / *.qoder.sh），BigModel 签名头（Cosy-Key/Cosy-User/Cosy-Date + AI-CLIENT-TIMESTAMP），**载荷无加密**
- **注册**: 响应 `success_uploaded_file_ids` → `sync/updateMerkleNodes` + `sync/endSync` 把文件写进服务端 codebase 索引（供 embedding/RAG）

### B. back_flow 报告（`/api/v1/tracking`，无 UI 面）

- `cosy/chat/chains.doAgentBackFlow` 挂在每次 doAsk 链尾；`ReportMtreeFullSnapshot` 发整棵文件树 `mtree_gzip_b64`
- 载荷字段：`file_content_gzip_b64`（当前文件原文，0x5000 截断）、`context_data_gzip_b64`、`prompt_user_input_gzip_b64`、`git_remote_urls_gzip_b64`、`edit_sequence_gzip_b64`、`mtree_diff_gzip_b64`、`memory/rules/mcp_tools_gzip_b64`
- 出口：实测 `POST {big_model_endpoint}/api/v1/tracking`（心跳→`/api/v1/heartbeat`，BuildBigModelSignRequest 签名）；**内嵌阿里云 SLS SDK（PutLogs/PostRawLogs/`*.log.aliyuncs.com`）零调用零构造=死代码**——旧"→SLS"结论已修正
- **门槛**: 仅服务端 flag（`back_flow_enabled`、`backflow.scanfile.enabled`、采样率 `backflow.nes.ratio`）+ `data_policy_sign_status`（`data_policy_not_agree` 只置 X-Stilla=2 不拦截）——**客户端无开关、无 UI**；敏感检测走远控 `scanfile.regexlist`+注入分发（录名 `ContainsSensitiveDataUs` 块为零引用诱饵），用途是标记而非拦阻

### C. 诊断打包上传（ZCode 同构但用户触发）

- `reportIssue` → 递归收集 IDE 日志（含 RSA-2048 密封的 `[ACP]` 加密会话日志——**厂商独钥可读**）、cli_projects、crash、environment.log（含 MachineToken）→ zip
- 主路径 PUT `/issue/file/diagnose/upload`；**fallback 是 ZCode 原形状**：`GET /issue/oss/policy?bucket=diagnose` → OSS PostObject 直传 → `oss_key` 注册
- 用户触发合规，但 zip 里混入 vendor-keyed 加密日志这点值得记录

## 载荷解剖

字节级解剖 8 条外发 lane（证据 `evidence/qoder/anatomy/` ANATOMY.md + d_*.txt；JSON 一律包 `HttpPayload{payload,encodeVersion=1}`，线体=gzip(payload)）：

- **mtree 缺漏文件上传** — 触发 `EnsureMtreeFilesUploaded`@0x17d3060（worktree/commit 监控/RAG V2；门序 flag→autoIndex→登录→codebaseId）。端点：`bfDiscover`→`checkStatusV2`→multipart `/api/v2/service/codebase/file/upload`。字段：`codebaseId,model=text-embedding-v4,workspacePath,notFoundFileIds`+`files.zip`（Deflate，相对路径+原文）。**服务端实收**：明文 zip 的缺漏文件子集+绝对工作区路径。范围：单文件≤1MiB、批≤9MiB（@0x180bbc0/0x180bbf1），.qoderignore/.gitignore 生效、.git 排除、secrets deny-glob **缺 `.npmrc`**（registry token 随包上行）；X-Stilla=2 只标记不拦截。
- **codebase 同步控制面** — `/api/v2/service/codebase/sync/*`+`/operation/*`：`initCodebase` 带 `remoteUrl`(git origin)+`simhashBits/Vec`（整树指纹）；`updateMerkleNodes` 增量发全量 `relpath+sha256`。**实收**：绝对路径+git remote+全仓 merkle 地图（不含文件体）。纯 JSON lane。
- **back_flow ×5 → `/api/v1/tracking`**（非 SLS——SLS SDK 死代码）— 触发 `doAgentBackFlow`@0x2429360（doAsk 链尾）+NES/EditSeq/Completion/MtreeSnapshot。字段：`file_content/file_change_diffs/edit_sequence/mtree/mtree_diff/input_data/context_data/prompt_user_input/git_remote_urls/memory/rules/mcp_tools` 等全 `*_gzip_b64`。**实收**：原文 prompt+文件内容+diff+整棵 merkle+git remote，machineId+session+codebaseId 键。过滤：单值≤20KiB（@0x17cc8e0）、ext≤50-500KiB、scanfile.regexlist 远控选文件；仅服务端 flag 门控。
- **commit 助手 `/commit/*`** — AI commit message 时 `batchBuildCommitMsg` 发 `commitId+originalMsg+diff`（**raw unified diff**，序列化无大小上限）——索引管线之外的代码内容出口。
- **wiki/知识卡上传** — `wiki.knowledge.card.upload.enabled` 门控，`POST /algo/api/v1/organizations/{org}/knowledge/wiki/upload`（OAuth Bearer）：`repo/branch/commit`+documents.content 全文+cards(title/content/keywords)。**实收**：代码库文档化全文。
- **remote-agent broker** — `openapi.qoder.sh /api/v1/remote/imports|events|workspaces`；artifact 三步：申请（`source_path/md5/size`）→ presigned OSS PUT 原始字节（**字节落厂商 OSS，不经 center**）→ complete。
- **诊断包** — daemon `ReportDiagnosisLog`@0x25d0900 收集日志 zip（含 RSA-2048 密封 [ACP] 会话日志+environment.log 内 MachineToken）→ PUT `/algo/api/v2/file/diagnose/upload`；JS 兜底 `GET /issue/oss/policy`（**无鉴权**）→ OSS PostObject→`oss_key` 注册。
- **存根/非外发** — `traceviz.runUpload`@0x19ed780 仅查未传 oplogs 即返回（本版不外发，flag 可远端激活）；`stilla.remoteControlUploadSnapshot` 本地分发；`/api/v2/config/updateDataPolicy` 只记同意态。

## consent 面

- Settings "Indexing" 区：标题"代码库索引"，文案 "improves contextual understanding…"——**只说建索引不说上传**；"Automatic Indexing" `defaultValue:true`（≤10k 文件自动建索引）；唯一暗示是 "Index limit reached. Upgrade to continue."（服务端计量）
- 开关真实门控索引上传路径（daemon 各 indexer 都查 autoIndexEnable）——所以是**披露失真的 opt-out**，不是 placebo
- `.qoderignore` + `.gitignore` 真实生效；secrets deny-glob 覆盖 `.env*`/credentials/key/pem/ssh 等（**但 `.npmrc` 在 keep-list 上**——registry token 会被收）
- `.git` 明确排除（区别于 ZCode）；`privacy/共享改进模式` 开关管 back_flow 的服务端 policy 状态，但 back_flow 本身无任何 UI 描述

## 宣称对照

| 厂商宣称 | 出处 | 实际行为 | 判定 |
| --- | --- | --- | --- |
| 索引"只传必要代码文件，向量生成后即销毁，云端只留向量" | docs EN indexing L9-11 | 缺漏文件 zip 明文上行并写入服务端 merkle 索引；back_flow 另把文件原文送 `/api/v1/tracking`，根本不经向量生成——"销毁"不可证 | 矛盾 |
| "Qoder does not store your source code"（EN/CN FAQ 同义） | docs EN/CN FAQ | 文件内容实际到达并留存厂商存储（索引库+tracking 通道） | 矛盾 |
| CN："向量数据仅保存在客户端本地" | docs CN indexing L11 | ServerVecRetrieveEngine 服务端向量检索+服务端 merkle 索引；与 EN 文档自相矛盾 | 矛盾 |
| "代码上下文不会被存储或用于其他任何目的" | docs CN faq | back_flow 原文上行正是"其他目的"（质量/遥测） | 矛盾 |
| 索引排除"配置、密钥等非必要文件" | docs EN/CN indexing | 仅文件名 glob，无内容扫描；`.npmrc` 在必收清单——registry token 照样上行 | 误导 |
| 设置文案"improves contextual understanding…" | 包内 Settings L892 | 只讲收益不提文件内容离设备 | 误导 |
| "Automatic Indexing（<10k 文件）" default:true | 包内 Settings L791 | 默认开+远端 flag 即全量缺漏上传，无逐工作区同意 | 低估 |
| 隐私政策收集清单=用户主动提交的 User Content | qoder.com privacy | 自动缺漏上传与 back_flow 两条采集通道均未入清单 | 未披露 |
| 改进用途"de-identified"+"Share & Improve" 可关 | privacy §3 | gzip+b64 是传输编码非去标识（原文上行）；开关只管 back_flow，**不管索引上传** | 误导 |
| ToS §5.2：Usage Data 排除 User Content、仅聚合披露 | qoder.com ToS | back_flow 带 User Content 原文，协议通篇未提 | 未披露 |
| "Privacy Mode：数据不用于产品改进" | 包内 L835 | 只门 back_flow；隐私模式下索引上传照样走 | 误导 |
| "Telemetry — Control telemetry data collection" | 包内设置 | back_flow 无客户端开关（纯服务端 flag），开关管不到最强通道 | 误导 |
| 企业版"完整审计日志/数据边界"+ISO/SOC2 | qoder.com/enterprise | back_flow 组织不可见不可关，索引上传无审计面 | 误导 |
| 问题反馈清单=配置/截图/描述/邮箱 | 包内 reportIssue | 实际 zip 另含厂商独钥可解的密封会话日志+MachineToken | 低估 |
| CN 隐私政策输入含"上传的文件" | qoder.cn §2.2.1 | 框架为用户主动提供；自动缺漏上传+back_flow 全文未披露 | 低估 |
| **back_flow 通道本身** | （全表面零提及） | 全披露面无一字提及；二进制实锤原文外发通道 | 未披露 |
| 忽略文件机制（.qoderignore/.gitignore） | docs+包内 | 实测生效 | 如实 |
| 传输/存储加密、PRC 驻留、内容审核权 | privacy/ToS | 与客户端可观察行为一致 | 如实 |

## 通道清单

| 通道                                            | 载荷                                     | 门槛                              | 判定                         |
| ----------------------------------------------- | ---------------------------------------- | --------------------------------- | ---------------------------- |
| mtree 文件上传 `/file/upload`                   | 缺漏文件 zip（明文）+ workspacePath      | 远端 flag + 登录 + 自动索引默认开 | 披露失真 opt-out             |
| back_flow → `/api/v1/tracking`                  | 文件原文/prompt/diff/git remote gzip_b64 | 仅服务端 flag+ 采样               | **隐藏上传**                 |
| 诊断包 `/issue/*`（含 OSS PostObject fallback） | 日志+crash+ 环境                         | 用户触发                          | 合规（但含厂商独钥加密日志） |
| 诊断日志 `/api/v2/file/diagnose/upload`         | IDE 日志收集                             | 服务端触发诊断任务                | 披露失真                     |
| remote-agent workspace                          | getBundle/generateBundle 命名空间复制    | remote agent 模式                 | 特性固有                     |
| 内容安全/eval 等                                | query/结果采样                           | 服务端 flag                       | 披露失真                     |

## 证据锚点

- `resources/bin/x86_64_linux/Qoder`（Go daemon）— `cosy/components.EnsureMtreeFilesUploaded`(0x17d3060)、`upload_missing_file.go:249-490`、`ensure_mtree_upload.go:96-244`、`worktree_commit_monitor.go:69`
- `cosy/service/back_flow` — `ReportMtreeFullSnapshot`、`reportBackFlowMtreeSyncWithRetries`、`file_content_gzip_b64` 字段族
- `cosy/core/sls` — LogReporter → `{big_model_endpoint}/api/v1/tracking`；vendored SLS SDK（`*.log.aliyuncs.com`）为死代码
- `sharedProcessMain.js:128,154-155` — `/issue/oss/policy` OSS 流程 + 内嵌第二 RSA 公钥（EncryptedLogService）

## 复核

- ✅ **缺漏文件 multipart 上传**：活管线非死代码——`GetMissingFileIds`@0x1802c80→`uploadBatchWithRetry`@0x1805a20 建 `files.zip` POST `/file/upload`；`upload.missing.files.enabled` 三处门点（0x1809bbc/0x180dcbd/0x17d9fe0）。⚠️但"进程启动即触发"未独立证实——实证触发点为 worktree/commit 监控/mtree-ensure。
- ⚠️ **back_flow 内容外发=确认，目的地≠SLS**：gzip+b64 助手@0x17ce760 有 22 个真实调用点把文件原文/prompt/diff/git remote 编进报告字段（单值≤20KiB @0x17cc8e0）；但字节级出口是厂商 `/api/v1/tracking`+`/api/v2/service/business/finish`，vendored SLS SDK（PutLogs/PostRawLogs/log.aliyuncs.com）零调用零构造=**死代码**——本文"→SLS"表述已全部修正。
- ✅ **敏感过滤远控 regexlist 驱动**：`backflow.scanfile.regexlist.b64` 远程键 base64 解码→逐条 Unmarshal→全局表 0x6dba740，匹配经注入函数字段分发；⚠️但 `ContainsSensitiveDataUs/IsSensitiveFileType` 录名块（0x17c7e40-0x17cbfe0）零入边零数据引用=**不可达诱饵**，活路径在全局表+注入分发。
- ✅ **data_policy 不拦上传**：`data_policy_not_agree` 只把 X-Stilla 置 2（标记非拦截）；`data_policy_sign_status` 仅门 back_flow。
- ✅ 新增实证：`initCodebase` 上送 git remoteUrl+整树 simhash 指纹；`/commit/*` 上送 raw diff；traceviz 为非发射存根；诊断 zip 含厂商独钥密封日志且 OSS policy 拉取无鉴权。

## 版本考古

**结论**: 缺漏文件批量上传链路首现于 **0.3.0**（daemon build 2026-01-19 20:02，commit 2ea2ea3，公开发布 ~01-20）。上传*基础设施*（daemon 本体、`/codebase/file/upload` 端点、back_flow 遥测、center.qoder.sh、autoIndex UI）在最早可获取的 launch build（wayback 2025-08-22, cosy 0.1.15）已齐——**早于可获取历史**；0.3.0 新增的只是隐藏缺漏上传机械（`upload_missing_file.go`：UploadMissingFile/isUploadMissingFilesEnabled/matchMissingFiles/GetMissingFileIds + `/file/bfDiscover` + `upload.missing.files.enabled`）。

| 版本                                     | daemon build  | 签名   | 备注                                                 |
| ---------------------------------------- | ------------- | ------ | ---------------------------------------------------- |
| pre-0.1.15 launch（darwin-arm64, 08-22） | —             | 部分   | 基础设施全在；缺 UMF/bfDiscover/umfe/EMU/data_policy |
| 0.2.15                                   | 2025-11-17    | 无     | `data_policy_sign_status` 此时已出现                 |
| 0.2.24 / 0.2.28                          | 12-22 / 01-06 | 无     | —                                                    |
| 0.2.29                                   | 2026-01-12    | 无     | **最后缺失版**                                       |
| 0.3.0 / 0.3.1 / 0.3.2                    | 01-19→01-26   | **有** | 首现；daemon 117.1→120.1MB                           |
| 0.6.0 – 1.20.1                           | 03-09→07-29   | 有     | 持续存在；EMU 仍无                                   |
| 1.31.0 / 1.32.0（最新）                  | 09-17/09-23   | 有     | EMU=2：EnsureMtreeFilesUploaded 编排器已上线         |
| qodercli 1.1.62                          | —             | 无     | CLI 不携带该链路（IDE daemon 专属）                  |

- 门槛设计自 0.3.0 到 1.32.0 **零变化**：远端 flag `upload.missing.files.enabled` + 登录 + autoIndex（默认开）+ .qoderignore/.gitignore；披露姿态不变——UI 始终只说 "indexing"
- 同意门控 `data_policy_sign_status`/`data_policy_not_agree`：launch 无 → ≤0.2.15 出现，区间 **(pre-0.1.15, 0.2.15]**，至今仍只门 back_flow
- back_flow 全版本**仅服务端 flag**（`backflow.scanfile.enabled/regexlist`、`backflow.max.*`、`nes.ratio`），从无客户端开关
- **边界**：缺失 ≤0.2.29 / 出现 ≥0.3.0（两版间无中间版本，边界精确）；子签名 EMU 第二边界 **(1.20.1, 1.31.0]** 较粗（~19 版）。覆盖缺口：qoder-app 线与 qoderwake 未探测
