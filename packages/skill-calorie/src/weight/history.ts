/** 看体重明细（HELP 场景 03「体重」下一级）：`calorie.view.weight-history` 读。
 *
 * 「看体重明细」与「看体重曲线」在命令面上是**同一个键**（曲线＝同一页在不同窗口词下的读法，
 * 见 `triggers/routing.ts` 的「看体重曲线」系列），故本文件是那两条子功能共同的住处。
 * 体重记录的取数（含「只看有备注的那些」）住同目录 `records.ts`。
 *
 * 窗口口径（#333 真缺陷修复）：先走 `windowRange(params)`（`window`／`offset`／`today`，
 * 时间说法唯一定义地 `analysis/series.ts`），再退回既有的 `days`／`start+end` 口径
 * （与同目录 `compare.ts:30` 同一形状）。`windowRange` 给了窗口就以它为准，
 * 两样都没有才沿用旧口径——除「看体重曲线」（30d 与缺省同值）外其余 13 条此前都退回缺省 30 天。
 */
import type { DatabaseSync } from 'node:sqlite';
import { nums, optNum, optStr, windowRange } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';
import { getWeightGoalValue, getWeightHistory, noteTag } from './records.js';
import type { WeightHistory } from './records.js';
import { assertDate, assertRange } from './plate.js';
import type { WeightHistoryView } from './plate.js';
import { scenarioE3 } from './weightCompare2.js';
import { weightVolatilityV2 } from './volatility.js';
import {
  renderChartBlock,
  renderDataTable,
  renderKpiGrid,
  renderListRows,
} from 'base-paint/blocks';
import type { DataTableColumn } from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';

export type HistoryOverlay = 'target' | 'milestone' | 'anomaly';

export interface HistoryDocExtra {
  overlay?: HistoryOverlay;
  noteOnly?: boolean;
  goalKg?: number | null;
  goalDiffKg?: number | null;
  milestones?: Array<{ label: string; date: string; kg: number }>;
  milestoneMiss?: string[];
  anomalies?: Array<{ date: string; kg: number; deviationKg: number; level: string }>;
}

