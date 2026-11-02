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
 *      **返修 R5（终审席 P2-7／P2-8，I1／I2）**：① 逐日表的表题不再复读窗口天数——表题收成
 *      「按日消耗」，天数只留页头窗口条一处（被截窗把本窗天数并进截断明示那一句）；
 *      ② 两张表的三个数值列都带上单位（「2 次」「800 卡」「90 分钟」），与同页分布条／折叠体同一种写法。
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
import { m } from '../entries/index.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  #523：品牌名里的 `·` 去掉——`·` 是分隔符债，`<title>` 也是可见文本（探针按 `#401` 样板加了这条锁）。 */
function DOC_TITLE() {
  return m('skill-calorie.render-sportDocs.c093');
}

/** 逐日明细表最多摆几行（超上限**逐条明示**：表标题只报本窗天数，可见行数只报这一截）。
 *  口径取全仓既有上限写法（`copyArea` 的 100 条 caption 同数），不静默截数。 */
const DAILY_CAP = 100;

/** 分布条最多列几类（#523 返修）：类型名的柱状图 x 轴在 9 个长分类名下互相重叠、右端越出画布
 *  （`把手式蝴蝶机飞鸟` 8 个字以 `x≈288` 居中，横跨约 248～328，画布宽只有 320），故柱状图不再画，
 *  改走公共层 `renderDistributionRows`（名称 ｜ 条 ｜ 数值，HTML 横排，全称照印、窄屏自然换行）。
 *  其余逐条仍归下方「按类型明细」表（条给一眼，表给逐条）。 */
const DIST_TOP = 8;

/** 人话眉标（页头不许出现命令键；两页各一句）。
 *  #523：`运动 · 汇总` 的 `·` 去掉——类别（运动）与页族（汇总）两个字都在，只是不拿符号串。
 *  #523 返修 R3：眉标原来与 H1（`运动汇总`）**逐字全同**——#552 把 H1 的日期摘掉之后两者撞成同一个串，
 *  视觉复评 R2 在汇总族两页各记 −5「眉标与 H1 逐字同名」。现眉标退回**类别词**「运动」、页族「汇总」
 *  由 H1 承载：两件事实都还在页头，眉标不再复读页名（与明细族「眉标＝运动记录／H1＝运动记录明细」同构）。 */
function SUMMARY_EYEBROW() {
  return m('skill-calorie.render-sportDocs.c094');
}
function GOAL_EYEBROW() {
  return m('skill-calorie.render-sportDocs.c095');
}

/** 来源脚注上给**读者看**的来源名：可见文本零 snake_case（库表名只留在复制日志的「来源」段里，
 *  那是给复核的人照抄用的技术原件，不上页面）。
 *  #552 去文：SOURCE_LOGGED 已删（运动汇总来源块整块消失后本件只剩目标页用 SOURCE_GOAL()；
 *  用户裁决“口径/来源块消失”——见票面判据）。 */
function SOURCE_GOAL() {
  return m('skill-calorie.render-sportDocs.c096');
}

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

/** 来源脚注（#523 形状化 ＋ #460 诚实口径）：键值行「数据来源／窗口／窗口天数」，
 *  `·` 串已去（口径归 #470）；取数面无条数字段，天数不再冒充条数，第三格如实报天。 */
