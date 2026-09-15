/** #109 · 运动域全文档装配（数据→区块→填充器）；#452 换融合版式；**#523 去分隔符形状化 ＋ 文案去冗余**。
 *
 * 范围（#353 后：身体两页已迁 `src/body/bodyDocs.ts`，本件只留运动两页）：`calorie.view.exercise`
 * （汇总：KPI 四格／每日消耗折线／类型消耗分布／逐日与按类型明细）／`calorie.view.exercise-goal`
 * （对照目标：环卡／判决胶囊／差距文案）。不碰：运动 6 项需移植（→ #111）、训练计划与向导（→ #86）、
 * 缺口/组合/异常/禁忌（→ #110）、饮食域（#108 已关）。体重五页在 `src/weight/plateDocs.ts`（#294）。
 *
 * #452 融合（地图 #156 第 3 票，形状照已验样板 #423）：① 页头写人话（无命令键／票号／工序词）；
 * ② 汇总页四块逐块判空，长窗口**截断明示**；③ 目标页环取 `min(pct,100)`＋判决胶囊两态，目标缺席
 * 走专门空态不画空环；④ 口径行走 #420 `renderCaliberLine`；⑤ 来源脚注走 #422；⑥ 可打印走
 * `assembleDocPage` 的 `printable` 透传位（#448）。
 *
 * ── #523 三样债（分隔符／机器词／重复事实）＋ 手机端同档，本件落法 ──
 *   ① **分隔符**：可见文本零硬串分隔符（探针口径见 #508）。落点四处——
 *      · 页头眉标 `运动 · 汇总` → `运动汇总`（类别＋页族两个字都在，只是不用 `·` 串）；
 *      · `<title>` 的品牌 `·` → 空格（照 #401 样板先例）；
 *      · KPI 卡 `detail` 槽的 `·` 串 → 一条事实只写一处（另一条撤给同页别的卡，不是删）；
 *      · 页脚来源行**不再走 `src/shared/sourceLine.ts`**（那件的 `·` 串是跨场景共用位，
 *        本族改用 `sportUi.factStrip()` 的键值行承接；共用层口径统一归 **#470**，本票吸收其一角）；
 *      · 口径行里 `；` 串 → 每条事实一个 `renderCaliberLine`（公共层既有件，不重造形状）。
 *   ② **机器词上屏**：来源名从库表名改成读者看得懂的话；`月／日` 这类数值列走显示层取整。
 *   ③ **重复事实**：窗口与天数只在窗口条／H1 各出现一次；截断三数拆成一句一事
 *      （表标题只报本窗天数，可见行数与被截天数只住截断明示一句）；类型分布由柱状图改分布条
 *      （长分类名在 x 轴上重叠越界）；目标页「已达成」只住判决胶囊一处，环下键值行已撤
 *      （目标／实际／差额只在数值四格一处）。#523 返修落点。
 *   ④ **手机端同档**：页内形状件的 820 段＋触摸面在 `src/exercise/sportUi.ts`（本件正文首项放它的样式）。
 *
 * 取数仍由调用方备齐（`home/exercise.ts`／`render/planPlate.ts`）；本层不查库、不返空。
 */
import {
  renderCaliberLine,
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderDistributionRows,
  renderKpiGrid,
  renderListRows,
  renderTocBlock,
} from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { escapeHtml } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { emptyGuide } from '../shared/emptyGuide.js';
import { commandLine } from '../shared/writeParts.js';
import { nowStamp } from './receipt.js';
import { inferCategory } from '../exercise/exerciseStore.js';
import { exerciseUiCss, factStrip, fmtNum, windowStrip } from '../exercise/sportUi.js';
import type { DaySeries } from '../analysis/series.js';
import type { ExerciseView } from '../home/exercise.js';
import type { ExerciseGoalView } from './planPlate.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  #523：品牌名里的 `·` 去掉——`·` 是分隔符债，`<title>` 也是可见文本（探针按 `#401` 样板加了这条锁）。 */
const DOC_TITLE = '卡路里 运动';

/** 逐日明细表最多摆几行（超上限**逐条明示**：表标题只报本窗天数，可见行数只报这一截）。
 *  口径取全仓既有上限写法（`copyArea` 的 100 条 caption 同数），不静默截数。 */
