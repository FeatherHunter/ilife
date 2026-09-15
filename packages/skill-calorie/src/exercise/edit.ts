/** 改运动（HELP 场景 04「运动」下一级 · 改运动）：`calorie.exercise.update` ＋ `calorie.exercise.remove`。
 *
 * #316 搬迁：两个处理函数逐字取自 `src/cli/write.ts` 的 `case 'calorie.exercise.update'`／
 * `case 'calorie.exercise.remove'` 分支（含文件内的 `EX_CAMEL` 字段表）——**纯搬迁，行为不变**。
 * 删除仍是**软删**（`exercise_log.is_deleted`，见 `src/cli/write.ts` 文件头那份口径）。
 *
 * #264 产物：两键五形态一律完整文档（`./receipt.js` 装配，与场景 07 改档案页同形——
 * 状态 ＋ 命中计数 ＋ 改前→改后／删除快照 ＋ 对账 ＋ 复制区）；行为不动——校验口径、
 * 写库语句、回执数据（`recordId`／`ids`／`writtenFields`／`items`／摘要）与搬迁前逐字一致，
 * `affectedRows` 按 `total_changes()` 增量自算（与分派层同口径，页内与信封一致）。
 *
 * #478 入口口径：`id` 收**数字或数字串**（`coerceId`）。理由是唤醒词的示例参数改成了占位符
 * `"<记录号>"`——记录号是「先跑一次看运动记录，把那一页上的号填进来」得到的，填进来的是**字符串**。
 * 非数字串仍给参数错（`id 须为正整数`），不会拿占位符去查库。
 */
import type { DatabaseSync } from 'node:sqlite';
import { deleteDay, deleteRange, deleteRecord, updateDay, updateRecord } from './exerciseStore.js';
import type { ExerciseRow } from './exerciseStore.js';
import { withM5 } from '../render/receipt.js';
import type { CrudReceipt } from '../render/receipt.js';
import { CalorieRenderError } from '../render/errors.js';
import { assertISO, fail, optNum, optStr, wday } from '../shared/params.js';
import { R, SOFT_EXCLUDED, cliNames, commandLine, deleteStatus, totalChanges } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { buildExerciseReceiptDoc } from './receipt.js';

const EX_CAMEL: Record<string, string> = {
  type: 'exercise_type', exerciseType: 'exercise_type', calories: 'calories_burned', caloriesBurned: 'calories_burned',
  minutes: 'duration_minutes', durationMinutes: 'duration_minutes', note: 'note', category: 'category', difficulty: 'difficulty',
  distance: 'distance_km', distanceKm: 'distance_km', heartRate: 'avg_heart_rate', avgHeartRate: 'avg_heart_rate',
  maxHeartRate: 'max_heart_rate', steps: 'steps', reps: 'reps', loadKg: 'load_kg', setIndex: 'set_index',
  date: 'date', time: 'time', backfill: 'is_backfill', isBackfill: 'is_backfill',
};

/** 记录号（`id`）：收数字或数字串，其余一律判成「没给」交给后面的校验去报参数错（不拿占位符去查库）。（#478 入口口径）
 *  **不许用 `optNum`／`optStr` 去读这个字段**：两者都是严格类型闸（读到另一种形状会直接 `fail(2)`），
 *  串起来读反而把「数字串」这一种合法输入当成类型错。 */
function coerceId(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s !== '' && /^[0-9]+$/.test(s) ? Number(s) : undefined;
}

/** 读 `id` 这一格（数字或数字串都收）；给的形状不是这两样即按参数错当场报，不给即 undefined。（#478） */
function readId(params: Record<string, unknown>): number | undefined {
  const v = params['id'];
  if (v === undefined || v === null) return undefined;
  const id = coerceId(v);
  if (id === undefined) fail(2, typeof v === 'number' ? 'id 须为正整数' : 'id 须为正整数（可给数字或数字串）');
  return id;
}

/** 回执装配收口：数据与整页同源（同一份 `receipt`），页面只读装配不改数据。 */
function done(
  db: DatabaseSync, key: string, command: string, receipt: CrudReceipt,
  detail: { rows?: readonly ExerciseRow[]; pairs?: readonly { readonly old: ExerciseRow; readonly new: ExerciseRow }[] },
): WriteOut {
  return {
    data: { ok: true, message: receipt.summary, receipt },
    html: buildExerciseReceiptDoc(db, key, receipt, command, detail),
  };
}

