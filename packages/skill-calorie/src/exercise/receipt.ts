/** 运动（HELP 场景 04「运动」下一级 · 记运动／改运动／删运动）· 写后回执页装配。
 *
 * #264 建的形状（`assembleDocPage` 整页、`statusCard`／`reconcileDisclosure`、`copyArea` 三格式恒开、
 * 当日累计走 `analysis/utils.ts` 的 `EX_ALIVE` 活行口径）本票不动；#449 把字段展示收口到域标签表：
 * 写入字段卡、字段变更卡与页面副标题一律查 `exercise/fieldLabels.ts`（`shared/fieldLabel.ts` 的查表口径，
 * 缺项回退原键名），**中文列名表不再住本件**——用户可见文本里不留参数名。
 * #423 换版式：
 * 照地图 #156 融合设计（`docs/skills/skill-calorie/t156-融合设计.md`，样张 `t156-样张-写后回执.html`）
 * 把回执页做成**页面族的样板**，八条——① 四态头走 #422 `shared/operationHead.ts`（三张表只一处定义）；
 * ② 字段变更卡共用一张（改＝旧→新、删＝快照、增＝新增内容，同一行类，箭位可见性占位），零行＝整卡不出现；
 * ③ 四张卡（状态／变更／当日累计／明细）各自判空——不留空壳、不印空标题；④ 撤销入口只在收到撤销指令时出；
 * ⑤ 来源脚注走 #422 `shared/sourceLine.ts`（老回执页缺这一行）；⑥ 明细列按运动口径（日期／类型／时长／消耗／
 * 备注），不再露饮食口径的「克」；⑦ 页内导航＋可打印＋口径行（#420 三件）；⑧ 三格式复制走既有 `shared/copyArea.ts`。
 * 页头写人话：`<title>` 与眉标里不出现命令键、票号与工序词。
 *
 * 对外 2 件（铁律五）：① `buildExerciseReceiptDoc`——三条写命令共用的整页装配；
 * ② `ExerciseReceiptDetail`——随行明细载荷（单条行／批量行／改前改后对／复制计数／撤销指令）。
 * 取数不自算口径：当日累计走 `EX_ALIVE`；删除措辞读 `shared/writeParts.ts` 的单源。
 */
import type { DatabaseSync } from 'node:sqlite';
import {
  renderCaliberLine, renderChangeRows, renderDataTable, renderDisclosure, renderKpiGrid, renderPreBlock, renderTocBlock,
} from 'base-paint/blocks';
import type { ChangeRowInput, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { CrudReceipt } from '../render/receipt.js';
import { EX_ALIVE } from '../analysis/utils.js';
import { CALORIE_COPY_ACTION } from '../render/copy.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { operationHead } from '../shared/operationHead.js';
import type { ReceiptOp } from '../shared/operationHead.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import { fieldLabel } from '../shared/fieldLabel.js';
import { sourceLine } from '../shared/sourceLine.js';
import { SOFT_EXCLUDED } from '../shared/writeParts.js';
import { EXERCISE_DOMAIN } from './fieldLabels.js';
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
  /** 本次写操作的撤销指令（有才出撤销入口；全仓今天没有命令带它，故页面恒不出——第 4 条）。 */
  readonly undoCli?: string;
}

/** 快照／新增内容要逐个摆出来看的列（按人读的顺序；值没有就不摆这一行）。 */
const SNAPSHOT_COLS = ['exercise_type', 'date', 'time', 'duration_minutes', 'calories_burned', 'category', 'difficulty', 'distance_km', 'avg_heart_rate', 'max_heart_rate', 'steps', 'reps', 'load_kg', 'set_index', 'is_backfill', 'note'];

const SKIP_COLS = new Set(['id', 'created_at', 'updated_at', 'is_deleted']);

/** 字段名 → 中文标签：查 `exercise/fieldLabels.ts` 那张域表的单源口径（`#449`，缺项回退原键名）。 */
function label(col: string): string {
  return fieldLabel(EXERCISE_DOMAIN, col);
}

