/** date-range · **日历那一段样式**（同目录第二份样式来源；由 `style.ts` 的 `dateRangeCss()` 汇总）。
 *
 *  为什么有这一份：本件的样式段一度到 371 行（本包告警线 350，`packages/base-render/AGENTS.md`）。
 *  日历那一块（软底块 ＋ 翻月头 ＋ 星期表头 ＋ 42 格的四档形状）是一段边界干净的形状，独立成件；
 *  拆的那一次**取值一个字节都不许变**——拆的只是"住哪个文件"（判据里那条「汇总里原样含这一半」钉的就是它）。
 *  拆完之后这一半可以单独改：**2026-09-25 触控返修**把矩阵缝并进格子（4px → 0）、并给窄档加了满幅，
 *  `dateRangeCss()` 的产物因此变了；判据断的是「汇总里**原样**含这一半」，不是"值不许再动"。
 *
 *  边界与另一半的分工：这里只管「日历块自己的形状」；
 *  悬停／按下／焦点／禁用／减动效那些**跨槽位**的规则仍住 `style.ts`（它们同时管快捷档与起止两格）。
 *
 *  纪律同 `style.ts`：只经 `skinVar()` 读皮肤／全部规则 scope 在 `.<prefix>page-ui` 之下／
 *  零 `:root`／零 `!important`／零自定义属性。
 */
import { skinVar } from '../skin/contract.js';
import {
  DATE_RANGE_BOX_PAD_X_PX,
  DATE_RANGE_FULL_BLEED_MAX_PX,
  DATE_RANGE_GAP_PX,
  DATE_RANGE_TOUCH_PX,
  dateRangeSlot,
  type DateRangeSlot,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 日历格之间的**矩阵缝**（px）：`0` ＝ 缝并进格子（见 `style.ts` 文件头「有意偏离」那一段）。
 *  留缝的代价是实测过的：320 档缝 4px、走投无路时每格只剩 34.8px、有效命中 34–36px < 44。 */
const CELL_GAP_PX = 0;

/** 日历块的宽度上限（px）：一个月有自己的自然宽度（原型给的是 430px）。
 *  不设它，1280 档下一格天会铺成 170px、数字孤零零吊在中间——真机截图里亲眼看到的。 */
const CALENDAR_MAX_PX = 430;
/** 格宽的期望量级（px）：写在这里是为了让"格宽稳在多少"有一个可对账的读数（判据断 ≥44）。 */
const CELL_MIN_W_PX = 44;

/** 按下反馈的时长（ms）：与 `style.ts` 里那一条同一个口径（≤80ms；两段各写一份是为了不互相 import）。 */
const PRESS_MS = 80;

/** 日历那一段的样式。恒返回非空 CSS 文本（由 `dateRangeCss()` 插在正确的位置上）。 */
export function dateRangeCalendarCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = (slot: DateRangeSlot): string => root + ' .' + dateRangeSlot(slot, p);
  const touch = String(DATE_RANGE_TOUCH_PX) + 'px';

  return [
    m('base-render.components-date-range-style-calendar.c001'),
    m('base-render.components-date-range-style-calendar.c002', { p0: String(String(CALENDAR_MAX_PX)) }),
    m('base-render.components-date-range-style-calendar.c003'),
    m('base-render.components-date-range-style-calendar.c004', { p0: String(String(CELL_MIN_W_PX)) }),
    s('calendar') + ' {',
    '  display: grid;',
    '  gap: ' + String(DATE_RANGE_GAP_PX) + 'px;',
    '  min-width: 0;',
    '  max-width: ' + String(CALENDAR_MAX_PX) + 'px;',
    '  padding: 10px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '}',
    s('calHead') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: ' + String(DATE_RANGE_GAP_PX) + 'px;',
    '  min-width: 0;',
    '}',
    s('nav') + ' {',
    '  flex: none;',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  box-sizing: border-box;',
    '  width: ' + touch + ';',
    '  min-width: ' + touch + ';',
    '  height: ' + touch + ';',
    '  padding: 0;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: inherit;',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  line-height: 1;',
    '  cursor: pointer;',
    '  touch-action: manipulation;',
    '  transition: transform ' + String(PRESS_MS) + 'ms cubic-bezier(.22,1,.36,1);',
    '}',
    s('month') + ' {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  margin-left: 2px;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('week') + ',',
    s('days') + ' {',
    '  display: grid;',
    '  grid-template-columns: repeat(7, minmax(0, 1fr));',
    '  gap: ' + String(CELL_GAP_PX) + 'px;',
    '  min-width: 0;',
    '}',
    s('week') + ' span {',
    '  padding: 2px 0;',
    '  text-align: center;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    m('base-render.components-date-range-style-calendar.c005'),
    m('base-render.components-date-range-style-calendar.c006'),
    m('base-render.components-date-range-style-calendar.c007'),
    m('base-render.components-date-range-style-calendar.c008'),
    m('base-render.components-date-range-style-calendar.c009'),
    m('base-render.components-date-range-style-calendar.c010'),
    s('day') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  box-sizing: border-box;',
    '  min-width: 0;',
    '  min-height: ' + touch + ';',
    '  padding: 0;',
    '  border: 1px solid transparent;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: transparent;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  cursor: pointer;',
    '  touch-action: manipulation;',
    '  transition: transform ' + String(PRESS_MS) + 'ms cubic-bezier(.22,1,.36,1);',
    '}',
    s('day') + '.is-in {',
    '  background: ' + skinVar('surface') + ';',
    '}',
    s('day') + '.is-end {',
    '  background: ' + skinVar('accent-soft') + ';',
    '  border-color: ' + skinVar('accent') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-weight: 700;',
    '}',
    s('day') + '.is-adj:not(.is-end) {',
    '  color: ' + skinVar('ink-3') + ';',
    '}',
    s('day') + '.is-today {',
    '  border-color: ' + skinVar('ink-2') + ';',
    '}',
    m('base-render.components-date-range-style-calendar.c011', {
      p0: String(String(DATE_RANGE_FULL_BLEED_MAX_PX)),
    }),
    m('base-render.components-date-range-style-calendar.c012'),
    m('base-render.components-date-range-style-calendar.c013'),
    m('base-render.components-date-range-style-calendar.c014', {
      p0: String(String(DATE_RANGE_BOX_PAD_X_PX)),
    }),
    m('base-render.components-date-range-style-calendar.c015'),
    m('base-render.components-date-range-style-calendar.c016'),
    m('base-render.components-date-range-style-calendar.c017'),
    '@container (max-width: ' + String(DATE_RANGE_FULL_BLEED_MAX_PX) + 'px) {',
    '  ' + s('calendar') + ' {',
    '    margin-left: -' + String(DATE_RANGE_BOX_PAD_X_PX) + 'px;',
    '    margin-right: -' + String(DATE_RANGE_BOX_PAD_X_PX) + 'px;',
    '    padding-left: 0;',
    '    padding-right: 0;',
    '  }',
    '}',
  ].join(LF);
}
