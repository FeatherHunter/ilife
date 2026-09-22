/** #782 · 页面级块件两处：**24 小时色带**与 **7×24 热力矩阵**（含图例与小时刻度）。
 *
 *  为什么住共用位（写得出哪两个在用）：`query` 的「今天总结」与「周视图」、`plan` 的「查日程」
 *  都要这两件；公共层给不出——`charts` 八种里没有热力矩阵，24h 色带在公共层只有「通用柱状图」这一档
 *  （本件就是把柱状图按小时格染色的那一层）。
 *
 *  **只认形状，不认领域**：格子键 `key` 是一枚不透明字符串，谁在上游把它算成一级分类由调用方定
 *  （口径住各能力目录）——所以本件不引 `policy`，也不会把领域名带进共用位。
 *  **配色只有一条规则**：第 i 个键取 `CHART_PALETTE[i]`，顺序由调用方给的 `order` 定（那 8 个一级
 *  分类的权威顺序在 `policy`，调用方照抄即可）；`order` 里没有的键一律走灰，不新造色值。
 *
 *  样式与产出器同文件（与公共层 `pageShapes.ts` 同法：形状件的样式不另立文件）；断点只用仓内
 *  既有值 **820**，不新造。
 */
import { CHART_PALETTE } from 'base-paint';
import { renderChartBlock } from 'base-paint/blocks';

/** 一格＝某小时里「覆盖分钟最多」的那枚键（没有记录的小时＝`key: null`）。 */
export interface HourCell {
  readonly key: string | null;
  readonly minutes: number;
}

/** 热力矩阵的一行＝一天；`cells` 恒 24 格（无记录的小时也占格，形状不随数据变）；
 *  `sum` 是**已给人看的样子**的当日合计（口径住调用方，本件不格式化数字）。 */
export interface HeatRow {
  readonly label: string;
  readonly date: string;
  readonly cells: readonly HourCell[];
  readonly sum: string;
}

const LF = String.fromCharCode(10);

/** 五字符转义表（与公共层 `blocks.ts` 同口径；本件不引区块层内部件）。 */
function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

/** 键 → 色的**唯一算式**（位次定色）。表外的键走 `--fg3`（灰），不落回某个真分类的颜色上。
 *  色带、热力矩阵、分类分布行三处都调它——一处改，三处一起改（#782 首版曾在分布行上漏传色，
 *  七条全蓝，见证据件第七节）。 */
export function categoryColor(key: string | null, order: readonly string[]): string {
  if (key === null) return 'var(--soft)';
  const at = order.indexOf(key);
  return at >= 0 ? CHART_PALETTE[at % CHART_PALETTE.length] : 'var(--fg3)';
}

/** 一天里的时间片段 → 24 格：逐格累加覆盖分钟，取该格里最多的一枚键。
 *  `start`／`end` 是当天的分钟数（0–1440）；跨零点由调用方拆成两段（本件不做跨天）。 */
export function hourCellsOf(
  spans: readonly { readonly start: number; readonly end: number; readonly key: string }[],
): HourCell[] {
  const buckets: Record<string, number>[] = [];
  for (let h = 0; h < 24; h += 1) buckets.push({});
  for (const span of spans) {
    if (!(span.end > span.start)) continue;
    for (let h = Math.floor(span.start / 60); h <= Math.floor((span.end - 1) / 60); h += 1) {
      if (h < 0 || h > 23) continue;
      const covered = Math.min((h + 1) * 60, span.end) - Math.max(h * 60, span.start);
      if (covered > 0) buckets[h][span.key] = (buckets[h][span.key] ?? 0) + covered;
    }
  }
  return buckets.map((bucket) => {
    const keys = Object.keys(bucket);
    if (keys.length === 0) return { key: null, minutes: 0 };
    let winner = keys[0];
    for (const k of keys) if (bucket[k] > bucket[winner]) winner = k;
    return { key: winner, minutes: bucket[winner] };
  });
}

/** ① 24 小时色带：24 根柱子＝24 小时，柱高＝该小时已记录分钟，柱色＝该小时主键。
 *  空数组＝空串（与「没内容不留空块」同口径）。 */
export function renderHourBand(
  cells: readonly HourCell[],
  opts: { readonly order: readonly string[]; readonly title?: string; readonly height?: number },
): string {
  if (cells.length === 0) return '';
  return renderChartBlock({
    kind: 'bar',
    ...(opts.title === undefined ? {} : { title: opts.title }),
    input: {
      items: cells.map((cell, h) => ({
        label: String(h).padStart(2, '0'),
        value: cell.minutes,
        color: categoryColor(cell.key, opts.order),
      })),
      options: {
        height: opts.height ?? 120,
        yMax: 60,
        singleColor: false,
        showValues: false,
        grid: false,
        labels: 'select',
        compact: true,
      },
    },
  });
}

