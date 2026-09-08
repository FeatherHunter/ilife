# V2a · 图表行为 parity 独立验收报告（对抗式 · 施工者与编排者自评不作判据）

- 票：GitHub `#78`《base- 图表层与 HELP 壳》  ·  仓库 `FeatherHunter/ilife`  ·  分支 `master`  ·  基线 HEAD `f3b6b7a`
- 验收员：独立验收员 V2a（不继承施工者上下文；未读 `a1-evidence.md` 作为判据，仅在报告末尾做交叉引用）
- 判据权威：`docs/research/t92-old-v130-signatures.md:153-194`；`.scratch/t78/old-baseline.md` §2；`.scratch/t78/OPTION-MATRIX.md`（84 字段）；`.scratch/t78/ARCHITECT-RULINGS.md` R1–R35
- 命令环境：侧栏终端 `Windows PowerShell 5.1`（`terminal_create/send/read/close`）；只读探针以 `node` 脚本执行（脚本落 `%TEMP%`，**不落仓内**）

---

## 0. 结论前置

# 裁决：不通过

**parity 面 100% 通过；唯一命中的红线是「断言鉴别力不足」（`ACCEPTANCE.md` V2 不通过判据第 3 条）。**

| 验收面 | 结果 | 证据 |
|---|---|---|
| A–H 84 字段「生效且符合旧语义」 | **84/84 通过** | §3 逐字段证据表 |
| 重点抽样（自选 21 条最易糊弄项） | **21/21 通过** | §4 |
| 随机抽样攻击（seed=780780，抽 15 字段，自构输入） | **15/15 = 100%** | §5 |
| 确定性（同输入两次 `deepEqual`、同页 id 不撞） | 通过 | §7.1 |
| 纯度（无 canvas／内联 script／onclick=／node:；模块自身零 DOM 全局；无第二份常量表） | 通过（1 条低危记账） | §7.2 |
| 类名命名空间 `ilife-charts*`（R1-A3） | 通过 | §7.3 |
| `buildChartsHelpersJs` 契约 | 通过 | §7.4 |
| 仓内测试 `node --test test/charts.test.mjs` | 82 pass / 0 fail | §6 |
| **断言鉴别力（静态）** | **不通过 —— 5 条 FX** | §8 |

**缺陷清单（5 条，全部是「测试鉴别力」，不含实现缺陷）：**

1. **FX-78-V2a-1**｜`test/charts.test.mjs` 全篇以 `P = STYLE_PREFIX` 拼装 needle（含 §8 列举的 17 处），`STYLE_PREFIX` 自身值无任何断言 → 把 `STYLE_PREFIX` 改成 `'x-'` 全 82 条仍绿。
2. **FX-78-V2a-2**｜`:833` 渐变 id 只做宽松 `startsWith(P+'charts-grad-')`，id 形态与哈希值未钉死 → 改 `hash32` 实现（换散列/截断）仍绿。
3. **FX-78-V2a-3**｜`:1400` 是「测试自身常量表非空」的自证断言（恒真于实现）；`:1387`/`:1402` 为宽松阈值 `>=60`/`>=30` → 删掉多条用例仍可能绿。
4. **FX-78-V2a-4**｜五处**字段子语义无断言**（可存活变异已逐条指出）：`showValues:true` 的 26 单位避让（`charts.ts:490`）、`smooth` 控制点系数（`charts.ts:596-599`）、sparkline `last >= first` 相等边界（`charts.ts:1483`）、`yTicks` 非整数 `Math.round` 口径（`charts.ts:416`）、combo 只传 `bars`／只传 `lines` 的非空路径（`charts.ts:1388`）。
5. **FX-78-V2a-5**｜两处分支无断言：`band` 跟随 ownScale 主序列域（`charts.ts:807`）、`series[].name === ''` 被图例排除（`charts.ts:850`）。

> 说明：本裁决**不**指控任何字段「无效果」或「语义不符」——84 个字段逐条实测全部符合旧语义（含 R19/R20/R21/R24/R25/R26/R33 的偏离裁定）。返修只需补断言，**不需要改 `src/charts.ts`**。

---

## 1. 被审版本（mtime ＋ SHA256）

### 1.1 审查期间发生变动的记录（派单已预警 A1b 可能仍在收尾）

| 时点 | `src/charts.ts` | `test/charts.test.mjs` |
|---|---|---|
| 开工首测（约 05:28:2x） | 88203 B / `345DCD7FCE502D180D96BEBCE7D2742D1C2957494B75A04B00B67D77A135328B` | 84676 B / `0BE843E295DC242397E8F715DC6EFE7C7F6C221C39D87D9A41060D9440EE77AF` |
| **最终版（05:28:43 后）** | **88208 B / `B457B913DA5B9504EDB7177EA4F3B307DE4BD5FB7AEE327D438427254F857ADE`** | 84676 B / `0BE843E295DC242397E8F715DC6EFE7C7F6C221C39D87D9A41060D9440EE77AF` |

- 变动内容：**+5 字节 = 根类改名 `'chart'` → `'charts'`（5 处）**，即 FX-78-A1b-13 的收尾（`charts.ts:284`、`:1696`、`:1697`、`:1699`、`:1735`）。其余 1792 行未动。
- 本报告**全部结论以最终版 `B457B913…` 复核**（逐字段行号已按最终版核对；§3 的实现行号即最终版行号）。
- 连续 6×10s 轮询 + 末次复核（`05:29:47` / `05:33:xx`）两次哈希一致，审查期后半段未再变动。
- 被测产物 `packages/base-render/dist/charts.js`：87394 B / `0CF425B9AD89CFB8095DC7E435AC843AFE8D9CED04BF08741518057222F13491`（mtime `05:28:49`，晚于 src `05:28:43` → dist 与 src 同源）。
- 测试文件行数：`Get-Content` 计 1393 行，按换行符（LF 计数）为 1407 行（读取口径差异，非内容差异）。

### 1.2 被审文件清单

| 文件 | 字节 | mtime | SHA256 |
|---|---|---|---|
| `packages/base-render/src/charts.ts` | 88208 | 2026-09-09 05:28:43 | `B457B913DA5B9504EDB7177EA4F3B307DE4BD5FB7AEE327D438427254F857ADE` |
| `packages/base-render/test/charts.test.mjs` | 84676 | 2026-09-09 05:27:05 | `0BE843E295DC242397E8F715DC6EFE7C7F6C221C39D87D9A41060D9440EE77AF` |
| `packages/base-render/dist/charts.js`（被测产物） | 87394 | 2026-09-09 05:28:49 | `0CF425B9AD89CFB8095DC7E435AC843AFE8D9CED04BF08741518057222F13491` |

> **重要口径**：`test/charts.test.mjs:15-29` 从 `../dist/index.js`／`../dist/charts.js` 导入——**测试打的是 dist，不是 src**。故本报告的「实测」均通过 dist（与仓内测试同源），行号证据则指向 src。

