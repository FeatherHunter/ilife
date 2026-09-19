/** 开始使用域的 CSV 导入面：**读文件 → 认列 → 排一遍计划（新增／重复／坏行）→ 真写**。
 *
 * 老侧对应件：`scripts/setup/cli.py` 的 `_read_csv_rows`（478-492）／`guess_mapping`（455-475）／
 *   `build_import_payload`（495-559）／`cmd_import` 的写库循环（587-645），字段标签同 `MAPPING_HINTS`（62-70）。
 *   老侧逐块取证见 `.scratch/t731/old-setup.md` §6。
 *
 * **`#688` §二 D2 的「导入四件」在这里逐件落地**（老侧四件全无，逐条证据见 `t731-差异表.md`）：
 *   ① 明示「本次将新增 N 行、不覆盖已有记录」——`planImport` 算出来的 `newRows`／`duplicates`／`bad` 三档，
 *      页面照它出话（老侧只报文件总行数，`import.html:158/161`）；
 *   ② 导入前**自动备份一次**——住在 `./run.js`（导入这条路先调 `createBackup`，见那里的顺序）；
 *   ③ **重复导入检测**——本件的 `planImport` 拿库里已有的记录（`time|amount|category|note` 四件签名）逐行比，
 *      同一个 CSV 导两次，第二次的每一行都会落进 `duplicates`（老侧 `db.py:85-89` 是纯 INSERT，无去重）；
 *   ④ **页面级结果卡**——`applyImport` 回成功／失败行数与失败原因（老侧失败只在 stdout，页面 0 命中）。
 *
 * 两处**有意与老侧不同**（都写进差异表）：
 *   - 老侧逐行 `insert_record`（每行开一次连接、各自 commit，`db.py:82/89`）——中途失败已写的行不回退；
 *     新侧**整批一个事务**：要么全进，要么全不进（失败行先剔除，剩下的都是能写的）；
 *   - 老侧 `total` 把被跳过的空行也算进去（`cli.py:632` 对 `597-598`）——新侧三档分开报，不混一个数。
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { BillFetchError, BillPolicyError } from '../fetch/errors.js';
import { addBill, fetchAll } from '../fetch/index.js';
import type { BillDb, BillRow } from '../fetch/index.js';
import { validateAmount, validateCategory } from '../shared/category.js';
import { validateTime } from '../shared/dateRange.js';

/** 导入认的六个字段（老侧 `MAPPING_HINTS` 里除「收支方向」外的六项——方向由金额符号定，见下）。 */
export type ImportField = 'time' | 'amount' | 'category' | 'account' | 'ledger' | 'note';

/** 字段序号（列映射的取值面）。 */
export const IMPORT_FIELDS: readonly ImportField[] = ['time', 'amount', 'category', 'account', 'ledger', 'note'];

/** 字段的中文名（老侧字段标签同集；页面与报错共用一处）。 */
export const FIELD_LABEL: Readonly<Record<ImportField, string>> = {
  time: '日期/时间',
  amount: '金额',
  category: '分类',
  account: '账户',
  ledger: '账本',
  note: '备注',
};

/** 必填三列（老侧 `MAPPING_HINTS` 的 `必填` 标记：日期／金额／分类）。 */
export const REQUIRED_FIELDS: readonly ImportField[] = ['time', 'amount', 'category'];

/** 老侧的缺省列序（无表头或猜不出时的兜底：`cli.py:469-474` 缺 date→1／amount→2／category→3）。 */
export const DEFAULT_ORDER: Readonly<Record<ImportField, number>> = {
  time: 0, amount: 1, category: 2, account: 3, ledger: 4, note: 5,
};

/** 表头关键词（老侧 `MAPPING_HINTS` 的中文词集 ＋ 英文小写；命中即认）。 */
const HEADER_WORDS: Readonly<Record<ImportField, readonly string[]>> = {
  time: ['日期', '时间', '交易时间', '记账日期', 'date', 'time'],
  amount: ['金额', '数额', 'amount', 'money'],
  category: ['分类', '类别', 'category'],
  account: ['账户', '帐号', 'account'],
  ledger: ['账本', '帐本', 'ledger'],
  note: ['备注', '摘要', 'note', 'memo'],
};

/** 预览取前几行（老侧 `cli.py:545` 的 `Math.min(8, …)` 同数）。 */
export const PREVIEW_ROWS = 8;

