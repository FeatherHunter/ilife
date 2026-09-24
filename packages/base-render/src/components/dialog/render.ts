/** dialog · **渲染**（纯函数产 HTML；本件只有形态 A「确认型」一种骨架）。
 *
 *  —— 形态 A：确认型 ——
 *
 *  骨架＝**图标 ＋ 标题 ＋ 副语 ＋ 正文 ＋ 两条动作**（最后一条是主动作）。它替掉的两种错法：
 *   · 拿 `window.confirm` 顶事——字符串拼不出要点、样式不可控、窄屏上按钮位置随浏览器变；
 *   · 拿 `<div>` 叠 `z-index` 手搓模态——焦点锁、`Esc`、背景不可点这几件事手搓必漏（漏了就是键盘用户被锁在页面上）。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · 面板是**真 `<dialog>`**：`data-ilife-dialog` 是发现锚，`aria-labelledby` 指标题、
 *     `aria-describedby` 指正文（＋状态行）——屏读器读的是「这是个对话框 ＋ 它说什么」；
 *   · 动作键**一律真 `<button type=button>`**，机器值落 `data-ilife-dialog-act`
 *     （**不落 id**：`id` 归页面所有，组件不许占）；
 *   · 标记里**不写分隔符与省略号**：段间那道缝由样式承担；缺槽就不出那一槽（不留空位）。
 */
import { esc } from '../shared/escape.js';
import {
  DIALOG_ACT_ATTR, DIALOG_ATTR, DIALOG_CLASS, DIALOG_FORMS, DIALOG_OPEN_ATTR, DIALOG_OPENER_CLASS,
  dialogSlot, type DialogForm,
} from './attrs.js';
import { normalizeDialog, normalizeDialogOpener, type DialogModel } from './model.js';

/** 图标位那颗三角（`currentColor`：颜色由 `tone` 档给，SVG 自己不带色）。 */
const WARN_SVG = '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor"'
  + ' stroke-width="1.6" stroke-linejoin="round" aria-hidden="true" focusable="false">'
  + '<path d="M10 2.4 18.6 17H1.4Z"/><path d="M10 7.4v4.2" stroke-width="1.8" stroke-linecap="round"/>'
  + '<circle cx="10" cy="14.2" r="1" fill="currentColor" stroke="none"/></svg>';

/** 头部：图标位（`plain` 档不出）＋ 标题 ＋ 副语。 */
function headHtml(m: DialogModel): string {
  const parts: string[] = ['<div class="' + dialogSlot('head') + '">'];
  if (m.tone !== 'plain') parts.push('<span class="' + dialogSlot('icon') + '" aria-hidden="true">' + WARN_SVG + '</span>');
  parts.push('<div class="' + dialogSlot('headtext') + '">');
  parts.push('<h2 class="' + dialogSlot('title') + '" id="' + esc(m.id) + '-title">' + esc(m.title) + '</h2>');
  if (m.sub !== undefined) parts.push('<span class="' + dialogSlot('sub') + '">' + esc(m.sub) + '</span>');
  parts.push('</div></div>');
  return parts.join('');
}

/** 正文：逐段一枚 `<p>`（不写分隔符；滚的是这一格）。 */
function bodyHtml(m: DialogModel): string {
  const ps = m.body.map((line) => '<p>' + esc(line) + '</p>').join('');
  return '<div class="' + dialogSlot('body') + '" id="' + esc(m.id) + '-body">' + ps + '</div>';
}

/** 状态行：写在动作条上方（**不只染色**），并由面板的 `aria-describedby` 指到它。 */
function statusHtml(m: DialogModel): string {
  if (m.status === undefined) return '';
  const kind = m.status.kind;
  const mark = kind === 'busy' ? '…' : '⚠';
  return '<p class="' + dialogSlot('status') + '" id="' + esc(m.id) + '-status" role="status" aria-live="polite"'
    + ' data-ilife-dialog-status="' + esc(kind) + '"><b aria-hidden="true">' + mark + '</b>'
    + esc(m.status.text) + '</p>';
}

/** 动作条：最后一枚是主动作（样式按 `:last-child` 分档，标记里不写「主／次」类名）。 */
function footHtml(m: DialogModel): string {
  const parts: string[] = [];
  if (m.note !== undefined) parts.push('<p class="' + dialogSlot('note') + '">' + esc(m.note) + '</p>');
  parts.push('<div class="' + dialogSlot('foot') + '">');
  for (const act of m.actions) {
    parts.push('<button class="' + dialogSlot('act') + '" type="button"'
      + ' ' + DIALOG_ACT_ATTR + '="' + esc(act.value) + '">' + esc(act.label) + '</button>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 形态 A 的骨架。 */
function renderConfirm(m: DialogModel): string {
  return headHtml(m) + bodyHtml(m) + statusHtml(m) + footHtml(m);
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<DialogForm, (m: DialogModel) => string>> = {
  confirm: renderConfirm,
};

/** 渲染一个对话框（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderDialog(input: unknown): string {
  const m = normalizeDialog(input);
  const described = m.status === undefined ? [m.id + '-body'] : [m.id + '-body', m.id + '-status'];
  const attrs: string[] = [
    'class="' + esc([DIALOG_CLASS, 'is-' + m.form, 'tone-' + m.tone]
      .concat(m.extraClass === undefined ? [] : [m.extraClass]).join(' ')) + '"',
    'id="' + esc(m.id) + '"',
    DIALOG_ATTR + '="' + esc(m.id) + '"',
    'aria-labelledby="' + esc(m.id + '-title') + '"',
    'aria-describedby="' + esc(described.join(' ')) + '"',
  ];
  if (m.open) attrs.push('open');
  return '<dialog ' + attrs.join(' ') + '>' + SKELETONS[m.form](m) + '</dialog>';
}

/** 渲染一枚触发键（**焦点归还回路的另一头**：它带 `data-ilife-dialog-open`，运行时按它认）。 */
export function renderDialogOpener(input: unknown): string {
  const m = normalizeDialogOpener(input);
  const classes = [DIALOG_OPENER_CLASS].concat(m.extraClass === undefined ? [] : [m.extraClass]).join(' ');
  const label = m.label === undefined ? m.text : m.label;
  return '<button class="' + esc(classes) + '" type="button"'
    + ' ' + DIALOG_OPEN_ATTR + '="' + esc(m.dialogId) + '"'
    + ' aria-haspopup="dialog" aria-label="' + esc(label) + '">' + esc(m.text) + '</button>';
}
