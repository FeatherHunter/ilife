/** #111 · 运动移植 6 键全文档装配（数据→区块→填充器）。
 *
 * 范围（t71「需移植」之运动 6 项）：`calorie.view.exercise-strength`
 * （exercise_strength：按动作聚合＋重量轨迹）／`calorie.view.exercise-cardio`
 * （exercise_cardio：按类型聚合＋配速）／`calorie.view.exercise-distribution`
 * （exercise_distribution：分类占比＋摄入/TDEE 联动）／
 * `calorie.view.exercise-recap`（exercise_recap：多窗复盘＋TOP5＋一句话）／
 * `calorie.view.exercise-review`（exercise_review：计划 vs 实绩）／
 * `calorie.view.exercise-trend`（exercise_trend：日序列＋周频次＋峰值）。
 * 不碰：process_progress（落地/训记二期，O3/oosLanding/oosXunji 命中但不执行，
 * 路由不动）／营养 4（→ #112）／趋势 2＋其他 6（→ #113）／47 页已有（#108–#110 已关）。
 *
 * 做法（#104 §4 用法，照抄 trendDocs 头 90 行）：内容 = base-paint/blocks 12 区块
 * （B-01 壳／B-02 KPI／B-03 表／B-04 图／B-05 列表／B-08 折叠／B-09 参数表单／
 * B-11 复制区），文档 = fillTemplate 包裹（资产裸文本＋填充器包裹；
 * sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs，图表 CSS 由其运行时注入）。
 * 复制文本一律 buildDataText（#77 契约）：stat 投影 metrics 只收确定数字。
 * 本层不做取数（数据由 render/exercisePort.ts 备齐），不返空（缺失由数据层抛 missing-data）。
 *
 * **#453（地图 #156 页面族第 4 票，形状照已验样板 #423）**：分布／力量／有氧三支换融合版式——
 * 卡清单（`Card`）各自判空＋`renderTocBlock` 页内导航＋`renderCaliberLine` 口径行＋
 * `shared/sourceLine.ts` 来源脚注＋`assembleDocPage({printable:true})`（#448 透传位）＋
 * `shared/copyArea.ts` 三格式复制＋`shared/emptyGuide.ts` 空态带下一句；类别色只走
 * `exercise/categoryColors.ts` 的 `categoryColor()`。**#454（第 5 票）把趋势（`buildTrendDoc`）
 * 与复盘（`buildRecapDoc`）两支也换成同一套融合版式**（卡清单逐卡判空＋五窗同版＋逐日表截断明示）；
 * `buildReviewDoc`（计划复盘）仍走老版式。本族不接四态头与变更卡载具（那是写操作器件，
 * 只读页硬套会印出与事实不符的态标签）。
 */
import {
  renderCaliberLine,
  renderChartBlock,
  renderChips,
  renderCopyBlock,
  renderDataTable,
  renderDisclosure,
  renderDistributionRows,
  renderFeedbackBlock,
  renderKpiGrid,
  renderListRows,
  renderParamForm,
  renderTocBlock,
} from 'base-paint/blocks';
import { buildDataText, buildLogText } from 'base-paint';
import type { DataTextInput } from 'base-paint';
import { categoryColor } from '../exercise/categoryColors.js';
import { exerciseUiCss, factStrip, fmtNum, windowStrip } from '../exercise/sportUi.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog, dataCopyArea } from '../shared/copyArea.js';
import { emptyGuide } from '../shared/emptyGuide.js';
import { nowStamp } from './receipt.js';
import type {
  CardioView,
  DistributionView,
  RecapView,
  ReviewView,
  StrengthView,
  TrendView,
} from './exercisePort.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·运动移植';

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

function fmtPace(p: number | null | undefined): string {
  if (p === null || p === undefined) return '—';
  return fmtNum(p, 1) + ' 分/km';
}

/** 逐条记录表（100 条截断明示，沿 R3 口径；备注仅展示，不做筛选维度）。 */
const RECORD_CAP = 100;

function windowForm(start: string, end: string, extra: string): string {
  return renderParamForm({
    fields: [
      { name: 'start', label: '开始', value: start },
      { name: 'end', label: '结束', value: end },
    ],
    description: extra,
  });
}

/* ── #453 融合版式共用件（分布／力量／有氧三页共用；形状照 #423 回执族样板） ── */

/** 页内一张卡（`id` 即页内导航的锚点，导航项按同一份清单生成）＝锚点 id ＋ 区块 HTML。
 *  `head`＝这一节的**可见节标题**（#268 终审席 P1-6／K6：盘族五页原来只有折线卡有卡题，
 *  另外三节的节身份只住在顶部导航的胶囊里，页面正文里读不到「这三条彩条／五枚胶囊叫什么」）。
 *  给 `head` 的节在正文里印一个 `<h2>`（样式见 `S544_CSS`），不给的节仍只有导航 — 逐节按需。 */
interface Card { readonly id: string; readonly label: string; readonly html: string; readonly head?: string }

function shell(card: Card): string {
  return '<section id="' + card.id + '">'
    + (card.head === undefined ? '' : '<h2>' + card.head + '</h2>')
    + card.html + '</section>';
}

/** 窗口卡：这一页看的是哪一段（开始／结束两个真日期）。 */
function windowCard(start: string, end: string, description: string): Card {
  return { id: 'sec-window', label: '窗口', html: windowForm(start, end, description) };
}

/** 数值格的人话写法：缺值一律「—」（不空着、也不编 0）；`unit` 空串即不带单位。
 *  #544：显示层取整走 `sportUi.fmtNum()`（整数不带小数点；库内浮点尘不上屏）。
 *  计数类单位（次／组／条／个／分钟／空串）取 0 位小数，量值类（卡／kg／km／公里）取 1 位。 */
const INT_UNITS: ReadonlySet<string> = new Set(['', '次', '组', '条', '个', '分钟', '卡']);
function numUnit(v: number | null | undefined, unit: string): string {
  if (v === null || v === undefined) return '—';
  const n = fmtNum(v, INT_UNITS.has(unit) ? 0 : 1);
  return unit === '' ? n : n + ' ' + unit;
}

/** 窗内天数（闭区间；只做天数差，不当取数口径）——窗口条胶囊的唯一出处。 */
function windowDays(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
}

