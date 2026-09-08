# #78 施工 A1b／A1c · 图表层返修证据（`src/charts.ts`）

- 票：`#78`《base- 图表层与 HELP 壳（含 scene-data 契约）》；返修单 `.scratch/t78/FIX-A1.md`（FX-78-A1b-01…16 ＋ §C ＋ §D）。
- 判据：`.scratch/t78/parity-audit-r2.md`（R2：12 不一致 ＋ 7 无鉴别力断言）／`.scratch/t78/contract-precheck-r1.md`（R1：A1／A2／A3／A5／B3）／旧语义权威 `.scratch/t78/old-baseline.md` §2 ＋ `docs/research/t92-old-v130-signatures.md:153-194`。
- 可复跑脚本：`.scratch/t78/a1-evidence.mjs`
  - `node .scratch/t78/a1-evidence.mjs` → 产出快照 ＋ 返修点自证（本文 §5）
  - `node .scratch/t78/a1-evidence.mjs --mutate` → 30 处变异自证（本文 §7）
- **本轮范围**：§A 01–10 ＋ §B 11／12／14／15／16 ＋ §C 全部；**另按编排者第二次追加，13（类名命名空间）也一并完成**。**未做**：§D 的记账项（不返修）。
- **A1c 返修轮（V2a／V3 验收后）见本文 §9**：唯一实现改动 = FX-A1c-01（combo 线点 x 对齐柱列中心），其余为补／改强断言；新增变异 **M31–M61**（31 处）＋ src 级 FX-A1c-01 变异 1 处。

## 1. 交付物

| 文件 | 行数 | 本轮改动 |
|---|---|---|
| `packages/base-render/src/charts.ts` | 1793 | 01–12／14–16 实现 ＋ 13 类名改名（`'charts*'` 字面量 162 处；`ilife-chart-` 残留 0） |
| `packages/base-render/test/charts.test.mjs` | 1408 | 新增/改强断言 40+ 条；用例数 74 → 82 |
| `.scratch/t78/a1-evidence.mjs` | — | 变异 13 → 30 处；快照补返修点自证 |
| `.scratch/t78/a1-evidence.md` | — | 本文件 |

**只改了上表 4 个文件**；未碰 `src/help.ts`／`src/spec/*`／`src/index.ts`／`test-d/*`／`test/contract-signatures.test.mjs`／`docs/*`／`.changeset/*`／其它包／`package.json`／lock；未执行任何 git 写命令。

## 2. 自测命令与输出（本轮最后一次运行）

| 命令 | 结果 |
|---|---|
| `pnpm exec tsc -b --force` | **exit 0** |
| `node --test --test-reporter=tap packages/base-render/test/charts.test.mjs` | **tests 82 / suites 8 / pass 82 / fail 0** |
| `node --test --test-reporter=tap "packages/base-render/test/*.test.mjs"` | **tests 382 / suites 56 / pass 382 / fail 0**（零回归） |
| `node .scratch/t78/a1-evidence.mjs --mutate` | **30/30 PASS**（每处改错都红在期望用例，还原后全绿） |

## 3. 逐条状态（FX-78-A1b-01…16）

| 编号 | 状态 | 实现改动（落点） | 新增/改强断言 | 变异 |
|---|---|---|---|---|
| 01 | 已完成 | `domainOf(..., padRatio = 0.06)`（`charts.ts:372`）；bar 单柱／grouped／stacked-absolute 与 combo 传 `0` | `C.缺省`：柱底 162/162、最高柱高 154、柱高比 == 值比、柱顶 85.0/8.0；`F.combo 共享域`：柱高 15.4、柱底 162、线点 cy=8.0 | M14／M15 RED |
| 02 | 已完成 | `dotSizeExplicit` → 内联 `style="r:{dotSize/2}"`（`charts.ts:1589`） | `G.dotSize`：显式 `style` 逐点 `r:10`、缺省 `undefined`、CSS 覆盖源仍在 | M16 RED |
| 03 | 已完成 | `highlightLast` 末值文本加门控 `showValues !== false \|\| labels === 'select'`（`charts.ts:926`） | `B.highlightLast`：`showValues:false` → `[]`（**原断言已改**）、`showValues:true` → `['100']`、`labels:'select'` → `['100']`；高亮圈仍恒在 | M21 RED |
| 04 | 已完成 | absolute 合计标签改 `frame.y1 - total * unit`（与段高同尺度，`charts.ts:1216`） | `C.stackMode`：标签 y `['52.5','17.0']`＋percent 恒 `['17.0','17.0']`＋**`yMin:0,yMax:10` 下仍 `['52.5','17.0']`**（该条才是 04 的鉴别力来源：padding=0 时 `yAt` 与同尺度数值恰好重合） | M22 RED |
| 05 | 已完成 | 判据 `line.series !== undefined`（`charts.ts:762`） | `B.avgLine`：单条 series 时 `chart-avg` 计数 0、折线路径仍 1 条、points 仍 5 | M17 RED |
| 06 | 已完成 | `labelIndexes(..., select: 'peak' \| 'edge')`＋bar 传 `'edge'`（`charts.ts:451,1240`） | `C.labels`：bar `select` == `['A','E']`（不含峰值 C）、`all`/`edge`/`none` 三态、单柱 `['A']`；line 的 `select` 仍 `['A','C','E']` | M18 RED |
| 07 | 已完成 | `svgOpen(..., aspect)`；line／combo／scatter 传 `'none'`（旧 `charts.js:661,774,899`） | `H.移动端满宽`：三 kind == `none`、bar/donut/gauge/sparkline == `xMidYMid meet`、`height:150px` 规则仍在 | M23 RED |
| 08 | 已完成 | progress svg 内联 `style="height:{height}px"`（`charts.ts:1356`） | `E.height`：缺省 `height:8px`、`height:20` → `height:20px`、viewBox 同步、`preserveAspectRatio=none` | — |
| 09 | 已完成 | `chartsCss` 补 13 条字号规则（旧 `charts.js:55,67,70,79,87,90,92,96,102-103,113,122` 逐值：tick 9.5／xlabel 10（bar 10.5、移动端 9.5）／value 10／value-last 10.5+700／marktext 10／mptext 10.5+700／center 8／13+700／gauge 26+800／11） | `H.图表文本字号`：逐规则 needle ＋ 9.5px 必须落在 `@media (max-width:720px)` 内 | M26 RED |
| 10 | 已完成 | donut 百分比 `Math.round`（`charts.ts:1312`） | `D.showPercent`：`['33%','67%']`＋三等分 `['33%','33%','33%']` | M24 RED |
| 11 | 已完成 | 删模块级 `gradientSeq`，id = `charts-grad-` ＋ `hash32(color + '\|' + CHART_PALETTE[5])`（FNV-1a，`charts.ts:151-160,1344`） | `E.gradient`：同输入两次**逐字节相等**、换色 id 不同、id 走 `STYLE_PREFIX` | M19 RED |
| 12 | 已完成 | `normalizeItems` 的 `mode='values'` 分支补 `isNum(value)` 校验（`charts.ts:190-192`） | `C.values[]`：缺 `value`／`value:null`／`value:'2'` 三类均抛 `structure-invalid`；全部 multi 测试数据显式带 `value` | M20 RED |
| 13 | 已完成（追加） | 全局 `STYLE_PREFIX + 'chart*'` → `'charts*'`（`'charts` 字面量 162 处；含 CSS 变量 `--ilife-charts-dot`、keyframes、渐变 id）；`data-chart-kind`／`data-chart-empty` 数据属性不动 | `H.类名命名空间`：产出 `class="ilife-charts` 命中 67、容器根类 `class="ilife-charts ` > 0、`class="ilife-chart"`／`ilife-chart-`／CSS `ilife-chart-`／`.ilife-charts{` 残留 0、`ilife-chartss` 0、`CHARTS_STYLE_ID === 'ilife-charts'` | M28／M29／M30 RED |
| 14 | 已满足＋补断言 | A1 已用 `jsStr(css)`（无需改实现） | `H.chartsCss 经 jsStr 嵌入`：CSS 必为 JSON 字面量、`literal === JSON.stringify(JSON.parse(literal))`、无真实换行、敌意 `prefix: 'x";y'` 引号转义且行数不变 | — |
| 15 | 已完成 | `type ChartDispatch = { readonly [K in ChartKind]: (input: Parameters<ChartsApi[K]>[0]) => ChartOutput }`；派表 `satisfies ChartDispatch`；8 个渲染函数按冻结输入类型标注；去掉 `as ChartsApi` | 编译期（无运行时断言）；`H.类名命名空间` 顺带断 `charts` 仍 8 方法 | **M27 COMPILE-RED**：`progress: renderBar` → `error TS2322` |
| 16 | 已完成 | `SCATTER_Y_TICKS = 4` ＋ `ticksSvg(...)` ＋ 刻度留白 inset（`charts.ts:140,1561,1636`） | `G.yTicks 缺省`：4 条文字＋4 条短线、逐值 `['-0.12','0.63','1.37','2.12']`、换域 `['0.76','2.25','3.75','5.24']`、显式 `yMin/yMax` 优先、line 仍 0 条 | M25 RED |