/** 摘要里的字段键也换掉：写命令给的摘要按库列名报字段（如「已更新运动 #1（duration_minutes）」），
 *  它是页面副标题这一处可见文本；只换**域表里登记过**的键，没登记的原样留着（截断在词边界）。 */
function labelSummary(summary: string): string {
  return summary.replace(/[A-Za-z][A-Za-z0-9_]*/g, (token) => label(token));
}

/** 给人看的格值：没有值只写「未设置」（与场景 07 同词）。 */
function cellText(v: unknown, unit?: string): string {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s === '' ? '未设置' : (unit === undefined || unit === '' ? s : s + ' ' + unit);
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

/** 这个字段有没有值得摆出来的值（空／0／无意义的假值不摆，免得快照满屏「未设置」）。 */
function hasValue(row: ExerciseRow, col: string): boolean {
  const v: unknown = row[col];
  if (v === null || v === undefined || v === '') return false;
  if (v === 0 || v === false) return false;
  return true;
}

/** 页内一张卡（`id` 即页内导航的锚点，导航项按同一份清单生成）；卡外壳＝锚点 id ＋ 区块 HTML。 */
interface Card { readonly id: string; readonly label: string; readonly html: string }

function shell(card: Card): string {
  return '<section id="' + card.id + '">' + card.html + '</section>';
}
/* ───────────────────────────── ② 字段变更卡（共用一张） ───────────────────────────── */

/** 一条多记录场景下的前缀（多对／多条时带记录号，不丢行）。 */
function idPrefix(rows: number, row: ExerciseRow | undefined): string {
  if (rows <= 1 || row === undefined) return '';
  return '#' + cellText(row['id']) + ' ';
}

/** 字段变更卡的内容：改＝旧→新对照；删＝删除前快照；增＝新增内容。零行 → `''`（整卡不出现）。 */
function changeCard(op: ReceiptOp, rows: readonly ExerciseRow[], pairs: readonly { readonly old: ExerciseRow; readonly new: ExerciseRow }[]): Card | null {
  const items: ChangeRowInput[] = [];
  if (op === 'update') {
    for (const pair of pairs) {
      const keys = new Set([...Object.keys(pair.old), ...Object.keys(pair.new)]);
      for (const col of keys) {
        if (SKIP_COLS.has(col)) continue;
        const before = pair.old[col];
        const after = pair.new[col];
        if (String(before ?? '') === String(after ?? '')) continue;
        items.push({ label: idPrefix(pairs.length, pair.new) + label(col), before: rowText(pair.old, col), after: rowText(pair.new, col) });
      }
    }
  } else if (op === 'delete') {
    for (const row of rows) {
      for (const col of SNAPSHOT_COLS) {
        if (!hasValue(row, col)) continue;
        items.push({ label: idPrefix(rows.length, row) + label(col), before: rowText(row, col), arrow: false });
      }
    }
  } else {
    for (const row of rows) {
      for (const col of SNAPSHOT_COLS) {
        if (!hasValue(row, col)) continue;
        items.push({ label: idPrefix(rows.length, row) + label(col), after: rowText(row, col), arrow: false });
      }
    }
  }
  if (items.length === 0) return null;
  const title = op === 'update' ? '改前 → 改后对照（共 ' + pairs.length + ' 条记录）'
    : op === 'delete' ? '删除前快照（共 ' + rows.length + ' 条）'
      : '本次明细（新增内容' + (rows.length > 1 ? '，共 ' + rows.length + ' 条' : '') + '）';
  return { id: 'sec-change', label: '字段变更', html: renderDisclosure({ title, contentHtml: renderChangeRows({ rows: items }), open: true }) };
}
/* ───────────────────────────── ③ 明细卡（运动口径列） ───────────────────────────── */

/** 明细列＝运动口径（日期／类型／时长／消耗／备注；#423 第 6 条：不再露饮食口径的「克」）。 */
const DETAIL_COLUMNS = ['日期', '类型', '时长', '消耗', '备注'] as const;

function detailCard(rows: readonly ExerciseRow[]): Card | null {
  if (rows.length === 0) return null;
  return {
    id: 'sec-detail',
    label: '逐条明细',
    html: renderDataTable({
      columns: DETAIL_COLUMNS.map((label) => ({ key: label, label })),
      rows: rows.map((r) => ({
        日期: cellText(r['date']),
        类型: cellText(r['exercise_type']),
        时长: rowText(r, 'duration_minutes'),
        消耗: rowText(r, 'calories_burned'),
        备注: cellText(r['note']),
      })),
      caption: '逐条明细（共 ' + rows.length + ' 条）',
    }),
  };
}
/* ───────────────────────── 计数卡 ／ 当日累计卡 ／ 来源脚注 ／ 口径行 ───────────────────────── */

function countCard(caption: string, rows: readonly (readonly [string, string])[]): Card {
  return {
    id: 'sec-count',
    label: '本次写入',
    html: renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: rows.map(([k, v]) => ({ k, v })),
      caption,
    }),
  };
}

