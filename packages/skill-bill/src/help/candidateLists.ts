/** #1270 · 生成期候选清单（条目 10 的标签 ＋ 条目 9／12／13 查询页那半的分类／账户／账本）：
 *  「查标签」「查分类」「查账户」「查账本」这类槽位要**从已有值里选**，候选只能在生成 HELP 时取一次。
 *
 * 为什么在生成期取：#1273 查清 HELP 页是静态产物（浏览器里没有库），而
 * `packages/skill-bill/src/cli/cmd_read.ts` 的 HELP 那支跑在开库之前（`:238` 渲染、`:239` 才开库），
 * 所以本件自己**只读**打开库：照 `packages/skill-bill/src/health.ts:305-311` 的先例
 * （`new DatabaseSync(file, { readOnly: true })`：不建库、不迁移、不开 WAL），不碰 `openBillDb`
 * （那个会建库件、建表、加列）。
 *
 * 七张清单的口径：
 *   - `tags`：备注里的 `#词`（与 `fetch/db.js` 的 `tagMatch` 同一套分隔符，见 `tagsInNote`）。
 *     本机真库实测 2026-10-13：7366 条未删笔记切出 131 个词，其中 121 个是**全数字**（记录编号，
 *     如 `#0`／`#10385`）⇒ **全数字的词一律丢掉**（编号不是标签），真标签 10 个。
 *   - `categories`／`accounts`／`ledgers`：`bills` 表的三列（`category` 非空必填、`account`／`ledger`
 *     有默认值）。空白值丢掉；本机真库实测 2026-10-13：分类 141 个、账户 15 个、账本 3 个。
 *   - `accountTypes`（#1269 条目 19）：住 `goals.json`，不在库侧。
 *   - `debtParties`（#1270 条目 13）／`backups`（#1270 条目 22）：同批新增，取法与口径见各自函数上的注释。
 *
 * 排序＝出现次数降序、同次数按首次出现序（常用值排前面）；上限见两个 `*_LIMIT`
 * （标签噪声大、取前 40；分类／账户／账本是账目结构，要能选到任何一个，只留一个安全上限）。
 *
 * fail-open：库文件不在／打不开／表结构读不出，一律返空表——候选缺席时页面退回自由文本输入，
 * 用户仍能自己敲；「读不出候选」不是故障，不当错误上报（与 `helpInitialized` 同一条口径）。
 */
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { loadGoals, tagsInNote } from '../fetch/db.js';
import { listBackups } from '../setup/backups.js';

/** 标签候选上限：生成的 HELP 页是给人看的短表，取前 40 个足够；再多也点不过来。 */
export const TAG_CANDIDATE_LIMIT = 40;

/** 分类／账户／账本候选上限：它们是账目结构（选不到就等于缺功能），只留一个安全上限防意外。 */
export const LIST_CANDIDATE_LIMIT = 200;

/** 生成期读到的候选清单（`helpFile.js` 按字段声明的 `source` 各取一张）。 */
export interface HelpCandidateLists {
  readonly tags: readonly string[];
  readonly categories: readonly string[];
  readonly accounts: readonly string[];
  readonly ledgers: readonly string[];
  /** #1269 条目 19：账户类型（住 `goals.json` 账户表的 `type` 列，**不在 bills 表里**）。 */
  readonly accountTypes: readonly string[];
  /** #1270 条目 13：借贷过的对手方（只收「还有未还」的名字，见 `readDebtParties`）。 */
  readonly debtParties: readonly string[];
  /** #1270 条目 22：本机备份文件名（新→旧，见 `readBackupCandidates`）。 */
  readonly backups: readonly string[];
}

/** 读不出任何候选时的空快照（`helpSources.js` 的 catch 支路用）。 */
export const EMPTY_CANDIDATE_LISTS: HelpCandidateLists = {
  tags: [],
  categories: [],
  accounts: [],
  ledgers: [],
  accountTypes: [],
  debtParties: [],
  backups: [],
};

/** 库侧那四张的形状（`accountTypes`／`backups`／`debtParties` 都不住这张表）。 */
type DbLists = Omit<HelpCandidateLists, 'accountTypes' | 'backups' | 'debtParties'>;

/** 库侧那四张的空表（`readCandidateLists` 的早退／catch 支路用）。 */
const EMPTY_DB_LISTS: DbLists = {
  tags: [],
  categories: [],
  accounts: [],
  ledgers: [],
};

