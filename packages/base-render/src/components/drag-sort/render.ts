/** drag-sort · **渲染**（纯函数产 HTML；按形态分派两档骨架）。
 *
 *  —— 形态 `lift`：拖拽中 ——
 *
 *  卡头（一句标题 ＋ 一句拿法）→ 行区（把手 ＋ 序号 ＋ 名称格 ＋ 右端读数 ＋ 位置读数）→
 *  状态句（现在是 plain 还是 lifted 的真读数）→ 取消键（拿起态才露出来）。
 *  拿起态三样齐：拿起的那一行挂 `is-up`（自己站起来）、它后面跟一个虚线空槽（写出哪一步空着）、
 *  落点位前面画一条粗线（写出放第几位）——三样都带字，不只靠颜色。
 *
 *  —— 形态 `buttons`：按钮排序 ——
 *
 *  卡头 → 行区（把手**只有字形** ＋ 名称格 ＋ 右端读数 ＋ 位置读数）→
 *  被选中那一行挂 `is-picked`（自己站起来：投影 ＋ 强调描边）并在行尾挂**两半控件**
 *  （「上移」｜「下移」，点哪半边就哪半边生效）；落点那一位上停一条**贯穿行宽的虚线预告**。
 *  **不写状态句、不画空槽、不搬原型上的旁白**：一屏只留一层话，同一个数只印一次（每行只有「第 n 位」那一处，
 *  总数住卡头那句），落点那句话就是那枚虚线预告自己（它同时是 `role="status"` 的活读数）。
 *
 *  四条硬口径（判据断的就是它们）：
 *   · **两条通路都在**：`lift` 档点把手拿起／再点另一行放下；`buttons` 档点一行选中／点两半控件挪一位——
 *     而拖拽（Pointer Events）在两档里都是同一份状态的那条路，**按钮不是唯一通路**；
 *   · **行里没有第二颗按钮**：位置读数与右端读数都是 `<span>` 的写法（两半控件只在被选中那一行上）；
 *   · **零键盘语汇**：标记与文案里不出现长按／双击／方向键那一路，也没把它们当通路；
 *   · **序号与名称永不截断**：长了换行，样式段里没有省略手段。
 */
import { esc } from '../shared/escape.js';
import {
  DRAG_SORT_AT_ATTR,
  DRAG_SORT_ATTR,
  DRAG_SORT_CANCEL_ATTR,
  DRAG_SORT_CLASS,
  DRAG_SORT_FORM_ATTR,
  DRAG_SORT_HANDLE_ATTR,
  DRAG_SORT_KEY_ATTR,
  DRAG_SORT_LIFT_ATTR,
  DRAG_SORT_LINE_ATTR,
  DRAG_SORT_LIST_ATTR,
  DRAG_SORT_MOVE_ATTR,
  DRAG_SORT_MOVE_DOWN,
  DRAG_SORT_MOVE_UP,
  DRAG_SORT_SLOT_ATTR,
  DRAG_SORT_STATUS_ATTR,
  DRAG_SORT_TEXT,
  dragSortSlot,
  dragSortText,
  type DragSortForm,
  type DragSortMove,
} from './attrs.js';
import { normalizeDragSort, type DragSortModel, type DragSortRow } from './model.js';

/** 把手里的 grip 记号（纯装饰，`aria-hidden`；形状由两列竖点给，不靠颜色）。 */
const GRIP = '<span aria-hidden="true">⋮⋮</span>';

/** 一把手（两档共用：`lift` 档＝点它拿起、`buttons` 档＝点它选中；无障碍名由 `model.ts` 算好）。 */
function handleHtml(row: DragSortRow, lifted: boolean): string {
  return '<button type="button" class="' + dragSortSlot('handle') + '"'
    + ' ' + DRAG_SORT_HANDLE_ATTR + '="' + esc(row.key) + '"'
    + ' aria-label="' + esc(row.grip) + '"'
    + (lifted ? ' aria-pressed="true"' : '')
    + (row.locked ? ' disabled' : '') + '>' + GRIP + '</button>';
}

