/** 记运动（HELP 场景 04「运动」下一级 · 记运动）：`calorie.exercise.add` 一条写命令的住处。
 *
 * #316 搬迁：处理函数逐字取自 `src/cli/write.ts` 的 `case 'calorie.exercise.add'` 分支
 * （含文件内的 `oneExercise` 参数装配）——**纯搬迁，行为不变**。单条／`items` 批量／`copyFrom` 复制三形态
 * 仍在这一个键下面，没有拆键。
 *
 * 取数走既有的 `fetch/exercise.ts`（本目录不搬它：别的场景与 `analysis/**` 也在用，见 `index.ts` 头注）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { todayISO } from '../analysis/utils.js';
import { addRecord, batchAdd, copyYesterday } from '../fetch/exercise.js';
import type { ExerciseRecordInput } from '../fetch/exercise.js';
import { CalorieRenderError } from '../render/errors.js';
import { assertISO, fail, needArr, wday } from '../shared/params.js';
import { F, R, out } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';

/** 一条运动输入：类型／热量必填，其余按库里那几列可选；`date` 缺省今天。 */
function oneExercise(item: Record<string, unknown>, i: string): ExerciseRecordInput {
  const g = (k: string): unknown => item[k];
  const type = g('type') ?? g('exerciseType');
  if (typeof type !== 'string' || !type.trim()) fail(2, '运动 type 必填' + i);
  const cal = g('calories') ?? g('caloriesBurned');
  if (typeof cal !== 'number' || !Number.isFinite(cal) || cal < 0) fail(2, '运动 calories 必填（≥0 number）' + i);
  const date = (g('date') as string | undefined) ?? todayISO();
  assertISO(date, 'date');
  const numOrNull = (k: string): number | null | undefined => {
    const v = g(k);
    if (v === undefined || v === null) return undefined;
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(2, '运动参数 ' + k + ' 须为 number' + i);
    return v as number;
  };
  const strOrUndef = (k: string): string | undefined => {
    const v = g(k);
    if (v === undefined || v === null) return undefined;
    if (typeof v !== 'string') fail(2, '运动参数 ' + k + ' 须为字符串' + i);
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

/** `calorie.exercise.add` · 记运动：单条／批量补记／复制昨日运动（三形态同一个键）。 */
export function writeExerciseLog(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  if (params['copyFrom'] !== undefined) {
    if (params['copyFrom'] !== 'yesterday') fail(2, 'copyFrom 只支持 yesterday');
    const target = wday(params, 'date') ?? wday(params, 'targetDate') ?? todayISO();
    assertISO(target, 'date');
    const r = copyYesterday(db, target);
    if (r.copied + r.skipped === 0) throw new CalorieRenderError('missing-data', '昨日无运动记录可复制');
    return out(R('复制昨日运动', 'create', '已复制昨日运动→' + target + '：复制 ' + r.copied + '，跳过 ' + r.skipped, '复制昨日运动', 'exercise_log (写库回执)', {
      noChange: r.copied === 0, ids: [], idSource: 'condition',
      writtenFields: r.copied > 0 ? [...F.exercise] : [],
    }));
  }
  if (params['items'] !== undefined) {
    const items = needArr(params, 'items');
    if (items.length > 200) fail(2, 'items 至多 200 条');
    const r = batchAdd(db, items.map((e, i) => oneExercise((e ?? {}) as Record<string, unknown>, '（第' + i + '条）')));
    return out(R('记运动', 'create', '批量记运动：新增 ' + r.added + ' 条', '批量补记运动', 'exercise_log (写库回执)', {
      recordId: r.ids[0] ?? null, ids: r.ids, idSource: r.ids.length > 0 ? 'record' : 'condition',
      writtenFields: r.added > 0 ? [...F.exercise] : [],
    }));
  }
  const input = oneExercise(params, '');
  const r = addRecord(db, input);
  return out(R('记运动', 'create', '已记运动：' + input.exerciseType + ' ' + input.caloriesBurned + ' 卡' + (input.minutes ? ' · ' + input.minutes + ' 分钟' : '') + '（' + input.date + '）', '记运动', 'exercise_log (写库回执)', {
    recordId: r.id, ids: [r.id], writtenFields: [...F.exercise],
    items: [{ id: r.id, date: input.date, status: '成功', reason: '', detail: input.exerciseType }],
  }));
}
