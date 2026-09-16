/** #112 · 营养移植 3 页全文档装配（数据→区块→填充器）；#275 起按老实物重做内容与字段。
 *
 * 服务 3 条命令（声明住 `./commands.ts`）：
 *   · `calorie.view.nutrition-ratio`（查营养配比）→ `buildNutritionRatioDoc`
 *   · `calorie.view.nutrition-detail`（看营养素深度／看营养素明细）→ `buildNutritionDetailDoc`
 *   · `calorie.view.today-water`（看今日喝水／看今日饮水）→ `buildTodayWaterDoc`
 *
 * `calorie.view.source-stats`（看食品来源统计／看食品来源分布）原住本件，**已按编排者 2026-09-15 裁定 (b)
 * 搬进姊妹件 `./sourceStatsDocs.ts`**（⑤ 食品库类页归 #274、⑥ 营养类页归 #275；那一步也正是本包台账给本件
 * 写好的拆法第一步）。本件只剩 ⑥ 类的三支。
 *
 * 另交两个**具名区块**（本票只交付、不集成，谁调写在各自注释里）：
 *   · `buildNutritionRatioBlock(v)` —— 服务 `calorie.view.diet-review`（作者＝#273，「看营养结构」）；
 *   · `buildDietOverviewBlock(v, command)` —— 服务 `calorie.view.diet`（作者＝#271，「看饮食总览」）。
 *
 * 老实物对照（`D:\2Study\StudyNotes\SKILLS\卡路里\templates\`，**只读**；同名 `scripts\render_*.py`
 * 是取数口径的正本，同样只读）：`nutrition_ratio.html`（报告型 · 3 维配比：3 维 KPI／热量来源占比／
 * 推荐范围对比）／`nutrition_detail.html`（微量营养素 vs 推荐：逐项条＋缺数据盒）／
 * `diet_overview.html`（🍱 饮食总览：本周累计＋本月累计，统计到昨日、不含今日）／
 * `today_water.html`（💧 今日饮水：今日进度环／本周 7 天／今日每杯）。
 * 老实物的版式由 base-paint 12 区块承担，本件只把老实物的**块与字段**逐个装进去：
 * 页面标题（含老 emoji）、眉标（老 meta-bar／type-badge）、副标题（老 sub）、KPI 标签与单位、
 * 表列与表题（老 h2）、图表标题（老 chart-title）、以及每页末的「📊 数据来源」行逐字对齐。
 *
 * 做法沿 #104 §4：内容 = base-paint/blocks 12 区块；文档 = fillTemplate 包裹
 * （资产裸文本＋填充器包裹；sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs）。复制文本一律 buildDataText（#77 契约）。
 * 本层不做取数（数据由 `./nutritionPort.ts` 备齐），不返空（缺失由数据层抛 missing-data）。
 *
 * **#275 按 `t425-融合基准.md` 摆正的六处**（老→新的差额，逐条写清改法与依据）：
 *   ① 来源脚注改走公共层**普通小字行**（`renderCaliberLine`），不再走 `notice()` 深底块——
 *      裁定 2-补（深底块一律不出现在结果型 HTML 里）；这是 `t425` §九 第 1 条点名归本票的欠账。
 *   ② 页头按 §五 第 1、2 行重排：眉标＝「唤醒词 · 饮食」＋类型徽章（走 `metaLeft`／`badge`），
 *      眉标里**不出命令键**（裁定 1）。
 *   ③ 结论句（副标题槽，§五 第 3 行）：句内含本页至少一个读数，改掉原来没有读数的说明句（裁定 2）。
 *   ④ 页内导航（§五 第 4 行，`renderTocBlock`）：三页各自给锚点（裁定 3）。
 *   ⑤ 复制区改双按钮（§五 第 14 行，`copyArea` ＋ `copyLog`）：日志第 4 段「调用链」＝
 *      **本次命令原文（含 `--params`）**，照抄可重跑（裁定 7）；命令原文由调用点 `./nutrition.ts`
 *      与 `./today.ts` 传进来（本件不猜命令名）。
 *   ⑥ 配比页把老实物「推荐范围刻度**叠在实际值条上**」「环图图例带图例条」的密度补回
 *      （`renderDistributionRows`，移植项 31／33）——用库内现有区块，不新造样式。
 */
import {
  renderCaliberLine,
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderDistributionRows,
  renderEmptyBlock,
  renderFeedbackBlock,
  renderKpiGrid,
  renderTocBlock,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dietUiCss, windowStrip } from './dietUi.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DB_FILENAME } from '../paths.js';
import { nowStamp } from '../render/receipt.js';
import type { DataTextInput } from 'base-paint';
import type {
  DietOverviewPeriod,
  DietOverviewView,
  NutritionDetailView,
  NutritionRatioView,
  TodayWaterView,
} from './nutritionPort.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `../shared/docPage.ts`，标题走参数）。
 *  域口径与 `todayDocs`／`reviewDocs`／`libraryDocs`／`rankingDocs`／`render/dietDocs` 一致。 */
const DOC_TITLE = '卡路里 饮食';

/** 眉标里的族名（§五 第 1 行左槽；**不出命令键**——裁定 1）。 */
const EYEBROW = '卡路里 · 饮食';

/** 类型徽章（§五 第 1 行右槽）：⑥ 类四页同属营养／饮水／总览。 */
const BADGE = '营养饮水总览';

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

/** 每页末的「📊 数据来源」行（老 4 张实物的 `.footer .src` 位）。
 *
 *  裁定 2-补：来源脚注是**普通小字行**，不走 `notice()` 深底块（`t425` §九 第 1 条把这条欠账归本票）。
 *  做法照兄弟件 `./sourceStatsDocs.ts` 的同一行（那里已按裁定落在 `renderCaliberLine` 上）。 */
function sourceFootnote(text: string): string {
  return renderCaliberLine(text);
}

