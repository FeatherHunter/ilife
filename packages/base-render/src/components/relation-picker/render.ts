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
 *     点浮面外那一下是浏览器白送的；`inline` 下「换」那枚是真按钮，脚本没跑到时行内那块照渲染时的样子摆着；
 *   · **整行就是那颗按钮**：一行选项 ＝ 一枚 `<button>`，命中盒＝整行（≥52 高、通栏），行间留 8px 缝；
 *   · **选中两头同时可见**：字段行读当前值（`data-ilife-relation-value`）、列表里那一行挂 `is-on` ＋
 *     `aria-current="true"` ＋ ✓ 记号 ＋ 行尾「已选」二字（没选的写「选它」）；
 *   · **零键帽**：标记与文案里不出现键位提示，也没有「按某个键才怎样」这路话；
 *   · **同页多实例**：浮面 `id`、行内 `id` 与全部 `aria-*` 都按入参 `id` 逐实例派生（`wizard-shell` 同一处教训）。
 */
import { esc } from '../shared/escape.js';
import {
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

/** 字段行：标签 ＋ 触发键（触发键里读的是当前值——选中两头的这一头）。 */
function fieldHtml(m: RelationPickerModel, panelId: string, isOverlay: boolean): string {
  const T = RELATION_PICKER_TEXT;
  const value = m.selected === undefined ? T.unpicked : m.selected.title;
  const state = m.selected === undefined ? T.picking : T.picked;
  const trigger = isOverlay
    ? '<button type="button" class="' + relationPickerSlot('box') + '"'
      + ' ' + RELATION_PICKER_OPEN_ATTR + '="' + esc(m.id) + '"'
      + ' popovertarget="' + esc(panelId) + '" aria-haspopup="dialog" aria-controls="' + esc(panelId) + '"'
      + ' aria-expanded="false">'
    : '<button type="button" class="' + relationPickerSlot('box') + '"'
      + ' ' + RELATION_PICKER_OPEN_ATTR + '="' + esc(m.id) + '"'
      + ' aria-controls="' + esc(panelId) + '" aria-expanded="' + (m.expanded ? 'true' : 'false') + '">';
  return '<div class="' + relationPickerSlot('field') + '">'
    + '<span class="' + relationPickerSlot('label') + '">' + esc(m.label)
    + ' <em class="' + relationPickerSlot('state') + '">— ' + esc(state) + '</em></span>'
    + trigger
    + '<span class="' + relationPickerSlot('value') + '" ' + RELATION_PICKER_VALUE_ATTR + '="' + esc(m.id) + '">'
    + esc(value) + '</span>'
    + '<span class="' + relationPickerSlot('caret') + '" aria-hidden="true">' + esc(T.caret) + '</span>'
    + '</button></div>';
}

/** 输入行 ＋（有错时的）错态行：错态**写在控件旁边**，并由输入框的 `aria-describedby` 指到它，不只染色。 */
function inputHtml(m: RelationPickerModel, searchLabel: string): string {
  const T = RELATION_PICKER_TEXT;
  const boxId = m.id + '-q';
  const errId = m.id + '-err';
  const described = m.error === undefined ? '' : ' aria-describedby="' + esc(errId) + '" aria-invalid="true"';
  const parts: string[] = ['<div class="' + relationPickerSlot('in') + '">'];
  parts.push('<input class="' + relationPickerSlot('q') + '" id="' + esc(boxId) + '" type="text"'
    + ' value="' + esc(m.query) + '" aria-label="' + esc(searchLabel) + '"'
    + ' ' + RELATION_PICKER_QUERY_ATTR + '="' + esc(m.id) + '"'
    + ' autocomplete="off" enterkeyhint="search"' + described + '>');
  parts.push('<button type="button" class="' + relationPickerSlot('clear') + '"'
    + ' ' + RELATION_PICKER_CLEAR_ATTR + '="' + esc(m.id) + '"'
    + ' aria-label="' + esc(T.clear) + '" aria-controls="' + esc(boxId) + '">✕</button>');
  parts.push('</div>');
  if (m.error !== undefined) {
    parts.push('<p class="' + relationPickerSlot('err') + '" id="' + esc(errId) + '" role="alert">'
      + esc(m.error) + '</p>');
  }
  return parts.join('');
}

/** 一行选项：记号 ＋ 名字（命中词标出来）＋ 副语 ＋ 读数（＋ `inline` 下行尾那一枚「已选／选它」）。 */
function rowHtml(m: RelationPickerModel, row: RelationPickerRow, withPick: boolean): string {
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
    + highlightHtml(row.title, m.query.toLowerCase()) + '</b>');
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
function groupHtml(m: RelationPickerModel, kind: string, title: string, rows: readonly RelationPickerRow[], withPick: boolean): string {
  if (rows.length === 0) return '';
  const hidden = rows.every((r) => r.hidden);
  return '<p class="' + relationPickerSlot('grp') + '" ' + RELATION_PICKER_GROUP_ATTR + '="' + kind + '"'
    + (hidden ? ' hidden' : '') + '>' + esc(title) + '</p>'
    + '<div class="' + relationPickerSlot('rows') + '">'
    + rows.map((r) => rowHtml(m, r, withPick)).join('') + '</div>';
}

/** 末行「新建」：前面一句 ＋ 把当前搜索词直接建成新的那一枚键。 */
function newHtml(m: RelationPickerModel): string {
  return '<div class="' + relationPickerSlot('new') + '">'
    + '<span class="' + relationPickerSlot('newlabel') + '">' + esc(m.newPrefix) + '</span>'
    + '<button type="button" class="' + relationPickerSlot('create') + '"'
    + ' ' + RELATION_PICKER_CREATE_ATTR + '="' + esc(m.query) + '">' + esc(m.createLabel) + '</button>'
    + '</div>';
}

/** 空态：一条都没命中时出来（`role="status"`，换词时屏读器会念这一句）。 */
function emptyHtml(m: RelationPickerModel): string {
  const shown = m.query !== '' && m.hits === 0;
  return '<p class="' + relationPickerSlot('empty') + '" ' + RELATION_PICKER_EMPTY_ATTR + '="' + esc(m.id) + '"'
    + ' role="status"' + (shown ? '' : ' hidden') + '>' + esc(m.empty) + '</p>';
}

/** 脚注行：这一屏**现在**是什么状态（常用去处／命中几条／换个词）。 */
function footHtml(m: RelationPickerModel): string {
  return '<p class="' + relationPickerSlot('foot') + '" ' + RELATION_PICKER_FOOT_ATTR + '="' + esc(m.id) + '">'
    + esc(m.foot) + '</p>';
}

/** 列头行（`overlay` 下给了 `readingLabel` 才出：sources 名／读数名与下面每行同一条内边距）。 */
function colhHtml(m: RelationPickerModel): string {
  if (m.readingLabel === undefined) return '';
  return '<div class="' + relationPickerSlot('colh') + '" aria-hidden="true">'
    + '<span class="' + relationPickerSlot('col') + '">' + esc(m.label) + '</span>'
    + '<span class="' + relationPickerSlot('colr') + '">' + esc(m.readingLabel) + '</span></div>';
}

/** 形态 `overlay` 的骨架：字段行 → 浮面（输入行 ＋ 列头 ＋ 两组 ＋ 末行新建 ＋ 空态 ＋ 脚注）。 */
function renderOverlay(m: RelationPickerModel): string {
  const panelId = m.id + '-panel';
  return fieldHtml(m, panelId, true)
    + '<div class="' + relationPickerSlot('panel') + '" id="' + esc(panelId) + '" popover="auto" role="dialog"'
    + ' aria-label="' + esc(m.label) + '" ' + RELATION_PICKER_PANEL_ATTR + '="' + esc(m.id) + '">'
    + inputHtml(m, '搜' + m.label) + colhHtml(m)
    + groupHtml(m, 'recent', RELATION_PICKER_TEXT.recentGroup, m.recents, false)
    + groupHtml(m, 'all', m.allLabel, m.all, false)
    + newHtml(m) + emptyHtml(m) + footHtml(m) + '</div>';
}

/** 形态 `inline` 的骨架：字段行 → 行内块（输入行 ＋ 最近一排 ＋ 组头 ＋ 单列 ＋ 末行新建）→ 选完那一行。 */
function renderInline(m: RelationPickerModel): string {
  const T = RELATION_PICKER_TEXT;
  const inlineId = m.id + '-inline';
  const parts: string[] = [fieldHtml(m, inlineId, false)];
  parts.push('<div class="' + relationPickerSlot('inline') + '" id="' + esc(inlineId) + '"'
    + ' ' + RELATION_PICKER_INLINE_ATTR + '="' + esc(m.id) + '"' + (m.expanded ? '' : ' hidden') + '>');
  parts.push(inputHtml(m, '搜' + m.label));
  if (m.recents.length > 0) {
    parts.push('<div class="' + relationPickerSlot('quick') + '">'
      + m.recents.filter((r) => !r.hidden).map((r) =>
        '<button type="button" class="' + relationPickerSlot('chip') + (r.selected ? ' is-on' : '') + '"'
        + ' ' + RELATION_PICKER_ITEM_ATTR + '="' + esc(r.key) + '"'
        + ' ' + RELATION_PICKER_RECENT_ATTR + '="1"'
        + (r.selected ? ' aria-current="true"' : '') + '>'
        + esc(r.title) + ' <span class="' + relationPickerSlot('tag') + '">用过</span></button>').join('')
      + '</div>');
  }
  parts.push('<p class="' + relationPickerSlot('gh') + '">' + esc(m.allLabel)
    + '<span class="' + relationPickerSlot('count') + '">' + esc(String(m.all.length) + ' 个') + '</span></p>');
  parts.push('<div class="' + relationPickerSlot('list') + '">'
    + m.all.map((r) => rowHtml(m, r, true)).join('') + '</div>');
  parts.push(newHtml(m) + emptyHtml(m) + footHtml(m));
  parts.push('</div>');
  /* 选完那一行：**常渲**（没选时 `hidden`；运行时选中一行就填上字并摊开它——选完必须收成一行读得出的结果）。 */
  {
    const s = m.selected;
    const result = s === undefined ? '' : s.title + (s.reading === undefined ? '' : '（' + s.reading + '）');
    parts.push('<div class="' + relationPickerSlot('chosen') + '"'
      + ' ' + RELATION_PICKER_CHOSEN_ATTR + '="' + esc(m.id) + '"'
      + (s === undefined ? ' hidden' : '') + '>'
      + '<span class="' + relationPickerSlot('tick') + '" aria-hidden="true">' + esc(T.tick) + '</span>'
      + '<span class="' + relationPickerSlot('tx') + '">'
      + '<b class="' + relationPickerSlot('result') + '">' + (s === undefined ? '' : esc(T.chosenPre) + ' ' + esc(result)) + '</b>'
      + '<em class="' + relationPickerSlot('why') + '">点「换」重新选一个（字段行与这一行始终读的是同一个值）</em>'
      + '</span>'
      + '<button type="button" class="' + relationPickerSlot('change') + '"'
      + ' ' + RELATION_PICKER_CHANGE_ATTR + '="' + esc(m.id) + '"'
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
