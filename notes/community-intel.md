# 外部宣称档案（Community Intel）

> Lane C12 产出。汇总 ZCode 官方渠道（CDN `latest.yml` releaseNotes、官网 changelog、官方文档、feedback 仓、官方知乎）与第三方社区（HN、博客、先行逆向项目）的全部**对外宣称**，供各 lane 对照二进制实测（"宣称 vs 实测"）。
>
> 宣称一律不等于事实。每条给出来源脚注；"待验证"列给出二进制侧的检查钩子。

## 来源与方法

- **CDN `latest.yml`**：对全部 77 个已发现版本逐版抓取（linux 58 版全量 + 3.0.x/1.x/2.0/2.1 补全），内含 `releaseDate` 与中英双语 `releaseNotes`。这是**唯一覆盖全版本**的官方宣称源；原始文件经逐版抓取存档，解析结果汇总为结构化 JSON[^yml]。**⚠️ 2026-09-19 起该 feed 已 CDN 级撤除**——`releases/<ver>/latest{,-linux}.yml` 对全部版本（含此前可取的存档版）均返回 404，存档抓取成绝版；此后新版的 `releaseDate`/sha512/releaseNotes 无官方渠道可考，只能取 deb HEAD 元数据。
- **官网 changelog**（`zcode.z.ai/cn/changelog`）：仅列 **8 个版本**（3.8.1–3.12.3），与 yml 文本一致[^site-changelog]。
- **官方文档站**：welcome/configuration/agents/plugin/skill 等 26 页[^docs]。
- **feedback 仓** `zai-org/feedback`：README 标签体系 + issues（564 条）[^feedback]。
- **官方知乎**：智谱官号升级公告（Goal/Subagents/Remote Control/闲时任务发布）[^zhihu]。
- **第三方**：vibe-coding-labs/zcode-reverse-engineer（3.0.1+2.13.0 逆向）[^vibe]、pi-zcode-provider（3.10.1 逆向）[^pi]、multica issue（app-server 协议探测）[^multica]、HN 两帖[^hn]、若干中文博客[^ccino][^eesel][^80aj][^chenblog]。

## 版本宣称总表

`releaseDate` 取自 yml；宣称内容压缩自官方 zh releaseNotes[^yml]。标 ★ 为官网 changelog 也列出的版本；标 ⚠ 为隐藏构建（changelog 未单列、yml 存在）。3.0.0/3.0.1 无 linux 包（重写断档期，仅 mac/win）[^manifest]。

### 1.x/2.0/2.1（linux 未发布，仅作背景）

| 版本        | 日期     | 官方宣称要点                                                              |
| ----------- | -------- | ------------------------------------------------------------------------- |
| 1.0.0       | 04-20    | 首发：从"旧版 Claude"迁移数据、MCP 迁移、SSH 远程工作区、自定义模型提供商 |
| 1.1.0–1.4.0 | 04-21~24 | 助手切换、应用内 git 提交、内置 CLI 工具管理、模型服务切换、提示词优化    |
| 1.5.0–1.7.0 | 04-27~29 | 文件树、代码高亮、上下文压缩按钮、**子智能体创建/管理**、常用命令管理     |
| 1.8.0       | 04-30    | **飞书/Lark/微信机器人**、任务实时同步                                    |
| 1.9.0       | 05-07    | 工作流调试器、Memory（软链/编辑）、**hooks+memory+OutputStyle 配置界面**  |
| 1.10.0      | 05-08    | 多终端、进程监控面板、GLM 工具调用修复                                    |
| 2.0.0–2.1.1 | 05-11~13 | SSH 远程资源下载、可视化活动面板、AI 主动提问（AskUser）                  |

### 2.2–2.13（linux 语料起点，gemini-cli fork 时代）

| 版本   | 日期  | 官方宣称要点                                                                                                    | 待验证钩子                                                    |
| ------ | ----- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 2.2.0  | 05-14 | **Linux 平台首发**；zcode agent `/goal` 命令；代码变更对比视图；@子代理                                         | signatures 里应有 goal 命令、gemini 引擎                      |
| 2.3.0  | 05-16 | **编码套餐（Coding Plan）支持首发**：套餐/额度/价格展示；用量与计费入口；浏览器元素上下文选择；代理运行环境升级 | plans 类别应出现套餐相关串                                    |
| 2.3.1  | 05-17 | 修复：自定义模型被重置、推理强度不生效                                                                          | —                                                             |
| 2.4.0  | 05-18 | SSH 远程资源包可选；助手入口与可选服务更新                                                                      | —                                                             |
| 2.4.1  | 05-19 | 修复：任务中切换模型提供方                                                                                      | —                                                             |
| 2.5.0  | 05-19 | 长会话加载优化；侧边栏用量/剩余额度；Markdown 平滑流式显示；**禁止部分工具自动更新**                            | —                                                             |
| 2.6.0  | 05-20 | Claude `/clear` 命令；Git 状态自动刷新；Mermaid 渲染；**新增"避免 OpenCode 被自动更新"配置**                    | 2.x 时代已含 OpenCode 字样——在 gemini fork 里找 OpenCode 痕迹 |
| 2.7.0  | 05-21 | **新增 Gemini 和 OpenCode 相关命令来源**；应用内问题反馈；侧边栏按日期分组                                      | 确认 2.x 多 agent 框架命令集成面                              |
| 2.8.0  | 05-22 | 白板附件；终端链接内置浏览器打开；远程斜杠命令可见                                                              | —                                                             |
| 2.9.0  | 05-25 | **应用内开通/升级 Coding Plan**；订阅验证；海外支付 + 银行卡 + 扫码支付                                         | billing/payment 端点签名                                      |
| 2.10.0 | 05-26 | 代码评论标记悬停提示；对话搜索                                                                                  | —                                                             |
| 2.11.0 | 05-27 | 反馈表单按类型预填、自动带本地时间                                                                              | —                                                             |
| 2.12.0 | 05-28 | 删除已归档任务；编码方案续费状态；跨设备会话同步增强                                                            | —                                                             |
| 2.13.0 | 05-29 | **通用技能（universal skills）支持**；对话内 Markdown 图片                                                      | skills 类别；2.x 终点版本                                     |

