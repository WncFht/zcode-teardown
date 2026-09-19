#!/usr/bin/env python3
"""Render figures for notes/snapshot-upload.md into notes/assets/.

Produces four SVGs (CJK glyphs embedded as paths, no viewer font needed):
  - snapshot-upload-pipeline.svg    end-to-end pipeline swim-lane diagram
  - snapshot-upload-timeline.svg    feature-boundary gantt across the 55 tags
  - snapshot-upload-consent.svg     effective-vs-displayed consent step chart
  - snapshot-upload-visibility.svg  who-sees-what byte matrix

usage: uv run --with matplotlib python tools/render_snapshot_upload_figs.py
"""

import os
import subprocess

import matplotlib as mpl

mpl.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "notes", "assets")

plt.rcParams.update(
    {
        "font.family": ["Noto Sans CJK SC", "DejaVu Sans"],
        "font.monospace": ["Noto Sans Mono CJK SC", "DejaVu Sans Mono"],
        "svg.fonttype": "path",
        "figure.dpi": 100,
    }
)

C_LOCAL = "#eef4fb"
C_WIRE = "#fdf3e0"
C_SERVER = "#fbecec"
C_EDGE = "#4a6fa5"
C_RED = "#c0392b"

THEME = {
    "scope": "#d62728",
    "consent": "#ff7f0e",
    "wire": "#1f77b4",
    "control": "#2ca02c",
    "attrib": "#9467bd",
    "base": "#7f7f7f",
}


