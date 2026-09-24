/** command-palette · **渲染**（纯函数产 HTML；本件只有形态 A「单栏分组结果（动作在前／页面在后）」一种骨架）。
 *
 *  —— 形态 A：单栏分组结果 ——
 *
 *  一页顶部一枚**看得见的**入口键（不是隐式入口），点开是一块面板：搜一行 ＋ 两组结果 ＋ 一句脚注。
 *  两组的分界就是形态的识别特征：**动作在前**（在当前技能里直接做）、**页面在后**（跳到别的技能）。
 *  它替掉的错法：功能藏在三级菜单里只能一层层点；入口做成「按某个键才出现」（手机上等于不存在）；
 *  以及把「能去哪儿」摊成一长条不分组的清单（用户读到第三行还不知道这一条是就地做还是跳走）。
 *
 *  四条硬口径（判据断的就是它们）：
 *   · **开合不靠脚本**：入口键带 `popovertarget`、面板是原生 `popover`、关掉键带 `popovertargetaction="hide"`
 *     ⇒ 脚本整段没跑到，面板照常开、照常关（点面板外那一下也是浏览器白送的）；
 *   · **整行就是那颗按钮**：一行结果 ＝ 一枚 `<button>`（面板里唯一的一颗），行右那格「执行／打开」
 *     是它的写法（`<button>` 里再套 `<button>` 是无效标记）；**行里没有第二颗按钮**；
 *   · **零键帽**：标记与文案里不出现键位提示（也没有「按某个键才怎样」这路话）；
 *   · **不写分隔符、不写缺省占位**：分组标题那一行的括号是文案本身，段间那道缝由样式承担；
 *     长的名字**换行**，绝不 `…` 截断（主文字是这一行的身份）。
 */
import { esc } from '../shared/escape.js';
import {
  COMMAND_PALETTE_ATTR,
  COMMAND_PALETTE_CLASS,
  COMMAND_PALETTE_CLOSE_ATTR,
  COMMAND_PALETTE_EMPTY_ATTR,
  COMMAND_PALETTE_ERROR_ATTR,
  COMMAND_PALETTE_FOOT_ATTR,
  COMMAND_PALETTE_GROUP_ATTR,
  COMMAND_PALETTE_HIT_ATTR,
  COMMAND_PALETTE_ITEM_ATTR,
  COMMAND_PALETTE_KIND_ATTR,
  COMMAND_PALETTE_KINDS,
  COMMAND_PALETTE_LABEL_ATTR,
  COMMAND_PALETTE_LOADING_ATTR,
  COMMAND_PALETTE_OPEN_ATTR,
  COMMAND_PALETTE_PANEL_ATTR,
  COMMAND_PALETTE_QUERY_ATTR,
  COMMAND_PALETTE_SEARCH_ATTR,
  COMMAND_PALETTE_TEXT,
  commandPaletteSlot,
  type CommandPaletteForm,
  type CommandPaletteKind,
} from './attrs.js';
import { normalizeCommandPalette, type CommandPaletteModel, type CommandPaletteRow } from './model.js';

/** 入口键里那枚记号（放大镜）：`stroke="currentColor"`，颜色由样式的 `color` 给，SVG 自己不带色。 */
const SEARCH_SVG = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor"'
  + ' stroke-width="1.7" stroke-linecap="round" aria-hidden="true" focusable="false">'
  + '<circle cx="7" cy="7" r="4.6"/><path d="M10.6 10.6 14 14"/></svg>';

/** 命中词那一截的开标签：槽类名与 `data-*` 两样都写（样式按类命中、运行时段按锚重画）。 */
const HIT_OPEN = '<mark class="' + commandPaletteSlot('hit') + '" ' + COMMAND_PALETTE_HIT_ATTR + '="1">';

/** 主文字里的命中词：**逐处**标出来（大小写不敏感）；命中词那一截是形（下划线）＋ 字重，不只靠颜色。 */
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

