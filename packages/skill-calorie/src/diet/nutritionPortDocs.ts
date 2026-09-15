/** #112 · 营养移植 3 页全文档装配（数据→区块→填充器）；#275 起按老实物重做内容与字段。
 *
 * 服务 3 条命令（声明住 `./commands.ts`）：
 *   · `calorie.view.nutrition-ratio`（查营养配比）→ `buildNutritionRatioDoc`
 *   · `calorie.view.nutrition-detail`（看营养素深度／看营养素明细）→ `buildNutritionDetailDoc`
 *   · `calorie.view.today-water`（看今日喝水／看今日饮水）→ `buildTodayWaterDoc`
 *
 * `calorie.view.source-stats`（看食品来源统计／看食品来源分布）原住本件，**已按编排者 2026-09-15 裁定 (b)
 * 搬进姊妹件 `./sourceStatsDocs.ts`**（⑤ 食品库类页归 #274、⑥ 营养类页归 #275；那一步也正是本包台账给本件
 * 写好的拆法第一步）。本件只剩 ⑥ 类的三支。
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
  renderCaliberLine,
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

/** 同源入口页的**入口标记**（两条唤醒词共用同一条命令时的页头开关）。
 *
 *  #511 · 两组「同源入口页」在命令面上完全同形，参数也一字不差，命令这一层分不出进来的是哪条词
 *  （审查件第 80 条「78 与 38 逐行相同」、第 81 条「80 与 24 逐行相同」）：
 *    · `calorie.view.nutrition-detail` ← 看营养素深度 ／ 看营养素明细；
 *    · `calorie.view.today-water`     ← 看今日喝水 ／ 看今日饮水。
 *  作者裁定一：两个入口都留，各自标题对上进来的那条词。做法沿 #509 的 `source:'photo'`——
 *  由**入口自己**（`src/diet/routes.ts` 的路由记录）把标记带进命令，命令侧只拿它取页头。
 *  标记名绝不上屏、不写库、不进 `writtenFields`；不给标记时页头与从前一字不差。 */
export const ENTRY_DETAIL = 'detail';
export const ENTRY_DRINK = 'drink';

/* ── 营养配比（老实物 nutrition_ratio.html：3 维配比 KPI＋热量来源占比＋推荐范围对比） ── */

/** 3 维配比的均衡档（老实物 `nutrition_ratio.html` 的 statusBadge 三档文案逐字）。 */
const BALANCE = {
  good: { text: '均衡', badge: '✓ 均衡', status: 'ok' },
  warn: { text: '失衡', badge: '⚠ 失衡', status: 'warn' },
  bad: { text: '严重失衡', badge: '✗ 严重失衡', status: 'danger' },
} as const;

/** 配比卡的值说明：占比 ＋ 每日目标。
 *
 *  #496 · 原文是「30% · 目标 —g」——`—` 是空值占位，紧贴着 `g` 会被读成「30 就是 30 克」
 *  （审查件第 76 条）。没设目标时明说没设；有目标时把单位写成「克」，不再让 `g` 单挂在一个数后面。 */
function goalDetail(pct: number, targetG: number | null): string {
  return '占 ' + pct + '% · ' + (targetG === null ? '未设定每天目标' : '每天目标 ' + fmt(targetG) + ' 克');
}

/** 热量来源占比那张环图的共用口径句：说清环上的数是**按营养素折算**出来的、与另一处的
 *  「总摄入」为什么可能对不上。
 *
 *  #496 · 这张图原来的中心写「总热量 1,916」（记录热量合计），环上的图例却是
 *  「蛋白 576 65%／脂肪 315 35%」——65%／35% 的分母是 891（蛋白 576 ＋ 碳水 0 ＋ 脂肪 315），
 *  跟 1,916 不是同一个数，两处并排互相矛盾（审查件第 77、83 条）。改法：中心改标**折算合计**
 *  （环图自己的分母），图下把这句口径说出来，读者不用自己算。 */
function kcalNote(totalCalorie: number | null): string {
  const half = '占比按营养素折算：蛋白和碳水每克 4 千卡、脂肪每克 9 千卡，环上的数就是这三个数折算出来的热量。';
  if (totalCalorie === null) return half;
  return half + '它与按每条记录的热量合计出来的总摄入（' + totalCalorie.toLocaleString()
    + ' 千卡）不是同一个数——记录里的热量是各条自己报的值。';
}

/** 营养配比区块（**服务 `calorie.view.diet-review`**，作者＝#273：「看营养结构」按老 SKILL 也出这张页，
 *  老模板 `templates/nutrition_ratio.html`；#273 把它嵌进复盘页。本件只交付，不集成）。 */
