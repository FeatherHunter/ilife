/** #336 融合 · 波动页整页装配（`calorie.view.volatility` 一命令两读法共一份页）。
 *
 * 口径正本：`docs/skills/skill-calorie/t154-体重页面-老新融合规范.md` §5 七组。
 * 老实物出处（改写理由逐条对齐，行号经 t154 本轮盘点核对）：
 * - 阈值黄／红线进图且只画量程内：`weight_history.html:238-240`、`:275-278`（目标线同族做法）；
 * - 量程最小跨度＋上下留白，算式在取数层一处、页面只传：`weight_review.html:104-110`、
 *   `weight_dashboard.html:112-118`（本件把它落在同目录 `plate.ts:99` 的 `weightCurvePlan`）；
 * - 样本不足＝页顶软横幅、照常出页：`weight_compare.html:79`、`:132-136`；
 * - 空态两种（数据型／成功型）：`weight_history.html:300-304`、`weight_volatility_v2.html:254-256`；
 * - 复制双钮＋日志六段：`公共组件/assets/base.js:301-320`；
 * - 指标算好写进复制文本、缺值不当 0：`goal_weight.html:188-192`。
 *
 * 本页不吃老实物三项短板：手写 canvas／Y 轴无数值／单点口径分歧
 * （`weight_volatility_v2.html` 全篇 `<canvas>`；6 张全部没传 `yTicks`；两页单点一个出图一个不出）。
 *
 * **#504 形状化与手机端（负责人 2026-09-15 第 1／2／5 条；口径正本 `.scratch/t154/text-review/口径-UI.md`）**：
 * 与同型先例 `src/render/reviewDocsCss.ts` 件头同口径——**手机端照 HELP（断点 820，四条手法：触摸目标
 * ≥44px＋`-webkit-tap-highlight-color:transparent`＋`touch-action:manipulation`／窄屏横向塌纵向／
 * 收紧内距），正文里不许再用 `·`／`；` 把好几件事串成一句话**。本页四处落法：
 *   - 波动带卡副说明（**本族的样板**）`警戒线 ±… kg · 注意线 ±… kg · 波动幅度 … kg` → 两条线一对
 *     （`factStrip(…, true, true)` 竖排）＋ 另一件「波动幅度」（`gap` 空一行）；
 *   - 近期异常卡副说明 `超过注意线 0 天 · 超过警戒线 5 天` → `factStrip()` 两条各自成形；
 *   - 结论块正文 `判语；今天那条读数。` → `verdict(判语)` ＋ `note(今天那条读数)`（两件块级元素，
 *     故 `renderDisclosure` 的 `contentHtml` **不再套 `<p>`**）；
 *   - `weightUiCss()` 放进本页（含空态那一页）`parts` 第一项。
 *  允许保留：`<title>卡路里·体重</title>`（全仓 58 页逐字同一处品牌名）、页脚口径行的 `｜`、日期区间的 `~`、
 *  复制载荷（`异常明细` 用 `｜`／`；` 分列）与命令原文（机器面）。
 *
 * #510 设计视角审查整改（同屏事实收敛，只动文本与装配，结构未动）：
 *   · 「波动带」卡撤掉指路牌副行（「两条线各是多少，看这张卡下面那条」）⇒ 无副行的纯指标卡；
 *     徽章由 11 字的句子（「这两条线按本窗数据算」）收到 4 字状态词（「本窗算出」）；
 *   · 「平均线」卡满窗时不再报「7/7 天有记录」（那个数同屏三处）；异常表表题不再写「近 7 天」。
 */
