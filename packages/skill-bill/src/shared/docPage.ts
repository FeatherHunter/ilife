/** 整页装配共用件：区块 HTML 拼成完整文档（最后一公里）。
 *
 * 谁在用（两个能力，指名）：
 *   ① `src/record/`——写入域：结果型回执整页与过程型采集页；
 *   ② `src/query/`——查询域：通用查询列表页。
 *  两域走的都是 `./pageShell.ts` 那一层，本件是它下面的文档装配层。
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
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>' + docTitle + '</title>\n<!--SHARED-CSS-->\n</head>\n<body>\n'
    + '<div class="wrap ilife-page">\n<!--CONTENT-->\n</div>\n<!--SHARED-HELPERS-->\n'
    + '</body>\n</html>';
}

/** 桌面端补丁（t407 根因整改二 D1：内容列用满宽＋卡片网格换大格，只改呈现）。
 *
 * 为什么落在本件：公共层样式（`base-paint`）不许动，本页 body 后也不加样式块
 * （机审「本页样式块／内联样式」两列要保持 0）；唯一的落点就是本件拼 `sharedCssText`
 * 的这一处——32 份产物走同一条代码路径，head 样式仍 32/32 同一份。
 * 只在 `@media (min-width:1200px)` 里生效：手机端（`≤640px` 两列那档）一行不动，
 * 复量不得回退（见证据件）。 */
const DESKTOP_CSS = [
  '/* t407-D1：桌面端内容列与卡片网格（只 1200px 以上生效，手机端不动） */',
  '@media (min-width:1200px) {',
  '  .ilife-block-page-shell { max-width: 1120px; }',
  '  .ilife-block-page-shell .ilife-block-kpi-card-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }',
  '}',
].join('\n');

/** 手机端黑底说明块补丁（t407 第 3 轮返工 B；与上面 D1 同一处、同一条路）。
 *
 *  块是 `base-paint` 的 `renderToast` 那一条（`.ilife-toast`）：左栏标题（「…标签流转：这一笔打…」，
 *  窄栏里折成两到三行）＋ 右栏标签胶囊（永远一行）。实测毛病两处：
 *    ① 两栏不等高——标题折了行、胶囊只有一行，整条横幅一边高一边矮（评审判「栏高不齐把整页拖重」）；
 *    ② 行距偏紧——标题行贴着下面那几行说明，只隔 2px。
 *  只动呈现：两栏拉到同高（`stretch` ＋ 胶囊内的字居中对齐）、标题与说明的行距统一到 1.5 以上、
 *  标题行与说明之间留 6px。文字、块序、复制载荷一处不动；公共层样式仍不许动，落点仍只在本件。 */
const TOAST_CSS = [
  '/* t407-r3 B：黑底说明块（.ilife-toast）两栏等高＋行距 */',
  '.ilife-toast { line-height: 1.5; }',
  '.ilife-toast-title-row { flex-wrap: nowrap; align-items: stretch; margin-bottom: 6px; }',
  '.ilife-toast-title-row > .ilife-toast-title { flex: 1 1 auto; min-width: 0; margin-bottom: 0; line-height: 1.5; }',
  '.ilife-toast-title-row > .ilife-toast-chip { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; }',
  '.ilife-toast-lines { line-height: 1.6; }',
].join('\n');

/** 整页装配：区块 HTML ＋ 标题三件套 → 完整文档。 */
export function assembleDocPage(input: DocPageInput): string {
  const assets = {
    sharedCssText: buildStyleSheet().css + '\n' + blocksCss() + '\n' + DESKTOP_CSS + '\n' + TOAST_CSS,
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
