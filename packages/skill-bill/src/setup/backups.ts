/** 开始使用域的文件面：**备份目录怎么扫、一份备份怎么造、怎么恢复回去、怎么验。
 *
 * 老侧对应件：`scripts/backup.py`（`create_backup`／`restore_backup`）与 `scripts/setup/cli.py` 的
 *   `cmd_backup_create`／`cmd_backup_list`／`cmd_restore`（备份＝库文件 ＋ 同名的 `goals.json` 影子件）。
 *
 * 三处**与老侧不同**、逐条记在 `docs/skills/skill-bill/t731-差异表.md`：
 *   ① 造一份备份时**先 `wal_checkpoint(TRUNCATE)` 再拷**（本仓库开着 WAL，直接拷主库文件会漏掉 WAL 里
 *      还没回写的事务）；老侧那一路是把库连接关掉之后 `shutil.copy2`（`backup.py:72-77`），新侧的连接归出口持有，
 *      故改用 checkpoint 达到同一目的；
 *   ② 备份的**存储形状**不同：老侧一份备份是**一个时间戳目录**（`backup.py:63-69`，目录里放库与 `goals.json`），
 *      新侧一份备份是**一个文件**（`backup.dir` ＋ `backup.stem`，`src/fetch/paths.ts:71-74`）＋ 同主体的影子件；
 *      同一秒内的冲突**两边都躲**（老侧给目录名追加 `_2`／`_3`，新侧给文件名追加 `_2`／`_3`）——这一条不是差异；
 *   ③ 恢复**无条件**先给现状造一份备份（老侧 `backup.py:122-124`，原样继承），并把这一份的名字交回调用方
 *      ——页面上要写清「不满意可以怎么回去」。
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { join, basename } from 'node:path';
import { backupFileName } from '../fetch/paths.js';
import { BillFetchError } from '../fetch/errors.js';
import type { BillDb } from '../fetch/index.js';

/** 一份备份（列表页一行／恢复向导那一段详情都读它）。 */
export interface BackupEntry {
  /** 文件名（备份目录里那一份的名字，如 `biscuit_20260918_120000.db`）。 */
  readonly file: string;
  /** 绝对路径（恢复时照它读）。 */
  readonly path: string;
  /** 备份时刻（按文件名里的时间戳解；解不出退回文件修改时间）。 */
  readonly time: string;
  /** 库文件字节数。 */
  readonly bytes: number;
  /** 同名影子件（`goals.json` 的备份）在不在。 */
  readonly hasGoals: boolean;
  /** 影子件字节数（没影子件＝0）。 */
  readonly goalsBytes: number;
}

/** 备份文件名里的时间戳（`YYYYMMDD_HHMMSS`；本地时钟，与文件修改时间同源）。 */
export function backupStampOf(at: Date): string {
  const p = (n: number, w = 2): string => String(n).padStart(w, '0');
  return String(at.getFullYear()) + p(at.getMonth() + 1) + p(at.getDate())
    + '_' + p(at.getHours()) + p(at.getMinutes()) + p(at.getSeconds());
}