### 3.0 断档期（无 linux 包）

| 版本  | 日期  | 官方宣称要点                                                                                                                                                                              | 待验证钩子              |
| ----- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 3.0.0 | 06-13 | **重写版**：工作区分组视图、分支切换与 Git 提交关系图、仓库 Wiki、**插件管理入口 + 导入外部命令/技能/插件**、模型与提供方管理全面升级、试用/套餐入口、网络代理、远程/移动端联动、调用统计 | mac 包补断点（C7 lane） |
| 3.0.1 | 06-14 | ZCode V2 历史会话恢复；登录页获取 API Key 入口；远程目录信息增强                                                                                                                          | —                       |

### 3.1–3.3（linux 回归 + 高频修复期）

| 版本    | 日期  | 官方宣称要点                                                                                                       | 待验证钩子                                    |
| ------- | ----- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| 3.1.0   | 06-15 | **linux 回归**；产品协议查看/编辑；**WSL 远程工作区**；技能导入；日志导出；代码评审文件快捷操作                    | WSL 相关代码路径                              |
| 3.1.1   | 06-16 | Windows 关窗最小化托盘；应用内 HTML 预览；提交信息跟随系统语言；旧记忆延续到新智能体；反馈工单号可见               | —                                             |
| 3.1.2   | 06-17 | 代理证书/直连地址分设；Windows 命令行环境可选；文件夹菜单打开；**修复 sse/http MCP header 传递不生效**             | MCP header 传输实现                           |
| 3.1.3   | 06-23 | 新建任务入当前分组；反馈可附截图；**团队版购买入口**；恢复飞书渠道入口                                             | 团队套餐串                                    |
| 3.2.0   | 06-29 | **插件管理与自定义插件 beta**；通用型子智能体（自定义读写权限与模型）；长文本粘贴转附件；**计划模式**退出恢复      | plugin manifest、plan mode、subagent 权限模型 |
| 3.2.1   | 06-30 | 修复：linux 更新源错误、Mermaid 崩溃、知识库状态、技能扫描卡顿                                                     | —                                             |
| 3.2.2   | 07-01 | 内置插件可更新/卸载；文件回退安全摘要                                                                              | 内置插件清单                                  |
| 3.2.3   | 07-02 | **工作区 MCP server 默认可信**；`$zcode-configuration-guide` 技能；修复 Anthropic API Key 认证失败、Linux 自动更新 | MCP trust 默认值、内置技能清单                |
| 3.2.4   | 07-03 | 斜杠菜单恢复技能入口；重试策略优化                                                                                 | —                                             |
| 3.2.5   | 07-03 | **用户级技能 SSH 远程同步**                                                                                        | 远程同步机制（对 C11）                        |
| 3.3.0   | 07-07 | 硬件加速开关；**本地 MCP 配置同步到 SSH 远程**；**团队套餐登录**；Markdown 表格导出/预览                           | —                                             |
| 3.3.1   | 07-08 | 修复：会话提示已有任务运行                                                                                         | —                                             |
| 3.3.2   | 07-08 | **本地开发场景 MCP OAuth 授权**；⚠️ 官方致歉：3.3.0/3.3.1 Windows 无法升级，需手动下载                             | MCP OAuth 流程（对 C9）                       |
| 3.3.3 ⚠ | 07-08 | 修复 windows 卡顿（单行 notes；隐藏构建）                                                                          | —                                             |
| 3.3.4   | 07-10 | **后台任务**（子智能体和 bash 均可后台执行）；**SSH 场景同步本地插件和市场**；团队订阅通知成员                     | 后台任务调度实现                              |
| 3.3.5   | 07-13 | **从 ZIP 链接安装插件**；拖拽范围扩大                                                                              | 插件安装路径（对 C10）                        |
| 3.3.6   | 07-15 | 仓库 Wiki 多语言；插件安装/同步残留修复                                                                            | —                                             |

