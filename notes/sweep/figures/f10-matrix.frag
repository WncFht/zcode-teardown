% F10 九家横向矩阵总览图（ZCode + 8 家 sweep 确认目标）
% 语义台账：
%   行 = 目标产品（9 条行带，序同 F11：ZCode 基线置顶，其余按首现日排序）
%   列 = §10 六维：服务端点菜能力 / 密钥-denylist 卫生 / consent 面 / 加密姿态 / 引入时点 / 单事件量级
%   单元格填充 = 该维度分档判定：vcoral=最差档（主动收集/无过滤/明文/假开关），
%     vgold=有缺口的中间态，vgreen=相对最轻（无点菜/真 denylist），vmist=信息项（非判定）
%   每格文字 = 压缩判据（≤2 行 scriptsize）；consent 列整列珊瑚——9 家全失守
% 几何台账：
%   卡 3.3×1.16cm（class=cell 全等），行距 1.62cm，列距 3.62cm；
%   行带半高 0.75cm，带左右各出 0.18cm；左侧 gutter 放产品名标签。
\begin{tikzpicture}[x=1cm,y=1cm,
  cell/.style={model, minimum width=3.3cm, minimum height=1.16cm, text width=2.95cm,
               font=\scriptsize, align=center, inner sep=2pt},
  colh/.style={font=\small\bfseries, align=center, inner sep=1pt},
  sw/.style={font=\scriptsize, text=black!70}]

  % ---------- 顶部主张 ----------
  \node[font=\large, anchor=west, vaudit={class=txt}] (title) at (-3.2,2.5) {九家隐藏上传管线横评矩阵 —— consent 列全列失守，分级差在点菜能力与卫生};

  % ---------- 列头 ----------
  \foreach \j/\h in {0/{服务端点菜能力},1/{密钥·denylist 卫生},2/{consent 面},
                    3/{加密姿态},4/{引入时点},5/{单事件量级}}
    \node[colh, vaudit={}] (colh\j) at ({3.78*\j+1.66},1.35) {\h};

  % ---------- 行带（先画容器）----------
  \begin{pgfonlayer}{bg}
    \fill[band=vteal] (-0.18,-0.78) rectangle (22.40,0.78);
    \foreach \i in {1,...,8}
      \fill[band] (-0.18,{-1.78*\i-0.78}) rectangle (22.40,{-1.78*\i+0.78}); % fv:noaudit
  \end{pgfonlayer}
  \vzbbox{row0}{(-0.18,-0.78)}{(22.40,0.78)}
  \vzbbox{row1}{(-0.18,-2.56)}{(22.40,-1.00)}[adjacent=row0]
  \vzbbox{row2}{(-0.18,-4.34)}{(22.40,-2.78)}[adjacent=row1]
  \vzbbox{row3}{(-0.18,-6.12)}{(22.40,-4.56)}[adjacent=row2]
  \vzbbox{row4}{(-0.18,-7.90)}{(22.40,-6.34)}[adjacent=row3]
  \vzbbox{row5}{(-0.18,-9.68)}{(22.40,-8.12)}[adjacent=row4]
  \vzbbox{row6}{(-0.18,-11.46)}{(22.40,-9.90)}[adjacent=row5]
  \vzbbox{row7}{(-0.18,-13.24)}{(22.40,-11.68)}[adjacent=row6]
  \vzbbox{row8}{(-0.18,-15.02)}{(22.40,-13.46)}[adjacent=row7]

  % ---------- 行标签 ----------
  \node[gtag, vaudit={adjacent=row0}] at (-0.38,-0.00) {ZCode\\{\tiny 基线（开源前）}};
  \node[gtag, vaudit={adjacent=row1}] at (-0.38,-1.78) {Trae intl\\{\tiny 字节}};
  \node[gtag, vaudit={adjacent=row2}] at (-0.38,-3.56) {Cursor\\{\tiny Anysphere}};
  \node[gtag, vaudit={adjacent=row3}] at (-0.38,-5.34) {CodeBuddy IDE\\{\tiny 腾讯}};
  \node[gtag, vaudit={adjacent=row4}] at (-0.38,-7.12) {CodeBuddy CLI\\{\tiny 腾讯}};
  \node[gtag, vaudit={adjacent=row5}] at (-0.38,-8.90) {Qoder\\{\tiny 阿里}};
  \node[gtag, vaudit={adjacent=row6}] at (-0.38,-10.68) {Kiro\\{\tiny AWS}};
  \node[gtag, vaudit={adjacent=row7}] at (-0.38,-12.46) {Copilot Chat\\{\tiny 微软}};
  \node[gtag, vaudit={adjacent=row8}] at (-0.38,-14.24) {MiniMax\\{\tiny Desktop}};

  % ================= row0 ZCode =================
  \node[cell, fill=vgold!28, draw=vgold!80, vaudit={class=cell,inside=row0}] (z1) at (1.66,-0.00) {中 · 凭证参数签发\\{\tiny max\_size/base 指针}};
  \node[cell, fill=vgold!28, draw=vgold!80, vaudit={class=cell,inside=row0}] (z2) at (5.44,-0.00) {有漏 · 基名+后缀\\{\tiny v3.1 .git 整树豁免}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row0}] (z3) at (9.22,-0.00) {假开关 · 默认翻转\\{\tiny +装饰化}};
  \node[cell, fill=vgold!28, draw=vgold!80, vaudit={class=cell,inside=row0}] (z4) at (13.00,-0.00) {AES+RSA wrap\\{\tiny 厂方私钥可解}};
  \node[cell, fill=vmist!70, draw=vgray!60, vaudit={class=cell,inside=row0}] (z5) at (16.78,-0.00) {26-05 引入\\{\tiny 09-19 \textbf{移除}}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row0}] (z6) at (20.56,-0.00) {0.3–300MB\\{\tiny .git 全树进包}};

  % ================= row1 Trae =================
  \node[cell, fill=vcoral!30, draw=vcoral!75, vaudit={class=cell,inside=row1}] (t1) at (1.66,-1.78) {最强 · 任务模型\\{\tiny +.so 孪生+WSS}};
  \node[cell, fill=vcoral!30, draw=vcoral!75, vaudit={class=cell,inside=row1}] (t2) at (5.44,-1.78) {最差 · 主动收竞品\\{\tiny 转录三件套}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row1}] (t3) at (9.22,-1.78) {幻影键 · 零 UI};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row1}] (t4) at (13.00,-1.78) {明文\\{\tiny 仅指纹头包装}};
  \node[cell, fill=vmist!70, draw=vgray!60, vaudit={class=cell,inside=row1}] (t5) at (16.78,-1.78) {$\leq$25-01\\{\tiny 左截断即阳性}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row1}] (t6) at (20.56,-1.78) {0.1–3MB\\{\tiny 竞品旗标 50MB+}};

  % ================= row2 Cursor =================
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row2}] (c1) at (1.66,-3.56) {强 · uuid/chunk 签发\\{\tiny +FileSync 逐键}};
  \node[cell, fill=vcoral!30, draw=vcoral!75, vaudit={class=cell,inside=row2}] (c2) at (5.44,-3.56) {主动收 · allowlist\\{\tiny \~{}/.claude .codex .agents}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row2}] (c3) at (9.22,-3.56) {24h 静默升级\\{\tiny onboarding 卡}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row2}] (c4) at (13.00,-3.56) {明文\\{\tiny 路径加密是摆设}};
  \node[cell, fill=vmist!70, draw=vgray!60, vaudit={class=cell,inside=row2}] (c5) at (16.78,-3.56) {26-02 proto\\{\tiny 03 接线}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row2}] (c6) at (20.56,-3.56) {首包 10MB–1GB+\\{\tiny 增量 KB–MB/300s}};

  % ================= row3 CodeBuddy IDE =================
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row3}] (b1) at (1.66,-5.34) {强 · missing 回捞\\{\tiny +merkle 缺漏}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row3}] (b2) at (5.44,-5.34) {无密钥黑名单\\{\tiny 过滤器有洞}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row3}] (b3) at (9.22,-5.34) {谎称 searching\\{\tiny 32 设置零数据键}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row3}] (b4) at (13.00,-5.34) {无 · 明文\\{\tiny cos.putObject 直传}};
  \node[cell, fill=vmist!70, draw=vgray!60, vaudit={class=cell,inside=row3}] (b5) at (16.78,-5.34) {$\leq$25-07\\{\tiny 左截断即阳性}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row3}] (b6) at (20.56,-5.34) {首建 15–25MB\\{\tiny 顶 5GB/rebuild}};

  % ================= row4 CodeBuddy CLI =================
  \node[cell, fill=vcoral!30, draw=vcoral!75, vaudit={class=cell,inside=row4}] (d1) at (1.66,-7.12) {最强 · 任务队列\\{\tiny allWorkspaces 恒真}};
  \node[cell, fill=vcoral!30, draw=vcoral!75, vaudit={class=cell,inside=row4}] (d2) at (5.44,-7.12) {无过滤 · 跨产品\\{\tiny 日志目录全收}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row4}] (d3) at (9.22,-7.12) {零本地 · 纯远端\\{\tiny 推送激活}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row4}] (d4) at (13.00,-7.12) {明文 zip\\{\tiny HMAC 回报非加密}};
  \node[cell, fill=vmist!70, draw=vgray!60, vaudit={class=cell,inside=row4}] (d5) at (16.78,-7.12) {25-11-07\\{\tiny 同日 6h 窗口}};
  \node[cell, fill=vgold!28, draw=vgold!80, vaudit={class=cell,inside=row4}] (d6) at (20.56,-7.12) {0.1–10MB/任务\\{\tiny 无 maxRawSize 上界}};

  % ================= row5 Qoder =================
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row5}] (q1) at (1.66,-8.90) {强 · merkle 点名\\{\tiny notFoundFileIds}};
  \node[cell, fill=vgold!28, draw=vgold!80, vaudit={class=cell,inside=row5}] (q2) at (5.44,-8.90) {53 keep-list\\{\tiny 漏 .npmrc+诱饵函数}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row5}] (q3) at (9.22,-8.90) {X-Stilla 标记\\{\tiny 不拦截上传}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row5}] (q4) at (13.00,-8.90) {明文 zip\\{\tiny 诊断 RSA 封}};
  \node[cell, fill=vmist!70, draw=vgray!60, vaudit={class=cell,inside=row5}] (q5) at (16.78,-8.90) {26-01 (0.3.0)\\{\tiny 基建左截断}};
  \node[cell, fill=vgold!28, draw=vgold!80, vaudit={class=cell,inside=row5}] (q6) at (20.56,-8.90) {$\leq$9MiB/批\\{\tiny back\_flow \textasciitilde20 字段}};

  % ================= row6 Kiro =================
  \node[cell, fill=vgreen!30, draw=vgreen!75, vaudit={class=cell,inside=row6}] (k1) at (1.66,-10.68) {弱 · 仅 region 门\\{\tiny 服务端不点菜}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row6}] (k2) at (5.44,-10.68) {无过滤概念\\{\tiny 完整转录全收}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row6}] (k3) at (9.22,-10.68) {无任何开关\\{\tiny 3s 定时无条件}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row6}] (k4) at (13.00,-10.68) {无 · 明文 POST};
  \node[cell, fill=vmist!70, draw=vgray!60, vaudit={class=cell,inside=row6}] (k5) at (16.78,-10.68) {26-05 首现\\{\tiny 07 默认开}};
  \node[cell, fill=vgreen!30, draw=vgreen!75, vaudit={class=cell,inside=row6}] (k6) at (20.56,-10.68) {5–500KB/批\\{\tiny ≤25 条/3s}};

  % ================= row7 Copilot =================
  \node[cell, fill=vcoral!30, draw=vcoral!75, vaudit={class=cell,inside=row7}] (p1) at (1.66,-12.46) {最强 · /batch 点名\\{\tiny 服务端自选 doc\_ids}};
  \node[cell, fill=vgold!28, draw=vgold!80, vaudit={class=cell,inside=row7}] (p2) at (5.44,-12.46) {177 扩展名全\\{\tiny basename 漏 .env 系}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row7}] (p3) at (9.22,-12.46) {隐藏 onExp\\{\tiny +死 modal×2}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row7}] (p4) at (13.00,-12.46) {无 · 明文 JSON\\{\tiny Bearer 即 OAuth}};
  \node[cell, fill=vmist!70, draw=vgray!60, vaudit={class=cell,inside=row7}] (p5) at (16.78,-12.46) {26-05 (0.48.1)\\{\tiny 探针 404 遮蔽}};
  \node[cell, fill=vgold!28, draw=vgold!80, vaudit={class=cell,inside=row7}] (p6) at (20.56,-12.46) {首 55MB\\{\tiny 增量 220KB}};

  % ================= row8 MiniMax =================
  \node[cell, fill=vgreen!30, draw=vgreen!75, vaudit={class=cell,inside=row8}] (m1) at (1.66,-14.24) {无 · 每调用全量推\\{\tiny 服务端不点菜}};
  \node[cell, fill=vgold!28, draw=vgold!80, vaudit={class=cell,inside=row8}] (m2) at (5.44,-14.24) {eval 无过滤\\{\tiny 索引道 \textasciitilde25 项}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row8}] (m3) at (9.22,-14.24) {enabled:true\\{\tiny +Help improve placebo}};
  \node[cell, fill=vcoral!26, draw=vcoral!75, vaudit={class=cell,inside=row8}] (m4) at (13.00,-14.24) {明文\\{\tiny key 随 Bearer 同送}};
  \node[cell, fill=vmist!70, draw=vgray!60, vaudit={class=cell,inside=row8}] (m5) at (16.78,-14.24) {26-08\\{\tiny 引入即默认开}};
  \node[cell, fill=vgold!28, draw=vgold!80, vaudit={class=cell,inside=row8}] (m6) at (20.56,-14.24) {$\leq$16MiB/事件\\{\tiny 快照+steps+meta}};

  % ---------- 图例（右上）----------
  \node[draw=vgray!50, fill=white, rounded corners=3pt, inner sep=5pt, align=left, font=\scriptsize,
        vaudit={class=leg}] (leg) at (22.40,-15.55) [anchor=north east] {%
    {\color{vcoral!80}\rule{7pt}{7pt}}\;最差档（收集/无过滤/明文/假开关）\\
    {\color{vgold!95}\rule{7pt}{7pt}}\;有缺口的中间态\\
    {\color{vgreen!85}\rule{7pt}{7pt}}\;相对最轻（不点菜/真 denylist）\\
    {\color{vgray!70}\rule{7pt}{7pt}}\;信息项（时点列不参与判定）};

  % ---------- 底部含义框 ----------
  \node[mean, text width=18.4cm, anchor=north west, align=left, vaudit={}] (mb) at (-3.2,-15.55) {%
    \textbf{判决}：consent 列整列珊瑚——9 家无一家在引入时携带真 consent（假开关/隐藏键/谎称/零开关五形态）。\\[3pt]
    \textbf{稳定性}：分级主战场在 C1 点菜粒度（任务队列遥控、逐文件点名最强）与 C2 卫生——最差三家从「漏网」升级为「主动收集」（Trae/Cursor/CodeBuddy CLI）。\\[3pt]
    加密列仅 ZCode 做过客户端加密（厂方私钥仍可解），余皆明文——结论与加密无关。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=north, vaudit={adjacent=mb}] at ($(mb.south)+(0,-0.18)$) {9 targets × 6 dims · 单元格判据压缩自 figure-book §10（逐格出处见 §1–§9）· 时点列与 F11 时间线互证};
\end{tikzpicture}