## 4. §C 无鉴别力断言处置（7 条）

| R2 编号 | 原位置 | 原断言的问题 | 改成 |
|---|---|---|---|
| M4 | `test:884-885` | `y=x` 恒等数据 → 回归端点恒等于域上下界（加不加 padding 都得 172.0/8.0） | 非共线数据 `y=1,3,4`（回归 `y=1.5x+7/6`）→ 端点 `163.9`/`-0.1`；并断言「不得与恒等数据端点重合」 |
| M5 | `test:331-333` | 全 null 只断 `empty`／`points` | 补 `path.chart-line` 为空数组、`<path` 计数 0、` d="` 计数 0 |
| M1 | `test:1062` | `assert.ok(js.length > 0)` 只断非空 | 改断 IIFE **逐行结构**：18 行、首行/次行/末行、`function ` 2 处、`document.` 7 处 |
| M2 | `test:1020` | `assert.ok(out.html.length > 0)` 只断非空 | 改断容器根类前缀、`</div>` 收尾、恰 1 个 `<svg>`/`</svg>`、`data-chart-kind` 恰 1 |
| M3 | `test:1071-1073` | 循环断言 `SHARED_HELPERS_JS_RULE[flag] === true`（常量自证） | 每条 flag 配一个**产出 JS 的 probe**（selfContained／idempotent／domAllowed／forbidGlobalAssignment／forbidNodeBuiltins），断「实现满足规则」 |
| M6 | `test:942` | `CHART_ERROR_CODES.includes('kind-unknown')`（常量自证） | 改断**实现产出**：`err.code` 取自冻结码表 ＋ 文案逐字 `charts: 未知图表 kind：pie`；并断正常 kind 不产生该码文本 |
| M7 | `test:904-905` | needle 由被断常量自身拼成（`mobileMaxPx`／`lineHeightMobilePx`） | 改**字面量** needle `@media (max-width:720px)`／`height:150px` |
| M8 | `test:1098+` | 「覆盖清单」的字段→标题映射已落地，但尾部两组断言是常量自证（组内字段数＋总数 84） | 删掉两组自证计数，改断：**token 互不相同**（H 组三常量原共用同一 token，已拆为 `CHART_EMPTY_RULE /`／`CHART_COORD_RULE：`）、每组非空、命中真实用例 ≥ 30 条 |

## 5. 返修点自证（`node .scratch/t78/a1-evidence.mjs` §4 节选）

```
- 01 bar 域无 padding：柱底 162/162（绘图区底 162）／柱高 77.0/154.0（绘图区高 154）
- 02 scatter dotSize:20 → r=10 / style=r:10（缺省 style=undefined）
- 03 highlightLast + showValues:false → 末值标签数 0（showValues:true 时为 1）
- 04 absolute 合计标签 y：52.5/17.0（同尺度）
- 05 avgLine + 单条 series → chart-avg 数 0
- 06 bar labels:select → X 标签 ["A","E"]
- 07 preserveAspectRatio：line none / combo none / scatter none / bar xMidYMid meet
- 08 progress svg 内联高度：height:8px（height:20 → height:20px）
- 09 CSS 字号规则：tick 9.5px=true／gauge-value 26px=true／center-value 13px=true
- 10 donut 百分比取整：["33%","67%"]
- 11 渐变 id 确定性：ilife-charts-grad-xxs8uh / ilife-charts-grad-xxs8uh（逐字节相同 true）／换色 → ilife-charts-grad-cxwaxw
- 12 multi 缺 value → ChartError/structure-invalid／value:null → ChartError/structure-invalid
- 13 类名命名空间：class="ilife-charts 命中 67／残留 class="ilife-chart" 0／残留 ilife-chart- 0／CSS 根类 .ilife-charts{ 2／ilife-chartss 0／CHARTS_STYLE_ID=ilife-charts
- 14 CSS 以 JSON 字面量嵌入：true（敌意 prefix x";y 引号转义：true）
- 15 派表 satisfies ChartDispatch（无 as 断言）：true
- 16 scatter 缺省 Y 刻度：-0.12/0.63/1.37/2.12（4 条）
```

