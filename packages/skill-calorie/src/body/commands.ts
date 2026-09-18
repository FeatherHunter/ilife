/** 身体细节能力的命令声明（**权威源**，HELP 一级分组「身体细节」／场景 08）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 里的索引与分派层一行不动。
 * 每条声明六件事：键／形状／标题／代表唤醒词／可执行示例／处理函数（字段语义见 `shared/commandSpec.ts`）。
 *
 * 子功能与命令的对应（HELP 下一级 → 键，取自 `src/triggers/scene-08-body.ts` 的 `subfunction` 字段）：
 *   记身体细节＝`calorie.body.composition-add`／`calorie.body.measure-add`；
 *   看身体细节＝`calorie.view.body-composition`／`calorie.view.body-measure`；
 *   删身体细节＝`calorie.body.composition-remove`／`calorie.body.measure-remove`；
 *   向导（看体脂向导／看围度向导）＝`calorie.view.composition-wizard`／`calorie.view.measure-wizard`；
 *   比身体细节（#355 接线）＝`calorie.view.body-composition-compare`／`calorie.view.body-measure-compare`
 *  （取数走 `body/compare.ts`，路由 `order 246/247` 由 `non-exec` 转 `exec`）。
 *
 * **代表唤醒词的出处（#367 门）**：一律取 `t169-设计定稿.md` 那 13 条词表里、且**路由回同键**的那一个
 * （看体脂／看围度／记体脂（皮褶钳）／对比体脂…）；两个向导页是写词的**流程内页**（老技能没给它们词），
 * 照 `t450-词表订正.md` 的照片域先例**不设代表唤醒词**——速查表退回列命令名，`看体脂向导`／`看围度向导`
 * 仍在路由面（用户说得出、命得中），那两条自造入口词归路由面收口票。
 *
 * #703 · 写命令的**信封形状**不写在声明上（写命令一律 `receipt` 形，那件事实的唯一定义地在生成器
 * `scripts/gen-cli.mjs` 合成的 `cli/keys.ts`）；带整页回执的写命令另在声明上挂 `doc:` 那一位。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { writeCompositionAdd, writeMeasureAdd } from './log.js';
import { writeCompositionRemove, writeMeasureRemove } from './remove.js';
import { viewBodyComposition, viewBodyMeasure } from './view.js';
import { viewCompositionWizard, viewMeasureWizard } from './wizard.js';
import { viewBodyCompositionCompare, viewBodyMeasureCompare } from './compare.js';
import { bodyReceiptDoc } from './receipt.js';

export const BODY_COMMANDS = [
  { kind: 'write', key: 'calorie.body.composition-add', title: '记体脂', wakeWord: '记体脂（皮褶钳）', run: writeCompositionAdd, doc: bodyReceiptDoc, example: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"gym","bodyFatPct":18.5}\'' },
  { kind: 'write', key: 'calorie.body.composition-remove', title: '删体脂', wakeWord: '删体脂', run: writeCompositionRemove, doc: bodyReceiptDoc, example: 'calorie-cmd-read calorie.body.composition-remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.body.measure-add', title: '记围度', wakeWord: '记围度', run: writeMeasureAdd, doc: bodyReceiptDoc, example: 'calorie-cmd-read calorie.body.measure-add --params \'{"waistCm":85}\'' },
  { kind: 'write', key: 'calorie.body.measure-remove', title: '删围度', wakeWord: '删围度', run: writeMeasureRemove, doc: bodyReceiptDoc, example: 'calorie-cmd-read calorie.body.measure-remove --params \'{"id":1}\'' },
  { kind: 'read', key: 'calorie.view.body-composition', shape: 'stat', title: '体成分看', wakeWord: '看体脂', run: viewBodyComposition, example: 'calorie-cmd-read calorie.view.body-composition' },
  { kind: 'read', key: 'calorie.view.body-measure', shape: 'stat', title: '围度看', wakeWord: '看围度', run: viewBodyMeasure, example: 'calorie-cmd-read calorie.view.body-measure --params \'{"metric":"waist_cm"}\'' },
  { kind: 'read', key: 'calorie.view.composition-wizard', shape: 'stat', title: '体脂向导', run: viewCompositionWizard, example: 'calorie-cmd-read calorie.view.composition-wizard' },
  { kind: 'read', key: 'calorie.view.measure-wizard', shape: 'stat', title: '围度向导', run: viewMeasureWizard, example: 'calorie-cmd-read calorie.view.measure-wizard' },
  { kind: 'read', key: 'calorie.view.body-composition-compare', shape: 'stat', title: '体脂对比', wakeWord: '对比体脂', run: viewBodyCompositionCompare, example: 'calorie-cmd-read calorie.view.body-composition-compare --params \'{"period1Start":"2026-09-05","period1End":"2026-09-05","period2Start":"2026-09-07","period2End":"2026-09-07"}\'' },
  { kind: 'read', key: 'calorie.view.body-measure-compare', shape: 'stat', title: '围度对比', wakeWord: '对比围度', run: viewBodyMeasureCompare, example: 'calorie-cmd-read calorie.view.body-measure-compare --params \'{"date1":"2026-09-05","date2":"2026-09-07"}\'' },
] satisfies readonly CommandSpec[];
