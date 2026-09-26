# PiecesOS 12.6.2 + Pieces for Developers 6.1.0 — 用户触发合规（备份为披露特性；注意备份内容极宽）

**包/来源**: snapcraft `pieces-os_12.6.2_rev119_amd64.snap`（Dart AOT `lib/libapp.so`）+ 配套 UI snap · **解包**: `extracted/pieces-os/` · **覆盖**: acq + 7 族扫描 + 双镜 verify + 5 lane；Dart AOT 经 strings/dart 包路径恢复分析

## 结论

技术骨架与 ZCode 同构（打包内部库 → 分块上传厂商基建 → register + 分析事件），但 consent 层相反：**用户主动点击、诚实标注的 "Backup & Restore" 特性**，非隐藏每轮外发。refute 镜判 refuted=true。

## 机制

- 触发：仅本地路由 `POST /backups/create[/streamed][/websocket]`，由桌面端 "Backup & Restore Data" 按钮调用；**无定时/自动/on-exit 触发器**（周期任务只有 persona-gen、清理、更新、connector 同步）
- 打包：`InternalDatabaseBackup` 快照 Couchbase 内部库 → `zipDirectory`（package:archive ZipFileEncoder）；`application/vnd.dece.zip`
- 内容（很宽）：~90 个内部 store——assets/fragments（用户保存的代码片段+**完整文件字节**）、conversations/messages/memories（完整对话+LTM 记忆）、workstreamEvents（LTM 自动捕获：**OCR 全屏文本**、剪贴板、音频转写、浏览历史）、websites/anchors、files 等
- 外发：分块 PUT 到 per-user pod `*.pieces.cloud`（Cloudflare 前置；分配经 `allocation-server-*.a.run.app`）；`registerBlobUpload` 注册；恢复反向拉取 `database_from_restore.zip`
- 门槛：手动点击 → 登录（Descope OIDC → Firebase custom token → idToken Bearer）→ 个人云分配 → **服务端推送 flag** `InstanceConfiguration.externalCloud.cloudBackupCreation.enabled` + `/user/has_feature_access`（org 可禁）——与 ZCode 服务端授权同形，但只解锁一个广告特性
- 无加密上传载荷：TLS + HMAC 请求签名（`x-request-signature`）；CBL 数据库本身静态加密。ZipEncryptionMode 代码可达但无密码绑定到 backup 路径

## consent 面

按钮即唯一入口；文案诚实（"stored in your personal Pieces cloud"）；20 个备份云端上限；无隐藏自动备份。发现的周期性任务均与备份无关。

## 其他通道

| 通道                                                                           | 内容                         | 门槛              | 判定                       |
| ------------------------------------------------------------------------------ | ---------------------------- | ----------------- | -------------------------- |
| `/shares/create` + linkify → `code.pieces.app`                                 | 资产内容 + 元数据            | 用户 share + 登录 | 披露特性                   |
| GitHub gist 代理                                                               | 经个人云 pod 中转            | 用户操作          | 披露特性                   |
| `api.runtime.dev/ocr`                                                          | 图片/文件 OCR（内嵌 apikey） | 资产创建特性      | 披露特性（第三方处理注意） |
| Segment `api.segment.io/v1/track`（硬编码 write key）、Sentry、Mixpanel、ipify | 事件元数据                   | 默认开            | 遥测                       |

## 证据锚点

`os_server/backups_internal_server.dart`（lib 4787111474）、`utilities/create_zip_from_directory.dart`、`internal_database_backup.dart`（lib 2625136645）、`guarded_core_openapi` backups_api、`backup_restore_segment_event.dart`；endpoint 字串 `[UPLOAD] Uploading chunk`、`Forbidden: ...cloud backup creation feature`。digest: `evidence/pieces-os/journal-digest.json`
