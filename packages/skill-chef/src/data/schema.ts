/** #963 · 私家大厨目录命令的实现：`chef.data.schema` 的 `run`。
 *
 * 干什么：用允许清单（`./tables.ts`）经公共层目录读取件（`readDataSchema`）
 * 现读各表的列与类型，装成 `shape: resultset` 的一份结果（单项，`{ ok: true, tables }`）。
 * 校验用的目录与返回的目录是同一份——两处都走 `readDataSchema`（引擎命令复用同一件）。
 *
 * 不产任何文件：回 `{ results }`（无模板），入口据此走文本态，不落盘；
 * 不读参数（目录无参数）；库以既有开库句柄里的 `db` 跑 `PRAGMA`，
 * 不建表、不迁移、不写库（`openChefDb` 的 DDL 自愈是既有开库行为，本命令不另写）。
 * 缺表即抛（点名那张表）：目录语义是“表在、列在”，缺表是坏库，不是空集。
 */
import { readDataSchema } from 'base-link-core';
import type { ChefDb } from '../fetch/db.js';
import { CHEF_DATA_TABLES } from './tables.js';

export function runDataSchema(handle: ChefDb, _params: Record<string, unknown>): unknown {
  const tables = readDataSchema(handle.db, CHEF_DATA_TABLES);
  return {
    results: [
      {
        ok: true,
        tables: tables.map((t) => ({
          table: t.table,
          fields: t.fields.map((f) => ({ name: f.name, type: f.type })),
        })),
      },
    ],
  };
}
