/** #873 第三轮 · 私家大厨的**页壳装配件**：10 个域页壳共用的那一次整页装配。
 *
 * 为什么要有这一件：两轮下来 48 页的样式入口虽然统一到了 `chefSceneCss()`，但**整页装配**仍是
 * 每域各拼一遍（`renderPageShell` 产版面根，`renderDocShell` 包文档壳，各自再拼 `extraCss`）。
 * 第三轮要加的两件东西都带**标记**（族级装饰带）或**族级样式**（首屏填满度）——散在 10 处拼就会
 * 第二次走散。收成一件之后，「这一页属于哪个族、带哪条装饰带、带哪段族级样式」只有这一个落点。
 *
 * 入参取的槽位与各域原来的 `renderDocShell({ docTitle, bodyHtml, extraCss, pageUi: true })` 逐项同形，
 * 只多一个 `family`：各域的页壳调用因此仍是**一次调用替换**，各域自己的 `renderPageShell(...)`
 * 与页内那段样式**一字不动**。
 *
 * 装配顺序（各域那一段页内样式仍**追加在最后**）：
 *   `chefSceneCss()`（公共层两配方 ＋ 第一轮皮肤）
 *   ＋ `sceneBandCss()`（装饰带的壳）
 *   ＋ `sceneFamilyCss(family)`（色彩锚点密度，回执族另加首屏填满度）
 *   ＋ 调用方给的 `extraCss`
 *
 * 装饰带插在**版面根的第一个子节点**（页头眉标之前）：它是品牌横带，占的是页头那一格，
 * 不与页内任何区块抢位置。插法是字符串级的——版面根的开启标签由 `renderPageShell` 产出，
 * 这里只在它之后插一段；找不到开启标签就退回「放在版面根之前」（不静默丢标记）。
 */
import { renderDocShell } from 'base-paint/docShell';
import { renderSceneBand, sceneBandCss, type SceneFamily } from './sceneBand.js';
import { sceneFamilyCss } from './sceneRhythm.js';
import { chefSceneCss } from './skin.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 整页装配的入参（除 `family` 外与各域原来的 `renderDocShell` 调用逐项同形）。 */
export interface SceneShellInput {
  /** 这一页属于哪个页族（按域给一个值；三族见 `sceneBand.ts`）。 */
  readonly family: SceneFamily;
  /** head 的 `<title>` 文本。 */
  readonly docTitle: string;
  /** 已装配好的版面根（各域 `renderPageShell(...)` 的产出，受信透传）。 */
  readonly bodyHtml: string;
  /** 各域自己的页内版式样式：**一字不动地接在族级样式之后**（不传／空串＝不追加）。 */
  readonly extraCss?: string;
  /** 要不要注入图表助手资源（不给＝不注入，与 `renderDocShell` 同口径）。 */
  readonly charts?: boolean;
}

/** 整页装配（装饰带 ＋ 族级样式 ＋ 文档壳）。一页只调一次。 */
export function renderSceneShell(input: SceneShellInput): string {
  const band = renderSceneBand(input.family);
  const open = input.bodyHtml.indexOf('>');
  const bodyHtml = open < 0 || !input.bodyHtml.startsWith('<')
    ? band + input.bodyHtml
    : input.bodyHtml.slice(0, open + 1) + band + input.bodyHtml.slice(open + 1);
  const extra = input.extraCss === undefined || input.extraCss === ''
    ? ''
    : LF + input.extraCss;
  return renderDocShell({
    docTitle: input.docTitle,
    bodyHtml,
    extraCss: chefSceneCss() + LF + sceneBandCss() + LF + sceneFamilyCss(input.family) + extra,
    pageUi: true,
    charts: input.charts === true,
  });
}
