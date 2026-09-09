# #89《视觉锁 B1 逐值验收》· 验收证据形态设计（89b 取证方案 ＋ 链路实跑）

- 票：`#89`（89b 收尾验收，0%）· 图 `#63`《卡路里·本体图（1/3）》· 姊妹票 `#105`（89a 规格冻结）
- 本文件：`docs/research/t89-evidence-plan.md`（**新建，本票产物之一**）
- 探针（均受跟踪，均打 `RESULT: n/m`）：
  - `docs/research/t89-probe-browser.mjs`（取证链路**能力**自证）
  - `docs/research/t89-probe-help-static.mjs`（A 级静态面采集）
  - `docs/research/t89-probe-help-interactive.mjs`（B 级 H-12／H-16／H-19／H-20 交互／时序采集）
- **本席不产出验收结论**：下文所有「当前态实测」都是**可复跑的抽样**，勾选／判定权归 #89b 实施席。

---

## 0. 结论摘要（先读这一节）

1. **B1 20 条的证据形态已逐条定死**（§1）：**14 条**静态／截图可判（H-01…H-11、H-15、H-17、H-18），**4 条**必须交互／时序（H-12／H-16／H-19／H-20，与票面点名一致），**2 条**在 HELP 页 N/A（H-13／H-14，转内容页区块尺 B-02／B-04）。
2. **取证链路本机可用**（§3.1 实跑）：Chrome **152.0.7977.83**，CDP 直连（无 puppeteer／playwright 依赖），`file://` 截图、真手势、真剪贴板回读、时序采样**全部跑通**。
3. **两轮红是探针自身 bug，不是环境问题**（§3.2 逐条根因）：`t89-probe-browser` 的 4 条红＝`evalJson` 把 Promise 序列化成 `{}`＋`--version` 在 Windows 上不可解析＋负样本开关失效；`t89-probe-help-interactive` 的 2 条红＝**模板字符串里单个 `\s` 被吞**（页面收到 `/s+/`）＋观测器未保留强引用。**修完均为绿**：`10/10`、`21/21`、`24/27`（3 条红是真实当前态缺口，见 §5）。
4. **既有真机资产仍可用，且应作为 #89 底座**（§3.3 各跑一次）：`t121-browser-evidence.mjs` **22/22 exit 0**（runId `c380f722…`）；`t88-browser-evidence-b.mjs` **29/29**（编排者席实测，用 `.scratch` 里的**旧样本**）／**28/29**（本席实测，用**新生成样本**）——差异**唯一**来自 B26 断言假设「真实 payload `editable_fields` = 0」，而 #106 已回补 **341** 条（§3.3 已给出判据与 sha）。
5. **覆盖分工**（§3.5）：**H-16 已被 t121 覆盖、H-19 已被 t88 覆盖**（可作交叉校验，不必重复断言）；**H-12 与 H-20 在两套件里零命中**（本席 grep 复核），**H-01…H-11／H-15／H-17／H-18 的样式规格面两套件都不做** → 必须由 CMD-S／CMD-I 新采。
6. **归档建议**（§4）：**机读证据入仓** `docs/research/t89-evidence/`（一次全量 ≈ 300 KB：视口图 3×70–98 KB ＋ 逐条元素图 ＋ JSON ＋ 日志 ＋ `SHA256SUMS.txt`）；**1.26 MB 的 HTML 产物不入仓**（一条命令可再生，只记 sha256）。
7. **风险 top3**（§5）：**R-3 正文栈无 `"SF Pro Display"`（H-06 规格值未达，且冻结表无字体常量 → 不能靠 R35 豁免）**；**R-2 H-12 的「400px toast left/right:12px」与冻结 `TOAST_DEFAULTS.mobileMaxPx=820` 冲突（须按 R35 改判为「≤820 层」，否则判不了）**；**R-1 判据收窄缺失会假红**（H-04 全量 grep 命中 charts 区渐变、H-10 命中 charts 2px 圆角、H-01 禁色 vs 图表色板）。

---

## 1. B1 20 条 × 验收矩阵

### 1.0 采集命令速查（全部经持锁包装器；`--ticket 89`）

