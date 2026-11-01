/** #961 · 数据族的命令声明（**权威源**，`docs/agents/数据族-规格.md` §二）。
 *
 * 加一条数据族命令＝只改这个文件＋它那个子功能文件；`cli/` 里的索引与分派层一行不动
 * （命令登记纪律 形状一）。本族命令一律 `surface: 'program'`（只给程序用：
 * 不进技能说明面速查表、不进唤醒词路由，见 #953），故无 `src/data/routes.ts` 实路由
 * （空数组占位，生成器 fail-closed）。
 *
 * `wakeWord` 是占位（生成器要求非空；程序面键由 `wakeWordGate` 豁免，不进路由）；
 * `example` 照抄即能跑（含命令名，生成期校验）。
 *
 * 目录名说明（结构纪律 铁律四 tension，已记录）：`data` 取自数据族规格对命令面的分族名
 * （数据族／视图族／写族），HELP 一级分组里没有这一族——程序面命令本来就不进 HELP，
 * 故此处以规格为命名出处，不以 HELP 为出处（同卡路里 `src/data/commands.ts`）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { runDataSchema } from './schema.js';
import { runDataQuery } from './query.js';
import { m } from '../entries/index.js';

/** 数据族命令表（按调用重建）。#1197：标题随语言取值，故整张表搬进函数体；
 *  `DATA_COMMANDS` 仍是模块加载期那一份 zh 快照（生成的 `cli/registry.ts` 只拿它做分派索引）。
 *  程序面键的 `wakeWord` 本就只是占位（`wakeWordGate` 豁免），保持原样不译。 */
function dataCommands(): readonly CommandSpec[] {
  return [
    { kind: 'read', key: 'schedule.data.schema', shape: 'resultset', title: m('skill-schedule.data-commands.c001'), wakeWord: m('skill-schedule.data-commands.c002'), surface: 'program', run: runDataSchema, example: 'schedule-cmd-read schedule.data.schema' },
    { kind: 'read', key: 'schedule.data.query', shape: 'resultset', title: m('skill-schedule.data-commands.c003'), wakeWord: m('skill-schedule.data-commands.c004'), surface: 'program', run: runDataQuery, example: 'schedule-cmd-read schedule.data.query --params \'{"queries":[{"from":"schedule_records","select":["date","activity"],"orderBy":[{"field":"date","dir":"asc"}]}]}\'' },
  ];
}

export const DATA_COMMANDS = dataCommands();
