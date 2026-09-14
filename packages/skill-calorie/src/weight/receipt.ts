/** 体重（HELP 场景 03「体重」下一级 · 量体重／改体重记录）· 写后回执页装配（#337）。
 *
 * 形状照抄场景 07 `src/profile/receipt.ts` 的整页回执端口（同一份 `assembleDocPage`、
 * 同一组 `copyArea`／`copyLog`、同一对 `statusCard`／`reconcileDisclosure`），只换内容：
 * 单条摆本次体重与近 30 天，批量摆写入／跳过／失败三数与明细，改／删摆对照与快照。
 * 老实物三张的区块落点见各段注释。对外 1 件：`weightReceiptDoc`（经本能力 `index.ts` 转出）。
 * 取数不自算口径：较上次／距目标／近 30 天走 `records`／`figures` 正本。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderChartBlock, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { shiftISODate } from '../analysis/utils.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import { commandLine, HARD_WORDING } from '../shared/writeParts.js';
import { deltaLast, goalDiff } from './records.js';
import { weightTrend } from './figures.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·体重回执';

/** 体重 4 条会改数据库的命令（数据位，具名键集；分派层只调本文件，不再写命令名字面量比较）。 */
const WEIGHT_RECEIPT_KEYS: ReadonlySet<string> = new Set([
  'calorie.weight.log',
  'calorie.weight.batch',
  'calorie.weight.update',
  'calorie.weight.remove',
]);

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** 给人看的格值：没有值只写「未设置」（与场景 07 同词）。 */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return '未设置';
  const s = String(v).trim();
  return s === '' ? '未设置' : s;
}

function writtenDetailOf(key: string): string {
  if (key === 'calorie.weight.update') return '已更新体重记录';
  if (key === 'calorie.weight.remove') return '已删除体重记录';
  return '已写入体重记录';
}

/* ------------------------------------------------ 单条记体重（老实物 weight_log_receipt.html） */

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

/** 单条记体重回执整页：本次体重（大字／日期时间／较上次／距目标／备注）＋ 近 30 天（均值／趋势／小图）。 */
function buildLogReceiptDoc(
  db: DatabaseSync, params: Record<string, unknown>, receipt: CrudReceipt, command: string,
): string {
  const facts = logFactsOf(params, receipt);
  const prev = deltaLast(db, facts.date);
  const delta = facts.kg !== null && prev !== null ? round1(facts.kg - prev) : null;
  const gap = facts.kg !== null ? goalDiff(db, facts.kg) : null;
  let avg: number | null = null;
  let trendCn: string | null = null;
  let series: { label: string; value: number }[] = [];
  try {
    const r = weightTrend(db, shiftISODate(facts.date, -29), facts.date);
    if (r.status === 'ok' && r.data) {
      avg = r.data.avgWeight;
      trendCn = r.data.trendCn;
      series = r.data.logs.map((l) => ({ label: l.date.slice(5), value: l.weightKg }));
    }
  } catch {
    avg = null;
  }
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const blocks: string[] = [
    renderKpiGrid([
      statusCard(receipt, writtenDetailOf('calorie.weight.log')),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '写入字段',
        value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.join('、') || '未设置',
      },
    ]),
    // 老实物 weight_log_receipt.html：weightBig（体重大字）＋ meta（日期时间）＋
    // statDeltaLast（较上次）／statDiff（距目标）／statAvg＋statTrend（均值／趋势）＋ noteRow（备注行）。
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '本次体重', v: facts.kg === null ? '未设置' : facts.kg + ' kg' },
        { k: '日期时间', v: facts.date + ' ' + facts.time },
        { k: '较上次差值', v: delta === null ? '暂无上次记录' : (delta >= 0 ? '+' : '') + delta + ' kg' },
        { k: '距目标差', v: gap === null ? '未设体重目标' : (gap >= 0 ? '+' : '') + gap + ' kg' },
        { k: '近 30 天均值', v: avg === null ? '未设置' : avg + ' kg' },
        { k: '近 30 天趋势', v: trendCn ?? '未设置' },
        { k: '备注', v: facts.note ?? '无' },
      ],
      caption: '本次体重（写后现值；较上次＝本次减上一次记录，距目标＝本次减目标体重）',
    }),
  ];
  // 老实物 weight_log_receipt.html：h2 近 30 天趋势（trendSvg 小图）。
  if (series.length > 0) {
    blocks.push(renderChartBlock({
      kind: 'line',
      title: '近 30 天趋势',
      input: { items: series },
    }));
  }
  blocks.push(
    reconcileDisclosure(receipt),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command, source: receipt.meta.source, m5Line: receipt.m5Line,
          actionAt: receipt.meta.actionAt, version: DOC_VERSION,
        }),
      },
    }),
  );
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: receipt.scene + ' · 回执',
    eyebrow: '体重 · 写后回执',
    subtitle: receipt.summary,
    content: blocks.join(''),
  });
}

/* ------------------------------------------------ 批量补录（老实物 weight_batch_receipt.html） */

