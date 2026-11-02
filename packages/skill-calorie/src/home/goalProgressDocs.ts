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
 * #467 切片·用户逐字点名删来源脚注与部分口径行：页上不再出「数据来源：…」（来源只留复制日志第 4 段），
 * 日均／缺口／转场／达标四组口径句已删，图下读法与空态句保留（禁区：图表／达标表／复制区本身不动）。
 *
 * 文本纪律（同批页面共同要求，#401c 已先做样板）：**参数名、常量名、英文内部标识符一律不上屏**。
 * 重做前两张卡的值位直接印枚举原文——`kpi('缺口趋势', g.deficit.summary.trend)` 与 `kpi('摄入趋势',
 * g.trend.summary.trend)`，取值是 `'up' | 'down' | 'flat'`／`'loss' | 'gain' | 'flat'`；本件换成
 * 人话（`trendPhrase`／`deficitDirection`），机器判据在 `test/t467-goal-progress.test.mjs`。
 *
 * 空窗与库为空是两态（`t425-融合基准.md:156-159` 裁定 4）：窗口为空仍出完整页（标题 ＋ 空态句 ＋ 引导句
 * ＋ 空态口径句；来源脚注已按 #467 切片·用户逐字点名删除），读数一律 `—`；库为空仍走取数层的缺失阻断、不落盘。两态的分辨在 `today.ts` 的出口。
 */
import type { StatusKind } from 'base-paint';
import {
  renderCaliberLine, renderChartBlock, renderChips, renderConclusionBar,
  renderDataTable, renderKpiGrid, renderListRows, renderTocBlock,
} from 'base-paint/blocks';
import type { ListRowInput } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { emptyGuide } from '../shared/emptyGuide.js';
import { nowStamp } from '../render/receipt.js';
import type { DayGoalStatus } from '../goal/goalHistory.js';
import type { GoalProgress } from '../goal/goalPlates.js';
import { m } from '../entries/index.js';
import type { SkillCalorieMessageId } from '../entries/index.js';

/** head 标题（整页模板住 `src/shared/docPage.ts`）＋ envelope 头（值冻结对齐 `cli/keys.ts`）。 */
const DOC_TITLE_KEY = 'skill-calorie.home-goalProgressDocs.c063' as const;
const docTitle = (): string => m(DOC_TITLE_KEY);
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 页头眉标（人话）：**只留产品名**（裁定 1 禁上屏英文内部标识符，故不印命令键）。 */
const eyebrow = (): string => m('skill-calorie.home-goalProgressDocs.c064');

/** 可见文本缺值口径（裁定 4）：写 `—`，不写 0、不写空串、不拿缺省值顶替。 */
const DASH = '—';

/** 五个区块的身份清单（锚点 id ＋ 图标 ＋ 名）：页内导航与段标题**同走这一份**，锚点不会指到不存在的 id。
 *  图标全页只留段标题一处（每块一枚），导航不把同一枚印第二遍（#401g 口径）。 */
const SEC_GOAL = { id: 'sec-goal', icon: '🎯', name: 'skill-calorie.home-goalProgressDocs.c065' } as const;
const SEC_TREND = { id: 'sec-trend', icon: '📈', name: 'skill-calorie.home-goalProgressDocs.c066' } as const;
const SEC_HISTORY = { id: 'sec-history', icon: '📊', name: 'skill-calorie.home-goalProgressDocs.c067' } as const;
const SEC_GUIDE = { id: 'sec-guide', icon: '📝', name: 'skill-calorie.home-goalProgressDocs.c068' } as const;
/** 复制区落点锚（`sec-copy`）：用户缺陷 6（2026-09-15）「有『💰 数据与日志』文字的直接删」⇒
 *  本页复制区**不出标题**（`copyArea` 不传 `title`），页内导航也不再收这一项（#401 主页族同口径）。
 *  `id` 保留，外链深跳稳定。 */
const SEC_COPY = { id: 'sec-copy' } as const;

/** 来源脚注上给**读者看**的来源名（可见文本零 snake_case；库表名只留在复制日志的来源段里）。
 *  #467 切片后页上来源行已删（用户逐字点名），本常量只供复制日志第 4 段 `source` 用。 */
const sourceLogged = (): string => m('skill-calorie.home-goalProgressDocs.c069');