/** 入口那一排：一枚看得见的按钮 ＋ 一句提示（提示解释「入口就是这一枚」）。 */
function entryHtml(m: CommandPaletteModel): string {
  return '<div class="' + commandPaletteSlot('entry') + '">'
    + '<button type="button" class="' + commandPaletteSlot('open') + '"'
    + ' ' + COMMAND_PALETTE_OPEN_ATTR + '="' + esc(m.id) + '"'
    + ' popovertarget="' + esc(m.id) + '" aria-haspopup="dialog" aria-controls="' + esc(m.id) + '"'
    + ' aria-expanded="false">'
    + '<i class="' + commandPaletteSlot('mark') + '" aria-hidden="true">' + SEARCH_SVG + '</i>'
    + esc(m.entry) + '</button>'
    + '<span class="' + commandPaletteSlot('hint') + '">' + esc(m.hint) + '</span>'
    + '</div>';
}

/** 输入行 ＋（有错时的）错态行：错态**写在控件旁边**，并由输入框的 `aria-describedby` 指到它，不只染色。 */
function inputHtml(m: CommandPaletteModel): string {
  const described = m.error === undefined ? '' : ' aria-describedby="' + esc(m.id) + '-err" aria-invalid="true"';
  const parts: string[] = ['<div class="' + commandPaletteSlot('in') + '">'];
  parts.push('<input class="' + commandPaletteSlot('q') + '" type="text" value="' + esc(m.query) + '"'
    + ' placeholder="' + esc(COMMAND_PALETTE_TEXT.query) + '" aria-label="' + esc(COMMAND_PALETTE_TEXT.query) + '"'
    + ' ' + COMMAND_PALETTE_QUERY_ATTR + '="' + esc(m.id) + '"'
    + ' autocomplete="off" enterkeyhint="search"' + described + '>');
  parts.push('<button type="button" class="' + commandPaletteSlot('x') + '"'
    + ' popovertarget="' + esc(m.id) + '" popovertargetaction="hide"'
    + ' ' + COMMAND_PALETTE_CLOSE_ATTR + '="' + esc(m.id) + '"'
    + ' aria-label="' + esc(COMMAND_PALETTE_TEXT.close) + '">✕</button>');
  parts.push('</div>');
  if (m.error !== undefined) {
    parts.push('<p class="' + commandPaletteSlot('err') + '" id="' + esc(m.id) + '-err" role="alert"'
      + ' ' + COMMAND_PALETTE_ERROR_ATTR + '="1">' + esc(m.error) + '</p>');
  }
  return parts.join('');
}

/** 一行结果：来源技能片 ＋ 主文字（命中词标出来）＋ 副文字 ＋ 行右那一格「要干什么」。 */
function rowHtml(m: CommandPaletteModel, row: CommandPaletteRow): string {
  const classes = [commandPaletteSlot('row')];
  if (row.disabled) classes.push('is-off');
  else if (row.primary) classes.push('is-primary');
  const parts: string[] = ['<button type="button" class="' + classes.join(' ') + '"'
    + ' ' + COMMAND_PALETTE_ITEM_ATTR + '="' + esc(row.id) + '"'
    + ' ' + COMMAND_PALETTE_KIND_ATTR + '="' + row.kind + '"'
    + ' ' + COMMAND_PALETTE_SEARCH_ATTR + '="' + esc(row.haystack) + '"'
    + (row.disabled ? ' disabled' : '') + (row.hidden ? ' hidden' : '') + '>'];
  if (row.skill !== undefined) {
    parts.push('<span class="' + commandPaletteSlot('sk') + '">' + esc(row.skill) + '</span>');
  }
  parts.push('<span class="' + commandPaletteSlot('tx') + '">');
  parts.push('<b class="' + commandPaletteSlot('lb') + '" ' + COMMAND_PALETTE_LABEL_ATTR + '="1">'
    + highlightHtml(row.label, m.query.toLowerCase()) + '</b>');
  if (row.note !== undefined) {
    parts.push('<em class="' + commandPaletteSlot('nt') + '">' + esc(row.note) + '</em>');
  }
  parts.push('</span>');
  parts.push('<span class="' + commandPaletteSlot('act') + '">' + esc(row.act) + '</span>');
  parts.push('</button>');
  return parts.join('');
}

