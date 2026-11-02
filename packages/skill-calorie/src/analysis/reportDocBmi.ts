/** #384 · 报告子形态页渲染·BMI 形态（先验件）。
 *
 * 老侧契约（`templates/health_report.html` `kind=bmi`）：4 张 KPI（当前 BMI／分类／身高／采样点）
 * ＋ 历史轨迹折线 ＋ 分类里程碑（`from → to`）；分级阈值文案「偏瘦<18.5 正常<24.9 超重<28 肥胖≥28」原样搬。
 *
 * 分级判定取 `reportPlate.bmiBandOf`（**唯一判据**，本件不重写阈值）；
 * 逐日体重与 BMI 取 `fetchWeightLogs`（已有同形取数，不重算第二份 BMI）。
 * 颜色字面量 0；折线量程贴着数据。
 *
 * ── #519 在本件改了什么（W1 先验页） ────────────────────────────────────────────
 * 本件从「拼一串 HTML」改成「给一串**锚点区块**」（`ReportSection[]`）：`id`／导航文案／区块 HTML
 * 同源，页内导航由底座统一派生（判据 J8 的双向自洽因此是结构保证）。三处判据红项同步销账：
 *   · 判据 R1：「当前 BMI」卡的说明原写 `日期 · 分级`（拿 `·` 串两件事）⇒ 日期进 `detail`，
 *     分级由**分类卡的值位 + 状态徽章**承担（#516 §3.2 D11：日期与状态分槽，状态走徽章）；
 *   · 判据 R5 / 形状化：分级表下补**徽章列**（`renderChips`）报「当前分级」，与表内那一列同源同值；
 *   · 空记录那一支不再印一张只有一行字的「表」，改走公共层空态件（`renderEmptyBlock`，J2 要求空窗页有空态块）。
 */
import { renderChips, renderDataTable, renderEmptyBlock, renderKpiGrid } from 'base-paint/blocks';
import { bmiBandIdOf, bmiBandLabel, BMI_BANDS } from './reportPlate.js';
import { fmt, foldedTable, lineOf, sec } from './reportDocParts.js';
import type { ReportSection } from './reportDocParts.js';
import type { ReportPlate } from './reportPlate.js';
import { m } from '../entries/index.js';

/** 分类里程碑：分数带「from → to」的流水（相邻两次称重跨档才算一次）。 */
function milestonesOf(points: readonly { readonly date: string; readonly bmi: number | null }[]): string[] {
  const out: string[] = [];
  let prevId: string | null = null;
  let prevLabel = '';
  for (const p of points) {
    if (p.bmi === null) continue;
    const bandId = bmiBandIdOf(p.bmi);
    const label = bmiBandLabel(String(bandId ?? 'unknown'));
    if (prevId !== null && bandId !== prevId) out.push(prevLabel + ' → ' + label + '（' + p.date + '，BMI ' + p.bmi + '）');
    prevId = bandId;
    prevLabel = label;
  }
  return out;
}

