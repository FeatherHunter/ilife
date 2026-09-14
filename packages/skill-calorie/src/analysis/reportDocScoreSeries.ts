/** #384 · 报告子形态页渲染·评分序列图（评分与趋势两形态共用）。
 *
 * 为什么另立一件：`reportDocScore.ts` 已住三个形态（评分／趋势／对比）；序列图这一件
 * 与「形态分片」是两回事（它是两形态共用的一张图），故按变化频率切开，同拆线两件一起用。
 *
 * 图的形状：柱状（每日评分是 0–100 的定距分数，柱比折线更容易看出「哪几天塌了」）。
 * 颜色字面量 0（走 `base-paint` 令牌）。
 */
import { renderChartBlock } from 'base-paint/blocks';
import type { ReportPlate } from './reportPlate.js';

export function scoreSeries(plate: ReportPlate): string {
  const scores = plate.scores;
  if (scores.length === 0) return '';
  return renderChartBlock({
    kind: 'bar',
    title: '评分序列（每日 0–100）',
    input: {
      items: scores.map((d) => ({ label: d.date.slice(5), value: d.score })),
      options: {
        yMin: 0,
        yMax: 100,
        yTicks: 3,
        labels: 'select',
        showValues: 'edge',
      },
    },
  });
}
