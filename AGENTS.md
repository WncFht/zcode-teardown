# AGENTS.md

ZCode Teardown（ZCode linux-x64 全版本逆向语料仓）：按 `manifest/versions.json` 下载 .deb → 解包 → 指纹清单 → 以版本 tag 快照进内嵌 git → 抽取签名 → 写分析笔记。

## 仓库布局

入库的是**交付物**：`manifest/`（版本清单）、`tools/`（管道脚本）、`signatures/`（每版签名快照）、`notes/`、`docs/`、`diffs/` 中手工产物。

不入库的是**可再生产出**（`.gitignore`）：`installers/`（下载的 .deb/AppImage/zip）、`extracted/`、`extracted-mac/`（解包树）、`repo/`（内嵌 git，版本 tag 语料库）、`refs/`（第三方参考 clone）、`tmp/`（lane 工作区与缓存）、根目录 `codexacp-*`（抽出的二进制）。这些目录可能极大，任何扫描/格式化/搜索命令都必须避开——`.prettierignore` 与 `.markdownlint-cli2.jsonc` 已排除，手动跑 `rg`/`find` 时同样要限范围。

## 管道

`tools/` 下五步一签名的流水线，全部带 `[lane]` 参数（lane 状态追加到 `tmp/lane-<lane>/status.jsonl`，供并行作业对账）：

1. `fetch.sh <ver> [lane]` — 按 manifest 下载并校验 size/sha512；CDN 限流故分 24MiB chunk 断点续传；磁盘 <15G 拒绝。
2. `unpack.sh <ver> [lane]` — .deb → `extracted/<ver>/`（resources 树 + HOST.json + asar 解出 `app/`）。
3. `tree_manifest.py <ver> [lane]` — 生成 `MANIFEST.json`（全树 sha256 + engine/tools/host 指纹）。
4. `commit_version.sh <ver> [lane]` — 把 extracted 树快照进 `repo/` git 并打 `v<ver>` tag（`--work-tree` 提交，磁盘无 checkout），成功后删 .deb。
5. `extract_signatures.py <ver>` — 按类别（models/endpoints/feature_flags/env_vars/plans/acp_methods/ipc_channels/plugins_skills/bundled_tools/native_modules/engine/deps）从文本与 strings 缓存抽签名 → `signatures/<ver>.json`，`--validate` 对照 `tools/signature_schema.json`。

`repo/` 是**另一个 git 仓**：只存各版本 extracted 树的 `v<ver>` tag，不是本仓历史。查版本间差异用 `git -C repo diff vA vB`，不要去翻 `extracted/` 手动 diff。

## 格式化工具链

`git commit` 会走 pre-commit：formatter 经 git-format-staged 改写暂存内容并同步工作区（两侧一致，commit 不被格式化阻断，未暂存编辑不受污染）；check 类 hook 失败才拦。前置条件：`npm install`、系统工具 `shfmt shellcheck ruff taplo actionlint autocorrect gitleaks`（本机走 pacman 已装，CI 走 brew）、`pre-commit install`。版本以 `package.json` 为唯一事实源，编辑器（`.vscode/settings.json` 的 prettierPath）与 hook 同源。

- `*.sh`：`shfmt -i 2`（gfs，经 `scripts/fmt-shell.sh`）+ `shellcheck -S warning`。zsh 脚本不在链内——两者都不支持 zsh，fmt-shell.sh 对 zsh shebang 原样透传。
- `*.py`：`ruff format`（gfs）+ `ruff check`（`ruff.toml` select=ALL + 逐条注明豁免）。
- `*.md`：`markdownlint-cli2 --fix` 原地改写（改写会 fail 一次，重新 `git add` 再提交）→ `autocorrect --stdin | prettier`（gfs）。
- `*.yaml`：`prettier`（gfs）；`*.toml`：`taplo fmt`（gfs）。缩进规则：yaml 2 空格、md 4 空格，见 `.prettierrc` overrides。
- `.github/workflows/*.yml`：`actionlint` check。
- gitleaks 拦 secret；`.gitleaks.toml` 自定义规则与精确值放行见文件注释。

CI（`.github/workflows/ci.yml`）与本地同源，本地不过 CI 必挂。

## Agent 入口约定

`AGENTS.md` 与 `.agents/` 是入库的唯一事实源（skill 本体在 `.agents/skills/`，各带 `agents/openai.yaml` 元数据）。`CLAUDE.md` 与 `.claude/skills/` 是指向它们的软链，属本机便利层、不入库；clone 后跑 `scripts/agent-links.sh` 重建。

## 项目运维约定

- 语料可再生成，交付物要入库：跑管道前确认 `.gitignore` 仍盖住产出目录；新增产出类型先加 gitignore 再跑。
- 并行作业按 lane 分目录（`tmp/lane-<id>/`），状态一律经 `emit_status.py` 落 `status.jsonl`——别在交付物里写过程状态。
- `installers/*.ok` 是下载完成标记；`fetch.sh` 会清 `.part`，中断重跑即可续传。
- mac/win 语料走 `extracted-mac/` 与 `installers/*.zip/*.exe`，管道主要面向 linux-x64 .deb。
- `strings` 缓存在 `tmp/lane-b1/strings-cache/`（按 size+mtime 失效），重复抽取零成本。
