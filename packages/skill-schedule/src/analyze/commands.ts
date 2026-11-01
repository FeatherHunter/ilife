/** 分析与洞察的命令声明（**权威源**，一条：作息对比，覆盖两月对比／类别深挖／异常检测）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 的索引与分派层一行不动（Layer2 落定）。
 * 处理函数住 `./handlers.ts`（与声明同一目录）；`cli/` 只认生成的 `registry.ts`。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewRecordCompare } from './handlers.js';
import { m } from '../entries/index.js';

/** 一条分析与洞察命令的声明（按调用重建）。#1197：标题随语言取值，故整张表搬进函数体；
 *  `ANALYZE_COMMANDS` 仍是模块加载期那一份 zh 快照（生成的 `cli/registry.ts` 只拿它做分派索引）。
 *  唤醒词与可执行示例是数据位（§4.9／ADR-0004）：唤醒词是路由键、示例含可运行的中文样例数据。 */
function analyzeCommands(): readonly CommandSpec[] {
  return [
    { kind: 'read', key: 'schedule.record.compare', shape: 'analysis', title: m('skill-schedule.analyze-commands.c001'), wakeWord: m('skill-schedule.analyze-commands.c002'), run: viewRecordCompare, example: 'schedule-cmd-read schedule.record.compare --params \'{"kind":"months"}\'' },
  ];
}

export const ANALYZE_COMMANDS = analyzeCommands();
