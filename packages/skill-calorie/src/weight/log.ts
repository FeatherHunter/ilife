/** 量体重（HELP 场景 03「体重」下一级）：`calorie.view.weight` 读 ＋ `calorie.weight.log`／
 *  `calorie.weight.batch` 写。
 *
 * 本文件是这三条命令**事实的住处**：加一条命令只改这里＋`commands.ts`，共用位一行不动。
 * 取数走同目录 `records.ts`／`figures.ts`；量程走 `plate.ts` 的 `weightCurvePlan`（取数层算好，
 * 装配层只传进图表 `options`）；体重盘的视图模型与整页装配（#332 自 `plate.ts`／`plateDocs.ts`
 * 原样迁入）住本文件。
 *
 * #337 融合（老实物 `templates/weight_dashboard.html`）：卡上补 `status` 徽章（四值取冻结表）、
 * 曲线补 options（量程／刻度／单位／横轴标注／目标线／空态句）、结论由数据表改唯一形态折叠区、
 * 复制区补日志位、页末补数据来源行；空窗出整页空态（§5.7）＋空库缺失阻断（#556）。
 *
 * #505 形状化与手机端（口径 `.scratch/t154/text-review/口径-UI.md`，先例 `render/reviewDocsCss.ts`）：
 * 体重盘这一页原先靠 `·`／`；` 顶替设计的地方，全落成 `weightUi.ts` 的形状——
 *   · 页头 `… · 共 30 条 · 趋势上升` → 正文首件 `windowStrip()`（两枚日期块 ＋ 条数胶囊）＋ `chip()`；
 *   · 「变化」卡 `趋势上升 · 平均每天约 +10 克` → `factStrip()`（两枚「标签 ＋ 值」）；
 *   · 「距目标」卡 `目标 68 kg · 截止 … · 目标线超出刻度` → `factStrip()` ＋ 一枚说明条（`.wui-strip-note`）；
 *   · 结论句 `bits.join('；')` → `verdict()`（一句判语）＋ `factStrip()`（均值／目标两枚事实）。
 * 手机端照 HELP（断点 820）：样式随 `weightUiCss()` 进 `parts` 第一项，横向件窄屏塌纵向。
 *
 * #510 设计视角审查整改（同屏事实收敛，只动文本与装配，结构未动）：
 *   · 判语块不再逐句复述卡片：`weightConclusion()` 改成一句判语（只说挪动算不算大，不给数、不给方向词）；
 *   · 结论块的事实条只留卡片上没有的（目标值／截止日）；「图上没画目标线 ＋ 目标值超出刻度」那一型
 *     改走 `factStrip(…, asNote=true)`（两半分两档，不再是同字号同色的一句）；
 *   · 「变化」卡的速率从结论块搬回卡副说明；「均值」卡副说明的区间（与「窗口」卡首末对同数）删；
 *   · 今日盘两个 grid 合成一个（六卡三列两行，行行同宽）；单点页的胶囊由 13 字句子改回状态词。
 */
import type { DatabaseSync } from 'node:sqlite';
import { assertISO, defaultRange, fail, needArr, needNum, nums, optStr, wday } from '../shared/params.js';
import { F, R, commandLine, out } from '../shared/writeParts.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';
import { nowStamp } from '../render/receipt.js';
import type { AnalysisResult } from '../analysis/result.js';
import { getWeightGoalInfo, selectOrEdge, weightTrend } from './figures.js';
import type { WeightTrend } from './figures.js';
import { assertRange, weightCurvePlan } from './plate.js';
import type { WeightDashboard } from './plate.js';
import {
  renderChartBlock,
  renderDataTable,
  renderEmptyBlock,
  renderKpiGrid,
} from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DB_FILENAME } from '../paths.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, conclusionBlock, shapedConclusionBlock, signed } from './plateDocs.js';
import { chip, factStrip, verdict, weightUiCss, windowStrip } from './weightUi.js';
import { batchLogWeight, logWeight } from './records.js';

const VIEW_KEY = 'calorie.view.weight';

