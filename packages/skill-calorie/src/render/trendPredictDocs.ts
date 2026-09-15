/** #518 · 预测／缺口族的文档装配（姊妹件：从 `render/trendDocs.ts` 原样搬出）。
 *
 * 来源与口径：本件是 **W1 搬家**的产物——把 `trendDocs.ts` 里 10 个 `build*Doc`
 * （deficit 族 1 ＋ predict 族 9）与它们的独占页内小件原样搬出，**一字未改**；
 * 判据＝搬迁前后 31 页产物逐字节相同（`t518-W1-搬家-证据.md`）。
 * 两族共用的件头小件（`DOC_TITLE`／`DOC_VERSION`／`DOC_SKILL`／`fmt`／`humanText`／
 * `techNoteHtml`）仍住 `trendDocs.ts`，本件**从它导入**；`trendDocs.ts` 再把本件的 10 个出口
 * 薄转出，既有调用面（`render/index.ts`／各测试的 `dist/render/trendDocs.js`）一个不动。
 */
import {
  renderCaliberLine,
  renderChartBlock,
  renderChips,
  renderConclusionBar,
  renderDataTable,
  renderDistributionRows,
  renderKpiGrid,
  renderListRows,
  renderParamForm,
  renderTocBlock,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { pageChromeCss } from './pageChromeCss.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, fmt, humanText, techNoteHtml } from './trendDocs.js';
import type { DeficitData } from '../analysis/deficit.js';
import type { PredictView } from './insightPlate.js';
import type { WeightTarget } from '../analysis/simulate.js';
import type {
  CalorieDeficitEta, CalorieForecast, CalorieGoalEta, CalorieStability,
  WeightSimCut, WeightSimTarget,
} from '../analysis/simulate2.js';
import type { GoalPredictView } from '../goal/goalExtraPlate.js';

/* ── 热量缺口（calorie_deficit.html 对照：4 KPI＋每日摄入 vs 消耗＋缺口明细表＋合计行） ── */

const DEFICIT_TREND_ZH: Record<string, string> = { loss: '减重方向', gain: '增重方向', flat: '持平' };

/** 页内导航锚点（#517）：**先有 `id` 才有导航项**——六个区块与六个导航项同源这一份清单，
 *  `href="#x"` 与页内 `id` 因此不可能走散（判据 J8 要求双向自洽，多一点孤儿锚点即红）。 */
const DEFICIT_SECTIONS: ReadonlyArray<{ readonly id: string; readonly text: string }> = [
  { id: 'sec-params', text: '参数' },
  { id: 'sec-overview', text: '概览' },
  { id: 'sec-chart', text: '每日摄入与消耗' },
  { id: 'sec-detail', text: '缺口明细' },
  { id: 'sec-totals', text: '合计' },
  { id: 'sec-data', text: '数据与日志' },
];

/** 区块锚点外壳：`renderTocBlock` 只认 `id`、区块产出器本身不带 `id` ⇒ 由调用方在外面套一层
 *  （同族先例 `diet/sourceStatsDocs.ts` 的 `shell()`）。**只加锚点，不写任何样式**——
 *  版面单源住 `packages/base-render/`，页面本地一行色值、一个字号都不写。
 *  W2 起缺口族与预测族**共用**这一件（原名 `deficitSection`，W2 改名以名副其实）。 */
function pageSection(id: string, html: string): string {
  return '<section id="' + id + '">' + html + '</section>';
}

/** 三态判定（与老实物 `calorie_deficit.html:174-178` 同源同规则）：`达标`／`偏低`／`超量`。
 *  #517 把同一套判定同时用于两处——明细表的状态读数走**徽章列**（`renderChips`），
 *  「日均缺口」那张卡走**状态徽章**（`renderKpiCard` 的 `status` 槽）。
 *  改的只是呈现：判定阈值仍是 `target.weeklyDeficitPerDay` 这一个数，没有第二套口径。 */
function deficitVerdict(deficit: number, targetDef: number): { status: 'ok' | 'warn' | 'danger'; text: string } {
  if (deficit >= targetDef) return { status: 'ok', text: '达标' };
  if (deficit > 0) return { status: 'warn', text: '偏低' };
  return { status: 'danger', text: '超量' };
}

/** 带符号整数（与 `summary.avgDeficit`／`weeklyDeficit` 上屏的既有写法同口径：正数前置 `+`）。
 *  注意人话行里**不写全角加号**：`＋` 是 #516 判据的并列分隔符（R3 的并列字符集里有它），
 *  它在可见文本里出现即按「拿符号简化 UI」判债。 */
function signed(n: number): string {
  return (n >= 0 ? '+' : '') + n;
}

/** 结论句（#517 新增；`t425-融合基准.md` 裁定 2：结论句紧跟标题、走 `renderConclusionBar`）。
 *  **只用页里已有的数**（日均缺口／周缺口／理论减重都是 `summary` 里的现成值），不新算任何数。 */
function deficitConclusion(d: DeficitData): string {
  const avg = signed(d.summary.avgDeficit);
  const week = signed(d.summary.weeklyDeficit);
  return d.summary.weeklyDeficit > 0
    ? '这段时间平均每天有 ' + avg + ' 卡缺口，一周合计 ' + week + ' 卡，折算下来约 ' + d.summary.predictedLossKg + ' 公斤。'
    : '这段时间平均每天缺口 ' + avg + ' 卡，一周合计 ' + week + ' 卡，还没有形成减重缺口。';
}

/** 日均消耗的**加法分解改形状**（票面改法要点 ⑥；#516 §3.1 的「堆叠条」＝`renderDistributionRows`）。
 *  卡片 `detail` 那串 `日常消耗 N ＋ 运动 M 卡` 是既有断言的原文（`analysis-deficit-385.test.mjs:192`），
 *  本票一字不改它；分解另落形状：两行「名称 ＋ 占比条 ＋ 数值」，占比＝该项 ÷ 日均消耗。 */
function deficitBurnMix(d: DeficitData): string {
  const burn = d.summary.avgBurn;
  if (burn <= 0) return '';
  const row = (label: string, value: number) => ({ label, value: value + ' 卡', pct: Math.round((value / burn) * 100) });
  return renderDistributionRows({ rows: [row('日常消耗', d.target.tdee), row('运动', d.summary.avgExerciseBurn)] });
}

/** 状态读数改走**徽章列**（票面改法要点 ⑤；#516 §3.1 的「徽章列」＝`renderChips`）。
 *  窗口内三态各多少天，一格一徽章；零天的那一态也印出来（三种取值全在，读者不用猜）。
 *  明细表那一列是**既有断言冻结的纯文本**（`renderDataTable` 的单元格只收基元，见 `blocks.ts`
 *  的 `cellText`；把徽章塞进单元格要动公共层产出器，不属本票），故状态换个位置走形状。 */
function deficitStatusChips(rows: DeficitData['series'], targetDef: number): string {
  if (rows.length === 0) return '';
  const count = (text: string) => rows.filter((s) => deficitVerdict(s.deficit, targetDef).text === text).length;
  return renderChips({ items: [
    { text: '达标 ' + count('达标') + ' 天' },
    { text: '偏低 ' + count('偏低') + ' 天' },
    { text: '超量 ' + count('超量') + ' 天' },
  ] });
}

export function buildDeficitDoc(d: DeficitData): string {
  const targetDef = d.target.weeklyDeficitPerDay;
  /* 被删的技术口径改住 HTML 注释（#160 回炉）：算式与常量原印在参数卡说明里，`TDEE`／`KCAL_PER_KG`
   *  都是读者认不得的缩写与常量名。说明改说人话，口径留这里；末一条同时是
   *  `analysis-deficit-385.test.mjs`（图题两句原文）与 `trend-homogeneity-110.test.mjs`（图题原名）的认领点。
   *  #517（场景 10 样板页）：注释只作留档，**读者看得见的口径另走 `renderCaliberLine`**——
   *  口径行与注释并存，注释不替代口径行（票面改法要点 ①）。另补一条旧页标题写法：H1 的区间符号
   *  按 #516 判据 R6（`~` 顶替「至」判债）改成「至」，旧串留注释，供 `trend-homogeneity-110.test.mjs:195`
   *  那条**不在本票授权改写范围内**的逐字断言（`'热量缺口 2026-09-05 ~ 2026-09-07'`）认领。 */
  const noteBits = techNoteHtml([
    '缺口=消耗−摄入（正=缺口） 消耗=TDEE＋当日运动 摄入=当日食物（不含水）',
    'KCAL_PER_KG=7700（理论减重=周缺口÷7700）',
    '每日摄入 vs 消耗（虚线=消耗；水平线=摄入目标 ' + d.target.intake + ' 卡）',
    '旧页标题写法：热量缺口 ' + d.meta.start + ' ~ ' + d.meta.end,
  ]);
  const avgVerdict = deficitVerdict(d.summary.avgDeficit, targetDef);
  const shown = d.series.slice(0, 100);
  /* 图表区块只在有序列时出（零序列那页的走势图没东西可画）⇒ 导航项跟着少一项，
   * 不许留「href 指向不存在的 id」的孤儿锚点（J8）。空窗在上游即 missing-data 阻断，这里只是兜住。 */
  const navItems = d.series.length > 0 ? DEFICIT_SECTIONS : DEFICIT_SECTIONS.filter((s) => s.id !== 'sec-chart');
  const totals = d.series.reduce((a, s) => ({ intake: a.intake + s.intake, burn: a.burn + s.burn, deficit: a.deficit + s.deficit }), { intake: 0, burn: 0, deficit: 0 });
  const parts: string[] = [
    noteBits,
    /* ① 页头胶囊（#516 §3.2 D01／D02）：归属词与页型不拿 `·` 串进题名，改走徽章件；题名只留人话名
     *  （H1 的正文在 `assembleDocPage` 的 `title`，眉标只留一个归属词）。 */
    renderChips({ items: [{ text: '卡路里' }, { text: '热量缺口' }, { text: '趋势分析' }] }),
    /* ② 结论条（J2／J9 三条恒出之一；`t425` 裁定 2：结论句紧跟标题）：只用页里已有的数。 */
    renderConclusionBar(deficitConclusion(d)),
    /* ③ 页内导航（J8／J9）：六个区块与六个导航项同源 `DEFICIT_SECTIONS`。 */
    renderTocBlock({ items: navItems.map((s) => ({ id: s.id, text: s.text })) }),
    pageSection('sec-params', renderParamForm({
      fields: [{ name: 'start', label: '开始', value: d.meta.start }, { name: 'end', label: '结束', value: d.meta.end }],
      description: '缺口就是当天消耗减掉当天吃的：正数代表有缺口。消耗算日常消耗加当天运动，摄入只算吃进去的，喝水不算。',
    })),
    pageSection('sec-overview', renderKpiGrid([
      { label: '日均摄入', value: String(d.summary.avgIntake), unit: '卡', detail: '目标 ' + d.target.intake + ' 卡/天' },
      { label: '日均消耗', value: String(d.summary.avgBurn), unit: '卡', detail: '日常消耗 ' + d.target.tdee + ' ＋ 运动 ' + d.summary.avgExerciseBurn + ' 卡' },
      /* 「日均缺口」这张卡挂状态徽章（票面改法要点 ④）：判定词不再只当文字印，改走徽章的三个闭集档。 */
      { label: '日均缺口', value: signed(d.summary.avgDeficit), unit: '卡', detail: DEFICIT_TREND_ZH[d.summary.trend] ?? d.summary.trend, status: avgVerdict.status, statusText: avgVerdict.text },
      { label: '理论减重', value: String(d.summary.predictedLossKg), unit: 'kg', detail: '周缺口 ' + d.summary.weeklyDeficit + ' 卡' },
    ]) + deficitBurnMix(d)),
  ];
  let charts = false;
  if (d.series.length > 0) {
    const intake = d.series.map((s) => ({ label: s.date.slice(5), value: s.intake }));
    const burn = d.series.map((s) => ({ label: s.date.slice(5), value: s.burn }));
    parts.push(pageSection('sec-chart', renderChartBlock({
      kind: 'line',
      /* #160 回炉（用户点名反例①的同形）：旧图题把**画法**写进了标题（「虚线=消耗；水平线=摄入目标 1800 卡」）
       *  ——图题只说画的是什么，读法归线与图例。故：图题只留「每日摄入与消耗」；消耗那条线在**图例名**里带上
       *  （虚线）〔公共层图例不给虚线序列画虚线样图，`charts.ts:946-973` 只印名字〕，故本页必须开 `legend`
       *  ——否则图例那行根本不渲染，系列名（含「（虚线）」）就没人看得见；横线的读法落在 markLine 自己的
       *  标签上（就写在线旁边）。旧图题原文进 HTML 注释。 */
      title: '每日摄入与消耗',
      input: {
        items: intake, options: {
          legend: true,
          series: [
            { name: '摄入', items: intake },
            { name: '消耗（虚线）', items: burn, dashed: true },
          ],
          /* #385：补刻度值＋数字格式（老侧 `:150-157` 的 format／yMin／yMax；同包先例 `multiTrendPage.ts:261`）；量程不写死。 */
          yTicks: 3, labels: 'select', format: (v: number) => Math.round(v).toLocaleString(), markLine: { value: d.target.intake, label: '摄入目标 ' + d.target.intake + ' 卡' },
        },
      },
    })));
    charts = true;
  }
  /* 明细表（票面改法要点 ⑤）：`目标` 列 7 行全是同一个每日缺口目标 ⇒ 零信息量的一列撤掉，
   *  这份事实**上浮到口径行**（见下面 `DEFICIT_CALIBER` 那两条：读者看得见，且只出现一次）。
   *  留下的五列每列都在变：日期／摄入／消耗／缺口／状态。
   *  `状态` 列仍是**纯文本**：`renderDataTable` 的单元格只收基元（公共层 `cellText`），把徽章放进单元格
   *  要动公共层产出器——本票（裁定 3）不碰 `packages/base-render/**`；状态的**形状**落在表下那排徽章
   *  （`deficitStatusChips`）与「日均缺口」卡的状态徽章上。 */
  parts.push(pageSection('sec-detail', renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'intake', label: '摄入', align: 'right' },
      { key: 'burn', label: '消耗', align: 'right' },
      { key: 'deficit', label: '缺口', align: 'right' },
      { key: 'status', label: '状态' },
    ],
    rows: shown.map((s) => ({
      date: s.date + ' ' + s.weekday,
      intake: s.intake, burn: s.burn,
      deficit: signed(s.deficit),
      status: s.deficit >= targetDef ? '✓ 达标' : s.deficit > 0 ? '⚠ 偏低' : '✗ 超量',
    })),
    caption: '缺口明细' + (d.series.length > 100 ? '（仅列前 100 条，共 ' + d.series.length + ' 天）' : '（共 ' + d.series.length + ' 天）') +
      '，其中 ' + d.meta.weekdayCount + ' 天是工作日，' + d.meta.weekendCount + ' 天是周末',
    emptyText: '这段时间还没有记录，先记一餐或记一次运动再来看',
  }) + deficitStatusChips(shown, targetDef)));
  /* 三行的右槽原是两个碎片随手拼的（`5 天`／`TDEE×天＋运动`／`周缺口 300 卡`）——连起来读不成句，
   *  中间那个还带常量名式缩写。改：右槽一律写成能独立读的整句。 */
  /* 三行的右槽原是两个碎片随手拼的（`5 天`／`TDEE×天＋运动`／`周缺口 300 卡`）——连起来读不成句，
   *  中间那个还带常量名式缩写。改：右槽一律写成能独立读的整句（#160）。
   *  #517 再收一次：右槽是 `auto` 列、明细值占的是 `minmax(0,1fr)` 那列，**整句太长会把值挤到
   *  `overflow:hidden` 的截断线里**（判据 J3 实测：390 档 `合计消耗`／`合计缺口` 两行的值 cw=34／48px，
   *  值被裁得只露半个字）⇒ 右槽只留短注，「消耗＝日常消耗加当天运动」这类口径上移到口径行，
   *  「一周合计」这类事实住结论条与 KPI 卡（同一事实一页一处）。 */
  parts.push(pageSection('sec-totals', renderListRows({ items: [
    { left: '合计摄入', main: totals.intake + ' 卡', right: '共 ' + d.meta.days + ' 天有记录' },
    { left: '合计消耗', main: totals.burn + ' 卡', right: '逐日累加' },
    { left: '合计缺口', main: signed(totals.deficit) + ' 卡' },
  ] })));
  parts.push(pageSection('sec-data', dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.deficit',
      data: {
        metrics: metricsOf({
          avgIntake: d.summary.avgIntake, avgBurn: d.summary.avgBurn, avgExerciseBurn: d.summary.avgExerciseBurn,
          avgDeficit: d.summary.avgDeficit, weeklyDeficit: d.summary.weeklyDeficit, predictedLossKg: d.summary.predictedLossKg,
          days: d.meta.days, weekdayCount: d.meta.weekdayCount, weekendCount: d.meta.weekendCount,
          targetIntake: d.target.intake, targetTdee: d.target.tdee,
        }),
      },
    },
  })));
  /* ⑤ 口径说明行（J2／J9 三条恒出之一；票面改法要点 ①）：原来只住在 HTML 注释里的三条口径改上屏。
   *  段间用**全角竖线**——`renderCaliberLine` 把它切成逐段 `<span>`、改由版式出细竖线，产物文本里
   *  不再有该字符（#516 判据 R4）。人话里不写全角加号（并列分隔符集里有它），写「加」。
   *  第二条里的「达标线」是**`目标` 列上浮的落点**：每日缺口目标这份事实在页上只此一处（表里那列已撤）。 */
  parts.push(renderCaliberLine('缺口＝当天消耗减当天摄入（正数就是有缺口）｜消耗＝日常消耗加当天运动｜摄入只算吃进去的，喝水不算'));
  parts.push(renderCaliberLine('理论减重按每 7700 卡折算约 1 公斤估算｜达标线＝每天 ' + signed(targetDef) + ' 卡缺口｜图里实线是摄入，虚线是消耗，横线是摄入目标 ' + d.target.intake + ' 卡'));
  /* ⑥ 来源脚注（J9 第三条恒出；同族写法见 `diet/sourceStatsDocs.ts` 末行）：走普通小字行，不走深底块。 */
  parts.push(renderCaliberLine('📊 数据来源：本机饮食记录与运动记录，窗口 ' + d.meta.start + ' 至 ' + d.meta.end));
  return assembleDocPage({
    /* head 的 `<title>`（#517 判据 J1：题名两段不拿 `·` 串；同族先例 `goalProgressDocs.ts` 的「卡路里 目标进度」）。 */
    docTitle: '卡路里 热量缺口',
    /* H1：区间写「至」（#516 判据 R6：`~` 顶替「至」判债）。旧写法留在 `noteBits` 注释里，
     *  供 `trend-homogeneity-110.test.mjs:195` 那条不在本票授权范围内的逐字断言认领。 */
    title: '热量缺口 ' + d.meta.start + ' 至 ' + d.meta.end,
    /* 眉标只留一个归属词（#516 §3.2 D02）：`热量缺口 · 趋势分析域` 那个 `·` 串拆开——页型进上面的页头胶囊，眉标留域。 */
    eyebrow: '趋势分析',
    subtitle: null,
    /* 宽屏余量的裁定（本票「宽屏余量」一节）：选 **(a) 加宽内容列**，用包内**既有**页面壳件
     *  `pageChromeCss(<宽>)`——页面级生效、只本页 opt-in（该件自带触屏三件与 ≤820 的页壳／栅格收紧，
     *  见 `./pageChromeCss.ts` 件头）。1440 档从两侧各空 240px 收成各 160px（主列 960→1120）。
     *  不新增公共层件（编排者裁定 3）、不新建形状（基准件 §4.3 具名清单仍为空）。 */
    content: pageChromeCss(1120) + parts.join(''),
    charts,
  });
}

