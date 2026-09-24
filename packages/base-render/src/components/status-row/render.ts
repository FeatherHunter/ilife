/** status-row · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  形状：`头（小标题 ＋ 计数）` → `台账逐行` → `脚注`。
 *  一行里：`轨道点` · `名称 ＋ 阶段徽标 ……… 金额`，第二行 `补充 ……… 到期日 ＋ 注脚`。
 *  槽位各自独立：给哪几槽出哪几槽，缺的槽不留空位、不用占位符顶替。
 *
 *  它替掉的是哪几种错法：
 *   · 把「已还 3 期 / 本期待扣 / 未开始」写成三种颜色的小圆点（没有字）⇒ 色盲与黑白打印下全塌；
 *   · 一笔分期摊成三行正文（「已还 3 期」「第 4 期待扣 ¥620」「后续 8 期」）⇒ 读不出"这是同一笔的哪一段"；
 *   · 金额夹在句子中间（「还剩 ¥3,720 未还」）⇒ 同页多笔时对不齐、比不出大小。
 */
import { esc } from '../shared/escape.js';
import { statusRowClass, statusRowSlot, type StatusRowSlot, type StatusRowTone } from './attrs.js';
import { normalizeStatusRows, type NormalizedStatusRow } from './model.js';
import type { StatusRowForm, StatusRowInput, StatusRowItem } from './attrs.js';

export type { StatusRowForm, StatusRowInput, StatusRowItem, StatusRowSlot, StatusRowTone };

/** 槽类名的本件内缩写（前缀固定 `ilife-`：换前缀是样式段的事，标记只认缺省那套）。 */
const slot = (name: StatusRowSlot): string => statusRowSlot(name);

/** 档位 → `is-<档>` 类（形状与色都挂在它上面，见 `style.ts`）。 */
const isTone = (tone: StatusRowTone): string => ' is-' + tone;

/** 逐段一枚 `<span>`（分隔由列距承担，不写分隔符字符——仓规：拿字符当分隔＝该处缺 UI 设计）。 */
function segments(name: StatusRowSlot, parts: readonly string[]): string {
  if (parts.length === 0) return '';
  return parts.map((t) => '<span class="' + slot(name) + '">' + esc(t) + '</span>').join('');
}

/** 一行：轨道点 ＋ 两行正文。 */
function itemHtml(row: NormalizedStatusRow): string {
  const amount = row.amount === undefined
    ? ''
    : '<span class="' + slot('amount') + '">' + esc(row.amount)
      + (row.amountUnit === undefined ? '' : '<small>' + esc(row.amountUnit) + '</small>') + '</span>';
  const due = row.due === undefined
    ? ''
    : '<span class="' + slot('due') + isTone(row.dueTone) + '">' + esc(row.due)
      + (row.dueNote === undefined ? '' : '<em>' + esc(row.dueNote) + '</em>') + '</span>';
  const meta = segments('meta', row.meta);
  const line2 = meta === '' && due === '' ? '' : '<span class="' + slot('line2') + '">' + meta + due + '</span>';
  return '<div class="' + slot('item') + isTone(row.tone) + '">'
    + '<span class="' + slot('rail') + '" aria-hidden="true"><i class="' + slot('node') + '"></i></span>'
    + '<span class="' + slot('body') + '">'
    + '<span class="' + slot('line1') + '">'
    + '<span class="' + slot('name') + '">' + esc(row.name) + '</span>'
    + '<span class="' + slot('badge') + isTone(row.tone) + '">' + esc(row.phase) + '</span>'
    + amount
    + '</span>'
    + line2
    + '</span>'
    + '</div>';
}

/** 状态台账行：一笔一行。空台账且没有空态那一句 ⇒ 出不了一个字。 */
export function renderStatusRows(input: StatusRowInput): string {
  const m = normalizeStatusRows(input);
  if (m.rows.length === 0 && m.absentLine === undefined) return '';
  const head = m.heading === undefined && m.count === undefined ? '' : '<div class="' + slot('head') + '">'
    + (m.heading === undefined ? '' : '<span class="' + slot('heading') + '">' + esc(m.heading) + '</span>')
    + (m.count === undefined ? '' : '<span class="' + slot('count') + '">' + esc(m.count) + '</span>')
    + '</div>';
  const list = m.rows.length === 0
    ? ''
    : '<div class="' + slot('list') + '">' + m.rows.map(itemHtml).join('') + '</div>';
  const absent = m.absentLine === undefined
    ? ''
    : '<div class="' + slot('absent') + '">' + esc(m.absentLine) + '</div>';
  const foot = m.foot.length === 0 ? '' : '<div class="' + slot('foot') + '">'
    + segments('foot', m.foot) + '</div>';
  return '<div class="' + statusRowClass() + (m.extraClass === undefined ? '' : ' ' + m.extraClass) + '">'
    + head + list + absent + foot
    + '</div>';
}
