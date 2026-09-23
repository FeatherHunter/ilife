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
  renderDisclosure,
  renderDistributionRows,
  renderKpiGrid,
  renderListRows,
  renderParamForm,
  renderTocBlock,
} from 'base-paint/blocks';
import { escapeHtml, renderStatusBadge } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { pageChromeCss } from './pageChromeCss.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, fmt, humanText, techNoteHtml } from './trendDocs.js';
import type { DeficitData } from '../analysis/deficit.js';
import type { PredictView } from './insightPlate.js';
import type { WeightTarget } from '../analysis/simulate.js';
import { HEALTHY_RATE } from '../analysis/simulate.js';
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
 *  W2 起缺口族与预测族**共用**这一件（原名 `deficitSection`，W2 改名以名副其实）。
 *  #573 R-60：可选第三参 `heading`——给了就在区块首产可见 `<h2>`（文本须与导航项逐字一致，
 *  见 `secTitle`）；不给即老样子（缺口族／18–20 不传，结构逐字节不变）。 */
function pageSection(id: string, html: string, heading?: string): string {
  return '<section id="' + id + '">'
    + (heading === undefined ? '' : '<h2 class="tpd-sec-title">' + heading + '</h2>') + html + '</section>';
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
    ? '这段时间平均每天有 ' + avg + ' 卡缺口，一周合计 ' + week + ' 卡，折算下来约 ' + d.summary.predictedLossKg + ' kg。'
    : '这段时间平均每天缺口 ' + avg + ' 卡，一周合计 ' + week + ' 卡，还没有形成减重缺口。';
}

/** 日均消耗的加法分解改形状（要点 ⑥；`renderDistributionRows`）。KPI `detail` 原文是 385 冻结
 *  （一字不改）；#567 D5 起值槽只印占比（绝对数只留 detail），同数不两处。 */
