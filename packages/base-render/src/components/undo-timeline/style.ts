/** undo-timeline · **样式段**（本件唯一的样式入口；一条轨那半住 `style-track.ts`、回滚单那半住
 *  `style-impact.ts`，两个都由这里的 `undoTimelineCss()` 汇总——**搬走的是行数，不是取值**）。
 *
 *  纪律（与本层其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：本件自己 `container-type: inline-size`（见下），窄档走 `@container`；
 *     媒体查询只判设备能力（`hover:hover` ＋ `pointer:fine`／`prefers-reduced-motion`），**不判宽度**。
 *
 *  交互状态矩阵（工艺 §5 那一份，逐条在判据里断到）：
 *   `rest` ｜ `:hover`（包在设备能力查询里，且**不是唯一通路**——那几枚按钮本来就能点、能触）
 *   ｜ `:active`（真按下：`scale(.98)`，80ms，**只碰 `transform`**）｜ `:focus-visible`（2px 可见焦点）
 *   ｜ `disabled`（`cursor: not-allowed` ＋ 三态里的「不可撤」写出为什么）｜ `busy`（原地换字：
 *   忙碌那枚字住在正常那枚字里面、绝对定位在它这块上，出流 ⇒ 不参与按钮的固有宽，换字不跳版）
 *   ｜ `error`（写在那一行按钮旁边 ＋ `aria-describedby`）｜ `empty`（设计过的空态，见 `style-track.ts`）。
 *  状态一律同步改写属性与文本，**不依赖 `transitionend`**；`prefers-reduced-motion` 下把过渡关掉。
 */
import { skinVar } from '../skin/contract.js';
import {
  UNDO_TIMELINE_BUSY_ATTR,
  UNDO_TIMELINE_CONTAINER,
  UNDO_TIMELINE_HOVER_QUERY,
  UNDO_TIMELINE_NARROW_PX,
  UNDO_TIMELINE_PRESS_MS,
  UNDO_TIMELINE_TOUCH_PX,
  undoTimelineSlot,
  type UndoTimelineSlot,
} from './attrs.js';
import { undoTimelineImpactCss } from './style-impact.js';
import { undoTimelineTrackCss } from './style-track.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 一枚按钮的左右内距（px）。**忙碌那枚字也读它**：它靠这个数把自己撑到按钮的整幅宽度
 *  （负外扩 ＝ 内距），于是「正在 ＋ 按钮字」比静息态长这件事只在按钮内部消化——两侧都不越出按钮。
 *  两处必须同源（判据断这一条）。 */
const BT_PAD_X_PX = 14;

