/** #112 · 营养移植 4 页全文档装配（数据→区块→填充器）；#275 起按老实物重做内容与字段。
 *
 * 服务 4 条命令（声明住 `./commands.ts`）：
 *   · `calorie.view.nutrition-ratio`（查营养配比）→ `buildNutritionRatioDoc`
 *   · `calorie.view.nutrition-detail`（看营养素深度／看营养素明细）→ `buildNutritionDetailDoc`
 *   · `calorie.view.source-stats`（看食品来源统计／看食品来源分布）→ `buildSourceStatsDoc`
 *   · `calorie.view.today-water`（看今日喝水／看今日饮水）→ `buildTodayWaterDoc`
 *
 * 另交两个**具名区块**（本票只交付、不集成，谁调写在各自注释里）：
 *   · `buildNutritionRatioBlock(v)` —— 服务 `calorie.view.diet-review`（作者＝#273，「看营养结构」）；
 *   · `buildDietOverviewBlock(v)`   —— 服务 `calorie.view.diet`（作者＝#271，「看饮食总览」）。
 *
 * 老实物对照（`D:\2Study\StudyNotes\SKILLS\卡路里\templates\`，**只读**；同名 `scripts\render_*.py`
 * 是取数口径的正本，同样只读）：`nutrition_ratio.html`（报告型 · 3 维配比：3 维 KPI／热量来源占比／
 * 推荐范围对比）／`nutrition_detail.html`（微量营养素 vs 推荐：逐项条＋缺数据盒）／
 * `diet_overview.html`（🍱 饮食总览：本周累计＋本月累计，统计到昨日、不含今日）／
 * `today_water.html`（💧 今日饮水：今日进度环／本周 7 天／今日每杯）。
 * 老实物的版式由 base-paint 12 区块承担，本件只把老实物的**块与字段**逐个装进去：
 * 页面标题（含老 emoji）、眉标（老 meta-bar／type-badge）、副标题（老 sub）、KPI 标签与单位、
 * 表列与表题（老 h2）、图表标题（老 chart-title）、以及每页末的「📊 数据来源」行逐字对齐。
 *
 * 做法沿 #104 §4：内容 = base-paint/blocks 12 区块；文档 = fillTemplate 包裹
 * （资产裸文本＋填充器包裹；sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs）。复制文本一律 buildDataText（#77 契约）。
 * 本层不做取数（数据由 `./nutritionPort.ts` 备齐），不返空（缺失由数据层抛 missing-data）。
 */
import {
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderEmptyBlock,
  renderKpiGrid,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea, notice } from '../shared/copyArea.js';
import type {
  DietOverviewPeriod,
  DietOverviewView,
  NutritionDetailView,
  NutritionRatioView,
  SourceStatsView,
  TodayWaterView,
} from './nutritionPort.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `../shared/docPage.ts`，标题走参数）。
 *  域口径与 `todayDocs`／`reviewDocs`／`libraryDocs`／`rankingDocs`／`render/dietDocs` 一致。 */
const DOC_TITLE = '卡路里·饮食';

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

/** 每页末的「📊 数据来源」行（老 4 张实物的 `.footer .src` 位）。 */
function sourceLine(text: string): string {
  return notice({ icon: 'info', msg: '📊 数据来源:' + text });
}

/* ── 营养配比（老实物 nutrition_ratio.html：3 维配比 KPI＋热量来源占比＋推荐范围对比） ── */

/** 3 维配比的均衡档（老实物 `nutrition_ratio.html` 的 statusBadge 三档文案逐字）。 */
const BALANCE = {
  good: { text: '均衡', badge: '✓ 均衡', status: 'ok' },
  warn: { text: '失衡', badge: '⚠ 失衡', status: 'warn' },
  bad: { text: '严重失衡', badge: '✗ 严重失衡', status: 'danger' },
} as const;

/** 营养配比区块（**服务 `calorie.view.diet-review`**，作者＝#273：「看营养结构」按老 SKILL 也出这张页，
 *  老模板 `templates/nutrition_ratio.html`；#273 把它嵌进复盘页。本件只交付，不集成）。 */
