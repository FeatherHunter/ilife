/** #393 · 今日饮食页装配（`calorie.today`，today_diet.html 对照）。
 *
 * 原地搬自 `src/render/dietDocs.ts`：本票只换住处，函数体与注释原样照抄，产物逐字节不变。
 * 服务页面类：② 条目列表页。
 */
import { renderCaliberLine, renderChartBlock, renderEmptyBlock, renderKpiGrid, renderDataTable, renderTocBlock } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dietUiCss, windowStrip } from './dietUi.js';
import { copyArea, copyLog, dataCopyArea } from '../shared/copyArea.js';
import { sourceLine } from '../shared/sourceLine.js';
import { nowStamp } from '../render/receipt.js';
import { inferMealType } from '../fetch/diet.js';
import { buildMealDistributionBlock } from './reviewDocs.js';
import { buildDietOverviewBlock } from './nutritionPortDocs.js';
import type { DataTableColumn } from 'base-paint/blocks';
import type { DataTextInput } from 'base-paint';
import type { MealDistributionView } from './reviewDocs.js';
import type { DietOverviewView } from './nutritionPort.js';
import type { DietMealRow } from '../render/dietDocs.js';
import type { MacroRatio } from './dietEngine.js';
import type { DietOverview, MealDistribution } from '../render/diet.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·饮食';

/** 餐别口径一行（正文里说一次的版本，不带常量名；口径出处见 `render/dietDocs.ts` 的 `MEAL_NOTE`）。 */
const MEAL_NOTE = '加餐时段：下午茶、夜宵';

/* ── 今日饮食（today_diet.html 对照：餐次进度＋营养配比＋今日明细） ── */

export interface TodayDietDocInput {
  overview: DietOverview;
  dist: MealDistribution;
  meals: DietMealRow[];
  macro: MacroRatio | null;
  /** 只看有备注的那一支（`calorie.today` 的 `hasNote:true`）：标题写明筛选口径，明细多一列「备注」。 */
  hasNote?: boolean;
  /** 本次命令原文（复制日志第 4 段，裁定 7）；由 `src/diet/today.ts` 的 `viewToday` 传 `commandLine()`。 */
  readonly command?: string;
}

/** #496 · 「只看有备注的」那一页的空态页（`calorie.today` 带 `hasNote:true` 而当天一条备注都没有时）。
 *
 *  这一支不是取数失败：筛「有备注的」筛出 0 条是**正常结果**（这天就是没写备注），不该落
 *  「ERR 4 取数失败（缺失阻断）」把整页顶掉——照 `t425` 裁定 4 出完整空页（标题＋空态句＋
 *  一句「怎么让记录带备注」的引导句），空态不出复制按钮（同 `裁定 5` 的空态口径）。 */
export function buildTodayNoteEmptyDoc(date: string): string {
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '今日饮食 · 只看有备注的',
    eyebrow: '卡路里 · 饮食',
    subtitle: MEAL_NOTE,
    content: dietUiCss() + windowStrip(date, date)
      + renderEmptyBlock({
        title: '今天没有带备注的记录',
        text: '记的时候带一句备注（例如「午餐 鸡胸 150 克 备注：煎的，少油」），这一页就会出现它。',
      }),
    charts: false,
  });
}

