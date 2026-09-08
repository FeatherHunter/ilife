# V3 · 对抗与变异鉴别力验收（#78 · base-paint charts/help）

**裁决：不通过。**

不通过判据（章程 V3 第 60 行：「任何存活变异、任何恒真断言、任何纯度违规」）：本轮 32 处独立变异中 **8 处存活**（变异后 `packages/base-render/test/*.test.mjs` 全绿 382/382），且 8 处存活已逐一取证为**真实行为差异**（非空变异）→ 对应断言无鉴别力，须补断言后复验。**未发现恒真断言、未发现纯度违规。**

同时给出正面结论（本套测试**不是恒真的**）：24/32 处变异被判红，8 个 kind 的语义、helpers JS 结构、HELP 校验器/壳渲染的主要锚点均有鉴别力（逐条见下表）。缺陷是**局部盲区**，不是整体失灵。

---

## 0. 被审版本（V3 实读）

| 文件 | mtime | SHA256 |
| --- | --- | --- |
| `packages/base-render/dist/charts.js` | 2026-09-09 05:28:49.921 | `0CF425B9AD89CFB8095DC7E435AC843AFE8D9CED04BF08741518057222F13491` |
| `packages/base-render/dist/help.js` | 2026-09-09 05:28:49.935 | `E34DE5405DB1118A0468B0857C3C873AD3440659AC5B5E832ED0485B7E2D7E54` |
| `packages/base-render/src/charts.ts` | 2026-09-09 05:28:43.824 | `B457B913DA5B9504EDB7177EA4F3B307DE4BD5FB7AEE327D438427254F857ADE` |
| `packages/base-render/src/help.ts` | 2026-09-09 04:50:35.250 | `69FFCE4565DB0187200A11AF0E6C1094E34FE0CF82CABCF5761FADD4A83826E8` |
| `packages/base-render/test/charts.test.mjs` | 2026-09-09 05:27:05.988 | `0BE843E295DC242397E8F715DC6EFE7C7F6C221C39D87D9A41060D9440EE77AF` |
| `packages/base-render/test/help.test.mjs` | 2026-09-09 04:50:16.180 | `97A16752C6A1BC8E0A36ED9AB42E76874748121062F78B2F71725906B7B2124C` |

- 基线 HEAD `f3b6b7a`（非派单所述 `aed1b7c`；以实读为准）。
- 基线全量测试：`node --test "packages/base-render/test/*.test.mjs"` → **# tests 382 / # pass 382 / # fail 0**，exit 0，1.4s。

## 0.1 并发纪律与 dist 静止证明

开工时 `dist` **正在被重建**（不可直接变异）：

| 快照 | 时刻 | charts.js mtime / SHA | help.js mtime / SHA |
| --- | --- | --- | --- |
| SNAP1 | 05:28:36 | 05:28:33.426 / `0CF425…` | 05:28:33.440 / `E34DE5…` |
| SNAP2 | 05:28:49 | 05:28:33.426 / `0CF425…` | 05:28:33.440 / `E34DE5…` |
| SNAP3 | 05:30:00 | **05:28:49.921** / `0CF425…` | **05:28:49.935** / `E34DE5…` |
| SNAP6 | 05:30:27.717 | 05:28:49.921 / `0CF425…` | 05:28:49.935 / `E34DE5…` |
| SNAP7 | 05:30:44.014 | 05:28:49.921 / `0CF425…` | 05:28:49.935 / `E34DE5…` |
| **SNAP8** | **05:31:57.702** | **05:28:49.921 / `0CF425…`** | **05:28:49.935 / `E34DE5…`** |

- SNAP3→SNAP8 之间 mtime 与 SHA **双相同**，间隔 **117.7s ≥ 60s**；且 SNAP6→SNAP8（90.0s）同样双相同 → 判定 `dist` 已静止，此后才开始变异。
- 期间另有一次重建（05:28:33 → 05:28:49）**内容字节不变**（SHA 相同），故不影响判据。
- 每处变异前脚本校验两文件 SHA == 基线（不等即 `PRE-DRIFT` 中止），每处变异后从字节备份还原并再次校验 SHA == 基线。**32 处全部 `restore_sha_ok=True`**，无一次并发漂移；变异窗口内 `dist` 未被并发重建（还原后 mtime 亦保持 05:28:49.921/935）。

