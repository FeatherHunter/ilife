/** confirm-strip · **渲染**（纯函数产 HTML；零 DOM、零副作用。本件只有形态 A「清单式」一种骨架）。
 *
 *  —— 形态 A：把要删的先列出来 ——
 *
 *  四条硬口径（判据断的就是它们）：
 *   · **点名**：每一条的名称逐条上屏（`items`），**条数**在题面、危险按钮、机器属性三处一致；
 *   · **危险按钮写动词**：按钮的字由本件拼 `<动词>这 <条数> <量词>`（如「删掉这 3 条」），
 *     调用方给不出「确定」这类空词（`model.ts` 当场拦）；
 *   · **能不能撤销写在标记里**：徽标（`可撤销`／`不可撤销`）＋ 后果话前半句（`可以撤销`／`不能撤销`）
 *     ＋ `data-ilife-confirm-irreversible` —— 三处都是字，色只是第三样（大字报刊皮肤下强调色是墨黑，
 *     只靠红的危险档在那里会塌）；
 *   · **左安全、右危险**：动作排里安全动作在前、危险动作带 `margin-left:auto`（位置由样式钉，
 *     标记顺序＝读屏顺序＝「先给退路、再给危险」）。
 *
 *  状态（`rest`／`busy`／`disabled`）**不改版面**：状态行恒在标记里占位，只换里面的字、只换按钮的可点性。
 */
import { esc } from '../shared/escape.js';
import {
  CONFIRM_STRIP_ACT_ATTR,
  CONFIRM_STRIP_BACKUP_ATTR,
  CONFIRM_STRIP_CLASS,
  CONFIRM_STRIP_COUNT_ATTR,
  CONFIRM_STRIP_FORM_ATTR,
  CONFIRM_STRIP_IRREVERSIBLE_ATTR,
  CONFIRM_STRIP_STATE_ATTR,
  CONFIRM_STRIP_UNIT_ATTR,
  confirmStripSlot,
} from './attrs.js';
import { normalizeConfirmStrip, type ConfirmStripModel } from './model.js';

/** 每一条：名称（点名）＋ 旁证 ＋ 值（右对齐等宽数字，永不截断）。 */
function itemHtml(item: ConfirmStripModel['items'][number]): string {
  const parts: string[] = ['<li class="' + confirmStripSlot('item') + '">'];
  parts.push('<span class="' + confirmStripSlot('name') + '">' + esc(item.name) + '</span>');
  if (item.meta !== undefined) parts.push('<span class="' + confirmStripSlot('meta') + '">' + esc(item.meta) + '</span>');
  if (item.value !== undefined) parts.push('<span class="' + confirmStripSlot('value') + '">' + esc(item.value) + '</span>');
  parts.push('</li>');
  return parts.join('');
}

/** 备份复选项：整行是 `<label>`（触区 ≥44px），视觉盒子画在 `optbox` 上、控件本体留在可聚焦位置。 */
function optHtml(label: string): string {
  return '<label class="' + confirmStripSlot('opt') + '">'
    + '<input type="checkbox" checked ' + CONFIRM_STRIP_BACKUP_ATTR + '="">'
    + '<span class="' + confirmStripSlot('optbox') + '" aria-hidden="true"></span>'
    + '<span class="' + confirmStripSlot('opttext') + '">' + esc(label) + '</span>'
    + '</label>';
}

/** 形态 A 的骨架。 */
function renderList(m: ConfirmStripModel): string {
  const disabled = m.state === 'rest' ? '' : ' disabled aria-disabled="true"';
  const parts: string[] = [];

  parts.push('<div class="' + confirmStripSlot('head') + '">');
  parts.push('<span class="' + confirmStripSlot('badge') + '">' + esc(m.badge) + '</span>');
  parts.push('<b class="' + confirmStripSlot('title') + '">' + esc(m.title) + '</b>');
  parts.push('</div>');

  parts.push('<ul class="' + confirmStripSlot('items') + '">' + m.items.map(itemHtml).join('') + '</ul>');

  if (m.backupLabel !== undefined) parts.push(optHtml(m.backupLabel));

  /* 后果话：前半句（可以／不能撤销）加粗上色，后半句是撤销入口或后果 —— **两半都是字**。 */
  parts.push('<p class="' + confirmStripSlot('note') + '"><b>' + esc(m.noteLead) + '</b>'
    + '<span>' + esc(m.noteTail) + '</span></p>');

  /* 状态行：**三种状态都占位**（`rest` 时是空元素），切换状态因此不跳版。 */
  parts.push('<p class="' + confirmStripSlot('status') + '" role="status">' + esc(m.status) + '</p>');

  parts.push('<div class="' + confirmStripSlot('acts') + '">');
  parts.push('<button type="button" class="' + confirmStripSlot('keep') + '" '
    + CONFIRM_STRIP_ACT_ATTR + '="keep"' + disabled + '>' + esc(m.keepLabel) + '</button>');
  parts.push('<button type="button" class="' + confirmStripSlot('danger') + '" '
    + CONFIRM_STRIP_ACT_ATTR + '="danger"' + disabled + '>' + esc(m.dangerLabel) + '</button>');
  parts.push('</div>');

  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<ConfirmStripModel['form'], (m: ConfirmStripModel) => string>> = {
  list: renderList,
};

/** 渲染二次确认条（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderConfirmStrip(input: unknown): string {
  const m = normalizeConfirmStrip(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + CONFIRM_STRIP_CLASS + ' is-' + m.form + extra + '"'
    + ' role="group" aria-label="' + esc(m.title) + '"'
    + ' ' + CONFIRM_STRIP_FORM_ATTR + '="' + m.form + '"'
    + ' ' + CONFIRM_STRIP_STATE_ATTR + '="' + m.state + '"'
    + ' ' + CONFIRM_STRIP_COUNT_ATTR + '="' + String(m.count) + '"'
    + ' ' + CONFIRM_STRIP_UNIT_ATTR + '="' + esc(m.unit) + '"'
    + ' ' + CONFIRM_STRIP_IRREVERSIBLE_ATTR + '="' + (m.undoable ? '0' : '1') + '"'
    + '>' + SKELETONS[m.form](m) + '</div>';
}
