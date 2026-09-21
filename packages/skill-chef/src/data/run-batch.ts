/** 数据管理能力的写处理（`chef.data.batch` 的批量编辑）＋ 本域独占的取数。
 *
 * 本期范围（t769 降级）：只改既有行，不新增；关联步骤不开。
 *   · 食材：按名定位既有行，改数字用量（#818 甲：缺数字直接拦，不写半条）；
 *   · 步骤：按序号定位既有行，改动作／时长／火候（时长改数字，缺数字直接拦）；
 *   · 标签：饮食标签整组替换（先清后插同一事务，缺标签即清空）。
 * 改动前对比由调用方按回执 `diff` 出页，回执即真相。
 */

import { randomUUID } from 'node:crypto';
import { ChefFetchError, ChefPolicyError } from '../fetch/errors.js';
import type { ChefDb } from '../fetch/db.js';
import { getRecipeDetail, mustRecipe, qAll, qRun } from '../fetch/db.js';
import { buildRecipeReceipt } from '../render/index.js';

interface BatchDiff {
  action: string;
  field: string;
  before: string;
  after: string;
}

function strOf(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

/** 跑 `chef.data.batch`：改前读＋事务改＋改后对比（receipt 形）。 */
export function runDataBatch(handle: ChefDb, params: Record<string, unknown>): unknown {
  const rawName = params.name;
  if (typeof rawName !== 'string' || !rawName.trim()) {
    throw new ChefPolicyError('POLICY_MISSING_SLOT', '缺槽位 name');
  }
  const detail = getRecipeDetail(handle, rawName.trim());
  const recipe = mustRecipe(handle, detail.recipe.id);
  const diffs: BatchDiff[] = [];
  const doIngredients = Array.isArray(params.ingredients) ? (params.ingredients as Record<string, unknown>[]) : [];
  const doSteps = Array.isArray(params.steps) ? (params.steps as Record<string, unknown>[]) : [];
  const hasTags = Array.isArray(params.diet_tags);
  if (doIngredients.length === 0 && doSteps.length === 0 && !hasTags) {
    throw new ChefPolicyError('POLICY_MISSING_SLOT', '批量改须给 ingredients／steps／diet_tags 其一');
  }
  try {
    handle.db.exec('BEGIN');
    for (const g of doIngredients) {
      const n = typeof g?.name === 'string' ? (g.name as string).trim() : '';
      if (!n) throw new ChefPolicyError('POLICY_MISSING_SLOT', '食材须给名 name');
      const cur = qAll<Record<string, unknown>>(handle, 'SELECT * FROM ingredients WHERE recipe_id = ? AND name = ?', [recipe.id, n]);
      if (!cur.length) throw new ChefFetchError('CHEF_BAD_QUERY', '无此食材：' + n + '（本期只改既有行）');
      if (g.quantity === undefined) throw new ChefFetchError('CHEF_BAD_QUERY', '改用量须给数字 quantity（老库 NOT NULL）');
      const qn = typeof g.quantity === 'string' ? Number((g.quantity as string).trim()) : g.quantity;
      if (typeof qn !== 'number' || !Number.isFinite(qn)) throw new ChefFetchError('CHEF_BAD_QUERY', '改用量须给数字 quantity');
      const before = cur[0].quantity;
      qRun(handle, 'UPDATE ingredients SET quantity = ? WHERE id = ?', [qn as number, String(cur[0].id)]);
      diffs.push({ action: 'mod', field: '食材「' + n + '」用量', before: strOf(before), after: strOf(qn) });
    }
    for (const s of doSteps) {
      const seqRaw = (s as Record<string, unknown>)?.sequence;
      const seq = typeof seqRaw === 'string' ? Number(seqRaw.trim()) : seqRaw;
      if (!Number.isInteger(seq) || (seq as number) <= 0) throw new ChefPolicyError('POLICY_MISSING_SLOT', '步骤须给正整数 sequence');
      const cur = qAll<Record<string, unknown>>(handle, 'SELECT * FROM cooking_steps WHERE recipe_id = ? AND sequence = ?', [recipe.id, seq as number]);
      if (!cur.length) throw new ChefFetchError('CHEF_BAD_QUERY', '无此步骤：第' + String(seq) + '步（本期只改既有行）');
      const patch: Record<string, unknown> = {};
      if ((s as Record<string, unknown>).action !== undefined) {
        const a = String((s as Record<string, unknown>).action ?? '').trim();
        if (!a) throw new ChefPolicyError('POLICY_BAD_INPUT', '步骤动作不可空');
        patch.action = a;
        diffs.push({ action: 'mod', field: '第' + String(seq) + '步动作', before: strOf(cur[0].action), after: a });
      }
      if ((s as Record<string, unknown>).duration_minutes !== undefined) {
        const dRaw = (s as Record<string, unknown>).duration_minutes;
        const d = typeof dRaw === 'string' ? Number(dRaw.trim()) : dRaw;
        if (typeof d !== 'number' || !Number.isFinite(d)) throw new ChefFetchError('CHEF_BAD_QUERY', '步骤时长须给数字 duration_minutes');
        patch.duration_minutes = d;
        diffs.push({ action: 'mod', field: '第' + String(seq) + '步时长', before: strOf(cur[0].duration_minutes), after: strOf(d) });
      }
      if ((s as Record<string, unknown>).heat_level !== undefined) {
        const heat = String((s as Record<string, unknown>).heat_level ?? '');
        patch.heat_level = heat;
        diffs.push({ action: 'mod', field: '第' + String(seq) + '步火候', before: strOf(cur[0].heat_level), after: heat });
      }
      const keys = Object.keys(patch);
      if (keys.length > 0) {
        qRun(handle, 'UPDATE cooking_steps SET ' + keys.map((k) => k + ' = ?').join(', ') + ' WHERE id = ?', [...keys.map((k) => patch[k]), String(cur[0].id)]);
      }
    }
    if (hasTags) {
      const tags = (params.diet_tags as unknown[]).map((t) => String(t ?? '').trim()).filter((t) => t !== '');
      const before = qAll<Record<string, unknown>>(handle, 'SELECT tag FROM recipe_diet_tags WHERE recipe_id = ?', [recipe.id]).map((r) => String(r.tag));
      qRun(handle, 'DELETE FROM recipe_diet_tags WHERE recipe_id = ?', [recipe.id]);
      for (const tag of tags) {
        qRun(handle, 'INSERT INTO recipe_diet_tags (id, recipe_id, tag) VALUES (?, ?, ?)', [randomUUID(), recipe.id, tag]);
      }
      diffs.push({ action: 'mod', field: '饮食标签', before: before.join('、') || '无', after: tags.join('、') || '无' });
    }
    handle.db.exec('COMMIT');
  } catch (e) {
    try { handle.db.exec('ROLLBACK'); } catch { /* 已回滚 */ }
    if (e instanceof ChefFetchError || e instanceof ChefPolicyError) throw e;
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '批量改写盘失败', { cause: e });
  }
  if (!diffs.length) throw new ChefFetchError('CHEF_BAD_QUERY', '本次无有效改动');
  return buildRecipeReceipt('已批量改' + recipe.name + '：' + diffs.length + '处（改前已对比）');
}

/** 批量改的差异明細（供页面装配，纯取数不写库）。 */
export function previewDataBatch(handle: ChefDb, params: Record<string, unknown>): BatchDiff[] {
  const rawName = params.name;
  if (typeof rawName !== 'string' || !rawName.trim()) return [];
  const detail = getRecipeDetail(handle, rawName.trim());
  const out: BatchDiff[] = [];
  for (const g of (Array.isArray(params.ingredients) ? params.ingredients : []) as Record<string, unknown>[]) {
    const n = typeof g?.name === 'string' ? g.name.trim() : '';
    const cur = detail.ingredients.find((x) => x.name === n);
    if (cur && g.quantity !== undefined) {
      out.push({ action: 'mod', field: '食材「' + n + '」用量', before: strOf(cur.quantity), after: strOf(g.quantity) });
    }
  }
  return out;
}
