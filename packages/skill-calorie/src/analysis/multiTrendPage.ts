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

/* ── 内部口径留档（#378 铺开语义）───────────────────────────────────────────
 *  #160 返工裁定：`分组` 与 `对照` 两个参数**一个字都不许进可见文本**。
 *  ① `分组 weight_calorie`／`默认组` 是库键＋自造分组名（读者既不懂也选不了）；
 *  ② 12 个分组页（g1–g11）的组名与页体实际内容**不符**——组名（老链语义）是：
 *     g1 体重+摄入+运动／g2 体重+体脂+围度／g3 饮食+蛋白+纤维／g4 运动+力量+有氧／
 *     g5 BMI+体脂+肌肉量／g6 摄入+蛋白+运动／g7 体重+蛋白+缺口／g8 体重+摄入+缺口／
 *     g9 体重+摄入+运动+缺口／g10 蛋白+运动／g11 综合多指标（comprehensive 同 g11）。
 *     而页体只有热量图与体重图（12 页正文逐字节相同）⇒ 组名进 meta 就是**误导**；
 *  ③ 350／351／352 页标着「对照月度／季度／年度值」，页上却没有任何对比值。
 *  故可见文案一律按**页体实际画出来的东西**说（「热量＋体重」），两个参数只留在页面注释里
 *  （`bTechNote` 照旧原词全量落注释，e2e 对二者的消费断言因此不受影响）。 ── */

