/** 修改能力的写处理（`chef.recipe.write` 的 update 系三 op）。
 *
 * 老分派层（`src/cli/cmd_read.ts`）`chef.recipe.write` 分支中 `update/discard/deprecate`
 * 三路逐字节下沉：只改 import 出处，判定与装配一字不动。`add` 系三路住录入域
 * （`src/add/run-write.ts`）；op 路由由入口注册表按 `parseWriteOpCompat` 同集合切分
 * （非法 op 入口已拦，落不到这里）。
 */

import { ChefFetchError, ChefPolicyError } from '../fetch/errors.js';
import type { ChefDb, IngredientRow, RecipeRow, StepRow } from '../fetch/db.js';
import { canonicalRecipeName, getRecipeDetail, mustRecipe, now, qAll, qGet, qRun } from '../fetch/db.js';
import { buildRecipeReceipt } from '../render/index.js';
import { fail, pickStr, resolveNameOrId } from '../shared/slots.js';

/** 跑 `chef.recipe.write` 的 update 系：`update`（含 patch 对象与 total_time 别名）／`discard`／`deprecate`。
 *
 * `op` 由入口注册表经 `parseWriteOpCompat` 算好下传（非法 op 入口已拦，落不到这里），
 * 本函数只做本域三路分支（`update/discard/deprecate`），不重算路由键。
 */
export function runRecipeWriteUpdate(handle: ChefDb, params: Record<string, unknown>, op: string): unknown {
  if (op === 'update') {
    // #774 · 修改域 4 卡之二／之三：步骤与食材走同一 op 下的 target 分流（入口注册表不动，
    // `parseWriteOpCompat` 仍只认 op 名；target 是本域内的子动作键，不进 CLI 兼容集）。
    if (params.target === 'step') return runUpdateStepContent(handle, params);
    if (params.target === 'step-order') return runReorderSteps(handle, params);
    if (params.target === 'ingredient') return runUpdateIngredient(handle, params);
    if (params.target !== undefined) {
      throw new ChefPolicyError('POLICY_BAD_INPUT', 'update 只接受 target=step/step-order/ingredient（改主信息不给 target）：' + JSON.stringify(params.target));
    }
    const hasId = typeof params.id === 'string' && (params.id as string).trim() ? true : false;
    const rid = hasId
      ? (params.id as string).trim()
      : getRecipeDetail(handle, resolveNameOrId(params)).recipe.id;
    const patch: Record<string, unknown> = {};
    // name 为标识符时不计入补丁（仅 id 定位时 name 视为改名）；其余直给字段即补丁。
    for (const k of ['description', 'difficulty', 'servings', 'total_time_minutes', 'status', 'photo_url', 'source', 'source_url'] as const) {
      if (params[k] !== undefined) patch[k] = params[k];
    }
    if (hasId && typeof params.name === 'string' && (params.name as string).trim()) patch.name = (params.name as string).trim();
    if (patch.total_time_minutes === undefined && params.total_time !== undefined) patch.total_time_minutes = params.total_time;
    if (params.patch !== undefined && typeof params.patch === 'object' && params.patch !== null && !Array.isArray(params.patch)) {
      for (const [k, v] of Object.entries(params.patch as Record<string, unknown>)) {
        if (k === 'total_time' && patch.total_time_minutes === undefined) patch.total_time_minutes = v;
        else if (['name', 'description', 'difficulty', 'servings', 'total_time_minutes', 'status', 'photo_url', 'source', 'source_url'].includes(k)) patch[k] = v;
      }
    }
    if (!Object.keys(patch).length) fail(2, 'update 至少改一个字段（name/description/difficulty/servings/total_time_minutes/status/photo_url/source/source_url/patch）');
    const r = updateRecipe(handle, rid, patch);
    return buildRecipeReceipt('已更新菜谱：' + r.name + '（id=' + r.id + '）');
  }
  if (op === 'discard' || op === 'deprecate') {
    const id = params.id;
    const rid = typeof id === 'string' && id.trim() ? id.trim() : getRecipeDetail(handle, resolveNameOrId(params)).recipe.id;
    const r = deprecateRecipe(handle, rid);
    return buildRecipeReceipt('已废弃菜谱：' + r.name + '（id=' + r.id + '，只增不删）');
  }
  // 不可达：入口注册表已用 `parseWriteOpCompat` 同集合拦过非法 op（原分支尾的 fail 同语义，归口径错 exit 2）。
  throw new ChefPolicyError('POLICY_BAD_INPUT', 'recipe.write 只接受 op=add/update/discard/add-ingredient/add-step');
}

