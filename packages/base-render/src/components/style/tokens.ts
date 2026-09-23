/** style · tokens
 *
 *  自 `src/style.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/style.ts` 切成「一份令牌 ＋ 一个区一件 ＋ 一个组装器」，
 *  正文原样搬来；搬迁判据＝产物逐字节相同（`buildStyleSheet()` 的 css 全文 ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

export const STYLE_PREFIX = 'ilife-';
export const STYLE_VERSION = '0.1.0';

export const STYLE_TOKENS = Object.freeze({
  radius: 8,
  gap: 8,
  fontSize: 13,
  fg: '#e6edf3',
  muted: '#8b8b95',
  accent: '#c084fc',
  danger: '#f85149',
  border: '#2a2d35',
  bg: '#16181d',
});

export type StyleTokenName = keyof typeof STYLE_TOKENS;

/** 类名拼接（自动加前缀，falsy 跳过）。 */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter((n): n is string => typeof n === 'string' && n.length > 0).map((n) => STYLE_PREFIX + n).join(' ');
}

/** 取 token（样式消费唯一入口，换肤时单点改）。 */
export function token(name: StyleTokenName): string {
  return String(STYLE_TOKENS[name]);
}