| 代号 | 命令 | 作用 | 本席实跑 |
|---|---|---|---|
| **CMD-A** | `node tooling/run-locked.mjs --ticket 89 -- node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params "{\"mode\":\"file\"}" --output .scratch/t89/help-file.html` | 生成被验产物（file 态） | exit 0，**1,264,822 B**，sha256_16 `F380EF685065A1E9` |
| **CMD-B** | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-browser.mjs` | 链路能力自证（Chrome／CDP／截图／真手势／剪贴板／无浏览器显式失败） | **`RESULT: 10/10 PASS` exit 0**（runId `47adfd85-b9e4-4e04-a905-54273ae85723`） |
| **CMD-S** | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-static.mjs` | A 级静态面逐条采集 | **`RESULT: 24/27 PASS` exit 1**（3 红＝H-06.2／H-10.1／H-17.1，见 §5） |
| **CMD-I** | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-interactive.mjs` | B 级交互／时序采集（H-12／16／19／20） | **`RESULT: 21/21 PASS` exit 0** |
| **CMD-R1** | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t121-browser-evidence.mjs --label t89reuse` | 复用既有真机底座（复制双反馈） | **22/22 PASS** exit 0 |
| **CMD-R2** | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t88-probe-impl-b.mjs` → `… -- node docs/research/t88-browser-evidence-b.mjs` | 复用既有真机底座（436 卡／搜索／回顶／降级） | 59/59 exit 0；**28/29** exit 1（B26 过期，见 §3.3） |

> **PowerShell 引号坑（踩过，务必照抄）**：`--params '{"mode":"file"}'` 会被 PowerShell 吞掉单引号 → 子进程收到 `{mode:file}` → `ERR 2: --params 须为 JSON`。**正确写法**：`--params "{\"mode\":\"file\"}"`（本表 CMD-A 已用），或用 `--%` 停解析。

### 1.1 矩阵（每条一行）

判据分级沿用 `docs/visual-spec-help.md` §0.1：**A＝静态可判**、**B＝交互／时序**、**C＝需落地后判**。

| 条 | 规格逐值（引用条目号） | 判据（怎么算通过） | 证据形态 | 采集命令 | 失败长什么样 |
|---|---|---|---|---|---|
| **H-01** | `visual-spec-help.md` H-01（规格值 `#007aff`；禁 `#0a84ff`／`#af52de`／`#ff375f`／`#0071e3`） | 最终 CSS 中 `--blue: #007aff` 逐字；四个禁色命中 = 0（**禁色只约束 UI 主色**，图表色板例外 D-10／C-9） | DOM／CSS 文本断言 ＋ 截图（页头主色块） | CMD-S（`H-01.1/.2`）＋ CMD-B 视口图 | `forbidden: ["#af52de"]` 非空；或 `--blue` 不是 `#007aff` |
| **H-02** | H-02（三灰＋描边；R35 裁定 **D-2 以冻结 token 为准**） | 冻结 token 表含 `--fg/--fg2/--fg3/--bg/--card/--line/--shadow`；正文 computed `color` ∈ {`--fg`,`--fg2`}，正文块 ≠ `--fg3`（后者需 computed，归 CMD-I 的浏览器面） | CSS 文本断言 ＋ 浏览器 computed 采样 | CMD-S（`H-02.1`）＋ CMD-B（元素图） | token 缺项；或正文 computed `color` == `--fg3`（对比度不足） |
| **H-03** | H-03（页底 ≠ 卡面；D-3 取冻结 `--bg`） | `--bg` ≠ `--card` 且卡面为纯白；渲染页页底／卡面 computed 背景不同 | CSS 断言 ＋ 截图（页底 vs 卡面） | CMD-S（`H-03.1`）＋ CMD-B | `bg === card`（两面不可区分） |
| **H-04** | H-04（零渐变） | **只判 HELP 页自身 CSS 区**：`linear-gradient`／`radial-gradient` 命中 = 0；charts 区的 `repeating-linear-gradient` 属冻结图表资产（D-10／#88 台账 L-17「按 CSS 区判」） | CSS 分区断言（必须打印 `gradHelp` 与 `gradAll` 两值） | CMD-S（`H-04.1`，实测 `{gradHelp:0, gradAll:1}`） | **假红形态**：全量 grep 得 1 → 若直接判红即误伤图表层；**真红形态**：`gradHelp > 0` |
| **H-05** | H-05（阶梯：最大数字 ≥48px／700、`h2` 17px／600、正文 15px、提示 12–13px；相邻差 ≥4px／≥100。**D-9：HELP 页不要求 ≥48px**） | HELP 页字号集合存在 ≥2 档且**无 ≥48px**；`h2` computed 17px／600；正文 15px；提示 12–13px；相邻档差 ≥4px | 浏览器 computed 采样（逐元素）＋ 截图 | CMD-S（`H-05.1/.2`）＋ CMD-I 视口图 | 出现 ≥48px（违反 D-9）或 `h2` 非 17px／600；相邻档差 <4px |
| **H-06** | H-06（正文栈须含 `"SF Pro Display"`；等宽栈逐字 `"SF Mono",monospace`，**不留 `Consolas`** D-13） | CSS 含正文栈且包含 `SF Pro Display`；等宽元素 computed `font-family` 以 `"SF Mono"` 开头；`Consolas` 命中 = 0 | CSS 文本断言 ＋ computed 采样 | CMD-S（`H-06.1` 绿／`H-06.2` **当前红**） | `sfPro: 0`（**当前态**：CSS 只有 `"SF Mono", monospace` 与 `inherit`，正文栈缺失）→ 见 §5 R-3 |
| **H-07** | H-07（所有数字 `tnum`） | CSS 中 `font-feature-settings` 含 `tnum` 命中 > 0；数值列 computed 含 `tnum`（继承生效） | CSS 断言 ＋ computed 采样 | CMD-S（`H-07.1`，实测 2 处） | 命中 0；或数值元素 computed 无 `tnum` |
| **H-08** | H-08（`h1`／`h2` emoji = 0；D-12 去 emoji） | 对每个 `h1`／`h2` 的 `textContent` 跑 emoji 正则 → 0 命中 | 静态 DOM 断言 ＋ 截图 | CMD-S（`H-08.1`，实测 4 个标题 0 命中，`h1`＝「唤醒词速查台」） | 任一标题文本命中 emoji 码点 |
| **H-09** | H-09（`max-width:960px`；`padding:32px 20px 80px`） | CSS 逐字含两条；1440px 视口下内容列居中、两侧留白可见 | CSS 断言 ＋ 视口截图（1440） | CMD-S（`H-09.1`）＋ CMD-I（`h12-1440.png`） | 内距不是 `32px 20px 80px`（旧版 `0 12px 40px` 即此形态） |
| **H-10** | H-10（圆角 ∈ `{8px,14px,20px,999px,50%}`；阴影只取冻结单条 D-4／D-5） | **排除 charts 区**后圆角集合 ⊆ 规定集；`box-shadow` 全部 `var(--shadow)` | CSS 分区断言 ＋ 元素截图 | CMD-S（`H-10.1` **当前红**：help-shell 的 `.ilife-help-shell-card-mark` 用 `4px`；`H-10.2` 绿） | `badRadiiHelp: ["4px"]`；或出现第二级阴影 |
| **H-11** | H-11（行分隔 1px 极浅描边；**首行无边框**） | CSS 含 `:first-child{border-top:0}` 规则；列表行 computed `border-top-width:1px`、颜色为软描边 | CSS 断言 ＋ computed 采样 ＋ 列表截图 | CMD-S（`H-11.1`，实测 2 处） | 无首行例外规则（会与卡片外框叠出双线） |
| **H-12** | H-12（**级别 B**：`@media max-width:640px` → KPI 2 列／数字环单列／容器内距 `20px 16px 60px`；`@media max-width:400px` → KPI 1 列／toast `left:12px;right:12px`；D-6 三层并存） | ① 静态：恰有 640／400 两条页面断点（720 图表、820 toast 栈并存）；② 行为：**三档视口采样**——1440 内距 `32px 20px 80px`／960 居中；640 内距 `20px 16px 60px` 且网格 1 列；400 时 toast 栈 `left/right = 12px`。**KPI／环条款在 HELP 页 N/A**（H-13／H-14），转内容页 | **交互记录＋视口采样**：`Emulation.setDeviceMetricsOverride` 切档，每档稳定 300ms 后采 computed；每档 1 张截图 | CMD-I（`H-12.1…12.4`；产物 `h12-1440.png`／`h12-640.png`／`h12-400.png` ＋ `probe-interactive.json`） | 采样频率 1 次/档（窗口＝切档后 300ms 稳定期）；**失败**：`padding` 不等于 `16px/16px/60px`；或 toast `left/right ≠ 12px`；或出现第三条页面断点 |
| **H-13** | H-13（KPI 卡四槽；**D-15：HELP 页 N/A**） | HELP 页判 **N/A**（实测 `.kpi` 命中 0）→ 判据转 `visual-spec-blocks.md` **B-02** | N/A 记账 ＋ 内容页证据 | CMD-S（`[N/A ] H-13`）＋ §2 的 B-02 命令 | 把 N/A 当红／当绿都错；必须写「转 B-02」 |
| **H-14** | H-14（进度环几何；**D-15：HELP 页 N/A**） | HELP 页判 **N/A**（实测 `<svg>`＝0）→ 转 **B-04** | N/A 记账 ＋ 内容页证据 | CMD-S（`[N/A ] H-14`）＋ §2 的 B-04 命令 | 同上 |
| **H-15** | H-15（`<pre>` 板；等宽 11.5–12px、`line-height:1.55`、`pre-wrap`、`overflow-x:auto`、圆角 8px） | 命令块 `tagName === PRE`（实测 439 个）；computed `font-family` 等宽、`font-size ∈ [11.5,12]`、`line-height:1.55`、`overflow-x:auto`、`border-radius:8px` | 静态 DOM ＋ computed 采样 ＋ 元素截图 | CMD-S（`H-15.1/.2`）＋ CMD-I | 命令出现在正文内联（非 `<pre>`）；或圆角 4px／缺 `overflow-x`（旧版形态） |
| **H-16** | H-16（**级别 B**：每行恰 1 个行内复制按钮；成功**双反馈**＝按钮 `copied` ＋ 450ms 弹簧，**同时**底部 toast；**D-7 toast 取冻结 4500ms**；**D-8 不保留「复制全部」**） | ① 静态：每个按钮同时带 `data-action-id` 与 `data-t`（实测 1308／1308）；② **真手势**点击卡级按钮 → `copied` 类出现并**在 440–520ms 内回落**（页面侧 1ms 轮询 ＋ `MutationObserver` 双计时器，**不用驱动侧 ~31ms 采样**，#121 口径）；③ 剪贴板回读**归一 CRLF 后**逐字等于 `data-t`；④ toast **恰 1 枚**、存活 **4500ms ±20%**（childList 观测 ＋ 25ms 轮询互证）；⑤ 每卡恰 1 按钮（抽 40 卡）、「复制全部」计数 = 0 | **交互记录＋时序采样**：真手势 `Input.dispatchMouseEvent`；采样＝页面侧 1ms 轮询 ＋ `MutationObserver`（按钮）／childList ＋ 25ms 轮询（toast）；窗口＝点击后 6.5 s | CMD-I（`H-16.1…16.9`）＋ CMD-R1（复用 #121 22 断言） | 阈值：`copied ∈ [440,520]ms`、`toast ∈ 4500±900ms`、`onsets == 1`。**失败**：`copiedMs = null`（从未加类）；`clip` 与 `data-t` 差在行尾（**CRLF 未归一＝假红**）；`onsets = 2`（子串匹配把 `.ilife-toast-stack` 计成一枚＝假红） |
| **H-17** | H-17（表格规格：`th` 大写 11.5–12px／600／透明背景／1px 硬描边；`td` 内距 12–14px／软描边；末行无边框；整表在卡片内） | 语义标签 `<table>/<thead>/<th>/<td>`（DB-3 强制）＋ 上列 computed。**HELP 页实测 `<table>` = 0** → 适用域需先裁定（见 §5 R-4）：或判「HELP 页 N/A、转内容页 B-03」，或判「HELP 页缺表格组件＝未达标」 | DOM 断言 ＋ computed 采样 | CMD-S（`H-17.1` **当前红**）＋ §2 的 B-03 命令 | `tables: 0`；或 `th` 背景非 transparent／`td` 末行仍有边框 |
| **H-18** | H-18（空态：居中卡片、内距 `48px 20px`、图标 40px／`opacity:.5`、标题 17px／600、说明 13px） | 空态根含卡片外观；computed `padding:48px 20px`；图标 `font-size:40px`／`opacity:0.5`；`h3` 17px／600；`p` 13px | 静态断言 ＋ computed ＋ 空态截图（构造空数据页） | CMD-S（`H-18.1`）＋ 需另造空态样本（见 §6 步骤 7） | 只有纯文本空态（旧版 `padding:24px` 形态）；或图标 40px 缺 `opacity:.5` |
| **H-19** | H-19（**级别 B**：`scrollY > 400` 才出现；42px 圆形毛玻璃；`fixed bottom:24px right:24px`；点击平滑回顶；D-14 强制） | ① 初始 `opacity:0` ＋ `pointer-events:none`；② `scrollY = 401` 后 `opacity:1` ＋ 可点；③ 几何 42×42／`border-radius:50%`／`position:fixed`／`right=bottom=24`；④ 点击后 `scrollY` **单调下降**并在窗口内到 0 | **交互记录＋时序采样**：`window.scrollTo` 定阈 ＋ `requestAnimationFrame` 采样 `scrollY` 轨迹（22 个采样点）；窗口 1200ms | CMD-I（`H-19.1…19.4`；轨迹见 `probe-interactive.json.H19.trace`） | 阈值：`scrollY 最终 = 0`、`monotonicDown = true`、`distinct > 2`。**失败**：`opacity` 恒 0（阈值未生效）；或轨迹跳变（非平滑）；或最终 `scrollY ≠ 0` |
| **H-20** | H-20（**级别 B**：每个可交互控件有 `:focus-visible` 焦点环；`prefers-reduced-motion` 下关闭复制缩放与 toast 滑入；D-14 强制） | ① CSS `:focus-visible` 命中 ≥1 且覆盖按钮／输入（实测 10 条规则）；② `Emulation.setEmulatedMedia` 开 `reduce` 后：复制按钮／回顶按钮 `transition-duration = 0s`、toast `animation-name: none`；③ `Input.dispatchKeyEvent` Tab 遍历 6 次，**≥2 个控件** `matches(':focus-visible')` 且 `outline-width ≥ 1px` | **交互记录＋媒体仿真＋时序采样**：Tab 逐次采样 `document.activeElement` 的 outline／`:focus-visible`；采样＝每键 120ms 后 1 次 | CMD-I（`H-20.1…20.4`）＋ CMD-R1 | **失败**：`reduce` 下过渡仍非 0；或 Tab 后 `matchesFV=false`（焦点不可见）；或 outline-width `0px` |

