/** #113 · 趋势 2＋其他 6 移植 8 键 HTML 填充器（t71 需移植八模板的展示面）。
 *
 * 包裹约定（沿 #111/#112，不新增）：
 * sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs，图表 CSS 由其运行时注入）。
 * 复制文本一律 buildDataText（#77 契约）：stat 投影 metrics 只收确定数字。
 * 本层不做取数（数据由 render/trendMiscPort.ts 备齐），不返空（缺失由数据层抛 missing-data）。
 */
import {
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
  renderParamForm,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import type {
  BatchImportPreviewView,
  CalorieTrendView,
  LintHealthView,
  LongTrendView,
  NutritionAnalysisView,
  ProcessProgressView,
  ReviewTemplateView,
  SixFactorsView,
} from './trendMiscPort.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·趋势其他移植';

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
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

/* ── 热量趋势（calorie_trend：T7 口径日序列＋达标统计） ── */

export function buildCalorieTrendDoc(v: CalorieTrendView): string {
  const s = v.data.summary;
  const trendLabel = s.trend === 'down' ? '↓ 下降' : (s.trend === 'up' ? '↑ 上升' : '→ 平稳');
  const parts: string[] = [
    windowForm(v.start, v.end, 'T5 buildSeries 唯一源（水已排除）；达标＝单日≤目标×1.05'),
    renderKpiGrid([
      { label: '日均', value: String(s.avg), unit: '卡', detail: '目标 ' + s.target + '卡' },
      { label: '趋势', value: trendLabel, detail: '窗首 ' + s.startAvg + ' → 窗尾 ' + s.endAvg + '（差 ' + s.trendValue + '）' },
      { label: '达标天数', value: String(s.compliantDays), unit: '天', detail: '达标率 ' + Math.round(s.complianceRate * 100) + '%' },
      { label: '周末−工作日', value: String(s.weekendDiff), unit: '卡', detail: '工作日 ' + s.weekdayAvg + '／周末 ' + s.weekendAvg },
    ]),
    renderChartBlock({
      kind: 'line',
      title: '每日热量',
      input: { items: v.data.series.map((d) => ({ label: d.date.slice(5), value: d.calorie })) },
    }),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.calorie-trend',
        data: {
          metrics: metricsOf({
            avg: s.avg, target: s.target, trendValue: s.trendValue,
            startAvg: s.startAvg, endAvg: s.endAvg, weekdayAvg: s.weekdayAvg,
            weekendAvg: s.weekendAvg, weekendDiff: s.weekendDiff,
            compliantDays: s.compliantDays, complianceRate: s.complianceRate,
          }),
        },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '热量趋势 ' + v.start + ' ~ ' + v.end,
    eyebrow: 'calorie.view.calorie-trend · 趋势其他移植域',
    subtitle: '日序列＋趋势方向＋达标统计（空窗阻断，不编数）',
    content: parts.join(''),
    charts: true,
  });
}

/* ── 整体趋势（long_trend：体重＋热量双序列） ── */

