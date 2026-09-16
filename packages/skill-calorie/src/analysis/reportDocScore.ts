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
 *
 * ── #519 在本件改了什么（W3） ─────────────────────────────────────────────────
 * ① 三个装配件改回 `ReportSection[]`（`id`／导航文案／区块 HTML 同源，导航由底座派生，J8）；
 * ② 判据 R6 销账：对比页两期区间原写 `2026-09-09 ~ 2026-09-15`（符号顶替「至」）⇒ 一律写「至」；
 * ③ 判据 R1／R3 销账：对比页「前 3 项变化量」卡的说明原拿 `·` 把三条读数串成一行 ⇒ 改**徽章列**
 *    （逐项变化量住下方「前 3 项变化量」小表，卡上只留变化最大那一条，同一事实一页一处）；
 * ④ 判据 R5 销账：口径表里「紧邻本期之前、与本期等长的窗口」的顿号串改逗号分句；
 * ⑤ 判据 R1 销账：评分页「综合评分」卡说明 `0–100 · N 天有记录` 的 `·` 串改逗号分句。
 */
import { renderChartBlock, renderChips, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { fmt, foldedTable, kvTable, lineOf, sec } from './reportDocParts.js';
import type { ReportSection } from './reportDocParts.js';
import { scoreSeries } from './reportDocScoreSeries.js';
import type { ReportPlate } from './reportPlate.js';

/** 评分形态：gauge ＋ 综合评分 ＋ 评分历史 ＋ 分项命中率表（最低分项在首位）。 */
export function buildScoreBlocks(plate: ReportPlate): ReportSection[] {
  const scores = plate.scores;
  const avg = plate.trend?.lateAvg ?? null;
  const last = scores[scores.length - 1] as { score: number; date: string } | undefined;
  const weakest = plate.items[0];
  const strongest = plate.items[plate.items.length - 1];
  return [
    sec('sec-overview', '概览',
      renderChartBlock({
        kind: 'gauge',
        /* #620 增量6：表头数（后段均值）与全窗表可推均值天然不同（不同窗口），标题点名窗口以自证。 */
        title: '综合评分（后段均值，满分 100，六因素等距折算）',
        input: {
          pct: avg === null ? 0 : Math.max(0, Math.min(100, avg)),
          /* #519 W5（视觉席 D5）：仪表盘原来印两行——`70%`（值）＋ `70`（label），同页 KPI 又写
           * `70 分` ⇒ 一个数三种写法（`%` 还与「满分 100 分」的语义打架）。
           * 改法：**单位只留一种**——值文本走 `format` 出 `70 分`；`label` 位给空串，公共层对空
           * `label` 是整行不渲染。缺值那一支仍印 `—`（真缺值语境）。 */
          options: {
            format: (v: number) => (avg === null ? '—' : String(v) + ' 分'),
            label: '',
          },
        },
      })
      + renderKpiGrid([
        /* R-49：综合评分读数由仪表承载（值文本「N 分」），KPI 不再另起一卡印同一数（同一事实一页一处）。 */
        { label: '最近一天', value: last === undefined ? '—' : String(last.score), detail: last === undefined ? '无可评分日' : last.date },
        {
          label: '最低分项', value: weakest === undefined ? '—' : weakest.label,
          /* #620 增量3b：`命中率 N%` 与同卡徽标逐字重复，说明只留指引半句，读数由徽标承载一次。 */
          detail: weakest === undefined ? '' : '优先改它',
          /* R-42：徽标不用默认「成功／警告」，改领域词＋百分数（与值位同源；小数位与表同档 1 位）。 */
          ...(weakest === undefined ? {} : { status: 'warn' as const, statusText: weakest.label + ' ' + weakest.rate.toFixed(1) + '%' }),
        },
        {
          label: '最高分项', value: strongest === undefined ? '—' : strongest.label,
          detail: strongest === undefined ? '' : '继续保持',
          ...(strongest === undefined ? {} : { status: 'ok' as const, statusText: strongest.label + ' ' + strongest.rate.toFixed(1) + '%' }),
        },
      ])),
    sec('sec-items', '分项分数', renderDataTable({
      columns: [
        { key: 'label', label: '分项（六因素）' },
        { key: 'hits', label: '命中天数', align: 'right' },
        { key: 'days', label: '有记录天数', align: 'right' },
        { key: 'rate', label: '命中率', align: 'right' },
      ],
      /* #620 增量6：命中率列小数位统一 1 位（整数补 `.0`；徽标与表同档）。 */
      rows: plate.items.map((i) => ({ label: i.label, hits: i.hits, days: i.days, rate: i.rate.toFixed(1) + '%' })),
      caption: '分项分数表（按命中率升序，最低分项在首位）',
    })),
    sec('sec-history', '评分历史', foldedTable({
      columns: [{ key: 'date', label: '日期' }, { key: 'score', label: '当日评分', align: 'right' }],
      rows: scores.map((d) => ({ date: d.date, score: d.score })),
      caption: '评分历史',
      emptyText: '窗口内没有可评分的记录',
    })),
  ];
}

/** 趋势形态：方向徽标 ＋ 前段／后段均分 ＋ 拐点数 ＋ 评分序列折线。 */
export function buildTrendBlocks(plate: ReportPlate): ReportSection[] {
  const t = plate.trend;
  const dir = t === null ? '—' : t.direction;
  return [
    sec('sec-overview', '概览', renderKpiGrid([
      {
        label: '变化方向', value: dir,
        detail: t === null ? '' : '前段 ' + fmt(t.earlyAvg) + ' 到后段 ' + fmt(t.lateAvg),
        /* R-40／R-42：平稳也挂徽标但写领域词「平稳」（empty＋显式文案，不落默认「无数据」）；上升／下降同理。 */
        ...(t === null ? {} : dir === '平稳'
          ? { status: 'empty' as const, statusText: '平稳' }
          : { status: (dir === '上升' ? 'ok' : 'warn') as 'ok' | 'warn', statusText: dir }),
      },
      { label: '前段均分', value: t === null ? '—' : fmt(t.earlyAvg), detail: '有评分记录的前 1/3 天的均值' },
      { label: '后段均分', value: t === null ? '—' : fmt(t.lateAvg), detail: '有评分记录的后 1/3 天的均值' },
      { label: '拐点数', value: t === null ? '—' : String(t.turns), detail: '序列里方向反转的次数' },
    ])),
    sec('sec-chart', '评分走势', scoreSeries(plate)),
    sec('sec-history', '评分序列', foldedTable({
      columns: [{ key: 'date', label: '日期' }, { key: 'score', label: '评分', align: 'right' }],
      rows: plate.scores.map((d) => ({ date: d.date, score: d.score })),
      caption: '评分序列',
      emptyText: '窗口内没有可评分的记录',
    })),
    sec('sec-caliber', '口径说明', kvTable('口径说明', [
      /* #620 增量3a：`前段与后段`／`上升与下降`两行与底座口径行
       * （`calibersOf` trend 那一条）整段同义，删表里这两行留口径行；
       * `拐点`／`评分口径`两行是表里独有的事实，保留。 */
      { k: '拐点', v: '某日评分同时高于（或低于）左右相邻两天即记 1 个拐点' },
      { k: '评分口径', v: '每日六因素命中数与项数之比折算成 0–100 分（不另算一套权重）' },
    ])),
  ];
}

/** 对比形态：full 五维小倍数图（裁决 5 A 方案）＋ 逐项 Δ 表 ＋ 前 3 项变化量。
 *
 *  R-52：日均类读数统一 1 位小数。 */
function fmt1(v: number | null): string | null {
  if (v === null) return null;
  return (Math.round(v * 10) / 10).toFixed(1);
}
export function buildCompareBlocks(plate: ReportPlate): ReportSection[] {
  const c = plate.compare;
  if (c === null) return [];
  const signed1 = (v: number): string => (v > 0 ? '+' : '') + (Math.round(v * 10) / 10).toFixed(1);
  const topRows = c.top.map((t) => ({
    label: t.label,
    delta: signed1(t.delta) + ' ' + t.unit,
    dir: t.delta > 0 ? '上升' : t.delta < 0 ? '下降' : '持平',
  }));
  const dirCount = (want: string): number => c.rows.filter((r) => r.delta !== null
    && (r.delta > 0 ? '上升' : r.delta < 0 ? '下降' : '持平') === want).length;
  /* R-50／R-52：KPI 位给真读数（本期／对比期日均读数，1 位小数），窗口区间下沉到结论条与页头。 */
  const rowOf = (label: string): { cur: number | null; prev: number | null } | null => {
    const r = c.rows.find((x) => x.label === label);
    return r === undefined ? null : { cur: r.cur, prev: r.prev };
  };
  const intake = rowOf('日均摄入') ?? rowOf(c.rows[0]?.label ?? '');
  const weight = rowOf('日均体重') ?? rowOf(c.rows[1]?.label ?? c.rows[0]?.label ?? '');
  return [
    sec('sec-overview', '概览', renderKpiGrid([
      /* R-50／R-41：日期区间不住 KPI（结论条与页头左格已有；KPI 内长日期在 390 档折断），这两卡给读数。 */
      {
        label: '本期日均摄入', value: intake === null || intake.cur === null ? '—' : fmt1(intake.cur) ?? '—',
        detail: intake === null ? '两期都有数据的项还不够' : '对比期 ' + (fmt1(intake.prev) ?? '—') + '（同口径）',
      },
      {
        label: '本期日均体重', value: weight === null || weight.cur === null ? '—' : fmt1(weight.cur) ?? '—',
        detail: weight === null ? '两期都有数据的项还不够' : '对比期 ' + (fmt1(weight.prev) ?? '—') + '（同口径）',
      },
      { label: '记录天数', value: String(plate.base.days), unit: '天', detail: '本期窗口长度' },
      {
        label: '前 3 项变化量', value: topRows.length === 0 ? '—' : topRows[0].delta,
        detail: topRows.length === 0 ? '两期都有数据的项还不够' : '变化最大的是 ' + topRows[0].label,
        /* R-42：徽标写领域词＋读数，不用默认成功／警告。 */
        ...(topRows.length === 0 ? {} : { status: (topRows[0].dir === '下降' ? 'warn' : 'ok') as 'warn' | 'ok', statusText: topRows[0].dir + ' ' + topRows[0].delta }),
      },
    ])),
    sec('sec-delta', '逐项变化量',
      renderDataTable({
        columns: [
          { key: 'item', label: '项' },
          { key: 'cur', label: '本期', align: 'right' },
          { key: 'prev', label: '对比期', align: 'right' },
          { key: 'delta', label: '变化量 Δ', align: 'right' },
        ],
        rows: c.rows.map((r) => ({
          item: r.label,
          cur: r.cur === null ? null : fmt1(r.cur),
          prev: r.prev === null ? null : fmt1(r.prev),
          delta: r.delta === null ? null : signed1(r.delta),
        })),
        caption: '两期变化量（逐项 Δ 表）',
        emptyText: '两期都有数据的项还不够，算不出 Δ',
      })
      /* 徽章列（#516 §3.1）：三项方向读数是**并列的状态标签**，从卡片说明里搬到这里
       * （那里原来拿 `·` 串成一行，判据 R1／R3 的债）。 */
      + renderChips({ items: [
        { text: '上升 ' + String(dirCount('上升')) + ' 项' },
        { text: '下降 ' + String(dirCount('下降')) + ' 项' },
        { text: '持平 ' + String(dirCount('持平')) + ' 项' },
      ] })),
    sec('sec-top', '前 3 项变化量', renderDataTable({
      columns: [{ key: 'label', label: '前 3 项变化量' }, { key: 'delta', label: 'Δ', align: 'right' }],
      rows: topRows.map((t) => ({ label: t.label, delta: t.delta })),
      caption: '前 3 项变化量（按 |Δ| 降序）',
      emptyText: '两期都有数据的项还不够，算不出 Δ',
    })),
    sec('sec-charts', '五维走势', multiTrend(plate)),
    sec('sec-caliber', '口径说明', kvTable('口径说明', [
      /* 判据 R5：原句「紧邻本期之前、与本期等长的窗口」的顿号串改逗号分句，事实一字不减。 */
      { k: '对比期怎么取', v: '紧邻本期之前，与本期的天数一样长的那一段窗口（本期 ' + String(plate.base.days) + ' 天）' },
      { k: '变化量 Δ', v: '本期值减对比期值（正数＝本期更高）' },
      /* #620 增量3a：`日均总消耗怎么算` 这一行与底座口径行（D-13 那一条）同义重复，
       * 删表里这一行留口径行；`五维走势`是表里独有的事实，保留。 */
      { k: '五维走势', v: '各维各画一张迷你折线（小倍数图）：每张有自己真实的纵轴与单位，不把不同单位压到同一条轴上' },
    ])),
  ];
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
