/** 辅助与管理的命令声明（**权威源**，一条：作息管家帮助）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 的索引与分派层一行不动（Layer2 落定）。
 * `run` 当前为未接线桩（Layer2 换真实现并翻转分派；桩 fail-closed，误调即响亮失败）。
 */
import type { CommandSpec, ViewHandler } from '../shared/commandSpec.js';

const unwired = (key: string): ViewHandler => (() => {
  throw new Error('未接线（Layer2 落定）: ' + key);
});

export const ADMIN_COMMANDS = [
  { kind: 'read', key: 'schedule.help.lookup', shape: 'list', title: '作息管家帮助', wakeWord: '作息管家 HELP', run: unwired('schedule.help.lookup'), example: 'schedule-cmd-read schedule.help.lookup' },
] satisfies readonly CommandSpec[];
