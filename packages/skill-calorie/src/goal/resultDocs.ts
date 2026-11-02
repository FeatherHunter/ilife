/** #254 · 目标类三键的整页装配（`calorie.view.goal` · `calorie.view.goal-vs-actual` · `calorie.view.goal-expiring`）。
 *
 * 改前这 3 条命令（4 件实跑产物：`view.goal` 的 7 天／30 天两窗）走的是 `render/html.ts` 的旧片段
 * 渲染件——产物以 `<section class="ilife-page" …>` 起头，没有文档骨架。复核报告
 * `docs/skills/skill-calorie/t254-复核.md` §二 实测：4 件全部 doctype／charset／style 三条为假
 * （字节 1779／1779／1357／1203）。
 *
 * 本件照 #390 的姊妹件 `goal/goalWeightDoc.ts` 与 `shared/docPage.ts::assembleDocPage` 的形状，
 * 按 `t425-融合基准.md` §五 的骨架补齐八样：页框／页头（唤醒词 ＋ 类型徽章）／含本页读数的结论句／
 * 页内导航／读数卡与表／口径行／来源脚注／复制区双按钮（裁定 7：日志第 4 段＝可照抄重跑的命令原文）。
 * **#561（2026-09-15 用户裁决）**：八样里的**来源脚注**整条撤——「所有 HTML 页面底部的「数据来源：xxx」
 * 都删掉（用户直接看得见按钮与内容，不需要脚注复读来路）」；来源名仍住复制日志第 3 段（`copyBlockOf`
 * 的 `source`），给 AI 照抄的技术原件一字不动。
 *
 * **#566（2026-09-15 用户肉眼验收）**：窗口区间**不进 H1**——「日期不写在标题，写在其他 UI 控件内」。
 * H1 只留页面名（「目标分析」／「目标对比实际」），区间改由页头 `meta-bar` 左边那一行承载
 * （`windowLineOf()`；`shared/docPage.ts:33` 定死这一行就是「参数一行小字（窗口／区间等）」）。
 * 本票只搬这一处：读数卡副说明与表题里的区间一字未动，页面上照样看得出这是哪一段时间。
 *
 * **取数一行不动**：本件只吃两条入参——`read.ts` 现算的视图对象与它现算的 `metrics`；同一份
 * `metrics` 对象既进信封 `data.metrics` 又进复制载荷，两处不会走散（票面「取数口径一个字不许变」）。
 * 旧片段渲染件按票面留在 `src/render/html.ts`，本票不删。
 *
 * 对外 5 个名字（票面「对外不超过 5 个名字」；#290 两页整页化与 #254 同一套装配件，取数与 metrics 原样透传）。
 *
 * **#589**：目标推荐页（`calorie.view.goal-recommend`）整页化时复用本件那套——`cardOf`／`section`／
 * `tailOf` 三个小件因此带上 `export`（缺省行为一字未动：`simpleGoalDoc` 仍按原样传 `'目标表'`）。
 * 它们**只在 `goal/` 目录内被 `goalRecommendDoc.ts` 用**，按铁律五「目录内互相用的不算对外面」，
 * 本件对外仍是 5 个名字（上面那五个 `build*Doc`）。
 */
import type { DataTextInput } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import { DB_FILENAME } from '../paths.js';
import { nowStamp } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import type { GoalExpiringView, GoalVsActualView } from './goalExtraPlate.js';
import type { GoalConfig, GoalStatus } from './goalPlates.js';
import type { GoalView } from './goalPlate.js';
import { m } from '../entries/index.js';

/** 信封头（值冻结对齐 `cli/keys.ts`，与各 `*Docs.ts` 同值；标题取目标管理域）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';


/** 缺值一律 `—`（`t425` 裁定 4）：本件只做这一处格式化，不拿 0 顶缺、不写空串。 */
function num(v: number | null | undefined, unit: string): string {
  return v === null || v === undefined ? '—' : v + ' ' + unit;
}

