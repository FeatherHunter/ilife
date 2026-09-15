/** #384 · 报告子形态页渲染·评分序列图（评分与趋势两形态共用）。
 *
 * 为什么另立一件：`reportDocScore.ts` 已住三个形态（评分／趋势／对比）；序列图这一件
 * 与「形态分片」是两回事（它是两形态共用的一张图），故按变化频率切开，同拆线两件一起用。
 *
 * 颜色字面量 0（走 `base-paint` 令牌）。
 *
 * ── #519 W5 视觉整改（D6）在本件改了什么 ──────────────────────────────────────
 * 改前：柱状图（`kind:'bar'` ＋ `showValues:'edge'`）。**两个实测病**（视觉席 D6，本席机器复现）：
 *   ① 公共层柱状图的**数值标签只认 `showValues === false` 这一个关**——`'edge'` 落进 `!== false`
 *      那一支 ⇒ **59 根柱各挂一枚 14–16px 的标签**，柱宽只有 17 用户单位，标签最小间距 **4.9 单位**
 *      ⇒ 糊成 `8383 8383…`（390 档整条糊死）；
 *   ② 柱状图**从不画 y 轴刻度**（公共层 `charts.ts` 的 `tickCount` 注释：「bar／combo 与未开 yTicks 的
 *      line 本就无标注」）⇒ 本页是全族唯一 `ilife-charts-tick = 0` 的页（其余七页各 3 个）。
 * 改后：改走**全族同一件** `lineOf`（折线）——横轴均布、纵轴 3 条刻度、末值一枚标签。
 * 为什么是「换折线」：本页讲的是**走势方向**（前段／后段／拐点），折线比 59 根柱更容易看出走向；
 * 且它顺带与其余七页的图形态**统一**（那七页全是 `lineOf` 折线）。柱状图那条路要修得动公共层，
 * 本票红线不许碰 `packages/base-render/**`。
 */
import { lineOf } from './reportDocParts.js';
import type { ReportPlate } from './reportPlate.js';

export function scoreSeries(plate: ReportPlate): string {
  const scores = plate.scores;
  if (scores.length === 0) return '';
  return lineOf(
    scores.map((d) => ({ date: d.date, value: d.score as number | null })),
    '评分序列（满分 100 分）',
    { format: (v) => String(Math.round(v)) },
  );
}
