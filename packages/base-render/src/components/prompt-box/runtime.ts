/** prompt-box · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  薄是故意的：按钮的触感由原生 `<button>` 与样式段承担，运行时只做两件事——
 *  点复制按钮时把**同一张卡里**正文的文字交出去，交完派发一条冒泡事件请页面记一笔。
 *  交不出去（页面没开剪贴板）也派发（`ok: false`），页面照此写回执，不许静默。
 */
import {
  PROMPT_BOX_BOUND_ATTR,
  PROMPT_BOX_COPY_ATTR,
  PROMPT_BOX_EVENT_COPY,
  PROMPT_BOX_ROOT_ATTR,
  promptBoxSlot,
} from './render.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildPromptBoxJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const selBody = q('.' + promptBoxSlot('body'));
  const selHead = q('.' + promptBoxSlot('head'));
  return '(function(){' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute(' + q(PROMPT_BOX_BOUND_ATTR) + ')==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute(' + q(PROMPT_BOX_BOUND_ATTR) + ',"1");' + '\n'
    + '  var A_COPY=' + q(PROMPT_BOX_COPY_ATTR) + ', A_ROOT=' + q(PROMPT_BOX_ROOT_ATTR) + ';' + '\n'
    + '  var EV=' + q(PROMPT_BOX_EVENT_COPY) + ', SEL_BODY=' + selBody + ', SEL_HEAD=' + selHead + ';' + '\n'
    + '  function copy(text){ var ok=false; try{' + '\n'
    + '    var t=doc.createElement("textarea"); t.value=text;' + '\n'
    + '    t.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";' + '\n'
    + '    doc.body.appendChild(t); t.focus(); t.select();' + '\n'
    + '    ok=doc.execCommand("copy"); doc.body.removeChild(t);' + '\n'
    + '  }catch(e){ ok=false; } return ok; }' + '\n'
    + '  function labelOf(root){ var h=root.querySelector(SEL_HEAD);'
    + ' return (h && h.textContent !== null) ? h.textContent : ""; }' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var btn=e.target && e.target.closest ? e.target.closest("["+A_COPY+"]") : null;' + '\n'
    + '    if (!btn || btn.disabled) return;' + '\n'
    + '    var root=btn.closest ? btn.closest("["+A_ROOT+"]") : null; if (!root) return;' + '\n'
    + '    var pre=root.querySelector(SEL_BODY);' + '\n'
    + '    var text=(pre && pre.textContent !== null) ? pre.textContent : "";' + '\n'
    + '    var ok=copy(text);' + '\n'
    + '    root.dispatchEvent(new CustomEvent(EV,{bubbles:true,detail:{' + '\n'
    + '      label:labelOf(root), chars:text.length, ok:ok}}));' + '\n'
    + '  });' + '\n'
    + '}());';
}
