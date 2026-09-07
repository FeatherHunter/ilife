/** base-paint/style：样式唯一真相源。
 *
 * 红线：样式只抖 render——改样式只改本文件，link-core/combos/单品包
 * 禁止自带样式常量。类名前缀统一 STYLE_PREFIX，token 表冻结。
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
