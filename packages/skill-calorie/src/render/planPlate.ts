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
import { todayISO } from '../analysis/utils.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from './errors.js';

function assertDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + 'T12:00:00Z'))) {
    throw new CalorieRenderError('bad-input', '日期非法: ' + String(s));
  }
}

/** #947 · 计划在时间轴上的四态之一（页面按它出页，不再把三态并成一句空态）。
 *
 *  - `ok`   本日／本周有安排（目标日落在计划范围内）；
 *  - `ended`   目标日越过计划末日（起日 ＋ 总周数 × 7 − 1 天）；
 *  - `future`  目标日落在起日之前；
 *  - `empty`   计划配置在、一行场次都没有（**第五态，本票记文档**：真无计划仍走 `missing-data` 阻断）。
 *
 *  为什么不把「本日无课」也列成一态：它是 `ok` ＋ 当天零场次（页面用 `visibleSessions` 判），
 *  与「本日有课」共用同一批可点出口（周次页签与星期页签）。 */
export type PlanState = 'ok' | 'ended' | 'future' | 'empty';

/** 当次过滤的口径（页面据此选卡与文案）：`all` 未过滤；`day`／`week` 按日期或周次；`movement` 按动作名。 */
export type PlanScope = 'all' | 'day' | 'week' | 'movement';

