# CodeFuse（蚂蚁集团）— 未审计：分发渠道已关，仅有替代包

**包/来源**：目标为 VS Code 扩展 `.vsix`（从未公开枚举版本）；替代包 CodeFuse IDE 0.7.0 win-x64（commit 54d0ef32，2024-12-24 构建）已下载解包 · **解包**：`agent-teardown/extracted/codefuse/win-x64/app-64/resources/app` · **覆盖**：仅 acq——扫描/verify/lane 未跑（批次叫停前未排上）

## 结论

**未审计。** 目标 artifact（CodeFuse VS Code 扩展）无法通过公开渠道获得；蚂蚁自家的 OpenSumi 系 Electron IDE 替代包已在本地待扫。

## 获取尝试与卡点

- 官方文档（yuque.antfin.com/roi-doc/codefuse/vscode-plugin）确认唯一分发渠道是 `codefuse.alipay.com/welcome/download`，需支付宝登录 + 人工申请试用——且该域名 DNS 现已指向蚂蚁办公内网（`gz-rr2.office.spanner.alipaydns.com`，TLS reset），双重不可达。
- VS Marketplace / OpenVSX / JetBrains marketplace 均无此扩展；无 Wayback 存档；amctats OSS bucket 上 JetBrains zip 403。
- IDE bundle 内发现蚂蚁私有 OpenVSX 协议 registry（`twebgwnet.alipay.com/atsmarketplace`，硬编码 accountId/masterKey），`/api/-/search` 等路由返回 400 RouterGroupNotFound——路由组已下线。
- 替代包：官方 CodeFuse IDE NSIS 从 `gw.alipayobjects.com/os/cloud-ide/codefuse-ide/0.7.0/` 下载（125MB，github.com/codefuse-ai/codefuse-ide releases 链接），7z 解出 ~534MB。

## 待办

1. 扫替代包 `out/renderer/code/index.js`（12MB workbench+AI bundle）与 `out/node/index.js`（3MB，含 marketplace svc 与 DEFAULT_ALIPAY_CLOUD_REGISTRY 凭证）——内含 inline 补全、chat、`/v1/api/invoke(+WithStream)` → `tsingyan.antgroup.com`。
2. 按 ZCode 特征 grep：workspace tar/zip、upload-credential、OSS PostObject、AES/RSA wrap。
3. bundle 内有"目前产品处于定向邀测阶段"字样——服务端门槛可能同样挡住运行时遥测路径。

## 证据锚点

```
extracted/codefuse/win-x64/app-64/resources/app/out/renderer/code/index.js（12MB AI bundle）
out/main/index.js（1.2MB Electron main）
out/node/index.js（3MB，DEFAULT_ALIPAY_CLOUD_REGISTRY 凭证）
scratch 取证：cf-yq-sourcecode.txt（官方安装文档）、cf-app-entry.html → 已归档 evidence/codefuse/
```
