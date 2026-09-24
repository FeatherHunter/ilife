/** resultRow · **样式段**（本件唯一的样式来源）。
 *
 *  三条纪律同族：只经 `skinVar()` 读皮肤；选择器全在 `.<prefix>page-ui` 之下；
 *  宽度只许听容器（`minmax(0,1fr)` ＋ `overflow-wrap:anywhere`，零 `@media (max-width: …)`）。
 *
 *  几何要害：390 档「缩略格 ＋ 标题 ＋ 右侧读数」三列同排时，标题列必须先被压（`minmax(0,1fr)`），
 *  **值列不压、不截断**（金额／日期永不截断）；长标题靠 `overflow-wrap:anywhere` 折行，不靠省略号。
 */
import { PAGE_LIMITS, PAGE_UI_CLASS } from '../page-ui/index.js';
import { skinVar } from '../skin/contract.js';
import { RESULT_ROOT_CLASS } from './attrs.js';

/** 宽档上限（1280 档不让一行拉成一条长带）。 */
export const RESULT_MAX_WIDTH_PX = 860;

/** 缩略格边长（px）。 */
export const RESULT_THUMB_PX = 48;

/** 一行的最小高度（px）：整行可点时它就是一个够用的触控行（≥44）。 */
export const RESULT_ROW_MIN_PX = 56;

/** 与 `page-ui` 的 `PAGE_LIMITS.touchMinPx` 同一个数（44）：行高与命中盒的下限。 */
export const RESULT_TOUCH_MIN_PX = PAGE_LIMITS.touchMinPx;

/** 本件的样式段。 */
export function resultRowCss(): string {
  const R = '.' + PAGE_UI_CLASS + ' .' + RESULT_ROOT_CLASS;
  const P = '.' + PAGE_UI_CLASS + ' ';
  const ink = skinVar('ink');
  const ink2 = skinVar('ink-2');
  const ink3 = skinVar('ink-3');
  const line = skinVar('line');
  const accent = skinVar('accent');
  const surface2 = skinVar('surface-2');
  const radiusSm = skinVar('radius-sm');
  const font = skinVar('font');
  const fsSm = skinVar('fs-sm');
  const fsXs = skinVar('fs-xs');
  const fsBody = skinVar('fs-body');

  return [
    '/* resultRow（结果行 · 形态 A：单行，值在右）。命中词用 <mark> 标出来；',
    '   高亮＝下划线 ＋ 加粗（形与字重两样，不靠色块）。 */',
    R + '{display:grid;gap:0;min-width:0;max-width:' + RESULT_MAX_WIDTH_PX + 'px;',
    '  color:' + ink + ';font-family:' + font + ';font-size:' + fsBody + ';line-height:1.5}',
    R + '-item{display:grid;gap:4px 10px;align-items:center;box-sizing:border-box;',
    '  min-height:' + RESULT_ROW_MIN_PX + 'px;padding:11px 0;border-top:1px solid ' + line + ';min-width:0}',
    R + '--thumb .' + RESULT_ROOT_CLASS + '-item{grid-template-columns:' + RESULT_THUMB_PX + 'px minmax(0,1fr) auto}',
    R + '--plain .' + RESULT_ROOT_CLASS + '-item{grid-template-columns:minmax(0,1fr) auto}',
    R + '-item:first-child{border-top:0}',
    R + '-thumb{grid-row:1 / span 2;display:flex;align-items:center;justify-content:center;',
    '  width:' + RESULT_THUMB_PX + 'px;height:' + RESULT_THUMB_PX + 'px;border:1px solid ' + line + ';',
    '  border-radius:' + radiusSm + ';background:' + surface2 + ';color:' + ink3 + ';',
    '  font-size:' + fsSm + ';font-weight:700}',
    R + '-main{display:grid;gap:2px;min-width:0}',
    R + '-title{margin:0;color:' + ink + ';font-size:' + fsSm + ';font-weight:600;line-height:1.5;',
    '  overflow-wrap:anywhere}',
    R + '-sub{margin:0;color:' + ink3 + ';font-size:' + fsXs + ';line-height:1.6;overflow-wrap:anywhere}',
    R + '-tag{display:inline-block;margin-right:6px;padding:1px 8px;border-radius:999px;',
    '  background:' + surface2 + ';color:' + ink2 + ';font-size:' + fsXs + ';font-weight:600;white-space:nowrap}',
    /* 值位：不压、不截断（金额／日期是关键语义） */
    R + '-v{flex:0 0 auto;margin:0;text-align:right;white-space:nowrap}',
    R + '-v-num{display:block;color:' + ink + ';font-size:' + fsSm + ';font-weight:700;',
    '  font-variant-numeric:tabular-nums}',
    R + '-v-lab{font-style:normal;color:' + ink3 + ';font-size:' + fsXs + '}',
    R + '-v-none .' + RESULT_ROOT_CLASS + '-v-num{color:' + ink3 + ';font-weight:600}',
    /* 命中词：语义 <mark> ＋ 下划线 ＋ 加粗（清掉浏览器默认的黄色块） */
    P + '[data-ilife-search-hit]{background:transparent;color:' + ink + ';font-weight:700;',
    '  box-shadow:inset 0 -2px 0 0 ' + accent + '}',
    R + '-empty{margin:0;padding:8px 0;color:' + ink2 + ';font-size:' + fsSm + ';line-height:1.6;',
    '  overflow-wrap:anywhere}',
  ].join('\n');
}
