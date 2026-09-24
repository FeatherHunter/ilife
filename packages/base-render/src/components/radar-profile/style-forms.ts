/** radar-profile · **扇区段与轴表段那两块样式**（同目录第二份样式来源；由 `style.ts` 的 `radarProfileCss()` 汇总）。
 *
 *  为什么有这一件：本件一次落三个形态，样式段挤在一件里会超本包告警线 350
 *  （`packages/base-render/AGENTS.md`，先例 `scatter-fit/style-forms.ts`、`date-view` 的 `style-calendar.ts`）。
 *  「极区扇图的扇区」与「展平轴表的行」各自是一段边界干净的形状（扇区＝一条路径 ＋ 一道外沿弧；
 *  行＝三段网格 ＋ 轨道上的四个绝对定位件），独立成件；**取值一个字节都不许改**——搬的只是「住哪个文件」。
 *
 *  边界与另一半的分工：卡壳（卡头／图例／脚注／刻度条）与坐标框（图／轴名／圆心）仍住 `style.ts`。
 *  纪律同 `style.ts`：只经 `skinVar()` 读皮肤／全部规则 scope 在 `.<prefix>page-ui` 之下／零 `:root`／
 *  零 `!important`／零颜色字面量（淡洗走 `color-mix()`，**不拿 `ink` 系当面**）。
 */