const DAILY_CAP = 100;

/** 分布条最多列几类（#523 返修）：类型名的柱状图 x 轴在 9 个长分类名下互相重叠、右端越出画布
 *  （`把手式蝴蝶机飞鸟` 8 个字以 `x≈288` 居中，横跨约 248～328，画布宽只有 320），故柱状图不再画，
 *  改走公共层 `renderDistributionRows`（名称 ｜ 条 ｜ 数值，HTML 横排，全称照印、窄屏自然换行）。
 *  其余逐条仍归下方「按类型明细」表（条给一眼，表给逐条）。 */
const DIST_TOP = 8;

/** 人话眉标（页头不许出现命令键；两页各一句）。
 *  #523：`运动 · 汇总` 的 `·` 去掉——类别（运动）与页族（汇总）两个字都在，只是不拿符号串。 */
const SUMMARY_EYEBROW = '运动汇总';
const GOAL_EYEBROW = '运动对照目标';

/** 来源脚注上给**读者看**的来源名：可见文本零 snake_case（库表名只留在复制日志的「来源」段里，
 *  那是给复核的人照抄用的技术原件，不上页面）。
 *  #552 去文：SOURCE_LOGGED 已删（运动汇总来源块整块消失后本件只剩目标页用 SOURCE_GOAL；
 *  用户裁决“口径/来源块消失”——见票面判据）。 */
const SOURCE_GOAL = '每日目标 ＋ 运动记录';

/** 数值的展示写形一律走 `sportUi.fmtNum()`（显示层取整，见 #523）；本件不再另立一个 `fmt`。 */
/** 窗内天数（闭区间；只做天数差，不当取数口径）。 */
function daysIn(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
}
/** 日期链的展示写形：`起 ~ 止`（`~` 是日期区间的既有写法，见 #508 的豁免清单，不算并列分隔符）。 */
const rangeText = (start: string, end: string): string => start + ' ~ ' + end;

/** 页内一张卡（`id` 即页内导航的锚点，导航项按同一份清单生成；`shell` 是它的区块外壳）。 */
interface Card { readonly id: string; readonly label: string; readonly html: string }

function shell(c: Card): string { return '<section id="' + c.id + '">' + c.html + '</section>'; }

/** 页面级小件的类名（融合件：#421／#452 的页内构件都落这一族；样式随 `pageShell` 区落盘）。 */
function part(name: string): string { return 'ilife-block-' + name; }

/** 页内导航：锚点清单由卡片表派生（不手抄第二份 id）。 */
function tocOf(cards: readonly Card[]): string {
  return renderTocBlock({ items: cards.map((c) => ({ id: c.id, text: c.label })) });
}

/** 页内一张卡（锚点 id ＋ 区块 HTML）——页内导航与正文都吃它。 */
function card(id: string, label: string, html: string): Card { return { id, label, html }; }

/** 来源脚注（#523 形状化）：键值行「数据来源／窗口／记录数」，三个独立文本节点，
 *  不再产 `数据来源 · <来源> · 起 → 止 · 共 N 条` 那种 `·` 串（口径统一归 #470）。 */
function footFacts(source: string, start: string, end: string, count: number): string {
  return factStrip([
    { k: '数据来源', v: source },
    { k: '窗口', v: start + ' → ' + end },
    { k: '记录数', v: '共 ' + fmtNum(count, 0) + ' 条' },
  ]);
}

/** 复制区（两页共用）：三格式数据 ＋ 复制日志（命令／来源／时刻／版本）。 */
function docCopy(env: SerializableEnvelope, command: string, source: string): string {
  return copyArea({
    data: { envelope: env },
    log: { envelope: env, copyLog: copyLog({ command, source, actionAt: nowStamp(), version: DOC_VERSION }) },
  });
}

/** 壳内正文顺序（两页共用）：页内样式 → 锚点导航 → 卡片 → 口径行 → 来源脚注 → 复制区。
 *  页内样式恒为第一项（`assembleDocPage` 没有页内 CSS 入口，做法同 `src/weight/weightUi.ts`）。 */
