/** #108 · 营养/饮食域全文档装配（数据→区块→填充器）。
 *
 * 范围（47 页同质之饮食域，t71 口径「新版已有」）：`calorie.today`／`calorie.view.diet`
 * （today_diet／diet_overview／meal_distribution／today_meals 子集）／`calorie.view.diet-review`
 * （diet_review）／`calorie.view.ranking`（food_ranking）／`calorie.view.search`（food_search）／
 * `calorie.view.library`（food_library）／`calorie.view.health`（health_dashboard）／
 * `calorie.view.dedupe`（dedupe_report）。
 * 不碰：nutrition_ratio／nutrition_detail／source_stats／today_water（→ #112，需移植），
 * 缺口/组合/异常/禁忌（→ #110），运动/体重/身体（→ #109）。
 *
 * 做法（#104 §4 用法）：内容 = base-paint/blocks 12 区块（B-01 壳／B-02 KPI／B-03 表／
 * B-04 图／B-05 列表／B-08 折叠／B-09 参数表单／B-11 复制区），文档 = fillTemplate 包裹
 * （资产裸文本＋填充器包裹；sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs，图表 CSS 由其运行时注入）。
 * 复制文本一律 buildDataText（#77 契约，技能侧不自产第二套序列化）：指标页走 stat 投影，
 * 行级页（榜单/食品/明细/去重）走 list 投影（JSON 行，旧「复制榜单/复制回 AI」的数据等价物）。
 * 本层不做取数（数据由调用方 dispatch 备齐），不返空（缺失由数据层抛 missing-data）。
 */
import {
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
  renderParamForm,
} from 'base-paint/blocks';
import { assembleDocPage, dataCopyArea } from '../shared/docPage.js';
import type { DataTableColumn } from 'base-paint/blocks';
import { inferMealType } from '../fetch/diet.js';
/** 明细行最小形（fetch MealRow 的子集；调用方传全行亦可）。 */
export interface DietMealRow {
  readonly date: string;
  readonly time: string | null;
  readonly food_name: string;
  readonly grams: number;
  readonly calories: number;
  readonly protein: number;
  readonly carbs: number;
  readonly fat: number;
  readonly note?: string | null;
}
import type { DaySeries } from '../analysis/series.js';
import type { FoodRanking, MacroRatio } from '../analysis/diet.js';
import type { DietOverview, MealDistribution } from './diet.js';
import type { DietReview } from './analysisPlate.js';
import type { AllRankings } from './ranking.js';
import type { HealthPlate } from './health.js';
import type { DedupeView } from './insightPlate.js';
import type { ProductLibrary, ProductSearch } from './library.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·饮食';

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

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

/* ── 饮食总览＋餐别分布（diet_overview／meal_distribution／today_meals 子集对照） ── */

export interface ViewDietDocInput {
  overview: DietOverview;
  dist: MealDistribution;
  distDate: string;
  days: DaySeries[];
  meals: DietMealRow[];
  mealTotal: number;
  mealsTruncated: boolean;
}

const MEAL_COLUMNS: DataTableColumn[] = [
  { key: 'date', label: '日期' },
  { key: 'time', label: '时间' },
  { key: 'meal', label: '餐别' },
  { key: 'food', label: '食物' },
  { key: 'grams', label: '克数', align: 'right' },
  { key: 'cal', label: '热量', align: 'right' },
  { key: 'pro', label: '蛋白', align: 'right' },
  { key: 'carbs', label: '碳水', align: 'right' },
  { key: 'fat', label: '脂肪', align: 'right' },
];

