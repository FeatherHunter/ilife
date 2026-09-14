/** #393 · 今日饮食页装配（`calorie.today`，today_diet.html 对照）。
 *
 * 原地搬自 `src/render/dietDocs.ts`：本票只换住处，函数体与注释原样照抄，产物逐字节不变。
 * 服务页面类：② 条目列表页。
 */
import { renderChartBlock, renderKpiGrid, renderDataTable } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { inferMealType } from '../fetch/diet.js';
import type { DietMealRow } from '../render/dietDocs.js';
import type { MacroRatio } from './dietEngine.js';
import type { DietOverview, MealDistribution } from '../render/diet.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·饮食';

const MEAL_NOTE = '窗口跟 MEAL_WINDOWS · 加餐=下午茶+夜宵';

/* ── 今日饮食（today_diet.html 对照：餐次进度＋营养配比＋今日明细） ── */

export interface TodayDietDocInput {
  overview: DietOverview;
  dist: MealDistribution;
  meals: DietMealRow[];
  macro: MacroRatio | null;
}

export function buildTodayDietDoc(input: TodayDietDocInput): string {
  const { overview: o, dist, meals, macro } = input;
  const names = new Set(meals.map((m) => m.food_name));
  const kpis = renderKpiGrid([
    { label: '当日摄入', value: String(o.totalCalories), unit: '卡', detail: '目标 ' + o.calorieGoal + ' 卡' },
    { label: '餐数', value: String(meals.length), unit: '条', detail: names.size + ' 个品种' },
    { label: '热量目标', value: String(o.calorieGoal), unit: '卡', detail: '剩余 ' + (o.calorieGoal - o.totalCalories) + ' 卡' },
    { label: '餐别覆盖', value: dist.slices.filter((s) => s.count > 0).length + '/' + dist.slices.length, detail: MEAL_NOTE },
  ]);
  const parts: string[] = [kpis];
  let charts = false;
  if (dist.totalCalories > 0) {
    parts.push(renderChartBlock({
      kind: 'bar',
      title: '餐别热量占比',
      input: { items: dist.slices.map((s) => ({ label: s.meal, value: s.calories })) },
    }));
    charts = true;
  }
  if (macro && (macro.protein || macro.carb || macro.fat)) {
    parts.push(renderChartBlock({
      kind: 'donut',
      title: '营养配比',
      input: {
        items: [
          { label: '蛋白', value: macro.protein ? macro.protein.pct : 0 },
          { label: '碳水', value: macro.carb ? macro.carb.pct : 0 },
          { label: '脂肪', value: macro.fat ? macro.fat.pct : 0 },
        ],
        options: { showPercent: true },
      },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'time', label: '时间' },
      { key: 'meal', label: '餐别' },
      { key: 'food', label: '食物' },
      { key: 'grams', label: '克数', align: 'right' },
      { key: 'cal', label: '热量', align: 'right' },
      { key: 'pro', label: '蛋白', align: 'right' },
      { key: 'carbs', label: '碳水', align: 'right' },
      { key: 'fat', label: '脂肪', align: 'right' },
    ],
    rows: meals.map((m) => ({
      time: m.time ?? '', meal: inferMealType(String(m.time ?? '')), food: m.food_name,
      grams: m.grams, cal: m.calories, pro: m.protein, carbs: m.carbs, fat: m.fat,
    })),
    caption: '今日明细（' + o.start + '，共 ' + meals.length + ' 条）',
    emptyText: '本日无明细',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.today',
      data: {
        items: meals.map((m) => ({
          date: m.date, time: m.time, food_name: m.food_name, grams: m.grams,
          calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat,
        })),
        total: meals.length,
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '今日饮食 ' + o.start,
    eyebrow: 'calorie.today · 饮食域',
    subtitle: MEAL_NOTE,
    content: parts.join(''),
    charts,
  });
}
