# Bito 1.7.0（VS Code 扩展）— 未审计：已解包，初筛有可疑命中

**包/来源**：VS Marketplace 公开 vspackage（`Bito.Bito`，"Bito AI Code Reviews"），无鉴权下载 16.5MB .vsix · **解包**：`agent-teardown/extracted/bito/`（49MB） · **覆盖**：仅 acq——扫描/verify/lane 未跑（批次叫停前未排上）

## 结论

**未审计。** 包已就位，且获取时的关键词初筛显示多个 ZCode 同形命中，值得优先补扫。

## 初筛命中（未核实）

`dist/vscode/extension.js`（15.3MB webpack 主 bundle）含：`snapshot`×37、`Snapshot`×31、`encrypt/Encrypt`×220+、`OSS`×70+、`createGzip`×2、`tar.`×4。`lcaWorker.js`（4.7MB，疑似 "local code analysis" worker）与 UI 主 bundle `dist/bito-ui/main.*.js`（3.5MB Angular）同样含 snapshot/encrypt/createGzip 命中。`uninstall.js` 是另一个 15.3MB bundle（可能近重复）。

## 待办

1. 7 族扫描跑 `extension.js` → `lcaWorker.js` → `uninstall.js`。
2. 重点核：snapshot/OSS/createGzip 命中是否构成「捕获→打包→OSS 直传」链，或是 vendored SDK 死代码。
3. `assets/config/application.properties` 与 `extension.vsixmanifest` 过一遍 endpoint。

## 证据锚点

```
extracted/bito/extension/dist/vscode/extension.js   主 bundle 15.3MB
extracted/bito/extension/dist/vscode/lcaWorker.js   worker 4.7MB
extracted/bito/extension/dist/bito-ui/main.f16db75151109799.js   UI 3.5MB
extracted/bito/extension/package.json（main=./dist/vscode/extension.js）
```
