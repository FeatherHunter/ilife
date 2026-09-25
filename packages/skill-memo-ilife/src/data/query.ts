/** #964 · 备忘录引擎命令的实现：`memo.data.query` 的 `run`。
 *
 * 干什么：把整份 `--params`（`{ queries: [...] }`）经公共层引擎件
 * （`executeDataQueries`：查询单解析、目录校验、结果集装配）跑成
 * `shape: resultset` 的结果集（与请求同序对应；坏项按项拒，好项照常）。
 * 单表（选字段、条件、排序）＋显式 `on` 两表连接＋单表分组聚合＋分页续取＋批量，
 * 与卡路里样板（#955–#959）同一份公共层容器，不在本家另写分支。
 *
 * 不产任何文件：只回 `data`，不带 `deliver`（出口据此不落盘）；
 * 库沿既有接线（`openMemoDb`：文件缺席即抛，不新建空库冒充有数据）；
 * 请求级非法（不是对象／`queries` 不是非空数组）抛 `POLICY_BAD_INPUT`（出口 exit 2）；
 * 单项问题不出错码，走项里的 `{ ok: false, error }`（exit 0）。
 */
import { executeDataQueries, LinkCoreError } from 'base-link-core';
import type { CommandOut } from '../shared/commandSpec.js';
import type { MemoDb } from '../db/readonly.js';
import { MemoPolicyError } from '../shared/errors.js';
import { MEMO_DATA_TABLES } from './tables.js';

export function runDataQuery(params: Record<string, unknown>, db: MemoDb): CommandOut {
  let results;
  try {
    results = executeDataQueries(db.conn, MEMO_DATA_TABLES, params);
  } catch (e) {
    if (e instanceof LinkCoreError) throw new MemoPolicyError('POLICY_BAD_INPUT', e.message);
    throw e;
  }
  return {
    data: {
      results,
    },
    exit: 0,
  };
}
