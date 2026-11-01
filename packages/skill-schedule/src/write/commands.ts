/** 写入与同步的命令声明（**权威源**，一条：记作息）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 的索引与分派层一行不动。
 * 处理函数住 `./handlers.ts`（与声明同一目录）；`cli/` 只认生成的 `registry.ts`。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { writeRecord } from './handlers.js';
import { m } from '../entries/index.js';

/** 一条写入与同步命令的声明（按调用重建）。#1197：标题随语言取值，故整张表搬进函数体；
 *  `WRITE_COMMANDS` 仍是模块加载期那一份 zh 快照（生成的 `cli/registry.ts` 只拿它做分派索引）。
 *  唤醒词与可执行示例是数据位（§4.9／ADR-0004）。 */
function writeCommands(): readonly CommandSpec[] {
  return [
    { kind: 'write', key: 'schedule.record.write', title: m('skill-schedule.write-commands.c001'), wakeWord: m('skill-schedule.write-commands.c002'), run: writeRecord, example: 'schedule-cmd-read schedule.record.write --params \'{"op":"add"}\'' },
  ];
}

export const WRITE_COMMANDS = writeCommands();
