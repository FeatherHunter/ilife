/** T5 #24 · 分析共享工具（对照老家 scripts/analysis/_utils.py）。
 *
 * TDEE_ACTIVITY_FACTORS / getActivityFactor 唯一来源（老家 ticket #8）。
 * calcTdee 为纯函数（activityLevel 由调用方从 user_profile 解析后传入）；
 * loadProfileTdee 复刻 series 行为：profile 无体重键 → 体重恒 70.0（老家
 * latest_weight_kg 永不存在，parity 原样保留，不“修复”，T7/T8 周知）。
 */

/** #120 · 软删过滤谓词（唯一来源）：`exercise_log` 软删行（`is_deleted=1`）不计入任何用户可见统计。
 *
 * 与 fetch 层 `listWindow`（`fetch/exercise.ts:280`）同口径；analysis 层 11 处查询统一内联，
 * 避免出现 `is_deleted = 0` 这类漏 NULL 的写法（历史行该列可为 NULL）。
 * 口径依据：`docs/research/t120-softdelete-filter.md`（编排者裁定方向 1）。
 */
export const EX_ALIVE = 'COALESCE(is_deleted, 0) = 0';

/** #126 · 体脂/围度存活谓词（唯一来源）：`body_composition`／`body_measurements`
 * 软删行（`is_deprecated=1`）不计入任何用户可见统计。
 *
 * 与 #120 的 `EX_ALIVE` 同构：两表 `is_deprecated` 列可空（历史行可为 NULL），
 * 故用 `COALESCE` 而非 `is_deprecated = 0`（后者会静默排除 NULL 活行）。
 * 与 `nutrition_products` 口径对齐：该列 `NOT NULL`，`= 0` ≡ `COALESCE(...) = 0`。
 * analysis 层（`series.ts`／`cross.ts`）统一内联本谓词；fetch 层
 * （`fetch/body.ts`）内联同字面（fetch 不反向依赖 analysis，沿 `fetch/exercise.ts`
 * `listWindow` 的内联惯例）。口径依据：`docs/research/t126-deprecated-null.md`。
 */
export const BODY_ALIVE = 'COALESCE(is_deprecated, 0) = 0';

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
