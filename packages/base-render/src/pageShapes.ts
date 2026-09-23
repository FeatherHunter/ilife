/** #525 · 页面级形状件三件：**事实条**／**图片与 GIF 容器**／**时间轴条**，
 *  外加挂在图片容器上的**占位件**（`renderMediaPlaceholder`，#525 追加窄席位）。
 *
 *  谁在用（写得出哪两个在用）：**卡路里**的结果型页面装配（本票样板页 `.scratch/t525/` 的
 *  `查身材照` 目标形态先用；#526 读侧／#527 过程与结果／#528 回执三票照抄）与
 *  `src/shared/pageKit.ts` 的薄转出。
 *
 *  为什么要这三件（用户裁定第 5 条「一个内容要用 `；`／`·` 分割，就代表该处需要 UI 设计」）：
 *   · **事实条**：一行 N 件事（拍摄时间／距今天数／标签／文件名）此前被压成一串 `·`；
 *     现在是一排「标签＋值」的格子，由版式承担分隔，文本里一个分隔符都没有。
 *   · **图片与 GIF 容器**：此前是裸 `<figure>` ＋ 内联样式（`max-height:75vh` 定不住比例，
 *     图没显出来时留一条黑底占位条与卡片撞色）；现在容器自带**明确宽高比**＋`max-width:100%`
 *     ＋`object-fit`，没有图时出人话占位，不出黑条。
 *   · **时间轴条**：一串「时间 ＋ 做了什么」此前也是 `·` 串；现在左侧一条轴线＋圆点，
 *     时间与正文分两槽。
 *   · **占位件**：为什么追加——一页里「找不到文件／太大没进这一页」的那几格，此前是**另一套小卡**
 *     （自己一套内边距与居中），与真图格子的尺寸／圆角／图注位对不上；现在占位格与真图格**同规格**
 *     （同比例容器／同圆角／同外边距／同图注槽），换卡不换格子。
 *
 *  样式与产出器同文件（本件是**页面级**形状，不进 `blocks.ts` 的 12 个区块样式区；理由与
 *  `pageUi.ts` 同，见该件件头）。类名走既有 `ilife-block-<name>` 命名空间，不新造前缀。
 *  色值与圆角只用冻结 token 与圆角闭集 `{8,14,20,999}`，不新增。
 */

/* #950：本批新立的姊妹件（导航族／横条族）的样式**经本函数汇总**进页——调用方一行不用改，
   启用口径仍是 `pageUi` 位。两件都不反向 import 本件，无环。 */