def corpus_tags():
    out = subprocess.run(
        ["git", "-C", os.path.join(ROOT, "repo"), "tag", "-l"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.split()

    def key(tag):
        return [int(x) for x in tag.lstrip("v").split(".")]

    return sorted(out, key=key)


def box(ax, rect, text, fc="white", fs=9.5):
    x, y, w, h = rect
    ax.add_patch(
        FancyBboxPatch(
            (x, y),
            w,
            h,
            boxstyle="round,pad=0.06,rounding_size=0.12",
            fc=fc,
            ec=C_EDGE,
            lw=1.2,
        )
    )
    ax.text(
        x + w / 2,
        y + h / 2,
        text,
        ha="center",
        va="center",
        fontsize=fs,
        linespacing=1.45,
    )


def arrow(ax, p0, p1, color="#333", ls="-"):
    ax.annotate(
        "",
        xy=p1,
        xytext=p0,
        arrowprops={
            "arrowstyle": "-|>",
            "color": color,
            "lw": 1.4,
            "linestyle": ls,
        },
    )


def fig_pipeline():
    fig, ax = plt.subplots(figsize=(16, 9.6))
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 9.6)
    ax.axis("off")

    ax.add_patch(Rectangle((0.1, 0.2), 5.3, 9.2, fc=C_LOCAL, ec="none", zorder=0))
    ax.add_patch(Rectangle((5.7, 0.2), 4.9, 9.2, fc=C_WIRE, ec="none", zorder=0))
    ax.add_patch(Rectangle((10.9, 0.2), 5.0, 9.2, fc=C_SERVER, ec="none", zorder=0))
    for x, label in ((2.75, "本机"), (8.15, "网线（明文可见字节）"), (13.4, "服务端")):
        ax.text(x, 9.05, label, ha="center", fontsize=13, weight="bold", color="#444")

    ax.axvline(5.55, ymin=0.03, ymax=0.95, color=C_RED, lw=2, ls=(0, (6, 4)))
    ax.text(
        5.55,
        0.5,
        "← 离开本机 →",
        ha="center",
        fontsize=10.5,
        weight="bold",
        color=C_RED,
    )
    ax.axvline(10.75, ymin=0.03, ymax=0.95, color="#999", lw=1.4, ls=(0, (6, 4)))
    ax.text(10.75, 0.5, "服务端 ↔ 服务端", ha="center", fontsize=9, color="#777")

    box(
        ax,
        (0.5, 8.05, 4.5, 0.85),
        "触发器（§6）\nprompt · wiki · 任务终止 · cron · OffPeak",
    )
    box(
        ax,
        (0.5, 6.7, 4.5, 1.0),
        "取 uploadKey（§5.2）\n"
        "登录 token → getUploadKey\n"
        "缓存未命中 → 右侧 credential GET",
    )
    box(
        ax,
        (0.5, 5.15, 4.5, 1.25),
        "枚举 + 过滤（§3）\n"
        "git ls-files -z（回落 walkFiles）\n"
        "symlink 弃 · 根 .git v3.1+ 强收豁免过滤\n"
        "secret 基名/后缀 · >1MiB · NUL 采样 binary",
    )
    box(
        ax,
        (0.5, 3.75, 4.5, 1.1),
        "ustar+pax tar → createGzip()（§4.1）\n"
        "根目录 = 服务端 snapshot_id\n"
        "{meta,files,extra-meta,extra-files}",
    )
    box(
        ax,
        (0.5, 2.15, 4.5, 1.3),
        "AES-256-CTR：密文 = nonce(16B)‖ct\n"
        "dataKey ← credential 的 SPKI 公钥\n"
        "RSA-OAEP-SHA256 wrap → encryptedDataKey\n"
        "→ pending 落盘（.enc+envelope+manifest+uploadKey）",
    )
    box(
        ax,
        (0.5, 0.75, 4.5, 1.0),
        "flush（§5.3）：uploadCredentialHandle\n"
        "→ 内存查表取回同一 credential（不发 HTTP）\n"
        "→ 组 multipart POST；handle 死 → key_expired 丢弃",
    )

    box(
        ax,
        (6.05, 6.6, 4.2, 1.2),
        "GET <origin>/api/v1/snapshot/upload-credential\n"
        "?workspace_id=sha256(workspaceKey)[:12]\n"
        "Bearer JWT · v3.1+ X-* 指纹头 · v3.6.1+ 15s 超时",
    )
    ax.text(
        8.15,
        5.82,
        "=> 响应：{snapshot:{snapshot_id, base_snapshot_id?},\n"
        " encryption:{public_key, key_version},\n"
        " oss:{host,path,policy,x_oss_*},\n"
        " callback:{url,body,content_type}, max_size?}",
        ha="center",
        fontsize=8.5,
        family="monospace",
        color="#555",
    )
    box(
        ax,
        (6.05, 0.9, 4.2, 1.25),
        "POST multipart → oss.host（PostObject V4）\n"
        "file = repo-snapshot.tar.gz.enc（nonce‖密文）\n"
        "bare 归因字段明文 · callback=base64 JSON",
    )

    box(
        ax,
        (11.25, 5.2, 4.4, 1.7),
        "阿里云 OSS\n"
        "存 .enc · 解 callback 字段（base64 非加密）\n"
        "把已填充 callbackBody POST 回 callbackUrl\n"
        "——响应体客户端从不解析（协议盲点）",
    )
    box(
        ax,
        (11.25, 1.6, 4.4, 1.8),
        "zcode 后端（callbackUrl 接收方）\n"
        "encrypted_aes_key + sha256(明文包) + x:* 归因\n"
        "RSA 私钥解 dataKey → 解 tar 得全部明文\n"
        "按 update_type=full|incremental 记账",
    )

    arrow(ax, (2.75, 8.05), (2.75, 7.73))
    arrow(ax, (2.75, 6.7), (2.75, 6.43))
    arrow(ax, (2.75, 5.15), (2.75, 4.88))
    arrow(ax, (2.75, 3.75), (2.75, 3.48))
    arrow(ax, (2.75, 2.15), (2.75, 1.78))
    arrow(ax, (5.0, 7.35), (6.05, 7.35))
    arrow(ax, (6.05, 7.0), (5.0, 7.0), color="#888", ls=(0, (4, 3)))
    arrow(ax, (5.0, 1.35), (6.05, 1.5))
    arrow(ax, (10.25, 1.75), (11.25, 5.3))
    arrow(ax, (13.45, 5.2), (13.45, 3.42))

    ax.text(
        8.15,
        8.15,
        "承载：workspaceKeyHash(48bit) + JWT + X-* 指纹头",
        ha="center",
        fontsize=8.5,
        color="#666",
    )
    ax.text(
        8.15,
        0.5,
        "承载：.enc 密文 + bare 归因明文 + callback=base64",
        ha="center",
        fontsize=8.5,
        color="#666",
    )
    ax.text(
        13.6,
        4.3,
        "callbackBody 明文\n（wrap 后 key+sha256+归因）",
        ha="left",
        fontsize=8,
        color="#666",
    )
    ax.text(
        8.0,
        0.08,
        "v3.14.0 起该管线整体移除——本图描述存活期（v2.3.0–v3.12.3）行为",
        ha="center",
        fontsize=10,
        weight="bold",
        color=C_RED,
    )

    for ext in ("svg", "pdf"):
        fig.savefig(
            os.path.join(OUT_DIR, f"snapshot-upload-pipeline.{ext}"),
            bbox_inches="tight",
        )
    plt.close(fig)


# (label, theme, start_tag, end_tag) — end=None means survived until the v3.14.0 removal
REMOVAL_TAG = "v3.14.0"
LAST_LIVE_TAG = "v3.12.3"
TIMELINE = [
    ("功能存在（管线恒定）", "base", "v2.3.0", None),
    ("开关真实门控上传", "consent", "v2.3.0", "v2.5.0"),
    ("显示关 / 实际在跑", "consent", "v2.6.0", None),
    ("X-* 指纹头 + x-request-id", "wire", "v3.1.0", None),
    ("根 .git/ 整树强打", "scope", "v3.1.0", None),
    ("嵌套 build 目录入包", "scope", "v3.2.0", None),
    ("状态根 → checkpoints/", "base", "v3.2.0", None),
    ("failureCount 归因字段", "attrib", "v3.2.1", None),
    ("max_size 解析 + payload_too_large", "control", "v3.2.1", None),
    ("大小上限强制 + 自排除", "control", "v3.2.3", None),
    ("env 解析端点（可换 origin）", "wire", "v3.3.0", None),
    ("扫描层 abort（断头线）", "control", "v3.3.6", "v3.6.4"),
    ("intent 调度器 · 15s 超时 · 全链 abort", "control", "v3.6.1", None),
    ("captureStage / historyRoundCount", "attrib", "v3.7.3", None),
    ("extraManifest 全局配置入包", "scope", "v3.11.1", None),
    ("磁盘配额 enforce", "control", "v3.11.1", None),
    ("pack 级 abort", "control", "v3.12.3", None),
]


def fig_timeline(tags):
    idx = {t: i for i, t in enumerate(tags)}
    last = len(tags) - 1
    fig, ax = plt.subplots(figsize=(15, 7.2))
    ax.set_xlim(-0.5, last + 0.5)
    ax.set_ylim(-1.2, len(TIMELINE))

    for row, (label, theme, start, end) in enumerate(TIMELINE):
        y = len(TIMELINE) - 1 - row
        x0 = idx[start]
        x1 = idx[end] if end else idx[LAST_LIVE_TAG]
        ax.broken_barh(
            [(x0 - 0.42, x1 - x0 + 0.84)],
            (y - 0.32, 0.64),
            facecolors=THEME[theme],
            alpha=0.85,
            edgecolor="white",
        )
        ax.text(-0.7, y, label, ha="right", va="center", fontsize=10)
        ax.text(
            x0 - 0.5,
            y,
            start.lstrip("v"),
            ha="right",
            va="center",
            fontsize=8,
            color="#555",
        )

    minor_seen = set()
    ticks, labels = [], []
    for i, t in enumerate(tags):
        minor = ".".join(t.split(".")[:2])
        ax.axvline(i - 0.5, color="#e3e3e3", lw=0.7, zorder=0)
        if minor not in minor_seen:
            minor_seen.add(minor)
            ticks.append(i)
            labels.append(minor)
    ax.set_xticks(ticks)
    ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=9)
    ax.set_yticks([])
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)

    handles = [
        Rectangle((0, 0), 1, 1, fc=THEME[k], alpha=0.85)
        for k in ("scope", "consent", "wire", "control", "attrib", "base")
    ]
    ax.legend(
        handles,
        ["捕获范围", "同意/门控", "传输协议", "中止/资源", "归因字段", "基础"],
        loc="lower right",
        ncol=6,
        fontsize=9,
        framealpha=0.9,
    )
    ax.axvline(
        idx[REMOVAL_TAG] - 0.5,
        color=C_RED,
        lw=2,
        ls=(0, (6, 4)),
        zorder=5,
    )
    ax.text(
        idx[REMOVAL_TAG] - 0.55,
        len(TIMELINE) - 0.4,
        "v3.14.0\n整体移除",
        ha="right",
        va="top",
        fontsize=10,
        weight="bold",
        color=C_RED,
    )
    ax.set_title(
        "快照上传功能边界演化（56 个入库 tag，横轴按版本排序）", fontsize=12, pad=10
    )
    for ext in ("svg", "pdf"):
        fig.savefig(
            os.path.join(OUT_DIR, f"snapshot-upload-timeline.{ext}"),
            bbox_inches="tight",
        )
    plt.close(fig)