## 6. 覆盖矩阵（A–H）落实率

| 组 | 覆盖字段 | 未覆盖 |
|---|---|---|
| A 通用选项 | 16 / 16 | 无 |
| B LineChartOptions | 24 / 24 | 无 |
| C BarChartOptions | 8 / 8 | 无 |
| D DonutChartOptions | 7 / 7 | 无 |
| E progress／gauge | 7 / 7 | 无 |
| F combo／sparkline | 4 / 4 | 无 |
| G ScatterChartOptions | 6 / 6 | 无 |
| H 常量与规则 | 12 / 12 | 无 |
| **合计** | **84 / 84** | — |

机读绑定仍走 `H.覆盖清单（机读）`：从本文件磁盘源码读全部 `it(...)` 标题，逐字段断言 token 命中；本轮额外加了「token 互异」与「命中 ≥30 条」两条非自证断言。

## 7. 变异自证（30 处 · `node .scratch/t78/a1-evidence.mjs --mutate`）

基线 `pass=82 fail=0`；每处「改错 → 期望用例红 → 还原 → 全绿」。**结论：PASS（30/30 命中期望，30/30 还原后全绿）**。

| # | 改了什么 | 期望命中 | 结果 |
|---|---|---|---|
| M1 | `tickCount` 收敛 2..6 → 1..9 | `B.yTicks` | RED(命中) → GREEN |
| M2 | 折线/散点 6% 外扩 → 10% | `B.yTicks` | RED(命中) → GREEN |
| M3 | 多值分支「先判 stacked」→「先判 grouped」 | `C.stacked × C.grouped` | RED(命中) → GREEN |
| M4 | `polyPath` 的 connect 分支短路 | `B.connectNulls` | RED(命中) → GREEN |
| M5 | 删 `fillBetween` 越界抛错 | `B.fillBetween` | RED(命中) → GREEN |
| M6 | 空态 `points: 0` → `1` | `H.ChartOutput` | RED(命中) → GREEN |
| M7 | `ownScale` 序列并入共享域 | `B.series[].ownScale` | RED(命中) → GREEN |
| M8 | `markPoint` 取最大 → 取最小 | `B.markPoint` | RED(命中) → GREEN |
| M9 | `ACTION_ID_ATTR` → `data-action` | `A.actionId` | RED(命中) → GREEN |
| M10 | 段取色偏移 1 | `H.CHART_PALETTE` | RED(命中) → GREEN |
| M11 | grouped 间距 3 → 5 | `C.grouped` | RED(命中) → GREEN |
| M12 | 删 helpers JS 幂等早退 | `H.buildChartsHelpersJs` | RED(命中) → GREEN |
| M13 | 改测试标题（覆盖清单绑定性） | `H.覆盖清单` | RED(命中) → GREEN |
| M14【01】 | 单柱域 `domainOf(..., 0)` → 默认 6% | `C.缺省` | RED(命中) → GREEN |
| M15【01】 | combo 域 → 默认 6% | `F.combo 共享域` | RED(命中) → GREEN |
| M16【02】 | 去掉 scatter 显式 dotSize 的内联 `r` | `G.dotSize` | RED(命中) → GREEN |
| M17【05】 | avgLine 判据回到 `series.length !== 1` | `B.avgLine` | RED(命中) → GREEN |
| M18【06】 | bar `select` 回到「首+峰值+尾」 | `C.labels` | RED(命中) → GREEN |
| M19【11】 | 渐变 id 改随机值（跨调用漂移） | `E.gradient` | RED(命中) → GREEN |
| M20【12】 | 关掉 multi 模式 `value` 校验 | `C.values[]` | RED(命中) → GREEN |
| M21【03】 | `highlightLast` 门控去掉 | `B.highlightLast` | RED(命中) → GREEN |
| M22【04】 | 合计标签回到 `yAt(lo,hi)` | `C.stackMode` | RED(命中) → GREEN |
| M23【07】 | line 的 `preserveAspectRatio` 回到 `meet` | `H.移动端满宽` | RED(命中) → GREEN |
| M24【10】 | donut 百分比回到 `round2` | `D.showPercent` | RED(命中) → GREEN |
| M25【16】 | 删 scatter 的 `ticksSvg` 调用 | `G.yTicks` | RED(命中) → GREEN |
| M26【09】 | tick 字号 9.5px → 9px | `H.图表文本字号` | RED(命中) → GREEN |
| M27【15】 | 派表 `progress: renderBar`（键错配） | 编译期 | **COMPILE-RED** `error TS2322` → GREEN |
| M28【13】 | 容器根类回到 `ilife-chart` | `H.类名命名空间` | RED(命中) → GREEN |
| M29【13】 | CSS 根类回到 `.ilife-chart{` | `H.类名命名空间` | RED(命中) → GREEN |
| M30【13】 | 单个类名残留 `ilife-chart-line` | `H.类名命名空间` | RED(命中) → GREEN |

> M22 的口径说明：01 修完后（bar 域无 padding）`yAt(total, 0, maxTotal)` 与「同尺度」在数值上恒等，**只改标签行不再变红**；故 `C.stackMode` 追加了 `yMin:0,yMax:10` 用例（此时 `yAt` 得 116.4、同尺度仍 52.5），M22 因此命中。
> M28 的口径说明：根类单独改回单数时，产出里仍会出现 `class="ilife-charts-line"` 等，故 `H.类名命名空间` 额外断「容器根类 `class="ilife-charts ` > 0 且 `class="ilife-chart ` == 0」，M28 才落在该用例上。

