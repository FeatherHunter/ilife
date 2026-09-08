# #78 A1 parity 预审（R2 · 只读差异清单）

> 取证员：只读取证子代理。仓库 `D:\ilife`（HEAD `aed1b7c`）。
> 对象：`packages/base-render/src/charts.ts`（1,715 行，A1 产出）＋ `packages/base-render/test/charts.test.mjs`（1,165 行）。
> 判据：`.scratch/t78/old-baseline.md` §2（8 接口逐条语义）／§2.9（抛错表）／§3（常量·断点·坐标）／§4（复合形态）／§8.2（偏离裁定）。
> 已裁定**不算缺陷**（`ARCHITECT-RULINGS.md`）：R19（combo 的 DOM 校准不复刻、旧双层坐标不复刻）、R20（`stackedGapPx` 同用于 grouped 与 stacked）、R21（旧死参数按新能力实现）、R24（`combo.y2` 不移植）、R26.1（`centerValue` 字面渲染）、R17（Q11 的 CLI／变体回补归 #106）。
> 唯一写操作：本文件。**未改任何源码／测试**，未执行 git 写命令。

---

## 0. 结论前置

**抽样 29 条：一致 17 条 / 不一致 12 条**（高 2 · 中 6 · 低 4），逐条见 §2 与 §3。
**无鉴别力断言 M = 7 条**（另有 6 条同源／弱断言已被同一 `it` 内其它断言补足，单列不计，见 §4）。
**新增「契约装不下旧能力」证据 3 条**（见 §5）。

**最严重的 3 条**

1. **非 stacked 柱族多算 6% padding（N1，高）**：`charts.ts:1093-1097` 让 bar 单柱与 grouped 走 `domainOf(...)`，而 `domainOf`（`charts.ts:368-372`）无条件加 6% padding；旧 bar 域无 padding（`charts.js:371-373`）。实测 `charts.bar({items:[{label:'A',value:1},{label:'B',value:2}],options:{width:320,height:170,labels:'none',showValues:false,grid:false}})` 产出 `y="85.0" height="68.8"` 与 `y="16.3" height="137.5"`——**柱底在 y=153.8，而绘图区底在 y=162（零基线离底 8.2 单位）；最高柱只到 137.5/154 = 89.3%**（旧版应为柱底贴底、最高柱 100%）。combo（`charts.ts:1347`）同因。现有用例只断言柱的 `x`／`fill`（`charts.test.mjs:683-692`），**不会红**。
2. **`dotSize` 被 CSS 覆盖而失效（N10，高）**：`chartsCss` 产出 `.ilife-chart-scatter .ilife-chart-dot{r:calc(var(--ilife-chart-dot) / 2)}`（`charts.ts:1647`）；CSS 几何属性 `r` 优先于 SVG 呈现属性。实测 `dotSize:20` 的产出属性为 `r="10"`，但生效半径恒为 `--ilife-chart-dot` 的一半（桌面 4.5px、手机 4px）。用例 `charts.test.mjs:900-901` 断言的是**属性值**，恒绿。
3. **`highlightLast` 的数值标签脱离 `showValues` 门控（N5，中）**：旧版有门控（`charts.js:619-621`），新版无条件追加（`charts.ts:888-890`）；且用例 `charts.test.mjs:361-368` 已把新行为钉死（`showValues:false` 下断言 `chart-value-last === ['100']`）——**修复会先撞红这条断言，需同步改断言**。

---

## 1. 判据口径

- **parity = 语义 parity**（R1.3）：类名 `hm-`→`ilife-`、坐标 `viewBox-only` 造成的字节差异不计。
- 「一致」＝旧语义的每条可观察效果在新实现成立；「不一致」＝旧可观察效果缺失或改变，且**不被任何裁定豁免**。
- 「用例是否红」＝把实现改回旧语义后，现有断言是否失败。**不红 = 该行为无鉴别力断言**（同时计入 §4 的 M 或 §3 的「无断言」备注）。

---

## 2. 逐条对照（29 条抽样）

### 2.1 一致的 17 条

