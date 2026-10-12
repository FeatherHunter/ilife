/** #1270 · 生成期候选清单（条目 10 的标签 ＋ 条目 9／12／13 查询页那半的分类／账户／账本）：
 *  「查标签」「查分类」「查账户」「查账本」这类槽位要**从已有值里选**，候选只能在生成 HELP 时取一次。
 *
 * 为什么在生成期取：#1273 查清 HELP 页是静态产物（浏览器里没有库），而
 * `packages/skill-bill/src/cli/cmd_read.ts` 的 HELP 那支跑在开库之前（`:238` 渲染、`:239` 才开库），
 * 所以本件自己**只读**打开库：照 `packages/skill-bill/src/health.ts:305-311` 的先例
 * （`new DatabaseSync(file, { readOnly: true })`：不建库、不迁移、不开 WAL），不碰 `openBillDb`
 * （那个会建库件、建表、加列）。
 *
 * 四个清单的口径：
 *   - `tags`：备注里的 `#词`（与 `fetch/db.js` 的 `tagMatch` 同一套分隔符，见 `tagsInNote`）。
 *     本机真库实测 2026-10-13：7366 条未删笔记切出 131 个词，其中 121 个是**全数字**（记录编号，
 *     如 `#0`／`#10385`）⇒ **全数字的词一律丢掉**（编号不是标签），真标签 10 个。
 *   - `categories`／`accounts`／`ledgers`：`bills` 表的三列（`category` 非空必填、`account`／`ledger`
 *     有默认值）。空白值丢掉；本机真库实测 2026-10-13：分类 141 个、账户 15 个、账本 3 个。
 *
 * 排序＝出现次数降序、同次数按首次出现序（常用值排前面）；上限见两个 `*_LIMIT`
 * （标签噪声大、取前 40；分类／账户／账本是账目结构，要能选到任何一个，只留一个安全上限）。
 *
 * fail-open：库文件不在／打不开／表结构读不出，一律返空表——候选缺席时页面退回自由文本输入，
 * 用户仍能自己敲；「读不出候选」不是故障，不当错误上报（与 `helpInitialized` 同一条口径）。
 */
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tagsInNote } from '../fetch/db.js';

/** 标签候选上限：生成的 HELP 页是给人看的短表，取前 40 个足够；再多也点不过来。 */
export const TAG_CANDIDATE_LIMIT = 40;

/** 分类／账户／账本候选上限：它们是账目结构（选不到就等于缺功能），只留一个安全上限防意外。 */
export const LIST_CANDIDATE_LIMIT = 200;

/** 生成期读到的四张候选清单（`helpFile.js` 按字段声明的 `source` 各取一张）。 */
export interface HelpCandidateLists {
  readonly tags: readonly string[];
  readonly categories: readonly string[];
  readonly accounts: readonly string[];
  readonly ledgers: readonly string[];
}

/** 读不出任何候选时的空快照（`helpSources.js` 的 catch 支路用）。 */
export const EMPTY_CANDIDATE_LISTS: HelpCandidateLists = {
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

/** 只读读一遍库，返回四张候选清单。库不在／读不出即全空（见模块头 fail-open）。 */
export function readCandidateLists(
  dbFile: string,
  limit: number = LIST_CANDIDATE_LIMIT,
): HelpCandidateLists {
  if (typeof dbFile !== 'string' || dbFile === '' || !existsSync(dbFile)) return EMPTY_CANDIDATE_LISTS;
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(dbFile, { readOnly: true });
    type Row = { note?: unknown; category?: unknown; account?: unknown; ledger?: unknown };
    let rows: Row[];
    const columns = 'note, category, account, ledger';
    try {
      // 老库没有 deleted_at（那一列由 openBillDb 迁移加）⇒ 退回不带过滤的读。
      rows = db.prepare(`SELECT ${columns} FROM bills WHERE deleted_at IS NULL`).all() as Row[];
    } catch {
      rows = db.prepare(`SELECT ${columns} FROM bills`).all() as Row[];
    }
    const textOf = (row: Row, key: keyof Row): string => String(row[key] ?? '');
    return {
      tags: rankTagCandidates(rows.map((row) => textOf(row, 'note')), TAG_CANDIDATE_LIMIT),
      categories: rankByFrequency(rows.map((row) => textOf(row, 'category')), limit),
      accounts: rankByFrequency(rows.map((row) => textOf(row, 'account')), limit),
      ledgers: rankByFrequency(rows.map((row) => textOf(row, 'ledger')), limit),
    };
  } catch {
    return EMPTY_CANDIDATE_LISTS;
  } finally {
    try { db?.close(); } catch { /* 关不上不影响已经算出的结果 */ }
  }
}
