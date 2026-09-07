// 渲染层·视图数据装配：DB 行 → 8 key 的 envelope data（全字段，不返空冒充由调用方缺失阻断）。
import type { ScheduleRecord, PlanEvent } from '../fetch/db.js';
import {
  l1Of, fmtDur, fmtPct, computeHealthScore, detectAnomalies, getEmojiPrefix,
} from '../policy/category.js';

export interface RecordItem {
  id: number; date: string; time: string; activity: string; category: string;
  emoji: string; duration: string; minutes: number;
}

export function toRecordItem(r: ScheduleRecord): RecordItem {
  return {
    id: r.id,
    date: r.date,
    time: r.time_start + '~' + r.time_end,
    activity: r.activity,
    category: r.category,
    emoji: getEmojiPrefix(r.category),
    duration: fmtDur(r.duration_minutes || 0),
    minutes: r.duration_minutes || 0,
  };
}

// 单日：items + total + 覆盖分钟/健康分（供模板主卡）。
export function buildRecordToday(date: string, records: ScheduleRecord[]): { items: RecordItem[]; total: number; coverage: number; score: number } {
  const items = records.map(toRecordItem);
  const byL1: Record<string, number> = {};
  let coverage = 0;
  for (const r of records) {
    const l1 = l1Of(r.category);
    byL1[l1] = (byL1[l1] || 0) + (r.duration_minutes || 0);
    coverage += r.duration_minutes || 0;
  }
  return { items, total: items.length, coverage, score: computeHealthScore(byL1).score };
}

// 区间：stat metrics（一级→分钟）+ 天数/总分钟（metrics 值须全 number，日期信息进 key 维度）。
export function buildRecordRange(start: string, end: string, records: ScheduleRecord[]): { metrics: Record<string, number> } {
  const metrics: Record<string, number> = {};
  const days = new Set<string>();
  let total = 0;
  for (const r of records) {
    const l1 = l1Of(r.category);
    const m = r.duration_minutes || 0;
    metrics['l1.' + l1] = (metrics['l1.' + l1] || 0) + m;
    days.add(r.date);
    total += m;
  }
  metrics['days'] = days.size;
  metrics['total'] = total;
  metrics['blocks'] = records.length;
  return { metrics };
}

export function buildRecordDetail(record: ScheduleRecord): { item: Record<string, unknown> } {
  return {
    item: {
      id: record.id, date: record.date, time: record.time_start + '~' + record.time_end,
      duration: fmtDur(record.duration_minutes || 0), activity: record.activity,
      category: record.category, emoji: getEmojiPrefix(record.category),
      edit_count: record.edit_count, updated_at: record.updated_at,
    },
  };
}

export function buildRecordReceipt(message: string): { ok: boolean; message: string } {
  return { ok: true, message };
}

// 对比：analysis summary（两聚合 + 差异 + 健康分差 + 异常句；数字全来自实算）。
export function buildRecordCompare(args: {
  labelA: string; labelB: string;
  a: ScheduleRecord[]; b: ScheduleRecord[];
}): { summary: string } {
  const agg = (rs: ScheduleRecord[]): { byL1: Record<string, number>; total: number; days: number } => {
    const byL1: Record<string, number> = {};
    const days = new Set<string>();
    let total = 0;
    for (const r of rs) {
      const l1 = l1Of(r.category);
      const m = r.duration_minutes || 0;
      byL1[l1] = (byL1[l1] || 0) + m;
      days.add(r.date);
      total += m;
    }
    return { byL1, total, days: days.size || 1 };
  };
  const A = agg(args.a);
  const B = agg(args.b);
  const sA = computeHealthScore(A.byL1).score;
  const sB = computeHealthScore(B.byL1).score;
  const lines: string[] = [];
  lines.push(args.labelA + ' vs ' + args.labelB + '：块数 ' + args.a.length + '→' + args.b.length + '，时长 ' + fmtDur(A.total) + '→' + fmtDur(B.total) + '，健康分 ' + sA + '→' + sB + '。');
  const dims = new Set([...Object.keys(A.byL1), ...Object.keys(B.byL1)].sort());
  for (const d of dims) {
    const c = B.byL1[d] || 0;
    const p = A.byL1[d] || 0;
    if (!p && !c) continue;
    const dp = p > 0 ? fmtPct(c - p, p) : 100;
    lines.push(d + '：' + fmtDur(p) + '→' + fmtDur(c) + '（' + (dp >= 0 ? '+' : '') + dp + '%）。');
  }
  const reds = detectAnomalies(B.byL1, A.byL1).filter((a) => a.level === 'red');
  if (reds.length) lines.push('显著变化：' + reds.map((a) => a.dim + (a.deltaPct >= 0 ? '+' : '') + a.deltaPct + '%').join('、') + '。');
  return { summary: lines.join('\n') };
}