/** `calorie.view.weight` · 体重盘：首末＋均值＋变化趋势＋目标差距。空库缺失阻断（#556），窗口为空出整页空态。 */
export function viewWeight(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const command = commandLine(VIEW_KEY, params);
  const w = buildWeightDashboardOrNull(db, start, end);
  if (w === null) {
    if (((db.prepare('SELECT COUNT(*) AS n FROM weight_log').get() as { n: number } | undefined)?.n ?? 0) === 0) throw new CalorieRenderError('missing-data', '无体重记录（' + start + ' ~ ' + end + '）');
    return { data: { metrics: nums({ recordCount: 0 }) }, html: buildWeightEmptyDoc(start, end, command) };
  }
  const t = w.trend;
  const metrics = nums({
    recordCount: t.recordCount, avgWeight: t.avgWeight,
    maxWeight: t.maxWeight, minWeight: t.minWeight,
    firstWeight: t.firstWeight, lastWeight: t.lastWeight,
    changeKg: t.changeKg, dailyChangeG: t.dailyChangeG,
    weightGoal: w.weightGoal, gapKg: w.gapKg,
  });
  return { data: { metrics }, html: buildWeightDoc(w, command) };
}

/* ── 视图模型（#332 自 `plate.ts` 原样迁入：体重盘＝weightTrend＋目标取数） ── */

/** 窗口内有记录的体重盘；没有记录回 `null`（整页空态由装配层出，取数层不编数）。 */
function buildWeightDashboardOrNull(db: DatabaseSync, start: string, end: string): WeightDashboard | null {
  assertRange(start, end);
  let trendRes: AnalysisResult<WeightTrend>;
  try {
    trendRes = weightTrend(db, start, end);
  } catch (e) {
    if (e instanceof FetchError) return null;
    throw e;
  }
  if (trendRes.status !== 'ok' || !trendRes.data) return null;
  const info = getWeightGoalInfo(db);
  const trend = trendRes.data;
  const gapKg = info && typeof trend.lastWeight === 'number'
    ? Math.round((trend.lastWeight - info.weightGoal) * 10) / 10
    : null;
  return {
    start, end, trend, weightGoal: info?.weightGoal ?? null, deadline: info?.deadline ?? null, gapKg,
    curve: weightCurvePlan(trend.logs.map((l) => l.weightKg), info?.weightGoal ?? null),
  };
}

/** 体重盘视图模型（对外那一条；无记录走 `missing-data`，整页空态只在 `viewWeight` 的出口分派里出）。 */
export function buildWeightDashboard(db: DatabaseSync, start: string, end: string): WeightDashboard {
  const w = buildWeightDashboardOrNull(db, start, end);
  if (w === null) throw new CalorieRenderError('missing-data', '无体重记录（' + start + ' ~ ' + end + '）');
  return w;
}

/* ── 整页装配（#332 自 `plateDocs.ts` 原样迁入：weight_dashboard.html 对照） ── */

/** 窗口写法（一天就写那一天，不再写 `X ~ X`）：副标题、页脚、结论共用一处。 */
function rangeTextOf(start: string, end: string): string {
  return start === end ? start : start + ' ~ ' + end;
}

/** 日均变化的人话写法（口径：全族统一用「克」，不出现 `g/天`，零变化说「基本没变」）。 */
function dailyGram(g: number): string {
  return g === 0 ? '基本没变' : '平均每天约 ' + (g > 0 ? '+' : '') + g + ' 克';
}

/** 最新一条卡与较上次卡（老实物 `weight_dashboard.html` 的 todayKg／todayDate／todayDelta）。
 *  徽章只说状态，不重复卡上的数：窗口条数住在页头副标题与页脚来源行，卡片不再报一遍。 */
function todayCards(t: WeightTrend, w: WeightDashboard): KpiCardInput[] {
  const last = t.logs[t.logs.length - 1];
  const prevW = t.logs.length >= 2 ? t.logs[t.logs.length - 2]?.weightKg ?? null : null;
  const delta = prevW === null || last === undefined ? null : Math.round((last.weightKg - prevW) * 10) / 10;
  return [
    {
      label: w.start === w.end ? '今日体重' : '最新体重',
      value: last === undefined ? '—' : String(last.weightKg), unit: 'kg',
      detail: last === undefined ? '这段时间没有记录' : last.date,
      status: last === undefined ? 'empty' : 'ok',
      statusText: last === undefined ? '没有记录' : '已记录',
    },
    {
      label: '较上次', value: delta === null ? '—' : delta === 0 ? '0 kg' : signed(delta),
      /* 「持平」与值槽 `0 kg` 说的是同一件事 ⇒ 零变化不出徽章，只在副说明写「与上次一样」；
         升降才出徽章（那是状态），副说明改用「上次 X kg」把参照值说清。 */
      ...(prevW === null
        ? {}
        : { detail: delta === 0 ? '与上次一样' : '上次 ' + prevW + ' kg' }),
      ...(delta === null
        ? { status: 'empty' as const, statusText: '无可比' }
        : delta === 0
          ? {}
          : { status: (delta > 0 ? 'warn' : 'ok') as 'warn' | 'ok', statusText: delta > 0 ? '上升' : '下降' }),
    },
  ];
}