/** 段标题的**文本形状**（图标 ＋ 空格 ＋ 名）：段标题与表格 caption 都走它，不手抄第二遍。 */
function secTitle(section: { readonly icon: string; readonly name: SkillCalorieMessageId }): string {
  return section.icon + ' ' + m(section.name);
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
  /** 热量目标有没有落在**本窗图上的量程内**：不在就不画目标线（改写进读数），见 `intakeChart`。 */
  readonly targetInRange: boolean;
  /** 还没纳入本页完成度的三项目标（今天在库里的值；`null` ＝ 那项还没设）。 */
  readonly proteinGoal: number | null;
  readonly waterGoal: number | null;
  readonly exerciseGoal: number | null;
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
  /** 蛋白／饮水／运动三项目标：**目标行在就有**（与 `data` 两态无关，空窗页也照给）。
   *  缺省 `null` ＝ 那项还没设；出口传值时不额外判定，缺值口径由 `num()` 统一收口。 */
  readonly proteinGoal?: number | null;
  readonly waterGoal?: number | null;
  readonly exerciseGoal?: number | null;
  /** 本次命令原文（日志第 4 段「调用链」），由出口按本次参数拼；照抄可重跑。 */
  readonly command: string;
}

/** 目标值里**画得出来**的那些（图上的 `null` 点位不参与量程）。 */
function loggedValues(points: readonly (number | null)[]): number[] {
  return points.filter((p): p is number => p !== null && p !== undefined);
}

/** 目标线量程判定（照仓内裁定 `weight/plate.ts:99-113`）：目标给出**且落在数据量程内**才画线；
 *  越界不画——由页面把它改写进读数（老技能那条「画了但读不到的线」不再出现）。
 *  图表层按**数据量程**算 y（`base-render/src/charts.ts:1164`），量程外的 `value` 会画到绘图区外，
 *  而 `.ilife-charts-svg{overflow:visible}` 不裁剪 ⇒ 一条飘到卡片区的橙线，比不画更糟。 */
function targetInRange(points: readonly (number | null)[], goal: number | null): boolean {
  const values = loggedValues(points);
  return goal !== null && goal !== undefined && values.length > 0
    && goal >= Math.min(...values) && goal <= Math.max(...values);
}

/** 事实派生：`data === null` 时除目标外一律空（缺值口径不在这一层判，`num()` 统一收口）。 */
function factsOf(input: GoalProgressDocInput): Facts {
  const days = Math.round((Date.parse(input.end) - Date.parse(input.start)) / 86400000) + 1;
  const g = input.data;
  const notCounted = {
    proteinGoal: input.proteinGoal ?? null, waterGoal: input.waterGoal ?? null,
    exerciseGoal: input.exerciseGoal ?? null, targetInRange: false,
  };
  if (g === null) {
    return {
      goal: input.calorieGoal, windowDays: days, loggedDays: 0, avgIntake: null, avgDeficit: null,
      windowDeficit: null, lossKg: null, completed: null, loggedInHistory: null, rate: null,
      ...notCounted,
    };
  }
  const points = g.trend.series.map((p) => p.calorie);
  return {
    goal: input.calorieGoal,
    windowDays: days,
    loggedDays: loggedValues(points).length,
    avgIntake: g.trend.summary.avg,
    avgDeficit: g.deficit.summary.avgDeficit,
    windowDeficit: g.deficit.summary.weeklyDeficit,
    lossKg: g.deficit.summary.predictedLossKg,
    completed: g.history.completedCount,
    loggedInHistory: g.history.completedCount + g.history.incompleteCount,
    rate: g.completionPct,
    proteinGoal: input.proteinGoal ?? null,
    waterGoal: input.waterGoal ?? null,
    exerciseGoal: input.exerciseGoal ?? null,
    targetInRange: targetInRange(points, input.calorieGoal),
  };
}

/* ── 档位徽章（判定与文案都只做一处；色值由公共层的四档 `status` 给，本件不写色） ── */

/** 达标率 → 徽章（四档 `STATUS_KINDS`）。文案随档给，**不印状态机里的英文枚举**——
 *  `STATUS_DEFAULT_TEXT` 的「成功／警告／失败／无数据」是控件缺省值，页面自己给业务说法。 */
function rateStatus(rate: number | null | undefined): { status: StatusKind; statusText: string } | null {
  if (rate === null || rate === undefined) return null;
  const shown = Math.round(rate) + '%';
  if (rate >= 90) return { status: 'ok', statusText: m('skill-calorie.home-goalProgressDocs.c001', { p0: String(shown) }) };
  if (rate >= 60) return { status: 'warn', statusText: m('skill-calorie.home-goalProgressDocs.c002', { p0: String(shown) }) };
  return { status: 'danger', statusText: m('skill-calorie.home-goalProgressDocs.c003', { p0: String(shown) }) };
}