**覆盖自检**：H-01…H-20 各恰一行（20/20）；A 级 14 条、B 级 4 条、HELP 页 N/A 2 条；与 `visual-spec-help.md` §2.1 的 1:1 对应不变。

---

## 2. 内容页区块级验收办法（12 区块，**不做 DOM 同构**）

### 2.0 三条纪律（照 `docs/visual-spec-blocks.md` §0）

1. **不锚 DOM 结构**：只锚 **命名空间 ＋ 必需属性 ＋ 状态取值 ＋ 数值规格**（`base-paint-contract.md:847` 明写节点契约「不冻结也不排除」）。同一区块**允许两种以上 DOM 实现**，锚点齐即过；DOM 一模一样但锚点缺 → 不通过。
2. **能引用就不要重述**：数值一律引用 `packages/base-render/src/spec/*.ts` 的冻结常量，禁止第二份数值。
3. **控件 vs 区块分层**：控件（原子）签名归 `base-paint-contract.md` §3.3；区块只**组合**，不得重定义控件签名／复制实现。

### 2.1 逐区块断言表（可机判锚点）

| 区块 | 命名空间锚点 | 必需属性锚点 | 状态断言 | 采集命令／判据 |
|---|---|---|---|---|
| **B-01** 页面壳／标题区 | 根类名以 `STYLE_PREFIX` 开头（实测 `ilife-help-shell`） | 单文件自足：`SHARED-CSS`／`SHARED-HELPERS` 各**恰 1** 且零残留；载荷槽**恰有其一**（`CONTENT` 或 `INJECT-DATA`）；`<table>` 等语义标签不被 div 模拟替代 | 静态 | CMD-S（`B-01.1…01.3`：残留 0／id `13/13` 唯一／根类名 `ilife-` 前缀） |
| **B-02** KPI 卡 | `ilife-` 前缀 | 四槽文本节点齐（label／value／unit／detail）；数值带 `tnum`；badge 后缀 ∈ `STATUS_KINDS` | 非法 status → 降级 `empty` | 造 KPI 页 → 断言四槽各 ≥1；`renderStatusBadge({status:'bogus'})` 回落 `empty` |
| **B-03** 表格 | `ilife-` 前缀；整表在卡片内 | **强制语义标签** `<table>/<thead>/<th>/<td>`（DB-3） | 空数据 → 走 B-10 空态（不渲染空表） | `th` computed `text-transform:uppercase`／`background-color:transparent`／`border-bottom-width:1px`；`td` `padding ∈ [12,14]px`；`tr:last-child td` 无下边框 |
| **B-04** 图表 | `<prefix>charts`／`<prefix>charts-<kind>`；样式表 id 取 `CHARTS_STYLE_ID` | 返回 `ChartOutput{kind,html,empty,points}`；`kind ∈ CHART_KINDS`（8 种） | 空数组 → `empty=true` 走空态；结构违规**直接抛错** | 调 `charts.<kind>(input)` 逐 kind；`html` 含 `viewBox` 且容器 `padding:0`；非法输入抛 `ChartError`；**`<canvas>` 命中 0**（DB-6） |
| **B-05** 列表（行） | `ilife-` 前缀 | 每行左／中／右三槽；主体文本可截断（`min-width:0` ＋ `ellipsis`） | 完成态行 `text-decoration-line:line-through`；空列表 → B-10 | 行 `border-top-width:1px` 且 `:first-child` 为 0（软描边＝`--line` ＋ alpha，DB-5） |
| **B-06** 指令块 `<pre>` | `ilife-` 前缀 | 载体必须是 `<pre>`；带复制则按钮必带 `data-action-id` ＋ `data-t` | 无命令 → 不渲染空板 | computed：等宽栈／`font-size ∈ [11.5,12]px`／`line-height:1.55`／`overflow-x:auto`／`border-radius:8px` |
| **B-07** 详情区 | `ilife-` 前缀；HELP 页内属 `helpShell` | 场景必带 `id/title/wake_word/status/prompt_template`；类型字段名取 `SCENE_TYPE_FIELD`（**复数**） | `status ∈ SCENE_STATUS`（两值闭集）；`【待开发】` 时复制按钮**仍可点** | 按 `SCENE_DATA_SCHEMA` 校验每个场景；详情层文本**包含** `prompt_template` 原串（逐字，不 trim） |
| **B-08** 折叠区 | `ilife-` 前缀 | **原生** `<details>/<summary>`（DB-4，实测 490／490） | `[open]` 驱动展开；点击复制**不得**触发折叠 toggle（50ms 兜底） | `tagName === DETAILS` 且含 `SUMMARY`；`[open]` 时 `summary::before` 旋转 90°；点 `.copy-btn` 后 50ms 内 `open` 不变 |
| **B-09** 表单／参数区 | `ilife-` 前缀 | 字段带 `name/label/value`；渲染 `label` ＋ `input`（`placeholder = hint`） | `required` 空值 → **拒绝复制**并提示字段名；`input` 事件实时重算预览（DB-7） | 每个字段 `placeholder === hint`；留空点复制 → 剪贴板**无写入** ＋ 出现含字段名提示；改输入 → 预览文本变化 |
| **B-10** 空态 | `ilife-empty`；子节点 `empty-icon/empty-text/empty-hint/empty-action` | `text` 必填；`icon/hint/actionHtml` 可选 | **无数据＝空态；异常＝错误回执**（DB-8，两者不得混用） | `renderEmptyState({text})` 产出 `ilife-empty` 根 ＋ `empty-text`；computed `padding:48px 20px`；图标 40px／`opacity:0.5` |
| **B-11** 复制区 | `ilife-action-bar`／`ilife-action-row`／`ilife-copy-btn` | 每个按钮**必带** `data-action-id` 与 `data-t`（两个不同属性，不得混用）；actionId 取冻结 `COPY_ACTION_IDS`／`HELP_COPY_ACTIONS` | 成功 → `.copied` ＋ 成功文案；失败 → 失败文案恒在；空文本 → 短路不复制 | `listActionIds()` 能发现全部 id；空文本时 `copyText` 返回 `ok:false` 且**不写剪贴板** |
| **B-12** 反馈区（toast ＋ 错误回执） | `ilife-toast`／`ilife-error` | toast 必带 `role` ＋ `aria-live`（取 `TOAST_DEFAULTS`，实测运行时产出 `role="status"`／`aria-live="polite"`）；错误回执复制按钮 actionId 取 `COPY_ACTION_IDS.errorReceipt` | toast 显隐由**整节点插入／移除**控制（无 `show` 类）；错误回执缺 `dataText`／`logText` 时**不渲染**对应按钮 | toast 根属性 == 冻结值；`data-max` == 栈上限；缺文本时按钮计数 = 0 |

