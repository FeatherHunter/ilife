/** pageNavCss · #950：本族样式的**唯一产出者**（自产出器那件整段搬来，选择器与值一字未改）。
 *
 *  为什么分开住：产出器那件（`./pageNav.js`）带上这一整段就 455 行、越过本包 350 行告警线；
 *  照仓内先例（`src/render/reviewDocsCss.ts`：样式另立姊妹件、出口经件薄转出），本族样式单独一件，
 *  产出器那件只留形状与类型，两边都落回线内。由 `pageShapeCss()` 汇总进页。
 */

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／`pageShapes.ts` 同）。 */
const LF = String.fromCharCode(10);

/* ══════════════════════════════════════════════════════════════
 * 样式（本族）：与产出器**分住两件**（本件）——照仓内 `reviewDocsCss.ts` 的先例，产出器那件只留形状与类型。
 * ══════════════════════════════════════════════════════════════ */

/** 两件的样式唯一产出者。恒返回非空 CSS 文本（由 `pageShapeCss()` 汇总进页）。 */
export function pageNavCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  return [
    '/* ① 胶囊行：**带容器**的一行小签。胶囊本体沿用既有 `block-chip` 形状（`blocks.ts` 的 */',
    '/*   `chipButton` 区），本条只补「容器 ＋ 语气色 ＋ 行内元素不被网格拉伸」三件。 */',
    root + ' .' + p + 'block-chip-row {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 6px 8px;',
    '  margin: 0;',
    '}',
    root + ' .' + p + 'block-chip-row > .' + p + 'block-chip {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  box-sizing: border-box;',
    '  min-height: 30px;',
    '  /* C2 守卫：行内级元素**不被网格拉伸**（⑧ 的 `> *` 会给它整列宽，看上去像一根长条） */',
    '  max-width: 100%;',
    '  white-space: nowrap;',
    '}',
    root + ' .' + p + 'block-chip-ok {',
    '  border-color: rgba(52, 199, 89, .38);',
    '  background: rgba(52, 199, 89, .12);',
    '  color: #1a7f4b;',
    '}',
    root + ' .' + p + 'block-chip-warn {',
    '  border-color: rgba(199, 119, 0, .34);',
    '  background: rgba(255, 159, 10, .14);',
    '  color: #a15a06;',
    '}',
    root + ' .' + p + 'block-chip-danger {',
    '  border-color: rgba(192, 57, 43, .34);',
    '  background: rgba(255, 59, 48, .12);',
    '  color: #8f2f24;',
    '}',
    '/* ② 分段导航：等宽分格 ＋ 选中实底。做「动作」的形，不做「状态」的形。 */',
    root + ' .' + p + 'block-seg-nav {',
    '  display: flex;',
    '  gap: 4px;',
    '  padding: 4px;',
    '  background: var(--soft);',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + 14 + 'px;',
    '}',
    root + ' .' + p + 'block-seg-nav.is-sticky {',
    '  position: sticky;',
    '  top: 0;',
    '  z-index: 5;',
    '}',
    root + ' .' + p + 'block-seg-nav-item {',
    '  flex: 1 1 0;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  gap: 7px;',
    '  box-sizing: border-box;',
    '  min-height: 44px;',
    '  min-width: 0;',
    '  padding: 0 10px;',
    '  border-radius: ' + 8 + 'px;',
    '  color: var(--fg2);',
    '  font-size: 13.5px;',
    '  font-weight: 600;',
    '  text-decoration: none;',
    '}',
    root + ' .' + p + 'block-seg-nav-item > svg {',
    '  width: 15px;',
    '  height: 15px;',
    '  flex: none;',
    '}',
    root + ' .' + p + 'block-seg-nav-item.is-on {',
    '  background: var(--card);',
    '  color: var(--fg);',
    '  box-shadow: ' + '0 1px 2px rgba(0, 0, 0, .08), inset 0 0 0 1px rgba(0, 0, 0, .04)' + ';',
    '}',
    root + ' .' + p + 'block-seg-nav-item:focus-visible {',
    '  outline: 2px solid var(--blue);',
    '  outline-offset: 2px;',
    '}',
    root + ' .' + p + 'block-seg-nav-count {',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '}',
    '@media (max-width: 640px) {',
    '  ' + root + ' .' + p + 'block-seg-nav-item {',
    '    gap: 5px;',
    '    padding: 0 6px;',
    '    font-size: 12.5px;',
    '  }',
    '  ' + root + ' .' + p + 'block-seg-nav-count {',
    '    display: none;',
    '  }',
    '}',
  ].join(LF);
}
