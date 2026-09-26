% F07 Qoder 1.31.0 merkle 缺漏上传 + back_flow 双路图
% 语义台账：
%   泳道 = 行为者（上：客户端 cosy daemon；下：服务端 center.qoder.sh/algo）；中线虚线 = TLS 边界
%   A 路（vorange 描边）= 服务端 merkle 点名缺漏文件 → zip 直传 → sync 注册主管线
%   B 路（vviolet 描边）= back_flow 遥测暗道：每轮 ask 追加 ~20 个 *_gzip_b64 原文字段
%   虚线灰框 = 诱饵/死代码（ContainsSensitiveDataUs 录名块零引用）
%   珊瑚边 = 服务端可控门件；端点逐字写于各节点内
% 几何台账：
%   节点 3.3×2.0cm（class=qn/qsn 各自全等），A 路主行 pitch 3.8；
%   客户端带 4.7..9.9、服务端带 0.4..3.9、TLS 边界线 y=4.3。
\begin{tikzpicture}[x=1cm,y=1cm,
  an/.style={model, minimum width=3.3cm, minimum height=2.0cm, text width=3.0cm,
             font=\scriptsize, align=center, inner sep=2pt, fill=vorange!12, draw=vorange!75},
  bn/.style={model, minimum width=3.3cm, minimum height=1.9cm, text width=3.0cm,
             font=\scriptsize, align=center, inner sep=2pt, fill=vviolet!12, draw=vviolet!70},
  sn/.style={model, minimum width=3.4cm, minimum height=1.9cm, text width=3.1cm,
             font=\scriptsize, align=center, inner sep=2pt, fill=vcoral!10, draw=vcoral!70},
  gate/.style={an, draw=vcoral!80, line width=1.1pt},
  decoy/.style={model, minimum width=3.3cm, minimum height=1.0cm, text width=3.0cm,
             font=\scriptsize, align=center, inner sep=2pt, fill=vmist!45, draw=vgray!55, densely dashed, text=vgray}]

  % ---------- 顶部主张 ----------
  \node[anchor=west, align=left, font=\small, vaudit={}] (title) at (-2.9,11.0) {{\large Qoder：服务端 merkle 点名缺漏文件直传 + back\_flow 暗道}\\[1pt] {\color{black!65}A 路三步跨边界（点名\textrightarrow 直传\textrightarrow 注册）；B 路每轮 ask 随发 \textasciitilde20 个 gzip\_b64 原文字段，零 UI}};

  % ---------- 泳道底带 ----------
  \begin{pgfonlayer}{bg}
    \fill[band] (-0.2,4.7) rectangle (20.9,9.9); % fv:noaudit
    \fill[band=vcoral] (-0.2,0.4) rectangle (20.9,3.9); % fv:noaudit
  \end{pgfonlayer}
  \vzbbox{laneC}{(-0.2,4.7)}{(20.9,9.9)}
  \vzbbox{laneS}{(-0.2,0.4)}{(20.9,3.9)}
  \node[gtag, vaudit={adjacent=laneC}] at (-0.42,8.6) {客户端\\{\tiny cosy daemon}};
  \node[gtag, vaudit={adjacent=laneS}] at (-0.42,2.4) {服务端\\{\tiny center.qoder.sh}};

  % ---------- TLS 边界 ----------
  \draw[vgray!70, dash pattern=on 4pt off 2.5pt, line width=0.7pt] (-0.2,4.3) -- (20.9,4.3); % fv:noaudit
  \node[font=\tiny, text=vgray, anchor=west, vaudit={adjacent=laneC,adjacent=laneS}] at (0.0,4.3) {TLS \textrightarrow{} \texttt{center.qoder.sh/algo}};

  % ================= 客户端·A 路主行 =================
  \node[an, vaudit={class=qn,inside=laneC}] (a1) at (1.9,8.55) {触发面 $\times$4\\{\tiny postStartHooks·init RPC\\·RAG·commit 监控\\零用户操作}};
  \node[gate, vaudit={class=qn,inside=laneC}] (a2) at (5.7,8.55) {门链\\{\tiny flag \texttt{upload.missing.}\\\texttt{files.enabled} 远端控\\\textrightarrow UI「Automatic Indexing」\\\textrightarrow 合法\textrightarrow 登录\textrightarrow codebaseId}};
  \node[an, vaudit={class=qn,inside=laneC}] (a3) at (9.5,8.55) {本地 merkle+sha256\\{\tiny .qoderignore/.git 真排除\\53 名 keep-list 漏 \texttt{.npmrc}}};
  \node[an, vaudit={class=qn,inside=laneC}] (a4) at (13.3,8.55) {映射缺漏\textrightarrow 切批\textrightarrow zip\\{\tiny $\leq$1MiB/文件\\$\cdot$ $\leq$9MiB/批\textrightarrow{} \texttt{files.zip}}};
  \node[an, vaudit={class=qn,inside=laneC}] (a5) at (17.1,8.55) {签名头\\{\tiny Md5(硬编码密钥)+Appcode\\+Bearer+X-Stilla=2 只标不拦}};

  % ================= 客户端·第二行 =================
  \node[bn, vaudit={inside=laneC}] (b1) at (5.3,5.95) {back\_flow 采集\\{\tiny doAsk 链尾 doAgentBackFlow\\file\_content/prompt/\\edit\_seq/mtree\_diff/\\git\_remote/context\\\textrightarrow{} 全 gzip\_b64 原文}};
  \node[decoy, vaudit={inside=laneC}] (dy) at (12.9,5.95) {诱饵·零引用\\{\tiny \texttt{ContainsSensitiveDataUs}}};

  % ================= 服务端行 =================
  \node[sn, vaudit={class=qsn,inside=laneS}] (s4) at (5.3,2.4) {tracking sink\\{\tiny POST \texttt{/api/v1/tracking}\\\textasciitilde20 字段/ask·flag 门·零 UI\\STILLA\_ENABLED 短路 consent}};
  \node[sn, vaudit={class=qsn,inside=laneS}] (s1) at (9.1,2.4) {merkle 比对\\{\tiny POST \texttt{/file/checkStatusV2}\\+\texttt{/bfDiscover} 仅元数据\\\textrightarrow 返 \texttt{notFoundFileIds}}};
  \node[sn, vaudit={class=qsn,inside=laneS}] (s2) at (14.0,2.4) {缺漏入库\\{\tiny multipart PUT \texttt{/file/upload}\\\texttt{files.zip} 原文\\+绝对路径\textrightarrow 返 \texttt{success\_ids}}};
  \node[sn, vaudit={class=qsn,inside=laneS}] (s3) at (18.5,2.4) {merkle sync 注册\\{\tiny initCodebase\textrightarrow startSync\\\textrightarrow updateMerkleNodes\\\textrightarrow endSync}};

  % ---------- 连线（A 路 vorange / B 路 vviolet）----------
  \draw[varr] (a1) -- (a2); \vzwire{wa12}{a1;a2}{endpoint=a1,a2 via=laneC}
  \draw[varr] (a2) -- (a3); \vzwire{wa23}{a2;a3}{endpoint=a2,a3 via=laneC}
  \draw[varr] (a4) -- (a5); \vzwire{wa45}{a4;a5}{endpoint=a4,a5 via=laneC}
  \draw[varr, vorange!80] (a3.south) -- (s1.north);
  \vzwire{wa3s1}{a3.south;s1.north}{endpoint=a3,s1 via=laneC,laneS}
  \draw[varr, vorange!80] (s1.north) -- (a4.west);
  \vzwire{ws1a4}{s1.north;a4.west}{endpoint=s1,a4 via=laneS,laneC}
  \draw[varr, vorange!80] (a5.south) -- (s2.north);
  \vzwire{wa5s2}{a5.south;s2.north}{endpoint=a5,s2 via=laneC,laneS}
  \draw[varr] (s2) -- (s3);
  \vzwire{ws23}{s2;s3}{endpoint=s2,s3 via=laneS}
  \draw[varr, vviolet!75] (b1.south) -- (s4.north);
  \vzwire{wb1s4}{b1.south;s4.north}{endpoint=b1,s4 via=laneC,laneS}

  % ---------- 底部含义框 ----------
  \node[mean, text width=19.6cm, anchor=north west, align=left, vaudit={}] (mb) at (-2.9,-0.5) {%
    \textbf{对象}：vorange=A 路缺漏文件主管线 · vviolet=B 路 back\_flow 暗道 · 珊瑚描边=服务端可控门件 · 虚线灰=死代码诱饵。\\[3pt]
    \textbf{机制}：点名能力在服务端——客户端先交 merkle 指纹清单，服务端返 \texttt{notFoundFileIds} 决定收哪些文件原文；\texttt{.npmrc}（registry token）不在 53 名 deny keep-list 内随包上行；「不同意数据政策」只落 X-Stilla=2 标记不拦截；签名密钥 Md5 硬编码（二进制内字符串「war, war never changes」）；back\_flow 门 \texttt{STILLA\_ENABLED} 在 consent 检查之前短路——开索引即开追踪。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=north, vaudit={adjacent=mb}] at ($(mb.south)+(0,-0.18)$) {Qoder 1.31.0 dual-path · 端点/字段逐字摘自 figure-pack.json mech.stages + secondary\_channels · 量级：files.zip $\leq$9MiB/批，back\_flow \textasciitilde20 字段/轮};
\end{tikzpicture}
