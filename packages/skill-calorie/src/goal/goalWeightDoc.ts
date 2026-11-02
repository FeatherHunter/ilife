/** #390 · 体重目标整页装配（`calorie.view.goal-weight`：当前 vs 目标体重）。
 *
 * 判据（详见 `docs/skills/skill-calorie/t334-b1-整页-证据.md` §1）：
 * 该命令有三条唤醒词路由（`src/goal/routes.ts` order 120／219／373），且
 * `data-slot="ilife:calorie:goal-weight"` 全仓零嵌入引用——是面向用户的整页，
 * 不是嵌入片段。故按 `src/weight/compare.ts` 同形补齐 KPI／表／复制（含新 base
 * 双钮：`copyArea` 数据＋日志，与 `src/render/workoutPlanDocs.ts` 的 `dualCopy` 同形）／结论。
 * 取数仍走 `goal/goalPlates.ts::buildGoalWeight`（零新口径）；旧 `renderGoalWeightHtml`
 * 片段保留不动（`src/render/html.ts` 他票在途，不碰）。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderDataTable, renderDisclosure, renderKpiGrid } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { pairStrip, weightUiCss, windowStrip } from '../weight/weightUi.js';
import { nums } from '../shared/params.js';
import type { GoalWeight } from './goalPlates.js';
import { nowStamp } from '../render/receipt.js';
import { m } from '../entries/index.js';

/** envelope 头（值冻结对齐 `cli/keys.ts`，与各 `*Docs.ts` 同值；标题取目标管理域）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

const CMD_KEY = 'calorie.view.goal-weight';
const copySource = (): string => m('skill-calorie.goal-goalWeightDoc.c077');

const fmtKg = (v: number | null): string => (v === null ? '—' : String(v) + ' kg');
const fmtSigned = (v: number | null): string => (v === null ? '—' : (v >= 0 ? '+' : '') + v + ' kg');

/** 距目标（双方齐备才有数；缺任一即空态，不编造）。 */
function gapOf(g: GoalWeight): number | null {
  if (g.weightGoal === null || g.latestKg === null) return null;
  return Math.round((g.latestKg - g.weightGoal) * 100) / 100;
}

/** 结论句（一句话；只用入参已有的起止日期，不编新日期）。
 * #545（并入 #436）：结论块标题已是「结论」，句首不再加「结论：」前缀。 */
export function goalWeightSummary(g: GoalWeight): string {
  const gap = gapOf(g);
  const head = m('skill-calorie.goal-goalWeightDoc.c001', {
    p0: String(fmtKg(g.weightGoal)),
    p1: String(fmtKg(g.latestKg)),
  });
  const tail = m('skill-calorie.goal-goalWeightDoc.c002', {
    p0: String(g.start),
    p1: String(g.end),
    p2: String(fmtSigned(g.deltaKg)),
    p3: String(g.loggedDays),
  });
  if (gap === null) {
    if (g.weightGoal === null) return m('skill-calorie.goal-goalWeightDoc.c003', { p0: String(head), p1: String(tail) });
    return m('skill-calorie.goal-goalWeightDoc.c004', { p0: String(head), p1: String(tail) });
  }
  if (gap <= 0) return m('skill-calorie.goal-goalWeightDoc.c005', { p0: String(head), p1: String(tail) });
  return m('skill-calorie.goal-goalWeightDoc.c006', { p0: String(head), p1: String(gap), p2: String(tail) });
}

