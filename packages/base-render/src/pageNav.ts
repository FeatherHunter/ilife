/** #950 · 页面级导航与元信息两件：**分段导航**（`renderSegmentedNav`）与**胶囊行**（`renderChipRow`）。
 *
 *  谁在用：本包（base-paint）的页面级形状层。落点口径与 `pageShapes.ts` 同：样式随本件出
 *  （`pageNavCss()` 由 `pageShapeCss()` 汇总进页），是否生效由整页装配的 `pageUi` 位决定。
 *
 *  为什么要这两件（第一性：**形状必须与角色同义**）：
 *   · **分段导航**：页内导航是**动作**，但 `renderTocBlock` 的胶囊与状态徽章（`ilife-block-chip`）
 *     同形——读者把「能点的」读成「标签」。分段控件的隐喻是「同层互斥切换」，
 *     与状态胶囊在形状上分得开（等宽分格 ＋ 选中项实底白卡 ＋ 图标位）。
 *   · **胶囊行**：`renderChips` 逐项出一枚裸 `<span class="ilife-block-chip">`，**没有容器**；
 *     裸行内元素落进 ≥1001px 的页壳网格（`pageUi.ts` ⑧ 的 `> * { grid-column: 2 }`）时，
 *     会被逐枚提升成**独占一行的整宽条**（用户截图那三根长条就是这么来的：同一份标记窄屏好、宽屏坏）。
 *     本件给一个「必须整行地出现」的入口，并把「行内元素不被拉伸」写进样式（对应 C2 守卫）。
 *
 *  为什么另立一件（不并进 `pageShapes.ts`）：那一件已 452 行、越过本包 350 行告警线，
 *  且它的三支管「媒体与事实」；本件管「导航与元信息」，变化频率不同（导航随整页骨架动）。
 *  **已超线，需要根据规则进行重构**（指 `pageShapes.ts`，非本件）：本件即按该拆法新立的姊妹件之一；
 *  收口票可把 `pageShapes.ts` 再按「媒体／事实／时间轴」切三支，出口留它薄转出。
 *
 *  色值与圆角只用冻结 token 与圆角闭集 `{8,14,20,999}`，不新增。
 */

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／`pageShapes.ts` 同）。 */
const LF = String.fromCharCode(10);

/** 五字符转义表（与 `blocks.ts` 的 `esc` 逐字同口径，本件不引区块层内部件）。 */
function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

function reqText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('pageNav: ' + field + ' 必须是非空字符串');
  }
  return value;
}

function optText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error('pageNav: ' + field + ' 必须是字符串');
  return value === '' ? undefined : value;
}

function assertItems(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error('pageNav: ' + field + ' 必须是数组');
  return value;
}

/* ══════════════════════════════════════════════════════════════
 * ① 胶囊行：一行 N 枚元信息小签（**带容器**，这是与 `renderChips` 的唯一区别）
 * ══════════════════════════════════════════════════════════════ */

/** 胶囊语气闭集（`neutral` ＝ 中性灰，缺省）：取自同仓语义色，不发明新色值。 */
export const CHIP_TONES = ['neutral', 'ok', 'warn', 'danger'] as const;
export type ChipTone = (typeof CHIP_TONES)[number];

export interface ChipInput {
  /** 这一枚说的是什么（人话短词，如「有记录 1/7 天」）。 */
  readonly label: string;
  readonly tone?: ChipTone;
}

export interface ChipRowInput {
  /** 一行里的胶囊；0 枚＝空串（与「没内容不留空块」同口径）。 */
  readonly chips: readonly ChipInput[];
  /** 无障碍角色：`list`（缺省，逐枚 role=listitem）／`none`（纯版面）。 */
  readonly role?: 'list' | 'none';
  /** 版面根的附加类名（空格分隔）。 */
  readonly extraClass?: string;
}

/** 胶囊行：把元信息收成**一行**（宽屏不被网格提升成整行；窄屏自动折行）。
 *  **用它代替裸 `renderChips`**——后者没有容器，正是宽屏塌成长条的根因。 */
export function renderChipRow(input: ChipRowInput): string {
  const chips = assertItems(input.chips, 'renderChipRow: input.chips');
  if (chips.length === 0) return '';
  const role = input.role ?? 'list';
  if (role !== 'list' && role !== 'none') {
    throw new Error('pageNav: renderChipRow: input.role 必须是 list／none 之一');
  }
  const extra = optText(input.extraClass, 'renderChipRow: input.extraClass');
  const body = chips.map((raw, i) => {
    const field = 'renderChipRow: input.chips[' + i + ']';
    const chip = raw as ChipInput;
    const label = reqText(chip.label, field + '.label');
    const tone = chip.tone ?? 'neutral';
    if (!(CHIP_TONES as readonly string[]).includes(tone)) {
      throw new Error('pageNav: ' + field + '.tone 必须是 ' + CHIP_TONES.join('／') + ' 之一');
    }
    return '<span class="ilife-block-chip ilife-block-chip-' + tone + '"'
      + (role === 'list' ? ' role="listitem"' : '') + '>' + esc(label) + '</span>';
  }).join('');
  return '<div class="ilife-block-chip-row' + (extra === undefined ? '' : ' ' + extra) + '"'
    + (role === 'list' ? ' role="list"' : '') + '>' + body + '</div>';
}

