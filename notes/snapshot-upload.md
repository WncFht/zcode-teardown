# ZCode 工作区快照上传功能跨版本演化调研

调研对象：ZCode IDE linux-x64 全 55 个入库版本（`manifest/versions.json`，v2.2.0–v3.12.3；3.7.1/.2/.4 三版发布后 CDN 撤下、按 `published-but-unrecoverable` 记账，边界用相邻可恢复版桥接）。方法：对 `repo/` bare 仓的 55 个 `v<tag>` 做指示符全量矩阵（28 指标 × 55 版，见 `notes/snapshot-tracking.json`）+ 19 条 lane（17 专项精读 + 2 对抗核验）读 minified bundle。每条断言附 `v<tag>:<path>` 与可 grep 字面量；不确定项进 `## REVIEW`。

## TL;DR

- 功能 **v2.3.0 首秀**（v2.2.0 全部指示符 0 命中），存活至 v3.12.3 从未移除；实现始终只在 `app/out/host/index.js`（host/agent 进程 bundle），其它 bundle 里的 `upload-credential` 命中是共享端点常量或无关的 `/feedback/attachment/upload-credential`。
- **捕获范围演化是单向 widening**：v2.x 排除 `.git`；v3.x 起根 `.git/` 被 `appendRootGitMetadataPaths`/`walkGitMetadataFiles` 整树强制打包且豁免 secret/大小/二进制过滤（reflog、pack、`.git/config` 内的 remote token 全进 tar）；v3.2.0 起嵌套 build 目录（`dist/`、`build/`、`out/` 等）从排除改为打包；v3.11.1 起 `extraManifest` 机制把应用全局配置（settings.behavior 白名单、mcp.json、用户 skills/commands/hooks（含 shell 命令串）、memory、subagents、plugins、`~/.zcode/AGENTS.md`，敏感键值 `<redacted>`）与 prompt 附件打进同一个加密 tar。
- **用户开关接线三阶段**（Q2 核心结论）：v2.3.0–v2.5.0 `repoSnapshotIndexingEnabled` 真 gate、默认关、opt-in 诚实；v2.6.0–v2.13.0 `isRepoSnapshotIndexingEffectivelyEnabled` 把默认翻成"假关真开"（UI 显示 raw flag=OFF 而管线在跑，仅显式 opt-out 才停）；v3.1.0 起该 flag 从捕获路径整体移除——**开关沦为纯装饰**，capture/upload 只受登录 token + 本地 workspace + 服务端 credential 三个运行时条件控制。v3.11.1 起两个 toggle 的取值反而被当作 payload 打进快照（`collectRepoSnapshotGlobalConfigs` 的 17 键白名单含两者）。
- **触发器**：v2.x 唯一触发 = `captureBeforePrompt`（每次 prompt，fire-and-forget，steer 逃逸）；v3.x 扩到 prompt-send / steer 双捕（≤v3.3.6）/ v4 命令 reserve-activate（v3.6.1+）/ wiki-generation / `repo-wiki-update` 任务终止相变（renderer 驱动 v3.1.x–v3.3.6 → 休眠 v3.4.0–v3.5.3 → host 相变 v3.6.1+，error 相被 `phase==="error"` 守卫排除）+ cron/OffPeakRun 两个间接 prompt 注入器；v3.6.1 起统一经 `RepoSnapshotCaptureIntentScheduler`（quarantine + 32 intents + 120s 超时）调度。无线程 timer、无 IPC 直接触发；pending 只在下一次捕获尾部 flush。
- **加密与上传管线自首秀未变**：手写 ustar+pax tar.gz → AES-256-CTR（32B key、16B nonce 前缀密文）→ 服务端 SPKI 公钥 RSA-OAEP-SHA256 wrap → **GET** `https://zcode.z.ai/api/v1/snapshot/upload-credential?workspace_id=<hash12>`（非披露所称 POST；Bearer JWT）→ OSS PostObject 表单上传 → 注册回调经 OSS callback 投递（callback body 把 `${encrypted_aes_key}` 回传服务端——持 RSA 私钥者可解包解密，明文 tar.gz 的 sha256 也随 `checksum` 字段离开本机）。schema 字面量 v2.x 内联 `/v1` → v3.1.1 起改由 `repo_snapshot_${name}/${ver}` 模板动态拼接（`repo_snapshot_extra_manifest` 因此 grep 不到）。
- **磁盘状态**：`~/.zcode/v2/repo-snapshots/`（v2.3.0–v3.1.3）→ `~/.zcode/v2/checkpoints/`（v3.2.0 起，`renameSync` 迁移，与 GitCheckpointStore 共用同 hash 子目录）。`state.json` 五个 era：单 pendingUpload → +attribution(3.1.0) → active/latest 双槽 + retry3/24h + 全量 GC(3.2.0) → +failureCount(3.2.1) → +lastCompressedSize(3.2.3) → +uploadCredentialHandle(3.6.1) → +extra-manifests/ + 磁盘配额 (3.11.1)。v2.x 无任何 GC，孤儿 .enc 累积。
- **披露报告逐条裁决**：核心指控（静默打包含 .git、AES-CTR+RSA wrap、OSS 直传、用户无法知情/关闭）对 **v3.x 成立**；对 **v2.3.0–v2.5.0 不成立**（opt-in 且 .git 被排除）；对 **v2.6.0–v2.13.0 半成立**（默认开启但开关仍真实生效，只是 UI 显示与实际状态相反）。报告的细节错误：credential 是 GET 不是 POST；`checkpoints/` 目录名仅 ≥v3.2.0 属实；`failureCount`/`lastCompressedSize` 是 v3.2.x 新增字段；`repo-wiki-update` 触发器是 3.x 新增；v3.12.2 新增的 `resolveOptimizeAgentExperienceEnabled`/`isRepoSnapshotIndexingSwitchChecked` 是 glm/zcode.cjs 里**零调用的死导出**（disclosure-response 方向，未接线）。
- **用户侧零披露**：全部 55 版中，产品内唯一相关 UI 是设置页两个开关文案（"Index Repositories for Instant Grep"/"Index new folders … <50,000 files" 与 "Improve experience … protect your data privacy"）——没有任何地方告知用户工作区被快照加密上传。

## 1. 功能首秀与载体（v2.2.0 缺席 → v2.3.0 首秀）

