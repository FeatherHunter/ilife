/** #110 · 趋势/分析域全文档装配（数据→区块→填充器）。
 *
 * 范围（47 页同质之趋势/分析域，t71 口径「新版已有」）：`calorie.view.combined`
 * （combined_analysis：11 配对×白名单窗口，落差最大：旧 6 节→新 1 KPI 壳）／
 * `calorie.view.deficit`（calorie_deficit）／`calorie.view.anomaly`（anomaly_report，
 * 23 种诊断）／`calorie.view.contraindication`（contraindication_report）／
 * `calorie.view.predict`（predict_report 体重预测）／`calorie.view.goal-predict`
 * （目标预测达成）。
 * 不碰：calorie_trend／long_trend／nutrition_analysis／six_factors 等 18 项需移植
 * （→ #111–#113），calorie.history（趋势遗留词归宿，与本域无关），饮食域（#108 已关）、
 * 运动/身体域（#109 已关）。envelope `data.metrics` 逐键不动（零快照 churn）；
 * 模板闭集不动；冻结面不动。
 *
 * 做法（#104 §4 用法）：内容 = base-paint/blocks 12 区块（B-01 壳／B-02 KPI／B-03 表／
 * B-04 图／B-05 列表／B-08 折叠／B-09 参数表单／B-11 复制区），文档 = fillTemplate 包裹
 * （资产裸文本＋填充器包裹；sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs，图表 CSS 由其运行时注入）。
 * 复制文本一律 buildDataText（#77 契约，技能侧不自产第二套序列化）：指标页走 stat 投影。
 * 本层不做取数（数据由调用方 dispatch 备齐），不返空（缺失由数据层抛 missing-data）。
 */
import {
  renderCaliberLine,
  renderChartBlock,
  renderCopyBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
  renderParamForm,
} from 'base-paint/blocks';
import { buildDataText, buildLogText } from 'base-paint';
import type { DataTextInput } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyLog, dataCopyArea } from '../shared/copyArea.js';
import { sceneEnvelope } from '../shared/sceneEnvelope.js';
import { nowStamp } from './receipt.js';
import { pageChromeCss } from './pageChromeCss.js';
import type { CombinedAnalysis } from './analysisPlate.js';
import type { AnomalyView, ContraView } from './insightPlate.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。
 *  W1（#518）：下面六件是**两族共件**——缺口／预测族（姊妹件 `trendPredictDocs.ts`）从这里导入，
 *  故一律导出；本件的 `buildCombinedDoc`／`buildAnomalyDoc`／`buildContraDoc` 仍自用。 */
export const DOC_VERSION = '0.1.0';
export const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  #160 文本返工：三套旧标题（`卡路里·趋势分析`／`卡路里·趋势其他移植`／`卡路里·整体趋势`）
 *  并成一套；页型由各页 H1 承担，head 只留域。 */
export const DOC_TITLE = '卡路里·趋势';

export function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

/** 标签里的单位括号（`体重(kg)` → `kg`）；没括号即 undefined（`renderKpiCard` 不给 unit 就不出这一格）。 */
function unitOf(label: string): string | undefined {
  const m = /[(（]([^)）]*)[)）]/.exec(label);
  return m === null ? undefined : m[1];
}

/** 净变化人话（Δ 的符号 → 「比开头高／低」；0 → 「和开头一样」）。 */
function deltaHuman(d: number | null): string {
  if (d === null || d === undefined) return '';
  const abs = Math.abs(Math.round(d * 100) / 100);
  if (abs === 0) return '和开头一样';
  return '比开头' + (d > 0 ? '高' : '低') + ' ' + abs;
}

/** 相关强度三档（**人话**，阈值与旧 combined_analysis 口径逐字同源：|r|≥0.5 明显／≥0.3 有一点／否则几乎没有）。
 *  #160 文本返工：旧名 `corrInterp` 出的是「强相关／中等相关／弱相关」三个统计词，故改名改词。 */
