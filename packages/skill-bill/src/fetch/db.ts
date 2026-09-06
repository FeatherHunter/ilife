// 取数层·文件 DB（老家 scripts/db.py 对应）：node:sqlite 单 bills 表 10 列 + goals.json 原子读写。
// 缺失/损坏大声失败，不返空。转账双笔 #转账不入收支由调用方过滤。
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { BillFetchError } from './errors.js';

export interface BillRow {
  id: number;
  category: string;
  time: string;
  amount: number;
  account: string;
  ledger: string;
  currency: string;
  note: string;
  created_at: string;
  deleted_at: string | null;
}

export interface BillDb { db: DatabaseSync; path: string; initialized: boolean; }

const BILLS_DDL = `CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  time TEXT NOT NULL,
  amount REAL NOT NULL,
  account TEXT DEFAULT '',
  ledger TEXT DEFAULT '生活',
  currency TEXT DEFAULT '人民币',
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT DEFAULT NULL
)`;

function tableColumns(db: DatabaseSync, table: string): string[] {
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    return rows.map((r) => r.name);
  } catch { return []; }
}

// 打开 DB：建 bills 表（幂等）+ 索引 + 老库 deleted_at 补列；失败 throw。
export function openBillDb(dbPath: string): BillDb {
  if (typeof dbPath !== 'string' || dbPath.length === 0) {
    throw new BillFetchError('BILL_DB_MISSING', '记账 DB 路径未指定');
  }
  let db: DatabaseSync;
  try { db = new DatabaseSync(dbPath); }
  catch (e) { throw new BillFetchError('BILL_DB_UNREADABLE', '记账 DB 打不开：' + dbPath, { cause: e }); }
  let initialized = false;
  try {
    db.exec('PRAGMA journal_mode=WAL');
    db.exec('PRAGMA busy_timeout=5000');
    const before = tableColumns(db, 'bills');
    if (!before.length) initialized = true;
    db.exec(BILLS_DDL);
    db.exec('CREATE INDEX IF NOT EXISTS idx_bills_time ON bills(time)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_bills_category ON bills(category)');
    const cols = tableColumns(db, 'bills');
    if (!cols.includes('deleted_at')) db.exec('ALTER TABLE bills ADD COLUMN deleted_at TEXT DEFAULT NULL');
  } catch (e) {
    try { db.close(); } catch { /* ignore */ }
    throw new BillFetchError('BILL_DB_UNREADABLE', '记账 DB 初始化失败：' + dbPath, { cause: e });
  }
  return { db, path: dbPath, initialized };
}

export function closeBillDb(handle: BillDb): void {
  try { handle.db.close(); } catch { /* ignore */ }
}

function toRow(r: Record<string, unknown>): BillRow {
  return {
    id: r.id as number, category: String(r.category ?? ''), time: String(r.time ?? ''),
    amount: Number(r.amount ?? 0), account: String(r.account ?? ''), ledger: String(r.ledger ?? '生活'),
    currency: String(r.currency ?? '人民币'), note: String(r.note ?? ''),
    created_at: String(r.created_at ?? ''), deleted_at: (r.deleted_at as string | null) ?? null,
  };
}

function all(h: BillDb, sql: string, params: unknown[] = []): BillRow[] {
  try {
    const stmt = h.db.prepare(sql) as unknown as { all: (...a: never[]) => Record<string, unknown>[] };
    const rows = stmt.all(...(params as never[]));
    return rows.map(toRow);
  } catch (e) {
    throw new BillFetchError('BILL_DB_UNREADABLE', '记账查询失败', { cause: e });
  }
}

// 通用查询：默认排除软删（includeDeleted 仅恢复/导出场景）；空结果返 [] 仅表示真实无记录。
export function fetchAll(h: BillDb, opts: { fromTime?: string; toTime?: string; category?: string; account?: string; ledger?: string; includeDeleted?: boolean } = {}): BillRow[] {
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (!opts.includeDeleted) conds.push("deleted_at IS NULL");
  if (opts.fromTime) { conds.push('time >= ?'); params.push(opts.fromTime); }
  if (opts.toTime) { conds.push('time <= ?'); params.push(opts.toTime); }
  if (opts.category) { conds.push('category = ? OR category LIKE ?'); params.push(opts.category, opts.category + '/%'); }
  if (opts.account) { conds.push('account = ?'); params.push(opts.account); }
  if (opts.ledger) { conds.push('ledger = ?'); params.push(opts.ledger); }
  return all(h, `SELECT * FROM bills WHERE ${conds.join(' AND ')} ORDER BY time ASC, id ASC`, params);
}

export function listToday(h: BillDb, date: string): BillRow[] {
  return fetchAll(h, { fromTime: date + ' 00:00:00', toTime: date + ' 23:59:59' });
}

export function listRange(h: BillDb, start: string, end: string): BillRow[] {
  return fetchAll(h, { fromTime: start + ' 00:00:00', toTime: end + ' 23:59:59' });
}

