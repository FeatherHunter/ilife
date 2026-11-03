/**
 * #1323 · 宿主语言来路：把 DSH 设置里的 `locale.preference` 读出来，按技能调用形态追加进 argv。
 *
 * 三层职责分在这里与桥／工具两处：
 *   ① `localePreferenceOf` 只认 DSH settings 服务的公开描述面（`describe()` 的 locale 条目），
 *      任何一层缺席／抛错都降级 `undefined`（＝中文），绝不阻断工具调用；
 *   ② `callerLanguageReader` 把「读取」包成**每次调用现读**的函数：设置可在会话中 live 改；
 *   ③ `withCallerLanguage` 只做 argv 追加，参数名与 `base-link-core` 的 `CALLER_LANGUAGE_ARG`
 *      同一字面（单仓不许跨包 import 私家实现；对齐由根目录 i18n-language-1323 测试锁死）。
 *
 * 为什么读设置要走 `ctx.get('settings')` 而不是 inject：settings 是平台认可的**可选**服务，
 * `docs/agents/dsh-client-contract.md` 与宿主运行时的口径都是「Prefer ctx.get(name) with an
 * undefined check; use inject for hard dependencies」。写进 inject 会让六家插件在无该服务的
 * 宿主上起不来，而语言偏好本来只是锦上添花。
 */

/** 宿主透传给技能 CLI 的参数名：值是一个 BCP 47 语言串。 */
export const CALLER_LANGUAGE_FLAG = '--caller-language';

/** DSH settings 里 locale 条目的命名空间（`@deepseek-ai/dsh-client-locale` 注册名）。 */
export const LOCALE_SETTINGS_NAMESPACE = 'locale';

/** 该条目里语言偏好字段名。 */
export const LOCALE_PREFERENCE_FIELD = 'preference';

/** settings 服务只用到的一格：同步列出活跃条目描述符。 */
interface SettingsLike {
  describe?: () => unknown;
}

/** 描述符只需这两格（真实形状见 `dsh-settings` 的 SettingsForms.describe：{ns, value, …}）。 */
interface EntryLike {
  readonly ns?: unknown;
  readonly value?: unknown;
}

/** 从 settings 服务的 `describe()` 结果里取 `locale.preference`；取不到一律 `undefined`。 */
export function localePreferenceOf(settings: unknown): string | undefined {
  if (typeof settings !== 'object' || settings === null) return undefined;
  const describe = (settings as SettingsLike).describe;
  if (typeof describe !== 'function') return undefined;
  let rows: unknown;
  try {
    rows = describe.call(settings);
  } catch {
    return undefined;
  }
  if (!Array.isArray(rows)) return undefined;
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) continue;
    const entry = row as EntryLike;
    if (entry.ns !== LOCALE_SETTINGS_NAMESPACE) continue;
    const value = entry.value;
    if (typeof value !== 'object' || value === null) continue;
    const raw = (value as Record<string, unknown>)[LOCALE_PREFERENCE_FIELD];
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (trimmed !== '') return trimmed;
  }
  return undefined;
}

/** 最小宿主上下文：只认平台认可的软查找 `get(name)`（可缺席）。 */
export interface LocaleHostCtx {
  get?<T = unknown>(name: string): T | undefined;
}

/** 造一只「现读设置」的取数函数：读不到／读抛错都回 `undefined`（跟随缺省中文）。 */
export function callerLanguageReader(ctx: LocaleHostCtx | undefined): () => string | undefined {
  return () => {
    try {
      const settings = ctx?.get?.('settings');
      return localePreferenceOf(settings);
    } catch {
      return undefined;
    }
  };
}

/** 把调用方偏好追加进技能 CLI 的 argv：值为空／全空白＝不追加；已带同参数＝原样返回。 */
export function withCallerLanguage(argv: readonly string[], caller: string | undefined): string[] {
  const out = [...argv];
  if (typeof caller !== 'string' || caller.trim() === '') return out;
  if (out.includes(CALLER_LANGUAGE_FLAG)) return out;
  out.push(CALLER_LANGUAGE_FLAG, caller.trim());
  return out;
}
