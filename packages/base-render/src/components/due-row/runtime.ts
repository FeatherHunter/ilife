/** due-row · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  这一件的运行时段很薄，**是故意的**：按钮的全部触感（悬停／按下／焦点／禁用）都由原生 `<button>`
 *  与样式段承担，运行时只做一件事——**把点击翻译成一条冒泡事件**（`ilife:due-action`），
 *  并把行键、行名、档位、动作键一起带出去。本件不自己决定"去派出所"是什么意思。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click` 委派；重复注入只绑一次（根标记在 `documentElement`）。
 *   · **禁用不派发**：`disabled` 的按钮原生就不产生 `click`，运行时再拦一道（属性被脚本改过也拦住）。
 *   · **一次点击一条事件**：`closest` 只认最近的那枚按钮 ⇒ 嵌套标记也不会重复派发。
 *   · **无脚本降级**：这段不跑时每一行照样读得全（档位、倒计时、到期日、该做什么都印在页上），
 *     只是按钮按下去没人接。
 */
import {
  DUE_ACT_ATTR, DUE_ACT_LABEL_ATTR, DUE_BOUND_ATTR, DUE_DISABLED_ATTR, DUE_EVENT_ACTION,
  DUE_KEY_ATTR, DUE_LABEL_ATTR, DUE_TONE_ATTR,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildDueRowJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-due-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-due-runtime","1");' + '\n'
    + '  var A_ACT=' + q(DUE_ACT_ATTR) + ', A_ACT_LABEL=' + q(DUE_ACT_LABEL_ATTR) + ', A_KEY=' + q(DUE_KEY_ATTR) + ';' + '\n'
    + '  var A_LABEL=' + q(DUE_LABEL_ATTR) + ', A_TONE=' + q(DUE_TONE_ATTR) + ', A_DISABLED=' + q(DUE_DISABLED_ATTR) + ';' + '\n'
    + '  var A_BOUND=' + q(DUE_BOUND_ATTR) + ', EV=' + q(DUE_EVENT_ACTION) + ';' + '\n'
    + '  function rowOf(btn){ return btn.closest ? btn.closest("["+A_KEY+"]") : null; }' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var btn=e.target && e.target.closest ? e.target.closest("["+A_ACT+"]") : null;' + '\n'
    + '    if (!btn) return;' + '\n'
    /* 禁用（原生的或属性写的）都不派发：界面不许"看着能点、点了没反应" */
    + '    if (btn.disabled || btn.getAttribute(A_DISABLED)==="1"){ e.preventDefault(); return; }' + '\n'
    + '    var row=rowOf(btn); if (!row) return;' + '\n'
    + '    row.dispatchEvent(new CustomEvent(EV,{bubbles:true,detail:{' + '\n'
    + '      key:row.getAttribute(A_KEY), name:row.getAttribute(A_LABEL), tone:row.getAttribute(A_TONE),' + '\n'
    + '      action:btn.getAttribute(A_ACT), actionLabel:btn.getAttribute(A_ACT_LABEL)}}));' + '\n'
    + '  });' + '\n'
    + '  var all=doc.querySelectorAll("["+A_ACT+"]"), k;' + '\n'
    + '  for (k=0;k<all.length;k+=1) all[k].setAttribute(A_BOUND,"1");' + '\n'
    + '}());';
}