function footFacts(source: string, start: string, end: string, days: number): string {
  return factStrip([
    { k: m('skill-calorie.render-sportDocs.c001'), v: source },
    { k: m('skill-calorie.render-sportDocs.c002'), v: start + ' → ' + end },
    { k: m('skill-calorie.render-sportDocs.c003'), v: m('skill-calorie.render-sportDocs.c004', { p0: String(fmtNum(days, 0)) }) },
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
    { label: m('skill-calorie.render-sportDocs.c005'), value: fmtNum(r.totalBurned, 0), unit: m('skill-calorie.render-sportDocs.c006') },
    { label: m('skill-calorie.render-sportDocs.c007'), value: fmtNum(r.totalMinutes, 0), unit: m('skill-calorie.render-sportDocs.c008'),
      detail: m('skill-calorie.render-sportDocs.c009', {
        p0: String(fmtNum(r.totalMinutes / Math.max(1, r.sessions), 0)),
      }) },
    { label: m('skill-calorie.render-sportDocs.c010'), value: String(r.sessions), unit: m('skill-calorie.render-sportDocs.c011'), detail: m('skill-calorie.render-sportDocs.c012', { p0: String(r.activeDays) }) },
    { label: m('skill-calorie.render-sportDocs.c013'), value: fmtNum(v.avgBurnedPerLoggedDay, 0), unit: m('skill-calorie.render-sportDocs.c014'), detail: m('skill-calorie.render-sportDocs.c015') },
  ];
}

/** #389 · 汇总页目标对照位（目标／对比目标在汇总页的落点）。
 *  口径复用目标页同一套（每日目标＋完成度＋差额经 `home/exercise.ts` 的目标公开接口来，不在本件重算）。
 *  形状守 #452／#552：只加一张卡（`sec-goal`），不加口径行、不加来源脚注，故汇总页口径行仍 0、来源仍无。
 *  存量直构造（未带目标字段）回 null＝不加卡，旧快照逐字节不变；显式 null＝未设目标，走未设指引。 */
function goalCard(v: ExerciseView): Card | null {
  if (!('dailyGoal' in v)) return null;
  const daily = v.dailyGoal ?? null;
  const total = v.goalTotal ?? null;
  const pct = v.goalPct ?? null;
  const gap = v.goalGap ?? null;
  const achieved = v.goalAchieved ?? null;
  if (daily === null || total === null || pct === null || gap === null || achieved === null) {
    return card('sec-goal', m('skill-calorie.render-sportDocs.c016'), '<h2 style="margin:0;font-size:15px;font-weight:700">目标对照</h2>' + emptyGuide({
      icon: '🎯', text: m('skill-calorie.render-sportDocs.c017'),
      hint: m('skill-calorie.render-sportDocs.c018'),
    }));
  }
  const verdict = '<span class="' + part('verdict') + ' ' + (achieved ? 'ok' : 'no') + '">'
    + (achieved ? m('skill-calorie.render-sportDocs.c019') : m('skill-calorie.render-sportDocs.c020', { p0: String(fmtNum(Math.abs(gap), 0)) })) + '</span>';
  return card('sec-goal', m('skill-calorie.render-sportDocs.c021'), '<h2 style="margin:0;font-size:15px;font-weight:700">目标对照</h2>'
    + renderKpiGrid([
      { label: m('skill-calorie.render-sportDocs.c022'), value: fmtNum(total, 0), unit: m('skill-calorie.render-sportDocs.c023') },
      { label: m('skill-calorie.render-sportDocs.c024'), value: fmtNum(v.review.totalBurned, 0), unit: m('skill-calorie.render-sportDocs.c025') },
      { label: m('skill-calorie.render-sportDocs.c026'), value: fmtNum(pct) + '%' },
      { label: m('skill-calorie.render-sportDocs.c027'), value: fmtNum(Math.abs(gap), 0), unit: m('skill-calorie.render-sportDocs.c028'), detail: gap >= 0 ? m('skill-calorie.render-sportDocs.c029') : m('skill-calorie.render-sportDocs.c030') },
    ]) + verdict);
}

/** 逐日表的截断口径（一处算）：**表题只报这张表是什么**，天数与截断三数全住截断明示那一句。
 *  #523 返修：原来 caption 与 `sui-note` 把「表被截断、看折线」各说一遍，现拆成一句一事。
 *  **R5 打回项 I2（终审席 P2-8）**：表题原来写「按日消耗（本窗共 N 天）」，那个 N 天与**页头窗口条
 *  右端那颗「N 天」胶囊是同一条事实**（同一页说两遍）。现表题收成「按日消耗」，天数只留页头窗口条
 *  一处；被截窗里本窗天数并进截断明示那一句（「本窗共 N 天 ＋ 显示最近 100 天 ＋ 其余 M 天」三数同句），
 *  读者在一个句子里就能对齐「窗共几天／表列几天／少了几」。
 *  返回的 `note` 只在超上限时出，且**必带「截断」二字**（#452 的回归判据读它）。 */
function truncation(days: number): { visible: boolean; note: string } {
  if (days <= DAILY_CAP) return { visible: false, note: '' };
  return {
    visible: true,
    note: m('skill-calorie.render-sportDocs.c031', {
      p0: String(days),
      p1: String(DAILY_CAP),
      p2: String(days - DAILY_CAP),
    }),
  };
}

/** 逐日消耗表：窗内**每天都有一行**（无记录日留空，不断 0）；超上限时只摆最近一截并明示。
 *  表标题不再复读窗口（窗口住页头窗口条与 H1），也不复读写法说明（住页底口径行）。
 *  单元格走 `fmtNum`——库里的 `153.60000000000002` 那样的原值不上屏。
 *  **R5 打回项 I1（终审席 P2-7）**：消耗列原来是裸数（`1250`），而同页分布条写「1250 卡」——
 *  一页两套单位写法、读者还要自己猜这一列是卡还是分钟。现单元格直接带单位「1250 卡」，
 *  与该页分布条／折叠体同一种写法（同族记录级明细页的四列本来就带单位，两族由此一致）。 */
function seriesCard(v: ExerciseView): Card | null {
  if (v.series.length === 0) return null;
  const rows = v.series.map((d: DaySeries) => ({
    date: d.date, burn: d.exerciseKcal === null ? '—' : m('skill-calorie.render-sportDocs.c032', { p0: String(fmtNum(d.exerciseKcal, 0)) }),
  }));
  const cut = truncation(rows.length);
  const table = renderDataTable({
    columns: [{ key: 'date', label: m('skill-calorie.render-sportDocs.c033') }, { key: 'burn', label: m('skill-calorie.render-sportDocs.c034'), align: 'right' }],
    rows: cut.visible ? rows.slice(rows.length - DAILY_CAP) : rows,
    caption: m('skill-calorie.render-sportDocs.c035'),
    emptyText: m('skill-calorie.render-sportDocs.c036'),
  });  return {
    id: 'sec-series', label: m('skill-calorie.render-sportDocs.c037'),
    html: (cut.note === '' ? '' : '<p class="sui-note">' + escapeHtml(cut.note) + '</p>') + table,
  };
}

/** 按类型明细表（力量／有氧筛选子集：同窗不同类直出，无类切换页）。
 *  #523：表标题只留类数，删掉「力量／有氧筛选子集同窗直出」那句读者用不上的工序话；
 *  数值一律走显示层取整（库里 `1680.8000000000004` 那样的原值不上屏）。
 *  **R5 打回项 I1**：三列数值原来都是裸数（次数 `2`、消耗 `800`、时长 `90`）且表头不带单位，
 *  读者要自己猜这两列是卡还是分钟；现与逐日表、分布条、折叠体统一成「值 ＋ 单位」
 *  （折叠体本来就写「2 次」「2200 卡」，三处同一写法）。 */
function typeCard(v: ExerciseView): Card | null {
  const byType = v.review.byType;
  if (byType.length === 0) return null;
  return {
    id: 'sec-type',
    label: m('skill-calorie.render-sportDocs.c038'),
    html: renderDataTable({
      columns: [
        { key: 'type', label: m('skill-calorie.render-sportDocs.c039') }, { key: 'cat', label: m('skill-calorie.render-sportDocs.c040') }, { key: 'sessions', label: m('skill-calorie.render-sportDocs.c041'), align: 'right' },
        { key: 'burned', label: m('skill-calorie.render-sportDocs.c042'), align: 'right' }, { key: 'minutes', label: m('skill-calorie.render-sportDocs.c043'), align: 'right' },
      ],
      rows: byType.map((t) => ({
        type: t.type, cat: inferCategory(t.type), sessions: m('skill-calorie.render-sportDocs.c044', { p0: String(t.sessions) }),
        burned: m('skill-calorie.render-sportDocs.c045', { p0: String(fmtNum(t.burned, 0)) }), minutes: m('skill-calorie.render-sportDocs.c046', { p0: String(fmtNum(t.minutes, 0)) }),
      })),
      caption: m('skill-calorie.render-sportDocs.c047', { p0: String(byType.length) }),
      emptyText: m('skill-calorie.render-sportDocs.c048'),
    }),
  };
}

/** 汇总页的卡片清单（页内导航与正文走**同一份清单**，锚点不会指到不存在的 id）：
 *  四格 KPI ／ 目标对照 ／ 每日消耗折线 ／ 类型消耗分布 ／ 逐日明细 ／ 按类型明细 ／ 按分类汇总，逐块判空。 */
function summaryCards(v: ExerciseView): Card[] {
  const r = v.review;
  const cards: Card[] = [{ id: 'sec-kpi', label: m('skill-calorie.render-sportDocs.c049'), html: '<h2 style="margin:0;font-size:15px;font-weight:700">核心数字</h2>' + renderKpiGrid(summaryKpi(v)) }];
  const goal = goalCard(v);
  if (goal !== null) cards.push(goal);
  const logged = v.series.filter((d: DaySeries) => d.exerciseKcal !== null);
  if (logged.length > 0) {
    cards.push(card('sec-trend', m('skill-calorie.render-sportDocs.c050'), renderChartBlock({
      kind: 'line',
      title: m('skill-calorie.render-sportDocs.c051'),
      input: {
        items: v.series.map((d: DaySeries) => ({ label: (v.start.slice(0, 4) !== v.end.slice(0, 4) ? d.date : d.date.slice(5)), value: d.exerciseKcal })),
        options: { markLine: { value: v.avgBurnedPerLoggedDay ?? undefined, label: m('skill-calorie.render-sportDocs.c052') }, showDots: true },
      },
    })));
  }
  if (r.byType.length > 0) {
    // #523 返修：类型消耗分布不再画柱状图（长分类名在 x 轴上重叠越界），改走分布条——
    // 全称照印、窄屏自然换行；只列消耗最高的这几类，超上限时用一句注明去向（该句只出现一次）。
    const top = [...r.byType].sort((a, b) => b.burned - a.burned).slice(0, DIST_TOP);
    const max = top.length === 0 || !Number.isFinite(top[0].burned) || top[0].burned <= 0 ? 0 : top[0].burned;
    const distNote = r.byType.length > DIST_TOP
      ? '<p class="sui-note">' + escapeHtml(m('skill-calorie.render-sportDocs.c053', { p0: String(DIST_TOP) })) + '</p>'
      : '';
    cards.push(card('sec-dist', m('skill-calorie.render-sportDocs.c054'), '<h2 style="margin:0;font-size:15px;font-weight:700">类型消耗分布</h2>' + renderDistributionRows({
      rows: top.map((t) => ({
        label: t.type,
        value: m('skill-calorie.render-sportDocs.c055', { p0: String(fmtNum(t.burned, 0)) }),
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
    cards.push(card('sec-cat', m('skill-calorie.render-sportDocs.c056'), renderDisclosure({
      title: m('skill-calorie.render-sportDocs.c057', { p0: String(cats.length) }),
      contentHtml: renderListRows({
        items: cats.map(([cat, s]) => ({ left: cat, main: m('skill-calorie.render-sportDocs.c058', { p0: String(s.sessions) }), right: m('skill-calorie.render-sportDocs.c059', { p0: String(fmtNum(s.burned, 0)) }) })),
      }),
    })));
  }
  return cards;
}

/* #552 去文：summaryCalibers 整函数删（仅此处用；用户裁决“口径/来源块消失”——见票面判据）。 */

function summaryEnvelope(v: ExerciseView): SerializableEnvelope {
  const r = v.review;
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: m('skill-calorie.render-sportDocs.c060'),
    data: {
      metrics: metricsOf({
        totalBurned: r.totalBurned, totalMinutes: r.totalMinutes, sessions: r.sessions,
        activeDays: r.activeDays, totalBurnedSeries: v.totalBurnedSeries,
        avgBurnedPerLoggedDay: v.avgBurnedPerLoggedDay, seriesActiveDays: v.activeDays,
        dailyGoal: v.dailyGoal ?? undefined, goalTotal: v.goalTotal ?? undefined,
        goalPct: v.goalPct ?? undefined, goalGap: v.goalGap ?? undefined,
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
  const copy = docCopy(env, cmd ?? commandLine('calorie.view.exercise', { start: v.start, end: v.end }), m('skill-calorie.render-sportDocs.c061'));
  const title = m('skill-calorie.render-sportDocs.c062');
  if (v.series.length === 0) {
    // 零窗（装配层构造）＝一整页空态指引：不留空 KPI 卡、不出空折线。
    return assembleDocPage({
      docTitle: DOC_TITLE(), title, eyebrow: SUMMARY_EYEBROW(), subtitle: m('skill-calorie.render-sportDocs.c063'),
      content: exerciseUiCss() + '<section id="sec-empty">' + emptyGuide({
        icon: '🏃', text: m('skill-calorie.render-sportDocs.c064'),
        hint: m('skill-calorie.render-sportDocs.c065'),
      }) + '</section>',
      printable: true,
      pageUi: true,
    }) + copy;
  }
  const cards = summaryCards(v);
  return assembleDocPage({
    docTitle: DOC_TITLE(), title, eyebrow: SUMMARY_EYEBROW(),
    subtitle: null,
    // 窗口条（#523）：起止两枚日期块 ＋ 天数胶囊，替掉原来挤在副标题／表标题里的 `·` 串。
    // #552 去文：窗口只由 windowStrip 承载（用户裁决“窗口由 windowStrip 承载”——见票面判据）。
    content: windowStrip(v.start, v.end, m('skill-calorie.render-sportDocs.c066', { p0: String(daysIn(v.start, v.end)) }))
      + pageBody(cards, [], '', copy),
    charts: true, printable: true,
    pageUi: true,
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
    + '<div class="' + part('ring-wrap') + '" role="img" aria-label="' + m('skill-calorie.render-sportDocs.c900', { p0: fmtNum(v.pct) }) + '">'
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
  const text = v.achieved ? m('skill-calorie.render-sportDocs.c067') : m('skill-calorie.render-sportDocs.c068', { p0: String(fmtNum(Math.abs(v.gap), 0)) });
  return '<span class="' + part('verdict') + ' ' + (v.achieved ? 'ok' : 'no') + '">' + text + '</span>';
}

/** 目标页数值四格（本页「目标／实际／完成度／差额」唯一的落点：环只给一眼的完成度，逐项对照全在这里）。
 *  #523 返修：判决只住胶囊一处（窗口条后的状态徽标与环心判语两处已撤，不再一页三遍）；**#602 补题**：本块原只有裸 KPI 卡格、块内无可见标题（终审 #268 §2.6 N1 的页枚举漏了 23／24 两页），现照同件 `sec-kpi`／`sec-dist` 同形，把题作为 `<section>` 首个子节点补上——题词与页内导航同源（都取 `card()` 的 label「数值对照」，两处不会走散），风格同档（15px／700）。 */
function goalFigures(v: ExerciseGoalPageInput, goalTotal: number): string {
  return renderKpiGrid([
    { label: m('skill-calorie.render-sportDocs.c069'), value: fmtNum(goalTotal, 0), unit: m('skill-calorie.render-sportDocs.c070') },
    { label: m('skill-calorie.render-sportDocs.c071'), value: fmtNum(v.actual, 0), unit: m('skill-calorie.render-sportDocs.c072') },
    { label: m('skill-calorie.render-sportDocs.c073'), value: fmtNum(v.pct) + '%', detail: m('skill-calorie.render-sportDocs.c074') },
    { label: m('skill-calorie.render-sportDocs.c075'), value: fmtNum(Math.abs(v.gap), 0), unit: m('skill-calorie.render-sportDocs.c076'), detail: v.gap >= 0 ? m('skill-calorie.render-sportDocs.c077') : m('skill-calorie.render-sportDocs.c078') },
  ]);
}

/** 周口径那句：**全仓只在本件算一处（days === 7 时才对周口径负责）、写一处**。
 *  返回 `null` ＝ 本窗不是整周，不出这句（免得把日口径页也印成周口径）。 */
function weekCaliberLine(v: ExerciseGoalPageInput, goalTotal: number): string | null {
  if (v.days !== 7) return null;
  return m('skill-calorie.render-sportDocs.c079', {
    p0: String(fmtNum(v.dailyGoal, 0)),
    p1: String(fmtNum(goalTotal, 0)),
  });
}

/** 目标页口径行（#523 一条事实一行；周口径那句只走这里一处）。 */
function goalCalibers(v: ExerciseGoalPageInput, goalTotal: number | null): string[] {
  const parts: string[] = [
    m('skill-calorie.render-sportDocs.c080'),
    m('skill-calorie.render-sportDocs.c081'),
    m('skill-calorie.render-sportDocs.c082', { p0: String(fmtNum(v.dailyGoal, 0)) }),
  ];
  if (goalTotal !== null) {
    const week = weekCaliberLine(v, goalTotal);
    if (week !== null) parts.push(week);
  }
  return parts;
}

function goalEnvelope(v: ExerciseGoalPageInput): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: m('skill-calorie.render-sportDocs.c083'),
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
    v.source ?? m('skill-calorie.render-sportDocs.c084'),
  );
  // #523 返修 R3：单日窗原来印成「运动目标 2026-09-15 ~ 2026-09-15」——同一天在 H1 里写两遍
  // （窗口条与来源脚注再各一份，视觉复评 R2 记 −3）。起止同日只印一次，与窗口条的退化分支同口径。
  const title = m('skill-calorie.render-sportDocs.c085', {
    p0: String(v.start === v.end ? v.start : rangeText(v.start, v.end)),
  });
  if (v.goalTotal === null || v.pct === null) {
    return assembleDocPage({
      docTitle: DOC_TITLE(), title, eyebrow: GOAL_EYEBROW(), subtitle: m('skill-calorie.render-sportDocs.c086'),
      content: exerciseUiCss() + '<section id="sec-empty">' + emptyGuide({
        icon: '🎯', text: m('skill-calorie.render-sportDocs.c087'),
        hint: m('skill-calorie.render-sportDocs.c088'),
      }) + '</section>',
      printable: true,
      pageUi: true,
    }) + copy;
  }
  const goalTotal = v.goalTotal;
  const cards: Card[] = [
    card('sec-ring', m('skill-calorie.render-sportDocs.c089'), ringCard(v, v.pct)),
    card('sec-figures', m('skill-calorie.render-sportDocs.c090'), '<h2 style="margin:0;font-size:15px;font-weight:700">数值对照</h2>' + goalFigures(v, goalTotal)),
  ];
  const source = footFacts(SOURCE_GOAL(), v.start, v.end, v.days);
  return assembleDocPage({
    docTitle: DOC_TITLE(), title, eyebrow: GOAL_EYEBROW(),
    subtitle: m('skill-calorie.render-sportDocs.c091'),
    content: windowStrip(v.start, v.end, m('skill-calorie.render-sportDocs.c092', { p0: String(v.days) }))
      + pageBody(cards, goalCalibers(v, goalTotal), source, copy),
    printable: true,
    pageUi: true,
  });
}

/* ── 身体两页已迁出（#353）：体成分／围度整页文档原样迁入 `src/body/bodyDocs.ts`，本件只留运动页。 ── */
