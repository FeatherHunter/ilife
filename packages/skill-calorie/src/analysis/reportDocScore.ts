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
import { m } from '../entries/index.js';

/** 评分形态：gauge ＋ 综合评分 ＋ 评分历史 ＋ 分项命中率表（最低分项在首位）。 */
export function buildScoreBlocks(plate: ReportPlate): ReportSection[] {
  const scores = plate.scores;
  const avg = plate.trend?.lateAvg ?? null;
  const last = scores[scores.length - 1] as { score: number; date: string } | undefined;
  const weakest = plate.items[0];
  const strongest = plate.items[plate.items.length - 1];
  return [
    sec('sec-overview', m('skill-calorie.analysis-reportDocScore.c001'),
      renderChartBlock({
        kind: 'gauge',
        /* #625 B团（29-2R 收口）：表头数是后段均值，`综合评分` 一词只留标题，结论句的同括注去掉
         * （29-5R 同一处）；页脚公式见 `calibersOf` score（已改后段口径，29-6R 内口吻同删）。 */
        title: m('skill-calorie.analysis-reportDocScore.c002'),
        input: {
          pct: avg === null ? 0 : Math.max(0, Math.min(100, avg)),
          /* #519 W5（视觉席 D5）：仪表盘原来印两行——`70%`（值）＋ `70`（label），同页 KPI 又写
           * `70 分` ⇒ 一个数三种写法（`%` 还与「满分 100 分」的语义打架）。
           * 改法：**单位只留一种**——值文本走 `format` 出 `70 分`；`label` 位给空串，公共层对空
           * `label` 是整行不渲染。缺值那一支仍印 `—`（真缺值语境）。 */
          options: {
            format: (v: number) => (avg === null ? '—' : m('skill-calorie.analysis-reportDocScore.c003', { p0: String(String(v)) })),
            label: '',
          },
        },
      })
      + renderKpiGrid([
        /* R-49：综合评分读数由仪表承载（值文本「N 分」），KPI 不再另起一卡印同一数（同一事实一页一处）。 */
        { label: m('skill-calorie.analysis-reportDocScore.c004'), value: last === undefined ? '—' : String(last.score), detail: last === undefined ? m('skill-calorie.analysis-reportDocScore.c005') : last.date },
        {
          label: m('skill-calorie.analysis-reportDocScore.c006'), value: weakest === undefined ? '—' : weakest.label,
          /* #620 增量3b：`命中率 N%` 与同卡徽标逐字重复，说明只留指引半句，读数由徽标承载一次。 */
          detail: weakest === undefined ? '' : m('skill-calorie.analysis-reportDocScore.c007'),
          /* R-42：徽标不用默认「成功／警告」，改领域词＋百分数（与值位同源；小数位与表同档 1 位）。 */
          ...(weakest === undefined ? {} : { status: 'warn' as const, statusText: weakest.label + ' ' + weakest.rate.toFixed(1) + '%' }),
        },
        {
          label: m('skill-calorie.analysis-reportDocScore.c008'), value: strongest === undefined ? '—' : strongest.label,
          detail: strongest === undefined ? '' : m('skill-calorie.analysis-reportDocScore.c009'),
          ...(strongest === undefined ? {} : { status: 'ok' as const, statusText: strongest.label + ' ' + strongest.rate.toFixed(1) + '%' }),
        },
      ])),
    sec('sec-items', m('skill-calorie.analysis-reportDocScore.c010'), renderDataTable({
      columns: [
        { key: 'label', label: m('skill-calorie.analysis-reportDocScore.c011') },
        { key: 'hits', label: m('skill-calorie.analysis-reportDocScore.c012'), align: 'right' },
        { key: 'days', label: m('skill-calorie.analysis-reportDocScore.c013'), align: 'right' },
        { key: 'rate', label: m('skill-calorie.analysis-reportDocScore.c014'), align: 'right' },
      ],
      /* #620 增量6：命中率列小数位统一 1 位（整数补 `.0`；徽标与表同档）。 */
      rows: plate.items.map((i) => ({ label: i.label, hits: i.hits, days: i.days, rate: i.rate.toFixed(1) + '%' })),
      caption: m('skill-calorie.analysis-reportDocScore.c015'),
    })),
    sec('sec-history', m('skill-calorie.analysis-reportDocScore.c016'), foldedTable({
      columns: [{ key: 'date', label: m('skill-calorie.analysis-reportDocScore.c017') }, { key: 'score', label: m('skill-calorie.analysis-reportDocScore.c018'), align: 'right' }],
      rows: scores.map((d) => ({ date: d.date, score: d.score })),
      caption: m('skill-calorie.analysis-reportDocScore.c019'),
      emptyText: m('skill-calorie.analysis-reportDocScore.c020'),
    })),
  ];
}