/** 窗口覆盖天数（含首末两天）：整页副标题与「体重盘」卡的值槽共用一处口径。 */
function windowDays(w: WeightDashboard): number {
  return Math.round((Date.parse(w.end) - Date.parse(w.start)) / 86400000) + 1;
}

/** 体重盘四卡（窗口天数／均值／变化／距目标）；单点在读数里写「单点无均值对照」。
 *  **值槽只放一个数与单位**：首末对（`70.1 → 70.4 kg`，14 字）挪进 `detail`
 *  ——它是区间串，进值槽会被断行撑高（t154 用户读数）。
 *
 *  #505：`detail` 那一槽**吃纯文本**（`renderKpiGrid` → `esc(card.detail)`，共享层转义），形状词汇的 HTML
 *  进不去（本票实测：形状被当成字面量印上屏）。故原来串在 `detail` 里的几件事改走两路——
 *  ① 「窗口」卡的条数／区间仍留纯文本（一个数 ＋ 一个区间串，没有分隔符）；
 *  ② 「变化」「距目标」卡里原来用 `·` 串的事实（趋势／平均每天／目标／截止／目标线没画）改由
 *     **结论块的形状**承载（本函数把它们交回去，调用处落成 `factStrip()`／说明条）。 */
function plateCards(w: WeightDashboard): { cards: KpiCardInput[]; facts: { k: string; v: string }[]; notes: { k: string; v: string }[] } {
  const t = w.trend;
  const single = w.curve.single;
  const facts: { k: string; v: string }[] = [];
  // #510 同屏事实收敛：结论块只留**卡片上没有的事实**（`verdict()` 第二参数的口径）——
  //   ① 「趋势上升／平均每天 …」原来整条进事实条：方向词与胶囊、徽章同说一件事，速率与「变化」卡
  //      说的是同一段 ⇒ 速率改住「变化」卡副说明（普通量值、纯文本进得去），这条事实删；
  //   ② 「目标 68 kg，还差 2.4 kg」里的差值正是「距目标」卡的值槽 ⇒ 事实条只留目标值（卡上没有的那半）；
  if (w.weightGoal !== null) facts.push({ k: '目标', v: w.weightGoal + ' kg' });
  if (w.weightGoal !== null && w.deadline !== null) facts.push({ k: '截止', v: w.deadline });
  /* 「标签 ＋ 一句说明」那一型（#510 的 S2 整改）：原来与量值同住一条 `wui-strip`，两半同字号同色，
   * 读者把这句读成「图上没画目标线 目标值超出刻度」一整句。这一型单出一列，调用处走
   * `factStrip(…, asNote=true)`（说明那半退到 12px `--fg2` 不加粗）。 */
  const notes: { k: string; v: string }[] = [];
  if (w.weightGoal !== null && !w.curve.targetInRange) {
    notes.push({ k: '图上没画目标线', v: '目标值超出刻度' });
  }
  return { facts, notes,
    cards: [
    {
      label: '窗口', value: String(windowDays(w)), unit: '天',
      detail: single ? t.firstDate : '首 ' + t.firstWeight + ' → 末 ' + t.lastWeight + ' kg',
    },
    {
      label: '均值', value: t.avgWeight + ' kg',
      /* 单点页：均值就是当天那一个读数（卡 1 已写），不再报一遍 ⇒ 只留一句「只有一天」。
         多天页：原副说明写「这段都在 X ~ Y kg 之间」，那两个数就是「窗口」卡副说明里的首末对
         （#510 实测：同一屏同一个 70.4 印了 4 遍）⇒ 那一句撤掉，均值卡只留均值这一个数。 */
      ...(single ? { status: 'empty' as const, statusText: '只有一天' } : {}),
    },
    {
      label: '变化', value: t.changeKg === 0 ? '0 kg' : signed(t.changeKg),
      // 速率住这里（#510：原来住结论块的事实条，与卡说的是同一段）；方向只看徽章一处。
      ...(single ? {} : { detail: dailyGram(t.dailyChangeG) }),
      status: single ? 'empty' : t.changeKg < 0 ? 'ok' : t.changeKg > 0 ? 'warn' : 'empty',
      statusText: single ? '看不出变化' : t.trendCn,
    },
    {
      label: '距目标', value: w.gapKg === null ? '—' : w.gapKg === 0 ? '0 kg' : signed(w.gapKg),
      // 未设目标那一句走结论块的事实条；设置了的，目标值与截止日也走那里（卡上没有这两件）。
      detail: w.weightGoal === null ? '还没有体重目标' : undefined,
      status: w.gapKg === null ? 'empty' : w.gapKg <= 0 ? 'ok' : 'warn',
      statusText: w.gapKg === null ? '未设目标' : w.gapKg <= 0 ? '已达目标' : '未达成',
    },
    ] };
}