### 3.4–3.7（功能膨胀期，大量隐藏构建）

| 版本          | 日期  | 官方宣称要点                                                                                                                                                                             | 待验证钩子                         |
| ------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 3.4.0         | 07-20 | **定时任务**（cron 式计划执行）；**辅助对话（副屏）**；代码库 Wiki+ 语言选择；**插件商店改版（搜索 + 详情页）**、插件远程同步与 CDN 安装；**支持 Kimi K3**；非项目会话模式；飞书流式卡片 | 定时任务调度器、Kimi provider 模板 |
| 3.4.1 ⚠       | 07-21 | 同 3.4.0 文案 + 归档/思考过程修复                                                                                                                                                        | —                                  |
| 3.4.2 ⚠       | 07-21 | 同 3.4.1 + Plan 模式确认修复、空内容发送                                                                                                                                                 | —                                  |
| 3.5.2         | 07-24 | **内置网页应用集成**；**PDF 预览**；统一外观设置；插件市场图标；仓库知识库目录 + 示意图                                                                                                  | 内置 webapp 清单                   |
| 3.5.3         | 07-27 | 优化缓存命中率（单行）                                                                                                                                                                   | 缓存实现                           |
| 3.6.1 ⚠       | 07-29 | **自动化任务**（定时 + 空闲双视图）；**全局防休眠开关**；**项目维度记忆**；模型最大输出长度可调；**Kimi K3 256K**                                                                        | idle/automation 子系统             |
| 3.6.2 ⚠       | 07-29 | 与 3.6.1 完全相同（notes 复用）                                                                                                                                                          | 实际 diff 看改了什么               |
| 3.6.4 ⚠       | 07-30 | 官方供应商可加其他官方模型；**`/side` `/btw` 命令**开辅助对话                                                                                                                            | side/btw 命令注册                  |
| 3.6.5         | 07-31 | 自动化卡片统计手动运行；浏览器工具栏更多操作                                                                                                                                             | —                                  |
| 3.7.1 ⚠       | 08-06 | **@ 引用插件/文件/会话**；闲时任务可用自定义模型 subagent；设置中查看项目记忆；自动化自定义分钟间隔；子智能体思考强度                                                                    | @ 引用解析                         |
| 3.7.2/3.7.3 ⚠ | 08-07 | 与 3.7.1 完全相同                                                                                                                                                                        | —                                  |
| 3.7.4/3.7.5 ⚠ | 08-09 | 记忆页按项目浏览；任务工作台按分组拆分                                                                                                                                                   | —                                  |
| 3.7.6         | 08-10 | PPT 选中元素评论；配额用尽不再重试；**无 Git 时插件可从 GitHub 安装**                                                                                                                    | 插件安装 fallback                  |
| 3.7.7         | 08-14 | **全新旗舰模型 GLM-5.3 发布**；思考等级修复                                                                                                                                              | modelId 列表新增 GLM-5.3           |

### 3.8–3.14（官网 changelog 可见段 + 最新）