export function buildNutritionRatioBlock(v: NutritionRatioView): string {
  const balance = BALANCE[v.balance];
  const parts: string[] = [
    renderKpiGrid([
      { label: '蛋白', value: String(v.proteinG), unit: 'g', detail: v.proteinPct + '% · 目标 ' + fmt(v.targetProteinG) + 'g' },
      { label: '碳水', value: String(v.carbG), unit: 'g', detail: v.carbPct + '% · 目标 ' + fmt(v.targetCarbG) + 'g' },
      { label: '脂肪', value: String(v.fatG), unit: 'g', detail: v.fatPct + '% · 目标 ' + fmt(v.targetFatG) + 'g' },
      {
        label: '总摄入', value: String(v.totalCalorie), unit: '卡',
        detail: '共 ' + v.days + ' 天 · ' + balance.text,
        status: balance.status,
        statusText: balance.badge,
      },
    ]),
  ];
  if (v.totalCalorie > 0) {
    // 热量来源占比（老实物的饼图＋自定义图例 → 冻结 donut：中心给总热量，占比由 showPercent 给）。
    parts.push(renderChartBlock({
      kind: 'donut',
      title: '热量来源占比',
      input: {
        items: [
          { label: '蛋白', value: v.proteinG * 4 },
          { label: '碳水', value: v.carbG * 4 },
          { label: '脂肪', value: v.fatG * 9 },
        ],
        options: { showPercent: true, centerLabel: '总热量', centerValue: v.totalCalorie.toLocaleString() },
      },
    }));
  } else {
    parts.push(renderEmptyBlock({ title: '热量来源占比', text: '本窗总热量为 0，占比画不出来（不编数）' }));
  }
  // 推荐范围对比（下限/上限按总热量占比换算：蛋白/碳水 4kcal/g · 脂肪 9kcal/g；沿老模板）。
  const kcalPerG = { protein: 4, carb: 4, fat: 9 } as const;
  const rows = ([
    { name: '蛋白', g: v.proteinG, pct: v.proteinPct, r: v.range.protein, perG: kcalPerG.protein },
    { name: '碳水', g: v.carbG, pct: v.carbPct, r: v.range.carb, perG: kcalPerG.carb },
    { name: '脂肪', g: v.fatG, pct: v.fatPct, r: v.range.fat, perG: kcalPerG.fat },
  ]).map((it) => {
    const minG = Math.round((v.totalCalorie * it.r.min) / 100 / it.perG);
    const maxG = Math.round((v.totalCalorie * it.r.max) / 100 / it.perG);
    const inRange = it.pct >= it.r.min && it.pct <= it.r.max;
    const gap = it.g > maxG ? '+' + (it.g - maxG) + 'g' : (it.g < minG ? '-' + (minG - it.g) + 'g' : '✓');
    return {
      name: it.name,
      actual: it.g + 'g（' + it.pct + '%）',
      lower: it.r.min + '%（' + minG + 'g）',
      upper: it.r.max + '%（' + maxG + 'g）',
      gap,
      status: inRange ? '✓ 在范围内' : (it.pct < it.r.min ? '↓ 偏低' : '↑ 偏高'),
    };
  });
  parts.push(renderDataTable({
    columns: [
      { key: 'name', label: '营养素' },
      { key: 'actual', label: '实际', align: 'right' },
      { key: 'lower', label: '下限', align: 'right' },
      { key: 'upper', label: '上限', align: 'right' },
      { key: 'gap', label: '距范围', align: 'right' },
      { key: 'status', label: '状态' },
    ],
    rows,
    caption: '推荐范围对比（' + v.start + ' ~ ' + v.end + '）',
    emptyText: '本窗无配比数据',
  }));
  parts.push(sourceLine('diet_analysis · ' + v.start + ' → ' + v.end + ' · ' + v.days + ' 天'));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.nutrition-ratio',
      data: {
        metrics: metricsOf({
          totalCalorie: v.totalCalorie, proteinG: v.proteinG, proteinPct: v.proteinPct,
          carbG: v.carbG, carbPct: v.carbPct, fatG: v.fatG, fatPct: v.fatPct,
          targetProteinG: v.targetProteinG, targetCarbG: v.targetCarbG, targetFatG: v.targetFatG,
        }),
      },
    },
  }));
  return parts.join('');
}

