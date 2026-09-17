/** 回写落库：三列幂等键 ＋ 7 列 UPDATE（保留 `note`／`date`），见老适配器（代码新写）。
 *
 * 口径（只读参照 `adapters/xunji_adapter.py:upsert_exercise_log`，`:72-141`）：
 * - 幂等键＝**三列** `xunji_localid＋exercise_type＋set_index`（老 `:98-101` 的 SQL 为准；
 *   老 `backfill.py:7` 与原 `t350:15` 写“两列”是错的，见证据件更正节）；
 * - 命中 → UPDATE 覆盖 7 列（`exercise_type／reps／load_kg／calories_burned／category／
 *   difficulty／xunji_title`，老 `:105-114`）＋ `updated_at`，**不动 `note`／`date`**
 *   （老 UPDATE 语句里没有这两列）；
 * - 未命中 → INSERT（老 `:117-126` 十列；另带 `is_backfill=1`，新仓语义：这行是回写来的）；
 * - 行级失败记 `errors` 不中断整体（老 `:128-131`）；游标级异常向上抛，
 *   调用方回滚（老 `:87-88`）。
 *
 * INSERT 经运动门回写桥（R2 收口 #613：`exercise/index.js#exerciseBackfillBridge.addRecord`，
 * 本件不深引 `exerciseStore.ts` 内部件）；
 */

import type { DatabaseSync } from 'node:sqlite';
import { exerciseBackfillBridge } from '../exercise/index.js';
import type { XunjiBackfillRow } from './rows.js';

/** 幂等键三列（库列名；唯一定义地，别处引用——文档写两列处是错的）。 */
export const XUNJI_IDEMPOTENT_COLUMNS = ['xunji_localid', 'exercise_type', 'set_index'] as const;

/** UPDATE 覆盖的 7 列（库列名；唯一定义地；`note`／`date` 不在其中＝被保留）。 */
export const XUNJI_UPDATE_COLUMNS = [
  'exercise_type',
  'reps',
  'load_kg',
  'calories_burned',
  'category',
  'difficulty',
  'xunji_title',
] as const;

/** 落库小结（老 `:84-85` 四键）。 */
export interface XunjiUpsertReport {
  readonly inserted: number;
  readonly updated: number;
  readonly total: number;
  readonly errors: readonly string[];
}

/** 三列幂等落库（调用方负责开事务／提交／回滚；游标级异常向上抛）。 */
export function upsertXunjiRows(db: DatabaseSync, rows: readonly XunjiBackfillRow[]): XunjiUpsertReport {
  const find = db.prepare(
    'SELECT id FROM exercise_log WHERE xunji_localid = ? AND exercise_type = ? AND set_index = ?',
  );
  const touch = db.prepare(
    'UPDATE exercise_log SET exercise_type = ?, reps = ?, load_kg = ?, calories_burned = ?, ' +
      'category = ?, difficulty = ?, xunji_title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
  );
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  for (const row of rows) {
    try {
      const hit = find.get(row.xunjiLocalid, row.exerciseType, row.setIndex) as { id: number } | undefined;
      if (hit !== undefined) {
        touch.run(
          row.exerciseType, row.reps, row.loadKg, row.caloriesBurned,
          row.category, row.difficulty, row.xunjiTitle, hit.id,
        );
        updated += 1;
      } else {
        exerciseBackfillBridge.addRecord(db, {
          date: row.date, exerciseType: row.exerciseType, caloriesBurned: row.caloriesBurned,
          reps: row.reps, category: row.category, difficulty: row.difficulty,
          setIndex: row.setIndex, loadKg: row.loadKg, isBackfill: true,
          xunjiLocalid: row.xunjiLocalid, xunjiTitle: row.xunjiTitle,
        });
        inserted += 1;
      }
    } catch (e) {
      errors.push('localid=' + row.xunjiLocalid + ' set_index=' + String(row.setIndex) + ': ' + (e instanceof Error ? e.message : String(e)));
    }
  }
  return { inserted, updated, total: inserted + updated, errors };
}