import { renderCaliberLine, renderChartBlock, renderDataTable, renderDisclosure, renderKpiGrid } from 'base-paint/blocks';
import type { DataTableColumn, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import { DB_FILENAME } from '../paths.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';
import { weightCurvePlan } from './plate.js';
import type { VolatilityView } from './plate.js';
import { anomalyReason, baselineDeltaText, deviationText, volatilitySummary } from './volatility.js';
import type { VolatilityV2, VolatilityViewMode, VolLevel } from './volatility.js';
import { bulletList, factStrip, note, verdict, weightUiCss, windowStrip } from './weightUi.js';

const CMD_KEY = 'calorie.view.volatility';
/** 复制日志第 3 段后半（哪张库／哪个窗口）。 */
const COPY_SOURCE = DB_FILENAME + ' ｜ 体重记录（本窗体重波动）';

/** 渲染本页的命令原文（复制日志第 3 段）：照抄可重跑。 */
export function volatilityCommandOf(params: Record<string, unknown>): string {
  return 'calorie-cmd-read ' + CMD_KEY + ' --params \'' + JSON.stringify(params) + '\'';
}

/** 缺值统一「—」（页上可见文本的占位符；**不进复制载荷**，见 `t395-融合基准.md` 裁定 2）。
 *  本页 KPI／表格的数都由算式层保证在场；这一份留给后续补位用，别把 `—` 写进载荷。 */
const MISSING = '—';
/** 档位词：数据层的 `normal`／`yellow`／`red` 不动，只在显示层翻成这一套词（全页同一套）。
 *  #485：颜色词（黄／红）换成线的名字——与卡副说明、表列、结论句同词，读者不用在两种记法间翻译。 */
const LEVEL_WORD: Readonly<Record<VolLevel, string>> = { normal: '正常', yellow: '注意', red: '警戒' };
/** σ 要有像样的对照至少要 3 个点（与 `volatility.ts` 的 `rollingSigma7d`／`fullDetrendedSigma` 门槛同值）。 */
const SAMPLE_MIN = 3;

const levelWord = (l: VolLevel): string => LEVEL_WORD[l] ?? MISSING;

/** 结论句（唯一形态：`renderDisclosure({title:'结论'})` 的正文）。
 *  不含「结论：」前缀——折叠区标题已经是「结论」。
 *  #485：`标准差／档位／σ` 全换人话——波动幅度（只归卡②）／「比平均线高多少，越没越线」。
 *  （D1）这里原来还挂一句「（波动幅度趋势 N 个点）」——那个词与卡②说明撞名（一屏两义），
 *  且趋势点数读者在图②题上一眼看得到，故删；结论只留判决与「有没有越线」。
 *  `only`（只看异常点读法）本来就没有那两句，照旧。
 *
 *  #504 形状化：正文原来是一句 `A；B。`——**两条判决串在一句里**（`；` 顶替了设计），
 *  且 B 那条（今天比平均线高多少／越没越线）与「今日偏离」卡说的是同一件事。
 *  现在拆成两件各自成形的元素（口径 §二「结论句里的 `；` 串 → 一句话判语，其余事实本就住在卡片里」）：
 *    - `verdict(volatilitySummary(o))`：**判语**（体重稳不稳 ＋ 整体离散度 ＋ 近期越线天数），一句话；
 *    - `note(预警读数)`：今天这一条**读数**（日期 ＋ 当日体重 ＋ 偏离多少 ＋ 越没越线），
 *      用句号收尾成一行小字——它是「结论」这一块里对今天那句判语的落点，不是第二句判语。 */
function volatilityConclusion(o: VolatilityV2, only = false): string {
  const s = volatilitySummary(o);
  if (only || o.points.length === 1) return verdict(s + '。');
  const level = o.earlyWarning.level;
  const tail = level === 'red' ? '，超过警戒线' : level === 'yellow' ? '，超过注意线' : '，在正常范围内';
  const todayText = o.earlyWarning.date + ' ' + o.earlyWarning.kg + ' kg '
    + baselineDeltaText(o.earlyWarning.deviationKg) + tail + '。';
  return verdict(s + '。') + note(todayText);
}

/** 复制载荷（`stat` 形，键写中文）：页上读数 ＋ 异常明细整表 ＋ 结论原句。
 *  数字经 `metricsOf` 冻结投影（§4#5：页上看到的数＝复制出去的数，缺值不当 0）。 */
function volatilityCopyPayload(o: VolatilityV2): SerializableEnvelope {
  const nums = metricsOf({
    '基线kg': o.baselineValue, '基线σkg': o.baselineSigma,
    '黄线kg': o.thresholds.yellow, '红线kg': o.thresholds.red,
    '窗口天数': o.days, '有记录天数': o.warnDays, '缺口天数': o.days - o.warnDays,
    '点数': o.points.length, 'σ趋势点数': o.sigmaTrend.length,
    '近期异常数': o.recentAnomalies.length,
    '最新偏离kg': o.earlyWarning.deviationKg,
  });
  const metrics: Record<string, number | string | null> = {
    ...nums,
    '基线口径': o.baselineToggleLabel,
    '基线模式': o.baselineMode,
    '预警档位': levelWord(o.earlyWarning.level),
    '预警日': o.earlyWarning.date,
    '结论': volatilityConclusion(o),
    '异常明细': o.recentAnomalies.length === 0
      ? '无'
      : o.recentAnomalies.map((p) => [p.date, String(p.kg) + ' kg', deviationText(p.deviationKg) + ' kg',
        levelWord(p.level), anomalyReason(p)].join(' ｜ ')).join('；'),
  };
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: CMD_KEY, data: { metrics },
  } as unknown as SerializableEnvelope;
}