function deficitBurnMix(d: DeficitData): string {
  const burn = d.summary.avgBurn;
  if (burn <= 0) return '';
  const row = (label: string, value: number) => ({ label, value: Math.round((value / burn) * 100) + '%', pct: Math.round((value / burn) * 100) });
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

/** #571 · 缺口族页面侧样式（只本页装配引用，不碰公共层与壳宽）。
 *
 *  R-32（明细折叠）：明细表＋徽章列套 B-08 `renderDisclosure`（原生 details，默认闭合，
 *  双档表高归零、390 页高占比归零，带展开控件；桌面亦折叠，点开即见全表）。冻结
 *  `analysis-deficit-385` 读的是源码 `<tr>`，折叠不减行，全绿。
 *  R-30（数值等宽右对齐）：缺口列右对齐＋`tnum`只本表生效（展开态 CDP 390/1440 极差 0）。
 *  R-31（合计单行）：左列 44px 装不下 4 字（CDP 与双档截图同证折行），本页拓到 64px
 * （8 的倍数），双档三行单行。
 *  卡内距 16px（4 的倍数，与 #569 Sim 同形；公共层 14px 归 #567 不动，只改渲染结果）。
 *  折叠 body 内距 16px（4 的倍数，与卡内距同档）。
 *  间距 8px/12px/16px/64px 均为 4 或 8 的倍数；字号沿公共层档不动。
 */
function t571DeficitCss(): string {
  return '<style>\n'
    + '.ilife-block-kpi-card{padding:16px}\n'
    + '.t571-deficit-table .ilife-block-data-table td.ilife-block-data-table-cell-right{text-align:right;font-variant-numeric:tabular-nums}\n'
    + '.t571-deficit-detail .ilife-block-disclosure-body{padding:0 16px 16px}\n'
    + '.t571-deficit-detail details:not([open]) > .ilife-block-disclosure-body{display:none}\n'
    + '.t571-deficit-totals .ilife-block-list-rows-row{grid-template-columns:64px minmax(0,1fr) auto}\n'
    + '</style>';
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
      /* #567 D4：口径定义只留页脚口径行；参数说明只讲窗口起止（改前与口径行逐句同义）。 */
      description: '开始和结束是这页统计的窗口，共 ' + d.meta.days + ' 天。',
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
    /* #571 R-33：橙色虚线进图例——第三序列与 markLine 同值（摄入目标），色由 palette[2]
     *  自动取橙（与 markLine 缺省色同源，不写色字面量，冻结色字面量仍零命中）；名含
     *  `摄入目标` 且含目标值，图例即含两词。markLine 保留（线上标签不动），两线重合。 */
    const targetLine = d.series.map((s) => ({ label: s.date.slice(5), value: d.target.intake }));
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
            { name: '摄入目标 ' + d.target.intake + ' 卡', items: targetLine, dashed: true },
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
   *  （`deficitStatusChips`）与「日均缺口」卡的状态徽章上。
   *  #571 R-32：表＋徽章列套 B-08 折叠（默认闭合，390 表高归零；桌面本层顶回可见）。
   *  #571 R-28 冲突记本条尾：`✓ 达标` 等三态文案与徽章 `达标 N 天` 均为冻结
   *  `analysis-deficit-385` 的 D2 逐字断言，本票不动文案（见证据 §2），只做折叠。 */
  parts.push(pageSection('sec-detail', '<div class="t571-deficit-detail"><div class="t571-deficit-table">'
    + renderDisclosure({
      title: '缺口明细（点击展开）',
      contentHtml: renderDataTable({
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
      }) + deficitStatusChips(shown, targetDef),
    }) + '</div></div>'));
  /* 三行的右槽原是两个碎片随手拼的（`5 天`／`TDEE×天＋运动`／`周缺口 300 卡`）——连起来读不成句，
   *  中间那个还带常量名式缩写。改：右槽一律写成能独立读的整句。 */
  /* 三行的右槽原是两个碎片随手拼的（`5 天`／`TDEE×天＋运动`／`周缺口 300 卡`）——连起来读不成句，
   *  中间那个还带常量名式缩写。改：右槽一律写成能独立读的整句（#160）。
   *  #517 再收一次：右槽是 `auto` 列、明细值占的是 `minmax(0,1fr)` 那列，**整句太长会把值挤到
   *  `overflow:hidden` 的截断线里**（判据 J3 实测：390 档 `合计消耗`／`合计缺口` 两行的值 cw=34／48px，
   *  值被裁得只露半个字）⇒ 右槽只留短注，「消耗＝日常消耗加当天运动」这类口径上移到口径行，
   *  「一周合计」这类事实住结论条与 KPI 卡（同一事实一页一处）。 */
  parts.push(pageSection('sec-totals', '<div class="t571-deficit-totals">' + renderListRows({ items: [
    { left: '合计摄入', main: totals.intake + ' 卡', right: '共 ' + d.meta.days + ' 天有记录' },
    { left: '合计消耗', main: totals.burn + ' 卡', right: '逐日累加' },
    { left: '合计缺口', main: signed(totals.deficit) + ' 卡' },
  ] }) + '</div>'));
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
  parts.push(renderCaliberLine('理论减重按每 7700 卡折算约 1 kg 估算｜达标线＝每天 ' + signed(targetDef) + ' 卡缺口｜图里实线是摄入，虚线是消耗，横线是摄入目标 ' + d.target.intake + ' 卡'));
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
    content: pageChromeCss(1120) + t571DeficitCss() + t573CrossCss() + parts.join(''),
    charts, pageUi: true,
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

/** 导航项（按当页实际出的区块裁掉没有的那几项）＝`renderTocBlock`（J2／J8／J9 三条恒出之一）。
 *  #570 R-15：轨迹项文本按族给——模拟减重族沿用`模拟轨迹`（缺省），摄入预测族传`摄入预测轨迹`
 *  （与表注`摄入预测轨迹（共 N 天，每周一点）`前6字一致）；只改文本不改id，有轨迹页仍四项、
 *  无轨迹页仍三项（J8双向自洽冻结，见R-25冲突点）。 */
function predictNav(hasTrack: boolean, trackText = '模拟轨迹'): string {
  const items = PREDICT_SECTIONS.filter((s) => hasTrack || s.id !== 'sec-track')
    .map((s) => ({ id: s.id, text: s.id === 'sec-track' ? trackText : s.text }));
  return renderTocBlock({ items });
}

/** #573 R-60：区块可见标题与导航项同源——`sec-track` 取调用方传进来的同一份 `trackText`，
 *  其余取 `PREDICT_SECTIONS` 同一格；导航与标题因此不可能走散（R-60验收：headings==导航项逐项相等）。 */
function secTitle(id: string, trackText = '模拟轨迹'): string {
  if (id === 'sec-track') return trackText;
  const s = PREDICT_SECTIONS.find((x) => x.id === id);
  return s === undefined ? '' : s.text;
}

/** 页头胶囊（#516 §3.2 D01／D02）：归属词与页型不拿 `·` 串进题名，改走徽章件（`renderChips`）。
 *  页型逐页不同（体重预测／模拟减重／摄入预测），眉标只留一个域词（见各页 `assembleDocPage`）。
 *  #625 A团：18／19／20 三页去第三枚胶囊（与眉标 `趋势分析` 逐字重复）；缺省三枚，
 *  其余页逐字节不变（01–17 的 V1 读数不受影响）。 */
function predictChips(pageType: string, short = false): string {
  const items = short
    ? [{ text: '卡路里' }, { text: pageType }]
    : [{ text: '卡路里' }, { text: pageType }, { text: '趋势分析' }];
  return renderChips({ items });
}

/** #568 R-01/R-02/R-04 · 预测体重族页面侧样式（只本族装配引用，不碰公共层与壳宽）。
 *
 *  R-01/R-02：区间值与单位成组不跨行——值`nowrap`＋行`nowrap`＋单位不压缩，间隙沿公共层6px（≤8px）。
 *  源码仍写`至`（冻结`W6-③`锁`66.0 至 66.5`，改`–`即红），单行由版式承担，见§6冲突点。
 *  R-04页内一半：桌面档（>820）参数表单三列并排，消化多出120px；壳`max-width:1120px`一行不动（归#567）。
 *  间距取12px/4px（4的倍数），字号沿公共层22px/13px档不动，数值列沿公共层`tnum`右对齐。
 */
function t568PredictCss(): string {
  return '<style>\n'
    + '.ilife-block-kpi-card-value-row{flex-wrap:nowrap;white-space:nowrap}\n'
    + '.ilife-block-kpi-card-value{white-space:nowrap;overflow-wrap:normal;word-break:keep-all}\n'
    + '.ilife-block-kpi-card-unit{flex-shrink:0}\n'
    + '@media (min-width:821px){\n'
    + '  .ilife-block-param-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}\n'
    + '  .ilife-block-param-form-description{grid-column:1/-1;margin:0 0 4px}\n'
    + '  .ilife-block-param-form-field{margin:0}\n'
    + '}\n'
    + '</style>';
}

/** #569 R-07/R-12/R-13 · 模拟减重族页面侧样式（只本族三装配引用，不碰公共层）。
 *
 *  R-07（取报告第二档：恢复表头＋列式对齐）：两列轨迹表（日期／模拟体重）在 ≤640px
 *  把公共层行卡化逐条顶回表形态。外层另套 `.tpd-track-table--cols2` 纯标记——内层
 *  `<div class="tpd-track-table">` 保持逐字（W6-②守卫认领该字面），三列表（摄入预测
 *  14–16，#570 地盘）不套、维持现状。`td::before{content:none}` 后 390 档标签零残留，
 *  数值列回 `text-align:right`（等宽栈与 `tnum` 由公共层基规则承担），右缘共线。
 *  R-12：结论卡值升档 `28px/800`（公共层 `22px/700`；22→28 级差 6≥4，28 为 4 的倍数）。
 *  模拟页结论卡＝网格第 3 格（每周掉重）；判定卡无值位故选不中。参数卡留公共层档。
 *  R-13：卡内距页侧覆盖 `16px`（公共层 `14px` 归 #567 不动，只改渲染结果）。
 *  间距 8px/12px/16px 均为 4 的倍数；字号 28 与单位 13 差 15≥8。
 */
function t569SimCss(): string {
  return '<style>\n'
    + '.ilife-block-kpi-card{padding:16px}\n'
    + '.ilife-block-kpi-card-grid > .ilife-block-kpi-card:nth-child(3) .ilife-block-kpi-card-value{font-size:28px;font-weight:800}\n'
    + '@media (max-width:640px){\n'
    + '  .tpd-track-table--cols2 .ilife-block-data-table-table{display:table;width:100%}\n'
    + '  .tpd-track-table--cols2 .ilife-block-data-table thead{display:table-header-group}\n'
    + '  .tpd-track-table--cols2 .ilife-block-data-table tbody{display:table-row-group}\n'
    + '  .tpd-track-table--cols2 .ilife-block-data-table tr{display:table-row;padding:0;border-top:0}\n'
    + '  .tpd-track-table--cols2 .ilife-block-data-table td{display:table-cell;white-space:nowrap;padding:8px 12px;border-bottom:1px solid var(--line)}\n'
    + '  .tpd-track-table--cols2 .ilife-block-data-table td::before{content:none}\n'
    + '  .tpd-track-table--cols2 .ilife-block-data-table-table td.ilife-block-data-table-cell-right{text-align:right;min-width:0}\n'
    + '}\n'
    + '</style>';
}

/** #569 R-12/R-13 · 摄入预测页（14–16，#570 地盘，本票只增益）页面侧样式。
 *  结论卡＝网格第 4 格（摄入预测）；卡内距同 16px。R-07 不动三列表（R-16 归 #570）。 */
function t569ForecastCss(): string {
  return '<style>\n'
    + '.ilife-block-kpi-card{padding:16px}\n'
    + '.ilife-block-kpi-card-grid > .ilife-block-kpi-card:nth-child(4) .ilife-block-kpi-card-value{font-size:28px;font-weight:800}\n'
    + '</style>';
}

/** #570 R-16/R-17/R-20/R-21 · 摄入预测族页面侧样式（只本族四装配引用，不碰公共层与壳宽）。
 *
 *  R-20（桌面卡列统一）：公共层桌面档 `repeat(auto-fit,minmax(150px,1fr))` 随卡数变列
 *  （CDP时点：17/18四卡261px、19两卡534px、20三卡352px），本族一律显式两列，
 *  卡宽全族约534px（窄档公共层本就是两列，不断点）。
 *  R-16（窄档三列表堆叠）：三列表套 `.tpd-track-table--cols3` 纯标记（内层字面逐字不动，
 *  与R-07两列表cols2标记同形）；≤640px每列独占一行、标签左值右（`space-between`＋列隙12px，
 *  标签与值间隙≥12px≥4px），日期标签重新印出（顶回trackTableCss那条`first-child::before{content:none}`）。
 *  R-17（桌面列宽按内容）：表卡680上限与居中不动（归#567），内表收为内容宽——外层改
 *  `display:table`才收缩（普通表width:auto仍铺满，CDP已证）；日期列下限140px；
 *  数值格不换行＋内距收8px＋`min-width:0`顶回公共层5.5em地板（#507地板为长表设，
 *  本表内容短，右对齐与tnum保留，只本表生效）；改后比值≤1.6（最长文本含表头，见§6算法说明）。
 *  R-21（判定卡药丸升格：冻结W6-①要求判定卡无值位元素，故不增值位，只把徽章提到值位字号档22px/700，见§6）。
 *  间距8px/12px、圆角12px均为4的倍数；窄档标签12px沿公共层档。
 */
function t570IntakeCss(): string {
  return '<style>\n'
    + 'div.ilife-block-kpi-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}\n'
    + '.ilife-block-kpi-card-badge .ilife-status-badge{font-size:22px;font-weight:700}\n'
    + '@media (min-width:641px){\n'
    + '  .tpd-track-table--cols3 .ilife-block-data-table{display:table;width:auto;margin-inline:auto}\n'
    + '  .tpd-track-table--cols3 .ilife-block-data-table-table{width:auto;margin-left:auto;margin-right:auto}\n'
    + '  .tpd-track-table--cols3 .ilife-block-data-table th:first-child,.tpd-track-table--cols3 .ilife-block-data-table td:first-child{min-width:140px}\n'
    + '  .tpd-track-table--cols3 .ilife-block-data-table th{padding-left:8px;padding-right:8px}\n'
    + '  .tpd-track-table--cols3 .ilife-block-data-table td{white-space:nowrap}\n'
    + '}\n'
    + '.tpd-track-table--cols3 .ilife-block-data-table td.ilife-block-data-table-cell-right{min-width:0;padding-left:8px;padding-right:8px;text-align:right;font-variant-numeric:tabular-nums}\n'
    + '@media (max-width:640px){\n'
    + '  .tpd-track-table.tpd-track-table--cols3 .ilife-block-data-table tbody>tr{display:block;border:1px solid var(--line);border-radius:12px;padding:8px 12px;margin:0 0 8px}\n'
    + '  .tpd-track-table.tpd-track-table--cols3 .ilife-block-data-table tbody>tr>td{display:flex;justify-content:space-between;align-items:baseline;gap:4px 12px;padding:4px 0;white-space:nowrap}\n'
    + '  .tpd-track-table.tpd-track-table--cols3 .ilife-block-data-table tbody>tr>td::before{content:attr(data-label);color:var(--fg2);font-size:12px;flex-shrink:0}\n'
    + '  .tpd-track-table.tpd-track-table--cols3 .ilife-block-data-table tbody>tr>td:first-child::before{content:attr(data-label)}\n'
    + '}\n'
    + '</style>';
}

/** #625 A团 · 稳定性页末格补齐（只本页装配引用）。
 *
 *  病根（V3-20）：均值／波动／是否稳定三格同处 2 列网格，末格落单，右侧留 534×125 空格
 *  （桌面档；`t570IntakeCss` 的两列覆盖是族共用的，不能在这里改）。
 *  解法：末个奇数格横跨两列（`#sec-overview` 限定，只吃本页本节；`t570IntakeCss` 与徽章升格一字不动）。 */
function t625StabilityCss(): string {
  return '<style>\n'
    + '#sec-overview .ilife-block-kpi-card-grid > :nth-child(odd):last-child{grid-column:1/-1}\n'
    + '</style>';
}
/** #573 跨族页面侧样式（只本件 9 个墙内装配引用，不碰公共层与壳宽）。
 *
 *  R-60（可见小节标题）：`.tpd-sec-title` 16px/700（16 为 4 的倍数，沿公共层正文上两档），
 *  下边距 8px（8 的倍数）；颜色字面量 0（继承正文色）。
 *  R-61（表卡左缘）：表卡 `max-width:680px` 不动（归 #567），只把 `margin-inline:auto` 的居中
 *  归位为左缘对齐（`margin-left:0`，块轴 `16px 0` 不动）；`--cols3` 内表（R-17 收窄居中的那一张）
 *  同步归位（宽仍 ~332，归 #567）。窄档（容器 <680）上限本就不触发，`auto→0` 无变化。
 *  缺口表明细表住折叠 body（`.t571-deficit-detail …body{padding:0 16px}`）里，
 *  表再补 `margin-left:-16px` 对冲那 16px（只吃内边距、不外溢；残差 1px 表框与 07/24 同口径 Δ≤1）。
 *  R-62（按钮行）：桌面档（>820px，与公共层桌面档同断点）按钮行铺满内容列
 *  （`max-width:none`＋左右边距 0，纵向沿公共层 `12px 0`）；≤820px 不出这条，沿旧 520 居中
 *  （内容列本就不足 520，行为不变）。HELP② 的 520 居中出处在 `pageChromeCss.ts:36`，
 *  R-62 以 R 条为准（见证据 §6 C3），本件只覆盖墙内 01–23。
 */
function t573CrossCss(): string {
  return '<style>\n/* #573 跨族：小节标题＋表左缘＋按钮行（页面侧） */\n'
    + '.tpd-sec-title{font-size:16px;line-height:1.5;font-weight:700;margin:0 0 8px}\n'
    + '.ilife-block-page-shell .ilife-block-data-table{margin-left:0;margin-right:auto}\n'
    + '.t571-deficit-detail .ilife-block-data-table{margin-left:-16px}\n'
    + '.tpd-track-table--cols3 .ilife-block-data-table-table{margin-left:0;margin-right:auto}\n'
    + '@media (min-width:821px){.ilife-block-page-shell .ilife-action-bar{max-width:none;margin:12px 0}}\n'
    + '</style>';
}
/** #568 R-03 · 眉题写族名、chip写页名（eyebrow≠任一chip）。
 *  预测体重族眉题`预测体重`、模拟减重族眉题`模拟减重`（见各页`eyebrow`），本件只产chip侧：
 *  第二格为页身份（`7 天`／`自定义目标`／`每天-300卡`），与眉题族名 distinct；第三格域词保留。
 *  #569 R-10：模拟减重族第二格改留空格形态（`每天 -300 卡`／`30 天减 2 kg`），仍与眉题 distinct。
 */
function t568Chips(pageLabel: string): string {
  return renderChips({ items: [{ text: '卡路里' }, { text: pageLabel }, { text: '趋势分析' }] });
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

/* ── W5（#518）· 数值有效位一致（视觉抽查 §2.1 缺陷 4／§2.2 缺陷 5） ───────────────────
 *
 *  病根：同一列／同一卡里的数各自走 `String(n)` ⇒ 把上游的**浮点尾数**原样印上屏。实测两个反例：
 *    · 页 01「预计区间」卡：`74.69 至 74.80` 由 `fmt()` 出（尾部零被 JS 吃掉）与 `74.8` 混排；
 *    · 页 07 结论句 `1.36 kg` 与卡里 `1.36`／区间端点混排；页 10–13「每周掉重」`1.87` 与
 *      「当前」`75.1` 同排（体重 1 位、速率 2 位，是**语义档**不是随手）。
 *
 *  口径（本件页族统一，**不改任何冻结断言的期望值**——下面每一处都只走显示层）：
 *    · 体重类（kg 值、预测值）＝**1 位**；
 *    · 速率／比率类（kg/周）＝**2 位**；
 *    · 整数语义的读数（卡路里、天数、天数差）＝原样，不补小数。
 *  非有限数（`undefined`／`NaN`）交给 `fmt` 的既有退化分支印 `—`。 */
function fixedOrUndefined(n: number | null | undefined, digits: number): number | undefined {
  return n === null || n === undefined || !Number.isFinite(n) ? undefined : Number(n.toFixed(digits));
}

/** 体重读数（**固定 1 位**；非有限数印 `—`）。
 *  **W6**：这里必须走 `toFixed(1)` 的**字面**，不能走 `fmt(Number(n.toFixed(1)))`——
 *  后者把整数位的小数点吃掉，页 07 轨迹列就会出现 `71` 与 `72.4` 同列两种字面
 *  （视觉抽查 §9.5 那格「部分修」的尾巴：源码命中 `>71</td>`，与同列 `72.4`／`73.7` 不一致）。
 *  非有限数那一支仍是**真缺值**语境，故照既有口径印 `—`。 */
function fmtWeight(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? '—' : n.toFixed(1);
}

/** 速率读数（2 位）。 */
function fmtRate(n: number | null | undefined): string {
  return fmt(fixedOrUndefined(n, 2));
}

/** 卡路里读数（整数）。摄入／消耗是整数语义的量——同页「当前摄入」「目标」都是整数，
 *  外推出来的 `1666.98` 是**算出来的小数**，不是量出来的精度（视觉抽查 §2.2 缺陷 5 的同一病根）。 */
function fmtKcal(n: number | null | undefined): string {
  return fmt(fixedOrUndefined(n, 0));
}

/** 轨迹表的公共装配（有表的页共用）：列与表题同源，表题按**实际覆盖天数**写实（#455）。
 *  **W5**：① 值走 `fmtWeight`（1 位）——同列有效位一致（视觉抽查 §2.2 缺陷 5）；
 *  ② 外层套 `.tpd-track-table` 一个**纯标记类**（公共层产出器不吃额外入参，故只能在外层套），
 *  供本页族窄档那条规则定位——窄档「一行两行」的标签噪声缓解见件头下方 `trackTableCss`。
 *  **#569 R-07**：两列模拟表（`restoreHead=true`）再套一层 `.tpd-track-table--cols2`
 *  纯标记（内层字面逐字不动，W6-②守卫），供 `t569SimCss` 窄档恢复表头＋列式对齐；
 *  三列表（摄入预测）传缺省，维持行卡化（R-16 归 #570）。 */
function trackTable(points: ReadonlyArray<{ date: string; value: number }>, what: string, unit: string, restoreHead = false): string {
  const span = spanDaysOf(points);
  const shown = points.slice(0, 14);
  const truncated = points.length > shown.length ? '（仅列前 14 点，共 ' + points.length + ' 点）' : '';
  const table = '<div class="tpd-track-table">' + renderDataTable({
    columns: [{ key: 'date', label: '日期' }, { key: 'weight', label: what + '（' + unit + '）', align: 'right' }],
    rows: shown.map((p) => ({ date: p.date, weight: fmtWeight(p.value) })),
    caption: '模拟轨迹（共 ' + span + ' 天，每周一点' + truncated + '）',
    emptyText: '这一段还没有体重记录，先称一次体重再来看',
  }) + '</div>';
  return restoreHead ? '<div class="tpd-track-table--cols2">' + table + '</div>' : table;
}

/** 轨迹表的**窄档**样式（#518 W5 · 只做页面侧，逐条都住本页族自己的 `<style>` 段里）。
 *
 *  视觉抽查 §2.2 缺陷 6（页 07 · 390 档）：「表格堆叠后每条记录占两行、且**逐行重复字段名**
 *  『日期』『模拟体重』15 遍，15 个数据点摊成 30 行、整页拉到 2066px」。
 *
 *  公共层在 ≤640px 把每格做成「标签 ＋ 值」一行（`td::before{content:attr(data-label)}`，
 *  见 `packages/base-render/src/blocks.ts` 的 t154-r3／#541 段）——那是**多列任意表**的通用解。
 *  本页族这张表只有两列，其中**日期这一列的名自明**（`2026-09-16` 谁都认得出是日期），
 *  故窄档把它压回**一行一条**：
 *    · 行改 flex（`tr` 本身没有类名，故用 `tbody > tr` 与容器类两层限定）；
 *    · 日期格去掉那半个标签（`first-child::before{content:none}`），值独占；
 *    · 体重格保留「模拟体重」标签——它是这一行唯一的字段名，逐行出现是本职，不是噪声；
 *    · `nowrap` 兜住：值再长也不逐格换行。
 *  高度读数：30 行 → 15 行（15 行表＝每行「日期」「模拟体重」两行合成一行）。
 *  **不碰公共层**：`packages/base-render/**` 一行未动（票面红线），只在本页族的 `<style>` 段覆盖。
 *
 *  限定面：`<div class="tpd-track-table">` 由 `trackTable()` 自己套上（本件独有，逐字可检索），
 *  公共层产出器不吃额外入参，故只能在外层套这一层——不改公共层、也不改公共层的产出结构。
 *
 *  **W6 追加**：表头那一格的单位**只许一种形态**。公共层的 `.ilife-block-data-table th` 带
 *  `text-transform: uppercase`（`base-render/src/blocks.ts` 的 `th` 一段），1440 档把
 *  `模拟体重（kg）` 渲染成 `模拟体重（KG）`，而同一页的 KPI 卡单位是 `kg/周`、脚注写「公斤」
 *  ⇒ 同页同单位三形态（视觉抽查 §9.2 新引入项之一的原句）。修正动作＝在本页族这一层把 `th`
 *  的转换压掉（`text-transform:none`），字面就回到源码里的 `kg`；脚注那一侧的用词由本件自己
 *  统一成 `kg`（见各页 `renderCaliberLine`）。表头缩写的选择权仍在**公共层**（红线：不动
 *  `packages/base-render/**`），本件只覆盖这一张表的列头。 */
function trackTableCss(): string {
  return '<style>\n'
    /* 纯标记块：桌面档不给任何样式，只作窄档那段规则的锚点。 */
    + '.tpd-track-table{display:block}\n'
    /* W6：列头不放大写——单位写 `kg` 就渲染 `kg`（选择器多一层，压过公共层的同名同权重规则）。 */
    + '.tpd-track-table .ilife-block-data-table th{text-transform:none}\n'
    + '@media (max-width:640px){\n'
    + '  .tpd-track-table tbody>tr{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px}\n'
    + '  .tpd-track-table tbody>tr>td{display:block;white-space:nowrap;overflow-wrap:normal;padding:4px 0}\n'
    + '  .tpd-track-table tbody>tr>td:first-child::before{content:none}\n'
    + '}\n'
    + '</style>';
}
/* ── W6（#518）· 判定卡的值位**整格撤掉**（视觉抽查 §9.6 新引入问题①） ─────────────────

 *  缺陷原文（`docs/skills/skill-calorie/t518-视觉抽查.md` §9.6）：「KPI 行里三张卡是大号数字、
 *  第四张是一个短横，**值位这个全页最大的字号位置被空符号占住**，整行扫读节奏断掉」＋
 *  「更关键的是**符号语义撞车**：`—` 在数据页的通行读法是『缺值／无数据』，这里却被用来表达
 *  『该指标不是数值型』。同一符号在别的卡上若真出现缺值，读者无法区分『没有数据』和『不适用』。」
 *
 *  改法＝W6 派单 §1 的推荐①：**撤掉该卡的值位**——判定词只由状态徽标承担（一处），空出的位置
 *  由 `detail` 补一句人话（**不引入任何新数字**，也不与徽标同词，故 W5-① 那条「同卡不重复」仍绿）。
 *
 *  为什么这张卡不走 `renderKpiCard`：公共层的 `KpiCardInput.value` 是**必填非空**
 *  （`base-render/src/blocks.ts` 的 `KpiCardInput.value` ＋ `reqText` 的 `value === '' → badInput`）
 *  ⇒「没有值位的卡」在公共层**产不出来**，而本票红线不许动 `packages/base-render/**`。
 *  故本件自出这一张卡的**页框**：类名沿用公共层同一套命名空间（`ilife-block-kpi-card` 一族），
 *  `.ilife-block-kpi-card-grid` 的网格与全部样式因此仍单源住公共层——
 *  **徽章本身**照旧走公共层 `renderStatusBadge`（本件不造第二份徽章）。
 *  同族先例：`sportDocs.ts` 的目标环卡（`ilife-block-ring-*`）同样是页面自出的卡。
 *
 *  硬规矩（W6 派单 §1）：**可见文本里的 `—` 只允许用于缺值语境**。本件剩下两处 `—` 都在
 *  `?? '—'` 的**真缺值**分支上（页 14–17 的「目标」「日变化」）；非数值型的判定卡一处不留。
 *  机器守卫＝`test/analysis-deficit-eta-466.test.mjs` 的 `#518 W6-①`（含变异两行）。 */
function verdictCard(label: string, detail: string, ok: boolean | undefined, okText: string, badText: string): string {
  return '<div class="ilife-block ilife-block-kpi-card">'
    + '<div class="ilife-block-kpi-card-label">' + escapeHtml(label) + '</div>'
    + '<div class="ilife-block-kpi-card-detail">' + escapeHtml(detail) + '</div>'
    + '<div class="ilife-block-kpi-card-badge">'
    + renderStatusBadge({ status: ok ? 'ok' : 'warn', text: ok ? okText : badText })
    + '</div></div>';
}

/** 判定卡补进网格的尾位：`renderKpiGrid` 只吃 `KpiCardInput`（值位必填非空），
 *  而判定卡没有值位 ⇒ 在网格收尾前把这一张塞进去，网格结构与卡序（前 3 张数据卡 ＋ 尾位判定卡）不变。 */
function withVerdictCard(gridHtml: string, cardHtml: string): string {
  const CLOSE = '</div>';
  return gridHtml.endsWith(CLOSE) ? gridHtml.slice(0, -CLOSE.length) + cardHtml + CLOSE : gridHtml + cardHtml;
}

/* ── 体重预测（predict_report 对照：点预测 KPI＋insight；曲线归组合分析，见 §3 R4） ── */

export function buildPredictDoc(v: PredictView): string {
  const parts: string[] = [
    /* #568 R-03：眉题写族名（见`eyebrow:预测体重`）、chip写页名（第二格`N 天`），二者 distinct。 */
    t568Chips(String(v.horizonDays) + ' 天'),
    /* 结论条（J2／J9 三条恒出之一；`t425` 裁定 2：结论句紧跟标题）：只用页里已有的数——
     * `forecastValue` 是**轨迹末点**的值，补了第 horizon 天末点之后它与「N 天后」真正同轴（#455）。
     * W5：末值走 `fmtWeight`（1 位）——与同页「预计区间」两端同一档（视觉抽查 §2.1 缺陷 4）。 */
    renderConclusionBar('按最近的趋势，' + v.horizonDays + ' 天后体重约 ' + fmtWeight(v.forecastValue) + ' kg。'),
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
    }), secTitle('sec-params')),
    pageSection('sec-overview', renderKpiGrid([
      { label: '当前', value: String(v.current), unit: 'kg' },
      /* W5：与结论句同一档（1 位）——同一件事（末点预测值）在页上只该有一个写法。 */
      { label: '预测', value: fmtWeight(v.forecastValue), unit: 'kg', detail: v.horizonDays + ' 天后' },
      /* W5：速率 2 位（语义档＝kg/周）。 */
      { label: '速率', value: fmtRate(v.ratePerWeek), unit: 'kg/周' },
      /* 区间写「至」（#516 §3.2 D06：值位不许拿 `~` 顶替「至」）。
       * W5：两端走 `fmtWeight`（1 位）——原写法 `fmt()` 把 `74.80` 印成 `74.8`，
       * 与同卡另一端的两位小数混排（视觉抽查 §2.1 缺陷 4 的原句）。 */
      { label: '预计区间', value: fmtWeight(v.forecastLo) + ' 至 ' + fmtWeight(v.forecastHi), unit: 'kg', detail: '95% 置信带' },
    ]), secTitle('sec-overview')),
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
  }), secTitle('sec-data')));
  /* 口径行（J2／J9 三条恒出之一；`renderCaliberLine` 走 `｜` 分槽，产物可见文本里不留该字符）。 */
  parts.push(renderCaliberLine('体重＝当前值加日速率乘天数｜预计区间按体重残差向外放宽，取 95% 置信带｜体重记录不到 14 天不出预测'));
  parts.push(sourceFootnote('体重记录', v.start, v.end));
  return assembleDocPage({
    /* head 的 `<title>` 也去 `·`（J1 题名两段不拿 `·` 串；同族先例 #517 缺口页的「卡路里 热量缺口」）。 */
    docTitle: '卡路里 体重预测',
    title: '体重预测（' + v.horizonDays + ' 天）',
    /* 眉标只留一个归属词（#516 §3.2 D02）：原来那串 `体重预测 · 趋势分析域` 的 `·` 拆开——
     * 页型进了页头胶囊，眉标留域；`域` 是仓库里的架构词，不上屏。
     * #568 R-03：眉题改写族名`预测体重`（chip第二格写页名`N 天`，二者 distinct，8/8）。 */
    eyebrow: '预测体重',
    subtitle: null,
    content: pageChromeCss(1120) + t568PredictCss() + t573CrossCss() + parts.join(''),
    charts: false, pageUi: true,
  });
}

