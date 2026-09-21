/** 录入能力的写处理（`chef.recipe.write` 的 add 系三 op）。
 *
 * 老分派层（`src/cli/cmd_read.ts`）`chef.recipe.write` 分支中 `add/add-ingredient/add-step`
 * 三路逐字节下沉：只改 import 出处，判定与装配一字不动。`update/discard/deprecate`
 * 三路住修改域（`src/update/run-write.ts`）；op 路由由入口注册表按 `parseWriteOpCompat`
 * 同集合切分（非法 op 入口已拦，落不到这里）。
 */

import { randomUUID } from 'node:crypto';
import { ChefFetchError, ChefPolicyError } from '../fetch/errors.js';
import type { ChefDb, IngredientRow, RecipeRow, StepRow } from '../fetch/db.js';
import { canonicalRecipeName, mustRecipe, now, qGet, qRun, toIngredient, toStep } from '../fetch/db.js';
import { needName, validateCategory } from '../policy/index.js';
import { buildRecipeReceipt } from '../render/index.js';
import { pickNum, pickStr, resolveRecipeId } from '../shared/slots.js';

/** 跑 `chef.recipe.write` 的 add 系：`add`（含 ingredients/steps 内嵌同存）／`add-ingredient`／`add-step`。
 *
 * `op` 由入口注册表经 `parseWriteOpCompat` 算好下传（非法 op 入口已拦，落不到这里），
 * 本函数只做本域三路分支（`add/add-ingredient/add-step`），不重算路由键。
 */
export function runRecipeWriteAdd(handle: ChefDb, params: Record<string, unknown>, op: string): unknown {
  if (op === 'add') {
    const name = needName(params);
    const input: { name: string; difficulty?: string; status?: string; servings?: number; total_time_minutes?: number; description?: string; photo_url?: string; source?: string; source_url?: string } = { name };
    for (const k of ['difficulty', 'status', 'description', 'photo_url', 'source', 'source_url'] as const) {
      const s = pickStr(params, k);
      if (s !== undefined) (input as Record<string, unknown>)[k] = s;
    }
    for (const k of ['servings', 'total_time_minutes'] as const) {
      const n = pickNum(params, k);
      if (n !== undefined) (input as Record<string, unknown>)[k] = n;
    }
    const r = addRecipe(handle, input);
    // 兼容测试内嵌写法：params.ingredients/params.steps 数组随菜同存（与 add-ingredient/add-step 同语义，category 走 validateCategory 归一）。
    if (Array.isArray(params.ingredients)) {
      for (const g of params.ingredients as Record<string, unknown>[]) {
        if (g && typeof g === 'object') {
          const gg = { ...(g as Record<string, unknown>) };
          if (typeof gg.category === 'string' && gg.category.trim()) gg.category = validateCategory(gg.category);
          addIngredient(handle, r.id, gg as never);
        }
      }
    }
    if (Array.isArray(params.steps)) {
      for (const s of params.steps as Record<string, unknown>[]) {
        if (s && typeof s === 'object') addStep(handle, r.id, s as never);
      }
    }
    return buildRecipeReceipt('已新增菜谱：' + r.name + '（id=' + r.id + '）');
  }
  if (op === 'add-ingredient') {
    const recipeId = resolveRecipeId(handle, params);
    const name = needName(params);
    const input: { name: string; category?: string; quantity?: number | null; unit?: string; quantity_text?: string; is_optional?: number | boolean; substitute?: string } = { name };
    const cat = pickStr(params, 'category');
    if (cat !== undefined) input.category = validateCategory(cat);
    if (params.quantity !== undefined) {
      const n = pickNum(params, 'quantity');
      input.quantity = n === undefined ? null : n;
    }
    for (const k of ['unit', 'quantity_text', 'substitute'] as const) {
      const s = pickStr(params, k);
      if (s !== undefined) (input as Record<string, unknown>)[k] = s;
    }
    if (params.is_optional !== undefined) input.is_optional = params.is_optional === true || params.is_optional === 1 ? 1 : 0;
    const g = addIngredient(handle, recipeId, input);
    return buildRecipeReceipt('已加食材：' + g.name + '（菜 id=' + recipeId + '）');
  }
  if (op === 'add-step') {
    const recipeId = resolveRecipeId(handle, params);
    const action = params.action;
    if (typeof action !== 'string' || !action.trim()) throw new ChefPolicyError('POLICY_MISSING_SLOT', 'add-step 须给 action（做法）');
    const input: { action: string; heat_level?: string; duration_minutes?: number | null; temperature?: string; expected_result?: string } = { action: action.trim() };
    for (const k of ['heat_level', 'temperature', 'expected_result'] as const) {
      const s = pickStr(params, k);
      if (s !== undefined) (input as Record<string, unknown>)[k] = s;
    }
    if (params.duration_minutes !== undefined) {
      const n = pickNum(params, 'duration_minutes');
      input.duration_minutes = n === undefined ? null : n;
    }
    const s = addStep(handle, recipeId, input);
    return buildRecipeReceipt('已加步骤' + s.sequence + '：' + s.action);
  }
  // 不可达：入口注册表已用 `parseWriteOpCompat` 同集合拦过非法 op（原分支尾的 fail 同语义，归口径错 exit 2）。
  throw new ChefPolicyError('POLICY_BAD_INPUT', 'recipe.write 只接受 op=add/update/discard/add-ingredient/add-step');
}

