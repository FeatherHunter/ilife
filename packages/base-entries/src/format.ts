// format：数字与日期的语言化形态，**直接用运行时自带的 Intl**（ADR-0004 §2：零依赖）。
//
// 本件只做两件事：把语言标识规范化成 Intl 认的小写 canonical 形，再调 Intl。
// 形态（分组符、小数点、年月日序、月名、时区…）一律由 Intl 与运行时的 ICU 数据决定：
// 本件不写任何语言分支、不硬编码任何语言的字面文案。
// 空串不是合法语言标识（「空串＝跟随调用方」由语言选择层先兜底）：本层不代它兜底，Intl 会抛 RangeError。
import { canonicalLanguage } from './language.js';

/** 格式化器缓存上限：超过就整体清空（语言×选项的组合有限，清空只是慢一次，不出错）。 */
const CACHE_LIMIT = 64;

/** 缓存键：语言 ＋ 选项 JSON。键序不同会各占一格，只少复用一次，不影响结果。 */
function cacheKey(language: string, options: object | undefined): string {
  return language + '\u0000' + JSON.stringify(options ?? null);
}

/** 取格式化器：命中复用，未命中新建（超上限先清空）。 */
function formatterOf<T>(cache: Map<string, T>, key: string, make: () => T): T {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const made = make();
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, made);
  return made;
}

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

/** 数字的语言化形态。`language` 大小写不敏感（`EN` 与 `en` 同形）。 */
export function formatNumber(language: string, value: number, options?: Intl.NumberFormatOptions): string {
  const tag = canonicalLanguage(language);
  const formatter = formatterOf(numberFormatters, cacheKey(tag, options), () => new Intl.NumberFormat(tag, options));
  return formatter.format(value);
}

/** 日期的语言化形态；`value` 收 Date 或时间戳。`language` 大小写不敏感。 */
export function formatDate(language: string, value: Date | number, options?: Intl.DateTimeFormatOptions): string {
  const tag = canonicalLanguage(language);
  const formatter = formatterOf(dateFormatters, cacheKey(tag, options), () => new Intl.DateTimeFormat(tag, options));
  return formatter.format(value);
}
