/** 录入能力的写处理（`chef.recipe.write` 的 add 系三 op）。
 *
 * 老分派层（`src/cli/cmd_read.ts`）`chef.recipe.write` 分支中 `add/add-ingredient/add-step`
 * 三路逐字节下沉：只改 import 出处，判定与装配一字不动。`update/discard/deprecate`
 * 三路住修改域（`src/update/run-write.ts`）；op 路由由入口注册表按 `parseWriteOpCompat`
 * 同集合切分（非法 op 入口已拦，落不到这里）。
 */

import { ChefPolicyError } from '../fetch/errors.js';
import type { ChefDb } from '../fetch/db.js';
import { addIngredient, addStep, addRecipe, getRecipeDetail } from '../fetch/db.js';
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
