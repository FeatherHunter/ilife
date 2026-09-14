/** 健身计划（HELP 场景 05「健身计划」）· 写后回执整页装配（T351 视觉修复·实施兵B）。
 *
 * 10 条会改数据库的命令按命令名认领整页回执；其余命令一律返回 null（调用方原样放行）。
 * 形状照抄饮食 `src/diet/receipt.ts`（同一份 `assembleDocPage`、同一组 `copyLog`／
 * `statusCard`／`reconcileDisclosure`），只换内容：老实物 `crud_receipt.html` 的
 * 标识卡＋差异卡落点为状态卡＋改动对照表，M5 四要素（记录编号／写入时间／影响行数／
 * 写入字段）全部上页；操作名一律中文，不出现 `op=` 裸词与 `# 成功 ·` 前缀。
 * 底部复制区与场景 05 各页同形（共用件 `../render/planCopyBlock.js` 的冻结双按钮，
 * 不出三格式菜单）。必须在 `withM5` 之后调用（见 `src/cli/write.ts`）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { getPlan } from './planStore.js';
import { assembleDocPage } from '../shared/docPage.js';
import { planCopyBlock } from '../render/planCopyBlock.js';
import { copyLog } from '../shared/copyArea.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import { commandLine } from '../shared/writeParts.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·健身计划回执';

/** 训练计划 10 条会改数据库的命令（具名键集；分派层只调本文件，不再写命令名字面量比较）。 */
const WORKOUT_RECEIPT_KEYS: ReadonlySet<string> = new Set([
  'calorie.workout.plan-set',
  'calorie.workout.plan-copy',
  'calorie.workout.plan-set-week',
  'calorie.workout.plan-add-movement',
  'calorie.workout.plan-set-rest',
  'calorie.workout.plan-update',
  'calorie.workout.plan-update-day',
  'calorie.workout.plan-delete-day',
  'calorie.workout.plan-update-movement',
  'calorie.workout.plan-delete',
]);

/** 写后计划现值（`getPlan` 正本；撤销后为空即明示已撤销，不编数）。 */
function currentPlanTable(db: DatabaseSync): string {
  const plan = getPlan(db);
  if (!plan.config && plan.sessions.length === 0) {
    return renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [{ k: '当前计划', v: '计划已撤销（配置与训练安排均为空）' }],
      caption: '写后现值',
    });
  }
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
    rows: [
      { k: '计划', v: String(plan.config?.title ?? '未命名计划') },
      { k: '训练场次', v: plan.sessions.length + ' 场' },
    ],
    caption: '写后现值（`getPlan` 现值）',
  });
}

/** 老实物差异卡位：回执带对照即摆对照，否则只摆写入字段。 */
function itemsTable(receipt: CrudReceipt): string {
  const rows = receipt.items
    .filter((it) => (it.status ?? '') !== '')
    .map((it) => ({
      field: it.detail && it.detail !== '' ? it.detail : it.status,
      change: [it.reason ?? '', it.status ?? ''].filter((p) => p !== '').join(' · ') || '—',
    }));
  return renderDataTable({
    columns: [{ key: 'field', label: '事项' }, { key: 'change', label: '结果' }],
    rows,
    caption: '改动对照',
    emptyText: '本次回执未带逐项明细（写入字段：'
      + (receipt.writtenFields.join('、') || '未设置') + '）',
  });
}

function buildWorkoutReceiptDoc(
  db: DatabaseSync, key: string, params: Record<string, unknown>, receipt: CrudReceipt, command: string,
): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderKpiGrid([
      statusCard(receipt, '已写入训练计划'),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '写入字段',
        value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.join('、') || '未设置',
      },
    ]),
    currentPlanTable(db),
    itemsTable(receipt),
    reconcileDisclosure(receipt),
    planCopyBlock({
      envelope,
      log: copyLog({
        command, source: receipt.meta.source, m5Line: receipt.m5Line,
        actionAt: receipt.meta.actionAt, version: DOC_VERSION,
      }),
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: receipt.scene + ' · 回执',
    eyebrow: '健身计划 · 写后回执',
    subtitle: receipt.summary,
    content,
  });
}

/** 训练计划 10 条会改数据库的命令的整页回执端口（分派层只调本函数）。 */
export function workoutReceiptDoc(
  key: string, params: Record<string, unknown>, receipt: CrudReceipt, db: DatabaseSync,
): string | null {
  if (!WORKOUT_RECEIPT_KEYS.has(key)) return null;
  return buildWorkoutReceiptDoc(db, key, params, receipt, commandLine(key, params));
}
