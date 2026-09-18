/** 分析能力对外的门（HELP 场景 10「分析」）：只转出命令声明一件。
 *
 * #703：门上的读／写命令入口（原 `runAnalysisView`／`runAnalysisWrite`）已删——生产一次都不走它们，
 * 真正分派走生成物 `cli/registry.ts`（`cmd_read.ts`／`write.ts` 查表后直接调声明的 `run`）。
 *
 * 对外一件（铁律五「不多于五个」）：
 *   ① `ANALYSIS_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）。
 *
 * 本场景 13 键**全是读命令**（旧链里「定时复盘／训记／营养表／落地」那些划出去不做的词，
 * 逐字理由住 `routes.ts` 的非执行记录）。
 *
 * 域内其他件（算式与取数 `series.ts`／`trend.ts`／`deficit.ts`／`dashboard.ts`／`cross.ts`／
 * `simulate*.ts`／`anomaly/`／`diet.ts`／`exercise*.ts`／`review.ts`／`utils.ts` 等）**不出这个目录**，
 * 故不在这里转出：它们由 `render/` 侧的视图层直接消费，导入面照旧。
 */

export { ANALYSIS_COMMANDS } from './commands.js';
