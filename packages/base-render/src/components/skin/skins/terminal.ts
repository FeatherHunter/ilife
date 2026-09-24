/** skin/terminal · **终端**（暗色）。
 *
 *  出处＝屏幕而不是纸：字符终端与 TUI 那一路的观感（深底、发光前景、等宽字格、方角、发丝分栏线），
 *  取值按 WCAG 自己算过一遍，不是照着某张截图吸的色。
 *
 *  它是什么：近黑底 ＋ 略亮的卡、全篇等宽字面、**圆角一律 0**、常驻投影 `none`、
 *  层次只靠三样东西——**发丝线（line／edge）／面与面的明暗阶（ground < surface < surface-2）／字重**。
 *  强调色取青绿（`#2fd6c9`）：深底上够亮，且**与语义色的琥珀（warn）分得开**——
 *  若强调也取琥珀，「强调」与「临近／提醒」在同一个页面上就只剩色相差一点点，那是这套语言最容易塌的地方。
 *
 *  **它故意与另两席差在哪**：ink（水墨宣纸）与 blueprint（蓝图工程）都从**纸与墨**那一路来——浅底、暖／冷的纸色、
 *  靠纸面质感与线宽说话；这套反过来，只有**屏幕**这一种介质，浅底一路的手段（纸边、投影、圆角卡）一个都不用。
 *  与既有三套的差别更直接：纸面／报刊／中性**全是浅色**，这套是唯一一套深底。
 *
 *  红线（状态不许只靠色）在这套取值下的落点：语义色**成对**给出（`ok/warn/danger` ＋ 各自的 soft 底），
 *  且语义色对自己那层 soft 底的对比度都在 6.5:1 以上（见各值旁注）——组件按自己的形／字规则写第二样时，
 *  字永远读得出来，不会出现"只有那一点颜色在说事、字却糊在底里"。
 *
 *  深底皮肤最容易踩的坑是 `ink-3` 压太暗、小字读不清。本套先算了再写：
 *  `ink-3` 对 `surface-2`（最亮的那层底）仍有 5.98:1，对 `surface` 6.95:1、对 `ground` 7.74:1，
 *  都在 4.5 地板之上留了余量；正文 `ink` 对 `surface` 14.72:1。
 */
import type { SkinTokenName } from '../contract.js';

/** 本皮肤的名字面（人读的那套语言叫什么）。 */
export const TERMINAL_NOTE = '终端：近黑底、等宽字格、方角、零投影、发丝线分栏，青绿强调';

/** 终端那一档的颜色与尺（token 名 → 值）。 */
export const TERMINAL_VALUES = Object.freeze({
  /* 面与线：三层面（底 < 卡 < 次面）只差 1.11／1.16 的明暗阶，卡与桌面的分界交给 edge 那道发丝线，
     而不是投影——深底上投影本来就看不出来，靠投影做层次的皮肤在这套取值下会整片塌平成一块。 */
  ground: '#0a0e11',
  surface: '#131b21',
  'surface-2': '#1e2830',
  line: '#2e3a45',
  edge: '#3c4a56',

  /* 字：三层都远离地板，最小的那层（ink-3）仍留了 1.3 倍余量——深底小字读不清是这套语言的头号坑。 */
  ink: '#e6edf2',
  'ink-2': '#b0bfca',
  'ink-3': '#95a6b3',

  /* 强调：青绿。accent 是**非文本**档（条、边、底、大数字）；要当普通文字使走 accent-text。 */
  accent: '#2fd6c9',
  'accent-text': '#57dfd4',
  /* 强调底上的字色＝本皮肤的 ground：青绿是亮色，压近黑才读得出（10.69:1）。 */
  'accent-ink': '#0a0e11',
  'accent-soft': '#10292b',

  /* 语义：琥珀／绿／红三个色相在深底上都够亮（对自己那层 soft 底 ≥6.5:1）。
     注意 warn 是琥珀，与青绿强调分属两个色相族 ⇒ 一页里同时出现"强调"与"提醒"不会看串。 */
  ok: '#4ec26a',
  'ok-soft': '#12261a',
  warn: '#e3b341',
  'warn-soft': '#2a2211',
  danger: '#ff7b72',
  'danger-soft': '#2c1a19',

  /* 形状：圆角一律 0（方角是这套语言的骨相，不是省事）；
     常驻投影 none ⇒ 浮层若也只靠投影就会与底融为一体，所以 shadow-pop 的头一道是**发丝环**（1px，零模糊），
     后面那道模糊只是补一层微差，环不在时它撑不住任何东西。 */
  radius: '0px',
  'radius-sm': '0px',
  'radius-pill': '0px',
  shadow: 'none',
  'shadow-pop': '0 0 0 1px #3c4a56, 0 18px 36px rgba(0,0,0,.55)',

  /* 字面：**全篇等宽**（正文也等宽）——技术感来自字格对齐，而不是把正文压小。
     等宽族只带拉丁与数字，中文由后面的雅黑／黑体接住（两者都是全宽字格，混排不跳）。 */
  font: 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono","Microsoft YaHei","PingFang SC","Noto Sans SC",monospace',
  'font-num': 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace',
  'font-display': 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono","Microsoft YaHei","PingFang SC",monospace',

  /* 尺：与另三套同档。深底上再把字压小，等宽字格的笔画会更细 ⇒ 这里不靠缩字号做"密集感"。 */
  'fs-body': '15px',
  'fs-sm': '13px',
  'fs-xs': '12px',
  'fs-h1': '28px',
  'fs-h2': '18px',
  'fs-h3': '15px',
  space: '16px',
  'pad-x': '20px',
} as const satisfies Record<SkinTokenName, string>);
