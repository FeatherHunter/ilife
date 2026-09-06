// 取数层·sqlite DB：老家 scripts/schedule_db.py 对应。
// 三表：schedule_records（作息记录）/ daily_summary（日摘）/ schedule_plans（事件型日程）。
// 旧版小时表沿老家 init 语义改名 schedule_plans_legacy_2026_06_29 保留数据；completion 列幂等补齐。
// 缺失/损坏大声失败，不返空。外置语录库 daily_recorder.db 不直连（以外置为准）。
import { DatabaseSync } from 'node:sqlite';
import { ScheduleFetchError } from './errors.js';

export const SCHEMA_VERSION = 1;

export interface ScheduleRecord {
  id: number;
  date: string;
  time_start: string;
  time_end: string;
  duration_minutes: number | null;
  activity: string;
  category: string;
  source_contents: string | null;
  source_timestamps: string | null;
  analysis_reasoning: string | null;
  created_at: string;
  updated_at: string;
  edit_count: number;
}

export interface DailySummary {
  date: string;
  category: string;
  total_minutes: number;
}

export interface PlanEvent {
  id: number;
  date: string;
  time_start: string;
  time_end: string;
  title: string;
  notes: string | null;
  category: string | null;
  feishu_event_id: string | null;
  last_synced_at: string | null;
  is_active: number;
  completion: string | null;
  completion_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleDb {
  db: DatabaseSync;
  path: string;
  /** 本次 open 是否新建了表（初始化语义，供 #22 初始化回执）。 */
  initialized: boolean;
}

const RECORDS_DDL = `CREATE TABLE IF NOT EXISTS schedule_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  time_start TEXT NOT NULL,
  time_end TEXT NOT NULL,
  duration_minutes INTEGER,
  activity TEXT NOT NULL,
  category TEXT NOT NULL,
  source_contents TEXT,
  source_timestamps TEXT,
  analysis_reasoning TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  edit_count INTEGER NOT NULL DEFAULT 0
)`;

const SUMMARY_DDL = `CREATE TABLE IF NOT EXISTS daily_summary (
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  total_minutes INTEGER DEFAULT 0,
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (date, category)
)`;

const PLANS_DDL = `CREATE TABLE IF NOT EXISTS schedule_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  time_start TEXT NOT NULL,
  time_end TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  category TEXT,
  feishu_event_id TEXT,
  last_synced_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  completion TEXT DEFAULT NULL,
  completion_note TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)`;

function tableColumns(db: DatabaseSync, table: string): string[] {
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}

// 打开 DB：建三表（幂等）+ 旧版小时表改名 + completion 列补齐；失败 throw。
export function openScheduleDb(dbPath: string): ScheduleDb {
  if (typeof dbPath !== 'string' || dbPath.length === 0) {
    throw new ScheduleFetchError('SCHEDULE_DB_MISSING', '作息 DB 路径未指定');
  }
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(dbPath);
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '作息 DB 打不开：' + dbPath, { cause: e });
  }
  let initialized = false;
  try {
    db.exec('PRAGMA journal_mode=WAL');
    db.exec('PRAGMA busy_timeout=5000');
    const before = tableColumns(db, 'schedule_records').length + tableColumns(db, 'schedule_plans').length;
    db.exec(RECORDS_DDL);
    db.exec(SUMMARY_DDL);
    // 旧版小时表：若 schedule_plans 仍是旧形（无 time_start 列）先改名再建新表。
    const cols = tableColumns(db, 'schedule_plans');
    if (cols.length > 0 && !cols.includes('time_start')) {
      db.exec('ALTER TABLE schedule_plans RENAME TO schedule_plans_legacy_2026_06_29');
    }
    db.exec(PLANS_DDL);
    db.exec('CREATE INDEX IF NOT EXISTS idx_plans_date ON schedule_plans(date)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_plans_date_time ON schedule_plans(date, time_start)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_records_date ON schedule_records(date)');
    const after = tableColumns(db, 'schedule_records').length + tableColumns(db, 'schedule_plans').length;
    initialized = before === 0 && after > 0;
    try { db.exec('ALTER TABLE schedule_plans ADD COLUMN completion TEXT DEFAULT NULL'); } catch { /* 已有 */ }
    try { db.exec('ALTER TABLE schedule_plans ADD COLUMN completion_note TEXT DEFAULT NULL'); } catch { /* 已有 */ }
    try { db.exec('ALTER TABLE schedule_records ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP'); } catch { /* 已有 */ }
    try { db.exec('ALTER TABLE schedule_records ADD COLUMN edit_count INTEGER NOT NULL DEFAULT 0'); } catch { /* 已有 */ }
  } catch (e) {
    if (e instanceof ScheduleFetchError) throw e;
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '作息 DB 初始化失败：' + dbPath, { cause: e });
  }
  return { db, path: dbPath, initialized };
}

