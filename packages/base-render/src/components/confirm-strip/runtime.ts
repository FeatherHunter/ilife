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

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildConfirmStripJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const danger = CONFIRM_STRIP_ACTS[1];
  return '(function(){' + '\n'
    + '  var CLASS_ROOT=' + q(CONFIRM_STRIP_CLASS) + ', ATTR_ACT=' + q(CONFIRM_STRIP_ACT_ATTR) + ';' + '\n'
    + '  var ATTR_STATE=' + q(CONFIRM_STRIP_STATE_ATTR) + ', ATTR_COUNT=' + q(CONFIRM_STRIP_COUNT_ATTR) + ';' + '\n'
    + '  var ATTR_UNIT=' + q(CONFIRM_STRIP_UNIT_ATTR) + ', ATTR_IRREV=' + q(CONFIRM_STRIP_IRREVERSIBLE_ATTR) + ';' + '\n'
    + '  var ATTR_BACKUP=' + q(CONFIRM_STRIP_BACKUP_ATTR) + ', ATTR_BOUND=' + q(CONFIRM_STRIP_BOUND_ATTR) + ';' + '\n'
    + '  var EV_COMMIT=' + q(CONFIRM_STRIP_EVENT_COMMIT) + ', EV_CANCEL=' + q(CONFIRM_STRIP_EVENT_CANCEL) + ';' + '\n'
    + '  var SEL_ROOT="."+CLASS_ROOT, ACT_DANGER=' + q(danger) + ', GUARD="data-ilife-confirm-runtime";' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute(GUARD)==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute(GUARD,"1");' + '\n'
    + '  function stripOf(el){ return el && el.closest ? el.closest(SEL_ROOT) : null; }' + '\n'
    + '  function payload(strip, action){' + '\n'
    + '    var backup=strip.querySelector("["+ATTR_BACKUP+"]");' + '\n'
    + '    return { action:action, count:Number(strip.getAttribute(ATTR_COUNT)||"0"),'
    + ' unit:strip.getAttribute(ATTR_UNIT), irreversible:strip.getAttribute(ATTR_IRREV)==="1",'
    + ' backup:!!(backup && backup.checked) };' + '\n'
    + '  }' + '\n'
    + '  /* 唯一写出口：能派发才派发（按钮 `disabled` 或状态不是 `rest` ⇒ 直接返回）。 */' + '\n'
    + '  function fire(strip, action){' + '\n'
    + '    if (!strip) return false;' + '\n'
    + '    if ((strip.getAttribute(ATTR_STATE)||"rest")!=="rest") return false;' + '\n'
    + '    var name=(action===ACT_DANGER)?EV_COMMIT:EV_CANCEL;' + '\n'
    + '    strip.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:payload(strip,action)}));' + '\n'
    + '    return true;' + '\n'
    + '  }' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var btn=e.target && e.target.closest ? e.target.closest("["+ATTR_ACT+"]") : null;' + '\n'
    + '    if (!btn || btn.disabled) return;' + '\n'
    + '    var strip=stripOf(btn); if (!strip) return;' + '\n'
    + '    fire(strip, btn.getAttribute(ATTR_ACT));' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("keydown", function(e){' + '\n'
    + '    if (e.key!=="Escape" && e.key!=="Esc") return;' + '\n'
    + '    var strip=stripOf(e.target); if (!strip) return;' + '\n'
    + '    if ((strip.getAttribute(ATTR_STATE)||"rest")!=="rest") return;' + '\n'
    + '    e.preventDefault(); fire(strip, "keep");' + '\n'
    + '  });' + '\n'
    + '  var all=doc.querySelectorAll("["+ATTR_ACT+"]");' + '\n'
    + '  for (var i=0;i<all.length;i+=1){ var s=stripOf(all[i]); if (s) s.setAttribute(ATTR_BOUND,"1"); }' + '\n'
    + '}());';
}