function pageBody(cards: readonly Card[], caliber: readonly string[], source: string, copy: string): string {
  return [
    exerciseUiCss(),
    tocOf(cards),
    cards.map(shell).join(''),
    caliber.map((t) => renderCaliberLine(t)).join(''),
    source,
    copy,
  ].join('');
}

/* ══════════ 一、运动汇总（exercise_summary.html 的 mode=summary 一支：KPI＋折线＋分布＋明细） ══════════ */

/** KPI 四格（#523 去重复事实：四条各报一件事，同一个数不在两张卡上各写一遍）。
 *  窗口三处（H1／窗口条／页脚）已各有一份，卡里不再复读。 */
function summaryKpi(v: ExerciseView): KpiCardInput[] {
  const r = v.review;
  return [
    { label: '总消耗', value: fmtNum(r.totalBurned), unit: '卡' },
    { label: '总时长', value: fmtNum(r.totalMinutes, 0), unit: '分钟',
      detail: '每次平均 ' + fmtNum(r.totalMinutes / Math.max(1, r.sessions), 0) + ' 分钟' },
    { label: '次数', value: String(r.sessions), unit: '次', detail: '活跃 ' + r.activeDays + ' 天' },
    { label: '日均', value: fmtNum(v.avgBurnedPerLoggedDay), unit: '卡', detail: '按有记录的天数算' },
  ];
}

/** 逐日表的截断口径（一处算）：表标题只报本窗天数，可见行数与被截掉的天数只住截断明示那一句
 *  （#523 返修：原来 caption 与 `sui-note` 把「表被截断、看折线」各说一遍，现拆成一句一事）。
 *  返回的 `note` 只在超上限时出，且**必带「截断」二字**（回归判据读它）。 */
function truncation(days: number): { visible: boolean; caption: string; note: string } {
  if (days <= DAILY_CAP) return { visible: false, caption: '本窗共 ' + days + ' 天', note: '' };
  return {
    visible: true,
    caption: '本窗共 ' + days + ' 天',
    note: '逐日表已截断：显示最近 ' + DAILY_CAP + ' 天，其余 ' + (days - DAILY_CAP) + ' 天见上方折线',
  };
}

/** 逐日消耗表：窗内**每天都有一行**（无记录日留空，不断 0）；超上限时只摆最近一截并明示。
 *  表标题不再复读窗口（窗口住页头窗口条与 H1），也不复读写法说明（住页底口径行）。
 *  单元格走 `fmtNum`——库里的 `153.60000000000002` 那样的原值不上屏。 */
function seriesCard(v: ExerciseView): Card | null {
  if (v.series.length === 0) return null;
  const rows = v.series.map((d: DaySeries) => ({
    date: d.date, burn: d.exerciseKcal === null ? '—' : fmtNum(d.exerciseKcal, 1),
  }));
  const cut = truncation(rows.length);
  const table = renderDataTable({
    columns: [{ key: 'date', label: '日期' }, { key: 'burn', label: '消耗', align: 'right' }],
    rows: cut.visible ? rows.slice(rows.length - DAILY_CAP) : rows,
    caption: '按日消耗（' + cut.caption + '）',
    emptyText: '本窗无按日消耗',
  });  return {
    id: 'sec-series', label: '逐日明细',
    html: table + (cut.note === '' ? '' : '<p class="sui-note">' + escapeHtml(cut.note) + '</p>'),
  };
}

/** 按类型明细表（力量／有氧筛选子集：同窗不同类直出，无类切换页）。
 *  #523：表标题只留类数，删掉「力量／有氧筛选子集同窗直出」那句读者用不上的工序话；
 *  数值一律走显示层取整（库里 `1680.8000000000004` 那样的原值不上屏）。 */
function typeCard(v: ExerciseView): Card | null {
  const byType = v.review.byType;
  if (byType.length === 0) return null;
  return {
    id: 'sec-type',
    label: '按类型明细',
    html: renderDataTable({
      columns: [
        { key: 'type', label: '类型' }, { key: 'cat', label: '分类' }, { key: 'sessions', label: '次数', align: 'right' },
        { key: 'burned', label: '消耗', align: 'right' }, { key: 'minutes', label: '时长', align: 'right' },
      ],
      rows: byType.map((t) => ({
        type: t.type, cat: inferCategory(t.type), sessions: t.sessions,
        burned: fmtNum(t.burned), minutes: fmtNum(t.minutes, 0),
      })),
      caption: '按类型明细（共 ' + byType.length + ' 类）',
      emptyText: '本窗无类型明细',
    }),
  };
}

