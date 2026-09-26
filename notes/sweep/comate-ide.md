# Comate AI IDE (Zulu) 3.10.1 — 判定：存在隐藏全仓上传管线（运行时拉脚本执行，比 ZCode 更隐蔽；仅限百度内网环境触发）

**包/来源**: 官方 `Comate-linux-x64-3.10.1.tar.gz`（VS Code 1.108.2 fork + comate ext 4.13.4）· **解包**: `extracted/comate-ide` · **覆盖**: acq+7scan+ 双镜 verify+5lane

## 结论

`CodebaseArchiveUploader` 在每次 agent 请求的前（`"pre"`）后（`finally` 里 `"post"`）各跑一次归档上传——**但打包/加密/上传逻辑不在二进制里**：客户端运行时 `fetch https://comate-ide.bj.bcebos.com/scripts/upload_to_bos.sh` 管道给 `bash -s -- <username> <rootPath> <queryId>_<phase>`，机制完全服务端可控、可随时改、静态审计不可见——比 ZCode 的捆绑 AES/RSA 更隐蔽。**门槛链把它限制在百度内网远程开发机**（`REMOTE_NAME` + git remote 必须 `icode.baidu.com` + 服务端 `REPO_NO_SENSITIVE` 裁决），外部 SaaS 用户结构上打不通——但对内部用户这是每 prompt 两次的整仓外发，且**零 UI 披露**（27 个设置项无一提及，连"索引"遮罩都没有）。

## 上传机制

### CodebaseArchiveUploader（主管线）

- **触发**: `ConversationThread.startNewWork` 每个 query 开头 `upload(...,"pre")`，`finally` 里 `"post"`；`uploadedPreQueryIds/uploadedPostQueryIds` 按 queryId 去重；fire-and-forget。IDE 引擎（`server.js` ~byte 5616805）与独立 zulu-cli（`chunk-DFS_Uonz.js` ~byte 5014363）字节级同款
- **门**: `getSkipReason()` = `!!process.env.REMOTE_NAME`（远程 server，extension.js 在内网环境注入 `REMOTE_NAME='baidu-internal-remote'`）+ 单根 workspace + `repoUrl` hostname === `icode.baidu.com` + 非空 username；之后 `repoSecurityStatusProbe` → `POST /api/v2/api/models/available {username,rootRepo,submodules[]}`（**repo 身份每次 prompt 都泄漏给 vendor API**）→ 仅服务端判 `REPO_NO_SENSITIVE` 才放行（ZCode 凭证签发门的同构——服务端裁决、客户端不可绕过）
- **执行**: 运行时下载 `upload_to_bos.sh` → bash 管道（scope `conversation:<id>:archive`，600s 超时）。打包范围、加密、凭证签发、注册回调**全部在远程脚本内**——静态不可见、服务端可变

### 辅助通道

- **Langfuse agent tracing**：`LANGFUSE_ENABLED_MATRIX` saas 默认 true + `DEFAULT_SAMPLE_RATE=1`，host `comate.baidu.com/langfuse`，硬编码 `pk-lf-…/sk-lf-…` 公钥私钥直写 bundle，仅 env `COMATE_LANGFUSE_ENABLED=0` 可关——trace 携带文件内容
- **安全扫描插件**（Snyk 式 bundle 协议）：`PUT {hash,content}` 到 `comate-sec.baidu.com`；服务端 `scanConfiguration.autoScanEnabled` 推送可让 autoScan 在文件 init/open/change 时自动跑——**唯一外部可达的内容外发**
- **内网专属**（外网不可达，仅记录）：devaux 的 tar.gz→BOS→注册流水线（`wbox` bucket，`uploadFile2Bos` 注释"特征存储 bos，方便云端分析"）、aiscan 的 diff gzip→`bep-qa.bj.bcebos.com`（ak/sk 来自硬编码 `uflow.baidu-int.com` webhook）、jarvis 覆盖率 diff tar.gz→`cpd-qa-jet`

## consent 面

- **零 consent 面**：三个 l10n 包、`package.nls.json`、全部 `contributes.configuration` 与设置 webview 均无 archive/upload/snapshot 字样；唯一痕迹是内部 `[CodebaseArchiveUploader]` 日志行——比 ZCode 更彻底（ZCode 至少还有个误导性"索引"标签）
- 无客户端开关；门 100% 在服务端/环境侧
- "代码索引"特性文案是该产品里唯一接近的披露面，但同样不提上传

## 通道清单

| 通道                                       | 载荷                         | 门槛                                                  | 判定                       |
| ------------------------------------------ | ---------------------------- | ----------------------------------------------------- | -------------------------- |
| CodebaseArchiveUploader → upload_to_bos.sh | 整仓归档（范围由远程脚本定） | REMOTE_NAME+icode.baidu.com+ 服务端 REPO_NO_SENSITIVE | **隐藏上传**（内网限定）   |
| Langfuse tracing                           | agent trace 含文件内容       | saas 默认开，env 才可关                               | **隐藏遥测**（硬编码凭据） |
| 安全扫描 → comate-sec.baidu.com            | 文件 {hash,content}          | 服务端 autoScanEnabled 推送                           | 披露失真（可当默认开）     |
| devaux/aiscan/jarvis BOS 管线              | 文件/diff/构建产物           | 内网凭据端点（10.11.x/uflow/precision.baidu-int.com） | 内网管线，外部不可达       |
| 反馈上传                                   | 日志                         | 用户触发                                              | 合规                       |

## 证据锚点

- `comate-engine/server.js` ~byte 5616805 / `zulu-cli/bundle/chunk-DFS_Uonz.js:921` — `CodebaseArchiveUploader` 类、`ConversationThread.startNewWork` 双调用点、`getSkipReason` 门链
- `server.js:1040` — `PassthroughModelListService.getRepoSecurityStatus`（`/api/v2/api/models/available` repo 裁决）
- `server.js:1410` — `LANGFUSE_ENABLED_MATRIX` 默认开矩阵 + 硬编码 pk/sk
- `extension.js:12` — `REMOTE_NAME`/`PLATFORM` 环境注入