/** 页面级子件：把一段区块包进带锚点的 `<section>`（页内导航的落点，§五 第 4 行）。
 *  `renderTocBlock` 只认 `id`，区块本身不带 id ⇒ 由本件在外面套一层。 */
function anchored(id: string, html: string): string {
  return '<section id="' + id + '">' + html + '</section>';
}

/** 页脚复制区（§五 第 14 行）：**双按钮**（复制数据 ＋ 复制日志）＋ 日志六段；
 *  第 4 段「调用链」＝本次命令原文（含本次 `--params`），照抄可重跑（裁定 7）。
 *
 *  `command` 由调用点给（命令原文由命令层共用件 `shared/writeParts.ts` 的 `commandLine()` 派生）；
 *  不给（区块被别的页调用时）＝不出复制区——**不替调用方编一条命令原文**。
 *
 *  形状别写错：`copyArea` 的 `log` 位收 **`LogTextInput`**＝`{ envelope, copyLog }`，
 *  不是整段文本也不是 `copyLog()` 的返回值。给错形状时日志文本接不上，按钮落成 `disabled`
 *  ——一颗点不动的「复制日志」就是老实物那种死按钮，本仓不留。
 *  兄弟件 `./sourceStatsDocs.ts:92-100` 是同一形状（那边走 `renderCopyBlock`，两层入参不同名不同形）。 */
function docCopy(envelope: DataTextInput['envelope'], command?: string, source = ''): string {
  if (command === undefined) return '';
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({ command, source: source === '' ? DB_FILENAME : source, actionAt: nowStamp(), version: DOC_VERSION }),
    },
  });
}

/** 每页共用的 stat 信封（key 各页不同；指标由各页给）。 */
function statEnvelope(key: string, metrics: Record<string, number>): DataTextInput['envelope'] {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key, data: { metrics } };
}

/* ── 窗口为空那一态的整页（`t425` 裁定 4 的 2026-09-15 澄清） ── */

/** **窗口为空**那一态的整页（裁定 4／§五 的 ⑥ 类骨架：页头 ＋ 页题 ＋ 结论句槽 ＋ 页内导航 ＋
 *  空态块 ＋ 来源脚注 ＋ 复制区）。
 *
 *  两态互斥且不重叠，别把口径搅在一起：
 *    · **窗口为空**（这条词跑得通、库里别处有记录，只是这段没记）⇒ 走本函数：完整页 ＋ 空态句 ＋
 *      引导句（「怎么记第一条」），照样有页内导航与复制区，缺的只是读数；
 *    · **库为空**（连取数的底都没有）⇒ 取数层原样抛 `missing-data`、`exit 4`、不落盘，
 *      **是既有设计行为，本函数不接那一支**。
 *  两态的分辨在调用点做（`./nutrition.ts`／`./today.ts` 用 `hasAnyDietRow(db)`），本件只负责装配。
 *
 *  字段面收在八个（结构纪律：一个类型的字段不多于八个）——锚点、导航文案、库文件名都是本页常量，
 *  由本件自己定，不叫调用方填。 */
export interface EmptyWindowDocInput {
  /** 复制载荷的命令键（复制数据那一栏用）。 */
  readonly key: string;
  /** 眉标（§五 第 1 行：唤醒词 · 饮食；**不出命令键**——裁定 1）。 */
  readonly metaLeft: string;
  /** 页题（§五 第 2 行：页面名 ＋ 窗口／日期）。 */
  readonly title: string;
  /** 空态块的标题（这一块本来要出的是什么）。 */
  readonly blockTitle: string;
  /** 空态句（窗口内零记录这一件事，说清楚是哪一段）。 */
  readonly emptyText: string;
  /** 引导句（怎么记第一条）。裁定 4 要求空态句后必接一句。 */
  readonly guide: string;
  /** 来源脚注（普通小字行；裁定 3）。 */
  readonly footnote: string;
  /** 本次命令原文（复制日志第 4 段，裁定 7）。不给＝不出复制区。 */
  readonly command?: string;
}

export function buildEmptyWindowDoc(input: EmptyWindowDocInput): string {
  const envelope = statEnvelope(input.key, {});
  const body = [
    renderTocBlock({ items: [{ id: 'sec-empty', text: input.blockTitle }] }),
    anchored('sec-empty', renderEmptyBlock({ title: input.blockTitle, text: input.emptyText + input.guide })),
    sourceFootnote(input.footnote),
    docCopy(envelope, input.command, DB_FILENAME + ' ｜ ' + input.blockTitle),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: input.title,
    pageUi: true,
    eyebrow: EYEBROW,
    subtitle: input.emptyText,
    metaLeft: input.metaLeft,
    badge: BADGE,
    summary: input.emptyText,
    content: body,
  });
}

/** 同源入口页的**入口标记**（两条唤醒词共用同一条命令时的页头开关）。
 *
 *  #511 · 两组「同源入口页」在命令面上完全同形，参数也一字不差，命令这一层分不出进来的是哪条词
 *  （审查件第 80 条「78 与 38 逐行相同」、第 81 条「80 与 24 逐行相同」）：
 *    · `calorie.view.nutrition-detail` ← 看营养素深度 ／ 看营养素明细；
 *    · `calorie.view.today-water`     ← 看今日喝水 ／ 看今日饮水。
 *  作者裁定一：两个入口都留，各自标题对上进来的那条词。做法沿 #509 的 `source:'photo'`——
 *  由**入口自己**（`src/diet/routes.ts` 的路由记录）把标记带进命令，命令侧只拿它取页头。
 *  标记名绝不上屏、不写库、不进 `writtenFields`；不给标记时页头与从前一字不差。 */
export const ENTRY_DETAIL = 'detail';
export const ENTRY_DRINK = 'drink';