v2.2.0：`upload-credential`/`captureBeforePrompt`/`repoSnapshot`/`repo-snapshot` 全部 0 命中（`tmp/lane-snap-m1/matrix-capture.json`、`tmp/lane-snap-m2/matrix-crypto.json` 逐版计数）；`checkpoints`/`snapshot`/`aliyuncs`/`aes-256-ctr` 在 v2.2.0 的命中均为无关噪音——`checkpoints` 是 v2.2.0 已有的 GitCheckpointStore 本地 git 回滚（`v2.2.0:app/out/host/index.js` `refs/zcode/checkpoints/<wsHash>/<id>`），`aliyuncs` 是 Qwen provider 端点 `dashscope.aliyuncs.com`/`bailian.console.aliyun.com`，`snapshot` 269 处全是 git-diff 快照类型。

v2.3.0 首秀即完整形态：`app/out/host/index.js` 内嵌 `// ../services/src/repo-snapshot/*.ts` 源文件 banner（半可读 esbuild 输出），模块清单（v2.3.0:app/out/host/index.js 行号）：`repoSnapshotArtifact.ts` ~49467、`repoSnapshotHasher.ts`/`repoSnapshotCanonicalJson.ts` ~49735、`repoSnapshotPaths.ts` ~49766、`repoSnapshotFilter.ts` ~49800、`repoSnapshotScanner.ts` ~49857、`repoSnapshotSidecarService.ts` ~49990、`repoSnapshotStateRepo.ts` ~50120、`repoSnapshotUploadCredentialDiagnostics.ts` ~50214、`repoSnapshotUploadClient.ts` ~50265、`repoSnapshotUploadWorker.ts` ~50501；共享 schema 常量在 `v2.3.0:app/out/host/chunk-5KQASS3D.js:16656`（`REPO_SNAPSHOT_PROMPT_SCHEMA="repo_snapshot_prompt/v1"` 等）。

载体演化：v2.x 全部实现只在 `app/out/host/index.js`（`app/out/main/index.js` 仅留 banner 注释，代码被 tree-shake；`v2.13.0:app/out/main/index.js` 0 处实例化）。v3.x 同样如此——`v3.12.3` 的 `/snapshot/upload-credential` 字面量虽出现在 `main/index.js`、`main/chunk-HW54O52P.js`、`scheduler/index.js`，但那些是共享端点常量（`v3.12.3:app/out/host/index.js` 另有无关的 `/feedback/attachment/upload-credential`）；`RepoSnapshotSidecarService`/`captureBeforePrompt` 在 scheduler/main 中 0 命中（`v3.12.3` 实测）。sidecar 自 v2.3.0 起在 host bootstrap 无条件实例化（v2.3.0 `:50694`；v3.12.3 `new Zk/Wk/dc/Hk/Bk/su` 服务链），此点与披露一致。

## 2. 演化时间线总表

| 版本       | 变化                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| v2.2.0     | 功能不存在（全部指示符 0 命中）                                                                                                                                                                                                                                                                                                                                                                                                |
| v2.3.0     | 首秀：单触发（runPrompt→captureBeforePrompt）、`.git` 排除、toggle 真 gate 默认关、repo-snapshots/ 目录、GET credential、schema /v1 内联、无 GC 无 retry                                                                                                                                                                                                                                                                       |
| v2.4.0     | 触发面 +task runtime 命令队列（enqueueTaskRuntimeCommand→sendPrompt）                                                                                                                                                                                                                                                                                                                                                          |
| v2.6.0     | **默认翻转**：`isRepoSnapshotIndexingEffectivelyEnabled(settings)` 上线（`!settings→true`；`enabled!==false \|\| userConfigured!==true`），opt-out 生效但 UI 仍显示 raw flag——开关显示 OFF 时管线实际运行                                                                                                                                                                                                                      |
| v2.12.0    | 触发面 +session-mailbox（wakeSession→sendPrompt）                                                                                                                                                                                                                                                                                                                                                                              |
| v2.13.0    | OSS callback 占位符 +`x:base_snapshot_id`（2.x 唯一实质 diff）                                                                                                                                                                                                                                                                                                                                                                 |
| **v3.1.0** | **3.x 重写**：`.git` 改整树强打（`appendRootGitMetadataPaths`）；toggle 从捕获路径**整体移除**沦为装饰；+`repo-wiki-update`/`repo-wiki-generation` 触发族；+`attribution`；+`baseSnapshotId` 增量门控；+启动 `.enc`>1h GC；schema 字面量改 `repo_snapshot_${name}/${ver}` 模板（v3.1.1）                                                                                                                                       |
| v3.2.0     | **范围再扩**：嵌套 build 目录改打包（排除收窄为顶层）；根目录 `repo-snapshots/`→`checkpoints/`（renameSync 迁移，与 GitCheckpointStore 共址）；state.json active/latest 双槽 + PendingManager（retry≤3、retention≤24h、启动 repair+4 类 GC）；artifact 命名 groupId；并发合并改 latest-wins 槽；tar 改流式写（`waitForStreamDrain` + `"repo snapshot file changed while packing"` 逐条复查）                                   |
| v3.2.1     | state.json +`failureCount`/`failureCountedAt`（turn-boundary 记账，写进 prompt.json meta 与 `x:failureCount`）；+credential `max_size` 解析（非法值 warn `upload-credential 返回了非法 max_size，已忽略该字段`）+ `payload_too_large` 拒绝（`encryptedSizeBytes > credential.max_size`）                                                                                                                                       |
| v3.2.3     | +`lastCompressedSize`；`maxSizeBytes` 进 upload key + 加密前 `maxEncryptedArtifactBytes` 硬上限（`RepoSnapshotArtifactMaxSizeExceededError`）；+`isRepoSnapshotInternalPath`                                                                                                                                                                                                                                                   |
| v3.2.5     | `optimizeAgentExperienceEnabled` 默认值 true→false + 强制迁移（v3.2.0 首秀时 default true）                                                                                                                                                                                                                                                                                                                                    |
| v3.3.0     | upload-credential 端点字面量绝对 URL→相对路径（`ho(process.env,"/api/v1/snapshot/upload-credential")`）；+`pendingManager.recordFailureCountAtTurnBoundary`；≤v3.3.x `scheduleRepoSnapshotSidecarForSteer` 双触发（steer 上额外发 `content:"repo-wiki-update"`）                                                                                                                                                               |
| v3.3.6     | 扫描条目 +`modifiedTimeMs`/`changeTimeMs`（mtime/ctime **采集**首秀；manifest 落盘即剥离——字段从未进包）；扫描层 abort-aware 首秀（`throwIfRepoSnapshotScanAborted`/`createRepoSnapshotAbortError`，scan/readSample 收 `signal` 参，但 capture callsite 尚不喂 signal——管线断头）                                                                                                                                              |
| v3.4.0     | `steerSession`/`scheduleRepoSnapshotSidecarForSteer` 删除（steer 双触发终结，改走 T3 命令通道）；T4 renderer 调用删除→本地休眠（仅剩 remote relay thunk）；+scheduler 进程（SQLite `automations`，`setInterval` 20s tick）cron-dispatch 间接注入（T6）                                                                                                                                                                         |
| v3.5.2     | pending 文件 GC 守卫加固；schema 拷贝进 embeddedBrowser/browser-use bundle                                                                                                                                                                                                                                                                                                                                                     |
| v3.6.1     | +`uploadCredentialHandle`（内存 UUID、1h TTL、`key_expired`）+ `RepoSnapshotCaptureIntentScheduler`（120s job timeout、5s abort settle、32 max pending intents）；+T3 v4 命令 reserve/activate 触发；+host 侧 T4 相变驱动；+T7 OffPeakRun；**abort signal 全链贯通首秀**（`captureBeforePromptUnsafe` 首行 `t.signal?.throwIfAborted()`，credential/upload `AbortSignal.any`/`timeout`，credential 15s/objectUpload 60s 超时） |
| v3.7.3     | +`captureStage` 归属字段（"prompt"/"terminal"，host bundle 实测首秀）+ `queryId`/`historyRoundCount`/`lastTerminalQuery` 进入 OSS attribution                                                                                                                                                                                                                                                                                  |
| v3.10.0    | 两个设置开关加 analytics envelope（`featureId:settings.indexing`/`settings.privacy`）                                                                                                                                                                                                                                                                                                                                          |
| v3.11.1    | **extraManifest 上线**（boundary v3.10.2→v3.11.1）：`extra-meta/{manifest,delta}.json` + `extra-files/{global-configs,references}/`；+磁盘配额 `enforceRepoSnapshotDiskQuota`；capture callsite +`extraFiles`（prompt 附件）                                                                                                                                                                                                   |
| v3.12.1    | subagents `thoughtLevel` 字段来源改 `modelSelection.options.reasoningLevel`                                                                                                                                                                                                                                                                                                                                                    |
| v3.12.2    | glm/zcode.cjs 导出面扩张：REPO_SNAPSHOT_* 常量 + `buildRepoSnapshotWorkspaceKey`/`resolveRepoSnapshotPromptProvider` + `resolveOptimizeAgentExperienceEnabled`/`isRepoSnapshotIndexingSwitchChecked` 两个 consent helper——**全部零调用**；object upload fetch 改 undici + `redirect:"error"`（PUT/POST 两路）                                                                                                                  |
| v3.12.3    | 与 v3.12.2 快照相关区域字节一致                                                                                                                                                                                                                                                                                                                                                                                                |