| 版本     | 日期  | 官方宣称要点                                                                                                                                                                                                                                                      | 待验证钩子                                                                                                                            |
| -------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 3.8.1 ★  | 08-18 | **GLM Coding Plan 闲时重置 5 小时额度权益**；按用户全局/工作区管理各 agent 能力项；首页提示词推荐 + 插件市场；**个人套餐 V3 与团队套餐用量统计**；**工作区级安全 Hooks**；内置浏览器录视频；文档插件增强（docx/pdf/xlsx/pptx）；演示文稿自动生成预览              | plans：闲时权益；hooks：工作区级                                                                                                      |
| 3.9.1 ★  | 08-23 | 模型配置选项页优化；默认展示思考过程与实时耗时（**此版 linux 包矩阵 +rpm**）                                                                                                                                                                                      | —                                                                                                                                     |
| 3.9.2 ★  | 08-26 | **GLM-5.3-Flash 多模态模型**（订阅开箱即用）；**Computer Use 优化+macOS Intel 支持**；权限提示；浏览器复用标签页                                                                                                                                                  | GLM-5.3-Flash modelId；computer-use 代码面                                                                                            |
| 3.10.0 ⚠ | 08-27 | **Weekend Plan 免费提前领取 + 邀请好友**；提示词模板引用插件一键安装；输入框技能快捷入口；思考轨迹搜索；**MCP 协议版本可配置**；编辑消息立即发送；回合结束执行摘要；"浏览器"更名"浏览器控制"                                                                      | Weekend Plan 串；MCP 协议协商                                                                                                         |
| 3.10.1 ★ | 08-28 | 与 3.10.0 几乎相同                                                                                                                                                                                                                                                | —                                                                                                                                     |
| 3.10.2 ★ | 08-31 | 修复子代理模型分组显示                                                                                                                                                                                                                                            | —                                                                                                                                     |
| 3.11.1 ⚠ | 09-04 | **对话中上传/读取/预览 PDF**；媒体文件预览；**插件按工作区单独安装**；插件更新提醒；操作拦截显示原因；侧边栏中键关闭；草稿任务侧边栏可见；浏览器记住窗口尺寸；本地文件链接系统浏览器打开；**Weekend/Global Plan 领取提醒**（**此版 +pkg.tar.zst**）               | per-workspace 插件隔离；Global Plan 串                                                                                                |
| 3.11.2 ★ | 09-04 | 与 3.11.1 几乎相同                                                                                                                                                                                                                                                | —                                                                                                                                     |
| 3.12.1 ⚠ | 09-13 | **模型管理大改版**、三方模型适配；**闲时任务自然语言创建**（聊天中卡片直达表单）；插件 @ 引用中文搜索；Markdown 预览选中正文加入对话；输入框"+"菜单；权限反馈换行；登录失败取消按钮；**会话分享支持用户附件**；**工作区面板改版**（会话/终端/Side Pane 独立面板） | 闲时任务 NL 入口；分享上传链路                                                                                                        |
| 3.12.2 ⚠ | 09-16 | 计划模式与排队消息优化；**OpenCode Go 服务商模板与站点映射**；数据库初始化升级；**官方 Claude 插件市场刷新提示**（注：yml `releaseName` 误标为 "Release v3.11.2"）                                                                                                | OpenCode Go provider 模板；Claude 市场源                                                                                              |
| 3.12.3 ★ | 09-16 | ≈3.12.2 + 套餐获取失败重登录入口、Linux 自动更新修复                                                                                                                                                                                                              | —                                                                                                                                     |
| 3.14.0   | 09-19 | **宣称不可考**：yml feed 已撤、官网 changelog（2026-09-19 抓取）仍止于 3.12.3；**3.13.x 整条线 linux-x64 未发布**（3.13.0–3.13.4 + 3.12.4/3.12.5 deb 全 404），3.12.3 直跳 3.14.0                                                                                 | 二进制实测见 `line-3.14.md`（dynamic workflows 引擎化、CUA SDK v3 迁 node-repl-host、document-skills 一拆五、快照凭证端点字面量撤出） |

## 特性时间线（首宣版本 → 待验证）

按宣称首次出现排序；◆ = 从未在 changelog/docs 宣称、纯二进制/社区发现。