export function buildNutritionRatioBlock(v: NutritionRatioView): string {
  const balance = BALANCE[v.balance];
  const parts: string[] = [
    /* #511 · 三张配比卡的值单位原写 `g`（审查件第 78 条那一处的同族写法），改「克」与下面那张
       推荐范围对比表统一；说明行早已是「每天目标 N 克」（#496 的 `goalDetail`）。 */
    renderKpiGrid([
      { label: '蛋白', value: String(v.proteinG), unit: '克', detail: goalDetail(v.proteinPct, v.targetProteinG) },
      { label: '碳水', value: String(v.carbG), unit: '克', detail: goalDetail(v.carbPct, v.targetCarbG) },
      { label: '脂肪', value: String(v.fatG), unit: '克', detail: goalDetail(v.fatPct, v.targetFatG) },
      {
        label: '总摄入', value: String(v.totalCalorie), unit: '卡',
        detail: '共 ' + v.days + ' 天 · ' + balance.text,
        status: balance.status,
        statusText: balance.badge,
      },
    ]),
  ];
  if (v.totalCalorie > 0) {
    // 热量来源占比（老实物的饼图＋自定义图例 → 冻结 donut：中心给折算合计，占比由 showPercent 给）。
    const folded = v.proteinG * 4 + v.carbG * 4 + v.fatG * 9;
    parts.push(renderChartBlock({
      kind: 'donut',
      title: '热量来源占比（按营养素折算）',
      input: {
        items: [
          { label: '蛋白（千卡）', value: v.proteinG * 4 },
          { label: '碳水（千卡）', value: v.carbG * 4 },
          { label: '脂肪（千卡）', value: v.fatG * 9 },
        ],
        options: {
          showPercent: true, centerLabel: '折算合计（千卡）', centerValue: String(Math.round(folded)),
        },
      },
    }));
    parts.push(renderCaliberLine(kcalNote(v.totalCalorie)));
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
    const gap = it.g > maxG ? '+' + (it.g - maxG) + ' 克' : (it.g < minG ? '-' + (minG - it.g) + ' 克' : '✓');
    /* #511 · 下限／上限两列原写 `10%（48g）`——`g` 是英文缩写，且括号里的克数是**整窗合计**、
       读者会当成一天的量（审查件第 78 条）。单位改「克」，并把「这一列是几天合计」写进格子；
       表题再补一句同口径，免得逐格都读一遍才知道分母。 */
    const span = ' 克 / ' + v.days + ' 天';
    return {
      name: it.name,
      actual: it.g + ' 克（' + it.pct + '%）',
      lower: it.r.min + '%（' + minG + span + '）',
      upper: it.r.max + '%（' + maxG + span + '）',
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
    /* #511 · 表题补一句「克数都是这 N 天合计」（审查件第 78 条：括号里的 48 克是 7 天合计，
       读者会当成一天）。 */
    caption: '推荐范围对比（' + v.start + ' ~ ' + v.end + '；克数均为这 ' + v.days + ' 天合计）',
    emptyText: '本窗无配比数据',
  }));
  parts.push(sourceLine('📊 数据来自本机饮食记录 · ' + v.days + ' 天'));
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
    eyebrow: '卡路里 · 饮食',
    /* #496 · 原副题「3 维宏量营养素 ⚠ 失衡」把引擎里的叫法（3 维／宏量营养素）带给读者
       （审查件第 75 条）；改成一句人话，把「哪三项」「失衡是什么意思」写清楚。 */
    subtitle: '三大营养素（蛋白／碳水／脂肪）比例' + (balance.badge.includes('失衡') ? '不在推荐范围' : '在推荐范围内'),
    content: buildNutritionRatioBlock(v),
    charts: v.totalCalorie > 0,
  });
}

/* ── 营养素深度（老实物 nutrition_detail.html：微量营养素 vs 推荐＋缺数据盒） ── */

/** 营养素深度区块（3 项固定推荐量逐项一行：名称＋推荐＋累计＋日均＋占比）。
 *
 *  #496 · 三处内部说法改人话（审查件第 51、52、54、55 条）：`DRI` 缩写、`沿旧 D5.4 口径`
 *  版本号、「累计 vs 日均」分不清；「vs」也不是中文。列头按审查件建议写全，口径句重写一句。 */
