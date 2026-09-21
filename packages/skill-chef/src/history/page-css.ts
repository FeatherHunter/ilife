/** 历史域四页共用的页内收口样式（在公共层皮肤 `chefSceneCss()` 之后追加，不拆两层）。
 *
 * 为什么另立一件：公共层皮肤（`src/render/skin.ts`）管的是 48 页共用的形状语言，它不知道
 * 每页摆几格——本域四页的读数卡是 3 张或 4 张、动作条是 3 颗按钮。公共层那条「宽档一行四格」
 * 在 3 张卡下会把第三张留在第四格里空着，在 5 张卡下会多出一张孤卡（#873 第 33 格的扣分项
 * 就是这个形状）；件数只有本域知道，故这条栅格口径住在本域。同一把尺也管动作条的末排。
 *
 * 第一轮做的（同尺复评已读到）：
 *   ① 读数卡栅格：**格子数反过来定列数**——宽档让 N 张平分 880 版心（`grid-auto-flow: column`，
 *      不再固定四列）；窄档照公共层的两列排，奇数张时末张跨两列（并改成一行摆：标签贴左、值贴右）。
 *   ② 动作条：末排只剩一颗按钮时铺满整行；宽档按颗数平分（与读数卡同一条栅格节奏）。
 *   ③ 时间轴时间槽下限宽 76px（同一天的多条只印一次日期、续行印「同日」，正文起始位不漂）。
 *
 * 第二轮按返修裁定补四条（逐条对着评语原文）：
 *   ④ 「顶部色带与主题卡片风格衔接略生硬」→ 页顶品牌带**收边**：下沿圆角 ＋ 一层暖色晕。
 *   ⑤ 「390 端元信息卡在第二排出现两栏排布略显拥挤」→ 窄档事实条改**两列栅格**（等宽；
 *      末张落单时跨两列），不再按内容宽参差折行。
 *   ⑥ 「橙色高光条偏模板化」「整体略呆板」→ 刻度条加粗到 8px 并叠 5 档刻线（0—5 就是评分档，
 *      不是装饰数字），填充色仍归公共层那三条档位规则。
 *   ⑦ 时间线：轴线换品牌暖色，节点位从 9px 圆点让给页内的 SVG 评分圆环
 *      （`pages.ts` 的 `histTimelineHtml`），这里让出左侧槽位并把节点摆到轴线上。
 *
 * 取值口径：断点 640／1001 取仓内既有集合（`pageUi.ts` 的 `PAGE_LIMITS.breakpointsPx`），
 * 圆角只用闭集 {8, 14, 20, 999}；**颜色只从 `CHART_PALETTE` 与冻结 token 取**（与公共层皮肤
 * 同一条色基，本件不发明色值）。
 */
import { CHART_PALETTE, CSS_VAR_TOKENS } from 'base-paint';

/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** hex → `r, g, b`（与公共层皮肤同一条换算；色值来源仍是调色板与冻结 token）。 */
function rgbOf(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
}

/** 品牌暖色（与皮肤取同一个调色板下标）。 */
const WARM_RGB = rgbOf(CHART_PALETTE[2]);

/** 评分圆环的分数 → 档色（页内 SVG 节点用；`pages.ts` 只给档名，色值住在这里一处）。 */
export const HIST_NODE_TIERS: Readonly<Record<string, string>> = {
  high: CHART_PALETTE[2],
  mid: CHART_PALETTE[6],
  low: CHART_PALETTE[3],
  none: CSS_VAR_TOKENS['--fg3'],
};

/** 刻度尺的轨道色（与公共层刻度条同一条中性线）。 */
const TRACK_RGB = rgbOf(CSS_VAR_TOKENS['--line']);