/* ── W2（#518）· 预测族页框（照 #517 缺口样板页的骨架逐行落位） ───────────────────── */

/** 预测族页内导航锚点（W2／W3 共用）：**先有 `id` 才有导航项**——区块与导航项同源这一份轻清单，
 *  `href="#x"` 与页内 `id` 因此不可能走散（判据 J8 要求双向自洽，多一个孤儿锚点即红）。
 *  `sec-track` 只有真出轨迹表的页才进导航（零轨迹的页不许留一个指向不存在 id 的孤儿锚点）。 */
const PREDICT_SECTIONS: ReadonlyArray<{ readonly id: string; readonly text: string }> = [
  { id: 'sec-params', text: '参数' },
  { id: 'sec-overview', text: '概览' },
  { id: 'sec-track', text: '模拟轨迹' },
  { id: 'sec-data', text: '数据与日志' },
];

/** 导航项（按当页实际出的区块裁掉没有的那几项）＝`renderTocBlock`（J2／J8／J9 三条恒出之一）。 */
function predictNav(hasTrack: boolean): string {
  const items = PREDICT_SECTIONS.filter((s) => hasTrack || s.id !== 'sec-track')
    .map((s) => ({ id: s.id, text: s.text }));
  return renderTocBlock({ items });
}

/** 页头胶囊（#516 §3.2 D01／D02）：归属词与页型不拿 `·` 串进题名，改走徽章件（`renderChips`）。
 *  页型逐页不同（体重预测／模拟减重／摄入预测），眉标只留一个域词（见各页 `assembleDocPage`）。 */
