/** windowPicker · **样式段**（本件唯一的样式来源）。
 *
 *  三条纪律同族：只经 `skinVar()` 读皮肤；选择器全在 `.<prefix>page-ui` 之下；
 *  宽度只许听容器（`flex-wrap` ＋ `flex:1 1 …`，零 `@media (max-width: …)`）。
 *
 *  几何要害：一行工具条在 390 档最容易溢出（档位 ＋ 两个日期 ＋ 天数）。
 *  所以：档位那一段会折行、日期各带一个基准宽但**可收缩**、天数那一格 `nowrap` **不缩**
 *  （关键语义：天数不许被压掉）。
 */
import { PAGE_LIMITS, PAGE_UI_CLASS } from '../page-ui/index.js';
import { skinVar } from '../skin/contract.js';
import { WINDOW_LOADING_ATTR, WINDOW_ROOT_CLASS } from './attrs.js';

/** 宽档上限。 */
export const WINDOW_MAX_WIDTH_PX = 900;

/** 日期输入的基准宽（px；`flex-basis`，会被容器压）。 */
export const WINDOW_DATE_BASIS_PX = 118;

/** 日期输入的宽上限（px；1280 档不让它拉长）。 */
export const WINDOW_DATE_MAX_PX = 180;

/** 触控目标下限（≥44×44，全宽档口径；与 `page-ui` 的 `PAGE_LIMITS.touchMinPx` 同一个数）。 */
export const WINDOW_TOUCH_MIN_PX = PAGE_LIMITS.touchMinPx;