/** 名称格（名称 ＋ 副语 ＋ 锁定原因）。 */
function textHtml(row: DragSortRow): string {
  const parts: string[] = ['<span class="' + dragSortSlot('text') + '">'];
  parts.push('<b class="' + dragSortSlot('name') + '">' + esc(row.label) + '</b>');
  if (row.note !== undefined) parts.push('<em class="' + dragSortSlot('note') + '">' + esc(row.note) + '</em>');
  if (row.why !== undefined) {
    parts.push('<em class="' + dragSortSlot('why') + '">'
      + esc(DRAG_SORT_TEXT.lockedPrefix + row.why) + '</em>');
  }
  parts.push('</span>');
  return parts.join('');
}

/** 右端读数（调用方给的样子，已经是给人看的）。 */
function metaHtml(row: DragSortRow): string {
  return row.meta === undefined
    ? ''
    : '<span class="' + dragSortSlot('meta') + '">' + esc(row.meta) + '</span>';
}

/** 位置读数（两种写法都由 `model.ts` 从 `DRAG_SORT_TEXT` 取好：第 n／m 位 或 只印自己那一位）。 */
function posHtml(row: DragSortRow): string {
  return '<span class="' + dragSortSlot('pos') + '">' + esc(row.posText) + '</span>';
}

/** 卡头（两档共用：一句标题 ＋ 右端一句拿法）。 */
function hdHtml(m: DragSortModel): string {
  return '<div class="' + dragSortSlot('hd') + '">'
    + '<b class="' + dragSortSlot('title') + '">' + esc(m.title) + '</b>'
    + '<span class="' + dragSortSlot('hint') + '">' + esc(m.hint) + '</span>'
    + '</div>';
}

/** 两半控件（`buttons` 档）：一个外框两半，点哪半边就哪半边生效。**只挂在被选中那一行上**。 */
function moveHtml(row: DragSortRow): string {
  const half = (side: DragSortMove, can: boolean): string => {
    const up = side === DRAG_SORT_MOVE_UP;
    return '<button type="button" class="' + dragSortSlot(up ? 'move-up' : 'move-down') + '"'
      + ' ' + DRAG_SORT_MOVE_ATTR + '="' + side + '"'
      + ' aria-label="' + esc(dragSortText(up ? 'moveUpName' : 'moveDownName', { label: row.label })) + '"'
      + (can ? '' : ' disabled') + '>'
      + esc(up ? DRAG_SORT_TEXT.moveUp : DRAG_SORT_TEXT.moveDown) + '</button>';
  };
  return '<span class="' + dragSortSlot('move') + '">'
    + half(DRAG_SORT_MOVE_UP, row.canUp) + half(DRAG_SORT_MOVE_DOWN, row.canDown) + '</span>';
}

/** 一行（形态 `lift`）：把手 ＋ 序号 ＋ 名称格 ＋ 右端读数 ＋ 位置读数。 */
function rowHtml(row: DragSortRow, liftedKey: string | undefined): string {
  const classes = [dragSortSlot('row')];
  const lifted = liftedKey === row.key;
  if (lifted) classes.push('is-up');
  if (row.locked) classes.push('is-locked');
  return '<div class="' + classes.join(' ') + '"'
    + ' ' + DRAG_SORT_KEY_ATTR + '="' + esc(row.key) + '"'
    + (lifted ? ' aria-current="true"' : '') + '>'
    + handleHtml(row, lifted)
    + '<span class="' + dragSortSlot('index') + '">' + String(row.pos) + '</span>'
    + textHtml(row) + metaHtml(row) + posHtml(row)
    + '</div>';
}

/** 一行（形态 `buttons`）：把手（只有字形）＋ 名称格 ＋ 右端读数 ＋ 位置读数 ＋（选中那一行才挂的）两半控件。
 *  **没有序号格**：它与位置读数是同一个数，这一档每行只印一次（用户口径：同一个数只印一次）。 */
function rowHtmlButtons(row: DragSortRow, pickedKey: string | undefined): string {
  const classes = [dragSortSlot('row')];
  const picked = pickedKey === row.key;
  if (picked) classes.push('is-picked');
  if (row.locked) classes.push('is-locked');
  return '<div class="' + classes.join(' ') + '"'
    + ' ' + DRAG_SORT_KEY_ATTR + '="' + esc(row.key) + '"'
    + (picked ? ' aria-current="true"' : '') + '>'
    + handleHtml(row, picked) + textHtml(row) + metaHtml(row) + posHtml(row)
    + (picked ? moveHtml(row) : '')
    + '</div>';
}

/** 原位空槽（`lift` 档拿起态才有：虚线框 ＋ 写出哪一步空着、被拿起的是谁）。
 *  `buttons` 档**不画空槽**——按钮排序不动身子，那一条会变成屏上的第二层话。 */
