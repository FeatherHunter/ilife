/** T351-v7 · 「计划复盘」一族（`buildReviewDoc`，order201–206）的页内样式文本（唯一产出者）。
 *
 * 出处：老模板 `D:\2Study\StudyNotes\SKILLS\卡路里\templates\exercise_review.html`（552 行）的
 * `<style>` 段——照搬的是**观感**，不是它的脚本：老页那三段内联 JS（取数渲染／图表／复制）一个字都不搬，
 * 本仓契约 `docs/base-paint-contract.md` 写死「新契约禁内联脚本（AC-7 零注入面）／共享 JS 文本的唯一产出者」，
 * 热力图与明细表全部在渲染期落成静态 DOM（页内零取值、零事件）。
 *
 * 为什么是页内样式块：本页要的那套观感（960 页宽＋方形日期格热力图＋四色档＋双端 640 断点）属**页面级**，
 * 公共层样式表（`buildStyleSheet()` ＋ `blocksCss()`）里没有对应样式区，而本单不许动 `packages/base-*`
 * （提到公共层要另开票）。故照包内先例（`workoutPlanCss.ts` 的 `planViewCss`、`diet/libraryDocs.ts` 的
 * `FOOD_CSS`、`body/bodyDocs.ts` 的 `MEASURE_CSS`）落成一件页内 CSS 文本，随正文进内容区——
 * 它晚于 head 里的共享样式表，同特异性下本页胜。
 *
 * 老 token 名 → 本仓冻结 token（`CSS_VAR_TOKENS`）的映射：老页 `:root` 那 13 个名**一律不重定义**，
 * 只在页面壳作用域里取同义别名——`--bg`／`--card`／`--line`／`--fg`／`--fg2`／`--fg3`／`--ok` 七个同值同名；
 * 老页 `--accent`（#0071e3）与冻结 `--blue`（#007aff）是同一支主色（Q12 已锁 B1），本页只用后者。
 * 老页 `--orange:#ff9500`／`--red:#ff3b30` 在本仓**没有冻结对应**，照老值写死（同 `workoutPlanCss.ts`
 * 处理 `--lineS:#e8e8ed` 的成例）；它们只出现在热力图的「未完成」格上，不散到别处。
 *
 * 双端：老模板那一处 `@media (max-width:640px)` 逐条搬（页壳内边距／标题字号／热力图间距／
 * 日期格由正方改为最小高 52／日期字号／四档卡两列＋奇数末位通栏）。老页 `.hero`／`.btn`／
 * `#backTop` 三组**不搬**：本页头部走共享页面壳（B-01）、按钮走共享复制区，本页不重画别人的件。
 * 打印：热力图与明细表都是内容，照常印；日期格的底色来自 CSS 类，浏览器默认不打印背景色，
 * 故格内文字本身写全状态词（「完成／未完成／未排训练」），黑白打印也读得出。
 */

/** 热力图一格：日期 ＋ 状态词（状态词是文字的**唯一出处**，打印丢底色也读得懂）。 */
const CELL = '.ilr-cell{border:1px solid var(--line);border-radius:10px;background:var(--bg);'
  + 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;'
  + 'padding:8px;font-size:11px;color:var(--fg3);text-align:center;overflow:hidden}';

/** 静态段（与数据无关的那部分）；逐条都对着老模板的对应行写。 */
const STATIC_CSS = [
  '/* 老 .wrap：页宽 960 居中（共享页面模板缺省 960 同值，这里显式钉住，免被别页改宽）＋老页的上下内边距 */',
  '.ilife-block-page-shell{box-sizing:border-box;max-width:960px;padding:32px 20px 60px}',
  '/* 老 .section／.section h2：白底 16 圆角卡 ＋ 标题前一根主色小竖条 */',
  '.ilr-sec{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px 24px;'
    + 'margin-bottom:14px;box-shadow:var(--shadow)}',
  '.ilr-sec-title{display:flex;align-items:center;gap:8px;margin:0 0 14px;font-size:16px;font-weight:600;'
    + 'color:var(--fg)}',
  '.ilr-sec-title::before{content:"";width:4px;height:16px;background:var(--blue);border-radius:2px}',
  '/* 老 .heatmap：七列栅格（一周一行），列宽可压、不溢出 */',
  '.ilr-hm{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}',
  CELL,
  '/* 格内两行：日期小字 ＋ 状态词；状态词不换行 */',
  '.ilr-cell-date{font-size:10px;opacity:.85;white-space:nowrap}',
  '.ilr-cell-txt{font-size:13px;font-weight:700;white-space:nowrap}',
  '/* 老 .day-cell.r100／.rest：完成走成功色、未完成走红、未排训练走浅底。字母色取老页同值 */',
  '.ilr-done{background:var(--ok);border-color:var(--ok);color:#fff}',
  '.ilr-miss{background:#ff3b30;border-color:#ff3b30;color:#fff}',
  '.ilr-rest{background:var(--bg);color:var(--fg3)}',
  '/* 首行补的空位：只用来把日期按周一列对齐，不着色不画边 */',
  '.ilr-pad{border:0;background:transparent}',
  '/* 老 .legend：图例一行居中，随窄屏换行 */',
  '.ilr-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:14px;'
    + 'font-size:11.5px;color:var(--fg2)}',
  '.ilr-legend-item{display:inline-flex;align-items:center;gap:5px}',
  '.ilr-dot{display:inline-block;width:10px;height:10px;border-radius:3px}',
  '.ilr-dot-done{background:var(--ok)}',
  '.ilr-dot-miss{background:#ff3b30}',
  '.ilr-dot-rest{background:var(--bg);border:1px solid var(--line)}',
  '/* 截断明示（沿 R3 口径）：热力图只画前 N 天时说清楚，不静默少画 */',
  '.ilr-note{margin:10px 0 0;font-size:12px;color:var(--fg2)}',
  '/* 老模板 @media (max-width:640px)：页壳／标题／热力图／四档卡两列＋奇数末位通栏 */',
  '@media (max-width:640px){',
  '.ilife-block-page-shell{padding:20px 12px 48px}',
  '.ilife-block-page-shell-title{font-size:24px}',
  '.ilr-hm{gap:4px}',
  '.ilr-cell{aspect-ratio:auto;min-height:52px;border-radius:8px;padding:4px 2px;gap:1px}',
  '.ilr-cell-date{font-size:9px}',
  '.ilr-cell-txt{font-size:11px}',
  '.ilr-legend{gap:10px;font-size:11px}',
  '.ilife-block-kpi-card-grid{grid-template-columns:repeat(2,1fr)}',
  '.ilife-block-kpi-card-grid>.ilife-block-kpi-card:nth-child(odd):last-child{grid-column:span 2}',
  '}',
].join('\n');

/** 页内样式块（含 `<style>` 包裹，照包内先例 `FOOD_CSS`／`MEASURE_CSS`／`planViewCss` 直插正文）。
 *  本族没有按数据生成的规则（热力图的格子是静态 DOM，不靠选择器收放），故无入参。 */
export function reviewViewCss(): string {
  return '<style>\n' + STATIC_CSS + '\n</style>';
}
