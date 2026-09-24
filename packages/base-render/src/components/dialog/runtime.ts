/** dialog · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editable-value/runtime.ts` 同一处分工：模块代码零 DOM，DOM 只在产出的字符串里。
 *
 *  行为契约（逐条对应判据）：
 *   · **原生优先**：开＝`showModal()`（焦点锁、`Esc`、背景 `inert`、顶层都是浏览器给的）；
 *     没有 `showModal` 的老引擎退回 `open` 属性（非模态，但内容照常可读）。
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click`；`close`／`cancel` 两个**不冒泡**的事件走**捕获相位**。
 *     `data-ilife-dialog-bound` 只是记账，重复注入靠根上那枚 `data-ilife-dialog-runtime` 拦住。
 *   · **关的四条路**：动作键（`detail.reason='action'` ＋ `detail.value`）／`Esc`（`'esc'`）／
 *     点遮罩（`'backdrop'`，只在点落在面板矩形**之外**时算）／脚本 `close()`（`'programmatic'`）。
 *   · **焦点归还**：关闭后焦点必须回到**按它的那颗按钮**（原生通常会还；本段兜住
 *     「焦点落在 body／还给了别的元素」那一种，且只在触发键仍在文档里时才抢）。
 *   · **不许点穿**：遮罩上的点击**不**关面板以外的任何东西（顶层本来就不透传，这里只是不额外转发）。
 */
import {
  DIALOG_ACT_ATTR, DIALOG_ATTR, DIALOG_BOUND_ATTR, DIALOG_EVENT_CLOSE, DIALOG_EVENT_OPEN,
  DIALOG_OPEN_ATTR,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildDialogJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var ATTR=' + q(DIALOG_ATTR) + ', OPEN=' + q(DIALOG_OPEN_ATTR) + ', ACT=' + q(DIALOG_ACT_ATTR) + ';' + '\n'
    + '  var BOUND=' + q(DIALOG_BOUND_ATTR) + ';' + '\n'
    + '  var EV_OPEN=' + q(DIALOG_EVENT_OPEN) + ', EV_CLOSE=' + q(DIALOG_EVENT_CLOSE) + ';' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-dialog-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-dialog-runtime","1");' + '\n'
    + '  var lastReason="programmatic", lastValue=null, lastTrigger=null;' + '\n'
    + '  function fire(el,name,detail){ el.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail})); }' + '\n'
    + '  function panelOf(el){ if (!el || !el.closest) return null;'
    + ' var d=el.closest("dialog["+ATTR+"]"); return d; }' + '\n'
    + '  function openPanel(id,trigger){' + '\n'
    + '    var dlg=doc.getElementById(id);' + '\n'
    + '    if (!dlg || !dlg.hasAttribute(ATTR)) return;' + '\n'
    + '    if (typeof dlg.showModal==="function"){' + '\n'
    + '      if (dlg.open){ try{ dlg.close(); }catch(e){} }' + '\n'
    + '      try{ dlg.showModal(); }catch(e){ dlg.setAttribute("open",""); }' + '\n'
    + '    } else { dlg.setAttribute("open",""); }' + '\n'
    + '    lastTrigger=trigger||null;' + '\n'
    + '    fire(dlg,EV_OPEN,{id:id,modal:(typeof dlg.showModal==="function")});' + '\n'
    + '  }' + '\n'
    + '  function closePanel(dlg,value,reason){' + '\n'
    + '    lastReason=reason; lastValue=value;' + '\n'
    + '    try{ dlg.returnValue=(value===null?"":value); dlg.close(value===null?undefined:value); }' + '\n'
    + '    catch(e){ dlg.removeAttribute("open"); }' + '\n'
    + '  }' + '\n'
    + '  function outside(box,x,y){ return x<box.left || x>box.right || y<box.top || y>box.bottom; }' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var t=e.target; if (!t || !t.closest) return;' + '\n'
    + '    var opener=t.closest("["+OPEN+"]");' + '\n'
    + '    if (opener){ e.preventDefault(); openPanel(opener.getAttribute(OPEN),opener); return; }' + '\n'
    + '    var act=t.closest("["+ACT+"]");' + '\n'
    + '    if (act){ var d=panelOf(act); if (!d) return; e.preventDefault();'
    + ' closePanel(d, act.getAttribute(ACT), "action"); return; }' + '\n'
    + '    if (t.hasAttribute(ATTR)){ var b=t.getBoundingClientRect();'
    + ' if (outside(b,e.clientX,e.clientY)) closePanel(t,null,"backdrop"); }' + '\n'
    + '  });' + '\n'
    /* `cancel`（Esc 请求关闭）与 `close`（真的关了）都不冒泡 ⇒ 走捕获相位，免得逐个面板挂监听。 */
    + '  doc.addEventListener("cancel", function(e){ var d=e.target;'
    + ' if (d && d.hasAttribute && d.hasAttribute(ATTR)) lastReason="esc"; }, true);' + '\n'
    + '  doc.addEventListener("close", function(e){' + '\n'
    + '    var d=e.target;' + '\n'
    + '    if (!d || !d.hasAttribute || !d.hasAttribute(ATTR)) return;' + '\n'
    + '    var reason=lastReason, value=(reason==="action"?lastValue:null);' + '\n'
    + '    lastReason="programmatic"; lastValue=null;' + '\n'
    + '    var t=lastTrigger; lastTrigger=null;' + '\n'
    + '    if (t && t.isConnected && doc.activeElement!==t){ try{ t.focus(); }catch(e2){} }' + '\n'
    + '    fire(d,EV_CLOSE,{id:d.getAttribute(ATTR),reason:reason,value:value});' + '\n'
    + '  }, true);' + '\n'
    /* 记账：哪些面板已被本段接管（幂等；也是判据里「运行时真的跑过」的读数）。 */
    + '  var all=doc.querySelectorAll("dialog["+ATTR+"]");' + '\n'
    + '  for (var i=0;i<all.length;i+=1) all[i].setAttribute(BOUND,"1");' + '\n'
    + '}());';
}
