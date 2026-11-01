// resolve：按 key 取词条 ＋ 缺词条回退链（ADR-0004 §2）。
//
// 回退链口径（票 #1200）：候选＝[请求语言, 基准语言 zh, 终站 en]，按**首次出现去重**保序。
//   · zh → [zh, en]；en → [en, zh]；后续语言（如 ja）→ [ja, zh, en]；
//   · 任何一条链的兜底集合都是 {zh, en}，终点是 en（终站）；
//   · 全缺＝「缺词条」策略：抛 MissingMessageError，**不许静默出 undefined／空串**。
//     类型面 MessageId 保证 id 必是基准语言表里的 key（正常路径到不了「全缺」这一格），
//     但词条表是运行期数据（可来自外部文件、可被裁剪），故这一格仍必须显式抛错。
//   · 空白值（空串／纯空白）＝「未录」（票 #1306）：跳过该站继续沿链取，不许把空串当文案交给端口；
//     全部候选站都是空白才按缺词条抛。写模式第一批把英文列留空串＝待译，靠这条走中文回退。
import { BASE_LANGUAGE } from './catalog.js';
import type { Catalog, MessageId, MessageTable } from './catalog.js';
import { MissingMessageError } from './errors.js';
import { evaluate as defaultEvaluate } from './evaluate.js';
import type { Evaluate, MessageParams } from './evaluate.js';
import { canonicalLanguage } from './language.js';

/** 终站语言：回退链的最后一站（DSH 宿主口径：缺词条回退终止于 en）。 */
const TERMINAL_LANGUAGE = 'en';

/** 取词选项：只开一个口——把消息求值换成别的后端。 */
export interface ResolveOptions {
  /** 求值端口；缺省用本包默认的朴素实现（`evaluate.ts`）。契约见 docs/base/base-entries/端口契约.md。 */
  readonly evaluate?: Evaluate;
}

/** 回退链：请求语言 → 基准语言 → 终站，去重保序。空串（调用方没给语言）退化为 [zh, en]。 */
function fallbackChain(language: string): readonly string[] {
  const chain: string[] = [];
  for (const candidate of [canonicalLanguage(language), BASE_LANGUAGE, TERMINAL_LANGUAGE]) {
    if (candidate !== '' && !chain.includes(candidate)) chain.push(candidate);
  }
  return chain;
}

/** 按链上这一站取表：先逐字命中语言键，再按 canonical 形命中一次（表键大小写不敏感）。 */
function tableFor(catalog: Catalog, language: string): MessageTable | undefined {
  const exact = catalog[language];
  if (exact !== undefined) return exact;
  for (const key of Object.keys(catalog)) {
    if (canonicalLanguage(key) === language) return catalog[key];
  }
  return undefined;
}

/**
 * 表里读一条可用模板：按 `string | undefined` 读——表可能来自外部数据，运行期真会有缺口。
 *
 * 缺键与**空白值**都算「未录」（票 #1306）。空白值不当作显式空白：原样交给求值端口就等于
 * 在页面上留一块看不见的空白，不崩、不报错、机器也查不到；按未录处理才会继续沿回退链取到
 * 看得懂的那一站，全部语言都空白时由调用方收到 MissingMessageError。门禁同口径拒绝空白词条值
 * （tooling/check-i18n-entries.mjs），两头都不放行「留空串当待译」。
 */
function templateOf(table: MessageTable, id: string): string | undefined {
  const raw = (table as Readonly<Record<string, string | undefined>>)[id];
  if (raw === undefined || raw.trim() === '') return undefined;
  return raw;
}

/**
 * 按 key 取词条：请求语言 → 基准语言 zh → 终站 en，取到的那一条交给求值端口。
 *
 * 端口拿到的两种语言用途不同：`language`＝调用方请求的语言（读者语言，数字形态按它走）；
 * `sourceLanguage`＝实际取到这条词条的语言（回退命中时两者不同，真 ICU 后端按它判模板里的
 * 复数／选择类别）。
 */
export function resolve<C extends Catalog>(
  catalog: C,
  language: string,
  id: MessageId<C>,
  params?: MessageParams,
  options?: ResolveOptions,
): string {
  const requested = canonicalLanguage(language);
  const chain = fallbackChain(language);
  const evaluate = options?.evaluate ?? defaultEvaluate;
  for (const candidate of chain) {
    const table = tableFor(catalog, candidate);
    if (table === undefined) continue;
    const template = templateOf(table, id);
    if (template === undefined) continue;
    return evaluate({
      template,
      language: requested === '' ? candidate : requested,
      sourceLanguage: candidate,
      ...(params === undefined ? {} : { params }),
    });
  }
  throw new MissingMessageError(id, chain);
}
