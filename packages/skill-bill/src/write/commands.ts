/** 记账写入域的命令声明（**权威源**，两条）。
 *
 * 每条声明五件事：命令名／形状／标题（用户看到的中文名）／可执行示例／处理函数。
 *   - 代表唤醒词**不在这里**（#721 撤）：按 `key` 从写入域声明（`src/write/declaration.ts`）算，
 *     算法与判据见 `src/triggers/wakeTable.ts` 的 `projectWakeWord`；
 *   - 可执行示例**照抄即能跑**（两条都在本机空库上真跑过，退出码 0）；
 *     「改记录」那条取「缺 id 出采集页」这一支，因为在空库上它不需要先有记录就能跑通；
 *     带 `id` 的改写那一支要库里先有该 id，交不出「照抄即能跑」。
 *
 * 本票只这两条：13 条 `record.add` 的字段矩阵与 8 条特殊收支的确认页是后票的事，这里不铺。
 * 加一条命令＝只改这个文件＋它那个子功能文件；`src/cli/registry.ts` 与 `src/cli/cmd_read.ts` 一行不动。
 *
 *  #1206 首切件（多语言文本外置）：标题与可执行示例不住这里，住 `../entries/zh.ts`（中文基准）
 *  与 `../entries/en.ts`（英文列）；`recordCommands(language)` 按语言取值（不给＝`zh`，
 *  与改造前逐字节相同）。两条例句 en 与 zh 同值：示例含可运行的中文样例数据，译了就跑不通。
 */
import { resolve } from 'base-entries';
import { SKILL_BILL_CATALOG } from '../entries/index.js';
import { writeRecordAdd, writeRecordUpdate } from './write.js';

/** 两条写命令的声明（按语言取值；`RECORD_COMMANDS` 是 `zh` 那一份，保持既有形状）。
 *  判别位（kind／key／shape）保持字面量推断：`run` 的联合调用才能收窄到 `WriteOut`
 * （`src/write/index.ts` 的 `runRecordWrite` 依赖这一条；拓宽成 `CommandSpec[]` 即红）。 */
export function recordCommands(language: string = 'zh') {
  return [
    {
      kind: 'write' as const,
      key: 'bill.record.add' as const,
      shape: 'receipt' as const,
      title: resolve(SKILL_BILL_CATALOG, language, 'command.record-add.title'),
      example: resolve(SKILL_BILL_CATALOG, language, 'command.record-add.example'),
      run: writeRecordAdd,
    },
    {
      kind: 'write' as const,
      key: 'bill.record.update' as const,
      shape: 'receipt' as const,
      title: resolve(SKILL_BILL_CATALOG, language, 'command.record-update.title'),
      example: resolve(SKILL_BILL_CATALOG, language, 'command.record-update.example'),
      run: writeRecordUpdate,
    },
  ];
}

export const RECORD_COMMANDS = recordCommands('zh');
