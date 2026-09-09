/** #112 · 营养移植 4 键全文档装配（数据→区块→填充器）。
 *
 * 范围（t71「需移植」之营养 4 项，#108 R4 记账回收）：`calorie.view.nutrition-ratio`
 * （nutrition_ratio：蛋白/碳水/脂肪占比＋实际 vs 目标）／`calorie.view.nutrition-detail`
 * （nutrition_detail：纤维/钠/糖 vs 推荐）／`calorie.view.source-stats`
 * （source_stats：GROUP BY 来源整表）／`calorie.view.today-water`
 * （today_water：累计/距目标/每杯时间/进度环）。
 * 不碰：批量导入预览／lint_health／营养六因子／nutrition_analysis／calorie_trend／
 * long_trend／process_progress／review_template（→ #113）／47 页已有（#108–#110 已关）／
 * 训练计划写键（#86）／HELP（#88）。
 *
 * 做法（#104 §4 用法，照抄 sportPortDocs 头 90 行）：内容 = base-paint/blocks 12 区块
 * （B-01 壳／B-02 KPI／B-03 表／B-04 图／B-05 列表／B-08 折叠／B-09 参数表单／
 * B-11 复制区），文档 = fillTemplate 包裹（资产裸文本＋填充器包裹；
 * sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs，图表 CSS 由其运行时注入）。
 * 复制文本一律 buildDataText（#77 契约）：stat 投影 metrics 只收确定数字。
 * 本层不做取数（数据由 render/nutritionPort.ts 备齐），不返空（缺失由数据层抛 missing-data）。
 */
import {
  blocksCss,
  renderChartBlock,
  renderCopyBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
  renderPageShell,
  renderParamForm,
} from 'base-paint/blocks';
import { buildChartsHelpersJs, buildDataText, buildSharedHelpersJs, buildStyleSheet, fillTemplate } from 'base-paint';
import type {
  NutritionDetailView,
  NutritionRatioView,
  SourceStatsView,
  TodayWaterView,
} from './nutritionPort.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 内容页壳（裸标记＋CONTENT 槽；包裹约定：资产裸文本＋填充器包裹，标记不得预包裹）。
 *  wrap 带 ilife-page 兼容既有 --html 断言。 */
const DOC_SHELL =
  '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
  '<title>卡路里·营养移植</title>\n<!--SHARED-CSS-->\n</head>\n<body>\n' +
  '<div class="wrap ilife-page">\n<!--CONTENT-->\n</div>\n<!--SHARED-HELPERS-->\n</body>\n</html>';

/** 图表页壳（多一个 CHARTS-HELPERS 标记，图表 CSS 由 charts helpers 运行时注入）。 */
const DOC_SHELL_CHARTS =
  '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
  '<title>卡路里·营养移植</title>\n<!--SHARED-CSS-->\n</head>\n<body>\n' +
  '<div class="wrap ilife-page">\n<!--CONTENT-->\n</div>\n<!--SHARED-HELPERS-->\n<!--CHARTS-HELPERS-->\n</body>\n</html>';

type CopyInput = Parameters<typeof buildDataText>[0];

function assemble(title: string, eyebrow: string, subtitle: string | null, content: string, charts: boolean): string {
  const assets: { sharedCssText: string; sharedHelpersJs: string; chartsHelpersJs?: string } = {
    sharedCssText: buildStyleSheet().css + '\n' + blocksCss(),
    sharedHelpersJs: buildSharedHelpersJs(),
  };
  if (charts) assets.chartsHelpersJs = buildChartsHelpersJs();
  const body = renderPageShell({
    title,
    ...(eyebrow ? { eyebrow } : {}),
    ...(subtitle ? { subtitle } : {}),
    content,
  });
  return fillTemplate({ template: charts ? DOC_SHELL_CHARTS : DOC_SHELL, assets, content: body }).html;
}

