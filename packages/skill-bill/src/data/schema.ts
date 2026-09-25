/** #960 · 饼干记账目录命令的实现：`bill.data.schema` 的 `run`。
 *
 * 干什么：用允许清单（`./tables.ts`）经公共层目录读取件（`readDataSchema`）
 * 现读各表的列与类型，装成 `shape: resultset` 的一份结果（单项，`{ ok: true, tables }`）。
 * 校验用的目录与返回的目录是同一份——两处都走 `readDataSchema`（引擎命令复用同一件）。
 *
 * 不产任何文件：回 `html: ''`（无模板），分派层据此走文本态，不落盘；
 * 不读参数（目录无参数）；库以只读方式打开之后的句柄里取 `db` 跑 `PRAGMA`，
 * 不建表、不迁移、不写库（`openBillDb` 的 DDL 自愈是既有开库行为，本命令不另写）。
 */
import { readDataSchema } from 'base-link-core';
import type { BillDb } from '../fetch/db.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { BILL_DATA_TABLES } from './tables.js';

export function runDataSchema(_params: Record<string, unknown>, db: BillDb): ViewOut {
  const tables = readDataSchema(db.db, BILL_DATA_TABLES);
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