export function buildBmiBlocks(plate: ReportPlate): ReportSection[] {
  const pts = plate.bandPoints;
  const withBmi = pts.filter((p): p is { date: string; kg: number; bmi: number } => p.bmi !== null);
  if (withBmi.length === 0) {
    return [sec('sec-overview', m('skill-calorie.analysis-reportDocBmi.c001'), renderEmptyBlock({
      title: m('skill-calorie.analysis-reportDocBmi.c002'),
      text: m('skill-calorie.analysis-reportDocBmi.c003'),
    }))];
  }
  const last = withBmi[withBmi.length - 1] as { date: string; kg: number; bmi: number };
  const bandId = bmiBandIdOf(last.bmi);
  const band = bmiBandLabel(String(bandId ?? 'unknown'));
  const milestones = milestonesOf(pts);
  return [
    sec('sec-overview', m('skill-calorie.analysis-reportDocBmi.c004'), renderKpiGrid([
      /* #516 §3.2 D11：日期与状态分槽——原来这一格拿 `·` 把「称重日期」与「分级」串成一行
       * （判据 R1 的债），现在日期住说明、分级由下面那张「分类」卡的值位与状态徽章承担。 */
      { label: m('skill-calorie.analysis-reportDocBmi.c005'), value: String(last.bmi), detail: m('skill-calorie.analysis-reportDocBmi.c006', { p0: String(last.date) }) },
      {
        label: m('skill-calorie.analysis-reportDocBmi.c007'), value: band,
        detail: m('skill-calorie.analysis-reportDocBmi.c008'),
        status: bandId === 'normal' ? 'ok' as const : 'warn' as const,
        statusText: bandId === 'normal' ? m('skill-calorie.analysis-reportDocBmi.c009') : m('skill-calorie.analysis-reportDocBmi.c010'),
      },
      {
        label: m('skill-calorie.analysis-reportDocBmi.c011'), value: fmt(plate.base.profile.heightCm), unit: 'cm',
        detail: plate.base.profile.heightCm === null ? m('skill-calorie.analysis-reportDocBmi.c012') : m('skill-calorie.analysis-reportDocBmi.c013'),
      },
      { label: m('skill-calorie.analysis-reportDocBmi.c014'), value: String(withBmi.length), unit: m('skill-calorie.analysis-reportDocBmi.c015'), detail: m('skill-calorie.analysis-reportDocBmi.c016', { p0: String(plate.base.days) }) },
    ])),
    sec('sec-chart', m('skill-calorie.analysis-reportDocBmi.c017'), lineOf(pts.map((p) => ({ date: p.date, value: p.bmi })), m('skill-calorie.analysis-reportDocBmi.c018'), { format: (v) => v.toFixed(1) })),
    sec('sec-bands', m('skill-calorie.analysis-reportDocBmi.c019'),
      renderDataTable({
        columns: [
          { key: 'band', label: m('skill-calorie.analysis-reportDocBmi.c020') },
          { key: 'range', label: m('skill-calorie.analysis-reportDocBmi.c021') },
          { key: 'now', label: m('skill-calorie.analysis-reportDocBmi.c022') },
        ],
        rows: BMI_BANDS.map((b) => ({
          band: bmiBandLabel(b.id),
          range: b.hi === null ? '≥ ' + String(b.lo) : String(b.lo) + ' – ' + String(b.hi),
          now: bandId === b.id ? '✔' : '—',
        })),
        caption: m('skill-calorie.analysis-reportDocBmi.c023'),
      })
      /* 徽章列（#516 §3.1 的第二种形状）：与上表「当前落在」那一列同源同值，
       * 把「落在哪一档」从表内的一个勾变成一行扫得动的标签。 */
      + renderChips({ items: [{ text: m('skill-calorie.analysis-reportDocBmi.c024', { p0: String(band) }) }, { text: m('skill-calorie.analysis-reportDocBmi.c025', { p0: String(String(BMI_BANDS.length)) }) }] })),
    sec('sec-detail', m('skill-calorie.analysis-reportDocBmi.c026'), foldedTable({
      columns: [
        { key: 'date', label: m('skill-calorie.analysis-reportDocBmi.c027') },
        { key: 'kg', label: m('skill-calorie.analysis-reportDocBmi.c028'), align: 'right' },
        { key: 'bmi', label: 'BMI', align: 'right' },
      ],
      /* #620 增量6：同列小数位统一 1 位（整数补 `.0`，与预测族轨迹列同口径；只改显示，分级判定仍走原值）。 */
      rows: pts.map((p) => ({
        date: p.date,
        kg: (Math.round(p.kg * 10) / 10).toFixed(1),
        bmi: p.bmi === null ? null : (Math.round(p.bmi * 10) / 10).toFixed(1),
      })),
      caption: m('skill-calorie.analysis-reportDocBmi.c029'),
      emptyText: m('skill-calorie.analysis-reportDocBmi.c030'),
    })),
    sec('sec-milestone', m('skill-calorie.analysis-reportDocBmi.c031'), renderDataTable({
      columns: [{ key: 'm', label: m('skill-calorie.analysis-reportDocBmi.c032') }],
      rows: milestones.map((m) => ({ m })),
      caption: milestones.length === 0 ? m('skill-calorie.analysis-reportDocBmi.c033') : m('skill-calorie.analysis-reportDocBmi.c034'),
      emptyText: m('skill-calorie.analysis-reportDocBmi.c035'),
    })),
  ];
}
