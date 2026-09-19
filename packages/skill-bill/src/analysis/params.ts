/** 分析域·命令参数的 kind 分流与槽位读取（#689 结构搬迁第三批：从 `src/policy/analysis.ts` 来）。
 *  kind 分流：overview（月度/年度/总览/周报/分类/账户/账本/结构/统计）/
 *  compare（对比/双区间/同比/分类对比）/
 *  trend（趋势/大额/高频/分布/活跃/洞察/异常/借贷/报销/分期/退款）。
 *  日期串与月份串的归一取 `../shared/dateRange.js`（真源一处，本件不自己算）。
 *
 *  谁在用（指名）：`src/cli/cmd_read.ts` 的 analysis 分支（三条未迁移命令的分派）——随命令搬进本域后
 *    由本域的处理体经 `./index.js` 取，消费方照旧只认域名。 */
import { BillPolicyError } from '../fetch/errors.js';
import { normalizeDate, normalizeMonth } from '../shared/dateRange.js';

export type OverviewKind = 'monthly' | 'yearly' | 'overview' | 'week' | 'category' | 'account' | 'ledger' | 'structure' | 'stats';
export type CompareKind = 'period' | 'range' | 'yoy' | 'category';
export type TrendKind = 'trend' | 'category' | 'top' | 'frequent' | 'distribution' | 'activity' | 'insight' | 'anomaly' | 'debt' | 'reimburse' | 'installment' | 'refund';

export function parseOverviewKind(params: Record<string, unknown>): OverviewKind {
  const k = params.kind === undefined ? 'monthly' : params.kind;
  const ok: string[] = ['monthly', 'yearly', 'overview', 'week', 'category', 'account', 'ledger', 'structure', 'stats'];
  if (typeof k === 'string' && ok.includes(k)) return k as OverviewKind;
  throw new BillPolicyError('POLICY_BAD_INPUT', 'kind 非法（期望 ' + ok.join('/') + '）：' + JSON.stringify(k));
}

export function parseCompareKind(params: Record<string, unknown>): CompareKind {
  const k = params.kind === undefined ? 'period' : params.kind;
  const ok: string[] = ['period', 'range', 'yoy', 'category'];
  if (typeof k === 'string' && ok.includes(k)) return k as CompareKind;
  throw new BillPolicyError('POLICY_BAD_INPUT', 'kind 非法（期望 period/range/yoy/category）：' + JSON.stringify(k));
}

export function parseTrendKind(params: Record<string, unknown>): TrendKind {
  const k = params.kind === undefined ? 'trend' : params.kind;
  const ok: string[] = ['trend', 'category', 'top', 'frequent', 'distribution', 'activity', 'insight', 'anomaly', 'debt', 'reimburse', 'installment', 'refund'];
  if (typeof k === 'string' && ok.includes(k)) return k as TrendKind;
  throw new BillPolicyError('POLICY_BAD_INPUT', 'kind 非法（期望 trend/category/top/frequent/distribution/activity/insight/anomaly/debt/reimburse/installment/refund）：' + JSON.stringify(k));
}

export function needMonth(params: Record<string, unknown>, name = 'month'): string {
  return normalizeMonth(params[name], name);
}

export function needRange(params: Record<string, unknown>): { start: string; end: string } {
  if (params.start === undefined || params.end === undefined) {
    throw new BillPolicyError('POLICY_MISSING_SLOT', '缺槽位 start/end');
  }
  const start = normalizeDate(params.start, 'start');
  const end = normalizeDate(params.end, 'end');
  if (start > end) throw new BillPolicyError('POLICY_BAD_INPUT', 'start 不得晚于 end');
  return { start, end };
}
