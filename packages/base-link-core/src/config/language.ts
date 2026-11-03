// config/language：语言选择的唯一定义地（#1198，ADR-0004 §4）。
//
// 归属：这是 config 能力里的一层（取值与回退的算法），不是新能力——
// 能力目录的第一层仍是 `config/`，铁律四不触发（没有新增 HELP 分组）。
// 全仓同一件事只有一个定义地：可用语言清单、缺省值、回退链、argv 形状都在这里，
// 6 技能只在自家默认值表里加 `language` 组（数据），判定一律调这里（铁律二）。
//
// 口径（ADR-0004 §4 ＋ #1198 票面）：
//   · 配置文件 `language.text`／`language.format`，空串＝跟随调用方，最终回退 `zh`；
//   · 命令行参数可覆盖（`--language`／`--format-language`，只认空格式，与各家既有解析同形）；
//   · 未识别的值报错并列出可用语言；值是 BCP 47（大小写不敏感，取小写 canonical 形）；
//   · 调用方偏好（宿主设置 locale.preference）由插件在 spawn 时以 `--caller-language <BCP47>`
//     追加进 argv（#1323）：它低于配置文件、高于缺省，不是用户显式覆盖（那仍是 `--language`）；
//   · 可用语言清单由词条目录生成（`tooling/gen-entry-catalogs.mjs`；加语言＝加词条文件＋`pnpm gen`）；
// text 与 format 两条链互相独立：format 空串时跟随调用方、无调用方回退 `zh`，
// 不跟随已解析的 text（ADR 原文“每键空串＝跟随调用方，缺省回退 zh”；format 跟随 text
// 的写法曾考虑过，否决理由：那是另一条回退语义，票面与 ADR 都没写，不能悄悄加魔法）。
import { ConfigError } from '../errors.js';
import { loadConfig } from './store.js';
import type { ConfigRecord } from './yaml.js';
import { AVAILABLE_LANGUAGES } from './languages.generated.js';

// 可用语言清单：唯一权威由 tooling/gen-entry-catalogs.mjs 从各包词条目录生成（#1322）。
// 加一门语言＝加词条文件＋跑 `pnpm gen` 重生成，这里不手写清单。
export { AVAILABLE_LANGUAGES };

/** 语言标识：上面清单的成员（清单随词条目录重生成，故这里是索引类型而不是手写联合）。 */
export type LanguageTag = (typeof AVAILABLE_LANGUAGES)[number];

/** 缺省语言（配置文件、调用方、argv 三处全空时的回退）。 */
export const DEFAULT_LANGUAGE: LanguageTag = 'zh';

/** 从 argv 里摘出的语言覆盖（只摘，不管对错——对错由 `resolveLanguage` 一处判）。 */
export interface LanguageArgs {
  readonly language: string | undefined;
  readonly formatLanguage: string | undefined;
}

/** 解析语言选择入参。 */
export interface ResolveLanguageOptions {
  /** 配置文件的值（`loadConfig` 回来的 `values`；缺 `language` 组＝两格都空串，老文件直接兼容）。 */
  readonly values?: unknown;
  /** 调用方（宿主插件读设置 `locale.preference` 透传过来那一位；空串／缺席＝没有调用方偏好）。
   *  程序内直调时可显式给；命令行路径由 {@link CALLER_LANGUAGE_ARG} 从 argv 摘（#1323）。 */
  readonly caller?: string | undefined;
  /** 完整 argv（含命令本身；覆盖最优先）。 */
  readonly argv?: readonly string[] | undefined;
}

/** 解析好的一对语言（文本语言／版式语言）。 */
export interface ResolvedLanguage {
  readonly text: LanguageTag;
  readonly format: LanguageTag;
}

