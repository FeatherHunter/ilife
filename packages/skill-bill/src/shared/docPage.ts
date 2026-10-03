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
import { escapeHtml, pageUiCss } from 'base-paint';
import { renderPageShell, sheetCss, skinClass, skinCss } from 'base-paint/blocks';
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
  '   `.ilife-block-page-shell-body > :where(读数卡网格／表／图／…) { grid-column: 1 / -1 }`，',
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

/** 退出口单钮独占整行（t410 终审 n20）——**#733 起已撤，本段整体删掉，理由是它成了死 CSS**。
 *
 *  t410 当时落这条：`copyArea` 的退出口恒只有一颗红钮，而公共层 `.ilife-action-row` 恒两列，
 *  单钮只占半格（390 下实测 175px），故用 `:has([data-action-id="ilife-exit-undo"])` 把它收成单列。
 *  #733 把退出口那颗**点了没反应的红钮**换成一枚非交互的 danger 标记（`copyArea.undoExit` 的注释里有完整推导）⇒
 *  `ilife-exit-undo` 这个动作号在产物里**一次都不再出现**，本段的两个选择器一条也命中不到。
 *  留着的代价不是零：它会被 grep 进「页上还有没有这个动作号」这类判据，读的人会以为按钮还在。
 *  一并删掉——**删的是失效的补丁，不是那条版面意图**（那颗钮已经不存在了）。 */

/** #993 票据纸两页（原型 `bill-993-proto-receipt-7222-v5.html` 与 `…-detail-7222-v7.html`）
 *  的**页面家具样式**：桌、店头、虚线分隔、段标题、主数字块、明细卡、按钮。
 *  （纸外页脚：回执两页按用户要求不出；查询域详情页按 w17 v2.1 出一行静态脚注，
 *  见上 `.ilife-ticket-foot`，两页互不命中。）
 *
 *  为什么住本件：这些选择器全部由本包产出（`assembleSheetPage` 的族根类 ＋ `sheetHead`／
 *  `ticketRule`／`ticketSection`／`ticketSummary`／`ticketActions` 这几个产出器），
 *  按「样式随它的选择器」的仓规，样式与产出器同住一件。
 *
 *  取值口径（三条，逐条可查原型）：
 *    ① 颜色／圆角／投影一律读皮肤 token（`--ilife-*`）——原型里那些字面色值不抄第二份；
 *       皮肤 `ticket` 对原型的三处偏离（次要文字压深、danger 压深、`accent-soft` 重取）见
 *       `packages/base-render/src/components/skin/skins/ticket.ts` 件头，本件照皮肤走。
 *    ② 少数公共层**组件选择器**的覆盖（`.ilife-block-summary-head.is-ticket` 的内距、
 *       `.ilife-block-ledger-row` 的 44px 行高、`.ilife-copy-btn` 那一族的按钮形状）是
 *       **页面级几何**：原型把这几处的盒模型钉死，公共层的票据纸版式只管到"形态"这一层。
 *       它们只在本族根类之下生效，别的页零命中。
 *    ③ 断点只用仓内既有值（400）；原型里那个 390 档照 400 档落。 */