/** 折线纵轴三件套（#544 视觉第 1 轮整改；形状照 `analysis/multiTrendPage.ts:65` 的 `weightAxisOf`）。
 *
 *  ① **刻度**：共享层折线**缺省不给刻度标注**（`spec/charts.ts` 的 `yTicks` 缺省 → 0 条，图中只剩网格线），
 *     不传就读不出量级 —— 同族先例 `analysis-deficit-385` 已把这条定成「本页漏传参数，本页补 `yTicks:3`」，
 *     本族三张折线照办；`format` 给整数原样、带小数的一位（口径与 KPI 卡同：读数不印浮点尘）。
 *  ② **量程**：一律显式给 `yMin`／`yMax`（见 `valueAxisOf()`），理由有三条，都是量程的语义而不是观感：
 *     ① **最小值恒为 0**：这三条纵轴量的都是「消耗了多少卡／举起了多少 kg」，负值不存在——
 *        原来的 `lo` 由共享层缺省域「数据两端各外扩 6%」算出来，窗内最小日要是 0，`lo` 就成了负数
 *        （#268 终审席打回项 P1-5：38／39 两页纵轴最低刻度印出 `-87.4`）；
 *     ② **刻度落在整数上**：不给界时刻度值是「域两端内插」的产物，实测印出过 `1065.1`／`2217.7`
 *        （38）、`31.4`／`1118.0`／`2204.5`（37）这类带 `.0`／`.5` 尾巴的读数——刻度是**刻度**，不是量出来的数；
 *     ③ **线不贴上下沿**：显式给界会让共享层的「峰值余量」（`lineDomainOf` 只补派生域）失效，
 *        故峰值与顶端刻度之间那点余量由 `setAxisRange()` 自己保证。 */
function valueAxisOf(values: readonly (number | null)[]): {
  readonly yTicks: number;
  readonly yMin: number;
  readonly yMax: number;
  readonly format: (v: number) => string;
} {
  // 整数原样、小数一位：刻度是取整后的整数，`toFixed(1)` 只是兜住极小量程的尾巴（不印浮点尘）。
  const format = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  // 数的顶点走 `reduce`（不铺参：窗内最多 366 个点，`Math.max(...nums)` 会压栈）。
  // 全空或全零：`maxOf` 取 1，域退化成 0…1 而不是 0…0（量程为 0 会让刻度三条叠在同一处）。
  let peak = 0;
  for (const v of nums) if (v > peak) peak = v;
  const maxOf = peak > 0 ? peak : 1;
  // 刻度＝`hi·i/(条数−1)`：`hi` 是 `step×(条数−1)` 的整数倍，三条刻度才全是步长的整数倍
  // （否则会印出 `600.2`／`1200.4` 这种「峰值本身」——那是读数，不是刻度）。
  return { yTicks: TICK_COUNT, yMin: 0, yMax: axisHeightOf(maxOf), format };
}

/** 纵轴刻度条数（#544：三条 —— 共享层 `yTicks` 的缺省是 0 条，不显式给就一个刻度都没有）。 */
const TICK_COUNT = 3;

/** 线位下限／上限：峰值至少离顶端刻度一档边距（0.88），也别把自己缩在图高一角（0.45）。 */
const LINE_TOP_LIMIT = 0.88;
const LINE_BOTTOM_LIMIT = 0.45;

/** 刻度步长候选序列（1／2／5×10ᵏ 里 ≥ 入参的最小一个）。 */
function niceStepAtOrAbove(v: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 5, 10]) if (v <= m * mag) return Math.max(1, m * mag);
  return Math.max(1, 10 * mag);
}

/** 上界（＝顶端那条刻度）：**让峰值落在图高 0.60 处**是这里的唯一目标——量程与刻度是同一件事的两面
 *  （`hi = step×(条数−1)`），故直接按「哪一档 1／2／5×10ᵏ 步长把峰值放在最合适的位置」来挑：
 *  比值 `peak/hi` 落在 0.45–0.88 之间给低分（离 0.60 越近越低），越界按距离重罚，
 *  **步长不是整数再加一点罚**（刻度值会带 `.5` 尾巴，那正是 K2 那条打回项），取罚分最小、并列取较大步长。
 *
 *  为什么步长非要是 1／2／5×10ᵏ：三条刻度＝`hi·i/2`，只有 `hi` 是步长整数倍时刻度才全是整数
 *  （否则会印出 `600.2`／`1200.4` 这种「峰值本身」——那是读数，不是刻度）。
 *  例：峰值 500 ⇒ `0／500／1000`；峰值 1250 ⇒ `0／1000／2000`；峰值 2753 ⇒ `0／2000／4000`。 */
function axisHeightOf(maxOf: number): number {
  const base = niceStepAtOrAbove(Math.max(maxOf, 1) * 0.4);
  let best = { step: base, score: Infinity };
  for (const k of [0.5, 1, 2, 5, 10, 20, 50, 100, 200]) {
    const step = Math.max(1, base * k);
    if (step * (TICK_COUNT - 1) < maxOf) continue;       // 刻度带撑不住峰值 ⇒ 这一档不用看
    const ratio = maxOf / (step * (TICK_COUNT - 1));
    const integer = Number.isInteger(step) ? 0 : 0.1;    // 刻度值带小数尾巴（`2204.5` 那类）要罚
    const score = ratio > LINE_TOP_LIMIT || ratio < LINE_BOTTOM_LIMIT
      ? Math.abs(ratio - 0.6) * 2 + integer
      : Math.abs(ratio - 0.6) * 0.1 + integer;
    if (score <= best.score) best = { step, score };
  }
  return best.step * (TICK_COUNT - 1);
}

/** 折线卡的横轴日期标尺（#268 终审席 K4 的处置，第 2 版）。
 *
 *  **为什么不加这把尺的初版被视觉席打回**（复评 r3：39 页桌面表尺标签压在 07-10 一带、读成
 *  `02-2704-01 05-05 …`）：初版一页印 **7** 条（含窗口首尾两条），条与条只隔 4.05% 宽（桌面 36px、
 *  手机 20px），而标签本身就要 31px —— 必然叠字；且首尾两条与折线**自带**的首尾横轴标签逐字重复
 *  （共享层折线的 X 标签口径是 `'edge'`）。
 *
 *  本版的形状：**只出窗口内部 5 条**（首尾让给折线自己的那两条），按**等宽槽**摆（`flex:1 1 0`），
 *  槽宽＝容器宽÷5（桌面 176px、手机 71px），标签 26px ⇒ 相邻最小空档约 45px，三档都不叠。
 *  一把尺要两样东西才算「轴」：一条细轴线 ＋ 等距刻度点，故每个槽里自带一段轴线与一个小圆点，
 *  尺因此读成一条时间轴，而不是一行浮在空中的日期。
 *
 *  退化：点数 < 45（短窗）不出——那一档日期本来就稀，多点两条标签反而添乱；点数不整除 5 时
 *  取 4 条（见 `INTERIOR_COUNT`）。 */
