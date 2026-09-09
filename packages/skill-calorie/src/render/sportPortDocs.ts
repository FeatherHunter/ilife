/** #111 · 运动移植 6 键全文档装配（数据→区块→填充器）。
 *
 * 范围（t71「需移植」之运动 6 项）：`calorie.view.exercise-strength`
 * （exercise_strength：按动作聚合＋重量轨迹）／`calorie.view.exercise-cardio`
 * （exercise_cardio：按类型聚合＋配速）／`calorie.view.exercise-distribution`
 * （exercise_distribution：分类占比＋摄入/TDEE 联动）／
 * `calorie.view.exercise-recap`（exercise_recap：多窗复盘＋TOP5＋一句话）／
 * `calorie.view.exercise-review`（exercise_review：计划 vs 实绩）／
 * `calorie.view.exercise-trend`（exercise_trend：日序列＋周频次＋峰值）。
 * 不碰：process_progress（落地/训记二期，O3/oosLanding/oosXunji 命中但不执行，
 * 路由不动）／营养 4（→ #112）／趋势 2＋其他 6（→ #113）／47 页已有（#108–#110 已关）。
 *
 * 做法（#104 §4 用法，照抄 trendDocs 头 90 行）：内容 = base-paint/blocks 12 区块
 * （B-01 壳／B-02 KPI／B-03 表／B-04 图／B-05 列表／B-08 折叠／B-09 参数表单／
 * B-11 复制区），文档 = fillTemplate 包裹（资产裸文本＋填充器包裹；
 * sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs，图表 CSS 由其运行时注入）。
 * 复制文本一律 buildDataText（#77 契约）：stat 投影 metrics 只收确定数字。
 * 本层不做取数（数据由 render/exercisePort.ts 备齐），不返空（缺失由数据层抛 missing-data）。
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
  CardioView,
  DistributionView,
  RecapView,
  ReviewView,
  StrengthView,
  TrendView,
} from './exercisePort.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 内容页壳（裸标记＋CONTENT 槽；包裹约定：资产裸文本＋填充器包裹，标记不得预包裹）。
 *  wrap 带 ilife-page 兼容既有 --html 断言。 */
const DOC_SHELL =
  '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
  '<title>卡路里·运动移植</title>\n<!--SHARED-CSS-->\n</head>\n<body>\n' +
  '<div class="wrap ilife-page">\n<!--CONTENT-->\n</div>\n<!--SHARED-HELPERS-->\n</body>\n</html>';

/** 图表页壳（多一个 CHARTS-HELPERS 标记，图表 CSS 由 charts helpers 运行时注入）。 */
const DOC_SHELL_CHARTS =
  '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
  '<title>卡路里·运动移植</title>\n<!--SHARED-CSS-->\n</head>\n<body>\n' +
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

function fmtPace(p: number | null | undefined): string {
  if (p === null || p === undefined) return '—';
  return String(p) + ' 分/公里';
}

/** 逐条记录表（100 条截断明示，沿 R3 口径；备注仅展示，不做筛选维度）。 */
const RECORD_CAP = 100;

function windowForm(start: string, end: string, extra: string): string {
  return renderParamForm({
    fields: [
      { name: 'start', label: '开始', value: start },
      { name: 'end', label: '结束', value: end },
    ],
    description: extra,
  });
}

/* ── 力量训练总览（exercise_strength.html 对照：按动作聚合＋重量轨迹＋逐条记录） ── */

