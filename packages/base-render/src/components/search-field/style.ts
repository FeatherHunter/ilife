/** searchField · **样式段**（本件唯一的样式来源）。
 *
 *  三条纪律：
 *   1. 只经 `skinVar()` 读皮肤（**不手写 `var(--ilife-…)`**：兜底链只许住在 `skin/contract.ts`），
 *      零硬编码颜色、零 `:root`、零 `!important`；
 *   2. 全部选择器 scope 在 `.<prefix>page-ui` 之下（`PAGE_UI_CLASS` 从 `page-ui` 取，不另抄一份字面量）
 *      ⇒ 没挂根类的页面一条都命中不到（加法式）；
 *   3. 宽度一律容器驱动：换行靠 `flex-wrap`、收缩靠 `minmax(0,…)`／`min-width:0`，
 *      **零** `@media (max-width: …)`；媒体查询只判设备能力（hover／pointer／reduced-motion）。
 */
import { PAGE_LIMITS, PAGE_UI_CLASS } from '../page-ui/index.js';
import { skinVar } from '../skin/contract.js';
import { SEARCH_CURRENT_ATTR, SEARCH_HIT_ATTR, SEARCH_ITEM_ATTR, SEARCH_LOADING_ATTR, SEARCH_ROOT_CLASS } from './attrs.js';

/** 宽档上限：1280 档下不让输入框拉成一条 1252px 的空带（390 档上限不生效，内容宽本就小于它）。 */
export const SEARCH_MAX_WIDTH_PX = 680;

/** 触控目标下限（≥44×44，**全宽档**口径）：与 `page-ui` 的 `PAGE_LIMITS.touchMinPx` 同一个数、同一件事。 */
export const SEARCH_TOUCH_MIN_PX = PAGE_LIMITS.touchMinPx;

/** 读数行的宽度锁（`ch`）：载入态原地换字时行宽不许跳（工艺书状态矩阵的 loading 条）。 */
export const SEARCH_STATUS_MIN_CH = 14;