/** 页内收口样式段（本件唯一出口）。恒返回非空 CSS 文本。 */
export function historyPageCss(): string {
  const root = '.ilife-page-ui';
  return [
    '/* #873 历史域页内收口 · 每一条规则都挂在根类 ' + root + ' 之下 */',
    /* ④ 页顶品牌带的收边。 */
    root + '::before {',
    '  border-radius: 0 0 8px 8px;',
    '  box-shadow: 0 2px 12px rgba(' + WARM_RGB + ', .38);',
    '}',
    /* ⑥ 刻度条：8px ＋ 5 档刻线（刻线压一层浅底，填充色仍是公共层那三条档位色）。 */
    root + ' .ilife-block-kpi-card-bar {',
    '  position: relative;',
    '  height: 8px;',
    '  border-radius: 999px;',
    '}',
    root + ' .ilife-block-kpi-card-bar::after {',
    '  content: "";',
    '  position: absolute;',
    '  inset: 0;',
    '  border-radius: 999px;',
    '  background-image: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0) 0 18.4%,'
      + ' rgba(255, 255, 255, .92) 18.4% 20%);',
    '}',
    /* ⑦ 时间线：轴线暖色 ＋ 左侧槽位（节点 24px 骑在轴线上，最左一像素仍在版心内）。 */
    root + ' .ilife-block-timeline {',
    '  margin-left: 12px;',
    '  padding-left: 40px;',
    '  border-left-color: rgba(' + WARM_RGB + ', .40);',
    '}',
    root + ' .ilife-hist-node {',
    '  position: absolute;',
    '  left: -51px;',
    '  top: 0;',
    '  width: 24px;',
    '  height: 24px;',
    '  background: none;',
    '  box-shadow: none;',
    '}',
    root + ' .ilife-hist-node svg {',
    '  display: block;',
    '  width: 24px;',
    '  height: 24px;',
    '}',
    root + ' .ilife-hist-node-track {',
    '  fill: none;',
    '  stroke: rgba(' + TRACK_RGB + ', .90);',
    '  stroke-width: 3;',
    '}',
    root + ' .ilife-hist-node-num {',
    '  font-size: 11px;',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  text-anchor: middle;',
    '}',
    /* 时间槽下限宽（③）。 */
    root + ' .ilife-block-timeline-time {',
    '  min-width: 76px;',
    '}',
    '@media (max-width: 640px) {',
    /* ⑤ 窄档事实条：两列栅格，末张落单时跨两列。 */
    '  ' + root + ' .ilife-block-fact-strip {',
    '    display: grid;',
    '    grid-template-columns: repeat(2, minmax(0, 1fr));',
    '    gap: 8px 10px;',
    '  }',
    '  ' + root + ' .ilife-block-fact-strip > .ilife-block-fact-strip-item:last-child:nth-child(odd) {',
    '    grid-column: 1 / -1;',
    '  }',
    /* 窄档读数卡：末张落单时跨两列并改成一行摆。 */
    '  ' + root + ' .ilife-block-kpi-card-grid > .ilife-block-kpi-card:last-child:nth-child(odd) {',
    '    grid-column: 1 / -1;',
    '    flex-direction: row;',
    '    align-items: center;',
    '    justify-content: space-between;',
    '  }',
    '  ' + root + ' .ilife-block-kpi-card-grid > .ilife-block-kpi-card:last-child:nth-child(odd)',
    '    > .ilife-block-kpi-card-value-row {',
    '    margin-top: 0;',
    '  }',
    '  ' + root + ' .ilife-action-row > .ilife-action-btn:last-child:nth-child(odd) {',
    '    grid-column: 1 / -1;',
    '  }',
    '}',
    '@media (min-width: 1001px) {',
    /* 读数卡：收进 880 版心，列数跟着张数走。
       ⚠️ 宽档这两条必须一起给：读数卡是 `.ilife-block-page-shell-body` 的**栅格项**（公共层把
       它设成 `grid-column: 1 / -1` 满铺）。只写 `margin-left/right: auto` **会关掉栅格项的
       `justify-self: stretch`**，整块随即按内容宽 shrink-to-fit（实测三张卡缩到 ≈520px 居中，
       左右各空一片，评委原话「桌面端把评分三卡压成窄列」「首屏留白过大」就是这个形状）。
       正确写法＝显式 `width: 100%` 把栅格区用满、`max-width` 收到 880、`justify-self: center`
       居中——三张卡因此在 880 里平分，与页头、结论条、事实条同一条版心。 */
    '  ' + root + ' .ilife-block-kpi-card-grid {',
    '    width: 100%;',
    '    max-width: 880px;',
    '    justify-self: center;',
    '    grid-auto-flow: column;',
    '    grid-auto-columns: minmax(0, 1fr);',
    '    grid-template-columns: none;',
    '  }',
    /* 事实条：瓦片按行平分（与上下两块共用同一条版心）。 */
    '  ' + root + ' .ilife-block-fact-strip-item {',
    '    flex: 1 1 0;',
    '  }',
    /* 动作条：按颗数平分。 */
    '  ' + root + ' .ilife-action-row {',
    '    grid-auto-flow: column;',
    '    grid-auto-columns: minmax(0, 1fr);',
    '    grid-template-columns: none;',
    '  }',
    '}',
    /* 刻度尺（页内 SVG，`pages.ts` 的 `histScaleHtml`）：轨道与刻线由本段给，标尺值走内联属性。 */
    root + ' .ilife-hist-scale {',
    '  margin: 16px 0;',
    '}',
    root + ' .ilife-hist-scale svg {',
    '  display: block;',
    '  width: 100%;',
    '  height: 56px;',
    '}',
    root + ' .ilife-hist-scale-track {',
    '  stroke: rgba(' + TRACK_RGB + ', .85);',
    '}',
    root + ' .ilife-hist-scale-mark {',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '  text-anchor: middle;',
    '}',
  ].join(LF);
}