## 0.2 变异方法

- **唯一写操作落在 `dist`**：`packages/base-render/dist/charts.js`（M01–M20、M30–M32）与 `dist/help.js`（M21–M29）。**未改 `src/**`、未跑 `tsc`**（避免与并行 V2a 互相污染）。
- 备份：`.scratch/t78/v3-backup/{charts.js,help.js}`（字节复制，SHA 与基线相同）。
- 施加器：`.scratch/t78/v3-apply.mjs`（要求 `old` 在目标文件中**恰出现 1 次**，否则拒绝；32/32 锚点唯一，见 `.scratch/t78/v3-check.mjs` 输出 `ANCHOR-CHECK ALL-OK`）。
- 驱动器：`.scratch/t78/v3-run.ps1`（前置 SHA 校验 → 变异 → 全量测试 → 记录红用例 → 字节还原 → SHA 校验 → **全量复跑**）。
- 变异清单：`.scratch/t78/v3-mutations.json`（**V3 独立设计，编号 M01–M32 为 V3 自编**；未读取施工者证据 `a1-evidence.md` 的 M1–M27）。

---

## 1. 变异红/绿表（32 处）

「命中用例」= 变异后变红的 `it(...)` 名称（TAP `not ok` 叶子节点，取自 `.scratch/t78/v3-out/Mxx.tap`）。「还原」列 `SHA✓` = 还原后两文件 SHA 与基线逐字节相同且全量复跑 382/382 绿。

### 1.1 红（24 处 → 断言有鉴别力）

