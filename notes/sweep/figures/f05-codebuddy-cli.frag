% F05 CodeBuddy CLI 服务端任务队列遥控图（轮询回路）
% 语义台账：
%   上泳道 = 服务端控制面（vcoral：配置推送/任务队列/STS 签发/回报登记，门控全在服务端）
%   下泳道 = 客户端执行件（vblue：init→定时器→轮询→收集→打包→直传→回报）
%   vorange = 腾讯 COS 对象存储（字节直传终点）
%   珊瑚色虚线回环 = 回报后定时器继续下一拍（闭环是论点）
%   金色虚线 = log.level 远端调级旁路（先放大采集面再收集）
%   虚线灰框 = extraUploadPathsProvider 休眠 DI 扩展点（零实现）
% 几何台账：
%   执行件 2.35×1.05cm（class=cb 全等），列距 2.8cm；
%   客户端带 y∈[-1.55,1.55]，服务端带 y∈[2.55,5.15]；回环走带下外通道 y=-2.35。
\begin{tikzpicture}[x=1cm,y=1cm,
  cb/.style={model, minimum width=2.35cm, minimum height=1.5cm, text width=2.15cm,
             font=\scriptsize, align=center, inner sep=2pt},
  sb/.style={cb},
  ghost/.style={cb, fill=vmist!45, draw=vgray!50, densely dashed, text=vgray,
                minimum width=2.05cm, minimum height=0.72cm, text width=1.9cm, font=\tiny},
  loopw/.style={draw=vcoral!85, line width=1.1pt, dash pattern=on 4pt off 2.4pt, -{Stealth}},
  levelw/.style={draw=vgold!85, line width=0.9pt, dash pattern=on 3pt off 2pt, -{Stealth}}]

  % ---------- 顶部主张 ----------
  \node[anchor=west, align=left, font=\small, vaudit={}] (title) at (-2.1,6.3) {{\large CodeBuddy CLI：纯服务端遥控的日志收集闭环 —— 配置下发 \textrightarrow{} 任务点菜 \textrightarrow{} COS 直传 \textrightarrow{} HMAC 回报 \textrightarrow{} 下一拍}\\[1pt] {\color{black!65}本地零默认值：product*.json 无 log 键；DISABLE\_TELEMETRY 不覆盖；\texttt{-{}-serve} 是唯一旁路}};

  % ---------- 泳道带 ----------
  \begin{pgfonlayer}{bg}
    \fill[band=vcoral] (-0.4,2.55) rectangle (19.4,5.15); % fv:noaudit
    \fill[band=vblue]  (-0.4,-1.85) rectangle (19.4,1.55); % fv:noaudit
  \end{pgfonlayer}
  \vzbbox{laneA}{(-0.4,2.55)}{(19.4,5.15)}
  \vzbbox{laneB}{(-0.4,-1.85)}{(19.4,1.55)}

  % ---------- 泳道标签 ----------
  \node[gtag, vaudit={adjacent=laneA}] at (-0.55,3.85) {服务端\\{\tiny 控制面}};
  \node[gtag, vaudit={adjacent=laneB}] at (-0.55,0) {客户端\\{\tiny dist/codebuddy.js}};

  % ---------- 服务端对象 ----------
  \node[sb, fill=vcoral!15, draw=vcoral!70, vaudit={inside=laneA}] (s0) at (2.2,3.85) {GET \texttt{/v3/config}\\{\tiny 推送 log.upload.*}\\{\tiny repos[]=远端 URL 泄漏}};
  \node[sb, fill=vcoral!15, draw=vcoral!70, vaudit={inside=laneA}] (s1) at (6.7,3.85) {任务队列\\ \texttt{upload\_task/check}\\{\tiny HMAC→tasks[]}};
  \node[sb, fill=vcoral!15, draw=vcoral!70, vaudit={inside=laneA}] (s2) at (12.3,3.85) {GET \texttt{/v2/logs/}\\ \texttt{upload\_credentials}\\{\tiny → COS STS 三件套}};
  \node[sb, fill=vorange!22, draw=vorange!75, vaudit={inside=laneA}] (cos) at (15.1,3.85) {腾讯 COS bucket\\{\tiny Key=path/uid/zip}\\{\tiny 明文 zip 落桶}};
  \node[sb, fill=vcoral!15, draw=vcoral!70, vaudit={inside=laneA}] (s3) at (17.9,3.85) {PUT \texttt{/upload\_task}\\ \texttt{?state=}HMAC\\{\tiny 登记 status+URL}};

  % ---------- 客户端执行件 ----------
  \node[cb, fill=vblue!12, draw=vblue!70, vaudit={class=cb,inside=laneB}] (c0) at (1.1,0) {init 订阅\\{\tiny @PostConstruct}\\{\tiny \texttt{-{}-serve} 唯一旁路}};
  \node[cb, fill=vblue!12, draw=vblue!70, vaudit={class=cb,inside=laneB}] (c1) at (3.9,0) {IntervalTimer\\ 激活\\{\tiny interval>0 才开}};
  \node[cb, fill=vblue!12, draw=vblue!70, vaudit={class=cb,inside=laneB}] (c2) at (6.7,0) {doCheckAnd\\ Upload 轮询\\{\tiny enabled()=真才发}};
  \node[cb, fill=vblue!12, draw=vblue!70, vaudit={class=cb,inside=laneB}] (c3) at (9.5,0) {collect 全工作区\\{\tiny 24h 内跨产品}\\{\tiny 恒 allWorkspaces:!0}};
  \node[cb, fill=vblue!12, draw=vblue!70, vaudit={class=cb,inside=laneB}] (c4) at (12.3,0) {createZipFile\\{\tiny zlib-9→tmpdir}\\{\tiny 无 maxRawSize}};
  \node[cb, fill=vblue!12, draw=vblue!70, vaudit={class=cb,inside=laneB}] (c5) at (15.1,0) {putObject\\{\tiny createReadStream}\\{\tiny 直传字节}};
  \node[cb, fill=vblue!12, draw=vblue!70, vaudit={class=cb,inside=laneB}] (c6) at (17.9,0) {informUpload\\ Result\\{\tiny finished/failed}};

  % ---------- 休眠扩展点（挂在 collect 下）----------
  \node[ghost, vaudit={class=ghostx,inside=laneB,adjacent=c3}] (gs) at (9.5,-1.3) {extraUploadPaths\\Provider·DI 零实现};

  % ---------- 主流线 ----------
  \draw[varr] (c0) -- (c1); \vzwire{w01}{c0;c1}{endpoint=c0,c1 via=laneB}
  \draw[varr] (c1) -- (c2); \vzwire{w12}{c1;c2}{endpoint=c1,c2 via=laneB}
  \draw[varr] (c3) -- (c4); \vzwire{w34}{c3;c4}{endpoint=c3,c4 via=laneB}
  \draw[varr] (c4) -- (c5); \vzwire{w45}{c4;c5}{endpoint=c4,c5 via=laneB}
  \draw[varr] (c5) -- (c6); \vzwire{w56}{c5;c6}{endpoint=c5,c6 via=laneB}

  % 配置推送：服务端 → 客户端（激活条件）
  \draw[varr] (s0.south) -- (c0.north); \vzwire{ws0}{s0.south;c0.north}{endpoint=s0,c0 via=laneA,laneB}
  % 轮询点菜：客户端 → 任务队列
  \draw[varr] (c2.north) -- (s1.south); \vzwire{wp}{c2.north;s1.south}{endpoint=c2,s1 via=laneB,laneA}
  % 任务下发：队列 → collect（processUploadTask allWorkspaces:!0）
  \draw[varr] (s1.south east) -- (c3.north); \vzwire{wt}{(s1.south east);c3.north}{endpoint=s1,c3 via=laneA,laneB}
  % 凭证：客户端 → credentials，回 STS → putObject
  \draw[varr] (c4.north) -- (s2.south); \vzwire{wcred}{c4.north;s2.south}{endpoint=c4,s2 via=laneB,laneA}
  \draw[varr] (s2.south east) -- (c5.north); \vzwire{wsts}{(s2.south east);c5.north}{endpoint=s2,c5 via=laneA,laneB}
  % 直传 COS + 回报
  \draw[varr] (c5.north) -- (cos.south); \vzwire{wcos}{c5.north;cos.south}{endpoint=c5,cos via=laneB,laneA}
  \draw[varr] (c6.north) -- (s3.south); \vzwire{wrep}{c6.north;s3.south}{endpoint=c6,s3 via=laneB,laneA}

  % ---------- 远端调级旁路（金虚线）----------
  \draw[levelw] (s0.south east) .. controls (5.9,2.9) .. (c3.north west);
  \vzwire{wlv}{(s0.south east);5.9,2.9;(c3.north west)}{endpoint=s0,c3 via=laneA,laneB}

  % ---------- 回环：回报后下一拍 ----------
  \draw[loopw] (c6.south) -- (17.9,-2.35) -- (3.9,-2.35) -- (c1.south);
  \vzwire{wloop}{c6.south;17.9,-2.35;3.9,-2.35;c1.south}{endpoint=c6,c1 via=laneB}
  \node[vnote, vaudit={adjacent=mb}] (wloopn) at (10.9,-2.72) {回报完成 → 定时器继续下一拍（interval 服务端下发，默认 60s）—— 循环不停};

  % ---------- 底部含义框 ----------
  \node[mean, text width=18.4cm, anchor=north west, align=left, vaudit={}] (mb) at (-2.1,-3.35) {%
    \textbf{对象}：vcoral=服务端控制面（config 推送 / 任务队列 / STS / 回报全在服务端）；\\[2pt]
    \hspace*{1.6em}vblue=客户端执行件；vorange=COS 对象存储；金虚线=log.level 调级旁路；珊瑚虚线=回环；虚线灰=休眠 DI 扩展点。\\[3pt]
    \textbf{机制}：interval/enabled/allowedEnvironments 由 \texttt{/v3/config} 服务端推送且本地零默认值——\texttt{DISABLE\_TELEMETRY} 不覆盖、env 白名单校验失败仍激活（fail-open）；服务端任务恒 \texttt{allWorkspaces:!0}，一次收集全部工作区+跨产品目录 24h 内任意文件；dist-server/headless/lite-wb 变体中 archiver/cos 为空桩，激活后只能轮询并报 failed。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=north, vaudit={adjacent=mb}] at ($(mb.south)+(0,-0.18)$) {server-pull harvest loop · 端点/键名逐字摘自 figure-pack.json（dist-server/6929.codebuddy.js:221-225）· CodeBuddy CLI 2.157.0};
\end{tikzpicture}
