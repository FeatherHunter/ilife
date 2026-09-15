/** #113 · 趋势 2＋其他 6 移植 8 键 HTML 填充器（t71 需移植八模板的展示面）。
 *
 * 包裹约定（沿 #111/#112，不新增）：
 * sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs，图表 CSS 由其运行时注入）。
 * 复制文本一律 buildDataText（#77 契约）：stat 投影 metrics 只收确定数字。
 * 本层不做取数（数据由 render/trendMiscPort.ts 备齐），不返空（缺失由数据层抛 missing-data）。
 *
 * **#277 就地去掉一支**：`batch_import_preview` 那一页（老实物 24324 B，属 `t425` §五 第 ⑦ 类
 * 「预检确认页」）搬进 `src/diet/precheck.ts`＋`src/diet/precheckPort.ts`——页属饮食的 #277、
 * 件属 #113 的杂项，是归属错配；搬法正是本包告警线台账那一行写好的「按页族切姊妹件」的第一步。
 * 本件只剩 7 键（calorie_trend／lint_health／long_trend／nutrition_analysis／process_progress／
 * review_template／six_factors）。
 */
import {
  renderCaliberLine,
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
const DOC_TITLE = '卡路里·趋势';

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

/** x 轴刻度标签（#160 收口·本票第二件）：窗口**跨年**时带两位年份（`25-09-08`），否则照旧只给 `09-08`。
 *  判据与实现**与 `analysis/multiTrendPage.ts::dateLabelOf` 同源**（`start`／`end` 的年份不同才补年份；
 *  同仓先例＝`weight/weightCompare2.ts` 的 `crossYear ? d.slice(2) : d.slice(5)`）。
 *  两件共用件不在 #160 写集，故在本件内落一个同形函数——**改口径时两处一起动**。
 *  例：730 天窗的首／中两个刻度都落在 09-08，旧口径的 `09-08 09-08 09-07` 读不出谁是哪一年。 */
function dateLabelOf(start: string, end: string): (date: string) => string {
  const crossYear = start.slice(0, 4) !== end.slice(0, 4);
  return (date: string): string => (crossYear ? date.slice(2) : date.slice(5));
}

/* ── 纵轴量程与刻度（#424）：刻度条数恒 3，与公共层 `GRID_LINES = 3` 的网格线叠合。
 *  量程贴着数据（体重 90 天只走 1.1kg，量程给宽了曲线就是平线）。 ── */

/** 「整齐数上界」：把 v **向上**收到 1／2／2.5／5／10 的整数倍（返回值恒 ≥ v）。
 *  #424 返工：原 `niceRound(v, 5)` 判据 `scaled <= choice * k` 却返回 `choice * base`，
 *  `v=1800` 返回 1000 —— 上界低于数据峰值与目标值，点出盒、线穿卡片、目标虚线消失。 */
function niceCeil(v: number): number {
  const base = Math.pow(10, Math.floor(Math.log10(Math.abs(v))));
  const scaled = v / base;
  for (const choice of [1, 2, 2.5, 5, 10]) {
    if (scaled <= choice) return choice * base;
  }
  return 10 * base;
}

/** 三件套：上下界＋刻度文案（步长 <1 留 1 位小数，否则取整；`unit` 空串则不带单位）。 */
function axisOf(yMin: number, yMax: number, unit: string): {
  readonly yMin: number;
  readonly yMax: number;
  readonly format: (value: number) => string;
} {
  const print = (yMax - yMin) / 2 < 1 ? 1 : 0;
  return { yMin, yMax, format: (value: number) => value.toFixed(print) + unit };
}

/** 体重类小区间：数据各留 12.5% 余量（最小跨度 0.4kg），两端收到 0.1 的整数倍；刻度 3 条与网格同域。 */
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
  const half = (span * 1.25) / 2;
  const center = (dataLo + dataHi) / 2;
  const yMin = Math.round((center - half) * 10) / 10;
  const top = Math.round((center + half) * 10) / 10;
  return axisOf(yMin, top > yMin ? top : Math.round((yMin + 0.4) * 10) / 10, 'kg');
}

