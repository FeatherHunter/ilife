/** drag-sort · **渲染**（纯函数产 HTML；本件只有 `lift`「拖拽中」一种骨架）。
 *
 *  —— 形态 `lift`：拖拽中 ——
 *
 *  卡头（一句标题 ＋ 一句拿法）→ 行区（把手 ＋ 序号 ＋ 名称格 ＋ 右端读数 ＋ 位置读数）→
 *  状态句（现在是 plain 还是 lifted 的真读数）→ 取消键（拿起态才露出来）。
 *  拿起态三样齐：拿起的那一行挂 `is-up`（自己站起来）、它后面跟一个虚线空槽（写出哪一步空着）、
 *  落点位前面画一条粗线（写出放第几位）——三样都带字，不只靠颜色。
 *
 *  四条硬口径（判据断的就是它们）：
 *   · **把手就是通路**：每一行一枚 44×44 的真 `<button>`（点一下拿起、再点另一行放下），
 *     拖拽（Pointer Events）只是同一份状态的另一条路，运行时段一行没跑到，点选这条路照样走得通；
 *   · **行里没有第二颗按钮**：位置读数与右端读数都是 `<span>` 的写法；
 *   · **零键盘语汇**：标记与文案里不出现长按／双击／方向键那一路，也没把它们当通路；
 *   · **序号与名称永不截断**：长了换行，样式段里没有省略手段。
 */
import { esc } from '../shared/escape.js';
import {
  DRAG_SORT_AT_ATTR,
  DRAG_SORT_ATTR,
  DRAG_SORT_CANCEL_ATTR,
  DRAG_SORT_CLASS,
  DRAG_SORT_HANDLE_ATTR,
  DRAG_SORT_KEY_ATTR,
  DRAG_SORT_LIFT_ATTR,
  DRAG_SORT_LINE_ATTR,
  DRAG_SORT_LIST_ATTR,
  DRAG_SORT_SLOT_ATTR,
  DRAG_SORT_STATUS_ATTR,
  DRAG_SORT_TEXT,
  dragSortSlot,
  type DragSortForm,
} from './attrs.js';
import { normalizeDragSort, type DragSortModel, type DragSortRow } from './model.js';

/** 把手里的 grip 记号（纯装饰，`aria-hidden`；形状由两列竖点给，不靠颜色）。 */
const GRIP = '<span aria-hidden="true">⋮⋮</span>';

/** 一行：把手 ＋ 序号 ＋ 名称格 ＋ 右端读数 ＋ 位置读数。 */
function rowHtml(row: DragSortRow, liftedKey: string | undefined): string {
  const classes = [dragSortSlot('row')];
  const lifted = liftedKey === row.key;
  if (lifted) classes.push('is-up');
  if (row.locked) classes.push('is-locked');
  const parts: string[] = ['<div class="' + classes.join(' ') + '"'
    + ' ' + DRAG_SORT_KEY_ATTR + '="' + esc(row.key) + '"'
    + (lifted ? ' aria-current="true"' : '') + '>'];
  parts.push('<button type="button" class="' + dragSortSlot('handle') + '"'
    + ' ' + DRAG_SORT_HANDLE_ATTR + '="' + esc(row.key) + '"'
    + ' aria-label="' + esc(row.grip) + '"'
    + (lifted ? ' aria-pressed="true"' : '')
    + (row.locked ? ' disabled' : '') + '>' + GRIP + '</button>');
  parts.push('<span class="' + dragSortSlot('index') + '">' + String(row.pos) + '</span>');
  parts.push('<span class="' + dragSortSlot('text') + '">');
  parts.push('<b class="' + dragSortSlot('name') + '">' + esc(row.label) + '</b>');
  if (row.note !== undefined) parts.push('<em class="' + dragSortSlot('note') + '">' + esc(row.note) + '</em>');
  if (row.why !== undefined) {
    parts.push('<em class="' + dragSortSlot('why') + '">'
      + esc(DRAG_SORT_TEXT.lockedPrefix + row.why) + '</em>');
  }
  parts.push('</span>');
  if (row.meta !== undefined) parts.push('<span class="' + dragSortSlot('meta') + '">' + esc(row.meta) + '</span>');
  parts.push('<span class="' + dragSortSlot('pos') + '">' + esc(row.posText) + '</span>');
  parts.push('</div>');
  return parts.join('');
}

