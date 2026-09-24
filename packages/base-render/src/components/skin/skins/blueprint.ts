/** skin/blueprint · **蓝图 · 工程图纸**（票 #950 的三套新皮肤之一）。
 *
 *  它是什么：极浅的**冷灰蓝**底（图纸桌面）＋ 白得发冷的**纸面**（图纸本身）；层次不靠底色块，
 *  靠**发丝网格线、直角、等宽数字、标注式小字**立起来——所以 `line`／`edge` 比既有三套都重
 *  （#b6c6d8／#9cb0c6，paper 那套是 #e7e1d3），**常驻投影一律为零**：投影一压，网格线就糊。
 *
 *  从哪儿来：晒图（blueprint／工程蓝图）的读法——先在网格上找**线**（哪一格到哪一格），
 *  再看**等宽的数**（尺寸、读数，位数要能上下对齐），最后读贴着引线的**标注小字**（口径、单位）。
 *  借的是这套**读法**，不是某张具体图纸的配色。
 *
 *  故意与另外两套新皮肤差在哪（三套互不重叠）：
 *   · 对 `terminal`（终端暗色）：**底色相反**。本套是浅冷底 ＋ 深墨字，线是浅底上的深线；
 *     terminal 是深底 ＋ 亮字，靠字符自身发光，没有"线"这个手段。
 *   · 对 `ink`（水墨宣纸）：**层次手段相反**。ink 靠墨色浓淡与留白，边线可有可无；
 *     本套把线**明写出来**（`line`／`edge` 重、直角框、三档圆角全取同一个 2px），
 *     数字一律等宽栈，读数能一列列对齐；ink 的读数是书写感的衬线。
 *   · 与既有三套（paper／broadsheet／neutral）差在**层次来自哪里**：那三套靠**底色块**，
 *     本套靠**线**；圆角也从 6／14px 收到 2px（直角是这套语言的结构开关）。
 *
 *  **对比度是硬地板**（冷底最容易踩的坑是"淡蓝小字读不清"，下面每个值都是算出来的，不是眼看定的）：
 *  `ink`／`ink-2`／`ink-3`／`accent-text` 对 `ground`／`surface`／`surface-2` 九格全部 ≥ 4.5:1。
 *  最紧的一格是 `ink-3`（弱文字）对 `surface-2`（最深的底）：4.94:1 —— `ink-3` 因此从 #526e8a
 *  压到 #4a6784（#526e8a 只有 4.37:1，不过地板）。实测表见件尾。
 */
import type { SkinTokenName } from '../contract.js';

/** 本皮肤的名字面（人读的那套语言叫什么）。 */
export const BLUEPRINT_NOTE = '蓝图：极浅冷灰蓝底、冷白纸面、直角、零投影、发丝网格线与等宽数字';

/** 图纸那一档的颜色（token 名 → 值）。 */
export const BLUEPRINT_VALUES = Object.freeze({
  /* 面与线：底偏冷蓝、纸面白得发冷；线是这套语言的主手段，故比既有三套重。 */
  ground: '#e9eff7',
  surface: '#fcfdff',
  'surface-2': '#e4ecf5',
  line: '#b6c6d8',
  edge: '#9cb0c6',

  /* 字：墨蓝黑。ink-3 是压到对三块底都过 4.5 地板后的值（见件头）。 */
  ink: '#0d1e2e',
  'ink-2': '#3b566f',
  'ink-3': '#4a6784',

  /* 强调：图纸蓝／青蓝。accent 是非文本档（条、边、底），要当文字使走 accent-text。 */
  accent: '#1c6fa8',
  'accent-text': '#0f5c96',
  'accent-ink': '#fcfdff',
  'accent-soft': '#dde9f5',

  /* 语义：三档各自成色相（绿／赭黄／砖红），在冷底上分得开；状态不许只靠色是组件层的事。 */
  ok: '#1f6b46',
  'ok-soft': '#e2f1e8',
  warn: '#8a5a12',
  'warn-soft': '#fdf2dd',
  danger: '#a92c20',
  'danger-soft': '#fbe8e5',

  /* 形状：直角是这套语言的结构开关——三档圆角取同一个 2px；常驻投影零，浮层改走"硬边＋落影"。 */
  radius: '2px',
  'radius-sm': '2px',
  'radius-pill': '2px',
  shadow: 'none',
  'shadow-pop': '0 0 0 1px rgba(31,88,140,.28), 0 14px 32px rgba(13,30,46,.18)',

  /* 字面：正文用界面无衬线；数字与大标题一律等宽（图纸的尺寸与读数都靠等宽对齐）。 */
  font: '"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif',
  'font-num': 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace',
  'font-display': 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace',

  /* 尺：比既有三套紧一档（图纸靠密度说话），但正文字号不动——小字读得清优先于像图纸。 */
  'fs-body': '15px',
  'fs-sm': '13px',
  'fs-xs': '12px',
  'fs-h1': '27px',
  'fs-h2': '17px',
  'fs-h3': '15px',
  space: '14px',
  'pad-x': '18px',
} as const satisfies Record<SkinTokenName, string>);
