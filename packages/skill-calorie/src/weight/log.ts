/** 量体重（HELP 场景 03「体重」下一级）：`calorie.view.weight` 读 ＋ `calorie.weight.log`／
 *  `calorie.weight.batch` 写。
 *
 * 本文件是这三条命令**事实的住处**：加一条命令只改这里＋`commands.ts`，共用位一行不动。
 * 取数走同目录 `records.ts`／`figures.ts`，页面装配走 `plate.ts`／`plateDocs.ts`——
 * 都是本能力内部件，没有跨能力引用。
 */
import type { DatabaseSync } from 'node:sqlite';
import { assertISO, defaultRange, fail, needArr, needNum, nums, optStr, wday } from '../shared/params.js';
import { F, R, out } from '../shared/writeParts.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import { buildWeightDashboard } from './plate.js';
import { buildWeightDoc } from './plateDocs.js';
import { batchLogWeight, logWeight } from './records.js';

/** `calorie.view.weight` · 体重盘：首末＋均值＋变化趋势＋目标差距。 */
export function viewWeight(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const w = buildWeightDashboard(db, start, end);
  const metrics = nums({
    recordCount: w.trend.recordCount, avgWeight: w.trend.avgWeight,
    maxWeight: w.trend.maxWeight, minWeight: w.trend.minWeight,
    firstWeight: w.trend.firstWeight, lastWeight: w.trend.lastWeight,
    changeKg: w.trend.changeKg, dailyChangeG: w.trend.dailyChangeG,
    weightGoal: w.weightGoal, gapKg: w.gapKg,
  });
  return { data: { metrics }, html: buildWeightDoc(w) };
}

/** `calorie.weight.log` · 记体重（身高缺档只留 BMI null，不阻断录入）。 */
export function writeWeightLog(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const kg = needNum(params, 'kg');
  if (!(kg > 0) || kg > 500) fail(2, 'kg 须为 0..500');
  const date = wday(params, 'date');
  if (date) assertISO(date, 'date');
  const r = logWeight(db, kg, optStr(params, 'note') ?? '', date, optStr(params, 'time'));
  const bmiText = r.bmi === null ? 'BMI 待补身高（补档案：calorie-cmd-read calorie.profile.set)' : 'BMI ' + r.bmi;
  return out(R('记体重', 'create', '已记体重 ' + r.kg + ' kg（' + bmiText + ' · ' + r.date + ' ' + r.time + '）', '记体重', 'weight_log (写库回执)', {
    recordId: r.id, ids: [r.id], writtenFields: [...F.weight],
    items: [{ id: r.id, date: r.date, status: '成功', reason: '', detail: r.kg + 'kg' }],
  }));
}

/** `calorie.weight.batch` · 批量补录体重（同日已有记录即跳过，不覆盖）。 */
export function writeWeightBatch(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const items = needArr(params, 'items');
  if (items.length > 365) fail(2, 'items 至多 365 条');
  const r = batchLogWeight(db, items.map((e) => {
    const o = (e ?? {}) as Record<string, unknown>;
    return { date: o['date'] === undefined ? undefined : String(o['date']), kg: o['kg'] as number | undefined };
  }));
  return out(R('批量补录体重', 'create', '批量记体重：写入 ' + r.wrote + '，跳过 ' + r.skipped + '，失败 ' + r.failed, '批量补录体重', 'weight_log (写库回执)', {
    noChange: r.wrote === 0, ids: [], idSource: 'condition',
    writtenFields: r.wrote > 0 ? [...F.weightBatch] : [],
    items: r.items.filter((x) => x.status === '失败').slice(0, 20).map((x) => ({ status: '失败', reason: x.reason, detail: String(x.date) })),
  }));
}