function slotHtml(m: DragSortModel): string {
  if (m.lifted === undefined || m.form === 'buttons') return '';
  return '<div class="' + dragSortSlot('slot') + '"'
    + ' ' + DRAG_SORT_SLOT_ATTR + '="' + esc(m.lifted.key) + '">'
    + esc(m.slotText) + '</div>';
}

/** 落点那条（`lift` 档＝3px 实线粗线；`buttons` 档＝贯穿行宽的虚线预告）。
 *  两档共用同一个槽位与同一个锚：它画的都是「将要放到第几位」。
 *  `buttons` 档**不另写状态句**——这一枚就是要念的读数，所以它自己带 `role="status"`。 */
function lineHtml(m: DragSortModel): string {
  if (m.lifted === undefined || m.lineText === '') return '';
  return '<div class="' + dragSortSlot('drop') + '"'
    + ' ' + DRAG_SORT_LINE_ATTR + '="' + String(m.dropAt) + '"'
    + (m.form === 'buttons' ? ' role="status"' : '')
    + '><i aria-hidden="true"></i><b>' + esc(m.lineText) + '</b></div>';
}

/** 行区：按位走行表；落点那条插在落点位那一行前面，空槽跟在被拿起那一行后面。 */
function listHtml(m: DragSortModel): string {
  const row = m.form === 'buttons' ? rowHtmlButtons : rowHtml;
  const parts: string[] = ['<div class="' + dragSortSlot('list') + '"'
    + ' ' + DRAG_SORT_LIST_ATTR + '="' + esc(m.id) + '">'];
  for (const one of m.rows) {
    if (m.lifted !== undefined && m.dropAt >= 1 && one.pos === m.dropAt) parts.push(lineHtml(m));
    parts.push(row(one, m.lifted === undefined ? undefined : m.lifted.key));
    if (m.lifted !== undefined && one.key === m.lifted.key) parts.push(slotHtml(m));
  }
  parts.push('</div>');
  return parts.join('');
}

/** 形态 `lift` 的骨架：卡头 → 行区（含拿起态三样）→ 状态句 → 取消键。 */
function renderLift(m: DragSortModel): string {
  const lifted = m.lifted !== undefined;
  return hdHtml(m)
    + listHtml(m)
    + '<p class="' + dragSortSlot('status') + '" role="status"'
    + ' ' + DRAG_SORT_STATUS_ATTR + '="' + esc(m.id) + '">' + esc(m.status) + '</p>'
    + '<button type="button" class="' + dragSortSlot('cancel') + '"'
    + ' ' + DRAG_SORT_CANCEL_ATTR + '="' + esc(m.id) + '"'
    + (lifted ? '' : ' hidden') + '>' + esc(DRAG_SORT_TEXT.cancel) + '</button>';
}

/** 形态 `buttons` 的骨架：卡头 → 行区（行 ＋ 选中那一行的两半控件 ＋ 虚线预告）。
 *  **没有状态句、没有取消键**：状态就是那枚虚线预告（`role="status"`），取消＝再点选中那一行。 */
function renderButtons(m: DragSortModel): string {
  return hdHtml(m) + listHtml(m);
}

/** 形态 → 骨架（两档各一支；加第三档就是加第三支）。 */
const SKELETONS: Readonly<Record<DragSortForm, (m: DragSortModel) => string>> = {
  lift: renderLift,
  buttons: renderButtons,
};

/** 渲染拖拽排序清单（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderDragSort(input: unknown): string {
  const m = normalizeDragSort(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  const lift = m.lifted === undefined ? '' : ' ' + DRAG_SORT_LIFT_ATTR + '="' + esc(m.lifted.key) + '"'
    + ' ' + DRAG_SORT_AT_ATTR + '="' + String(m.dropAt) + '"';
  /* 形态读数只在新档写：旧档的标记是已落地的契约（判据逐字节断），不给它多加一个字节。 */
  const formAttr = m.form === 'buttons'
    ? ' ' + DRAG_SORT_FORM_ATTR + '="' + esc(m.form) + '"' : '';
  return '<div class="' + DRAG_SORT_CLASS + ' is-' + m.form + extra + '"'
    + ' ' + DRAG_SORT_ATTR + '="' + esc(m.id) + '"' + lift + formAttr + '>'
    + SKELETONS[m.form](m) + '</div>';
}
