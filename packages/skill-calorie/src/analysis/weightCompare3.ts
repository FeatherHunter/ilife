/** T5 #24 · 体重对比续（c5 极端月/d4 工作周末/分发，对照老家 weight_compare.py）。
 *
 * c5 睡眠读外部技能库：默认不碰（标注缺失）；仅显式 scheduleDbPath 才读
 * （铁律：仓外目录与他人 worktree 不碰，路径由调用方显式给）。
 */
import { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { todayISO } from './utils.js';
import { sameDayCompare, scenarioA1, scenarioA2, scenarioA3, scenarioA4, scenarioA5, scenarioB1 } from './weightCompare.js';
import type { ScenarioOpts, ScenarioResult } from './weightCompare.js';
import { scenarioB8, scenarioE1, scenarioE2, scenarioE3, scenarioE5, scenarioE6 } from './weightCompare2.js';

const round = (n: number): number => Math.round(n);
const round2 = (n: number): number => Math.round(n * 100) / 100;

type Row = [string, number];

function fetchRows(db: DatabaseSync, start: string, end: string): Row[] {
  const raw = db.prepare('SELECT date AS d, weight_kg AS w FROM weight_log WHERE date BETWEEN ? AND ? ORDER BY date').all(start, end) as unknown as Array<{ d: string; w: number }>;
  return raw.map((r) => [r.d, r.w]);
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1));
}

function monthTotal(db: DatabaseSync, mStart: string, mEnd: string, table: string, col: string): number | null {
  try {
    const row = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(' + col + '), 0) AS v FROM ' + table + ' WHERE date BETWEEN ? AND ?').get(mStart, mEnd) as { n: number; v: number };
    if (!row || row.n === 0) return null;
    return round(row.v);
  } catch { return null; }
}

function sleepHours(scheduleDbPath: string | null | undefined, mStart: string, mEnd: string): number | null {
  if (!scheduleDbPath) return null;
  try {
    const sdb = new DatabaseSync(scheduleDbPath, { readOnly: true });
    try {
      const row = sdb.prepare(
        "SELECT COUNT(*) AS n, COALESCE(SUM(duration_minutes), 0) AS v FROM schedule_records WHERE date BETWEEN ? AND ? AND (category LIKE '%睡眠%' OR activity LIKE '%睡眠%')",
      ).get(mStart, mEnd) as { n: number; v: number };
      if (!row || row.n === 0) return null;
      return Math.round((row.v / 60) * 10) / 10;
    } finally { sdb.close(); }
  } catch { return null; }
}

function monthRange(m: string): [string, string] {
  const y = Number(m.slice(0, 4));
  const mo = Number(m.slice(5, 7));
  const dim = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1] as number;
  return [m + '-01', m + '-' + String(dim).padStart(2, '0')];
}

export function scenarioC5(db: DatabaseSync, scheduleDbPath?: string | null): ScenarioResult {
  const monthsRaw = db.prepare(
    "SELECT strftime('%Y-%m', date) AS m, COALESCE(SUM(calories_burned), 0) AS v FROM exercise_log WHERE date IS NOT NULL GROUP BY m ORDER BY m",
  ).all() as unknown as Array<{ m: string; v: number }>;
  const months: Array<[string, number]> = monthsRaw.map((r) => [r.m, r.v]);
  if (months.length < 2) throw new FetchError('数据不足(需至少 2 个月有运动记录)');
  let lowM = (months[0] as [string, number])[0];
  let highM = lowM;
  let lowT = 0;
  let highT = 0;
  for (const [m, total] of months) {
    if (total > highT) { highT = total; highM = m; }
    if (lowT === 0 || total < lowT) { lowT = total; lowM = m; }
  }
  if (lowM === highM) throw new FetchError('数据不足(各月运动量相同)');
  const [lowS, lowE] = monthRange(lowM);
  const [highS, highE] = monthRange(highM);
  const segOf = (s: string, e: string, label: string) => {
    const rows = fetchRows(db, s, e);
    if (rows.length === 0) return null;
    const kgs = rows.map((r) => r[1]);
    const first = rows[0] as Row;
    const last = rows[rows.length - 1] as Row;
    return { label, range: first[0] + ' ~ ' + last[0], count: rows.length, avg: round2(mean(kgs)), startKg: first[1], endKg: last[1], netChange: round2(last[1] - first[1]), volatility: round2(Math.max(...kgs) - Math.min(...kgs)) };
  };
  const a = segOf(lowS, lowE, lowM + '(运动最少)');
  const b = segOf(highS, highE, highM + '(运动最多)');
  if (!a || !b) throw new FetchError('数据不足(极端月无体重记录)');
  const calLow = monthTotal(db, lowS, lowE, 'food_log', 'calories');
  const calHigh = monthTotal(db, highS, highE, 'food_log', 'calories');
  const sleepLow = sleepHours(scheduleDbPath, lowS, lowE);
  const sleepHigh = sleepHours(scheduleDbPath, highS, highE);
  const delta = round2((b.avg as number) - (a.avg as number));
  const extra: Array<{ label: string; value: string }> = [
    { label: lowM + ' 运动总量', value: round(lowT) + ' 卡' },
    { label: highM + ' 运动总量', value: round(highT) + ' 卡' },
    calLow !== null ? { label: lowM + ' 摄入', value: calLow + ' 卡' } : { label: lowM + ' 摄入', value: '缺失(无记录)' },
    calHigh !== null ? { label: highM + ' 摄入', value: calHigh + ' 卡' } : { label: highM + ' 摄入', value: '缺失(无记录)' },
  ];
  if (sleepLow !== null && sleepHigh !== null) {
    extra.push({ label: lowM + ' 睡眠', value: sleepLow + ' 小时' });
    extra.push({ label: highM + ' 睡眠', value: sleepHigh + ' 小时' });
  } else extra.push({ label: '睡眠数据', value: '缺失(外部技能未记录)' });
  return {
    segA: a,
    segB: b,
    compare: { deltaKg: delta, direction: delta < -0.05 ? '下降' : delta > 0.05 ? '上升' : '持平', rateDiffG: null, speed: '—' },
    extraRows: extra,
  };
}