function isOverlay(v: string | undefined): v is HistoryOverlay {
  return v === 'target' || v === 'milestone' || v === 'anomaly';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function avgOf(rows: WeightHistory['rows']): number | null {
  if (rows.length === 0) return null;
  const s = rows.reduce((a, r) => a + r.weight_kg, 0);
  return round1(s / rows.length);
}

function changeOf(rows: WeightHistory['rows']): WeightHistory['change'] {
  if (rows.length < 2) return null;
  const first = (rows[rows.length - 1] as (typeof rows)[number]).weight_kg;
  const last = (rows[0] as (typeof rows)[number]).weight_kg;
  const spanDays = Math.round(
    (new Date((rows[0] as (typeof rows)[number]).date).getTime()
      - new Date((rows[rows.length - 1] as (typeof rows)[number]).date).getTime()) / 86400000,
  ) + 1;
  const delta = round1(last - first);
  return { spanDays, first, last, delta, dailyAvg: spanDays > 0 ? Math.round((delta / spanDays) * 100) / 100 : 0 };
}

/** `calorie.view.weight-history` · 体重明细／曲线（窗口优先，其次显式起止／天数，缺省 30 天）。 */
export function viewWeightHistory(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const overlayRaw = optStr(params, 'overlay');
  if (overlayRaw !== undefined && !isOverlay(overlayRaw)) {
    throw new CalorieRenderError('bad-input', 'overlay 只许 target／milestone／anomaly');
  }
  const overlay = overlayRaw as HistoryOverlay | undefined;
  const noteOnly = params['noteOnly'] === true;
  const win = windowRange(params);
  let h: WeightHistoryView;
  if (win) {
    h = buildWeightHistoryView(db, { startDate: win.start, endDate: win.end });
  } else {
    const startDate = optStr(params, 'startDate') ?? optStr(params, 'start');
    const endDate = optStr(params, 'endDate') ?? optStr(params, 'end');
    const days = optNum(params, 'days');
    if (startDate && endDate) h = buildWeightHistoryView(db, { startDate, endDate });
    else if (startDate && !endDate) h = buildWeightHistoryView(db, { startDate });
    else if (days !== undefined) h = buildWeightHistoryView(db, { days });
    else h = buildWeightHistoryView(db, {});
  }
  if (noteOnly) {
    const kept = h.rows.filter((r) => r.note !== null && r.note !== undefined && String(r.note).trim() !== '');
    if (kept.length === 0) throw new CalorieRenderError('missing-data', '本窗无带备注的体重记录');
    h = { range: h.range, rows: kept, change: changeOf(kept) };
  }
  const extra: HistoryDocExtra = { overlay, noteOnly: noteOnly || undefined };
  if (overlay === 'target') {
    const goal = getWeightGoalValue(db);
    const last = h.rows.length > 0 ? (h.rows[0] as (typeof h.rows)[number]).weight_kg : null;
    extra.goalKg = goal;
    extra.goalDiffKg = goal !== null && last !== null ? round1((last as number) - (goal as number)) : null;
  }
  if (overlay === 'milestone') {
    const hits: Array<{ label: string; date: string; kg: number }> = [];
    const miss: string[] = [];
    for (const delta of [5, 10]) {
      try {
        const r = scenarioE3(db, delta);
        hits.push({ label: '减重 ' + delta + 'kg 那天', date: r.segA.range, kg: r.segA.avg as number });
      } catch (e) {
        miss.push('减重 ' + delta + 'kg 未达成' + (e instanceof FetchError ? '（' + e.message + '）' : ''));
      }
    }
    extra.milestones = hits;
    extra.milestoneMiss = miss;
  }
  if (overlay === 'anomaly') {
    extra.anomalies = anomaliesOf(db, h);
  }
  const avg = avgOf(h.rows);
  const metrics = nums({
    rows: h.rows.length,
    spanDays: h.change?.spanDays, first: h.change?.first, last: h.change?.last,
    delta: h.change?.delta, dailyAvg: h.change?.dailyAvg, avg: avg ?? undefined,
    goalKg: extra.goalKg ?? undefined, goalDiffKg: extra.goalDiffKg ?? undefined,
    milestoneCount: extra.milestones !== undefined ? extra.milestones.length : undefined,
    anomalyCount: extra.anomalies !== undefined ? extra.anomalies.length : undefined,
    noteCount: noteOnly ? h.rows.length : undefined,
  });
  return { data: { metrics }, html: buildWeightHistoryDoc(h, extra) };
}

function anomaliesOf(db: DatabaseSync, h: WeightHistoryView): Array<{ date: string; kg: number; deviationKg: number; level: string }> {
  if (h.rows.length < 2) return [];
  const latest = (h.rows[0] as (typeof h.rows)[number]).date;
  const earliest = (h.rows[h.rows.length - 1] as (typeof h.rows)[number]).date;
  const start = earliest <= latest ? earliest : latest;
  const end = earliest <= latest ? latest : earliest;
  try {
    const res = weightVolatilityV2(db, start, end, 'rolling');
    if (res.status !== 'ok' || !res.data) return [];
    return res.data.recentAnomalies.map((p) => ({ date: p.date, kg: p.kg, deviationKg: p.deviationKg, level: p.level }));
  } catch {
    return [];
  }
}

/* ── 视图模型（#332 自 `plate.ts` 原样迁入：历史＝fetch/weight.getWeightHistory） ── */

export function buildWeightHistoryView(
  db: DatabaseSync,
  opts: { days?: number; startDate?: string; endDate?: string } = {},
): WeightHistoryView {
  const { days = 30, startDate, endDate } = opts;
  try {
    if (startDate && endDate) {
      assertRange(startDate, endDate);
      const h = getWeightHistory(db, { startDate, endDate });
      return { range: h.range, rows: h.rows, change: h.change };
    }
    if (startDate && !endDate) {
      assertDate(startDate);
      const h = getWeightHistory(db, { startDate });
      return { range: h.range, rows: h.rows, change: h.change };
    }
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new CalorieRenderError('bad-input', 'days 须为 1..365 整数');
    }
    const h = getWeightHistory(db, { days });
    return { range: h.range, rows: h.rows, change: h.change };
  } catch (e) {
    if (e instanceof CalorieRenderError) throw e;
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
}

/* ── 整页装配（#332 自 `plateDocs.ts` 原样迁入：weight_history.html 对照） ── */

function modeBadge(extra: HistoryDocExtra): string {
  if (extra.noteOnly) return '模式：备注筛选';
  if (extra.overlay === 'target') return '模式：曲线·带目标线';
  if (extra.overlay === 'milestone') return '模式：曲线·带里程碑';
  if (extra.overlay === 'anomaly') return '模式：曲线·带异常点';
  return '模式：明细／曲线';
}

function fourthKpi(h: WeightHistoryView, extra: HistoryDocExtra): { label: string; value: string; detail: string } {
  if (extra.overlay === 'target') {
    if (extra.goalKg === null || extra.goalKg === undefined) return { label: '目标', value: '未设目标', detail: '说「定体重目标」后可叠目标线' };
    const d = extra.goalDiffKg as number;
    return { label: '距目标', value: (d >= 0 ? '+' : '') + d + ' kg', detail: '目标 ' + extra.goalKg + ' kg' };
  }
  if (extra.overlay === 'milestone') {
    const n = extra.milestones?.length ?? 0;
    const detail = n > 0
      ? (extra.milestones as Array<{ label: string; date: string }>).map((m) => m.label + ' ' + m.date).join('；')
      : (extra.milestoneMiss ?? []).join('；');
    return { label: '里程碑', value: n + '／2 达成', detail: detail || '暂无里程碑' };
  }
  if (extra.overlay === 'anomaly') {
    const n = extra.anomalies?.length ?? 0;
    const detail = n > 0
      ? (extra.anomalies as Array<{ date: string; kg: number }>).map((a) => a.date + ' ' + a.kg + 'kg').join('；')
      : '本窗无异常点';
    return { label: '异常点', value: String(n) + ' 个', detail };
  }
  const tags = tagDist(h.rows);
  const n = Object.keys(tags).length;
  if (extra.noteOnly) return { label: '有备注', value: h.rows.length + ' 条', detail: n > 0 ? '标签 ' + n + ' 类' : '备注无标签' };
  return { label: '备注', value: h.rows.filter((r) => r.note && String(r.note).trim() !== '').length + ' 条', detail: n > 0 ? '标签 ' + n + ' 类' : '本窗无备注' };
}

function tagDist(rows: WeightHistory['rows']): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const t = noteTag(r.note);
    if (!t) continue;
    out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}

