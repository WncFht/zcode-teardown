# 隐藏上传管线引入时间线

对 8 个已确认隐藏上传的目标做版本考古：逐版本下载历史安装包 → 解包 → `rg -a -F` 扫特征字面量，二分定位签名首现版本。
审计日期 2026-09；各目标明细见对应 `<target>.md` 的"版本考古"节，本表仅横向汇总。

| 目标                                  | 引入版本                                                     | 引入日期                 | 默认开启时点                                                                     | 备注                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [Trae intl](trae-intl.md)             | ≤1.0.5431（最老可获取构建即阳性）                            | ≤2025-01-20              | 构建即常开（endpoint 硬编码 product.json）；唯一登录门 ≤1.0.12894 移除           | 早于可获取历史，很可能早于公开发布；后历 4 阶段演化（区域门/bootConfig 端点/SSH 回拉/ToB 伪装反馈单）           |
| [CodeBuddy IDE](codebuddy-ide.md)     | codebase lane ≤0.1.8.2412962；完整签名 4.3.3.18223695        | ≤2025-07-22 / 2026-01-26 | 始终服务端 flag（productFeatures → 4.4.1 起 llm-data），本地无默认               | codebase lane 早于可获取历史；FileHistoryTracker lane 钉住 4.3.3；最新 5.6.2 实现消失仅剩 flag 声明             |
| [CodeBuddy CLI](codebuddy-cli.md)     | 1.25.0-next.bd7d324.20251107（未列表 nightly）；列表内 2.0.0 | 2025-11-07               | 从不本地默认：纯服务端推送 `config.log.upload`                                   | 引入时无 enabled 字段（truthy 对象即开）；2.97.4（2026-05-21）起 enabled+allowedEnvironments+任务队列+HMAC 回报 |
| [Qoder](qoder.md)                     | 0.3.0（daemon cosy 0.3.0，build 2026-01-19）                 | 2026-01-19               | 服务端 flag `upload.missing.files.enabled`；伴随条件 autoIndex 本地默认开        | 上传基础设施（daemon/端点/back_flow）早于可获取历史；EnsureMtreeFilesUploaded 二次边界 (1.20.1,1.31.0]          |
| [Cursor](cursor.md)                   | 字面量 2.5.17；功能接线 2.6.11                               | 2026-02-17 / 2026-03-03  | 从未本地默认：`codebase_telemetry_v2` 服务端 flag + privacy enum==4              | 2.5.17–2.5.26 仅 proto schema（零调用者）；Lane B `captureAndSendDebuggingData` 仅收敛 (0.44.9,1.0.1]           |
| [Kiro](kiro.md)                       | 0.12.155                                                     | 2026-05-06               | 1.0.52 起覆盖桌面端（区域白名单）；1.0.116 起 endpoint 自动派生=白名单区域默认开 | 三段式放宽：sandbox→+kiro-ide→去 env/client 检查；全程无用户开关                                                |
| [Copilot Chat](copilot-chat.md)       | 0.48.1（首个**可获取**携带版）                               | 2026-05-15               | 从未：default false，onExp 隐藏设置服务端可远程翻转                              | 落地即完全体；真正首发可能是窗口内不可获取的 0.46/0.47 预发布                                                   |
| [MiniMax Desktop](minimax-desktop.md) | 3.0.58                                                       | 2026-08-04               | 引入即默认开：`enabled:true` 硬编码，仅 packaged+登录门槛                        | eval capture 注入既有 `@mavis/local-runtime`（模块 3.0.53 已有）；3.0.62 起独立 snapshot 端点                   |

## 模式

- **首发即带 vs 后装**：Trae、Qoder 上传基础设施、CodeBuddy IDE codebase lane 在**最老可获取构建中已存在**，无法判定是否 v1 即有；其余 5 条（Kiro/Copilot/Cursor/CodeBuddy CLI/FileHistory lane/MiniMax）均为成熟版本中途引入。
- **schema/宿主先行**：Cursor 先发死 proto 描述（2.5.17 零调用者）隔约两周才接线（2.6.11）；MiniMax 先发行宿主模块（3.0.53）再注入 eval capture（3.0.58）。
- **门槛形态**：硬编码常开仅 MiniMax（`enabled:true`）与 Trae（endpoint 硬编码，后改服务端下发）；其余全部服务端侧——feature flag（Qoder/CodeBuddy IDE/Cursor）、服务端推送配置（CodeBuddy CLI）、onExp 实验变量（Copilot）、编译期环境/区域检查（Kiro）。**无一目标在引入时带 consent 面**。
- **演化方向不一**：Kiro 三段放宽至默认开、Trae 移除登录门；CodeBuddy CLI 反向收紧（truthy 对象→显式 enabled+环境白名单+HMAC 回报）；Cursor 后期加子 flag 与策略 RPC。

## 覆盖缺口

- **Copilot Chat**：marketplace 1125 版列表在 0.45.1→0.48.1 间零条目；0.45.2/0.46.0/0.47.0/0.48.0 及 3 个日期预发布号共 7 探针全 404。
- **CodeBuddy CLI**：708 条列表内边界 fadc360→2.0.0；真边界靠未列表 nightly 钉到 2025-11-07 04:06→10:06Z 的 6h 窗口。
- **CodeBuddy IDE**：0.1.8 即首个公开构建（Wayback 佐证），codebase lane 无 absent 版本可钉；aiide/workbuddy 双产品线版本号不可线性比较，按发布日排序。
- **Cursor**：Lane B 边界 (0.44.9,1.0.1] 内 idx 41–79（0.44.10→1.0.0）未探测（下载上限）；列表最新 3.21.18 未下载（实测 3.21.16）。
- **Kiro**：边界两侧相邻（0.11.133/0.12.155），中间 0.12.x 构建号未发布（HEAD 403）；阶段②③只收敛到 1.0.0–1.0.52 与 1.0.89–1.0.116 区间。
- **Qoder**：0.2.29→0.3.0 间无版本，主边界精确；EMU 次边界 (1.20.1,1.31.0] 约 19 版未细分；consent flag `data_policy_sign_status` 仅收敛 (pre-0.1.15,0.2.15]；qoder-app 线与 qoderwake 未测。
- **Trae intl**：absent 版本不存在；stage-1→2 由 dmg 夹 1.0.26261→1.0.27215（2025-12-17→2026-01-03），其间 win32 Inno 构建 1.0.26850/26989/27216 无法解包。
- **MiniMax**：边界相邻（3.0.57/3.0.58）已最紧；dmg-only 的 3.0.20–3.0.23/3.0.41/3.0.71 未探测（均在边界区外）。
