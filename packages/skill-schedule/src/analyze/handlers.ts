/** 分析与洞察的处理函数（命令事实的执行一半；声明在 `./commands.ts`）。
 *
 * 逐字搬自 `src/cli/cmd_read.ts` 的 switch 一臂 ＋ `monthRange`（行为零改动）。
 *
 * **#789 起这一域多出「出页」那一半**（照 #783–#788 的先例）：三张真页各由
 * `./analyzeDocs.ts` 装配（形状与族级件见 `src/shared/` 与 `./analyzeParts.ts`）：
 *   · 作息对比（`kind=months`／`kind=ranges`）→ 四卡对照 ＋ 7 维差异柱 ＋ AI 思考钩子；
 *   · 类别深挖（`kind=category`）→ 24h × N 天热力图 ＋ 分类总览 ＋ 记录明细；
 *   · 异常检测（`kind=anomaly`）→ 红框与黄框的条目 ＋ 7 维雷达。
 * **三个 `data` 载荷一行不改**：那是机器读的那一份，页只把 HTML 交回出口（落点由出口按 #843 的通式算）。
 *
 * **一处口径修正（本票）**：`kind=category` 的类别名先按 `policy` 的 `l1Of` 归到**一级分类**再筛
 * （老侧 `render_record_category` 的 `l1_of` 同一条）。此前把用户说的二级词直接当类别比，`健身`
 * 这类二级词一条也命中不了（记录里存的是 `健康.运动`）——归一之后页与载荷读的是同一批记录。
 */
import { ScheduleFetchError, listRecordsRange } from '../fetch/index.js';
import { l1Of, validateCompareInput } from '../policy/index.js';
import { buildAnomaly, buildCategoryDeep, buildRecordCompare } from '../render/index.js';
import { baselineStartOf, renderAnomalyPage, renderCategoryPage, renderComparePage } from './analyzeDocs.js';
import type { ScheduleDb } from '../fetch/db.js';
import type { ViewHandler } from '../shared/commandSpec.js';

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const dd = String(last).padStart(2, '0');
  return { start: month + '-01', end: month + '-' + dd };
}

export const viewRecordCompare: ViewHandler = (params, handle: ScheduleDb) => {
  const c = validateCompareInput(params) as Record<string, unknown>;
  if (c.kind === 'months') {
    const ra = monthRange(c.monthA as string);
    const rb = monthRange(c.monthB as string);
    const a = listRecordsRange(handle, ra.start, ra.end);
    const b = listRecordsRange(handle, rb.start, rb.end);
    if (!a.length || !b.length) {
      throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '对比缺数据：' + c.monthA + '(' + a.length + '块)/' + c.monthB + '(' + b.length + '块)');
    }
    return {
      data: buildRecordCompare({ labelA: c.monthA as string, labelB: c.monthB as string, a, b }),
      html: renderComparePage({
        labelA: c.monthA as string, startA: ra.start, endA: ra.end,
        labelB: c.monthB as string, startB: rb.start, endB: rb.end, a, b,
      }),
    };
  }
  if (c.kind === 'ranges') {
    const a = listRecordsRange(handle, c.startA as string, c.endA as string);
    const b = listRecordsRange(handle, c.startB as string, c.endB as string);
    if (!a.length || !b.length) throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '对比缺数据（两侧均须有记录）');
    return {
      data: buildRecordCompare({ labelA: c.labelA as string, labelB: c.labelB as string, a, b }),
      html: renderComparePage({
        labelA: c.labelA as string, startA: c.startA as string, endA: c.endA as string,
        labelB: c.labelB as string, startB: c.startB as string, endB: c.endB as string, a, b,
      }),
    };
  }
  if (c.kind === 'category') {
    const records = listRecordsRange(handle, c.start as string, c.end as string);
    if (!records.length) throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '区间无记录：' + c.start + '~' + c.end);
    // 归一之后页与载荷读的是同一批记录（见件头那一处口径修正）。
    const level1 = l1Of(c.category as string);
    return {
      data: buildCategoryDeep(c.start as string, c.end as string, level1, records),
      html: renderCategoryPage({
        requested: c.category as string, level1, start: c.start as string, end: c.end as string, records,
      }),
    };
  }
  const w = c.windowDays as number;
  const end = c.end as string;
  const d = new Date(end + 'T00:00:00');
  d.setDate(d.getDate() - (w - 1));
  const start = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const records = listRecordsRange(handle, start, end);
  if (!records.length) throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '窗口无记录：' + start + '~' + end);
  const byDay = new Map<string, Record<string, number>>();
  for (const r of records) {
    const m = byDay.get(r.date) || {};
    const k = l1Of(r.category);
    m[k] = (m[k] || 0) + (r.duration_minutes || 0);
    byDay.set(r.date, m);
  }
  const daily = [...byDay.entries()].sort().map(([date, byL1]) => ({ date, byL1 }));
  // 基线段＝结束日往前 30 天（老侧 render_record_anomaly 同一段）；页按日均比，载荷那一句照旧。
  const baselineStart = baselineStartOf(end);
  const baseline = listRecordsRange(handle, baselineStart, end);
  return {
    data: buildAnomaly(end, w, daily),
    html: renderAnomalyPage({ end, windowDays: w, records, baseline, baselineStart }),
  };
};
