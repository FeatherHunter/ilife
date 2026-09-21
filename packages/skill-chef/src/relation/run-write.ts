/** 派生能力的写处理（`chef.relation.write` 的 add／derive 两 op）＋ 本域独占的取数。
 *
 * 老件语义来源（只读对照，一行动不动老件）：
 *   · add：`scripts/relation_manager.py:47-131`（父子存在校验＋关系类型枚举＋改动说明必填＋单 INSERT）；
 *   · derive：`scripts/派生/ops.py:182-244`（母本校验＋新菜创建＋关系插入同一事务＋母子差异 diff）。
 * 本票不改 schema、不碰真库；缺值按 #818 甲拦下补齐，不写半条脏数据。
 */

import { randomUUID } from 'node:crypto';
import { ChefFetchError, ChefPolicyError } from '../fetch/errors.js';
import type { ChefDb } from '../fetch/db.js';
import { getRecipeDetail, mustRecipe, now, qAll, qGet, qRun } from '../fetch/db.js';
import { addRecipe } from '../add/index.js';
import { buildRecipeReceipt } from '../render/index.js';

/** 关系类型白名单（老件 validators 同语义：派生／变体／改良）。 */
const RELATION_TYPES = ['派生', '变体', '改良'] as const;

function needText(params: Record<string, unknown>, key: string): string {
  const v = params[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new ChefPolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + key);
  }
  return v.trim();
}

/** op 路由：add（默认）／derive（从已有派生新菜）。非法 op 入口已拦，落不到这里。 */
export function parseRelationOp(params: Record<string, unknown>): string {
  const op = params.op === undefined ? 'add' : params.op;
  if (op === 'add' || op === 'derive') return op;
  throw new ChefPolicyError('POLICY_BAD_INPUT', 'relation.write 只接受 op=add/derive');
}

/** 跑 `chef.relation.write`：op 由入口算好下传，本函数只做本域两路分支。 */
export function runRelationWrite(handle: ChefDb, params: Record<string, unknown>, op: string): unknown {
  if (op === 'add') {
    const parentName = needText(params, 'parent');
    const childName = needText(params, 'child');
    const relationType = needText(params, 'relation_type');
    const changeSummary = needText(params, 'change_summary');
    if (!RELATION_TYPES.includes(relationType as (typeof RELATION_TYPES)[number])) {
      throw new ChefPolicyError('POLICY_BAD_INPUT', '关系类型须为派生／变体／改良');
    }
    const parent = mustRecipe(handle, parentName);
    const child = mustRecipe(handle, childName);
    if (parent.id === child.id) {
      throw new ChefPolicyError('POLICY_BAD_INPUT', '不能派生自身');
    }
    const id = randomUUID();
    try {
      qRun(handle, 'INSERT INTO recipe_relations (id, parent_id, child_id, relation_type, change_summary) VALUES (?, ?, ?, ?, ?)', [id, parent.id, child.id, relationType, changeSummary]);
    } catch (e) {
      if (e instanceof ChefFetchError) throw e;
      throw new ChefFetchError('CHEF_DB_UNREADABLE', '派生关系写盘失败', { cause: e });
    }
    return buildRecipeReceipt('已记派生关系：' + parent.name + '到' + child.name + '（' + relationType + '）');
  }
  if (op === 'derive') {
    const sourceName = needText(params, 'source');
    const targetName = needText(params, 'target');
    const differences = needText(params, 'differences');
    const relationTypeRaw = typeof params.relation_type === 'string' && params.relation_type.trim() ? params.relation_type.trim() : '派生';
    if (!RELATION_TYPES.includes(relationTypeRaw as (typeof RELATION_TYPES)[number])) {
      throw new ChefPolicyError('POLICY_BAD_INPUT', '关系类型须为派生／变体／改良');
    }
    const mother = getRecipeDetail(handle, sourceName);
    if (mother.recipe.status === '已废弃') {
      throw new ChefFetchError('CHEF_BAD_QUERY', '母本已废弃，不能派生');
    }
    const dup = qGet<{ c: number }>(handle, 'SELECT COUNT(*) AS c FROM recipes WHERE name = ?', [targetName]);
    if (dup && Number(dup.c) > 0) {
      throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '新菜名已存在：“' + targetName + '”');
    }
    const created = addRecipe(handle, {
      name: targetName,
      description: mother.recipe.description ? mother.recipe.description + '（派生差异：' + differences + '）' : '由' + mother.recipe.name + '派生：' + differences,
      difficulty: mother.recipe.difficulty,
      servings: mother.recipe.servings,
      total_time_minutes: mother.recipe.total_time_minutes,
      status: '未做',
      photo_url: '',
      source: mother.recipe.source,
      source_url: mother.recipe.source_url,
    });
    try {
      handle.db.exec('BEGIN');
      for (const g of [...mother.ingredients].sort((a, b) => a.sequence - b.sequence)) {
        if (g.quantity === null) {
          throw new ChefFetchError('CHEF_BAD_QUERY', '母本食材缺数字用量，派生前请先补齐');
        }
        qRun(handle, 'INSERT INTO ingredients (id, recipe_id, sequence, name, category, quantity, unit, quantity_text, is_optional, substitute) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [randomUUID(), created.id, g.sequence, g.name, g.category, g.quantity, g.unit, g.quantity_text, g.is_optional, g.substitute]);
      }
      for (const s of [...mother.steps].sort((a, b) => a.sequence - b.sequence)) {
        if (s.duration_minutes === null) {
          throw new ChefFetchError('CHEF_BAD_QUERY', '母本步骤缺数字时长，派生前请先补齐');
        }
        qRun(handle, 'INSERT INTO cooking_steps (id, recipe_id, sequence, action, duration_minutes, heat_level, temperature, expected_result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [randomUUID(), created.id, s.sequence, s.action, s.duration_minutes, s.heat_level, s.temperature, s.expected_result]);
      }
      qRun(handle, 'INSERT INTO recipe_relations (id, parent_id, child_id, relation_type, change_summary) VALUES (?, ?, ?, ?, ?)', [randomUUID(), mother.recipe.id, created.id, relationTypeRaw, differences]);
      handle.db.exec('COMMIT');
    } catch (e) {
      try { handle.db.exec('ROLLBACK'); } catch { /* 已回滚 */ }
      if (e instanceof ChefFetchError || e instanceof ChefPolicyError) throw e;
      throw new ChefFetchError('CHEF_DB_UNREADABLE', '派生写盘失败', { cause: e });
    }
    void now();
    void qAll;
    return buildRecipeReceipt('已从' + mother.recipe.name + '派生新菜：' + targetName + '（差异：' + differences + '）');
  }
  throw new ChefPolicyError('POLICY_BAD_INPUT', 'relation.write 只接受 op=add/derive');
}
