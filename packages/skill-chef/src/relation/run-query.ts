/** 派生能力的查处理（`chef.relation.query` 的家族树）＋ 本域独占的取数。
 *
 * 老件语义来源（只读对照）：`scripts/派生/ops.py:249-311`（全量关系拉取＋邻接表＋双向扩展＋已废弃不入树）。
 * 本票加严一条：关系图若成环，家族树拒绝出图并报环（验收反例，不许画出一张自环图）。
 * 关系表 0 行时按空态处理（#768 处置：先不摆位，有数据再谈形状）。
 */

import { ChefFetchError } from '../fetch/errors.js';
import type { ChefDb } from '../fetch/db.js';
import { mustRecipe, qAll } from '../fetch/db.js';
import { buildHistoryQuery } from '../render/index.js';

interface RelationEdge {
  parent_id: string;
  child_id: string;
  parent_name: string;
  child_name: string;
  relation_type: string;
  change_summary: string;
}

/** 全图环检测（深度优先，三色标记）。有环即返环上节点名，无环返空。 */
function findCycle(edges: RelationEdge[]): string[] {
  const next = new Map<string, string[]>();
  const nameOf = new Map<string, string>();
  for (const e of edges) {
    if (!next.has(e.parent_id)) next.set(e.parent_id, []);
    next.get(e.parent_id)?.push(e.child_id);
    nameOf.set(e.parent_id, e.parent_name);
    nameOf.set(e.child_id, e.child_name);
  }
  const color = new Map<string, number>();
  const stack: string[] = [];
  let found: string[] = [];
  const visit = (id: string): boolean => {
    color.set(id, 1);
    stack.push(id);
    for (const n of next.get(id) ?? []) {
      const c = color.get(n) ?? 0;
      if (c === 1) {
        found = [...stack.slice(stack.indexOf(n)), n].map((x) => nameOf.get(x) ?? x);
        return true;
      }
      if (c === 0 && visit(n)) return true;
    }
    stack.pop();
    color.set(id, 2);
    return false;
  };
  for (const id of next.keys()) {
    if ((color.get(id) ?? 0) === 0 && visit(id)) return found;
  }
  return [];
}

/** 跑 `chef.relation.query`：以菜名为根，向上祖先＋向下后代（多代连链，废弃不入树）。 */
export function runRelationQuery(handle: ChefDb, params: Record<string, unknown>): unknown {
  const raw = params.name ?? params.recipe ?? params.target;
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new ChefFetchError('CHEF_BAD_QUERY', '查看派生关系须给菜名');
  }
  const root = mustRecipe(handle, raw.trim());
  if (root.status === '已废弃') {
    throw new ChefFetchError('CHEF_BAD_QUERY', '已废弃菜谱不入家族树');
  }
  const edges = qAll<RelationEdge>(handle, 'SELECT rr.parent_id AS parent_id, rr.child_id AS child_id, rr.relation_type AS relation_type, rr.change_summary AS change_summary, p.name AS parent_name, c.name AS child_name FROM recipe_relations rr JOIN recipes p ON rr.parent_id = p.id JOIN recipes c ON rr.child_id = c.id WHERE p.status != ? AND c.status != ?', ['已废弃', '已废弃']);
  const cycle = findCycle(edges);
  if (cycle.length > 0) {
    throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '派生关系成环：' + cycle.join('到') + '，已拒绝出图');
  }
  const byParent = new Map<string, RelationEdge[]>();
  const byChild = new Map<string, RelationEdge[]>();
  for (const e of edges) {
    if (!byParent.has(e.parent_id)) byParent.set(e.parent_id, []);
    byParent.get(e.parent_id)?.push(e);
    if (!byChild.has(e.child_id)) byChild.set(e.child_id, []);
    byChild.get(e.child_id)?.push(e);
  }
  const walk = (start: string, dir: 'up' | 'down'): Record<string, unknown>[] => {
    const out: Record<string, unknown>[] = [];
    const seen = new Set<string>([start]);
    let level = 1;
    let frontier = dir === 'up' ? (byChild.get(start) ?? []) : (byParent.get(start) ?? []);
    while (frontier.length > 0) {
      const nextFrontier: RelationEdge[] = [];
      for (const e of frontier) {
        const otherId = dir === 'up' ? e.parent_id : e.child_id;
        if (seen.has(otherId)) continue;
        seen.add(otherId);
        nextFrontier.push(...(dir === 'up' ? (byChild.get(otherId) ?? []) : (byParent.get(otherId) ?? [])));
        out.push({
          name: dir === 'up' ? e.parent_name : e.child_name,
          level,
          relation_type: e.relation_type,
          change_summary: e.change_summary,
        });
      }
      frontier = nextFrontier;
      level += 1;
    }
    return out;
  };
  const ancestors = walk(root.id, 'up');
  const descendants = walk(root.id, 'down');
  return buildHistoryQuery('relation-tree:' + root.name, [
    { section: '当前', name: root.name, level: 0 },
    ...ancestors.map((a) => ({ section: '祖先', ...(a as Record<string, unknown>) })),
    ...descendants.map((d) => ({ section: '后代', ...(d as Record<string, unknown>) })),
  ]);
}