/** 新增菜谱（主表；菜名去空格后精确判重）。原 `src/fetch/db.ts`，本域独占。 */
export function addRecipe(h: ChefDb, input: Record<string, unknown>): RecipeRow {
  const name = canonicalRecipeName((input as Record<string, unknown>)?.name);
  if (!name) throw new ChefFetchError('CHEF_BAD_QUERY', '加菜须给菜名 name');
  const dup = qGet<{ c: number }>(h, 'SELECT COUNT(*) AS c FROM recipes WHERE name = ?', [name]);
  if (dup && Number(dup.c) > 0) throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '菜名已存在：“' + name + '”');
  const id = randomUUID();
  const ts = now();
  const p = input as Record<string, unknown>;
  const servings = p.servings === undefined || p.servings === '' ? 2 : Number(p.servings);
  const totalTime = (p.total_time_minutes === undefined || p.total_time_minutes === '') ? (p.total_time === undefined || p.total_time === '' ? 30 : Number(p.total_time)) : Number(p.total_time_minutes);
  try {
    qRun(h, 'INSERT INTO recipes (id, name, description, difficulty, servings, total_time_minutes, status, photo_url, source, source_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      id, name,
      String(p.description ?? ''), String(p.difficulty ?? ''), servings,
      totalTime, String(p.status ?? '未做'),
      String(p.photo_url ?? ''), String(p.source ?? ''), String(p.source_url ?? ''), ts, ts,
    ]);
  } catch (e) {
    if (e instanceof ChefFetchError) throw e;
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '加菜写盘失败：' + name, { cause: e });
  }
  return mustRecipe(h, id);
}