/** 一张读数卡：值缺则只出「—」（单位槽跟着一起不出，免得出现「— 卡」）。
 *  #589 起对 `goal/` 目录内另导出（目标推荐页同形；目录外不消费）。 */
export function cardOf(label: string, value: number | null | undefined, unit: string, detail?: string):
{ label: string; value: string; unit?: string; detail?: string } {
  if (value === null || value === undefined) return { label, value: '—' };
  const valueText = String(value);
  return detail === undefined
    ? { label, value: valueText, unit }
    : { label, value: valueText, unit, detail };
}

/** 区块外壳：锚点 `id` 与页内导航同源（导航项按同一份清单生成，不留指向不存在锚点的项）。
 *  #589 起对 `goal/` 目录内另导出（目标推荐页同形；目录外不消费）。 */
export function section(id: string, html: string): string {
  return '<section id="' + id + '">' + html + '</section>';
}

/** 缺口方向与摄入走向的读者话（数据层给的是 `loss`／`up` 这类内部取值，不上屏）。 */
function deficitTrendZh(k: string): string | undefined {
  switch (k) {
    case 'loss': return m('skill-calorie.goal-resultDocs.c214');
    case 'gain': return m('skill-calorie.goal-resultDocs.c215');
    case 'flat': return m('skill-calorie.goal-resultDocs.c216');
    default: return undefined;
  }
}

function intakeTrendZh(k: string): string | undefined {
  switch (k) {
    case 'up': return m('skill-calorie.goal-resultDocs.c217');
    case 'down': return m('skill-calorie.goal-resultDocs.c218');
    case 'flat': return m('skill-calorie.goal-resultDocs.c219');
    default: return undefined;
  }
}

function docTitle(): string { return m('skill-calorie.goal-resultDocs.c213'); }

/** 页头第 1 行左的参数小字（`shared/docPage.ts:33` 定死这一行的用途＝窗口／区间）。
 *
 *  **#566**：窗口区间原来写在 H1 里（`'🎯 目标分析 ' + v.start + ' 至 ' + v.end`），负责人肉眼验收裁定
 *  「日期不写在标题，写在其他 UI 控件内」⇒ 区间搬到这里，H1 只留页面名。拼法与页内那两处同口径
 *  （读数卡副说明／表题都写「起 至 止」），读者一眼看得出这一页看的是哪一段。
 *  区间只在这一行新出现一次，卡与表的区间一个字没动（本票只搬 H1 那一处）。 */
function windowLineOf(metaLeft: string, start: string, end: string): string {
  return m('skill-calorie.goal-resultDocs.c001', { p0: String(metaLeft), p1: String(start), p2: String(end) });
}

/** 复制区（双按钮：复制数据 ＋ 复制日志；裁定 7）。载荷与 `data.metrics` 是同一份对象。 */
function copyBlockOf(key: string, metrics: Record<string, number>, command: string, source: string): string {
  const envelope: DataTextInput['envelope'] = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key,
    data: { metrics },
  };
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command, source: DB_FILENAME + ' ｜ ' + source, actionAt: nowStamp(), version: DOC_VERSION,
      }),
    },
  });
}

/** 页面装配的三条共用尾巴：口径行 ＋ 复制区（#561：来源脚注那条尾巴已按用户裁决整条撤）。
 *  #589 起对 `goal/` 目录内另导出（目标推荐页同形：`source` 由调用方给，目录外不消费）。 */
export function tailOf(key: string, metrics: Record<string, number>, command: string, source: string, calibers: readonly string[]): string {
  return calibers.map((line) => renderCaliberLine(line)).join('')
    + copyBlockOf(key, metrics, command, source);
}

/* ── ① 目标分析（`calorie.view.goal`：目标值 ＋ 完成度 ＋ 缺口与摄入趋势） ───────────────────── */