| ID | 目标 / 改了什么（dist 行） | 命中用例 | 还原 | 结论 |
| --- | --- | --- | --- | --- |
| M01 | charts `line` 缺省 `height: 210` → `200`（:584） | `A.height / A.width：viewBox 宽高逐值生效，缺省按 kind` | SHA✓ | 红 |
| M02 | charts `tickCount` 收敛下界 `Math.max(2,…)` → `1`（:320） | `B.yTicks：false 无刻度；数字收敛 2-6；…` | SHA✓ | 红 |
| M03 | charts `bar` `stacked` 让位 `grouped`（:987 加 `&& opts.grouped !== true`） | `C.stacked × C.grouped：互斥，同传时 stacked 优先` | SHA✓ | 红 |
| M04 | charts `barColorFor` 缺省 `DEFAULT_SERIES_COLOR` → `CHART_PALETTE[0]`（:974） | `C.缺省（都不传）：单柱渲染路径` | SHA✓ | 红 |
| M05 | charts `donut` 缺省 `ringWidth 16` → `12`（:1162） | `D.size / D.ringWidth：直径 / 环宽（半径自适应）` | SHA✓ | 红 |
| M06 | charts `normalizePct` 删下界 `Math.max(0, …)`（:180） | `E.pct 超界：收敛 0~100（不抛错）` | SHA✓ | 红 |
| M07 | charts `sparkline` `rising` 判据 `>=` → `<`（:1373） | `F.showValue（sparkline）：末尾数值；涨绿跌红` | SHA✓ | 红 |
| M09 | charts `combo` 域 `padRatio 0` → 缺省 0.06（:1297） | `F.combo 共享域：0..max(柱,线) 无 padding…` | SHA✓ | 红 |
| M10 | charts `scatter` 回归斜率分母 `denom` → `denom + 1`（:1494） | `G.regression：最小二乘回归线；false 关闭` | SHA✓ | 红 |
| M11 | charts `SCATTER_DOT_DEFAULT_PX 9` → `7`（:97） | `G.dotSize：缺省 9px（r=4.5）；…` | SHA✓ | 红 |
| M12 | charts helpers `lines.join(LF)` → `join(',')`（:1651） | `H.buildChartsHelpersJs：IIFE 结构逐行固定…`、`H.chartsCss 经 jsStr 嵌入…` | SHA✓ | 红 |
| M13 | charts helpers 删幂等早退 `if (document.getElementById(STYLE_ID)) return;`（:1638） | `H.CHARTS_STYLE_ID…`、`H.buildChartsHelpersJs…`、`H.chartsCss 经 jsStr 嵌入…` | SHA✓ | 红 |
| M15 | charts `donut` 弧色 `CHART_PALETTE[i]` → `[(i+1)]`（:1177） | `C.singleColor：全部柱同色（覆盖 colors）`、`H.CHART_PALETTE：10 色逐值 + 取色顺序` | SHA✓ | 红 |
| M16 | charts `line` `points` 把 null 点也计入（:946） | `B.connectNulls：跨空连线；…`、`B.ChartItem.value === null：仅 line 合法…` | SHA✓ | 红 |
| M20 | charts `labelIndexes` 取最大 → 取最小（:362） | `A.labels：edge/all/none/select 改变 X 轴标签集合` | SHA✓ | 红 |
| M21 | help 校验器删 `minItems` 判定（:158-161） | `空 scenes[] → schema-invalid（裁定 R11：SCENE_DATA_SCHEMA.minItems=1）` | SHA✓ | 红 |
| M22 | help `paramsText` `join(LF)` → `join(',')`（:342） | `多字段 params：逐字以 LF 连接（FX-78-V2b-1）` | SHA✓ | 红 |
| M23 | help `attr()` 去 `escapeHtml`（:314） | `每个 sceneData 文本字段都渲染且经 escapeHtml（逐字段）` | SHA✓ | 红 |
| M24 | help 复制按钮 `action.actionId` → 字面量 `'copy-prompt'`（:325） | `init_banner：…＋ 复制指令按钮`、`三个目标的 actionId／文案逐字取 HELP_COPY_ACTIONS…`、`每场景三目标各 1 个按钮…` | SHA✓ | 红 |
| M25 | help `sectionSlug` 不再小写（`helpShell`→`help-Shell`，:55） | 模块加载期 fail-fast：`Error: base-paint/help：CONTROL_STYLE_SECTIONS 闭集缺与 HELP_SHELL_ID 同 kebab 的区名（ilife-help-shell）` → 7 个测试文件全红（`# tests 7 / # fail 7`） | SHA✓ | 红（信号粗，但确为红） |
| M26 | help 徽章 chip `scene.wake_word` → `scene.title`（:404） | `chip 文本恒取 wake_word（wake_word ≠ title 的场景；FX-78-V2b-4）` | SHA✓ | 红 |
| M27 | help `INJECT-DATA` 移出自带容器（:578） | `status-invalid…`、`合法数据 ＋ 空资产 → …asset-missing`、`strict 原样透传…strict-invalid`、`每个 sceneData 文本字段都渲染且经 escapeHtml`、`meta_blocks[].html 原样透传`、`数据载荷里的 < 由填充器转义` | SHA✓ | 红 |
| M28 | help status 徽章判据 `SCENE_STATUS[1]` → `[0]`（:407） | `根元素恒为 HELP_SHELL_ID；类名全部落在 helpShell 命名空间；HTML id 全页唯一`、`status：徽章文本逐字 === SCENE_STATUS[1]…` | SHA✓ | 红 |
| M29 | help `cliText` 加自造前缀 `'skill.' + scene.id`（:334-336） | `场景卡：逐场景 CLI 形态文本 = Scene.id 原文…＋ 反向断言无拼接串`、`无 editable_fields 的场景：params 复制文本回落为该场景 Scene.id（R32）` | SHA✓ | 红 |

### 1.2 绿（8 处存活 = 缺陷）

| ID | 目标 / 改了什么 | 变异后测试 | 还原 | 结论 |
| --- | --- | --- | --- | --- |
| M08 | charts `gauge` `endAngle = Math.PI * (1 - fraction)` → `Math.PI * fraction`（:1405） | 382/382 绿，0 红 | SHA✓ | **存活** |
| M14 | charts `line` 折线路径去掉 `vector-effect="non-scaling-stroke"`（:764） | 382/382 绿，0 红 | SHA✓ | **存活** |
| M17 | charts `esc()` 退化为恒等（`return value;`，:58-60）→ **全部产出不再转义** | 382/382 绿，0 红 | SHA✓ | **存活** |
| M18 | charts `areaPath(…, frame.y1, …)` → `frame.y0`（:753） | 382/382 绿，0 红 | SHA✓ | **存活** |
| M19 | charts `valueIndexes` 去重叠阈值 `if (x - lastX < 26)` → `< 0`（:397） | 382/382 绿，0 红 | SHA✓ | **存活** |
| M30 | charts `EMPTY_HINT` 文案常量替换（:102） | 382/382 绿，0 红 | SHA✓ | **存活** |
| M31 | charts `smoothPath` 控制点 `(p2[0]-p0[0]) / 6` → `/ 5`（:497） | 382/382 绿，0 红 | SHA✓ | **存活** |
| M32 | charts `svgOpen` 删 `role="img" focusable="false"`（:238） | 382/382 绿，0 红 | SHA✓ | **存活** |