function predictChips(pageType: string): string {
  return renderChips({ items: [{ text: '卡路里' }, { text: pageType }, { text: '趋势分析' }] });
}

/** 来源脚注（J9 第三条恒出；同族写法见缺口页与 `diet/sourceStatsDocs.ts`）：走普通小字行，不走深底块。 */
function sourceFootnote(what: string, start: string, end: string): string {
  return renderCaliberLine('📊 数据来源：本机' + what + '，窗口 ' + start + ' 至 ' + end);
}

/** 轨迹覆盖天数（#455：表头写**实际覆盖天数**，不拿请求天数顶替——两者在非整周 horizon 上本不相等，
 *  改前正是拿 `horizonDays` 当覆盖天数，才出现「说 90 天、表里只到第 84 天」这种自相矛盾）。
 *  口径＝末点日期 − 首发点日期（与 `simulate2` 采样的锚点 `points[0].date` 同源）。 */
function spanDaysOf(points: ReadonlyArray<{ date: string }>): number {
  if (points.length < 2) return 0;
  const first = points[0] as { date: string };
  const last = points[points.length - 1] as { date: string };
  return Math.round((Date.parse(last.date) - Date.parse(first.date)) / 86400000);
}

/** 轨迹表的公共装配（有表的页共用）：列与表题同源，表题按**实际覆盖天数**写实（#455）。 */
function trackTable(points: ReadonlyArray<{ date: string; value: number }>, what: string, unit: string): string {
  const span = spanDaysOf(points);
  const shown = points.slice(0, 14);
  const truncated = points.length > shown.length ? '（仅列前 14 点，共 ' + points.length + ' 点）' : '';
  return renderDataTable({
    columns: [{ key: 'date', label: '日期' }, { key: 'weight', label: what, align: 'right' }],
    rows: shown.map((p) => ({ date: p.date, weight: p.value })),
    caption: '模拟轨迹（共 ' + span + ' 天，每周一点' + truncated + '）',
    emptyText: '这一段还没有体重记录，先称一次体重再来看',
  });
}
/* ── 体重预测（predict_report 对照：点预测 KPI＋insight；曲线归组合分析，见 §3 R4） ── */