export function buildStrengthDoc(v: StrengthView): string {
  const parts: string[] = [
    windowForm(v.start, v.end, '力量子集（库内分类实填优先、缺失按名推断；旧配速/时长口径不在此页）'),
    renderKpiGrid([
      { label: '动作数', value: String(v.movementCount), unit: '个', detail: v.start + ' ~ ' + v.end },
      { label: '总组数', value: String(v.totalSets), unit: '组' },
      { label: '总重量', value: fmt(v.totalVolumeKg), unit: 'kg', detail: '单侧口径 Σload×reps（沿旧模板）' },
      { label: '总次数', value: fmt(v.totalReps), unit: '次' },
    ]),
  ];
  let charts = false;
  const trail = v.trail.filter((p) => p.volumeKg !== null);
  if (trail.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '重量轨迹（近 10 个训练日）',
      input: { items: v.trail.map((p) => ({ label: p.date.slice(5), value: p.volumeKg })) },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'movement', label: '动作' },
      { key: 'sets', label: '组数', align: 'right' },
      { key: 'volumeKg', label: '总重量kg', align: 'right' },
      { key: 'reps', label: '总次数', align: 'right' },
    ],
    rows: v.byMovement.map((m) => ({ movement: m.movement, sets: m.sets, volumeKg: m.volumeKg, reps: m.reps })),
    caption: '按动作聚合（' + v.start + ' ~ ' + v.end + '）',
    emptyText: '本窗无动作聚合',
  }));
  const total = v.rows.length;
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'type', label: '动作' },
      { key: 'load', label: '重量×次数' },
      { key: 'note', label: '备注' },
    ],
    rows: v.rows.slice(0, RECORD_CAP).map((r) => ({
      date: r.date,
      type: r.type,
      load: (r.loadKg === null ? '—' : String(r.loadKg) + 'kg') + '×' + (r.reps === null ? '—' : String(r.reps)),
      note: r.note === '' ? '—' : r.note,
    })),
    caption: '力量逐条记录（共 ' + total + ' 条' + (total > RECORD_CAP ? '，仅列前 ' + RECORD_CAP + ' 条' : '') + '）',
    emptyText: '本窗无逐条记录',
  }));
  parts.push(copyBlock('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise-strength',
      data: {
        metrics: metricsOf({
          movementCount: v.movementCount, totalSets: v.totalSets,
          totalVolumeKg: v.totalVolumeKg, totalReps: v.totalReps,
        }),
      },
    },
  }));
  return assemble(
    '力量训练总览 ' + v.start + ' ~ ' + v.end,
    'calorie.view.exercise-strength · 运动移植域',
    '按动作聚合＋重量轨迹（无重量数据即“—”，不编数）',
    parts.join(''),
    charts,
  );
}

/* ── 有氧训练总览（exercise_cardio.html 对照：按类型聚合＋配速＋逐条记录） ── */

export function buildCardioDoc(v: CardioView): string {
  const parts: string[] = [
    windowForm(v.start, v.end, '有氧子集（库内分类实填优先、缺失按名推断）'),
    renderKpiGrid([
      { label: '次数', value: String(v.sessions), unit: '次', detail: v.start + ' ~ ' + v.end },
      { label: '总时长', value: fmt(v.totalMinutes), unit: '分钟' },
      { label: '总距离', value: fmt(v.totalDistanceKm), unit: '公里' },
      { label: '平均配速', value: fmtPace(v.avgPaceMinPerKm), detail: '总分钟/总公里（距离加权，沿旧模板）' },
    ]),
  ];
  let charts = false;
  if (v.byType.length > 0) {
    parts.push(renderChartBlock({
      kind: 'bar',
      title: '按类型次数',
      input: { items: v.byType.map((t) => ({ label: t.type, value: t.sessions })) },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'type', label: '类型' },
      { key: 'sessions', label: '次数', align: 'right' },
      { key: 'minutes', label: '总时长', align: 'right' },
      { key: 'km', label: '总距离', align: 'right' },
      { key: 'pace', label: '平均配速' },
    ],
    rows: v.byType.map((t) => ({
      type: t.type, sessions: t.sessions, minutes: t.minutes, km: t.distanceKm, pace: fmtPace(t.paceMinPerKm),
    })),
    caption: '按类型聚合（配速＝分钟/公里，无距离即“—”）',
    emptyText: '本窗无类型聚合',
  }));
  const total = v.rows.length;
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'type', label: '类型' },
      { key: 'minutes', label: '时长' },
      { key: 'km', label: '距离' },
      { key: 'note', label: '备注' },
    ],
    rows: v.rows.slice(0, RECORD_CAP).map((r) => ({
      date: r.date, type: r.type, minutes: r.minutes, km: r.distanceKm, note: r.note === '' ? '—' : r.note,
    })),
    caption: '有氧逐条记录（共 ' + total + ' 条' + (total > RECORD_CAP ? '，仅列前 ' + RECORD_CAP + ' 条' : '') + '）',
    emptyText: '本窗无逐条记录',
  }));
  parts.push(copyBlock('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise-cardio',
      data: {
        metrics: metricsOf({
          sessions: v.sessions, totalMinutes: v.totalMinutes,
          totalDistanceKm: v.totalDistanceKm, avgPaceMinPerKm: v.avgPaceMinPerKm,
        }),
      },
    },
  }));
  return assemble(
    '有氧训练总览 ' + v.start + ' ~ ' + v.end,
    'calorie.view.exercise-cardio · 运动移植域',
    '按类型聚合＋配速（无距离不算配速，不编数）',
    parts.join(''),
    charts,
  );
}