/* ── #383 · 预测体重(自定义目标)（weightTarget：预计达成日＋可行性；只改本图会碰到的预测段） ── */

export function buildPredictTargetDoc(v: WeightTarget): string {
  /* #568 R-06：差异量（还差Xkg）与期限（剩余Y天）取页里已有数（current/target/daysLeft），不新算口径；
   * 结论第二句不再写判断（`超出健康范围`只留徽标一处），detail改速率事实，与徽标/结论两两不互为子串。 */
  const diffKg = (typeof v.current === 'number' && typeof v.target === 'number'
    && Number.isFinite(v.current) && Number.isFinite(v.target))
    ? (v.current - v.target).toFixed(1) : null;
  const conclTail = diffKg === null
    ? '' : '还差 ' + diffKg + ' kg，剩余 ' + String(v.daysLeft) + ' 天。';
  /* W6-①硬规矩：可见文本里的`—`只许用于真缺值。此处降级视图（rate缺失）不许印`—`（否则完整夹具也被判有`—`），改一句无数字人话。 */
  const rateText = (typeof v.ratePerWeek === 'number' && Number.isFinite(v.ratePerWeek))
    ? '当前速率 ' + fmtRate(v.ratePerWeek) + ' kg/周。' : '按窗口内趋势推算。';
  const parts: string[] = [
    /* #568 R-03：chip第二格写页名`自定义目标`，眉题写族名`预测体重`（见`eyebrow`）。 */
    t568Chips('自定义目标'),
    /* 结论句只用页里已有的数（`eta`／`target`／`diff`／`daysLeft`），判断只留徽标（R-06计数==1）。 */
    renderConclusionBar('按最近的趋势，预计 ' + String(v.eta) + ' 前后达到 ' + String(v.target) + ' kg。' + conclTail),
    predictNav(false),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
        { name: 'target', label: '目标体重', value: String(v.target ?? '') },
      ],
      description: '按当前的体重趋势算出哪天能达到目标体重。体重记录不到 14 天就只说数据不够，不编一个日期出来。',
    }), secTitle('sec-params')),
    pageSection('sec-overview', withVerdictCard(renderKpiGrid([
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '目标', value: String(v.target), unit: 'kg' },
      { label: '预计达成', value: String(v.eta), detail: '剩余 ' + String(v.daysLeft) + ' 天' },
    ]), verdictCard('可行性', rateText, v.feasible, '可行', '超范围')), secTitle('sec-overview')),
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
  }), secTitle('sec-data')));
  parts.push(renderCaliberLine('预计达成日＝按当前速率线性外推的那一天｜健康范围＝每周掉 0.5 到 1.0 kg｜体重记录不到 14 天不出日期'));
  parts.push(sourceFootnote('体重记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 体重预测',
    /* H1（W5：括号统一为全角）**必须带本页自己的参数**：`analysis-accept-386.test.mjs:327` 那条
     * 「页头不是它自己那一页」的断言对 `target:65` 这条词要求「非 window 的数字参数都出现在 H1 里」
     * （同族 01–05／07–17 本就满足：H1 里带天数／卡数）；本页原文不带目标值 ⇒ 补上「65 kg」。
     * 括号**只换形状不换词**：唤醒词原文与冻结表仍写半角（`routes.ts` 的 `wake_word` 一字未动）。
     * #568 R-05：`65`与`kg`之间用不换行空格（U+00A0），二者不可断（冻结W5-③要求H1纯文本，故不用span，见§6冲突点）。 */
    title: '预测体重（自定义目标 ' + String(v.target ?? '') + ' kg）',
    /* #568 R-03：眉题写族名`预测体重`（chip第二格`自定义目标`，二者 distinct）。 */
    eyebrow: '预测体重',
    subtitle: null,
    content: pageChromeCss(1120) + t568PredictCss() + t573CrossCss() + parts.join(''),
    charts: false, pageUi: true,
  });
}

