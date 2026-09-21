/** 历史能力的写处理（`chef.history.record`）＋ 本域独占的取数与回执装配。
 *
 * 老分派层（`src/cli/cmd_read.ts`）分支逐字节下沉：只改 import 出处，判定与装配一字不动。
 * `recordHistory`（原 `src/fetch/db.ts`）与 `buildHistoryRecord`（原 `src/render/views.ts`）
 * 只被本域调用，按“写不出的留回域目录”搬入本文件；旧址改转出（搬迁债务，见对应 index）。
 */

import { randomUUID } from 'node:crypto';
import { ChefFetchError } from '../fetch/errors.js';
import type { ChefDb, HistoryRow } from '../fetch/db.js';
import { getRecipeDetail, mustRecipe, now, qGet, qRun, toHistory } from '../fetch/db.js';
import { needName, validateRating } from '../policy/index.js';

/** 当日日期（本域独占：落历史默认 cook_date 与补录默认 date；原 db.ts `today()`，随 recordHistory 搬入）。 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 记一次做菜（评分必填：老库 rating NOT NULL，缺评分直接拦）。原 `src/fetch/db.ts`，本域独占。 */
export function recordHistory(h: ChefDb, input: { recipe_id: string; rating?: number | null; feedback?: string; cook_date?: string }): HistoryRow {
  const rid = typeof input?.recipe_id === 'string' ? input.recipe_id.trim() : '';
  if (!rid) throw new ChefFetchError('CHEF_BAD_QUERY', '记录做菜须给 recipe_id');
  const recipe = mustRecipe(h, rid);
  let rating: number | null = null;
  const rawRt = (input as Record<string, unknown>).rating;
  // 818 定案（甲）：老库 rating REAL NOT NULL，本次不改 schema；卡面“选填”暂改“必填”，缺评分不写历史，直接拦下。
  if (rawRt === undefined || rawRt === null || rawRt === '') throw new ChefFetchError('CHEF_BAD_QUERY', '记录做菜须给评分 rating（0-5 数字；老库 NOT NULL，未评分请先问用户要分）');
  {
    const n = typeof rawRt === 'string' ? Number(String(rawRt).trim()) : rawRt;
    if (typeof n !== 'number' || !Number.isFinite(n)) throw new ChefFetchError('CHEF_HISTORY_CORRUPT', '评分须为数字');
    if (n < 0 || n > 5) throw new ChefFetchError('CHEF_HISTORY_CORRUPT', '评分须在 0-5 内');
    rating = n as number;
  }
  const cookDate = typeof input.cook_date === 'string' && input.cook_date.trim() ? input.cook_date.trim() : today();
  const maxRow = qGet<{ m: number | null }>(h, 'SELECT MAX(cook_sequence) AS m FROM recipe_history WHERE recipe_id = ?', [recipe.id]);
  const seq = (maxRow?.m ?? 0) + 1;
  const id = randomUUID();
  try {
    qRun(h, 'INSERT INTO recipe_history (id, recipe_id, cook_date, cook_sequence, rating, feedback) VALUES (?, ?, ?, ?, ?, ?)', [id, recipe.id, cookDate, seq, rating, input.feedback ?? '']);
    if (recipe.status === '未做') qRun(h, 'UPDATE recipes SET status = ?, updated_at = ? WHERE id = ?', ['已做', now(), recipe.id]);
  } catch (e) {
    if (e instanceof ChefFetchError) throw e;
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '历史写盘失败', { cause: e });
  }
  const row = qGet<Record<string, unknown>>(h, 'SELECT * FROM recipe_history WHERE id = ?', [id]);
  if (!row) throw new ChefFetchError('CHEF_HISTORY_CORRUPT', '历史写后读回失败');
  return toHistory(row);
}

// 记做菜回执 receipt。原 `src/render/views.ts`，本域独占。
export function buildHistoryRecord(message: string): { ok: boolean; message: string } {
  return { ok: true, message };
}

/** 跑 `chef.history.record`：定位母菜＋评分校验＋落历史（receipt 形）。 */
export function runHistoryRecord(handle: ChefDb, params: Record<string, unknown>): unknown {
  const name = needName(params);
  const detail = getRecipeDetail(handle, name);
  let rating: number | null = null;
  if (params.rating !== undefined) {
    const raw = typeof params.rating === 'string' && (params.rating as string).trim() !== '' ? Number((params.rating as string).trim()) : params.rating;
    rating = validateRating(raw);
  }
  const feedback = params.feedback === undefined ? '' : String(params.feedback);
  const cookDate = params.date === undefined || params.date === '' ? today() : String(params.date);
  const h = recordHistory(handle, { recipe_id: detail.recipe.id, rating, feedback, cook_date: cookDate });
  return buildHistoryRecord('已记录做菜：' + detail.recipe.name + '（' + h.cook_date + (rating !== null ? '，评分 ' + rating : '') + '）');
}
