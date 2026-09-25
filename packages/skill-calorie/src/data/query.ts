/** #955 · 卡路里引擎命令的实现：`calorie.data.query` 的 `run`。#956 加连接一支。#957 加分组聚合一支。
 *
 * 干什么：把整份 `--params`（`{ queries: [...] }`）经公共层引擎件
 * （`executeDataQueries`：查询单解析、目录校验、结果集装配）跑成
 * `shape: resultset` 的结果集（与请求同序对应；坏项按项拒，好项照常）。
 * 单表（选字段、条件、排序）＋显式 `on` 两表连接（`join` 长度只许 1，
 * 结果字段可来自两表；`via` 预定义关联路径只留语法位，出现即按项拒）＋
 * 单表分组聚合（`groupBy`＋`agg` 成对出现，聚合列按 `as` 起名；`select` 与
 * `agg` 不可同存，`join` 与 `agg` 组合另票）；
 * `page` 由公共层按项拒并指去 #958，不静默忽略。
 *
 * 不产任何文件：回 `html: ''`（无模板），分派层据此走文本态（`delivery.ts`），不落盘；
 * 库以只读方式打开（`cmd_read.ts` 既有行为：读命令走 `openDbReadOnly`）。
 * 请求级非法（不是对象／`queries` 不是非空数组）抛 `bad-input`（exit 2）；
 * 单项问题不出错码，走项里的 `{ ok: false, error }`（exit 0）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { executeDataQueries, LinkCoreError } from 'base-link-core';
import type { ViewOut } from '../shared/commandSpec.js';
import { CalorieRenderError } from '../render/errors.js';
import { CALORIE_DATA_TABLES } from './tables.js';

export function runDataQuery(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  let results;
  try {
    results = executeDataQueries(db, CALORIE_DATA_TABLES, params);
  } catch (e) {
    if (e instanceof LinkCoreError) throw new CalorieRenderError('bad-input', e.message);
    throw e;
  }
  return {
    data: {
      results,
    },
    html: '',
  };
}
