// 口径层·作息记录 params 校验（老家 add/amend-record/add-summary/compare 入参对应）。
// 日期容错 YYYYMMDD/slash/dot（老家 _normalize_date）；24:00→23:59（老家 normalize_time）。
import { SchedulePolicyError } from '../fetch/errors.js';
import { normalizeCategory } from './category.js';
import { RELATIVE_DATES, RELATIVE_RANGES, relativeToDate, relativeToRange, recentNDays } from './routing.js';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-4]):([0-5]\d)$/;
export const MONTH_RE = /^\d{4}-\d{2}$/;

export function normalizeDate(d: unknown, field = 'date'): string {
  if (typeof d !== 'string' || d.trim().length === 0) {
    throw new SchedulePolicyError('POLICY_BAD_DATE', field + ' 须为日期字符串（期望 YYYY-MM-DD 或 YYYYMMDD）');
  }
  let s = d.trim().replace(/\//g, '-').replace(/\./g, '-');
  if (/^\d{8}$/.test(s)) s = s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6);
  if (!DATE_RE.test(s)) {
    throw new SchedulePolicyError('POLICY_BAD_DATE', field + ' 格式非法：' + JSON.stringify(d) + '（期望 YYYY-MM-DD 或 YYYYMMDD）');
  }
  const [y, m, day] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== day) {
    throw new SchedulePolicyError('POLICY_BAD_DATE', field + ' 非真实日期：' + JSON.stringify(s));
  }
  return s;
}

export function normalizeMonth(m: unknown, field = 'month'): string {
  if (typeof m !== 'string' || !MONTH_RE.test(m.trim())) {
    throw new SchedulePolicyError('POLICY_BAD_DATE', field + ' 格式非法：' + JSON.stringify(m) + '（期望 YYYY-MM）');
  }
  return m.trim();
}

// 飞书 ISO 不接受 24:00：统一转 23:59（老家 normalize_time）。
export function normalizeTime(t: unknown, field = 'time'): string {
  if (typeof t !== 'string' || !TIME_RE.test(t.trim())) {
    throw new SchedulePolicyError('POLICY_BAD_TIME', field + ' 格式非法：' + JSON.stringify(t) + '（期望 HH:MM，00:00~24:00）');
  }
  const s = t.trim();
  return s === '24:00' ? '23:59' : s;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// 单日期 param：绝对日期或相对表达（今天/昨天/…）；缺省今天。
export function resolveDateParam(params: Record<string, unknown>, today?: Date): string {
  const v = params.date;
  if (v === undefined || v === null || v === '') return relativeToDate('今天', today);
  if (typeof v !== 'string') throw new SchedulePolicyError('POLICY_BAD_DATE', 'date 须为字符串');
  if (RELATIVE_DATES.includes(v.trim())) return relativeToDate(v, today);
  return normalizeDate(v);
}

// 区间 param：显式 start/end，或 range 相对表达（本周/上月…），或 recentDays N。
export function resolveRangeParam(params: Record<string, unknown>, today?: Date): { start: string; end: string } {
  if (typeof params.range === 'string' && RELATIVE_RANGES.includes(params.range.trim())) {
    return relativeToRange(params.range, today);
  }
  if (params.recentDays !== undefined) {
    const n = params.recentDays;
    if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > 366) {
      throw new SchedulePolicyError('POLICY_BAD_INPUT', 'recentDays 须为 1~366 的整数');
    }
    return recentNDays(n as number, today);
  }
  if (params.start === undefined || params.end === undefined) {
    throw new SchedulePolicyError('POLICY_MISSING_SLOT', '缺槽位 start/end（或改用 range=本周/上月… 或 recentDays=N）');
  }
  const start = normalizeDate(params.start, 'start');
  const end = normalizeDate(params.end, 'end');
  if (start > end) throw new SchedulePolicyError('POLICY_BAD_INPUT', 'start 不得晚于 end：' + start + '~' + end);
  return { start, end };
}

export interface AddInput {
  date: string; time_start: string; time_end: string; duration_minutes: number;
  activity: string; category: string;
  source_contents?: string | null; source_timestamps?: string | null; analysis_reasoning?: string | null;
}

// #0 记作息：9 字段强校验（date/time_start/time_end/activity/category 必填；duration 自算可复核）。
export function validateAddInput(params: Record<string, unknown>): AddInput {
  const date = normalizeDate(params.date, 'date');
  const timeStart = normalizeTime(params.time_start, 'time_start');
  const timeEnd = normalizeTime(params.time_end, 'time_end');
  if (toMinutes(timeEnd) <= toMinutes(timeStart)) {
    throw new SchedulePolicyError('POLICY_BAD_TIME', 'time_end 必须晚于 time_start：' + timeStart + '~' + timeEnd);
  }
  const activity = params.activity;
  if (typeof activity !== 'string' || activity.trim().length === 0) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'activity 不能为空');
  }
  const category = normalizeCategory(params.category);
  const duration = toMinutes(timeEnd) - toMinutes(timeStart);
  if (params.duration_minutes !== undefined && params.duration_minutes !== duration) {
    throw new SchedulePolicyError(
      'POLICY_BAD_INPUT',
      'duration_minutes 对不上起止（期望 ' + duration + '，实际 ' + String(params.duration_minutes) + '）',
    );
  }
  const opt = (k: string): string | null => {
    const v = params[k];
    if (v === undefined || v === null) return null;
    if (typeof v !== 'string') throw new SchedulePolicyError('POLICY_BAD_INPUT', k + ' 须为字符串');
    return v;
  };
  return {
    date, time_start: timeStart, time_end: timeEnd, duration_minutes: duration,
    activity: activity.trim(), category,
    source_contents: opt('source_contents'), source_timestamps: opt('source_timestamps'),
    analysis_reasoning: opt('analysis_reasoning'),
  };
}

