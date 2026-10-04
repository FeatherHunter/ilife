/** popover · **标记与常量**（本组件的字面唯一来源；别的件只读这里）。
 *
 *  这一族是什么：**把被省略号裁掉的长文本，改由一张气泡卡片承载全文**。
 *  触发处照旧是原来那个元素（**它自己的类一字不改**——单行省略号的观感不动），
 *  另挂一张 `popover` 卡片，卡片里是**逐字全文**。
 *
 *  为什么是「触发处不动 ＋ 另挂卡片」：把触发处的省略号规则改掉（改成折行）会改版面、
 *  改行高、改整页高度；**只挂卡片**则页面上一个字都不挪，用户点/聚焦/悬停才多一张卡。
 *
 *  **无脚本降级（本件的安全底线）**：`style/popover.ts` 的第一层规则**默认**把触发处
 *  改成整行折行、**不裁**——脚本没跑时全文照常看得见，只是版式高一点。
 *  脚本跑起来才在 `<html>` 上打就绪标记、回到单行省略号。所以「有脚本」是**增益**，
 *  「没脚本」是**可读**，不会因为脚本坏了就把信息丢了。
 */
import { PAGE_UI_CLASS } from '../page-ui/index.js';

/** 组件默认类名前缀。 */
export const POPOVER_PREFIX = 'ilife-';

/** 挂载点容器类名（`display:contents`，不生成盒子 ⇒ 包一层不挪版面）。 */
export const POPOVER_CLASS = POPOVER_PREFIX + 'popover';
/** 触发处追加的那一枚类（**加**在调用方自己的类之后，原类一字不动）。 */
export const POPOVER_TRIGGER_CLASS = POPOVER_PREFIX + 'popover-trigger';
/** 气泡卡片类名。 */
export const POPOVER_CARD_CLASS = POPOVER_PREFIX + 'popover-card';

/** 挂载点发现锚：值＝面板 `id`。 */
export const POPOVER_ATTR = 'data-ilife-popover';
/** 触发处标记（空值；样式与运行时都靠它认人）。 */
export const POPOVER_TRIGGER_ATTR = 'data-ilife-popover-trigger';
/** 气泡卡片标记（空值）。 */
export const POPOVER_CARD_ATTR = 'data-ilife-popover-card';
/** 运行时记账（幂等）：本组件只绑一次。 */
export const POPOVER_BOUND_ATTR = 'data-ilife-popover-bound';
/** 就绪标记：打��� `<html>` 上。**没有它，触发处保持整行可见**（降级层）。 */
export const POPOVER_READY_ATTR = 'data-ilife-popover-ready';
/** 测量标记：打在 `<html>` 上，**只在判定「这处真被裁到」的那一瞬间**挂上、量完摘掉。
 *  为什么需要它：降级层默认把文字摊开（整行可见＝无 JS 时的安全底线），
 *  直接量 `scrollWidth>clientWidth` 永远量不到溢出 ⇒ 运行时一次都不升级（实测：挂载点 0）。
 *  挂上这一枚＝把单行省略号临时装回去量，量完即摘，页面观感不受影响。 */
export const POPOVER_MEASURE_ATTR = 'data-ilife-popover-measure';

/** 逐实例锚名前缀（锚名只能由标记算出来：静态 CSS 认不出逐实例名字）。 */
export const POPOVER_ANCHOR_PREFIX = '--ilife-popover-';

/** 气泡卡片宽度上限／离视口边距／离触发处的间距（px）。 */
export const POPOVER_CARD_WIDTH_PX = 320;
export const POPOVER_EDGE_PX = 12;
export const POPOVER_GAP_PX = 6;

/** 能力查询串：CSS 与运行时**读同一份常量**（两边对「引擎支不支持」必须说同一句话）。 */
export const POPOVER_ANCHOR_QUERY = 'anchor-name: --a';
export const POPOVER_AREA_QUERY = 'position-area: bottom';

/** 样式段的作用域根类（照同族 `popover-menu` 那条纪律：skin 只经 token 读、scope 在页面级配方之下）。 */
export const POPOVER_SCOPE = '.' + PAGE_UI_CLASS;

/** 默认候选选择器：**结构性的，不含任何一家的私有类名**。
 *
 *  三条各对应一种「长文本落点」：明细行里的副行、条卡行的主列、占比行的名称列。
 *  运行时候选里**只有真被裁到的**（scrollWidth 超出）才升级成触发处，文字短的零命中。
 *  页面可经入参 `selectors` 追加自己的落点，**替换**（不追加）这份缺省。 */
export const POPOVER_DEFAULT_SELECTORS: readonly string[] = Object.freeze([
  '.ilife-ticket-entry-text > span',
  '.ilife-block-list-rows-main',
  '.ilife-block-dist-row-name',
]);
