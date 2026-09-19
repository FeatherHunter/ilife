/** 整页装配共用件：区块 HTML 拼成完整文档（最后一公里）。
 *
 * 谁在用（两个能力，指名）：
 *   ① `src/write/`——写入域：结果型回执整页与过程型采集页；
 *   ② `src/query/`——查询域：通用查询列表页。
 *  两域走的都是 `./pageShell.ts` 那一层，本件是它下面的文档装配层。
 *
 * 包裹约定（沿卡路里同件的 `docPage.ts`，不新增）：
 *   内容＝`base-paint/blocks` 的区块；文档＝`fillTemplate` 包裹（资产**裸文本**传入＋由填充器包裹）；
 *   `sharedCss = buildStyleSheet().css + blocksCss()`——**`blocksCss()` 必须拼进 `TemplateAssets.sharedCssText`**，
 *   不得走 `StyleSheetInput.extraCss`（硬口径，见 `docs/skills/skill-bill/t406-base组件总表.md` 第 1.1 节 `blocksCss` 行）。
 * **#725 起「文档壳」那一圈（doctype／head 三槽位序／资产拼接）搬去公共层 `base-paint/docShell` 的
 *   `renderDocShell`**——本件只留自己的页头语义（下面五个字段）＋本包的三段补丁样式（走 `extraCss`），
 *   拼好正文后交给骨架件；五个字段与 `pageShell.ts` 的调用点一行未动。
 * 本文件不做取数、不装命令名与领域常量，只按参数拼页；零包内依赖（只 import `base-paint`）。
 *
 * **#728（写入域 32 页视觉整改）在本件改了三件事**：
 *   ① 打开公共层的**页面级配方** `pageUi`（#525）——安全区、44px 触摸区、≤640 单列与安全区内距、
 *      页内导航横滑、KPI 两格、iOS 惯性滚动、≥1001 版心与正文列、参数表单桌面两列，全在那一处；
 *   ② 补丁样式按「**样式随它的选择器**」重排：目标选择器由公共层产出的规则迁回公共层
 *      （口径行的字面色值、越出圆角闭集的 10px），本件只留**本包自己产出**的那几条；
 *   ③ 桌面端不再由本件给「一条宽度补丁」——版心与分栏归 `pageUi` 的 ⑧ 段，本件只留一条表格宽度收口。
 */
import { pageUiCss } from 'base-paint';
import { renderPageShell } from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';

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

/** 桌面端补丁（t407 根因整改二 D1；t728 收窄）。
 *
 *  t728 为什么收窄到只剩一条：改前本段还写着「内容列放宽到 1120px」与「卡片网格换大格」，
 *  那是**桌面端只有一条宽度补丁、没有版式**的来源（#728 诊断 R5：1200 以下没有专门版式；
 *  1120 的内容列里仍是单列长条，右侧一片空白）。现在版心（1280）与正文列（880）＋栅格＋
 *  宽屏表单两列都由公共层配方 `pageUi` 的 ⑧／⑪ 段出，本包不再各写一条宽度数字。
 *
 *  唯一留下的一条：公共层 `.ilife-block-data-table` 锁着 `max-width:680px` 居中，880 正文列下
 *  右约 100px 留白（t403 视觉验收 D1 的同一处）；那个选择器由公共层产出、但**只在本包这两域**
 *  需要放开（公共层自己在别的调用点仍要 680 的窄表），故按「样式随它的选择器」的例外档留在这里，
 *  并且**只写选择器与属性、零字面色值、零新断点**（1200 是仓内既有值）。 */
const DESKTOP_CSS = [
  '/* t728：桌面端表格用满正文列（只 1200px 以上生效，手机端不动） */',
  '@media (min-width:1200px) {',
  '  .ilife-block-page-shell .ilife-block-data-table { max-width: none; }',
  '}',
  '/* t728 逐页审计实测：公共层配方 ⑧ 的「宽件满铺」那条写的是',
  '   `.ilife-block-page-shell-body > :where(读数卡网格／表／图／…){ grid-column: 1 / -1 }`，',
  '   而本包的 DOM 是 `page-shell-body > section.ilife-write > section#sec-kpi > div.读数卡网格`',
  '   ——宽件隔着 `section.ilife-write` 这一层，成了**孙级**，`>` 一个都匹配不到 ⇒',
  '   全部落回「中间 880 列」，1280 档两翼逐点扫描非背景像素 0 行（内容墨迹最外沿 x174–1105）。',
  '   修法：让这层纯分组的包裹节从布局里退场（`display: contents`），宽件重新成为栅格项。',
  '   它挂在**本包产出的选择器**上（`.ilife-write` 由 `src/shared/writeParts.ts` 出），',
  '   所以按「样式随它的选择器」住本件，公共层不认这个类名。 */',
  '@media (min-width: 1001px) {',
  '  .ilife-block-page-shell-body > .ilife-write { display: contents; }',
  '}',
].join('\n');