---

## 2. 复核基线与命令

```powershell
# 版本
Get-Item packages\base-render\src\charts.ts, packages\base-render\test\charts.test.mjs | Select Length,LastWriteTime
Get-FileHash packages\base-render\src\charts.ts, packages\base-render\test\charts.test.mjs -Algorithm SHA256
# 仓内测试（最终版）
node --test packages/base-render/test/charts.test.mjs          # -> tests 82 / pass 82 / fail 0
# 只读探针（自构输入，不落仓）
node "%TEMP%\v2a-probe.cjs"      # 重点抽样 + 通用选项：pass=50 fail=0（2 条为探针自身期望笔误，已复核修正，见 §4）
node "%TEMP%\v2a-random2.cjs"    # 随机抽样 15 字段：pass=15 fail=0
node "%TEMP%\v2a-gaps.cjs"       # 覆盖缺口取证（26 单位避让 / sparkline 相等 / combo 对齐 / yTicks 分数）
```

未执行（受只读约束）：`tsc -b`、任何 `git` 写命令、任何 `dist` 改动、任何变异测试（变异归 V3）。**本报告的「鉴别力不足」结论全部是静态推导 + 只读实测，不依赖变异运行。**

---

## 3. 逐字段证据表（`OPTION-MATRIX.md` A–H，84 字段）

图例：`实现` = `src/charts.ts` 行号（最终版）；`断言` = `test/charts.test.mjs` 行号；`判定` = 生效且符合旧语义（含裁定偏离）。

### A. 通用选项 `ChartCommonOptions`（16）

| # | 字段 | 实现 | 断言 | 实测/判定 |
|---|---|---|---|---|
| A1 | `height` | `resolveCommon:264`／`svgOpen:313` | `:115-141`（8 kind 缺省尺寸逐值） | ✅ `0 0 320.0 240.0` |
| A2 | `width` | `resolveCommon:263`／`svgOpen:313` | `:116`、`:115-141` | ✅ 8 接口 viewBox 同步（donut/gauge 走 `size`，`:1318`／`:1529`） |
| A3 | `compact` | `insetsFor:359-360`、`:468` | `:143-149`（首点 cx 14.0→6.0 + 串不同） | ✅ |
| A4 | `color` | `resolveCommon:267`→`line:835`/`barColorFor:1067`/`donut:1272`/`sparkline:1484`/`gauge:1517`/`scatter:1585` | `:151-157` | ✅ |
| A5 | `colors` | `resolveCommon:268-270`；`barColorFor:1070`、`segColorFor:1076`、`donut:1273,1306` | `:159-170` | ✅ 逐点/逐段取色顺序 |
| A6 | `format` | `fmtValue:124-128`；调用点 `:442,864,873,931,948,1014,1149,1176,1207,1221,1229,1288,1310,1442,1491,1594,1634` | `:172-178`（哨兵函数 + 调用序列） | ✅ |
| A7 | `animation` | `resolveCommon:266`→`commonClasses:286` | `:180-183` | ✅ 缺省含 `ilife-charts-anim`，`false` 不含 |
| A8 | `emptyText` | `emptyOutput:320-322` | `:185-194` | ✅ 自定义值优先；缺省取冻结 `STATUS_DEFAULT_TEXT.empty`（见 §9-②） |
| A9 | `tooltip` | `resolveCommon:279`＋`tipAttrs:304-306` | `:196-202` | ✅ `data-tip`，零内联脚本（属性名未冻结，`charts.ts:27` 记账） |
| A10 | `labels` | `resolveCommon:272`；`labelIndexes:450-464`；`xLabelsSvg:466-475` | `:204-214`、`:723-735`（bar 的 `select` 只标首尾） | ✅ 四态 |
| A11 | `showValues` | `resolveCommon:273`；`valueIndexes:478-495` | `:216-222` | ✅ `true`/`'edge'`/`false`；**26 单位避让无断言（FX-78-V2a-4）** |
| A12 | `labelRotate` | `resolveCommon:274`；`xLabelsSvg:471` | `:224-229` | ✅ `rotate(45 …)` |
| A13 | `yMin` | `domainOf:405-406` | `:231-237` | ✅ 显式优先、不加 padding |
| A14 | `yMax` | `domainOf:407-408` | `:231-237` | ✅ |
| A15 | `grid` | `resolveCommon:277`；`gridSvg:421-430`；调用 `:1027,1239,1454,1643` | `:239-243` | ✅ 缺省 3 条、`false` 0 条（bar 也生效，R25） |
| A16 | `actionId` | `resolveCommon:278`；`containerOpen:292`、`actionAttrs:296-301` | `:245-251` | ✅ 容器 + 逐点 `data-action-id` |

### B. `LineChartOptions`（24）