const RULER_MIN_DAYS = 45;

/** 标尺槽数：内部日期的枚数（首尾归折线自己的标签；5 条在 390 档仍有约 45px 空档）。 */
const INTERIOR_COUNT = 5;

/** 折线块画布容器的开标签（日期轴从**结构位**注入，见 `withXRuler`）。 */
const S544_CANVAS_OPEN = '<div class="ilife-block-chart-block-canvas">';

/** 日期轴的槽串（只出窗口内部几条日期；取数与退化见 `RULER_MIN_DAYS`）。 */
function xRulerOf(items: ReadonlyArray<{ readonly label: string }>): string {
  const n = items.length;
  if (n < RULER_MIN_DAYS) return '';
  const count = n % INTERIOR_COUNT === 0 ? INTERIOR_COUNT - 1 : INTERIOR_COUNT;
  const cells: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    const idx = Math.round((n - 1) * (i / (count + 1)));
    const label = items[idx] === undefined ? '' : items[idx].label;   // 逐字复用图上那几条日期
    cells.push('<span class="sui-xruler-t"><i></i>' + label + '</span>');
  }
  return '<div class="sui-xruler" aria-hidden="true">' + cells.join('') + '</div>';
}

/** 折线卡 ＋ 日期轴（#268 K4 第二版）：标尺**必须挂在卡片内**（视觉复评 r3b：初版挂在卡外，
 *  整条轴线比绘图区左宽 100px、还把卡片下边框顶出去），落点＝画布容器的**末尾**（SVG 之后）。
 *  `renderChartBlock` 的 title 只会进 `esc()` 后的文本节点（哨兵都逃不出来），故只从结构位注入。 */
function withXRuler(chart: string, items: ReadonlyArray<{ readonly label: string }>): string {
  const ruler = xRulerOf(items);
  if (ruler === '') return chart;
  const open = chart.indexOf(S544_CANVAS_OPEN);
  const end = chart.lastIndexOf('</div>');              // 容器的收标签＝整卡的收标签
  if (open === -1 || end <= open) return chart;         // 结构变了就退回不带轴（不硬塞）
  return chart.slice(0, end) + ruler + chart.slice(end);
}

/** 本族页内小样式（#544）。落本件常量，不新开样式件；`<style>` 段不进可见文本，探针无感。
 *  **#544 视觉第 1 轮整改三处**（都在本件内联规则里做，不碰共用层）：
 *  ① 窄屏页内导航：共享页框在 ≤640 把胶囊轨切成横滑（`nowrap ＋ overflow-x:auto`，滚动条还被藏），
 *     实测 390 档第 5、6 枚胶囊被拦腰切断且无滚动提示 —— 本族窄屏改回**换行铺开**（与桌面同规则）；
 *  ② 窗口卡的「开始／结束」两格是只读回显（字段本身由 `exercise-port-111` 钉死，不能删），
 *     但共用件给每格 `margin:8px 0`，桌面档拉出约 200px 空洞 —— 本族把它收成两格一行；
 *  ③ 窄屏分布条给 4px 下沿（`K5`：占比 <1% 的条实渲不到 1px，肉眼读成空行）。
 *
 *  **#544 终审席（票 #268 §4／§5）四条打回项**也落在这一段（都不出本件）：
 *  ① `E1` 触摸目标：本族页级规则原写 `min-height:38px`，把 #525 配方给全宽档的 44px **压下来了**
 *     （实测 31–39 九页输入框 1440 档 434×38）——改回 44px（＝ HELP 参照页与 `.ilife-copy-btn` 同值）；
 *  ② `K1` 字号混用：原本只把 `#sec-figures` **首卡**值放大到 28px，一排四卡字号 28／22 混用、基线错开——
 *     整排退回公共层那一档 22px（同批 01–30 页的读数），本段不再改 KPI 字号；
 *  ③ `K5` 细条：`renderDistributionRows` 的填充宽＝占比（行内联 `width:<pct>%`，共用件只收百分比），
 *     给 `.ilife-block-dist-row-fill` 加 4px 下限——**几何在 CSS 层解决**，不改共用件的入参口径，
 *     也不在页面里新算第二个百分比；
 *  ④ `P1-6／K6` 三节无可见标题（核心数字／类型分布／高频运动）：节标题由 `shell()` 写进 `<section>`
 *     首个子节点，样式落本段 `#sec-figures > h2,…` 一条（沿用公共层卡题那一档：15px/700）。 */
const S544_CSS = '<style>'
  + '@media (max-width:820px){.ilife-page .ilife-block-toc{flex-wrap:wrap;overflow-x:visible}'
  + '.ilife-page .ilife-block-toc a{flex:0 1 auto}}'
  + '#sec-window .ilife-block-param-form{margin:12px 0 0}'
  + '#sec-window .ilife-block-param-form-field{display:inline-block;width:calc(50% - 6px);margin:6px 0}'
  + '#sec-window .ilife-block-param-form-field + .ilife-block-param-form-field{margin-left:12px}'
  + '#sec-window .ilife-block-param-form-input{min-height:44px}'
  + '.ilife-page .ilife-block-dist-row-fill{min-width:4px}'
  // 日期轴（#268 K4 第二版）：一条细轴线 ＋ 等宽槽里的刻度点与日期。轴线与刻度点必须是
  // **同一层两个元素**（同一层各自的伪元素会互相盖住），刻度的圆点用 `i` 的伪元素画。
  // 内距**按百分比**（不能写死 px）：折线 SVG 的绘图区两侧在 viewBox 里的位置是定值
  // （`charts.ts`：x0＝58、x1＝566，viewBox 宽 580），而 SVG 盒宽随卡片变（桌面 850px、手机 328px）
  // ⇒ 左＝58/580＝10%，右＝1−566/580＝2.414%。`padding` 里再让出一半槽宽（5 个槽的槽心因此落到
  // 58＋槽宽×(i−0.5)，与绘图区 1/6…5/6 的锚点同列）。写成定值 px 时手机档会偏 25px（≈18 天）——
  // 视觉复评 r3b／r3c 连量两轮的那一笔。
  + '.sui-xruler{position:relative;display:flex;align-items:flex-start;margin:2px 2.414% 0 10%;'
  + 'padding-left:4%;padding-right:4%}'
  + '.sui-xruler::before{content:"";position:absolute;left:0;right:0;top:3px;height:1px;background:var(--line)}'
  + '.sui-xruler-t{position:relative;flex:1 1 0;min-width:26px;text-align:center;font-size:11px;'
  + 'line-height:1.3;color:var(--fg2);font-variant-numeric:tabular-nums;white-space:nowrap}'
  + '.sui-xruler-t > i{position:relative;display:inline-block;width:7px;height:7px}'
  + '.sui-xruler-t > i::before{content:"";position:absolute;left:3px;top:0;width:1px;height:3px;background:var(--line)}'
  + '.sui-xruler-t > i::after{content:"";position:absolute;left:1.5px;top:3px;width:4px;height:4px;'
  + 'border-radius:50%;background:var(--fg3)}'
  + '#sec-figures > h2,#sec-category > h2,#sec-badges > h2{margin:0;font-size:15px;font-weight:700;color:var(--fg)}'
  + '</style>';

