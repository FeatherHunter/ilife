/**
 * 语言标识在本层只做一件事：**BCP 47 大小写不敏感**，取去空白的小写 canonical 形。
 *
 * 铁律二（概念唯一）：可用语言清单**不在这里，也不在本包任何地方**。清单与
 * 「未识别的值报错并列出可用语言」的唯一权威是
 * `packages/base-link-core/src/config/language.ts`（AVAILABLE_LANGUAGES／DEFAULT_LANGUAGE，
 * ADR-0004 §4）。本包零运行时依赖，故不 import 它、也不复制那份清单；只复述
 * 「大小写不敏感」这一条口径（去空白 ＋ 小写）。合法性判定仍归语言选择层：
 * 本层对任何 `string` 都走回退链，不判合法性。
 */

/** BCP 47 大小写不敏感：去空白后取小写 canonical 形（`EN` → `en`）。 */
export function canonicalLanguage(tag: string): string {
  return tag.trim().toLowerCase();
}