| 特性                                 | 首宣版本                                                                                  | 宣称内容                                                                                                                                                           | 验证钩子                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| Claude 数据迁移                      | 1.0.0                                                                                     | 从"旧版 Claude"一键迁移 MCP/设置                                                                                                                                   | 迁移代码路径                |
| 多模型/自定义 provider               | ≤1.0.0                                                                                    | 自定义模型提供商                                                                                                                                                   | provider 模板               |
| SSH 远程工作区                       | ≤1.0.0                                                                                    | 远程开发                                                                                                                                                           | SSH/remote 子系统           |
| 子智能体                             | 1.6.0                                                                                     | 创建/编辑/管理；3.2.0 自定义权限 + 模型；3.7.1 思考强度                                                                                                            | agents 清单、权限模型       |
| IM 机器人                            | 1.8.0                                                                                     | 飞书/Lark/微信；3.4.0 流式卡片；文档另称 Telegram[^eesel]                                                                                                          | bot channel 代码面          |
| Memory                               | 1.9.0                                                                                     | 软链/编辑/打开文件；3.6.1 项目维度                                                                                                                                 | memory 存储格式             |
| Hooks                                | 1.9.0（配置 UI）                                                                          | 3.8.1 工作区级安全 Hooks                                                                                                                                           | hooks.json 执行面           |
| OutputStyle                          | 1.9.0                                                                                     | 输出风格配置                                                                                                                                                       | —                           |
| Linux 支持                           | 2.2.0                                                                                     | 首发                                                                                                                                                               | —                           |
| `/goal` 命令/Goal 模式               | 2.2.0                                                                                     | 目标驱动长任务                                                                                                                                                     | goal 命令实现               |
| Coding Plan                          | 2.3.0                                                                                     | 套餐展示/用量计费入口；2.9.0 应用内购买；3.1.3 团队版；3.3.0 团队套餐登录                                                                                          | plans 类别全量串            |
| OpenCode 字样                        | 2.6.0                                                                                     | "避免 OpenCode 被自动更新"；2.7.0 "Gemini 和 OpenCode 命令来源"                                                                                                    | 2.x 是否已含 opencode 组件  |
| 通用技能 Skills                      | 2.13.0                                                                                    | 3.1.0 导入；3.2.5 SSH 同步；3.2.3 `$zcode-configuration-guide`                                                                                                     | skills 类别                 |
| 插件体系                             | 3.0.0                                                                                     | 管理入口 + 导入；3.2.0 自定义 beta；3.3.4 市场+SSH 同步；3.3.5 ZIP 安装；3.4.0 商店改版+CDN；3.7.6 免 Git 装 GitHub 插件；3.11.x 按工作区；3.12.2 官方 Claude 市场 | extensions lane 全量核对    |
| 计划模式 Plan Mode                   | 3.2.0                                                                                     | 退出恢复原模式                                                                                                                                                     | plan mode 状态机            |
| MCP                                  | 3.1.2（header 修复）                                                                      | 3.2.3 工作区默认可信；3.3.0 SSH 同步；3.3.2 本地 OAuth；3.10.x 协议版本可配                                                                                        | MCP client 实现、trust 默认 |
| 定时任务                             | 3.4.0                                                                                     | cron 计划 + 历史                                                                                                                                                   | 调度器                      |
| Kimi K3                              | 3.4.0（K3）；3.6.1（K3 256K）                                                             | 第三方模型进入官方供应商                                                                                                                                           | provider 模板               |
| 辅助对话 /side /btw                  | 3.4.0（辅助对话）；3.6.4（命令）                                                          | 副屏继续提问                                                                                                                                                       | 命令注册                    |
| PDF                                  | 3.5.2 预览；3.11.x 对话内读/传/预览                                                       | —                                                                                                                                                                  | PDF 处理路径                |
| 自动化/闲时任务                      | 3.6.1（视图）；3.7.1（自定义模型 subagent）；3.8.1（闲时 5h 额度权益）；3.12.1（NL 创建） | —                                                                                                                                                                  | idle 任务权益判定           |
| 项目记忆                             | 3.6.1                                                                                     | 3.7.4 记忆页                                                                                                                                                       | —                           |
| GLM-5.3                              | **3.7.7（08-14）**                                                                        | "全新旗舰模型发布"                                                                                                                                                 | modelId 出现点              |
| GLM-5.3-Flash                        | **3.9.2（08-26）**                                                                        | 多模态、订阅即用                                                                                                                                                   | modelId                     |
| Computer Use                         | 3.9.2                                                                                     | macOS Intel 支持；权限提示                                                                                                                                         | computer-use 实现           |
| 工作区级 Hooks                       | 3.8.1                                                                                     | "安全的"工作区级配置                                                                                                                                               | 安全边界                    |
| Weekend Plan                         | 3.10.0                                                                                    | 免费提前领取 + 邀请                                                                                                                                                | plans 串                    |
| Global Plan                          | 3.11.x（提醒文案首现）                                                                    | 领取提醒/到期                                                                                                                                                      | plans 串                    |
| OpenCode Go provider                 | 3.12.x                                                                                    | 服务商模板 + 站点映射                                                                                                                                              | provider 模板               |
| 官方 Claude 插件市场                 | 3.12.2                                                                                    | 刷新失败提示修复；文档称个人区预置 Claude Code 插件市场[^docs-plugin]                                                                                              | 内置市场源 URL              |
| 会话分享                             | 3.12.1                                                                                    | 用户附件上传、超限拦截                                                                                                                                             | 分享端点                    |
| ◆ ACP / app-server                   | —                                                                                         | **官方零文档零 changelog**；二进制含 `acp/`、`acp-proxy-runtime/`、`zcode.cjs app-server --stdio`[^vibe][^multica]                                                 | C9 协议面全量               |
| ◆ 请求签名 x-client-sig/x-client-pow | —                                                                                         | 客户端配置可开启，代码已内置（HKDF+HMAC/Ed25519），实测当前关闭[^pi]                                                                                               | 签名代码路径                |
| ◆ 仓库快照上传                       | —                                                                                         | 仅 3.12.3 修复条目间接承认（"优化仓库快照上传的内存占用"）；issue #707 称静默上传 .git 历史且不可关闭[^issues]                                                     | 上传触发条件/范围           |

## 先行逆向成果（待确认/可证伪的宣称）

### vibe-coding-labs/zcode-reverse-engineer（分析对象：3.0.1 win/mac + 2.13.0 linux，~~2026-06~~08）[^vibe]

认证与端点（全部待 C9 lane 复核）：OAuth 三步链 `chat.z.ai/api/oauth/authorize`（`client_id=client_P8X5CMWmlaRO9gyO-KSqtg`，**无 PKCE、无 client_secret**）→ `zcode.z.ai/api/v1/oauth/token` → `api.z.ai/api/auth/z/login` 得 zcode JWT[^vibe-endpoints]。双请求通道：API Key 通道走 `x-api-key` 到 `api.z.ai/api/anthropic` 或 `open.bigmodel.cn/api/anthropic`；Plan 通道（Start/Coding Plan）走 `Bearer JWT` 到 `zcode.z.ai/api/v1/zcode-plan/anthropic`，由 providerId 集合 `{zaiCodingPlan, zaiStartPlan, bigmodelCodingPlan, bigmodelStartPlan, zapi}` 决定走 Bearer[^vibe-quota]。计费端点：`zcode-plan/billing/current|balance`（其侧被 WAF 拦）、`api.z.ai/api/biz/subscription/list`、`api.z.ai/api/monitor/usage/quota/limit`、公开无鉴权 `zcode.z.ai/api/v1/client/configs`[^vibe-endpoints]。

