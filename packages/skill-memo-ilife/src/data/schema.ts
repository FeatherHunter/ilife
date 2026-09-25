/** #964 · 备忘录目录命令的实现：`memo.data.schema` 的 `run`。
 *
 * 干什么：用允许清单（`./tables.ts`）经公共层目录读取件（`readDataSchema`）
 * 现读各表的列与类型，装成 `shape: resultset` 的一份结果（单项，`{ ok: true, tables }`）。
 * 校验用的目录与返回的目录是同一份——两处都走 `readDataSchema`（引擎命令复用同一件）。
 *
 * 不产任何文件：只回 `data`，不带 `deliver`（出口据此不落盘）；
 * 不读参数（目录无参数）；库沿既有接线（`openMemoDb`：文件缺席即抛，不新建空库冒充有数据）。
 */
import { readDataSchema } from 'base-link-core';
import type { CommandOut } from '../shared/commandSpec.js';
import type { MemoDb } from '../db/readonly.js';
import { MEMO_DATA_TABLES } from './tables.js';

export function runDataSchema(_params: Record<string, unknown>, db: MemoDb): CommandOut {
  const tables = readDataSchema(db.conn, MEMO_DATA_TABLES);
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
    exit: 0,
  };
}