/* ── #383 · 模拟减重(每天多减 cutKcal 卡)（每周掉重＋可行性；只改本图会碰到的预测段） ── */

export function buildSimCutDoc(v: WeightSimCut): string {
  const pts = v.forecast ? v.forecast.points : [];
  /* #569 R-09：判断只留徽标一处（`超范围`／`可行`）。结论只留两主数（前半句式冻结 W5-②
   *  `/一周大约掉 (\d+\.\d+) kg/` 不动）；判定卡 detail 改互补事实——`newDeficit`（每天总缺口）
   *  页上别处未用，不与徽标同词（W5-①），无 `—`（W6-①-c），缺数时 fallback 无数字人话。 */
  const totalGap = (typeof v.newDeficit === 'number' && Number.isFinite(v.newDeficit))
    ? '每天总缺口约 ' + String(v.newDeficit) + ' 卡。' : '缺口按窗口内趋势另算。';
  const parts: string[] = [
    /* #568 R-03（01–08）：chip第二格写页名`每天-N卡`，眉题写族名`模拟减重`（见`eyebrow`）。
     *  #569 R-10：页名留半角空格（`每天 -300 卡`），与正文同一间距规则（数字与单位间留空格）。 */
    t568Chips('每天 -' + String(v.cutKcal) + ' 卡'),
    /* 结论句只用页里已有的数（`cutKcal`／`weeklyLoss`）。
     * W5：`weeklyLoss` 走 `fmtRate`（2 位）——与第 3 张卡的「每周掉重」同一档。 */
    renderConclusionBar('每天多减 ' + String(v.cutKcal ?? '') + ' 卡，一周大约掉 ' + fmtRate(v.weeklyLoss) + ' kg。'),
    predictNav(pts.length > 0),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
        { name: 'cut_kcal', label: '每天多减', value: String(v.cutKcal ?? '') },
      ],
      /* 原说明里那句 `；` 与「90 天的轨迹在下面」拆开：轨迹那一句由区块自己（表题）承担，
       * 这里只说这一页在做什么（#516 §3.2 D03；`KCAL_PER_KG` 这类常量名不上屏）。 */
      description: '看看每天再多减一些卡路里，体重会怎么掉。每 7700 卡大约对应 1 kg，按这个折算每周掉多少。能不能做到，看每周的掉重落在 0.5 到 1.0 kg 这个安全区间里没有。',
    }), secTitle('sec-params')),
    trackTableCss(),
    pageSection('sec-overview', withVerdictCard(renderKpiGrid([
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '每天多减', value: String(v.cutKcal), unit: '卡' },
      /* W5：值走 `fmtRate`（2 位，kg/周 的语义档）——原写法把上游 `round2` 的尾零吃掉，
       * 会出现 `1.4` 与同族 `1.36` 两种写法；`安全区间 0.5 到 1.0 kg/周`这份事实已由
       * 同页口径行末段承担（「安全区间＝每周掉 0.5 到 1.0 kg」），卡内不再印第二遍。
       * #569 R-12：本卡为结论卡（字号由 `t569SimCss` 升档，不改此处）。 */
      { label: '每周掉重', value: fmtRate(v.weeklyLoss), unit: 'kg/周' },
    ]), verdictCard('可行性', totalGap, v.feasible, '可行', '超范围')), secTitle('sec-overview')),
  ];
  /* #569 R-07：两列表传 `restoreHead`（窄档恢复表头＋列式对齐，见 `t569SimCss`）。 */
  if (pts.length > 0) parts.push(pageSection('sec-track', trackTable(pts, '模拟体重', 'kg', true), secTitle('sec-track')));
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
  }), secTitle('sec-data')));
  parts.push(renderCaliberLine('每 7700 卡大约折算 1 kg｜轨迹从窗口最后一天起算，每周一点，非整周时补最后一天那一行｜安全区间＝每周掉 0.5 到 1.0 kg'));
  parts.push(sourceFootnote('体重记录与运动记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 模拟减重',
    /* #569 R-10：主标与正文同一间距规则（数字与单位间留半角空格）：`每天 -300 卡`。
     *  唤醒词原文（`模拟减重(每天-300卡)`）住 routes.ts 冻结不动；括号仍全角（W5-③）。 */
    title: '模拟减重（每天 -' + String(v.cutKcal) + ' 卡）',
    /* #568 R-03：眉题写族名`模拟减重`（chip第二格页名，二者 distinct）。 */
    eyebrow: '模拟减重',
    subtitle: null,
    content: pageChromeCss(1120) + t568PredictCss() + t569SimCss() + t573CrossCss() + parts.join(''),
    charts: false, pageUi: true,
  });
}

