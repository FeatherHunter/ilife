/** #41 · 档案读链 render 数据（profile/档案视图，旧 profile 查档案）。
 *
 * 数据源：fetch/profile.getProfile（单例 id=1，无行即 missing）+
 * fetch/nutritionGoal.getNutritionGoal（可选）+ weight_log 最新一条（可选）。
 * 写链（profile.set/activity/update）已由 #40 承接，本票只补看链。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getProfile } from '../fetch/profile.js';
import type { ProfileRow } from '../fetch/profile.js';
import { getNutritionGoal } from '../fetch/nutritionGoal.js';
import type { NutritionGoalRow } from '../fetch/nutritionGoal.js';
import { CalorieRenderError } from './errors.js';

export interface ProfileView {
  profile: ProfileRow;
  nutrition: NutritionGoalRow | null;
  latestWeightKg: number | null;
  hasGoal: boolean;
}

export function buildProfileView(db: DatabaseSync): ProfileView {
  const profile = getProfile(db);
  if (!profile) throw new CalorieRenderError('missing-data', '未设档案（user_profile#1 缺失，先设置档案）');
  const nutrition = getNutritionGoal(db);
  let latest: { weight_kg: number } | undefined;
  try {
    latest = db.prepare('SELECT weight_kg FROM weight_log ORDER BY date DESC, id DESC LIMIT 1').get() as
      | { weight_kg: number }
      | undefined;
  } catch {
    latest = undefined;
  }
  return { profile, nutrition, latestWeightKg: latest?.weight_kg ?? null, hasGoal: nutrition !== null };
}
