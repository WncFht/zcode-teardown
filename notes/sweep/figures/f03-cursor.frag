% F03 Cursor 3.21.16 —— codebase-telemetry v2 影子仓 packfile 上传管线
% 语义台账：
%   泳道：上=客户端宿主（工作台/扩展宿主/Rust native），下=服务端 api2.cursor.sh
%   节点色相：vblue=工作台触发，vviolet=Rust 影子仓/旁路，vcoral=服务端与收集面，
%            vgold=门控判定，vmist 虚线=ZCode 基线对照道（非 Cursor 组件）
%   连线：主链实线箭头；A2' 旁路与对照道虚线；每条 \draw 配 \vzwire
%   关键主张：policy RPC fail-open（抛错=放行）；allowlist 主动收 4 家竞品 dot-dir；
%            enum4 由 onboarding「Recommended」卡 +24h 静默自写达成
% 几何台账：
%   客户端带 y∈[-0.85,0.85]、服务端带 y∈[-4.10,-2.40]、ZCode 对照带 y∈[-6.85,-5.95]；
%   stg 块 2.6cm 宽、客户端 3 行（class=stg 全等）；stgS 服务端 4 短行（RPC 名折行防溢出）；
%   客户端 x=1.2/3.95/6.0/7.95/10.7/13.95；服务端 x=9.2/11.95/14.7；带右缘 16.15；
%   链内 <10pt 间隙一律相邻声明（adjacent=前一节点）；道间 a2 声明 adjacent=两带。
\begin{tikzpicture}[x=1cm,y=1cm,
  stg/.style={model, minimum width=2.6cm, minimum height=1.0cm, text width=2.45cm,
              font=\scriptsize, align=center, inner sep=2pt},
  zstg/.style={model, minimum width=2.9cm, minimum height=0.66cm, text width=2.75cm,
               font=\scriptsize, align=center, inner sep=1.5pt, fill=vmist!45,
               draw=vgray!55, densely dashed, text=vgray!95!black},
  note/.style={font=\tiny, text=black!70, align=center, inner sep=1pt}]

  % ---------- 顶部主张 ----------
  \node[anchor=west, align=left, font=\small, vaudit={}] (title) at (-0.4,2.8) {{\large Cursor 影子仓 packfile 管线 —— 每 agent 请求产影子 commit，300s 批分块直传}\\[1pt] {\color{black!65}policy 门 fail-open；allowlist 主动收 \textasciitilde{}/.claude .codex .agents .cursor；enum4 静默升级获得}};

  % ---------- 泳道底带 ----------
  \begin{pgfonlayer}{bg}
    \fill[band] (-0.45,-0.85) rectangle (16.15,0.85);        % fv:noaudit
    \fill[band=vcoral] (-0.45,-4.10) rectangle (16.15,-2.40); % fv:noaudit
    \fill[band] (-0.45,-6.85) rectangle (16.15,-5.95);       % fv:noaudit
  \end{pgfonlayer}
  \vzbbox{laneC}{(-0.45,-0.85)}{(16.15,0.85)}
  \vzbbox{laneS}{(-0.45,-4.10)}{(16.15,-2.40)}
  \vzbbox{laneZ}{(-0.45,-6.85)}{(16.15,-5.95)}

  % ---------- 泳道标签（east 锚，右缘 -0.5 贴带左缘）----------
  \node[gtag, anchor=east, vaudit={adjacent=laneC}] at (-0.5,0) {客户端\\{\tiny workbench+ext+rust}};
  \node[gtag, anchor=east, vaudit={adjacent=laneS}] at (-0.5,-3.25) {服务端\\{\tiny api2.cursor.sh}};
  \node[gtag, anchor=east, vaudit={adjacent=laneZ}] at (-0.5,-6.4) {ZCode 基线\\{\tiny 对照·非组件}};

  % ================= 客户端链 =================
  \node[stg, fill=vblue!16, draw=vblue!70, vaudit={class=stg,inside=laneC}] (c1) at (1.2,0) {agent 请求钩子对\\{\tiny onDidSendRequest}\\{\tiny +FinishStreamChat}};
  \node[stg, fill=vblue!16, draw=vblue!70, vaudit={class=stg,inside=laneC,adjacent=c1}] (c2) at (3.95,0) {\texttt{triggerSnapshot}\\{\tiny reason+requestId}\\{\tiny watchers\textrightarrow{}pending}};
  \node[mdot=vgold, vaudit={inside=laneC}] (g1) at (6.0,0) {};
  \node[stg, fill=vviolet!16, draw=vviolet!70, vaudit={class=stg,inside=laneC}] (c3) at (7.95,0) {gix 影子仓 commit\\{\tiny 工作树 + \textasciitilde{}/.cursor}\\{\tiny \textcolor{vcoral}{.claude/.codex/.agents}}};
  \node[stg, fill=vblue!16, draw=vblue!70, vaudit={class=stg,inside=laneC,adjacent=c3}] (c4) at (10.7,0) {SnapshotUploader\\{\tiny 300s 批轮询}\\{\tiny \textrightarrow{} packfile 分块}};
  \node[stg, fill=vgray!14, draw=vgray!60, vaudit={class=stg,inside=laneC}] (c7) at (13.95,0) {markRegistered\\{\tiny +cleanupPackfile}\\{\tiny 本地指针收尾}};

  % 门控注记（图外上方，lead 线下指 g1）
  \node[note, vaudit={adjacent=title,adjacent=laneC}] (gn) at (6.0,1.35) {会话闸门 \texttt{codebase\_telemetry\_v2} $\land$ privacyEnum=4\\{\tiny enum4 = onboarding「Recommended」卡 +24h 静默自写}};
  \draw[lead] (gn.south) -- (g1.north); \vzwire{wgn}{gn.south;g1.north}{endpoint=gn,g1 via=laneC}

  % A2' 旁路（道间通道，虚线框=旁路）
  \node[stg, minimum height=0.72cm, fill=vviolet!10, draw=vviolet!60, densely dashed,
        vaudit={adjacent=laneC,adjacent=laneS}] (a2) at (4.9,-1.62) {A2' GitHistorySession 旁路\\{\tiny .git 近 1 月史 \textrightarrow{} 同准入上传链}};

  % ================= 服务端链 =================
  \node[stg, fill=vcoral!14, draw=vcoral!75, vaudit={class=stgS,inside=laneS}] (s1) at (9.2,-3.25) {准入 · 注册 RPC\\{\tiny\texttt{CheckCodebase}}\\{\tiny\texttt{TelemetryPolicy}}\\{\tiny \textbf{\textcolor{vcoral}{fail-open}} · 明文路径}};
  \node[stg, fill=vcoral!14, draw=vcoral!75, vaudit={class=stgS,inside=laneS,adjacent=s1}] (s2) at (11.95,-3.25) {签发 upload\\{\tiny\texttt{CreatePackfile}}\\{\tiny\texttt{Upload}}\\{\tiny \textrightarrow{} uuid+chunk\_size}};
  \node[stg, fill=vcoral!14, draw=vcoral!75, vaudit={class=stgS,inside=laneS,adjacent=s2}] (s3) at (14.7,-3.25) {分块直传\\{\tiny\texttt{UploadPackfile}}\\{\tiny\texttt{Chunk} $\times$N}\\{\tiny $\leq$64MiB \textrightarrow{} Complete}};

  % ---------- 主链连线 ----------
  \draw[varr] (c1) -- (c2); \vzwire{w1}{c1;c2}{endpoint=c1,c2 via=laneC}
  \draw[varr] (c2) -- (g1); \vzwire{w2}{c2;g1}{endpoint=c2,g1 via=laneC}
  \draw[varr] (g1) -- (c3.160); \vzwire{w3}{g1;c3.160}{endpoint=g1,c3 via=laneC}
  \draw[varr] (c3) -- (c4.160); \vzwire{w4}{c3;c4.160}{endpoint=c3,c4 via=laneC}
  \draw[varr] (c4.225) -- (s1.north); \vzwire{w5}{c4.225;s1.north}{endpoint=c4,s1 via=laneC,laneS}
  \draw[varr] (s1) -- (s2); \vzwire{w6}{s1;s2}{endpoint=s1,s2 via=laneS}
  \draw[varr] (s2) -- (s3); \vzwire{w7}{s2;s3}{endpoint=s2,s3 via=laneS}
  \draw[varr] (s3.north) -- (c7.south); \vzwire{w8}{s3.north;c7.south}{endpoint=s3,c7 via=laneS,laneC}
  \draw[varr, dash pattern=on 2.5pt off 2pt] (a2.east) -- (s1.west); \vzwire{w9}{a2.east;s1.west}{endpoint=a2,s1 via=laneS}

  % ================= 旁通信道条 =================
  \node[draw=vgray!45, fill=white, rounded corners=3pt, inner sep=4pt, align=left,
        font=\tiny, text width=15.2cm, vaudit={}] (sec) at (7.55,-5.0) {%
    \textbf{并行旁路网}（同 build 内另 7 条外发道，服务端各自门控）：\;
    \textbf{B} 索引 v1 逐文件明文 · \textbf{C} 调试 zip \textrightarrow{} S3 presign（含 userData 整树）·
    \textbf{D} FileSync 逐键正文 · \textbf{E} 行级 diff 复拍 · \textbf{F} 对话 blob 服务端点菜 ·
    \textbf{G} remote 心跳 30min · \textbf{H} 硬编码共享 Bearer 指标};

  % ================= ZCode 基线对照道 =================
  \node[zstg, vaudit={inside=laneZ}] (z1) at (3.9,-6.4) {GET /upload-credential\\{\tiny oss form+callback 模板}};
  \node[zstg, vaudit={inside=laneZ}] (z2) at (8.0,-6.4) {OSS PostObject\\{\tiny 密文 multipart 直传}};
  \node[zstg, vaudit={inside=laneZ}] (z3) at (12.1,-6.4) {OSS\textrightarrow{}callbackUrl\\{\tiny 服务端登记·零回执}};
  \draw[varr, draw=vgray!60, dash pattern=on 2.5pt off 2pt] (z1) -- (z2); \vzwire{wz1}{z1;z2}{endpoint=z1,z2 via=laneZ}
  \draw[varr, draw=vgray!60, dash pattern=on 2.5pt off 2pt] (z2) -- (z3); \vzwire{wz2}{z2;z3}{endpoint=z2,z3 via=laneZ}

  % ---------- 底部含义框 ----------
  \node[mean, text width=15.3cm, anchor=north west, align=left, vaudit={}] (mb) at (-0.45,-7.5) {%
    \textbf{对象}：vblue=工作台触发 · vviolet=Rust 影子仓与旁路 · vcoral=服务端与收集面 · vgold=会话闸门 · vmist 虚线=ZCode 基线对照（非 Cursor 组件）。\\[3pt]
    \textbf{机制}：每次 agent 请求产 1 影子 commit；300s 批把未注册 commit 打成 git packfile 分块直传\\[3pt]
    （服务端定 chunk\_size，客户端硬顶 64MiB/块，proto+gzip+Bearer）。\\[3pt]
    \textbf{缺口}：policy RPC 抛错即放行（fail-open）；indexing v1 明文道未被 v2 接管仍在。\\[3pt]
    \textbf{量级}：首 admit 上传整棵工作树+4 家竞品 dot-dir（10MB–1GB+）；增量数十 KB–数 MB / 300s。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=north, vaudit={adjacent=mb}] at ($(mb.south)+(0,-0.18)$) {cursor-A1..A7 + A2' · 端点名逐字摘自 evidence/cursor/figure-pack.json · 三段式同构对照见 F15};
\end{tikzpicture}