额度与定价宣称：`startPlanPreview` 公示 Start Plan 每日 GLM-5.3 3M + GLM-5-Turbo 2M token（`planId=zcode-v3-start-plan`）；Coding Plan BigModel 渠道 Lite ¥49/Pro ¥149/Max ¥469 每月，Z.AI 渠道 Lite ¥18/Pro ¥72[^vibe-quota]。⚠️ 与现行官方文档数字不一致（见矛盾节）。

模型目录（2026-06-03 快照）：glm-5.1/5.1-highspeed/5/5-turbo/4.7/4.7-flash/4.6/4.5/4.6v；deepseek-v4-flash/pro（1M ctx）；kimi-k2.6/k2.5；qwen3.5-plus/flash/max；MiniMax-M3/M2.7；mimo-v2.5(-pro)[^vibe-catalog]。provider 预设含 `zapi`（`http://192.168.6.166:8080` 内网测试地址——二进制里找残留）。

ACP 宣称：`zcode-acp` 二进制经 stdio JSON-RPC（`session/create|resume|send|stop|event|sessionUpdate|workspace/readState|interaction/requestPermission`）；proxy 随机端口，`x-zcode-proxy-route-key`/`x-zcode-target-model` 动态路由 + session pinned routes；codex→anthropic/openai/gemini、gemini→openai 协议转换器；MITM CA 证书；gateway auth 经 `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN`；`--hide-claude-auth` argv、`IS_SANDBOX`、`NO_BROWSER` 环境变量[^vibe-acp]。

### pi-zcode-provider（分析对象：3.10.1 linux，2026-09 前后）[^pi]

新增宣称：桌面端把可用 API Key **明文**落在 `~/.zcode/cli/config.json` 的 `provider["builtin:zai-coding-plan"].options.apiKey`；`~/.zcode/v2/credentials.json` 用 AES-256-GCM（`enc:v1:<iv>.<tag>.<ct>`），密钥派生 `sha256($ZCODE_CREDENTIAL_SECRET || "zcode-credential-fallback:<platform>:<homedir>:<username>")`，存 `oauth:zai:access_token`/`zcodejwttoken`/`oauth:zai:user_info`/`oauth:active_provider`。API Key 推导链：`getCustomerInfo` → org+project → `api_keys` → `copy/<apiKey>` 拿 `secretKey`，最终 `id.secret` 49 字符。business JWT 为 HS512、长寿命无 `exp`。无头登录：`POST /api/v1/oauth/cli/init` + `GET /api/v1/oauth/cli/poll/<flow_id>`（300s 过期）。服务端可经 `GET /api/v1/agent/configs` 把请求映射到代理 `zcode.z.ai/api/v1/ultra-zai/anthropic/v1/messages`。休眠中的 `x-client-sig`/`x-client-pow` 请求签名代码（HKDF+HMAC/Ed25519）。请求头含 `X-Device-Mid`。

### multica-ai/multica issue #5361（app-server 线协议实测）[^multica]

**关键宣称：`zcode.cjs app-server --stdio` 不是 Zed ACP**——换行 JSON 自定义信封（带 `jsonrpc` 字段会被 `unrecognized_keys` 拒绝）、无 initialize 握手（`Method not found: initialize`）、错误码沿用 JSON-RPC 族（-32600/-32601/-32602/-32700）、`session/create` 要求 `workspace` 对象参数、观测到 `session/messages`、`session/setThoughtLevel`、`session/resume`。另有 `zcode -p "<prompt>"` 无头单轮模式，以及 `GLM_BINARY_PATH` 可切换到原生 `zcode-agent` 二进制。⇒ 修正 vibe repo 把该协议直接叫 "ACP" 的说法：二进制目录名是 acp，线协议是私有定制——C9 lane 定名时需注意。

## 社区风评与外围宣称

- **HN 双帖**（2026-07-01，主帖 264+ 分/236+ 评论）：社区共识 ZCode 桌面 UI "基本是 Codex 的精确复刻"（paxys、hazelnut）；有评论者断言其 CLI "是把 opencode 桌面代码抽出来改的（连同 opencode go/zen model provider）"——与本地语料 3.0.0 起 OpenCode 派生引擎的架构事实互证；非开源遭质疑（对比小米 MiMo-Code 开源）；数据安全信任争议[^hn][^chenblog][^eesel]。
- **提示词门**：linux.do 有帖（80aj 转述）称逆向发现 **ZCode 系统提示词与 Claude Code 高度相似**、"疑似在 CC 基础上做词汇级替换"，并用 GLM-5.2 自证难以掩盖关联[^80aj]。→ 引擎 lane 可直接 diff 提示词文本验证。
- **官方知乎**（智谱官号，~2026-08）：宣称百万开发者；Goal/Subagents/Remote Control/闲时任务四功能上线；自称 GLM 在 ZCode 缓存命中率 >98%、Coding Plan 有效 token +30%、限时 1.5× 额度（至 08-31）；自研 Z.ai Code Bench 称 GLM-5.2+ZCode 比 GLM-5.2+Claude Code 任务通过率高 2.39%、检查项通过率低 1.22%；内置子智能体 General-purpose（可写）与 Explore（只读）[^zhihu]。
- **eesel 评测**：GLM-5.2 Terminal-Bench 2.1 81.0 vs Opus 4.8 85.0；"Vibeworking" 手机遥控；BYOK 支持 Anthropic/DeepSeek/Kimi/OpenRouter；X 上有人抱怨 Max 套餐"耗 token 速度 5× 于 Codex $200 档"[^eesel]。
- **docs.z.ai devpack**：官方文档列出 GLM Coding Plan 接入第三方 CLI（Claude Code、Codex、OpenCode、Pi、Droid、Crush、Goose；**无 Gemini CLI**），三端点 `api.z.ai/api/anthropic`、`/api/coding/paas/v4`、`/api/v1`[^devpack]。
- **HN 提及**：Linux 仅 beta 期反馈群组为飞书群[^hn]。

