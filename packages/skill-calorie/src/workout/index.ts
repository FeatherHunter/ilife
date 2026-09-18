/** 健身计划能力对外的门（HELP 场景 05「健身计划」）：命令声明 ＋ 计划只读。
 *
 * #703：门上的读／写命令入口（原 `runWorkoutView`／`runWorkoutWrite`）已删——生产一次都不走它们，
 * 真正分派走生成物 `cli/registry.ts`（`cmd_read.ts`／`write.ts` 查表后直接调声明的 `run`）。
 *
 * 对外五件（铁律五「不多于五个」，正好用满）：
 *   ① `WORKOUT_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `getPlan`——计划只读（R1 收口：训记取数口经此门，不深引 `planStore.ts` 内部件；本门不转写口）；
 *   ③ `PlanConfigRow`／`PlanMovement`／`PlanSessionRow`（类型）——②的形状。
 *
 * 本场景**有写键**：`commands.ts` 里 `workout.plan-*` 那一族十条 ＋「落地训练」`workout.land`（#612）、
 * 「同步到训记」／「拉训记实绩」`workout.xunji-*`（#614）、「落地到本周末」／「落地到本月底」
 * `workout.land-weekend`／`workout.land-monthend`（#613）；加写键仍只改 `commands.ts` ＋ 子功能文件。
 *
 * 域内其他件（子功能 `plan.ts`／`wizard.ts`／`review.ts`／`contraindication.ts`／`progress.ts`）
 * **不出这个目录**，故不在这里转出。
 */

export { WORKOUT_COMMANDS } from './commands.js';
export { getPlan } from './planStore.js';
export type { PlanConfigRow, PlanMovement, PlanSessionRow } from './planStore.js';
