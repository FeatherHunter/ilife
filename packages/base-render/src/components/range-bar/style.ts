/** range-bar · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本层其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方的页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ `flex-wrap`；本件不写任何 `@media`（视口宽 ≠ 组件宽）。
 *
 *  几何契约（判据钉住）：
 *   · **轴刻度与泳道共用同一张网格**（`.lanes` 三轨 ＋ `.ax`／`.lane` 是 `display:contents`）
 *     ⇒ 左右两栏宽度是**全表统一**的，刻度两端永远对得上轨道两端，不会一宽一窄；
 *   · 轨道是份数（`minmax(0,1fr)`）、区间是百分比 ⇒ 总宽恒等于容器宽，390 档不横滑；
 *   · 刻度标签 `flex-wrap` ＋ 8px 列距 ＋ `nowrap` ⇒ 再窄也只是换行，**不压字**（判据量两两不重叠）。
 */
import { skinVar } from '../skin/contract.js';
import {
  RANGE_BAR_NARROW_PX,
  RANGE_BAR_TEXT_HIDE_BELOW_PX,
  rangeBarSlot,
  type RangeBarSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 轨道高（px）：一行的轨道是"坐标系"而不是柱子，所以比按钮矮，但仍要让区间看得见。 */
export const RANGE_BAR_RAIL_HEIGHT_PX = 22;

/** 左右两栏的宽度（px，宽档）：类别名一栏固定、合计一栏按下限起步（`auto` 会让两行不齐）。 */
export const RANGE_BAR_KEY_COLUMN_PX = 54;
export const RANGE_BAR_TOTAL_COLUMN_PX = 66;

/** 窄档（`< RANGE_BAR_NARROW_PX`）的两栏宽度（px）：收一档把宽度让给轨道。 */
export const RANGE_BAR_KEY_COLUMN_NARROW_PX = 46;
export const RANGE_BAR_TOTAL_COLUMN_NARROW_PX = 54;

/** 刻度标签之间的最小列距（px）：**"不压字"的机械保证**（判据量的是两两不重叠）。 */
export const RANGE_BAR_TICK_GAP_PX = 8;

/** 深浅阶梯：从强调色与次要面**算出来**的四种深度（不写死颜色 ⇒ 三套皮肤下都成立）。 */
function ladder(): readonly string[] {
  const accent = skinVar('accent');
  const soft = skinVar('surface-2');
  return [
    'color-mix(in srgb, ' + accent + ' 18%, ' + soft + ')',
    'color-mix(in srgb, ' + accent + ' 40%, ' + soft + ')',
    'color-mix(in srgb, ' + accent + ' 62%, ' + soft + ')',
    skinVar('accent'),
  ];
}

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function rangeBarCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /* 槽位类的**唯一拼法**：scope（`.ilife-page-ui`）＋ 本件类名 —— 一条独立规则的完整选择器。
     要把两个槽拼成**后代选择器**时，后半截用 `c()`（`c()` 不带 scope）：两个 `s()` 拼一起会写出
     `.ilife-page-ui … .ilife-page-ui …`，那条规则永远命中不到。判据断的是"scope 恰好出现一次"。 */
  const s = (slot: RangeBarSlot): string => root + ' .' + rangeBarSlot(slot, p);
  const c = (slot: RangeBarSlot): string => '.' + rangeBarSlot(slot, p);
  const k = ladder();

  const out: string[] = [
    '/* range-bar（区间条 · 形态 A「四类泳道＋行尾合计＋整点刻度」）：一条轴上摆起止区间，',
    '   **长度就是「多久」**；行尾合计是该类的总时长。段够宽时，段里再写一遍时长字。',
    '   层次不靠阴影与大圆角（小票纸零阴影、大字报刊零圆角）：靠发丝线、字重与深浅阶梯 ⇒ 换皮只换取值。 */',
    root + ' .' + p + 'block-range-bar {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度收栏宽。 */
    '  container-type: inline-size;',
    '  display: grid;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    '/* 头部：标题 ＋ 用途 ＋ 合计（合计顶右缘；容器一窄，三件自己折行，谁也不压谁）。 */',
    s('hd') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 10px;',
    '  min-width: 0;',
    '}',
    s('title') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-display') + ';',
    '  font-size: ' + skinVar('fs-h2') + ';',
    '  font-weight: 700;',
    '  line-height: 1.25;',
    '  overflow-wrap: anywhere;',
    '}',
    s('use') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('sum') + ' {',
    '  display: flex;',
    '  align-items: baseline;',
    '  gap: 6px;',
    '  margin-left: auto;',
    '  min-width: 0;',
    '}',
    s('sum-label') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '}',
    s('sum-value') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* **刻度行与泳道用同一副列模板**（`.ax` 与 `.lanes` 各是一张网格，模板逐字相同）',
    '   ⇒ 轨道宽恒等、刻度两端永远对得上轨道两端。左右两栏是**定宽**（宽档 54／66，窄档 46／54）：',
    '   定宽才谈得上"两张网格列宽恒等"（`auto` 会按各自内容算，两边就错开了）。',
    '   第三轨装合计（时长／日期），**换行不截断**：更长就折行，绝不写 `…`。 */',
    s('ax') + ' {',
    '  display: grid;',
    '  grid-template-columns: ' + String(RANGE_BAR_KEY_COLUMN_PX) + 'px minmax(0, 1fr) ' + String(RANGE_BAR_TOTAL_COLUMN_PX) + 'px;',
    '  gap: 4px ' + String(RANGE_BAR_TICK_GAP_PX) + 'px;',
    '  align-items: center;',
    '  min-width: 0;',
    '}',
    s('lanes') + ' {',
    '  display: grid;',
    '  grid-template-columns: ' + String(RANGE_BAR_KEY_COLUMN_PX) + 'px minmax(0, 1fr) ' + String(RANGE_BAR_TOTAL_COLUMN_PX) + 'px;',
    '  gap: 4px ' + String(RANGE_BAR_TICK_GAP_PX) + 'px;',
    '  align-items: center;',
    '  min-width: 0;',
    '}',
    '/* 一条泳道＝**三个槽直接落进上面那张网格**（`display:contents`）。',
    '   注意：刻度行**不在**这张网格里——它另开一张同样模板的网格。',
    '   刻度要是也挤进来（`grid-column:2` 占掉第一行第二轨），后续自动放置会把每条泳道',
    '   的三个槽推错列（轨道被塞进第一栏 46px）——2026-09 判据量"左侧越界 11px"抓到的就是这个。 */',
    s('lane') + ' {',
    '  display: contents;',
    '}',
    '/* 刻度：一律落在轨道那一栏；`flex-wrap` ＋ 列距 ⇒ 再窄也只是换行，不压字。 */',
    s('ax-ticks') + ' {',
    '  grid-column: 2;',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  gap: 2px ' + String(RANGE_BAR_TICK_GAP_PX) + 'px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: 10px;',
    '  line-height: 1.4;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s('ax-ticks') + ' > i {',
    '  font-style: normal;',
    '  white-space: nowrap;',
    '}',
    '/* 泳道左栏：记号 ＋ 类别名（记号是"不只靠颜色"的第二路，名字长了自己折行）。 */',
    s('key') + ' {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 4px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('mark') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: 9px;',
    '  font-style: normal;',
    '  line-height: 1;',
    '}',
    '/* 泳道右栏：合计（时长／日期）。栏是**定宽**的，所以它 `overflow-wrap` 换行**不截断**',
    '   （6 位时长／7 位金额在 54／66px 里一行放得下；更长的就折行，绝不写 `…`）。 */',
    s('total') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: right;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 轨道：两端各一条发丝线（读得出"轴从哪到哪"）；区间是百分比定位，恒在轴内。 */',
    s('rail') + ' {',
    '  position: relative;',
    '  min-width: 0;',
    '  height: ' + String(RANGE_BAR_RAIL_HEIGHT_PX) + 'px;',
    '  border-left: 1px solid ' + skinVar('line') + ';',
    '  border-right: 1px solid ' + skinVar('line') + ';',
    '}',
    s('iv') + ' {',
    '  position: absolute;',
    '  top: 3px;',
    '  bottom: 3px;',
    '  box-sizing: border-box;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  min-width: 1px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + k[1] + ';',
    '  overflow: hidden;',
    '}',
  ];
  for (const tone of [1, 2, 3, 4]) {
    out.push(s('iv') + '.is-l' + String(tone) + ' { background: ' + k[tone - 1] + '; }');
  }
  out.push(
    '/* 段里的时长字：写在**卡面小牌**上（深浅块上的字不赌色阶亮度，换皮也读得清）。',
    '   段太窄时本字不上屏（归一化期就判掉），时长另有行尾合计兜底。 */',
    s('iv-text') + ' {',
    '  text-decoration: none;',
    '  padding: 2px 4px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: 10px;',
    '  font-weight: 600;',
    '  line-height: 1.2;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('note') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 本件自身不带可点元素（拖动改起止是另一形态的活）。这一条是**地板**：',
    '   调用方若把某段包成链接，焦点必须看得见——不许只写 `outline:none` 而不给替代。 */',
    root + ' .' + p + 'block-range-bar :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄容器（<' + String(RANGE_BAR_NARROW_PX) + 'px）：左右两栏各收一档，宽度让给轨道',
    '   （判的是**本件自己的宽度**：本件会被嵌进侧栏／面板／卡片，视口宽 ≠ 组件宽）。 */',
    '@container (max-width: ' + String(RANGE_BAR_NARROW_PX) + 'px) {',
    '  ' + s('ax') + ',',
    '  ' + s('lanes') + ' {',
    '    grid-template-columns: ' + String(RANGE_BAR_KEY_COLUMN_NARROW_PX) + 'px minmax(0, 1fr) ' + String(RANGE_BAR_TOTAL_COLUMN_NARROW_PX) + 'px;',
    '  }',
    '}',
    '/* 极窄容器（<' + String(RANGE_BAR_TEXT_HIDE_BELOW_PX) + 'px）：轨道短到放不下时长字一牌',
    '   ⇒ 段内时长字一律不上屏（**宁可少写一遍，不许压字**；时长仍在行尾合计里）。 */',
    '@container (max-width: ' + String(RANGE_BAR_TEXT_HIDE_BELOW_PX - 1) + 'px) {',
    '  ' + s('iv-text') + ' {',
    '    display: none;',
    '  }',
    '}',
  );
  return out.join(LF);
}
