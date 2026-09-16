/** #251 · 「定目标」：目标草稿模型（`GoalDraft`）——预检确认页与写后回执页都吃它。
 *
 * 谁在吃：`src/goal/precheck.ts`（写前预检确认页）、`src/goal/modify.ts`（改前→改后对照）。
 *
 * **算式出处＝老技能 `scripts/nutrition_goal.py`／`weight_goal.py`**（#251 取证：
 * `docs/skills/skill-calorie/t251-老技能算式.md`）：BMR 走 Mifflin-St Jeor，热量＝TDEE ＋ 方向调整，
 * 蛋白＝体重×系数、脂肪＝热量×占比、碳水吃余量、饮水＝体重×ml/kg，自洽性看宏量换算与热量目标的差，
 * 体重速率看「缺口 ÷ 剩余天数」。常量与老技能逐值相同（cut −500／maintain 0／bulk +400 一组）。
 *
 * 与老技能**有意不同**的两处（都不是口味问题，是本仓已经裁定过的口径）：
 *   ① **缺项不编数**。老技能在四要素缺失时回落 70 kg／175 cm／30 岁／male 再算（`nutrition_goal.py:204-207`），
 *      只把缺项记进 `missing`；本仓 `analysis/utils.ts` 的 `energyOf` 是这条口径的唯一判据（#176／#177 裁定：
 *      缺一即不出数字）。本文件走 `energyOf`，缺项时 `recommend` 为 `null`——**页面上写「缺×，不算」**。
 *   ② **活动量接真实档位**。老技能 `tdee = bmr * get_activity_factor(activity_level)`；新仓此前写死 1.55、
 *      把库里查到的 `activity_level` 丢掉了。本文件走 `energyOf(activityLevel)`，系数取
 *      `analysis/utils.ts` 的 `TDEE_ACTIVITY_FACTORS` 正本。
 *   ③ **没有截止日就不算速率**。老技能 `days = _days_until(deadline) or 90`（没填就当 90 天，`weight_goal.py`）；
 *      本文件 `daysLeft` 为 `null`、速率一路为 `null`，不编 90 天。起算日取**今天**（老技能取「最新一条体重
 *      记录的日期」，那是它的怪口径，预检页上要算的是「今天离截止还有几天」）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getNutritionGoal, latestWeightKg } from './nutritionGoal.js';
import type { NutritionGoalRow, NutriProfile } from './nutritionGoal.js';
import { NUTRI_PROFILE_LABELS, NUTRI_PROFILE_WEEKLY_RATE, NUTRI_PROFILES } from './nutritionGoal.js';
import { getProfile } from '../fetch/profile.js';
import { energyOf, todayISO } from '../analysis/utils.js';
import type { EnergyResult } from '../analysis/utils.js';

/** 体重速率的安全线（卡/天）：老技能 `weight_goal.py:158-167` 同值，严格大于才算越线。 */
export const WEIGHT_RATE_SAFE_LINE_KCAL = 1000;

/** 一公斤体重折算的热量（卡）：老技能 `weight_goal.py:116-118` 同值。 */
const KCAL_PER_KG = 7700;

/** 推荐出来的营养五项目标 ＋ 依据（不是库内现值——现值在 `GoalDraft.current`）。
 *  数字只在四要素齐备时出现；`energy.tdee === null` 时本对象整体为 `null`。 */
export interface NutritionRecommend {
  readonly calorieGoal: number;
  readonly proteinGoal: number;
  readonly carbsGoal: number;
  readonly fatGoal: number;
  readonly waterGoal: number;
  /** 体质与能耗四件（BMR／TDEE ／系数/体重）——页面上要摆「推荐依据」。 */
  readonly bmr: number;
  readonly tdee: number;
  readonly factor: number;
  readonly weightKg: number;
  /** 本方向的每周速率（kg/周）：老技能是写死常量（`PROFILE_WEEKLY_RATE`），不是算出来的。 */
  readonly weeklyRateKg: number;
  readonly planReasons: string[];
  /** 宏量换算与热量目标的自洽性（|差| > 50 即不自洽）。 */
  readonly selfCheck: { readonly calculatedKcal: number; readonly diffKcal: number; readonly consistent: boolean };
}