/* ── #383 · 模拟减重(自定天数减 Xkg)（所需每日缺口＋可行性；只改本图会碰到的预测段） ── */

export function buildSimTargetDoc(v: WeightSimTarget): string {
  const pts = v.forecast ? v.forecast.points : [];
  /* #569 R-11：`所需缺口`卡 detail 原与结论条同前缀（`要在 X 天里减掉 Y kg`）。
   *  改总量互补——`neededDeficit×daysTarget`（渲染层派生，R-06 `diffKg` 先例；
   *  该视图无“当前缺口”字段，报告的“如…”例无数组成）。无 `—`（W6-①-c）。 */
  const periodTotal = (typeof v.neededDeficit === 'number' && typeof v.daysTarget === 'number'
    && Number.isFinite(v.neededDeficit) && Number.isFinite(v.daysTarget))
    ? String(v.daysTarget) + ' 天合计约 ' + String(v.neededDeficit * v.daysTarget) + ' 卡。'
    : '缺口按窗口内趋势另算。';
  /* #620 增量1：结论与徽标按 `weeklyRate` 分偏慢/偏快（`feasible`只保兼容）。慢速（<0.5）说“偏慢”，快速（>1.0）说“超出/偏快”，口径唯一处 `HEALTHY_RATE`。 */
  const weeklyRateNum = typeof v.weeklyRate === 'number' ? v.weeklyRate : NaN;
  const slowTarget = Number.isFinite(weeklyRateNum) && weeklyRateNum < HEALTHY_RATE[0];
  const parts: string[] = [
    /* #569 R-03 同形延伸（10–13）：眉题写族名`模拟减重`、chip 写页名（与 H1 同 spaced 形态），
     *  二者 distinct（改前眉题`趋势分析`与第三格同字，R-03 的 01–08 范围未含 10–13）。 */
    t568Chips(String(v.daysTarget) + ' 天减 ' + String(v.targetLoss) + ' kg'),
    /* 结论句只用页里已有的数（`daysTarget`／`targetLoss`／`neededDeficit`／`feasible`＋`weeklyRate`判方向）。 */
    renderConclusionBar('要在 ' + String(v.daysTarget) + ' 天里减掉 ' + String(v.targetLoss) + ' kg，每天大约要留出 ' + String(v.neededDeficit) + ' 卡缺口。'
      + (v.feasible ? '这个速度在健康范围内。' : slowTarget ? '这个速度偏慢，建议缩短时间或提高目标。' : '这个速度超出健康范围，建议拉长时间或降低目标。')),
    predictNav(pts.length > 0),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
        { name: 'target_loss', label: '想减', value: String(v.targetLoss ?? '') },
        { name: 'days_target', label: '天数', value: String(v.daysTarget ?? '') },
      ],
      /* 原说明句尾夹常量名、还拿 `；` 串两条规则（#516 §3.2 D03；`Xkg` 那种占位写法不上屏）。 */
      description: '模拟在自定的天数里减掉想减的重量，需要每天留出多少缺口。每 7700 卡大约对应 1 kg，按这个反推。能不能做到，看每周的掉重落在 0.5 到 1.0 kg 这个安全区间里没有。',
    }), secTitle('sec-params')),
    trackTableCss(),
    pageSection('sec-overview', withVerdictCard(renderKpiGrid([
      { label: '当前', value: String(v.current), unit: 'kg' },
      /* #569 R-11：detail 改总量互补（见本函数头注释）。
       *  #569 R-12：本页结论卡为第 3 格`每周掉重`（报告点名的模拟页结论数量级即 kg/周），
       *  由 `t569SimCss` 统一升档。 */
      { label: '所需缺口', value: String(v.neededDeficit), unit: '卡/天', detail: periodTotal },
      /* W5：值走 `fmtRate`（2 位）——与结论句及同页轨迹同一语义档；「安全区间」那半句已住口径行，卡内不重印。 */
      { label: '每周掉重', value: fmtRate(v.weeklyRate), unit: 'kg/周' },
    ]), verdictCard('可行性', v.feasible
      ? '这个期限赶得上。'
      : slowTarget ? '这个期限赶得偏慢。' : '这个期限赶得偏快。', v.feasible, '可行', '超范围')), secTitle('sec-overview')),
  ];
  /* #569 R-07：两列表传 `restoreHead`（同 cut 页）。 */
  if (pts.length > 0) parts.push(pageSection('sec-track', trackTable(pts, '模拟体重', 'kg', true), secTitle('sec-track')));
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
  }), secTitle('sec-data')));
  parts.push(renderCaliberLine('所需缺口＝用 7700 卡折算要减的重量，再除以天数｜轨迹从窗口最后一天起算，每周一点，末点是第 ' + String(v.daysTarget) + ' 天｜安全区间＝每周掉 0.5 到 1.0 kg'));
  parts.push(sourceFootnote('体重记录与运动记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 模拟减重',
    /* #569 R-10：主标与正文同一间距规则（数字与单位间留半角空格）：`30 天减 2 kg`。
     *  唤醒词原文住 routes.ts 冻结不动；括号仍全角（W5-③）；目标/天数仍在 H1（386:327）。 */
    title: '模拟减重（' + String(v.daysTarget) + ' 天减 ' + String(v.targetLoss) + ' kg）',
    /* #569 R-03 同形延伸：眉题写族名`模拟减重`（chip 第二格为页名，二者 distinct）。 */
    eyebrow: '模拟减重',
    subtitle: null,
    content: pageChromeCss(1120) + t569SimCss() + t573CrossCss() + parts.join(''),
    charts: false, pageUi: true,
  });
}

