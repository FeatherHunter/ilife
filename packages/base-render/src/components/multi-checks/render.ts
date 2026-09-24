/** multi-checks · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 形态 A：顶上全选 ＋ 已选数／中间按分组列的复选／底下动作按钮 ——
 *
 *  骨架（顺序固定，判据逐槽断）：
 *    `box` → `label`（这清单是干什么的）→ `top`（全选 ＋ 已选数）→ `list`（`grp` 与散行交错）
 *    → `bar`（合计 ＋ 动作按钮）→ 可选的 `error`。
 *
 *  三条硬口径：
 *   · **原生复选语义**：`<input type="checkbox">` ＋ 整行/整块是 `<label>`（命中区 ≥44px）；
 *     视觉隐藏走 1px 盒 ＋ `opacity: 0`（**不是** `display:none`——那会把键盘可达性一起干掉）；
 *   · **勾选态至少两重标记**：勾选框里的对钩 `✓`（字）＋ 勾中那一行左端的 4px 竖条（形状）；
 *     底色只是第三重（颜色）；皮肤「大字报刊」下强调色＝墨黑时，前两重照样读得出；
 *   · **三态写在标记里**：全选／组头的「勾／半勾／没勾」三个状态都用 `checked` ＋ `aria-checked="mixed"`
 *     ＋ `data-ilife-checks-partial` 表达（原生 `indeterminate` 是 IDL 属性、进不了标记，
 *     运行时在 init 那一趟按这个标记落成它）。
 */
import { esc } from '../shared/escape.js';
import {
  MULTI_CHECKS_ACTION_ATTR,
  MULTI_CHECKS_ALL_ATTR,
  MULTI_CHECKS_AMOUNT_ATTR,
  MULTI_CHECKS_CLASS,
  MULTI_CHECKS_FORM_ATTR,
  MULTI_CHECKS_GROUP_ATTR,
  MULTI_CHECKS_ITEM_ATTR,
  MULTI_CHECKS_LOADING_ATTR,
  MULTI_CHECKS_MONEY_ATTR,
  MULTI_CHECKS_NAME_ATTR,
  MULTI_CHECKS_PARTIAL_ATTR,
  MULTI_CHECKS_PRIMARY_ATTR,
  MULTI_CHECKS_UNIT_ATTR,
  multiChecksSlot,
  type MultiChecksForm,
} from './attrs.js';
import {
  formatCents,
  multiChecksCountId,
  multiChecksCountText,
  multiChecksErrorId,
  multiChecksSumId,
  multiChecksSumText,
  normalizeMultiChecks,
  type MultiChecksGroupModel,
  type MultiChecksModel,
  type MultiChecksRowModel,
} from './model.js';

/** 一组的已勾条数与金额（三态与合计都从这里算：**渲染与运行时同一份口径**）。 */
function tally(rows: readonly MultiChecksRowModel[], selected: ReadonlySet<string>): { count: number; cents: number } {
  let count = 0;
  let cents = 0;
  for (const r of rows) {
    if (!selected.has(r.id)) continue;
    count += 1;
    if (r.amountCents !== undefined) cents += r.amountCents;
  }
  return { count, cents };
}

/** 一个原生勾选框（`aria-checked="mixed"` 是 SSR 面的半勾：运行时随后落成 `indeterminate`）。 */
function boxHtml(slot: 'cb'): string {
  return '<span class="' + multiChecksSlot(slot) + '" aria-hidden="true"></span>';
}

/** 勾选框本体（原生 `<input>`）＋ 装饰盒 ＋ 后面跟着的兄弟内容。 */
function checkLine(
  inputAttrs: readonly string[],
  checked: boolean,
  partial: boolean,
): string {
  const parts: string[] = ['<input type="checkbox"'];
  for (const a of inputAttrs) parts.push(' ' + a);
  if (checked) parts.push(' checked');
  if (partial) parts.push(' aria-checked="mixed"');
  parts.push('>');
  return parts.join('');
}

/** 全选头：一枚原生框（这一坨行的总开关）＋ 已选数。 */
function topHtml(m: MultiChecksModel): string {
  const t = tally(m.rows, m.selected);
  const total = m.rows.length;
  const partial = t.count > 0 && t.count < total;
  const attrs: string[] = [MULTI_CHECKS_ALL_ATTR + '=""'];
  if (m.loading) attrs.push('disabled');
  if (partial) attrs.push(MULTI_CHECKS_PARTIAL_ATTR + '="1"');
  return '<div class="' + multiChecksSlot('top') + '">'
    + '<label class="' + multiChecksSlot('all') + '">'
    + checkLine(attrs, total > 0 && t.count === total, partial)
    + boxHtml('cb')
    + '<span>' + esc(m.allText) + '</span>'
    + '</label>'
    + '<span class="' + multiChecksSlot('count') + '" id="' + esc(multiChecksCountId(m.name)) + '">'
    + esc(m.loading ? m.loadingText : multiChecksCountText(t.count, total, m.countUnit)) + '</span>'
    + '</div>';
}