### 2.2 复跑口径

- **入口**：47 页同质（#108–#110）与 18 项移植（#111–#113）的产物由 `calorie-cmd-read <key>` 生成；每页一条命令、`--output` 落 `.scratch/t89/blocks/<key>.html`。
- **断言脚本**：沿用 CMD-S 的写法（读产物 → 正则／`buildStyleSheet()` 分区 → 逐条 `[ASSERT]`），**建议实施席在 `t89-probe-help-static.mjs` 同目录新增 `t89-probe-blocks.mjs`**（本席未建：区块样本生成属 #89b 实施面，且需先按 §5 R-5 与 #104 对齐 12 区块清单）。
- **禁止**：不得用「DOM 逐节点 diff」判通过（票面明写不做同构）；不得为凑锚点给页面加装饰性节点。

---

## 3. 取证链路探针（**实跑，只读**）

### 3.1 本机链路实测（CMD-B，`RESULT: 10/10 PASS` exit 0）

| 探针项 | 结论 | 实测 |
|---|---|---|
| **P5** 无浏览器显式失败 | ✅ | `T89_NO_BROWSER=1` 子进程 **exit 2 ＋ `RESULT: ABORT`**（不静默变绿） |
| **P1** 浏览器可执行文件 | ✅ | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| **P2** CDP 建连 | ✅ | `Browser.getVersion` → **Chrome/152.0.7977.83 / protocol 1.3** |
| **P3a** `file://` 视口截图 | ✅ | `probe-viewport.png` **84,896 B** |
| **P3b** 元素级 clip 截图 | ✅ | `probe-element-hero.png` **5,638 B**（rect 960×111） |
| **P4a** 复制按钮存在 | ✅ | helpers 注入后 **1,744** 个可点按钮 |
| **P4b** 真手势 | ✅ | `Input.dispatchMouseEvent` 命中（click 时间戳存在） |
| **P4c** 时序双计时器 | ✅ | `MutationObserver` 观测 `copied` 存活 **459.3ms** |
| **P4d** 真剪贴板回读 | ✅ | 归一 CRLF 后 **82/82 字符逐字相等** |
| **P4e** 视口切换 | ✅ | 1440／640／400 三档 `innerWidth` 逐档相等 |

