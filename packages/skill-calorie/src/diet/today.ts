/** 饮食能力的子功能「看饮食」（HELP 场景 02「饮食」下一级 diet_3）：今日饮食／今日饮水。
 *
 * #315 纯搬迁：两个处理体**逐字搬自** `src/cli/cmd_read.ts` 的对应 `case`（语义不动，只换住处）。
 * 取数走 `fetch/diet.ts`、装配走 `render/diet.ts`／`render/dietDocs.ts`／`diet/nutritionPort(Docs).ts`、
 * 配比算式走 `diet/dietEngine.ts` 的公开接口——本件不重写任何别人的算式。
 * 两条声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { dietMacroRatio } from './dietEngine.js';
import { todayISO } from '../analysis/utils.js';
import { listMeals } from '../fetch/diet.js';
import { buildDietOverview, buildMealDistribution } from '../render/diet.js';
import { buildTodayDietDoc } from '../render/dietDocs.js';
import { CalorieRenderError } from '../render/errors.js';
import { buildTodayWaterView } from './nutritionPort.js';
import { buildTodayWaterDoc } from './nutritionPortDocs.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { assertISO, dayField, latestFoodDate, nums, windowRange } from '../shared/params.js';

/** `calorie.today` · 今日饮食。 */
export function viewToday(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const date = windowRange(params)?.end ?? dayField(params, 'date') ?? latestFoodDate(db) ?? todayISO();
  assertISO(date, 'date');
  const rows = listMeals(db, date).filter((r) => r.food_name !== '💧水');
  if (rows.length === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + date + '）');
  const items = rows.map((r) => ({ id: r.id, date: r.date, time: r.time, food_name: r.food_name, grams: r.grams, calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat }));
  const o = buildDietOverview(db, date, date);
  const dist = buildMealDistribution(db, date);
  // #108 · 今日饮食全文档（餐次进度＋营养配比＋今日明细；配比无数据即 skip，不编数）。
  const mt = dietMacroRatio(db, date, date);
  return { data: { items, total: items.length }, html: buildTodayDietDoc({ overview: o, dist, meals: rows, macro: mt.status === 'ok' ? (mt.data ?? null) : null }) };
}

/** `calorie.view.today-water` · 今日饮水。 */
export function viewTodayWater(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const date = windowRange(params)?.end ?? dayField(params, 'date') ?? latestFoodDate(db) ?? todayISO();
  assertISO(date, 'date');
  const v = buildTodayWaterView(db, date);
  const metrics = nums({
    todayMl: v.todayMl, targetMl: v.targetMl, pct: v.pct, remainMl: v.remainMl, cups: v.cups.length,
  });
  return { data: { metrics }, html: buildTodayWaterDoc(v) };
}