| # | 旧语义（旧证据） | 实现落点 | 判定与证据 |
|---|---|---|---|
| P1 | `yTicks` 收敛 2-6；`false`／非数 → 0 条；刻度值 = 共享 Y 域（含 6% padding，尊重 yMin/yMax）均分；文字走 `format`，无 format 时数值收敛 2 位小数（`old-baseline.md:220`；`charts.js:497-507`） | `charts.ts:377-381`（`tickCount`）、`charts.ts:396-409`（`ticksSvg`）、`charts.ts:695,988` | **一致**。用例 `charts.test.mjs:301-310` 逐值钉死（`['-0.6','10.6']` 证明 6% padding；`yTicks:1→2 条`、`yTicks:9→6 条`、显式域 `['0','100']`）→ 改错会红 |
| P2 | `connectNulls` 跳过 null 直连；首尾 null 不向图外延伸；全 null 仍空路径；null 点不画点不标值（`old-baseline.md:220,785`；`charts.js:154-168`） | `charts.ts:513-531`（`polyPath`）、`charts.ts:534-566`（`smoothPath`）、`charts.ts:569-597`（`stepPath`） | **一致**（实现）。全 null：`polyPath` 的 `valid.length===0 → ''`（`charts.ts:516`），`smoothPath` 空段（`:551`）→ 无 path 元素。用例 `charts.test.mjs:312-334` 断言断段数、首尾不外延、点数 → 会红；但**全 null 只断言 `empty/points`，未断言 HTML 无 path**（见 M5） |
| P3 | `band` 与主序列等长否则抛错；hi/lo 并入共享域；任一侧 null 断开；`fill-opacity 0.15`；绘制在折线前（`old-baseline.md:220`；`charts.js:422-464`） | `charts.ts:670-681`（等长校验）、`charts.ts:683-693`（共享域）、`charts.ts:765-784`（绘制） | **一致**。用例 `charts.test.mjs:429-444` 断言 `fill-opacity`、`['-6','106']`（并入域）、`M` 计数、抛错 → 会红 |
| P4 | `fillBetween.a/b` 必须数字／越界／相同／两系列长度不一致 → 4 类抛错；null 断开且**不随 connectNulls 跨空**；色缺省主色、透明度 = areaOpacity（`old-baseline.md:220`；`charts.js:467-491`） | `charts.ts:609-628`（`betweenPath`，无 connect 参数）、`charts.ts:745-763` | **一致**。用例 `charts.test.mjs:446-475` 四类违规 + `M` 计数 + 绘制顺序 → 会红 |
| P5 | `markPoint`：`true` = 主序列最大值点；`{index}` 越界忽略不报错；`{value}` 首个匹配；label 缺省走 format；色缺省序列色；贴边 18%/82% 锚定（`old-baseline.md:220`；`charts.js:628-651`） | `charts.ts:938-975` | **一致**。用例 `charts.test.mjs:414-427` 断言 cx／文本／越界空数组／白边／色覆盖 → 会红 |
| P6 | `ownScale` 序列不参与共享域（yTicks／网格／markLine 仍按非 ownScale 域）；自身 min-max+6%；legend 追加「各指标独立刻度」（`old-baseline.md:220`；`charts.js:419-434,611`） | `charts.ts:684-693`（跳过 ownScale）、`charts.ts:702-707`、`charts.ts:871` | **一致**。用例 `charts.test.mjs:526-564` 断言 cy 值 + 污染场景刻度 `['-0.6','10.6']` → 会红 |
| P7 | `stacked` 与 `grouped` 互斥，同传时 **stacked 优先**（`old-baseline.md:747`；`charts.js:269,363`） | `charts.ts:1042-1044`（`grouped = !stacked && ...`） | **一致**。用例 `charts.test.mjs:667-674` 断言两者产出字节相等 + 无 `chart-group` → 会红 |
| P8 | `stackMode:'percent'`（缺省）柱内合计 100%，**不参与 yMin/yMax**；`absolute` 相对全局最大合计（`old-baseline.md:747`；`charts.js:270,259`） | `charts.ts:1047`、`charts.ts:1080-1087`、`charts.ts:1119-1136` | **一致**（段高）。用例 `charts.test.mjs:643-649` 用 `yMin:0,yMax:1000` 断言 percent 段 y 不变 → 会红。（**合计标签另见 N2**） |
| P9 | 多值模式 `values` 必须为非空数组、元素必须数字、各 item 长度一致 → 3 类抛错（`old-baseline.md:747`；`charts.js:249-253`） | `charts.ts:169-174`（`normalizeItems` values 模式）、`charts.ts:1050-1059` | **一致**。用例 `charts.test.mjs:621-628` 四种违规 + 段数 → 会红 |
| P10 | donut 合计为 0 → 空态，hint「合计为零, 无环形数据」（`old-baseline.md:311`；`charts.js:695`） | `charts.ts:1206-1207`（`total <= 0`）、`charts.ts:141` | **一致**。用例 `charts.test.mjs:741-748` 断言 `empty/points/data-chart-empty/无环形数据` → 会红 |
| P11 | `pct` 非数抛错、超界收敛 0~100；pct 型接口无空态（`old-baseline.md:357,506`；`charts.js:342-343,823-824`） | `charts.ts:199-203`（`normalizePct`）、`charts.ts:1314`（progress）、`charts.ts:1489`（gauge） | **一致**。`points` 恒 1、`empty:false`（含 `pct=0`）符合 `base-paint-contract.md:796`。用例 `charts.test.mjs:779-807` 断言三码／收敛／`data-pct`／points → 会红 |
| P12 | scatter 回归线：`n>=2` 且 `regression!==false`；缺省色 `#ff3b30`；虚线 `5 4`；`denom=0` 退化为水平线（`old-baseline.md:542`；`charts.js:872-882`） | `charts.ts:1542-1568`、`charts.ts:130` | **一致**。用例 `charts.test.mjs:881-897` 断言 y1/y2／dasharray／缺省色／单点不画 → 会红（但见 M4：y1/y2 无法鉴别域 padding） |
| P13 | sparkline 涨绿跌红：`last>=first` → `var(--ok,#34c759)` 否则 `#ff3b30`；末值文本；无坐标轴（`old-baseline.md:468`；`charts.js:813-816`） | `charts.ts:1430-1431`、`charts.ts:1434-1439` | **一致**。用例 `charts.test.mjs:863-872` 断言两色 + `chart-up/down` + 开关 → 会红 |
| P14 | gauge 180° 弧 + `pct` 比例；`format` 有值 → 格式化纯数字（无 %），否则 `N%`；`label` 在弧下（`old-baseline.md:506`；`charts.js:826-834`） | `charts.ts:1465-1473`、`charts.ts:1475-1488` | **一致（语义）**。弧从左侧 0% 单调到右侧 100%（`:1466-1468`），旧版 `large=pct>50?1:0` 属旧缺陷、不复刻（记账见 §6-A3）。用例 `charts.test.mjs:769-777` 断言 viewBox／label／值文本 → 会红 |
| P15 | combo `bars`/`lines` 同长同 label；旧只校验长度（`old-baseline.md:383`；`charts.js:733-735`），契约 `contract:233` 要求「同长同 label」 | `charts.ts:1323-1335` | **一致（更严）**。新增 label 不一致抛错属契约要求。用例 `charts.test.mjs:815-837` 两条抛错 + points + 空态 → 会红 |
| P16 | 8 接口空数组 → `emptyState` 联动，不抛错；donut 合计 0 同走空态（`old-baseline.md:581`；`charts.js:25-28,357,692,736,804,852`） | `charts.ts:290-302`（`emptyOutput`）＋ 各 `render*` 首行早退（`:666,1046,1205,1325,1417,1517`） | **一致**。`emptyText` 覆盖与冻结默认文案均生效。用例 `charts.test.mjs:185-194,917-922,1005-1035` → 会红 |
| P17 | 18 条抛错文案（`old-baseline.md:590-615` 表）→ 新三码映射：结构类 → `structure-invalid`；`pct` 类 → `pct-invalid`；`kind-unknown` 无旧对应物（R15 给可达路径） | `charts.ts:78-88`（`badStructure`/`badPct`/`badKind`）、各校验点 | **一致（码映射）**。文案差异（丢 `JSON.stringify(it)` 后缀、`undefined`→`null`）不影响码判定。用例 `charts.test.mjs:950-955` 三码皆可达 → 会红 |

