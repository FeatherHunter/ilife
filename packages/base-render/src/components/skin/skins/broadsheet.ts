/** skin/broadsheet · **大字报刊**（第二套语言）。
 *
 *  出处＝原型 `.scratch/diet-ui-proto/v2-大字.html` ＋ 60 件原型墙打分次席（3.74 分，≥4 占 70.3%）。
 *
 *  它是什么：直角、零阴影、发丝线、衬线读数（数字当标题使）、墨黑做强调。
 *  **强调色＝墨黑** ⇒ 靠色彩区分序列的件在这一档必须有第二种手段（深浅／线型／文字），否则会塌。
 */
import type { SkinTokenName } from '../contract.js';

export const BROADSHEET_NOTE = '大字报刊：直角、零阴影、衬线读数、墨黑强调';

export const BROADSHEET_VALUES = Object.freeze({
  ground: '#faf8f4',
  surface: '#ffffff',
  'surface-2': '#f4f1ea',
  line: '#ded8cc',
  edge: '#ded8cc',

  ink: '#14110d',
  'ink-2': '#4c4741',
  'ink-3': '#6b6559',

  accent: '#14110d',
  'accent-text': '#14110d',
  'accent-ink': '#ffffff',
  /* 强调软底＝**accent 的淡洗**（本套 accent 是墨黑 ⇒ 淡洗是一档浅暖灰）：必须与 `surface-2`（#f4f1ea）
     分得开，旧值**逐字节同色** ⇒ 空转（2026-09-24 由席位报出）。新值：`accent-text`／`accent` 对它 14.71:1。 */
  'accent-soft': '#e8e3d8',

  /* 语义色当字的地板（判据：`test/skin.test.mjs` ②c）。本套三支**都动了**，因为三支的亮度
     原本挤在一起：`ok`／`warn` 只差 1.10:1、`ok`／`danger` 只差 1.16:1（地板 1.2）。
     只压一支解不开——把三支重新排开：`warn` 最亮、`ok` 居中、`danger` 最暗，两两 ≥1.26。
     色相与饱和度一律不动（ok 144.3°／58.5%、warn 36.0°／76.9%、danger 5.0°／64.0%）。 */
  ok: '#1b693b',          /* 微压深：#1c6b3c → 自身地板 surface 6.71／ground 6.32／`ok-soft` 5.83 */
  'ok-soft': '#e6f2ea',
  warn: '#946113',        /* 调亮一档：#8a5a12 → surface 5.28／ground 4.98／`warn-soft` 4.70 */
  'warn-soft': '#fbf1dc',
  danger: '#8c281f',      /* 压深一档：#9b2c22 → surface 8.61／ground 8.12／`danger-soft` 7.26；
                             vs accent（本套 accent 是墨黑 #14110d）从 2.49 变 2.19，仍远超 1.2 */
  'danger-soft': '#f9e8e4',

  radius: '0',
  'radius-sm': '0',
  'radius-pill': '0',
  shadow: 'none',
  'shadow-pop': '0 10px 30px rgba(20,17,13,.16)',

  font: '"PingFang SC","Microsoft YaHei",system-ui,sans-serif',
  'font-num': '"Songti SC",Georgia,"Times New Roman",serif',
  'font-display': '"Songti SC",Georgia,"Times New Roman",serif',

  'fs-body': '16px',
  'fs-sm': '14px',
  'fs-xs': '12.5px',
  'fs-h1': '34px',
  'fs-h2': '21px',
  'fs-h3': '17px',
  space: '18px',
  'pad-x': '22px',
} as const satisfies Record<SkinTokenName, string>);