## 3. Q1 捕获范围

### 3.1 排除规则（逐字，v2.x）

`v2.3.0:app/out/host/index.js`（`repoSnapshotFilter.ts` ~49800；v2.13.0 复核逐字一致）：

```js
var REPO_SNAPSHOT_MAX_FILE_BYTES = 1024 * 1024;
var dependencySegments = new Set(["node_modules"]);
var cacheSegments = new Set([".cache", ".turbo"]);
var buildOutputSegments = new Set([
    "dist",
    "build",
    "out",
    ".next",
    "coverage",
]);
var gitInternalSegments = new Set([".git"]);
var secretBasenames = new Set([
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".npmrc",
    "id_rsa",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
]);
```

`looksLikeSecretPath`：上表 basename 或结尾 `.pem`/`.key`/`.p12`/`.pfx` 或小写名含 `token`/`secret`。`shouldIncludeRepoSnapshotPath` 判定序：symlink→`unsupported`；`.git` 段→`git-internal`；依赖/缓存/构建输出段；secret→`secret`；>1MiB→`large-file`；前 8192B 采样含 NUL→`binary`。硬编码段/基名规则集，**非 .gitignore 解析器**，无文件数上限，单文件 1MiB 上限。枚举 `git ls-files --cached --others --exclude-standard -z`（git 工作时 gitignored 未跟踪文件**不**打包），失败回落 `walkFiles`（无 ignore 解析——gitignored 文件此时**会**被打包，目录剪枝集同上）。

**2.x `.git` 裁决：排除**，三重覆盖（ls-files 本就不列、filter 段规则、walkFiles 剪枝）。全 2.x 段模块语义逐字冻结（identifier-normalized diff=0，仅 bundler 改名），唯一实质变化 v2.13.0 的 `x:base_snapshot_id`。

### 3.2 3.x：`.git` 从排除到整树强打

v3.1.0 起全部 41 个 3.x tag 一致（q1-3a 对 22 版结构哈希复核、q1-3b 对 19 版 identifier-stripped 哈希 `0d21377ab4d72a8b` 复核）：`appendRootGitMetadataPaths` + `walkGitMetadataFiles` 递归追加 `<workspace>/.git/` 下**每一个文件**（objects、packfiles、refs、`logs/` reflog、config、hooks、index、LFS 缓存、`modules/<sub>/…`）；filter 链中 `.git` 段紧随 symlink 检查返回 `include:true`（symlink 优先判 `unsupported`——`.git` 符号链接仍被丢弃），**豁免 secret/大小/二进制/dep-cache-build 全部后续过滤**（`v3.12.3:app/out/host/index.js` `R5`/`F_e`，锚 `N_e`/`U_e`）。`.git` 指针文件（worktree gitfile）任意深度同样打进；嵌套 `.git/` 目录不枚举。后果：`.git/config` 里的 remote URL token、reflog、多 MB pack 全量外发——披露报告"whole workspace incl. .git history"对全部 3.x 成立。

3.x 排除表相对 2.x 的变化：v3.2.0 起 build-output 排除收窄为**顶层**（`dist|build|out|.next|coverage` 首段、`dist-*`、`*-unpacked`）+ 新增 `app.asar.unpacked` 段与 `.asar` 后缀——**嵌套 build 目录从排除改打包（widening）**；secret/1MiB/8KiB-NUL/symlink 规则不变，但 `.git` 路径全部豁免。枚举仍为 `git ls-files --cached --others --exclude-standard -z` + 失败回落 walk（walk 对 `.git` 目录剪枝但 `.git` 文件仍会进；gitignored 文件在 fallback 下会被打包）。

### 3.3 extraManifest（v3.11.1 上线）

`repo_snapshot_extra_manifest` 全语料 grep 0 命中的原因：schema 由 `` `repo_snapshot_${name}/${ver}` `` 模板拼出（`v3.12.3:app/out/host/chunk-ZH56ETHO.js` `Me("extra_manifest","v1")`）。机制出现边界 v3.10.2→v3.11.1（此前 `extraManifest`/`extra_manifest`/`extraManifestFiles` 全部 0 命中；`extraFiles` 的既有命中是无关 provider 配置拷贝 `runtime.nativeConfigExtraFiles`）。打进同一个加密 tar 的内容（`v3.11.1:app/out/host/index.js` `collectRepoSnapshotGlobalConfigs`/`buildRepoSnapshotReferenceExtraFileInputs`，`v3.12.3` 复核 `D5`/`tle`/`I5`/`Xce`）：