/* ── 运动类型分布（exercise_distribution.html 对照：分类占比＋摄入/TDEE 联动） ── */

export function buildDistributionDoc(v: DistributionView): string {
  const parts: string[] = [
    windowForm(v.start, v.end, '分类＝库内实填优先（力量/有氧/柔韧/日常/其他）；旧双饼改双 bar（冻结图表层无 pie 接口，D8）'),
    renderKpiGrid([
      { label: '会话', value: String(v.sessions), unit: '次', detail: v.days + ' 天 · 活跃 ' + v.activeDays + ' 天' },
      { label: '总消耗', value: String(v.totalBurned), unit: '卡' },
      { label: '摄入', value: fmt(v.intakeCal), unit: '卡', detail: '窗内饮食合计（无饮食记录即“—”）' },
      { label: '缺口', value: fmt(v.deficit), unit: '卡', detail: 'TDEE×天＋运动−摄入（缺摄入即“—”）' },
    ]),
  ];
  let charts = false;
  if (v.buckets.length > 0) {
    parts.push(renderChartBlock({
      kind: 'bar',
      title: '按分类热量分布',
      input: { items: v.buckets.map((b) => ({ label: b.category + ' ' + (b.shareByBurned ?? '—') + '%', value: b.burned })) },
    }));
    parts.push(renderChartBlock({
      kind: 'bar',
      title: '按分类次数占比',
      input: { items: v.buckets.map((b) => ({ label: b.category + ' ' + (b.shareBySessions ?? '—') + '%', value: b.sessions })) },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'category', label: '分类' },
      { key: 'sessions', label: '次数', align: 'right' },
      { key: 'burned', label: '消耗', align: 'right' },
      { key: 'minutes', label: '时长', align: 'right' },
      { key: 'shareBurn', label: '热量占比%' },
      { key: 'shareN', label: '次数占比%' },
    ],
    rows: v.buckets.map((b) => ({
      category: b.category, sessions: b.sessions, burned: b.burned, minutes: b.minutes,
      shareBurn: b.shareByBurned, shareN: b.shareBySessions,
    })),
    caption: '分类明细（' + v.start + ' ~ ' + v.end + '）',
    emptyText: '本窗无分类明细',
  }));
  parts.push(renderDisclosure({
    title: '摄入/TDEE 联动（运动贡献）',
    contentHtml: renderListRows({
      items: [
        { left: '摄入合计', main: fmt(v.intakeCal) + ' 卡', right: v.days + ' 天' },
        { left: '运动消耗', main: String(v.totalBurned) + ' 卡', right: v.sessions + ' 次' },
        { left: 'TDEE 合计', main: fmt(v.tdeeTotal) + ' 卡', right: '档案静态值×天' },
        { left: '缺口', main: fmt(v.deficit) + ' 卡', right: v.deficit === null ? '缺摄入未算' : 'TDEE＋运动−摄入' },
      ],
    }),
  }));
  parts.push(copyBlock('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise-distribution',
      data: {
        metrics: metricsOf({
          sessions: v.sessions, activeDays: v.activeDays, days: v.days, totalBurned: v.totalBurned,
          intakeCal: v.intakeCal, tdeeTotal: v.tdeeTotal, deficit: v.deficit,
        }),
      },
    },
  }));
  return assemble(
    '运动类型分布 ' + v.start + ' ~ ' + v.end,
    'calorie.view.exercise-distribution · 运动移植域',
    '分类占比＋摄入/TDEE 联动（缺摄入不断缺口，不编数）',
    parts.join(''),
    charts,
  );
}

/* ── 运动复盘（exercise_recap.html 对照：KPI＋分类＋TOP5＋日趋势＋一句话） ── */

