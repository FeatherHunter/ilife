// 备份导出／导入恢复：HELP SM8-3「备份与导出(数据资产)」＋ SM8-4「导入与恢复(迁移)」的落点。
//
// 与老家的关系（`docs/plugins/plugin-home-ilife/t707-备份取舍.md` 有完整对账）：形状照 `ops.py` 那套
// （`backups/` 同库目录、`home_backup_<时间戳>.zip`、保留 N 份、覆盖前二次备份），但有三处**有意不同**：
//   1. **不做照片**：本包 src 零读 `HOME_PHOTOS_DIR`（`docs/env.md:12` 已登记的实况），故 zip 只装库 ＋ 清单；
//   2. **快照用 `VACUUM INTO`**：老家直接 `zf.write(DB_PATH)`，而本包库开 WAL（`db.ts:66`），
//      照抄会把未落主库的 WAL 内容漏掉——`VACUUM INTO` 出的是包含 WAL 的一致快照；
//   3. **不做 JSON 导入**：SM8-4 的「冲突预览 → 跳过／合并／覆盖」是老家的物品级合并，本票只做
//      **整库恢复**（`import` 收 `.zip` 备份），物品级合并留作后续票（见该文档「遗留」）。
// 三条都在票面「留给执行者判断取舍」的范围内，理由与代价写在上面的文档里。
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { closeHomeDb, openHomeDb } from './db.js';
import { HomeFetchError, HomePolicyError } from './errors.js';
import { DB_FILENAME, resolveDbDir, resolveDbPath } from './paths.js';
import { zipRead, zipWrite, type ZipEntry } from './archive.js';

const BACKUP_DIR_NAME = 'backups';   // 老家 ops.py:26 同值
const BACKUP_KEEP_N = 5;             // 老家 ops.py:25 同值
const BACKUP_PREFIX = 'home_backup_';
const EXPORT_SCHEMA_VERSION = 1;

export interface BackupRow {
  file: string;
  size: number;
  created_at: string;
  days_ago: number;
}

export interface BackupResult {
  status: 'ok';
  keep_n: number;
  file: string;
  size: number;
  created_at: string;
  items: number;
  history: BackupRow[];
  days_since_last: number | null;
}

export interface BackupListResult {
  status: 'ok';
  dir: string;
  keep_n: number;
  count: number;
  history: BackupRow[];
  days_since_last: number | null;
}

export interface RestoreResult {
  status: 'ok';
  restored_from: string;
  safety_backup: string;
  before_items: number;
  items_total: number;
  message: string;
}

/** 预告（`dryRun`）结果：只报「这份备份装了多少件、当前库多少件」，不落盘。 */
export interface RestorePreview {
  status: 'ok';
  dry_run: true;
  restored_from: string;
  items_in_backup: number | null;
  items_current: number;
  message: string;
}

export type RestoreOutcome = RestoreResult | RestorePreview;

export interface ExportResult {
  status: 'ok';
  file: string;
  format: 'json' | 'csv';
  size: number;
  rows: number;
}

function p2(n: number, w = 2): string { return String(n).padStart(w, '0'); }

function stamp(d = new Date()): string {
  return p2(d.getFullYear(), 4) + p2(d.getMonth() + 1) + p2(d.getDate()) + '_' +
    p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds()) + '_' + p2(d.getMilliseconds(), 3);
}

function nowStr(d = new Date()): string {
  return p2(d.getFullYear(), 4) + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' +
    p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
}

/** 从备份文件名解析时间（毫秒与老家六位微秒两种后缀都认）。 */
function parseStamp(name: string): Date | null {
  const m = /^home_backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(?:_(\d{1,6}))?\.zip$/.exec(name);
  if (!m) return null;
  const ms = m[7] ? Number(m[7].slice(0, 3).padEnd(3, '0')) : 0;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]), ms);
}

function daysBetween(from: Date, to = new Date()): number {
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

/** 备份目录（库目录下 `backups/`）——设置页「备份目录」那一项的取值口；只算路径，不建目录。 */
export function resolveBackupDir(): string {
  return join(resolveDbDir(), BACKUP_DIR_NAME);
}

function backupFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.zip')).sort();
}

function readHistory(dir: string): BackupRow[] {
  return backupFiles(dir).map((f) => {
    const st = statSync(join(dir, f));
    return { file: f, size: st.size, created_at: nowStr(st.mtime), days_ago: daysBetween(st.mtime) };
  });
}

function daysSinceLast(dir: string): number | null {
  const files = backupFiles(dir);
  if (!files.length) return null;
  const t = parseStamp(files[files.length - 1]);
  return t ? daysBetween(t) : null;
}

