/** filterChips · **样式段**（本件唯一的样式来源）。
 *
 *  三条纪律与 `search-field` 同：只经 `skinVar()` 读皮肤；全部选择器 scope 在 `.<prefix>page-ui` 之下；
 *  宽度只许听容器（`flex-wrap` ＋ `min-width:0`，零 `@media (max-width: …)`）。
 *
 *  这一件的几何要害：**chip 行必须换行**——一排 chip 是 390 档最容易溢出的地方。
 *  故行用 `flex-wrap:wrap`，**不设** `overflow-x`（藏横滑等于把档位藏起来），也不设 `text-overflow`。
 */
import { PAGE_LIMITS, PAGE_UI_CLASS } from '../page-ui/index.js';
import { skinVar } from '../skin/contract.js';
import {
  CHIPS_LOADING_ATTR, CHIPS_ROOT_CLASS, CHIPS_ROW_ATTR, CHIPS_EMPTY_ATTR, CHIPS_ERROR_ATTR, CHIP_N_ATTR,
} from './attrs.js';

/** 宽档上限：1280 档下 chip 行不铺满整页（390 档下这条上限不生效）。 */
export const CHIPS_MAX_WIDTH_PX = 760;

/** 触控目标下限（≥44×44，全宽档口径；与 `page-ui` 的 `PAGE_LIMITS.touchMinPx` 同一个数）。 */
export const CHIPS_TOUCH_MIN_PX = PAGE_LIMITS.touchMinPx;

/** 状态行的宽度锁（`ch`）：载入态原地换字时行宽不许跳。 */
export const CHIPS_STATUS_MIN_CH = 18;

