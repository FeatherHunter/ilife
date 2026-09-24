/** popover-menu · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  分工与同族其余件一致：模块代码零 DOM，DOM 只在产出的字符串里。
 *
 *  行为契约（逐条对应判据）：
 *   · **开／关不靠脚本**：触发键带 `popovertarget`，`Esc`／点外面关都是浏览器的默认行为——
 *     本段不拦、不改、不 preventDefault（脚本坏了菜单照样开得出来）。
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click`／一枚 `keydown`；`toggle` 走**捕获相位**
 *     （它不冒泡）。重复注入靠根上的 `data-ilife-popover-menu-runtime` 拦住。
 *   · **展开态同步**：开着时触发键 `aria-expanded="true"`（样式与屏读器都读它）。
 *   · **键盘走位**：`↑`／`↓`／`Home`／`End` 在项之间搬焦点（`Tab` 不拦：菜单不关，浏览器自己走）。
 *   · **选中**：点／回车一枚项 → 派发 `ilife:menu-select` ＋ 关面板 ＋ **焦点还给触发键**；
 *     `kind=check` 的那一族里就地翻 `aria-checked`（勾只有一个）。
 *   · **降级定位**：引擎不支持锚定 API 时（与 CSS 的 `@supports` 读**同一份能力查询串**），
 *     打开时按触发键的矩形算 `left`／`top`，贴不下就往上翻、左右夹进容器。
 */
