/** 分派层共享的槽位与参数原语（#839 整包落位票下沉）。
 *
 * 住这儿的都是**至少两个域的处理函数在调**的东西（具名用户见各函数注释）：
 * 按“共用位是从第二个用法里长出来的”长在这里。入口（`src/cli/cmd_read.ts`）的同名 local 已删，
 * 改为引用这里——`fail` 只有一个定义地（`src/cli/config.ts` 既有的那份 local 不动，不在本票范围）。
 *
 * 逐字节等价说明：`fail` 仍是 `console.error + process.exit`（直退，不经 catch），
 * 与搬迁前各分支调的同一函数同一语义；`resolveNameOrId` 的任务口径（缺失走取数错 exit 4）
 * 与 `policy/needNameOrId` 的口径差异原样保留（注释随函数一起搬下来）。
 */

import { ChefFetchError, ChefPolicyError } from '../fetch/errors.js';
import type { ChefDb } from '../fetch/db.js';
import { getRecipeDetail } from '../fetch/db.js';

/** 入口失败原语：stderr 一行＋按码退出（直退，不抛）。用户：入口参数解析／预检＋各域 run。 */
export function fail(code: number, msg: string): never { console.error('ERR ' + code + ': ' + msg); process.exit(code); }

/** 入口备注原语：stderr 一行 NOTE（不退出）。用户：注册表开库提示＋采购分支的库存提示。 */
export function note(msg: string): void { console.error('NOTE: ' + msg); }

// 查看定位：nameOrId（任务口径）兼容 name/id（policy needNameOrId 口径）；缺失走取数错 exit4（任务要求缺失抛4）。
// 用户：view／cook／update／history／add 五个域的 run（定位一道菜）。
export function resolveNameOrId(params: Record<string, unknown>): string {
  const cands = [params.nameOrId, params.name, params.id];
  for (const c of cands) {
    if (typeof c === 'string' && c.trim()) return c.trim();
    if (typeof c === 'number' && Number.isFinite(c)) return String(c);
  }
  throw new ChefFetchError('CHEF_BAD_QUERY', '须给 nameOrId（菜名或 id，缺失阻断）');
}

// recipe_id 定位：recipe_id 直给，或 recipe_name 解析；缺失阻断。
// 用户：add／update 两域的 run-write（加食材／加步骤定位母菜）。
export function resolveRecipeId(handle: ChefDb, params: Record<string, unknown>): string {
  const rid = params.recipe_id;
  if (typeof rid === 'string' && rid.trim()) return rid.trim();
  const rn = params.recipe_name;
  if (typeof rn === 'string' && rn.trim()) return getRecipeDetail(handle, rn.trim()).recipe.id;
  throw new ChefPolicyError('POLICY_MISSING_SLOT', '须给 recipe_id（或 recipe_name 解析）');
}

/** 取字符串参数（直给，非串即 undefined）。用户：add／update 两域的 run-write（补丁字段拾取）。 */
export function pickStr(params: Record<string, unknown>, key: string): string | undefined {
  const v = params[key];
  return typeof v === 'string' ? v : undefined;
}

/** 取数字参数（数字或数字串，非数即 undefined）。用户：add／update 两域的 run-write（补丁字段拾取）。 */
export function pickNum(params: Record<string, unknown>, key: string): number | undefined {
  const v = params[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.trim()))) return Number(v.trim());
  return undefined;
}

/** 取份数参数（servings 未给即 undefined；非法直退 exit 2）。用户：cook／shopping 两域的 run（份数放大）。 */
export function needServings(params: Record<string, unknown>): number | undefined {
  if (params.servings === undefined) return undefined;
  const n = typeof params.servings === 'string' ? Number((params.servings as string).trim()) : params.servings;
  if (!Number.isInteger(n) || (n as number) <= 0) fail(2, 'servings 须为正整数');
  return n as number;
}