/** 体重目标整页（KPI 四格＋数据表＋复制双钮＋结论；`command` 为可照抄重跑的命令原文）。 */
export function buildGoalWeightDoc(g: GoalWeight, command: string): string {
  const gap = gapOf(g);
  const gapValue = gap === null ? '—' : gap <= 0 ? m('skill-calorie.goal-goalWeightDoc.c007') : m('skill-calorie.goal-goalWeightDoc.c008', { p0: String(gap) });
  const gapDetail = gap === null
    ? (g.weightGoal === null ? m('skill-calorie.goal-goalWeightDoc.c009') : m('skill-calorie.goal-goalWeightDoc.c010'))
    : m('skill-calorie.goal-goalWeightDoc.c011', { p0: String(g.weightGoal) });
  const parts: string[] = [
    // #545（#340 打回批第 ⑧ 项）：副标题那句 `·` 串整行撤，三件事各进形状放正文首件——
    // 目标与最新走两端值（`pairStrip`，中缝沿原串写 `vs`），窗口走窗口条（`windowStrip`，
    // 日期块＋箭头、窄卡不断散）。`weightUiCss()` 按口径放 parts 第一项（只读引用，不搬家）。
    weightUiCss(),
    pairStrip(m('skill-calorie.goal-goalWeightDoc.c012', { p0: String(fmtKg(g.weightGoal)) }), m('skill-calorie.goal-goalWeightDoc.c013', { p0: String(fmtKg(g.latestKg)) }), 'vs')
    + windowStrip(g.start, g.end),
    renderKpiGrid([
    {
      label: m('skill-calorie.goal-goalWeightDoc.c014'), value: g.weightGoal === null ? '—' : String(g.weightGoal),
      ...(g.weightGoal === null ? {} : { unit: 'kg' }),
      detail: g.deadline ? m('skill-calorie.goal-goalWeightDoc.c078', { p0: g.deadline }) : m('skill-calorie.goal-goalWeightDoc.c015'),
    },
    {
      label: m('skill-calorie.goal-goalWeightDoc.c016'), value: g.latestKg === null ? '—' : String(g.latestKg),
      ...(g.latestKg === null ? {} : { unit: 'kg' }),
      // #545：窗口已住正文首件 `windowStrip()`，卡片 `detail` 不再复读日期区间（窄卡会从日期中间断开）。
    },
    { label: m('skill-calorie.goal-goalWeightDoc.c017'), value: fmtSigned(g.deltaKg), detail: m('skill-calorie.goal-goalWeightDoc.c018', { p0: String(g.loggedDays) }) },
    { label: m('skill-calorie.goal-goalWeightDoc.c019'), value: gapValue, detail: gapDetail },
  ])];
  parts.push(renderDataTable({
    columns: [
      { key: 'period', label: m('skill-calorie.goal-goalWeightDoc.c020') },
      { key: 'range', label: m('skill-calorie.goal-goalWeightDoc.c079') },
      { key: 'goal', label: m('skill-calorie.goal-goalWeightDoc.c021'), align: 'right' },
      { key: 'latest', label: m('skill-calorie.goal-goalWeightDoc.c022'), align: 'right' },
      { key: 'change', label: m('skill-calorie.goal-goalWeightDoc.c023'), align: 'right' },
      { key: 'days', label: m('skill-calorie.goal-goalWeightDoc.c024'), align: 'right' },
    ],
    rows: [{
      period: m('skill-calorie.goal-goalWeightDoc.c080'), range: g.start + ' ~ ' + g.end,
      goal: fmtKg(g.weightGoal), latest: fmtKg(g.latestKg),
      change: fmtSigned(g.deltaKg), days: m('skill-calorie.goal-goalWeightDoc.c025', { p0: String(g.loggedDays) }),
    }],
    caption: m('skill-calorie.goal-goalWeightDoc.c026'),
    emptyText: m('skill-calorie.goal-goalWeightDoc.c027'),
  }));
  const metrics = nums({
    weightGoal: g.weightGoal, latestKg: g.latestKg, deltaKg: g.deltaKg, loggedDays: g.loggedDays,
  });
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: CMD_KEY,
    data: { metrics },
  };
  parts.push(copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({ command, source: copySource(), actionAt: nowStamp(), version: DOC_VERSION }),
    },
  }));
  parts.push(renderDisclosure({ title: m('skill-calorie.goal-goalWeightDoc.c081'), contentHtml: '<p>' + goalWeightSummary(g) + '</p>', open: true }));
  return assembleDocPage({
    docTitle: m('skill-calorie.goal-goalWeightDoc.c076'),
    title: m('skill-calorie.goal-goalWeightDoc.c028'),
    eyebrow: m('skill-calorie.goal-goalWeightDoc.c029'),
    // #545：副标题整行撤（目标／最新／窗口已是正文首件形状，副标题再写一遍是冗余）。传空串即整段省略。
    subtitle: '',
    content: parts.join(''),
    charts: false,
    pageUi: true,
  });
}