const TICKET_CSS = [
  '/* #993 桌：暖奶油底＋居中一列（原型 `body` 那一层；底色的两处浅深用 token 混出，不抄字面色）。 */',
  '.ilife-bill-sheet-page {',
  '  box-sizing: border-box;',
  '  width: 100%;',
  '  min-height: 100vh;',
  '  padding: 28px 14px 48px;',
  '  display: flex;',
  '  flex-direction: column;',
  '  align-items: center;',
  '  background: radial-gradient(1200px 600px at 50% -10%,',
  '    color-mix(in srgb, var(--ilife-surface) 70%, var(--ilife-ground)) 0%,',
  '    var(--ilife-ground) 55%,',
  '    color-mix(in srgb, var(--ilife-ground) 96%, var(--ilife-accent)) 100%);',
  '  color: var(--ilife-ink);',
  '  font-family: var(--ilife-font);',
  '  line-height: normal;',
  '  -webkit-font-smoothing: antialiased;',
  '}',
  '/* 纸宽（原型 `.page` 的 440px 版心；桌的内距由上面那条给）。 */',
  '.ilife-bill-sheet-page > section { width: 100%; max-width: 440px; }',
  '/* 原型 `*{box-sizing:border-box}` 的作用域版：只在本族根类之下（其余 29 页零命中）。 */',
  '.ilife-bill-sheet-page *,',
  '.ilife-bill-sheet-page *::before,',
  '.ilife-bill-sheet-page *::after { box-sizing: border-box; }',
  '/* 店头（原型 `.shop-head`）：品牌行＋结论标题，居中；改动值那一段走危险档（原型 `.hl`）。 */',
  '.ilife-sheet-head { text-align: center; padding: 2px 0 0; }',
  '.ilife-sheet-eyebrow { margin: 0; font-size: 11.5px; letter-spacing: 2px; color: var(--ilife-ink-2); font-weight: 700; }',
  '.ilife-sheet-title { margin: 8px 0 0; font-size: 19px; line-height: 1.4; letter-spacing: .2px; font-weight: 800; color: var(--ilife-ink); }',
  '.ilife-sheet-title .hl { color: var(--ilife-danger); }',
  '/* 店头副题（原型 `.shop-sub`）：只查询域详情页出（`sheetHead` 第三参），回执两页零命中。 */',
  '.ilife-sheet-sub { margin: 8px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--ilife-ink-2); text-align: center; }',
  '/* 虚线分隔（原型 `hr.dashed`）：2px 虚线、左右各探出 8px。 */',
  '.ilife-ticket-rule { border: 0; border-top: 2px dashed var(--ilife-line); margin: 14px -8px; }',
  '/* 段（原型 `.sec`）＋ 段标题（4px 主色条 ＋ 右对齐英文标）。 */',
  '.ilife-ticket-sec { padding: 2px 0 6px; }',
  '.ilife-ticket-sec-heading { display: flex; align-items: center; gap: 8px; margin: 4px 0 10px; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; color: var(--ilife-ink-2); }',
  '.ilife-ticket-sec-heading::before { content: ""; width: 4px; height: 14px; border-radius: 4px; background: var(--ilife-accent); }',
  '.ilife-ticket-sec-no { margin-left: auto; font-weight: 700; color: var(--ilife-ink-3); letter-spacing: 0; }',
  '/* 主数字块（原型 `.summary-head`）：整块居中，下留 16px；印章钉右上角并微斜（公共层票据纸版式给形，',
  '   这里补齐原型的三处几何：内距 6px、脚行不占位（印章是绝对定位的，脚行只剩一枚空槽）、',
  '   下面那两行小字居中）。 */',
  '.ilife-ticket-summary { padding: 0 0 16px; text-align: center; }',
  '.ilife-ticket-summary .ilife-block-summary-head.is-ticket { padding: 6px 0 0; }',
  '.ilife-ticket-summary .ilife-block-summary-head.is-ticket .ilife-block-summary-head-foot { margin-top: 0; }',
  '/* 没有脚行小字时，那一枚空槽不占版面（印章是绝对定位的，仍钉在右上角）。 */',
  '.ilife-ticket-summary .ilife-block-summary-head.is-ticket .ilife-block-summary-head-foot > span:empty { display: none; }',
  '.ilife-ticket-summary .ilife-block-summary-head.is-ticket .ilife-block-summary-head-stamp { font-weight: 900; opacity: .92; }',
  '/* 眉标药丸：字距照原型 2px（公共层票据纸版式取的是 .12em，12px 下 1.44px）。 */',
  '.ilife-ticket-summary .ilife-block-summary-head.is-ticket .ilife-block-summary-head-eyebrow { letter-spacing: 2px; }',
  '.ilife-ticket-summary-note { margin: 10px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--ilife-ink-2); }',
  '.ilife-ticket-summary-note b { color: var(--ilife-ink); }',
  '.ilife-ticket-summary-time { margin: 6px 0 0; font-size: 13.5px; line-height: 15px; color: var(--ilife-ink-2); }',
  '/* 账目行：详情页那几行照原型抬到 44px 触摸档（回执页 4 行是 9px 行距、不抬）；',
  '   两页的值列行高在原型里也不同：详情 1.55（可折行）、回执 1.4（单行紧排）。 */',
  '.ilife-ticket-detail .ilife-block-ledger-rows.is-ticket .ilife-block-ledger-row { min-height: 44px; }',
  '.ilife-ticket-receipt .ilife-block-ledger-rows.is-ticket .ilife-block-ledger-row-value { line-height: 1.4; font-variant-numeric: normal; }',
  '/* 回执行间那条**看不见的** 1px 上边线：原型写的就是 `1px dotted transparent`（不画线，只占 1px 行高），',
  '   不补它整块矮 3px、下面的段落跟着上移。 */',
  '.ilife-ticket-receipt .ilife-block-ledger-rows.is-ticket .ilife-block-ledger-row + .ilife-block-ledger-row { border-top: 1px dotted transparent; }',
  '/* 落点状态行（w17 v2.1）：原型即纯文本、无胶囊，详情页不再发出 `.is-status` 行，',
  '   下面两条状态胶囊样式随之删除（回执两页从未用过，删后零命中、不留死代码）。 */',
  '/* 对账卡（w17 v2.1 CHECK 行）：浅绿卡＋圆点＋一行字；已撤销走危险档。只详情页发出。 */',
  '.ilife-ticket-check { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 10px 13px; border-radius: var(--ilife-radius-sm); background: var(--ilife-ok-soft); color: var(--ilife-ink); font-size: 13px; font-weight: 700; line-height: 1.6; }',
  '.ilife-ticket-check-dot { flex: none; width: 8px; height: 8px; border-radius: 999px; background: var(--ilife-ok); }',
  '.ilife-ticket-check.is-danger { background: var(--ilife-danger-soft); }',
  '.ilife-ticket-check.is-danger .ilife-ticket-check-dot { background: var(--ilife-danger); }',
  '/* 纸外脚注（w17 v2.1 foot-note）：纸外、页内居中一行小字；只详情页发出。 */',
  '.ilife-bill-sheet-page .ilife-ticket-foot { margin: 10px 0 0; font-size: 12px; line-height: 1.6; color: var(--ilife-ink-3); text-align: center; }',
  '/* 明细卡（原型 `.entry-card`／`.entry-rows`）：米黄卡 ＋ 编号胶囊 ＋ 实付行高亮。 */',
  '.ilife-ticket-card { background: var(--ilife-surface-2); border: 1px solid var(--ilife-line); border-radius: var(--ilife-radius-sm); padding: 12px 13px 11px; }',
  '.ilife-ticket-entries { list-style: none; margin: 0; padding: 0; counter-reset: ilife-ticket-row; }',
  '.ilife-ticket-entries > li { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px dotted var(--ilife-line); font-size: 14px; min-height: 44px; line-height: 1.55; }',
  '.ilife-ticket-entries > li:last-child { border-bottom: 0; }',
  '.ilife-ticket-entries > li::before { counter-increment: ilife-ticket-row; content: counter(ilife-ticket-row); flex: 0 0 22px; height: 22px; margin-top: 1px; border: 1px solid var(--ilife-line); border-radius: var(--ilife-radius-sm); background: var(--ilife-surface-2); color: var(--ilife-ink-3); font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }',
  '.ilife-ticket-entry-text { flex: 1 1 auto; overflow-wrap: anywhere; word-break: break-all; }',
  '.ilife-ticket-entries > li.is-pay { margin: 8px 0; padding: 10px 12px; border: 1px solid var(--ilife-line); border-radius: var(--ilife-radius-sm); background: var(--ilife-surface); }',
  '.ilife-ticket-entries > li.is-pay .ilife-ticket-entry-text { font-size: 15px; font-weight: 800; }',
  '.ilife-ticket-entries > li.is-pay::before { background: var(--ilife-ink); border-color: var(--ilife-ink); color: var(--ilife-surface); }',
  '/* 次按钮那一族是公共层复制区的产物（`.ilife-copy-btn`），这里按原型 `.btn-secondary` 改形状：',
  '   整行宽、13px 圆角、白底暖边。高度钉 47px＝原型那一颗的**实测盒高**（它的标签里带着一个 `▾` 字符，',
  '   那一枚字形把行盒抬到 23px ⇒ 12+23+12）；本仓的三角由 CSS 画、行盒只有 21px ⇒ 不钉就矮 2px，',
  '   连带下面的裁切线与页脚各上移 2px。只在本族根类之下生效。 */',
  '.ilife-ticket-actions { padding: 14px 0 4px; }',
  '/* 退出口那一行口径（原型 `.caliber`：12px、行高 1.7、居中、左右各 2px）。 */',
  '.ilife-ticket-actions .ilife-block-caliber { margin: 10px 2px 0; line-height: 1.7; text-align: center; color: var(--ilife-ink-2); }',
  '.ilife-ticket-btn { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 48px; padding: 12px 14px; border: 0; border-radius: var(--ilife-radius-sm); font-family: inherit; font-size: 16px; font-weight: 800; letter-spacing: .5px; line-height: normal; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }',
  '.ilife-ticket-btn.is-primary { background: linear-gradient(180deg, color-mix(in srgb, var(--ilife-danger) 82%, var(--ilife-surface)) 0%, var(--ilife-danger) 100%); color: var(--ilife-surface); box-shadow: 0 8px 20px color-mix(in srgb, var(--ilife-danger) 28%, transparent), inset 0 1px 0 color-mix(in srgb, var(--ilife-surface) 25%, transparent); }',
  '.ilife-bill-sheet-page .ilife-block-copy-block { margin: 0; }',
  '.ilife-bill-sheet-page .ilife-action-bar { margin: 0; max-width: none; gap: 0; }',
  '.ilife-bill-sheet-page .ilife-action-row-ghost { display: flex; flex-direction: column; gap: 0; }',
  '.ilife-bill-sheet-page .ilife-copy-menu-wrap { width: 100%; margin-top: 10px; }',
  '.ilife-bill-sheet-page .ilife-copy-menu-wrap + .ilife-copy-btn { margin-top: 10px; }',
  '.ilife-bill-sheet-page .ilife-copy-btn { width: 100%; min-height: 47px; padding: 12px 14px; border: 1.5px solid var(--ilife-edge); border-radius: var(--ilife-radius-sm); background: var(--ilife-surface); color: var(--ilife-ink); font-size: 14.5px; font-weight: 800; letter-spacing: .5px; line-height: normal; }',
  '.ilife-bill-sheet-page .ilife-copy-btn.copied { border-color: var(--ilife-ok); background: var(--ilife-ok); color: var(--ilife-surface); }',
  '.ilife-bill-sheet-page .ilife-copy-menu { left: 0; right: 0; min-width: 0; max-width: none; padding: 6px; border: 1.5px solid var(--ilife-edge); border-radius: var(--ilife-radius-sm); background: var(--ilife-surface); box-shadow: var(--ilife-shadow-pop); }',
  '.ilife-bill-sheet-page .ilife-copy-menu-item { min-height: 44px; padding: 10px 12px; border-radius: var(--ilife-radius-sm); font-size: 13.5px; font-weight: 700; color: var(--ilife-ink); }',
  '.ilife-bill-sheet-page .ilife-copy-menu-item > .ilife-copy-menu-label { font-size: 13.5px; font-weight: 700; color: var(--ilife-ink); }',
  '.ilife-bill-sheet-page .ilife-copy-menu-item > .ilife-copy-menu-hint { font-size: 11.5px; font-weight: 600; color: var(--ilife-ink-2); }',
  '/* 窄档（原型 390 档；仓内既有断点取 400）：桌内距与纸内距收一档、主数字收一档。 */',
  '@media (max-width: 400px) {',
  '  .ilife-bill-sheet-page { padding: 18px 10px 36px; }',
  '  .ilife-bill-sheet-page .ilife-block-sheet.is-ticket { padding: 18px 22px 8px; }',
  '  .ilife-ticket-summary .ilife-block-summary-head-value { font-size: 50px; }',
  '  .ilife-sheet-title { font-size: 18px; }',
  '  .ilife-bill-sheet-page .ilife-block-ledger-row-value { max-width: 58%; }',
  '}',
].join('\n');

