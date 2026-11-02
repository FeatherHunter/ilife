/** goal-stairs · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本层其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下、**每条里作用域恰一次**（拼后代／兄弟选择器时只用不带 scope 的裸槽类）；
 *     不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ `flex-wrap`；本件不写任何 `@media`
 *     （视口宽 ≠ 组件宽；本件也没有 `transition`／`animation`，故没有什么会卡在半路）。
 *
 *  强制的四处口径（判据钉住）：
 *   · **状态靠形 ＋ 字 ＋ 色三样**：窗口带左侧 2px 侧标（形）＋ 带色（色）＋ 行头的状态字（字）；
 *     过期那一段另在行头写「来不及 ✕」（字）。**没有一处拿正文墨色当"面"**；
 *     说清三笔账：**带是无文字的条**（`aria-hidden`，`textContent` 是空的）、**字在行头**，
 *     字底下没有本件画的底（`.state` 的背景是透明的 ⇒ 它压的是宿主页的底）——判据按「字真压的底」断，
 *     带子那一层只断「形 ＋ 色」，不冒充文字底；
 *   · **标签四向都不出轨道**：最晚动手日那枚标签**在流里**（网格项 ＋ 百分比外边距），
 *     标记落在轴的右半边时改贴右缘长（`is-right`），长日期自己换行、轨道跟着长——
 *     **不截断、不外溢、上下也不顶出**（绝对定位＋定高轨道时两行日期会上下各顶出 5.8px，实测过）；
 *   · **今天那根竖线不越界**：位置用 `clamp()` 夹在轨道内 2px（`left: 100%` 时那根 2px 的线
 *     会顶出轨道右缘，390 档实测过）；上下各让出 2px 是有意的（游标要在带子上看得见）；
 *   · **几何只用本件自己的自定义属性**（`--goal-stairs-start`／`-end`／`-now`，名字住 `attrs.ts`）——
 *     先例 `photo-compare` 的 `--photo-compare-split`，不占 `--ilife-*` 那个皮肤命名空间。
 */