**存活证明（非空变异）**：`.scratch/t78/v3-survivor-demo.mjs` 把每处变异施加到 `dist/charts.js` 的**内存副本**（写入 `.scratch/t78/v3-out/mut-*.mjs`，**不碰 dist**），与真实模块对照同一输入的产出差异：

```
BEHAVIOUR-CHANGED M08  gauge-fg d (pct=25) real M4.0 101.0 A81.0 81.0 0 0 1 27.7 43.7  vs mut … 142.3 43.7
                        （pct=50 为对称点，两式同值 → 只测 50% 的断言天然无鉴别力）
BEHAVIOUR-CHANGED M14  line 路径 vector-effect  real true  vs mut false（折线描边丢失防拉伸）
BEHAVIOUR-CHANGED M17  label='<img src=x onerror=alert(1)>'  裸出 real false vs mut true；转义形态 real true vs mut false
BEHAVIOUR-CHANGED M18  area d  real …L306.0 202.0 L14.0 202.0 Z  vs mut …L306.0 8.0 L14.0 8.0 Z
BEHAVIOUR-CHANGED M19  40 点密集 showValues 标签数  real 10  vs mut 40
BEHAVIOUR-CHANGED M30  空态提示「有记录后自动生成图表」  real true vs mut false
BEHAVIOUR-CHANGED M31  smooth d  real M14.0 202.0 C38.3 185.8 …  vs mut C43.2 185.8 …
BEHAVIOUR-CHANGED M32  svg role="img"/focusable="false"  real true/true  vs mut false/false
SURVIVOR-DEMO 8/8 处存活变异确认为真实行为差异
```

---

## 2. 存活清单（必须返修的 FX 条目）