export function buildViewDietDoc(input: ViewDietDocInput): string {
  const { overview: o, dist, distDate, days, meals, mealTotal, mealsTruncated } = input;
  const kpis = renderKpiGrid([
    { label: '累计', value: String(o.totalCalories), unit: '卡', detail: o.loggedDays + '/' + o.days + '天有记录' },
    { label: '日均', value: fmt(o.avgCalories), unit: '卡' },
    { label: '目标', value: String(o.calorieGoal), unit: '卡' },
    { label: '趋势', value: o.trend.summary.trend, detail: '均值 ' + o.trend.summary.avg + ' 卡' },
  ]);
  const parts: string[] = [kpis];
  let charts = false;
  const loggedDays = days.filter((d) => d.calories !== null);
  if (loggedDays.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '每日摄入',
      input: {
        items: days.map((d) => ({ label: d.date.slice(5), value: d.calories })),
        options: { markLine: { value: o.avgCalories ?? undefined, label: '日均' } },
      },
    }));
    charts = true;
  }
  if (dist.totalCalories > 0) {
    parts.push(renderChartBlock({
      kind: 'bar',
      title: '餐别分布 ' + distDate,
      input: { items: dist.slices.map((s) => ({ label: s.meal + ' ' + s.count + '餐', value: s.calories })) },
    }));
    charts = true;
  } else {
    parts.push(renderKpiGrid(dist.slices.map((s) => ({
      label: '餐别分布 ' + s.meal, value: '0', unit: '卡', detail: distDate + ' 无记录（窗内有数，仅尾日回零）',
    }))));
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'cal', label: '摄入', align: 'right' },
      { key: 'pro', label: '蛋白', align: 'right' },
      { key: 'carbs', label: '碳水', align: 'right' },
      { key: 'fat', label: '脂肪', align: 'right' },
      { key: 'goal', label: '目标', align: 'right' },
    ],
    rows: days.map((d) => ({
      date: d.date, cal: d.calories, pro: d.protein, carbs: d.carbs, fat: d.fat, goal: d.calorieGoal,
    })),
    caption: '按日汇总（' + o.start + ' ~ ' + o.end + '，无记录日留空，不断 0）',
    emptyText: '本窗无按日汇总',
  }));
  parts.push(renderDisclosure({
    title: '窗口明细（共 ' + mealTotal + ' 条' + (mealsTruncated ? '，仅列前 ' + meals.length + ' 条' : '') + '）',
    contentHtml: renderDataTable({
      columns: [...MEAL_COLUMNS],
      rows: meals.map((m) => ({
        date: m.date, time: m.time ?? '', meal: inferMealType(String(m.time ?? '')), food: m.food_name,
        grams: m.grams, cal: m.calories, pro: m.protein, carbs: m.carbs, fat: m.fat,
      })),
      caption: '窗口明细' + (mealsTruncated ? '（截断前 ' + meals.length + ' 条）' : ''),
      emptyText: '本窗无明细',
    }),
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.diet',
      data: {
        metrics: {
          totalCalories: o.totalCalories, loggedDays: o.loggedDays, days: o.days,
          calorieGoal: o.calorieGoal, distTotal: dist.totalCalories,
        },
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '饮食总览 ' + o.start + ' ~ ' + o.end,
    eyebrow: 'calorie.view.diet · 饮食域',
    subtitle: '餐别分布 ' + distDate + '（' + MEAL_NOTE + '）',
    content: parts.join(''),
    charts,
  });
}

/* ── 饮食复盘（diet_review.html 对照：每日热量趋势＋配比＋高频 TOP＋按餐汇总） ── */

export function buildDietReviewDoc(r: DietReview, top5: FoodRanking | null): string {
  const t = r.trend.status === 'ok' && r.trend.data ? r.trend.data : null;
  const m = r.macro.status === 'ok' && r.macro.data ? r.macro.data : null;
  const macroText = m && m.protein
    ? '蛋白/碳水/脂肪 ' + m.protein.pct + '/' + (m.carb ? m.carb.pct : '—') + '/' + (m.fat ? m.fat.pct : '—')
    : '—';
  const parts: string[] = [renderKpiGrid([
    {
      label: '热量',
      value: t ? String(t.totalCal) + ' 卡' : '—',
      detail: t ? '日均 ' + t.avgCal + ' 卡 · ' + r.loggedDays + ' 天有记录' : r.loggedDays + ' 天有记录',
    },
    { label: '配比', value: macroText },
    {
      label: '达标天', value: t ? String(t.complianceDays) + '/' + t.daysCount : '—',
      detail: t && t.calGoal ? '目标 ' + t.calGoal + ' 卡（±10%）' : '未设热量目标',
    },
    {
      label: '周末/工作日', value: t ? t.weekendAvg + '/' + t.weekdayAvg : '—',
      detail: '均值（卡）',
    },
  ])];
  let charts = false;
  if (t && t.daily.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '每日热量趋势',
      input: {
        items: t.daily.map((d) => ({ label: d.date.slice(5), value: d.totalCal })),
        options: { avgLine: t.avgCal },
      },
    }));
    charts = true;
  }
  if (m && (m.protein || m.carb || m.fat)) {
    parts.push(renderChartBlock({
      kind: 'donut',
      title: '营养配比',
      input: {
        items: [
          { label: '蛋白', value: m.protein ? m.protein.pct : 0 },
          { label: '碳水', value: m.carb ? m.carb.pct : 0 },
          { label: '脂肪', value: m.fat ? m.fat.pct : 0 },
        ],
        options: { showPercent: true },
      },
    }));
    charts = true;
  }
  const top = top5 ? top5.items : [];
  parts.push(renderDataTable({
    columns: [
      { key: 'rank', label: '排名', align: 'right' },
      { key: 'food', label: '食物' },
      { key: 'cal', label: '总热量', align: 'right' },
      { key: 'cnt', label: '次数', align: 'right' },
      { key: 'avg', label: '餐均', align: 'right' },
    ],
    rows: top.slice(0, 5).map((it) => ({
      rank: it.rank, food: it.foodName, cal: it.totalCal, cnt: it.cnt, avg: it.avgCalPerMeal,
    })),
    caption: '高频食物 TOP5（' + r.start + ' ~ ' + r.end + '）',
    emptyText: '本窗无高频食物',
  }));
  parts.push(renderDataTable({
    columns: [
      { key: 'meal', label: '餐别' },
      { key: 'days', label: '天数', align: 'right' },
      { key: 'cal', label: '累计热量', align: 'right' },
    ],
    rows: r.byMeal.map((s) => ({ meal: s.meal, days: s.days, cal: s.totalCalories })),
    caption: '按餐汇总（' + MEAL_NOTE + '）',
    emptyText: '本窗无按餐汇总',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.diet-review',
      data: { metrics: { loggedDays: r.loggedDays } },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '饮食复盘 ' + r.start + ' ~ ' + r.end,
    eyebrow: 'calorie.view.diet-review · 饮食域',
    subtitle: null,
    content: parts.join(''),
    charts,
  });
}

