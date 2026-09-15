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
import { fmt, kvTable, lineOf, sec } from './reportDocParts.js';
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
        title: '综合评分（满分 100，六因素等距折算）',
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
        { label: '综合评分', value: avg === null ? '—' : String(avg), detail: '满分 100 分，' + scores.length + ' 天有记录' },
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
      ])),
    sec('sec-items', '分项分数', renderDataTable({
      columns: [
        { key: 'label', label: '分项（六因素）' },
        { key: 'hits', label: '命中天数', align: 'right' },
        { key: 'days', label: '有记录天数', align: 'right' },
        { key: 'rate', label: '命中率', align: 'right' },
      ],
      rows: plate.items.map((i) => ({ label: i.label, hits: i.hits, days: i.days, rate: i.rate + '%' })),
      caption: '分项分数表（按命中率升序，最低分项在首位）',
    })),
    sec('sec-history', '评分历史', renderDataTable({
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
        ...(t === null ? {} : { status: (dir === '上升' ? 'ok' : dir === '下降' ? 'warn' : 'empty') as 'ok' | 'warn' | 'empty' }),
      },
      { label: '前段均分', value: t === null ? '—' : fmt(t.earlyAvg), detail: '窗口前 1/3 天的评分均值' },
      { label: '后段均分', value: t === null ? '—' : fmt(t.lateAvg), detail: '窗口后 1/3 天的评分均值' },
      { label: '拐点数', value: t === null ? '—' : String(t.turns), detail: '序列里方向反转的次数' },
    ])),
    sec('sec-chart', '评分走势', scoreSeries(plate)),
    sec('sec-history', '评分序列', renderDataTable({
      columns: [{ key: 'date', label: '日期' }, { key: 'score', label: '评分', align: 'right' }],
      rows: plate.scores.map((d) => ({ date: d.date, score: d.score })),
      caption: '评分序列',
      emptyText: '窗口内没有可评分的记录',
    })),
    sec('sec-caliber', '口径说明', kvTable('口径说明', [
      { k: '前段与后段', v: '把窗口按天三等分，取首段与末段的评分均值比较' },
      { k: '上升与下降', v: '后段减前段大于 1 分即上升，小于 −1 分即下降，其余记为平稳' },
      { k: '拐点', v: '某日评分同时高于（或低于）左右相邻两天即记 1 个拐点' },
      { k: '评分口径', v: '每日六因素命中数与项数之比折算成 0–100 分（不另算一套权重）' },
    ])),
  ];
}

/** 对比形态：full 五维小倍数图（裁决 5 A 方案）＋ 逐项 Δ 表 ＋ 前 3 项变化量。 */
export function buildCompareBlocks(plate: ReportPlate): ReportSection[] {
  const c = plate.compare;
  if (c === null) return [];
  const topRows = c.top.map((t) => ({
    label: t.label,
    delta: (t.delta > 0 ? '+' : '') + String(t.delta) + ' ' + t.unit,
    dir: t.delta > 0 ? '上升' : t.delta < 0 ? '下降' : '持平',
  }));
  const dirCount = (want: string): number => c.rows.filter((r) => r.delta !== null
    && (r.delta > 0 ? '上升' : r.delta < 0 ? '下降' : '持平') === want).length;
  return [
    sec('sec-overview', '概览', renderKpiGrid([
      /* 判据 R6：区间写「至」，不拿 `~` 顶替。 */
      { label: '本期', value: c.cur.start + ' 至 ' + c.cur.end, detail: '主窗口，共 ' + String(plate.base.days) + ' 天' },
      { label: '对比期', value: c.prev.start + ' 至 ' + c.prev.end, detail: '紧邻主窗口之前的等长窗口' },
      { label: '记录天数', value: String(plate.base.days), unit: '天', detail: '本期窗口长度' },
      {
        label: '前 3 项变化量', value: topRows.length === 0 ? '—' : topRows[0].delta,
        detail: topRows.length === 0 ? '两期都有数据的项还不够' : '变化最大的是 ' + topRows[0].label,
        ...(topRows.length === 0 ? {} : { status: (topRows[0].dir === '下降' ? 'warn' : 'ok') as 'warn' | 'ok' }),
      },
    ])),
    sec('sec-delta', '逐项变化量',
      renderDataTable({
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
      /* 徽章列（#516 §3.1）：三项方向读数是**并列的状态标签**，从卡片说明里搬到这里
       * （那里原来拿 `·` 串成一行，判据 R1／R3 的债）。 */
      + renderChips({ items: [
        { text: '上升 ' + String(dirCount('上升')) + ' 项' },
        { text: '下降 ' + String(dirCount('下降')) + ' 项' },
        { text: '持平 ' + String(dirCount('持平')) + ' 项' },
      ] })),
    sec('sec-top', '前 3 项变化量', renderDataTable({
      columns: [{ key: 'label', label: '前 3 项变化量' }, { key: 'delta', label: 'Δ', align: 'right' }, { key: 'dir', label: '方向' }],
      rows: topRows,
      caption: '前 3 项变化量（按 |Δ| 降序）',
      emptyText: '两期都有数据的项还不够，算不出 Δ',
    })),
    sec('sec-charts', '五维走势', multiTrend(plate)),
    sec('sec-caliber', '口径说明', kvTable('口径说明', [
      /* 判据 R5：原句「紧邻本期之前、与本期等长的窗口」的顿号串改逗号分句，事实一字不减。 */
      { k: '对比期怎么取', v: '紧邻本期之前，与本期的天数一样长的那一段窗口（本期 ' + String(plate.base.days) + ' 天）' },
      { k: '变化量 Δ', v: '本期值减对比期值（正数＝本期更高）' },
      /* 判据 R3：原来拿斜杠把「身高／年龄／性别／活动量」串进括号（#516 §7.2 已点名的写法），
       * 改成不列举的等价句——四个要素就是上文那张计算口径表里的四行。 */
      { k: '日均总消耗怎么算', v: '两期同源：都按档案四要素加该期窗口内最后一次称重算'
        + '（Mifflin-St Jeor 基础代谢 × 活动系数）。体重有变，这一行就会变，不是与体重无关的固定值。' },
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
