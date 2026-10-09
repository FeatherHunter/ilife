// catalog：词条表的形状与 key 类型（ADR-0004 §2／§3）。
//
// 归属：件 `base-entries`（词条层）里「词条表本身」这一摊——基准语言、语言键、key 类型。
// 取词与回退链住同包的 `resolve.ts`，求值端口住 `evaluate.ts`。三件拆开的分层依据是
// 变化频率：表形状几乎不动，取词与回退链随语言增补变，求值实现由消费方可换。
//
// 铁律二（概念唯一）：**可用语言清单不在这里**。清单的唯一权威是
// `packages/base-link-core/src/config/language.ts`（AVAILABLE_LANGUAGES／DEFAULT_LANGUAGE，
// ADR-0004 §4）；本包零运行时依赖，故不 import 它、也不复制那份清单，`language` 一律只收 `string`。

/** 一门语言的词条表：key → 词条文本。 */
export type MessageTable = Readonly<Record<string, string>>;

/**
 * 词条表集合：基准语言那份表 ＋ 其余语言各一份。
 *
 * **加一门语言＝加一个语言键**（加一个词条文件即可）：不改代码、不改任何清单，
 * key 集合仍以基准语言那份表为准（ADR-0004 §1／§3）。
 */
export interface Catalog {
  /** 基准语言那份表：key 集合的权威，也是回退链的第二站。 */
  readonly zh: MessageTable;
  /** 其余语言各一份（语言键取小写 canonical 形）。 */
  readonly [language: string]: MessageTable;
}

/** 基准语言：词条表以它为准（`MessageId` 从它派生），也是回退链的第二站。 */
export const BASE_LANGUAGE = 'zh';

/**
 * 消息标识：从基准语言那份表的 key 派生。
 *
 * 拼错 key 在**编译期**报红（TS2345）；落地读数是 `test-d/message-id.test-d.ts` 里那条
 * `@ts-expect-error`——那份被本包 `tsconfig.json`（solution 工程）收进 `tsc -b`，
 * 指令若不再命中错误，tsc 会以「未使用的 @ts-expect-error」把它自己判红。
 */
export type MessageId<C extends Catalog> = keyof C[typeof BASE_LANGUAGE] & string;

/**
 * 定义词条表集合：原样返回入参，只为让调用处拿到**逐字窄类型**——
 * `MessageId<typeof catalog>` 是字面量联合，不是 `string`。`const` 类型参数＝调用处不必再写 `as const`。
 */
export function defineCatalog<const C extends Catalog>(catalog: C): C {
  return catalog;
}