/** 本件的样式段。 */
export function windowPickerCss(): string {
  const R = '.' + PAGE_UI_CLASS + ' .' + WINDOW_ROOT_CLASS;
  const T = WINDOW_TOUCH_MIN_PX + 'px';
  const ink = skinVar('ink');
  const ink2 = skinVar('ink-2');
  const ink3 = skinVar('ink-3');
  const line = skinVar('line');
  const accent = skinVar('accent');
  const accentText = skinVar('accent-text');
  const accentSoft = skinVar('accent-soft');
  const surface = skinVar('surface');
  const surface2 = skinVar('surface-2');
  const danger = skinVar('danger');
  const radiusPill = skinVar('radius-pill');
  const radiusSm = skinVar('radius-sm');
  const font = skinVar('font');
  const fontNum = skinVar('font-num');
  const fsSm = skinVar('fs-sm');
  const fsXs = skinVar('fs-xs');
  const fsBody = skinVar('fs-body');
  const LOADING_ON = '[' + WINDOW_LOADING_ATTR + '="1"]';

  return [
    '/* windowPicker（窗口选择器 · 形态 A：一行工具条——档 ＋ 起止 ＋ 天数）。',
    '   窗口是整页读数的口径 ⇒ 起止与天数永远写在页上；天数不许被压掉（nowrap 且不缩）。 */',
    R + '{display:grid;gap:8px;min-width:0;max-width:' + WINDOW_MAX_WIDTH_PX + 'px;',
    '  color:' + ink + ';font-family:' + font + ';font-size:' + fsBody + ';line-height:1.5}',
    R + '-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0}',
    /* 档位：换行排，不横滑（档与档之间 ≥8px：相邻触控目标的间距下限） */
    R + '-seg{display:flex;flex-wrap:wrap;gap:8px;flex:1 1 auto;min-width:0;padding:4px;',
    '  border:1px solid ' + line + ';border-radius:' + radiusPill + ';background:' + surface2 + '}',
    R + '-preset{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;',
    '  flex:0 1 auto;min-width:0;min-height:' + T + ';padding:0 12px;border:0;border-radius:' + radiusPill + ';',
    '  background:transparent;color:' + ink2 + ';font:inherit;font-size:' + fsSm + ';cursor:pointer;',
    '  white-space:nowrap;transition:transform 80ms}',
    /* 选中档＝**有文字的选中面**（`docs/base/base-render/选中态与皮肤语言.md` 第三节）：
       底 `accent-soft`、字 `accent-text`、描边 `accent`、✓ 走 `accent`、字重 700。
       档位原本无描边，这里把 `accent` 落在**内描边**上（`box-shadow: inset`）：加真 `border` 会改盒模型／
       折行点，而档位段是 44px 触控盒；`outline` 会与 `:focus-visible` 的焦点圈抢同一个属性（同元件两条通路）。 */
    R + '-preset[aria-pressed="true"]{background:' + accentSoft + ';color:' + accentText + ';font-weight:700;',
    '  box-shadow:inset 0 0 0 2px ' + accent + '}',
    R + '-preset[aria-pressed="true"]::before{content:"✓";font-size:11px;color:' + accent + '}',
    R + '-preset:active{transform:scale(.98)}',
    R + '-preset:focus-visible{outline:2px solid ' + accent + ';outline-offset:2px}',
    R + '-preset[disabled]{cursor:not-allowed;color:' + ink3 + '}',
    R + '-preset[disabled]::before{content:none}',
    R + '-preset[disabled]:active{transform:none}',
    /* 起止：会折行；日期各带基准宽但可收缩 */
    R + '-range{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0}',
    R + '-field{display:inline-flex;align-items:center;gap:6px;flex:1 1 ' + WINDOW_DATE_BASIS_PX + 'px;min-width:0}',
    R + '-lab{flex:0 0 auto;color:' + ink3 + ';font-size:' + fsXs + '}',
    R + '-date{flex:1 1 auto;min-width:0;max-width:' + WINDOW_DATE_MAX_PX + 'px;box-sizing:border-box;',
    '  min-height:' + T + ';padding:0 10px;border:1px solid ' + line + ';border-radius:' + radiusSm + ';',
    '  background:' + surface + ';color:' + ink + ';font-family:' + fontNum + ';font-size:' + fsSm + ';',
    '  font-variant-numeric:tabular-nums}',
    R + '-date:focus-visible{outline:2px solid ' + accent + ';outline-offset:1px}',
    R + '-date[disabled]{color:' + ink3 + ';cursor:not-allowed}',
    R + '-till{flex:0 0 auto;color:' + ink3 + ';font-size:' + fsXs + '}',
    /* 天数：关键语义（不缩、不截断） */
    R + '-days{flex:0 0 auto;color:' + ink2 + ';font-size:' + fsSm + ';white-space:nowrap;min-height:' + T + ';',
    '  display:inline-flex;align-items:center;min-width:8ch}',
    R + '-days b{color:' + ink + ';font-weight:700;font-variant-numeric:tabular-nums}',
    R + '-loading{display:none;color:' + ink3 + '}',
    R + LOADING_ON + ' .' + WINDOW_ROOT_CLASS + '-days-text{display:none}',
    R + LOADING_ON + ' .' + WINDOW_ROOT_CLASS + '-loading{display:inline}',
    /* 空态与错态 */
    R + '-empty{margin:0;padding:6px 0;color:' + ink2 + ';font-size:' + fsSm + ';line-height:1.6;overflow-wrap:anywhere}',
    R + '-err{margin:0;padding:6px 0 6px 10px;border-left:2px solid ' + danger + ';color:' + danger + ';',
    '  font-size:' + fsSm + ';line-height:1.6;overflow-wrap:anywhere}',
    R + '-empty[hidden],' + R + '-err[hidden]{display:none}',
    '@media (hover:hover) and (pointer:fine){',
    '  ' + R + '-preset:hover{color:' + ink + ';background:' + surface + '}',
    '  ' + R + '-preset[aria-pressed="true"]:hover{background:' + accentSoft + ';color:' + accentText + '}',
    '  ' + R + '-preset[disabled]:hover{color:' + ink3 + ';background:transparent}',
    '}',
    '@media (prefers-reduced-motion:reduce){',
    '  ' + R + '-preset{transition:none}',
    '}',
  ].join('\n');
}
