// 口径层·相对时间换算（老家 scripts/routing.py 逐行对应）。
// 纯函数无副作用；today 参数可注入（测试钉死跨月/跨年/闰年边界）。
// 周一起始（中国习惯）；最近 N 天含今天共 N 天。
export function todayStr(today?: Date): string {
  return iso(today || new Date());
}

function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  c.setDate(c.getDate() + n);
  return c;
}

// 7 个相对日期表达式：今天/昨天/前天/大前天/明天/后天/大后天。
export function relativeToDate(expr: string, today?: Date): string {
  const t = today || new Date();
  const e = expr.trim();
  if (e === '今天') return iso(t);
  if (e === '昨天') return iso(addDays(t, -1));
  if (e === '前天') return iso(addDays(t, -2));
  if (e === '大前天') return iso(addDays(t, -3));
  if (e === '明天') return iso(addDays(t, 1));
  if (e === '后天') return iso(addDays(t, 2));
  if (e === '大后天') return iso(addDays(t, 3));
  throw new Error('未知相对日期表达式：' + JSON.stringify(expr) + '（支持：今天/昨天/前天/大前天/明天/后天/大后天）');
}

// 7 个相对范围表达式：本周/这周/上周/上上周/本月/这个月/上个月/上月。
export function relativeToRange(expr: string, today?: Date): { start: string; end: string } {
  const t = today || new Date();
  const e = expr.trim();
  const weekday = (t.getDay() + 6) % 7; // 周一=0
  if (e === '本周' || e === '这周') {
    return { start: iso(addDays(t, -weekday)), end: iso(addDays(t, 6 - weekday)) };
  }
  if (e === '上周') {
    return { start: iso(addDays(t, -weekday - 7)), end: iso(addDays(t, -weekday - 1)) };
  }
  if (e === '上上周') {
    return { start: iso(addDays(t, -weekday - 14)), end: iso(addDays(t, -weekday - 8)) };
  }
  if (e === '本月' || e === '这个月') {
    const start = new Date(t.getFullYear(), t.getMonth(), 1);
    const end = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    return { start: iso(start), end: iso(end) };
  }
  if (e === '上个月' || e === '上月') {
    const start = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    const end = new Date(t.getFullYear(), t.getMonth(), 0);
    return { start: iso(start), end: iso(end) };
  }
  throw new Error('未知相对范围表达式：' + JSON.stringify(expr) + '（支持：本周/这周/上周/上上周/本月/这个月/上个月/上月）');
}

// 最近 N 天：今天-(N-1) ~ 今天（N≥1）。
export function recentNDays(n: number, today?: Date): { start: string; end: string } {
  if (!Number.isInteger(n) || n < 1) throw new Error('n 必须≥1 的整数，实际 ' + String(n));
  const t = today || new Date();
  return { start: iso(addDays(t, -(n - 1))), end: iso(t) };
}

export const RELATIVE_DATES = ['今天', '昨天', '前天', '大前天', '明天', '后天', '大后天'];
export const RELATIVE_RANGES = ['本周', '这周', '上周', '上上周', '本月', '这个月', '上个月', '上月'];