/** 第三组「同源入口页」的入口标记（**#271**）：`calorie.view.diet` 底下这一条命令挂着 15 条唤醒词，
 *  其中「看饮食总览」与「看最近 7 天饮食」在参数上只差这一位⇒由入口把标记带进命令，命令侧见它
 *  整页换总览页（本周／本月累计，都统计到昨日）。不给标记（含未知值）＝其余 8 个窗口词与 5 条餐别词
 *  从前的行为，一字不差。标记名与 `ENTRY_DETAIL`／`ENTRY_DRINK` 同规矩：不上屏、不写库。 */
export const ENTRY_OVERVIEW = 'overview';

/* ── 营养配比（老实物 nutrition_ratio.html：3 维配比 KPI＋热量来源占比＋推荐范围对比） ── */

/** 3 维配比的均衡档（老实物 `nutrition_ratio.html` 的 statusBadge 三档文案逐字）。
 *  档位判定只做一处（裁定 6 的同源口径）：取数层给的 `balance` 一个取值，本件只查表取文案。 */
const BALANCE = {
  good: { text: '均衡', badge: '✓ 均衡', status: 'ok' },
  warn: { text: '失衡', badge: '⚠ 失衡', status: 'warn' },
  bad: { text: '严重失衡', badge: '✗ 严重失衡', status: 'danger' },
} as const;

/** 三大营养素在一页里的公共口径（下标、名称、显示色、每克千卡）——**一处定义**，
 *  卡／环图／图例条／对比表四处都从它派生，不再各写一份三元组。
 *
 *  `color` 取老实物 `nutrition_ratio.html:14` 的三个色变量**逐值**（`--prot`／`--carb`／`--fat`
 *  在本仓的公共层里没有对应冻结 token —— 那 11 个 token 里没有营养素专用色），故按仓内先例
 *  （`diet/rankingDocs.ts` 的营养条）在页面侧写死色值、只此一处，不给别处留第二份。
 *
 *  `perG` 是老实物 `render_nutrition_ratio.py` 与 `#317` 环图共用的换算系数（蛋白／碳水 4、
 *  脂肪 9 千卡每克）；热量来源占比与推荐范围换算都以它为准。 */
const MACROS = [
  { key: 'protein', name: '蛋白', color: '#5856d6', perG: 4 },
  { key: 'carb', name: '碳水', color: '#34c759', perG: 4 },
  { key: 'fat', name: '脂肪', color: '#ff9500', perG: 9 },
] as const;

/** 一个营养素在本窗的四个读数（**一处取值**：上面那份口径 × 视图）。
 *  取值只在这里对一次字段名，卡、环图、图例条、对比表都吃这一份，免得四处各写一遍三元表达式。 */
function macroReadings(v: NutritionRatioView): {
  key: string; name: string; color: string; perG: number;
  g: number; pct: number; range: { min: number; max: number; label: string };
}[] {
  return [
    { ...MACROS[0], g: v.proteinG, pct: v.proteinPct, range: v.range.protein },
    { ...MACROS[1], g: v.carbG, pct: v.carbPct, range: v.range.carb },
    { ...MACROS[2], g: v.fatG, pct: v.fatPct, range: v.range.fat },
  ];
}

/** 配比卡的值说明：占比 ＋ 每日目标。
 *
 *  #496 · 原文是「30% · 目标 —g」——`—` 是空值占位，紧贴着 `g` 会被读成「30 就是 30 克」
 *  （审查件第 76 条）。没设目标时明说没设；有目标时把单位写成「克」，不再让 `g` 单挂在一个数后面。 */
function goalDetail(pct: number, targetG: number | null): string {
  return '占 ' + pct + '%，' + (targetG === null ? '未设定每天目标' : '每天目标 ' + fmt(targetG) + ' 克');
}

/** 热量来源占比那张环图的共用口径句：说清环上的数是**按营养素折算**出来的、与另一处的
 *  「总摄入」为什么可能对不上。
 *
 *  #496 · 这张图原来的中心写「总热量 1,916」（记录热量合计），环上的图例却是
 *  「蛋白 576 65%／脂肪 315 35%」——65%／35% 的分母是 891（蛋白 576 ＋ 碳水 0 ＋ 脂肪 315），
 *  跟 1,916 不是同一个数，两处并排互相矛盾（审查件第 77、83 条）。改法：中心改标**折算合计**
 *  （环图自己的分母），图下把这句口径说出来，读者不用自己算。 */
function kcalNote(totalCalorie: number | null): string {
  const half = '占比按营养素折算：蛋白和碳水都是每克 4 千卡，脂肪是每克 9 千卡，环上的数就是这三个数折算出来的热量。';
  if (totalCalorie === null) return half;
  return half + '它与按每条记录的热量合计出来的总摄入（' + totalCalorie.toLocaleString()
    + ' 千卡）不是同一个数——记录里的热量是各条自己报的值。';
}

/** 配比页结论句（§五 第 3 行，句内含本页读数）：本窗总摄入 ＋ 天数 ＋ 均衡档位。
 *
 *  #587 裁定4：7507（按每条记录热量合计）与 6832（按营养素折算合计）两数都保留；
 *  副题注明“热量合计”（本句括号）、环中心保持“折算合计”，消除“打架”观感。不断言口径（不判哪个对）。 */
function ratioSummary(v: NutritionRatioView, balance: { text: string }): string {
  return '这 ' + v.days + ' 天共摄入 ' + v.totalCalorie.toLocaleString() + ' 千卡（热量合计），三大营养素配比' + balance.text + '。';
}