function copyBlock(title: string, input: CopyInput): string {
  return renderCopyBlock({ title, dataText: buildDataText(input) });
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

/** 复制投影 stat-metrics 只收确定数字（冻结口径：null/undefined 不进投影）。 */
function metricsOf(obj: Record<string, number | null | undefined>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

function windowForm(start: string, end: string, extra: string): string {
  return renderParamForm({
    fields: [
      { name: 'start', label: '开始', value: start },
      { name: 'end', label: '结束', value: end },
    ],
    description: extra,
  });
}

/* ── 营养配比（nutrition_ratio.html 对照：3 维配比＋热量来源占比＋推荐范围对比） ── */

export function buildNutritionRatioDoc(v: NutritionRatioView): string {
  const parts: string[] = [
    windowForm(v.start, v.end, '蛋白/碳水/脂肪窗内合计占比；水行（宏量全 0）已排除，数值无差'),
    renderKpiGrid([
      { label: '蛋白', value: String(v.proteinG), unit: 'g', detail: v.proteinPct + '% · 目标 ' + fmt(v.targetProteinG) + 'g' },
      { label: '碳水', value: String(v.carbG), unit: 'g', detail: v.carbPct + '% · 目标 ' + fmt(v.targetCarbG) + 'g' },
      { label: '脂肪', value: String(v.fatG), unit: 'g', detail: v.fatPct + '% · 目标 ' + fmt(v.targetFatG) + 'g' },
      {
        label: '总摄入', value: String(v.totalCalorie), unit: '卡',
        detail: v.days + ' 天 · ' + (v.balance === 'good' ? '均衡' : (v.balance === 'warn' ? '失衡' : '严重失衡')),
        status: v.balance === 'good' ? 'ok' : (v.balance === 'warn' ? 'warn' : 'danger'),
      },
    ]),
  ];
  let charts = false;
  if (v.totalCalorie > 0) {
    // 热量来源占比（旧模板饼图→冻结 donut；饼→donut，冻结层有 donut 接口，D8 不新增）。
    parts.push(renderChartBlock({
      kind: 'donut',
      title: '热量来源占比',
      input: {
        items: [
          { label: '蛋白', value: v.proteinG * 4 },
          { label: '碳水', value: v.carbG * 4 },
          { label: '脂肪', value: v.fatG * 9 },
        ],
        options: { showPercent: true },
      },
    }));
    charts = true;
  }
  // 推荐范围对比（下限/上限按总热量占比换算：蛋白/碳水 4kcal/g · 脂肪 9kcal/g；沿旧模板）。
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
  parts.push(copyBlock('复制数据', {
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
  return assemble(
    '营养配比 ' + v.start + ' ~ ' + v.end,
    'calorie.view.nutrition-ratio · 营养移植域',
    '蛋白/碳水/脂肪占比＋实际 vs 目标（无目标行即“—”，不编数）',
    parts.join(''),
    charts,
  );
}

/* ── 营养素深度（nutrition_detail.html 对照：纤维/钠/糖 vs 固定推荐＋缺数据盒） ── */

export function buildNutritionDetailDoc(v: NutritionDetailView): string {
  const parts: string[] = [
    windowForm(v.start, v.end, 'food_log × nutrition_products 按食物名精确折算（每 100g）；库匹配为精确名匹配，不做子串'),
    renderKpiGrid([
      { label: '匹配餐数', value: String(v.matchedMeals), unit: '餐', detail: v.start + ' ~ ' + v.end },
      { label: '缺数据食物', value: String(v.missingFoods.length), unit: '种', detail: '未计入（见下）' },
      { label: '覆盖营养素', value: String(v.items.length), unit: '项', detail: '纤维/钠/糖（固定 DRI）' },
    ]),
  ];
  const charts = false;
  parts.push(renderDataTable({
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
  }));
  if (v.missingFoods.length > 0) {
    parts.push(renderDisclosure({
      title: '缺数据食物（共 ' + v.missingFoods.length + ' 种，未计入）',
      contentHtml: renderListRows({
        items: v.missingFoods.map((name) => ({ left: name, main: '未在食品库找到营养数据', right: '建议用「存食品」补录' })),
      }),
    }));
  }
  parts.push(copyBlock('复制数据', {
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
  return assemble(
    '营养素深度 ' + v.start + ' ~ ' + v.end,
    'calorie.view.nutrition-detail · 营养移植域',
    '纤维/钠/糖实际 vs 推荐（缺库食物明示未计入，不编数）',
    parts.join(''),
    charts,
  );
}

/* ── 食品来源统计（source_stats.html 对照：来源数＋总数＋按来源分组） ── */

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
  parts.push(copyBlock('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.source-stats',
      data: {
        metrics: metricsOf({ total: v.total, sources: v.sources }),
      },
    },
  }));
  return assemble(
    '食品来源统计',
    'calorie.view.source-stats · 营养移植域',
    '库内食品按来源分组计数（库空即 missing，不编数）',
    parts.join(''),
    charts,
  );
}

/* ── 今日饮水（today_water.html 对照：进度环＋7 天＋每杯明细） ── */

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

export function buildTodayWaterDoc(v: TodayWaterView): string {
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'date', label: '日期', value: v.date }],
      description: '单日视图（7 天窗＝当天往前 6 个自然日，不做周一派生）',
    }),
    renderKpiGrid([
      { label: '今日饮水', value: String(v.todayMl), unit: 'ml', detail: v.date },
      { label: '目标', value: String(v.targetMl), unit: 'ml', detail: 'daily_goal.water_goal（缺省 2000）' },
      {
        label: '进度', value: String(v.pct) + '%',
        detail: v.remainMl > 0 ? '还差 ' + v.remainMl + ' ml' : (v.remainMl === 0 ? '已完成目标' : '超出目标 ' + -v.remainMl + ' ml'),
        status: v.pct >= 100 ? 'ok' : (v.pct >= 50 ? 'warn' : 'warn'),
      },
    ]),
  ];
  let charts = false;
  if (v.weekMl.some((ml) => ml > 0)) {
    // 进度环（旧模板 ring→冻结 donut 单段；中心数值由 KPI 承担）＋7 天 bar。
    parts.push(renderChartBlock({
      kind: 'donut',
      title: '今日进度',
      input: {
        items: [
          { label: '已喝', value: Math.min(v.todayMl, v.targetMl) },
          { label: '未喝', value: Math.max(v.targetMl - v.todayMl, 0) },
        ],
        options: { showPercent: true },
      },
    }));
    parts.push(renderChartBlock({
      kind: 'bar',
      title: '本周 7 天',
      input: {
        items: v.weekMl.map((ml, i) => ({
          label: (v.weekDates[i] ?? '').slice(5) + '（' + WEEKDAY[new Date((v.weekDates[i] ?? '') + 'T00:00:00').getDay()] + '）',
          value: ml,
        })),
      },
    }));
    charts = true;
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
  parts.push(copyBlock('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.today-water',
      data: {
        metrics: metricsOf({
          todayMl: v.todayMl, targetMl: v.targetMl, pct: v.pct, remainMl: v.remainMl, cups: v.cups.length,
        }),
      },
    },
  }));
  return assemble(
    '今日饮水 ' + v.date,
    'calorie.view.today-water · 营养移植域',
    v.remainMl > 0 ? '还差 ' + v.remainMl + ' ml' : '已达标（' + v.pct + '%）',
    parts.join(''),
    charts,
  );
}
