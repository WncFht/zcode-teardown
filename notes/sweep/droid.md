# Factory Droid CLI 0.225.2 — 多条 scoped 外发通道（无整包隐藏上传）

**包/来源**: npm `droid`（25.8KB esbuild shim）+ `@factory/cli-linux-x64@0.225.2`（114.8MB tgz → 254MB Bun SEA ELF；`.bun` section ~172.6MB 模块图经 objcopy dump + record table 反序列化还原）
**解包**: `~/src/agent-teardown/extracted/droid/`（620 个 chunk）
**覆盖**: acq + 7 族扫描 + 双镜 verify + 5 lane，证据 `evidence/droid/journal-digest.json`

## 结论

无 ZCode 式整工作区隐藏上传管线，但存在多条**真实的内容外发通道**，全部 scoped/认证门控而非隐蔽全量：

1. **云端会话同步（默认开，最大发现）**：每个 session 建/更都 POST `api.factory.ai`——`syncSessionCreate` 携带 cwd、workspace id 等元数据，**每条消息**经 `create-message` 上行。
2. **Software Factory portable-state**：把 `~/.factory/software-factory/workstreams/<slug>/{memory,scripts,skills}` 文件内容（utf8/base64 + sha256，200 文件/单文件 512KB/总 2MB 上限 + credential 文件名 denylist）POST 到 `/api/v1/software-factory/workstreams/{id}/content`；`droid sf state-publish` 手动 + **session 关闭时经远端 RPC 自动发布**。
3. **daemon S3 传输原语**：JSON-RPC `daemon.push_cwd_file_to_url`/`pull_url_to_cwd_file`——远端调用者（Factory backend 经 `wss://relay.factory.ai` 隧道）给定 presigned PUT URL，daemon 把**会话 cwd 内任意文件**流式 PUT 到 Factory 自有桶 `assembly-file-uploads-{dev,prod}`。厂商铸造凭证→直传对象存储，形状同 ZCode，但每次一文件、需同 org 认证远端调用者。

## consent 面

- portable-state 发布：**无用户开关**——唯一门槛是服务端属性 `workstream.executionTemplateId`；手动命令文案只说 "publish" 不提目的地。
- 会话同步：默认开。
- daemon S3 原语：daemon 侧无 consent 检查，信任远端调用者身份（`caller:"backend"` via actAsGrant）。
- 无任何上传路径做客户端加密（TLS 明文；AES-256-GCM 仅用于本地 token 存储与 dotenv-vault）。

## 通道清单

| 通道                                             | 内容                                      | 门槛                  | 判定                         |
| ------------------------------------------------ | ----------------------------------------- | --------------------- | ---------------------------- |
| 云会话同步                                       | 会话元数据 + 全消息流                     | 默认开                | 披露失真 opt-out             |
| SF portable-state                                | workstream memory/scripts/skills 文件内容 | 服务端属性 + 自动发布 | 披露失真                     |
| daemon push_cwd_file_to_url                      | cwd 内任意文件→presigned S3               | 同 org 远端调用者     | **真实外发原语**（条件苛刻） |
| conjure deploy / droid wiki upload / signal 附件 | 用户显式命令                              | 用户发起              | 合规                         |
| GitHub wiki force-push                           | → 用户自己的 repo                         | 用户发起              | 合规（非 vendor）            |

## 证据锚点

`chunk-vazzv5xj.js`/`chunk-9wghj69g.js`/`chunk-8bvfs7xh.js`（pack + publish）；`chunk-b7gzxwdt.js`（session 同步路由表）；`chunk-dmmg4vh`（daemon.sf.publish_workstream_content dispatch）；daemon RPC `push_cwd_file_to_url`/`pull_url_to_cwd_file`/`write_workspace_file_content`；`wss://relay.factory.ai/v0/computer/{id}/tunnel`。
