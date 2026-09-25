/** #962 · 居家管家目录命令的实现：`home.data.schema` 的 `run`。
 *
 * 干什么：用允许清单（`./tables.ts`）经公共层目录读取件（`readDataSchema`）
 * 现读各表的列与类型，装成 `shape: resultset` 的一份结果（单项，`{ ok: true, tables }`）。
 * 校验用的目录与返回的目录是同一份——后续引擎命令复用同一件做目录校验。
 *
 * 不产任何文件：回数据对象（出口层对数据键走文本态直回 envelope，不进 HTML 交付链）；
 * 不读参数（目录无参数）；库以只读方式打开（出口层对数据键走只读打开，不建表、不迁移）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { readDataSchema } from 'base-link-core';
import type { HomeDb } from '../fetch/db.js';
import { HOME_DATA_TABLES } from './tables.js';

export function runDataSchema(
  _params: Record<string, unknown>,
  handle: HomeDb | DatabaseSync,
): { results: unknown[] } {
  const db = (handle as HomeDb).db ?? (handle as DatabaseSync);
  const tables = readDataSchema(db, HOME_DATA_TABLES);
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