## 8. 与旧语义的偏离／记账（本轮新增）

1. **12 的记账**：旧 `_barMulti` 不读 `value`（缺省静默置 0），本实现按冻结类型 `ChartItem.value` 必填 ＋ `docs/base-paint-contract.md:799` **严格抛 `structure-invalid`**（`values[]` 不豁免）。与旧行为不同，以冻结类型为准（FIX-A1b-12 明确）。
2. **16 的记账**：scatter 缺省 4 条 Y 刻度已渲染；`ScatterChartOptions` **无** `yTicks` 字段 → 无关闭开关（契约缺口，R2-G1 裁定归后续票）。
3. **combo 域 padding**：旧 combo 柱高 = 值 / max(柱,线)（无外扩，`charts.js:742-753`）→ 与 bar 同口径传 0；旧版另有 80% 上限（给柱顶标签留位），本实现改由 viewBox `insets.top` 留位，不复刻钳制（原 R-A6 记账不变）。
4. **13 的边界**：只改类名命名空间与随之派生的渐变 **DOM id**（`ilife-charts-grad-*`）；`data-chart-kind`／`data-chart-empty` 数据属性、`charts.*` 错误文案前缀（`charts.bar:` 等）**不动**。
5. §D 的 4 条保留项（`format` 缺省 round2／progress 渐变终止色 `#5ac8fa`／`format` 冻结为函数／`singleColor` 冻结为 boolean）与 B1 歧义（全 null → `empty:true` 但不替换 emptyState）**本轮未动**，与返修单 §D 一致。

---

## 9. A1c 返修轮（V2a ＋ V3 独立验收后）

- 返修单：`.scratch/t78/FIX-A1c.md`；依据 `.scratch/t78/verify-v2a.md`（实现零缺陷、5 条**断言鉴别力**缺口）＋ `.scratch/t78/verify-v3.md`（32 处变异中 8 处存活 ＋ 17 条弱断言）。
- **本轮唯一实现改动 = FX-A1c-01**（combo 线点 x 取柱列中心）；其余全部为**补／改强断言**，`src/charts.ts` 未再动其它行。
- 只改：`packages/base-render/src/charts.ts`（FX-A1c-01，`88208 → 88777` 字节）＋ `packages/base-render/test/charts.test.mjs`（`84676 → 109706` 字节；用例 82 → 86）＋ 本文件。**未碰** `src/help.ts`／`src/spec/*`／`src/index.ts`／`test-d/*`／`docs/*`／`.changeset/*`／其它包／`package.json`／lock；**未执行任何 git 写命令**；`dist/` 仅由 `tsc -b` 重建（变异窗口内每次字节还原并校验 SHA）。

### 9.0 本轮自测（最后一次运行）

| 命令 | 结果 |
|---|---|
| `pnpm exec tsc -b --force` | **exit 0** |
| `node --test --test-reporter=tap packages/base-render/test/charts.test.mjs` | **tests 87 / suites 8 / pass 87 / fail 0** |
| `node --test --test-reporter=tap "packages/base-render/test/*.test.mjs"` | **tests 388 / suites 56 / pass 388 / fail 0**（零回归；A1b 基线 382 ＋ 本轮 charts 新增 5 条用例 ＋ 并行 session 的 help 侧用例） |
| 变异自证 · dist 级（M31–M62，32 处） | **32/32 命中期望用例；32/32 还原后 87/87 全绿且三文件 SHA 与基线逐字节相同**（末轮复跑基线 `test=A6EB515FDFDE…`） |
| 变异自证 · src 级（FX-A1c-01，改 `src/charts.ts` ＋ `tsc` 重建） | 变异后 `tsc exit 0` ＋ `F.bars / F.lines` 红（85/1）→ 还原后 `tsc exit 0` ＋ 86/86 绿，`src` SHA 回 `C55CBAC5…`、`dist` SHA 回 `657906CE…` |

终态指纹（本轮交付）：

| 文件 | 字节 | 行 | SHA256 |
|---|---|---|---|
| `packages/base-render/src/charts.ts` | 88777 | 1798 | `C55CBAC58C31BE25B9C034917D465672C7F6820C7CC2EA359026044E06CCD88B` |
| `packages/base-render/test/charts.test.mjs` | 112130 | 1768 | `A6EB515FDFFDE3281C19DC0BD9AC6F032D188408D729430212DF61D392C6EE48C` |
| `packages/base-render/dist/charts.js`（构建产物） | 87983 | 1660 | `657906CE7739DDBBAC5B32C1B429B7A12BD00434DD60F8757DCDA278C8A411A5` |

### 9.1 FX-A1c-01（唯一实现改动）：combo 线点 x == 柱列中心 x

- **改**：`src/charts.ts:1423-1428`（`renderCombo` 折线点）`xAt(frame, i, lines.length)` → `frame.x0 + slot * (i + 0.5)`（与柱同一 band 标度；`slot = frame.w / n`、`n = bars.length || lines.length`），并补 5 行裁定注释。
- **依据**：旧版线点是柱列容器内的 `<i style="left:50%">`（`old-baseline.md:442`／`charts.js:429`），再由 DOM 校准对齐列心（`charts.js:779-795`）；R19 豁免的只是 `getBoundingClientRect` 测量，**x 对齐**属「同一坐标系」的可断言等价物（R9「线点=柱顶」）。
- **断言**（`test:1077-1115`，`F.bars / F.lines`）：
  - 4 列 → 柱心 `['50.5','123.5','196.5','269.5']`；`assert.deepEqual(lineXs, barCenters)`；`lineXs.length === 柱数`；
  - 折线 `d = 'M50.5 142.8L123.5 104.3L196.5 65.8L269.5 27.3'`；2 列 → `['87.0','233.0']`。
- **实测对照**（改前 → 改后）：线点 x `['14.0','111.3','208.7','306.0']` → `['50.5','123.5','196.5','269.5']`（即 `verify-v2a.md` §9① 的错位实测值）。
- **变异**：M31（dist 退回点标度）→ `F.bars / F.lines` 红 → 还原绿；另做 **src 级**变异（改 `src/charts.ts` ＋ `tsc -b --force`）→ 同一条红 → 还原绿（见 §9.0）。

### 9.2 FX-78-V2a-1…5 逐条

