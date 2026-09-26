# aiXcoder 5.3.0（VS Code 扩展）— 隐藏上传 + 服务端任意文件拉取

**包**: `aixcoder-plugin.aixcoder`（VS Code Marketplace，"aiXcoder Code Completer"）· **解包**: `extracted/aixcoder` · **覆盖**: 全链（acq + 7 扫描 + 双镜 verify + 5 lane）

## 结论

**隐藏上传确认。** 登录后有三条独立的内容外发通道，全部明文 JSON POST 到 `api.aixcoder.com`（无加密、无 OSS/STS——机制与 ZCode 不同，但同属"不可见的工作区文件内容外发"）。最恶劣的一条是**服务端驱动的文件拉取**：`/predict` 响应里的 `reference_files_needed` 字段可让服务端点名任意路径（含 `../` 目录穿越），客户端 `readFileSync` 后原样上传。

## 上传机制

### 通道 A — `/reference_files_update`（批量文件上传）

- `uploadFiles()` POST `{reference_files:[{file_path, code_string=完整文件文本, md5, ...}]}`，唯一门槛是 `globalState.loginInfo`（无上传/privacy 设置项）。
- 触发：激活时 `initTabs` 上传**所有打开的 tab**；编辑器焦点离开时上传失焦文件；`/predict` 响应的 `reference_files_needed` → `preUploadFiles`（服务端拉取）。
- **服务端拉取无防护**：字符串分支把服务端给的 key 直接拼到 projectRoot 的父目录上 `readFileSync`，**无后缀白名单、无路径规范化**——`proj/../.ssh/id_rsa` 可穿。上限 `limitSize` 由服务端 `/open/v1/reference/conf` 自己下发（本 build 默认 10KB/文件+10KB/批，且 `getLimitSize` 是死代码）。
- 证据：`extension/dist/extension.js` `uploadFiles`/`initTabs`/`preUploadFiles`（minified line 2；pretty 副本 12883–12964, 19454–19515）

### 通道 B — `/predict`（补全时的持续外发）

- 每次补全 POST `code_string`（光标前全文差分）、`later_code`（**反转发送——自我抵消的伪混淆**）、`abs_file_path`（绝对路径）、`giturl=base64(.git/config remote URL)`（带 token 的 remote 会原样泄漏）、`abs_git_dir`。

### 通道 C — 捆绑 Go 守护进程 `stat-code-behavior`

- 扩展激活时无条件把 `ext/stat/statCode{LinuxAmd,DarwinAmd,DarwinArm,Windows.exe}` 拷到 `~/aiXcoder/support/` 并以 `-listener=true -upload=true -serverUrl=<endpoint> -intervalTime=300` 启动。
- 每次 `onDidChangeTextDocument` 经 stdin 喂 JSON `{filename=绝对路径, text=编辑后全文, oldStr, newStr, adoptText}`；守护进程缓存到 `code_log_detail` 文件、300s 一拍上传 `/api/collectCodeLogDetail` 等，门槛由服务端 `/api/codeLogThreshold` 下发。

### 其他

`/chat`/`/chat_continue` 带 `file_text` 全文 + `<ref_list>` 内嵌已上传文件全文；`commit_message` 附完整 `git diff HEAD`；`/api/chat/history/*` 同步完整聊天记录；`/unify/prompt/*` 同步 prompt 库。

## consent 面

- `package.json` 仅 5 个设置键，**无一描述上传/索引/遥测**；唯一关闭方式是未文档化的 magic URL 参数 `noReferenceFiles`（写进 `additionalParameters`）。
- 唯一的遥测提示串 `aiXcoder.askedTelemetry` 是死代码，`aiXcoder.enableTelemetry` 已不是设置项（changelog 显示旧版有、被移除）。
- 96 条 i18n / readme / webview 全文无上传披露；最近似的是 readme 的 "analyzing other files within the same project" 和 prompt 编辑器的 "Codebase 自动检索"。
- `startPredict` 在未登录时强制弹登录——登录即等于开上传。

## 通道清单

| 端点                                      | 内容                              | 门槛                       |
| ----------------------------------------- | --------------------------------- | -------------------------- |
| `/reference_files_update`                 | 文件全文（tab 扫描 + 服务端拉取） | 登录                       |
| `/predict`、`/cont_predict`               | 编辑中文件差分全文 + git 信息     | 登录                       |
| `/chat*`、`/advance/bugfix`               | 当前文件全文 + ref_list + diff    | 用户触发                   |
| `/api/collectCodeLogDetail` 等            | 守护进程：每次编辑全文快照        | 登录（守护进程无条件启动） |
| `/api/chat/history/*`                     | 完整聊天转录                      | 登录                       |
| `/api/sensitiveWord/report`               | 回显被判敏感的字段                | 服务端标记后               |
| `/unify/prompt/*`、`/unify/feedback/chat` | prompt 库、反馈                   | 登录                       |

## 备注

- refute 镜杀掉了部分夸大项：`**/*` watcher、`findMinN` 五邻居上传、`initFilesTree` 全树遍历在 5.3.0 是死代码；daemon 的 zip/tar writer 能力未证实（flate 符号来自解码器）；`getLimitSize` 未接线。
- 网端可经 `aiXcoder.additionalParameters`/`enterpriseConfig.txt` 重定向到私有 endpoint（企业版场景）；默认 vendor `api.aixcoder.com`。
