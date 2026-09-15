/** #467 · 「看今日目标进度」整页重做的归位件（HELP 一级分组「主页」下一级）。
 *
 * 为什么重做：用户 2026-09-14 肉眼审本轮 9 份产物后对**这一页**单独点名——
 * 「`看今日目标进度.html` 严重警告！这个 HTML 质量特别差！需要完全重做重新开发。」（逐字，载票 #467）。
 * 重做前是**片段**：1666 字节、无 `<!doctype html>`，装配住 `src/render/html.ts` 的 `renderGoalProgressHtml`、
 * 调用在 `src/home/today.ts` 的 `viewGoalProgress`。本件照 #370 的先例**另立**整页装配（不是搬迁：
 * 旧片段函数原样留在 `html.ts`，给 `render-t9` 那条片段判据用；`html.ts` 是别家 T351 的在途文件，一行不动）。
 *
 * 版式来源（**不凭空设计、不手抄样式段**）：形状标杆是同一族的整页装配 `home/homeDocs.ts`
 * （#401／#401c／#401g／#507 逐轮定稿），块顺序与件逐条对齐——KPI 网格带状态徽章档位 → 段标题带图标 →
 * 页内导航胶囊 → 结论条 → 口径行 → 三格式复制区（`data` ＋「复制日志」）→ 来源脚注（浅色口径行，
 * 不走 `notice()` 深底块）。字号与档位色一律不在本件写：版面单源住 `packages/base-render/`。
 *
 * 文本纪律（同批页面共同要求，#401c 已先做样板）：**参数名、常量名、英文内部标识符一律不上屏**。
 * 重做前两张卡的值位直接印枚举原文——`kpi('缺口趋势', g.deficit.summary.trend)` 与 `kpi('摄入趋势',
 * g.trend.summary.trend)`，取值是 `'up' | 'down' | 'flat'`／`'loss' | 'gain' | 'flat'`；本件换成
 * 人话（`trendPhrase`／`deficitDirection`），机器判据在 `test/t467-goal-progress.test.mjs`。
 *
 * 空窗与库为空是两态（`t425-融合基准.md:156-159` 裁定 4）：窗口为空仍出完整页（标题 ＋ 空态句 ＋ 引导句
 * ＋ 来源脚注），读数一律 `—`；库为空仍走取数层的缺失阻断、不落盘。两态的分辨在 `today.ts` 的出口。
 */
import type { StatusKind } from 'base-paint';
import {
  renderCaliberLine, renderChartBlock, renderChips, renderConclusionBar,
  renderDataTable, renderKpiGrid, renderTocBlock,
} from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { emptyGuide } from '../shared/emptyGuide.js';
import { nowStamp } from '../render/receipt.js';
import type { DayGoalStatus } from '../fetch/goalHistory.js';
import type { GoalProgress } from '../render/goalPlate.js';

/** head 标题（整页模板住 `src/shared/docPage.ts`）＋ envelope 头（值冻结对齐 `cli/keys.ts`）。 */
const DOC_TITLE = '卡路里 目标进度';
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 页头眉标（人话）：**只留产品名**（裁定 1 禁上屏英文内部标识符，故不印命令键）。 */
const EYEBROW = '卡路里';

/** 可见文本缺值口径（裁定 4）：写 `—`，不写 0、不写空串、不拿缺省值顶替。 */
const DASH = '—';

/** 五个区块的身份清单（锚点 id ＋ 图标 ＋ 名）：页内导航与段标题**同走这一份**，锚点不会指到不存在的 id。
 *  图标全页只留段标题一处（每块一枚），导航不把同一枚印第二遍（#401g 口径）。 */
const SEC_GOAL = { id: 'sec-goal', icon: '🎯', name: '目标完成' } as const;
const SEC_TREND = { id: 'sec-trend', icon: '📈', name: '摄入走势' } as const;
const SEC_HISTORY = { id: 'sec-history', icon: '📊', name: '每日达标' } as const;
const SEC_GUIDE = { id: 'sec-guide', icon: '📝', name: '先记一笔' } as const;
const SEC_COPY = { id: 'sec-copy', icon: '💰', name: '数据与日志' } as const;