import {
  MENU_ANCHOR_QUERY, MENU_AREA_QUERY, MENU_ATTR, MENU_BOUND_ATTR, MENU_EVENT_SELECT, MENU_EVENT_TOGGLE,
  MENU_GAP_PX, MENU_ITEM_ATTR, MENU_PANEL_ATTR, MENU_TRIGGER_ATTR,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildPopoverMenuJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var ATTR=' + q(MENU_ATTR) + ', TRIG=' + q(MENU_TRIGGER_ATTR) + ', PANEL=' + q(MENU_PANEL_ATTR) + ';' + '\n'
    + '  var ITEM=' + q(MENU_ITEM_ATTR) + ', BOUND=' + q(MENU_BOUND_ATTR) + ', EV=' + q(MENU_EVENT_SELECT) + ';' + '\n'
    + '  var EVT=' + q(MENU_EVENT_TOGGLE) + ';' + '\n'
    + '  var AQ=' + q(MENU_ANCHOR_QUERY) + ', PQ=' + q(MENU_AREA_QUERY) + ', OFF=' + String(MENU_GAP_PX * 2) + ';' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-popover-menu-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-popover-menu-runtime","1");' + '\n'
    + '  var canAnchor=!!(window.CSS && CSS.supports && CSS.supports(AQ) && CSS.supports(PQ));' + '\n'
    + '  function fire(el,name,detail){ el.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail})); }' + '\n'
    + '  function isPanel(el){ return !!(el && el.hasAttribute && el.hasAttribute(PANEL)); }' + '\n'
    /* 面板的发现锚是 **`data-ilife-menu-panel`**（`data-ilife-popover-menu` 在**容器**上）——
       两枚锚各管一头：容器认「这是一套菜单」，面板认「这是一块弹出面」。 */
    + '  function panelOf(el){ return (el && el.closest) ? el.closest("["+PANEL+"]") : null; }' + '\n'
    + '  function itemsOf(panel){ return panel.querySelectorAll("["+ITEM+"]"); }' + '\n'
    + '  function triggerOf(panel){ var w=panel.parentNode;'
    + ' return (w && w.querySelector) ? w.querySelector("["+TRIG+"]") : null; }' + '\n'
    /* 降级定位：只在引擎不支持锚定 API 时用（CSS 那边同样在 @supports 之外 ⇒ 两边一致）。 */
    + '  function place(panel){' + '\n'
    + '    var t=triggerOf(panel); if (!t) return;' + '\n'
    + '    var r=t.getBoundingClientRect(), w=panel.offsetWidth, h=panel.offsetHeight;' + '\n'
    + '    var vw=doc.documentElement.clientWidth, vh=doc.documentElement.clientHeight;' + '\n'
    + '    var align=panel.getAttribute(PANEL)||"end";' + '\n'
    + '    var left=(align==="end") ? (r.right-w) : r.left;' + '\n'
    + '    left=Math.max(8, Math.min(left, vw-w-8));' + '\n'
    + '    var top=r.bottom+8;' + '\n'
    + '    if (top+h > vh-8) top=Math.max(8, r.top-h-8);' + '\n'
    + '    panel.style.left=left+"px"; panel.style.top=top+"px";' + '\n'
    + '    panel.style.right="auto"; panel.style.bottom="auto";' + '\n'
    + '  }' + '\n'
    + '  function onOpen(panel){' + '\n'
    + '    var t=triggerOf(panel); if (t) t.setAttribute("aria-expanded","true");' + '\n'
    + '    if (!canAnchor) place(panel);' + '\n'
    + '    var items=itemsOf(panel);' + '\n'
    + '    if (items.length>0){ try{ items[0].focus(); }catch(e){} }' + '\n'
    + '    fire(panel,EVT,{id:panel.id,phase:"open"});' + '\n'
    + '  }' + '\n'
    + '  function onClose(panel){' + '\n'
    + '    var t=triggerOf(panel); if (t) t.setAttribute("aria-expanded","false");' + '\n'
    + '    if (panel.style.left){ panel.style.left=""; panel.style.top=""; }' + '\n'
    + '    if (t && t.isConnected && (doc.activeElement===panel || panel.contains(doc.activeElement))){' + '\n'
    + '      try{ t.focus(); }catch(e){}' + '\n'
    + '    }' + '\n'
    + '    fire(panel,EVT,{id:panel.id,phase:"close"});' + '\n'
    + '  }' + '\n'
    + '  doc.addEventListener("toggle", function(e){' + '\n'
    + '    var panel=e.target;' + '\n'
    + '    if (!isPanel(panel)) return;' + '\n'
    + '    if (e.newState==="open") onOpen(panel); else onClose(panel);' + '\n'
    + '  }, true);' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var t=e.target; if (!t || !t.closest) return;' + '\n'
    + '    var item=t.closest("["+ITEM+"]"); if (!item) return;' + '\n'
    + '    var panel=panelOf(item); if (!panel) return;' + '\n'
    + '    if (item.disabled) return;' + '\n'
    + '    if (item.getAttribute("role")==="menuitemradio"){' + '\n'
    + '      var all=itemsOf(panel);' + '\n'
    + '      for (var i=0;i<all.length;i+=1) if (all[i].getAttribute("role")==="menuitemradio"){'
    + ' all[i].setAttribute("aria-checked", all[i]===item ? "true" : "false"); }' + '\n'
    + '    }' + '\n'
    + '    var detail={id:panel.id,value:item.getAttribute(ITEM),'
    + 'label:item.textContent,checked:item.getAttribute("aria-checked")==="true"};' + '\n'
    + '    var trig=triggerOf(panel);' + '\n'
    + '    if (typeof panel.hidePopover==="function"){ try{ panel.hidePopover(); }catch(e2){} }' + '\n'
    + '    if (trig && trig.isConnected){ try{ trig.focus(); }catch(e3){} }' + '\n'
    + '    fire(panel,EV,detail);' + '\n'
    + '  });' + '\n'
    /* 键盘走位：只在面板里的项之间搬焦点（开／关与 Esc 都是原生行为，这里一概不拦）。 */
    + '  doc.addEventListener("keydown", function(e){' + '\n'
    + '    var t=e.target; if (!t || !t.closest) return;' + '\n'
    + '    var item=t.closest("["+ITEM+"]"); if (!item) return;' + '\n'
    + '    var panel=item.closest("["+ATTR+"]"); if (!panel) return;' + '\n'
    + '    var all=itemsOf(panel), at=-1, i;' + '\n'
    + '    for (i=0;i<all.length;i+=1) if (all[i]===item) at=i;' + '\n'
    + '    var want=-1;' + '\n'
    + '    if (e.key==="ArrowDown") want=(at+1)%all.length;' + '\n'
    + '    else if (e.key==="ArrowUp") want=(at-1+all.length)%all.length;' + '\n'
    + '    else if (e.key==="Home") want=0;' + '\n'
    + '    else if (e.key==="End") want=all.length-1;' + '\n'
    + '    else return;' + '\n'
    + '    e.preventDefault();' + '\n'
    + '    if (all[want]) all[want].focus();' + '\n'
    + '  });' + '\n'
    + '  var all=doc.querySelectorAll("["+TRIG+"]");' + '\n'
    + '  for (var j=0;j<all.length;j+=1) all[j].setAttribute(BOUND,"1");' + '\n'
    + '}());';
}