**启动参数（照抄）**：`--headless=new --disable-gpu --no-sandbox --no-first-run --disable-extensions --disable-background-networking --disable-component-update --disable-breakpad --disable-dev-shm-usage --hide-scrollbars --allow-file-access-from-files --remote-debugging-port=<port> --user-data-dir=<scratch> --window-size=1440,900 about:blank`；CDP 走 `Target.createTarget` ＋ `Target.attachToTarget(flatten)`；剪贴板需 `Browser.grantPermissions{origin:'file://', permissions:['clipboardReadWrite','clipboardSanitizedWrite']}`。

**依赖**：**零第三方**（Node 24 自带 `fetch`／`WebSocket`），**不需要 puppeteer／playwright**，**不需要显示会话**（headless=new）。

**三条已修的坑（写进探针注释，防回归）**：

1. **模板字符串吞反斜杠**：注入页面的正则若写单反斜杠，页面收到 `/s+/` → 匹配恒失败。**页面脚本里的正则一律写双反斜杠**。
2. **观测器必须保留强引用**（挂 `window.__t89`）：不存变量的 `new MutationObserver(fn).observe(...)` 可被 GC → 回调静默停投递 → 断言**假红且不可复现**。
3. **toast 没有 `show` 类**：helpers 是「整节点插入 ＋ `setTimeout(4500)` 整节点移除」，必须用 **childList** 观测或轮询节点数；且类名要**逐 token 精确匹配**（子串匹配会把宿主 `.ilife-toast-stack` 计成一枚）。

### 3.2 两轮红的根因（编排者问的第 1 问）

| 轮 | runId | 红 | 根因 | 类别 | 修法 |
|---|---|---|---|---|---|
| CMD-B 首轮 | `30f4c2dd…` | 4 条 | ① `evalJson` 对 **Promise** 做 `JSON.stringify` → `{}` → 真手势／时序断言恒 `undefined`；② `chrome --version` 在 Windows 上把请求转给**已运行实例**并打印中文提示（不可解析，且会打扰用户会话）；③ 负样本用 `DSH_BROWSER=<不存在路径>` 无效（候选列表会回落到标准路径） | **脚本自身 bug（3/3）** | ① 包 `async IIFE` ＋ `awaitPromise`；② 版本改取 **CDP `Browser.getVersion`**；③ 新增 `T89_NO_BROWSER=1` 强制无浏览器路径 |
| CMD-I 首轮 | `a902e83f…` | 2 条（toast） | ① 注入脚本里 `split(/\s+/)` 的**单个反斜杠被模板字符串吃掉** → 页面收到 `/s+/` → `isToastNode` 恒 false；② 观测器未保留强引用（GC 后静默停投递）；③ 误以为 toast 有 `show` 类 | **脚本自身 bug（3/3）** | 见 §3.1 三条坑；修后 `21/21` |

**排除环境嫌疑的证据**：同一台机、同一轮窗口内，`t121-browser-evidence.mjs` **22/22 exit 0**、`t88-probe-impl-b.mjs` **59/59 exit 0**、`t88-browser-evidence-b.mjs` **28/29**（唯一红是断言过期，见 §3.3）——若环境不可用（无 Chrome／无 CDP／无显示会话），这些脚本会以 exit 2 显式失败。

### 3.3 既有真机资产复用判定（编排者问的第 2 问）

| 脚本 | 本席实跑（持锁，`--ticket 89`） | 结论 | 可作 #89 底座的面 |
|---|---|---|---|
| `docs/research/t121-browser-evidence.mjs` | runId `c380f722-d0f9-4472-a4d0-825a41e52e0e`，**exit 0**，`RESULT: 22/22 PASS`（label `t89reuse`，5 s 级） | **仍可跑，全绿** | **H-16** 双反馈：`copied` 类／computed 背景 `rgb(52,199,89)`／450ms 弹簧／toast 单枚／真剪贴板逐字／失败路径零加类＋danger toast；指纹含 `dist/style.js`（CSS 面敏感） |
| `docs/research/t88-probe-impl-b.mjs`（前置） | runId `bc4cb10c-2ad4-49d3-a1fc-e4fe199f7d14`，exit 0，`RESULT: 59/59` | **仍可跑** | 生成 436 卡真实样本（1,264,882 B／4,090 行） |
| `docs/research/t88-browser-evidence-b.mjs` | ① 编排者席（旧样本）：**29/29**；② 本席 runId `4d8582c4-…`／`e7787153-…`（**新样本**）：**28/29**，唯一红 **B26** | **仍可跑**；29 与 28 的差**只由样本决定** | 436 卡／`data-t` 与 `<pre>` 逐字／委派复制一次／搜索＋`<mark>`／命中计数／跳页／**`#backTop`（B20／B22／B23／B25／B27 ＝ H-19 全覆盖）**／二次注入幂等／**禁用脚本后的 CSS-only 降级面** |

**B26 的 29↔28 差异：判据是样本，不是环境**（可复算）：

| 变量 | 旧样本（编排者席那轮） | 新样本（本席这轮） |
|---|---|---|
| 文件 | `.scratch/t88/out/卡路里_HELP_preview_b.html` | 同路径（本席跑 `t88-probe-impl-b.mjs` **重生成**） |
| 大小 | 1,027,870 B | **1,264,882 B**（sha256_16 `FB87787C0DE290A7`，mtime 2026-09-09 23:54） |
| B26 实测 | `fields=0` → **PASS** | `fields=341, inputs=341, sheets=436` → **FAIL** |
| 根因 | 该样本是 **#106 之前**的产物 | **#106 已把逐场景 CLI 回补成 341 条 `editable_fields`**（`t106-probe-cli.mjs`／#106 票面），B26 的「真实 payload 0 条」假设**过期** |

**如实披露**：本席在跑 §3.1 前执行了 `t88-probe-impl-b.mjs`，**覆盖了 `.scratch/t88/out/卡路里_HELP_preview_b.html`**（1,027,870 → 1,264,882 B，untracked scratch 文件），因此后来者复跑会看到 28/29 而非 29/29。**这是数据事实的升级，不是回归**：B26 需要按 #106 的新数据改写（或改用「与真实 payload 一致」的判据）。**该断言不属 #89**（§5 R-7）。

**结论（给 #89 实施席）**：**不要另造一套浏览器框架**——CMD-B／CMD-S／CMD-I 三条新探针**沿用 t121 的启动参数集、等待条件、`die(2)` 口径与「页面侧双计时器」范式**（同一 Chrome 参数、同一 `Target.attachToTarget(flatten)`、同一 `grantPermissions(file://)`），只是把断言面从「复制双反馈」扩到「B1 20 条」；`t121`／`t88` 两条既有脚本作为**交叉校验底座**（它们证过的面不重复断言）。