/** 热量类：0 起，上界向外收到整齐数（恒 ≥ 峰值，含并入的目标值）。 */
function calorieAxisOf(peak: number | null): {
  readonly yMin: number;
  readonly yMax: number;
  readonly format: (value: number) => string;
} | null {
  if (peak === null || !Number.isFinite(peak) || peak <= 0) return null;
  return axisOf(0, niceCeil(peak), '卡');
}

/* ── 热量趋势（calorie_trend：T7 口径日序列＋达标统计） ── */

export function buildCalorieTrendDoc(v: CalorieTrendView): string {
  const s = v.data.summary;
  const n = v.data.series.length;
  /* #160 收口（本票第一件）：达标统计的分母＝**有记录的天**（series 里 `calorie` 为 null 即那天没记）。
   * 与卡下那句图例（「没记录的那天不按 0 算」）同一条口径；卡片文案由此改写——老文案的分母是窗口
   * 天数 n（把没记录的天当 0 卡算成达标），被删口径已逐字搬进下面的 techNote。 */
  const loggedDays = v.data.series.filter((d) => d.calorie !== null).length;
  const dLabel = dateLabelOf(v.start, v.end);
  const trendHuman = s.trend === 'down' ? '呈下降' : (s.trend === 'up' ? '呈上升' : '基本平稳');
  /* #160 收口：达标分母与被删口径都落在这条注释里（e2e 认 `calorie.view.calorie-trend`／`window` 两个
   * 字面量，前缀逐字未动）；原「达标天数写【全部<窗口天数>天里 M 天达标】、分母＝窗口天数、没记录的
   * 天按 0 卡计入达标」与「图上把没记录的天补成 0 卡落点」两条老口径即在此留档。 */
  const techNote = '<!-- calorie.view.calorie-trend window ' + v.start + ' ' + v.end
    + ' T5 buildSeries 唯一源（水已排除） 达标＝单日≤目标×1.05 达标分母＝有记录的天' + loggedDays
    + '（没记录的天不参与达标统计、也不按 0 卡算） 最小形态 空窗阻断 不编数'
    + ' 被删口径（#160 收口前）：达标天数写「全部 ' + n + ' 天里 ' + s.compliantDays
    + ' 天达标」——分母＝窗口天数、没记录的天按 0 卡计入达标；图上没记录的天补 0 卡落点（与图例打架） -->';
  /* #160 返工：原 meta 行的「默认组」（自造分组名，读者既不懂也选不了）与「对照目标值」
   *  （页上唯一的对照就是图里那条目标线，图例已写）一律删；窗口天数与区间留可见面。 */
  const metaLeft = '近' + n + '天 · ' + v.start + '~' + v.end;
  /* #160 返工③：摘要（页头副标题）只留卡片里没有的那句——**窗口天数怎么分成工作日／周末**
   *  （第 4 张卡只给两边的均值，没说各有几天）。旧句「日均493.5卡（目标1800卡）· 呈下降 ·
   *  达标11天，占全部 90 天」与「日均」「趋势」「达标天数」三张卡逐项同值，
   *  「目标1800卡」还在卡副标与图例各印一遍（一页三处）。 */
  const summary = '其中工作日 ' + v.data.meta.weekdayCount + ' 天、周末 ' + v.data.meta.weekendCount + ' 天';
  // #424：目标值并入纵轴量程（目标线不越界），上界收到整齐数，刻度 3 条带单位「卡」。
  let peak: number | null = s.target;
  for (const d of v.data.series) {
    const c = d.calorie;
    if (typeof c === 'number' && Number.isFinite(c)) {
      if (peak === null || c > peak) peak = c;
    }
  }
  const calorieAxis = calorieAxisOf(peak) ?? axisOf(0, 1, '卡');
  const parts: string[] = [
    techNote,
    renderKpiGrid([
      { label: '日均', value: String(s.avg), unit: '卡', detail: '目标 ' + s.target + '卡' },
      { label: '趋势', value: trendHuman, detail: '从开头 ' + s.startAvg + ' 到结尾 ' + s.endAvg + '（差 ' + s.trendValue + '）' },
      /* #160 收口（本票第一件）：分子与分母一次说清，且分母＝**有记录的天**（与图例同一口径）——
       * 「有记录的 N 天里 M 天达标」。老文案「全部 N 天里 M 天达标」的 N 是窗口天数、没记录的天
       * 被当 0 卡算成达标（7d 窗只记 5 天却报 7 天达标），与图例当场打架；被删口径见 techNote。 */
      { label: '达标天数', value: String(s.compliantDays), unit: '天',
        detail: '有记录的 ' + loggedDays + ' 天里 ' + s.compliantDays + ' 天达标（每天不超过目标的 105%）' },
      { label: '周末比工作日', value: String(s.weekendDiff), unit: '卡', detail: '工作日 ' + s.weekdayAvg + '／周末 ' + s.weekendAvg },
    ]),
    renderChartBlock({
      kind: 'line',
      /* #160 返工：图题只留「画的是什么」——原「没记录的日子不算 0、只连线」是画法说明，
       * 图下那行图例已逐字说过一遍（100% 冗余），整段删。 */
      title: '每日热量',
      input: {
        items: v.data.series.map((d) => ({ label: dLabel(d.date), value: d.calorie })),
        /* #424：纵轴刻度 3 条（与公共层 GRID_LINES=3 叠合）、标签带单位、横轴首＋峰＋尾。 */
        options: {
          markLine: { value: s.target, label: '目标' },
          yTicks: 3,
          labels: 'select',
          format: calorieAxis.format,
          yMin: calorieAxis.yMin,
          yMax: calorieAxis.yMax,
          /* #160 收口：日序列里没记录的天**真的是 null** 了（取数层不再 `?? 0` 补 0 卡），
           * 公共层折线默认在 null 处断线（connectNulls 默认 false）→ 显式跨空连线，图例那句
           * 「没记录的那天不按 0 算，只在有记录的两天之间连线」从这一版起在图上成立。 */
          connectNulls: true,
        },
      },
    }),
    /* #160 返工：图例只留目标值（图里橙虚线那位的名字）；空白日口径降级成一句图下小字，
     * 位置同在该图卡片之后（原来那句话一页出现两次：图题一次、图例一次）。 */
    '<div class="legend"><span><i class="b"></i>目标' + s.target + '卡</span>'
      + '<span>没记录的那天不按 0 算，只在有记录的两天之间连线</span></div>',
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
    title: '热量趋势',
    eyebrow: '卡路里 · 趋势',
    subtitle: null,
    metaLeft,
    /* #160 返工②：徽章不传（空串＝`shared/docPage.ts` 整颗不渲染）——本页 H1 逐字就是「热量趋势」，
     *  徽章再印一遍是同页同词两遍。 */
    badge: '',
    summary,
    content: parts.join(''),
    charts: true,
  });
}