/** 结论句（§五 第 3 行）：句内只摆本页读得出来的数，不编新日期、不编比率。 */
function goalSummaryOf(v: GoalView): string {
  const s = v.deficit.summary;
  const pct = v.completionPct === null ? '—' : v.completionPct + '%';
  return m('skill-calorie.goal-resultDocs.c002', {
    p0: String(v.nutrition.calorie_goal),
    p1: String(s.avgIntake),
    p2: String(s.weeklyDeficit),
    p3: String(s.predictedLossKg),
    p4: String(pct),
  });
}

export function buildGoalDoc(v: GoalView, metrics: Record<string, number>, command: string): string {
  const n = v.nutrition;
  const s = v.deficit.summary;
  const t = v.trend.summary;
  const recorded = v.history.completedCount + v.history.incompleteCount;
  const body = [
    renderTocBlock({ items: [
      { id: 'sec-readings', text: m('skill-calorie.goal-resultDocs.c003') },
      { id: 'sec-goal', text: m('skill-calorie.goal-resultDocs.c004') },
      { id: 'sec-gap', text: m('skill-calorie.goal-resultDocs.c005') },
    ] }),
    section('sec-readings', renderKpiGrid([
      cardOf(m('skill-calorie.goal-resultDocs.c006'), n.calorie_goal, m('skill-calorie.goal-resultDocs.c007')),
      cardOf(m('skill-calorie.goal-resultDocs.c008'), n.protein_goal, 'g'),
      cardOf(m('skill-calorie.goal-resultDocs.c009'), n.water_goal, 'ml'),
      { label: m('skill-calorie.goal-resultDocs.c010'), value: String(v.history.completedCount), unit: m('skill-calorie.goal-resultDocs.c011'), detail: m('skill-calorie.goal-resultDocs.c012', { p0: String(recorded) }) },
      cardOf(m('skill-calorie.goal-resultDocs.c013'), s.weeklyDeficit, m('skill-calorie.goal-resultDocs.c014'), m('skill-calorie.goal-resultDocs.c015', { p0: String(s.avgDeficit) })),
      cardOf(m('skill-calorie.goal-resultDocs.c016'), t.avg, m('skill-calorie.goal-resultDocs.c017'), m('skill-calorie.goal-resultDocs.c018', { p0: String(v.start), p1: String(v.end) })),
    ])),
    section('sec-goal', renderDataTable({
      columns: [{ key: 'item', label: m('skill-calorie.goal-resultDocs.c019') }, { key: 'goal', label: m('skill-calorie.goal-resultDocs.c020'), align: 'right' }],
      rows: [
        { item: m('skill-calorie.goal-resultDocs.c021'), goal: num(n.calorie_goal, m('skill-calorie.goal-resultDocs.c022')) },
        { item: m('skill-calorie.goal-resultDocs.c023'), goal: num(n.protein_goal, 'g') },
        { item: m('skill-calorie.goal-resultDocs.c024'), goal: num(n.carbs_goal, 'g') },
        { item: m('skill-calorie.goal-resultDocs.c220'), goal: num(n.fat_goal, 'g') },
        { item: m('skill-calorie.goal-resultDocs.c025'), goal: num(n.water_goal, 'ml') },
      ],
      caption: m('skill-calorie.goal-resultDocs.c026'),
      emptyText: m('skill-calorie.goal-resultDocs.c027'),
    })),
    section('sec-gap', renderDataTable({
      columns: [
        { key: 'item', label: m('skill-calorie.goal-resultDocs.c028') },
        { key: 'reading', label: m('skill-calorie.goal-resultDocs.c029'), align: 'right' },
        { key: 'note', label: m('skill-calorie.goal-resultDocs.c030') },
      ],
      rows: [
        { item: m('skill-calorie.goal-resultDocs.c031'), reading: num(s.avgIntake, m('skill-calorie.goal-resultDocs.c032')), note: m('skill-calorie.goal-resultDocs.c033') },
        { item: m('skill-calorie.goal-resultDocs.c034'), reading: num(s.avgBurn, m('skill-calorie.goal-resultDocs.c035')), note: m('skill-calorie.goal-resultDocs.c036', { p0: String(s.avgExerciseBurn) }) },
        { item: m('skill-calorie.goal-resultDocs.c037'), reading: num(s.avgDeficit, m('skill-calorie.goal-resultDocs.c038')), note: deficitTrendZh(s.trend) },
        { item: m('skill-calorie.goal-resultDocs.c039'), reading: num(s.weeklyDeficit, m('skill-calorie.goal-resultDocs.c040')), note: m('skill-calorie.goal-resultDocs.c041') },
        { item: m('skill-calorie.goal-resultDocs.c042'), reading: num(s.predictedLossKg, 'kg'), note: m('skill-calorie.goal-resultDocs.c043') },
        { item: m('skill-calorie.goal-resultDocs.c044'), reading: intakeTrendZh(t.trend), note: m('skill-calorie.goal-resultDocs.c045') },
      ],
      caption: m('skill-calorie.goal-resultDocs.c046', { p0: String(v.start), p1: String(v.end) }),
      emptyText: m('skill-calorie.goal-resultDocs.c047'),
    })),
    tailOf('calorie.view.goal', metrics, command, m('skill-calorie.goal-resultDocs.c048'),
      [m('skill-calorie.goal-resultDocs.c049'), m('skill-calorie.goal-resultDocs.c050')]),
  ].join('');
  return assembleDocPage({
    docTitle: docTitle(),
    // #566：H1 只留页面名；窗口区间住页头 meta-bar 左行（windowLineOf）。
    title: m('skill-calorie.goal-resultDocs.c051'),
    eyebrow: '',
    subtitle: null,
    metaLeft: windowLineOf(m('skill-calorie.goal-resultDocs.c052'), v.start, v.end),
    badge: m('skill-calorie.goal-resultDocs.c053'),
    summary: goalSummaryOf(v),
    content: body,
    charts: false,
    pageUi: true,
  });
}