/** 来源脚注卡（#544 形状化，照 #523 的 `footFacts`）：键值行「数据来源／窗口／记录数」，
 *  三个独立文本节点，不再产 `数据来源 · <来源> · 起 → 止 · 共 N 条` 那种 `·` 串，
 *  来源名给读者话（库表名只留复制载荷里）。共用层口径统一归 #470。 */
function footFacts(source: string, start: string, end: string, count: number): Card {
  return {
    id: 'sec-source',
    label: '数据来源',
    html: factStrip([
      { k: '数据来源', v: source },
      { k: '窗口', v: start + ' → ' + end },
      { k: '记录数', v: '共 ' + fmtNum(count, 0) + ' 条' },
    ]),
  };
}

/** 页尾装配（#544，照 #523 的 `pageBody` 顺序）：页内导航 ＋ 口径行（一条事实一行）
 *  ＋ 卡 ＋ 三格式复制区（五页装配的唯一出口，免得各页抄一遍）。
 *  页内样式（`exerciseUiCss`＋本族小样式）与窗口条由各页组在 `content` 首两项（同 #523）。 */
function finishPage(cards: readonly Card[], calibers: readonly string[], envelopeKey: string,
  metrics: Record<string, number | null | undefined>): string {
  return [
    renderTocBlock({ items: cards.map((c) => ({ id: c.id, text: c.label })) }),
    calibers.map((t) => renderCaliberLine(t)).join(''),
    cards.map(shell).join(''),
    copyArea({
      data: {
        envelope: {
          version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: envelopeKey,
          data: { metrics: metricsOf(metrics) },
        },
      },
    }),
  ].join('');
}

/** 库内分类 → 类别色键（`categoryColors.ts` 的四键）；表外分类不给键。 */
const CATEGORY_KEYS: Record<string, string> = { 力量: 'strength', 有氧: 'cardio', 柔韧: 'flex', 日常: 'daily' };

/** 分类色：只从 `categoryColor()`（技能层单源色表）取 hex；表外分类返回 `{}`
 *  （不给色＝区块回落到冻结 token 缺省色，本层不写第二份色表、也不写 token 名）。 */
function colorOf(category: string): { readonly color?: string } {
  const key = CATEGORY_KEYS[category];
  const hex = key === undefined ? undefined : categoryColor(key);
  return hex === undefined ? {} : { color: hex };
}

/* ── 力量训练总览（exercise_strength.html 对照：#453 融合版式：动作表＋重量轨迹＋逐条记录） ── */

/** 力量页的来源句（读者话；库表名不上屏）。 */
const STRENGTH_SOURCE = '运动记录（本窗未删除的力量行）';

/** 力量页口径行（#544：一条事实一行；第一条保留 `口径：` 前缀，回归判据读它）。 */
const STRENGTH_CALIBERS: readonly string[] = [
  '口径：组数＝本窗动作记录条数',
  '总重量＝逐条重量乘次数累加，缺一即显「—」',
  '总次数＝本窗各条次数之和',
];

export function buildStrengthDoc(v: StrengthView): string {
  const hasRows = v.byMovement.length > 0;
  const cards: Card[] = [
    windowCard(v.start, v.end, '只数分类为力量的记录。库内分类实填优先，缺失按名推断。配速与时长口径不在此页'),
    {
      id: 'sec-figures',
      label: '核心数字', head: '核心数字',
      // #544：主角（总重量）排首卡吃 28px；窗口与口径事实住窗口条与口径行，卡里只报数。
      html: renderKpiGrid([
        { label: '总重量', value: numUnit(v.totalVolumeKg, 'kg') },
        { label: '总次数', value: numUnit(v.totalReps, '次') },
        { label: '动作数', value: String(v.movementCount), unit: '个' },
        { label: '总组数', value: String(v.totalSets), unit: '组' },
      ]),
    },
  ];
  // 口径写在动作表的标题里（票面第 2 条）：窗口 ＋ 「单侧口径 Σkg×次数」，全页只此一处。
  if (hasRows) {
    cards.push({
      id: 'sec-table',
      label: '按动作聚合',
      html: renderDataTable({
        columns: [
          { key: 'movement', label: '动作' },
          { key: 'sets', label: '组数', align: 'right' },
          { key: 'volumeKg', label: '总重量', align: 'right' },
          { key: 'reps', label: '总次数', align: 'right' },
        ],
        rows: v.byMovement.map((m) => ({
          movement: m.movement,
          sets: numUnit(m.sets, '组'),
          volumeKg: numUnit(m.volumeKg, 'kg'),
          reps: numUnit(m.reps, '次'),
        })),
        caption: '按动作聚合（' + v.start + ' ~ ' + v.end + '）。单侧口径 Σkg×次数：逐条重量乘次数累加，'
          + '重量或次数缺一即显「—」',
      }),
    });
  }
  const trail = v.trail.filter((p) => p.volumeKg !== null);
  const trailItems = trail.map((p) => ({ label: p.date.slice(5), value: Number(fmtNum(p.volumeKg)) }));
  const charts = trailItems.length > 0;
  if (charts) {
    cards.push({
      id: 'sec-chart',
      label: '重量轨迹',
      html: renderChartBlock({
        kind: 'line',
        title: '重量轨迹（近 10 个训练日）',
        // #544：纵轴刻度与量程走 `valueAxisOf()`（全等序列不再贴底，同族先例见该函数注释）。
        input: { items: trailItems, options: valueAxisOf(trailItems.map((p) => p.value)) },
      }),
    });
  }
  if (hasRows) {
    const total = v.rows.length;
    cards.push({
      id: 'sec-detail',
      label: '逐条记录',
      html: renderDataTable({
        columns: [
          { key: 'date', label: '日期' },
          { key: 'type', label: '动作' },
          { key: 'load', label: '重量×次数' },
          { key: 'note', label: '备注' },
        ],
        rows: v.rows.slice(0, RECORD_CAP).map((r) => ({
          date: r.date,
          type: r.type,
          load: numUnit(r.loadKg, 'kg') + '×' + numUnit(r.reps, ''),
          note: r.note.trim() === '' ? '—' : r.note,
        })),
        caption: '力量逐条记录（共 ' + total + ' 条'
          + (total > RECORD_CAP ? '，本页只列前 ' + RECORD_CAP + ' 条' : '') + '）',
      }),
    });
  } else {
    cards.push({
      id: 'sec-empty',
      label: '按动作聚合',
      html: emptyGuide({ icon: '🏋️', text: '本窗还没有力量训练记录', hint: '说「记力量训练」就能记下第一条' }),
    });
  }
  cards.push(footFacts(STRENGTH_SOURCE, v.start, v.end, v.rows.length));
  return assembleDocPage({
    docTitle: '卡路里 力量训练总览',
    title: '力量训练总览',
    // #544 视觉第 1 轮：眉标曾试改成与 H1 逐字一致（`力量训练总览`），实测撞 `exercise-accept-267.test.mjs:528`
    // 的「眉标＝它自己那一族」钉子（`'力量训练总览' !== '运动力量总览'`）——那件不在本票写集，故**回退**，
    // 两处命名并存记进证据件 §八（转票处置，本票不自行放宽别席判据）。
    eyebrow: '力量训练总览',
    subtitle: '按动作聚合＋重量轨迹（缺值显「—」，不编数）',
    content: exerciseUiCss() + S544_CSS
      + windowStrip(v.start, v.end, windowDays(v.start, v.end) + ' 天')
      + finishPage(cards, STRENGTH_CALIBERS, '力量训练总览', {
        movementCount: v.movementCount, totalSets: v.totalSets,
        totalVolumeKg: v.totalVolumeKg, totalReps: v.totalReps,
      }),
    charts,
    printable: true,
    pageUi: true,
  });
}

