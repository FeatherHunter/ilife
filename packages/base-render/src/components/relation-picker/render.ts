/** relation-picker · **渲染**（纯函数产 HTML；按 `overlay`／`inline` 两形态分派）。
 *
 *  —— 形态 `overlay`：浮层选一个 ——
 *
 *  字段行一枚看得见的触发键（读的是当前值），点开是一块顶层浮面：搜一行 ＋「最近用过」一组 ＋
 *  「全部」一组 ＋ 末行「新建」。它替掉的错法：几十个按拼音排、最常用的每次都得滚；库里没有时只能
 *  退出去先建好再回来选（末行就是把搜索词直接建成新的）。
 *
 *  —— 形态 `inline`：行内展开选一个 ——
 *
 *  不浮层，整块就在字段行下面推开：最近一排 ＋ 可搜的列表 ＋ 末行「新建」；选完收成一行读得出的
 *  结果（✓ ＋ 选了什么 ＋ 一枚真按钮「换」）。没选＝摊开，有选＝收起（`open: true` 可硬摊开）。
 *
 *  五条硬口径（判据断的就是它们）：
 *   · **开合不靠脚本**（`overlay`）：触发键带 `popovertarget`、浮面是原生 `popover`、
 *     点浮面外那一下是浏览器白送的；**浮面贴触发键**（触发键写逐实例 `anchor-name`、浮面写同一个名字的
 *     `position-anchor`），`inline` 下「换」那枚是真按钮，脚本没跑到时行内那块照渲染时的样子摆着；
 *   · **整行就是那颗按钮**：一行选项 ＝ 一枚 `<button>`，命中盒＝整行（≥52 高、通栏），行间留 8px 缝；
 *     「最近用过」那一枚 chip 是**同一个选项的又一处摆法**：机器键／可搜底串／名字格三样与那一行同源；
 *   · **选中两头同时可见**：字段行读当前值（`data-ilife-relation-value`）＋ 标签后面那句状态写「已选／正在选」、
 *     列表里那一行挂 `is-on` ＋ `aria-current="true"` ＋ ✓ 记号 ＋ 行尾「已选」二字（没选的写「选它」）；
 *   · **零键帽**：标记与文案里不出现键位提示，也没有「按某个键才怎样」这路话；
 *   · **同页多实例**：浮面 `id`、行内 `id` 与全部 `aria-*` 都按入参 `id` 逐实例派生（`wizard-shell` 同一处教训）。
 */
import { esc } from '../shared/escape.js';
import {
  RELATION_PICKER_ANCHOR_PREFIX,
  RELATION_PICKER_ATTR,
  RELATION_PICKER_CHANGE_ATTR,
  RELATION_PICKER_CHOSEN_ATTR,
  RELATION_PICKER_CLASS,
  RELATION_PICKER_CLEAR_ATTR,
  RELATION_PICKER_CREATE_ATTR,
  RELATION_PICKER_EMPTY_ATTR,
  RELATION_PICKER_FOOT_ATTR,
  RELATION_PICKER_FORM_ATTR,
  RELATION_PICKER_GROUP_ATTR,
  RELATION_PICKER_HIT_ATTR,
  RELATION_PICKER_INLINE_ATTR,
  RELATION_PICKER_ITEM_ATTR,
  RELATION_PICKER_NAME_ATTR,
  RELATION_PICKER_OPEN_ATTR,
  RELATION_PICKER_PANEL_ATTR,
  RELATION_PICKER_QUERY_ATTR,
  RELATION_PICKER_RECENT_ATTR,
  RELATION_PICKER_SEARCH_ATTR,
  RELATION_PICKER_TEXT,
  RELATION_PICKER_VALUE_ATTR,
  relationPickerSlot,
  type RelationPickerForm,
} from './attrs.js';
import { normalizeRelationPicker, type RelationPickerModel, type RelationPickerRow } from './model.js';
import { m } from '../../entries/index.js';

