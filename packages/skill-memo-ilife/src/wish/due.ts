// 心愿类·「排期日期」口径（#661）。
// 字段名沿用老库列 `due`（`init.sql:13`：`due TEXT -- 心愿期望完成日期`），**面向使用者一律说「排期日期」**
// （HELP 已在用这个词：`src/help/scenes/wish.ts` 的 `label: "排期日期"`，实现侧不再自造第二个说法）。
// 老实现的两条口径照搬：① 只对心愿生效；② 非心愿**静默置空**、不报错（`memo_cli.py:137`）。
import type { MemoNote } from '../fetch/db.js';
import { MemoPolicyError } from '../fetch/errors.js';

/** 面向使用者的中文说法：排期字段一律叫这个，不夹英文术语。 */
export const WISH_DUE_LABEL = '排期日期';

const DUE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 规范化排期日期：空值 → null（显式清期）；合法 `YYYY-MM-DD` → 原值；其余抛错，不静默当 0。 */
export function normalizeDue(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new MemoPolicyError('POLICY_BAD_INPUT', WISH_DUE_LABEL + ' 须为 YYYY-MM-DD 字符串');
  const iso = value.trim();
  const m = DUE_RE.exec(iso);
  if (!m) throw new MemoPolicyError('POLICY_BAD_INPUT', WISH_DUE_LABEL + ' 只认 YYYY-MM-DD：' + iso);
  if (new Date(iso + 'T00:00:00Z').toISOString().slice(0, 10) !== iso) {
    throw new MemoPolicyError('POLICY_BAD_INPUT', WISH_DUE_LABEL + ' 不是真日期：' + iso);
  }
  return iso;
}

/** 分类闸门：**仅心愿生效**，其它分类静默置空（老 `memo_cli.py:137` 逐字「非心愿时静默忽略」）。 */
export function dueForCategory(category: string, value: unknown): string | null {
  if (category !== '心愿') return null;
  return normalizeDue(value);
}

/** 检索过滤：排期日期的四种问法（精确／不早于／不晚于／排没排）。 */
export interface DueFilter {
  readonly due?: unknown;
  readonly dueBefore?: unknown;
  readonly dueAfter?: unknown;
  readonly hasDue?: unknown;
}

export function dueMatches(note: MemoNote, filter: DueFilter): boolean {
  const due = note.due ?? null;
  if (filter.due !== undefined) {
    if (due === null) return false;
    return due === normalizeDue(filter.due);
  }
  if (filter.dueBefore !== undefined) {
    const b = normalizeDue(filter.dueBefore);
    if (b === null || due === null) return false;
    if (due > b) return false;
  }
  if (filter.dueAfter !== undefined) {
    const a = normalizeDue(filter.dueAfter);
    if (a === null || due === null) return false;
    if (due < a) return false;
  }
  if (filter.hasDue !== undefined) {
    if (typeof filter.hasDue !== 'boolean') throw new MemoPolicyError('POLICY_BAD_INPUT', 'hasDue 须为布尔值');
    return (due !== null) === filter.hasDue;
  }
  return true;
}