export function closeScheduleDb(handle: ScheduleDb): void {
  try { handle.db.close(); } catch { /* 关闭失败不谎报 */ }
}

function rowRecord(r: Record<string, unknown>): ScheduleRecord {
  return r as unknown as ScheduleRecord;
}

function rowPlan(r: Record<string, unknown>): PlanEvent {
  return r as unknown as PlanEvent;
}

// ---- 作息记录 ----
export function addRecord(
  handle: ScheduleDb,
  input: {
    date: string; time_start: string; time_end: string; duration_minutes: number;
    activity: string; category: string;
    source_contents?: string | null; source_timestamps?: string | null; analysis_reasoning?: string | null;
  },
): ScheduleRecord {
  let id = 0;
  try {
    const r = handle.db.prepare(
      'INSERT INTO schedule_records ' +
      '(date, time_start, time_end, duration_minutes, activity, category, ' +
      'source_contents, source_timestamps, analysis_reasoning) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
    ).get(
      input.date, input.time_start, input.time_end, input.duration_minutes,
      input.activity, input.category,
      input.source_contents ?? null, input.source_timestamps ?? null, input.analysis_reasoning ?? null,
    ) as { id: number };
    id = r.id;
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '作息记录写盘失败', { cause: e });
  }
  return getRecordById(handle, id);
}