/** 体重目标的草稿：目标／起点／起始日／截止日 ＋ 由它们推出来的速率与校验。
 *  没有截止日 → `daysLeft`／速率／校验一律 `null`（不编 90 天）。 */
export interface WeightDraft {
  readonly targetKg: number | null;
  readonly startKg: number | null;
  readonly startDate: string | null;
  readonly deadline: string | null;
  readonly latestKg: number | null;
  /** 还要减／增多少：起点（缺则最近体重）− 目标。 */
  readonly gapKg: number | null;
  /** 今天到截止日的天数；没有截止日即 `null`。 */
  readonly daysLeft: number | null;
  /** 缺口折算的每日热量调整（卡/天）；缺截止日或缺体重即 `null`。 */
  readonly requiredDailyKcal: number | null;
  /** 越线提示；没越线即 `null`。 */
  readonly rateWarning: string | null;
}

/** 目标草稿：库内现值 ＋ 推荐值 ＋ 体重草稿 ＋ 缺项账。三张目标页与两张写后回执都吃这一份。 */
export interface GoalDraft {
  /** 库内现值；从未设过目标即 `null`（页面上写「未设置」，不编 0）。 */
  readonly current: NutritionGoalRow | null;
  readonly profile: NutriProfile | null;
  readonly profileLabel: string | null;
  /** 四要素与活动量的缺项账（`energyOf` 给），顺序照它。 */
  readonly energy: EnergyResult;
  readonly recommend: NutritionRecommend | null;
  readonly weight: WeightDraft;
}

/** 方向白名单：三档（老技能 `PROFILES` 同集）。 */
const PROFILES: readonly NutriProfile[] = ['cut', 'maintain', 'bulk'];

export function isGoalProfile(v: string): v is NutriProfile {
  return (PROFILES as readonly string[]).includes(v);
}

/** 天数差（`to` − `from`，按日）；任一非法即 `null`。 */
function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(from + 'T12:00:00Z');
  const b = Date.parse(to + 'T12:00:00Z');
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

/** 体重草稿：吃「目标 kg ＋ 起点体重 ＋ 起始日 ＋ 截止日 ＋ 库里最新体重」。
 *  起算日取起点体重（含起始日那类词会填）否则取最近体重，二者都没有就只剩一个目标值。 */
export function buildWeightDraft(
  current: NutritionGoalRow | null,
  latestKg: number | null,
  overrides: { targetKg?: number | null; startKg?: number | null; startDate?: string | null; deadline?: string | null } = {},
): WeightDraft {
  const targetKg = overrides.targetKg ?? current?.weight_goal ?? null;
  const deadline = overrides.deadline ?? current?.goal_deadline ?? null;
  const startKg = overrides.startKg ?? null;
  const startDate = overrides.startDate ?? null;
  const base = startKg ?? latestKg;
  const gapKg = targetKg !== null && base !== null ? Math.round((base - targetKg) * 10) / 10 : null;
  const daysLeft = deadline === null ? null : daysBetween(todayISO(), deadline);
  const requiredDailyKcal = gapKg !== null && daysLeft !== null && daysLeft > 0
    ? Math.trunc((gapKg / daysLeft) * KCAL_PER_KG)
    : null;
  const rateWarning = requiredDailyKcal !== null && Math.abs(requiredDailyKcal) > WEIGHT_RATE_SAFE_LINE_KCAL
    ? '按这个截止日算，每天要 ' + (requiredDailyKcal >= 0 ? '减' : '增') + ' ' + Math.abs(requiredDailyKcal)
      + ' 卡（安全线 ±' + WEIGHT_RATE_SAFE_LINE_KCAL + ' 卡/天）——建议把截止日往后放，或把目标调小'
    : null;
  return { targetKg, startKg, startDate, deadline, latestKg, gapKg, daysLeft, requiredDailyKcal, rateWarning };
}

/** 推荐算式（老技能 `nutrition_goal.py:210-232` 逐式重写，缺项口径换成 `energyOf`）。
 *  四要素齐备才出数字；不齐即返 `null`——调用方照 `energy.missing` 写「缺×，不算」。 */