/** 表列口径一处定义（整图面与只看异常点面共用一张表，不各抄一份）。 */
const ANOMALY_COLUMNS: DataTableColumn[] = [
  { key: 'date', label: '日期' },
  { key: 'kg', label: '体重', align: 'right' },
  { key: 'dev', label: '偏离平均线', align: 'right' },
  { key: 'level', label: '级别' },
  { key: 'reason', label: '原因' },
];

/** 异常表（两面同一份：标题与空态句随读法变，列与行不变）。 */
function anomalyTable(o: VolatilityV2, view: VolatilityViewMode): string {
  const only = view === 'anomalies-only';
  return renderDataTable({
    columns: ANOMALY_COLUMNS,
    rows: o.recentAnomalies.map((p) => ({
      date: p.date, kg: String(p.kg) + ' kg', dev: deviationText(p.deviationKg) + ' kg',
      level: levelWord(p.level), reason: anomalyReason(p),
    })),
    /* #510：表题不再写「近 7 天」（审查席 S2 第三类：那个 `7 天` 与「近期异常」卡副说明、结论判语
     * 同屏三处）——这一张表列的就是近 7 天的异常点，卡副说明已经写着「近 7 天越线的天数」。 */
    caption: only
      ? '波动异常点（共 ' + o.recentAnomalies.length + ' 个）'
      : '异常点（共 ' + o.recentAnomalies.length + ' 个，超过波动带的点）',
    emptyText: '近期没有异常点（平均线 ' + o.baselineValue + ' kg）',
  });
}

/** 四张 KPI 卡与徽章：状态词只在这里出现一次，档位词恒取 `LEVEL_WORD`。
 *  两种读法（整图／只看异常点）共用同一组卡——#485 之后卡面不再引趋势点数，故不收读法参数。
 *
 *  **值槽只放一个数与单位**（t154 用户读数：值槽里塞长文本或颜色词，卡会被断行撑高、四张不等高）：
 *  ① 平均线值进值槽，线是什么线由页副标题（`以…为参照`）一处说清，卡副说明只报记录齐不齐；
 *  ② 波动带卡的值槽放**警戒线**那一个数，注意线的数与波动幅度进 `detail`（值槽里的数由 `detail` 认领）；
 *  ③ 今日偏离卡放「当前偏离」这个数（带符号），越没越线交给徽章与副说明。
 *
 *  #485 文本审查：①`波动分析` 卡名与页标题同字（冗余）→`平均线`；②`阈值／黄线／红线／σ` 全换人话；
 *  ③徽章只留状态（没有漏记／记录不齐／兜底值／没越线），不再抄副说明的数字。
 *  #485 对抗审查整改（D1）：**「波动幅度」全页只许出现在卡②说明这一处**（＝值槽那个 σ），
 *  别处一律用它自己的名字（图②题＝「去掉涨跌后的波动」）；结论句那个标准差与这里同值，两处同一个数。
 *  （D5）（D6）：徽章措辞改成读者动作词——`没越线`／`没有漏记`。 */
