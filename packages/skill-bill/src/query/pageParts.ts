/** 查询域页内共件（两张页型共用）：**区块锚点包装** ＋ **页内导航**。
 *
 * 谁在用（两张页型，指名）：`./list.ts` 的列表页（`queryListDoc`）与 `./detail.ts` 的详情页
 *  （`queryDetailDoc`）——两页同一套页框，锚点与导航只在本件写一份（裁定 7「一个形状只许一处定义」）。
 *
 * 出处：`docs/skills/skill-bill/688-融合基准.md` §四 裁定 2——**结果型页恒出页内导航**（各区块锚点），
 *  理由是「老侧只有 header ＋ 离线条 ＋ 页脚这一薄恒显层（`query_view.html:113-119` 实测只有 4 个挂载点），
 *  内容一长就失去定位」。可判形式（同条）：每张产物各含**一个**页内导航块（`ilife-block-toc`）。
 *
 * **不是新形状**：区块本体全走公共层（`renderTocBlock`，`blocks.ts:254`）；本件只补公共层没有的两件事——
 *  ① 给区块一个稳定的 `id`（`renderTocBlock` 的锚点由调用方给，它不猜）；② 导航条目**从同一份块清单派生**
 *  （块序与锚点各写一份就会走散，故不许两处各写）。形状照卡路里同族的 `pageSection`
 *  （`packages/skill-calorie/src/render/trendPredictDocs.ts:59`）。
 *
 * **锚点与条目是同一件事的两面**：它们合成一个必填两字段的 `nav` 对象，故「给了锚点忘了条目」
 *  这种半截状态在类型上就写不出来（不靠运行期断言）。
 *
 * 段标题：`heading` 给了才出 `<h2>`。**不出无意义的标题**——读数区与复制区各自已经有形状承担身份
 *  （复制区更不许出与按钮同名的标题，裁定 5）。锚点不要求有可见标题，故 `heading` 可缺。
 */
import { renderTocBlock } from 'base-paint/blocks';
import { pageShell } from '../shared/pageShell.js';
import type { PageShellInput } from '../shared/pageShell.js';

/** 一个区块的导航面：锚点 id 与它在页内导航里的条目文本（两字段必须同给）。 */
export interface QueryBlockNav {
  readonly anchor: string;
  readonly navText: string;
}

/** 一个页内区块：**已渲染好的** HTML（受信：全部来自公共层区块件）＋ 可选导航面 ＋ 可选段标题。 */
export interface QueryPageBlock {
  readonly html: string;
  /** 给了即包 `<section id>` 并进页内导航；不给＝原样透传、不进导航。 */
  readonly nav?: QueryBlockNav;
  /** 可见段标题（不给＝只出锚点、不出标题）。 */
  readonly heading?: string;
}

/** 一个区块：有导航面即包 `<section id>`（导航条目指得到），否则原样透传。 */
function sectionOf(block: QueryPageBlock): string {
  if (block.nav === undefined) return block.html;
  const heading = block.heading === undefined ? '' : '<h2 class="ilife-query-sec-title">' + block.heading + '</h2>';
  return '<section id="' + block.nav.anchor + '">' + heading + block.html + '</section>';
}

/** 逐块拼正文：`<section>` 包装 ＋ 段标题。块序由调用方给的那份清单**唯一定义**。 */
export function pageBody(blocks: readonly QueryPageBlock[]): string {
  return blocks.map(sectionOf).join('');
}

/** 页内导航：条目**从同一份块清单派生**（有导航面的才进）。
 *  一块都没有 → 公共层返回空串（「没内容不留空块」），本件不自己造第二套判据。 */
export function pageNav(blocks: readonly QueryPageBlock[]): string {
  return renderTocBlock({
    items: blocks.filter((b) => b.nav !== undefined).map((b) => ({ id: (b.nav as QueryBlockNav).anchor, text: (b.nav as QueryBlockNav).navText })),
  });
}

/** 查询域各页的眉标：**只在本域写一次**（共用位 `shared/pageShell.ts` 不持「域名→取值」表，照守卫③b）。 */
export const QUERY_EYEBROW = '记账 · 查询域';

/** 本域两张页型统一走它：补上眉标再转共用位的 `pageShell`；调用点写法 `pageShell({…})` 不变。 */
export function queryPageShell(input: Omit<PageShellInput, 'eyebrow'>): string {
  return pageShell({ ...input, eyebrow: QUERY_EYEBROW });
}
