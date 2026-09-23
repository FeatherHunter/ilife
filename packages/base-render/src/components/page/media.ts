/** 页面级形状件 ②**图片与 GIF 容器**＋ ②b **占位件**（`renderMediaFigure`／`renderMediaPlaceholder`）。
 *
 *  容器自带明确宽高比；没有图时出人话占位，不出黑条。
 *
 *  **住址**：目录化批次②把它从 `src/pageShapes.ts` 搬到这里（正文原样，判据＝产物逐字节相同，
 *  见 `docs/base/base-render/组件目录架构.md`）。
 */

import { esc, reqText, optText } from './shared.js';
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

/** 本件样式段（族组装器 `pageShapeCss()` 按原顺序拼回）。 */
export function mediaCss(p: string, root: string): string[] {
  return [
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
  ];
}
