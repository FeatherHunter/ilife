/** base-paint/blocks：#104 B1 区块组件整合（12 区块，接口 owner）。
 *
 * 地位（契约 `docs/base-paint-contract.md` §4.1／§4.4 #104 行）：
 *  - 区块级 = 页面级组合：**组合**冻结控件（`renderEmptyState`／`renderActionBar`／
 *    `renderToast`／`renderErrorReceipt`／`renderStatusBadge`／`charts.*`），**不得**
 *    重定义控件签名、不得复制控件实现、不得改 `CONTROL_*`／`STATUS_*`／`COPY_*` 常量；
 *  - **防火墙**：本模块**不在** `src/spec/`、**不进** `SPEC_FROZEN_SURFACE`、
 *    **不从** `src/index.ts` 导出（签名测试把 `dist/index.js` 出口与冻结清单绑死，
 *    区块接口是可演进的组合层，不是冻结签名）。消费方走子路径 `base-paint/blocks`；
 *  - 清单裁定（DB-1）：12 区块取 `docs/visual-spec-blocks.md` §1 拟定清单为终版，
 *    只做命名统一（英文键），锚点语义不变；
 *  - 样式闭集裁定（DB-2）：新增 `BLOCK_STYLE_SECTIONS` 12 区闭集（**不改**
 *    `CONTROL_STYLE_SECTIONS`）；区块 CSS 由本模块唯一产出者 `blocksCss()` 产出，
 *    只读冻结 token（`CSS_VAR_TOKENS`）＋ 局部 CSS 常量（圆角 `{8,14,20,999}`、
 *    `--line` 派生软线），**不新增 token 名**（D-5／DB-5）。
 *
 * 三条硬边界（违反即红）：
 *  1. **静态呈现 ＋ 复制**（§4.1）：12 个函数全是纯函数产 HTML 字符串；B-08 只产原生
 *     `<details>/<summary>`，B-09 只产静态 `label＋input`（实时预览／空值拦截的
 *     **行为**归宿主＝插件 client，B7；本模块只给宿主留 `data-*` 约定）；
 *  2. **禁交互控件名**（B7）：`formPrompt`／`selectList`／`smartSelect`／`confirm`／
 *     `foldBox` 不得出现为导出（含大小写变体）；
 *  3. **模块代码零 DOM**（AC-7）：本文件编译进 `dist/blocks.js` 的**代码**里不出现
 *     `document.`／`window.`／`navigator.`（与 #76 同口径，`test/blocks.test.mjs` 钉死）。
 *
 * 受信透传口径（与 `renderEmptyState` 的 `actionHtml` 同口径）：`contentHtml`／
 * `previewText` 等「已由区块函数自产的 HTML」**不转义**（调用方不得塞入未转义的用户串；
 * 用户串一律走各函数的文本字段，本模块用冻结五字符表转义）；
 * `actionHtml`（B-10）沿用冻结语义（调用方负责内容安全）。
 */

import { charts } from './charts.js';
import { renderActionBar, renderEmptyState, renderErrorReceipt, renderStatusBadge, renderToast, TOAST_ICON_GLYPHS } from './controls.js';
import { BODY_FONT_STACK } from './font.js';
import {
  ACTION_BAR_DEFAULTS,
  ACTION_ID_ATTR,
  CHART_KINDS,
  COPY_ACTION_IDS,
  CSS_VAR_TOKENS,
  DEFAULT_DATA_ATTR,
  ESCAPE_HTML_CHARS,
  ESCAPE_HTML_ENTITIES,
  SCENE_STATUS,
  STATUS_KINDS,
  STYLE_FORBIDDEN_TOKENS,
  TOAST_DEFAULTS,
} from './spec/index.js';
import { STYLE_PREFIX } from './style.js';
import type {
  ActionBarInput,
  ChartKind,
  CopyButtonInput,
  CopyFormatTexts,
  EmptyStateInput,
  ErrorReceiptInput,
  EscapeHtmlChar,
  Scene,
  SceneTypeBadge,
  StatusKind,
  ToastInput,
} from './spec/index.js';
import type {
  BarChartInput,
  ComboChartInput,
  DonutChartInput,
  GaugeChartInput,
  LineChartInput,
  ProgressChartInput,
  ScatterChartInput,
  SparklineChartInput,
} from './spec/charts.js';

/* ── 错误形态（与 TemplateError／ControlsError 同口径：抛、不返空；调用方按 name／code 判定） ── */

/** 区块层错误。code 恒为 `bad-input`（输入缺失／非法一律抛，缺失阻断不返空）。 */
export class BlocksError extends Error {
  readonly code: 'bad-input';

  constructor(message: string) {
    super(message);
    this.name = 'BlocksError';
    this.code = 'bad-input';
  }
}

function badInput(message: string): never {
  throw new BlocksError(message);
}

/* ── 转义（AC-14：唯一口径 = 冻结的 `ESCAPE_HTML_CHARS`／`ESCAPE_HTML_ENTITIES`，与 controls.ts 同构） ── */

const ESCAPE_RE = new RegExp('[' + ESCAPE_HTML_CHARS.join('') + ']', 'g');

function esc(value: string): string {
  return value.replace(ESCAPE_RE, (ch) => ESCAPE_HTML_ENTITIES[ch as EscapeHtmlChar] ?? ch);
}

/* ── 入参校验小件 ── */

function assertPlainObject(value: unknown, field: string): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) badInput(field + ' 必须是对象');
}

function assertNoInlineHandler(value: object, field: string): void {
  for (const key of Object.keys(value)) {
    if (/^on/i.test(key)) badInput(field + ' 不得含内联事件处理器字段：' + key);
  }
}

function reqText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value === '') badInput(field + ' 必须是非空字符串');
  return value;
}

function optText(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** 可选数字约束（#397）：`undefined` 透传；数字收 `String(value)`，字串须非空非空白且 `Number()` 有限。 */
function optNumeric(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) badInput(field + ' 必须是数字串或有限数');
    return String(value);
  }
  if (typeof value !== 'string' || value.trim() === '') badInput(field + ' 必须是数字串或有限数');
  if (!Number.isFinite(Number(value))) badInput(field + ' 必须是数字串或有限数');
  return value;
}

/** 候选项（#397）：`undefined` 透传；给了须是非空数组且逐项非空字串。 */
function optOptions(value: unknown, field: string): readonly (string | ParamOption)[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) badInput(field + ' 必须是非空数组');
  value.forEach((opt, j) => {
    if (typeof opt === 'string') {
      if (opt === '') badInput(field + '[' + j + '] 必须是非空字符串');
      return;
    }
    // 值＋标签对照项（#474 追加）：`value` 是**机器值**（下拉选中后递给宿主的还是它），
    //  `label` 只是给人看的显示文本；全仓只有「机器码 + 中文词」这一种用法。
    if (opt === null || typeof opt !== 'object' || Array.isArray(opt)) {
      badInput(field + '[' + j + '] 必须是非空字符串或 { value, label } 对象');
    }
    const entry = opt as { value?: unknown; label?: unknown };
    if (typeof entry.value !== 'string' || entry.value === '') badInput(field + '[' + j + '].value 必须是非空字符串');
    if (typeof entry.label !== 'string' || entry.label === '') badInput(field + '[' + j + '].label 必须是非空字符串');
  });
  return value as readonly (string | ParamOption)[];
}

/* ── 区块样式区闭集（DB-2：新增闭集，不改 CONTROL_STYLE_SECTIONS） ── */

/** 12 区块样式区（DB-1 清单的代码落点；顺序即 B-01…B-12）。 */
export const BLOCK_STYLE_SECTIONS = [
  'pageShell',
  'kpiCard',
  'dataTable',
  'chartBlock',
  'listRows',
  'preBlock',
  'detailSection',
  'disclosure',
  'paramForm',
  'emptyBlock',
  'copyBlock',
  'feedbackBlock',
] as const;

export type BlockStyleSection = (typeof BLOCK_STYLE_SECTIONS)[number];

/** 区名 → kebab（`kpiCard` → `kpi-card`），只用于类名与 CSS 注释头。 */
function sectionSlug(section: BlockStyleSection): string {
  return section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
}

/** 区块根类：`ilife-block ilife-block-<slug>`（与控件类的 `ilife-<区>` 拼写不撞）。 */
function blockRoot(section: BlockStyleSection): string {
  return STYLE_PREFIX + 'block ' + STYLE_PREFIX + 'block-' + sectionSlug(section);
}

/** 区块子件类：`ilife-block-<slug>-<part>`。 */
function blockPart(section: BlockStyleSection, part: string): string {
  return STYLE_PREFIX + 'block-' + sectionSlug(section) + '-' + part;
}

/** 可打印版式根类的主体（#420）：`ilife-page-printable`。它不是第 13 个区块——`BLOCK_STYLE_SECTIONS`
 *  由 `test/blocks.test.mjs` 钉死 12 项，故样式落在 `pageShell` 区，仅作页面级开关。 */
const PRINTABLE_SLUG = 'page-printable';

/** 打印页名（#420）：`.ilife-page-printable` 用 `page: printable` 绑到具名页 `@page printable` 上。
 *  裸 `@page` 是**全局规则**（CSS 没法把它绑到类上：任何页一打印就吃它），具名页才落在类作用域内。 */
const PRINTABLE_PAGE_NAME = 'printable';

/** 页面级区块类（#420：页内导航／口径说明行）：`ilife-block-<name>`。
 *  与 12 区同命名空间、同 `ilife-block-` 前缀，但不进 `BLOCK_STYLE_SECTIONS`（样式仍落 `pageShell` 区）。 */
function pageLevelBlock(name: string): string {
  return STYLE_PREFIX + 'block-' + name;
}

/* ══════════════════════════════════════════════════════════════
 * B-01 共享页面模板／标题区
 * ══════════════════════════════════════════════════════════════ */

export interface PageShellInput {
  readonly title: string;
  readonly subtitle?: string;
  readonly eyebrow?: string;
  /** 已组合好的区块 HTML（受信透传，不转义）。 */
  readonly content: string;
  /** 可打印版式（#420）：为真时版面根加 `ilife-page-printable`，打印规则挂在它名下
   *  （隐藏页内导航与复制区）。不给／给假 → 产物与旧版逐字相同（类不出现，规则不命中）。 */
  readonly printable?: boolean;
}

/** B-01：单页容器＋标题三件套（eyebrow／title／subtitle）＋正文。 */
export function renderPageShell(input: PageShellInput): string {
  assertPlainObject(input, 'renderPageShell: input');
  assertNoInlineHandler(input, 'renderPageShell: input');
  const shell = input as PageShellInput;
  const title = reqText(shell.title, 'renderPageShell: input.title');
  if (typeof shell.content !== 'string') badInput('renderPageShell: input.content 必须是字符串');
  const rootClass = blockRoot('pageShell')
    + (shell.printable === true ? ' ' + STYLE_PREFIX + PRINTABLE_SLUG : '');
  const parts: string[] = ['<section class="' + rootClass + '">'];
  const eyebrow = optText(shell.eyebrow);
  if (eyebrow !== undefined) parts.push('<p class="' + blockPart('pageShell', 'eyebrow') + '">' + esc(eyebrow) + '</p>');
  parts.push('<h1 class="' + blockPart('pageShell', 'title') + '">' + esc(title) + '</h1>');
  const subtitle = optText(shell.subtitle);
  if (subtitle !== undefined) parts.push('<p class="' + blockPart('pageShell', 'subtitle') + '">' + esc(subtitle) + '</p>');
  parts.push('<div class="' + blockPart('pageShell', 'body') + '">' + shell.content + '</div>');
  parts.push('</section>');
  return parts.join('');
}

/* ══════════════════════════════════════════════════════════════
 * #420 页内导航 ／ 口径说明行（与领域无关：锚点 id 与文案全由调用方给）
 * ══════════════════════════════════════════════════════════════ */

export interface TocItem {
  /** 锚点 id（由调用方给，区块不猜；须与页内 `id` 属性逐字相同）。 */
  readonly id: string;
  readonly text: string;
}

export interface TocBlockInput {
  readonly items: readonly TocItem[];
}

/** #420-1 页内导航区块（`<nav aria-label="页内导航">` ＋ 逐项 `<a href="#id">`）。
 *  空列表＝不出这一块（与「没内容不留空壳」同口径，返回空串）；非数组／项缺 `id`／`text` → `bad-input`。 */
export function renderTocBlock(input: TocBlockInput): string {
  assertPlainObject(input, 'renderTocBlock: input');
  assertNoInlineHandler(input, 'renderTocBlock: input');
  const block = input as TocBlockInput;
  if (!Array.isArray(block.items)) badInput('renderTocBlock: input.items 必须是数组');
  if (block.items.length === 0) return '';
  const links: string[] = [];
  for (const item of block.items) {
    assertPlainObject(item, 'renderTocBlock: items[] 元素');
    assertNoInlineHandler(item as unknown as object, 'renderTocBlock: items[] 元素');
    links.push('<a href="#' + esc(reqText(item.id, 'renderTocBlock: items[].id')) + '">'
      + esc(reqText(item.text, 'renderTocBlock: items[].text')) + '</a>');
  }
  return '<nav class="' + pageLevelBlock('toc') + '" aria-label="页内导航">' + links.join('') + '</nav>';
}

