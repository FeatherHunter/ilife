# 1026 逆向折叠阶梯研究

- 票：ilife #1026（父图 #1012 之首，阻塞 #1027 → #1028；为票 2 颜色统一提供唯一输入）。
- 结论一句话：MAP 顶栏复用了与 ISSUE 同一台折叠机（同一 hook、同一五标记、同一让位顺序、同一 CSS 口径）；差异仅在槽内容与着色路径（snapshot 槽：MAP 固定 `wayfinder:map` chip vs ISSUE 快照/加载中提示；新会话/主动作：MAP 内联三态色 vs ISSUE `actionColorOf` 同色），已登记交票 2 对账。
- 真值总判：票面全部代码真值住 deck 仓（`FeatherHunter/dsh-mattpocock-skills-deck`），不在 ilife；ilife 本仓对全部标识零命中（阴性证据见 §2）。票面 `lib/client.js` 六行号因产物缺席未复验，转票 2 在 deck 实施分支重跑 `Select-String`。

## 研究问题与决策依赖

- Q（#1026 Question 原文）：「ISSUE 顶栏折叠机（#763）的阶梯判据与执行机到底是什么？MAP 顶栏是否逐项复用了同一台机器、同一顺序、同一 CSS 口径？输出阶梯表 + 五标记清单 + 差异点，为票 2 的统一提供唯一输入。」
- 决策依赖：
  - #1027（新会话同色同功能统一）以前提消费本票输出：颜色函数名（`actionColorOf`/`buildColorOf`）与文案键（`list.newSessionLabel`）的定义地行号由本票交接（见“交接下一票”一节）。
  - #1028（窄档验收墙）消费本票锁定的阶梯表 + 五标记 + 让位顺序做三档量测基线。
  - 父图 #1012 Not yet specified 三项（折叠优先级微调、MAP 三态配色 vs ISSUE `actColor` 对账、deck 实施分支与构建验证命令）分别由本票、票 2、票 2 落定。
- 关键澄清（票面“（#763）”缺仓名前缀）：指 deck 仓 #763《落地：ISSUE详情页顶栏重排与自适应折叠》（closed 2026-09-28），不是 ilife #763《测试隔离改用家目录注入》（无关，见 §2 阴性证据 N4）。后票统一写 `deck#763` / `ilife#763`。

## 方法与真值来源核验

只读，未改任何源码。ilife 侧用 `read`/`grep`/`glob` 实测；deck 侧读 GitHub first-party（issue API + `main` 分支 raw 全文直读）。

### ilife 本仓阴性证据（2026-10-02 实测，工作目录 `D:\ilife`）

- N1：`glob lib/client.js` → 零命中（`lib/` 产物在 ilife 不存在；`glob lib/*` 同样零命中）。
- N2：`grep issueDetailFoldLadderOf` / `grep useIssueDetailFold` / `grep data-detail-`（含 `data-detail-back-text`）/ `grep data-full` → 全部零命中。
- N3：`grep MapDetail|IssueDetail|issueFold|DetailFold` → 零命中；`grep newSessionLabel|actionColorOf|buildColorOf` → 零命中；扩大 `grep ColorOf|newSession` → 零命中；`grep LadderOf|StateAt|DetailTop|DetailFold|FoldLadder` → 仅 3 处误伤（`packages/base-render/src/components/reminder-setter/render.ts:172,181,193` 的 `itemStateAttrs` 子串），无真命中。
- N4：ilife #763 真身是测试隔离（`D:\ilife\docs\agents\t763-家目录注入-证据.md:1`「# 测试隔离改用家目录注入 —— 证据（票 #763）」；`:8`「`ILIFE_CONFIG_DIR` 这条测试隔离通道换成**家目录注入**」），与顶栏折叠无关。
- N5：ilife 的 `wayfinder:map` 是 GitHub 标签不是 UI 路由（`D:\ilife\docs\agents\issue-tracker.md:40`「a single issue labelled `wayfinder:map`」）；`packages/plugin-manager/src/client.ts:1-18` 是 dsh-life-pack 面板适配器，无顶栏折叠代码。
- N6：闭环 `grep dsws-stickybar|openInNewSession|dsws-btn` → 全仓仅本研究文件自身 3 行命中，ilife 无任何 deck 源码/产物副本。
- N7：票面验收命令 `Select-String -Path lib/client.js …` 在本席未执行——N1 已证路径不存在，执行必为路径错误；且本席无原生终端通道（工作区纪律要求终端命令走原生终端，不用转调工具跑）。等效验证即 N1–N3。

### 票面真值行号核验（`lib/client.js:16554 / 16619 / 16934 / 16026 / 16036 / 16028`）

