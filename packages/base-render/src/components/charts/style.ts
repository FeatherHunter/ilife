/** charts · style
 *
 *  自 `src/charts.ts` 第 2069–2180 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { LF, SCATTER_DOT_DEFAULT_PX } from './shared.js';
import { LINE_TEXT_FULL_UNITS, LINE_TEXT_MOBILE, LINE_TEXT_WIDE_MAX_PX, LINE_TEXT_WIDE_UNITS } from './coords.js';
import { charts } from './dispatch.js';
import { CHART_BREAKPOINTS } from '../../spec/index.js';

/* ── 图表 CSS 文本（R12：唯一产出者 = 本文件内部常量/函数；#75 复用同一份） ── */

/** t512：折线族六个文本类的一组字号规则（**用户单位**，逐档补偿后的值——算式见 `LINE_TEXT_WIDE_UNITS`）。
 *  类名与字形族与 ≤720px 段的六条逐字同款，只换数字；抽成一函数免得三档各抄一遍走散。 */
function lineFontRules(p: string, units: number): string {
  return '.' + p + 'charts-line .' + p + 'charts-tick{font-size:' + units + 'px}'
    + '.' + p + 'charts-line .' + p + 'charts-xlabel{font-size:' + units + 'px}'
    + '.' + p + 'charts-line .' + p + 'charts-value{font-size:' + units + 'px}'
    + '.' + p + 'charts-line .' + p + 'charts-value-last{font-size:' + units + 'px}'
    + '.' + p + 'charts-line .' + p + 'charts-marktext{font-size:' + units + 'px}'
    + '.' + p + 'charts-line .' + p + 'charts-marktext-v{font-size:' + units + 'px}';
}

/** 图表样式文本（**唯一一份**）：类名走 `prefix` 命名空间；容器零 padding；
 *  断点数值逐值取 `CHART_BREAKPOINTS`（`mobileMaxPx`／`dotSizeMobilePx`）。
 *  （`lineHeightMobilePx` 自 #424 返工起不再进 CSS：折线在移动端改按 viewBox 长宽比派生高度，
 *  见下方 ≤720px 段的注释；该常量仍留在冻结的 `CHART_BREAKPOINTS` 里不动。）
 *
 *  **#75 复用点**：`buildStyleSheet()` 的 `charts` 样式区直接引用本函数产出，
 *  **不得**在别处重述图表 CSS 文本（#78 结论，违反即 S1）。
 *  本函数**不从 `src/index.ts` 导出**——冻结面无该条目，导出会打破
 *  「新增运行时出口恰好等于清单 implemented 的运行时项」出口面锁（同 `ChartError` 口径）。 */
