/** T5 #24 · 分析共享工具（对照老家 scripts/analysis/_utils.py）。
 *
 * TDEE_ACTIVITY_FACTORS / getActivityFactor 唯一来源（老家 ticket #8）。
 * calcTdee 为纯函数（activityLevel 由调用方从 user_profile 解析后传入）；
 * loadProfileTdee 复刻 series 行为：profile 无体重键 → 体重恒 70.0（老家
 * latest_weight_kg 永不存在，parity 原样保留，不“修复”，T7/T8 周知）。
 */
import { BODY_ALIVE, EX_ALIVE } from '../shared/alive.js';
import { shiftISODate, todayISO } from '../shared/time.js';
/* #717 批③·谓词归一：两个软删存活谓词的正本上移共用位 `shared/alive.ts`（抓取层也读得到——
   从前「fetch 不反向依赖 analysis」逼出了 45 处内联字面，任一处手滑写成 `= 0` 就静默漏掉 NULL 活行）。
   本件按原名转出，包对外的名字一个不少。
   口径依据：`docs/research/t120-softdelete-filter.md`（裁定方向 1）／`docs/research/t126-deprecated-null.md`。 */
export { BODY_ALIVE, EX_ALIVE };

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

/** #238 · 性别中文说法（唯一来源）：界面自己写「性别（男/女）」，出页就不该回 `male`／`female`。
 *  **只认库内两条归一值**；认不出的原样露出，不猜（写库那侧的归一正本是 `fetch/profile.normalizeGender`，
 *  本表只负责把它翻成人话）。页面层「男的显示值」同 `ACTIVITY_LEVEL_LABELS` 一样只此一处。 */
export const GENDER_LABELS: Record<string, string> = {
  male: '男',
  female: '女',
};

export function getActivityFactor(level?: string | null): number {
  if (!level) return TDEE_ACTIVITY_FACTORS.moderate as number;
  return TDEE_ACTIVITY_FACTORS[String(level).toLowerCase()] ?? (TDEE_ACTIVITY_FACTORS.moderate as number);
}

/** Mifflin-St Jeor 基础代谢（卡/天，**不取整**）——**算式的唯一定义地**。
 *
 *  谁在用：本件自己的 `calcTdee`／`energyOf`，以及三处**逐日 BMR**（`analysis/review.ts` 的理论消耗、
 *  `analysis/reportDocTracked.ts` 的「总消耗随体重变化」曲线、`goal/nutritionGoal.ts` 的目标推荐算式）。
 *  这三处原先各抄一份 `10*w + 6.25*h - 5*a + (male ? 5 : -161)`——#717 批④ 收成一处调用。
 *
 *  **缺项回落交调用方**：本函数只算，不做任何「缺身高就按 175 算」的假设（那属各自的读物口径）。 */
export function mifflinStJeorBmr(
  weightKg: number | null | undefined, heightCm: number | null | undefined,
  age: number | null | undefined, gender: string | null | undefined,
): number {
  const w = Number(weightKg);
  const h = Number(heightCm);
  const a = Number(age);
  const g = String(gender ?? '').trim().toLowerCase();
  const isMale = g === 'male' || g === '男' || g === '';
  return 10 * w + 6.25 * h - 5 * a + (isMale ? 5 : -161);
}

/** \`calcTdee\` 的算式与回落口径（老家 parity）：缺体重／身高即回 1800，缺年龄按 30、缺性别按 male。 */
export function calcTdee(weightKg: number | null | undefined, heightCm: number | null | undefined, age: number | null | undefined, gender: string = 'male', activityLevel?: string | null): number {
  if (!weightKg || !heightCm) return 1800;
  return Math.round(mifflinStJeorBmr(weightKg, heightCm, age ?? 30, gender) * getActivityFactor(activityLevel ?? 'moderate'));
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
    ? mifflinStJeorBmr(weightKg, heightCm, age, gender)
    : null;
  const missing = factor === null ? [...bodyMissing, '活动量'] : bodyMissing;
  return {
    bmr: rawBmr === null ? null : Math.round(rawBmr),
    tdee: rawBmr === null || factor === null ? null : Math.round(rawBmr * factor),
    factor,
    missing,
  };
}

/** 「今天」的**唯一出处**——#717 批③ 起正本住共用位 `shared/time.ts`，本处按原名转出。
 *
 *  #676：`CALORIE_TODAY` 这颗钉子已按「配置文件是唯一真相、环境变量读取全部删除」的裁定（#675）摘掉——
 *  真实时钟是唯一来源，本函数不再读任何环境变量。要钉「今天」改用**钉时钟预载件**
 *  `test/freeze-clock.cjs`（`node --require` 预载 ＋ `FAKE_NOW_ISO`）：它把整个进程的 `Date` 一次盖住，
 *  故共用位那一处（以及原先各自读钟的 `fetch/diet.ts`／`exercise/exerciseStore.ts`／`weight/records.ts`）
 *  同时跟走。
 *  显式锚点（命令参数 `today`）仍优先于它，仍由各命令自行传入 `resolveWindow`。
 *  `shiftISODate`（日期加减）同批收进共用位，本处一并按原名转出。 */
export { shiftISODate, todayISO };

/** YYYYMMDD → YYYY-MM-DD；其他原样（老家 _parse_date 同义）。 */
export function parseDate(s: string | null | undefined): string | null {
  if (s === null || s === undefined) return null;
  const t = String(s).trim();
  if (/^\d{8}$/.test(t)) return t.slice(0, 4) + '-' + t.slice(4, 6) + '-' + t.slice(6, 8);
  return t;
}