/** 原位空槽（拿起态：虚线框 ＋ 写出哪一步空着、被拿起的是谁）。 */
function slotHtml(m: DragSortModel): string {
  if (m.lifted === undefined) return '';
  return '<div class="' + dragSortSlot('slot') + '"'
    + ' ' + DRAG_SORT_SLOT_ATTR + '="' + esc(m.lifted.key) + '">'
    + esc(m.slotText) + '</div>';
}

/** 落点粗线（拿起态：3px 实线 ＋ 写出放第几位）。 */
function lineHtml(m: DragSortModel): string {
  if (m.lifted === undefined) return '';
  return '<div class="' + dragSortSlot('drop') + '"'
    + ' ' + DRAG_SORT_LINE_ATTR + '="' + String(m.dropAt) + '"'
    + '><i aria-hidden="true"></i><b>' + esc(m.lineText) + '</b></div>';
}

/** 行区：按位走行表；落点线插在落点位那一行前面，空槽跟在被拿起那一行后面。 */
function listHtml(m: DragSortModel): string {
  const parts: string[] = ['<div class="' + dragSortSlot('list') + '"'
    + ' ' + DRAG_SORT_LIST_ATTR + '="' + esc(m.id) + '">'];
  for (const row of m.rows) {
    if (m.lifted !== undefined && row.pos === m.dropAt) parts.push(lineHtml(m));
    parts.push(rowHtml(row, m.lifted === undefined ? undefined : m.lifted.key));
    if (m.lifted !== undefined && row.key === m.lifted.key) parts.push(slotHtml(m));
  }
  parts.push('</div>');
  return parts.join('');
}

/** 形态 `lift` 的骨架：卡头 → 行区（含拿起态三样）→ 状态句 → 取消键。 */
function renderLift(m: DragSortModel): string {
  const lifted = m.lifted !== undefined;
  return '<div class="' + dragSortSlot('hd') + '">'
    + '<b class="' + dragSortSlot('title') + '">' + esc(m.title) + '</b>'
    + '<span class="' + dragSortSlot('hint') + '">' + esc(m.hint) + '</span>'
    + '</div>'
    + listHtml(m)
    + '<p class="' + dragSortSlot('status') + '" role="status"'
    + ' ' + DRAG_SORT_STATUS_ATTR + '="' + esc(m.id) + '">' + esc(m.status) + '</p>'
    + '<button type="button" class="' + dragSortSlot('cancel') + '"'
    + ' ' + DRAG_SORT_CANCEL_ATTR + '="' + esc(m.id) + '"'
    + (lifted ? '' : ' hidden') + '>' + esc(DRAG_SORT_TEXT.cancel) + '</button>';
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<DragSortForm, (m: DragSortModel) => string>> = {
  lift: renderLift,
};

/** 渲染拖拽排序清单（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderDragSort(input: unknown): string {
  const m = normalizeDragSort(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  const lift = m.lifted === undefined ? '' : ' ' + DRAG_SORT_LIFT_ATTR + '="' + esc(m.lifted.key) + '"'
    + ' ' + DRAG_SORT_AT_ATTR + '="' + String(m.dropAt) + '"';
  return '<div class="' + DRAG_SORT_CLASS + ' is-' + m.form + extra + '"'
    + ' ' + DRAG_SORT_ATTR + '="' + esc(m.id) + '"' + lift + '>'
    + SKELETONS[m.form](m) + '</div>';
}