/** 小票纸店头（#993）：品牌行＋结论标题＋副题行。
 *
 * 住共用位：写入域回执与查询域详情两页共用（第二个用法长出来之后收成这一处）。
 * 副题行（`sub`）缺省不出：回执两页不传，产物逐字节不动；查询域详情页传店头第三行。 */
export function sheetHead(brand: string, titleHtml: string, sub = ''): string {
  return '<header class="ilife-sheet-head"><p class="ilife-sheet-eyebrow">' + escapeHtml(brand)
    + '</p><h1 class="ilife-sheet-title">' + titleHtml + '</h1>'
    + (sub === '' ? '' : '<p class="ilife-sheet-sub">' + escapeHtml(sub) + '</p>') + '</header>';
}

/** 段落之间的虚线分隔（原型 `hr.dashed`）。 */
export function ticketRule(): string {
  return '<hr class="ilife-ticket-rule">';
}

/** 一段（原型 `.sec`）：段标题（主色条 ＋ 右对齐英文标）＋ 段内容。 */
export function ticketSection(input: { readonly title: string; readonly tag: string; readonly content: string }): string {
  return '<section class="ilife-ticket-sec"><div class="ilife-ticket-sec-heading">' + escapeHtml(input.title)
    + '<span class="ilife-ticket-sec-no">' + escapeHtml(input.tag) + '</span></div>'
    + input.content + '</section>';
}

