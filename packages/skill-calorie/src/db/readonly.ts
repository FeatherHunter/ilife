/**
 * #93 · 只读开库（取证基线／只读介质／他人库文件／备份文件）。
 *
 * 与 `openDb`（`src/schema.ts`）的分工，两者**语义不得混用**：
 * - `openDb(path)`：可写打开 ＋ `initDb`（终态 DDL ＋ 幂等迁移）。库不存在则建库，
 *   schema 落后则升级——即**会写库**。原语义保持不变（本票不改）。
 * - `openDbReadOnly(path)`：只读打开，**不建表、不迁移**；任何写入被 SQLite 拒绝
 *   （`attempt to write a readonly database`）。
 *
 * 用途：真库/他人库的取证读数、只读介质上的库、备份文件。库文件不存在时**直接抛**
 * （只读路径不隐式建库，避免"只读取证"悄悄造出一个空库）。
 */
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export function openDbReadOnly(dbPath: string): DatabaseSync {
  if (!existsSync(dbPath)) {
    throw new Error(
      '[skill-calorie] 只读开库失败：文件不存在 ' + dbPath +
        '（只读路径不建库；如需建库请用 openDb）',
    );
  }
  return new DatabaseSync(dbPath, { readOnly: true });
}
