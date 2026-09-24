/** #401m · 主页族**按视图分**的内容件（`calorie.view.home` 的 `section` 参数）。
 *
 * 问题（用户一眼看见的）：场景 01 的五条主页唤醒词出的是**同一份页**（只差复制载荷里的时间戳与命令原文），
 * 验收墙并排铺开就是四张一模一样的图。老技能当年是 `--section` 出不同视图，本件照这条口径补回来：
 * `section` 决定这一页**拿哪一块当主角**，区块的取舍与页名、结论句全部随它变。
 *
 * 五档（路由声明逐条给值，见 `src/home/routes.ts` order 0／5／6／7／8）：`overview` 今日主页＝今日四读数 ＋
 * 「每日摄入」折线 ＋「按日汇总」表（#401 样板页，**逐字不变**）；`week` 本周主页＝窗内读数 ＋ 折线 ＋
 * 逐日数值行；`streak` 连续记录天数＝**连续记录**为第一主角（连续天数卡片打头、窗内记录天数、最长连续、断点）；
 * `budget` 今日热量预算＝**剩余预算**为第一主角（还剩多少、目标减已摄入、与消耗的关系）；`month` 本月主页＝与
 * `week` **同一支**装配、窗口 30 天、页名随之改。
 *
 * 分工：本件只给**内容**（区块清单与各档文本）；页框接线、KPI 卡件、折线块、逐日表仍住 `homeDocs.ts`
 * （同一能力目录内的姊妹件，不对外），由 `homeDocs.ts` 逐档拼页并把卡件 HTML 传进来。区块形状一律走公共层
 * 产出器（`renderKpiGrid` 一族由调用方调、`renderDataTable`／`renderChartBlock`／`renderListRows`），
 * 本件不写 `font-size`／`color`。
 *
 * **#950**（用户裁定：主页照已认可原型 `proto-final-A+C.html` 重做）：本件跟着改三处——
 * ① 五档的区块身份各补一枚**导航图标**（`nav`，公共层 `SEG_NAV_ICONS` 闭集内的值），
 *  页内导航由胶囊排换成**分段控件**（动作形 vs 状态形的区分见 `pageNav` 件头），锚点清单仍是这一份；
 * ② `overview` 档的「今日速览」补一行**前提说明**（几项、目标取哪一版配置），与原型那张小字同义；
 * ③ 缺口那条两段关系（摄入加缺口等于消耗）改由**等式条**承载，落在这一块末尾。
 */
import { escapeHtml } from 'base-paint';
import type { SegNavIcon } from 'base-paint';
import { renderChartBlock, renderDataTable, renderDistributionRows, renderListRows } from 'base-paint/blocks';
import { seriesSum } from '../analysis/series.js';
import type { DaySeries } from '../analysis/series.js';
import { equationBlock, todayCards } from './homeCards.js';
import type { HomeNavItem } from './homeFrame.js';
import type { HomeData } from './home.js';

/** 视图档名（`section` 参数的五个合法值；登记在 `src/home/routes.ts` 的 `cli` 里）。 */
export type HomeSection = 'overview' | 'week' | 'streak' | 'budget' | 'month';

/** 合法档名的**唯一清单**（`today.ts` 拿它挡非法值；与路由声明的 `cli` 逐字同值）。 */
export const HOME_SECTIONS: readonly HomeSection[] = ['overview', 'week', 'streak', 'budget', 'month'];

/** 分档内容件的入参：窗口数据 ＋ 调用方给的四支卡件 HTML（卡件里要 `pctStatus` 一族，住 `homeDocs.ts`）。 */
export interface HomeViewInput {
  readonly d: HomeData;
  readonly todayCards: string;
  readonly weekCards: string;
  readonly streakCards: string;
  readonly budgetCards: string;
  /** 单日日期上屏刻度（`overview` 档用；不给＝原样打印 ISO）。 */
  readonly day?: (date: string) => string;
}

/** 分档内容件对外给的一件：正文区块 ＋ 是否带图表 ＋ 页内导航项（三件同源，锚点与标题不抄第二份）。 */
export interface HomeViewBody {
  readonly sections: readonly string[];
  readonly charts: boolean;
  readonly toc: readonly HomeNavItem[];
}