/** 来源脚注上给**读者看**的来源名（可见文本零 snake_case；库表名只留在复制日志的来源段里）。 */
const SOURCE_LOGGED = '饮食记录，运动记录，每日目标';

/** 段标题的**文本形状**（图标 ＋ 空格 ＋ 名）：段标题与表格 caption 都走它，不手抄第二遍。 */
function secTitle(section: { readonly icon: string; readonly name: string }): string {
  return section.icon + ' ' + section.name;
}

/** KPI 网格没有标题槽（`renderKpiGrid` 只吃卡数组），故这一处手写 `<h2>`；类名与 `homeDocs.ts:241` 同一把尺。 */
const H2_CLASS = 'ilife-block-kpi-card-title';

/** 日期上屏只有一种短长法（`MM-DD`；跨年才补两位年份），表内与图轴**同走本函数**；窗口区间不在此列。 */
function dayLabel(start: string, end: string): (date: string) => string {
  const crossYear = start.slice(0, 4) !== end.slice(0, 4);
  return (date: string): string => (crossYear ? date.slice(2) : date.slice(5));
}

/** 整数值上屏：缺值一律 `—`（`unit` 与值分槽，走 `KpiCardInput` 的两个位）。 */
function num(n: number | null | undefined): string {
  return n === null || n === undefined ? DASH : String(n);
}

/* ── 本页读的事实（一处派生，卡片／结论／空态全走它；`data === null` 即「目标在、窗内零记录」） ── */

interface Facts {
  readonly goal: number | null;
  readonly windowDays: number;
  readonly loggedDays: number;
  readonly avgIntake: number | null;
  readonly avgDeficit: number | null;
  readonly windowDeficit: number | null;
  readonly lossKg: number | null;
  readonly completed: number | null;
  readonly loggedInHistory: number | null;
  readonly rate: number | null;
}

/** 整页装配的入参：出口按当刻的取数结果给事实，本件不取数、不猜口径。 */
export interface GoalProgressDocInput {
  readonly start: string;
  readonly end: string;
  /** 达标账看多少天（命令参数 `historyDays`，缺省 30）——它**不是**本窗，页上逐处如实写出来。 */
  readonly historyDays: number;
  /** 热量目标：`data === null` 时也照给（目标有、只是窗内没记录）。 */
  readonly calorieGoal: number | null;
  /** 窗口内一条记录也没有时为 `null`（走空态页，不编 0）。 */
  readonly data: GoalProgress | null;
  /** 本次命令原文（日志第 4 段「调用链」），由出口按本次参数拼；照抄可重跑。 */
  readonly command: string;
}

/** 事实派生：`data === null` 时除目标外一律空（缺值口径不在这一层判，`num()` 统一收口）。 */
function factsOf(input: GoalProgressDocInput): Facts {
  const days = Math.round((Date.parse(input.end) - Date.parse(input.start)) / 86400000) + 1;
  const g = input.data;
  if (g === null) {
    return {
      goal: input.calorieGoal, windowDays: days, loggedDays: 0, avgIntake: null, avgDeficit: null,
      windowDeficit: null, lossKg: null, completed: null, loggedInHistory: null, rate: null,
    };
  }
  return {
    goal: input.calorieGoal,
    windowDays: days,
    loggedDays: g.trend.series.filter((p) => p.calorie !== null && p.calorie !== undefined).length,
    avgIntake: g.trend.summary.avg,
    avgDeficit: g.deficit.summary.avgDeficit,
    windowDeficit: g.deficit.summary.weeklyDeficit,
    lossKg: g.deficit.summary.predictedLossKg,
    completed: g.history.completedCount,
    loggedInHistory: g.history.completedCount + g.history.incompleteCount,
    rate: g.completionPct,
  };
}

/* ── 档位徽章（判定与文案都只做一处；色值由公共层的四档 `status` 给，本件不写色） ── */

/** 达标率 → 徽章（四档 `STATUS_KINDS`）。文案随档给，**不印状态机里的英文枚举**——
 *  `STATUS_DEFAULT_TEXT` 的「成功／警告／失败／无数据」是控件缺省值，页面自己给业务说法。 */
