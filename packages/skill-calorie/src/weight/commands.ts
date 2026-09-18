/** 体重的命令声明（**权威源**，HELP 场景 03「体重」）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 里的索引与分派层一行不动。
 * 每条声明六件事：键（`cli/keys.ts` 登记的那个）／形状／标题（用户看到的中文名）／
 * 代表唤醒词（生成 SKILL.md 速查表用，必须是 `TRIGGERS` 里真有的唤醒词）／
 * 可执行示例（生成 SKILL.md 速查表「例」列用，照抄即能跑）／处理函数。
 *
 * 子功能与命令的对应（HELP 下一级 → 键）：量体重＝`view.weight` ＋ `weight.log`／`weight.batch`；
 * 改体重记录＝`weight.update`／`weight.remove`；看体重明细／看体重曲线＝`view.weight-history`（同一个键）；
 * 看体重稳不稳＝`view.volatility`；对比体重＝`view.weight-compare`；体重复盘＝`view.weight-review`。
 *
 * `flows`（#338）：这条命令服务的**工作流程名**（零条或多条），取值是一张封闭表，逐字如下八条——
 * 量体重／改体重记录／看体重明细／看体重曲线／看体重稳不稳／看体重备注／对比体重／体重复盘。
 * 一个名字对应帮助面场景 03 的一个下一级分组；一个键服务多条流程时列全（`view.weight-history`
 * 同时服务明细／曲线／备注三条）。名字的事实住这里，SKILL.md 的场景 03 体重工作流程各写一次步骤、
 * 不另存清单，`pnpm gen` 与 `pnpm help:build` 见名单外的名字即抛。
 *
 * #703 · 写命令的**信封形状**不写在声明上（写命令一律 `receipt` 形，那件事实的唯一定义地在生成器
 * `scripts/gen-cli.mjs` 合成的 `cli/keys.ts`）；带整页回执的写命令另在声明上挂 `doc:` 那一位。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewWeightCompare } from './compare.js';
import { writeWeightRemove, writeWeightUpdate } from './edit.js';
import { viewWeightHistory } from './history.js';
import { viewWeight, writeWeightBatch, writeWeightLog } from './log.js';
import { viewWeightReview } from './review.js';
import { viewVolatility } from './volatility.js';
import { weightReceiptDoc } from './receipt.js';

export const WEIGHT_COMMANDS = [
  { kind: 'read', key: 'calorie.view.weight', shape: 'stat', title: '体重盘', wakeWord: '看今日体重', flows: ['量体重', '体重复盘'], run: viewWeight, example: 'calorie-cmd-read calorie.view.weight' },
  { kind: 'read', key: 'calorie.view.weight-history', shape: 'stat', title: '体重历史', wakeWord: '看本周体重', flows: ['看体重明细', '看体重曲线', '看体重备注'], run: viewWeightHistory, example: 'calorie-cmd-read calorie.view.weight-history --params \'{"days":7}\'' },
  { kind: 'read', key: 'calorie.view.weight-compare', shape: 'stat', title: '体重对比', wakeWord: '对比体重：本月 vs 上月', flows: ['对比体重'], run: viewWeightCompare, example: 'calorie-cmd-read calorie.view.weight-compare --params \'{"window":"30d","compareWindow":"prev"}\'' },
  { kind: 'read', key: 'calorie.view.weight-review', shape: 'stat', title: '体重复核', wakeWord: '看体重复核', flows: ['体重复盘'], run: viewWeightReview, example: 'calorie-cmd-read calorie.view.weight-review' },
  { kind: 'read', key: 'calorie.view.volatility', shape: 'stat', title: '波动分析', wakeWord: '看体重稳不稳（增强版）', flows: ['看体重稳不稳'], run: viewVolatility, example: 'calorie-cmd-read calorie.view.volatility --params \'{"window":"7d"}\'' },
  { kind: 'write', key: 'calorie.weight.log', title: '记体重', wakeWord: '记体重', flows: ['量体重'], run: writeWeightLog, doc: weightReceiptDoc, example: 'calorie-cmd-read calorie.weight.log --params \'{"kg":70.5}\'' },
  { kind: 'write', key: 'calorie.weight.update', title: '改体重', wakeWord: '改体重记录', flows: ['改体重记录'], run: writeWeightUpdate, doc: weightReceiptDoc, example: 'calorie-cmd-read calorie.weight.update --params \'{"id":1,"kg":70.2}\'' },
  { kind: 'write', key: 'calorie.weight.remove', title: '删体重', wakeWord: '删体重记录', flows: ['改体重记录'], run: writeWeightRemove, doc: weightReceiptDoc, example: 'calorie-cmd-read calorie.weight.remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.weight.batch', title: '批量记体重', wakeWord: '批量补录体重', flows: ['量体重'], run: writeWeightBatch, doc: weightReceiptDoc, example: 'calorie-cmd-read calorie.weight.batch --params \'{"items":[{"date":"<日期>","kg":70.5}]}\'' },
] satisfies readonly CommandSpec[];