export function buildTodayDietDoc(input: TodayDietDocInput): string {
  const { overview: o, dist, meals, macro } = input;
  const onlyNote = input.hasNote === true;
  const names = new Set(meals.map((m) => m.food_name));
  const kpis = renderKpiGrid([
    { label: '当日摄入', value: String(o.totalCalories), unit: '卡', detail: '目标 ' + o.calorieGoal + ' 卡' },
    { label: '餐数', value: String(meals.length), unit: '条', detail: names.size + ' 个品种' },
    { label: '热量目标', value: String(o.calorieGoal), unit: '卡', detail: '剩余 ' + (o.calorieGoal - o.totalCalories) + ' 卡' },
    { label: '餐别覆盖', value: dist.slices.filter((s) => s.count > 0).length + '/' + dist.slices.length },
  ]);
  /* §五 第 4 行：页内导航（只列真会出的区块——点不到的项就是死链接）。 */
  const distChart = dist.totalCalories > 0;
  const macroChart = macro !== null && Boolean(macro.protein || macro.carb || macro.fat);
  const parts: string[] = [dietUiCss(), windowStrip(o.start, o.start, meals.length + ' 条'), renderTocBlock({
    items: [
      { id: 'td-kpi', text: '读数' },
      ...(distChart ? [{ id: 'td-dist', text: '各餐热量' }] : []),
      ...(macroChart ? [{ id: 'td-macro', text: '营养配比' }] : []),
      { id: 'td-table', text: '今日明细' },
      { id: 'td-copy', text: '复制区' },
    ],
  }), anchored('td-kpi', kpis)];
  let charts = false;
  if (distChart) {
    parts.push(anchored('td-dist', renderChartBlock({
      /* #496 · 原标题「餐别热量占比」画的是四餐的卡数、也没有百分比（审查件第 69 条）⇒ 改「各餐热量（卡）」。 */
      kind: 'bar',
      title: '各餐热量（卡）',
      input: { items: dist.slices.map((s) => ({ label: s.meal, value: s.calories })) },
    })));
    charts = true;
  }
  if (macroChart) {
    parts.push(anchored('td-macro', renderChartBlock({
      kind: 'donut',
      title: '营养配比',
      input: {
        items: [
          { label: '蛋白', value: macro.protein ? macro.protein.pct : 0 },
          { label: '碳水', value: macro.carb ? macro.carb.pct : 0 },
          { label: '脂肪', value: macro.fat ? macro.fat.pct : 0 },
        ],
        options: { showPercent: true },
      },
    })));
    charts = true;
  }
  parts.push(anchored('td-table', renderDataTable({
    columns: [
      { key: 'time', label: '时间' },
      { key: 'meal', label: '餐别' },
      { key: 'food', label: '食物' },
      { key: 'grams', label: '克数', align: 'right' },
      { key: 'cal', label: '热量', align: 'right' },
      { key: 'pro', label: '蛋白', align: 'right' },
      { key: 'carbs', label: '碳水', align: 'right' },
      { key: 'fat', label: '脂肪', align: 'right' },
      /* #271 · 备注列**恒出**：老实物 `today_meals.html:168` 的明细九列末列就是备注（空值出空串），
         融合基准 `t425-融合基准.md` §五 第 9 行也把「主表／主列表（含备注列）」写成恒出。
         #496 当年只在「只看有备注的」那一支加过它（件里旧注释记的理由是「普通今日页多数行没备注、
         多一列空栏」）；本票按老实物与样张口径改回恒出，缺值一律 `—`（裁定 4），不是空栏。 */
      { key: 'note', label: '备注' },
    ],
    /* 裁定 4／移植清单 9：时间只显示到分、缺值写 `—`；备注缺值同样写 `—`（老实物空备注出空串）。 */
    rows: meals.map((m) => ({
      time: minuteOf(m.time), meal: inferMealType(String(m.time ?? '')), food: m.food_name,
      grams: m.grams, cal: m.calories, pro: m.protein, carbs: m.carbs, fat: m.fat,
      note: noteOf(m.note),
    })),
    caption: '今日明细（共 ' + meals.length + ' 条）',
    emptyText: onlyNote ? '今天没有带备注的记录' : '本日无明细',
  })));
  /* §五 第 14 行：复制区（双按钮；`command` 不在时只出「复制数据」，不留死按钮）。 */
  parts.push(anchored('td-copy', listPageCopy({
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.today',
    data: {
      items: meals.map((m) => ({
        date: m.date, time: m.time, food_name: m.food_name, grams: m.grams,
        calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat,
      })),
      total: meals.length,
    },
  }, input.command)));
  /* §五 第 13／15 行：口径说明行（图下那一条已在图下说过，这里说缺值口径）＋ 来源脚注一行。 */
  parts.push(renderCaliberLine(MEAL_NOTE + '；本页缺值一律写成 —，不当成 0 卡。'));
  parts.push(sourceLine({ source: '饮食记录', start: o.start, end: o.start, count: meals.length }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    /* #496 · 页名（唤醒词「看有备注的饮食记录」）承诺看的是有备注的记录，标题原写「今日饮食 〈日期〉」，
       读者看不出这是一张筛过的页（审查件第 67 条）⇒ 这一支把筛选口径写进标题。 */
    title: '今日饮食' + (onlyNote ? ' · 只看有备注的' : ''),
    /* #496 · 眉标原写命令键「calorie.today · 饮食域」（裁定 1 不上屏）⇒ 改中文族名。 */
    eyebrow: '卡路里 · 饮食',
    /* #496 · 副题原本整句就是常量名那一串；现在只留口径小字（加餐是哪两顿），与「餐别覆盖」卡
       不再各说一遍。裁定 2：结论句（句内含本页读数）也走这一槽，排在标题下第一行。 */
    subtitle: '这天记了 ' + meals.length + ' 条、共 ' + o.totalCalories + ' 卡，目标 '
      + o.calorieGoal + ' 卡（' + MEAL_NOTE + '）。',
    content: parts.join(''),
    charts,
  });
}

/* ── ② 条目列表页族共用件（今日页 ＋ `calorie.view.diet` 的窗口页同吃一份） ── */

/** 区块外面套一层带锚点的 `<section>`（页内导航 `renderTocBlock` 的落点）。 */
function anchored(id: string, html: string): string {
  return '<section id="' + id + '">' + html + '</section>';
}

/** 时间只显示到分（老口径 `today_meals.html:326`／`:331` 的 `.slice(0,5)`）；
 *  缺值按裁定 4 写 `—`，不写空串（本件 `:78` 原写的 `m.time ?? ''` 就是裁定点名的旧写法）。 */
export function minuteOf(time: string | null | undefined): string {
  const s = String(time ?? '').trim();
  return s === '' ? '—' : s.slice(0, 5);
}