/** 命中词那一截的开标签：槽类名与 `data-*` 两样都写（样式按类命中、运行时段按锚重画）。 */
const HIT_OPEN = '<mark class="' + relationPickerSlot('hit') + '" ' + RELATION_PICKER_HIT_ATTR + '="1">';

/** 名字里的命中词：**逐处**标出来（大小写不敏感）；命中词那一截是形（下划线）＋ 字重，不只靠颜色。 */
function highlightHtml(text: string, term: string): string {
  if (term === '') return esc(text);
  const low = text.toLowerCase();
  const parts: string[] = [];
  let rest = text;
  let restLow = low;
  let at = restLow.indexOf(term);
  while (at >= 0) {
    parts.push(esc(rest.slice(0, at)), HIT_OPEN + esc(rest.slice(at, at + term.length)) + '</mark>');
    rest = rest.slice(at + term.length);
    restLow = restLow.slice(at + term.length);
    at = restLow.indexOf(term);
  }
  parts.push(esc(rest));
  return parts.join('');
}

/** 字段行：标签 ＋ 触发键（触发键里读的是当前值——选中两头的这一头）。
 *  `overlay` 下触发键还写一枚逐实例锚名（`anchor-name`）：浮面靠它贴到触发键下沿
 *  （静态 CSS 认不出逐实例的名字，故这枚名字由标记写、由浮面的 `position-anchor` 读）。 */
function fieldHtml(model: RelationPickerModel, panelId: string, isOverlay: boolean): string {
  const T = RELATION_PICKER_TEXT;
  const value = model.selected === undefined ? T.unpicked : model.selected.title;
  const state = model.selected === undefined ? T.picking : T.picked;
  const anchor = RELATION_PICKER_ANCHOR_PREFIX + model.id;
  const trigger = isOverlay
    ? '<button type="button" class="' + relationPickerSlot('box') + '"'
      + ' style="anchor-name: ' + esc(anchor) + '"'
      + ' ' + RELATION_PICKER_OPEN_ATTR + '="' + esc(model.id) + '"'
      + ' popovertarget="' + esc(panelId) + '" aria-haspopup="dialog" aria-controls="' + esc(panelId) + '"'
      + ' aria-expanded="false">'
    : '<button type="button" class="' + relationPickerSlot('box') + '"'
      + ' ' + RELATION_PICKER_OPEN_ATTR + '="' + esc(model.id) + '"'
      + ' aria-controls="' + esc(panelId) + '" aria-expanded="' + (model.expanded ? 'true' : 'false') + '">';
  return '<div class="' + relationPickerSlot('field') + '">'
    + '<span class="' + relationPickerSlot('label') + '">' + esc(model.label)
    + ' <em class="' + relationPickerSlot('state') + '">' + esc(T.stateLead + state) + '</em></span>'
    + trigger
    + '<span class="' + relationPickerSlot('value') + '" ' + RELATION_PICKER_VALUE_ATTR + '="' + esc(model.id) + '">'
    + esc(value) + '</span>'
    + '<span class="' + relationPickerSlot('caret') + '" aria-hidden="true">' + esc(T.caret) + '</span>'
    + '</button></div>';
}

/** 输入行 ＋（有错时的）错态行：错态**写在控件旁边**，并由输入框的 `aria-describedby` 指到它，不只染色。 */
function inputHtml(model: RelationPickerModel, searchLabel: string): string {
  const T = RELATION_PICKER_TEXT;
  const boxId = model.id + '-q';
  const errId = model.id + '-err';
  const described = model.error === undefined ? '' : ' aria-describedby="' + esc(errId) + '" aria-invalid="true"';
  const parts: string[] = ['<div class="' + relationPickerSlot('in') + '">'];
  parts.push('<input class="' + relationPickerSlot('q') + '" id="' + esc(boxId) + '" type="text"'
    + ' value="' + esc(model.query) + '" aria-label="' + esc(searchLabel) + '"'
    + ' ' + RELATION_PICKER_QUERY_ATTR + '="' + esc(model.id) + '"'
    + ' autocomplete="off" enterkeyhint="search"' + described + '>');
  parts.push('<button type="button" class="' + relationPickerSlot('clear') + '"'
    + ' ' + RELATION_PICKER_CLEAR_ATTR + '="' + esc(model.id) + '"'
    + ' aria-label="' + esc(T.clear) + '" aria-controls="' + esc(boxId) + '">✕</button>');
  parts.push('</div>');
  if (model.error !== undefined) {
    parts.push('<p class="' + relationPickerSlot('err') + '" id="' + esc(errId) + '" role="alert">'
      + esc(model.error) + '</p>');
  }
  return parts.join('');
}

