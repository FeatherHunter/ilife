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
  renderCaliberLine,
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
} from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
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
import type { DietOverview, MealDistribution } from './diet.js';
import type { HealthPlate } from '../analysis/healthPlate.js';

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

/** 餐别口径一行（**正文里说一次**的版本，不带常量名）。
 *
 *  #496 · 原文案是「窗口跟 MEAL_WINDOWS · 加餐=下午茶+夜宵」——把源码常量名印给用户看
 *  （`.scratch/t155o/text-review-P0.md` 第 2、62、68 条，四份审查件共 14 席命中）。
 *  现在只留读者用得上的那半句：加餐是哪几顿。 */
const MEAL_NOTE = '加餐时段：下午茶、夜宵';

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
    /* #496 · 餐别口径（加餐是哪几顿）只在图下说一次，不带常量名。 */
    parts.push(renderCaliberLine(MEAL_NOTE));
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
    /* #496 · 折行标题原写「窗口明细」——审查件第 63、64、66、68 条点到它：读者看不出「窗口」是哪扇窗，
       且这一页的明细就是窗内全部记录 ⇒ 改「全部记录（共 N 条）」。 */
    title: '全部记录（共 ' + mealTotal + ' 条' + (mealsTruncated ? '，仅列前 ' + meals.length + ' 条' : '') + '）',
    contentHtml: renderDataTable({
      columns: [...MEAL_COLUMNS],
      rows: meals.map((m) => ({
        date: m.date, time: m.time ?? '', meal: inferMealType(String(m.time ?? '')), food: m.food_name,
        grams: m.grams, cal: m.calories, pro: m.protein, carbs: m.carbs, fat: m.fat,
      })),
      /* #496 · 这一段原caption 与折叠标题同名同数（「窗口明细（共 N 条）」＋「窗口明细」），
         读者在同一行读到两遍（审查件第 64、66 条点的同形重复）。折叠标题已经说全 ⇒ caption 删。 */
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
    /* #496 · 眉标原写命令键「calorie.view.diet · 饮食域」——`t425-融合基准.md:127-132`（裁定 1）
       定死不上屏，`assembleDocPage` 也已整行挡掉这种写法；这里同时换成样张口径的中文族名
       （`t425-样张-今日饮食.html` 眉标＝`calorie.view.diet · 条目列表`）。 */
    eyebrow: '卡路里 · 饮食',
    /* #496 · 原副题是「餐别分布 <日期>（窗口跟 MEAL_WINDOWS · 加餐=下午茶+夜宵）」：常量名上屏，
       且这句话在页脚图下又说了一遍。副题改成老实物 `.sub` 那条「窗口 … · N 天 · M 条记录」口径，
       并把餐别口径（加餐是哪两顿）收进这一行——图下不再重复说。 */
    subtitle: '窗口 ' + o.start + ' ~ ' + o.end + ' · ' + o.days + ' 天 · ' + mealTotal + ' 条记录 · ' + MEAL_NOTE,
    content: parts.join(''),
    charts,
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
