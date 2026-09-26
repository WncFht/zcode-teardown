# CodeArts IDE (华为 CodeArts Agent) 26.9.102 — 判定：ZCode 同构 OBS 管线，但属 UI 可见特性（披露失真 + TLS 校验被关）

**包/来源**: 官方 CDN deb `codearts-agent-linux-arm64-26.9.102-b8b3886`（agentkernelServer 内嵌 JS 未 strip）· **解包**: `extracted/codearts-ide` · **覆盖**: acq+7scan+ 双镜 verify+5lane

## 结论

`agentkernelServer` 里嵌着完整的 capture→pack→credential→upload→register 链：workspace 扫描 → archiver zlib-9 zip → `POST /codebaseservice/v1/codebases/.../obs-upload-url` 拿华为 OBS presigned URL → 裸 PUT 直传 → `tasks/{id}/start` 注册 → `obs-download-url` 拉回 embedding 产物——**与 ZCode 的 OSS 管线逐段对应**。差别：(1) 它是有专用管理 UI 的"云端索引"特性（CodeBaseView 面板有进度/文件列表/暂停/删除），不是纯隐藏管线；(2) 个人路径在扩展激活时**无条件初始化**、每 5min 自动增量上传（默认开）；(3) **上传连接全程 `rejectUnauthorized:false`**（TLS 校验关闭，含 `NODE_TLS_REJECT_UNAUTHORIZED=0` fallback）——明文 zip + 关校验 = 中间人可读。

## 上传机制

三条腿共用同一 OBS presign→PUT→register 骨架：

- **全量 >1000 文件**: `/v2/index` → `createCodeBaseTask`（`type:PERSONAL` + repo_url/branch/commit/languages）→ `XX.compressAndUploadFile` 把全部非忽略文件 zip 到 `<projectRoot>/temp/{uuid}.zip` → `obs-upload-url` → `wZ()` PUT `application/octet-stream`（`rejectUnauthorized:false`）→ `tasks/{id}/start?mode=FULL`
- **全量 ≤1000 文件**: `indexForSingleFile` 逐文件 multipart `{file_path, file=<全文>, progress}` POST `/tasks/{id}/index`（JX worker 10MB 分片断点续传，`upload-progress.json`）
- **增量（每 5min 默认开）**: `pollingAutoUpdateCodebase` → `/v2/increment/index` → git diff/Merkle 比对 → `diff-<uuid>.zip`（≤1000 变更文件）→ `personal/obs-upload-url` → PUT → `startEmbedding` → 轮询拉回 `incremental_embedded_{uuid}.zip`
- **范围**: 扩展名白名单 `M8` **显式包含 `.env`/`.env.local`/`.env.development`/`.env.production`**——secret 文件在白名单内，只靠 `.gitignore`/`.codebaseignore` 挡
- **双门槛分化**: CodeHub 团队路径要显式 OAuth 授权（`isGrant` 轮询）；**个人路径不要**——`initializeCodeBase()` 激活即跑 + 登录后再跑，服务端 `codebaseEnable` flag 只挡内网版不挡商业版
- **vendor host**: `snap-access.cn-north-4.myhuaweicloud.com`（CN）/ `ap-southeast-1`（intl）；OBS bucket `*-turbocontext-obs.obs.*.myhuaweicloud.com`

## consent 面

- 面板文案相对诚实："Cloud Index / 云端索引"、"Remote Git Repository — Link a CodeHub repository"、"CodeHub Authorization — Enabling this will allow access to your code repositories"、"Auto-update — Automatically create and update cloud indexes for code repositories with fewer than 50,000 files"
- **但**：从不明说文件内容会 zip 后 PUT 到 OBS 对象存储、按文件计量；通用 Service Statement 只含糊说 "may collect and process your code context"
- 该功能**不在** VS Code 原生设置里（contributes 无对应 key），只在 chat webview 内的面板
- `localIndexAutoUpdate` 开关默认 ON

## 通道清单

| 通道                       | 载荷                                        | 门槛                              | 判定                                          |
| -------------------------- | ------------------------------------------- | --------------------------------- | --------------------------------------------- |
| 全量/增量索引 → OBS        | workspace zip（含 .env 类，若未 gitignore） | 个人路径无 OAuth 门，默认自动更新 | 披露失真（UI 可见但不说上传细节；TLS 校验关） |
| 单文件 `/tasks/{id}/index` | 文件全文 multipart                          | 同上                              | 披露失真                                      |
| CodeHub 团队索引           | 全部 repo                                   | 显式 OAuth grant                  | 合规（真实 consent）                          |
| 日志/反馈图 OBS 上传       | IDE 日志 + 反馈图                           | 用户触发反馈 dialog               | 合规                                          |
| benefit/gateway HMAC       | token/余额                                  | 标准 SDK 签名                     | 合规                                          |

## 证据锚点

- `agentkernelServer-linux-arm64`（内嵌 JS）— `createZipFile`、`compressAndUploadFile`、`getObsUploadUrl`、`wZ()` PUT、`indexForSingleFile`、`pollingAutoUpdateCodebase`、`M8` 扩展名白名单
- `out/extension.js` — `HcCodeBaseService.codebaseIndex`、激活即 `initializeCodeBase()`、`rejectUnauthorized:false` https.Agent
- `dist/assets/CodeBaseView-*.js` — 云端索引管理面板文案
- vendor host：`snap-access.cn-north-4.myhuaweicloud.com`、`*.myhuaweicloud.com` OBS
