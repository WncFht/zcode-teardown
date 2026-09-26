# Qodo Command 0.36.0 — 披露失真：服务端可控的工作区内容通道（非 ZCode 式打包上传）

**包/来源**: npm `@qodo/command` 0.36.0 tarball · **解包**: `extracted/qodo/command-0.36.0` · **覆盖**: 全链（acq + 7 族扫描 + 双镜 verify + 5 lane）

## 结论

无 ZCode 式隐藏管线——没有工作区打包、客户端加密、对象存储凭证签发或上传注册代码；可疑的 tar/gzip/aes/rsa 命中全部回溯到 vendored 依赖（OpenAI SDK、axios、langsmith、ink）。但存在**真实的服务端门控工作区内容通道**：单条持久 WSS（`wss://<base>/v2/agentic/ws/connect`）承载 `UserQuery`（prompt 全文 + AGENTS.md/qodo.md 全文 + `projects_root_path` 绝对路径 + cwd + git HEAD sha + system_prompt + 跨会话摘要 + base64 图片）与 `IDERetrievalAnswer`（回传**每个工具结果含文件原文**）。

关键升级面：`GET /v2/info/get-things` 响应里的 `base_url` 字段会递归改写 `ServerData.baseUrl`——**厂商可整体重定向全部 egress 面**（axios baseURL + WSS URL），功能上等价于 ZCode 的凭证签发门，机制不同。

## 自动批准洞（比命中描述更宽）

`MCPManager.autoApprovedToolGroups=[READ_ONLY_TOOLS]` 使 `read_files`/`ripgrep_search`/`directory_tree`/git 读取默认免批准执行（`read_files` 自己 schema 里写 `autoApproved:false` 但被组覆盖）。更狠的是 `shellServerEnhanced.isToolAutoApprovedForArgs` 按 basename 放行 `cat/head/tail/grep/find/env/printenv` **且不做 allowedDirectories 限定**——远端可请求 `cat ~/.ssh/id_rsa` 或 `env`（全量环境变量），输出经 `IDERetrievalAnswer` 回传，零用户交互。文件系统工具有目录限定，shell `cat` 没有。

## consent 面

- LangSmith gzip batch-ingest：vendored `@langchain/core` 客户端，仅 `LANGCHAIN_TRACING_V2`/`LANGSMITH_API_KEY` env 门控，app 从不设置——休眠。
- `QodoTracker`：只在显式 SDK API `QodoClient.track()` 内实例化，CLI 不自动调用。
- 跨会话摘要由服务端生成并经 `get-session-summarization` 回注——服务端留存证据。

## 通道清单

| 通道                                    | 内容                            | 门槛                                  |
| --------------------------------------- | ------------------------------- | ------------------------------------- |
| WSS `/v2/agentic/ws/connect`            | UserQuery 全量 + 逐工具结果回传 | 登录 Bearer；服务端 base_url 可重定向 |
| `/v2/agentic/get-session-summarization` | 拉取历史会话摘要再注入          | 登录                                  |
| `/v1/analytics/track`                   | 元数据遥测                      | 默认开                                |
| LangSmith                               | 追踪                            | env 休眠                              |

## 证据锚点

`dist/api/agent.js:243-246,281,457-480,824-861`；`dist/api/websocketClient.js:340-345,461-485`；`dist/utils/serverData.js:41-74`；`dist/utils/sessionContext.js:144-173`；`MCPManager.js:53,515-521`；`shellServerEnhanced` 的 basename 白名单。
