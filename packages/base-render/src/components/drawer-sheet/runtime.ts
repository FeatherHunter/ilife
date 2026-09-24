/** drawer-sheet · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `dialog/runtime.ts` 同一处分工：模块代码零 DOM，DOM 只在产出的字符串里。
 *
 *  行为契约（逐条对应判据）：
 *   · **原生优先**：开＝`showModal()`（焦点锁、`Esc`、背景 `inert`、顶层都是浏览器给的）；
 *     没有 `showModal` 的老引擎退回 `open` 属性（非模态，但内容照常可读）。
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click`／一枚 `change`；`close`／`cancel` 走**捕获相位**
 *     （这两个事件不冒泡）。重复注入靠根上的 `data-ilife-drawer-runtime` 拦住。
 *   · **勾一个数一个**：计数 `<b>`、完成键上的字（按 `data-ilife-drawer-template` 里的 `{n}` 换）、
 *     完成键的可用档、脚条两句脚注的显隐——**一次全部重画**（只改一处会留下互相矛盾的读数）。
 *   · **一个都没勾＝完成键按不动**，并且脚条上写着为什么（`hidden` 切的是标记里现成那句）。
 *   · **关的四条路**：完成键（`done`）／关闭键与遮罩（`dismiss`）／`Esc`（`esc`）／脚本（`programmatic`）；
 *     关闭后焦点必须回到**按它的那颗按钮**。
 */