/** 「最近用过」里的一枚 chip：**同一个选项的第三处摆法**——机器键、可搜底串、名字格三样都照着那一行写
 *  （少一样就会走散：2026-09 对抗审查读出，chip 只写了机器键，点它字段行读空串、结果行写「选好了 」）。
 *  露不露与那一行**同一条口径**（自己的 `hidden`；筛掉的那一枚常渲＋藏着，清空搜索词就回来）。 */
function chipHtml(model: RelationPickerModel, r: RelationPickerRow): string {
  return '<button type="button" class="' + relationPickerSlot('chip') + (r.selected ? ' is-on' : '') + '"'
    + ' ' + RELATION_PICKER_ITEM_ATTR + '="' + esc(r.key) + '"'
    + ' ' + RELATION_PICKER_SEARCH_ATTR + '="' + esc(r.haystack) + '"'
    + ' ' + RELATION_PICKER_RECENT_ATTR + '="1"'
    + (r.selected ? ' aria-current="true"' : '') + (r.hidden ? ' hidden' : '') + '>'
    + '<b class="' + relationPickerSlot('name') + '" ' + RELATION_PICKER_NAME_ATTR + '="1">'
    + highlightHtml(r.title, model.query.toLowerCase()) + '</b>'
    + '<span class="' + relationPickerSlot('tag') + '">' + esc(m('base-render.components-relation-picker-render.c002')) + '</span></button>';
}

/** 一行选项：记号 ＋ 名字（命中词标出来）＋ 副语 ＋ 读数（＋ `inline` 下行尾那一枚「已选／选它」）。 */
function rowHtml(model: RelationPickerModel, row: RelationPickerRow, withPick: boolean): string {
  const T = RELATION_PICKER_TEXT;
  const classes = [relationPickerSlot('row')];
  if (row.selected) classes.push('is-on');
  const parts: string[] = ['<button type="button" class="' + classes.join(' ') + '"'
    + ' ' + RELATION_PICKER_ITEM_ATTR + '="' + esc(row.key) + '"'
    + ' ' + RELATION_PICKER_SEARCH_ATTR + '="' + esc(row.haystack) + '"'
    + (row.recent ? ' ' + RELATION_PICKER_RECENT_ATTR + '="1"' : '')
    + (row.selected ? ' aria-current="true"' : '')
    + (row.hidden ? ' hidden' : '') + '>'];
  parts.push('<span class="' + relationPickerSlot('mk') + '" aria-hidden="true">'
    + esc(row.selected ? T.tick : T.dot) + '</span>');
  parts.push('<span class="' + relationPickerSlot('tx') + '">');
  parts.push('<b class="' + relationPickerSlot('name') + '" ' + RELATION_PICKER_NAME_ATTR + '="1">'
    + highlightHtml(row.title, model.query.toLowerCase()) + '</b>');
  if (row.note !== undefined) {
    parts.push('<em class="' + relationPickerSlot('note') + '">' + esc(row.note) + '</em>');
  }
  parts.push('</span>');
  if (row.reading !== undefined) {
    parts.push('<span class="' + relationPickerSlot('reading') + '">' + esc(row.reading) + '</span>');
  }
  if (withPick) {
    parts.push('<span class="' + relationPickerSlot('pick') + '">'
      + esc(row.selected ? T.pickedTag : T.pickTag) + '</span>');
  }
  parts.push('</button>');
  return parts.join('');
}

