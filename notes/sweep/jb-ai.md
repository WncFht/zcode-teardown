# JetBrains AI Assistant 262.10968.97 + Junie 262.2144.120 — clean（附遥测注意项）

**包/来源**: JetBrains Marketplace 插件 jar（Junie `org.jetbrains.junie` ej-262.2144.120；AI Assistant `com.intellij.ml.llm` 261/262 双构建，共 ~358 jar） · **解包**: `extracted/jb-ai/` · **覆盖**: acq + 7 族扫描 + 双镜 verify + 5 lane 全覆盖

## 结论

**无 ZCode 式隐藏工作区上传**。refute 镜判 refuted=true：全量 jar 常量池扫描确认索引写入契约（`IndexChunks`/`IndexCommitChunks`/`StoreSnapshot` → `/indexing/*`）**在客户端零调用者**——那是 JetBrains 服务端/企业索引器的协议面，客户端只发死了的 DTO 定义。evidence 镜也确认无可疑集塌缩后的隐藏管线。

## 排除依据

- **无凭证签发端点**：全部 TypedApi 枚举完，只有 JWT 交换（`/auth/jetbrains-jwt/provide-access`）和 JCP Bearer（`DaemonJcpAuthBroker`）；无 STS/presigned/PostObject/multipart 字符串或调用者
- **无打包上传**：session history blob、`BackendTaskStorageApi` 全部落到本地 `.matterhorn` 目录（java.nio.file.Files），是 IDE 前后端 RPC 非外发
- **云端 embedding 路径存在但三重门控默认关**：`LocalIndexRemoteModelEmbeddingsStorageManager` → `embedV2` → POST `/llm/embedding/v2`（Grazie gateway）确实携带文件文本，但仅服务 `class_bodies/symbol_bodies/text_chunks` 三个 indexId——注册表默认 false **且** `ml.llm.embeddings.force.disable.body.indexing=true` 硬压制，还要求 JBAI 激活完成
- `EmbArkSearchClient` 是读路径（依赖名/query 检索），声明特性

## 真实外发面（均披露）

- **Grazie LLM gateway**（`api.app.prod.grazie.aws.intellij.net` / CN `api.ai.jetbrains.com.cn`）：chat/complete/embedding/task 等，产品固有功能；`.aiignore` + `ContextPrivacyFilter` 链（还识别 `.cursorignore/.claudeignore/.codexignore` 等竞对文件）
- **JCP 分析镜像**：`JcpEventLogListenerProvider` 经 `statistic.eventLog.externalListenerProvider` 注册，`forceLoggingAlwaysEnabled()=true`（字节码 iconst_1）——**绕过 IDE 的"发送使用统计"consent**，把 allowlist 内 4 个 `llm.*` FUS 事件组 POST 到 `api.jetbrains.cloud/analytics/events/push`。门槛：Bearer + JWT org claims + 中国 IP 区域检查 + registry flag。元数据-only，但是默认开且无视 IDE 层 consent 的**次级遥测通道**——值得记录的隐私瑕疵
- Junie 数据分享：`MatterhornModelState.isDataSharingEnabled` **默认 true（opt-out）**，管 Junie 私有事件日志；EAP 构建会经 `ElectroJuniorToolWindowFactory` 助推平台层 consent

## 通道清单

| 通道                         | 内容               | 门槛                   | 判定               |
| ---------------------------- | ------------------ | ---------------------- | ------------------ |
| Grazie `/llm/*`              | prompt+ 文件上下文 | 登录/许可证            | 披露特性           |
| `/llm/embedding/v2`          | 文件文本           | 三重默认关             | 休眠代码           |
| JCP `/analytics/events/push` | FUS 事件元数据     | 默认开、绕 IDE consent | 隐藏遥测（窄口径） |
| `/indexing/*` 写契约         | —                  | 客户端零调用者         | 死代码             |
| `.matterhorn` 存储           | 会话快照           | 纯本地                 | —                  |

## 证据锚点

`model-indexing`/`grazie.cloud` jar 的 `IndexingAPI` DTO；`LocalIndexRemoteModelEmbeddingsStorageManager`/`AiIgnoreManager`/`ContextPrivacyFilterChecker`；`JcpEventLogListenerProvider`（两插件 plugin.xml 均注册）。digest: `evidence/jb-ai/journal-digest.json`
