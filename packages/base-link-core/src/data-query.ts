/**
 * #955 · 数据族引擎最小路径：单表查询单的解析、目录校验与结果集装配。
 * #956 · 加连接一支：显式 `on` 的两表连接（`join` 长度只许 1）；`via`
 * 预定义关联路径只留语法位，出现即按项拒（后续加法式扩）。
 *
 * 住公共层（`base-link-core`）的理由：`docs/agents/数据族-规格.md` §六——
 * 查询单解析、目录校验、结果集装配住公共层；表清单住各技能自己的包。
 * 目录校验复用同一件 `readDataSchema`（与目录命令返回的是同一份，不会两处漂移）。
 *
 * 范围：单表取行（选字段、条件、排序）＋显式 `on` 两表连接；空集合法；
 * 非法表名／非法字段按项拒并点名。聚合、分页、批量语义各留后续票
 * （#957–#959）：本件遇到 `groupBy`／`agg`／`page` 即按项拒，
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

/** 单张查询单：表＋选列＋条件＋排序（`id` 原样回显；`join` 见 #956 连接一支）。 */
export interface DataQuery {
  readonly id?: string;
  readonly from: string;
  readonly join?: readonly DataJoin[];
  readonly select?: readonly string[];
  readonly where?: DataQueryWhere;
  readonly orderBy?: readonly DataOrderBy[];
}

/** 连接条件里的一对相等（左右皆为 `表.列` 限定引用，且恰好跨两表）。 */
export interface DataJoinOn {
  readonly left: string;
  readonly right: string;
}

/** 一次连接（本票只做两表：`join` 数组长度只许 1）。
 *
 * `type` 须显式写（`inner`／`left`，大小写不敏感），无缺省；
 * `on` 为显式连接条件（非空数组，多对按 AND 拼）；
 * `via` 预定义关联路径只留语法位——出现即按项拒（后续加法式扩，本票不实现）。
 */
export interface DataJoin {
  readonly table: string;
  readonly type: string;
  readonly on: readonly DataJoinOn[];
  readonly via?: unknown;
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
  if (raw['groupBy'] !== undefined || raw['agg'] !== undefined) {
    fail('DATA_QUERY_INVALID', from + ' 不支持 groupBy／agg（分组聚合见后续票 #957，本票只做行查询）');
  }
  if (raw['page'] !== undefined) {
    fail('DATA_QUERY_INVALID', from + ' 不支持 page（分页续取见后续票 #958，本票一次回全量）');
  }
}

/** 已解析的连接：连接表＋连接种类＋跨两表的等值对（`via` 在解析时已拒）。 */
interface ParsedJoin {
  readonly joinTable: string;
  readonly joinKind: 'INNER' | 'LEFT';
  readonly pairs: readonly { leftTable: string; leftCol: string; rightTable: string; rightCol: string }[];
}

/** `表.列` 限定引用的形状（`on` 左右与 join 下的 `表.列` 写法走这里）。 */
function splitQualified(ref: string): { table: string; column: string } | null {
  const dot = ref.indexOf('.');
  if (dot <= 0 || dot === ref.length - 1) return null;
  if (ref.indexOf('.', dot + 1) !== -1) return null;
  return { table: ref.slice(0, dot), column: ref.slice(dot + 1) };
}

