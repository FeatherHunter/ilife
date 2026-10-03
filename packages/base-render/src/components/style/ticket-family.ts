/** 票据纸族样式（**#1124 从 skill 侧 docPage.ts 上移**；按 #1082 §23 归属到 base 组件）。
 *
 *  本件是**搬家件**：逐条规则按它的选择器主人归属（见每条前的 `owner:` 注），但**拼接顺序保持搬家前逐字不变**
 *  （`assembleSheetPage` 的注释写明：族样式与皮肤在前、本页家具在后——家具那几条是页面级几何覆盖，靠「后出现」取胜）。
 *  所以：`ticketFamilyCss()` 的返回值与搬家前 `docPage.ts` 的 `TICKET_CSS` **逐字节相同**；
 *  `ticketFurnitureCss()` 与 `TICKET_FURNITURE_CSS` **逐字节相同**。
 *
 *  归属（§23 的 12 目录清单里与本段相关的 8 个）：
 *    sheet-frame（页与纸的几何／窄档）／summary-head（主数字块）／ledger-rows（账目行）／
 *    entry-card（明细卡与行）／copy-button（复制区两枚钮）／ticket-button（主按钮那一族）／
 *    ticket-section（段标题）／check-row（对账卡）／sheet-head（店头内距）／punch-strip（页尾锯齿，随 sheet-frame）。
 */

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 票据纸族样式段（＝搬家前 docPage.ts 的 `TICKET_CSS`，逐字节相同）。 */
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
  '/* 危险档段标题（原型 `.sec-heading.danger`）：只换主色条那一枚色。 */',
  '.ilife-ticket-sec-heading.is-danger::before { background: var(--ilife-danger); }',
  '/* 主数字块（原型 `.summary-head`）：整块居中，下留 16px；印章钉右上角并微斜（公共层票据纸版式给形，',
  '   这里补齐原型的三处几何：内距 6px、脚行不占位（印章是绝对定位的，脚行只剩一枚空槽）、',
  '   下面那两行小字居中）。 */',
  '.ilife-ticket-summary { padding: 0 0 16px; text-align: center; }',
  '.ilife-ticket-summary .ilife-block-summary-head.is-ticket { padding: 6px 0 0; }',
  '/* 脚行距：公共层列向 flex 的 4px gap 之外补 9px ⇒ 与原型 note 距主数字 10px 同距（实测三档视口一致）。 */',
  '.ilife-ticket-summary .ilife-block-summary-head.is-ticket .ilife-block-summary-head-foot { margin-top: 9px; }',
  '/* 没有脚行小字时，那一枚空槽不占版面（印章是绝对定位的，仍钉在右上角）。 */',
  '.ilife-ticket-summary .ilife-block-summary-head.is-ticket .ilife-block-summary-head-foot > span:empty { display: none; }',
  '.ilife-ticket-summary .ilife-block-summary-head.is-ticket .ilife-block-summary-head-stamp { font-weight: 900; opacity: .92; }',
  '/* 眉标药丸：字距照原型 2px（公共层票据纸版式取的是 .12em，12px 下 1.44px）。 */',
  '.ilife-ticket-summary .ilife-block-summary-head.is-ticket .ilife-block-summary-head-eyebrow { letter-spacing: 2px; }',
  '.ilife-ticket-summary-note { margin: 10px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--ilife-ink-2); }',
  '.ilife-ticket-summary-note b { color: var(--ilife-ink); }',
  '/* 时刻行在原型里是 `.summary-head` 的最后一个子块（6px 距）；本仓把它放在头块之外，故补足同一距离。 */',
  '.ilife-ticket-summary-time { margin: 10px 0 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13.5px; color: var(--ilife-ink-2); }',
  '/* 账目行：详情页那几行照原型抬到 44px 触摸档（回执页 4 行是 9px 行距、不抬）；',
  '   两页的值列行高在原型里也不同：详情 1.55（可折行）、回执 1.4（单行紧排）。 */',
  '.ilife-ticket-detail .ilife-block-ledger-rows.is-ticket .ilife-block-ledger-row, .ilife-ticket-receipt .ilife-block-ledger-rows.is-ticket .ilife-block-ledger-row { min-height: 44px; }',
  '.ilife-ticket-receipt .ilife-block-ledger-rows.is-ticket .ilife-block-ledger-row-value { line-height: 1.4; font-variant-numeric: normal; }',
  '/* 回执行间那条**看不见的** 1px 上边线：原型写的就是 `1px dotted transparent`（不画线，只占 1px 行高），',
  '   不补它整块矮 3px、下面的段落跟着上移。 */',
  '.ilife-ticket-receipt .ilife-block-ledger-rows.is-ticket .ilife-block-ledger-row + .ilife-block-ledger-row { border-top: 1px dotted transparent; }',
  '/* 落点状态行（w17 v2.1）：原型即纯文本、无胶囊，详情页不再发出 `.is-status` 行，',
  '   下面两条状态胶囊样式随之删除（回执两页从未用过，删后零命中、不留死代码）。 */',
  '/* 对账卡（w17 v2.1 CHECK 行）：浅绿卡＋圆点＋一行字；已撤销走危险档。只详情页发出。 */',
  '.ilife-ticket-check { display: flex; align-items: flex-start; gap: 8px; margin-top: 10px; padding: 10px 12px; border: 1px solid #cfe6d6; border-radius: var(--ilife-radius-sm); background: #f4fbf6; color: #3e5a4a; font-size: 12.8px; line-height: 1.6; overflow-wrap: anywhere; }',
  '.ilife-ticket-check-dot { flex: none; width: 8px; height: 8px; margin-top: 6px; border-radius: 999px; background: #2f9e5f; }',
  '.ilife-ticket-check.is-danger { border-color: #ecc9c2; background: var(--ilife-danger-soft); color: #6d2118; }',
  '.ilife-ticket-check.is-danger .ilife-ticket-check-dot { background: var(--ilife-danger); }',
  '/* 纸外脚注（w17 v2.1 foot-note）：纸外、页内居中一行小字；只详情页发出。 */',
  '.ilife-bill-sheet-page .ilife-ticket-foot { margin: 10px 0 0; font-size: 12px; line-height: 1.6; color: var(--ilife-ink-3); text-align: center; }',
  '/* 明细卡（原型 `.entry-card`／`.entry-rows`）：米黄卡 ＋ 编号胶囊 ＋ 实付行高亮。 */',
  '.ilife-ticket-card { background: var(--ilife-surface-2); border: 1px solid var(--ilife-line); border-radius: var(--ilife-radius-card, var(--ilife-radius-sm)); padding: 12px 13px 11px; }',
  '.ilife-ticket-entries { list-style: none; margin: 0; padding: 0; counter-reset: ilife-ticket-row; }',
  '.ilife-ticket-entries > li { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px dotted var(--ilife-line); font-size: 14px; min-height: 44px; line-height: 1.55; }',
  '.ilife-ticket-entries > li:last-child { border-bottom: 0; }',
  '.ilife-ticket-entries > li::before { counter-increment: ilife-ticket-row; content: counter(ilife-ticket-row); flex: 0 0 22px; height: 22px; margin-top: 1px; border: 1px solid var(--ilife-line); border-radius: var(--ilife-radius-tag, var(--ilife-radius-sm)); background: var(--ilife-surface-2); color: var(--ilife-ink-3); font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }',
  '.ilife-ticket-entry-text { flex: 1 1 auto; overflow-wrap: anywhere; word-break: break-all; }',
  '.ilife-ticket-entries > li.is-pay { margin: 8px 0; padding: 10px 12px; border: 1px solid var(--ilife-line); border-radius: var(--ilife-radius-sm); background: var(--ilife-surface); }',
  '.ilife-ticket-entries > li.is-pay .ilife-ticket-entry-text { font-size: 15px; font-weight: 800; }',
  '.ilife-ticket-entries > li.is-pay::before { background: var(--ilife-ink); border-color: var(--ilife-ink); color: var(--ilife-surface); }',
  '/* 次按钮那一族是公共层复制区的产物（`.ilife-copy-btn`），这里按原型 `.btn-secondary` 改形状：',
  '   整行宽、13px 圆角、白底暖边。高度钉 47px＝原型那一颗的**实测盒高**（它的标签里带着一个 `▾` 字符，',
  '   那一枚字形把行盒抬到 23px ⇒ 12+23+12）；本仓的三角由 CSS 画、行盒只有 21px ⇒ 不钉就矮 2px，',
  '   连带下面的裁切线与页脚各上移 2px。只在本族根类之下生效。 */',
  '.ilife-ticket-actions { padding: 14px 0 4px; }',
  '/* 复制区宽度：票据纸的复制钮一律收 340 居中（原型 overlay 的同一取值）。**一处定义**：' + 
  '   setup 与 query 两域的票据纸都读这条，页面侧不再各写一条。 */',
  '.ilife-bill-sheet-page .ilife-ticket-actions { max-width: 340px; margin-inline: auto; }',
  '/* 退出口那一行口径（原型 `.caliber`：12px、行高 1.7、居中、左右各 2px）。 */',
  '.ilife-ticket-actions .ilife-block-caliber { margin: 10px 2px 0; line-height: 1.7; text-align: center; color: var(--ilife-ink-2); }',
  '.ilife-ticket-btn { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 48px; padding: 12px 14px; border: 0; border-radius: var(--ilife-radius-sm); font-family: inherit; font-size: 16px; font-weight: 800; letter-spacing: .5px; line-height: normal; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }',
  '.ilife-ticket-btn.is-primary { background: linear-gradient(180deg, color-mix(in srgb, var(--ilife-danger) 82%, var(--ilife-surface)) 0%, var(--ilife-danger) 100%); color: var(--ilife-surface); box-shadow: 0 8px 20px color-mix(in srgb, var(--ilife-danger) 28%, transparent), inset 0 1px 0 color-mix(in srgb, var(--ilife-surface) 25%, transparent); }',
  '.ilife-bill-sheet-page .ilife-block-copy-block { margin: 0; }',
  '.ilife-bill-sheet-page .ilife-action-bar { margin: 0; max-width: none; gap: 0; }',
  '.ilife-bill-sheet-page .ilife-action-row-ghost { display: flex; flex-direction: column; gap: 0; }',
  '.ilife-bill-sheet-page .ilife-copy-menu-wrap { width: 100%; margin-top: 10px; }',
  '.ilife-bill-sheet-page .ilife-copy-menu-wrap + .ilife-copy-btn { margin-top: 10px; }',
  '.ilife-bill-sheet-page .ilife-copy-btn { width: 100%; min-height: 44px; padding: 12px 14px; border: 1.5px solid #ddd0b6; border-radius: var(--ilife-radius-sm); background: #fff; color: #4a4236; font-size: 14.5px; font-weight: 800; letter-spacing: .5px; line-height: normal; }',
  '.ilife-bill-sheet-page .ilife-copy-btn.copied { border-color: var(--ilife-ok); background: var(--ilife-ok); color: var(--ilife-surface); }',
  '.ilife-bill-sheet-page .ilife-copy-menu { left: 0; right: 0; min-width: 0; max-width: none; padding: 6px; border: 1.5px solid #ddd0b6; border-radius: var(--ilife-radius-sm); background: #fff; box-shadow: var(--ilife-shadow-pop); }',
  '.ilife-bill-sheet-page .ilife-copy-menu-item { min-height: 44px; padding: 10px 12px; border-radius: var(--ilife-radius-sm); font-size: 13.5px; font-weight: 700; color: var(--ilife-ink); }',
  '.ilife-bill-sheet-page .ilife-copy-menu-item > .ilife-copy-menu-label { font-size: 13.5px; font-weight: 700; color: var(--ilife-ink); }',
  '.ilife-bill-sheet-page .ilife-copy-menu-item > .ilife-copy-menu-hint { font-size: 11.5px; font-weight: 600; color: var(--ilife-ink-2); }',
  '/* 窄档（原型 390 档；仓内既有断点取 400）：桌内距与纸内距收一档、主数字收一档。 */',
  '@media (max-width: 400px) {',
  '  .ilife-bill-sheet-page { padding: 18px 10px 36px; }',
  '  .ilife-bill-sheet-page .ilife-block-sheet.is-ticket { padding: 18px 22px 8px; }',
  '  .ilife-bill-sheet-page .ilife-ticket-summary .ilife-block-summary-head.is-ticket .ilife-block-summary-head-value { font-size: 50px; }',
  '  .ilife-sheet-title { font-size: 18px; }',
  '  .ilife-bill-sheet-page .ilife-block-ledger-row-value { max-width: 58%; }',
  '}',
  /* #1124 §22：账户域复制区 guards 从页面搬来（逐字节，作用域原样保留）——页面侧不再自出这一段。 */
  'section[data-key="account.write"] .ilife-block-copy-block, section[data-key="account.query"] .ilife-block-copy-block { max-width: 340px; margin-inline: auto; text-align: center; }',
  'section[data-key="account.write"] .ilife-action-row-ghost, section[data-key="account.query"] .ilife-action-row-ghost { display: flex; flex-direction: column; align-items: center; gap: 8px; }',
  'section[data-key="account.write"] .ilife-copy-menu-wrap, section[data-key="account.query"] .ilife-copy-menu-wrap { width: 100%; max-width: 340px; margin-inline: auto; justify-content: center; }',
  'section[data-key="account.write"] .ilife-copy-btn, section[data-key="account.query"] .ilife-copy-btn { width: 100%; max-width: 340px; justify-content: center; text-align: center; }',
  'section[data-key="account.write"] .ilife-copy-menu-wrap > .ilife-copy-btn::after, section[data-key="account.query"] .ilife-copy-menu-wrap > .ilife-copy-btn::after { content: " \\25BE"; border: none !important; width: auto; height: auto; margin-left: 6px; transform: none !important; }',
  'section[data-key="account.write"] .copy-menu-open.ilife-copy-menu-wrap > .ilife-copy-btn::after, section[data-key="account.query"] .copy-menu-open.ilife-copy-menu-wrap > .ilife-copy-btn::after { transform: none !important; }',
  'section[data-key="account.write"] [data-action-id="ilife-copy-log"]::after, section[data-key="account.query"] [data-action-id="ilife-copy-log"]::after { content: " \\25BE"; visibility: hidden; margin-left: 6px; }',
  'section[data-key="account.write"] .ilife-copy-btn.copied::after, section[data-key="account.query"] .ilife-copy-btn.copied::after { content: none !important; }',
  'section[data-key="account.write"] .ilife-block-param-form-input, section[data-key="account.query"] .ilife-block-param-form-input { min-width: 0; max-width: 100%; width: 100%; box-sizing: border-box; }',
  'section[data-key="account.write"] .ilife-block-param-form-field, section[data-key="account.query"] .ilife-block-param-form-field { min-width: 0; max-width: 100%; }',
  'section[data-key="account.write"] select.ilife-block-param-form-input, section[data-key="account.query"] select.ilife-block-param-form-input { min-height: 44px; }',
  /* #1124 §22：目标域复制区 guards 从页面搬来（逐字节，作用域原样保留）——页面侧不再自出这一段。 */
  'section[data-key="goal.write"] .ilife-block-copy-block, section[data-key="goal.query"] .ilife-block-copy-block { max-width: 340px; margin-inline: auto; text-align: center; }',
  'section[data-key="goal.write"] .ilife-action-row-ghost, section[data-key="goal.query"] .ilife-action-row-ghost { display: flex; flex-direction: column; align-items: center; gap: 8px; }',
  'section[data-key="goal.write"] .ilife-copy-menu-wrap, section[data-key="goal.query"] .ilife-copy-menu-wrap { width: 100%; max-width: 340px; margin-inline: auto; justify-content: center; }',
  'section[data-key="goal.write"] .ilife-copy-btn, section[data-key="goal.query"] .ilife-copy-btn { width: 100%; max-width: 340px; justify-content: center; text-align: center; }',
  'section[data-key="goal.write"] .ilife-copy-menu-wrap > .ilife-copy-btn::after, section[data-key="goal.query"] .ilife-copy-menu-wrap > .ilife-copy-btn::after { content: " \\25BE"; border: none !important; width: auto; height: auto; margin-left: 6px; transform: none !important; }',
  'section[data-key="goal.write"] .copy-menu-open.ilife-copy-menu-wrap > .ilife-copy-btn::after, section[data-key="goal.query"] .copy-menu-open.ilife-copy-menu-wrap > .ilife-copy-btn::after { transform: none !important; }',
  'section[data-key="goal.write"] [data-action-id="ilife-copy-log"]::after, section[data-key="goal.query"] [data-action-id="ilife-copy-log"]::after { content: " \\25BE"; visibility: hidden; margin-left: 6px; }',
  'section[data-key="goal.write"] .ilife-copy-btn.copied::after, section[data-key="goal.query"] .ilife-copy-btn.copied::after { content: none !important; }',
  'section[data-key="goal.write"] .ilife-block-param-form-input, section[data-key="goal.query"] .ilife-block-param-form-input { min-width: 0; max-width: 100%; width: 100%; box-sizing: border-box; min-height: 44px; }',
  'section[data-key="goal.write"] .ilife-block-param-form-field, section[data-key="goal.query"] .ilife-block-param-form-field { min-width: 0; max-width: 100%; }',
].join('\n');

