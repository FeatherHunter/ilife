/** kanban-columns · **渲染**（纯函数产 HTML；本件只有形态 `status`「按状态分列」一种骨架）。
 *
 *  —— 形态 status：按状态分列 ——
 *
 *  列＝状态（想做／在做／做过了），列头两级字（列名 ＋ 计数 ／ 它是干什么的）＋ 一枚加键；
 *  卡上写清它在哪一列（字，不是只靠列位置）；被选中的卡站起来并写明下一步点哪儿；
 *  空列撑到同高、列头与计数一直在（空列不许消失，否则人不知道能往哪儿收）。
 *  它替掉的两种错法：①「想做／在做／做过了混在一张清单里，靠一个字区分」；
 *  ②「东西摆在哪一列全靠备注里写一句」。
 *
 *  五条硬口径（判据断的就是它们）：
 *   · **整卡就是那颗按钮**：一张卡 ＝ 一枚 `<button>`（卡里没有第二颗按钮）；
 *     点它＝选中，再点＝取消；挪动靠每列那枚看得见的收纳键（**零拖拽手势**）；
 *   · **空列是合法态**：`cards: []` 出设计过的空槽（虚线框 ＋ 两句话），列头与计数一个不少；
 *   · **收纳键平时按不动**：没选中时整排 `disabled`（不是藏起来——藏起来等于没有备选通路）；
 *   · **状态不只靠颜色**：卡上那枚状态＝记号（形）＋ 列名（字）＋ 颜色（三样里至少两样）；
 *   · **列名与计数永不 `…`**（长了换行）；标记里**不写分隔符**（段间那道缝由样式承担）。
 */
import { esc } from '../shared/escape.js';
import {
  KANBAN_COLUMNS_ADD_ATTR,
  KANBAN_COLUMNS_ATTR,
  KANBAN_COLUMNS_CANCEL_ATTR,
  KANBAN_COLUMNS_CARD_ATTR,
  KANBAN_COLUMNS_CLASS,
  KANBAN_COLUMNS_COL_ATTR,
  KANBAN_COLUMNS_PICK_ATTR,
  KANBAN_COLUMNS_RECEIVE_ATTR,
  KANBAN_COLUMNS_SEG_ATTR,
  KANBAN_COLUMNS_SHOW_ATTR,
  KANBAN_COLUMNS_STATE_ATTR,
  KANBAN_COLUMNS_STATUS_ATTR,
  KANBAN_COLUMNS_TEXT,
  kanbanAddLabel,
  kanbanColumnsSlot,
  kanbanDropText,
  kanbanReceiveText,
  type KanbanColumnsForm,
} from './attrs.js';
import { normalizeKanbanColumns, type KanbanCardRow, type KanbanColumnRow, type KanbanColumnsModel } from './model.js';

/** 一张卡：标题 ＋ 副语 ＋ 状态（记号 ＋ 它在哪一列）。整卡是一枚按钮，没有第二颗。 */
function cardHtml(col: KanbanColumnRow, card: KanbanCardRow, picked: boolean): string {
  const classes = [kanbanColumnsSlot('card')];
  if (picked) classes.push('is-picked');
  const parts: string[] = ['<button type="button" class="' + classes.join(' ') + '"'
    + ' ' + KANBAN_COLUMNS_CARD_ATTR + '="' + esc(card.key) + '"'
    + ' ' + KANBAN_COLUMNS_STATE_ATTR + '="' + esc(col.key) + '"'
    + ' aria-pressed="' + (picked ? 'true' : 'false') + '">'];
  parts.push('<span class="' + kanbanColumnsSlot('title') + '">' + esc(card.title) + '</span>');
  if (card.meta !== undefined) {
    parts.push('<span class="' + kanbanColumnsSlot('meta') + '">' + esc(card.meta) + '</span>');
  }
  parts.push('<span class="' + kanbanColumnsSlot('badge') + '">'
    + '<i class="' + kanbanColumnsSlot('mark') + '" aria-hidden="true">' + esc(col.mark) + '</i>'
    + esc(card.badge) + '</span>');
  parts.push('</button>');
  return parts.join('');
}

/** 列头：第一级（列名 ＋ 计数）＋ 第二级（它是干什么的）＋ 加键。 */
function headHtml(col: KanbanColumnRow): string {
  const parts: string[] = ['<div class="' + kanbanColumnsSlot('head') + '">'];
  parts.push('<span class="' + kanbanColumnsSlot('name') + '">' + esc(col.name) + '</span>');
  parts.push('<span class="' + kanbanColumnsSlot('count') + '">' + esc(col.count) + '</span>');
  if (col.purpose !== undefined) {
    parts.push('<span class="' + kanbanColumnsSlot('purpose') + '">' + esc(col.purpose) + '</span>');
  }
  parts.push('<button type="button" class="' + kanbanColumnsSlot('add') + '"'
    + ' ' + KANBAN_COLUMNS_ADD_ATTR + '="' + esc(col.key) + '"'
    + ' aria-label="' + esc(kanbanAddLabel(col.name)) + '">' + esc(KANBAN_COLUMNS_TEXT.add) + '</button>');
  parts.push('</div>');
  return parts.join('');
}

