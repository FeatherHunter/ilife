/** 运动能力对外的门（HELP 场景 04「运动」）：命令声明 ＋ 回写桥。
 *
 * #703：门上的读／写命令入口（原 `runExerciseView`／`runExerciseWrite`）已删——生产一次都不走它们，
 * 真正分派走生成物 `cli/registry.ts`（`cmd_read.ts`／`write.ts` 查表后直接调声明的 `run`）。
 *
 * 对外两件（铁律五「不多于五个」）：
 *   ① `EXERCISE_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出），生成物 `cli/registry.ts` 从这取；
 *   ② `exerciseBackfillBridge`——训记回写桥（R2 收口：回写侧经此门，不深引 `exerciseStore.ts` 内部件）。
 *
 * 域内的取数与页面装配（`exercise/exerciseStore.ts`／`home/exercise.ts`／`render/exercisePort.ts`／
 * `render/sportDocs.ts`／`render/sportPortDocs.ts`）**仍住原处**：它们是既有的取数与移植层，
 * 别的场景（01／05／10）也在用，搬进来会连带改它们的调用方（本票车道外，见证据 §偏离 1）。
 * 本目录只搬**命令声明与分派**，处理逻辑一律经那些件已公开的接口调用（铁律一）。
 */

export { EXERCISE_COMMANDS } from './commands.js';
export { exerciseBackfillBridge } from './exerciseStore.js';
