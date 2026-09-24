/** sortToggle · **样式段**（本件唯一的样式来源）。
 *
 *  三条纪律同族：只经 `skinVar()` 读皮肤；选择器全在 `.<prefix>page-ui` 之下；
 *  宽度只许听容器（`flex-wrap` ＋ `min-width:0`，零 `@media (max-width: …)`）。
 *
 *  几何要害：视图条与脚都是**会折行的行**（390 档「全部 132 / 常做 46 / 高分 12 / 最近 8」
 *  四颗加起来超过一行宽）。所以两行都 `flex-wrap:wrap`，**不**设横向滚动。
 */
import { PAGE_LIMITS, PAGE_UI_CLASS } from '../page-ui/index.js';
import { skinVar } from '../skin/contract.js';
import { SORT_LOADING_ATTR, SORT_ROOT_CLASS } from './attrs.js';

/** 宽档上限（1280 档不让视图条铺满整页）。 */
export const SORT_MAX_WIDTH_PX = 700;

/** 触控目标下限（≥44×44，全宽档口径；与 `page-ui` 的 `PAGE_LIMITS.touchMinPx` 同一个数）。 */
export const SORT_TOUCH_MIN_PX = PAGE_LIMITS.touchMinPx;

/** 状态行的宽度锁（`ch`）：载入态原地换字不跳版。 */
export const SORT_STATUS_MIN_CH = 8;

/** 本件的样式段。 */
export function sortToggleCss(): string {
  const R = '.' + PAGE_UI_CLASS + ' .' + SORT_ROOT_CLASS;
  const T = SORT_TOUCH_MIN_PX + 'px';
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
  const font = skinVar('font');
  const fsSm = skinVar('fs-sm');
  const fsXs = skinVar('fs-xs');
  const fsBody = skinVar('fs-body');
  const LOADING_ON = '[' + SORT_LOADING_ATTR + '="1"]';

  return [
    '/* sortToggle（排序切换 · 形态 C：并进「视图」条——筛选＋排序一套 ＋ 口径句）。',
    '   视图键是原生 <button> ＋ aria-pressed；口径句写在页上，不让用户自己拼「字段＋方向」。 */',
    R + '{display:grid;gap:8px;min-width:0;max-width:' + SORT_MAX_WIDTH_PX + 'px;',
    '  color:' + ink + ';font-family:' + font + ';font-size:' + fsBody + ';line-height:1.5}',
    /* 视图条：折行排 */
    R + '-viewbar{display:flex;flex-wrap:wrap;gap:8px;min-width:0}',
    R + '-view{display:inline-flex;align-items:center;gap:8px;box-sizing:border-box;min-height:' + T + ';',
    '  padding:0 14px;border:1px solid ' + line + ';border-radius:' + radiusPill + ';background:' + surface + ';',
    '  color:' + ink2 + ';font:inherit;font-size:' + fsSm + ';cursor:pointer;white-space:nowrap;',
    '  transition:transform 80ms}',
    R + '-view .' + SORT_ROOT_CLASS + '-n{color:' + ink3 + ';font-size:' + fsXs + ';font-variant-numeric:tabular-nums}',
    /* 选中项＝**有文字的选中面**（`docs/base/base-render/选中态与皮肤语言.md` 第三节）：
       底 `accent-soft`、字 `accent-text`、描边 `accent`、✓ 走 `accent`、字重 700。
       旧写法 `background:ink;color:surface` 是"反白"，已按法则表清掉。 */
    R + '-view[aria-pressed="true"]{background:' + accentSoft + ';border-color:' + accent + ';color:' + accentText + ';font-weight:700}',
    R + '-view[aria-pressed="true"]::before{content:"✓";font-size:11px;color:' + accent + '}',
    R + '-view[aria-pressed="true"] .' + SORT_ROOT_CLASS + '-n{color:' + accentText + ';opacity:.8}',
    R + '-view:active{transform:scale(.98)}',
    R + '-view:focus-visible{outline:2px solid ' + accent + ';outline-offset:2px}',
    R + '-view[disabled]{cursor:not-allowed;color:' + ink3 + ';background:' + surface2 + '}',
    R + '-view[disabled]::before{content:none}',
    R + '-view[disabled]:active{transform:none}',
    /* 口径句：左侧一道竖线（口径＝另一类信息，不是正文） */
    R + '-caliber{margin:0;padding-left:10px;border-left:2px solid ' + accent + ';',
    '  color:' + ink2 + ';font-size:' + fsXs + ';line-height:1.7;overflow-wrap:anywhere}',
    R + '-ink{color:' + ink + ';font-weight:700}',
    R + '-dim{color:' + ink3 + '}',
    /* 脚：反向键 ＋ 几条 */
    R + '-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;min-width:0}',
    R + '-flip{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;',
    '  min-height:' + T + ';padding:0 14px;border:1px dashed ' + line + ';border-radius:' + radiusPill + ';',
    '  background:' + surface2 + ';color:' + ink2 + ';font:inherit;font-size:' + fsSm + ';cursor:pointer;',
    '  transition:transform 80ms}',
    /* `-flip` 是**文字＋描边**型的选择开关（本来就没有面）：按法则表只改描边与字色为 `accent`／`accent-text`，
       既不给它软底、也不把底写成墨色。虚线→实线是它自己的第二手段，保留。 */
    R + '-flip[aria-pressed="true"]{border-style:solid;border-color:' + accent + ';color:' + accentText + ';font-weight:700}',
    R + '-flip:active{transform:scale(.98)}',
    R + '-flip:focus-visible{outline:2px solid ' + accent + ';outline-offset:2px}',
    R + '-flip[disabled]{cursor:not-allowed;color:' + ink3 + '}',
    R + '-flip[disabled]:active{transform:none}',
    R + '-status{margin:0;min-width:' + SORT_STATUS_MIN_CH + 'ch;min-height:1.6em;color:' + ink2 + ';',
    '  font-size:' + fsSm + ';line-height:1.6;white-space:nowrap}',
    R + '-status b{color:' + ink + ';font-weight:700;font-variant-numeric:tabular-nums}',
    R + '-loading{display:none;color:' + ink3 + '}',
    R + LOADING_ON + ' .' + SORT_ROOT_CLASS + '-status-text{display:none}',
    R + LOADING_ON + ' .' + SORT_ROOT_CLASS + '-loading{display:inline}',
    /* 空态与错态 */
    R + '-empty{margin:0;padding:8px 0;color:' + ink2 + ';font-size:' + fsSm + ';line-height:1.6;overflow-wrap:anywhere}',
    R + '-err{margin:0;padding:6px 0 6px 10px;border-left:2px solid ' + danger + ';color:' + danger + ';',
    '  font-size:' + fsSm + ';line-height:1.6;overflow-wrap:anywhere}',
    R + '-empty[hidden],' + R + '-err[hidden]{display:none}',
    '@media (hover:hover) and (pointer:fine){',
    '  ' + R + '-view:hover{border-color:' + ink2 + ';color:' + ink + '}',
    '  ' + R + '-view[aria-pressed="true"]:hover{border-color:' + accent + ';color:' + accentText + '}',
    '  ' + R + '-view[disabled]:hover{border-color:' + line + ';color:' + ink3 + '}',
    '  ' + R + '-flip:hover{border-color:' + ink3 + ';color:' + ink + '}',
    '}',
    '@media (prefers-reduced-motion:reduce){',
    '  ' + R + '-view,' + R + '-flip{transition:none}',
    '}',
  ].join('\n');
}
