/** radio-cards · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editable-value/runtime.ts` 同一处分工：模块代码零 DOM；DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `change` 委派；重复注入只绑定一次（根上 `data-ilife-radio-runtime`）。
 *   · **原生语义优先**：单选的分组、互斥、方向键移动**全用原生 `<input type="radio">`**
 *     ——运行时不去重造一遍键盘行为（重造出来的那套必然是错的）。
 *   · **机器值落 DOM**：选中变化 ⇒ 组根上的 `data-ilife-radio-value` 就地改写（页面读属性即可拿值）。
 *   · **联动走事件**：派发 `ilife:radio-change`（冒泡，`detail = { name, value, title, prev }`），
 *     页面用 `root.addEventListener(…)` 接自己的重算——**不引入任何全局**。
 *   · **禁用不派发**：禁用的选项点不动（原生 `disabled`），这条由标记承担，运行时不额外编故事。
 *   · **无脚本降级**：这段不跑时，卡照样按 `checked` 显示选中态（标记里已经写好了），只是不派发事件。
 */

import {
  RADIO_CARDS_BOUND_ATTR,
  RADIO_CARDS_EVENT_CHANGE,
  RADIO_CARDS_NAME_ATTR,
  RADIO_CARDS_OPTION_ATTR,
  RADIO_CARDS_RUNTIME_ATTR,
  RADIO_CARDS_VALUE_ATTR,
  radioCardsSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildRadioCardsJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + LF
    + '  var ATTR_NAME=' + q(RADIO_CARDS_NAME_ATTR) + ', ATTR_VALUE=' + q(RADIO_CARDS_VALUE_ATTR) + ';' + LF
    + '  var ATTR_OPTION=' + q(RADIO_CARDS_OPTION_ATTR) + ', ATTR_BOUND=' + q(RADIO_CARDS_BOUND_ATTR) + ';' + LF
    + '  var ATTR_RUNTIME=' + q(RADIO_CARDS_RUNTIME_ATTR) + ', EV=' + q(RADIO_CARDS_EVENT_CHANGE) + ';' + LF
    + '  var CLASS_TITLE=' + q(radioCardsSlot('title')) + ';' + LF
    + '  var doc=document;' + LF
    + '  if (doc.documentElement.getAttribute(ATTR_RUNTIME)==="1") return;' + LF
    + '  doc.documentElement.setAttribute(ATTR_RUNTIME,"1");' + LF
    + '  function groupOf(el){' + LF
    + '    if (!el || !el.closest) return null;' + LF
    + '    var g=el.closest("["+ATTR_NAME+"]");' + LF
    + '    return g && g.querySelector("input[type=radio]") ? g : null;' + LF
    + '  }' + LF
    + '  function titleOf(input){' + LF
    + '    var card=input.closest ? input.closest("["+ATTR_OPTION+"]") : null;' + LF
    + '    if (!card) return String(input.value);' + LF
    + '    var t=card.querySelector("."+CLASS_TITLE);' + LF
    + '    return t ? t.textContent : String(input.value);' + LF
    + '  }' + LF
    + '  doc.addEventListener("change", function(e){' + LF
    + '    var t=e.target;' + LF
    + '    if (!t || t.type!=="radio") return;' + LF
    + '    var root=groupOf(t); if (!root) return;' + LF
    + '    var prev=root.getAttribute(ATTR_VALUE);' + LF
    + '    var next=String(t.value);' + LF
    + '    root.setAttribute(ATTR_VALUE, next);' + LF
    + '    if (next===prev) return;' + LF
    + '    root.dispatchEvent(new CustomEvent(EV,{bubbles:true,' + LF
    + '      detail:{name:root.getAttribute(ATTR_NAME),value:next,title:titleOf(t),prev:prev}}));' + LF
    + '  });' + LF
    + '  var all=doc.querySelectorAll("["+ATTR_NAME+"]");' + LF
    + '  for (var i=0;i<all.length;i+=1) all[i].setAttribute(ATTR_BOUND,"1");' + LF
    + '}());';
}
