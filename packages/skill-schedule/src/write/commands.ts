/** 写入与同步的命令声明（**权威源**，一条：记作息）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 的索引与分派层一行不动（Layer2 落定）。
 * `run` 当前为未接线桩（Layer2 换真实现并翻转分派；桩 fail-closed，误调即响亮失败）。
 */
import type { CommandSpec, WriteHandler } from '../shared/commandSpec.js';

const unwired = (key: string): WriteHandler => (() => {
  throw new Error('未接线（Layer2 落定）: ' + key);
});

export const WRITE_COMMANDS = [
  { kind: 'write', key: 'schedule.record.write', title: '记作息', wakeWord: '记作息', run: unwired('schedule.record.write'), example: 'schedule-cmd-read schedule.record.write --params \'{"op":"add"}\'' },
] satisfies readonly CommandSpec[];
