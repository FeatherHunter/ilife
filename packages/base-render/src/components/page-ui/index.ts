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
 *  · `breakpointsPx` ＝ 仓内既有断点集合，断点只许从这一份里取，不新造。
 *
 *  判分引擎住包内 `scripts/判分.mjs`，按包内相对路径取 `dist/pageUi.js` 的本件。 */
export const PAGE_LIMITS = Object.freeze({
  touchMinPx: ACTION_BAR_DEFAULTS.minHeightPx,
  textMinPx: 12,
  breakpointsPx: Object.freeze([400, 640, 820, 1001, 1200]),
} as const);

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
    '/* #950 C1 正文列宽档：`' + column + '`（`centered` 缺省＝改前行为；`wide` 1120／`full` 满铺／',
    '   `locked` 满铺白名单失效——后两档分别替掉页面侧改宽度与锁单列的垫片）。 */',
    '/* ⑧ 宽屏把可用宽用起来（#525 第二轮；来源＝#525 席位版面档重判里**双方都认的那一条**',
    '   「1280 档没把宽屏用起来」，以及编排者 2026-09-15 的补记：页面模板 960 在 1280 档左右各空 140px）。',
    '   口径＝「宽屏不空荡、正文不散」：页面模板从 `blocks.ts` 的 960（那儿是别票写集，本件不改它）',
    '   放宽到 **1280**，正文收成 **880px 一列**居中，栅格类与真二维数据（读数卡／表／图／键值行／',
    '   列表行）满铺可用宽。为什么用栅格而不是 12 条 `max-width`：正文类块在各票里长得不一样，',
    '   靠「不漏掉某个类名」的清单法必然漏（第一版注入候选就漏了无类名的 `section`），',
    '   栅格是**默认收窄、显式放宽**，漏不掉。',
    '   `box-sizing: border-box` 是本条的前提：本仓没有 `*{box-sizing}` 全局复位（`blocks.ts` 的',
    '   pageShell 区注明「不搬 HELP 那一条」），页面模板是 content-box ⇒ 不写它则 `max-width` 只管内容宽、',
    '   实占 1320（1440 档左右各空 60，不是 80）。 */',
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
      out.push('  /* 宽的走满铺（`:where()` 保零权重，覆盖既有 `auto-fit` 时按「同权重、后出现」取胜） */');
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
    out.push('  /* #950（C2 守卫）：**行内级子件不被拉伸**。上面那条 `> * { grid-column: 2 }` 给每个直接子节点');
    out.push('     整列宽（880），裸的 `span`／`a`／`b` 因此变成一条 880px 的长条——用户截图里那三根「很丑的');
    out.push('     独占一行」正是这么来的（同一份标记窄屏好、宽屏坏）。正确入口是包一层 `renderChipRow`；');
    out.push('     本条把「忘了包」的代价从「塌成表单」降到「各自一行、各自宽度」。 */');
    out.push('  ' + root + ' .' + p + 'block-page-shell-body > :where(');
    out.push('    span, a, b, i, em, strong, code, small');
    out.push('  ) {');
    out.push('    justify-self: start;');
    out.push('  }');
    out.push('  /* #728 收口：页头三级（眉标／标题／副题）跟着正文列走。');
    out.push('     ⑧ 只把**正文**那层收成 880 居中，页头是它的兄弟节点 ⇒ 不写这一条，标题会贴在版心最左、');
    out.push('     正文居中，整页左右不对称（t728 复评实测：标题 x≈26、正文 x≈202）。');
    out.push('     只收宽屏档；窄屏页头与正文同为 16px 内距，本来就对齐。 */');
    out.push('  ' + root + ' .' + p + 'block-page-shell-eyebrow,');
    out.push('  ' + root + ' .' + p + 'block-page-shell-title,');
    out.push('  ' + root + ' .' + p + 'block-page-shell-subtitle {');
    out.push('    max-width: ' + String(width) + 'px;');
    out.push('    margin-left: auto;');
    out.push('    margin-right: auto;');
    out.push('  }');
  }
  out.push('  /* 读数卡一行四张：960 档的 `auto-fit minmax(150px,1fr)` 只排得出 2 张，一行两张在宽屏上');
  out.push('     就是「右半边空着」。四张同高靠既有 `grid-auto-rows: 1fr`（本件不动它）。');
  out.push('     **#919 加一道守卫**：只有真排得满 4 张时才定 4 列（`:has(> :nth-child(4))`）——1～3 张卡的页');
  out.push('     退回区块层那条 `auto-fit`（卡片自己撑满一行）。不守的代价实测过：两张卡的页在 ≥1001 缩成');
  out.push('     各占 1/4、右半整块空着，比不开配方还难看。 */');
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
    '/* #525 页面级移动端配方 · 只对根类 ' + root + ' 的页面生效 */',
    '/* ① 图片与矢量图兜底：任何一张图都不许撑破容器（结果型页面的第一类溢出源）。 */',
    root + ' img,',
    root + ' svg {',
    '  max-width: 100%;',
    '}',
    root + ' img {',
    '  height: auto;',
    '}',
    '/* ② 复制区债之一（**置灰规则的定义地已上移到 `style.ts` 的 `copyButton` 区**——',
    '   它对所有页面都成立，不属「移动端配方」，故本件不再重述第二条：同一件事只留一个定义地）。',
    '   本件只在窄屏把命中高度补齐；宽度档的 44px 由 `ACTION_BAR_DEFAULTS.minHeightPx` 统一给。 */',
    '/* ③ 页内定位：带 id 的区块被锚点跳转命中时，标题与视口顶留 20px（不贴着边缘）。 */',
    root + ' .' + p + 'block-page-shell-body > *[id] {',
    '  scroll-margin-top: 20px;',
    '}',
    '/* ④ 表格：列数极多的表仍可横滑时的兜底（细滚动条＋触屏惯性）。 */',
    root + ' .' + p + 'block-data-table {',
    '  -webkit-overflow-scrolling: touch;',
    '  scrollbar-width: thin;',
    '}',
    '/* ⑤ 触摸区：**全宽档**所有页内可点元素命中区 ≥44×44px。',
    '   #525 收口：这一条原来只在 ≤820 那条媒体查询里，实测 1440 档样板页的页内导航（`a`）',
    '   只有 27px 高 —— 44px 是**全宽档**口径（与 `.ilife-copy-btn` 同值），故移出媒体查询。',
    '   只加 `min-height` 与最小内距，不动任何既有选择器的语义。 */',
    root + ' .' + p + 'copy-btn,',
    root + ' .' + p + 'copy-menu-item,',
    root + ' .' + p + 'action-btn,',
    root + ' .' + p + 'block-disclosure-summary,',
    root + ' .' + p + 'block-param-form-input,',
    root + ' .' + p + 'block-toc a {',
    '  min-height: ' + PAGE_LIMITS.touchMinPx + 'px;',
    '}',
    '/* 页内导航按胶囊排（inline 元素上 min-height 不生效，须转 inline-flex）。 */',
    root + ' .' + p + 'block-toc a {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  padding-top: 0;',
    '  padding-bottom: 0;',
    '}',
    '/* ⑥ 窄屏（≤640）：安全区留白、字号节奏、读数卡栅格、页内导航横滑、表格卡片化。 */',
    '@media (max-width: 640px) {',
    '  /* 安全区：手机横放与「小白条」机型上正文不许贴边；页脚留 60px 与 HELP 640 档逐值同。 */',
    '  ' + root + ' .' + p + 'block-page-shell {',
    '    padding: 20px max(16px, env(safe-area-inset-right, 0px))',
    '      calc(60px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));',
    '  }',
    '  /* 字号下限：正文类文本一档不落（表格单元格／口径行／列表行／事实条标签 ≥12px）。 */',
    '  ' + root + ' .' + p + 'block-caliber,',
    '  ' + root + ' .' + p + 'block-list-rows-row,',
    '  ' + root + ' .' + p + 'block-kpi-card-detail {',
    '    font-size: ' + PAGE_LIMITS.textMinPx + 'px;',
    '  }',
    '  /* 读数卡：两格并排（150px 下限在 358px 可用宽里正好两格，不再被 auto-fit 挤成三格）。 */',
    '  ' + root + ' .' + p + 'block-kpi-card-grid {',
    '    grid-template-columns: repeat(2, minmax(0, 1fr));',
    '    gap: 10px;',
    '  }',
    '  ' + root + ' .' + p + 'block-kpi-card {',
    '    padding: 12px;',
    '  }',
    '  /* 页内导航：一条横滑的胶囊轨（换行会把标题挤出首屏；横滑不占纵向高度）。 */',
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
    '  /* 表格卡片化：每个数据格带列头文本（`td[data-label]`，由 `renderDataTable` 写入）时，',
    '     窄屏把「一行多列」摊成「一格两行：列头 ＋ 值」，列头不再挤在 390px 里。',
    '     属性缺席时本段全部是空选择器 ⇒ 自动退回 #457 的紧凑表形态，不静默出错。 */',
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
    '/* ⑦ 这一段的断点上共撤过两条规则，都记在这里（本配方撤规则的地方只有此处）。',
    '   ── 撤 1：「≤400 档：读数卡塌单列」（#728 逐页审计）。',
    '   撤因（多席独立量到）：主流手机宽 390 正落在 `max-width: 400` 里 ⇒ ⑥ 那条「两格并排」',
    '   在 390 上**永远不生效**，8 张读数卡一路单列排下去、吃掉整页 40～45% 的高度',
    '   （实测卡块 y313..1164＝852px，是视口 844px 的 1.01 倍），而卡里往往只放「未给」「1 笔」这种两三个字。',
    '   两格并排后同一批卡约占 17%；320 档每格仍有 1fr 兜底、值不裁（`overflow-wrap` 在卡值位已有）。',
    '   撤的是档位不是能力（⑥ 的两格并排就是它的替代）。',
    '   ── 撤 2：「宽档（≥641）两列表：键贴左缘、值贴右缘」（#879，逐变体实测裁决）。',
    '   ① 它只右对齐 `td:last-child`、不碰 `th:last-child` ⇒ 表头贴左、同列的值贴右缘，垂直对位面劈成两半',
    '      （备忘录「首次使用」1280 档实测：表头文字右缘 x=204.45、同列两行的值右缘都是 x=1245，Δ=1040.55px；',
    '      768 档 Δ=528.55px —— 641～1000 也走这条，不只宽屏）。',
    '   ② 它住错了层：表头与数据格本来就带**同一个** `cell-<align>` 档类（`blocks.ts` 的 `renderDataTable`',
    '      一处产出），同列天然对齐；「这一列是数值列」是**数据层的语义决定**，由调用方在列上声明',
    '      `align:"right"` 表达 —— 全仓两列表已有大量这样的声明（`skill-calorie/src/goal/resultDocs.ts`、',
    '      `skill-schedule/src/plan/replaySections.ts`、`skill-chef/src/view/page.ts`、',
    '      `skill-calorie/src/render/sportDocs.ts` 等），它们靠 `cell-right` 自带的 `text-align: right`',
    '      拿到「表头与值一起右对齐」。按列数（恰两列）替调用方做这个决定，只表达「碰巧两列」、',
    '      不表达「这一列是数值」，是对数据层语义的越权覆盖。',
    '   ③ 这条只作用在真正产出 `pageUiCss()` 的页面上：同一张表在卡路里／账单的在建产物里**根本没有这条规则**',
    '      （实测 `docs/skills/skill-calorie/scene02-验收墙` 87 页、`docs/skills/skill-bill` 全量各命中 0 次；',
    '      备忘录 34 页各命中 10 次）⇒ 两列表在同一个产品里长成两种样子。#728 收口那句「UI 上没问题了」',
    '      正是在这条不生效的那批页面上给的 ⇒ 撤掉是**向多数对齐**，不是新设计。',
    '   撤后行为回归数据层：数值列一条不动，两列表里的文本值不再被推到卡片右缘（该页实测 Δmax 1040.55 → 0，',
    '   行内缝隙 989 → 67px）。',
    '   ── 判别器与窄档（#728 逐页审计实测）：它同时管着下面 ≤640 那一段 —— 改前这类表在 ≤640 走 ⑥ 的卡片化，',
    '   每一格都 `td::before{content:attr(data-label)}` ⇒ 8 行的表在 390 档渲染成 **16 条列头线**',
    '   （`哪一项 … 记录编号` / `记成什么 … 116`），表体 491px 里约 224px 是纯重复；',
    '   同一张表在 1280 档只印一遍列头。判别器＝`thead tr > th:nth-child(2):last-child`',
    '   （第二枚表头就是最后一枚 ⇒ 恰两列）。三列及以上的表（候选表、多列明细）一行不动。 */',
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
    //   值取 10px，与同断点那两处同值；几何读数由 `scripts/check-two-col-align.mjs` 守（下限 8px）。
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
    '/* ⑨ 状态字抬到与正文同档（#525 第二轮票面第 3 条：状态类文字在手机档偏小）。',
    '   390 档的徽章（`block-chip`）与读数卡说明（`block-kpi-card-detail`）都是 12px，与正文差 3px、',
    '   与读数卡标签 12px 齐平 ⇒ 「状态」看不出是另一类信息。抬到 **13px**：',
    '   ① 不越过正文 15px（层级仍在，不靠加粗抢戏）；② 高于 #524 基准 §3.2 的 390 档下限 12px 一档；',
    '   ③ 与 HELP 侧 13px 那一档（`helpShell.ts` 常见档 13）逐值同。 */',
    root + ' .' + p + 'block-chip,',
    root + ' .' + p + 'block-kpi-card-detail {',
    '  font-size: 13px;',
    '}',
    '/* ⑩ 提示块图标：`⚠️`／`✅` 这类**字形图标**在手机上小且糊（用户裁定第 5 条的同一类债）。',
    '   根类之下把它换成**带文字的图标位**：字形隐去，底盘保留（`kind` 的语义色仍在），',
    '   文字用 `font-size:0` 收起后由 `::after` 写一个可读的标签。',
    '   只改观感：`aria-hidden` 的那颗字形本来就不参与朗读，标签是替代它的可见文字。',
    '   选择器必须与 `blocks.ts` 640 档那条**同名同层**（`.block-feedback-block-note .…-icon`）：',
    '   权重都是 3，本条在后 ⇒ 宽窄两档都盖得住（只用两颗类名会在 ≤640 档输给那条媒体查询）。',
    '   **#733 改**：改前这条用 `font-size: 0` 收字形 ＋ `::after { content: "已完成" }` 把词画在屏幕上——',
    '   词只活在 CSS 里（实测 32/32 页：产物里「已完成」只出现 1 次就是那行 `content:`，`<body>` 里 0 次）⇒',
    '   不可选中、不可搜索、不可复制、屏读器读不到、打印与 PDF 取不到字。',
    '   现在词由区块层写成**真文字节点**（`blocks.ts` 的 note 区，字形与词各一枚子件），',
    '   本条只做「藏字形、显词」这一件事 ⇒ 屏幕上的样子与改前一模一样，词回到文档流里。 */',
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
    '/* ⑪ 桌面档（≥1001，与 ⑧ 同一条断点）：参数表单两列并排、读数卡与正文列同宽节奏。',
    '   #728 实测的病：单列表单在 390 档每格约 350px 宽、到 1280 档被拉到版心宽（880px），',
    '   读到的是「一列长条」而不是「一张要填的表」——桌面端「没有版式，只有一条宽度补丁」。',
    '   两列把「一屏要填的格」收进一屏；说明句与预览位跨两列（它们不是一格）。',
    '   只收本配方启用页（`pageUi` 是各包 opt-in 的开关），未启用的页一行不变。 */',
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
    '/* ⑫ toast 关闭键的命中区：那一段（规则 ＋ 逐条记账）另立一件 `pageUiToast.ts`',
    '   —— 本件加它会 366 LF、越过本包 `AGENTS.md` 钉的 350 LF 告警线；拆的口子也正好是',
    '   层与层的接缝：本件管「版面与页内控件怎么摆」，那一件管「helpers 运行时注入的浮动件',
    '   怎么摆」（后者挂在 document.body 下、不在版面根之内，连启用方式都多一道）。',
    '   取值仍从本件的 `PAGE_LIMITS` 来，规则文本仍只有一处定义。 */',
    ...toastUiCss(root, PAGE_LIMITS.touchMinPx),
  ].join(LF);
}