/* ── ② 目标对比实际（`calorie.view.goal-vs-actual`：逐日达成 ＋ 摄入走向） ───────────────────── */

export function buildGoalVsActualDoc(v: GoalVsActualView, metrics: Record<string, number>, command: string): string {
  const recorded = v.completedCount + v.incompleteCount;
  const devs = v.history.goalHistory.filter((d) => d.status !== '无记录' && typeof d.pct === 'number');
  const meanDev = devs.length === 0 ? null : Math.round((devs.reduce((a, d) => a + (d.pct as number), 0) / devs.length - 100) * 100) / 100;
  const pct = v.completionPct === null ? '—' : v.completionPct + '%';
  const t = v.trend.summary;
  const body = [
    renderTocBlock({ items: [
      { id: 'sec-readings', text: m('skill-calorie.goal-resultDocs.c054') },
      { id: 'sec-days', text: m('skill-calorie.goal-resultDocs.c055') },
      { id: 'sec-trend', text: m('skill-calorie.goal-resultDocs.c056') },
    ] }),
    section('sec-readings', renderKpiGrid([
      cardOf(m('skill-calorie.goal-resultDocs.c057'), v.calorieGoal, m('skill-calorie.goal-resultDocs.c058')),
      { label: m('skill-calorie.goal-resultDocs.c059'), value: String(v.completedCount), unit: m('skill-calorie.goal-resultDocs.c060'), detail: m('skill-calorie.goal-resultDocs.c061', { p0: String(recorded) }) },
      cardOf(m('skill-calorie.goal-resultDocs.c062'), v.completionPct, '%'),
      cardOf(m('skill-calorie.goal-resultDocs.c063'), v.trendAvg, m('skill-calorie.goal-resultDocs.c064'), m('skill-calorie.goal-resultDocs.c065', { p0: String(v.start), p1: String(v.end) })),
    ])),
    section('sec-days', renderDataTable({
      columns: [
        { key: 'date', label: m('skill-calorie.goal-resultDocs.c221') },
        { key: 'intake', label: m('skill-calorie.goal-resultDocs.c066'), align: 'right' },
        { key: 'goal', label: m('skill-calorie.goal-resultDocs.c067'), align: 'right' },
        { key: 'pct', label: m('skill-calorie.goal-resultDocs.c068'), align: 'right' },
        { key: 'status', label: m('skill-calorie.goal-resultDocs.c222') },
      ],
      /* 没记录的日期照裁定 4 写 `—`（不拿 0 顶）——「这三天没记」与「记了但吃 0 卡」是两回事。 */
      rows: v.history.goalHistory.map((d) => ({
        date: d.date,
        intake: d.status === '无记录' ? '—' : num(d.calorieActual, m('skill-calorie.goal-resultDocs.c069')),
        goal: num(d.calorieGoal, m('skill-calorie.goal-resultDocs.c070')),
        pct: d.status === '无记录' ? '—' : num(d.pct, '%'),
        status: d.status,
      })),
      caption: m('skill-calorie.goal-resultDocs.c071'),
      emptyText: m('skill-calorie.goal-resultDocs.c072'),
    })),
    section('sec-trend', renderDataTable({
      columns: [{ key: 'item', label: m('skill-calorie.goal-resultDocs.c073') }, { key: 'reading', label: m('skill-calorie.goal-resultDocs.c074'), align: 'right' }],
      rows: [
        { item: m('skill-calorie.goal-resultDocs.c075'), reading: num(t.avg, m('skill-calorie.goal-resultDocs.c076')) },
        { item: m('skill-calorie.goal-resultDocs.c077'), reading: num(t.weekdayAvg, m('skill-calorie.goal-resultDocs.c078')) },
        { item: m('skill-calorie.goal-resultDocs.c079'), reading: num(t.weekendAvg, m('skill-calorie.goal-resultDocs.c080')) },
        { item: m('skill-calorie.goal-resultDocs.c081'), reading: num(t.startAvg, m('skill-calorie.goal-resultDocs.c082')) },
        { item: m('skill-calorie.goal-resultDocs.c083'), reading: num(t.endAvg, m('skill-calorie.goal-resultDocs.c084')) },
        { item: m('skill-calorie.goal-resultDocs.c085'), reading: meanDev === null ? '—' : meanDev + ' %' },
      ],
      caption: m('skill-calorie.goal-resultDocs.c086', { p0: String(v.start), p1: String(v.end) }),
      emptyText: m('skill-calorie.goal-resultDocs.c087'),
    })),
    tailOf('calorie.view.goal-vs-actual', metrics, command, m('skill-calorie.goal-resultDocs.c088'),
      [m('skill-calorie.goal-resultDocs.c089'),
        m('skill-calorie.goal-resultDocs.c090')]),
  ].join('');
  const goalText = v.calorieGoal === null ? '—' : m('skill-calorie.goal-resultDocs.c091', { p0: String(v.calorieGoal) });
  return assembleDocPage({
    docTitle: docTitle(),
    // #566：同 `buildGoalDoc`——H1 只留页面名，窗口区间住页头 meta-bar 左行。
    title: m('skill-calorie.goal-resultDocs.c092'),
    eyebrow: '',
    subtitle: null,
    metaLeft: windowLineOf(m('skill-calorie.goal-resultDocs.c093'), v.start, v.end),
    badge: m('skill-calorie.goal-resultDocs.c094'),
    summary: m('skill-calorie.goal-resultDocs.c095', {
      p0: String(goalText),
      p1: String(recorded),
      p2: String(v.completedCount),
      p3: String(pct),
      p4: String(v.trendAvg),
    }),
    content: body,
    charts: false,
    pageUi: true,
  });
}

