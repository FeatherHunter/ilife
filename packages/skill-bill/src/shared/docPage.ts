/** 整页装配共用件：区块 HTML 拼成完整文档（最后一公里）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/receipt.ts`——结果型回执整页；
 *   ② `src/record/collect.ts`——过程型采集页。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，出来的是同一套采集页／回执页／复制区）。
 *
 * 包裹约定（沿卡路里同件的 `docPage.ts`，不新增）：
 *   内容＝`base-paint/blocks` 的区块；文档＝`fillTemplate` 包裹（资产**裸文本**传入＋由填充器包裹）；
 *   `sharedCss = buildStyleSheet().css + blocksCss()`——**`blocksCss()` 必须拼进 `TemplateAssets.sharedCssText`**，
 *   不得走 `StyleSheetInput.extraCss`（硬口径，见 `docs/skills/skill-bill/t406-base组件总表.md` 第 1.1 节 `blocksCss` 行）。
 * 本文件不做取数、不装命令名与领域常量，只按参数拼页；零包内依赖（只 import `base-paint`）。
 */
import { blocksCss, renderPageShell } from 'base-paint/blocks';
import { buildSharedHelpersJs, buildStyleSheet, fillTemplate } from 'base-paint';

/** 整页装配的入参。 */
interface DocPageInput {
  /** head 的 `<title>` 文本。 */
  readonly docTitle: string;
  /** 正文标题（页面模板的 H1）。 */
  readonly title: string;
  /** 正文眉标（空串＝不写这一行）。 */
  readonly eyebrow: string;
  /** 正文副标题（空串＝不写这一行）。 */
  readonly subtitle: string;
  /** 已组合好的区块 HTML。 */
  readonly content: string;
}

/** 整页模板（裸标记＋CONTENT 槽；`wrap ilife-page` 兼容既有 `--html` 断言）。
 *  标记不得预包裹：资产由 `fillTemplate` 按 `ASSET_WRAPPERS` 自己包。 */
function docShell(docTitle: string): string {
  return '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>' + docTitle + '</title>\n<!--SHARED-CSS-->\n</head>\n<body>\n'
    + '<div class="wrap ilife-page">\n<!--CONTENT-->\n</div>\n<!--SHARED-HELPERS-->\n'
    + '</body>\n</html>';
}

/** 整页装配：区块 HTML ＋ 标题三件套 → 完整文档。 */
export function assembleDocPage(input: DocPageInput): string {
  const assets = {
    sharedCssText: buildStyleSheet().css + '\n' + blocksCss(),
    sharedHelpersJs: buildSharedHelpersJs(),
  };
  const body = renderPageShell({
    title: input.title,
    ...(input.eyebrow ? { eyebrow: input.eyebrow } : {}),
    ...(input.subtitle ? { subtitle: input.subtitle } : {}),
    content: input.content,
  });
  return fillTemplate({ template: docShell(input.docTitle), assets, content: body }).html;
}
