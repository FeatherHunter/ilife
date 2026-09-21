// 心愿类·向导收集（#665）：排期向导／完成向导的前置数据收集（只读，不写库不渲染）。
// 老 `wish-batch-plan`／`wish-complete`（`memo_cli.py:763-967`）的 TS 换皮，口径逐项照搬：
// 排期默认只列未排期（`--all` 含已排期，`--ids` 精确指定，两者互斥）；完成默认列全部心愿
// （`--only-overdue` 仅未排期＋已过期，`--ids` 与之互斥；`--all` 等同默认，留作兼容）。
import { type MemoDb } from '../fetch/db.js';
import { MemoPolicyError } from '../shared/errors.js';
import { normalizeDue } from './due.js';

export interface PlanWizardItem {
  readonly id: number;
  readonly content: string;
  readonly category: string;
  readonly sub_category: string | null;
  readonly current_due: string | null;
  readonly feishu_task_guid: string | null;
  readonly selected: boolean;
  readonly suggested_due: string | null;
}

export interface PlanWizardInput {
  readonly ids?: unknown;
  readonly all?: unknown;
  readonly suggestDue?: unknown;
}

function asIdList(value: unknown): number[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.length === 0) throw new MemoPolicyError('POLICY_BAD_INPUT', 'ids 须为非空数组');
  return value.map((v) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    if (!Number.isInteger(n) || n <= 0) throw new MemoPolicyError('POLICY_BAD_INPUT', 'ids 里须是正整数 id');
    return n;
  });
}

function wishRowsOrThrow(db: MemoDb, ids: number[]): Record<string, unknown>[] {
  const marks = ids.map(() => '?').join(',');
  const rows = db.conn
    .prepare("SELECT id, content, category, sub_category, due, feishu_task_guid FROM notes WHERE id IN (" + marks + ") AND category='心愿' ORDER BY updated_at DESC")
    .all(...ids) as Record<string, unknown>[];
  const missing = ids.filter((i) => !rows.some((r) => r.id === i));
  if (missing.length) throw new MemoPolicyError('POLICY_BAD_INPUT', '这些 id 不是心愿或不存在：' + missing.join(','));
  return rows;
}

const toPlanItem =
  (suggested: string | null) =>
  (r: Record<string, unknown>): PlanWizardItem => ({
    id: r.id as number,
    content: r.content as string,
    category: r.category as string,
    sub_category: (r.sub_category as string | null) ?? null,
    current_due: (r.due as string | null) ?? null,
    feishu_task_guid: (r.feishu_task_guid as string | null) ?? null,
    selected: true,
    suggested_due: suggested,
  });

/** 排期向导收集。返回条目（默认全勾选）＋建议排期＋是否含已排期。 */
export function planWizard(
  db: MemoDb,
  input: PlanWizardInput,
): { items: PlanWizardItem[]; suggestDue: string | null; includeAll: boolean } {
  const suggestDue = normalizeDue(input.suggestDue);
  const ids = asIdList(input.ids);
  const includeAll = input.all === true;
  if (ids !== null && includeAll) throw new MemoPolicyError('POLICY_BAD_INPUT', 'ids 与 all 互斥，只可选其一');
  if (ids !== null) return { items: wishRowsOrThrow(db, ids).map(toPlanItem(suggestDue)), suggestDue, includeAll };
  const rows = db.conn
    .prepare(
      "SELECT id, content, category, sub_category, due, feishu_task_guid FROM notes WHERE category='心愿'" +
        (includeAll ? '' : ' AND due IS NULL') +
        ' ORDER BY updated_at DESC LIMIT 50',
    )
    .all() as Record<string, unknown>[];
  return { items: rows.map(toPlanItem(suggestDue)), suggestDue, includeAll };
}

export interface CompleteWizardItem extends PlanWizardItem {
  readonly selected: false;
}

export interface CompleteWizardInput {
  readonly ids?: unknown;
  readonly onlyOverdue?: unknown;
  readonly all?: unknown;
  readonly content?: unknown;
}

/** 完成向导收集。返回条目（默认不勾选，正向表达意图）＋默认打卡内容。 */
export function completeWizard(
  db: MemoDb,
  input: CompleteWizardInput,
): { items: CompleteWizardItem[]; defaultContent: string | null; onlyOverdue: boolean } {
  const ids = asIdList(input.ids);
  const onlyOverdue = input.onlyOverdue === true;
  const includeAll = input.all === true;
  if (ids !== null && onlyOverdue) throw new MemoPolicyError('POLICY_BAD_INPUT', 'ids 与 onlyOverdue 互斥，只可选其一');
  if (ids !== null && includeAll) throw new MemoPolicyError('POLICY_BAD_INPUT', 'ids 与 all 互斥，只可选其一');
  const defaultContent =
    typeof input.content === 'string' && input.content.trim() !== '' ? input.content.trim() : null;
  let rows: Record<string, unknown>[];
  if (ids !== null) {
    rows = wishRowsOrThrow(db, ids);
  } else if (onlyOverdue) {
    rows = db.conn
      .prepare(
        "SELECT id, content, category, sub_category, due, feishu_task_guid FROM notes WHERE category='心愿'" +
          " AND (due IS NULL OR due < date('now','localtime')) ORDER BY updated_at DESC LIMIT 200",
      )
      .all() as Record<string, unknown>[];
  } else {
    // 默认列全部心愿（`all` 等同默认，留作向后兼容）。
    rows = db.conn
      .prepare(
        "SELECT id, content, category, sub_category, due, feishu_task_guid FROM notes WHERE category='心愿' ORDER BY updated_at DESC LIMIT 200",
      )
      .all() as Record<string, unknown>[];
  }
  return {
    items: rows.map((r) => ({
      id: r.id as number,
      content: r.content as string,
      category: r.category as string,
      sub_category: (r.sub_category as string | null) ?? null,
      current_due: (r.due as string | null) ?? null,
      feishu_task_guid: (r.feishu_task_guid as string | null) ?? null,
      selected: false as const,
      suggested_due: null,
    })),
    defaultContent,
    onlyOverdue,
  };
}