/** 一组（标题 ＋ 行容器；组里全被筛掉了，标题也跟着收起来）。 */
function groupHtml(model: RelationPickerModel, kind: string, title: string, rows: readonly RelationPickerRow[], withPick: boolean): string {
  if (rows.length === 0) return '';
  const hidden = rows.every((r) => r.hidden);
  return '<p class="' + relationPickerSlot('grp') + '" ' + RELATION_PICKER_GROUP_ATTR + '="' + kind + '"'
    + (hidden ? ' hidden' : '') + '>' + esc(title) + '</p>'
    + '<div class="' + relationPickerSlot('rows') + '">'
    + rows.map((r) => rowHtml(model, r, withPick)).join('') + '</div>';
}

/** 末行「新建」：前面一句 ＋ 把当前搜索词直接建成新的那一枚键。 */
function newHtml(model: RelationPickerModel): string {
  return '<div class="' + relationPickerSlot('new') + '">'
    + '<span class="' + relationPickerSlot('newlabel') + '">' + esc(model.newPrefix) + '</span>'
    + '<button type="button" class="' + relationPickerSlot('create') + '"'
    + ' ' + RELATION_PICKER_CREATE_ATTR + '="' + esc(model.query) + '">' + esc(model.createLabel) + '</button>'
    + '</div>';
}

/** 空态：一条都没命中时出来（`role="status"`，换词时屏读器会念这一句）。 */
function emptyHtml(model: RelationPickerModel): string {
  const shown = model.query !== '' && model.hits === 0;
  return '<p class="' + relationPickerSlot('empty') + '" ' + RELATION_PICKER_EMPTY_ATTR + '="' + esc(model.id) + '"'
    + ' role="status"' + (shown ? '' : ' hidden') + '>' + esc(model.empty) + '</p>';
}

/** 脚注行：这一屏**现在**是什么状态（常用去处／命中几条／换个词）。 */
function footHtml(model: RelationPickerModel): string {
  return '<p class="' + relationPickerSlot('foot') + '" ' + RELATION_PICKER_FOOT_ATTR + '="' + esc(model.id) + '">'
    + esc(model.foot) + '</p>';
}

/** 列头行（`overlay` 下给了 `readingLabel` 才出：sources 名／读数名与下面每行同一条内边距）。 */
function colhHtml(model: RelationPickerModel): string {
  if (model.readingLabel === undefined) return '';
  return '<div class="' + relationPickerSlot('colh') + '" aria-hidden="true">'
    + '<span class="' + relationPickerSlot('col') + '">' + esc(model.label) + '</span>'
    + '<span class="' + relationPickerSlot('colr') + '">' + esc(model.readingLabel) + '</span></div>';
}

/** 形态 `overlay` 的骨架：字段行 → 浮面（输入行 ＋ 列头 ＋ 两组 ＋ 末行新建 ＋ 空态 ＋ 脚注）。
 *  浮面读触发键那枚锚名（`position-anchor`）：贴触发键下沿，贴不下由 `position-try-fallbacks` 翻上去。 */
function renderOverlay(model: RelationPickerModel): string {
  const panelId = model.id + '-panel';
  return fieldHtml(model, panelId, true)
    + '<div class="' + relationPickerSlot('panel') + '" id="' + esc(panelId) + '" popover="auto" role="dialog"'
    + ' style="position-anchor: ' + esc(RELATION_PICKER_ANCHOR_PREFIX + model.id) + '"'
    + ' aria-label="' + esc(model.label) + '" ' + RELATION_PICKER_PANEL_ATTR + '="' + esc(model.id) + '">'
    + inputHtml(model, '搜' + model.label) + colhHtml(model)
    + groupHtml(model, 'recent', RELATION_PICKER_TEXT.recentGroup, model.recents, false)
    + groupHtml(model, 'all', model.allLabel, model.all, false)
    + newHtml(model) + emptyHtml(model) + footHtml(model) + '</div>';
}

