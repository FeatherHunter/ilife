/** 运动（HELP 场景 04「运动」下一级 · 记运动／改运动）· 写后回执页装配（#264）。
 *
 * 形状照抄场景 07 `src/profile/setup.ts` 的 `buildProfileSettingReceiptDoc` 与
 * `src/profile/update.ts` 的 `buildProfileUpdateReceiptDoc`（同一份 `assembleDocPage`、
 * 同一组 `copyArea`／`copyLog`、同一对 `statusCard`／`reconcileDisclosure`），只换内容：
 * 运动回执摆“本次明细”（单条项／值表）与“逐条明细／改前→改后／批量计数”（老实物
 * `crud_receipt.html` 的三块：`diff-card`／`items-card`／写入跳过失败数），不摆档案字段。
 * 老实物 `ctx-card`（今日累计）只在单条与复制下落“目标日累计”一行，其余批量多日不算。
 *
 * 对外 2 件（铁律五「不多于五个」）：
 *   ① `buildExerciseReceiptDoc`——三条写命令共用的整页装配；
 *   ② `ExerciseReceiptDetail`——随行的明细载荷（单条行／批量行／改前改后对／复制计数）。
 * 取数不自算口径：当日累计走 `analysis/utils.ts` 的 `EX_ALIVE` 活行口径，字段中文说法只此一处。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { EX_ALIVE } from '../analysis/utils.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import type { ExerciseRow } from './exerciseStore.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·运动回执';

/** 随行明细（写命令已落库，页面只读装配；空即按回执摘要兜底，不编数据）。 */
export interface ExerciseReceiptDetail {
  /** 单条／批量／复制／删除的逐条行（批量删是删前快照）。 */
  readonly rows?: readonly ExerciseRow[];
  /** 改类的改前→改后对（按 id 改为 1 对，按日改为 N 对）。 */
  readonly pairs?: readonly { readonly old: ExerciseRow; readonly new: ExerciseRow }[];
  /** 复制的跳过数（复制行在 rows 里，跳过行不在库里，只能计数）。 */
  readonly skipped?: number;
  /** 复制／单条的目标日期（当日累计按它算；不给即按首行日期）。 */
  readonly targetDate?: string;
}

/** 库列名 → 中文列名（老实物 `crud_receipt.html` 的 `FIELD_LABELS` 运动那半，中文面只此一处）。 */
const FIELD_LABELS: Record<string, string> = {
  exercise_type: '运动类型',
  date: '日期',
  time: '时间',
  duration_minutes: '时长',
  calories_burned: '消耗',
  category: '分类',
  difficulty: '强度',
  distance_km: '距离',
  avg_heart_rate: '平均心率',
  max_heart_rate: '最高心率',
  steps: '步数',
  reps: '次数',
  load_kg: '重量',
  set_index: '组号',
  is_backfill: '补录',
  note: '备注',
};

function fieldLabel(col: string): string {
  return FIELD_LABELS[col] ?? col;
}

/** 给人看的格值：没有值只写「未设置」（与场景 07 同词）。 */
function cellText(v: unknown, unit?: string): string {
  if (v === null || v === undefined) return '未设置';
  const s = String(v).trim();
  if (s === '') return '未设置';
  return unit === undefined || unit === '' ? s : s + ' ' + unit;
}

function rowText(row: ExerciseRow, col: string): string {
  const v: unknown = row[col];
  switch (col) {
    case 'duration_minutes': return cellText(v, '分钟');
    case 'calories_burned': return cellText(v, '卡');
    case 'distance_km': return cellText(v, 'km');
    case 'avg_heart_rate':
    case 'max_heart_rate': return cellText(v, 'bpm');
    case 'steps': return cellText(v, '步');
    case 'reps': return cellText(v, '次');
    case 'load_kg': return cellText(v, 'kg');
    case 'is_backfill': return v === 1 || v === true ? '是' : '否';
    default: return cellText(v);
  }
}

/** 单条明细（项／值两列；老实物 `diff-card` 新增态那半的人话版）。 */
function singleTable(row: ExerciseRow): string {
  const cols = ['exercise_type', 'date', 'time', 'duration_minutes', 'calories_burned', 'category', 'note', 'distance_km', 'avg_heart_rate', 'max_heart_rate', 'steps', 'reps', 'load_kg', 'set_index'];
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
    rows: cols.map((c) => ({ k: fieldLabel(c), v: rowText(row, c) })),
    caption: '本次明细（写后现值）',
  });
}

/** 逐条明细（老实物 `items-card` 那块：批量／复制／删除的每条一行）。 */
function itemsTable(rows: readonly ExerciseRow[]): string {
  return renderDataTable({
    columns: [
      { key: 'id', label: '编号' },
      { key: 'type', label: '类型' },
      { key: 'date', label: '日期' },
      { key: 'minutes', label: '时长' },
      { key: 'calories', label: '消耗' },
      { key: 'note', label: '备注' },
    ],
    rows: rows.map((r) => ({
      id: cellText(r['id']),
      type: cellText(r['exercise_type']),
      date: cellText(r['date']),
      minutes: rowText(r, 'duration_minutes'),
      calories: rowText(r, 'calories_burned'),
      note: cellText(r['note']),
    })),
    caption: '逐条明细（共 ' + rows.length + ' 条）',
    emptyText: '本次没有逐条明细',
  });
}