| FX | 存活变异 | 缺陷 | 应补断言（建议写法） |
| --- | --- | --- | --- |
| **FX-78-V3-01** | M17 | `charts` 产出**零转义断言**：`esc()` 整体删除后 382 用例全绿。`charts.test.mjs` 全文无 `&lt;`/`&amp;`/`escapeHtml`（grep 0 命中），且**没有任何测试输入含 HTML 特殊字符**（所有 label 都是 `A`/`B`/`日` 一类）。这是最严重的一条：label／actionId／color／centerLabel／markLine.label／tip 文本可注入 HTML。 | 新增用例：`const RAW = '<script>"\'&'`，把它分别灌进 `items[].label`、`options.actionId`、`options.color`、`donut.centerLabel`、`markLine.label`、`tooltip:true` 的 data-tip，断言产出**含 `escapeHtml(RAW)`**（`&lt;script&gt;&quot;&#39;&amp;`）且**不含裸 `RAW`**、不含 `<script`；属性位（actionId／style）另断 `"` 已被转义。参考 `help.test.mjs:787-795` 的逐字段口径。 |
| **FX-78-V3-02** | M08 | `gauge` **弧几何零断言**：`endAngle` 由 `π(1-f)` 改为 `πf` 后全绿（pct=25 时弧从左侧 27.7 跳到右侧 142.3）。现有 `E.gauge.*` 只断 viewBox／label／value 文本／`data-pct`。 | 断言 `charts-gauge-fg` 的 `d` 逐值：pct=0 → `M{cx-r} {cy} A… {cx+r} {cy}`；pct=25/50/100 各一条精确 d（**不要只测 pct=50**，该点为两式同值的盲点）；另断 `charts-gauge-bg` 恒为整条半弧。 |
| **FX-78-V3-03** | M14 | `H.CHART_STRUCTURE_RULE` 里 `assert.ok(lineHtml().includes('vector-effect="non-scaling-stroke"'))`（charts.test.mjs:1099）**被数据点圆圈的同名属性满足**，折线路径自身去掉该属性仍绿。 | 改为断**折线 path 标签本身**：`const tag = tagsOf(lineHtml({showDots:false}),'path').find(t=>t.includes(P+'charts-line')); assert.ok(tag.includes('vector-effect="non-scaling-stroke"'))`；同理对 area／band／markline／regression 各自的 path/line 标签各一条。 |
| **FX-78-V3-04** | M18 | `B.area` 只用 `assert.ok(area.d.endsWith('Z'))`（:296）断言面积路径——**任何闭合路径都过**，基线 y 由 `frame.y1` 改成 `frame.y0`（面积翻到顶部）仍绿。 | 断精确 `d`（与 :271／:383 的直线/均线口径一致）：`assert.equal(area.d, 'M14.0 202.0L160.0 105.0L306.0 8.0 L306.0 202.0 L14.0 202.0 Z')`；并加一例 `yMin<0` 或 `connectNulls` 下的面积基线断言。 |
| **FX-78-V3-05** | M31 | `B.smooth` 只断 `includes(' C')`／`startsWith`／`endsWith`（:267-270）——**控制点完全不受约束**，Catmull-Rom 系数 6→5 仍绿。 | 断 `smooth` 路径精确 `d`（三点的曲线只有 2 段 C，可直接逐字断言）；再补 5 点一例，覆盖 `p0 ?? seg[i]`／`p3 ?? seg[i+1]` 两端夹取分支。 |
| **FX-78-V3-06** | M19 | `valueIndexes` 的「相邻中心距 < 26 单位跳过」阈值无断言：改 `26`→`0` 后全绿（40 点密集场景标签数 10 → 40）。 | 加密集用例：40 点、`width:320`、`labels:'none'`、`showValues:true`，断 `textsOf(html, P+'charts-value').length === 10` 并断首个/末个标签的 `x`；再补一例把阈值推到临界（相邻距 ≈26）验证边界。 |
| **FX-78-V3-07** | M32 | `svgOpen` 的 `role="img" focusable="false"` 无断言：删除后全绿（line/combo/scatter/bar/donut/sparkline/gauge 全部受影响）。 | 在 `H.移动端满宽` 或新增用例中逐 kind 断 `<svg>` 开标签含 `role="img" focusable="false"`（可复用现有 `aspectOf()` 同款取首标签写法）。 |
| **FX-78-V3-08** | M30 | 空态提示文案 `EMPTY_HINT`（`有记录后自动生成图表`）与图标 `EMPTY_ICON`（`📊`）**从未被断言**：`A.emptyText`／`H.CHART_STRUCTURE_RULE` 只断 CSS 类锚点 `empty-text`／`empty-icon`，改文案仍绿。 | 断 `countOf(html, '有记录后自动生成图表') === 1` 与 `html.includes('📊')`（或按「不新造第二份文案常量」口径断其等于实现常量，但需字面量对照）；同时补 `donut` 的 `无环形数据` 已有对照（:815）作为写法范例。 |

> 严重度：FX-01（注入安全）> FX-02/04/05（核心几何）> FX-03（描边防变形，契约 §3.5.1 明文）> FX-06/07 > FX-08（UI 文案）。

---

## 3. 弱断言清单（静态对抗，逐条给更严写法）

### 3.1 `test/charts.test.mjs`

