/** confirm-strip · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editable-value` 同一处分工：模块代码零 DOM；DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click` 与一枚 `keydown` 委派；重复注入只绑定一次
 *     （守卫写在 `document.documentElement` 的属性上，页面里放两份运行时也只派发一条事件）；
 *     绑定后逐条打上 `CONFIRM_STRIP_BOUND_ATTR`（页面据此看出「这一条已被接管」）。
 *   · **两个动作各一条事件**：危险动作 → `ilife:confirm`；安全动作（「再想想」或 `Esc`）→ `ilife:confirm-cancel`。
 *     两条都冒泡到 `document`，`detail = { action, count, unit, irreversible, backup }`——
 *     页面据此删自己的记录，**本件不碰数据**。
 *   · **按不动就不派发**：按钮 `disabled`、或这一条的状态不是 `rest`（`busy`／`disabled`）→ 一个字节都不派发。
 *   · **Esc 只在焦点落在这一条里时算「再想想」**（否则会把页面上别的 Esc 语义吃掉）。
 *   · **无脚本降级**：这段不跑时，要删什么、删几条、能不能撤销照常可读（就是文本），只是按不动。
 */
import {
  CONFIRM_STRIP_ACT_ATTR, CONFIRM_STRIP_BACKUP_ATTR, CONFIRM_STRIP_BOUND_ATTR, CONFIRM_STRIP_CLASS,
  CONFIRM_STRIP_COUNT_ATTR, CONFIRM_STRIP_EVENT_CANCEL, CONFIRM_STRIP_EVENT_COMMIT,
  CONFIRM_STRIP_IRREVERSIBLE_ATTR, CONFIRM_STRIP_STATE_ATTR, CONFIRM_STRIP_UNIT_ATTR,
  CONFIRM_STRIP_ACTS,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildConfirmStripJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const danger = CONFIRM_STRIP_ACTS[1];
  return m('base-render.components-confirm-strip-runtime.c001', {
    p0: String(q(CONFIRM_STRIP_CLASS)),
    p1: String(q(CONFIRM_STRIP_ACT_ATTR)),
    p2: String(q(CONFIRM_STRIP_STATE_ATTR)),
    p3: String(q(CONFIRM_STRIP_COUNT_ATTR)),
    p4: String(q(CONFIRM_STRIP_UNIT_ATTR)),
    p5: String(q(CONFIRM_STRIP_IRREVERSIBLE_ATTR)),
    p6: String(q(CONFIRM_STRIP_BACKUP_ATTR)),
    p7: String(q(CONFIRM_STRIP_BOUND_ATTR)),
    p8: String(q(CONFIRM_STRIP_EVENT_COMMIT)),
    p9: String(q(CONFIRM_STRIP_EVENT_CANCEL)),
    p10: String(q(danger)),
  });
}
