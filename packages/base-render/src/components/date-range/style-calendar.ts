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
    '/* 日历块：软底块 ＋ 发丝线（零阴影下用它立边界）。',
    '   **宽度上限 ' + String(CALENDAR_MAX_PX) + 'px**：一个月有自己的自然宽度——1000px 宽的格子里',
    '   一格天铺成 170px、数字孤零零吊在中间，读起来不像日历（真机 1280 档亲眼看过才发现）。',
    '   超过上限的宽度留在块外（其余几行照常占满），格宽稳在 ' + String(CELL_MIN_W_PX) + 'px 上下。 */',
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
    '/* 每一格天：命中盒 ≥44×44（矩阵缝 0px：缝并进格子，见 `style.ts` 文件头）。',
    '   四档形状：区间内＝纸面块，两端＝**强调面**（格里写着那一天的数字＝有文字 ⇒ 软底 `accent-soft`',
    '   ＋ 主色字 `accent-text` ＋ 主色描边 `accent`，见 `docs/base/base-render/选中态与皮肤语言.md` 第三节），',
    '   相邻月＝弱字，今天＝一圈发丝线。',
    '   `is-adj` 带 `:not(.is-end)`：相邻月那一天**可以**是这一段的一端（`render.ts` 两件事各判各的）——',
    '   那种格子上若让"弱字"盖掉选中面的 `accent-text`，选中的字色就掉回 `ink-3`（paper 下对软底只有 4.48:1）。 */',
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
    '/* 窄档**满幅**（full-bleed）：本件自己的内宽 ≤' + String(DATE_RANGE_FULL_BLEED_MAX_PX) + 'px 时，',
    '   7 列 × 44px ＝ 308px 连「日历自己的左右内距 ＋ 块体左右内距」都付不起（320 档不补这一档，',
    '   每格只有 34.8px、有效命中 34–36px < 44 地板）。把两边的内距并进格子：日历两边各外扩',
    '   ' + String(DATE_RANGE_BOX_PAD_X_PX) + 'px（＝块体左右内距，**同一个常量**）、自己左右内距归零',
    '   ⇒ 320 档每格 45.1px（有效命中 44–46px）。',
    '   外扩量 ≤ 块体内距 ⇒ 日历始终落在块体边框内，任何档都不会横向溢出（判据四档都量）。',
    '   判的是**本件自己的内宽**（容器查询），不是视口宽。 */',
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