- 状态：**未能复验**。ilife 无此文件（N1）；deck 仓 `lib/` 产物未拉取（构建生成物，行号随构建漂移，不宜当真值）。
- 处理：以 SHA 钉住的 deck 源文件（S1–S4，下文）为已验证真值；票面行号视为“开票时读数”（与 #1012 Notes 登记的「MAP 顶栏约 16020 行起，ISSUE 阶梯约 16554 行起，ISSUE 顶栏约 16934 行起」同源），转票 2 在 deck 实施分支 `scripts/build.mjs` 构建后重跑 `Select-String` 复验，不作为本研究断言。
- 顺带：#1012 Notes 另记「ISSUE 阶梯 16563-16568；新会话同色 16040/16947」同样待票 2 产物复验。

## 阶梯表

判据机 S1（deck `src/client/views/issueDetailFold.js@main`，raw 全文已直读；头注释逐字确认“返回列表四个字优先折叠”“一次只折一个控件”“图标永不在阶梯里”）：

`issueDetailFoldLadderOf({back, crumb, snapshot, primary, newSession})` 排法（`push` 顺序即让位顺序）：

| 位 | 槽 | 五串字含义 | 步数 |
|---|---|---|---|
| ① | back | 返回按钮上的字（`返回列表 → 返回 → 空`，只剩图标） | `back.length` |
| ② | crumb | 面包屑编号串（尾部逐字减） | `crumb.length` |
| ③ | snapshot | 快照提示（ISSUE 侧 `快照`/加载中/空；MAP 侧固定 `wayfinder:map`） | `snapshot.length` |
| ④ | primary | 主动作按钮上的字（修复/诊断/讨论/执行等，收到只剩图标） | `primary.length` |
| ⑤ | newSession | 新会话按钮上的字（收到只剩图标） | `newSession.length` |

`issueDetailFoldStateAt(ladder, tier)` 语义：`tier` = 已走步数（钳位 `0..steps.length`）；前 `n` 步按 `steps` 顺序累计各槽掉字数，其余槽 `slice(0, len-drop)` 直接裁掉。**相邻两档只差一个字，不补省略号**（函数注释原话）。复制/外链纯图标按钮无字可折，不进阶梯。

- 让位顺序核验：`back→crumb→snapshot/wayfinder:map→primary→newSession` **成立**（S1 `push` 五行顺序与头注释“让位顺序”段一致）。
- 五串字长度：运行期由各柄 `data-full` 长度决定（S2 取 `data-full` 组装 `ladder`），非定值；阶梯总档数 = 五串字长度之和。
- 省略号/`text-overflow:ellipsis`/媒体查询整块隐藏：S1/S2/S3/S4 四份直读全文均无 `text-overflow`、`ellipsis`、`line-clamp`、`@media` 字样。唯一例外是内容级字符：ISSUE 面包屑栈深>2 级时前缀 `'… / '`（S4 `navCrumb`），属 C 方案内容，非 CSS 截断。
- 演进备注：deck #763 落地验收写的是“面包屑先变短，再轮到返回列表的字”（deck#763 验收第 2 项原文），现行 S1 为 back 优先；S1 头注释已登记原因——维护者 #763 第三轮要求“返回列表四个字优先折叠”。后票引用顺序以 S1 代码为准。

执行机 S2（deck `src/client/views/useIssueDetailFold.js@main`，raw 全文已直读）：取柄（`bar.querySelector` 五标记，缺失过滤，零柄直接返回）→ 复位（每轮先把各柄 `textContent` 恢复为其 `data-full`）→ 判据（`fits() = bar.scrollWidth <= bar.clientWidth + 1`，首轮 fits 即返）→ 爬梯（`t = 1..steps.length` 逐档 `issueDetailFoldStateAt` 写回五柄，每档后 `void bar.offsetWidth` 强制回流再量，首个 fits 档即停）→ 兜底（ladder 不可用时按 `[back, crumb, snap, prim, new]` 顺序逐柄尾部 `slice(0,-1)`，同 fits 即停）→ 监听（`ResizeObserver(observe 顶栏)` + `window.resize` + `document.fonts.ready.then`，cleanup 断开并移除）。effect 依赖 `[issueNumber, issueEffort, st.cwd, st.snapshot, st.issueDetail, st.issueMode, st.navStack]`。

## 五标记清单

精确选择器以 S2 查询串为准（`[data-detail-back-text]` / `[data-detail-crumb]` / `[data-detail-snapshot]` / `[data-detail-primary-text]` / `[data-detail-new-text]`）。注：票面简写 `data-detail-primary` 实为 `data-detail-primary-text`。

