/** #962 · 居家管家引擎命令的实现：`home.data.query` 的 `run`。
 *
 * 干什么：把整份 `--params`（`{ queries: [...] }`）经公共层引擎件
 * （`executeDataQueries`：查询单解析、目录校验、结果集装配）跑成
 * `shape: resultset` 的结果集（与请求同序对应；坏项按项拒，好项照常）。
 * 单表（选字段、条件、排序）＋显式 `on` 两表连接（`join` 长度只许 1，
 * 结果字段可来自两表；`via` 预定义关联路径只留语法位，出现即按项拒）＋
 * 单表分组聚合（`groupBy`＋`agg` 成对出现，聚合列按 `as` 起名；`select` 与
 * `agg` 不可同存，`join` 与 `agg` 组合另票）＋分页续取（`page.size／page.next`，
 * 行走游标、聚合走偏移）＋批量（`queries` 同序容器，坏项按项拒）。
 *
 * 不产任何文件：回数据对象（出口层对数据键走文本态直回 envelope，不进 HTML 交付链）；
 * 库以只读方式打开（出口层对数据键走只读打开，不建表、不迁移）。
 * 请求级非法（不是对象／`queries` 不是非空数组）抛 `HomePolicyError`
 * （出口层归 exit 2，与卡路里 `bad-input` 同档）；单项问题不出错码，
 * 走项里的 `{ ok: false, error }`（exit 0）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { executeDataQueries, LinkCoreError } from 'base-link-core';
import type { HomeDb } from '../fetch/db.js';
import { HomePolicyError } from '../fetch/errors.js';
import { HOME_DATA_TABLES } from './tables.js';

export function runDataQuery(
  params: Record<string, unknown>,
  handle: HomeDb | DatabaseSync,
): { results: unknown[] } {
  const db = (handle as HomeDb).db ?? (handle as DatabaseSync);
  let results;
  try {
    results = executeDataQueries(db, HOME_DATA_TABLES, params);
  } catch (e) {
    if (e instanceof LinkCoreError) throw new HomePolicyError('POLICY_BAD_INPUT', e.message);
    throw e;
  }
  return {
    results,
  };
}