/** 文件名字戳解回人话时刻（`YYYY-MM-DD HH:MM:SS`）；解不出给空串（由调用方退回文件修改时间）。 */
export function stampToTime(file: string): string {
  const m = /(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/.exec(file);
  if (m === null) return '';
  return m[1] + '-' + m[2] + '-' + m[3] + ' ' + m[4] + ':' + m[5] + ':' + m[6];
}

/** 备份目录里的一份（库文件名 → 条目；读不到给 `null`，由调用方按「没有这一份」处置）。 */
function entryOf(dir: string, file: string): BackupEntry | null {
  const path = join(dir, file);
  try {
    const st = statSync(path);
    const goalsFile = goalsSiblingOf(file);
    const goalsPath = join(dir, goalsFile);
    const hasGoals = existsSync(goalsPath);
    return {
      file,
      path,
      time: stampToTime(file) !== '' ? stampToTime(file) : st.mtime.toISOString().slice(0, 19).replace('T', ' '),
      bytes: st.size,
      hasGoals,
      goalsBytes: hasGoals ? statSync(goalsPath).size : 0,
    };
  } catch { return null; }
}

/** 一份备份的影子件名（`x.db` → `x.goals.json`；老侧同一算式 `name.replace('.db', '.goals.json')`）。 */
function goalsSiblingOf(file: string): string {
  return file.endsWith('.db') ? file.slice(0, -3) + '.goals.json' : file + '.goals.json';
}

/** 备份目录里的全部备份，**新→旧**（列表页与「默认用最新一份」都读它）。
 *  目录不存在＝还没有备份过（空表，不是错误——老侧 `cmd_backup_list` 同）。 */
export function listBackups(dir: string): readonly BackupEntry[] {
  if (!existsSync(dir)) return [];
  const out: BackupEntry[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.db')) continue;
    const e = entryOf(dir, f);
    if (e !== null) out.push(e);
  }
  return out.sort((a, b) => (a.time === b.time ? (a.file < b.file ? 1 : -1) : a.time < b.time ? 1 : -1));
}

/** 按名字找一份备份（名字可带路径：只取末段；找不到给 `null`——不猜、不退回最新一份）。 */
export function findBackup(dir: string, name: string): BackupEntry | null {
  if (name === '') return null;
  return entryOf(dir, basename(name.trim()));
}

/** 选中的那一份：给了名字照它找，没给用最新的一份（**同源**：详情与确认文本都读这一件的返回值）。 */
export function selectedBackup(dir: string, name: string): BackupEntry | null {
  if (name !== '') return findBackup(dir, name);
  const all = listBackups(dir);
  return all.length === 0 ? null : all[0];
}

/** SQLite 字符串字面量（Windows 路径里的 `'` 要翻倍；反斜杠原样可用）。 */
function sqlLiteral(p: string): string {
  return "'" + p.replace(/'/g, "''") + "'";
}

/** 造一份备份：库 ＋（有就带上）影子件。**无条件**——调用方不判「用户记不记得」。
 *  同一秒已有一份时不覆盖：换 `_2`／`_3` 后缀（老侧会静默覆盖，本件不照抄）。 */
export function createBackup(input: {
  readonly db: BillDb;
  readonly dir: string;
  readonly stamp: string;
  /** 影子件的来源（配置定的 `goals.json` 落点）；文件不在就只备份库那一半。 */
  readonly goalsPath: string;
}): BackupEntry {
  mkdirSync(input.dir, { recursive: true });
  const path = uniquePath(input.dir, backupFileName(input.stamp));
  // WAL 模式下主库文件里可能缺着最近几次提交：先 checkpoint 再拷，拷出来才是完整一份。
  try { input.db.db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch { /* 非 WAL 或只读连接：退回直接拷 */ }
  copyFileSync(input.db.path, path);
  const goalsCopy = join(input.dir, goalsSiblingOf(basename(path)));
  if (existsSync(input.goalsPath)) {
    try { copyFileSync(input.goalsPath, goalsCopy); } catch { /* 影子件可缺：库那一半照样是完整的 */ }
  }
  const made = entryOf(input.dir, basename(path));
  if (made === null) throw new BillFetchError('BILL_DB_UNREADABLE', '备份写完后读不到：' + path);
  return made;
}

/** 同名文件已存在就换 `_2`／`_3`…（同一秒连造两份时不覆盖前一份）。 */
function uniquePath(dir: string, file: string): string {
  if (!existsSync(join(dir, file))) return join(dir, file);
  const stem = file.endsWith('.db') ? file.slice(0, -3) : file;
  for (let i = 2; i < 100; i += 1) {
    const candidate = join(dir, stem + '_' + String(i) + '.db');
    if (!existsSync(candidate)) return candidate;
  }
  throw new BillFetchError('BILL_DB_UNREADABLE', '备份目录里同名文件太多，换个时刻再试：' + file);
}

/** 恢复回去：覆盖库文件（有影子件就连影子件一起），并清掉可能残留的 WAL 旁件。
 *  **调用方必须先关掉手上的库句柄**（Windows 上覆盖打开着的文件会失败，且 WAL 旁件会与恢复回来的库打架）。 */
export function restoreBackup(input: { readonly entry: BackupEntry; readonly dbPath: string; readonly goalsPath: string }): void {
  copyFileSync(input.entry.path, input.dbPath);
  for (const suffix of ['-wal', '-shm']) {
    const side = input.dbPath + suffix;
    if (existsSync(side)) rmSync(side, { force: true });
  }
  if (input.entry.hasGoals) {
    const source = join(input.entry.path, '..', goalsSiblingOf(input.entry.file));
    try { copyFileSync(source, input.goalsPath); } catch { /* 影子件拷不动不阻断：库那一半已恢复 */ }
  }
}

/** 恢复之后**验库可读**（老侧 `restore.html:136-146` 的 `SELECT 1 FROM bills LIMIT 1`；失败要把现状备份点名）。
 *  新开一条连接验（手上那条已随恢复关闭），验完即关。 */
export function verifyRestored(dbPath: string): { readonly ok: boolean; readonly why: string } {
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(dbPath);
    db.prepare('SELECT 1 FROM bills LIMIT 1').all();
    return { ok: true, why: '' };
  } catch (e) {
    return { ok: false, why: (e as Error).message };
  } finally {
    try { db?.close(); } catch { /* ignore */ }
  }
}

/** 字节数写成人话（列表页与回执页共用一处）。 */
export function humanBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return String(n) + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}
