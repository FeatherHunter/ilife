/** 改／删体重记录（HELP 场景 03「体重」下一级）· **写后回执两页**（`calorie.weight.update`／`calorie.weight.remove`）
 *  ＋ 体重写命令整页回执的**端口**（`weightReceiptDoc`，经本能力 `index.ts` 转出，分派层只调门）。
 *
 * 形状照抄场景 07 `src/profile/receipt.ts` 的整页回执端口（同一份 `assembleDocPage`、同一组
 * `copyArea`／`copyLog`／`notice`、同一对 `statusCard`／`reconcileDisclosure`）。老实物 `crud_receipt.html`
 * 里值得继承的两样接在本文件：**按 op 选分节＋空卡守卫**（`:302-327` update 只出实际变的行、无变更不出空卡；
 * `:328-350` delete 出删除前快照，本页把整卡隐藏改成一句空态）与**删除前后成对**（老实物
 * `weight_batch_delete.html:117-133` 的区间变化＋删除后最新体重主动回读）。
 * 单条／批量两页住同目录 `logReceipt.ts`；共用件住同目录 `plateDocs.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { CrudReceipt } from '../render/receipt.js';
import { reconcileDisclosure } from '../shared/receiptParts.js';
import { notice } from '../shared/copyArea.js';
import { commandLine, HARD_INNER } from '../shared/writeParts.js';
import { DB_FILENAME } from '../paths.js';
import { fetchWeightLogs } from './records.js';
import { conclusionBlock, deliveryBlocks, envelopeOf, receiptPageOf, signed, stateCard, writtenDetailOf } from './plateDocs.js';
import { buildBatchReceiptDoc, buildLogReceiptDoc } from './logReceipt.js';

/** 体重 4 条会改数据库的命令（数据位，具名键集；分派层只调本文件，不再写命令名字面量比较）。 */
const WEIGHT_RECEIPT_KEYS: ReadonlySet<string> = new Set([
  'calorie.weight.log',
  'calorie.weight.batch',
  'calorie.weight.update',
  'calorie.weight.remove',
]);

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** 改体重回执整页：改前 → 改后逐条对照（吃回执行；带不出对照时只出一句空态，不留空表）。 */
function buildUpdateReceiptDoc(receipt: CrudReceipt, command: string): string {
  const rows = receipt.items.map((it) => ({
    record: it.id === undefined || it.id === null ? (it.date ?? '—') : '#' + it.id,
    change: it.reason === '' ? '—' : it.reason,
    note: it.detail === undefined || it.detail === '' ? '—' : it.detail,
  }));
  const changed = rows.filter((r) => r.change !== '—').length;
  const conclusion = '本次改动 ' + receipt.items.length + ' 条记录、写入 ' + receipt.writtenFields.length + ' 个字段'
    + (changed < rows.length ? '；有 ' + (rows.length - changed) + ' 条只改了备注（体重那一侧写 `—`）' : '')
    + '；改错可按上表「改前」原值再改一次。';
  const payload = [conclusion, ...rows.map((r) => r.record
    + (r.change === '—' ? '' : ' 改前 → 改后 ' + r.change)
    + (r.note === '—' ? '' : ' 备注 ' + r.note))];
  const content = [
    renderKpiGrid([
      stateCard(receipt, writtenDetailOf('calorie.weight.update'), receipt.noChange ? '无改动' : '已更新',
        receipt.noChange ? '无改动' : '已改动 ' + receipt.affectedRows + ' 行'),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      { label: '改动字段', value: receipt.writtenFields.length + ' 项', detail: receipt.writtenFields.join('、') || '—' },
    ]),
    // 老实物 crud_receipt.html:302-327 的 update 模式：只画实际变的字段，无变更不出空卡。
    renderDataTable({
      columns: [
        { key: 'record', label: '记录' },
        { key: 'change', label: '改前 → 改后' },
        { key: 'note', label: '备注' },
      ],
      rows,
      caption: '改前 → 改后对照（改前取值在写入前回读；体重那一侧写 `—` 即本次没改体重）',
      emptyText: '本次回执未带逐条对照（写入字段：' + (receipt.writtenFields.join('、') || '—') + '）',
    }),
    conclusionBlock(conclusion),
    reconcileDisclosure(receipt),
    deliveryBlocks(
      envelopeOf(receipt, payload.join(' ｜ ')), receipt, command,
      DB_FILENAME + ' · weight_log ｜ 本次改动 ' + receipt.items.length + ' 条 ｜ 影响 ' + receipt.affectedRows
        + ' 行 ｜ 字段 ' + (receipt.writtenFields.join('、') || '—'),
    ),
  ].join('');
  return receiptPageOf(receipt, content);
}

/** 删除后最新体重（老实物 `weight_batch_delete.html:128-133` 的主动回读）：库内最后一条按日期升序取末行。 */
function latestWeightAfter(db: DatabaseSync): { date: string; kg: number } | null {
  const rows = fetchWeightLogs(db, '1970-01-01', '2999-12-31');
  const last = rows[rows.length - 1];
  return last === undefined ? null : { date: last.date, kg: last.kg };
}