/* ── #383 · 摄入预测(按当前速率)（日均摄入外推＋目标对照；只改本图会碰到的预测段） ── */

export function buildCalorieForecastDoc(v: CalorieForecast): string {
  const pts = v.forecast ? v.forecast.points : [];
  const span = spanDaysOf(pts);
  const lastV = pts.length > 0 ? (pts[pts.length - 1] as { value: number }).value : null;
  /* #570 R-19：自定义入口身份。路由层只注册了四档horizon（order406–409：7/30/90为按当前速率，
   *  60为自定义），装配层拿不到唤醒词，horizon 60即自定义（注册命令空间内精确成立，非启发）。
   *  H1含`自定义`且与14–16互异；括号仍全角（W5-③）。结论句不动（取数层口径）。 */
  const horizon = v.forecast?.horizonDays ?? 0;
  const isCustom = horizon === 60;
  /* #570 R-27：结论卡detail原印`N 天后`（与H1/结论句同事实，17页`60 天后`真子串）。
   *  改互补事实——与目标的差（渲染层派生，R-06 `diffKg`先例；页上别处未印该差值）。
   *  缺目标时回无数字人话（W6-①硬规矩：非缺值语境不印`—`）。 */
  const gapDetail = (typeof lastV === 'number' && Number.isFinite(lastV)
    && typeof v.goal === 'number' && Number.isFinite(v.goal))
    ? (lastV >= v.goal
      ? '比目标高 ' + fmtKcal(lastV - v.goal) + ' 卡'
      : '比目标低 ' + fmtKcal(v.goal - lastV) + ' 卡')
    : '按当前趋势';
  const parts: string[] = [
    predictChips('摄入预测'),
    /* 结论只给判定不复述数（末点预测值／目标两数住卡；`目标`一词保留，383 针住它；
     *  #625 A团）。W5 有效位口径不变：卡内末值与目标仍走 `fmtKcal`（整数）。 */
    renderConclusionBar(lastV === null
      ? '这一段的摄入还不够算预测。'
      : v.goal === null || v.goal === undefined
        ? '按当前速率，' + span + ' 天后继续保持当前节奏（还没有设目标，先去定目标）。'
        : (typeof lastV === 'number' && typeof v.goal === 'number' && lastV >= v.goal)
          ? '按当前速率，' + span + ' 天后能达到目标一带。'
          : '按当前速率，' + span + ' 天后离目标还差一些。'),
    /* #570 R-15：轨迹项改`摄入预测轨迹`（与表注前6字一致，模拟族仍缺省`模拟轨迹`）。 */
    predictNav(pts.length > 0, '摄入预测轨迹'),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
        { name: 'horizonDays', label: '预测天数', value: String(v.forecast?.horizonDays ?? '') },
      ],
      /* 原说明那句 `；` 改写成两句（#516 §3.2 D03：该处要换形状，不是删标点）。 */
      description: '按最近的摄入趋势往后推每天会吃多少。摄入记录不到 14 天就只说数据不够，不编预测。',
    }), secTitle('sec-params')),
    pageSection('sec-overview', renderKpiGrid([
      { label: '当前摄入', value: String(v.current), unit: '卡', detail: '日均' },
      { label: '目标', value: String(v.goal ?? '—'), unit: '卡' },
      { label: '日变化', value: String(v.dailyRate ?? '—'), unit: '卡/天' },
      /* 摄入量是**整数语义**的读数（卡路里不印小数），故这一页的数值不动有效位；
       * 只有外推末值走 `fmtKcal`（它自带两位小数，与同排的整数不齐）。 */
      { label: '摄入预测', value: fmtKcal(v.forecast?.points[v.forecast.points.length - 1]?.value), unit: '卡', detail: gapDetail },
    ]), secTitle('sec-overview')),
  ];
  if (pts.length > 0) {
    const shown = pts.slice(0, 14);
    const cut = pts.length > shown.length ? '（仅列前 14 点，共 ' + pts.length + ' 点）' : '';
    /* W5：摄入轨迹表也套 `.tpd-track-table`（窄档那三条规则对三列表同样只压掉「日期」那半个标签，
     * 列数多时体重／区间两列的标签仍逐行出现——窄档不叠列、不横滑）。
     * #570 R-16/R-17：再套 `.tpd-track-table--cols3` 纯标记（三列表堆叠＋列宽按内容，见`t570IntakeCss`）。 */
    parts.push(trackTableCss());
    parts.push(pageSection('sec-track', '<div class="tpd-track-table tpd-track-table--cols3">' + renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'intake', label: '预测摄入', align: 'right' },
        { key: 'band', label: '预计区间', align: 'right' },
      ],
      /* #570 R-18：零宽区间折叠为单值（首行残差为零时`lo/hi`同值）。按**格式化后**字面判等
       * （裸值差半卡内也会印成同字，判裸值会漏折）；右缘本就共线（右对齐，CDP极差0），折叠后保持。 */
      rows: shown.map((p) => {
        const loS = fmtKcal(p.lo);
        const hiS = fmtKcal(p.hi);
        return { date: p.date, intake: fmtKcal(p.value), band: loS === hiS ? fmtKcal(p.value) : loS + ' 至 ' + hiS };
      }),
      caption: '摄入预测轨迹（共 ' + span + ' 天，每周一点' + cut + '）',
      emptyText: '这一段还没有饮食记录，先记一餐再来看',
    }) + '</div>', secTitle('sec-track', '摄入预测轨迹')));
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
  }), secTitle('sec-data')));
  parts.push(renderCaliberLine('摄入＝按最近的趋势线往外推｜预计区间按摄入残差向外放宽，取 95% 置信带｜摄入记录不到 14 天不出预测'));
  parts.push(sourceFootnote('饮食记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 摄入预测',
    /* #570 R-19：自定义入口 H1 带身份（见函数头 `isCustom`；14–16仍按当前速率）。 */
    title: isCustom
      ? '摄入预测（自定义 ' + String(v.forecast?.horizonDays ?? '') + ' 天）'
      : '摄入预测（按当前速率 ' + String(v.forecast?.horizonDays ?? '') + ' 天）',
    eyebrow: '趋势分析',
    subtitle: null,
    /* #569 R-12/R-13（09–16，含本页 14–16）：结论卡`摄入预测`升档＋卡内距 16px（`t569ForecastCss`）。
     *  三列表不动（R-16 归 #570）；本改动只增益，#570 可在其上继续。
     * #570 R-16/R-17/R-20/R-21：本族网格两列＋三列表堆叠＋列宽＋徽章升格（`t570IntakeCss`）。 */
    content: pageChromeCss(1120) + t569ForecastCss() + t570IntakeCss() + t573CrossCss() + parts.join(''),
    charts: false, pageUi: true,
  });
}