## 矛盾与存疑点（discrepancy seeds）

1. **ACP 零公开**：`acp/`、`acp-proxy-runtime/`、`app-server --stdio` 是 3.x 核心面，官方文档/changelog 只字未提；唯一公开协议信息来自第三方逆向[^vibe][^pi][^multica]。
2. **changelog 远少于实际版本**：官网只列 8 版；yml 证实的隐藏构建含 3.3.3、3.4.1/3.4.2、3.6.1/3.6.2/3.6.4、3.7.1–3.7.5、3.10.0、3.11.1、3.12.1/3.12.2，且 3.5.0/3.5.1、3.6.0/3.6.3、3.7.0、3.8.0、3.9.0、3.11.0、3.12.0 从未构建[^manifest]。
3. **releaseNotes 复用/错标**：3.12.2 的 yml `releaseName` 误为 "Release v3.11.2"；3.6.1=3.6.2、3.7.1=3.7.2=3.7.3、3.7.4=3.7.5 文案逐字相同，真实增量只能看二进制 diff[^yml]。
4. **免费额度宣称漂移**：vibe repo 2026-08-18 实测 Start Plan = GLM-5.3 3M + GLM-5-Turbo 2M/日[^vibe-quota]；现行官方文档为 5 天试用、每日 GLM-5.3 3M + GLM-5.3-Flash 5M（8M/日）[^docs-config]。同一 `client/configs` 端点，配置随服务端变化——签名 lane 看 `startPlanPreview` 消费代码。
5. **定价宣称不一致**：vibe repo（~06 月）记录 BigModel Lite ¥49/Pro ¥149/Max ¥469 每月、Z.AI Lite ¥18/Pro ¥72[^vibe-quota]；现行官方文档为 Lite ¥118/Pro ¥538/Max ¥1078、团队 ¥598/¥1198、Z.ai $18 起，且 Pro/Max 为 Lite 的 6×/14× 用量[^docs-config]。周期口径不同可能解释部分差异，建议以二进制内 `codingPlanStaticProducts` 快照逐版对比。
6. **多框架支持降级**：2.x changelog 明示 Gemini/OpenCode 命令来源、OpenCode 防更新开关；feedback 仓仍保留 `fw: Claude Code/Codex/opencode/Gemini CLI` 标签[^feedback]；但 3.x 官方文档只字不提第三方 agent 运行时，仅称 ZCode Agent 自研默认[^docs-agents]。→ 验证 3.x 各版本是否仍保留第三方 agent 集成面，何时被砍/改名。
7. **OpenCode Go 回归**：HN 称 opencode go/zen provider 被抽走[^hn]；3.12.x changelog 又宣"新增 OpenCode Go 服务商模板与站点映射"[^yml]。→ provider 模板 diff 确认其形态。
8. **静默 .git 上传**：issue #707 指控登录态下静默上传工作区 .git 历史到云端且不可关闭[^issues]；3.12.3 changelog 自认"仓库快照上传"功能存在[^yml]。→ 引擎/host lane 查上传触发、范围、开关。
9. **Claude 兼容层深度**：插件 manifest 兼容 `.claude-plugin/plugin.json`、预置 Claude Code 插件市场、`${CLAUDE_PLUGIN_ROOT}` 变量、3.12.2 "官方 Claude 插件市场"[^docs-plugin][^yml]；加上提示词相似指控[^80aj]与 ACP 目录命名——"自研"宣称 vs Claude 生态依赖的边界值得逐版描。
10. **加密凭据的 fallback 密钥**：pi-zcode 称 `ZCODE_CREDENTIAL_SECRET` 缺省时回退到可预测的 `"zcode-credential-fallback:<platform>:<homedir>:<username>"` 派生密钥，且 API Key 另有明文落盘[^pi]。→ 二进制确认加密实现与明文面。
11. **3.3.x 事故级连发**：3.3.0→3.3.3 三天四版、官方为 Windows 无法升级公开致歉[^yml]；该窗口期正是 CDN 扁平/嵌套布局切换点——工程事故与发布管线迁移可能同源。
12. **宣称渠道收缩（2026-09-19）**：`latest.yml`/`latest-linux.yml` 全版本撤除（含旧版存档路径），官网 changelog 滞后于 CDN 实物（3.14.0 已上架未列）；同日二进制侧观测到快照凭证端点字面量撤出、`repoSnapshot*` 标识符族消失——披露面收缩与 3.14.0 发布同窗口，是否为同一次管线变更待后续版本验证。