/* ── 区块身份（每档自己的一份清单）───────────────────────────────────────────
 * 锚点 id／图标／名三件同走一份，页内导航与段标题不抄第二遍（口径同 `homeDocs.ts` 的 `SEC_*`）。
 * #401g 立下的「emoji 只留段标题一处、每块一枚」在本件各档一并照办。
 * #950：每个身份多一枚 `nav` ＝ 页内导航那枚**描边/实底图标**（公共层闭集），与段标题那枚 emoji 分住两处：
 *  段标题的 emoji 是「这块是什么」，导航的图标是「点这个去哪」——两套图形共用一套清单就够。 */

const OVERVIEW_SECTIONS = {
  overview: { id: 'sec-overview', icon: '🔥', name: '今日速览', nav: 'grid' },
  trend: { id: 'sec-trend', icon: '📈', name: '每日摄入', nav: 'line' },
  daily: { id: 'sec-daily', icon: '📊', name: '按日汇总', nav: 'table' },
} as const;

const WEEK_SECTIONS = {
  week: { id: 'sec-week', icon: '📅', name: '窗内概览', nav: 'grid' },
  trend: { id: 'sec-trend', icon: '📈', name: '每日摄入', nav: 'line' },
  days: { id: 'sec-days', icon: '📋', name: '逐日明细', nav: 'table' },
} as const;

const STREAK_SECTIONS = {
  streak: { id: 'sec-streak', icon: '🏅', name: '连续记录', nav: 'goal' },
  daily: { id: 'sec-daily', icon: '📊', name: '按日汇总', nav: 'table' },
} as const;

const BUDGET_SECTIONS = {
  budget: { id: 'sec-budget', icon: '🎯', name: '今日预算', nav: 'goal' },
  quota: { id: 'sec-quota', icon: '🧮', name: '今日账', nav: 'table' },
} as const;

/** 段标题的**文本形状**（图标 ＋ 空格 ＋ 名）：与 `homeDocs.ts::secTitle` 同形；两件各有一份清单，
 *  因为两件管的区块不同，形状判据（emoji 每块一枚）逐字一致。 */
export function partTitle(section: { readonly icon: string; readonly name: string }): string {
  return section.icon + ' ' + section.name;
}

/* ── 共用小区块 ──────────────────────────────────────────────────────────── */

/** 数字格式化（缺值写 `—`，与全页缺值口径同）。 */
function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : String(n);
}

/** 视图中段的一条事实句（纯文本单参；形状走公共层口径行，本件不写样式）。 */
function factLine(text: string): string {
  return '<p class="ilife-block-caliber">' + escapeHtml(text) + '</p>';
}

/** 「今日账」那一块的正文：预算用掉的占比条走公共层 `renderDistributionRows`（名称｜条｜数值 三栏），
 *  底下三笔账走公共层 `renderListRows`（标签｜值）——**本件不写样式、不自造条壳**（`renderMiniBar` 一族
 *  是公共层的占比图形，本件只调不给色）。没设目标时不给占比条（没目标可比的占比是假信息）。 */
function quotaBlock(d: HomeData): string {
  const cal = d.daily.totals.cal;
  const goal = d.calorieGoal;
  const bar = d.caloriePct === null || d.caloriePct === undefined
    ? ''
    : renderDistributionRows({ rows: [
      { label: '热量预算用掉', value: Math.round(d.caloriePct) + '%', pct: d.caloriePct },
    ] });
  return bar + renderListRows({
    items: [
      { main: '已摄入', right: fmt(cal) + ' 卡' },
      { main: '目标', right: goal === null || goal === undefined ? '未设目标' : goal + ' 卡' },
      { main: '今日消耗', right: fmt(d.burnToday) + ' 卡' },
    ],
    emptyText: '今日还没有账',
  });
}

/** 折线块（`overview`／`week`／`month` 三档共用）：`connectNulls: true` 与全仓另外 4 处口径同
 *  —— 空白日留空、只连线，不补 0；虚线是周均摄入（只算有记录的天）。
 *  **纵轴下界恒 0**（`yMin: 0`）：只记了一天时序列只剩一个值，公共层的自适应量程会把它夹成
 *  「860～861」这样一根贴顶的空轴（原型那张图的量程是 0～900）；摄入量这类「没有负数、零点有意义」的
 *  读数按下界 0 起画，同 #544 运动族 `valueAxisOf()` 的「下界恒 0＋上界＝步长×（条数−1）」那条口径。 */
