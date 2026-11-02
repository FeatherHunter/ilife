/** #525 · 页面级移动端配方（共用件）：把 HELP 页当刻的手机端能力搬进「结果型／过程型／回执」
 *  三类页面共走的那条链，一次到位，四张下游票照抄而不必各写一遍。
 *
 *  谁在用（写得出哪两个在用）：**卡路里**的整页装配 `src/shared/docPage.ts` 的 `pageUi` 可选位
 *  （`skill-calorie/src/shared/docPage.ts` 传 `pageUi: true` 时把本函数拼进 `sharedCssText`）；
 *  **样板页** `.scratch/t525/` 的 `查身材照` 目标形态（票 #525 的照抄对象）。
 *
 *  为什么另立一件而不写进 `blocks.ts`：`blocks.ts` 是 12 个区块样式区的唯一定义地，本件是
 *  **页面级**配方（断点／触摸区／安全区／窄屏表格行为），与 12 区无组合关系——与同仓先例
 *  `block-toc`（页内导航）、`block-caliber`（口径行）、`block-conclusion`（结论条）落
 *  `pageShell` 区同一类东西，只是体量更大，故另立文件。（#525 开工当刻 `blocks.ts` 有第二个
 *  写窗在途，见 `docs/skills/skill-calorie/t525-证据.md` 的并发记账。）
 *
 *  口径（票面「手机端基准＝HELP 页当刻的能力，不是新设计」）逐条：
 *   · 断点只用仓内既有值 **820／640／400**（`blocks.ts` 的 640、`TOAST_DEFAULTS.mobileMaxPx`
 *     的 820、`style.ts` 的 400），**不新造断点值**；
 *   · 触摸区 ≥44×44px（HELP `.ilife-copy-btn` 820 档 `min-height:44px` 同值）；
 *   · 判据数值（触摸下限／正文字号下限／断点集合）的唯一一处定义地＝本件 `PAGE_LIMITS`（#868）；
 *   · `env(safe-area-inset-*)`（HELP toast 与回顶按钮同法；须配 `viewport-fit=cover`）；
 *   · 页脚留白 60px（HELP `.ilife-help-shell` 640 档 `padding: 20px 16px 60px` 逐值同）；
 *   · 读数卡窄屏两格 → 400 档单列（HELP `.ilife-help-shell-grid` 640 档单列的同一条意图）；
 *   · 页内定位：带 `id` 的区块吃 `scroll-margin-top`，锚点跳转不把标题顶到视口外。
 *
 *  **全部规则都挂在根类 `.ilife-page-ui` 之下**：没启用本配方的页面一条都命中不到
 *  （产出物逐字节不变，登录门读数见证据件）。
 */

/** 起点色值口径：与 `blocks.ts` 同一条冻结 token 表；本件不新增 token、不新增色值。 */
import { ACTION_BAR_DEFAULTS } from '../../spec/index.js';
import { toastUiCss } from './toast.js';
import { m } from '../../entries/index.js';

const LF = String.fromCharCode(10);

/** 页面级配方的根类名：整页装配把这一颗类加到版面根上（`docPage.ts` 的 `pageUi` 位）。 */
export const PAGE_UI_CLASS = 'ilife-page-ui';

/** 配 `viewport-fit=cover` 的 viewport 串（`env(safe-area-inset-*)` 在 iOS 上不写它恒取 0）。
 *  只在启用本配方时用它替换旧串；不给即老串（旧调用方逐字节不变）。 */
export const PAGE_UI_VIEWPORT = 'width=device-width,initial-scale=1,viewport-fit=cover';

/** #868 页面级判据数值（唯一一处定义地）：判分引擎与各域从这里取，不许在别处另写一份字面量。
 *
 *  · `touchMinPx`（44）＝ 可点控件的最小命中高度，与 `spec/controls.ts` 的
 *    `ACTION_BAR_DEFAULTS.minHeightPx` 是**同一个数、同一件事**（此处只引用，不重写）；
 *  · `textMinPx`（12）＝ 正文类字号下限，与下面 ⑥ 那条媒体查询**逐值同源**（同一个常量写进 CSS）；
 *  · `textEntryMinPx`（16）＝ **文本录入控件**（`input`／`select`／`textarea`）字号下限；外部出处＝
 *    WebKit 对 `font-size < 16px` 的表单控件**聚焦时自动放大页面**（iOS Safari 固有行为，不是本仓口味）。
 *    同类的唯一承载票是 #1001；**本值同时是发射源**——页面根之下的字号地板由 `textEntryFloorCss()`
 *    从本值生成（不许在别处再写一份 `16px`）；
 *  · `breakpointsPx` ＝ 仓内既有断点集合，断点只许从这一份里取，不新造。
 *
 *  判分引擎住包内 `scripts/判分.mjs`，按包内相对路径取 `dist/pageUi.js` 的本件。 */