function isRecordNumber(word: string): boolean {
  return /^[0-9]+$/.test(word);
}

/** 纯函数：按出现次数降序（同次数按首次出现序）去重截断；空白值丢掉。 */
export function rankByFrequency(values: readonly string[], limit: number): string[] {
  const counts = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  let order = 0;
  for (const raw of values) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value === '') continue;
    if (!counts.has(value)) { firstSeen.set(value, order); order += 1; }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
  return [...counts.keys()]
    .sort((a, b) => {
      const byCount = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
      if (byCount !== 0) return byCount;
      return (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0);
    })
    .slice(0, cap);
}

/** 纯函数：把一批备注折成标签候选（全数字的词丢掉，其余同 `rankByFrequency`）。 */
export function rankTagCandidates(notes: readonly string[], limit: number = TAG_CANDIDATE_LIMIT): string[] {
  const words: string[] = [];
  for (const note of notes) {
    for (const word of tagsInNote(note)) {
      if (isRecordNumber(word)) continue;
      words.push(word);
    }
  }
  return rankByFrequency(words, limit);
}

/** #1269 条目 19：账户类型候选——`goals.json` 账户表每行的 `type`（用户可自造类型，故候选＝
 *  **已有账户写过的类型**，不是预置闭集）。文件不在／读不出即空表（同 fail-open 口径）；
 *  排序与上限同 `rankByFrequency`。读法走 `loadGoals`（纯读，不落默认件）。 */
export function readAccountTypes(goalsFile: string, limit: number = LIST_CANDIDATE_LIMIT): readonly string[] {
  if (typeof goalsFile !== 'string' || goalsFile === '' || !existsSync(goalsFile)) return [];
  try {
    const accounts = loadGoals(goalsFile).accounts;
    return rankByFrequency(
      accounts.map((row) => String((row as { readonly type?: unknown }).type ?? '')),
      limit,
    );
  } catch {
    return [];
  }
}

/** `bills` 一行里本域要的四列（`readCandidateLists` 与 `readCategoryCounts` 共用一份读法）。 */
interface BillRow {
  note?: unknown;
  category?: unknown;
  account?: unknown;
  ledger?: unknown;
}

/** 只读打开库、把 `bills` 读一遍（老库没有 `deleted_at` —— 那一列由 `openBillDb` 迁移加 ⇒ 退回不带过滤的读）。
 *  库不在／打不开／表读不出即 `null`，由调用方按「没有这份数据」处理（见模块头 fail-open）。 */
function readBillRows(dbFile: string): BillRow[] | null {
  if (typeof dbFile !== 'string' || dbFile === '' || !existsSync(dbFile)) return null;
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(dbFile, { readOnly: true });
    const columns = 'note, category, account, ledger';
    try {
      return db.prepare(`SELECT ${columns} FROM bills WHERE deleted_at IS NULL`).all() as BillRow[];
    } catch {
      return db.prepare(`SELECT ${columns} FROM bills`).all() as BillRow[];
    }
  } catch {
    return null;
  } finally {
    try { db?.close(); } catch { /* 关不上不影响已经算出的结果 */ }
  }
}

/** 只读读一遍库，返回库侧那四张候选清单（`accountTypes` 不住库、由 `readAccountTypes` 另读）。
 *  库不在／读不出即全空（见模块头 fail-open）。 */
export function readCandidateLists(
  dbFile: string,
  limit: number = LIST_CANDIDATE_LIMIT,
): DbLists {
  const rows = readBillRows(dbFile);
  if (rows === null) return EMPTY_DB_LISTS;
  const textOf = (row: BillRow, key: keyof BillRow): string => String(row[key] ?? '');
  return {
    tags: rankTagCandidates(rows.map((row) => textOf(row, 'note')), TAG_CANDIDATE_LIMIT),
    categories: rankByFrequency(rows.map((row) => textOf(row, 'category')), limit),
    accounts: rankByFrequency(rows.map((row) => textOf(row, 'account')), limit),
    ledgers: rankByFrequency(rows.map((row) => textOf(row, 'ledger')), limit),
  };
}

