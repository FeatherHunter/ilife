/** 改体重记录（HELP 场景 03「体重」下一级）：`calorie.weight.update`／`calorie.weight.remove` 写。
 *
 * 两条命令都收「按 id」与「按日期／范围」两套定位口径——参数形状与回执逐字沿用原分派层。
 * #337 融合：回执行 `items` 补出整页那两张表要用的读数——改类给「改前 → 改后」（体重一侧
 * 与备注一侧各成一对，缺的那侧留空串，页面按可见文本口径写 `—`），删类给快照行的可读体重。
 */
import type { DatabaseSync } from 'node:sqlite';
import { assertISO, fail, optNum, optStr, wday } from '../shared/params.js';
import { F, HARD_INNER, HARD_WORDING, R, deleteStatus, out } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { deleteWeight, deleteWeightByDate, deleteWeightRange, updateWeight, updateWeightByDate } from './records.js';

/** `calorie.weight.update` · 改体重记录（id 或 date 二选一）。 */
export function writeWeightUpdate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = optNum(params, 'id');
  const date = wday(params, 'date');
  const kg = optNum(params, 'kg');
  const note = optStr(params, 'note');
  if (kg !== undefined && (!(kg > 0) || kg > 500)) fail(2, 'kg 须为 0..500');
  if (id !== undefined) {
    if (!Number.isInteger(id) || id <= 0) fail(2, 'id 须为正整数');
    const r = updateWeight(db, id, kg, note);
    const bmiTextU = r.bmi === null ? 'BMI 待补身高（补档案：calorie-cmd-read calorie.profile.set)' : 'BMI ' + r.bmi;
    return out(R('改体重记录', 'update', '已更新体重 #' + id + '：' + r.oldWeight + ' kg → ' + r.newWeight + ' kg（' + bmiTextU + '）', '改体重记录', 'weight_log (写库回执)', {
      recordId: id, ids: [id], writtenFields: [...(kg !== undefined ? ['kg'] : []), ...(note !== undefined ? ['note'] : [])],
      // 整页回执的对照表吃改前 → 改后（摘要口径一字不动；按 id 改拿不到改前备注，那一侧留空）。
      items: [{
        id, date: r.date, status: '已更新',
        reason: r.oldWeight + ' kg → ' + r.newWeight + ' kg',
        detail: note === undefined ? '' : '备注改为「' + note + '」',
      }],
    }));
  }
  if (date !== undefined) {
    assertISO(date, 'date');
    const r = updateWeightByDate(db, date, kg, note);
    return out(R('改某日体重', 'update', '已更新 ' + date + ' 体重 ' + r.hitCount + ' 条', '改某日体重', 'weight_log (写库回执)', {
      ids: [], idSource: 'condition', writtenFields: [...(kg !== undefined ? ['kg'] : []), ...(note !== undefined ? ['note'] : [])],
      // 整页回执的对照表吃逐行改前 → 改后（命中多条时逐行一对，不丢行；改前备注逐行取自回读）。
      items: r.oldRows.map((row) => ({
        id: row.id, date: row.date, status: '已更新',
        reason: r.newWeight === null ? '' : row.weight_kg + ' kg → ' + r.newWeight + ' kg',
        detail: note === undefined ? '' : (row.note ?? '') + ' → ' + note,
      })),
    }));
  }
  fail(2, '缺参数 id 或 date（二选一）');
  throw new Error('unreachable');
}

/** `calorie.weight.remove` · 删体重记录（id／date／start+end 三选一，硬删除不可恢复）。 */
export function writeWeightRemove(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = optNum(params, 'id');
  const date = wday(params, 'date');
  const start = wday(params, 'start');
  const end = wday(params, 'end');
  if (id !== undefined) {
    if (!Number.isInteger(id) || id <= 0) fail(2, 'id 须为正整数');
    const r = deleteWeight(db, id);
    return out(R('删体重记录', 'delete', '已删除体重 #' + id + '（' + r.date + ' ' + r.weight_kg + ' kg · ' + HARD_INNER + '）', '删体重记录', 'weight_log (写库回执)', {
      recordId: id, ids: [id], writtenFields: [],
      // 整页回执的快照表吃删前取值（摘要口径一字不动；`detail` 给原始数值，单位由页面加）。
      items: [{ id, date: r.date, status: deleteStatus('hard'), reason: '', detail: String(r.weight_kg) }],
    }));
  }
  if (date !== undefined) {
    assertISO(date, 'date');
    const r = deleteWeightByDate(db, date);
    return out(R('删某日体重', 'delete', '已删除 ' + date + ' 体重 ' + r.deletedCount + ' 条' + HARD_WORDING, '删某日体重', 'weight_log (写库回执)', {
      ids: [], idSource: 'condition', writtenFields: [],
      items: r.snapshot.map((row) => ({
        id: row.id, date: row.date, status: deleteStatus('hard'), reason: '', detail: String(row.weight_kg),
      })),
    }));
  }
  if (start !== undefined || end !== undefined) {
    if (start === undefined || end === undefined) fail(2, '按范围删须同时传 start/end');
    assertISO(start as string, 'start');
    assertISO(end as string, 'end');
    if ((start as string) > (end as string)) fail(2, 'start 不得晚于 end');
    const r = deleteWeightRange(db, start as string, end as string);
    return out(R('批量删体重', 'delete', '已删除 ' + start + '~' + end + ' 体重 ' + r.deletedCount + ' 条' + HARD_WORDING, '批量删体重', 'weight_log (写库回执)', {
      ids: [], idSource: 'condition', writtenFields: [],
      items: r.snapshot.map((row) => ({
        id: row.id, date: row.date, status: deleteStatus('hard'), reason: '', detail: row.weight_kg + 'kg',
      })),
    }));
  }
  fail(2, '缺参数 id/date/start+end（三选一）');
  throw new Error('unreachable');
}