/** 删体重回执整页：删除前快照行 ＋ 删除后最新体重**成对**；没有快照行时出显式空态。 */
function buildRemoveReceiptDoc(db: DatabaseSync, receipt: CrudReceipt, command: string): string {
  const snap = [...receipt.items].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const kgOf = (it: CrudReceipt['items'][number] | undefined): number | null => {
    const raw = String(it?.detail ?? '').trim();
    const n = Number(raw);
    return raw !== '' && Number.isFinite(n) ? n : null;
  };
  const fw = kgOf(snap[0]);
  const lw = kgOf(snap[snap.length - 1]);
  const span = snap.length >= 2 && fw !== null && lw !== null ? round1(lw - fw) : null;
  const dir = span === null ? '' : span > 0 ? '上升' : span < 0 ? '下降' : '持平';
  const latest = latestWeightAfter(db);
  const conclusion = '本次删除 ' + snap.length + ' 条'
    + (span === null ? '' : '，区间 ' + fw + ' → ' + lw + ' kg（' + signed(span) + '，' + dir + '）')
    + '；' + (latest === null ? '删除后库里已无体重记录' : '删除后最新体重 ' + latest.kg + ' kg（' + latest.date + '）')
    + '。删除不可恢复，要还原请照上表快照原值重新记。';
  const payload = [conclusion, ...snap.map((it) => (it.id === undefined || it.id === null ? '' : '#' + it.id + ' ')
    + (it.date ?? '') + ' ' + (it.detail ?? '') + ' kg ' + it.status)];
  const content = [
    renderKpiGrid([
      stateCard(receipt, writtenDetailOf('calorie.weight.remove'), '已删除', '已删除 ' + snap.length + ' 条 · 不可恢复'),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次删除的行数' },
      { label: '删除条数', value: snap.length + ' 条', detail: '删除前快照的行数' },
    ]),
    renderKpiGrid([
      {
        label: '区间变化',
        value: span === null ? '—' : fw + ' → ' + lw + ' kg',
        detail: span === null
          ? (snap.length > 0 ? '删除不足两条，区间变化无从计算' : '本次没有删除快照行，区间变化无从计算')
          : signed(span) + '，' + dir + '（删前最早 → 最晚）',
        status: span === null ? 'empty' : 'warn',
        statusText: span === null ? '无区间' : dir,
      },
      {
        label: '删除后最新体重', value: latest === null ? '—' : String(latest.kg), unit: 'kg',
        detail: latest === null ? '删除后库里已无体重记录' : latest.date + ' · 删除后回读（与快照成对）',
        status: latest === null ? 'empty' : 'ok',
        statusText: latest === null ? '库里已空' : '已回读',
      },
    ]),
    // 老实物 crud_receipt.html:328-350 的 delete 模式（删除前快照）：那边无行时整卡隐藏，本页改一句空态。
    renderDataTable({
      columns: [
        { key: 'id', label: '编号' },
        { key: 'date', label: '日期' },
        { key: 'kg', label: '体重', align: 'right' },
        { key: 'status', label: '快照' },
      ],
      rows: snap.map((it) => ({
        id: it.id === undefined || it.id === null ? '—' : String(it.id),
        date: it.date ?? '—',
        kg: kgOf(it) === null ? '—' : kgOf(it) + ' kg',
        status: it.status,
      })),
      caption: '删除快照（删除前取值，共 ' + snap.length + ' 条）',
      emptyText: '本次没有删除快照行',
    }),
    notice({ title: '删除口径', msg: HARD_INNER, detail: '删除的行已从库中移除，页面不留撤销按钮（全仓无恢复入口）' }),
    conclusionBlock(conclusion),
    reconcileDisclosure(receipt),
    deliveryBlocks(
      envelopeOf(receipt, payload.join(' ｜ ')), receipt, command,
      DB_FILENAME + ' · weight_log ｜ 本次删除 ' + snap.length + ' 条 ｜ 影响 ' + receipt.affectedRows + ' 行 ｜ '
        + (latest === null ? '删除后库里已无记录' : '删除后最新 ' + latest.kg + ' kg（' + latest.date + '）'),
    ),
  ].join('');
  return receiptPageOf(receipt, content);
}

/** 体重 4 条会改数据库的命令的整页回执端口（分派层只调本函数）。 */
export function weightReceiptDoc(
  key: string, params: Record<string, unknown>, receipt: CrudReceipt, db: DatabaseSync,
): string | null {
  if (!WEIGHT_RECEIPT_KEYS.has(key)) return null;
  const command = commandLine(key, params);
  if (key === 'calorie.weight.batch') return buildBatchReceiptDoc(receipt, command);
  if (key === 'calorie.weight.update') return buildUpdateReceiptDoc(receipt, command);
  if (key === 'calorie.weight.remove') return buildRemoveReceiptDoc(db, receipt, command);
  return buildLogReceiptDoc(db, params, receipt, command);
}