/** 一行（整行是 `<label>` ⇒ 触控目标 = 行，恒 ≥48px 高）。 */
function rowHtml(m: MultiChecksModel, row: MultiChecksRowModel): string {
  const checked = m.selected.has(row.id);
  const inputDisabled = row.disabled || m.loading;
  const attrs: string[] = [
    'value="' + esc(row.id) + '"',
    MULTI_CHECKS_ITEM_ATTR + '="' + esc(row.id) + '"',
  ];
  if (row.group !== undefined) attrs.push(MULTI_CHECKS_GROUP_ATTR + '="' + esc(row.group) + '"');
  if (row.amountCents !== undefined) attrs.push(MULTI_CHECKS_AMOUNT_ATTR + '="' + esc(String(row.amountCents)) + '"');
  if (inputDisabled) attrs.push('disabled');
  if (m.required) attrs.push('aria-required="true"');

  /* 状态一律写在**原生面**上，不另挂 `is-*` 修饰类：勾选＝`input:checked`、禁用＝`input[disabled]`、
     加载＝根上的 `data-ilife-checks-loading`。两三个字母的类名是全仓共享的拼写空间，
     重名就会被别件的选择器命中（判据「跨件零交集」会红）。 */
  const parts: string[] = [];
  parts.push('<label class="' + multiChecksSlot('row') + '">');
  parts.push(checkLine(attrs, checked, false));
  parts.push(boxHtml('cb'));
  parts.push('<span class="' + multiChecksSlot('nm') + '">' + esc(row.title)
    + (row.note === undefined ? '' : '<i class="' + multiChecksSlot('note') + '">' + esc(row.note) + '</i>')
    + (row.disabledReason === undefined ? '' : '<i class="' + multiChecksSlot('why') + '">' + esc(row.disabledReason) + '</i>')
    + '</span>');
  if (row.amountText !== undefined) {
    parts.push('<span class="' + multiChecksSlot('amt') + '">' + esc(row.amountText) + '</span>');
  }
  parts.push('</label>');
  return parts.join('');
}

/** 分组头（整块是 `<label>`：勾上＝这一组全勾）＋ 组内各行。 */
function groupHtml(m: MultiChecksModel, g: MultiChecksGroupModel): string {
  const t = tally(g.rows, m.selected);
  const total = g.rows.length;
  const partial = t.count > 0 && t.count < total;
  const attrs: string[] = [MULTI_CHECKS_GROUP_ATTR + '="' + esc(g.id) + '"'];
  if (m.loading) attrs.push('disabled');
  if (partial) attrs.push(MULTI_CHECKS_PARTIAL_ATTR + '="1"');
  /* 组尾没给读数时：金额自己算一份——**这一组全部行**的合计（不是"勾中的那些"：
     组头是这一组的账，不是当前选择的账）。只在全部行都有金额时给。 */
  let note = g.note;
  if (note === undefined && m.money) {
    let all = 0;
    for (const r of g.rows) if (r.amountCents !== undefined) all += r.amountCents;
    note = (all < 0 ? '-' : '') + m.moneyUnit + formatCents(Math.abs(all));
  }
  const parts: string[] = ['<div class="' + multiChecksSlot('grp') + '">'];
  parts.push('<label class="' + multiChecksSlot('gh') + '">');
  parts.push(checkLine(attrs, total > 0 && t.count === total, partial));
  parts.push(boxHtml('cb'));
  parts.push('<span class="' + multiChecksSlot('gh-title') + '">' + esc(g.id) + '</span>');
  if (note !== undefined) parts.push('<span class="' + multiChecksSlot('gh-note') + '">' + esc(note) + '</span>');
  parts.push('</label>');
  for (const r of g.rows) parts.push(rowHtml(m, r));
  parts.push('</div>');
  return parts.join('');
}

