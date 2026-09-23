---
"base-paint": minor
---

#950 公共组件批：页面级两族新件 ＋ 三处扩参 ＋ 两处结构参数（**冻结面新增 §3.7**，§3.6 两处签名随更新）。

**新增两族（页面级，走根出口；样式由 `pageShapeCss()` 汇总进页，调用方不必另接样式函数）**
- `src/pageNav.ts`＋`pageNavCss.ts`：`renderSegmentedNav`（分段导航：等宽分格／选中实底／图标闭集 `SEG_NAV_ICONS`／`aria-current="page"`／44px 命中区）。
- `src/pageBars.ts`＋`pageBarsCss.ts`：`renderDayStrip`（时间格带：`value: null` ＝ 缺数印 `DAY_STRIP_EMPTY_MARK`、`today` 高亮、带下事实条 `CAPTION_TONES`）、`renderEquationBar`（等式条：两段轨道按 `value/total` 铺满 ＋ 端点读数 ＋ 可选合计）、`renderStateBanner`（态声明条：`STATE_TONES` ＋ 徽标 ＋ 动作位 `data-action-id`）。

**胶囊行（`renderChipRow`）——收口：并回区块层，公共面只留一条路**
- 本批起初在根上另立过一件 `renderChipRow`（入参 `{ chips }`），与 `blocks.ts` 早已有、且产线 8 处调用点在用的那件**同名、同容器类、入参却不兼容**，类型名 `ChipRowInput` 也同名；同一容器类还被两层各定义一次样式（页面层 `.ilife-page-ui .ilife-block-chip-row{margin:0}` 会盖掉区块层的 `margin: 0 0 8px`）。
- 收口做法：`tone` 并进 `blocks.ts` 的 `ChipItemInput`，`role`／`extraClass` 并进它的 `ChipRowInput`，语气三档 CSS 移籍 `blocksCss`（值一字未改），删掉根上第二个实现与页面层那两条 `chip-row` 规则；根出口改为 `export { CHIP_TONES, renderChipRow } from './blocks.js'`，即**两条路径拿到同一个函数**（运行期同一引用，判据件钉住）。
- **旧调用点逐字节不变**：`tone` 不给不出语气类，`role` 不给不出任何 aria 属性（缺省**不是** `list`）；既有 8 处调用点产物与改前逐字相同（判据件写死期望串）。

**扩参（旧调用点产物逐字节不变，两条兼容判据对齐真实产物页）**
- `renderKpiCard`：`value` **可缺省**（判定卡＝值位整格不出）＋ `gap{value,unit}`（「还差 N」徽章）＋ `pending`（值位 `—`、条归零、徽章「未记录」）；`gap×status`／`pending×value` 同槽互斥硬止。
- `renderConclusionBar`：入参支持**串（原样）｜对象**（`tone` 四档 ＋ `badge`）；**去月牙**——左 3px 强调条改由 `::before` 承载（原 `border-left` 与圆角相撞会裁成月牙）。顺带更新 `test/blocks.test.mjs` 的 #434 形态判据（同口径）。
- `renderFactStrip`：`FactItemInput.value` 可给 `null`（缺数 → `FACT_STRIP_MISSING_MARK` ＋ 降调类）＋ `unit` 单位位。
- `ilife-charts`：`ChartCommonOptions` 增 `minPoints`／`minPointsHint`（**缺省不启用 ＝ 旧行为**）：折线／柱／迷你线／散点／组合五支在有效点不足时走既有空态（`CHART_EMPTY_RULE`）；非法值抛 `structure-invalid`（不新增错误码）。

**结构参数**
- `pageUiCss({ column })`：`centered`（缺省＝改前行为）／`wide`(1120)／`full`(满铺)／`locked`(880 且满铺白名单失效)——后两档正替掉页面侧自写的列宽垫片；常量 `PAGE_COLUMNS`／`PAGE_COLUMN_WIDTH_PX`。
- 页壳网格新增 C2 守卫（行内级子件不拉伸）。

**影响面**：`pageShapeCss()` 恒返回非空 CSS，两族样式因此随它进**每一个调用方**的页，与 `pageUi` 开关无关；**看不看得出来**才由 `pageUi` 决定（两族选择器都挂在 `.ilife-page-ui` 下，类名不在页上即死字节）。当刻实测（UTF-8）：`pageNavCss` 1772 字节、`pageBarsCss` 5501 字节。`blocksCss` 里**规则条数不变的是结论条**（同一条规则内部把左强调条由 `border-left` 换成 `::before` 载体），**新增 11 条**（`conclusion::before` ＋ 结论语气四档 ＋ 结论态徽标 ＋ KPI 卡 `gap`／`pending` ＋ 胶囊语气三档）。**版本锁步提醒**：`base-link-core`／`base-render`／`base-combos` 三包发版时须同版本（CI 有 lockstep 断言），本 changeset 只声明 `base-paint`。

证据：`docs/base/base-render/t950-证据.md`（判据 91/91、真组件渲染总验收、行数台账与第四步声明）。
