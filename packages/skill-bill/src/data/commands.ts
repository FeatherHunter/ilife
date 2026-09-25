/** #960 · 数据族的命令声明（**权威源**，`docs/agents/数据族-规格.md` §二）。
 *
 * 加一条数据族命令＝只改这个文件＋它那个子功能文件；`cli/` 里的索引与分派层一行不动
 * （命令登记纪律 形状一）。本族命令一律 `surface: 'program'`（只给程序用：
 * 不进技能说明面速查表、不进唤醒词路由，见 #953），故无唤醒词、无 `flows`、
 * 无 `src/data/routes.ts`（程序面命令不许有唤醒词路由，生成器 fail-closed）。
 *
 * 目录名说明（结构纪律 铁律四 tension，已记录）：`data` 取自分族名
 * （数据族／视图族／写族），HELP 一级分组里没有这一族——程序面命令本来就不进 HELP，
 * 故此处以规格为命名出处，不以 HELP 为出处（与卡路里 `src/data` 同形）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { runDataSchema } from './schema.js';
import { runDataQuery } from './query.js';

export const DATA_COMMANDS = [
  { kind: 'read', key: 'bill.data.schema', shape: 'resultset', title: '数据目录', surface: 'program', run: runDataSchema, example: 'bill-cmd-read bill.data.schema' },
  { kind: 'read', key: 'bill.data.query', shape: 'resultset', title: '数据查询', surface: 'program', run: runDataQuery, example: 'bill-cmd-read bill.data.query --params \'{"queries":[{"from":"bills","select":["time","amount"],"orderBy":[{"field":"time","dir":"asc"}]}]}\'' },
] satisfies readonly CommandSpec[];
