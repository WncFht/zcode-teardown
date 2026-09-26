# Fitten Code 扩展 1.1.4 — 休眠的完整上传管线 + 活体 beacon

**包/来源**: VS Marketplace `FittenTech.Fitten-Code` vsix 1.1.4（公共 gallery 端点）
**解包**: `~/src/agent-teardown/extracted/fitten/`（extension.js 经字符串表混淆，已还原为 `.norm.js`——原文件零字面 IP/PEM）
**覆盖**: acq + 7 族扫描 + 双镜 verify + 4 lane（**缺 altpaths lane**），证据 `evidence/fitten/journal-digest.json`

## 结论

内含一条**完整但休眠**的 ZCode 式工作区上传管线（module `pz`/`UploadProject`）：工作区清单→服务端挑选文件→zip→base64 POST 到**硬编码裸 IP** `http://116.177.253.45:15006`。本构建中 `getUploadProjectConfig()` 硬编码 `"Off"`、`fittencode.uploadProject` 命令未注册、类无实例化——**管线完整但无活触发器**（改构建/配置即可武装）。同时存在活体通道：每 10 分钟的项目路径+userId beacon（同 IP，明文 HTTP）、启动即发的历史聊天迁移上传、extension↔本地 agent 的 AES-256-CBC+RSA-OAEP 加密 WS IPC（**两端同一对 RSA 密钥**，混淆级非安全级）。

## 休眠管线（完整还原）

1. `getFilesName` 走工作区（仅 `workspaceFolders[0]`），过滤：dotfile/dot-dir 全跳（`.git`/`.env` 不入）、`.gitignore`（`ignore` 包，含祖先目录上溯）、二进制嗅探、深度>10 / 50MB 总 / 500 文件 / 300KB 单文件（超大取 100 随机行截 10KB）。
2. `POST http://116.177.253.45:15006/save_file_and_directory_names?ft_token=<userId>` 发全量 path+md5 清单 → 服务端回 `paths` 白名单挑选要收的文件（'No change' 短路）。
3. 选中文件拷入 `os.tmpdir()/addfile*` → vendored archiver zip（glob `**` dot:true，zlib 9）→ base64 → `POST /add_files_and_directories` → 轮询 `/execution_progress`（webview 显示为 "indexing"）。
4. PostHog flag `upload-project` 可远程调高上限；自托管 PostHog `ph.fittenlab.cn`。
5. 卫生瑕疵：`files.exclude` 读进变量但**从不应用**；`finally` 只清 staging 目录，`<projectPathName>.zip` **残留 tmpdir**。

## 活体通道

| 通道                            | 内容                                                             | 门槛                                             | 判定                                        |
| ------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| `execution_progress` beacon     | `{project_id: 工作区路径名, ft_token: userId}` → 裸 IP 明文 HTTP | 知识库 singleton 10 分钟轮询 + webview RPC，自动 | **活体元数据外发**（明文 HTTP）             |
| PostHog `upload_project_record` | projectPathName                                                  | 每次上述调用                                     | 遥测                                        |
| LegacyHistoryMigrationExporter  | 旧聊天历史 globalState → 服务端签发 uploadSessionId/batchId 上传 | activate() 即启动                                | 活体上传（本地 agent 中转）                 |
| extension↔agent WS              | 全 RPC 载荷 AES-256-CBC + RSA-OAEP                               | ws://localhost                                   | 本地 IPC，**同一 RSA keypair 双端**——仅混淆 |

## consent 面

- 无任何 UI 提及上传：nls key `fittencode.useAutoUploadProject.open`（"Automatic Project Index Creation/自动创建项目索引"）是**孤儿**——不在 package.json configuration 里，也无代码读取。
- `fittencode.indexRepository`（"Index Repository"）实际建的是**本地** `.fittencode/embedding/repository.json`，与上传无关——名字具有误导性。
- 隐私政策/设置页均无上传披露。

## 证据锚点

`.norm.js` module `pz`（~1.98MB 偏移）：`UploadProject`、`sendUserUpdateFile`、`getFilesName`、`runUploadProject`；`getUploadProjectConfig()` 字面 `"Off"`；`http://116.177.253.45:15006/{save_file_and_directory_names,add_files_and_directories,execution_progress}`；`LegacyHistoryMigrationExporter`；`encryptString/decryptString`（同一 PEM 模数 `p/0P6QgAeK8e59r384uc…`）。
