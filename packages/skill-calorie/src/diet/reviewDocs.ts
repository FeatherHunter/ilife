/** #393 · 饮食复盘页装配（`calorie.view.diet-review`，diet_review.html 对照）。
 *
 * 原地搬自 `src/render/dietDocs.ts`：本票只换住处，函数体与注释原样照抄，产物逐字节不变。
 * 服务页面类：④ 复盘／餐别分布页。
 */
import { renderChartBlock, renderKpiGrid, renderDataTable } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import type { DietReview } from '../render/analysisPlate.js';
import type { FoodRanking } from './dietEngine.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·饮食';

const MEAL_NOTE = '窗口跟 MEAL_WINDOWS · 加餐=下午茶+夜宵';

/* ── 饮食复盘（diet_review.html 对照：每日热量趋势＋配比＋高频 TOP＋按餐汇总） ── */

export function buildDietReviewDoc(r: DietReview, top5: FoodRanking | null): string {
  const t = r.trend.status === 'ok' && r.trend.data ? r.trend.data : null;
  const m = r.macro.status === 'ok' && r.macro.data ? r.macro.data : null;
  const macroText = m && m.protein
    ? '蛋白/碳水/脂肪 ' + m.protein.pct + '/' + (m.carb ? m.carb.pct : '—') + '/' + (m.fat ? m.fat.pct : '—')
    : '—';
  const parts: string[] = [renderKpiGrid([
    {
      label: '热量',
      value: t ? String(t.totalCal) + ' 卡' : '—',
      detail: t ? '日均 ' + t.avgCal + ' 卡 · ' + r.loggedDays + ' 天有记录' : r.loggedDays + ' 天有记录',
    },
    { label: '配比', value: macroText },
    {
      label: '达标天', value: t ? String(t.complianceDays) + '/' + t.daysCount : '—',
      detail: t && t.calGoal ? '目标 ' + t.calGoal + ' 卡（±10%）' : '未设热量目标',
    },
    {
      label: '周末/工作日', value: t ? t.weekendAvg + '/' + t.weekdayAvg : '—',
      detail: '均值（卡）',
    },
  ])];
  let charts = false;
  if (t && t.daily.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '每日热量趋势',
      input: {
        items: t.daily.map((d) => ({ label: d.date.slice(5), value: d.totalCal })),
        options: { avgLine: t.avgCal },
      },
    }));
    charts = true;
  }
  if (m && (m.protein || m.carb || m.fat)) {
    parts.push(renderChartBlock({
      kind: 'donut',
      title: '营养配比',
      input: {
        items: [
          { label: '蛋白', value: m.protein ? m.protein.pct : 0 },
          { label: '碳水', value: m.carb ? m.carb.pct : 0 },
          { label: '脂肪', value: m.fat ? m.fat.pct : 0 },
        ],
        options: { showPercent: true },
      },
    }));
    charts = true;
  }
  const top = top5 ? top5.items : [];
  parts.push(renderDataTable({
    columns: [
      { key: 'rank', label: '排名', align: 'right' },
      { key: 'food', label: '食物' },
      { key: 'cal', label: '总热量', align: 'right' },
      { key: 'cnt', label: '次数', align: 'right' },
      { key: 'avg', label: '餐均', align: 'right' },
    ],
    rows: top.slice(0, 5).map((it) => ({
      rank: it.rank, food: it.foodName, cal: it.totalCal, cnt: it.cnt, avg: it.avgCalPerMeal,
    })),
    caption: '高频食物 TOP5（' + r.start + ' ~ ' + r.end + '）',
    emptyText: '本窗无高频食物',
  }));
  parts.push(renderDataTable({
    columns: [
      { key: 'meal', label: '餐别' },
      { key: 'days', label: '天数', align: 'right' },
      { key: 'cal', label: '累计热量', align: 'right' },
    ],
    rows: r.byMeal.map((s) => ({ meal: s.meal, days: s.days, cal: s.totalCalories })),
    caption: '按餐汇总（' + MEAL_NOTE + '）',
    emptyText: '本窗无按餐汇总',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.diet-review',
      data: { metrics: { loggedDays: r.loggedDays } },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '饮食复盘 ' + r.start + ' ~ ' + r.end,
    eyebrow: 'calorie.view.diet-review · 饮食域',
    subtitle: null,
    content: parts.join(''),
    charts,
  });
}
