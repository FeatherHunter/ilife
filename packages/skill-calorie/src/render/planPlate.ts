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
  /** 计划说明（`workout_plan_config.description`）；同上。 */
  description: string | null;
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
    description: plan.config?.description ?? null,
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
  /** T351-v11 · 计划结构（计划→周→日→时段→动作）：构建向导要**把计划摊开给人看**，
   *  只报校验条数帮不了「怎么构建」（负责人 2026-09-14 第 3 条：看不到如何帮助用户构建出健身计划）。 */
  tree: WizardTree;
}

/** 构建向导时间线里的一行动作（组数×次数与重量在这里就拼成一句人话，页上不再算）。 */
export interface WizardMovement {
  readonly name: string;
  readonly part: string;
  readonly type: string;
  readonly sets: string;
}

/** 一个时段（老页叫「场次」）：名字 ／ 时段 ／ 是否休息日 ／ 动作。 */
export interface WizardSession {
  readonly label: string;
  readonly time: string;
  readonly rest: boolean;
  readonly moves: readonly WizardMovement[];
}

/** 一天（周几 ＋ 该天的时段）。 */
export interface WizardDay {
  readonly dow: number;
  readonly sessions: readonly WizardSession[];
}

/** 一周（周次 ＋ 该周的天）。 */
export interface WizardWeek {
  readonly week: number;
  readonly days: readonly WizardDay[];
}

/** 计划结构（时间线的五级 ＋ 页眉读数）。 */
export interface WizardTree {
  readonly title: string;
  readonly description: string;
  readonly startDate: string;
  readonly level: string;
  readonly equipment: readonly string[];
  readonly weeks: readonly WizardWeek[];
  readonly totals: { readonly weeks: number; readonly sessions: number; readonly movements: number };
}

/** 组（第 6 级）的一句话：同重复数写「3 组 × 12 次」，逐组不同写「2 组 × 8／10 次」；
 *  重量逐组同一写 `35kg`，逐组不同写 `30／35kg`；没有重量写「自重」。没有组写「—」。 */
function setsPhrase(sets: readonly { reps: number; weight: number; unit: string }[] | undefined): string {
  if (sets === undefined || sets.length === 0) return '—';
  const reps = [...new Set(sets.map((s) => s.reps))];
  const weights = [...new Set(sets.map((s) => s.weight))];
  const load = weights.some((w) => w > 0)
    ? weights.join('／') + (sets[0].unit ?? 'kg')
    : (sets[0].unit === '自重' ? '自重' : '—');
  return sets.length + ' 组 × ' + reps.join('／') + ' 次 · ' + load;
}

/** 输入计划 → 时间线（纯映射，不触库、不校验；校验归 `validatePlan`）。 */
function wizardTreeOf(p: PlanInput): WizardTree {
  const cfg = p.config ?? {};
  const weeks: WizardWeek[] = (p.weeks ?? []).map((w) => ({
    week: typeof w.week_number === 'number' ? w.week_number : 0,
    days: (w.days ?? []).map((d) => ({
      dow: typeof d.day_of_week === 'number' ? d.day_of_week : 0,
      sessions: (d.sessions ?? []).map((s) => ({
        label: s.session_label === undefined || s.session_label === ''
          ? (s.is_rest_day === true ? '休息日' : '训练') : s.session_label,
        time: s.time_start === undefined || s.time_start === null || s.time_start === ''
          ? '' : (s.time_end === undefined || s.time_end === null || s.time_end === '' || s.time_end === s.time_start
            ? s.time_start : s.time_start + '–' + s.time_end),
        rest: s.is_rest_day === true,
        moves: (s.movements ?? []).map((m) => ({
          name: m.name === undefined || m.name === '' ? '（未具名动作）' : m.name,
          part: m.part ?? '',
          type: m.type === 'main' ? '主要' : m.type === 'iso' ? '孤立' : (m.type ?? ''),
          sets: setsPhrase(m.sets),
        })),
      })),
    })),
  }));
  let sessions = 0;
  let movements = 0;
  for (const w of weeks) {
    for (const d of w.days) {
      sessions += d.sessions.length;
      for (const s of d.sessions) movements += s.moves.length;
    }
  }
  return {
    title: cfg.title === undefined || cfg.title === '' ? '未命名计划' : cfg.title,
    description: cfg.description ?? '',
    startDate: cfg.start_date ?? '',
    level: cfg.user_level ?? '',
    equipment: cfg.available_equipment ?? [],
    weeks,
    totals: { weeks: weeks.length, sessions, movements },
  };
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
  return {
    errors, warnings, errorCount: errors.length, warningCount: warnings.length, checkedSessions, dryRun: true,
    tree: wizardTreeOf(p),
  };
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
