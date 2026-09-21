/** 日程与计划的命令声明（**权威源**，一条：写计划，覆盖补／改／删／复盘／商量／同步）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 的索引与分派层一行不动（Layer2 落定）。
 * `run` 当前为未接线桩（Layer2 换真实现并翻转分派；桩 fail-closed，误调即响亮失败）。
 */
import type { CommandSpec, WriteHandler } from '../shared/commandSpec.js';

const unwired = (key: string): WriteHandler => (() => {
  throw new Error('未接线（Layer2 落定）: ' + key);
});

export const PLAN_COMMANDS = [
  { kind: 'write', key: 'schedule.plan.write', title: '写计划', wakeWord: '补计划', run: unwired('schedule.plan.write'), example: 'schedule-cmd-read schedule.plan.write --params \'{"op":"ensure","date":"2026-09-01","time_start":"09:00","time_end":"10:00","title":"晨会"}\'' },
] satisfies readonly CommandSpec[];
