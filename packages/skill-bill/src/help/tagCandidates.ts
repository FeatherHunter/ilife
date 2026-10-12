/** #1270 · 生成期候选（条目 10）：「查标签」这类槽位要**从已有标签里选**，候选只能在生成 HELP 时取。
 *
 * 为什么在生成期取：#1273 查清 HELP 页是静态产物（浏览器里没有库），而
 * `packages/skill-bill/src/cli/cmd_read.ts` 的 HELP 那支跑在开库之前（`:238` 渲染、`:239` 才开库），
 * 所以本件自己**只读**打开库：照 `packages/skill-bill/src/health.ts:305-311` 的先例
 * （`new DatabaseSync(file, { readOnly: true })`：不建库、不迁移、不开 WAL），不碰 `openBillDb`
 * （那个会建库件、建表、加列）。
 *
 * 词表口径（本机真库实测 2026-10-13：7366 条未删笔记）：`#` 后连续非分隔符算一个词，共 131 个；
 * 其中 121 个是**全数字**（记录编号，如 `#0`／`#10385`），真标签 10 个
 * （`#分期`×2、`#未还`×2、`#报销到账`、`#待报销`、`#借出`、`#借给小明`、`#借入`、`#退款`、`#向小红借`、`#MHL`）。
 * 故：**全数字的词一律丢掉**（编号不是标签）。排序＝出现次数降序、同次数按首次出现序；上限 `TAG_CANDIDATE_LIMIT`。
 *
 * fail-open：库文件不在／打不开／表结构读不出，一律返空表——候选缺席时页面退回自由文本输入，
 * 用户仍能自己敲一个标签；「读不出候选」不是故障，不当错误上报（与 `helpInitialized` 同一条口径）。
 */
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tagsInNote } from '../fetch/db.js';

/** 候选上限：生成的 HELP 页是给人看的短表，取前 40 个足够；再多也点不过来。 */
export const TAG_CANDIDATE_LIMIT = 40;

function isRecordNumber(word: string): boolean {
  return /^[0-9]+$/.test(word);
}

/** 纯函数：把一批备注折成候选词表（次数降序、同次数按首次出现序，截断到 `limit`）。 */
export function rankTagCandidates(notes: readonly string[], limit: number = TAG_CANDIDATE_LIMIT): string[] {
  const counts = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  let order = 0;
  for (const note of notes) {
    for (const word of tagsInNote(note)) {
      if (isRecordNumber(word)) continue;
      if (!counts.has(word)) { firstSeen.set(word, order); order += 1; }
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
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

/** 只读读一遍库，返回标签候选。库不在／读不出即 `[]`（见模块头 fail-open）。 */
export function readTagCandidates(dbFile: string, limit: number = TAG_CANDIDATE_LIMIT): string[] {
  if (typeof dbFile !== 'string' || dbFile === '' || !existsSync(dbFile)) return [];
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(dbFile, { readOnly: true });
    let rows: Array<{ note?: unknown }>;
    try {
      // 老库没有 deleted_at（那一列由 openBillDb 迁移加）⇒ 退回不带过滤的读，仍只取备注。
      rows = db.prepare('SELECT note FROM bills WHERE deleted_at IS NULL').all() as Array<{ note?: unknown }>;
    } catch {
      rows = db.prepare('SELECT note FROM bills').all() as Array<{ note?: unknown }>;
    }
    return rankTagCandidates(rows.map((row) => String(row.note ?? '')), limit);
  } catch {
    return [];
  } finally {
    try { db?.close(); } catch { /* 关不上不影响已经算出的结果 */ }
  }
}