/* ── 食品排行（food_ranking.html 对照：榜单表＋复制榜单；tab 交互归宿主，静态页逐榜/全榜直出） ── */

const RANK_ZH: Record<string, string> = {
  high_calorie: '高热量', low_calorie: '低热量', frequent: '常吃', high_carb: '高碳水', high_protein: '高蛋白',
};

const RANK_COLUMNS: DataTableColumn[] = [
  { key: 'rank', label: '排名', align: 'right' },
  { key: 'food', label: '食物' },
  { key: 'cal', label: '总热量', align: 'right' },
  { key: 'cnt', label: '次数', align: 'right' },
  { key: 'avg', label: '餐均', align: 'right' },
  { key: 'pro', label: '蛋白', align: 'right' },
  { key: 'carbs', label: '碳水', align: 'right' },
  { key: 'fat', label: '脂肪', align: 'right' },
];

export function buildRankingDoc(r: FoodRanking): string {
  const top = r.items[0];
  const parts: string[] = [renderKpiGrid([
    { label: '榜单', value: RANK_ZH[r.category] ?? r.category, detail: r.start + ' ~ ' + r.end },
    { label: '上榜', value: String(r.items.length), unit: '种', detail: 'TOP ' + r.topN },
    {
      label: '头名', value: top ? top.foodName : '—',
      detail: top ? top.totalCal + ' 卡 · ' + top.cnt + ' 次 · 均 ' + top.avgCalPerMeal + ' 卡/餐' : '',
    },
  ])];
  parts.push(renderDataTable({
    columns: [...RANK_COLUMNS],
    rows: r.items.map((it) => ({
      rank: it.rank, food: it.foodName, cal: it.totalCal, cnt: it.cnt,
      avg: it.avgCalPerMeal, pro: it.totalProtein, carbs: it.totalCarbs, fat: it.totalFat,
    })),
    caption: r.title,
    emptyText: '本窗无排行数据',
  }));
  parts.push(dataCopyArea('复制榜单', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.ranking',
      data: {
        items: r.items.map((it) => ({
          rank: it.rank, foodName: it.foodName, totalCal: it.totalCal,
          cnt: it.cnt, avgCalPerMeal: it.avgCalPerMeal,
        })),
        total: r.items.length,
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '排行 ' + (RANK_ZH[r.category] ?? r.category) + ' ' + r.start + ' ~ ' + r.end,
    eyebrow: 'calorie.view.ranking · 饮食域',
    subtitle: 'tab 切换归宿主：单榜直出（' + r.title + '）',
    content: parts.join(''),
    charts: false,
  });
}

export function buildAllRankingsDoc(a: AllRankings): string {
  const cats = Object.keys(a.boards) as Array<keyof typeof a.boards>;
  const parts: string[] = [renderKpiGrid(cats.map((c) => {
    const b = a.boards[c];
    if (!b || !b.items[0]) return { label: RANK_ZH[c] ?? c, value: '—', detail: '本窗无数据' };
    const top = b.items[0];
    return {
      label: RANK_ZH[c] ?? c, value: top.foodName + ' ' + top.totalCal + ' 卡', detail: 'TOP ' + b.topN,
    };
  }))];
  for (const c of cats) {
    const b = a.boards[c];
    parts.push(renderDisclosure({
      title: (RANK_ZH[c] ?? c) + '榜' + (b ? '（TOP ' + b.topN + '）' : '（本窗无数据）'),
      open: b !== null && cats.indexOf(c) === cats.findIndex((k) => a.boards[k] !== null),
      contentHtml: renderDataTable({
        columns: [...RANK_COLUMNS],
        rows: (b ? b.items : []).map((it) => ({
          rank: it.rank, food: it.foodName, cal: it.totalCal, cnt: it.cnt,
          avg: it.avgCalPerMeal, pro: it.totalProtein, carbs: it.totalCarbs, fat: it.totalFat,
        })),
        caption: b ? b.title : '本窗无数据',
        emptyText: '本窗无数据',
      }),
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.ranking',
      data: { metrics: { okCount: a.okCount, topN: a.topN } },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '全部排行 ' + a.start + ' ~ ' + a.end,
    eyebrow: 'calorie.view.ranking · 饮食域',
    subtitle: a.start + ' ~ ' + a.end + ' · ' + a.okCount + '/5 榜有数据',
    content: parts.join(''),
    charts: false,
  });
}

/* ── 查食品／食品库（food_search／food_library 对照：参数表单＋结果表＋复制） ── */

const PRODUCT_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: '食品名' },
  { key: 'brand', label: '品牌' },
  { key: 'cal', label: '热量', align: 'right' },
  { key: 'pro', label: '蛋白', align: 'right' },
  { key: 'fat', label: '脂肪', align: 'right' },
  { key: 'carbs', label: '碳水', align: 'right' },
  { key: 'sodium', label: '钠', align: 'right' },
  { key: 'source', label: '来源' },
];

export function buildSearchDoc(s: ProductSearch): string {
  const rows = s.items.map((p) => ({
    name: p.product_name, brand: p.brand ?? '', cal: p.calories, pro: p.protein,
    fat: p.fat, carbs: p.carbohydrates, sodium: p.sodium, source: p.source ?? '',
  }));
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'keyword', label: '关键词', value: s.keyword }],
      description: '食品库按名称/品牌模糊查找（营养值为每 100g；实时搜索归宿主）',
    }),
    renderKpiGrid([{ label: '关键词', value: s.keyword, detail: '命中 ' + s.total + ' 条' }]),
    renderDataTable({
      columns: [...PRODUCT_COLUMNS],
      rows,
      caption: '查食品 ' + s.keyword + '（共 ' + s.total + ' 条）',
      emptyText: '无命中',
    }),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.search',
        data: { items: rows, total: s.total },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '查食品 ' + s.keyword,
    eyebrow: 'calorie.view.search · 饮食域',
    subtitle: null,
    content: parts.join(''),
    charts: false,
  });
}

