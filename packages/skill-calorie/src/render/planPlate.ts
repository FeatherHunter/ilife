/** #41 · 训练计划读链 render 数据（计划看/构建向导/运动目标视图）。
 *
 * 数据源全复用既有取数层：
 * 计划看=fetch/plan.getPlan（无配置且无会话即 missing）；
 * 构建向导=fetch/plan.validatePlan 纯校验 dryRun（不写库，写链归 #40）；
 * 运动目标= daily_goal.exercise_goal（日耗目标，未设即 missing）+ analysis/exerciseReview。
 * 缺失阻断不返空；plan JSON 非法走 bad-input。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getPlan, validatePlan } from '../fetch/plan.js';
import type { PlanInput, PlanSessionRow } from '../fetch/plan.js';
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
  totalWeeks: number | null;
  sessions: PlanSessionRow[];
  totalSessions: number;
  totalMovements: number;
}

export function buildPlanView(db: DatabaseSync): PlanView {
  const plan = getPlan(db);
  if (!plan.config && plan.sessions.length === 0) {
    throw new CalorieRenderError('missing-data', '无训练计划（先定训练计划）');
  }
  let movements = 0;
  for (const s of plan.sessions) movements += Array.isArray(s.movements) ? s.movements.length : 0;
  return {
    title: plan.config?.title ?? null,
    totalWeeks: plan.config?.total_weeks ?? null,
    sessions: plan.sessions,
    totalSessions: plan.sessions.length,
    totalMovements: movements,
  };
}

export interface PlanWizardView {
  errors: string[];
  warnings: string[];
  errorCount: number;
  warningCount: number;
  insertedCount: number;
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
  return { errors, warnings, errorCount: errors.length, warningCount: warnings.length, insertedCount: 0, dryRun: true };
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
