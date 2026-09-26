# Agent Teardown Sweep —— 可复用审计流水线

`agent-teardown-sweep.js` 是本次多目标扫描使用的 Workflow 脚本（Claude Code `Workflow` 工具）。把 ZCode 快照上传的 28 项指标泛化成 7 个扫描族，对 45 个闭源 agentic coding 客户端批量执行：acquire → scan → 双镜对抗 verify → long 深潜 lane → verdict。

## 流水线形状

```
TARGETS × (acquire → 7 scan families) → suspicious hits
        → verify ×2 镜（refute / evidence）
        → 未 refuted 才进 5 条 deep lane
        → verdict 汇总
```

- **acquire**：按 kind 下载解包（electron-ide / npm-cli / vsix / desktop-native），安装包 ≤1GB（个别目标可覆写上限）、解出 ≤2GB、静态分析、不绕登录。
- **7 扫描族**：pack（tar/gzip/zip 打包）、crypto（aes-256-\*/rsa-oaep/keyWrap/SPKI）、cloud（OSS/COS/S3/OBS/BOS presigned + STS + PostObject + callback）、egress 端点、工作区索引/遍历、consent/UI 文案、URL 字面量。
- **双镜 verify**：evidence 镜证明"内容确实离机"，refute 镜尽力证伪（死代码/ vendored SDK/披露特性）。两镜都 refuted 才判 clean——`refuted` 字段与 `_lens` 都在调用点侧绑定，不能信 agent 自报。
- **5 条 deep lane**：pipeline（端到端链）、consent（开关与文案是否如实）、scope（载荷范围）、exfil（凭证/加密/端点机制）、altpaths（全外发普查）。
- **resume**：`Workflow({scriptPath, resumeFromRunId})` 重放缓存已完成 agent，journal（`subagents/workflows/<run>/journal.jsonl`）是所有结果的地面真源。

## 判定口径

| 判定                   | 含义                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------- |
| hidden-upload          | 工作区/会话内容离机，无 consent 面或 consent 失真（placebo 开关、understated 文案） |
| under-disclosed opt-in | 有真门控开关但 UI 文案不提上传（ZCode 式 understatement）                           |
| user-initiated         | 显式用户触发（日志上传、反馈、handoff）                                             |
| disclosed-egress       | 披露且 opt-in（遥测、relay、媒体上传特性）                                          |
| dormant                | 管线存在但此 build 无条件禁用                                                       |
| clean                  | 双镜 refuted，无内容外发管线                                                        |
| partial / gated        | 覆盖不完整 / 获取被拦                                                               |

**注意**：lane 返回的 `upload_pipeline=true` 只表示"存在任何用户数据外发通道"（元数据遥测算），不等于隐藏上传——判定必须读 `finding` 文本与 consent lane。

## 已知坑（本脚本迭代中踩过）

1. `results.filter(Boolean).map((r,i)=>TARGETS[i])` 会错位——必须保留 index 映射或沿途带 `tid`。
2. agent 在 `lens` 字段返回整句散文导致 `===` 比较失配——枚举字段在调用点绑定 `_lens` 兜底。
3. 429 限流：批大小 4 目标×内层并发 ≈ 8 活 agent 是稳定点；更大并发会撞本地 gate。
4. 巨型包（PiecesOS snap 1.9G、minimax win build 1.2G）需要 per-target 上限覆写。

## 复现

逐目标的获取渠道、解包命令与证据引用约定见 [notes/sweep/reproduce.md](../../notes/sweep/reproduce.md)。

## 语料仓约定（agent-teardown）

```
agent-teardown/
  installers/<target>/    原始安装包
  extracted/<target>/     解包树（审计对象）
  reports/<target>-verdict.md   终判报告
  evidence/<target>/      扫描产物 + journal-digest.json（journal 按目标拆出的全部 agent 结果）
  evidence/_global/       跨目标扫描/指标文件
  tools/                  一次性分析脚本
  scratch/                不可归属边角料
```