/** 本件的样式段。 */
export function filterChipsCss(): string {
  const R = '.' + PAGE_UI_CLASS + ' .' + CHIPS_ROOT_CLASS;
  const P = '.' + PAGE_UI_CLASS + ' ';
  const T = CHIPS_TOUCH_MIN_PX + 'px';
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
  const fsSm = skinVar('fs-sm');
  const fsXs = skinVar('fs-xs');
  const fsBody = skinVar('fs-body');
  const LOADING_ON = '[' + CHIPS_LOADING_ATTR + '="1"]';

  return [
    '/* filterChips（筛选条 · 形态 A：常用一行 ＋「更多」可展开）。chip 全是原生 <button>，',
    '   选中态住 aria-pressed（底色 ＋ 字重 ＋ ✓ 三样一起给）；行只换行，不横滑、不截断。 */',
    R + '{display:grid;gap:10px;min-width:0;max-width:' + CHIPS_MAX_WIDTH_PX + 'px;',
    '  color:' + ink + ';font-family:' + font + ';font-size:' + fsBody + ';line-height:1.5}',
    R + '-sec{display:grid;gap:8px;min-width:0}',
    R + '-lab{color:' + ink3 + ';font-size:' + fsXs + ';font-weight:700;letter-spacing:.04em}',
    /* chip 行：换行排（390 档折行，不藏横滑） */
    R + '-row{display:flex;flex-wrap:wrap;gap:8px;min-width:0}',
    R + '-chip{display:inline-flex;align-items:center;gap:8px;box-sizing:border-box;min-height:' + T + ';',
    '  padding:0 14px;border:1px solid ' + line + ';border-radius:' + radiusPill + ';background:' + surface + ';',
    '  color:' + ink2 + ';font:inherit;font-size:' + fsSm + ';cursor:pointer;white-space:nowrap;',
    '  transition:transform 80ms}',
    R + '-chip .' + CHIPS_ROOT_CLASS + '-n{color:' + ink3 + ';font-size:' + fsXs + ';font-variant-numeric:tabular-nums}',
    R + '-chip[aria-pressed="true"]{background:' + ink + ';border-color:' + ink + ';color:' + surface + ';font-weight:700}',
    R + '-chip[aria-pressed="true"]::before{content:"✓";font-size:11px;color:' + accentText + '}',
    R + '-chip[aria-pressed="true"] .' + CHIPS_ROOT_CLASS + '-n{color:' + surface + ';opacity:.8}',
    R + '-chip:active{transform:scale(.98)}',
    R + '-chip:focus-visible{outline:2px solid ' + accent + ';outline-offset:2px}',
    R + '-chip[disabled]{cursor:not-allowed;color:' + ink3 + ';border-color:' + line + ';background:' + surface2 + '}',
    R + '-chip[disabled]::before{content:none}',
    R + '-chip[disabled]:active{transform:none}',
    /* 「更多」：原生 details（零脚本可展开），默认全在页上 */
    R + '-more{border:0;margin:0;min-width:0}',
    R + '-more-sum{display:inline-flex;align-items:center;gap:8px;box-sizing:border-box;min-height:' + T + ';',
    '  padding:0 14px;border:1px dashed ' + line + ';border-radius:' + radiusPill + ';background:' + surface2 + ';',
    '  color:' + ink2 + ';font-size:' + fsSm + ';font-weight:600;cursor:pointer;list-style:none}',
    R + '-more-sum::-webkit-details-marker{display:none}',
    R + '-more-sum:focus-visible{outline:2px solid ' + accent + ';outline-offset:2px}',
    R + '-caret{color:' + ink3 + ';transition:transform 150ms}',
    R + '-more[open] .' + CHIPS_ROOT_CLASS + '-caret{transform:rotate(180deg)}',
    R + '-more-body{display:grid;gap:8px;margin-top:8px;padding-left:12px;border-left:2px solid ' + line + ';min-width:0}',
    /* 脚：状态 ＋ 清除 */
    R + '-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;',
    '  padding-top:8px;border-top:1px solid ' + line + ';min-width:0}',
    R + '-sum{margin:0;min-width:' + CHIPS_STATUS_MIN_CH + 'ch;min-height:1.6em;color:' + ink2 + ';font-size:' + fsSm + ';line-height:1.6}',
    R + '-sum b{color:' + ink + ';font-weight:700;font-variant-numeric:tabular-nums}',
    R + '-dim{color:' + ink3 + '}',
    R + '-loading{display:none;color:' + ink3 + '}',
    R + LOADING_ON + ' .' + CHIPS_ROOT_CLASS + '-sum-text{display:none}',
    R + LOADING_ON + ' .' + CHIPS_ROOT_CLASS + '-loading{display:inline}',
    R + '-clear{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;',
    '  min-height:' + T + ';padding:0 14px;border:0;border-radius:' + radiusSm + ';background:transparent;',
    '  color:' + accentText + ';font:inherit;font-size:' + fsSm + ';text-decoration:underline;cursor:pointer;',
    '  transition:transform 80ms}',
    R + '-clear:active{transform:scale(.98)}',
    R + '-clear:focus-visible{outline:2px solid ' + accent + ';outline-offset:2px}',
    R + '-clear[disabled]{color:' + ink3 + ';text-decoration:none;cursor:not-allowed}',
    R + '-clear[disabled]:active{transform:none}',
    /* 空态与错态 */
    R + '-empty,' + R + '-empty-row{margin:0;padding:8px 0;color:' + ink2 + ';font-size:' + fsSm + ';',
    '  line-height:1.6;overflow-wrap:anywhere}',
    R + '-err{margin:0;padding:6px 0 6px 10px;border-left:2px solid ' + danger + ';color:' + danger + ';',
    '  font-size:' + fsSm + ';line-height:1.6;overflow-wrap:anywhere}',
    R + '-empty-row[hidden],' + R + '-err[hidden]{display:none}',
    '@media (hover:hover) and (pointer:fine){',
    '  ' + R + '-chip:hover{border-color:' + ink2 + ';color:' + ink + '}',
    '  ' + R + '-chip[aria-pressed="true"]:hover{border-color:' + ink + ';color:' + surface + '}',
    '  ' + R + '-chip[disabled]:hover{border-color:' + line + ';color:' + ink3 + '}',
    '  ' + R + '-clear:hover{color:' + accent + '}',
    '  ' + R + '-more-sum:hover{border-color:' + ink3 + ';color:' + ink + '}',
    '}',
    '@media (prefers-reduced-motion:reduce){',
    '  ' + R + '-chip,' + R + '-clear,' + R + '-caret{transition:none}',
    '}',
    /* 触控目标与行标记的机器可读面（判据按属性名找，不按类名） */
    P + '[' + CHIPS_ROW_ATTR + ']{align-content:flex-start}',
    P + '[' + CHIPS_EMPTY_ATTR + '],' + P + '[' + CHIPS_ERROR_ATTR + ']{text-align:left}',
    P + '[' + CHIP_N_ATTR + ']{white-space:nowrap}',
    P + '[data-ilife-chip-item][hidden]{display:none}',
    /* 选中态的软底（悬停时用）：只在 hover 通路里出现，作辅助不替语义 */
    R + '-chip[aria-pressed="true"]:focus-visible{background:' + accentSoft + ';color:' + ink + '}',
  ].join('\n');
}
