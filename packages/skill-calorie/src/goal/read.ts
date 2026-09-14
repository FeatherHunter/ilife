/** 目标管理（HELP 场景 06「目标管理」· 子功能「看目标」）· **读命令入口**。
 *
 * #318 · 从 `src/cli/cmd_read.ts` 的 `case 'calorie.view.goal*'` 逐条搬出：逻辑一字未动，
 * 只换住处（分派层改走 `src/cli/registry.ts` 查表 ⇒ `commands.ts` 的 `run`）。
 * 读命令一律经共用位取口径（`shared/params.ts` 的 `defaultRange`／`nums`／`optNum`／`optStr`），
 * 取数与装配仍住原处（`render/goal.ts`／`goalPlate.ts`／`goalExtra.ts`／`trendDocs.ts`），本件只做入口。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildGoalExpiringView, buildGoalPredictView, buildGoalVsActualView } from './goalExtraPlate.js';
import { buildGoalConfig, buildGoalRecommend, buildGoalStatus, buildGoalWeight } from '../render/goalPlate.js';
import { buildGoalPredictDoc } from '../render/trendDocs.js';
import { buildGoalView } from './goalPlate.js';
import { CalorieRenderError } from '../render/errors.js';
import {
  renderGoalConfigHtml, renderGoalExpiringHtml, renderGoalHtml, renderGoalRecommendHtml,
  renderGoalStatusHtml, renderGoalVsActualHtml,
} from '../render/html.js';
import { dayField, defaultRange, fail, nums, optNum, optStr } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { TRIGGERS } from '../triggers/index.js';
import { execCliFor, routeWakeword } from '../triggers/help-lookup.js';
import { buildGoalPrecheckDoc } from './precheck.js';
import { buildGoalWeightDoc } from './goalWeightDoc.js';
import { buildGoalDraft, isGoalProfile } from './set.js';

/** `calorie.view.goal` · 目标分析（完成度 ＋ 缺口 ＋ 趋势 ＋ 历史）。 */
export function viewGoal(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildGoalView(db, start, end);
  const metrics = nums({
    calorie_goal: v.nutrition.calorie_goal, protein_goal: v.nutrition.protein_goal,
    carbs_goal: v.nutrition.carbs_goal, fat_goal: v.nutrition.fat_goal, water_goal: v.nutrition.water_goal,
    completionPct: v.completionPct, weeklyDeficit: v.deficit.summary.weeklyDeficit,
    predictedLossKg: v.deficit.summary.predictedLossKg, avgDeficit: v.deficit.summary.avgDeficit,
    avgIntake: v.deficit.summary.avgIntake, trendAvg: v.trend.summary.avg,
    completedCount: v.history.completedCount, incompleteCount: v.history.incompleteCount,
  });
  return { data: { metrics }, html: renderGoalHtml(v) };
}

/** `calorie.view.goal-config` · 目标配置（四项目标现值 ＋ 宏量自洽 ＋ 暂停态）。 */
export function viewGoalConfig(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const g = buildGoalConfig(db);
  const metrics = nums({
    calorie_goal: g.nutrition.calorie_goal, protein_goal: g.nutrition.protein_goal,
    carbs_goal: g.nutrition.carbs_goal, fat_goal: g.nutrition.fat_goal, water_goal: g.nutrition.water_goal,
    diffKcal: g.diffKcal, consistent: g.consistent ? 1 : 0, paused: g.paused ? 1 : 0,
  });
  return { data: { metrics }, html: renderGoalConfigHtml(g) };
}

/** `calorie.view.goal-recommend` · 目标推荐（按档案算的推荐值与依据）。 */
export function viewGoalRecommend(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const profile = optStr(params, 'profile') ?? 'cut';
  if (!['cut', 'maintain', 'bulk'].includes(profile)) fail(2, 'profile 非法（cut/maintain/bulk）：' + profile);
  const g = buildGoalRecommend(db, profile);
  const metrics = nums({
    calorieGoal: g.recommend.calorieGoal, proteinGoal: g.recommend.proteinGoal, carbsGoal: g.recommend.carbsGoal,
    fatGoal: g.recommend.fatGoal, waterGoal: g.recommend.waterGoal, tdee: g.recommend.tdee, bmr: g.recommend.bmr,
    weeklyRateKg: g.recommend.weeklyRateKg, weightKg: g.recommend.basis.weightKg,
    recommendedWaterMl: g.water.recommendedWaterMl, mlPerKg: g.water.mlPerKg,
  });
  return { data: { metrics }, html: renderGoalRecommendHtml(g) };
}

/** `calorie.view.goal-status` · 目标状态（暂停态 ＋ 热量／饮水目标）。 */
export function viewGoalStatus(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const g = buildGoalStatus(db);
  const metrics = nums({ paused: g.paused ? 1 : 0, calorie_goal: g.nutrition.calorie_goal, water_goal: g.nutrition.water_goal });
  return { data: { metrics }, html: renderGoalStatusHtml(g) };
}