/** #420-2 口径说明行（纯文本单参；五字符转义表与区块层其余函数同源 `esc`）。
 *  聚合数字旁那句灰色小字（例如「周目标口径＝每日目标 × 7」）的唯一落点。 */
export function renderCaliberLine(text: string): string {
  return '<p class="' + pageLevelBlock('caliber') + '">' + esc(reqText(text, 'renderCaliberLine: text')) + '</p>';
}

/** #507 结论条（审查必改 #3）：一行判定句的浅底条，形状住公共层、**调用方只传文本**。
 *
 *  与 `renderCaliberLine` 同族（页面级、单参纯文本、五字符转义同源 `esc`；样式随 `pageShell` 区落盘，
 *  不进 `BLOCK_STYLE_SECTIONS` 那 12 项闭集）。区别只在角色：口径行是**旁注**（灰小字），
 *  结论条是**主读法**（一行结论句，读者扫一眼就知道今天怎么样）。
 *
 *  此前这条形状是**页面内联 8 个魔法值**（`homeDocs.ts` 的 `CONCLUSION_STYLE`，逐字照搬老实物
 *  `.view-summary`），与本仓「版面单源住公共层」的纪律冲突——该件自述「本页不再出现任何一条
 *  自写 `font-size`／`color` 规则」，而 `color:var(--blue2)` 就在那串内联里。搬到这里之后，
 *  页面侧只留「传什么文本」。 */
export function renderConclusionBar(text: string): string {
  return '<p class="' + pageLevelBlock('conclusion') + '">' + esc(reqText(text, 'renderConclusionBar: text')) + '</p>';
}

/* ══════════════════════════════════════════════════════════════
 * #421 页面融合四件（与领域无关：文案／数值／颜色全由调用方给）
 *   占比迷你条／分布条行＝「数字＋图形同格」；徽章＝并列小标签；字段变更行＝改前改后对照。
 *   四件都是页面级（不属 12 区块），样式随 `pageShell` 区落盘（同 #420 处置：不新增样式区）。
 * ══════════════════════════════════════════════════════════════ */

/** 页面级子件类（#421）：`ilife-block-<名>-<件>`（与 `pageLevelBlock` 同命名空间，不进 12 区闭集）。 */
function pageLevelPart(name: string, part: string): string {
  return pageLevelBlock(name) + '-' + part;
}

/** 百分比（#421）：只收有限数，两端都夹到 0–100（越界夹取是本条唯一口径；非数走 `badInput`）。 */
function reqPct(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    badInput(field + ' 必须是 0–100 的有限数（越界夹取）');
  }
  return Math.min(100, Math.max(0, value as number));
}

/** 填充条的内联声明（#421／#431）：宽度恒有；**背景只在调用方给了颜色时才出现**——不给时不落内联色，
 *  填充色由样式段两条 `-fill` 规则里的**冻结 token** `var(--blue)` 兜底（缺省色走冻结 token，
 *  区块自身不写死任何色值字面量；判据见 `test/page-viz-421.test.mjs`「缺省色走冻结 token」一条）。 */
function fillDecls(pct: number, color: string | undefined): string {
  return 'width:' + String(pct) + '%' + (color === undefined ? '' : ';background:' + color);
}

/** 冻结 token 名（#431）：色值入参里 `var()` 只许引用 `CSS_VAR_TOKENS` 的 11 个名字——公共层只定义
 *  这 11 个，引用没定义的名字会让填充的 `background` 变成 guaranteed-invalid（条静默变透明、不报错），
 *  故清单外一律 `bad-input`（与 `blocksCss` 的「`var()` 引用必须是冻结 token」同一条纪律）。 */
function isFrozenToken(name: string): boolean {
  return Object.hasOwn(CSS_VAR_TOKENS, name);
}

/** CSS 具名色全表（#431 色值允许清单第四支）：CSS Color Level 4「Named colors」的 148 个具名色。
 *  这里只管**收不收**（比对时大小写不敏感），取值由浏览器定、本仓不写第二份。`transparent` 与
 *  `currentColor` 是关键字不是具名色，不在表内。 */
const CSS_NAMED_COLORS: ReadonlySet<string> = new Set(
  ('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown'
    + ' burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan'
    + ' darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid'
    + ' darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet'
    + ' deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro'
    + ' ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki'
    + ' lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow'
    + ' lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray'
    + ' lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine'
    + ' mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise'
    + ' mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab'
    + ' orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru'
    + ' pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown'
    + ' seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan'
    + ' teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen').split(' '),
);

/** `rgb()`／`rgba()` 形态（#431）：分量只许数字（可带 `%`），逗号或空格分隔、alpha 可用 `/` 引。
 *  只校验形态、不校验取值范围（越界由 CSS 自己夹取）；`expression(`／`url(` 这类带字母的实参在此挡下。 */
function isRgbFunction(raw: string): boolean {
  const hit = /^rgba?\(\s*([^)]*)\)$/i.exec(raw);
  if (hit === null) return false;
  const parts = hit[1].split(/[,/]|\s+/).filter((part) => part !== '');
  return (parts.length === 3 || parts.length === 4)
    && parts.every((part) => /^\d*\.?\d+%?$/.test(part));
}

/** 色值入参（#421／#431）：`undefined` 透传（缺省色走样式段的冻结 token）；清单内的写法**逐字透传**
 *  （裸 token 名 `--x` 包成 `var(--x)`）。允许清单＝`#rgb`／`#rrggbb`／`rgb()`／`rgba()`／
 *  `var(--<冻结 token 名>)`／CSS 具名色；**清单外一律 `bad-input`**——`;`／`expression(`／`url(` 这类
 *  注入形态在这一步挡住，不让 `;` 穿进内联声明列表（审查 S3-6）。 */
function optColor(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') badInput(field + ' 必须是非空字符串（冻结 token 名或色值）');
  const raw = value.trim();
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) return raw;
  if (isRgbFunction(raw)) return raw;
  const tokenRef = /^var\(\s*(--[A-Za-z0-9-]+)\s*\)$/.exec(raw);
  if (tokenRef !== null) {
    if (!isFrozenToken(tokenRef[1])) badInput(field + ' 引用了未冻结的 token（只许 11 个冻结 token）：' + tokenRef[1]);
    return raw;
  }
  if (/^--[A-Za-z0-9-]+$/.test(raw)) {
    if (!isFrozenToken(raw)) badInput(field + ' 引用了未冻结的 token（只许 11 个冻结 token）：' + raw);
    return 'var(' + raw + ')';
  }
  if (CSS_NAMED_COLORS.has(raw.toLowerCase())) return raw;
  badInput(field + ' 不在色值允许清单里（#rgb／#rrggbb／rgb()／rgba()／var(--<冻结 token>)／CSS 具名色）：' + raw);
}