| # | 字段 | 实现 | 断言 | 判定 |
|---|---|---|---|---|
| B1 | `lineWidth` | `:680`、`:847` | `:257-262` | ✅ |
| B2 | `dashed` | `:681`、`:848` | `:257-262` | ✅ `6 5` |
| B3 | `smooth` | `smoothPath:572-604`；`:843` | `:264-272` | ✅（控制点系数无断言 → FX-78-V2a-4） |
| B4 | `step` | `stepPath:607-635`；`:843` | `:274-279`（逐字符 d） | ✅ |
| B5 | `showDots` | `:684`、`:852-867` | `:281-289` | ✅ |
| B6 | `dotSize` | `:685`、`:860`（R21 新能力） | `:284-285` | ✅ `r=dotSize/2` |
| B7 | `dotStyle` | `:686`、`:858,863`（R21 新能力） | `:286-288` | ✅ 内联 `style` |
| B8 | `area` | `:687`、`areaPath:637-645`、`:836-842` | `:291-299` | ✅ 且绘制在折线之前 |
| B9 | `areaOpacity` | `:688`、`:840,800` | `:291-299` | ✅ area/fillBetween 同源，band 恒 0.15 |
| B10 | `yTicks` | `:689`；`tickCount:414-417`；`ticksSvg:432-445` | `:301-310` | ✅ `false`=0；2–6 收敛；值 = 共享域（6% padding、尊重 yMin/yMax）均分；走 `format`（非整数 round 口径无断言 → FX-78-V2a-4） |
| B11 | `connectNulls` | `polyPath:551-569`、`smoothPath:574-575`、`stepPath:610-634` | `:312-338` | ✅ 跨空直连、点只在有值处、首尾不外延、全 null 空路径（且产出 0 个 `<path>`/` d="`） |
| B12 | `legend` | `:691`、`legendHtml:497-506`、`:850,910,1025` | `:340-363` | ✅ 图例块 + ownScale 注记（注记仅 `legend && anyOwnScale`，`:910`） |
| B13 | `highlightLast` | `:692`、`:912-934` | `:365-377` | ✅ 末个有效点高亮；末值文本受 `showValues`/`labels:'select'` 门控 |
| B14 | `avgLine` | `:693`、`:757-782`（均线**序列**，窗口 `max(3,min(len,round(n||7)))`） | `:379-397`（逐坐标 d） | ✅ 按 `old-baseline.md:263`／`OPTION-MATRIX:8` 更正口径；`series` 存在时不叠加 |
| B15 | `markLine.value` | `:940-949` | `:399-409` | ✅ 水平虚线 + 文字；缺省色 `#ff9500`；`label` 覆盖 |
| B16 | `markLine.xValue` | `:950-977` | `:411-426` | ✅ 索引或 label；缺省标注 = 该点 label；18% 贴边锚定；越界/未知 label 忽略 |
| B17 | `markPoint` | `:668-672`、`:980-1017` | `:428-441` | ✅ `true`→主序列最大值；`{index}` 越界忽略；`{value}` 首个匹配；白边 `var(--card,#ffffff)` + 上方标注；`label`/`color` 覆盖；18% 锚定 |
| B18 | `band` | `:709-719`（等长抛错）、`:804-823`（`fill-opacity 0.15`、任一侧 null 断开、绘制在折线前） | `:443-458` | ✅ 值并入共享域；ownScale 主序列跟随自身域（`:807`，无断言 → FX-78-V2a-5） |
| B19 | `fillBetween` | `:784-802`（非数/越界/相同/长度不一致四类抛错；null 断开不随 `connectNulls`） | `:460-489` | ✅ 绘制在折线前；色缺省序列色；透明度 = `areaOpacity` |
| B20 | `highlightPoints` | `turns:877-888`（两端点不判）、`crossings:890-909`（段右端点） | `:491-514` | ✅（`d0===0` 精确相交为新增能力，见 §9-⑥） |
| B21 | `series` | `resolveLineSeries:522-549`；`name/items/color/dashed/smooth/area/ownScale` 逐项 | `:516-538` | ✅ 传 `series` 时主 `items` 不参与（旧 `charts.js:408-409` 口径） |
| B22 | `series[].ownScale` | `:740-745`（独立域）、`:724`（跳过共享域）、`:748`、`:910` | `:540-578` | ✅ 自身 min-max +6%、忽略 yMin/yMax、铺满图高、不参与共享域 |
| B23 | `ChartItem.value === null` | `normalizeItems:200-202`（`allowNull` 仅 line）；`:703` | `:580-588` | ✅ 其余 kind 抛 `structure-invalid` |
| B24 | `ChartItem.anomaly` | `:217`、`ANOMALY_COLOR=CHART_PALETTE[3]`:139、`:856-861`、CSS `:1706` | `:590-600` | ✅ `#ff3b30` + 光晕 CSS |

### C. `BarChartOptions`（8）

| # | 字段 | 实现 | 断言 | 判定 |
|---|---|---|---|---|
| C1 | `singleColor` | `:112`（冻结类型为 `boolean`，R25）→ `barColorFor:1069` | `:612-633` | ✅ `true` 时全柱同色（覆盖 `colors`）；`item.color` > `colors` > `singleColor` 优先级已实测 |
| C2 | `values[]` | `normalizeItems:190-198,203-209`；长度一致 `:1092-1101` | `:635-648` | ✅ 长度/数值/非空三类抛 `structure-invalid`；multi 模式 `value` 不豁免（R1-A2） |
| C3 | `stacked` | `:1084`、`:1162-1179`、柱顶合计 `:1210-1222` | `:650-661` | ✅ 段几何逐值；合计走 `format` |
| C4 | `stackMode` | `:1089`、`:1122-1129`、`:1165-1167`、`:1215-1218` | `:663-689` | ✅ `percent` 恒 0–100 且**不参与 yMin/yMax**（实测 `yMin:0,yMax:1000` 产出串逐字节相同）；`absolute` 分母 = 全局最大合计，同样忽略 yMin/yMax |
| C5 | `grouped` | `:1085`、`:1181-1195` | `:691-705` | ✅ 宽度均分、gap = `CHART_BREAKPOINTS.stackedGapPx`(3)、逐子柱取色、`segNames` 图例 |
| C6 | `stacked × grouped` | `:1085`（`!stacked && grouped`） | `:707-714` | ✅ 同传 = stacked 优先（产出串与纯 stacked 逐字节相同，0 个 `<g>`） |
| C7 | `segNames` | `:1102-1104`、`:1234` | `:716-721` | ✅ 缺省「段1/段2…」 |
| C8 | 缺省（都不传） | `:1136-1141`、`:1150-1158` | `:737-752` | ✅ 单柱路径；柱族域**无 padding**（柱底贴底、最高柱满高、柱高比 = 值比） |

### D. `DonutChartOptions`（7）

| # | 字段 | 实现 | 断言 | 判定 |
|---|---|---|---|---|
| D1 | `size` | `:1258`、`:1262-1263`、`:1318` | `:758-767` | ✅ 直径 = viewBox 边长；半径自适应 |
| D2 | `ringWidth` | `:1259`、`:1263`、`:1277`、`:1321` | `:758-767` | ✅ `r = max(20, size/2 - ringWidth/2 - 2)` |
| D3 | `legend` | `:1260`、`:1300-1313`、CSS `:1710-1711` | `:769-776` | ✅ `right`/`bottom`/`none` 三态（旧版 `bottom` 无独立实现，新版补齐；R25 新能力） |
| D4 | `showPercent` | `:1261`、`:1311-1312` | `:778-795` | ✅ `Math.round(v/total*100)`（1/3 → 33%） |
| D5 | `centerLabel` | `:1285`、`:1290-1293` | `:797-808` | ✅ |
| D6 | `centerValue` | `:1286-1288`（R26-1：字面渲染不过 `format`） | `:797-808` | ✅ 缺省 = 合计走 `format` |
| D7 | 合计为零 | `:1255-1256`（`total <= 0` → 专属 hint） | `:810-817` | ✅ `empty:true`/`points:0`/「合计为零, 无环形数据」 |

### E. `ProgressChartOptions` / `GaugeChartOptions`（7）

| # | 字段 | 实现 | 断言 | 判定 |
|---|---|---|---|---|
| E1 | `gradient` | `:1341-1348`（`linearGradient` id 由参数派生） | `:823-838` | ✅ 含 `<defs>` + 两个 stop；无 gradient 时 0 个 |
| E2 | `showPct` | `:1349`、`:1364` | `:840-844` | ✅ 缺省 true；`Math.round` 口径 |
| E3 | `gauge.label` | `:1523`、`:1539-1540` | `:846-854` | ✅ |
| E4 | `gauge.size` | `:1512-1516`（`height = round(size*0.62)`）、`:1529` | `:846-854` | ✅ `size:200` → viewBox `0 0 200.0 124.0` |
| E5 | `pct` 非数 | `normalizePct:224-227` | `:866-873` | ✅ 抛 `ChartError{code:'pct-invalid'}`（字符串/NaN/undefined/null/Infinity/对象/数组） |
| E6 | `pct` 超界 | `:226`（`max(0,min(100,pct))`，不抛） | `:875-884` | ✅ 150→100、-20→0；`data-pct` 与 `fillbar.width` 同步 |
| E7 | `points` | `:1366`／`:1542`（恒 1）、`empty:false` | `:886-894` | ✅ `pct===0` 时 `empty===false` 且真实渲染 `data-pct="0"` |

