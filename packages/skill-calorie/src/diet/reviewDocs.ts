/** #273 · 复盘／餐别分布页装配（老实物 `diet_review.html`／`meal_distribution.html` 对照）。
 *
 * 谁在用（写得出哪两个在用）：① `./review.ts` —— `calorie.view.diet-review` 八个唤醒词全出这张页
 * （复盘 6 条＋#275 交过来的「看营养结构」「看今日营养」，后两条由 `buildNutritionRatioBlock` 承载）；
 * ② `#271`（`calorie.view.diet` 的唯一作者）—— 餐别 5 条的区块由本件的 `buildMealDistributionBlock`
 * 交付，集成在它那一边。
 *
 * 老实物对照（`D:\2Study\StudyNotes\SKILLS\卡路里\templates\`，**只读**；同名 `scripts\render_*.py` 是
 * 取数口径的正本，同样只读）：`diet_review.html`＝结论一行／读数卡「总热量·日均热量·总蛋白·日均蛋白」／
 * 每日热量趋势／高频食物 TOP5／来源行；`meal_distribution.html`＝结论一行／读数卡「餐数·日均热量」／
 * 餐别热量占比（环图＋占比条，仅「全部餐别」出）／明细七列／来源行。老侧库表名 `food_log` 按裁定 1
 * 不上屏，来源行写人话「饮食记录」，老那半句「饮食专属复盘」「餐别时间窗推断」留着。
 *
 * 骨架＝`t425-融合基准.md` §五 第 ④ 类；裁定落点：1 页眉只写人话；2 与 2-补 结论句、来源脚注走普通
 * 小字行、不走深底块；3 导航＋口径行＋来源脚注恒出；4 缺值 `—`、零记录仍出完整页；5 单点不成线、
 * 零值不画图元；7 复制区双按钮、日志第 4 段＝本次命令原文。
 */
import {
  renderCaliberLine,
  renderChartBlock,
  renderDataTable,
  renderDistributionRows,
  renderEmptyBlock,
  renderKpiGrid,
  renderTocBlock,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dietUiCss, windowStrip } from './dietUi.js';
import { copyArea, copyLog, dataCopyArea } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import { CalorieRenderError } from '../render/errors.js';
import type { DataTextInput } from 'base-paint';
import type { DietReview } from '../render/analysisPlate.js';
import type { FoodRanking } from './dietEngine.js';

/** envelope 头（值冻结对齐 `cli/keys.ts` 的 ENVELOPE_VERSION／CALORIE_SKILL）与整页 title。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里饮食';

/** 眉标／徽章（§五 第 1 行；**不出命令键**——裁定 1）与餐别口径行（正文里说一次的版本）。 */
const EYEBROW = '卡路里饮食';
const REVIEW_BADGE = '复盘餐别';
const REVIEW_META_LEFT = '饮食复盘饮食';
const MEAL_NOTE = '加餐是下午茶和夜宵';

/** 一位小数（老脚本 `round(x, 1)` 的同款口径；只此一处，两个页面都吃它）。 */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 缺值一律 `—`（裁定 4）：`null`／`undefined`／NaN 都不拿 0 顶替。 */
function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return String(n);
}

/** 各区块外面套一层带锚点的 `<section>`（页内导航的落点，§五 第 4 行）。 */
function anchored(id: string, html: string): string {
  return '<section id="' + id + '">' + html + '</section>';
}

/** 复制区（§五 第 14 行）：双按钮 ＋ 日志六段，第 4 段「调用链」＝本次命令原文（裁定 7）；
 *  `command` 由调用点给（`shared/writeParts.ts` 的 `commandLine()` 派生，含本次 `--params`），
 *  不给就只出「复制数据」——本件不替调用方编一条命令原文。 */
function docCopy(key: string, metrics: Record<string, number | null | undefined>, command?: string): string {
  const envelope: DataTextInput['envelope'] = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key, data: { metrics: metricsOf(metrics) },
  };
  if (command === undefined) return dataCopyArea('复制数据', { envelope });
  return copyArea({
    data: { envelope },
    log: { envelope, copyLog: copyLog({ command, source: '饮食记录', actionAt: nowStamp(), version: DOC_VERSION }) },
  });
}