| 编号 | 改了哪几行（test/charts.test.mjs） | 新增／改强断言 | 变异红／绿 |
|---|---|---|---|
| **V2a-1** | `:1398-1444`（H.类名命名空间）＋ `:1216-1217`（G.dotSize CSS）＋ `:1331-1338`（H.CHARTS_STYLE_ID）＋ `:1378`（移动端高度规则）＋ `:1434-1443`（命名空间字面量）＋ `:1663-1680`（13 条字号规则）＋ `:1620-1630`（注入 CSS 字面量）＋ `:1311-1312`（空态类名） | `assert.equal(STYLE_PREFIX, 'ilife-')`；容器根类 `'<div class="ilife-charts ilife-charts-line ilife-charts-anim"'`、`'<svg class="ilife-charts-svg"'`、8 个 kind 子类（bar／arc／fillbar／combo-line／sparkline／gauge-fg／dot／empty）＋ CSS 4 条规则全部**字面量** | M32 → 红 75 条（含 `H.类名命名空间`）→ 还原绿 |
| **V2a-2** | `:914-936`（E.gradient） | `idOf(html) === 'ilife-charts-grad-xxs8uh'`（缺省色，`:926`）＋ `'ilife-charts-grad-cxwaxw'`（`#123456`）；保留「换色 → 换 id」 | M33 → `E.gradient` 红 → 绿 |
| **V2a-3** | `:1701-1768`（H.覆盖清单；精确计数在 `:1749`／`:1754`） | 删掉 `Object.values(FIELD_TITLES).every(...)` 自证行；`titles.length` **精确 87**、`hitTitles.length` **精确 74**（并把命中数断言提到 token 循环之前，使两条断言可分别被证明）；注释注明「改实现/改矩阵须同步」 | M34（`it`→`it.skip`）→ 条数断言红；M35（改一条标题）→ 命中数断言红 |
| **V2a-4.1** | `:221-249`（A.showValues） | 40 点密集 → 标签数 **10**、首／末标签 x `14／283.5`、相邻中心距 **≥26**；临界：12 点(26.545)→12 条、13 点(24.333)→7 条、`width:334`(25.5)→7 条、`width:346`(26.5)→13 条（把阈值**恰好钉在 26**） | M36（→0）／M47（→25）／M48（→27）→ `A.showValues` 红 |
| **V2a-4.2** | `:291-311`（B.smooth） | 3 点 smooth `d` 逐值（`:299`）＋ 5 点逐值（覆盖 `p0 ?? seg[i]`／`p3 ?? seg[i+1]` 两端夹取）＋ 2 点退化直线段 | M37（/6→/5）→ `B.smooth` 红 |
| **V2a-4.3** | `:1155-1179`（F.showValue；`flat` 在 `:1166`） | 首尾相等 → `stroke = var(--ok,#34c759)`、含 `charts-up`、无 `charts-down`、末值 `['5']`、`points = '2.0,28.0 88.0,28.0'` | M38（`>=`→`>`）→ `F.showValue` 红 |
| **V2a-4.4** | `:352-367`（B.yTicks；`2.6` 在 `:363`） | `yTicks:2.6`→`['-0.6','5','10.6']`；`3.6`→`['-0.6','3.13','6.87','10.6']`；`5.6`→6 条；`2.4`→2 条 | M39（round→floor）→ `B.yTicks` 红 |
| **V2a-4.5** | `:1052-1116`（F.bars / F.lines；对齐断言 `:1077-1088`，bars-only `:1096`，lines-only `:1106-1115`） | bars-only：`points 4`／`empty false`／4 柱／0 线点／0 path；lines-only：`points 4`／0 柱／线点 x `['50.5','123.5','196.5','269.5']`／`d='M50.5 123.5L123.5 85.0L196.5 46.5L269.5 8.0'` | M40（`n = bars.length`）→ `F.bars / F.lines` 红 |
| **V2a-5.1** | `:508-549`（B.band；`ownBand` 在 `:526`，逐值 `:546`） | ownScale 主序列 + band → `d='M14.0 182.9L306.0 18.4 L306.0 182.9 L14.0 191.6 Z'`；`ownScale:false` → `d='M14.0 105.0L306.0 -1738.0 L306.0 105.0 L14.0 202.0 Z'`；两者 `notEqual` | M41 → `B.band` 红 |
| **V2a-5.2** | `:397-428`（B.legend；空名序列 `:422-427`） | `legend:true` ＋ `series:[{name:'',items}]` → 图例块 0 个、折线路径仍 1 条 | M42 → `B.legend` 红 |

### 9.3 FX-78-V3-01…08 逐条