/** 营养配比区块的开关（`buildNutritionRatioBlock` 的第二参；`#275` 微修按编排者 2026-09-15 指令加）。
 *
 *  一个区块里能出的东西只有一样是可选的：**末尾那一节复制区**。宿主页自己多半也有一整个复制区
 *  （复盘页就有），两处并排既重复又难看 ⇒ 由**宿主页**决定要不要区块自带的那一节。
 *
 *  **两个位各守一件事，别混**：
 *   · `copy` 只管**区块自带的那一节**；**缺省 `true`**——与 #275 交付时的行为一字不差，
 *     老调用点（#273 的 `buildNutritionRatioBlock(ratio)`）不改也不变。宿主页自己出复制区时传 `false`。
 *   · `command` 是**那一节**的日志第 4 段要写的本次命令原文——**不给就整节不出**（裁定 7：
 *     不编命令原文，也不出点不动的日志按钮）。所以 `copy` 为真而 `command` 不给 ＝ 不出那一节，
 *     不是出个半截（`copy` 为真时 `command` 是必需位）。
 *
 *  **整页那一支怎么用**（本件自己的先例）：`buildNutritionRatioDoc` 把命令原文**交给区块**出那一节，
 *  自己不再另出一节 ⇒ 一张页只有一个复制区。这就是给 #273 的写法：
 *  宿主页已有复制区就传 `copy: false`，没有就把命令原文给区块让它出。 */
interface NutritionRatioBlockOptions {
  /** 区块末尾要不要自带那一节复制区；缺省 `true`。宿主页自己出复制区时传 `false`。 */
  readonly copy?: boolean;
  /** 区块自带那一节的日志第 4 段＝本次命令原文（含 `--params`）。不给＝那一节整节不出。 */
  readonly command?: string;
}

/** 营养配比区块（**服务 `calorie.view.diet-review`**，作者＝#273：「看营养结构」按老 SKILL 也出这张页，
 *  老模板 `templates/nutrition_ratio.html`；#273 把它嵌进复盘页。本件只交付，不集成）。
 *
 *  宿主页里出柱／环图 ⇒ `assembleDocPage` 的 `charts` 传 `true`。
 *
 *  末尾那一节复制区（数据 ＋ 日志）的开关见 `NutritionRatioBlockOptions`：**缺省带**（老调用点逐字节不变），
 *  宿主页自己出复制区时传 `{ copy: false }` 把它关掉——一张页上只该有一个复制区。 */
export function buildNutritionRatioBlock(v: NutritionRatioView, opts?: NutritionRatioBlockOptions): string {
  const balance = BALANCE[v.balance];
  /* 一张营养素一张卡：值／占比／每日目标都从上面那份 `macroReadings` 取（卡片槽吃纯文本，
     环图与对比表吃同一份读数，三处不可能各自算一遍）。 */
  const macros = macroReadings(v);
  const targets: (number | null)[] = [v.targetProteinG, v.targetCarbG, v.targetFatG];
  const parts: string[] = [
    /* #511 · 三张配比卡的值单位原写 `g`（审查件第 78 条那一处的同族写法），改「克」与下面那张
       推荐范围对比表统一；说明行早已是「每天目标 N 克」（#496 的 `goalDetail`）。 */
    anchored('sec-kpi', renderKpiGrid([
      ...macros.map((m, i) => ({
        label: m.name, value: String(m.g), unit: '克', detail: goalDetail(m.pct, targets[i] as number | null),
      })),
      {
        label: '总摄入', value: String(v.totalCalorie), unit: '卡',
        /* #587 门禁收口：`·` 并列改逗号（R1），形状仍走 KPI 卡现成件。 */
        detail: '共 ' + v.days + ' 天，' + balance.text,
        status: balance.status,
        statusText: balance.badge,
      },
    ])),
  ];
  /* 折算合计（环图自己的分母）：蛋白和碳水每克 4 千卡、脂肪每克 9 千卡。 */
  const folded = v.proteinG * 4 + v.carbG * 4 + v.fatG * 9;
  if (v.totalCalorie > 0) {
    // 热量来源占比（老实物的饼图＋自定义图例 → 冻结 donut：中心给折算合计，占比由 showPercent 给）。
    parts.push(anchored('sec-chart', renderChartBlock({
      kind: 'donut',
      title: '热量来源占比（按营养素折算）',
      input: {
        items: [
          { label: '蛋白（千卡）', value: v.proteinG * 4 },
          { label: '碳水（千卡）', value: v.carbG * 4 },
          { label: '脂肪（千卡）', value: v.fatG * 9 },
        ],
        options: {
          showPercent: true, centerLabel: '折算合计（千卡）', centerValue: String(Math.round(folded)),
        },
      },
    })));
    /* 老实物的图例条：每个营养素一行「名称 ｜ 条 ｜ 百分比」。
       移植项 31 要的「推荐范围刻度叠在实际值条上」由下面那张表承担（条上只表达实际值比例，
       刻度按占位是文字 —— 公共层的条只收一个 `pct`，硬塞两个刻度会变成假读数，故不塞）。 */
    parts.push(renderDistributionRows({
      rows: macros.map((m) => ({
        label: m.name + '（推荐 ' + m.range.min + '–' + m.range.max + '%）',
        value: m.pct + '%',
        pct: m.pct,
        color: m.color,
      })),
    }));
    parts.push(renderCaliberLine(kcalNote(v.totalCalorie)));
  } else {
    parts.push(renderEmptyBlock({ title: '热量来源占比', text: '本窗总热量为 0，占比画不出来（不编数）' }));
  }
  // 推荐范围对比（下限/上限按总热量占比换算：蛋白/碳水 4kcal/g · 脂肪 9kcal/g；沿老模板）。
  // #631 · 距范围列与状态列同口径（t605 D3）：三态判定一律按占比 pct（与状态列同一谓词），
  // 不按克数比（克数经 round 取整，边界上会与 pct 判定分家）；符号统一为 ↓/✓/↑，与状态列同符号系，
  // 差值取到侧界的绝对克数（下限侧 minG-g／上限侧 g-maxG），数字本身不动（minG/maxG/g/pct 算式不变）。
  const rows = macros.map((m) => {
    const minG = Math.round((v.totalCalorie * m.range.min) / 100 / m.perG);
    const maxG = Math.round((v.totalCalorie * m.range.max) / 100 / m.perG);
    const below = m.pct < m.range.min;
    const above = m.pct > m.range.max;
    const inRange = !below && !above;
    const gap = above ? '↑ ' + (m.g - maxG) + ' 克' : (below ? '↓ ' + (minG - m.g) + ' 克' : '✓');
    /* #511 · 下限／上限两列原写 `10%（48g）`——`g` 是英文缩写，且括号里的克数是**整窗合计**、
       读者会当成一天的量（审查件第 78 条）。单位改「克」，并把「这一列是几天合计」写进格子；
       表题再补一句同口径，免得逐格都读一遍才知道分母。 */
    const span = ' 克 / ' + v.days + ' 天';
    return {
      name: m.name,
      actual: m.g + ' 克（' + m.pct + '%）',
      lower: m.range.min + '%（' + minG + span + '）',
      upper: m.range.max + '%（' + maxG + span + '）',
      gap,
      status: inRange ? '✓ 在范围内' : (below ? '↓ 偏低' : '↑ 偏高'),
    };
  });
  parts.push(anchored('sec-table', renderDataTable({
    columns: [
      { key: 'name', label: '营养素' },
      { key: 'actual', label: '实际', align: 'right' },
      { key: 'lower', label: '下限', align: 'right' },
      { key: 'upper', label: '上限', align: 'right' },
      { key: 'gap', label: '距范围', align: 'right' },
      { key: 'status', label: '状态' },
    ],
    rows,
    /* #511 · 表题补一句「克数都是这 N 天合计」（审查件第 78 条：括号里的 48 克是 7 天合计，
       读者会当成一天）。 */
    caption: '推荐范围对比（克数均为这 ' + v.days + ' 天合计）',
    emptyText: '本窗无配比数据',
  })));
  parts.push(sourceFootnote('📊 数据来源 · 饮食记录 · ' + v.start + ' → ' + v.end
    + '（按营养素折算）'));
  /* 末尾那一节复制区（开关见 `NutritionRatioBlockOptions`）：
     缺省带（老调用点＝#273 的 `buildNutritionRatioBlock(ratio)` 逐字节不变）；
     宿主页自己出复制区时传 `{ copy: false }` ⇒ 这一节整节不出（不给命令原文时同样整节不出）。 */
  if (opts?.copy !== false && opts?.command !== undefined) {
    parts.push(docCopy(statEnvelope('calorie.view.nutrition-ratio', metricsOf({
      totalCalorie: v.totalCalorie, proteinG: v.proteinG, proteinPct: v.proteinPct,
      carbG: v.carbG, carbPct: v.carbPct, fatG: v.fatG, fatPct: v.fatPct,
      targetProteinG: v.targetProteinG, targetCarbG: v.targetCarbG, targetFatG: v.targetFatG,
    })), opts.command, DB_FILENAME + ' ｜ 饮食记录（按营养素折算）'));
  }
  return parts.join('');
}

