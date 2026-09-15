/** T351-v8 · 「计划复盘」一族（`buildReviewDoc`，order201–206）的页内样式（唯一产出者）。
 *
 * 观感出处：老模板 `D:\2Study\StudyNotes\SKILLS\卡路里\templates\exercise_review.html` 的 `<style>` 段
 * （页宽、卡片圆角、热力图七列、双端断点）。老页的内联 JS 一个字不搬——本仓契约
 * `docs/base-paint-contract.md` 写死「新契约禁内联脚本（AC-7 零注入面）」，热力图与明细表全部在
 * 渲染期落成静态 DOM（页内零取值、零事件）。
 *
 * **手机端口径照 HELP 页面（负责人 2026-09-15 第 2 条）**，不是照老模板那处 640：
 * `packages/base-render/src/helpShell.ts` 里 HELP 的断点是 **820**，并且有四条固定手法——
 *   ① **触摸目标 ≥44px**、`-webkit-tap-highlight-color:transparent`、`touch-action:manipulation`；
 *   ② **按钮行自约束宽度并居中**（`.hm-actions{max-width:520px;margin:0 auto}`，防被容器拉成半屏宽）；
 *   ③ **横向一行在窄屏塌成纵向一列**（`.sl-batchbar{flex-direction:column;align-items:stretch}`）；
 *   ④ **窄屏收紧内距**（`.hm-error{padding:16px 14px}`）。
 * 本件把这四条逐条落到本页：断点 820、按钮行 520 居中、窗口条与统计卡塌成单列、页壳内距收紧。
 *
 * **样式与文本的分工（负责人 2026-09-15 第 5 条）**：页面正文里**不许**再用 `·`／`；` 把好几件事
 * 串成一句话——那种写法是拿符号顶替设计。凡是原来靠分隔符表达的结构，本页一律落成**有形状的元素**：
 *   - 「2026-09-07 ~ 2026-09-20 · 共 14 天」→ `.ilr-window`（两枚日期块 ＋ 一枚箭头 ＋ 天数胶囊）；
 *   - 「计划会话 4 场／已完成 2 场」两张卡 → `.ilr-metric`（数值 ＋ **进度条** ＋ 一句话副行）；
 *   - 「完成＝…；动作命中＝…」一串定义 → 各自贴到**用它的那个元素**上（热力图图例下的一句、
 *     动作命中卡的副行），不再另起一段口径文；
 *   - 「第 1 周 · 3 场」这类 → 表里就是「周次」一列，不串字符串。
 *
 * 与共享层的关系：卡片圆角／阴影／主色一律取冻结 token（`CSS_VAR_TOKENS`），本件**不重定义** `:root`；
 * 老页有、本仓没有冻结对应的三个色（`#ff3b30` 红／`#ff9500` 橙／`#e8e8ed` 细线）照老值写死，只出现在
 * 进度条与热力图上。共享复制区（`.ilife-action-bar`）**只做宽度约束**（520 居中，同 HELP 第 ②），
 * 不改它的任何视觉定义——那是别的件的唯一样式源。
 *
 * 双端断点：**820**（= HELP）。共享区块自己那处 640 不撤（`blocksCss` 表与页壳的窄屏段仍在），
 * 两段同向、不打架：820 管本页自造的件，640 管共享件。
 *
 * 打印：热力图与明细表都是内容，照常印；日期格的底色来自 CSS 类，浏览器默认不打印背景色，
 * 故格内文字本身写全状态词（「完成／未完成／未排训练」），黑白打印也读得出。
 */
import { pageChromeCss } from './pageChromeCss.js';

/** 卡片底：白底 ＋ 1px 细线 ＋ 16 圆角 ＋ 冻结阴影（全页三处卡共用，一处定义）。 */
const CARD = 'background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)';

/** 主色进度条的三档着色（老页 `.stat .value.good/.warn/.bad` 的三档语义，色值取老页 `/50%` 两档）。 */
const BAR_TONE = '.ilr-bar-ok{background:var(--ok)}'
  + '.ilr-bar-warn{background:#ff9500}'
  + '.ilr-bar-bad{background:#ff3b30}';

