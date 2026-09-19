# ZCode 逆向语料仓

ZCode IDE linux-x64 全版本逆向分析：55 个发行版（v2.2.0–v3.12.3）的下载、解包、指纹快照、逐版差异与分析笔记。核心交付物为[工作区快照上传机制分析报告](notes/2026-09-19-工作区快照上传.pdf)（25 页）——基于全部 55 个版本的端到端逆向，覆盖捕获范围、加密管线、同意门演化与披露审计。

[![报告封面](notes/assets/pdf-cover-01.png)](notes/2026-09-19-工作区快照上传.pdf)

## 快照上传管线

ZCode 在每次发送 prompt 时将整个工作区打包加密上传至厂商服务端。v3.1.0 起包含完整 `.git/` 目录（remote URL token、reflog、pack 文件全收），v3.11.1 起追加全局配置与 prompt 附件。上传经 AES-256-CTR 加密 + RSA-OAEP-SHA256 密钥包装，通过阿里云 OSS PostObject 直传。

![端到端管线](notes/assets/snapshot-upload-pipeline.svg)

同意门经三阶段演化：v2.3.0 诚实的 opt-in → v2.6.0 静默翻转为 opt-out → v3.1.0 开关移出管线成为纯装饰。此后是否上传只由登录态、workspace 类型与服务端 credential 签发决定。全部 55 个版本的 UI 从未披露此行为。

![同意门三阶段](notes/assets/snapshot-upload-consent.svg)

## 仓库结构

| 路径          | 内容                                                             |
| ------------- | ---------------------------------------------------------------- |
| `manifest/`   | 版本清单与来源记账（55/58 版，3 版 CDN 撤下不可恢复）            |
| `signatures/` | 每版签名快照（models/endpoints/feature_flags/env_vars 等 10 类） |
| `notes/`      | 分析笔记（12 篇 markdown + 1 篇 LaTeX 报告 + 图表资源）          |
| `tools/`      | 管道脚本（fetch → unpack → manifest → commit → signature）       |
| `docs/`       | 任务复盘                                                         |

不入库的可再生产出：`installers/`、`extracted/`、`repo/`（bare git 语料库）、`diffs/`、`tmp/`。

## 分析笔记

### 版本线

- [2.x 系列](notes/line-2.x.md)——2.2.0→2.13.0，五运行时堆栈时代
- [3.1.x](notes/line-3.1.md)——glm 引擎首秀
- [3.2–3.3](notes/line-3.2-3.3.md)——三代签名器交叠
- [3.4–3.6](notes/line-3.4-3.6.md)——intent 调度器与全链 abort
- [3.7–3.8](notes/line-3.7-3.8.md)——断档期的 AppImage 恢复
- [3.9–3.12](notes/line-3.9-3.12.md)——extraManifest 与磁盘配额
- [断代分析](notes/epoch-gap.md)——2.13.0→3.1.0 引擎更换

### 专题

- [引擎架构](notes/engine.md)——agent 引擎组织与演化
- [协议面](notes/protocol.md)——ACP / IPC / endpoints / proxy
- [运行时](notes/runtime.md)——Electron 宿主与 bundled tools
- [扩展系统](notes/extensions.md)——plugins / skills / commands / native modules
- [外部宣称](notes/community-intel.md)——官方渠道与第三方社区的宣称档案

### 快照上传报告

- [LaTeX 源](notes/2026-09-19-工作区快照上传.tex) → [PDF](notes/2026-09-19-工作区快照上传.pdf)（25 页，A4）
- [Markdown 源稿](notes/2026-09-19-工作区快照上传.md)
- [28 指标 × 55 版矩阵](notes/snapshot-tracking.json)
- 图表：[管线](notes/assets/snapshot-upload-pipeline.svg) · [时间线](notes/assets/snapshot-upload-timeline.svg) · [同意门](notes/assets/snapshot-upload-consent.svg) · [可见性矩阵](notes/assets/snapshot-upload-visibility.svg)

## 管道

五步流水线，每步带 `[lane]` 参数供并行作业对账：

```bash
tools/fetch.sh <ver> [lane]            # CDN 分块下载 + 校验（24MiB chunk，限流重试）
tools/unpack.sh <ver> [lane]           # .deb → extracted/<ver>/（含 asar 解包）
tools/tree_manifest.py <ver> [lane]    # 全树 sha256 + engine/tools/host 指纹
tools/commit_version.sh <ver> [lane]   # 快照进 repo/ git + v<ver> tag
tools/extract_signatures.py <ver>      # 10 类签名 → signatures/<ver>.json
```

`repo/` 是独立 bare git 仓，存各版本 extracted 树的 `v<ver>` tag（55 个）。版本间差异用 `git -C repo diff vA vB`，不要去翻 `extracted/` 手动 diff。

### 语料覆盖

58 个已发布版本中 55 个完成全链入库；3.7.1/3.7.2/3.7.4 被 CDN rolling-pull 撤下，按 `published-but-unrecoverable` 记账（保留 size/sha512/releaseDate 证据）。15 版为替代格式恢复（win-exe×5、AppImage×9、mac dmg×1），`manifest/provenance.json` 逐版记账。
