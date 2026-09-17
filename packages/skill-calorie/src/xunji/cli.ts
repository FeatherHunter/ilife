#!/usr/bin/env node
/** 训记模块的命令行入口：模块**自己的对外面**（老 `xunji_bridge` 同形的 8 条子命令，读法见 `subcommands.ts`）。
 *
 * 用法：`node packages/skill-calorie/dist/xunji/cli.js <子命令> [参数…]`
 * 产物：stdout 一行 JSON（读数）＋ 退出码（0／1／2／3／4，见 `XUNJI_EXIT_CODES`）。
 * 定位：本入口是模块对外面的一部分（#597 负责人裁定：对外面与老实现一模一样）；
 *       卡路里**业务面**的命令仍走 `calorie-cmd-read`（两处不混：这里不做页面、不落库）。
 */
import { runXunjiCommand } from './run.js';

const run = await runXunjiCommand(process.argv.slice(2));
if (run.stderr !== null) console.error(run.stderr);
process.stdout.write(JSON.stringify(run.data ?? { message: run.message }, null, 2) + '\n');
process.exitCode = run.code;
