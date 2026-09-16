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
  /* t403-P1：桌面端数据表与内容列同宽（只 1200px 以上生效，手机端不动）。
   *  为什么落在本件：公共层 `base-paint` 的 `.ilife-block-data-table` 锁 `max-width:680px` 居中，
   *  1120 版心下右约 40% 留白、密集页被迫折行（t403 视觉验收 D1）；base 包只建议不动，唯一的落点
   *  就是本件拼 `sharedCssText` 的这一处（与上面 D1 同一条路）。查询域列表／详情与写入域回执
   *  同走本件，两域的表同宽；`≤640px` 行卡化那档一行不动。 */
  '  .ilife-block-page-shell .ilife-block-data-table { max-width: none; }',
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

/** 查询详情移动版式（t403-P2：只 640px 以下生效，桌面端不动）。
 *
 *  为什么落在本件：详情字段表（字段／值两列）在窄屏行卡化时会逐行重复表头标签
 *  （t403 视觉验收 D2）；`renderDataTable` 的 `data-label` 恒取列头、无逐行标签选项，
 *  base 包只建议不动；本页 body 后也不加样式块（机审「本页样式块／内联样式」两列要保持 0），
 *  唯一的落点就是本件拼 `sharedCssText` 的这一处（与上面 D1／TOAST 同一条路）。
 *  桌面端（≥641px）只见表格、移动端（≤640px）只见键值列表——两者由 `display` 切换，
 *  每端恰出一套（读屏器同 CSS 一起切，不存在两套同读）；打印走桌面那一套。 */
const KV_CSS = [
  '/* t403-P2：详情键值列表（桌面藏，移动端替表格） */',
  '.ilife-query-kv-list { display: none; }',
  '@media (max-width:640px) {',
  '  .ilife-query-kv-table { display: none; }',
  '  .ilife-query-kv-list { display: block; margin: 16px 0; border: 1px solid var(--line); border-radius: 14px; background: var(--card); }',
  '  .ilife-query-kv-list > div { display: flex; align-items: baseline; justify-content: space-between; gap: 2px 10px; padding: 8px 12px; border-top: 1px solid rgba(210, 210, 215, .6); }',
  '  .ilife-query-kv-list > div:first-child { border-top: 0; }',
  '  .ilife-query-kv-list dt { flex: none; color: var(--fg3); font-size: 11.5px; font-weight: 600; }',
  '  .ilife-query-kv-list dd { margin: 0; color: var(--fg); font-size: 12px; text-align: right; overflow-wrap: anywhere; }',
  '}',
].join('\n');

/** 退出口单钮独占整行（t410 终审 n20：撤销页「撤销这一笔」在 390 下实测 175px 半宽）。
 *
 *  根因在公共层（`base-render` 的 `.ilife-action-row` 恒两列，单钮只占半格），本包不许动公共层
 *  （#567 在途），落点只能是本件拼 `sharedCssText` 的这一处（与上面 D1／TOAST／KV 同一条路）。
 *  只收退出口那一格（`copyArea.ts` 的 `undoExit`，动作号 `ilife-exit-undo`）：该格恒只有一颗红钮，
 *  把它所在行的列改成单列；页上别的动作行（两颗复制按钮平分的那种）一行不动。桌面端同形
 *  （危险动作独占一行，本就是层级所需）。`:has` 不支持时回退到半宽，不比改前差。 */
const EXIT_CSS = [
  '/* t410：退出口单钮独占整行（只收 ilife-exit-undo 这一格） */',
  '.ilife-block-copy-block:has([data-action-id="ilife-exit-undo"]) .ilife-action-row {',
  '  grid-template-columns: 1fr;',
  '}',
  '.ilife-block-copy-block:has([data-action-id="ilife-exit-undo"]) .ilife-action-btn {',
  '  width: 100%;',
  '}',
].join('\n');

/** 整页装配：区块 HTML ＋ 标题三件套 → 完整文档。 */
export function assembleDocPage(input: DocPageInput): string {
  const assets = {
    sharedCssText: buildStyleSheet().css + '\n' + blocksCss() + '\n' + DESKTOP_CSS + '\n' + TOAST_CSS + '\n' + KV_CSS + '\n' + EXIT_CSS,
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