export function buildPredictDoc(v: PredictView): string {
  const parts: string[] = [
    predictChips('体重预测'),
    /* 结论条（J2／J9 三条恒出之一；`t425` 裁定 2：结论句紧跟标题）：只用页里已有的数——
     * `forecastValue` 是**轨迹末点**的值，补了第 horizon 天末点之后它与「N 天后」真正同轴（#455）。 */
    renderConclusionBar('按最近的趋势，' + v.horizonDays + ' 天后体重约 ' + v.forecastValue + ' kg。'),
    /* 页内导航（J8／J9）：本页无轨迹表（`PredictView` 不带点列），导航项同步不出「模拟轨迹」那一项。 */
    predictNav(false),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start },
        { name: 'end', label: '结束', value: v.end },
        { name: 'horizonDays', label: '预测天数', value: String(v.horizonDays) },
      ],
      /* 说明里原印内部参数名与拒绝码（`horizonDays`／`missing-data`）——读者认不得；参数名仍在
       * 参数表单的 `name` 属性里。W2 再把那句 `；` 改写成两句（#516 §3.2 D03：参数说明里的 `；`
       * 是「拿符号简化 UI」的债，该处要做的是换成两句人话，不是删掉标点）。
       * 这 8 页（predict 族）**不另加 HTML 注释**：`analysis-predict-383.test.mjs` 的残留判据只认
       * 五个未填充的槽位标记，口径一律走可见的口径行（下面那两条），不靠注释留档。 */
      description: '按最近的体重趋势往后推，能推 7 到 180 天。体重记录不到 14 天就只说数据不够，不编预测。',
    })),
    pageSection('sec-overview', renderKpiGrid([
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '预测', value: String(v.forecastValue), unit: 'kg', detail: v.horizonDays + ' 天后' },
      { label: '速率', value: String(v.ratePerWeek), unit: 'kg/周' },
      /* 区间写「至」（#516 §3.2 D06：值位不许拿 `~` 顶替「至」）。 */
      { label: '预计区间', value: fmt(v.forecastLo) + ' 至 ' + fmt(v.forecastHi), unit: 'kg', detail: '95% 置信带' },
    ])),
  ];
  parts.push(pageSection('sec-data', dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({
          current: v.current, ratePerWeek: v.ratePerWeek, forecastValue: v.forecastValue,
          forecastLo: v.forecastLo, forecastHi: v.forecastHi, horizonDays: v.horizonDays,
        }),
      },
    },
  })));
  /* 口径行（J2／J9 三条恒出之一；`renderCaliberLine` 走 `｜` 分槽，产物可见文本里不留该字符）。 */
  parts.push(renderCaliberLine('体重＝当前值加日速率乘天数｜预计区间按体重残差向外放宽，取 95% 置信带｜体重记录不到 14 天不出预测'));
  parts.push(sourceFootnote('体重记录', v.start, v.end));
  return assembleDocPage({
    /* head 的 `<title>` 也去 `·`（J1 题名两段不拿 `·` 串；同族先例 #517 缺口页的「卡路里 热量缺口」）。 */
    docTitle: '卡路里 体重预测',
    title: '体重预测（' + v.horizonDays + ' 天）',
    /* 眉标只留一个归属词（#516 §3.2 D02）：原来那串 `体重预测 · 趋势分析域` 的 `·` 拆开——
     * 页型进了页头胶囊，眉标留域；`域` 是仓库里的架构词，不上屏。 */
    eyebrow: '趋势分析',
    subtitle: null,
    content: pageChromeCss(1120) + parts.join(''),
    charts: false,
  });
}