| 编号 | 改了哪几行 | 新增／改强断言 | 变异红／绿 |
|---|---|---|---|
| **V3-01** | `:1513-1547`（**新增** `H.转义` 用例） | 15 个注入点（`items[].label`／`color`／`format` 返回值／`emptyText`／`centerLabel`／`centerValue`／`segNames`／`series[].name`／`markLine.label`／`markLine.xValue` 标注／`markPoint.label`／`actionId`／`dotStyle`／`gauge.label`／`scatter.label`）各断：含 `&lt;script&gt;&quot;&#39;&amp;`、不含原文、不含 `<script`、实体成组出现；属性位另断 `data-action-id="…"`／`stroke="…"`／`style="…"` 逐字；并有「正常输入不得双转义」对照 | M43（`esc`→恒等）→ `H.转义` 红 → 绿 |
| **V3-02** | `:986-1004`（**新增** `E.gauge 弧几何` 用例） | pct 0／25／50／75／100 的 `gauge-fg` `d` 逐值（25→`27.7 43.7`、75→`142.3 43.7`，反向式会得 142.3／27.7）；`gauge-bg` 恒整条半弧；`size:200` → `M4.0 120.0 A96.0 96.0 0 0 1 32.1 52.1` | M44（endAngle 反向）→ `E.gauge 弧几何` 红 → 绿 |
| **V3-03** | `:1305-1329`（H.CHART_STRUCTURE_RULE；`hasVe` 8 条在 `:1318-1325`） | 8 个**描边元素**逐个在**被测标签本身**断 `vector-effect`（折线 path（`showDots:false`）／网格／Y 刻度／markLine／markLine-v／回归线／sparkline polyline／combo 折线）；纯填充路径（area）改断 `stroke="none"`（见 §9.6-③） | M45（折线 path 去属性、circle 仍在）→ `H.CHART_STRUCTURE_RULE` 红 |
| **V3-04** | `:330-350`（B.area；精确 `d` 在 `:337`） | area `d` 逐值 `'M14.0 202.0L160.0 105.0L306.0 8.0 L306.0 202.0 L14.0 202.0 Z'` ＋ 换域例（`yMin:-100,yMax:100`）＋ null 断点例 | M46（`frame.y1`→`frame.y0`）→ `B.area` 红 |
| **V3-05** | 同 V2a-4.2（`:291-311`） | 控制点逐值（3 点／5 点／2 点三例） | M37 → `B.smooth` 红 |
| **V3-06** | 同 V2a-4.1（`:221-249`） | 40 点标签数 **10 < 点数 40**（精确值），另加阈值临界 4 例 | M36／M47／M48 → `A.showValues` 红 |
| **V3-07** | `:1366-1396`（H.移动端满宽；`svgTags` 逐 kind 在 `:1380-1390`） | 8 个 kind 逐个断 `<svg>` 开标签 `role="img"`、`focusable="false"` 且两者相邻出现 | M49（svgOpen 去属性 → 5 kind）／M50（donut 内联去属性）→ `H.移动端满宽` 红 |
| **V3-08** | `:1549-1569`（**新增** `H.空态文案与图标` 用例）＋ `:1311-1312` | `'有记录后自动生成图表'` 计 1、`'📊'` 计 1、`class="ilife-empty-icon">📊</div>`、`class="ilife-empty-hint">…</div>`；6 个空态接口共用同一份；donut 专属 hint `'合计为零, 无环形数据'` | M51（EMPTY_HINT 改写）／M52（EMPTY_ICON 改写）→ `H.空态文案与图标` 红 |

### 9.4 17 条弱断言逐条处置

| W | 位置（本轮终态行号） | 更严写法 | 变异 |
|---|---|---|---|
| W1 | `:330-350` | area 断精确 `d` | M46 |
| W2 | `:291-311` | smooth 断精确 `d` | M37 |
| W3 | `:1305-1329` | 逐元素在**被测标签**上断 `vector-effect` | M45 |
| W4 | `:1513-1547` | 新增 15 字段转义用例 | M43 |
| W5 | `:1549-1569` | 空态文案／图标逐字 | M51／M52 |
| W6 | `:1331-1338` | `'var STYLE_ID = "ilife-charts";'` 字面量（不再用 `CHARTS_STYLE_ID` 拼） | M53 |
| W7 | `:1216-1217`／`:1378`／`:1441-1442`／`:1663-1680` | CSS needle 全部改字面量（scatter 点半径／移动端折线高度／根规则／dot 变量／13 条字号规则） | M54／M55 |
| W8 | `:786` | `['3','3']` 字面量 | M56 |
| W9 | `:1446-1488`（每 kind 精确 points 在 `:1471-1480`） | 保留自洽断言 ＋ 非空产出 `empty === false` ＋ 每 kind 精确 `points` `{bar:1,line:1,donut:1,progress:1,combo:2,sparkline:1,gauge:1,scatter:1}` | M57 |
| W10 | `:1624-1633` | 5 个 flag 各配**负样本**并断 `probe(负样本) === false`（防 probe 恒真） | M58 |
| W11 | `:1261-1280`（`MIN_INPUT` 在 `:1266`） | 每 kind 最小调用 → 断 `out.kind === kind` 且容器 `data-chart-kind` 恰 1 | M59 |
| W12 | `:1398-1444`／`:1462` | 命名空间／容器根类**字面量**断言 | M60 |
| W13 | `help.test.mjs:316` | **本轮未动**（可改文件白名单不含 `help.test.mjs`）→ 见 §9.6-① | — |
| W14 | `help.test.mjs:332` | **本轮未动**（同上） | — |
| W15 | `help.test.mjs:710/724` | **本轮未动**（V3 判「已足够」） | — |
| W16 | `help.test.mjs:790` | **本轮未动**（V3 判「可接受」） | — |
| W17 | `:1571-1590`（**新增** `H.纯度（src 侧）` 用例） | 读 `src/charts.ts` → 剥注释＋字符串字面量 → 断 0 处 `document.`／`window.`／`globalThis.`／`node:`／`require(`；防剥空（`function smoothPath`／`export const charts`／长度 >2000）；反向对照「产出文本里有 `document.`」 | M61（src 插 `globalThis.__purity`）→ `H.纯度（src 侧）` 红 |

### 9.5 变异自证 M31–M62（32 处 · dist 级）

驱动器：`D:\a1c\mutate.mjs`（仓外；变异落在 `dist/charts.js`／`src/charts.ts`／`test/charts.test.mjs`，每处**逐字节还原并校验 SHA**，`SHA-MATCH {"dist":true,"src":true,"test":true}`）；`node D:\a1c\mutate.mjs` 可整轮复跑，`node D:\a1c\mutate.mjs M62` 可单条复跑。末轮（含 M62、终态测试文件 `test=A6EB515FDFDE…`）结果：**`MUTATION-SUMMARY {"total":32,"allHit":true,"allRestored":true}`**。

