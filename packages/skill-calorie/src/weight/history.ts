/** 看体重明细（HELP 场景 03「体重」下一级）：`calorie.view.weight-history` 读。
 *
 * 「看体重明细」与「看体重曲线」在命令面上是**同一个键**（曲线＝同一页在不同窗口词下的读法，
 * 见 `triggers/routing.ts` 的「看体重曲线」系列），故本文件是那两条子功能共同的住处。
 * 体重记录的取数（含「只看有备注的那些」）住同目录 `records.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { nums, optNum, optStr } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';
import { getWeightHistory } from './records.js';
import type { WeightHistory } from './records.js';
import { assertDate, assertRange } from './plate.js';
import type { WeightHistoryView } from './plate.js';
import {
  renderChartBlock,
  renderDataTable,
  renderKpiGrid,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';

/** `calorie.view.weight-history` · 体重明细／曲线（显式起止优先，其次天数，缺省 30 天）。 */
export function viewWeightHistory(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const startDate = optStr(params, 'startDate') ?? optStr(params, 'start');
  const endDate = optStr(params, 'endDate') ?? optStr(params, 'end');
  const days = optNum(params, 'days');
  let h;
  if (startDate && endDate) h = buildWeightHistoryView(db, { startDate, endDate });
  else if (startDate && !endDate) h = buildWeightHistoryView(db, { startDate });
  else if (days !== undefined) h = buildWeightHistoryView(db, { days });
  else h = buildWeightHistoryView(db, {});
  const metrics = nums({
    rows: h.rows.length,
    spanDays: h.change?.spanDays, first: h.change?.first, last: h.change?.last,
    delta: h.change?.delta, dailyAvg: h.change?.dailyAvg,
  });
  return { data: { metrics }, html: buildWeightHistoryDoc(h) };
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

export function buildWeightHistoryDoc(h: WeightHistoryView): string {
  const asc = [...h.rows].reverse();
  const parts: string[] = [renderKpiGrid([
    { label: '体重历史', value: h.range, detail: '共 ' + h.rows.length + ' 条' },
    {
      label: '变化',
      value: h.change ? (h.change.delta >= 0 ? '+' : '') + h.change.delta + ' kg' : '—',
      detail: h.change ? h.change.spanDays + ' 天 · 日均 ' + h.change.dailyAvg + ' kg' : '单点无变化',
    },
  ])];
  let charts = false;
  if (asc.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '体重曲线',
      input: { items: asc.map((r) => ({ label: r.date.slice(5), value: r.weight_kg })) },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'time', label: '时间' },
      { key: 'kg', label: '体重', align: 'right' },
      { key: 'bmi', label: 'BMI', align: 'right' },
      { key: 'note', label: '备注' },
    ],
    rows: h.rows.map((r) => ({
      date: r.date, time: r.time ?? '', kg: r.weight_kg, bmi: r.bmi ?? '', note: r.note ?? '',
    })),
    caption: '体重历史 ' + h.range + '（共 ' + h.rows.length + ' 条）',
    emptyText: '本窗无体重记录',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.weight-history',
      data: {
        metrics: metricsOf({
          rows: h.rows.length,
          spanDays: h.change?.spanDays, first: h.change?.first, last: h.change?.last,
          delta: h.change?.delta, dailyAvg: h.change?.dailyAvg,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重历史 ' + h.range,
    eyebrow: 'calorie.view.weight-history · 运动身体域',
    subtitle: null,
    content: parts.join(''),
    charts,
  });
}