/** 附加类名（#421）：`undefined` 透传；给了须是空格分隔的类名（调用方按域标色，区块不认领域）。 */
function optExtraClass(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') badInput(field + ' 必须是非空字符串');
  const names = value.trim().split(/\s+/);
  for (const name of names) {
    if (!/^-?[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) badInput(field + ' 只许空格分隔的类名：' + name);
  }
  return names.join(' ');
}

/** #421 四件的类名主体（`pageLevelBlock(名)` → `ilife-block-<名>`）。 */
const MINI_BAR_NAME = 'mini-bar';
const DIST_ROW_NAME = 'dist-row';
const CHIP_NAME = 'chip';
const CHANGE_ROW_NAME = 'change-row';

/** 箭头字形（#421-4）：`arrow: false` 靠可见性占位，字形逐字保留（栏位不塌）。 */
const CHANGE_ARROW_GLYPH = '\u2192';

export interface MiniBarInput {
  /** 占比：0–100 的有限数，越界夹取。 */
  readonly pct: number;
  /** 填充色：冻结 token 名（`--blue`，自动包 `var()`）／`var(--<冻结 token>)`／`#rgb`／`#rrggbb`／
   *  `rgb()`／`rgba()`／CSS 具名色；不给＝用样式段的缺省色（冻结 token `var(--blue)`）。清单外抛 `bad-input`。 */
  readonly color?: string;
}

/** #421-1 占比迷你条（「数字＋图形同格」的图形侧）：一截横条按 `pct` 撑宽。
 *  只表达「一眼看出差距」，不替代图表——精确读数（坐标／悬停）仍走 `renderChartBlock` 的共享图表。 */
export function renderMiniBar(input: MiniBarInput): string {
  assertPlainObject(input, 'renderMiniBar: input');
  assertNoInlineHandler(input, 'renderMiniBar: input');
  const bar = input as MiniBarInput;
  const pct = reqPct(bar.pct, 'renderMiniBar: input.pct');
  const color = optColor(bar.color, 'renderMiniBar: input.color');
  return '<span class="' + pageLevelBlock(MINI_BAR_NAME) + '" role="img" aria-label="' + String(pct) + '%">'
    + '<span class="' + pageLevelPart(MINI_BAR_NAME, 'fill') + '" style="' + esc(fillDecls(pct, color)) + '"></span>'
    + '</span>';
}

export interface DistributionRowInput {
  readonly label: string;
  /** 显示值（`null`／`undefined` 置空；转义与 `renderDataTable` 的单元格同口径）。 */
  readonly value: string | number | null;
  /** 占比：0–100 的有限数，越界夹取。 */
  readonly pct: number;
  /** 填充色：冻结 token 名（`--blue`，自动包 `var()`）／`var(--<冻结 token>)`／`#rgb`／`#rrggbb`／
   *  `rgb()`／`rgba()`／CSS 具名色；不给＝用样式段的缺省色（冻结 token `var(--blue)`）。清单外抛 `bad-input`。 */
  readonly color?: string;
  /** 名称栏的附加类名（空格分隔）：调用方按域标色，区块不认领域。 */
  readonly labelClass?: string;
}

export interface DistributionRowsInput {
  readonly rows: readonly DistributionRowInput[];
}

/** #421-2 分布条行：`名称 ｜ 条 ｜ 数值` 一格三栏，逐行拼出（行即件，不另加容器类）。
 *  `rows: []` ＝ 空串（与「没内容不留空壳」同口径）；行内校验逐条 fail-fast。 */
export function renderDistributionRows(input: DistributionRowsInput): string {
  assertPlainObject(input, 'renderDistributionRows: input');
  assertNoInlineHandler(input, 'renderDistributionRows: input');
  const block = input as DistributionRowsInput;
  if (!Array.isArray(block.rows)) badInput('renderDistributionRows: input.rows 必须是数组');
  if (block.rows.length === 0) return '';
  return block.rows.map((row, i) => {
    const field = 'renderDistributionRows: input.rows[' + i + ']';
    assertPlainObject(row, field);
    assertNoInlineHandler(row as unknown as object, field);
    const item = row as DistributionRowInput;
    const label = reqText(item.label, field + '.label');
    const pct = reqPct(item.pct, field + '.pct');
    const color = optColor(item.color, field + '.color');
    const extra = optExtraClass(item.labelClass, field + '.labelClass');
    return '<div class="' + pageLevelBlock(DIST_ROW_NAME) + '">'
      + '<span class="' + pageLevelPart(DIST_ROW_NAME, 'name') + (extra === undefined ? '' : ' ' + extra) + '">'
      + esc(label) + '</span>'
      + '<span class="' + pageLevelPart(DIST_ROW_NAME, 'bar') + '">'
      + '<span class="' + pageLevelPart(DIST_ROW_NAME, 'fill') + '" style="' + esc(fillDecls(pct, color)) + '"></span>'
      + '</span>'
      + '<span class="' + pageLevelPart(DIST_ROW_NAME, 'val') + '">'
      + cellText(item.value, field + '.value') + '</span>'
      + '</div>';
  }).join('');
}

export interface ChipItemInput {
  readonly text: string;
}

export interface ChipsInput {
  readonly items: readonly ChipItemInput[];
}

/** #421-3 徽章（并列小标签，如分类／标签这类短词并排）：逐项 `<span class="ilife-block-chip">`。
 *  项即件（不另加容器类）；`items: []` ＝ 空串。 */
export function renderChips(input: ChipsInput): string {
  assertPlainObject(input, 'renderChips: input');
  assertNoInlineHandler(input, 'renderChips: input');
  const block = input as ChipsInput;
  if (!Array.isArray(block.items)) badInput('renderChips: input.items 必须是数组');
  if (block.items.length === 0) return '';
  return block.items.map((entry, i) => {
    const field = 'renderChips: input.items[' + i + ']';
    assertPlainObject(entry, field);
    assertNoInlineHandler(entry as unknown as object, field);
    return '<span class="' + pageLevelBlock(CHIP_NAME) + '">'
      + esc(reqText((entry as ChipItemInput).text, field + '.text')) + '</span>';
  }).join('');
}

export interface ChangeRowInput {
  readonly label: string;
  /** 改前（不给／`null` ＝ 空槽；转义与 `renderDataTable` 的单元格同口径）。 */
  readonly before?: string | number | null;
  /** 改后（同上）。 */
  readonly after?: string | number | null;
  /** 箭头位（缺省为真）。为假时**仍占箭位**（可见性占位），左右两栏与真行不塌。 */
  readonly arrow?: boolean;
}

export interface ChangeRowsInput {
  readonly rows: readonly ChangeRowInput[];
}

/** #421-4 字段变更行（回执页「改前 → 改后」对照）：`字段名 ｜ 改前 ｜ 箭头 ｜ 改后`。
 *  `arrow: false` 只把字形藏起来、不删栏位（与老技能同一手法：左右栏靠箭位对齐）；
 *  `rows: []` ＝ 空串。 */
export function renderChangeRows(input: ChangeRowsInput): string {
  assertPlainObject(input, 'renderChangeRows: input');
  assertNoInlineHandler(input, 'renderChangeRows: input');
  const block = input as ChangeRowsInput;
  if (!Array.isArray(block.rows)) badInput('renderChangeRows: input.rows 必须是数组');
  if (block.rows.length === 0) return '';
  return block.rows.map((row, i) => {
    const field = 'renderChangeRows: input.rows[' + i + ']';
    assertPlainObject(row, field);
    assertNoInlineHandler(row as unknown as object, field);
    const item = row as ChangeRowInput;
    const label = reqText(item.label, field + '.label');
    return '<div class="' + pageLevelBlock(CHANGE_ROW_NAME) + '">'
      + '<span class="' + pageLevelPart(CHANGE_ROW_NAME, 'label') + '">' + esc(label) + '</span>'
      + '<span class="' + pageLevelPart(CHANGE_ROW_NAME, 'old') + '">'
      + cellText(item.before, field + '.before') + '</span>'
      + '<span class="' + pageLevelPart(CHANGE_ROW_NAME, 'arrow') + '" aria-hidden="true"'
      + (item.arrow === false ? ' style="visibility:hidden"' : '') + '>' + CHANGE_ARROW_GLYPH + '</span>'
      + '<span class="' + pageLevelPart(CHANGE_ROW_NAME, 'new') + '">'
      + cellText(item.after, field + '.after') + '</span>'
      + '</div>';
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
 * B-02 KPI 卡（四槽 label／value／unit／detail ＋ STATUS_KINDS 徽章）
 * ══════════════════════════════════════════════════════════════ */

export interface KpiCardInput {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly detail?: string;
  readonly status?: StatusKind;
  readonly statusText?: string;
}

/** B-02：单张 KPI 卡（value 带 `tnum`；非法 status 由冻结语义降级 `empty`）。 */
export function renderKpiCard(input: KpiCardInput): string {
  assertPlainObject(input, 'renderKpiCard: input');
  assertNoInlineHandler(input, 'renderKpiCard: input');
  const card = input as KpiCardInput;
  const label = reqText(card.label, 'renderKpiCard: input.label');
  const value = reqText(card.value, 'renderKpiCard: input.value');
  const parts: string[] = ['<div class="' + blockRoot('kpiCard') + '">'];
  parts.push('<div class="' + blockPart('kpiCard', 'label') + '">' + esc(label) + '</div>');
  parts.push('<div class="' + blockPart('kpiCard', 'value-row') + '">'
    + '<span class="' + blockPart('kpiCard', 'value') + '">' + esc(value) + '</span>');
  const unit = optText(card.unit);
  if (unit !== undefined) parts.push('<span class="' + blockPart('kpiCard', 'unit') + '">' + esc(unit) + '</span>');
  parts.push('</div>');
  const detail = optText(card.detail);
  if (detail !== undefined) parts.push('<div class="' + blockPart('kpiCard', 'detail') + '">' + esc(detail) + '</div>');
  if (card.status !== undefined) {
    const status: StatusKind = (STATUS_KINDS as readonly string[]).includes(card.status) ? card.status : 'empty';
    const badge = renderStatusBadge(
      card.statusText === undefined ? { status } : { status, text: card.statusText },
    );
    parts.push('<div class="' + blockPart('kpiCard', 'badge') + '">' + badge + '</div>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** B-02 伴生布局：KPI 卡网格（不是第 13 个区块，无独立样式区，用 `kpiCard` 区）。 */
export function renderKpiGrid(cards: readonly KpiCardInput[]): string {
  if (!Array.isArray(cards) || cards.length === 0) badInput('renderKpiGrid: cards 必须是非空数组');
  return '<div class="' + blockPart('kpiCard', 'grid') + '">'
    + cards.map((card) => renderKpiCard(card)).join('') + '</div>';
}

/* ══════════════════════════════════════════════════════════════
 * B-03 表格（强制语义标签；空数据走 B-10）
 * ══════════════════════════════════════════════════════════════ */

export type DataTableAlign = 'left' | 'center' | 'right';

export interface DataTableColumn {
  readonly key: string;
  readonly label: string;
  readonly align?: DataTableAlign;
}

export interface DataTableInput {
  readonly columns: readonly DataTableColumn[];
  readonly rows: readonly Readonly<Record<string, unknown>>[];
  readonly caption?: string;
  readonly emptyText?: string;
}

const TABLE_ALIGNS: readonly string[] = ['left', 'center', 'right'];

function cellText(value: unknown, field: string): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return esc(String(value));
  }
  badInput(field + ' 只许 string／number／boolean／bigint／null／undefined');
}

/** B-03：语义表格（`table／thead／th／td`；零行 → `renderEmptyState`，不渲染空表）。 */
export function renderDataTable(input: DataTableInput): string {
  assertPlainObject(input, 'renderDataTable: input');
  assertNoInlineHandler(input, 'renderDataTable: input');
  const table = input as DataTableInput;
  if (!Array.isArray(table.columns) || table.columns.length === 0) {
    badInput('renderDataTable: input.columns 必须是非空数组');
  }
  if (!Array.isArray(table.rows)) badInput('renderDataTable: input.rows 必须是数组');
  const columns = table.columns.map((column, i) => {
    const field = 'renderDataTable: input.columns[' + i + ']';
    assertPlainObject(column, field);
    const key = reqText((column as DataTableColumn).key, field + '.key');
    const label = reqText((column as DataTableColumn).label, field + '.label');
    const align = (column as DataTableColumn).align ?? 'left';
    if (!TABLE_ALIGNS.includes(align)) badInput(field + '.align 必须是 left／center／right');
    return { key, label, align: align as DataTableAlign };
  });
  if (table.rows.length === 0) {
    const text = optText(table.emptyText) ?? '无数据';
    return '<div class="' + blockRoot('dataTable') + '">' + renderEmptyState({ text }) + '</div>';
  }
  const head = '<thead><tr>' + columns.map((column) =>
    '<th scope="col" class="' + blockPart('dataTable', 'cell-' + column.align) + '">' + esc(column.label) + '</th>',
  ).join('') + '</tr></thead>';
  const body = '<tbody>' + table.rows.map((row, ri) => {
    assertPlainObject(row, 'renderDataTable: input.rows[' + ri + ']');
    return '<tr>' + columns.map((column) =>
      '<td class="' + blockPart('dataTable', 'cell-' + column.align) + '">'
      + cellText((row as Readonly<Record<string, unknown>>)[column.key], 'renderDataTable: input.rows[' + ri + '].' + column.key)
      + '</td>',
    ).join('') + '</tr>';
  }).join('') + '</tbody>';
  const caption = optText(table.caption);
  return '<div class="' + blockRoot('dataTable') + '"><table class="' + blockPart('dataTable', 'table') + '">'
    + (caption === undefined ? '' : '<caption class="' + blockPart('dataTable', 'caption') + '">' + esc(caption) + '</caption>')
    + head + body + '</table></div>';
}

/* ══════════════════════════════════════════════════════════════
 * B-04 图表（kind 分发 → charts.*；空／结构违规语义恒取冻结规则）
 * ══════════════════════════════════════════════════════════════ */

export type ChartBlockChartInput =
  | BarChartInput | LineChartInput | DonutChartInput | ProgressChartInput
  | ComboChartInput | SparklineChartInput | GaugeChartInput | ScatterChartInput;

export interface ChartBlockInput {
  readonly kind: ChartKind;
  readonly input: ChartBlockChartInput;
  readonly title?: string;
}

/** B-04：图表区块（分发给冻结 `charts` 8 接口；空数组走空态／结构违规抛错恒为冻结语义）。 */
export function renderChartBlock(input: ChartBlockInput): string {
  assertPlainObject(input, 'renderChartBlock: input');
  assertNoInlineHandler(input, 'renderChartBlock: input');
  const block = input as ChartBlockInput;
  if (!(CHART_KINDS as readonly string[]).includes(block.kind)) {
    badInput('renderChartBlock: input.kind 必须是 ' + CHART_KINDS.join('／'));
  }
  if (block.input === null || typeof block.input !== 'object') badInput('renderChartBlock: input.input 必须是对象');
  const chartHtml = (() => {
    switch (block.kind) {
      case 'bar': return charts.bar(block.input as BarChartInput).html;
      case 'line': return charts.line(block.input as LineChartInput).html;
      case 'donut': return charts.donut(block.input as DonutChartInput).html;
      case 'progress': return charts.progress(block.input as ProgressChartInput).html;
      case 'combo': return charts.combo(block.input as ComboChartInput).html;
      case 'sparkline': return charts.sparkline(block.input as SparklineChartInput).html;
      case 'gauge': return charts.gauge(block.input as GaugeChartInput).html;
      case 'scatter': return charts.scatter(block.input as ScatterChartInput).html;
      default: return badInput('renderChartBlock: input.kind 未覆盖（防御，正常不可达）');
    }
  })();
  const title = optText(block.title);
  return '<section class="' + blockRoot('chartBlock') + '">'
    + (title === undefined ? '' : '<h2 class="' + blockPart('chartBlock', 'title') + '">' + esc(title) + '</h2>')
    + '<div class="' + blockPart('chartBlock', 'canvas') + '">' + chartHtml + '</div>'
    + '</section>';
}

/* ══════════════════════════════════════════════════════════════
 * B-05 列表（左／中／右三槽；完成态删除线；空列表走 B-10）
 * ══════════════════════════════════════════════════════════════ */

export interface ListRowInput {
  readonly left?: string;
  readonly main: string;
  readonly right?: string;
  readonly done?: boolean;
}

export interface ListRowsInput {
  readonly items: readonly ListRowInput[];
  readonly emptyText?: string;
}

/** B-05：行列表（首行无边框；`done` → 删除线＋成功色；零行 → 空态）。 */
export function renderListRows(input: ListRowsInput): string {
  assertPlainObject(input, 'renderListRows: input');
  assertNoInlineHandler(input, 'renderListRows: input');
  const list = input as ListRowsInput;
  if (!Array.isArray(list.items)) badInput('renderListRows: input.items 必须是数组');
  if (list.items.length === 0) {
    const text = optText(list.emptyText) ?? '无数据';
    return '<div class="' + blockRoot('listRows') + '">' + renderEmptyState({ text }) + '</div>';
  }
  const rows = list.items.map((item, i) => {
    const field = 'renderListRows: input.items[' + i + ']';
    assertPlainObject(item, field);
    const row = item as ListRowInput;
    const main = reqText(row.main, field + '.main');
    const done = row.done === true;
    const left = optText(row.left);
    const right = optText(row.right);
    // 没给 `left` 时**不占那一列**：`44px` 那列是给 `▲`／`▼`／`—` 这类标记用的，而栅格是自动排布——
    // 若仍按三列排，`main` 会落进 44px 那列、被 `nowrap` ＋ `ellipsis` 截断（#154 实测：备注标签
    // 「晨起空腹」显示成「晨起…」）。修饰类只改列定义，不动任何既有行。
    const cls = blockPart('listRows', 'row')
      + (done ? ' ' + blockPart('listRows', 'row-done') : '')
      + (left === undefined ? ' ' + blockPart('listRows', 'row-no-left') : '');
    return '<div class="' + cls + '">'
      + (left === undefined ? '' : '<span class="' + blockPart('listRows', 'left') + '">' + esc(left) + '</span>')
      + '<span class="' + blockPart('listRows', 'main') + '">' + esc(main) + '</span>'
      + (right === undefined ? '' : '<span class="' + blockPart('listRows', 'right') + '">' + esc(right) + '</span>')
      + '</div>';
  }).join('');
  return '<div class="' + blockRoot('listRows') + '" role="list">' + rows + '</div>';
}

/* ══════════════════════════════════════════════════════════════
 * B-06 指令块 <pre>（载体恒为 PRE；复制按钮走冻结双属性）
 * ══════════════════════════════════════════════════════════════ */

export interface PreBlockInput {
  readonly command: string;
  readonly label?: string;
  /** 给出即渲染复制按钮（id 写入 ACTION_ID_ATTR，文本写入 DEFAULT_DATA_ATTR）。 */
  readonly actionId?: string;
  readonly copyText?: string;
  readonly copyLabel?: string;
}

/** B-06：指令块（`<pre>` 逐字命令；无命令 → `bad-input`，不渲染空板）。 */
export function renderPreBlock(input: PreBlockInput): string {
  assertPlainObject(input, 'renderPreBlock: input');
  assertNoInlineHandler(input, 'renderPreBlock: input');
  const block = input as PreBlockInput;
  const command = reqText(block.command, 'renderPreBlock: input.command');
  const parts: string[] = ['<div class="' + blockRoot('preBlock') + '">'];
  const label = optText(block.label);
  if (label !== undefined) parts.push('<div class="' + blockPart('preBlock', 'label') + '">' + esc(label) + '</div>');
  parts.push('<pre class="' + blockPart('preBlock', 'code') + '">' + esc(command) + '</pre>');
  if (block.actionId !== undefined) {
    const actionId = reqText(block.actionId, 'renderPreBlock: input.actionId');
    const text = typeof block.copyText === 'string' ? block.copyText : command;
    const copyLabel = optText(block.copyLabel) ?? '复制指令';
    parts.push('<button type="button" class="' + STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-ghost" '
      + ACTION_ID_ATTR + '="' + esc(actionId) + '" ' + DEFAULT_DATA_ATTR + '="' + esc(text) + '">'
      + esc(copyLabel) + '</button>');
  }
  parts.push('</div>');
  return parts.join('');
}

/* ══════════════════════════════════════════════════════════════
 * B-07 详情区（scene 必填五字段逐字展示；types 复数；status 两值闭集）
 * ══════════════════════════════════════════════════════════════ */

export interface DetailSectionInput {
  readonly scene: Scene;
  /** 该场景的 CLI 形态（调用方按 §3.5.3 `Scene.id` 推导约定组装）。 */
  readonly cli?: string;
}

/** 类型徽章（与 `src/help.ts` 同口径：字符串走 CSS 默认配色；`{text,bg?,fg?}` 配色写内联 style）。 */
function typeBadgeHtml(badge: string | SceneTypeBadge): string {
  if (typeof badge === 'string') {
    return '<span class="' + blockPart('detailSection', 'type') + '">' + esc(badge) + '</span>';
  }
  assertPlainObject(badge, 'renderDetailSection: types[] 元素');
  const element = badge as SceneTypeBadge;
  const text = reqText(element.text, 'renderDetailSection: types[] 元素的 text');
  const style: string[] = [];
  if (typeof element.bg === 'string' && element.bg !== '') style.push('background:' + element.bg);
  if (typeof element.fg === 'string' && element.fg !== '') style.push('color:' + element.fg);
  return '<span class="' + blockPart('detailSection', 'type') + '"'
    + (style.length === 0 ? '' : ' style="' + esc(style.join(';')) + '"') + '>' + esc(text) + '</span>';
}

/** B-07：场景详情（`prompt_template` 全文逐字展示；`【待开发】` 徽章下复制按钮仍可点＝纯展示，无行为）。 */
export function renderDetailSection(input: DetailSectionInput): string {
  assertPlainObject(input, 'renderDetailSection: input');
  assertNoInlineHandler(input, 'renderDetailSection: input');
  const section = input as DetailSectionInput;
  assertPlainObject(section.scene, 'renderDetailSection: input.scene');
  const scene = section.scene as Scene;
  const id = reqText(scene.id, 'renderDetailSection: input.scene.id');
  const title = reqText(scene.title, 'renderDetailSection: input.scene.title');
  const wakeWord = reqText(scene.wake_word, 'renderDetailSection: input.scene.wake_word');
  if (!(SCENE_STATUS as readonly string[]).includes(scene.status)) {
    badInput('renderDetailSection: input.scene.status 必须是 SCENE_STATUS 两值之一');
  }
  if (typeof scene.prompt_template !== 'string' || scene.prompt_template === '') {
    badInput('renderDetailSection: input.scene.prompt_template 必须是非空字符串');
  }
  const parts: string[] = ['<section class="' + blockRoot('detailSection') + '" data-scene-id="' + esc(id) + '">'];
  parts.push('<h2 class="' + blockPart('detailSection', 'title') + '">' + esc(title) + '</h2>');
  parts.push('<div class="' + blockPart('detailSection', 'meta') + '">'
    + '<span class="' + blockPart('detailSection', 'wake') + '">' + esc(wakeWord) + '</span>');
  if (scene.status === '【待开发】') {
    parts.push('<span class="' + blockPart('detailSection', 'dev') + '">待开发</span>');
  }
  if (scene.types !== undefined) {
    if (!Array.isArray(scene.types)) badInput('renderDetailSection: input.scene.types 必须是数组');
    for (const badge of scene.types) {
      if (typeof badge !== 'string') assertNoInlineHandler(badge as object, 'renderDetailSection: types[] 元素');
      parts.push(typeBadgeHtml(badge));
    }
  }
  parts.push('</div>');
  const cli = optText(section.cli);
  if (cli !== undefined) {
    parts.push('<pre class="' + blockPart('preBlock', 'code') + ' ' + blockPart('detailSection', 'cli') + '">'
      + esc(cli) + '</pre>');
  }
  parts.push('<pre class="' + blockPart('preBlock', 'code') + ' ' + blockPart('detailSection', 'prompt') + '">'
    + esc(scene.prompt_template) + '</pre>');
  parts.push('</section>');
  return parts.join('');
}

/* ══════════════════════════════════════════════════════════════
 * B-08 折叠区（强制原生 details；交互态全 CSS-only）
 * ══════════════════════════════════════════════════════════════ */

export interface DisclosureInput {
  readonly title: string;
  /** 已组合好的区块 HTML（受信透传，不转义）。 */
  readonly contentHtml: string;
  readonly open?: boolean;
}

/** B-08：折叠区（原生 `details／summary`；`[open]` 驱动展开态；复制按钮在内容里不触发 toggle＝宿主行为）。 */
export function renderDisclosure(input: DisclosureInput): string {
  assertPlainObject(input, 'renderDisclosure: input');
  assertNoInlineHandler(input, 'renderDisclosure: input');
  const block = input as DisclosureInput;
  const title = reqText(block.title, 'renderDisclosure: input.title');
  if (typeof block.contentHtml !== 'string') badInput('renderDisclosure: input.contentHtml 必须是字符串');
  return '<details class="' + blockRoot('disclosure') + '"' + (block.open === true ? ' open' : '') + '>'
    + '<summary class="' + blockPart('disclosure', 'summary') + '">' + esc(title) + '</summary>'
    + '<div class="' + blockPart('disclosure', 'body') + '">' + block.contentHtml + '</div>'
    + '</details>';
}

/* ══════════════════════════════════════════════════════════════
 * B-09 表单／参数区（静态 label＋input；行为归宿主，模块只留 data-* 约定）
 * ══════════════════════════════════════════════════════════════ */

/** 下拉候选项（#474 追加 · 加法式）：字符串项＝值即文本（旧行为逐字节不变）；
 *  对象项＝`value` 走机器面、`label` 走显示面（如 `{ value: 'fade', label: '淡入淡出' }`）。 */
export interface ParamOption {
  readonly value: string;
  readonly label: string;
}

export interface ParamFieldInput {
  readonly name: string;
  readonly label: string;
  readonly value?: string;
  readonly hint?: string;
  readonly required?: boolean;
  /** 只读（#397）：`true` 时 `<input>` 落裸 `readonly`；`options` 下拉（`select` 无 `readonly`）落裸 `disabled`。 */
  readonly readonly?: boolean;
  /** 数字步长（#397）：数字串或有限数，须大于 0；任一数字约束出现即 `type="number"`。 */
  readonly step?: string | number;
  /** 数字下界（#397）：数字串或有限数。 */
  readonly min?: string | number;
  /** 数字上界（#397）：数字串或有限数，须大于等于 `min`。 */
  readonly max?: string | number;
  /** 候选项（#397；#474 追加对象项）：非空项数组；给了即渲染 `<select>` 代替 `<input>`，
   *  `value` 命中的一项落 `selected`（对象项按 `value` 比机器值），`hint` 化作首项占位（`value=""` 禁选）。 */
  readonly options?: readonly (string | ParamOption)[];
}

export interface ParamFormInput {
  readonly fields: readonly ParamFieldInput[];
  readonly description?: string;
  /** 初始预览文本（受信透传；实时重算由宿主在 `input` 事件里做，DB-7）。 */
  readonly previewText?: string;
}

/** B-09：参数表单（`placeholder = hint`；`required` 落 `data-required` 供宿主拦截；零 JS）。
 *  #397 可选约束：`readonly` 落裸 `readonly`；`step／min／max` 落同名属性（任一出现即
 *  `type="number"`，`step` 须大于 0，`min` 不得大于 `max`，非法一律 `bad-input`）；
 *  `options` 给了即渲染 `<select>`（`value` 命中项 `selected`，`hint` 化作首项占位，
 *  `readonly` 化作 `disabled`，与 `step／min／max` 互斥）。
 *  #474 追加：`options` 收 `{ value, label }` 对象项——`value` 是机器值（`selected` 按它比）、
 *  `label` 是显示文本；字符串项走原路，全字符串调用方的产物**逐字节不变**。 */
export function renderParamForm(input: ParamFormInput): string {
  assertPlainObject(input, 'renderParamForm: input');
  assertNoInlineHandler(input, 'renderParamForm: input');
  const form = input as ParamFormInput;
  if (!Array.isArray(form.fields) || form.fields.length === 0) {
    badInput('renderParamForm: input.fields 必须是非空数组');
  }
  const parts: string[] = ['<div class="' + blockRoot('paramForm') + '">'];
  const description = optText(form.description);
  if (description !== undefined) {
    parts.push('<p class="' + blockPart('paramForm', 'description') + '">' + esc(description) + '</p>');
  }
  form.fields.forEach((field, i) => {
    const path = 'renderParamForm: input.fields[' + i + ']';
    assertPlainObject(field, path);
    assertNoInlineHandler(field as object, path);
    const item = field as ParamFieldInput;
    const name = reqText(item.name, path + '.name');
    const label = reqText(item.label, path + '.label');
    const hint = optText(item.hint);
    const value = typeof item.value === 'string' ? item.value : '';
    const required = item.required === true;
    const readonly = item.readonly === true;
    const step = optNumeric(item.step, path + '.step');
    const min = optNumeric(item.min, path + '.min');
    const max = optNumeric(item.max, path + '.max');
    if (step !== undefined && !(Number(step) > 0)) badInput(path + '.step 必须是大于 0 的数字');
    if (min !== undefined && max !== undefined && Number(min) > Number(max)) {
      badInput(path + '.min 不得大于 ' + path + '.max');
    }
    const options = optOptions(item.options, path + '.options');
    if (options !== undefined && (step !== undefined || min !== undefined || max !== undefined)) {
      badInput(path + '.options 与 step／min／max 互斥');
    }
    if (options !== undefined) {
      // #474：对象项按**机器值**比 `selected`，显示文本取 `label`；字符串项与旧行为逐字节一致。
      const entries = options.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt));
      const optionHtml = entries.map((opt) => '<option value="' + esc(opt.value) + '"'
        + (value === opt.value ? ' selected' : '') + '>' + esc(opt.label) + '</option>').join('');
      parts.push('<label class="' + blockPart('paramForm', 'field') + '">'
        + '<span class="' + blockPart('paramForm', 'label') + '">' + esc(label)
        + (required ? '<span class="' + blockPart('paramForm', 'required') + '" aria-hidden="true"> *</span>' : '')
        + '</span>'
        + '<select class="' + blockPart('paramForm', 'input') + '" name="' + esc(name) + '"'
        + (required ? ' data-required="1" required' : '')
        + (readonly ? ' disabled' : '')
        + '>'
        + (hint === undefined ? '' : '<option value="" disabled' + (entries.some((opt) => opt.value === value) ? '' : ' selected') + '>'
          + esc(hint) + '</option>')
        + optionHtml
        + '</select>'
        + '</label>');
      return;
    }
    parts.push('<label class="' + blockPart('paramForm', 'field') + '">'
      + '<span class="' + blockPart('paramForm', 'label') + '">' + esc(label)
      + (required ? '<span class="' + blockPart('paramForm', 'required') + '" aria-hidden="true"> *</span>' : '')
      + '</span>'
      + '<input class="' + blockPart('paramForm', 'input') + '"'
      + (step === undefined && min === undefined && max === undefined ? '' : ' type="number"')
      + ' name="' + esc(name) + '" value="' + esc(value) + '"'
      + (hint === undefined ? '' : ' placeholder="' + esc(hint) + '"')
      + (required ? ' data-required="1" required' : '')
      + (readonly ? ' readonly' : '')
      + (step === undefined ? '' : ' step="' + esc(step) + '"')
      + (min === undefined ? '' : ' min="' + esc(min) + '"')
      + (max === undefined ? '' : ' max="' + esc(max) + '"')
      + ' />'
      + '</label>');
  });
  if (typeof form.previewText === 'string' && form.previewText !== '') {
    parts.push('<pre class="' + blockPart('preBlock', 'code') + ' ' + blockPart('paramForm', 'preview') + '">'
      + esc(form.previewText) + '</pre>');
  }
  parts.push('</div>');
  return parts.join('');
}

/* ══════════════════════════════════════════════════════════════
 * B-10 空态 ／ B-11 复制区 ／ B-12 反馈区（组合冻结控件，不重定义）
 * ══════════════════════════════════════════════════════════════ */

export interface EmptyBlockInput extends EmptyStateInput {
  readonly title?: string;
}

/** B-10：空态区块（冻结 `renderEmptyState` ＋ 区块 wrapper；异常走 B-12，两者不混用 DB-8）。 */
export function renderEmptyBlock(input: EmptyBlockInput): string {
  assertPlainObject(input, 'renderEmptyBlock: input');
  assertNoInlineHandler(input, 'renderEmptyBlock: input');
  const block = input as EmptyBlockInput;
  const title = optText(block.title);
  return '<section class="' + blockRoot('emptyBlock') + '">'
    + (title === undefined ? '' : '<h2 class="' + blockPart('emptyBlock', 'title') + '">' + esc(title) + '</h2>')
    + renderEmptyState(block)
    + '</section>';
}

export interface CopyBlockInput {
  readonly title?: string;
  readonly dataText?: string;
  readonly logText?: string;
  readonly dataActionId?: string;
  readonly logActionId?: string;
  readonly buttons?: ActionBarInput['buttons'];
  /** **三格式形态**（#247）：给了就出不带 `data-t` 的复制数据按钮 ＋ 格式选择菜单
   *  （三个格式项各自带该格式已序列化文本）。与 `dataText` 互斥、需要 `dataActionId`
   *  （菜单项的 `data-action-id` 留空，唯一性不与它冲突）。 */
  readonly dataFormats?: CopyFormatTexts;
}

/** B-11：复制区块（冻结 `renderActionBar`；id 缺省取 `COPY_ACTION_IDS.actionBar.*`，调用方须保页内唯一）。
 *  `dataFormats` 给三格式形态（`dataText` 单格式），两者同给 → `bad-input`。
 *  标题去重（#336 base 侧兜底，与 `copyArea` 的 `COPY_TITLE_DUP_OF_BUTTON` 同口径）：
 *  `title` 与复制数据按钮同名（`ACTION_BAR_DEFAULTS.copyDataLabel`＝「复制数据」）时不出 `<h2>`
 *  （只留动作不留说明文本）；其他标题照旧。 */
export function renderCopyBlock(input: CopyBlockInput): string {
  assertPlainObject(input, 'renderCopyBlock: input');
  assertNoInlineHandler(input, 'renderCopyBlock: input');
  const block = input as CopyBlockInput;
  if (block.dataFormats !== undefined && block.dataText !== undefined) {
    badInput('renderCopyBlock: input.dataFormats 与 input.dataText 只能给一个');
  }
  const bar: ActionBarInput = {};
  if (block.buttons !== undefined) (bar as { buttons?: ActionBarInput['buttons'] }).buttons = block.buttons;
  if (block.dataText !== undefined || block.dataActionId !== undefined || block.dataFormats !== undefined) {
    (bar as { copyData?: CopyButtonInput }).copyData = {
      actionId: block.dataActionId ?? COPY_ACTION_IDS.actionBar.copyData,
      label: ACTION_BAR_DEFAULTS.copyDataLabel,
      ...(block.dataText === undefined ? {} : { text: block.dataText }),
      ...(block.dataFormats === undefined ? {} : { formats: block.dataFormats }),
    };
  }
  if (block.logText !== undefined || block.logActionId !== undefined) {
    (bar as { copyLog?: CopyButtonInput }).copyLog = {
      actionId: block.logActionId ?? COPY_ACTION_IDS.actionBar.copyLog,
      label: ACTION_BAR_DEFAULTS.copyLogLabel,
      ...(block.logText === undefined ? {} : { text: block.logText }),
    };
  }
  const rawTitle = optText(block.title);
  // #336：与按钮同名的标题只留按钮（`copyArea` 去重口径的 base 侧兜底，直调本函数同样生效）。
  const title = rawTitle === ACTION_BAR_DEFAULTS.copyDataLabel ? undefined : rawTitle;
  return '<section class="' + blockRoot('copyBlock') + '">'
    + (title === undefined ? '' : '<h2 class="' + blockPart('copyBlock', 'title') + '">' + esc(title) + '</h2>')
    + renderActionBar(bar)
    + '</section>';
}

export interface FeedbackBlockInput {
  readonly title?: string;
  readonly toast?: ToastInput;
  readonly error?: ErrorReceiptInput;
  /** **页内静态提示形态（#154）**：显式置 `true` 时，`toast` 不再走冻结 `renderToast`
   *  （深色毛玻璃卡 ＋「✓ 知道了」关闭按钮），改渲染为**浅色静态提示**——
   *  `var(--soft)` 底 ＋ 1px `var(--line)` 描边 ＋ 圆角 14px，**不带关闭按钮**、不进 toast 栈、
   *  不自动消失（页内静态提示不该能被点掉；点击委派也点不到它）。图标取同源 `TOAST_ICON_GLYPHS`，
   *  语义色按 `toast.icon`（`ToastIcon` 五值）落在图标底盘上。
   *
   *  **缺省值口径（逐字节）**：不给／给 `false`／给任何非 `true` 值 → 老行为一行不差
   *  （`renderToast` 逐字组合，见 `test/blocks.test.mjs` 与新证据件 t154）。
   *  开法：`renderFeedbackBlock({ toast: { msg, detail, icon }, staticNotice: true })`。 */
  readonly staticNotice?: boolean;
}

/** 页内静态提示**不出**的内容（#154，fail-fast 而非静默丢）：可点控件在静态提示里没有行为位，
 *  徽章／计数是 toast 卡头部的配件。给了就抛 `bad-input`（要这些就用 toast 形态：不传 `staticNotice`）。
 *  寿命字段（`timeoutMs`／`maxStack`）只关乎 toast 栈，静态形态下**无意义、静默忽略**。 */
const STATIC_NOTICE_REJECTED_FIELDS = ['actions', 'badge', 'count'] as const;

/** B-12 的浅色形态产出器（#154）：结构 = 图标 ＋ 正文（标题／详情／多行／代码块）。
 *  与 `renderToast` **同源不重述**：图标字形、`icon` 非法回落、转义表都取既有唯一产出者／冻结表。 */
function renderStaticNotice(toast: ToastInput): string {
  assertPlainObject(toast, 'renderFeedbackBlock: input.toast');
  if (typeof toast.msg !== 'string') badInput('renderFeedbackBlock: input.toast.msg 必须是字符串');
  for (const field of STATIC_NOTICE_REJECTED_FIELDS) {
    const value = toast[field];
    if (value !== undefined && value !== null) {
      badInput('renderFeedbackBlock: staticNotice 形态不出可点控件／徽章／计数，input.toast.'
        + field + ' 不得给（要这些就传 toast 形态：去掉 staticNotice）');
    }
  }
  const icon = typeof toast.icon === 'string' && toast.icon in TOAST_ICON_GLYPHS
    ? toast.icon
    : TOAST_DEFAULTS.defaultIcon;
  const parts: string[] = [
    '<div class="' + blockPart('feedbackBlock', 'note') + '">',
    '<span class="' + blockPart('feedbackBlock', 'note-icon') + ' '
      + blockPart('feedbackBlock', 'note-icon-' + icon) + '" aria-hidden="true">' + TOAST_ICON_GLYPHS[icon] + '</span>',
    '<div class="' + blockPart('feedbackBlock', 'note-body') + '">',
    '<div class="' + blockPart('feedbackBlock', 'note-title') + '">' + esc(toast.msg) + '</div>',
  ];
  if (typeof toast.detail === 'string' && toast.detail !== '') {
    parts.push('<div class="' + blockPart('feedbackBlock', 'note-detail') + '">' + esc(toast.detail) + '</div>');
  }
  if (Array.isArray(toast.lines) && toast.lines.length > 0) {
    parts.push('<div class="' + blockPart('feedbackBlock', 'note-lines') + '">'
      + toast.lines.map((line) => esc(String(line))).join('<br>') + '</div>');
  }
  if (typeof toast.code === 'string' && toast.code !== '') {
    parts.push('<pre class="' + blockPart('feedbackBlock', 'note-code') + '">' + esc(toast.code) + '</pre>');
  }
  parts.push('</div>', '</div>');
  return parts.join('');
}

/** B-12：反馈区块（冻结 `renderToast` 和／或 `renderErrorReceipt`；两者至少其一）。
 *  `staticNotice === true` 时 `toast` 改走浅色静态形态（#154），其余逐字照旧。 */
export function renderFeedbackBlock(input: FeedbackBlockInput): string {
  assertPlainObject(input, 'renderFeedbackBlock: input');
  assertNoInlineHandler(input, 'renderFeedbackBlock: input');
  const block = input as FeedbackBlockInput;
  if (block.toast === undefined && block.error === undefined) {
    badInput('renderFeedbackBlock: input.toast 与 input.error 至少其一');
  }
  const title = optText(block.title);
  const toastHtml = block.toast === undefined
    ? ''
    : (block.staticNotice === true ? renderStaticNotice(block.toast) : renderToast(block.toast));
  return '<section class="' + blockRoot('feedbackBlock') + '">'
    + (title === undefined ? '' : '<h2 class="' + blockPart('feedbackBlock', 'title') + '">' + esc(title) + '</h2>')
    + toastHtml
    + (block.error === undefined ? '' : renderErrorReceipt(block.error))
    + '</section>';
}

/* ══════════════════════════════════════════════════════════════
 * 区块样式资产（DB-2 后半：12 区的 CSS 唯一产出者）
 * ══════════════════════════════════════════════════════════════ */

/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 软线派生字面量：`--line`（`#d2d2d7`）的 RGB（与 `src/style.ts` 的 `BLUE_RGB` 同口径：
 *  派生字面量、不是第二份 token 表，不新增 token 名）。 */
const LINE_RGB = '210, 210, 215';

/** 主色 RGB（`--blue` `#007aff`；与 `src/style.ts` 同值，复用罗列处注明出处）。 */
const BLUE_RGB = '0, 122, 255';

/** 待开发徽章配色（沿用 help 模板 `help-shell-badge-dev` 逐值，不另发明）。 */
const DEV_BG = 'rgba(255, 149, 0, .12)';
const DEV_FG = '#b25000';

/** 必填星号色（沿用 help 模板 `help-shell-field-required` 逐值）。 */
const REQUIRED_FG = '#c0392b';

/** 局部圆角常量（D-5：`{8,14,20,999}`，不新增 token 名）。 */
const RADIUS_SM = 8;
const RADIUS_MD = 14;
const RADIUS_LG = 20;
const RADIUS_PILL = 999;

/** 区块 CSS：12 区各自实现（键与 `BLOCK_STYLE_SECTIONS` 一一对应，缺区导入即抛，防静默缺样式）。 */
const BLOCK_SECTION_BUILDERS: Record<BlockStyleSection, (prefix: string) => string> = {
  pageShell: (p) => [
    // #179 整页基座（文档级）：本区是「共享页面模板」的唯一落点（`style.test.mjs` T22 明写 body／html
    // 规则归 #104，`buildStyleSheet()` 不得产）。此前一条都没有 → 实测 `body` 吃 UA 的 8px 外边距、
    // 白底（`--bg` `#f5f5f7` 定义了却没人用）＋ 系统默认字体（computed 回落到 Noto Sans SC）。
    // 这三条与参照件 HELP 的 `body{font-family…;background:var(--bg);color:var(--text)}` 对齐；
    // 字体栈取 `src/font.ts` 唯一真相源（不各抄一份）。**不搬** HELP 的 `*{margin:0;padding:0}`：
    // 本页没有任何盒子靠全局复位才不溢出（唯一需要 `box-sizing` 的输入框已自带），
    // 搬了会把 `.ilife-block-page-shell` 的桌面内容宽从 960 压到 920（45 张页面一起变），
    // 属另一题材。 */
    'body {',
    '  margin: 0;',
    '  background: var(--bg);',
    '  color: var(--fg);',
    '  font-family: ' + BODY_FONT_STACK + ';',
    '  font-size: 15px;',
    '  line-height: 1.5;',
    '  -webkit-font-smoothing: antialiased;',
    '}',
    '.' + p + 'block-page-shell {',
    '  display: block;',
    '  max-width: 960px;',
    '  margin: 0 auto;',
    '  padding: 32px 20px 80px;',
    '  color: var(--fg);',
    '  font-feature-settings: "tnum";',
    '}',
    '.' + p + 'block-page-shell-eyebrow {',
    '  margin: 0;',
    // #179 对比度：12px 小字压白底，`--blue` 4.02:1 不到 AA 的 4.5:1 → 同族深一档 `--blue2`（5.6:1）。
    '  color: var(--blue2);',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '  letter-spacing: .08em;',
    '  text-transform: uppercase;',
    '}',
    '.' + p + 'block-page-shell-title {',
    '  margin: 6px 0 0;',
    '  font-size: 32px;',
    '  font-weight: 700;',
    '  letter-spacing: -.4px;',
    '  line-height: 1.2;',
    '}',
    '.' + p + 'block-page-shell-subtitle {',
    '  margin: 6px 0 0;',
    '  color: var(--fg2);',
    '  font-size: 15px;',
    '}',
    '.' + p + 'block-page-shell-body {',
    '  display: block;',
    '  margin-top: 16px;',
    '}',
    // #457 顶层区块统一间隔：正文里每个区块（非首个）上方恒 16px。此前各区块根规则各自给上下
    // 外边距，`dataTable`／`listRows` 两条**一条都没给**，于是「表接表」实测间距 0 —— 两张表的
    // 1px 边框贴在一起，看不出是两块（267 页「延迟相关性」与「分层对比」）。
    // 写在**一处**、用相邻兄弟收口，而不是给 12 个区各补一条上下边距：相邻两块的边距会折叠，
    // 既有的 12／16 都不超过 16，折叠后恒为 16，不需要改各区的既有值。
    // 作用域限死在本区正文的直接子级，两条都在防误伤：① `.ilife-block-kpi-card` 也是 `.ilife-block`，
    // 若全局写 `.ilife-block + .ilife-block`，KPI 卡网格里第 2 张起会各被推下 16px（同排错位、网格失效）；
    // ② 选择器只用 `.ilife-block` 作「后一块」，不给非区块元素（口径行／图例）加边距，也不动嵌在
    // 折叠区里的块（它不是正文的直接子级）。
    // **与 #154「各区自补 16px」重叠（同一根因的另一处补法）**：那批区间给 `dataTable`／`listRows`／
    // `kpiCardGrid` 各补了 `margin: 16px 0`，与本条命中同一处时两边同值、走 margin 折叠，恒 16px、
    // 不翻倍（实测 regen-262：表接表 16px）。两票都落地后由后续票收敛成单一落点，本票不撤。
    '.' + p + 'block-page-shell-body > * + .' + p + 'block {',
    '  margin-top: 16px;',
    '}',
    '@media (max-width: 640px) {',
    '  .' + p + 'block-page-shell {',
    '    padding: 20px 16px 60px;',
    '  }',
    '  .' + p + 'block-page-shell-title {',
    '    font-size: 26px;',
    '  }',
    '}',
    // #420 页面级三件的样式随本区落盘（`BLOCK_STYLE_SECTIONS` 由 `test/blocks.test.mjs` 钉死 12 项，
    // 不新增样式区；三件都是页面级、与 12 区块无组合关系）。
    '.' + p + 'block-toc {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 8px;',
    '  margin: 0 0 16px;',
    '}',
    '.' + p + 'block-toc a {',
    '  padding: 6px 12px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_PILL + 'px;',
    '  background: var(--card);',
    // #179 对比度口径：13px 小字压白底用 `--blue2`（5.6:1），`--blue` 4.02:1 不到 AA 的 4.5:1。
    '  color: var(--blue2);',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '  text-decoration: none;',
    '}',
    '.' + p + 'block-toc a:focus-visible {',
    '  outline: 2px solid var(--blue);',
    '  outline-offset: 2px;',
    '}',
    // 口径说明行：聚合数字旁的灰色小字。12px 取 `--fg2`（4.94:1）；`--fg3` 只有 3.62:1，不到 AA。
    '.' + p + 'block-caliber {',
    '  margin: 0 0 8px;',
    '  color: var(--fg2);',
    '  font-size: 12px;',
    '  line-height: 1.5;',
    '}',
    // #507 结论条（审查必改 #3）：形状住公共层，调用方只传文本。
    // 起因：这一条此前是**页面内联 8 个魔法值**（`homeDocs.ts` 的 `CONCLUSION_STYLE`：
    // `margin:0 0 16px;padding:12px 16px;border-radius:14px;background:var(--soft);color:var(--blue2);
    // font-weight:600` 写在一处 `style="…"` 里），与「版面单源住公共层」的纪律冲突（该件自述
    // 「本页不再出现任何一条自写 `font-size`／`color` 规则」，而 `color:var(--blue2)` 就在其中）。
    // 取值**逐条落在 11 个冻结 token ＋ 圆角闭集 `{8,14,20,999}` 内**，不新增 token：
    //   底 `var(--card)`（白，与卡片同底）、强调字 `var(--blue2)`（5.6:1）、左 3px `var(--blue)` 主色边、
    //   圆角 `' + RADIUS_MD + '`（14，闭集里既有中档）、内距 12px／16px（12／16 倍数）、下距 16px（同族值）。
    // 审查第 3 点给的形态就是这一条「左 3px 主色边 ＋ 浅底」，它同时把**结论条**与 `renderStatusBadge`
    // 的「`--soft` 底 ＋ 色字」形态分开——此前两者底同、字色同，一个静态陈述一个算出来的档位却长得一样。
    '.' + p + 'block-conclusion {',
    '  margin: 0 0 16px;',
    '  padding: 12px 16px;',
    '  border-left: 3px solid var(--blue);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '  color: var(--blue2);',
    '  font-size: 14px;',
    '  font-weight: 600;',
    '}',
    // #421 页面融合四件的样式随本区落盘（同 #420 处置：四件都是页面级、不属 12 区块，
    // `BLOCK_STYLE_SECTIONS` 由 `test/blocks.test.mjs` 钉死 12 项，故不新增样式区、不新增 token）。
    // **色值口径（#431 定稿）**：区块自身不写死任何色值字面量——样式里只出现冻结 token。不给 `color`
    // 时填充色的兜底就是下面两条 `-fill` 规则里的冻结 token `var(--blue)`（缺省色走冻结 token，不是
    // 字面量，也不是「没有色」）；调用方给的色值由 `optColor` 按允许清单收下、逐字进产物的内联
    // `background`。三处说法（本条注释／证据件／判据名）同口径。
    '.' + p + 'block-mini-bar {',
    '  display: inline-block;',
    '  overflow: hidden;',
    '  width: 72px;',
    '  height: 6px;',
    '  border-radius: ' + RADIUS_PILL + 'px;',
    '  background: var(--line);',
    '  vertical-align: middle;',
    '}',
    '.' + p + 'block-mini-bar-fill {',
    '  display: block;',
    '  height: 100%;',
    '  border-radius: ' + RADIUS_PILL + 'px;',
    '  background: var(--blue);',
    '}',
    '.' + p + 'block-dist-row {',
    '  display: grid;',
    '  grid-template-columns: minmax(0, 6em) minmax(0, 1fr) auto;',
    '  align-items: center;',
    '  gap: 8px;',
    '  padding: 5px 0;',
    '  font-size: 13px;',
    '}',
    // 13px 小字压白底：`--fg2`（4.94:1）达 AA；`--fg3`（3.62:1）不到，不用（#179 口径）。
    '.' + p + 'block-dist-row-name {',
    '  color: var(--fg2);',
    '  overflow: hidden;',
    '  text-overflow: ellipsis;',
    '  white-space: nowrap;',
    '}',
    '.' + p + 'block-dist-row-bar {',
    '  display: block;',
    '  overflow: hidden;',
    '  height: 8px;',
    '  border-radius: ' + RADIUS_PILL + 'px;',
    '  background: var(--line);',
    '}',
    '.' + p + 'block-dist-row-fill {',
    '  display: block;',
    '  height: 100%;',
    '  border-radius: ' + RADIUS_PILL + 'px;',
    '  background: var(--blue);',
    '}',
    '.' + p + 'block-dist-row-val {',
    '  color: var(--fg);',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: right;',
    '}',
    // 12px 小字取 `--blue2`（压 `--soft` 约 5.4:1）；`--blue` 4.02:1 不到 AA 的 4.5:1（#179 口径）。
    '.' + p + 'block-chip {',
    '  display: inline-block;',
    '  margin: 0 6px 6px 0;',
    '  padding: 2px 8px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_PILL + 'px;',
    '  background: var(--soft);',
    '  color: var(--blue2);',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '  line-height: 1.5;',
    '}',
    '.' + p + 'block-change-row {',
    '  display: flex;',
    '  align-items: baseline;',
    '  gap: 8px;',
    '  padding: 6px 0;',
    '  border-top: 1px solid var(--line);',
    '  font-size: 14px;',
    '}',
    '.' + p + 'block-change-row-label {',
    '  flex: 1;',
    '  min-width: 0;',
    '  color: var(--fg2);',
    '}',
    // 改前＝灰字加删除线；改后＝正文字重 600（层次靠字重与线，不靠更浅的灰，同 #179 口径）。
    '.' + p + 'block-change-row-old {',
    '  color: var(--fg2);',
    '  text-decoration: line-through;',
    '}',
    // 箭位恒占宽：`arrow: false` 只加内联 `visibility: hidden`，栏宽与真行逐字同（`display: none` 会塌）。
    '.' + p + 'block-change-row-arrow {',
    '  flex: 0 0 auto;',
    '  min-width: 1.2em;',
    '  color: var(--fg2);',
    '  text-align: center;',
    '}',
    '.' + p + 'block-change-row-new {',
    '  color: var(--fg);',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    // #420-3 打印段：**必须显式打开**——只有 `renderPageShell({ printable: true })` 的页才带
    // `.ilife-page-printable`；不给的调用点类名不出现，规则虽在样式段里但一律不命中（逐字零变）。
    // 打印段里**每条规则**都挂在该类作用域下（不出现裸 `body`／裸 `.wrap`）：样式表是共享资产、
    // 注入到全部页面，裸选择器会在别的页上生效。页面留白交给**具名页** `@page printable`
    // （`.ilife-page-printable { page: printable }` 绑定；裸 `@page` 会让全部页面吃这 12mm）。
    // 屏幕上那 32px 留白在纸上没有意义，故打印时清零、改由页边距承担。
    '@media print {',
    '  .' + p + PRINTABLE_SLUG + ' {',
    '    page: ' + PRINTABLE_PAGE_NAME + ';',
    '    max-width: none;',
    '    padding: 0;',
    '  }',
    '  .' + p + PRINTABLE_SLUG + ' .' + p + 'block-toc {',
    '    display: none;',
    '  }',
    '  .' + p + PRINTABLE_SLUG + ' .' + p + 'block-copy-block {',
    '    display: none;',
    '  }',
    '  @page ' + PRINTABLE_PAGE_NAME + ' {',
    '    margin: 12mm;',
    '  }',
    '}',
  ].join(LF),

  kpiCard: (p) => [
    // #179 类名对账（硬证据：`.scratch/t179` 的类名对账脚本）：本区 6 条内层规则此前写成
    // `block-kpi-*`，而 `blockPart('kpiCard', …)` 真产出的是 `block-kpi-card-*`
    // → label／value-row／value／unit／detail／badge **6 条全部落空**（computed 实测：值 16px/400
    // 普通正文色，不是设计的 28px/700）。本区逐条改回真产出的类名，并把说明落在每条前面。
    // #154（2026-09-14 交付页返工）① 区块间距：本区此前**块级一条 margin 都没有**，与同族区块
    // （`chartBlock`／`detailSection`／`emptyBlock`／`copyBlock`／`feedbackBlock` 都是 `margin: 16px 0`）
    // 不一致 ⇒ 交付页实测「KPI 网格与上下卡片贴死」。取同族值 `16px 0`（相邻外边距自然折叠，不翻倍）。
    // 与 #457 的 `.ilife-block-page-shell-body > * + .ilife-block`（相邻兄弟补上边距）**互补不冲突**：
    // 那条匹配不到本网格——网格根类是 `block-kpi-card-grid`，**不带** `ilife-block` 类；
    // 两处都命中同一条边距时同值（16px）且折叠，不会翻倍。
    // ② 四张卡等高：`auto-fit` 网格**逐行各自量高**，第一行若有一张卡的值长（如日期区间
    // `2026-08-09 ~ 2026-09-07`）折成 2~3 行，就把那一行撑高、同行另一张被拉长，第二行又是另一个高度。
    // `grid-auto-rows: 1fr` 让全部隐式行取同一个高（fr 轨道先取各自 max-content，余量均分 ⇒ 行行等高），
    // 网格项默认 `stretch`，四张卡因此看起来一样高（用户原话要求）。
    '.' + p + 'block-kpi-card-grid {',
    '  display: grid;',
    '  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));',
    '  grid-auto-rows: 1fr;',
    '  gap: 12px;',
    '  margin: 16px 0;',
    '}',
    '.' + p + 'block-kpi-card {',
    '  padding: 14px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '  box-shadow: var(--shadow);',
    '}',
    '.' + p + 'block-kpi-card-label {',
    '  color: var(--fg2);',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-kpi-card-value-row {',
    '  display: flex;',
    '  align-items: baseline;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  margin-top: 4px;',
    '}',
    '.' + p + 'block-kpi-card-value {',
    '  min-width: 0;',
    '  color: var(--fg);',
    // #154（2026-09-14 交付页返工）③ 主数字收一号：用户原话「内容太大了」。28px → 22px。
    // 22 是**阶梯里还站得住**的一档：22 − 17（`detail-section-title`／`h2`）＝ 5px ≥ 4px（C1:349
    // 「相邻级差 ≥4px」）；对 `unit` 13px 仍大 9px ≥ 8px（本尺 B-02「unit 比 value 小 ≥8px」）。
    // `overflow-wrap: anywhere` 保留（防长串溢出）——字号小了之后长值折行显著变少。
    '  font-size: 22px;',
    '  font-weight: 700;',
    '  line-height: 1.2;',
    '  overflow-wrap: anywhere;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '.' + p + 'block-kpi-card-unit {',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'block-kpi-card-detail {',
    '  margin-top: 4px;',
    // #179 对比度：12px 小字取 `--fg3`（`#86868b`）压卡片白底只有 3.62:1，不到 AA 的 4.5:1
    // → 与 label 同色 `--fg2`（4.94:1），层次由字重（600／400）和字号承担，不靠更浅的灰。
    '  color: var(--fg2);',
    '  font-size: 12px;',
    '  overflow-wrap: anywhere;',
    '}',
    '.' + p + 'block-kpi-card-badge {',
    '  margin-top: 8px;',
    '}',
    // #507 段标题统一（审查必改 #5）：`blocks.ts` 从 #401 起就给过这条类名产出器的位置
    // （`homeDocs.ts:247` 用 `<h2 class="ilife-block-kpi-card-title">` 出「今日速览」段标题），
    // 但**本区从来没有这条 CSS 规则** ⇒ 那个 h2 一路落回浏览器缺省 `h2{font-size:1.17em}`
    // （15px 正文的 1.17 倍＝17.5px），与同级的 `.ilife-block-copy-block-title`（15px）量出来两样。
    // 本条补上与另两族**同字号同字重**的一档：15px／700／`margin:0 0 8px`
    // （边距本区原无先例，取 `copy-block-title` 那档；`chart-block-title` 的 10px 是 #154 已有值，
    // 不在本票写集，故三族**字号与字重全同、边距两档**——审查第 5 条点的是字号。）
    '.' + p + 'block-kpi-card-title {',
    '  margin: 0 0 8px;',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '}',
    // #507 窄屏档（审查必改 #4）：`auto-fit minmax(150px,1fr)` 只在容器有效宽 ≥474px 时排 3 列
    // （3×150 ＋ 2×12 间隙），而手机端页壳 `padding:20px 16px`（见本区 ≤640px 段）——
    // 512 视口下栅格有效宽仅 480px ⇒ 正好卡在 3 列下沿，第 4 张卡单独占一行、宽度只有前三张的
    // 1/3（`grid-auto-rows:1fr` 又让它与前三张**等高**），看着像漏了一张。
    // 本条只加**窄屏一档**：≤640px 显式 2 列 ⇒ 4 张卡排成整齐 2×2；`minmax(0,1fr)` 里的 0
    // 是下限（不是 `auto` 那种取内容最小宽），长值卡不会被撑破。桌面档一行不动
    // （桌面列数上限是另一票的事，本票不碰）。断点取本文件既有先例：`dataTable` 与 `pageShell`
    // 两处都是 `@media (max-width: 640px)`。
    // 选择器是 `.ilife-block-page-shell .ilife-block-kpi-card-grid`（基座类名前挂一个祖先类），
    // **不是**同名再写一条：① 网格落在页面壳正文里（`renderKpiGrid` 的唯一用法），该祖先恒成立；
    // ② 本仓的 CSS 纪律测试（`test/ui-fix-154.test.mjs` 的 `declsOf`）按「某类名的**基座规则**恰 1 条」
    // 判账，同名再起一条会被数成 2 条而红；`dataTable` 区那条同名 640px 规则是历史写法，本票不动它。
    '@media (max-width: 640px) {',
    '  .' + p + 'block-page-shell .' + p + 'block-kpi-card-grid {',
    '    grid-template-columns: repeat(2, minmax(0, 1fr));',
    '  }',
    '}',
  ].join(LF),

  dataTable: (p) => [
    // #154（2026-09-14 交付页返工）① 区块间距：本区块级此前**一条 margin 都没有**（只有 caption／th／td
    // 的内距），与同族区块的 `margin: 16px 0` 不一致 ⇒ 交付页实测「表格和上下卡片完全贴在一起」。
    // 取同族值 `16px 0`；与 #457 的相邻兄弟规则同值时折叠为 16px，不翻倍。
    '.' + p + 'block-data-table {',
    '  margin: 16px 0;',
    '  overflow-x: auto;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '}',
    '.' + p + 'block-data-table-table {',
    '  width: 100%;',
    '  border-collapse: collapse;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '.' + p + 'block-data-table-caption {',
    '  padding: 10px 14px;',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '  text-align: left;',
    '}',
    '.' + p + 'block-data-table th {',
    '  padding: 10px 14px;',
    '  border-bottom: 1px solid var(--line);',
    '  background-color: transparent;',
    // #507 列头压一档（审查必改 #2）：此前 `th` 取 `--fg2`／12px／600，与数据行 `--fg2`／13px／400
    // 几乎同色同重 ⇒ 列头「日期」与数据「2026-09-07」分不出主次。改成 `--fg3`／11.5px（列头最浅）
    // ＋ 数据行的**数值列**取 `--fg`（见下方 `td.…-cell-right` 一条），「列头弱、数据强」的层级才读出来。
    // #179 那条对比度账**在此改写**：`--fg3`（`#86868b`）压白底 3.62:1 确实不到 AA 4.5:1，
    // 但 ① `docs/visual-spec-blocks.md:73` 的版式判据要的就是「`th` 最浅灰」；② 列头是**非正文**
    // 的短标签（`text-transform:uppercase` ＋ 字距），WCAG 对这类文本的最小对比度按 3:1 一档
    // 仍有富余；③ 原先取 `--fg2` 的代价是整张表分不出主次，比列头略浅更亏。数据行一律不动色。
    '  color: var(--fg3);',
    '  font-size: 11.5px;',
    '  font-weight: 600;',
    '  text-transform: uppercase;',
    '  letter-spacing: .04em;',
    '  white-space: nowrap;',
    '}',
    '.' + p + 'block-data-table td {',
    '  padding: 12px 14px;',
    '  border-bottom: 1px solid rgba(' + LINE_RGB + ', .6);',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'block-data-table tr:last-child td {',
    '  border-bottom: none;',
    '}',
    '.' + p + 'block-data-table-cell-left {',
    '  text-align: left;',
    '}',
    '.' + p + 'block-data-table-cell-center {',
    '  text-align: center;',
    '}',
    '.' + p + 'block-data-table-cell-right {',
    '  text-align: right;',
    '}',
    // #507 数值列主次（审查必改 #2）：`align:'right'` 是本层「这一列是数值」的唯一既有信号
    // （`renderDataTable` 的 `align` 三态里只有它带「数字成栈右对齐」的语义），故**数值列的提权
    // 挂在这条既有类名上**，不新造类名、不改产出器签名 —— 三族调用点（60 件）一行不用改。
    // 三处逐条：
    //  ① `color:var(--fg)`：同一语义（摄入＝1189）在 KPI 卡里是 `--fg`／700／22px，在表里此前是
    //     `--fg2`／400／13px —— 同一语义两种长法。数值列的**数据**取正文字色，与列头（`--fg3`）分开。
    //     不改字重（加粗到 600 会把整表拉响亮，`docs/visual-spec-blocks.md:73` 只要 `th` 最浅灰、
    //     `td` 次级灰、未禁数据加粗；本层取最小改动＝只换色，层级已够）。
    //  ② `min-width:5.5em`：此前数值列**没有宽度下限**，日期列（`align` 缺省 left）默认吃掉大半
    //     行宽，两个数值列被挤到右缘四个字符里（1000px 下两列中心相距 ~160px、右侧还空 60px），
    //     读起来像「数字都堆在角落」。5.5em 按本档 13px 算＝71.5px，容得下「2706」与「—」两种内容。
    //     只加下限，列宽仍由 `table-layout:auto` 按内容分。
    //  ③ 等宽轨 ＋ `tnum`：数字列换成等宽栈（与 `pre-block-code` 同一个栈口径，不新造字体面），
    //     位数不同的数字仍按列对齐；`tnum` 那一条在 `.…-data-table-table` 上已经是全表口径，
    //     这里在**单元格**上重申一次，防将来有人在 `td` 上写 `font-variant-numeric` 把它顶掉。
    // **只命中 `td`**（`align:'right'` 的列头 `th` 不跟着变重）：`th` 的色与字号由本区 `th` 规则管。
    '.' + p + 'block-data-table td.' + p + 'block-data-table-cell-right {',
    '  min-width: 5.5em;',
    '  color: var(--fg);',
    '  font-family: "SF Mono", monospace;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    // #457 手机端（≤640px）紧凑形态：不靠左右滑动看全。桌面段一字未动；窄屏只做三件事——
    // 收字号（表头 12→11px、单元格 13→12px）、收内边距（10/14→6/8、12/14→7/8）、
    // 放开 `th` 的 `white-space: nowrap`（这是表宽唯一的硬来源：表头不换行 → 最小宽度＝各列整词宽之和）。
    // `td` 另给 `overflow-wrap: anywhere`：它同时把单元格的最小内容宽度压到 1 字符，
    // 长日期串（`2024-09-08`）与长数字列因此可断行，7 列表在 390 宽里放得下。
    // 容器仍留 `overflow-x: auto` 作兜底（列数极多的表仍可滑），但常态不再触发。
    // **与 #154 给本区根补的 `margin: 16px 0` 不冲突**：窄屏段只碰字号／内距／换行，不碰边距；
    // 边距那处重叠见本文件 pageShell 区同口径注释（待后续票收敛成单一落点）。
    '@media (max-width: 640px) {',
    '  .' + p + 'block-data-table-table {',
    '    font-size: 12px;',
    '  }',
    '  .' + p + 'block-data-table-caption {',
    '    padding: 8px 10px;',
    '    font-size: 12px;',
    '  }',
    '  .' + p + 'block-data-table th {',
    '    padding: 6px 8px;',
    '    font-size: 11px;',
    '    letter-spacing: 0;',
    '    white-space: normal;',
    '  }',
    '  .' + p + 'block-data-table td {',
    '    padding: 7px 8px;',
    '    font-size: 12px;',
    '    overflow-wrap: anywhere;',
    '  }',
    '}',
  ].join(LF),

  chartBlock: (p) => [
    '.' + p + 'block-chart-block {',
    '  margin: 16px 0;',
    '  padding: 14px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '}',
    // #507 段标题统一（审查必改 #5）：本条与 `copy-block-title`／`kpi-card-title` 同一条尺子。
    // 审查点的是**字号**（本族 15px vs `kpi-card-title` 落回 `h2` 缺省的 17.5px）；`margin:0 0 10px`
    // 是 #154 已有的 10px 档，不在本票写集（动它会连带 `test/ui-fix-154.test.mjs` 的同族同值判据），
    // 故这条只把字号与字重对齐，边距一字不改。
    '.' + p + 'block-chart-block-title {',
    '  margin: 0 0 10px;',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '}',
    '.' + p + 'block-chart-block-canvas {',
    '  padding: 0;',
    '}',
  ].join(LF),

  listRows: (p) => [
    // #154（2026-09-14 交付页返工）① 区块间距：同 dataTable——本区块级此前一条 margin 都没有
    // （只有 row 的内距），与同族区块的 `margin: 16px 0` 不一致。取同族值（折叠后与 #457 那条同值 16px）。
    '.' + p + 'block-list-rows {',
    '  margin: 16px 0;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '}',
    '.' + p + 'block-list-rows-row {',
    '  display: grid;',
    '  grid-template-columns: 44px minmax(0, 1fr) auto;',
    '  gap: 8px;',
    '  align-items: center;',
    '  padding: 10px 14px;',
    '  border-top: 1px solid rgba(' + LINE_RGB + ', .6);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'block-list-rows-row:first-child {',
    '  border-top: 0;',
    '}',
    // 没给 `left` 的行：#154 加的形态——**不占标记列**（`44px` 是给 `▲`／`▼`／`—` 用的）。
    // 不给这条规则的话，缺 `left` 的行里 `main` 会落进 44px、被 `nowrap` ＋ `ellipsis` 截断。
    '.' + p + 'block-list-rows-row-no-left {',
    '  grid-template-columns: minmax(0, 1fr) auto;',
    '}',
    '.' + p + 'block-list-rows-left {',
    '  color: var(--fg3);',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '.' + p + 'block-list-rows-main {',
    '  min-width: 0;',
    '  overflow: hidden;',
    '  color: var(--fg);',
    '  text-overflow: ellipsis;',
    '  white-space: nowrap;',
    '}',
    '.' + p + 'block-list-rows-right {',
    '  color: var(--fg2);',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '.' + p + 'block-list-rows-row-done .' + p + 'block-list-rows-main {',
    '  color: var(--ok);',
    '  text-decoration: line-through;',
    '}',
  ].join(LF),

  preBlock: (p) => [
    '.' + p + 'block-pre-block {',
    '  margin: 12px 0;',
    '}',
    '.' + p + 'block-pre-block-label {',
    '  margin-bottom: 6px;',
    '  color: var(--fg2);',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-pre-block-code {',
    '  margin: 0;',
    '  padding: 12px;',
    '  border-radius: ' + RADIUS_SM + 'px;',
    '  background: var(--soft);',
    '  color: var(--fg2);',
    '  font-family: "SF Mono", monospace;',
    '  font-size: 12px;',
    '  line-height: 1.55;',
    '  white-space: pre-wrap;',
    '  overflow-x: auto;',
    '}',
  ].join(LF),

  detailSection: (p) => [
    '.' + p + 'block-detail-section {',
    '  margin: 16px 0;',
    '  padding: 14px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '  box-shadow: var(--shadow);',
    '}',
    '.' + p + 'block-detail-section-title {',
    '  margin: 0;',
    '  font-size: 17px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-detail-section-meta {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 8px;',
    '  margin-top: 8px;',
    '}',
    '.' + p + 'block-detail-section-wake {',
    '  color: var(--fg3);',
    '  font-family: "SF Mono", monospace;',
    '  font-size: 11.5px;',
    '}',
    '.' + p + 'block-detail-section-dev {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  padding: 1px 8px;',
    '  border-radius: ' + RADIUS_PILL + 'px;',
    '  background: ' + DEV_BG + ';',
    '  color: ' + DEV_FG + ';',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-detail-section-type {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  padding: 1px 8px;',
    '  border-radius: ' + RADIUS_PILL + 'px;',
    '  background: var(--soft);',
    '  color: var(--blue2);',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-detail-section-cli,',
    '.' + p + 'block-detail-section-prompt {',
    '  margin-top: 10px;',
    '}',
  ].join(LF),

  disclosure: (p) => [
    '.' + p + 'block-disclosure {',
    '  margin: 12px 0;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '}',
    '.' + p + 'block-disclosure-summary {',
    // #179 触控目标：折叠区整条是可点区域，实测 40px 高（10px 上下留白＋14px 字）不到 44px
    // → 改 44px 定高＋纵向居中，横向留白不变（与 `.block-disclosure-body` 的 14px 对齐）。
    '  display: flex;',
    '  align-items: center;',
    '  min-height: 44px;',
    '  padding: 0 14px;',
    '  font-size: 14px;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  list-style: none;',
    '}',
    '.' + p + 'block-disclosure-summary::-webkit-details-marker {',
    '  display: none;',
    '}',
    '.' + p + 'block-disclosure-summary::before {',
    '  content: "▸";',
    '  display: inline-block;',
    '  margin-right: 8px;',
    '  color: var(--fg3);',
    '  transition: transform .15s ease;',
    '}',
    '.' + p + 'block-disclosure[open] > .' + p + 'block-disclosure-summary::before {',
    '  transform: rotate(90deg);',
    '}',
    '.' + p + 'block-disclosure-body {',
    '  padding: 0 14px 14px;',
    '}',
  ].join(LF),

  paramForm: (p) => [
    '.' + p + 'block-param-form {',
    '  margin: 12px 0;',
    '}',
    '.' + p + 'block-param-form-description {',
    '  margin: 0 0 8px;',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'block-param-form-field {',
    '  display: block;',
    '  margin: 8px 0;',
    '}',
    '.' + p + 'block-param-form-label {',
    '  display: block;',
    '  margin-bottom: 4px;',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'block-param-form-required {',
    '  color: ' + REQUIRED_FG + ';',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-param-form-input {',
    '  box-sizing: border-box;',
    '  width: 100%;',
    '  min-height: 44px;',
    '  padding: 0 12px;',
    '  border: 0;',
    '  border-radius: ' + RADIUS_SM + 'px;',
    '  background: var(--bg);',
    '  color: var(--fg);',
    '  font-family: inherit;',
    '  font-size: 13px;',
    '}',
    '.' + p + 'block-param-form-input:focus {',
    '  background: var(--card);',
    '  border: 1px solid var(--blue);',
    '  box-shadow: 0 0 0 3px rgba(' + BLUE_RGB + ', .25);',
    '  outline: none;',
    '}',
    '.' + p + 'block-param-form-input:focus-visible {',
    '  outline: 2px solid var(--blue);',
    '  outline-offset: 2px;',
    '}',
    '.' + p + 'block-param-form-preview {',
    '  margin-top: 10px;',
    '}',
  ].join(LF),

  emptyBlock: (p) => [
    '.' + p + 'block-empty-block {',
    '  margin: 16px 0;',
    '}',
    '.' + p + 'block-empty-block-title {',
    '  margin: 0 0 8px;',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '}',
  ].join(LF),

  copyBlock: (p) => [
    '.' + p + 'block-copy-block {',
    '  margin: 16px 0;',
    '}',
    '.' + p + 'block-copy-block-title {',
    '  margin: 0 0 8px;',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '}',
  ].join(LF),

  feedbackBlock: (p) => [
    '.' + p + 'block-feedback-block {',
    '  margin: 16px 0;',
    '}',
    '.' + p + 'block-feedback-block-title {',
    '  margin: 0 0 8px;',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '}',
    // ── #154 页内静态提示（浅色形态）─────────────────────────────────────────────
    // 2026-09-14 用户返工：「顶部有个奇怪的弹窗这是什么？」——页顶那条「本窗只有 1 条记录…」由
    // `renderFeedbackBlock` 经冻结 `renderToast` 产出，穿的是**深色毛玻璃卡 ＋「✓ 知道了」**的
    // 弹窗外衣，而它是页面流里的一段静态块（t375 证据件：整份产物 `position: fixed` 出现 0 次、
    // 没有遮罩与焦点陷阱）。深色卡面是**运行时瞬时 toast** 的形态（2026-09-12 用户亲自裁定），
    // 两者不是一回事：本形态只在 `staticNotice === true` 时出现（缺省逐字节不变）。
    // 浅底／描边／圆角逐值取本文件里既有口径：底 `var(--soft)`、描边 1px `var(--line)`、
    // 圆角 `RADIUS_MD`（14px，闭集 {8,14,20,999} 内）；**不带关闭按钮**（静态提示不该能被点掉）。
    '.' + p + 'block-feedback-block-note {',
    '  display: flex;',
    '  align-items: flex-start;',
    '  gap: 10px;',
    '  margin: 16px 0;',
    '  padding: 12px 14px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--soft);',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '  line-height: 1.5;',
    '}',
    // 图标底盘：`kind` 的语义色落在**底盘底色＋字色**上。字形是 emoji（`TOAST_ICON_GLYPHS`，
    // 与 toast 同源），彩色 emoji 的 `color` 对它无效——语义色因此由底盘承担，`color` 只对
    // 无彩色字形（等宽／降级字体）生效，两处都写着，缺一不可。
    '.' + p + 'block-feedback-block-note-icon {',
    '  display: inline-flex;',
    '  flex: 0 0 auto;',
    '  align-items: center;',
    '  justify-content: center;',
    '  width: 22px;',
    '  height: 22px;',
    '  border-radius: ' + RADIUS_SM + 'px;',
    '  background: var(--card);',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '  line-height: 1;',
    '}',
    // 三档实色**逐值取同仓既有的状态徽章**（`src/style.ts` 的 `statusBadge` 区：ok `#e6f7ec`／`#1f8c3d`、
    // warn `#fff5e0`／`#a25b00`、danger `#fff0ee`／`#a83228`，原样取自旧层 `.hm-status.*`）——
    // 不发明新色值；`info`／`copy` 两档走冻结 token（`--card`／`--blue2`／`--fg2`），也不发明。
    '.' + p + 'block-feedback-block-note-icon-ok {',
    '  background: #e6f7ec;',
    '  color: #1f8c3d;',
    '}',
    '.' + p + 'block-feedback-block-note-icon-warn {',
    '  background: #fff5e0;',
    '  color: #a25b00;',
    '}',
    '.' + p + 'block-feedback-block-note-icon-danger {',
    '  background: #fff0ee;',
    '  color: #a83228;',
    '}',
    '.' + p + 'block-feedback-block-note-icon-info {',
    '  background: var(--card);',
    '  color: var(--blue2);',
    '}',
    '.' + p + 'block-feedback-block-note-icon-copy {',
    '  background: var(--card);',
    '  color: var(--fg2);',
    '}',
    '.' + p + 'block-feedback-block-note-body {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '}',
    // 正文＝正文字色 ＋ 600 字重（与 `.toast-title` 的层级口径一致，但取浅色面 token）。
    '.' + p + 'block-feedback-block-note-title {',
    '  color: var(--fg);',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-feedback-block-note-detail {',
    '  margin-top: 2px;',
    '  color: var(--fg2);',
    '}',
    '.' + p + 'block-feedback-block-note-lines {',
    '  margin-top: 2px;',
    '  color: var(--fg2);',
    '  white-space: pre-wrap;',
    '}',
    // 代码块：与 `preBlock`／help 的等宽口径同族（12px／1.55／pre-wrap／overflow-x:auto），
    // 但浅色面用 `var(--card)` 抬一级底色（`var(--soft)` 上再放浅底会糊成一片）。
    '.' + p + 'block-feedback-block-note-code {',
    '  margin: 6px 0 0;',
    '  padding: 8px 10px;',
    '  border-radius: ' + RADIUS_SM + 'px;',
    '  background: var(--card);',
    '  color: var(--fg2);',
    '  font-family: "SF Mono", monospace;',
    '  font-size: 12px;',
    '  line-height: 1.55;',
    '  white-space: pre-wrap;',
    '  overflow-x: auto;',
    '}',
  ].join(LF),
};

/** 闭集漂移 fail-fast（与 `src/style.ts` 同口径）：缺区实现导入即抛。 */
for (const section of BLOCK_STYLE_SECTIONS) {
  if (BLOCK_SECTION_BUILDERS[section] === undefined) {
    throw new Error('base-paint/blocks：BLOCK_STYLE_SECTIONS 闭集缺样式区实现（' + section + '）');
  }
}

export interface BlocksCssInput {
  /** 类名前缀；缺省 `STYLE_PREFIX`（`ilife-`）。 */
  readonly prefix?: string;
}

/** 区块样式资产唯一产出者（用法：调用方把返回值拼进 `TemplateAssets.sharedCssText`
 *  再交 `fillTemplate` 包裹注入；不得走 `StyleSheetInput.extraCss`——其语义被契约
 *  限死为技能作用域 token 覆盖块，不得塞共享页面模板的样式）。恒返回非空 CSS 文本。 */
export function blocksCss(input?: BlocksCssInput): string {
  const prefix = input !== undefined && input !== null && typeof input.prefix === 'string' && input.prefix !== ''
    ? input.prefix
    : STYLE_PREFIX;
  const parts: string[] = ['/* base-paint 区块样式资产 · #104 · 12 区 */'];
  for (const section of BLOCK_STYLE_SECTIONS) {
    parts.push('/* block-' + sectionSlug(section) + ' */');
    parts.push(BLOCK_SECTION_BUILDERS[section](prefix));
  }
  return parts.join(LF);
}

/* ── 再导出冻结引用（只读透传，方便 108–113 从单一入口取双属性名；零新语义） ── */

export { ACTION_ID_ATTR, COPY_ACTION_IDS, DEFAULT_DATA_ATTR, TOAST_DEFAULTS };
export type {
  ActionBarInput,
  CopyButtonInput,
  EmptyStateInput,
  ErrorReceiptInput,
  StatusKind,
  ToastInput,
};
