/** 体重复盘（HELP 场景 03「体重」下一级）：`calorie.view.weight-review` 读。
 *
 * 复核口径（目标 vs 实际、预计达成日）住同目录 `figures.ts` 的 `weightMilestone`；
 * 「体重目标取数」`getWeightGoalInfo` 也住那里——本能力对外那道门（`index.ts`）把它转给
 * 目标管理那侧（`goal/goalExtraPlate.ts`）用，免得同一件事有两份取数。
 */
import type { DatabaseSync } from 'node:sqlite';
import { dayField, nums } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { CalorieRenderError } from '../render/errors.js';
import { weightMilestone } from './figures.js';
import type { WeightMilestone } from './figures.js';
import { assertDate } from './plate.js';
import type { WeightReviewView } from './plate.js';
import {
  renderKpiGrid,
  renderListRows,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';

/** `calorie.view.weight-review` · 体重复核（今天或指定日：当前 vs 目标、还差多少、按现状几天到）。 */
export function viewWeightReview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const today = dayField(params, 'today') ?? dayField(params, 'date');
  const v = buildWeightReviewView(db, today ?? undefined);
  const metrics = nums({
    currentWeight: v.milestone.currentWeight, weightGoal: v.milestone.weightGoal,
    gapKg: v.milestone.gapKg, actualDailyChangeKg: v.milestone.actualDailyChangeKg,
    estDays: v.milestone.estDays, calorieAdjustment: v.milestone.calorieAdjustment,
  });
  return { data: { metrics }, html: buildWeightReviewDoc(v) };
}

/* ── 视图模型（#332 自 `plate.ts` 原样迁入：复核＝analysis/weight.weightMilestone） ── */

export function buildWeightReviewView(db: DatabaseSync, today?: string): WeightReviewView {
  const t = today ?? new Date().toISOString().slice(0, 10);
  assertDate(t);
  const res = weightMilestone(db, t);
  if (res.status !== 'ok' || !res.data) {
    throw new CalorieRenderError('missing-data', res.message || '无体重目标或无体重记录');
  }
  return { today: t, milestone: res.data };
}

/* ── 整页装配（#332 自 `plateDocs.ts` 原样迁入：weight_review.html 对照） ── */

export function buildWeightReviewDoc(v: WeightReviewView): string {
  const m = v.milestone;
  const parts: string[] = [renderKpiGrid([
    { label: '体重复核', value: String(m.currentWeight), unit: 'kg', detail: m.currentDate },
    {
      label: '目标体重', value: String(m.weightGoal), unit: 'kg',
      detail: m.deadline ? '截止 ' + m.deadline : '无截止',
    },
    { label: '差距', value: (m.gapKg >= 0 ? '+' : '') + m.gapKg + ' kg' },
    {
      label: '预计达成', value: m.estDate ?? '—',
      detail: m.estDays === null || m.estDays === undefined ? m.status : m.estDays + ' 天 · ' + m.status,
    },
  ])];
  parts.push(renderListRows({
    items: [
      { left: '状态', main: m.status },
      {
        left: '日均变化', main: m.actualDailyChangeKg === null ? '—（记录不足）' : String(m.actualDailyChangeKg) + ' kg/天',
      },
      {
        left: '热量调整', main: m.calorieAdjustment === null ? '—' : String(m.calorieAdjustment) + ' 卡',
      },
    ],
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.weight-review',
      data: {
        metrics: metricsOf({
          currentWeight: m.currentWeight, weightGoal: m.weightGoal,
          gapKg: m.gapKg, actualDailyChangeKg: m.actualDailyChangeKg,
          estDays: m.estDays, calorieAdjustment: m.calorieAdjustment,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重复核 ' + v.today,
    eyebrow: 'calorie.view.weight-review · 运动身体域',
    subtitle: m.status,
    content: parts.join(''),
    charts: false,
  });
}
