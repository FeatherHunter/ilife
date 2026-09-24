/** scatter-fit · **分箱段与滞后段那两块样式**（同目录第二份样式来源；由 `style.ts` 的 `scatterFitCss()` 汇总）。
 *
 *  为什么有这一件：本件一次落三个形态，样式段一度到 393 行（本包告警线 350，`packages/base-render/AGENTS.md`）。
 *  「分箱区」与「滞后表」各自是一段边界干净的形状（分箱＝等分列 ＋ 两根竖条；滞后＝三列表 ＋ 一根从中线出发的条），
 *  独立成件；**取值一个字节都不许改**——搬的只是「住哪个文件」。
 *
 *  边界与另一半的分工：卡壳（卡头／标题／口径／脚注）与坐标框（纵轴刻度列 ‖ 图区）与散点（点／线／带）
 *  仍住 `style.ts`（三个形态共用同一套刻度与图例规则）。纪律同 `style.ts`：
 *  只经 `skinVar()` 读皮肤／全部规则 scope 在 `.<prefix>page-ui` 之下／零 `:root`／零 `!important`／
 *  零颜色字面量（淡洗走 `color-mix`，**不拿 `ink` 系当面**）。
 */
import { skinVar } from '../skin/contract.js';
import { SCATTER_FIT_NARROW_PX, scatterFitSlot, type ScatterFitSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 分箱区高度（px）：宽容器一档、窄容器一档（`style.ts` 的窄档里覆盖）。 */
export const SCATTER_FIT_BIN_PX = 180;
const NARROW_BIN_PX = 150;

/** 滞后表的三列（错开 ｜ 轨道 ｜ 系数）：表头与逐档行**共用这一份**，列不许各写一套。 */
const LAG_COLS = '58px minmax(0, 1fr) 64px';
const NARROW_LAG_COLS = '52px minmax(0, 1fr) 64px';

/** 一个百分比档：强调色往卡面掺 `weight`%（淡洗＝合法的面；不是"拿墨色当面"）。 */
const wash = (weight: number): string => 'color-mix(in srgb, ' + skinVar('accent') + ' ' + String(weight)
  + '%, ' + skinVar('surface') + ')';

/** 分箱段与滞后段的样式。恒返回非空 CSS 文本（由 `scatterFitCss()` 插在正确的位置上）。 */
export function scatterFitFormsCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = (slot: ScatterFitSlot): string => root + ' .' + scatterFitSlot(slot, p);
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。 */
  const c = (slot: ScatterFitSlot): string => '.' + scatterFitSlot(slot, p);

  return [
    '/* 分箱区：每箱 `flex: 1 1 0`（纯 CSS 等分，箱数由标记给）⇒ 箱标签行同一份口径，永远对着它那一箱。 */',
    s('bins') + ' {',
    '  grid-column: 2;',
    '  grid-row: 1;',
    '  display: flex;',
    '  gap: 6px;',
    '  align-items: stretch;',
    '  height: ' + String(SCATTER_FIT_BIN_PX) + 'px;',
    '  min-width: 0;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '}',
    s('bincol') + ' {',
    '  position: relative;',
    '  flex: 1 1 0;',
    '  min-width: 0;',
    '}',
    /* 区间条：强调色 24% 的淡洗（"多半落在这一段"）；中位线是 `accent` 实底粗线——两者一深一浅，不靠色相区分。 */
    s('bin-range') + ' {',
    '  position: absolute;',
    '  left: 26%;',
    '  right: 26%;',
    '  min-height: 4px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + wash(24) + ';',
    '}',
    s('bin-median') + ' {',
    '  position: absolute;',
    '  left: 14%;',
    '  right: 14%;',
    '  height: 3px;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('accent') + ';',
    '}',
    s('bintick') + ' {',
    '  flex: 1 1 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: center;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 滞后表：三列（错开 ｜ 轨道 ｜ 系数）——列宽写在一处，表头与逐档行共用同一份。 */',
    s('laghead') + ' {',
    '  display: grid;',
    '  grid-template-columns: ' + LAG_COLS + ';',
    '  gap: 8px;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('lag') + ' {',
    '  display: grid;',
    '  min-width: 0;',
    '}',
    s('lagrow') + ' {',
    '  display: grid;',
    '  grid-template-columns: ' + LAG_COLS + ';',
    '  gap: 8px;',
    '  align-items: center;',
    '  min-height: 44px;',
    '  min-width: 0;',
    '  padding: 0 4px;',
    '}',
    s('lagrow') + ' + ' + c('lagrow') + ' {',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    s('lag-label') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 600;',
    '  white-space: nowrap;',
    '}',
    /* 轨道：中线往左右各半 ＝ ±1；条是**无文字的图形 ⇒ `accent` 实底**，
       方向（往左／往右）由 `is-negative` 给 —— 那是形，不是颜色。 */
    s('lag-track') + ' {',
    '  position: relative;',
    '  height: 12px;',
    '  min-width: 0;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '}',
    s('lag-bar') + ' {',
    '  position: absolute;',
    '  top: 0;',
    '  bottom: 0;',
    '  left: 50%;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('accent') + ';',
    '}',
    s('lagrow') + '.is-negative ' + c('lag-bar') + ' {',
    '  left: auto;',
    '  right: 50%;',
    '}',
    s('lag-value') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: right;',
    '  white-space: nowrap;',
    '}',
    /* 最强那一档：**有文字的面** ⇒ 软底 ＋ 强调色的文本档字 ＋ 强调色侧标（三样同时在：
       条最长＝形、写着"最强"＝字、软底＝色）。 */
    s('lagrow') + '.is-strong {',
    '  background: ' + skinVar('accent-soft') + ';',
    '  border-left: 2px solid ' + skinVar('accent') + ';',
    '}',
    s('lagrow') + '.is-strong ' + c('lag-value') + ' {',
    '  color: ' + skinVar('accent-text') + ';',
    '}',
    s('lag-strong') + ' {',
    '  font-weight: 700;',
    '}',
    /* 窄容器：分箱矮一档、滞后表的标签列窄一档 —— **一列不减**（减列就是把箱删掉），
       宽度靠 `minmax(0,1fr)`／`flex: 1 1 0` 自己变窄，不横滑、不藏横滑。
       阈值与 `style.ts` 那一处读**同一个常量**（`attrs.ts`），不写字面量。 */
    '@container (max-width: ' + String(SCATTER_FIT_NARROW_PX) + 'px) {',
    '  ' + s('bins') + ' {',
    '    height: ' + String(NARROW_BIN_PX) + 'px;',
    '    gap: 4px;',
    '  }',
    '  ' + s('lagrow') + ' {',
    '    grid-template-columns: ' + NARROW_LAG_COLS + ';',
    '  }',
    '  ' + s('laghead') + ' {',
    '    grid-template-columns: ' + NARROW_LAG_COLS + ';',
    '  }',
    '}',
  ].join(LF);
}