export function buildLongTrendDoc(v: LongTrendView): string {
  const parts: string[] = [
    renderKpiGrid([
      { label: '日均热量', value: String(v.avgCalorie), unit: '卡', detail: v.start + ' ~ ' + v.end },
      {
        label: '体重变化', value: fmt(v.weightChange), unit: v.weightChange === null ? '' : 'kg',
        detail: v.weightChange === null ? '窗内称重不足 2 次' : '窗首→窗尾',
        status: v.weightChange === null ? undefined : (v.weightChange < 0 ? 'ok' : (v.weightChange > 0 ? 'warn' : undefined)),
      },
      { label: '窗口', value: String(v.windowDays), unit: '天', detail: '分组 ' + v.group },
    ]),
    renderChartBlock({
      kind: 'line',
      title: '每日热量（' + v.windowDays + ' 天）',
      input: { items: v.days.map((d) => ({ label: d.date.slice(5), value: d.calorie })) },
    }),
  ];
  let charts = true;
  const weighed = v.days.filter((d) => d.weightKg !== null);
  if (weighed.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '体重轨迹（共 ' + weighed.length + ' 次称重）',
      input: { items: weighed.map((d) => ({ label: d.date.slice(5), value: d.weightKg })) },
    }));
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'calorie', label: '热量卡', align: 'right' },
      { key: 'weight', label: '体重kg', align: 'right' },
    ],
    rows: v.days.map((d) => ({ date: d.date, calorie: d.calorie, weight: fmt(d.weightKg) })),
    caption: '逐日明细（' + v.start + ' ~ ' + v.end + '）',
    emptyText: '本窗无明细',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.long-trend',
      data: {
        metrics: metricsOf({ windowDays: v.windowDays, avgCalorie: v.avgCalorie, weightChange: v.weightChange }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '整体趋势（' + v.windowDays + ' 天）',
    eyebrow: 'calorie.view.long-trend · 趋势其他移植域',
    subtitle: '体重＋热量双序列（称重不足 2 次则体重变化明示缺失）',
    content: parts.join(''),
    charts,
  });
}

/* ── 营养分析（nutrition_analysis：宏量占比＋微量 vs 推荐＋规则建议） ── */