/** #1280 候选项附注的取数：`分类 → 该分类的账目笔数`（HELP 页「合并分类」原分类那格，行右侧印「N 笔」）。
 *  与候选清单同一条只读口径：库不在／打不开／表读不出＝空表 ⇒ 页面不印附注，也不报错。
 *  口径：未删账目按 `category` 分组计数；空白分类不进表（与候选清单「空白值丢掉」同一条）。 */
export function readCategoryCounts(dbFile: string): Readonly<Record<string, number>> {
  const rows = readBillRows(dbFile);
  if (rows === null) return {};
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = String(row.category ?? '').trim();
    if (value === '') continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

/** #1270 条目 13：借贷对手方——候选名 ＋ 每个名字的行右侧附注（两样一起出，省一次库读）。 */
export interface DebtPartyIndex {
  readonly names: readonly string[];
  readonly notes: Readonly<Record<string, string>>;
}

/** #1270 条目 13：从备注里解析借贷对手方。解析口径与 `analysis/scene-debt.js` **同一套**
 *  （借出＝`#借给<对象>`、借入＝`#向<对象>借`；`#未还` 出现在这条备注里＝这笔还没还），
 *  不另立第二份正则。`bills` 表没有「对手方」这一列，只能这么读。
 *
 *  候选范围（用户 2026-10-14 定的默认口径）：**只列还有未还的名字**——这格属于「查未还欠款」，
 *  选一个已还清的人必然查到空，列出来只会误导。一个都没剩 ⇒ 空表 ⇒ 该格退回自由文本（fail-open）。
 *  排序：未还笔数降序 → 总笔数降序 → 首次出现序；附注＝`未还 N 笔 · 共 M 笔`。 */
export function readDebtParties(dbFile: string, limit: number = LIST_CANDIDATE_LIMIT): DebtPartyIndex {
  const rows = readBillRows(dbFile);
  if (rows === null) return { names: [], notes: {} };
  const total = new Map<string, number>();
  const open = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  let order = 0;
  for (const row of rows) {
    const note = String(row.note ?? '');
    const hit = /#借给\s*([^\s#]+)/.exec(note) ?? /#向\s*([^\s#]+)借/.exec(note);
    const name = hit === null ? '' : hit[1].trim();
    if (name === '') continue;
    if (!total.has(name)) { firstSeen.set(name, order); order += 1; }
    total.set(name, (total.get(name) ?? 0) + 1);
    if (note.includes('#未还')) open.set(name, (open.get(name) ?? 0) + 1);
  }
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
  const names = [...total.keys()]
    .filter((name) => (open.get(name) ?? 0) > 0)
    .sort((a, b) => {
      const byOpen = (open.get(b) ?? 0) - (open.get(a) ?? 0);
      if (byOpen !== 0) return byOpen;
      const byTotal = (total.get(b) ?? 0) - (total.get(a) ?? 0);
      if (byTotal !== 0) return byTotal;
      return (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0);
    })
    .slice(0, cap);
  const notes: Record<string, string> = {};
  for (const name of names) {
    notes[name] = '未还 ' + String(open.get(name) ?? 0) + ' 笔 · 共 ' + String(total.get(name) ?? 0) + ' 笔';
  }
  return { names, notes };
}

/** #1270 条目 22：备份文件大小的行右侧写法（1 位小数；不足 1 KB 用 B）。 */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return String(Math.round(bytes)) + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** #1270 条目 22：备份候选——名字是**文件名**（`findBackup` 收的就是文件名，不猜最新），
 *  附注＝`生成时间 · 大小`。读法复用 `listBackups`（只收 `.db`、按时间新→旧、目录不在＝空表不是错误）；
 *  目录不在／读不出即空表 ⇒ 该格退回自由文本（fail-open，与其余候选同一条）。 */
export function readBackupCandidates(dir: string, limit: number = LIST_CANDIDATE_LIMIT): DebtPartyIndex {
  if (typeof dir !== 'string' || dir === '') return { names: [], notes: {} };
  try {
    const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
    const entries = listBackups(dir).slice(0, cap);
    const names: string[] = [];
    const notes: Record<string, string> = {};
    for (const entry of entries) {
      if (entry.file === '') continue;
      names.push(entry.file);
      notes[entry.file] = entry.time + ' · ' + formatBytes(entry.bytes);
    }
    return { names, notes };
  } catch {
    return { names: [], notes: {} };
  }
}