### F. `ComboChartOptions` / `SparklineChartOptions`（5）

| # | 字段 | 实现 | 断言 | 判定 |
|---|---|---|---|---|
| F1 | `bars`／`lines` | `:1375-1388`（同长 + 同 label 抛错；只传其一合法） | `:902-924` | ✅ 长度不一致/label 不一致均抛 `structure-invalid`；只传其一的非空路径**无断言**（FX-78-V2a-4） |
| F2 | `barColor`／`lineColor` | `:1389-1394`、`:1417,1425,1429` | `:939-951` | ✅ 缺省 `var(--blue,#007aff)`／`#ff9500` |
| F3 | `legend` | `:1446-1448` | `:953-961` | ✅ 固定两项「量」「趋势」 |
| F4 | `showValue`（sparkline） | `:1485`、`:1487-1492` | `:963-972` | ✅ 末尾数值 + `showValue:false` 无 |
| F5 | 涨绿跌红（sparkline 色） | `:1483-1484`、`UP_COLOR:140`／`DOWN_COLOR:141` | `:963-972` | ✅ 涨 `var(--ok,#34c759)`、跌 `#ff3b30`；**相等边界无断言**（FX-78-V2a-4） |

### G. `ScatterChartOptions`（5 + 1 记账）

| # | 字段 | 实现 | 断言 | 判定 |
|---|---|---|---|---|
| G1 | `regression` | `:1598-1624`（`!== false && n>=2`，最小二乘 `b=(nΣxy-ΣxΣy)/(nΣxx-(Σx)²)`、`denom=0→b=0`） | `:981-998`（非共线数据端点随域变化） | ✅ 独立重算一致（163.9／-0.1） |
| G2 | `regressionColor` | `:1618-1620`（缺省 `#ff3b30`）、`:1621-1623`（虚线 `5 4`） | `:1000-1006` | ✅ |
| G3 | `dotSize` | `:1583-1584`、`:1591`（显式值走内联 `style="r:…"`，避开 CSS 几何属性覆盖，R2-N10） | `:1008-1021` | ✅ 缺省 9px（r=4.5，无内联）；显式 20 → `r="10"` + `style="r:10"` |
| G4 | `ScatterItem.x/y` 非法 | `normalizeScatterItems:1547-1563` | `:1034-1041` | ✅ 非数组/非对象/缺 x/缺 y/NaN 均 `structure-invalid` |
| G5 | 空数组 | `:1570` | `:1043-1048` | ✅ `empty:true`/`points:0` |
| G6 | （R33 记账）scatter 缺省 Y 刻度 | `SCATTER_Y_TICKS=4:149`、`:1644` | `:1023-1032`（4 条 + 逐值 + 随域变化 + 显式 yMin/yMax 优先） | ✅ 按 R33「默认渲染 4 条、不加开关」 |

### H. 常量与规则（11）

| # | 字段 | 实现 | 断言 | 判定 |
|---|---|---|---|---|
| H1 | `CHART_KINDS` | `CHART_DISPATCH:1659-1668`（`satisfies ChartDispatch` 编译期校验 8 键） | `:1061-1065` | ✅ 8 成员闭集，`Object.keys(charts)` 逐值相同 |
| H2 | `CHARTS_STYLE_ID` | `helpersStyleId:1750-1753`、`:1771` | `:1103-1108`、`:1178-1179` | ✅ 缺省注入 `<style id="ilife-charts">` |
| H3 | `CHART_STRUCTURE_RULE='throw'` | `badStructure:86-88` 全篇 | `:1089-1101` | ✅ |
| H4 | `CHART_EMPTY_RULE='emptyState'` | `emptyOutput:318-329`（走 `renderEmptyState`） | `:1089-1101` | ✅ 含 `ilife-empty-text`/`-icon` |
| H5 | `CHART_COORD_RULE='viewBox-only'` | 容器零 padding（CSS `:1696`）+ `vector-effect`（`:427,440,848,862,926,945,972,1011,1033,1279,1321,1426,1430,1499,1533,1536,1593,1623`） | `:1089-1101`、`:1137-1150` | ✅ 产出串零 `padding:` |
| H6 | `CHART_BREAKPOINTS` | `chartsCss:1692-1694,1734-1739`（720／8／150 逐值取常量）；`stackedGapPx` 用于 stacked/grouped（`:1090,1171,1182,1185,1224`） | `:1110-1121`、`:691-705` | ✅ 四值均在产出中生效（`@media (max-width:720px)`、`--ilife-charts-dot:8px`、`height:150px`、`data-gap="3"`） |
| H7 | `CHART_PALETTE` | `:139,141,835,1077,1274,1307,1345`（逐值取色） | `:1123-1135` | ✅ 10 色逐值 + donut/seg 取色顺序 |
| H8 | `CHART_ERROR_CODES` | `ChartError:76-84` + 三个字面量（`:87,91,95`，类型层由 `ChartErrorCode` 约束） | `:1082-1087` | ✅ 三码皆可达（见 §9-③） |
| H9 | `ChartOutput` | 8 个 renderer 返回 `{kind,html,empty,points}` | `:1183-1218` | ✅ 4 字段齐备；`empty ⇔ points===0`（pct 型例外） |
| H10 | 纯度 | 全篇 | `:1220-1241` | ✅ 见 §7.2 |
| H11 | `buildChartsHelpersJs` | `:1764-1789`（18 行 IIFE、`styleId`/`prefix` 覆盖、幂等自注入） | `:1243-1339` | ✅ 见 §7.4 |

---

## 4. 重点抽样（自选 21 条 · 全部自构输入）

探针：`%TEMP%\v2a-probe.cjs`（50 条 `ck`）+ `%TEMP%\v2a-gaps.cjs`。**通过 21/21**。