function chartSection(series: DaySeries[], avgIntake: number | null, day: (date: string) => string): string {
  return '<section id="' + WEEK_SECTIONS.trend.id + '">' + renderChartBlock({
    kind: 'line',
    title: partTitle(WEEK_SECTIONS.trend),
    input: {
      items: series.map((s) => ({ label: day(s.date), value: s.calories })),
      options: {
        connectNulls: true, yMin: 0,
        yTicks: 3, labels: 'select', format: (v: number) => String(Math.round(v)),
        markLine: { value: avgIntake ?? undefined, label: '周均' },
      },
    },
  }) + factLine('这条虚线是周均摄入，只算有记录的天。') + '</section>';
}

/** 按日表的行（两档共用）：倒序＝最近的一天在最上；今日那行标记「（今日）」（`DataTableInput`
 *  没有行标记槽，故走文本）；空记录日写 `—`。`logged` 给了就出一列「记录情况」——`streak` 档那一列是主角。 */
function dayRows(input: HomeViewInput, logged?: (s: DaySeries) => string): Readonly<Record<string, unknown>>[] {
  const { d } = input;
  const day = input.day ?? ((x: string) => x);
  return d.week.series.slice().reverse().map((s) => ({
    date: s.date === d.date ? day(s.date) + '（今日）' : day(s.date),
    cal: s.calories ?? '—',
    ...(logged === undefined ? { deficit: s.deficit ?? '—' } : { logged: logged(s) }),
  }));
}

const DAY_COLS = [
  { key: 'date', label: '日期' },
  { key: 'cal', label: '摄入（卡）', align: 'right' as const },
];

/** 按日汇总表（`overview` 档）：日期／摄入／缺口三列。 */
function dailyTable(input: HomeViewInput): string {
  return renderDataTable({
    columns: [...DAY_COLS, { key: 'deficit', label: '缺口（卡）', align: 'right' }],
    rows: dayRows(input),
    caption: partTitle(OVERVIEW_SECTIONS.daily),
    emptyText: '本窗无按日汇总',
  });
}

/** 记录情况表（`streak` 档）：日期／摄入／记录情况三列——**记录情况**是这一档的主角，逐日看得见
 *  哪一天断了；与 `overview` 的「缺口」列不同列、不同表名，两份产物逐行不同。 */
function recordTable(input: HomeViewInput): string {
  const logged = (s: DaySeries): string => (s.calories === null || s.calories === undefined ? '无记录' : '有记录');
  return renderDataTable({
    columns: [...DAY_COLS, { key: 'logged', label: '记录情况' }],
    rows: dayRows(input, logged),
    caption: partTitle(STREAK_SECTIONS.daily),
    emptyText: '本窗无按日汇总',
  });
}

/* ── 各档的计算（同窗口数据、不同读法）────────────────────────────────────── */

/** 某天有没有数据（本件各档的「有记录」判据只有这一处）。 */
function hasData(s: DaySeries): boolean {
  return s.calories !== null && s.calories !== undefined;
}

/** 窗口内**最长**的连续记录天数（`series` 是唯一源，与 `home.ts::streakFromSeries` 同口径）——
 *  `streak` 档拿它与当前连续天数并列，「断了没有」这件事要两个数才说得清。 */