def fig_consent(tags):
    idx = {t: i for i, t in enumerate(tags)}
    last = len(tags) - 1
    xs = list(range(len(tags)))

    effective = [1.0 if idx["v2.6.0"] <= i <= idx[LAST_LIVE_TAG] else 0.0 for i in xs]
    display = [0.0 for _ in xs]

    fig, ax = plt.subplots(figsize=(14, 4.6))
    ax.set_xlim(-0.5, last + 0.5)
    ax.set_ylim(-0.55, 1.75)

    ax.axvspan(
        idx["v2.6.0"] - 0.5,
        idx["v2.13.0"] + 0.5,
        color="#f6c9c9",
        alpha=0.55,
        zorder=0,
    )
    ax.text(
        (idx["v2.6.0"] + idx["v2.13.0"]) / 2,
        1.5,
        "显示 OFF · 实际 ON",
        ha="center",
        fontsize=10,
        weight="bold",
        color=C_RED,
    )
    ax.axvspan(
        idx["v3.1.0"] - 0.5,
        idx[LAST_LIVE_TAG] + 0.5,
        color="#dfe8f5",
        alpha=0.6,
        zorder=0,
    )
    ax.text(
        (idx["v3.1.0"] + idx[LAST_LIVE_TAG]) / 2,
        1.5,
        "开关移出管线：恒运行（唯一门=服务端 credential 签发）",
        ha="center",
        fontsize=10,
        weight="bold",
        color="#2c5282",
    )
    ax.axvline(idx[REMOVAL_TAG] - 0.5, color=C_RED, lw=2, ls=(0, (6, 4)))
    ax.text(
        idx[REMOVAL_TAG] - 0.4,
        1.62,
        "v3.14.0 功能族整体移除",
        ha="right",
        fontsize=9.5,
        weight="bold",
        color=C_RED,
    )

    ax.step(
        xs,
        effective,
        where="post",
        color=C_RED,
        lw=2.4,
        label="引擎实际生效（默认用户）",
    )
    ax.step(
        xs,
        display,
        where="post",
        color="#555",
        lw=2.4,
        ls="--",
        label="设置页显示状态（默认用户）",
    )

    for tag, note in (
        ("v2.3.0", "opt-in\n默认关"),
        ("v2.6.0", "effectively-enabled\n取反→默认开"),
        ("v3.1.0", "开关脱离管线"),
    ):
        ax.annotate(
            note,
            xy=(idx[tag], 0.5),
            xytext=(idx[tag], -0.42),
            ha="center",
            fontsize=8.5,
            arrowprops={"arrowstyle": "->", "color": "#888", "lw": 1},
        )

    minor_seen = set()
    ticks, labels = [], []
    for i, t in enumerate(tags):
        minor = ".".join(t.split(".")[:2])
        if minor not in minor_seen:
            minor_seen.add(minor)
            ticks.append(i)
            labels.append(minor)
    ax.set_xticks(ticks)
    ax.set_xticklabels(labels, rotation=60, ha="right", fontsize=8)
    ax.set_yticks([0, 1])
    ax.set_yticklabels(["关", "开"], fontsize=11)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.legend(loc="center left", fontsize=10, framealpha=0.9)
    ax.set_title(
        "同意门三阶段：界面显示与引擎生效的背离（默认配置、未手动改动开关的用户）",
        fontsize=12,
        pad=8,
    )
    for ext in ("svg", "pdf"):
        fig.savefig(
            os.path.join(OUT_DIR, f"snapshot-upload-consent.{ext}"),
            bbox_inches="tight",
        )
    plt.close(fig)