/* ══════════════════════════════════════════════════════════════
 * ② 分段导航：等宽分格 ＋ 选中实底 ＋ 图标位（页内导航的「动作」形状）
 * ══════════════════════════════════════════════════════════════ */

/** 图标闭集（内联 SVG，无外链、无字体依赖）。清单外抛 `bad-input`。 */
export const SEG_NAV_ICONS = [
  'grid', 'line', 'table', 'copy', 'goal', 'drop', 'scale', 'flame',
] as const;
export type SegNavIcon = (typeof SEG_NAV_ICONS)[number];

/** 图标路径表（`stroke` 走 `currentColor`，随选中态变色；尺寸由样式段定）。 */
const ICON_PATHS: Readonly<Record<SegNavIcon, string>> = Object.freeze({
  grid: '<rect x="2" y="2" width="5" height="5" rx="1.2"/><rect x="9" y="2" width="5" height="5" rx="1.2"/>'
    + '<rect x="2" y="9" width="5" height="5" rx="1.2"/><rect x="9" y="9" width="5" height="5" rx="1.2"/>',
  line: '<path d="M2 11.5l4-4 3 3 5-6"/>',
  table: '<rect x="2" y="3" width="12" height="10" rx="1.6"/><path d="M2 7h12M7 7v6"/>',
  copy: '<rect x="5" y="5" width="9" height="9" rx="2"/><path d="M11 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1"/>',
  goal: '<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2"/>',
  drop: '<path d="M8 2.5s4 4.2 4 7a4 4 0 0 1-8 0c0-2.8 4-7 4-7z"/>',
  scale: '<path d="M3 12.5h10"/><path d="M5.5 9.5l2.5-5 2.5 5"/>',
  flame: '<path d="M8 2.5c2 2.4 3.2 4.2 3.2 6.1a3.2 3.2 0 0 1-6.4 0c0-1 .4-1.9 1.2-2.9"/>',
});

/** 描边类图标（`line`／`copy`／`goal`／`drop`／`scale`／`flame`）走 `fill:none`；其余走实底。 */
const FILLED_ICONS: readonly SegNavIcon[] = ['grid', 'table'];

export interface SegNavItemInput {
  /** 锚点 id（不带 `#`；用于 `href` 与「当前项」判定）。 */
  readonly id: string;
  /** 分格里的人话短名。 */
  readonly label: string;
  readonly icon?: SegNavIcon;
  /** 附加计数（如「6 项」）；窄屏由样式段收起。 */
  readonly count?: string;
}

export interface SegmentedNavInput {
  /** 分格；0 格＝空串。 */
  readonly items: readonly SegNavItemInput[];
  /** 当前项 id：给了就给它实底 ＋ `aria-current="true"`（分格的选中态）。 */
  readonly current?: string;
  /** 是否吸顶（缺省 `true`）：长页滚动时导航留在视口顶。 */
  readonly sticky?: boolean;
  readonly ariaLabel?: string;
  readonly extraClass?: string;
}

function iconSvg(icon: SegNavIcon): string {
  const filled = FILLED_ICONS.includes(icon);
  const attrs = filled
    ? 'fill="currentColor"'
    : 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"';
  return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" ' + attrs + '>'
    + ICON_PATHS[icon] + '</svg>';
}

/** 分段导航：等宽分格，每格「图标 ＋ 短名（＋ 计数）」，当前格实底。
 *  `items: []` ＝ 空串；非法图标／`id` 为空即抛。 */
export function renderSegmentedNav(input: SegmentedNavInput): string {
  const items = assertItems(input.items, 'renderSegmentedNav: input.items');
  if (items.length === 0) return '';
  const current = optText(input.current, 'renderSegmentedNav: input.current');
  const sticky = input.sticky === undefined ? true : input.sticky === true;
  const ariaLabel = optText(input.ariaLabel, 'renderSegmentedNav: input.ariaLabel');
  const extra = optText(input.extraClass, 'renderSegmentedNav: input.extraClass');
  const body = items.map((raw, i) => {
    const field = 'renderSegmentedNav: input.items[' + i + ']';
    const item = raw as SegNavItemInput;
    const id = reqText(item.id, field + '.id');
    const label = reqText(item.label, field + '.label');
    const icon = item.icon;
    if (icon !== undefined && !(SEG_NAV_ICONS as readonly string[]).includes(icon)) {
      throw new Error('pageNav: ' + field + '.icon 必须是 ' + SEG_NAV_ICONS.join('／') + ' 之一');
    }
    const count = optText(item.count, field + '.count');
    const on = current !== undefined && current === id;
    return '<a href="#' + esc(id) + '"'
      + ' class="ilife-block-seg-nav-item' + (on ? ' is-on' : '') + '"'
      + (on ? ' aria-current="true"' : '') + '>'
      + (icon === undefined ? '' : iconSvg(icon))
      + '<span class="ilife-block-seg-nav-label">' + esc(label) + '</span>'
      + (count === undefined ? '' : '<span class="ilife-block-seg-nav-count">' + esc(count) + '</span>')
      + '</a>';
  }).join('');
  return '<nav class="ilife-block-seg-nav' + (sticky ? ' is-sticky' : '')
    + (extra === undefined ? '' : ' ' + extra) + '"'
    + (ariaLabel === undefined ? '' : ' aria-label="' + esc(ariaLabel) + '"') + '>'
    + body + '</nav>';
}

export { pageNavCss } from './pageNavCss.js';

