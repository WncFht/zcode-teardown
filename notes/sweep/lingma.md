# 通义灵码 Tongyi Lingma 2.6.10（阿里，VS Code 扩展 + Go 二进制）— 无 ZCode 式整包上传；存在默认开的代码块外发（披露失真）

**包/来源**: VS Marketplace `Alibaba-Cloud.tongyi-lingma` 2.6.10（vsix 内嵌 `lingma-2.6.10.zip` → 92MB 剥离符号 Go 二进制 `Lingma`，module `code.alibaba-inc.com/cosy`） · **解包**: `extracted/lingma/`（JS 侧为瘦 WS/IPC 客户端，**全部厂商流量走 Go binary**） · **覆盖**: acq + 7 族扫描 + 双镜 verify + 5 lane；原生二进制经 `.gopclntab` functab + 291,966 边调用图 + objdump 指令级 xref 核验（`scratch/lingma-verify/`）

## 结论

ZCode 五段式（tar.gz 整包 → AES → RSA-wrap → OSS 凭证 → PostObject → 回调）**被逐环否定**；但文件保存即自动把代码块 POST 到厂商 embedding API 的远程索引通道存在，由**服务端 feature flag 门控、本地无开关**，属披露失真。

## 排除依据（调用图级）

- 无凭证签发端点：全部外发走 `BuildBigModel*Request` 签名 RPC（`lingma-api.tongyi.aliyun.com/algo`），无 upload-credential/STS/presign
- 无 OSS 上传：`aliyun-oss-go-sdk` 被 dead-code 消除，pclntab 仅剩 `oss.init`；所有 `oss_*` 配置键是模型/插件**下载**根
- 无工作区打包：`archive/tar` 零存活函数；`cosy/util.Zip/ZipFiles` 唯一调用者是 `feedback.collectLogs`（用户触发的诊断包，只打产品自身日志）
- 无回调注册：上传直接读响应（feedbackId/imageUrl）

## 上传机制（真实存在的）

### A. 远程 RAG 索引（自动，服务端 flag 门控）

- 触发：server boot `GlobalFileIndex.IndexWorkspace` + 文件事件 `AddFileQueue`（didOpen/didSave/ rename…）+ chat 驱动 `emitCollectWorkspaceTreeStep`
- 流程：`.gitignore`+`.tongyiignore`+硬 deny（任何 `.` 开头段、`__`、`/.svn//dist//venv/node_modules` 等；文件 >300KB 或 minified 跳过）→ tree-sitter 分块 → `BatchEmbedChunks` → POST `/api/v2/service/codebase/embedding` `{model:"text-embedding-v3", input:[chunk 原文]}` —— **代码原文离机**
- 门槛：远端 `remote_config` 的 `WORKSPACE` flag（`IsWorkspaceRagFeatureEnabled`）+ 登录；**无任何用户可见开关或文案覆盖此通道**
- 传输：`message_encode:"1"`（默认）时 body 走自定义洗牌 base64（混淆非加密）；`BuildForceAiSvcRequest` 路径带 AES-CBC `EncodeContext`

### B. queryCode 远程检索

补全上下文代码块 POST `/api/v2/service/queryCode`（`GetRelevantCodes`）。

### C. 遥测（默认开）

`sls.Report` ~50 个调用点 + 心跳 `BuildBigModelSignRequest`：载荷含 userId/session_id/file_id/ideInfo + **share-chunk 的 repo 名 top-10 与命中桶**（repo 名元数据外发）。

### D. 诊断包（用户触发，诚实文案）

`sendIssueReportFeedback`/crash → `reportDiagnosisLog` → zip `lingma-*.log`、platformInfo、feedback.txt 等 → multipart POST `/api/v2/file/diagnose/upload`。UI 明示"自动发送本地日志"——真 opt-in。注意 `collectLogs` 接受调用方给的任意路径（仅存在性检查）；`lingma/user` 文件（被 RSA-1024 厂商公钥加密的用户信息）在收集集内，可随包离机。

## consent 面

三处诚实的：登录前 click-wrap（`needSignAgreement`，服务端可强制重签）、Issue Report 文案如实、"改进计划"勾选明确提"code snippets and context"（默认 opt-in 关闭态，且是**纯服务端 flag** `updateDataPolicy`——不门控任何本客户端上传）。**缺口**：codebase 远程 embedding 无任何开关/诚实文案。

## 通道清单

| 通道                          | 内容                                  | 门槛                           | 判定             |
| ----------------------------- | ------------------------------------- | ------------------------------ | ---------------- |
| `/service/codebase/embedding` | 代码块原文                            | 服务端 flag + 登录，无本地开关 | 披露失真自动外发 |
| `/service/queryCode`          | 补全上下文块                          | 特性固有                       | 披露             |
| `/algo` 大模型 RPC            | prompt+context（base64 混淆/AES-CBC） | 登录                           | 披露特性         |
| `/file/diagnose/upload`       | 产品日志 zip（可含 user 文件）        | 用户触发                       | 合规             |
| SLS/心跳                      | 元数据 + repo 名 top10                | 默认开                         | 遥测             |

## 证据锚点

`cosy/remote.BuildBigModel*Request`、`indexing/manager`、`rag.SqliteVecRetrieveEngine.BatchEmbedChunks`、`components.LingmaEmbedder`、`common.ProjectIgnore`、`feedback.collectLogs`、`sls.Report`；embedded RSA pubkey 文件偏移 30897009/30897281。digest: `evidence/lingma/journal-digest.json`
