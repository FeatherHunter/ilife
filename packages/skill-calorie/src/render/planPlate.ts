/** #41 · 训练计划读链 render 数据（计划看/构建向导/运动目标视图）。
 *
 * 数据源全复用既有取数层：
 * 计划看=workout/planStore.getPlan（无配置且无会话即 missing）；
 * 构建向导=workout/planStore.validatePlan 纯校验 dryRun（不写库，写链归 #40）；
 * 运动目标= daily_goal.exercise_goal（日耗目标，未设即 missing）+ analysis/exerciseReview。
 * 缺失阻断不返空；plan JSON 非法走 bad-input。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getPlan, validatePlan } from '../workout/planStore.js';
import type { PlanInput, PlanSessionRow } from '../workout/planStore.js';
import { listWindow } from '../exercise/exerciseStore.js';
import { buildExerciseReview } from '../analysis/exerciseReview.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from './errors.js';

function assertDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + 'T12:00:00Z'))) {
    throw new CalorieRenderError('bad-input', '日期非法: ' + String(s));
  }
}

export interface PlanView {
  title: string | null;
  /** 计划版本（`workout_plan_config.version`）；库列为空即 null，页头按缺项不印。 */
  version: string | null;
  /** 计划起始日（`workout_plan_config.start_date`）；同上。 */
  startDate: string | null;
  totalWeeks: number | null;
  sessions: PlanSessionRow[];
  totalSessions: number;
  totalMovements: number;
}

/** 日期 →（周,日）：周从 1 起，日 1＝周一..7＝周日（与计划库 day_of_week 同口径）。 */
export function weekOfDate(startISO: string, dateISO: string): { week: number; dow: number } {
  const toDay = (s: string): number => Date.parse(s + 'T12:00:00Z');
  const diff = Math.round((toDay(dateISO) - toDay(startISO)) / 86400000);
  const startMon0 = (new Date(toDay(startISO)).getUTCDay() + 6) % 7;
  const idx = startMon0 + diff;
  const week = Math.floor(idx / 7) + 1;
  return { week, dow: idx - (week - 1) * 7 + 1 };
}

export interface PlanFilter {
  dateISO?: string;
  week?: number;
  weekOffset?: number;
  anchorISO?: string;
  movement?: string;
}

export function buildPlanView(db: DatabaseSync, opts: PlanFilter = {}): PlanView {
  const plan = getPlan(db);
  if (!plan.config && plan.sessions.length === 0) {
    throw new CalorieRenderError('missing-data', '无训练计划（先定训练计划）');
  }
  let sessions = plan.sessions;
  if (opts.dateISO !== undefined || opts.week !== undefined || opts.weekOffset !== undefined) {
    const start = plan.config?.start_date ?? null;
    if (!start) throw new CalorieRenderError('bad-input', '计划缺开始日期，无法定位周次');
    let week: number;
    let dow: number | null = null;
    if (opts.dateISO !== undefined) {
      const w = weekOfDate(start, opts.dateISO);
      week = w.week;
      dow = w.dow;
    } else if (opts.week !== undefined) {
      week = opts.week;
    } else {
      week = weekOfDate(start, opts.anchorISO ?? start).week + (opts.weekOffset ?? 0);
    }
    sessions = sessions.filter((s) => s.week_number === week && (dow === null || s.day_of_week === dow));
  }
  if (opts.movement !== undefined && opts.movement !== '') {
    const q = opts.movement;
    sessions = sessions.filter((s) =>
      (s.movements ?? []).some((m) => typeof m.name === 'string' && (m.name.includes(q) || q.includes(m.name))),
    );
  }
  let movements = 0;
  for (const s of sessions) movements += Array.isArray(s.movements) ? s.movements.length : 0;
  return {
    title: plan.config?.title ?? null,
    version: plan.config?.version ?? null,
    startDate: plan.config?.start_date ?? null,
    totalWeeks: plan.config?.total_weeks ?? null,
    sessions,
    totalSessions: sessions.length,
    totalMovements: movements,
  };
}

export interface PlanVsActualDay {
  date: string;
  planned: string[];
  logged: string[];
  missed: string[];
  extra: string[];
}

export interface PlanVsActualView {
  start: string;
  end: string;
  plannedCount: number;
  doneCount: number;
  completionRate: number | null;
  days: PlanVsActualDay[];
}

/** 计划 vs 实际（口径唯一处）：同窗内，计划动作名与当日运动记录 `exercise_type` 双向包含即算命中；
 * 范围超过 92 天拒收（逐日展开，防无界计算）。 */
