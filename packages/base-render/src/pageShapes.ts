/** #525 · 页面级形状件三件：**事实条**／**图片与 GIF 容器**／**时间轴条**。
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
 *
 *  样式与产出器同文件（本件是**页面级**形状，不进 `blocks.ts` 的 12 个区块样式区；理由与
 *  `pageUi.ts` 同，见该件件头）。类名走既有 `ilife-block-<name>` 命名空间，不新造前缀。
 *  色值与圆角只用冻结 token 与圆角闭集 `{8,14,20,999}`，不新增。
 */

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
  /** 这格的值（已是给人看的样子；数字口径由调用方定）。 */
  readonly value: string;
  readonly tone?: FactTone;
}

export interface FactStripInput {
  /** 一条事实一行；0 条＝空串（与「没内容不留空壳」同口径）。 */
  readonly items: readonly FactItemInput[];
  /** 版面根的附加类名（空格分隔，同 `blocks.ts` 的 `optExtraClass` 口径）。 */
  readonly extraClass?: string;
}

/** 事实条：一行 N 件事的呈现形状（替掉 `A · B · C` 那种串）。空数组出不了一个字。 */
export function renderFactStrip(input: FactStripInput): string {
  const items = input.items;
  if (!Array.isArray(items)) throw new Error('pageShapes: renderFactStrip: input.items 必须是数组');
  if (items.length === 0) return '';
  const extra = optText(input.extraClass, 'renderFactStrip: input.extraClass');
  const cells = items.map((item, i) => {
    const field = 'renderFactStrip: input.items[' + i + ']';
    const label = reqText(item.label, field + '.label');
    const value = reqText(item.value, field + '.value');
    const tone = item.tone;
    if (tone !== undefined && tone !== 'ok' && tone !== 'warn' && tone !== 'danger') {
      throw new Error('pageShapes: ' + field + '.tone 必须是 ok／warn／danger 之一');
    }
    return '<div class="ilife-block-fact-strip-item">'
      + '<span class="ilife-block-fact-strip-label">' + esc(label) + '</span>'
      + '<span class="ilife-block-fact-strip-value'
      + (tone === undefined ? '' : ' ilife-block-fact-strip-value-' + tone) + '">' + esc(value) + '</span>'
      + '</div>';
  }).join('');
  return '<div class="ilife-block-fact-strip' + (extra === undefined ? '' : ' ' + extra) + '">' + cells + '</div>';
}

/* ══════════════════════════════════════════════════════════════
 * ② 图片与 GIF 容器：明确宽高比 ＋ max-width ＋ object-fit
 * ══════════════════════════════════════════════════════════════ */

/** 容器宽高比闭集：`natural`＝按图自身比例（不设比，只兜 `max-width`）。 */
export const MEDIA_RATIOS = ['natural', '1-1', '3-4', '4-3', '9-16', '16-9'] as const;
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

/** 图片／GIF 容器：比例、`max-width`、`object-fit` 三件都在这里说清，调用方不再写内联样式。 */
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
  const parts: string[] = ['<figure class="ilife-block ilife-block-media'
    + (id === undefined ? '' : '" id="' + esc(id)) + '">',
    '<div class="ilife-block-media-frame ilife-block-media-frame-' + ratio + ' ilife-block-media-frame-' + fit + '">',
    inner,
    '</div>'];
  if (caption !== undefined) {
    parts.push('<figcaption class="ilife-block-media-caption">' + esc(caption) + '</figcaption>');
  }
  if (note !== undefined) {
    parts.push('<div class="ilife-block-media-note">' + esc(note) + '</div>');
  }
  parts.push('</figure>');
  return parts.join('');
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
 * 三件的样式（与产出器同件；只对用上它们的页面有作用）
 * ══════════════════════════════════════════════════════════════ */

/** 三件形状的样式唯一产出者。恒返回非空 CSS 文本。 */
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
    '  font-size: 14px;',
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
    '/* ② 图片／GIF 容器：比例写在容器上，图按 object-fit 摆；没有图时是人话占位，不出黑底条。 */',
    root + ' .' + p + 'block-media {',
    '  margin: 16px 0;',
    '}',
    root + ' .' + p + 'block-media-frame {',
    '  position: relative;',
    '  overflow: hidden;',
    '  width: 100%;',
    '  max-width: 100%;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + 14 + 'px;',
    '  background: var(--soft);',
    '}',
    root + ' .' + p + 'block-media-frame-1-1 { aspect-ratio: 1 / 1; }',
    root + ' .' + p + 'block-media-frame-3-4 { aspect-ratio: 3 / 4; }',
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
    '  font-size: 14px;',
    '  font-weight: 600;',
    '}',
    root + ' .' + p + 'block-media-note {',
    '  margin-top: 2px;',
    '  color: var(--fg2);',
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
    '  font-size: 14px;',
    '  font-weight: 600;',
    '}',
    root + ' .' + p + 'block-timeline-note {',
    '  flex: 1 1 100%;',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '  line-height: 1.6;',
    '}',
  ].join(LF);
}