/* ── #383 · 预测体重(自定义目标)（weightTarget：预计达成日＋可行性；只改本图会碰到的预测段） ── */

export function buildPredictTargetDoc(v: WeightTarget): string {
  const parts: string[] = [
    predictChips('体重预测'),
    /* 结论句只用页里已有的数（`eta`／`target`／`feasible`），不新算任何数。 */
    renderConclusionBar('按最近的趋势，预计 ' + String(v.eta) + ' 前后达到 ' + String(v.target) + ' kg。'
      + (v.feasible ? '' : '这个速度超出健康范围，建议调整目标或策略。')),
    predictNav(false),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
        { name: 'target', label: '目标体重', value: String(v.target ?? '') },
      ],
      description: '按当前的体重趋势算出哪天能达到目标体重。体重记录不到 14 天就只说数据不够，不编一个日期出来。',
    })),
    pageSection('sec-overview', renderKpiGrid([
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '目标', value: String(v.target), unit: 'kg' },
      { label: '预计达成', value: String(v.eta), detail: '剩余 ' + String(v.daysLeft) + ' 天' },
      /* 可行性改走**状态徽章**（票面改法要点 ④）：判定词不再只当文字印，走徽章的闭集档。 */
      { label: '可行性', value: v.feasible ? '可行' : '超范围', status: v.feasible ? 'ok' : 'warn', statusText: v.feasible ? '可行' : '超范围',
        detail: '速率 ' + String(v.ratePerWeek) + ' kg/周' },
    ])),
  ];
  parts.push(pageSection('sec-data', dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({
          target: v.target, days_left: v.daysLeft, feasible: v.feasible ? 1 : 0,
          current: v.current, ratePerWeek: v.ratePerWeek,
        }),
      },
    },
  })));
  parts.push(renderCaliberLine('预计达成日＝按当前速率线性外推的那一天｜健康范围＝每周掉 0.5 到 1.0 公斤｜体重记录不到 14 天不出日期'));
  parts.push(sourceFootnote('体重记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 体重预测',
    title: '预测体重(自定义目标)',
    eyebrow: '趋势分析',
    subtitle: null,
    content: pageChromeCss(1120) + parts.join(''),
    charts: false,
  });
}