/** `calorie.exercise.update` · 改运动：按 `id` 改一条，或按 `date` 改某日（二选一）。 */
export function writeExerciseUpdate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const key = 'calorie.exercise.update';
  const command = commandLine(key, params);
  const before = totalChanges(db);
  const id = readId(params);
  const date = wday(params, 'date');
  const fields: Record<string, unknown> = {};
  for (const [camel, col] of Object.entries(EX_CAMEL)) {
    if (camel === 'type' || camel === 'exerciseType' || camel === 'calories' || camel === 'caloriesBurned') continue;
    if (params[camel] !== undefined) fields[col] = params[camel];
  }
  const t = optStr(params, 'type') ?? optStr(params, 'exerciseType');
  if (t !== undefined) {
    if (!t.trim()) fail(2, 'type 不得为空');
    fields['exercise_type'] = t.trim();
  }
  const cal = optNum(params, 'calories') ?? optNum(params, 'caloriesBurned');
  if (cal !== undefined) {
    if (cal < 0) fail(2, 'calories 不得为负');
    fields['calories_burned'] = cal;
  }
  for (const k of Object.keys(params)) {
    if (!(k in EX_CAMEL) && k !== 'id' && k !== 'key') fail(2, '不支持字段: ' + k);
  }
  if (Object.keys(fields).length === 0) fail(2, '至少传 1 个待改字段');
  if (typeof fields['date'] === 'string') assertISO(fields['date'] as string, 'date');
  if (id !== undefined) {
    if (!Number.isInteger(id) || id <= 0) fail(2, 'id 须为正整数');
    const pair = updateRecord(db, id, fields);
    const base = R('改运动记录', 'update', '已更新运动 #' + id + '（' + Object.keys(fields).join('、') + '）', '改运动记录', 'exercise_log (写库回执)', {
      recordId: id, ids: [id], writtenFields: cliNames(Object.keys(fields)),
      items: [{ id, status: '已更新', reason: '' }],
    });
    const receipt = withM5(base, { affectedRows: totalChanges(db) - before });
    return done(db, key, command, receipt, { pairs: [pair] });
  }
  if (date !== undefined) {
    assertISO(date, 'date');
    const r = updateDay(db, date, fields);
    if (r.matched === 0) throw new CalorieRenderError('missing-data', '无运动记录（' + date + '）');
    const base = R('改某日运动', 'update', '已更新 ' + date + ' 运动 ' + r.matched + ' 条', '改某日运动', 'exercise_log (写库回执)', {
      ids: [], idSource: 'condition', writtenFields: cliNames(Object.keys(fields)),
    });
    const receipt = withM5(base, { affectedRows: totalChanges(db) - before });
    return done(db, key, command, receipt, { pairs: r.pairs });
  }
  fail(2, '缺参数 id 或 date（二选一）');
  throw new Error('unreachable');
}

/** `calorie.exercise.remove` · 删运动：按 `id`／`date`／`from`＋`to` 三选一，一律软删。 */
export function writeExerciseRemove(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const key = 'calorie.exercise.remove';
  const command = commandLine(key, params);
  const before = totalChanges(db);
  const id = readId(params);
  const date = wday(params, 'date');
  const from = wday(params, 'from');
  const to = wday(params, 'to');
  if (id !== undefined) {
    if (!Number.isInteger(id) || id <= 0) fail(2, 'id 须为正整数');
    const snapshot = deleteRecord(db, id);
    const base = R('删运动记录', 'delete', '已删除运动 #' + id + SOFT_EXCLUDED, '删运动记录', 'exercise_log (写库回执)', {
      recordId: id, ids: [id], writtenFields: ['is_deleted'], items: [{ id, status: deleteStatus('soft'), reason: '' }],
    });
    const receipt = withM5(base, { affectedRows: totalChanges(db) - before });
    return done(db, key, command, receipt, { rows: [snapshot] });
  }
  if (date !== undefined) {
    assertISO(date, 'date');
    const snapshot = db.prepare('SELECT * FROM exercise_log WHERE date = ? AND COALESCE(is_deleted, 0) = 0').all(date) as ExerciseRow[];
    const n = deleteDay(db, date);
    if (n === 0) throw new CalorieRenderError('missing-data', '无运动记录（' + date + '）');
    const base = R('删某日运动', 'delete', '已删除 ' + date + ' 运动 ' + n + ' 条' + SOFT_EXCLUDED, '删某日运动', 'exercise_log (写库回执)', { ids: [], idSource: 'condition', writtenFields: ['is_deleted'] });
    const receipt = withM5(base, { affectedRows: totalChanges(db) - before });
    return done(db, key, command, receipt, { rows: snapshot });
  }
  if (from !== undefined || to !== undefined) {
    if (from === undefined || to === undefined) fail(2, '按范围删须同时传 from/to');
    assertISO(from as string, 'from');
    assertISO(to as string, 'to');
    if ((from as string) > (to as string)) fail(2, 'from 不得晚于 to');
    const snapshot = db.prepare('SELECT * FROM exercise_log WHERE date BETWEEN ? AND ? AND COALESCE(is_deleted, 0) = 0 ORDER BY date, time').all(from as string, to as string) as ExerciseRow[];
    const n = deleteRange(db, from as string, to as string);
    if (n === 0) throw new CalorieRenderError('missing-data', '无运动记录（' + from + '~' + to + '）');
    const base = R('批量删运动', 'delete', '已删除 ' + from + '~' + to + ' 运动 ' + n + ' 条' + SOFT_EXCLUDED, '批量删运动', 'exercise_log (写库回执)', { ids: [], idSource: 'condition', writtenFields: ['is_deleted'] });
    const receipt = withM5(base, { affectedRows: totalChanges(db) - before });
    return done(db, key, command, receipt, { rows: snapshot });
  }
  fail(2, '缺参数 id/date/from+to（三选一）');
  throw new Error('unreachable');
}