- `extra-meta/manifest.json`（+increment 时 `extra-meta/delta.json`），每文件 `contentHash` sha256 供增量去重；磁盘侧 `checkpoints/<ws>/extra-manifests/<hash>.json` 与 `base/next/lastAcceptedExtraManifest*` 状态字段。
- **组 `global-configs`**：`settings.behavior.json`（17 键白名单 `Tlt`/`kQe`：zcodeInteractionBehavior、askUserQuestionAutoResolutionEnabled、taskAutoArchiveEnabled/OlderThanDays、toolGrouping×3、nativeSearchEnhancementsEnabled、memoryEnabled、**optimizeAgentExperienceEnabled、repoSnapshotIndexingEnabled、repoSnapshotIndexingUserConfigured**、instantGrepIndexingEnabled、embeddedBrowserAllowInsecureCertificates、keepAwakeWhileRunning、terminalInheritSystemProfile、integratedTerminalShell；另剥离 model/provider/baseURL/baseUrl/language/theme/locale/window/layout/zoom/workspacePath/projectPath/recentProjects 键）、`mcp.json`（`loadUserMcpServers().servers` 逐字）、`skills.json`（user-scope id/name/description/enabled）、`commands.json`（global name/description/enabled/agentSource）、`hooks.json`（user-scope event/matcher/type/**command/args**/async/timeout/enabled——shell hook 命令串上传）、`memory.json`（`loadMemory("zcode")` 内容，20MiB 截断标记 `…[repo-snapshot-global-configs truncated]`）、`subagents.json`（id/name/description/tools/disallowedTools/permissionMode/thoughtLevel）、`plugins.json`、`instructions.json`（`~/.zcode/AGENTS.md` ≤20MiB）。`sanitizeUnknown` 对键名匹配 `/(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|credential|authorization|cookie|session[_-]?token|token)$/i` 的值改写 `"<redacted>"`。
- **组 `references`**：prompt 附件（callsite `extraFiles` 字段，v3.11.1 新增），`localPath` 或非 URI `ref` 解析为本地绝对路径打包；上限 16 文件/1GiB，按 mime 单文件 image 20MiB、video 200MiB、audio 20MiB、default 100MiB；inline text/base64 各 ≤20MiB。
- 引入后唯一变化：v3.12.1 subagents `thoughtLevel` 字段来源 `i.thoughtLevel`→`i.modelSelection?.options?.reasoningLevel`。

## 4. Q2 开关接线

### 4.1 三阶段演化（核心结论）

**阶段一 v2.3.0–v2.5.0：诚实 opt-in。** 唯一读取点 `indexingEnabledProvider` → `settings.repoSnapshotIndexingEnabled === true`（zod `boolean().default(false)`，如 v2.3.0 `app/out/main/chunk-4DK3FAQH.js:14714`），位于 `captureBeforePromptUnsafe` 首行（v2.3.0 `:50041`）——gate 住 capture 及下游全部 upload。UI switch `checked` 绑定 raw flag，显示≡行为。披露说法在此区间**不成立**。

**阶段二 v2.6.0–v2.13.0：默认翻转的 opt-out。** provider 改调 `isRepoSnapshotIndexingEffectivelyEnabled(settings)`（8 版逐字一致，v2.6.0 `app/out/host/chunk-LN3ISEZK.js:14211-14216` … v2.13.0 `chunk-TLP5TLT5.js:14220-14225`）：

```js
function isRepoSnapshotIndexingEffectivelyEnabled(settings) {
    if (!settings) {
        return true;
    }
    return (
        settings.repoSnapshotIndexingEnabled !== false ||
        settings.repoSnapshotIndexingUserConfigured !== true
    );
}
```

真值表：出厂默认（`enabled=false`、`userConfigured` 未设）→ `false || true` = **运行**；仅 `enabled===false && userConfigured===true`（显式 opt-out）才停。`normalizeSettingsPatch`（host+main，如 v2.13.0 `:5431-5434`）在任何布尔写入时强置 `userConfigured=true`。renderer switch `checked` 仍绑 **raw flag**（v2.6.0+ `index-*.js` `repoSnapshotIndexingEnabled===!0`）——**设置页显示 OFF 时管线实际在跑**；用户拨过一次开关后显示与行为才一致。机制是默认取反，不是开关被忽略——但净效果与披露一致。

**阶段三 v3.1.0–v3.12.3：开关沦为装饰。** `RepoSnapshotSidecarService` 类体内 0 处 flag 字面量（q2-3a 对 22 版逐处枚举、q2-3b 对 19 版复核）。`repoSnapshotIndexingEnabled` 的全部"消费点"只剩：schema 声明、`normalizeSettingsPatch` 写侧记账、设置页 switch `checked`（v3.x 改绑 `enabled===!0 && userConfigured===!0` 复合谓词）、以及 ≥v3.11.1 的 `Tlt` 白名单——**取值被当作 payload 打进快照本身**。捕获路径的实际前置条件全为运行时态：登录 token（`tokenProvider()`=`zcodeJwtToken ?? accessToken`）、`workspaceIdentity?.trim()` 为空（remote workspace 永不捕获）、服务端 credential 非 null（`data:null`→return，服务端 kill switch）、v3.11.1+ 磁盘配额、artifact ≤ maxSize。无任何 user-visible/consent/trust/实验门。披露说法在 3.x **完全成立**。

### 4.2 optimizeAgentExperienceEnabled：死配置

v3.2.0 首秀 zod `default(!0)`（**默认开**）→ v3.2.5 翻 `default(!1)` + `optimizeAgentExperienceMigrationInitialized` + `migrateOptimizeAgentExperienceDefault`（load 时强制写 false；v3.5.2 `glm/packages/browser-use-plugin/dist/mcp/server.js` 残留未 minify 注释：旧默认 true 已写入则无法区分用户选择与旧值 → 全部迁 false）。**全部 55 版中无任何功能消费点**（q2-3a/q2-3b 逐版枚举：只有 schema、迁移、隐私设置页 switch "Improve experience / Allow us to use your conversations to improve the Agent experience. We protect your data privacy and security."）。v3.10.0 起该 switch 带 analytics envelope。属死配置/占位。

### 4.3 其余门控（全版本一致）