/* ── 有氧训练总览（exercise_cardio.html 对照：#453 融合版式：类型表＋类型图＋逐条记录） ── */

/** 有氧页的来源句（读者话；库表名不上屏）。 */
const CARDIO_SOURCE = '运动记录（本窗未删除的有氧行）';

/** 有氧页口径行（#544：一条事实一行；第一条保留 `口径：` 前缀，回归判据读它）。 */
const CARDIO_CALIBERS: readonly string[] = [
  '口径：次数＝本窗记录条数',
  '时长＝分钟，距离＝km',
  '步速＝分钟÷km，没有距离就不算步速',
  '缺一格显「—」，不空着也不编 0',
];

export function buildCardioDoc(v: CardioView): string {
  const hasRows = v.byType.length > 0;
  const cards: Card[] = [
    windowCard(v.start, v.end, '只数分类为有氧的记录。库内分类实填优先，缺失按名推断。柔韧与日常不在此页'),
    {
      id: 'sec-figures',
      label: '核心数字', head: '核心数字',
      // #544：主角（总时长）排首卡吃 28px；窗口与口径事实住窗口条与口径行，卡里只报数。
      html: renderKpiGrid([
        { label: '总时长', value: numUnit(v.totalMinutes, '分钟') },
        { label: '总距离', value: numUnit(v.totalDistanceKm, 'km') },
        { label: '次数', value: String(v.sessions), unit: '次' },
        { label: '平均步速', value: fmtPace(v.avgPaceMinPerKm) },
      ]),
    },
  ];
  if (hasRows) {
    cards.push({
      id: 'sec-table',
      label: '按类型聚合',
      html: renderDataTable({
        columns: [
          { key: 'type', label: '类型' },
          { key: 'sessions', label: '次数', align: 'right' },
          { key: 'minutes', label: '时长', align: 'right' },
          { key: 'km', label: '距离', align: 'right' },
          { key: 'pace', label: '步速', align: 'right' },
        ],
        rows: v.byType.map((t) => ({
          type: t.type,
          sessions: numUnit(t.sessions, '次'),
          minutes: numUnit(t.minutes, '分钟'),
          km: numUnit(t.distanceKm, 'km'),
          pace: fmtPace(t.paceMinPerKm),
        })),
        caption: '按类型聚合。缺一格显「—」，不空着',
      }),
    });
    cards.push({
      id: 'sec-chart',
      label: '按类型次数',
      html: renderChartBlock({
        kind: 'bar',
        title: '按类型次数',
        input: { items: v.byType.map((t) => ({ label: t.type, value: t.sessions })) },
      }),
    });
    cards.push({
      id: 'sec-detail',
      label: '逐条记录',
      html: renderDataTable({
        columns: [
          { key: 'date', label: '日期' },
          { key: 'type', label: '类型' },
          { key: 'minutes', label: '时长' },
          { key: 'km', label: '距离' },
          { key: 'note', label: '备注' },
        ],
        rows: v.rows.slice(0, RECORD_CAP).map((r) => ({
          date: r.date,
          type: r.type,
          minutes: numUnit(r.minutes, '分钟'),
          km: numUnit(r.distanceKm, 'km'),
          note: r.note.trim() === '' ? '—' : r.note,
        })),
        caption: '有氧逐条记录（共 ' + v.rows.length + ' 条'
          + (v.rows.length > RECORD_CAP ? '，本页只列前 ' + RECORD_CAP + ' 条' : '') + '）',
      }),
    });
  } else {
    cards.push({
      id: 'sec-empty',
      label: '按类型聚合',
      html: emptyGuide({ icon: '🏃', text: '本窗还没有有氧运动记录', hint: '说「记有氧运动」就能记下第一条' }),
    });
  }
  cards.push(footFacts(CARDIO_SOURCE, v.start, v.end, v.sessions));
  return assembleDocPage({
    docTitle: '卡路里 有氧训练总览',
    title: '有氧训练总览',
    // #544 视觉第 1 轮：同力量页，眉标与 H1 并存两名是既成钉子（`exercise-accept-267.test.mjs:528`），本票回退。
    eyebrow: '有氧训练总览',
    subtitle: '按类型聚合＋步速（没有距离就不算步速，缺值显「—」）',
    content: exerciseUiCss() + S544_CSS
      + windowStrip(v.start, v.end, windowDays(v.start, v.end) + ' 天')
      + finishPage(cards, CARDIO_CALIBERS, '有氧训练总览', {
        sessions: v.sessions, totalMinutes: v.totalMinutes,
        totalDistanceKm: v.totalDistanceKm, avgPaceMinPerKm: v.avgPaceMinPerKm,
      }),
    charts: hasRows,
    printable: true,
    pageUi: true,
  });
}