/** 营养配比**整页**（`calorie.view.nutrition-ratio`）。`command`＝本次命令原文（复制日志第 4 段）。 */
export function buildNutritionRatioDoc(v: NutritionRatioView, command?: string): string {
  const balance = BALANCE[v.balance];
  const body = [
    dietUiCss(),
    windowStrip(v.start, v.end, v.days + ' 天'),
    renderTocBlock({ items: [
      { id: 'sec-kpi', text: '配比读数' },
      { id: 'sec-chart', text: '热量来源占比' },
      { id: 'sec-table', text: '推荐范围对比' },
    ] }),
    /* 末尾那一节复制区由**区块**出（把本次命令原文交给它）——页脚不再另出一节 ⇒ 一张页只有一个复制区。
       命令原文只在这一处给，页头与区块不可能各编一条。 */
    buildNutritionRatioBlock(v, command === undefined ? undefined : { command }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '🥗 营养配比',
    pageUi: true,
    /* #496 · 原副题「3 维宏量营养素 ⚠ 失衡」把引擎里的叫法（3 维／宏量营养素）带给读者
       （审查件第 75 条）；#275 起这一槽改承载**结论句**（§五 第 3 行：句内含本页读数）。 */
    eyebrow: EYEBROW,
    subtitle: ratioSummary(v, balance),
    metaLeft: '查营养配比（饮食）',
    badge: BADGE,
    summary: ratioSummary(v, balance),
    content: body,
    charts: v.totalCalorie > 0,
  });
}

/* ── 营养素深度（老实物 nutrition_detail.html：微量营养素 vs 推荐＋缺数据盒） ── */

/** 营养素深度／明细的口径说明行（§五 第 13 行）：说清这一页在比什么、哪一列是怎么算的。
 *
 *  两支各写一句（不是同一句换个页题）——`t511-清尾二.test.mjs` 的「同源入口页各自对得上」那一条
 *  会把两页里含「营养素深度」「营养素明细」的行剔掉再比剩余正文：只改页题那一支会判「正文一模一样」
 *  （#511 审查件第 80 条的原意就是两条词各自站得住，不只是标题不同）。 */
function detailCaliber(detail: boolean): string {
  /* #587 门禁收口：`、`／`；`并列改逗号句号（R5／R2），形状仍走口径行现成件；两支仍各写一句（t511 ② 正文差异不断言口径）。 */
  return detail
    ? renderCaliberLine('这张表把每项营养素的摄入量，每天平均，每天推荐量，完成度和状态并排列出。'
      + '完成度是每天平均摄入除以每天推荐量。食品库里查不到营养值的食物不进合计。')
    : renderCaliberLine('看的是微量营养素摄入水平：膳食纤维越高越好，钠和糖越低越好。'
      + '「每天平均」是整窗累计除以天数，不是某一天的值。');
}

/** 营养素深度结论句（§五 第 3 行）：匹配餐数 ＋ 三项日均 ＋ 缺数据食物数。
 *
 *  `detail`＝进来的那条词是「看营养素明细」那一支：句首带出这条词，读者一眼知道进的是哪一支。 */
