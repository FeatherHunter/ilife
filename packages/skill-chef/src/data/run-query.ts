/** 数据管理能力的查处理（`chef.history.query` 的 quality／backup 两 kind）＋ 本域独占的体检取数。
 *
 * 老分派层（`src/cli/cmd_read.ts`）`chef.history.query` 分支中 quality／backup 两路逐字节下沉：
 * 只改 import 出处，判定与装配一字不动。timeline／stats 两路住历史域
 * （`src/history/run-query.ts`）；kind 路由由入口注册表做（非法 kind 入口已拦，落不到这里）。
 * `healthCheck`（原 `src/fetch/db.ts`）只被本域调用（backup kind），按“写不出的留回域目录”
 * 搬入本文件；旧址改转出（搬迁债务，见 `src/fetch/index.ts`）。
 */

import type { ChefDb, HealthIssue } from '../fetch/db.js';
import { listRecipes, qAll, queryHistory } from '../fetch/db.js';
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

/** 跑 `chef.history.query` 的 quality／backup：`kind` 由入口注册表算好下传，本函数只做本域两路分支。 */
export function runDataQuery(handle: ChefDb, params: Record<string, unknown>, kind: string): unknown {
  void params;
  if (kind === 'quality') {
    const recipes = listRecipes(handle);
    const items = recipes.map((r) => {
      const rows = queryHistory(handle, r.id);
      let total = 0; let rated = 0; let low = 0;
      for (const h of rows) {
        if (h.rating !== null && h.rating !== undefined) {
          total += h.rating; rated += 1;
          if (h.rating < 3) low += 1;
        }
      }
      const avg = rated ? Math.round((total / rated) * 10) / 10 : null;
      return {
        recipe_id: r.id, name: r.name, count: rows.length, avgRating: avg, lowCount: low,
        note: rated === 0 ? '暂无评分' : (avg as number) < 3 ? '口碑偏低，建议改良' : '口碑稳定',
      };
    });
    return buildHistoryQuery('quality', items);
  }
  if (kind === 'backup') {
    // 取数层无 exportAll：healthCheck 体检问题作条目统一 list；无异常则单条 ok。
    const issues = healthCheck(handle);
    const items = issues.length ? issues.map((i) => ({ level: i.level, message: i.message ?? '' })) : [{ level: 'ok', message: '库自检无异常' }];
    return buildHistoryQuery('backup', items);
  }
  // 不可达：入口注册表已拦过非法 kind（原文分支尾 fail(2) 同报文，归用法错 exit 2）。
  throw new ChefPolicyError('POLICY_BAD_INPUT', 'history.query 只接受 kind=timeline/stats/quality/backup');
}