| 变异 | FX | 改了什么（落点） | 期望命中用例 | 结果 | 红掉的用例 |
|---|---|---|---|---|---|
| M31 | FX-A1c-01 | combo 线点 x 退回「全宽点标度」xAt(frame,i,lines.length) | `F.bars / F.lines` | RED(命中) → GREEN(还原+SHA✓) | `F.bars / F.lines：同长同 label（违规抛错）`；`F ComboChartOptions / SparklineChartOptions` |
| M32 | FX-78-V2a-1 | STYLE_PREFIX 消费处改成 x-（命名空间漂移） | `H.类名命名空间` | RED(命中) → GREEN(还原+SHA✓) | `A.compact：…`；`A.color：…`；`A.colors：…` 等 **75 条** |
| M33 | FX-78-V2a-2 | hash32 初值 +1（换散列实现） | `E.gradient` | RED(命中) → GREEN(还原+SHA✓) | `E.gradient：渐变填充（id 由渐变参数派生 → 同输入同输出）` |
| M34 | FX-78-V2a-3 | 删掉一条真实用例（it → it.skip） | `H.覆盖清单` | RED(命中) → GREEN(还原+SHA✓) | `H.覆盖清单（机读）：…` |
| M35 | FX-78-V2a-3 | 改一条用例标题（A.compact → X.compact） | `H.覆盖清单` | RED(命中) → GREEN(还原+SHA✓) | `H.覆盖清单（机读）：…` |
| M36 | FX-78-V2a-4.1 | 26 单位避让阈值 → 0 | `A.showValues` | RED(命中) → GREEN(还原+SHA✓) | `A.showValues：true / edge / false 改变数值标签集合` |
| M37 | FX-78-V2a-4.2 | Catmull-Rom 控制点系数 /6 → /5 | `B.smooth` | RED(命中) → GREEN(还原+SHA✓) | `B.smooth：Catmull-Rom 路径，点仍在线上，d 与直线不同` |
| M38 | FX-78-V2a-4.3 | sparkline 涨跌判据 `>=` → `>` | `F.showValue` | RED(命中) → GREEN(还原+SHA✓) | `F.showValue（sparkline）：末尾数值；涨绿跌红` |
| M39 | FX-78-V2a-4.4 | yTicks 收敛口径 `Math.round` → `Math.floor` | `B.yTicks` | RED(命中) → GREEN(还原+SHA✓) | `B.yTicks：false 无刻度；数字收敛 2-6；…` |
| M40 | FX-78-V2a-4.5 | combo `n = bars.length`（lines-only 退化） | `F.bars / F.lines` | RED(命中) → GREEN(还原+SHA✓) | `F.bars / F.lines：同长同 label（违规抛错）` |
| M41 | FX-78-V2a-5.1 | band 域不再跟随 ownScale 主序列 | `B.band` | RED(命中) → GREEN(还原+SHA✓) | `B.band：等长校验 / 任一侧 null 断开 / …` |
| M42 | FX-78-V2a-5.2 | 图例不再排除 `name === ''` | `B.legend` | RED(命中) → GREEN(还原+SHA✓) | `B.legend / B.series[].ownScale：…` |
| M43 | FX-78-V3-01 | `esc()` 退化为恒等 | `H.转义` | RED(命中) → GREEN(还原+SHA✓) | `H.转义：文本/属性出口全部经 escapeHtml（注入 script 标签与引号）` |
| M44 | FX-78-V3-02 | gauge `endAngle` 反向（π(1-f) → π·f） | `E.gauge 弧几何` | RED(命中) → GREEN(还原+SHA✓) | `E.gauge 弧几何：非对称 pct 的端点坐标逐值（pct=50 是两式同值的盲点）` |
| M45 | FX-78-V3-03 | 折线 path 自身去掉 `vector-effect`（circle 仍在） | `H.CHART_STRUCTURE_RULE` | RED(命中) → GREEN(还原+SHA✓) | `H.CHART_STRUCTURE_RULE / CHART_EMPTY_RULE / CHART_COORD_RULE：逐值 + 可观察效果` |
| M46 | FX-78-V3-04 | area 基线 `frame.y1` → `frame.y0` | `B.area` | RED(命中) → GREEN(还原+SHA✓) | `B.area / B.areaOpacity：面积填充与透明度` |
| M47 | FX-78-V3-06 | 阈值 26 → 25（证明不是 25） | `A.showValues` | RED(命中) → GREEN(还原+SHA✓) | `A.showValues：…` |
| M48 | FX-78-V3-06 | 阈值 26 → 27（证明不是 27） | `A.showValues` | RED(命中) → GREEN(还原+SHA✓) | `A.showValues：…` |
| M49 | FX-78-V3-07 | `svgOpen` 删 `role="img" focusable="false"` | `H.移动端满宽` | RED(命中) → GREEN(还原+SHA✓) | `H.移动端满宽：line/combo/scatter 用 preserveAspectRatio="none"（…）` |
| M50 | FX-78-V3-07 | donut 内联 `<svg>` 删 role/focusable | `H.移动端满宽` | RED(命中) → GREEN(还原+SHA✓) | 同上 |
| M51 | FX-78-V3-08 | `EMPTY_HINT` 文案改写 | `H.空态文案与图标` | RED(命中) → GREEN(还原+SHA✓) | `H.空态文案与图标：EMPTY_HINT 逐字 ＋ 📊 图标（8 接口共用）` |
| M52 | FX-78-V3-08 | `EMPTY_ICON` 图标改写 | `H.空态文案与图标` | RED(命中) → GREEN(还原+SHA✓) | 同上 |
| M53 | W6 | `styleId` 缺省值改成 `x-charts` | `H.CHARTS_STYLE_ID` | RED(命中) → GREEN(还原+SHA✓) | `H.CHARTS_STYLE_ID：…`；`H.类名命名空间：…`；`H.buildChartsHelpersJs：…` 等 4 条 |
| M54 | W7 | CSS scatter 点半径规则 `/ 2` → `/ 3` | `G.dotSize` | RED(命中) → GREEN(还原+SHA✓) | `G.dotSize：…`；`H.类名命名空间：…` 等 4 条 |
| M55 | W7 | CSS 移动端折线高度 `150px` → `160px` | `H.移动端满宽` | RED(命中) → GREEN(还原+SHA✓) | `G.dotSize：…`；`H.CHART_BREAKPOINTS：…` 等 6 条 |
| M56 | W8 | `data-gap` 改成 `gap+1` | `C.grouped` | RED(命中) → GREEN(还原+SHA✓) | `C.grouped：…`；`H.CHART_BREAKPOINTS：…` 等 4 条 |
| M57 | W9 | sparkline `points +1` | `H.ChartOutput` | RED(命中) → GREEN(还原+SHA✓) | `H.ChartOutput：4 字段齐备；empty ⇔ points === 0（pct 型例外）` |
| M58 | W10 | 把 `idempotent` probe 改成恒真 | `H.buildChartsHelpersJs` | RED(命中) → GREEN(还原+SHA✓) | `H.buildChartsHelpersJs：IIFE 结构逐行固定 + 幂等自注入 + styleId/prefix 覆盖` |
| M59 | W11 | 派表 `bar: renderLine` | `H.CHART_KINDS` | RED(命中) → GREEN(还原+SHA✓) | `A.height / A.width：…` 等 **24 条** |
| M60 | W12 | 容器根类回到 `'chart'` | `H.类名命名空间` | RED(命中) → GREEN(还原+SHA✓) | `H.类名命名空间：…`；`H.ChartOutput：…` |
| M61 | W17 | `src/charts.ts` 插入模块级 `globalThis.__purity` 引用 | `H.纯度（src 侧）` | RED(命中) → GREEN(还原+SHA✓) | `H.纯度（src 侧）：src/charts.ts 模块代码零 DOM 全局／node:` |
| M62 | FX-A1c-02 | **全部** `Math.round(pct)` → `Math.floor(pct)`（progress 1 处 ＋ gauge 2 处） | `E.pct 取整` | RED(命中) → GREEN(还原+SHA✓) | `E.pct 取整：分数输入按 Math.round（progress／gauge／donut 百分比逐字）`（唯一红，`pass 86 / fail 1`） |