export function buildNutritionAnalysisDoc(v: NutritionAnalysisView): string {
  const parts: string[] = [
    windowForm(v.start, v.end, '宏量占比＝蛋白/碳水×4、脂肪×9 除以总热量；微量＝日均 vs 每日推荐'),
    renderKpiGrid([
      { label: '蛋白', value: String(v.proteinG), unit: 'g', detail: v.proteinPct + '%（建议 10~20%）' },
      { label: '碳水', value: String(v.carbG), unit: 'g', detail: v.carbPct + '%（建议 45~65%）' },
      { label: '脂肪', value: String(v.fatG), unit: 'g', detail: v.fatPct + '%（建议 20~35%）' },
      { label: '总摄入', value: String(v.totalCalorie), unit: '卡', detail: v.days + ' 天' },
    ]),
    renderDataTable({
      columns: [
        { key: 'label', label: '微量' },
        { key: 'avg', label: '日均', align: 'right' },
        { key: 'good', label: '推荐' },
        { key: 'status', label: '状态' },
      ],
      rows: [
        {
          label: '膳食纤维', avg: v.fiberAvg + 'g', good: '≥25g/天',
          status: v.fiberAvg >= 25 ? '✓' : '↓ 不足',
        },
        {
          label: '钠', avg: v.sodiumAvg + 'mg', good: '≤2000mg/天',
          status: v.sodiumAvg <= 2000 ? '✓' : '↑ 超标',
        },
        {
          label: '糖', avg: v.sugarAvg + 'g', good: '≤50g/天',
          status: v.sugarAvg <= 50 ? '✓' : '↑ 超标',
        },
      ],
      caption: '微量营养素 vs 推荐',
      emptyText: '本窗无微量数据',
    }),
  ];
  let charts = false;
  if (v.totalCalorie > 0) {
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
  parts.push(renderDisclosure({
    title: '分析建议（共 ' + v.advice.length + ' 条，由窗内数据规则派生）',
    contentHtml: renderListRows({
      items: v.advice.map((a, i) => ({ left: String(i + 1), main: a, right: '' })),
    }),
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.nutrition-analysis',
      data: {
        metrics: metricsOf({
          days: v.days, totalCalorie: v.totalCalorie,
          proteinG: v.proteinG, proteinPct: v.proteinPct,
          carbG: v.carbG, carbPct: v.carbPct, fatG: v.fatG, fatPct: v.fatPct,
          fiberAvg: v.fiberAvg, sodiumAvg: v.sodiumAvg, sugarAvg: v.sugarAvg,
          adviceCount: v.advice.length,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '营养分析 ' + v.start + ' ~ ' + v.end,
    eyebrow: 'calorie.view.nutrition-analysis · 趋势其他移植域',
    subtitle: '配比＋微量＋规则建议（建议阈值见数据层注释，不编造结论）',
    content: parts.join(''),
    charts,
  });
}

/* ── 每日六因素（six_factors） ── */

export function buildSixFactorsDoc(v: SixFactorsView): string {
  const parts: string[] = [
    renderKpiGrid(v.factors.map((f) => ({
      label: f.label, value: f.ok ? '✓' : '✗', detail: f.detail,
      status: f.ok ? 'ok' : 'warn' as 'ok' | 'warn',
    }))),
    renderDataTable({
      columns: [
        { key: 'label', label: '因素' },
        { key: 'ok', label: '达标' },
        { key: 'detail', label: '依据' },
      ],
      rows: v.factors.map((f) => ({ label: f.label, ok: f.ok ? '✓' : '✗', detail: f.detail })),
      caption: '六因素明细（' + v.date + '，得分 ' + v.score + '/6）',
      emptyText: '当日无因素数据',
    }),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.six-factors',
        data: {
          metrics: metricsOf({
            score: v.score,
            calorie: v.factors[0]?.ok ? 1 : 0,
            protein: v.factors[1]?.ok ? 1 : 0,
            water: v.factors[2]?.ok ? 1 : 0,
            exercise: v.factors[3]?.ok ? 1 : 0,
            weigh: v.factors[4]?.ok ? 1 : 0,
            meals: v.factors[5]?.ok ? 1 : 0,
          }),
        },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '每日六因素 ' + v.date,
    eyebrow: 'calorie.view.six-factors · 趋势其他移植域',
    subtitle: '热量/蛋白/饮水/运动/称重/三餐（无目标项明示，不编数）',
    content: parts.join(''),
    charts: false,
  });
}

/* ── 数据健康检查（lint_health） ── */

export function buildLintHealthDoc(v: LintHealthView): string {
  const parts: string[] = [
    renderKpiGrid([
      {
        label: '问题总数', value: String(v.issueCount), unit: '项',
        detail: v.issueCount === 0 ? '数据健康' : '见下表明细',
        status: v.issueCount === 0 ? 'ok' : 'warn',
      },
    ]),
    renderDataTable({
      columns: [
        { key: 'label', label: '检查项' },
        { key: 'count', label: '数量', align: 'right' },
        { key: 'detail', label: '明细' },
      ],
      rows: v.checks.map((c) => ({ label: c.label, count: c.count, detail: c.detail })),
      caption: '健康检查明细（只读体检，不写库）',
      emptyText: '无检查项',
    }),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.lint-health',
        data: {
          metrics: metricsOf({
            issueCount: v.issueCount,
            unmatched: v.checks[0]?.count,
            badCalorie: v.checks[1]?.count,
            future: v.checks[2]?.count,
            duplicate: v.checks[3]?.count,
          }),
        },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '数据健康检查',
    eyebrow: 'calorie.view.lint-health · 趋势其他移植域',
    subtitle: '未匹配库/零负热量/未来日期/疑似重复（只读，不写库）',
    content: parts.join(''),
    charts: false,
  });
}

/* ── 批量导入预览（batch_import_preview） ── */

export function buildBatchImportPreviewDoc(v: BatchImportPreviewView): string {
  const parts: string[] = [
    renderKpiGrid([
      { label: '待导入', value: String(v.total), unit: '条' },
      { label: '已匹配库', value: String(v.matched), unit: '条', detail: '精确名匹配' },
      {
        label: '未匹配', value: String(v.missing), unit: '种',
        detail: v.missing === 0 ? '全部可入库' : '导入后建议补录',
        status: v.missing === 0 ? 'ok' : 'warn',
      },
      { label: '合计热量', value: String(v.totalCalorie), unit: '卡' },
    ]),
    renderDataTable({
      columns: [
        { key: 'foodName', label: '食物' },
        { key: 'calories', label: '热量卡', align: 'right' },
        { key: 'lib', label: '库热量', align: 'right' },
        { key: 'status', label: '匹配' },
      ],
      rows: v.items.map((it) => ({
        foodName: it.foodName, calories: it.calories,
        lib: fmt(it.libCalories), status: it.matched ? '✓' : '✗ 缺库',
      })),
      caption: '逐条预览（仅预览，不写库）',
      emptyText: '无待导入条目',
    }),
  ];
  if (v.missingNames.length > 0) {
    parts.push(renderDisclosure({
      title: '缺库食物（共 ' + v.missingNames.length + ' 种）',
      contentHtml: renderListRows({
        items: v.missingNames.map((name) => ({ left: name, main: '未在食品库找到', right: '建议用「存食品」补录' })),
      }),
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.batch-import-preview',
      data: {
        metrics: metricsOf({
          total: v.total, matched: v.matched, missing: v.missing, totalCalorie: v.totalCalorie,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '批量导入预览',
    eyebrow: 'calorie.view.batch-import-preview · 趋势其他移植域',
    subtitle: '库匹配＋合计试算（仅预览，不写库；确认后走 diet.batch 写入）',
    content: parts.join(''),
    charts: false,
  });
}

/* ── 落地训练进度（process_progress） ── */

export function buildProcessProgressDoc(v: ProcessProgressView): string {
  const parts: string[] = [
    renderKpiGrid([
      { label: '训练计划', value: v.hasPlan ? '有' : '无', detail: v.title ?? '未配置计划' },
      { label: '计划训练日', value: String(v.plannedDays), unit: '天', detail: v.totalWeeks === null ? '' : '共 ' + v.totalWeeks + ' 周' },
      { label: '近7天运动', value: String(v.sessions7d), unit: '次', detail: v.start + ' ~ ' + v.end },
      { label: '近7天时长', value: String(v.minutes7d), unit: '分钟' },
    ]),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.process-progress',
        data: {
          metrics: metricsOf({
            hasPlan: v.hasPlan ? 1 : 0, plannedDays: v.plannedDays,
            sessions7d: v.sessions7d, minutes7d: v.minutes7d,
          }),
        },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '落地训练进度',
    eyebrow: 'calorie.view.process-progress · 趋势其他移植域',
    subtitle: '计划配置＋近 7 天执行（无计划且无执行即阻断）',
    content: parts.join(''),
    charts: false,
  });
}

/* ── 复盘报告（review_template） ── */

export function buildReviewTemplateDoc(v: ReviewTemplateView): string {
  const parts: string[] = [
    windowForm(v.start, v.end, '饮食/运动/体重三面小结；记餐偏疏时结论明示仅供参考'),
    renderKpiGrid([
      { label: '记餐', value: String(v.meals), unit: '餐', detail: v.days + ' 天' },
      { label: '日均热量', value: String(v.avgCalorie), unit: '卡', detail: v.goalCalorie === null ? '无目标' : '目标 ' + v.goalCalorie + '卡' },
      { label: '运动', value: String(v.sessions), unit: '次', detail: v.minutes + ' 分钟' },
      {
        label: '体重变化', value: fmt(v.weightChange), unit: v.weightChange === null ? '' : 'kg',
        detail: v.weightChange === null ? '称重不足 2 次' : '窗首→窗尾',
      },
    ]),
    renderDisclosure({
      title: '复盘要点（共 ' + v.points.length + ' 条，由窗内数据派生）',
      contentHtml: renderListRows({
        items: v.points.map((p, i) => ({ left: String(i + 1), main: p, right: '' })),
      }),
    }),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.review-template',
        data: {
          metrics: metricsOf({
            days: v.days, meals: v.meals, avgCalorie: v.avgCalorie,
            sessions: v.sessions, minutes: v.minutes, weightChange: v.weightChange,
            points: v.points.length,
          }),
        },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '复盘报告 ' + v.start + ' ~ ' + v.end,
    eyebrow: 'calorie.view.review-template · 趋势其他移植域',
    subtitle: '三面小结＋派生要点（要点为规则输出，非 AI 建议）',
    content: parts.join(''),
    charts: false,
  });
}
