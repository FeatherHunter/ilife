/** number-stepper · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editable-value` 同一处分工：模块代码零 DOM；DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应测试）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click` 委派（外加 `keydown`／`focusout` 管行内编辑器）；
 *     重复注入只绑定一次（`data-ilife-stepper-runtime`）。
 *   · **三枚可点区**：−／＋ 各走一档（夹在 `[min, max]` 内、吸附到步长格子）；值位点开**行内编辑器**
 *     （同一格里换 `input`，与值位同盒模型 ⇒ 不跳版）；到下限／上限时对应那枚键落 `disabled`，
 *     并在状态字位写「已到下限／已到上限」（**不是靠变灰**）。
 *   · **常用值**：点一下直接落到那一档；当前值命中哪一枚，哪一枚 `aria-pressed="true"`。
 *   · **变更事件**：只有真变了才派发 `ilife:stepper-change`（夹到同值不派发、编辑器原样提交不派发）。
 *   · **拒绝说不清的值**：编辑器里的数越界或不在格子上时**留在编辑态** ＋ 写在控件旁边的错误行
 *     （控件 `aria-describedby` 指向它），不静默吸附、也不静默清空。
 *   · **更新中不接点击**：根上挂了 `data-ilife-stepper-loading="1"` 时一律不响应（原地换字期间防抖）。
 *   · **无脚本降级**：这段不跑时值照常可读（数字、单位、状态字都在标记里），只是不可改。
 */
import {
  NUMBER_STEPPER_ACT_ATTR,
  NUMBER_STEPPER_BOUND_ATTR,
  NUMBER_STEPPER_CLASS,
  NUMBER_STEPPER_DECIMALS_ATTR,
  NUMBER_STEPPER_DISABLED_ATTR,
  NUMBER_STEPPER_EDITING_ATTR,
  NUMBER_STEPPER_EVENT_CHANGE,
  NUMBER_STEPPER_HIT_ATTR,
  NUMBER_STEPPER_LABEL_ATTR,
  NUMBER_STEPPER_LOADING_ATTR,
  NUMBER_STEPPER_MAX_ATTR,
  NUMBER_STEPPER_MIN_ATTR,
  NUMBER_STEPPER_MISSING,
  NUMBER_STEPPER_NAME_ATTR,
  NUMBER_STEPPER_QUICK_ATTR,
  NUMBER_STEPPER_STATE_ATTR,
  NUMBER_STEPPER_STEP_ATTR,
  NUMBER_STEPPER_AT_MAX,
  NUMBER_STEPPER_AT_MIN,
  NUMBER_STEPPER_UNIT_ATTR,
  NUMBER_STEPPER_UNSET,
  NUMBER_STEPPER_VALUE_ATTR,
  numberStepperSlot,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildNumberStepperJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return m('base-render.components-number-stepper-runtime.c001', {
    p0: String(q(NUMBER_STEPPER_NAME_ATTR)),
    p1: String(q(NUMBER_STEPPER_VALUE_ATTR)),
    p2: String(q(NUMBER_STEPPER_MIN_ATTR)),
    p3: String(q(NUMBER_STEPPER_MAX_ATTR)),
    p4: String(q(NUMBER_STEPPER_STEP_ATTR)),
    p5: String(q(NUMBER_STEPPER_DECIMALS_ATTR)),
    p6: String(q(NUMBER_STEPPER_UNIT_ATTR)),
    p7: String(q(NUMBER_STEPPER_LABEL_ATTR)),
    p8: String(q(NUMBER_STEPPER_ACT_ATTR)),
    p9: String(q(NUMBER_STEPPER_QUICK_ATTR)),
    p10: String(q(NUMBER_STEPPER_HIT_ATTR)),
    p11: String(q(NUMBER_STEPPER_STATE_ATTR)),
    p12: String(q(NUMBER_STEPPER_EDITING_ATTR)),
    p13: String(q(NUMBER_STEPPER_DISABLED_ATTR)),
    p14: String(q(NUMBER_STEPPER_LOADING_ATTR)),
    p15: String(q(NUMBER_STEPPER_BOUND_ATTR)),
    p16: String(q(NUMBER_STEPPER_EVENT_CHANGE)),
    p17: String(q(NUMBER_STEPPER_MISSING)),
    p18: String(q(NUMBER_STEPPER_AT_MIN())),
    p19: String(q(NUMBER_STEPPER_AT_MAX())),
    p20: String(q(NUMBER_STEPPER_UNSET())),
    p21: String(q(NUMBER_STEPPER_CLASS)),
    p22: String(q(numberStepperSlot('state'))),
    p23: String(q(numberStepperSlot('number'))),
    p24: String(q(numberStepperSlot('value'))),
    p25: String(q(numberStepperSlot('editor'))),
    p26: String(q(numberStepperSlot('error'))),
    p27: String(q(numberStepperSlot('caliber'))),
    p28: String(q(numberStepperSlot('dec'))),
    p29: String(q(numberStepperSlot('inc'))),
    p30: String(q(numberStepperSlot('preset'))),
  });
}