| # | 位置 | 弱在哪 | 更严写法 |
| --- | --- | --- | --- |
| W1 | :296 `assert.ok(area.d.endsWith('Z'))` | 只断「闭合」；基线、起点、断段数全不约束（M18 存活） | 断精确 `d`（见 FX-04） |
| W2 | :267-270 smooth 路径 | `includes(' C')`＋首尾 `startsWith/endsWith`；控制点无约束（M31 存活） | 断精确 `d`（见 FX-05） |
| W3 | :1099 `lineHtml().includes('vector-effect=…')` | 被数据点 `<circle>` 满足，**被测元素（折线 path）未受约束**（M14 存活） | 在折线 path 标签上断言（见 FX-03） |
| W4 | 全文（无此行）| **零转义断言**：无 `&lt;`/`&amp;`/`escapeHtml`，无特殊字符输入（M17 存活） | 逐字段转义用例（见 FX-01） |
| W5 | :1095-1096 `includes(P+'empty-text')`／`empty-icon` | 只断 CSS 类名，文案/图标内容未约束（M30 存活） | 断 `EMPTY_HINT` 字面量与 `📊`（见 FX-08） |
| W6 | :1106 `js.includes('var STYLE_ID = "' + CHARTS_STYLE_ID + '";')` | **needle 由被断言常量自身拼成**（实现也读同一常量，同源自证）；:1179 有字面量对照组可覆盖，建议把 :1106 也改成字面量 `'var STYLE_ID = "ilife-charts";'` | 用字面量；或断 `CHARTS_STYLE_ID` 与产出 id 的**双向**关系（改 spec 值 → 产出随动，字面量断言同时红） |
| W7 | :1016／:1149 `css.includes('.' + P + 'charts-scatter .' + P + 'charts-dot{r:calc(var(--' + P + 'charts-dot) / 2)}')`、`'.' + P + 'charts-line .' + P + 'charts-svg{height:150px}'` | needle 内所有 `P` 都来自被断言模块同源常量 | 用字面量 `'.ilife-charts-scatter .ilife-charts-dot{r:calc(var(--ilife-charts-dot) / 2)}'` |
| W8 | :695 `groups.map(g=>g['data-gap']) === String(CHART_BREAKPOINTS.stackedGapPx)` | 同源常量自证（:1120 有 `data-gap="3"` 字面量对照组，可接受，但建议合并为一条字面量断言） | 保留 :1120 字面量，:695 改为断 `['3','3']` |
| W9 | :1204 `assert.equal(out.empty, out.points === 0)` | 实现自身两个字段的**自洽**（同时错则同过）；被 :396/:918/:1205 等钉死，属可接受但易误读 | 保留，另加 `empty === false ⇒ points > 0` 与 `points` 具体值的独立断言 |
| W10 | :1271 `assert.equal(SHARED_HELPERS_JS_RULE[flag], true)` | 冻结常量自证；已用 `probe(code)` 对冲（:1272），可接受 | 保留；建议对每个 flag 再加一条**负样本**（构造违反该 flag 的 JS 文本，断言 `probe` 为 false），防 probe 恒真 |
| W11 | :1064 `typeof charts[kind] === 'function'` | 单看恒真（任何函数都过）；靠 :1063 `Object.keys` deepEqual 兜底 | 保留，或改为断 `Object.getPrototypeOf(charts[kind])` 无关的具体行为（每 kind 一次最小调用） |
| W12 | :1199 `startsWith('<div class="' + P + 'charts ')`、:1171-1177 的负控全部以 `P` 拼接 | 命名空间全部同源；若 `STYLE_PREFIX` 漂移，本文件不会红（`help.test.mjs:293 CLS===HELP_SHELL_ID` 会红，属跨文件兜底） | 本文件补一条字面量：`assert.ok(lineHtml().includes('class="ilife-charts '))` |

### 3.2 `test/help.test.mjs`

| # | 位置 | 弱在哪 | 更严写法 |
| --- | --- | --- | --- |
| W13 | :316 `occurrences(out.html, ' checked>') === 1` | needle 过短，任何以 ` checked>` 结尾的属性都命中 | 断第一个 radio 标签精确形态：`/<input class="…-tab-input" type="radio" name="…" id="…-tab-0" checked>/`，并断其余 radio **不带** `checked` |
| W14 | :332 `assert.match(html, new RegExp('<p class="…-lead">' + N + ' 场景 · '))` | 只断前缀；lead 文案后半段（`点场景卡看指令全文,一键复制指令`）被截断也绿 | 断完整串（转义后逐字） |
| W15 | :710／:724 `assert.notEqual(error, null)` | 形式上「只断言不抛错的对偶」；后随 `name`/`code` 断言，属可接受 | 保留（已足够）；如要更严可改 `assert.throws(…, {name:'TemplateError', code:'asset-missing'})` |
| W16 | :790 `assert.notEqual(output, null, '合法数据不得抛错')` | 单看只断「不抛错」，但同一循环内 :792-793 逐字段断转义 → 可接受 | 保留 |
| W17 | 全文 | 未断言 `src/help.ts`／`src/charts.ts` 模块自身的 DOM 纯度（:828-830 只扫 `dist/help.js`；`charts.test.mjs` 不扫 dist/src）。该性质由 `contract-signatures.test.mjs:956-971` 兜底（dist/**/*.js 剥字面量与注释后禁 `document.`／`window.`／`navigator.`），**不判缺陷**，但建议在 #78 测试内自持一条 src 侧断言 | 加：读 `src/charts.ts`／`src/help.ts`，剥注释后断言模块代码行（排除 helpers JS 模板串）零 `document.`／`window.`／`globalThis.`／`node:`——V3 探针 `.scratch/t78/v3-probe.mjs` 已给出可直接复用的实现 |