/** 紧迫度（呈现层派生，不动取数：已过期／3 天内高／落提醒窗中／窗外低；老技能另按需算速率分档，需当前体重，口径差见本页口径行）。 */
function urgencyOf(v: GoalExpiringView): string {
  if (v.daysLeft < 0) return m('skill-calorie.goal-resultDocs.c096');
  if (v.daysLeft <= 3) return m('skill-calorie.goal-resultDocs.c097');
  if (v.daysLeft <= v.withinDays) return m('skill-calorie.goal-resultDocs.c098');
  return m('skill-calorie.goal-resultDocs.c099');
}

/* ── ③ 即将到期目标（`calorie.view.goal-expiring`：截止日 ＋ 剩余天数两态） ─────────────────── */

export function buildGoalExpiringDoc(v: GoalExpiringView, metrics: Record<string, number>, command: string): string {
  const state = v.expiring ? m('skill-calorie.goal-resultDocs.c100') : m('skill-calorie.goal-resultDocs.c101');
  const body = [
    renderTocBlock({ items: [
      { id: 'sec-readings', text: m('skill-calorie.goal-resultDocs.c102') },
      { id: 'sec-detail', text: m('skill-calorie.goal-resultDocs.c103') },
    ] }),
    section('sec-readings', renderKpiGrid([
      { label: m('skill-calorie.goal-resultDocs.c104'), value: v.deadline, detail: state },
      { label: m('skill-calorie.goal-resultDocs.c105'), value: urgencyOf(v), detail: m('skill-calorie.goal-resultDocs.c106', { p0: String(v.daysLeft), p1: String(v.withinDays) }) },
      cardOf(m('skill-calorie.goal-resultDocs.c107'), v.daysLeft, m('skill-calorie.goal-resultDocs.c108'), m('skill-calorie.goal-resultDocs.c109', { p0: String(v.withinDays) })),
      cardOf(m('skill-calorie.goal-resultDocs.c110'), v.weightGoal, 'kg'),
      cardOf(m('skill-calorie.goal-resultDocs.c111'), v.calorieGoal, m('skill-calorie.goal-resultDocs.c112')),
    ])),
    section('sec-detail', renderDataTable({
      columns: [
        { key: 'item', label: m('skill-calorie.goal-resultDocs.c113') },
        { key: 'reading', label: m('skill-calorie.goal-resultDocs.c114'), align: 'right' },
        { key: 'note', label: m('skill-calorie.goal-resultDocs.c115') },
      ],
      rows: [
        { item: m('skill-calorie.goal-resultDocs.c116'), reading: v.deadline, note: state },
        { item: m('skill-calorie.goal-resultDocs.c117'), reading: num(v.daysLeft, m('skill-calorie.goal-resultDocs.c118')), note: m('skill-calorie.goal-resultDocs.c119') },
        { item: m('skill-calorie.goal-resultDocs.c120'), reading: num(v.withinDays, m('skill-calorie.goal-resultDocs.c121')), note: m('skill-calorie.goal-resultDocs.c122') },
        { item: m('skill-calorie.goal-resultDocs.c123'), reading: num(v.weightGoal, 'kg'), note: m('skill-calorie.goal-resultDocs.c124') },
        { item: m('skill-calorie.goal-resultDocs.c125'), reading: num(v.calorieGoal, m('skill-calorie.goal-resultDocs.c126')), note: m('skill-calorie.goal-resultDocs.c127') },
      ],
      caption: m('skill-calorie.goal-resultDocs.c128'),
      emptyText: m('skill-calorie.goal-resultDocs.c129'),
    })),
    tailOf('calorie.view.goal-expiring', metrics, command, m('skill-calorie.goal-resultDocs.c130'),
      [m('skill-calorie.goal-resultDocs.c131'), m('skill-calorie.goal-resultDocs.c132'),
        m('skill-calorie.goal-resultDocs.c133')]),
  ].join('');
  const windowNote = v.expiring ? m('skill-calorie.goal-resultDocs.c134') : m('skill-calorie.goal-resultDocs.c135');
  return assembleDocPage({
    docTitle: docTitle(),
    title: m('skill-calorie.goal-resultDocs.c136'),
    eyebrow: '',
    subtitle: null,
    metaLeft: m('skill-calorie.goal-resultDocs.c137'),
    badge: m('skill-calorie.goal-resultDocs.c138'),
    summary: m('skill-calorie.goal-resultDocs.c139', {
      p0: String(v.deadline),
      p1: String(v.daysLeft),
      p2: String(v.withinDays),
      p3: String(windowNote),
    }),
    content: body,
    charts: false,
    pageUi: true,
  });
}

