/** #538 路页内样式（身体域两张预检确认页共用）：`<style>` 串，由调用方放在 `content` 第一项
 *  （`assembleDocPage` 没有页内 CSS 入口，这是仓内既有的页内样式落法，见 `receiptUi.ts:22`）。
 *
 *  为什么这一族要页内样式：预检确认页的主战场是参数表单，而公共层的表单是**一行一字段**——
 *  宽屏下六个短字段各占一整条约 1000px 的横杠（编排者 2026-09-15 截图复核点名）。
 *  本件把表单在 ≥641px 排成两列（长字段用 `.wz-wide` 独占一行），窄屏照旧一列。
 *
 *  三档断点只用仓内既有值（640／400／820）：本件只用 640 一档，其余走公共层。
 *  颜色只用冻结 token（`--fg3`／`--line`），间距走 4／8 倍数。 */
export function wizardUiCss(): string {
  return '<style>'
    // 宽屏两列：短字段并排（说明句占第一格，正好给这一串字段当小标题）；窄屏照旧一列。
    + '@media (min-width: 641px) {'
    + ' .ilife-block-param-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px;align-items:start}'
    + ' .ilife-block-param-form > *{margin:0}'
    + ' .ilife-block-param-form-description{max-width:46ch}'
    + '}'
    // 复制区：按钮与上面的小节标题／表单**同一条左基线**（不改的话公共层按内容居中，看着像错位），
    // 并按内容宽排一行（宽屏不再各占半宽）。
    + '.ilife-block-copy-block{text-align:left}'
    + '.ilife-block-copy-block .ilife-action-bar{justify-content:flex-start}'
    + '@media (min-width: 641px) {'
    + ' .ilife-action-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-start}'
    + ' .ilife-action-row{flex:0 0 auto}'
    + ' .ilife-copy-btn,.ilife-copy-btn-wide{width:auto;min-width:132px}'
    + '}'
    // 输入框看得见：公共层的框是「无边框 ＋ 页面底色填充」，放到白底的这一族页面上几乎与背景同色
    // （截图上空字段看着像没有框）。这里只给框加一条 1px 的 `--line` 边线，配色与尺寸都不动。
    + '.ilife-block-param-form-input{border:1px solid var(--line);background:var(--card)}'
    + '.ilife-block-param-form-input:focus{border-color:var(--blue)}'
    // 页头类型徽章窄屏别掉到 11px（本波「390 档正文类 ≥12px」下线）。
    + '@media (max-width: 640px) { .type-badge{font-size:12px} }'
    + '</style>';
}