export function buildLibraryDoc(lib: ProductLibrary, statsTotal: number): string {
  const rows = lib.items.map((p) => ({
    name: p.product_name, brand: p.brand ?? '', cal: p.calories, pro: p.protein,
    fat: p.fat, carbs: p.carbohydrates, sodium: p.sodium, source: p.source ?? '',
  }));
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'category', label: '分类', value: lib.category ?? '' }],
      description: '按分类浏览食品库（空=全量；分页与实时筛选归宿主）',
    }),
    renderKpiGrid([
      { label: '食品库', value: lib.category ?? '全量', detail: '本页 ' + lib.total + ' 条 / 库 ' + statsTotal + ' 条' },
    ]),
    renderDataTable({
      columns: [...PRODUCT_COLUMNS],
      rows,
      caption: '食品库' + (lib.category ? '（' + lib.category + '）' : '（全量）') + '（共 ' + lib.total + ' 条）',
      emptyText: '该分类空库',
    }),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.library',
        data: { items: rows, total: lib.total },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '食品库' + (lib.category ? '（' + lib.category + '）' : ''),
    eyebrow: 'calorie.view.library · 饮食域',
    subtitle: null,
    content: parts.join(''),
    charts: false,
  });
}

/* ── 健康盘（health_dashboard.html 对照：四维＋今日该做什么＋复制回 AI） ── */

