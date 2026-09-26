# Rovo Dev（Atlassian）— 未审计：agent binary 需登录令牌

**包/来源**：公开 `acli` launcher 1.3.36/1.3.39（`acli.atlassian.com/linux/...`，17MB 静态 Go ELF）已下载；真正的 agent binary `rovodev-cli` 由 launcher 运行时拉取 · **解包**：`agent-teardown/extracted/rovo/`（仅 launcher） · **覆盖**：仅 acq——目标本体未获取，无扫描

## 结论

**未审计。** 上传面在被门槛挡住的 `rovodev-cli` binary 里，launcher 本身无快照/上传逻辑。

## 获取尝试与卡点

- npm 无包（`@atlassian/rovo-dev`、`rovodev` 等全 404）；apt repo 索引只有 `acli`；CDN 猜路径全 403。
- launcher strings 确认机制：`pkg/cmd/rovodev.executeBinary` + `tryFallback` + "Downloading new Rovo Dev version…"，插件名 `rovodev-cli`，经 `GET https://as.atlassian.com/api/v1/plugin/rovodev-cli` 下载——**401 需 Atlassian 账号 + Rovo Dev scoped API token**（go.atlassian.com/rovo-dev-api-token 创建）。staging 双胞胎 `as.staging.atl-paas.net` 同门槛。
- 官方 GitHub Action `atlassian-labs/rovo-dev-action` 证实：`acli rovodev auth login` 后才能下载。
- 值得记录：分发架构本身就是服务端凭证门——客户端须先出示 auth 才能拿到 `downloadUrl`，与 ZCode 的 credential 签发同构（只是这里门在下载侧）。

## 待办

若能合法拿到 token：`GET /api/v1/plugin/rovodev-cli`（Authorization + `X-App-Os/Arch/Version`）→ `PluginDetailsResponseModelV1{downloadUrl}` → 下载 binary → 常规静态 teardown。

## 证据锚点

```
extracted/rovo/acli（17MB stripped Go ELF，sha256 86d1dad8…）
launcher strings：pkg/cmd/rovodev.*、plugin_download_configs、/api/v1/plugin/{name}
```
