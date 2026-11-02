/** 记运动（HELP 场景 04「运动」下一级 · 记运动）：`calorie.exercise.add` 一条写命令的住处。
 *
 * #316 搬迁：处理函数逐字取自 `src/cli/write.ts` 的 `case 'calorie.exercise.add'` 分支
 * （含文件内的 `oneExercise` 参数装配）——**纯搬迁，行为不变**。单条／`items` 批量／`copyFrom` 复制三形态
 * 仍在这一个键下面，没有拆键。
 *
 * 取数走本目录的 `exercise/exerciseStore.ts`（本窗才搬入：别的场景与 `analysis/**` 也在用，见 `index.ts` 头注）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { todayISO } from '../analysis/utils.js';
import { addRecord, batchAdd, copyYesterday } from './exerciseStore.js';
import type { ExerciseRecordInput, ExerciseRow } from './exerciseStore.js';
import { withM5 } from '../render/receipt.js';
import type { CrudReceipt } from '../render/receipt.js';
import { CalorieRenderError } from '../render/errors.js';
import { assertISO, fail, needArr, wday } from '../shared/params.js';
import { F, R, commandLine, totalChanges } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { buildExerciseReceiptDoc } from './receipt.js';
import { m } from '../entries/index.js';

/** 一条运动输入：类型／热量必填，其余按库里那几列可选；`date` 缺省今天。 */
function oneExercise(item: Record<string, unknown>, i: string): ExerciseRecordInput {
  const g = (k: string): unknown => item[k];
  const type = g('type') ?? g('exerciseType');
  if (typeof type !== 'string' || !type.trim()) fail(2, m('skill-calorie.exercise-log.c001', { p0: String(i) }));
  const cal = g('calories') ?? g('caloriesBurned');
  if (typeof cal !== 'number' || !Number.isFinite(cal) || cal < 0) fail(2, m('skill-calorie.exercise-log.c002', { p0: String(i) }));
  const date = (g('date') as string | undefined) ?? todayISO();
  assertISO(date, 'date');
  const numOrNull = (k: string): number | null | undefined => {
    const v = g(k);
    if (v === undefined || v === null) return undefined;
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(2, m('skill-calorie.exercise-log.c003', { p0: String(k), p1: String(i) }));
    return v as number;
  };
  const strOrUndef = (k: string): string | undefined => {
    const v = g(k);
    if (v === undefined || v === null) return undefined;
    if (typeof v !== 'string') fail(2, m('skill-calorie.exercise-log.c004', { p0: String(k), p1: String(i) }));
    return v as string;
  };
  return {
    date, exerciseType: (type as string).trim(), caloriesBurned: cal as number,
    minutes: numOrNull('minutes') ?? null, timeStr: strOrUndef('time'), note: strOrUndef('note'),
    reps: numOrNull('reps') ?? null, category: strOrUndef('category') ?? null,
    difficulty: strOrUndef('difficulty') ?? null, distance: numOrNull('distance') ?? numOrNull('distanceKm') ?? null,
    heartRate: numOrNull('heartRate') ?? numOrNull('avgHeartRate') ?? null,
    maxHeartRate: numOrNull('maxHeartRate') ?? null, steps: numOrNull('steps') ?? null,
    setIndex: numOrNull('setIndex') ?? null, loadKg: numOrNull('loadKg') ?? null,
    isBackfill: (g('backfill') ?? g('isBackfill')) === true,
  };
}

/** `calorie.exercise.add` · 记运动：单条／批量补记／复制昨日运动（三形态同一个键）。
 *
 * 产物（#264）：三形态一律完整文档（`./receipt.js` 装配，与场景 07 同形）；行为不动——
 * 写库口径与回执数据（`recordId`／`ids`／`writtenFields`／`items`／摘要）与搬迁前逐字一致，
 * `affectedRows` 由本件按 `total_changes()` 增量自算（与分派层 `dispatchWrite` 同口径，
 * 故页内影响行数与信封一致），`command` 照抄实跑原文进复制日志。
 */
