/** 修改能力的写处理（`chef.recipe.write` 的 update 系三 op）。
 *
 * 老分派层（`src/cli/cmd_read.ts`）`chef.recipe.write` 分支中 `update/discard/deprecate`
 * 三路逐字节下沉：只改 import 出处，判定与装配一字不动。`add` 系三路住录入域
 * （`src/add/run-write.ts`）；op 路由由入口注册表按 `parseWriteOpCompat` 同集合切分
 * （非法 op 入口已拦，落不到这里）。
 */

import { ChefFetchError, ChefPolicyError } from '../fetch/errors.js';
import type { ChefDb, RecipeRow } from '../fetch/db.js';
import { canonicalRecipeName, getRecipeDetail, mustRecipe, now, qGet, qRun } from '../fetch/db.js';
import { buildRecipeReceipt } from '../render/index.js';
import { fail, pickStr, resolveNameOrId } from '../shared/slots.js';

/** 跑 `chef.recipe.write` 的 update 系：`update`（含 patch 对象与 total_time 别名）／`discard`／`deprecate`。
 *
 * `op` 由入口注册表经 `parseWriteOpCompat` 算好下传（非法 op 入口已拦，落不到这里），
 * 本函数只做本域三路分支（`update/discard/deprecate`），不重算路由键。
 */
export function runRecipeWriteUpdate(handle: ChefDb, params: Record<string, unknown>, op: string): unknown {
  if (op === 'update') {
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