/** `calorie.view.goal-expiring` · 即将到期的目标（默认 14 天内）。 */
export function viewGoalExpiring(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const withinDays = optNum(params, 'withinDays') ?? optNum(params, 'days') ?? 14;
  const today = dayField(params, 'today') ?? dayField(params, 'date');
  const v = buildGoalExpiringView(db, withinDays as number, today ?? undefined);
  const metrics = nums({ daysLeft: v.daysLeft, withinDays: v.withinDays, expiring: v.expiring ? 1 : 0, weightGoal: v.weightGoal, calorieGoal: v.calorieGoal });
  return { data: { metrics }, html: renderGoalExpiringHtml(v) };
}

/** `calorie.view.goal-predict` · 目标预测达成。
 * #103 G2 · 目标预测需 ≥14 条体重记录（simulate `SIM_MIN_DAYS=14`），7 天默认窗结构性不可达 → 默认 14 天。 */
export function viewGoalPredict(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params, 14);
  const v = buildGoalPredictView(db, start, end);
  const metrics = nums({ targetKg: v.targetKg, current: v.current, daysLeft: v.daysLeft, ratePerWeek: v.ratePerWeek, feasible: v.feasible ? 1 : 0 });
  return { data: { metrics }, html: buildGoalPredictDoc(v) };
}

/** `calorie.view.goal-vs-actual` · 目标对比实际（完成／未完成 ＋ 趋势均值）。 */
export function viewGoalVsActual(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const historyDays = optNum(params, 'historyDays') ?? 30;
  const v = buildGoalVsActualView(db, start, end, historyDays as number);
  const metrics = nums({
    completedCount: v.completedCount, incompleteCount: v.incompleteCount,
    completionPct: v.completionPct, trendAvg: v.trendAvg, calorieGoal: v.calorieGoal,
  });
  return { data: { metrics }, html: renderGoalVsActualHtml(v) };
}

/** `calorie.view.goal-wizard` · 目标预检页（写前确认）。
 * #251 · `profile`（选填）决定算不算推荐，`wake`（选填）决定本页展开哪条写词。 */
export function viewGoalWizard(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const profileRaw = optStr(params, 'profile');
  if (profileRaw !== undefined && !isGoalProfile(profileRaw)) {
    throw new CalorieRenderError('bad-input', 'profile 非法（cut/maintain/bulk）: ' + profileRaw);
  }
  const wakeWord = optStr(params, 'wake') ?? null;
  const draft = buildGoalDraft(db, { profile: profileRaw === undefined ? null : profileRaw });
  const hit = wakeWord === null ? null : TRIGGERS.find((t) => t.wake_word === wakeWord) ?? null;
  const v = {
    wakeWord,
    draft,
    prompt: hit !== null && 'prompt_template' in hit ? String(hit.prompt_template ?? '') : '',
    // 该写词要跑的命令：先取它的可执行路由；三条自动算词今天还没有可执行路由，
    // 回落它自己的 `main_prompt.cli`（那串「先算 → 确认后写」的两段式）——执行接线归 #252。
    command: (wakeWord === null ? '' : routeWakeword(wakeWord)?.cli ?? '')
      || (hit !== null && 'main_prompt' in hit ? hit.main_prompt.cli : '')
      || execCliFor(null, 'calorie-cmd-read calorie.view.goal-wizard'),
  };
  const metrics = nums({
    hasGoal: draft.current === null ? 0 : 1,
    recommendReady: draft.recommend === null ? 0 : 1,
    missingCount: draft.energy.missing.length,
  });
  return { data: { metrics }, html: buildGoalPrecheckDoc(v) };
}

/* ── #320 · 补搬的最后一条读命令（原住 `src/cli/cmd_read.ts` 的老分派 switch） ──────────────── */

/** `calorie.view.goal-weight` · 体重目标（当前体重 vs 目标体重 ＋ 达成差值／有记录天数）。
 *
 *  **原样搬来**：算式仍走 `render/goalPlate.ts::buildGoalWeight`、窗口口径仍走共用位
 *  `defaultRange`／`nums`，本件只承接那一层转调（分派层改走 `cli/registry.ts` 查表 ⇒
 *  `commands.ts` 的 `run`）。
 *  它与本能力既有八条同族（键族 `calorie.view.goal*`），且与写命令 `calorie.goal.weight`
 *  同属「体重目标」这一件事。
 *  #390 整页化：页面装配改走本目录 `goalWeightDoc.ts::buildGoalWeightDoc`
 * （`compare.ts` 同形：KPI＋表＋复制双钮＋结论；旧 `renderGoalWeightHtml` 片段保留，
 *  他票在途不碰）。 */
export function viewGoalWeight(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const g = buildGoalWeight(db, start, end);
  const metrics = nums({ weightGoal: g.weightGoal, latestKg: g.latestKg, deltaKg: g.deltaKg, loggedDays: g.loggedDays });
  const command = 'calorie-cmd-read calorie.view.goal-weight --params \'{"start":"' + start + '","end":"' + end + '"}\'';
  return { data: { metrics }, html: buildGoalWeightDoc(g, command) };
}