export function chartsCss(prefix: string): string {
  const p = prefix;
  const mobile = CHART_BREAKPOINTS.mobileMaxPx;
  const dotMobile = CHART_BREAKPOINTS.dotSizeMobilePx;
  return [
    '.' + p + 'charts{position:relative;margin:0;padding:0;box-sizing:border-box;font-family:inherit;color:var(--fg,#1d1d1f);--' + p + 'charts-dot:' + SCATTER_DOT_DEFAULT_PX + 'px}',
    '.' + p + 'charts *{box-sizing:border-box}',
    '.' + p + 'charts-svg{display:block;width:100%;height:auto;overflow:visible}',
    '.' + p + 'charts-empty{padding:0}',
    '.' + p + 'charts-anim .' + p + 'charts-line{transition:stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)}',
    '.' + p + 'charts-anim .' + p + 'charts-bar{transition:height .5s cubic-bezier(.22,1,.36,1)}',
    '.' + p + 'charts-anim .' + p + 'charts-fillbar{transition:width .5s cubic-bezier(.22,1,.36,1)}',
    '.' + p + 'charts-anim .' + p + 'charts-dot{animation:' + p + 'charts-fade .5s ease both}',
    '@keyframes ' + p + 'charts-fade{from{opacity:0}to{opacity:1}}',
    '.' + p + 'charts-dot{pointer-events:none}',
    '.' + p + 'charts-dot-anomaly{filter:drop-shadow(0 0 3px rgba(255,59,48,.18))}',
    '.' + p + 'charts-markpoint{filter:drop-shadow(0 1px 2px rgba(0,0,0,.28))}',
    '.' + p + 'charts-scatter .' + p + 'charts-dot{r:calc(var(--' + p + 'charts-dot) / 2)}',
    '.' + p + 'charts-legend{display:flex;flex-wrap:wrap;gap:8px;font-size:12px;line-height:1.5;color:var(--fg2,#6e6e73)}',
    '.' + p + 'charts-legend-right{flex-direction:column;align-items:flex-start}',
    '.' + p + 'charts-legend-bottom{flex-direction:row;justify-content:center}',
    '.' + p + 'charts-legend-item{display:inline-flex;align-items:center;gap:6px}',
    '.' + p + 'charts-legend-swatch{display:inline-block;width:8px;height:8px;border-radius:2px}',
    '.' + p + 'charts-legend-swatch-dashed{background:repeating-linear-gradient(90deg,var(--fg3,#86868b) 0 4px,transparent 4px 8px)}',
    '.' + p + 'charts-legend-value{color:var(--fg,#1d1d1f)}',
    '.' + p + 'charts-legend-pct{color:var(--fg3,#86868b)}',
    '.' + p + 'charts-pct{display:block;font-size:12px;color:var(--fg2,#6e6e73);text-align:right}',
    /* t-chartfix：进度轨道最小可辨高度 12px。`height` 选项→内联 `height:Npx`／viewBox
     * 的映射由 `E.height` 钉死（缺省 8）不得改；此处只加样式层下限（不同属性，不与
     * 内联 height 冲突），缺省与过小的自定义高度渲染为 12px，65% 处可读。 */
    '.' + p + 'charts-progress .' + p + 'charts-svg{min-height:12px}',
    '.' + p + 'charts-spark-value{font-size:11px}',
    /* 文本字号（旧 `charts.js:55,67,70,79,87,90,92,96,102-103,113,122` 逐值）：
     * 缺了这些规则 SVG 文本会继承页面字号（14–16 用户单位），比旧版大 30%–60%（R2-N12）。 */
    '.' + p + 'charts-tick{font-size:9.5px}',
    '.' + p + 'charts-xlabel{font-size:10px}',
    '.' + p + 'charts-value{font-size:10px}',
    '.' + p + 'charts-value-last{font-size:10.5px;font-weight:700}',
    /* #424 返工：末值标签与末点同高、常与折线／均线交叠（390px 下实测线从标签盒里穿过）。
     *  给折线族的末值加白色描边（`paint-order:stroke` 先描边后填充），压在线上也读得清；
     *  不新增变量名——`--bg` 是本仓既有 token，缺省回退白。 */
    '.' + p + 'charts-line .' + p + 'charts-value-last{paint-order:stroke;stroke:var(--bg,#fff);stroke-width:3px;stroke-linejoin:round}',
    '.' + p + 'charts-marktext{font-size:10px}',
    '.' + p + 'charts-marktext-v{font-size:10px}',
    '.' + p + 'charts-mptext{font-size:10.5px;font-weight:700}',
    '.' + p + 'charts-bar .' + p + 'charts-xlabel{font-size:9.5px}',
    /* t-chartfix D1（2026-09-09 编排者裁定）：桌面端 bar 轴标签 10.5px＞数值 10px 系倒挂 bug 值
     * （测试快照，非契约冻结；契约正文零命中 10.5px）。改 9.5px＝移动端同选择器值，恢复层级
     * （9.5＜10）与双端一致；全局 xlabel 10px（相等非倒挂）不动，最小 scope。 */
    '.' + p + 'charts-bar .' + p + 'charts-value{font-size:10px}',
    '.' + p + 'charts-center-label{font-size:8px}',
    '.' + p + 'charts-center-value{font-size:13px;font-weight:700}',
    '.' + p + 'charts-gauge-value{font-size:26px;font-weight:800}',
    '.' + p + 'charts-gauge-label{font-size:11px}',
    /* t-chartfix #160 的桌面等比上限 `max-width:480px`（＝320×1.5）在 #424 撤销：
     *  折线 viewBox 已放大到 580×260（`LINE_DEFAULT_WIDTH/HEIGHT`），930px 卡片下 scale≈1.6
     *  ——图内 9.5–10px 文字渲染 15.2–16px，靠 viewBox 自身就压住了字号，不再需要砍宽度。
     *  留着它反而把图钉死在卡片中缝（930 里 480，左右各空 225px）。 */
    '@media (max-width:' + mobile + 'px){'
      + '.' + p + 'charts{--' + p + 'charts-dot:' + dotMobile + 'px}'
      /* #424 返工：原来这里把折线 svg 盒高钉成 `lineHeightMobilePx`（150px），而折线是
       *  `preserveAspectRatio="none"` 的满宽拉伸族 —— 580×260／580×300／580×180 三种 viewBox
       *  被压进同一个 150px 高，横向 0.57、纵向 0.50／0.83 → 圆点变椭圆、字被压扁（实测失真比
       *  1.13／0.68）。改成按 viewBox 长宽比派生高度（`height:auto`，与 `.charts-svg` 基规则同款），
       *  三种 viewBox 一律等比缩放；字号补偿见 `LINE_TEXT_MOBILE`。 */
      + '.' + p + 'charts-line .' + p + 'charts-svg{height:auto}'
      + '.' + p + 'charts-bar .' + p + 'charts-xlabel{font-size:9.5px}'
      + '.' + p + 'charts-legend{font-size:11.5px}'
      /* #424 返工（移动端折线文字不可读）：上面那条把折线 svg 盒高钉成 150px，580×260 的 viewBox
       *  在 390px 手机上被压到 scale≈0.58（`preserveAspectRatio="none"`）——图内 9.5/10 单位实测
       *  只有 5.4/5.7px。这里只对**折线族**按 1/0.58≈1.75 倍提字号，把实渲拉回 ~10px；字号常量与
       *  留白估算同源（`LINE_TEXT_MOBILE`），留白已按这一档放大，文字不会再顶出 viewBox。 */
      + '.' + p + 'charts-line .' + p + 'charts-tick{font-size:' + LINE_TEXT_MOBILE.tick + 'px}'
      + '.' + p + 'charts-line .' + p + 'charts-xlabel{font-size:' + LINE_TEXT_MOBILE.xlabel + 'px}'
      + '.' + p + 'charts-line .' + p + 'charts-value{font-size:' + LINE_TEXT_MOBILE.value + 'px}'
      + '.' + p + 'charts-line .' + p + 'charts-value-last{font-size:' + LINE_TEXT_MOBILE.last + 'px}'
      + '.' + p + 'charts-line .' + p + 'charts-marktext{font-size:' + LINE_TEXT_MOBILE.mark + 'px}'
      + '.' + p + 'charts-line .' + p + 'charts-marktext-v{font-size:' + LINE_TEXT_MOBILE.mark + 'px}'
      + '}',
    /* t512（字号随盒宽乱跳的根因）：上面那一段只按 ≤720px 给了一档（原 20 用户单位，t512 收尾收到 19.4），721px 起落回桌面档，
     *  断点两侧实渲 22.5px → 10.7px。这里补两档，用户单位 = 目标像素 ÷ 该档实测缩放比
     *  （算式与四档实测读数见 `LINE_TEXT_WIDE_UNITS` 的注释）——只给**折线族**六条文本类，
     *  杆／散点／环／量表各族沿用基规则 9.5/10 单位不动（它们没有被报「字号乱跳」）。 */
    '@media (min-width:' + (mobile + 1) + 'px) and (max-width:' + LINE_TEXT_WIDE_MAX_PX + 'px){'
      + lineFontRules(p, LINE_TEXT_WIDE_UNITS) + '}',
    '@media (min-width:' + (LINE_TEXT_WIDE_MAX_PX + 1) + 'px){'
      + lineFontRules(p, LINE_TEXT_FULL_UNITS) + '}',
  ].join(LF);
}