function recommendNutrition(
  energy: EnergyResult,
  weightKg: number,
  profile: NutriProfile,
): NutritionRecommend | null {
  if (energy.bmr === null || energy.tdee === null || energy.factor === null) return null;
  const p = NUTRI_PROFILES[profile];
  const calorieGoal = Math.trunc(energy.tdee + p.calorieAdj);
  const proteinGoal = Math.trunc(weightKg * p.proteinGPerKg);
  const fatGoal = Math.trunc((calorieGoal * p.fatPct) / 9);
  const carbsGoal = Math.max(Math.trunc((calorieGoal - proteinGoal * 4 - fatGoal * 9) / 4), 0);
  const waterGoal = Math.trunc(weightKg * p.waterMlPerKg);
  const calculatedKcal = proteinGoal * 4 + carbsGoal * 4 + fatGoal * 9;
  const diffKcal = calculatedKcal - calorieGoal;
  const label = NUTRI_PROFILE_LABELS[profile];
  const reasons = [
    label + '模板：TDEE ' + energy.tdee + ' 卡 × 热量调整 ' + (p.calorieAdj >= 0 ? '+' : '') + p.calorieAdj
      + ' 卡 → 每日 ' + calorieGoal + ' 卡',
    '蛋白 ' + proteinGoal + ' g（体重 ' + weightKg.toFixed(1) + ' kg × ' + p.proteinGPerKg + ' g/kg）',
    '脂肪 ' + fatGoal + ' g（占热量 ' + Math.trunc(p.fatPct * 100) + '%）· 碳水 ' + carbsGoal + ' g（余量）',
    '饮水 ' + waterGoal + ' ml（体重 × ' + p.waterMlPerKg + ' ml/kg）',
    '预计每周变化 ' + NUTRI_PROFILE_WEEKLY_RATE[profile].toFixed(1) + ' kg（每人不同，按实际体重趋势复核）',
    '活动系数 ×' + energy.factor + '（取档案里的活动量档位，不是默认值）',
  ];
  if (Math.abs(diffKcal) > 50) {
    reasons.push('⚠️ 自洽性校验：宏量换算 ' + calculatedKcal + ' 卡，与热量目标差 '
      + (diffKcal >= 0 ? '+' : '') + diffKcal + ' 卡（>50 建议复核）');
  }
  return {
    calorieGoal, proteinGoal, carbsGoal, fatGoal, waterGoal,
    bmr: energy.bmr, tdee: energy.tdee, factor: energy.factor, weightKg,
    weeklyRateKg: NUTRI_PROFILE_WEEKLY_RATE[profile],
    planReasons: reasons,
    selfCheck: { calculatedKcal, diffKcal, consistent: Math.abs(diffKcal) <= 50 },
  };
}

/** 目标草稿的正本：库内现值 ＋ 方向 ＋ 覆盖值 → 一份页面能直接摆的草稿。
 *  `profile` 为 `null` 时不出推荐（「定营养目标」那类手填词本来就不要推荐）。 */
export function buildGoalDraft(
  db: DatabaseSync,
  opts: { profile?: NutriProfile | null; weight?: { targetKg?: number | null; startKg?: number | null; startDate?: string | null; deadline?: string | null } } = {},
): GoalDraft {
  const current = getNutritionGoal(db);
  const latestKg = latestWeightKg(db);
  const prof = getProfile(db);
  const profile = opts.profile ?? null;
  const weightKg = latestKg;
  const energy = energyOf({
    weightKg,
    heightCm: prof?.height_cm,
    age: prof?.age,
    gender: prof?.gender,
    activityLevel: prof?.activity_level ?? null,
  });
  const recommend = profile !== null && weightKg !== null
    ? recommendNutrition(energy, weightKg, profile)
    : null;
  return {
    current,
    profile,
    profileLabel: profile === null ? null : NUTRI_PROFILE_LABELS[profile],
    energy,
    recommend,
    weight: buildWeightDraft(current, latestKg, opts.weight ?? {}),
  };
}
