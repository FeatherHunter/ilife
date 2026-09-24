/** #108 · 营养/饮食域全文档装配（数据→区块→填充器）。
 *
 * 范围（47 页同质之饮食域，t71 口径「新版已有」）：`calorie.today`／`calorie.view.diet`
 * （today_diet／diet_overview／meal_distribution／today_meals 子集）／`calorie.view.diet-review`
 * （diet_review）／`calorie.view.ranking`（food_ranking）／`calorie.view.search`（food_search）／
 * `calorie.view.library`（food_library）／`calorie.view.health`（health_dashboard）／
 * `calorie.view.dedupe`（dedupe_report）。
 * 不碰：nutrition_ratio／nutrition_detail／source_stats／today_water（→ #112，需移植），
 * 缺口/组合/异常/禁忌（→ #110），运动/体重/身体（→ #109）。
 *
 * 做法（#104 §4 用法）：内容 = base-paint/blocks 12 区块（B-01 壳／B-02 KPI／B-03 表／
 * B-04 图／B-05 列表／B-08 折叠／B-09 参数表单／B-11 复制区），文档 = fillTemplate 包裹
 * （资产裸文本＋填充器包裹；sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs，图表 CSS 由其运行时注入）。
 * 复制文本一律 buildDataText（#77 契约，技能侧不自产第二套序列化）：指标页走 stat 投影，
 * 行级页（榜单/食品/明细/去重）走 list 投影（JSON 行，旧「复制榜单/复制回 AI」的数据等价物）。
 * 本层不做取数（数据由调用方 dispatch 备齐），不返空（缺失由数据层抛 missing-data）。
 */
import {
  renderCaliberLine,
  renderDataTable,
  renderDisclosure,
  renderEntryRows,
  renderKpiGrid,
  renderLedgerRows,
  renderListRows,
  renderPunchStrip,
  renderScaleBar,
  renderSheetFrame,
  renderSummaryHead,
  renderTocBlock,
} from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { dietHead, sheetStyleCss } from '../diet/dietUi.js';
import { emptyGuide } from '../shared/emptyGuide.js';
import { sourceLine } from '../shared/sourceLine.js';
import { DIET_LIST_COLUMNS, buildDietOverviewPage, buildMealDistributionPage, listPageCopy, minuteOf, noteOf } from '../diet/todayDocs.js';
import type { MealDistributionView } from '../diet/reviewDocs.js';
import type { DietOverviewView } from '../diet/nutritionPort.js';
import { inferMealType } from '../fetch/diet.js';
/** 明细行最小形（fetch MealRow 的子集；调用方传全行亦可）。 */
export interface DietMealRow {
  readonly date: string;
  readonly time: string | null;
  readonly food_name: string;
  readonly grams: number;
  readonly calories: number;
  readonly protein: number;
  readonly carbs: number;
  readonly fat: number;
  readonly note?: string | null;
}
import type { DaySeries } from '../analysis/series.js';
import type { DietOverview, MealDistribution } from './diet.js';
import type { HealthPlate } from '../analysis/healthPlate.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）；#591 去 `·`（门禁 R1），取值照同域 ② 类页现行口径（`diet/todayDocs.ts` 的「卡路里饮食」）。 */
const DOC_TITLE = '卡路里饮食';

/* LF 口径：#618 要给本件（HEAD 已是 350 LF）加一处映射，同票把下面两个小件压成一行等价写法（本包告警线
   台账住 `packages/skill-calorie/AGENTS.md`，不在本票写集 ⇒ 不越线、不改台账）。 */
const fmt = (n: number | null | undefined): string => (n === null || n === undefined) ? '—' : String(n);
const r1 = (n: number): number => Math.round(n * 10) / 10;

/** #618 趋势卡的中文判语（**本件唯一一处映射**，8 张窗口页共走 `buildViewDietDoc` 故只此一份）：用户原话
 *  「趋势这个卡片写的是『up/down』不应该有英文」；数据层 `'up' | 'down' | 'flat'`（`analysis/trend.ts:26`）口径不动，只在页面侧换人话，表外值原样透传（照 `trendPredictDocs.ts` 的 `DEFICIT_TREND_ZH ?? …`）。 */
const TREND_ZH: Record<string, string> = { up: '上升', down: '下降', flat: '持平' };