| # | 选择器 | ISSUE 侧 full 来源（S4） | MAP 侧 full 来源（S3） |
|---|---|---|---|
| 1 | `data-detail-back-text` | `tr('list.back')`（正常/loading/err/`!src` 四态顶行均有） | `tr('list.back')`（同） |
| 2 | `data-detail-crumb` | `navCrumb`（栈≥2 级：`#父 / #当`，更早层前缀 `… / `；单级：`#当`） | `navCrumb` prop（调用方传入的地图路径串） |
| 3 | `data-detail-snapshot` | 快照/加载中提示（stale 时 `快照`，loading 时 `tr('list.loading')`，否则空串；`detail` 缺失时该节点不存在） | 固定 `'wayfinder:map'`（chip 内，与地图图标同槽） |
| 4 | `data-detail-primary-text` | `primaryInfo.label`（`rowActionKind` 判 kind → `act.*` 文案；triage-like 兜底 diagnose） | `tr('act.inspect'/'act.done'/'act.execute')`（按 effStats 三态切换） |
| 5 | `data-detail-new-text` | `tr('list.newSessionLabel')` | `tr('list.newSessionLabel')`（同键） |

- `data-full` 与可见文一致性：两侧渲染均以同一表达式同时写 `data-full` 与子文本（S3/S4 各 `h('span', {…, 'data-full': X}, X)`），同源，逐字核对通过。
- Tip/悬停：ISSUE 侧 crumb/primary/new 包 `Tip(content=full)`，back 用原生 `title`，snapshot 无 Tip；MAP 侧 back 同 `title`，crumb/snapshot/primary/new 均包 `Tip`（S3/S4 直读确认）。
- `Select-String` 验收（票面要求 MAP/ISSUE 两侧各≥5 处标记）：源文件侧实测——S2 查询串 5 处 + S1 函数/注释 2 处 + S3 标记 5 处（back/crumb/snapshot/primary×3分支/new）+ S4 标记 11 处 occurrences（back×4、crumb×4 含 loading/err/`!src` 变体，snapshot/primary/new 各×1），两侧均远超 5 处；`lib/client.js` 产物侧复验留给票 2。

## MAP vs ISSUE 差异点

同（锁定为复用点，后票不许另起）：

- 同一 hook：两侧均为 `useIssueDetailFold(st, number, effort)`（S3 注释「#763 顶栏折叠机（与 IssueDetail.js 同一台…）」+ 调用；S4 `const topBarRef = useIssueDetailFold(st, issueNumber, issueEffort)`）。
- 同顺序：让位顺序两侧同为 back→crumb→snapshot→primary→newSession（S3 头注释「五串字（折叠机按此顺序让位）」与 S4 顶行注释「折叠顺序：返回按钮的字先收…再收面包屑，再收快照提示，再收主动作…最后收新会话」逐字同序）。
- 同 CSS 口径：顶行 `dsws-stickybar` + `display:flex; alignItems:center; flexWrap:nowrap; minWidth:0; overflow:hidden`；每段字 `overflow:hidden + whiteSpace:nowrap + minWidth:0 + flex:none`；图标为字 span 之外的独立 `Ic()` 节点，常驻（S3/S4 直读确认）。
- 同文案键：新会话两侧均为 `tr('list.newSessionLabel')` 且 `data-full` 与可见文同源（S3/S4）。

异（按票面遗留出口登记去处，不在本票改）：

- D1（交票 2）：新会话着色路径不同。ISSUE：`background: actColor`，其中 `actColor = actionColorOf(fakeIssue, buildColorOf(st))`（S4）。MAP：内联三态 `newBg = 空→#f59e0b / 完成→#3fb950 / 执行→null（走默认 primary）`，`newColor` 配对深色字（S3）。“执行态默认 primary”是否逐像素一致、“空/完成态”与 `actionColorOf` 是否同值，需票 2 实测对账（父图 #1012 亦有同问）。
- D2（交票 2）：主动作着色路径不同。ISSUE 走 `actColor`（同上）；MAP 三态内联 `background:#f59e0b / #3fb950 / 默认`（S3 `primaryBtn` 三分支）。是否与 `actColor` 逐字同值，票 2 对账。
- D3（设计内差异，非缺陷）：snapshot 槽内容不同。MAP 固定 chip `wayfinder:map`；ISSUE 为快照/加载中提示或空（且 `detail` 缺失时无此节点）。槽位同、内容按页语义不同，两侧爬梯均按 `data-full.length` 步进，行为一致。
- D4（设计内差异）：`openInNewSession` 载荷不同。MAP 传 `m`（map 对象）；ISSUE 传 `{number, title, labels}`（S3/S4）。同一函数名，行为一致按票 2 验收（预填指令携带对应票号与标题）复测。
- D5（页面差异）：ISSUE 有 `effortChip`、loading/err/`!src` 变体顶行；MAP 无。此为页面语义差异，不进阶梯。
- D6（渲染排布级差异，本席直读 S3/S4 新发现，非让位顺序差异）：ISSUE 正常态顶行为 back → crumb → effortChip → spacer → snapshot → primary → new → 复制 → 外链（snapshot 在右组、spacer 之后）；MAP 为 back → crumb → snapshot-chip → spacer → primary → new → 复制 → 外链（snapshot 在左组）。让位顺序（阶梯内先后）两侧相同，仅 DOM 左右组归属不同；折叠机按 `data-full` 逐字爬梯，不受 DOM 左右组影响，行为一致。