/** 结论句（引用取数层字段，不做自然语言解析；单点、未设目标各有各的说法）。
 *  窗口与条数住在页头副标题与页脚来源行，本句只说「这段怎么样」。
 *
 *  #510 同屏事实收敛：本句原来把「首末两值 ＋ 累计变化 ＋ 趋势词 ＋ 日均速率」逐条复述一遍
 *  （那四件事实各住在卡片值槽／副说明／徽章里，判语块是同一屏第三、第四处）⇒ 改成**一句判语**：
 *  只说这一段的挪动算不算大（0.5kg／1.5kg 两档口径），不给数、不给方向词——数与方向归卡片与徽章。 */
function weightConclusion(w: WeightDashboard): { sentence: string; facts: { k: string; v: string }[] } {
  const t = w.trend;
  // 单点页：只有一句可说的（「看不出变化」），卡上也已各写一遍 ⇒ 这里不再复述日期／读数／目标差值。
  if (w.curve.single) return { sentence: '只有这一天，看不出变化。再记一条就能比较。', facts: [] };
  const abs = Math.abs(t.changeKg);
  const sentence = abs < 0.5
    ? '这一段的读数基本在一个水平上来回，日常波动就能解释。'
    : abs < 1.5
      ? '这一段的挪动比日常波动大一些，再记一两周更看得清。'
      : '这一段挪动的幅度不小，值得留意。';
  const facts: { k: string; v: string }[] = [];
  // 均值／目标／截止三件各有各的住所（卡片值槽），本句不再另起一条复述（#510 去冗余）。
  return { sentence, facts };
}

/** 复制区（数据＋日志）：#560 屏上来源脚注整行撤（用户裁决原文：「用户 2026-09-15 点名：所有 HTML
 *  页面底部的「数据来源：xxx」都删掉（用户直接看得见按钮与内容，不需要脚注复读来路）。」）。
 *  `renderCaliberLine` helper 本身保留（别家页在用，本件 import 已清）；`sourceText` 转进
 *  `copyLog.source`（复制日志第 3 段技术原件，一律保留，只删屏上脚注）。主盘与空窗共用本函数，一并处理。 */
function deliveryBlocks(envelope: SerializableEnvelope, command: string, sourceText: string): string {
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({ command, source: sourceText, actionAt: nowStamp(), version: DOC_VERSION }),
    },
  });
}

function weightEnvelope(w: WeightDashboard): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: VIEW_KEY,
    data: {
      metrics: metricsOf({
        recordCount: w.trend.recordCount, avgWeight: w.trend.avgWeight,
        maxWeight: w.trend.maxWeight, minWeight: w.trend.minWeight,
        firstWeight: w.trend.firstWeight, lastWeight: w.trend.lastWeight,
        changeKg: w.trend.changeKg, dailyChangeG: w.trend.dailyChangeG,
        weightGoal: w.weightGoal, gapKg: w.gapKg,
      }),
    },
  };
}

