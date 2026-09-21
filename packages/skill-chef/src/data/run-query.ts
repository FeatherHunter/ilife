/** 数据管理能力的查处理（`chef.history.query` 的 quality／backup 两 kind）＋ 本域独占的体检取数。
 *
 * 口径裁定（本票第一件事，见 `docs/skills/skill-chef/t776-小域.md`）：
 * 体检主口径＝老件完整度（`scripts/data_quality_report.py:114-124` 五项各 20 分满分 100），
 * 新件曾有的口碑实现属另一语义，已移出体检页（口碑另立票，见遗留出口）。
 * `healthCheck`（四档缺失）保留作取数原语（测试与备份复用），体检页按完整度出分。
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ChefDb, HealthIssue } from '../fetch/db.js';
import { listRecipes, qAll, qGet, queryHistory } from '../fetch/db.js';
import { ChefFetchError, ChefPolicyError } from '../fetch/errors.js';
import { buildHistoryQuery } from '../render/index.js';

/** 库体检：无食材／无步骤／缺火候／从未做过四档问题（无异常即空数组，由调用方拼 ok 条）。
 * 原 `src/fetch/db.ts`，本域独占。 */
export function healthCheck(h: ChefDb): HealthIssue[] {
  const issues: HealthIssue[] = [];
  try {
    const noIng = qAll<Record<string, unknown>>(h, "SELECT r.name AS name FROM recipes r LEFT JOIN ingredients i ON i.recipe_id = r.id WHERE i.id IS NULL AND r.status != '已废弃'");
    for (const r of noIng) issues.push({ level: 'warn', message: '无食材：' + String(r.name ?? '') });
    const noStep = qAll<Record<string, unknown>>(h, "SELECT r.name AS name FROM recipes r LEFT JOIN cooking_steps s ON s.recipe_id = r.id WHERE s.id IS NULL AND r.status != '已废弃'");
    for (const r of noStep) issues.push({ level: 'warn', message: '无步骤：' + String(r.name ?? '') });
    const noHeat = qAll<Record<string, unknown>>(h, "SELECT r.name AS name, s.sequence AS seq FROM cooking_steps s JOIN recipes r ON r.id = s.recipe_id WHERE (s.heat_level IS NULL OR s.heat_level = '') AND r.status != '已废弃'");
    for (const r of noHeat) issues.push({ level: 'warn', message: '步骤缺火候：' + String(r.name ?? '') + '第' + String(r.seq ?? '') + '步' });
    const never = qAll<Record<string, unknown>>(h, "SELECT r.name AS name FROM recipes r LEFT JOIN recipe_history hh ON hh.recipe_id = r.id WHERE hh.id IS NULL AND r.status != '已废弃'");
    for (const r of never) issues.push({ level: 'info', message: '从未做过：' + String(r.name ?? '') });
  } catch (e) {
    if (e instanceof ChefFetchError) throw e;
    throw new ChefFetchError('CHEF_DB_UNREADABLE', '体检查询失败', { cause: e });
  }
  issues.sort((a, b) => (a.level < b.level ? -1 : a.level > b.level ? 1 : String(a.message ?? '').localeCompare(String(b.message ?? ''), 'zh')));
  return issues;
}

/** 完整度评分（老件公式逐字：食材／步骤各 20＋10，贴士／技法／背景各 20，满分 100）。 */
function completenessOf(input: { ingredients: number; steps: number; tips: number; techniques: number; background: boolean }): number {
  let score = 0;
  if (input.ingredients >= 3) score += 20;
  else if (input.ingredients >= 1) score += 10;
  if (input.steps >= 3) score += 20;
  else if (input.steps >= 1) score += 10;
  if (input.tips >= 1) score += 20;
  if (input.techniques >= 1) score += 20;
  if (input.background) score += 20;
  return score;
}

/** 备份的 17 张用户表（与 `t769` §0.3 同序，老库权威）。 */
const BACKUP_TABLES = [
  'recipes', 'recipe_categories', 'recipe_seasons', 'recipe_cooking_methods', 'recipe_flavors',
  'recipe_diet_tags', 'recipe_meal_types', 'ingredients', 'cooking_steps', 'step_ingredients',
  'step_techniques', 'tips', 'recipe_history', 'background_knowledge', 'recipe_relations',
  'cookware', 'nutrition_info',
] as const;

