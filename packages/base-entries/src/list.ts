// list：显示面列表连接符按语言（票 #1311，ADR-0004 §2 零依赖：只用运行时自带的 Intl）。
//
// 为什么住这里：列表连接符是**显示面**的排印，不是某一家的文案；六个技能与三个公共层包都有
// （全仓裸 join 157 处／152 行；逐处台账见 tooling/i18n-join-sites.json）。同一件事只许一个定义地（铁律二），故收成本包的两个导出。
//
// 口径：
//   · 非 en（zh 及未设语言、将来未知的 ja 等）：**逐字节等于 items.join('、')**——不启用多语言时产物不变；
//   · en：用 Intl.ListFormat('en', { style: 'long', type: 'conjunction' }) 得「A, B, and C」，
//     运行时没有 ListFormat（老 Node／裁剪 ICU）时退化成 items.join(', ')（写死半角逗号，不出顿号）；
//   · 空数组 → ''；单元素 → 原样（与 Array#join 同形，调用方 `x || 兜底` 的写法继续成立）。
//
// 语言标识口径与 ./language.js 一致（BCP 47 大小写不敏感）；判 en 只看**主标签**（'-' 前段），
// 故 en-US／EN-gb 都按 en。本层不复制语言清单、不判合法性（清单的唯一权威在 base-link-core）。
import { canonicalLanguage } from './language.js';

/** 语言主标签：去空白小写后取 '-' 前段（`en-US` → `en`，`zh-Hans-CN` → `zh`）。 */
function mainTag(language: string): string {
  const tag = canonicalLanguage(language);
  const cut = tag.indexOf('-');
  return cut < 0 ? tag : tag.slice(0, cut);
}

/** en 的连接符（单个英文串，不含语言分支——分支只在 mainTag 那一处判）。 */
const EN_CONJUNCTION = ', ';
const ZH_ENUMERATION = '、';
const ZH_PLUS = '＋';
const EN_PLUS = ' + ';

/** Intl.ListFormat 的最小形状：本件只用到「按连接词连成一串」这一件事。 */
interface ListFormatter {
  format(items: readonly string[]): string;
}
type ListFormatCtor = new (
  locales?: string | readonly string[],
  options?: { style?: 'long' | 'short' | 'narrow'; type?: 'conjunction' | 'disjunction' | 'unit' },
) => ListFormatter;

/** 缓存上限：语言组合有限，清空只是慢一次，不影响结果（与 format.ts 同一种写法）。 */
const CACHE_LIMIT = 8;

const enFormatters = new Map<string, ListFormatter>();

/** 取 en 的 ListFormat；运行时没有这个内建（老 Node／裁剪 ICU）就返回 undefined。 */
function enFormatter(): ListFormatter | undefined {
  const ctor = (Intl as unknown as { ListFormat?: ListFormatCtor }).ListFormat;
  if (ctor === undefined) return undefined;
  const cached = enFormatters.get('en');
  if (cached !== undefined) return cached;
  if (enFormatters.size >= CACHE_LIMIT) enFormatters.clear();
  const made = new ctor('en', { style: 'long', type: 'conjunction' });
  enFormatters.set('en', made);
  return made;
}

/** 列表连接：zh「、」，en「, 」「 and 」按英文惯用（含牛津逗号）。 */
export function listJoin(language: string, items: readonly string[]): string {
  if (mainTag(language) !== 'en') return items.join(ZH_ENUMERATION);
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  const formatter = enFormatter();
  // 退化分支：没有 Intl.ListFormat 时至少不出顿号（`A, B, C`，无连接词）。
  return formatter === undefined ? items.join(EN_CONJUNCTION) : formatter.format(items);
}

/** 加号连接：zh「＋」（全角，现状逐字节），en「 + 」（半角）。 */
export function plusJoin(language: string, items: readonly string[]): string {
  return items.join(mainTag(language) === 'en' ? EN_PLUS : ZH_PLUS);
}

/** 加号**符号本身**（不是连接符）：zh「＋」，en「+」。页面上的「展开选填」那类按钮用它。 */
export function plusSign(language: string): string {
  return mainTag(language) === 'en' ? '+' : ZH_PLUS;
}
