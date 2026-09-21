/** #873 查看域的分区件：**一枚分区的外壳**（图标位 ＋ 标题 ＋ 右端读数 ＋ 正文槽）、**页族装饰带**、
 *  **带图标位的参数带**，以及这些形状用的图标位字形。
 *
 * 为什么另立一件：`page.ts` 已经贴着本包 `AGENTS.md` 钉的 350 LF 告警线走（装配逻辑本身就在那份文件里）；
 * 「一页长什么样」的形状件与「这一页摆什么」的装配逻辑分开之后，两件各自只讲一件事。
 *
 * 图标位与装饰带一律是**内联 SVG 的纯装饰**：`aria-hidden`，一个字都不进 CSS，也不进可见文本
 * （词不许只活在样式里）。**不用 `<img>`、不引外部图**——验收墙的造册判据拒收带惰性加载属性的产物，
 * 而仓内的图片件（`renderMediaFigure`）产出器会写那个属性。
 */
import { escapeHtml } from 'base-paint';

/** 五字符归一（与区块层同源 `escapeHtml`，不自写第二份字符表）。 */
const esc = escapeHtml;

/** 分区的形制（内容不同、外壳相同）：一段说明 ＋ 一条 hairline ＋ 一块正文槽。 */
export interface SecHead {
  /** 分区标题（人话，如「食材（11 味）」）。 */
  readonly title: string;
  /** 右端读数（可省；空串即不印那一位）。 */
  readonly note: string;
}

/** 图标位字形的种类（同时是配色分组的键：一种分区一种色基）。 */
export type IconTone =
  | 'ingredients' | 'steps' | 'nutrition' | 'background' | 'history' | 'tags' | 'swap' | 'keys';

/** 字形一律 16×16、线条取 `currentColor`（16 这个尺寸只写一处，下面十四个字形共用）。 */
const SVG_OPEN = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"'
  + ' stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

/** 八个分区图标位。 */
const ICON: Readonly<Record<IconTone, string>> = {
  ingredients: SVG_OPEN + '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0Z"/><path d="M2 11h20"/>'
    + '<path d="M9.5 8.2c0-1.5 1.7-2.1 1.7-3.7"/><path d="M14 8.2c0-1.5 1.7-2.1 1.7-3.7"/></svg>',
  steps: SVG_OPEN + '<path d="M12 3.4c3.7 4.3 5.5 6.5 5.5 9.4a5.5 5.5 0 0 1-11 0c0-2.9 1.8-5.1 5.5-9.4Z"/>'
    + '<path d="M12 18.6a2.6 2.6 0 0 0 2.6-2.6c0-1.3-.9-2.3-2.6-4-1.7 1.7-2.6 2.7-2.6 4a2.6 2.6 0 0 0 2.6 2.6Z"/></svg>',
  nutrition: SVG_OPEN + '<path d="M12 20.6S3.4 15.2 3.4 9.7A4.7 4.7 0 0 1 12 7.1a4.7 4.7 0 0 1 8.6 2.6c0 5.5-8.6 10.9-8.6 10.9Z"/></svg>',
  background: SVG_OPEN + '<path d="M12 6.6C10 5 7.6 4.6 4.4 4.8v12.9c3.2-.2 5.6.2 7.6 1.8 2-1.6 4.4-2 7.6-1.8V4.8C16.4 4.6 14 5 12 6.6Z"/>'
    + '<path d="M12 6.6v12.9"/></svg>',
  history: SVG_OPEN + '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.2 1.9"/></svg>',
  tags: SVG_OPEN + '<path d="M4.4 4.4h7l8.2 8.2-7 7-8.2-8.2Z"/><circle cx="8.6" cy="8.6" r="1.3"/></svg>',
  swap: SVG_OPEN + '<path d="M4 8h13"/><path d="M14 5l3 3-3 3"/><path d="M20 16H7"/><path d="M10 13l-3 3 3 3"/></svg>',
  keys: SVG_OPEN + '<path d="M12 3.6a5.6 5.6 0 0 1 3.4 10.1c-.5.4-.8 1-.8 1.6h-5.2c0-.6-.3-1.2-.8-1.6A5.6 5.6 0 0 1 12 3.6Z"/>'
    + '<path d="M9.6 18h4.8"/><path d="M10.4 20.6h3.2"/></svg>',
};

