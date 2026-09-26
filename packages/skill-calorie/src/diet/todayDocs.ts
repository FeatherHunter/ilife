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

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里饮食';

/** 餐别口径一行（正文里说一次的版本，不带常量名；口径出处见 `render/dietDocs.ts` 的 `MEAL_NOTE`）。 */
const MEAL_NOTE = '加餐是下午茶和夜宵';

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
    docTitle: DOC_TITLE,
    title: '今日饮食（只看有备注的）',
    pageUi: true,
    eyebrow: '卡路里饮食',
    subtitle: MEAL_NOTE,
    content: dietUiCss({ sheet: true }) + windowStrip(date, date)
      + renderSheetFrame({
        variant: 'receipt', notch: true, cutLine: true,
        content: renderEmptyBlock({
          title: '今天没有带备注的记录',
          text: '记的时候带一句备注（例如「午餐 鸡胸 150 克 备注：煎的，少油」），这一页就会出现它。',
        }),
      }),
    charts: false,
  });
}

export function buildTodayDietDoc(input: TodayDietDocInput): string {
  const { overview: o, dist, meals, macro, week } = input;
  const onlyNote = input.hasNote === true;
  const names = new Set(meals.map((m) => m.food_name));
  const left = o.calorieGoal - o.totalCalories;
  const pct = o.calorieGoal > 0 ? Math.round((o.totalCalories / o.calorieGoal) * 100) : 0;
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
      eyebrow: '当日摄入',
      value: String(o.totalCalories),
      unit: '卡',
      denominator: '/ ' + o.calorieGoal + ' 卡',
      note: '已吃目标的 ' + pct + '%',
      stamp: left >= 0
        ? { text: '还可吃 ' + left + ' 卡', tone: 'warn' }
        : { text: '已超目标 ' + (-left) + ' 卡', tone: 'danger' },
      size: 'm',
    }),
    renderScaleBar({
      value: o.totalCalories,
      goal: o.calorieGoal,
      variant: 'cells',
      leftLabel: String(o.totalCalories) + ' / ' + o.calorieGoal + ' 卡（' + pct + '%）',
      rightLabel: (left >= 0 ? '差 ' + left : '超 ' + (-left)) + ' 卡',
    }),
    /* 原型「今日饮食」页那排「近 7 天」（2026-09-24 用户裁定「今日两页也补」）：一格一天、有数填深色、
       红圈套今天那一格。7 天窗由调用方（`src/diet/today.ts`）多取一份带进来——本件不取数。 */
    ...(week === undefined || week.length < 2 ? [] : [renderPunchStrip({
      heading: '近 7 天',
      days: week.map((d) => ({
        label: d.date.slice(5),
        value: d.calories === null ? null : String(d.calories),
        selected: d.date === o.end,
      })),
    })]),
    renderLedgerRows({
      heading: '账目',
      rows: [
        { label: '热量目标', value: String(o.calorieGoal), unit: '卡' },
        { label: '餐数', value: String(meals.length), unit: '条' },
        { label: '品种', value: String(names.size), unit: '个' },
        { label: '餐别覆盖', value: eaten + '/' + dist.slices.length },
        { label: '合计', value: String(o.totalCalories), unit: '卡', kind: 'total' },
      ],
    }),
  ].join(''))];
  /* 各餐热量（`bar` 图改成账目行：**缺的那几餐写 `—`**，一行一餐，一眼看出哪顿没记）。 */
  if (distChart) {
    sheetParts.push(anchored('td-dist', renderLedgerRows({
      heading: '各餐热量（卡）',
      rows: dist.slices.map((s) => (s.count > 0
        ? { label: s.meal, value: String(s.calories), unit: '卡' }
        : { label: s.meal, value: '—' })),
    })));
  }
  /* 营养配比（`donut` 环图改成账目行）：数据层只给占比（`MacroEval` 无克数），故这一段印的是 %。 */
  if (macroChart) {
    sheetParts.push(anchored('td-macro', renderLedgerRows({ heading: '营养配比', rows: macroRows })));
  }
  /* 今日明细（九列表 → 明细行）：时间／餐别／食物／克数 …… 热量，**备注与三宏量各占一行之下**。
     备注空就不出那一行（明细行的备注槽是可选的，不留空位也不写占位符）；缺的宏量写 `—`。 */
  sheetParts.push(anchored('td-table', renderEntryRows({
    heading: '今日明细（共 ' + meals.length + ' 条）',
    rows: meals.map((m) => {
      const badge = String(inferMealType(String(m.time ?? '')) ?? '');
      const note = String(m.note ?? '').trim();
      return {
        time: minuteOf(m.time),
        ...(badge === '' ? {} : { badge }),
        name: m.food_name,
        measure: m.grams + ' g',
        value: String(m.calories),
        unit: '卡',
        ...(note === '' ? {} : { note }),
        facts: [
          '蛋白 ' + (m.protein === null || m.protein === undefined ? '—' : m.protein + ' g'),
          '碳水 ' + (m.carbs === null || m.carbs === undefined ? '—' : m.carbs + ' g'),
          '脂肪 ' + (m.fat === null || m.fat === undefined ? '—' : m.fat + ' g'),
        ],
      };
    }),
    ...(meals.length === 0 ? { absentLine: onlyNote ? '今天没有带备注的记录' : '本日无明细' } : {}),
  })));
  /* §五 第 13／15 行：口径说明行（图下那一条已在图下说过，这里说缺值口径）＋ 来源脚注一行。
     小票版把这两行印在**纸里**（明细之后、裁切线之前）——它们属于这张单子，不属于页面脚注。 */
  sheetParts.push(renderCaliberLine(MEAL_NOTE + '。'));
  sheetParts.push(renderCaliberLine('本页缺值一律写成 —，不当成 0 卡。'));
  sheetParts.push(sourceLine({ source: '饮食记录', start: o.start, end: o.start, count: meals.length }));
  /* §五 第 14 行：复制区（双按钮；`command` 不在时只出「复制数据」，不留死按钮）。
     **落点在纸里**（2026-09-24 用户裁定「纸内，但要有小票的巧思」）：成小票下缘那一联「存根」。 */
  const copy = anchored('td-copy', listPageCopy({
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.today',
    data: {
      items: meals.map((m) => ({
        date: m.date, time: m.time, food_name: m.food_name, grams: m.grams,
        calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat,
      })),
      total: meals.length,
    },
  }, input.command));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    /* #496 · 页名（唤醒词「看有备注的饮食记录」）承诺看的是有备注的记录，标题原写「今日饮食 〈日期〉」，
       读者看不出这是一张筛过的页（审查件第 67 条）⇒ 这一支把筛选口径写进标题。 */
    title: '今日饮食' + (onlyNote ? '（只看有备注的）' : ''),
    pageUi: true,
    /* #496 · 眉标原写命令键「calorie.today · 饮食域」（裁定 1 不上屏）⇒ 改中文族名。 */
    eyebrow: '卡路里饮食',
    /* 结论**不住副题**：小票版把它印在纸里的主数字头上（一句人话 ＋ 一枚印章），同一句不说两遍
       （旧副题「今日还剩 N 卡可摄入」与印章「还可吃 N 卡」是同一件事）。 */
    subtitle: null,
    content: dietUiCss({ sheet: true }) + windowStrip(o.start, o.start, meals.length + ' 条') + renderTocBlock({
      items: [
        { id: 'td-kpi', text: '读数' },
        ...(distChart ? [{ id: 'td-dist', text: '各餐热量' }] : []),
        ...(macroChart ? [{ id: 'td-macro', text: '营养配比' }] : []),
        { id: 'td-table', text: '今日明细' },
        { id: 'td-copy', text: '复制区' },
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
    pageUi: true,
    eyebrow: '卡路里饮食',
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
    pageUi: true,
    eyebrow: '卡路里饮食',
    subtitle: '统计到 ' + v.today + ' 的前一天：本周日均 ' + String(v.week.avgCalorie) + ' 卡' + weekDays
      + '，本月累计 ' + v.month.totalCalorie.toLocaleString() + ' 卡。',
    content: dietUiCss() + windowStrip(v.week.start, v.month.end) + renderTocBlock({
      items: [{ id: 'sec-week', text: '本周累计' }, { id: 'sec-month', text: '本月累计' }],
    }) + buildDietOverviewBlock(v, command),
    charts: true,
  });
}
