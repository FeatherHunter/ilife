/** #782 · 整页装配（技能侧最后一公里）：页头三件 ＋ 区块正文 → 完整 HTML 文档。
 *
 *  与卡路里同名件同族（`packages/skill-calorie/src/shared/docPage.ts`）：**文档壳那一圈不住这里**
 *  ——doctype／head 槽位／样式与脚本资产拼接／图表位全在公共层 `base-paint/docShell` 的
 *  `renderDocShell`；本件只决定三件事：这一页的页头怎么写、正文摆在哪、补哪些技能侧样式。
 *
 *  技能侧补丁＝**页面级移动端配方**（`pageUi`：640 断点／44px 触摸区／安全区／窄屏读数卡两格／
 *  表格卡片化）＋**页面级形状件**（`pageShapes`：事实条／时间轴条）＋**本票两处页内自造件**
 *  （`pageParts`：24 小时色带／7×24 热力矩阵）的样式。三样都只在启用时进产物，其余页面逐字节不变。
 *
 *  `charts: true` 恒开：本票三张页都可能带图表块（24h 色带），骨架里留 `<!--CHARTS-HELPERS-->` 位；
 *  图表 CSS 由其运行时注入（与公共层同口径）。
 */
import { renderDocShell } from 'base-paint/docShell';
import { renderPageShell } from 'base-paint/blocks';
import { pageShapeCss, pageUiCss } from 'base-paint';
import { pagePartsCss } from './pageParts.js';

const LF = String.fromCharCode(10);

/** 页头四件（`docTitle` 进 `<title>`，其余三件进页壳）。 */
export interface PageHead {
  readonly docTitle: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
}

/** 整页装配入参。 */
export interface DocPageInput {
  readonly head: PageHead;
  /** 已组合好的区块 HTML（受信透传，与公共层 `renderPageShell` 的 `content` 同口径）。 */
  readonly content: string;
}

/** 区块 HTML ＋ 页头 → 完整文档。一页只调一次。 */
export function assembleDocPage(input: DocPageInput): string {
  return renderDocShell({
    docTitle: input.head.docTitle,
    bodyHtml: renderPageShell({
      eyebrow: input.head.eyebrow,
      title: input.head.title,
      subtitle: input.head.subtitle,
      content: input.content,
    }),
    extraCss: pageUiCss() + LF + pageShapeCss() + LF + pagePartsCss(),
    charts: true,
    pageUi: true,
  });
}
