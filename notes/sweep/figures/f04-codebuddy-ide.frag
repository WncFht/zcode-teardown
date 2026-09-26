% F04 CodeBuddy IDE 4.12.0 一扇四门图（四条独立远端门控的内容外发通道）
% 语义台账：
%   行 = 四条通道：A /file/history · B /code/report(+missing 回捞) · C codebase→COS(主干) · D 日志→COS
%   列 = 采集(client) | 远端门(独立 flag，珊瑚) | 外发(wire，橙) | 服务端实收(落地，青)
%   竖虚线 x=8.8 = client/server 边界；C 道底部珊瑚注记 = 状态栏谎报
% 几何台账：
%   卡 4.1×1.30cm（class=cc 全等）；行心 0/-1.9/-4.0/-6.18；行带半高 0.82（C 道 1.05）。
%   各格中线刻意留短词——横线 wire 落在格心高度，避免蹭字。
\begin{tikzpicture}[x=1cm,y=1cm,
  cc/.style={model, minimum width=4.1cm, minimum height=1.30cm, text width=3.8cm,
             font=\scriptsize, align=center, inner sep=2pt},
  colh/.style={font=\small\bfseries, inner sep=6pt}]

  % ---------- 顶部主张 ----------
  \node[font=\large, anchor=west, vaudit={class=txt}] (title) at (-3.3,2.6) {CodeBuddy IDE：一扇四门 —— 四条通道各自持独立远端 flag，状态栏谎称 searching};

  % ---------- 列头 ----------
  \node[colh, vaudit={adjacent=row0}] (h1) at (2.05,1.45) {采集（client）};
  \node[colh, vaudit={adjacent=row0}] (h2) at (6.55,1.45) {远端门（独立 flag）};
  \node[colh, vaudit={adjacent=row0}] (h3) at (11.05,1.45) {外发（wire）};
  \node[colh, vaudit={adjacent=row0}] (h4) at (15.55,1.45) {服务端实收};

  % ---------- client/server 边界 ----------
  \draw[black!40, dash pattern=on 3pt off 2.4pt, line width=0.5pt] (8.8,1.15) -- (8.8,-7.22); % fv:noaudit

  % ---------- 行带 ----------
  \begin{pgfonlayer}{bg}
    \fill[band] (-0.18,-0.82) rectangle (17.62,0.82); % fv:noaudit
    \fill[band] (-0.18,-2.72) rectangle (17.62,-1.08); % fv:noaudit
    \fill[band=vcoral] (-0.18,-5.05) rectangle (17.62,-2.95); % fv:noaudit
    \fill[band] (-0.18,-7.07) rectangle (17.62,-5.43); % fv:noaudit
  \end{pgfonlayer}
  \vzbbox{row0}{(-0.18,-0.82)}{(17.62,0.82)}
  \vzbbox{row1}{(-0.18,-2.72)}{(17.62,-1.08)}[adjacent=row0]
  \vzbbox{row2}{(-0.18,-5.05)}{(17.62,-2.95)}[adjacent=row1]
  \vzbbox{row3}{(-0.18,-7.07)}{(17.62,-5.43)}[adjacent=row2]

  % ---------- 行标签 ----------
  \node[gtag, vaudit={adjacent=row0,adjacent=a1}] (ga) at (-0.36,0) {A · 文件历史\\{\tiny /file/history}};
  \node[gtag, vaudit={adjacent=row1,adjacent=b1}] (gb) at (-0.36,-1.9) {B · 编辑快照\\{\tiny /code/report}};
  \node[gtag, vaudit={adjacent=row2,adjacent=c1}] (gc) at (-0.36,-4.0) {C · 代码库原文\\{\tiny 主干管线}};
  \node[gtag, vaudit={adjacent=row3,adjacent=d1}] (gd) at (-0.36,-6.25) {D · 日志收集\\{\tiny 24h zip}};

  % ================= row0 A /file/history =================
  \node[cc, fill=vblue!16, draw=vblue!70, vaudit={class=cc,inside=row0}] (a1) at (2.05,0) {已打开文件全文快照\\ +逐编辑 \{old,new,diff\}\\{\tiny focus-loss 30s/2h/随机$\leq$5 重放}};
  \node[cc, fill=vcoral!22, draw=vcoral!75, vaudit={class=cc,inside=row0}] (a2) at (6.55,0) {\texttt{llm-data} flag\\{\tiny fail-closed}\\{\tiny GET /v3/config/llm\_data}};
  \node[cc, fill=vorange!20, draw=vorange!75, vaudit={class=cc,inside=row0}] (a3) at (11.05,0) {POST \texttt{/file/history}\\{\tiny getReportUrl}\\{\tiny 触发：prompt/关页/定时}};
  \node[cc, fill=vteal!18, draw=vteal!70, vaudit={class=cc,inside=row0}] (a4) at (15.55,0) {文件全文\\ +编辑时序 diff};
  \draw[varr] (a1) -- (a2); \vzwire{wa12}{a1;a2}{endpoint=a1,a2 via=row0}
  \draw[varr] (a2) -- (a3); \vzwire{wa23}{a2;a3}{endpoint=a2,a3 via=row0}
  \draw[varr] (a3) -- (a4); \vzwire{wa34}{a3;a4}{endpoint=a3,a4 via=row0}

  % ================= row1 B /code/report =================
  \node[cc, fill=vblue!16, draw=vblue!70, vaudit={class=cc,inside=row1}] (b1) at (2.05,-1.9) {append-only 编辑 diff 快照\\{\tiny 零上下文}\\{\tiny uri 绝对路径+改前全文 \textasciitilde20\%}};
  \node[cc, fill=vcoral!22, draw=vcoral!75, vaudit={class=cc,inside=row1}] (b2) at (6.55,-1.9) {\texttt{CodeEditsTracking}\\{\tiny 服务端点菜}\\{\tiny +/code\_edits/missing 回捞}};
  \node[cc, fill=vorange!20, draw=vorange!75, vaudit={class=cc,inside=row1}] (b3) at (11.05,-1.9) {POST \texttt{/code/report}\\{\tiny 批量回捞}\\{\tiny /api/v1/code\_edits/missing}};
  \node[cc, fill=vteal!18, draw=vteal!70, vaudit={class=cc,inside=row1}] (b4) at (15.55,-1.9) {编辑历史\\ +回补点名文件};
  \draw[varr] (b1) -- (b2); \vzwire{wb12}{b1;b2}{endpoint=b1,b2 via=row1}
  \draw[varr] (b2) -- (b3); \vzwire{wb23}{b2;b3}{endpoint=b2,b3 via=row1}
  \draw[varr] (b3) -- (b4); \vzwire{wb34}{b3;b4}{endpoint=b3,b4 via=row1}

  % ================= row2 C codebase→COS =================
  \node[cc, fill=vblue!16, draw=vblue!70, vaudit={class=cc,inside=row2}] (c1) at (2.05,-4.0) {merkle 全树逐文件原文\\{\tiny $\leq$1MiB/5000 文件}\\{\tiny 无密钥名黑名单}};
  \node[cc, fill=vcoral!22, draw=vcoral!75, vaudit={class=cc,inside=row2}] (c2) at (6.55,-4.0) {\texttt{Codebase} flag\\{\tiny +handshake}\\{\tiny upload\_addr\textrightarrow{}COS STS}};
  \node[cc, fill=vorange!20, draw=vorange!75, vaudit={class=cc,inside=row2}] (c3) at (11.05,-4.0) {\texttt{putObject}$\times$N \textrightarrow{}COS\\{\tiny +index 登记}\\{\tiny copilot-codebase-\ldots4699}};
  \node[cc, fill=vteal!18, draw=vteal!70, vaudit={class=cc,inside=row2}] (c4) at (15.55,-4.0) {索引文件原文\\ +路径树+md5};
  \node[font=\tiny, text=vcoral!85!black, fill=white, inner sep=1.2pt, rounded corners=1pt,
        vaudit={inside=row2,adjacent=c2,adjacent=c3,adjacent=c4}] (decoy) at (11.05,-4.86) {状态栏谎称 searching\ldots(N\%) 实为上传中 · 登录页宣称 Completed Locally};
  \draw[varr] (c1) -- (c2); \vzwire{wc12}{c1;c2}{endpoint=c1,c2 via=row2}
  \draw[varr] (c2) -- (c3); \vzwire{wc23}{c2;c3}{endpoint=c2,c3 via=row2}
  \draw[varr] (c3) -- (c4); \vzwire{wc34}{c3;c4}{endpoint=c3,c4 via=row2}

  % ================= row3 D 日志→COS =================
  \node[cc, fill=vblue!16, draw=vblue!70, vaudit={class=cc,inside=row3}] (d1) at (2.05,-6.25) {近 24h ext 日志 zip\\{\tiny +ExtraPaths}\\{\tiny prompts/路径/工具参数}};
  \node[cc, fill=vcoral!22, draw=vcoral!75, vaudit={class=cc,inside=row3}] (d2) at (6.55,-6.25) {\texttt{log.upload.interval}\\{\tiny >0 纯远端推送}\\{\tiny +upload\_check 预检}};
  \node[cc, fill=vorange!20, draw=vorange!75, vaudit={class=cc,inside=row3}] (d3) at (11.05,-6.25) {GET \texttt{/v2/logs/}\\{\tiny \textrightarrow{}COS}\\{\tiny \texttt{upload\_credentials}\,$\to$\,zip}};
  \node[cc, fill=vteal!18, draw=vteal!70, vaudit={class=cc,inside=row3}] (d4) at (15.55,-6.25) {日志全文\\{\tiny <base>/<userId>/}};
  \draw[varr] (d1) -- (d2); \vzwire{wd12}{d1;d2}{endpoint=d1,d2 via=row3}
  \draw[varr] (d2) -- (d3); \vzwire{wd23}{d2;d3}{endpoint=d2,d3 via=row3}
  \draw[varr] (d3) -- (d4); \vzwire{wd34}{d3;d4}{endpoint=d3,d4 via=row3}

  % ---------- 底部含义框 ----------
  \node[mean, text width=18.6cm, anchor=north west, align=left, vaudit={}] (mb) at (-3.3,-7.55) {%
    \textbf{对象}：vblue=客户端采集 · vcoral=远端门（各自独立 flag，UI 不可见） · vorange=外发通道 · vteal=服务端实收 · 竖虚线=client/server 边界。\\[3pt]
    \textbf{机制}：四门无共享开关——\texttt{Codebase}/\texttt{llm-data}/\texttt{CodeEditsTracking}/\texttt{log.upload.interval} 任一路被服务端 flag 点亮即自动外发；本地 32 个 \texttt{codingcopilot.*} 设置无一覆盖数据行为；C 道为三段式凭证管线（handshake\textrightarrow{}upload\_addr STS\textrightarrow{}putObject\textrightarrow{}index 登记），B 道另有服务端点名回捞，状态栏文案与真实动作相反。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=north, inner sep=5pt, vaudit={adjacent=mb}] at ($(mb.south)+(0,-0.18)$) {four-door egress · CodeBuddy IDE 4.12.0 · 门全为服务端 flag（figure-book §4.1.3）· C 道即 F15 同构实例 · 5.6.2 起实现消失仅剩 flag（F11 lane3）};
\end{tikzpicture}
