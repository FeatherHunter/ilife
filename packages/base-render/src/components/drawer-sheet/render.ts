/** drawer-sheet · **渲染**（纯函数产 HTML；本件只有形态 C「多选 ＋ 完成 N 项」一种骨架）。
 *
 *  —— 形态 C：多选 ＋ 完成 N 项 ——
 *
 *  骨架＝**抓手 ＋ 标题 ＋ 副语 ＋ 可滚的候选项清单 ＋ 钉住的脚条**（已选几个 ＋ 完成键）。
 *  它替掉的两种错法：
 *   · 拿一串 `window.prompt`／逐个确认顶事——几条记录要点十几次；
 *   · 搓一个 `<div>` 弹层自己管焦点——焦点锁、`Esc`、背景不可点手搓必漏。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · 面板是**真 `<dialog>`**（`showModal()`）：遮罩、焦点锁、`Esc`、顶层都是浏览器给的；
 *   · 候选项**一行一个 `<label>` ＋ 真 `<input type=checkbox>`**：键盘、屏读器、原生勾选语义全在，
 *     整行是命中区（≥52px 高），相邻两行留 8px 缝；
 *   · **空态是设计过的**：一项都没有时出 `emptyLine` 那一格，并且完成键按不动（`disabled` ＋ 说明）。
 */
import { esc } from '../shared/escape.js';
import {
  DRAWER_ATTR, DRAWER_CLOSE_ATTR, DRAWER_COUNT_ATTR, DRAWER_COUNT_LEAD, DRAWER_COUNT_UNIT, DRAWER_DONE_ATTR,
  DRAWER_NOTE_ATTR, DRAWER_OPEN_ATTR, DRAWER_OPT_ATTR, DRAWER_TEMPLATE_ATTR, DRAWER_ZERO_ATTR, DRAWER_ZERO_NOTE,
  drawerClass, drawerOpenerClass, drawerSlot, type DrawerForm,
} from './attrs.js';
import { fillDoneCount, normalizeDrawerOpener, normalizeDrawerSheet, type DrawerModel } from './model.js';

/** 一枚候选项：整行是 `<label>`（命中区），里面一枚真勾选框 ＋ 文字块 ＋ 读数位。 */
function optionHtml(m: DrawerModel, at: number): string {
  const o = m.options[at];
  const attrs: string[] = [
    'class="' + drawerSlot('opt') + '"',
    DRAWER_OPT_ATTR + '="' + esc(o.value) + '"',
  ];
  if (o.disabled) attrs.push('data-ilife-drawer-off="1"');
  const box: string[] = ['class="' + drawerSlot('box') + '"', 'type="checkbox"'];
  if (o.checked) box.push('checked');
  if (o.disabled) box.push('disabled');
  return '<label ' + attrs.join(' ') + '>'
    + '<input ' + box.join(' ') + '>'
    + '<span class="' + drawerSlot('text') + '">' + esc(o.label)
    + (o.note === undefined ? '' : '<span class="' + drawerSlot('note') + '">' + esc(o.note) + '</span>')
    + '</span>'
    + (o.meta === undefined ? '' : '<span class="' + drawerSlot('meta') + '">' + esc(o.meta) + '</span>')
    + '</label>';
}

/** 清单：一项都没有时出**设计过的空态**（不留空壳、不拿占位符顶替）。 */
function bodyHtml(m: DrawerModel): string {
  if (m.options.length === 0) {
    return '<p class="' + drawerSlot('empty') + '">' + esc(m.emptyLine) + '</p>';
  }
  const rows = m.options.map((_, i) => optionHtml(m, i)).join('');
  const hint = m.hint === undefined ? '' : '<p class="' + drawerSlot('hint') + '">' + esc(m.hint) + '</p>';
  return '<div class="' + drawerSlot('body') + '">' + rows + hint + '</div>';
}