export function buildRecapDoc(v: RecapView): string {
  const parts: string[] = [
    windowForm(v.start, v.end, '复盘窗＝调用方给 start/end（旧 period week/month/90d/year/range 逐一映射；多窗各直出一页）'),
    renderKpiGrid([
      { label: '总时长', value: fmt(v.totalMinutes), unit: '分钟', detail: v.start + ' ~ ' + v.end },
      { label: '总消耗', value: String(v.totalBurned), unit: '卡' },
      { label: '频次', value: String(v.sessions), unit: '次', detail: '活跃 ' + v.activeDays + ' / ' + v.days + ' 天' },
      { label: '覆盖分类', value: String(v.byCategory.length), unit: '类' },
    ]),
  ];
  let charts = false;
  if (v.daily.some((d) => d.burned !== null)) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '每日消耗趋势（空缺断点不断 0，沿 t110 R1）',
      input: { items: v.daily.map((d) => ({ label: d.date.slice(5), value: d.burned })) },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'category', label: '分类' },
      { key: 'sessions', label: '次数', align: 'right' },
      { key: 'burned', label: '消耗', align: 'right' },
    ],
    rows: v.byCategory.map((b) => ({ category: b.category, sessions: b.sessions, burned: b.burned })),
    caption: '类型分布（按分类）',
    emptyText: '本窗无分类分布',
  }));
  parts.push(renderDataTable({
    columns: [
      { key: 'type', label: '高频运动' },
      { key: 'sessions', label: '次数', align: 'right' },
      { key: 'burned', label: '消耗', align: 'right' },
    ],
    rows: v.top5.map((t) => ({ type: t.type, sessions: t.sessions, burned: t.burned })),
    caption: '高频 TOP5（旧截断沿袭：只列前 5，明细见运动总览全量表）',
    emptyText: '本窗无高频运动',
  }));
  parts.push(copyBlock('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise-recap',
      data: {
        metrics: metricsOf({
          sessions: v.sessions, totalMinutes: v.totalMinutes, totalBurned: v.totalBurned,
          activeDays: v.activeDays, days: v.days,
        }),
      },
    },
  }));
  return assemble(
    '运动复盘 ' + v.start + ' ~ ' + v.end,
    'calorie.view.exercise-recap · 运动移植域',
    v.summary,
    parts.join(''),
    charts,
  );
}

/* ── 计划复盘（exercise_review.html 对照：计划 vs 实绩＋完成率＋未完成清单） ── */

export function buildReviewDoc(v: ReviewView): string {
  const parts: string[] = [
    windowForm(v.start, v.end, '计划来源＝workout_plans（会话日期按周一口径由 start_date 派生；休息日不计）'),
    renderKpiGrid([
      { label: '计划会话', value: String(v.plannedSessions), unit: '场', detail: v.planTitle },
      { label: '已完成', value: String(v.hitSessions), unit: '场' },
      {
        label: '会话完成率', value: v.completionPct === null ? '—' : String(v.completionPct) + '%',
        status: (v.completionPct ?? 0) >= 80 ? 'ok' : 'warn',
      },
      {
        label: '动作完成率', value: v.movementPct === null ? '—' : String(v.movementPct) + '%',
        detail: v.hitMovements + '/' + v.plannedMovements,
      },
    ]),
  ];
  let charts = false;
  parts.push(renderChartBlock({
    kind: 'bar',
    title: '计划 vs 实做',
    input: {
      items: [
        { label: '计划会话', value: v.plannedSessions },
        { label: '已完成', value: v.hitSessions },
      ],
    },
  }));
  charts = true;
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'label', label: '计划' },
      { key: 'moves', label: '计划动作' },
      { key: 'actual', label: '实做' },
      { key: 'hit', label: '完成' },
    ],
    rows: v.sessions.map((s) => ({
      date: s.date,
      label: s.label === '' ? '—' : s.label,
      moves: s.movements.length === 0 ? '—' : s.movements.join('、'),
      actual: s.actualTypes.length === 0 ? '—' : s.actualTypes.join('、'),
      hit: s.hit ? '是' : '否',
    })),
    caption: '每日明细（完成＝当日有运动记录；动作命中＝双向子串）',
    emptyText: '窗内无计划会话',
  }));
  if (v.unhit.length > 0) {
    parts.push(renderDisclosure({
      title: '未完成训练（共 ' + v.unhit.length + ' 场）',
      contentHtml: renderListRows({
        items: v.unhit.map((s) => ({
          left: s.date,
          main: (s.label === '' ? '训练' : s.label) + (s.movements.length > 0 ? '：' + s.movements.join('、') : ''),
          right: '未完成',
        })),
      }),
    }));
  }
  parts.push(copyBlock('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise-review',
      data: {
        metrics: metricsOf({
          plannedSessions: v.plannedSessions, hitSessions: v.hitSessions,
          completionPct: v.completionPct, plannedMovements: v.plannedMovements,
          hitMovements: v.hitMovements, movementPct: v.movementPct,
        }),
      },
    },
  }));
  return assemble(
    '计划复盘 ' + v.start + ' ~ ' + v.end,
    'calorie.view.exercise-review · 运动移植域',
    v.planTitle + '（会话完成＝当日有记录；动作完成＝计划名与实做双向子串命中）',
    parts.join(''),
    charts,
  );
}