function pruneBackups(dir: string, keepN: number): void {
  const files = backupFiles(dir);
  for (const old of files.slice(0, Math.max(0, files.length - keepN))) {
    try { unlinkSync(join(dir, old)); } catch { /* 删不掉不挡本次备份，历史里仍在 */ }
  }
}

function esc1(s: string): string { return s.replace(/'/g, "''"); }

/** 备份：库快照（含 WAL）＋ 清单打包成 zip，保留 N 份、删最旧；返回回执载荷。 */
export function createBackup(opts: { keepN?: number } = {}): BackupResult {
  const keepN = opts.keepN ?? BACKUP_KEEP_N;
  if (!Number.isInteger(keepN) || keepN <= 0) throw new HomePolicyError('POLICY_BAD_INPUT', 'keep_n 须为正整数');
  const dbPath = resolveDbPath();
  if (!existsSync(dbPath)) throw new HomeFetchError('HOME_DB_MISSING', '库不存在，无可备份：' + dbPath);
  const dir = resolveBackupDir();
  mkdirSync(dir, { recursive: true });
  const base = stamp();
  let target = join(dir, BACKUP_PREFIX + base + '.zip');
  for (let i = 1; existsSync(target); i++) target = join(dir, BACKUP_PREFIX + base + '_' + i + '.zip');

  let dbBytes: Buffer;
  let items = 0;
  const snap = join(dir, '.snapshot-' + base + '.db');
  try {
    const handle = openHomeDb(dbPath);
    try {
      handle.db.exec("VACUUM INTO '" + esc1(snap) + "'");
      items = Number((handle.db.prepare('SELECT count(*) AS c FROM items').get() as { c: number }).c);
    } finally { closeHomeDb(handle); }
    dbBytes = readFileSync(snap);
  } catch (e) {
    throw new HomeFetchError('HOME_DB_UNREADABLE', '备份快照失败：' + (e as Error).message, { cause: e });
  } finally {
    try { if (existsSync(snap)) unlinkSync(snap); } catch { /* 临时件删不掉不挡备份 */ }
  }

  const created = nowStr();
  const manifest = { schema_version: EXPORT_SCHEMA_VERSION, created_at: created, db_filename: DB_FILENAME, items };
  const entries: ZipEntry[] = [
    { name: DB_FILENAME, data: dbBytes },
    { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 1) + '\n', 'utf8') },
  ];
  try { writeFileSync(target, zipWrite(entries)); }
  catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '备份写盘失败：' + target + '（' + (e as Error).message + '）', { cause: e }); }

  pruneBackups(dir, keepN);
  return {
    status: 'ok', keep_n: keepN, file: target, size: statSync(target).size, created_at: created,
    items, history: readHistory(dir), days_since_last: daysSinceLast(dir),
  };
}

/** 备份历史：现读盘，不缓存（面板／回执要的是当前真状态）。 */
export function listBackups(opts: { keepN?: number } = {}): BackupListResult {
  const keepN = opts.keepN ?? BACKUP_KEEP_N;
  const dir = resolveBackupDir();
  const history = readHistory(dir);
  return { status: 'ok', dir, keep_n: keepN, count: history.length, history, days_since_last: daysSinceLast(dir) };
}

function resolveBackupFile(file: string, dir: string): string {
  const abs = isAbsolute(file) ? file : join(dir, file);
  const base = basename(abs);
  if (!base.startsWith(BACKUP_PREFIX) || !base.endsWith('.zip')) {
    throw new HomePolicyError('POLICY_BAD_INPUT', '备份文件名不合规（须 ' + BACKUP_PREFIX + '*.zip）：' + base);
  }
  if (!existsSync(abs)) throw new HomePolicyError('POLICY_BAD_INPUT', '备份文件不存在：' + abs);
  return abs;
}

function countItems(dbPath: string): number {
  if (!existsSync(dbPath)) return 0;
  const handle = openHomeDb(dbPath);
  try { return Number((handle.db.prepare('SELECT count(*) AS c FROM items').get() as { c: number }).c); }
  finally { closeHomeDb(handle); }
}

/**
 * 导入恢复：拿备份里的 `home.db` 覆盖当前库；覆盖前先自备份一次（数据安全优先于便捷）。
 * `dryRun`＝预告支（SM8-4「文件选择(预告式)→ 校验 → 冲突预览 → 确认导入」的中间那一步）：只校验＋报数，不落盘。
 */
