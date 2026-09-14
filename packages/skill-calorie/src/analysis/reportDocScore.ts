/** #384 · 报告子形态页渲染·评分／趋势／对比族。
 *
 * 照搬的老侧文案契约（`templates/health_report.html`）：
 * - 评分（`kind=score`）：`gauge` 仪表条 ＋ 分项分数表（每项带三色条）＋「最低分项」高亮；
 *   分项＝老侧 `items` 六维（饮食／运动／体重／饮水／体脂／围度）在本仓的**已有对位**——六因素
 *   （热量达标／蛋白达标／饮水达标／运动／称重／三餐）；本仓没有「体脂／围度」达标判定，
 *   故不凭空造两维（老侧六维与六因素在本仓不是同一件东西，如实登记在证据件里）。
 * - 趋势（`kind=trend`）：前段均分／后段均分／拐点数 ＋ 上升／下降／平稳判据。
 * - 对比（`kind=compare`）：逐项 Δ 表（方向着色）＋ full 五维小倍数图（裁决 5 A 方案）。
 *
 * 颜色字面量 0（主色既有令牌 `--blue`，走 `base-paint`）。
 */
import { renderChartBlock, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { fmt, kvTable, lineOf } from './reportDocParts.js';
import { scoreSeries } from './reportDocScoreSeries.js';
import type { ReportPlate } from './reportPlate.js';

/** 评分形态：gauge ＋ 综合评分 ＋ 评分历史 ＋ 分项命中率表（最低分项在首位）。 */
export function buildScoreBlocks(plate: ReportPlate): string {
  const scores = plate.scores;
  const avg = plate.trend?.lateAvg ?? null;
  const last = scores[scores.length - 1] as { score: number; date: string } | undefined;
  const weakest = plate.items[0];
  const strongest = plate.items[plate.items.length - 1];
  return renderChartBlock({
    kind: 'gauge',
    title: '综合评分（0–100，六因素等距折算）',
    input: {
      pct: avg === null ? 0 : Math.max(0, Math.min(100, avg)),
      options: { label: avg === null ? '—' : String(avg) },
    },
  })
    + renderKpiGrid([
      { label: '综合评分', value: avg === null ? '—' : String(avg), detail: '0–100 · ' + scores.length + ' 天有记录' },
      { label: '最近一天', value: last === undefined ? '—' : String(last.score), detail: last === undefined ? '无可评分日' : last.date },
      {
        label: '最低分项', value: weakest === undefined ? '—' : weakest.label,
        detail: weakest === undefined ? '' : '命中率 ' + String(weakest.rate) + '%（优先改它）',
        ...(weakest === undefined ? {} : { status: 'warn' as const }),
      },
      {
        label: '最高分项', value: strongest === undefined ? '—' : strongest.label,
        detail: strongest === undefined ? '' : '命中率 ' + String(strongest.rate) + '%',
        ...(strongest === undefined ? {} : { status: 'ok' as const }),
      },
    ])
    + renderDataTable({
      columns: [
        { key: 'label', label: '分项（六因素）' },
        { key: 'hits', label: '命中天数', align: 'right' },
        { key: 'days', label: '有记录天数', align: 'right' },
        { key: 'rate', label: '命中率', align: 'right' },
      ],
      rows: plate.items.map((i) => ({ label: i.label, hits: i.hits, days: i.days, rate: i.rate + '%' })),
      caption: '分项分数表（按命中率升序，最低分项在首位）',
    })
    + renderDataTable({
      columns: [{ key: 'date', label: '日期' }, { key: 'score', label: '当日评分', align: 'right' }],
      rows: scores.map((d) => ({ date: d.date, score: d.score })),
      caption: '评分历史',
      emptyText: '窗口内没有可评分的记录',
    });
}

/** 趋势形态：方向徽标 ＋ 前段／后段均分 ＋ 拐点数 ＋ 评分序列折线。 */
export function buildTrendBlocks(plate: ReportPlate): string {
  const t = plate.trend;
  const dir = t === null ? '—' : t.direction;
  return renderKpiGrid([
    {
      label: '变化方向', value: dir,
      detail: t === null ? '' : '前段 ' + fmt(t.earlyAvg) + ' → 后段 ' + fmt(t.lateAvg),
      ...(t === null ? {} : { status: (dir === '上升' ? 'ok' : dir === '下降' ? 'warn' : 'empty') as 'ok' | 'warn' | 'empty' }),
    },
    { label: '前段均分', value: t === null ? '—' : fmt(t.earlyAvg), detail: '窗口前 1/3 天的评分均值' },
    { label: '后段均分', value: t === null ? '—' : fmt(t.lateAvg), detail: '窗口后 1/3 天的评分均值' },
    { label: '拐点数', value: t === null ? '—' : String(t.turns), detail: '序列里方向反转的次数' },
  ])
    + scoreSeries(plate)
    + renderDataTable({
      columns: [{ key: 'date', label: '日期' }, { key: 'score', label: '评分', align: 'right' }],
      rows: plate.scores.map((d) => ({ date: d.date, score: d.score })),
      caption: '评分序列',
      emptyText: '窗口内没有可评分的记录',
    })
    + kvTable('口径说明', [
      { k: '前段／后段', v: '把窗口按天三等分，取首段与末段的评分均值比较' },
      { k: '上升 / 下降', v: '后段 − 前段 ＞ 1 分即上升，＜ −1 分即下降，其余记为平稳' },
      { k: '拐点', v: '某日评分同时高于（或低于）左右相邻两天即记 1 个拐点' },
      { k: '评分口径', v: '每日六因素命中数与项数之比折算成 0–100 分（不另算一套权重）' },
    ]);
}

/** 对比形态：full 五维小倍数图（裁决 5 A 方案）＋ 逐项 Δ 表 ＋ 前 3 项变化量。 */
export function buildCompareBlocks(plate: ReportPlate): string {
  const c = plate.compare;
  if (c === null) return '';
  const topRows = c.top.map((t) => ({
    label: t.label,
    delta: (t.delta > 0 ? '+' : '') + String(t.delta) + ' ' + t.unit,
    dir: t.delta > 0 ? '上升' : t.delta < 0 ? '下降' : '持平',
  }));
  return renderKpiGrid([
    { label: '本期', value: c.cur.start + ' ~ ' + c.cur.end, detail: '主窗口' },
    { label: '对比期', value: c.prev.start + ' ~ ' + c.prev.end, detail: '紧邻主窗口之前的等长窗口' },
    { label: '记录天数', value: String(plate.base.days), unit: '天', detail: '本期窗口长度' },
    {
      label: '前 3 项变化量', value: topRows.length === 0 ? '—' : topRows[0].delta,
      detail: topRows.map((r) => r.label + ' ' + r.delta).join(' · '), ...(topRows.length === 0 ? {} : { status: (topRows[0].dir === '下降' ? 'warn' : 'ok') as 'warn' | 'ok' }),
    },
  ])
    + renderDataTable({
      columns: [
        { key: 'item', label: '项' },
        { key: 'cur', label: '本期', align: 'right' },
        { key: 'prev', label: '对比期', align: 'right' },
        { key: 'delta', label: '变化量 Δ', align: 'right' },
        { key: 'dir', label: '方向' },
      ],
      rows: c.rows.map((r) => ({
        item: r.label,
        cur: r.cur,
        prev: r.prev,
        delta: r.delta === null ? null : (r.delta > 0 ? '+' : '') + String(r.delta),
        dir: r.delta === null ? null : r.delta > 0 ? '上升' : r.delta < 0 ? '下降' : '持平',
      })),
      caption: '两期变化量（逐项 Δ 表）',
      emptyText: '两期都有数据的项还不够，算不出 Δ',
    })
    + renderDataTable({
      columns: [{ key: 'label', label: '前 3 项变化量' }, { key: 'delta', label: 'Δ', align: 'right' }, { key: 'dir', label: '方向' }],
      rows: topRows,
      caption: '前 3 项变化量（按 |Δ| 降序）',
      emptyText: '两期都有数据的项还不够，算不出 Δ',
    })
    + multiTrend(plate)
    + kvTable('口径说明', [
      { k: '对比期怎么取', v: '紧邻本期之前、与本期等长的窗口（本期 ' + String(plate.base.days) + ' 天 ⇒ 对比期同长）' },
      { k: '变化量 Δ', v: '本期值 − 对比期值（正＝本期更高）' },
      { k: '五维走势', v: '各维各画一张迷你折线（小倍数图）：每张有自己真实的纵轴与单位，不把不同单位压到同一条轴上' },
    ]);
}

/** 五维小倍数图（裁决 5 A 方案；替代老侧「各维 min-max 归一化到共享 0–100 域」的做法）。 */
function multiTrend(plate: ReportPlate): string {
  const s = plate.base.series;
  const dims = [
    { key: 'calories' as const, title: '摄入（卡/天）' },
    { key: 'weightKg' as const, title: '体重（kg）' },
    { key: 'exerciseKcal' as const, title: '运动消耗（卡/天）' },
    { key: 'waterMl' as const, title: '饮水（ml/天）' },
    { key: 'deficit' as const, title: '缺口（卡/天）' },
  ];
  return dims.map((d) =>
    lineOf(s.map((row) => ({ date: row.date, value: row[d.key] as number | null })), d.title),
  ).join('');
}
