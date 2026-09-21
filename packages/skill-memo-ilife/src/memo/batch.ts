// 取数层·批量改分类（#665）：收集（老 `batch-update-category`）＋执行（老 `update-category` 逐条）。
// 收集：按原分类取最近 200 条（默认全部分类），条目默认勾选，目标分类下条数作提示；
// 执行：逐条改顶层分类（子分类不动，老原文），找不到逐条记账。
// 远端不碰（老原文两条路都不调飞书）。
import { getNote, updateNote, type MemoDb } from '../db/readonly.js';

export interface BatchItem {
  readonly id: number;
  readonly content: string;
  readonly sub_category: string | null;
  readonly media_path: string | null;
  readonly due: string | null;
  readonly selected: boolean;
}

/** 收集候选。`fromCategory` 为空即全部分类。 */
export function collectBatchItems(db: MemoDb, fromCategory?: string | null): BatchItem[] {
  const rows =
    fromCategory === undefined || fromCategory === null
      ? ((db.conn.prepare('SELECT id, content, sub_category, media_path, due FROM notes ORDER BY updated_at DESC LIMIT 200').all() as Record<string, unknown>[]))
      : ((db.conn
          .prepare('SELECT id, content, sub_category, media_path, due FROM notes WHERE category = ? ORDER BY updated_at DESC LIMIT 200')
          .all(fromCategory) as Record<string, unknown>[]));
  return rows.map((r) => ({
    id: r.id as number,
    content: r.content as string,
    sub_category: (r.sub_category as string | null) ?? null,
    media_path: (r.media_path as string | null) ?? null,
    due: (r.due as string | null) ?? null,
    selected: true,
  }));
}

export function countNotesByCategory(db: MemoDb, category: string): number {
  const r = db.conn.prepare('SELECT COUNT(*) AS c FROM notes WHERE category = ?').get(category) as { c: number };
  return r.c;
}

export interface BatchApplyResult {
  readonly updated: number;
  readonly skipped: number;
  readonly errors: string[];
}

/** 执行改分类：逐条落（顶层分类，子分类不动），找不到逐条记账不吞错。 */
export function applyBatchCategory(db: MemoDb, ids: readonly number[], toCategory: string): BatchApplyResult {
  const errors: string[] = [];
  let updated = 0;
  let skipped = 0;
  for (const id of ids) {
    try {
      getNote(db, id);
    } catch {
      skipped += 1;
      errors.push('id=' + id + '：没有这条笔记');
      continue;
    }
    updateNote(db, id, { category: toCategory });
    updated += 1;
  }
  return { updated, skipped, errors };
}
