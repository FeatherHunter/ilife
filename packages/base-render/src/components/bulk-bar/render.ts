/** bulk-bar · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 形态 A：选中后浮出来的操作条（底部）——
 *
 *  骨架（顺序固定，判据逐槽断）：
 *    `host`（列表 ＋ 操作条）→ `list`（一行一条，或**设计过的空态**）→ `bar`（选中 ≥1 条才出）
 *    → 每枚带预演的动作配一块 `confirm`（就地确认面：改成什么 ＋ 逐条「会改／跳过」＋ 页脚）。
 *
 *  四条硬口径（判据断的就是它们）：
 *   · **整行是命中区**：一行是一个 `<label>`，勾选框的命中盒 44×44（视觉盒只有 24×24）；
 *     「点这一行的任何地方」都算勾/取消——手机上不必去戳那枚 24px 的小方块。
 *   · **勾选态至少两重非颜色标记**：勾里的对钩 `✓`（字）＋ 选中行左端的 2px 强调侧标（形）；
 *     底色只是第三重（整行选中走 `surface-2`，见《选中态与皮肤语言》四档口径）。
 *   · **选中 0 条 ⇒ 整条 `hidden`**：移出可点范围与读屏顺序，不只是变透明（原型的那条硬要求）。
 *   · **预演先于动作**：带 `preview` 的那一枚动作按下去只展开确认面；**改哪几条、哪条跳过**先写清楚，
 *     主按钮的字按「会改几条」算（`改这 2 条`），一条都改不了时它是 `disabled` 的。
 */
import { esc } from '../shared/escape.js';
import {
  BULK_BAR_ACTION_ATTR,
  BULK_BAR_BUSY_ATTR,
  BULK_BAR_CANCEL_ATTR,
  BULK_BAR_CLASS,
  BULK_BAR_COUNT_SUFFIX,
  BULK_BAR_FORM_ATTR,
  BULK_BAR_ITEM_ATTR,
  BULK_BAR_KEEP_MARK,
  BULK_BAR_KEEP_TEXT,
  BULK_BAR_NAME_ATTR,
  BULK_BAR_ON_ATTR,
  BULK_BAR_RECENT_ATTR,
  BULK_BAR_SKIP_MARK,
  BULK_BAR_SKIP_TEXT,
  BULK_BAR_SUBMIT_ATTR,
  BULK_BAR_TONE_ATTR,
  bulkBarSlot,
  type BulkBarForm,
} from './attrs.js';
import {
  bulkBarConfirmId,
  bulkBarCountId,
  bulkBarErrorId,
  bulkBarHintId,
  normalizeBulkBar,
  type BulkBarActionModel,
  type BulkBarItemModel,
  type BulkBarModel,
  type BulkBarPreviewModel,
} from './model.js';

/** 一行：勾选框（命中盒 44×44）‖ 主字与副语 ‖ 右端读数。 */
function rowHtml(it: BulkBarItemModel): string {
  const parts: string[] = [];
  parts.push('<label class="' + bulkBarSlot('row') + (it.selected ? ' is-on' : '') + (it.disabled ? ' is-off' : '') + '">');
  parts.push('<span class="' + bulkBarSlot('check') + '">');
  parts.push('<input type="checkbox"' + (it.selected ? ' checked' : '') + (it.disabled ? ' disabled' : '')
    + ' value="' + esc(it.key) + '" ' + BULK_BAR_ITEM_ATTR + '="' + esc(it.key) + '"'
    + (it.selected ? ' ' + BULK_BAR_ON_ATTR + '="1"' : '') + '>');
  parts.push('<span class="' + bulkBarSlot('box') + '" aria-hidden="true"></span>');
  parts.push('</span>');
  parts.push('<span class="' + bulkBarSlot('text') + '">');
  parts.push('<b class="' + bulkBarSlot('name') + '">' + esc(it.title) + '</b>');
  if (it.note !== undefined) parts.push('<i class="' + bulkBarSlot('note') + '">' + esc(it.note) + '</i>');
  if (it.disabledReason !== undefined) parts.push('<i class="' + bulkBarSlot('why') + '">' + esc(it.disabledReason) + '</i>');
  parts.push('</span>');
  if (it.reading !== undefined) parts.push('<span class="' + bulkBarSlot('reading') + '">' + esc(it.reading) + '</span>');
  parts.push('</label>');
  return parts.join('');
}

/** 条目那一列；一条都没有 ⇒ **设计过的空态**（不是留白）。 */
function listHtml(m: BulkBarModel): string {
  const parts: string[] = ['<div class="' + bulkBarSlot('list') + '">'];
  if (m.items.length === 0) {
    parts.push('<p class="' + bulkBarSlot('empty') + '" role="status">' + esc(m.emptyText) + '</p>');
  } else {
    for (const it of m.items) parts.push(rowHtml(it));
  }
  parts.push('</div>');
  return parts.join('');
}