/** 尺寸事实只住 `attrs.ts` 一处；从本件的名字面（`index.ts`）转发出去，取值不改。 */
export { UNDO_TIMELINE_GAP_PX, UNDO_TIMELINE_NARROW_PX, UNDO_TIMELINE_ROW_MIN_PX, UNDO_TIMELINE_TOUCH_PX } from './attrs.js';

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function undoTimelineCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /** **槽类名**（不带 scope）：写「某槽下的子件」时只许用它——带 scope 的完整选择器再拼一次，
   *  会拼出**永远不命中**的死规则（语法合法、编译不报错、屏幕上"看着也还行"）。 */
  const c = (slot: UndoTimelineSlot): string => '.' + undoTimelineSlot(slot, p);
  /** **带 scope 的完整选择器**（一条规则打头用）。 */
  const s = (slot: UndoTimelineSlot): string => root + ' ' + c(slot);
  const box = root + ' .' + p + 'block-undo-timeline';

  return [
    /* 一条轨那半（含竖轨的收口与窄档的行重排）。 */
    undoTimelineTrackCss(input),
    '/* ── 卡壳、页脚与那几枚按钮（两形态共用） ───────────────────────── */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度折行。
       起一个容器名，`@container` 按名字命中，不会跟别件的容器串味。 */
    '  container: ' + UNDO_TIMELINE_CONTAINER + ' / inline-size;',
    '  display: grid;',
    '  min-width: 0;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '  overflow: hidden;',
    '}',
    s('head') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 10px;',
    '  padding: 12px 14px;',
    '  min-width: 0;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '}',
    s('title') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-display') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  line-height: 1.3;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 卡头右端那句：`margin-left:auto` 把它顶到右缘；窄档自己折到下一行（不压标题、不截断）。 */',
    s('cap') + ' {',
    '  margin-left: auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 页脚：结论句 ＋ 动作（结论句吃满剩下的一格，动作排到右端）。 */',
    s('foot') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 8px 10px;',
    '  padding: 12px 14px;',
    '  min-width: 0;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '}',
    s('sum') + ' {',
    '  flex: 1 1 12ch;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 卡底那句提示：也是"按不动"的说明（本件没有一处把原因藏着）。 */',
    s('hint') + ' {',
    '  margin: 0;',
    '  padding: 10px 14px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 一枚按钮：命中盒 ≥44×44、长字**折行不截断**（`max-width:100%` 兜住）。',
    '   两枚字（正常态／忙碌态）落在**同一处**：忙碌那枚住在正常那枚里面、绝对定位在它这块上。 */',
    s('bt') + ' {',
    '  position: relative;',
    '  display: inline-grid;',
    '  place-items: center;',
    '  min-width: ' + String(UNDO_TIMELINE_TOUCH_PX) + 'px;',
    '  min-height: ' + String(UNDO_TIMELINE_TOUCH_PX) + 'px;',
    '  max-width: 100%;',
    '  padding: 8px ' + String(BT_PAD_X_PX) + 'px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  transition: transform ' + String(UNDO_TIMELINE_PRESS_MS) + 'ms linear;',
    '}',
    '/* 正常那枚字：占着按钮那一格，也是忙碌那枚字的**定位基准**（`position:relative`）。 */',
    s('bt') + ' > ' + c('label') + ' {',
    '  position: relative;',
    '  grid-area: 1 / 1;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 忙碌那枚字：绝对定位在正常那枚字这块上，横向按按钮的左右内距外扩 ⇒ 这一块正好是按钮的可用宽度',
    '   （`正在 ＋ 按钮字` 太长就在按钮内部折行，两侧都不越出按钮）。出流 ⇒ 它一个字都不参与按钮的',
    '   固有宽：换字时按钮尺寸纹丝不动（正常那枚 `visibility:hidden` 仍占着它的位置）。 */',
    s('busy') + ' {',
    '  position: absolute;',
    '  left: -' + String(BT_PAD_X_PX) + 'px;',
    '  right: -' + String(BT_PAD_X_PX) + 'px;',
    '  top: 50%;',
    '  transform: translateY(-50%);',
    '  display: grid;',
    '  place-items: center;',
    '  visibility: hidden;',
    '}',
    s('bt') + '[' + UNDO_TIMELINE_BUSY_ATTR + '="1"] > ' + c('label') + ' {',
    '  visibility: hidden;',
    '}',
    s('bt') + '[' + UNDO_TIMELINE_BUSY_ATTR + '="1"] ' + c('busy') + ' {',
    '  visibility: visible;',
    '}',
    '/* 主动作那一档（有文字的选中面）：**软底 ＋ 强调字 ＋ 强调描边**，不是强调实底',
    '   （正文级字压在强调实底上，neutral 那套只有 4.02，过不了 4.5 的文本地板）。 */',
    s('bt') + '.is-primary {',
    '  background: ' + skinVar('accent-soft') + ';',
    '  border-color: ' + skinVar('accent') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-weight: 700;',
    '}',
    s('bt') + '[disabled] {',
    '  cursor: not-allowed;',
    '  background: ' + skinVar('surface-2') + ';',
    '  border-color: ' + skinVar('line') + ';',
    '  color: ' + skinVar('ink-3') + ';',
    '}',
    '/* hover 只许是增强、不许是唯一通路 ⇒ 包在设备能力查询里（触屏上没有 hover 这回事）。',
    '   判据与运行时读的是同一个能力查询串（`UNDO_TIMELINE_HOVER_QUERY`）。 */',
    '@media ' + UNDO_TIMELINE_HOVER_QUERY + ' {',
    '  ' + s('bt') + ':not([disabled]):hover {',
    '    border-color: ' + skinVar('accent') + ';',
    '    color: ' + skinVar('accent-text') + ';',
    '  }',
    '}',
    '/* 真按下：80ms 的一次缩放（**只碰 `transform`**，碰布局属性就是按下即重排）。 */',
    s('bt') + ':not([disabled]):active {',
    '  transform: scale(.98);',
    '}',
    '/* 可见焦点：本件不带键盘通路，`focus-visible` 只留给真实键盘用户（无障碍地板，别删）。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄容器（<' + String(UNDO_TIMELINE_NARROW_PX) + 'px）：卡头右端那句与页脚各占一行，',
    '   按钮排满整行。判的是**本件自己的宽度**（容器名由本件声明）。 */',
    '@container ' + UNDO_TIMELINE_CONTAINER + ' (max-width: ' + String(UNDO_TIMELINE_NARROW_PX) + 'px) {',
    '  ' + s('cap') + ' {',
    '    margin-left: 0;',
    '    flex: 1 1 100%;',
    '  }',
    '  ' + s('head') + ' {',
    '    padding: 12px 10px;',
    '  }',
    '  ' + s('foot') + ' {',
    '    padding: 12px 10px;',
    '  }',
    '  ' + s('sum') + ' {',
    '    flex: 1 1 100%;',
    '  }',
    '  ' + s('hint') + ' {',
    '    padding: 10px;',
    '  }',
    '}',
    '/* 减少动态：把过渡直接关掉（**不为动效设状态**，所以不会卡在半路）。 */',
    '@media (prefers-reduced-motion: reduce) {',
    '  ' + s('bt') + ' {',
    '    transition: none;',
    '  }',
    '}',
    /* 回滚单那半（形态 `impact` 的整张卡／`track` 里摊开的那一块）。 */
    undoTimelineImpactCss(input),
  ].join(LF);
}