**恒真断言**：未发现（无 `assert.ok(true)`、无「只断言非空」的裸断言；`.scratch` 中的 `assert.ok(out.points > 0)` 均另有具体值断言）。

---

## 4. 纯度对抗（独立探针，不依赖被测测试）

`.scratch/t78/v3-probe.mjs`（剥注释／剥 helpers 模板串后逐项扫描）：

```
SRC src/charts.ts   document./window./globalThis./node:/require(  → 模块代码 0（7 处 document. 全在 buildChartsHelpersJs 模板串内）
SRC src/help.ts     document./window./globalThis./node:/require(  → 0/0/0/0/0
DIST charts.js      DOM 行 5 处，全部 template=true（helpers JS 模板串）；node: 0
DIST help.js        document./window./globalThis./node:/require(  → 0/0/0/0/0
PRODUCE 8 kind ＋ helpers JS ＋ 空态 共 10 份产出：<canvas / <script / onclick= / onload= / node: / http:// / https:// 全 0
PRODUCE HELP 壳产出：<canvas / onclick= / onload= / node: / javascript: 全 0
PROBE-RESULT PURE
```

→ **纯度无违规**（与 `charts.test.mjs:1220-1241` 的 `H.纯度`、`help.test.mjs:257-267`、`contract-signatures.test.mjs:956-971` 结论一致）。

## 5. 还原与终态证据

- 32 处变异：每处 `restore_sha_ok=True`（还原后 `dist/charts.js`=`0CF425…`、`dist/help.js`=`E34DE5…`），每处还原后**全量复跑绿**（`RECHECK Mxx exit=0 reds=0`，`.scratch/t78/v3-out/Mxx-recheck.tap`）。
- 全部变异结束后终态复检：`dist/charts.js` mtime 2026-09-09 05:28:49.921 / `0CF425…`，`dist/help.js` mtime 2026-09-09 05:28:49.935 / `E34DE5…`（与基线逐字节相同）；`node --test "packages/base-render/test/*.test.mjs"` → **# tests 382 / # pass 382 / # fail 0**，exit 0。
- `git status --porcelain -- packages/base-render/dist` 为空（`packages/*/dist/` 本身在 `.gitignore:2` 内）；**V3 未执行任何 git 写命令**，未改 `src/**`、未跑 `tsc`。
- V3 写操作仅：报告 `.scratch/t78/verify-v3.md` ＋ `.scratch/t78/v3-{apply,check,run.ps1,probe,summary,survivor-demo,mutations.json}` ＋ `.scratch/t78/v3-backup/*` ＋ `.scratch/t78/v3-out/*`。

## 6. 结论与返修要求

- **裁决：不通过**（8 处存活变异）。
- 返修面：`FX-78-V3-01 … FX-78-V3-08`（第 2 节），全部为**补断言**（除 FX-01 需新增转义用例、FX-02/04/05 需精确几何断言外，无需改实现——8 处存活变异本身不构成实现缺陷，缺陷在**测试盲区**）。
- 复验口径：返修后须重跑本报告第 1 节全部 32 处变异（V3 的 M08/M14/M17/M18/M19/M30/M31/M32 必须转红），且新增断言不得引入恒真化。
- 正面结论：本套测试**不是恒真的**——24/32 处变异被判红，覆盖 8 个 kind 的缺省值／收敛／优先级／口径、helpers JS 的逐行结构与幂等、HELP 校验器四码与判定次序、壳渲染的 actionId／chip／CLI／容器分型。缺陷集中在**产出几何与转义**两类。
