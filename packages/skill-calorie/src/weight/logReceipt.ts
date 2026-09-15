/** 量体重（HELP 场景 03「体重」下一级）· **写后回执两页**（`calorie.weight.log` 单条／`calorie.weight.batch` 批量）。
 *
 * 与 `log.ts` 分家的理由（铁律二／结构标准「按变化频率分层」）：`log.ts` 管读页（体重盘）与两条写命令的
 * 入参与落库，本文件只管这两条命令的**产物页**——两条命令的老实物各一张模板
 * （`weight_log_receipt.html`／`weight_batch_receipt.html`），一起改、一起看，故同住一处。
 *
 * 老实物对照：单条页接 `weight_log_receipt.html:63-70` 的回执四段卡（大数字／单位／日期时间／
 * 标签与去向）与 `:71-86` 的近 30 天小图；批量页接 `weight_batch_receipt.html:62-66` 的三色计数与
 * `:67-73` 的明细表。共用件走同目录 `plateDocs.ts`（状态卡／结论块／对账块／交付块），端口在 `receipt.ts`。
 *
 * #483 文本审查：三处「同一件事说三遍」删到一处——状态卡三槽各说一件事、本次体重卡不再复述副标题
 * 的日期时间与 `weight_log`、「批量计数」表整块删（摘要与结论句里已有同样三数）；字段名换中文标签。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderChartBlock, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { CrudReceipt } from '../render/receipt.js';
import { shiftISODate } from '../analysis/utils.js';
import { deltaLast, goalDiff } from './records.js';
import { getWeightGoalInfo, weightTrend } from './figures.js';
import { weightCurvePlan } from './plate.js';
import {
  cell, conclusionBlock, deliveryBlocks, envelopeOf, fieldLabelList, receiptPageOf, reconcileBlock, signed,
  stateCard, writtenDetailOf,
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
        : signed(gap) + '（目标 ' + goal + ' kg）',
    },
    { k: '近 30 天均值', v: avg === null ? '—' : avg + ' kg' + (two ? '' : '（只有一条记录）') },
    // 缺陷 4：这一格原写「近 30 天趋势」，与下面图块标题「近 30 天趋势」同屏两处、看着像两块内容；
    // 表这一格只放「趋势」这个词，窗口（近 30 天）由图块标题与表格标题说。
    { k: '趋势', v: trendCn === null ? '—' : trendCn + (two ? '' : '（只有一条记录）') },
    { k: '备注', v: f.note ?? '—' },
  ];
  const conclusion = (f.kg === null ? '回执未带本次体重' : '本次记 ' + f.kg + ' kg（' + f.date + ' ' + f.time + '）')
    + (delta === null ? '；库里没有更早的记录，暂无较上次对照' : '；较上次 ' + signed(delta))
    + (gap === null ? '；未设体重目标' : '；距目标 ' + signed(gap))
    + (two ? '；近 30 天均值 ' + avg + ' kg、趋势' + trendCn : '；近 30 天只有一条记录，谈不上趋势')
    + '。';
  const payload = [conclusion];
  if (f.kg !== null) payload.push('本次体重 ' + f.kg + ' kg（' + f.date + ' ' + f.time + '）');
  if (delta !== null) payload.push('较上次差值 ' + signed(delta));
  if (gap !== null) payload.push('距目标差 ' + signed(gap) + '（目标 ' + goal + ' kg）');
  if (two) payload.push('近 30 天均值 ' + avg + ' kg', '近 30 天趋势 ' + trendCn);
  if (f.note !== null) payload.push('备注 ' + f.note);
  const content = [
    renderKpiGrid([
      stateCard(receipt, {
        label: '本次写入', word: '已写入', count: receipt.affectedRows,
        detail: writtenDetailOf('calorie.weight.log'),
      }),
      { label: '本次体重', value: f.kg === null ? '—' : String(f.kg), unit: 'kg' },
      ...(receipt.writtenFields.length === 0 ? [] : [{
        label: '写入字段', value: receipt.writtenFields.length + ' 项',
        detail: fieldLabelList(receipt.writtenFields),
      }]),
    ]),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows,
      caption: '写入后的现值',
    }),
    // 老实物 :71-86 的「近 30 天趋势」小图：0 点也出席位，改出空态句（不静默消失，§5.7①）。
    renderChartBlock({
      kind: 'line',
      title: '近 30 天趋势',
      input: {
        items: series,
        options: {
          height: 220,
          format: (v: number) => String(v) + ' kg',
          labels: 'select',
          yTicks: plan.yTicks,
          yMin: plan.yMin,
          yMax: plan.yMax,
          highlightLast: true,
          ...(plan.single ? { markPoint: true as const } : {}),
          ...(plan.markLine === undefined ? {} : { markLine: plan.markLine }),
          emptyText: fail === null
            ? '近 30 天无体重记录（' + from + ' ~ ' + f.date + '）'
            : '近 30 天数据没读出来：' + fail,
        },
      },
    }),
    conclusionBlock(conclusion),
    reconcileBlock(receipt),
    deliveryBlocks(
      envelopeOf(receipt, payload.join(' ｜ ')), receipt, command,
      '本次记录 ' + f.date + ' ｜ 写入 1 条 ｜ 近 30 天 ' + from + ' ~ ' + f.date,
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
  const conclusion = '本次批量 ' + items.length + ' 条：写入 ' + wrote + ' 条、跳过 ' + skipped + ' 条、失败 ' + failed + ' 条。'
    + '跳过＝那天已经记过（不覆盖旧记录）；失败＝日期格式或体重值不对（原因见下表）。';
  const rows = items.map((it) => ({
    date: cell(it.date),
    kg: cell(it.detail) === '—' ? '—' : it.detail + ' kg',
    status: cell(it.status),
    reason: it.reason === '' ? '—' : unitSpaced(it.reason),
  }));
  const payload = [conclusion, ...rows.map((r) => r.date + ' ' + (r.kg === '—' ? '' : r.kg + ' ') + r.status + '（' + r.reason + '）')];
  const content = [
    renderKpiGrid([
      stateCard(receipt, {
        // 缺陷 9：值槽原叫「本次批量」＋值「1 条」与徽章「无改动」并列，一眼读成「成功 1 条」；
        // 改叫「投入」——这个数说的是**收到几条**，写成没写看徽章。
        label: '投入', word: top, count: items.length,
        detail: writtenDetailOf('calorie.weight.batch'),
      }),
      ...(receipt.writtenFields.length === 0 ? [] : [{
        label: '写入字段', value: receipt.writtenFields.length + ' 项',
        detail: fieldLabelList(receipt.writtenFields),
      }]),
    ]),
    // 老实物 weight_batch_receipt.html:67-73 的明细表（逐条状态与原因）。
    // #483 删掉上面那张「批量计数」表：写入／跳过／失败三数与两句定义在摘要（副标题）和结论句里已各有一份。
    renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'kg', label: '体重', align: 'right' },
        { key: 'status', label: '状态' },
        { key: 'reason', label: '原因' },
      ],
      rows,
      caption: '逐条明细（共 ' + items.length + ' 条）',
      emptyText: '这次没有逐条明细',
    }),
    conclusionBlock(conclusion),
    reconcileBlock(receipt),
    deliveryBlocks(
      envelopeOf(receipt, payload.join(' ｜ ')), receipt, command,
      '本次批量 ' + items.length + ' 条 ｜ 写入 ' + wrote + ' 条 · 跳过 ' + skipped + ' 条 · 失败 ' + failed + ' 条',
    ),
  ].join('');
  return receiptPageOf(receipt, content);
}

/** 原因串里数字与单位之间补一个空格（缺陷 6）：取数层给的是 `已有记录 70.4kg`，
 *  而页面与复制载荷全族统一写 `70.4 kg`（审查席探针实测第 31 条那处载荷 ⊂ 页面比对即由此转绿）。
 *  单位后缀只认 `kg`——这一族原因串里的单位就这一个，不顺手改别的写法。 */
function unitSpaced(s: string): string {
  return s.replace(/(\d)kg/g, '$1 kg');
}