function kpiCards(o: VolatilityV2): KpiCardInput[] {
  const single = o.points.length === 1;
  const gap = o.days - o.warnDays;
  const level = o.earlyWarning.level;
  const yellowN = o.recentAnomalies.filter((a) => a.level === 'yellow').length;
  const redN = o.recentAnomalies.filter((a) => a.level === 'red').length;
  return [
    {
      label: o.baselineMode === 'goal' ? '目标体重' : '平均线', value: String(o.baselineValue), unit: 'kg',
      /* #510：满窗时原写「7/7 天有记录」——那个 `7 天` 与副标题（「以近 7 天平均体重为参照」）、
       * 「近期异常」卡副说明（「近 7 天越线的天数」）同屏三处（审查席实测的 ★ 条数项）。
       * 每天都有记录时不报这个数（读数就是全窗天数，副标题已有），有缺口时照实报「N/M 天（缺 K 天）」。 */
      detail: o.warnDays >= o.days
        ? '每天都有记录'
        : o.warnDays + '/' + o.days + ' 天有记录' + (gap > 0 ? '（缺 ' + gap + ' 天）' : ''),
      status: single ? 'empty' : gap > 0 ? 'warn' : 'ok',
      statusText: single ? '只有一天' : gap > 0 ? '记录不齐' : '没有漏记',
    },
    {
      /* #504 形状化（本族的样板处）：这一条副说明原来是**三件事串一行**
       * （`警戒线 ±… kg · 注意线 ±… kg · 波动幅度 … kg`）——`·` 顶替了设计。
       *
       * **三个数不留在卡里**：`renderKpiCard` 的 `detail` 槽吃**纯文本**（公共层 `esc(detail)`，
       * `blocks.ts:543`——形状词汇的 HTML 进那一槽会被转义成字面标签），故三个数改住卡下那条
       * `thresholdStrip()`（块级件，形状真出得来）。卡内只留**这一槽非说不可**的一句：
       * 注意线的数与波动幅度已由那条条子认领，值槽那个数（警戒线）由条子里的同名列认领——
       * 同一组数字不在两处各印一遍（口径 §三 第 2 条）。
       *
       * #510（审查席 S3）：那一句原来是**指路牌**（「两条线各是多少，看这张卡下面那条」）——
       * 事实已被移出卡、再叫读者去别处看 ⇒ 撤掉整条副说明，这张卡改成**无副行的纯指标卡**
       * （值槽 ＋ 徽章 ＋ 卡下那条条子，各说一件事）。 */
      label: '波动带', value: '±' + o.thresholds.red, unit: 'kg',
      /* 只有 1 个点、或点数不到门槛时，波动幅度取兜底值 0.5，两条线不是从本窗数据推出来的——徽章要如实说。
       * #510：徽章原来是 11 字的句子（「这两条线按本窗数据算」，审查席 S3：胶囊只装 2～4 字状态词）
       * ⇒ 收到 4 字状态词；「按本窗数据算」这层意思由这一个词承担，不再另起一句。 */
      status: single || o.sigmaTrend.length === 0 ? 'warn' : 'ok',
      statusText: single || o.sigmaTrend.length === 0 ? '兜底值' : '本窗算出',
    },
    {
      label: '今日偏离', value: deviationText(o.earlyWarning.deviationKg), unit: 'kg',
      detail: o.earlyWarning.message,
      status: level === 'red' ? 'danger' : level === 'yellow' ? 'warn' : 'ok',
      statusText: levelWord(level),
    },
    {
      /* #485：只说「近 7 天里有几天越了哪条线」——异常点按近 7 天取（`cutoff`），
       * 写成「共 N 点」会被读成本窗全覆盖（90／180 天窗口尤其误导）。
       * #504 形状化：原来那一句用一个 `·` 把两条线各几天串在一行
       * （`近 7 天：超过注意线 0 天 · 超过警戒线 5 天`）——两条事实各自落卡下那条条子
       * （`wui-strip` 的「标签 ＋ 值」，与 `阈值` 那条同形）；卡内这一格只说「这一格数的是什么」。
       * `近 7 天` 收进标签里说全（原来靠行首那一句管住整行，拆条之后每条得自己说全）。 */
      label: '近期异常', value: String(o.recentAnomalies.length), unit: '个',
      detail: '近 7 天越线的天数',
      status: o.recentAnomalies.length === 0 ? 'ok' : redN > 0 ? 'danger' : 'warn',
      statusText: o.recentAnomalies.length === 0 ? '没越线' : '有异常点',
    },
  ];
}

