/** #961 · 作息引擎命令的实现：`schedule.data.query` 的 `run`。
 *
 * 干什么：把整份 `--params`（`{ queries: [...] }`）经公共层引擎件
 * （`executeDataQueries`：查询单解析、目录校验、结果集装配）跑成
 * `shape: resultset` 的结果集（与请求同序对应；坏项按项拒，好项照常）。
 * 单表（选字段、条件、排序）＋显式 `on` 两表连接（`join` 长度只许 1，
 * 结果字段可来自两表；`via` 预定义关联路径只留语法位，出现即按项拒）＋
 * 单表分组聚合（`groupBy`＋`agg` 成对出现，聚合列按 `as` 起名；`select` 与
 * `agg` 不可同存，`join` 与 `agg` 组合另票）＋分页续取（`page.size`＋`next`
 * 不透明凭据，行走游标、聚合走偏移）；批量容器同序对应、单项失败不毁整批。
 *
 * 不产任何文件：回 `html: ''`＋`delivery: false`（无模板），出口据此不落盘；
 * 执行期不写库（只跑 `SELECT` 与 `PRAGMA`）。
 * 请求级非法（不是对象／`queries` 不是非空数组）抛 `POLICY_BAD_INPUT`（exit 2）；
 * 单项问题不出错码，走项里的 `{ ok: false, error }`（exit 0）。
 */
import { executeDataQueries, LinkCoreError } from 'base-link-core';
import type { ViewOut } from '../shared/commandSpec.js';
import type { ScheduleDb } from '../fetch/db.js';
import { SchedulePolicyError } from '../fetch/errors.js';
import { SCHEDULE_DATA_TABLES } from './tables.js';

export function runDataQuery(params: Record<string, unknown>, handle: ScheduleDb): ViewOut {
  let results;
  try {
    results = executeDataQueries(handle.db, SCHEDULE_DATA_TABLES, params);
  } catch (e) {
    if (e instanceof LinkCoreError) throw new SchedulePolicyError('POLICY_BAD_INPUT', e.message);
    throw e;
  }
  return {
    data: {
      results,
    },
    html: '',
    delivery: false,
  };
}