export function buildPlanVsActualView(
  db: DatabaseSync,
  range: { start: string; end: string },
): PlanVsActualView {
  const plan = getPlan(db);
  if (!plan.config && plan.sessions.length === 0) {
    throw new CalorieRenderError('missing-data', '无训练计划（先定训练计划）');
  }
  const start0 = plan.config?.start_date ?? null;
  if (!start0) throw new CalorieRenderError('bad-input', '计划缺开始日期，无法定位周次');
  const toDay = (s: string): number => Date.parse(s + 'T12:00:00Z');
  const span = Math.round((toDay(range.end) - toDay(range.start)) / 86400000);
  if (span < 0 || span > 92) throw new CalorieRenderError('bad-input', '对比范围须在 92 天内');
  const loggedByDate = new Map<string, string[]>();
  for (const r of listWindow(db, range.start, range.end)) {
    const d = typeof r.date === 'string' ? r.date : null;
    const t = typeof r.exercise_type === 'string' ? r.exercise_type : null;
    if (!d || !t) continue;
    if (!loggedByDate.has(d)) loggedByDate.set(d, []);
    (loggedByDate.get(d) as string[]).push(t);
  }
  const days: PlanVsActualDay[] = [];
  let plannedCount = 0;
  let doneCount = 0;
  for (let i = 0; i <= span; i += 1) {
    const d = new Date(toDay(range.start) + i * 86400000).toISOString().slice(0, 10);
    const { week, dow } = weekOfDate(start0, d);
    const planned = plan.sessions
      .filter((s) => s.week_number === week && s.day_of_week === dow)
      .flatMap((s) => (s.movements ?? []).map((m) => m.name).filter((n): n is string => typeof n === 'string' && n !== ''));
    const logged = loggedByDate.get(d) ?? [];
    const hit = (name: string): boolean => logged.some((t) => t.includes(name) || name.includes(t));
    const missed = planned.filter((n) => !hit(n));
    const extra = logged.filter((t) => !planned.some((n) => t.includes(n) || n.includes(t)));
    plannedCount += planned.length;
    doneCount += planned.length - missed.length;
    days.push({ date: d, planned, logged, missed, extra });
  }
  return {
    start: range.start,
    end: range.end,
    plannedCount,
    doneCount,
    completionRate: plannedCount === 0 ? null : Math.round((doneCount / plannedCount) * 1000) / 10,
    days,
  };
}

export interface PlanWizardView {
  errors: string[];
  warnings: string[];
  errorCount: number;
  warningCount: number;
  /** G15 #102 · 已检查计数（输入计划含的会话数；≠通过数：坏计划也计 N，通过与否看 errorCount；未写库） */
  checkedSessions: number;
  dryRun: true;
}

export function buildPlanWizardView(plan: unknown, catalog?: unknown): PlanWizardView {
  if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) {
    throw new CalorieRenderError('bad-input', 'plan 必填（PlanInput 对象，含 weeks 数组）');
  }
  const p = plan as PlanInput;
  if (!Array.isArray((p as { weeks?: unknown }).weeks)) {
    throw new CalorieRenderError('bad-input', 'plan.weeks 必填数组');
  }
  let cats: Iterable<string> | undefined;
  if (catalog !== undefined && catalog !== null) {
    if (!Array.isArray(catalog) || !(catalog as unknown[]).every((x) => typeof x === 'string')) {
      throw new CalorieRenderError('bad-input', 'catalog 须为字符串数组');
    }
    cats = catalog as string[];
  }
  const { errors, warnings } = validatePlan(p, cats ? { catalog: cats } : {});
  // G15 #102 · 诚实计数：只统计输入含的会话数，不触库（已检查≠已通过：坏计划也计 N；原 insertedCount: 0 恒零且暗示已落库）。
  let checkedSessions = 0;
  for (const week of p.weeks ?? []) for (const day of week.days ?? []) checkedSessions += (day.sessions ?? []).length;
  return { errors, warnings, errorCount: errors.length, warningCount: warnings.length, checkedSessions, dryRun: true };
}

export interface ExerciseGoalView {
  start: string;
  end: string;
  days: number;
  dailyGoal: number;
  goalTotal: number;
  actual: number;
  pct: number | null;
  gap: number;
  achieved: boolean;
}

export function buildExerciseGoalView(db: DatabaseSync, start: string, end: string): ExerciseGoalView {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  const row = db.prepare('SELECT exercise_goal FROM daily_goal WHERE id = 1').get() as
    | { exercise_goal: number | null }
    | undefined;
  const daily = row?.exercise_goal ?? null;
  if (daily === null || daily === undefined) {
    throw new CalorieRenderError('missing-data', '未设运动目标（daily_goal.exercise_goal 缺失，先维护运动目标）');
  }
  if (!Number.isFinite(daily) || daily <= 0) {
    throw new CalorieRenderError('missing-data', '运动目标非法（须正数）：' + String(daily));
  }
  let review: { totalBurned: number };
  try {
    review = buildExerciseReview(db, start, end);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  const days = Math.round((Date.parse(end + 'T12:00:00Z') - Date.parse(start + 'T12:00:00Z')) / 86400000) + 1;
  const goalTotal = daily * days;
  const actual = review.totalBurned;
  const pct = goalTotal > 0 ? Math.round((actual / goalTotal) * 10000) / 100 : null;
  return { start, end, days, dailyGoal: daily, goalTotal, actual, pct, gap: Math.round((actual - goalTotal) * 100) / 100, achieved: actual >= goalTotal };
}
