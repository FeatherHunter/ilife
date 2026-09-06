// 口径层·写参薄封装供 cli 用（老家 recipe_manager/history/shopping 对应 params 口径）。
// cli 若已定接口则保持兼容：仅做缺槽位与 op 分流，不做重校验。
import { ChefPolicyError } from '../fetch/errors.js';

export type WriteOp = 'add' | 'update' | 'deprecate';

export function parseWriteOp(params: Record<string, unknown>): WriteOp {
  const op = params.op === undefined ? 'add' : params.op;
  if (op === 'add' || op === 'update' || op === 'deprecate') return op;
  throw new ChefPolicyError('POLICY_BAD_INPUT', 'op 非法（期望 add/update/deprecate）：' + JSON.stringify(op));
}

export function needName(params: Record<string, unknown>, field = 'name'): string {
  const v = (params as Record<string, unknown>)[field];
  if (typeof v !== 'string' || !v.trim()) throw new ChefPolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + field);
  return v.trim();
}

export function needNameOrId(params: Record<string, unknown>): string {
  const name = (params as Record<string, unknown>).name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  const id = (params as Record<string, unknown>).id;
  if (typeof id === 'string' && id.trim()) return id.trim();
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  throw new ChefPolicyError('POLICY_MISSING_SLOT', '缺槽位 name/id（查看须给菜名或 id）');
}

export type RecipeOp = 'add' | 'update' | 'discard' | 'add-ingredient' | 'add-step';

export function parseRecipeOp(params: Record<string, unknown>): RecipeOp {
  const op = params.op === undefined ? 'add' : params.op;
  if (op === 'add' || op === 'update' || op === 'discard' || op === 'add-ingredient' || op === 'add-step') return op;
  throw new ChefPolicyError('POLICY_BAD_INPUT', 'op 非法（期望 add/update/discard/add-ingredient/add-step）：' + JSON.stringify(op));
}

export type HistoryKind = 'timeline' | 'stats' | 'quality' | 'backup';

export function parseHistoryKind(params: Record<string, unknown>): HistoryKind {
  const kind = params.kind === undefined ? undefined : params.kind;
  if (kind === 'timeline' || kind === 'stats' || kind === 'quality' || kind === 'backup') return kind;
  if (kind !== undefined) throw new ChefPolicyError('POLICY_BAD_INPUT', 'kind 非法（期望 timeline/stats/quality/backup）：' + JSON.stringify(kind));
  if (typeof params.name === 'string' && params.name.trim()) return 'timeline';
  return 'stats';
}

export function needNames(params: Record<string, unknown>, field = 'names'): string[] {
  const v = (params as Record<string, unknown>)[field];
  if (!Array.isArray(v) || v.length === 0) throw new ChefPolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + field + '（期望非空数组）');
  const out = (v as unknown[]).map((x) => (typeof x === 'string' ? x.trim() : ''));
  if (out.some((x) => !x)) throw new ChefPolicyError('POLICY_BAD_INPUT', field + ' 含空串');
  return out;
}
