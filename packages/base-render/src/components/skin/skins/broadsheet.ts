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

  ok: '#1c6b3c',
  'ok-soft': '#e6f2ea',
  warn: '#8a5a12',
  'warn-soft': '#fbf1dc',
  danger: '#9b2c22',
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