export function writeExerciseLog(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const key = 'calorie.exercise.add';
  const command = commandLine(key, params);
  const before = totalChanges(db);
  if (params['copyFrom'] !== undefined) {
    if (params['copyFrom'] !== 'yesterday') fail(2, m('skill-calorie.exercise-log.c005'));
    const target = wday(params, 'date') ?? wday(params, 'targetDate') ?? todayISO();
    assertISO(target, 'date');
    const r = copyYesterday(db, target);
    if (r.copied + r.skipped === 0) throw new CalorieRenderError('missing-data', '昨日无运动记录可复制');
    const base = R(m('skill-calorie.exercise-log.c006'), 'create', m('skill-calorie.exercise-log.c007', { p0: String(target), p1: String(r.copied), p2: String(r.skipped) }), m('skill-calorie.exercise-log.c008'), m('skill-calorie.exercise-log.c009'), {
      noChange: r.copied === 0, ids: [], idSource: 'condition',
      writtenFields: r.copied > 0 ? [...F.exercise] : [],
    });
    const receipt = withM5(base, { affectedRows: totalChanges(db) - before });
    return done(db, key, command, receipt, { rows: r.rows, skipped: r.skipped, targetDate: target });
  }
  if (params['items'] !== undefined) {
    const items = needArr(params, 'items');
    if (items.length > 200) fail(2, m('skill-calorie.exercise-log.c010'));
    const r = batchAdd(db, items.map((e, i) => oneExercise((e ?? {}) as Record<string, unknown>, m('skill-calorie.exercise-log.c011', { p0: String(i) }))));
    const rows = r.ids.map((id) => db.prepare('SELECT * FROM exercise_log WHERE id = ?').get(id) as ExerciseRow);
    const base = R(m('skill-calorie.exercise-log.c012'), 'create', m('skill-calorie.exercise-log.c013', { p0: String(r.added) }), m('skill-calorie.exercise-log.c014'), m('skill-calorie.exercise-log.c015'), {
      recordId: r.ids[0] ?? null, ids: r.ids, idSource: r.ids.length > 0 ? 'record' : 'condition',
      writtenFields: r.added > 0 ? [...F.exercise] : [],
    });
    const receipt = withM5(base, { affectedRows: totalChanges(db) - before });
    return done(db, key, command, receipt, { rows });
  }
  const input = oneExercise(params, '');
  const r = addRecord(db, input);
  const row = db.prepare('SELECT * FROM exercise_log WHERE id = ?').get(r.id) as ExerciseRow;
  const minuteNote = (input.minutes ? m('skill-calorie.exercise-log.c021', { p0: String(input.minutes) }) : '');
  const base = R(m('skill-calorie.exercise-log.c016'), 'create', m('skill-calorie.exercise-log.c017', {
    p0: String(input.exerciseType),
    p1: String(input.caloriesBurned),
    p2: String(minuteNote),
    p3: String(input.date),
  }), m('skill-calorie.exercise-log.c018'), m('skill-calorie.exercise-log.c019'), {
    recordId: r.id, ids: [r.id], writtenFields: [...F.exercise],
    items: [{ id: r.id, date: input.date, status: m('skill-calorie.exercise-log.c020'), reason: '', detail: input.exerciseType }],
  });
  const receipt = withM5(base, { affectedRows: totalChanges(db) - before });
  return done(db, key, command, receipt, { rows: [row], targetDate: input.date });
}

/** 回执装配收口：数据与整页同源（同一份 `receipt`），页面只读装配不改数据。 */
function done(
  db: DatabaseSync, key: string, command: string, receipt: CrudReceipt,
  detail: { rows?: readonly ExerciseRow[]; skipped?: number; targetDate?: string },
): WriteOut {
  return {
    data: { ok: true, message: receipt.summary, receipt },
    html: buildExerciseReceiptDoc(db, key, receipt, command, detail),
  };
}