/** 标题：页型只写「整体趋势」，不再带组名与对照名（见上）。 */
function docTitleOf(v: MultiTrendView): string {
  return '卡路里·整体趋势 ' + v.start + ' ~ ' + v.end;
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

/** B组人话：H1 标题（跨年长窗直接说人话——「近730天」读者一眼数不出是两年，「近两年」可以；
 *  精确天数留 meta 行与页面注释）。 */
function bWindowTitle(window: string): string {
  if (window === '60d') return '近两个月整体趋势';
  if (window === '180d') return '近半年整体趋势';
  if (window === '365d') return '近一年整体趋势';
  if (window === '730d') return '近两年整体趋势';
  return bWindowHuman(window) + '整体趋势';
}

/** B组人话：区间一句话（从哪天到哪天，共几天，几天有记录）。
 *  给 `bTechNote` 拼页面注释用——区间与「几天有记录」在可见面上已由 meta 行与结论摘要承担，
 *  注释里再原样留一份，供 e2e 与人工核对口径。 */
function bRangeSentence(v: MultiTrendView): string {
  return '从' + v.start + '到' + v.end + '，共' + v.days.length + '天，其中' + v.summary.loggedDays + '天有记录';
}

/** #160 返工②：整页徽章一律不传（空串＝`shared/docPage.ts` 整颗不渲染）。
 *  H1 逐字含「整体趋势」（「近90天整体趋势」／「近两年整体趋势」…），徽章再印一遍同词＝同页两遍，
 *  故本页没有徽章位。 */
const NO_BADGE = '';

/** x 轴刻度标签（#160 返工④）：窗口**跨年**时带两位年份（`25-09-08`），否则照旧只给 `09-08`。
 *  730 天窗的首末刻度都落在 09 月，旧口径的 `09-08 09-08 09-07` 三个刻度读不出谁是哪一年
 *  ⇒ 跨年才补年份，不跨年的窗口标签宽度不动。同仓先例＝`weight/weightCompare2.ts` 的跨年分支
 *  （`crossYear ? d.slice(2) : d.slice(5)`）。 */
function dateLabelOf(v: MultiTrendView): (date: string) => string {
  const crossYear = v.start.slice(0, 4) !== v.end.slice(0, 4);
  return (date: string): string => (crossYear ? date.slice(2) : date.slice(5));
}

/** B线老A壳第1行左：窗口一行小字（区间全页唯一出处，形如 近90天 · 热量＋体重 · 2026-06-10~2026-09-07）。
 *  #160 返工：原「分组 weight_calorie · 对照目标值」两段是内部口径（库键／自造分组名／统计词），
 *  且 350／351／352 三页标着「对照月度／季度／年度值」而页上没有任何对比值 ⇒ 一律删；
 *  组名与对照参数全量留在页面注释（`bTechNote`）供 e2e 消费。 */
function bMetaLeft(v: MultiTrendView): string {
  return bWindowHuman(v.window) + ' · 热量＋体重 · ' + v.start + '~' + v.end;
}

/** 窗口里有几天记了吃多少（节卡与摘要的分母，与 `seriesCount(series,'calories')` 同义）。 */
function loggedCalorieDays(v: MultiTrendView): number {
  return v.days.filter((d) => typeof d.calories === 'number' && Number.isFinite(d.calories)).length;
}

/** 窗口里有几天记了运动（`avgExercise` 的分母：均值走 `seriesAvg`，null 跳过）。 */
function loggedExerciseDays(v: MultiTrendView): number {
  return v.days.filter((d) => typeof d.exerciseKcal === 'number' && Number.isFinite(d.exerciseKcal)).length;
}

/** 达标天数＝取数层给出的**整数**（`multiTrend.ts` 的 `summary.compliantDays`，无目标即 null）。
 *  #160 返工（本票最严重一条）：旧口径拿 `round2` 过的达标比率乘窗口天数反解——11/730 先被
 *  round2 成 0.02，乘 730 得 15 天；而同页明细 730 行里只有 11 行有热量且全达标，
 *  「达标 15 天」与明细当场对不上（90 天窗只是碰巧 0.12×90=10.8→11 才对得上）。
 *  比例是给人读的圆整数，天数必须直读取数层，页面不再反解、不编数。 */
function compliantDaysOf(v: MultiTrendView): number | null {
  const n = v.summary.compliantDays;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** B线老A壳第3行：结论摘要（一句话人话，不带区间，技术口径另进注释）。
 *  #160 返工③：摘要只留卡片里没有的那句——**窗口与记录天数的关系**（几天有记录、几天空着）。
 *  卡片已逐项给出日均热量／目标值／日均运动／达标比例（含各自分母），摘要再把那几个数字说一遍
 *  就是逐项重复：旧句「90 天里记了 11 天 · 按 11 天的热量记录算日均 493.5 卡（目标 1800 卡）
 *  · 达标 11 天，占全部 90 天的 12%」与卡「日均热量」「达标比例」逐项同值。 */
function bSummaryLine(v: MultiTrendView): string {
  const days = v.days.length;
  const logged = v.summary.loggedDays;
  const blank = days - logged;
  if (logged === 0) return days + ' 天的窗口里还没记过吃多少（空白日不按 0 算，只画有记录的两点之间）';
  return days + ' 天的窗口里只有 ' + logged + ' 天记了吃多少'
    + (blank > 0 ? '，其余 ' + blank + ' 天空着（空白日不按 0 算）' : '，一天没落');
}

/** B线技术口径注释（e2e 消费的 window／group／compare 原词＋达标公式全进注释，可见文案只留人话）。
 *  #160 返工⑥：被删掉的口径句一律搬进这条注释——日均运动只按有运动记录的
 *  天算、日均热量只按记了吃多少的天算、n 天窗与 T5／buildSeries 同源，读图必需的数一处不缺。
 *  #497：达标率分母由窗口天数改成有记录的天（旧句「达标率分母＝窗口天数 N」是旧口径，见 git 历史）。 */
function bTechNote(v: MultiTrendView): string {
  const ok = compliantDaysOf(v);
  return '<!-- 窗口' + v.window + ' 分组' + v.group + ' 对照' + v.compare + ' 数列唯一源buildSeries 最小形态 空窗阻断 不编数'
    + ' 达标＝单日≤目标×1.05 T5 目标取库内现值 ' + bRangeSentence(v)
    + ' 口径：达标率分母＝有记录的天' + v.summary.loggedDays + '（达标 ' + (ok === null ? '无目标，不统计' : ok + ' 天（整数，直读取数层）') + '）；日均热量分母＝记了吃多少的天'
    + loggedCalorieDays(v) + '；日均运动分母＝记了运动的天' + loggedExerciseDays(v) + '；均值null跳过、空白日不补0 -->';
}

/** B线目标图例（橙色虚线 #ff9500 不动，说明文字走正文色，随图走）。 */
function bTargetLegend(v: MultiTrendView): string {
  const t = v.target.calorieGoal;
  if (t === null) return '';
  return '<div class="legend"><span><i class="b"></i>目标' + t + '卡</span></div>';
}

/** B线按月汇总（年度页明细折叠前的总表用）。
 *  #160 返工⑤：只列**有记录的月份**——730 天窗口下这张表 92% 是「0 天／—」空行，
 *  其余月份折成一行「其余 N 个月没有记录」；列名也换成读者能读懂的话
 *  （`共几天`→`这个月几天`、`有记录`→`记了几天`、`日均热量卡`→`日均热量`，单位回列名括号）。 */
function bMonthlySummary(v: MultiTrendView): { rows: Array<Record<string, string>>; emptyMonths: number } {
  const map = new Map<string, { days: number; logged: number; sum: number; cnt: number }>();
  for (const d of v.days) {
    const m = d.date.slice(0, 7);
    let e = map.get(m);
    if (!e) { e = { days: 0, logged: 0, sum: 0, cnt: 0 }; map.set(m, e); }
    e.days += 1;
    const c = d.calories;
    if (typeof c === 'number' && Number.isFinite(c)) { e.logged += 1; e.sum += c; e.cnt += 1; }
  }
  const shown = [...map.entries()].filter(([, e]) => e.cnt > 0);
  const rows = shown.map(([m, e]) => {
    const year = m.slice(0, 4);
    const month = m.slice(5).replace(/^0/, '');
    return {
      month: year + ' 年 ' + month + ' 月',
      days: String(e.days),
      logged: String(e.logged),
      avg: String(Math.round((e.sum / e.cnt) * 10) / 10),
    };
  });
  return { rows, emptyMonths: map.size - shown.length };
}

/** B线 KPI 四卡（默认形态与季度／年度分支逐字同款，这里收成一处；分母一律写清）。
 *  #160 返工①：`日均运动` 的旧详例「共90天」分母错——均值只按有运动记录的天算（已改）。
 *  #160 返工（对账条）：分子也改成取数层的**整数**天数（`compliantDaysOf`）——比例与天数同出一源，
 *  730 天窗不再出现「比例 2%／15 天」这种与明细对不上的组合。
 *  #497：`达标比例` 的分母由**窗口天数**改成**有记录的天**（与热量趋势页 `ea7cdc9` 口径统一，
 *  裁决见 t497 证据 §1）——旧标签「达标比例」＋详例「90 天里 11 天达标」是窗口天数口径，
 *  与同页「日均热量只按记了吃多少的天算」并存两套口径；现四卡同一口径。 */
function bKpiGrid(v: MultiTrendView): string {
  const s = v.summary;
  const logged = v.summary.loggedDays;
  const exerciseDays = loggedExerciseDays(v);
  const okDays = compliantDaysOf(v);
  const range = v.target.calorieGoal === null ? '暂无目标' : '目标 ' + v.target.calorieGoal + ' 卡';
  return renderKpiGrid([
    { label: '日均热量', value: fmt(s.avgCalorie), unit: '卡', detail: loggedCalorieDays(v) + ' 天有热量记录 · ' + range },
    {
      label: '体重变化', value: fmt(s.weightChange), unit: s.weightChange === null ? '' : 'kg',
      detail: v.target.weightGoal === null ? '从开始到结束的变化' : '目标 ' + v.target.weightGoal + 'kg',
      status: s.weightChange === null ? undefined : (s.weightChange < 0 ? 'ok' : (s.weightChange > 0 ? 'warn' : undefined)),
    },
    { label: '日均运动', value: fmt(s.avgExercise), unit: '卡', detail: exerciseDays + ' 天有运动记录' },
    /* #497：分母＝有记录的天（与取数层 complianceRate 同源；旧口径除以窗口天数）。
     * 无热量记录（纯称重／纯运动窗）不断言 0%（0/0 不编数），明示先记一餐。 */
    {
      label: '达标比例', value: okDays === null || logged === 0 ? '—' : String(Math.round((okDays / logged) * 100)),
      unit: okDays === null || logged === 0 ? '' : '%',
      detail: okDays === null
        ? '暂无目标，先去设一个目标'
        : (logged === 0
          ? '这段时间还没记过吃多少，先记一餐再来看'
          : '有记录的 ' + logged + ' 天里 ' + okDays + ' 天达标（每天不超过目标的 105%）'),
    },
  ]);
}

/** 逐日明细列（#160 返工：`热量卡`／`体重kg`／`缺口卡` 是把单位黏成一个名词，
 *  单位回括号＝`热量(卡)`／`体重(kg)`／`热量缺口(卡)`，与同页图表标题同形）。 */
function bDailyColumns(): Array<{ key: string; label: string; align?: 'right' }> {
  return [
    { key: 'date', label: '日期' },
    { key: 'calorie', label: '热量(卡)', align: 'right' },
    { key: 'weight', label: '体重(kg)', align: 'right' },
    { key: 'exercise', label: '运动消耗(卡)', align: 'right' },
    { key: 'protein', label: '蛋白(g)', align: 'right' },
    { key: 'deficit', label: '热量缺口(卡)', align: 'right' },
    { key: 'water', label: '饮水(ml)', align: 'right' },
  ];
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
  const dLabel = dateLabelOf(v);
  const techNote = bTechNote(v);
  const parts: string[] = [
    techNote,
    bKpiGrid(v),
    renderChartBlock({
      kind: 'line',
      title: '每天吃了多少',
      input: {
        items: v.days.map((d) => ({ label: dLabel(d.date), value: d.calories })),
        options: {
          yTicks: 3,
          format: calorieAxis.format,
          labels: 'select',
          yMin: calorieAxis.yMin,
          yMax: calorieAxis.yMax,
          /* #160：空白日不补 0、只连线——没有记录的日期在数列里是 null，公共层折线默认在 null 处断线，
           * 稀疏记录会只剩孤点（用户肉眼反馈「点之间总是没有线」）。 */
          connectNulls: true,
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
        items: weighed.map((d) => ({ label: dLabel(d.date), value: d.weightKg })),
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
            { name: '每次称重', items: weighed.map((d) => ({ label: dLabel(d.date), value: d.weightKg })) },
          ],
        },
      },
    }));
  }
  parts.push(renderDataTable({
    columns: bDailyColumns(),
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
    const monthly = bMonthlySummary(v);
    parts.push(renderDataTable({
      columns: [
        { key: 'month', label: '月份' },
        { key: 'days', label: '这个月几天', align: 'right' },
        { key: 'logged', label: '记了几天', align: 'right' },
        { key: 'avg', label: '日均热量', align: 'right' },
      ],
      rows: monthly.rows,
      caption: '按月汇总（只列有记录的月份）',
      emptyText: '这段时间还没有逐日记录',
    }));
    if (monthly.emptyMonths > 0) {
      parts.push('<div class="legend"><span>其余 ' + monthly.emptyMonths + ' 个月没有记录</span></div>');
    }
    parts.push(renderDisclosure({
      /* #160 返工④：折叠标题与 pair 页同款「每天一行」（`trendDocs.ts` 同一句），并在括号里报窗口天数；
       * 旧串「逐日明细（730 天）· 展开」的「· 展开」是死字（展开后仍写「展开」），且与块内那张
       * 名为「逐日明细」的表重名——现在标题说「一天一行」、表题说「逐日明细」，各说各的一件事。 */
      title: '每天一行（共 ' + v.days.length + ' 天）',
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
    docTitle: docTitleOf(v),
    title: bWindowTitle(v.window),
    eyebrow: '',
    subtitle: null,
    metaLeft: bMetaLeft(v),
    badge: NO_BADGE,
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
  const dLabel = dateLabelOf(v);
  const techNote = bTechNote(v);
  const parts: string[] = [
    techNote,
    bKpiGrid(v),
    renderChartBlock({
      kind: 'line',
      title: '每天吃了多少',
      input: {
        items: v.days.map((d) => ({ label: dLabel(d.date), value: d.calories })),
        options: {
          yTicks: 3,
          format: calorieAxis.format,
          labels: 'select',
          yMin: calorieAxis.yMin,
          yMax: calorieAxis.yMax,
          emptyText: '暂无数据，换个窗口试试',
          /* #160：同 A 组——空白日不补 0、只连线。 */
          connectNulls: true,
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
        items: weighed.map((d) => ({ label: dLabel(d.date), value: d.weightKg })),
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
            { name: '每次称重', items: weighed.map((d) => ({ label: dLabel(d.date), value: d.weightKg })) },
          ],
        },
      },
    }));
  }
  parts.push(renderDataTable({
    columns: bDailyColumns(),
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
    docTitle: docTitleOf(v),
    title: bWindowTitle(v.window),
    eyebrow: '',
    subtitle: null,
    metaLeft: bMetaLeft(v),
    badge: NO_BADGE,
    summary: bSummaryLine(v),
    content: parts.join(''),
    charts: true,
  });
}
