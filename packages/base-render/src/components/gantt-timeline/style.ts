/** gantt-timeline · **样式段**（本件唯一的样式来源；段与图例那几档读数在 `style-marks.ts`，由这里汇总）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方的页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ `flex-wrap`；本件不写任何 `@media`（视口宽 ≠ 组件宽）。
 *
 *  几何契约（判据钉住）：
 *   · 窄容器（<620px）＝ **标签折到轨迹之上**（一行里：名字 ｜ 读数 ｜ 整条轨迹），零横向溢出靠换行；
 *   · 宽容器（≥620px）＝ **左侧 96px 标签列 ＋ 右侧轨迹列**（「现在」游标按同一列宽换算位置）；
 *   · 本件不写 `overflow:hidden`、不写 `text-overflow`：长的名字与读数一律换行，**不许 `…` 截断**。
 *
 *  选中／填充四档照 `docs/base/base-render/选中态与皮肤语言.md` 的法则表：
 *   有文字的（关键路径段里那枚顺序号、**带了短字的那根条 `is-labelled`**、游标上那枚时间、图例那几枚）
 *   走 **`accent-soft` 底 ＋ `accent-text` 字 ＋ `accent` 描边**；
 *   无文字的（进行中那根**不带短字**的实底条）走 **`accent` 实底**（那条上只有 `▶` 这类图形，没有正文）。
 */
import { skinVar } from '../skin/contract.js';
import { GANTT_TIMELINE_AT_VAR, ganttTimelineSlot, type GanttTimelineSlot } from './attrs.js';
import { ganttTimelineMarksCss } from './style-marks.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 宽容器阈值（px）：≥它＝**标签列在左侧 ＋ 轨迹占右边**（缺省那一套），<它＝标签折到轨迹之上。
 *  **这是本件自己的宽度**（`@container` 判的）；样式段把它写成 `@container (max-width: 619px)` 那一支——
 *  本层既有件一律「缺省＝宽档 ＋ `@container (max-width:)`」（先例 `hour-band`／`goal-stairs`），
 *  而且横切判据会把 `min-width` 里超过 390 的数字读成"过不了窄档的固定宽度"。 */
