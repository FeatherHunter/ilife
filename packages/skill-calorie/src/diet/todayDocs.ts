/** #393 · 今日饮食页装配（`calorie.today`，today_diet.html 对照）。
 *
 * 原地搬自 `src/render/dietDocs.ts`：本票只换住处，函数体与注释原样照抄，产物逐字节不变。
 * 服务页面类：② 条目列表页。
 */
import { renderCaliberLine, renderChartBlock, renderEmptyBlock, renderKpiGrid, renderDataTable } from 'base-paint/blocks';
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

/** 餐别口径一行（正文里说一次的版本，不带常量名；口径出处见 `render/dietDocs.ts` 的 `MEAL_NOTE`）。 */
const MEAL_NOTE = '加餐时段：下午茶、夜宵';

/* ── 今日饮食（today_diet.html 对照：餐次进度＋营养配比＋今日明细） ── */

export interface TodayDietDocInput {
  overview: DietOverview;
  dist: MealDistribution;
  meals: DietMealRow[];
  macro: MacroRatio | null;
  /** 只看有备注的那一支（`calorie.today` 的 `hasNote:true`）：标题写明筛选口径，明细多一列「备注」。 */
  hasNote?: boolean;
}

/** #496 · 「只看有备注的」那一页的空态页（`calorie.today` 带 `hasNote:true` 而当天一条备注都没有时）。
 *
 *  这一支不是取数失败：筛「有备注的」筛出 0 条是**正常结果**（这天就是没写备注），不该落
 *  「ERR 4 取数失败（缺失阻断）」把整页顶掉——照 `t425` 裁定 4 出完整空页（标题＋空态句＋
 *  一句「怎么让记录带备注」的引导句），空态不出复制按钮（同 `裁定 5` 的空态口径）。 */
export function buildTodayNoteEmptyDoc(date: string): string {
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '今日饮食 ' + date + ' · 只看有备注的',
    eyebrow: '卡路里 · 饮食',
    subtitle: MEAL_NOTE,
    content: renderEmptyBlock({
      title: '今天没有带备注的记录',
      text: '记的时候带一句备注（例如「午餐 鸡胸 150 克 备注：煎的，少油」），这一页就会出现它。',
    }),
    charts: false,
  });
}

export function buildTodayDietDoc(input: TodayDietDocInput): string {
  const { overview: o, dist, meals, macro } = input;
  const onlyNote = input.hasNote === true;
  const names = new Set(meals.map((m) => m.food_name));
  const kpis = renderKpiGrid([
    { label: '当日摄入', value: String(o.totalCalories), unit: '卡', detail: '目标 ' + o.calorieGoal + ' 卡' },
    { label: '餐数', value: String(meals.length), unit: '条', detail: names.size + ' 个品种' },
    { label: '热量目标', value: String(o.calorieGoal), unit: '卡', detail: '剩余 ' + (o.calorieGoal - o.totalCalories) + ' 卡' },
    { label: '餐别覆盖', value: dist.slices.filter((s) => s.count > 0).length + '/' + dist.slices.length },
  ]);
  const parts: string[] = [kpis];
  let charts = false;
  if (dist.totalCalories > 0) {
    parts.push(renderChartBlock({
      /* #496 · 原标题「餐别热量占比」画的是四餐的卡数、也没有百分比（审查件第 69 条）⇒ 改「各餐热量（卡）」。 */
      kind: 'bar',
      title: '各餐热量（卡）',
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
      /* #496 · 「看有备注的饮食记录」这一支原本与普通今日页逐字相同：页名承诺「有备注」、
         明细里却没有备注（审查件第 44、67 条）。这一支补一列备注原文；普通今日页不加这一列
         （那里多数行没备注，多一列空栏）。 */
      ...(onlyNote ? [{ key: 'note', label: '备注' }] : []),
    ],
    rows: meals.map((m) => ({
      time: m.time ?? '', meal: inferMealType(String(m.time ?? '')), food: m.food_name,
      grams: m.grams, cal: m.calories, pro: m.protein, carbs: m.carbs, fat: m.fat,
      note: m.note ?? '',
    })),
    caption: '今日明细（' + o.start + '，共 ' + meals.length + ' 条）',
    emptyText: onlyNote ? '今天没有带备注的记录' : '本日无明细',
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
    /* #496 · 页名（唤醒词「看有备注的饮食记录」）承诺看的是有备注的记录，标题原写「今日饮食 〈日期〉」，
       读者看不出这是一张筛过的页（审查件第 67 条）⇒ 这一支把筛选口径写进标题。 */
    title: '今日饮食 ' + o.start + (onlyNote ? ' · 只看有备注的' : ''),
    /* #496 · 眉标原写命令键「calorie.today · 饮食域」（裁定 1 不上屏）⇒ 改中文族名。 */
    eyebrow: '卡路里 · 饮食',
    /* #496 · 副题原本整句就是常量名那一串；现在只留口径小字（加餐是哪两顿），与「餐别覆盖」卡
       不再各说一遍。 */
    subtitle: MEAL_NOTE,
    content: parts.join(''),
    charts,
  });
}