/** #774 · 修改步骤之改内容（`update_step_content` 的一半）。
 *
 * 老件语义（`step_manager.py:update`）：按步骤 id 动态拼 `UPDATE cooking_steps SET ...`。
 * 本域口径：按第 N 步或步骤 id 定位到**同一道菜**的行，只改内容列
 * （`action/duration_minutes/heat_level/temperature/expected_result`），不碰 `sequence`
 * （顺序只由重排一路改，见 `runReorderSteps`）。
 * 818 定案：`duration_minutes` 在**追加**一路必填；改内容一路缺省沿用旧值，
 * 给了就必须是有限数字，否则取数层抛 `CHEF_BAD_QUERY`（CLI exit 4），不写半条。
 */
function runUpdateStepContent(handle: ChefDb, params: Record<string, unknown>): unknown {
  const detail = getRecipeDetail(handle, resolveNameOrId(params));
  const rid = detail.recipe.id;
  const step = pickStep(detail.steps, params.step ?? params.sequence ?? params.step_id);
  if (!step) fail(2, '改步骤须给 step（第 N 步数字，或步骤 id）');
  const patch: Record<string, unknown> = {};
  const action = pickStr(params, 'action');
  if (action !== undefined && action.trim()) patch.action = action.trim();
  for (const k of ['heat_level', 'temperature', 'expected_result'] as const) {
    const s = pickStr(params, k);
    if (s !== undefined) patch[k] = s;
  }
  if (params.duration_minutes !== undefined) {
    const n = toFiniteNumber(params.duration_minutes);
    if (n === undefined) throw new ChefFetchError('CHEF_BAD_QUERY', '步骤须给数字时长 duration_minutes（老库 NOT NULL；缺时长请问用户补齐）');
    patch.duration_minutes = n;
  }
  if (!Object.keys(patch).length) fail(2, '改步骤至少改一个字段（action/duration_minutes/heat_level/temperature/expected_result）');
  const sets: string[] = [];
  const args: unknown[] = [];
  for (const k of ['action', 'duration_minutes', 'heat_level', 'temperature', 'expected_result'] as const) {
    const v = patch[k];
    if (v !== undefined) { sets.push(k + ' = ?'); args.push(k === 'duration_minutes' ? Number(v) : String(v)); }
  }
  args.push(step.id);
  try {
    qRun(handle, 'UPDATE cooking_steps SET ' + sets.join(', ') + ' WHERE id = ?', args);
  } catch (e) {
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '步骤更新失败：第' + step.sequence + '步', { cause: e });
  }
  const row = qGet<Record<string, unknown>>(handle, 'SELECT * FROM cooking_steps WHERE id = ?', [step.id]);
  if (!row) throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '步骤写后读回失败：第' + step.sequence + '步');
  return buildRecipeReceipt('已更新步骤：第' + step.sequence + '步（' + String(row.action ?? '') + '）');
}

/** #774 · 修改步骤之重排（`update_step_content` 的另一半）。
 *
 * 老件语义（`step_manager.py:reorder`）：两步 `sequence` 三语句互换（经 `-1` 中转，事务包裹）。
 * 本域口径：`from`／`to` 都是**第 N 步**（1-based 序号，不是 id），必须同属一道菜、
 * 两行都存在、且不相等；三语句同样经 `-1` 中转，并用 `BEGIN/COMMIT` 包裹
 * （中途失败即 `ROLLBACK`，不留 `-1` 半条）。
 */