/** 本件的样式段（调用方拼进 `<style>`；`searchFieldCss()` 是它唯一的对外名）。 */
export function searchFieldCss(): string {
  const R = '.' + PAGE_UI_CLASS + ' .' + SEARCH_ROOT_CLASS;
  const P = '.' + PAGE_UI_CLASS + ' ';
  const LOADING_ON = '[' + SEARCH_LOADING_ATTR + '="1"]';
  const T = SEARCH_TOUCH_MIN_PX + 'px';
  const ink = skinVar('ink');
  const ink2 = skinVar('ink-2');
  const ink3 = skinVar('ink-3');
  const line = skinVar('line');
  const accent = skinVar('accent');
  const accentText = skinVar('accent-text');
  const accentSoft = skinVar('accent-soft');
  const surface2 = skinVar('surface-2');
  const danger = skinVar('danger');
  const radiusSm = skinVar('radius-sm');
  const font = skinVar('font');
  const fsSm = skinVar('fs-sm');
  const fsXs = skinVar('fs-xs');
  const fsBody = skinVar('fs-body');
  const fsH2 = skinVar('fs-h2');

  return [
    '/* searchField（搜索框 · 形态 B：范围分段 ＋ 下划线输入 ＋ 命中读数）。',
    '   下划线走 `border-bottom`（印刷风）；读数里的数是运行时的真读数，渲染期写「—」。 */',
    R + '{display:grid;gap:8px;min-width:0;' + 'max-width:' + SEARCH_MAX_WIDTH_PX + 'px;',
    '  color:' + ink + ';font-family:' + font + ';font-size:' + fsBody + ';line-height:1.5}',
    /* 范围分段：换行不横滑 */
    R + '-scope{display:flex;flex-wrap:wrap;gap:8px;min-width:0}',
    R + '-scope-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;',
    '  min-height:' + T + ';padding:0 12px;border:0;border-bottom:2px solid ' + line + ';',
    '  background:transparent;color:' + ink2 + ';font:inherit;font-size:' + fsSm + ';cursor:pointer;white-space:nowrap;',
    '  transition:transform 80ms}',
    R + '-scope-btn .' + SEARCH_ROOT_CLASS + '-n{color:' + ink3 + ';font-size:' + fsXs + ';font-variant-numeric:tabular-nums}',
    /* 聚焦范围钮＝**有文字的选中面**（`docs/base/base-render/选中态与皮肤语言.md` 第三节）：
       底 `accent-soft`、字 `accent-text`、描边＝主色下划线 `accent`、✓ 走 `accent`、字重 700。
       本件的形态要害是下划线，故 `border-bottom-color` 直接就是法则表那条「描边 `accent`」。 */
    R + '-scope-btn[aria-pressed="true"]{background:' + accentSoft + ';border-bottom-color:' + accent + ';'
      + 'color:' + accentText + ';font-weight:700}',
    R + '-scope-btn[aria-pressed="true"]::before{content:"✓";color:' + accent + ';font-size:11px}',
    R + '-scope-btn[aria-pressed="true"] .' + SEARCH_ROOT_CLASS + '-n{color:' + accentText + '}',
    /* 输入行：下划线。行内各件间距 ≥8px（工艺书：相邻触控目标间距 ≥8px——输入框与清空键都是命中盒） */
    R + '-box{display:flex;align-items:center;gap:8px;box-sizing:border-box;min-height:' + T + ';min-width:0;',
    '  border-bottom:2px solid ' + line + ';background:transparent}',
    R + '-box:focus-within{border-bottom-color:' + accent + '}',
    R + '-ico{flex:0 0 auto;margin-right:-4px;color:' + ink3 + ';font-size:' + fsBody + ';line-height:1}',
    R + '-input{flex:1 1 auto;min-width:0;box-sizing:border-box;min-height:' + T + ';padding:0;border:0;',
    '  background:transparent;color:' + ink + ';font:inherit;font-size:' + fsBody + '}',
    R + '-input::placeholder{color:' + ink3 + '}',
    R + '-input:focus-visible{outline:2px solid ' + accent + ';outline-offset:1px}',
    R + '-input[disabled]{color:' + ink3 + ';cursor:not-allowed}',
    /* 清空与前后跳：命中盒 ≥44×44（视觉小、命中大） */
    R + '-clear,' + R + '-step{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;',
    '  box-sizing:border-box;min-width:' + T + ';min-height:' + T + ';padding:0;border:0;border-radius:' + radiusSm + ';',
    '  background:transparent;color:' + ink2 + ';font:inherit;font-size:' + fsSm + ';cursor:pointer;transition:transform 80ms}',
    R + '-step{font-size:' + fsH2 + '}',
    R + '-clear:active,' + R + '-step:active,' + R + '-scope-btn:active{transform:scale(.98)}',
    R + '-clear:focus-visible,' + R + '-step:focus-visible,' + R + '-scope-btn:focus-visible{outline:2px solid ' + accent + ';outline-offset:2px}',
    R + '-clear[disabled],' + R + '-step[disabled],' + R + '-scope-btn[disabled]{color:' + ink3 + ';cursor:not-allowed;background:transparent}',
    R + '-clear[disabled]:active,' + R + '-step[disabled]:active,' + R + '-scope-btn[disabled]:active{transform:none}',
    /* 读数行：命中数 ＋ 当前范围 ＋ 第几处（宽度锁住，载入态原地换字不跳版） */
    R + '-readout{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 12px;min-width:0}',
    R + '-status{margin:0;min-width:' + SEARCH_STATUS_MIN_CH + 'ch;min-height:1.6em;color:' + ink2 + ';font-size:' + fsSm + ';line-height:1.6}',
    R + '-status b{color:' + ink + ';font-weight:700;font-variant-numeric:tabular-nums}',
    R + '-dim{color:' + ink3 + '}',
    R + '-status-loading{display:none;color:' + ink3 + '}',
    R + LOADING_ON + ' .' + SEARCH_ROOT_CLASS + '-status-text{display:none}',
    R + LOADING_ON + ' .' + SEARCH_ROOT_CLASS + '-status-loading{display:inline}',
    R + '-nav{display:inline-flex;align-items:center;gap:8px;flex:0 0 auto}',
    R + '-pos{color:' + ink2 + ';font-size:' + fsSm + ';white-space:nowrap;font-variant-numeric:tabular-nums}',
    R + '-pos b{color:' + ink + ';font-weight:700}',
    /* 空态与错态：写在控件旁边，不只染色 */
    R + '-empty{margin:0;padding:8px 0;color:' + ink2 + ';font-size:' + fsSm + ';line-height:1.6;overflow-wrap:anywhere}',
    R + '-err{margin:0;padding:6px 0 6px 10px;border-left:2px solid ' + danger + ';color:' + danger + ';',
    '  font-size:' + fsSm + ';line-height:1.6;overflow-wrap:anywhere}',
    R + '-empty[hidden],' + R + '-err[hidden]{display:none}',
    /* 被搜的条目：不匹配就收起（`hidden` 是运行时的过滤通道） */
    P + '[' + SEARCH_ITEM_ATTR + '][hidden]{display:none}',
    /* 命中词：`<mark>` ＋ 下划线 ＋ 加粗（形／字重两样，不只靠色块） */
    P + '[' + SEARCH_HIT_ATTR + ']{background:transparent;color:' + ink + ';font-weight:700;',
    '  box-shadow:inset 0 -2px 0 0 ' + accent + '}',
    P + '[' + SEARCH_HIT_ATTR + '][' + SEARCH_CURRENT_ATTR + ']{background:' + accentSoft + ';',
    '  box-shadow:inset 0 -3px 0 0 ' + accent + '}',
    /* 载入态：整块降一档存在感，但**不**动版（不新增行、不改宽） */
    R + LOADING_ON + ' .' + SEARCH_ROOT_CLASS + '-box{border-bottom-color:' + line + '}',
    '@media (hover:hover) and (pointer:fine){',
    '  ' + R + '-clear:hover,' + R + '-step:hover{color:' + ink + ';background:' + surface2 + '}',
    '  ' + R + '-scope-btn:hover{border-bottom-color:' + ink2 + ';color:' + ink + '}',
    '  ' + R + '-clear[disabled]:hover,' + R + '-step[disabled]:hover,' + R + '-scope-btn[disabled]:hover{background:transparent;color:' + ink3 + '}',
    '}',
    '@media (prefers-reduced-motion:reduce){',
    '  ' + R + '-clear,' + R + '-step,' + R + '-scope-btn{transition:none}',
    '}',
  ].join('\n');
}