export function restoreBackup(file: string, opts: { keepN?: number; dryRun?: boolean } = {}): RestoreOutcome {
  if (!file) throw new HomePolicyError('POLICY_BAD_INPUT', '导入恢复须给 file（备份文件名或绝对路径）');
  const src = resolveBackupFile(file, resolveBackupDir());
  let entries: ZipEntry[];
  let dbBytes: Buffer;
  try {
    entries = zipRead(readFileSync(src));
    const hit = entries.find((e) => e.name === DB_FILENAME);
    if (!hit) throw new Error('备份内未找到 ' + DB_FILENAME);
    dbBytes = hit.data;
  } catch (e) {
    throw new HomePolicyError('POLICY_BAD_INPUT', '备份文件无效：' + src + '（' + (e as Error).message + '）');
  }

  const dbPath = resolveDbPath();
  if (opts.dryRun) {
    const mf = entries.find((e) => e.name === 'manifest.json');
    let inBackup: number | null = null;
    if (mf) {
      try {
        const j = JSON.parse(mf.data.toString('utf8')) as { items?: number };
        if (typeof j.items === 'number') inBackup = j.items;
      } catch { /* 清单坏就报 null，不谎报件数 */ }
    }
    const cur = countItems(dbPath);
    return {
      status: 'ok', dry_run: true, restored_from: src, items_in_backup: inBackup, items_current: cur,
      message: '预告通过：这份备份' + (inBackup === null ? '（件数未知）' : '含 ' + inBackup + ' 件') +
        '，当前库 ' + cur + ' 件；恢复会**整库覆盖**（恢复前自动自备份）。确认请给 confirm:true',
    };
  }

  const safety = createBackup(opts);
  // 覆盖前清掉 WAL／SHM：留着旧 WAL 会把刚恢复的库再改写坏。
  for (const side of ['-wal', '-shm']) {
    try { if (existsSync(dbPath + side)) unlinkSync(dbPath + side); } catch { /* 清不掉则下面写入会大声失败 */ }
  }
  try { writeFileSync(dbPath, dbBytes); }
  catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '写回数据库失败：' + dbPath + '（' + (e as Error).message + '）', { cause: e }); }

  let itemsTotal = 0;
  try { itemsTotal = countItems(dbPath); }
  catch (e) {
    throw new HomeFetchError('HOME_DB_UNREADABLE', '恢复后库不可读：' + dbPath + '（' + (e as Error).message + '）', { cause: e });
  }
  return {
    status: 'ok', restored_from: src, safety_backup: safety.file,
    before_items: safety.items, items_total: itemsTotal,
    message: '已从备份恢复：' + basename(src) + '（恢复前已自备份）',
  };
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const CSV_COLS = [
  'id', 'name', 'category', 'owner', 'purchase_price', 'remark',
  'location', 'quantity', 'location_status', 'purchase_date', 'expiration_date',
];

/** 导出：JSON＝全表可迁移；CSV＝物品 ⋈ 位置便携（列与老家 ops.py:620 逐列相同）。 */
export function exportData(opts: { format?: string; output?: string } = {}): ExportResult {
  const format = String(opts.format ?? 'json').toLowerCase();
  if (format !== 'json' && format !== 'csv') {
    throw new HomePolicyError('POLICY_BAD_INPUT', '不支持的格式：' + opts.format + '（只认 json／csv）');
  }
  const dbPath = resolveDbPath();
  if (!existsSync(dbPath)) throw new HomeFetchError('HOME_DB_MISSING', '库不存在，无可导出：' + dbPath);

  let text = '';
  let rows = 0;
  const handle = openHomeDb(dbPath);
  try {
    if (format === 'json') {
      const items = handle.db.prepare('SELECT * FROM items').all() as unknown[];
      const data = {
        schema_version: EXPORT_SCHEMA_VERSION,
        exported_at: nowStr(),
        items,
        item_locations: handle.db.prepare('SELECT * FROM item_locations').all(),
        item_tags: handle.db.prepare('SELECT * FROM item_tags').all(),
        categories: handle.db.prepare('SELECT * FROM categories').all(),
      };
      rows = items.length;
      text = JSON.stringify(data, null, 1) + '\n';
    } else {
      const rs = handle.db.prepare(
        'SELECT i.id, i.name, i.category, i.owner, i.purchase_price, i.remark, ' +
        'l.location, l.quantity, l.location_status, l.purchase_date, l.expiration_date ' +
        'FROM items i LEFT JOIN item_locations l ON l.item_id = i.id ORDER BY i.id',
      ).all() as Record<string, unknown>[];
      rows = rs.length;
      text = [CSV_COLS.join(','), ...rs.map((r) => CSV_COLS.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';
    }
  } finally { closeHomeDb(handle); }

  const out = opts.output
    ? resolve(opts.output)
    : join(resolveBackupDir(), 'home_export_' + stamp().replace(/_\d{3}$/, '') + (format === 'json' ? '.json' : '.csv'));
  try {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, text, 'utf8');
  } catch (e) {
    throw new HomeFetchError('HOME_DB_UNREADABLE', '导出写盘失败：' + out + '（' + (e as Error).message + '）', { cause: e });
  }
  return { status: 'ok', file: out, format, size: Buffer.byteLength(text, 'utf8'), rows };
}
