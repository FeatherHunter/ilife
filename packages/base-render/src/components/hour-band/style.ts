/** hour-band · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本层其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方的页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸；本件不写任何 `@media`（视口宽 ≠ 组件宽）。
 *
 *  几何契约（判据钉住）：
 *   · 带与刻度尺都是 **24 份**（`repeat(24, minmax(0,1fr))`）⇒ 刻度永远落在整点上，390 档不横滑；
 *   · 窄容器下刻度尺**只留偶数点**（每 2 小时一格）⇒ 数字之间留得下空隙，**不压字**；
 *   · 明细行的起止与时长 `nowrap`（关键读数永不写 `…`），名称换行。
 */
import { skinVar } from '../skin/contract.js';
import {
  HOUR_BAND_HOURS,
  HOUR_BAND_RULER_NARROW_PX,
  hourBandSlot,
  type HourBandSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 带的高度（px）：比按钮矮（它是形状不是控件），但要一眼看得出段的起止。 */
export const HOUR_BAND_HEIGHT_PX = 30;

/** 整点数字的字号（px）：窄档 12 个点之间的空隙 = 两格宽 − 两个字宽，9px 下仍有余量。 */
export const HOUR_BAND_RULER_FONT_PX = 9;

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
export function hourBandCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /* 槽位类的**唯一拼法**：scope（`.ilife-page-ui`）＋ 本件类名 —— 一条独立规则的完整选择器。
     要把两个槽拼成**后代选择器**时，后半截用 `c()`（`c()` 不带 scope）：两个 `s()` 拼一起会写出
     `.ilife-page-ui … .ilife-page-ui …`，那条规则永远命中不到。判据断的是"scope 恰好出现一次"。 */
  const s = (slot: HourBandSlot): string => root + ' .' + hourBandSlot(slot, p);
  const c = (slot: HourBandSlot): string => '.' + hourBandSlot(slot, p);
  const k = ladder();

  const out: string[] = [
    '/* hour-band（时段带 · 形态 A「单带＋整点刻度尺（0–23）＋下方明细行」）：一天摊成一条带，',
    '   每段按"当天第几分钟"定位，**长度就是「多久」**；段宽时再写一遍时长，下面逐段列明细行。',
    '   层次不靠阴影与大圆角（小票纸零阴影、大字报刊零圆角）：靠发丝线、字重与深浅阶梯 ⇒ 换皮只换取值。 */',
    root + ' .' + p + 'block-hour-band {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度决定刻度密度。 */
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
    '/* 那条带：底的软色＝"这一天"，段＝"在做什么"（段是百分比定位，恒在带内）。 */',
    s('band') + ' {',
    '  position: relative;',
    '  min-width: 0;',
    '  height: ' + String(HOUR_BAND_HEIGHT_PX) + 'px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  overflow: hidden;',
    '}',
    s('sg') + ' {',
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
    out.push(s('sg') + '.is-l' + String(tone) + ' { background: ' + k[tone - 1] + '; }');
  }
  out.push(
    '/* 段里的时长字：写在**卡面小牌**上（深浅块上的字不赌色阶亮度，换皮也读得清）。',
    '   段太窄时本字不上屏（归一化期就判掉），时长另有明细行的读数兜底。 */',
    s('sg-text') + ' {',
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
    '/* 整点刻度尺：**和带同一张 24 列模板**（刻度永远落在整点上）。 */',
    s('ruler') + ' {',
    '  display: grid;',
    '  grid-template-columns: repeat(' + String(HOUR_BAND_HOURS) + ', minmax(0, 1fr));',
    '  min-width: 0;',
    '}',
    s('ruler-hour') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + String(HOUR_BAND_RULER_FONT_PX) + 'px;',
    '  font-style: normal;',
    '  line-height: 1.4;',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: center;',
    '  white-space: nowrap;',
    '}',
    '/* 图例：色块 ＋ 类别名（色块 aria-hidden，名字是字）。 */',
    s('lgs') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 4px 12px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '}',
    s('lgs') + ' > span {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 4px;',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    s('sw') + ' {',
    '  flex: none;',
    '  display: block;',
    '  width: 12px;',
    '  height: 12px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '}',
  );
  for (const tone of [1, 2, 3, 4]) {
    out.push(s('sw') + '.is-l' + String(tone) + ' { background: ' + k[tone - 1] + '; }');
  }
  out.push(
    '/* 明细行：起止／名称／时长／补充读数。起止与时长 `nowrap`（**关键读数不截断**），名称换行。 */',
    s('rows') + ' {',
    '  display: grid;',
    '  gap: 0;',
    '  min-width: 0;',
    '}',
    s('r') + ' {',
    '  display: grid;',
    '  grid-template-columns: auto minmax(0, 1fr) auto auto;',
    '  gap: 6px 10px;',
    '  align-items: baseline;',
    '  min-width: 0;',
    '  padding: 7px 0;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '}',
    s('t') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('n') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    s('v') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: right;',
    '  white-space: nowrap;',
    '}',
    s('meta') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    '/* 未记录那一行：名字转弱（**"这一段没有记录"是它的语义**）。 */',
    s('r') + '.is-nil ' + c('n') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '}',
    s('note') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 本件自身不带可点元素。这一条是**地板**：调用方若把某行包成链接，焦点必须看得见——',
    '   不许只写 `outline:none` 而不给替代。 */',
    root + ' .' + p + 'block-hour-band :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄容器（<' + String(HOUR_BAND_RULER_NARROW_PX) + 'px）：刻度尺**只留偶数点**（每 2 小时一格）。',
    '   24 个数字在窄档会挤成一团（那正是"压字"），隔一格读起来反而更清楚；',
    '   **用 `visibility` 而不是 `display:none`**：`display:none` 的格子退出网格布局，',
    '   剩下的 12 枚会**往前挤**（0 号位变成 1 点的位置）——刻度就整体错位了（判据量相邻空隙时抓到的）。',
    '   判的是**本件自己的宽度**：本件会被嵌进侧栏／面板／卡片，视口宽 ≠ 组件宽。 */',
    '@container (max-width: ' + String(HOUR_BAND_RULER_NARROW_PX - 1) + 'px) {',
    '  ' + s('ruler-hour') + '.is-odd {',
    '    visibility: hidden;',
    '  }',
    '}',
  );
  return out.join(LF);
}