/** 复盘页入参：`r === null` ＝**窗口为空**那一态（裁定 4，仍出完整页，故起止日必给）；`nutrition`＝
 *  #275 交的 `buildNutritionRatioBlock` 产物（集成在调用点做，本件不引它的取数层）；`command`＝命令原文。 */
export interface DietReviewExtra {
  readonly start: string;
  readonly end: string;
  readonly nutrition?: string | null;
  readonly command?: string;
}

/** 本窗蛋白合计与日均：口径只在这里取一次（老实物「总蛋白／日均蛋白」两张卡都吃它）。 */
function proteinTotals(r: DietReview): { total: number; avg: number | null } {
  if (r.trend.status !== 'ok' || !r.trend.data || r.trend.data.daily.length === 0) return { total: 0, avg: null };
  const total = round1(r.trend.data.daily.reduce((a, d) => a + d.totalProtein, 0));
  return { total, avg: r.loggedDays > 0 ? round1(total / r.loggedDays) : null };
}

/** 结论句（§五 第 3 行，句内含本页读数）：有记录天数／总量／日均／蛋白／达标，一次说完。 */
function reviewSummary(r: DietReview | null, t: { totalCal: number; avgCal: number; complianceDays: number; daysCount: number; calGoal: number | null } | null, protein: { total: number; avg: number | null }): string {
  if (r === null || t === null) return '这段日子没有饮食记录，本页只出空态与口径。';
  const goal = t.calGoal === null
    ? '未设热量目标'
    : '热量目标 ' + t.calGoal + ' 卡，达标 ' + t.complianceDays + '/' + t.daysCount + ' 天';
  return '本窗有记录 ' + r.loggedDays + ' 天：共摄入 ' + t.totalCal + ' 卡，日均 ' + t.avgCal
    + ' 卡。蛋白合计 ' + protein.total + ' 克，日均 ' + fmt(protein.avg) + ' 克，' + goal + '。';
}

/** 复盘页正文（不含页头与导航）：读数卡四张 → 趋势图 → 高频 TOP5 → 按餐汇总 → 营养区块 →
 *  复制区 → 来源脚注；`r === null` 那一态只出空态块＋来源脚注。 */
