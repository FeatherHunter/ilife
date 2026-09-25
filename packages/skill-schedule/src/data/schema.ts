/** #961 · 作息目录命令的实现：`schedule.data.schema` 的 `run`。
 *
 * 干什么：用允许清单（`./tables.ts`）经公共层目录读取件（`readDataSchema`）
 * 现读各表的列与类型，装成 `shape: resultset` 的一份结果（单项，`{ ok: true, tables }`）。
 * 校验用的目录与返回的目录是同一份——两处都走 `readDataSchema`（引擎命令复用同一件）。
 *
 * 不产任何文件：回 `html: ''`＋`delivery: false`（无模板），出口据此不落盘；
 * 不读参数（目录无参数）；执行期不写库（只跑 `PRAGMA table_info`）。
 */
import { readDataSchema } from 'base-link-core';
import type { ViewOut } from '../shared/commandSpec.js';
import type { ScheduleDb } from '../fetch/db.js';
import { SCHEDULE_DATA_TABLES } from './tables.js';

export function runDataSchema(_params: Record<string, unknown>, handle: ScheduleDb): ViewOut {
  const tables = readDataSchema(handle.db, SCHEDULE_DATA_TABLES);
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
    delivery: false,
  };
}