/** 完成率（0–100）：**分子分母有一个缺就不给**（缺值口径裁定 4——没有目标就不摆徽章）。
 *  与 `homeDocs.ts:133-139` 的 `pctStatus` 配对：那边算率、这边判档，徽章文案仍只这一处写。 */
function pctOf(value: number | null, goal: number | null): number | null {
  if (value === null || goal === null || !Number.isFinite(goal) || goal <= 0) return null;
  return (value / goal) * 100;
}

/** 缺口方向徽章：本页「缺口」相对的是**消耗**而不是目标，套完成率档位是假信息 ⇒ 按差额正负给方向词。
 *  缺口为正 ⟺ 摄入比消耗少（与卡名同向），词与卡名成一句，不再反着说「消耗多于摄入」。 */
function deficitDirection(n: number | null | undefined): { status: StatusKind; statusText: string } | null {
  if (n === null || n === undefined) return null;
  if (n > 0) return { status: 'ok', statusText: m('skill-calorie.home-goalProgressDocs.c004') };
  if (n < 0) return { status: 'warn', statusText: m('skill-calorie.home-goalProgressDocs.c005') };
  return { status: 'empty', statusText: m('skill-calorie.home-goalProgressDocs.c006') };
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
  const head = m('skill-calorie.home-goalProgressDocs.c007');
  if (delta < -50) return m('skill-calorie.home-goalProgressDocs.c008', { p0: String(head), p1: String(Math.abs(delta)) });
  if (delta > 50) return m('skill-calorie.home-goalProgressDocs.c009', { p0: String(head), p1: String(delta) });
  return m('skill-calorie.home-goalProgressDocs.c010', { p0: String(head) });
}

/** 单日达标账的说法：数据层给的是「完成／未完成」两值，但达标带是 80%–120% ⇒ 按 `pct` 分三档更好读
 *  （口径不变，仍是同一条带；只是「未完成」拆成偏少与超出两种，读者才知道往哪边调）。 */
function verdictOf(d: DayGoalStatus): string {
  if (d.status === '无记录' || d.pct === null) return DASH;
  if (d.pct < 80) return m('skill-calorie.home-goalProgressDocs.c011');
  if (d.pct > 120) return m('skill-calorie.home-goalProgressDocs.c012');
  return m('skill-calorie.home-goalProgressDocs.c013');
}

/** 结论条文本（读序＝标题 → 一句结论 → 数字卡）：先给判定，后给两个读数。
 *  **不复述**卡片里已有的数（日均缺口、累计缺口都在卡上），本句只说「日均对目标怎么样」。 */
function conclusionText(f: Facts): string {
  if (f.avgIntake === null) return '';
  const goal = f.goal;
  if (goal === null || goal === undefined) return m('skill-calorie.home-goalProgressDocs.c014');
  const diff = Math.round(f.avgIntake - goal);
  if (diff === 0) return m('skill-calorie.home-goalProgressDocs.c015', { p0: String(f.avgIntake), p1: String(goal) });
  const dirWord = diff > 0 ? m('skill-calorie.home-goalProgressDocs.c016') : m('skill-calorie.home-goalProgressDocs.c017');
  return m('skill-calorie.home-goalProgressDocs.c018', {
    p0: String(f.avgIntake),
    p1: String(goal),
    p2: String(dirWord),
    p3: String(Math.abs(diff)),
  });
}

/** KPI 四张：热量目标／日均缺口／本窗累计缺口／达标天数（达标账另带它自己的窗口字面）。
 *  徽章四处都按「卡名那个词的档位」给（对齐 `homeDocs.ts:217-236` 四张全带）：热量目标卡按
 *  本窗日均摄入占目标判档，本窗累计缺口卡走方向词，达标天数卡走完成率档位。 */
