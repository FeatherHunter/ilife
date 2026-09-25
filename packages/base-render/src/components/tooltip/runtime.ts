/** tooltip · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  分工与同族其余件一致：模块代码零 DOM，DOM 只在产出的字符串里。
 *
 *  行为契约（逐条对应判据）：
 *   · **点那个词＝恒开，不参与开合**：带 `popovertarget` 的触发键，浏览器会在 `click` **之后**再开合一次
 *     （实测时序 `pointerover → toggle(开) → pointerdown → focusin → pointerup → mouseup → click → toggle(关)`）
 *     ⇒ 悬停刚开好的气泡被紧接的那一点**关掉**。本段在 `click` 上 `preventDefault()` 拦掉那次原生开合，
 *     再自己 `show()`：**点一下只会开，永不会关**。
 *     （`popovertarget` 属性留着：**运行时不在场时**它仍是白送的点击通路——脚本坏了也点得开。）
 *   · **三条通路都只开不关**：点击／**聚焦**（键盘增强）／**悬停**（细指针设备）——触摸没有悬停那一口，
 *     照样由 `click` 那一步打开。
 *   · **关只有两条**：**点别处**（`popover=auto` 的浏览器点外关，本段不拦）与**指针／焦点离开**后的延时收。
 *   · **悬停不留残留**：`pointerout` 之后延一小会儿再收，指针落回词上或气泡上就撤掉这次收
 *     （气泡本身也可以正常读、可以滚）；`focusout` 同理。
 *   · **降级定位**：引擎不支持锚定 API 时（与 CSS 的 `@supports` 读**同一份能力查询串**），
 *     打开时按词的位置算 `top`（贴不下就翻到词上方）；横轴与宽度归 CSS（宽气泡夹在容器里）。
 *   · **不许抢焦点**：悬停打开**不移动焦点**（焦点是键盘用户的东西）；`Esc` 关掉后焦点原地不动。
 */
import {
  TOOLTIP_ANCHOR_QUERY, TOOLTIP_ATTR, TOOLTIP_BOUND_ATTR, TOOLTIP_BUBBLE_ATTR, TOOLTIP_OFFSET_PX,
  TOOLTIP_WORD_ATTR,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildTooltipJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var ATTR=' + q(TOOLTIP_ATTR) + ', WORD=' + q(TOOLTIP_WORD_ATTR) + ', BUBBLE=' + q(TOOLTIP_BUBBLE_ATTR) + ';' + '\n'
    + '  var BOUND=' + q(TOOLTIP_BOUND_ATTR) + ', AQ=' + q(TOOLTIP_ANCHOR_QUERY) + ';' + '\n'
    + '  var OFF=' + q(String(TOOLTIP_OFFSET_PX)) + ';' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-tooltip-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-tooltip-runtime","1");' + '\n'
    + '  var canAnchor=!!(window.CSS && CSS.supports && CSS.supports(AQ));' + '\n'
    + '  var timers=[], pending=[];' + '\n'
    + '  function boxOf(el){ return (el && el.closest) ? el.closest("["+ATTR+"]") : null; }' + '\n'
    + '  function isOpen(b){ try{ return b.matches(":popover-open"); }catch(e){ return false; } }' + '\n'
    + '  function place(bubble){' + '\n'
    + '    var w=boxOf(bubble); if (!w) return;' + '\n'
    + '    var word=w.querySelector("["+WORD+"]"); if (!word) return;' + '\n'
    + '    var r=word.getBoundingClientRect(), h=bubble.offsetHeight;' + '\n'
    + '    var vh=doc.documentElement.clientHeight;' + '\n'
    + '    var top=r.bottom+8;' + '\n'
    + '    if (top+h > vh-8) top=Math.max(8, r.top-h-8);' + '\n'
    + '    bubble.style.top=top+"px"; bubble.style.bottom="auto";' + '\n'
    + '  }' + '\n'
    + '  function cancelHide(bubble){' + '\n'
    + '    var i=pending.indexOf(bubble); if (i<0) return;' + '\n'
    + '    clearTimeout(timers[i]); pending.splice(i,1); timers.splice(i,1);' + '\n'
    + '  }' + '\n'
    + '  function show(bubble){' + '\n'
    + '    if (!bubble) return;' + '\n'
    + '    cancelHide(bubble);' + '\n'
    + '    if (isOpen(bubble)) return;' + '\n'
    + '    if (typeof bubble.showPopover!=="function") return;' + '\n'
    + '    try{ bubble.showPopover(); }catch(e){ return; }' + '\n'
    + '    if (!canAnchor) place(bubble);' + '\n'
    + '  }' + '\n'
    + '  function hide(bubble){' + '\n'
    + '    if (!bubble || !isOpen(bubble)) return;' + '\n'
    + '    if (typeof bubble.hidePopover!=="function") return;' + '\n'
    + '    try{ bubble.hidePopover(); }catch(e){}' + '\n'
    + '    if (bubble.style.top){ bubble.style.top=""; }' + '\n'
    + '  }' + '\n'
    + '  function hideLater(bubble){' + '\n'
    + '    var i=pending.indexOf(bubble); if (i>=0) return;' + '\n'
    + '    pending.push(bubble);' + '\n'
    + '    timers.push(setTimeout(function(){' + '\n'
    + '      var j=pending.indexOf(bubble); if (j>=0){ pending.splice(j,1); timers.splice(j,1); }' + '\n'
    + '      hide(bubble);' + '\n'
    + '    }, 140));' + '\n'
    + '  }' + '\n'
    + '  doc.addEventListener("pointerover", function(e){' + '\n'
    + '    var w=boxOf(e.target); if (!w){ return; }' + '\n'
    + '    show(w.querySelector("["+BUBBLE+"]"));' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("pointerout", function(e){' + '\n'
    + '    var w=boxOf(e.target); if (!w) return;' + '\n'
    + '    if (e.relatedTarget && w.contains(e.relatedTarget)) return;' + '\n'
    + '    hideLater(w.querySelector("["+BUBBLE+"]"));' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("focusin", function(e){' + '\n'
    + '    var w=boxOf(e.target); if (!w) return;' + '\n'
    + '    show(w.querySelector("["+BUBBLE+"]"));' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("focusout", function(e){' + '\n'
    + '    var w=boxOf(e.target); if (!w) return;' + '\n'
    + '    if (e.relatedTarget && w.contains(e.relatedTarget)) return;' + '\n'
    + '    hideLater(w.querySelector("["+BUBBLE+"]"));' + '\n'
    + '  });' + '\n'
    /* 点那个词：**恒开，不参与开合**。`preventDefault()` 拦掉浏览器对 `popovertarget` 触发键的那次开合
       （它在 `click` 之后跑，正是「悬停开好了、一按又关掉」的成因），随后自己 `show()`——
       关只留给「点别处」（浏览器点外关）与指针／焦点离开后的延时收。 */
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var t=e.target; if (!t || !t.closest) return;' + '\n'
    + '    var word=t.closest("["+WORD+"]"); if (!word) return;' + '\n'
    + '    var w=boxOf(word); if (!w) return;' + '\n'
    + '    var b=w.querySelector("["+BUBBLE+"]"); if (!b) return;' + '\n'
    + '    if (e.cancelable) e.preventDefault();' + '\n'
    + '    show(b);' + '\n'
    + '  });' + '\n'
    + '  var all=doc.querySelectorAll("["+WORD+"]");' + '\n'
    + '  for (var i=0;i<all.length;i+=1) all[i].setAttribute(BOUND,"1");' + '\n'
    + '}());';
}