/** 卡下那条「两条线各是多少 ＋ 本窗波动幅度」（#504 形状化；本族的样板处）。
 *
 *  原来这三件事是**卡②副说明里的一行 `·` 串**（`警戒线 ±0.098 kg · 注意线 ±0.073 kg ·
 *  波动幅度 0.049 kg`）——`·` 顶替了设计。现在各自成形：**同一行三枚「标签 ＋ 值」**（`factStrip`），
 *  波动幅度一枚、两条线各一枚——线的名字与值成对，读者不用自己认哪个数是哪条线；
 *  窄屏由 ③ 塌成一列，一屏一行一件事（桌面 1200 截图实测：改成竖排会把标签与值拉到 960px 的两头，
 *  中间空空荡荡、读不成对，故这一条保持横排）。
 *  条子放在 KPI 网格**之后**：卡片的值槽在网格上，条子回答的是「这些卡里的线各是多少」——
 *  一屏同一事实只留一处（口径 §三 第 2 条），故卡内不再重印这三个数。 */
function thresholdStrip(o: VolatilityV2): string {
  return factStrip([
    { k: '波动幅度', v: o.baselineSigma + ' kg' },
    { k: '注意线', v: '±' + o.thresholds.yellow + ' kg' },
    { k: '警戒线', v: '±' + o.thresholds.red + ' kg' },
  ]);
}

/** 偏离折线：**量程把两条线也算进去**（算进去才画得住，§2 第 1 条「不许画了读不到」），
 *  `markLine` 只画警戒线那一条主阈值（图表契约一次只收一条水平线），注意线的数在波动带卡里读。
 *  #485：图题里的两个阈值数字删掉（同一组数字在波动带卡、图上标注各一处已够）——图题只说这张图在问什么。 */
function deviationChart(o: VolatilityV2): string {
  const budget = o.thresholds.red > 0 ? o.thresholds.red : 0.5;
  const plan = weightCurvePlan(o.points.map((p) => p.deviationKg), budget);
  return renderChartBlock({
    kind: 'line',
    title: '每天离平均线多远',
    input: {
      items: o.points.map((p) => ({
        label: p.date.slice(5), value: p.deviationKg, anomaly: p.level !== 'normal',
      })),
      options: {
        labels: 'select',
        yTicks: plan.yTicks,
        yMin: plan.yMin,
        yMax: plan.yMax,
        format: (n: number): string => (n > 0 ? '+' : '') + n.toFixed(1) + ' kg',
        showDots: true,
        height: 180,
        markLine: {
          value: o.thresholds.red, color: '#ff3b30',
          label: '警戒线 ±' + o.thresholds.red + ' kg',
        },
        emptyText: '本窗无体重记录',
      },
    },
  });
}

/** 波动幅度折线：量程只按波动幅度序列算（两条线不属于这张图的量程），刻度恒显式给。
 *  #485 对抗审查整改（D1）：**图题不许再叫「波动幅度」**——那个词在本页只归卡②的那一个数
 *  （`baselineSigma`）；本图画的是「去掉一天到另一天的涨跌之后还剩多少波动」（窗口内 σ 逐步值），
 *  同一屏里若两处都叫「波动幅度」，读者当成同一个量就会撞见 0.049 与 0.10 两个数。 */