function kpiCards(f: Facts, historyDays: number): KpiCardInput[] {
  return [
    {
      label: m('skill-calorie.home-goalProgressDocs.c019'), value: num(f.goal), unit: m('skill-calorie.home-goalProgressDocs.c020'),
      detail: m('skill-calorie.home-goalProgressDocs.c021', { p0: String(num(f.avgIntake)) }),
      ...(rateStatus(pctOf(f.avgIntake, f.goal)) ?? {}),
    },
    { label: m('skill-calorie.home-goalProgressDocs.c022'), value: num(f.avgDeficit), unit: m('skill-calorie.home-goalProgressDocs.c023'), ...(deficitDirection(f.avgDeficit) ?? {}) },
    {
      label: m('skill-calorie.home-goalProgressDocs.c024'), value: num(f.windowDeficit), unit: m('skill-calorie.home-goalProgressDocs.c025'),
      detail: m('skill-calorie.home-goalProgressDocs.c026', { p0: String(num(f.lossKg)) }),
      ...(deficitDirection(f.windowDeficit) ?? {}),
    },
    {
      // 卡名的窗口字面挂着 `historyDays`（它是入参、不是本窗天数）：这一列说的是**达标账那个窗口**。
      label: m('skill-calorie.home-goalProgressDocs.c027', { p0: String(historyDays) }), value: num(f.completed), unit: m('skill-calorie.home-goalProgressDocs.c028'),
      detail: m('skill-calorie.home-goalProgressDocs.c029', {
        p0: String(historyDays),
        p1: String(num(f.loggedInHistory)),
      }),
      ...(rateStatus(f.rate) ?? {}),
    },
  ];
}

/** 今天还没纳入本页的那三项目标（蛋白／饮水／运动）：**有目标就把目标值上屏**，没设就写「还没设」。
 *  这三项今天都不参与上面的完成度与缺口（那是 #396 的事），本件只如实呈现三行值；
 *  唤醒词句已按 #467 切片·用户逐字点名删除。 */
function notCountedRows(f: Facts): ListRowInput[] {
  return [
    { left: '蛋白', main: m('skill-calorie.home-goalProgressDocs.c030'), right: f.proteinGoal === null ? m('skill-calorie.home-goalProgressDocs.c031') : num(f.proteinGoal) + ' 克' },
    { left: m('skill-calorie.home-goalProgressDocs.c032'), main: m('skill-calorie.home-goalProgressDocs.c033'), right: f.waterGoal === null ? m('skill-calorie.home-goalProgressDocs.c034') : m('skill-calorie.home-goalProgressDocs.c035', { p0: String(num(f.waterGoal)) }) },
    { left: '运动', main: m('skill-calorie.home-goalProgressDocs.c036'), right: f.exerciseGoal === null ? m('skill-calorie.home-goalProgressDocs.c037') : m('skill-calorie.home-goalProgressDocs.c038', { p0: String(num(f.exerciseGoal)) }) },
  ];
}

/** 「本期之外那三项」那一块：只留行列表（#467 切片·用户逐字点名删总说 caliber 句：
 *  原总说句「本页的完成度与缺口只算热量。上面这三项目标今天还没纳入，本页不给它们的完成率。」
 *  ＋后续唤醒词句已删；`renderListRows` 的 `emptyText` 可选（`base-render/src/blocks.ts:727`）且本块恒 3 行，
 *  签名不强制，故不补中性短句——若后续签名变必填再补并报用户复核）。 */
function notCountedBlock(f: Facts): string {
  return renderListRows({ items: notCountedRows(f) });
}

/** 每日达标表最多列这么多行（`historyDays` 可到 365，整页不该无边上长）；截断另起一句明示。 */
const HISTORY_ROWS = 62;

/** 每日达标表（近 `historyDays` 天）：目标列是常量列⇒不设这一列，行内只留随日变化的三个读数
 *  （先例 `homeDocs.ts:266-268`）；最多 `HISTORY_ROWS` 行。**只列有记录的日子**（本票一处取舍）：
 *  稀疏记录会让整张表绝大多数行是三格 `—`（也是「拿符号顶 UI」）；没记录的日子既不算达标也不算落空。 */
function historyTable(g: GoalProgress, historyDays: number, day: (d: string) => string, today: string): string {
  const all = g.history.goalHistory.filter((d) => d.status !== '无记录').reverse();
  const rows = all.slice(0, HISTORY_ROWS).map((d) => ({
    date: d.date === today ? m('skill-calorie.home-goalProgressDocs.c039', { p0: String(day(d.date)) }) : day(d.date),
    cal: d.calorieActual,
    pct: d.pct === null ? DASH : Math.round(d.pct) + '%',
    verdict: verdictOf(d),
  }));
  const truncated = all.length > HISTORY_ROWS ? m('skill-calorie.home-goalProgressDocs.c040', { p0: String(HISTORY_ROWS) }) : '';
  return renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'cal', label: m('skill-calorie.home-goalProgressDocs.c041'), align: 'right' },
      { key: 'pct', label: m('skill-calorie.home-goalProgressDocs.c042'), align: 'right' },
      { key: 'verdict', label: m('skill-calorie.home-goalProgressDocs.c043') },
    ],
    rows,
    caption: m('skill-calorie.home-goalProgressDocs.c044', {
      p0: String(secTitle(SEC_HISTORY)),
      p1: String(historyDays),
      p2: String(all.length),
      p3: String(truncated),
    }),
    emptyText: m('skill-calorie.home-goalProgressDocs.c045', { p0: String(historyDays) }),
  });
}

