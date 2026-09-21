/** 查找域 · **命令的运行件**（票 #855：域逻辑搬回本域，出口只查表调用）。
 *
 * 两条命令逐字从 `src/cli/cmd_read.ts` 的 `case 'memo.search'`／`case 'memo.detail'` 搬来：
 *   - `memo.search`：创建时间区间通道（`start`＋`end` 双必填、倒置报错、按 `created_at` 倒序）＋关键词／分类过滤，
 *     两路都可再叠排期过滤（`dueMatches`）；
 *   - `memo.detail`：单条详情。
 * 搬迁判据：`node docs/skills/skill-memo-ilife/t855-产物基线.mjs --check` 逐条一致（行为字节不变）。
 *
 * 区间参数的三件校验（`needRangeDate`／`rangeLimitOf`／`categoryFilterOf`）只有本域在用，随命令一起搬——不留第二份。
 */
import type { CommandOut } from '../shared/commandSpec.js';
import { fail } from '../shared/exit.js';
import type { MemoDb } from '../db/readonly.js';
import { getNote, listNotes, searchNotes, searchNotesByCreatedRange } from '../db/readonly.js';
import { needId, normalizeTop } from '../policy/index.js';
import { dueMatches } from '../wish/index.js';

// #850 · 创建时间区间参数（HELP `start`＋`end`，双 `YYYY-MM-DD`）。双必填：缺一边即缺槽位（exit 2，
// 人话）；起止倒置即报错；`timeRange` 月份形已退役（无权威出处），给了即指路到 `start`／`end`。
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function needRangeDate(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) fail(2, '缺槽位 ' + name + '：按时间搜备忘须给开始／结束日期（YYYY-MM-DD）');
  const s = (value as string).trim();
  const m = DATE_RE.exec(s);
  if (!m) fail(2, name + ' 只认 YYYY-MM-DD：' + s);
  const dt = new Date(s + 'T00:00:00Z');
  if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== s) fail(2, name + ' 不是真日期：' + s);
  return s;
}

function rangeLimitOf(value: unknown): number {
  if (value === undefined) return 20;
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isInteger(n) || n <= 0) fail(2, 'limit 须为正整数');
  return n as number;
}

function categoryFilterOf(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return normalizeTop(value);
}

/** `memo.search`：区间／关键词／分类／排期四种过滤（区间与排期正交可叠）。 */
export function runSearch(params: Record<string, unknown>, db: MemoDb): CommandOut {
  // #850：创建时间区间通道（HELP `start`＋`end` 双必填，按 `created_at` 倒序；与排期 `due` 正交可叠加）。
  // `timeRange` 月份形已退役：给了即指路，不再有两个说法。
  if (params.timeRange !== undefined) fail(2, 'timeRange 已退役：请给 start（YYYY-MM-DD）＋ end（YYYY-MM-DD），按创建时间过滤');
  const hasStart = params.start !== undefined;
  const hasEnd = params.end !== undefined;
  if (hasStart || hasEnd) {
    const start = needRangeDate(params.start, 'start');
    const end = needRangeDate(params.end, 'end');
    if (start > end) fail(2, '开始日期不能晚于结束日期：' + start + ' > ' + end);
    const category = categoryFilterOf(params.category);
    const limit = rangeLimitOf(params.limit);
    const items = searchNotesByCreatedRange(db, { start, end, category, limit });
    const hit = items.filter((n) => dueMatches(n, params));
    return { data: { items: hit, total: hit.length }, exit: 0 };
  }
  const items = params.q !== undefined
    ? searchNotes(db, String(params.q), { category: params.category as string | undefined, sub: params.sub as string | undefined })
    : listNotes(db).filter((n) => (params.category === undefined || n.category === params.category));
  const hit = items.filter((n) => dueMatches(n, params));
  return { data: { items: hit, total: hit.length }, exit: 0 };
}

/** `memo.detail`：单条详情（缺 id 即槽位错，exit 2）。 */
export function runDetail(params: Record<string, unknown>, db: MemoDb): CommandOut {
  return { data: { item: getNote(db, needId(params.id, '详情')) }, exit: 0 };
}