function readJoin(
  raw: Record<string, unknown>,
  from: string,
  allowTables: readonly string[],
  colOf: (table: string) => Map<string, string>,
): ParsedJoin | null {
  const j = raw['join'];
  if (j === undefined) return null;
  if (!Array.isArray(j) || j.length !== 1) {
    fail('DATA_QUERY_INVALID', from + ' 的 join 须为长度 1 的数组（本票只做两表连接）');
  }
  const entry = (j as unknown[])[0];
  if (!isRecord(entry)) fail('DATA_QUERY_INVALID', from + ' 的 join[0] 须为对象');
  const rec = entry as Record<string, unknown>;
  if (rec['via'] !== undefined) {
    fail('DATA_QUERY_INVALID', from + ' 不支持 via 预定义关联路径（后续加法式扩，本票只做显式 on）');
  }
  const table = rec['table'];
  if (typeof table !== 'string' || table.length === 0) {
    fail('DATA_QUERY_INVALID', from + ' 的 join.table 须为非空字符串');
  }
  if (!allowTables.includes(table as string)) {
    fail('DATA_UNKNOWN_TABLE', '未知表：' + String(table) + '（允许：' + allowTables.join('／') + '）');
  }
  if ((table as string) === from) {
    fail('DATA_QUERY_INVALID', from + ' 的 join.table 不得与 from 同表：' + String(table));
  }
  const typeRaw = rec['type'];
  const kind =
    typeof typeRaw === 'string' && typeRaw.toLowerCase() === 'inner'
      ? 'INNER'
      : typeof typeRaw === 'string' && typeRaw.toLowerCase() === 'left'
        ? 'LEFT'
        : null;
  if (kind === null) {
    fail(
      'DATA_QUERY_INVALID',
      from + ' 的 join.type 须显式写 inner／left（实际：' + String(typeRaw) + '）',
    );
  }
  const on = rec['on'];
  if (!Array.isArray(on) || on.length === 0) {
    fail('DATA_QUERY_INVALID', from + ' 的 join.on 须为非空数组（显式连接条件）');
  }
  const scope = new Map<string, Map<string, string>>([
    [from, colOf(from)],
    [table as string, colOf(table as string)],
  ]);
  const pairs: { leftTable: string; leftCol: string; rightTable: string; rightCol: string }[] = [];
  for (const item of on as unknown[]) {
    if (!isRecord(item)) fail('DATA_QUERY_INVALID', from + ' 的 join.on 元素须为对象（含 left／right）');
    const left = (item as Record<string, unknown>)['left'];
    const right = (item as Record<string, unknown>)['right'];
    if (typeof left !== 'string' || left.length === 0 || typeof right !== 'string' || right.length === 0) {
      fail('DATA_QUERY_INVALID', from + ' 的 join.on 元素 left／right 须为非空字符串');
    }
    const l = splitQualified(left as string);
    const r = splitQualified(right as string);
    if (!l) fail('DATA_UNKNOWN_FIELD', '未知字段：' + String(left) + '（连接条件须写成 表.列）');
    if (!r) fail('DATA_UNKNOWN_FIELD', '未知字段：' + String(right) + '（连接条件须写成 表.列）');
    for (const [ref, part] of [
      [left, l],
      [right, r],
    ] as const) {
      const cols = scope.get(part.table);
      if (!cols) fail('DATA_UNKNOWN_FIELD', '未知字段：' + String(ref) + '（连接条件须引用 ' + from + '／' + String(table) + ' 两表之列）');
      if (!(cols as Map<string, string>).has(part.column)) {
        fail('DATA_UNKNOWN_FIELD', '未知字段：' + String(ref));
      }
    }
    if ((l as { table: string }).table === (r as { table: string }).table) {
      fail(
        'DATA_QUERY_INVALID',
        from + ' 的连接条件须跨两表（左右须各属一表）：' + String(left) + ' = ' + String(right),
      );
    }
    pairs.push({
      leftTable: (l as { table: string }).table,
      leftCol: (l as { column: string }).column,
      rightTable: (r as { table: string }).table,
      rightCol: (r as { column: string }).column,
    });
  }
  return { joinTable: table as string, joinKind: kind as 'INNER' | 'LEFT', pairs };
}

