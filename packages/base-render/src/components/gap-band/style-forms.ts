/** gap-band · **偏差柱段与两档共用段那两块样式**（同目录第二份样式来源；由 `style.ts` 的 `gapBandCss()` 汇总）。
 *
 *  为什么有这一件：本件一次落两档形态，样式段一度到 461 行（本包告警线 350，
 *  `packages/base-render/AGENTS.md`）。「偏差柱区」是一段边界干净的形状（一列一天 ＋
 *  零位线横贯），独立成件；净差行与图例与脚注两档共用，也住这里 ——
 *  **取值一个字节都不许改**——搬的只是「住哪个文件」。
 *
 *  边界与另一半的分工：根与卡头 ＋ `band` 档的坐标（刻度列 ‖ 差值图区 ＋ 横轴日子行）
 *  仍住 `style.ts`。纪律同 `style.ts`：
 *  只经 `skinVar()` 读皮肤／全部规则 scope 在 `.<prefix>page-ui` 之下／零 `:root`／零 `!important`／
 *  零颜色字面量（淡洗走 `color-mix`，**不拿 `ink` 系当面**）。
 */
import { skinVar } from '../skin/contract.js';
import { GAP_BAND_NARROW_PX, gapBandSlot, type GapBandSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 偏差柱区高度（px）：常规一档、窄容器一档、宽容器（≥620px）一档。
 *  `style.ts` 的窄档里覆盖窄容器那一档；取值住这里，判据与调用方经 `style.ts` 读。 */
export const GAP_BAND_COLS_PX = 150;
export const GAP_BAND_NARROW_COLS_PX = 132;
export const GAP_BAND_WIDE_COLS_PX = 180;

/** 一个百分比档：强调色往卡面掺 `weight`%（淡洗＝合法的面；不是"拿墨色当面"）。 */
const wash = (weight: number): string => 'color-mix(in srgb, ' + skinVar('accent') + ' ' + String(weight)
  + '%, ' + skinVar('surface') + ')';

/** 偏差柱段与两档共用段的样式。恒返回非空 CSS 文本（由 `gapBandCss()` 插在正确的位置上）。 */
export function gapBandDeviationCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-gap-band';
  const s = (slot: GapBandSlot): string => root + ' .' + gapBandSlot(slot, p);
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。 */
  const c = (slot: GapBandSlot): string => '.' + gapBandSlot(slot, p);

  return [
    '/* deviation 档：偏差柱区（零位线横贯）＋ 横轴日子行。',
    '   柱朝上＝超了目标，朝下＝还差：方向（形）＋ 柱上数字的符号（字）＋ 图例给字，三样同时在。 */',
    s('cols') + ' {',
    '  position: relative;',
    '  display: flex;',
    /* 列距 **8px**：与横轴行同一份划分 ⇒ 日子永远对着它那一列；
       这个数同时是**触控地板**那一档（调用方把某一天做成入口时，相邻命中盒之间不许小于 8px）。 */
    '  gap: 8px;',
    '  height: ' + String(GAP_BAND_COLS_PX) + 'px;',
    '  min-width: 0;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '}',
    s('col') + ' {',
    '  position: relative;',
    '  flex: 1 1 0;',
    '  min-width: 0;',
    '}',
    /* 零位线就是目标（1px 实线，横贯整块；图例与脚注各说一遍，不靠颜色认线）。 */
    s('zero') + ' {',
    '  position: absolute;',
    '  left: 0;',
    '  right: 0;',
    '  top: 50%;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    /* 偏差柱：朝上从零位往上长，朝下从零位往下长；超了是强调色实底，还差是淡洗面
       （深浅两档形 ＋ 方向 ＋ 柱上数字的符号，三样同时在）。 */
    s('bar') + ' {',
    '  position: absolute;',
    '  left: 22%;',
    '  right: 22%;',
    '  z-index: 1;',
    /* **零高度也有形**的地板（那天正好达目标＝一根读数，画成一条 4px 的短条，不断在零位上）。 */
    '  min-height: 4px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('accent') + ';',
    '}',
    s('bar') + '.is-down {',
    '  background: ' + wash(26) + ';',
    '}',
    /* 柱上那个数：贴着柱顶（底）长，一律带正负号；首末两列的数分别贴边，半个字不出图区。 */
    s('barvalue') + ' {',
    '  position: absolute;',
    '  left: 50%;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  transform: translateX(-50%);',
    '}',
    s('bar') + '.is-up ' + c('barvalue') + ' {',
    '  bottom: 100%;',
    '  margin-bottom: 2px;',
    '}',
    s('bar') + '.is-down ' + c('barvalue') + ' {',
    '  top: 100%;',
    '  margin-top: 2px;',
    '}',
    s('col') + ':first-child ' + c('barvalue') + ' {',
    '  left: 0;',
    '  transform: none;',
    '}',
    s('col') + ':last-child ' + c('barvalue') + ' {',
    '  left: auto;',
    '  right: 0;',
    '  transform: none;',
    '}',
    box + '.is-deviation ' + c('xax') + ' {',
    '  display: flex;',
    /* 与柱区**同一份列划分**（同一个 `gap` ＋ `flex: 1 1 0`）：任何天数下日子都对着它那一列。 */
    '  gap: 8px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  text-align: center;',
    '}',
    box + '.is-deviation ' + c('xlabel') + ' {',
    '  flex: 1 1 0;',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    /* ── 两档共用 ── */
    /* 净差行：主值一档大字、说明一档灰字（原型定稿版底部那一行）。 */
    s('sum') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 10px;',
    '  min-width: 0;',
    '  padding-top: 8px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    s('sumvalue') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('sumdesc') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('legend') + ' {',
    '  list-style: none;',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 5px 14px;',
    '  margin: 0;',
    '  padding: 9px 0 0;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    s('legend-item') + ' {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 5px;',
    '  min-width: 0;',
    '  list-style: none;',
    '  overflow-wrap: anywhere;',
    '}',
    s('legend-mark') + ' {',
    '  display: block;',
    '  flex: 0 0 auto;',
    '  width: 18px;',
    '  height: 0;',
    '  border-top: 2px solid ' + skinVar('accent') + ';',
    '}',
    s('legend-mark') + '.is-plan {',
    '  border-top: 2px dashed ' + skinVar('ink-2') + ';',
    '}',
    s('legend-mark') + '.is-band {',
    '  height: 12px;',
    '  border-top: none;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + wash(30) + ';',
    '}',
    s('legend-mark') + '.is-up {',
    '  height: 12px;',
    '  border-top: none;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('accent') + ';',
    '}',
    s('legend-mark') + '.is-down {',
    '  height: 12px;',
    '  border-top: none;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + wash(26) + ';',
    '}',
    s('legend-mark') + '.is-zero {',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    s('note') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 本件自身不带可点元素。这一条是**地板**：调用方把某一天包成入口时焦点必须看得见。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    /* 窄容器（<阈值，阈值住 `attrs.ts`）：柱区矮一档 —— **一列不减**（图区那一档住 `style.ts`）。 */
    '@container (max-width: ' + String(GAP_BAND_NARROW_PX) + 'px) {',
    '  ' + s('cols') + ' {',
    '    height: ' + String(GAP_BAND_NARROW_COLS_PX) + 'px;',
    '  }',
    '}',
    /* 宽容器（≥620px）：偏差柱区加高一档（原型定稿版那一层），带子图区不动。 */
    '@container (min-width: 620px) {',
    '  ' + s('cols') + ' {',
    '    height: ' + String(GAP_BAND_WIDE_COLS_PX) + 'px;',
    '  }',
    '}',
  ].join(LF);
}