/** 六家技能出口共用的那一步：读配置 ＋ 解语言，一次给全（#1198）。
 *
 *  为什么合成一件：六家 CLI 若各写一遍「先 loadXxxConfig() 再 resolveLanguage({values, argv})」，
 *  就等于把同一条链抄六处（铁律一）。技能的默认值表是数据，形状六家同构（`language` 组两格），
 *  故这里只收**表与主体名**，不收技能自己的类型。
 *
 *  空串＝跟随调用方（插件透传的设置值，见 docs/agents/多语言-宿主语言来路实测.md）；
 *  调用方链路已由 #1323 接通：插件把设置值作为 `--caller-language <BCP47>` 追加进 argv，
 *  `resolveLanguage` 统一摘取，故实际生效链＝`--language` ＞ `language.text` ＞ caller ＞ `zh`。 */
export interface SkillLanguageOptions {
  /** 技能配置文件主体名（configPaths 的那个 stem）。 */
  readonly stem: string;
  /** 该技能的默认值表（含 language 组）。 */
  readonly defaults: ConfigRecord;
  /** 已退休键名单（照该技能自己的那份传）。 */
  readonly retired?: readonly string[] | undefined;
  /** 完整 argv（含命令本身）；缺省不读参数。 */
  readonly argv?: readonly string[] | undefined;
  /** 调用方偏好（宿主读设置透传过来那一位；空串／缺席＝没有）。 */
  readonly caller?: string | undefined;
}

/** 读该技能配置并按同一口径解出文本语言与版式语言。 */
export function resolveSkillLanguage(options: SkillLanguageOptions): ResolvedLanguage {
  const loaded = loadConfig(options.stem, options.defaults, options.retired);
  return resolveLanguage({ values: loaded.values, caller: options.caller, argv: options.argv });
}

/** 出口参数解析件要摘的那两个 token：只认这两个名字，其余一律交回调用方自己判。
 *
 *  口径与 `parseLanguageArgs` 同一条：`--language <值>`／`--format-language <值>`，
 *  值是 BCP 47（大小写不敏感）；**这里只摘不判对错**——值合不合法由 `resolveLanguage` 一处判。 */
export function isLanguageArg(token: string): boolean {
  return token === '--language' || token === '--format-language';
}

/** 宿主透传调用方偏好的参数名（#1323）：值是该设置里的 BCP 47 串。
 *
 *  为什么另起一个参数而不复用 `--language`：`--language` 是**用户显式覆盖**，优先级最高；
 *  设置只是「用户没指定时跟随」，按 #1198 的链它必须低于配置文件（argv ＞ 配置 ＞ caller ＞ zh）。
 *  两个优先级不能共用一个 argv 形状，故宿主传这一枚，命令行解析件照 `--language` 同形只摘不判。
 *
 *  六家插件侧的镜像常量在 `dsh-life-pack` 根入口的 `CALLER_LANGUAGE_FLAG`（值同字面，
 *  单仓不许跨包 import 私家实现，对齐由 `test/i18n-language-1323.test.mjs` 锁死）。 */
export const CALLER_LANGUAGE_ARG = '--caller-language';

/** 出口参数解析件要跳过的宿主参数：只认名字，值由 {@link callerLanguageFromArgv} 统一摘。 */
export function isCallerLanguageArg(token: string): boolean {
  return token === CALLER_LANGUAGE_ARG;
}

/** 参数缺值的统一报错：两处 argv 解析共用一句文案（#1323 去重，台账 tooling/i18n-join-sites.json）。 */
function languageValueMissing(token: string): ConfigError {
  return new ConfigError('CONFIG_LANGUAGE_ARGV_MISSING', '参数「' + token + '」须带一个语言值（可用：' + AVAILABLE_LANGUAGES.join('、') + '）');
}

/** 从 argv 里摘宿主传的调用方偏好（只摘不判；缺值／值落在 `--` 开头即报错）。
 *
 *  与 `parseLanguageArgs` 分开：那件只摘两枚用户覆盖参数，返回形状被既有调用方
 *  （含默认值表的 `deepEqual` 断言）冻结；这件只在 `resolveLanguage` 内部用。 */
export function callerLanguageFromArgv(argv: readonly string[]): string | undefined {
  let caller: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== CALLER_LANGUAGE_ARG) continue;
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      throw languageValueMissing(CALLER_LANGUAGE_ARG);
    }
    caller = value;
    i++;
  }
  return caller;
}