const HEALTH_DIMS = [
  { key: 'calorie', name: '摄入' },
  { key: 'exercise', name: '运动' },
  { key: 'weight', name: '体重' },
  { key: 'deficit', name: '缺口' },
] as const;

export function buildHealthDoc(h: HealthPlate): string {
  const dims = (h.dashboard.data ?? {}) as { weight?: unknown; calorie?: unknown; exercise?: unknown; deficit?: unknown };
  const missing = HEALTH_DIMS.filter((d) => dims[d.key] === null || dims[d.key] === undefined).map((d) => d.name);
  const parts: string[] = [renderKpiGrid([
    { label: '区间', value: h.start + ' ~ ' + h.end, detail: '有记录 ' + h.loggedDays + ' 天' },
    { label: '日均摄入', value: fmt(h.avgIntake), unit: '卡' },
    { label: '日均缺口', value: fmt(h.avgDeficit), unit: '卡' },
    {
      label: '四维', value: h.dashboard.status === 'ok' ? '齐' : '部分缺',
      detail: missing.length === 0 ? '体重维有' : '缺：' + missing.join('、'),
      status: missing.length === 0 ? 'ok' : 'warn',
    },
  ])];
  parts.push(renderListRows({
    items: HEALTH_DIMS.map((d) => {
      const v = dims[d.key];
      const has = v !== null && v !== undefined;
      return {
        left: d.name,
        main: has ? '有数据' : '缺数据（先补记录）',
        right: has ? '✓' : '缺',
      };
    }),
  }));
  const logged = h.series.filter((d) => d.calories !== null);
  const goalAvg = logged.length > 0
    ? logged.reduce((a, d) => a + d.calorieGoal, 0) / logged.length
    : null;
  const actions: Array<{ left?: string; main: string; right?: string }> = [];
  if (h.avgIntake !== null && goalAvg) {
    const ratio = h.avgIntake / goalAvg;
    if (ratio > 1.1) {
      actions.push({ left: '!', main: '摄入超标', right: '日均 ' + h.avgIntake + ' 卡 vs 目标 ' + r1(goalAvg) + ' 卡' });
    } else if (ratio < 0.7) {
      actions.push({ left: '!', main: '摄入不足', right: '日均仅 ' + h.avgIntake + ' 卡，长期可能影响代谢' });
    }
  }
  if (h.avgDeficit !== null) {
    if (h.avgDeficit > 700) actions.push({ left: '🔥', main: '缺口过大', right: '日均缺口 ' + h.avgDeficit + ' 卡，超过 700 不健康' });
    else if (h.avgDeficit < 0) actions.push({ left: '🍔', main: '热量盈余', right: '日均 ' + Math.abs(h.avgDeficit) + ' 卡盈余，可能在增重' });
  }
  if (missing.length > 0) actions.push({ left: '补', main: '部分维度缺数据', right: '缺：' + missing.join('、') });
  if (actions.length === 0) actions.push({ left: '✓', main: '一切正常', right: '指标均在合理范围内' });
  parts.push(renderDisclosure({
    title: '今日该做什么（共 ' + actions.length + ' 条）',
    open: true,
    contentHtml: renderListRows({ items: actions }),
  }));
  parts.push(dataCopyArea('复制回 AI', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.health',
      data: {
        metrics: {
          loggedDays: h.loggedDays,
          ...(h.avgIntake !== null ? { avgIntake: h.avgIntake } : {}),
          ...(h.avgDeficit !== null ? { avgDeficit: h.avgDeficit } : {}),
        },
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '健康盘 ' + h.start + ' ~ ' + h.end,
    eyebrow: 'calorie.view.health · 饮食域',
    subtitle: h.dashboard.message,
    content: parts.join(''),
    charts: false,
  });
}

/* ── 去重报告（dedupe_report.html 对照：KPI＋重复组表＋处理建议） ── */

export function buildDedupeDoc(v: DedupeView): string {
  const parts: string[] = [renderKpiGrid([
    { label: '重复组', value: String(v.groupCount), unit: '组' },
    { label: '冗余条', value: String(v.rowCount), unit: '条' },
    { label: '库内食品', value: String(v.totalProducts), unit: '条' },
  ])];
  parts.push(renderDataTable({
    columns: [
      { key: 'name', label: '食品名' },
      { key: 'brand', label: '品牌' },
      { key: 'count', label: '条数', align: 'right' },
      { key: 'ids', label: 'ID' },
    ],
    rows: v.groups.slice(0, 50).map((g) => ({
      name: g.productName, brand: g.brand ?? '', count: g.ids.length, ids: g.ids.join(','),
    })),
    caption: '重复组列表（共 ' + v.groupCount + ' 组' + (v.groups.length > 50 ? '，仅列前 50 组' : '') + '）',
    emptyText: '无重复组（库内 ' + v.totalProducts + ' 条均唯一）',
  }));
  parts.push(renderDisclosure({
    title: '处理建议',
    contentHtml: renderListRows({
      items: v.groupCount === 0
        ? [{ main: '库内无重复，无需处理' }]
        : [
          { main: '每组合并保留一条（取数据最全者）', right: '共 ' + v.groupCount + ' 组' },
          { main: '其余条目下架（deprecate），查询/搜索/导入去重不再出现' },
        ],
    }),
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.dedupe',
      data: {
        items: v.groups.map((g) => ({ productName: g.productName, brand: g.brand, ids: g.ids })),
        total: v.groupCount,
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '去重报告',
    eyebrow: 'calorie.view.dedupe · 饮食域',
    subtitle: '数据来源：nutrition_products',
    content: parts.join(''),
    charts: false,
  });
}
