/** 页面区块锚点与页内导航（共用位）：**区块锚点包装** ＋ **从同一份块清单派生的页内导航**。
 *
 * 谁在用（两个域、七个调用点，指名）：
 *   ① `src/query/`——列表页（`./list.ts` 的 `queryListDoc`）与详情页（`./detail.ts` 的 `queryDetailDoc`）；
 *   ② `src/write/`——五张模板（`./template-{expense,flow,batch,installment,update}.ts`）的结果型回执页那一支。
 *  两域的块清单都**既拼正文也派生导航**，锚点与条目只在本件写一份（裁定 7「一个形状只许一处定义」）。
 *
 * 出处：`docs/skills/skill-bill/688-融合基准.md` §四 裁定 2（结果型页恒出页内导航）＋ §五 5.2 第 4 行
 *  （`●` 结果型 ④⑤⑥⑦、`—` 过程型 ①②③）。可判形式（同条）：每张产物各含**一个**页内导航块（`ilife-block-toc`）。
 *
 * **本件是「共用位从第二个用法里长出来」的那一件**：原住 `src/query/pageParts.ts`（查询域先跑通），
 *  写入域五张回执页要用第二遍，故原样搬到 `src/shared/`；两个类型改名中性（`QueryBlockNav`→`PageBlockNav`、
 *  `QueryPageBlock`→`PageBlock`），**行为一字不改**——含下面 `sectionOf` 里那枚段标题类名
 *  `ilife-query-sec-title`：它是搬迁前那一枚字面，改名会动查询域当刻产物，属另一件事。
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

/** 一个区块的导航面：锚点 id 与它在页内导航里的条目文本（两字段必须同给）。 */
export interface PageBlockNav {
  readonly anchor: string;
  readonly navText: string;
}

/** 一个页内区块：**已渲染好的** HTML（受信：全部来自公共层区块件）＋ 可选导航面 ＋ 可选段标题。 */
export interface PageBlock {
  readonly html: string;
  /** 给了即包 `<section id>` 并进页内导航；不给＝原样透传、不进导航。 */
  readonly nav?: PageBlockNav;
  /** 可见段标题（不给＝只出锚点、不出标题）。 */
  readonly heading?: string;
}

/** 一个区块：有导航面即包 `<section id>`（导航条目指得到），否则原样透传。 */
function sectionOf(block: PageBlock): string {
  if (block.nav === undefined) return block.html;
  const heading = block.heading === undefined ? '' : '<h2 class="ilife-query-sec-title">' + block.heading + '</h2>';
  return '<section id="' + block.nav.anchor + '">' + heading + block.html + '</section>';
}

/** 一个**带导航面**的区块，一行写完一块：`navBlock(html, 'sec-kpi', '读数')`。
 *  与 `{ html, nav: { anchor, navText } }` 是同一件事的两种写法——写入域五张模板每张要拼五六块
 *  （块清单一行一块最读得清）；查询域两张页的块各带着段标题，仍写对象字面量。 */
export function navBlock(html: string, anchor: string, navText: string): PageBlock {
  return { html, nav: { anchor, navText } };
}

/** 逐块拼正文：`<section>` 包装 ＋ 段标题。块序由调用方给的那份清单**唯一定义**。 */
export function pageBody(blocks: readonly PageBlock[]): string {
  return blocks.map(sectionOf).join('');
}

/** 页内导航：条目**从同一份块清单派生**（有导航面的才进）。
 *  一块都没有 → 公共层返回空串（「没内容不留空块」），本件不自己造第二套判据。 */
export function pageNav(blocks: readonly PageBlock[]): string {
  return renderTocBlock({
    items: blocks.filter((b) => b.nav !== undefined).map((b) => ({ id: (b.nav as PageBlockNav).anchor, text: (b.nav as PageBlockNav).navText })),
  });
}
