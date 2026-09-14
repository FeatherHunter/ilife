/** 改／删体重记录（HELP 场景 03「体重」下一级）· **写后回执两页**（`calorie.weight.update`／`calorie.weight.remove`）
 *  ＋ 体重写命令整页回执的**端口**（`weightReceiptDoc`，经本能力 `index.ts` 转出，分派层只调门）。
 *
 * 形状照抄场景 07 `src/profile/receipt.ts` 的整页回执端口（同一份 `assembleDocPage`、同一组
 * `copyArea`／`copyLog`、同一对 `statusCard`／`reconcileDisclosure`）。老实物 `crud_receipt.html`
 * 里值得继承的两样接在本文件：**按 op 选分节＋空卡守卫**（`:302-327` update 只出实际变的行、无变更不出空卡；
 * `:328-350` delete 出删除前快照，本页把整卡隐藏改成一句空态）与**删除前后成对**（老实物
 * `weight_batch_delete.html:117-133` 的区间变化＋删除后最新体重主动回读）。
 * 单条／批量两页住同目录 `logReceipt.ts`；共用件住同目录 `plateDocs.ts`。
 *
 * #483 文本审查：删类页「快照／硬删除／不可恢复」原本一页说五遍（副标题／徽章／快照列／提示块／结论，
 * 副标题与复制载荷是机器面、一字不动），可见文本收到结论句一处 + 状态卡一句；删掉整块「删除口径」提示块
 * 与「影响行数」卡（后者与状态卡同一个数）；字段名换中文标签；对账区换 `plateDocs.reconcileBlock`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { CrudReceipt } from '../render/receipt.js';
import { commandLine } from '../shared/writeParts.js';
import { fetchWeightLogs } from './records.js';
import {
  conclusionBlock, deliveryBlocks, envelopeOf, fieldLabelList, receiptPageOf, reconcileBlock, signed,
  stateCard, writtenDetailOf,
} from './plateDocs.js';
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
  const conclusion = '本次改动 ' + receipt.items.length + ' 条记录'
    + (changed < rows.length ? '；有 ' + (rows.length - changed) + ' 条只改了备注（体重没动，下表写 —）' : '')
    + '。改错了，照上表「改前」那一列的原值再改一次就行。';
  const payload = [conclusion, ...rows.map((r) => r.record
    + (r.change === '—' ? '' : ' 改前 → 改后 ' + r.change)
    + (r.note === '—' ? '' : ' 备注 ' + r.note))];
  const content = [
    renderKpiGrid([
      stateCard(receipt, {
        label: '本次改动', word: '已改动', count: receipt.affectedRows,
        detail: writtenDetailOf('calorie.weight.update'),
      }),
      ...(receipt.writtenFields.length === 0 ? [] : [{
        label: '改动字段', value: receipt.writtenFields.length + ' 项',
        detail: fieldLabelList(receipt.writtenFields),
      }]),
    ]),
    // 老实物 crud_receipt.html:302-327 的 update 模式：只画实际变的字段，无变更不出空卡。
    renderDataTable({
      columns: [
        { key: 'record', label: '记录' },
        { key: 'change', label: '改前 → 改后' },
        { key: 'note', label: '备注' },
      ],
      rows,
      caption: '改前 → 改后对照（— 表示这一次没动它）',
      emptyText: '这次没有逐条对照（本次写入字段：' + fieldLabelList(receipt.writtenFields) + '）',
    }),
    conclusionBlock(conclusion),
    reconcileBlock(receipt),
    deliveryBlocks(
      envelopeOf(receipt, payload.join(' ｜ ')), receipt, command,
      '本次改动 ' + receipt.items.length + ' 条 ｜ 字段 ' + fieldLabelList(receipt.writtenFields),
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
    + (span === null ? '' : '，删除前最早 ' + fw + ' kg → 最晚 ' + lw + ' kg（' + signed(span) + '，' + dir + '）')
    + '；' + (latest === null ? '删除后库里已无体重记录' : '删除后最新体重 ' + latest.kg + ' kg（' + latest.date + '）')
    + '。删除不可恢复，要还原请照上表原值重新记一次。';
  const payload = [conclusion, ...snap.map((it) => (it.id === undefined || it.id === null ? '' : '#' + it.id + ' ')
    + (it.date ?? '') + ' ' + (it.detail ?? '') + ' kg ' + it.status)];
  const content = [
    renderKpiGrid([
      stateCard(receipt, {
        label: '本次删除', word: '已删除', count: receipt.affectedRows,
        detail: writtenDetailOf('calorie.weight.remove'),
      }),
      {
        /* 值槽只放区间净变化这一个数（数字＋单位）；首末对（`72.5 → 70.1 kg`，14 字）进 `detail`
         * ——它是区间串，进值槽会被断行撑高（t154 用户读数）。 */
        label: '区间变化',
        value: span === null ? '—' : signed(span),
        detail: span === null
          ? (snap.length > 0 ? '只删了 ' + snap.length + ' 条，看不出区间变化' : '这次没有可对照的行')
          : '删除前最早 ' + fw + ' → 最晚 ' + lw + ' kg',
        status: span === null ? 'empty' : 'warn',
        statusText: span === null ? '没法比' : dir,
      },
      {
        label: '删除后最新体重', value: latest === null ? '—' : String(latest.kg), unit: 'kg',
        detail: latest === null ? '删除后库里已无体重记录' : latest.date + ' · 删除后重新读到的值',
        status: latest === null ? 'empty' : 'ok',
        statusText: latest === null ? '库里已空' : '库里还有记录',
      },
    ]),
    // 老实物 crud_receipt.html:328-350 的 delete 模式（删除前快照）：那边无行时整卡隐藏，本页改一句空态。
    // 列头「快照」改「状态」、单元格写「已删除」——表本身就是删除前的原值，不必每行再喊一遍「硬，不可恢复」。
    renderDataTable({
      columns: [
        { key: 'id', label: '编号' },
        { key: 'date', label: '日期' },
        { key: 'kg', label: '体重', align: 'right' },
        { key: 'status', label: '状态' },
      ],
      rows: snap.map((it) => ({
        id: it.id === undefined || it.id === null ? '—' : String(it.id),
        date: it.date ?? '—',
        kg: kgOf(it) === null ? '—' : kgOf(it) + ' kg',
        status: '已删除',
      })),
      caption: '删除前的原值（共 ' + snap.length + ' 条）',
      emptyText: '这次没有删除前的原值行',
    }),
    conclusionBlock(conclusion),
    reconcileBlock(receipt),
    deliveryBlocks(
      envelopeOf(receipt, payload.join(' ｜ ')), receipt, command,
      '本次删除 ' + snap.length + ' 条 ｜ '
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