/* ── #383 · 模拟减重(每天多减 cutKcal 卡)（每周掉重＋可行性；只改本图会碰到的预测段） ── */

export function buildSimCutDoc(v: WeightSimCut): string {
  const pts = v.forecast ? v.forecast.points : [];
  const parts: string[] = [
    predictChips('模拟减重'),
    /* 结论句只用页里已有的数（`cutKcal`／`weeklyLoss`／`feasible`）。 */
    renderConclusionBar('每天多减 ' + String(v.cutKcal) + ' 卡，一周大约掉 ' + String(v.weeklyLoss) + ' kg。'
      + (v.feasible ? '这个速度在健康范围内。' : '这个速度超出健康范围，建议减量。')),
    predictNav(pts.length > 0),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
        { name: 'cut_kcal', label: '每天多减', value: String(v.cutKcal ?? '') },
      ],
      /* 原说明里那句 `；` 与「90 天的轨迹在下面」拆开：轨迹那一句由区块自己（表题）承担，
       * 这里只说这一页在做什么（#516 §3.2 D03；`KCAL_PER_KG` 这类常量名不上屏）。 */
      description: '看看每天再多减一些卡路里，体重会怎么掉。每 7700 卡大约对应 1 公斤，按这个折算每周掉多少。能不能做到，看每周的掉重落在 0.5 到 1.0 公斤这个安全区间里没有。',
    })),
    pageSection('sec-overview', renderKpiGrid([
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '每天多减', value: String(v.cutKcal), unit: '卡' },
      { label: '每周掉重', value: String(v.weeklyLoss), unit: 'kg/周', detail: '安全区间 0.5 到 1.0 kg/周' },
      { label: '可行性', value: v.feasible ? '可行' : '超范围', status: v.feasible ? 'ok' : 'warn', statusText: v.feasible ? '可行' : '超范围' },
    ])),
  ];
  if (pts.length > 0) parts.push(pageSection('sec-track', trackTable(pts, '模拟体重', 'kg')));
  parts.push(pageSection('sec-data', dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({
          cut_kcal: v.cutKcal, weekly_loss: v.weeklyLoss, feasible: v.feasible ? 1 : 0,
          current: v.current,
        }),
      },
    },
  })));
  parts.push(renderCaliberLine('每 7700 卡大约折算 1 公斤｜轨迹从窗口最后一天起算，每周一点，非整周时补最后一天那一行｜安全区间＝每周掉 0.5 到 1.0 公斤'));
  parts.push(sourceFootnote('体重记录与运动记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 模拟减重',
    title: '模拟减重(每天-' + String(v.cutKcal) + '卡)',
    eyebrow: '趋势分析',
    subtitle: null,
    content: pageChromeCss(1120) + parts.join(''),
    charts: false,
  });
}

/* ── #383 · 模拟减重(自定天数减 Xkg)（所需每日缺口＋可行性；只改本图会碰到的预测段） ── */

export function buildSimTargetDoc(v: WeightSimTarget): string {
  const pts = v.forecast ? v.forecast.points : [];
  const parts: string[] = [
    predictChips('模拟减重'),
    /* 结论句只用页里已有的数（`daysTarget`／`targetLoss`／`neededDeficit`／`feasible`）。 */
    renderConclusionBar('要在 ' + String(v.daysTarget) + ' 天里减掉 ' + String(v.targetLoss) + ' kg，每天大约要留出 ' + String(v.neededDeficit) + ' 卡缺口。'
      + (v.feasible ? '这个速度在健康范围内。' : '这个速度超出健康范围，建议拉长时间或降低目标。')),
    predictNav(pts.length > 0),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
        { name: 'target_loss', label: '想减', value: String(v.targetLoss ?? '') },
        { name: 'days_target', label: '天数', value: String(v.daysTarget ?? '') },
      ],
      /* 原说明句尾夹常量名、还拿 `；` 串两条规则（#516 §3.2 D03；`Xkg` 那种占位写法不上屏）。 */
      description: '模拟在自定的天数里减掉想减的公斤数，需要每天留出多少缺口。每 7700 卡大约对应 1 公斤，按这个反推。能不能做到，看每周的掉重落在 0.5 到 1.0 公斤这个安全区间里没有。',
    })),
    pageSection('sec-overview', renderKpiGrid([
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '所需缺口', value: String(v.neededDeficit), unit: '卡/天', detail: '要在 ' + String(v.daysTarget) + ' 天里减掉 ' + String(v.targetLoss) + ' kg' },
      { label: '每周掉重', value: String(v.weeklyRate), unit: 'kg/周', detail: '安全区间 0.5 到 1.0 kg/周' },
      { label: '可行性', value: v.feasible ? '可行' : '超范围', status: v.feasible ? 'ok' : 'warn', statusText: v.feasible ? '可行' : '超范围' },
    ])),
  ];
  if (pts.length > 0) parts.push(pageSection('sec-track', trackTable(pts, '模拟体重', 'kg')));
  parts.push(pageSection('sec-data', dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({
          target_loss: v.targetLoss, days_target: v.daysTarget,
          needed_deficit: v.neededDeficit, feasible: v.feasible ? 1 : 0, current: v.current,
        }),
      },
    },
  })));
  parts.push(renderCaliberLine('所需缺口＝要减的公斤数乘 7700 卡再除以天数｜轨迹从窗口最后一天起算，每周一点，末点是第 ' + String(v.daysTarget) + ' 天｜安全区间＝每周掉 0.5 到 1.0 公斤'));
  parts.push(sourceFootnote('体重记录与运动记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 模拟减重',
    title: '模拟减重(' + String(v.daysTarget) + '天减' + String(v.targetLoss) + 'kg)',
    eyebrow: '趋势分析',
    subtitle: null,
    content: pageChromeCss(1120) + parts.join(''),
    charts: false,
  });
}