export const PAGE_LIMITS = Object.freeze({
  touchMinPx: ACTION_BAR_DEFAULTS.minHeightPx,
  textMinPx: 12,
  textEntryMinPx: 16,
  breakpointsPx: Object.freeze([400, 640, 820, 1001, 1200]),
} as const);

/** 「**不是**文本录入控件」的 `input[type]` 排除集（**唯一一处定义地**）：其余 `input`（含不写
 *  `type` 属性者）与 `select`／`textarea` 一律算文本录入控件。
 *
 *  为什么用**排除**而不是**穷举**：新出现的 `type`（含引擎将来加的）默认落到「算」这一侧——宁可多算一个
 *  （多一条 16px 的地板，视觉上只是字大一点），不可漏算一个（漏算＝那一枚控件在 iOS 上聚焦即缩放）。
 *  这份清单**同时**供两侧派生：CSS 地板的选择器（`textEntryFloorCss()`）与判据侧的枚举器
 *  （`test/text-entry-computed-1001.test.mjs` 的页内读数）——一个概念只留一处定义。 */
export const NON_ENTRY_INPUT_TYPES = Object.freeze([
  'button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'color', 'image', 'hidden',
] as const);

/** 文本录入控件字号地板：把「`root` 之下所有文本录入控件 ≥ `PAGE_LIMITS.textEntryMinPx`」写成一条规则。
 *
 *  **为什么整条塞进 `:where()`**：`:where()` 的特异度恒为 0 ⇒ 这条规则的特异度**只由页根贡献**
 *  （`(0,1,0)`）。于是「某控件想做成 18px」这种**合法的上调**随手就赢它，而「写回 13px」这种**下调**
 *  由产物面计算值门禁抓——**CSS 表达不了「≥」，不等式交给门禁，不交给级联**（这是 #1001 的架构结论）。
 *
 *  **为什么要它而不是逐处声明**：全仓曾有 22 处手写 `font-size`（12.5／13／13.5／14／15px），
 *  全是 `class + element` 形态 `(0,1,1)` —— 同一个概念 22 个定义地。收成「一处定义 ＋ 每页族一条发射」，
 *  删掉那 22 处之后，这条地板自然生效（赛道上没有对手了）。
 *
 *  `root` 是**页族根选择器**（如 `'.ilife-page'`／`'.ilife-help-shell'`）；每多一个页族就多一次发射，
 *  但定义仍只有这一处。 */
export function textEntryFloorCss(root: string): string {
  /* 一个 `input` ＋ N 个 `:not()` 复合（不是 N 个 `input…` 连写——那会拼出 `input…input…` 这种非法选择器；
     `:where()` 的选择器列表是**宽容解析**：非法项被**静默丢掉**，规则照样生效但漏掉整类控件——
     实测踩过一次：连写时 `input` 全被丢、只有 `select` 吃到了地板，产物面门禁当场读出来）。 */
  const inputs = 'input' + NON_ENTRY_INPUT_TYPES.map((type) => ':not([type=' + type + '])').join('');
  return [
    root + ' :where(',
    '  ' + inputs + ',',
    '  select,',
    '  textarea',
    ') {',
    '  font-size: ' + PAGE_LIMITS.textEntryMinPx + 'px;',
    '}',
  ].join(LF);
}

/** #950 C1 正文列宽四档（闭集）：**缺省 `centered` ＝ 改前行为**。
 *  · `centered`：正文 880 居中 ＋ 满铺白名单（表／图／卡排／键值行满铺）；
 *  · `wide`：正文 1120 居中（同族先例：缺口页页宽 1120）；
 *  · `full`：不收窄，正文满铺页壳（1280）；
 *  · `locked`：880 居中且**满铺白名单失效**（所有子件都收进正文列）——这一档正是两个技能包
 *    各自写过的垫片（`skill-calorie` 的 `ONE_COLUMN_CSS`／`workoutPlanCss.ts` 的 `PREVIEW_COLUMN_CSS`），
 *    「两个包各写一份垫片 ＝ 公共层缺一个参数」，故提到这里当参数。 */