function corrLevel(r: number | null | undefined): string {
  if (r === null || r === undefined) return '还看不出';
  const a = Math.abs(r);
  if (a >= 0.5) return '很明显';
  if (a >= 0.3) return '有一点';
  return '几乎没有';
}

/** 数据层文案的**上屏归一**（#160 回炉）：英文缩写换人话、半角标点换中文。
 *  数据层（`analysis/*`）的结论句是内部口径的原文写法，直接上屏会把缩写与半角标点带给读者；
 *  这里只换缩写与标点，**数字与单位一个不动**（千分位 `1,275` 先占位、换完再还原）。 */
const TECH_WORD_ZH: ReadonlyArray<readonly [RegExp, string]> = [
  [/KCAL_PER_KG/g, '每 7700 卡'],
  [/TDEE/g, '日常消耗'],
  [/BMR/g, '基础代谢'],
];

export function humanText(s: string): string {
  let out = s;
  for (const [re, zh] of TECH_WORD_ZH) out = out.replace(re, zh);
  return out
    .replace(/(\d),(\d{3})\b/g, '$1\u0001$2')
    .replace(/,/g, '，')
    .replace(/;/g, '；')
    .replace(/([^\d]):(?!\d)/g, '$1：')
    .replace(/\(/g, '（')
    .replace(/\)/g, '）')
    .replace(/\u0001/g, ',');
}

/** 被删的技术口径改住 HTML 注释（#160 规矩：读者用不上的口径不上屏，但要在产物里留得住）。
 *  注释形态已被测试接受——`test/doc-page-assert.mjs` 的残留判据只认**未填充**的槽位标记。 */
export function techNoteHtml(bits: readonly string[]): string {
  return '<!-- ' + bits.join(' ') + ' -->';
}

const SEV_ZH: Record<string, string> = { error: '错误', warn: '警告', info: '提示' };
const CONTRA_STATUS_ZH: Record<string, string> = { ok: '通过', warn: '有警告', fail: '有错误' };

/* ── 组合分析（combined_analysis.html 对照：KPI＋双轴走势＋相关回归散点＋延迟相关＋分层对比＋insight） ── */