function reviewBody(r: DietReview | null, top5: FoodRanking | null, extra: DietReviewExtra): string {
  const t = r && r.trend.status === 'ok' && r.trend.data
    ? {
      totalCal: r.trend.data.totalCal, avgCal: r.trend.data.avgCal, complianceDays: r.trend.data.complianceDays,
      daysCount: r.trend.data.daysCount, calGoal: r.trend.data.calGoal, daily: r.trend.data.daily,
    }
    : null;
  const protein = r === null ? { total: 0, avg: null } : proteinTotals(r);
  const start = r === null ? extra.start : r.start;
  const end = r === null ? extra.end : r.end;
  const parts: string[] = [];
  if (r === null) {
    /* 裁定 4 空窗：整页仍是完整页——空态句 ＋ 一句「怎么记第一条」的引导句。 */
    parts.push(anchored('rv-empty', renderEmptyBlock({
      title: '本窗读数',
      text: '这段日子（' + start + ' 至 ' + end + '）一条饮食记录也没有。'
        + '要让它有内容，先用「记一餐」把其中一天吃的东西记上（可带日期与时间），再来复盘。',
    })));
    parts.push(renderCaliberLine('📊 数据来源 · 饮食记录 · 饮食专属复盘 · ' + start + ' → ' + end));
    parts.push(anchored('rv-copy', docCopy('calorie.view.diet-review', { loggedDays: 0 }, extra.command)));
    return parts.join('');
  }
  /* 四张读数卡＝老实物那四张（总热量／日均热量／总蛋白／日均蛋白），标签与顺序逐字对得上。 */
  parts.push(anchored('rv-kpi', renderKpiGrid([
    { label: '总热量', value: t ? String(t.totalCal) : '—', unit: '卡', detail: '按有记录的 ' + r.loggedDays + ' 天合计' },
    { label: '日均热量', value: t ? String(t.avgCal) : '—', unit: '卡/天', detail: '按有记录的天算' },
    { label: '总蛋白', value: String(protein.total), unit: '克', detail: '按有记录的 ' + r.loggedDays + ' 天合计' },
    { label: '日均蛋白', value: fmt(protein.avg), unit: '克/天', detail: '按有记录的天算' },
  ])));
  if (t && t.daily.length >= 2) {
    parts.push(anchored('rv-trend', renderChartBlock({
      kind: 'line',
      title: '每日热量趋势',
      input: {
        items: t.daily.map((d) => ({ label: d.date.slice(5), value: d.totalCal })),
        options: { avgLine: t.avgCal },
      },
    })));
    parts.push(renderCaliberLine('每个点 = 有记录的一天。'));
    parts.push(renderCaliberLine('没记录的日子不当 0 算，图上的空档就是那几天没记。'));
  } else if (t) {
    // 裁定 5：单点不成线 —— 只有一天有记录时不画半截线，改出说明句（锚点照旧，页内导航不指空）。
    parts.push(anchored('rv-trend', renderCaliberLine('本窗只有 1 天有记录，连不成趋势线，这里只把那一天的量写出来：'
      + (t.daily[0]?.date ?? r.start) + ' 摄入 ' + (t.daily[0]?.totalCal ?? 0) + ' 卡。')));
  }
  const top = top5 ? top5.items : [];
  parts.push(anchored('rv-top', renderDataTable({
    columns: [
      { key: 'rank', label: '排名', align: 'right' },
      { key: 'food', label: '食物' },
      { key: 'cal', label: '总热量', align: 'right' },
      { key: 'cnt', label: '次数', align: 'right' },
      { key: 'avg', label: '餐均', align: 'right' },
    ],
    rows: top.slice(0, 5).map((it) => ({
      rank: '#' + it.rank, food: it.foodName, cal: it.totalCal + ' 卡', cnt: it.cnt + ' 次', avg: it.avgCalPerMeal + ' 卡',
    })),
    caption: '高频食物 TOP5',
    emptyText: '本窗无高频食物',
  })));
  parts.push(anchored('rv-meal', renderDataTable({
    columns: [
      { key: 'meal', label: '餐别' },
      { key: 'days', label: '天数', align: 'right' },
      { key: 'cal', label: '累计热量', align: 'right' },
    ],
    rows: r.byMeal.map((s) => ({ meal: s.meal, days: s.days + ' 天', cal: s.totalCalories + ' 卡' })),
    // #496 · 原 caption「按餐汇总（窗口跟 MEAL_WINDOWS · 加餐=下午茶+夜宵）」把常量名送上屏；口径半句挪到下一行小字。
    caption: '按餐汇总',
    emptyText: '本窗无按餐汇总',
  })));
  parts.push(renderCaliberLine('按餐汇总的「天数」＝那一餐有记录的天数。'));
  parts.push(renderCaliberLine(MEAL_NOTE + '。'));
  /* 营养配比（#275 交的具名区块）：本页八个唤醒词共出一页，「看营养结构」「看今日营养」读到的就是这一段。 */
  if (typeof extra.nutrition === 'string' && extra.nutrition !== '') parts.push(extra.nutrition);
  parts.push(anchored('rv-copy', docCopy('calorie.view.diet-review', {
    loggedDays: r.loggedDays, totalCal: t ? t.totalCal : null, avgCal: t ? t.avgCal : null, totalProtein: protein.total,
  }, extra.command)));
  parts.push(renderCaliberLine('📊 数据来源 · 饮食记录 · 饮食专属复盘 · ' + r.start + ' → ' + r.end));
  return parts.join('');
}

/** 复盘页：块位按老实物 `diet_review.html` 摆；`r === null` 即**窗口为空**那一态（裁定 4）。
 *  **库为空**不走这里（那一支仍是取数层的缺失阻断、exit 4，不由页面把口径改掉）。 */
