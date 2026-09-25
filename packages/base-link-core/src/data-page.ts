/**
 * #958 · 数据族分页与续取件：页大小校验、不透明凭据编解码、游标／偏移条件装配。
 *
 * 住公共层（`base-link-core`）的理由：`docs/agents/数据族-规格.md` §六——
 * 查询单解析、目录校验、结果集装配住公共层；`§四③` 续取凭据按查询类型自选
 * （行查询走游标、聚合查询走偏移），故本件与引擎件（`data-query.ts`）同住。
 *
 * 范围：`page.size` 校验（缺省与上限可调，见遗留出口）＋ `page.next`
 * 不透明凭据（篡改／乱填按项拒，报文可读）＋ 查询指纹绑定（换查询单须从
 * 第一页重取）＋ 行查询游标条件（`ORDER BY` 全序 ＋ `rowid` 系链，`NULL`
 * 安全）＋ 聚合查询偏移载荷（端到端待 #957 聚合落地后接线，本件先给编解码）。
 *
 * 零运行时依赖：只用全局 `TextEncoder`／`TextDecoder`（Node ≥18 自带，无 import），
 * 不 import `node:` 件，不引第三方；库句柄不碰（本件只算 SQL 片与凭据，不管库）。
 * 类型上写得出具体形状：无 `any`，未知输入先收窄再读。
 * 只读：本件不跑 SQL，只产 SQL 片与凭据串；不建表、不写库、不产文件。
 */

import { LinkCoreError } from './errors.js';

/** 页大小缺省（遗留出口：取值口径另议，本数只作可调参数的初值）。 */
export const DEFAULT_PAGE_SIZE = 100;

/** 页大小上限（遗留出口：取值口径另议，本数只作可调参数的初值）。 */
export const MAX_PAGE_SIZE = 1000;

/** 凭据盐（篡改探测用：盲改不断校验即拒；源码公开故不作安全边界，只防误用与乱填）。 */
const PAGE_SALT = 'ilife-data-page-v1';

/** 凭据版本（解码时不认即拒，报文可读）。 */
const TOKEN_VERSION = 1;

function fail(code: string, message: string): never {
  throw new LinkCoreError(code, message);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 读 `page`：缺省即第一页（缺省大小）；`page` 出现须为对象；`size`／`next` 各自校验。 */
export function readPage(rawPage: unknown, from: string): { size: number; next: string | null } {
  if (rawPage === undefined) return { size: DEFAULT_PAGE_SIZE, next: null };
  if (!isRecord(rawPage)) {
    fail('DATA_QUERY_INVALID', from + ' 的 page 须为对象（含 size／next）');
  }
  const rec = rawPage as Record<string, unknown>;
  return { size: readPageSize(rec['size'], from), next: readPageNext(rec['next'], from) };
}

function readPageSize(rawSize: unknown, from: string): number {
  if (rawSize === undefined) return DEFAULT_PAGE_SIZE;
  if (typeof rawSize !== 'number' || !Number.isInteger(rawSize)) {
    fail('DATA_QUERY_INVALID', from + ' 的 page.size 须为 1～' + MAX_PAGE_SIZE + ' 的整数（实际：' + String(rawSize) + '）');
  }
  const size = rawSize as number;
  if (size < 1 || size > MAX_PAGE_SIZE) {
    fail('DATA_QUERY_INVALID', from + ' 的 page.size 须为 1～' + MAX_PAGE_SIZE + ' 的整数（实际：' + String(size) + '）');
  }
  return size;
}

function readPageNext(rawNext: unknown, from: string): string | null {
  if (rawNext === undefined || rawNext === null) return null;
  if (typeof rawNext !== 'string' || rawNext.length === 0) {
    fail('DATA_QUERY_INVALID', from + ' 的 page.next 须为字符串凭据或 null（乱填的凭据按项拒）');
  }
  return rawNext as string;
}

/** 规范化（指纹用）：递归排键，数组保序，标量原样；`undefined` 视为缺席（与缺键同形）。 */
function canonicalize(v: unknown): unknown {
  if (Array.isArray(v)) return (v as unknown[]).map(canonicalize);
  if (isRecord(v)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      const item = (v as Record<string, unknown>)[k];
      if (item === undefined) continue;
      out[k] = canonicalize(item);
    }
    return out;
  }
  return v;
}

