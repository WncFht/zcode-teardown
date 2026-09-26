% F08 Trae intl 任务驱动日志管线图
% 语义台账：
%   泳道 = 信任域三列：客户端 Electron 共享进程 Qk（vblue）| 服务端 icube+gtm/tob（vcoral）| ImageX 对象存储（vorange）
%   触发入口三件（客户端列顶）：轮询 timer / frontier WSS 推送（跳过 action 过滤，vcoral）/ .so 孪生（休眠，vgold 虚线）
%   主链 = ib()→jk()→P2→getToken→Kk.h→lb()；jk 的 I2 支路收集三家竞品转录（珊瑚强调线）；gb() SSH 远程回捞
%   ToB 支线 = 底部 jb() 经 bus 扇出 poll→伪造反馈单(create, 深珊瑚)→presign→callback（服务端列下段）
%   虚线返回 = ImageX Uri 回传 → 装配进 callback
% 几何台账：
%   列带 x：client [-0.3,6.2] server [6.9,10.5] imagex [11.3,14.7]；主链 x=2.2，支线 x≈5.1。
\begin{tikzpicture}[x=1cm,y=1cm,
  cb/.style={model, minimum width=3.2cm, minimum height=1.1cm, text width=2.9cm,
             font=\scriptsize, align=center, inner sep=2pt},
  cbs/.style={model, minimum width=1.7cm, minimum height=1.0cm, text width=1.4cm,
              font=\scriptsize, align=center, inner sep=2pt},
  cs/.style={model, minimum width=3.4cm, minimum height=0.95cm, text width=3.1cm,
             font=\scriptsize, align=center, inner sep=2pt},
  cx/.style={model, minimum width=3.0cm, minimum height=1.3cm, text width=2.7cm,
             font=\scriptsize, align=center, inner sep=2pt},
  wl/.style={font=\tiny, text=black!60, align=center, inner sep=1pt},
  colh/.style={font=\small\bfseries, align=center, inner sep=1pt}]

  % ---------- 顶部主张 ----------
  \node[font=\large, anchor=west, vaudit={class=txt}] (title) at (-3.4,4.7) {Trae intl 日志收集管线 —— 三条触发入口，两条回报支线；收集面含竞品转录与伪造反馈单};

  % ---------- 泳道列带 ----------
  \begin{pgfonlayer}{bg}
    \fill[band=vblue]   (-0.3,-17.0) rectangle (6.2,3.15);   % fv:noaudit
    \fill[band=vcoral]  (6.9,-17.0)  rectangle (10.5,3.15);  % fv:noaudit
    \fill[band=vorange] (11.3,-17.0) rectangle (14.7,3.15);  % fv:noaudit
  \end{pgfonlayer}
  \vzbbox{colC}{(-0.3,-17.0)}{(6.2,3.15)}
  \vzbbox{colS}{(6.9,-17.0)}{(10.5,3.15)}[adjacent=colC]
  \vzbbox{colX}{(11.3,-17.0)}{(14.7,3.15)}[adjacent=colS]

  % ---------- 列头 ----------
  \node[colh, vaudit={adjacent=colC}] (hc) at (2.95,3.58) {客户端 Electron（共享进程 \texttt{Qk}）};
  \node[colh, vaudit={adjacent=colS}] (hs) at (8.7,3.58) {服务端 icube + gtm/tob};
  \node[colh, vaudit={adjacent=colX}] (hx) at (13.0,3.58) {ImageX 对象存储};

  % ================= 客户端列 =================
  % --- 触发三件 ---
  \node[cb, minimum height=1.0cm, fill=vblue!14, draw=vblue!70, vaudit={inside=colC}] (tm) at (2.2,2.3) {\texttt{Qk.start()} 轮询\\{\tiny setInterval 10min + 首跑 30s}};
  \node[cb, minimum width=2.7cm, minimum height=1.0cm, text width=2.4cm, fill=vcoral!20, draw=vcoral!75, vaudit={inside=colC}] (ws) at (2.2,0.85) {frontier WSS\\ deviceLog 直入\\{\tiny 跳过 action 过滤}};
  \node[cbs, minimum width=1.9cm, fill=vgold!18, draw=vgold!80, densely dashed, vaudit={inside=colC}] (so) at (5.15,0.85) {.so 孪生 logifier\\{\tiny 休眠·dlopen}};
  % --- 主链 ---
  \node[cb, fill=vblue!14, draw=vblue!70, vaudit={class=cb,inside=colC}] (ib) at (2.2,-1.7) {\texttt{ib()} dispatch\\{\tiny dedupe · isTob\textrightarrow{}jb · windowId\textrightarrow{}gb}};
  \node[cb, fill=vblue!14, draw=vblue!70, vaudit={inside=colC}] (jk) at (2.2,-3.55) {\texttt{jk()} 收集\\窗口会话+\texttt{aha\_log}\\{\tiny\color{vcoral!90!black}I2 收集 .codex/.claude/}\\{\tiny\color{vcoral!90!black}.cursor 转录 $\leq$3d}\\{\tiny +R2 .git-ai-tob}};
  \node[cbs, fill=vblue!12, draw=vblue!65, vaudit={inside=colC}] (gb) at (5.15,-3.55) {\texttt{gb()} remote-pull\\{\tiny SSH 打包\\拉回删副本}};
  \node[cb, fill=vblue!14, draw=vblue!70, vaudit={class=cb,inside=colC}] (p2) at (2.2,-5.5) {\texttt{P2} packer\\{\tiny alog\_<id>/ \textrightarrow{} tar.gz + manifest}};
  \node[cb, fill=vblue!14, draw=vblue!70, vaudit={class=cb,inside=colC}] (tk) at (2.2,-7.0) {\texttt{getToken()}\\{\tiny STS 缓存 >5min}};
  \node[cb, fill=vblue!14, draw=vblue!70, vaudit={inside=colC}] (kk) at (2.2,-8.65) {\texttt{Kk.h} uploader\\{\tiny @byted-icube/}\\{\tiny uploader · V4-sign}};
  \node[cb, fill=vblue!14, draw=vblue!70, vaudit={class=cb,inside=colC}] (lb) at (2.2,-10.15) {\texttt{lb()}\\{\tiny 组装 \{id,status,logPath\}}};
  % --- ToB 客户端驱动 ---
  \node[cb, fill=vcoral!22, draw=vcoral!80, vaudit={class=cb,inside=colC}] (jb) at (2.2,-13.15) {\texttt{jb()} ToB lane 驱动\\{\tiny isTob\textrightarrow{}伪装反馈单支线}};

  % ================= 服务端列 =================
  \node[cs, fill=vcoral!18, draw=vcoral!75, vaudit={inside=colS}] (ck) at (8.7,2.3) {POST \texttt{/device/log/check}\\{\tiny 任务模型 · action 过滤仅此路}};
  \node[cs, fill=vcoral!18, draw=vcoral!75, vaudit={inside=colS}] (sts) at (8.7,-7.0) {POST \texttt{/report/token}\\{\tiny \textrightarrow{}STS\{AK,SK,Tok,svcId\}}};
  \node[cs, fill=vcoral!18, draw=vcoral!75, vaudit={inside=colS}] (cbk) at (8.7,-10.15) {POST \texttt{/device/log/}\\ \texttt{callback}\\{\tiny \{id,status,logPath:Uri\}}};
  % --- ToB 服务端链 ---
  \node[cs, fill=vcoral!18, draw=vcoral!75, vaudit={inside=colS}] (tp) at (8.7,-11.55) {\texttt{/log\_collection/poll}\\{\tiny 每小时任务拉取}};
  \node[cs, fill=vcoral!40, draw=vcoral!85, vaudit={inside=colS}] (tf) at (8.7,-13.15) {POST \texttt{/tob-admin/}\\ \texttt{report/create}\\{\tiny 伪造单·contact=用户邮箱}};
  \node[cs, fill=vcoral!18, draw=vcoral!75, vaudit={inside=colS}] (ts) at (8.7,-14.75) {\texttt{/report/pre\_signed\_url}\\{\tiny \textrightarrow{}PUT tar.gz 通道}};
  \node[cs, fill=vcoral!18, draw=vcoral!75, vaudit={inside=colS}] (tb) at (8.7,-16.2) {\texttt{/report/log/callback}\\{\tiny +log\_collection/status}};

  % ================= ImageX 列 =================
  \node[cx, fill=vorange!20, draw=vorange!75, vaudit={inside=colX}] (ix) at (13.0,-8.65) {ImageX\\{\tiny ApplyImageUpload(V4)\\ \textrightarrow{}POST \texttt{/upload/v1/<oid>}\\ \textrightarrow{}Commit\textrightarrow{}Uri}};

  % ================= 连线 =================
  % timer→check（L→R）
  \draw[varr] (tm.east) -- (ck.west); \vzwire{w1}{tm.east;ck.west}{endpoint=tm,ck via=colC,colS}
  \node[wl, vaudit={inside=colC}] (w1l) at (5.35,2.62) {\tiny poll};
  % check→ib 回程（列间缝落下）
  \draw[varr] (ck.west) -- (6.5,2.3) -- (6.5,-1.7) -- (ib.east); \vzwire{w2}{ck.west;6.5,2.3;6.5,-1.7;ib.east}{endpoint=ck,ib via=colS,colC}
  % wss→ib 直下
  \draw[varr] (ws.south) -- (ib.north); \vzwire{w3}{ws.south;ib.north}{endpoint=ws,ib via=colC}
  \node[wl, vaudit={inside=colC}] (w3l) at (2.75,-0.45) {\tiny 跳过过滤};
  % so→ib 顶缘进
  \draw[varr] (so.south) -- (5.15,-1.0) -- (3.6,-1.0) -- (3.6,-1.15); \vzwire{w4}{so.south;5.15,-1.0;3.6,-1.0;3.6,-1.15}{endpoint=so,ib via=colC}
  % 主链垂直流
  \draw[varr] (ib.south) -- (jk.north); \vzwire{w5}{ib.south;jk.north}{endpoint=ib,jk via=colC}
  \draw[varr] (ib.east) -- (5.15,-1.7) -- (gb.north); \vzwire{w6}{ib.east;5.15,-1.7;gb.north}{endpoint=ib,gb via=colC}
  \draw[varr] (jk.south) -- (p2.north); \vzwire{w7}{jk.south;p2.north}{endpoint=jk,p2 via=colC}
  \draw[varr] (gb.south) -- (5.15,-5.5) -- (p2.east); \vzwire{w8}{gb.south;5.15,-5.5;p2.east}{endpoint=gb,p2 via=colC}
  \draw[varr] (p2.south) -- (tk.north); \vzwire{w9}{p2.south;tk.north}{endpoint=p2,tk via=colC}
  % tok→sts（凭证）
  \draw[varr] (tk.east) -- (sts.west); \vzwire{w10}{tk.east;sts.west}{endpoint=tk,sts via=colC,colS}
  \node[wl, vaudit={inside=colC}] (w10l) at (5.3,-6.65) {\tiny /report/token};
  \draw[varr] (tk.south) -- (kk.north); \vzwire{w11}{tk.south;kk.north}{endpoint=tk,kk via=colC}
  % kk→imagex（直传）
  \draw[varr] (kk.east) -- (ix.west); \vzwire{w12}{kk.east;ix.west}{endpoint=kk,ix via=colC,colS,colX}
  \node[wl, vaudit={inside=colS}] (w12l) at (8.7,-8.15) {\tiny 原 tar.gz 字节};
  \draw[varr] (kk.south) -- (lb.north); \vzwire{w13}{kk.south;lb.north}{endpoint=kk,lb via=colC}
  % lb→callback
  \draw[varr] (lb.east) -- (cbk.west); \vzwire{w14}{lb.east;cbk.west}{endpoint=lb,cbk via=colC,colS}
  % imagex→lb 虚线回传 Uri
  \draw[varr, dashed, draw=vorange!80] (ix.south) -- (13.0,-10.9) -- (2.2,-10.9) -- (lb.south); \vzwire{w15}{ix.south;13,-10.9;2.2,-10.9;lb.south}{endpoint=ix,lb via=colX,colS,colC}
  \node[wl, vaudit={inside=colX}] (w15l) at (12.0,-10.75) {\tiny Uri 回传};
  % ib→jb 左侧通道
  \draw[varr, draw=vcoral!75] (ib.west) -- (0.0,-1.7) -- (0.0,-13.15) -- (jb.west); \vzwire{w16}{ib.west;0.0,-1.7;0.0,-13.15;jb.west}{endpoint=ib,jb via=colC}
  % jb→bus 扇出
  \node[mdot=vgray, vaudit={inside=colC}] (bus) at (5.0,-13.15) {};
  \draw[varr, draw=vcoral!75] (jb.east) -- (bus); \vzwire{w17}{jb.east;bus}{endpoint=jb,bus via=colC}
  \draw[varr, draw=vcoral!75] (bus) -- (6.55,-13.15) -- (6.55,-11.55) -- (tp.west); \vzwire{w18}{bus;6.55,-13.15;6.55,-11.55;tp.west}{endpoint=bus,tp via=colC,colS}
  \draw[varr, draw=vcoral!75] (bus) -- (tf.west); \vzwire{w19}{bus;tf.west}{endpoint=bus,tf via=colC,colS}
  \draw[varr, draw=vcoral!75] (bus) -- (6.55,-13.15) -- (6.55,-14.75) -- (ts.west); \vzwire{w20}{bus;6.55,-13.15;6.55,-14.75;ts.west}{endpoint=bus,ts via=colC,colS}
  \draw[varr, draw=vcoral!75] (bus) -- (6.55,-13.15) -- (6.55,-16.2) -- (tb.west); \vzwire{w21}{bus;6.55,-13.15;6.55,-16.2;tb.west}{endpoint=bus,tb via=colC,colS}

  % ---------- 底部含义框 ----------
  \node[mean, text width=17.6cm, anchor=north west, align=left, vaudit={}] (mb) at (-3.4,-17.45) {%
    \textbf{对象}：vblue=客户端共享进程 · vcoral=服务端遥控面（深=伪造/收集支）· vorange=ImageX 对象存储 · vgold 虚线=休眠 .so 孪生。\\[3pt]
    \textbf{机制}：唯一门槛 \texttt{storeRegion!==USTTP}（国际版恒真）；WSS 推送绕过轮询路径仅有的 action 过滤。\\[3pt]
    \textbf{收集面}：jk() I2 支路打包 \texttt{\~{}}/.codex、\texttt{\~{}}/.claude、\texttt{\~{}}/.cursor 三天内转录；ToB 支线先伪造反馈单（issue\_type=其他+用户邮箱）再挂日志；denylist 仅 2 个文件名、无密钥模式。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=north, vaudit={adjacent=mb}] at ($(mb.south)+(0,-0.18)$) {trae-intl 3.5.91 · SP=sharedProcessMain · MJ=main.js · 端点与支路逐字摘自 evidence/trae-intl/figure-pack.json};
\end{tikzpicture}
