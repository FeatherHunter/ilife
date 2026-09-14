/** #390 · 体重目标整页装配（`calorie.view.goal-weight`：当前 vs 目标体重）。
 *
 * 判据（详见 `docs/skills/skill-calorie/t334-b1-整页-证据.md` §1）：
 * 该命令有三条唤醒词路由（`src/goal/routes.ts` order 120／219／373），且
 * `data-slot="ilife:calorie:goal-weight"` 全仓零嵌入引用——是面向用户的整页，
 * 不是嵌入片段。故按 `src/weight/compare.ts` 同形补齐 KPI／表／复制（含新 base
 * 双钮：`copyArea` 数据＋日志，与 `src/render/workoutPlanDocs.ts` 的 `dualCopy` 同形）／结论。
 * 取数仍走 `render/goalPlate.ts::buildGoalWeight`（零新口径）；旧 `renderGoalWeightHtml`
 * 片段保留不动（`src/render/html.ts` 他票在途，不碰）。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderDataTable, renderDisclosure, renderKpiGrid } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { nums } from '../shared/params.js';
import type { GoalWeight } from '../render/goalPlate.js';
import { nowStamp } from '../render/receipt.js';

/** envelope 头（值冻结对齐 `cli/keys.ts`，与各 `*Docs.ts` 同值；标题取目标管理域）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·目标管理';
const CMD_KEY = 'calorie.view.goal-weight';
const COPY_SOURCE = 'daily_goal＋weight_log（体重目标查看）';

const fmtKg = (v: number | null): string => (v === null ? '—' : String(v) + ' kg');
const fmtSigned = (v: number | null): string => (v === null ? '—' : (v >= 0 ? '+' : '') + v + ' kg');

/** 距目标（双方齐备才有数；缺任一即空态，不编造）。 */
function gapOf(g: GoalWeight): number | null {
  if (g.weightGoal === null || g.latestKg === null) return null;
  return Math.round((g.latestKg - g.weightGoal) * 100) / 100;
}

/** 结论句（一句话；只用入参已有的起止日期，不编新日期）。 */
export function goalWeightSummary(g: GoalWeight): string {
  const gap = gapOf(g);
  const head = '目标 ' + fmtKg(g.weightGoal) + ' vs 最新 ' + fmtKg(g.latestKg);
  const tail = '（本窗 ' + g.start + ' ~ ' + g.end + ' 净变化 ' + fmtSigned(g.deltaKg) + '，有记录 ' + g.loggedDays + ' 天）';
  if (gap === null) {
    if (g.weightGoal === null) return '结论：' + head + '，未定体重目标（先「定体重目标」）' + tail + '。';
    return '结论：' + head + '，本窗无体重记录' + tail + '。';
  }
  if (gap <= 0) return '结论：' + head + '，已达标' + tail + '。';
  return '结论：' + head + '，还差 ' + gap + ' kg' + tail + '。';
}

/** 体重目标整页（KPI 四格＋数据表＋复制双钮＋结论；`command` 为可照抄重跑的命令原文）。 */
export function buildGoalWeightDoc(g: GoalWeight, command: string): string {
  const gap = gapOf(g);
  const gapValue = gap === null ? '—' : gap <= 0 ? '已达标' : '还差 ' + gap + ' kg';
  const gapDetail = gap === null
    ? (g.weightGoal === null ? '未定体重目标' : '本窗无体重记录')
    : '目标 ' + g.weightGoal + ' kg';
  const parts: string[] = [renderKpiGrid([
    {
      label: '体重目标', value: g.weightGoal === null ? '—' : String(g.weightGoal),
      ...(g.weightGoal === null ? {} : { unit: 'kg' }),
      detail: g.deadline ? '截止 ' + g.deadline : '无截止日',
    },
    {
      label: '最新体重', value: g.latestKg === null ? '—' : String(g.latestKg),
      ...(g.latestKg === null ? {} : { unit: 'kg' }),
      detail: g.start + ' ~ ' + g.end,
    },
    { label: '净变化', value: fmtSigned(g.deltaKg), detail: '有记录 ' + g.loggedDays + ' 天' },
    { label: '距目标', value: gapValue, detail: gapDetail },
  ])];
  parts.push(renderDataTable({
    columns: [
      { key: 'period', label: '期别' },
      { key: 'range', label: '区间' },
      { key: 'goal', label: '目标', align: 'right' },
      { key: 'latest', label: '最新', align: 'right' },
      { key: 'change', label: '净变化', align: 'right' },
      { key: 'days', label: '记录天', align: 'right' },
    ],
    rows: [{
      period: '本期', range: g.start + ' ~ ' + g.end,
      goal: fmtKg(g.weightGoal), latest: fmtKg(g.latestKg),
      change: fmtSigned(g.deltaKg), days: g.loggedDays + ' 天',
    }],
    caption: '体重目标（目标 ' + fmtKg(g.weightGoal) + ' · 最新 ' + fmtKg(g.latestKg) + '）',
    emptyText: '本窗无体重记录',
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
      copyLog: copyLog({ command, source: COPY_SOURCE, actionAt: nowStamp(), version: DOC_VERSION }),
    },
  }));
  parts.push(renderDisclosure({ title: '结论', contentHtml: '<p>' + goalWeightSummary(g) + '</p>', open: true }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重目标',
    eyebrow: 'calorie.view.goal-weight · 目标管理域',
    subtitle: '目标 ' + fmtKg(g.weightGoal) + ' vs 最新 ' + fmtKg(g.latestKg) + ' · ' + g.start + ' ~ ' + g.end,
    content: parts.join(''),
    charts: false,
  });
}
