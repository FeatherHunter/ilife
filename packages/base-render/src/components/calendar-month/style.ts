/** calendar-month · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本层其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方的页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸；本件不写任何 `@media`（视口宽 ≠ 组件宽）。
 *
 *  几何契约（判据钉住）：
 *   · 格宽是**份数**（`repeat(7, minmax(0,1fr))`）⇒ 七列总宽恒等于容器宽，390 档不横滑；
 *   · 读数位**换行不截断**（`overflow-wrap:anywhere`，不写 `…`）⇒ 窄档金额不丢字；
 *   · 五档深浅与柱高**同源**（同一个 `color-mix` 阶梯 ＋ `CALENDAR_MONTH_LEVEL_HEIGHTS_PX`）：
 *     深浅不写死颜色，三套皮肤下都是同一条"浅 → 深"（强调色换掉也成立）。
 */
import { skinVar } from '../skin/contract.js';
import { calendarMonthSlot, type CalendarMonthSlot } from './attrs.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 格盘自高一档（px）：空位与满格同高，换行不会把某一行压扁。 */
export const CALENDAR_MONTH_CELL_MIN_HEIGHT_PX = 52;

/** 底部小柱所在的槽高（px）：五档里最高的那档正好填满它。 */
export const CALENDAR_MONTH_BAR_HEIGHT_PX = 10;

/** 五档的柱高（px）：**档位是形状事实**，所以它是导出的常量而不是散在样式里的字面量。 */
export const CALENDAR_MONTH_LEVEL_HEIGHTS_PX: Readonly<Record<number, number>> = Object.freeze({
  0: 0, 1: 3, 2: 5, 3: 7, 4: 10,
});

/** 窄容器阈值（px）：格内字号与内距收一档，好让 7 位读数（如 `¥12,345`）在 390 档也放得下。
 *  **这是本件自己的宽度**（`@container` 判的），不是视口宽度。 */
export const CALENDAR_MONTH_NARROW_PX = 560;

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
export function calendarMonthCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /* 槽位类的**唯一拼法**：scope（`.ilife-page-ui`）＋ 本件类名 —— 一条独立规则的完整选择器。
     要把两个槽拼成**后代选择器**时，后半截用 `c()`（`c()` 不带 scope）：
     两个 `s()` 拼一起会写出 `.ilife-page-ui … .ilife-page-ui …`，那条规则**永远命中不到**
     （页里不会有嵌套的 `.ilife-page-ui`）。判据断的是"scope 恰好出现一次"。 */
  const s = (slot: CalendarMonthSlot): string => root + ' .' + calendarMonthSlot(slot, p);
  const c = (slot: CalendarMonthSlot): string => '.' + calendarMonthSlot(slot, p);
  const k = ladder();

  const out: string[] = [
    m('base-render.components-calendar-month-style.c001'),
    m('base-render.components-calendar-month-style.c002'),
    m('base-render.components-calendar-month-style.c003'),
    root + ' .' + p + 'block-calendar-month {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度收字号。 */
    '  container-type: inline-size;',
    '  display: grid;',
    '  gap: 8px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    m('base-render.components-calendar-month-style.c004'),
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
    m('base-render.components-calendar-month-style.c005'),
    s('wk') + ',',
    s('grid') + ' {',
    '  display: grid;',
    '  grid-template-columns: repeat(7, minmax(0, 1fr));',
    '  gap: 3px;',
    '  min-width: 0;',
    '}',
    s('wd') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  text-align: center;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-calendar-month-style.c006'),
    s('c') + ' {',
    '  box-sizing: border-box;',
    '  display: grid;',
    '  grid-template-rows: auto auto 1fr;',
    '  gap: 2px;',
    '  min-width: 0;',
    '  min-height: ' + String(CALENDAR_MONTH_CELL_MIN_HEIGHT_PX) + 'px;',
    '  padding: 4px 3px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  overflow: hidden;',
    '}',
    m('base-render.components-calendar-month-style.c007'),
    s('c') + '.is-blank {',
    '  border-color: transparent;',
    '  background: none;',
    '}',
    s('d') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '  line-height: 1.2;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-calendar-month-style.c008'),
    s('today-mark') + ' {',
    '  margin-left: 3px;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: 9px;',
    '  font-style: normal;',
    '  font-weight: 700;',
    '}',
    m('base-render.components-calendar-month-style.c009'),
    s('v') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: min(10.5px, 2.8cqi);',
    '  font-weight: 600;',
    '  line-height: 1.2;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-calendar-month-style.c010'),
    s('c') + '.is-missing ' + c('v') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '}',
    s('bar') + ' {',
    '  display: flex;',
    '  align-items: flex-end;',
    '  align-self: end;',
    '  height: ' + String(CALENDAR_MONTH_BAR_HEIGHT_PX) + 'px;',
    '  margin-top: 2px;',
    '}',
    s('bar-fill') + ' {',
    '  display: block;',
    '  width: 100%;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '}',
    m('base-render.components-calendar-month-style.c011'),
  ];
  for (const level of [0, 1, 2, 3, 4]) {
    const paint = level === 0 ? skinVar('line') : k[level - 1];
    out.push(s('c') + '.is-l' + String(level) + ' ' + c('bar-fill') + ' {');
    out.push('  height: ' + String(CALENDAR_MONTH_LEVEL_HEIGHTS_PX[level]) + 'px;');
    out.push('  background: ' + paint + ';');
    out.push('}');
  }
  out.push(
    /* 今天：墨圈（形）——与「今」字一起，去掉颜色照样认得出。 */
    s('c') + '.is-today {',
    '  outline: 2px solid ' + skinVar('ink') + ';',
    '  outline-offset: -2px;',
    '}',
    m('base-render.components-calendar-month-style.c012'),
    s('lg') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 4px 12px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '}',
    s('lg') + ' > span {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 4px;',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    s('sw') + ' {',
    '  flex: none;',
    '  display: block;',
    '  width: 12px;',
    '  height: 12px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '}',
  );
  for (const level of [0, 1, 2, 3, 4]) {
    const paint = level === 0 ? skinVar('surface-2') : k[level - 1];
    out.push(s('sw') + '.is-l' + String(level) + ' { background: ' + paint + '; }');
  }
  out.push(
    s('note') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-calendar-month-style.c013'),
    m('base-render.components-calendar-month-style.c014'),
    root + ' .' + p + 'block-calendar-month :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    m('base-render.components-calendar-month-style.c015', { p0: String(String(CALENDAR_MONTH_NARROW_PX)) }),
    m('base-render.components-calendar-month-style.c016'),
    '@container (max-width: ' + String(CALENDAR_MONTH_NARROW_PX) + 'px) {',
    '  ' + s('grid') + ',',
    '  ' + s('wk') + ' {',
    '    gap: 2px;',
    '  }',
    '  ' + s('c') + ' {',
    '    min-height: 46px;',
    '    padding: 3px 2px;',
    '  }',
    '}',
  );
  return out.join(LF);
}