export function buildDietReviewDoc(r: DietReview | null, top5: FoodRanking | null, extra: DietReviewExtra): string {
  const hasNutrition = typeof extra.nutrition === 'string' && extra.nutrition !== '';
  const t = r && r.trend.status === 'ok' && r.trend.data ? r.trend.data : null;
  const nav = r === null
    ? [{ id: 'rv-empty', text: '本窗读数' }, { id: 'rv-copy', text: '复制数据' }]
    : [
      { id: 'rv-kpi', text: '本窗读数' },
      { id: 'rv-trend', text: '每日热量趋势' },
      { id: 'rv-top', text: '高频食物 TOP5' },
      { id: 'rv-meal', text: '按餐汇总' },
      /* 营养区块自带锚点 `sec-kpi`（#275 的块内契约）——这一项指它的图，不指它的读数卡，
         免得整页出现两个 `id="sec-kpi"`（锚点重号是无效文档）。 */
      ...(hasNutrition ? [{ id: 'sec-chart', text: '营养配比' }] : []),
      { id: 'rv-copy', text: '复制数据' },
    ];
  const summary = reviewSummary(r, t, r === null ? { total: 0, avg: null } : proteinTotals(r));
  const start = r === null ? extra.start : r.start;
  const end = r === null ? extra.end : r.end;
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '📝 饮食复盘',
    pageUi: true,
    eyebrow: EYEBROW,
    subtitle: summary,
    metaLeft: REVIEW_META_LEFT,
    badge: REVIEW_BADGE,
    summary,
    content: dietUiCss() + windowStrip(start, end, r === null ? '' : r.loggedDays + ' 天有记录')
      + renderTocBlock({ items: nav }) + reviewBody(r, top5, extra),
    charts: r !== null && t !== null && t.daily.length >= 2,
  });
}

/** 餐别参数值域：老脚本 `render_meal_distribution.py --meal` 的 choices 逐值（breakfast／lunch／
 *  dinner／snack／all），中文名与英文键都收。 */
export const MEAL_PARAMS = ['早餐', '午餐', '晚餐', '加餐', 'all'] as const;
export type MealParam = (typeof MEAL_PARAMS)[number];

/** 参数别名表（**一处**）：中文名是页面上读得到的叫法，英文键是老 CLI 的叫法。 */
const MEAL_ALIAS: Record<string, MealParam> = {
  早餐: '早餐', 午餐: '午餐', 晚餐: '晚餐', 加餐: '加餐',
  breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐',
  all: 'all', 全部: 'all', 全部餐别: 'all',
};

/** 餐别参数读法（**#276 的账**，本件只认值不猜值）：**缺参／未知值一律按用法错走**（`bad-input`
 *  ⇒ exit 2），不编数、也不给默认餐别——老脚本 `--meal` 的缺省 `all` 是那条 CLI 的默认值。 */
export function mealParamOf(raw: unknown): MealParam {
  const key = typeof raw === 'string' ? raw.trim() : '';
  const hit = Object.prototype.hasOwnProperty.call(MEAL_ALIAS, key) ? MEAL_ALIAS[key] : undefined;
  if (hit === undefined) {
    throw new CalorieRenderError('bad-input',
      '缺参数 meal（餐别：' + MEAL_PARAMS.join('／') + '）：' + (key === '' ? '未给' : '收到「' + key + '」'));
  }
  return hit;
}

/** 一支明细行（老实物「明细」七列的字段面）；`time` 为 `HH:MM`，餐别读不出来记 `—`（裁定 4）。 */
export interface MealDistributionItem {
  readonly date: string;
  readonly time: string;
  readonly meal: string;
  readonly food: string;
  readonly grams: number;
  readonly cal: number;
  readonly protein: number;
}

/** 一支占比行（仅「全部餐别」那一支出，老实物 `dist[]`）。 */
export interface MealDistributionSlice {
  readonly label: string;
  readonly count: number;
  readonly cal: number;
  readonly pct: number;
}

/** 餐别页取数结果（`./review.ts` 的 `buildMealDistributionView` 产出；本件只吃它装页）。 */
export interface MealDistributionView {
  readonly start: string;
  readonly end: string;
  readonly days: number;
  readonly meal: MealParam;
  /** 人话餐别名：`全部餐别`／`早餐`／…（老实物 `meta.meal_label`）。 */
  readonly mealLabel: string;
  readonly items: readonly MealDistributionItem[];
  readonly total: number;
  readonly totalCal: number;
  readonly avg: number;
  /** 结论句（§五 第 3 行；调用方放页头的 `summary` 槽）。 */
  readonly oneLine: string;
  readonly dist: readonly MealDistributionSlice[];
}

/** 四色（老实物 `.meal-tag` 与环图分段那两个色表**归一处**）：早餐橙／午餐蓝／晚餐紫／加餐绿。 */
const MEAL_COLORS: Record<string, string> = { 早餐: '#ff9500', 午餐: '#0071e3', 晚餐: '#5856d6', 加餐: '#34c759' };

