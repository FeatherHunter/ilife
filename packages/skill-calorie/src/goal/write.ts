/** 目标管理（HELP 场景 06「目标管理」· 子功能「定目标」「改目标」）· **写命令入口**。
 *
 * #318 · 从 `src/cli/write.ts` 的 `case 'calorie.goal.*'` 逐条搬出：逻辑一字未动，只换住处。
 * 五条一律 receipt 形；`affectedRows` 仍由 `dispatchWrite` 统一注入（本件不自报）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getNutritionGoal, setNutritionGoal, updateWaterGoal } from '../fetch/nutritionGoal.js';
import { pauseAllGoals, resumeAllGoals, setWeightGoal } from './goalStore.js';
import { CalorieRenderError } from '../render/errors.js';
import { fail, needNum, optNum } from '../shared/params.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { R, out, provided } from '../shared/writeParts.js';

/** `calorie.goal.set` 本次**实际被 SET 的列** → CLI 参数名（正本 §3.4「update 键＝本次实际变更字段」）。
 * 与 `fetch/nutritionGoal.ts` 的两条 UPSERT 同源（#127 已改）：传 `water` 走 6 列
 * （含 `water_goal`），不传则 SQL 里**没有** `water_goal` 列——该列保持原值，
 * **不属本次 SET 的字段**，故不得报 `water`。
 * 记账列 `updated_at` 无 CLI 参数，按 §3.4 不计入摘要。
 * #127：UPSERT 只覆盖传入列，`weight_goal`／`goal_deadline`／`goal_paused`／`start_weight`／
 * `start_date`／`exercise_goal`／未传的 `water_goal` 逐列保持原值（不再整行替换）。 */
const goalSetWrittenFields = (hasWater: boolean): string[] =>
  ['calorie', 'protein', 'carbs', 'fat', ...(hasWater ? ['water'] : [])];

/** `calorie.goal.set` · 定营养目标（四宏量 ＋ 可选饮水；单例 upsert）。 */
export function writeGoalSet(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const calorie = needNum(params, 'calorie');
  const protein = needNum(params, 'protein');
  const carbs = needNum(params, 'carbs');
  const fat = needNum(params, 'fat');
  const water = optNum(params, 'water');
  if (!(calorie > 0)) fail(2, '热量目标必须为正数');
  for (const [k, v] of [['protein', protein], ['carbs', carbs], ['fat', fat]] as const) {
    if (v < 0) fail(2, k + ' 不能为负');
  }
  if (water !== undefined && water < 0) fail(2, 'water 不能为负');
  const had = getNutritionGoal(db) !== null;
  const r = setNutritionGoal(db, { calorie, protein, carbs, fat, water });
  const tail = r.consistent ? ' · 宏量自洽' : ' · ⚠宏量换算差 ' + r.diffKcal + ' 卡（>50 建议复核）';
  return out(R('定营养目标', had ? 'update' : 'create', '已定营养目标：' + r.calorieGoal + ' 卡·蛋白 ' + r.proteinGoal + '·碳水 ' + r.carbsGoal + '·脂肪 ' + r.fatGoal + (r.waterGoal === null ? '' : '·饮水 ' + r.waterGoal) + tail, '定营养目标', 'daily_goal (写库回执)', {
    recordId: 1, ids: [1], idSource: 'singleton', writtenFields: goalSetWrittenFields(water !== undefined),
  }));
}

/** `calorie.goal.water` · 定饮水目标（无营养目标行即阻断，不静默兜底）。 */
export function writeGoalWater(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const water = needNum(params, 'water');
  if (getNutritionGoal(db) === null) throw new CalorieRenderError('missing-data', '尚无营养目标行（先定营养目标）');
  const r = updateWaterGoal(db, water);
  return out(R('定饮水目标', 'update', '已定饮水目标：' + (r.oldWaterGoal ?? '—') + '→' + r.newWaterGoal + ' ml', '定饮水目标', 'daily_goal (写库回执)', {
    recordId: 1, ids: [1], idSource: 'singleton', writtenFields: ['water'], noChange: r.oldWaterGoal === r.newWaterGoal,
  }));
}

/** `calorie.goal.weight` · 定体重目标（目标 kg ＋ 可选截止／起始日／起点体重）。 */
export function writeGoalWeight(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const kg = needNum(params, 'kg');
  if (!(kg > 0) || kg > 500) fail(2, 'kg 须为 0..500');
  const r = setWeightGoal(db, {
    kg, deadline: params['deadline'], startKg: params['startKg'], startDate: params['startDate'],
  });
  return out(R('定体重目标', 'update', '已定体重目标 ' + r.weightGoal + ' kg' + (r.deadline ? '（截止 ' + r.deadline + '）' : '') + (r.startKg !== null ? ' · 起点 ' + r.startKg + ' kg' : ''), '定体重目标', 'daily_goal (写库回执)', {
    recordId: 1, ids: [1], idSource: 'singleton',
    writtenFields: provided(params, ['kg', 'deadline', 'startKg', 'startDate']),
  }));
}

/** `calorie.goal.pause` · 暂停所有目标（记录照常，仅目标暂停）。 */
export function writeGoalPause(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const r = pauseAllGoals(db);
  return out(R('暂停所有目标', 'update', '已暂停所有目标（记录照常，仅目标暂停）', '暂停所有目标', 'daily_goal (写库回执)', {
    recordId: r.id, ids: [r.id], idSource: 'singleton', writtenFields: ['goal_paused'],
  }));
}

/** `calorie.goal.resume` · 重启所有目标（从暂停恢复）。 */
export function writeGoalResume(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const r = resumeAllGoals(db);
  return out(R('重启所有目标', 'update', '已重启所有目标（恢复正常）', '重启所有目标', 'daily_goal (写库回执)', {
    recordId: r.id, ids: [r.id], idSource: 'singleton', writtenFields: ['goal_paused'],
  }));
}