sidecar 无条件实例化；remote workspace 跳过；JWT 缺失跳过；服务端 credential `data:null` 即 kill switch。无 `ZCODE_SNAPSHOT*` env gate（v3.12.3 env 普查命中的 `ZCODE_REPO_WIKI_MODEL_REQUEST_TIMEOUT_SECONDS` 是 repo-wiki 超时配置，非快照门）；端点经 `ho(process.env,"/api/v1/snapshot/upload-credential")`/`Wn(process.env,…)` 可被 base-URL env（`ZCODE_BASE_URL`/`ZCODE_ENDPOINT_ORIGIN`/`ZCODE_{PRODUCTION,TEST}_BASE_URL`）覆盖——部署配置非 consent。

## 5. Q3 触发器

### 5.1 v2.x：单触发

唯一上传触发 = `RepoSnapshotSidecarService.captureBeforePrompt`，`runPrompt` 内 fire-and-forget（`void context.repoSnapshotSidecar?.captureBeforePrompt({workspacePath, workspaceIdentity, taskId, traceId, content})`，v2.3.0 `:14990` → v2.13.0 `:18808`）。触发面（sendPrompt→runPrompt 的入口）：`acpService.sendPrompt`（v2.3.0+）、bots `sendPromptInBackground`（v2.3.0+）、task runtime 命令队列（v2.4.0+）、session-mailbox `wakeSession`（v2.12.0+）。**`steerPrompt` 不触发**（mid-turn steer 逃逸）。无 timer/cron/file-watch/IPC/startup/shutdown 触发；无 debounce/cooldown——仅 `runsByWorkspaceKey` 按 workspace 串行。pending 仅在下一次捕获尾部 `flushWorkspace` 重试，无独立重试循环。

### 5.2 v3.x：四类触发 + 两个间接注入器 + intent 调度器（q3-3x 逐版枚举）

- **T1 prompt-send（全 41 版）**：host RPC `sendSession` 在 `client.request` 前 `scheduleRepoSnapshotSidecar({prompt,sessionTraceId})` → `captureBeforePrompt({taskId:sessionId,queryId,content:prompt.content,captureStage:"prompt"(v3.7.3+)})`。sendSession 双实现中仅 primary 带 sidecar 调用——retry 不双捕。
- **T2 steer 双触发（仅 v3.1.0–v3.3.6）**：`steerSession`→`scheduleRepoSnapshotSidecarForSteer` 每次 steer 连发**两次** `captureBeforePrompt`——一次 `content:"repo-wiki-update"`、一次 `content:prompt.content`。v3.4.0 删除 RPC+helper，steer 改走 T3 命令通道。
- **T3 v4 命令包络（v3.6.1+）**：host RPC `sendConversationCommandV4` 分发前 `reserveRepoSnapshotSidecar` 占 intent 槽（`sendText`、`createSession`+`firstInput` 分支），`status==="accepted"` 后 `activate`（settle-once 对），catch/非 accepted `cancel`。
- **T4 任务终止捕获 `content:"repo-wiki-update"`**：`captureTaskCompleteUpdate`→`captureRepoWikiSnapshot`→`captureBeforePrompt({captureStage:"terminal"(v3.7.3+),queryId,historyRoundCount})`。驱动方式三易：v3.1.x–v3.3.6 renderer `task_complete` 处理器 RPC 直调（v3.1.0 `app/out/renderer/assets/index-FDpoXnTx.js` @2185605）；v3.4.0–v3.5.3 renderer 调用删除→**本地休眠**，仅剩 `createRemoteRepoWikiServiceRelay` RPC thunk；v3.6.1+ host 侧相变驱动 `processSummary`→`emitTerminalAndReady`→intent 调度。**error 相不捕获**：`phase==="error"` 守卫自 v3.6.1 首秀即存在（v3.6.1 `oe=j==="error"`；v3.12.3 `Ze=Y.phase==="error";if(!Ze&&oe)`——两处实测）；`completedSuccess`/`completedInterrupted` 捕获。
- **T5 wiki 生成（全 3.x）**：repo-wiki `generate`/`regenerateFailedPages` 完成时 `captureRepoWikiSnapshot`，`content:"repo-wiki-generation"`。
- **T6 cron 注入（v3.4.0+，间接）**：scheduler 进程 SQLite `automations`/`automation_runs`，`setInterval` **20s tick**，run-claim 窗口 300s → `cron-dispatch-request`→main→host `dispatchCronRun`→createTask+send→落 T1 路径。非独立捕获触发，是 prompt 注入器。
- **T7 OffPeakRun（v3.6.1+，间接）**：`dispatchOffPeakRun` 调度离峰 automation → 同 T6 路径。
- **远程 relay**：`createRemoteRepoWikiServiceRelay` 暴露 `captureTaskCompleteUpdate`/`refreshExistingWikiAfterTaskComplete` thunk——v3.4.0–v3.5.3 间 T4 的唯一 caller。

负面结论（41 版全查）：**无 timer 驱动捕获**（setInterval 全是 telemetry/续约/memory reporter）、**无 startup flush**（`pendingManager.initialize()` 仅 repair+ 清理，`flushWorkspace` 仅 captureBeforePromptUnsafe 尾部一个调用点）、无 file-watch/idle/shutdown/专用 IPC 触发（无 `repo-snapshot` 命名 IPC 通道）。并发合并三代：串行队列 `runsByWorkspaceKey`（v3.1.x）→ latest-wins pending 槽 `capturesByWorkspaceKey`（v3.2.0–v3.5.3，中间 prompt 被丢弃）→ intent 队列 32 深 120s（v3.6.1+，`jTe=12e4,KTe=5e3,HTe=32` → v3.12.3 `Slt/Plt/blt` 同值）。

## 6. Q4 加密与上传管线（q4 全 55 版核实）

### 6.1 管线形状（全版本恒定，仅两处结构微调）