### 2.2 不一致的 12 条

见 §3（同编号 N1-N12）。

---

## 3. 不一致清单（N = 12）

> 严重度：高 = 明显视觉／功能错误或选项失效；中 = 可观察行为偏离旧语义；低 = 数值／文案级。

### N1【高】非 stacked 柱族多算 6% padding：零基线离底、最高柱不满高

- **旧语义**：bar 单柱的域 = `min(值, 0) .. max(值)`，**无 padding**（`charts.js:371-373`；`old-baseline.md:166` 表「yMin/yMax」行）→ 柱底贴绘图区底、最高柱 100%。
- **实现**：`charts.ts:1093-1097`（单柱）与 `charts.ts:1088-1092`（grouped）都调 `domainOf(values, yMin, yMax, true)`；`domainOf` 在 `charts.ts:368-372` 无条件 `pad = (hi-lo)*0.06`。combo 同因（`charts.ts:1344-1347`）。
- **实测**（`dist/charts.js` 直跑）：`bar([1,2])` → 柱 A `y="85.0" height="68.8"`、柱 B `y="16.3" height="137.5"`；绘图区 `y0=8, y1=162`（`h=154`）→ 柱底 153.8 ≠ 162；柱 B = 89.3% 高。
- **应改成**：给 `domainOf` 增加 padding 参数（line／scatter 保留 6%，bar／combo 传 0），或新增 bar 专用域函数，与 `charts.js:371-373` 对齐。
- **用例**：`charts.test.mjs:683-692` 只断言柱数／颜色／x；`C.stacked` 的 y 断言走 `unit` 路径（不经 `domainOf`）→ **不会红**。

