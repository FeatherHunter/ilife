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

/** #177 · 「档案 ＋ 最近体重」的能耗度量入参：四要素 ＋ 活动量档位。
 *  三处数值收 `string | number`（写前页的草稿来自表单，本身就是字符串），本函数自己归一。 */
export interface EnergyParts {
  weightKg: number | string | null | undefined;
  heightCm: number | string | null | undefined;
  age: number | string | null | undefined;
  /** 原始性别（`male`／`female`／`男`／`女`；认不出即视为缺）。 */
  gender: string | number | null | undefined;
  activityLevel?: string | null;
}

/** #177 · 能耗度量：数字只在四要素齐备时出现，缺项照实写在 `missing` 里。 */
export interface EnergyResult {
  /** Mifflin-St Jeor 基础代谢（卡/天，四舍五入）；四要素缺一即 null。 */
  bmr: number | null;
  /** TDEE ＝ BMR × 活动系数（卡/天）；BMR 缺、或缺活动量即 null。 */
  tdee: number | null;
  /** 本档活动系数（`TDEE_ACTIVITY_FACTORS` 正本）；档位缺或认不出即 null。 */
  factor: number | null;
  /** 缺哪几项，按「身高／年龄／性别／体重／活动量」顺序。 */
  missing: string[];
}

/** 性别归一（只认四写法）：认不出回 null——**宁可不给 TDEE 数字，也不拿另一半的公式算一个出来**。
 *  写库那侧的归一正本是 `fetch/profile.normalizeGender`（认不出即抛）；这里要的是**宽容判定**
 *  （认不出＝缺项），故两处契约不同，不合并。 */
function genderOrNull(raw: string | number | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (s === 'male' || s === '男') return 'male';
  if (s === 'female' || s === '女') return 'female';
  return null;
}

/** #177 · BMR／TDEE 的唯一判据：四要素（体重／身高／年龄／性别）缺一即不出数字。
 *
 *  老件 `scripts/render_crud_view.py:60-70` 缺项时回落 30 岁／175 cm／70 kg／male 再算——那正是
 *  #176 裁定要禁的「凭空一个数」；本函数把这条口径收成一处：写前页的活动量五档、写后回执的推荐活动量、
 *  看档案结果页同走它（改这条口径只改这里）。
 *  BMR 本身不取整参与 TDEE（`Math.round(原始 bmr × 系数)`），显示的那个 BMR 是取整后的视图——
 *  与 `calcTdee` 逐值一致（`calcTdee` 是老家口径的回落版本，仍由 `analysis/series.ts:88` 用着）。 */
export function energyOf(parts: EnergyParts): EnergyResult {
  const bodyMissing: string[] = [];
  const heightCm = Number(parts.heightCm);
  const age = Number(parts.age);
  const gender = genderOrNull(parts.gender);
  const weightKg = parts.weightKg === null || parts.weightKg === undefined ? null : Number(parts.weightKg);
  const level = parts.activityLevel === null || parts.activityLevel === undefined ? '' : String(parts.activityLevel).trim();
  const factor = level === '' ? null : (TDEE_ACTIVITY_FACTORS[level.toLowerCase()] ?? null);
  if (!(heightCm > 0)) bodyMissing.push('身高');
  if (!(age > 0)) bodyMissing.push('年龄');
  if (gender === null) bodyMissing.push('性别');
  if (weightKg === null || !(weightKg > 0)) bodyMissing.push('体重');
  // BMR 只要四要素（活动量是 TDEE 才要的那一项）——缺活动量不影响 BMR 出数字。
  const rawBmr = bodyMissing.length === 0
    ? 10 * (weightKg as number) + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161)
    : null;
  const missing = factor === null ? [...bodyMissing, '活动量'] : bodyMissing;
  return {
    bmr: rawBmr === null ? null : Math.round(rawBmr),
    tdee: rawBmr === null || factor === null ? null : Math.round(rawBmr * factor),
    factor,
    missing,
  };
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