import { pageNavCss } from './components/page-nav/index.js';
import { pageBarsCss } from './components/page-bars/index.js';

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts` 同）。 */
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
    throw new Error('pageShapes: ' + field + ' 必须是非空字符串');
  }
  return value;
}

function optText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error('pageShapes: ' + field + ' 必须是字符串');
  return value === '' ? undefined : value;
}

/* ══════════════════════════════════════════════════════════════
 * ① 事实条：一排「标签 ＋ 值」的格子
 * ══════════════════════════════════════════════════════════════ */

/** 语气三态（闭集）；不给＝中性（`--fg`）。取自同仓状态徽章的语义色，不发明新色值。 */
export type FactTone = 'ok' | 'warn' | 'danger';

export interface FactItemInput {
  /** 这格说的是什么（人话短标签，如「拍摄」「标签」）。 */
  readonly label: string;
  /** 这格的值（已是给人看的样子；数字口径由调用方定）。
   *  **#950 B4：`null` ＝ 缺数**——可见面印 `FACT_STRIP_MISSING_MARK`（`—`，与全仓「缺数一律写 —」同字），
   *  并带 `…-value-missing` 类降调；机器面（复制载荷）留空由调用方定，两条口径**分开**。 */
  readonly value: string | null;
  readonly tone?: FactTone;
  /** **单位**（#950 B4）：给了就紧跟值位出一枚小号单位（值位本身只吃数，不带单位）。
   *  缺数与单位同给时只印缺数占位（没有数，单位无意义）。 */
  readonly unit?: string;
}

export interface FactStripInput {
  /** 一条事实一行；0 条＝空串（与「没内容不留空块」同口径）。 */
  readonly items: readonly FactItemInput[];
  /** 版面根的附加类名（空格分隔，同 `blocks.ts` 的 `optExtraClass` 口径）。 */
  readonly extraClass?: string;
}

/** #950 B4：事实条的缺数占位（与全仓「缺数一律写 —」同字）。 */
export const FACT_STRIP_MISSING_MARK = '\u2014';

/** 事实条：一行 N 件事的呈现形状（替掉 `A · B · C` 那种串）。空数组出不了一个字。
 *  **#950 B4 扩参**：值位可给 `null`（缺数 → 印 `—`，与「0」区分开）＋ 可选单位位。
 *  给了字符串值又不给单位的既有调用点产物**逐字节不变**。 */
export function renderFactStrip(input: FactStripInput): string {
  const items = input.items;
  if (!Array.isArray(items)) throw new Error('pageShapes: renderFactStrip: input.items 必须是数组');
  if (items.length === 0) return '';
  const extra = optText(input.extraClass, 'renderFactStrip: input.extraClass');
  const cells = items.map((item, i) => {
    const field = 'renderFactStrip: input.items[' + i + ']';
    const label = reqText(item.label, field + '.label');
    const tone = item.tone;
    if (tone !== undefined && tone !== 'ok' && tone !== 'warn' && tone !== 'danger') {
      throw new Error('pageShapes: ' + field + '.tone 必须是 ok／warn／danger 之一');
    }
    const unit = optText(item.unit, field + '.unit');
    const missing = item.value === null || item.value === undefined;
    const value = missing ? FACT_STRIP_MISSING_MARK : reqText(item.value, field + '.value');
    return '<div class="ilife-block-fact-strip-item">'
      + '<span class="ilife-block-fact-strip-label">' + esc(label) + '</span>'
      + '<span class="ilife-block-fact-strip-value'
      + (tone === undefined ? '' : ' ilife-block-fact-strip-value-' + tone)
      + (missing ? ' ilife-block-fact-strip-value-missing' : '') + '">' + esc(value)
      + (missing || unit === undefined ? '' : '<span class="ilife-block-fact-strip-unit">' + esc(unit) + '</span>')
      + '</span>'
      + '</div>';
  }).join('');
  return '<div class="ilife-block-fact-strip' + (extra === undefined ? '' : ' ' + extra) + '">' + cells + '</div>';
}

/* ══════════════════════════════════════════════════════════════
 * ② 图片与 GIF 容器：明确宽高比 ＋ max-width ＋ object-fit
 * ══════════════════════════════════════════════════════════════ */

/** 容器宽高比闭集：`natural`＝按图自身比例（不设比，只兜 `max-width`）。
 *  `4-5` 是 #525 追加窄席位补的**竖版人像档**——照片画廊的格位本来就是 `4/5`，占位件要与真图同规格，
 *  比例集里就得有这一档（否则占位卡只能拿 `3-4` 凑，与真图卡差一截）。 */
export const MEDIA_RATIOS = ['natural', '1-1', '3-4', '4-5', '4-3', '9-16', '16-9'] as const;
export type MediaRatio = (typeof MEDIA_RATIOS)[number];

export interface MediaFigureInput {
  /** 图源（`data:` 内嵌串或文件名）。给了 `placeholder` 时本项可省。 */
  readonly src?: string;
  /** 替代文本（无障碍与图挂掉时的第一句话）。 */
  readonly alt: string;
  readonly ratio: MediaRatio;
  /** 图在框里的摆法：`contain`＝整张都看得见（人像类默认），`cover`＝铺满裁切。 */
  readonly fit?: 'contain' | 'cover';
  /** 图注（一行人话）。 */
  readonly caption?: string;
  /** 图注下的一句补充（口径、来源之类）。 */
  readonly note?: string;
  /** **没有图可显时的整句人话**（如「原图 3.0 MB，超过页面能带的 1 MB，请按文件名自己打开看」）。
   *  给了它且没给 `src` ⇒ 框里出这句话，不出黑底占位条。 */
  readonly placeholder?: string;
  /** 版面锚点（页内导航指过来用）；不给＝不带 id。 */
  readonly id?: string;
}

/** 容器外框的唯一装配件（本件内部件，不对外给）：`renderMediaFigure` 与 `renderMediaPlaceholder`
 *  两件共住这一段——**同规格**这条不变量靠它成立，不靠两处各写一遍再对照。
 *  `innerHtml` 是**已装配好的框内标记**（调用方负责转义自己那点文本；本层不再转义，否则嵌套标记会变成字面量）。 */
function renderMediaFrame(input: {
  readonly alt: string; readonly ratio: MediaRatio; readonly fit: 'contain' | 'cover';
  readonly innerHtml: string; readonly caption?: string; readonly note?: string; readonly id?: string;
}): string {
  const parts: string[] = ['<figure class="ilife-block ilife-block-media'
    + (input.id === undefined ? '' : '" id="' + esc(input.id)) + '">',
    '<div class="ilife-block-media-frame ilife-block-media-frame-' + input.ratio
    + ' ilife-block-media-frame-' + input.fit + '">',
    input.innerHtml,
    '</div>'];
  if (input.caption !== undefined) {
    parts.push('<figcaption class="ilife-block-media-caption">' + esc(input.caption) + '</figcaption>');
  }
  if (input.note !== undefined) {
    parts.push('<div class="ilife-block-media-note">' + esc(input.note) + '</div>');
  }
  parts.push('</figure>');
  return parts.join('');
}

/** 图片／GIF 容器：比例、`max-width`、`object-fit` 三件都在这里说清，调用方不再写内联样式。
 *  没给 `src` 而给 `placeholder` 时，框仍按同一个 `ratio` 定尺寸，框里是那句人话（转义后当纯文本放）。 */
export function renderMediaFigure(input: MediaFigureInput): string {
  const alt = reqText(input.alt, 'renderMediaFigure: input.alt');
  const ratio = input.ratio;
  if (!MEDIA_RATIOS.includes(ratio)) {
    throw new Error('pageShapes: renderMediaFigure: input.ratio 只许 ' + MEDIA_RATIOS.join('／'));
  }
  const fit = input.fit ?? 'contain';
  if (fit !== 'contain' && fit !== 'cover') {
    throw new Error('pageShapes: renderMediaFigure: input.fit 只许 contain／cover');
  }
  const id = optText(input.id, 'renderMediaFigure: input.id');
  const src = optText(input.src, 'renderMediaFigure: input.src');
  const caption = optText(input.caption, 'renderMediaFigure: input.caption');
  const note = optText(input.note, 'renderMediaFigure: input.note');
  const placeholder = optText(input.placeholder, 'renderMediaFigure: input.placeholder');
  if (src === undefined && placeholder === undefined) {
    throw new Error('pageShapes: renderMediaFigure: input.src 与 input.placeholder 至少其一');
  }
  const inner = src === undefined
    ? '<div class="ilife-block-media-frame-empty">' + esc(placeholder as string) + '</div>'
    : '<img class="ilife-block-media-img" src="' + esc(src) + '" alt="' + esc(alt) + '"'
      + ' loading="lazy" decoding="async">';
  return renderMediaFrame({ alt, ratio, fit, innerHtml: inner, caption, note, id });
}

/** 图片／GIF **占位件**的入参。与 `MediaFigureInput` 同槽位，只是框里装的是「为什么没显」的人话。 */
export interface MediaPlaceholderInput {
  /** 替代文本（无障碍，与 `MediaFigureInput.alt` 同槽位）。占位件也占**同一个内容槽**，故同样必填。 */
  readonly alt: string;
  /** **与同一处的真图同值**——这正是本件存在的理由，见下方不变量。 */
  readonly ratio: MediaRatio;
  /** 框里第一句人话，说清为什么没显（如「找不到文件：2026-06-09_003.jpg」）。 */
  readonly reason: string;
  /** 第二句人话：下一步怎么办（可省；不给＝本行不出）。 */
  readonly next?: string;
  /** 图注槽（不给＝与真图卡一样只靠容器的固定外边距撑开，不补空白）。 */
  readonly caption?: string;
  /** 图注下的一句补充（口径、来源之类），与 `MediaFigureInput.note` 同槽位。 */
  readonly note?: string;
  /** 摆法与真图同槽位；占位件内容居中，本项只为签名与真图对齐。 */
  readonly fit?: 'contain' | 'cover';
  /** 版面锚点（页内导航指过来用）；不给＝不带 id。 */
  readonly id?: string;
}

/** 图片／GIF 的**占位件**：框里没显出的那一格，规格必须与真图那一格逐项相同。
 *
 *  **不变量（写死在这一件里，改它先改 `renderMediaFigure`）**：与 `renderMediaFigure` **同规格** ——
 *  同一个宽高比容器（`<div class="ilife-block-media-frame …">` ＋ 本件要求的同一个 `ratio`）、
 *  同一个圆角（14px）、同一条外边距（`figure` 的 `margin: 16px 0`）、同一个图注槽
 *  （`figcaption.ilife-block-media-caption`）与补充槽（`.ilife-block-media-note`）。
 *  **做法**：本件**不另写一套框**，整页交给 `renderMediaFigure` 装配——调用方就算把真图卡换成占位卡，
 *  格子尺寸、圆角、外边距、图注位一处都不会变。缺的只是框里那点内容：`reason` 一句 ＋（可选）`next` 一句。
 *
 *  **不新增颜色**：框底用 `--soft`、框线用 `--line`（都来自 `.ilife-block-media-frame` 既有规则），
 *  两句人话只用既有语义词 `--fg2`（主句）／`--fg3`（下一步）；不新造色值、不新造类名前缀。 */
export function renderMediaPlaceholder(input: MediaPlaceholderInput): string {
  const alt = reqText(input.alt, 'renderMediaPlaceholder: input.alt');
  const ratio = input.ratio;
  if (!MEDIA_RATIOS.includes(ratio)) {
    throw new Error('pageShapes: renderMediaPlaceholder: input.ratio 只许 ' + MEDIA_RATIOS.join('／'));
  }
  const reason = reqText(input.reason, 'renderMediaPlaceholder: input.reason');
  const next = optText(input.next, 'renderMediaPlaceholder: input.next');
  const fit = input.fit ?? 'contain';
  if (fit !== 'contain' && fit !== 'cover') {
    throw new Error('pageShapes: renderMediaPlaceholder: input.fit 只许 contain／cover');
  }
  const inner = '<div class="ilife-block-media-empty">'
    + '<div class="ilife-block-media-reason">' + esc(reason) + '</div>'
    + (next === undefined ? '' : '<div class="ilife-block-media-next">' + esc(next) + '</div>')
    + '</div>';
  // 同规格复用：容器比例／圆角／外边距与图注两槽都走同一个装配件，本件不复制那段标记。
  return renderMediaFrame({
    alt,
    ratio,
    fit,
    innerHtml: inner,
    caption: optText(input.caption, 'renderMediaPlaceholder: input.caption'),
    note: optText(input.note, 'renderMediaPlaceholder: input.note'),
    id: optText(input.id, 'renderMediaPlaceholder: input.id'),
  });
}

/* ══════════════════════════════════════════════════════════════
 * ③ 时间轴条：左侧轴线 ＋ 圆点，时间与正文分两槽
 * ══════════════════════════════════════════════════════════════ */

export interface TimelineRowInput {
  /** 时间槽（人话串，如「5 月 30 日」）。 */
  readonly time: string;
  /** 主文（这一条发生了什么）。 */
  readonly main: string;
  /** 补充说明（可省）。 */
  readonly note?: string;
}

export interface TimelineRowsInput {
  readonly rows: readonly TimelineRowInput[];
  /** 版面根的附加类名（空格分隔）。 */
  readonly extraClass?: string;
}

/** 时间轴条：一串「时间 ＋ 做了什么」的呈现形状。0 条＝空串。 */
export function renderTimelineRows(input: TimelineRowsInput): string {
  const rows = input.rows;
  if (!Array.isArray(rows)) throw new Error('pageShapes: renderTimelineRows: input.rows 必须是数组');
  if (rows.length === 0) return '';
  const extra = optText(input.extraClass, 'renderTimelineRows: input.extraClass');
  const body = rows.map((row, i) => {
    const field = 'renderTimelineRows: input.rows[' + i + ']';
    const time = reqText(row.time, field + '.time');
    const main = reqText(row.main, field + '.main');
    const note = optText(row.note, field + '.note');
    return '<li class="ilife-block-timeline-row">'
      + '<span class="ilife-block-timeline-dot" aria-hidden="true"></span>'
      + '<span class="ilife-block-timeline-time">' + esc(time) + '</span>'
      + '<span class="ilife-block-timeline-main">' + esc(main) + '</span>'
      + (note === undefined ? '' : '<span class="ilife-block-timeline-note">' + esc(note) + '</span>')
      + '</li>';
  }).join('');
  return '<ol class="ilife-block-timeline' + (extra === undefined ? '' : ' ' + extra) + '">' + body + '</ol>';
}

/* ══════════════════════════════════════════════════════════════
 * 三支形状＋占位件的样式（与产出器同件；只对用上它们的页面有作用）
 * ══════════════════════════════════════════════════════════════ */

/** 形状件的样式唯一产出者（①②③ 三支 ＋ ②b 占位件）。恒返回非空 CSS 文本。 */
export function pageShapeCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  return [
    '/* #525 页面级形状件三件 */',
    '/* ① 事实条：一格「标签 ＋ 值」，格与格靠 22px 列距分开（不用任何分隔符字符）。 */',
    root + ' .' + p + 'block-fact-strip {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 10px 22px;',
    '  margin: 12px 0 0;',
    '}',
    root + ' .' + p + 'block-fact-strip-item {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 2px;',
    '  min-width: 0;',
    '}',
    root + ' .' + p + 'block-fact-strip-label {',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '}',
    root + ' .' + p + 'block-fact-strip-value {',
    '  color: var(--fg);',
    // #567 J4（§5.2 区块标题 15 吸收 14／15）。
    '  font-size: 15px;',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    root + ' .' + p + 'block-fact-strip-value-ok {',
    '  color: #1f8c3d;',
    '}',
    root + ' .' + p + 'block-fact-strip-value-warn {',
    '  color: #a25b00;',
    '}',
    root + ' .' + p + 'block-fact-strip-value-danger {',
    '  color: #a83228;',
    '}',
    '/* #950 B4：缺数（`value: null`）——占位字 `—` ＋ 降调；与「0」在观感上分开。 */',
    root + ' .' + p + 'block-fact-strip-value-missing {',
    '  color: var(--fg3);',
    '  font-weight: 500;',
    '}',
    '/* #950 B4：单位位（值位只吃数，单位小一号跟在后面）。 */',
    root + ' .' + p + 'block-fact-strip-unit {',
    '  margin-left: 4px;',
    '  color: var(--fg2);',
    '  font-size: 12px;',
    '  font-weight: 500;',
    '}',
    '/* ② 图片／GIF 容器：比例写在容器上，图按 object-fit 摆；没有图时是人话占位，不出黑底条。 */',
    root + ' .' + p + 'block-media {',
    '  margin: 16px 0;',
    '}',
    root + ' .' + p + 'block-media-frame {',
    '  position: relative;',
    '  overflow: hidden;',
    '  width: 100%;',
    '  max-width: 100%;',
    // #530：`width:100%`＋`border:1px` 在 content-box 下＝100%＋2px，09-02 在 768／1440 档
    // 恰好溢出 2px（回归门红）。框自己吃 border-box，不碰全局盒模型。
    '  box-sizing: border-box;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + 14 + 'px;',
    '  background: var(--soft);',
    '}',
    root + ' .' + p + 'block-media-frame-1-1 { aspect-ratio: 1 / 1; }',
    root + ' .' + p + 'block-media-frame-3-4 { aspect-ratio: 3 / 4; }',
    root + ' .' + p + 'block-media-frame-4-5 { aspect-ratio: 4 / 5; }',
    root + ' .' + p + 'block-media-frame-4-3 { aspect-ratio: 4 / 3; }',
    root + ' .' + p + 'block-media-frame-9-16 { aspect-ratio: 9 / 16; }',
    root + ' .' + p + 'block-media-frame-16-9 { aspect-ratio: 16 / 9; }',
    root + ' .' + p + 'block-media-frame-natural {',
    '  aspect-ratio: auto;',
    '}',
    root + ' .' + p + 'block-media-img {',
    '  display: block;',
    '  width: 100%;',
    '  height: 100%;',
    '  max-width: 100%;',
    '}',
    root + ' .' + p + 'block-media-frame-contain .' + p + 'block-media-img {',
    '  object-fit: contain;',
    '}',
    root + ' .' + p + 'block-media-frame-cover .' + p + 'block-media-img {',
    '  object-fit: cover;',
    '}',
    root + ' .' + p + 'block-media-frame-empty {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  box-sizing: border-box;',
    '  height: 100%;',
    '  padding: 24px 18px;',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '  line-height: 1.6;',
    '  text-align: center;',
    '}',
    root + ' .' + p + 'block-media-caption {',
    '  margin-top: 8px;',
    '  color: var(--fg);',
    // #567 J4（§5.2 区块标题 15 吸收 14／15）。
    '  font-size: 15px;',
    '  font-weight: 600;',
    '}',
    root + ' .' + p + 'block-media-note {',
    '  margin-top: 2px;',
    '  color: var(--fg2);',
    '  font-size: 12px;',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* ②b 占位件（`renderMediaPlaceholder`）：框体走上面 ② 的同一套规则（同比例／同圆角／同外边距），',
    '   这里只补框内那两句人话的槽位；只用既有语义词，不新增颜色。 */',
    root + ' .' + p + 'block-media-empty {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 6px;',
    '  box-sizing: border-box;',
    '  height: 100%;',
    '  padding: 0 18px;',
    '  align-items: center;',
    '  justify-content: center;',
    '  text-align: center;',
    '}',
    root + ' .' + p + 'block-media-reason {',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    root + ' .' + p + 'block-media-next {',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* ③ 时间轴条：一条轴线 ＋ 逐条圆点；时间与正文分两槽（不用 · 串）。 */',
    root + ' .' + p + 'block-timeline {',
    '  margin: 16px 0;',
    '  padding: 4px 0 4px 18px;',
    '  border-left: 1px solid var(--line);',
    '  list-style: none;',
    '}',
    root + ' .' + p + 'block-timeline-row {',
    '  position: relative;',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 2px 12px;',
    '  align-items: baseline;',
    '  padding: 6px 0;',
    '}',
    root + ' .' + p + 'block-timeline-dot {',
    '  position: absolute;',
    '  left: -23px;',
    '  top: 13px;',
    '  width: 9px;',
    '  height: 9px;',
    '  border-radius: 50%;',
    '  background: var(--blue);',
    '}',
    root + ' .' + p + 'block-timeline-time {',
    '  flex: 0 0 auto;',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    root + ' .' + p + 'block-timeline-main {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  color: var(--fg);',
    // #567 J4（§5.2 区块标题 15 吸收 14／15）。
    '  font-size: 15px;',
    '  font-weight: 600;',
    '}',
    root + ' .' + p + 'block-timeline-note {',
    '  flex: 1 1 100%;',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '  line-height: 1.6;',
    '}',
    '/* ④ 导航族与横条族（#950）：样式住在各自的姊妹件里，出口经本函数汇总；',
    '   顺序在页面级配方与形状件之后，同权重时按「后出现」取胜。 */',
    pageNavCss({ prefix: p }),
    pageBarsCss({ prefix: p }),
  ].join(LF);
}
