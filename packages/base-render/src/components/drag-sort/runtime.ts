/** drag-sort · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `command-palette/runtime.ts` 同一处分工：模块代码零 DOM，DOM 只在产出的字符串里。
 *
 *  行为契约（逐条对应判据）：
 *   · **点选是主通路**（触屏上走得通）：点把手拿起 → 再点另一行放下 → 点取消放回原位；
 *     拖拽（Pointer Events）是同一份状态的另一条路，不是唯一通路；
 *     运行时段一行没跑到，静态标记照常可读（位置读数与序号都在标记里）。
 *   · **同一次只拿起一行**：已拿起时再点把手＝放下到那一行（点同一行＝取消）；
 *     锁定的行拿不起来（把手 `disabled`，点不动）。
 *   · **松手（放下／取消）才报数**：拿起报 `ilife:drag-sort-pick`，放下报
 *     `ilife:drag-sort-drop`（带放下后的全序 `keys`），取消报 `ilife:drag-sort-cancel`；
 *     本件不写库，写库归页面（拿到 `keys` 按新顺序重渲染，或什么都不做）。
 *   · **只动 `hidden` 与三样节点**：拿起时建出空槽与落点线（位随行走），放下／取消时撤掉；
 *     放下后重排整列行节点的 DOM 顺序并重写序号与位置读数（不重建节点——重建会把焦点打断）。
 *   · **幂等**：`<html>` 上一枚 `data-ilife-drag-runtime` 拦住重复注入；根上记一枚 bound 读数。
 */