/** 一枚动作按钮。忙碌那枚字**住在正常那枚字里面**（不是并排的兄弟）：它绝对定位在标签这块上，
 *  一个字都不参与按钮的固有宽 ⇒ 换字不跳版、也不改变动作排的换行。 */
function actHtml(m: BulkBarModel, a: BulkBarActionModel, inConfirm: boolean): string {
  const parts: string[] = ['<button type="button" class="' + bulkBarSlot('act') + ' is-' + a.tone + '"'];
  if (!inConfirm) parts.push(' ' + BULK_BAR_ACTION_ATTR + '="' + esc(a.key) + '"');
  parts.push(' ' + BULK_BAR_TONE_ATTR + '="' + esc(a.tone) + '"');
  if (a.preview !== undefined) {
    parts.push(' aria-expanded="' + (m.openAction === a.key ? 'true' : 'false') + '"');
    parts.push(' aria-controls="' + esc(bulkBarConfirmId(m.name, a.key)) + '"');
  }
  if (a.error !== undefined) parts.push(' aria-describedby="' + esc(bulkBarErrorId(m.name, a.key)) + '"');
  else if (m.hint !== undefined) parts.push(' aria-describedby="' + esc(bulkBarHintId(m.name)) + '"');
  if (a.disabled || a.busy) parts.push(' disabled');
  if (a.busy) parts.push(' aria-busy="true" ' + BULK_BAR_BUSY_ATTR + '="1"');
  parts.push('>');
  parts.push('<span class="' + bulkBarSlot('label') + '">' + esc(a.label));
  parts.push('<span class="' + bulkBarSlot('busy') + '" aria-hidden="true">正在' + esc(a.label) + '</span>');
  parts.push('</span>');
  parts.push('</button>');
  return parts.join('');
}

/** 动作那一排（选中 ≥1 条时才在可点范围内）。 */
function actsHtml(m: BulkBarModel): string {
  const parts: string[] = ['<div class="' + bulkBarSlot('acts') + '">'];
  for (const a of m.actions) parts.push(actHtml(m, a, false));
  parts.push('</div>');
  return parts.join('');
}

/** 错态那句字：**写在按钮旁边**（按钮的 `aria-describedby` 指它），不只染色。 */
function errorHtml(m: BulkBarModel): string {
  const parts: string[] = [];
  for (const a of m.actions) {
    if (a.error === undefined) continue;
    parts.push('<p class="' + bulkBarSlot('error') + '" id="' + esc(bulkBarErrorId(m.name, a.key)) + '" role="alert">'
      + esc(a.label) + '：' + esc(a.error) + '</p>');
  }
  return parts.join('');
}

/** 预演里的一行：`✓` 会改 / `⊘` 跳过（形）＋ 右端两个字（字）＋ 旧值删除线（形）。 */
function previewRowHtml(row: BulkBarPreviewModel['rows'][number]): string {
  const parts: string[] = ['<p class="' + bulkBarSlot('prow') + (row.keep ? '' : ' is-skip') + '">'];
  parts.push('<i class="' + bulkBarSlot('mark') + '" aria-hidden="true">' + (row.keep ? BULK_BAR_KEEP_MARK : BULK_BAR_SKIP_MARK) + '</i>');
  parts.push('<span>');
  if (row.from !== undefined) {
    parts.push('<s class="' + bulkBarSlot('old') + '">' + esc(row.from) + '</s>');
    parts.push('<span class="' + bulkBarSlot('arrow') + '" aria-hidden="true">→</span>');
  }
  parts.push('<b class="' + bulkBarSlot('next') + '">' + esc(row.to) + '</b>');
  if (row.note !== undefined) parts.push('<span class="' + bulkBarSlot('pnote') + '">' + esc(row.note) + '</span>');
  parts.push('</span>');
  parts.push('<em class="' + bulkBarSlot('pstate') + '">' + (row.keep ? BULK_BAR_KEEP_TEXT : BULK_BAR_SKIP_TEXT) + '</em>');
  parts.push('</p>');
  return parts.join('');
}