/** 汇总页的卡片清单（页内导航与正文走**同一份清单**，锚点不会指到不存在的 id）：
 *  四格 KPI ／ 每日消耗折线 ／ 类型消耗分布 ／ 逐日明细 ／ 按类型明细 ／ 按分类汇总，逐块判空。 */
function summaryCards(v: ExerciseView): Card[] {
  const r = v.review;
  const cards: Card[] = [{ id: 'sec-kpi', label: '核心数字', html: renderKpiGrid(summaryKpi(v)) }];
  const logged = v.series.filter((d: DaySeries) => d.exerciseKcal !== null);
  if (logged.length > 0) {
    cards.push(card('sec-trend', '每日消耗', renderChartBlock({
      kind: 'line',
      title: '每日消耗',
      input: {
        items: v.series.map((d: DaySeries) => ({ label: d.date.slice(5), value: d.exerciseKcal })),
        options: { markLine: { value: v.avgBurnedPerLoggedDay ?? undefined, label: '日均' } },
      },
    })));
  }
  if (r.byType.length > 0) {
    // #523 返修：类型消耗分布不再画柱状图（长分类名在 x 轴上重叠越界），改走分布条——
    // 全称照印、窄屏自然换行；只列消耗最高的这几类，超上限时用一句注明去向（该句只出现一次）。
    const top = [...r.byType].sort((a, b) => b.burned - a.burned).slice(0, DIST_TOP);
    const max = top.length === 0 || !Number.isFinite(top[0].burned) || top[0].burned <= 0 ? 0 : top[0].burned;
    const distNote = r.byType.length > DIST_TOP
      ? '<p class="sui-note">' + escapeHtml('只列消耗最高的 ' + DIST_TOP + ' 类，逐类消耗见下方按类型明细表') + '</p>'
      : '';
    cards.push(card('sec-dist', '类型消耗分布', renderDistributionRows({
      rows: top.map((t) => ({
        label: t.type,
        value: fmtNum(t.burned) + ' 卡',
        pct: max === 0 ? 0 : Math.max(0, Math.min(100, (t.burned / max) * 100)),
      })),
    }) + distNote));
  }
  const series = seriesCard(v);
  if (series !== null) cards.push(series);
  const type = typeCard(v);
  if (type !== null) cards.push(type);
  const cats = Object.entries(r.byCategory);
  if (cats.length > 0) {
    cards.push(card('sec-cat', '按分类汇总', renderDisclosure({
      title: '按分类汇总（共 ' + cats.length + ' 类）',
      contentHtml: renderListRows({
        items: cats.map(([cat, s]) => ({ left: cat, main: s.sessions + ' 次', right: fmtNum(s.burned) + ' 卡' })),
      }),
    })));
  }
  return cards;
}

/* #552 去文：summaryCalibers 整函数删（仅此处用；用户裁决“口径/来源块消失”——见票面判据）。 */

function summaryEnvelope(v: ExerciseView): SerializableEnvelope {
  const r = v.review;
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise',
    data: {
      metrics: metricsOf({
        totalBurned: r.totalBurned, totalMinutes: r.totalMinutes, sessions: r.sessions,
        activeDays: r.activeDays, totalBurnedSeries: v.totalBurnedSeries,
        avgBurnedPerLoggedDay: v.avgBurnedPerLoggedDay, seriesActiveDays: v.activeDays,
      }),
    },
  };
}

/** 运动汇总整页（只读页：数据由调用方 `buildExerciseView` 备齐；零记录走空态指引）。
 *  #552 去文（用户裁决“标题无日期；副题元素消失；口径/来源块消失”——见票面判据）：
 *  标题只留“运动汇总”（窗口由 windowStrip 承载）；副题整行删（传 subtitle:null）；
 *  口径/来源整块消失（pageBody 传 [] 与空串）。 */
