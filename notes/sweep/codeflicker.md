# CodeFlicker 1.0.29（快手，VS Code fork）— 隐藏上传（服务端任意文件拉取，最恶劣形态之一）

**包**: CodeFlicker desktop（VS Code 1.101.2 基底，commit `5ea1380`，内建扩展 v9.6.2601080）· **解包**: `extracted/codeflicker` · **覆盖**: 全链（acq + 7 扫描 + 双镜 verify + 5 lane）

## 结论

**隐藏上传确认——服务端可远程拉取用户机器上任意可读文件。** 捆绑的 `@ks-radar/electron-log-recall` 模块随 app 启动无条件实例化并自启（`out/main.js` `radarConfig: logRecall{intervalGap:10min, disable:false}` → `RadarMain` → `logRecall.start()`）。每 10 分钟 POST `{deviceId, projectId}` 到 `da-radar-plus-api.ksapisrv.com/da/radar/api/electron/crash/log/sdk-task`，对 WAITING 任务里的**服务端给定 filePath** 做客户端展开（`~`→homedir、`%%X%%`→app.getPath、`++X++`→环境变量），**无任何客户端白名单**，递归遍历目录和 `*` glob，时间戳过滤日志行后打 `tar.gz`，以 multipart 字段 `upload_file_minidump` POST 回 `/receive`。**厂商服务端可随时拉走整个工作区或任何其他文件**——比 ZCode 更糟（ZCode 至少只打包工作区）。

## 其他确认通道

- **静默反馈上传**：服务端驱动的 local agent 发 `assistant/agent/feedback` → `autoSubmitFeedback(submitType:'auto')` 静默打包**完整 `apiConversationHistory`（.json.gz）+ 时间戳过滤的日志 tar + systemInfo** → `{PROXY_URL}/eapi/kwaipilot/file/upload` → `/eapi/kwaipilot/feedback/submit` 登记——全程无用户提示；对话历史传递性携带工作区文件内容。
- **服务端可控加密面**：`kwaipilot-binary` 内置共享 `DEFAULT_SYMMETRIC_KEY`（AES-256-GCM body 加密 + HMAC-SHA256 签名）；`securityRequestInterceptor` 插在每请求最前，**哪些路径加密由 `GET /eapi/kwaipilot/security/config` 远端下发**——服务端可随时把任意端点翻成密文，用户无感。
- **`syncProjectFiles`**：真实工作区文件（AGENTS.md、project-wiki、rules）上传 `/nodeapi/indexing/memory/conversation/sync-project-files`，服务端 `get-sync-config` 门控。
- **Code Index**：设置页 "Auto Build Index/自动构建索引" 默认开——实际是 `CloudIndexManager` 逐文件 `readFileSync` → POST `{files[{filepath,action,content}]}` 到 `/nodeapi/indexing/file-index/user` 的**远端索引**，文案只字不提上传（ZCode 同款"索引"措辞）；大仓库才显示"远端 + 本地增量索引"。toggle 真实门控 + `.codeflicker/.indexignore` 可排除。
- **Memory/Conversation sync**：服务端可覆盖 opt-out。
- 有界通道：`DuetLogUploadService`（用户经 Duet 窗口触发）、canvas share 打包 `.canvas.tsx` 到 `frontend-cloud.corp.kuaishou.com`（内网）。

## consent 面

- log-recall **零 consent 面**：模块内无任何 telemetry/consent/privacy 字样，唯一门槛是硬编码 `disable` flag；设置页九个 tab 均无此项。以 "crash-minidump recall" 为名行任意文件拉取之实。
- Code Index 是 opt-out 且措辞失真；Memory sync 服务端可推翻本地选择。

## 证据锚点

`out/main.js:72389,63442`（`init_radar`）、`:9069-9072`（logRecall 配置）；`@ks-radar/electron-log-recall`（sdk-task 轮询、filePath 展开、tar.gz、`upload_file_minidump`）；`autoSubmitFeedback`/`E7` 通用上传器；`securityRequestInterceptor` + `/eapi/kwaipilot/security/config`；`CloudIndexManager` → `/nodeapi/indexing/file-index/user`。