/** 备注原文：空／缺一律 `—`（裁定 4；老实物空备注出空串、样张写 `—`，本仓取样张口径）。
 *  取数已带 `note`（`src/fetch/diet.ts:289`），页面只负责把它长成一列。 */
export function noteOf(note: string | null | undefined): string {
  const s = String(note ?? '').trim();
  return s === '' ? '—' : s;
}

/** 明细列（老实物 `today_meals.html:168` 的九列＝日期时间／餐次／食物／克数／热量／蛋白／碳水／脂肪／
 *  **备注**；样张 `t425-样张-今日饮食.html` 表头逐字同此）。列面只准有一处，两页共用本常量。 */
export const DIET_LIST_COLUMNS: readonly DataTableColumn[] = [
  { key: 'when', label: '日期时间' },
  { key: 'meal', label: '餐别' },
  { key: 'food', label: '食物' },
  { key: 'grams', label: '克数', align: 'right' },
  { key: 'cal', label: '热量', align: 'right' },
  { key: 'pro', label: '蛋白', align: 'right' },
  { key: 'carbs', label: '碳水', align: 'right' },
  { key: 'fat', label: '脂肪', align: 'right' },
  { key: 'note', label: '备注' },
];

/** 复制区（§五 第 14 行）：双按钮 ＋ 日志六段，第 4 段「调用链」＝本次命令原文（裁定 7）；
 *  `command` 由调用点给（`shared/writeParts.ts` 的 `commandLine()` 派生，含本次 `--params`），
 *  不给就只出「复制数据」——本件不替调用方编一条命令原文，也不留点不动的第二颗按钮。 */
export function listPageCopy(envelope: DataTextInput['envelope'], command?: string): string {
  if (command === undefined) return dataCopyArea('复制数据', { envelope });
  return copyArea({
    data: { envelope },
    log: { envelope, copyLog: copyLog({ command, source: '饮食记录', actionAt: nowStamp(), version: DOC_VERSION }) },
  });
}

/* ── `calorie.view.diet` 的另外两支：餐别页／总览页（页框住本件，区块由 #273／#275 交付） ── */

/** 餐别筛选那一支（老实物 `meal_distribution.html` 对照）：② 类骨架的页框 ＋ #273 交付的
 *  `buildMealDistributionBlock`。区块自带锚点与来源脚注，故本件只补页内导航与页框；
 *  区块里有环图 ⇒ `charts` 传 `true`（#273 交接的默认行为）。
 *
 *  接线现状：命令面带 `meal` 参数进来才出这一页（参数名是 #276 的账，本件不猜）；参数没到之前
 *  `buildViewDietDoc` 走窗口词那一支。 */
export function buildMealDistributionPage(v: MealDistributionView, command?: string): string {
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '餐别分布',
    eyebrow: '卡路里 · 饮食',
    /* §五 第 3 行：结论句走页头副题槽（#273 的区块不出结论句，它把 `v.oneLine` 交给宿主）。 */
    subtitle: v.oneLine,
    content: dietUiCss() + windowStrip(v.start, v.end, v.days + ' 天') + renderTocBlock({
      items: [
        { id: 'md-kpi', text: '读数' },
        ...(v.meal === 'all' && v.total > 0 ? [{ id: 'md-dist', text: '餐别热量占比' }] : []),
        { id: 'md-table', text: '明细' },
        ...(command === undefined ? [] : [{ id: 'md-copy', text: '复制区' }]),
      ],
    }) + buildMealDistributionBlock(v, command),
    charts: true,
  });
}

/** 「看饮食总览」那一支（老实物 `diet_overview.html` 对照）：② 类骨架的页框 ＋ #275 交付的
 *  `buildDietOverviewBlock`（本周／本月累计，都统计到昨日）。区块自带 `sec-week`／`sec-month`
 *  两个锚点与来源脚注；它有柱图 ⇒ `charts` 传 `true`（#275 交接的默认行为）。
 *
 *  接线现状：这条词与「看最近 7 天饮食」在路由上参数一字不差（都是 `{"window":"7d"}`），
 *  命令这一层分不出进来的是哪条——照 #509／#511 的先例要由入口带一个标记进来，那要动
 *  `src/home/routes.ts`（不在本票声明路径内）⇒ 本件只把这一支备好，接线报编排者。 */
export function buildDietOverviewPage(v: DietOverviewView, command?: string): string {
  const weekDays = v.week.days > 0
    ? '，有记录 ' + v.week.loggedDays + '/' + v.week.days + ' 天'
    : '';
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '饮食总览',
    eyebrow: '卡路里 · 饮食',
    subtitle: '统计到 ' + v.today + ' 的前一天：本周日均 ' + String(v.week.avgCalorie) + ' 卡' + weekDays
      + '，本月累计 ' + v.month.totalCalorie.toLocaleString() + ' 卡。',
    content: dietUiCss() + windowStrip(v.week.start, v.month.end) + renderTocBlock({
      items: [{ id: 'sec-week', text: '本周累计' }, { id: 'sec-month', text: '本月累计' }],
    }) + buildDietOverviewBlock(v, command),
    charts: true,
  });
}