VIS_CELL = {
    "plain": ("明文", "#f5b7b1"),
    "decryptable": ("密文·可解", "#f9e79f"),
    "sealed": ("密文·不可解", "#aed6f1"),
    "hash": ("哈希", "#f8c471"),
    "none": ("—", "#eceff1"),
    "mem": ("仅内存", "#d5f5e3"),
}

VIS_ROWS = [
    ("文件内容+路径（含根 .git/ v3.1+）", "plain", "decryptable", "sealed"),
    ("prompt 全文（无截断）", "plain", "decryptable", "sealed"),
    ("全局配置/skills/AGENTS.md（v3.11.1+）", "plain", "decryptable", "sealed"),
    ("明文 tar.gz sha256（checksum）", "plain", "plain", "plain"),
    ("AES dataKey（32B）", "mem", "decryptable", "sealed"),
    ("归因字段（sessionId 等 ≤6 个）", "plain", "plain", "plain"),
    ("workspaceKeyHash（48bit 假名）", "none", "plain", "none"),
    ("Bearer JWT", "none", "plain", "none"),
    ("snapshot_id", "plain", "plain", "none"),
    ("state.json / pending / manifests", "plain", "none", "none"),
    ("客户端 IP / TLS / 时序", "none", "plain", "plain"),
]