export function getById(h: BillDb, id: number): BillRow {
  const rows = all(h, 'SELECT * FROM bills WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!rows.length) throw new BillFetchError('BILL_RECORD_NOT_FOUND', '无此账单：' + id);
  return rows[0];
}

// CJK 搜索：备注+分类子串（空白切 token，每 token 须命中）；空查询 throw 不返全量。
export function searchKeyword(h: BillDb, keyword: string): BillRow[] {
  if (typeof keyword !== 'string' || keyword.trim().length === 0) {
    throw new BillFetchError('BILL_BAD_QUERY', '搜索须给关键词（空查询不返全量）');
  }
  const tokens = keyword.trim().toLowerCase().split(/\s+/);
  return fetchAll(h).filter((r) => {
    const hay = (r.note + '\n' + r.category).toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}

function isSep(c: string): boolean { if (c === "") return true; const code = c.charCodeAt(0); if (code <= 32) return true; return ".,?!;:|/()[]{}、，。？！；：（）「」『」".includes(c); }
const TAG_SEP_UNUSED2 = '[\\s,，、。？?！!；;：:·|/()（）\[\]{}「」『』]';

// #tag 精确匹配（按空白/标点切 token 整词比对，#旅行计划不命中 #旅行）。
export function tagMatch(note: string, tag: string): boolean {
  if (!note || !tag) return false;
  const key = String.fromCharCode(35) + tag;
  let at = note.indexOf(key);
  while (at >= 0) {
    const prev = at === 0 ? " " : note.charAt(at - 1);
    const next = note.charAt(at + key.length);
    if (isSep(prev) && isSep(next)) return true;
    at = note.indexOf(key, at + 1);
  }
  return false;
}

export function listByTag(h: BillDb, tag: string): BillRow[] {
  if (typeof tag !== 'string' || tag.trim().length === 0) {
    throw new BillFetchError('BILL_BAD_QUERY', '查标签须给 tag');
  }
  return fetchAll(h).filter((r) => tagMatch(r.note, tag.trim()));
}

// 写入：7 字段直写；返回行由读回确认；失败 throw 不谎报回执。
export function addBill(h: BillDb, input: { category: string; amount: number; time: string; account: string; ledger: string; currency: string; note: string }): BillRow {
  try {
    const r = h.db.prepare('INSERT INTO bills (category, time, amount, account, ledger, currency, note) VALUES (?, ?, ?, ?, ?, ?, ?)').get(
      input.category, input.time, input.amount, input.account, input.ledger, input.currency, input.note,
    ) as unknown as Record<string, unknown>;
    void r;
    const idRow = h.db.prepare('SELECT last_insert_rowid() AS id').get() as { id: number };
    return getById(h, idRow.id);
  } catch (e) {
    if (e instanceof BillFetchError) throw e;
    throw new BillFetchError('BILL_DB_UNREADABLE', '账单写盘失败', { cause: e });
  }
}

// 修改：只合已知 7 字段；对不上 throw。
export function updateBill(h: BillDb, id: number, patch: Partial<BillRow>): BillRow {
  getById(h, id);
  const allowed = ['category', 'time', 'amount', 'account', 'ledger', 'currency', 'note'] as const;
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const k of allowed) {
    if ((patch as Record<string, unknown>)[k] !== undefined) { sets.push(`${k} = ?`); params.push((patch as Record<string, unknown>)[k]); }
  }
  if (!sets.length) throw new BillFetchError('BILL_BAD_QUERY', 'update 至少改一个字段');
  try {
    h.db.prepare(`UPDATE bills SET ${sets.join(', ')} WHERE id = ?`).run(...([...params, id] as never[]));
  } catch (e) {
    throw new BillFetchError('BILL_DB_UNREADABLE', '账单更新失败：' + id, { cause: e });
  }
  return getById(h, id);
}

// 撤销=软删（deleted_at 置 now）；恢复=deleted_at 置 NULL；G7 软删契约。
export function undoBill(h: BillDb, id: number): BillRow {
  getById(h, id);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try { h.db.prepare('UPDATE bills SET deleted_at = ? WHERE id = ?').run(now, id); }
  catch (e) { throw new BillFetchError('BILL_DB_UNREADABLE', '账单撤销失败：' + id, { cause: e }); }
  const rows = all(h, 'SELECT * FROM bills WHERE id = ?', [id]);
  return rows[0];
}

export function restoreBill(h: BillDb, id: number): BillRow {
  const rows = all(h, 'SELECT * FROM bills WHERE id = ?', [id]);
  if (!rows.length) throw new BillFetchError('BILL_RECORD_NOT_FOUND', '无此账单：' + id);
  try { h.db.prepare('UPDATE bills SET deleted_at = NULL WHERE id = ?').run(id); }
  catch (e) { throw new BillFetchError('BILL_DB_UNREADABLE', '账单恢复失败：' + id, { cause: e }); }
  return getById(h, id);
}

// goals.json：budgets/savings/accounts 三顶层键，原子写（tmp + replace，不留残留）。
export interface BillGoals { budgets: Record<string, unknown>[]; savings: Record<string, unknown>[]; accounts: Record<string, unknown>[]; [k: string]: unknown; }

export function loadGoals(path: string): BillGoals {
  try {
    const raw = readFileSync(path, 'utf8');
    const j = JSON.parse(raw) as Record<string, unknown>;
    if (typeof j !== 'object' || j === null || Array.isArray(j)) {
      throw new BillFetchError('BILL_GOALS_CORRUPT', 'goals.json 非对象：' + path);
    }
    for (const k of ['budgets', 'savings', 'accounts']) {
      if (j[k] !== undefined && !Array.isArray(j[k])) {
        throw new BillFetchError('BILL_GOALS_CORRUPT', 'goals.json 顶层键须为数组：' + k);
      }
    }
    return { budgets: [], savings: [], accounts: [], ...j } as BillGoals;
  } catch (e) {
    if ((e as { code?: string }).code === 'ENOENT') return { budgets: [], savings: [], accounts: [] };
    if (e instanceof BillFetchError) throw e;
    throw new BillFetchError('BILL_GOALS_CORRUPT', 'goals.json 解析失败：' + path, { cause: e });
  }
}

export function saveGoals(path: string, data: BillGoals): void {
  try {
    const tmp = path + '.tmp';
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    renameSync(tmp, path);
  } catch (e) {
    throw new BillFetchError('BILL_DB_UNREADABLE', 'goals.json 写盘失败：' + path, { cause: e });
  }
}
