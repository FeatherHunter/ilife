/** 饮食（HELP 场景 02「饮食」）· 写后回执页装配（#269 骨架）。
 *
 * 13 条会改数据库的命令按命令名认领整页回执；其余命令一律返回 null（调用方原样放行）。
 * 必须在 `withM5` 之后调用：新页要印 `affectedRows`／`writtenFields`／`m5Line`。
 * 命令原文与库与回执一起交给装配页（复制日志第 4 段与写后累计计算用）。
 *
 * 形状照抄场景 07 `src/profile/setup.ts` 的 `buildProfileSettingReceiptDoc` 与
 * `src/profile/update.ts` 的 `buildProfileUpdateReceiptDoc`（同一份 `assembleDocPage`、
 * 同一组 `copyArea`／`copyLog`、同一对 `statusCard`／`reconcileDisclosure`），只换内容：
 * 饮食回执摆“今日累计”（`fetch/diet.ts` 的 `getDailySummary` 现值）与改动字段／对照，
 * 不摆档案字段。老实物 `crud_receipt.html` 的四块（操作回执／字段变更／今日累计／复制明细）
 * 在本页的落点见各段注释；字段级逐字对齐是 #270 的事，本票只立骨架。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { getDailySummary } from '../fetch/diet.js';
import { todayISO } from '../analysis/utils.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import { commandLine } from '../shared/writeParts.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·饮食回执';

/** 饮食 13 条会改数据库的命令（数据位，具名键集；分派层只调本文件，不再写命令名字面量比较）。 */
const DIET_RECEIPT_KEYS: ReadonlySet<string> = new Set([
  'calorie.diet.add',
  'calorie.diet.batch',
  'calorie.diet.copy',
  'calorie.diet.remove',
  'calorie.diet.remove-by-date',
  'calorie.diet.remove-by-range',
  'calorie.diet.remove-by-type',
  'calorie.diet.update',
  'calorie.diet.update-by-date',
  'calorie.product.add',
  'calorie.product.update',
  'calorie.product.deprecate',
  'calorie.water.log',
]);

/** 食品库三条走食品库措辞，其余走饮食记录措辞（`statusCard` 的必填参数，不给默认值）。 */
const PRODUCT_KEYS: ReadonlySet<string> = new Set([
  'calorie.product.add',
  'calorie.product.update',
  'calorie.product.deprecate',
]);

function writtenDetailOf(key: string): string {
  if (PRODUCT_KEYS.has(key)) return '已写入食品库';
  if (key === 'calorie.water.log') return '已写入饮水记录';
  return '已写入饮食记录';
}

/** 本次影响的日期（累计按它算）：参数里有哪天就按哪天，都没有即今天。 */
function receiptDate(params: Record<string, unknown>): string {
  const pick = (name: string): string | null => {
    const v = params[name];
    return typeof v === 'string' && v !== '' ? v : null;
  };
  return pick('date') ?? pick('from') ?? pick('fromDate') ?? pick('to') ?? pick('toDate')
    ?? pick('start') ?? pick('end') ?? todayISO();
}

/** 老实物 `ctx-card`（今日累计）：写后现值，不自算口径（`getDailySummary` 正本）。 */
function dailyTable(db: DatabaseSync, date: string): string {
  const s = getDailySummary(db, date);
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
    rows: [
      { k: '日期', v: s.date },
      { k: '热量累计', v: String(s.totals.cal) + ' 卡' },
      { k: '蛋白累计', v: String(s.totals.pro) + ' g' },
      { k: '碳水累计', v: String(s.totals.carbs) + ' g' },
      { k: '脂肪累计', v: String(s.totals.fat) + ' g' },
      { k: '饮食条数', v: String(s.entryCount) + ' 条' },
      { k: '饮水累计', v: String(s.waterMl) + ' ml' },
    ],
    caption: '写后累计（`getDailySummary` 现值；目标对照是 #270 的事）',
  });
}

/** 老实物 `diff-card`／`items-card` 的骨架位：回执带对照即摆对照，否则只摆写入字段。 */
function itemsTable(receipt: CrudReceipt): string {
  const rows = receipt.items
    .filter((it) => (it.status ?? '') !== '')
    .map((it) => ({
      field: it.status,
      change: [it.reason ?? '', it.detail ?? ''].filter((p) => p !== '').join(' · ') || '—',
    }));
  return renderDataTable({
    columns: [{ key: 'field', label: '字段' }, { key: 'change', label: '改动' }],
    rows,
    caption: '改动字段对照（回执未带对照时为空表，只看上方写入字段）',
    emptyText: '本次回执未带逐字段对照（写入字段：'
      + (receipt.writtenFields.join('、') || '未设置') + '）',
  });
}

/** 饮食 13 条的通用回执整页：状态 ＋ 影响行数 ＋ 写入字段 ＋ 今日累计 ＋ 对照 ＋ 对账 ＋ 复制区。 */
function buildDietReceiptDoc(
  db: DatabaseSync, key: string, params: Record<string, unknown>, receipt: CrudReceipt, command: string,
): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderKpiGrid([
      statusCard(receipt, writtenDetailOf(key)),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '写入字段',
        value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.join('、') || '未设置',
      },
    ]),
    dailyTable(db, receiptDate(params)),
    itemsTable(receipt),
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
    eyebrow: '饮食 · 写后回执',
    subtitle: receipt.summary,
    content,
  });
}

/** 饮食 13 条会改数据库的命令的整页回执端口（分派层只调本函数）。 */
export function dietReceiptDoc(
  key: string, params: Record<string, unknown>, receipt: CrudReceipt, db: DatabaseSync,
): string | null {
  if (!DIET_RECEIPT_KEYS.has(key)) return null;
  return buildDietReceiptDoc(db, key, params, receipt, commandLine(key, params));
}