/** 读出来的一张 CSV（表头／数据行／编码）。 */
export interface CsvFile {
  readonly file: string;
  readonly name: string;
  readonly encoding: string;
  readonly hasHeader: boolean;
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

/** 列映射（字段 → 0 起的列号；缺项＝没映射）。 */
export type ColumnMap = { readonly [k in ImportField]?: number };

/** 一条排好的待写行。 */
export interface ImportRow {
  readonly line: number;
  readonly time: string;
  readonly amount: number;
  readonly category: string;
  readonly account: string;
  readonly ledger: string;
  readonly note: string;
}

/** 一条读不出来的行（哪一行／为什么）。 */
export interface BadRow {
  readonly line: number;
  readonly why: string;
}

/** 一条与库里已有记录重号的行。 */
export interface DuplicateRow {
  readonly line: number;
  readonly signature: string;
}

/** 这一次导入的计划（页面照它说「将新增几行」，写库照它写）。 */
export interface ImportPlan {
  readonly rows: readonly ImportRow[];
  readonly duplicates: readonly DuplicateRow[];
  readonly bad: readonly BadRow[];
  readonly newRows: number;
}

/** 一条记录的签名（重复检测的判据：时刻＋金额＋分类＋备注四件，**不经数据库**）。 */
export function signatureOf(r: { time: string; amount: number; category: string; note: string }): string {
  return [r.time.trim(), r.amount.toFixed(2), r.category.trim(), r.note.trim()].join('|');
}

/** 解码：先按 UTF-8 读，出现替换字符再按 GBK 读（老侧 `cli.py:482-488` 的 `utf-8-sig → gbk` 同序）。 */
function decode(raw: Buffer): { text: string; encoding: string } {
  const utf8 = raw.toString('utf8').replace(/^\uFEFF/, '');
  if (!utf8.includes('\uFFFD')) return { text: utf8, encoding: 'UTF-8' };
  try {
    const gbk = new TextDecoder('gbk').decode(raw);
    return { text: gbk, encoding: 'GBK' };
  } catch { return { text: utf8, encoding: 'UTF-8（有读不出的字符）' }; }
}

/** 一行拆成格子：照老侧按逗号切（`cli.py:597-598`），引号不特殊处理——本仓不替用户猜 CSV 方言。 */
function cellsOf(line: string): readonly string[] {
  return line.split(',').map((c) => c.trim());
}

/** 首行是不是表头：命中任一关键词即当表头（老侧 `cli.py:509-525` 同判法）。 */
function looksLikeHeader(cells: readonly string[]): boolean {
  const words = Object.values(HEADER_WORDS).flat();
  return cells.some((c) => words.includes(c.trim().toLowerCase()) || words.includes(c.trim()));
}

/** 读一张 CSV（缺文件／空文件在这一层报「取数失败」；坏在文件本身，不是缺参数）。 */
export function readCsv(file: string): CsvFile {
  let raw: Buffer;
  try { raw = readFileSync(file); } catch (e) {
    throw new BillFetchError('BILL_DB_MISSING', '导入文件读不出来：' + file, { cause: e });
  }
  const { text, encoding } = decode(raw);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
  if (lines.length === 0) throw new BillFetchError('BILL_BAD_QUERY', 'CSV 一行都没有：' + file);
  const first = cellsOf(lines[0] as string);
  const hasHeader = looksLikeHeader(first);
  return {
    file,
    name: basename(file),
    encoding,
    hasHeader,
    header: hasHeader ? first : first.map((_c, i) => '列' + String(i + 1)),
    rows: (hasHeader ? lines.slice(1) : lines).map((l) => cellsOf(l)),
  };
}

/** 按表头猜映射（猜不出的必填项用老侧缺省列序兜底）。 */
export function guessMap(csv: CsvFile): ColumnMap {
  const out: Record<string, number> = {};
  for (const field of IMPORT_FIELDS) {
    const words = HEADER_WORDS[field];
    const hit = csv.header.findIndex((h) => {
      const cell = h.trim().toLowerCase();
      return words.some((w) => cell === w.toLowerCase() || (cell !== '' && cell.includes(w.toLowerCase())));
    });
    if (hit >= 0 && !Object.values(out).includes(hit)) out[field] = hit;
  }
  for (const field of IMPORT_FIELDS) {
    if (out[field] !== undefined) continue;
    const fallback = DEFAULT_ORDER[field];
    if (fallback < csv.header.length && !Object.values(out).includes(fallback)) out[field] = fallback;
  }
  return out as ColumnMap;
}

/** 解析用户写的映射原文（`日期=第1列,金额=第3列`；也认 `time=1` 这种）。认不得即抛——**不猜**。 */
export function parseMapping(text: string): ColumnMap {
  const out: Record<string, number> = {};
  for (const piece of text.split(/[,，]/).map((p) => p.trim()).filter((p) => p !== '')) {
    const m = /^(.+?)\s*=\s*(?:第)?\s*(\d+)\s*列?$/.exec(piece);
    if (m === null) throw new BillPolicyError('POLICY_BAD_INPUT', '列映射写不明白：' + piece
      + '（照「日期=第1列,金额=第3列」这样写）');
    const label = (m[1] as string).trim().toLowerCase();
    const col = Number(m[2]) - 1;
    if (!Number.isInteger(col) || col < 0) throw new BillPolicyError('POLICY_BAD_INPUT', '列号要从 1 起数：' + piece);
    const field = IMPORT_FIELDS.find((f) => f === label
      || FIELD_LABEL[f] === (m[1] as string).trim()
      || HEADER_WORDS[f].some((w) => w.toLowerCase() === label));
    if (field === undefined) {
      throw new BillPolicyError('POLICY_BAD_INPUT', '认不得这一列是哪个字段：' + (m[1] as string).trim()
        + '（认这些：' + IMPORT_FIELDS.map((f) => FIELD_LABEL[f]).join('／') + '）');
    }
    out[field] = col;
  }
  return out as ColumnMap;
}

/** 必填三列里还缺哪些（空数组＝可以往下走）。 */
export function missingRequired(map: ColumnMap): readonly ImportField[] {
  return REQUIRED_FIELDS.filter((f) => map[f] === undefined);
}

/** 一格取值（列号越界或没映射＝空串）。 */
function cell(row: readonly string[], col: number | undefined): string {
  if (col === undefined || col < 0 || col >= row.length) return '';
  return (row[col] as string).trim();
}

/** 排一遍导入计划：逐行试读，读得动的进 `rows`，与库里重号的进 `duplicates`，读不动的进 `bad`。 */
export function planImport(csv: CsvFile, map: ColumnMap, existing: readonly BillRow[]): ImportPlan {
  const known = new Set(existing.map((r) => signatureOf(r)));
  const rows: ImportRow[] = [];
  const duplicates: DuplicateRow[] = [];
  const bad: BadRow[] = [];
  const seen = new Set<string>();
  csv.rows.forEach((cells, i) => {
    const line = i + (csv.hasHeader ? 2 : 1);
    if (cells.every((c) => c === '')) return; // 整行空白：跳过，不计入任何一档（老侧同样跳）
    const rawTime = cell(cells, map.time);
    const rawAmount = cell(cells, map.amount);
    const rawCategory = cell(cells, map.category) === '' ? '其他' : cell(cells, map.category);
    try {
      const time = validateTime(rawTime);
      // 老侧没有「收支方向」这一格时按符号定：金额栏自带方向上，`cli.py:614-617` 的方向列本仓不收。
      const amount = validateAmount(rawAmount);
      const category = validateCategory(rawCategory);
      const row: ImportRow = {
        line, time, amount, category,
        account: cell(cells, map.account),
        ledger: cell(cells, map.ledger) === '' ? '生活' : cell(cells, map.ledger),
        note: cell(cells, map.note),
      };
      const sig = signatureOf(row);
      if (known.has(sig) || seen.has(sig)) { duplicates.push({ line, signature: sig }); return; }
      seen.add(sig);
      rows.push(row);
    } catch (e) {
      bad.push({ line, why: (e as Error).message });
    }
  });
  return { rows, duplicates, bad, newRows: rows.length };
}

/** 真写：整批一个事务（要么全进、要么全不进），返回成功行数与读不出来的行。
 *  计划里已经剔过坏行，故正常路径下失败为空；写库中途抛错即回滚并把那一条记进 `failed`。 */
export function applyImport(db: BillDb, plan: ImportPlan): { readonly inserted: number; readonly failed: readonly BadRow[] } {
  const failed: BadRow[] = [];
  let inserted = 0;
  db.db.exec('BEGIN');
  try {
    for (const row of plan.rows) {
      try {
        addBill(db, {
          category: row.category, amount: row.amount, time: row.time,
          account: row.account, ledger: row.ledger, currency: '人民币', note: row.note,
        });
        inserted += 1;
      } catch (e) {
        failed.push({ line: row.line, why: (e as Error).message });
      }
    }
    db.db.exec('COMMIT');
  } catch (e) {
    try { db.db.exec('ROLLBACK'); } catch { /* 回滚失败也照样抛下面那句 */ }
    throw new BillFetchError('BILL_DB_UNREADABLE', '导入写库失败，整批回滚了：' + (e as Error).message);
  }
  return { inserted, failed };
}

/** 库里现有记录（重复检测的对照面）。 */
export function existingRows(db: BillDb): readonly BillRow[] {
  return fetchAll(db, { includeDeleted: true });
}