tar.gz（手写 ustar+pax，`createGzip()` 默认参数无库无 flag——v2.3.0 `writeGzipTar` ~49549；v3.12.3 `ict`/`writeRepoSnapshotPlainArchive`；**v3.2.0 改流式写**：`waitForStreamDrain` + 逐条 size/mtime 复查 `"repo snapshot file changed while packing"`）→ AES-256-CTR（`createCipheriv("aes-256-ctr",key,nonce)`，32B key + 16B nonce 作密文前缀，`nonceEncoding:"ciphertext-prefix-16-byte"`；无 GCM/CBC 变体）→ 公钥 wrap：`publicEncrypt({key:publicKeySpkiPem, padding:RSA_PKCS1_OAEP_PADDING, oaepHash:"sha256"}, dataKey)`→base64 `encryptedDataKey`（SPKI→PKCS1 回退 `normalizePublicKeySpkiPem`；服务端必须发 `encryption.algorithm==="RSA-OAEP-256"` 否则 `assertSupportedEncryption` 抛；`keyId=String(encryption.key_version)`；客户端自报 `keyWrapAlgorithm:"rsa-oaep-sha256"`）。envelope `repo_snapshot_encrypted_artifact/v{1,2}`：`{contentAlgorithm:"aes-256-ctr",keyWrapAlgorithm,keyId,nonceEncoding,aadEncoding:"canonical-json-v1",aad:{workspaceKeyHash,kind,manifestHash,baseManifestHash,compression:"tar.gz"},encryptedDataKey,plaintextSha256}`——**AAD 仅是元数据记录，CTR 模式无认证**。abort 演化两段：扫描层 **v3.3.6** 起收 `signal`（`Yn`/`throwIfRepoSnapshotScanAborted` 抛 `"Repo snapshot scan was cancelled"`，但 `captureBeforePromptUnsafe` callsite 不传 signal——断头线）；全链贯通 **v3.6.1**（capture 首行 `t.signal?.throwIfAborted()`、scan/credential/upload 全带 signal、scheduler `AbortSignal.any` 包裹、upload `AbortSignal.timeout(60s)`——v3.4.0 文件内的 `throwIfAborted` 是 repo-wiki 分页生成器的同名 helper，非快照路径）。

### 6.2 上传

- credential：**GET**（非披露的 POST）`https://zcode.z.ai/api/v1/snapshot/upload-credential?workspace_id=<sha256(workspaceKey)[:12]>`，Bearer JWT，v3.12.3 15s 超时（`Hlt`）；test 环境 `zcode.chatglm.site`。credential 复用机制两代：v2.3.0–v3.5.3 `uploadCredentialsByCacheKey` 缓存键 `sha256(token).hex[:16]:<workspaceId>`，`requestUploadTarget` 取出即 `delete`（**用后即删**，v2.3.0 源码直证）；v3.6.1 起改 `uploadCredentialsByHandle`——`getUploadKey` 每次签发随机 UUID handle 存 `{credential,tokenHash:wIe(token),workspaceId,expiresAt:now+1h(Glt)}`，`requestUploadTarget` 校验 workspaceId+tokenHash 不符即 `key_expired`，过期逐出靠 `pruneExpiredUploadCredentials`（v3.12.3 `Wk` 类实测）。
- 响应字段强校验 `resolveUploadCredentialData`：`callback.{url,body,content_type}`、`oss.{host,path,policy,x_oss_signature,x_oss_signature_version,x_oss_credential,x_oss_security_token,x_oss_date}`、`encryption.{public_key,key_version,algorithm}`、`snapshot.{snapshot_id,base_snapshot_id?}`、`max_size?`。
- OSS PostObject multipart：`success_action_status=200`、policy、x-oss-signature/-version/-credential/-date/-security-token、`key=<oss.path>`、`file=<repo-snapshot.tar.gz.enc>`、`callback=<base64{callbackUrl,callbackBody(占位符已填充),callbackBodyType}>`；v3.1.0+ 附 attribution 表单字段（sessionId/queryId/requestId/failureCount/captureStage/historyRoundCount，每个键另以 `x:<key>` 镜像进 callback body）。**死分支**：`uploadPutObject`（PUT+`duplex:"half"`+`createReadStream`）自 v2.3.0 存在，分发 `target.method==="PUT"?put:post`，但全版本服务端 target 均为 POST——PUT 路从未被走到。`oss.host` 永远服务端下发，`aliyuncs`/`OSSAccessKeyId`/`VITE_ZCODE_ENDPOINT_ORIGIN` 在管线代码中全版本缺席（v2.x 的 aliyuncs 命中是 dashscope 模型端点）。fetch 实现 `objectUploadFetch ?? globalThis.fetch` → **v3.12.2 改 `?? Wlt`（undici fetch）并加 `redirect:"error"`**。注意勿与 `uploadOssForm`（feedback 附件上传器，`----zcode-feedback-` 手工 multipart）混淆。
- **注册回调经 OSS callback 投递**（不存在独立的 client→server 注册调用）：`encodeOssCallback` 把 `{callbackUrl,callbackBody(占位符已填充),callbackBodyType}` base64 进 `callback` 表单字段；`replaceOssCallbackPlaceholders` 填 `${update_type}`（`toServerUpdateType`：baseline→`full`、increment→`incremental`）、`${checksum}`=`sha256:<明文tar.gz的sha256>`（明文哈希离机）、`${encrypted_aes_key}`（wrap 后 AES key 回传，持私钥者解密）、`x:*` 镜像字段（`x:update_type`/`x:checksum`/`x:encrypted_aes_key`，v2.13.0+`${x:base_snapshot_id}`——base_snapshot_id 只以 x:-前缀形式替换；`Object.hasOwn` 守卫+URL 编码值）。
- 重试：v2.x 无 retry 计数（pendingUpload 下次 prompt 顺带重试，每次捕获覆盖旧 pending）；v3.2.0+ `maxRetryCount=3`/`maxRetentionMs=24h`（`olt`/`ilt`），失败 promote latest 槽；`base_not_found|base_invalid|hash_mismatch` 清 accepted manifest 强制 rebaseline；v3.6.1+ flush 走 `consumePendingCredential` 消费 pending 的 handle，`key_expired`/`payload_too_large`/`base_*` 各自映射丢弃 + 清理分支。
- 尺寸：artifact ≤ `min(服务端 max_size, 6GiB/3≈2GiB)`（`O5`/`mlt`/`glt`）；`max_size` 字段 v3.2.1 起解析（非法值 warn 剥离），v3.2.3 起进 upload key + 加密前 `maxEncryptedArtifactBytes` 硬上限；加密后超限走 `Nk` 记 `lastCompressedSize` 删产物不上传。

### 6.3 schema 版本

v2.x–v3.1.0 内联字面量 `repo_snapshot_{manifest,manifest_hash,prompt,delta,encrypted_artifact,encryption_aad,upload_key,upload_target}/v1`（v3.1.0 实测 `repo_snapshot_manifest/v1` 仍内联）。**v3.1.1 一次完成模板化 + /v2 升级**（直接核实 `v3.1.1:app/out/host/chunk-TDZVVJU4.js`：`Le(e,n){return`repo_snapshot_${e}/${n}`}`，调用参数 `manifest/prompt/delta/encrypted_artifact/encryption_aad → Cn="v2"`，`manifest_hash → RC="v1"`、`upload_key/upload_target → ff="v1"`；v3.2.0 `Be`/`Tn/yP/Ef` 同构）。v3.11.1+ 新增 `extra_manifest/v1`、`extra_delta/v1`。