/** 一枚分组标题：`动作（在当前技能里直接做）`——说明随标题一起给，读者不用猜这一组是什么。 */
function groupHtml(kind: CommandPaletteKind, hidden: boolean): string {
  const T = COMMAND_PALETTE_TEXT;
  const title = kind === 'action' ? T.actionGroup : T.pageGroup;
  const note = kind === 'action' ? T.actionNote : T.pageNote;
  return '<p class="' + commandPaletteSlot('grp') + '" ' + COMMAND_PALETTE_GROUP_ATTR + '="' + kind + '"'
    + (hidden ? ' hidden' : '') + '>' + esc(title) + '<b>（' + esc(note) + '）</b></p>';
}

/** 两组结果（按闭集顺序走行表；档一变就出一枚分组标题；一组全被筛掉了，标题也跟着收起来）。 */
function groupsHtml(m: CommandPaletteModel): string {
  const parts: string[] = [];
  for (const kind of COMMAND_PALETTE_KINDS) {
    const mine = m.rows.filter((r) => r.kind === kind);
    if (mine.length === 0) continue;
    parts.push(groupHtml(kind, mine.every((r) => r.hidden)));
    parts.push('<div class="' + commandPaletteSlot('rows') + '">'
      + mine.map((r) => rowHtml(m, r)).join('') + '</div>');
  }
  return parts.join('');
}

/** 脚注行：这一屏**现在**是什么状态（空输入列的是常用去处／命中几条／换个词／正在找）。 */
function footHtml(m: CommandPaletteModel): string {
  return '<p class="' + commandPaletteSlot('foot') + '" ' + COMMAND_PALETTE_FOOT_ATTR + '="' + esc(m.id) + '">'
    + esc(m.foot) + '</p>';
}

/** 空态：一条都没命中时出来（`role="status"`，换词时屏读器会念这一句）。 */
function emptyHtml(m: CommandPaletteModel): string {
  const shown = m.query !== '' && m.hits === 0;
  return '<p class="' + commandPaletteSlot('empty') + '" ' + COMMAND_PALETTE_EMPTY_ATTR + '="' + esc(m.id) + '"'
    + ' role="status"' + (shown ? '' : ' hidden') + '>' + esc(m.empty) + '</p>';
}

/** 形态 A 的骨架：入口 → 面板（输入行 ＋ 两组结果 ＋ 空态 ＋ 脚注）。 */
function renderList(m: CommandPaletteModel): string {
  const busy = m.loading ? ' aria-busy="true" ' + COMMAND_PALETTE_LOADING_ATTR + '="1"' : '';
  return entryHtml(m)
    + '<div class="' + commandPaletteSlot('panel') + '" id="' + esc(m.id) + '" popover="auto" role="dialog"'
    + ' aria-label="' + esc(m.label) + '" ' + COMMAND_PALETTE_PANEL_ATTR + '="' + esc(m.id) + '"' + busy + '>'
    + inputHtml(m) + groupsHtml(m) + emptyHtml(m) + footHtml(m) + '</div>';
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<CommandPaletteForm, (m: CommandPaletteModel) => string>> = {
  A: renderList,
};

/** 渲染命令面板（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderCommandPalette(input: unknown): string {
  const m = normalizeCommandPalette(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + COMMAND_PALETTE_CLASS + ' is-' + m.form + extra + '"'
    + ' ' + COMMAND_PALETTE_ATTR + '="' + esc(m.id) + '">' + SKELETONS[m.form](m) + '</div>';
}