/** 餐别口径一行（**正文里说一次**的版本，不带常量名）。
 *
 *  #496 · 原文案是「窗口跟 MEAL_WINDOWS · 加餐=下午茶+夜宵」——把源码常量名印给用户看
 *  （`.scratch/t155o/text-review-P0.md` 第 2、62、68 条，四份审查件共 14 席命中）。
 *  现在只留读者用得上的那半句：加餐是哪几顿（#591：「、」也去掉，两顿用「和」并列）。 */
const MEAL_NOTE = '加餐时段：下午茶和夜宵';

/* ── 条目列表页（`calorie.view.diet` 的窗口词；老实物 `today_meals.html` 对照） ── */

/** 区块锚点（页内导航 `renderTocBlock` 的落点；名字照作者认可的样张
 *  `docs/skills/skill-calorie/t425-样张-今日饮食.html` 的 `sec-*` 一套）。 */
const LIST_ANCHOR = {
  kpi: 'sec-kpi', trend: 'sec-trend', dist: 'sec-dist', daily: 'sec-daily', meals: 'sec-meals', copy: 'sec-copy',
} as const;

/** 区块外面套一层带锚点的 `<section>`（页内导航点得到才出这一项——不留死链接）。 */
function anchored(id: string, html: string): string {
  return '<section id="' + id + '">' + html + '</section>';
}

/** 打孔格带一行最多几格（原型是 7 天；本页只在前 7 格上画，更长的窗口由「按日汇总」账目行兜住）。 */
const STRIP_DAYS = 7;

/** 条目列表页入参：前 7 位是窗口词的取数结果（调用点＝`src/home/today.ts` 的 `viewDietOverview`），
 *  后 3 位是可选位——给了就换页（`mealView`→餐别页／`overviewView`→总览页），
 *  `command` 给了才出复制日志（裁定 7）。 */
export interface ViewDietDocInput {
  overview: DietOverview;
  dist: MealDistribution;
  distDate: string;
  days: DaySeries[];
  meals: DietMealRow[];
  mealTotal: number;
  mealsTruncated: boolean;
  /** 本次命令原文（`commandLine('calorie.view.diet', params)`）。 */
  readonly command?: string;
  /** **页名**（2026-09-24 用户裁定：8 条窗口词不再都叫「饮食总览」，各自跟自己的唤醒词走）；
   *  不给＝回落「饮食总览」（直调这一支的产物逐字不变）。 */
  readonly title?: string;
  /** 餐别筛选那一支的取数（`../diet/review.ts` 的 `buildMealDistributionView` 产出）。 */
  readonly mealView?: MealDistributionView;
  /** 「看饮食总览」那一支的取数（`../diet/nutritionPort.ts` 的 `buildDietOverviewView` 产出）。 */
  readonly overviewView?: DietOverviewView;
}

/** 老新对照的明细列（老实物 `today_meals.html:168` 的九列）住在 `../diet/todayDocs.ts` 的
 *  `DIET_LIST_COLUMNS`——今日页与窗口页同族，列面只准有一处。 */

/** 条目列表页（② 类，`t425-融合基准.md` §五 的 15 行骨架逐行落位；老实物 `today_meals.html`）。
 *
 *  裁定落点：1 眉标只写人话、源码标识符不上屏；2 结论句走标题下第一行（样张做法＝复用副题槽）；
 *  3 页内导航 ＋ 口径说明行 ＋ 来源脚注三条恒出；4 缺值一律 `—`、空窗出完整页 ＋ 空态句 ＋ 引导句；
 *  5 零值不画柱身、单点不成线（点数不足出说明句）；7 复制区双按钮、日志第 4 段＝本次命令原文。 */