/** 某天活行数（`EX_ALIVE` 活行口径：软删除的行不计；0 即不出当日累计卡）。 */
function aliveCount(db: DatabaseSync, date: string): number {
  const r = db.prepare('SELECT COUNT(*) AS n FROM exercise_log WHERE date = ? AND ' + EX_ALIVE).get(date) as { n: number };
  return r.n;
}

/** 当日累计卡（老实物 `ctx-card`；写后现值，活行口径，不过滤即错）。空即整卡不出现。 */
function dayCard(db: DatabaseSync, date: string): Card | null {
  if (date === '' || aliveCount(db, date) === 0) return null;
  const r = db.prepare(
    'SELECT COUNT(*) AS n, COALESCE(SUM(calories_burned), 0) AS kcal, COALESCE(SUM(duration_minutes), 0) AS mins FROM exercise_log WHERE date = ? AND ' + EX_ALIVE,
  ).get(date) as { n: number; kcal: number; mins: number };
  return {
    id: 'sec-day',
    label: '当日累计',
    html: renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '日期', v: date },
        { k: '运动条数', v: String(r.n) + ' 条' },
        { k: '消耗累计', v: String(r.kcal) + ' 卡' },
        { k: '时长累计', v: String(r.mins) + ' 分钟' },
      ],
      caption: '当日累计（写后现值）',
    }),
  };
}

/** 来源脚注（#422 `sourceLine`）：窗口用本次回执自己的日期区间，条数＝本次回执的记录数。 */
function sourceCard(receipt: CrudReceipt, dates: readonly string[], count: number, fallback: string): Card | null {
  const window = dates.length > 0 ? [...dates].sort() : (fallback === '' ? [] : [fallback]);
  if (window.length === 0) return null;
  return {
    id: 'sec-source',
    label: '数据来源',
    html: sourceLine({ source: receipt.meta.source, start: window[0] ?? '', end: window[window.length - 1] ?? '', count }),
  };
}

/** 口径行（#420 `renderCaliberLine`）：页内数字怎么来的，写在页面上。 */
function caliberText(hasDay: boolean): string {
  const parts = ['影响行数＝本次写库前后 total_changes 增量'];
  if (hasDay) parts.push('当日累计只数未删除的行（软删除的行不计）');
  parts.push('时长＝分钟、消耗＝卡');
  return '口径：' + parts.join('；');
}

/** 撤销入口（第 4 条）：给了撤销指令才出——可复制的指令块，不是点了没反应的死按钮。
 *  全仓今天 0 个 restore/undo 入口，故这条分支在真出口上恒不命中（产物里连「撤销」二字都没有）。 */
function undoBlock(undoCli: unknown): string {
  if (typeof undoCli !== 'string' || undoCli.trim() === '') return '';
  return renderPreBlock({
    label: '撤销指令（可复制重跑）',
    command: undoCli.trim(),
    actionId: CALORIE_COPY_ACTION.actionId,
    copyLabel: CALORIE_COPY_ACTION.label,
  });
}