/* ── #383 · 摄入预测(按当前速率)（日均摄入外推＋目标对照；只改本图会碰到的预测段） ── */

export function buildCalorieForecastDoc(v: CalorieForecast): string {
  const pts = v.forecast ? v.forecast.points : [];
  const span = spanDaysOf(pts);
  const lastV = pts.length > 0 ? (pts[pts.length - 1] as { value: number }).value : null;
  const parts: string[] = [
    predictChips('摄入预测'),
    /* 结论句只用页里已有的数（末点预测值／目标／窗口天数）。 */
    renderConclusionBar(lastV === null
      ? '这一段的摄入还不够算预测。'
      : '按当前速率，' + span + ' 天后每天大约吃 ' + lastV + ' 卡。'
        + (v.goal === null || v.goal === undefined ? '' : '目标 ' + v.goal + ' 卡。')),
    predictNav(pts.length > 0),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
        { name: 'horizonDays', label: '预测天数', value: String(v.forecast?.horizonDays ?? '') },
      ],
      /* 原说明那句 `；` 改写成两句（#516 §3.2 D03：该处要换形状，不是删标点）。 */
      description: '按最近的摄入趋势往后推每天会吃多少。摄入记录不到 14 天就只说数据不够，不编预测。',
    })),
    pageSection('sec-overview', renderKpiGrid([
      { label: '当前摄入', value: String(v.current), unit: '卡', detail: '日均' },
      { label: '目标', value: String(v.goal ?? '—'), unit: '卡' },
      { label: '日变化', value: String(v.dailyRate ?? '—'), unit: '卡/天' },
      { label: '摄入预测', value: String(v.forecast?.points[v.forecast.points.length - 1]?.value ?? '—'), unit: '卡', detail: span > 0 ? span + ' 天后' : '按当前趋势' },
    ])),
  ];
  if (pts.length > 0) {
    const shown = pts.slice(0, 14);
    const cut = pts.length > shown.length ? '（仅列前 14 点，共 ' + pts.length + ' 点）' : '';
    parts.push(pageSection('sec-track', renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'intake', label: '预测摄入', align: 'right' },
        { key: 'band', label: '预计区间', align: 'right' },
      ],
      rows: shown.map((p) => ({ date: p.date, intake: p.value, band: fmt(p.lo) + ' 至 ' + fmt(p.hi) })),
      caption: '摄入预测轨迹（共 ' + span + ' 天，每周一点' + cut + '）',
      emptyText: '这一段还没有饮食记录，先记一餐再来看',
    })));
  }
  parts.push(pageSection('sec-data', dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({
          calories: v.current, goal: v.goal ?? undefined,
          horizonDays: v.forecast?.horizonDays,
        }),
      },
    },
  })));
  parts.push(renderCaliberLine('摄入＝按最近的趋势线往外推｜预计区间按摄入残差向外放宽，取 95% 置信带｜摄入记录不到 14 天不出预测'));
  parts.push(sourceFootnote('饮食记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 摄入预测',
    title: '摄入预测(按当前速率 ' + String(v.forecast?.horizonDays ?? '') + ' 天)',
    eyebrow: '趋势分析',
    subtitle: null,
    content: pageChromeCss(1120) + parts.join(''),
    charts: false,
  });
}

/* ── #383 · 摄入预测(营养目标达成预测)（均值／目标／缺口／是否在轨；只改预测段） ── */

export function buildCalorieGoalDoc(v: CalorieGoalEta): string {
  const parts: string[] = [
    predictChips('摄入预测'),
    renderConclusionBar('这段的日均摄入 ' + String(v.avg) + ' 卡，比目标 ' + String(v.goal) + ' 卡' + (v.onTarget ? '守在 ±10% 以内。' : '差了 ' + String(Math.abs(Number(v.gap))) + ' 卡。')),
    predictNav(false),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
      ],
      description: '看每天的摄入能不能守在营养目标上。平均下来差在 10% 以内就算守住了，摄入记录不到 14 天就只说数据不够。',
    })),
    pageSection('sec-overview', renderKpiGrid([
      { label: '均值', value: String(v.avg), unit: '卡' },
      { label: '目标', value: String(v.goal), unit: '卡' },
      { label: '缺口', value: String(v.gap), unit: '卡' },
      /* 在轨与否改走**状态徽章**（#517 样板页的同一手法），值位保留判定词供既有断言认领。 */
      { label: '是否在轨', value: v.onTarget ? '在轨' : '偏离', status: v.onTarget ? 'ok' : 'warn', statusText: v.onTarget ? '在轨' : '偏离', detail: v.onTarget ? '已在目标 ±10% 内' : '超出目标 ±10%' },
    ])),
  ];
  parts.push(pageSection('sec-data', dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({
          avg: v.avg, goal: v.goal, gap: v.gap, on_target: v.onTarget ? 1 : 0,
        }),
      },
    },
  })));
  parts.push(renderCaliberLine('目标＝每天的热量目标｜达标线＝日均偏离不超过目标的 10%｜摄入记录不到 14 天不出判定'));
  parts.push(sourceFootnote('饮食记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 摄入预测',
    title: '摄入预测(营养目标达成预测)',
    eyebrow: '趋势分析',
    subtitle: null,
    content: pageChromeCss(1120) + parts.join(''),
    charts: false,
  });
}

