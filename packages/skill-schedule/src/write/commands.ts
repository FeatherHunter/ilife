/** 写入与同步的命令声明（**权威源**，一条：记作息）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 的索引与分派层一行不动。
 * 处理函数住 `./handlers.ts`（与声明同一目录）；`cli/` 只认生成的 `registry.ts`。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { writeRecord } from './handlers.js';

export const WRITE_COMMANDS = [
  { kind: 'write', key: 'schedule.record.write', title: '记作息', wakeWord: '记作息', run: writeRecord, example: 'schedule-cmd-read schedule.record.write --params \'{"op":"add"}\'' },
] satisfies readonly CommandSpec[];
