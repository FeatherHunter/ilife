/** #960 · 饼干记账引擎命令的实现：`bill.data.query` 的 `run`。
 *
 * 干什么：把整份 `--params`（`{ queries: [...] }`）经公共层引擎件
 * （`executeDataQueries`：查询单解析、目录校验、结果集装配）跑成
 * `shape: resultset` 的结果集（与请求同序对应；坏项按项拒，好项照常）。
 * 本家只有 1 张表，故只走单表取行（选字段、条件、排序）与单表分组聚合
 * （`groupBy`＋`agg` 成对出现，聚合列按 `as` 起名）两支；`join` 需两张表，
 * 在本家恒为非法表名按项拒（不断言连接语义）；`page` 走公共层分页续取。
 *
 * 不产任何文件：回 `html: ''`（无模板），分派层据此走文本态，不落盘；
 * 库只读（取数层只跑 `SELECT` 与 `PRAGMA`，不写库）。
 * 请求级非法（不是对象／`queries` 不是非空数组）转 `POLICY_BAD_INPUT`
 * （出口 exit 2，与既有读命令的坏输入同档）；单项问题不出错码，
 * 走项里的 `{ ok: false, error }`（exit 0）。
 */
import { executeDataQueries, LinkCoreError } from 'base-link-core';
import type { BillDb } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { BILL_DATA_TABLES } from './tables.js';

export function runDataQuery(params: Record<string, unknown>, db: BillDb): ViewOut {
  let results;
  try {
    results = executeDataQueries(db.db, BILL_DATA_TABLES, params);
  } catch (e) {
    if (e instanceof LinkCoreError) throw new BillPolicyError('POLICY_BAD_INPUT', e.message);
    throw e;
  }
  return {
    data: {
      results,
    },
    html: '',
  };
}
