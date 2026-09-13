/** 身体细节能力的命令声明（**权威源**，HELP 一级分组「身体细节」／场景 08）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 里的索引与分派层一行不动。
 * 每条声明六件事：键／形状／标题／代表唤醒词／可执行示例／处理函数（字段语义见 `shared/commandSpec.ts`）。
 *
 * 子功能与命令的对应（HELP 下一级 → 键，取自 `src/triggers/scene-08-body.ts` 的 `subfunction` 字段）：
 *   记身体细节＝`calorie.body.composition-add`／`calorie.body.measure-add`；
 *   看身体细节＝`calorie.view.body-composition`／`calorie.view.body-measure`；
 *   删身体细节＝`calorie.body.composition-remove`／`calorie.body.measure-remove`；
 *   向导（看体脂向导／看围度向导）＝`calorie.view.composition-wizard`／`calorie.view.measure-wizard`。
 * 「对比身体细节」那一组的唤醒词（对比体脂／对比围度）今天**没有**单命令同形（渲染层有对比页、CLI 侧未接线），
 * 故不在这里声明——它们的路由记录仍整组迁进本能力的 `routes.ts`，逐字保留 `non-exec` 口径。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { writeCompositionAdd, writeMeasureAdd } from './log.js';
import { writeCompositionRemove, writeMeasureRemove } from './remove.js';
import { viewBodyComposition, viewBodyMeasure } from './view.js';
import { viewCompositionWizard, viewMeasureWizard } from './wizard.js';

export const BODY_COMMANDS = [
  { kind: 'write', key: 'calorie.body.composition-add', shape: 'receipt', title: '记体脂', wakeWord: '记体脂', run: writeCompositionAdd, example: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"gym","bodyFatPct":18.5}\'' },
  { kind: 'write', key: 'calorie.body.composition-remove', shape: 'receipt', title: '删体脂', wakeWord: '删体脂', run: writeCompositionRemove, example: 'calorie-cmd-read calorie.body.composition-remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.body.measure-add', shape: 'receipt', title: '记围度', wakeWord: '记围度', run: writeMeasureAdd, example: 'calorie-cmd-read calorie.body.measure-add --params \'{"waistCm":85}\'' },
  { kind: 'write', key: 'calorie.body.measure-remove', shape: 'receipt', title: '删围度', wakeWord: '删围度', run: writeMeasureRemove, example: 'calorie-cmd-read calorie.body.measure-remove --params \'{"id":1}\'' },
  { kind: 'read', key: 'calorie.view.body-composition', shape: 'stat', title: '体成分看', run: viewBodyComposition, example: 'calorie-cmd-read calorie.view.body-composition' },
  { kind: 'read', key: 'calorie.view.body-measure', shape: 'stat', title: '围度看', run: viewBodyMeasure, example: 'calorie-cmd-read calorie.view.body-measure --params \'{"metric":"waist_cm"}\'' },
  { kind: 'read', key: 'calorie.view.composition-wizard', shape: 'stat', title: '体脂向导', wakeWord: '看体脂向导', run: viewCompositionWizard, example: 'calorie-cmd-read calorie.view.composition-wizard' },
  { kind: 'read', key: 'calorie.view.measure-wizard', shape: 'stat', title: '围度向导', wakeWord: '看围度向导', run: viewMeasureWizard, example: 'calorie-cmd-read calorie.view.measure-wizard' },
] satisfies readonly CommandSpec[];