def fig_visibility():
    cols = ["本机磁盘/内存", "zcode 服务端", "阿里云 OSS"]
    nrows = len(VIS_ROWS)
    fig, ax = plt.subplots(figsize=(12.5, 6.4))
    ax.set_xlim(0, 3)
    ax.set_ylim(-1.4, nrows + 1)
    ax.axis("off")

    for c, name in enumerate(cols):
        ax.add_patch(
            Rectangle((c + 0.02, nrows + 0.05), 0.96, 0.8, fc="#4a6fa5", ec="none")
        )
        ax.text(
            c + 0.5,
            nrows + 0.45,
            name,
            ha="center",
            va="center",
            fontsize=12,
            weight="bold",
            color="white",
        )

    for r, (label, *cells) in enumerate(VIS_ROWS):
        y = nrows - 1 - r
        ax.text(
            -0.08,
            y + 0.42,
            label,
            ha="right",
            va="center",
            fontsize=10,
        )
        for c, key in enumerate(cells):
            text, color = VIS_CELL[key]
            ax.add_patch(
                Rectangle((c + 0.02, y + 0.04), 0.96, 0.8, fc=color, ec="white", lw=1.5)
            )
            ax.text(c + 0.5, y + 0.44, text, ha="center", va="center", fontsize=10)

    ax.text(
        1.5,
        -0.75,
        "密文·可解 = 对端持 RSA 私钥可还原明文（zcode 服务端）　"
        "密文·不可解 = 仅作存储中转（OSS 无私钥）　"
        "归因字段同时以 bare 表单字段 + callbackBody 双路明文离机",
        ha="center",
        fontsize=9.5,
        color="#444",
    )
    ax.text(
        1.5,
        -1.2,
        "（该管线 v3.14.0 起整体移除，矩阵描述存活期 v2.3.0–v3.12.3）",
        ha="center",
        fontsize=9.5,
        weight="bold",
        color=C_RED,
    )
    ax.set_title("离机字节可见性矩阵（谁实际看到什么形态的数据）", fontsize=12, pad=10)
    for ext in ("svg", "pdf"):
        fig.savefig(
            os.path.join(OUT_DIR, f"snapshot-upload-visibility.{ext}"),
            bbox_inches="tight",
        )
    plt.close(fig)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    tags = corpus_tags()
    fig_pipeline()
    fig_timeline(tags)
    fig_consent(tags)
    fig_visibility()
    print("wrote 4 figures (svg+pdf) to", OUT_DIR)


if __name__ == "__main__":
    main()