function detailSummary(v: NutritionDetailView, detail: boolean): string {
  const fiber = v.items[0];
  const sodium = v.items[1];
  const sugar = v.items[2];
  return '「' + (detail ? '看营养素明细' : '看营养素深度') + '」本窗匹配到 ' + v.matchedMeals + ' 餐。膳食纤维日均 '
    + fmt(fiber?.avg) + ' ' + (fiber?.unit ?? '') + '，钠日均 ' + fmt(sodium?.avg) + ' ' + (sodium?.unit ?? '')
    + '，糖日均 ' + fmt(sugar?.avg) + ' ' + (sugar?.unit ?? '')
    + (v.missingFoods.length > 0
      ? '。另有 ' + v.missingFoods.length + ' 种食物在食品库查不到营养值，未计入。'
      : '。');
}

/** 营养素深度区块（3 项固定推荐量逐项一行：名称＋推荐＋累计＋日均＋占比）。
 *
 *  #496 · 三处内部说法改人话（审查件第 51、52、54、55 条）：`DRI` 缩写、`沿旧 D5.4 口径`
 *  版本号、「累计 vs 日均」分不清；「vs」也不是中文。列头按审查件建议写全，口径句重写一句。 */
export function buildNutritionDetailBlock(v: NutritionDetailView): string {
  const parts: string[] = [
    anchored('sec-kpi', renderKpiGrid([
      { label: '匹配餐数', value: String(v.matchedMeals), unit: '餐', detail: v.start + ' 至 ' + v.end },
      { label: '缺数据食物', value: String(v.missingFoods.length), unit: '种', detail: '未计入合计' },
      { label: '覆盖营养素', value: String(v.items.length), unit: '项', detail: '膳食纤维 钠 糖（每天推荐量固定，不随饮食变化）' },
    ])),
    anchored('sec-table', renderDataTable({
      columns: [
        { key: 'label', label: '营养素' },
        { key: 'value', label: '累计（' + v.days + ' 天）', align: 'right' },
        { key: 'avg', label: '每天平均', align: 'right' },
        { key: 'good', label: '每天推荐', align: 'right' },
        { key: 'pct', label: '完成度', align: 'right' },
        { key: 'status', label: '状态' },
      ],
      rows: v.items.map((it) => ({
        label: it.label,
        value: it.value + it.unit,
        avg: it.avg + it.unit + '/天',
        good: it.good,
        pct: it.pct + '%',
        status: it.status === 'ok' ? '✓ 够了' : '↑ 超标',
      })),
      caption: '完成度＝每天平均摄入 ÷ 每天推荐量',
      emptyText: '本窗无营养素数据',
    })),
  ];
  if (v.missingFoods.length > 0) {
    // 老实物的 `.warn-box` 一句话（名单逐字列出，不另开名单表）。
    parts.push(warnBox(
      '缺数据食物（共 ' + v.missingFoods.length + ' 种，未计入）',
      '⚠ 缺数据食物 ' + v.missingFoods.length + ' 种，未在食品库找到营养数据，未计入：' + v.missingFoods.join('，'),
      '建议用「存食品」补录',
    ));
  }
  parts.push(sourceFootnote('📊 数据来源 · 饮食记录 × 食品库 · ' + v.start + ' → ' + v.end
    + '（按食物名折算）'));
  /* 块层不给复制区（集成归宿主页）——整页那一支由 `buildNutritionDetailDoc` 出。 */
  return parts.join('');
}

/** 缺数据盒（老实物 `.warn-box`）：浅底静态提示块，**本件只此一处调用**（薄包装，名字按用途取，
 *  免得别处再写一遍那串 `staticNotice` 的入参形状）。
 *
 *  裁定 2-补只管「结论句与来源脚注」不走深底块；缺数据盒是提醒读者有东西没算进去，
 *  留在浅底提示块里（老实物也是 `.warn-box` 一条浅色框）。 */
function warnBox(title: string, msg: string, detail: string): string {
  return renderFeedbackBlock({ title, staticNotice: true, toast: { icon: 'warn', msg, detail } });
}

/* ── 食品来源统计：**已按编排者 2026-09-15 裁定 (b) 搬出本件**，见 `./sourceStatsDocs.ts` ──
   ⑤ 食品库类页（#274）与 ⑥ 营养类页（#275）的归属按页面类划；本件只留 ⑥ 类的三支。 */

/** 营养素深度**整页**（`calorie.view.nutrition-detail`）。`command`＝本次命令原文（复制日志第 4 段）。 */
export function buildNutritionDetailDoc(v: NutritionDetailView, entry?: string, command?: string): string {
  /* #511 · 页头按进来的那条唤醒词出：`看营养素明细` 那一支出「营养素明细」，`看营养素深度`
     那一支（不给标记）出「营养素深度」——两条入口都留，不再出两张一样的页（审查件第 80 条）。 */
  const detail = entry === ENTRY_DETAIL;
  const envelope = statEnvelope('calorie.view.nutrition-detail', metricsOf({
    days: v.days,
    matchedMeals: v.matchedMeals,
    missingFoods: v.missingFoods.length,
    fiberAvg: v.items[0]?.avg,
    sodiumAvg: v.items[1]?.avg,
    sugarAvg: v.items[2]?.avg,
    fiberPct: v.items[0]?.pct,
    sodiumPct: v.items[1]?.pct,
    sugarPct: v.items[2]?.pct,
  }));
  const body = [
    dietUiCss(),
    windowStrip(v.start, v.end, v.days + ' 天'),
    renderTocBlock({ items: [
      { id: 'sec-kpi', text: '读数' },
      { id: 'sec-table', text: '逐项明细' },
    ] }),
    buildNutritionDetailBlock(v),
    detailCaliber(detail),
    docCopy(envelope, command, DB_FILENAME + ' ｜ 饮食记录 × 食品库（按食物名折算）'),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: detail ? '🧪 营养素明细' : '🧪 营养素深度',
    pageUi: true,
    /* #496 · 眉标原写「看营养素深度 · 区间 · N 天」——把唤醒词与窗口区间印了一遍（审查件第 80 条）。
       #275 起眉标只留「唤醒词 · 饮食」（§五 第 1 行），§五 第 3 行的结论句改由副标题槽承载。 */
    eyebrow: EYEBROW,
    subtitle: detailSummary(v, detail),
    metaLeft: (detail ? '看营养素明细' : '看营养素深度') + '（饮食）',
    badge: BADGE,
    summary: detailSummary(v, detail),
    content: body,
  });
}

