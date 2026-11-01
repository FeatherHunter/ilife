/** #393 · 今日饮食页装配（`calorie.today`，today_diet.html 对照）。
 *
 * 原地搬自 `src/render/dietDocs.ts`：本票只换住处，函数体与注释原样照抄，产物逐字节不变。
 * 服务页面类：② 条目列表页。
 */
import {
  renderCaliberLine, renderEmptyBlock, renderEntryRows, renderLedgerRows, renderPunchStrip,
  renderScaleBar,
  renderSheetFrame, renderSummaryHead, renderTocBlock,
} from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dietUiCss, receiptStub, windowStrip } from './dietUi.js';
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
import { m } from '../entries/index.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = (): string => m('skill-calorie.diet-todayDocs.c059');

/** 餐别口径一行（正文里说一次的版本，不带常量名；口径出处见 `render/dietDocs.ts` 的 `MEAL_NOTE`）。 */
const MEAL_NOTE = (): string => m('skill-calorie.diet-todayDocs.c060');

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
  /** **最近 7 天**（末位＝这一页那天）：原型「今日饮食」页那排「近 7 天」打孔格的数据面。
   *  不给＝不出格带（直调这一支的产物逐字不变）；由 `src/diet/today.ts` 多取一份 7 天窗带进来。 */
  readonly week?: readonly { readonly date: string; readonly calories: number | null }[];
}

/** #496 · 「只看有备注的」那一页的空态页（`calorie.today` 带 `hasNote:true` 而当天一条备注都没有时）。
 *
 *  这一支不是取数失败：筛「有备注的」筛出 0 条是**正常结果**（这天就是没写备注），不该落
 *  「ERR 4 取数失败（缺失阻断）」把整页顶掉——照 `t425` 裁定 4 出完整空页（标题＋空态句＋
 *  一句「怎么让记录带备注」的引导句），空态不出复制按钮（同 `裁定 5` 的空态口径）。 */
export function buildTodayNoteEmptyDoc(date: string): string {
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: m('skill-calorie.diet-todayDocs.c001'),
    pageUi: true,
    eyebrow: m('skill-calorie.diet-todayDocs.c002'),
    subtitle: MEAL_NOTE(),
    content: dietUiCss({ sheet: true }) + windowStrip(date, date)
      + renderSheetFrame({
        variant: 'receipt', notch: true, cutLine: true,
        content: renderEmptyBlock({
          title: m('skill-calorie.diet-todayDocs.c003'),
          text: m('skill-calorie.diet-todayDocs.c004'),
        }),
      }),
    charts: false,
  });
}