/** 摄入走势图（本窗）：只画**有记录的每一天**，没记录的那天不补 0、连线跨过空档（`connectNulls`，
 *  与 `homeDocs.ts:254-259` 同一口径）。目标线**只在它落在量程内时**才画（`factsOf` 判好的 `targetInRange`）：
 *  量程外不传 `markLine`——`base-render/src/charts.ts:1164` 按数据量程算 y，越界值会画到绘图区外面，
 *  而 `.ilife-charts-svg{overflow:visible}` 不裁剪 ⇒ 橙线直接飘到 KPI 卡区（#467 复核的 P0 实拍）。 */
function intakeChart(g: GoalProgress, day: (d: string) => string, f: Facts): string {
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
        markLine: f.targetInRange && f.goal !== null ? { value: f.goal, label: m('skill-calorie.home-goalProgressDocs.c046') } : undefined,
      },
    },
  });
}

/** 图下那句读法：**线画了就说线，没画就说数**——线在量程外时不画，句子里也不得再承诺一条虚线
 *  （否则屏幕上那句话就是假话）。两句都保留「点是有记录的每一天」这条读法。 */
function chartCaliber(f: Facts, g: GoalProgress): string {
  const logged = loggedValues(g.trend.series.map((p) => p.calorie));
  const trend = trendPhrase(g.trend.series.map((p) => p.calorie));
  if (f.targetInRange) return m('skill-calorie.home-goalProgressDocs.c047', { p0: String(num(f.goal)), p1: String(trend) });
  const span = logged.length === 0 ? ''
    : m('skill-calorie.home-goalProgressDocs.c048', {
      p0: String(Math.min(...logged)),
      p1: String(Math.max(...logged)),
      p2: String(num(f.goal)),
    });
  return m('skill-calorie.home-goalProgressDocs.c049', { p0: String(span), p1: String(trend) });
}

/** `calorie.view.goal-progress` 的整页装配（`<!doctype html>` 起，双击即开）。
 *
 *  块序（两态一致，只有中段不同）：页头胶囊 → 结论条（空窗时换成空态句）→ 页内导航 →
 *  目标完成卡 →〔摄入走势｜先记一笔〕→ 每日达标表 → 数据与日志（来源只留复制日志，页上来源行已删）。
 *  三条恒出（`t425` 裁定 3）本页已按 #467 切片·用户逐字点名改：页内导航恒出；口径说明行只剩图下读法与空态句；
 *  来源脚注不再出（用户点名删除）。 */