function sigmaChart(o: VolatilityV2): string {
  const plan = weightCurvePlan(o.sigmaTrend.map((s) => s.sigmaKg), null);
  return renderChartBlock({
    kind: 'line',
    title: '去掉涨跌后的波动',
    input: {
      items: o.sigmaTrend.map((s) => ({ label: s.dateStart.slice(5), value: s.sigmaKg })),
      options: {
        labels: 'select',
        yTicks: plan.yTicks,
        yMin: plan.yMin,
        yMax: plan.yMax,
        format: (n: number): string => n.toFixed(2) + ' kg',
        showDots: true,
        height: 180,
        emptyText: '记录太少，画不出这张波动曲线（每段时间至少 ' + SAMPLE_MIN + ' 条记录才看得出差别）',
      },
    },
  });
}

/** 页脚数据来源行（§5.5：哪张库／哪个窗口／多少条；有缺口当场注明，缺的天不补 0）。
 *  形态走公共层 #420 的浅色口径行 `renderCaliberLine`：页脚来源是「口径行」不是提示，
 *  故不用深色 toast 卡（#340 裁定）。
 *  #485：句式与全族统一（`口径.md` §3.1）——全角冒号、库表名进括号、三段用 `｜` 分、末段恒报量（条数位「共 N 条」／天数位「共 N 天有记录」，#588）；
 *  「体重记录」是读者话（`weight_log` 只留在括号里的库表名与复制日志第 4 段）。 */
function sourceLine(o: VolatilityV2, start: string, end: string): string {
  const gap = o.days - o.warnDays;
  // #485 对抗审查整改（裁定 F）：页脚只留人话来源——库表名（`calorie_data.db`／`weight_log`）退出可见面，
  // 机器面照旧住复制日志第 4 段（`COPY_SOURCE`，那两句是两处字符串，别合并）。
  return renderCaliberLine('📊 数据来源：体重记录 ｜ 窗口 ' + start + ' ~ ' + end
    + ' ｜ 共 ' + o.warnDays + ' 天有记录'
    + (gap > 0 ? ' ｜ 缺 ' + gap + ' 天没记' : ''));
}

/** 页顶前提提示（§5.6：记录太少不拒绝渲染，走 `warn` 写清「几条／门槛几条／为什么仍可看」）。
 *  #485：`样本／σ／阈值／兜底值` 换人话（记录太少／两条线／兜底值）。
 *  （D1）兜底那一句只说「它们取兜底值 0.5 kg 档」，不再把兜底值也叫「波动幅度」——
 *  那个词在本页只归卡②的那一个数（本窗 σ）。 */
function premiseNotice(o: VolatilityV2): string | null {
  if (o.points.length === 0) return null;
  if (o.points.length === 1) {
    return notice({
      title: '记录太少', icon: 'warn',
      msg: '本窗只有 1 条体重记录：平均线就是这一条读数，离平均线的距离必然是 0；波动与两条线取兜底值 '
        + '0.5 kg 档，照常出页，但一天看不出趋势。',
    });
  }
  if (o.sigmaTrend.length === 0) {
    return notice({
      title: '记录太少', icon: 'warn',
      msg: '本窗只有 ' + o.warnDays + ' 天有记录，少于 ' + SAMPLE_MIN
        + ' 天：曲线与异常表照常给，但这张波动曲线画不出来，两条线用兜底值读，当参考值看。',
    });
  }
  return null;
}

/** 整页装配（`full` 与 `anomalies-only` 共一份：点进来只剩异常点的理由在页顶一句话说清）。
 *  读法与老脚本同口径：`anomalies-only` 不出曲线（老脚本 `--view anomalies-only` 语义）。 */
