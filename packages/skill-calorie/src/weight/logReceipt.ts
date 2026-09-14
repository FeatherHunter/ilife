/** 量体重（HELP 场景 03「体重」下一级）· **写后回执两页**（`calorie.weight.log` 单条／`calorie.weight.batch` 批量）。
 *
 * 与 `log.ts` 分家的理由（铁律二／结构标准「按变化频率分层」）：`log.ts` 管读页（体重盘）与两条写命令的
 * 入参与落库，本文件只管这两条命令的**产物页**——两条命令的老实物各一张模板
 * （`weight_log_receipt.html`／`weight_batch_receipt.html`），一起改、一起看，故同住一处。
 *
 * 老实物对照：单条页接 `weight_log_receipt.html:63-70` 的回执四段卡（大数字／单位／日期时间／
 * 标签与去向）与 `:71-86` 的近 30 天小图；批量页接 `weight_batch_receipt.html:62-66` 的三色计数与
 * `:67-73` 的明细表。共用件走同目录 `plateDocs.ts`（状态卡／结论块／交付块），端口在 `receipt.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderChartBlock, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { CrudReceipt } from '../render/receipt.js';
import { shiftISODate } from '../analysis/utils.js';
import { reconcileDisclosure } from '../shared/receiptParts.js';
import { DB_FILENAME } from '../paths.js';
import { deltaLast, goalDiff } from './records.js';
import { getWeightGoalInfo, weightTrend } from './figures.js';
import { weightCurvePlan } from './plate.js';
import {
  cell, conclusionBlock, deliveryBlocks, envelopeOf, receiptPageOf, signed, stateCard, writtenDetailOf,
} from './plateDocs.js';

const round1 = (n: number): number => Math.round(n * 10) / 10;

interface LogFacts {
  kg: number | null;
  date: string;
  time: string;
  note: string | null;
}

/** 回执＋参数里找本次体重三要素（参数缺省时退回回执行，不编数据）。 */
function logFactsOf(params: Record<string, unknown>, receipt: CrudReceipt): LogFacts {
  const kgRaw = params['kg'];
  const kg = typeof kgRaw === 'number' && Number.isFinite(kgRaw) ? kgRaw : null;
  const first = receipt.items[0];
  const dateRaw = params['date'];
  const date = first?.date
    ?? (typeof dateRaw === 'string' && dateRaw !== '' ? dateRaw : null)
    ?? receipt.meta.actionAt.slice(0, 10);
  const timeRaw = params['time'];
  const time = typeof timeRaw === 'string' && timeRaw !== ''
    ? timeRaw
    : receipt.meta.actionAt.slice(11, 19);
  const noteRaw = params['note'];
  const note = typeof noteRaw === 'string' && noteRaw.trim() !== '' ? noteRaw.trim() : null;
  return { kg, date, time, note };
}

/** 单条记体重回执整页：本次体重（大数字／单位／日期时间／去向）＋写后现值＋近 30 天（均值／趋势／小图）。 */
export function buildLogReceiptDoc(
  db: DatabaseSync, params: Record<string, unknown>, receipt: CrudReceipt, command: string,
): string {
  const f = logFactsOf(params, receipt);
  const from = shiftISODate(f.date, -29);
  const prevW = deltaLast(db, f.date);
  const delta = f.kg !== null && prevW !== null ? round1(f.kg - prevW) : null;
  let goal: number | null = null;
  let gap: number | null = null;
  let avg: number | null = null;
  let trendCn: string | null = null;
  let series: { label: string; value: number }[] = [];
  let fail: string | null = null;
  try {
    goal = getWeightGoalInfo(db)?.weightGoal ?? null;
    gap = f.kg === null ? null : goalDiff(db, f.kg);
    const r = weightTrend(db, from, f.date);
    if (r.status === 'ok' && r.data) {
      avg = r.data.avgWeight;
      trendCn = r.data.trendCn;
      series = r.data.logs.map((l) => ({ label: l.date.slice(5), value: l.weightKg }));
    }
  } catch (e) {
    // 取数失败不吞：原话落进图表空态句（§5.7②，别让页面只剩「未设置」）。
    fail = e instanceof Error ? e.message : String(e);
  }
  const plan = weightCurvePlan(series.map((s) => s.value), goal);
  const two = series.length >= 2;
  const rows = [
    {
      k: '较上次差值',
      v: delta === null ? (prevW === null ? '暂无上次记录' : '—') : signed(delta) + (prevW === null ? '' : '（上次 ' + prevW + ' kg）'),
    },
    {
      k: '距目标差',
      v: gap === null
        ? (goal === null ? '未设体重目标 · 说「定体重目标」后可看差距' : '—')
        : signed(gap) + '（目标 ' + goal + ' kg' + (plan.targetInRange ? '' : ' · 线在量程外，不画') + '）',
    },
    { k: '近 30 天均值', v: avg === null ? '—' : avg + ' kg' + (two ? '' : '（单点无均值对照）') },
    { k: '近 30 天趋势', v: trendCn === null ? '—' : trendCn + (two ? '' : '（单点无变化）') },
    { k: '备注', v: f.note ?? '—' },
  ];
  const conclusion = (f.kg === null ? '回执未带本次体重' : '本次记 ' + f.kg + ' kg（' + f.date + ' ' + f.time + '）')
    + (delta === null ? '；库里没有更早的记录，暂无较上次对照' : '；较上次 ' + signed(delta))
    + (gap === null ? '；未设体重目标' : '；距目标 ' + signed(gap))
    + (two ? '；近 30 天均值 ' + avg + ' kg、趋势' + trendCn : '；近 30 天不足两条，趋势待补一条')
    + '。';
  const payload = [conclusion];
  if (f.kg !== null) payload.push('本次体重 ' + f.kg + ' kg（' + f.date + ' ' + f.time + '）');
  if (delta !== null) payload.push('较上次差值 ' + signed(delta));
  if (gap !== null) payload.push('距目标差 ' + signed(gap) + '（目标 ' + goal + ' kg）');
  if (two) payload.push('近 30 天均值 ' + avg + ' kg', '近 30 天趋势 ' + trendCn);
  if (f.note !== null) payload.push('备注 ' + f.note);
  const content = [
    renderKpiGrid([
      stateCard(receipt, writtenDetailOf('calorie.weight.log'), receipt.noChange ? '无改动' : '写入',
        receipt.noChange ? '无改动' : '已写入'),
      {
        label: '本次体重', value: f.kg === null ? '—' : String(f.kg), unit: 'kg',
        detail: f.date + ' ' + f.time + ' · 已写入 weight_log',
      },
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      { label: '写入字段', value: receipt.writtenFields.length + ' 项', detail: receipt.writtenFields.join('、') || '—' },
    ]),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows,
      caption: '写后现值（较上次＝本次减上一次记录；距目标＝本次减体重目标；窗口 ' + from + ' ~ ' + f.date + '）',
    }),
    // 老实物 :71-86 的「近 30 天趋势」小图：0 点也出席位，改出空态句（不静默消失，§5.7①）。
    renderChartBlock({
      kind: 'line',
      title: '近 30 天趋势',
      input: {
        items: series,
        options: {
          height: 220,
          format: (v: number) => String(v) + 'kg',
          labels: 'select',
          yTicks: plan.yTicks,
          yMin: plan.yMin,
          yMax: plan.yMax,
          highlightLast: true,
          ...(plan.single ? { markPoint: true as const } : {}),
          ...(plan.markLine === undefined ? {} : { markLine: plan.markLine }),
          emptyText: fail === null
            ? '近 30 天无体重记录（' + from + ' ~ ' + f.date + '）'
            : '近 30 天读数失败：' + fail,
        },
      },
    }),
    conclusionBlock(conclusion),
    reconcileDisclosure(receipt),
    deliveryBlocks(
      envelopeOf(receipt, payload.join(' ｜ ')), receipt, command,
      DB_FILENAME + ' · weight_log ｜ 本次记录 ' + f.date + ' ｜ 写入 1 条（影响 ' + receipt.affectedRows
        + ' 行）｜ 近 30 天窗 ' + from + ' ~ ' + f.date,
    ),
  ].join('');
  return receiptPageOf(receipt, content);
}