function rateStatus(rate: number | null | undefined): { status: StatusKind; statusText: string } | null {
  if (rate === null || rate === undefined) return null;
  const shown = Math.round(rate) + '%';
  if (rate >= 90) return { status: 'ok', statusText: '多数达标 ' + shown };
  if (rate >= 60) return { status: 'warn', statusText: '达标过半 ' + shown };
  return { status: 'danger', statusText: '多数没达标 ' + shown };
}

/** 缺口方向徽章：本页「缺口」相对的是**消耗**而不是目标，套完成率档位是假信息 ⇒ 按差额正负给方向词。
 *  缺口为正 ⟺ 摄入比消耗少（与卡名同向），词与卡名成一句，不再反着说「消耗多于摄入」。 */
function deficitDirection(n: number | null | undefined): { status: StatusKind; statusText: string } | null {
  if (n === null || n === undefined) return null;
  if (n > 0) return { status: 'ok', statusText: '摄入比消耗少' };
  if (n < 0) return { status: 'warn', statusText: '摄入比消耗多' };
  return { status: 'empty', statusText: '摄入与消耗持平' };
}

/** 摄入趋势的中文说法：数据层的 `'up' | 'down' | 'flat'` **不上屏**，这里换成人话。
 *
 *  **一处有意偏离（本票记账）**：数据层的 `trend.summary.trendValue` 拿**没记录的首日当 0**
 *  （`analysis/trend.ts` 的 `startAvg = series[0].calorie ?? 0`，是 #160 明写「本票之外的口径」）
 *  ⇒ 本窗稀疏时（例如 30 天窗只记了最近 7 天）会算出「摄入上涨了 1339 卡」这种假涨跌。
 *  本件只用**图上也画得出来的那些点**比首末两个有记录日（阈值仍取数据层那 ±50 卡），
 *  句子在页上如实写「跟窗口里第一个有记录的日子比」，读者能自己对照图核。 */
function trendPhrase(points: readonly (number | null)[]): string {
  const logged = points.filter((p): p is number => p !== null && p !== undefined);
  if (logged.length < 2) return '';
  const delta = Math.round((logged[logged.length - 1] as number) - (logged[0] as number));
  const head = '跟窗口里第一个有记录的日子比，摄入';
  if (delta < -50) return head + '下降了 ' + Math.abs(delta) + ' 卡。';
  if (delta > 50) return head + '上升了 ' + delta + ' 卡。';
  return head + '基本没变。';
}

/** 单日达标账的说法：数据层给的是「完成／未完成」两值，但达标带是 80%–120% ⇒ 按 `pct` 分三档更好读
 *  （口径不变，仍是同一条带；只是「未完成」拆成偏少与超出两种，读者才知道往哪边调）。 */
function verdictOf(d: DayGoalStatus): string {
  if (d.status === '无记录' || d.pct === null) return DASH;
  if (d.pct < 80) return '偏少';
  if (d.pct > 120) return '超出';
  return '达标';
}

/** 结论条文本（读序＝标题 → 一句结论 → 数字卡）：先给判定，后给两个读数。
 *  **不复述**卡片里已有的数（日均缺口、累计缺口都在卡上），本句只说「日均对目标怎么样」。 */
function conclusionText(f: Facts): string {
  if (f.avgIntake === null) return '';
  const goal = f.goal;
  if (goal === null || goal === undefined) return '热量目标还没有，先在「定营养目标」里设一个。';
  const diff = Math.round(f.avgIntake - goal);
  if (diff === 0) return '本窗日均摄入 ' + f.avgIntake + ' 卡，正好贴着热量目标 ' + goal + ' 卡。';
  return '本窗日均摄入 ' + f.avgIntake + ' 卡，比热量目标 ' + goal + ' 卡'
    + (diff > 0 ? '高 ' : '低 ') + Math.abs(diff) + ' 卡。';
}

/** KPI 四张：热量目标／日均缺口／本窗累计缺口／达标天数（达标账另带它自己的窗口字面）。 */
function kpiCards(f: Facts, historyDays: number): KpiCardInput[] {
  return [
    { label: '热量目标', value: num(f.goal), unit: '卡', detail: '本窗日均摄入 ' + num(f.avgIntake) + ' 卡' },
    { label: '日均缺口', value: num(f.avgDeficit), unit: '卡', ...(deficitDirection(f.avgDeficit) ?? {}) },
    {
      label: '本窗累计缺口', value: num(f.windowDeficit), unit: '卡',
      detail: '折合体重 ' + num(f.lossKg) + ' 公斤',
    },
    {
      label: '达标天数', value: num(f.completed), unit: '天',
      detail: '近 ' + historyDays + ' 天里有记录 ' + num(f.loggedInHistory) + ' 天',
      ...(rateStatus(f.rate) ?? {}),
    },
  ];
}