function writtenDetailOf(key: string): string {
  if (key === 'calorie.exercise.update') return '已更新运动记录';
  if (key === 'calorie.exercise.remove') return '已删除运动记录';
  return '已写入运动记录';
}

/** 三条写命令共用的写后回执整页：四态头 ＋ 计数／变更／明细／当日累计 ＋ 来源 ＋ 对账 ＋ 复制区。
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
  const op: ReceiptOp = receipt.op;
  const isAdd = key === 'calorie.exercise.add';
  const isBatch = isAdd && wake === '批量补记运动';
  const isCopy = isAdd && wake === '复制昨日运动';
  const target = detail.targetDate ?? (rows.length > 0 ? String(rows[0]?.['date'] ?? '') : '');
  const dates = [...new Set([
    ...rows.map((r) => String(r['date'] ?? '')),
    ...pairs.map((p) => String(p.new['date'] ?? p.old['date'] ?? '')),
  ])].filter((d) => d !== '');

  // ① 计数卡：四种写的数（批量／复制／命中／删除）都在这一张，口径与 #264 逐字一致。
  const countRows: (readonly [string, string])[] = isBatch
    ? [['写入', rows.length + ' 条'], ['跳过', '0 条'], ['失败', '0 条']]
    : isCopy
      ? [['复制', rows.length + ' 条'], ['跳过', String(detail.skipped ?? 0) + ' 条'], ['目标日期', target === '' ? '未设置' : target]]
      : op === 'update'
        ? [['命中条数', pairs.length + ' 条']]
        : [['删除条数', rows.length + ' 条']];
  const countCaption = isBatch
    ? '批量计数：写入／跳过／失败'
    : isCopy
      ? '批量计数：复制／跳过'
      : op === 'update' ? '批量计数：命中' : '批量计数：删除' + SOFT_EXCLUDED;
  const counts = countCard(countCaption, countRows);
  // ② 变更卡（共用一张）／③ 明细卡（运动口径，只有逐条形态才摆）／④ 当日累计卡（活行口径、空即不出）。
  const change = changeCard(op, rows, pairs);
  const detailRows = detailCard(op === 'delete' || isBatch || isCopy ? rows : []);
  const day = dayCard(db, detail.targetDate ?? (dates.length === 1 ? (dates[0] ?? '') : ''));
  const source = sourceCard(receipt, dates, Math.max(rows.length, pairs.length), target);

  // 状态卡判空：没有写入、没有改动、也不是「无改动」这一态时，整块 KPI 不出现（不留空壳）。
  const kpi: KpiCardInput[] = [];
  if (receipt.affectedRows > 0 || receipt.writtenFields.length > 0 || receipt.noChange) {
    kpi.push(statusCard(receipt, writtenDetailOf(key)));
  }
  if (receipt.affectedRows > 0) kpi.push({ label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' });
  if (receipt.writtenFields.length > 0) {
    kpi.push({ label: '写入字段', value: receipt.writtenFields.length + ' 项', detail: receipt.writtenFields.map(label).join('、') || '未设置' });
  }

  const cards = [counts, change, detailRows, day, source].filter((c): c is Card => c !== null);
  const content = [
    renderTocBlock({ items: cards.map((c) => ({ id: c.id, text: c.label })) }),
    operationHead({ op, title: wake, recordId: receipt.recordId, actionAt: receipt.meta.actionAt, source: receipt.meta.source }),
    kpi.length > 0 ? renderKpiGrid(kpi) : '',
    renderCaliberLine(caliberText(day !== null)),
    cards.map(shell).join(''),
    undoBlock(detail.undoCli),
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
    subtitle: labelSummary(receipt.summary),
    content,
    // 可打印版面（#420 第 7 条）：类走 `assembleDocPage` 的 `printable` 透传位（#448），
    // 打印规则（隐藏页内导航与区块复制区、具名页 `@page printable`）见 `base-render/src/blocks.ts`。
    printable: true,
  });
}