export const PAGE_COLUMNS = ['centered', 'wide', 'full', 'locked'] as const;
export type PageColumn = (typeof PAGE_COLUMNS)[number];

/** 两档正文列宽（px）：`centered`／`locked` 用 880（改前既有值），`wide` 用 1120。 */
export const PAGE_COLUMN_WIDTH_PX = Object.freeze({ centered: 880, wide: 1120 } as const);

export interface PageUiCssInput {
  /** 类名前缀；缺省 `ilife-`（与 `blocksCss({ prefix })` 同口径）。 */
  readonly prefix?: string;
  /** **正文列宽档**（#950 C1）：缺省 `centered`（＝改前行为，选择器与值逐条不变）。 */
  readonly column?: PageColumn;
}

/** #950 C1：宽屏档（≥1001px）那一段 CSS——按 `column` 四档生成。
 *  `centered` 档吐出的选择器与值**逐条与改前相同**（顺序也相同），只在最前补一句档位说明。 */
function columnCss(column: PageColumn, root: string, p: string): string[] {
  const width = column === 'wide' ? PAGE_COLUMN_WIDTH_PX.wide : PAGE_COLUMN_WIDTH_PX.centered;
  const out: string[] = [
    m('base-render.components-page-ui-index.c001', { p0: String(column) }),
    m('base-render.components-page-ui-index.c002'),
    m('base-render.components-page-ui-index.c003'),
    m('base-render.components-page-ui-index.c004'),
    m('base-render.components-page-ui-index.c005'),
    m('base-render.components-page-ui-index.c006'),
    m('base-render.components-page-ui-index.c007'),
    m('base-render.components-page-ui-index.c008'),
    m('base-render.components-page-ui-index.c009'),
    m('base-render.components-page-ui-index.c010'),
    m('base-render.components-page-ui-index.c011'),
    m('base-render.components-page-ui-index.c012'),
    '@media (min-width: 1001px) {',
    '  ' + root + ' .' + p + 'block-page-shell {',
    '    box-sizing: border-box;',
    '    max-width: 1280px;',
    '  }',
  ];
  if (column !== 'full') {
    out.push('  ' + root + ' .' + p + 'block-page-shell-body {');
    out.push('    display: grid;');
    out.push('    grid-template-columns: minmax(0, 1fr) ' + String(width) + 'px minmax(0, 1fr);');
    out.push('  }');
    out.push('  ' + root + ' .' + p + 'block-page-shell-body > * {');
    out.push('    grid-column: 2;');
    out.push('  }');
    if (column !== 'locked') {
      out.push(m('base-render.components-page-ui-index.c013'));
      out.push('  ' + root + ' .' + p + 'block-page-shell-body > :where(');
      out.push('    .' + p + 'block-kpi-card-grid,');
      out.push('    .' + p + 'block-data-table,');
      out.push('    .' + p + 'block-chart-block,');
      out.push('    .' + p + 'block-detail-section,');
      out.push('    .' + p + 'block-list-rows');
      out.push('  ) {');
      out.push('    grid-column: 1 / -1;');
      out.push('  }');
    }
    out.push(m('base-render.components-page-ui-index.c014'));
    out.push(m('base-render.components-page-ui-index.c015'));
    out.push(m('base-render.components-page-ui-index.c016'));
    out.push(m('base-render.components-page-ui-index.c017'));
    out.push('  ' + root + ' .' + p + 'block-page-shell-body > :where(');
    out.push('    ' + ['span', 'a', 'b', 'i', 'em', 'strong', 'code', 'small'].join(', '));
    out.push('  ) {');
    out.push('    justify-self: start;');
    out.push('  }');
    out.push(m('base-render.components-page-ui-index.c018'));
    out.push(m('base-render.components-page-ui-index.c019'));
    out.push(m('base-render.components-page-ui-index.c020'));
    out.push(m('base-render.components-page-ui-index.c021'));
    out.push('  ' + root + ' .' + p + 'block-page-shell-eyebrow,');
    out.push('  ' + root + ' .' + p + 'block-page-shell-title,');
    out.push('  ' + root + ' .' + p + 'block-page-shell-subtitle {');
    out.push('    max-width: ' + String(width) + 'px;');
    out.push('    margin-left: auto;');
    out.push('    margin-right: auto;');
    out.push('  }');
  }
  out.push(m('base-render.components-page-ui-index.c022'));
  out.push(m('base-render.components-page-ui-index.c023'));
  out.push(m('base-render.components-page-ui-index.c024'));
  out.push(m('base-render.components-page-ui-index.c025'));
  out.push(m('base-render.components-page-ui-index.c026'));
  out.push('  ' + root + ' .' + p + 'block-kpi-card-grid:has(> :nth-child(4)) {');
  out.push('    grid-template-columns: repeat(4, minmax(0, 1fr));');
  out.push('  }');
  out.push('}');
  return out;
}