/** 每日达标表最多列这么多行（`historyDays` 可到 365，整页不该无边上长）；截断另起一句明示。 */
const HISTORY_ROWS = 62;

/** 每日达标表（近 `historyDays` 天）：目标列是常量列⇒不设这一列，行内只留随日变化的三个读数
 *  （先例 `homeDocs.ts:266-268`）；最多 `HISTORY_ROWS` 行。**只列有记录的日子**（本票一处取舍）：
 *  稀疏记录会让整张表绝大多数行是三格 `—`（也是「拿符号顶 UI」）；没记录的日子既不算达标也不算落空。 */
function historyTable(g: GoalProgress, historyDays: number, day: (d: string) => string, today: string): string {
  const all = g.history.goalHistory.filter((d) => d.status !== '无记录').reverse();
  const rows = all.slice(0, HISTORY_ROWS).map((d) => ({
    date: d.date === today ? day(d.date) + '（今日）' : day(d.date),
    cal: d.calorieActual,
    pct: d.pct === null ? DASH : Math.round(d.pct) + '%',
    verdict: verdictOf(d),
  }));
  const truncated = all.length > HISTORY_ROWS ? '，本表只列最近 ' + HISTORY_ROWS + ' 天' : '';
  return renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'cal', label: '摄入（卡）', align: 'right' },
      { key: 'pct', label: '占目标', align: 'right' },
      { key: 'verdict', label: '达成情况' },
    ],
    rows,
    caption: secTitle(SEC_HISTORY) + '（近 ' + historyDays + ' 天里有记录 ' + all.length + ' 天）' + truncated,
    emptyText: '近 ' + historyDays + ' 天里一天记录也没有',
  });
}

/** 摄入走势图（本窗）：只画**有记录的每一天**，没记录的那天不补 0、连线跨过空档（`connectNulls`，
 *  与 `homeDocs.ts:254-259` 同一口径）。实线上另压一条热量目标参考线。 */
function intakeChart(g: GoalProgress, day: (d: string) => string, goal: number | null): string {
  const points = g.trend.series.map((p) => ({ label: day(p.date), value: p.calorie }));
  return renderChartBlock({
    kind: 'line',
    title: secTitle(SEC_TREND),
    input: {
      items: points,
      options: {
        connectNulls: true,
        yTicks: 3,
        labels: 'select',
        format: (v: number) => String(Math.round(v)),
        markLine: { value: goal ?? undefined, label: '热量目标' },
      },
    },
  });
}

/** `calorie.view.goal-progress` 的整页装配（`<!doctype html>` 起，双击即开）。
 *
 *  块序（两态一致，只有中段不同）：页头胶囊 → 结论条（空窗时换成空态句）→ 页内导航 →
 *  目标完成卡 →〔摄入走势｜先记一笔〕→ 每日达标表 → 数据与日志 → 来源脚注。
 *  三条恒出（`t425` 裁定 3）：页内导航、口径说明行、来源脚注。 */
