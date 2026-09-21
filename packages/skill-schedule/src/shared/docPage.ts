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

/** 本页的**宽度口径**（人裁，2026-09-21 复看时圈定）：**桌面端正文一律收在中间那一列**。
 *
 *  公共层 `pageUi` ⑧ 条在 ≥1001px 把「真二维数据」那几块（读数卡／数据表／图表块／详情区／列表行）
 *  放满壳宽（`grid-column: 1 / -1`），文字类留在中列 880px —— 那是卡路里那一族的节奏。
 *  作息这三张页人裁的是**单一内容列**：页头、矩阵、分类总览、每日汇总、复制区同宽，
 *  读数卡与每日汇总**不许左右各凸出一截**（用户复看时把「中列那一带」圈成好显示区域，
 *  卡片左右各凸出约 180／270px 被否掉）。
 *
 *  权重与 `pageUi` ⑧ 条**同权**（同为 `.ilife-page-ui` ＋ 两颗类名），靠本段排在 `pageUiCss` 之后取胜；
 *  断点用仓内既有值 **1001**，不新造。**窄屏不受影响**（人复看留言：手机端现样就很好）。 */
const BODY_SINGLE_COLUMN_CSS = [
  '@media (min-width: 1001px) {',
  '  .ilife-page-ui .ilife-block-page-shell-body > * {',
  '    grid-column: 2;',
  '  }',
  '}',
].join(LF);

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
  /** **域级样式补丁**（#783 的接缝，可选）：只给「本域自己的页内自造件」用（类名自带域前缀，
   *  不碰 `.ilife-block-*` 与页壳）。不给／给空串＝与加这一位之前**逐字节相同**（下面那半个 `LF` 只在
   *  真给了补丁时才拼）。为什么要有这一位：共用位（本件）不是各域的样式收容所，可各域又确实有
   *  「公共层给不出、只有本域在用」的件（见 `src/write/writeParts.ts` 的件头），补丁得有入口。
   *  排在 `pagePartsCss()` 之后、桌面单列配方之前——域补丁压不了页级配方。 */
  readonly extraCss?: string;
}

/** 区块 HTML ＋ 页头 → 完整文档。一页只调一次。 */
export function assembleDocPage(input: DocPageInput): string {
  const patch = input.extraCss !== undefined && input.extraCss !== '' ? LF + input.extraCss : '';
  return renderDocShell({
    docTitle: input.head.docTitle,
    bodyHtml: renderPageShell({
      eyebrow: input.head.eyebrow,
      title: input.head.title,
      subtitle: input.head.subtitle,
      content: input.content,
    }),
    extraCss: pageUiCss() + LF + pageShapeCss() + LF + pagePartsCss() + patch + LF + BODY_SINGLE_COLUMN_CSS,
    charts: true,
    pageUi: true,
  });
}
