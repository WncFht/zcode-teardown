% cover-hero —— 《静默的同步》封面主图
% 语义台账：
%   中央下方 ws = 用户工作区（vink/vmist 中性色——非判定对象）
%   bus = ws.north 上方实心分发点；九条流线 bus→各端点卡.south（to[out,in] 弧线扇出）
%   九张端点卡 = 九家客户端的服务端收口：色=判定分档（vcoral 收集级×6 / vgold 中间档×2 / vblue 弱门控×1）
%     卡面三行：产品名 / 端点域（逐字自 figure-pack）/ 载荷关键词
%   ZCode（基线）居顶端正中，trunk+其流线构成一条垂直中轴——三段式基线即主轴
%   y=8.8 灰虚线 = consent 面（本应在此的位置；九条流线逐条穿刺——一图即论点）
% 几何台账：
%   画布 19×26cm；外弧 R=14 θ∈{56,69.6,83.2,96.8,110.4,124} 中心(9.5,4.3)；
%   顶卡 (9.5,20.0)；侧翼卡 (2.2,10.5)/(16.8,10.5)；卡 2.7×1.5cm（class=vend）；ws 卡 7.2×3.2cm。
\begin{tikzpicture}[x=1cm,y=1cm,
  vend/.style={model, minimum width=2.7cm, minimum height=1.5cm, text width=2.5cm,
               font=\scriptsize, align=center, inner sep=2pt},
  stream/.style={line width=2.1pt, rounded corners=4pt}]

  % ---------- 标题区 ----------
  \node[font=\fontsize{34}{38}\selectfont\bfseries, text=vink, vaudit={adjacent=sub}] (title) at (9.5,24.7) {静默的同步};
  \node[font=\small, text=vgray, vaudit={adjacent=title,sub2}] (sub) at (9.5,23.75) {46 家 AI 编程客户端隐藏上传管线批量逆向审计};
  \node[font=\scriptsize, text=vgray!80, vaudit={adjacent=sub}] (sub2) at (9.5,23.15) {Static teardown of hidden upload pipelines in agentic coding clients · 2026-09};
  \node[font=\small, text=vink!85, vaudit={adjacent=sub2}] (stat) at (9.5,22.35) {17 家确认隐藏上传 · 9 家深剖 · 0 家携带真 consent};

  % ---------- consent 面（灰虚线，九流线穿刺）----------
  \draw[vgray!60, line width=0.7pt, dash pattern=on 4pt off 3pt] (0.6,8.8) -- (18.4,8.8); % fv:noaudit
  \node[font=\tiny, text=vgray, anchor=west, vaudit={}] (consent) at (0.75,8.35) {consent 面（虚线：本该在此）};

  % ---------- 工作区母题 ----------
  \node[model, draw=vink!80, fill=vmist!50, minimum width=7.2cm, minimum height=3.2cm,
        text width=6.7cm, align=left, inner sep=6pt, vaudit={}] (ws) at (9.5,4.3) {%
    {\small\bfseries 你的工作区}\\[2pt]
    {\tiny src/ · .git/（remote token · reflog · pack）· .env* · .npmrc}\\[1pt]
    {\tiny 会话转录 · prompt 原文 · 日志 zip · 文件历史}\\[3pt]
    {\tiny\color{vcoral!85!black} UI 只给：「索引」·「改进体验」·「Indexes」—— 无一字「上传」}};

  % ---------- 分发 bus ----------
  \node[mdot=vink, vaudit={}] (bus) at (9.5,7.3) {};
  \draw[line width=2.6pt, vink!70] (ws.north) -- (bus); \vzwire{trunk}{(ws.north);bus}{endpoint=ws,bus}

  % ---------- 顶端中轴卡（基线 ZCode，gold）----------
  \node[vend, fill=vgold!22, draw=vgold!80, vaudit={class=vend}] (vzc) at (9.5,20.15) {%
    {\scriptsize\bfseries ZCode 智谱 · 基线}\\ {\tiny\ttfamily zcode.z.ai}\\ {\tiny .git 整树+prompt 原文}};

  % ---------- 侧翼卡（gold MiniMax / blue Kiro）----------
  \node[vend, fill=vblue!16, draw=vblue!70, vaudit={class=vend}] (vkr) at (1.9,10.0) {%
    {\scriptsize\bfseries Kiro AWS}\\ {\tiny\ttfamily runtime.kiro.dev}\\ {\tiny 完整会话转录}};
  \node[vend, fill=vgold!22, draw=vgold!80, vaudit={class=vend}] (vmm) at (17.1,10.0) {%
    {\scriptsize\bfseries MiniMax}\\ {\tiny\ttfamily agent.minimax.cn}\\ {\tiny eval 全量上下文}};

  % ---------- 外弧卡（coral×6）----------
  \node[vend, fill=vcoral!22, draw=vcoral!75, vaudit={class=vend,adjacent=vbi}] (vtr) at (1.67,15.91) {%
    {\scriptsize\bfseries Trae 字节}\\ {\tiny\ttfamily icube-normal.trae.ai}\\ {\tiny 会话+竞品转录}};
  \node[vend, fill=vcoral!22, draw=vcoral!75, vaudit={class=vend,adjacent=vtr}] (vbi) at (4.61,17.44) {%
    {\scriptsize\bfseries CodeBuddy IDE}\\ {\tiny\ttfamily copilot.tencent.com}\\ {\tiny 工作区原文 ×3 道}};
  \node[vend, fill=vcoral!22, draw=vcoral!75, vaudit={class=vend}] (vbc) at (7.84,18.21) {%
    {\scriptsize\bfseries CodeBuddy CLI}\\ {\fontsize{4.6}{5.4}\selectfont\ttfamily cos.ap-guangzhou.myqcloud.com}\\ {\tiny 日志 zip·任意路径}};
  \node[vend, fill=vcoral!22, draw=vcoral!75, vaudit={class=vend}] (vqd) at (11.16,18.21) {%
    {\scriptsize\bfseries Qoder 阿里}\\ {\tiny\ttfamily center.qoder.sh}\\ {\tiny merkle 缺漏 files.zip}};
  \node[vend, fill=vcoral!22, draw=vcoral!75, vaudit={class=vend,adjacent=vcp}] (vcu) at (14.39,17.44) {%
    {\scriptsize\bfseries Cursor}\\ {\tiny\ttfamily api2.cursor.sh}\\ {\tiny packfile 影子仓}};
  \node[vend, fill=vcoral!22, draw=vcoral!75, vaudit={class=vend,adjacent=vcu}] (vcp) at (17.33,15.91) {%
    {\scriptsize\bfseries Copilot 微软}\\ {\tiny\ttfamily api.github.com}\\ {\tiny 文件全文 JSON}};

  % ---------- 九条流线（bus → card.south，弧线扇出）----------
  \draw[stream, draw=vcoral!80] (bus) to[out=132,in=-90] (vtr.south); \vzwire{wvtr}{bus;2.9,11.8;vtr.south}{endpoint=bus,vtr}
  \draw[stream, draw=vcoral!80] (bus) to[out=120,in=-90] (vbi.south); \vzwire{wvbi}{bus;4.4,12.6;vbi.south}{endpoint=bus,vbi}
  \draw[stream, draw=vcoral!80] (bus) to[out=104,in=-90] (vbc.south); \vzwire{wvbc}{bus;7.1,13.6;vbc.south}{endpoint=bus,vbc}
  \draw[stream, draw=vcoral!80] (bus) to[out=76,in=-90] (vqd.south);  \vzwire{wvqd}{bus;11.9,13.6;vqd.south}{endpoint=bus,vqd}
  \draw[stream, draw=vcoral!80] (bus) to[out=60,in=-90] (vcu.south);  \vzwire{wvcu}{bus;14.6,12.6;vcu.south}{endpoint=bus,vcu}
  \draw[stream, draw=vcoral!80] (bus) to[out=48,in=-90] (vcp.south);  \vzwire{wvcp}{bus;16.1,11.8;vcp.south}{endpoint=bus,vcp}
  \draw[stream, draw=vgold!85] (bus) to[out=90,in=-90] (vzc.south);   \vzwire{wvzc}{bus;9.5,13.5;vzc.south}{endpoint=bus,vzc}
  \draw[stream, draw=vblue!75] (bus) to[out=150,in=-65] (vkr.south);  \vzwire{wvkr}{bus;5.4,8.4;vkr.south}{endpoint=bus,vkr}
  \draw[stream, draw=vgold!85] (bus) to[out=30,in=-115] (vmm.south);  \vzwire{wvmm}{bus;13.6,8.4;vmm.south}{endpoint=bus,vmm}

  % ---------- 底部图例/判定行 ----------
  \node[mean, text width=18.2cm, anchor=north west, vaudit={}] (mb) at (0.4,1.9) {%
    \textbf{读法}：流线=工作区内容外发通道，色=判定分档——{\color{vcoral!85!black}珊瑚=收集级}（服务端点菜/主动收集）、{\color{vgold!85!black}金=中间档}、{\color{vblue!85!black}蓝=弱门控}；灰虚线=缺失的 consent 面。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=north, vaudit={adjacent=mb}] at ($(mb.south)+(0,-0.14)$) {17/46 家确认隐藏上传 · 九家深剖端点域逐字摘自 figure-pack.json · 2026-09-22~25 静态分析};
\end{tikzpicture}