### N2【中】`stackMode:'absolute'` 的柱顶合计标签与段高不同尺度

- **旧语义**：合计标签贴柱顶（旧为 HTML 覆盖层置于柱列之上，`charts.js:277`；`old-baseline.md:747`）。
- **实现**：段高用 `unit = frame.h / maxTotal`（`charts.ts:1122-1124`），合计标签却用 `yAt(frame, total, lo, hi)`（`charts.ts:1169`），而 `lo/hi` 来自 `domainOf(totals, yMin, yMax, true)`（`charts.ts:1084-1087`，含 6% padding）→ 标签落在柱顶下方约 5%（`yMin/yMax` 显式传入时偏离更大）。
- **应改成**：absolute 分支的标签 y 用 `frame.y1 - total*unit`（与段高同尺度）；percent 分支已是 `frame.y0`（`charts.ts:1169`）✓。
- **用例**：`charts.test.mjs:646-648` 只断言段 y，未断言 `chart-value-total` 的 y → **不会红**。

### N3【低】`fmtValue` 缺省把数值收敛到 2 位小数

- **旧语义**：无 `format` 时 `String(v)` 原样（`charts.js:19-23`；`old-baseline.md:87-96` 引文）。
- **实现**：`charts.ts:117-120` `String(round2(value))` → `3.333` 变 `3.33`，影响 bar 值标签、donut 图例值、line 值标签、tooltip 文本。
- **应改成**：无 format 时 `String(value)`；若要保留 2 位口径，需在票面记账（并改注释「旧 `_fmt`」的说法）。
- **用例**：`charts.test.mjs:177`（`['0','50','100']`）与 D 段全用整数 → **不会红**。

### N4【低】donut 图例百分比由整数变 2 位小数

- **旧语义**：`Math.round(value/total*100)` 整数（`charts.js:712`）。
- **实现**：`charts.ts:1262-1263` `round2((value/total)*100)` → 1/3 变 `33.33%`（旧 `33%`）。
- **应改成**：`Math.round(...)`，或记账为新口径。
- **用例**：`charts.test.mjs:719-725` 全为整数比例 → **不会红**。