/** 趋势形态：方向徽标 ＋ 前段／后段均分 ＋ 拐点数 ＋ 评分序列折线。 */
export function buildTrendBlocks(plate: ReportPlate): ReportSection[] {
  const t = plate.trend;
  const dir = t === null ? '—' : t.direction;
  const dirMark = t === null ? null : t.dirMark;
  return [
    sec('sec-overview', m('skill-calorie.analysis-reportDocScore.c021'), renderKpiGrid([
      {
        label: m('skill-calorie.analysis-reportDocScore.c022'), value: dir,
        detail: t === null ? '' : m('skill-calorie.analysis-reportDocScore.c023', {
          p0: String(fmt(t.earlyAvg)),
          p1: String(fmt(t.lateAvg)),
        }),
        /* R-40／R-42：平稳也挂徽标但写领域词「平稳」（empty＋显式文案，不落默认「无数据」）；上升／下降同理。 */
        ...(t === null ? {} : dirMark === 'flat'
          ? { status: 'empty' as const, statusText: m('skill-calorie.analysis-reportDocScore.c024') }
          : { status: (dirMark === 'up' ? 'ok' : 'warn') as 'ok' | 'warn', statusText: dir }),
      },
      { label: m('skill-calorie.analysis-reportDocScore.c025'), value: t === null ? '—' : fmt(t.earlyAvg), detail: m('skill-calorie.analysis-reportDocScore.c026') },
      { label: m('skill-calorie.analysis-reportDocScore.c027'), value: t === null ? '—' : fmt(t.lateAvg), detail: m('skill-calorie.analysis-reportDocScore.c028') },
      { label: m('skill-calorie.analysis-reportDocScore.c029'), value: t === null ? '—' : String(t.turns), detail: m('skill-calorie.analysis-reportDocScore.c030') },
    ])),
    sec('sec-chart', m('skill-calorie.analysis-reportDocScore.c031'), scoreSeries(plate)),
    sec('sec-history', m('skill-calorie.analysis-reportDocScore.c032'), foldedTable({
      columns: [{ key: 'date', label: m('skill-calorie.analysis-reportDocScore.c033') }, { key: 'score', label: m('skill-calorie.analysis-reportDocScore.c034'), align: 'right' }],
      rows: plate.scores.map((d) => ({ date: d.date, score: d.score })),
      caption: m('skill-calorie.analysis-reportDocScore.c035'),
      emptyText: m('skill-calorie.analysis-reportDocScore.c036'),
    })),
    sec('sec-caliber', m('skill-calorie.analysis-reportDocScore.c037'), kvTable(m('skill-calorie.analysis-reportDocScore.c038'), [
      /* #620 增量3a：`前段与后段`／`上升与下降`两行与底座口径行
       * （`calibersOf` trend 那一条）整段同义，删表里这两行留口径行；
       * `拐点`／`评分口径`两行是表里独有的事实，保留。 */
      { k: m('skill-calorie.analysis-reportDocScore.c039'), v: m('skill-calorie.analysis-reportDocScore.c040') },
      /* #625 B团（30-6R）：`（不另算一套权重）` 内口吻删除（29 页页脚同句同删）。 */
      { k: m('skill-calorie.analysis-reportDocScore.c041'), v: m('skill-calorie.analysis-reportDocScore.c042') },
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
  /* 方向读数分两件：`dirMark` 是**判据位**（比较只认它，译成英文也不变），`dirTextOf` 才出上屏的字。
   *  拿显示文本比字面（旧写法）在英文页会永远不成立。 */
  const dirMarkOf = (v: number | null): 'up' | 'down' | 'flat' => (v === null ? 'flat' : v > 0 ? 'up' : v < 0 ? 'down' : 'flat');
  const dirTextOf = (mark: 'up' | 'down' | 'flat'): string => (mark === 'up' ? m('skill-calorie.analysis-reportDocScore.c043') : mark === 'down' ? m('skill-calorie.analysis-reportDocScore.c044') : m('skill-calorie.analysis-reportDocScore.c045'));
  const topRows = c.top.map((t) => ({
    label: t.label,
    delta: t.delta,
    unit: t.unit,
    dir: dirMarkOf(t.delta),
  }));
  const dirCount = (want: 'up' | 'down' | 'flat'): number => c.rows.filter((r) => dirMarkOf(r.delta) === want).length;
  /* R-50／R-52：KPI 位给真读数（本期／对比期日均读数，1 位小数），窗口区间下沉到结论条与页头。 */
  const rowOf = (label: string): { cur: number | null; prev: number | null } | null => {
    const r = c.rows.find((x) => x.label === label);
    return r === undefined ? null : { cur: r.cur, prev: r.prev };
  };
  const intake = rowOf(m('skill-calorie.analysis-reportDocScore.c046')) ?? rowOf(c.rows[0]?.label ?? '');
  const weight = rowOf(m('skill-calorie.analysis-reportDocScore.c047')) ?? rowOf(c.rows[1]?.label ?? c.rows[0]?.label ?? '');
  return [
    sec('sec-overview', m('skill-calorie.analysis-reportDocScore.c048'), renderKpiGrid([
      /* R-50／R-41：日期区间不住 KPI（结论条与页头左格已有；KPI 内长日期在 390 档折断），这两卡给读数。 */
      {
        label: m('skill-calorie.analysis-reportDocScore.c049'), value: intake === null || intake.cur === null ? '—' : fmt1(intake.cur) ?? '—',
        detail: intake === null ? m('skill-calorie.analysis-reportDocScore.c050') : m('skill-calorie.analysis-reportDocScore.c051', { p0: String(fmt1(intake.prev) ?? '—') }),
      },
      {
        label: m('skill-calorie.analysis-reportDocScore.c052'), value: weight === null || weight.cur === null ? '—' : fmt1(weight.cur) ?? '—',
        detail: weight === null ? m('skill-calorie.analysis-reportDocScore.c053') : m('skill-calorie.analysis-reportDocScore.c054', { p0: String(fmt1(weight.prev) ?? '—') }),
      },
      { label: m('skill-calorie.analysis-reportDocScore.c055'), value: fmt1(plate.base.days) ?? '—', unit: m('skill-calorie.analysis-reportDocScore.c056'), detail: m('skill-calorie.analysis-reportDocScore.c057') },
      {
        /* #625 B团（31-4R）：原标签 `前 3 项变化量` 是集合名，值却是单项最大变化——标签与取值层级错位。
         * 改标签为单项口径（值与说明同层）；`变化最大的是` 前缀并入标签，说明只留项名。 */
        label: m('skill-calorie.analysis-reportDocScore.c058'), value: topRows.length === 0 ? '—' : signed1(topRows[0].delta) + ' ' + topRows[0].unit,
        detail: topRows.length === 0 ? m('skill-calorie.analysis-reportDocScore.c059') : topRows[0].label,
        /* R-42：徽标写领域词＋读数，不用默认成功／警告。 */
        ...(topRows.length === 0 ? {} : { status: (topRows[0].dir === 'down' ? 'warn' : 'ok') as 'warn' | 'ok', statusText: dirTextOf(topRows[0].dir) + ' ' + signed1(topRows[0].delta) + ' ' + topRows[0].unit }),
      },
    ])),
    sec('sec-delta', m('skill-calorie.analysis-reportDocScore.c060'),
      renderDataTable({
        columns: [
          { key: 'item', label: m('skill-calorie.analysis-reportDocScore.c061') },
          { key: 'cur', label: m('skill-calorie.analysis-reportDocScore.c062'), align: 'right' },
          { key: 'prev', label: m('skill-calorie.analysis-reportDocScore.c063'), align: 'right' },
          { key: 'delta', label: m('skill-calorie.analysis-reportDocScore.c064'), align: 'right' },
        ],
        rows: c.rows.map((r) => ({
          item: r.label,
          cur: r.cur === null ? null : fmt1(r.cur),
          prev: r.prev === null ? null : fmt1(r.prev),
          delta: r.delta === null ? null : signed1(r.delta),
        })),
        caption: m('skill-calorie.analysis-reportDocScore.c065'),
        emptyText: m('skill-calorie.analysis-reportDocScore.c066'),
      })
      /* 徽章列（#516 §3.1）：三项方向读数是**并列的状态标签**，从卡片说明里搬到这里
       * （那里原来拿 `·` 串成一行，判据 R1／R3 的债）。 */
      + renderChips({ items: [
        { text: m('skill-calorie.analysis-reportDocScore.c067', {
          p0: String(dirTextOf('up')),
          p1: String(String(dirCount('up'))),
        }) },
        { text: m('skill-calorie.analysis-reportDocScore.c068', {
          p0: String(dirTextOf('down')),
          p1: String(String(dirCount('down'))),
        }) },
        { text: m('skill-calorie.analysis-reportDocScore.c069', {
          p0: String(dirTextOf('flat')),
          p1: String(String(dirCount('flat'))),
        }) },
      ] })),
    sec('sec-top', m('skill-calorie.analysis-reportDocScore.c070'), renderDataTable({
      columns: [{ key: 'label', label: m('skill-calorie.analysis-reportDocScore.c071') }, { key: 'delta', label: 'Δ', align: 'right' }],
      /* #625 B团（31-3R）：Δ 表同列裸数（384f 逐格 Number 解析），前 3 项表跟它同形；
       * 单位住 KPI 卡值位（`-28.6 ml` 不动）。 */
      rows: topRows.map((t) => ({ label: t.label, delta: signed1(t.delta) })),
      caption: m('skill-calorie.analysis-reportDocScore.c072'),
      emptyText: m('skill-calorie.analysis-reportDocScore.c073'),
    })),
    sec('sec-charts', m('skill-calorie.analysis-reportDocScore.c074'), multiTrend(plate)),
    sec('sec-caliber', m('skill-calorie.analysis-reportDocScore.c075'), kvTable(m('skill-calorie.analysis-reportDocScore.c076'), [
      /* 判据 R5：原句「紧邻本期之前、与本期等长的窗口」的顿号串改逗号分句，事实一字不减。 */
      { k: m('skill-calorie.analysis-reportDocScore.c077'), v: m('skill-calorie.analysis-reportDocScore.c078', { p0: String(String(plate.base.days)) }) },
      { k: m('skill-calorie.analysis-reportDocScore.c079'), v: m('skill-calorie.analysis-reportDocScore.c080') },
      /* #620 增量3a：`日均总消耗怎么算` 这一行与底座口径行（D-13 那一条）同义重复，
       * 删表里这一行留口径行；`五维走势`是表里独有的事实，保留。 */
      /* #625 B团（31-2R）：行文与 5 张折线图的实际尺寸不符（整宽大图不是迷你），按实际写。 */
      { k: m('skill-calorie.analysis-reportDocScore.c081'), v: m('skill-calorie.analysis-reportDocScore.c082') },
    ])),
  ];
}

/** 五维小倍数图（裁决 5 A 方案；替代老侧「各维 min-max 归一化到共享 0–100 域」的做法）。 */
function multiTrend(plate: ReportPlate): string {
  const s = plate.base.series;
  const dims = [
    { key: 'calories' as const, title: m('skill-calorie.analysis-reportDocScore.c083') },
    { key: 'weightKg' as const, title: m('skill-calorie.analysis-reportDocScore.c084') },
    { key: 'exerciseKcal' as const, title: m('skill-calorie.analysis-reportDocScore.c085') },
    { key: 'waterMl' as const, title: m('skill-calorie.analysis-reportDocScore.c086') },
    { key: 'deficit' as const, title: m('skill-calorie.analysis-reportDocScore.c087') },
  ];
  return dims.map((d) =>
    lineOf(s.map((row) => ({ date: row.date, value: row[d.key] as number | null })), d.title),
  ).join('');
}