export function buildExerciseDoc(v: ExerciseView, cmd?: string): string {
  const env = summaryEnvelope(v);
  const copy = docCopy(env, cmd ?? commandLine('calorie.view.exercise', { start: v.start, end: v.end }), 'exercise_log（只读汇总）');
  const title = '运动汇总';
  if (v.series.length === 0) {
    // 零窗（装配层构造）＝一整页空态指引：不留空 KPI 卡、不出空折线。
    return assembleDocPage({
      docTitle: DOC_TITLE, title, eyebrow: SUMMARY_EYEBROW, subtitle: '本段时间没有运动记录',
      content: exerciseUiCss() + '<section id="sec-empty">' + emptyGuide({
        icon: '🏃', text: '本段时间没有运动记录',
        hint: '先说一句「记运动」把这一次补上，或把窗口换成最近 7 天再看。',
      }) + '</section>',
      printable: true,
    }) + copy;
  }
  const cards = summaryCards(v);
  return assembleDocPage({
    docTitle: DOC_TITLE, title, eyebrow: SUMMARY_EYEBROW,
    subtitle: null,
    // 窗口条（#523）：起止两枚日期块 ＋ 天数胶囊，替掉原来挤在副标题／表标题里的 `·` 串。
    // #552 去文：窗口只由 windowStrip 承载（用户裁决“窗口由 windowStrip 承载”——见票面判据）。
    content: windowStrip(v.start, v.end, daysIn(v.start, v.end) + ' 天')
      + pageBody(cards, [], '', copy),
    charts: true, printable: true,
  });
}

/* ══════════ 二、运动目标（exercise_goal_view.html：环卡＋判决胶囊＋差距；目标缺席走空态） ══════════ */

/** 目标页入参：`ExerciseGoalView` 的 `goalTotal`／`pct` 可为 `null`（＝未设目标，走专门空态）；
 *  `cmd`／`source` 只进复制日志（页上看不见命令键）。 */
export interface ExerciseGoalPageInput extends Omit<ExerciseGoalView, 'goalTotal' | 'pct'> {
  readonly goalTotal: number | null;
  readonly pct: number | null;
  readonly cmd?: string;
  readonly source?: string;
}

/** 环卡：`min(pct,100)` 给环，实际百分比由文字承载（超额不把环画爆）。
 *  #523 返修：环下那行「目标／实际／差距」键值行已撤——这三个数在下方「数值对照」四格各有一处，
 *  环旁只留判决胶囊（同一事实一页一处；「差距／差额」两名一数也随之收成「差额」一名）。
 *  环心只留百分比读数，判语（已达成／还需再练）只住胶囊一处。 */
function ringCard(v: ExerciseGoalPageInput, pct: number): string {
  const deg = Math.max(0, Math.min(100, Math.min(pct, 100)));
  return '<div class="' + part('ring-card') + '">'
    + '<div class="' + part('ring-wrap') + '" role="img" aria-label="运动目标完成度 ' + fmtNum(v.pct) + '%">'
    + '<div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--blue) 0 ' + deg + '%, var(--line) ' + deg + '% 100%)"></div>'
    + '<div class="' + part('ring-center') + '">'
    + '<div class="' + part('ring-pct') + '">' + fmtNum(v.pct) + '%</div>'
    + '</div></div>'
    + '<div class="' + part('ring-side') + '">'
    + verdictPill(v)
    + '</div></div>';
}

/** 判决胶囊：达成 `ok`／未达成 `no`（两态同一个类的两个档）。 */
function verdictPill(v: ExerciseGoalPageInput): string {
  const text = v.achieved ? '✓ 已达成目标' : '✕ 还差 ' + fmtNum(Math.abs(v.gap), 0) + ' 卡';
  return '<span class="' + part('verdict') + ' ' + (v.achieved ? 'ok' : 'no') + '">' + text + '</span>';
}

/** 目标页数值四格（本页「目标／实际／完成度／差额」唯一的落点：环只给一眼的完成度，逐项对照全在这里）。
 *  #523 返修：判决只住胶囊一处（窗口条后的状态徽标与环心判语两处已撤，不再一页三遍）。 */
