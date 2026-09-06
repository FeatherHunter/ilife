// 渲染层·视图数据装配：DB 行 → 16 key 的 envelope data（全字段，不返空冒充由调用方缺失阻断）。
// KPI：笔数/支出（绝对值累计）/收入/净额；转账分类 转账/* 不入收支统计，余额另计。
import type { BillRow } from '../fetch/db.js';
import { l1Of } from '../policy/category.js';

export interface BillItem {
  id: number; category: string; time: string; amount: number;
  account: string; ledger: string; currency: string; note: string;
}

export function toBillItem(r: BillRow): BillItem {
  return {
    id: r.id, category: r.category, time: r.time, amount: r.amount,
    account: r.account, ledger: r.ledger, currency: r.currency, note: r.note,
  };
}

function isTransfer(r: BillRow): boolean {
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

// 单日/区间/搜索：items + total + kpi（供模板主卡）。
export function buildRecordToday(date: string, records: BillRow[]): { items: BillItem[]; total: number; date: string; kpi: ReturnType<typeof calcKpi> } {
  const items = records.map(toBillItem);
  return { items, total: items.length, date, kpi: calcKpi(records) };
}

export function buildRecordRange(start: string, end: string, records: BillRow[]): { items: BillItem[]; total: number; start: string; end: string; kpi: ReturnType<typeof calcKpi> } {
  const items = records.map(toBillItem);
  return { items, total: items.length, start, end, kpi: calcKpi(records) };
}

export function buildRecordSearch(kind: string, records: BillRow[]): { items: BillItem[]; total: number; kind: string; kpi: ReturnType<typeof calcKpi> } {
  const items = records.map(toBillItem);
  return { items, total: items.length, kind, kpi: calcKpi(records) };
}

export function buildRecordDetail(record: BillRow): { item: Record<string, unknown> } {
  return { item: { ...toBillItem(record) } };
}

export function buildRecordReceipt(message: string): { ok: boolean; message: string } {
  return { ok: true, message };
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

// 目标/账户查询：list（items + total；预算执行/余额由调用方实算装配）。
export function buildGoalQuery(op: string, items: Record<string, unknown>[]): { items: Record<string, unknown>[]; total: number; op: string } {
  return { items, total: items.length, op };
}

export function buildAccountQuery(items: Record<string, unknown>[]): { items: Record<string, unknown>[]; total: number } {
  return { items, total: items.length };
}

// HELP 现找：list（短语→key/cli/一句话，构建期快照进 SKILL.md，运行时按需过滤）。
export interface HelpItem { phrase: string; key: string; shape: string; cli: string; desc: string; }

export function buildHelpItems(all: HelpItem[], q?: string): { items: HelpItem[]; total: number } {
  const items = !q || !q.trim() ? all : all.filter((h) => (q as string).includes(h.phrase) || h.phrase.includes((q as string).trim()));
  return { items, total: items.length };
}
