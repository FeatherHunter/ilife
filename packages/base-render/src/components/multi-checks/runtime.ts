import {
  MULTI_CHECKS_ACTION_ATTR,
  MULTI_CHECKS_ALL_ATTR,
  MULTI_CHECKS_AMOUNT_ATTR,
  MULTI_CHECKS_BOUND_ATTR,
  MULTI_CHECKS_EVENT_ACTION,
  MULTI_CHECKS_EVENT_CHANGE,
  MULTI_CHECKS_GROUP_ATTR,
  MULTI_CHECKS_ITEM_ATTR,
  MULTI_CHECKS_LOADING_ATTR,
  MULTI_CHECKS_MONEY_ATTR,
  MULTI_CHECKS_NAME_ATTR,
  MULTI_CHECKS_NONE_TEXT,
  MULTI_CHECKS_RUNTIME_ATTR,
  MULTI_CHECKS_UNIT_ATTR,
  multiChecksSlot,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** multi-checks · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editable-value/runtime.ts` 同一处分工：模块代码零 DOM；DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `change` 与一枚 `click` 委派；重复注入只绑定一次。
 *   · **三态一处算**（`refresh`）：全选框与组头框的「勾／半勾／没勾」、顶上「已选 N / M 条」、
 *     底下「合计 ¥…」，全部由**同一趟**刷新算出来——三处各算各的必然走散。
 *   · **总开关往下走**：「全选」把每一行设成自己；组头把**本组**每一行设成自己（禁用的行不动）。
 *   · **半勾落成 `indeterminate`**：标记里只能给 `aria-checked="mixed"`（`indeterminate` 是 IDL 属性），
 *     init 那一趟按下它落成真状态；状态一变，`aria-checked` 跟着改回来。
 *   · **金额按整数分相加**：浮点相加会把 `0.1 ＋ 0.2` 变成 `0.30000000000000004`，读数就假了。
 *   · **加载态不改读数**：`data-ilife-checks-loading="1"` 时刷新直接退出（那句字是页面给的，不许被覆盖）。
 *   · **联动走事件**：`ilife:checks-change`（勾选面）与 `ilife:checks-action`（动作面）都冒泡到文档，
 *     页面用 `document.addEventListener(…)` 接自己的处理——**不引入任何全局**。
 *   · **无脚本降级**：这段不跑时，勾选照常（原生复选）、报数那句停在标记里算好的那一份快照。
 */
export function buildMultiChecksJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  /* **带点的类选择器**：下面按类找元素（`root.querySelector(SEL_COUNT)`）——漏了这个点，
     `querySelector("ilife-block-…-count")` 找的是**标签名**，永远查不到（2026-09 实拍：
     全选之后勾选框都变了、已选数那句却纹丝不动）。 */
  const CLS_COUNT = q('.' + multiChecksSlot('count'));
  const CLS_SUM = q('.' + multiChecksSlot('sum'));
  return m('base-render.components-multi-checks-runtime.c001', {
    p0: String(LF),
    p1: String(q(MULTI_CHECKS_NAME_ATTR)),
    p2: String(q(MULTI_CHECKS_ITEM_ATTR)),
    p3: String(LF),
    p4: String(q(MULTI_CHECKS_GROUP_ATTR)),
    p5: String(q(MULTI_CHECKS_ALL_ATTR)),
    p6: String(LF),
    p7: String(q(MULTI_CHECKS_ACTION_ATTR)),
    p8: String(q(MULTI_CHECKS_AMOUNT_ATTR)),
    p9: String(LF),
    p10: String(q(MULTI_CHECKS_MONEY_ATTR)),
    p11: String(q(MULTI_CHECKS_UNIT_ATTR)),
    p12: String(LF),
    p13: String(q(MULTI_CHECKS_LOADING_ATTR)),
    p14: String(q(MULTI_CHECKS_BOUND_ATTR)),
    p15: String(LF),
    p16: String(q(MULTI_CHECKS_RUNTIME_ATTR)),
    p17: String(LF),
    p18: String(q(MULTI_CHECKS_EVENT_CHANGE)),
    p19: String(q(MULTI_CHECKS_EVENT_ACTION)),
    p20: String(LF),
    p21: String(CLS_COUNT),
    p22: String(CLS_SUM),
    p23: String(q(MULTI_CHECKS_NONE_TEXT())),
    p24: String(LF),
    p25: String(LF),
    p26: String(LF),
    p27: String(LF),
    p28: String(LF),
    p29: String(LF),
    p30: String(LF),
    p31: String(LF),
    p32: String(LF),
    p33: String(LF),
    p34: String(LF),
    p35: String(LF),
    p36: String(LF),
    p37: String(LF),
    p38: String(LF),
    p39: String(LF),
    p40: String(LF),
    p41: String(LF),
    p42: String(LF),
    p43: String(LF),
    p44: String(LF),
    p45: String(LF),
    p46: String(LF),
    p47: String(LF),
    p48: String(LF),
    p49: String(LF),
    p50: String(LF),
    p51: String(LF),
    p52: String(LF),
    p53: String(LF),
    p54: String(LF),
    p55: String(LF),
    p56: String(LF),
    p57: String(LF),
    p58: String(LF),
    p59: String(LF),
    p60: String(LF),
    p61: String(LF),
    p62: String(LF),
    p63: String(LF),
    p64: String(LF),
    p65: String(LF),
    p66: String(LF),
    p67: String(LF),
    p68: String(LF),
    p69: String(LF),
    p70: String(LF),
    p71: String(LF),
    p72: String(LF),
    p73: String(LF),
    p74: String(LF),
    p75: String(LF),
    p76: String(LF),
    p77: String(LF),
    p78: String(LF),
    p79: String(LF),
    p80: String(LF),
    p81: String(LF),
    p82: String(LF),
    p83: String(LF),
    p84: String(LF),
    p85: String(LF),
    p86: String(LF),
    p87: String(LF),
    p88: String(LF),
    p89: String(LF),
    p90: String(LF),
    p91: String(LF),
    p92: String(LF),
    p93: String(LF),
    p94: String(LF),
    p95: String(LF),
    p96: String(LF),
    p97: String(LF),
    p98: String(LF),
    p99: String(LF),
    p100: String(LF),
    p101: String(LF),
    p102: String(LF),
    p103: String(LF),
    p104: String(LF),
    p105: String(LF),
    p106: String(LF),
  });
}
