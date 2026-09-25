/**
 * #955 · 数据族引擎最小路径：单表查询单的解析、目录校验与结果集装配。
 *
 * 住公共层（`base-link-core`）的理由：`docs/agents/数据族-规格.md` §六——
 * 查询单解析、目录校验、结果集装配住公共层；表清单住各技能自己的包。
 * 目录校验复用同一件 `readDataSchema`（与目录命令返回的是同一份，不会两处漂移）。
 *
 * 范围（tracer bullet）：单表取行（选字段、条件、排序）；空集合法；
 * 非法表名／非法字段按项拒并点名。连接、聚合、分页、批量语义各留后续票
 * （#956–#959）：本件遇到 `join`／`groupBy`／`agg`／`page` 即按项拒，
 * 指明去哪张后续票，不静默忽略。
 *
 * 零运行时依赖：只 import 同包的 `errors.js` 与 `data-schema.js`；
 * 库句柄只按形状收（`DataQueryDb`），`DatabaseSync` 按形状相容。
 * 类型上写得出具体形状：无 `any`，未知输入先收窄再读。
 * 只读：只跑 `SELECT` 与 `PRAGMA`，不建表、不迁移、不写库、不产文件。
 */
import { LinkCoreError } from './errors.js';
import { readDataSchema } from './data-schema.js';

/** 绑定参数只用这三种（布尔在装配时已转 0／1，不进绑定）。 */
export type DataQueryParam = string | number | null;

/** 库句柄的最小形状：只用到 `prepare(sql).all(...params)`。 */
export interface DataQueryDb {
  prepare(sql: string): { all(...params: DataQueryParam[]): unknown[] };
}

/** 叶子条件：字段＋操作符＋值（`isNull`／`isNotNull` 不带值，`in` 带数组）。 */
export interface DataCondition {
  readonly field: string;
  readonly op: string;
  readonly value?: DataQueryParam | readonly DataQueryParam[] | boolean;
}

/** 条件组：`and`／`or` 恰居其一，内含条件或嵌套组。 */
export interface DataWhereGroup {
  readonly and?: readonly DataQueryWhere[];
  readonly or?: readonly DataQueryWhere[];
}

/** 条件树：叶子或组（可嵌套）。 */
export type DataQueryWhere = DataCondition | DataWhereGroup;

/** 排序项：字段＋方向（`asc`／`desc`，大小写不敏感）。 */
export interface DataOrderBy {
  readonly field: string;
  readonly dir: string;
}

/** 单张查询单（最小路径）：表＋选列＋条件＋排序（`id` 原样回显）。 */
export interface DataQuery {
  readonly id?: string;
  readonly from: string;
  readonly select?: readonly string[];
  readonly where?: DataQueryWhere;
  readonly orderBy?: readonly DataOrderBy[];
}

/** 批量请求：查询单数组（与结果一一对应、同序，见规格 §四①）。 */
export interface DataQueriesRequest {
  readonly queries: readonly DataQuery[];
}

/** 结果列：名与 SQLite 声明类型原文（与目录命令同一份）。 */
export interface DataField {
  readonly name: string;
  readonly type: string;
}

/** 成功项：回显查询单，行以「列名→值」的对象给（含 `NULL` 即 `null`）。 */
export interface DataSuccessItem {
  readonly id?: string;
  readonly ok: true;
  readonly query: DataQuery;
  readonly fields: readonly DataField[];
  readonly rows: readonly Record<string, unknown>[];
  readonly total: number;
}

/** 失败项：坏项带错误、好项照常（单项失败不毁整批，见规格 §四②）。 */
export interface DataErrorItem {
  readonly id?: string;
  readonly ok: false;
  readonly query: unknown;
  readonly error: { readonly code: string; readonly message: string };
}

export type DataResultItem = DataSuccessItem | DataErrorItem;

const OPS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like', 'in', 'isNull', 'isNotNull'] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail(code: string, message: string): never {
  throw new LinkCoreError(code, message);
}