/* ── 运动类型分布（exercise_distribution.html 对照：#453 融合版式：占比迷你条＋分类表＋共享图表） ── */

/** 分布页的来源句（读者话；库表名不上屏）。 */
const DIST_SOURCE = '运动记录（本窗未删除的行）';

/** 分布页口径行（#544：一条事实一行；第一条保留 `口径：` 前缀，回归判据读它）。 */
const DIST_CALIBERS: readonly string[] = [
  '口径：占比＝该类热量除以本窗合计热量',
  '次数＝本窗记录条数',
  '时长＝分钟，没有时长的分类不进合计',
  '缺口＝TDEE×天＋运动−摄入，缺摄入即显「—」',
];

export function buildDistributionDoc(v: DistributionView): string {
  const hasRows = v.buckets.length > 0;
  // 合计行：四类桶逐项累加；时长只在有已知值的桶间累加（缺值不进合计，也不印假 0）。
  let totalMinutes = 0;
  let minutesKnown = false;
  for (const b of v.buckets) {
    if (b.minutes !== null) {
      totalMinutes += b.minutes;
      minutesKnown = true;
    }
  }
  const share = (n: number | null): string => (n === null ? '—' : String(n) + '%');
  const cards: Card[] = [
    windowCard(v.start, v.end, '分类先看库内填写，四类之外归入其他。占比按该类热量占本窗合计'),
    {
      id: 'sec-figures',
      label: '核心数字', head: '核心数字',
      // #544：主角（总消耗）排首卡吃 28px；窗口天数住窗口条胶囊，会话卡只报活跃天数。
      html: renderKpiGrid([
        { label: '总消耗', value: numUnit(v.totalBurned, '卡') },
        { label: '会话', value: String(v.sessions), unit: '次', detail: '活跃 ' + v.activeDays + ' 天' },
        { label: '摄入', value: numUnit(v.intakeCal, '卡'),
          // #544 视觉第 1 轮：有值时不再挂「没有饮食记录即「—」」这句 fallback 说明
          // （有值却写「没有饮食记录」＝自相矛盾）；缺值那一支才说为什么是「—」。
          detail: v.intakeCal === null ? '窗内没有饮食记录' : '窗内饮食合计' },
        { label: '缺口', value: numUnit(v.deficit, '卡') },
      ]),
    },
  ];
  if (hasRows) {
    // 分类占比：迷你条与数字同格；条色走 `categoryColor()` 的 hex（四类色不在此处另写一份）。
    cards.push({
      id: 'sec-ratio',
      label: '分类占比', head: '分类占比',
      html: renderDistributionRows({
        rows: v.buckets.map((b) => ({
          label: b.category,
          value: share(b.shareByBurned),
          pct: b.shareByBurned ?? 0,
          ...colorOf(b.category),
        })),
      }),
    });
    cards.push({
      id: 'sec-table',
      label: '分类明细',
      html: renderDataTable({
        columns: [
          { key: 'category', label: '分类' },
          { key: 'sessions', label: '次数', align: 'right' },
          { key: 'burned', label: '热量', align: 'right' },
          { key: 'share', label: '占比', align: 'right' },
          { key: 'minutes', label: '时长', align: 'right' },
        ],
        rows: [
          ...v.buckets.map((b) => ({
            category: b.category,
            sessions: numUnit(b.sessions, '次'),
            burned: numUnit(b.burned, '卡'),
            share: share(b.shareByBurned),
            minutes: numUnit(b.minutes, '分钟'),
          })),
          {
            category: '合计',
            sessions: numUnit(v.sessions, '次'),
            burned: numUnit(v.totalBurned, '卡'),
            share: '100%',
            minutes: numUnit(minutesKnown ? totalMinutes : null, '分钟'),
          },
        ],
        caption: '分类明细（' + v.start + ' ~ ' + v.end + '，末行为合计）',
      }),
    });
    cards.push({
      id: 'sec-chart',
      label: '按分类热量分布',
      html: renderChartBlock({
        kind: 'bar',
        title: '按分类热量分布',
        input: { items: v.buckets.map((b) => ({ label: b.category, value: Number(fmtNum(b.burned, 0)) })) },
      }),
    });
    cards.push({
      id: 'sec-link',
      label: '摄入/TDEE 联动',
      html: renderDisclosure({
        title: '摄入/TDEE 联动（运动贡献）',
        contentHtml: renderListRows({
          items: [
            { left: '摄入合计', main: numUnit(v.intakeCal, '卡'), right: v.days + ' 天' },
            { left: '运动消耗', main: numUnit(v.totalBurned, '卡'), right: v.sessions + ' 次' },
            { left: 'TDEE 合计', main: numUnit(v.tdeeTotal, '卡'), right: '档案静态值×天' },
            { left: '缺口', main: numUnit(v.deficit, '卡'), right: v.deficit === null ? '缺摄入未算' : 'TDEE＋运动−摄入' },
          ],
        }),
      }),
    });
  } else {
    cards.push({
      id: 'sec-empty',
      label: '分类明细',
      html: emptyGuide({ icon: '📊', text: '本窗还没有运动记录', hint: '说「记运动」就能记下第一条' }),
    });
  }
  cards.push(footFacts(DIST_SOURCE, v.start, v.end, v.sessions));
  return assembleDocPage({
    docTitle: '卡路里 运动类型分布',
    title: '运动类型分布',
    eyebrow: '运动类型分布',
    subtitle: '分类占比＋摄入/TDEE 联动（缺摄入不编缺口，缺值显「—」）',
    content: exerciseUiCss() + S544_CSS
      + windowStrip(v.start, v.end, v.days + ' 天')
      + finishPage(cards, DIST_CALIBERS, '运动类型分布', {
        sessions: v.sessions, activeDays: v.activeDays, days: v.days, totalBurned: v.totalBurned,
        intakeCal: v.intakeCal, tdeeTotal: v.tdeeTotal, deficit: v.deficit,
      }),
    charts: hasRows,
    printable: true,
    pageUi: true,
  });
}