export function buildNutritionRatioDoc(v: NutritionRatioView): string {
  const balance = BALANCE[v.balance];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '🥗 营养配比 ' + v.start + ' ~ ' + v.end,
    eyebrow: '报告型 · 3 维配比',
    subtitle: '查营养配比 · ' + v.start + ' → ' + v.end + ' · 3 维宏量营养素 ' + balance.badge,
    content: buildNutritionRatioBlock(v),
    charts: v.totalCalorie > 0,
  });
}

/* ── 营养素深度（老实物 nutrition_detail.html：微量营养素 vs 推荐＋缺数据盒） ── */

/** 营养素深度区块（3 项固定 DRI 逐项一行：名称＋推荐＋累计＋日均＋占比）。 */
export function buildNutritionDetailBlock(v: NutritionDetailView): string {
  const parts: string[] = [
    renderKpiGrid([
      { label: '匹配餐数', value: String(v.matchedMeals), unit: '餐', detail: v.start + ' ~ ' + v.end },
      { label: '缺数据食物', value: String(v.missingFoods.length), unit: '种', detail: '未计入合计' },
      { label: '覆盖营养素', value: String(v.items.length), unit: '项', detail: '纤维/钠/糖（固定 DRI）' },
    ]),
    renderDataTable({
      columns: [
        { key: 'label', label: '营养素' },
        { key: 'value', label: '累计', align: 'right' },
        { key: 'avg', label: '日均', align: 'right' },
        { key: 'good', label: '推荐' },
        { key: 'pct', label: '占比%', align: 'right' },
        { key: 'status', label: '状态' },
      ],
      rows: v.items.map((it) => ({
        label: it.label,
        value: it.value + it.unit,
        avg: it.avg + it.unit + '/天',
        good: it.good,
        pct: it.pct,
        status: it.status === 'ok' ? '✓' : '↑ 超标',
      })),
      caption: '微量营养素 vs 推荐（百分比＝日均 vs 每日推荐，沿旧 D5.4 口径）',
      emptyText: '本窗无营养素数据',
    }),
  ];
  if (v.missingFoods.length > 0) {
    // 老实物的 `.warn-box` 一句话（名单逐字列出，不另开名单表）。
    parts.push(notice({
      icon: 'warn',
      title: '缺数据食物（共 ' + v.missingFoods.length + ' 种，未计入）',
      msg: '⚠ 缺数据食物 ' + v.missingFoods.length + ' 种,未在食品库找到营养数据,未计入: ' + v.missingFoods.join('、'),
      detail: '建议用「存食品」补录',
    }));
  }
  parts.push(sourceLine('food_log × nutrition_products(按食物名折算)'));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.nutrition-detail',
      data: {
        metrics: metricsOf({
          days: v.days,
          matchedMeals: v.matchedMeals,
          missingFoods: v.missingFoods.length,
          fiberAvg: v.items[0]?.avg,
          sodiumAvg: v.items[1]?.avg,
          sugarAvg: v.items[2]?.avg,
          fiberPct: v.items[0]?.pct,
          sodiumPct: v.items[1]?.pct,
          sugarPct: v.items[2]?.pct,
        }),
      },
    },
  }));
  return parts.join('');
}

export function buildNutritionDetailDoc(v: NutritionDetailView): string {
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '🧪 营养素深度 ' + v.start + ' ~ ' + v.end,
    eyebrow: '看营养素深度 · ' + v.start + ' ~ ' + v.end + ' · ' + v.days + ' 天',
    subtitle: '纤维/钠/糖实际 vs 推荐（缺库食物明示未计入，不编数）',
    content: buildNutritionDetailBlock(v),
  });
}