/* ── ④ 目标配置／⑤ 目标状态（#290：两条悬空视图整页化） ── */
/** 两页共用装配：读数卡＋明细表＋口径复制尾（与 #254 三页同一套 `tailOf`／`section`／`cardOf`／`num`）。 */
function simpleGoalDoc(key: string, title: string, badge: string, metaLeft: string, summary: string, cards: { label: string; value: string; unit?: string; detail?: string }[], caption: string, rows: { item: string; reading: string; note: string }[], metrics: Record<string, number>, command: string, calibers: readonly string[]): string {
  const body = [
    renderTocBlock({ items: [{ id: 'sec-readings', text: m('skill-calorie.goal-resultDocs.c140') }, { id: 'sec-detail', text: m('skill-calorie.goal-resultDocs.c141') }] }),
    section('sec-readings', renderKpiGrid(cards)),
    section('sec-detail', renderDataTable({ columns: [{ key: 'item', label: m('skill-calorie.goal-resultDocs.c142') }, { key: 'reading', label: m('skill-calorie.goal-resultDocs.c143'), align: 'right' }, { key: 'note', label: m('skill-calorie.goal-resultDocs.c144') }], rows, caption, emptyText: m('skill-calorie.goal-resultDocs.c145') })),
    tailOf(key, metrics, command, m('skill-calorie.goal-resultDocs.c146'), calibers),
  ].join('');
  return assembleDocPage({ docTitle: docTitle(), title, eyebrow: '', subtitle: null, metaLeft, badge, summary, content: body, charts: false, pageUi: true });
}