export function scenarioD4(db: DatabaseSync, today: string = todayISO()): ScenarioResult {
  const start = (() => {
    const t = Date.parse(today + 'T12:00:00Z');
    return new Date(t - 6 * 86400000).toISOString().slice(0, 10);
  })();
  const rows = fetchRows(db, start, today);
  if (rows.length === 0) throw new FetchError('最近 7 天无记录');
  const wd = rows.filter((r) => { const d = (new Date(r[0] + 'T12:00:00Z').getUTCDay() + 6) % 7; return d < 5; });
  const we = rows.filter((r) => { const d = (new Date(r[0] + 'T12:00:00Z').getUTCDay() + 6) % 7; return d >= 5; });
  if (wd.length === 0 || we.length === 0) throw new FetchError('样本不足(工作日/周末需各有记录)');
  const stats = (rr: Row[]): [number, number] => {
    const kgs = rr.map((r) => r[1]);
    return [round2(mean(kgs)), round2(stdev(kgs))];
  };
  const [wdAvg, wdVol] = stats(wd);
  const [weAvg, weVol] = stats(we);
  const delta = round2(weAvg - wdAvg);
  const agreement = round(Math.max(0, 1 - Math.min(1, Math.abs(delta))) * 100);
  const first = (rr: Row[]): Row => rr[0] as Row;
  const last = (rr: Row[]): Row => rr[rr.length - 1] as Row;
  return {
    segA: { label: '工作日', range: first(wd)[0] + ' ~ ' + last(wd)[0], count: wd.length, avg: wdAvg, startKg: first(wd)[1], endKg: last(wd)[1], netChange: round2(last(wd)[1] - first(wd)[1]), volatility: wdVol },
    segB: { label: '周末', range: first(we)[0] + ' ~ ' + last(we)[0], count: we.length, avg: weAvg, startKg: first(we)[1], endKg: last(we)[1], netChange: round2(last(we)[1] - first(we)[1]), volatility: weVol },
    compare: { deltaKg: delta, direction: delta > 0.05 ? '周末更高' : delta < -0.05 ? '周末更低' : '持平', rateDiffG: null, speed: '—' },
    extraRows: [
      { label: '工作日波动', value: '±' + wdVol + ' kg' },
      { label: '周末波动', value: '±' + weVol + ' kg' },
      { label: '一致率', value: agreement + '%' },
    ],
  };
}

export const SCENARIO_LABELS: Record<string, string> = {
  a1: '对比体重：最近 30 天 vs 之前 30 天',
  a2: '对比体重：自定义两段时间',
  a3: '对比体重：本周 vs 上周',
  a4: '对比体重：本月 vs 上月',
  a5: '对比体重：近 N 天 vs 上一个 N 天',
  a6: '对比体重：今天 vs 一年前今天',
  a7: '对比体重：今天 vs 半年前今天',
  a8: '对比体重：今天 vs 三月前今天',
  b1: '对比体重：当前 vs 目标体重',
  b8: '对比体重：当前 vs 平台期首日',
  e1: '对比体重：当前 vs 历史最低',
  e2: '对比体重：当前 vs 历史最高',
  e3: '对比体重：减重 N kg 那天 vs 今天',
  e5: '对比体重：当前 vs 入夏最低',
  e6: '对比体重：当前 vs 入冬最低',
  c5: '对比体重：运动多 vs 运动少的两个月',
  d4: '对比体重：工作日 vs 周末',
};

export type ScenarioName = keyof typeof SCENARIO_LABELS;

export function runScenario(db: DatabaseSync, name: string, opts: ScenarioOpts = {}, today: string = todayISO()): ScenarioResult {
  switch (name) {
    case 'a1': return scenarioA1(db, today);
    case 'a2': return scenarioA2(db, opts);
    case 'a3': return scenarioA3(db, today);
    case 'a4': return scenarioA4(db, today);
    case 'a5': return scenarioA5(db, today, opts.n ?? 30);
    case 'a6': return sameDayCompare(db, today, 12, '一年前');
    case 'a7': return sameDayCompare(db, today, 6, '半年前');
    case 'a8': return sameDayCompare(db, today, 3, '三月前');
    case 'b1': return scenarioB1(db, today);
    case 'b8': return scenarioB8(db);
    case 'e1': return scenarioE1(db, today);
    case 'e2': return scenarioE2(db);
    case 'e3': return scenarioE3(db, opts.delta ?? 5);
    case 'e5': return scenarioE5(db, today);
    case 'e6': return scenarioE6(db, today);
    case 'c5': return scenarioC5(db, opts.scheduleDbPath);
    case 'd4': return scenarioD4(db, today);
    default: throw new FetchError('未知场景 ' + name);
  }
}
