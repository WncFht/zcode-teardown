# Xiaomi MiMo-Code 0.1.15 — clean（开源可审）

**包/来源**：MIT 开源 CLI（OpenCode fork），github.com/XiaomiMiMo/mimo-code；npm `@mimo-ai/cli` 0.1.15（postinstall 壳 + 129MB Bun 平台二进制）或 `curl mimo.xiaomi.com/install`；同仓库含 Electron desktop/console/企业 server · **解包**：`agent-teardown/extracted/mimo/{repo,npm-cli,npm-bin}` · **覆盖**：源码审计 + 二进制 strings parity 核对（不走 workflow 管线，单独侦察）

## 结论

无 ZCode 式机制。无 tar/zip+加密+上传模式（归档代码全是下载用途——LSP server、ripgrep），无 workspace-indexing 端点，无静默文件外发。二进制 strings 与源码 parity 已核对，无额外烘焙域名。

## 排除依据

开源项目源码即完整事实源，逐通道审计：

- LLM 请求：prompt+ 文件上下文 → 配置的 provider；默认匿名 "MiMo Auto" 通道走 `api.xiaomimimo.com/v1` / `token-plan-{cn,ams,sgp}.xiaomimimo.com/v1`——产品固有，但注意**零账号即让小米看到代码上下文**。
- 会话分享 → `opncd.ai`：完整会话含 diff/工具输出，但需显式 `/share`/`--share`/`share:"auto"`/`MIMOCODE_AUTO_SHARE`；`MIMOCODE_DISABLE_SHARE` 可杀。
- 控制面 workspace sync：POST session 事件到用户自配 remote workspace——实验性 opt-in。
- 语音/搜索：特性固有。

## consent 面

唯一瑕疵：`tracking.miui.com/track/v4/o` 用量指标**默认 ON 且 README 未文档化**，且对所有 provider 生效（含自建 key）。但载荷仅元数据（token 数、工具名、延迟、session_id），`MIMOCODE_ENABLE_ANALYSIS=false` 可关；`installation_id` 持久文件刻意不上传（`metrics/subscriber.ts:14-17`）——隐私姿态可接受。

## 通道清单

| 通道                            | 内容               | 门槛                       | 判定     |
| ------------------------------- | ------------------ | -------------------------- | -------- |
| LLM 请求 → `api.xiaomimimo.com` | prompt+ 文件上下文 | 产品固有（默认匿名通道）   | 预期行为 |
| 指标 → `tracking.miui.com`      | 元数据             | 默认开，env 可关，未文档化 | 轻微问题 |
| 分享 → `opncd.ai`               | 完整会话           | 显式触发                   | 合规     |
| workspace sync                  | session 事件       | 自配+opt-in                | 合规     |
| 语音/websearch                  | 音频/query         | 特性固有                   | 合规     |

## 证据锚点

```
metrics/client.ts:1（tracking.miui.com app_id 31000402765）
flag/flag.ts:106-108（MIMOCODE_ENABLE_ANALYSIS）
metrics/subscriber.ts:14-17 + metrics/installation.ts（installation_id 不上传）
share/share-next.ts:285,340 + share/session.ts:38-44 + cli/cmd/run.ts:407（分享门槛）
control-plane/workspace.ts:234,460（sync 端点）
tui/util/voice.ts:218；tool/websearch/mimo.ts:84
```

完整版：`agent-teardown/reports/mimo-verdict.md`。
