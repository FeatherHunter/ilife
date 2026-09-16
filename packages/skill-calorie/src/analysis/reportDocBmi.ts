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
import { bmiBandOf, BMI_BANDS } from './reportPlate.js';
import { fmt, foldedTable, lineOf, sec } from './reportDocParts.js';
import type { ReportSection } from './reportDocParts.js';
import type { ReportPlate } from './reportPlate.js';

/** 分类里程碑：分数带「from → to」的流水（相邻两次称重跨档才算一次）。 */
function milestonesOf(points: readonly { readonly date: string; readonly bmi: number | null }[]): string[] {
  const out: string[] = [];
  let prev: string | null = null;
  for (const p of points) {
    if (p.bmi === null) continue;
    const band = bmiBandOf(p.bmi);
    if (prev !== null && band !== prev) out.push(prev + ' → ' + band + '（' + p.date + '，BMI ' + p.bmi + '）');
    prev = band;
  }
  return out;
}

export function buildBmiBlocks(plate: ReportPlate): ReportSection[] {
  const pts = plate.bandPoints;
  const withBmi = pts.filter((p): p is { date: string; kg: number; bmi: number } => p.bmi !== null);
  if (withBmi.length === 0) {
    return [sec('sec-overview', '概览', renderEmptyBlock({
      title: '逐日体重与 BMI',
      text: '这段时间没有可算 BMI 的称重记录（BMI 由体重与档案身高算出）',
    }))];
  }
  const last = withBmi[withBmi.length - 1] as { date: string; kg: number; bmi: number };
  const band = bmiBandOf(last.bmi);
  const milestones = milestonesOf(pts);
  return [
    sec('sec-overview', '概览', renderKpiGrid([
      /* #516 §3.2 D11：日期与状态分槽——原来这一格拿 `·` 把「称重日期」与「分级」串成一行
       * （判据 R1 的债），现在日期住说明、分级由下面那张「分类」卡的值位与状态徽章承担。 */
      { label: '当前 BMI', value: String(last.bmi), detail: '称重日期 ' + last.date },
      {
        label: '分类', value: band,
        detail: '判定线逐条列在下方分级表里',
        status: band === '正常' ? 'ok' as const : 'warn' as const,
        statusText: band === '正常' ? '在正常区间' : '偏离正常区间',
      },
      {
        label: '身高', value: fmt(plate.base.profile.heightCm), unit: 'cm',
        detail: plate.base.profile.heightCm === null ? '未设档案身高' : '来自档案（BMI 的分母）',
      },
      { label: '采样点', value: String(withBmi.length), unit: '次', detail: '窗口共 ' + plate.base.days + ' 天' },
    ])),
    sec('sec-chart', 'BMI 轨迹', lineOf(pts.map((p) => ({ date: p.date, value: p.bmi })), 'BMI 轨迹（逐日体重与 BMI）', { format: (v) => v.toFixed(1) })),
    sec('sec-bands', 'BMI 分级',
      renderDataTable({
        columns: [
          { key: 'band', label: 'BMI 分级' },
          { key: 'range', label: '区间' },
          { key: 'now', label: '当前落在' },
        ],
        rows: BMI_BANDS.map((b) => ({
          band: b.label,
          range: b.hi === null ? '≥ ' + String(b.lo) : String(b.lo) + ' – ' + String(b.hi),
          now: band === b.label ? '✔' : '—',
        })),
        caption: 'BMI 分级（中国标准）',
      })
      /* 徽章列（#516 §3.1 的第二种形状）：与上表「当前落在」那一列同源同值，
       * 把「落在哪一档」从表内的一个勾变成一行扫得动的标签。 */
      + renderChips({ items: [{ text: '当前分级 ' + band }, { text: '分级线共 ' + String(BMI_BANDS.length) + ' 档' }] })),
    sec('sec-detail', '逐日明细', foldedTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'kg', label: '体重（kg）', align: 'right' },
        { key: 'bmi', label: 'BMI', align: 'right' },
      ],
      rows: pts.map((p) => ({ date: p.date, kg: p.kg, bmi: p.bmi === null ? null : p.bmi })),
      caption: '逐日体重与 BMI',
      emptyText: '这段时间还没有称重记录',
    })),
    sec('sec-milestone', '分类里程碑', renderDataTable({
      columns: [{ key: 'm', label: '分类里程碑' }],
      rows: milestones.map((m) => ({ m })),
      caption: milestones.length === 0 ? '分类里程碑' : '分类里程碑（起 → 止）',
      emptyText: '窗口内 BMI 没有跨过分级线',
    })),
  ];
}