/** 批量计数（老实物写入／跳过／失败三数；运动批量今天只产写入，其余如实写 0）。 */
function batchTable(added: number): string {
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
    rows: [
      { k: '写入', v: added + ' 条' },
      { k: '跳过', v: '0 条' },
      { k: '失败', v: '0 条' },
    ],
    caption: '批量计数：写入／跳过／失败',
  });
}

/** 改前→改后（老实物 `diff-card` 修改态那半；多对时带编号前缀，不丢行）。 */
function diffTable(pairs: readonly { readonly old: ExerciseRow; readonly new: ExerciseRow }[]): string {
  const skip = new Set(['id', 'created_at', 'updated_at']);
  const rows: { field: string; change: string }[] = [];
  for (const p of pairs) {
    const id = cellText(p.new['id'] ?? p.old['id']);
    const prefix = pairs.length > 1 ? '#' + id + ' ' : '';
    const keys = new Set([...Object.keys(p.old), ...Object.keys(p.new)]);
    for (const k of keys) {
      if (skip.has(k)) continue;
      const a = p.old[k];
      const b = p.new[k];
      if (String(a ?? '') === String(b ?? '')) continue;
      rows.push({ field: prefix + fieldLabel(k), change: cellText(a) + ' → ' + cellText(b) });
    }
  }
  return renderDataTable({
    columns: [{ key: 'field', label: '字段' }, { key: 'change', label: '改前 → 改后' }],
    rows,
    caption: '改前 → 改后对照（共 ' + pairs.length + ' 条记录）',
    emptyText: '本次回执未带逐字段对照',
  });
}

/** 目标日累计（老实物 `ctx-card` 那块；写后现值，活行口径，不过滤即错）。 */
function dayTable(db: DatabaseSync, date: string): string {
  const r = db.prepare(
    'SELECT COUNT(*) AS n, COALESCE(SUM(calories_burned), 0) AS kcal, COALESCE(SUM(duration_minutes), 0) AS mins FROM exercise_log WHERE date = ? AND ' + EX_ALIVE,
  ).get(date) as { n: number; kcal: number; mins: number };
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
    rows: [
      { k: '日期', v: date },
      { k: '运动条数', v: String(r.n) + ' 条' },
      { k: '消耗累计', v: String(r.kcal) + ' 卡' },
      { k: '时长累计', v: String(r.mins) + ' 分钟' },
    ],
    caption: '当日累计（写后现值）',
  });
}

function writtenDetailOf(key: string): string {
  if (key === 'calorie.exercise.update') return '已更新运动记录';
  if (key === 'calorie.exercise.remove') return '已删除运动记录';
  return '已写入运动记录';
}

/** 三条写命令共用的写后回执整页：状态 ＋ 明细／对照／计数 ＋ 对账 ＋ 复制区。
 *  `command` ＝ AI 真跑那条写命令的原文，进「复制日志」第 4 段。 */
export function buildExerciseReceiptDoc(
  db: DatabaseSync,
  key: string,
  receipt: CrudReceipt,
  command: string,
  detail: ExerciseReceiptDetail = {},
): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  const rows = detail.rows ?? [];
  const pairs = detail.pairs ?? [];
  const wake = receipt.meta.wakeWord;
  const blocks: string[] = [];
  if (key === 'calorie.exercise.add' && wake === '批量补记运动') {
    blocks.push(batchTable(rows.length));
    blocks.push(itemsTable(rows));
  } else if (key === 'calorie.exercise.add' && wake === '复制昨日运动') {
    const target = detail.targetDate ?? (rows.length > 0 ? String(rows[0]?.['date'] ?? '') : '');
    blocks.push(renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '复制', v: String(rows.length) + ' 条' },
        { k: '跳过', v: String(detail.skipped ?? 0) + ' 条' },
        { k: '目标日期', v: target === '' ? '未设置' : target },
      ],
      caption: '批量计数：复制／跳过',
    }));
    blocks.push(itemsTable(rows));
    if (target !== '') blocks.push(dayTable(db, target));
  } else if (key === 'calorie.exercise.add') {
    if (rows.length > 0 && rows[0]) blocks.push(singleTable(rows[0] as ExerciseRow));
    else blocks.push(itemsTable(rows));
    const d = detail.targetDate ?? (rows.length > 0 ? String(rows[0]?.['date'] ?? '') : '');
    if (d !== '') blocks.push(dayTable(db, d));
  } else if (key === 'calorie.exercise.update') {
    blocks.push(renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [{ k: '命中条数', v: String(pairs.length) + ' 条' }],
      caption: '批量计数：命中',
    }));
    blocks.push(diffTable(pairs));
  } else {
    blocks.push(renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [{ k: '删除条数', v: String(rows.length) + ' 条' }],
      caption: '批量计数：删除（软删除：行保留，已从查询与统计中排除；暂无恢复入口）',
    }));
    blocks.push(itemsTable(rows));
  }
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
    ...blocks,
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
    eyebrow: '运动 · 写后回执',
    subtitle: receipt.summary,
    content,
  });
}
