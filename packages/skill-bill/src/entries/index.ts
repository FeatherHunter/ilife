/** skill-bill · 词条表集合（语言键与清单住同目录 catalog.generated.ts，由 tooling/gen-entry-catalogs.mjs 生成；加语言＝加词条文件＋跑 pnpm gen）。
 *
 *  取词一律经 base-entries 的 resolve（回退链：请求语言 → zh → en，全缺抛 MissingMessageError）：
 *  本文件不自己实现回退链、不实现求值端口——机制住公共层包，词住本包（ADR-0004 §2／§3）。
 *  形状照 `packages/base-render/src/entries/index.ts`（#1202 试点形状，不另起形状）。
 */
import { currentRenderLanguage, defineCatalog, resolve, type MessageId, type MessageParams } from 'base-entries';
import { ENTRY_TABLES, type EntryTables } from './catalog.generated.js';

/** 本包词条表集合。key 类型从 zh 那份派生：**拼错 key 编译期红**（TS2345）。 */
export const SKILL_BILL_CATALOG: EntryTables = defineCatalog(ENTRY_TABLES);

/** 本包词条 key 的窄类型。 */
export type SkillBillMessageId = MessageId<typeof SKILL_BILL_CATALOG>;

/** 取一条词条：语言来自渲染语言上下文；未进入上下文＝zh，故不启用多语言时逐字节不变。 */
export function m(id: SkillBillMessageId, params?: MessageParams): string {
  return resolve(SKILL_BILL_CATALOG, currentRenderLanguage(), id, params);
}
