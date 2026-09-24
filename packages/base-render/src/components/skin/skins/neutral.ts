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
  /* 强调软底＝**accent 的淡洗**：旧值 #eef4ff 与 `surface-2`（#f4f4f6）的通道差只有 9，
     在 `surface-2` 底的容器里几乎看不出"这一枚被选中"。加深一档：
     `accent-text` 对它 4.90:1、`accent` 对它 3.46:1（文本地板与图形地板都过，通道差 16）。 */
  'accent-soft': '#e4efff',

  /* 语义色当字的地板（判据：`test/skin.test.mjs` ②c）。本套是四套里踩线最多的一套：
     旧 `ok` #1f8c3d 压 surface 只有 4.31:1、压 ground 3.95:1、压 `ok-soft` 3.87:1 —— 三档底全在 4.5 之下；
     旧 `warn`／`danger` 的亮度只差 1.13:1（地板 1.2）。三支重排亮度、色相饱和度全不动。 */
  ok: '#1c7d37',          /* 压深：#1f8c3d → surface 5.20／ground 4.78／`ok-soft` 4.68（H136.5°/S63.7° 不动） */
  'ok-soft': '#e6f7ec',
  warn: '#815411',        /* 压深：#8a5a12 → surface 6.54／ground 6.01／`warn-soft` 6.04 */
  'warn-soft': '#fff5e0',
  danger: '#8f2b22',      /* 压深：#a83228 → surface 8.28／ground 7.60／`danger-soft` 7.47；
                             vs accent（本套是蓝图蓝 #007aff）从 1.66 变 2.06 */
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
