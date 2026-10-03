/** skin/ticket · **票据纸**（#993：饼干记账两页用户视角重构，原型 v5／v7 冻结那套材料）。
 *
 *  出处＝`#993` 的两份静态原型 `bill-993-proto-receipt-7222-v5.html` 与
 *  `bill-993-proto-detail-7222-v7.html`（用户 2026-10-01 逐版验收、认可）。它不是"又一套配色"：
 *  `paper` 是小票纸的**方角、零投影、等宽数字**，本套是同族纸面上的**圆角卡片纸、柔和投影、
 *  无衬线数字**——两种材料，用户各选过一次，故各占一套皮肤。
 *
 *  它是什么：暖奶油**桌**（页面底）＋暖白**纸**（内容面）＋纸边＋16px 圆角＋两层柔和投影；
 *  层次靠投影与底色块，不靠等宽数字。
 *
 *  **与原型取值逐条的偏离（只有三处，且都是地板逼的，记在这里备查）**：
 *   1. 原型 `--muted:#8a8175` / `--faint:#b8ae9f` 压在桌面（`ground`）上只有 3.17 / 1.81，
 *      过不了《选中态与皮肤语言》第五节「三档文字 ≥4.5」⇒ 压深到 `#665f57` / `#736755`
 *      （色相与饱和度不动，只降明度；地面读数 5.20 / 4.57）。**次文字多压一档**是为了让
 *      `ink-2` 与 `ink-3` 仍分得开——两档都只压到地板会几乎同色，原型的 muted／faint 就丢了。
 *   2. 原型 `--green:#1f7a4d` 压桌面 4.40、`--red:#c0392b` 压桌面 4.50 且与 `accent`（#b4552d）
 *      只差 1.11 ⇒ 分别压深到 `#1e784c`（4.52）与 `#8c2a1f`（对桌面 7.04、对 accent 1.73、
 *      对 ok 1.56、对 warn 1.22）。**危险档必须与主色分得开**是既有判据（第五节末行）。
 *   3. `edge` 原型没有这一号（纸边就是 `line`）；这里取比 `line` 亮一档的暖边 `#eadfcb`，
 *      因为纸面上还要画撕口与裁切线，同色会糊成一片。
 *  除这三处，色板（桌／纸／次要面／墨色／主色及其软底／提醒档）与原型逐字节相同。
 */
import type { SkinTokenName } from '../contract.js';

/** 本皮肤的名字面（人读的那套语言叫什么）。 */
export const TICKET_NOTE = '票据纸：暖奶油桌、圆角卡片纸、柔和投影、无衬线数字';

/** 暖奶油那一档的颜色与形状（token 名 → 值）。 */
export const TICKET_VALUES = Object.freeze({
  ground: '#efe9dd',
  surface: '#fffdf7',
  'surface-2': '#f7f1e3',
  line: '#e9dfcd',
  edge: '#eadfcb',

  ink: '#2b2620',
  'ink-2': '#665f57',
  'ink-3': '#736755',

  accent: '#b4552d',
  'accent-text': '#a3461f',
  'accent-ink': '#fffdf7',
  /* 强调软底：原型 `--accent-soft:#fdf0e6` 与次要面 `#f7f1e3` 只差 6 个通道 ⇒ 过不了
     `test/skin.test.mjs` ②b 的「≥12 通道」地板（那条地板的意思是：选中片落在 `surface-2` 底的容器里
     不能"等于没有底"）。原型那两页上 `accent-soft` 一次都没用到（只有 `.ledger-rows .v .tag` 用它，
     而那枚标签在两页里都不出），故按 accent 的暖淡洗重取一档 `#fbe4d4`（对 `surface-2` 差 15 个通道、
     对 `ink-3` 4.51:1、对 `accent-text` 4.97:1），观感仍是同一支砖红的淡洗。 */
  'accent-soft': '#fbe4d4',
  /* 判地字面 · 授权照抄：#3f7fbf（判地 `.entry-text .bar i{background:…}` 占比条填充）。
     它不是 accent（砖红）——比例条不是强调；`--blue` 在本皮肤作用域里映射成 accent，
     页面侧读它必然错色。#1113 裁定落成皮肤号 `bar-fill`。 */
  'bar-fill': '#3f7fbf',

  ok: '#1e784c',
  'ok-soft': '#e7f5ec',
  warn: '#7b5010',
  'warn-soft': '#fbf1dc',
  danger: '#8c2a1f',
  'danger-soft': '#f9e8e4',

  /* 形状：圆角卡片纸（与 paper 的方角小票是两种材料）＋两层柔和投影。 */
  radius: '16px',
  'radius-sm': '10px',
  'radius-pill': '999px',
  /* 规格 §2 授权照抄：明细卡外框 `border-radius:12px`（规格 §2 圆角表原话「仅 entry-card 外框保留
     12px 原型字面」）。#1113 把它落成皮肤号 `radius-card`——取值与判地逐字节同，页面侧从此读 token。 */
  'radius-card': '12px',
  /* 判地字面 · 授权照抄：7px（判地 `.idx{border-radius:7px}` 编号胶囊）。规格 §2 的圆角表只列到
     `radius-sm`，这一档由 #1113 裁定进皮肤（组件侧原先写「授权照抄」字面，现改读本号）。 */
  'radius-tag': '7px',
  shadow: '0 18px 50px rgba(80,60,30,.18), 0 2px 0 rgba(120,90,40,.08)',
  'shadow-pop': '0 12px 28px rgba(80,60,30,.18)',

  /* 字面：正文与数字同一支无衬线栈（原型的大数字是 900 无衬线，不是等宽）。 */
  font: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,-apple-system,"Noto Sans SC",sans-serif',
  'font-num': '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,-apple-system,"Noto Sans SC",sans-serif',
  'font-display': '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,-apple-system,"Noto Sans SC",sans-serif',

  'fs-body': '15px',
  'fs-sm': '13px',
  'fs-xs': '12px',
  'fs-h1': '28px',
  'fs-h2': '18px',
  'fs-h3': '15px',
  space: '16px',
  'pad-x': '28px',
} as const satisfies Record<SkinTokenName, string>);