export const GANTT_TIMELINE_WIDE_MIN_PX = 620;
/** 宽档左侧标签列宽（px）；窄档折到轨迹之上，故窄档用不到它。 */
export const GANTT_TIMELINE_LABEL_PX = 96;
/** 标签列与轨迹列之间的间距（px）。 */
export const GANTT_TIMELINE_GAP_PX = 10;
/** 条的高度（px）。 */
export const GANTT_TIMELINE_BAR_PX = 22;
/** 轨迹的最小高度（px）。 */
export const GANTT_TIMELINE_TRACK_MIN_PX = 28;
/** 「现在」游标那条带的高度（px）：游标那枚字住在这里，**不压在第一条泳道上**。 */
export const GANTT_TIMELINE_NOW_BAND_PX = 22;
/** 刻度数字占的那一行高度（px）：数字住在格线的**上面**，所以要给它留出来。 */
export const GANTT_TIMELINE_TICK_BAND_PX = 20;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function ganttTimelineCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-gantt-timeline';
  /** **槽类名**（不带 scope）：写「某槽下的子件」时只许用它（拼第二遍 scope ＝ 永不命中的死规则）。 */
  const c = (slot: GanttTimelineSlot): string => '.' + ganttTimelineSlot(slot, p);
  /** **带 scope 的完整选择器**（一条规则打头用）。 */
  const s = (slot: GanttTimelineSlot): string => root + ' ' + c(slot);

  /** 格线的淡一档（次要格线）：从 `line` 掺进透明算出来，不写死色值。 */
  const faint = 'color-mix(in srgb, ' + skinVar('line') + ' 55%, transparent)';
  /** 宽档「标签列 ＋ 轨迹列」两列的写法（刻度行与每一行共用这一份，数字与条才天然对齐）。 */
  const cols = String(GANTT_TIMELINE_LABEL_PX) + 'px minmax(0,1fr)';
  /** 宽档游标的横坐标：`标签列 ＋ 间距 ＋ （剩下的宽度 × 位置）`。 */
  const wideAt = String(GANTT_TIMELINE_LABEL_PX + GANTT_TIMELINE_GAP_PX) + 'px + (100% - '
    + String(GANTT_TIMELINE_LABEL_PX + GANTT_TIMELINE_GAP_PX) + 'px) * var(' + GANTT_TIMELINE_AT_VAR + ')';
  /** 窄档游标的横坐标：轨迹占满整行宽度，直接按百分比落。 */
  const narrowAt = '100% * var(' + GANTT_TIMELINE_AT_VAR + ')';

  return [
    '/* gantt-timeline（甘特时间线 · 形态 C「资源泳道（灶位）× 关键路径带」）：',
    '   一行＝一条资源，问的是这条资源什么时候空；关键路径单独一条，段上标 1 起的顺序号；',
    '   空档段画成点线块并写分钟数。层次靠发丝格线、字重与底色三样，换皮只换取值。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度排。 */
    '  container-type: inline-size;',
    '  box-sizing: border-box;',
    '  display: grid;',
    '  gap: 8px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    /* 宿主页不保证是 `border-box`（真页面默认 content-box）：本件带边框／内距的位子
       在那种页里会比容器宽出边框那几像素 ⇒ 在本件**自己的子树里**把它钉成 `border-box`。 */
    box + ' * {',
    '  box-sizing: border-box;',
    '}',
    '/* 卡头：标题 ｜ 泳道数 ｜ 右端读数。**不放按钮**——按钮归 `action-bar`。 */',
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
    s('stamp') + ' {',
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
    '  margin-left: auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 刻度行：左端量名 ＋ 逐格一枚格线。缺省＝**宽档**（量名占左侧标签列，与每一行同一套列宽，',
    '   数字与条才天然对齐）；窄档（`@container` 那一段）量名折到刻度之上——**不藏信息**：单位哪一档都看得见。 */',
    s('axrow') + ' {',
    '  display: grid;',
    '  grid-template-columns: ' + cols + ';',
    '  gap: 2px ' + String(GANTT_TIMELINE_GAP_PX) + 'px;',
    '  align-items: end;',
    '  min-width: 0;',
    '}',
    s('lbh') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 刻度区给那几枚数字留出一行（数字住在格线的**上面**：`bottom:100%`）。 */
    s('ax') + ' {',
    '  display: grid;',
    '  margin-top: ' + String(GANTT_TIMELINE_TICK_BAND_PX) + 'px;',
    '  height: 18px;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '  min-width: 0;',
    '}',
    s('tick') + ' {',
    '  position: relative;',
    '  display: block;',
    '  min-width: 0;',
    '  border-left: 1px solid ' + faint + ';',
    '}',
    '/* 有数字的那几格：格线更深（读者一眼看出"整段"在哪）——数字由轴域算，不由调用方数。 */',
    s('tick') + '.is-num {',
    '  border-left-color: ' + skinVar('line') + ';',
    '}',
    /* 数字写在自己那一格的**左上角**、念在格线上面；最后一格上的数字改右对齐（往左长，跑不出刻度区）。
       `max-width` 是**给它的那一整段**（相邻两枚数字之间的格数），长了就换行——本件不写省略号。 */
    s('tick-label') + ' {',
    '  position: absolute;',
    '  left: 0;',
    '  bottom: 100%;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  line-height: 1.5;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('tick-label') + '.is-end {',
    '  left: auto;',
    '  right: 0;',
    '  text-align: right;',
    '}',
    '/* 泳道区：「现在」游标 ＋ 各行。游标那枚字**自己占一行**（见下），所以这里不再给它垫一条固定高度的带。 */',
    s('body') + ' {',
    '  position: relative;',
    '  min-width: 0;',
    '}',
    s('now') + ' {',
    '  position: absolute;',
    '  top: 0;',
    '  bottom: 0;',
    '  left: calc(' + wideAt + ');',
    '  width: 0;',
    '  border-left: 2px solid ' + skinVar('accent') + ';',
    '  z-index: 2;',
    '  pointer-events: none;',
    '}',
    /* 游标上那枚字：**在流里自己占一行**（不是绝对定位在一条固定高度的带里）。
       为什么：原先它住在 `.is-now` 那条 22px 的带里、字一换行就盖住下面第一条行
       （实测「字底 − 第一条 row 顶」＝ +17px／+18.5px）。放进流里 ⇒ 带高**随字长**，
       字换行只把行往下推，永远压不到第一条；`min-height` 保住原来的带高（`NOW_BAND_PX`）。
       横坐标与那条竖线读**同一个**自定义属性（`wideAt`／`narrowAt` 各只写一遍）。
       有文字 ⇒ 走软底那一档（`accent-soft` ＋ `accent-text` ＋ `accent` 描边），
       实底上放 12px 的正文在 neutral 皮肤下过不了 4.5 的文本地板（法则表第三节）。 */
    s('now-label') + ' {',
    '  display: flex;',
    '  align-items: center;',
    '  width: fit-content;',
    '  min-height: ' + String(GANTT_TIMELINE_NOW_BAND_PX) + 'px;',
    '  margin: 0 0 4px calc(' + wideAt + ' + 4px);',
    '  padding: 0 6px;',
    '  border: 1px solid ' + skinVar('accent') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('accent-soft') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  line-height: 1.5;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('now-label') + '.is-end {',
    '  margin: 0 calc(100% - (' + wideAt + ') + 4px) 4px auto;',
    '  justify-content: flex-end;',
    '  text-align: right;',
    '}',
    '/* 一行：缺省＝宽档（标签列 ＋ 轨迹列）；窄档（`@container` 那一段）＝标签折到轨迹之上（一列）。 */',
    s('row') + ' {',
    '  display: grid;',
    '  grid-template-columns: ' + cols + ';',
    '  gap: 3px ' + String(GANTT_TIMELINE_GAP_PX) + 'px;',
    '  align-items: center;',
    '  min-height: 38px;',
    '  min-width: 0;',
    '}',
    s('row') + ' + ' + c('row') + ' {',
    '  border-top: 1px solid ' + faint + ';',
    '}',
    s('row-label') + ' {',
    '  min-width: 0;',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.35;',
    '  color: ' + skinVar('ink') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    s('row-name') + ' {',
    '  display: block;',
    '  font-weight: 600;',
    '}',
    s('row-note') + ' {',
    '  display: block;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-style: normal;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 轨迹：格数由轴域算，列宽写成行内样式（格数与落位是同一份事实）。 */',
    s('track') + ' {',
    '  display: grid;',
    '  grid-auto-rows: minmax(0,1fr);',
    '  align-items: center;',
    '  min-height: ' + String(GANTT_TIMELINE_TRACK_MIN_PX) + 'px;',
    '  min-width: 0;',
    '}',
    '/* 段与图例那几档读数（住 style-marks.ts）：同一份纪律、同一个前缀，插在这里——',
    '   搬走的是行数，不是取值（本包告警线 350 行）。 */',
    ganttTimelineMarksCss({ prefix: p }),
    '/* 口径行：这一张图怎么读（一句话，可以很长）。 */',
    s('note') + ' {',
    '  margin: 0;',
    '  padding-top: 2px;',
    '  border-top: 1px solid ' + faint + ';',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.7;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 本件自身不带可点元素（游标与条都只是读数）。这一条是**地板**：',
    '   调用方若把某一行包成链接，焦点必须看得见——不许只写 `outline:none` 而不给替代。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄容器（≤' + String(GANTT_TIMELINE_WIDE_MIN_PX - 1) + 'px）：**标签折到轨迹之上**',
    '   （一行里：名字 ｜ 读数 ｜ 整条轨迹），游标位置也改按整行宽度算。',
    '   为什么写窄档这一支而不是写宽档那一支：本层既有件一律**缺省＝宽档 ＋ `@container (max-width:)`**',
    '   （先例 `hour-band`／`goal-stairs`）——本包那条横切判据会把 `min-width` 里超过 390 的数字读成',
    '   「过不了窄档的固定宽度」。判的是**本件自己的宽度**：本件会被嵌进侧栏／面板／卡片，',
    '   视口宽 ≠ 组件宽（所以这里不用 `@media`）。 */',
    '@container (max-width: ' + String(GANTT_TIMELINE_WIDE_MIN_PX - 1) + 'px) {',
    '  ' + s('axrow') + ',',
    '  ' + s('row') + ' {',
    '    grid-template-columns: minmax(0,1fr);',
    '  }',
    '  ' + s('row') + ' {',
    '    padding: 4px 0;',
    '  }',
    '  ' + s('row-name') + ' {',
    '    display: inline;',
    '  }',
    '  ' + s('row-note') + ' {',
    '    display: inline;',
    '    margin-left: 6px;',
    '  }',
    '  ' + s('now') + ' {',
    '    left: calc(' + narrowAt + ');',
    '  }',
    '  ' + s('now-label') + ' {',
    '    margin-left: calc(' + narrowAt + ' + 4px);',
    '  }',
    '  ' + s('now-label') + '.is-end {',
    '    margin: 0 calc(100% - ' + narrowAt + ' + 4px) 4px auto;',
    '  }',
    '}',
  ].join(LF);
}