function longestRun(series: DaySeries[]): number {
  let best = 0;
  let run = 0;
  for (const s of series) {
    run = hasData(s) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** 窗口内**最近一个没有记录的日子**（＝断点；今天之前的那一天为准）。全窗有记录即 `null`。 */
function lastGap(series: DaySeries[]): string | null {
  let gap: string | null = null;
  for (const s of series.slice(0, -1)) {
    if (!hasData(s)) gap = s.date;
  }
  return gap;
}

/** 连续记录档的头条几句：起点说得清、断点给得出日子，读者不必自己数格子。
 *  **一条一句一行**（不拼 `；` 串——`；` 表示该内容还欠一次版式设计，见 `.scratch/sep-audit/probe.mjs` 口径）。
 *  返数组，由调用方逐句过 `factLine()`；今天没记录时只有一句。 */
function streakLead(d: HomeData): readonly string[] {
  if (d.streakDays === 0) return ['今天还没有记录——记一餐就从今天起算。'];
  const first = d.week.series[d.week.series.length - d.streakDays]?.date ?? d.date;
  const gap = lastGap(d.week.series);
  return [
    '连续记录从 ' + first + ' 起到今天，' + d.streakDays + ' 天没有断。',
    gap === null ? '窗内没有断点。' : '上一个断点是 ' + gap + '。',
  ];
}

/** 一个区块的开头：`<section id=…>` ＋ 段标题（KPI 网格那三块没有标题槽，标题由本页自产）。 */
function openSection(sec: { readonly id: string; readonly icon: string; readonly name: string }): string {
  return '<section id="' + sec.id + '"><h2 class="ilife-block-kpi-card-title">' + partTitle(sec) + '</h2>';
}

/** 页内导航项清单（逐档自己那三块／两块，锚点与段标题同源）：id／名／图标三件一起转，
 *  图标那枚从各档身份对象的 `nav` 位取（`#950` 起导航走分段控件，每格带一枚图标）。 */
function tocOf(
  list: readonly { readonly id: string; readonly name: string; readonly nav: SegNavIcon }[],
): HomeViewBody['toc'] {
  return list.map((s) => ({ id: s.id, text: s.name, icon: s.nav }));
}

/* ── 各档的正文（区块清单 ＋ 页内导航项，两份同源）────────────────────────── */

/** `overview` 档：今日速览 ＋ 折线 ＋ 按日汇总。`#950` 起「今日速览」是原型那六张卡，
 *  卡下补一条等式条（摄入＋缺口＝消耗）——它在原型的缺口卡里，此处按「一行说不完的关系让它出自己的形」
 *  落成独立块；先前那行「今日 N 项」的前提说明同原型（说的是这一块摆了几项、目标取哪一版配置）。 */
function overviewBody(input: HomeViewInput): HomeViewBody {
  const { d } = input;
  const day = input.day ?? ((x: string) => x);
  const charts = d.week.series.some(hasData);
  const sections: string[] = [
    openSection(OVERVIEW_SECTIONS.overview)
      + factLine('今日 ' + todayCards(d).length + ' 项，目标取当前配置。')
      + input.todayCards + equationBlock(d) + '</section>',
  ];
  if (charts) sections.push(chartSection(d.week.series, d.week.avgIntake, day));
  sections.push('<section id="' + OVERVIEW_SECTIONS.daily.id + '">' + dailyTable(input)
    + factLine('缺口是消耗减摄入的差。缺数一律写 —。') + '</section>');
  return {
    sections, charts,
    toc: tocOf(charts
      ? [OVERVIEW_SECTIONS.overview, OVERVIEW_SECTIONS.trend, OVERVIEW_SECTIONS.daily]
      : [OVERVIEW_SECTIONS.overview, OVERVIEW_SECTIONS.daily]),
  };
}

/** `week`（`month` 同支）：窗内读数 ＋ 折线 ＋ 逐日数值行——一周七天逐天一行，与三列汇总表不同形。 */
function weekBody(input: HomeViewInput): HomeViewBody {
  const { d } = input;
  const day = input.day ?? ((x: string) => x);
  const charts = d.week.series.some(hasData);
  const sections: string[] = [openSection(WEEK_SECTIONS.week) + input.weekCards + '</section>'];
  if (charts) sections.push(chartSection(d.week.series, d.week.avgIntake, day));
  // 这一块**要段标题**：页内导航里有 `#sec-days` 这一项（标题文本也是「逐日明细」），锚点若落到一个
  // 没有可见标题的 `<section>` 上，读者点过去只见一片清单、认不出这块叫什么（清单产出器无标题槽）。
  sections.push(openSection(WEEK_SECTIONS.days) + renderListRows({
    items: d.week.series.slice().reverse().map((s) => ({
      main: s.date === d.date ? day(s.date) + '（今日）' : day(s.date),
      right: hasData(s) ? s.calories + ' 卡' : '无记录',
    })),
    emptyText: '本窗没有逐日明细',
  }) + factLine('逐日一行：那天摄入多少卡，没记录的那天写无记录。') + '</section>');
  return {
    sections, charts,
    toc: tocOf(charts
      ? [WEEK_SECTIONS.week, WEEK_SECTIONS.trend, WEEK_SECTIONS.days]
      : [WEEK_SECTIONS.week, WEEK_SECTIONS.days]),
  };
}

/** `streak` 档：连续记录是**第一主角**（打头一张卡就是连续天数）＋ 窗内记录天数对照 ＋ 最长连续 ＋ 断点。 */
function streakBody(input: HomeViewInput): HomeViewBody {
  const { d } = input;
  const best = longestRun(d.week.series);
  return {
    sections: [
      openSection(STREAK_SECTIONS.streak)
        + streakLead(d).map(factLine).join('') + input.streakCards
        + factLine('连续记录只算有饮食记录的天。当前 ' + d.streakDays + ' 天，窗内最长 ' + best + ' 天。')
        + '</section>',
      '<section id="' + STREAK_SECTIONS.daily.id + '">' + recordTable(input)
        + factLine('记录情况只看那一天有没有数据。缺数一律写 —。') + '</section>',
    ],
    charts: false,
    toc: tocOf([STREAK_SECTIONS.streak, STREAK_SECTIONS.daily]),
  };
}

/** `budget` 档：剩余预算是**第一主角**（打头一张卡 ＋ 页首结论句都说它），另给今日账一笔。 */
function budgetBody(input: HomeViewInput): HomeViewBody {
  const { d } = input;
  const cal = d.daily.totals.cal;
  const goal = d.calorieGoal;
  const left = goal === null || goal === undefined ? null : goal - cal;
  return {
    sections: [
      openSection(BUDGET_SECTIONS.budget)
        + factLine(left === null
          ? '热量目标还没有，先在「定营养目标」里设一个。'
          : left >= 0
            ? '目标减去已摄入，今天还能吃 ' + left + ' 卡。'
            : '目标已经用满，还超出了 ' + -left + ' 卡。')
        + input.budgetCards + '</section>',
      openSection(BUDGET_SECTIONS.quota) + quotaBlock(d)
        + factLine('预算是目标这一侧的账：已摄入从目标里扣，消耗不顶预算。') + '</section>',
    ],
    charts: false,
    toc: tocOf([BUDGET_SECTIONS.budget, BUDGET_SECTIONS.quota]),
  };
}

/** 五档正文的收口表：档名 → 正文装配（`month` 与 `week` 同支，窗口由 `windowDays` 给）。 */
export const HOME_VIEW_BODIES: Readonly<Record<HomeSection, (input: HomeViewInput) => HomeViewBody>> = {
  overview: overviewBody,
  week: weekBody,
  streak: streakBody,
  budget: budgetBody,
  month: weekBody,
};

/* ── 页名与结论句（也随档变）────────────────────────────────────────────── */

/** 五档的**页名**（页头 H1）：只说这一页拿哪一块当主角——窗口区间全页只住副题一处，不在这里复述。 */
export function viewTitle(section: HomeSection, d: HomeData): string {
  switch (section) {
    case 'overview': return d.week.windowDays <= 1 ? '今日总览' : '近 ' + d.week.windowDays + ' 天总览';
    case 'week': return '本周主页';
    case 'streak': return '连续记录 ' + d.streakDays + ' 天';
    case 'budget': return '今日热量预算';
    case 'month': return '本月主页';
    default: return '今日总览';
  }
}

/** 五档的**结论句**（读序＝标题 → 一句结论 → 数字卡）：每档说各自主角那件事，不复述别档的读数。
 *  **今天还没有记录**时（`entryCount === 0`）`overview`／`budget` 两档不给「在目标内／还剩多少」那类
 *  判语：那一天没有摄入读数，说「热量在目标内」是**替没记的那顿背书**（实跑抓到），换成一句人话。 */
export function viewConclusion(section: HomeSection, d: HomeData): string {
  const cal = d.daily.totals.cal;
  const goal = d.calorieGoal;
  if ((section === 'overview' || section === 'budget') && d.daily.entryCount === 0) {
    return '今天还没有记录。记一餐，完成度与缺口就有数了。';
  }
  if (section === 'streak') {
    return d.streakDays === 0
      ? '今天还没有记录，连续记录今天会断。'
      : '连续记录已经 ' + d.streakDays + ' 天，今天继续记就不会断。';
  }
  if (section === 'budget') {
    if (goal === null || goal === undefined) return '热量目标还没有，先在「定营养目标」里设一个。';
    const left = goal - cal;
    return left < 0 ? '今日已超热量目标 ' + -left + ' 卡，明天把摄入压回目标内。' : '今日预算还剩 ' + left + ' 卡。';
  }
  if (section === 'week' || section === 'month') {
    return '窗内有记录 ' + d.week.loggedDays + ' 天，日均摄入 ' + fmt(d.week.avgIntake) + ' 卡。';
  }
  if (goal === null || goal === undefined) return '热量目标还没有，先在「定营养目标」里设一个。';
  const left = goal - cal;
  return left < 0
    ? '今日已超热量目标 ' + -left + ' 卡，明天把摄入压回目标内。'
    : '热量在目标内，距目标还差 ' + left + ' 卡。';
}