function stamp(): string {
  const d = new Date();
  const p = (n: number, w = 2): string => String(n).padStart(w, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

/** 跑 `chef.history.query` 的 quality／backup：`kind` 由入口算好下传，本函数只做本域两路分支。 */
export function runDataQuery(handle: ChefDb, params: Record<string, unknown>, kind: string): unknown {
  if (kind === 'quality') {
    void params;
    const recipes = listRecipes(handle);
    if (!recipes.length) throw new ChefFetchError('CHEF_EMPTY_RESULT', '库中暂无菜谱可体检');
    const items = recipes.map((r) => {
      const ings = qAll<Record<string, unknown>>(handle, 'SELECT id FROM ingredients WHERE recipe_id = ?', [r.id]);
      const steps = qAll<Record<string, unknown>>(handle, 'SELECT id FROM cooking_steps WHERE recipe_id = ?', [r.id]);
      const tips = qAll<Record<string, unknown>>(handle, 'SELECT id FROM tips WHERE recipe_id = ?', [r.id]);
      const techs = qAll<Record<string, unknown>>(handle, 'SELECT id FROM step_techniques WHERE recipe_id = ?', [r.id]);
      const bg = qGet<Record<string, unknown>>(handle, 'SELECT id FROM background_knowledge WHERE recipe_id = ?', [r.id]);
      const score = completenessOf({
        ingredients: ings.length,
        steps: steps.length,
        tips: tips.length,
        techniques: techs.length,
        background: !!bg,
      });
      const missing: string[] = [];
      if (ings.length < 3) missing.push('食材不足三味（当前' + ings.length + '）');
      if (steps.length < 3) missing.push('步骤不足三步（当前' + steps.length + '）');
      if (tips.length < 1) missing.push('没有小贴士');
      if (techs.length < 1) missing.push('没有技法');
      if (!bg) missing.push('没有背景故事');
      return {
        name: r.name,
        score,
        ingredients_count: ings.length,
        steps_count: steps.length,
        tips_count: tips.length,
        techniques_count: techs.length,
        has_background: !!bg,
        missing,
      };
    });
    items.sort((a, b) => (a.score as number) - (b.score as number) || String(a.name).localeCompare(String(b.name), 'zh'));
    return buildHistoryQuery('quality', items);
  }
  if (kind === 'backup') {
    const includeArchived = params.include_archived === true;
    const dump: Record<string, unknown[]> = {};
    for (const t of BACKUP_TABLES) {
      if (t === 'recipes' && !includeArchived) {
        dump[t] = qAll<Record<string, unknown>>(handle, "SELECT * FROM recipes WHERE status != '已废弃' ORDER BY name ASC");
      } else {
        dump[t] = qAll<Record<string, unknown>>(handle, 'SELECT * FROM ' + t);
      }
    }
    const payload = {
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      include_archived: includeArchived,
      recipe_count: (dump.recipes as unknown[]).length,
      tables: BACKUP_TABLES.map((t) => ({ name: t, count: (dump[t] as unknown[]).length })),
      data: dump,
      history_count: (dump.recipe_history as unknown[]).length,
    };
    const rawDest = params.dest;
    const dest = typeof rawDest === 'string' && rawDest.trim()
      ? rawDest.trim()
      : join(dirname(handle.path), '私家大厨备份_' + stamp() + '.json');
    mkdirSync(dirname(dest), { recursive: true });
    const text = JSON.stringify(payload, null, 2);
    try {
      writeFileSync(dest, text, 'utf8');
    } catch (e) {
      throw new ChefFetchError('CHEF_DB_UNREADABLE', '备份写盘失败', { cause: e });
    }
    void queryHistory;
    return buildHistoryQuery('backup', [{
      path: dest,
      bytes: Buffer.byteLength(text, 'utf8'),
      recipe_count: payload.recipe_count,
      table_count: BACKUP_TABLES.length,
      include_archived: includeArchived,
    }]);
  }
  // 不可达：入口已拦过非法 kind（原文分支尾 fail(2) 同报文，归用法错 exit 2）。
  throw new ChefPolicyError('POLICY_BAD_INPUT', 'history.query 只接受 kind=timeline/stats/quality/backup');
}
