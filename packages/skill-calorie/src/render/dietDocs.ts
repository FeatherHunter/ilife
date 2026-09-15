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
  renderEmptyBlock,
  renderKpiGrid,
  renderListRows,
  renderTocBlock,
} from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { emptyGuide } from '../shared/emptyGuide.js';
import { sourceLine } from '../shared/sourceLine.js';
import { DIET_LIST_COLUMNS, buildDietOverviewPage, buildMealDistributionPage, listPageCopy, minuteOf, noteOf } from '../diet/todayDocs.js';
import type { MealDistributionView } from '../diet/reviewDocs.js';
import type { DietOverviewView } from '../diet/nutritionPort.js';
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

/* ── 条目列表页（`calorie.view.diet` 的窗口词；老实物 `today_meals.html` 对照） ── */

/** 区块锚点（页内导航 `renderTocBlock` 的落点；名字照作者认可的样张
 *  `docs/skills/skill-calorie/t425-样张-今日饮食.html` 的 `sec-*` 一套）。 */
const LIST_ANCHOR = {
  kpi: 'sec-kpi', trend: 'sec-trend', dist: 'sec-dist', daily: 'sec-daily', meals: 'sec-meals', copy: 'sec-copy',
} as const;

/** 区块外面套一层带锚点的 `<section>`（页内导航点得到才出这一项——不留死链接）。 */
function anchored(id: string, html: string): string {
  return '<section id="' + id + '">' + html + '</section>';
}

/** 条目列表页入参：前 7 位是窗口词的取数结果（调用点＝`src/home/today.ts` 的 `viewDietOverview`），
 *  后 3 位是可选位——给了就换页（`mealView`→餐别页／`overviewView`→总览页），
 *  `command` 给了才出复制日志（裁定 7）。 */
export interface ViewDietDocInput {
  overview: DietOverview;
  dist: MealDistribution;
  distDate: string;
  days: DaySeries[];
  meals: DietMealRow[];
  mealTotal: number;
  mealsTruncated: boolean;
  /** 本次命令原文（`commandLine('calorie.view.diet', params)`）。 */
  readonly command?: string;
  /** 餐别筛选那一支的取数（`../diet/review.ts` 的 `buildMealDistributionView` 产出）。 */
  readonly mealView?: MealDistributionView;
  /** 「看饮食总览」那一支的取数（`../diet/nutritionPort.ts` 的 `buildDietOverviewView` 产出）。 */
  readonly overviewView?: DietOverviewView;
}

/** 老新对照的明细列（老实物 `today_meals.html:168` 的九列）住在 `../diet/todayDocs.ts` 的
 *  `DIET_LIST_COLUMNS`——今日页与窗口页同族，列面只准有一处。 */

/** 条目列表页（② 类，`t425-融合基准.md` §五 的 15 行骨架逐行落位；老实物 `today_meals.html`）。
 *
 *  裁定落点：1 眉标只写人话、源码标识符不上屏；2 结论句走标题下第一行（样张做法＝复用副题槽）；
 *  3 页内导航 ＋ 口径说明行 ＋ 来源脚注三条恒出；4 缺值一律 `—`、空窗出完整页 ＋ 空态句 ＋ 引导句；
 *  5 零值不画柱身、单点不成线（点数不足出说明句）；7 复制区双按钮、日志第 4 段＝本次命令原文。 */