/** 一列：列头 ＋ 列身（选中态的落点线 ＋ 卡 ＋ 空槽 ＋ 收纳键）。 */
function colHtml(m: KanbanColumnsModel, col: KanbanColumnRow): string {
  const pickedHere = m.picked !== undefined && m.picked.colKey === col.key;
  const canReceive = m.picked !== undefined && !pickedHere;
  const parts: string[] = ['<section class="' + kanbanColumnsSlot('col') + '"'
    + ' ' + KANBAN_COLUMNS_COL_ATTR + '="' + esc(col.key) + '"'
    + ' aria-label="' + esc(col.name + ' ' + col.count) + '">'];
  parts.push(headHtml(col));
  parts.push('<div class="' + kanbanColumnsSlot('body') + '">');
  if (canReceive) {
    parts.push('<p class="' + kanbanColumnsSlot('drop') + '">' + esc(kanbanDropText(col.name)) + '</p>');
  }
  for (const card of col.cards) {
    parts.push(cardHtml(col, card, m.picked !== undefined && m.picked.key === card.key));
  }
  if (col.cards.length === 0) {
    parts.push('<p class="' + kanbanColumnsSlot('slot') + '">'
      + esc(KANBAN_COLUMNS_TEXT.emptyTitle) + '<br>' + esc(KANBAN_COLUMNS_TEXT.emptyNote) + '</p>');
  }
  parts.push('<button type="button" class="' + kanbanColumnsSlot('receive') + '"'
    + ' ' + KANBAN_COLUMNS_RECEIVE_ATTR + '="' + esc(col.key) + '"'
    + (canReceive ? '' : ' disabled') + '>'
    + esc(kanbanReceiveText(col.name)) + '</button>');
  parts.push('</div>');
  parts.push('</section>');
  return parts.join('');
}

/** 窄档的分段切换：N 枚真按钮（宽档整条 `hidden`：三列本来就并排，不需要第二套入口）。 */
function switchHtml(m: KanbanColumnsModel): string {
  const parts: string[] = ['<div class="' + kanbanColumnsSlot('switch') + '" role="group"'
    + ' aria-label="' + esc('看哪一列') + '">'];
  m.columns.forEach((col, i) => {
    const at = i + 1;
    const on = at === m.activeCol;
    parts.push('<button type="button" class="' + kanbanColumnsSlot('seg') + (on ? ' is-on' : '') + '"'
      + ' ' + KANBAN_COLUMNS_SEG_ATTR + '="' + String(at) + '"'
      + ' aria-pressed="' + (on ? 'true' : 'false') + '">'
      + esc(col.name) + '</button>');
  });
  parts.push('</div>');
  return parts.join('');
}

/** 形态 status 的骨架：分段切换 → 列区 → 状态句（＋取消键）→ 脚注。 */
function renderStatus(m: KanbanColumnsModel): string {
  const pickedAttr = m.picked === undefined ? '' : ' ' + KANBAN_COLUMNS_PICK_ATTR + '="' + esc(m.picked.key) + '"';
  const parts: string[] = ['<div class="' + kanbanColumnsSlot('host') + '"'
    + ' ' + KANBAN_COLUMNS_ATTR + '="' + esc(m.id) + '"'
    + ' ' + KANBAN_COLUMNS_SHOW_ATTR + '="' + String(m.activeCol) + '"' + pickedAttr + '>'];
  parts.push(switchHtml(m));
  parts.push('<div class="' + kanbanColumnsSlot('cols') + ' is-n' + String(m.columns.length) + '">'
    + m.columns.map((col) => colHtml(m, col)).join('') + '</div>');
  parts.push('<p class="' + kanbanColumnsSlot('status') + '" role="status"'
    + ' ' + KANBAN_COLUMNS_STATUS_ATTR + '="' + esc(m.id) + '">' + esc(m.status) + '</p>');
  if (m.picked !== undefined) {
    parts.push('<button type="button" class="' + kanbanColumnsSlot('cancel') + '"'
      + ' ' + KANBAN_COLUMNS_CANCEL_ATTR + '="' + esc(m.id) + '">'
      + esc(KANBAN_COLUMNS_TEXT.cancel) + '</button>');
  }
  parts.push('<p class="' + kanbanColumnsSlot('hint') + '">' + esc(KANBAN_COLUMNS_TEXT.hint) + '</p>');
  parts.push('</div>');
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<KanbanColumnsForm, (m: KanbanColumnsModel) => string>> = {
  status: renderStatus,
};

/** 渲染看板列（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderKanbanColumns(input: unknown): string {
  const m = normalizeKanbanColumns(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + KANBAN_COLUMNS_CLASS + ' is-' + m.form + extra + '">' + SKELETONS[m.form](m) + '</div>';
}
