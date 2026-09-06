/** T1 #20 · kcal 数值公约（对照老家 check_decimal_precision.py）。
 *
 * 老家教训：浮点泄漏 `-141.6550000000002` 曾直达 HTML。公约：库里存原始 REAL，
 * 序列化前必须 round(2)；`isClean` 复刻巡检规则（round(2) 后差 ≤ 1e-9）。
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isClean(n: number): boolean {
  return Math.abs(round2(n) - n) <= 1e-9;
}

/** body_composition.source 白名单（老家 source_constants.py，值冻结）。 */
export const SOURCE_HOME_CALIPER = 'home_caliper' as const;
export const SOURCE_HOSPITAL = 'hospital' as const;
export const SOURCE_GYM = 'gym' as const;
export const SOURCE_CHOICES = [SOURCE_HOME_CALIPER, SOURCE_HOSPITAL, SOURCE_GYM] as const;
export type SourceChoice = (typeof SOURCE_CHOICES)[number];
export const SOURCE_LABELS: Record<SourceChoice, string> = {
  [SOURCE_HOME_CALIPER]: '家测皮褶钳',
  [SOURCE_HOSPITAL]: '医院测',
  [SOURCE_GYM]: '健身房 InBody',
};

/** user_profile.activity_level 值域（老家 #19A：英文字典）。 */
export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

/** exercise_log.category / difficulty 值域（老家 2026-06-29/07-12，与训记对齐）。 */
export const EXERCISE_CATEGORIES = ['有氧', '力量', '柔韧', '日常'] as const;
export const EXERCISE_DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
