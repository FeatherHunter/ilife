/** radar-profile · **样式段**（本件唯一的样式来源；读数件段与两形态的形状段在 `style-readouts.ts`／
 *  `style-forms.ts`，由这里汇总）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ 纯 CSS 等分；本件不写任何判宽度的 `@media`。
 *
 *  为什么拆三份：本件一次落三个形态，样式段挤在一件里会超本包告警线 350
 *  （`packages/base-render/AGENTS.md`）。切法按**形状的边界**：卡壳与图住本件、读数件住 `style-readouts.ts`、
 *  两形态自己的形状住 `style-forms.ts`。拆分只搬「住哪个文件」，**取值一个字节都没改**。
 *
 *  几何契约（判据钉住）：
 *   · **轴名浮在图的四周外侧**，所以图那两格自带内距：内距 ＝ `RADAR_PROFILE_MAX_LABEL_CHARS` 的字宽 ＋ 一点缝。
 *     这是"轴名顶宽容器"的唯一防线，且它与轴名上限读**同一个常量**（改上限这里跟着走）。
 *   · **图上的字一律是 HTML**：`.plot` 里的轴名是绝对定位的 HTML（`left`／`top` 由同一份映射给百分比），
 *     内联 SVG 只画网格与数据 —— SVG 里的字会随画布缩放，窄容器里读数先糊（先例 `progress-ring`）。
 *   · **触控地板**：本件不带可点元素（纯静态图），但 `:focus-visible` 的地板照留（见下面那条
 *     `box + ' :focus-visible'`，先例 `cash-waterline`）——调用方把某一行或某根轴包成入口时，
 *     焦点必须看得见。
 */
import { skinVar } from '../skin/contract.js';
import {
  RADAR_PROFILE_CLASS,
  RADAR_PROFILE_MAX_LABEL_CHARS,
  RADAR_PROFILE_MAX_PLOT_PX,
  RADAR_PROFILE_NARROW_PX,
  RADAR_PROFILE_WIDE_PX,
  radarProfileSlot,
  type RadarProfileSlot,
} from './attrs.js';
import { radarProfileFormsCss } from './style-forms.js';
import { radarProfileReadoutsCss } from './style-readouts.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 轴名两行之间的行距（`line-height` 那一档）：内距按它算，别处不读。 */
const LABEL_LEAD = 1.3;

/** 轴名那一侧的内距：**上限那几个字宽再让出一档 ＋ 一点缝**（`RADAR_PROFILE_MAX_LABEL_CHARS` 是唯一出处）。
 *  为什么让出一档：轴名在正左／正右那两根上从 0.98 倍图宽处往外伸（`RADAR_PROFILE_LABEL_RADIUS / VIEW` 的
 *  余弦），那一档差正好吃掉了"名字比内距宽一点"的余量——量过 320 档（六字轴名全开）没有横溢。 */
const LABEL_ROOM = 'calc(' + String(RADAR_PROFILE_MAX_LABEL_CHARS - 1) + ' * ' + skinVar('fs-xs') + ' + 16px)';
/** 轴名上下那两档内距（名字一行 ＋ 读数一行，再加上换行余量）。 */
const LABEL_ROOM_Y = 'calc(3 * ' + String(LABEL_LEAD) + ' * ' + skinVar('fs-xs') + ' + 8px)';

/** 宽档并排时图那一列的宽：**满宽的图 ＋ 两侧轴名内距**（图的上限与内距读的还是那两个常量）。 */
const WIDE_STAGE_COL = 'minmax(0, calc(' + String(RADAR_PROFILE_MAX_PLOT_PX) + 'px + 2 * (' + LABEL_ROOM + ')))';