export function buildViewDietDoc(input: ViewDietDocInput): string {
  /* 餐别筛选那一支（`meal` 参数由命令面带进来）：整页换成餐别分布页（#273 交付的具名区块）。 */
  if (input.mealView !== undefined) return buildMealDistributionPage(input.mealView, input.command);
  /* 「看饮食总览」那一支：整页换成总览页（#275 交付的具名区块）。 */
  if (input.overviewView !== undefined) return buildDietOverviewPage(input.overviewView, input.command);

  const { overview: o, dist, distDate, days, meals, mealTotal, mealsTruncated } = input;
  const loggedDays = days.filter((d) => d.calories !== null);
  /* 裁定 4：本窗一条记录也没有 ⇒ 整页仍是完整页（空态句 ＋ 引导句 ＋ 来源脚注都在），图表不画。 */
  const empty = loggedDays.length === 0;
  /* 移植清单 5 的排序口径（老 `today_meals.html:322`）：明细按日期＋时间**倒序**，最近的排最前。 */
  const rows = [...meals].sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? '')));

  /* §五 第 4 行：页内导航只列**真会出**的区块（点不到的项就是死链接）。 */
  const toc = renderTocBlock({
    items: [
      { id: LIST_ANCHOR.kpi, text: '读数' },
      ...(empty ? [] : [{ id: LIST_ANCHOR.trend, text: '每日摄入' }]),
      { id: LIST_ANCHOR.dist, text: '餐别分布' },
      ...(empty ? [] : [
        { id: LIST_ANCHOR.daily, text: '按日汇总' },
        { id: LIST_ANCHOR.meals, text: '每日明细' },
      ]),
      { id: LIST_ANCHOR.copy, text: '复制区' },
    ],
  });
  /* #551 · 页头：窗口条 ＋ 事实条（形状住 `../diet/dietUi.ts`）。事实条**只留一件**——
     记录／合计／日均／趋势四件都在纸里各住各的槽，页头不再复述同一组数。 */
  const head = dietHead(o.start, o.end, '共 ' + o.days + ' 天', [['有记录', o.loggedDays + ' 天']]);
  /* 日均占目标的几成：印章与刻度条两端的判语都由它派生（一处算式，三处只读）。 */
  const goalPct = o.calorieGoal > 0 && o.avgCalories !== null
    ? Math.round((o.avgCalories / o.calorieGoal) * 100) : null;
  const trendZh = TREND_ZH[o.trend.summary.trend] ?? o.trend.summary.trend;
  const remain = o.avgCalories === null ? null : o.calorieGoal - o.avgCalories;
  /* 原型里"逐日"的形状是**一排打孔格**（原型 `.punch`，用户点名那件「这 7 天」控件），落点在刻度条
     与账目之间（原型顺序：刻度 → 这 7 天 → 账目）。窗口 ≤7 天＝整窗都在格上，标题「这 N 天」；
     更长的窗口格上只放**最近 7 天**（标题「近 7 天」），整窗逐日仍住下面那条「按日汇总」账目行
     ——格带管"哪几天有数、各是多少"的一眼，账目行管"一天不缺"的清单。单日窗（昨日）不出格带：
     一格不叫一排（`renderPunchStrip` 的份数宽会把那一格拉满整张纸）。 */
  const stripCells = days.length <= STRIP_DAYS ? days : days.slice(days.length - STRIP_DAYS);
  const stripLogged = stripCells.filter((d) => d.calories !== null);
  /* 红圈＝这一页正在细看的那天（餐别分布的落点日）；那天没记录就退到**最近一个有记录的天**——
     原型那枚红圈永远套在实心格上（空心底上套红圈，读者会当成错）。 */
  const stripSel = stripCells.some((d) => d.date === distDate && d.calories !== null)
    ? distDate
    : (stripLogged.length === 0 ? null : (stripLogged[stripLogged.length - 1] as DaySeries).date);
  const stripHtml = days.length < 2 ? '' : renderPunchStrip({
    heading: days.length <= STRIP_DAYS ? '这 ' + days.length + ' 天' : '近 ' + STRIP_DAYS + ' 天',
    days: stripCells.map((d) => ({
      label: d.date.slice(5),
      value: d.calories === null ? null : fmt(d.calories),
      selected: stripSel !== null && d.date === stripSel,
    })),
  });
  /** 纸里的正文：主数字头 → 刻度条 → 账目 → 每日摄入 → 餐别分布 → 按日汇总 → 全部记录 → 口径行。 */
  const sheetParts: string[] = [anchored(LIST_ANCHOR.kpi, [
    renderSummaryHead({
      eyebrow: '日均摄入',
      value: fmt(o.avgCalories),
      unit: '卡',
      denominator: '/ ' + o.calorieGoal + ' 卡',
      ...(goalPct === null ? {} : {
        stamp: goalPct > 100
          ? { text: '超目标 ' + (goalPct - 100) + '%', tone: 'danger' as const }
          : (goalPct < 70
            ? { text: '只有目标的 ' + goalPct + '%', tone: 'warn' as const }
            : { text: '达标 ' + goalPct + '%', tone: 'ok' as const }),
      }),
      /* 2026-09-24 用户裁定「主数字收到样张那一档（46px，最像小票）」：档名 `m` 就是小票原型
         `.total .n` 的真数（大字档 `xl` 是 92px，留给大字版式那一套页用）。 */
      size: 'm' as const,
    }),
    renderScaleBar({
      value: o.avgCalories ?? 0,
      goal: o.calorieGoal,
      variant: 'cells',
      leftLabel: '日均 ' + fmt(o.avgCalories) + ' / ' + o.calorieGoal + ' 卡'
        + (goalPct === null ? '' : '（' + goalPct + '%）'),
      rightLabel: remain === null ? '—' : (remain >= 0 ? '差 ' + remain + ' 卡' : '超 ' + (-remain) + ' 卡'),
    }),
    stripHtml,
    renderLedgerRows({
      heading: '账目',
      rows: [
        { label: '热量目标', value: String(o.calorieGoal), unit: '卡' },
        { label: '记录条数', value: String(mealTotal), unit: '条' },
        { label: '每日摄入趋势', value: trendZh },
        { label: '合计', value: String(o.totalCalories), unit: '卡', kind: 'total' as const },
      ],
    }),
  ].join(''))];
  /* §五 第 6 行：每日摄入。**折线撤**（小票语汇里"走势"由数字讲）：两点以上报**最多／最少的一天**，
     只有一天就报那一天——旧文案「一个点画不成折线（不画半截线）」随折线一起退场。 */
  if (loggedDays.length >= 2) {
    const vals = loggedDays as DaySeries[];
    const max = vals.reduce((a, b) => ((b.calories as number) > (a.calories as number) ? b : a), vals[0] as DaySeries);
    const min = vals.reduce((a, b) => ((b.calories as number) < (a.calories as number) ? b : a), vals[0] as DaySeries);
    sheetParts.push(anchored(LIST_ANCHOR.trend, renderLedgerRows({
      heading: '每日摄入',
      rows: [
        { label: '最多的一天 ' + max.date.slice(5), value: fmt(max.calories), unit: '卡' },
        { label: '最少的一天 ' + min.date.slice(5), value: fmt(min.calories), unit: '卡' },
        { label: '趋势', value: trendZh },
      ],
    })));
  } else if (loggedDays.length === 1) {
    const only = loggedDays[0] as DaySeries;
    sheetParts.push(anchored(LIST_ANCHOR.trend, renderLedgerRows({
      heading: '每日摄入',
      rows: [{ label: '有记录的一天 ' + only.date.slice(5), value: fmt(only.calories), unit: '卡' }],
    })));
  }
  if (dist.totalCalories > 0) {
    /* 餐别分布（柱图 → 账目行）：一行一餐，括号里带这一餐的记录条数；没记的那一餐写 `—`。 */
    sheetParts.push(anchored(LIST_ANCHOR.dist, renderLedgerRows({
      heading: '餐别分布 ' + distDate,
      rows: dist.slices.map((s) => (s.count > 0
        ? { label: s.meal + '（' + s.count + ' 餐）', value: String(s.calories), unit: '卡' }
        : { label: s.meal, value: '—' })),
    })));
    /* #496 · 餐别口径（加餐是哪几顿）只在纸里说一次，不带常量名。 */
    sheetParts.push(renderCaliberLine(MEAL_NOTE));
  } else {
    /* 裁定 5：零值不画柱身；裁定 4：这一支的值位是「尾日没记录」而不是「吃了 0 卡」⇒ 值位写 `—`。 */
    sheetParts.push(anchored(LIST_ANCHOR.dist, renderLedgerRows({
      heading: '餐别分布 ' + distDate,
      rows: dist.slices.map((s) => ({ label: s.meal, value: '—' })),
    })));
    sheetParts.push(renderCaliberLine(distDate + ' 这天没有记录，窗内其余日子有数。'));
  }
  if (empty) {
    /* §五 第 12 行：空态块 ＋ 一句「怎么记第一条」的引导句（裁定 4）。 */
    sheetParts.push(anchored(LIST_ANCHOR.meals, emptyGuide({
      icon: '🍽️',
      text: '这一段时间（' + o.start + ' ~ ' + o.end + '）没有饮食记录。',
      hint: '要让它有内容，说「记一餐」把吃的那顿记上；补以前的日期就说「补记饮食」。',
    })));
  } else {
    /* §五 第 9 行：**按日汇总也走账目行**——公共层在窄档把六列表"卡片化"成一列七块（整页 2242px，
       实测截图），一列「日期 → 摄入」才是小票语汇里日级该有的形状；逐日的三宏量在下面明细行里逐条可见。
       明细从**九列表改明细行**（一条记录一行：时间／餐别／食物／克数 …… 热量 ＋ 备注行 ＋ 三宏量行下读数）。 */
    sheetParts.push(anchored(LIST_ANCHOR.daily, renderLedgerRows({
      heading: '按日汇总',
      rows: days.map((d) => (d.calories === null
        ? { label: d.date, value: fmt(d.calories) }
        : { label: d.date, value: fmt(d.calories), unit: '卡' })),
    })));
    sheetParts.push(renderCaliberLine('无记录日写 — 不断 0'));
    sheetParts.push(anchored(LIST_ANCHOR.meals, renderEntryRows({
      /* #496 · 标题写「全部记录」：这一页的明细就是窗内全部记录（截断时明示只列前 N 条）。 */
      heading: '全部记录（共 ' + mealTotal + ' 条' + (mealsTruncated ? '，仅列前 ' + meals.length + ' 条' : '') + '）',
      rows: rows.map((m) => {
        const badge = String(inferMealType(String(m.time ?? '')) ?? '');
        const note = String(m.note ?? '').trim();
        return {
          time: m.date + ' ' + minuteOf(m.time),
          ...(badge === '' ? {} : { badge }),
          name: m.food_name,
          measure: m.grams + ' g',
          value: String(m.calories),
          unit: '卡',
          ...(note === '' ? {} : { note }),
          facts: [
            '蛋白 ' + fmt(m.protein) + ' g',
            '碳水 ' + fmt(m.carbs) + ' g',
            '脂肪 ' + fmt(m.fat) + ' g',
          ],
        };
      }),
    })));
  }
  /* §五 第 13 行：缺值口径一条（餐别口径已在纸里那一条说过一次，不重复；#591 门禁 R2 的口径行做法照旧）。 */
  sheetParts.push(renderCaliberLine('本页缺值一律写成 —，不当成 0 卡。'));
  /* §五 第 14 行：复制区（双按钮；`command` 不在时只出「复制数据」，不留死按钮）。
     **落点在纸外**（与今日页同一落点：纸是这张单子，复制区是它的出口）。 */
  const copy = anchored(LIST_ANCHOR.copy, listPageCopy({
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.diet',
    data: {
      metrics: {
        totalCalories: o.totalCalories, loggedDays: o.loggedDays, days: o.days,
        calorieGoal: o.calorieGoal, distTotal: dist.totalCalories,
      },
    },
  }, input.command));
  /* #560 · 屏上来源脚注撤（用户裁决原文：「用户 2026-09-15 点名：所有 HTML 页面底部的「数据来源：xxx」都删掉（用户直接看得见按钮与内容，不需要脚注复读来路）。」）；
     `sourceLine` helper 与复制载荷 `copyLog.source` 保留（技术原件，只删屏上脚注）。 */
  return assembleDocPage({
    docTitle: DOC_TITLE,
    /* 用户缺陷（2026-09-15）：页名不再带窗口日期——窗口区间归页头窗口条，全页只出现一次。
       2026-09-24 追加：页名跟**唤醒词**走（「本周饮食」等由 `src/home/today.ts` 按 `window` 参数给），
       不再一律「饮食总览」；不给时回落「饮食总览」。 */
    title: input.title ?? '饮食总览',
    /* #496 · 眉标原写命令键「calorie.view.diet · 饮食域」——`t425-融合基准.md:127-132`（裁定 1）
       定死不上屏；改样张口径的中文族名，#591 再去掉族名里的 `·`（门禁 R1，同 `diet/todayDocs.ts`）。 */
    eyebrow: '卡路里饮食',
    /* §五 第 3 行：结论句改成**口径句**（日均只按有记录的天算）——合计住纸里合计行、日均住主数字头、
       趋势住账目行，副题再报一遍同一组数就是同一件事说第四遍。 */
    subtitle: o.loggedDays > 0
      ? '日均只按有记录的 ' + o.loggedDays + ' 天算，其余日子算缺数。'
      : '本窗还没有饮食记录。',
    content: '<style>' + sheetStyleCss() + '</style>' + toc + head
      + renderSheetFrame({ variant: 'receipt', notch: true, cutLine: true, content: sheetParts.join('') })
      + copy,
    charts: false, pageUi: true,
  });
}

