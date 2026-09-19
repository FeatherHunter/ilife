/** 共用位·收支口径（KPI）（#689 结构搬迁第三批：从 `src/render/views.ts` 拆来）。
 *  KPI（转账除外）：count／expense／income／net 全 number。
 *
 *  `isTransfer`（转账不入收支统计：账本 `转账` 或分类 `转账/*`）**必须与本件的 `calcKpi` 同住一件**——
 *  它是这条口径的唯一判地，`calcKpi`／`calcCategories`／`buildOverview`／`buildTrend` 四处都走它；
 *  各写一份「算不算转账」就是两套口径（#683 §3.9）。
 *
 *  谁在用（指名）：
 *    · `src/query/read.ts`——四条查询命令的 KPI 胶囊与查分类的占比（`calcKpi`）；
 *    · `src/analysis/views.ts`——分类聚合／总览／对比／趋势（`calcKpi` ＋ `isTransfer`）。
 *  两域在用它 ⇒ 住共用位（归属律 2）。 */
import type { BillRow } from '../fetch/db.js';

/** 这一行算不算转账（转账是同一笔钱换口袋，不入收支统计，余额另计）。 */
export function isTransfer(r: BillRow): boolean {
  return r.ledger === '转账' || r.category.startsWith('转账/');
}

// KPI（转账除外）：count/expense/income/net 全 number。
export function calcKpi(records: BillRow[]): { count: number; expense: number; income: number; net: number } {
  const real = records.filter((r) => !isTransfer(r));
  let expense = 0; let income = 0;
  for (const r of real) {
    if (r.amount < 0) expense += Math.abs(r.amount);
    else income += r.amount;
  }
  expense = Math.round(expense * 100) / 100;
  income = Math.round(income * 100) / 100;
  return { count: real.length, expense, income, net: Math.round((income - expense) * 100) / 100 };
}