/** 加食材（用量必填：老库 quantity NOT NULL，缺值直接拦）。原 `src/fetch/db.ts`，本域独占。 */
export function addIngredient(h: ChefDb, recipeId: string, input: { name: string; category?: string; quantity?: number | null; unit?: string; quantity_text?: string; is_optional?: number | boolean; substitute?: string }): IngredientRow;
export function addIngredient(h: ChefDb, params: Record<string, unknown>): IngredientRow;
export function addIngredient(h: ChefDb, recipeIdOrParams: string | Record<string, unknown>, input?: Record<string, unknown>): IngredientRow {
  const params = typeof recipeIdOrParams === 'string' ? { ...(input ?? {}), recipe_id: recipeIdOrParams } : (recipeIdOrParams as Record<string, unknown>);
  const recipeId = String(params.recipe_id ?? params.recipeId ?? '');
  if (!recipeId) throw new ChefFetchError('CHEF_BAD_QUERY', '加食材须给 recipe_id');
  mustRecipe(h, recipeId);
  const name = typeof params?.name === 'string' ? String(params.name).trim() : '';
  if (!name) throw new ChefFetchError('CHEF_BAD_QUERY', '食材须给名 name');
  const maxRow = qGet<{ m: number | null }>(h, 'SELECT MAX(sequence) AS m FROM ingredients WHERE recipe_id = ?', [recipeId]);
  const seq = (maxRow?.m ?? 0) + 1;
  const id = randomUUID();
  const qtyRaw = (params as Record<string, unknown>).quantity;
  const qtyNum = qtyRaw === undefined || qtyRaw === null || qtyRaw === '' ? null : Number(qtyRaw);
  // 818 定案（甲）：老库 quantity REAL NOT NULL，本次不改 schema，缺值不插 NULL，直接拦下让 AI 问用户补齐。
  if (qtyNum === null || Number.isNaN(qtyNum)) throw new ChefFetchError('CHEF_BAD_QUERY', '食材须给数字用量 quantity（老库 NOT NULL；适量请同时给估计数＋quantity_text）');
  const qty = qtyNum;
  const isOptRaw = (params as Record<string, unknown>).is_optional;
  const isOpt = isOptRaw === true || isOptRaw === 1 || isOptRaw === '1' ? 1 : 0;
  try {
    qRun(h, 'INSERT INTO ingredients (id, recipe_id, sequence, name, category, quantity, unit, quantity_text, is_optional, substitute) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      id, recipeId, seq, name, String(params.category ?? ''), qty, String(params.unit ?? ''), String(params.quantity_text ?? ''), isOpt, String(params.substitute ?? ''),
    ]);
  } catch (e) {
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '食材写盘失败：' + name, { cause: e });
  }
  const row = qGet<Record<string, unknown>>(h, 'SELECT * FROM ingredients WHERE id = ?', [id]);
  if (!row) throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '食材写后读回失败：' + name);
  return toIngredient(row);
}

/** 加步骤（时长必填：老库 duration_minutes NOT NULL，缺值直接拦）。原 `src/fetch/db.ts`，本域独占。 */
export function addStep(h: ChefDb, recipeId: string, input: { action: string; heat_level?: string; duration_minutes?: number | null; temperature?: string; expected_result?: string }): StepRow;
export function addStep(h: ChefDb, params: Record<string, unknown>): StepRow;
export function addStep(h: ChefDb, recipeIdOrParams: string | Record<string, unknown>, input?: Record<string, unknown>): StepRow {
  const params = typeof recipeIdOrParams === 'string' ? { ...(input ?? {}), recipe_id: recipeIdOrParams } : (recipeIdOrParams as Record<string, unknown>);
  const recipeId = String(params.recipe_id ?? params.recipeId ?? '');
  if (!recipeId) throw new ChefFetchError('CHEF_BAD_QUERY', '加步骤须给 recipe_id');
  mustRecipe(h, recipeId);
  const action = typeof params?.action === 'string' ? String(params.action).trim() : '';
  if (!action) throw new ChefFetchError('CHEF_BAD_QUERY', '步骤须给操作 action');
  const maxRow = qGet<{ m: number | null }>(h, 'SELECT MAX(sequence) AS m FROM cooking_steps WHERE recipe_id = ?', [recipeId]);
  const seq = (maxRow?.m ?? 0) + 1;
  const id = randomUUID();
  const durRaw = (params as Record<string, unknown>).duration_minutes;
  const durNum = durRaw === undefined || durRaw === null || durRaw === '' ? null : Number(durRaw);
  // 818 定案（甲）：老库 duration_minutes INTEGER NOT NULL，本次不改 schema，缺值不插 NULL，直接拦下让 AI 问用户补齐。
  if (durNum === null || Number.isNaN(durNum)) throw new ChefFetchError('CHEF_BAD_QUERY', '步骤须给数字时长 duration_minutes（老库 NOT NULL；缺时长请问用户补齐）');
  const dur = durNum;
  try {
    qRun(h, 'INSERT INTO cooking_steps (id, recipe_id, sequence, action, duration_minutes, heat_level, temperature, expected_result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      id, recipeId, seq, action, dur, String(params.heat_level ?? ''), String(params.temperature ?? ''), String(params.expected_result ?? ''),
    ]);
  } catch (e) {
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '步骤写盘失败', { cause: e });
  }
  const row = qGet<Record<string, unknown>>(h, 'SELECT * FROM cooking_steps WHERE id = ?', [id]);
  if (!row) throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '步骤写后读回失败');
  return toStep(row);
}
