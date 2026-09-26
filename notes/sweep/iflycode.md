# iFlyCode 3.4.2（科大讯飞）— 隐藏上传确认

**包/来源**: VS Marketplace VSIX `AnhuiZhuojianTechnology.iFlyCode-3.4.2.vsix`（Open VSX 同步） · **解包**: `extracted/iflycode/vsix`（extension.js + 4MB `bin/iflycode/index.js` webpack bundle） · **覆盖**: acq + 7 族扫描 + 双镜 verify + 4 条深潜 lane（**缺 altpaths**）

## 结论

存在多条工作区内容自动外发通道，其中 RAG 索引上传**无任何 consent 面**——UI 里它叫"本地代码库"，实际把源码原文 POST 到 `iflycode-xfsaas.xfyun.cn`。双镜均判定可疑集不塌缩。

## 上传机制

### A. RAG 索引上传（隐藏，自动）

- 触发：`ActionController` INIT 路由 → `WorkspaceManage.init` → `RetrievalAugmented.initProject`，插件启动即跑 + 30 分钟定时器
- 数据：每个项目跑 `git status -s`/`svn status`，取 `A/M` 状态文件 → tree-sitter 抽方法 → 记录 `{repoKey, language, filePath, methodName, methodParams, codeContent=源码原文}`（>50 行方法按 50 行窗口、步长 25 滑窗），每 50 条一批
- 外发：明文 JSON POST `/api/ragserver/v1/rag/incbatchload`
- 门槛：登录 token + 服务端 `ragReady` 闸门（`POST /restapi/ragserver/v1/rag/repoKeyEnable`，30 分钟轮询）——**本地无用户开关**，`initProject` 只查 `g.ragReady`
- 披露：chat 知识片标注"本地代码库"，索引实际建在服务端——ZCode 式表述失真

### B. 代码监控 SM4 上传（默认开）

- 触发：补全显示后 `CodeMonitor.trigger`，10s 心跳在 30s/60s/300s 三个时点重读文件区域
- 数据：`{user, requestId, prefixCodeList:[SM4(prefix)], completeCodeList:[SM4(文件当前范围)]}` → POST `/api/starspark/v1/agent/collect/codeAccept`
- 加密：SM4，但 `SM4_KEY='GXjQSXlGw42RMR6av5Yzaw=='` 硬编码在 bundle（同模块还有 RSA_PUB_KEY/SM2_PUB_KEY/AES_KEY/AES_IV）——只防被动监听，不防厂商
- 门槛：`codeMonitorEnable` 默认 true

### C. chatDataContent 回传

每轮 assistant 完成即 POST `/agent/collect/chatDataContent`，载荷 `JSON.stringify({...userData, ...store})`，store 含 `userSelectedCode` 等真实内容。

### D. 凭证外发（披露但需注意）

`SAVE_TOKEN` 把 git token 反转+base64 后 POST `codeK/updateGitToken`；`REPO_AUTHORIZE` POST `{repoUrl, branch, accessToken}` 到 `codeK/personal/auth`——企业"代码知识库"功能有授权弹窗（"申请获取您当前代码库建立索引"），但文案不提源码克隆到厂商服务器。

### E. APM 遥测（默认开）

vendored OTel SDK，`apmEnable` 默认 true，fallback URL `https://iflycode-xfsaas.xfyun.cn/v1/traces`，GZIP span 携带 client.serverURL/sessionId——元数据级，默认开无 UI。

## consent 面

`package.json` **零 configuration 贡献**——没有 VS Code 设置项，所有开关在 webview 设置页。唯一 consent 面是企业代码库授权弹窗（管线 A 的兄弟流程），而自动跑的 incbatchload 无任何弹窗/开关/文案。`extension.js` 的 `apmEnable=!1!==e?.apmEnable&&!!apmBaseUrl` 默认放行。

## 通道清单

| 通道                                     | 内容                 | 门槛                           | 判定               |
| ---------------------------------------- | -------------------- | ------------------------------ | ------------------ |
| `/rag/incbatchload`                      | 源码原文方法块       | 登录 + 服务端 flag，无本地开关 | 隐藏上传           |
| `/agent/collect/codeAccept`              | SM4(补全上下文)      | 默认开                         | 隐藏遥测（弱加密） |
| `/agent/collect/chatDataContent`         | 会话 + 选中代码      | 每轮                           | 隐藏遥测           |
| `codeK/personal/auth` + `updateGitToken` | repo URL + git token | 用户授权弹窗                   | 披露失真           |
| `/v1/traces` OTLP                        | 遥测 span            | 默认开                         | 遥测               |

## 证据锚点

`extension/bin/iflycode/index.js`：`ActionController`/`WorkspaceManage`/`RetrievalAugmented.initProject`/`RagService.ragBatchLoadApi`/`CodeMonitor.trigger`/`SM4_KEY`（module 42135）/`ApmManage`；`dist/extension.js`：`DataBackFlow.report`、SAVE_TOKEN/REPO_AUTHORIZE 路由。digest: `evidence/iflycode/journal-digest.json`