/* ── 食品来源统计（老实物 source_stats.html：来源数＋总数＋按来源分组） ── */

export function buildSourceStatsDoc(v: SourceStatsView): string {
  const parts: string[] = [
    renderKpiGrid([
      { label: '来源数', value: String(v.sources), unit: '个' },
      { label: '食品总数', value: String(v.total), unit: '条', detail: 'nutrition_products（下架已排除）' },
    ]),
  ];
  let charts = false;
  if (v.items.length > 0) {
    parts.push(renderChartBlock({
      kind: 'bar',
      title: '按来源分组',
      input: { items: v.items.map((it) => ({ label: it.source, value: it.count })) },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'source', label: '来源' },
      { key: 'count', label: '条数', align: 'right' },
      { key: 'pct', label: '占比%', align: 'right' },
    ],
    rows: v.items.map((it) => ({ source: it.source, count: it.count, pct: it.pct })),
    caption: '按来源分组（GROUP BY source，下架已排除；空串来源归“未知”）',
    emptyText: '库内无食品记录',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.source-stats',
      data: {
        metrics: metricsOf({ total: v.total, sources: v.sources }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '食品来源统计',
    eyebrow: 'calorie.view.source-stats · 营养移植域',
    subtitle: '库内食品按来源分组计数（库空即 missing，不编数）',
    content: parts.join(''),
    charts,
  });
}

/* ── 今日饮水（老实物 today_water.html：今日进度环＋本周 7 天＋今日每杯） ── */

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

/** 今日饮水区块（进度环／7 天柱图／每杯明细三块，标题逐字取老实物的三个 h2）。 */
export function buildTodayWaterBlock(v: TodayWaterView): string {
  const remainText = v.remainMl > 0
    ? '还差 ' + v.remainMl + ' ml（占目标 ' + (100 - v.pct) + '%）'
    : (v.remainMl === 0 ? '已完成目标(100%)' : '超出目标 ' + (-v.remainMl) + ' ml(' + v.pct + '%)');
  const parts: string[] = [
    renderKpiGrid([
      { label: '今日饮水', value: String(v.todayMl), unit: 'ml', detail: v.date },
      { label: '目标', value: String(v.targetMl), unit: 'ml', detail: 'daily_goal.water_goal（缺省 2000）' },
      {
        label: '进度', value: String(v.pct) + '%', detail: remainText,
        status: v.remainMl <= 0 ? 'ok' : 'warn',
        statusText: v.remainMl > 0 ? '还差 ' + v.remainMl + ' ml' : (v.remainMl === 0 ? '已完成目标' : '超出 ' + (-v.remainMl) + ' ml'),
      },
    ]),
    // 今日进度（老实物的进度环 → 冻结 donut 单段；中心数值老实物在 ring-center，这里走 centerValue）。
    renderChartBlock({
      kind: 'donut',
      title: '今日进度',
      input: {
        items: [
          { label: '已喝', value: Math.min(v.todayMl, v.targetMl) },
          { label: '未喝', value: Math.max(v.targetMl - v.todayMl, 0) },
        ],
        options: {
          size: 200, ringWidth: 14, legend: 'none', showPercent: false,
          centerLabel: '今日饮水', centerValue: v.todayMl.toLocaleString(),
        },
      },
    }),
  ];
  if (v.weekMl.some((ml) => ml > 0)) {
    // 本周 7 天（老实物的 7 根柱：柱上标 ml、柱下标星期，含今日那天）。
    parts.push(renderChartBlock({
      kind: 'bar',
      title: '本周 7 天（' + (v.weekDates[0] ?? '') + ' ~ ' + v.date + '）',
      input: {
        items: v.weekMl.map((ml, i) => ({
          label: (v.weekDates[i] ?? '').slice(5) + '（' + WEEKDAY[weekdayOf(v.weekDates[i] ?? '')] + '）',
          value: ml,
        })),
        options: { showValues: true },
      },
    }));
  } else {
    parts.push(renderEmptyBlock({
      title: '本周 7 天',
      text: '7 天窗内没有饮水记录（' + (v.weekDates[0] ?? '') + ' ~ ' + v.date + '）',
    }));
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'time', label: '时间' },
      { key: 'ml', label: '饮水量ml', align: 'right' },
    ],
    rows: v.cups.map((c) => ({ time: c.time === '' ? '—' : c.time, ml: c.ml })),
    caption: '今日每杯（共 ' + v.cups.length + ' 杯）',
    emptyText: '今天还没有喝水记录',
  }));
  parts.push(sourceLine(' calorie_data.db · food_log(💧水) · ' + v.date));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.today-water',
      data: {
        metrics: metricsOf({
          todayMl: v.todayMl, targetMl: v.targetMl, pct: v.pct, remainMl: v.remainMl, cups: v.cups.length,
        }),
      },
    },
  }));
  return parts.join('');
}

