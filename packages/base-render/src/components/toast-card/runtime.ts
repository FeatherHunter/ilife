/** toast-card · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editable-value`／`sync-status`／`controls.buildSharedHelpersJs()` 同一处分工：
 *  模块代码零 DOM，DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click` 委派；装过一次就不再装（`documentElement` 上的记号）。
 *   · **计时**：每条提示按自己的 `data-ilife-toast-card-duration` 起表（缺省 4 秒，最长 5 秒），
 *     到点**真删**（不是留在那儿当隐形壳）。`prefers-reduced-motion: reduce` 下立即删（不做离场动效）。
 *   · **拖住计时**：指针停在这条上、或键盘焦点落在里面 ⇒ 停表（`TOAST_CARD_PAUSED_ATTR`）；
 *     移开／焦点离开后**重新计满**——WCAG 2.2.1：自动消失的内容要能被用户拖住再读一遍。
 *   · **最多堆 3 条**：堆栈容量 `data-ilife-toast-card-max`（缺省 3，只认 ≤ 3）；第 N+1 条来时
 *     挤掉**最旧的一条**。
 *   · **动作**：动作键按一下 → 派发 `TOAST_CARD_EVENT_ACTION`
 *     （`detail = { action, tone }`，冒泡），然后这条提示自己走（动作是这条路唯一的下一步）。
 *   · **关闭**：关闭键按一下 → 这条提示立刻走。
 *   · **无脚本降级**：这段不跑时提示照常可读（标记里已经有语气字、标题、细节与两枚原生按钮），
 *     只是不会自己走、也挤不掉最旧的。
 *   · **只动 class／属性／删节点**：不改版面尺寸（离场只换透明度与 4px 位移）。
 */
import {
  TOAST_CARD_ACTION_ATTR,
  TOAST_CARD_BOUND_ATTR,
  TOAST_CARD_CLOSE_ATTR,
  TOAST_CARD_DEFAULT_MS,
  TOAST_CARD_DURATION_ATTR,
  TOAST_CARD_EVENT_ACTION,
  TOAST_CARD_ITEM_ATTR,
  TOAST_CARD_LEAVING_CLASS,
  TOAST_CARD_MAX_ATTR,
  TOAST_CARD_MAX_STACK,
  TOAST_CARD_PAUSED_ATTR,
  TOAST_CARD_RUNTIME_ATTR,
  TOAST_CARD_STACK_ATTR,
  TOAST_CARD_TONE_ATTR,
} from './attrs.js';