/** 批量回执整页：写入／跳过／失败三数 ＋ 逐条明细；徽章取本次最重的那一态（失败＞跳过＞写入）。 */
export function buildBatchReceiptDoc(receipt: CrudReceipt, command: string): string {
  const items = receipt.items;
  const count = (word: string): number => items.filter((it) => it.status === word).length;
  const wrote = count('写入');
  const skipped = count('跳过');
  const failed = count('失败');
  const top = failed > 0 ? '失败' : skipped > 0 ? '跳过' : wrote > 0 ? '写入' : '无改动';
  const conclusion = '本次批量 ' + items.length + ' 条，写入 ' + wrote + ' 条、跳过 ' + skipped + ' 条、失败 ' + failed + ' 条'
    + '；跳过＝该日已有记录（不覆盖），失败＝日期格式或体重非法（原因见逐条明细）。';
  const rows = items.map((it) => ({
    date: cell(it.date),
    kg: cell(it.detail) === '—' ? '—' : it.detail + ' kg',
    status: cell(it.status),
    reason: it.reason === '' ? '—' : it.reason,
  }));
  const payload = [conclusion, ...rows.map((r) => r.date + ' ' + (r.kg === '—' ? '' : r.kg + ' ') + r.status + '（' + r.reason + '）')];
  const content = [
    renderKpiGrid([
      stateCard(receipt, writtenDetailOf('calorie.weight.batch'), top, top === '无改动' ? '无改动' : top + ' ' + count(top) + ' 条'),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      { label: '写入字段', value: receipt.writtenFields.length + ' 项', detail: receipt.writtenFields.join('、') || '—' },
    ]),
    // 老实物 weight_batch_receipt.html:62-66 的三色 KPI（写入／跳过／失败三项计数，色在卡上徽章）。
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '写入', v: wrote + ' 条' },
        { k: '跳过', v: skipped + ' 条' + (skipped > 0 ? '（该日已有记录，不覆盖）' : '') },
        { k: '失败', v: failed + ' 条' + (failed > 0 ? '（日期格式或体重非法）' : '') },
      ],
      caption: '批量计数：写入／跳过／失败',
    }),
    // 老实物 weight_batch_receipt.html:67-73 的明细表（逐条状态与原因）。
    renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'kg', label: '体重', align: 'right' },
        { key: 'status', label: '状态' },
        { key: 'reason', label: '原因' },
      ],
      rows,
      caption: '逐条明细（共 ' + items.length + ' 条）',
      emptyText: '本次没有逐条明细（命令未带 items）',
    }),
    conclusionBlock(conclusion),
    reconcileDisclosure(receipt),
    deliveryBlocks(
      envelopeOf(receipt, payload.join(' ｜ ')), receipt, command,
      DB_FILENAME + ' · weight_log ｜ 本次批量 ' + items.length + ' 条 ｜ 写入 ' + wrote + ' 条 · 跳过 ' + skipped
        + ' 条 · 失败 ' + failed + ' 条（影响 ' + receipt.affectedRows + ' 行）',
    ),
  ].join('');
  return receiptPageOf(receipt, content);
}
