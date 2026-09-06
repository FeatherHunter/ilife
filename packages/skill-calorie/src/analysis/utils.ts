/** T5 #24 · 分析共享工具（对照老家 scripts/analysis/_utils.py）。
 *
 * TDEE_ACTIVITY_FACTORS / getActivityFactor 唯一来源（老家 ticket #8）。
 * calcTdee 为纯函数（activityLevel 由调用方从 user_profile 解析后传入）；
 * loadProfileTdee 复刻 series 行为：profile 无体重键 → 体重恒 70.0（老家
 * latest_weight_kg 永不存在，parity 原样保留，不“修复”，T7/T8 周知）。
 */

export const TDEE_ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  sedentary: '久坐',
  light: '轻度活动',
  moderate: '中度活动',
  active: '活跃',
  very_active: '高度活跃',
};

export function getActivityFactor(level?: string | null): number {
  if (!level) return TDEE_ACTIVITY_FACTORS.moderate as number;
  return TDEE_ACTIVITY_FACTORS[String(level).toLowerCase()] ?? (TDEE_ACTIVITY_FACTORS.moderate as number);
}

/** Mifflin-St Jeor BMR × 系数（运动消耗另计，不在此）。缺体型回 1800。 */
export function calcTdee(weightKg: number | null | undefined, heightCm: number | null | undefined, age: number | null | undefined, gender: string = 'male', activityLevel?: string | null): number {
  if (!weightKg || !heightCm) return 1800;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * (age ?? 30) + (gender === 'male' ? 5 : -161);
  return Math.round(bmr * getActivityFactor(activityLevel ?? 'moderate'));
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function shiftISODate(iso: string, deltaDays: number): string {
  const t = Date.parse(iso + 'T12:00:00Z');
  if (Number.isNaN(t)) throw new Error('[calorie] 日期非法: ' + iso);
  return new Date(t + deltaDays * 86400000).toISOString().slice(0, 10);
}

/** YYYYMMDD → YYYY-MM-DD；其他原样（老家 _parse_date 同义）。 */
export function parseDate(s: string | null | undefined): string | null {
  if (s === null || s === undefined) return null;
  const t = String(s).trim();
  if (/^\d{8}$/.test(t)) return t.slice(0, 4) + '-' + t.slice(4, 6) + '-' + t.slice(6, 8);
  return t;
}