## 7. Q5 磁盘状态

根：`getAppConfigDir()`=`$ZCODE_DATA_BASE_DIR||~`+`/.zcode/v2`。子目录名边界：**`repo-snapshots/`（v2.3.0–v3.1.3）→ `checkpoints/`（v3.2.0 起，`migrateLegacyRepoSnapshotRootDir` 每进程一次 `renameSync`）**——披露所称 checkpoints/ 仅 ≥v3.2.0 属实。**共址碰撞**：GitCheckpointStore 的 `checkpointsDir` 同为 `join(getAppConfigDir(),"checkpoints")` 且 workspaceHash 算法相同（`sha256(workspaceIdentity||workspacePath)[:12]`）——v3.2.0 后两个功能共享 `checkpoints/<sameHash>/`（GitCheckpointStore 写 `<id>.json`，repo-snapshot 写 `state.json`+子目录）。

`state.json` era（v2.3.0→v3.12.3）：A=单 `pendingUpload`{kind,encryptedArtifactPath,encryptionEnvelopePath,manifestPath,baseManifestHash?,nextManifestHash,createdAt}+lastAcceptedManifest{Hash,Path}（v2.3.0–v2.13.0）；B=+`pendingUpload.attribution`{sessionId(sess_ 剥前缀),queryId?,requestId}（v3.1.0–v3.1.3）；C=+`activeUpload`/`latestPendingUpload` 双槽（`pendingUpload`=active 镜像）、pending 条目 +`attemptCount/lastAttemptAt/groupId`（v3.2.0）；C1=+顶层 `failureCount`、条目 +`failureCountedAt`（v3.2.1）；C2=+`lastCompressedSize`{encryptedSizeBytes,workspaceSizeBytes,manifestHash,recordedAt}（v3.2.3）；C3=+`uploadCredentialHandle`（v3.6.1）；C4=+`extraManifestPath`、`base/nextExtraManifestHash`、顶层 `lastAcceptedExtraManifest*`（v3.11.1）。

`pending/` 语义：唯一 drain 是捕获尾部的 `flushWorkspace`——无 startup/周期 flush。v2.x–v3.1.x 单 pending 一次上传机会，新捕获直接覆盖（孤儿 .enc 累积，v2.x 无 GC）；v3.2.0+ active/latest 双槽，`failPendingUpload` promote latest，`shouldExhaustPending` 于 attempt≥3 或 age≥24h 丢弃；v3.2.1+ 失败 pending 在下个 turn boundary 记 `failureCountedAt`+`failureCount++`（写入 prompt.json meta 随包上传）。GC：v2.x 无；v3.1.0 启动扫 `.enc`>1h；v3.2.0+ init repair+4 类 GC（enc/tmp/envelope/manifests，protected-paths 豁免）；v3.11.1+ 每捕获 `enforceRepoSnapshotDiskQuota`（resident(pending+tmp)+2×maxSize≤3×maxSize，超额 `discardStalePendingForDiskQuota` 或中止捕获）。

## 8. Q6 用户侧披露

**裁决：全部 55 版零披露。** 没有任何 label/toast/dialog/tooltip/onboarding consent/隐私声明/EULA/设置描述告知用户工作区会被快照打包加密上传。逐版 consent 面审计（onboarding/login、隐私弹窗、telemetry 提示、EULA/ToS、上传警告）唯一沾边的现存文案均不相关：`conversationShare.disclosure`（用户主动分享警告）、feedback "Upload diagnostic logs"（用户主动动作）、Chrome-profile 导入 `adminConsent`、支付 ToS 链接、插件 `privacyPolicy` 元数据。`repo-snapshots` 字面量唯一出现在内部诊断导出类别表 `isNonLogStateArchivePath`（v3.12.3 `app/out/main/index.js`），用户不可见。

四个 era 的唯一用户可见面（q6 全 55 版枚举）：

| Era | 版本           | 索引区 UI                                                                                                                                               | 上传披露                                                                                                                            |
| --- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A   | v2.2.0         | 无（功能缺席）                                                                                                                                          | 无                                                                                                                                  |
| B   | v2.3.0–v2.13.0 | 单开关 "Index Repositories for Instant Grep"+BETA 徽标，描述 "Automatically index repositories to improve codebase context."                            | 无                                                                                                                                  |
| C   | v3.1.0–v3.1.3  | 双开关："Index new folders … <50,000 files" + "Index repositories for instant grep (Beta)"                                                              | 无；instantGrep 描述含 **"All data is stored locally."**；repoWiki 删除确认框首现 "OSS repository upload records are not affected." |
| D   | v3.2.0–v3.12.3 | 同上 + 第三个开关 "Improve experience / Allow us to use your conversations to improve the Agent experience. We protect your data privacy and security." | 无；上述两句持续存在                                                                                                                |

证据锚：era B 字典 `settings.indexing.repoTitle`/`settings.indexing.beta`/`settings.indexing.repoDescription`（v2.3.0 `app/out/renderer/assets/index-dRzdAvuf.js`；v2.13.0 `index-BI2MDF1h.js`，zh-CN 同英文原文）；era C 字典 v3.1.0 `usageStatsUiParts-D67hVPHM.js` + 组件 `mzt`（`index-FDpoXnTx.js`），v3.12.3 字典 `IntlProvider-DvAen4Dk.js`；`OSS 仓库上传记录`/`OSS repository upload records` 字面量仅见于 `repoWiki.deleteConfirmDescription`。

三个加重事实：① **"All data is stored locally." 挂在 instantGrep 开关上而非快照开关**——但同区紧邻显示，用户读到的是"本地存储"承诺贴在快照控制旁边；② v3.x 开关 `checked` 双条件（`enabled===!0 && userConfigured===!0`）意味着被静默开启的 flag 显示为 OFF；③ "Improve experience" 是唯一 consent 形状文案但作用域是 "conversations"，不构成快照管线披露。repoWiki 删除框的 OSS 一句是全语料唯一 OSS 承认——且说的是 repoWiki 上传记录而非工作区快照。

## 9. Q7 resolveOptimizeAgentExperienceEnabled