/** 本次判定的调用方偏好：程序内显式传的优先；否则从 argv 摘（命令行路径）。 */
function callerOf(options: ResolveLanguageOptions): string {
  if (typeof options.caller === 'string' && options.caller.trim() !== '') return options.caller;
  if (options.argv === undefined) return '';
  return callerLanguageFromArgv(options.argv) ?? '';
}

/** BCP 47 大小写不敏感：两端去空白后取小写 canonical 形（`EN` → `en`）。 */
function canonical(raw: string): string {
  return raw.trim().toLowerCase();
}

/** 是不是可用语言（空串另有语义——跟随调用方，这里只判非空值）。 */
function isAvailable(tag: string): tag is LanguageTag {
  return (AVAILABLE_LANGUAGES as readonly string[]).includes(tag);
}

/** 未识别值的报错：点名这个值，并列出可用语言（#1198 验收“报错里列出可用语言”）。 */
function unknownLanguageError(where: string, raw: unknown): ConfigError {
  return new ConfigError(
    'CONFIG_UNKNOWN_LANGUAGE',
    '不认识的语言「' + String(raw) + '」（' + where + '）：可用语言为 '
    + AVAILABLE_LANGUAGES.join('、'),
  );
}

/** 从一串 argv 里摘 `--language`／`--format-language`（空格式；其余参数原样忽略）。 */
export function parseLanguageArgs(argv: readonly string[]): LanguageArgs {
  let language: string | undefined;
  let formatLanguage: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--language' || token === '--format-language') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw languageValueMissing(token);
      }
      if (token === '--language') language = value;
      else formatLanguage = value;
      i++;
    }
  }
  return { language, formatLanguage };
}

/** 从配置文件值里读 `language` 组（缺组／非组＝两格都空串；组内缺项＝空串）。 */
function groupOf(values: unknown): { text: string; format: string } {
  if (typeof values !== 'object' || values === null) return { text: '', format: '' };
  const group: unknown = (values as Record<string, unknown>)['language'];
  if (typeof group !== 'object' || group === null || Array.isArray(group)) return { text: '', format: '' };
  const record = group as Record<string, unknown>;
  return {
    text: typeof record['text'] === 'string' ? (record['text'] as string) : '',
    format: typeof record['format'] === 'string' ? (record['format'] as string) : '',
  };
}

/** 单条链：argv 覆盖 ＞ 配置文件 ＞ 调用方 ＞ 缺省。空串＝往下一级跟。 */
function resolveOne(raw: string, caller: string, where: string): LanguageTag {
  const tag = canonical(raw === '' ? caller : raw);
  if (tag === '') return DEFAULT_LANGUAGE;
  if (!isAvailable(tag)) throw unknownLanguageError(where, raw === '' ? caller : raw);
  return tag;
}

/**
 * 解出 effective 语言（text／format 各走各的同一条链）。
 *
 * 优先级（写死在这里，各家 CLI 与插件只传参，不重排）：
 * argv 覆盖 ＞ 配置文件 `language.*` ＞ 调用方偏好 ＞ `zh`。
 * 老配置文件里没有 `language` 组时两格都按空串走——升级不断（零行为差异，不启用即不变）。
 */
export function resolveLanguage(options: ResolveLanguageOptions = {}): ResolvedLanguage {
  const group = groupOf(options.values);
  const args = options.argv === undefined ? { language: undefined, formatLanguage: undefined } : parseLanguageArgs(options.argv);
  const callerRaw = callerOf(options);
  const caller = canonical(callerRaw);
  if (caller !== '' && !isAvailable(caller)) throw unknownLanguageError('调用方偏好', callerRaw);
  const textRaw = args.language !== undefined ? args.language : group.text;
  const formatRaw = args.formatLanguage !== undefined ? args.formatLanguage : group.format;
  return {
    text: resolveOne(textRaw, caller, 'language.text／--language'),
    format: resolveOne(formatRaw, caller, 'language.format／--format-language'),
  };
}
