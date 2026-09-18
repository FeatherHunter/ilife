/** 体重能力对外的门（HELP 场景 03「体重」）：命令声明 ＋ 回执端口 ＋ 两处跨能力取数。
 *
 * #703：门上的读／写命令入口（原 `runWeightView`／`runWeightWrite`）已删——生产一次都不走它们，
 * 真正分派走生成物 `cli/registry.ts`（`cmd_read.ts`／`write.ts` 查表后直接调声明的 `run`）。
 *
 * 对外六件（**已越铁律五「一个文件不多于五个」**：本门今天 6 件，本票把它从 8 件收到 6 件；
 * 余下几件（回执端口与两处跨能力取数）的去向登记在 #703 解决评论的「范围外读数」，不在本票窗口）：
 *   ① `WEIGHT_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `weightReceiptDoc`——体重写命令整页回执的端口（#703 起接线住写声明那一行）；
 *   ③ `getWeightGoalInfo`——「体重目标」取数：目标管理那侧（`goal/goalExtraPlate.ts`）在用；
 *   ④ `weightTrend`——「体重趋势」算式：健康盘那侧（`analysis/dashboard.ts`）在用；
 *   ⑤ `WeightGoalInfo`／`WeightTrend`（类型）——③④的形状。
 *
 * 域内其他件（取数 `records.ts`、算式 `figures.ts`、页装配 `plate.ts`／`plateDocs.ts`、
 * 对比场景 `weightCompare*.ts`）**不出这个目录**，故不在这里转出。
 */

export { WEIGHT_COMMANDS } from './commands.js';
export { weightReceiptDoc } from './receipt.js';
export { getWeightGoalInfo, weightTrend } from './figures.js';
export type { WeightGoalInfo, WeightTrend } from './figures.js';