### 3.4 覆盖映射：B1 20 条里，既有两套件已覆盖哪几条／必须新采哪几条

**判据**：对两套脚本 grep 关键能力词（可复算）——`focus-visible`／`prefers-reduced-motion`／`setDeviceMetricsOverride`／`setEmulatedMedia`／`max-width: 640|400`／`dispatchKeyEvent`／`clipboard`／`backTop`／`scrollY`／`toast`。

| 能力词 | `t121-browser-evidence.mjs` | `t88-browser-evidence-b.mjs` |
|---|---|---|
| `clipboard`（真剪贴板回读） | ✅ 3 处（`readText()`／`grantPermissions`） | ✖（只有 `writeText` 桩） |
| `toast`（反馈通道） | ✅ 8 处 | ✖ |
| `backTop` / `scrollY`（回顶） | ✖ | ✅ 12 处（B20／B22／B23／B25／B27） |
| `focus-visible`（焦点环） | **0** | **0** |
| `prefers-reduced-motion`（动效可关） | **0** | **0** |
| `setDeviceMetricsOverride` / `max-width:640|400`（断点） | **0** | **0** |
| `setEmulatedMedia`（媒体仿真） | **0** | **0** |
| `dispatchKeyEvent`（键盘遍历） | **0** | **0** |

⇒ **审查席的实测结论成立并被本席复核**：**H-12（断点）与 H-20（焦点／动效）在两套件里零命中**。

| B1 条 | 既有套件覆盖 | 处置 |
|---|---|---|
| **H-16** | **t121 主覆盖**（copied 态／背景／450ms／剪贴板逐字／单枚 toast／失败零加类） | 作**交叉校验**；CMD-I 只补「每卡恰 1 按钮」「复制全部 = 0」「toast 4500ms」三面 |
| **H-19** | **t88 主覆盖**（B20 存在／B22 `scrollY>400` 出现／B23 点击回顶到 0／B25 幂等／B27 无 JS 降级） | 作**交叉校验**；CMD-I 补「42×42 几何 ＋ rAF 单调轨迹」 |
| **H-12** | **零覆盖** | **必须新采**（CMD-I 三档视口 computed ＋ 每档截图） |
| **H-20** | **零覆盖** | **必须新采**（CMD-I：媒体仿真 ＋ Tab 遍历焦点环） |
| **H-01…H-11／H-15／H-17／H-18** | 两套件**都不做样式规格断言**（t121 只验 `.copied` 命中面、t88 只验结构／交互） | **必须新采**（CMD-S 静态／CSS 分区 ＋ 浏览器 computed） |
| **H-13／H-14** | 不适用（HELP 页无此物） | N/A 记账 → 内容页 B-02／B-04 |

### 3.5 若链路确实不可用：三个替代方案（编排者问的第 3 问）

> 前提说明：本机链路**可用**（§3.1），以下仅作「换机／无浏览器」时的降级预案。

| 方案 | 能满足 B1 哪几条 | 不能满足哪几条 | 成本 | 能否被伪造 |
|---|---|---|---|---|
| **方案 1（推荐）复用 `t121`／`t88` 既有脚本 ＋ CMD-S** | A 级 14 条全量（静态／CSS 文本／DOM 锚点）＋ H-16 的双反馈时序（t121 已证）＋ H-19／H-20 的 CSS 规则面（t88 降级面已证） | **H-12 的三档视口 computed**、H-19 的**平滑回顶轨迹**、H-20 的 **Tab 焦点环**（三者都必须真实交互） | 低（脚本已存在，只需换 label／锚点） | 部分：CSS 文本可手写伪造，故必须**同时**贴 `RESULT: n/m` ＋ `sha256` 指纹；交互面无法伪造 |
| **方案 2 Node 直连 CDP（＝CMD-B／CMD-I 现状，零第三方）** | 全部 20 条（A ＋ B） | — | 中（已在仓内，跨平台候选路径已覆盖 Chrome／Edge／Linux／macOS） | 交互／时序不可伪造；但**阈值可被改** → 阈值必须写在脚本顶部常量并**同步本文** |
| **方案 3 纯 DOM／时序断言替代截图** | A 级 14 条＋H-16／H-19／H-20 的**属性级**判定 | **截图类证据**（H-03 两面可区分、H-05 阶梯观感、H-08 标题观感、H-10 圆角观感、H-18 空态观感）——**没有像素就无法目检** | 低 | **可伪造度高**（DOM 断言只看结构，看不到实际观感）→ 只能作**辅助**，不得单独作为视觉锁的验收证据 |

**推荐**：**方案 1 ＋ 方案 2 并用**——方案 2 跑满 20 条并出截图（主证据），方案 1 作交叉校验；方案 3 仅在无浏览器时作**降级登记**，且必须在证据里显式标 `BLOCKED: 无浏览器，截图面未取证`。

---

## 4. 证据产物归档约定

### 4.0 接口约定（**照抄**；票面此前无约定，本节即为约定）

| 约定项 | 值 | 说明 |
|---|---|---|
| 证据根目录 | `docs/research/t89-evidence/` | 受 git 跟踪（`.gitignore` 未忽略；已核对 `.gitignore:5` 只忽略 `.scratch/`） |
| 每轮目录 | `docs/research/t89-evidence/<runId>/` | `runId` ＝ 该轮 `run-locked` 打印的 UUID（如 `47adfd85-b9e4-4e04-a905-54273ae85723`） |
| 探针输出开关 | 三个新探针统一支持 `--out <目录>`（缺省 `.scratch/t89/evidence`） | 归档时：`--out docs/research/t89-evidence/<runId>/<代号>` |
| 代号 | `A`＝产物生成／`B`＝能力自证／`S`＝静态面／`I`＝交互时序 | 目录内文件沿用探针自身命名（`probe-browser.log`／`probe-static.json`／`h12-640.png`…） |
| 逐条截图 | `docs/research/t89-evidence/<runId>/H-<NN>/<step>.png` | `NN` 两位（`H-01`…`H-20`），`<step>` ASCII（`viewport`／`element`／`before`／`after`） |
| 清单 | `MANIFEST.json`（数组）＋ `SHA256SUMS.txt` | 每条：`{尺条, 命令, runId, exit, 产物[], sha256}`；`SHA256SUMS.txt` 供 `sha256sum -c` 复算 |
| 被验 HTML | **不入仓** | 路径 `.scratch/t89/help-file.html`；只把 `bytes` ＋ `sha256_16` 写进 `A-artifact.json`／`MANIFEST.json` |
| 禁止入库 | `.scratch/**`、`_profile*`、`*.tmp` | 实测单个 Chrome profile ≈ 80 MB |

### 4.1 放哪

