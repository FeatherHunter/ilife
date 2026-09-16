/** 看运动（vs 目标）（HELP 场景 04「运动」下一级 · 看运动）：`calorie.view.exercise-goal` 读命令。
 *
 * #316 搬迁：处理函数逐字取自 `src/cli/cmd_read.ts` 的 `case 'calorie.view.exercise-goal'` 分支——
 * **纯搬迁，行为不变**。取数与页面装配走既有的 `render/planPlate.ts`／`render/sportDocs.ts`。
 *
 * #622 · 无目标分支：目标现值经目标能力的公开接口 `goal/nutritionGoal.ts::getNutritionGoal`
 * 读（不在本目录重写目标 SQL 与算式）；有目标直出终页不变（仍走 `buildExerciseGoalView`，
 * 产物与现形状逐字节同口径）；无目标且窗内有运动记录时出本目录的预检确认页
 * （过程型 HTML，不画空环）；无目标且窗内也无记录时仍走原链抛同一条缺失阻断
 * （保空库档的阻断口径不变）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getNutritionGoal } from '../goal/nutritionGoal.js';
import { buildExerciseGoalView } from '../render/planPlate.js';
import { buildExerciseGoalDoc } from '../render/sportDocs.js';
import { defaultRange, nums, optStr } from '../shared/params.js';
import { commandLine } from '../shared/writeParts.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { listWindow } from './exerciseStore.js';
import { buildExerciseGoalPrecheckDoc, exerciseGoalWriteExample } from './precheck.js';

/** `calorie.view.exercise-goal` · 运动目标视图：目标／实际／完成度／差额。 */
export function viewExerciseGoal(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const row = getNutritionGoal(db);
  const raw = (row as unknown as Record<string, unknown> | null)?.['exercise_goal'] ?? null;
  const daily = typeof raw === 'number' ? raw : null;
  const hasGoal = daily !== null && Number.isFinite(daily) && daily > 0;
  if (hasGoal) {
    const v = buildExerciseGoalView(db, start, end);
    const metrics = nums({ dailyGoal: v.dailyGoal, goalTotal: v.goalTotal, actual: v.actual, pct: v.pct, gap: v.gap, achieved: v.achieved ? 1 : 0, days: v.days });
    return { data: { metrics }, html: buildExerciseGoalDoc(v) };
  }
  let hasExercise = false;
  try {
    hasExercise = listWindow(db, start, end).length > 0;
  } catch {
    hasExercise = false;
  }
  if (!hasExercise) {
    const v = buildExerciseGoalView(db, start, end);
    const metrics = nums({ dailyGoal: v.dailyGoal, goalTotal: v.goalTotal, actual: v.actual, pct: v.pct, gap: v.gap, achieved: v.achieved ? 1 : 0, days: v.days });
    return { data: { metrics }, html: buildExerciseGoalDoc(v) };
  }
  const windowParam = optStr(params, 'window');
  const windowLabel = windowParam ?? (start === end ? '今日' : '自定义');
  const wakeWord = windowParam === undefined || windowParam === 'custom' ? null : windowLabel === '本周' ? '看本周运动（vs 目标）' : '看今日运动（vs 目标）';
  const days = Math.round((Date.parse(end + 'T12:00:00Z') - Date.parse(start + 'T12:00:00Z')) / 86400000) + 1;
  const viewCommand = windowLabel === '本周' || windowLabel === '今日'
    ? commandLine('calorie.view.exercise-goal', { window: windowLabel })
    : commandLine('calorie.view.exercise-goal', { start, end });
  const html = buildExerciseGoalPrecheckDoc({
    wakeWord, windowLabel, start, end, days,
    command: viewCommand, writeCommand: exerciseGoalWriteExample(),
  });
  const metrics = nums({ hasGoal: 0, precheck: 1, days });
  return { data: { metrics }, html };
}