import { skinVar } from '../skin/contract.js';
import { RADAR_PROFILE_AT_VAR, RADAR_PROFILE_B1_VAR, RADAR_PROFILE_B2_VAR, RADAR_PROFILE_NARROW_PX, radarProfileSlot, type RadarProfileSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 一个百分比档：往卡面掺 `weight`% 的语义色（**淡洗是合法的面**，实心墨块才是禁止的那一种）。 */
const wash = (token: 'ok' | 'warn', weight: number): string =>
  'color-mix(in srgb, ' + skinVar(token) + ' ' + String(weight) + '%, ' + skinVar('surface') + ')';

/** 轴表的三列（轴名 ｜ 轨道 ｜ 判定）：读数的宽度由 `auto` 兜住，轨道吃剩下的。 */
const RAIL_COLS = 'minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, auto)';

/** 扇区段与轴表段的样式。恒返回非空 CSS 文本（由 `radarProfileCss()` 插在正确的位置上）。 */
export function radarProfileFormsCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = (slot: RadarProfileSlot): string => root + ' .' + radarProfileSlot(slot, p);
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。 */
  const c = (slot: RadarProfileSlot): string => '.' + radarProfileSlot(slot, p);

  return [
    '/* 极区扇图：一根扇区 ＝ 一条「圆心 → 左端点 → 外沿弧 → 右端点」的路径；',
    '   面的深浅只说"这是哪一档"（达标 ok 淡洗／未达标 warn 淡洗），长短才是读数。 */',
    s('wedge') + ' {',
    '  stroke: none;',
    '}',
    s('wedge') + '.is-ok {',
    '  fill: ' + wash('ok', 26) + ';',
    '}',
    s('wedge') + '.is-warn {',
    '  fill: ' + wash('warn', 22) + ';',
    '}',
    /* 外沿那道弧：无文字的图形 ⇒ 语义色实线 2px（半径的读数由它钉住）。 */
    s('warc') + ' {',
    '  fill: none;',
    '  stroke-width: 2;',
    '  vector-effect: non-scaling-stroke;',
    '}',
    s('warc') + '.is-ok {',
    '  stroke: ' + skinVar('ok') + ';',
    '}',
    s('warc') + '.is-warn {',
    '  stroke: ' + skinVar('warn') + ';',
    '}',
    /* 达标线：虚线圆环（**参照线不是数据**：弱文字一档 ＋ 虚线，不与扇区抢注意力）。 */
    s('goal') + ' {',
    '  fill: none;',
    '  stroke: ' + skinVar('ink-3') + ';',
    '  stroke-width: 1;',
    '  stroke-dasharray: 5 4;',
    '  vector-effect: non-scaling-stroke;',
    '}',
    '/* 展平轴表：一行一根轴（轴名 ｜ 轨道 ｜ 判定）；窄档把轨道整条挪到第二行去，免得挤成一列孤字。 */',
    s('rows') + ' {',
    '  display: grid;',
    '  gap: 0;',
    '  min-width: 0;',
    '}',
    s('row') + ' {',
    '  display: grid;',
    '  grid-template-columns: ' + RAIL_COLS + ';',
    '  gap: 2px 12px;',
    '  align-items: center;',
    '  min-height: 44px;',
    '  padding: 6px 0;',
    '  min-width: 0;',
    '}',
    s('row') + ' + ' + c('row') + ' {',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    s('rname') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('rsub') + ' {',
    '  display: block;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-style: normal;',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 轨道：上一条给了读数（贴着自己的竖线），中间一条是基准带，下面一条是基线。 */
    s('track') + ' {',
    '  position: relative;',
    '  display: block;',
    '  height: 34px;',
    '  min-width: 0;',
    '}',
    s('base') + ' {',
    '  position: absolute;',
    '  left: 0;',
    '  right: 0;',
    '  top: 24px;',
    '  height: 1px;',
    '  background: ' + skinVar('line') + ';',
    '}',
    /* 基准带：**语义是 ok**（这一根的正常区间）⇒ ok 的淡洗 ＋ 两侧各自的端点由变量给。 */
    s('band') + ' {',
    '  position: absolute;',
    '  top: 11px;',
    '  height: 12px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + wash('ok', 24) + ';',
    '  left: var(' + RADAR_PROFILE_B1_VAR + ', 0%);',
    '  right: calc(100% - var(' + RADAR_PROFILE_B2_VAR + ', 100%));',
    '}',
    /* 我的位置：无文字的竖线 ⇒ 强调色实底（图形对比 ≥3:1）。
       `clamp()` 把它压在轨道里：满分那一根落在 100% 上，2px 的线会探出轨道右缘 2px —— 那是横溢。 */
    s('mark') + ' {',
    '  position: absolute;',
    '  top: 6px;',
    '  bottom: 6px;',
    '  left: clamp(0px, var(' + RADAR_PROFILE_AT_VAR + ', 0%), calc(100% - 2px));',
    '  border-left: 2px solid ' + skinVar('accent') + ';',
    '}',
    /* 读数贴在竖线旁边：`clamp()` 把它压在轨道里（**永不截断、永不跑出格子**）。 */
    s('rval') + ' {',
    '  position: absolute;',
    '  top: 0;',
    '  min-width: 0;',
    '  left: clamp(0px, var(' + RADAR_PROFILE_AT_VAR + ', 0%), calc(100% - 3.2em));',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    /* 判定：在带内走灰字（状态做减法），出带才给语义色与软底（那是真要看的那一行）。 */
    s('verdict') + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: flex-end;',
    '  gap: 1px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  text-align: right;',
    '  white-space: nowrap;',
    '}',
    s('verdict') + '.is-low, ' + s('verdict') + '.is-high {',
    '  padding: 2px 7px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + wash('warn', 18) + ';',
    '  color: ' + skinVar('warn') + ';',
    '  font-weight: 700;',
    '}',
    s('rband') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-style: normal;',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s('verdict') + '.is-low ' + c('rband') + ', ' + s('verdict') + '.is-high ' + c('rband') + ' {',
    '  color: ' + skinVar('warn') + ';',
    '}',
    /* 窄容器（<' + String(RADAR_PROFILE_NARROW_PX) + 'px，阈值住 `attrs.ts`，两份样式文件共用同一份）：
       轴表那三列收成两行——轴名与判定一行、轨道整条占满第二行；**一列不减**（减列就是删读数）。 */
    '@container (max-width: ' + String(RADAR_PROFILE_NARROW_PX) + 'px) {',
    '  ' + s('row') + ' {',
    '    grid-template-columns: minmax(0, 1fr) minmax(0, auto);',
    '  }',
    '  ' + s('rname') + ' {',
    '    grid-column: 1;',
    '    grid-row: 1;',
    '  }',
    '  ' + s('verdict') + ' {',
    '    grid-column: 2;',
    '    grid-row: 1;',
    '  }',
    '  ' + s('track') + ' {',
    '    grid-column: 1 / -1;',
    '    grid-row: 2;',
    '  }',
    '}',
  ].join(LF);
}