/** 离场动效的时长（毫秒）：到点真删；这一段与样式段里那 160ms 是同一个数。 */
export const TOAST_CARD_FADE_MS = 160;

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildToastCardJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var STACK=' + q(TOAST_CARD_STACK_ATTR) + ', ITEM=' + q(TOAST_CARD_ITEM_ATTR) + ';' + '\n'
    + '  var TONE=' + q(TOAST_CARD_TONE_ATTR) + ', DUR=' + q(TOAST_CARD_DURATION_ATTR) + ';' + '\n'
    + '  var MAXA=' + q(TOAST_CARD_MAX_ATTR) + ', ACTION=' + q(TOAST_CARD_ACTION_ATTR) + ';' + '\n'
    + '  var CLOSE=' + q(TOAST_CARD_CLOSE_ATTR) + ', BOUND=' + q(TOAST_CARD_BOUND_ATTR) + ';' + '\n'
    + '  var PAUSED=' + q(TOAST_CARD_PAUSED_ATTR) + ', RUNTIME=' + q(TOAST_CARD_RUNTIME_ATTR) + ';' + '\n'
    + '  var EV=' + q(TOAST_CARD_EVENT_ACTION) + ', LEAVING=' + q(TOAST_CARD_LEAVING_CLASS) + ';' + '\n'
    + '  var DEF_MS=' + String(TOAST_CARD_DEFAULT_MS) + ', DEF_MAX=' + String(TOAST_CARD_MAX_STACK)
    + ', FADE_MS=' + String(TOAST_CARD_FADE_MS) + ';' + '\n'
    + '  var doc=document, root=doc.documentElement;' + '\n'
    + '  if (root.getAttribute(RUNTIME)==="1") return;' + '\n'
    + '  root.setAttribute(RUNTIME,"1");' + '\n'
    + '  function intOf(v, fb){ var n=parseInt(v,10); return isFinite(n)&&n>0?n:fb; }' + '\n'
    + '  function reduce(){ try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch(e){ return false; } }' + '\n'
    + '  function boxOf(el){ var box=el.closest?el.closest("["+STACK+"]"):null; return box || el.parentNode; }' + '\n'
    + '  function itemsOf(box){ return box&&box.querySelectorAll?[].slice.call(box.querySelectorAll("["+ITEM+"]")):[]; }' + '\n'
    + '  function maxOf(box){ var m=box&&box.getAttribute?intOf(box.getAttribute(MAXA),DEF_MAX):DEF_MAX; return m>DEF_MAX?DEF_MAX:m; }' + '\n'
    /* 停表 / 起表：停表只清计时器并留记号；起表一律**重新计满**（读第二遍要的是完整时间）。 */
    + '  function pause(el){' + '\n'
    + '    if (el.__ilifeToastTimer){ clearTimeout(el.__ilifeToastTimer); el.__ilifeToastTimer=null; el.setAttribute(PAUSED,"1"); }' + '\n'
    + '  }' + '\n'
    + '  function arm(el){' + '\n'
    + '    if (!el || el.getAttribute(BOUND)==="gone") return;' + '\n'
    + '    el.setAttribute(BOUND,"1"); el.removeAttribute(PAUSED);' + '\n'
    + '    if (el.__ilifeToastTimer) clearTimeout(el.__ilifeToastTimer);' + '\n'
    + '    el.__ilifeToastTimer=setTimeout(function(){ leave(el); }, intOf(el.getAttribute(DUR),DEF_MS));' + '\n'
    + '  }' + '\n'
    + '  function bind(el){ if (!el.getAttribute(BOUND)) arm(el); }' + '\n'
    /* 离场：先记号（防重复），再删；reduce 档不做动效（没有东西会卡在半路）。 */
    + '  function leave(el){' + '\n'
    + '    if (!el || el.getAttribute(BOUND)==="gone") return;' + '\n'
    + '    el.setAttribute(BOUND,"gone");' + '\n'
    + '    if (el.__ilifeToastTimer){ clearTimeout(el.__ilifeToastTimer); el.__ilifeToastTimer=null; }' + '\n'
    + '    el.className=String(el.className||"")+" "+LEAVING;' + '\n'
    + '    var drop=function(){ if (el.parentNode) el.parentNode.removeChild(el); };' + '\n'
    + '    if (reduce()){ drop(); return; }' + '\n'
    + '    el.__ilifeToastGone=setTimeout(drop, FADE_MS);' + '\n'
    + '  }' + '\n'
    /* 容量：数的是「这一格里还没走的」；挤掉的一定是最旧的那条（DOM 顺序即先后）。 */
    + '  function enforce(box){' + '\n'
    + '    var list=itemsOf(box), max=maxOf(box);' + '\n'
    + '    while (list.length>max){ leave(list.shift()); }' + '\n'
    + '  }' + '\n'
    + '  function take(node){' + '\n'
    + '    if (!node||node.nodeType!==1||!node.getAttribute) return;' + '\n'
    + '    var found=[];' + '\n'
    + '    if (node.getAttribute(ITEM)!==null) found.push(node);' + '\n'
    + '    if (node.querySelectorAll) found=found.concat([].slice.call(node.querySelectorAll("["+ITEM+"]")));' + '\n'
    + '    for (var i=0;i<found.length;i+=1) bind(found[i]);' + '\n'
    + '    for (var j=0;j<found.length;j+=1){ if (found[j].parentNode) enforce(boxOf(found[j])); }' + '\n'
    + '  }' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var t=e.target; if (!t||!t.closest) return;' + '\n'
    + '    var act=t.closest("["+ACTION+"]");' + '\n'
    + '    if (act){' + '\n'
    + '      var card=act.closest("["+ITEM+"]"); if (!card) return;' + '\n'
    + '      e.preventDefault();' + '\n'
    + '      try { card.dispatchEvent(new CustomEvent(EV,{bubbles:true,detail:{action:act.getAttribute(ACTION),tone:card.getAttribute(TONE)}})); } catch(err){}' + '\n'
    + '      leave(card); return;' + '\n'
    + '    }' + '\n'
    + '    var close=t.closest("["+CLOSE+"]");' + '\n'
    + '    if (close){ var c=close.closest("["+ITEM+"]"); if (!c) return; e.preventDefault(); leave(c); }' + '\n'
    + '  });' + '\n'
    /* 指针／焦点落在里面 ⇒ 停表；移开 ⇒ 重新计满（这条不是装饰：自动消失的内容必须能被拖住）。 */
    + '  doc.addEventListener("mouseover", function(e){ var t=e.target; if (!t||!t.closest) return; var card=t.closest("["+ITEM+"]"); if (card) pause(card); });' + '\n'
    + '  doc.addEventListener("mouseout", function(e){ var t=e.target; if (!t||!t.closest) return; var card=t.closest("["+ITEM+"]"); if (!card) return;' + '\n'
    + '    var to=e.relatedTarget; if (to && card.contains && card.contains(to)) return; arm(card); });' + '\n'
    + '  doc.addEventListener("focusin", function(e){ var t=e.target; if (!t||!t.closest) return; var card=t.closest("["+ITEM+"]"); if (card) pause(card); });' + '\n'
    + '  doc.addEventListener("focusout", function(e){ var t=e.target; if (!t||!t.closest) return; var card=t.closest("["+ITEM+"]"); if (!card) return;' + '\n'
    + '    var to=e.relatedTarget; if (to && card.contains && card.contains(to)) return; arm(card); });' + '\n'
    /* 后来加进来的每一条也要绑上（页面是一条条 append 的），并顺手守容量。 */
    + '  if (window.MutationObserver){' + '\n'
    + '    var mo=new MutationObserver(function(muts){' + '\n'
    + '      for (var i=0;i<muts.length;i+=1){ var added=muts[i].addedNodes; for (var j=0;j<added.length;j+=1) take(added[j]); }' + '\n'
    + '    });' + '\n'
    + '    mo.observe(root,{childList:true,subtree:true});' + '\n'
    + '  }' + '\n'
    + '  var all=doc.querySelectorAll("["+ITEM+"]");' + '\n'
    + '  for (var k=0;k<all.length;k+=1) bind(all[k]);' + '\n'
    + '  var boxes=doc.querySelectorAll("["+STACK+"]");' + '\n'
    + '  for (var m=0;m<boxes.length;m+=1) enforce(boxes[m]);' + '\n'
    + '}());';
}