/** 标识符引用：`"` 转义后包起来（表名／列名已对目录校验过，仍不裸拼）。 */
function ident(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

function assertNoUnsupported(raw: Record<string, unknown>, from: string): void {
  if (raw['join'] !== undefined) {
    fail('DATA_QUERY_INVALID', from + ' 不支持 join（连接见后续票 #956，本票只做单表）');
  }
  if (raw['groupBy'] !== undefined || raw['agg'] !== undefined) {
    fail('DATA_QUERY_INVALID', from + ' 不支持 groupBy／agg（分组聚合见后续票 #957，本票只做行查询）');
  }
  if (raw['page'] !== undefined) {
    fail('DATA_QUERY_INVALID', from + ' 不支持 page（分页续取见后续票 #958，本票一次回全量）');
  }
}

function readId(raw: Record<string, unknown>): string | undefined {
  const id = raw['id'];
  if (id === undefined) return undefined;
  if (typeof id !== 'string') fail('DATA_QUERY_INVALID', '查询单 id 须为字符串');
  return id as string;
}

function readFrom(raw: Record<string, unknown>, allowTables: readonly string[]): string {
  const from = raw['from'];
  if (typeof from !== 'string' || from.length === 0) {
    fail('DATA_QUERY_INVALID', '查询单 from 须为非空字符串');
  }
  if (!allowTables.includes(from as string)) {
    fail('DATA_UNKNOWN_TABLE', '未知表：' + String(from) + '（允许：' + allowTables.join('／') + '）');
  }
  return from as string;
}

function readSelect(
  raw: Record<string, unknown>,
  from: string,
  cols: readonly { name: string; type: string }[],
): { name: string; type: string }[] {
  const colByName = new Map(cols.map((c) => [c.name, c]));
  const sel = raw['select'];
  if (sel === undefined) return cols.map((c) => ({ name: c.name, type: c.type }));
  if (!Array.isArray(sel) || sel.length === 0) {
    fail('DATA_QUERY_INVALID', from + ' 的 select 须为非空数组');
  }
  const out: { name: string; type: string }[] = [];
  const seen = new Set<string>();
  for (const name of sel as unknown[]) {
    if (typeof name !== 'string' || name.length === 0) {
      fail('DATA_QUERY_INVALID', from + ' 的 select 元素须为非空字符串');
    }
    const hit = colByName.get(name as string);
    if (!hit) fail('DATA_UNKNOWN_FIELD', '未知字段：' + from + '.' + String(name));
    if (seen.has(name as string)) fail('DATA_QUERY_INVALID', from + ' 的 select 字段重复：' + String(name));
    seen.add(name as string);
    out.push({ name: hit.name, type: hit.type });
  }
  return out;
}

function isScalar(v: unknown): v is string | number | boolean | null {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null;
}

function checkLeafValue(
  from: string,
  field: string,
  op: string,
  value: unknown,
  colType: string,
): void {
  if (op === 'isNull' || op === 'isNotNull') {
    if (value !== undefined) fail('DATA_QUERY_INVALID', from + '.' + field + ' 的 ' + op + ' 不带 value');
    return;
  }
  if (op === 'in') {
    if (!Array.isArray(value) || value.length === 0) {
      fail('DATA_QUERY_INVALID', from + '.' + field + ' 的 in 须为非空数组');
    }
    for (const v of value as unknown[]) {
      if (!isScalar(v)) fail('DATA_QUERY_INVALID', from + '.' + field + ' 的 in 元素须为字符串／数字／布尔／null');
    }
    return;
  }
  if (op === 'like') {
    if (typeof value !== 'string') {
      fail('DATA_QUERY_INVALID', from + '.' + field + ' 的 like 值须为字符串');
    }
    const t = colType.toUpperCase();
    if (!t.includes('TEXT') && !t.includes('CHAR') && !t.includes('CLOB')) {
      fail('DATA_QUERY_INVALID', from + '.' + field + ' 的 like 只支持文本列（该列类型 ' + colType + '）');
    }
    return;
  }
  if (op === 'eq' || op === 'ne') {
    if (!isScalar(value)) {
      fail('DATA_QUERY_INVALID', from + '.' + field + ' 的 ' + op + ' 值须为字符串／数字／布尔／null');
    }
    return;
  }
  if (value === null || value === undefined || typeof value === 'object' || typeof value === 'boolean') {
    fail('DATA_QUERY_INVALID', from + '.' + field + ' 的 ' + op + ' 值须为字符串／数字');
  }
}

function checkWhere(node: unknown, from: string, colByName: Map<string, string>): void {
  if (!isRecord(node)) fail('DATA_QUERY_INVALID', from + ' 的 where 须为对象');
  const rec = node as Record<string, unknown>;
  const hasAnd = rec['and'] !== undefined;
  const hasOr = rec['or'] !== undefined;
  if (hasAnd || hasOr) {
    if (hasAnd && hasOr) fail('DATA_QUERY_INVALID', from + ' 的 where 里 and 与 or 不可同层并存');
    const key = hasAnd ? 'and' : 'or';
    const list = rec[key] as unknown;
    if (!Array.isArray(list) || list.length === 0) {
      fail('DATA_QUERY_INVALID', from + ' 的 where.' + key + ' 须为非空数组');
    }
    for (const sub of list as unknown[]) checkWhere(sub, from, colByName);
    return;
  }
  const field = rec['field'];
  const op = rec['op'];
  if (typeof field !== 'string' || field.length === 0) {
    fail('DATA_QUERY_INVALID', from + ' 的条件 field 须为非空字符串');
  }
  const colType = colByName.get(field as string);
  if (!colType) fail('DATA_UNKNOWN_FIELD', '未知字段：' + from + '.' + String(field));
  if (typeof op !== 'string' || !(OPS as readonly string[]).includes(op as string)) {
    fail('DATA_QUERY_INVALID', from + '.' + String(field) + ' 的 op 非法：' + String(op) + '（允许：' + OPS.join('／') + '）');
  }
  checkLeafValue(from, field as string, op as string, rec['value'], colType as string);
}

function checkOrderBy(
  raw: Record<string, unknown>,
  from: string,
  colByName: Map<string, string>,
): { field: string; dir: 'ASC' | 'DESC' }[] {
  const ob = raw['orderBy'];
  if (ob === undefined) return [];
  if (!Array.isArray(ob) || ob.length === 0) {
    fail('DATA_QUERY_INVALID', from + ' 的 orderBy 须为非空数组');
  }
  const out: { field: string; dir: 'ASC' | 'DESC' }[] = [];
  for (const item of ob as unknown[]) {
    if (!isRecord(item)) fail('DATA_QUERY_INVALID', from + ' 的 orderBy 元素须为对象');
    const field = (item as Record<string, unknown>)['field'];
    const dir = (item as Record<string, unknown>)['dir'];
    if (typeof field !== 'string' || field.length === 0) {
      fail('DATA_QUERY_INVALID', from + ' 的 orderBy.field 须为非空字符串');
    }
    if (!colByName.has(field as string)) fail('DATA_UNKNOWN_FIELD', '未知字段：' + from + '.' + String(field));
    if (typeof dir !== 'string' || (dir.toLowerCase() !== 'asc' && dir.toLowerCase() !== 'desc')) {
      fail('DATA_QUERY_INVALID', from + '.' + String(field) + ' 的排序方向须为 asc／desc');
    }
    out.push({ field: field as string, dir: (dir as string).toLowerCase() === 'desc' ? 'DESC' : 'ASC' });
  }
  return out;
}

function toParam(v: DataQueryParam | boolean): DataQueryParam {
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

function buildLeaf(
  field: string,
  op: string,
  value: unknown,
): { sql: string; params: DataQueryParam[] } {
  const c = ident(field);
  if (op === 'isNull') return { sql: c + ' IS NULL', params: [] };
  if (op === 'isNotNull') return { sql: c + ' IS NOT NULL', params: [] };
  if (op === 'in') {
    const list = value as readonly (DataQueryParam | boolean)[];
    return { sql: c + ' IN (' + list.map(() => '?').join(', ') + ')', params: list.map(toParam) };
  }
  if (op === 'like') return { sql: c + " LIKE ? ESCAPE '\\'", params: [value as string] };
  if (op === 'eq') {
    if (value === null) return { sql: c + ' IS NULL', params: [] };
    return { sql: c + ' = ?', params: [toParam(value as DataQueryParam | boolean)] };
  }
  if (op === 'ne') {
    if (value === null) return { sql: c + ' IS NOT NULL', params: [] };
    return { sql: c + ' <> ?', params: [toParam(value as DataQueryParam | boolean)] };
  }
  const sym = op === 'gt' ? '>' : op === 'gte' ? '>=' : op === 'lt' ? '<' : '<=';
  return { sql: c + ' ' + sym + ' ?', params: [toParam(value as DataQueryParam | boolean)] };
}

function buildWhere(node: DataQueryWhere): { sql: string; params: DataQueryParam[] } {
  const rec = node as Record<string, unknown>;
  if (rec['and'] !== undefined || rec['or'] !== undefined) {
    const key = rec['and'] !== undefined ? 'and' : 'or';
    const joiner = key === 'and' ? ' AND ' : ' OR ';
    const parts: string[] = [];
    const params: DataQueryParam[] = [];
    for (const sub of (rec[key] as DataQueryWhere[])) {
      const b = buildWhere(sub);
      parts.push('(' + b.sql + ')');
      params.push(...b.params);
    }
    return { sql: parts.join(joiner), params };
  }
  const leaf = node as DataCondition;
  return buildLeaf(leaf.field, leaf.op, leaf.value);
}

/**
 * 跑一批查询单：请求级非法（不是对象／`queries` 不是非空数组）即抛；
 * 单项的表／字段／形状／执行问题收进那一项的 `{ ok: false, error }`，其余项照常。
 * 返回与请求同序对应的 `results`（调用方按此装 envelope）。
 */
export function executeDataQueries(
  db: DataQueryDb,
  allowTables: readonly string[],
  request: unknown,
): DataResultItem[] {
  if (!isRecord(request)) fail('DATA_QUERY_INVALID', '数据查询请求须为对象（含 queries 数组）');
  const queries = (request as Record<string, unknown>)['queries'];
  if (!Array.isArray(queries) || queries.length === 0) {
    fail('DATA_QUERY_INVALID', '数据查询请求须含非空 queries 数组');
  }
  const schemas = readDataSchema(db, allowTables);
  const colMap = new Map(schemas.map((s) => [s.table, s.fields]));
  const out: DataResultItem[] = [];
  for (const raw of queries as unknown[]) {
    if (!isRecord(raw)) {
      out.push({
        ok: false,
        query: raw,
        error: { code: 'DATA_QUERY_INVALID', message: '查询单须为对象' },
      });
      continue;
    }
    const rec = raw as Record<string, unknown>;
    try {
      const id = readId(rec);
      const from = readFrom(rec, allowTables);
      assertNoUnsupported(rec, from);
      const cols = colMap.get(from) ?? [];
      const colByName = new Map(cols.map((c) => [c.name, c.type]));
      const fields = readSelect(rec, from, cols);
      if (rec['where'] !== undefined) checkWhere(rec['where'], from, colByName);
      const order = checkOrderBy(rec, from, colByName);
      let sql = 'SELECT ' + fields.map((f) => ident(f.name)).join(', ') + ' FROM ' + ident(from);
      let params: DataQueryParam[] = [];
      if (rec['where'] !== undefined) {
        const w = buildWhere(rec['where'] as DataQueryWhere);
        sql += ' WHERE ' + w.sql;
        params = w.params;
      }
      if (order.length > 0) {
        sql += ' ORDER BY ' + order.map((o) => ident(o.field) + ' ' + o.dir).join(', ');
      }
      const rows = db.prepare(sql).all(...params);
      const projected: Record<string, unknown>[] = [];
      for (const row of rows) {
        if (!isRecord(row)) fail('DATA_INTERNAL', from + ' 的行不是对象');
        const obj: Record<string, unknown> = {};
        for (const f of fields) obj[f.name] = (row as Record<string, unknown>)[f.name] ?? null;
        projected.push(obj);
      }
      const item: DataSuccessItem = {
        ok: true,
        query: raw as unknown as DataQuery,
        fields: fields.map((f) => ({ name: f.name, type: f.type })),
        rows: projected,
        total: projected.length,
      };
      out.push(id === undefined ? item : { id, ...item });
    } catch (e) {
      const code = e instanceof LinkCoreError ? e.code : 'DATA_INTERNAL';
      const message = e instanceof Error ? e.message : String(e);
      const id = typeof rec['id'] === 'string' ? (rec['id'] as string) : undefined;
      const item: DataErrorItem = {
        ok: false,
        query: raw,
        error: { code, message },
      };
      out.push(id === undefined ? item : { id, ...item });
    }
  }
  return out;
}
