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
 *   · `env(safe-area-inset-*)`（HELP toast 与回顶按钮同法；须配 `viewport-fit=cover`）；
 *   · 页脚留白 60px（HELP `.ilife-help-shell` 640 档 `padding: 20px 16px 60px` 逐值同）；
 *   · 读数卡窄屏两格 → 400 档单列（HELP `.ilife-help-shell-grid` 640 档单列的同一条意图）；
 *   · 页内定位：带 `id` 的区块吃 `scroll-margin-top`，锚点跳转不把标题顶到视口外。
 *
 *  **全部规则都挂在根类 `.ilife-page-ui` 之下**：没启用本配方的页面一条都命中不到
 *  （产出物逐字节不变，登录门读数见证据件）。
 */

/** 起点色值口径：与 `blocks.ts` 同一条冻结 token 表；本件不新增 token、不新增色值。 */
const LF = String.fromCharCode(10);

/** 页面级配方的根类名：整页装配把这一颗类加到版面根上（`docPage.ts` 的 `pageUi` 位）。 */
export const PAGE_UI_CLASS = 'ilife-page-ui';

/** 配 `viewport-fit=cover` 的 viewport 串（`env(safe-area-inset-*)` 在 iOS 上不写它恒取 0）。
 *  只在启用本配方时用它替换旧串；不给即老串（旧调用方逐字节不变）。 */
export const PAGE_UI_VIEWPORT = 'width=device-width,initial-scale=1,viewport-fit=cover';

export interface PageUiCssInput {
  /** 类名前缀；缺省 `ilife-`（与 `blocksCss({ prefix })` 同口径）。 */
  readonly prefix?: string;
}

/** 页面级移动端配方的样式资产唯一产出者。恒返回非空 CSS 文本。 */
export function pageUiCss(input?: PageUiCssInput): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
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
    '/* ⑤ 触摸区：窄屏下所有可点元素命中区 ≥44×44px（HELP 820 档同值）。',
    '   只改 min-height 与最小内距，不动任何既有选择器的语义。 */',
    '@media (max-width: 820px) {',
    '  ' + root + ' .' + p + 'copy-btn,',
    '  ' + root + ' .' + p + 'copy-menu-item,',
    '  ' + root + ' .' + p + 'action-btn,',
    '  ' + root + ' .' + p + 'block-toc a,',
    '  ' + root + ' .' + p + 'block-disclosure-summary,',
    '  ' + root + ' .' + p + 'block-param-form-input {',
    '    min-height: 44px;',
    '  }',
    '  /* 页内导航按胶囊排（inline 元素上 min-height 不生效，须转 inline-flex）。 */',
    '  ' + root + ' .' + p + 'block-toc a {',
    '    display: inline-flex;',
    '    align-items: center;',
    '    padding-top: 0;',
    '    padding-bottom: 0;',
    '  }',
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
    '    font-size: 12px;',
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
    '    color: var(--fg3);',
    '    font-size: 11.5px;',
    '    font-weight: 600;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table:has(td[' + 'data-label]) td.' + p + 'block-data-table-cell-right {',
    '    min-width: 0;',
    '  }',
    '}',
    '/* ⑦ ≤400 档：读数卡塌单列（HELP `.ilife-help-shell-grid` 640 档单列的同一条意图，',
    '   在 400 档执行——本仓页面自有的 400 断点，不新造值）。 */',
    '@media (max-width: 400px) {',
    '  ' + root + ' .' + p + 'block-kpi-card-grid {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '}',
  ].join(LF);
}