/** 脚条：计数（`<b>` 里那个数归运行时改）＋ 完成键（模板里 `{n}` 那处归运行时改）。 */
function footHtml(m: DrawerModel, picked: number): string {
  /* 两句脚注**都写在标记里**（`summary` 与「一个都没勾」），运行时只切 `hidden`——
     不在运行期拼人话：句子住标记，行为只切显隐。 */
  const note = m.summary === undefined ? '' : '<span class="' + drawerSlot('countnote') + '" '
    + DRAWER_NOTE_ATTR + '="1"' + (picked === 0 ? ' hidden' : '') + '>' + esc(m.summary) + '</span>';
  const zero = '<span class="' + drawerSlot('countnote') + '" ' + DRAWER_ZERO_ATTR + '="1"'
    + (picked === 0 ? '' : ' hidden') + '>' + esc(DRAWER_ZERO_NOTE) + '</span>';
  const count = '<span class="' + drawerSlot('count') + '" id="' + esc(m.id) + '-count">'
    + esc(DRAWER_COUNT_LEAD) + ' <b ' + DRAWER_COUNT_ATTR + '="">' + String(picked) + '</b> ' + esc(DRAWER_COUNT_UNIT)
    + note + zero + '</span>';
  const doneAttrs: string[] = [
    'class="' + drawerSlot('done') + '"',
    'type="button"',
    DRAWER_DONE_ATTR + '="1"',
    DRAWER_TEMPLATE_ATTR + '="' + esc(m.doneLabel) + '"',
  ];
  if (picked === 0) {
    /* 一个都没勾：完成键按不动，为什么写在脚条那句话里（不只变色）。 */
    doneAttrs.push('disabled', 'aria-disabled="true"');
  }
  const done = '<button ' + doneAttrs.join(' ') + '>' + esc(fillDoneCount(m.doneLabel, picked)) + '</button>';
  return '<div class="' + drawerSlot('foot') + '">' + count + done + '</div>';
}

/** 形态 C 的骨架。 */
function renderMulti(m: DrawerModel): string {
  const picked = m.options.filter((o) => o.checked && !o.disabled).length;
  const head = '<div class="' + drawerSlot('head') + '">'
    + '<div class="' + drawerSlot('headtext') + '">'
    + '<h2 class="' + drawerSlot('title') + '" id="' + esc(m.id) + '-title">' + esc(m.title) + '</h2>'
    + (m.sub === undefined ? '' : '<span class="' + drawerSlot('sub') + '">' + esc(m.sub) + '</span>')
    + '</div>'
    + '<button class="' + drawerSlot('close') + '" type="button" ' + DRAWER_CLOSE_ATTR + '="1" aria-label="关闭">✕</button>'
    + '</div>';
  const grab = m.edge === 'bottom'
    ? '<span class="' + drawerSlot('grab') + '" aria-hidden="true"></span>' : '';
  return grab + head + bodyHtml(m) + footHtml(m, picked);
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<DrawerForm, (m: DrawerModel) => string>> = {
  multi: renderMulti,
};

/** 渲染一个底部弹层（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderDrawerSheet(input: unknown): string {
  const m = normalizeDrawerSheet(input);
  const classes = [drawerClass(), 'is-' + m.form, 'edge-' + m.edge]
    .concat(m.extraClass === undefined ? [] : [m.extraClass]).join(' ');
  const attrs: string[] = [
    'class="' + esc(classes) + '"',
    'id="' + esc(m.id) + '"',
    DRAWER_ATTR + '="' + esc(m.id) + '"',
    'aria-labelledby="' + esc(m.id + '-title') + '"',
    'aria-describedby="' + esc(m.id + '-count') + '"',
  ];
  if (m.open) attrs.push('open');
  return '<dialog ' + attrs.join(' ') + '>' + SKELETONS[m.form](m) + '</dialog>';
}

/** 渲染一枚触发键（**焦点归还回路的另一头**：它带 `data-ilife-drawer-open`）。 */
export function renderDrawerOpener(input: unknown): string {
  const m = normalizeDrawerOpener(input);
  const classes = [drawerOpenerClass()].concat(m.extraClass === undefined ? [] : [m.extraClass]).join(' ');
  const label = m.label === undefined ? m.text : m.label;
  return '<button class="' + esc(classes) + '" type="button"'
    + ' ' + DRAWER_OPEN_ATTR + '="' + esc(m.sheetId) + '"'
    + ' aria-haspopup="dialog" aria-label="' + esc(label) + '">' + esc(m.text) + '</button>';
}
