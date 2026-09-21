/** 分析与洞察的命令声明（**权威源**，一条：作息对比，覆盖两月对比／类别深挖／异常检测）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 的索引与分派层一行不动（Layer2 落定）。
 * `run` 当前为未接线桩（Layer2 换真实现并翻转分派；桩 fail-closed，误调即响亮失败）。
 */
import type { CommandSpec, ViewHandler } from '../shared/commandSpec.js';

const unwired = (key: string): ViewHandler => (() => {
  throw new Error('未接线（Layer2 落定）: ' + key);
});

export const ANALYZE_COMMANDS = [
  { kind: 'read', key: 'schedule.record.compare', shape: 'analysis', title: '作息对比', wakeWord: '对比两个月', run: unwired('schedule.record.compare'), example: 'schedule-cmd-read schedule.record.compare --params \'{"kind":"months"}\'' },
] satisfies readonly CommandSpec[];