function utf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function utf8String(b: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(b);
}

/** FNV-1a 32 位（指纹与校验共用，纯函数，无依赖）。 */
function fnv1a(bytes: Uint8Array): number {
  let h = 2166136261;
  for (const byte of bytes) {
    h ^= byte;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function hexOf(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) {
    const h = b.toString(16);
    s += h.length === 1 ? '0' + h : h;
  }
  return s;
}

function bytesOfHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) fail('DATA_QUERY_INVALID', '续取凭据无效：格式错误（十六进制长度须为偶数）');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    const pair = hex.slice(i * 2, i * 2 + 2);
    if (!/^[0-9a-fA-F]{2}$/.test(pair)) {
      fail('DATA_QUERY_INVALID', '续取凭据无效：格式错误（非十六进制字符）');
    }
    out[i] = parseInt(pair, 16);
  }
  return out;
}

function checksumOf(payloadJson: string): string {
  const h = fnv1a(utf8Bytes(PAGE_SALT + '.' + payloadJson));
  return h.toString(16).padStart(8, '0');
}

/**
 * 查询指纹（换查询单须从第一页重取的绑定依据）。
 * 只含语义（`from`／`join`／`select`／`where`／`orderBy`／`groupBy`／`agg`），
 * 不含 `id`（调用方标识，原样回而已）与 `page`（表现层：大小可换页，凭据是状态）。
 */
export function fingerprintQuery(raw: Record<string, unknown>): string {
  const semantic = {
    from: raw['from'],
    join: raw['join'],
    select: raw['select'],
    where: raw['where'],
    orderBy: raw['orderBy'],
    groupBy: raw['groupBy'],
    agg: raw['agg'],
  };
  const json = JSON.stringify(canonicalize(semantic));
  return fnv1a(utf8Bytes(json)).toString(16).padStart(8, '0');
}

interface RowPayload {
  readonly v: number;
  readonly k: 'r';
  readonly f: string;
  readonly c: { readonly o: readonly unknown[]; readonly r: readonly (number|null)[] };
}

interface AggPayload {
  readonly v: number;
  readonly k: 'a';
  readonly f: string;
  readonly o: number;
}

function encodePayload(payload: RowPayload | AggPayload): string {
  const json = JSON.stringify(payload);
  return hexOf(utf8Bytes(json)) + '.' + checksumOf(json);
}

function decodePayload(token: string): RowPayload | AggPayload {
  const dot = token.lastIndexOf('.');
  if (dot <= 0 || dot === token.length - 1) {
    fail('DATA_QUERY_INVALID', '续取凭据无效：格式错误（须为 载荷.校验 两段）');
  }
  const hex = token.slice(0, dot);
  const sum = token.slice(dot + 1);
  if (!/^[0-9a-fA-F]{8}$/.test(sum)) {
    fail('DATA_QUERY_INVALID', '续取凭据无效：格式错误（校验段须为 8 位十六进制）');
  }
  let json: string;
  try {
    json = utf8String(bytesOfHex(hex));
  } catch {
    fail('DATA_QUERY_INVALID', '续取凭据无效：格式错误（载荷解不开）');
  }
  let payload: unknown;
  try {
    payload = JSON.parse(json as string);
  } catch {
    fail('DATA_QUERY_INVALID', '续取凭据无效：格式错误（载荷不是 JSON）');
  }
  if (checksumOf(json as string).toLowerCase() !== sum.toLowerCase()) {
    fail('DATA_QUERY_INVALID', '续取凭据无效：校验未通过（可能被篡改或乱填，请从第一页重取）');
  }
  if (!isRecord(payload)) fail('DATA_QUERY_INVALID', '续取凭据无效：载荷须为对象');
  const rec = payload as Record<string, unknown>;
  if (rec['v'] !== TOKEN_VERSION) {
    fail('DATA_QUERY_INVALID', '续取凭据无效：版本不认（实际：' + String(rec['v']) + '）');
  }
  return rec as unknown as RowPayload | AggPayload;
}