// 修正：任一字段可改；edit_count 自增 + updated_at 更新（老家 #26 审计语义）。
export function amendRecord(handle: ScheduleDb, id: number, patch: Partial<ScheduleRecord>): ScheduleRecord {
  const cur = getRecordById(handle, id);
  const keys: (keyof ScheduleRecord)[] = [
    'date', 'time_start', 'time_end', 'duration_minutes', 'activity', 'category',
    'source_contents', 'source_timestamps', 'analysis_reasoning',
  ];
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  for (const k of keys) {
    if (patch[k] !== undefined) { sets.push(k + ' = ?'); vals.push(patch[k] as string | number | null); }
  }
  if (!sets.length) return cur;
  sets.push('edit_count = edit_count + 1');
  sets.push('updated_at = CURRENT_TIMESTAMP');
  try {
    handle.db.prepare(`UPDATE schedule_records SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '作息记录修正失败：' + id, { cause: e });
  }
  return getRecordById(handle, id);
}

export function getRecordById(handle: ScheduleDb, id: number): ScheduleRecord {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ScheduleFetchError('SCHEDULE_RECORD_NOT_FOUND', '作息记录 id 非法：' + String(id));
  }
  let row: unknown = null;
  try {
    row = handle.db.prepare('SELECT * FROM schedule_records WHERE id = ?').get(id);
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '作息记录读取失败：' + id, { cause: e });
  }
  if (!row) throw new ScheduleFetchError('SCHEDULE_RECORD_NOT_FOUND', '无此作息记录：' + id);
  return rowRecord(row as Record<string, unknown>);
}

export function listRecordsByDate(handle: ScheduleDb, date: string): ScheduleRecord[] {
  try {
    const rows = handle.db.prepare(
      'SELECT * FROM schedule_records WHERE date = ? ORDER BY time_start ASC, id ASC',
    ).all(date) as Record<string, unknown>[];
    return rows.map(rowRecord);
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '作息记录查询失败：' + date, { cause: e });
  }
}

export function listRecordsRange(handle: ScheduleDb, start: string, end: string): ScheduleRecord[] {
  try {
    const rows = handle.db.prepare(
      'SELECT * FROM schedule_records WHERE date >= ? AND date <= ? ORDER BY date ASC, time_start ASC, id ASC',
    ).all(start, end) as Record<string, unknown>[];
    return rows.map(rowRecord);
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '作息区间查询失败：' + start + '~' + end, { cause: e });
  }
}

export function getLastRecord(handle: ScheduleDb): ScheduleRecord | null {
  try {
    const row = handle.db.prepare(
      'SELECT * FROM schedule_records ORDER BY date DESC, time_end DESC, id DESC LIMIT 1',
    ).get() as Record<string, unknown> | undefined;
    return row ? rowRecord(row) : null;
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '游标读取失败', { cause: e });
  }
}

export function getStatus(handle: ScheduleDb): { records: number; days: number; firstDate: string | null; lastDate: string | null } {
  try {
    const r = handle.db.prepare(
      'SELECT COUNT(*) AS n, COUNT(DISTINCT date) AS d, MIN(date) AS f, MAX(date) AS l FROM schedule_records',
    ).get() as { n: number; d: number; f: string | null; l: string | null };
    return { records: r.n, days: r.d, firstDate: r.f, lastDate: r.l };
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '状态读取失败', { cause: e });
  }
}

// ---- 每日摘要（#24 add-summary：按 date+category upsert） ----
export function addSummary(handle: ScheduleDb, date: string, category: string, totalMinutes: number): DailySummary {
  try {
    handle.db.prepare(
      'INSERT INTO daily_summary (date, category, total_minutes) VALUES (?, ?, ?) ' +
      'ON CONFLICT(date, category) DO UPDATE SET total_minutes = excluded.total_minutes',
    ).run(date, category, totalMinutes);
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '摘要写盘失败：' + date + '/' + category, { cause: e });
  }
  return { date, category, total_minutes: totalMinutes };
}

export function getDailySummary(handle: ScheduleDb, date: string): DailySummary[] {
  try {
    return handle.db.prepare(
      'SELECT date, category, total_minutes FROM daily_summary WHERE date = ? ORDER BY total_minutes DESC',
    ).all(date) as unknown as DailySummary[];
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '摘要查询失败：' + date, { cause: e });
  }
}

export function getSummariesRange(handle: ScheduleDb, start: string, end: string): DailySummary[] {
  try {
    return handle.db.prepare(
      'SELECT date, category, total_minutes FROM daily_summary WHERE date >= ? AND date <= ? ORDER BY date ASC',
    ).all(start, end) as unknown as DailySummary[];
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '摘要区间查询失败', { cause: e });
  }
}

// ---- 日程计划（事件型） ----
export function listPlanEvents(handle: ScheduleDb, date: string, includeInactive = false): PlanEvent[] {
  try {
    const sql = includeInactive
      ? 'SELECT * FROM schedule_plans WHERE date = ? ORDER BY time_start ASC, id ASC'
      : 'SELECT * FROM schedule_plans WHERE date = ? AND is_active = 1 ORDER BY time_start ASC, id ASC';
    const rows = handle.db.prepare(sql).all(date) as Record<string, unknown>[];
    return rows.map(rowPlan);
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '日程查询失败：' + date, { cause: e });
  }
}

export function getPlanEventsRange(handle: ScheduleDb, start: string, end: string): PlanEvent[] {
  try {
    const rows = handle.db.prepare(
      'SELECT * FROM schedule_plans WHERE date >= ? AND date <= ? AND is_active = 1 ORDER BY date ASC, time_start ASC',
    ).all(start, end) as Record<string, unknown>[];
    return rows.map(rowPlan);
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '日程区间查询失败', { cause: e });
  }
}

export function getPlanEvent(handle: ScheduleDb, id: number): PlanEvent {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ScheduleFetchError('SCHEDULE_PLAN_NOT_FOUND', '日程事件 id 非法：' + String(id));
  }
  let row: unknown = null;
  try {
    row = handle.db.prepare('SELECT * FROM schedule_plans WHERE id = ?').get(id);
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '日程读取失败：' + id, { cause: e });
  }
  if (!row) throw new ScheduleFetchError('SCHEDULE_PLAN_NOT_FOUND', '无此日程事件：' + id);
  return rowPlan(row as Record<string, unknown>);
}

// 标题搜（#12 带标题：子串匹配；可选三元组 time_start/time_end 缩小）。
export function searchPlanEvent(
  handle: ScheduleDb, date: string, title: string, timeStart?: string, timeEnd?: string,
): PlanEvent[] {
  if (!title || !title.trim()) throw new ScheduleFetchError('SCHEDULE_BAD_QUERY', '标题搜须给 title');
  try {
    let sql = 'SELECT * FROM schedule_plans WHERE date = ? AND is_active = 1 AND title LIKE ?';
    const vals: (string | number | null)[] = [date, '%' + title.trim() + '%'];
    if (timeStart !== undefined) { sql += ' AND time_start = ?'; vals.push(timeStart); }
    if (timeEnd !== undefined) { sql += ' AND time_end = ?'; vals.push(timeEnd); }
    sql += ' ORDER BY time_start ASC';
    const rows = handle.db.prepare(sql).all(...vals) as Record<string, unknown>[];
    return rows.map(rowPlan);
  } catch (e) {
    if (e instanceof ScheduleFetchError) throw e;
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '标题搜失败', { cause: e });
  }
}

// 补计划（#13 ensure：按 date+time_start+time_end 三元组幂等，title 只展示不参与身份）。
export function ensurePlanEvent(
  handle: ScheduleDb,
  input: { date: string; time_start: string; time_end: string; title: string; notes?: string | null; category?: string | null },
): { event: PlanEvent; created: boolean } {
  try {
    const hit = handle.db.prepare(
      'SELECT * FROM schedule_plans WHERE date = ? AND time_start = ? AND time_end = ? AND is_active = 1 LIMIT 1',
    ).get(input.date, input.time_start, input.time_end) as Record<string, unknown> | undefined;
    if (hit) return { event: rowPlan(hit), created: false };
    const r = handle.db.prepare(
      'INSERT INTO schedule_plans (date, time_start, time_end, title, notes, category) ' +
      'VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    ).get(input.date, input.time_start, input.time_end, input.title, input.notes ?? null, input.category ?? null) as { id: number };
    return { event: getPlanEvent(handle, r.id), created: true };
  } catch (e) {
    if (e instanceof ScheduleFetchError) throw e;
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '补计划失败', { cause: e });
  }
}

// 商量计划落盘（#17 upsert：先整日软删再整批插入；调用方已过 24h 覆盖校验）。
export function upsertPlanEvents(
  handle: ScheduleDb,
  date: string,
  events: { time_start: string; time_end: string; title: string; notes?: string | null; category?: string | null }[],
): PlanEvent[] {
  try {
    handle.db.prepare('UPDATE schedule_plans SET is_active = 0 WHERE date = ? AND is_active = 1').run(date);
    const out: PlanEvent[] = [];
    for (const e of events) {
      const r = handle.db.prepare(
        'INSERT INTO schedule_plans (date, time_start, time_end, title, notes, category) ' +
        'VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      ).get(date, e.time_start, e.time_end, e.title, e.notes ?? null, e.category ?? null) as { id: number };
      out.push(getPlanEvent(handle, r.id));
    }
    return out;
  } catch (e) {
    if (e instanceof ScheduleFetchError) throw e;
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '商量计划落盘失败：' + date, { cause: e });
  }
}

// 改计划（#18：可选字段；含 completion 复盘标记）。
export function updatePlanEvent(handle: ScheduleDb, id: number, patch: Partial<PlanEvent>): PlanEvent {
  getPlanEvent(handle, id);
  const keys: (keyof PlanEvent)[] = [
    'title', 'notes', 'category', 'time_start', 'time_end', 'completion', 'completion_note', 'feishu_event_id',
  ];
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  for (const k of keys) {
    if (patch[k] !== undefined) { sets.push(k + ' = ?'); vals.push(patch[k] as string | number | null); }
  }
  if (!sets.length) return getPlanEvent(handle, id);
  sets.push('updated_at = CURRENT_TIMESTAMP');
  try {
    handle.db.prepare(`UPDATE schedule_plans SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '改计划失败：' + id, { cause: e });
  }
  return getPlanEvent(handle, id);
}

// 删计划（#19：软删 is_active=0，飞书侧删除由调用方编排）。
export function deactivatePlanEvent(handle: ScheduleDb, id: number): PlanEvent {
  getPlanEvent(handle, id);
  try {
    handle.db.prepare('UPDATE schedule_plans SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '删计划失败：' + id, { cause: e });
  }
  return getPlanEvent(handle, id);
}

export function setFeishuEventId(handle: ScheduleDb, id: number, feishuEventId: string | null): void {
  try {
    handle.db.prepare('UPDATE schedule_plans SET feishu_event_id = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(feishuEventId, id);
  } catch (e) {
    throw new ScheduleFetchError('SCHEDULE_DB_UNREADABLE', '飞书 id 回写失败：' + id, { cause: e });
  }
}