/** 批量回执整页：写入／跳过／失败三数（回执行状态计数）＋ 逐条明细表。 */
function buildBatchReceiptDoc(receipt: CrudReceipt, command: string): string {
  const items = receipt.items;
  const wrote = items.filter((it) => it.status === '写入').length;
  const skipped = items.filter((it) => it.status === '跳过').length;
  const failed = items.filter((it) => it.status === '失败').length;
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderKpiGrid([
      statusCard(receipt, writtenDetailOf('calorie.weight.batch')),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '写入字段',
        value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.join('、') || '未设置',
      },
    ]),
    // 老实物 weight_batch_receipt.html：kpiWrote／kpiSkipped／kpiFailed 三数。
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '写入', v: wrote + ' 条' },
        { k: '跳过', v: skipped + ' 条' },
        { k: '失败', v: failed + ' 条' },
      ],
      caption: '批量计数：写入／跳过／失败',
    }),
    // 老实物 weight_batch_receipt.html：h2 明细（tableBody 逐条状态与原因）。
    renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'kg', label: '体重' },
        { key: 'status', label: '状态' },
        { key: 'reason', label: '原因' },
      ],
      rows: items.map((it) => ({
        date: cellText(it.date),
        kg: cellText(it.detail),
        status: cellText(it.status),
        reason: it.reason === '' ? '—' : it.reason,
      })),
      caption: '逐条明细（共 ' + items.length + ' 条）',
      emptyText: '本次没有逐条明细',
    }),
    reconcileDisclosure(receipt),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command, source: receipt.meta.source, m5Line: receipt.m5Line,
          actionAt: receipt.meta.actionAt, version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: receipt.scene + ' · 回执',
    eyebrow: '体重 · 写后回执',
    subtitle: receipt.summary,
    content,
  });
}

/* ------------------------------------------------ 改／删（老实物 crud_receipt.html） */

/** 改体重回执整页：改前 → 改后逐字段对照（吃回执行；带不出对照时为空表）。 */
function buildUpdateReceiptDoc(receipt: CrudReceipt, command: string): string {
  const rows = receipt.items
    .filter((it) => (it.status ?? '') !== '')
    .map((it) => ({
      field: it.id !== undefined && it.id !== null ? '#' + it.id : cellText(it.date),
      change: it.reason !== '' ? it.reason : (it.detail ?? '—'),
    }));
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderKpiGrid([
      statusCard(receipt, writtenDetailOf('calorie.weight.update')),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '改动字段',
        value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.join('、') || '未设置',
      },
    ]),
    // 老实物 crud_receipt.html：h2 字段变更（diffCard／diffList 改前 → 改后）。
    renderDataTable({
      columns: [{ key: 'field', label: '记录' }, { key: 'change', label: '改前 → 改后' }],
      rows,
      caption: '改前 → 改后对照',
      emptyText: '本次回执未带逐字段对照（写入字段：'
        + (receipt.writtenFields.join('、') || '未设置') + '）',
    }),
    reconcileDisclosure(receipt),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command, source: receipt.meta.source, m5Line: receipt.m5Line,
          actionAt: receipt.meta.actionAt, version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: receipt.scene + ' · 回执',
    eyebrow: '体重 · 写后回执',
    subtitle: receipt.summary,
    content,
  });
}

/** 删体重回执整页：删除快照表 ＋ 硬删除口径（行删除，不可恢复）。 */
function buildRemoveReceiptDoc(receipt: CrudReceipt, command: string): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderKpiGrid([
      statusCard(receipt, writtenDetailOf('calorie.weight.remove')),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次删除的行数' },
      {
        label: '删除条数',
        value: receipt.items.length + ' 条',
        detail: '本次删除的记录数',
      },
    ]),
    // 老实物 crud_receipt.html：删除带快照（idCard／记录行）＋ 不可恢复口径。
    renderDataTable({
      columns: [
        { key: 'id', label: '编号' },
        { key: 'date', label: '日期' },
        { key: 'kg', label: '体重' },
        { key: 'status', label: '状态' },
      ],
      rows: receipt.items.map((it) => ({
        id: it.id === undefined || it.id === null ? '—' : String(it.id),
        date: cellText(it.date),
        kg: cellText(it.detail),
        status: cellText(it.status),
      })),
      caption: '删除快照（删前取值，共 ' + receipt.items.length + ' 条）',
      emptyText: '本次没有删除快照行',
    }),
    notice({ title: '删除口径', msg: '硬删除，不可恢复', detail: '删除的行已从库中移除' + HARD_WORDING }),
    reconcileDisclosure(receipt),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command, source: receipt.meta.source, m5Line: receipt.m5Line,
          actionAt: receipt.meta.actionAt, version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: receipt.scene + ' · 回执',
    eyebrow: '体重 · 写后回执',
    subtitle: receipt.summary,
    content,
  });
}

/** 体重 4 条会改数据库的命令的整页回执端口（分派层只调本函数）。 */
export function weightReceiptDoc(
  key: string, params: Record<string, unknown>, receipt: CrudReceipt, db: DatabaseSync,
): string | null {
  if (!WEIGHT_RECEIPT_KEYS.has(key)) return null;
  const command = commandLine(key, params);
  if (key === 'calorie.weight.batch') return buildBatchReceiptDoc(receipt, command);
  if (key === 'calorie.weight.update') return buildUpdateReceiptDoc(receipt, command);
  if (key === 'calorie.weight.remove') return buildRemoveReceiptDoc(receipt, command);
  return buildLogReceiptDoc(db, params, receipt, command);
}