| 类别 | 位置 | 入库？ | 理由／体积 |
|---|---|---|---|
| **机读证据**（`*.json`／`*.log`／`*.png` 截图／`SHA256SUMS.txt`／`MANIFEST.json`） | **`docs/research/t89-evidence/`** | **受跟踪** | 一次全量 ≈ **300 KB**：视口图 3×（70–98 KB）＋ 逐条元素图（每条约 3–10 KB，20 条 ≈ 100 KB）＋ JSON 7 KB ＋ 日志 2–5 KB |
| **被验 HTML 产物**（1,264,822 B） | `.scratch/t89/help-file.html` | **不入库** | 一条命令可再生（CMD-A）；只把 `sha256_16` 写进证据 JSON／`MANIFEST.json` |
| **Chrome profile／临时目录** | `.scratch/t89/evidence/_profile*` | **绝不入库** | 实测单个 profile ≈ 80 MB |
| 一次全量目录（含未压缩截图） | 同上 | — | 上限建议 **≤ 2 MB**；超限则截图改 1280×900 ＋ PNG 优化 |

`.gitignore` 现状已核对：`.scratch/` 被忽略（`.gitignore:5`），**`docs/research/t89-evidence/` 不被忽略**（可直接入仓）。

### 4.2 命名规则

```
docs/research/t89-evidence/
  MANIFEST.json                     # 每次全量跑的元信息数组
  SHA256SUMS.txt                    # 逐文件 sha256（含被验 HTML 的 sha）
  <runId>-<UTC时间戳>/
    A-artifact.json                 # CMD-A：产物路径／bytes／sha256_16／exit
    B-capability.log  + probe-viewport.png + probe-element-hero.png
    S-static.log      + probe-static.json
    I-interactive.log + probe-interactive.json + h12-1440.png|h12-640.png|h12-400.png
    H-<NN>/<step>.png               # 逐条元素级截图（H-01…H-20）
```

- 文件名一律 **ASCII**（`H-16.3` 这类编号作目录名），中文只出现在 JSON／日志内容里，避免跨平台路径问题。
- **每条尺子一个目录**，目录内放该条的截图／JSON 片段；`MANIFEST.json` 记录 `尺条 → 命令 → runId → exit → 产物 sha256`。

### 4.3 新克隆怎么复跑

```powershell
# 0) 前置
pnpm install ; pnpm build
# 1) 生成被验产物（file 态）
node tooling/run-locked.mjs --ticket 89 -- node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params "{\"mode\":\"file\"}" --output .scratch/t89/help-file.html
# 2) 链路能力自证（缺浏览器会 exit 2，不静默变绿）
node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-browser.mjs
# 3) A 级静态面
node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-static.mjs
# 4) B 级交互／时序（H-12／16／19／20）
node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-interactive.mjs
# 5) 交叉校验底座
node tooling/run-locked.mjs --ticket 89 -- node docs/research/t121-browser-evidence.mjs --label t89reuse
node tooling/run-locked.mjs --ticket 89 -- node docs/research/t88-probe-impl-b.mjs
node tooling/run-locked.mjs --ticket 89 -- node docs/research/t88-browser-evidence-b.mjs
# 6) 证据入仓（--out 指到受跟踪目录）
node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-browser.mjs --out docs/research/t89-evidence/<runId>/B
```

- **必须持锁**：三条探针都读共享 `dist/`，他席变异构建窗口会污染读数（#121 红队 S3-2 同口径）。
- **跨机可复现**：Chrome 候选路径覆盖 Windows（Chrome／Edge）＋ macOS ＋ Linux；`DSH_BROWSER=<路径>` 可显式指定；`T89_NO_BROWSER=1` 用于自证「无浏览器会显式失败」。
- **证据不可伪造的最低要求**：每个证据文件必须与 `MANIFEST.json` 里的 `sha256` 对得上；`RESULT: n/m` 摘要行必须与日志逐条 `[ASSERT]` 计数一致。

### 4.4 引用核对（编排者点名的两处）

- **`docs/research/t75-style-evidence.mjs` 不存在**：`docs/research/` 下 t75 相关只有 `t75-publish-evidence.mjs`／`t75-mutation-evidence.mjs`／`t75-visual-evidence.mjs` 三个 `.mjs` 与若干 `.md`。**本文全篇未引用 `t75-style-evidence.mjs`**（已 grep 复核）。
- **`fixtures/README.md` 实为 `fixtures/help-instances/README.md`**：本文引用的是 `docs/visual-spec-help.md` 的证据源 E1／E2（`fixtures/help-instances/卡路里_HELP_*.html`），**未引用任何 `fixtures/README.md` 路径**。

---

## 5. 风险与缺口清单

> 口径：R35——**凡与冻结契约常量冲突处，以冻结契约为准**；旧版差异＝改进项不是缺陷。下列均为**当前态抽样**（可复跑），归属建议供编排者派单。

| # | 风险／缺口 | 实测证据 | 影响哪些 B1 条 | 归属建议 |
|---|---|---|---|---|
| **R-1** | **判据收窄缺失 → 假红**：H-04 全量 grep 命中 charts 区 `repeating-linear-gradient`；H-10 全量命中 charts 区 `2px` 圆角；H-01 禁色 vs `CHART_PALETTE` 紫／粉 | CMD-S `H-04.1`（`gradHelp:0, gradAll:1`）、`H-10.1`（`badRadiiAll:["2px","4px"]`）、`CHART_PALETTE` 冻结 | H-04、H-10（H-01 已按 D-10 收窄） | **#89b 自带**：判据必须按 CSS 区收窄（#88 台账 L-17 已定「按 CSS 区判」），**不要开票** |
| **R-2** | **H-12 的 400px toast 条款与冻结值冲突**：规格写 `@media(max-width:400px){toast left:12px;right:12px}`，实现把该规则放在冻结的 **820px** 层（`TOAST_DEFAULTS.mobileMaxPx`）；实测 400px 下 toast `left/right=12px` 成立（因 820 层先命中） | CMD-I `H-12.4` 实测 `12px/12px`；CSS 400px 块只有 `.ilife-help-shell-tab-bar{gap:6px}` | **H-12** | **需一次裁定**（编排者）：按 R35／D-6 判「≤820 层承担，H-12 该句改判」→ 否则**判不了**（两个断点各管一层，硬加 400px 规则会重复定义） |
| **R-3** | **H-06 正文栈无 `"SF Pro Display"`**：冻结 `spec/style.ts` **零字体常量**（`font` 命中 0），故不能按 R35 用「冻结契约为准」豁免；当前 CSS 只有 `"SF Mono", monospace` 与 `inherit` → 正文用浏览器默认字体 | CMD-S `H-06.2` 红：`sfPro:0`，`stacks:["SF Mono, monospace","inherit"]` | **H-06** | **新票**（owner `#75` 已关闭 → 建议开「样式资产补正：正文/等宽字体栈」票，或并入 #89b 的返修清单）；**#89b 不得自行判绿** |
| **R-4** | **H-17 适用域未定**：HELP 页实测 `<table>` = 0，而 H-17 未标 N/A；若按「规格要求表格组件存在」判 → 红；若按「HELP 页无表格 → N/A、转内容页 B-03」判 → 需裁定 | CMD-S `H-17.1` 红（`tables:0`）；`visual-spec-help.md` H-17 无 N/A 标注 | **H-17** | **需一次裁定**（编排者）：建议按 D-15 同口径「HELP 页 N/A → 转区块尺 B-03」，并**在 `visual-spec-help.md` 补一行 N/A 标注**（改尺子须走 #63 追加决策） |
| **R-5** | **12 区块清单尚未终审**：`visual-spec-blocks.md` 的 12 区块是「暂定」，**DB-1／DB-2 移交 #104**（区块接口 owner）；区块命名空间闭集也不得由尺子自造 | `visual-spec-blocks.md` §5 DB-1／DB-2 | §2 全部区块 | **#104**（已关闭 → 若 #89b 发现锚点缺口，转新票）；#89b 按 #104 落地的实际命名空间判，**不按本尺拟名判** |
| **R-6** | **产物体积 1,264,822 B**（vs F3 302,820 B）：#106 已登记「若 #89／#83 以体积为验收项需回议」 | CMD-A 实测；#106 票面登记 `+231,168 B` 归因（Sheet CLI 行 ＋ 复制参数 ＋ payload） | 不影响 20 条判据 | **无需开票**（除非编排者把体积列为验收项）；建议 #89b 在证据里记一行体积趋势 |
| **R-7** | **`t88-browser-evidence-b.mjs` B26 断言过期**（假设 `editable_fields`=0，实际 341，因 #106 回补） | §3.3 实跑 `28/29` | 复用该脚本时 | **#89b 自带**：复用时应跳过／标注 B26；若要把该脚本纳入常规门禁，转票修断言 |
| **R-8** | **截图类判据的观感主观性**：H-03／H-05／H-08／H-10／H-18 的「可区分／阶梯观感／圆角观感」部分依赖人眼 | §3.4 方案 3 的伪造面 | 5 条 | **#89b 自带**：截图 ＋ 机读断言**双证**，单凭人眼不判绿 |

