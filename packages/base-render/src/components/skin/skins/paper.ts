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
  /* 弱文字（脚注／口径行）：`accent-soft` 现在是**全层选中面**的底（十几件在用），
     弱字压上去也要过 4.5——旧 #6f6559 对它只有 4.48（差 0.02，2026-09-24 席位算出来报的）。
     压深到 #6b6154：on soft 4.77／on ground 5.15／on surface 5.96／on surface-2 5.38。 */
  'ink-3': '#6b6154',

  accent: '#b5392a',
  'accent-text': '#a3311f',
  'accent-ink': '#fffdf7',
  /* 强调软底＝**accent 的淡洗**（不是"次要面"的另一个名字）：必须与 `surface-2`（#f6f1e6）分得开，
     否则选中片落在以 `surface-2` 为底的容器（档位段 `-seg`、表头）里等于没有底。
     旧值与 surface-2 **逐字节同色** ⇒ 这套皮肤里"强调软底"是空转（2026-09-24 由席位报出）。
     新值＝砖红的暖淡洗：`accent-text` 对它 5.47:1、`accent` 对它 4.60:1（两条地板都过，通道差 18）。 */
  'accent-soft': '#f7dfd8',

  ok: '#2f7d4f',
  'ok-soft': '#e8f2ea',
  warn: '#8a5a12',
  'warn-soft': '#fbf1dc',
  /* 语义档的 `danger` 必须与 `accent` **分得开**：旧值 #a83228 与本套 accent（砖红 #b5392a）只差 1.14:1，
     于是"正常档（accent 实底）"与"超目标档（danger）"在纸上一个样——语义档白设（2026-09-24 由席位在
     `scale-bar` 上报出）。新值压深一档：vs accent 1.52:1、对 ground 7.54:1（文字地板 4.5 过）。 */
  danger: '#8d2118',
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