/* ── 运动复盘（exercise_recap.html 对照：#454 融合版式：一句话结论＋类型分布＋高频徽章＋每日消耗） ── */

/** 复盘页的来源句（读者话；库表名不上屏）。 */
const RECAP_SOURCE = '运动记录（本窗未删除的行）';

/** 复盘页口径行（#544：一条事实一行；第一条保留 `口径：` 前缀，回归判据读它）。 */
const RECAP_CALIBERS: readonly string[] = [
  '口径：结论句按本窗记录算，频次指记录条数',
  '分布条占比＝该类次数÷本窗次数，条色是该类别的固定色',
  '徽章取本窗次数前 5 的运动',
  '折线按窗口每一天画点，没有记录的日子留空，不断 0',
  '时长单位分钟，消耗单位卡',
];

/** 五个时间窗（本周／本月／最近 90 天／今年／自定义时间）共用这一个装配：窗口只从数据侧进，
 *  模板零分支——同一组锚点 id 与区块类名，差异只在文本与数据；`sessions === 0` 才改走空态。 */
export function buildRecapDoc(v: RecapView): string {
  const hasRows = v.sessions > 0;
  const cards: Card[] = [
    windowCard(v.start, v.end, '按你选的起止日期出这一页。说「本周」「本月」这类叫法时，落到同一张页上，只是窗口不同'),
  ];
  // 结论条＝页内静态提示形态（浅色、不可点掉），一句话由数据侧给，页面不另编措辞；
  // 取数层结论句里的 `；` 并列由显示层换成逗号承接（一句话结论不断句；`，` 不在探针并列集里）。
  // 取数层（`exercisePort.ts`）一个字不动，#523 明细页的取数路径天然不受影响。
  // **空窗不印结论条**：取数层那句在本窗无记录时是「共运动 0 天、0 次、累计消耗 0 卡」——
  // 三个零在核心数字卡已各有一处，再印一遍既是冗余，也是一处 `、` 三连并列（#508 的 R3 债）；
  // 空窗的交代交给下面那张空态引导块（图标＋下一句话），页形与分布／力量／有氧三页一致。
  if (hasRows) {
    cards.push({
      id: 'sec-conclusion',
      label: '一句话结论',
      html: renderFeedbackBlock({
        staticNotice: true,
        toast: { msg: v.summary.split('；').join('，'), icon: 'ok' },
      }),
    });
  }
  cards.push(
    {
      id: 'sec-figures',
      label: '核心数字',
      // #268 终审席 P1-6：核心数字这三节在正文里没有落点（节身份只在顶部导航的胶囊里），补可见节标题。
      head: '核心数字',
      // #544：主角（总消耗）排首卡；窗口住窗口条胶囊，活跃天数只报分子。
      // （第 1 轮曾把首卡值放大到 28px 当主角，终审席 K1 判「一排四卡字号 28／22 混用、基线错开」，
      //   故整排退回公共层那一档 22px，见 `S544_CSS` 件头。）
      html: renderKpiGrid([
        { label: '总消耗', value: numUnit(v.totalBurned, '卡') },
        { label: '总时长', value: numUnit(v.totalMinutes, '分钟') },
        { label: '频次', value: String(v.sessions), unit: '次', detail: '活跃 ' + v.activeDays + ' 天' },
        { label: '覆盖分类', value: String(v.byCategory.length), unit: '类' },
      ]),
    },
  );
  if (hasRows) {
    // 类型分布条：条色只走 `categoryColor()` 的 hex；占比按次数（与结论句同一口径）。
    const dailyItems = v.daily.map((d) => ({
      label: d.date.slice(5),
      value: d.burned === null ? null : Number(fmtNum(d.burned, 0)),
    }));
    cards.push({
      id: 'sec-category',
      label: '类型分布',
      head: '类型分布',
      html: renderDistributionRows({
        rows: v.byCategory.map((b) => ({
          label: b.category,
          value: b.sessions + ' 次 ' + fmtNum(b.burned, 0) + ' 卡',
          pct: Math.round((b.sessions / v.sessions) * 1000) / 10,
          ...colorOf(b.category),
        })),
      }),
    });
    // 高频运动徽章：本窗次数前 5（次数并列时取并到的顺手序，页面不另排序）。
    cards.push({
      id: 'sec-badges',
      label: '高频运动',
      head: '高频运动',
      html: renderChips({ items: v.top5.map((t) => ({ text: t.type + ' ×' + t.sessions })) }),
    });
    cards.push({
      id: 'sec-daily',
      label: '每日消耗趋势',
      // #268 K4：长窗（≥45 天）在折线卡下方补一条日期轴（只出窗口内部日期，短窗不出）。
      html: withXRuler(renderChartBlock({
        kind: 'line',
        title: '每日消耗趋势（空缺断点不断 0）',
        // #544：纵轴刻度与量程走 `valueAxisOf()`（最小值锚 0、刻度落整数、线不贴上下沿）。
        input: { items: dailyItems, options: valueAxisOf(dailyItems.map((p) => p.value)) },
      }), dailyItems),
    });
  } else {
    cards.push({
      id: 'sec-empty',
      label: '类型分布',
      html: emptyGuide({ icon: '📊', text: '本窗还没有运动记录', hint: '说「记运动」就能记下第一条' }),
    });
  }
  cards.push(footFacts(RECAP_SOURCE, v.start, v.end, v.sessions));
  return assembleDocPage({
    docTitle: '卡路里 运动复盘',
    title: '运动复盘 ' + v.start + ' ~ ' + v.end,
    eyebrow: '运动复盘',
    subtitle: '结论一句话，类型分布，高频运动，每日消耗趋势',
    content: exerciseUiCss() + S544_CSS
      + windowStrip(v.start, v.end, v.days + ' 天')
      + finishPage(cards, RECAP_CALIBERS, '运动复盘', {
        sessions: v.sessions, totalMinutes: v.totalMinutes, totalBurned: v.totalBurned,
        activeDays: v.activeDays, days: v.days,
      }),
    charts: hasRows,
    printable: true,
    pageUi: true,
  });
}