export function buildWeightDoc(w: WeightDashboard, command: string): string {
  const t = w.trend;
  const spanDays = windowDays(w);
  const rangeText = rangeTextOf(w.start, w.end);
  const sourceText = '体重记录 ｜ 窗口 ' + rangeText
    + ' ｜ 共 ' + t.recordCount + ' 条';
  /* #505：原来的页头副标题是一句 `·` 串（`2026-08-09 ~ 2026-09-07 · 共 30 条 · 趋势上升`），
   * 拆成两处成形的东西：① 窗口条（`windowStrip()`＝两枚日期块 ＋ 一枚条数胶囊）＋ 方向胶囊（`chip()`）
   * 合成正文首件；② 副标题只留一句人话。条数两处同值（页脚口径行另有窗口与条数，属允许项 §二）。
   * #510：胶囊只装 2～4 字的状态词——单点那档原来把一句 13 字的句子（「只有一条记录，还看不出趋势」）
   * 塞进胶囊，改回状态词（那件事由结论块的判语说全）；方向词全屏只留胶囊与徽章两处。 */
  const trendChip = w.curve.single
    ? chip('记录太少', 'plain')
    : chip('趋势' + t.trendCn, t.trendCn === '上升' ? 'warn' : 'plain');
  const plate = plateCards(w);
  const parts: string[] = [
    // `weightUiCss()`＝本族形状词汇的样式，按口径放 `parts` 第一项（`assembleDocPage` 没有页内 CSS 入口）。
    weightUiCss(),
    // 窗口条 ＋ 趋势胶囊合成一件（形状与外边距全在 `weightUi.ts`：这里只给类名，正文零内联样式）。
    '<div class="wui-window-block">' + windowStrip(w.start, w.end, '共 ' + t.recordCount + ' 条') + trendChip + '</div>',
    /* #510（审查席 S2）：今日盘原来渲染**两个 grid**（最新体重两卡 ＋ 体重盘四卡）——桌面 1200 下
     * 第一行两枚各 ~497px、第二行四枚各 ~245px，同一张网格里两行卡宽不同（手机两列看不出来）。
     * 六张卡合成一个网格：三列两行，行行同宽。 */
    renderKpiGrid(todayCards(t, w).concat(plate.cards)),
    // 老实物 weight_dashboard.html 的 h2 最近 7 天趋势：7 天内即近 7 天小图，否则全窗曲线。
    renderChartBlock({
      kind: 'line',
      title: spanDays === 1 ? '今日体重曲线' : spanDays <= 7 ? '近 7 天体重曲线' : '体重曲线',
      input: {
        items: t.logs.map((l) => ({ label: l.date.slice(5), value: l.weightKg })),
        options: {
          height: 300,
          format: (v: number) => String(v) + 'kg',
          /* 峰贴端点时退化为首尾（`figures.ts:selectOrEdge`），无碰撞时仍是首＋峰＋尾。 */
          labels: selectOrEdge(t.logs.map((l) => l.weightKg)),
          yTicks: w.curve.yTicks,
          yMin: w.curve.yMin,
          yMax: w.curve.yMax,
          highlightLast: true,
          ...(w.curve.single ? { markPoint: true as const } : {}),
          ...(w.curve.markLine === undefined ? {} : { markLine: w.curve.markLine }),
          emptyText: '本窗无体重记录（' + w.start + ' ~ ' + w.end + '）',
        },
      },
    }),
  ];
  // 结论卡（老实物 weight_dashboard.html 的 summaryCard／summaryText）：一页唯一形态的折叠区。
  // #505：一句判语 ＋ 若干枚事实（原来是 `bits.join('；')` 一句长串）。
  // #510：事实只留卡片上没有的那几件（目标值／截止日），「标签 ＋ 一句说明」那一型走 `asNote`——
  // 两半分两档，不再与量值同一条条子同字号并排（审查席 S2：那两半读成一句不通的话）。
  const concl = weightConclusion(w);
  parts.push(shapedConclusionBlock(
    verdict(concl.sentence)
    + factStrip(concl.facts.concat(plate.facts))
    + factStrip(plate.notes, false, true, true)));
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'kg', label: '体重', align: 'right' },
      { key: 'note', label: '备注' },
    ],
    rows: t.logs.map((l) => ({ date: l.date, kg: l.weightKg, note: l.note })),
    caption: '体重记录',
    emptyText: '这段时间还没有体重记录',
  }));
  parts.push(deliveryBlocks(weightEnvelope(w), command, sourceText));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: spanDays === 1 ? '今日体重' : '体重总览',
    eyebrow: '',
    // #542（#340 打回批）：副标题整行撤——窗口与条数已是正文首件 `windowStrip()`（两枚日期块 ＋
    // 条数胶囊）与页脚来源行，副标题再写一遍是百分百冗余。传空串即整段省略。
    subtitle: '',
    content: parts.join(''),
    charts: true,
  });
}

