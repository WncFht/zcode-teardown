% F09 MiniMax Desktop 3.0.73 — eval capture 包裹式拦截图
% 语义台账：
%   laneA（灰带）= 客户端本地组件；laneB（珊瑚带）= agent.minimax.cn 服务端领域
%   vviolet 虚线框 = runWithLocalEvalReporter 包裹器：每个 agent turn 必经；
%     阶段右缘 tap → bus 竖线 → 汇进 LocalEvalReporter 串行队列盒（载荷整形明细写在盒内）
%   vorange 小盒 = 运输（Bearer+TLS，带间缝隙里的关卡）；珊瑚盒 = 服务端端点；
%   服务端内灰虚线 = 服务端归并（无客户端回执）
%   珊瑚细条 = 唯一门（enabled:true 硬编码+packaged+accessToken）；灰虚线盒 = placebo 开关
%   vgold 方块符号 = sanitize（唯一卫生点：14 敏感 key→[REDACTED]+maskText）
% 几何台账：
%   阶段盒 3.3×1.15cm（class=stg 全等，tiny 行各为一行）；rep 盒 4.6 宽按文本量取；
%   端点盒 4.2×1.15cm（class=ep 全等）；bus 竖线 x=4.72；带间缝隙 x∈(9.8,11.3) 放运输盒 tb。
\begin{tikzpicture}[x=1cm,y=1cm,
  stg/.style={model, draw=vblue!75, fill=vblue!12, minimum width=3.3cm, minimum height=1.2cm,
              text width=3.0cm, font=\scriptsize, align=center, inner sep=2.5pt},
  rep/.style={model, draw=vviolet!80, fill=vviolet!10, minimum width=4.6cm, text width=4.28cm,
              font=\scriptsize, align=left, inner sep=4pt},
  ep/.style={model, draw=vcoral!80, fill=vcoral!14, minimum width=4.2cm, minimum height=1.15cm,
             text width=3.9cm, font=\scriptsize, align=center, inner sep=2.5pt},
  tbox/.style={model, draw=vorange!75, fill=vorange!16, minimum width=1.35cm, text width=1.1cm,
               font=\tiny, align=center, inner sep=1.5pt},
  ann/.style={model, text width=9.6cm, font=\scriptsize, align=left, inner sep=4pt}]

  % ---------- 顶部主张 ----------
  \node[font=\large, anchor=west, vaudit={class=txt}] (title) at (-0.4,8.0) {eval capture 包裹每次 LLM 调用 —— 模型可见请求体整包先行上报，登录即开零开关};

  % ---------- 泳道 ----------
  \begin{pgfonlayer}{bg}
    \fill[band] (-0.4,-0.35) rectangle (9.8,6.75);
    \fill[band=vcoral] (11.3,-0.35) rectangle (16.0,6.75);
  \end{pgfonlayer}
  \vzbbox{laneA}{(-0.4,-0.35)}{(9.8,6.75)}
  \vzbbox{laneB}{(11.3,-0.35)}{(16.0,6.75)}
  \node[font=\small\bfseries, vaudit={adjacent=laneA}] (labA) at (2.05,6.98) {客户端 · MiniMax Desktop 3.0.73};
  \node[font=\small\bfseries, text=vcoral!80!black, vaudit={adjacent=laneB}] (labB) at (13.55,6.98) {agent.minimax.cn · \texttt{/mavis/api/v1/eval}};

  % ---------- 包裹器（容器）----------
  \vzbbox{wrap}{(0.7,0.0)}{(4.5,6.25)}[inside=laneA]
  \draw[vviolet!75, densely dashed, line width=0.8pt, rounded corners=6pt] (0.7,0.0) rectangle (4.5,6.25); % fv:noaudit
  \node[font=\tiny, text=vviolet!80!black, anchor=west, vaudit={inside=laneA,adjacent=wrap,adjacent=labA,adjacent=rep,adjacent=s1}] at (0.75,6.42) {\texttt{runWithLocalEvalReporter} 包裹每个 turn};

  % ---------- turn 阶段链 ----------
  \node[stg, vaudit={class=stg,inside=wrap,inside=laneA}] (s1) at (2.6,5.5) {beginTurn\\{\tiny drain 事件 + 首批 steps + meta\_info/会话}};
  \node[stg, vaudit={class=stg,inside=wrap,inside=laneA}] (s2) at (2.6,3.9) {物理 LLM 调用 $\times$N\\{\tiny onLLMPrepared initial|iteration}};
  \node[stg, vaudit={class=stg,inside=wrap,inside=laneA}] (s3) at (2.6,2.3) {工具调用 $\times$N\\{\tiny beforeToolCall/afterToolCall + 兜底}};
  \node[stg, vaudit={class=stg,inside=wrap,inside=laneA}] (s4) at (2.6,0.7) {finishTurn\\{\tiny flushImmediately + 会话归档}};

  % ---------- reporter 载荷整形盒 ----------
  \node[rep, vaudit={inside=laneA}] (rep) at (7.35,3.4) {%
    \textbf{LocalEvalReporter} —— 会话内串行队列：\\
    · \textbf{snapshot\_json} = systemPrompt + messages[] + tools[] $\leq$16MiB——模型可见请求体（文件原文随工具结果在内）\\
    · \textbf{steps} = args\_json / result\_json $\leq$1MiB/字段，批 $\leq$16 步 / $\leq$6MiB\\
    · \textbf{meta\_info}（每会话一次）：目录树$\leq$2000 · PATH 可执行清单$\leq$2000 · git · config\_files\\
    · {\color{vgold!85!black}\rule{6pt}{6pt}}\,sanitize：14 敏感 key $\to$ [REDACTED] + maskText + \mbox{truncateUtf8}\\
    · uploadTailBySession 串行 · 3.5s \mbox{超时} · fail-open 不重发};

  % ---------- 运输盒（带间缝隙）----------
  \node[tbox, vaudit={adjacent=laneA,adjacent=laneB,adjacent=rep,adjacent=ep2}] (tb) at (10.55,3.4) {Bearer\\token·TLS\\3.5s};

  % ---------- 服务端端点 ----------
  \node[ep, vaudit={class=ep,inside=laneB}] (ep1) at (13.55,4.95) {\texttt{POST /eval/snapshot/report}\\{\tiny 每物理 LLM 调用前整包先行 · 顶 16MiB}};
  \node[ep, vaudit={class=ep,inside=laneB}] (ep2) at (13.55,3.4) {\texttt{POST /eval/steps/report}\\{\tiny steps + meta\_info · $\leq$16 步/6MiB 批}};
  \node[ep, vaudit={class=ep,inside=laneB}] (ep3) at (13.55,1.15) {trajectory 归并\\{\tiny traj+session+turn id；verifier\_child 挂父}};
  \node[font=\tiny, text=vgray, align=left, anchor=west, vaudit={inside=laneB,adjacent=ep2,adjacent=ep3}] at (13.8,2.27) {服务端归并\\无回执};

  % ---------- 门控与 placebo ----------
  \node[ann, draw=vcoral!70, fill=vcoral!8, vaudit={adjacent=laneA,adjacent=plac}] (gate) at (4.7,-0.95) {%
    \textbf{唯一门}：\texttt{enabled:true} 硬编码 + \texttt{app.isPackaged \&\& https} + \texttt{canReport()=仅查 accessToken} —— 登录即开；无 UI、无远端 flag、无文档};
  \node[ann, text width=5.5cm, draw=vcoral!55, fill=vmist!50, densely dashed, vaudit={adjacent=laneB,adjacent=gate}] (plac) at (13.15,-0.95) {%
    「Help improve / 数据用于优化体验」$\to$ \texttt{data\_contribution} 仅写服务端字段——全 \mbox{bundle} 零行为消费（placebo）};

  % ---------- 底部含义框 ----------
  \node[mean, text width=16.2cm, anchor=north west, align=left, vaudit={}] (mb) at (-0.4,-2.0) {%
    \textbf{对象}：vblue=客户端管线组件 · vviolet 虚线=eval 包裹器（每个 turn 必过） · vorange=运输（固定四头：Bearer accessToken · UA MiniMaxAgent · X-Mavis-Desktop-Channel · json，无客户端加密） · vcoral 带=服务端 · 灰虚线=placebo 控制件 · 金方块=sanitize（唯一卫生点）。\\[3pt]
    \textbf{机制}：每次物理 LLM 调用（含重试、每 iteration）前整包请求体先传 snapshot（50KB–1MB 典型）；工具出入参逐条进 steps 批传；meta\_info 每会话一次。服务端响应仅查 status\_code——无任何客户端行为被门控。对照道 workspace-indexing（zip $\to$ OSS presign）却是显式 opt-in + $\sim$25 项密钥 denylist——厂商具备卫生实现，只是没用在 eval 道。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=north, vaudit={adjacent=mb}] at ($(mb.south)+(0,-0.18)$) {wrapper-interception map · hook 点/端点/字段逐字摘自 minimax-desktop figure-pack.json mech.stages · 量纲见 volume.per\_event};

  % ---------- 连线 ----------
  \coordinate (bustop) at (4.72,5.5);
  \coordinate (busbot) at (4.72,0.7);
  \draw[varr] (s1.south) -- (s2.north); \vzwire{wt12}{s1.south;s2.north}{endpoint=s1,s2 via=wrap,laneA}
  \draw[varr] (s2.south) -- (s3.north); \vzwire{wt23}{s2.south;s3.north}{endpoint=s2,s3 via=wrap,laneA}
  \draw[varr] (s3.south) -- (s4.north); \vzwire{wt34}{s3.south;s4.north}{endpoint=s3,s4 via=wrap,laneA}

  \draw[varr] (s1.east) -- (bustop);         \vzwire{tp1}{s1.east;bustop}{endpoint=s1 via=wrap,laneA}
  \draw[varr] (s2.east) -- (4.72,3.9);       \vzwire{tp2}{s2.east;4.72,3.9}{endpoint=s2 via=wrap,laneA}
  \draw[varr] (s3.east) -- (4.72,2.3);       \vzwire{tp3}{s3.east;4.72,2.3}{endpoint=s3 via=wrap,laneA}
  \draw[varr] (s4.east) -- (busbot);         \vzwire{tp4}{s4.east;busbot}{endpoint=s4 via=wrap,laneA}
  \draw[vviolet!80, line width=1.1pt] (bustop) -- (busbot); \vzwire{busv}{bustop;busbot}{via=laneA}
  \draw[varr] (4.72,3.4) -- (rep.west);      \vzwire{trunk}{4.72,3.4;rep.west}{endpoint=rep via=laneA}
  \fill[vviolet] (4.72,5.5) circle(1.7pt) (4.72,3.9) circle(1.7pt) (4.72,3.4) circle(1.7pt)
                 (4.72,2.3) circle(1.7pt) (4.72,0.7) circle(1.7pt); % fv:noaudit

  \draw[varr] (rep.east) -- (tb.west);       \vzwire{wrtb}{rep.east;tb.west}{endpoint=rep,tb via=laneA}
  \draw[varr] (tb.east) -- (ep2.west);       \vzwire{wtb2}{tb.east;ep2.west}{endpoint=tb,ep2 via=laneB}
  \draw[varr] (tb.north) |- (ep1.west);      \vzwire{wtb1}{tb.north;10.55,4.95;ep1.west}{endpoint=tb,ep1 via=laneB}
  \draw[vgray!75, densely dashed, -{Stealth[length=2mm]}] (ep2.south) -- (ep3.north);
  \vzwire{wmrg}{ep2.south;ep3.north}{endpoint=ep2,ep3 via=laneB}
\end{tikzpicture}
