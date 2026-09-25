/** drag-sort · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `command-palette/runtime.ts` 同一处分工：模块代码零 DOM，DOM 只在产出的字符串里。
 *
 *  行为契约（逐条对应判据）：
 *   · **点一下＝拿起**（不是「按住才拿起」）：`pointerdown` 只记起点与那一行（不拿起），
 *     松手时（`pointerup`）才拿起——**tap 里不拿起就不会被同一手势的 `click` 取消掉**；
 *     真指针走完 `pointerdown → pick(pointerup) → click`，浏览器随后合成的那一枚 click 被吞（它是同一次手势）。
 *   · **点选是主通路**（触屏上走得通）：点把手拿起 → 再点另一行放下 → 点取消放回原位；
 *     拖拽（Pointer Events）是同一份状态的另一条路，不是唯一通路；
 *     运行时段一行没跑到，静态标记照常可读（位置读数与序号都在标记里）。
 *   · **放下＝整行**：拿起之后，**点哪一行都放**（名称格、读数格、空槽那一片都算那一行），
 *     把手只是「拿」的入口；点被拿起的那一行自己＝放回原位（取消）。锁定的行不是落点。
 *   · **同一次只拿起一行、一块**：`pick`／`drop`／`cancel` 之前先把**别的实例**收掉（全页只许一块挂拿起态）。
 *   · **拖拽按「按下那个根」绑定**：指针手势记的是按下时那个根元素，同 `id` 两张清单不会串。
 *   · **松手（放下／取消）才报数**：拿起报 `ilife:drag-sort-pick`，放下报
 *     `ilife:drag-sort-drop`（带放下后的全序 `keys`），取消报 `ilife:drag-sort-cancel`；
 *     本件不写库，写库归页面（拿到 `keys` 按新顺序重渲染，或什么都不做）。
 *   · **只动 `hidden` 与三样节点**：拿起时建出空槽与落点线（位随行走），放下／取消时撤掉；
 *     放下后重排整列行节点的 DOM 顺序并重写序号与位置读数（不重建节点——重建会把焦点打断）。
 *   · **文案同源**：状态句／空槽句／落点句／把手名都从 `attrs.ts` 的 `dragSortText()` 烘出来
 *     （渲染期读同一个函数），**这里不许再写一份字面量**。
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
  dragSortText,
} from './attrs.js';

/** 产出的 JS 里那几句函数的**登记表**：名字 ＋ 形参各取哪个占位符的值。
 *
 *  `dims` 的顺序必须与 `attrs.ts` 里那句模板里占位符的出现顺序一致
 *  （判据把烘出来的句子与 `dragSortText(名, 值)` 的整句逐字对账，顺序错了当场红）。
 */
const TEXT_FNS = [
  /** `{n}`＝共几步。 */
  { name: 'idleStatus', dims: ['n'] },
  /** `{from}`＝第几位（1 起）、`{label}`＝名称、`{to}`＝落到第几位。 */
  { name: 'liftStatus', dims: ['from', 'label', 'to'] },
  /** 空槽句：写出哪一步空着、被拿起的是谁。 */
  { name: 'slotText', dims: ['from', 'label'] },
  /** 落点句：写出放第几位。 */
  { name: 'lineText', dims: ['to'] },
  /** 把手名：可拿起那一行。 */
  { name: 'gripPick', dims: ['p', 'label'] },
  /** 把手名：已拿起那一行。 */
  { name: 'gripLift', dims: ['p', 'label'] },
  /** 把手名：锁定那一行。 */
  { name: 'gripLock', dims: ['p', 'why'] },
] as const;

/** 烘函数用的占位实参：每个占位符换成一个**带占位符名字的记号**，
 *  于是"哪一段是字面量、哪一段是形参"从烘出来的句子本身读得出来（空串会看不出相邻两个占位符）。 */
const TEXT_MARK = String.fromCharCode(0);
const markOf = (name: string): string => TEXT_MARK + name + TEXT_MARK;

/** 模板里用到的**全部**占位符名（`attrs.ts` 那几句只用这几个；多写一个也没关系）。 */
const TEXT_PLACEHOLDERS = ['n', 'from', 'label', 'to', 'p', 'why'] as const;

/** 全占位符的记号表（`dragSortText` 照着 `{名}` 里的名字查，查得到就换成 `\u0000名\u0000`）。 */
const TEXT_MARKS: Readonly<Record<string, string>> = Object.fromEntries(
  TEXT_PLACEHOLDERS.map((one) => [one, markOf(one)]),
);