/** 主数字块（原型 `.summary-head`）：公共层主数字头（票据纸版式）＋ 它下面那几行小字。 */
export function ticketSummary(summaryHtml: string, extraHtml: string): string {
  return '<section class="ilife-ticket-summary" aria-label="这一笔的金额">' + summaryHtml + extraHtml + '</section>';
}

/** 按钮区（原型 `.actions`）：主按钮／复制区整行堆叠。 */
export function ticketActions(content: string): string {
  return '<div class="ilife-ticket-actions">' + content + '</div>';
}

/** 主按钮（原型 `.btn-primary`）：**带复制载荷的整行实心按钮**。
 *
 *  为什么不走公共层的动作条：`renderActionBar` 的实心红钮（`kind: 'red'`）**没有载荷位**
 *  （不带 `data-t`），点了不复制也不写库——#733 已经把「看着能点、点了没反应」判成缺陷；
 *  退出口要的是"这一颗真能把撤销指令复制走"。故这里按原型的按钮形状产出标记，
 *  复制仍走公共层 helpers 的委派（`[data-action-id]` ＋ `data-t` 两条属性与它逐字对齐）。 */
export function ticketPrimaryButton(input: { readonly label: string; readonly actionId: string; readonly text: string }): string {
  return '<button type="button" class="ilife-ticket-btn is-primary" data-action-id="' + escapeHtml(input.actionId)
    + '" data-t="' + escapeHtml(input.text) + '">' + escapeHtml(input.label) + '</button>';
}

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
    extraCss: [DESKTOP_CSS, TOAST_CSS, KV_CSS, pageUiCss()].join('\n'),
    doctypeCase: 'upper',
    pageUi: true,
  });
}

