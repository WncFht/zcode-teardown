# InsCode 2.2.11（GitCode/CSDN，Codex fork，Tauri v2）— 覆盖不足：扫描级，多项高危信号未复核

**包/来源**: `gitcode.com/inscode-codex/inscode-desktop-releases` v2.2.11（stable，2026-09-17；beta 2.3.1）Windows NSIS + macOS app.tar.gz，Tauri v2 · **解包**: `extracted/inscode`（win exe + darwin-aarch64）· **覆盖**: ⚠️ 仅 acq + 4 族扫描（crypto/pack/cloud/index），**verify 与 5 lane 未跑** ——以下全部为扫描级信号，未经对抗复核。

## 扫描级发现（待复核）

**1. `agent_assets` 跨厂商资产收割模块（最高危信号）**：二进制字符串显示该模块扫描**其他 agent 产品的数据目录**——`.sessions`、`transcript`、`Guardian`、`.delegation`、`.span`、`.envelope`、`.continuity`、`.projects`、`.assets`，目标工具清单含 **claude(.claude)/codex(.codex/prompts)/cursor(.cursor)/kimi-code(.kimi-code)/zcode(.zcode)/windsurf(.codeium)/trae(.trae)** 等；`scan_sessions` 解析其他工具的**会话 transcript**；`known_projects_of` 推导项目与竞品 agent 的共享关系（ProjectShare/ProjectIdentity）；`AssetInventory/ToolUsageStats/AgentAssetsSnapshot` 汇总文件数/字节/行数/skills/commands/configs。已确认会读 **ZCode 自己的 session sqlite**（rusqlite Row + ZcodeSessionRow）——超出"只读资产扫描"声称。`InsCodeTurnTelemetry` BTreeMap 位于该模块内，扫描派生字段疑似随 per-turn 遥测外发。

**2. 签名遥测导出管线**：`kernel_host::telemetry_export::run_loop` 按 last_rowid cursor 从 sqlite 批量抽 `app_telemetry/chat_event_telemetry/goal_telemetry/hook_audit/tool_telemetry/turn_telemetry/approval_audit` 等表 → NDJSON → POST 到 `codex.inscode.net/api/v1/events`（prod）/ `test-codex.inscode.net/api/v1/events` → 成功后 `DELETE` 清行 + 写 export.log。请求带 `X-Inscode-KeyId/Ts/Nonce/Sign/Device-Id` 签名头，内嵌 key_id `inscode-codex-...`（env `INSCODE_TELEMETRY_SIGN_KEY` 可覆盖）。

**3. 工作区形状 + 身份字段**：`chat_event_telemetry` 记 git remote host（`resolve_repo_host_for_telemetry`）、`is_project/is_new/has_attach/open_from`；`project_shape` 记 `folder_count/git_repo_count/is_multi_folder`；`tool_telemetry` 记工具名/output_len/skill_name/risk flags；approval_audit 记审批结果枚举。`persist_refreshed_sign_key`/`taotoken` 签名机制刷新持久化。

## 未完成的判定

verify/深潜 lane 未运行，无法确认：agent_assets 收集的数据是否实际外发（还是纯本地）、遥测载荷是否含文件内容/会话文本、是否有 UI 披露与开关。**此目标应补 verify + 5 lane 再定性。**

## 证据锚点

`darwin-aarch64/InsCode.app/Contents/MacOS/InsCode` 与 `windows-x86_64/InsCode.exe` 字符串；`_strings/darwin.strings.txt`：`agent_assets.rs`、`telemetry_export.rs`、`codex.inscode.net/api/v1/events`、`X-Inscode-*` 头族、目标工具目录清单。