/** 一句话的模板 → 产出 JS 里的函数源码：**逐段烘自 `DRAG_SORT_TEXT` 的那一句**。
 *
 *  为什么不是 `fn.toString()`：那样印出来的是**模块里的箭头函数**（形参名、模板串都在），
 *  注入页面后 `dragSortText` 根本不在那个作用域里——产出的 JS 必须**自足**。
 *  于是这里拿 `dragSortText` 自己（**同一个定义地**）把模板烘成「字面量段 ＋ 形参」的拼接：
 *  改了 `DRAG_SORT_TEXT` 那一句，烘出来的函数跟着变；形状对不上（多了个没声明的占位符）时
 *  烘出来的句子与模板不再逐字相同——判据当场红。 */
function plainFn(name: keyof typeof DRAG_SORT_TEXT, dims: readonly string[]): string {
  const parts = dragSortText(name, TEXT_MARKS).split(TEXT_MARK);
  const args: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    /* 奇数段＝占位符名（字符串里的 `\u0000` 都成对写，奇偶不会错位）。 */
    if (i % 2 === 0) args.push(JSON.stringify(part));
    else if (part !== undefined && dims.includes(part)) args.push('p' + String(dims.indexOf(part)));
    else args.push(JSON.stringify('{' + String(part) + '}'));
  }
  return 'function(' + dims.map((_, i) => 'p' + String(i)).join(',') + ')'
    + '{ return ' + args.join('+') + '; }';
}

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进自己的脚本槽）。 */
export function buildDragSortJs(): string {
  const q = (s: string): string => JSON.stringify(s);
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
    + '  var T_CANCEL=' + q(DRAG_SORT_TEXT.cancel) + ';' + '\n'
    + '  var doc=document, docEl=doc.documentElement, suppressClick=false, press=null, drag=null;' + '\n'
    + '  function runtimeOn(){ return docEl.getAttribute(A_RT)==="1"; }' + '\n'
    + '  if (runtimeOn()) return;' + '\n'
    + '  docEl.setAttribute(A_RT,"1");' + '\n'
    /* ── 文案：**烘自 `attrs.ts` 的同一句**（`DRAG_SORT_TEXT` ＋ `dragSortText()`），不是另写一份 ── */
    + TEXT_FNS.map((f) => '  var ' + f.name + '=' + plainFn(f.name, f.dims) + ';').join('\n') + '\n'
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
    /* ── 指针小件（拿起态那三样节点夹在行与行之间，命中测试要认得它们：落在空槽上算它上一行的位置） ── */
    + '  function pointOf(e){ return {x:Number(e.clientX||0),y:Number(e.clientY||0)}; }\n'
    + '  function atPointer(p){ return {x:Number(p&&p.x||0),y:Number(p&&p.y||0)}; }\n'
    + '  function winRow(win,root){'
    + ' var el=win;'
    + ' while (el){'
    + '  if (el===root || el===doc.body || el===docEl) return null;'
    + '  if (rowOf(root,el.getAttribute(A_KEY))) return el;'
    + '  el=el.previousElementSibling;'
    + ' }'
    + ' return null; }\n'
    + '  function rowAt(root,p,lifted){'
    + ' if (!doc.elementFromPoint) return null;'
    + ' var hit=doc.elementFromPoint(p.x,p.y), el=hit;'
    /* 空槽就是「原位」：松手时正落在空槽上＝放回原位（与点被拿起那一行自己同一条路）。 */
    + ' if (el && el.getAttribute(A_SLOT)===lifted) return rowOf(root,lifted);'
    + ' var row=null;'
    + ' while (el && el!==doc.body && el!==docEl && !row){'
    + '  if (el.getAttribute && el.getAttribute(A_KEY)) row=el;'
    + '  else if (rootOf(el)===root) { row=winRow(el,root); break; }'
    + '  else if (el===root) break;'
    + '  el=el.parentElement;'
    + ' }'
    + ' if (!row || rootOf(row)!==root || row.getAttribute(A_KEY)===lifted) return null;'
    + ' var handle=handleOf(row);'
    + ' return (handle && handle.disabled) ? null : row; }\n'
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
    /* ── 拿起（真指针松手那一下／合成点击都是这一支） ───────────────────────── */
    + '  function pick(root,key){\n'
    + '    if (!root || root.getAttribute(A_LIFT)) return false;\n'
    + '    var row=rowOf(root,key);\n'
    + '    if (!row) return false;\n'
    + '    var handle=handleOf(row);\n'
    + '    if (!handle || handle.disabled) return false;\n'
    + '    cancelAllExcept(root);\n'
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
    /* ── 放下（点哪一行都放／拖到那一行松手；顺序真动，序号与读数整列重写） ─── */
    + '  function drop(root,targetKey){\n'
    + '    if (!root) return false;\n'
    + '    var key=root.getAttribute(A_LIFT);\n'
    + '    if (!key) return false;\n'
    + '    var src=rowOf(root,key), target=rowOf(root,targetKey);\n'
    + '    if (!src || !target || targetKey===key) return false;\n'
    + '    var targetHandle=handleOf(target);\n'
    + '    if (targetHandle && targetHandle.disabled) return false;\n'
    + '    var rows=rowsOf(root), from=rows.indexOf(src)+1;\n'
    + '    var rest=rows.filter(function(r){ return r.getAttribute(A_KEY)!==key; });\n'
    + '    var at=rest.indexOf(target);\n'
    + '    if (at<0) return false;\n'
    + '    var to=at+1, order=rest.slice(0,at).concat([src],rest.slice(at));\n'
    + '    var slot=slotOf(root), line=lineOf(root), list=listOf(root);\n'
    + '    if (slot) slot.parentNode.removeChild(slot);\n'
    + '    if (line) line.parentNode.removeChild(line);\n'
    + '    for (var i=0;i<order.length;i+=1) list.appendChild(order[i]);\n'
    + '    var handle=handleOf(src);\n'
    + '    src.classList.remove("is-up"); src.removeAttribute("aria-current");\n'
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
    /* ── 一块一次：拿起之前先把**别的实例**放回原位（全页只许一块挂拿起态） ──── */
    + '  function cancelAllExcept(keep){\n'
    + '    var all=doc.querySelectorAll("["+A_ROOT+"]"), hit=false;\n'
    + '    for (var i=0;i<all.length;i+=1){\n'
    + '      if (all[i]===keep) continue;\n'
    + '      if (cancel(all[i])) hit=true;\n'
    + '    }\n'
    + '    return hit; }\n'
    /* ── 动作分派（点／松手两条路都走它：拿起、放下、取消各只有一个入口） ───── */
    + '  function route(root,key,lifted){\n'
    + '    if (!lifted) return pick(root,key);\n'
    + '    if (lifted===key) return cancel(root);\n'
    + '    return tryDrop(root,key,lifted); }\n'
    + '  function tryDrop(root,key,lifted){\n'
    + '    if (!key) return false;\n'
    + '    var target=rowOf(root,key);\n'
    + '    if (!target) return false;\n'
    + '    var handle=handleOf(target);\n'
    + '    if (handle && handle.disabled) return false;\n'
    + '    return drop(root,key); }\n'
    /* ── 委派：点选主通路（点把手拿起；拿起之后点哪一行都放） ───────────────── */
    + '  doc.addEventListener("click",function(e){\n'
    + '    if (suppressClick){ suppressClick=false; return; }\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.closest) return;\n'
    + '    var cancelBtn=t.closest("["+A_CANCEL+"]");\n'
    + '    if (cancelBtn){ var rc=rootOf(cancelBtn); if (rc) cancel(rc); return; }\n'
    + '    var row=t.closest("["+A_KEY+"]");\n'
    + '    if (!row) return;\n'
    + '    var root=rootOf(row), handle=t.closest("["+A_HANDLE+"]");\n'
    + '    if (!root) return;\n'
    + '    if (handle && handle.disabled) return;\n'
    + '    if (cancelAllExcept(root)) suppressClick=false;\n'
    + '    route(root,row.getAttribute(A_KEY),root.getAttribute(A_LIFT));\n'
    + '  });\n'
    /* ── 拖那条路（Pointer Events：按下记起点 → 挪动跟线 → 松手拿起／放下） ───
    *   按下**不**拿起：同一手势里浏览器随后合成的 `click` 会把刚拿起的又取消掉（真指针点一下＝空忙一场）。 */
    + '  doc.addEventListener("pointerdown",function(e){\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.closest || (e.isPrimary!==undefined && !e.isPrimary)) return;\n'
    /* 空槽就是「原位」：在它上面按下也当压住了被拿起那一行（松手＝放回原位）。 */
    + '    var slot=t.closest("["+A_SLOT+"]");\n'
    + '    var handle=slot ? null : t.closest("["+A_HANDLE+"]");\n'
    + '    if (slot){\n'
    + '      var sr=rootOf(slot), sk=slot.getAttribute(A_SLOT);\n'
    + '      if (!sr || sk!==sr.getAttribute(A_LIFT)) return;\n'
    + '      press={root:sr,row:rowOf(sr,sk),handle:null,cursor:pointOf(e),lifted:sk};\n'
    + '      return;\n'
    + '    }\n'
    + '    if (!handle || handle.disabled) return;\n'
    + '    var root=rootOf(handle);\n'
    + '    if (!root) return;\n'
    + '    press={root:root,row:rootOf(handle),handle:handle,cursor:pointOf(e),lifted:root.getAttribute(A_LIFT)};\n'
    + '    if (e.pointerId!==undefined && handle.setPointerCapture){\n'
    + '      try{ handle.setPointerCapture(e.pointerId); }catch(c){}\n'
    + '    }\n'
    + '  });\n'
    + '  doc.addEventListener("pointermove",function(e){\n'
    + '    if (!press || (e.isPrimary!==undefined && !e.isPrimary)) return;\n'
    + '    var root=press.root;\n'
    + '    if (!root || !root.getAttribute(A_LIFT)) return;\n'
    + '    press.cursor={x:e.clientX,y:e.clientY};\n'
    + '    var row=rowAt(root,press.cursor,root.getAttribute(A_LIFT));\n'
    + '    if (!row || !t.closest("["+A_HANDLE+"]")) return;\n'
    /* 落在被拿起那一行自己／空槽上（`rowAt` 把空槽折成它上一行）＝原位，不画线。 */
    + '    if (row.getAttribute(A_KEY)===root.getAttribute(A_LIFT)) return;\n'
    + '    var rows=rowsOf(root), lifted=root.getAttribute(A_LIFT);\n'
    + '    var rest=rows.filter(function(r){ return r.getAttribute(A_KEY)!==lifted; });\n'
    + '    var at=rest.indexOf(row)+1;\n'
    + '    if (at>=1 && String(at)!==root.getAttribute(A_AT)){ drag=true; placeLine(root,at); }\n'
    + '  });\n'
    + '  function endPress(e){\n'
    + '    if (!press) return;\n'
    + '    var was=press; press=null;\n'
    + '    var root=was.root;\n'
    + '    if (!root) return;\n'
    + '    var same=!!(was.row && was.row===rootOf(e.target));\n'
    + '    var moved=!!drag; drag=null;\n'
    + '    var hit=null;\n'
    + '    if (!same && was.cursor) hit=rowAt(root,atPointer(was.cursor),root.getAttribute(A_LIFT));\n'
    + '    var row=hit || (same ? null : was.row);\n'
    + '    var acted=false;\n'
    + '    if (root.getAttribute(A_LIFT)){\n'
    + '      acted=moved || !same;\n'
    + '      if (acted){\n'
    + '        if (row){ var key=row.getAttribute(A_KEY);\n'
    + '          if (key===root.getAttribute(A_LIFT)) acted=cancel(root); else acted=tryDrop(root,key,root.getAttribute(A_LIFT));\n'
    + '        } else if (same) acted=cancel(root);\n'
    + '      }\n'
    + '    } else {\n'
    + '      acted=route(root,was.handle.getAttribute(A_HANDLE),null);\n'
    + '    }\n'
    + '    if (acted) suppressClick=true;\n'
    + '    if (was.handle && e.pointerId!==undefined && was.handle.releasePointerCapture){\n'
    + '      try{ was.handle.releasePointerCapture(e.pointerId); }catch(c){}\n'
    + '    }\n'
    + '  }\n'
    + '  doc.addEventListener("pointerup",endPress);\n'
    + '  doc.addEventListener("pointercancel",function(){ press=null; drag=null; });\n'
    /* ── 首次挂载：渲染期已是拿起态的，记一枚 bound 读数（幂等） ────────────── */
    + '  var roots=doc.querySelectorAll("["+A_ROOT+"]");\n'
    + '  for (var k=0;k<roots.length;k+=1){\n'
    + '    roots[k].setAttribute(A_BOUND,"1");\n'
    + '    repaint(roots[k]);\n'
    + '  }\n'
    + '}());';
}
