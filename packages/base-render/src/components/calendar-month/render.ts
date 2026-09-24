/** calendar-month · **渲染**（纯函数产 HTML；本件只有形态 A「格内数字＋小计＋底部水量条」一种骨架）。
 *
 *  —— 形态 A：格内数字＋小计＋底部水量条（带星期表头）——
 *
 *  七列一周、一格一天：**星期表头**在最上面，每格自上而下是「日期（今天多一枚『今』字）／
 *  当天读数（缺值写 `—`）／底部一条小柱**。小柱的高度与深浅一起随档位变 ⇒ 一眼扫过去，
 *  哪几天多、哪几天少是看得出来的；今天的墨圈 ＋「今」字保证**不只靠颜色**认今天。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **缺值不写 0**：`value: null` ⇒ 格内写 `—`、档位压到 0（0 是"那天花了 0 元"，两者不是一回事）；
 *   · **格盘排满**：七列 × 行数，空位是显式的空格（`is-blank`，不出边框与底），错位一格会读成另一天；
 *   · **窄档不横滑**：格宽是份数（`repeat(7, minmax(0,1fr))`），读数换行不截断（不写 `…`）。
 */
import { esc } from '../shared/escape.js';
import {
  CALENDAR_MONTH_CLASS,
  CALENDAR_MONTH_FORMS,
  CALENDAR_MONTH_TODAY_MARK,
  calendarMonthSlot,
  type CalendarMonthForm,
} from './attrs.js';
import { normalizeCalendarMonth, type CalendarMonthDayModel, type CalendarMonthModel } from './model.js';

/** 头部那一排：标题 ＋ 用途 ＋ 合计（合计 `margin-left:auto` 顶到右缘，窄档自己折行）。 */
function headHtml(m: CalendarMonthModel): string {
  const parts: string[] = ['<div class="' + calendarMonthSlot('hd') + '">'];
  parts.push('<b class="' + calendarMonthSlot('title') + '">' + esc(m.title) + '</b>');
  if (m.use !== undefined) parts.push('<span class="' + calendarMonthSlot('use') + '">' + esc(m.use) + '</span>');
  if (m.summary !== undefined) {
    parts.push('<span class="' + calendarMonthSlot('sum') + '">'
      + '<i class="' + calendarMonthSlot('sum-label') + '">' + esc(m.summary.label) + '</i>'
      + '<b class="' + calendarMonthSlot('sum-value') + '">' + esc(m.summary.value) + '</b>'
      + '</span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 星期表头：七枚 `<span>`（周一起首列；表头缺一枚就整列错位，所以长度在归一化期已钉死）。 */
function weekdaysHtml(m: CalendarMonthModel): string {
  const cells = m.weekdays.map((w) => '<span class="' + calendarMonthSlot('wd') + '">' + esc(w) + '</span>').join('');
  return '<div class="' + calendarMonthSlot('wk') + '">' + cells + '</div>';
}

/** 一格一天。空位（月首月尾）是 `is-blank`：只占位，不出边框与底。 */
function cellHtml(cell: CalendarMonthDayModel | null): string {
  if (cell === null) return '<div class="' + calendarMonthSlot('c') + ' is-blank" aria-hidden="true"></div>';
  const cls = [calendarMonthSlot('c'), 'is-l' + String(cell.level)];
  if (cell.today) cls.push('is-today');
  if (cell.missing) cls.push('is-missing');
  return '<div class="' + cls.join(' ') + '">'
    + '<span class="' + calendarMonthSlot('d') + '">' + esc(cell.day)
    + (cell.today ? '<em class="' + calendarMonthSlot('today-mark') + '">' + esc(CALENDAR_MONTH_TODAY_MARK) + '</em>' : '')
    + '</span>'
    + '<span class="' + calendarMonthSlot('v') + '">' + esc(cell.value) + '</span>'
    /* 小柱是读数位的**形状重复**（值已经在格内），对读屏器没有信息 ⇒ aria-hidden。 */
    + '<i class="' + calendarMonthSlot('bar') + '" aria-hidden="true">'
    + '<u class="' + calendarMonthSlot('bar-fill') + '"></u></i>'
    + '</div>';
}

/** 深浅图例：色块 ＋ 说明（色块 aria-hidden，说明是字）。 */
function legendHtml(m: CalendarMonthModel): string {
  const items = m.legend.map((it) => '<span><i class="' + calendarMonthSlot('sw') + ' is-l' + String(it.level)
    + '" aria-hidden="true"></i>' + esc(it.label) + '</span>').join('');
  return '<div class="' + calendarMonthSlot('lg') + '">' + items + '</div>';
}

/** 形态 A 的骨架。 */
function renderGrid(m: CalendarMonthModel): string {
  const parts: string[] = [];
  parts.push(headHtml(m));
  parts.push(weekdaysHtml(m));
  parts.push('<div class="' + calendarMonthSlot('grid') + '">' + m.cells.map(cellHtml).join('') + '</div>');
  if (m.legend.length > 0) parts.push(legendHtml(m));
  if (m.note !== undefined) parts.push('<p class="' + calendarMonthSlot('note') + '">' + esc(m.note) + '</p>');
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<CalendarMonthForm, (m: CalendarMonthModel) => string>> = {
  grid: renderGrid,
};

/** 渲染月历格（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderCalendarMonth(input: unknown): string {
  const m = normalizeCalendarMonth(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + CALENDAR_MONTH_CLASS + ' is-' + m.form + extra + '">'
    + SKELETONS[m.form](m) + '</div>';
}
