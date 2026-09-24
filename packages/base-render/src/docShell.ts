/** 文档骨架件：**整页装配的最后一层**——拼出完整 HTML 文档里不可变的那一圈。
 *
 * 它管什么：`<!doctype html>` 起、`</html>` 止的骨架（head 的 charset／viewport／`<title>`／样式槽、
 *   正文槽、两个 helpers 槽与图表资源位）与**资产拼接**这一条口径
 *   （`buildStyleSheet().css + '\n' + blocksCss() + ('\n' + extraCss)`，helpers 两份按位挂）。
 * 它**不知道**：这是哪个技能、哪一页、页头长什么样、页里有哪些块——那些归调用方（各技能的页头件）。
 *
 * 与 `helpShell.ts`（帮助页的壳）同族同构：`*Shell.ts` ＝某类文档的壳，**一个文件对外只一个名字**。
 *
 * **本件不写任何技能名／域名**（票 #725 判据 4：公共层零领域词）——出处指针（规格件与两侧调用件）
 * 落在本票的证据件里，件内只留机制口径。调用方＝两侧技能各自那份 `docPage.ts`：它们保留自己的
 * 页头语义与字段，拼好正文后把文档壳交给本件。
 *
 * 为什么这两位必须住本件：它们改的几处（`viewport` 串／版面根类／doctype 写法）**都在本件的骨架里**，
 *   而调用方要「保留全部入参字段」⇒ 得原样透到骨架。取值仍只由 `pageUi.ts` 的两个常量与下面那张
 *   `DOCTYPE_HTML5` 表定义，本件只引用。
 */
import { blocksCss } from './blocks.js';
import { buildChartsHelpersJs } from './charts.js';
import { buildEditableValueJs, editableValueCss } from './components/index.js';
import { buildSharedHelpersJs } from './controls.js';
import { PAGE_UI_CLASS, PAGE_UI_VIEWPORT } from './pageUi.js';
import { buildStyleSheet } from './style.js';
import { fillTemplate } from './template.js';

/** 文档版本声明（doctype）的两种写法：**本件是唯一书写位**，调用方只给名字、不给字面量。
 *
 *  为什么会有两种：两侧现状件逐字不同（一侧小写、一侧大写），且各自被自家断言钉死；而本件在
 *  「抽取既有骨架、产物逐字节不变」这条口径下落地 ⇒ 先把两位都收进本件，**统一写法是另一件事**
 *  （它要动产物，见本票证据件里登记的那条）。两种写法在 HTML5 里等价。 */
const DOCTYPE_HTML5 = { lower: '<!doctype html>', upper: '<!DOCTYPE html>' } as const;

/** 文档版本声明的大小写（缺省 `'lower'`）。 */
export type DocShellDoctypeCase = keyof typeof DOCTYPE_HTML5;

/** 文档骨架的入参。 */
export interface DocShellInput {
  /** head 的 `<title>` 文本。 */
  readonly docTitle: string;
  /** 正文（已拼好的整段 HTML，通常是一个 `<section>` 页壳）。 */
  readonly bodyHtml: string;
  /** 技能侧补丁样式（拼在 `buildStyleSheet().css + blocksCss()` 之后；空串＝不拼）。 */
  readonly extraCss: string;
  /** 要不要注入图表助手资源（并在骨架里留 `<!--CHARTS-HELPERS-->` 位）。 */
  readonly charts?: boolean;
  /** 页面级移动端配方：换 `viewport` 串 ＋ 版面根追加 `ilife-page-ui`
   *  （两处取值都来自 `pageUi.ts`；不给／给假 ⇒ 与不启用时逐字节相同）。 */
  readonly pageUi?: boolean;
  /** 文档版本声明的写法（缺省 `'lower'`，即 `<!doctype html>`）。 */
  readonly doctypeCase?: DocShellDoctypeCase;
  /** **组件层随页挂载**：为真时把用到的那几件组件的样式段拼进共享样式槽、运行时拼进共享 helpers 槽。
   *
   *  当前挂的是就地可编辑值（`editableValue`：`editableValueCss()` ＋ `buildEditableValueJs()`）；
   *  以后每加一件带样式的组件，在这里追加一段即可（**不加标记位、不改模板**——只往两个既有资产串尾巴上接）。
   *
   *  为什么是 opt-in 而不是默认带上：组件自带运行时（数 KB），只有用到它的页才该付这份字节；
   *  不给／给假 ⇒ 产物与不启用时**逐字节相同**（照 `charts`／`pageUi` 同一条口径）。 */
  readonly editableValue?: boolean;
}

/** 文档模板（裸标记 ＋ CONTENT 槽；标记不得预包裹，资产由 `fillTemplate` 按 `ASSET_WRAPPERS` 自己包）。
 *
 *  `pageUi` 只改两处、都在启用时才发生：viewport 串加 `viewport-fit=cover`
 *  （`env(safe-area-inset-*)` 在 iOS 上不写它恒取 0）＋版面根多一颗 `ilife-page-ui`。
 *  `charts` 只在启用时才多出 `<!--CHARTS-HELPERS-->` 那一行（位置与两侧现状件逐字一致）。 */
function docTemplate(docTitle: string, charts: boolean, pageUi: boolean, doctypeCase: DocShellDoctypeCase): string {
  const viewport = pageUi ? PAGE_UI_VIEWPORT : 'width=device-width,initial-scale=1';
  const wrapClass = 'wrap ilife-page' + (pageUi ? ' ' + PAGE_UI_CLASS : '');
  const chartsSlot = charts ? '<!--CHARTS-HELPERS-->\n' : '';
  return DOCTYPE_HTML5[doctypeCase] + '\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="' + viewport + '">\n'
    + '<title>' + docTitle + '</title>\n<!--SHARED-CSS-->\n</head>\n<body>\n'
    + '<div class="' + wrapClass + '">\n<!--CONTENT-->\n</div>\n<!--SHARED-HELPERS-->\n'
    + chartsSlot
    + '</body>\n</html>';
}

/** 整页装配：正文 HTML ＋ 技能补丁样式 → 完整文档。一页只调一次。
 *
 *  只认真真值：`charts`／`pageUi`／`editableValue` 不给或给假，产物与不启用时**逐字节相同**
 *  （照两侧现状件口径）；`doctypeCase` 只认 `'upper'`，其余（不给／给别的值）一律按缺省的 `'lower'`。 */
export function renderDocShell(input: DocShellInput): string {
  const charts = input.charts === true;
  const pageUi = input.pageUi === true;
  const editableValue = input.editableValue === true;
  const doctypeCase: DocShellDoctypeCase = input.doctypeCase === 'upper' ? 'upper' : 'lower';
  const assets: { sharedCssText: string; sharedHelpersJs: string; chartsHelpersJs?: string } = {
    sharedCssText: buildStyleSheet().css + '\n' + blocksCss()
      + (editableValue ? '\n' + editableValueCss() : '')
      + (input.extraCss ? '\n' + input.extraCss : ''),
    sharedHelpersJs: buildSharedHelpersJs() + (editableValue ? '\n' + buildEditableValueJs() : ''),
  };
  if (charts) assets.chartsHelpersJs = buildChartsHelpersJs();
  return fillTemplate({
    template: docTemplate(input.docTitle, charts, pageUi, doctypeCase),
    assets,
    content: input.bodyHtml,
  }).html;
}
