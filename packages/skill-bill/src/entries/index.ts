/** skill-bill · 词条表集合（**加一门语言＝加一个语言键**，不改代码）。
 *
 *  取词一律经 base-entries 的 resolve（回退链：请求语言 → zh → en，全缺抛 MissingMessageError）：
 *  本文件不自己实现回退链、不实现求值端口——机制住公共层包，词住本包（ADR-0004 §2／§3）。
 *  形状照 `packages/base-render/src/entries/index.ts`（#1202 试点形状，不另起形状）。
 */
import { defineCatalog, type MessageId } from 'base-entries';
import { zh } from './zh.js';
import { en } from './en.js';

/** 本包词条表集合。key 类型从 zh 那份派生：**拼错 key 编译期红**（TS2345）。 */
export const SKILL_BILL_CATALOG = defineCatalog({ zh, en });

/** 本包词条 key 的窄类型。 */
export type SkillBillMessageId = MessageId<typeof SKILL_BILL_CATALOG>;
