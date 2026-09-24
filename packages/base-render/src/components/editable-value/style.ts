/** editableValue · **样式段**（本组件唯一的样式来源）。
 *
 *  两条纪律：
 *   1. 只读**冻结 token**（`CSS_VAR_TOKENS`：`--fg/--fg2/--fg3/--card/--line/--blue/--blue2/--soft/…`），
 *      不新增 token 名、不写 `:root`、不写裸色值（悬停底＝`var(--soft)`，不是 `rgba(0,122,255,.08)`）；
 *      **"值没被接受"也不用裸红**：11 个冻结 token 里没有危险色，本组件又不许造 —— 故内圈走 `var(--fg)`
 *      （实心深圈，与聚焦的 `--blue` 圈一眼可分），语义另由 `aria-invalid="true"` 承担；
 *   2. 本段**不进** 12 区闭集（`BLOCK_STYLE_SECTIONS`）：由页面按需注入
 *      （`renderDocShell({ editableValue: true })` 拼进共享样式槽）⇒ 不用它的页零字节变化。
 *
 *  几何契约（写在这里也钉在测试里）：命中区与编辑器**同盒模型**（同 `min-height`／同内距／同字号），
 *  宿主用定宽列时，进出编辑**不得**改变任何列的 x 与行高——"编辑不变形"是这一件的存在理由之一。
 */
import { EDIT_VALUE_CLASS } from './attrs.js';

/** 命中区与编辑器的共同高度下限（px）。取 `ACTION_BAR_DEFAULTS.minHeightPx` 的同一档 44（用户裁定：
 *  「触摸区 ≥44×44」是全宽口径，不只窄屏）——本组件不提供"密集档"开关：低于 44 的命中区就是不许留的中间档。 */
export const EDIT_VALUE_MIN_HEIGHT_PX = 44;

/** 编辑器宽度上限（px）：编辑态不许把宿主那一列撑开（见表头"编辑不变形"）。 */
export const EDIT_VALUE_EDITOR_MAX_WIDTH_PX = 250;

/** 本组件的样式段（调用方拼进 `<style>`；`editableValueCss()` 是它唯一的对外名）。 */
export function editableValueCss(): string {
  const c = EDIT_VALUE_CLASS;
  const h = EDIT_VALUE_MIN_HEIGHT_PX + 'px';
  const w = EDIT_VALUE_EDITOR_MAX_WIDTH_PX + 'px';
  return [
    '/* editableValue（就地可编辑值）：值即入口。命中区与编辑器同盒模型 ⇒ 进出编辑不变形。 */',
    '.' + c + '{display:inline-flex;align-items:center;min-height:' + h + ';max-width:100%}',
    '.' + c + '-hit{display:inline-flex;align-items:center;gap:7px;box-sizing:border-box;',
    /* 命中区**不写** `max-width:100%`：它与"由内容定宽"形成循环，Chrome 解成 0，
       再被 `min-width:44px` 钉在 44px —— 值就被压成「1..」（2026-09-24 实拍，两版才定位到）。
       宽度上限由根那一层承担。 */
    '  min-height:' + h + ';min-width:' + h + ';',
    '  padding:0 9px;margin-left:-9px;border:0;border-radius:8px;background:transparent;color:inherit;',
    '  font:inherit;text-align:left;cursor:pointer}',
    '.' + c + '-hit:hover{background:var(--soft)}',
    '.' + c + '-hit:focus-visible{outline:2px solid var(--blue);outline-offset:1px}',
    '.' + c + '-hit[disabled]{cursor:not-allowed;color:var(--fg3)}',
    /* 值文本**不设** `min-width:0`：设了它，弹性收缩就把短值压成「1..」（2026-09-24 实拍），
       而"值本身即入口"的要害正是"值读得全"。太长由命中区的 `max-width:100%` ＋ 这行的 ellipsis 收口。 */
    '.' + c + '-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.' + c + '-unit{margin-left:2px;font-size:.85em;color:var(--fg2)}',
    '.' + c + '--right .' + c + '-hit{margin-left:auto;margin-right:-9px;flex-direction:row-reverse}',
    '.' + c + '-pen{flex:0 0 auto;color:var(--fg3);opacity:.75}',
    '.' + c + '-hit:hover .' + c + '-pen{color:var(--blue2);opacity:1}',
    '.' + c + '[data-ilife-edit-affordance="hover"] .' + c + '-pen{opacity:0}',
    '.' + c + '[data-ilife-edit-affordance="hover"] .' + c + '-hit:hover .' + c + '-pen,',
    '.' + c + '[data-ilife-edit-affordance="hover"] .' + c + '-hit:focus-visible .' + c + '-pen{opacity:1}',
    '.' + c + '[data-ilife-edit-affordance="none"] .' + c + '-pen{display:none}',
    '.' + c + '-input,.' + c + '-select{box-sizing:border-box;width:100%;max-width:' + w + ';min-height:' + h + ';',
    '  padding:0 9px;border:1px solid var(--blue);border-radius:8px;background:var(--card);color:var(--fg);font:inherit}',
    '.' + c + '--invalid .' + c + '-input,.' + c + '--invalid .' + c + '-select{border-color:var(--fg);',
    '  box-shadow:0 0 0 1px var(--fg) inset}',
    '@media print{.' + c + '-pen{display:none}}',
  ].join('\n');
}
