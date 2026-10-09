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
//   · 可用语言清单本期由代码常量给（后续改为从词条目录派生，见 #1198 遗留出口）。
// text 与 format 两条链互相独立：format 空串时跟随调用方、无调用方回退 `zh`，
// 不跟随已解析的 text（ADR 原文“每键空串＝跟随调用方，缺省回退 zh”；format 跟随 text
// 的写法曾考虑过，否决理由：那是另一条回退语义，票面与 ADR 都没写，不能悄悄加魔法）。
import { ConfigError } from '../errors.js';
import { loadConfig } from './store.js';
import type { ConfigRecord } from './yaml.js';

/** 可用语言清单（本期代码常量；后续从词条目录派生）。 */
export const AVAILABLE_LANGUAGES = ['zh', 'en'] as const;

/** 语言标识：本期即上面清单的成员。 */
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
  /** 调用方（宿主插件读设置 `locale.preference` 透传过来那一位；空串／缺席＝没有调用方偏好）。 */
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
 *  caller 本轮一律不传（正式接线归 #1198 的 CLI 收口那一步），故实际生效链＝
 *  `--language` ＞ `language.text` ＞ `zh`。 */
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
        throw new ConfigError('CONFIG_LANGUAGE_ARGV_MISSING', '参数「' + token + '」须带一个语言值（可用：' + AVAILABLE_LANGUAGES.join('、') + '）');
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
  const caller = typeof options.caller === 'string' ? canonical(options.caller) : '';
  if (caller !== '' && !isAvailable(caller)) throw unknownLanguageError('调用方偏好', options.caller);
  const textRaw = args.language !== undefined ? args.language : group.text;
  const formatRaw = args.formatLanguage !== undefined ? args.formatLanguage : group.format;
  return {
    text: resolveOne(textRaw, caller, 'language.text／--language'),
    format: resolveOne(formatRaw, caller, 'language.format／--format-language'),
  };
}