function runReorderSteps(handle: ChefDb, params: Record<string, unknown>): unknown {
  const detail = getRecipeDetail(handle, resolveNameOrId(params));
  const rid = detail.recipe.id;
  const from = toFiniteNumber(params.from);
  const to = toFiniteNumber(params.to);
  if (from === undefined || !Number.isInteger(from) || from <= 0) fail(2, '重排须给 from（第 N 步，正整数）');
  if (to === undefined || !Number.isInteger(to) || to <= 0) fail(2, '重排须给 to（第 N 步，正整数）');
  if (from === to) fail(2, '重排 from 与 to 不能相同（第' + from + '步）');
  const a = detail.steps.find((s) => s.sequence === from);
  const b = detail.steps.find((s) => s.sequence === to);
  if (!a) throw new ChefFetchError('CHEF_BAD_QUERY', '无第' + from + '步（本菜共' + detail.steps.length + '步）');
  if (!b) throw new ChefFetchError('CHEF_BAD_QUERY', '无第' + to + '步（本菜共' + detail.steps.length + '步）');
  try {
    handle.db.exec('BEGIN');
    try {
      qRun(handle, 'UPDATE cooking_steps SET sequence = ? WHERE id = ?', [-1, a.id]);
      qRun(handle, 'UPDATE cooking_steps SET sequence = ? WHERE id = ?', [from, b.id]);
      qRun(handle, 'UPDATE cooking_steps SET sequence = ? WHERE id = ?', [to, a.id]);
      handle.db.exec('COMMIT');
    } catch (e) {
      try { handle.db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw e;
    }
  } catch (e) {
    if (e instanceof ChefFetchError) throw e;
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '步骤重排失败：第' + from + '步↔第' + to + '步', { cause: e });
  }
  return buildRecipeReceipt('已重排步骤：第' + from + '步↔第' + to + '步');
}

/** #774 · 修改食材之改用量（`update_ingredient` 的写半）。
 *
 * 老件语义（`ingredient_manager.py:update`）：按食材 id 动态拼 `UPDATE ingredients SET ...`。
 * 本域口径：按食材名或食材 id 定位到**同一道菜**的行；改用量须给有限数字
 * `quantity`（818 定案甲，老库 `NOT NULL`，缺值取数层抛 `CHEF_BAD_QUERY`，CLI exit 4，
 * 不写半条；文字的「适量」只走 `quantity_text`，数字另给估计数），纯文字修正
 * （`unit/quantity_text/category/substitute`）可不带动数字（旧值沿用，约束安全）。
 * 关联步骤（`step_ingredients`）**本期不开**（818 定案：关联本期不开；769 对账：
 * 四列在但无写路径，且 `quantity_used/introduced_at/unit` 另有必填——本函数遇到
 * `step_id/link` 类参数即口径失败 exit 2，不静默丢掉）。
 */
function runUpdateIngredient(handle: ChefDb, params: Record<string, unknown>): unknown {
  const detail = getRecipeDetail(handle, resolveNameOrId(params));
  const rid = detail.recipe.id;
  for (const k of ['step_id', 'link_step', 'step', 'quantity_used', 'introduced_at'] as const) {
    if (params[k] !== undefined) {
      throw new ChefPolicyError('POLICY_BAD_INPUT', '食材与步骤的关联暂不支持，改不了 ' + k + '；请只改用量／文字，或改用添加食材');
    }
  }
  const key = params.ingredient ?? params.name ?? params.ingredient_id ?? params.id;
  const row = pickIngredient(detail.ingredients, key);
  if (!row) fail(2, '改食材须给 ingredient（食材名，或食材 id）');
  const patch: Record<string, unknown> = {};
  if (params.quantity !== undefined) {
    const n = toFiniteNumber(params.quantity);
    if (n === undefined) throw new ChefFetchError('CHEF_BAD_QUERY', '食材须给数字用量 quantity（老库 NOT NULL；适量请同时给估计数＋quantity_text）');
    patch.quantity = n;
  }
  const cat = pickStr(params, 'category');
  if (cat !== undefined) patch.category = cat;
  for (const k of ['unit', 'quantity_text', 'substitute'] as const) {
    const s = pickStr(params, k);
    if (s !== undefined) patch[k] = s;
  }
  // 改名走专用键 `new_name`：`name` 是菜定位键（见 `resolveNameOrId`），不可复用为新名。
  if (params.new_name !== undefined && typeof params.new_name === 'string' && (params.new_name as string).trim() && (params.new_name as string).trim() !== row.name) {
    patch.name = (params.new_name as string).trim();
  }
  if (params.is_optional !== undefined) patch.is_optional = params.is_optional === true || params.is_optional === 1 ? 1 : 0;
  if (!Object.keys(patch).length) fail(2, '改食材至少改一个字段（quantity/unit/quantity_text/category/is_optional/substitute/new_name；改用量须给数字 quantity）');
  const sets: string[] = [];
  const args: unknown[] = [];
  for (const k of ['name', 'category', 'quantity', 'unit', 'quantity_text', 'is_optional', 'substitute'] as const) {
    const v = patch[k];
    if (v !== undefined) { sets.push(k + ' = ?'); args.push(k === 'quantity' || k === 'is_optional' ? Number(v) : String(v)); }
  }
  args.push(row.id);
  try {
    qRun(handle, 'UPDATE ingredients SET ' + sets.join(', ') + ' WHERE id = ?', args);
  } catch (e) {
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '食材更新失败：' + row.name, { cause: e });
  }
  const back = qGet<Record<string, unknown>>(handle, 'SELECT * FROM ingredients WHERE id = ?', [row.id]);
  if (!back) throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '食材写后读回失败：' + row.name);
  return buildRecipeReceipt('已更新食材：' + String(back.name ?? row.name) + '（用量' + String(back.quantity ?? '') + String(back.unit ?? '') + '）');
}