/** 票据纸页内家具样式段（＝搬家前 docPage.ts 的 `TICKET_FURNITURE_CSS`，逐字节相同）。 */
export const TICKET_FURNITURE_CSS = [
  '.ilife-ticket-receipt .ilife-block-ledger-rows.is-mono-first .ilife-block-ledger-row:first-child .ilife-block-ledger-row-value, .ilife-ticket-detail .ilife-block-ledger-rows.is-mono-first .ilife-block-ledger-row:first-child .ilife-block-ledger-row-value { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; font-weight: 700; }',
  '.ilife-ticket-receipt .ilife-block-summary-head.is-warn-head .ilife-block-summary-head-eyebrow, .ilife-ticket-detail .ilife-block-summary-head.is-warn-head .ilife-block-summary-head-eyebrow { background: var(--ilife-warn-soft); border-color: #e8d3a8; color: var(--ilife-warn); }',
  '.ilife-ticket-receipt .ilife-block-summary-head.is-warn-head .ilife-block-summary-head-eyebrow::before, .ilife-ticket-detail .ilife-block-summary-head.is-warn-head .ilife-block-summary-head-eyebrow::before { background: #b97a1a; }',
  '.ilife-ticket-receipt .ilife-ticket-entries > li.is-star::before, .ilife-ticket-detail .ilife-ticket-entries > li.is-star::before { content: "★"; background: var(--ilife-ink); border-color: var(--ilife-ink); color: var(--ilife-surface); }',
  '.ilife-ticket-receipt .ilife-ticket-entry-sub, .ilife-ticket-detail .ilife-ticket-entry-sub { display: block; color: var(--ilife-ink-2); font-size: 12px; font-weight: 400; }',
  '.ilife-ticket-receipt .ilife-ticket-entries > li.is-done::before, .ilife-ticket-detail .ilife-ticket-entries > li.is-done::before, .ilife-ticket-receipt .ilife-ticket-entries > li.is-ok::before, .ilife-ticket-detail .ilife-ticket-entries > li.is-ok::before { background: var(--ilife-ok); border-color: var(--ilife-ok); color: var(--ilife-surface); }',
  '.ilife-ticket-receipt .ilife-ticket-entries > li.is-now::before, .ilife-ticket-detail .ilife-ticket-entries > li.is-now::before { background: var(--ilife-warn); border-color: var(--ilife-warn); color: var(--ilife-surface); }',
  '.ilife-ticket-receipt .ilife-ticket-entries > li.is-bad::before, .ilife-ticket-detail .ilife-ticket-entries > li.is-bad::before { background: var(--ilife-danger); border-color: var(--ilife-danger); color: var(--ilife-surface); }',
  '.ilife-ticket-receipt .ilife-ticket-check.is-warn, .ilife-ticket-detail .ilife-ticket-check.is-warn { background: var(--ilife-warn-soft); border-color: #e8d3a8; color: #5f4413; }',
  '.ilife-ticket-receipt .ilife-ticket-check.is-warn .ilife-ticket-check-dot, .ilife-ticket-detail .ilife-ticket-check.is-warn .ilife-ticket-check-dot { background: #b97a1a; }',
  '.ilife-ticket-receipt .ilife-ticket-prompt, .ilife-ticket-detail .ilife-ticket-prompt { margin-top: 10px; padding: 10px 12px; border: 1px solid #f0d9bd; border-radius: var(--ilife-radius-sm); background: #fff8ee; color: #4a4236; font-size: 13px; line-height: 1.7; }',
  '.ilife-ticket-receipt .ilife-ticket-prompt .ilife-ticket-prompt-mono, .ilife-ticket-detail .ilife-ticket-prompt .ilife-ticket-prompt-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; }',
].join('\n');

/** 族样式段（调用方显式拼；`assembleSheetPage` 用它替掉原来的 `TICKET_CSS` 槽位）。 */
export function ticketFamilyCss(): string {
  return TICKET_CSS;
}

/** 页内家具样式段（`ticketFurnitureStyleTag()` 的正文来源）。 */
export function ticketFurnitureCss(): string {
  return TICKET_FURNITURE_CSS;
}