### N5【中】`highlightLast` 的数值标签脱离 `showValues`／`labels:'select'` 门控

- **旧语义**：仅当 `showValues` 为真或 `labels==='select'` 时才追加末值文本（`charts.js:619-621`）。
- **实现**：`charts.ts:888-890` 无条件追加 `chart-value-last`。
- **应改成**：补回门控 `if (line.showValues !== false || line.labels === 'select')`。
- **用例**：`charts.test.mjs:361-368` 在 `showValues:false` 下断言 `chart-value-last === ['100']` → **当前不会红，但修复后会红**：该断言把偏离钉死了，必须同步改为 `[]`。

### N6【中】`avgLine` 在「恰好 1 条 series」时也叠加均线

- **旧语义**：仅当 `series` 缺省时才叠加均线（`charts.js:414` `if(opt.avgLine&&!opt.series)`；`old-baseline.md:220` 表 `avgLine` 行）。
- **实现**：`charts.ts:720-723` 的条件是 `series.length !== 1` → 传 `series:[{...}]` 时（长度 1）仍会 push 均线序列，导致多一条线／图例／`points` 变化。
- **应改成**：以「用户是否传了 `series`」为判据（如 `line.series === undefined`），与旧一致。
- **用例**：`charts.test.mjs:371-383` 只用「不传 series」路径 → **不会红**。

### N7【中】bar 的 `labels:'select'` 变成「首＋峰值＋尾」

- **旧语义**：bar 的 `select` 只显示首尾（`charts.js:385-388`；`old-baseline.md:166` 表 `labels` 行）。
- **实现**：`charts.ts:1193` 复用 `xLabelsSvg` → `labelIndexes('select', …)`（`charts.ts:417-425`）＝ 首＋峰值＋尾（line 语义）。
- **应改成**：bar 单独走「首尾」索引（或给 `labelIndexes` 加 bar 口径）。
- **用例**：`charts.test.mjs:204-214` 只测 line → **不会红**。

### N8【低】progress 渐变终止色与旧版不同

- **旧语义**：`linear-gradient(90deg, color, #4db2ff)`（`charts.js:344`）。
- **实现**：`charts.ts:1297` 用 `CHART_PALETTE[5]`＝`#5ac8fa`。
- **应改成**：改回 `#4db2ff`，或记账为有意换色。
- **用例**：`charts.test.mjs:757` 用同一常量拼断言 → **不会红**（且断言本身同源，见 M7 类）。

### N9【中】移动端折线固定 150px 高 + `preserveAspectRatio="xMidYMid meet"` → 折线在手机端左右留白

- **旧语义**：≤720px 折线高度 150（`charts.js:128`；`old-baseline.md:633`），且旧 SVG 用 `preserveAspectRatio="none"` 拉伸满宽（`charts.js:661`）。
- **实现**：`chartsCss` 产出 `.ilife-chart-line .ilife-chart-svg{height:150px}`（`charts.ts:1658-1660`），而 `svgOpen` 用 `xMidYMid meet`（`charts.ts:287`）＋ `.chart-svg{width:100%;height:auto}`（`charts.ts:1637`）。宽 375px、高 150px 的盒子（宽高比 2.5）对上 320×210 的 viewBox（1.52）→ `meet` 等比缩到 228.6×150 并水平居中，**左右各留 ~73px 空白**。
- **应改成**：line／combo／scatter 用 `preserveAspectRatio="none"`（旧口径，描边已有 `vector-effect="non-scaling-stroke"` 防变形），或去掉移动端固定高度、改为在移动端缩 viewBox 高。
- **用例**：`charts.test.mjs:904-905` 只断言 CSS 文本含 `height:150px` → **不会红**。

### N10【高】`.chart-scatter .chart-dot{r:…}` 覆盖 `dotSize`，`dotSize` 实际失效