/** 页面级移动端配方的样式资产唯一产出者。恒返回非空 CSS 文本。 */
export function pageUiCss(input?: PageUiCssInput): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';

  /* #950 C1：正文列宽档（缺省 centered ＝ 改前行为）。 */
  const columnRaw: unknown = input === undefined || input === null ? undefined : input.column;
  if (columnRaw !== undefined && !(PAGE_COLUMNS as readonly string[]).includes(columnRaw as string)) {
    throw new Error('pageUi: input.column 必须是 ' + PAGE_COLUMNS.join('／') + ' 之一');
  }
  const column: PageColumn = columnRaw === undefined ? 'centered' : (columnRaw as PageColumn);
  return [
    m('base-render.components-page-ui-index.c027', { p0: String(root) }),
    m('base-render.components-page-ui-index.c028'),
    root + ' img,',
    root + ' svg {',
    '  max-width: 100%;',
    '}',
    root + ' img {',
    '  height: auto;',
    '}',
    m('base-render.components-page-ui-index.c029'),
    m('base-render.components-page-ui-index.c030'),
    m('base-render.components-page-ui-index.c031'),
    m('base-render.components-page-ui-index.c032'),
    root + ' .' + p + 'block-page-shell-body > *[id] {',
    '  scroll-margin-top: 20px;',
    '}',
    m('base-render.components-page-ui-index.c033'),
    root + ' .' + p + 'block-data-table {',
    '  -webkit-overflow-scrolling: touch;',
    '  scrollbar-width: thin;',
    '}',
    m('base-render.components-page-ui-index.c034'),
    m('base-render.components-page-ui-index.c035'),
    m('base-render.components-page-ui-index.c036'),
    m('base-render.components-page-ui-index.c037'),
    root + ' .' + p + 'copy-btn,',
    root + ' .' + p + 'copy-menu-item,',
    root + ' .' + p + 'action-btn,',
    root + ' .' + p + 'block-disclosure-summary,',
    root + ' .' + p + 'block-param-form-input,',
    root + ' .' + p + 'block-toc a {',
    '  min-height: ' + PAGE_LIMITS.touchMinPx + 'px;',
    '}',
    m('base-render.components-page-ui-index.c038'),
    m('base-render.components-page-ui-index.c039'),
    textEntryFloorCss(root),
    m('base-render.components-page-ui-index.c040'),
    root + ' .' + p + 'block-toc a {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  padding-top: 0;',
    '  padding-bottom: 0;',
    '}',
    m('base-render.components-page-ui-index.c041'),
    '@media (max-width: 640px) {',
    m('base-render.components-page-ui-index.c042'),
    '  ' + root + ' .' + p + 'block-page-shell {',
    '    padding: 20px max(16px, env(safe-area-inset-right, 0px))',
    '      calc(60px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));',
    '  }',
    m('base-render.components-page-ui-index.c043'),
    '  ' + root + ' .' + p + 'block-caliber,',
    '  ' + root + ' .' + p + 'block-list-rows-row,',
    '  ' + root + ' .' + p + 'block-kpi-card-detail {',
    '    font-size: ' + PAGE_LIMITS.textMinPx + 'px;',
    '  }',
    m('base-render.components-page-ui-index.c044'),
    '  ' + root + ' .' + p + 'block-kpi-card-grid {',
    '    grid-template-columns: repeat(2, minmax(0, 1fr));',
    '    gap: 10px;',
    '  }',
    '  ' + root + ' .' + p + 'block-kpi-card {',
    '    padding: 12px;',
    '  }',
    m('base-render.components-page-ui-index.c045'),
    '  ' + root + ' .' + p + 'block-toc {',
    '    flex-wrap: nowrap;',
    '    overflow-x: auto;',
    '    -webkit-overflow-scrolling: touch;',
    '    scrollbar-width: none;',
    '    padding-bottom: 2px;',
    '  }',
    '  ' + root + ' .' + p + 'block-toc a {',
    '    flex: 0 0 auto;',
    '  }',
    m('base-render.components-page-ui-index.c046'),
    m('base-render.components-page-ui-index.c047'),
    m('base-render.components-page-ui-index.c048'),
    '  ' + root + ' .' + p + 'block-data-table:has(td[' + 'data-label]) .' + p + 'block-data-table-table,',
    '  ' + root + ' .' + p + 'block-data-table:has(td[' + 'data-label]) tbody,',
    '  ' + root + ' .' + p + 'block-data-table:has(td[' + 'data-label]) tr,',
    '  ' + root + ' .' + p + 'block-data-table:has(td[' + 'data-label]) td {',
    '    display: block;',
    '    width: auto;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(td[' + 'data-label]) thead {',
    '    display: none;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(td[' + 'data-label]) tr {',
    '    padding: 4px 0;',
    '    border-top: 1px solid rgba(210, 210, 215, .6);',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(td[' + 'data-label]) tr:first-child {',
    '    border-top: 0;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(td[' + 'data-label]) td {',
    '    display: flex;',
    '    justify-content: space-between;',
    '    gap: 12px;',
    '    padding: 3px 10px;',
    '    border-bottom: 0;',
    '    text-align: left;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(td[' + 'data-label]) td::before {',
    '    content: attr(' + 'data-label);',
    '    flex: 0 0 auto;',
    // #728 逐页审计：改前取 `--fg3`（#86868b，压白底 3.62:1／压斑马行 3.33:1），
    //   12px 正文不到 AA 的 4.5:1（多席逐像素量到）。取 `--fg2`（4.94:1）——同族深一档，不新增色值。
    '    color: var(--fg2);',
    // #567 J4（§5.2 次级 12 吸收 12／11.5）。
    '    font-size: 12px;',
    '    font-weight: 600;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(td[' + 'data-label]) td.' + p + 'block-data-table-cell-right {',
    '    min-width: 0;',
    '  }',
    '}',
    m('base-render.components-page-ui-index.c049'),
    m('base-render.components-page-ui-index.c050'),
    m('base-render.components-page-ui-index.c051'),
    m('base-render.components-page-ui-index.c052'),
    m('base-render.components-page-ui-index.c053'),
    m('base-render.components-page-ui-index.c054'),
    m('base-render.components-page-ui-index.c055'),
    m('base-render.components-page-ui-index.c056'),
    m('base-render.components-page-ui-index.c057'),
    m('base-render.components-page-ui-index.c058'),
    m('base-render.components-page-ui-index.c059'),
    '   ② 它住错了层：表头与数据格本来就带**同一个** `cell-<align>` 档类（`blocks.ts` 的 `renderDataTable`',
    m('base-render.components-page-ui-index.c060'),
    m('base-render.components-page-ui-index.c061'),
    '      `skill-schedule/src/plan/replaySections.ts`、`skill-chef/src/view/page.ts`、',
    m('base-render.components-page-ui-index.c062'),
    m('base-render.components-page-ui-index.c063'),
    m('base-render.components-page-ui-index.c064'),
    m('base-render.components-page-ui-index.c065'),
    m('base-render.components-page-ui-index.c066'),
    m('base-render.components-page-ui-index.c067'),
    m('base-render.components-page-ui-index.c068'),
    m('base-render.components-page-ui-index.c069'),
    m('base-render.components-page-ui-index.c070'),
    m('base-render.components-page-ui-index.c071'),
    m('base-render.components-page-ui-index.c072'),
    m('base-render.components-page-ui-index.c073'),
    m('base-render.components-page-ui-index.c074'),
    m('base-render.components-page-ui-index.c075'),
    '@media (max-width: 640px) {',
    '  ' + root + ' .' + p + 'block-data-table:has(thead tr > th:nth-child(2):last-child) thead {',
    '    display: none;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(thead tr > th:nth-child(2):last-child) table,',
    '  ' + root + ' .' + p + 'block-data-table:has(thead tr > th:nth-child(2):last-child) tbody {',
    '    display: block;',
    '    width: auto;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(thead tr > th:nth-child(2):last-child) tr {',
    '    display: flex;',
    '    align-items: baseline;',
    '    justify-content: space-between;',
    '    gap: 12px;',
    '    padding: 10px 0;',
    '    border-top: 1px solid rgba(210, 210, 215, .6);',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(thead tr > th:nth-child(2):last-child) tr:first-child {',
    '    border-top: 0;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(thead tr > th:nth-child(2):last-child) td {',
    '    display: block;',
    '    width: auto;',
    '    padding: 0;',
    '    border-bottom: 0;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(thead tr > th:nth-child(2):last-child) td::before {',
    '    content: none;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(thead tr > th:nth-child(2):last-child) td:first-child {',
    // #919：这一型（窄档「一行一条事实」）原来左右内距是 0 —— 同一张表的标题有 10px（`blocks.ts` 640 档）、
    //   普通窄档形态的单元格也是 10px，只有它写成 0 ⇒ 行文字压在卡片边框上、与标题不在同一条竖线
    //   （实测：标题文字左缘与首格文字左缘差 10px，行文字到卡片边框左右各 1px）。
    //   值取 10px，与同断点那两处同值。
    '    padding-left: 10px;',
    '    color: var(--fg2);',
    '    font-weight: 600;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(thead tr > th:nth-child(2):last-child) td:last-child {',
    '    text-align: right;',
    '    overflow-wrap: anywhere;',
    '    padding-right: 10px;',
    '  }',
    '}',
    /* ⑧ 宽屏正文列宽段（#525 ＋ #950 C1 四档）：由 `columnCss()` 按档生成。 */
    ...columnCss(column, root, p),
    m('base-render.components-page-ui-index.c076'),
    m('base-render.components-page-ui-index.c077'),
    m('base-render.components-page-ui-index.c078'),
    m('base-render.components-page-ui-index.c079'),
    m('base-render.components-page-ui-index.c080'),
    root + ' .' + p + 'block-chip,',
    root + ' .' + p + 'block-kpi-card-detail {',
    '  font-size: 13px;',
    '}',
    m('base-render.components-page-ui-index.c081'),
    m('base-render.components-page-ui-index.c082'),
    m('base-render.components-page-ui-index.c083'),
    m('base-render.components-page-ui-index.c084'),
    m('base-render.components-page-ui-index.c085'),
    m('base-render.components-page-ui-index.c086'),
    m('base-render.components-page-ui-index.c087'),
    '   词只活在 CSS 里（实测 32/32 页：产物里「已完成」只出现 1 次就是那行 `content:`，`<body>` 里 0 次）⇒',
    m('base-render.components-page-ui-index.c088'),
    m('base-render.components-page-ui-index.c089'),
    m('base-render.components-page-ui-index.c090'),
    root + ' .' + p + 'block-feedback-block-note .' + p + 'block-feedback-block-note-icon {',
    '  width: auto;',
    '  min-width: 44px;',
    '  padding: 0 10px;',
    '  border-radius: 999px;',
    '  font-weight: 600;',
    '}',
    root + ' .' + p + 'block-feedback-block-note .' + p + 'block-feedback-block-note-icon-glyph {',
    '  display: none;',
    '}',
    root + ' .' + p + 'block-feedback-block-note .' + p + 'block-feedback-block-note-icon-text {',
    '  display: inline;',
    '  font-size: 12px;',
    '  line-height: 1;',
    '}',
    m('base-render.components-page-ui-index.c091'),
    m('base-render.components-page-ui-index.c092'),
    m('base-render.components-page-ui-index.c093'),
    m('base-render.components-page-ui-index.c094'),
    m('base-render.components-page-ui-index.c095'),
    '@media (min-width: 1001px) {',
    '  ' + root + ' .' + p + 'block-param-form {',
    '    display: grid;',
    '    grid-template-columns: repeat(2, minmax(0, 1fr));',
    '    column-gap: 24px;',
    '    align-items: start;',
    '  }',
    '  ' + root + ' .' + p + 'block-param-form-description,',
    '  ' + root + ' .' + p + 'block-param-form-preview {',
    '    grid-column: 1 / -1;',
    '  }',
    '}',
    m('base-render.components-page-ui-index.c096'),
    m('base-render.components-page-ui-index.c097'),
    m('base-render.components-page-ui-index.c098'),
    m('base-render.components-page-ui-index.c099'),
    m('base-render.components-page-ui-index.c100'),
    ...toastUiCss(root, PAGE_LIMITS.touchMinPx),
  ].join(LF);
}