export function buildWeightHistoryDoc(h: WeightHistoryView, extra: HistoryDocExtra = {}): string {
  const asc = [...h.rows].reverse();
  const avg = avgOf(h.rows);
  const fourth = fourthKpi(h, extra);
  const parts: string[] = [renderKpiGrid([
    { label: '体重历史', value: h.range, detail: '共 ' + h.rows.length + ' 条' },
    {
      label: '变化',
      value: h.change ? (h.change.delta >= 0 ? '+' : '') + h.change.delta + ' kg' : '—',
      detail: h.change ? h.change.spanDays + ' 天 · 日均 ' + h.change.dailyAvg + ' kg' : '单点无变化',
    },
    {
      label: '均值',
      value: avg === null ? '—' : String(avg) + ' kg',
      detail: h.rows.length >= 2
        ? '首 ' + (asc[0] as (typeof asc)[number]).weight_kg + ' → 末 ' + (asc[asc.length - 1] as (typeof asc)[number]).weight_kg + ' kg'
        : '单点无均值对照',
    },
    fourth,
  ])];
  let charts = false;
  if (asc.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '体重曲线',
      input: { items: asc.map((r) => ({ label: r.date.slice(5), value: r.weight_kg })) },
    }));
    charts = true;
    parts.push(renderListRows({
      items: legendRows(h, extra),
      emptyText: '无图例',
    }));
  }
  const tables = segmentTables(h, extra);
  for (const t of tables) parts.push(t);
  const tags = tagDist(h.rows);
  if (Object.keys(tags).length > 0) {
    parts.push(renderListRows({
      items: Object.entries(tags).map(([k, v]) => ({ left: k, main: '备注标签', right: String(v) + ' 条' })),
      emptyText: '无备注标签',
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.weight-history',
      data: {
        metrics: metricsOf({
          rows: h.rows.length,
          spanDays: h.change?.spanDays, first: h.change?.first, last: h.change?.last,
          delta: h.change?.delta, dailyAvg: h.change?.dailyAvg, avg: avg ?? undefined,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重历史 ' + h.range,
    eyebrow: 'calorie.view.weight-history · 运动身体域',
    subtitle: modeBadge(extra) + '｜' + h.range + '（共 ' + h.rows.length + ' 条）',
    content: parts.join(''),
    charts,
  });
}

function legendRows(h: WeightHistoryView, extra: HistoryDocExtra): Array<{ left?: string; main: string; right?: string }> {
  const rows: Array<{ left?: string; main: string; right?: string }> = [
    { left: '—', main: '体重曲线', right: h.range },
  ];
  if (extra.overlay === 'target' && extra.goalKg !== null && extra.goalKg !== undefined) {
    rows.push({ left: '- -', main: '目标线', right: String(extra.goalKg) + ' kg' });
  }
  if (extra.overlay === 'milestone') {
    for (const m of extra.milestones ?? []) rows.push({ left: '◆', main: m.label, right: m.date + ' ' + m.kg + 'kg' });
    if ((extra.milestones ?? []).length === 0) rows.push({ left: '◇', main: '里程碑未达成', right: (extra.milestoneMiss ?? []).join('；') || '继续记录' });
  }
  if (extra.overlay === 'anomaly') {
    for (const a of extra.anomalies ?? []) rows.push({ left: '▲', main: '异常点 ' + a.date, right: a.kg + 'kg（偏 ' + a.deviationKg + '）' });
    if ((extra.anomalies ?? []).length === 0) rows.push({ left: '△', main: '本窗无异常点', right: '波动在阈值内' });
  }
  if (extra.noteOnly) rows.push({ left: '✎', main: '只看有备注的记录', right: '共 ' + h.rows.length + ' 条' });
  return rows;
}

function segmentTables(h: WeightHistoryView, extra: HistoryDocExtra): string[] {
  const cols: DataTableColumn[] = [
    { key: 'date', label: '日期' },
    { key: 'time', label: '时间' },
    { key: 'kg', label: '体重', align: 'right' },
    { key: 'bmi', label: 'BMI', align: 'right' },
    { key: 'note', label: '备注' },
  ];
  const toRow = (r: (typeof h.rows)[number]) => ({
    date: r.date, time: r.time ?? '', kg: r.weight_kg, bmi: r.bmi ?? '', note: r.note ?? '',
  });
  const suffix = extra.noteOnly ? '·有备注' : '';
  if (h.rows.length > 30) {
    const head = h.rows.slice(0, 30);
    const tail = h.rows.slice(30);
    return [
      renderDataTable({
        columns: cols,
        rows: head.map(toRow),
        caption: '体重明细（最近 30 条' + suffix + '）',
        emptyText: '本窗无体重记录',
      }),
      renderDataTable({
        columns: cols,
        rows: tail.map(toRow),
        caption: '体重明细（其余 ' + tail.length + ' 条' + suffix + '）',
        emptyText: '无更多记录',
      }),
    ];
  }
  return [renderDataTable({
    columns: cols,
    rows: h.rows.map(toRow),
    caption: '体重历史 ' + h.range + suffix + '（共 ' + h.rows.length + ' 条）',
    emptyText: '本窗无体重记录',
  })];
}