/** 餐别分布区块（**#271 调用**；本件只交付，集成在它那边）。
 *
 *  - 出什么：读数卡两张（餐数／日均热量）、「全部餐别」那一支的餐别热量占比（环图＋逐餐占比条）、
 *    七列明细表、来源脚注；给了 `command` 再带一节复制区。**结论句不在区块里**——它在页头的
 *    `summary` 槽，调用方用 `v.oneLine`。
 *  - `command`：本次命令原文（`commandLine('calorie.view.diet', params)` 派生，含本次 `--params`）；
 *    宿主页自己已经有复制区就**不要**给（本区块不重复出复制区）。宿主页有环图 ⇒ `charts` 传 `true`。
 *  - 页头建议（裁定 1，不出命令键）：眉标「看餐别分布 · 饮食」／徽章「复盘 · 餐别」／
 *    标题「🍽️ 餐别分布 start ~ end」／结论句 `v.oneLine`。 */
export function buildMealDistributionBlock(v: MealDistributionView, command?: string): string {
  const parts: string[] = [];
  parts.push(anchored('md-kpi', renderKpiGrid([
    { label: '餐数', value: String(v.total), unit: '餐', detail: v.start + ' 至 ' + v.end + '（' + v.days + ' 天）' },
    {
      label: '日均热量',
      /* 裁定 4：这一支一段记录都没有时值位写 `—`，不写 0（0 是「那天真吃了 0 卡」的意思）。 */
      value: v.total > 0 ? String(v.avg) : '—',
      ...(v.total > 0 ? { unit: '卡' } : {}),
      detail: v.total > 0 ? '按窗口 ' + v.days + ' 天算（' + v.mealLabel + '）' : '这一段没有' + v.mealLabel + '的记录',
    },
  ])));
  if (v.meal === 'all' && v.total > 0) {
    // 裁定 5：零值不画图元 —— 环图只画本窗真有记录的那几餐；占比条四行照出（0 也读得出来）。
    const drawn = v.dist.filter((s) => s.cal > 0);
    const top = drawn.reduce((a, b) => (b.pct > a.pct ? b : a), drawn[0] as MealDistributionSlice);
    parts.push(anchored('md-dist', renderChartBlock({
      kind: 'donut',
      title: '餐别热量占比',
      input: {
        items: drawn.map((s) => ({ label: s.label, value: s.cal })),
        options: { showPercent: true, centerLabel: '最高占比', centerValue: top.label + ' ' + top.pct + '%' },
      },
    })));
    parts.push(renderDistributionRows({
      rows: v.dist.map((s) => ({
        label: s.label, value: '共 ' + s.cal + ' 卡，占 ' + s.pct + '%', pct: s.pct, color: MEAL_COLORS[s.label],
      })),
    }));
    parts.push(renderCaliberLine('占比按各餐热量在四餐合计里的份额算。'));
    parts.push(renderCaliberLine(MEAL_NOTE + '。'));
  }
  if (v.items.length === 0) {
    // 裁定 4 空窗：整段仍出完整区块——空态句 ＋ 一句「怎么记第一条」的引导句。
    parts.push(anchored('md-table', renderEmptyBlock({
      title: '明细',
      text: '这一段（' + v.start + ' 至 ' + v.end + '）没有' + v.mealLabel + '的记录。'
        + '要让它有内容，用「记一餐」把那一顿记上（时间落在这一餐的时段里，就会归到这一支）。',
    })));
  } else {
    parts.push(anchored('md-table', renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'time', label: '时间' },
        { key: 'meal', label: '餐次' },
        { key: 'food', label: '食物' },
        { key: 'grams', label: '克数', align: 'right' },
        { key: 'cal', label: '热量', align: 'right' },
        { key: 'protein', label: '蛋白', align: 'right' },
      ],
      rows: v.items.map((it) => ({
        date: it.date, time: it.time, meal: it.meal, food: it.food,
        grams: it.grams + ' 克', cal: it.cal + ' 卡', protein: it.protein + ' 克',
      })),
      caption: '明细（共 ' + v.items.length + ' 条）',
      emptyText: '这一段没有' + v.mealLabel + '的记录',
    })));
  }
  parts.push(renderCaliberLine('📊 数据来源 · 饮食记录 · 餐别时间窗推断 · ' + v.start + ' → ' + v.end));
  if (command !== undefined) {
    parts.push(anchored('md-copy', docCopy('calorie.view.diet', {
      days: v.days, total: v.total, totalCal: v.totalCal, avg: v.avg,
    }, command)));
  }
  return parts.join('');
}
