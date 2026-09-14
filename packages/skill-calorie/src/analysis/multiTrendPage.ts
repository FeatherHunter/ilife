/** 通用分析页最小形态（多指标趋势形态，#171 §4.3；#376 立起、#378 只读复用）。
 *
 * 分层：通用图／表／复制区走 `packages/base-render/src/` 现成件；
 * 整页装配走卡路里包内公共层 `src/shared/docPage.ts`，复制区走
 * `src/shared/copyArea.ts`；本件只做本形态的装配，不复制第二份整页装配。
 * 取数不在这里（`./multiTrend.ts` 唯一源），模板不碰 `calorie_deficit.html`。
 */
import {
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import type { MultiTrendView } from './multiTrend.js';

/** envelope 头（与 `cli/keys.ts` 冻结值一致，测试钉死）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本形态页共用的 head 标题（整页模板住 `src/shared/docPage.ts`）。 */
const DOC_TITLE = '卡路里·整体趋势';

/** 组标签（#378 铺开：g1–g11 老链语义，标题用；取数仍全指标同图）。 */
const GROUP_LABELS: Record<string, string> = {
  comprehensive: '综合多指标',
  g1: '体重+摄入+运动', g2: '体重+体脂+围度', g3: '饮食+蛋白+纤维',
  g4: '运动+力量+有氧', g5: 'BMI+体脂+肌肉量', g6: '摄入+蛋白+运动',
  g7: '体重+蛋白+缺口', g8: '体重+摄入+缺口', g9: '体重+摄入+运动+缺口',
  g10: '蛋白+运动', g11: '综合多指标',
};

/** 对照标签（#378 铺开，标题用）。 */
const COMPARE_LABELS: Record<string, string> = {
  target: '含目标对比', monthly: '含月度对比', quarterly: '含季度对比', yearly: '含年度对比',
};

/** 标题：默认形态逐字节沿 #376（指纹钉死），铺开形态带组与对照标签。 */
function docTitleOf(v: MultiTrendView): string {
  const range = v.start + ' ~ ' + v.end;
  if (v.group === 'comprehensive' && v.compare === 'target') return '整体趋势(含目标对比） ' + range;
  return '整体趋势(' + (GROUP_LABELS[v.group] ?? v.group) + '·' + (COMPARE_LABELS[v.compare] ?? v.compare) + '） ' + range;
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

/* ── 纵轴量程与刻度（#424）─────────────────────────────────────────────────
 *  公共层网格线 `GRID_LINES = 3`（下界＋中线＋上界），所以这里给的刻度条数恒 3 才能与网格叠合。
 *  量程本身要**贴着数据**：体重 90 天只走 1.1kg，量程给宽了曲线就是一条平线（读不出走势）。 ── */

/** 「整齐数上界」：把 v **向上**收到 1／2／2.5／5／10 的整数倍（返回值恒 ≥ v）。
 *  #424 返工：原 `niceRound(v, 5)` 的判据是 `scaled <= choice * k`，返回的却是 `choice * base`
 *  ——`v=1800` 落进 `choice=1` 就返回 1000，上界被压到数据峰值（≈1100）与目标（1800）之下，
 *  于是点被切到盒外、线穿出卡片、目标虚线整条不见。此处取「最小的 ≥ v 的整齐数」。 */
function niceCeil(v: number): number {
  const base = Math.pow(10, Math.floor(Math.log10(Math.abs(v))));
  const scaled = v / base;
  for (const choice of [1, 2, 2.5, 5, 10]) {
    if (scaled <= choice) return choice * base;
  }
  return 10 * base;
}

/** 体重类小区间的量程：数据各留 12.5% 余量（最小跨度 0.4kg），两端收到 0.1 的整数倍。
 *  **不**去凑「步长整除跨度」——那会把 1.1kg 的数据摊到 6kg 量程上（实测刻度变 68/71/74）；
 *  也不把步长凑成整齐数——为保证两端是整齐数，量程会宽出一倍（1.1kg 的数据只占半屏）。
 *  刻度条数恒 3，与公共层 `GRID_LINES = 3` 的网格线同域均分 → 逐条叠合。 */
function weightAxisOf(values: readonly number[]): {
  readonly yMin: number;
  readonly yMax: number;
  readonly format: (value: number) => string;
} | null {
  const raw = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (raw.length === 0) return null;
  const dataLo = Math.min(...raw);
  const dataHi = Math.max(...raw);
  const span = Math.max(dataHi - dataLo, 0.4);
  const center = (dataLo + dataHi) / 2;
  const half = (span * 1.25) / 2;
  const yMin = Math.round((center - half) * 10) / 10;
  const yMax = Math.round((center + half) * 10) / 10;
  return axisOf(yMin, yMax > yMin ? yMax : Math.round((yMin + 0.4) * 10) / 10, 'kg');
}

/** 纵轴三件套：上下界＋刻度文案。`unit` 为空串时不带单位；步长 <1 才留 1 位小数（体重 70.6／71.2）。 */
function axisOf(yMin: number, yMax: number, unit: string): {
  readonly yMin: number;
  readonly yMax: number;
  readonly format: (value: number) => string;
} {
  const print = (yMax - yMin) / 2 < 1 ? 1 : 0;
  return { yMin, yMax, format: (value: number) => value.toFixed(print) + unit };
}

/** 热量类量程：0 起，上界向外收到整齐数（恒 ≥ 传进来的峰值，含目标值，线不越界）。 */
function calorieAxisOf(peak: number | null): {
  readonly yMin: number;
  readonly yMax: number;
  readonly format: (value: number) => string;
} | null {
  if (peak === null || !Number.isFinite(peak) || peak <= 0) return null;
  return axisOf(0, niceCeil(peak), '卡');
}

/** B组独有分支判定：只处理季度／年度对比，默认形态与A组各分组走原路（指纹不动）。 */
function isBCompare(v: MultiTrendView): boolean {
  return v.compare === 'quarterly' || v.compare === 'yearly';
}

/** B组人话：窗口（近90天口径，180d＝近180天，730d＝近730天）。 */
function bWindowHuman(window: string): string {
  if (window === '7d') return '近7天';
  if (window === '15d') return '近15天';
  if (window === '30d') return '近30天';
  if (window === '60d') return '近60天';
  if (window === '90d') return '近90天';
  if (window === '180d') return '近180天';
  if (window === '365d') return '近365天';
  if (window === '730d') return '近730天';
  if (window === 'week_cur') return '本周';
  if (window === 'month_cur') return '本月';
  if (window === 'custom') return '自选时间';
  return window;
}

/** B组人话：分组（综合即默认组，其余沿标题标签）。 */
function bGroupHuman(group: string): string {
  if (group === 'comprehensive') return '默认组（综合多指标）';
  return GROUP_LABELS[group] ?? group;
}

/** B组人话：对照（季度／年度对比）。 */
function bCompareHuman(compare: string): string {
  if (compare === 'target') return '目标对比';
  if (compare === 'monthly') return '月度对比';
  if (compare === 'quarterly') return '季度对比';
  if (compare === 'yearly') return '年度对比';
  return COMPARE_LABELS[compare] ?? compare;
}

/** B组人话：标题（人话窗口＋对照标签＋区间，不含英文原词）。 */
function bTitleOf(v: MultiTrendView): string {
  return bWindowHuman(v.window) + '整体趋势（' + bCompareHuman(v.compare) + '） ' + v.start + '到' + v.end;
}

/** B组人话：区间一句话（从哪天到哪天，共几天，几天有记录）。 */
function bRangeSentence(v: MultiTrendView): string {
  return '从' + v.start + '到' + v.end + '，共' + v.days.length + '天，其中' + v.summary.loggedDays + '天有记录';
}

/** B组人话：目标一句话（无目标明示暂无，有目标给具体值）。 */
function bTargetSentence(v: MultiTrendView): string {
  const c = v.target.calorieGoal;
  const w = v.target.weightGoal;
  if (c === null && w === null) return '暂无目标，先去设一个目标再看达标情况';
  if (c !== null && w !== null) return '目标每天' + c + '卡、体重' + w + '公斤';
  if (c !== null) return '目标每天' + c + '卡';
  return '目标体重' + String(w) + '公斤';
}

/** B线老A壳小件：对照短标签（meta-bar 左行「对照X值」用）。 */
function bCompareShort(compare: string): string {
  if (compare === 'target') return '目标';
  if (compare === 'monthly') return '月度';
  if (compare === 'quarterly') return '季度';
  if (compare === 'yearly') return '年度';
  return COMPARE_LABELS[compare] ?? compare;
}

/** B线老A壳小件：分组短标签（综合即默认组，不套括号防标题换行孤字）。 */
function bGroupShort(group: string): string {
  if (group === 'comprehensive') return '默认组';
  return GROUP_LABELS[group] ?? group;
}

/** B线老A壳第1行左：参数一行小字（区间全页唯一出处，形如 近90天 · 默认组 · 对照目标值 · 2026-06-10~2026-09-07）。 */
function bMetaLeft(v: MultiTrendView): string {
  return bWindowHuman(v.window) + ' · ' + bGroupShort(v.group) + ' · 对照' + bCompareShort(v.compare) + '值 · ' + v.start + '~' + v.end;
}

/** B线老A壳第3行：结论摘要（一句话人话，不带区间，技术口径另进注释）。 */
function bSummaryLine(v: MultiTrendView): string {
  const s = v.summary;
  const days = v.days.length;
  const avg = s.avgCalorie === null || s.avgCalorie === undefined ? '暂无记录' : String(s.avgCalorie) + '卡';
  const t = v.target.calorieGoal;
  const targetPart = t === null ? '暂无目标' : '目标' + t + '卡';
  const r = s.complianceRate;
  const ratePart = r === null || r === undefined ? '暂无达标统计' : '达标率' + Math.round(r * 100) + '%';
  return s.loggedDays + '/' + days + '天有记录 · 日均' + avg + '（' + targetPart + '）· ' + ratePart;
}

/** B线技术口径注释（e2e 消费的 window／group／compare 原词＋达标公式全进注释，可见文案只留人话）。 */
function bTechNote(v: MultiTrendView): string {
  return '<!-- 窗口' + v.window + ' 分组' + v.group + ' 对照' + v.compare + ' 数列唯一源buildSeries 最小形态 空窗阻断 不编数 达标＝单日≤目标×1.05 T5 目标取库内现值 -->';
}

/** B线目标图例（橙色虚线 #ff9500 不动，说明文字走正文色，随图走）。 */
function bTargetLegend(v: MultiTrendView): string {
  const t = v.target.calorieGoal;
  if (t === null) return '';
  return '<div class="legend"><span><i class="b"></i>目标' + t + '卡</span></div>';
}

/** B线按月汇总行（年度页明细折叠前的 ≤13 行总表用）。 */
function bMonthlyRows(v: MultiTrendView): Array<Record<string, string>> {
  const map = new Map<string, { days: number; logged: number; sum: number; cnt: number }>();
  for (const d of v.days) {
    const m = d.date.slice(0, 7);
    let e = map.get(m);
    if (!e) { e = { days: 0, logged: 0, sum: 0, cnt: 0 }; map.set(m, e); }
    e.days += 1;
    const c = d.calories;
    if (typeof c === 'number' && Number.isFinite(c)) { e.logged += 1; e.sum += c; e.cnt += 1; }
  }
  return [...map.entries()].map(([m, e]) => ({
    month: m,
    days: String(e.days) + '天',
    logged: String(e.logged) + '天',
    avg: e.cnt > 0 ? String(Math.round((e.sum / e.cnt) * 10) / 10) : '—',
  }));
}

/** B组顶区整改（季度／年度独有分支，同A组口径：中文导航／人话标题／技术进注释／区间一句话／目标线回图内／空态人话）。 */
function buildBDoc(v: MultiTrendView): string {
  const s = v.summary;
  const weighed = v.days.filter((d) => d.weightKg !== null);
  /* #424：两张图的纵轴都给「三刻度＋单位」；热量图从 0 起且把目标值并入量程（目标线不越界）。 */
  const calorieAxis = calorieAxisOf(Math.max(
    v.days.reduce((peak, d) => (typeof d.calories === 'number' && d.calories > peak ? d.calories : peak), 0),
    v.target.calorieGoal ?? 0,
  ))
    ?? axisOf(0, 1, '卡');
  const weightAxis = weightAxisOf(weighed.map((d) => d.weightKg as number));
  const techNote = bTechNote(v);
  const parts: string[] = [
    techNote,
    renderKpiGrid([
      { label: '日均热量', value: fmt(s.avgCalorie), unit: '卡', detail: v.target.calorieGoal === null ? '暂无目标' : '目标 ' + v.target.calorieGoal + '卡' },
      {
        label: '体重变化', value: fmt(s.weightChange), unit: s.weightChange === null ? '' : 'kg',
        detail: v.target.weightGoal === null ? '从开始到结束的变化' : '目标 ' + v.target.weightGoal + 'kg',
        status: s.weightChange === null ? undefined : (s.weightChange < 0 ? 'ok' : (s.weightChange > 0 ? 'warn' : undefined)),
      },
      { label: '日均运动', value: fmt(s.avgExercise), unit: '卡', detail: '共' + v.days.length + '天' },
      {
        label: '达标率', value: s.complianceRate === null ? '—' : String(Math.round(s.complianceRate * 100)),
        unit: s.complianceRate === null ? '' : '%', detail: v.target.calorieGoal === null ? '暂无目标，先去设一个目标' : '每天不超过目标一点点就算达标',
      },
    ]),
    renderChartBlock({
      kind: 'line',
      title: '每天吃了多少',
      input: {
        items: v.days.map((d) => ({ label: d.date.slice(5), value: d.calories })),
        options: {
          yTicks: 3,
          format: calorieAxis.format,
          labels: 'select',
          yMin: calorieAxis.yMin,
          yMax: calorieAxis.yMax,
          ...(v.target.calorieGoal === null ? {} : { markLine: { value: v.target.calorieGoal, label: '目标' } }),
        },
      },
    }),
    bTargetLegend(v),
  ];
  if (weighed.length > 0 && weightAxis !== null) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '体重轨迹（共 ' + weighed.length + ' 次称重）',
      input: {
        items: weighed.map((d) => ({ label: d.date.slice(5), value: d.weightKg })),
        options: {
          yTicks: 3,
          format: weightAxis.format,
          labels: 'select',
          yMin: weightAxis.yMin,
          yMax: weightAxis.yMax,
          highlightLast: true,
          legend: true,
          avgLine: 7,
          series: [
            { name: '每次称重', items: weighed.map((d) => ({ label: d.date.slice(5), value: d.weightKg })) },
          ],
        },
      },
    }));
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'calorie', label: '热量卡', align: 'right' },
      { key: 'weight', label: '体重kg', align: 'right' },
      { key: 'exercise', label: '运动卡', align: 'right' },
      { key: 'protein', label: '蛋白g', align: 'right' },
      { key: 'deficit', label: '缺口卡', align: 'right' },
      { key: 'water', label: '饮水ml', align: 'right' },
    ],
    rows: v.days.map((d) => ({
      date: d.date,
      calorie: fmt(d.calories),
      weight: fmt(d.weightKg),
      exercise: fmt(d.exerciseKcal),
      protein: fmt(d.protein),
      deficit: fmt(d.deficit),
      water: fmt(d.waterMl),
    })),
    caption: '逐日明细',
    emptyText: '这段时间还没有逐日记录，先记一餐或称一次体重再来看',
  }));
  if (v.compare === 'yearly') {
    const last = parts.pop() as string;
    parts.push(renderDataTable({
      columns: [
        { key: 'month', label: '月份' },
        { key: 'days', label: '共几天', align: 'right' },
        { key: 'logged', label: '有记录', align: 'right' },
        { key: 'avg', label: '日均热量卡', align: 'right' },
      ],
      rows: bMonthlyRows(v),
      caption: '按月汇总',
      emptyText: '这段时间还没有逐日记录',
    }));
    parts.push(renderDisclosure({
      title: '逐日明细（共' + v.days.length + '行）· 点击展开',
      contentHtml: last,
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.multi-trend',
      data: {
        metrics: metricsOf({
          days: s.days,
          loggedDays: s.loggedDays,
          avgCalorie: s.avgCalorie,
          weightChange: s.weightChange,
          avgExercise: s.avgExercise,
          avgProtein: s.avgProtein,
          avgDeficit: s.avgDeficit,
          complianceRate: s.complianceRate,
          targetCalorie: v.target.calorieGoal,
          weightGoal: v.target.weightGoal,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: bWindowHuman(v.window) + '整体趋势',
    eyebrow: '',
    subtitle: null,
    metaLeft: bMetaLeft(v),
    badge: '卡路里 · 分析',
    summary: bSummaryLine(v),
    content: parts.join(''),
    charts: true,
  });
}

/** ① 通用分析页最小形态：多指标趋势＋目标线（#376）。A组顶区：中文导航／人话标题／技术进注释／区间一句话／目标线回图内／空态人话。 */
export function buildMultiTrendDoc(v: MultiTrendView): string {
  if (isBCompare(v)) return buildBDoc(v);
  const s = v.summary;
  const weighed = v.days.filter((d) => d.weightKg !== null);
  /* #424：两张图的纵轴都给「三刻度＋单位」；热量图从 0 起且把目标值并入量程（目标线不越界）。 */
  const calorieAxis = calorieAxisOf(Math.max(
    v.days.reduce((peak, d) => (typeof d.calories === 'number' && d.calories > peak ? d.calories : peak), 0),
    v.target.calorieGoal ?? 0,
  )) ?? axisOf(0, 1, '卡');
  const weightAxis = weightAxisOf(weighed.map((d) => d.weightKg as number));
  const techNote = bTechNote(v);
  const parts: string[] = [
    techNote,
    renderKpiGrid([
      { label: '日均热量', value: fmt(s.avgCalorie), unit: '卡', detail: v.target.calorieGoal === null ? '暂无目标' : '目标 ' + v.target.calorieGoal + '卡' },
      {
        label: '体重变化', value: fmt(s.weightChange), unit: s.weightChange === null ? '' : 'kg',
        detail: v.target.weightGoal === null ? '从开始到结束的变化' : '目标 ' + v.target.weightGoal + 'kg',
        status: s.weightChange === null ? undefined : (s.weightChange < 0 ? 'ok' : (s.weightChange > 0 ? 'warn' : undefined)),
      },
      { label: '日均运动', value: fmt(s.avgExercise), unit: '卡', detail: '共' + v.days.length + '天' },
      {
        label: '达标率', value: s.complianceRate === null ? '—' : String(Math.round(s.complianceRate * 100)),
        unit: s.complianceRate === null ? '' : '%', detail: v.target.calorieGoal === null ? '暂无目标，先去设一个目标' : '每天不超过目标一点点就算达标',
      },
    ]),
    renderChartBlock({
      kind: 'line',
      title: '每天吃了多少',
      input: {
        items: v.days.map((d) => ({ label: d.date.slice(5), value: d.calories })),
        options: {
          yTicks: 3,
          format: calorieAxis.format,
          labels: 'select',
          yMin: calorieAxis.yMin,
          yMax: calorieAxis.yMax,
          emptyText: '暂无数据，换个窗口试试',
          ...(v.target.calorieGoal === null ? {} : { markLine: { value: v.target.calorieGoal, label: '目标' } }),
        },
      },
    }),
    bTargetLegend(v),
  ];
  if (weighed.length > 0 && weightAxis !== null) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '体重轨迹（共 ' + weighed.length + ' 次称重）',
      input: {
        items: weighed.map((d) => ({ label: d.date.slice(5), value: d.weightKg })),
        options: {
          yTicks: 3,
          format: weightAxis.format,
          labels: 'select',
          yMin: weightAxis.yMin,
          yMax: weightAxis.yMax,
          highlightLast: true,
          legend: true,
          avgLine: 7,
          series: [
            { name: '每次称重', items: weighed.map((d) => ({ label: d.date.slice(5), value: d.weightKg })) },
          ],
        },
      },
    }));
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'calorie', label: '热量卡', align: 'right' },
      { key: 'weight', label: '体重kg', align: 'right' },
      { key: 'exercise', label: '运动卡', align: 'right' },
      { key: 'protein', label: '蛋白g', align: 'right' },
      { key: 'deficit', label: '缺口卡', align: 'right' },
      { key: 'water', label: '饮水ml', align: 'right' },
    ],
    rows: v.days.map((d) => ({
      date: d.date,
      calorie: fmt(d.calories),
      weight: fmt(d.weightKg),
      exercise: fmt(d.exerciseKcal),
      protein: fmt(d.protein),
      deficit: fmt(d.deficit),
      water: fmt(d.waterMl),
    })),
    caption: '逐日明细',
    emptyText: '暂无数据，换个窗口试试',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.multi-trend',
      data: {
        metrics: metricsOf({
          days: s.days,
          loggedDays: s.loggedDays,
          avgCalorie: s.avgCalorie,
          weightChange: s.weightChange,
          avgExercise: s.avgExercise,
          avgProtein: s.avgProtein,
          avgDeficit: s.avgDeficit,
          complianceRate: s.complianceRate,
          targetCalorie: v.target.calorieGoal,
          weightGoal: v.target.weightGoal,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: bWindowHuman(v.window) + '整体趋势',
    eyebrow: '',
    subtitle: null,
    metaLeft: bMetaLeft(v),
    badge: '卡路里 · 分析',
    summary: bSummaryLine(v),
    content: parts.join(''),
    charts: true,
  });
}