/** 空窗整页（§5.7 肉眼验收）：标题、空态句、结论、复制区一件不少，不出图表空壳（#560 屏上来源行已撤，来源只留复制载荷）。 */
function buildWeightEmptyDoc(start: string, end: string, command: string): string {
  const rangeText = rangeTextOf(start, end);
  const spanDays = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  const sourceText = '体重记录 ｜ 窗口 ' + rangeText + ' ｜ 共 0 条';
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: VIEW_KEY,
    data: { metrics: metricsOf({ recordCount: 0 }) },
  };
  const parts: string[] = [
    renderKpiGrid([
      { label: '今日体重', value: '—', unit: 'kg', detail: '这段时间没有记录', status: 'empty', statusText: '没有记录' },
      { label: '较上次', value: '—', detail: '没有记录，也没有上一次可比', status: 'empty', statusText: '无可比' },
    ]),
    // `weightUiCss()` 同放空窗页（同族同一套形状；空窗页没有形状件也要有同一份页内样式）。
    weightUiCss(),
    renderEmptyBlock({
      title: '体重曲线',
      text: '这段时间还没有体重记录',
      hint: '说「记体重」记一条，曲线就有第一个点',
    }),
    conclusionBlock('这段时间还没有体重记录，先记一条再看。'),
    deliveryBlocks(envelope, command, sourceText),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: spanDays === 1 ? '今日体重' : '体重总览',
    eyebrow: '',
    subtitle: '这段时间还没有体重记录',
    content: parts.join(''),
  });
}

/** `calorie.weight.log` · 记体重（身高缺档只留 BMI null，不阻断录入）。 */
export function writeWeightLog(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const kg = needNum(params, 'kg');
  if (!(kg > 0) || kg > 500) fail(2, 'kg 须为 0..500');
  const date = wday(params, 'date');
  if (date) assertISO(date, 'date');
  const r = logWeight(db, kg, optStr(params, 'note') ?? '', date, optStr(params, 'time'));
  const bmiText = r.bmi === null ? 'BMI 待补身高（补档案：calorie-cmd-read calorie.profile.set)' : 'BMI ' + r.bmi;
  return out(R('记体重', 'create', '已记体重 ' + r.kg + ' kg（' + bmiText + ' · ' + r.date + ' ' + r.time + '）', '记体重', 'weight_log (写库回执)', {
    recordId: r.id, ids: [r.id], writtenFields: [...F.weight],
    items: [{ id: r.id, date: r.date, status: '成功', reason: '', detail: String(r.kg) }],
  }));
}

/** `calorie.weight.batch` · 批量补录体重（同日已有记录即跳过，不覆盖）。 */
export function writeWeightBatch(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const items = needArr(params, 'items');
  if (items.length > 365) fail(2, 'items 至多 365 条');
  const r = batchLogWeight(db, items.map((e) => {
    const o = (e ?? {}) as Record<string, unknown>;
    return { date: o['date'] === undefined ? undefined : String(o['date']), kg: o['kg'] as number | undefined };
  }));
  return out(R('批量补录体重', 'create', '批量记体重：写入 ' + r.wrote + '，跳过 ' + r.skipped + '，失败 ' + r.failed, '批量补录体重', 'weight_log (写库回执)', {
    noChange: r.wrote === 0, ids: [], idSource: 'condition',
    writtenFields: r.wrote > 0 ? [...F.weightBatch] : [],
    // 整页回执的明细表吃全量逐条（写入／跳过／失败三态，失败原因照旧；摘要与计数口径一字不动）。
    items: r.items.map((x) => ({
      date: x.date, status: x.status, reason: x.reason,
      detail: x.kg === undefined ? '' : String(x.kg),
    })),
  }));
}
