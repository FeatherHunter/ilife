/** #891 · **页内定位**（页首页内目录 ＋ 各小节锚点）：判据与装配的唯一定义地。
 *
 *  为什么要有这一件（四条出处，逐条对着 `docs/skills/skill-memo-ilife/t849-视觉基准.md` §2）：
 *   · 「页内定位」那一行：**长页必须有页内目录或锚点**；带标识的区块吃定位避让，锚点跳转不把标题顶到视口外；
 *   · 判分引擎（`packages/base-render/scripts/判分.mjs`）的 D5 那条腿：
 *     `tocCut = (fact.tocEl > 0 && fact.scrollMargin > 0) ? 0 : D5W.toc`（`D5W.toc = 4`）；
 *   · 本域 61 件产物改前**一件都没有页内目录**（`tocEl = 0`，见 #891 票面现状表）；
 *   · 公共层已有现成件：页内目录块走 `renderTocBlock`（`packages/base-render/src/blocks.ts`），
 *     卡路里与备忘录的大型页都在用 —— **本件只接线，不自造控件**。
 *
 *  ── 判据（唯一一处，别在每页各写一遍）──────────────────────────────────────────
 *  **小节**＝页内一颗 `<h2>` 段名所领的那一段（本节 `pageSections` 里给了 `navText` 的每一个元素）。
 *      这条口径与 #891 票面现状表的读数逐字同源（今天总结 3 ／ 复盘本周 9 ／ 首次使用向导 7，
 *      三处都是「页内 `<h2>` 数」）。
 *  **长页**＝小节数 ≥ `SECTION_TOC_MIN`（3）⇒ 页首出页内目录。
 *  **短页**＝小节数 ≤ 2 ⇒ 可以不出目录（`tocEl` 保持 0、D5 那条腿照旧扣 4）——
 *      哪几页被谁判为短页，写在**页型件自己的件头**（例：`shared/planPage.ts` 的「查日程」恒 2 小节）。
 *
 *  ── 目录项文本取什么（一处口径，理由写在这里）────────────────────────────────────
 *  **目录项文本＝这一节的段名，逐字**。唯一一处例外是「段名本身就是一句带读数的事实句」：
 *  作息详情页每条记录的段名是 `记录号 919：2026-09-15 00:00 至 06:30 睡眠`，它的目录项收成
 *  `记录号 919`（读数留在大段名上）。
 *  为什么这一处要收：事实列读数器（`docs/skills/skill-schedule/t792-facts.mjs`）的 `dupFacts` 那条
 *  启发式把「**同一句事实在页里出现 >1 次**」算作「同一段事实印两遍」（当刻口径：≥14 字、含数字、
 *  并含 `：` 或 `。` 的事实句），再由判分引擎按 H3 每处扣 2 分。目录与段名逐字同字时它会把**导航**
 *  算成重复事实：按日那条详情页一页 17 条记录各算一处（#891 实测：这一类共 +19 处，全部出在
 *  三张详情页上；其余 58 页逐字同字一处不增，因为那些段名都不到 14 字或不含句读）。
 *  这不是判据放宽（小节数、长页判据、D5 那条腿一字未动），是「导航文本与长段名分开取」这一条
 *  版面决定 —— 卡路里域同一条口径（`scene01-验收墙/看今日主页` 的目录写「今日速览」，
 *  同一节的 `<h2>` 写「🔥 今日速览」）。
 *
 *  ── 锚点 id 落在哪 ──────────────────────────────────────────────────────────
 *  落在这一节的 `<section>` 外壳上，不落在 `<h2>` 上：公共层页面配方的定位避让
 *  （`pageUiCss()` ③）只认页壳正文的**直接子件**上的 `id`
 *  （`.ilife-page-ui .ilife-block-page-shell-body > *[id] { scroll-margin-top: 20px }`），
 *  而 `<h2>` 有的住在图表块／读数卡／复制区**内部**、不是直接子件，吃不到那一条。
 *  故本节把「带 `navText` 的那一段」包一层 `<section id="sec-N">`——**避让仍走公共层那一份，
 *  本件一行 CSS 都不写**。
 */
import { renderTocBlock } from 'base-paint/blocks';

/** 长页判据：小节数 ≥ 本值（3）才出页内目录。改这里就是改全部页的长短分账。 */
export const SECTION_TOC_MIN = 3;

/** 一个页内元素（页型件按件序列摆好的**一段**或**一块**）。 */
export interface PageSection {
  /** **这一段的段名**（页内目录的条目文本）。不给＝这一块不是小节：原样透传、不包锚点、不进目录。 */
  readonly navText?: string;
  /** 这一段已渲染好的区块 HTML（受信：全部来自公共层区块件；段名那颗 `<h2>` 含在里头）。 */
  readonly html: string;
}

export interface PageNavigation {
  /** 页内目录块（短页＝空串，页首不留空块）。摆在页壳正文的最前。 */
  readonly toc: string;
  /** 正文：有 `navText` 的那几段各包一层 `<section id="sec-N">`，其余原样透传。 */
  readonly body: string;
}

/** 逐段拼正文 ＋ 从**同一份清单**派生页内目录（条目与锚点只在本函数里写一次，不会走散）。
 *
 *  · 空段（`html === ''`）整段丢掉，与各页原来的 `.filter((seg) => seg !== '')` 同一条口径：
 *    「没内容不留空块」，也不占一个目录条目；
 *  · 锚点 id 按**入目录的先后**编号（`sec-1`、`sec-2`…）：同一页内唯一、与页型件的件序列同序；
 *  · 目录条目数 < `SECTION_TOC_MIN` ⇒ 返回空目录（短页）。
 */
export function pageSections(sections: readonly PageSection[]): PageNavigation {
  const items: { id: string; text: string }[] = [];
  const parts: string[] = [];
  for (const section of sections) {
    if (section.html === '') continue;
    const navText = section.navText;
    if (navText === undefined || navText === '') { parts.push(section.html); continue; }
    const id = 'sec-' + String(items.length + 1);
    items.push({ id, text: navText });
    parts.push('<section id="' + id + '">' + section.html + '</section>');
  }
  return {
    toc: items.length >= SECTION_TOC_MIN ? renderTocBlock({ items }) : '',
    body: parts.join(''),
  };
}