- **旧语义**：scatter `dotSize` 缺省 9px，显式值即渲染直径（`charts.js:864-865`；`old-baseline.md:542`）。
- **实现**：`charts.ts:1535-1537` 写呈现属性 `r=dotSize/2`，但 `chartsCss` 同时产出 `charts.ts:1647` 的 CSS 规则 `r:calc(var(--ilife-chart-dot) / 2)`；**CSS 几何属性优先于 SVG 呈现属性** → 生效半径恒为 `--ilife-chart-dot` 的一半（桌面 4.5px、手机 4px）。实测 `dotSize:20` 产出 `r="10"`，但页面实际按 4.5px 渲染。
- **应改成**：显式 `dotSize` 时改用内联 `style="r:…"`（内联样式优先于类规则），或让 CSS 规则只作用于「未显式指定尺寸」的点（加标记类）。
- **用例**：`charts.test.mjs:900-901` 断言 `r` 属性（`'10'`）而非有效样式 → **不会红**（断言无鉴别力）。

### N11【中】`height`／`size` 由「渲染 px」变「viewBox 单位」，progress 违背旧契约明文「轨道 px」

- **旧语义**：`progress.height` = 轨道高度 px（旧契约 §6.5 `contract:232` 明写；`charts.js:345-347`）；donut `size` = 渲染直径 px（`charts.js:716`）；sparkline 固定 `width×height`（`charts.js:816`）。
- **实现**：三者的尺寸都只进 viewBox（`charts.ts:1304`、`charts.ts:1269`、`charts.ts:286`），渲染尺寸由 `.chart-svg{width:100%;height:auto}`（`charts.ts:1637`）决定 → progress 缺省 `height:8` 在 320px 宽容器渲染约 25.6px 高；donut／sparkline 拉满容器宽（实测 sparkline viewBox `0 0 90.0 30.0` 但 CSS 宽 100%）。
- **应改成**：至少给 progress 补 `style="height:{height}px"`（还原「轨道 px」）；donut／sparkline 若要保留旧渲染尺寸，补 `.chart-donut`／`.chart-spark` 的固定尺寸规则，或明确记账「尺寸语义改为 viewBox 单位」。
- **用例**：`charts.test.mjs:133`（`progress` viewBox `0 0 100.0 8.0`）、`705-706`（donut viewBox）只断言 viewBox → **不会红**。

### N12【低】SVG 文本无 `font-size` 规则，字号随页面继承

- **旧语义**：刻度 9.5px、X 标签 10px、值标签 10–10.5px、峰谷标注 10.5px（`charts.js:87,90,92,79,55`；`old-baseline.md:931-951` 区块表）。
- **实现**：`chartsCss` 只给了 `.chart-legend`（12px）、`.chart-pct`（12px）、`.chart-spark-value`（11px）三处字号（`charts.ts:1648,1656,1657`）；`chart-tick`／`chart-xlabel`／`chart-value`／`chart-marktext`／`chart-mptext`／`chart-gauge-value`／`chart-center-*` **均无规则** → 取页面继承字号（通常 14–16 用户单位），比旧版大 30%–60%。
- **应改成**：在 `chartsCss` 补各文本类字号（单一 CSS 产出者，改动面小）。
- **用例**：无任何字号断言 → **不会红**。

---

## 4. 无鉴别力断言（M = 7）

> 口径：断言在**当前实现**下无法因 `src/charts.ts` 的实现改动而红（恒真／同源自证／仅非空），且**未被同一 `it` 内其它断言补足**。