**「可能判不了」清单（3 条）**：**H-13／H-14**（HELP 页无 KPI／无环 → N/A，转 B-02／B-04）＋ **H-17**（HELP 页无表格 → 适用域待裁定，见 R-4）。另 **H-12 的一条子句**（400px toast）在裁定前**不可判**（R-2）。

---

## 6. 给实施席的移交清单（照着干）

> 全部命令在仓根执行；**每一步都经 `node tooling/run-locked.mjs --ticket 89 -- …`**；证据写 `GATE-RUN runId=… cmd=…`。

| 步 | 先做什么 | 跑什么命令 | 产出什么文件 |
|---|---|---|---|
| **0** | 认领票面（`gh issue edit 89 --add-assignee @me`）；确认前置全关（#104／#88／#75／#106／#121） | `gh issue view 89` | 票面评论（认领＋口径确认） |
| **1** | 确认基线干净：`git status` 无他席未提交改动；`pnpm build` 成功 | `node tooling/run-locked.mjs --ticket 89 -- pnpm build` | `.scratch/t89/evidence/<runId>/build.log` |
| **2** | 生成被验产物（file 态） | **CMD-A** | `.scratch/t89/help-file.html`（记 `bytes`／`sha256_16`） |
| **3** | 链路能力自证（**必跑**：它同时证明「无浏览器会 exit 2」） | **CMD-B** | `probe-viewport.png`／`probe-element-hero.png`／`probe-browser.log` |
| **4** | A 级 14 条逐条采集 | **CMD-S** | `probe-static.json`／`probe-static.log` |
| **5** | B 级 4 条交互／时序采集（**先与编排者确认 R-2 的 400px 裁定**） | **CMD-I** | `probe-interactive.json`／`h12-*.png`／`probe-interactive.log` |
| **6** | 交叉校验底座（证明不是「只有新脚本能跑」） | **CMD-R1**、**CMD-R2**（R2 注意 B26 过期） | `evidence-<label>.log`／两份 `RESULT: n/m` |
| **7** | 补 H-18 空态样本（需构造空数据页）与逐条元素截图（20 条 × 1 图） | 由 §2.2 的区块样本脚本 ＋ CMD-B 的元素 clip 截图路径扩展 | `H-<NN>/<step>.png` |
| **8** | 把 R-2／R-3／R-4 三条送编排者裁定／派单（**不要自行判绿或判红**） | 票面评论 ＋ 引用本文 §5 | 裁定回执 |
| **9** | 归档证据到受跟踪目录（`--out docs/research/t89-evidence/<runId>/…`）＋ 生成 `MANIFEST.json`／`SHA256SUMS.txt` | §4.3 第 6 行 | `docs/research/t89-evidence/**` |
| **10** | 收尾三件事：票面回贴结论 → `gh issue close 89` → 往 `#63` 的 `## Decisions so far` 追加一行 | — | 票面／地图 |
| **11** | 自检 `packages/skill-calorie/SKILL.md` 首 3 字节非 `00 00 00`（#124 事故） | `node -e "const b=require('fs').readFileSync('packages/skill-calorie/SKILL.md');console.log(b.subarray(0,3))"` | 一行输出 |

**提交纪律**：`git commit --only docs/research/t89-evidence-plan.md docs/research/t89-probe-*.mjs docs/research/t89-evidence/**`（**不要** `git add -A`，**不要** push）。

---

## 附：本席实跑台账（可复算）

| 命令 | runId | exit | 摘要 |
|---|---|---|---|
| CMD-A | `196e86a5-52fa-4886-9035-569bd020c2db` | 0 | 1,264,822 B／`sha256_16=F380EF685065A1E9` |
| CMD-B | `47adfd85-b9e4-4e04-a905-54273ae85723` | 0 | `RESULT: 10/10 PASS` |
| CMD-S | `06ac6c29-9f9a-4e5e-8ca5-0cacb3304ba8` | 1 | `RESULT: 24/27`（红＝H-06.2／H-10.1／H-17.1） |
| CMD-I | 见 `.scratch/t89/evidence/probe-interactive.json` | 0 | `RESULT: 21/21 PASS` |
| CMD-R1 | `c380f722-d0f9-4472-a4d0-825a41e52e0e` | 0 | `RESULT: 22/22 PASS`（5 s 级） |
| CMD-R2 前置 | `bc4cb10c-2ad4-49d3-a1fc-e4fe199f7d14` | 0 | `RESULT: 59/59`（重生成样本 1,264,882 B） |
| CMD-R2 | `4d8582c4-0949-4997-ae26-1914bd8833c1`／`e7787153-f2eb-4b31-b558-091696637d4e` | 1 | `RESULT: 28/29`（唯一红 B26＝`fields:341` 断言过期；**新样本**） |
| CMD-R2（编排者席对照） | — | 0 | `RESULT: 29/29`（**旧样本** 1,027,870 B，`fields:0`） |