| # | 抽样项 | 自构输入 | 实测 | 判定 |
|---|---|---|---|---|
| 1 | `yTicks` 收敛 2–6 | `yTicks: 1/0/-5/2.4/2.6/9`（items 0..10，自动域） | `1/0/-5`→2 条；`2.4`→2 条；`2.6`→3 条；`9`→6 条 | ✅ |
| 2 | `yTicks` 刻度值来源 | 自动域 `[0,10]` → `yTicks:2` | `['-0.6','10.6']`（6% padding 逐值）；`yMin:0,yMax:100` → `['0','100']`；`format` 生效 `['F-0.6','F10.6']`；3 点均分 → `-0.6 / 5 / 10.6` | ✅ |
| 3 | `connectNulls` 首尾不外延 | `[null,0,100]` / `[0,100,null]` | 首 `M160.0 …`、尾 `… 160.0 8.0` | ✅ |
| 4 | `connectNulls` 全 null 空路径 | `[null,null]` | `empty:true`/`points:0`；`<path>` 0 个、` d="` 0 处 | ✅ |
| 5 | `connectNulls` 正交性 | `smooth`/`step`/`area` × `connectNulls` | 三者 `d` 均单 `M` | ✅ |
| 6 | `band` 等长抛错 | `hi:[1] lo:[0,1,2]`／`hi:[1,2,3] lo:[0,1]`／`hi:'x'`／`band:{}` | 4/4 抛 `structure-invalid` | ✅ |
| 7 | `band` 语义 | `hi:[5,100,7] lo:[0,1,2]` | `fill-opacity="0.15"`；刻度含 ≥100（并入共享域）；`hi:[5,null,7]` → 2 个 `M`（断开） | ✅ |
| 8 | `fillBetween` 四类违规 | `{a:'x'}`／`{a:0,b:9}`／`{a:-1,b:0}`／`{a:1,b:1}`／长度不一致 | 5/5 抛 `structure-invalid` | ✅ |
| 9 | `fillBetween` 绘制序 + null | 2 序列 + `connectNulls:true` | 填充 2 个 `M`（不跨空）；`indexOf(fill) < indexOf(line)` | ✅ |
| 10 | `markPoint` 缺省最大点 | `[{1},{9},{3}]` | 圈在 `cx=160.0`（index 1），标注 `9` | ✅ |
| 11 | `markPoint` `{index}` 越界 | `{index:99}`／`{index:-1}`／`{value:42}` | 三者均 0 个圈、不抛错 | ✅ |
| 12 | `markPoint` 其它口径 | `{value:3}`／`{value:1}`／`{index:0,label:'谷',color:'#abcdef'}` | 末点 `306.0`／首个匹配 `14.0`／`stroke=var(--card,#ffffff)`、`fill=#abcdef`、`text-anchor=start` | ✅ |
| 13 | `ownScale` 不参与共享域 | 共享 `[0,10]` + ownScale `[0,1000]` | 刻度仍 `['-0.6','10.6']` | ✅ |
| 14 | `ownScale` 铺满图高 | ownScale `[0,1]` + `yMin:0,yMax:10` | 点 cy `['191.6','18.4']`（自身 min-max +6%） | ✅ |
| 15 | `highlightPoints:'turns'` | `[1,3,2]`／`[1,2,3]`／`[1,3,2,4]` | `['1']`／`0` 个／`['1','2']`（两端点不判） | ✅ |
| 16 | `highlightPoints:'crossings'` | a=[0,1,2,3] b=[3,2,1,0] | `data-i=['2']`（段右端点） | ✅ |
| 17 | `stacked × grouped` 优先级 | `{stacked:true,grouped:true}` | 产出串 === 纯 stacked；0 个 `<g>`；4 个 `rect.ilife-charts-seg` | ✅ |
| 18 | `stackMode:'percent'` 不参与 yMin/yMax | 同数据 `yMin:0,yMax:1000` / `yMin:-5,yMax:50` | 三者产出串**逐字节相同**；段 y `['85.0','11.0','46.5','11.0']` | ✅ |
| 19 | `values[]` 长度校验 | 长度不一致／`'x'`／`[]`／缺 values／`value:null` | 6/6 抛 `structure-invalid` | ✅ |
| 20 | `pct` 收敛 + `points`/`empty` 口径 | `150/-20/0/100/50.6`（progress + gauge） | `data-pct` `100/0/0/100/50.6`；`points` 恒 1、`empty` 恒 false；`fillbar.width` 同步 | ✅ |
| 21 | scatter 回归色 + `dotSize` + gauge 弧 + combo 同长同 label + 8 接口空态 + `kind-unknown` | 见 §7.1／§3-B17/E7/F1 | 全部符合 | ✅ |

> 探针首轮 `pass=50 fail=2`（`S10b`／`S21`）经逐条复核为**探针自身期望笔误**（`pct:50.6` 的 `data-pct` 是 `50.6` 而非 `51`；缺省空态文案是冻结 `STATUS_DEFAULT_TEXT.empty = '无数据'` 而非我猜的「暂无数据」）。修正后全部通过；两处实际行为已按旧语义与冻结常量复核为**正确**（见 §9-②）。

---

## 5. 随机抽样攻击（15 字段 · seed=780780）

**抽样方法**：84 字段全表按 A–H 顺序编号，LCG（`s = (s*1103515245+12345) % 2^31`，种子 = 票号 780780）不放回抽 15 个（脚本 `%TEMP%\v2a-draw.cjs`，可复跑）。抽中项与**自构输入**的独立验证结果：

| # | 抽中字段 | 自构输入（与仓内测试不同） | 实测 | 判定 |
|---|---|---|---|---|
| 1 | `H.buildChartsHelpersJs` | `{}` / `{styleId:'zz-style',prefix:'q-'}` + 假 DOM 连跑 3 次 | 18 行 IIFE、`var CSS` 为 JSON 字面量、假 DOM 幂等 1 个 `<style>`、覆盖 id/prefix 生效、无全局赋值、无 `node:` | ✅ |
| 2 | `F.barColor` | `bars=[4,7]`、`barColor:'#0a0b0c'` / 缺省 / `color+barColor` / 仅 `color` | `#0a0b0c`×2 / `var(--blue,#007aff)`×2 / `#111111`（barColor 优先）/ `#999999` | ✅ |
| 3 | `B.area` | `[2,6,4]`、`area:true`、含 null 断点 | 面积路径 `Z` 闭合、在折线之前、null 处 2 个 `M`、关掉 0 条 | ✅ |
| 4 | `B.ChartItem.value===null` | `[{value:null}]` 打 5 个接口 | bar/donut/sparkline/combo/stacked-bar 全抛 `structure-invalid`；line 合法（`points:1`，1 个点） | ✅ |
| 5 | `A.emptyText` | `'还没有任何记录'` / 敌意 `'<b>x</b>&"\''` | 命中 1 次、无缺省文案；敌意串逐字符转义为 `&lt;b&gt;…&amp;&quot;&#39;` | ✅ |
| 6 | `H.纯度` | 10 份产出（含 gradient/tooltip/stacked/grouped/空态） | `<canvas`/`<script`/`onclick=`/`onload=`/`node:`/`http(s)://`/`<style` 全 0 | ✅ |
| 7 | `B.highlightLast` | `[1,2,null]` | 高亮圈 `data-i=1`（跳过尾部 null）；`showValues:false` 无末值标签、`true` 有 | ✅ |
| 8 | `B.areaOpacity` | 缺省 / `0.35` / `0.35`+band / `0.35`+fillBetween | `0.12` / `0.35` / band 恒 `0.15` / fillBetween 继承 `0.35` | ✅ |
| 9 | `B.legend` | 2 序列（含 ownScale） | 图例块 1 个、`摄入`+`消耗`+`各指标独立刻度` 顺序正确、虚线 swatch、`legend` 缺省 0 个 | ✅ |
| 10 | `H.CHART_KINDS` | — | 8 成员逐值、`Object.keys(charts)` 相同、8 个皆函数 | ✅ |
| 11 | `B.band` | `[4,6]`、`hi:[9,9] lo:[1,1]`、`yTicks:2` | `0.15`；刻度 `['0.52','9.48']`（hi/lo 并入共享域）；长度不符抛错；null 断开 1 段；缺省 0 条 | ✅ |
| 12 | `A.yMin` | `[0,50,100]` 五种域组合 | `191.6/105.0/18.4`、`139.8/77.6/15.5`、`202.0/105.0/8.0`、`105.0/56.5/8.0`、`396.0/202.0/8.0`、`247.1/134.3/21.5` | ✅ |
| 13 | `B.series[].ownScale` | 共享 `[0,10]` + ownScale `[100,200]` | 刻度 `['-0.6','10.6']`；ownScale 点铺满 `191.6/18.4`；`ownScale:false` 时刻度变 `['-12','212']`（并入共享域） | ✅ |
| 14 | `E.pct` 超界 | `101/250/1e6/-1/-250/-1e6` | progress+gauge 均 clamp 到 `100`/`0`、不抛、`points:1`、`empty:false` | ✅ |
| 15 | `A.width` | `width:500` 打 8 接口 | line/bar/combo/scatter/sparkline/progress 的 viewBox 宽 = 500.0；donut/gauge 走 `size`（150/170） | ✅ |