export function buildGoalProgressDoc(input: GoalProgressDocInput): string {
  const f = factsOf(input);
  const day = dayLabel(input.start, input.end);
  const empty = input.data === null;
  const toc: Array<{ id: string; text: string }> = [{ id: SEC_GOAL.id, text: m(SEC_GOAL.name) }];
  const sections: string[] = [];

  sections.push('<section id="' + SEC_GOAL.id + '"><h2 class="' + H2_CLASS + '">' + secTitle(SEC_GOAL) + '</h2>'
    + renderKpiGrid(kpiCards(f, input.historyDays))
    // #467 切片·用户逐字点名删两句口径：原「日均按窗口天数摊平，没记录的日子也算一天。」
    // ＋「缺口是消耗减摄入的差，正数表示摄入比消耗少。」两行 renderCaliberLine 已删。
    // 四项目标落一项：三项目标值如实上屏（行列表只留值，总说句已按同一切片删除）。
    + notCountedBlock(f)
    + '</section>');

  if (empty) {
    // 空窗（裁定 4）：整页仍是完整页，缺值一律 `—`，空态句后接一句「怎么记第一条」的引导句。
    toc.push({ id: SEC_GUIDE.id, text: m(SEC_GUIDE.name) });
    sections.push('<section id="' + SEC_GUIDE.id + '"><h2 class="' + H2_CLASS + '">' + secTitle(SEC_GUIDE) + '</h2>'
      + emptyGuide({
        icon: '🍽️',
        text: m('skill-calorie.home-goalProgressDocs.c050'),
        hint: m('skill-calorie.home-goalProgressDocs.c051'),
      })
      + renderCaliberLine(m('skill-calorie.home-goalProgressDocs.c052'))
      + '</section>');
  } else {
    const g = input.data as GoalProgress;
    // 折线要两点以上才不是假图（`t425` 裁定 5）：窗口里只有一个有记录日时整块不出、说明句也不出。
    if (f.loggedDays >= 2) {
      toc.push({ id: SEC_TREND.id, text: m(SEC_TREND.name) });
      sections.push('<section id="' + SEC_TREND.id + '">'
        + intakeChart(g, day, f)
        + renderCaliberLine(chartCaliber(f, g))
        + '</section>');
    }
    toc.push({ id: SEC_HISTORY.id, text: m(SEC_HISTORY.name) });
    // #467 切片·用户逐字点名删转场整句（原「上面那张折线图是窗口…／这个窗口里只有一天…＋下面这张表看的是近…」整行已删）
    // ＋删达标口径两句（原「达标口径：当日摄入占目标的 80% 到 120% 之间算达标。」＋「没记录的日子不列表，既不算达标也不算落空。」已删）。
    sections.push('<section id="' + SEC_HISTORY.id + '">' + historyTable(g, input.historyDays, day, input.end)
      + '</section>');
  }
  // 复制区（裁定 7 ＋ 用户缺陷 6）：两颗按钮、无标题（标题位空着，公共层即不出 `<h2>`），
  // 导航不同步收无标题区；数据按钮挂三格式菜单，日志第 4 段写本次命令原文。
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
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command: input.command,
        source: m('skill-calorie.home-goalProgressDocs.c053', { p0: sourceLogged() }),
        actionAt: nowStamp(),
        version: DOC_VERSION,
      }),
    },
  }) + '</section>');

  const content = [
    // 页头胶囊：页面身份 ＋ 本窗天数 ＋ 有记录几天（窗口区间归页头副题那一行，全页只出现一次）。
    renderChips({ items: [
      { text: m('skill-calorie.home-goalProgressDocs.c054') },
      { text: m('skill-calorie.home-goalProgressDocs.c055', { p0: String(f.windowDays) }) },
      { text: m('skill-calorie.home-goalProgressDocs.c056', { p0: String(f.loggedDays), p1: String(f.windowDays) }) },
    ] }),
    // 结论条只在有读数时出；空窗那句由空态块承担（同一句话一页只出现一处）。
    empty ? '' : renderConclusionBar(conclusionText(f)),
    renderTocBlock({ items: toc }),
    sections.join(''),
    // #467 切片·用户逐字点名删来源行（原 `renderCaliberLine('数据来源：' + SOURCE_LOGGED + '。')` 已删；
    // 来源名仍在复制日志第 4 段 `SOURCE_LOGGED` 里可重跑，页上不再另起一行）。
  ].join('');

  // 页名一处派生：h1 与 `<title>` 走同一个串（浏览器标签页上也带着窗口，不再只写「目标进度」）；
  // #628 起先看窗口词（`command` 里 `window` 原文）：周窗（本周／week_cur）页名一律带「本周」二字（周一 1 天窗如实写「近 1 天目标进度（本周）」，不许只写「今日」）；`<title>` 那串**不带 `·`**（分隔符探针口径见 `docs/skills/skill-calorie/t161-勘察-响应式与视觉配方.md:434-445`），窗口改用括号承载。
  const WEEK_WINDOW = '本周';
  const week628 = new RegExp('"window"\\s*:\\s*"(' + WEEK_WINDOW + '|week_cur)"').test(input.command);
  const title = week628 ? m('skill-calorie.home-goalProgressDocs.c057', { p0: String(f.windowDays) }) : (f.windowDays <= 1 ? m('skill-calorie.home-goalProgressDocs.c058') : m('skill-calorie.home-goalProgressDocs.c059', { p0: String(f.windowDays) }));
  return assembleDocPage({
    docTitle: week628 ? m('skill-calorie.home-goalProgressDocs.c060', { p0: docTitle() }) : (title === m('skill-calorie.home-goalProgressDocs.c058') ? docTitle() : m('skill-calorie.home-goalProgressDocs.c061', { p0: docTitle(), p1: String(f.windowDays) })),
    title,
    eyebrow: eyebrow(),
    subtitle: m('skill-calorie.home-goalProgressDocs.c062', { p0: String(input.start), p1: String(input.end) }),
    content,
    charts: !empty && f.loggedDays >= 2, pageUi: true,
  });
}
