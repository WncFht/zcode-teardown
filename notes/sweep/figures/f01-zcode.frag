% F01 ZCode 工作区快照上传管线泳道图（对照基线；存活 v2.3.0–v3.12.3，v3.14.0 移除）
% 语义台账：
%   泳道 = 信任域：client（Electron sidecar，vblue）/ server（zcode.z.ai，vcoral）/ oss（aliyun OSS，vorange）
%   节点 = 管线动作；连线①–④ = 跨信任域流量（图例集中在 server 带左侧空白）
%   虚线灰框 = 移除标记（v3.14.0 全管线清零）
%   关键语义：credential 一跳下发 snapshot_id/OSS form/RSA pubkey/callback 模板/max_size；
%     data:null 为服务端拒发后门；callback 由 OSS 服务端发起——客户端无回执
% 几何台账：
%   client 带含两行节点（y=0.95 触发段 / y=-1.2 处理段），节点 min 2.15×1.45cm（class=cnode 全等）；
%   wcred1 走 x≈8.8 走廊（b1/b2 之间）；server 带 [-4.40,-2.65]、oss 带 [-6.15,-4.85]。
\begin{tikzpicture}[x=1cm,y=1cm,
  cnode/.style={model, minimum width=2.15cm, minimum height=1.45cm, text width=1.95cm,
                font=\scriptsize, align=center, inner sep=2pt},
  snode/.style={model, minimum width=3.0cm, minimum height=1.6cm, text width=2.75cm,
                font=\scriptsize, align=center, inner sep=2pt},
  onode/.style={model, minimum width=5.8cm, minimum height=1.3cm, text width=5.4cm,
                font=\scriptsize, align=center, inner sep=2pt},
  ghost/.style={rounded corners=3pt, inner sep=2pt, font=\tiny, align=center,
                fill=vmist!45, draw=vgray!50, densely dashed, text=vgray},
  wnum/.style={circle, draw=vink!80, fill=white, minimum size=0.32cm, inner sep=0pt,
               font=\tiny\bfseries, text=vink}]

  % ---------- 顶部主张 ----------
  \node[font=\large, anchor=west, vaudit={class=txt}] (title) at (-3.0,2.5) {ZCode 工作区快照上传管线 —— 伪装成「本地索引」的凭证签发 + OSS 直传};

  % ---------- 泳道带 ----------
  \begin{pgfonlayer}{bg}
    \fill[band=vblue]  (-0.3,-2.15) rectangle (16.5,1.75);   % fv:noaudit
    \fill[band=vcoral] (-0.3,-4.40) rectangle (16.5,-2.65);  % fv:noaudit
    \fill[band=vorange] (-0.3,-6.15) rectangle (16.5,-4.85); % fv:noaudit
  \end{pgfonlayer}
  \vzbbox{laneClient}{(-0.3,-2.15)}{(16.5,1.75)}
  \vzbbox{laneServer}{(-0.3,-4.40)}{(16.5,-2.65)}[adjacent=laneClient]
  \vzbbox{laneOss}{(-0.3,-6.15)}{(16.5,-4.85)}[adjacent=laneServer]

  % ---------- 泳道标签 ----------
  \node[gtag, vaudit={adjacent=laneClient}] at (-0.42,0.55) {client\\{\tiny Electron sidecar}};
  \node[gtag, vaudit={adjacent=laneServer}] at (-0.42,-3.55) {server\\{\tiny zcode.z.ai}};
  \node[gtag, vaudit={adjacent=laneOss}] at (-0.42,-5.5) {oss\\{\tiny aliyun bucket}};

  % ================= client 带·触发段（y=0.95）=================
  \node[cnode, fill=vblue!13, draw=vblue!70, vaudit={class=cnode,inside=laneClient}] (a0) at (1.35,0.95) {用户动作\\{\tiny prompt/task/}\\{ \tiny wiki/cron}};
  \node[cnode, fill=vblue!13, draw=vblue!70, vaudit={class=cnode,inside=laneClient}] (a1) at (3.95,0.95) {intent 调度器\\{\tiny 深32·120s}\\{ \tiny v3.6.1+}};
  \node[cnode, fill=vblue!13, draw=vblue!70, vaudit={class=cnode,inside=laneClient,adjacent=a1}] (a2) at (6.55,0.95) {\texttt{captureBefore}\\ \texttt{PromptUnsafe}\\{ \tiny  JWT·wsKeyHash[:12]}};
  \node[cnode, fill=vblue!13, draw=vblue!70, vaudit={class=cnode,inside=laneClient,adjacent=a2}] (a3) at (9.0,0.95) {credential 查表\\{\tiny 内存缓存}\\{ \tiny miss 才发 HTTP}};
  \draw[varr] (a0) -- (a1); \vzwire{wa01}{a0;a1}{endpoint=a0,a1 via=laneClient}
  \draw[varr] (a1) -- (a2); \vzwire{wa12}{a1;a2}{endpoint=a1,a2 via=laneClient}
  \draw[varr] (a2) -- (a3); \vzwire{wa23}{a2;a3}{endpoint=a2,a3 via=laneClient}

  % ---------- UI 开关假相注记（行间空档）----------
  \node[font=\tiny, text=vcoral!80!black, anchor=west, vaudit={inside=laneClient,adjacent=b1}] (uigate) at (0.15,-0.45) {UI 开关显示 OFF 实跑（v2.6.0 翻转 · v3.1.0 装饰化）};

  % ================= server 带 =================
  \node[snode, fill=vcoral!14, draw=vcoral!75, vaudit={class=snode,inside=laneServer}] (s1) at (8.6,-3.55) {签发 credential\\{\tiny snapshot\_id·OSS form}\\{ \tiny pubkey·callback 模板·max\_size}};
  \node[snode, fill=vcoral!14, draw=vcoral!75, vaudit={class=snode,inside=laneServer}] (s2) at (13.0,-3.55) {register / receive\\{\tiny unwrap AES key→解明文}\\{ \tiny checksum 锚定+去重·响应不解析}};

  % ---------- 跨域流量图例（server 带左侧空白）----------
  \node[font=\tiny, align=left, anchor=west, text=black!75, vaudit={inside=laneServer}] (leg) at (0.05,-3.55) {%
    {\bfseries 1.} GET \texttt{/snapshot/upload-credential}（JWT+X-* 指纹）\\
    {\bfseries 2.} credential JSON：s1 五件套；\textcolor{vcoral!85!black}{data:null=服务端拒发}\\
    {\bfseries 3.} POST multipart→OSS：归因明文+cb b64+密文 blob\\
    {\bfseries 4.} OSS→POST callbackBody→callback.url（客户端无回执）};

  % ================= client 带·处理段（y=-1.2）=================
  \node[cnode, fill=vviolet!12, draw=vviolet!70, vaudit={class=cnode,inside=laneClient,adjacent=rm}] (b1) at (7.05,-1.2) {scanner+filter\\{\tiny git ls-files→walkFiles}\\{ \tiny .git 整树零剪枝}};
  \node[cnode, fill=vviolet!12, draw=vviolet!70, vaudit={class=cnode,inside=laneClient,adjacent=b1}] (b2) at (10.05,-1.2) {tar+gzip\\{\tiny ustar+pax}\\{ \tiny 根=snapshot\_id}};
  \node[cnode, fill=vviolet!12, draw=vviolet!70, vaudit={class=cnode,inside=laneClient,adjacent=b2}] (b3) at (12.4,-1.2) {\texttt{encryptArchive}\\{ \tiny  AES-256-CTR}\\{ \tiny +RSA-OAEP wrap}};
  \node[cnode, fill=vviolet!12, draw=vviolet!70, vaudit={class=cnode,inside=laneClient,adjacent=b3}] (b4) at (14.9,-1.2) {pending+flush\\{\tiny 查表·密文>}\\{ \tiny max\_size→弃}};
  \draw[varr] (b1) -- (b2); \vzwire{wb12}{b1;b2}{endpoint=b1,b2 via=laneClient}
  \draw[varr] (b2) -- (b3); \vzwire{wb23}{b2;b3}{endpoint=b2,b3 via=laneClient}
  \draw[varr] (b3) -- (b4); \vzwire{wb34}{b3;b4}{endpoint=b3,b4 via=laneClient}

  % ---------- 移除标记 ----------
  \node[ghost, vaudit={inside=laneClient}] (rm) at (2.6,-1.45) {v3.14.0 整体移除（端点字面量清零）};

  % ================= 凭证往返连线（①↓ ②↑）=================
  \draw[varr] (a3.south) -- (s1.north); \vzwire{wcred1}{(a3.south);(s1.north)}{endpoint=a3,s1 via=laneClient,laneServer}
  \node[wnum, vaudit={adjacent=laneClient,adjacent=laneServer,adjacent=s1,adjacent=b2}] (n1) at (9.05,-2.42) {1};
  \draw[varr] (s1.north west) -- (b1.south); \vzwire{wcred2}{(s1.north west);(b1.south)}{endpoint=s1,b1 via=laneClient,laneServer}
  \node[wnum, vaudit={adjacent=laneClient,adjacent=laneServer,adjacent=s1,adjacent=b1}] (n2) at (6.68,-2.42) {2};

  % ================= OSS 带 =================
  \node[onode, fill=vorange!16, draw=vorange!75, vaudit={class=onode,inside=laneOss}] (o1) at (12.2,-5.5) {Aliyun OSS bucket（PostObject）\\{\tiny 可见：密文 blob + bare 归因明文表单 + base64 callback}};

  % ---------- 上传连线 ③（穿 server 带不过手）----------
  \draw[varr] (b4.south) -- (o1.north east); \vzwire{wup}{(b4.south);(o1.north east)}{endpoint=b4,o1 via=laneClient,laneServer,laneOss}
  \node[wnum, vaudit={inside=laneServer}] (n3) at (15.5,-3.55) {3};

  % ---------- 回调登记连线 ④（oss→server）----------
  \draw[varr] (o1.north) -- (s2.south); \vzwire{wcb}{(o1.north);(s2.south)}{endpoint=o1,s2 via=laneOss,laneServer}
  \node[wnum, vaudit={adjacent=laneServer,adjacent=laneOss,adjacent=s2,adjacent=o1}] (n4) at (11.7,-4.62) {4};

  % ---------- 底部含义框 ----------
  \node[mean, text width=16.8cm, anchor=north west, align=left, vaudit={}] (mb) at (-3.0,-6.7) {%
    \textbf{对象}：vblue=client 本地触发/收集 · vviolet=本地处理段 · vcoral=zcode.z.ai 签发与登记 · vorange=OSS 直传 · 虚线灰=移除标记。
    \textbf{机制}：credential 是唯一鉴权一跳，下发 snapshot\_id/OSS form/RSA pubkey/callback 模板/max\_size——data:null 即服务端整体拒发；tar 根目录=服务端签发的 snapshot\_id；AES-256-CTR+RSA-OAEP wrap 的公钥由服务端签发、私钥在厂商——加密对厂商不成立；payload 直传 OSS 不经 server，登记由 OSS 服务端回调完成（客户端无回执）；UI 开关 v2.6.0 起显示 OFF 实跑；全管线 v3.14.0（2026-09-19）移除。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=north, vaudit={adjacent=mb}] at ($(mb.south)+(0,-0.18)$) {swimlane = client sidecar / zcode.z.ai / aliyun OSS · 数据源 figure-pack.json mech.stages+diagram\_nodes · F15 同构图的 ZCode 行原型};
\end{tikzpicture}