import { skinVar } from '../skin/contract.js';
import {
  GOAL_STAIRS_END_VAR,
  GOAL_STAIRS_NOW_VAR,
  GOAL_STAIRS_START_VAR,
  goalStairsSlot,
  type GoalStairsSlot,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 轨道**最矮**多高（px）：这一段占了多久靠它有一个看得见的盒。
 *  是地板不是定高——「最晚」那枚标签在流里，日期换行时轨道跟着长（定高会把两行的标签顶出轨道）。 */
export const GOAL_STAIRS_TRACK_PX = 30;

/** 今天的竖线与窗口带的侧标同宽（px）：两根竖线一样粗，读者不会把「当前」读成别的意思。 */
export const GOAL_STAIRS_MARK_PX = 2;

/** 宽档行头那一列的宽（px）：段名与窗口句在这一列里自己折行，轨道占右边整条。 */
export const GOAL_STAIRS_HEAD_COLUMN_PX = 200;

/** 宽档阈值（px）：**容器宽**过了它，行头与轨道并排；不到就上下两行。
 *  判的是本件自己的宽度（`@container`），不是视口宽度——本件会被嵌进侧栏／面板／卡片里。 */
export const GOAL_STAIRS_WIDE_PX = 620;

/** 窄档的上界（px）＝宽档阈值 − 1：`@container` 那一支判的是它。
 *
 *  为什么写窄档这一支、而不是写「宽档那一支」：本层既有件一律**缺省＝宽档 ＋ `@container (max-width:)`
 *  换窄档**（先例 `scatter-fit` 的 460／`cash-waterline` 的 620）。两条渲染结果逐像素等价，
 *  但性质不同：缺省那一份是**完整的一份版式**，容器查询只是把窄档换上去——反过来写的话，
 *  凡是没有容器查询生效的环境（老页面、被别的容器捕捉、打印）就只剩「窄档那一支」。 */
export const GOAL_STAIRS_NARROW_MAX_PX = GOAL_STAIRS_WIDE_PX - 1;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function goalStairsCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-goal-stairs';
  /* 槽类名（**不带 scope**）：只用在已经落进本件某条选择器内部的位置（前缀由外层那条选择器给）。
     拿带 scope 的完整选择器去拼后代选择器，会拼出 `.page-ui .a .page-ui .b` —— 第二条 `.page-ui`
     永远匹配不到，规则「看着在、其实不生效」。 */
  const c = (slot: GoalStairsSlot): string => '.' + goalStairsSlot(slot, p);
  /** 带 scope 的完整选择器（一条规则打头用）。 */
  const s = (slot: GoalStairsSlot): string => root + ' ' + c(slot);

  return [
    m('base-render.components-goal-stairs-style.c001'),
    m('base-render.components-goal-stairs-style.c002'),
    m('base-render.components-goal-stairs-style.c003'),
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度折行。 */
    '  container-type: inline-size;',
    /* 宿主页不保证是 `border-box`：本件有「百分比定位 ＋ 2px 侧标」的轨道，
       在默认 content-box 下自己会算宽，故在**自己的子树里**钉成 border-box。 */
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
    /* ── 卡头 ───────────────────────────────────────────────────────── */
    s('hd') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 10px;',
    '  min-width: 0;',
    '}',
    s('title') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-display') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  line-height: 1.3;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-goal-stairs-style.c004'),
    s('count') + ' {',
    '  flex: none;',
    '  padding: 2px 8px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  letter-spacing: .04em;',
    '  white-space: nowrap;',
    '}',
    m('base-render.components-goal-stairs-style.c005'),
    m('base-render.components-goal-stairs-style.c006'),
    s('tail') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px;',
    '  margin-left: auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    s('tail-lead') + ' {',
    '  flex: none;',
    '  white-space: nowrap;',
    '}',
    s('tail-day') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* ── 逐段那张表 ─────────────────────────────────────────────────── */
    s('rows') + ' {',
    '  display: grid;',
    '  gap: 0;',
    '  margin: 0;',
    '  padding: 0;',
    '  min-width: 0;',
    '  list-style: none;',
    '}',
    m('base-render.components-goal-stairs-style.c007'),
    m('base-render.components-goal-stairs-style.c008'),
    m('base-render.components-goal-stairs-style.c009'),
    s('row') + ' {',
    '  display: grid;',
    '  grid-template-columns: ' + String(GOAL_STAIRS_HEAD_COLUMN_PX) + 'px minmax(0, 1fr);',
    '  gap: 6px 12px;',
    '  align-items: center;',
    '  padding: 12px 0;',
    '  min-width: 0;',
    '}',
    m('base-render.components-goal-stairs-style.c010'),
    s('row') + ' + ' + c('row') + ' {',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    s('head') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 6px 12px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 600;',
    '}',
    s('name') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s('window') + ' {',
    '  min-width: 0;',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-goal-stairs-style.c011'),
    s('late') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('danger') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  white-space: nowrap;',
    '}',
    m('base-render.components-goal-stairs-style.c012'),
    s('state') + ' {',
    '  flex: none;',
    '  margin-left: auto;',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  white-space: nowrap;',
    '}',
    m('base-render.components-goal-stairs-style.c013'),
    m('base-render.components-goal-stairs-style.c014'),
    s('state') + '.is-done {',
    '  color: ' + skinVar('ok') + ';',
    '}',
    s('state') + '.is-now {',
    '  color: ' + skinVar('accent-text') + ';',
    '}',
    s('state') + '.is-plan {',
    '  color: ' + skinVar('ink-2') + ';',
    '}',
    /* ── 轨道 ───────────────────────────────────────────────────────── */
    m('base-render.components-goal-stairs-style.c015'),
    m('base-render.components-goal-stairs-style.c016'),
    m('base-render.components-goal-stairs-style.c017'),
    s('track') + ' {',
    '  position: relative;',
    '  display: grid;',
    '  align-content: center;',
    '  min-height: ' + String(GOAL_STAIRS_TRACK_PX) + 'px;',
    '  min-width: 0;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '}',
    m('base-render.components-goal-stairs-style.c018'),
    m('base-render.components-goal-stairs-style.c019'),
    m('base-render.components-goal-stairs-style.c020'),
    m('base-render.components-goal-stairs-style.c021'),
    m('base-render.components-goal-stairs-style.c022'),
    s('band') + ' {',
    '  position: absolute;',
    '  top: 0;',
    '  bottom: 0;',
    '  left: var(' + GOAL_STAIRS_START_VAR + ');',
    '  right: calc(100% - var(' + GOAL_STAIRS_END_VAR + '));',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: none;',
    '  box-shadow: none;',
    '}',
    m('base-render.components-goal-stairs-style.c023'),
    s('band') + '.is-plan {',
    '  background: ' + skinVar('surface-2') + ';',
    '}',
    m('base-render.components-goal-stairs-style.c024'),
    s('band') + '.is-now {',
    '  background: color-mix(in srgb, ' + skinVar('accent') + ' 16%, ' + skinVar('surface') + ');',
    '  box-shadow: inset ' + String(GOAL_STAIRS_MARK_PX) + 'px 0 0 ' + skinVar('accent') + ';',
    '}',
    m('base-render.components-goal-stairs-style.c025'),
    s('band') + '.is-done {',
    '  background: color-mix(in srgb, ' + skinVar('ok') + ' 16%, ' + skinVar('surface') + ');',
    '  box-shadow: inset ' + String(GOAL_STAIRS_MARK_PX) + 'px 0 0 ' + skinVar('ok') + ';',
    '}',
    m('base-render.components-goal-stairs-style.c026'),
    s('band') + '.is-late {',
    '  background: color-mix(in srgb, ' + skinVar('danger') + ' 16%, ' + skinVar('surface') + ');',
    '  box-shadow: inset ' + String(GOAL_STAIRS_MARK_PX) + 'px 0 0 ' + skinVar('danger') + ';',
    '}',
    m('base-render.components-goal-stairs-style.c027'),
    m('base-render.components-goal-stairs-style.c028', { p0: String(String(GOAL_STAIRS_MARK_PX)) }),
    m('base-render.components-goal-stairs-style.c029'),
    s('today') + ' {',
    '  position: absolute;',
    '  top: -2px;',
    '  bottom: -2px;',
    '  width: ' + String(GOAL_STAIRS_MARK_PX) + 'px;',
    '  left: clamp(0px, calc(var(' + GOAL_STAIRS_NOW_VAR + ') - 1px), calc(100% - '
      + String(GOAL_STAIRS_MARK_PX) + 'px));',
    '  background: ' + skinVar('accent') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '}',
    m('base-render.components-goal-stairs-style.c030'),
    m('base-render.components-goal-stairs-style.c031'),
    m('base-render.components-goal-stairs-style.c032'),
    m('base-render.components-goal-stairs-style.c033'),
    m('base-render.components-goal-stairs-style.c034'),
    m('base-render.components-goal-stairs-style.c035'),
    s('due') + ' {',
    '  position: relative;',
    '  z-index: 1;',
    '  justify-self: start;',
    '  margin-left: calc(var(' + GOAL_STAIRS_START_VAR + ') + 4px);',
    '  padding: 0 6px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  line-height: 1.6;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('track') + '.is-right > ' + c('due') + ' {',
    '  justify-self: end;',
    '  margin-left: 0;',
    '  margin-right: calc(100% - var(' + GOAL_STAIRS_START_VAR + ') + 4px);',
    '}',
    /* ── 口径行 ─────────────────────────────────────────────────────── */
    s('note') + ' {',
    '  margin: 0;',
    '  padding-top: 8px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.7;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-goal-stairs-style.c036'),
    m('base-render.components-goal-stairs-style.c037'),
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    m('base-render.components-goal-stairs-style.c038'),
    m('base-render.components-goal-stairs-style.c039'),
    m('base-render.components-goal-stairs-style.c040'),
    m('base-render.components-goal-stairs-style.c041'),
    '@container (max-width: ' + String(GOAL_STAIRS_NARROW_MAX_PX) + 'px) {',
    '  ' + s('row') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '    gap: 6px;',
    '  }',
    '}',
  ].join(LF);
}