/* ── 整体趋势（long_trend：体重＋热量双序列） ── */

export function buildLongTrendDoc(v: LongTrendView): string {
  /* #424：两张图的纵轴都给「三刻度＋单位」；热量从 0 起，体重贴数据。 */
  /* #160 收口（本票第二件）：两张图的横轴标签一律走同件 `dateLabelOf`（跨年补两位年份），
   * 与 `analysis/multiTrendPage.ts` 同源——365 天窗跨年，旧口径只给 `09-08` 分不出哪一年。 */
  const dLabel = dateLabelOf(v.start, v.end);
  const calorieAxis = calorieAxisOf(v.days.reduce((peak, d) => (d.calorie > peak ? d.calorie : peak), 0))
    ?? axisOf(0, 1, '卡');
  const weighed = v.days.filter((d) => d.weightKg !== null);
  const weightAxis = weightAxisOf(weighed.map((d) => d.weightKg as number));
  const parts: string[] = [
    renderKpiGrid([
      { label: '日均热量', value: String(v.avgCalorie), unit: '卡', detail: '按记了吃多少的天算' },
      {
        label: '体重变化', value: fmt(v.weightChange), unit: v.weightChange === null ? '' : 'kg',
        detail: v.weightChange === null ? '这段时间只称了 1 次，比不出变化' : '从第一天到最后一天',
        status: v.weightChange === null ? undefined : (v.weightChange < 0 ? 'ok' : (v.weightChange > 0 ? 'warn' : undefined)),
      },
      { label: '数据天数', value: String(v.windowDays), unit: '天', detail: '有记录的天 · ' + v.start + ' ~ ' + v.end },
    ]),
    renderChartBlock({
      kind: 'line',
      /* #160 返工：图题只留「画的是什么」——窗口天数meta 行与「数据天数」卡已各说一次，
       * 画法说明（不算 0／只连线）图下那句小字已说，图题不再复述图例。 */
      title: '每日热量',
      input: {
        items: v.days.map((d) => ({ label: dLabel(d.date), value: d.calorie })),
        /* #424：纵轴刻度 3 条（与公共层 GRID_LINES=3 叠合）、标签带单位、横轴首＋峰＋尾。 */
        /* #160：跨空白日连线（不补 0），见同件 `connectNulls` 说明。 */
        options: {
          yTicks: 3,
          format: calorieAxis.format,
          labels: 'select',
          yMin: calorieAxis.yMin,
          yMax: calorieAxis.yMax,
          connectNulls: true,
        },
      },
    }),
    '<div class="legend"><span>没记录的那天不按 0 算，只在有记录的两天之间连线</span></div>',
  ];
  let charts = true;
  if (weighed.length > 0 && weightAxis !== null) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '体重轨迹（' + v.windowDays + ' 天里称了 ' + weighed.length + ' 次）',
      input: {
        items: weighed.map((d) => ({ label: dLabel(d.date), value: d.weightKg })),
        options: {
          yTicks: 3,
          format: weightAxis.format,
          labels: 'select',
          yMin: weightAxis.yMin,
          yMax: weightAxis.yMax,
          /* #160：跨空白日连线（不补 0），见同件 `connectNulls` 说明。 */
          connectNulls: true,
          highlightLast: true,
          legend: true,
          ...(weighed.length >= 2 ? { avgLine: 7 } : {}),
          series: [
            { name: '每次称重', items: weighed.map((d) => ({ label: dLabel(d.date), value: d.weightKg })) },
          ],
        },
      },
    }));
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'calorie', label: '热量(卡)', align: 'right' },
      { key: 'weight', label: '体重(kg)', align: 'right' },
    ],
    rows: v.days.map((d) => ({ date: d.date, calorie: d.calorie, weight: fmt(d.weightKg) })),
    /* #160 返工：表名只说「这是什么表」——区间同页 meta 行与「数据天数」卡已出现两次，删。 */
    caption: '逐日明细',
    emptyText: '这段时间还没有逐日记录，先记一餐或称一次体重再来看',
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
    title: '近' + v.windowDays + '天整体趋势',
    /* #160 返工：原眉标「calorie.view.long-trend · 趋势其他移植域」是命令键＋内部黑话
     * （snake_case 与「移植域」直接印在用户页最顶一行），换成读者看得懂的分域名；
     * 原副标「体重＋热量双序列（称重不足 2 次则体重变化明示缺失）」是工程词解释实现，
     * 换成一句「这页有什么」；体重缺失的口径已在「体重变化」卡的详例里说清，不再另说一次。 */
    eyebrow: '卡路里 · 趋势',
    subtitle: '这页只有两本账：吃了多少看热量曲线，称了多少看体重曲线',
    metaLeft: '近' + v.windowDays + '天 · ' + v.start + '~' + v.end,
    /* #160 返工②（同一条规则的第三处）：徽章不传——本页 H1 是「近30天整体趋势」，逐字包含「整体趋势」，
     *  徽章再印一遍是同页同词两遍。 */
    badge: '',
    content: parts.join(''),
    charts,
  });
}