/** 有连接时 select／where／orderBy 共用的字段归属：裸名须在两表间无歧义，`表.列` 须落在两表内。 */
function resolveScopedField(
  field: unknown,
  from: string,
  joinTable: string,
  colOf: (table: string) => Map<string, string>,
  ownersOf: (column: string) => string[],
  ctx: string,
): { table: string; column: string; type: string } {
  if (typeof field !== 'string' || field.length === 0) {
    fail('DATA_QUERY_INVALID', ctx + ' field 须为非空字符串');
  }
  const name = field as string;
  if (name.includes('.')) {
    const part = splitQualified(name);
    if (!part) fail('DATA_UNKNOWN_FIELD', '未知字段：' + name);
    const cols = part.table === from || part.table === joinTable ? colOf(part.table) : null;
    if (!cols) fail('DATA_UNKNOWN_FIELD', '未知字段：' + name + '（须引用 ' + from + '／' + joinTable + ' 两表之列）');
    const type = (cols as Map<string, string>).get(part.column);
    if (!type) fail('DATA_UNKNOWN_FIELD', '未知字段：' + name);
    return { table: part.table, column: part.column, type: type as string };
  }
  const owners = ownersOf(name);
  if (owners.length === 0) fail('DATA_UNKNOWN_FIELD', '未知字段：' + from + '.' + name + '（两表中均无此列）');
  if (owners.length > 1) {
    fail(
      'DATA_QUERY_INVALID',
      ctx + ' 字段歧义：' + name + '（' + owners.join('／') + ' 两表均有此列，请写成 表.列）',
    );
  }
  return { table: owners[0], column: name, type: colOf(owners[0]).get(name) as string };
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

/** 连接分支的 select 项：输出名（裸列名）＋归属表＋归属列＋该列类型原文。 */
interface ScopedField {
  readonly name: string;
  readonly table: string;
  readonly column: string;
  readonly type: string;
}

function readSelectScoped(
  raw: Record<string, unknown>,
  from: string,
  joinTable: string,
  fromCols: readonly { name: string; type: string }[],
  colOf: (table: string) => Map<string, string>,
  ownersOf: (column: string) => string[],
): ScopedField[] {
  const sel = raw['select'];
  if (sel === undefined) return fromCols.map((c) => ({ name: c.name, table: from, column: c.name, type: c.type }));
  if (!Array.isArray(sel) || sel.length === 0) {
    fail('DATA_QUERY_INVALID', from + ' 的 select 须为非空数组');
  }
  const out: ScopedField[] = [];
  const seen = new Set<string>();
  for (const entry of sel as unknown[]) {
    const r = resolveScopedField(entry, from, joinTable, colOf, ownersOf, from + ' 的 select');
    if (seen.has(r.table + '.' + r.column)) {
      fail('DATA_QUERY_INVALID', from + ' 的 select 字段重复：' + String(entry));
    }
    if (out.some((o) => o.name === r.column)) {
      fail('DATA_QUERY_INVALID', from + ' 的 select 输出名重复：' + r.column + '（两表同名列须后续别名票，本票请避开同名双选）');
    }
    seen.add(r.table + '.' + r.column);
    out.push({ name: r.column, table: r.table, column: r.column, type: r.type });
  }
  return out;
}

function checkWhereScoped(
  node: unknown,
  from: string,
  joinTable: string,
  colOf: (table: string) => Map<string, string>,
  ownersOf: (column: string) => string[],
): void {
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
    for (const sub of list as unknown[]) checkWhereScoped(sub, from, joinTable, colOf, ownersOf);
    return;
  }
  const field = rec['field'];
  const op = rec['op'];
  const r = resolveScopedField(field, from, joinTable, colOf, ownersOf, from + ' 的条件');
  if (typeof op !== 'string' || !(OPS as readonly string[]).includes(op as string)) {
    fail('DATA_QUERY_INVALID', r.table + '.' + r.column + ' 的 op 非法：' + String(op) + '（允许：' + OPS.join('／') + '）');
  }
  checkLeafValue(r.table, r.column, op as string, rec['value'], r.type);
}