/** 一枚分区：标题行（图标位＋标题＋右端读数）＋正文槽。
 *  锚点 id 落在**正文槽**上（指向内容本体），只看 X 卡与全量页共用同一段字符串。 */
export function sectionOf(anchor: string, tone: IconTone, head: SecHead, inner: string): string {
  return '<section class="chef-view-sec">'
    + '<div class="chef-view-sec-head">'
    + '<span class="chef-view-sec-icon chef-view-icon-' + tone + '" aria-hidden="true">' + ICON[tone] + '</span>'
    + '<h2 class="chef-view-sec-title">' + esc(head.title) + '</h2>'
    + (head.note === '' ? '' : '<span class="chef-view-sec-note">' + esc(head.note) + '</span>')
    + '</div>'
    + '<div class="chef-view-sec-body"' + (anchor === '' ? '' : ' id="' + esc(anchor) + '"') + '>'
    + inner + '</div></section>';
}

/** 页族装饰带上的器物／几何剪影（一条连续构图，不是一排等大的图标）。
 *
 * 为什么是**一整张连续构图**而不是「六枚图标并排」：第一版就是这么写的，判读里被读成
 * 「桌面端底部厨房工具栏」（一排等大的圆角图标，间距均匀，读起来像按钮）⇒ 改成一条起伏的基线
 * ＋ 沿线散落的器物剪影（锅／蒸汽／辣椒／砧板／碗／环），尺寸与位置都不均匀，读起来是插画带。
 * `preserveAspectRatio="xMidYMid slice"`：窄档裁掉右段（每段自成一组，裁哪一段都读得通），
 * 宽档横向铺满。 */
const BAND_ART = '<svg class="chef-view-band-art" viewBox="0 0 720 56" preserveAspectRatio="xMidYMid slice"'
  + ' fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'
  + ' aria-hidden="true">'
  + '<path d="M0 46c90-14 180 8 270 2s180-16 270-6 90 12 180 4" opacity=".5"/>'
  + '<path d="M78 18h44a22 22 0 0 1-44 0Z"/><path d="M122 18h14"/>'
  + '<path d="M196 8c-7 9 7 12 0 21"/><path d="M212 8c-7 9 7 12 0 21"/>'
  + '<path d="M286 22c0 4 3 6 6 6"/><path d="M290 28c8 13 7 29-5 36-10 6-22 1-26-10"/>'
  + '<rect x="356" y="16" width="46" height="20" rx="4"/><path d="M372 16v20"/>'
  + '<path d="M462 18h50a25 25 0 0 1-50 0Z"/><path d="M457 18h60"/>'
  + '<path d="M580 6c-7 9 7 12 0 21"/><path d="M596 6c-7 9 7 12 0 21"/>'
  + '<circle cx="678" cy="14" r="9"/><circle cx="678" cy="14" r="2.5"/></svg>';

/** 页族装饰带：页头下的一条器物剪影带（八页共用），纯装饰。
 *  **不是图位**：不承载任何数据，也不声称这是这道菜的实拍（本席不许编造菜品图）。 */
export function heroBandOf(): string {
  return '<div class="chef-view-band" aria-hidden="true">' + BAND_ART + '</div>';
}

/** 步骤三件套的三种图标位（火候／时长／锅温）。 */
export type ParamTone = 'heat' | 'clock' | 'temp';

const PARAM_ICON: Readonly<Record<ParamTone, string>> = {
  heat: ICON.steps,
  clock: SVG_OPEN + '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.2 1.9"/></svg>',
  temp: SVG_OPEN + '<path d="M10.4 13.2V5.6a1.6 1.6 0 0 1 3.2 0v7.6a3.6 3.6 0 1 1-3.2 0Z"/>'
    + '<path d="M12 10v6.4"/></svg>',
};

/** 一行「图标位 ＋ 标签 ＋ 值」的参数带（步骤卡的火候／时长／锅温走这一条形状）。 */
export function paramBandOf(
  items: readonly { readonly tone: ParamTone; readonly label: string; readonly value: string }[],
): string {
  if (items.length === 0) return '';
  return '<ul class="chef-view-params">' + items.map((it) =>
    '<li class="chef-view-param">'
    + '<span class="chef-view-param-icon" aria-hidden="true">' + PARAM_ICON[it.tone] + '</span>'
    + '<span class="chef-view-param-label">' + esc(it.label) + '</span>'
    + '<span class="chef-view-param-value">' + esc(it.value) + '</span></li>').join('') + '</ul>';
}