export function buildGoalProgressDoc(input: GoalProgressDocInput): string {
  const f = factsOf(input);
  const day = dayLabel(input.start, input.end);
  const empty = input.data === null;
  const toc: Array<{ id: string; text: string }> = [{ id: SEC_GOAL.id, text: SEC_GOAL.name }];
  const sections: string[] = [];

  sections.push('<section id="' + SEC_GOAL.id + '"><h2 class="' + H2_CLASS + '">' + secTitle(SEC_GOAL) + '</h2>'
    + renderKpiGrid(kpiCards(f, input.historyDays))
    // 日均与缺口的读法都只这写一处：本页四个读数各归其位，页脚不再重复第二遍。
    + renderCaliberLine('日均按窗口天数摊平，没记录的日子也算一天。缺口是消耗减摄入的差，正数表示摄入比消耗少。')
    + '</section>');

  if (empty) {
    // 空窗（裁定 4）：整页仍是完整页，缺值一律 `—`，空态句后接一句「怎么记第一条」的引导句。
    toc.push({ id: SEC_GUIDE.id, text: SEC_GUIDE.name });
    sections.push('<section id="' + SEC_GUIDE.id + '"><h2 class="' + H2_CLASS + '">' + secTitle(SEC_GUIDE) + '</h2>'
      + emptyGuide({
        icon: '🍽️',
        text: '这一段还没有饮食记录，所以除了热量目标以外的读数都算不出来。',
        hint: '先记一餐：说「记一餐」，或者直接说「看今日主页」记一条。',
      })
      + renderCaliberLine('这一段一条记录也没有，所以读数一律写 —，不按 0 算。')
      + '</section>');
  } else {
    const g = input.data as GoalProgress;
    // 折线要两点以上才不是假图（`t425` 裁定 5）：窗口里只有一个有记录日时整块不出、说明句也不出。
    if (f.loggedDays >= 2) {
      toc.push({ id: SEC_TREND.id, text: SEC_TREND.name });
      sections.push('<section id="' + SEC_TREND.id + '">'
        + intakeChart(g, day, f.goal)
        + renderCaliberLine('虚线是热量目标 ' + num(f.goal) + ' 卡，点是有记录的每一天。'
          + trendPhrase(g.trend.series.map((p) => p.calorie)))
        + '</section>');
    }
    toc.push({ id: SEC_HISTORY.id, text: SEC_HISTORY.name });
    sections.push('<section id="' + SEC_HISTORY.id + '">' + historyTable(g, input.historyDays, day, input.end)
      // 达成情况这一列的说法必须在页上写清，否则「达标」两个字各有各的解释。
      + renderCaliberLine('达标口径：当日摄入占目标的 80% 到 120% 之间算达标。没记录的日子不列表，既不算达标也不算落空。')
      + '</section>');
  }
  toc.push({ id: SEC_COPY.id, text: SEC_COPY.name });

  // 复制区（裁定 7）：两颗按钮、无与按钮同名的标题；数据按钮挂三格式菜单，日志第 4 段写本次命令原文。
  // `as const` 不是风格：`SerializableEnvelope` 的 `version`／`skill`／`key` 是字面量类型，对象字面量
  // 不这么写就会被拓宽成 `string` 而装配不上（两处引用的是同一份，故先落变量、不抄两遍）。
  const envelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat',
    key: 'calorie.view.goal-progress',
    data: { metrics: metricsOf({
      calorie_goal: f.goal, completionPct: f.rate, weeklyDeficit: f.windowDeficit,
      predictedLossKg: f.lossKg, avgDeficit: f.avgDeficit, trendAvg: f.avgIntake,
      completedCount: f.completed,
      incompleteCount: f.loggedInHistory === null || f.completed === null ? null : f.loggedInHistory - f.completed,
    }) },
  } as const;
  sections.push('<section id="' + SEC_COPY.id + '">' + copyArea({
    title: secTitle(SEC_COPY),
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command: input.command,
        source: SOURCE_LOGGED + '（只读）',
        actionAt: nowStamp(),
        version: DOC_VERSION,
      }),
    },
  }) + '</section>');

  const content = [
    // 页头胶囊：页面身份 ＋ 本窗天数 ＋ 有记录几天（窗口区间归页头副题那一行，全页只出现一次）。
    renderChips({ items: [
      { text: '目标进度' },
      { text: '窗口 ' + f.windowDays + ' 天' },
      { text: '有记录 ' + f.loggedDays + '/' + f.windowDays + ' 天' },
    ] }),
    // 结论条只在有读数时出；空窗那句由空态块承担（同一句话一页只出现一处）。
    empty ? '' : renderConclusionBar(conclusionText(f)),
    renderTocBlock({ items: toc }),
    sections.join(''),
    renderCaliberLine('数据来源：' + SOURCE_LOGGED + '。'),
  ].join('');

  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: f.windowDays <= 1 ? '今日目标进度' : '近 ' + f.windowDays + ' 天目标进度',
    eyebrow: EYEBROW,
    subtitle: input.start + ' 至 ' + input.end,
    content,
    charts: !empty && f.loggedDays >= 2,
  });
}
