/** command-palette · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `dialog/runtime.ts`／`search-field/runtime.ts` 同一处分工：模块代码零 DOM，DOM 只在产出的字符串里。
 *
 *  行为契约（逐条对应判据）：
 *   · **开与关不靠脚本**：入口键带 `popovertarget`、面板是原生 `popover`、关掉键带
 *     `popovertargetaction="hide"` ⇒ 这一段一行都没跑到，面板照样开、照样关（点面板外那一下也是浏览器给的）。
 *   · **输入即筛**：`document` 上一枚委派的 `input`；一行露不露**只改那一行自己的 `hidden`**
 *     （不重排 DOM、不重建节点——重排会把输入法打断）；一组的行全不露时，那一组的标题也跟着收起来。
 *   · **命中词重画在同一个格子里**：主文字那一格（`data-*` 的 label 格）按当前词重画，
 *     用 `createElement('mark')` ＋ `textContent` 拼（**不碰 innerHTML**：用户打的词永远进不了标签）。
 *   · **真读数**：脚注与空态那两句按「露着几行」现算（不是文案），并派发
 *     `ilife:command-palette-query`（`detail.hits`＝现在露着的行数）。
 *   · **整行可点＝执行或打开**：点一行 → 收起面板 → 焦点还给入口键 → 派发
 *     `ilife:command-palette-run`（`detail={id,value,kind,label}`）；停用那一行点不动（`disabled`）。
 *   · **焦点只在真有指针的机器上抢**：桌面（`hover:hover` ＋ `pointer:fine`，**与样式段读同一个能力查询串**）
 *     打开时把焦点放进输入框；手机上不抢——一抢就要弹软键盘，把列表压掉一半。
 *   · **幂等**：`<html>` 上一枚 `data-ilife-command-palette-runtime` 拦住重复注入；入口键上记一枚 bound 读数。
 */
import {
  COMMAND_PALETTE_ATTR,
  COMMAND_PALETTE_BOUND_ATTR,
  COMMAND_PALETTE_EMPTY_ATTR,
  COMMAND_PALETTE_EVENT_QUERY,
  COMMAND_PALETTE_EVENT_RUN,
  COMMAND_PALETTE_FOOT_ATTR,
  COMMAND_PALETTE_GROUP_ATTR,
  COMMAND_PALETTE_HIT_ATTR,
  COMMAND_PALETTE_HOVER_QUERY,
  COMMAND_PALETTE_ITEM_ATTR,
  COMMAND_PALETTE_KIND_ATTR,
  COMMAND_PALETTE_LABEL_ATTR,
  COMMAND_PALETTE_LOADING_ATTR,
  COMMAND_PALETTE_OPEN_ATTR,
  COMMAND_PALETTE_PANEL_ATTR,
  COMMAND_PALETTE_QUERY_ATTR,
  COMMAND_PALETTE_RUNTIME_ATTR,
  COMMAND_PALETTE_SEARCH_ATTR,
  COMMAND_PALETTE_TEXT,
  commandPaletteSlot,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进自己的脚本槽）。 */
export function buildCommandPaletteJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const T = COMMAND_PALETTE_TEXT;
  return m('base-render.components-command-palette-runtime.c001', {
    p0: String(q(COMMAND_PALETTE_ATTR)),
    p1: String(q(COMMAND_PALETTE_OPEN_ATTR)),
    p2: String(q(COMMAND_PALETTE_PANEL_ATTR)),
    p3: String(q(COMMAND_PALETTE_QUERY_ATTR)),
    p4: String(q(COMMAND_PALETTE_ITEM_ATTR)),
    p5: String(q(COMMAND_PALETTE_KIND_ATTR)),
    p6: String(q(COMMAND_PALETTE_SEARCH_ATTR)),
    p7: String(q(COMMAND_PALETTE_LABEL_ATTR)),
    p8: String(q(COMMAND_PALETTE_GROUP_ATTR)),
    p9: String(q(COMMAND_PALETTE_EMPTY_ATTR)),
    p10: String(q(commandPaletteSlot('hit'))),
    p11: String(q(COMMAND_PALETTE_FOOT_ATTR)),
    p12: String(q(COMMAND_PALETTE_HIT_ATTR)),
    p13: String(q(COMMAND_PALETTE_BOUND_ATTR)),
    p14: String(q(COMMAND_PALETTE_LOADING_ATTR)),
    p15: String(q(COMMAND_PALETTE_RUNTIME_ATTR)),
    p16: String(q(COMMAND_PALETTE_EVENT_RUN)),
    p17: String(q(COMMAND_PALETTE_EVENT_QUERY)),
    p18: String(q(COMMAND_PALETTE_HOVER_QUERY)),
    p19: String(q(T.footIdle)),
    p20: String(q(T.footHitPre)),
    p21: String(q(T.footHitPost)),
    p22: String(q(T.footNone)),
    p23: String(q(T.footBusy)),
    p24: String(q(T.emptyPre)),
    p25: String(q(T.emptyPost)),
  });
}