/** 在一道菜的步骤行里按「第 N 步数字／步骤 id」挑一行（跨菜 id 不认，只认本菜）。 */
function pickStep(steps: StepRow[], key: unknown): StepRow | undefined {
  if (typeof key === 'number' && Number.isFinite(key)) return steps.find((s) => s.sequence === key);
  if (typeof key === 'string' && key.trim()) {
    const t = key.trim();
    const asNum = Number(t);
    if (t !== '' && Number.isInteger(asNum) && asNum > 0) {
      const bySeq = steps.find((s) => s.sequence === asNum);
      if (bySeq) return bySeq;
    }
    return steps.find((s) => s.id === t);
  }
  return undefined;
}

/** 在一道菜的食材行里按「食材名／食材 id」挑一行（只认本菜）。 */
function pickIngredient(rows: IngredientRow[], key: unknown): IngredientRow | undefined {
  if (typeof key === 'string' && key.trim()) {
    const t = key.trim();
    return rows.find((r) => r.id === t) ?? rows.find((r) => r.name === t);
  }
  return undefined;
}

/** 数字或数字串→有限数字；非数即 undefined（调用方按 818 定案决定拦还是沿用旧值）。 */
function toFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.trim()))) return Number(v.trim());
  return undefined;
}

/** 废弃菜谱（只增不删：status 置已废弃，无物理删除）。原 `src/fetch/db.ts`，本域独占。 */
export function deprecateRecipe(h: ChefDb, id: string): RecipeRow {
  const r = mustRecipe(h, id);
  qRun(h, 'UPDATE recipes SET status = ?, updated_at = ? WHERE id = ?', ['已废弃', now(), r.id]);
  return mustRecipe(h, r.id);
}

/** 更新菜谱主表（改名撞名即拦，与新增路径同一口径）。原 `src/fetch/db.ts`，本域独占。 */
export function updateRecipe(h: ChefDb, id: string, patch: Record<string, unknown>): RecipeRow {
  const r = mustRecipe(h, id);
  // #854（承接 #819 G1）：改名撞名即拦，引用同一口径；存去空格后的名字，与新增路径一致。
  if ((patch as Record<string, unknown>).name !== undefined) {
    const newName = canonicalRecipeName((patch as Record<string, unknown>).name);
    if (!newName) throw new ChefFetchError('CHEF_BAD_QUERY', '改名须给非空菜名 name');
    if (newName !== canonicalRecipeName(r.name)) {
      const hit = qGet<Record<string, unknown>>(h, 'SELECT id FROM recipes WHERE name = ?', [newName]);
      if (hit && String(hit.id) !== r.id) throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '菜名已存在：“' + newName + '”');
    }
    (patch as Record<string, unknown>).name = newName;
  }
  const allowed = ['name', 'description', 'difficulty', 'servings', 'total_time_minutes', 'status', 'photo_url', 'source', 'source_url'] as const;
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const k of allowed) {
    const v = (patch as Record<string, unknown>)[k];
    if (v !== undefined) { sets.push(k + ' = ?'); params.push(k === 'servings' || k === 'total_time_minutes' ? Number(v) : String(v)); }
  }
  if (!sets.length) throw new ChefFetchError('CHEF_BAD_QUERY', 'update 至少改一个字段');
  sets.push('updated_at = ?');
  params.push(now());
  params.push(r.id);
  try {
    qRun(h, 'UPDATE recipes SET ' + sets.join(', ') + ' WHERE id = ?', params);
  } catch (e) {
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '菜谱更新失败：' + id, { cause: e });
  }
  return mustRecipe(h, r.id);
}
