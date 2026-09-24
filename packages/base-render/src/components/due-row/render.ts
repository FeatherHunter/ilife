/** due-row · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  形状：`表头（小标题 ＋ 口径）` → `逐行` → `脚注`。
 *  一行：左 `档位字 ＋ 名称 ＋ 补充 ＋ 该做什么`，右 `倒计时（放大）＋ 到期日 ＋ 动作按钮`。
 *
 *  它替掉的是哪几种错法：
 *   · 「还剩 18 天」埋在一句正文里 ⇒ 放大成读数，同页几件竖着比得出来；
 *   · 三档只换个标签颜色 ⇒ 左竖条与档位字各有线型（实线／点线／双线），色只是第三样；
 *   · 写着"该赶紧办了"却没有地方可按 ⇒ 每行一个真 `<button>`（触控 ≥44×44），点一下派发一条事件。
 */
import { esc } from '../shared/escape.js';
import {
  DUE_ACT_ATTR, DUE_ACT_LABEL_ATTR, DUE_DISABLED_ATTR, DUE_KEY_ATTR, DUE_LABEL_ATTR,
  DUE_LOADING_ATTR, DUE_LOADING_LABEL, DUE_TONE_ATTR, dueRowClass, dueRowSlot,
  type DueRowSlot, type DueRowTone,
} from './attrs.js';
import { normalizeDueRows, type NormalizedDueAction, type NormalizedDueRow } from './model.js';
import type { DueRowForm, DueRowInput, DueRowItem, DueRowTone as Tone } from './attrs.js';

export type { DueRowForm, DueRowInput, DueRowItem, DueRowSlot, Tone as DueRowTone };

/** 槽类名的本件内缩写（前缀固定 `ilife-`：换前缀是样式段的事）。 */
const slot = (name: DueRowSlot): string => dueRowSlot(name);

/** 档位 → `is-<档>` 类（左竖条、档位字与点的形状都挂在它上面，见 `style.ts`）。 */
const isTone = (tone: DueRowTone): string => ' is-' + tone;

/** 错态节点的 id（`aria-describedby` 指过来）：把键里不能进 id 的字符换成 `-`。 */
function errId(key: string): string {
  return 'ilife-due-err-' + key.replace(/[^A-Za-z0-9_-]+/g, '-');
}

/** 动作块：真按钮 ＋ 说明 ＋（可选）错句。 */
function actHtml(row: NormalizedDueRow): string {
  const action: NormalizedDueAction | undefined = row.action;
  if (action === undefined) {
    return row.error === undefined ? '' : '<span class="' + slot('err') + '" role="alert">' + esc(row.error) + '</span>';
  }
  const attrs = [
    'type="button"',
    'class="' + slot('button') + '"',
    DUE_ACT_ATTR + '="' + esc(action.key) + '"',
    DUE_ACT_LABEL_ATTR + '="' + esc(action.label) + '"',
    'aria-label="' + esc(row.name + '：' + action.label) + '"',
  ];
  if (action.disabled) attrs.push('disabled', 'aria-disabled="true"', DUE_DISABLED_ATTR + '="1"');
  if (action.loading) attrs.push('aria-busy="true"', DUE_LOADING_ATTR + '="1"');
  if (row.error !== undefined) attrs.push('aria-describedby="' + esc(errId(row.key)) + '"');
  const label = action.loading ? DUE_LOADING_LABEL : action.label;
  return '<span class="' + slot('act') + '">'
    + '<button ' + attrs.join(' ') + '>' + esc(label) + '</button>'
    + (action.note === undefined ? '' : '<span class="' + slot('act-note') + '">' + esc(action.note) + '</span>')
    + (row.error === undefined
      ? '' : '<span class="' + slot('err') + '" id="' + esc(errId(row.key)) + '" role="alert">' + esc(row.error) + '</span>')
    + '</span>';
}

function itemHtml(row: NormalizedDueRow): string {
  const meta = row.meta.length === 0
    ? ''
    : '<span class="' + slot('meta') + '">'
      + row.meta.map((t) => '<span>' + esc(t) + '</span>').join('') + '</span>';
  const note = row.note === undefined
    ? ''
    : '<span class="' + slot('note') + '">' + esc(row.note) + '</span>';
  const countdown = '<span class="' + slot('countdown') + '">'
    + (row.countdownLabel === undefined
      ? '' : '<span class="' + slot('countdown-label') + '">' + esc(row.countdownLabel) + '</span>')
    + '<b class="' + slot('count-value') + '">' + esc(row.countdown) + '</b>'
    + (row.countUnit === undefined
      ? '' : '<span class="' + slot('count-unit') + '">' + esc(row.countUnit) + '</span>')
    + '</span>';
  const due = row.due === undefined ? '' : '<span class="' + slot('due') + '">' + esc(row.due) + '</span>';
  return '<div class="' + slot('item') + isTone(row.tone) + '"'
    + ' ' + DUE_KEY_ATTR + '="' + esc(row.key) + '"'
    + ' ' + DUE_LABEL_ATTR + '="' + esc(row.name) + '"'
    + ' ' + DUE_TONE_ATTR + '="' + esc(row.tone) + '">'
    + '<div class="' + slot('body') + '">'
    + '<span class="' + slot('line1') + '">'
    + '<span class="' + slot('tag') + isTone(row.tone) + '">'
    + '<i class="' + slot('dot') + '" aria-hidden="true"></i>' + esc(row.tag) + '</span>'
    + '<span class="' + slot('name') + '">' + esc(row.name) + '</span>'
    + '</span>'
    + meta + note
    + '</div>'
    + '<div class="' + slot('side') + '">' + countdown + due + actHtml(row) + '</div>'
    + '</div>';
}

/** 到期行：一笔一行。空台账且没有空态那一句 ⇒ 出不了一个字。 */
export function renderDueRows(input: DueRowInput): string {
  const m = normalizeDueRows(input);
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
    : '<p class="' + slot('absent') + '">' + esc(m.absentLine) + '</p>';
  const foot = m.foot.length === 0
    ? ''
    : '<div class="' + slot('foot') + '">' + m.foot.map((t) => '<span>' + esc(t) + '</span>').join('') + '</div>';
  return '<div class="' + dueRowClass() + (m.extraClass === undefined ? '' : ' ' + m.extraClass) + '">'
    + head + list + absent + foot + '</div>';
}