/* ── 运动趋势（exercise_trend.html 对照：日序列＋周频次＋峰值） ── */

export function buildTrendDoc(v: TrendView): string {
  const parts: string[] = [
    windowForm(v.start, v.end, '时序视角（旧 --days 30 默认；本键 start/end 显式窗）'),
    renderKpiGrid([
      { label: '运动天数', value: String(v.activeDays), unit: '天', detail: v.start + ' ~ ' + v.end },
      { label: '总时长', value: fmt(v.totalMinutes), unit: '分钟' },
      { label: '总消耗', value: String(v.totalBurned), unit: '卡' },
      {
        label: '峰值', value: v.peak ? String(v.peak.burned) : '—', unit: '卡',
        detail: v.peak ? '单日最高 ' + v.peak.date : undefined,
      },
    ]),
  ];
  let charts = false;
  if (v.days.some((d) => d.burned !== null)) {
    const burnItems = v.days.map((d) => ({ label: d.date.slice(5), value: d.burned }));
    const minItems = v.days.map((d) => ({ label: d.date.slice(5), value: d.minutes }));
    parts.push(renderChartBlock({
      kind: 'line',
      title: '每日消耗＋时长（消耗实线 · 时长虚线独立刻度；空缺断点不断 0，沿 t110 R1）',
      input: {
        items: burnItems,
        options: {
          series: [
            { name: '消耗(卡)', items: burnItems },
            { name: '时长(分)', items: minItems, dashed: true, ownScale: true },
          ],
        },
      },
    }));
    charts = true;
  }
  if (v.weekly.length > 0) {
    parts.push(renderChartBlock({
      kind: 'bar',
      title: '每周运动频次',
      input: { items: v.weekly.map((w) => ({ label: w.weekStart.slice(5) + '周', value: w.sessions })) },
    }));
    charts = true;
  }
  const TREND_CAP = 100;
  const trendTotal = v.days.length;
  const trendSlice = v.days.slice(0, TREND_CAP);
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'sessions', label: '次数', align: 'right' },
      { key: 'minutes', label: '时长', align: 'right' },
      { key: 'burned', label: '消耗', align: 'right' },
    ],
    rows: trendSlice.map((d) => ({ date: d.date, sessions: d.sessions, minutes: d.minutes, burned: d.burned })),
    caption: '逐日明细（共 ' + trendTotal + ' 天' + (trendTotal > TREND_CAP ? '，仅列前 ' + TREND_CAP + ' 天' : '') + '；空日“—”不断 0）',
    emptyText: '本窗无逐日明细',
  }));
  parts.push(copyBlock('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise-trend',
      data: {
        metrics: metricsOf({
          activeDays: v.activeDays, totalMinutes: v.totalMinutes,
          totalBurned: v.totalBurned, peakBurned: v.peak?.burned,
        }),
      },
    },
  }));
  return assemble(
    '运动趋势 ' + v.start + ' ~ ' + v.end,
    'calorie.view.exercise-trend · 运动移植域',
    '日序列＋周频次＋峰值（空日断点，不断 0）',
    parts.join(''),
    charts,
  );
}
