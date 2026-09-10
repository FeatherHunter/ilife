/** T4 #23 · nutrition_goal 取数+写数（对照老家 scripts/nutrition_goal.py）。
 *
 * 读：getNutritionGoal（无行回 null，老家 Row-or-None 同义）。
 * 写：setNutritionGoal（4 参必填 + 饮水可选 + 自洽 diff 回传，不 print）。
 * 算：recommendNutritionGoal / recommendWaterGoal（纯算式对照；activity 系数与
 * 体重缺省走注入（T5 analysis / T3 weight_log 归属，缺省标记 missing，不静默编造）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from './errors.js';

export interface NutritionGoalRow {
  id: number;
  calorie_goal: number;
  protein_goal: number | null;
  carbs_goal: number | null;
  fat_goal: number | null;
  weight_goal: number | null;
  goal_deadline: string | null;
  water_goal: number | null;
  updated_at: string | null;
}

export interface SetGoalInput {
  calorie: unknown;
  protein: unknown;
  carbs: unknown;
  fat: unknown;
  water?: unknown;
}

export interface SetGoalResult {
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  waterGoal: number | null;
  diffKcal: number;
  consistent: boolean;
}

function toInt(v: unknown, field: string): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isFinite(n)) throw new FetchError(field + '必须是数字');
  return Math.trunc(n);
}

export function getNutritionGoal(db: DatabaseSync): NutritionGoalRow | null {
  const row = db.prepare('SELECT * FROM daily_goal WHERE id = 1').get() as NutritionGoalRow | undefined;
  return row ?? null;
}

export function setNutritionGoal(db: DatabaseSync, input: SetGoalInput): SetGoalResult {
  if (input.protein === undefined || input.carbs === undefined || input.fat === undefined) {
    throw new FetchError('goal 必须 4 个参数全传（热量/蛋白/碳水/脂肪）');
  }
  const calorie = toInt(input.calorie, '热量目标');
  const protein = toInt(input.protein, '蛋白质目标');
  const carbs = toInt(input.carbs, '碳水目标');
  const fat = toInt(input.fat, '脂肪目标');
  if (calorie <= 0) throw new FetchError('热量目标必须为正数');
  if (protein < 0 || carbs < 0 || fat < 0) throw new FetchError('营养目标不能为负数');
  let water: number | null = null;
  if (input.water !== undefined && input.water !== null) {
    water = toInt(input.water, '饮水目标');
    if (water < 0) throw new FetchError('饮水目标不能为负数');
  }
  const diff = protein * 4 + carbs * 4 + fat * 9 - calorie;
  // #127：必须用 UPSERT（仅 SET 传入列），禁止 INSERT OR REPLACE 整行替换。
  // REPLACE 会把未列出的列（water_goal／weight_goal／goal_deadline／goal_paused／
  // exercise_goal／start_weight／start_date）重置为默认/NULL＝用户可见数据丢失。
  // UPSERT：不存在时按列默认插入，存在时只覆盖传入列，其余列逐列保持原值。
  if (water !== null) {
    db.prepare(
      'INSERT INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, updated_at)' +
        ' VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)' +
        ' ON CONFLICT(id) DO UPDATE SET calorie_goal = excluded.calorie_goal,' +
        ' protein_goal = excluded.protein_goal, carbs_goal = excluded.carbs_goal,' +
        ' fat_goal = excluded.fat_goal, water_goal = excluded.water_goal,' +
        ' updated_at = CURRENT_TIMESTAMP',
    ).run(calorie, protein, carbs, fat, water);
  } else {
    db.prepare(
      'INSERT INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, updated_at)' +
        ' VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)' +
        ' ON CONFLICT(id) DO UPDATE SET calorie_goal = excluded.calorie_goal,' +
        ' protein_goal = excluded.protein_goal, carbs_goal = excluded.carbs_goal,' +
        ' fat_goal = excluded.fat_goal, updated_at = CURRENT_TIMESTAMP',
    ).run(calorie, protein, carbs, fat);
  }
  const row = getNutritionGoal(db);
  return {
    calorieGoal: calorie,
    proteinGoal: protein,
    carbsGoal: carbs,
    fatGoal: fat,
    waterGoal: row?.water_goal ?? water,
    diffKcal: diff,
    consistent: Math.abs(diff) <= 50,
  };
}

export const NUTRI_PROFILES = {
  cut: { calorieAdj: -500, proteinGPerKg: 2.0, waterMlPerKg: 35, fatPct: 0.25 },
  maintain: { calorieAdj: 0, proteinGPerKg: 1.6, waterMlPerKg: 30, fatPct: 0.3 },
  bulk: { calorieAdj: 400, proteinGPerKg: 1.8, waterMlPerKg: 30, fatPct: 0.25 },
} as const;
export type NutriProfile = keyof typeof NUTRI_PROFILES;
export const NUTRI_PROFILE_LABELS: Record<NutriProfile, string> = { cut: '减脂', maintain: '维持', bulk: '增肌' };
export const NUTRI_PROFILE_WEEKLY_RATE: Record<NutriProfile, number> = { cut: 0.5, maintain: 0.0, bulk: 0.4 };

export interface RecommendInput {
  profile?: NutriProfile;
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
  gender?: string | null;
  activityFactor?: number | null;
}

export interface RecommendResult {
  profile: NutriProfile;
  profileLabel: string;
  tdee: number;
  bmr: number;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  waterGoal: number;
  weeklyRateKg: number;
  basis: { weightKg: number; heightCm: number; age: number; gender: string };
  planReasons: string[];
  missing: string[];
  selfCheck: { calculatedKcal: number; diffKcal: number };
}

export function latestWeightKg(db: DatabaseSync): number | null {
  const row = db
    .prepare('SELECT weight_kg FROM weight_log ORDER BY date DESC, id DESC LIMIT 1')
    .get() as { weight_kg: number | null } | undefined;
  return row?.weight_kg ?? null;
}

export function recommendNutritionGoal(db: DatabaseSync, opts: RecommendInput = {}): RecommendResult {
  const profile = opts.profile ?? 'cut';
  const p = NUTRI_PROFILES[profile];
  if (!p) throw new FetchError('profile 非法（cut/maintain/bulk）: ' + String(opts.profile));
  const missing: string[] = [];
  let weight = opts.weightKg ?? latestWeightKg(db);
  const prof = db
    .prepare('SELECT age, gender, height_cm, activity_level FROM user_profile WHERE id = 1')
    .get() as { age: number | null; gender: string | null; height_cm: number | null; activity_level: string | null } | undefined;
  let height = opts.heightCm ?? prof?.height_cm ?? null;
  let age = opts.age ?? prof?.age ?? null;
  let gender = opts.gender ?? prof?.gender ?? null;
  if (!prof) missing.push('年龄', '性别', '身高');
  else {
    if (prof.age === null || prof.age === undefined) missing.push('年龄');
    if (!prof.gender) missing.push('性别');
    if (prof.height_cm === null || prof.height_cm === undefined) missing.push('身高');
  }
  if (weight === null || weight === undefined) missing.push('体重');
  const w = weight ?? 70.0;
  const h = height ?? 175.0;
  const a = age ?? 30;
  const g = gender ?? 'male';
  const factor = opts.activityFactor ?? 1.55;
  const bmr = 10 * w + 6.25 * h - 5 * a + (g === 'male' ? 5 : -161);
  const tdee = bmr * factor;
  const cal = Math.trunc(tdee + p.calorieAdj);
  const protein = Math.trunc(w * p.proteinGPerKg);
  const fat = Math.trunc((cal * p.fatPct) / 9);
  const carbs = Math.max(Math.trunc((cal - protein * 4 - fat * 9) / 4), 0);
  const water = Math.trunc(w * p.waterMlPerKg);
  const calculated = protein * 4 + carbs * 4 + fat * 9;
  const diff = calculated - cal;
  const reasons = [
    NUTRI_PROFILE_LABELS[profile] + '模板：TDEE ' + Math.trunc(tdee) + ' 卡 × 热量调整 ' + (p.calorieAdj >= 0 ? '+' : '') + p.calorieAdj + ' 卡 → 每日 ' + cal + ' 卡',
    '蛋白 ' + protein + ' g（体重 ' + w.toFixed(1) + ' kg × ' + p.proteinGPerKg + ' g/kg）',
    '脂肪 ' + fat + ' g（占热量 ' + Math.trunc(p.fatPct * 100) + '%）· 碳水 ' + carbs + ' g（余量）',
    '饮水 ' + water + ' ml（体重 × ' + p.waterMlPerKg + ' ml/kg）',
    '预计每周减重速率 ' + NUTRI_PROFILE_WEEKLY_RATE[profile].toFixed(1) + ' kg（Δ' + cal + ' - TDEE ' + Math.trunc(tdee) + '）',
  ];
  if (Math.abs(diff) > 50) reasons.push('⚠️ 自洽性校验：宏量换算 ' + calculated + ' 卡，与热量目标差 ' + (diff >= 0 ? '+' : '') + diff + ' 卡（>50 建议复核）');
  return {
    profile,
    profileLabel: NUTRI_PROFILE_LABELS[profile],
    tdee: Math.trunc(tdee),
    bmr: Math.trunc(bmr),
    calorieGoal: cal,
    proteinGoal: protein,
    carbsGoal: carbs,
    fatGoal: fat,
    waterGoal: water,
    weeklyRateKg: NUTRI_PROFILE_WEEKLY_RATE[profile],
    basis: { weightKg: Math.round(w * 10) / 10, heightCm: h, age: a, gender: g },
    planReasons: reasons,
    missing,
    selfCheck: { calculatedKcal: calculated, diffKcal: diff },
  };
}

export interface WaterRecommendInput {
  weightKg?: number | null;
  season?: '夏' | '冬' | null;
  month?: number | null;
}

export function recommendWaterGoal(db: DatabaseSync, opts: WaterRecommendInput = {}): {
  weightKg: number; season: '夏' | '冬'; mlPerKg: number; recommendedWaterMl: number; oldWaterGoal: number | null; basis: string;
} {
  const w = opts.weightKg ?? latestWeightKg(db) ?? 70.0;
  const month = opts.month ?? new Date().getMonth() + 1;
  const season = opts.season ?? (month >= 6 && month <= 9 ? '夏' : '冬');
  const mlPerKg = season === '夏' ? 35 : 30;
  const old = getNutritionGoal(db)?.water_goal ?? null;
  return {
    weightKg: Math.round(w * 10) / 10,
    season,
    mlPerKg,
    recommendedWaterMl: Math.trunc(w * mlPerKg),
    oldWaterGoal: old,
    basis: '体重 ' + w.toFixed(1) + ' kg × ' + mlPerKg + ' ml/kg（' + (season === '夏' ? '夏季偏高' : '冬季常规') + '）',
  };
}

export function updateWaterGoal(db: DatabaseSync, waterGoal: unknown): {
  id: number; updatedAt: string | null; rowsAffected: number; oldWaterGoal: number | null; newWaterGoal: number;
} {
  const water = toInt(waterGoal, '饮水目标');
  if (water < 0) throw new FetchError('饮水目标不能为负数');
  const old = getNutritionGoal(db)?.water_goal ?? null;
  const upd = db
    .prepare('UPDATE daily_goal SET water_goal = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
    .run(water);
  const row = db.prepare('SELECT id, updated_at FROM daily_goal WHERE id = 1').get() as
    | { id: number; updated_at: string | null }
    | undefined;
  return { id: row?.id ?? 1, updatedAt: row?.updated_at ?? null, rowsAffected: Number(upd.changes), oldWaterGoal: old, newWaterGoal: water };
}