/* ── 健康盘（health_dashboard.html 对照：四维＋今日该做什么＋复制回 AI） ── */

const HEALTH_DIMS = [
  { key: 'calorie', name: '摄入' },
  { key: 'exercise', name: '运动' },
  { key: 'weight', name: '体重' },
  { key: 'deficit', name: '缺口' },
] as const;

export function buildHealthDoc(h: HealthPlate): string {
  const dims = (h.dashboard.data ?? {}) as { weight?: unknown; calorie?: unknown; exercise?: unknown; deficit?: unknown };
  const missing = HEALTH_DIMS.filter((d) => dims[d.key] === null || dims[d.key] === undefined).map((d) => d.name);
  const parts: string[] = [renderKpiGrid([
    { label: '区间', value: h.start + ' ~ ' + h.end, detail: '有记录 ' + h.loggedDays + ' 天' },
    { label: '日均摄入', value: fmt(h.avgIntake), unit: '卡' },
    { label: '日均缺口', value: fmt(h.avgDeficit), unit: '卡' },
    {
      label: '四维', value: h.dashboard.status === 'ok' ? '齐' : '部分缺',
      detail: missing.length === 0 ? '体重维有' : '缺：' + missing.join('、'),
      status: missing.length === 0 ? 'ok' : 'warn',
    },
  ])];
  parts.push(renderListRows({
    items: HEALTH_DIMS.map((d) => {
      const v = dims[d.key];
      const has = v !== null && v !== undefined;
      return {
        left: d.name,
        main: has ? '有数据' : '缺数据（先补记录）',
        right: has ? '✓' : '缺',
      };
    }),
  }));
  const logged = h.series.filter((d) => d.calories !== null);
  const goalAvg = logged.length > 0
    ? logged.reduce((a, d) => a + d.calorieGoal, 0) / logged.length
    : null;
  const actions: Array<{ left?: string; main: string; right?: string }> = [];
  if (h.avgIntake !== null && goalAvg) {
    const ratio = h.avgIntake / goalAvg;
    if (ratio > 1.1) {
      actions.push({ left: '!', main: '摄入超标', right: '日均 ' + h.avgIntake + ' 卡 vs 目标 ' + r1(goalAvg) + ' 卡' });
    } else if (ratio < 0.7) {
      actions.push({ left: '!', main: '摄入不足', right: '日均仅 ' + h.avgIntake + ' 卡，长期可能影响代谢' });
    }
  }
  if (h.avgDeficit !== null) {
    if (h.avgDeficit > 700) actions.push({ left: '🔥', main: '缺口过大', right: '日均缺口 ' + h.avgDeficit + ' 卡，超过 700 不健康' });
    else if (h.avgDeficit < 0) actions.push({ left: '🍔', main: '热量盈余', right: '日均 ' + Math.abs(h.avgDeficit) + ' 卡盈余，可能在增重' });
  }
  if (missing.length > 0) actions.push({ left: '补', main: '部分维度缺数据', right: '缺：' + missing.join('、') });
  if (actions.length === 0) actions.push({ left: '✓', main: '一切正常', right: '指标均在合理范围内' });
  parts.push(renderDisclosure({
    title: '今日该做什么（共 ' + actions.length + ' 条）',
    open: true,
    contentHtml: renderListRows({ items: actions }),
  }));
  parts.push(dataCopyArea('复制回 AI', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.health',
      data: {
        metrics: {
          loggedDays: h.loggedDays,
          ...(h.avgIntake !== null ? { avgIntake: h.avgIntake } : {}),
          ...(h.avgDeficit !== null ? { avgDeficit: h.avgDeficit } : {}),
        },
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '健康盘 ' + h.start + ' ~ ' + h.end,
    eyebrow: 'calorie.view.health · 饮食域',
    subtitle: h.dashboard.message,
    content: parts.join(''),
    charts: false, pageUi: true,
  });
}
