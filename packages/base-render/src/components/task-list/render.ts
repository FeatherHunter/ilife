/** task-list · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  形状：`表头（标题 ＋ 整单进度）` → `进度条` → `分组（组头 ＋ 逐行）` → `空态` → `脚注`。
 *  一行：`勾选框 ・ 名称（＋行下小字） ……… 右侧读数`；错态另起一行写在勾选框旁边。
 *
 *  它替掉的是哪几种错法：
 *   · 勾上只变个颜色（没有框形、没有划线）⇒ 黑白打印与色盲下分不出勾没勾；
 *   · 整行只有复选框那 22×22 能点（手指够不到）⇒ 本件整行是命中区（≥44 高）；
 *   · 进度写死在文案里（「已买 5 / 11 样」）⇒ 勾了一样数字不动；本件把计数交给运行时现数。
 */
import { esc } from '../shared/escape.js';
import {
  TASK_CHECK_CLASS, TASK_COUNTS_ATTR, TASK_COUNTS_SEPARATOR, TASK_DONE_ATTR, TASK_GROUP_ATTR,
  TASK_HIT_CLASS, TASK_KEY_ATTR, TASK_LABEL_ATTR, TASK_LABEL_CLASS, TASK_LIST_ATTR,
  TASK_LIST_CLASS, TASK_OF_ATTR, TASK_BAR_ATTR, TASK_BUSY_ATTR, TASK_ROW_CLASS,
  TASK_ROW_DONE_CLASS, taskListSlot, type TaskListSlot,
} from './attrs.js';
import { normalizeTaskList, type NormalizedTaskRow, type TaskGroupModel } from './model.js';
import type { TaskListForm, TaskListInput, TaskListRow } from './attrs.js';

export type { TaskListForm, TaskListInput, TaskListRow, TaskListSlot };

/** 槽类名的本件内缩写（前缀固定 `ilife-`：换前缀是样式段的事，标记只认缺省那套）。 */
const slot = (name: TaskListSlot): string => taskListSlot(name);

/** 错态节点的 id（`aria-describedby` 指过来）：把键里不能进 id 的字符换成 `-`。 */
function errId(listKey: string, rowKey: string): string {
  return 'ilife-task-err-' + (listKey + '-' + rowKey).replace(/[^A-Za-z0-9_-]+/g, '-');
}

/** 计数文本（唯一格式：`5 / 11`；运行时按同一个格式改写）。 */
function counts(done: number, total: number): string {
  return done + TASK_COUNTS_SEPARATOR + total;
}

function doneCount(rows: readonly NormalizedTaskRow[]): number {
  let n = 0;
  for (const row of rows) if (row.done) n += 1;
  return n;
}

/** 一行：整行命中区（≥44 高）＝ 勾选框 ＋ 框形 ＋ 名称（＋小字）＋ 右侧读数。 */
function rowHtml(row: NormalizedTaskRow, listKey: string): string {
  const attrs = [
    'class="' + TASK_ROW_CLASS + (row.done ? ' ' + TASK_ROW_DONE_CLASS : '') + '"',
    TASK_KEY_ATTR + '="' + esc(row.key) + '"',
    TASK_LABEL_ATTR + '="' + esc(row.label) + '"',
  ];
  if (row.done) attrs.push(TASK_DONE_ATTR + '="1"');
  if (row.group !== undefined) attrs.push(TASK_GROUP_ATTR + '="' + esc(row.group) + '"');
  const boxAttrs = ['class="' + TASK_CHECK_CLASS + '"', 'type="checkbox"'];
  if (row.done) boxAttrs.push('checked');
  if (row.disabled) boxAttrs.push('disabled', 'aria-disabled="true"');
  const err = row.error === undefined
    ? ''
    : '<p class="' + slot('err') + '" id="' + esc(errId(listKey, row.key)) + '" role="alert">' + esc(row.error) + '</p>';
  if (row.error !== undefined) boxAttrs.push('aria-describedby="' + esc(errId(listKey, row.key)) + '"');
  return '<div ' + attrs.join(' ') + '>'
    + '<label class="' + TASK_HIT_CLASS + '">'
    + '<input ' + boxAttrs.join(' ') + '>'
    + '<span class="' + TASK_CHECK_CLASS + '-box" aria-hidden="true"></span>'
    + '<span class="' + TASK_LABEL_CLASS + '">' + esc(row.label)
    + (row.note === undefined ? '' : '<em class="' + slot('note') + '">' + esc(row.note) + '</em>')
    + '</span>'
    + (row.amount === undefined ? '' : '<span class="' + slot('amount') + '">' + esc(row.amount) + '</span>')
    + '</label>'
    + err
    + '</div>';
}

