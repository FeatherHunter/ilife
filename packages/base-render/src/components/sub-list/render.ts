/** sub-list · **渲染**（纯函数产 HTML；本件只有形态 A「折叠组＋组级小计＋备货进度」一种骨架）。
 *
 *  —— 形态 A：折叠分组（卡内，原生 `<details>`）——
 *
 *  一组一枚 `<details>`：折页头（`<summary>`）左端是方向标，中间是**组名 ＋ 计数**，
 *  右端是**组级小计 ＋ 进度读数**，第二行一条**进度条**；展开是子项（勾／名／数量／值）。
 *
 *  要点三条：
 *   · **零脚本**：开合是浏览器原生的 `<details>`／`<summary>` —— 本件没有运行时段，
 *     键盘、读屏器、打印、禁 JS 的环境全都照常；
 *   · **状态不只靠颜色**：子项"备好"＝勾（形）＋ 名字转弱（色）＋ 折页头上的「6/6 已备」（字），
 *     三路里色只是其中一路；
 *   · **计数与进度都是算出来的**：组内几项＝子项条数，几条已备＝`done` 的条数——
 *     调用方给不了、也不该给（给了就会跟子项对不上）。
 *
 *  两条硬口径（判据断的就是它们）：
 *   · 0 组 ⇒ 空串（给了 `emptyText` 才出**设计过的**空态）；
 *   · 折页头的命中区 ≥44px（判据量得出）——它是本件唯一的可点元素。
 */
import { esc } from '../shared/escape.js';
import {
  SUB_LIST_CLASS,
  SUB_LIST_FORMS,
  subListSlot,
  type SubListForm,
} from './attrs.js';
import {
  normalizeSubList,
  type SubListGroupModel,
  type SubListItemModel,
  type SubListModel,
} from './model.js';

/** 头部那一排：标题 ＋ 用途 ＋ 合计（合计 `margin-left:auto` 顶到右缘，窄档自己折行）。 */
function headHtml(m: SubListModel): string {
  if (m.title === undefined && m.use === undefined && m.summary === undefined) return '';
  const parts: string[] = ['<div class="' + subListSlot('hd') + '">'];
  if (m.title !== undefined) parts.push('<b class="' + subListSlot('title') + '">' + esc(m.title) + '</b>');
  if (m.use !== undefined) parts.push('<span class="' + subListSlot('use') + '">' + esc(m.use) + '</span>');
  if (m.summary !== undefined) {
    parts.push('<span class="' + subListSlot('sum') + '">'
      + '<i class="' + subListSlot('sum-label') + '">' + esc(m.summary.label) + '</i>'
      + '<b class="' + subListSlot('sum-value') + '">' + esc(m.summary.value) + '</b>'
      + '</span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 一条子项：勾（形）／名／数量／值。 */
function itemHtml(item: SubListItemModel): string {
  const cls = subListSlot('r') + (item.done ? ' is-done' : '');
  return '<div class="' + cls + '">'
    + '<i class="' + subListSlot('ck') + '" aria-hidden="true">' + (item.done ? '\u2713' : '') + '</i>'
    + '<span class="' + subListSlot('n') + '">' + esc(item.label) + '</span>'
    + (item.measure === undefined ? '' : '<span class="' + subListSlot('q') + '">' + esc(item.measure) + '</span>')
    + (item.value === undefined ? '' : '<span class="' + subListSlot('v') + '">' + esc(item.value) + '</span>')
    + '</div>';
}

/** 折页头：方向标（样式画的 `▸`／`▾`）／组名 ＋ 计数／小计／进度条 ＋ 进度读数。 */
function head2Html(g: SubListGroupModel): string {
  const parts: string[] = ['<summary class="' + subListSlot('head') + '">'];
  parts.push('<i class="' + subListSlot('ar') + '" aria-hidden="true"></i>');
  parts.push('<span class="' + subListSlot('h') + '"><b class="' + subListSlot('label') + '">' + esc(g.label) + '</b>'
    + '<u class="' + subListSlot('count') + '">' + esc(g.count) + '</u></span>');
  parts.push(g.sum === undefined ? '' : '<span class="' + subListSlot('sub') + '">' + esc(g.sum) + '</span>');
  if (g.progress) {
    parts.push('<i class="' + subListSlot('pg') + '" aria-hidden="true">'
      + '<u class="' + subListSlot('pg-fill') + '" style="width:' + String(g.progressPercent) + '%"></u></i>');
    /* 进度的**文字**通路（色与长度都不是唯一信息）。 */
    parts.push('<span class="' + subListSlot('st') + '">' + esc(g.progressText) + '</span>');
  }
  parts.push('</summary>');
  return parts.join('');
}

/** 一个分组：`<details>`（`open` 由调用方定）＋ 折页头（必须是第一子元素）＋ 子项区。 */
function groupHtml(g: SubListGroupModel): string {
  const body = g.items.length === 0
    ? ''
    : '<div class="' + subListSlot('body') + '">' + g.items.map(itemHtml).join('') + '</div>';
  return '<details class="' + subListSlot('g') + '"' + (g.open ? ' open' : '') + '>'
    + head2Html(g) + body + '</details>';
}

/** 设计过的空态：0 组时报一句人话（不是"页面裂开一角"）。 */
function emptyHtml(text: string): string {
  return '<p class="' + subListSlot('empty') + '">' + esc(text) + '</p>';
}

/** 形态 A 的骨架。0 组 ＝ 空串（给了 `emptyText` 才出空态）。 */
function renderFold(m: SubListModel): string {
  if (m.groups.length === 0 && m.emptyText === undefined) return '';
  const parts: string[] = [headHtml(m)];
  if (m.groups.length === 0) {
    parts.push(emptyHtml(m.emptyText as string));
  } else {
    parts.push('<div class="' + subListSlot('list') + '">' + m.groups.map(groupHtml).join('') + '</div>');
  }
  if (m.note !== undefined) parts.push('<p class="' + subListSlot('note') + '">' + esc(m.note) + '</p>');
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<SubListForm, (m: SubListModel) => string>> = {
  fold: renderFold,
};

/** 渲染分组清单（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderSubList(input: unknown): string {
  const m = normalizeSubList(input);
  const body = SKELETONS[m.form](m);
  if (body === '') return '';
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + SUB_LIST_CLASS + ' is-' + m.form + extra + '">' + body + '</div>';
}
