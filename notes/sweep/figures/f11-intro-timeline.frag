% F11 隐藏上传管线引入时间线全图（ZCode + 8 家 sweep 确认目标）
% 语义台账：
%   泳道 = 目标产品（9 条，ZCode 置顶作基线，其余按首现日排序）
%   点型语义：○空心=末次阴性探针(absent)；●橙=隐藏管线首现(present)；
%            ●珊瑚=默认开/门控放宽(default-on)；●蓝=门控收紧/机制变更；
%            ■金=死代码 proto(schema-only)；■青=功能移除/实现消失(removed)；
%            ◀灰=最老可得构建即阳性(左截断，存在早于可考历史)
%   段语义：粗色段=该区间门槛状态（橙=服务端门控存活；珊瑚=本地默认开；
%          青=移除后）；灰细虚线=无覆盖数据期（早于末次阴性）
%   几何台账：tx(t) 分段线性——2025 年压缩 (t-2025)*2.9；2026 起放大 ×13.0/年，
%   分界 2026-01-01 竖虚线；泳道间距 2.2cm，带半高 0.95cm；标签漂移限 ±0.75 带内。
\begin{tikzpicture}[x=1cm,y=1cm,
  declare function={tx(\t)=(\t<2026)?(\t-2025)*2.9:2.9+(\t-2026)*13.0;},
  odot/.style={circle, draw=vgray!85, fill=white, minimum size=0.15cm, inner sep=0pt, outer sep=0pt, line width=0.8pt},
  trunc/.style={font=\scriptsize, text=vgray},
  segA/.style={line width=1.5pt, draw=vorange},
  segD/.style={line width=1.5pt, draw=vcoral},
  segX/.style={line width=1.5pt, draw=vteal},
  segU/.style={line width=0.5pt, draw=vgray!55, dash pattern=on 2.5pt off 2pt},
  base/.style={line width=0.4pt, draw=vgray!40}]

  % ---------- 顶部主张 ----------
  \node[font=\large, anchor=west, vaudit={class=txt}] (title) at (-3.1,2.6) {隐藏上传管线的引入时点 —— ZCode 基线 + 8 家 sweep 确认目标};
  \node[font=\small, anchor=west, text=black!65] at (-3.08,2.02) {点型=事件性质，段色=门槛状态；9 家无一家在引入时携带 consent 面};

  % ---------- 泳道底带 ----------
  \begin{pgfonlayer}{bg}
    \foreach \i/\c in {0/vteal,1/vgray,2/vgray,3/vgray,4/vgray,5/vgray,6/vgray,7/vgray,8/vgray}
      \fill[band=\c] (-0.3,{-2.2*\i-0.95}) rectangle (13.75,{-2.2*\i+0.95});
  \end{pgfonlayer}
  \vzbbox{lane0}{(-0.3,-0.95)}{(13.75,0.95)}
  \vzbbox{lane1}{(-0.3,-3.15)}{(13.75,-1.25)}
  \vzbbox{lane2}{(-0.3,-5.35)}{(13.75,-3.45)}
  \vzbbox{lane3}{(-0.3,-7.55)}{(13.75,-5.65)}
  \vzbbox{lane4}{(-0.3,-9.75)}{(13.75,-7.85)}
  \vzbbox{lane5}{(-0.3,-11.95)}{(13.75,-10.05)}
  \vzbbox{lane6}{(-0.3,-14.15)}{(13.75,-12.25)}
  \vzbbox{lane7}{(-0.3,-16.35)}{(13.75,-14.45)}
  \vzbbox{lane8}{(-0.3,-18.55)}{(13.75,-16.65)}

  % ---------- 时间轴 ----------
  \draw[black!55, line width=0.6pt] (-0.3,1.3) -- (13.75,1.3);
  \foreach \t/\lab in {2025.04/2025-01, 2025.29/04, 2025.54/07, 2025.79/10,
                       2026.0/{2026-01}, 2026.17/03, 2026.37/05, 2026.54/07, 2026.71/09}
    \draw[black!45, line width=0.5pt] ({tx(\t)},1.22) -- ({tx(\t)},1.38)
      node[above, font=\scriptsize, text=black!65] {\lab};
  \foreach \t in {2025.17,2025.42,2025.67,2025.92,2026.08,2026.25,2026.29,2026.33,2026.46,2026.62,2026.79}
    \draw[black!30, line width=0.4pt] ({tx(\t)},1.25) -- ({tx(\t)},1.35);
  % 分界：2026 放大区
  \draw[black!40, dash pattern=on 3pt off 2.4pt, line width=0.5pt] ({tx(2026)},1.5) -- ({tx(2026)},-17.7); % fv:noaudit
  \node[font=\tiny, text=black!55, anchor=east] at ({tx(2026)-0.1},1.06) {2026 起 ×4.5 放大};
  % 季网格
  \foreach \t in {2025.29,2025.54,2025.79,2026.17,2026.37,2026.54,2026.71}
    \draw[gray!14, line width=0.4pt] ({tx(\t)},1.15) -- ({tx(\t)},-17.7); % fv:noaudit

  % ---------- 泳道标签 ----------
  \node[gtag, vaudit={adjacent=lane0}] at (-0.42,0) {ZCode\\{\tiny 基线（开源前）}};
  \node[gtag, vaudit={adjacent=lane1}] at (-0.42,-2.2) {Trae intl\\{\tiny 字节}};
  \node[gtag, vaudit={adjacent=lane2}] at (-0.42,-4.4) {Cursor\\{\tiny Anysphere}};
  \node[gtag, vaudit={adjacent=lane3}] at (-0.42,-6.6) {CodeBuddy IDE\\{\tiny 腾讯}};
  \node[gtag, vaudit={adjacent=lane4}] at (-0.42,-8.8) {CodeBuddy CLI\\{\tiny 腾讯}};
  \node[gtag, vaudit={adjacent=lane5}] at (-0.42,-11.0) {Qoder\\{\tiny 阿里}};
  \node[gtag, vaudit={adjacent=lane6}] at (-0.42,-13.2) {Kiro\\{\tiny AWS}};
  \node[gtag, vaudit={adjacent=lane7}] at (-0.42,-15.4) {Copilot Chat\\{\tiny 微软}};
  \node[gtag, vaudit={adjacent=lane8}] at (-0.42,-17.6) {MiniMax\\{\tiny Desktop}};

  % ================= Lane 0: ZCode =================
  \draw[base] (-0.25,0) -- (13.7,0); % fv:noaudit
  \draw[segU] (-0.25,0) -- ({tx(2026.367)},0); % fv:noaudit
  \draw[segA] ({tx(2026.373)},0) -- ({tx(2026.384)},0); % fv:noaudit
  \draw[segD] ({tx(2026.384)},0) -- ({tx(2026.715)},0); % fv:noaudit
  \node[odot, vaudit={class=evto,inside=lane0,overlap=z1}] (z0) at ({tx(2026.367)},0) {};
  \node[mdot=vorange, vaudit={class=evtp,inside=lane0}] (z1) at ({tx(2026.373)},0) {};
  \node[mdot=vcoral, vaudit={class=evtd,inside=lane0}] (z2) at ({tx(2026.384)},0) {};
  \node[mdot=vcoral, vaudit={class=evtd,inside=lane0}] (z3) at ({tx(2026.455)},0) {};
  \node[msq=vteal, vaudit={class=evtx,inside=lane0}] (z4) at ({tx(2026.715)},0) {};
  \node[lab, vaudit={inside=lane0}] (z0l) at (5.9,-0.58) {v2.2.0 无管线\\{\tiny 2026-05-14，linux 首发版}};
  \node[lab, vaudit={inside=lane0}] (z1l) at (7.15,0.58) {v2.3.0 引入\\{\tiny 05-16 opt-in}};
  \node[lab, vaudit={inside=lane0}] (z2l) at (8.55,-0.58) {v2.6.0 默认翻转\\{\tiny UI=OFF 实跑}};
  \node[lab, vaudit={inside=lane0}] (z3l) at (9.9,0.58) {v3.1.0 .git 整树\\{\tiny 开关装饰化}};
  \node[lab, vaudit={inside=lane0}] (z4l) at (12.4,-0.58) {v3.14.0 移除\\{\tiny 09-19 唯一回撤}};
  \draw[lead] (z0) -- (z0l.east);  \vzwire{wz0}{z0;z0l.east}{endpoint=z0,z0l via=lane0}
  \draw[lead] (z1) -- (z1l.south); \vzwire{wz1}{z1;z1l.south}{endpoint=z1,z1l via=lane0}
  \draw[lead] (z2) -- (z2l.north); \vzwire{wz2}{z2;z2l.north}{endpoint=z2,z2l via=lane0}
  \draw[lead] (z3) -- (z3l.south); \vzwire{wz3}{z3;z3l.south}{endpoint=z3,z3l via=lane0}
  \draw[lead] (z4) -- (z4l.north); \vzwire{wz4}{z4;z4l.north}{endpoint=z4,z4l via=lane0}

  % ================= Lane 1: Trae =================
  \draw[base] (-0.25,-2.2) -- (13.7,-2.2); % fv:noaudit
  \draw[segD] ({tx(2025.055)},-2.2) -- (13.7,-2.2); % fv:noaudit
  \node[trunc] (t0) at (-0.12,-2.2) {$\blacktriangleleft$};
  \node[mdot=vcoral, vaudit={class=evtd,inside=lane1}] (t1) at ({tx(2025.055)},-2.2) {};
  \node[mdot=vcoral, vaudit={class=evtd,inside=lane1}] (t2) at ({tx(2025.389)},-2.2) {};
  \node[mdot=vcoral, vaudit={class=evtd,inside=lane1}] (t3) at ({tx(2026.627)},-2.2) {};
  \node[lab, vaudit={inside=lane1}] (t1l) at (1.35,-1.62) {$\leq$1.0.5431 首发即带\\{\tiny 2025-01-20 端点硬编码}};
  \node[lab, vaudit={inside=lane1}] (t2l) at (1.6,-2.78) {1.0.12894 去登录门\\{\tiny 2025-05-21 无认证轮询}};
  \node[lab, vaudit={inside=lane1}] (t3l) at (11.4,-1.62) {2.3.73738 竞品收集\\{\tiny 2026-08-18 +ToB 伪装反馈单}};
  \draw[lead] (t1) -- (t1l.south); \vzwire{wt1}{t1;t1l.south}{endpoint=t1,t1l via=lane1}
  \draw[lead] (t2) -- (t2l.north); \vzwire{wt2}{t2;t2l.north}{endpoint=t2,t2l via=lane1}
  \draw[lead] (t3) -- (t3l.south); \vzwire{wt3}{t3;t3l.south}{endpoint=t3,t3l via=lane1}

  % ================= Lane 2: Cursor =================
  \draw[base] (-0.25,-4.4) -- (13.7,-4.4); % fv:noaudit
  \draw[segU] (-0.25,-4.4) -- ({tx(2025.50)},-4.4); % fv:noaudit
  \draw[segA] ({tx(2025.50)},-4.4) -- (13.7,-4.4); % fv:noaudit
  \node[mdot=vorange, vaudit={class=evtp,inside=lane2}] (c1) at ({tx(2025.50)},-4.4) {};
  \node[msq=vgold, vaudit={class=evts,inside=lane2}] (c2) at ({tx(2026.129)},-4.4) {};
  \node[mdot=vorange, vaudit={class=evtp,inside=lane2}] (c3) at ({tx(2026.167)},-4.4) {};
  \node[lab, vaudit={overlap=lane2}] (c1l) at (1.15,-3.82) {1.0.1 调试 zip\\{\tiny 2025-07-02 OOM 自动传 S3}};
  \node[lab, vaudit={inside=lane2}] (c2l) at (4.35,-4.98) {2.5.17 proto\\{\tiny 2026-02-17 零调用者}};
  \node[lab, vaudit={inside=lane2}] (c3l) at (5.55,-3.82) {2.6.11 packfile 接线\\{\tiny 2026-03-03 flag 门控}};
  \draw[lead] (c1) -- (c1l.south); \vzwire{wc1}{c1;c1l.south}{endpoint=c1,c1l via=lane2}
  \draw[lead] (c2) -- (c2l.north); \vzwire{wc2}{c2;c2l.north}{endpoint=c2,c2l via=lane2}
  \draw[lead] (c3) -- (c3l.south); \vzwire{wc3}{c3;c3l.south}{endpoint=c3,c3l via=lane2}

  % ================= Lane 3: CodeBuddy IDE =================
  \draw[base] (-0.25,-6.6) -- (13.7,-6.6); % fv:noaudit
  \draw[segA] ({tx(2025.556)},-6.6) -- ({tx(2026.732)},-6.6); % fv:noaudit
  \node[trunc] (b0) at (-0.12,-6.6) {$\blacktriangleleft$};
  \node[mdot=vorange, vaudit={class=evtp,inside=lane3}] (b1) at ({tx(2025.556)},-6.6) {};
  \node[mdot=vorange, vaudit={class=evtp,inside=lane3}] (b2) at ({tx(2026.068)},-6.6) {};
  \node[msq=vteal, vaudit={class=evtx,inside=lane3}] (b3) at ({tx(2026.732)},-6.6) {};
  \node[lab, vaudit={inside=lane3}] (b1l) at (1.15,-6.02) {$\leq$0.1.8 codebase 通道\\{\tiny 2025-07-22 最老可得即阳性}};
  \node[lab, vaudit={inside=lane3}] (b2l) at (3.9,-6.02) {4.3.3 文件历史通道\\{\tiny 2026-01-26 四通道齐}};
  \node[lab, vaudit={inside=lane3}] (b3l) at (12.1,-6.02) {5.6.2 实现消失\\{\tiny 2026-09-25 仅剩 flag}};
  \draw[lead] (b1) -- (b1l.south); \vzwire{wb1}{b1;b1l.south}{endpoint=b1,b1l via=lane3}
  \draw[lead] (b2) -- (b2l.south); \vzwire{wb2}{b2;b2l.south}{endpoint=b2,b2l via=lane3}
  \draw[lead] (b3) -- (b3l.south); \vzwire{wb3}{b3;b3l.south}{endpoint=b3,b3l via=lane3}

  % ================= Lane 4: CodeBuddy CLI =================
  \draw[base] (-0.25,-8.8) -- (13.7,-8.8); % fv:noaudit
  \draw[segU] (-0.25,-8.8) -- ({tx(2025.845)},-8.8); % fv:noaudit
  \draw[segA] ({tx(2025.851)},-8.8) -- (13.7,-8.8); % fv:noaudit
  \node[odot, vaudit={class=evto,inside=lane4}] (bc1) at ({tx(2025.845)},-8.8) {};
  \node[mdot=vorange, vaudit={class=evtp,inside=lane4,inside=bc1}] (bc2) at ({tx(2025.851)},-8.8) {};
  \node[mdot=vblue, vaudit={class=evtb,inside=lane4}] (bc3) at ({tx(2026.386)},-8.8) {};
  \node[lab, vaudit={inside=lane4}] (bc1l) at (1.55,-8.22) {2025-11-07 同日两构建\\{\tiny 04:06Z 无 → 10:06Z 有（6h 窗口）}};
  \node[lab, vaudit={inside=lane4}] (bc3l) at (8.15,-9.38) {2.97.4 门控收紧\\{\tiny 2026-05-21 +enabled/白名单/HMAC}};
  \draw[lead] (bc1) -- (bc1l.south); \vzwire{wbc1}{bc1;bc1l.south}{endpoint=bc1,bc1l via=lane4}
  \draw[lead] (bc3) -- (bc3l.north); \vzwire{wbc3}{bc3;bc3l.north}{endpoint=bc3,bc3l via=lane4}

  % ================= Lane 5: Qoder =================
  \draw[base] (-0.25,-11.0) -- (13.7,-11.0); % fv:noaudit
  \draw[segU] (-0.25,-11.0) -- ({tx(2026.049)},-11.0); % fv:noaudit
  \draw[segA] ({tx(2026.049)},-11.0) -- (13.7,-11.0); % fv:noaudit
  \node[odot, vaudit={class=evto,inside=lane5}] (q0) at ({tx(2025.641)},-11.0) {};
  \node[mdot=vorange, vaudit={class=evtp,inside=lane5}] (q1) at ({tx(2026.049)},-11.0) {};
  \node[mdot=vblue, vaudit={class=evtb,inside=lane5}] (q2) at ({tx(2026.71)},-11.0) {};
  \node[lab, vaudit={inside=lane5}] (q0l) at (2.35,-10.42) {2025-08-22 首发构建\\{\tiny 上传基建已在，缺漏机制无}};
  \node[lab, vaudit={inside=lane5}] (q1l) at (3.6,-11.58) {0.3.0 缺漏文件机制\\{\tiny 2026-01-19 边界 0.2.29→0.3.0}};
  \node[lab, vaudit={inside=lane5}] (q2l) at (11.9,-10.42) {1.31.0 EMU 编排器\\{\tiny 2026-09-17 缺漏上传聚合}};
  \draw[lead] (q0) -- (q0l.south); \vzwire{wq0}{q0;q0l.south}{endpoint=q0,q0l via=lane5}
  \draw[lead] (q1) -- (q1l.north); \vzwire{wq1}{q1;q1l.north}{endpoint=q1,q1l via=lane5}
  \draw[lead] (q2) -- (q2l.south); \vzwire{wq2}{q2;q2l.south}{endpoint=q2,q2l via=lane5}

  % ================= Lane 6: Kiro =================
  \draw[base] (-0.25,-13.2) -- (13.7,-13.2); % fv:noaudit
  \draw[segU] (-0.25,-13.2) -- ({tx(2026.306)},-13.2); % fv:noaudit
  \draw[segA] ({tx(2026.345)},-13.2) -- ({tx(2026.52)},-13.2); % fv:noaudit
  \draw[segD] ({tx(2026.52)},-13.2) -- (13.7,-13.2); % fv:noaudit
  \node[odot, vaudit={class=evto,inside=lane6}] (k0) at ({tx(2026.306)},-13.2) {};
  \node[mdot=vorange, vaudit={class=evtp,inside=lane6}] (k1) at ({tx(2026.345)},-13.2) {};
  \node[mdot=vcoral, vaudit={class=evtd,inside=lane6}] (k2) at ({tx(2026.52)},-13.2) {};
  \node[lab, vaudit={inside=lane6}] (k0l) at (6.15,-12.62) {0.11.133 无\\{\tiny 2026-04-22 末次阴性}};
  \node[lab, vaudit={inside=lane6}] (k1l) at (7.75,-13.78) {0.12.155 发布器首现\\{\tiny 05-06 sandbox-only 门}};
  \node[lab, vaudit={inside=lane6}] (k2l) at (10.1,-12.62) {1.0.116 默认开\\{\tiny 07-09 白名单区域自动派生}};
  \draw[lead] (k0) -- (k0l.south); \vzwire{wk0}{k0;k0l.south}{endpoint=k0,k0l via=lane6}
  \draw[lead] (k1) -- (k1l.north); \vzwire{wk1}{k1;k1l.north}{endpoint=k1,k1l via=lane6}
  \draw[lead] (k2) -- (k2l.south); \vzwire{wk2}{k2;k2l.south}{endpoint=k2,k2l via=lane6}

  % ================= Lane 7: Copilot =================
  \draw[base] (-0.25,-15.4) -- (13.7,-15.4); % fv:noaudit
  \draw[segU] (-0.25,-15.4) -- ({tx(2026.309)},-15.4); % fv:noaudit
  \draw[segA] ({tx(2026.370)},-15.4) -- (13.7,-15.4); % fv:noaudit
  \node[odot, vaudit={class=evto,inside=lane7}] (p0) at ({tx(2026.309)},-15.4) {};
  \node[mdot=vorange, vaudit={class=evtp,inside=lane7}] (p1) at ({tx(2026.370)},-15.4) {};
  \node[lab, vaudit={inside=lane7}] (p0l) at (6.1,-14.82) {$\leq$0.45.1 无\\{\tiny 2026-04-23}};
  \node[lab, vaudit={inside=lane7}] (p1l) at (8.1,-15.98) {0.48.1 落地完全体\\{\tiny 05-15 onExp 服务端可热翻}};
  \draw[lead] (p0) -- (p0l.south); \vzwire{wp0}{p0;p0l.south}{endpoint=p0,p0l via=lane7}
  \draw[lead] (p1) -- (p1l.north); \vzwire{wp1}{p1;p1l.north}{endpoint=p1,p1l via=lane7}

  % ================= Lane 8: MiniMax =================
  \draw[base] (-0.25,-17.6) -- (13.7,-17.6); % fv:noaudit
  \draw[segU] (-0.25,-17.6) -- ({tx(2026.575)},-17.6); % fv:noaudit
  \draw[segD] ({tx(2026.589)},-17.6) -- (13.7,-17.6); % fv:noaudit
  \node[odot, vaudit={class=evto,inside=lane8}] (m0) at ({tx(2026.575)},-17.6) {};
  \node[mdot=vcoral, vaudit={class=evtd,inside=lane8}] (m1) at ({tx(2026.589)},-17.6) {};
  \node[lab, vaudit={inside=lane8}] (m0l) at (9.55,-17.02) {3.0.57 无\\{\tiny 末次阴性}};
  \node[lab, vaudit={inside=lane8}] (m1l) at (11.5,-18.18) {3.0.58 引入即开\\{\tiny 2026-08-04 enabled:true 硬编码}};
  \draw[lead] (m0) -- (m0l.south); \vzwire{wm0}{m0;m0l.south}{endpoint=m0,m0l via=lane8}
  \draw[lead] (m1) -- (m1l.north); \vzwire{wm1}{m1;m1l.north}{endpoint=m1,m1l via=lane8}

  % ---------- 底部含义框 ----------
  \node[mean, text width=15.6cm, anchor=north west] at (-3.1,-18.9) {%
    \textbf{读法}：空心点=末次阴性探针；橙点=隐藏管线首现；珊瑚点=默认开/门控放宽；蓝点=门控收紧；金方块=死代码 proto；青方块=移除/实现消失；$\blacktriangleleft$=最老可得构建即阳性（左截断）。粗色段=当前门槛状态，灰虚线=无数据期。};

  % ---------- 标识行 ----------
  \node[font=\scriptsize, text=vgray, anchor=south] at (6.7,-20.75) {9 lanes × version-archaeology probes：版本二分定位首现；Trae/CodeBuddy IDE codebase/Qoder 基建为左截断（早于可得历史）};
\end{tikzpicture}