`MUTATION-SUMMARY {"total":32,"hit":32,"survivors":[],"badRestore":[],"anchors":[]}`；V3 的 8 处存活变异对应本表 **M43／M45／M46／M47＋M48（原 26→0 由 M36）／M51／M37／M49＋M50** —— **全部转红**；编排者独立变异（分数 pct 取整）由 **M62** 覆盖。

### 9.5.1 FX-A1c-02（编排者独立变异补丁）：分数 pct 的取整口径

- **现象**：编排者独立脚本对 `dist/charts.js` 做 12 处变异，11 命中、**1 处存活**——把**全部** `Math.round(pct)` 改成 `Math.floor(pct)` 后 `charts.test.mjs` 仍 86/86 绿。根因：原用例的 `pct` 全是整数，或 `40.4` 这类 `round === floor` 的值 → 取整口径无鉴别力。
- **修（只改测试，未动 `src/**`）**：新增用例 `E.pct 取整：分数输入按 Math.round（progress／gauge／donut 百分比逐字）`（`test:944-973`），取 `round !== floor` 的输入：
  - `progress`（`:949-953`）：`66.67 → '67%'`、`66.5 → '67%'`（半值进位）、`33.5 → '34%'`、`0.5 → '1%'`、`99.5 → '100%'`（floor 分别得 66／66／33／0／99）；
  - `gauge`（`:956-962`）：`66.67 → '67%'`、`33.5 → '34%'`，且 `format` 分支断**收到的是取整后的整数**（`pct:66.67` ＋ `format` → `'67 分'`，floor 会得 `'66 分'`）；
  - `data-pct` 反向断言（`:955`／`:963`）：仍为**未取整**的原始值 `'66.67'`（取整不得回写数据属性）；
  - `donut`（`:965-972`）：`1/3 → '33%'`、`2/3 → '67%'`、`1/6 → '17%'`（floor 会得 66%／16%）。
- **变异自证**：**M62**（dist 全部 `Math.round(pct)` → `Math.floor(pct)`）→ 唯一红掉的用例就是本条（`pass 86 / fail 1`）→ 逐字节还原 ＋ SHA✓ → 87/87 绿。
- **精确条数同步**：`titles.length` 86 → **87**；`hitTitles.length` 仍 **74**（新用例标题不绑 `FIELD_TITLES` 字段）。

### 9.6 未完成／待裁定

1. **W13／W14／W15／W16 落在 `test/help.test.mjs`**（`:316` 的 `' checked>'`、`:332` 的 lead 前缀、`:710/724`／`:790` 的 `notEqual(null)`）。本轮硬性可改文件白名单**不含** `help.test.mjs`（也不含 `src/help.ts`），故**未动**——需 HELP 侧（A2 面）返修；其中 W15／W16 已由 V3 判为「可接受」。
2. **W17 的 `src/help.ts` 侧**：本轮只在 `charts.test.mjs` 内自持了 `src/charts.ts` 的纯度断言；`help.test.mjs` 侧的同款断言（V3 建议写法）属 A2 文件，未动。
3. **FX-78-V3-03 的字面表述与实现不符（已按实现改口径）**：V3 建议「对 area／band／regression 各自的 path/line 标签各断一条 vector-effect」——但 area／band／fill 是 `stroke="none"` 的**纯填充**路径，契约 §3.5.1 只要求**描边**元素带 `vector-effect`；对它们断该属性会得到假红。本轮改为：8 个描边元素（折线／网格／Y 刻度／markLine／markLine-v／回归线／sparkline polyline／combo 折线）逐个在**被测标签本身**断 `vector-effect`，纯填充路径断 `stroke="none"`。判据等价（M45 已证明折线 path 自身受约束）。
4. **精确条数需同步**：`titles.length === 87`、`hitTitles.length === 74` 为当前实际值（FIX-A1c §FX-78-V2a-3 要求写死）；后续增删用例／改标题／改 `FIELD_TITLES` 时必须同步这两个数（断言注释已注明）。
5. **V2a-4.5 的 lines-only 期望值随 FX-A1c-01 更新**：V2a 报告记录的旧实测 `d='M14.0 85.0L306.0 8.0'` 是**点标度**产物；按旧版「线点落在柱列容器内 `left:50%`」的语义与编排者裁定，lines-only 同样走 band 标度，现值为 `d='M50.5 123.5L123.5 85.0L196.5 46.5L269.5 8.0'`（`points` 仍为 4，与 V2a 一致）。此处为**口径更新**，非遗漏。

### 9.7 复跑指令（本轮）

```powershell
cd D:\ilife
pnpm exec tsc -b --force                                              # 期望 exit 0
node --test --test-reporter=tap packages/base-render/test/charts.test.mjs   # 期望 tests 87 / pass 87 / fail 0
node --test --test-reporter=tap "packages/base-render/test/*.test.mjs"      # 期望 tests 388 / pass 388 / fail 0
node D:\a1c\mutate.mjs                                                # 期望 MUTATION-SUMMARY total=32 allHit=true allRestored=true
node D:\a1c\srcmut.mjs                                                # 期望 SRC-MUT-SUMMARY {"tscOk":true,"mutRed":true,"restored":true}
```

> 变异驱动器与只读探针均落在**仓外** `D:\a1c\`（`mutate.mjs`／`mutations.json`／`srcmut.mjs`／`probe.mjs`），不落仓内；每次变异后逐字节还原并校验三文件 SHA。