/** 就地确认面：改成什么（输入 ＋ 最近用过）→ 会改哪几条（逐条）→ 页脚（结论 ＋ 取消 ＋ 主按钮）。 */
function confirmHtml(m: BulkBarModel, a: BulkBarActionModel, p: BulkBarPreviewModel): string {
  const parts: string[] = ['<div class="' + bulkBarSlot('confirm') + '" id="' + esc(bulkBarConfirmId(m.name, a.key)) + '"'
    + ' role="group" aria-label="' + esc(p.title) + '"' + (m.openAction === a.key ? '' : ' hidden') + '>'];
  parts.push('<div class="' + bulkBarSlot('chead') + '"><b class="' + bulkBarSlot('ctitle') + '">' + esc(p.title) + '</b>'
    + (p.cap === undefined ? '' : '<span class="' + bulkBarSlot('ccap') + '">' + esc(p.cap) + '</span>') + '</div>');
  parts.push('<div class="' + bulkBarSlot('cbody') + '">');
  parts.push('<label class="' + bulkBarSlot('value') + '"><span class="' + bulkBarSlot('vlabel') + '">' + esc(p.valueLabel) + '</span>'
    + '<input class="' + bulkBarSlot('input') + '" type="text" value="' + esc(p.value ?? '') + '"></label>');
  if (p.recent.length > 0) {
    parts.push('<div class="' + bulkBarSlot('recent') + '"><span class="' + bulkBarSlot('rlabel') + '">最近用过</span>');
    for (const one of p.recent) {
      parts.push('<button type="button" class="' + bulkBarSlot('chip') + '" ' + BULK_BAR_RECENT_ATTR + '="' + esc(one) + '">'
        + esc(one) + '</button>');
    }
    parts.push('</div>');
  }
  parts.push('</div>');
  parts.push('<div class="' + bulkBarSlot('preview') + '">');
  for (const row of p.rows) parts.push(previewRowHtml(row));
  parts.push('</div>');
  parts.push('<div class="' + bulkBarSlot('cfoot') + '">');
  parts.push('<span class="' + bulkBarSlot('sum') + '">' + esc(p.summary) + '</span>');
  /* 页脚两枚按钮**同时挂自己的槽类名**（`-cancel`／`-submit`）与视觉档（`is-plain`／`is-primary`）：
   *  槽名让调用方能按名字挂自己的钩子，视觉档仍归本件；闭集里不许有上不了屏的槽（判据断这一条）。 */
  parts.push('<button type="button" class="' + bulkBarSlot('act') + ' is-plain ' + bulkBarSlot('cancel') + '" '
    + BULK_BAR_CANCEL_ATTR + '="1">' + esc(p.cancelLabel) + '</button>');
  parts.push('<button type="button" class="' + bulkBarSlot('act') + ' is-primary ' + bulkBarSlot('submit') + '" '
    + BULK_BAR_SUBMIT_ATTR + '="' + esc(a.key) + '"' + (p.keepCount === 0 ? ' disabled' : '') + '>'
    + esc(p.submitLabel) + '</button>');
  parts.push('</div>');
  parts.push('</div>');
  return parts.join('');
}

/** 那条**浮出来的操作条**：已选数 ‖ 动作排 ‖ 提示（＋ 可能的错态与就地确认面）。 */
function barHtml(m: BulkBarModel): string {
  let selected = 0;
  for (const it of m.items) if (it.selected) selected += 1;
  const parts: string[] = ['<div class="' + bulkBarSlot('bar') + '"' + (selected === 0 ? ' hidden' : '') + '>'];
  parts.push('<p class="' + bulkBarSlot('count') + '" id="' + esc(bulkBarCountId(m.name)) + '" aria-live="polite">'
    + '<b class="' + bulkBarSlot('num') + '">' + String(selected) + '</b>'
    + '<span class="' + bulkBarSlot('unit') + '">' + esc(m.countUnit + BULK_BAR_COUNT_SUFFIX) + '</span>'
    + (m.tail === undefined ? '' : '<span class="' + bulkBarSlot('tail') + '">' + esc(m.tail) + '</span>')
    + '</p>');
  parts.push(actsHtml(m));
  if (m.hint !== undefined) {
    parts.push('<p class="' + bulkBarSlot('hint') + '" id="' + esc(bulkBarHintId(m.name)) + '">' + esc(m.hint) + '</p>');
  }
  parts.push(errorHtml(m));
  for (const a of m.actions) {
    if (a.preview === undefined) continue;
    parts.push(confirmHtml(m, a, a.preview));
  }
  parts.push('</div>');
  return parts.join('');
}

/** 形态 A 的骨架：宿主（条目那一列 ＋ 操作条）。操作条**在流内**（`position:sticky`），
 *  条顶永不带出宿主的下沿 ⇒ 条与条目从不重叠；长列表滚到中段时它仍粘在视口底部可达。 */
function renderSelectBar(m: BulkBarModel): string {
  return '<div class="' + bulkBarSlot('host') + '">' + listHtml(m) + barHtml(m) + '</div>';
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<BulkBarForm, (m: BulkBarModel) => string>> = {
  A: renderSelectBar,
};

/** 渲染批量操作条（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderBulkBar(input: unknown): string {
  const m = normalizeBulkBar(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + BULK_BAR_CLASS + ' is-' + m.form + extra + '"'
    + ' ' + BULK_BAR_NAME_ATTR + '="' + esc(m.name) + '"'
    + ' ' + BULK_BAR_FORM_ATTR + '="' + esc(m.form) + '">'
    + SKELETONS[m.form](m) + '</div>';
}