export function buildVolatilityPage(v: VolatilityView, view: VolatilityViewMode, command: string): string {
  const o = v.volatility;
  const only = view === 'anomalies-only';
  // #485 副标题：窗口与条数已由页脚来源行说一处，这里再说一句是百分百冗余；
  // 副标题只留整页唯一的「参照是谁」——`平均线` 这个词后面图表与结论句反复用，头一次见要有人话解释。
  // （只看异常点读法原来那句「本读法只列越阈异常点…」与页顶提示同字，删掉，读法说明只留页顶一处。）
  // #542（#340 打回批）：窗口退出页题（H1），改住正文首件 `windowStrip()`（两枚日期块 ＋ 条数胶囊），
  // 与页脚来源行各一处；副标题只留参照句。
  const subtitle = '以' + o.baselineToggleLabel + '为参照';
  /* `weightUiCss()` 恒为正文第一项（口径 §二：形状词汇的样式住 `weightUi.ts` 一处，
   *  `assembleDocPage` 没有页内 CSS 入口，故由整页装配把它带进来）。空态那一页同样先带它。 */
  const parts: string[] = [weightUiCss()];
  if (o.points.length > 0) {
    parts.push(windowStrip(v.start, v.end, '共 ' + o.warnDays + ' 天有记录'));
  }
  if (o.points.length === 0) {
    // 数据型空态（§5.6）：页照常是一张完整的页——标题、空态句、页脚来源行、复制区都在。
    parts.push(notice({ title: '本窗无体重记录', icon: 'warn', msg: '窗口 ' + v.start + ' ~ ' + v.end + ' 内没有体重记录，出不了平均线与波动带。' }));
    parts.push(sourceLine(o, v.start, v.end));
    parts.push(copySection(volatilityCopyPayload(o), command));
    return assembleDocPage({
      docTitle: DOC_TITLE,
      title: '波动分析',
      eyebrow: '',
      subtitle,
      content: parts.join(''),
      charts: false,
    });
  }
  if (only) {
    /* 读法说明（#504 形状化）：原来是一句 `…（共 N 个），不出两张曲线图；要看整图请说…`——
     * 一个 `；` 把「这一页有什么」与「要看整图怎么办」两件事串成一句。现在：提示块只报这一页列了点什么，
     * 两条后续说明落 `bulletList()` 逐条成行（本族与复盘族同一个搭法）。 */
    parts.push(notice({
      title: '这一页只看异常点', icon: 'info',
      msg: '这一页只列超过波动带的点（共 ' + o.recentAnomalies.length + ' 个）。',
    }));
    parts.push(bulletList([
      '这一页不出两张曲线图',
      '要看整图，请说「看体重稳不稳（增强版）」',
    ]));
  }
  const premise = premiseNotice(o);
  if (premise !== null) parts.push(premise);
  parts.push(renderKpiGrid(kpiCards(o)));
  /* 卡下那条「两条线各是多少 ＋ 本窗波动幅度」紧跟 KPI 网格（#504）：卡②原来把这三件事串成一行 `·`
   *  塞在副说明里；卡片副说明吃纯文本，形状落不进去 ⇒ 三个数下移到这一条同形的条子上。 */
  parts.push(thresholdStrip(o));
  let charts = false;
  if (!only) {
    parts.push(deviationChart(o));
    if (o.sigmaTrend.length > 0) parts.push(sigmaChart(o));
    charts = true;
  }
  parts.push(anomalyTable(o, view));
  /* 结论块（§5.3）：正文由 `verdict()` ＋ `note()` 两件块级元素组成，
   * 故这里**不再套 `<p>`**（`<p>` 里塞不下块级件，浏览器会把套的这层拆开、产出坏结构）。 */
  parts.push(renderDisclosure({ title: '结论', contentHtml: volatilityConclusion(o, only), open: true }));
  parts.push(sourceLine(o, v.start, v.end));
  parts.push(copySection(volatilityCopyPayload(o), command));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: only ? '看波动异常点' : '波动分析',
    eyebrow: '',
    subtitle,
    content: parts.join(''),
    charts,
  });
}

/** 复制区唯一出口（数据位＋日志位，§5.4）：日志第 3 段＝渲染命令原文，第 4 段＝库与来源。 */
function copySection(envelope: SerializableEnvelope, command: string): string {
  return copyArea({
    data: { envelope },
    log: { envelope, copyLog: copyLog({ command, source: COPY_SOURCE, actionAt: nowStamp(), version: DOC_VERSION }) },
  });
}

/** 整页对外出口（既有名字不变）：整图面／只看异常点面共用一份装配。 */
export function buildVolatilityDoc(v: VolatilityView, view: VolatilityViewMode = 'full', command = ''): string {
  return buildVolatilityPage(v, view, command);
}