**通过率 = 15/15 = 100.0%**（`=== RANDOM-SAMPLE SUMMARY pass=15 fail=0`）。
首轮 `pass=11 fail=4` 的 4 条经逐条取证为**探针期望笔误**（图例类名子串计数 3≠1、`yMin=50` 时 `y=202.0` 而非 `8.0`、ownScale 与共享序列在等跨度数据上坐标重合、`buildChartsHelpersJs` 单条子断言），修正后 15/15；全部实际值已记录在上表并判定为**符合旧语义**。

---

## 6. 仓内测试现状（最终版）

```
node --test packages/base-render/test/charts.test.mjs
ℹ tests 82
ℹ pass 82
ℹ fail 0
ℹ cancelled 0 / skipped 0 / todo 0
OPTION-MATRIX 覆盖清单：{"A":[16 项],"B":[24],"C":[8],"D":[7],"E":[7],"F":[4],"G":[6],"H":[12]} / 命中用例 73 条
```

（未跑全量 `pnpm test`，按派单只跑 base-render 相关；未跑 `tsc`——受只读约束，编译面归 V1/V3。）

---

## 7. 确定性 / 纯度 / 类名 / helpers 证据

### 7.1 确定性

- 8 接口（含 `area+smooth+yTicks+markPoint+band` 复合、stacked、gradient、combo、sparkline、gauge、scatter）各调用两次 → `assert.deepEqual` 全等。
- 渐变 id 由**渐变参数**派生（`charts.ts:1342` `hash32(color+'|'+CHART_PALETTE[5])`）：同参数 → 同 id；不同 `color` → 不同 id；单次调用恰 1 个 `<linearGradient>`。
- 无模块级可变计数器（`hash32` 是纯函数，`charts.ts:156-165`）。
- **同页 id 撞车**：同参数的两个 progress 图表会得到**相同**渐变 id（同一份定义，幂等安全）；不同参数不撞。R1-A1／FX-78-A1b-11 明写「id 由渐变参数派生」，判**符合裁定**；若产品要求「同页每图唯一 id」，需另立裁定（记账）。

### 7.2 纯度

- 10 份产出（覆盖 8 kind + 空态 + tooltip/gradient/actionId 全开）：`<canvas`／`<script`／`onclick=`／`onload=`／`node:`／`http://`／`https://`／`<style` **各 0 次**。
- `src/charts.ts` 模块自身：`grep` 命中的 `document.`/`window.`/`globalThis.` **仅出现在注释（`:8,10,1759,1760`）与 `buildChartsHelpersJs` 的产出字符串字面量（`:1775,1776,1778,1784,1785`）**——模块代码零 DOM 全局 ✅（R8）。
- **第二份常量表**：`CHART_PALETTE`／`CHART_BREAKPOINTS`／`CHARTS_STYLE_ID`／`ACTION_ID_ATTR`／`STATUS_DEFAULT_TEXT`／`STYLE_PREFIX` 全部 `import` 自 `src/spec/*`，无复制表。CSS 文本唯一产出者 = `chartsCss:1690-1741`（R12）✅。
  低危记账：`DEFAULT_MARK_COLOR='#ff9500'`（`:137`）与 `DEFAULT_REGRESSION_COLOR='#ff3b30'`（`:138`）与 `CHART_PALETTE[2]/[3]` 同值但以字面量写出；三个错误码在 `:87,91,95` 以字面量出现（类型层由 `ChartErrorCode` 联合约束，写错即编译红）。两者均不构成「第二套规则表」，记入 §9-③。

### 7.3 类名命名空间（R1-A3／FX-78-A1b-13）

11 份产出拼串 + helpers CSS 文本实测：

| needle | 命中 |
|---|---|
| `class="ilife-charts` | > 0 ✅ |
| `class="ilife-charts `（容器根类精确形态） | > 0 ✅ |
| `class="ilife-chart ` | **0** ✅ |
| `class="ilife-chart"` | **0** ✅ |
| `ilife-chart-`（HTML） | **0** ✅ |
| `ilife-chart-`（CSS） | **0** ✅ |
| `class="ilife-charts"` 精确形态 | 0（根类后恒接子类，见 `commonClasses:283-288` + `containerOpen:290-294`） |
| `.ilife-charts{position:relative;margin:0;padding:0;`（CSS 根规则） | 命中 ✅ |

> 结论：**根类已从 `ilife-chart` 改为 `ilife-charts`**（05:28:43 的 +5 字节改动），`ilife-chart"`／`ilife-chart-` 精确形态均 0；`.ilife-charts *`（`:1697`）与 `@media … .ilife-charts{--ilife-charts-dot:8px}`（`:1735`）两条规则**重新可用**（此前根类为单数时它们是死规则）。

### 7.4 `buildChartsHelpersJs`