/* ── 食品来源统计：**已按编排者 2026-09-15 裁定 (b) 搬出本件**，见 `./sourceStatsDocs.ts` ──
   ⑤ 食品库类页（#274）与 ⑥ 营养类页（#275）的归属按页面类划；本件只留 ⑥ 类的三支。 */

/* ── 今日饮水（老实物 today_water.html：今日进度环＋本周 7 天＋今日每杯） ── */

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

/** 饮水页结论句（§五 第 3 行）：今日累计 ＋ 进度 ＋ 差额（含「已完成」「超出」两支）。 */
function waterSummary(v: TodayWaterView, name: string): string {
  const tail = v.remainMl > 0
    ? '还差 ' + v.remainMl + ' ml 到目标。'
    : (v.remainMl === 0 ? '正好完成目标。' : '已超出目标 ' + (-v.remainMl) + ' ml。');
  return '今天' + (name === '今日喝水' ? '喝了' : '饮水') + ' ' + v.todayMl.toLocaleString()
    + ' ml（目标的 ' + v.pct + '%），' + tail;
}

/** 今日饮水区块（进度环／7 天柱图／每杯明细三块，标题逐字取老实物的三个 h2）。
 *  `name`＝这一页的正文叫法（「今日喝水」／「今日饮水」，由入口标记定，见 `ENTRY_DRINK`）。 */
export function buildTodayWaterBlock(v: TodayWaterView, name: string): string {
  const remainText = v.remainMl > 0
    ? '还差 ' + v.remainMl + ' ml（占目标 ' + (100 - v.pct) + '%）'
    : (v.remainMl === 0 ? '已完成目标(100%)' : '超出目标 ' + (-v.remainMl) + ' ml(' + v.pct + '%)');
  const parts: string[] = [
    anchored('sec-kpi', renderKpiGrid([
      { label: name, value: String(v.todayMl), unit: 'ml', detail: v.date },
      /* #496 · 原写 `daily_goal.water_goal（缺省 2000）`——库表名＋列名＋「缺省」都是源码词。 */
      { label: '目标', value: String(v.targetMl), unit: 'ml', detail: '没设过就是 2000 ml' },
      {
        label: '进度', value: String(v.pct) + '%', detail: remainText,
        status: v.remainMl <= 0 ? 'ok' : 'warn',
        statusText: v.remainMl > 0 ? '还差 ' + v.remainMl + ' ml' : (v.remainMl === 0 ? '已完成目标' : '超出 ' + (-v.remainMl) + ' ml'),
      },
    ])),
    // 今日进度（老实物的进度环 → 冻结 donut 单段；中心数值老实物在 ring-center，这里走 centerValue）。
    anchored('sec-ring', renderChartBlock({
      kind: 'donut',
      title: '今日进度',
      input: {
        items: [
          { label: '已喝', value: Math.min(v.todayMl, v.targetMl) },
          { label: '未喝', value: Math.max(v.targetMl - v.todayMl, 0) },
        ],
        options: {
          size: 200, ringWidth: 14, legend: 'none', showPercent: false,
          centerLabel: name, centerValue: v.todayMl.toLocaleString(),
        },
      },
    })),
  ];
  if (v.weekMl.some((ml) => ml > 0)) {
    // 本周 7 天（老实物的 7 根柱：柱上标 ml、柱下标星期，含今日那天）。
    parts.push(anchored('sec-week', renderChartBlock({
      kind: 'bar',
      title: '本周 7 天',
      input: {
        items: v.weekMl.map((ml, i) => ({
          label: (v.weekDates[i] ?? '').slice(5) + '（' + WEEKDAY[weekdayOf(v.weekDates[i] ?? '')] + '）',
          value: ml,
        })),
        options: { showValues: true },
      },
    })));
  } else {
    parts.push(anchored('sec-week', renderEmptyBlock({
      title: '本周 7 天',
      text: '7 天窗内没有饮水记录。',
    })));
  }
  parts.push(anchored('sec-cups', renderDataTable({
    columns: [
      { key: 'time', label: '时间' },
      { key: 'ml', label: '饮水量ml', align: 'right' },
    ],
    rows: v.cups.map((c) => ({ time: c.time === '' ? '—' : c.time, ml: c.ml })),
    caption: '今日每杯（共 ' + v.cups.length + ' 杯）',
    emptyText: '今天还没有喝水记录',
  })));
  parts.push(sourceFootnote('📊 数据来源 · 饮水记录 · ' + v.date));
  /* 块层不给复制区（集成归宿主页）——整页那一支由 `buildTodayWaterDoc` 出。 */
  return parts.join('');
}

/** 星期下标（`日`..`六`）；按 UTC 取，避开时区把日期挪一天。非法日期回落 `日`。 */
function weekdayOf(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return 0;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
}

