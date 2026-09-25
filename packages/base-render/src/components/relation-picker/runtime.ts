/** relation-picker · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  行为契约（逐条对应判据）：
 *   · **开与关不靠脚本**（`overlay`）：触发键带 `popovertarget`、浮面是原生 `popover` ⇒
 *     这一段一行都没跑到，浮面照样开、照样关（点浮面外那一下也是浏览器给的）；
 *     `inline` 下行内那块的摊开／收起只改那一块自己的 `hidden`（渲染时的样子就是可用的样子）。
 *   · **贴触发键**：引擎不支持锚定 API 时（与样式段的 `@supports` 读**同一份能力查询串**），
 *     打开时按触发键的矩形算 `left`／`top`——贴它下沿、左右夹进视口，下面装不下就翻到它上方。
 *   · **输入即筛**：`document` 上一枚委派的 `input`；一行露不露**只改那一行自己的 `hidden`**
 *     （不重排 DOM、不重建节点——重排会把输入法打断）；一组的行全不露时，那一组的标题也跟着收起来；
 *     最近一排里被筛掉的那一枚同样收起（整排不剩一枚时，那一条带子自己也收起来）；
 *     新建键的值与字都按当前词重写。
 *   · **命中词重画在同一个格子里**：名字那一格按当前词重画，用 `createElement('mark')` ＋
 *     `textContent` 拼（**不碰 innerHTML**：用户打的词永远进不了标签）。
 *   · **真读数**：脚注与空态那两句按「露着几项」现算（不是文案），并派发
 *     `ilife:relation-picker-query`（`detail.hits`＝现在露着的项数）。**这一段数的与渲染期数的
 *     是同一份源码**（`HITS`／`FOOT` 两个字面函数原样嵌进来，见 `model.ts` 的 `relationPickerHits()`／
 *     `relationPickerFoot()`）——两处各写一遍那句口径，迟早走散（2026-09 对抗审查：渲染期 2／运行时段 4）。
 *   · **整行可点＝选中**：点一行（或「最近用过」里那一枚 chip——**同一个选项的第三处摆法**）⇒
 *     按机器键把那枚选项的名字与读数读出来（哪一处摆法都读得出同一份事实）⇒ 字段行里读当前值的
 *     那一格原地重写 ⇒ **这个键的每一处摆法**都挂上选中态（`is-on` ＋ `aria-current` ＋ ✓ 记号 ＋
 *     行尾「已选」二字，其余落回「选它」）⇒ `overlay` 下收起浮面并把焦点还给触发键、`inline` 下
 *     收成结果行 ⇒ 派发 `ilife:relation-picker-select`（`detail={id,key,title}`，`title` 非空）。
 *   · **搜不到就地新建**：点新建那枚键 → 派发 `ilife:relation-picker-create`
 *     （`detail={id,value}`，`value`＝当前搜索词；本件不写库）。
 *   · **「换」重新选**：点「换」→ 行内那块重新摊开（`inline` 下）；焦点不抢——一抢就弹软键盘。
 *   · **幂等**：`<html>` 上一枚 `data-ilife-relation-runtime` 拦住重复注入；触发键上记一枚 bound 读数。
 */