export function buildCombinedDoc(c: CombinedAnalysis): string {
  const a = c.analysis;
  /* #160 文本返工：窗口词只留中文（旧实现把 `custom` 原样吐到页头，界面里冒英文参数值）。 */
  const windowHuman = /^(\d+)d$/.test(c.window) ? '近' + c.window.slice(0, -1) + '天'
    : (c.window === 'week_cur' ? '本周' : (c.window === 'month_cur' ? '本月'
      : (c.window === 'custom' ? '自定义时间' : c.window)));
  const stripUnit = (s: string): string => s.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '') || s;
  const aShort = stripUnit(a.labels.a);
  const bShort = stripUnit(a.labels.b);
  const aUnit = unitOf(a.labels.a);
  const bUnit = unitOf(a.labels.b);
  /* #160 文本返工：技术口径不进可见正文（读者看不懂也用不上），一律折进这条 HTML 注释。
   *  注释里 `配对<key> 窗口<window>` 两段**逐字保留**——产物必须消费掉这两个入参（`pnpm test` 的
   *  真出口与本仓 e2e 都按这两个字面量查「参数真的落进页面了」）。 */
  const techBits = [
    '配对' + c.pair, '窗口' + c.window,
    '11配对白名单窗口', '非法窗exit2', '不静默回退', '数列唯一源buildSeries', '最小形态', '空窗阻断', '不编数',
    '相关系数 r=' + (a.correlation.r === null ? '—' : a.correlation.r) + ' n=' + a.correlation.n,
    '相关强度=|r|≥0.5明显 ≥0.3有一点 否则几乎没有',
    '回归斜率=' + (a.regression === null ? '样本不足未拟合' : a.regression.slope) + ' n=' + (a.regression === null ? 0 : a.regression.n) + ' 散点横轴=' + a.labels.a + ' 纵轴=' + a.labels.b,
    '日差r=' + (a.lag.length === 0 ? '无' : a.lag.map((l) => l.lag + '天' + (l.r === null ? '—' : l.r)).join('/')),
    '均值=有记录那些天的平均 Δ=窗口内末尾−开头',
    '明细空缺留空不按0算 全量见复制数据',
    '分层备注=本组净变化减另一组净变化',
    '超标日口径=单日摄入>目标×1.3',
  ];
  const techNote = '<!-- ' + techBits.join(' ') + ' -->';
  /* 页头只留「窗口 · 区间」：配对名在 H1、图例、表头里已各出现一次，meta 再写一遍是第四次；
   *  单日窗口不写成 `~` 两端同一天（读者会以为渲染坏了）。 */
  const metaLeft = windowHuman + ' · ' + (c.start === c.end ? c.start : c.start + '~' + c.end);
  /* #160 肉眼返工：对齐样本太少（<3 天）时，散点／延迟相关／分层对比三节摆出来只会是一堆「—」与空图，
   *  改为**不摆空节**，把话说到摘要行里（用户反馈「表格也没什么数据」）。 */
  const alignedDays = a.correlation.n;
  const lowSample = alignedDays < 3;
  const lowSampleNote = windowHuman + '里两项都齐全的只有 ' + alignedDays + ' 天（共 ' + a.days + ' 天有记录），'
    + '样本太少、看不出关联，先攒几天数据再看。';
  const summary = lowSample ? lowSampleNote : (a.insight !== '' ? a.insight : ('这 ' + a.days + ' 天里，两项的数字都摆出来了，先看图上的走势。'));
  const parts: string[] = [
    techNote,
    renderKpiGrid([
      /* #160 文本返工：`相关系数 r` 是统计词、r 数字读者用不上 → 标签改人话、值改档位、r 进注释。
       *  方向不放这张卡：摘要句已经说了「谁多的时候谁怎样」，同页说两遍就成冗余。 */
      { label: '一起变的程度', value: corrLevel(a.correlation.r) },
      /* 均值＝**有记录那些天**的平均（不是窗口天数）；Δ＝窗口内末尾−开头。两者都写清，读者才能自己核。 */
      {
        label: '平均' + aShort, value: fmt(a.aAvg),
        ...(aUnit === undefined ? {} : { unit: aUnit }),
        detail: '有记录的 ' + a.aCount + ' 天' + (a.aDelta === null ? '' : '，' + deltaHuman(a.aDelta)),
      },
      {
        label: '平均' + bShort, value: fmt(a.bAvg),
        ...(bUnit === undefined ? {} : { unit: bUnit }),
        detail: '有记录的 ' + a.bCount + ' 天' + (a.bDelta === null ? '' : '，' + deltaHuman(a.bDelta)),
      },
      /* 主标签说清是谁的天数；旧副标「双侧有数据的天数」只是把主标签换个说法，同页第三遍 → 删。 */
      { label: '两项都有记录的天数', value: String(a.correlation.n), unit: '天' },
    ]),
  ];
  let charts = false;
  if (a.line.length > 0) {
    const aItems = a.line.map((p) => ({ label: p.date.slice(5), value: p.a }));
    const bItems = a.line.map((p) => ({ label: p.date.slice(5), value: p.b }));
    /* #160 文本返工：图题只说画的是什么（「体重与摄入」）；「哪条线是哪项／各有各的刻度」搬进图例
     *  （公共层按 `series[].name` 出图例，独立刻度那条另出「各指标独立刻度」，均不改公共层）。 */
    parts.push(renderChartBlock({
      kind: 'line',
      /* #160 回炉（对抗审查项③，二选一裁定＝**删图题**）：原图题 `aShort与bShort`（如「体重与摄入」）
       *  只比本页 H1「看体重与摄入」少一个「看」字，同一件事一屏里说两遍，而图题又恰好读在 H1 之后。
       *  图例已给两条线的名字（`series[].name`）、独立刻度那条另有「各指标独立刻度」；
       *  故本图题整个不传（`renderChartBlock` 的 title 可选，不传即不产 h2）。
       *  同件其它图题顺手扫过：散点「体重(kg)和摄入(卡)的关系」多了「关系」与两个单位、不与 H1 同形，
       *  deficit 图题已另改成「每日摄入与消耗」（那页 H1 是窗口与区间，不含图题措辞）——只此一处要删。 */
      input: {
        items: aItems,
        options: {
          /* #160：空白日不补 0、只连线——没有记录的日期是 null，折线默认在 null 处断线，稀疏记录会只剩孤点。 */
          connectNulls: true,
          legend: true,
          series: [
            { name: a.labels.a, items: aItems },
            { name: a.labels.b, items: bItems, dashed: true, ownScale: true },
          ],
        },
      },
    }));
    charts = true;
  }
  if (a.scatter.length > 0 && !lowSample) {
    /* #160 文本返工：旧图题「相关性与回归（斜率 -5713.3333，n=5）」把统计口径塞进标题；斜率与 n 折进
     *  HTML 注释，标题只留读者要的那件事。散点图公共层没有轴名能力，故标题自带单位（横轴 A／纵轴 B）。 */
    parts.push(renderChartBlock({
      kind: 'scatter',
      title: a.labels.a + '和' + a.labels.b + '的关系',
      input: {
        items: a.scatter.map((p) => ({ x: p.x, y: p.y })),
        options: { regression: a.regression !== null },
      },
    }));
    charts = true;
  }
  if (a.lag.length > 0 && !lowSample) {
    /* #160 回炉（对抗审查追加项）：三行全印「很明显」时这张表答不了自己的表题——档位分不出哪档更强，
     *  而 `l.r` 本来分得出（1 天 -0.83／2 天 -0.73／3 天 -1）。故**保留可排序的量**：档位＋括号里的 r，
     *  读者自己就能排出「往回看几天最说得通」；口径行给出括号该怎么读。
     *  不选「三档并成一句、删表」：延迟相关只有部分配对才有，删表会让这类配对整节消失；且 r 打平时
     *  一句话结论会说假话（并列最强时写「最明显」是编的）。 */
    parts.push(renderDataTable({
      columns: [
        { key: 'pair', label: '哪两天比' },
        { key: 'level', label: '对得上的程度' },
      ],
      rows: a.lag.map((l) => ({
        /* `vs` 是英文简写、不上屏（#160）：改成中文的「对」，列名已说明这是在比哪两天。 */
        pair: '往前 ' + l.lag + ' 天的' + bShort + ' 对当天的' + aShort,
        level: corrLevel(l.r) + (l.r === null || l.r === undefined ? '' : '（' + Math.round(l.r * 100) / 100 + '）'),
      })),
      /* 表名不带「仅某某配对有此节」那句写给作者的话；r 的算法与样本数进 HTML 注释（techBits）。 */
      caption: '往前推几天会不会更清楚',
      emptyText: '这段时间还没有记录，先记一餐或称一次体重再来看',
    }));
    /* 括号怎么读：说清方向与强弱（越靠两头越对得上），读者据此排序三行。 */
    parts.push(renderCaliberLine('括号里是两项对得上的程度，取值 -1 到 1：越靠近 1，前几天的' + bShort
      + '越高、当天' + aShort + '也越高；越靠近 -1 则一个高、另一个反而低；越靠近 0 越没有关系。'));
  }
  if (a.strat.rows.length > 0 && !lowSample) {
    /* 表名按实际两组名生成（旧名「分层对比」读者不知道按什么分的）；旧标题尾巴
     *  「（力量消耗合计 … vs 有氧 …）」是口径不是标题 → 降级成表下口径行。 */
    const srows = a.strat.rows;
    /* 这一节有两种形态：**两组比**（`工作日`／`周末` 这类分组名）与**两项并列**（`日均摄入`／`日均运动`——
     *  那是两个口径不同的数，不是两组，标题不能说「差多少」）。判据看行名，不写死配对键。 */
    const metricRows = srows.length > 0 && srows.every((r) => r.label.startsWith('日均'));
    const stratTitle = metricRows ? '这两项各是多少'
      : srows.length >= 2 ? srows[0].label + '和' + srows[1].label + '，差多少'
        : '这两项平均各是多少';
    /* #160 回炉：`备注` 列在 weight_deficit／weight_calorie 这些配对上**整列空白**（`analysis/cross.ts`
     *  的 `StratRow.note` 三处都给 ''），列头却照印——空列就是噪音。故**列定义按数据条件裁剪**：
     *  这组行里只要有一条真备注就出这一列，全空即整列不出（看数据，不写死配对键）。 */
    const hasNote = srows.some((r) => r.note !== undefined && String(r.note).trim() !== '');
    parts.push(renderDataTable({
      columns: [
        { key: 'label', label: '哪一组' },
        { key: 'days', label: '天数', align: 'right' },
        { key: 'aDelta', label: aShort + '变化', align: 'right' },
        { key: 'bAvg', label: '平均' + bShort, align: 'right' },
        ...(hasNote ? [{ key: 'note', label: '备注' }] : []),
      ],
      rows: srows.map((r) => ({
        label: r.label, days: r.days, aDelta: fmt(r.aDelta), bAvg: fmt(r.bAvg), note: r.note,
      })),
      caption: stratTitle,
      emptyText: '这段时间还没有记录，先记一餐或称一次体重再来看',
    }));
    if (a.strat.extra.length > 0) parts.push(renderCaliberLine(a.strat.extra.join('；')));
  }
  if (a.deficitBuckets.length > 0) {
    parts.push(renderDataTable({
      columns: [
        { key: 'label', label: '缺口多大' },
        { key: 'days', label: '天数', align: 'right' },
      ],
      rows: a.deficitBuckets.map((b) => ({ label: b.label, days: b.days })),
      caption: '按缺口大小分组：缺口越大，体重掉得越多吗',
      emptyText: '这段时间还没有记录，先记一餐或称一次体重再来看',
    }));
  }
  if (a.overLimitDays.length > 0) {
    parts.push(renderDisclosure({
      title: '吃得超目标的日子（每天超过目标的 1.3 倍，共 ' + a.overLimitDays.length + ' 天）',
      contentHtml: renderListRows({
        items: a.overLimitDays.map((d) => ({ main: d })),
      }),
    }));
  }
  if (a.line.length > 0) {
    const shown = a.line.slice(0, 100);
    parts.push(renderDisclosure({
      /* 折叠标题只说「这一块是什么」＋截断口径；窗口天数在页头说过，不在这里再报一遍。 */
      title: '每天一行' + (a.line.length > 100 ? '（只列前 100 条，共 ' + a.line.length + ' 天）' : ''),
      contentHtml: renderDataTable({
        columns: [
          { key: 'date', label: '日期' },
          { key: 'av', label: a.labels.a, align: 'right' },
          { key: 'bv', label: a.labels.b, align: 'right' },
        ],
        rows: shown.map((p) => ({ date: p.date, av: fmt(p.a), bv: fmt(p.b) })),
        emptyText: '这段时间还没有记录，先记一餐或称一次体重再来看',
      }),
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.combined',
      data: {
        metrics: metricsOf({
          aAvg: a.aAvg, bAvg: a.bAvg, aDelta: a.aDelta, bDelta: a.bDelta,
          aCount: a.aCount, bCount: a.bCount,
          correlationR: a.correlation.r, correlationN: a.correlation.n, days: a.days,
          seriesDays: c.series.length,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '看' + aShort + '与' + bShort,
    eyebrow: '',
    subtitle: null,
    metaLeft,
    /* #160 回炉：徽章原传恒值 `卡路里 · 分析`——同一串字出现在全量 61 页、从不区分任何东西，
     *  与 `shared/docPage.ts` 那条「恒值徽章应删」的注释自相矛盾。按注释原意**不传**：本页页型由 H1
     *  「看X与Y」说清，域由 head 标题「卡路里·趋势」说清，徽章再说一遍只是第三份同样的信息。
     *  不改成「与 H1 不同名的一句」的理由：这里没有第二种页型要区分（11 个配对同版式，差异全在 H1 里）。 */
    summary,
    content: parts.join(''),
    charts,
  });
}

/* ── 异常诊断（anomaly_report.html 对照：诊断 KPI＋发现列表＋insight；旧截断 5→全量） ── */

export function buildAnomalyDoc(v: AnomalyView): string {
  const dg = v.diagnosis;
  /* 被删的技术口径改住 HTML 注释（#160 回炉）：诊断清单、参数名与两个拒绝码原都在参数卡说明里（可见文本）。 */
  const noteBits = techNoteHtml([
    'kind=' + v.kind,
    '23 种诊断（体重 6／饮食 4／运动 5／归因复盘 8）',
    'kind 非法即 bad-input，证据不足即 missing-data，不编诊断',
  ]);
  const parts: string[] = [
    noteBits,
    renderParamForm({
      fields: [
        { name: 'kind', label: '诊断', value: v.kind },
        { name: 'start', label: '开始', value: v.start },
        { name: 'end', label: '结束', value: v.end },
      ],
      description: '一共有 23 种诊断，分体重、饮食、运动、复盘四类；证据不够就直说数据不足，不编一个结论出来。',
    }),
    renderKpiGrid([
      /* 详情原印 `v.kind`（`diet_over` 这种内部键）——内部标识符不上屏，值那一格已经是中文诊断名。 */
      { label: '诊断', value: dg.title || '这一类' },
      { label: '窗口', value: v.start + ' ~ ' + v.end, detail: '有数据 ' + dg.days + ' 天' },
      { label: '发现', value: String(v.findingCount), unit: '条' },
    ]),
    renderListRows({
      /* 三槽都是数据层文案（`analysis/anomaly/*`）：`TDEE` 这类缩写与半角标点上屏前一律归一。
       *  `action` 空串的发现（`overall` 那几行数据层给的就是 ''）不再留一个悬空的「｜建议：」——
       *  标签后面什么都没有也是种碎片，没建议就不出这段。 */
      items: dg.findings.map((f) => ({
        left: humanText(f.cause),
        main: '证据：' + humanText(f.evidence) + (f.action === '' ? '' : '｜建议：' + humanText(f.action)),
        right: f.confidence,
      })),
      emptyText: '本窗没有发现异常，各项诊断都正常',
    }),
  ];
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.anomaly',
      data: {
        metrics: metricsOf({ findingCount: v.findingCount, days: dg.days, degraded: dg.degraded ? 1 : 0 }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '异常诊断 ' + (dg.title || '这一类'),
    eyebrow: '异常诊断 · 趋势分析域',
    subtitle: dg.insight ? humanText(dg.insight) : null,
    content: parts.join(''),
    charts: false,
  });
}

/* ── 禁忌扫描（contraindication_report.html 对照：扫描概览＋命中表＋替代建议＋复制修改指令） ── */

/** T351 肉眼修复（order207）：复制区＝「复制数据／复制日志」双按钮。
 * 单格式数据文本＋日志文本直挂承载属性，共用页面双通道运行时，零内联脚本；
 * 无三格式菜单、无 text/json/csv 英文菜单项。块标题保留既有中文「复制修改指令」
 * （与按钮不同名，且单测钉死该串）。概览/命中表/替代建议不动。本函数不导出。 */
function contraCopyBlock(v: ContraView): string {
  const data: DataTextInput = {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.contraindication',
      data: {
        metrics: metricsOf({
          scannedSessions: v.scannedSessions, scannedMovements: v.scannedMovements,
          errorCount: v.errorCount, warnCount: v.warnCount, infoCount: v.infoCount,
        }),
      },
    },
    title: '【calorie · 禁忌扫描】',
    format: 'text',
  };
  return renderCopyBlock({
    title: '复制修改指令',
    dataText: buildDataText(data),
    logText: buildLogText({
      envelope: sceneEnvelope(data.envelope),
      copyLog: copyLog({
        command: 'calorie-cmd-read calorie.view.contraindication',
        source: 'workout_plans（只读）',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    }),
  }).replace('data-action-id="ilife-copy-data"', 'id="ilife-copy-data" data-action-id="ilife-copy-data"')
    .replace('data-action-id="ilife-copy-log"', 'id="ilife-copy-log" data-action-id="ilife-copy-log"');
}

/** 禁忌扫描页的**窄屏列取舍**（T351-v12）：这张页在 390 宽下有 5 列 ＋ 3 列表，五列那张挤成竖条
 *  （「部位」「级别」表头都折成两行、规则值折三行）。让掉两处**重复信息**：
 *   命中明细：让「部位」（动作格括号里已有 `第 1 周 周三（下肢）`）与「规则」（与原因句同义）；
 *   替代建议：让「原因」（上一张表已逐条给过）。
 *  与 `reviewDocsCss.ts` 窄屏让「周次」列同一手法（页内 CSS ＋ `nth-child`），只是这里要按表分开，
 *  故两张表各包一层 `.ilw-hit`／`.ilw-alt` 挂钩子。 */
const CONTRA_MOBILE_CSS = '<style>\n'
  + '@media (max-width:820px){\n'
  + '.ilw-hit .ilife-block-data-table th:nth-child(2),.ilw-hit .ilife-block-data-table td:nth-child(2),'
  + '.ilw-hit .ilife-block-data-table th:nth-child(3),.ilw-hit .ilife-block-data-table td:nth-child(3)'
  + '{display:none}\n'
  + '.ilw-alt .ilife-block-data-table th:nth-child(2),.ilw-alt .ilife-block-data-table td:nth-child(2)'
  + '{display:none}\n'
  // 让位后「级别」那一列被挤到 30px 宽，「警告」折成「警／告」。**注意序号**：`display:none` 不会重排名次，
  // 级别在源表里是第 4 列（第 2、3 列只是被藏了），故这里写 `nth-child(4)` 而不是 (2)。
  + '.ilw-hit .ilife-block-data-table th:nth-child(4),.ilw-hit .ilife-block-data-table td:nth-child(4)'
  + '{white-space:nowrap}\n'
  + '}\n</style>';

export function buildContraDoc(v: ContraView): string {
  const s = v.scan;
  /* 被删的技术口径改住 HTML 注释（#160 回炉）：参数取值与扫描范围口径原都在参数卡说明里。 */
  const noteBits = techNoteHtml([
    'part=' + v.part + '（all/腰/膝/肩）',
    '命中按动作×规则逐条列出，替代选择归宿主，已选清单不进静态页',
  ]);
  const parts: string[] = [
    noteBits,
    renderCaliberLine('想扫哪个部位就说腰、膝或肩。不说部位就全部扫一遍。'
      + '命中的动作会逐条列出，并给出可以替换的动作。'),
    renderKpiGrid([
      { label: '扫描', value: CONTRA_STATUS_ZH[v.summaryStatus] ?? v.summaryStatus,
        detail: '部位：' + (v.part === 'all' ? '全部' : v.part) },
      { label: '训练场次', value: String(v.scannedSessions), unit: '个', detail: '动作 ' + v.scannedMovements + ' 个' },
      { label: '错误', value: String(v.errorCount), unit: '个' },
      { label: '警告', value: String(v.warnCount), unit: '个' },
      { label: '提示', value: String(v.infoCount), unit: '个' },
      { label: '安全变体跳过', value: String(s.safeSkipped), unit: '个' },
    ]),
  ];
  {
    const shown = s.hits.slice(0, 100);
    // 窄屏让位（`.ilw-hit` 是给页内 CSS 挂钩子用的，见 `CONTRA_MOBILE_CSS`）：五列在 390 宽下挤成竖条，
    // 「部位」与「规则」两列让掉——部位已在动作格的括号里（`深蹲（第 1 周 周三（下肢））`）、
    // 规则名与原因句说的是同一件事。
    parts.push('<div class="ilw-hit">' + renderDataTable({
      columns: [
        { key: 'movement', label: '动作' },
        { key: 'part', label: '部位' },
        { key: 'rule', label: '规则' },
        { key: 'sev', label: '级别' },
        { key: 'reason', label: '原因' },
      ],
      rows: shown.map((h) => ({
        movement: h.movementName + (h.usedIn.length > 0 ? '（' + h.usedIn.join('、') + '）' : ''),
        part: h.part, rule: h.ruleName, sev: SEV_ZH[h.severity] ?? h.severity, reason: h.reason,
      })),
      caption: '命中明细' + (s.hits.length > 100 ? '（仅列前 100 条，共 ' + s.hits.length + ' 条）' : '（共 ' + s.hits.length + ' 条）'),
      emptyText: '无命中（计划动作均通过扫描）',
    }) + '</div>');
  }
  if (s.suggestions.length > 0) {
    // T351-v11：原来一条建议挤成 `原因：…｜替换：…` 一行串（那个 `｜` 又是拿符号顶替设计，第 ⑤ 条），
    // 右侧槽还挂着规则名（与「命中明细」里的「规则」列重复）。改成三列真表格：动作｜原因｜可以换成。
    // 窄屏让「原因」列让位（`.ilw-alt`）：上一张表已逐条给过原因，这张窄屏只剩「动作｜可以换成」最好读。
    parts.push('<div class="ilw-alt">' + renderDataTable({
      columns: [
        { key: 'movement', label: '动作' },
        { key: 'reason', label: '原因' },
        { key: 'replace', label: '可以换成' },
      ],
      rows: s.suggestions.map((g) => ({ movement: g.movement, reason: g.reason, replace: g.replace })),
      caption: '替代建议',
      emptyText: '无替代建议',
    }) + '</div>');
  }
  parts.push(contraCopyBlock(v));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    // T351-v10：标题里那个 `all` 是参数原值，读者看不懂（第 ④ 条）——扫全部部位时不缀括号。
    title: v.part === 'all' ? '禁忌扫描' : '禁忌扫描（' + v.part + '）',
    // 眉标只留技能名：原来那句 `禁忌扫描 · 趋势分析域` 把标题又抄了一遍，后半截还是内部架构词
    // （「趋势分析域」是仓库里的域划分，用户不该看到）。
    eyebrow: '健身计划',
    subtitle: v.part === 'all' ? '全部部位' : '只看' + v.part,
    content: pageChromeCss(960) + CONTRA_MOBILE_CSS + parts.join(''),
    charts: false,
  });
}


/* ── W1（#518）：下面 10 个出口已搬进姊妹件 `trendPredictDocs.ts`；此处**薄转出**，
 *  既有调用面（`render/index.ts` 与各测试的 `dist/render/trendDocs.js`）逐字不变。 ── */

export {
  buildDeficitDoc,
  buildPredictDoc,
  buildPredictTargetDoc,
  buildSimCutDoc,
  buildSimTargetDoc,
  buildCalorieForecastDoc,
  buildCalorieGoalDoc,
  buildCalorieDeficitDoc,
  buildCalorieStabilityDoc,
  buildGoalPredictDoc,
} from './trendPredictDocs.js';