export function buildNutritionDetailBlock(v: NutritionDetailView): string {
  const parts: string[] = [
    renderKpiGrid([
      { label: '匹配餐数', value: String(v.matchedMeals), unit: '餐', detail: v.start + ' ~ ' + v.end },
      { label: '缺数据食物', value: String(v.missingFoods.length), unit: '种', detail: '未计入合计' },
      { label: '覆盖营养素', value: String(v.items.length), unit: '项', detail: '膳食纤维、钠、糖（每天推荐量固定，不随饮食变化）' },
    ]),
    renderDataTable({
      columns: [
        { key: 'label', label: '营养素' },
        { key: 'value', label: '累计（' + v.days + ' 天）', align: 'right' },
        { key: 'avg', label: '每天平均', align: 'right' },
        { key: 'good', label: '每天推荐', align: 'right' },
        { key: 'pct', label: '完成度', align: 'right' },
        { key: 'status', label: '状态' },
      ],
      rows: v.items.map((it) => ({
        label: it.label,
        value: it.value + it.unit,
        avg: it.avg + it.unit + '/天',
        good: it.good,
        pct: it.pct + '%',
        status: it.status === 'ok' ? '✓ 够了' : '↑ 超标',
      })),
      caption: '完成度＝每天平均摄入 ÷ 每天推荐量',
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
  parts.push(sourceLine('📊 数据来自本机饮食记录，按食品名对照本机食品库的营养值'));
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

export function buildNutritionDetailDoc(v: NutritionDetailView, entry?: string): string {
  /* #511 · 页头按进来的那条唤醒词出：`看营养素明细` 那一支出「营养素明细」，`看营养素深度`
     那一支（不给标记）出「营养素深度」——两条入口都留，不再出两张一样的页（审查件第 80 条）。 */
  const detail = entry === ENTRY_DETAIL;
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: (detail ? '🧪 营养素明细 ' : '🧪 营养素深度 ') + v.start + ' ~ ' + v.end,
    /* #496 · 眉标原写「看营养素深度 · 区间 · N 天」——把唤醒词与窗口区间印了一遍（审查件第 80 条）。
       区间已在标题里，眉标只留人话归属；「缺库食物明示未计入，不编数」也是内部语气，改成读者的话。 */
    eyebrow: '卡路里 · 饮食',
    subtitle: detail
      ? '与「看营养素深度」同源：同一份数据，膳食纤维、钠、糖逐项一行，累计／每天平均／每天推荐／完成度都在下面的表里'
      : '膳食纤维、钠、糖每天平均摄入与每天推荐量的对比（食品库里查不到营养值的食物不计入）',
    content: buildNutritionDetailBlock(v),
  });
}

/* ── 食品来源统计：**已按编排者 2026-09-15 裁定 (b) 搬出本件**，见 `./sourceStatsDocs.ts` ──
   ⑤ 食品库类页（#274）与 ⑥ 营养类页（#275）的归属按页面类划；本件只留 ⑥ 类的三支。 */

/* ── 今日饮水（老实物 today_water.html：今日进度环＋本周 7 天＋今日每杯） ── */

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

/** 今日饮水区块（进度环／7 天柱图／每杯明细三块，标题逐字取老实物的三个 h2）。
 *  `name`＝这一页的正文叫法（「今日喝水」／「今日饮水」，由入口标记定，见 `ENTRY_DRINK`）。 */
export function buildTodayWaterBlock(v: TodayWaterView, name: string): string {
  const remainText = v.remainMl > 0
    ? '还差 ' + v.remainMl + ' ml（占目标 ' + (100 - v.pct) + '%）'
    : (v.remainMl === 0 ? '已完成目标(100%)' : '超出目标 ' + (-v.remainMl) + ' ml(' + v.pct + '%)');
  const parts: string[] = [
    renderKpiGrid([
      { label: name, value: String(v.todayMl), unit: 'ml', detail: v.date },
      /* #496 · 原写 `daily_goal.water_goal（缺省 2000）`——库表名＋列名＋「缺省」都是源码词。 */
      { label: '目标', value: String(v.targetMl), unit: 'ml', detail: '没设过就是 2000 ml' },
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
          centerLabel: name, centerValue: v.todayMl.toLocaleString(),
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
  parts.push(sourceLine('📊 数据来自本机饮水记录 · ' + v.date));
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

export function buildTodayWaterDoc(v: TodayWaterView, entry?: string): string {
  const sub = v.remainMl > 0
    ? '还差 ' + v.remainMl + ' ml'
    : (v.remainMl === 0 ? '已完成目标(100%)' : '已达标 ' + (-v.remainMl) + ' ml(' + v.pct + '%)');
  /* #511 · 页头与正文的饮水叫法都按进来的那条唤醒词出：`看今日喝水` 那一支出「今日喝水」，
     `看今日饮水` 那一支（不给标记）出「今日饮水」——两条入口都留，不再出两张一样的页
     （审查件第 81 条）。#496 当年把两页统一叫「今日饮水」，这一处按作者裁定一改回来。 */
  const drink = entry === ENTRY_DRINK;
  const name = drink ? '今日喝水' : '今日饮水';
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '💧 ' + name + ' ' + v.date,
    /* #496 · 眉标原写「<日期> · 饮水 #1」——把日期又抄一遍、`#1` 是内部形态号。 */
    eyebrow: '卡路里 · 饮食',
    subtitle: '今天的' + (drink ? '喝水' : '饮水') + ' · ' + sub,
    content: buildTodayWaterBlock(v, name),
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
    sourceLine('📊 数据来自本机饮食记录 · 统计到昨日'),
  ].join('');
}