// #26 修正：id 必填 + 至少改一个字段（改后 edit_count 自增由 db 层做）。
export function validateAmendInput(params: Record<string, unknown>): { id: number; patch: Record<string, unknown> } {
  const id = params.id;
  if (!Number.isInteger(id) || (id as number) <= 0) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'amend 须给正整数 id');
  }
  const patch: Record<string, unknown> = {};
  if (params.date !== undefined) patch.date = normalizeDate(params.date, 'date');
  if (params.time_start !== undefined) patch.time_start = normalizeTime(params.time_start, 'time_start');
  if (params.time_end !== undefined) patch.time_end = normalizeTime(params.time_end, 'time_end');
  if (patch.time_start !== undefined && patch.time_end !== undefined &&
    toMinutes(patch.time_end as string) <= toMinutes(patch.time_start as string)) {
    throw new SchedulePolicyError('POLICY_BAD_TIME', 'time_end 必须晚于 time_start');
  }
  if (params.activity !== undefined) {
    if (typeof params.activity !== 'string' || !params.activity.trim()) {
      throw new SchedulePolicyError('POLICY_BAD_INPUT', 'activity 不能为空');
    }
    patch.activity = params.activity.trim();
  }
  if (params.category !== undefined) patch.category = normalizeCategory(params.category);
  for (const k of ['source_contents', 'source_timestamps', 'analysis_reasoning']) {
    if (params[k] !== undefined) {
      if (typeof params[k] !== 'string') throw new SchedulePolicyError('POLICY_BAD_INPUT', k + ' 须为字符串');
      patch[k] = params[k];
    }
  }
  if (!Object.keys(patch).length) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'amend 至少改一个字段（date/time_start/time_end/activity/category/来源三字段）');
  }
  return { id: id as number, patch };
}

// #24 写作息摘要：date+category+total_minutes（≥0）。
export function validateSummaryInput(params: Record<string, unknown>): { date: string; category: string; totalMinutes: number } {
  const date = normalizeDate(params.date, 'date');
  const category = normalizeCategory(params.category);
  const m = params.total_minutes;
  if (!Number.isInteger(m) || (m as number) < 0 || (m as number) > 1440) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'total_minutes 须为 0~1440 的整数');
  }
  return { date, category, totalMinutes: m as number };
}

export type CompareKind = 'months' | 'ranges' | 'category' | 'anomaly';

// #25/T4/T5 对比 family：months（两 YYYY-MM）/ ranges（两起止+标签）/ category（区间+分类）/ anomaly（窗口天）。
export function validateCompareInput(params: Record<string, unknown>): CompareKind & Record<string, unknown> {
  const kind = params.kind;
  if (kind === 'months') {
    const a = normalizeMonth(params.monthA, 'monthA');
    const b = normalizeMonth(params.monthB, 'monthB');
    return { kind, monthA: a, monthB: b } as unknown as CompareKind & Record<string, unknown>;
  }
  if (kind === 'ranges') {
    const aS = normalizeDate(params.startA, 'startA');
    const aE = normalizeDate(params.endA, 'endA');
    const bS = normalizeDate(params.startB, 'startB');
    const bE = normalizeDate(params.endB, 'endB');
    if (aS > aE || bS > bE) throw new SchedulePolicyError('POLICY_BAD_INPUT', '对比区间起止倒置');
    const labelA = typeof params.labelA === 'string' && params.labelA ? params.labelA : aS + '~' + aE;
    const labelB = typeof params.labelB === 'string' && params.labelB ? params.labelB : bS + '~' + bE;
    return { kind, startA: aS, endA: aE, startB: bS, endB: bE, labelA, labelB } as unknown as CompareKind & Record<string, unknown>;
  }
  if (kind === 'category') {
    const { start, end } = resolveRangeParam(params);
    const category = normalizeCategory(params.category);
    return { kind, start, end, category } as unknown as CompareKind & Record<string, unknown>;
  }
  if (kind === 'anomaly') {
    const w = params.windowDays === undefined ? 7 : params.windowDays;
    if (!Number.isInteger(w) || (w as number) < 2 || (w as number) > 90) {
      throw new SchedulePolicyError('POLICY_BAD_INPUT', 'windowDays 须为 2~90 的整数');
    }
    const end = params.end === undefined ? relativeToDate('今天') : normalizeDate(params.end, 'end');
    return { kind, windowDays: w, end } as unknown as CompareKind & Record<string, unknown>;
  }
  throw new SchedulePolicyError('POLICY_BAD_INPUT', 'kind 非法（期望 months/ranges/category/anomaly）：' + JSON.stringify(kind));
}