/* ── #383 · 摄入预测(营养目标达成预测)（均值／目标／缺口／是否在轨；只改预测段） ── */

export function buildCalorieGoalDoc(v: CalorieGoalEta): string {
  /* #570 R-26：`缺口`卡值是相对目标的差（avg−goal），页上别处未点名该口径。detail 补限定词
   * `相对目标 N 卡`（与该卡数值一一对应；徽标`在轨/偏离`不进detail，W5-①仍绿）。 */
  const gapBasis = (typeof v.goal === 'number' && Number.isFinite(v.goal))
    ? '相对目标 ' + fmtKcal(v.goal) + ' 卡' : '相对目标';
  const parts: string[] = [
    /* #625 A团：去第三枚胶囊（与眉标逐字重复）；结论改综合不断复述数
     * （均值／目标／缺口三数住卡，结论只留判定；`目标`／`在轨`两词保留，383 针住它们）。 */
    predictChips('摄入预测', true),
    renderConclusionBar(v.onTarget
      ? '这段的日均摄入守在营养目标 ±10% 以内，在轨。'
      : '这段的日均摄入偏离营养目标较多，偏离。'),
    predictNav(false),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
      ],
      /* #570 R-27：原说明与口径行同义（10%两处、14天两处）。说明只讲做法与缺数分支，
       * 阈值与判据归口径行（`达标线＝…10%`），两处不再互为子串。 */
      description: '看每天的摄入能不能守在营养目标上。摄入记录不到 14 天就只说数据不够，够 14 天才给判定。',
    }), secTitle('sec-params')),
    pageSection('sec-overview', withVerdictCard(renderKpiGrid([
      { label: '均值', value: String(v.avg), unit: '卡' },
      { label: '目标', value: String(v.goal), unit: '卡' },
      { label: '缺口', value: String(v.gap), unit: '卡', detail: gapBasis },
    ]), verdictCard('是否在轨', v.onTarget
      ? '日均与目标差得不远。'
      : '日均摄入离目标偏开。', v.onTarget, '在轨', '偏离')), secTitle('sec-overview')),
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
  }), secTitle('sec-data')));
  parts.push(renderCaliberLine('目标＝每天的热量目标｜达标线＝日均偏离不超过目标的 10%｜摄入记录不到 14 天不出判定'));
  parts.push(sourceFootnote('饮食记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 摄入预测',
    title: '摄入预测（营养目标达成预测）',
    eyebrow: '趋势分析',
    subtitle: null,
    /* #570 R-20/R-21：本族网格两列＋判定徽章升格（`t570IntakeCss`；判定卡不增值位，W6-①仍绿）。 */
    content: pageChromeCss(1120) + t570IntakeCss() + t573CrossCss() + parts.join(''),
    charts: false, pageUi: true,
  });
}

