/** 分析与洞察的命令声明（**权威源**，一条：作息对比，覆盖两月对比／类别深挖／异常检测）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 的索引与分派层一行不动（Layer2 落定）。
 * 处理函数住 `./handlers.ts`（与声明同一目录）；`cli/` 只认生成的 `registry.ts`。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewRecordCompare } from './handlers.js';

export const ANALYZE_COMMANDS = [
  { kind: 'read', key: 'schedule.record.compare', shape: 'analysis', title: '作息对比', wakeWord: '对比两个月', run: viewRecordCompare, example: 'schedule-cmd-read schedule.record.compare --params \'{"kind":"months"}\'' },
] satisfies readonly CommandSpec[];