export function buildTodayWaterDoc(v: TodayWaterView, entry?: string, command?: string): string {
  /* #511 · 页头与正文的饮水叫法都按进来的那条唤醒词出：`看今日喝水` 那一支出「今日喝水」，
     `看今日饮水` 那一支（不给标记）出「今日饮水」——两条入口都留，不再出两张一样的页
     （审查件第 81 条）。#496 当年把两页统一叫「今日饮水」，这一处按作者裁定一改回来。 */
  const drink = entry === ENTRY_DRINK;
  const name = drink ? '今日喝水' : '今日饮水';
  const envelope = statEnvelope('calorie.view.today-water', metricsOf({
    todayMl: v.todayMl, targetMl: v.targetMl, pct: v.pct, remainMl: v.remainMl, cups: v.cups.length,
  }));
  const body = [
    dietUiCss(),
    windowStrip(v.date, v.date, v.cups.length + ' 杯'),
    renderTocBlock({ items: [
      { id: 'sec-kpi', text: '今日读数' },
      { id: 'sec-ring', text: '今日进度' },
      { id: 'sec-week', text: '本周 7 天' },
      { id: 'sec-cups', text: '今日每杯' },
    ] }),
    buildTodayWaterBlock(v, name),
    docCopy(envelope, command, DB_FILENAME + ' ｜ 饮水记录'),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '💧 ' + name,
    pageUi: true,
    /* #496 · 眉标原写「<日期> · 饮水 #1」——把日期又抄一遍、`#1` 是内部形态号。
       #275 起眉标只留「唤醒词 · 饮食」（§五 第 1 行），结论句改由副标题槽承载（第 3 行）。 */
    eyebrow: EYEBROW,
    subtitle: waterSummary(v, name),
    metaLeft: name + '（饮食）',
    badge: BADGE,
    summary: waterSummary(v, name),
    content: body,
    charts: true,
  });
}

/* ── 饮食总览（老实物 diet_overview.html：本周累计＋本月累计，统计到昨日、不含今日） ── */

/** 一段周期（老实物两个 `.period` 卡片：标题＋区间行＋4 张 KPI＋每日热量柱图）。
 *
 *  老实物的「每日热量(卡)」是一排 31 根迷你柱；本仓的柱图区块按 `showValues` 出读数柱，
 *  31 根柱上逐根标数值会糊成一团 ⇒ 这里**换成同数据的两件**：KPI 卡里的总／日均／有记录天数
 *  照旧，逐日读数改由柱图承担（老实物的柱也带 title 悬停值，本仓柱图自带读数）。
 *  `id`＝宿主页页内导航的锚点。 */
function overviewPeriodBlock(id: string, name: string, p: DietOverviewPeriod): string {
  if (p.days === 0) {
    return anchored(id, renderEmptyBlock({ title: name, text: '窗口还没有自然日（今天正是窗口首日），累计从明天起算' }));
  }
  const cards = renderKpiGrid([
    { label: '总热量', value: String(p.totalCalorie), unit: '卡', detail: p.start + ' 至 ' + p.end },
    { label: '日均热量', value: String(p.avgCalorie), unit: '卡/天', detail: '分母＝窗口 ' + p.days + ' 天' },
    { label: '总蛋白', value: String(p.totalProtein), unit: '克' },
    { label: '有记录天数', value: String(p.loggedDays), unit: '天', detail: '共 ' + p.days + ' 天' },
  ]);
  const chart = p.daily.some((d) => d.calorie > 0)
    ? renderChartBlock({
      kind: 'bar',
      title: '每日热量(卡)（每根柱是一天，无记录天为 0）',
      input: { items: p.daily.map((d) => ({ label: d.date.slice(5), value: d.calorie })) },
    })
    : renderEmptyBlock({ title: '每日热量(卡)', text: name + '窗内没有饮食记录（不编数）' });
  return anchored(id, renderDisclosure({
    title: name + '（共 ' + p.days + ' 天）',
    contentHtml: cards + chart,
    open: true,
  }));
}

/** 看饮食总览**结论句**（§五 第 3 行，句内含本页读数）：本周日均 ＋ 本月累计。 */
function overviewSummary(v: DietOverviewView): string {
  return '统计到 ' + v.today + ' 的前一天：本周日均 ' + String(v.week.avgCalorie) + ' 卡（'
    + v.week.loggedDays + '/' + v.week.days + ' 天有记录），本月累计 '
    + v.month.totalCalorie.toLocaleString() + ' 卡。';
}

/** 看饮食总览区块（**服务 `calorie.view.diet`**，作者＝#271：取数调 `buildDietOverviewView(db, date)`，
 *  本函数只装块、不集成）。本块含柱图 ⇒ 宿主页 `assembleDocPage` 的 `charts` 传 `true`。
 *
 *  块内自带两个锚点 `sec-week`／`sec-month`，宿主页的页内导航（`renderTocBlock`）按这两个 id 出项。
 *  `command`＝宿主页本次命令原文（复制日志第 4 段，裁定 7），由 #271 从自己的处理体传进来。 */
export function buildDietOverviewBlock(v: DietOverviewView, command?: string): string {
  return [
    /* #581 · 总览口径行一条一事（本票唯一许写口）：统计口径与今日承接分两条口径行。 */
    renderCaliberLine('本周和本月都统计到昨日为止，不含今日（今天是 ' + v.today + '）。')
    + renderCaliberLine('今日的饮食由「看今日饮食概览」承接。'),
    overviewPeriodBlock('sec-week', '本周累计', v.week),
    overviewPeriodBlock('sec-month', '本月累计', v.month),
    sourceFootnote('📊 数据来源 · 饮食记录 · 本周 ' + v.week.start + ' → ' + v.week.end
      + '／本月 ' + v.month.start + ' → ' + v.month.end + '（都统计到昨日）'),
    command === undefined
      ? ''
      : docCopy(statEnvelope('calorie.view.diet', metricsOf({
        weekTotalCalorie: v.week.totalCalorie, weekAvgCalorie: v.week.avgCalorie,
        weekTotalProtein: v.week.totalProtein, weekLoggedDays: v.week.loggedDays,
        monthTotalCalorie: v.month.totalCalorie, monthAvgCalorie: v.month.avgCalorie,
        monthTotalProtein: v.month.totalProtein, monthLoggedDays: v.month.loggedDays,
      })), command, DB_FILENAME + ' ｜ 饮食记录（统计到昨日）'),
  ].join('');
}