| # | 位置 | 断言 | 为什么无鉴别力 |
|---|---|---|---|
| M1 | `charts.test.mjs:1062` | `assert.ok(js.length > 0)` | 只断言非空；空串会先在 `:1069`（`countOf(code,'(function ()')===1`）与 `:1070` 变红，本条永不单独生效 |
| M2 | `charts.test.mjs:1020` | `assert.ok(out.html.length > 0)` | 只断言非空；`:1018` 已断言键集、`:1021` 已断言 `empty ⇔ points===0` |
| M3 | `charts.test.mjs:1071-1073` | 循环断言 `SHARED_HELPERS_JS_RULE[flag] === true` | 断言的是 `spec` 冻结常量自身值，与 `charts.ts` 实现无关；改实现不会红 |
| M4 | `charts.test.mjs:884-885` | `line.y1 === '172.0'` / `line.y2 === '8.0'` | 测试数据 `LINE_PTS` 是恒等函数 `y=x`，回归线端点 `yOf(域下界)=域下界`、`yOf(域上界)=域上界` → **加不加 6% padding 都得 172/8**，无法鉴别 scatter 的域 padding（删掉 `charts.ts:368-372` 的 padding 仍绿） |
| M5 | `charts.test.mjs:331-333` | 全 null 折线只断言 `empty===true`／`points===0` | 未断言 HTML 里**没有** `chart-line` 路径；实现若给全 null 数据画一条路径（或 NaN 坐标），本条仍绿 |
| M6 | `charts.test.mjs:942` | `CHART_ERROR_CODES.includes('kind-unknown')` | 常量自证；`:951` 已逐值钉死，本条不引入新鉴别力 |
| M7 | `charts.test.mjs:904-905` | `css.includes('@media (max-width:' + CHART_BREAKPOINTS.mobileMaxPx + 'px)')`、`css.includes('height:' + CHART_BREAKPOINTS.lineHeightMobilePx + 'px')` | needle 用被断言的同一常量拼成（同源自证）：把常量改成 999，CSS 与 needle 同步变 999，断言仍绿。**注意 `:903` 与 `:981-983` 用的是字面量**（`8px`／`720px`／`150px`），有鉴别力 |

**已被同一 `it` 内其它断言补足、故不计入 M 的 6 条**（列出以免误判）：

| 位置 | 断言 | 补足者 |
|---|---|---|
| `charts.test.mjs:148` | `notEqual(lineHtml(), lineHtml({compact:true}))` | `:146-147` 断言 `cx` 由 14.0 → 6.0 |
| `charts.test.mjs:655` | `data-gap` 等于 `CHART_BREAKPOINTS.stackedGapPx` | `:979` 字面钉死四值 |
| `charts.test.mjs:661-662` | 子柱间距等于冻结常量 | 同上（`:657-658` 另钉死 x／width） |
| `charts.test.mjs:757` | `stop-color` 等于 `CHART_PALETTE[5]` | `:992-994` 字面钉死 10 色 |
| `charts.test.mjs:968` | `countOf(lineHtml(),'padding:') === 0` | `:966` 直接断言 CSS 文本含 `padding:0` |
| `charts.test.mjs:1016` | `outputs.map(o=>o.kind)` 等于 `[...CHART_KINDS]` | `:936` 字面钉死 8 成员与顺序 |

**已知返修项（不重复计入）**：`charts.test.mjs:1100` 起的「H.覆盖清单（机读）」`it`（含 `:1146` 的 `titles.length >= 60` 与 `:1155-1160` 的自证式计数断言）已由 **FX-78-A1-1** 受理，本报告不重复。

---

## 5. 契约装不下旧能力（新增证据 3 条）

| # | 旧能力（旧证据） | 冻结面现状 | 结论 |
|---|---|---|---|
| G1 | **scatter 缺省 4 条 Y 轴刻度**（`charts.js:854` `yTicks:4`；`:884-893` 渲染刻度线与文字；旧契约 §6.5 `contract:216` 明写「复用 line 的 yTicks 机制……scatter 缺省 4 条」） | `ScatterChartOptions`（`spec/charts.ts:147-151`）只继承 `ChartCommonOptions`，**无 `yTicks` 字段**；实现因此完全不画刻度（`charts.ts:1512-1593` 无 `ticksSvg` 调用） | **旧能力无处安放**。需契约补遗给 `ScatterChartOptions` 加 `yTicks?: number \| false`（超冻结面，须走补遗流程），或显式登记「不移植」 |
| G2 | **`format` 支持字符串模板**：`'¥{v}'`／`'{v}件'`／`'{pct}%'`（`charts.js:19-23`） | `ChartCommonOptions.format?: (value: number) => string`（`spec/charts.ts:73`）**仅函数**；`charts.ts:247` 也只认函数 | 旧调用形态无处安放（传字符串会被静默忽略并回落到 `round2`）。需记账或补 `format?: ((v:number)=>string) \| string` |
| G3 | **`singleColor` 是颜色字符串**（缺省 `'var(--blue,#007aff)'`，`charts.js:358`） | `BarChartOptions.singleColor?: boolean`（`spec/charts.ts:111`）；`charts.ts:1027` 只当布尔用 | 旧调用 `singleColor:'#f00'` 静默失效（回落 `colors[0]` 或 `CHART_PALETTE[0]`）。类型已冻结，需记账 |

