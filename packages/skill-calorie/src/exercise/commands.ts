/** 运动的命令声明（**权威源**，HELP 场景 04「运动」，10 键）。
 *
 * #316 搬迁：这 9 条原先住 `src/cli/legacy/scene-04.ts`（未搬迁清单的场景分区），
 * 本次逐字段原值照抄搬进本目录（`kind`／`key`／`shape`／`title`／`wakeWord`／`example` 六件事一字未改），
 * 处理函数住同目录的子功能件。加一条命令＝只改这个文件＋它那个子功能件，`cli/` 里的索引与分派层一行不动。
 *
 * 子功能与命令的对应（HELP 下一级 → 键，依据 `src/triggers/scene-04-exercise.ts` 的 `subfunction` 字段）：
 * 记运动＝`exercise.add`；改运动＝`exercise.update`／`exercise.remove`；看运动＝`view.exercise-goal`／`view.exercise-records`；
 * 运动分析＝`view.exercise-strength`／`-cardio`／`-distribution`／`-trend`；运动复盘＝`view.exercise-recap`。
 * （`calorie.view.exercise`「运动总览」与 `calorie.view.exercise-review`「计划复盘」不属本场景分区——
 * 前者归场景 01 主页、后者归场景 05 健身计划，住别处的清单。）
 *
 * #266：代表唤醒词一律取冻结的 436 条词表（`src/triggers/wake-assets.ts` 的 `WAKE_ASSETS`）里的真词，
 * 于是 HELP 场景页（场景页同源那张表）与速查台（本文件的 `wakeWord` 派生）对同一场景列出同一批词。
 * 实测只改 4 处：`-distribution`（看运动分类占比→看运动类型分布）／`-trend`（看运动消耗趋势→看运动趋势）／
 * `-recap`（看运动复盘→运动复盘（本周））原来用的是新拟入口词，`-goal` 原来**没有这个字段**（速查表退回列命令键）。
 * `-strength`（看力量训练总览）／`-cardio`（看有氧训练总览）／`-records`（看运动记录（有备注））三条原本就是真词，未动；
 * 票面六行表里 `-strength`／`-cardio` 那两行的新拟词（看力量总览／看有氧总览）住 `routes.ts` 的 `new` 表，不在本文件。
 *
 * #703 · 写命令的**信封形状**不写在声明上（写命令一律 `receipt` 形，那件事实的唯一定义地在生成器
 * `scripts/gen-cli.mjs` 合成的 `cli/keys.ts`）。本能力的写命令没有整页回执，故不挂 `doc:`。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewExerciseCardio } from './cardio.js';
import { viewExerciseDistribution } from './distribution.js';
import { viewExerciseRecords } from './records.js';
import { writeExerciseRemove, writeExerciseUpdate } from './edit.js';
import { viewExerciseGoal } from './goal.js';
import { writeExerciseLog } from './log.js';
import { viewExerciseRecap } from './recap.js';
import { viewExerciseStrength } from './strength.js';
import { viewExerciseTrend } from './trend.js';

export const EXERCISE_COMMANDS = [
  { kind: 'read', key: 'calorie.view.exercise-cardio', shape: 'stat', title: '有氧训练总览', wakeWord: '看有氧训练总览', run: viewExerciseCardio, example: 'calorie-cmd-read calorie.view.exercise-cardio --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-distribution', shape: 'stat', title: '运动类型分布', wakeWord: '看运动类型分布', run: viewExerciseDistribution, example: 'calorie-cmd-read calorie.view.exercise-distribution --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-goal', shape: 'stat', title: '运动目标视图', wakeWord: '看今日运动（vs 目标）', run: viewExerciseGoal, example: 'calorie-cmd-read calorie.view.exercise-goal --params \'{"window":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-recap', shape: 'stat', title: '运动复盘', wakeWord: '运动复盘（本周）', run: viewExerciseRecap, example: 'calorie-cmd-read calorie.view.exercise-recap --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-records', shape: 'stat', title: '运动记录', wakeWord: '看运动记录（有备注）', run: viewExerciseRecords, example: 'calorie-cmd-read calorie.view.exercise-records --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-strength', shape: 'stat', title: '力量训练总览', wakeWord: '看力量训练总览', run: viewExerciseStrength, example: 'calorie-cmd-read calorie.view.exercise-strength --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-trend', shape: 'stat', title: '运动趋势', wakeWord: '看运动趋势', run: viewExerciseTrend, example: 'calorie-cmd-read calorie.view.exercise-trend --params \'{"window":"7d"}\'' },
  { kind: 'write', key: 'calorie.exercise.add', title: '记运动', wakeWord: '记运动', run: writeExerciseLog, example: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"慢跑","calories":320,"minutes":30}\'' },
  { kind: 'write', key: 'calorie.exercise.remove', title: '删运动', wakeWord: '删运动记录', run: writeExerciseRemove, example: 'calorie-cmd-read calorie.exercise.remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.exercise.update', title: '改运动', wakeWord: '改运动记录', run: writeExerciseUpdate, example: 'calorie-cmd-read calorie.exercise.update --params \'{"id":1,"minutes":40}\'' },
] satisfies readonly CommandSpec[];
