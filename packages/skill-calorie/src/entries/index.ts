/** skill-calorie · 词条表集合（**加一门语言＝加一个语言键**，不改代码）。
 *
 *  取词一律经 base-entries 的 resolve（回退链：请求语言 → zh → en，全缺抛 MissingMessageError）：
 *  本文件不自己实现回退链、不实现求值端口——机制住公共层包，词住本包（ADR-0004 §2／§3）。
 *  形状照 `packages/skill-bill/src/entries/index.ts`（#1202 试点形状，不另起形状）。
 */
import { currentRenderLanguage, defineCatalog, resolve, type MessageId, type MessageParams } from 'base-entries';
import { zh } from './zh.js';
import { en } from './en.js';

/** 词条表集合的类型：**显式写出**，不靠 `defineCatalog` 推——本包 7600＋ 条 key，推出来的字面量
 *  联合超过 TS 声明文件序列化上限（TS7056，实测 #1320 合并后触发）。写成 `typeof zh` 引用，
 *  key 仍是逐字联合（拼错 key 照样编译期红），但声明文件只有这一行。 */
type SkillCalorieCatalog = { readonly zh: typeof zh; readonly en: typeof en };

/** 本包词条表集合。key 类型从 zh 那份派生：**拼错 key 编译期红**（TS2345）。 */
export const SKILL_CALORIE_CATALOG: SkillCalorieCatalog = defineCatalog({ zh, en });

/** 本包词条 key 的窄类型。 */
export type SkillCalorieMessageId = MessageId<typeof SKILL_CALORIE_CATALOG>;

/** 取一条词条：语言来自渲染语言上下文；未进入上下文＝zh，故不启用多语言时逐字节不变。 */
export function m(id: SkillCalorieMessageId, params?: MessageParams): string {
  return resolve(SKILL_CALORIE_CATALOG, currentRenderLanguage(), id, params);
}
