/** #963 · 私家大厨引擎命令的实现：`chef.data.query` 的 `run`。
 *
 * 干什么：把整份 `--params`（`{ queries: [...] }`）经公共层引擎件
 * （`executeDataQueries`：查询单解析、目录校验、结果集装配）跑成
 * `shape: resultset` 的结果集（与请求同序对应；坏项按项拒，好项照常）。
 * 单表取行（选字段、条件、排序）＋显式 `on` 两表连接（`join` 长度只许 1，
 * 结果字段可来自两表；`via` 预定义关联路径只留语法位，出现即按项拒）＋
 * 分组聚合（`groupBy`＋`agg` 成对出现，聚合列按 `as` 起名）；
 * `page` 走公共层分页续取（行走游标、聚合走偏移，`total` 为全量，末页无凭据）。
 *
 * 函数名带 `Chef` 前缀的理由：本目录已有 `runDataQuery(handle, params, kind)`
 *（`./run-query.ts`：`chef.history.query` 的 quality／backup 两路，历史域借道本域），
 * 同名即在能力门（`./index.ts`）里撞车。旧件是历史借道，新件是数据族引擎，
 * 改旧件名会动存量接线（`cmd_read.ts`＋`fetch/index.ts`），故新件另名，旧件不动。
 *
 * 不产任何文件：回 `{ results }`（无模板），入口据此走文本态，不落盘；
 * 库只读（引擎只跑 `SELECT` 与 `PRAGMA`，不写库；`openChefDb` 的 DDL 自愈是既有开库行为）。
 * 请求级非法（不是对象／`queries` 不是非空数组）转 `POLICY_BAD_INPUT`
 * （出口 exit 2，与既有读命令的坏输入同档）；单项问题不出错码，
 * 走项里的 `{ ok: false, error }`（exit 0）。
 */
import { executeDataQueries, LinkCoreError } from 'base-link-core';
import type { ChefDb } from '../fetch/db.js';
import { ChefPolicyError } from '../fetch/errors.js';
import { CHEF_DATA_TABLES } from './tables.js';

export function runChefDataQuery(handle: ChefDb, params: Record<string, unknown>): unknown {
  let results;
  try {
    results = executeDataQueries(handle.db, CHEF_DATA_TABLES, params);
  } catch (e) {
    if (e instanceof LinkCoreError) throw new ChefPolicyError('POLICY_BAD_INPUT', e.message);
    throw e;
  }
  return {
    results,
  };
}