/** 行查询凭据编码（游标：排序列值 ＋ `rowid` 系链；值原样进 JSON，`NULL` 即 `null`）。 */
export function encodeRowToken(
  fingerprint: string,
  orderingValues: readonly unknown[],
  rowids: readonly (number|null)[],
): string {
  const payload: RowPayload = { v: TOKEN_VERSION, k: 'r', f: fingerprint, c: { o: [...orderingValues], r: [...rowids] } };
  return encodePayload(payload);
}

/** 行查询凭据解码（种类／指纹／形状逐项验，错即按项拒，报文可读）。 */
export function decodeRowToken(
  token: string,
  expectedFingerprint: string,
  expectedOrderLen: number,
  expectedRowidLen: number,
): { orderingValues: unknown[]; rowids: (number|null)[] } {
  const payload = decodePayload(token);
  if ((payload as RowPayload).k !== 'r') {
    fail('DATA_QUERY_INVALID', '续取凭据无效：与查询类型不匹配（行查询／聚合查询各走各的凭据，不可混用）');
  }
  const row = payload as RowPayload;
  if (row.f !== expectedFingerprint) {
    fail(
      'DATA_QUERY_INVALID',
      '续取凭据无效：与查询单不匹配（from／join／select／where／orderBy 改动后须从第一页重取）',
    );
  }
  if (!isRecord(row.c as unknown)) fail('DATA_QUERY_INVALID', '续取凭据无效：游标须为对象');
  const c = row.c as { o: unknown; r: unknown };
  if (!Array.isArray(c.o) || !Array.isArray(c.r)) {
    fail('DATA_QUERY_INVALID', '续取凭据无效：游标形状错误（须含排序值与行号两段）');
  }
  if ((c.o as unknown[]).length !== expectedOrderLen) {
    fail('DATA_QUERY_INVALID', '续取凭据无效：与查询单不匹配（排序列数变了，须从第一页重取）');
  }
  if ((c.r as unknown[]).length !== expectedRowidLen) {
    fail('DATA_QUERY_INVALID', '续取凭据无效：与查询单不匹配（连接形状变了，须从第一页重取）');
  }
  for (const r of c.r as unknown[]) {
    if ((typeof r !== 'number' || !Number.isInteger(r)) && r !== null) {
      fail('DATA_QUERY_INVALID', '续取凭据无效：行号须为整数');
    }
  }
  return { orderingValues: [...(c.o as unknown[])], rowids: [...(c.r as (number|null)[])] };
}

/** 聚合查询凭据编码（偏移：已跳过多少组；端到端待 #957 聚合落地后接线）。 */
export function encodeAggToken(fingerprint: string, offset: number): string {
  if (!Number.isInteger(offset) || offset < 0) {
    fail('DATA_QUERY_INVALID', '续取凭据无效：偏移须为非负整数');
  }
  const payload: AggPayload = { v: TOKEN_VERSION, k: 'a', f: fingerprint, o: offset };
  return encodePayload(payload);
}

/** 聚合查询凭据解码（种类／指纹／偏移逐项验，错即按项拒）。 */
export function decodeAggToken(token: string, expectedFingerprint: string): number {
  const payload = decodePayload(token);
  if ((payload as AggPayload).k !== 'a') {
    fail('DATA_QUERY_INVALID', '续取凭据无效：与查询类型不匹配（行查询／聚合查询各走各的凭据，不可混用）');
  }
  const agg = payload as AggPayload;
  if (agg.f !== expectedFingerprint) {
    fail(
      'DATA_QUERY_INVALID',
      '续取凭据无效：与查询单不匹配（from／where／groupBy／agg 改动后须从第一页重取）',
    );
  }
  if (typeof agg.o !== 'number' || !Number.isInteger(agg.o) || (agg.o as number) < 0) {
    fail('DATA_QUERY_INVALID', '续取凭据无效：偏移须为非负整数');
  }
  return agg.o as number;
}

