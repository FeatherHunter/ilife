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
import { validateCookDate, validateFeedback } from './validate.js';

/** 记一次做菜（评分必填＋反馈必填禁占位：老库 rating NOT NULL，缺值直接拦）。原 `src/fetch/db.ts`，本域独占。
 *
 * 反馈口径见 `./validate.ts`（老仓 `scenes/历史.yaml:56`：必填真实内容、禁「无」占位）。
 * 日期缺省今天（同 `./validate.ts` 的 `validateCookDate`，本文件不再自备 today）。
 */
export function recordHistory(h: ChefDb, input: { recipe_id: string; rating?: number | null; feedback?: string; cook_date?: string }): HistoryRow {
  const rid = typeof input?.recipe_id === 'string' ? input.recipe_id.trim() : '';
  if (!rid) throw new ChefFetchError('CHEF_BAD_QUERY', '记录做菜须给 recipe_id');
  const recipe = mustRecipe(h, rid);
  let rating: number | null = null;
  const rawRt = (input as Record<string, unknown>).rating;
  // 818 定案（甲）：老库 rating REAL NOT NULL，本次不改 schema；卡面“选填”暂改“必填”，缺评分不写历史，直接拦下。
  if (rawRt === undefined || rawRt === null || rawRt === '') throw new ChefFetchError('CHEF_BAD_QUERY', '记录做菜须给评分 rating（0-5 数字；老库 NOT NULL，未评分请先问用户要分）');
  {
    // 空串／纯空白同样按「没给」处理（与 `recordHistory` 同口径：一份缺值只认一个定义地）。
    const n = typeof rawRt === 'string' ? (rawRt.trim() === '' ? rawRt : Number(rawRt.trim())) : rawRt;
    if (typeof n !== 'number' || !Number.isFinite(n)) throw new ChefFetchError('CHEF_BAD_QUERY', '记录做菜须给评分 rating（0-5 数字；老库 NOT NULL，未评分请先问用户要分）');
    if (n < 0 || n > 5) throw new ChefFetchError('CHEF_HISTORY_CORRUPT', '评分须在 0-5 内');
    rating = n as number;
  }
  const cookDate = validateCookDate(input.cook_date);
  const feedback = validateFeedback(input.feedback);
  const maxRow = qGet<{ m: number | null }>(h, 'SELECT MAX(cook_sequence) AS m FROM recipe_history WHERE recipe_id = ?', [recipe.id]);
  const seq = (maxRow?.m ?? 0) + 1;
  const id = randomUUID();
  try {
    qRun(h, 'INSERT INTO recipe_history (id, recipe_id, cook_date, cook_sequence, rating, feedback) VALUES (?, ?, ?, ?, ?, ?)', [id, recipe.id, cookDate, seq, rating, feedback]);
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

/** 跑 `chef.history.record`：定位母菜＋评分校验＋反馈校验＋落历史（receipt 形）。
 *
 * 参数：`name` 必填；`rating` 0-5 数字（818 定案甲：缺评分不写历史，取数层抛
 * `CHEF_BAD_QUERY` 即 CLI exit 4）；`feedback` 必填真实内容禁占位（口径错 exit 2）；
 * 补录日期 `date`（`cook_date` 作兼容别名，老件 `--cook_date` 同名），缺省今天。
 * 「改评分」唤醒词走同一条记录路径（路由见 `./routes.ts:33-38`）：记一次新的做菜记录。
 */
export function runHistoryRecord(handle: ChefDb, params: Record<string, unknown>): unknown {
  const name = needName(params);
  const detail = getRecipeDetail(handle, name);
  let rating: number | null = null;
  if (params.rating !== undefined) {
    const raw = params.rating;
    // 空串／纯空白＝「用户啥也没填」，与「键不传」同义（#853 契约：缺评分 → 取数失败档 4 且点名 rating）。
    // 不这么归一，`rating: ''` 会先撞口径校验（`validateRating` 只认数字 ⇒ exit 2「缺槽位」），
    // 同一个场景因「空串 vs 不传」分叉成两种错误档——同一件事两个定义地。
    const blank = typeof raw === 'string' && raw.trim() === '';
    rating = blank ? null : validateRating(typeof raw === 'string' ? Number(raw.trim()) : raw);
  }
  const feedback = validateFeedback(params.feedback);
  const dateRaw = params.date === undefined ? params.cook_date : params.date;
  const cookDate = validateCookDate(dateRaw);
  const h = recordHistory(handle, { recipe_id: detail.recipe.id, rating, feedback, cook_date: cookDate });
  return buildHistoryRecord('已记录做菜：' + detail.recipe.name + '（' + h.cook_date + (rating !== null ? '，评分 ' + rating : '') + '）');
}