- 非空（≈2.6 KB）、**逐字节幂等**（两次调用相同）。
- 18 行经典 IIFE；`var CSS` 为 `JSON.stringify` 结果（含敌意 prefix `'x";y'` 转义，行数不变）。
- 假 DOM 连跑 3 次 → 恰 1 个 `<style>`，id = `ilife-charts`；`{styleId:'zz-style',prefix:'q-'}` → id 与 CSS 命名空间同步覆盖。
- 满足 `SHARED_HELPERS_JS_RULE`：自包含、`document.` 仅产出文本、无 `window./globalThis.` 赋值、无 `node:`、无 `import/export/await`。

---

## 8. 弱断言 / 鉴别力清单（静态 · 缺陷来源）

扫描 `test/charts.test.mjs` 全文（1407 行，82 用例）。**未发现 `assert.ok(true)`、只断言非空、只断言不抛**；但命中派单列举的另外两类（宽松 `startsWith`、needle 由被断言常量自身拼成）及 5 处**子语义无断言**。

### FX-78-V2a-1【中】needle 由 `P = STYLE_PREFIX` 自身拼成（17 处）

- 位置：`:1016`、`:1098`、`:1149`、`:1169-1172`、`:1180`、`:1190`、`:1247`(间接)、`:1290`、`:1296-1297`、`:1304-1316`、`:1319-1320`、`:1330`、`:1337`（`const P = STYLE_PREFIX`，`:31`）。
- 存活的变异：把 `src/style.ts:7` 的 `STYLE_PREFIX = 'ilife-'` 改成 `'x-'`（并同步 `dist`）→ 上述 needle 随之变化，**82 条仍全绿**（`STYLE_PREFIX` 值全仓无断言，`grep` 仅见 import）。
- 应改成：至少加一条 `assert.equal(STYLE_PREFIX, 'ilife-', '类名前缀冻结值')`；关键 needle 用字面量，例如
  `assert.ok(out.html.startsWith('<div class="ilife-charts '), '容器根类 = ilife-charts');`
  `assert.ok(css.includes('.ilife-charts-scatter .ilife-charts-dot{r:calc(var(--ilife-charts-dot) / 2)}'));`

### FX-78-V2a-2【中】渐变 id 只做宽松 `startsWith`

- 位置：`:833` `assert.ok(idOf(html).startsWith(P + 'charts-grad-'))`；`idOf` 见 `:832`。
- 存活的变异：把 `hash32`（`charts.ts:158-165`）换成常量/截断/别的散列 → 同参数仍同 id、不同参数仍不同 id（`:835`），形态仍以 `ilife-charts-grad-` 开头 → **仍绿**。
- 应改成：`assert.equal(idOf(charts.progress({pct:40,options:{gradient:true}}).html), 'ilife-charts-grad-<实测哈希>')`（字面量），或补 `assert.match(idOf(html), /^ilife-charts-grad-[0-9a-z]+$/)` + 固定参数下的字面量 id。

### FX-78-V2a-3【中】自证断言 + 宽松阈值

- 位置：`:1400` `assert.ok(Object.values(FIELD_TITLES).every((fields) => Object.keys(fields).length > 0), '每组必须有字段')`——断言的是**测试文件自身的常量表**非空，与实现无关，恒真。
- 位置：`:1387` `assert.ok(titles.length >= 60)`（实读 82）、`:1402` `assert.ok(hitTitles.length >= 30)`（实读 73）——宽松下界，删掉若干用例仍可绿。
- 应改成：删掉 `:1400`；`titles.length` 改为精确值 `assert.equal(titles.length, 82)`；`hitTitles.length` 改为 `assert.equal(hitTitles.length, tokens.length)`（每个字段 token 必须命中**至少一条**且互不复用，`:1399` 已保证互不相同）。

### FX-78-V2a-4【高】5 处字段子语义无断言（可存活变异）

| 子语义 | 实现 | 现存断言 | 可存活变异 | 应补断言 |
|---|---|---|---|---|
| `showValues:true` 的 26 单位避让（`contract:219`） | `charts.ts:487-493` | `:216-222` 只覆盖 `true/'edge'/false` 的**集合** | 删掉 `if (x - lastX < 26) continue;` → 全部 82 条仍绿 | 40 点密集数据 + `showValues:true` → `assert.equal(textsOf(html,P+'charts-value').length, 10)`（实测 10/40） |
| `smooth` 的 Catmull-Rom 控制点 | `charts.ts:596-599`（`/6`） | `:264-272` 仅 `includes(' C')` + 首尾 `startsWith/endsWith` + `notEqual` | `(p2[0]-p0[0])/6` → `/5`（首尾点不变）→ 仍绿 | `assert.equal(pathD(lineHtml({smooth:true}), P+'charts-line'), '<完整 d 字面量>')` |
| sparkline 涨跌边界 `last >= first` | `charts.ts:1483` | `:963-972` 只有 1→3（涨）与 3→1（跌） | `>=` → `>` → 相等时翻红，仍绿 | `charts.sparkline({items:[{value:5},{value:5}]})` → 断言 `stroke === 'var(--ok,#34c759)'` 且含 `ilife-charts-up`（实测通过） |
| `yTicks` 非整数 `Math.round` 口径 | `charts.ts:416` | `:301-310` 只测 `1/2/9/false` | `Math.round` → `Math.floor` → 全部仍绿 | 补 `yTicks:2.6 → 3 条`、`yTicks:2.4 → 2 条`（实测 3/2/3.5→4） |
| combo 只传 `bars`／只传 `lines` 的非空路径 | `charts.ts:1388` `n = bars.length>0?bars.length:lines.length` | `:902-924` 只覆盖「两者同长」「两者皆空」 | `n = bars.length` → lines-only 时除零/错位，仍绿 | 补 `charts.combo({bars:[2 项],lines:[]}).points===2` 与 `charts.combo({bars:[],lines:[2 项]})` 的点数/路径断言（实测 points=2/2，lines-only d=`M14.0 85.0L306.0 8.0`） |

### FX-78-V2a-5【低】2 处分支无断言

| 分支 | 实现 | 说明 | 应补断言 |
|---|---|---|---|
| `band` 跟随 ownScale 主序列域 | `charts.ts:807` `const dom = ownDoms[0] ?? [lo, hi]` | `:443-458` 的 band 用例无 `series`，该分支不可达 | 主序列 `ownScale:true` + `band`，断言 band `d` 与共享域版本**不同**（需构造使两域不重合的数据，例如主序列 `[0,100]`、`band hi:[10,20] lo:[0,10]`，共享域取非 ownScale 序列或 band 值域） |
| `series[].name === ''` 被图例排除 | `charts.ts:850` `if (line.legend && !isAvg && s.name !== '')` | 无用例；旧版是否排除未取证 | 断言 `legend:true` + `series:[{name:'',items}]` 的图例行为（渲染空图例块 or 不渲染），并记账与旧版差异 |

### 其余静态观察（不单列 FX，建议 V3 变异时留意）