/** 小票页装配（#993）：正文已是单据族装配（含 `renderSheetFrame` 的纸），不再套页面壳。
 *
 *  样式走族汇总 `sheetCss()`（与卡路里小票页同一条路：族汇总进 `extraCss`，`blocksCss()` 仍由骨架件拼）。
 *  店头、段落、明细卡、按钮、页脚那几段样式只进这一路（见上 `TICKET_CSS`），
 *  `assembleDocPage` 的 29 页产物逐字节不动。
 *  **顺序**：族样式与皮肤在前、本页家具在后——家具里那几条是**页面级几何覆盖**
 *  （主数字块内距、账目行 44px、复制按钮形状），与族样式同权重，靠"后出现"取胜。
 *  皮肤（#993 像素对齐原型）：挂 `skinCss()` ＋ 祖先 `ilife-skin-ticket` 类，纸面材料色跟皮肤走；
 *  不挂皮肤类的老页零命中（加法式），故只包在这一路里。页型另挂一枚 `ilife-ticket-<页型>` 类，
 *  供"只详情页生效"的那两条几何用（44px 账目行）。 */
export function assembleSheetPage(input: { readonly docTitle: string; readonly bodyHtml: string; readonly paper: 'receipt' | 'detail' }): string {
  return renderDocShell({
    docTitle: input.docTitle,
    bodyHtml: '<div class="ilife-bill-sheet-page ilife-ticket-' + input.paper + ' ' + skinClass('ticket') + '">'
      + input.bodyHtml + '</div>',
    extraCss: [sheetCss(), skinCss(), pageUiCss(), TICKET_CSS].join('\n'),
    doctypeCase: 'upper',
    pageUi: true,
  });
}