/* ── 营养分析（nutrition_analysis：宏量占比＋微量 vs 推荐＋规则建议） ── */

export function buildNutritionAnalysisDoc(v: NutritionAnalysisView): string {
  const folded = v.proteinG * 4 + v.carbG * 4 + v.fatG * 9;
  const parts: string[] = [
    /* #496 · 原说明是「宏量占比＝蛋白/碳水×4、脂肪×9 除以总热量；微量＝日均 vs 每日推荐」——
       裸公式 ＋「宏量」「微量」「vs」三个内部叫法（审查件第 16 条）。改成读者读得懂的换算规则。 */
    windowForm(v.start, v.end, '蛋白和碳水每克 4 千卡、脂肪每克 9 千卡，除以总热量得到占比；下面是每天平均摄入和每天推荐量的对比'),
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
          { label: '蛋白（千卡）', value: v.proteinG * 4 },
          { label: '碳水（千卡）', value: v.carbG * 4 },
          { label: '脂肪（千卡）', value: v.fatG * 9 },
        ],
        /* #496 · 中心原本不给标签，只印三数之和（891）——与上方「总摄入 1,916 卡」并排互相矛盾
           （审查件第 83 条）。中心标明这是**折算**出来的合计，图下再说一句为什么两处对不上。 */
        options: {
          showPercent: true, centerLabel: '折算合计（千卡）', centerValue: String(Math.round(folded)),
        },
      },
    }));
    parts.push(renderCaliberLine('环上的数＝蛋白、碳水、脂肪按每克 4／4／9 千卡折算出的热量；它与上方「总摄入」（按每条记录的热量合计）不是同一个数——记录里的热量是各条自己报的值。'));
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
    eyebrow: '卡路里 · 趋势',
    /* #511 · 原副题「配比＋微量＋规则建议（建议阈值见数据层注释，不编造结论）」——「配比／微量／规则建议」
       是内部叫法，括号里那半句还是开发过程说明（审查件第 82 条）⇒ 换成一句「这页有什么」。 */
    subtitle: '三大营养素比例、其他营养素摄入、以及根据这些数据给出的建议',
    content: parts.join(''),
    charts,
  });
}

