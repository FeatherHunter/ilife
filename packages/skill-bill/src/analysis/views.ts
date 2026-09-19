/** 分析域·结果载荷装配件（#689 结构搬迁第三批：从 `src/render/views.ts` 拆来）。
 *  DB 行 → 分析域的 envelope 载荷（全字段，不返空冒充由调用方缺失阻断）：
 *    · `calcCategories`——分类聚合（支出侧绝对值降序，转账除外）；
 *    · `buildOverview`——总览（stat metrics：count/expense/income/net ＋ l1.* ＋ days 全 number）；
 *    · `buildCompare`——对比（analysis summary：两聚合 ＋ 差异句，数字全来自实算）；
 *    · `buildTrend`——趋势／排行／洞察（analysis summary：按月聚合 ＋ Top／高频／分布／异常句）。
 *  收支口径（`calcKpi`／`isTransfer`）取 `../shared/kpi.js`（真源一处，本件不重算）；一级分类取
 *  `../shared/category.js` 的 `l1Of`。
 *
 *  谁在用（指名）：`src/cli/cmd_read.ts` 的 analysis 分支（三条未迁移命令的分派，经 `./index.js` 门取）·
 *    `src/query/read.ts`（查分类的分类聚合与占比，经同一道门取 `calcCategories`）。
 *  命令搬进本域后由本域处理体消费，门外的那两处随之收窄。 */
import type { BillRow } from '../fetch/db.js';
import { l1Of } from '../shared/category.js';
import { calcKpi, isTransfer } from '../shared/kpi.js';

// 分类聚合（支出侧绝对值降序，转账除外）。
export function calcCategories(records: BillRow[]): { category: string; total: number; count: number }[] {
  const agg = new Map<string, { category: string; total: number; count: number }>();
  for (const r of records) {
    if (r.amount >= 0 || isTransfer(r)) continue;
    const cat = r.category || '其他';
    const it = agg.get(cat) ?? { category: cat, total: 0, count: 0 };
    it.total += Math.abs(r.amount);
    it.count += 1;
    agg.set(cat, it);
  }
  const out = [...agg.values()].sort((a, b) => b.total - a.total);
  for (const it of out) it.total = Math.round(it.total * 100) / 100;
  return out;
}

// 总览：stat metrics（count/expense/income/net + l1.* + days 全 number）。
export function buildOverview(label: string, records: BillRow[]): { metrics: Record<string, number> } {
  const kpi = calcKpi(records);
  const metrics: Record<string, number> = { count: kpi.count, expense: kpi.expense, income: kpi.income, net: kpi.net };
  const days = new Set<string>();
  for (const r of records) {
    days.add(r.time.slice(0, 10));
    if (r.amount < 0 && !isTransfer(r)) {
      const k = 'l1.' + l1Of(r.category);
      metrics[k] = Math.round(((metrics[k] || 0) + Math.abs(r.amount)) * 100) / 100;
    }
  }
  metrics.days = days.size;
  void label;
  return { metrics };
}

// 对比：analysis summary（两聚合 + 差异句；数字全来自实算）。
export function buildCompare(args: { labelA: string; labelB: string; a: BillRow[]; b: BillRow[] }): { summary: string } {
  const ka = calcKpi(args.a); const kb = calcKpi(args.b);
  const fmt = (n: number): string => String(n);
  const lines = [
    `${args.labelA} vs ${args.labelB}：笔数 ${ka.count}→${kb.count}，支出 ${fmt(ka.expense)}→${fmt(kb.expense)}，收入 ${fmt(ka.income)}→${fmt(kb.income)}，净额 ${fmt(ka.net)}→${fmt(kb.net)}。`,
  ];
  const d = Math.round((kb.expense - ka.expense) * 100) / 100;
  lines.push('支出变化：' + (d >= 0 ? '+' : '') + d + '。');
  return { summary: lines.join('\n') };
}

// 趋势/排行/洞察：analysis summary（按月聚合 + Top/高频/分布/异常句；数字全来自实算）。
export function buildTrend(kind: string, records: BillRow[], opts: { limit?: number } = {}): { summary: string } {
  const limit = opts.limit ?? 5;
  const byMonth = new Map<string, number>();
  for (const r of records) {
    if (isTransfer(r)) continue;
    const m = r.time.slice(0, 7);
    byMonth.set(m, Math.round(((byMonth.get(m) || 0) + Math.abs(r.amount)) * 100) / 100);
  }
  const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const lines = [`${kind}：共 ${records.length} 笔，` + months.map(([m, v]) => `${m} ${v}`).join('、') + '。'];
  if (kind === 'top' || kind === 'trend') {
    const top = [...records].filter((r) => r.amount < 0 && !isTransfer(r)).sort((a, b) => a.amount - b.amount).slice(0, limit);
    for (const r of top) lines.push(`${r.time.slice(0, 10)} ${r.category} ${r.amount} ${r.note}`.trim());
  }
  if (kind === 'insight' || kind === 'anomaly') {
    const cats = calcCategories(records).slice(0, 3);
    if (cats.length) lines.push('主要支出：' + cats.map((c) => `${c.category} ${c.total}`).join('、') + '。');
    else lines.push('样本不足，无显著异常。');
  }
  return { summary: lines.join('\n') };
}
