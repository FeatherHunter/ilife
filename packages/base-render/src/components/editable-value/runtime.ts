/** editableValue · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `controls.buildSharedHelpersJs()`／`charts.buildChartsHelpersJs()` 同一处分工：
 *  模块代码零 DOM；DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应测试）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click`／`keydown`／`change`／`focusout` 委派；重复注入只绑定一次。
 *   · **进出编辑收在一处**（`setEditing`）：命中区与编辑器互斥显示，**任何**退出路径都恢复命中区
 *     （取消、提交、被拒提交后再退出、外部点击…）——"编辑态卡住／命中区消失"是不许出现的状态。
 *   · **拆除不重入**：移除编辑器会同步触发 `focusout`，拆除前先打 `data-ilife-closing` 标记，
 *     `focusout` 见标记即退——否则会把"取消"重入成"提交"（审查席 P1-1）。
 *   · **打开**：点命中区 → 同一格里换上 `input`／`select`（同盒模型），聚焦并全选；
 *     机器值编辑器承载不了（如 `number` 收到 `1,800`）时**拒绝打开**并把显示留在命中区（不静默清空）。
 *   · **提交**：`Enter`／失焦（`input` 与 `select` 一视同仁）／`select` 的 `change`（选定即确认）。
 *     校验不过 → **留在编辑态** ＋ `--invalid`，不派发。
 *   · **无改动**：一个字节都不动（显示字与机器值都保留），也不派发事件——"点开又关闭"不该改任何东西。
 *   · **取消**：`Esc` → 还原原值 ＋ 焦点回命中区 ＋ 派发 `EDIT_EVENT_CANCEL`。
 *   · **提交成功**：就地改写显示（显示字走 `display`；改为原值以外才重算显示字）＋ 焦点回命中区
 *     ＋ 派发 `EDIT_EVENT_COMMIT`（冒泡，`detail = { name, label, value, prev, unit }`）。
 *   · **IME**：组字中的回车不提交（`isComposing`／`keyCode 229`）。
 *   · **无脚本降级**：这段不跑时值照常可读（就是文本），只是不可改。
 */
import {
  EDIT_AFFORDANCE_ATTR, EDIT_BOUND_ATTR, EDIT_DISABLED_ATTR, EDIT_DISPLAY_ATTR, EDIT_EVENT_CANCEL,
  EDIT_EVENT_COMMIT, EDIT_HIT_ATTR, EDIT_KIND_ATTR, EDIT_LABEL_ATTR, EDIT_MAX_ATTR, EDIT_MIN_ATTR,
  EDIT_NAME_ATTR, EDIT_OPTIONS_ATTR, EDIT_PLACEHOLDER_ATTR, EDIT_REQUIRED_ATTR, EDIT_STEP_ATTR,
  EDIT_UNIT_ATTR, EDIT_VALUE_ATTR, EDIT_VALUE_CLASS,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildEditableValueJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const C = q(EDIT_VALUE_CLASS);
  return m('base-render.components-editable-value-runtime.c001', {
    p0: String(q(EDIT_NAME_ATTR)),
    p1: String(q(EDIT_KIND_ATTR)),
    p2: String(q(EDIT_VALUE_ATTR)),
    p3: String(q(EDIT_DISPLAY_ATTR)),
    p4: String(q(EDIT_UNIT_ATTR)),
    p5: String(q(EDIT_LABEL_ATTR)),
    p6: String(q(EDIT_OPTIONS_ATTR)),
    p7: String(q(EDIT_AFFORDANCE_ATTR)),
    p8: String(q(EDIT_REQUIRED_ATTR)),
    p9: String(q(EDIT_PLACEHOLDER_ATTR)),
    p10: String(q(EDIT_MIN_ATTR)),
    p11: String(q(EDIT_MAX_ATTR)),
    p12: String(q(EDIT_STEP_ATTR)),
    p13: String(q(EDIT_HIT_ATTR)),
    p14: String(q(EDIT_DISABLED_ATTR)),
    p15: String(q(EDIT_BOUND_ATTR)),
    p16: String(C),
    p17: String(q(EDIT_EVENT_COMMIT)),
    p18: String(q(EDIT_EVENT_CANCEL)),
  });
}