/* ── 每日六因素（six_factors） ── */

/** 数据层文案上屏归一（做法沿 `render/trendDocs.ts` 的 `humanText` 先例）。
 *
 *  #511 · 六因素那张页的**逐项名**与**没设目标时的那句话**都由取数层 `render/trendMiscPort.ts:215-227`
 *  写死，本票声明路径不含那一件（它已 456 行、另在别的票的账上）⇒ 在装配层换成人话，取数层一行不动。
 *  换的两处（审查件第 86、87 条）：
 *    · `热量达标` → 「热量（千卡）达标」——全页没有一处说清热量的单位，条目名本身补上；
 *    · `无X目标（先设目标）` → 一句说明「为什么判不了达标 ＋ 要设该说哪条唤醒词」（原句是祈使句，
 *      读者不知道去哪里设）。
 *  表里没有的取值原样透传（有目标时那几句「当日摄入 / 目标」不动）。 */
const HUMAN_TEXT: Record<string, string> = {
  热量达标: '热量（千卡）达标',
  '无热量目标（先设目标）': '没有设热量目标，所以判不了达标。要设请说“定营养目标”',
  '无蛋白目标（先设目标）': '没有设蛋白目标，所以判不了达标。要设请说“定营养目标”',
  '无饮水目标（先设目标）': '没有设饮水目标，所以判不了达标。要设请说“定饮水目标”',
};

function humanText(s: string): string {
  return HUMAN_TEXT[s] ?? s;
}

export function buildSixFactorsDoc(v: SixFactorsView): string {
  const parts: string[] = [
    renderKpiGrid(v.factors.map((f) => ({
      label: humanText(f.label), value: f.ok ? '✓' : '✗', detail: humanText(f.detail),
      status: f.ok ? 'ok' : 'warn' as 'ok' | 'warn',
    }))),
    renderDataTable({
      columns: [
        { key: 'label', label: '因素' },
        { key: 'ok', label: '达标' },
        { key: 'detail', label: '依据' },
      ],
      rows: v.factors.map((f) => ({ label: humanText(f.label), ok: f.ok ? '✓' : '✗', detail: humanText(f.detail) })),
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
    eyebrow: '卡路里 · 趋势',
    /* #511 · 这一句是 #496 补的「六因素是哪六项」（审查件第 85 条），本票只在它后面补一句单位口径
       （审查件第 86 条：全页没有一处说清热量的单位是千卡）。**不往枚举里塞「（千卡）」**：那句话是
       #496 的交付物、被 `test/t496-文案统一.test.mjs` 逐字钉住（该测试件不在本票声明路径内），
       单位改由**条目名**（`热量（千卡）达标`）与句末这句口径承载——两处合起来读得到单位。 */
    subtitle: '六因素＝这 6 项：热量、蛋白、饮水、运动、称重、三餐（热量按千卡计）',
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
    eyebrow: '卡路里 · 趋势',
    subtitle: '未匹配库/零负热量/未来日期/疑似重复（只读，不写库）',
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
    eyebrow: '卡路里 · 趋势',
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
    eyebrow: '卡路里 · 趋势',
    subtitle: '三面小结＋派生要点（要点为规则输出，非 AI 建议）',
    content: parts.join(''),
    charts: false,
  });
}