/* ── 计划复盘（exercise_review.html 对照） ──
 *
 * **T351-v7：整支已搬进姊妹件 `./reviewDocs.ts`**（键 `calorie.view.exercise-review`，
 * order201–206）——本件已超 350 行告警线（见包 `AGENTS.md` 台账挂号行），复盘族的页内样式
 * 与热力图再挤进来只会更糟；搬走后本件只留「分布／力量／有氧／运动复盘／趋势」五键，
 * `buildReviewDoc` 改由 `../workout/review.ts` 直接 import 姊妹件。
 * 台账许诺的「趋势／复盘一族分住两件」这次只走完「复盘」这一半：`buildRecapDoc`（运动复盘）
 * 与 `buildTrendDoc`（运动趋势）是 #454 刚换过版式的融合版式，属另一半，留给收口票。
 */

/* ── 运动趋势（exercise_trend.html 对照：#454 融合版式：每日折线＋每周柱图＋逐日表） ── */

/** 趋势页的来源句（读者话；库表名不上屏）。 */
const TREND_SOURCE = '运动记录（本窗未删除的行）';

/** 逐日表上限：超出即印截断（页眉条数与可见行数同口径，沿 R3 的截断明示）。 */
const TREND_ROWS_CAP = 100;

/** 趋势页口径行（#544：一条事实一行；第一条保留 `口径：` 前缀，回归判据读它）。 */
const TREND_CALIBERS: readonly string[] = [
  '口径：折线与逐日表按窗口每一天画一行，没有记录的日子留空「—」，不补 0',
  '次数＝本窗记录条数',
  '时长单位分钟，消耗单位卡',
  '逐日表最多列 ' + TREND_ROWS_CAP + ' 天，超出即印截断，页眉天数与表内可见行数同口径',
];

export function buildTrendDoc(v: TrendView): string {
  const hasRows = v.activeDays > 0;
  const shown = Math.min(v.days.length, TREND_ROWS_CAP);
  const truncated = v.days.length > TREND_ROWS_CAP;
  const sessions = v.days.reduce((n, d) => n + d.sessions, 0);
  const cards: Card[] = [
    windowCard(v.start, v.end, '按天看这段的走势。只说天数时默认三十天，这里按起止日期定窗'),
    {
      id: 'sec-figures',
      label: '核心数字', head: '核心数字',
      // #544：主角（总消耗）排首卡吃 28px；窗口住窗口条胶囊，只留峰值那一处点睛。
      html: renderKpiGrid([
        { label: '总消耗', value: numUnit(v.totalBurned, '卡') },
        { label: '总时长', value: numUnit(v.totalMinutes, '分钟') },
        { label: '运动天数', value: String(v.activeDays), unit: '天' },
        {
          label: '峰值',
          value: v.peak === null ? '—' : numUnit(v.peak.burned, '卡'),
          detail: v.peak === null ? '本窗无记录' : '单日最高 ' + v.peak.date,
        },
      ]),
    },
  ];
  if (hasRows) {
    // 每日消耗折线：消耗实线（共享刻度）＋时长虚线（`ownScale` 独立归一，不另出第二套刻度）；
    // 没有记录的日子当场是 `null`（不是 0），点自然断开——「空缺断点不断 0」由数据结构保证。
    // #544：图表入参过显示层取整（空值仍 `null`，不断 0 口径不动）。
    const burnItems = v.days.map((d) => ({
      label: d.date.slice(5),
      value: d.burned === null ? null : Number(fmtNum(d.burned, 0)),
    }));
    const minItems = v.days.map((d) => ({
      label: d.date.slice(5),
      value: d.minutes === null ? null : Number(fmtNum(d.minutes, 0)),
    }));
    cards.push({
      id: 'sec-line',
      label: '每日消耗折线',
      // #268 K4：长窗（≥45 天）在折线卡下方补一条日期轴（只出窗口内部日期，短窗不出）。
      html: withXRuler(renderChartBlock({
        kind: 'line',
        title: '每日消耗与时长（消耗实线，时长虚线）',
        input: {
          items: burnItems,
          options: {
            // #544：纵轴刻度与量程走 `valueAxisOf()`（共享域＝消耗那条；时长是 `ownScale` 独立刻度）。
            ...valueAxisOf(burnItems.map((p) => p.value)),
            series: [
              { name: '消耗(卡)', items: burnItems },
              { name: '时长(分)', items: minItems, dashed: true, ownScale: true },
            ],
          },
        },
      }), burnItems),
    });
    cards.push({
      id: 'sec-weekly',
      label: '每周频次',
      html: renderChartBlock({
        kind: 'bar',
        title: '每周运动频次',
        input: { items: v.weekly.map((w) => ({ label: w.weekStart.slice(5) + '周', value: w.sessions })) },
      }),
    });
    cards.push({
      id: 'sec-daily',
      label: '逐日明细',
      html: renderDataTable({
        columns: [
          { key: 'date', label: '日期' },
          { key: 'sessions', label: '次数', align: 'right' },
          { key: 'minutes', label: '时长', align: 'right' },
          { key: 'burned', label: '消耗', align: 'right' },
        ],
        // 空缺日（窗内没有记录的那天）一律「—」：0 次／0 卡都不是那天的实话。
        rows: v.days.slice(0, TREND_ROWS_CAP).map((d) => ({
          date: d.date,
          sessions: d.sessions === 0 ? '—' : d.sessions + ' 次',
          minutes: numUnit(d.minutes, '分钟'),
          burned: numUnit(d.burned, '卡'),
        })),
        caption: '逐日明细（共 ' + v.days.length + ' 天，本表列出 ' + shown + ' 天'
          + (truncated ? '，已截断，只列前 ' + TREND_ROWS_CAP + ' 天' : '，未截断')
          + '，空缺日「—」不断 0）',
      }),
    });
  } else {
    cards.push({
      id: 'sec-empty',
      label: '逐日明细',
      html: emptyGuide({ icon: '📈', text: '本窗还没有运动记录', hint: '说「记运动」就能记下第一笔' }),
    });
  }
  cards.push(footFacts(TREND_SOURCE, v.start, v.end, sessions));
  return assembleDocPage({
    docTitle: '卡路里 运动趋势',
    title: '运动趋势 ' + v.start + ' ~ ' + v.end,
    eyebrow: '运动趋势',
    subtitle: '每日消耗与时长，每周频次，逐日明细（空缺日留空，不补 0）',
    content: exerciseUiCss() + S544_CSS
      + windowStrip(v.start, v.end, v.days.length + ' 天')
      + finishPage(cards, TREND_CALIBERS, '运动趋势', {
        activeDays: v.activeDays, totalMinutes: v.totalMinutes,
        totalBurned: v.totalBurned, peakBurned: v.peak === null ? null : v.peak.burned,
      }),
    charts: hasRows,
    printable: true,
    pageUi: true,
  });
}