export function buildGoalConfigDoc(g: GoalConfig, metrics: Record<string, number>, command: string): string {
  const n = g.nutrition;
  const consistencyNote = g.consistent ? m('skill-calorie.goal-resultDocs.c147', { p0: String(g.diffKcal) }) : m('skill-calorie.goal-resultDocs.c148', { p0: String(g.diffKcal) });
  const pausedNote = g.paused ? m('skill-calorie.goal-resultDocs.c149') : m('skill-calorie.goal-resultDocs.c150');
  return simpleGoalDoc('calorie.view.goal-config', m('skill-calorie.goal-resultDocs.c151'), m('skill-calorie.goal-resultDocs.c152'), m('skill-calorie.goal-resultDocs.c153'),
    m('skill-calorie.goal-resultDocs.c154', {
      p0: String(n.calorie_goal),
      p1: String(num(n.protein_goal, 'g')),
      p2: String(num(n.carbs_goal, 'g')),
      p3: String(num(n.fat_goal, 'g')),
      p4: String(num(n.water_goal, 'ml')),
      p5: String(consistencyNote),
      p6: String(pausedNote),
    }),
    [cardOf(m('skill-calorie.goal-resultDocs.c155'), n.calorie_goal, m('skill-calorie.goal-resultDocs.c156')), cardOf(m('skill-calorie.goal-resultDocs.c157'), n.protein_goal, 'g'), cardOf(m('skill-calorie.goal-resultDocs.c158'), n.carbs_goal, 'g'), cardOf(m('skill-calorie.goal-resultDocs.c159'), n.fat_goal, 'g'), cardOf(m('skill-calorie.goal-resultDocs.c160'), n.water_goal, 'ml'), { label: m('skill-calorie.goal-resultDocs.c222'), value: g.paused ? m('skill-calorie.goal-resultDocs.c161') : m('skill-calorie.goal-resultDocs.c162'), detail: g.paused ? m('skill-calorie.goal-resultDocs.c163', { p0: String(g.pausedAt ?? '—') }) : m('skill-calorie.goal-resultDocs.c164') }],
    m('skill-calorie.goal-resultDocs.c165'),
    [{ item: m('skill-calorie.goal-resultDocs.c166'), reading: num(n.calorie_goal + g.diffKcal, m('skill-calorie.goal-resultDocs.c167')), note: m('skill-calorie.goal-resultDocs.c168') }, { item: m('skill-calorie.goal-resultDocs.c169'), reading: m('skill-calorie.goal-resultDocs.c170', { p0: String((g.diffKcal >= 0 ? '+' : '') + g.diffKcal) }), note: g.consistent ? m('skill-calorie.goal-resultDocs.c171') : m('skill-calorie.goal-resultDocs.c172') }, { item: m('skill-calorie.goal-resultDocs.c173'), reading: g.paused ? m('skill-calorie.goal-resultDocs.c174') : m('skill-calorie.goal-resultDocs.c175'), note: g.paused ? m('skill-calorie.goal-resultDocs.c176', { p0: String(g.pausedAt ?? '—') }) : m('skill-calorie.goal-resultDocs.c177') }],
    metrics, command, [m('skill-calorie.goal-resultDocs.c178'), m('skill-calorie.goal-resultDocs.c179')]);
}