补充（非新缺口，已有裁定）：`combo.y2` 不移植（R24）；`centerValue` 字面渲染（R26.1）；`SceneInitBanner`／`SceneRecommendation`／`SceneContact` 取新类型（R23）；Q11 的 CLI／变体回补归 #106（R17）。

---

## 6. 记账型偏离（不建议回退，但须写入票面）

| # | 偏离 | 旧证据 | 新落点 | 判定 |
|---|---|---|---|---|
| A1 | `area` 在 `smooth`／`step` 下跟随曲线／阶梯（旧版恒直线段） | `charts.js:169,546-549`（`_areaPath` 只调 `_linePath`） | `charts.ts:599-607` | 修正型；旧版面积与线不贴合 |
| A2 | gauge 弧几何改为按 `size` 计算（`r=min(size/2-4, height-8)`、`cy=height-4`），旧为常量 `r=70,cy=92`；旧 `large=pct>50?1:0` 未复刻 | `charts.js:826-833`；`old-baseline.md:722` | `charts.ts:1459-1468` | 修正型；新弧 0→100% 单调，旧版大弧标志在 pct>50 时异常 |
| A3 | 单点折线 x 居中（旧版落在左边缘 `_P`） | `charts.js:147`（`Math.max(1,n-1)`） | `charts.ts:342-344` | 修正型；旧 sparkline 单点还会出 NaN（`charts.js:810`） |
| A4 | `labels:'select'` 全负数据时峰值取「最大（最不负）」点（旧版取索引 0） | `charts.js:655`（`mm=0` 初值） | `charts.ts:417-425` | 修正型 |
| A5 | donut 负值 clamp 到 0（旧版按原值求和／成弧） | `charts.js:694,703` | `charts.ts:1206,1220` | 修正型 |
| A6 | combo 未复刻柱高 80% 上限（旧为给柱顶标签留位） | `charts.js:752-753` | `charts.ts:1361-1362`（改由 `insetsFor` 的 top inset 留位） | 可接受；语义等价 |
| A7 | `series[].name` 缺失由「容忍」变「抛 `structure-invalid`」 | `charts.js:409` | `charts.ts:499` | 与冻结类型 `name: string` 一致 |
| A8 | 坐标/样式按 R19 改 viewBox-only；`stackedGapPx` 按 R20 同用于 grouped 与 stacked | `charts.js:560,870,60` | `charts.ts:1637,1048,1128,1139` | **裁定豁免**，不计缺陷 |

---

## 7. 抽样方法与自查

- **读法**：`read` 工具全量读取 `charts.ts`（4 段）与 `charts.test.mjs`（3 段）；旧语义全部回溯到 `.scratch/t78/old-baseline.md` 与其中的 `charts.js:行号`。
- **运行证据**：侧栏终端直跑 `packages/base-render/dist/charts.js`（只读执行，未写文件），取 bar／progress／sparkline／scatter 的真实产出，用于坐实 N1、N10、N11。
- **行号口径**：与 `read` 工具一致（`charts.ts` 1,715 行、`charts.test.mjs` 1,165 行）。注意 `Get-Content .Count` 在本仓少计（`charts.ts` 报 1,689），本报告不采用。
- **写操作**：仅本文件；未改 `src/`／`test/`，未跑 git 写命令。
- **未覆盖（本轮范围外）**：`help.ts` 的 HELP 壳 parity（A2 交付物，不在本次对象内）；`a1-evidence.md` 的变异自证清单未复核（属 R9.2 验收面）。
