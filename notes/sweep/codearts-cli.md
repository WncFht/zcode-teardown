# CodeArts CLI 26.9.3（华为）— 披露特性 + 严重卫生问题

**包**: `codearts-cli` · **解包**: `extracted/codearts-cli` · **覆盖**: 全链（acq + 7 扫描 + 双镜 verify + 5 lane）

## 结论

**非隐藏上传——但卫生问题严重。** 核心管线是 UI 可见的 "CodeBase" 远端索引特性（`/codebase/init` 斜杠命令 + toast 提示 + localhost HTTP 路由，`DISABLE_CODEBASE_INDEX` opt-out 有效）。链路本身是 ZCode 三段式：全仓扫描 → 纯 zlib zip → `POST /codebaseservice/v1/codebases/{id}/tasks/{id}/obs-upload-url` 服务端凭证 → PUT 直传 OBS → `createCodeBaseTask` 注册（发**绝对路径**作 repo_url + branch + commit）。

## 卫生问题（比"隐藏"更值得告警）

- **`.env*` 被明确白名单进 zip**（`.env/.env.local/.env.development/.env.production`，≤300KB）——密钥文件主动打包上云。
- **全局关 TLS 校验**：launcher 导 `NODE_TLS_REJECT_UNAUTHORIZED=0`，且每条上传路径 `rejectUnauthorized:false`——任何中间人可劫持 presigned PUT 和凭证签发。
- `autoIndexing` 默认 true 且为死代码（从不读取）；5 分钟调度器只在显式 `index("start")` + 服务端 `isGrant` 后存在。
- 服务端 grant 门：`/codebaseservice/v1/codebases/access-token/check-authorize` 需 `result.isGrant`（与 ZCode 服务端签发同构）。
- ShareNext（opencode 派生）第二通道：`session_diff` 文件 diff + messages 同步到 `share:"auto"` 配置的 host（默认 opncd.ai），opt-in。

## 通道清单

| 通道                                | 内容                               | 门槛                                 |
| ----------------------------------- | ---------------------------------- | ------------------------------------ |
| `/obs-upload-url` → OBS PUT         | 全仓 zip（含 `.env*`）             | 显式 `/codebase/init` + 服务端 grant |
| `/codebases/{id}/tasks/{id}/index`  | 单文件 multipart（10MB worker 块） | 同上                                 |
| `embedding_files_*.txt`             | 已索引文件清单二次上传             | 同上                                 |
| ShareNext `/api/share`              | session diff + messages            | `share:"auto"` opt-in                |
| `CodeSemanticSearch` + tool-metrics | 每次查询的远端搜索外发             | 特性固有                             |

## 证据锚点

`extracted/codearts-cli` `chunk-tnyv5qyj.js`：`scanAllFiles`/`visitFile`（DEFAULT_EXCLUDES + `.codeartsdoer/.codebaseignore` + M8 白名单含 `.env*`）、`compressAndUploadFile`（zlib-9 zip → `.codeartsdoer/temp/`）、`getObsUploadUrl`、`createCodeBaseTask`、`runCodeBaseTask?mode=FULL`、`uploadBySingleFile`/`indexForSingleFile`；launcher `NODE_TLS_REJECT_UNAUTHORIZED=0`。
