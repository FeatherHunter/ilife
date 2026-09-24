/** skin/neutral · **中性**（现网那一档，**已重调**）。
 *
 *  它是什么：浅灰底、白卡、14px 圆角、蓝图蓝——即 2026-09 之前现网页面用的那一套。
 *
 *  **为什么重调**（证据，不是口味）：60 件原型墙里 11 处打到 ≤2 的否定，有 9 处与这一档有关
 *  （6 处只在它下面难看、2 处三套全否）。逐条看，问题不在配色偏好，而在**层次手段不够**：
 *   ① 弱文字 `--fg3 #86868b` 对白底只有 3.63:1，够不上 4.5 地板 ⇒ 标签类文字一律发虚；
 *   ② 软底 `--soft #f5f8ff` 偏蓝，与中性底拼在一起像"另一套色"，软底块立不起来；
 *   ③ 分隔线 `--line #d2d2d7` 偏浅，密度高的行组读不出一行到哪结束。
 *  重调只做这三件事，不动它的性格（还是浅灰白卡圆角 blueprint 蓝）。
 */
import type { SkinTokenName } from '../contract.js';

export const NEUTRAL_NOTE = '中性（重调）：浅灰白卡、14px 圆角；弱文字压到对比地板、软底去蓝、线更像线';

export const NEUTRAL_VALUES = Object.freeze({
  ground: '#f5f5f7',
  surface: '#ffffff',
  'surface-2': '#f4f4f6',
  line: '#cfcfd4',
  edge: '#cfcfd4',

  ink: '#1d1d1f',
  'ink-2': '#5f5f64',
  /* 弱文字压到对 ground（#f5f5f7）与 surface-2（#f4f4f6）都 ≥4.5:1：原 #86868b 只有 3.63:1，
     第一版重调 #757579 对白底过了、对灰底只有 4.18:1 —— 是判据算出来的，不是眼看出来的。 */
  'ink-3': '#6b6b70',

  accent: '#007aff',
  'accent-text': '#0a63ce',
  'accent-ink': '#ffffff',
  'accent-soft': '#eef4ff',

  ok: '#1f8c3d',
  'ok-soft': '#e6f7ec',
  warn: '#8a5a12',
  'warn-soft': '#fff5e0',
  danger: '#a83228',
  'danger-soft': '#fff0ee',

  radius: '14px',
  'radius-sm': '8px',
  'radius-pill': '999px',
  shadow: '0 1px 2px rgba(0,0,0,.04), 0 12px 36px rgba(0,0,0,.06)',
  'shadow-pop': '0 8px 24px rgba(0,0,0,.14)',

  font: '"SF Pro Display",-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif',
  'font-num': '"SF Pro Display",-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif',
  'font-display': '"SF Pro Display",-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif',

  'fs-body': '15px',
  'fs-sm': '13px',
  'fs-xs': '12px',
  'fs-h1': '28px',
  'fs-h2': '18px',
  'fs-h3': '15px',
  space: '16px',
  'pad-x': '20px',
} as const satisfies Record<SkinTokenName, string>);