/** 手机端黑底说明块补丁（t407 第 3 轮返工 B；与上面 D1 同一处、同一条路）。
 *
 *  块是 `base-paint` 的 `renderToast` 那一条（`.ilife-toast`）：左栏标题（「…标签流转：这一笔打…」，
 *  窄栏里折成两到三行）＋ 右栏标签胶囊（永远一行）。实测毛病两处：
 *    ① 两栏不等高——标题折了行、胶囊只有一行，整条横幅一边高一边矮（评审判「栏高不齐把整页拖重」）；
 *    ② 行距偏紧——标题行贴着下面那几行说明，只隔 2px。
 *  只动呈现：两栏拉到同高（`stretch` ＋ 胶囊内的字居中对齐）、标题与说明的行距统一到 1.5 以上、
 *  标题行与说明之间留 6px。文字、块序、复制载荷一处不动。
 *  t728：圆角从 `10px` 收到**闭集里的 `999px`**（`{8,14,20,999}` 之外的值是 R4 那类「同一语义多名值」；
 *  这是一枚标签胶囊，999 与全仓胶囊同一档）。 */
const TOAST_CSS = [
  '/* t407-r3 B：黑底说明块（.ilife-toast）两栏等高＋行距 */',
  '.ilife-toast { line-height: 1.5; }',
  '.ilife-toast-title-row { flex-wrap: nowrap; align-items: stretch; margin-bottom: 6px; }',
  '.ilife-toast-title-row > .ilife-toast-title { flex: 1 1 auto; min-width: 0; margin-bottom: 0; line-height: 1.5; }',
  '.ilife-toast-title-row > .ilife-toast-chip { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; }',
  '.ilife-toast-lines { line-height: 1.6; }',
].join('\n');

/** 查询详情移动版式（t403-P2：只 640px 以下生效，桌面端不动）。
 *
 *  为什么落在本件：详情字段表（字段／值两列）在窄屏行卡化时会逐行重复表头标签
 *  （t403 视觉验收 D2）；`renderDataTable` 的 `data-label` 恒取列头、无逐行标签选项，
 *  唯一的落点就是本件交 `extraCss` 的这一处（与上面 DESKTOP／TOAST 同一条路）。
 *  桌面端（≥641px）只见表格、移动端（≤640px）只见键值列表——两者由 `display` 切换，
 *  每端恰出一套（读屏器同 CSS 一起切，不存在两套同读）；打印走桌面那一套。
 *  t728：分隔线由字面色值 `rgba(210, 210, 215, .6)` 换成 token `var(--line)`——
 *  判据 1 改口径后要求「补丁零字面色值」；同一个值在公共层已有一处定义（`LINE_RGB`），
 *  本包不再抄第二份。 */
const KV_CSS = [
  '/* t403-P2：详情键值列表（桌面藏，移动端替表格） */',
  '.ilife-query-kv-list { display: none; }',
  '@media (max-width:640px) {',
  '  .ilife-query-kv-table { display: none; }',
  '  .ilife-query-kv-list { display: block; margin: 16px 0; border: 1px solid var(--line); border-radius: 14px; background: var(--card); }',
  '  .ilife-query-kv-list > div { display: flex; align-items: baseline; justify-content: space-between; gap: 2px 10px; padding: 8px 12px; border-top: 1px solid var(--line); }',
  '  .ilife-query-kv-list > div:first-child { border-top: 0; }',
  '  .ilife-query-kv-list dt { flex: none; color: var(--fg3); font-size: 11.5px; font-weight: 600; }',
  '  .ilife-query-kv-list dd { margin: 0; color: var(--fg); font-size: 12px; text-align: right; overflow-wrap: anywhere; }',
  '}',
].join('\n');

/** 退出口单钮独占整行（t410 终审 n20：撤销页「撤销这一笔」在 390 下实测 175px 半宽）。
 *
 *  根因在公共层（`base-render` 的 `.ilife-action-row` 恒两列，单钮只占半格），落点只能是本件
 *  交 `extraCss` 的这一处（与上面 DESKTOP／TOAST／KV 同一条路）。只收退出口那一格
 *  （`copyArea.ts` 的 `undoExit`，动作号 `ilife-exit-undo`）：该格恒只有一颗红钮，
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

/** 整页装配：区块 HTML ＋ 标题三件套 → 完整文档（文档壳交公共层骨架件）。
 *
 *  `pageUi: true` —— 本包 32 页走公共层页面级配方（#525）；配套的样式段由本件拼进 `extraCss`
 *  （与卡路里同一条路：配方 CSS 走 `extraCss`，`blocksCss()` 仍走 `sharedCssText`）。
 *  产出物有 `.ilife-page-ui` 根类与 `viewport-fit=cover` 两处可见证据，判据 9 的量测就量这两处。 */
export function assembleDocPage(input: DocPageInput): string {
  const body = renderPageShell({
    title: input.title,
    ...(input.eyebrow ? { eyebrow: input.eyebrow } : {}),
    ...(input.subtitle ? { subtitle: input.subtitle } : {}),
    content: input.content,
  });
  return renderDocShell({
    docTitle: input.docTitle,
    bodyHtml: body,
    extraCss: [DESKTOP_CSS, TOAST_CSS, KV_CSS, EXIT_CSS, pageUiCss()].join('\n'),
    doctypeCase: 'upper',
    pageUi: true,
  });
}