/** 一个百分比档：往卡面掺 `weight`% 的墨色（**淡洗是合法的面**，实心墨块才是禁止的那一种）。 */
const wash = (token: 'ink' | 'ink-2' | 'accent', weight: number): string =>
  'color-mix(in srgb, ' + skinVar(token) + ' ' + String(weight) + '%, ' + skinVar('surface') + ')';

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function radarProfileCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-radar-profile';
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。 */
  const s = (slot: RadarProfileSlot): string => root + ' .' + radarProfileSlot(slot, p);
  /* 嵌套／兄弟选择器里必须用**裸槽类**：拿 `s()` 去拼会拼出 `.page-ui .a .page-ui .b`，
     第二条 `.page-ui` 永远匹配不到 —— 规则「看着在、其实不生效」（样张页上抓到过一次真事）。 */
  const c = (slot: RadarProfileSlot): string => '.' + radarProfileSlot(slot, p);

  return [
    '/* radar-profile（多维画像雷达 · 三个形态：多边形雷达／极区扇图／展平成轴表）：',
    '   一个对象在几根互不同单位的轴上的形状。色一律从皮肤 token 出：网格是墨色淡洗、',
    '   本期轮廓走强调色实线、上期走副文字色虚线、达标档走 ok／未达标走 warn。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度排。 */
    '  container-type: inline-size;',
    /* 宿主页不保证是 `border-box`（真页面默认 content-box）：本件带边框／内距的位子
       在那种页里会比容器宽出边框那几像素 ⇒ 在本件**自己的子树里**把 `box-sizing` 钉成 `border-box`。 */
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
    s('stamp') + ' {',
    /* 内容撑宽是横溢的来源：调用方给一句长口径时 `flex: none` ＋ `nowrap` 会让这一项拒绝收窄 ⇒ 父行跟着溢出。 */
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  padding: 1px 8px;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
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
    '/* 形态 `polygon` 那一层：窄档图与表上下排，宽档并排（图在左、表在右）。 */',
    s('body') + ' {',
    '  display: grid;',
    '  gap: 14px;',
    '  min-width: 0;',
    '}',
    /* 图那两格的内距就是**轴名的位置**：名字浮在外圈之外，横竖都得先让出来。 */
    s('stage') + ' {',
    '  min-width: 0;',
    '  padding: ' + LABEL_ROOM_Y + ' ' + LABEL_ROOM + ';',
    '}',
    s('plot') + ' {',
    '  position: relative;',
    '  width: 100%;',
    '  max-width: ' + String(RADAR_PROFILE_MAX_PLOT_PX) + 'px;',
    '  margin: 0 auto;',
    '  aspect-ratio: 1 / 1;',
    '  min-width: 0;',
    '}',
    s('svg') + ' {',
    '  display: block;',
    '  width: 100%;',
    '  height: 100%;',
    '}',
    /* 网格：墨色往卡面掺一档（不是硬编码灰），换皮自动跟着走；发丝线不随画布缩放变粗。 */
    s('ring') + ' {',
    '  fill: none;',
    '  stroke: ' + wash('ink', 12) + ';',
    '  stroke-width: 1;',
    '  vector-effect: non-scaling-stroke;',
    '}',
    s('ring') + '.is-outer {',
    '  stroke: ' + wash('ink', 22) + ';',
    '}',
    s('spoke') + ' {',
    '  stroke: ' + wash('ink', 12) + ';',
    '  stroke-width: 1;',
    '  vector-effect: non-scaling-stroke;',
    '}',
    /* 上期轮廓：副文字色虚线（**弱一层**是它的语义：那是已经过去的那一期）；
       面是同一支墨色的淡洗——淡洗是合法的面，实心墨块才是禁止的那一种。 */
    s('past') + ' {',
    '  fill: ' + wash('ink-2', 10) + ';',
    '  stroke: ' + skinVar('ink-2') + ';',
    '  stroke-width: 1;',
    '  stroke-dasharray: 4 3;',
    '  stroke-linejoin: round;',
    '  vector-effect: non-scaling-stroke;',
    '}',
    /* 本期轮廓：强调色实线 2px ＋ 强调色淡洗的面（有文字的面才走软底，这里是图形 ⇒ 实线强调色）。 */
    s('now') + ' {',
    '  fill: ' + wash('accent', 22) + ';',
    '  stroke: ' + skinVar('accent') + ';',
    '  stroke-width: 2;',
    '  stroke-linejoin: round;',
    '  vector-effect: non-scaling-stroke;',
    '}',
    s('dot') + ' {',
    '  fill: ' + skinVar('accent') + ';',
    '  stroke: ' + skinVar('surface') + ';',
    '  stroke-width: 1;',
    '}',
    /* 轴名：名字一行、读数一行；位置由行内 `left`／`top` 给（与图上的顶点同一个映射）。
       `width: max-content` 是**必须写**的一条：绝对定位的盒子默认按"到容器右边缘的距离"收缩，
       正右那几根只剩百分之几的宽度 ⇒ 名字被压成一列孤字（实测：`肌肉量` 折成三行）。 */
    s('axlabel') + ' {',
    '  position: absolute;',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 1px;',
    '  width: max-content;',
    '  min-width: 0;',
    '  max-width: calc(' + String(RADAR_PROFILE_MAX_LABEL_CHARS) + ' * ' + skinVar('fs-xs') + ' + 4px);',
    '  line-height: ' + String(LABEL_LEAD) + ';',
    '  overflow-wrap: anywhere;',
    '}',
    s('axlabel') + '.is-top {',
    '  transform: translate(-50%, -100%);',
    '  text-align: center;',
    '}',
    s('axlabel') + '.is-bottom {',
    '  transform: translate(-50%, 0);',
    '  text-align: center;',
    '}',
    s('axlabel') + '.is-right {',
    '  transform: translate(0, -50%);',
    '  text-align: left;',
    '}',
    s('axlabel') + '.is-left {',
    '  transform: translate(-100%, -50%);',
    '  text-align: right;',
    '}',
    s('axname') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s('axvalue') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-style: normal;',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 缺测的那一根：名字照出、读数写 `—`，颜色压到弱文字一档（不当 0 分算）。 */
    s('axlabel') + '.is-missing ' + c('axvalue') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '}',
    /* 可见焦点：本件自身不带可点元素，这一条是**地板**——调用方把某一行或某根轴包成入口时，
       焦点必须看得见（`focus-visible` 只留给真实键盘用户，不是主通路）。 */
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 图外面的读数件（刻度条／读数表／平均分／图例／未达标点名／脚注）在 `style-readouts.ts`：',
    '   同一份纪律、同一个前缀，插在这里——顺序即层叠顺序（各段选择器互不相交）。 */',
    radarProfileReadoutsCss({ prefix: p }),
    '/* 两形态自己的形状（扇区／外沿弧／达标环／轴表的行与轨道）在 `style-forms.ts`：',
    '   同一份纪律、同一个前缀，插在这里——顺序即层叠顺序。 */',
    radarProfileFormsCss({ prefix: p }),
    '/* 窄容器（<' + String(RADAR_PROFILE_NARROW_PX) + 'px，阈值住 `attrs.ts`，三份样式文件共用同一份）：',
    '   读数表收一档、行内距收一档 —— **一列不减**；宽度靠 `minmax(0,1fr)`／`flex: 1 1 0` 自己变窄。 */',
    '@container (max-width: ' + String(RADAR_PROFILE_NARROW_PX) + 'px) {',
    '  ' + s('trow') + ' {',
    '    gap: 3px 6px;',
    '    padding: 4px 0;',
    '  }',
    '  ' + s('gap') + ' {',
    '    gap: 2px 8px;',
    '  }',
    '}',
    '/* 宽容器（≥' + String(RADAR_PROFILE_WIDE_PX) + 'px）：形态 `polygon` 的图与读数表并排。',
    '   图那一列按**自己的**宽度排（轴名内距在里面），表在右边自己收窄。 */',
    '@container (min-width: ' + String(RADAR_PROFILE_WIDE_PX) + 'px) {',
    '  ' + box + '.is-polygon ' + c('body') + ' {',
    '    grid-template-columns: ' + WIDE_STAGE_COL + ' minmax(0, 1fr);',
    '    gap: 18px;',
    '    align-items: start;',
    '  }',
    '}',
  ].join(LF);
}
