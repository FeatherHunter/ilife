/** #954 · 卡路里目录命令的实现：`calorie.data.schema` 的 `run`。
 *
 * 干什么：用允许清单（`./tables.ts`）经公共层目录读取件（`readDataSchema`）
 * 现读各表的列与类型，装成 `shape: resultset` 的一份结果（单项，`{ ok: true, tables }`）。
 * 校验用的目录与返回的目录是同一份——两处都走 `readDataSchema`（后续引擎命令复用同一件）。
 *
 * 不产任何文件：回 `html: ''`（无模板），分派层据此走文本态（`delivery.ts`），不落盘；
 * 不读参数（目录无参数）；库以只读方式打开（`cmd_read.ts` 既有行为：读命令走 `openDbReadOnly`）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { readDataSchema } from 'base-link-core';
import type { ViewOut } from '../shared/commandSpec.js';
import { CALORIE_DATA_TABLES } from './tables.js';

export function runDataSchema(_params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const tables = readDataSchema(db, CALORIE_DATA_TABLES);
  return {
    data: {
      results: [
        {
          ok: true,
          tables: tables.map((t) => ({
            table: t.table,
            fields: t.fields.map((f) => ({ name: f.name, type: f.type })),
          })),
        },
      ],
    },
    html: '',
  };
}
