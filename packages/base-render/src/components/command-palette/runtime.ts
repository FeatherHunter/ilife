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

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进自己的脚本槽）。 */
export function buildCommandPaletteJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const T = COMMAND_PALETTE_TEXT;
  return '(function(){' + '\n'
    /* ── 常量（全部来自 `attrs.ts`：渲染与运行时读的是同一份事实） ────────────── */
    + '  var A_ROOT=' + q(COMMAND_PALETTE_ATTR) + ', A_OPEN=' + q(COMMAND_PALETTE_OPEN_ATTR)
    + ', A_PANEL=' + q(COMMAND_PALETTE_PANEL_ATTR) + ';' + '\n'
    + '  var A_Q=' + q(COMMAND_PALETTE_QUERY_ATTR) + ', A_ITEM=' + q(COMMAND_PALETTE_ITEM_ATTR)
    + ', A_KIND=' + q(COMMAND_PALETTE_KIND_ATTR) + ', A_SEARCH=' + q(COMMAND_PALETTE_SEARCH_ATTR) + ';' + '\n'
    + '  var A_LB=' + q(COMMAND_PALETTE_LABEL_ATTR) + ', A_GRP=' + q(COMMAND_PALETTE_GROUP_ATTR)
    + ', A_EMPTY=' + q(COMMAND_PALETTE_EMPTY_ATTR) + ', C_HIT=' + q(commandPaletteSlot('hit')) + ';' + '\n'
    + '  var A_FOOT=' + q(COMMAND_PALETTE_FOOT_ATTR) + ', A_HIT=' + q(COMMAND_PALETTE_HIT_ATTR)
    + ', A_BOUND=' + q(COMMAND_PALETTE_BOUND_ATTR) + ';' + '\n'
    + '  var A_LOAD=' + q(COMMAND_PALETTE_LOADING_ATTR) + ', A_RT=' + q(COMMAND_PALETTE_RUNTIME_ATTR) + ';' + '\n'
    + '  var EV_RUN=' + q(COMMAND_PALETTE_EVENT_RUN) + ', EV_Q=' + q(COMMAND_PALETTE_EVENT_QUERY) + ';' + '\n'
    + '  var HOVER=' + q(COMMAND_PALETTE_HOVER_QUERY) + ';' + '\n'
    + '  var T={idle:' + q(T.footIdle) + ', hitPre:' + q(T.footHitPre) + ', hitPost:' + q(T.footHitPost)
    + ', none:' + q(T.footNone) + ', busy:' + q(T.footBusy) + ', emptyPre:' + q(T.emptyPre)
    + ', emptyPost:' + q(T.emptyPost) + '};' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute(A_RT)==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute(A_RT,"1");' + '\n'
    /* ── 定位小件 ─────────────────────────────────────────────────────────── */
    + '  function fire(el,name,detail){ el.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail})); }\n'
    + '  function panelOf(el){ return (el && el.closest) ? el.closest("["+A_PANEL+"]") : null; }\n'
    + '  function panelById(id){ var all=doc.querySelectorAll("["+A_PANEL+"]");\n'
    + '    for (var i=0;i<all.length;i+=1) if (all[i].getAttribute(A_PANEL)===id) return all[i];\n'
    + '    return null; }\n'
    + '  function openerOf(id){ var all=doc.querySelectorAll("["+A_OPEN+"]");\n'
    + '    for (var i=0;i<all.length;i+=1) if (all[i].getAttribute(A_OPEN)===id) return all[i];\n'
    + '    return null; }\n'
    + '  function one(panel,attr){ return panel.querySelector("["+attr+"]"); }\n'
    + '  function rowsOf(panel){ return panel.querySelectorAll("["+A_ITEM+"]"); }\n'
    + '  function groupsOf(panel){ return panel.querySelectorAll("["+A_GRP+"]"); }\n'
    + '  function trim(s){ return String(s===undefined||s===null?"":s).replace(/^[\\s\\u3000]+|[\\s\\u3000]+$/g,""); }\n'
    + '  function hide(panel){ if (typeof panel.hidePopover==="function"){ try{ panel.hidePopover(); }catch(e){} } }\n'
    + '  /* 焦点只在真有指针（悬停能成立）的机器上抢；手机上让手点，别弹软键盘把列表压掉一半。 */\n'
    + '  function fine(){ try{ return !!(window.matchMedia && window.matchMedia(HOVER).matches); }catch(e){ return false; } }\n'
    /* ── 命中词重画（只在这一格上，用 DOM 节点拼，不碰 innerHTML） ───────────── */
    + '  function paint(row,term){\n'
    + '    var cell=row.querySelector("["+A_LB+"]");\n'
    + '    if (!cell) return;\n'
    + '    var text=cell.textContent||"";\n'
    + '    while (cell.firstChild) cell.removeChild(cell.firstChild);\n'
    + '    if (term===""){ cell.appendChild(doc.createTextNode(text)); return; }\n'
    + '    var low=text.toLowerCase(), want=term.toLowerCase(), at=low.indexOf(want);\n'
    + '    if (at<0){ cell.appendChild(doc.createTextNode(text)); return; }\n'
    + '    var rest=text;\n'
    + '    while (at>-1){\n'
    + '      if (at>0) cell.appendChild(doc.createTextNode(rest.slice(0,at)));\n'
    + '      var mark=doc.createElement("mark");\n'
    + '      mark.setAttribute("class",C_HIT);\n'
    + '      mark.setAttribute(A_HIT,"1");\n'
    + '      mark.textContent=rest.slice(at,at+want.length);\n'
    + '      cell.appendChild(mark);\n'
    + '      rest=rest.slice(at+want.length); low=low.slice(at+want.length); at=low.indexOf(want);\n'
    + '    }\n'
    + '    if (rest!=="") cell.appendChild(doc.createTextNode(rest));\n'
    + '  }\n'
    /* ── 筛一次（唯一入口）：露几行、露哪几组、脚注与空态各写什么 ─────────────── */
    + '  function run(panel){\n'
    + '    var input=one(panel,A_Q);\n'
    + '    if (!input) return;\n'
    + '    var raw=trim(input.value), term=raw.toLowerCase();\n'
    + '    var rows=rowsOf(panel), i, j, shown=0;\n'
    + '    for (i=0;i<rows.length;i+=1){\n'
    + '      var row=rows[i], hay=String(row.getAttribute(A_SEARCH)||"");\n'
    + '      var on=(term==="" || hay.indexOf(term)>=0);\n'
    + '      if (on){ row.removeAttribute("hidden"); shown+=1; } else { row.setAttribute("hidden",""); }\n'
    + '      paint(row, on ? raw : "");\n'
    + '    }\n'
    + '    var groups=groupsOf(panel);\n'
    + '    for (i=0;i<groups.length;i+=1){\n'
    + '      var kind=groups[i].getAttribute(A_GRP), any=false;\n'
    + '      for (j=0;j<rows.length;j+=1){\n'
    + '        if (rows[j].getAttribute(A_KIND)===kind && !rows[j].hasAttribute("hidden")){ any=true; break; }\n'
    + '      }\n'
    + '      if (any) groups[i].removeAttribute("hidden"); else groups[i].setAttribute("hidden","");\n'
    + '    }\n'
    + '    var empty=one(panel,A_EMPTY);\n'
    + '    if (empty){\n'
    + '      if (term!=="" && shown===0){ empty.textContent=T.emptyPre+raw+T.emptyPost; empty.removeAttribute("hidden"); }\n'
    + '      else { empty.setAttribute("hidden",""); }\n'
    + '    }\n'
    + '    var foot=one(panel,A_FOOT);\n'
    + '    if (foot && panel.getAttribute(A_LOAD)!=="1"){\n'
    + '      foot.textContent = term==="" ? T.idle : (shown===0 ? T.none : (T.hitPre+shown+T.hitPost));\n'
    + '    }\n'
    + '    fire(panel,EV_Q,{id:panel.getAttribute(A_PANEL),query:raw,hits:shown});\n'
    + '  }\n'
    /* ── 委派：输入即筛 ／ 整行可点 ／ 开合同步 ──────────────────────────────── */
    + '  doc.addEventListener("input",function(e){\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.hasAttribute || !t.hasAttribute(A_Q)) return;\n'
    + '    var panel=panelOf(t); if (!panel) return;\n'
    + '    run(panel);\n'
    + '  });\n'
    + '  doc.addEventListener("click",function(e){\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.closest) return;\n'
    + '    var row=t.closest("["+A_ITEM+"]");\n'
    + '    if (!row || row.disabled) return;\n'
    + '    var panel=panelOf(row); if (!panel) return;\n'
    + '    var id=panel.getAttribute(A_PANEL), cell=row.querySelector("["+A_LB+"]");\n'
    + '    var detail={id:id,value:row.getAttribute(A_ITEM),kind:row.getAttribute(A_KIND),'
    + 'label:cell?cell.textContent:""};\n'
    + '    hide(panel);\n'
    + '    var opener=openerOf(id);\n'
    + '    if (opener && opener.isConnected && doc.activeElement!==opener){ try{ opener.focus(); }catch(e2){} }\n'
    + '    fire(panel,EV_RUN,detail);\n'
    + '  });\n'
    /* `toggle` 不冒泡 ⇒ 走捕获相位（与 `popover-menu` 同一处手法）。 */
    + '  doc.addEventListener("toggle",function(e){\n'
    + '    var panel=e.target;\n'
    + '    if (!panel || !panel.hasAttribute || !panel.hasAttribute(A_PANEL)) return;\n'
    + '    var open=(e.newState==="open"), id=panel.getAttribute(A_PANEL), opener=openerOf(id);\n'
    + '    if (opener) opener.setAttribute("aria-expanded", open ? "true" : "false");\n'
    + '    if (!open) return;\n'
    + '    run(panel);\n'
    + '    if (!fine()) return;\n'
    + '    var input=one(panel,A_Q);\n'
    + '    if (input){ try{ input.focus(); }catch(e3){} }\n'
    + '  },true);\n'
    /* ── 首次挂载：把渲染期那一份状态按同一个口径再算一遍（幂等） ────────────── */
    + '  var roots=doc.querySelectorAll("["+A_ROOT+"]");\n'
    + '  for (var k=0;k<roots.length;k+=1){\n'
    + '    var openers=roots[k].querySelectorAll("["+A_OPEN+"]");\n'
    + '    for (var m=0;m<openers.length;m+=1) openers[m].setAttribute(A_BOUND,"1");\n'
    + '    var panel=roots[k].querySelector("["+A_PANEL+"]");\n'
    + '    var found=panel===null ? panelById(roots[k].getAttribute(A_ROOT)) : panel;\n'
    + '    if (found) run(found);\n'
    + '  }\n'
    + '}());';
}
