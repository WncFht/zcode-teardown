% F02 Copilot Chat external ingest 泳道流程图（含 ExP-TAS 控制面）
% 语义台账：
%   三列泳道：金=控制面 default.exp-tas.com（ExP-TAS 远程翻转）；蓝=客户端 extension host；
%     珊瑚=服务端 api.github.com。流程自上而下按步骤号 1–13 推进。
%   热点：S3 /ingest/batch 服务端点菜 doc_ids（vcoral 加重框）——客户端枚举全库指纹上交，
%     服务端回传想要哪些文件，客户端只发被点名的；
%   死代码：consent modal 双实现（:2363 stub + :6982 真 modal）全包零调用点——画成虚线幽灵框；
%   卫生漏洞：C4 过滤链 177 ext / 26 dir / 5 basename / 11 scheme，basename 不含
%     .env/id_rsa/.npmrc → 凭据文件直通；
%   凭证：getGitHubSession('permissive'→'any',{silent:true}) → Bearer 用户 OAuth，零提示。
% 几何台账：
%   列带：ctrl -1.8..3.0（仅顶部一节），client 3.6..10.0，server 10.6..16.2；
%   节点宽 5.0cm（cnode 4.2cm），行距 ~1.7cm；c1→c2 走东侧绕行避开幽灵框。
\begin{tikzpicture}[x=1cm,y=1cm,
  fnode/.style={model, minimum width=5.0cm, minimum height=1.05cm, text width=4.7cm,
                font=\scriptsize, align=center, inner sep=2pt},
  cnode/.style={fnode, minimum width=4.2cm, text width=3.9cm},
  ghost/.style={fnode, fill=vmist!55, draw=vcoral!65, densely dashed, text=vcoral!75!black},
  hot/.style={fnode, fill=vcoral!32, draw=vcoral!90, line width=1.2pt},
  cli/.style={fnode, fill=vblue!14, draw=vblue!70},
  srv/.style={fnode, fill=vcoral!14, draw=vcoral!75}]

  % ---------- 顶部主张 ----------
  \node[anchor=west, align=left, font=\small, vaudit={}] (title) at (-1.9,2.8) {{\large Copilot Chat external ingest 泳道 —— 服务端 \texttt{/batch} 点菜 + ExP-TAS 中会话热翻}\\[1pt] {\color{black!65}隐藏设置 default:false 但 onExp 可远程翻转；consent modal 双实现零调用者；basename 黑名单漏 .env / id\_rsa / .npmrc}};

  % ---------- 列头 ----------
  \node[font=\small\bfseries, vaudit={adjacent=ctrl}] (htas) at (0.6,1.5) {控制面 · ExP-TAS};
  \node[font=\small\bfseries, vaudit={adjacent=client}] (hcli) at (6.8,1.5) {客户端 · extension host};
  \node[font=\small\bfseries, vaudit={adjacent=server}] (hsrv) at (13.4,1.5) {服务端 · api.github.com};

  % ---------- 泳道底带 ----------
  \begin{pgfonlayer}{bg}
    \fill[band=vgold] (-1.8,0.98) rectangle (3.0,-1.05);       % fv:noaudit
    \fill[band=vblue] (3.6,0.98) rectangle (10.0,-16.65);      % fv:noaudit
    \fill[band=vcoral] (10.6,0.98) rectangle (16.2,-21.9);     % fv:noaudit
  \end{pgfonlayer}
  \vzbbox{ctrl}{(-1.8,0.98)}{(3.0,-1.05)}
  \vzbbox{client}{(3.6,0.98)}{(10.0,-16.65)}
  \vzbbox{server}{(10.6,0.98)}{(16.2,-21.9)}

  % ---------- 边界标注（TLS gutter）----------
  \node[font=\tiny, text=vgray, rotate=90, vaudit={adjacent=client,adjacent=server}] (tlslab) at (10.3,-6.5) {TLS · api.github.com};

  % ---------- 控制面（row 0）----------
  \node[cnode, fill=vgold!18, draw=vgold!80, vaudit={inside=ctrl}] (t1) at (0.6,0) {ExP-TAS\\ \texttt{GET /vscode/ab}\\ {\tiny Configs[].Parameters}\\ {\tiny 30min refetch \textrightarrow{} 热翻门}};

  % ================= 客户端链 =================
  \node[cli, vaudit={inside=client}] (c1) at (6.8,0) {\textbf{1} 门 · 隐藏设置（onExp）\\ \texttt{codeSearchExternalIngest.enabled}\\ {\tiny default:false · tags[advanced,onExp]}\\ {\tiny 用户值\textgreater TAS 变量\textgreater 默认}};
  \node[ghost, vaudit={inside=client}] (g) at (6.8,-1.85) {consent modal $\times$2 —— 零调用者\\ {\tiny promptForExpandedLocalIndexing：}\\ {\tiny :2363 stub return!1 + :6982 真 modal}\\ {\tiny 上传全程无任何用户确认}};
  \node[cli, vaudit={inside=client}] (c2) at (6.8,-3.75) {\textbf{2} 触发 · 静默\\ {\tiny 每次 @workspace 语义搜索 searchLocalDiff}\\ {\tiny | 命令 buildRemoteWorkspaceIndex}\\ {\tiny search\textrightarrow{}doIngest 用 noop progress}};
  \node[cli, vaudit={inside=client}] (c3) at (6.8,-5.6) {\textbf{3} 采集 · 全库枚举\\ {\tiny diff $\leq$2000·$\leq$70\% + findFiles(**/*)}\\ {\tiny +FileSystemWatcher \textrightarrow{} sqlite Files}\\ {\tiny path·size·mtime·docSha·shouldIngest}};
  \node[cli, vaudit={inside=client}] (c4) at (6.8,-7.45) {\textbf{4} 过滤链 · basename 漏密钥\\ {\tiny 177 ext / 26 dir / 5 basename / 11 scheme}\\ {\tiny + wasm IngestFilter + isCopilotIgnored}\\ {\tiny\color{vcoral!90}.env / id\_rsa / .npmrc 无一命中 \textrightarrow{} 直通}};
  \node[cli, vaudit={inside=client}] (c5) at (6.8,-9.3) {\textbf{5} 打包 · 指纹先行\\ {\tiny checkpoint=sha256($\Sigma$uri+docSha)}\\ {\tiny +GeoFilter +coded\_symbols}\\ {\tiny fileset=vscode.copilot-chat.<uuid>}};
  \node[cli, fill=vblue!22, draw=vblue!80, vaudit={inside=client}] (c6) at (6.8,-11.15) {\textbf{6} 凭证 · 静默 Bearer\\ {\tiny getGitHubSession('permissive'\textrightarrow{}'any')}\\ {\tiny \{silent:true\} \textrightarrow{} Bearer <用户 OAuth>}\\ {\tiny +X-Client-\{Application,Source,Feature\}}};

  % ================= 服务端链 =================
  \node[srv, vaudit={inside=server}] (s1) at (13.4,-12.25) {\textbf{7} 握手 · POST \texttt{/external/code/ingest}\\ {\tiny \textrightarrow{} ingest\_id + coded\_symbol\_range}\\ {\tiny 409 全量重启$\leq$3 · 429 清旧 fileset}};
  \node[srv, vaudit={inside=server}] (s2) at (13.4,-14.0) {\textbf{8} 对账 · \texttt{/ingest/coded\_symbols}\\ {\tiny range-loop 至 next 为空}\\ {\tiny 服务端驱动符号 reconcile}};
  \node[hot, vaudit={inside=server}] (s3) at (13.4,-15.75) {\textbf{9} 点菜 · \texttt{/ingest/batch} \textrightarrow{} \{doc\_ids\}\\ {\tiny\textbf{服务端自选要哪些文件}}\\ {\tiny page\_token 循环 · reconcile 全由服务端}};
  \node[srv, vaudit={inside=server}] (s4) at (13.4,-17.5) {\textbf{11} 上传 · \texttt{/ingest/document} $\times$N\\ {\tiny \{content:b64 全文, file\_path:\texttt{<folderId>/<rel>}\}}\\ {\tiny $\leq$64 并发 · 500$\times$3 / 429$\times$10 重试}};
  \node[srv, vaudit={inside=server}] (s5) at (13.4,-19.2) {\textbf{12} 封口 · \texttt{/ingest/finalize}\\ {\tiny 提交 checkpoint \textrightarrow{} 下次只传增量}\\ {\tiny 持久化 externalIngest.checkpoint}};
  \node[srv, vaudit={inside=server}] (s6) at (13.4,-20.95) {\textbf{13} 查询出口 · \texttt{/embeddings/code/search}\\ {\tiny \{prompt$\leq$7800B 原文, scoping:fileset:<name>\}}\\ {\tiny 每次 @workspace 搜索紧随 ingest 发出}};

  % ================= 客户端回传（被点菜后读盘） =================
  \node[cli, vaudit={inside=client}] (c7) at (6.8,-15.75) {\textbf{10} 读盘 \textrightarrow{} base64\\ {\tiny 只发被点名 doc\_ids · readLimiter(20)}\\ {\tiny 读失败仍发空壳 content:""}};

  % ---------- 连线 ----------
  \draw[varr, densely dashed, draw=vgold!85] (t1) -- (c1); \vzwire{wctl}{t1;c1}{endpoint=t1,c1 via=ctrl,client}
  \draw[lead, densely dashed] (c1.south) -- (g.north);       \vzwire{wg}{c1.south;g.north}{endpoint=c1,g via=client}
  \draw[varr] (c1.east) -- ++(0.42,0) |- (c2.east);          \vzwire{w1}{c1.east;c2.east}{endpoint=c1,c2 via=client}
  \draw[varr, shorten <=3pt, shorten >=3pt] (c2.south) -- (c3.north); \vzwire{w2}{c2.south;c3.north}{endpoint=c2,c3 via=client}
  \draw[varr, shorten <=3pt, shorten >=3pt] (c3.south) -- (c4.north); \vzwire{w3}{c3.south;c4.north}{endpoint=c3,c4 via=client}
  \draw[varr, shorten <=3pt, shorten >=3pt] (c4.south) -- (c5.north); \vzwire{w4}{c4.south;c5.north}{endpoint=c4,c5 via=client}
  \draw[varr, shorten <=3pt, shorten >=3pt] (c5.south) -- (c6.north); \vzwire{w5}{c5.south;c6.north}{endpoint=c5,c6 via=client}
  \draw[varr, shorten <=2pt, shorten >=2pt] (c6.east) -- ++(0.42,0) |- (s1.west); \vzwire{w6}{c6.east;s1.west}{endpoint=c6,s1 via=client,server}
  \draw[varr, shorten <=3pt, shorten >=3pt] (s1.south) -- (s2.north); \vzwire{w7}{s1.south;s2.north}{endpoint=s1,s2 via=server}
  \draw[varr, shorten <=3pt, shorten >=3pt] (s2.south) -- (s3.north); \vzwire{w8}{s2.south;s3.north}{endpoint=s2,s3 via=server}
  \draw[varr, shorten <=2pt, shorten >=2pt] (s3.west) -- (c7.east);   \vzwire{w9}{s3.west;c7.east}{endpoint=s3,c7 via=server,client}
  \draw[varr, shorten <=2pt, shorten >=2pt] (c7.south) |- (s4.west);  \vzwire{w10}{c7.south;s4.west}{endpoint=c7,s4 via=client,server}
  \draw[varr, shorten <=3pt, shorten >=3pt] (s4.south) -- (s5.north); \vzwire{w11}{s4.south;s5.north}{endpoint=s4,s5 via=server}
  \draw[varr, shorten <=3pt, shorten >=3pt] (s5.south) -- (s6.north); \vzwire{w12}{s5.south;s6.north}{endpoint=s5,s6 via=server}

  % ---------- 底部含义框 ----------
  \node[mean, text width=17.5cm, anchor=north west, align=left, vaudit={}] (mb) at (-1.9,-22.4) {%
    \textbf{读法}：蓝=客户端 · 珊瑚=服务端 · 金=控制面 · 虚线灰框=死代码。粗框 \texttt{/batch} 即服务端点菜——客户端枚举全库指纹上交，服务端回传想要的 doc\_ids，客户端只发被点名文件。\\[3pt]
    \textbf{判点}：onExp 隐藏设置经 TAS 30min refetch 中会话热翻，「默认关」全在服务端一念之间；basename 黑名单仅 5 项且不含 .env / id\_rsa / .npmrc；consent modal 双实现零调用——同意面是展品不是闸；凭证走 \{silent:true\} 用户 OAuth Bearer。\\[3pt]
    \textbf{量级}：首次全量 $\approx$55MB（5000 文件）· 增量仅服务端点名 doc\_ids $\approx$220KB/20 文件 · 零漂移 0B · 每次搜索另发 prompt$\leq$7800B。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=north, vaudit={adjacent=mb}] at ($(mb.south)+(0,-0.18)$) {external-ingest swimlane · 端点/字段逐字摘自 extension.js:2363 performIngestion · Copilot Chat 0.48.1 · F02};
\end{tikzpicture}
