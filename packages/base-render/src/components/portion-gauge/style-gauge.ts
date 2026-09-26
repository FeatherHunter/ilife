/** portion-gauge · **A 档量感条的样式段**（本件第二份样式来源，由 `style.ts` 汇总）。
 *
 *  为什么有这一件：一次落两档形态，两档的规则挤在一份里会超本包告警线 350
 *  （`packages/base-render/AGENTS.md`；拆件先例 `scatter-fit/style-forms.ts`、`date-range/style-calendar.ts`）。
 *  **搬走的是行数，不是纪律**：这一份与 `style.ts` 同一份纪律 ——
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方页零命中）；不写 `:root`／`!important`、
 *     不新增 token 名、零代码里写死的色值；不写任何 `@media`（宽度只许容器判，本档不需要窄档调整：
 *     两枚参照刻度值走**在流**的两行，长了自己换行，不靠坐标也不横滑）；
 *   · **关键语义永不 `…` 截断**：没有 `text-overflow`／`line-clamp`／`white-space: nowrap`，
 *     长串一律 `overflow-wrap: anywhere` 换行。
 *
 *  几何契约（判据钉住）：
 *   · **位置由值算出**：已用那一段的宽度是行内算出来的百分比（`model.ts` 里由 `usedPct` 出，
 *     与那个大字、与无障碍名是**同一个数**）；刻度竖线与参照竖线的位置也是行内给的百分比；
 *   · **三级重量**：余量底＝一根 1px 发丝线（最轻）＜ 刻度竖线（6／9px 的竖线）＜ 已用那一段
 *     （3px 强调色实底，压在发丝线上）——三级各有各的形，不靠颜色分；
 *   · **两枚参照刻度值的分开**：一餐建议那行在**下**（贴着轨道）、一天上限那行在**上**；
 *     两行都是在流元素，横向居中到自己那枚刻度上（内距由 `model.ts` 算好），
 *     所以既不会推出轨道，也不会把刻度压没。
 */
import { skinVar } from '../skin/contract.js';
import { portionGaugeSlot, type PortionGaugeSlot } from './attrs.js';

/** 轨道高（px）：**命中盒那一档**（调用方把整条尺子包成入口时，命中盒不小于 44）。 */
export const PORTION_GAUGE_RAIL_PX = 44;
/** 已用那一段的厚（px）：三级重量里最重的那一级（压在 1px 发丝底上）。 */
const USED_PX = 3;
/** 刻度竖线的高（px）：整份那一档（`is-major`）加一档。 */
const TICK_PX = 6;
const TICK_MAJOR_PX = 9;
/** 参照刻度竖线的高（px）：**穿过**那根发丝线（上下各探出去一截，是三级里最高的那一级）。 */
const MARK_PX = 20;

/** A 档那一半的样式行（`style.ts` 汇总进本件唯一的样式段）。 */
export function portionGaugeGaugeCss(input?: { readonly prefix?: string }): readonly string[] {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = (slot: PortionGaugeSlot): string => root + ' .' + portionGaugeSlot(slot, p);

  return [
    /* ── A 档：量感条 ── */
    s('subject') + ' {',
    /* 「这一份叫什么」挨着标题：内容撑宽是横溢的来源 ⇒ 可收窄 ＋ 允许在词内断行。 */
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-display') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 占比那一行：一档大字，**一行说完**（不再挂一句「占一天上限」——上限那句话已经写在
       尺子右端那枚刻度上了，同一个数只印一次）。 */
    s('lead') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 10px;',
    '  margin: 0;',
    '  min-width: 0;',
    '}',
    s('lead-value') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-h1') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  line-height: 1.15;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 量感条那一块：上面两行参照刻度值 ＋ 下面那条尺子（两行间距就是「相邻 ≥8px」那一档）。 */
    s('gauge') + ' {',
    '  display: grid;',
    '  gap: 8px;',
    '  min-width: 0;',
    '}',
    /* 一枚参照刻度值：**在流**的一行（长了自己换行，不横滑、不推出轨道）；横向居中到它那枚刻度上
      —— 居中靠 `model.ts` 算好的那一侧内距（`text-align: center` ＋ 一侧内距，见 `refPad()`）。 */
    s('mark-label') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  line-height: 1.45;',
    '  text-align: center;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 右端那枚（一天上限）顶到右缘：它那枚刻度就在轨道右端。 */
    s('mark-label') + '.is-cap {',
    '  text-align: right;',
    '}',
    /* 轨道：尺子的本体。`role="img"` 的无障碍名挂在它上面；高就是命中盒那一档。 */
    s('rail') + ' {',
    '  position: relative;',
    '  min-width: 0;',
    '  height: ' + String(PORTION_GAUGE_RAIL_PX) + 'px;',
    '}',
    /* 余量底：三级重量里最轻的那一级（一根发丝线，横贯整条轨道）。 */
    s('rest') + ' {',
    '  position: absolute;',
    '  left: 0;',
    '  right: 0;',
    '  top: 50%;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    /* 已用那一段：宽度＝占比本身（`model.ts` 给的数），压在发丝线上（三级里最重的那一级）。 */
    s('used') + ' {',
    '  position: absolute;',
    '  left: 0;',
    '  top: 50%;',
    '  height: ' + String(USED_PX) + 'px;',
    '  margin-top: -' + String(USED_PX / 2) + 'px;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('accent') + ';',
    '}',
    /* 刻度竖线：挂在线上、往下探（四等分；整份那一档长一截）。 */
    s('tick') + ' {',
    '  position: absolute;',
    '  top: 50%;',
    '  width: 0;',
    '  height: ' + String(TICK_PX) + 'px;',
    '  border-left: 1px solid ' + skinVar('line') + ';',
    '}',
    s('tick') + '.is-major {',
    '  height: ' + String(TICK_MAJOR_PX) + 'px;',
    '}',
    /* 参照刻度竖线：穿过那根发丝线（三级里最高的一级）；两枚靠**线形**分开——建议实线、上限虚线。 */
    s('mark') + ' {',
    '  position: absolute;',
    '  top: 50%;',
    '  width: 0;',
    '  height: ' + String(MARK_PX) + 'px;',
    '  margin-top: -' + String(MARK_PX / 2 - USED_PX) + 'px;',
    '  border-left: 1px solid ' + skinVar('ink-2') + ';',
    '}',
    s('mark') + '.is-cap {',
    '  border-left-style: dashed;',
    '}',
    /* 实物参照那一行（`≈ 1 个拳头 ＋ 2 汤勺`）：尺子读不出来「这一份是多少实物」这一句。 */
    s('equiv') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    s('equiv') + ' b {',
    '  color: ' + skinVar('ink') + ';',
    '  font-weight: 700;',
    '}',
  ];
}