import {
  DRAWER_ATTR, DRAWER_BOUND_ATTR, DRAWER_CLOSE_ATTR, DRAWER_COUNT_ATTR, DRAWER_DONE_ATTR, DRAWER_EVENT_CHANGE,
  DRAWER_EVENT_CLOSE, DRAWER_EVENT_DONE, DRAWER_NOTE_ATTR, DRAWER_OPEN_ATTR, DRAWER_OPT_ATTR,
  DRAWER_TEMPLATE_ATTR, DRAWER_ZERO_ATTR,
} from './attrs.js';
import { DRAWER_COUNT_SLOT } from './model.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildDrawerSheetJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var ATTR=' + q(DRAWER_ATTR) + ', OPEN=' + q(DRAWER_OPEN_ATTR) + ', OPT=' + q(DRAWER_OPT_ATTR) + ';' + '\n'
    + '  var DONE=' + q(DRAWER_DONE_ATTR) + ', CLOSEK=' + q(DRAWER_CLOSE_ATTR) + ', CNT=' + q(DRAWER_COUNT_ATTR) + ';' + '\n'
    + '  var TPL=' + q(DRAWER_TEMPLATE_ATTR) + ', NOTE=' + q(DRAWER_NOTE_ATTR) + ', ZERO=' + q(DRAWER_ZERO_ATTR) + ';' + '\n'
    + '  var BOUND=' + q(DRAWER_BOUND_ATTR) + ', SLOT=' + q(DRAWER_COUNT_SLOT) + ';' + '\n'
    + '  var EV_CHANGE=' + q(DRAWER_EVENT_CHANGE) + ', EV_DONE=' + q(DRAWER_EVENT_DONE) + ', EV_CLOSE=' + q(DRAWER_EVENT_CLOSE) + ';' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-drawer-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-drawer-runtime","1");' + '\n'
    + '  var lastReason="programmatic", lastTrigger=null;' + '\n'
    + '  function fire(el,name,detail){ el.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail})); }' + '\n'
    + '  function panelOf(el){ return (el && el.closest) ? el.closest("dialog["+ATTR+"]") : null; }' + '\n'
    + '  function boxes(panel){ return panel.querySelectorAll("["+OPT+"] input[type=checkbox]"); }' + '\n'
    + '  function valueOf(box){ var row=box.closest("["+OPT+"]"); return row?row.getAttribute(OPT):null; }' + '\n'
    + '  function picked(panel){' + '\n'
    + '    var all=boxes(panel), out=[];' + '\n'
    + '    for (var i=0;i<all.length;i+=1){ if (all[i].checked && !all[i].disabled) out.push(valueOf(all[i])); }' + '\n'
    + '    return out;' + '\n'
    + '  }' + '\n'
    /* 一次全部重画：数、键上的字、键的可用档、两句脚注的显隐。 */
    + '  function paint(panel){' + '\n'
    + '    var n=picked(panel).length;' + '\n'
    + '    var b=panel.querySelector("["+CNT+"]"); if (b) b.textContent=String(n);' + '\n'
    + '    var done=panel.querySelector("["+DONE+"]");' + '\n'
    + '    if (done){' + '\n'
    + '      var tpl=done.getAttribute(TPL);' + '\n'
    + '      if (tpl) done.textContent=tpl.split(SLOT).join(String(n));' + '\n'
    + '      if (n===0){ done.setAttribute("disabled",""); done.setAttribute("aria-disabled","true"); }' + '\n'
    + '      else { done.removeAttribute("disabled"); done.removeAttribute("aria-disabled"); }' + '\n'
    + '    }' + '\n'
    + '    var note=panel.querySelector("["+NOTE+"]"); if (note) note.hidden=(n===0);' + '\n'
    + '    var zero=panel.querySelector("["+ZERO+"]"); if (zero) zero.hidden=(n!==0);' + '\n'
    + '    return n;' + '\n'
    + '  }' + '\n'
    + '  function openPanel(id,trigger){' + '\n'
    + '    var dlg=doc.getElementById(id);' + '\n'
    + '    if (!dlg || !dlg.hasAttribute(ATTR)) return;' + '\n'
    + '    if (typeof dlg.showModal==="function"){' + '\n'
    + '      if (dlg.open){ try{ dlg.close(); }catch(e){} }' + '\n'
    + '      try{ dlg.showModal(); }catch(e){ dlg.setAttribute("open",""); }' + '\n'
    + '    } else { dlg.setAttribute("open",""); }' + '\n'
    + '    lastTrigger=trigger||null;' + '\n'
    + '    paint(dlg);' + '\n'
    + '    fire(dlg,"ilife:drawer-open",{id:id,picked:picked(dlg)});' + '\n'
    + '  }' + '\n'
    + '  function closePanel(dlg,reason){ lastReason=reason;'
    + ' try{ dlg.close(); }catch(e){ dlg.removeAttribute("open"); } }' + '\n'
    + '  function outside(box,x,y){ return x<box.left || x>box.right || y<box.top || y>box.bottom; }' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var t=e.target; if (!t || !t.closest) return;' + '\n'
    + '    var opener=t.closest("["+OPEN+"]");' + '\n'
    + '    if (opener){ e.preventDefault(); openPanel(opener.getAttribute(OPEN),opener); return; }' + '\n'
    + '    var panel=panelOf(t); if (!panel) return;' + '\n'
    + '    if (t.closest("["+CLOSEK+"]")){ e.preventDefault(); closePanel(panel,"dismiss"); return; }' + '\n'
    + '    var done=t.closest("["+DONE+"]");' + '\n'
    + '    if (done && !done.disabled){' + '\n'
    + '      e.preventDefault();' + '\n'
    + '      var values=picked(panel);' + '\n'
    + '      fire(panel,EV_DONE,{id:panel.getAttribute(ATTR),values:values});' + '\n'
    + '      closePanel(panel,"done"); return;' + '\n'
    + '    }' + '\n'
    + '    if (t.hasAttribute(ATTR)){ var b=t.getBoundingClientRect();'
    + ' if (outside(b,e.clientX,e.clientY)) closePanel(t,"dismiss"); }' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("change", function(e){' + '\n'
    + '    var box=e.target; if (!box || box.type!=="checkbox") return;' + '\n'
    + '    var panel=panelOf(box); if (!panel) return;' + '\n'
    + '    var n=paint(panel);' + '\n'
    + '    fire(panel,EV_CHANGE,{id:panel.getAttribute(ATTR),values:picked(panel),count:n});' + '\n'
    + '  });' + '\n'
    /* `cancel`（Esc）与 `close` 都不冒泡 ⇒ 捕获相位，免得逐个面板挂监听。 */
    + '  doc.addEventListener("cancel", function(e){ var d=e.target;'
    + ' if (d && d.hasAttribute && d.hasAttribute(ATTR)) lastReason="esc"; }, true);' + '\n'
    + '  doc.addEventListener("close", function(e){' + '\n'
    + '    var d=e.target;' + '\n'
    + '    if (!d || !d.hasAttribute || !d.hasAttribute(ATTR)) return;' + '\n'
    + '    var reason=lastReason; lastReason="programmatic";' + '\n'
    + '    var t=lastTrigger; lastTrigger=null;' + '\n'
    + '    if (t && t.isConnected && doc.activeElement!==t){ try{ t.focus(); }catch(e2){} }' + '\n'
    + '    fire(d,EV_CLOSE,{id:d.getAttribute(ATTR),reason:reason,values:picked(d)});' + '\n'
    + '  }, true);' + '\n'
    + '  var all=doc.querySelectorAll("dialog["+ATTR+"]");' + '\n'
    + '  for (var i=0;i<all.length;i+=1){ all[i].setAttribute(BOUND,"1"); paint(all[i]); }' + '\n'
    + '}());';
}