function checkOrderByScoped(
  raw: Record<string, unknown>,
  from: string,
  joinTable: string,
  colOf: (table: string) => Map<string, string>,
  ownersOf: (column: string) => string[],
): { table: string; column: string; dir: 'ASC' | 'DESC' }[] {
  const ob = raw['orderBy'];
  if (ob === undefined) return [];
  if (!Array.isArray(ob) || ob.length === 0) {
    fail('DATA_QUERY_INVALID', from + ' 的 orderBy 须为非空数组');
  }
  const out: { table: string; column: string; dir: 'ASC' | 'DESC' }[] = [];
  for (const item of ob as unknown[]) {
    if (!isRecord(item)) fail('DATA_QUERY_INVALID', from + ' 的 orderBy 元素须为对象');
    const rec = item as Record<string, unknown>;
    const r = resolveScopedField(rec['field'], from, joinTable, colOf, ownersOf, from + ' 的 orderBy');
    const dir = rec['dir'];
    if (typeof dir !== 'string' || (dir.toLowerCase() !== 'asc' && dir.toLowerCase() !== 'desc')) {
      fail('DATA_QUERY_INVALID', r.table + '.' + r.column + ' 的排序方向须为 asc／desc');
    }
    out.push({ table: r.table, column: r.column, dir: (dir as string).toLowerCase() === 'desc' ? 'DESC' : 'ASC' });
  }
  return out;
}

function buildLeafScoped(
  table: string,
  field: string,
  op: string,
  value: unknown,
): { sql: string; params: DataQueryParam[] } {
  const c = ident(table) + '.' + ident(field);
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

function buildWhereScoped(
  node: DataQueryWhere,
  from: string,
  joinTable: string,
  colOf: (table: string) => Map<string, string>,
  ownersOf: (column: string) => string[],
): { sql: string; params: DataQueryParam[] } {
  const rec = node as Record<string, unknown>;
  if (rec['and'] !== undefined || rec['or'] !== undefined) {
    const key = rec['and'] !== undefined ? 'and' : 'or';
    const joiner = key === 'and' ? ' AND ' : ' OR ';
    const parts: string[] = [];
    const params: DataQueryParam[] = [];
    for (const sub of (rec[key] as DataQueryWhere[])) {
      const b = buildWhereScoped(sub, from, joinTable, colOf, ownersOf);
      parts.push('(' + b.sql + ')');
      params.push(...b.params);
    }
    return { sql: parts.join(joiner), params };
  }
  const leaf = node as DataCondition;
  const r = resolveScopedField(leaf.field, from, joinTable, colOf, ownersOf, from + ' 的条件');
  return buildLeafScoped(r.table, r.column, leaf.op, leaf.value);
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
      const colOf = (t: string): Map<string, string> => {
        if (t === from) return colByName;
        const list = colMap.get(t) ?? [];
        return new Map(list.map((c) => [c.name, c.type]));
      };
      const parsedJoin = readJoin(rec, from, allowTables, colOf);
      if (parsedJoin === null) {
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
        continue;
      }
      const jt = parsedJoin.joinTable;
      const fromCols = colMap.get(from) ?? [];
      const ownersOf = (column: string): string[] =>
        [from, jt].filter((t) => colOf(t).has(column));
      const fields = readSelectScoped(rec, from, jt, fromCols, colOf, ownersOf);
      if (rec['where'] !== undefined) checkWhereScoped(rec['where'], from, jt, colOf, ownersOf);
      const order = checkOrderByScoped(rec, from, jt, colOf, ownersOf);
      let sql =
        'SELECT ' +
        fields.map((f) => ident(f.table) + '.' + ident(f.column) + ' AS ' + ident(f.name)).join(', ') +
        ' FROM ' +
        ident(from) +
        ' ' +
        parsedJoin.joinKind +
        ' JOIN ' +
        ident(jt) +
        ' ON ' +
        parsedJoin.pairs
          .map((p) => ident(p.leftTable) + '.' + ident(p.leftCol) + ' = ' + ident(p.rightTable) + '.' + ident(p.rightCol))
          .join(' AND ');
      let params: DataQueryParam[] = [];
      if (rec['where'] !== undefined) {
        const w = buildWhereScoped(rec['where'] as DataQueryWhere, from, jt, colOf, ownersOf);
        sql += ' WHERE ' + w.sql;
        params = w.params;
      }
      if (order.length > 0) {
        sql += ' ORDER BY ' + order.map((o) => ident(o.table) + '.' + ident(o.column) + ' ' + o.dir).join(', ');
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