import {
  DRAG_SORT_AT_ATTR,
  DRAG_SORT_ATTR,
  DRAG_SORT_BOUND_ATTR,
  DRAG_SORT_CANCEL_ATTR,
  DRAG_SORT_EVENT_CANCEL,
  DRAG_SORT_EVENT_DROP,
  DRAG_SORT_EVENT_PICK,
  DRAG_SORT_HANDLE_ATTR,
  DRAG_SORT_KEY_ATTR,
  DRAG_SORT_LIFT_ATTR,
  DRAG_SORT_LINE_ATTR,
  DRAG_SORT_LIST_ATTR,
  DRAG_SORT_RUNTIME_ATTR,
  DRAG_SORT_SLOT_ATTR,
  DRAG_SORT_STATUS_ATTR,
  DRAG_SORT_TEXT,
  dragSortSlot,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进自己的脚本槽）。 */
export function buildDragSortJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const T = DRAG_SORT_TEXT;
  return '(function(){' + '\n'
    /* ── 常量（全部来自 `attrs.ts`：渲染与运行时读的是同一份事实） ────────────── */
    + '  var A_ROOT=' + q(DRAG_SORT_ATTR) + ', A_LIST=' + q(DRAG_SORT_LIST_ATTR)
    + ', A_KEY=' + q(DRAG_SORT_KEY_ATTR) + ', A_HANDLE=' + q(DRAG_SORT_HANDLE_ATTR) + ';' + '\n'
    + '  var A_SLOT=' + q(DRAG_SORT_SLOT_ATTR) + ', A_LINE=' + q(DRAG_SORT_LINE_ATTR)
    + ', A_STATUS=' + q(DRAG_SORT_STATUS_ATTR) + ', A_CANCEL=' + q(DRAG_SORT_CANCEL_ATTR) + ';' + '\n'
    + '  var A_LIFT=' + q(DRAG_SORT_LIFT_ATTR) + ', A_AT=' + q(DRAG_SORT_AT_ATTR)
    + ', A_BOUND=' + q(DRAG_SORT_BOUND_ATTR) + ', A_RT=' + q(DRAG_SORT_RUNTIME_ATTR) + ';' + '\n'
    + '  var EV_PICK=' + q(DRAG_SORT_EVENT_PICK) + ', EV_DROP=' + q(DRAG_SORT_EVENT_DROP)
    + ', EV_CANCEL=' + q(DRAG_SORT_EVENT_CANCEL) + ';' + '\n'
    + '  var C_ROW=' + q(dragSortSlot('row')) + ', C_HANDLE=' + q(dragSortSlot('handle'))
    + ', C_INDEX=' + q(dragSortSlot('index')) + ', C_NAME=' + q(dragSortSlot('name')) + ';' + '\n'
    + '  var C_POS=' + q(dragSortSlot('pos')) + ', C_SLOT=' + q(dragSortSlot('slot'))
    + ', C_DROP=' + q(dragSortSlot('drop')) + ', C_TEXT=' + q(dragSortSlot('text')) + ';' + '\n'
    + '  var T_CANCEL=' + q(T.cancel) + ', T_LOCKED=' + q(T.lockedPrefix) + ';' + '\n'
    + '  var doc=document, skipClick=false, drag=null;' + '\n'
    + '  if (doc.documentElement.getAttribute(A_RT)==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute(A_RT,"1");' + '\n'
    /* ── 文案（与 `model.ts` 同一口径：渲染期算的那几句，这里现算同一句） ─────── */
    + '  function idleStatus(n){ return "共 "+n+" 步。点把手拿起一行。放下时点另一行。"; }\n'
    + '  function liftStatus(f,label,t){ return "已拿起第 "+f+" 步「"+label+"」，将放到第 "+t'
    + '+" 位。点另一行放下，或点取消放回原位。"; }\n'
    + '  function slotText(f,label){ return "第 "+f+" 步原位空着，被拿起的是"+label; }\n'
    + '  function lineText(t){ return "放这里（第 "+t+" 位）"; }\n'
    + '  function gripPick(p,label){ return "拿起第 "+p+" 步："+label; }\n'
    + '  function gripLift(p,label){ return "已拿起第 "+p+" 步："+label+"，再点放回原位"; }\n'
    + '  function gripLock(p,why){ return "第 "+p+" 步不可移，"+why; }\n'
    /* ── 定位小件 ─────────────────────────────────────────────────────────── */
    + '  function fire(el,name,detail){ el.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail})); }\n'
    + '  function rootOf(el){ return (el && el.closest) ? el.closest("["+A_ROOT+"]") : null; }\n'
    + '  function listOf(root){ return root.querySelector("["+A_LIST+"]"); }\n'
    + '  function rowsOf(root){ return [].slice.call(listOf(root).querySelectorAll("["+A_KEY+"]")); }\n'
    + '  function rowOf(root,key){'
    + ' var rows=rowsOf(root);'
    + ' for (var i=0;i<rows.length;i+=1) if (rows[i].getAttribute(A_KEY)===key) return rows[i];'
    + ' return null; }\n'
    + '  function handleOf(row){ return row.querySelector("["+A_HANDLE+"]"); }\n'
    + '  function labelOf(row){ var c=row.querySelector("."+C_NAME); return c ? (c.textContent||"") : ""; }\n'
    + '  function statusOf(root){ return root.querySelector("["+A_STATUS+"]"); }\n'
    + '  function cancelOf(root){ return root.querySelector("["+A_CANCEL+"]"); }\n'
    + '  function slotOf(root){ return root.querySelector("["+A_SLOT+"]"); }\n'
    + '  function lineOf(root){ return root.querySelector("["+A_LINE+"]"); }\n'
    /* ── 全列重写序号与位置读数（放下后位变了，每一行的三处字都要跟上） ─────── */
    + '  function repaint(root){\n'
    + '    var rows=rowsOf(root), n=rows.length;\n'
    + '    for (var i=0;i<n;i+=1){\n'
    + '      var row=rows[i], p=i+1, handle=handleOf(row), idx=row.querySelector("."+C_INDEX);\n'
    + '      var pos=row.querySelector("."+C_POS), label=labelOf(row);\n'
    + '      if (idx) idx.textContent=String(p);\n'
    + '      if (pos) pos.textContent="第 "+p+" 位，共 "+n+" 步";\n'
    + '      if (handle && !handle.disabled){\n'
    + '        var lifted=row.classList.contains("is-up");\n'
    + '        handle.setAttribute("aria-label", lifted ? gripLift(p,label) : gripPick(p,label));\n'
    + '      }\n'
    + '    }\n'
    + '  }\n'
    /* ── 建出空槽与落点线（拿起时；位随行走，放下／取消时撤掉） ─────────────── */
    + '  function buildSlot(doc,key,text){\n'
    + '    var el=doc.createElement("div");\n'
    + '    el.setAttribute("class",C_SLOT); el.setAttribute(A_SLOT,key); el.textContent=text;\n'
    + '    return el; }\n'
    + '  function buildLine(doc,at,text){\n'
    + '    var el=doc.createElement("div");\n'
    + '    el.setAttribute("class",C_DROP); el.setAttribute(A_LINE,String(at));\n'
    + '    var bar=doc.createElement("i"); bar.setAttribute("aria-hidden","true");\n'
    + '    var cap=doc.createElement("b"); cap.textContent=text;\n'
    + '    el.appendChild(bar); el.appendChild(cap); return el; }\n'
    + '  function placeLine(root,at){\n'
    + '    var rows=rowsOf(root), line=lineOf(root);\n'
    + '    if (!line || at<1 || at>rows.length) return;\n'
    + '    var lifted=rowOf(root,root.getAttribute(A_LIFT));\n'
    + '    if (!lifted) return;\n'
    + '    line.setAttribute(A_LINE,String(at));\n'
    + '    var cap=line.querySelector("b"); if (cap) cap.textContent=lineText(at);\n'
    + '    listOf(root).insertBefore(line,rows[at-1]);\n'
    + '    root.setAttribute(A_AT,String(at));\n'
    + '    var st=statusOf(root), from=rows.indexOf(lifted)+1;\n'
    + '    if (st) st.textContent=liftStatus(from,labelOf(lifted),at);\n'
    + '  }\n'
    /* ── 拿起（点把手／按住拖都是这一支） ─────────────────────────────────── */
    + '  function pick(root,key){\n'
    + '    if (!root || root.getAttribute(A_LIFT)) return false;\n'
    + '    var row=rowOf(root,key);\n'
    + '    if (!row) return false;\n'
    + '    var handle=handleOf(row);\n'
    + '    if (!handle || handle.disabled) return false;\n'
    + '    var rows=rowsOf(root), from=rows.indexOf(row)+1, label=labelOf(row);\n'
    + '    root.setAttribute(A_LIFT,key); root.setAttribute(A_AT,String(from));\n'
    + '    row.classList.add("is-up"); row.setAttribute("aria-current","true");\n'
    + '    handle.setAttribute("aria-pressed","true");\n'
    + '    handle.setAttribute("aria-label",gripLift(from,label));\n'
    + '    var list=listOf(root);\n'
    + '    list.insertBefore(buildLine(doc,from,lineText(from)),row);\n'
    + '    list.insertBefore(buildSlot(doc,key,slotText(from,label)),row.nextSibling);\n'
    + '    var st=statusOf(root); if (st) st.textContent=liftStatus(from,label,from);\n'
    + '    var cancel=cancelOf(root); if (cancel) cancel.removeAttribute("hidden");\n'
    + '    fire(root,EV_PICK,{id:root.getAttribute(A_ROOT),key:key,from:from});\n'
    + '    return true; }\n'
    /* ── 放下（点另一行／拖到另一行松手；顺序真动，序号与读数整列重写） ─────── */
    + '  function drop(root,targetKey){\n'
    + '    if (!root) return false;\n'
    + '    var key=root.getAttribute(A_LIFT);\n'
    + '    if (!key) return false;\n'
    + '    var rows=rowsOf(root), from=rows.indexOf(rowOf(root,key))+1;\n'
    + '    var rest=rows.filter(function(r){ return r.getAttribute(A_KEY)!==key; });\n'
    + '    var at=rest.indexOf(rowOf(root,targetKey));\n'
    + '    if (at<0) return false;\n'
    + '    var to=at+1, order=rest.slice(0,at).concat([rowOf(root,key)],rest.slice(at));\n'
    + '    var slot=slotOf(root), line=lineOf(root), list=listOf(root);\n'
    + '    if (slot) slot.parentNode.removeChild(slot);\n'
    + '    if (line) line.parentNode.removeChild(line);\n'
    + '    for (var i=0;i<order.length;i+=1) list.appendChild(order[i]);\n'
    + '    var row=rowOf(root,key), handle=row ? handleOf(row) : null;\n'
    + '    if (row){ row.classList.remove("is-up"); row.removeAttribute("aria-current"); }\n'
    + '    if (handle){ handle.removeAttribute("aria-pressed"); }\n'
    + '    root.removeAttribute(A_LIFT); root.removeAttribute(A_AT);\n'
    + '    repaint(root);\n'
    + '    var st=statusOf(root); if (st) st.textContent=idleStatus(order.length);\n'
    + '    var cancel=cancelOf(root); if (cancel) cancel.setAttribute("hidden","");\n'
    + '    var keys=order.map(function(r){ return r.getAttribute(A_KEY); });\n'
    + '    fire(root,EV_DROP,{id:root.getAttribute(A_ROOT),keys:keys,from:from,to:to});\n'
    + '    return true; }\n'
    /* ── 取消（点取消键／再点同一行；顺序原样不动） ───────────────────────── */
    + '  function cancel(root){\n'
    + '    if (!root) return false;\n'
    + '    var key=root.getAttribute(A_LIFT);\n'
    + '    if (!key) return false;\n'
    + '    var row=rowOf(root,key), handle=row ? handleOf(row) : null;\n'
    + '    var slot=slotOf(root), line=lineOf(root);\n'
    + '    if (slot) slot.parentNode.removeChild(slot);\n'
    + '    if (line) line.parentNode.removeChild(line);\n'
    + '    if (row){ row.classList.remove("is-up"); row.removeAttribute("aria-current"); }\n'
    + '    if (handle){ handle.removeAttribute("aria-pressed"); }\n'
    + '    root.removeAttribute(A_LIFT); root.removeAttribute(A_AT);\n'
    + '    repaint(root);\n'
    + '    var st=statusOf(root); if (st) st.textContent=idleStatus(rowsOf(root).length);\n'
    + '    var cancelBtn=cancelOf(root); if (cancelBtn) cancelBtn.setAttribute("hidden","");\n'
    + '    fire(root,EV_CANCEL,{id:root.getAttribute(A_ROOT),key:key});\n'
    + '    return true; }\n'
    /* ── 委派：点选主通路（点把手拿起／放下，点取消键取消） ─────────────────── */
    + '  doc.addEventListener("click",function(e){\n'
    + '    if (skipClick){ skipClick=false; return; }\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.closest) return;\n'
    + '    var cancelBtn=t.closest("["+A_CANCEL+"]");\n'
    + '    if (cancelBtn){ var rc=rootOf(cancelBtn); if (rc) cancel(rc); return; }\n'
    + '    var handle=t.closest("["+A_HANDLE+"]");\n'
    + '    if (!handle || handle.disabled) return;\n'
    + '    var root=rootOf(handle);\n'
    + '    if (!root) return;\n'
    + '    var key=handle.getAttribute(A_HANDLE), lifted=root.getAttribute(A_LIFT);\n'
    + '    if (!lifted){ pick(root,key); }\n'
    + '    else if (lifted===key){ cancel(root); }\n'
    + '    else { drop(root,key); }\n'
    + '  });\n'
    /* ── 拖那条路（Pointer Events：按住拿起 → 挪动跟线 → 松手放下） ─────────── */
    + '  doc.addEventListener("pointerdown",function(e){\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.closest || (e.isPrimary!==undefined && !e.isPrimary)) return;\n'
    + '    var handle=t.closest("["+A_HANDLE+"]");\n'
    + '    if (!handle || handle.disabled) return;\n'
    + '    var root=rootOf(handle);\n'
    + '    if (!root) return;\n'
    + '    if (!root.getAttribute(A_LIFT)){\n'
    + '      if (!pick(root,handle.getAttribute(A_HANDLE))) return;\n'
    + '      drag={id:root.getAttribute(A_ROOT),moved:false};\n'
    + '    } else {\n'
    + '      drag={id:root.getAttribute(A_ROOT),moved:false};\n'
    + '    }\n'
    + '    try{ handle.setPointerCapture(e.pointerId); }catch(c){}\n'
    + '  });\n'
    + '  doc.addEventListener("pointermove",function(e){\n'
    + '    if (!drag || (e.isPrimary!==undefined && !e.isPrimary)) return;\n'
    + '    var roots=doc.querySelectorAll("["+A_ROOT+"]"), root=null;\n'
    + '    for (var i=0;i<roots.length;i+=1){\n'
    + '      if (roots[i].getAttribute(A_ROOT)===drag.id) root=roots[i];\n'
    + '    }\n'
    + '    if (!root || !root.getAttribute(A_LIFT)) return;\n'
    + '    var under=doc.elementFromPoint ? doc.elementFromPoint(e.clientX,e.clientY) : null;\n'
    + '    var row=(under && under.closest) ? under.closest("["+A_KEY+"]") : null;\n'
    + '    if (!row || rootOf(row)!==root) return;\n'
    + '    var key=row.getAttribute(A_KEY), lifted=root.getAttribute(A_LIFT);\n'
    + '    if (key===lifted || handleOf(row).disabled) return;\n'
    + '    var rows=rowsOf(root), rest=rows.filter(function(r){ return r.getAttribute(A_KEY)!==lifted; });\n'
    + '    var at=rest.indexOf(row)+1;\n'
    + '    if (at>=1 && String(at)!==root.getAttribute(A_AT)){ drag.moved=true; placeLine(root,at); }\n'
    + '  });\n'
    + '  function endDrag(e){\n'
    + '    if (!drag) return;\n'
    + '    var was=drag; drag=null;\n'
    + '    var roots=doc.querySelectorAll("["+A_ROOT+"]"), root=null;\n'
    + '    for (var i=0;i<roots.length;i+=1){\n'
    + '      if (roots[i].getAttribute(A_ROOT)===was.id) root=roots[i];\n'
    + '    }\n'
    + '    if (!root || !root.getAttribute(A_LIFT)) return;\n'
    + '    if (!was.moved) return;\n'
    + '    skipClick=true;\n'
    + '    var rows=rowsOf(root), lifted=root.getAttribute(A_LIFT);\n'
    + '    var rest=rows.filter(function(r){ return r.getAttribute(A_KEY)!==lifted; });\n'
    + '    var at=Number(root.getAttribute(A_AT)||"0"), target=rest[at-1];\n'
    + '    if (target) drop(root,target.getAttribute(A_KEY)); else cancel(root);\n'
    + '  }\n'
    + '  doc.addEventListener("pointerup",endDrag);\n'
    + '  doc.addEventListener("pointercancel",function(){ drag=null; });\n'
    /* ── 首次挂载：渲染期已是拿起态的，记一枚 bound 读数（幂等） ────────────── */
    + '  var roots=doc.querySelectorAll("["+A_ROOT+"]");\n'
    + '  for (var k=0;k<roots.length;k+=1){\n'
    + '    roots[k].setAttribute(A_BOUND,"1");\n'
    + '    repaint(roots[k]);\n'
    + '  }\n'
    + '}());';
}