/** 中间那一列：散行与分组按**调用方给的顺序**出（不重排：顺序是调用方的语义）。 */
function listHtml(m: MultiChecksModel): string {
  const groupsAt = new Map<string, MultiChecksGroupModel>();
  for (const g of m.groups) groupsAt.set(g.id, g);
  const done = new Set<string>();
  const parts: string[] = [];
  for (const r of m.rows) {
    if (r.group === undefined) { parts.push(rowHtml(m, r)); continue; }
    if (done.has(r.group)) continue;
    done.add(r.group);
    const g = groupsAt.get(r.group);
    if (g !== undefined) parts.push(groupHtml(m, g));
  }
  return '<div class="' + multiChecksSlot('list') + '">' + parts.join('') + '</div>';
}

/** 动作按钮（底下那一排；一枚都没勾时按不动，并把"为什么"指给顶上那句读数）。 */
function barHtml(m: MultiChecksModel): string {
  const t = tally(m.rows, m.selected);
  const totalCents = m.money ? t.cents : null;
  const sumText = m.loading ? m.loadingText : multiChecksSumText(t.count, m.countUnit, totalCents, m.moneyUnit);
  const parts: string[] = ['<div class="' + multiChecksSlot('bar') + '">'];
  parts.push('<span class="' + multiChecksSlot('sum') + '" id="' + esc(multiChecksSumId(m.name)) + '" aria-live="polite">'
    + esc(sumText) + '</span>');
  for (const a of m.actions) {
    const attrs: string[] = [
      'type="button"',
      'class="' + multiChecksSlot('act') + '"',
      MULTI_CHECKS_ACTION_ATTR + '="' + esc(a.id) + '"',
      /* 主按钮用 `data-*` 标记，不用 `is-primary` 这类修饰类（同上：类名会与别件撞名）。 */
      MULTI_CHECKS_PRIMARY_ATTR + '="' + (a.primary ? '1' : '0') + '"',
      /* 按钮永远把底下那句读数当说明：按不动时它就是"为什么按不动"（`一条都没勾`）。 */
      'aria-describedby="' + esc(multiChecksSumId(m.name)) + '"',
    ];
    if (t.count === 0 || m.loading) attrs.push('disabled');
    parts.push('<button ' + attrs.join(' ') + '>' + esc(a.label) + '</button>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 形态 A 的骨架。三个"没有正常内容"的状态各出各的骨架，互不叠：
 *  · 有条目 ⇒ 全选头 ＋ 列 ＋ 动作条（加载态下已选数**原地换字**，盒模型不动）；
 *  · 一条都没有 ＋ `loading` ⇒ 出「正在读取」；
 *  · 一条都没有 ＋ 不加载 ⇒ 出**设计过的空态**。 */
function renderGrouped(m: MultiChecksModel): string {
  const parts: string[] = [];
  parts.push('<p class="' + multiChecksSlot('label') + '"><b>' + esc(m.label) + '</b>'
    + (m.hint === undefined ? '' : '<span class="' + multiChecksSlot('hint') + '">' + esc(m.hint) + '</span>')
    + '</p>');
  if (m.rows.length === 0) {
    parts.push('<p class="' + multiChecksSlot(m.loading ? 'loading' : 'empty') + '" role="status">'
      + esc(m.loading ? m.loadingText : m.emptyText) + '</p>');
  } else {
    parts.push(topHtml(m));
    parts.push(listHtml(m));
    parts.push(barHtml(m));
  }
  if (m.error !== undefined) {
    parts.push('<p class="' + multiChecksSlot('error') + '" id="' + esc(multiChecksErrorId(m.name)) + '">' + esc(m.error) + '</p>');
  }
  return parts.join('');
}

/** 形态 → 骨架（加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<MultiChecksForm, (m: MultiChecksModel) => string>> = {
  grouped: renderGrouped,
};

/** 渲染多选清单（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderMultiChecks(input: unknown): string {
  const m = normalizeMultiChecks(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  const attrs: string[] = [
    'class="' + MULTI_CHECKS_CLASS + ' is-' + m.form + extra + '"',
    MULTI_CHECKS_NAME_ATTR + '="' + esc(m.name) + '"',
    MULTI_CHECKS_FORM_ATTR + '="' + esc(m.form) + '"',
    MULTI_CHECKS_UNIT_ATTR + '="' + esc(m.countUnit) + '"',
  ];
  if (m.money) attrs.push(MULTI_CHECKS_MONEY_ATTR + '="' + esc(m.moneyUnit) + '"');
  if (m.required) attrs.push('data-ilife-checks-required="1"');
  if (m.loading) attrs.push(MULTI_CHECKS_LOADING_ATTR + '="1"');
  return '<div ' + attrs.join(' ') + '>'
    + '<div class="' + multiChecksSlot('box') + '">' + SKELETONS[m.form](m) + '</div>'
    + '</div>';
}
