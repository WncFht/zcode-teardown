# Kimi Code Desktop 1.0.2 — refuted-clean

**包/来源**：`kimi-code-app` 1.0.2 Linux amd64 deb（官网未公开挂载，同 CDN 目录探测得到；changelog 2026-09-19），sha256 `1b55c46328fc…87782` · **解包**：`agent-teardown/extracted/kimi-desktop/`（asar 主 bundle ~29 万行） · **覆盖**：7 族扫描 + 双镜 verify（两镜均 refuted）

> 版本备注：审计对象为 1.0.2；`installers/kimi-desktop/` 里另有 1.0.3 deb（2026-09-23 发布后补抓，未审计）。

## 结论

ZCode 式隐蔽管线不存在。20 个可疑命中全部复核：每条外发通道要么是本地-only、死代码、披露+opt-in 特性、或元数据遥测。

## 排除依据

| 命中                                                            | 判定                          | 说明                                                                                                         |
| --------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `writeExportZip` / yazl 打包                                    | refuted                       | zip 写本地临时文件，经 `POST /api/v1/sessions/{id}/export` 作为 HTTP 下载流回本地，无上传段                  |
| `blobs.put` 文件历史                                            | refuted                       | → `FileStorageService` 写 `~/.kimi-code/blobs`，纯本地撤销历史                                               |
| `/feedback/upload_url` + 分片直传 + `/feedback/upload_complete` | refuted（死代码）             | 完整「凭证→分片→注册」三段管线但全 asar 零调用者；`/debug` dispatcher 在 `isPackaged` 时关闭                 |
| `code-rc.kimi.com` WSS relay                                    | confirmed 但披露+opt-in       | 真实 vendor-in-the-middle（relay 明文中转），但属 Remote Control 特性：默认 off，需 Kimi OAuth + 仅 loopback |
| `telemetry-logs.kimi.com`                                       | confirmed 但披露、元数据-only | 仅大陆 region 有 endpoint；`telemetry` config + `KIMI_DISABLE_TELEMETRY` opt-out；载荷脱敏                   |
| `X-Msh-Device-Id/Name`                                          | confirmed 标准指纹            | 稳定 UUID + hostname + OS release——追踪面非内容外发                                                          |
| `ReadMediaFile` 媒体上传                                        | confirmed 特性固有            | 工作区内 media ≤100MB → 模型方 files API                                                                     |
| `/workspace/:id/snapshot`                                       | refuted                       | 仅 `/debug` 下挂载（isPackaged 关），返回元数据非文件字节                                                    |

## consent 面

遥测有文档化 config 字段 + 环境变量 opt-out；Remote Control 需显式开启 + 登录；导出/快照路由走 loopback+bearer 本地服务。consent 面整体诚实。

## 通道清单

| 通道                                    | 内容                                                             | 门槛                     | 判定                      |
| --------------------------------------- | ---------------------------------------------------------------- | ------------------------ | ------------------------- |
| Remote Control relay `code-rc.kimi.com` | 本地 kap-server 全部路由（含工作区文件字节）经 vendor relay 明文 | opt-in + 登录 + loopback | 披露特性，vendor 可见明文 |
| 遥测 `telemetry-logs.kimi.com`          | 工具名/时长/结果元数据                                           | 大陆 region 默认开，可关 | 披露遥测                  |
| 媒体上传                                | 工作区 image/video                                               | 模型调用发起             | 特性固有                  |
| `/fetch`、`/search` 代理                | agent 驱动的 URL/查询                                            | 托管服务                 | 披露                      |
| 反馈上传管线                            | （凭证→分片→注册）                                               | 死代码                   | 不可达                    |

## 证据锚点

```
app-asar/out/screenshot-*.cjs:168367  writeExportZip（本地导出）
:114190  blobs.put → FileStorageService 本地
:62183-62267  feedback 上传三段（死代码）
:261691,262116  code-rc relay + forwardHttpRequest
:61753  telemetry endpoint（CN only）
:119081  cleanTelemetryProperties 脱敏
```

完整版：`agent-teardown/reports/kimi-desktop-verdict.md`。三轮 verify 方收敛（前轮 evidence 镜分歧，第三轮双镜一致 refuted）。
