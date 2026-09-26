# JoyCode 3.8.71（京东 joycoder-fe VS Code 扩展）— 隐藏上传确认（多通道）

**包/来源**: VS Marketplace `joycoder.joycoder-fe` 3.8.71 · **解包**: `extracted/joycode`（`dist/extension.js` 23MB webpack 单行 bundle + setting/webview 子包） · **覆盖**: acq + 7 族扫描 + 双镜 verify + 5 lane 全覆盖

## 结论

Cline/Roo 系衍生扩展，存在**多条**工作区内容外发通道，其中两条是 ZCode 同构的服务端驱动自动上传。双镜均 `refuted:false`。

## 上传机制

### A. csr-core 远程索引（ZCode 最近同构，自动）

- 触发：`CodebaseSDKWrapper.warmUp()` 在 activate() 序列里**无条件执行**（仅 `JOYCODER_EVAL_MODE` env 可跳），`enabledTools` 硬编码含 `EMBEDDING`，其 `dependentIndexes=["remote"]` → `requiredConsumers` 必含 remote
- 流程：`createProject` POST `{username,branch,repo_url}` → `compareWithServer` POST **全工作区文件 merkle_tree（path+sha256）** → 服务端挑选 diff 下发 `task_id` → `uploadFiles` POST `{file_path, file_content, sha256}` **原文**到 `https://joycode-api.jd.com/codebase/api/v1/codebase-task/{id}/upload` → `getTaskStatus` 注册
- 门槛：唯一实门是登录 ptKey；声明的设置 `JoyCode.enableCodebase`（默认 true）**全 dist 代码零读取**——装饰性死开关
- UI：设置"上下文"页只有"代码库索引"状态 + 开始/更新按钮，**无一字提到文件内容上传**；服务端 `/config` 下发 max_file_size(100KB)/max_file_count(10k)/ignore 规则，fs.watch 脏队列持续同步

### B. Shenyi 安全扫描（服务端可拉取）

- `ws://shenyi.jd.com` 常驻 WS 接受服务端命令：`START_CHA` 递归扫工作区 `.java/.py/.go/.ts/.js/.tsx/.jsx/.mod/.sum`，以 `fileContentBase64` 上传；`START_XML_ANALYZER` 传 mybatis mapper；`START_REMOTE_EXUE/START_SAST_REMOTE_EXUE` = **服务端远程执行读文件**
- `isWhite2Commit`（GET `shenyisec.jd.com/joycoderhelp/isWhite2Commit?erp=`）白名单命中即**静默强置** `codeReview.commit=true`；此后 `vscode.git onDidCommit` 钩子把**每个提交文件原文** `{scode:"```lang\n<内容>\n```"}` POST 到 `http://shenyisec.jd.com/joycoderLLM/startTaskPlus`——**明文 HTTP**

### C. statCodeV2 本地守护中继

每次 `textDocument` 变更即 POST `http://127.0.0.1:9203/input`，载荷 `{text: 全文, filename, uuid:v5(path), projectPath, userName:erp, diff}`；守护进程转发到 `jdhgpt.jd.com/bdData`。门槛：jdh 登录 cookie。

### D. 用户触发通道（披露但有范围问题）

- **addCurrentFolder**：`CodeZipper` 把工作区全部文本文件序列化成 repomix 式 markdown → POST 知识库 datasets documents
- **deployProject**：`AdmZip` 递归打包整个 workspaceFolders[0]（`statSync` **跟随符号链接**，可越界；`.env/.npmrc/id_rsa/.ssh` 全收，无 secret 排除；`assetFolders` 白名单会豁免扩展名排除）→ POST `devcloud/api/v1/projects/{id}/deployTask`，query 带**绝对路径**
- KB 文件上传：presign→PUT→confirm 三段式

## consent 面

"代码库索引"文案只字不提上传；唯一声明开关是死代码；Shenyi 通道完全无 UI；deploy/KB 有可见触发但范围隐瞒（符号链接、secret 文件全收）。企业版 `isIDE()` 在本构建恒 false（`process&&!1`），SM2 enData 加密路径在 vscode build 里是死代码。

## 通道清单

| 通道                                  | 内容                        | 门槛               | 判定                   |
| ------------------------------------- | --------------------------- | ------------------ | ---------------------- |
| csr-core `/codebase-task/{id}/upload` | merkle 树 + 文件原文        | 登录即自动，死开关 | 隐藏上传               |
| shenyi WS 命令拉取                    | 服务端指定文件 base64       | 服务端驱动         | 隐藏上传（可远程触发） |
| `startTaskPlus` commit 钩子           | 每提交文件原文（HTTP 明文） | 白名单静默开启     | 隐藏上传               |
| statCodeV2 `:9203`                    | 每次编辑全文+diff           | 登录 cookie        | 隐藏遥测               |
| deployProject zip                     | 整 workspace（含 secret）   | 用户/工具触发      | 披露但范围失控         |
| KB addCurrentFolder                   | 全文 markdown               | 用户点击           | 披露但激进             |

## 证据锚点

`dist/extension.js`：`CodebaseSDKWrapper.warmUp`、`EmbeddingRuntime.update`/`compareWithServer`/`uploadFiles`（module ~7792）、`HandleSastRemoteExecuteMessage`、`sec.listenCommit`、`statCodeV2`（module 见 digest）；`dist/setting/index.js` CodebaseTab 文案。digest: `evidence/joycode/journal-digest.json`