export function buildGoalStatusDoc(g: GoalStatus, metrics: Record<string, number>, command: string): string {
  const n = g.nutrition;
  const pausedTail = g.pausedAt === null ? '。' : m('skill-calorie.goal-resultDocs.c180', { p0: String(g.pausedAt) });
  const statusNote = g.paused ? m('skill-calorie.goal-resultDocs.c181', { p0: String(pausedTail) }) : m('skill-calorie.goal-resultDocs.c182');
  return simpleGoalDoc('calorie.view.goal-status', m('skill-calorie.goal-resultDocs.c183'), m('skill-calorie.goal-resultDocs.c184'), m('skill-calorie.goal-resultDocs.c185'),
    m('skill-calorie.goal-resultDocs.c186', {
      p0: String(statusNote),
      p1: String(n.calorie_goal),
      p2: String(num(n.water_goal, 'ml')),
    }),
    [{ label: m('skill-calorie.goal-resultDocs.c222'), value: g.paused ? m('skill-calorie.goal-resultDocs.c187') : m('skill-calorie.goal-resultDocs.c188'), detail: g.paused ? m('skill-calorie.goal-resultDocs.c189', { p0: String(g.pausedAt ?? '—') }) : m('skill-calorie.goal-resultDocs.c190') }, cardOf(m('skill-calorie.goal-resultDocs.c191'), n.calorie_goal, m('skill-calorie.goal-resultDocs.c192')), cardOf(m('skill-calorie.goal-resultDocs.c193'), n.water_goal, 'ml'), { label: m('skill-calorie.goal-resultDocs.c194'), value: g.pausedAt ?? '—', detail: g.paused ? m('skill-calorie.goal-resultDocs.c195') : m('skill-calorie.goal-resultDocs.c196') }],
    m('skill-calorie.goal-resultDocs.c197'),
    [{ item: m('skill-calorie.goal-resultDocs.c198'), reading: g.paused ? m('skill-calorie.goal-resultDocs.c199') : m('skill-calorie.goal-resultDocs.c200'), note: g.paused ? m('skill-calorie.goal-resultDocs.c201', { p0: String(g.pausedAt ?? '—') }) : m('skill-calorie.goal-resultDocs.c202') }, { item: m('skill-calorie.goal-resultDocs.c203'), reading: num(n.calorie_goal, m('skill-calorie.goal-resultDocs.c204')), note: m('skill-calorie.goal-resultDocs.c205') }, { item: m('skill-calorie.goal-resultDocs.c206'), reading: num(n.water_goal, 'ml'), note: m('skill-calorie.goal-resultDocs.c207') }, { item: m('skill-calorie.goal-resultDocs.c208'), reading: m('skill-calorie.goal-resultDocs.c209'), note: m('skill-calorie.goal-resultDocs.c210') }],
    metrics, command, [m('skill-calorie.goal-resultDocs.c211'), m('skill-calorie.goal-resultDocs.c212')]);
}