import {
  RELATION_PICKER_ANCHOR_QUERY,
  RELATION_PICKER_AREA_QUERY,
  RELATION_PICKER_ATTR,
  RELATION_PICKER_BOUND_ATTR,
  RELATION_PICKER_CHANGE_ATTR,
  RELATION_PICKER_CHOSEN_ATTR,
  RELATION_PICKER_CLEAR_ATTR,
  RELATION_PICKER_CREATE_ATTR,
  RELATION_PICKER_EDGE_PX,
  RELATION_PICKER_EMPTY_ATTR,
  RELATION_PICKER_EVENT_CREATE,
  RELATION_PICKER_EVENT_QUERY,
  RELATION_PICKER_EVENT_SELECT,
  RELATION_PICKER_FOOT_ATTR,
  RELATION_PICKER_GAP_PX,
  RELATION_PICKER_GROUP_ATTR,
  RELATION_PICKER_HIT_ATTR,
  RELATION_PICKER_INLINE_ATTR,
  RELATION_PICKER_ITEM_ATTR,
  RELATION_PICKER_NAME_ATTR,
  RELATION_PICKER_OPEN_ATTR,
  RELATION_PICKER_PANEL_ATTR,
  RELATION_PICKER_QUERY_ATTR,
  RELATION_PICKER_RECENT_ATTR,
  RELATION_PICKER_RUNTIME_ATTR,
  RELATION_PICKER_SEARCH_ATTR,
  RELATION_PICKER_TEXT,
  RELATION_PICKER_VALUE_ATTR,
  relationPickerSlot,
} from './attrs.js';
import { relationPickerFoot, relationPickerHits } from './model.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进自己的脚本槽）。 */
export function buildRelationPickerJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const T = RELATION_PICKER_TEXT;
  return '(function(){' + '\n'
    + '  var A_ROOT=' + q(RELATION_PICKER_ATTR) + ', A_OPEN=' + q(RELATION_PICKER_OPEN_ATTR)
    + ', A_PANEL=' + q(RELATION_PICKER_PANEL_ATTR) + ', A_INLINE=' + q(RELATION_PICKER_INLINE_ATTR) + ';' + '\n'
    + '  var A_Q=' + q(RELATION_PICKER_QUERY_ATTR) + ', A_ITEM=' + q(RELATION_PICKER_ITEM_ATTR)
    + ', A_SEARCH=' + q(RELATION_PICKER_SEARCH_ATTR) + ', A_NAME=' + q(RELATION_PICKER_NAME_ATTR) + ';' + '\n'
    + '  var A_GRP=' + q(RELATION_PICKER_GROUP_ATTR) + ', A_EMPTY=' + q(RELATION_PICKER_EMPTY_ATTR)
    + ', C_HIT=' + q(relationPickerSlot('hit')) + ', C_ROW=' + q(relationPickerSlot('row')) + ';' + '\n'
    + '  var A_FOOT=' + q(RELATION_PICKER_FOOT_ATTR) + ', A_HIT=' + q(RELATION_PICKER_HIT_ATTR)
    + ', A_CREATE=' + q(RELATION_PICKER_CREATE_ATTR) + ', A_CLEAR=' + q(RELATION_PICKER_CLEAR_ATTR) + ';' + '\n'
    + '  var A_VAL=' + q(RELATION_PICKER_VALUE_ATTR) + ', A_RECENT=' + q(RELATION_PICKER_RECENT_ATTR)
    + ', A_CHOSEN=' + q(RELATION_PICKER_CHOSEN_ATTR) + ', A_CHANGE=' + q(RELATION_PICKER_CHANGE_ATTR) + ';' + '\n'
    + '  var A_BOUND=' + q(RELATION_PICKER_BOUND_ATTR) + ', A_RT=' + q(RELATION_PICKER_RUNTIME_ATTR) + ';' + '\n'
    + '  var C_MK=' + q(relationPickerSlot('mk')) + ', C_PICK=' + q(relationPickerSlot('pick'))
    + ', C_READING=' + q(relationPickerSlot('reading')) + ', C_RESULT=' + q(relationPickerSlot('result')) + ';' + '\n'
    + '  var C_QUICK=' + q(relationPickerSlot('quick')) + ', C_CHIP=' + q(relationPickerSlot('chip'))
    + ', C_STATE=' + q(relationPickerSlot('state')) + ', C_VALUE=' + q(relationPickerSlot('value')) + ';' + '\n'
    + '  var EV_SEL=' + q(RELATION_PICKER_EVENT_SELECT) + ', EV_NEW=' + q(RELATION_PICKER_EVENT_CREATE)
    + ', EV_Q=' + q(RELATION_PICKER_EVENT_QUERY) + ';' + '\n'
    + '  var AQ=' + q(RELATION_PICKER_ANCHOR_QUERY) + ', PQ=' + q(RELATION_PICKER_AREA_QUERY)
    + ', GAP=' + String(RELATION_PICKER_GAP_PX) + ', EDGE=' + String(RELATION_PICKER_EDGE_PX) + ';' + '\n'
    /* 两处口径的**唯一正本**：渲染期跑的就是这两个函数，这里嵌的也是同一份源码（`toString()`）。 */
    + '  var HITS=' + relationPickerHits.toString() + ';' + '\n'
    + '  var FOOT=' + relationPickerFoot.toString() + ';' + '\n'
    /* 文案表：键名与 `attrs.ts` 的 `RELATION_PICKER_TEXT` **逐名对齐**（嵌进来的那两个函数按这些名字取字）。 */
    + '  var T={footIdle:' + q(T.footIdle) + ', footIdlePlain:' + q(T.footIdlePlain)
    + ', footHitPre:' + q(T.footHitPre) + ', footHitPost:' + q(T.footHitPost) + ', footNone:' + q(T.footNone)
    + ', emptyPre:' + q(T.emptyPre) + ', emptyPost:' + q(T.emptyPost)
    + ', createPre:' + q(T.createPre) + ', createPost:' + q(T.createPost) + ', createEmpty:' + q(T.createEmpty)
    + ', pickedTag:' + q(T.pickedTag) + ', pickTag:' + q(T.pickTag) + ', tick:' + q(T.tick) + ', dot:' + q(T.dot)
    + ', stateLead:' + q(T.stateLead) + ', picking:' + q(T.picking) + ', picked:' + q(T.picked)
    + ', chosenPre:' + q(T.chosenPre) + '};' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute(A_RT)==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute(A_RT,"1");' + '\n'
    + '  var canAnchor=!!(window.CSS && CSS.supports && CSS.supports(AQ) && CSS.supports(PQ));' + '\n'
    + '  function fire(el,name,detail){ el.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail})); }\n'
    + '  function rootOf(el){ return (el && el.closest) ? el.closest("["+A_ROOT+"]") : null; }\n'
    + '  function one(root,attr){ return root.querySelector("["+attr+' + q('="') + '+root.getAttribute(A_ROOT)+' + q('"]') + '); }\n'
    + '  function trim(s){ return String(s===undefined||s===null?"":s).replace(/^[\\s\\u3000]+|[\\s\\u3000]+$/g,""); }\n'
    + '  function hide(el){ if(!el) return;'
    + ' if (typeof el.hidePopover==="function" && el.hasAttribute("popover")){ try{ el.hidePopover(); }catch(e){} } }\n'
    /* 降级定位：只在引擎不支持锚定 API 时用（样式段那边同样在 `@supports` 之外 ⇒ 两边一致）。 */
    + '  function place(root,panel){\n'
    + '    var t=root.querySelector("["+A_OPEN+"]"); if (!t || !panel) return;\n'
    + '    var r=t.getBoundingClientRect(), w=panel.offsetWidth, h=panel.offsetHeight;\n'
    + '    var vw=doc.documentElement.clientWidth, vh=doc.documentElement.clientHeight;\n'
    + '    var left=Math.max(EDGE, Math.min(r.left, vw-w-EDGE));\n'
    + '    var top=r.bottom+GAP;\n'
    + '    if (top+h > vh-EDGE) top=Math.max(EDGE, r.top-h-GAP);\n'
    + '    panel.style.left=left+"px"; panel.style.top=top+"px";\n'
    + '    panel.style.right="auto"; panel.style.bottom="auto";\n'
    + '  }\n'
    + '  function unplace(panel){ if (panel && panel.style){ panel.style.left=""; panel.style.top=""; } }\n'
    + '  function paint(row,term){\n'
    + '    var cell=row.querySelector("["+A_NAME+"]");\n'
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
    + '  function run(root){\n'
    + '    var input=one(root,A_Q);\n'
    + '    if (!input) return;\n'
    + '    var raw=trim(input.value), term=raw.toLowerCase();\n'
    + '    var items=root.querySelectorAll("["+A_ITEM+"]"), i, counted=[];\n'
    + '    for (i=0;i<items.length;i+=1){\n'
    + '      var item=items[i], hay=String(item.getAttribute(A_SEARCH)||"");\n'
    + '      var on=(term==="" || hay.indexOf(term)>=0);\n'
    + '      if (on) item.removeAttribute("hidden"); else item.setAttribute("hidden","");\n'
    + '      paint(item, on ? raw : "");\n'
    + '      counted.push({key:item.getAttribute(A_ITEM),hidden:!on});\n'
    + '    }\n'
    + '    var shown=HITS(counted);\n'
    + '    var groups=root.querySelectorAll("["+A_GRP+"]");\n'
    + '    for (i=0;i<groups.length;i+=1){\n'
    + '      var kind=groups[i].getAttribute(A_GRP), any=false;\n'
    + '      for (var j=0;j<items.length;j+=1){\n'
    + '        var self=items[j].hasAttribute(A_RECENT)?"recent":"all";\n'
    + '        if (self===kind && !items[j].hasAttribute("hidden")){ any=true; break; }\n'
    + '      }\n'
    + '      if (any) groups[i].removeAttribute("hidden"); else groups[i].setAttribute("hidden","");\n'
    + '    }\n'
    + '    var quick=root.querySelector("."+C_QUICK);\n'
    + '    if (quick){\n'
    + '      var chips=quick.querySelectorAll("."+C_CHIP), vis=0;\n'
    + '      for (i=0;i<chips.length;i+=1) if (!chips[i].hasAttribute("hidden")) vis+=1;\n'
    + '      if (vis>0) quick.removeAttribute("hidden"); else quick.setAttribute("hidden","");\n'
    + '    }\n'
    + '    var empty=one(root,A_EMPTY);\n'
    + '    if (empty){\n'
    + '      if (term!=="" && shown===0){ empty.textContent=T.emptyPre+raw+T.emptyPost; empty.removeAttribute("hidden"); }\n'
    + '      else { empty.setAttribute("hidden",""); }\n'
    + '    }\n'
    + '    var foot=one(root,A_FOOT);\n'
    + '    if (foot) foot.textContent = FOOT(raw, shown, !!root.querySelector("["+A_RECENT+"]"), T);\n'
    + '    var news=root.querySelectorAll("["+A_CREATE+"]");\n'
    + '    for (i=0;i<news.length;i+=1){\n'
    + '      news[i].setAttribute(A_CREATE,raw);\n'
    + '      news[i].textContent = raw==="" ? T.createEmpty : (T.createPre+raw+T.createPost);\n'
    + '    }\n'
    + '    fire(root,EV_Q,{id:root.getAttribute(A_ROOT),query:raw,hits:shown});\n'
    + '  }\n'
    /* 一份选项在屏上可能有**多处摆法**（`inline`：chip ＋ 整行；`overlay`：最近组 ＋ 全部组）——
       下面一律按**机器键**认它们：事实读哪一处都是同一份，选中态两处一起翻。 */
    + '  function pick(root,hit){\n'
    + '    var id=root.getAttribute(A_ROOT), key=hit.getAttribute(A_ITEM);\n'
    + '    var all=root.querySelectorAll("["+A_ITEM+"]"), i, title="", reading="";\n'
    + '    for (i=0;i<all.length;i+=1){\n'
    + '      if (all[i].getAttribute(A_ITEM)!==key) continue;\n'
    + '      var cell=all[i].querySelector("["+A_NAME+"]");\n'
    + '      if (title==="" && cell) title=cell.textContent||"";\n'
    + '      var rd=all[i].querySelector("."+C_READING);\n'
    + '      if (reading==="" && rd) reading=rd.textContent||"";\n'
    + '    }\n'
    + '    for (i=0;i<all.length;i+=1){\n'
    + '      var other=all[i], on=(other.getAttribute(A_ITEM)===key);\n'
    + '      var mk=other.querySelector("."+C_MK);\n'
    + '      var tag=other.querySelector("."+C_PICK);\n'
    + '      if (on){ other.classList.add("is-on"); other.setAttribute("aria-current","true");\n'
    + '        if (mk) mk.textContent=T.tick; if (tag) tag.textContent=T.pickedTag; }\n'
    + '      else { other.classList.remove("is-on"); other.removeAttribute("aria-current");\n'
    + '        if (mk) mk.textContent=T.dot; if (tag) tag.textContent=T.pickTag; }\n'
    + '    }\n'
    + '    var val=one(root,A_VAL);\n'
    + '    if (val) val.textContent=title;\n'
    /* 字段行那一头是**两格一起读同一件事**：读值那一格换名字，标签后面那句状态同时从「正在选」换成「已选」
       （只换一格，屏上就会出现「已选的项」旁边还写着「正在选」这种自相矛盾的话）。 */
    + '    var stateEl=root.querySelector("."+C_STATE);\n'
    + '    if (stateEl) stateEl.textContent=T.stateLead+T.picked;\n'
    + '    var chosen=one(root,A_CHOSEN);\n'
    + '    if (chosen){\n'
    + '      var res=chosen.querySelector("."+C_RESULT);\n'
    + '      if (res) res.textContent = T.chosenPre + " " + title + (reading==="" ? "" : ("\\uff08" + reading + "\\uff09"));\n'
    + '      chosen.removeAttribute("hidden");\n'
    + '    }\n'
    + '    var inline=root.querySelector("["+A_INLINE+"]");\n'
    + '    if (inline){\n'
    + '      inline.setAttribute("hidden","");\n'
    + '      var opener=root.querySelector("["+A_OPEN+"]");\n'
    + '      if (opener) opener.setAttribute("aria-expanded","false");\n'
    + '    }\n'
    + '    var panel=root.querySelector("["+A_PANEL+"]");\n'
    + '    hide(panel);\n'
    + '    var trig=root.querySelector("["+A_OPEN+"]");\n'
    + '    if (trig && trig.isConnected && doc.activeElement!==trig){ try{ trig.focus(); }catch(e2){} }\n'
    + '    fire(root,EV_SEL,{id:id,key:key,title:title});\n'
    + '  }\n'
    + '  doc.addEventListener("input",function(e){\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.hasAttribute || !t.hasAttribute(A_Q)) return;\n'
    + '    var root=rootOf(t); if (!root) return;\n'
    + '    run(root);\n'
    + '  });\n'
    + '  doc.addEventListener("click",function(e){\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.closest) return;\n'
    + '    var clear=t.closest("["+A_CLEAR+"]");\n'
    + '    if (clear){\n'
    + '      var rc=rootOf(clear); if (!rc) return;\n'
    + '      var input=one(rc,A_Q); if (input){ input.value=""; run(rc); }\n'
    + '      return;\n'
    + '    }\n'
    + '    var change=t.closest("["+A_CHANGE+"]");\n'
    + '    if (change){\n'
    + '      var ri=rootOf(change); if (!ri) return;\n'
    + '      var inl=ri.querySelector("["+A_INLINE+"]");\n'
    + '      if (inl) inl.removeAttribute("hidden");\n'
    + '      var op=ri.querySelector("["+A_OPEN+"]");\n'
    + '      if (op) op.setAttribute("aria-expanded","true");\n'
    + '      run(ri);\n'
    + '      return;\n'
    + '    }\n'
    + '    var news=t.closest("["+A_CREATE+"]");\n'
    + '    if (news){\n'
    + '      var rn=rootOf(news); if (!rn) return;\n'
    + '      fire(rn,EV_NEW,{id:rn.getAttribute(A_ROOT),value:news.getAttribute(A_CREATE)||""});\n'
    + '      return;\n'
    + '    }\n'
    + '    var row=t.closest("["+A_ITEM+"]");\n'
    + '    if (!row) return;\n'
    + '    var root=rootOf(row); if (!root) return;\n'
    + '    pick(root,row);\n'
    + '  });\n'
    + '  doc.addEventListener("toggle",function(e){\n'
    + '    var panel=e.target;\n'
    + '    if (!panel || !panel.hasAttribute || !panel.hasAttribute(A_PANEL)) return;\n'
    + '    var open=(e.newState==="open"), id=panel.getAttribute(A_PANEL);\n'
    + '    var all=doc.querySelectorAll("["+A_OPEN+"]");\n'
    + '    for (var k=0;k<all.length;k+=1)\n'
    + '      if (all[k].getAttribute(A_OPEN)===id) all[k].setAttribute("aria-expanded", open ? "true" : "false");\n'
    + '    if (!open){ unplace(panel); return; }\n'
    + '    var root=rootOf(panel); if (!root) return;\n'
    + '    run(root);\n'
    + '    if (!canAnchor) place(root,panel);\n'
    + '  },true);\n'
    + '  doc.addEventListener("click",function(e){\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.hasAttribute || !t.hasAttribute(A_OPEN)) return;\n'
    + '    var root=rootOf(t); if (!root) return;\n'
    + '    var inl=root.querySelector("["+A_INLINE+"]");\n'
    + '    if (!inl) return;\n'
    + '    if (inl.hasAttribute("hidden")){ inl.removeAttribute("hidden"); t.setAttribute("aria-expanded","true"); }\n'
    + '    else { inl.setAttribute("hidden",""); t.setAttribute("aria-expanded","false"); }\n'
    + '  });\n'
    + '  var roots=doc.querySelectorAll("["+A_ROOT+"]");\n'
    + '  for (var m=0;m<roots.length;m+=1){\n'
    + '    var openers=roots[m].querySelectorAll("["+A_OPEN+"]");\n'
    + '    for (var n=0;n<openers.length;n+=1) openers[n].setAttribute(A_BOUND,"1");\n'
    + '    run(roots[m]);\n'
    + '  }\n'
    + '}());';
}
