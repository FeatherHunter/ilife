/** skin/paper · **小票纸**（缺省皮肤）。
 *
 *  出处＝单据族那套（原型 `.scratch/diet-ui-proto/v2-小票.html`，用户 2026-09-24 认可）＋
 *  60 件原型墙打分胜出者（3.83 分，≥4 占 76.6%）。
 *
 *  它是什么：暖白纸面＋纸边、方角、零阴影、数字走等宽（0 带斜杠）；层次靠**发丝线／底色块／字重**，
 *  不靠投影与圆角 ⇒ 换到零阴影的皮肤也不塌。
 */
import type { SkinTokenName } from '../contract.js';

/** 本皮肤的名字面（人读的那套语言叫什么）。 */
export const PAPER_NOTE = '小票纸：暖白纸、纸边、方角、零阴影、等宽数字';

/** 暖纸那一档的颜色（token 名 → 值）。 */
export const PAPER_VALUES = Object.freeze({
  ground: '#f1ece1',
  surface: '#fffdf7',
  'surface-2': '#f6f1e6',
  line: '#e7e1d3',
  edge: '#e7e1d3',

  ink: '#23201a',
  'ink-2': '#5b5347',
  'ink-3': '#6f6559',

  accent: '#b5392a',
  'accent-text': '#a3311f',
  'accent-ink': '#fffdf7',
  'accent-soft': '#f6f1e6',

  ok: '#2f7d4f',
  'ok-soft': '#e8f2ea',
  warn: '#8a5a12',
  'warn-soft': '#fbf1dc',
  danger: '#a83228',
  'danger-soft': '#f9e8e4',

  radius: '6px',
  'radius-sm': '4px',
  'radius-pill': '4px',
  shadow: 'none',
  'shadow-pop': '0 8px 24px rgba(70,58,40,.18)',

  font: '"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif',
  'font-num': 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace',
  'font-display': '"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif',

  'fs-body': '15px',
  'fs-sm': '13px',
  'fs-xs': '12px',
  'fs-h1': '28px',
  'fs-h2': '18px',
  'fs-h3': '15px',
  space: '16px',
  'pad-x': '20px',
} as const satisfies Record<SkinTokenName, string>);