export interface PlanView {
  title: string | null;
  /** 计划版本（`workout_plan_config.version`）；库列为空即 null，页头按缺项不印。 */
  version: string | null;
  /** 计划说明（`workout_plan_config.description`）；同上。 */
  description: string | null;
  /** 计划起始日（`workout_plan_config.start_date`）；同上。 */
  startDate: string | null;
  totalWeeks: number | null;
  /** 本次过滤后要上屏的场次（未过滤＝全量；越界两态＝全量，见下 `planState` 的口径）。 */
  sessions: PlanSessionRow[];
  /** 过滤后的场次数（＝`sessions.length`）。**报文现义保留**：`src/workout/plan.ts` 的
   *  `data.metrics` 与既有冻结用例（`test/scene05-read`／`scene05-write-*`）按「本次取到的场次」读它。 */
  totalSessions: number;
  /** 过滤后的动作数（同上，报文现义保留）。 */
  totalMovements: number;
  /** #947 · 计划时间轴上的态（页面出页的唯一依据）。 */
  planState: PlanState;
  /** 计划首日（＝起日）；缺起日即 null。 */
  planStart: string | null;
  /** 计划末日（＝起日 ＋ 总周数 × 7 − 1 天）；缺起日或缺总周数即 null。 */
  planEnd: string | null;
  /** 页上「本周」指的那一周：显式日期／周次入参优先，否则按今天算（算不出即 null）。 */
  anchorWeek: number | null;
  /** 本次过滤的口径（页面据此决定出哪张卡与哪句空态）。 */
  scope: PlanScope;
  /** 过滤后仍然上屏的场次数（＝`totalSessions`；`scope='all'` 时与 `planSessions` 相等）。 */
  visibleSessions: number;
  /** 过滤后仍然上屏的动作数（＝`totalMovements`）。 */
  visibleMovements: number;
  /** #947 KPI 口径 · **计划全量**场次数（与 `totalWeeks` 同源）：页面「总场次」卡读它。 */
  planSessions: number;
  /** #947 KPI 口径 · **计划全量**动作数（与 `totalWeeks` 同源）：页面「总动作」卡读它。 */
  planMovements: number;
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

const DAY_MS = 86400000;
const planDayMs = (s: string): number => Date.parse(s + 'T12:00:00Z');

/** 计划首日（起日）＋末日（起日 ＋ 总周数 × 7 − 1 天）。缺起日或缺总周数即 null。
 *
 *  末日口径**与 `weekOfDate` 同源**：第 N 周＝起日所在那一周的周一算起第 N 个七天，故最后一天
 *  ＝`start + (totalWeeks × 7 − 1)` 天（不按最后一个有场次的周推——票面遗留出口已裁定按 `total_weeks` 落）。
 *  起日不是周一时，`weekOfDate` 把起日之前那几天也算作第 1 周，本函数与它一致，不另立一套算法。 */
function planBound(
  startDate: string | null, totalWeeks: number | null,
): { start: string | null; end: string | null } {
  if (startDate === null || startDate === '' || totalWeeks === null || !Number.isFinite(totalWeeks) || totalWeeks < 1) {
    return { start: startDate === '' ? null : startDate, end: null };
  }
  const days = Math.floor(totalWeeks) * 7 - 1;
  return { start: startDate, end: new Date(planDayMs(startDate) + days * DAY_MS).toISOString().slice(0, 10) };
}

/** #947 · 目标日 → 四态：落在起日之前＝`future`，越过末日＝`ended`，其余＝`ok`。
 *  缺起日或缺总周数时不判边界（回 `ok`）——那是「计划没标」这一档已有的缺项口径，不是越界。 */
function stateOf(dateISO: string | undefined, bound: { start: string | null; end: string | null }): PlanState {
  if (dateISO === undefined || bound.start === null || bound.end === null) return 'ok';
  if (dateISO < bound.start) return 'future';
  if (dateISO > bound.end) return 'ended';
  return 'ok';
}

/** 当次过滤的口径（与 `buildPlanView` 里那三条过滤分支一一对应）。 */
function scopeOf(opts: PlanFilter): PlanScope {
  if (opts.dateISO !== undefined) return 'day';
  if (opts.week !== undefined || opts.weekOffset !== undefined) return 'week';
  if (opts.movement !== undefined && opts.movement !== '') return 'movement';
  return 'all';
}

/** 动作数（场内 `movements` 数组长度之和）：过滤前／过滤后共用一个算式。 */
function movementsOf(sessions: readonly PlanSessionRow[]): number {
  let n = 0;
  for (const s of sessions) n += Array.isArray(s.movements) ? s.movements.length : 0;
  return n;
}

/** 计划里**真排了课的周次**集合（用于判「目标周与计划范围有没有交集」）：空行不算，休息日算。 */
function planWeekNumbers(sessions: readonly PlanSessionRow[]): Set<number> {
  const set = new Set<number>();
  for (const s of sessions) set.add(s.week_number);
  return set;
}

export function buildPlanView(db: DatabaseSync, opts: PlanFilter = {}): PlanView {
  const plan = getPlan(db);
  if (!plan.config && plan.sessions.length === 0) {
    throw new CalorieRenderError('missing-data', '无训练计划（先定训练计划）');
  }
  // ── 全量（与「总周数」同源的那一份）：KPI 三张卡与空态判据都读它，任何过滤都不动它 ──
  const allSessions = plan.sessions;
  const planSessions = allSessions.length;
  const planMovements = movementsOf(allSessions);
  const totalWeeks = plan.config?.total_weeks ?? null;
  const startDate = plan.config?.start_date ?? null;
  const bound = planBound(startDate, totalWeeks);
  // `date` 走两条路：入参里的真日期（页面四态看的那个日子）与「今天」（只看边界与「本周」用）。
  const today = todayISO();
  const planStart = bound.start;
  // `weekOfDate` 的周次是**从起日那一周的周一**数起；起日之前的日子会算出 <=0 的周次（那是 `future` 态，
  // 页上只在本页签兜底选第 1 周那一枚上见得到）。
  const weekOf = (d: string): number | null =>
    (planStart === null || planStart === '' ? null : weekOfDate(planStart, d).week);
  const todayWeek = weekOf(today);
  const planEnd = bound.end;

  let sessions = allSessions;
  // 目标日算出的周次（`date`／`week`／`weekOffset` 三路共用）：越界两态要靠它判「这一周在不在计划里」。
  let targetWeek: number | null = null;
  if (opts.dateISO !== undefined || opts.week !== undefined || opts.weekOffset !== undefined) {
    if (planStart === null) throw new CalorieRenderError('bad-input', '计划缺开始日期，无法定位周次');
    let week: number;
    let dow: number | null = null;
    if (opts.dateISO !== undefined) {
      const w = weekOfDate(planStart, opts.dateISO);
      week = w.week;
      dow = w.dow;
    } else if (opts.week !== undefined) {
      week = opts.week;
    } else {
      week = weekOfDate(planStart, opts.anchorISO ?? planStart).week + (opts.weekOffset ?? 0);
    }
    targetWeek = week;
    sessions = sessions.filter((s) => s.week_number === week && (dow === null || s.day_of_week === dow));
  }
  if (opts.movement !== undefined && opts.movement !== '') {
    const q = opts.movement;
    sessions = sessions.filter((s) =>
      (s.movements ?? []).some((m) => typeof m.name === 'string' && (m.name.includes(q) || q.includes(m.name))),
    );
  }
  const scope = scopeOf(opts);
  // #947 · 四态出口：`empty`＝配置在但一行场次都没有（真无计划仍由上面那条 `missing-data` 挡住）。
  // 这一态下页面不出周区块（没有周可出），只出空态指引。
  const planState: PlanState = planSessions === 0 ? 'empty' : stateOf(opts.dateISO, bound);
  // **本次过滤真读到多少**（过滤结果原样，一行不减）：页面「本周」卡读它——卡片报的是「这个日子／这一周
  // 取到几场」，不能拿下面那份「为保住出口而上屏的周」冒充。
  const matchedSessions = sessions.length;
  const matchedMovements = movementsOf(sessions);
  // #947 · 「上屏的那几周」（票面故障 4 的根因就在这一句上）。**只对「按目标日看」这一路生效**
  // （`opts.dateISO` 给了才判）：那一路上「目标日落在计划范围外」才有意义——照过滤结果出页就只能出空态，
  // **周区块（＝换一周／换一天看的页签）连同它一起消失**，那正是票面点名的现场。两档处置：
  //   · 目标日越过计划范围（`ended`／`future`）⇒ 回**全量**：整份计划的周区块铺满，页签都点得到；
  //   · 目标日在范围内、但**那一天**没课（`day` 档读 0 行）⇒ 上屏**目标日所在那一周**的全周场次
  //     （星期页签正是为它而设；否则「点上面的周一…周日换一天看」又是一句许诺不兑现的空话）。
  // 其余路（`week`／`weekOffset` 的周窗、`movement` 的按动作看）**一律不动**：那是用户明确圈的窗，
  // 窗外为空就照实空着——既有冻结用例（`test/scene05-read` 的「看上周计划」＝0 场）钉的正是这个口径。
  if (opts.dateISO !== undefined) {
    if (planState !== 'ok') {
      sessions = allSessions;
    } else if (scope === 'day' && matchedSessions === 0 && targetWeek !== null
      && planWeekNumbers(allSessions).has(targetWeek)) {
      sessions = allSessions.filter((s) => s.week_number === targetWeek);
    }
  }
  // 「本周」指哪一周：显式日期优先，其次显式周次，再次今天（越界态下它落在计划外，卡上照实报 0）。
  const anchorWeek = opts.dateISO !== undefined
    ? weekOf(opts.dateISO) : (opts.week !== undefined ? opts.week : todayWeek);
  const visibleMovements = movementsOf(sessions);
  return {
    title: plan.config?.title ?? null,
    version: plan.config?.version ?? null,
    description: plan.config?.description ?? null,
    startDate,
    totalWeeks,
    sessions,
    totalSessions: sessions.length,
    totalMovements: visibleMovements,
    planState,
    planStart,
    planEnd,
    anchorWeek,
    scope,
    visibleSessions: matchedSessions,
    visibleMovements: matchedMovements,
    planSessions,
    planMovements,
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

/** 组（第 6 级）的那句话：同重复数写「3 组 × 12 次」，逐组不同写「2 组 × 8／10 次」；
 *  重量逐组同一写 `35kg`，逐组不同写 `30／35kg`；没有重量写「自重」。没有组写「—」。
 *  **重量落成一颗小标签**（`ilw-tag`）：原来写成 `3 组 × 12 次 · 35kg`，那个 `·` 又是拿符号顶替设计
 *  （负责人第 ⑤ 条）——组数×次数是一件事、负重是另一件事，两个元素各就各位。
 *  这条只在**有 sets 的计划**上才看得见，37 份夹具的向导用例 sets 为空，故判据没走到（大号用例才暴露）。 */
function setsPhrase(sets: readonly { reps: number; weight: number; unit: string }[] | undefined): string {
  if (sets === undefined || sets.length === 0) return '—';
  const reps = [...new Set(sets.map((s) => s.reps))];
  const weights = [...new Set(sets.map((s) => s.weight))];
  const load = weights.some((w) => w > 0)
    ? weights.join('／') + (sets[0].unit ?? 'kg')
    : (sets[0].unit === '自重' ? '自重' : '');
  const counts = sets.length + ' 组 × ' + reps.join('／') + ' 次';
  return load === '' ? counts : counts + ' <span class="ilw-tag">' + load + '</span>';
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
    throw new CalorieRenderError('missing-data', '未设运动目标（daily_goal.exercise_goal 缺失，先维护运动目标，下一步跑 calorie-cmd-read calorie.goal.exercise --params \'{"goal":300}\'）');
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
