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
    '/* goal-stairs（目标阶梯 · 形态 C「倒推日程：每段最晚何时动手」）：一段一行，',
    '   行头说这一段是什么与最晚哪天动手，轨道把这一段在整段日程上占了哪一截画出来。',
    '   层次不靠阴影与大圆角（小票纸零阴影、大字报刊零圆角）：靠发丝线、侧标与字重 ⇒ 换皮只换取值。 */',
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
    '/* 段数那枚：**算出来的**（调用方给不出错的段数）。字是件里自己的短词，故可以 `nowrap`。 */',
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
    '/* 右端那句（`竖线＝今天 09-24`）**分两枚**：前两枚字固定不折，日期自己是调用方的串，',
    '   长了就在自己那段里换行——不截断、也不把前面那句挤散。 */',
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
    '/* 缺省＝宽档：行头那一列（`GOAL_STAIRS_HEAD_COLUMN_PX`）与轨道并排，一段一行读得下更多段。',
    '   窄容器（本件自己的宽度 ≤ `GOAL_STAIRS_WIDE_PX − 1`）换成上下两行，见文件末的 `@container`。',
    '   判的是**本件自己的宽度**：本件会被嵌进侧栏／面板／卡片，视口宽 ≠ 组件宽。 */',
    s('row') + ' {',
    '  display: grid;',
    '  grid-template-columns: ' + String(GOAL_STAIRS_HEAD_COLUMN_PX) + 'px minmax(0, 1fr);',
    '  gap: 6px 12px;',
    '  align-items: center;',
    '  padding: 12px 0;',
    '  min-width: 0;',
    '}',
    '/* 行与行之间一条发丝线（零阴影下靠它分家）。 */',
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
    '/* 过期点名：窗口整段落在今天左边、这一段又没达成时才出这一枚（字，不只靠颜色）。 */',
    s('late') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('danger') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  white-space: nowrap;',
    '}',
    '/* 状态字顶到右缘（`margin-left: auto`）：段名再长也压不到它——压窄就自己折到下一行。 */',
    s('state') + ' {',
    '  flex: none;',
    '  margin-left: auto;',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  white-space: nowrap;',
    '}',
    '/* 三档状态色都是**文字**用的档（`accent-text` 是强调色的文本档）：',
    '   色只是三样里的第三样，字（已达成 ✓／进行中 ▶／还没开始 ○）与侧标才是主路径。 */',
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
    '/* 轨道：`min-height` 不是 `height`——那枚「最晚」标签是**在流里**的（见下一条），',
    '   日期一长它自己换行，轨道跟着长；写死高度就会把换行的标签顶出轨道上下两端。',
    '   轨道本身是 grid ＋ `align-content: center`：标签单行时与缺省高一样居中。 */',
    s('track') + ' {',
    '  position: relative;',
    '  display: grid;',
    '  align-content: center;',
    '  min-height: ' + String(GOAL_STAIRS_TRACK_PX) + 'px;',
    '  min-width: 0;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '}',
    '/* 窗口带（**无文字的条**，且是 `aria-hidden`：这一段在整段日程上占了哪一截，字形全在行头）。',
    '   左右两端都用百分比夹在轨道里，故任何入参下都不会比轨道宽。',
    '   **侧标画成 `inset` 投影、不画成边框**：边框会把盒宽顶到「两边框之和」那 2px 的下限——',
    '   窗口只有 0.01% 宽时那 2px 会把右端顶出轨道（320／390／620／1280 实测各 +0.59…0.95px，',
    '   件根当场 `scrollWidth = clientWidth + 1`）。投影不占盒。 */',
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
    '/* 还没开始的段：次要面（`surface-2` 的定义就是软底块），不带侧标——它是缺省档，不是被点名的那一档。 */',
    s('band') + '.is-plan {',
    '  background: ' + skinVar('surface-2') + ';',
    '}',
    '/* 进行中：强调色的淡洗 ＋ 2px 强调侧标（形）。 */',
    s('band') + '.is-now {',
    '  background: color-mix(in srgb, ' + skinVar('accent') + ' 16%, ' + skinVar('surface') + ');',
    '  box-shadow: inset ' + String(GOAL_STAIRS_MARK_PX) + 'px 0 0 ' + skinVar('accent') + ';',
    '}',
    '/* 已达成：语义档走 `ok`（达标），不借强调色。 */',
    s('band') + '.is-done {',
    '  background: color-mix(in srgb, ' + skinVar('ok') + ' 16%, ' + skinVar('surface') + ');',
    '  box-shadow: inset ' + String(GOAL_STAIRS_MARK_PX) + 'px 0 0 ' + skinVar('ok') + ';',
    '}',
    '/* 过期且未达成：语义档走 `danger`（写在这一条最后，压过 `is-now`／`is-plan`）。 */',
    s('band') + '.is-late {',
    '  background: color-mix(in srgb, ' + skinVar('danger') + ' 16%, ' + skinVar('surface') + ');',
    '  box-shadow: inset ' + String(GOAL_STAIRS_MARK_PX) + 'px 0 0 ' + skinVar('danger') + ';',
    '}',
    '/* 今天那根竖线（**纯装饰**：今天是哪天由卡头的字说）。位置夹在轨道内：标记落在 0% 或 100% 时',
    '   也留得下这 ' + String(GOAL_STAIRS_MARK_PX) + 'px，不顶出轨道右缘。',
    '   上下各让出 2px 是**有意的**（游标要在带子与轨道边上都看得见；带子只与轨道同高）。 */',
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
    '/* 最晚动手日那枚标签（**有字，真读**）：**在流里**的网格项，位置靠百分比外边距（外边距的百分比',
    '   按轨道宽算），不是绝对定位——绝对定位＋定高轨道，两行的日期就会上下顶出轨道各 5.8px；',
    '   在流里则轨道跟着长（`min-height` 只是地板），上下左右四向都不越界。',
    '   标记落在轴的左半边：从标记往右长（`margin-left`）；右半边（`.is-right`）：贴右缘往左长。',
    '   日期太长时它自己换行（`overflow-wrap: anywhere`）：**不截断、不外溢**。',
    '   `z-index` 是为了压在窗口带上面（带子是定位元素，在流里的内容默认被它盖住）。 */',
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
    '/* 本件自身不带可点元素。这一条是**地板**：调用方若把段名或口径行包成链接，',
    '   焦点必须看得见——不许只写 `outline:none` 而不给替代。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄档（本件自己的宽度 ≤ `GOAL_STAIRS_NARROW_MAX_PX`＝宽档阈值 − 1）：行头在上、轨道在下。',
    '   写 `max-width` 不写 `min-width` 是**本层既有的写法**（先例 `scatter-fit`／`cash-waterline`）：',
    '   缺省那一份是宽档，容器查询只负责把窄档那一支换上去；这样件在任何没挂容器查询的环境里',
    '   也照样是完整的一份版式，不会只剩「窄档那一支」。 */',
    '@container (max-width: ' + String(GOAL_STAIRS_NARROW_MAX_PX) + 'px) {',
    '  ' + s('row') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '    gap: 6px;',
    '  }',
    '}',
  ].join(LF);
}
