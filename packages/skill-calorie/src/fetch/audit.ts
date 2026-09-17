/** T6 #25 · 训练计划动作名审计（老家 audit_plan_names.py 同契约）。
 * 输出统一 { status, data, message } 三段式；exit 映射由 CLI 负责。
 * #606：库面与动作名校验搬进训记模块，本件改走它的能力门——**默认读包内预置快照**（不再隐式读
 * 各机 `~/.minimax` 那份：那句「这台机器放没放库」的口径与编辑器库面分叉，见 #593 R3）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { verifyMovements } from '../xunji/index.js';

export type AuditStatus = 'ok' | 'warn' | 'fail';

export interface AuditReport {
  status: AuditStatus;
  data: {
    total: number;
    in_catalog: string[];
    not_in_catalog: string[];
    suggestions?: Record<string, string[]>;
    catalog_loaded: boolean;
  } | null;
  message: string;
}

/** 读 workout_plans.movements JSON 里全部去重动作名。 */
export function collectPlanNames(db: DatabaseSync): string[] {
  const rows = db.prepare('SELECT movements FROM workout_plans').all() as { movements: string }[];
  const names = new Set<string>();
  for (const r of rows) {
    try {
      const arr = JSON.parse(r.movements);
      if (Array.isArray(arr)) {
        for (const m of arr) {
          const n = (m as { name?: unknown })?.name;
          if (typeof n === 'string' && n) names.add(n);
        }
      }
    } catch {
      // 单条 movements 解析失败就跳过该计划，不整单失败
    }
  }
  return [...names].sort();
}

/** 审计：plan 名逐一对 catalog；库缺失时无法验证→ fail（阻断，不当“全合法”）。 */
export function auditPlanNames(
  db: DatabaseSync,
  opts: { catalogPath?: string; catalog?: Set<string>; withSuggestions?: boolean } = {},
): AuditReport {
  // 库面两档与训记模块同一份（`catalogPath`／`catalog` 都是它的入参；缺省＝包内预置快照）。
  const report = verifyMovements(collectPlanNames(db), opts);
  if (!report.catalog_loaded) {
    return { status: 'fail', data: null, message: '训记动作库加载失败：' + String(report.catalog_error) };
  }
  const inCatalog = report.results.filter((r) => r.valid === true).map((r) => r.name).sort();
  const notInCatalog = report.results.filter((r) => r.valid === false).map((r) => r.name).sort();
  const data: AuditReport['data'] = {
    total: report.total,
    in_catalog: inCatalog,
    not_in_catalog: notInCatalog,
    catalog_loaded: true,
  };
  if (opts.withSuggestions && notInCatalog.length > 0) {
    const byName = new Map(report.results.map((r) => [r.name, r.suggestions]));
    data.suggestions = Object.fromEntries(notInCatalog.map((n) => [n, [...(byName.get(n) ?? [])]]));
  }
  if (notInCatalog.length === 0) {
    return { status: 'ok', data, message: `全部 ${report.total} 个动作名均在库` };
  }
  return { status: 'warn', data, message: `${notInCatalog.length} 个动作名不在库: ${notInCatalog.join('、')}` };
}