/** 一组：有组名才出组头（无组那一档的数由表头进度承担）。 */
function groupHtml(group: TaskGroupModel, listKey: string): string {
  const done = doneCount(group.rows);
  const head = group.title === ''
    ? ''
    : '<div class="' + slot('group-title') + '">'
      + '<span class="' + slot('group-name') + '">' + esc(group.title) + '</span>'
      + '<span class="' + slot('group-count') + '" ' + TASK_COUNTS_ATTR + '="1">'
      + counts(done, group.rows.length) + '</span>'
      + '</div>';
  return '<div class="' + slot('group') + '"' + (group.title === '' ? '' : ' ' + TASK_OF_ATTR + '="' + esc(group.title) + '"') + '>'
    + head
    + group.rows.map((row) => rowHtml(row, listKey)).join('')
    + '</div>';
}

/** 勾选清单：一条一行。空清单且没有空态那一句 ⇒ 出不了一个字。 */
export function renderTaskList(input: TaskListInput): string {
  const m = normalizeTaskList(input);
  if (m.rows.length === 0 && m.absentLine === undefined) return '';
  const done = doneCount(m.rows);
  const ratio = m.rows.length === 0 ? 0 : done / m.rows.length;
  const rootAttrs = ['class="' + TASK_LIST_CLASS + (m.extraClass === undefined ? '' : ' ' + m.extraClass) + '"',
    TASK_LIST_ATTR + '="' + esc(m.key) + '"'];
  if (m.busy) rootAttrs.push(TASK_BUSY_ATTR + '="1"', 'aria-busy="true"');
  const head = m.title === undefined && m.rows.length === 0 ? '' : '<div class="' + slot('head') + '">'
    + (m.title === undefined ? '' : '<span class="' + slot('title') + '">' + esc(m.title) + '</span>')
    + (m.rows.length === 0 ? '' : '<span class="' + slot('progress') + '">'
      + (m.progressLabel === undefined ? '' : esc(m.progressLabel) + ' ')
      + '<b ' + TASK_COUNTS_ATTR + '="1">' + counts(done, m.rows.length) + '</b>'
      + (m.progressUnit === undefined ? '' : ' ' + esc(m.progressUnit))
      + '</span>')
    + '</div>';
  const bar = m.rows.length === 0 ? '' : '<div class="' + slot('bar') + '" aria-hidden="true">'
    + '<i class="' + slot('bar-fill') + '" ' + TASK_BAR_ATTR + '="1" style="transform:scaleX('
    + ratio.toFixed(4) + ')"></i></div>';
  const body = m.rows.length === 0
    ? ''
    : '<div class="' + slot('body') + '">' + m.groups.map((g) => groupHtml(g, m.key)).join('') + '</div>';
  const absent = m.absentLine === undefined
    ? ''
    : '<div class="' + slot('absent') + '">' + esc(m.absentLine) + '</div>';
  const foot = m.foot.length === 0
    ? ''
    : '<div class="' + slot('foot') + '">'
      + m.foot.map((t) => '<span>' + esc(t) + '</span>').join('') + '</div>';
  return '<div ' + rootAttrs.join(' ') + '>' + head + bar + body + absent + foot + '</div>';
}
