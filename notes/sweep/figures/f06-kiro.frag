% F06 Kiro 1.1.14 会话转录定时发布器图
% 语义台账：
%   laneC = Kiro 客户端（extension.js publisher 链）；laneS = runtime.{region}.kiro.dev 服务端；
%   byp   = 对照面板：同一 opt-out 头只挂 Smithy lane、裸 https.request 发布器不携带。
%   节点填充语义：vblue=客户端链块；vgold=唯一门（region 白名单）；vcoral=服务端与破绽点；
%   vteal=对照组（合规路径）；vrose=静默丢弃语义点。
%   连接器语义：varr 实箭头=数据流向；回绕边=游标/重试回路。
% 几何台账：
%   cn 类节点 2.2×1.05cm；sn 类 3.0×1.05cm；列距 2.7cm（列 x=0.7/3.4/6.1/8.8/11.5），
%   行1 y=-1.6、行2 y=-3.6（蛇形）；对照面板行 y=-8.9/-10.3。
\begin{tikzpicture}[x=1cm,y=1cm,
  cn/.style={model, minimum width=2.2cm, minimum height=1.05cm, text width=2.0cm,
             font=\scriptsize, align=center, inner sep=2pt},
  sn/.style={model, minimum width=3.0cm, minimum height=1.05cm, text width=2.8cm,
             font=\scriptsize, align=center, inner sep=2pt}]

  % ---------- 顶部主张 ----------
  \node[anchor=west, align=left, font=\small, vaudit={}] (title) at (-0.55,2.52) {{\large Kiro：3s 常开泵外发完整会话转录}\\[1pt]
    {\color{black!65}唯一门 = region$\in$\{us-east-1,us-west-2\}；自家 opt-out 被旁路}};

  % ---------- 载荷说明卡（右上）----------
  \node[draw=vgray!50, fill=vmist!45, rounded corners=3pt, inner sep=5pt, align=left,
        font=\scriptsize, text width=3.55cm, vaudit={adjacent=laneC}] (pay) at (13.1,2.62) [anchor=north east] {%
    \textbf{载荷 = 完整会话转录}\\
    user/assistant 文本 · base64 图/文档 · tool\_call args · tool\_result 文件内容/终端输出 · checkpoint.fileChanges 双份文件体\\
    {\color{vgray}另：infra-safety eval 另发全部 AWS\_* env}};

  % ---------- 泳道带 ----------
  \begin{pgfonlayer}{bg}
    \fill[band=vblue] (-0.6,-4.5) rectangle (12.9,-0.6); % fv:noaudit
    \fill[band=vcoral] (-0.6,-6.7) rectangle (12.9,-5.2); % fv:noaudit
    \fill[band] (-0.6,-11.4) rectangle (12.9,-7.5); % fv:noaudit
  \end{pgfonlayer}
  \vzbbox{laneC}{(-0.6,-4.5)}{(12.9,-0.6)}
  \vzbbox{laneS}{(-0.6,-6.7)}{(12.9,-5.2)}[adjacent=laneC]
  \vzbbox{byp}{(-0.6,-11.4)}{(12.9,-7.5)}[adjacent=laneS]

  \node[gtag, vaudit={adjacent=laneC,adjacent=n1}] at (-0.75,-1.6) {客户端\\{\tiny extension.js}};
  \node[gtag, vaudit={adjacent=laneS}] at (-0.75,-5.95) {服务端\\{\tiny AWS runtime}};
  \node[vstage, anchor=north west, vaudit={inside=byp,adjacent=a1,adjacent=a2}] at (-0.45,-7.58) {对照：\texttt{x-amzn-codewhisperer-optout} 只挂 Smithy lane};

  % ================= 客户端链（行1 左→右）=================
  \node[cn, fill=vblue!14, draw=vblue!70, vaudit={inside=laneC}] (n1) at (0.7,-1.6) {会话创建/恢复\\{\tiny 无条件点火}};
  \node[cn, fill=vgold!22, draw=vgold!80, vaudit={inside=laneC}] (n2) at (3.4,-1.6) {构造器门\\{\tiny region 白名单}};
  \node[cn, fill=vblue!14, draw=vblue!70, vaudit={inside=laneC}] (n3) at (6.1,-1.6) {startTimer(3s)\\{\tiny flush 循环}};
  \node[cn, fill=vblue!14, draw=vblue!70, vaudit={inside=laneC}] (n4) at (8.8,-1.6) {tail 会话转录\\{\tiny messages.jsonl+游标}};
  \node[cn, fill=vblue!14, draw=vblue!70, vaudit={inside=laneC}] (n5) at (11.5,-1.6) {TYPE\_MAP 20 键\\{\tiny +toPayload 整形}};
  \draw[varr] (n1) -- (n2); \vzwire{w12}{n1;n2}{endpoint=n1,n2 via=laneC}
  \draw[varr] (n2) -- (n3); \vzwire{w23}{n2;n3}{endpoint=n2,n3 via=laneC}
  \draw[varr] (n3) -- (n4); \vzwire{w34}{n3;n4}{endpoint=n3,n4 via=laneC}
  \draw[varr] (n4) -- (n5); \vzwire{w45}{n4;n5}{endpoint=n4,n5 via=laneC}

  % ================= 客户端链（行2 右→左）=================
  \node[cn, fill=vblue!14, draw=vblue!70, vaudit={inside=laneC}] (n6) at (11.5,-3.6) {$\leq$25 条/批\\{\tiny 明文 JSON·无压缩}};
  \node[cn, fill=vblue!14, draw=vblue!70, vaudit={inside=laneC}] (n7) at (8.8,-3.6) {Bearer 鉴权\\{\tiny profileArn·ACP}};
  \node[cn, fill=vcoral!18, draw=vcoral!75, vaudit={inside=laneC}] (n8) at (6.1,-3.6) {裸 https.request\\{\tiny \textbf{无 opt-out 头}}};
  \node[cn, fill=vrose!14, draw=vrose!70, vaudit={inside=laneC}] (n9) at (3.4,-3.6) {非 2xx 仅记 warn\\{\tiny 游标照推·静默丢}};
  \draw[varr] (n5.south) -- (n6.north); \vzwire{w56}{n5.south;n6.north}{endpoint=n5,n6 via=laneC}
  \draw[varr] (n6) -- (n7); \vzwire{w67}{n6;n7}{endpoint=n6,n7 via=laneC}
  \draw[varr] (n7) -- (n8); \vzwire{w78}{n7;n8}{endpoint=n7,n8 via=laneC}

  % ================= 服务端 =================
  \node[sn, fill=vcoral!16, draw=vcoral!75, vaudit={class=sn,inside=laneS}] (s1) at (6.1,-5.95) {POST \texttt{/agents/activity}\\{\tiny runtime.\{region\}.kiro.dev}};
  \node[sn, fill=vcoral!16, draw=vcoral!75, vaudit={class=sn,inside=laneS}] (s2) at (10.3,-5.95) {转录归并+持久\\{\tiny 服务端全量持有}};
  \draw[varr] (n8.south) -- (s1.north); \vzwire{w8s}{n8.south;s1.north}{endpoint=n8,s1 via=laneC,laneS}
  \draw[varr] (s1) -- (s2); \vzwire{wss}{s1;s2}{endpoint=s1,s2 via=laneS}
  % ack 回线：s1 响应 → n9
  \draw[varr] (s1.west) -| (n9.south); \vzwire{ws9}{(s1.west);(3.4,-5.95);n9.south}{endpoint=s1,n9 via=laneS,laneC}
  % 回路：n9 → 外侧 → n3（下一 tick 重读游标）
  \draw[varr] (n9.west) -- (0.4,-3.6) -- (0.4,-2.6) -- (6.1,-2.6) -- (n3.south);
  \vzwire{wloop}{n9.west;0.4,-3.6;0.4,-2.6;6.1,-2.6;n3.south}{endpoint=n9,n3 via=laneC}
  \node[lab, vaudit={inside=laneC,adjacent=n9}] (lpl) at (1.05,-3.02) {下 tick\\ 重读游标};

  % ================= 对照面板 =================
  \node[cn, fill=vblue!10, draw=vblue!60, vaudit={inside=byp}] (a1) at (1.5,-8.85) {chat/converse\\{\tiny 产品固有 lane}};
  \node[cn, fill=vteal!14, draw=vteal!70, vaudit={inside=byp}] (a2) at (6.1,-8.85) {Smithy client\\{\tiny opt-out 头已挂}};
  \node[cn, fill=vteal!14, draw=vteal!70, vaudit={inside=byp}] (a3) at (10.9,-8.85) {POST 会话 API\\{\tiny opt-out 生效}};
  \draw[varr] (a1) -- (a2); \vzwire{wa1}{a1;a2}{endpoint=a1,a2 via=byp}
  \draw[varr] (a2) -- (a3); \vzwire{wa2}{a2;a3}{endpoint=a2,a3 via=byp}

  \node[cn, fill=vblue!10, draw=vblue!60, vaudit={inside=byp}] (b1) at (1.5,-10.35) {activity 发布器\\{\tiny 头条管线}};
  \node[cn, fill=vcoral!22, draw=vcoral!80, line width=0.9pt, vaudit={inside=byp}] (b2) at (6.1,-10.35) {裸 https.request\\{\tiny \textbf{opt-out 不挂}}};
  \node[cn, fill=vcoral!18, draw=vcoral!75, vaudit={inside=byp}] (b3) at (10.9,-10.35) {POST\\{\tiny /agents/activity}};
  \draw[varr] (b1) -- (b2); \vzwire{wb1}{b1;b2}{endpoint=b1,b2 via=byp}
  \draw[varr] (b2) -- (b3); \vzwire{wb2}{b2;b3}{endpoint=b2,b3 via=byp}

  % ---------- 底部含义框 ----------
  \node[mean, text width=13.3cm, anchor=north west, align=left, vaudit={}] (mb) at (-0.55,-11.95) {%
    \textbf{对象}：\hspace{1.5pt}vgold=唯一门（region 白名单·自动派生·零本地开关）\hspace{1.5pt}；\hspace{1.5pt}vcoral=破绽与服务端；\hspace{1.5pt}vteal=合规对照。\\[3pt]
    \textbf{机制}：每 3s 按 byteCursor tail 完整转录，$\leq$25 条/POST、常规 5--500KB、无上限；非 2xx 批次静默丢不重发。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=north, vaudit={adjacent=mb}] at ($(mb.south)+(0,-0.18)$) {Kiro 1.1.14 · ActivityLogPublisher @ extension.js:16669-16690 · 端点名摘自 figure-pack.json};
\end{tikzpicture}