function goalFigures(v: ExerciseGoalPageInput, goalTotal: number): string {
  return renderKpiGrid([
    { label: '目标', value: fmtNum(goalTotal, 0), unit: '卡' },
    { label: '实际', value: fmtNum(v.actual, 0), unit: '卡' },
    { label: '完成度', value: fmtNum(v.pct) + '%', detail: '环最高画到 100%' },
    { label: '差额', value: fmtNum(Math.abs(v.gap), 0), unit: '卡', detail: v.gap >= 0 ? '超出目标' : '还差这么多' },
  ]);
}

/** 周口径那句：**全仓只在本件算一处（days === 7 时才对周口径负责）、写一处**。
 *  返回 `null` ＝ 本窗不是整周，不出这句（免得把日口径页也印成周口径）。 */
function weekCaliberLine(v: ExerciseGoalPageInput, goalTotal: number): string | null {
  if (v.days !== 7) return null;
  return '周目标口径＝每日目标 × 7：每日目标 ' + fmtNum(v.dailyGoal, 0) + ' 卡 × 7 = ' + fmtNum(goalTotal, 0) + ' 卡';
}

/** 目标页口径行（#523 一条事实一行；周口径那句只走这里一处）。 */
function goalCalibers(v: ExerciseGoalPageInput, goalTotal: number | null): string[] {
  const parts: string[] = [
    '完成度＝实际 ÷ 目标',
    '差额＝实际 − 目标',
    '每日目标 ' + fmtNum(v.dailyGoal, 0) + ' 卡',
  ];
  if (goalTotal !== null) {
    const week = weekCaliberLine(v, goalTotal);
    if (week !== null) parts.push(week);
  }
  return parts;
}

function goalEnvelope(v: ExerciseGoalPageInput): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise-goal',
    data: {
      metrics: metricsOf({
        dailyGoal: v.dailyGoal, goalTotal: v.goalTotal, actual: v.actual,
        pct: v.pct, gap: v.gap, achieved: v.achieved ? 1 : 0, days: v.days,
      }),
    },
  };
}

/** 运动目标整页：目标缺席（`goalTotal`／`pct` 为 `null`）＝专门空态、**不画空环**；
 *  有目标＝环卡（`min(pct,100)`）＋判决胶囊两态＋差距文案。 */
export function buildExerciseGoalDoc(v: ExerciseGoalPageInput, cmd?: string): string {
  const env = goalEnvelope(v);
  const copy = docCopy(
    env,
    cmd ?? commandLine('calorie.view.exercise-goal', { start: v.start, end: v.end }),
    v.source ?? 'daily_goal ＋ exercise_log（只读对照）',
  );
  const title = '运动目标 ' + rangeText(v.start, v.end);
  if (v.goalTotal === null || v.pct === null) {
    return assembleDocPage({
      docTitle: DOC_TITLE, title, eyebrow: GOAL_EYEBROW, subtitle: '还没设每日运动消耗目标',
      content: exerciseUiCss() + '<section id="sec-empty">' + emptyGuide({
        icon: '🎯', text: '还没设每日运动消耗目标',
        hint: '先说一句「定营养目标」把每日运动消耗目标定下来，再看这张对照页。',
      }) + '</section>',
      printable: true,
    }) + copy;
  }
  const goalTotal = v.goalTotal;
  const cards: Card[] = [
    card('sec-ring', '目标环', ringCard(v, v.pct)),
    card('sec-figures', '数值对照', goalFigures(v, goalTotal)),
  ];
  const source = footFacts(SOURCE_GOAL, v.start, v.end, v.days);
  return assembleDocPage({
    docTitle: DOC_TITLE, title, eyebrow: GOAL_EYEBROW,
    subtitle: '这段时间的运动消耗与每日目标的对照',
    content: windowStrip(v.start, v.end, v.days + ' 天')
      + pageBody(cards, goalCalibers(v, goalTotal), source, copy),
    printable: true,
  });
}

/* ── 身体两页已迁出（#353）：体成分／围度整页文档原样迁入 `src/body/bodyDocs.ts`，本件只留运动页。 ── */
