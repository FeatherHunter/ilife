/** #109 · 运动域全文档装配（数据→区块→填充器）。
 *
 * 范围（#353 后：身体两页已迁入 `src/body/bodyDocs.ts`，本件只留运动三页）：
 * `calorie.view.exercise`（exercise_summary 汇总＋趋势＋分布＋力量/有氧筛选子集）／
 * `calorie.view.exercise-goal`（exercise_goal_view）。
 * 体重五页已迁 `src/weight/plateDocs.ts`（#294）；身体两页已迁 `src/body/bodyDocs.ts`（#353）。
 * 不碰：exercise_cardio／distribution／recap／review／strength／trend 6 项需移植（→ #111），
 * 训练计划/向导（→ #86），体脂/围度对比 helpers（无 CLI 键，随组合分析消费），
 * 缺口/组合/异常/禁忌（→ #110），饮食域（#108 已关）。
 *
 * 做法（#104 §4 用法）：内容 = base-paint/blocks 12 区块（B-01 壳／B-02 KPI／B-03 表／
 * B-04 图／B-05 列表／B-08 折叠／B-09 参数表单／B-11 复制区），文档 = fillTemplate 包裹
 * （资产裸文本＋填充器包裹；sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs，图表 CSS 由其运行时注入）。
 * 复制文本一律 buildDataText（#77 契约，技能侧不自产第二套序列化）：指标页走 stat 投影，
 * 行级页（体成分/围度记录）走 list 投影。本层不做取数（数据由调用方 dispatch 备齐），
 * 不返空（缺失由数据层抛 missing-data）。
 */
import {
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import type { DaySeries } from '../analysis/series.js';
import { inferCategory } from '../exercise/exerciseStore.js';
import type { ExerciseView } from '../home/exercise.js';
import type { ExerciseGoalView } from './planPlate.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·运动身体';

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

/* ── 运动总览（exercise_summary.html 对照：汇总＋每日趋势＋类型分布＋力量/有氧筛选子集） ── */

export function buildExerciseDoc(v: ExerciseView): string {
  const r = v.review;
  const parts: string[] = [renderKpiGrid([
    { label: '总消耗', value: String(r.totalBurned), unit: '卡', detail: v.start + ' ~ ' + v.end },
    { label: '总时长', value: String(r.totalMinutes), unit: '分钟' },
    { label: '次数', value: String(r.sessions), unit: '次', detail: '活跃 ' + r.activeDays + ' 天' },
    {
      label: '日均', value: fmt(v.avgBurnedPerLoggedDay), unit: '卡',
      detail: '数列合计 ' + v.totalBurnedSeries + ' 卡 · 有数 ' + v.activeDays + ' 天',
    },
  ])];
  let charts = false;
  const loggedDays = v.series.filter((d: DaySeries) => d.exerciseKcal !== null);
  if (loggedDays.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '每日消耗',
      input: {
        items: v.series.map((d: DaySeries) => ({ label: d.date.slice(5), value: d.exerciseKcal })),
        options: { markLine: { value: v.avgBurnedPerLoggedDay ?? undefined, label: '日均' } },
      },
    }));
    charts = true;
  }
  if (r.byType.length > 0) {
    parts.push(renderChartBlock({
      kind: 'bar',
      title: '类型消耗分布',
      input: { items: r.byType.map((t) => ({ label: t.type + ' ' + t.sessions + '次', value: t.burned })) },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'burn', label: '消耗', align: 'right' },
    ],
    rows: v.series.map((d: DaySeries) => ({ date: d.date, burn: d.exerciseKcal })),
    caption: '按日消耗（' + v.start + ' ~ ' + v.end + '，无记录日留空，不断 0）',
    emptyText: '本窗无按日消耗',
  }));
  parts.push(renderDataTable({
    columns: [
      { key: 'type', label: '类型' },
      { key: 'cat', label: '分类' },
      { key: 'sessions', label: '次数', align: 'right' },
      { key: 'burned', label: '消耗', align: 'right' },
      { key: 'minutes', label: '时长', align: 'right' },
    ],
    rows: r.byType.map((t) => ({
      type: t.type, cat: inferCategory(t.type), sessions: t.sessions, burned: t.burned, minutes: t.minutes,
    })),
    caption: '按类型明细（力量/有氧筛选子集：同窗不同类直出，无类切换页）',
    emptyText: '本窗无类型明细',
  }));
  const cats = Object.entries(r.byCategory);
  if (cats.length > 0) {
    parts.push(renderDisclosure({
      title: '按分类汇总（共 ' + cats.length + ' 类）',
      contentHtml: renderListRows({
        items: cats.map(([cat, s]) => ({ left: cat, main: s.sessions + ' 次', right: s.burned + ' 卡' })),
      }),
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise',
      data: {
        metrics: metricsOf({
          totalBurned: r.totalBurned, totalMinutes: r.totalMinutes, sessions: r.sessions,
          activeDays: r.activeDays, totalBurnedSeries: v.totalBurnedSeries,
          avgBurnedPerLoggedDay: v.avgBurnedPerLoggedDay, seriesActiveDays: v.activeDays,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '运动总览 ' + v.start + ' ~ ' + v.end,
    eyebrow: 'calorie.view.exercise · 运动身体域',
    subtitle: '类型分布/力量有氧明细同窗直出（交互筛选归宿主）',
    content: parts.join(''),
    charts,
  });
}

/* ── 运动目标（exercise_goal_view.html 对照：目标 vs 实际＋完成度＋达成判定） ── */

export function buildExerciseGoalDoc(v: ExerciseGoalView): string {
  const parts: string[] = [renderKpiGrid([
    { label: '区间', value: v.start + ' ~ ' + v.end, detail: v.days + ' 天 · 日均目标 ' + v.dailyGoal + ' 卡' },
    { label: '目标', value: String(v.goalTotal), unit: '卡' },
    { label: '实际', value: String(v.actual), unit: '卡', detail: v.achieved ? '已达成' : '未达成' },
    {
      label: '完成度', value: v.pct === null ? '—' : String(v.pct) + '%',
      detail: '差 ' + v.gap + ' 卡', status: v.achieved ? 'ok' : 'warn',
    },
  ])];
  parts.push(renderChartBlock({
    kind: 'bar',
    title: '目标 vs 实际',
    input: { items: [{ label: '目标', value: v.goalTotal }, { label: '实际', value: v.actual }] },
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise-goal',
      data: {
        metrics: metricsOf({
          dailyGoal: v.dailyGoal, goalTotal: v.goalTotal, actual: v.actual,
          pct: v.pct, gap: v.gap, achieved: v.achieved ? 1 : 0, days: v.days,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '运动目标 ' + v.start + ' ~ ' + v.end,
    eyebrow: 'calorie.view.exercise-goal · 运动身体域',
    subtitle: v.achieved ? '已达成（实际 ≥ 目标）' : '未达成（还差 ' + Math.abs(v.gap) + ' 卡）',
    content: parts.join(''),
    charts: true,
  });
}

/* ── 身体两页已迁出（#353）：体成分／围度整页文档原样迁入 src/body/bodyDocs.ts，本件只留运动页。 */