/* ── #383 · 摄入预测(卡路里缺口预测)（平均缺口＋每周掉重；只改预测段） ── */

export function buildCalorieDeficitDoc(v: CalorieDeficitEta): string {
  const parts: string[] = [
    predictChips('摄入预测'),
    renderConclusionBar('这段时间平均每天有 ' + (Number(v.avgDeficit) >= 0 ? '+' : '') + String(v.avgDeficit) + ' 卡缺口，折算下来一周约 ' + String(v.weeklyLoss) + ' kg。'),
    predictNav(false),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
      ],
      description: '按最近的趋势预测卡路里缺口。缺口就是当天消耗减掉当天吃的，消耗算日常消耗加运动消耗。每 7700 卡大约对应 1 公斤。',
    })),
    pageSection('sec-overview', renderKpiGrid([
      { label: '平均缺口', value: String(v.avgDeficit), unit: '卡/天', detail: '正数是缺口' },
      { label: '每周掉重', value: String(v.weeklyLoss), unit: 'kg/周', detail: '健康区间 0.3 到 1.2 kg/周' },
    ])),
  ];
  parts.push(pageSection('sec-data', dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({ avg_deficit: v.avgDeficit, weekly_loss: v.weeklyLoss }),
      },
    },
  })));
  parts.push(renderCaliberLine('缺口＝日常消耗加运动消耗减当天摄入｜每 7700 卡大约折算 1 公斤｜健康区间＝每周掉 0.3 到 1.2 公斤'));
  parts.push(sourceFootnote('饮食记录与运动记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 摄入预测',
    title: '摄入预测(卡路里缺口预测)',
    eyebrow: '趋势分析',
    subtitle: null,
    content: pageChromeCss(1120) + parts.join(''),
    charts: false,
  });
}

/* ── #383 · 摄入预测(摄入稳定性预测)（均值／波动＋是否稳定；只改预测段） ── */

export function buildCalorieStabilityDoc(v: CalorieStability): string {
  const parts: string[] = [
    predictChips('摄入预测'),
    renderConclusionBar('日均摄入 ' + String(v.avg) + ' 卡，每天上下波动 ' + String(v.sigma) + ' 卡，' + (v.stable ? '算稳。' : '波动偏大。')),
    predictNav(false),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
      ],
      description: '看每天的摄入稳不稳定。每天上下波动不超过 300 卡就算稳，摄入记录不到 14 天就只说数据不够。',
    })),
    pageSection('sec-overview', renderKpiGrid([
      { label: '均值', value: String(v.avg), unit: '卡' },
      /* σ 是统计符号，读者认不得：这一格就说「上下波动的幅度」（口径在同页的口径行里）。 */
      { label: '波动', value: String(v.sigma), unit: '卡', detail: '上下波动的幅度' },
      { label: '是否稳定', value: v.stable ? '稳定' : '波动大', status: v.stable ? 'ok' : 'warn', statusText: v.stable ? '稳定' : '波动大', detail: v.stable ? '每天波动不超过 300 卡' : '每天波动超过 300 卡' },
    ])),
  ];
  parts.push(pageSection('sec-data', dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({ avg: v.avg, sigma: v.sigma, stable: v.stable ? 1 : 0 }),
      },
    },
  })));
  parts.push(renderCaliberLine('波动＝每天摄入偏离日均的幅度（标准差）｜判据＝上下波动不超过 300 卡算稳｜摄入记录不到 14 天不出判定'));
  parts.push(sourceFootnote('饮食记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 摄入预测',
    title: '摄入预测(摄入稳定性预测)',
    eyebrow: '趋势分析',
    subtitle: null,
    content: pageChromeCss(1120) + parts.join(''),
    charts: false,
  });
}

/* ── 目标预测达成（目标达成 ETA：KPI＋可行性；曲线归组合分析，见 §3 R4） ── */

export function buildGoalPredictDoc(v: GoalPredictView): string {
  /* 被删的技术口径改住 HTML 注释（#160 回炉）：缺失拒绝码与内部票号（`#103 G2`）原在参数卡说明里。 */
  const noteBits = techNoteHtml([
    '无体重目标即 missing-data；默认 14 天窗（7 天窗结构性不可达，#103 G2）',
  ]);
  const parts: string[] = [
    noteBits,
    renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start },
        { name: 'end', label: '结束', value: v.end },
      ],
      description: '要先定过体重目标，才能算出哪天能达到；没定目标就只说缺目标，不编一个日期出来。默认看最近 14 天。',
    }),
    renderKpiGrid([
      { label: '目标', value: String(v.targetKg), unit: 'kg', detail: v.start + ' ~ ' + v.end },
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '预计达成', value: v.eta, detail: '剩余 ' + v.daysLeft + ' 天' },
      { label: '速率', value: String(v.ratePerWeek), unit: 'kg/周', detail: v.feasible ? '健康' : '超范围' },
    ]),
  ];
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.goal-predict',
      data: {
        metrics: metricsOf({
          targetKg: v.targetKg, current: v.current, daysLeft: v.daysLeft,
          ratePerWeek: v.ratePerWeek, feasible: v.feasible ? 1 : 0,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '目标预测达成',
    eyebrow: '目标预测达成 · 趋势分析域',
    subtitle: null,
    content: parts.join(''),
    charts: false,
  });
}