export function buildTodayDietDoc(input: TodayDietDocInput): string {
  const { overview: o, dist, meals, macro, week } = input;
  const onlyNote = input.hasNote === true;
  const names = new Set(meals.map((meal) => meal.food_name));
  const left = o.calorieGoal - o.totalCalories;
  const pct = o.calorieGoal > 0 ? Math.round((o.totalCalories / o.calorieGoal) * 100) : 0;
  const deltaPhrase = left >= 0 ? m('skill-calorie.diet-todayDocs.c005', { p0: String(left) }) : m('skill-calorie.diet-todayDocs.c006', { p0: String(-left) });
  const eaten = dist.slices.filter((s) => s.count > 0).length;
  /* §五 第 4 行：页内导航（只列真会出的区块——点不到的项就是死链接）。 */
  const distChart = dist.totalCalories > 0;
  const macroChart = macro !== null && Boolean(macro.protein || macro.carb || macro.fat);
  const macroRows = macro === null ? [] : [
    { label: '蛋白', value: String(macro.protein === null ? 0 : macro.protein.pct), unit: '%' },
    { label: '碳水', value: String(macro.carb === null ? 0 : macro.carb.pct), unit: '%' },
    { label: '脂肪', value: String(macro.fat === null ? 0 : macro.fat.pct), unit: '%' },
  ];
  /** 纸里的正文（小票版）：主数字头 → 刻度条 → 账目 → 各餐 → 营养配比 → 明细 → 口径与来源。
   *  **复制区不在纸里**：它在裁切线之外（见下方 `td-copy` 那一节）。 */
  const sheetParts: string[] = [anchored('td-kpi', [
    renderSummaryHead({
      eyebrow: m('skill-calorie.diet-todayDocs.c007'),
      value: String(o.totalCalories),
      unit: m('skill-calorie.diet-todayDocs.c008'),
      denominator: m('skill-calorie.diet-todayDocs.c009', { p0: String(o.calorieGoal) }),
      note: m('skill-calorie.diet-todayDocs.c010', { p0: String(pct) }),
      stamp: left >= 0
        ? { text: m('skill-calorie.diet-todayDocs.c011', { p0: String(left) }), tone: 'warn' }
        : { text: m('skill-calorie.diet-todayDocs.c012', { p0: String(-left) }), tone: 'danger' },
      size: 'm',
    }),
    renderScaleBar({
      value: o.totalCalories,
      goal: o.calorieGoal,
      variant: 'cells',
      leftLabel: m('skill-calorie.diet-todayDocs.c013', {
        p0: String(String(o.totalCalories)),
        p1: String(o.calorieGoal),
        p2: String(pct),
      }),
      rightLabel: m('skill-calorie.diet-todayDocs.c014', { p0: String(deltaPhrase) }),
    }),
    /* 原型「今日饮食」页那排「近 7 天」（2026-09-24 用户裁定「今日两页也补」）：一格一天、有数填深色、
       红圈套今天那一格。7 天窗由调用方（`src/diet/today.ts`）多取一份带进来——本件不取数。 */
    ...(week === undefined || week.length < 2 ? [] : [renderPunchStrip({
      heading: m('skill-calorie.diet-todayDocs.c015'),
      days: week.map((d) => ({
        label: d.date.slice(5),
        value: d.calories === null ? null : String(d.calories),
        selected: d.date === o.end,
      })),
    })]),
    renderLedgerRows({
      heading: m('skill-calorie.diet-todayDocs.c016'),
      rows: [
        { label: m('skill-calorie.diet-todayDocs.c017'), value: String(o.calorieGoal), unit: m('skill-calorie.diet-todayDocs.c018') },
        { label: m('skill-calorie.diet-todayDocs.c019'), value: String(meals.length), unit: m('skill-calorie.diet-todayDocs.c020') },
        { label: m('skill-calorie.diet-todayDocs.c021'), value: String(names.size), unit: m('skill-calorie.diet-todayDocs.c022') },
        { label: m('skill-calorie.diet-todayDocs.c023'), value: eaten + '/' + dist.slices.length },
        { label: m('skill-calorie.diet-todayDocs.c024'), value: String(o.totalCalories), unit: m('skill-calorie.diet-todayDocs.c025'), kind: 'total' },
      ],
    }),
  ].join(''))];
  /* 各餐热量（`bar` 图改成账目行：**缺的那几餐写 `—`**，一行一餐，一眼看出哪顿没记）。 */
  if (distChart) {
    sheetParts.push(anchored('td-dist', renderLedgerRows({
      heading: m('skill-calorie.diet-todayDocs.c026'),
      rows: dist.slices.map((s) => (s.count > 0
        ? { label: s.meal, value: String(s.calories), unit: m('skill-calorie.diet-todayDocs.c027') }
        : { label: s.meal, value: '—' })),
    })));
  }
  /* 营养配比（`donut` 环图改成账目行）：数据层只给占比（`MacroEval` 无克数），故这一段印的是 %。 */
  if (macroChart) {
    sheetParts.push(anchored('td-macro', renderLedgerRows({ heading: m('skill-calorie.diet-todayDocs.c028'), rows: macroRows })));
  }
  /* 今日明细（九列表 → 明细行）：时间／餐别／食物／克数 …… 热量，**备注与三宏量各占一行之下**。
     备注空就不出那一行（明细行的备注槽是可选的，不留空位也不写占位符）；缺的宏量写 `—`。 */
  sheetParts.push(anchored('td-table', renderEntryRows({
    heading: m('skill-calorie.diet-todayDocs.c029', { p0: String(meals.length) }),
    rows: meals.map((meal) => {
      const badge = String(inferMealType(String(meal.time ?? '')) ?? '');
      const note = String(meal.note ?? '').trim();
      return {
        time: minuteOf(meal.time),
        ...(badge === '' ? {} : { badge }),
        name: meal.food_name,
        measure: meal.grams + ' g',
        value: String(meal.calories),
        unit: m('skill-calorie.diet-todayDocs.c030'),
        ...(note === '' ? {} : { note }),
        facts: [
          '蛋白 ' + (meal.protein === null || meal.protein === undefined ? '—' : meal.protein + ' g'),
          '碳水 ' + (meal.carbs === null || meal.carbs === undefined ? '—' : meal.carbs + ' g'),
          '脂肪 ' + (meal.fat === null || meal.fat === undefined ? '—' : meal.fat + ' g'),
        ],
      };
    }),
    ...(meals.length === 0 ? { absentLine: onlyNote ? m('skill-calorie.diet-todayDocs.c031') : m('skill-calorie.diet-todayDocs.c032') } : {}),
  })));
  /* §五 第 13／15 行：口径说明行（图下那一条已在图下说过，这里说缺值口径）＋ 来源脚注一行。
     小票版把这两行印在**纸里**（明细之后、裁切线之前）——它们属于这张单子，不属于页面脚注。 */
  sheetParts.push(renderCaliberLine(MEAL_NOTE() + '。'));
  sheetParts.push(renderCaliberLine(m('skill-calorie.diet-todayDocs.c033')));
  sheetParts.push(sourceLine({ source: m('skill-calorie.diet-todayDocs.c034'), start: o.start, end: o.start, count: meals.length }));
  /* §五 第 14 行：复制区（双按钮；`command` 不在时只出「复制数据」，不留死按钮）。
     **落点在纸里**（2026-09-24 用户裁定「纸内，但要有小票的巧思」）：成小票下缘那一联「存根」。 */
  const copy = anchored('td-copy', listPageCopy({
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.today',
    data: {
      items: meals.map((meal) => ({
        date: meal.date, time: meal.time, food_name: meal.food_name, grams: meal.grams,
        calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
      })),
      total: meals.length,
    },
  }, input.command));
  const titleSuffix = onlyNote ? m('skill-calorie.diet-todayDocs.c035') : '';
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    /* #496 · 页名（唤醒词「看有备注的饮食记录」）承诺看的是有备注的记录，标题原写「今日饮食 〈日期〉」，
       读者看不出这是一张筛过的页（审查件第 67 条）⇒ 这一支把筛选口径写进标题。 */
    title: m('skill-calorie.diet-todayDocs.c036', { p0: String(titleSuffix) }),
    pageUi: true,
    /* #496 · 眉标原写命令键「calorie.today · 饮食域」（裁定 1 不上屏）⇒ 改中文族名。 */
    eyebrow: m('skill-calorie.diet-todayDocs.c037'),
    /* 结论**不住副题**：小票版把它印在纸里的主数字头上（一句人话 ＋ 一枚印章），同一句不说两遍
       （旧副题「今日还剩 N 卡可摄入」与印章「还可吃 N 卡」是同一件事）。 */
    subtitle: null,
    content: dietUiCss({ sheet: true }) + windowStrip(o.start, o.start, m('skill-calorie.diet-todayDocs.c038', { p0: String(meals.length) })) + renderTocBlock({
      items: [
        { id: 'td-kpi', text: m('skill-calorie.diet-todayDocs.c039') },
        ...(distChart ? [{ id: 'td-dist', text: m('skill-calorie.diet-todayDocs.c040') }] : []),
        ...(macroChart ? [{ id: 'td-macro', text: m('skill-calorie.diet-todayDocs.c041') }] : []),
        { id: 'td-table', text: m('skill-calorie.diet-todayDocs.c042') },
        { id: 'td-copy', text: m('skill-calorie.diet-todayDocs.c043') },
      ],
    }) + renderSheetFrame({
      variant: 'receipt', notch: true, cutLine: true, content: sheetParts.join('') + receiptStub(copy),
    }),
    charts: false,
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
export const DIET_LIST_COLUMNS = (): readonly DataTableColumn[] => [
  { key: 'when', label: m('skill-calorie.diet-todayDocs.c061') },
  { key: 'meal', label: m('skill-calorie.diet-todayDocs.c062') },
  { key: 'food', label: m('skill-calorie.diet-todayDocs.c063') },
  { key: 'grams', label: m('skill-calorie.diet-todayDocs.c064'), align: 'right' },
  { key: 'cal', label: m('skill-calorie.diet-todayDocs.c065'), align: 'right' },
  { key: 'pro', label: '蛋白', align: 'right' },
  { key: 'carbs', label: '碳水', align: 'right' },
  { key: 'fat', label: '脂肪', align: 'right' },
  { key: 'note', label: m('skill-calorie.diet-todayDocs.c066') },
];

/** 复制区（§五 第 14 行）：双按钮 ＋ 日志六段，第 4 段「调用链」＝本次命令原文（裁定 7）；
 *  `command` 由调用点给（`shared/writeParts.ts` 的 `commandLine()` 派生，含本次 `--params`），
 *  不给就只出「复制数据」——本件不替调用方编一条命令原文，也不留点不动的第二颗按钮。 */
export function listPageCopy(envelope: DataTextInput['envelope'], command?: string): string {
  if (command === undefined) return dataCopyArea(m('skill-calorie.diet-todayDocs.c044'), { envelope });
  return copyArea({
    data: { envelope },
    log: { envelope, copyLog: copyLog({ command, source: m('skill-calorie.diet-todayDocs.c045'), actionAt: nowStamp(), version: DOC_VERSION }) },
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
    docTitle: DOC_TITLE(),
    title: m('skill-calorie.diet-todayDocs.c046'),
    pageUi: true,
    eyebrow: m('skill-calorie.diet-todayDocs.c047'),
    /* §五 第 3 行：结论句走页头副题槽（#273 的区块不出结论句，它把 `v.oneLine` 交给宿主）。 */
    subtitle: v.oneLine,
    content: dietUiCss() + windowStrip(v.start, v.end, m('skill-calorie.diet-todayDocs.c048', { p0: String(v.days) })) + renderTocBlock({
      items: [
        { id: 'md-kpi', text: m('skill-calorie.diet-todayDocs.c049') },
        ...(v.meal === 'all' && v.total > 0 ? [{ id: 'md-dist', text: m('skill-calorie.diet-todayDocs.c050') }] : []),
        { id: 'md-table', text: m('skill-calorie.diet-todayDocs.c051') },
        ...(command === undefined ? [] : [{ id: 'md-copy', text: m('skill-calorie.diet-todayDocs.c052') }]),
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
    ? m('skill-calorie.diet-todayDocs.c053', { p0: String(v.week.loggedDays), p1: String(v.week.days) })
    : '';
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: m('skill-calorie.diet-todayDocs.c054'),
    pageUi: true,
    eyebrow: m('skill-calorie.diet-todayDocs.c055'),
    subtitle: m('skill-calorie.diet-todayDocs.c056', {
      p0: String(v.today),
      p1: String(String(v.week.avgCalorie)),
      p2: String(weekDays),
      p3: String(v.month.totalCalorie.toLocaleString()),
    }),
    content: dietUiCss() + windowStrip(v.week.start, v.month.end) + renderTocBlock({
      items: [{ id: 'sec-week', text: m('skill-calorie.diet-todayDocs.c057') }, { id: 'sec-month', text: m('skill-calorie.diet-todayDocs.c058') }],
    }) + buildDietOverviewBlock(v, command),
    charts: true,
  });
}