/** 形态 `inline` 的骨架：字段行 → 行内块（输入行 ＋ 最近一排 ＋ 组头 ＋ 单列 ＋ 末行新建）→ 选完那一行。 */
function renderInline(model: RelationPickerModel): string {
  const T = RELATION_PICKER_TEXT;
  const inlineId = model.id + '-inline';
  const parts: string[] = [fieldHtml(model, inlineId, false)];
  parts.push('<div class="' + relationPickerSlot('inline') + '" id="' + esc(inlineId) + '"'
    + ' ' + RELATION_PICKER_INLINE_ATTR + '="' + esc(model.id) + '"' + (model.expanded ? '' : ' hidden') + '>');
  parts.push(inputHtml(model, '搜' + model.label));
  if (model.recents.length > 0) {
    /* 一枚都不露时，这条带子自己也收起来（与组头同一条口径：不给屏上留一条 20px 的空带）。 */
    const none = model.recents.every((r) => r.hidden);
    parts.push('<div class="' + relationPickerSlot('quick') + '"' + (none ? ' hidden' : '') + '>'
      + model.recents.map((r) => chipHtml(model, r)).join('')
      + '</div>');
  }
  parts.push('<p class="' + relationPickerSlot('gh') + '">' + esc(model.allLabel)
    + '<span class="' + relationPickerSlot('count') + '">' + esc(m('base-render.components-relation-picker-render.c001', { p0: String(String(model.all.length)) })) + '</span></p>');
  parts.push('<div class="' + relationPickerSlot('list') + '">'
    + model.all.map((r) => rowHtml(model, r, true)).join('') + '</div>');
  parts.push(newHtml(model) + emptyHtml(model) + footHtml(model));
  parts.push('</div>');
  /* 选完那一行：**常渲**（没选时 `hidden`；运行时选中一行就填上字并摊开它——选完必须收成一行读得出的结果）。 */
  {
    const s = model.selected;
    const result = s === undefined ? '' : s.title + (s.reading === undefined ? '' : '（' + s.reading + '）');
    parts.push('<div class="' + relationPickerSlot('chosen') + '"'
      + ' ' + RELATION_PICKER_CHOSEN_ATTR + '="' + esc(model.id) + '"'
      + (s === undefined ? ' hidden' : '') + '>'
      + '<span class="' + relationPickerSlot('tick') + '" aria-hidden="true">' + esc(T.tick) + '</span>'
      + '<span class="' + relationPickerSlot('tx') + '">'
      + '<b class="' + relationPickerSlot('result') + '">' + (s === undefined ? '' : esc(T.chosenPre) + ' ' + esc(result)) + '</b>'
      + '<em class="' + relationPickerSlot('why') + '">' + esc(m('base-render.components-relation-picker-render.c003')) + '</em>'
      + '</span>'
      + '<button type="button" class="' + relationPickerSlot('change') + '"'
      + ' ' + RELATION_PICKER_CHANGE_ATTR + '="' + esc(model.id) + '"'
      + ' aria-controls="' + esc(inlineId) + '">' + esc(T.change) + '</button></div>');
  }
  return parts.join('');
}

/** 形态 → 骨架（加第三形态就是加一支）。 */
const SKELETONS: Readonly<Record<RelationPickerForm, (m: RelationPickerModel) => string>> = {
  overlay: renderOverlay,
  inline: renderInline,
};

/** 渲染关系选择器（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderRelationPicker(input: unknown): string {
  const m = normalizeRelationPicker(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  const hint = m.hint === undefined ? ''
    : '<p class="' + relationPickerSlot('hint') + '">' + esc(m.hint) + '</p>';
  return '<div class="' + RELATION_PICKER_CLASS + ' is-' + m.form + extra + '"'
    + ' ' + RELATION_PICKER_ATTR + '="' + esc(m.id) + '"'
    + ' ' + RELATION_PICKER_FORM_ATTR + '="' + m.form + '">'
    + SKELETONS[m.form](m) + hint + '</div>';
}