/** ② 7×24 热力矩阵：一行一天（行首日期、行中 24 格、可选行尾当日合计），尾行是小时刻度。
 *  图例跟着矩阵走（`legend`，缺省开）：格色与图例同源，分开摆迟早走散。
 *  `title` 是这一段在页上的名字（不给＝不出这一行）。 */
export function renderHeatMatrix(
  rows: readonly HeatRow[],
  opts: {
    readonly order: readonly string[];
    readonly id?: string;
    readonly title?: string;
    readonly legend?: boolean;
    readonly withTotal?: boolean;
    readonly dayLabel?: (row: HeatRow) => string;
  },
): string {
  if (rows.length === 0) return '';
  const withTotal = opts.withTotal === true;
  const rowClass = 'heat-row' + (withTotal ? ' heat-row-total' : '');
  const head = rows.map((row) => {
    const label = opts.dayLabel === undefined ? row.label + ' ' + row.date.slice(5) : opts.dayLabel(row);
    const cells = row.cells.map((cell, h) => '<span class="heat-cell" style="background:'
      + categoryColor(cell.key, opts.order) + '" title="' + esc(row.date + ' ' + String(h).padStart(2, '0')
      + ':00 · ' + (cell.key ?? '无记录') + ' · ' + cell.minutes + ' 分钟') + '"></span>').join('');
    return '<div class="' + rowClass + '">'
      + '<div class="heat-day">' + esc(label) + '</div>'
      + '<div class="heat-cells">' + cells + '</div>'
      + (withTotal ? '<div class="heat-sum">' + esc(row.sum) + '</div>' : '')
      + '</div>';
  }).join('');
  const ticks = [[1, '00:00', 'left'], [7, '06:00', 'left'], [13, '12:00', 'left'],
    [19, '18:00', 'left'], [21, '24:00', 'right']]
    .map(([col, text, align]) => '<span style="grid-column:' + col + '/span 4;text-align:' + align + '">' + text + '</span>')
    .join('');
  const legend = opts.legend === false ? '' : '<div class="heat-legend">' + opts.order.map((key) => '<span><i style="background:'
    + categoryColor(key, opts.order) + '"></i>' + esc(key) + '</span>').join('') + '</div>';
  const title = opts.title === undefined ? '' : '<h2 class="heat-title">' + esc(opts.title) + '</h2>';
  return title + '<div class="heat"' + (opts.id === undefined ? '' : ' id="' + esc(opts.id) + '"') + '>'
    + head
    + '<div class="' + rowClass + '"><div></div><div class="heat-ticks">' + ticks + '</div>'
    + (withTotal ? '<div></div>' : '') + '</div>'
    + '</div>' + legend;
}

/** 两处块件的样式唯一产出者（只对用上它们的页面有作用）。 */
export function pagePartsCss(): string {
  return [
    '/* #782 页内自造件·7×24 热力矩阵（断点只用仓内既有值 820） */',
    '.heat-title { margin: 0 0 8px; font-size: 15px; font-weight: 600; color: var(--fg); }',
    '.heat { display: flex; flex-direction: column; gap: 5px; margin: 16px 0 8px; }',
    '.heat-row { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 10px; align-items: center; }',
    '.heat-day { color: var(--fg2); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }',
    '.heat-cells { display: grid; grid-template-columns: repeat(24, minmax(0, 1fr)); gap: 2px; }',
    '.heat-cell { display: block; height: 18px; border-radius: 4px; background: var(--soft); }',
    '.heat-ticks { display: grid; grid-template-columns: repeat(24, minmax(0, 1fr)); gap: 2px; color: var(--fg3); font-size: 11px; font-variant-numeric: tabular-nums; }',
    '.heat-ticks span { white-space: nowrap; overflow: hidden; }',
    '.heat-row-total { grid-template-columns: 64px minmax(0, 1fr) 60px; }',
    '.heat-sum { color: var(--fg2); font-size: 12px; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }',
    '.heat-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 8px 0 0; color: var(--fg2); font-size: 12px; }',
    '.heat-legend span { display: inline-flex; align-items: center; gap: 6px; }',
    '.heat-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; }',
    '@media (max-width: 820px) {',
    '  .heat-row { grid-template-columns: 52px minmax(0, 1fr); gap: 8px; }',
    '  .heat-row-total { grid-template-columns: 52px minmax(0, 1fr) 50px; }',
    // #893 正文类下限 12px：窄屏不把 heat-day／heat-sum 压到 11，沿用基线 12（留此行防回退）。
    '  .heat-cell { height: 15px; border-radius: 3px; }',
    '}',
    '@media print { .heat-cell { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }',
  ].join(LF);
}
