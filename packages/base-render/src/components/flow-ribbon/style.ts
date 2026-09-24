/** flow-ribbon · **样式段**（本件唯一的样式出口；三个骨架各自的形状在 `style-forms.ts`，由这里汇总）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下、**每条里作用域恰一次**；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ `flex-wrap`；本件不写任何 `@media`（视口宽 ≠ 组件宽）。
 *
 *  几何契约（判据钉住）：
 *   · **两处几何都是算出来的百分比**（写在进行内样式里），静态规则一条都不许写死宽度；
 *   · **读数永不截断**：会随调用方文本变长的槽一律 `min-width: 0` ＋ 可换行；金额与占比 `nowrap` ＋ `tabular-nums`；
 *   · **色只走强调色系**：色阶是从 `accent` 往 `surface` 掺出来的淡洗（权重按来源序号由深到浅），
 *     任何一处都不拿 `ink` 系当面、也没有一处是写死的色值。
 */
import { skinVar } from '../skin/contract.js';
import { FLOW_RIBBON_NARROW_PX, flowRibbonSlot, type FlowRibbonSlot } from './attrs.js';
import { flowRibbonFormsCss } from './style-forms.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 本组件的样式段（＝这一份 ＋ `style-forms.ts` 那一份，**一次调用拿全部**）。恒返回非空 CSS 文本。 */
export function flowRibbonCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-flow-ribbon';
  const s = (slot: FlowRibbonSlot): string => root + ' .' + flowRibbonSlot(slot, p);

  return [
    '/* flow-ribbon（流向带）：三个骨架——桑基带／交叉矩阵／两条构成轨＋汇合读数。',
    '   一把尺子贯穿三处几何：每 1% 高／宽＝同一个钱数（从总额与跨度算出，写在标记的行内样式里）。',
    '   色一律从强调色系算（淡洗），读数不截断；宽度只由容器判。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度排。 */
    '  container-type: inline-size;',
    /* 宿主页不保证是 `border-box`：本件有「满宽 ＋ 1px 边框」的轨与表，在默认 content-box 下
       会比容器宽出两像素 ⇒ 窄档实测横溢。故在**自己的子树里**钉成 border-box。 */
    '  box-sizing: border-box;',
    '  display: grid;',
    '  gap: 10px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    box + ' * {',
    '  box-sizing: border-box;',
    '}',
    /* ── 卡头 ─────────────────────────────────────────────────────── */
    s('hd') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 3px 10px;',
    '  min-width: 0;',
    '}',
    s('title') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-display') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  line-height: 1.35;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 时间窗与总额：**可收窄**（`flex: 0 1 auto` ＋ `min-width: 0`）——内容撑宽是横溢的来源，
       `flex: none` 会让这一项拒绝收窄、把父行顶出容器。 */
    s('stamp') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  margin-left: auto;',
    '  padding: 1px 8px;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('tail') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  margin-left: auto;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 三个骨架各自的形状（`style-forms.ts`）：插在卡头之后、共用名单与脚注之前——
       插在这一行的位置上，顺序即层叠顺序。 */
    flowRibbonFormsCss({ prefix: p }),
    /* ── 读数名单（桑基装不下的读数、构成轨的两栏名单都用它）──────────────── */
    s('readout') + ' {',
    '  display: grid;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  padding-top: 8px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    s('readout-hd') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('readout-row') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 8px;',
    '  min-width: 0;',
    '}',
    s('readout-name') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 金额：**永不 `…` 截断**（`nowrap` ＋ 不设 `overflow: hidden`；放不下就整行换行）。 */
    s('readout-amount') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('readout-share') + ' {',
    '  margin-left: auto;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    /* 点名色块：**无文字的图形 ⇒ `accent` 实底**；`is-s1`…`is-s6` 的深浅档住 `style-forms.ts`。 */
    s('swatch') + ' {',
    '  display: block;',
    '  flex: none;',
    '  width: 10px;',
    '  height: 10px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('accent') + ';',
    '}',
    /* ── 图例（桑基那三档色阶的键）────────────────────────────────── */
    s('legend') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 4px 16px;',
    '  min-width: 0;',
    '  margin: 0;',
    '  padding: 0;',
    '  list-style: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    s('legend-item') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    s('legend-mark') + ' {',
    '  display: block;',
    '  flex: none;',
    '  width: 14px;',
    '  height: 10px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('accent') + ';',
    '}',
    /* ── 脚注 ─────────────────────────────────────────────────────── */
    s('note') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  padding-top: 10px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 本件自身不带可点元素。下面三条是**地板**：调用方把某一格或某一行包成入口（点开那一股的钱）时，
       命中盒不许小于 44×44（触屏地板），焦点必须看得见。
       两条分开写（不写 `:is(a, button)`）：选择器逐条带上本件的作用域，纪律判据按逗号逐段查。 */
    box + ' a {',
    '  min-width: 44px;',
    '  min-height: 44px;',
    '}',
    box + ' button {',
    '  min-width: 44px;',
    '  min-height: 44px;',
    '}',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    /* 窄容器（<' + String(FLOW_RIBBON_NARROW_PX) + 'px）：**桑基一处几何都不改**——改了就等于换了一把尺子
       （窄档里带子会细到看不出对应，那是形态的事：要窄就换 `rails` 形态）。
       矩阵与构成轨那两处「一行里塞太多列」的松开住 `style-forms.ts`（同一份纪律、同一条阈值）。 */
    '@container (max-width: ' + String(FLOW_RIBBON_NARROW_PX) + 'px) {',
    '  ' + s('readout-name') + ' {',
    '    font-size: ' + skinVar('fs-xs') + ';',
    '  }',
    '}',
  ].join(LF);
}