/** 静态段（与数据无关的那部分）。 */
const STATIC_CSS = [
  '/* 窗口条：这一页看的是哪一段。日期是主角（等宽数字），天数是胶囊。',
  '   宽度取内容宽（`fit-content`）——铺满 960 时天数胶囊会被甩到最右、跟日期隔开九百像素，读起来是两截 */',
  '.ilr-window{display:flex;flex-wrap:wrap;align-items:center;gap:10px;width:fit-content;max-width:100%;'
    + 'margin:0 0 14px;padding:14px 18px;' + CARD + '}',
  '.ilr-window-label{font-size:12px;color:var(--fg3)}',
  '.ilr-date{font-size:15px;font-weight:600;color:var(--fg);font-variant-numeric:tabular-nums}',
  '.ilr-arrow{color:var(--fg3);flex:none}',
  '.ilr-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:999px;'
    + 'font-size:12px;font-weight:600;background:var(--bg);color:var(--fg2);white-space:nowrap;'
    + '-webkit-tap-highlight-color:transparent}',
  '/* 计划名那枚走浅蓝底主色字（冻结 token `--soft`／`--blue`；与「完成率」卡的数字同色系） */',
  '.ilr-pill-plan{background:var(--soft);color:var(--blue)}',
  '/* 统计卡行：等宽两列；窄屏塌成单列（HELP 第 ③） */',
  '.ilr-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:0 0 14px}',
  '.ilr-metric{padding:18px 20px;' + CARD + '}',
  '.ilr-metric-label{font-size:13px;color:var(--fg2);margin:0 0 8px}',
  '.ilr-metric-value{font-size:32px;font-weight:700;line-height:1.1;letter-spacing:-.02em;'
    + 'font-variant-numeric:tabular-nums;color:var(--fg)}',
  '.ilr-metric-unit{font-size:15px;font-weight:600;color:var(--fg2);margin-left:3px}',
  '/* 进度条：8px 圆头轨道＋同色填充；宽度由渲染期算成百分比写进 style（只含数字，无注入面） */',
  '.ilr-bar{height:8px;border-radius:999px;background:var(--bg);overflow:hidden;margin:12px 0 8px}',
  '.ilr-bar-fill{height:100%;border-radius:999px;display:block}',
  BAR_TONE,
  '.ilr-metric-sub{font-size:12px;color:var(--fg3);margin:0}',
  '/* 区块卡：白底 16 圆角＋标题前一根主色小竖条（照老页 .section／.section h2） */',
  '.ilr-sec{padding:20px 24px;margin-bottom:14px;' + CARD + '}',
  '.ilr-sec-title{display:flex;align-items:center;gap:8px;margin:0 0 14px;font-size:16px;font-weight:600;'
    + 'color:var(--fg)}',
  '.ilr-sec-title::before{content:"";width:4px;height:16px;background:var(--blue);border-radius:2px;flex:none}',
  '/* 热力图：七列一周一行，列宽可压不溢出 */',
  '.ilr-hm{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}',
  '.ilr-cell{border:1px solid var(--line);border-radius:10px;background:var(--bg);display:flex;'
    + 'flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px;'
    + 'font-size:11px;color:var(--fg3);text-align:center;overflow:hidden}',
  '.ilr-cell-date{font-size:10px;opacity:.85;white-space:nowrap}',
  '.ilr-cell-dow{opacity:.9}',
  '.ilr-cell-txt{font-size:13px;font-weight:700;white-space:nowrap}',
  '/* 完成走成功色、未完成走红、未排训练走浅底（字母色取老页同值） */',
  '.ilr-done{background:var(--ok);border-color:var(--ok);color:#fff}',
  '.ilr-miss{background:#ff3b30;border-color:#ff3b30;color:#fff}',
  '.ilr-rest{background:var(--bg);color:var(--fg3)}',
  '/* 「未排训练」一格在一段窗口里往往占多数，字重压低一档：留着字（黑白打印丢底色也读得懂），',
  '   但不跟「完成／未完成」抢注意力 */',
  '.ilr-rest .ilr-cell-txt{font-weight:500}',
  '/* 首行补的空位：只用来把日期按周一列对齐（老页头一行从区间第一天起排，是斜的） */',
  '.ilr-pad{border:0;background:transparent}',
  '/* 图例：一行居中，色点 ＋ 状态词；下面那句是「完成」的定义（原来在口径段里，现在贴着图例走） */',
  '.ilr-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:14px;font-size:11.5px;'
    + 'color:var(--fg2)}',
  '.ilr-legend-item{display:inline-flex;align-items:center;gap:5px}',
  '.ilr-dot{display:inline-block;width:10px;height:10px;border-radius:3px;flex:none}',
  '.ilr-dot-done{background:var(--ok)}',
  '.ilr-dot-miss{background:#ff3b30}',
  '.ilr-dot-rest{background:var(--bg);border:1px solid var(--line)}',
  '.ilr-legend-note{margin:8px 0 0;text-align:center;font-size:12px;color:var(--fg3)}',
  '/* 截断明示（沿 R3 口径）：热力图只画前 N 天时说清楚，不静默少画 */',
  '.ilr-note{margin:10px 0 0;font-size:12px;color:var(--fg2)}',
  '/* ── 窄屏（820 · 同 HELP）：窗口条与统计卡塌成单列、热力图字号降一档；',
  '   页壳内距与指标卡那两条页面级规则住共用件 `./pageChromeCss.ts`，本段不再重述 ── */',
  '@media (max-width:820px){',
  '.ilr-window{gap:8px;padding:12px 14px}',
  '.ilr-spacer{display:none}',
  '.ilr-metrics{grid-template-columns:minmax(0,1fr);gap:10px}',
  '.ilr-metric{padding:16px 18px}',
  '.ilr-metric-value{font-size:28px}',
  '.ilr-sec{padding:16px 14px}',
  '/* 手机上一格只有约 44px 宽：内距压到 1px、字号降到 10px，「未排训练」四个字（约 40px）才装得下 */',
  '.ilr-hm{gap:3px}',
  '.ilr-cell{aspect-ratio:auto;min-height:56px;border-radius:8px;padding:6px 1px;gap:2px}',
  '.ilr-cell-date{font-size:10px}',
  '.ilr-cell-dow{display:none}',
  '.ilr-cell-txt{font-size:10px}',
  '.ilr-legend{gap:10px;font-size:11px}',
  '/* 明细表六列在 390 宽下放不开：让「周次」让位（日期已隐含第几周），余 5 列不横滚 */',
  '.ilife-block-page-shell .ilife-block-data-table th:nth-child(2),'
    + '.ilife-block-page-shell .ilife-block-data-table td:nth-child(2){display:none}',
  '}',
].join('\n');

/** 页内样式块（含 `<style>` 包裹，照包内先例 `FOOD_CSS`／`MEASURE_CSS`／`planViewCss` 直插正文）：
 *  共用件的页面级段（页宽 960／窄屏／触屏三件／按钮行 520）＋ 本族自己的件。
 *  本族没有按数据生成的规则（格子与进度条都是静态 DOM，宽度写在内联 style 的百分比里），故无入参。 */
export function reviewViewCss(): string {
  return pageChromeCss(960) + '<style>\n' + STATIC_CSS + '\n</style>';
}