// 类别深挖：analysis summary（区间内某分类明细 + 占比）。
export function buildCategoryDeep(start: string, end: string, category: string, records: ScheduleRecord[]): { summary: string } {
  const total = records.reduce((a, r) => a + (r.duration_minutes || 0), 0);
  const hit = records.filter((r) => r.category === category || l1Of(r.category) === category);
  const hm = hit.reduce((a, r) => a + (r.duration_minutes || 0), 0);
  const lines = [
    start + '~' + end + ' 类别深挖 ' + category + '：' + hit.length + ' 块，共 ' + fmtDur(hm) + '（占区间 ' + fmtPct(hm, total) + '%）。',
    ...hit.slice(0, 20).map((r) => r.date + ' ' + r.time_start + '~' + r.time_end + ' ' + r.activity),
  ];
  if (hit.length > 20) lines.push('……等共 ' + hit.length + ' 块。');
  return { summary: lines.join('\n') };
}

// 异常检测：analysis summary（窗口内按日聚合 vs 均值，红/黄句）。
export function buildAnomaly(end: string, windowDays: number, daily: { date: string; byL1: Record<string, number> }[]): { summary: string } {
  const mean: Record<string, number> = {};
  for (const d of daily) {
    for (const [k, v] of Object.entries(d.byL1)) mean[k] = (mean[k] || 0) + v;
  }
  for (const k of Object.keys(mean)) mean[k] = Math.round(mean[k] / Math.max(daily.length, 1));
  const lines = ['截止 ' + end + ' 近 ' + windowDays + ' 天异常检测（vs 日均）：'];
  let any = false;
  for (const d of daily) {
    const reds = detectAnomalies(d.byL1, mean).filter((a) => a.level !== null);
    if (reds.length) {
      any = true;
      lines.push(d.date + '：' + reds.map((a) => a.dim + (a.deltaPct >= 0 ? '+' : '') + a.deltaPct + '%').join('、') + '。');
    }
  }
  if (!any) lines.push('无显著异常。');
  return { summary: lines.join('\n') };
}

export interface PlanItem {
  id: number; date: string; time: string; title: string; category: string;
  completion: string | null; synced: boolean;
}

export function toPlanItem(p: PlanEvent): PlanItem {
  return {
    id: p.id, date: p.date, time: p.time_start + '~' + p.time_end, title: p.title,
    category: p.category || '', completion: p.completion, synced: !!p.feishu_event_id,
  };
}

export function buildPlanToday(date: string, events: PlanEvent[]): { items: PlanItem[]; total: number; date: string } {
  return { items: events.map(toPlanItem), total: events.length, date };
}

export function buildPlanReceipt(message: string): { ok: boolean; message: string } {
  return { ok: true, message };
}

// HELP 现找：list（短语→key/cli/一句话，构建期快照进 SKILL.md，运行时按需过滤）。
// #43 S2：total=0 时显式 out-of-scope 指引（定时/早睡以外置为准），hint 随 envelope 透出（list 形允许多余字段）。
export interface HelpItem { phrase: string; key: string; shape: string; cli: string; desc: string; }

export const HELP_EMPTY_HINT = '无命中：定时任务/早睡提醒等出 scope，以外置为准（HELP q 为空看全表，或换唤醒词如“查作息/查日程”）';

export function buildHelpItems(all: HelpItem[], q?: string): { items: HelpItem[]; total: number; hint?: string } {
  const items = !q || !q.trim() ? all : all.filter((h) => q.includes(h.phrase) || h.phrase.includes(q.trim()));
  if (!items.length) return { items, total: 0, hint: HELP_EMPTY_HINT };
  return { items, total: items.length };
}
