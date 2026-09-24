/** goal-stairs · **渲染**（纯函数产 HTML；本件只有形态 C「倒推日程」一种骨架）。
 *
 *  —— 形态 C：倒推日程（每段最晚何时动手） ——
 *
 *  卡头说「倒推到哪天、分几段、竖线是哪天」，下面**一段一行**：行头说这一段是什么、
 *  窗口开在哪天、走到哪一步了；行里那条轨道把这一段在整段日程上**占了哪一截**画出来，
 *  上面一根竖线是今天。它替掉的两种错法：
 *   · 只有一个总进度条 —— 看不出分几段、也看不出每段最晚什么时候动手；
 *   · 只写目标日 —— 到期那天才发现来不及。
 *
 *  四条硬口径（判据断的就是它们）：
 *   · **状态靠形 ＋ 字 ＋ 色三样**：行头写状态字（字）＋ 窗口带左侧 2px 侧标（形）＋ 带色（色）；
 *     过期再加一枚「来不及 ✕」（字），不是只把那一行染红；
 *   · **日期与数字永不截断**：窗口句、最晚动手日、今天的日期都是整串上屏，轨道上那枚标签
 *     永远落在轨道里（标记过轴的一半时标签从标记往左长，见 `style.ts` 的 `is-right`）；
 *   · **装饰不上屏**：窗口带与今天那根竖线都是 `aria-hidden`，它们说的是行头与卡头已经说过的字；
 *   · **零 DOM、零脚本**：本件是纯展示件（没有一处可点元素），故**没有 `runtime.ts`**；
 *     宽度只由 `@container` 判。转义一律过 `shared/escape.ts`。
 */
import { esc } from '../shared/escape.js';
import {
  GOAL_STAIRS_CLASS,
  GOAL_STAIRS_LATE_WORD,
  GOAL_STAIRS_NOW_VAR,
  GOAL_STAIRS_START_VAR,
  GOAL_STAIRS_END_VAR,
  GOAL_STAIRS_TODAY_LEAD,
  goalStairsSlot,
  type GoalStairsSlot,
} from './attrs.js';
import { normalizeGoalStairs, type GoalStairsModel, type GoalStairsRowModel } from './model.js';

/** 槽类名（本件唯一的拼法；`style.ts` 从同一份槽位闭集取名，不各抄一份字面量）。 */
const c = (slot: GoalStairsSlot): string => goalStairsSlot(slot);

/** 位置写进行内自定义属性：**百分数两位小数**（同样的入参恒产同样的字节）。 */
const pct = (value: number): string => value.toFixed(2) + '%';

/** 卡头：标题 ＋ 段数 ＋ 右端那句（竖线是哪一天）。 */
function headHtml(m: GoalStairsModel): string {
  return '<div class="' + c('hd') + '">'
    + '<b class="' + c('title') + '">' + esc(m.title) + '</b>'
    + '<span class="' + c('count') + '">' + esc(m.countWord) + '</span>'
    + '<span class="' + c('tail') + '">'
    + '<span class="' + c('tail-lead') + '">' + esc(GOAL_STAIRS_TODAY_LEAD) + '</span>'
    + '<b class="' + c('tail-day') + '">' + esc(m.today) + '</b>'
    + '</span>'
    + '</div>';
}

/** 行头：段名与两端读数 ｜ 窗口句 ｜ 过期点名 ｜ 状态字（状态字自己顶到右缘）。 */
function headRowHtml(r: GoalStairsRowModel): string {
  const parts: string[] = ['<div class="' + c('head') + '">'];
  parts.push('<b class="' + c('name') + '">' + esc(r.name) + '</b>');
  parts.push('<span class="' + c('window') + '">' + esc(r.windowWord) + '</span>');
  if (r.late) parts.push('<span class="' + c('late') + '">' + esc(GOAL_STAIRS_LATE_WORD) + '</span>');
  parts.push('<span class="' + c('state') + ' is-' + r.state + '">' + esc(r.stateWord) + '</span>');
  parts.push('</div>');
  return parts.join('');
}

/** 一条轨道：窗口带（装饰）＋ 今天那根竖线（装饰）＋ 最晚动手日那枚标签（**有字，真读**）。
 *
 *  标签从标记往哪边长由 `is-right` 定：标记落在轴的右半边时改贴右缘长（判据在真机上量它不出轨道）。 */
function trackHtml(m: GoalStairsModel, r: GoalStairsRowModel): string {
  const style = GOAL_STAIRS_START_VAR + ': ' + pct(r.startPct) + '; '
    + GOAL_STAIRS_END_VAR + ': ' + pct(r.endPct) + '; '
    + GOAL_STAIRS_NOW_VAR + ': ' + pct(m.todayPct);
  return '<div class="' + c('track') + (r.dueFlip ? ' is-right' : '') + '" style="' + style + '">'
    + '<i class="' + c('band') + ' is-' + r.state + (r.late ? ' is-late' : '') + '" aria-hidden="true"></i>'
    + '<i class="' + c('today') + '" aria-hidden="true"></i>'
    + '<span class="' + c('due') + '">' + esc(r.dueWord) + '</span>'
    + '</div>';
}

/** 逐段那张表：`<ol>`（段的先后是这件事本身，用有序表，读屏也念得出第几段）。 */
function rowsHtml(m: GoalStairsModel): string {
  const rows = m.rows.map((r) => '<li class="' + c('row') + '">' + headRowHtml(r) + trackHtml(m, r) + '</li>');
  return '<ol class="' + c('rows') + '">' + rows.join('') + '</ol>';
}

/** 渲染目标阶梯（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderGoalStairs(input: unknown): string {
  const m = normalizeGoalStairs(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + GOAL_STAIRS_CLASS + ' is-' + m.form + extra + '">'
    + headHtml(m)
    + rowsHtml(m)
    + '<p class="' + c('note') + '">' + esc(m.note) + '</p>'
    + '</div>';
}
