/** range-bar · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本层其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方的页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ `flex-wrap`；本件不写任何 `@media`（视口宽 ≠ 组件宽）。
 *
 *  几何契约（判据钉住）：
 *   · **轴刻度与泳道共用同一张网格**（`.lanes` 三轨 ＋ `.ax`／`.lane` 是 `display:contents`）
 *     ⇒ 左右两栏宽度是**全表统一**的，刻度两端永远对得上轨道两端，不会一宽一窄；
 *   · 轨道是份数（`minmax(0,1fr)`）、区间是百分比 ⇒ 总宽恒等于容器宽，390 档不横滑；
 *   · 刻度标签 `flex-wrap` ＋ 8px 列距 ＋ `nowrap` ⇒ 再窄也只是换行，**不压字**（判据量两两不重叠）。
 */
import { skinVar } from '../skin/contract.js';
import {
  RANGE_BAR_NARROW_PX,
  RANGE_BAR_TEXT_HIDE_BELOW_PX,
  rangeBarSlot,
  type RangeBarSlot,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 轨道高（px）：一行的轨道是"坐标系"而不是柱子，所以比按钮矮，但仍要让区间看得见。 */
export const RANGE_BAR_RAIL_HEIGHT_PX = 22;

/** 左右两栏的宽度（px，宽档）：类别名一栏固定、合计一栏按下限起步（`auto` 会让两行不齐）。 */
export const RANGE_BAR_KEY_COLUMN_PX = 54;
export const RANGE_BAR_TOTAL_COLUMN_PX = 66;

/** 窄档（`< RANGE_BAR_NARROW_PX`）的两栏宽度（px）：收一档把宽度让给轨道。 */
export const RANGE_BAR_KEY_COLUMN_NARROW_PX = 46;
export const RANGE_BAR_TOTAL_COLUMN_NARROW_PX = 54;

/** 刻度标签之间的最小列距（px）：**"不压字"的机械保证**（判据量的是两两不重叠）。 */
export const RANGE_BAR_TICK_GAP_PX = 8;

/** 深浅阶梯：从强调色与次要面**算出来**的四种深度（不写死颜色 ⇒ 三套皮肤下都成立）。 */
function ladder(): readonly string[] {
  const accent = skinVar('accent');
  const soft = skinVar('surface-2');
  return [
    'color-mix(in srgb, ' + accent + ' 18%, ' + soft + ')',
    'color-mix(in srgb, ' + accent + ' 40%, ' + soft + ')',
    'color-mix(in srgb, ' + accent + ' 62%, ' + soft + ')',
    skinVar('accent'),
  ];
}

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function rangeBarCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /* 槽位类的**唯一拼法**：scope（`.ilife-page-ui`）＋ 本件类名 —— 一条独立规则的完整选择器。
     要把两个槽拼成**后代选择器**时，后半截用 `c()`（`c()` 不带 scope）：两个 `s()` 拼一起会写出
     `.ilife-page-ui … .ilife-page-ui …`，那条规则永远命中不到。判据断的是"scope 恰好出现一次"。 */
  const s = (slot: RangeBarSlot): string => root + ' .' + rangeBarSlot(slot, p);
  const c = (slot: RangeBarSlot): string => '.' + rangeBarSlot(slot, p);
  const k = ladder();

  const out: string[] = [
    m('base-render.components-range-bar-style.c001'),
    m('base-render.components-range-bar-style.c002'),
    m('base-render.components-range-bar-style.c003'),
    root + ' .' + p + 'block-range-bar {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度收栏宽。 */
    '  container-type: inline-size;',
    '  display: grid;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    m('base-render.components-range-bar-style.c004'),
    s('hd') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 10px;',
    '  min-width: 0;',
    '}',
    s('title') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-display') + ';',
    '  font-size: ' + skinVar('fs-h2') + ';',
    '  font-weight: 700;',
    '  line-height: 1.25;',
    '  overflow-wrap: anywhere;',
    '}',
    s('use') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('sum') + ' {',
    '  display: flex;',
    '  align-items: baseline;',
    '  gap: 6px;',
    '  margin-left: auto;',
    '  min-width: 0;',
    '}',
    s('sum-label') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '}',
    s('sum-value') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-range-bar-style.c005'),
    m('base-render.components-range-bar-style.c006'),
    m('base-render.components-range-bar-style.c007'),
    m('base-render.components-range-bar-style.c008'),
    s('ax') + ' {',
    '  display: grid;',
    '  grid-template-columns: ' + String(RANGE_BAR_KEY_COLUMN_PX) + 'px minmax(0, 1fr) ' + String(RANGE_BAR_TOTAL_COLUMN_PX) + 'px;',
    '  gap: 4px ' + String(RANGE_BAR_TICK_GAP_PX) + 'px;',
    '  align-items: center;',
    '  min-width: 0;',
    '}',
    s('lanes') + ' {',
    '  display: grid;',
    '  grid-template-columns: ' + String(RANGE_BAR_KEY_COLUMN_PX) + 'px minmax(0, 1fr) ' + String(RANGE_BAR_TOTAL_COLUMN_PX) + 'px;',
    '  gap: 4px ' + String(RANGE_BAR_TICK_GAP_PX) + 'px;',
    '  align-items: center;',
    '  min-width: 0;',
    '}',
    m('base-render.components-range-bar-style.c009'),
    m('base-render.components-range-bar-style.c010'),
    m('base-render.components-range-bar-style.c011'),
    m('base-render.components-range-bar-style.c012'),
    s('lane') + ' {',
    '  display: contents;',
    '}',
    m('base-render.components-range-bar-style.c013'),
    s('ax-ticks') + ' {',
    '  grid-column: 2;',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  gap: 2px ' + String(RANGE_BAR_TICK_GAP_PX) + 'px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: 10px;',
    '  line-height: 1.4;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s('ax-ticks') + ' > i {',
    '  font-style: normal;',
    '  white-space: nowrap;',
    '}',
    m('base-render.components-range-bar-style.c014'),
    s('key') + ' {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 4px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('mark') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: 9px;',
    '  font-style: normal;',
    '  line-height: 1;',
    '}',
    m('base-render.components-range-bar-style.c015'),
    m('base-render.components-range-bar-style.c016'),
    s('total') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: right;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-range-bar-style.c017'),
    s('rail') + ' {',
    '  position: relative;',
    '  min-width: 0;',
    '  height: ' + String(RANGE_BAR_RAIL_HEIGHT_PX) + 'px;',
    '  border-left: 1px solid ' + skinVar('line') + ';',
    '  border-right: 1px solid ' + skinVar('line') + ';',
    '}',
    s('iv') + ' {',
    '  position: absolute;',
    '  top: 3px;',
    '  bottom: 3px;',
    '  box-sizing: border-box;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  min-width: 1px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + k[1] + ';',
    '  overflow: hidden;',
    '}',
  ];
  for (const tone of [1, 2, 3, 4]) {
    out.push(s('iv') + '.is-l' + String(tone) + ' { background: ' + k[tone - 1] + '; }');
  }
  out.push(
    m('base-render.components-range-bar-style.c018'),
    m('base-render.components-range-bar-style.c019'),
    s('iv-text') + ' {',
    '  text-decoration: none;',
    '  padding: 2px 4px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: 10px;',
    '  font-weight: 600;',
    '  line-height: 1.2;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('note') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-range-bar-style.c020'),
    m('base-render.components-range-bar-style.c021'),
    root + ' .' + p + 'block-range-bar :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    m('base-render.components-range-bar-style.c022', { p0: String(String(RANGE_BAR_NARROW_PX)) }),
    m('base-render.components-range-bar-style.c023'),
    '@container (max-width: ' + String(RANGE_BAR_NARROW_PX) + 'px) {',
    '  ' + s('ax') + ',',
    '  ' + s('lanes') + ' {',
    '    grid-template-columns: ' + String(RANGE_BAR_KEY_COLUMN_NARROW_PX) + 'px minmax(0, 1fr) ' + String(RANGE_BAR_TOTAL_COLUMN_NARROW_PX) + 'px;',
    '  }',
    '}',
    m('base-render.components-range-bar-style.c024', { p0: String(String(RANGE_BAR_TEXT_HIDE_BELOW_PX)) }),
    m('base-render.components-range-bar-style.c025'),
    '@container (max-width: ' + String(RANGE_BAR_TEXT_HIDE_BELOW_PX - 1) + 'px) {',
    '  ' + s('iv-text') + ' {',
    '    display: none;',
    '  }',
    '}',
  );
  return out.join(LF);
}
