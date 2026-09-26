% F15 三段式凭证管线同构对比图（ZCode + 8 家 sweep 确认目标）
% 语义台账：
%   行 = 目标产品（序同 F10/F11）；列 = 三段槽位：①凭证/点菜签发 → ②载荷直传 → ③登记/回报
%   单元格填充 = 槽位角色色相（col1 vblue=签发、col2 vorange=直传、col3 vteal=登记）；
%     虚线灰格 = 该槽位不存在（ghost cell，语义=形状缺席）
%   右侧判定签 = 形状归类：三段式同构(vteal) / 同构·RPC分块(vgold) / API 直收(vgray)
% 几何台账：
%   卡 4.05×1.10cm（class=pcell 全等；ghost 同尺寸），列距 4.55cm，行距 1.72cm，行带半高 0.72cm。
\begin{tikzpicture}[x=1cm,y=1cm,
  pcell/.style={model, minimum width=4.05cm, minimum height=1.10cm, text width=3.75cm,
                font=\scriptsize, align=center, inner sep=2pt},
  ghost/.style={pcell, fill=vmist!45, draw=vgray!50, densely dashed, text=vgray},
  vtag/.style={rounded corners=3pt, inner sep=3pt, font=\scriptsize\bfseries, align=center,
               minimum width=2.2cm, minimum height=0.62cm}]

  % ---------- 顶部主张 ----------
  \node[anchor=west, align=left, font=\small, vaudit={}] (title) at (-3.2,2.62) {{\large 三段式凭证管线是事实标准 —— 6/9 家同构，3 家走 API 直收}\\[1pt] {\color{black!65}签发 \textrightarrow{} 直传 \textrightarrow{} 登记：客户端从不持长期云凭证，全由自家网关短时下发}};

  % ---------- 列头 ----------
  \node[font=\small\bfseries, vaudit={adjacent=row0}] (h1) at (2.05,1.35) {① 凭证/点菜签发};
  \node[font=\small\bfseries, vaudit={adjacent=row0}] (h2) at (6.65,1.35) {② 载荷直传};
  \node[font=\small\bfseries, vaudit={adjacent=row0}] (h3) at (11.25,1.35) {③ 登记/回报};
  \node[font=\small\bfseries, vaudit={}] (h4) at (14.95,1.42) {形状判定};

  % ---------- 行带 ----------
  \begin{pgfonlayer}{bg}
    \fill[band=vteal] (-0.18,-0.72) rectangle (16.20,0.72);
    \foreach \i in {1,...,8}
      \fill[band] (-0.18,{-1.72*\i-0.72}) rectangle (16.20,{-1.72*\i+0.72}); % fv:noaudit
  \end{pgfonlayer}
  \vzbbox{row0}{(-0.18,-0.72)}{(16.20,0.72)}
  \vzbbox{row1}{(-0.18,-2.44)}{(16.20,-1.00)}[adjacent=row0]
  \vzbbox{row2}{(-0.18,-4.16)}{(16.20,-2.72)}[adjacent=row1]
  \vzbbox{row3}{(-0.18,-5.88)}{(16.20,-4.44)}[adjacent=row2]
  \vzbbox{row4}{(-0.18,-7.60)}{(16.20,-6.16)}[adjacent=row3]
  \vzbbox{row5}{(-0.18,-9.32)}{(16.20,-7.88)}[adjacent=row4]
  \vzbbox{row6}{(-0.18,-11.04)}{(16.20,-9.60)}[adjacent=row5]
  \vzbbox{row7}{(-0.18,-12.76)}{(16.20,-11.32)}[adjacent=row6]
  \vzbbox{row8}{(-0.18,-14.48)}{(16.20,-13.04)}[adjacent=row7]

  % ---------- 行标签 ----------
  \node[gtag, vaudit={adjacent=row0}] at (-0.36,0) {ZCode\\{\tiny 基线}};
  \node[gtag, vaudit={adjacent=row1}] at (-0.36,-1.72) {Trae intl\\{\tiny 字节}};
  \node[gtag, vaudit={adjacent=row2}] at (-0.36,-3.44) {Cursor\\{\tiny Anysphere}};
  \node[gtag, vaudit={adjacent=row3}] at (-0.36,-5.16) {CodeBuddy IDE\\{\tiny 腾讯}};
  \node[gtag, vaudit={adjacent=row4}] at (-0.36,-6.88) {CodeBuddy CLI\\{\tiny 腾讯}};
  \node[gtag, vaudit={adjacent=row5}] at (-0.36,-8.60) {Qoder\\{\tiny 阿里}};
  \node[gtag, vaudit={adjacent=row6}] at (-0.36,-10.32) {Kiro\\{\tiny AWS}};
  \node[gtag, vaudit={adjacent=row7}] at (-0.36,-12.04) {Copilot\\{\tiny 微软}};
  \node[gtag, vaudit={adjacent=row8}] at (-0.36,-13.76) {MiniMax\\{\tiny Desktop}};

  % ================= row0 ZCode =================
  \node[pcell, fill=vblue!16, draw=vblue!70, vaudit={class=pcell,inside=row0}] (zc) at (2.05,0) {GET \texttt{/snapshot/}\\ \texttt{upload-credential}\\{\tiny data:null=拒发后门}};
  \node[pcell, fill=vorange!20, draw=vorange!75, vaudit={class=pcell,inside=row0}] (zt) at (6.65,0) {OSS PostObject\\ 密文 multipart 直传};
  \node[pcell, fill=vteal!18, draw=vteal!70, vaudit={class=pcell,inside=row0}] (zr) at (11.25,0) {OSS\textrightarrow{}callbackUrl\\{\tiny 客户端无回执}};
  \node[vtag, fill=vteal!20, draw=vteal!70, text=vteal!70!black, vaudit={class=vtag,inside=row0}] (zv) at (14.95,0) {三段式\\{\tiny 模板}};
  \draw[varr] (zc) -- (zt); \vzwire{wzc}{zc;zt}{endpoint=zc,zt via=row0}
  \draw[varr] (zt) -- (zr); \vzwire{wzr}{zt;zr}{endpoint=zt,zr via=row0}

  % ================= row1 Trae =================
  \node[pcell, fill=vblue!16, draw=vblue!70, vaudit={class=pcell,inside=row1}] (tc) at (2.05,-1.72) {POST \texttt{/report/token}\\ \textrightarrow{}STS 三件套\\{\tiny +V4 签名}};
  \node[pcell, fill=vorange!20, draw=vorange!75, vaudit={class=pcell,inside=row1}] (tt) at (6.65,-1.72) {ImageX \texttt{/upload/v1/<oid>}\\ 原 tar.gz 字节};
  \node[pcell, fill=vteal!18, draw=vteal!70, vaudit={class=pcell,inside=row1}] (tr) at (11.25,-1.72) {POST \texttt{/device/log/}\\ \texttt{callback} 回报 Uri};
  \node[vtag, fill=vteal!20, draw=vteal!70, text=vteal!70!black, vaudit={class=vtag,inside=row1}] (tv) at (14.95,-1.72) {三段式\\{\tiny 任务队列点菜}};
  \draw[varr] (tc) -- (tt); \vzwire{wtc}{tc;tt}{endpoint=tc,tt via=row1}
  \draw[varr] (tt) -- (tr); \vzwire{wtr}{tt;tr}{endpoint=tt,tr via=row1}

  % ================= row2 Cursor =================
  \node[pcell, fill=vblue!16, draw=vblue!70, vaudit={class=pcell,inside=row2}] (cc) at (2.05,-3.44) {\texttt{CreatePackfileUpload}\\ \textrightarrow{}签发 uuid+chunk};
  \node[pcell, fill=vorange!20, draw=vorange!75, vaudit={class=pcell,inside=row2}] (ct) at (6.65,-3.44) {\texttt{UploadPackfileChunk}\\ $\times$N $\leq$64MiB 分块};
  \node[pcell, fill=vteal!18, draw=vteal!70, vaudit={class=pcell,inside=row2}] (cr) at (11.25,-3.44) {\texttt{CompletePackfile}\\ \texttt{Upload} 登记};
  \node[vtag, fill=vgold!22, draw=vgold!80, text=vgold!80!black, vaudit={class=vtag,inside=row2}] (cv) at (14.95,-3.44) {同构·RPC\\{\tiny 非对象存储}};
  \draw[varr] (cc) -- (ct); \vzwire{wcc}{cc;ct}{endpoint=cc,ct via=row2}
  \draw[varr] (ct) -- (cr); \vzwire{wcr}{ct;cr}{endpoint=ct,cr via=row2}

  % ================= row3 CodeBuddy IDE =================
  \node[pcell, fill=vblue!16, draw=vblue!70, vaudit={class=pcell,inside=row3}] (bc) at (2.05,-5.16) {\texttt{handshake}+\\ \texttt{upload\_addr}\\ \textrightarrow{}COS STS};
  \node[pcell, fill=vorange!20, draw=vorange!75, vaudit={class=pcell,inside=row3}] (bt) at (6.65,-5.16) {\texttt{cos.putObject}\\ 原文直传 COS};
  \node[pcell, fill=vteal!18, draw=vteal!70, vaudit={class=pcell,inside=row3}] (br) at (11.25,-5.16) {POST \texttt{/codebase/}\\ \texttt{index} 登记索引};
  \node[vtag, fill=vteal!20, draw=vteal!70, text=vteal!70!black, vaudit={class=vtag,inside=row3}] (bv) at (14.95,-5.16) {三段式\\{\tiny merkle 点菜}};
  \draw[varr] (bc) -- (bt); \vzwire{wbc}{bc;bt}{endpoint=bc,bt via=row3}
  \draw[varr] (bt) -- (br); \vzwire{wbr}{bt;br}{endpoint=bt,br via=row3}

  % ================= row4 CodeBuddy CLI =================
  \node[pcell, fill=vblue!16, draw=vblue!70, vaudit={class=pcell,inside=row4}] (dc) at (2.05,-6.88) {GET \texttt{/v2/logs/}\\ \texttt{upload\_credentials}};
  \node[pcell, fill=vorange!20, draw=vorange!75, vaudit={class=pcell,inside=row4}] (dt) at (6.65,-6.88) {COS \texttt{putObject}\\ zip 明文直传};
  \node[pcell, fill=vteal!18, draw=vteal!70, vaudit={class=pcell,inside=row4}] (dr) at (11.25,-6.88) {PUT \texttt{/upload\_task}\\ \texttt{?state=}HMAC 回报};
  \node[vtag, fill=vteal!20, draw=vteal!70, text=vteal!70!black, vaudit={class=vtag,inside=row4}] (dv) at (14.95,-6.88) {三段式\\{\tiny 任务队列点菜}};
  \draw[varr] (dc) -- (dt); \vzwire{wdc}{dc;dt}{endpoint=dc,dt via=row4}
  \draw[varr] (dt) -- (dr); \vzwire{wdr}{dt;dr}{endpoint=dt,dr via=row4}

  % ================= row5 Qoder =================
  \node[pcell, fill=vblue!16, draw=vblue!70, vaudit={class=pcell,inside=row5}] (qc) at (2.05,-8.60) {签名头 Appcode\\ +Md5+Bearer\\{\tiny 硬编码密钥}};
  \node[pcell, fill=vorange!20, draw=vorange!75, vaudit={class=pcell,inside=row5}] (qt) at (6.65,-8.60) {PUT \texttt{/file/upload}\\ files.zip multipart};
  \node[pcell, fill=vteal!18, draw=vteal!70, vaudit={class=pcell,inside=row5}] (qr) at (11.25,-8.60) {merkle sync 注册\\{\tiny initCodebase 控制面}};
  \node[vtag, fill=vteal!20, draw=vteal!70, text=vteal!70!black, vaudit={class=vtag,inside=row5}] (qv) at (14.95,-8.60) {三段式\\{\tiny notFound 点菜}};
  \draw[varr] (qc) -- (qt); \vzwire{wqc}{qc;qt}{endpoint=qc,qt via=row5}
  \draw[varr] (qt) -- (qr); \vzwire{wqr}{qt;qr}{endpoint=qt,qr via=row5}

  % ================= row6 Kiro =================
  \node[ghost, vaudit={class=pcell,inside=row6}] (kc) at (2.05,-10.32) {— 无凭证段\\{\tiny Bearer 由 ACP 供给}};
  \node[pcell, fill=vviolet!16, draw=vviolet!70, vaudit={class=pcell,inside=row6}] (kt) at (6.65,-10.32) {POST \texttt{/agents/}\\ \texttt{activity} 明文直推};
  \node[ghost, vaudit={class=pcell,inside=row6}] (kr) at (11.25,-10.32) {— 无登记段\\{\tiny 响应即回执}};
  \node[vtag, fill=vgray!15, draw=vgray!60, text=vgray!90!black, vaudit={class=vtag,inside=row6}] (kv) at (14.95,-10.32) {API 直收\\{\tiny region 门}};
  \draw[varr] (kc) -- (kt); \vzwire{wkc}{kc;kt}{endpoint=kc,kt via=row6}
  \draw[varr] (kt) -- (kr); \vzwire{wkr}{kt;kr}{endpoint=kt,kr via=row6}

  % ================= row7 Copilot =================
  \node[ghost, vaudit={class=pcell,inside=row7}] (pc) at (2.05,-12.04) {ExP-TAS 门\\{\tiny 非凭证签发}};
  \node[pcell, fill=vviolet!16, draw=vviolet!70, vaudit={class=pcell,inside=row7}] (pt) at (6.65,-12.04) {POST \texttt{/external/}\\ \texttt{code/ingest} 直收};
  \node[pcell, fill=vteal!18, draw=vteal!70, vaudit={class=pcell,inside=row7}] (pr) at (11.25,-12.04) {POST \texttt{/ingest/}\\ \texttt{finalize} 封口};
  \node[vtag, fill=vgray!15, draw=vgray!60, text=vgray!90!black, vaudit={class=vtag,inside=row7}] (pv) at (14.95,-12.04) {API 直收\\{\tiny /batch 点菜}};
  \draw[varr] (pc) -- (pt); \vzwire{wpc}{pc;pt}{endpoint=pc,pt via=row7}
  \draw[varr] (pt) -- (pr); \vzwire{wpr}{pt;pr}{endpoint=pt,pr via=row7}

  % ================= row8 MiniMax =================
  \node[ghost, vaudit={class=pcell,inside=row8}] (mc) at (2.05,-13.76) {— 无凭证段};
  \node[pcell, fill=vviolet!16, draw=vviolet!70, vaudit={class=pcell,inside=row8}] (mt) at (6.65,-13.76) {POST \texttt{/eval/*/report}\\ 每 LLM 调用直发};
  \node[ghost, vaudit={class=pcell,inside=row8}] (mr) at (11.25,-13.76) {— 无登记段};
  \node[vtag, fill=vgray!15, draw=vgray!60, text=vgray!90!black, vaudit={class=vtag,inside=row8}] (mv) at (14.95,-13.76) {API 直收\\{\tiny eval 头条}};
  \draw[varr] (mc) -- (mt); \vzwire{wmc}{mc;mt}{endpoint=mc,mt via=row8}
  \draw[varr] (mt) -- (mr); \vzwire{wmr}{mt;mr}{endpoint=mt,mr via=row8}

  % ---------- 脚注（MiniMax 第二条道）----------
  \node[font=\tiny, text=vgray, align=left, vaudit={adjacent=row8,adjacent=mv}] (mn) at (16.32,-13.76) [anchor=west] {MiniMax 另有 indexing 道：\\ OSS presign 三段式，\\ 但是显式 opt-in 特性};

  % ---------- 底部含义框 ----------
  \node[mean, text width=18.4cm, anchor=north west, align=left, vaudit={}] (mb) at (-3.2,-15.35) {%
    \textbf{对象}：vblue=签发槽 · vorange=对象存储/分块直传槽 · vviolet=API 直收槽 · vteal=登记槽 · 虚线灰=槽位缺席。\\[3pt]
    \textbf{机制}：同构六家的共同拓扑——客户端从不持长期云凭证，凭自家网关签发的短时凭证（OSS form / COS STS / ImageX V4 / packfile uuid）绕过 API 网关直传对象存储，再由第三段把对象句柄登记回服务端账本；API 直收三家（Copilot/Kiro/MiniMax）载荷经产品 API 面入栈，不具备该形状——但 Copilot 以 /batch 在控制面实现了等价点菜能力。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=north, vaudit={adjacent=mb}] at ($(mb.south)+(0,-0.18)$) {shape-isomorphism map · 端点名逐字摘自各 figure-pack.json mech.stages · ZCode 行即 F01 骨架};
\end{tikzpicture}