`aKt(e){return e===!0}` 严格布尔解析器，`glm/zcode.cjs`（引擎 bundle，`node zcode.cjs app-server --stdio` 子进程，模块顶层无条件 `HMs()` 自执行、无法被 require）于 **v3.12.2 新增导出**（v3.12.1 缺席，v3.12.3 字节一致）。姊妹导出 `isRepoSnapshotIndexingSwitchChecked`（`enabled===!0 && userConfigured===!0`——刻意-consent 检查）同版新增；其函数体在 v3.12.1 renderer 已存在但同样无调用。**两个导出全部零调用**：全 tag `git grep -F` 仅 glm/zcode.cjs 自含（def+debug-name+export getter 三处），无 JS/二进制消费方；变体名（`resolveAgentExperience*`/`effectiveOptimize*` 等）全语料 0 命中。v3.12.1→v3.12.3 上传路径零变化（upload-credential 区字节一致、`resolveUploadCredentialData` 一致、scheduler 与 zcode.cjs .2↔.3 字节一致）。裁决：**披露响应方向的 staged API surface（consent-check 助手 + repo_snapshot schema 常量提升为引擎导出），但在本 artifact 未接线**——无任何"原无条件变有条件"。

## 10. 披露报告逐条裁决

| 披露断言                                                   | 裁决                                                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| tars 整个 workspace 含 .git/LFS/reflog                     | **v3.x 成立**（v3.1.0 起根 .git/ 整树强打豁免过滤）；**v2.x 不成立**（.git 三重排除）                            |
| AES-256-CTR + RSA-OAEP wrap                                | **成立**（v2.3.0 起逐字：`aes-256-ctr`、nonce 前缀、`RSA-OAEP-256`、SPKI PEM、key_version）                      |
| POST /api/v1/snapshot/upload-credential                    | **方法错误**：GET+Bearer JWT；POST 是 OSS PostObject 表单上传本身                                                |
| OSS 直传 + 注册回调                                        | **成立**（PostObject + OSS callback 投递 `${encrypted_aes_key}`/`${checksum}`/`${update_type}`/`x:*`）           |
| 私钥仅服务端                                               | **成立**（客户端只用公钥 wrap；wrapped key 经 callback 回传服务端→服务端可解密）                                 |
| 触发 captureBeforePrompt + repo-wiki-update                | **半对**：2.x 仅 prompt 单触发；repo-wiki-update 系 3.x 新增（v3.x = 5 类直接触发 + 2 间接注入器，见 §5.2）      |
| sidecar 无条件实例化                                       | **成立**（全版本 host bootstrap 无条件 new）                                                                     |
| toggle 不 gate capture/upload                              | **3.x 成立**（开关装饰化）；**v2.3.0–v2.5.0 不成立**（真 opt-in）；**v2.6.0–v2.13.0 净效果成立但机制是默认取反** |
| `~/.zcode/v2/checkpoints`                                  | **≥v3.2.0 成立**；v2.x–v3.1.x 实为 `repo-snapshots/`                                                             |
| status JSON: kind=baseline/failureCount/lastCompressedSize | **部分成立**：`kind` 自始有；`failureCount` v3.2.1、`lastCompressedSize` v3.2.3 才有——报告描述的是 ≥v3.2.3 形态  |
| extra manifest（哈希全局配置进上传）                       | **v3.11.1+ 成立**（global-configs+references 两组；settings.behavior 白名单含两个 toggle 取值）；此前不存在      |
| 无任何用户披露                                             | **成立**（全部 55 版，唯二 UI 是两个设置开关文案，均不提前上传/加密）                                            |

## REVIEW

1. ~~schema /v2 边界分歧~~ **已裁决**：v3.1.1 host chunk 现场核实——模板化与 /v2 升级同版完成（`Le("manifest",Cn)`，`Cn="v2"`；hash/key/target 三常量仍 /v1），q5 记的 v3.2.0 是同构延续而非边界。
2. `failureCount` 字面量在 v3.1.0 已出现（m1 矩阵）但属 renderer `usageStatsService` 限流器（freshnessKey/nextAllowedAt）——与快照无关；快照字段首秀按 q5 记 v3.2.1。
3. walkFiles fallback（git 缺席时）会打包 gitignored 文件；v2.x 与 3.x 皆然——子模块 gitlink 边界或致捕获 abort（q1-2x 推断未执行验证）。
4. `.git` 强打的动机（披露称"全量 git 历史外发" vs wiki-indexing 优化）不可判——机制层面全部 root `.git/**` 无过滤进包。
5. `prompt.json` 的 `content`（原始 prompt 文本）无长度上限——附件/memory 有显式 cap，prompt 文本没有（anchor-new REVIEW）。
6. secret 过滤覆盖有洞：`.netrc`/`credentials.json`/`.git-credentials`/`.env.*.local`/`id_rsa_backup`/`.ssh/config` 不匹配 secret 规则（anchor-new 枚举）；且 `.git` 内文件全豁免过滤——`.git/config` 的 token 直接外发。
7. `uploadCredentialsByHandle` 仅存内存；`uploadCredentialHandle` 持久化进 state.json 但重启后必 `key_expired`（设计上如此）。
8. `isRepoSnapshotInternalPath` 丢弃 checkpoints 根内路径——v3.2.0 后与 GitCheckpointStore 共址，理论上互相干扰面已查无实证。
9. main/scheduler/chunk 中的 `/snapshot/upload-credential` 字面量为共享常量非第二实现——`RepoSnapshotSidecarService`/`captureBeforePrompt` 在 scheduler/main 0 命中（v3.6.1、v3.12.3 实测）；main chunk 内 `repo_snapshot_*` 命中为 schema 常量+renderer 类型，非第二状态库（q5 REVIEW，低风险未穷举）。
10. `captureStage` 字段首秀边界经直接 grep 核定 **v3.7.3**（v3.6.5 0 命中、v3.7.3 起 4 命中/版）——q2-3b 表中 "v3.12.1 adds captureStage" 记法有误（其注记的应是 Tlt 白名单或 thoughtLevel 变化）；§2 已按 v3.7.3 修正。
11. ~~§6 待 q4 核对~~ **已落地并修正两处**：abort signal 全链贯通实为 **v3.6.1**（v3.3.6 仅扫描层收 signal、callsite 断头；q4 记的 "v3.4.0" 是 repo-wiki 同名 helper）；mtime/ctime 采集首秀 **v3.3.6**（v3.1.0–v3.3.5 均不采集）。verify-a（A1–A18 全 CONFIRMED）+ verify-b（B1–B16:15 CONFIRMED、1 WRONG 已修——T3 函数名 `sendConversationCommandV4` 非 `executeConnectionCommandV4`）。
12. verify-b 残余小注：tracking.json `failureCount` v3.1.0 格 count=5 是 `app/` 域计数（另有 2 处 glm/zcode.cjs 噪音在域外，scope_caveats 已注）；`ZCODE_REPO_WIKI_MODEL_REQUEST_TIMEOUT_SECONDS` 存在但属 repo-wiki（§4.3 已按此措辞）。