| 观察 | 位置 | 说明 |
|---|---|---|
| `SHARED_HELPERS_JS_RULE[flag] === true` | `:1271` | 冻结常量自证；但 `:1272` 配了行为探针（`probe(code)`），成对使用可接受 |
| `assert.throws(fn, isStruct)` 只判 code/name | 全篇 | 旧版 18 条中文抛错文案未断言（新契约只冻结 code，可接受） |
| `assert.equal(dotsOf(...).filter(d=>d['data-s']==='1').length, 3)` | `:537` | 只数个数，未钉坐标（同用例其它断言覆盖颜色/dasharray/area） |
| `assert.equal(last.length, 1)`／`anomaly.length,1`／`groups.length,2`／`bars.length,2` | `:368,595,694,740` | 计数断言，均紧跟逐值断言，风险低 |
| `stripComments` 后做 `import/export/await` 扫描 | `:1253-1257` | 产出 JS 本身无注释，等价于原文扫描；口径正确 |

---

## 9. 非缺陷偏离与记账（按 R19–R26／R33 判，**不计缺陷**）

① **R19 · combo 折线 x 与柱列中心错位（重要记账）**
旧 combo 用 `getBoundingClientRect` 把折线点校准到**柱列中心**（`charts.js:429,779-795`）；新实现柱列中心 = `x0 + slot*(i+0.5)`（`charts.ts:1412`），折线点 = `xAt(frame,i,n)`（`charts.ts:1423`）。实测 4 列：柱心 `['50.5','123.5','196.5','269.5']`，线点 x `['14.0','111.3','208.7','306.0']`——**不重合**。
依 R19「DOM 校准不复刻……验收不按旧 DOM 行为判，改按可断言等价物判——同一 scale 函数导出数据点坐标与路径端点」，该等价物**成立**（线点与其路径端点同用 `xAt`），故**不判缺陷**，按 R19 要求记账。若编排者认为「线点必须落在柱顶中心」是产品语义，请另立裁定（改动仅 1 行：bars 存在时用柱心）。

② **空态缺省文案**：新实现取冻结 `STATUS_DEFAULT_TEXT.empty = '无数据'`（`charts.ts:24-25,320-322`），旧 `charts.js:126` 是「暂无数据」。依 R8「不得自造第二份常量」与 R25，取冻结常量正确；文案差异记账。

③ **错误码字面量**：`:87,91,95` 以字符串字面量构造 `ChartError`（未从 `CHART_ERROR_CODES` 派生）。类型 `ChartErrorCode` 由该常量联合派生，写错即编译红，判**可接受**（低危记账）。

④ **`yTicks: 0`**：矩阵写「`false`=无刻度；数字收敛 2-6」，实现按「数字 ⇒ clamp 2」得 2 条；旧实现若按 falsy 处理则为 0 条。矩阵未规定 0 的口径，判**符合矩阵字面**，记账。

⑤ **`combo({})`**：`bars`/`lines` 是冻结类型的必填字段，缺字段 → `structure-invalid`（旧 JS 会 `||[]` 后走空态）。依 `CHART_STRUCTURE_RULE='throw'` 与矩阵 F「违规→抛错」，判**符合契约**，记账（`combo({bars:[],lines:[]})` 仍正确走空态）。

⑥ **`highlightPoints:'crossings'` 的 `d0 === 0`**：`charts.ts:900` 在「两点在该段起点相等」时标记 `k`；旧口径只在 `d0*d1<0` 时标记。属 R21/R25「按冻结类型补齐的新能力」，且不与旧语义冲突（相交判定更完整），记账。

⑦ **`PROXY_SAFE_KEYS`**（`charts.ts:1670,1678-1681`）：`then/toJSON/inspect/constructor/toString/valueOf/…` 不触发 `kind-unknown`（`charts['then'] === undefined`），以保证 `await charts`／`JSON.stringify(charts)`／`console.log(charts)` 不被炸。`kind-unknown` 经 `charts['pie']`／`charts['']`／`charts['Pie']` 均可达（`:1076-1084`，实测 code/name/message 逐字一致）。判**可接受**，记账。

⑧ **R20／R21／R24／R25／R26／R33** 逐条复核通过：`stackedGapPx` 同用于 stacked 段与 grouped 子柱（`:1090,1171,1182,1185,1224`，R20）；`line.dotSize`／`line.dotStyle`／`combo.tooltip` 已实现为新能力（R21/R25）；`combo.y2` 未移植（R24，冻结类型无该字段）；`donut.centerValue` 字面渲染不过 `format`（`:1286-1288`，R26-1）；scatter 缺省 4 条 Y 刻度且不加开关（`:149,1644`，R33）。

---

## 10. 自证边界与纪律声明

- 本报告**未**把 `a1-evidence.md`／`a2-evidence.md`／`CLOSEOUT.md`／`verify-v1.md`／`verify-v2b.md` 的任何结论作为判据；上述文件仅在确认「哪些断言已被施工者自称覆盖」时被 grep 到文件名，未采信其结论。
- **只读**：本次会话唯一的仓内写操作 = 本文件 `.scratch/t78/verify-v2a.md`。未执行任何 `git` 写命令；未改 `src/`／`test/`／`dist/`；未跑 `tsc`（避免重写 `dist`）；未跑变异（归 V3）。
- 只读探针脚本落在 `%TEMP%\v2a-{probe,random,random2,diag,diag2,draw,gaps,band,r01}.cjs`（仓外），可原样复跑。
- 侧栏终端：`V2a-verify`（已关闭，屏幕状态异常后重建）／`V2a-verify-2`（uuid `266bc8b2-5589-4d5c-960a-775add94f618`，命令全部在此执行，收尾关闭）。
- 审查期间被审文件发生过 1 次变动（`src/charts.ts` 05:28:24 → 05:28:43，+5 字节类名收尾）；**本报告所有行号与结论均以最终版 `B457B913…` 复核**，§3 的实现行号即最终版行号。
- 已知盲区（超出本角色范围）：① 变异测试（V3）；② 浏览器实渲染（V2b／browser-evidence 已有页面级证据，未采信）；③ `tsc` 编译面（V1）；④ 全量 `pnpm test` 回归（编排者门禁）。

---

## 11. 复跑指令（供终局复验）

```powershell
cd D:\ilife
Get-FileHash packages\base-render\src\charts.ts -Algorithm SHA256   # 期望 B457B913DA5B9504EDB7177EA4F3B307DE4BD5FB7AEE327D438427254F857ADE
Get-FileHash packages\base-render\test\charts.test.mjs -Algorithm SHA256  # 期望 0BE843E295DC242397E8F715DC6EFE7C7F6C221C39D87D9A41060D9440EE77AF
node --test packages/base-render/test/charts.test.mjs              # 期望 82 pass / 0 fail
node "%TEMP%\v2a-random2.cjs"                                      # 期望 RANDOM-SAMPLE SUMMARY pass=15 fail=0
node "%TEMP%\v2a-probe.cjs"                                        # 期望 SUMMARY pass=50（探针含 2 条笔误项，见 §4 注）
```