## 交接下一票（颜色函数与文案键行号）

- `actionColorOf`：S4 内以全局函数形式调用（`typeof actionColorOf === 'function' ? actionColorOf(fakeIssue, colorOf) : stateColor`），**定义地不在 S1–S4 四文件内**；ilife 本仓亦零命中（N3）。票 2 在 deck 实施分支上以 `Select-String -Pattern "actionColorOf"` 全仓定位唯一定义地后登记行号。
- `buildColorOf`：同上，S4 以 `buildColorOf(st)` 调用（`const colorOf = … buildColorOf(st) : {}`），定义地待票 2 全仓定位；ilife 本仓零命中。
- `list.newSessionLabel`：两侧调用点均为 `tr('list.newSessionLabel')`（S3 MAP 新会话 span；S4 ISSUE 新会话 span）；文案唯一定义地在 deck locale 表内，票 2 以 locale 源文件行号登记。
- `openInNewSession`：两侧同一函数名（S3 `openInNewSession(st, m)`；S4 `openInNewSession(st, {number, title, labels})`）；定义地同上待票 2 全仓定位。

## 可信来源列表

1. deck S1 `src/client/views/issueDetailFold.js@main`（raw 全文直读：阶梯注释 + `issueDetailFoldLadderOf` + `issueDetailFoldStateAt`）。
2. deck S2 `src/client/views/useIssueDetailFold.js@main`（raw 全文直读：五标记查询 + `scrollWidth<=clientWidth+1` + 爬梯 + 兜底 + 三监听 + 依赖数组）。
3. deck S3 `src/client/views/MapDetailTop.js@main`（raw 全文直读：#807 拆分注 + 同口径声明 + 五串字顺序 + 同一台注释 + 三态色 + 五标记 + `openInNewSession(st, m)`）。
4. deck S4 `src/client/views/IssueDetail.js@main`（raw 全文直读：同一 hook 调用 + 三态/占位变体顶行 + `navCrumb` C 方案 + `actColor` + `openInNewSession(st, {number,title,labels})`)。
5. deck #763 API（first-party：标题/closed/验收三项原文/真实状态；验收第 2 项为早期 crumb 优先顺序，已被 S1 现行 back 优先取代）。
6. ilife #1012 API（first-party：父图，`wayfinder:map`，open；Notes 登记代码真值住 deck 仓与行号读数；链 1026→1027→1028；`sub_issues_summary.total=3`）。
7. ilife #1026 API（first-party：本票， Labels `wayfinder:task`+`wayfinder:research`，创建 2026-10-02T07:12:35Z，父票 #1012，blocking 1 即 #1027；验收命令与真值来源行号原文）。
8. ilife 本仓阴性读数（N1–N7）：`lib/client.js` 缺失、全部标识零命中、ilife#763 真身、面板 `client.ts` 无关。

## 未决事项

1. `lib/client.js` 产物行号（16554/16619/16934/16026/16036/16028，及 #1012 另记 16563-16568/16040/16947）未复验——以源文件为准，产物复验交票 2（deck 实施分支 + `scripts/build.mjs` 后重读）。
2. D1/D2 色值对账（`#f59e0b` / `#3fb950` / 默认 primary vs `actionColorOf`）——票 2 真机三态截图 + 逐像素比对。
3. `actionColorOf` / `buildColorOf` / `openInNewSession` / locale `list.newSessionLabel` 四处定义地行号——票 2 在 deck 全仓定位后登记。
4. ISSUE 宽/窄截图补证——按票面遗留出口，记入 #1026 评论并通知图主补图，不阻塞票 2 颜色统一先行。
5. D6（snapshot 左右组归属差异）是否需要在票 2 统一 DOM 顺序——本席判定为排布级差异、行为一致，建议票 2 施工时顺手确认，不单独立项。