/** 排序列（含方向）＋ 上一页末行值（`NULL` 即 `null`，`rowid` 系链永不为 `NULL`）。 */
export interface CursorOrderSpec {
  readonly table: string | null;
  readonly column: string;
  readonly dir: 'ASC' | 'DESC';
  readonly lastValue: unknown;
}

/** `rowid` 系链（一表一链，两表两链，恒 `ASC`；`from` 永不为 `NULL`，`LEFT` 失配时 `join` 可为 `NULL`）。 */
export interface CursorRowidSpec {
  readonly table: string | null;
  readonly lastRowid: number | null;
}

function ident(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

function colRef(table: string | null, column: string): string {
  return table === null ? ident(column) : ident(table) + '.' + ident(column);
}

function rowidRef(table: string | null): string {
  return table === null ? 'rowid' : ident(table) + '.rowid';
}

/**
 * 游标条件（`ORDER BY` 全序的“下一页”：元组大于上一页末行，`NULL` 安全）。
 * `ASC`（`NULL` 居首）：末值 `NULL` → 后继为非 `NULL`；末值非 `NULL` → 后继为更大值。
 * `DESC`（`NULL` 居尾）：末值 `NULL` → 本列无后继（靠系链）；末值非 `NULL` → 后继为更小值或 `NULL`。
 * 系链（`rowid ASC`）：后继恒为更大行号。
 * 返回不带 `WHERE` 关键字的片段，调用方与用户条件按 `AND` 拼。
 */
export function buildCursorCondition(
  orders: readonly CursorOrderSpec[],
  rowids: readonly CursorRowidSpec[],
): { sql: string; params: (string | number | null)[] } {
  type Unit = { dir: 'ASC' | 'DESC'; last: unknown; ref: string; isRowid: boolean };
  const units: Unit[] = [
    ...orders.map((o) => ({ dir: o.dir, last: o.lastValue, ref: colRef(o.table, o.column), isRowid: false as const })),
    ...rowids.map((r) => ({ dir: 'ASC' as const, last: r.lastRowid, ref: rowidRef(r.table), isRowid: true as const })),
  ];
  const branches: string[] = [];
  const params: (string | number | null)[] = [];
  for (let i = 0; i < units.length; i += 1) {
    const cur = units[i];
    let greater: string | null = null;
    let greaterParam: (string | number | null)[] = [];
    if (cur.isRowid) {
      if (cur.last === null) {
        greater = cur.ref + ' IS NOT NULL';
      } else {
        greater = cur.ref + ' > ?';
        greaterParam = [cur.last as number];
      }
    } else if (cur.dir === 'ASC') {
      if (cur.last === null) {
        greater = cur.ref + ' IS NOT NULL';
      } else {
        greater = cur.ref + ' > ?';
        greaterParam = [cur.last as string | number | null];
      }
    } else {
      if (cur.last === null) {
        greater = null;
      } else {
        greater = '(' + cur.ref + ' < ? OR ' + cur.ref + ' IS NULL)';
        greaterParam = [cur.last as string | number | null];
      }
    }
    if (greater === null) continue;
    const prefix: string[] = [];
    for (let j = 0; j < i; j += 1) {
      const prev = units[j];
      if (prev.last === null) {
        prefix.push(prev.ref + ' IS NULL');
      } else {
        prefix.push(prev.ref + ' = ?');
        params.push(prev.last as string | number | null);
      }
    }
    params.push(...greaterParam);
    if (prefix.length === 0) {
      branches.push('(' + greater + ')');
    } else {
      branches.push('(' + prefix.join(' AND ') + ' AND ' + greater + ')');
    }
  }
  if (branches.length === 0) {
    fail('DATA_INTERNAL', '游标条件装配失败（排序与系链均为空）');
  }
  return { sql: branches.join(' OR '), params };
}