export function buildViewDietDoc(input: ViewDietDocInput): string {
  /* 餐别筛选那一支（`meal` 参数由命令面带进来）：整页换成餐别分布页（#273 交付的具名区块）。 */
  if (input.mealView !== undefined) return buildMealDistributionPage(input.mealView, input.command);
  /* 「看饮食总览」那一支：整页换成总览页（#275 交付的具名区块）。 */
  if (input.overviewView !== undefined) return buildDietOverviewPage(input.overviewView, input.command);

  const { overview: o, dist, distDate, days, meals, mealTotal, mealsTruncated } = input;
  const loggedDays = days.filter((d) => d.calories !== null);
  /* 裁定 4：本窗一条记录也没有 ⇒ 整页仍是完整页（空态句 ＋ 引导句 ＋ 来源脚注都在），图表不画。 */
  const empty = loggedDays.length === 0;
  /* 移植清单 5 的排序口径（老 `today_meals.html:322`）：明细按日期＋时间**倒序**，最近的排最前。 */
  const rows = [...meals].sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? '')));

  let charts = false;
  const parts: string[] = [];
  /* §五 第 4 行：页内导航只列**真会出**的区块（点不到的项就是死链接）。 */
  parts.push(renderTocBlock({
    items: [
      { id: LIST_ANCHOR.kpi, text: '读数' },
      ...(empty ? [] : [{ id: LIST_ANCHOR.trend, text: '每日摄入' }]),
      { id: LIST_ANCHOR.dist, text: '餐别分布' },
      ...(empty ? [] : [
        { id: LIST_ANCHOR.daily, text: '按日汇总' },
        { id: LIST_ANCHOR.meals, text: '每日明细' },
      ]),
      { id: LIST_ANCHOR.copy, text: '复制区' },
    ],
  }));
  /* §五 第 5 行：KPI 读数。 */
  parts.push(anchored(LIST_ANCHOR.kpi, renderKpiGrid([
    { label: '累计', value: String(o.totalCalories), unit: '卡', detail: o.loggedDays + '/' + o.days + '天有记录' },
    { label: '日均', value: fmt(o.avgCalories), unit: '卡' },
    { label: '目标', value: String(o.calorieGoal), unit: '卡' },
    { label: '趋势', value: o.trend.summary.trend, detail: '均值 ' + o.trend.summary.avg + ' 卡' },
  ])));
  /* §五 第 6 行：主体折线。裁定 5 —— 单点不成线：只画**两点及以上**，否则出一句说明。 */
  if (loggedDays.length >= 2) {
    parts.push(anchored(LIST_ANCHOR.trend, renderChartBlock({
      kind: 'line',
      title: '每日摄入',
      input: {
        items: days.map((d) => ({ label: d.date.slice(5), value: d.calories })),
        options: { markLine: { value: o.avgCalories ?? undefined, label: '日均' } },
      },
    })));
    charts = true;
  } else if (loggedDays.length === 1) {
    parts.push(anchored(LIST_ANCHOR.trend, renderEmptyBlock({
      title: '每日摄入',
      text: '本窗只有 ' + (loggedDays[0] as DaySeries).date + ' 一天有记录，一个点画不成折线（不画半截线）。',
    })));
  }
  if (dist.totalCalories > 0) {
    parts.push(anchored(LIST_ANCHOR.dist, renderChartBlock({
      kind: 'bar',
      title: '餐别分布 ' + distDate,
      input: { items: dist.slices.map((s) => ({ label: s.meal + ' ' + s.count + '餐', value: s.calories })) },
    })));
    /* #496 · 餐别口径（加餐是哪几顿）只在图下说一次，不带常量名。 */
    parts.push(renderCaliberLine(MEAL_NOTE));
    charts = true;
  } else {
    /* 裁定 5：零值不画柱身；裁定 4：这一支的值位是「尾日没记录」而不是「吃了 0 卡」⇒ 值位写 `—`。 */
    parts.push(anchored(LIST_ANCHOR.dist, renderKpiGrid(dist.slices.map((s) => ({
      label: '餐别分布 ' + s.meal, value: '—', detail: distDate + ' 无记录（窗内有数，仅尾日回零）',
    })))));
  }
  if (empty) {
    /* §五 第 12 行：空态块 ＋ 一句「怎么记第一条」的引导句（裁定 4）。 */
    parts.push(anchored(LIST_ANCHOR.meals, emptyGuide({
      icon: '🍽️',
      text: '这一段时间（' + o.start + ' ~ ' + o.end + '）没有饮食记录。',
      hint: '要让它有内容，说「记一餐」把吃的那顿记上；补以前的日期就说「补记饮食」。',
    })));
  } else {
    /* §五 第 9 行：主表两张——按日汇总 ＋ 每日明细（明细含**备注列**）。 */
    parts.push(anchored(LIST_ANCHOR.daily, renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'cal', label: '摄入', align: 'right' },
        { key: 'pro', label: '蛋白', align: 'right' },
        { key: 'carbs', label: '碳水', align: 'right' },
        { key: 'fat', label: '脂肪', align: 'right' },
        { key: 'goal', label: '目标', align: 'right' },
      ],
      /* 裁定 4：无记录日写 `—`，不写 0、也不留空串（老页留空、样张写 `—`）。 */
      rows: days.map((d) => ({
        date: d.date, cal: fmt(d.calories), pro: fmt(d.protein), carbs: fmt(d.carbs), fat: fmt(d.fat),
        goal: fmt(d.calorieGoal),
      })),
      caption: '按日汇总（' + o.start + ' ~ ' + o.end + '，无记录日写 —，不断 0）',
      emptyText: '本窗无按日汇总',
    })));
    parts.push(anchored(LIST_ANCHOR.meals, renderDisclosure({
      /* #496 · 折行标题原写「窗口明细」——审查件第 63、64、66、68 条点到它：读者看不出「窗口」是哪扇窗，
         且这一页的明细就是窗内全部记录 ⇒ 改「全部记录（共 N 条）」。 */
      title: '全部记录（共 ' + mealTotal + ' 条' + (mealsTruncated ? '，仅列前 ' + meals.length + ' 条' : '') + '）',
      open: true,
      contentHtml: renderDataTable({
        columns: [...DIET_LIST_COLUMNS],
        rows: rows.map((m) => ({
          when: m.date + ' ' + minuteOf(m.time), meal: inferMealType(String(m.time ?? '')), food: m.food_name,
          grams: m.grams, cal: m.calories, pro: m.protein, carbs: m.carbs, fat: m.fat, note: noteOf(m.note),
        })),
        /* #496 · 这一段原caption 与折叠标题同名同数（「窗口明细（共 N 条）」＋「窗口明细」），
           读者在同一行读到两遍（审查件第 64、66 条点的同形重复）。折叠标题已经说全 ⇒ caption 删。 */
        emptyText: '本窗无明细',
      }),
    })));
  }
  /* §五 第 13 行：口径说明行（餐别口径 ＋ 缺值口径各说一次，不带常量名）。 */
  parts.push(renderCaliberLine(MEAL_NOTE + '；本页缺值一律写成 —，不当成 0 卡。'));
  /* §五 第 14 行：复制区（双按钮；`command` 不在时只出「复制数据」，不留死按钮）。 */
  parts.push(anchored(LIST_ANCHOR.copy, listPageCopy({
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.diet',
    data: {
      metrics: {
        totalCalories: o.totalCalories, loggedDays: o.loggedDays, days: o.days,
        calorieGoal: o.calorieGoal, distTotal: dist.totalCalories,
      },
    },
  }, input.command)));
  /* §五 第 15 行：来源脚注一行（老 `today_meals.html:344-345`；裁定 2-补：走普通小字行，不走深底块）。 */
  parts.push(sourceLine({ source: '饮食记录', start: o.start, end: o.end, count: mealTotal }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '饮食总览 ' + o.start + ' ~ ' + o.end,
    /* #496 · 眉标原写命令键「calorie.view.diet · 饮食域」——`t425-融合基准.md:127-132`（裁定 1）
       定死不上屏，`assembleDocPage` 也已整行挡掉这种写法；这里同时换成样张口径的中文族名。 */
    eyebrow: '卡路里 · 饮食',
    /* §五 第 3 行：结论句（句内含本页读数）。样张做法＝复用页头副题槽（公共层没有「结论行」区块，
       `t425-融合基准.md:139` 记明这个缺项），裁定 2-补：它是普通小字行、不走深底块。 */
    subtitle: '窗口 ' + o.start + ' ~ ' + o.end + ' 共 ' + o.days + ' 天，有记录 ' + o.loggedDays + ' 天、'
      + mealTotal + ' 条，合计 ' + o.totalCalories + ' 卡，日均 ' + fmt(o.avgCalories) + ' 卡。',
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