### 参考文献

[^yml]: ZCode CDN update metadata. `latest.yml`/`latest-linux.yml`，77 版，抓取于 2026-09-18.

[^site-changelog]: ZCode. Changelog. [zcode.z.ai/cn/changelog](https://zcode.z.ai/cn/changelog)（仅 3.8.1–3.12.3）.

[^docs]: ZCode Docs. [zcode.z.ai/cn/docs/welcome](https://zcode.z.ai/cn/docs/welcome) 及侧边栏 26 页。

[^docs-config]: ZCode Docs. 连接模型。[zcode.z.ai/cn/docs/configuration](https://zcode.z.ai/cn/docs/configuration).

[^docs-agents]: ZCode Docs. ZCode Agent. [zcode.z.ai/cn/docs/agents](https://zcode.z.ai/cn/docs/agents).

[^docs-plugin]: ZCode Docs. Plugin. [zcode.z.ai/cn/docs/plugin](https://zcode.z.ai/cn/docs/plugin).

[^feedback]: zai-org. ZCode User Feedback repo. [github.com/zai-org/feedback](https://github.com/zai-org/feedback)（README 标签体系、ROADMAP 全 TBD、CHANGELOG 仅仓自身）.

[^issues]: zai-org/feedback Issues. [github.com/zai-org/feedback/issues](https://github.com/zai-org/feedback/issues)（#707 .git 静默上传、#698/#705 登录/订阅回归、#700 DeepSeek max_tokens=384000、#703 reasoning 字段冲突等）.

[^zhihu]: 智谱（官方）. ZCode 全面升级，GLM 最佳 Harness，让复杂任务自主交付。[zhuanlan.zhihu.com/p/2070504528416337941](https://zhuanlan.zhihu.com/p/2070504528416337941).

[^vibe]: vibe-coding-labs. zcode-reverse-engineer. [github.com/vibe-coding-labs/zcode-reverse-engineer](https://github.com/vibe-coding-labs/zcode-reverse-engineer).

[^vibe-endpoints]: 同上。docs/reference/api-endpoints.md.

[^vibe-quota]: 同上。docs/models/free-quota.md 与 client-configs.md.

[^vibe-acp]: 同上。docs/protocol/acp-proxy.md.

[^vibe-catalog]: 同上。docs/models/catalog.md.

[^pi]: pi-zcode-provider. PROTOCOL.md. [cdn.jsdelivr.net/npm/pi-zcode-provider@0.1.0/PROTOCOL.md](https://cdn.jsdelivr.net/npm/pi-zcode-provider@0.1.0/PROTOCOL.md)（3.10.1 逆向）.

[^multica]: multica-ai. Issue #5361: Add ZCode as a supported agent runtime. [github.com/multica-ai/multica/issues/5361](https://github.com/multica-ai/multica/issues/5361).

[^hn]: Hacker News. ZCode – Harness for GLM-5.2. [news.ycombinator.com/item?id=48753715](https://news.ycombinator.com/item?id=48753715)；另 [item?id=48751752](https://news.ycombinator.com/item?id=48751752).

[^ccino]: ccino. ZCode 登顶 HN：智谱从做模型切到做 harness. [blog.ccino.org/p/zcode-zhipu-glm-harness-coding-agent-2026/](https://blog.ccino.org/p/zcode-zhipu-glm-harness-coding-agent-2026/).

[^eesel]: eesel AI. ZCode review: is Z.ai's GLM-5.2 harness worth it? [eesel.ai/blog/zcode-review](https://www.eesel.ai/blog/zcode-review).

[^80aj]: 80aj. 智谱 Zcode 提示词被曝深度借鉴 Claude Code. [80aj.com/2026/06/14/zcode-claude-code/](https://www.80aj.com/2026/06/14/zcode-claude-code/)（linux.do 原帖 403 无法直取）.

[^chenblog]: Gerald Chen. ZCode on HN's Front Page. [chenguangliang.com/en/posts/blog200_zcode-glm52-harness-hn-frontpage/](https://chenguangliang.com/en/posts/blog200_zcode-glm52-harness-hn-frontpage/).

[^devpack]: Z.AI Docs. Devpack tool integrations. [docs.z.ai/devpack/tool/others](https://docs.z.ai/devpack/tool/others).

[^manifest]: 本地 `manifest/versions.json`（58 linux 版）+ CDN 目录探测补齐的 1.x/2.x/3.0.x.
