/**
 * #954 · 数据族目录读取件：列与类型运行时现读，不维护第二份清单。
 *
 * 住公共层（`base-link-core`）的理由：`docs/agents/数据族-规格.md` §六——
 * 查询单解析、目录校验、结果集装配住公共层；表清单住各技能自己的包。
 * 目录命令返回的目录与（后续引擎命令做）校验用的目录是同一份：
 * 两处都调这里的 `readDataSchema`，不会两处漂移。
 *
 * 零运行时依赖：不 import `node:sqlite`；库句柄只按形状收
 * （`DataSchemaDb`：有 `prepare(sql).all()` 即可，`DatabaseSync` 按形状相容）。
 * 类型上写得出具体形状：无 `any`，未知行先收窄再读。
 */
import { LinkCoreError } from './errors.js';

/** 列：名与 SQLite 声明类型原文（`PRAGMA table_info` 的 `name`／`type`）。
 *  将来若统一成中性名（非 TEXT／REAL），另票（#954 遗留出口），本形状名不动。 */
export interface DataColumn {
  readonly name: string;
  readonly type: string;
}

/** 一张表在目录里的样子：表名 ＋ 按 `cid` 顺序的列。 */
export interface DataTableSchema {
  readonly table: string;
  readonly fields: readonly DataColumn[];
}

/** 库句柄的最小形状：只用到 `prepare(sql).all()`。 */
export interface DataSchemaDb {
  prepare(sql: string): { all(): unknown[] };
}

function assertTableName(table: unknown): asserts table is string {
  if (typeof table !== 'string' || table.length === 0) {
    throw new LinkCoreError('DATA_SCHEMA_INVALID', '表名须为非空字符串：' + String(table));
  }
}

function assertPragmaRow(row: unknown): asserts row is { name: unknown; type: unknown; cid: unknown } {
  if (typeof row !== 'object' || row === null) {
    throw new LinkCoreError('DATA_SCHEMA_INVALID', 'PRAGMA table_info 行须为对象');
  }
}

/** 把表名拼进 `PRAGMA table_info("…")`：双引号转义后包起来（表名来自各家允许清单，仍不裸拼）。 */
function pragmaSql(table: string): string {
  return 'PRAGMA table_info("' + table.replace(/"/g, '""') + '")';
}

/**
 * 现读目录：对允许清单里的每张表跑 `PRAGMA table_info`，按 `cid` 顺序回列的名与类型。
 * 顺序与传入的允许清单同序（调用方断言“逐条一致”时有确定性可比）。
 *
 * 只读：只跑 `PRAGMA`，不建表、不迁移、不写库。
 * 表不存在（`PRAGMA` 回空）即抛（点名那张表）：目录命令的语义是“表在、列在”，
 * 缺表是坏库，不是空集（空集指行数为 0，见规格 §一④）。
 */
export function readDataSchema(db: DataSchemaDb, tables: readonly string[]): DataTableSchema[] {
  const out: DataTableSchema[] = [];
  for (const table of tables) {
    assertTableName(table);
    const rows = db.prepare(pragmaSql(table)).all();
    if (rows.length === 0) {
      throw new LinkCoreError('DATA_SCHEMA_INVALID', '目录表不存在：' + table);
    }
    const cols: { cid: number; name: string; type: string }[] = [];
    for (const row of rows) {
      assertPragmaRow(row);
      if (typeof row.name !== 'string' || row.name.length === 0) {
        throw new LinkCoreError('DATA_SCHEMA_INVALID', table + ' 的列名非法：' + String(row.name));
      }
      if (typeof row.type !== 'string') {
        throw new LinkCoreError('DATA_SCHEMA_INVALID', table + '.' + row.name + ' 的列类型非法');
      }
      if (typeof row.cid !== 'number') {
        throw new LinkCoreError('DATA_SCHEMA_INVALID', table + '.' + row.name + ' 的列序号非法');
      }
      cols.push({ cid: row.cid, name: row.name, type: row.type });
    }
    cols.sort((a, b) => a.cid - b.cid);
    out.push({ table, fields: cols.map((c) => ({ name: c.name, type: c.type })) });
  }
  return out;
}
