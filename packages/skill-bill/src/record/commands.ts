/** 记账写入域的命令声明（**权威源**，两条）。
 *
 * 每条声明五件事：命令名／形状／标题（用户看到的中文名）／可执行示例／处理函数。
 *   - 代表唤醒词**不在这里**（#721 撤）：按 `key` 从写入域声明（`src/record/declaration.ts`）算，
 *     算法与判据见 `src/triggers/wakeTable.ts` 的 `projectWakeWord`；
 *   - 可执行示例**照抄即能跑**（两条都在本机空库上真跑过，退出码 0）；
 *     「改记录」那条取「缺 id 出采集页」这一支，因为在空库上它不需要先有记录就能跑通；
 *     带 `id` 的改写那一支要库里先有该 id，交不出「照抄即能跑」。
 *
 * 本票只这两条：13 条 `record.add` 的字段矩阵与 8 条特殊收支的确认页是后票的事，这里不铺。
 * 加一条命令＝只改这个文件＋它那个子功能文件；`src/cli/registry.ts` 与 `src/cli/cmd_read.ts` 一行不动。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { writeRecordAdd, writeRecordUpdate } from './write.js';

export const RECORD_COMMANDS = [
  {
    kind: 'write',
    key: 'bill.record.add',
    shape: 'receipt',
    title: '记一笔',
    example: 'bill-cmd-read bill.record.add --params \'{"category":"餐饮","amount":-12.5,"time":"2026-09-14 12:00:00","account":"支付宝","ledger":"生活"}\'',
    run: writeRecordAdd,
  },
  {
    kind: 'write',
    key: 'bill.record.update',
    shape: 'receipt',
    title: '改记录',
    example: 'bill-cmd-read bill.record.update --params \'{"note":"改过"}\'',
    run: writeRecordUpdate,
  },
] satisfies readonly CommandSpec[];