/** 星期下标（`日`..`六`）；按 UTC 取，避开时区把日期挪一天。非法日期回落 `日`。 */
function weekdayOf(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return 0;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
}

export function buildTodayWaterDoc(v: TodayWaterView): string {
  const sub = v.remainMl > 0
    ? '还差 ' + v.remainMl + ' ml'
    : (v.remainMl === 0 ? '已完成目标(100%)' : '已达标 ' + (-v.remainMl) + ' ml(' + v.pct + '%)');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '💧 今日饮水 ' + v.date,
    eyebrow: v.date + ' · 饮水 #1',
    subtitle: '查今天喝水 · ' + v.date + ' · ' + sub,
    content: buildTodayWaterBlock(v),
    charts: true,
  });
}

/* ── 饮食总览（老实物 diet_overview.html：本周累计＋本月累计，统计到昨日、不含今日） ── */

/** 一段周期（老实物两个 `.period` 卡片：标题＋区间行＋4 张 KPI＋每日热量柱图）。 */
function overviewPeriodBlock(name: string, p: DietOverviewPeriod): string {
  if (p.days === 0) {
    return renderEmptyBlock({ title: name, text: '窗口还没有自然日（今天正是窗口首日），累计从明天起算' });
  }
  const cards = renderKpiGrid([
    { label: '总热量', value: String(p.totalCalorie), unit: '卡', detail: p.start + ' ~ ' + p.end },
    { label: '日均热量', value: String(p.avgCalorie), unit: '卡/天', detail: '分母＝窗口 ' + p.days + ' 天' },
    { label: '总蛋白', value: String(p.totalProtein), unit: 'g' },
    { label: '有记录天数', value: String(p.loggedDays), unit: '天', detail: '共 ' + p.days + ' 天' },
  ]);
  const chart = p.daily.some((d) => d.calorie > 0)
    ? renderChartBlock({
      kind: 'bar',
      title: '每日热量(卡)（每根柱 = 一天 · 无记录天为 0）',
      input: { items: p.daily.map((d) => ({ label: d.date.slice(5), value: d.calorie })) },
    })
    : renderEmptyBlock({ title: '每日热量(卡)', text: name + '窗内没有饮食记录（不编数）' });
  return renderDisclosure({
    title: name + '（' + p.start + ' ~ ' + p.end + ' · 共 ' + p.days + ' 天）',
    contentHtml: cards + chart,
    open: true,
  });
}

/** 看饮食总览区块（**服务 `calorie.view.diet`**，作者＝#271：取数调 `buildDietOverviewView(db, date)`，
 *  本函数只装块、不集成）。本块含柱图 ⇒ 宿主页 `assembleDocPage` 的 `charts` 传 `true`。 */
export function buildDietOverviewBlock(v: DietOverviewView): string {
  return [
    notice({
      icon: 'info',
      msg: '统计到昨日 · ' + v.today,
      detail: '本周／本月都到昨日为止（不含今日），今日的饮食由「看今日饮食概览」承接',
    }),
    overviewPeriodBlock('本周累计', v.week),
    overviewPeriodBlock('本月累计', v.month),
    sourceLine('food_log · 周期累计 · 统计到昨日'),
  ].join('');
}
