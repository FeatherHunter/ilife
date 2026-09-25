/** #962 · 数据族的命令声明（**权威源**，`docs/agents/数据族-规格.md` §二）。
 *
 * 加一条数据族命令＝只改这个文件＋它那个子功能文件；`cli/` 里的索引与分派层一行不动
 * （命令登记纪律 形状一）。本族命令一律 `surface: 'program'`（只给程序用：
 * 不进技能说明面速查表、不进唤醒词路由，故无 `wakeWord`、无 `flows`、
 * 无 `src/data/routes.ts` 里的路由记录；程序面命令不许有唤醒词路由，生成器 fail-closed）。
 *
 * 目录名说明：`data` 取自数据族规格对命令面的分族名（数据族／视图族／写族），
 * HELP 一级分组里没有这一族——程序面命令本来就不进 HELP，故此处以规格为命名出处。
 */
import type { HomeCommandSpec } from '../shared/commandSpec.js';
import { runDataSchema } from './schema.js';
import { runDataQuery } from './query.js';

export const DATA_COMMANDS = [
  { kind: 'read', key: 'home.data.schema', shape: 'resultset', title: '数据目录', surface: 'program', run: runDataSchema, example: 'home-cmd-read home.data.schema' },
  { kind: 'read', key: 'home.data.query', shape: 'resultset', title: '数据查询', surface: 'program', run: runDataQuery, example: 'home-cmd-read home.data.query --params \'{"queries":[{"from":"items","select":["name"],"orderBy":[{"field":"name","dir":"asc"}]}]}\'' },
] satisfies readonly HomeCommandSpec[];