/* ── #383 · 摄入预测(卡路里缺口预测)（平均缺口＋每周掉重；只改预测段） ── */

export function buildCalorieDeficitDoc(v: CalorieDeficitEta): string {
  /* #570 R-23：缺口取正向表述（结论句本就`+1196`，卡值跟上`+`前缀；量级与整数语义不动）。
   *  体重侧不跟R-23期望的负号统一（`weeklyLoss`正表掉量是取数层语义，翻负会造出页内自相矛盾，
   *  见§6），改由口径行写明两族符号语义（#625 A团起结论句不再印数，`+` 前缀只住卡值）。 */
  const deficitSigned = (typeof v.avgDeficit === 'number' && Number.isFinite(v.avgDeficit))
    ? (v.avgDeficit >= 0 ? '+' : '') + String(v.avgDeficit) : String(v.avgDeficit);
  const parts: string[] = [
    /* #625 A团：去第三枚胶囊；结论改综合不断复述数（`缺口`／`每周`两词保留，383 针住它们）。 */
    predictChips('摄入预测', true),
    renderConclusionBar((Number(v.avgDeficit) >= 0 ? '这段时间平均每天都有缺口，折到每周掉重，处减重方向。' : '这段时间平均每天还没有缺口，每周掉重无从谈起。')),
    predictNav(false),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
      ],
      /* #570 R-27：原说明与口径行同义（缺口定义两处、7700两处）。说明只讲做法，
       * 定义与折算归口径行，两处不再互为子串。 */
      description: '按最近的饮食与运动趋势，推后面每天能留出多少缺口，折算一周能掉多少。',
    }), secTitle('sec-params')),
    pageSection('sec-overview', renderKpiGrid([
      /* #570 R-26：该卡是相对消耗的差（消耗−摄入），detail 补限定词与数值一一对应。 */
      { label: '平均缺口', value: deficitSigned, unit: '卡/天', detail: '相对消耗，正数是缺口' },
      /* W5：卡内只留一条事实——`健康区间 0.3 到 1.2 kg/周` 已由同页口径行末段承担
       * （「健康区间＝每周掉 0.3 到 1.2 kg」；W6 起同页单位统一成 `kg`，不再有「公斤」那一形态），
       * 卡里再印一遍就是「同一事实在卡内出现两次」，
       * 且它与主值 1.09 是同一量纲却不同有效位（视觉抽查 §2.3 缺陷 3 的原句）。 */
      { label: '每周掉重', value: fmtRate(v.weeklyLoss), unit: 'kg/周' },
    ]), secTitle('sec-overview')),
  ];
  parts.push(pageSection('sec-data', dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({ avg_deficit: v.avgDeficit, weekly_loss: v.weeklyLoss }),
      },
    },
  }), secTitle('sec-data')));
  parts.push(renderCaliberLine('缺口＝日常消耗加运动消耗减当天摄入｜每 7700 卡大约折算 1 kg｜健康区间＝每周掉 0.3 到 1.2 kg｜符号＝缺口取正数表示缺口，每周掉重取掉量为正，体重速率页另取变化率为负表示下降'));
  parts.push(sourceFootnote('饮食记录与运动记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 摄入预测',
    title: '摄入预测（卡路里缺口预测）',
    eyebrow: '趋势分析',
    subtitle: null,
    /* #570 R-20：本族网格两列（`t570IntakeCss`）。 */
    content: pageChromeCss(1120) + t570IntakeCss() + t573CrossCss() + parts.join(''),
    charts: false, pageUi: true,
  });
}

/* ── #383 · 摄入预测(摄入稳定性预测)（均值／波动＋是否稳定；只改预测段） ── */

export function buildCalorieStabilityDoc(v: CalorieStability): string {
  /* #570 R-24：本页`均值`与缺口页`日均摄入`窗口不同（30天窗 vs 7天窗）而都不带窗口。
   *  缺口页只读（#571地盘），本页均值卡detail补窗口区间（可达文本含窗口；21侧待#571，见§6）。 */
  const avgWindow = '日均，窗口 ' + String(v.start ?? '') + ' 至 ' + String(v.end ?? '');
  const parts: string[] = [
    /* #625 A团：去第三枚胶囊；结论改综合不断复述数（`稳定`／`波动`两词保留，383 针住它们）。 */
    predictChips('摄入预测', true),
    renderConclusionBar(v.stable ? '每天的摄入比较匀，波动不大，整体稳定。' : '每天的摄入忽高忽低，波动偏大，不稳定。'),
    predictNav(false),
    pageSection('sec-params', renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
      ],
      /* #570 R-27：原说明与口径行同义（300卡判据两处）。说明只讲做法与缺数分支，
       * 阈值归口径行（`判据＝…300 卡算稳`），两处不再互为子串。 */
      description: '看每天的摄入稳不稳定。摄入记录不到 14 天就只说数据不够，够 14 天才给判定。',
    }), secTitle('sec-params')),
    pageSection('sec-overview', withVerdictCard(renderKpiGrid([
      { label: '均值', value: String(v.avg), unit: '卡', detail: avgWindow },
      /* σ 是统计符号，读者认不得：这一格就说「上下波动的幅度」（口径在同页的口径行里）。 */
      { label: '波动', value: String(v.sigma), unit: '卡', detail: '上下波动的幅度' },
    ]), verdictCard('是否稳定', v.stable
      ? '每天的摄入比较匀。'
      : '每天的摄入忽高忽低。', v.stable, '稳定', '波动大')), secTitle('sec-overview')),
  ];
  parts.push(pageSection('sec-data', dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({ avg: v.avg, sigma: v.sigma, stable: v.stable ? 1 : 0 }),
      },
    },
  }), secTitle('sec-data')));
  parts.push(renderCaliberLine('波动＝每天摄入偏离日均的幅度（标准差）｜判据＝上下波动不超过 300 卡算稳｜摄入记录不到 14 天不出判定'));
  parts.push(sourceFootnote('饮食记录', String(v.start ?? ''), String(v.end ?? '')));
  return assembleDocPage({
    docTitle: '卡路里 摄入预测',
    title: '摄入预测（摄入稳定性预测）',
    eyebrow: '趋势分析',
    subtitle: null,
    /* #570 R-20/R-21：本族网格两列＋判定徽章升格（`t570IntakeCss`；判定卡不增值位，W6-①仍绿）。
     * #625 A团再加本页末格补齐（`t625StabilityCss`，只本页）。 */
    content: pageChromeCss(1120) + t570IntakeCss() + t625StabilityCss() + t573CrossCss() + parts.join(''),
    charts: false, pageUi: true,
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
      /* 区间写「至」（#516 判据 R6：值位不许拿 `~` 顶替「至」）；W5 顺手统一这一处。 */
      { label: '目标', value: String(v.targetKg), unit: 'kg', detail: v.start + ' 至 ' + v.end },
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '预计达成', value: v.eta, detail: '剩余 ' + v.daysLeft + ' 天' },
      /* W5（同族 06／07／10 的同一处）：判定词上屏一次。速率值走 `fmtRate`（2 位）；
       * 原来挂在 `detail` 的「健康／超范围」改由徽标承担（闭集档带语义色）。 */
      { label: '速率', value: fmtRate(v.ratePerWeek), unit: 'kg/周', status: v.feasible ? 'ok' : 'warn',
        statusText: v.feasible ? '健康' : '超范围' },
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
    charts: false, pageUi: true,
  });
}
