# Qoder CLI 1.1.62（阿里 `@qoder-ai/qodercli`）— 无每轮隐藏上传；存在服务端可拉文件通道 + 默认开遥测

**包/来源**: npm tarball `qodercli-1.1.62.tgz`（31MB） · **解包**: `extracted/qoder-cli/package`（`bundle/qodercli.js` + `qoder-worker-runtime.mjs` 双份同码） · **覆盖**: acq + 7 族扫描 + 双镜 verify + 5 lane 全覆盖

## 结论

无 ZCode 式"每 prompt 整包快照"——收集器从不枚举 `.git` 或源码树，无 AES/RSA wrap，无 upload-credential 端点。但存在**服务端发起的文件拉取通道**（ZCode 凭证→直传→注册形状，有边界）和**默认开的代码追踪遥测**。UI 文案整体 XOR 混淆（decoder `_$d`），包括隐私声明本体。

## 上传机制

### A. remote-control artifact 通道（服务端可拉，有边界）

用户跑 `qoder remote-control <sid>` 启动 worker（`QODER_REMOTE_CHILD`）后：

1. `POST {openapi}/api/v1/remote/code/sessions/{sid}/bridge`（OAuth Bearer）→ 返回 `{worker_jwt, api_base_url(服务端指派), expires_in}`
2. 开入站 SSE `.../worker/events/stream`
3. 仅当 `source==="controller"` 响应 `prepare_artifact{path}`
4. `POST .../worker/artifacts/uploads {source_path, content_md5, ...}` → presigned ticket
5. PUT **原文未加密**到 `upload_url`（校验器只查 http(s)+无 userinfo，**无 host 白名单**）→ `POST .../artifacts/{id}/complete` 注册

边界：`registry.get(path)` 否则 `artifact_not_in_index`——注册表只收 agent 触碰过的文件 + controller `resolve_session_artifacts` 应答里本地 host 快照声明的路径。**controller 不能任意命名路径**，但服务端驱动 + 凭证签发 + 直传 + 注册的形状与 ZCode 一致。

### B. feedback-v2 诊断包（用户触发，范围被低估）

`/feedback` 对话框 Submit 或 `qoder feedback -c` 触发 18 族收集器：workspace 侧 `<workDir>/.qoder/**` + `.mcp.json/.qoderignore/AGENTS.md`（**不扫源码树**）；home 侧 `~/.qoder/**` 含**完整会话 transcript jsonl** + memory/plans/goals；另附 `env-snapshot.json`（白名单明文、其余 sha256、敏感名丢弃）、`file-tree.tsv`（≤5000 行工作区清单）、机器/组织身份。JSZip ≤80MiB → multipart PUT `center.qoder.sh/issue/file/diagnose/upload` → 删除。对话框只写"diagnostic information"，不列明细。

### C. aiCodeTracking（默认开）

`POST center /api/v1/tracking`：`ai_code.change/commit` 事件带 **git remote URL** + 每文件 `{basename, ext, lines±, category}` + uid/oid/mid。`aiCodeStatistics.enabled` **默认 true**，独立于遥测开关。

### D. codebaseStatusChecks（组织门控）

`POST openapi /api/v1/inner/organizations/{orgId}/codebaseStatusChecks {"git-remotes":[...]}` —— 全部 remote URL；仅 JadeKey/Security 标记组织。

### E. qodersec 投递

`bootstrap.sh` 从厂商 OSS 下载闭源扫描器**无校验**；PostToolUse hook 每次 Edit/Write 自动 `review --layer=l1`、`git push` 跑 `--layer=l3`；`qodersec scan` 上传代码到云端但有显式 AskUserQuestion 确认。

## consent 面

`/privacy` 命令打开隐私声明（唯一入口，从不自动弹）：声明会收集 prompts/相关代码/生成输出/编辑并用于改进产品含人工评审——覆盖面尚可但含糊。反馈对话框不列 zip 明细；aiCodeTracking 默认开无 UI；remote-artifact 通道无 consent 文案。

## 通道清单

| 通道                     | 内容                    | 门槛                           | 判定               |
| ------------------------ | ----------------------- | ------------------------------ | ------------------ |
| 推理 `api{1,3}.qoder.sh` | prompt+ 上下文          | 产品固有                       | 披露               |
| remote-control artifact  | 文件原文 PUT            | 用户启 session + registry 边界 | 服务端可拉（有界） |
| feedback-v2 zip          | 配置+transcript+ 文件树 | 用户触发                       | 合规但范围低估     |
| aiCodeTracking           | git remote + 文件统计   | 默认开                         | 隐藏遥测           |
| codebaseStatusChecks     | 全部 git remote         | 组织标记                       | 窄口径外发         |
| qodersec                 | 云端代码审查            | L1 hook 自动 / scan 需确认     | 半披露             |

## 证据锚点

`bundle/qodercli.js`（feedback 收集器、tracking）、`bundle/qoder-worker-runtime.mjs`（bridge/events/artifacts 上传三连）；`Cosy-*`/`MachineId` 签名头族。digest: `evidence/qoder-cli/journal-digest.json`
