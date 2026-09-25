/** drag-sort · **运行时段的地基**（产出 JS 文本的头一段：常量 ＋ 定位小件 ＋ 全列重写 ＋ 空槽／落点线）。
 *
 *  为什么有这一件：本件一次落两档骨架，`runtime.ts` 一度到 379 行（本包告警线 350，
 *  `packages/base-render/AGENTS.md`）。按先例先拆再写（兄弟件 `runtime-text.ts` 同一口径）：
 *  · `runtime-text.ts`＝**文案烘法**（模板 → 产出 JS 里那几句函数）；
 *  · 本件＝**两档共用的地基**（常量、`root`／`list`／`row` 定位、序号与位置读数重写、空槽与落点线的建出）；
 *  · `runtime-lift.ts`＝**旧档（`lift` 拿起态）那一支**；`runtime-buttons.ts`＝**新档（`buttons` 按钮排序）那一支**；
 *  · `runtime.ts`＝外壳（幂等、分派、委派、指针手势、首次挂载）＋ 把上面几段拼成一段 IIFE。
 *
 *  **契约**：这里返回的是**几段文本**，不是几个函数——产出的 JS 天然自足（注入页面后模块作用域不在，
 *  形参名与模板串都不在），所以每一段自己带自己的闭合括号；拼法只允许「按顺序相接」。
 *  `PRELUDE_CONSTS`／`PRELUDE_FNS` 报的是**这一支在产出文本里声明了哪些名字**（判据按它对账：
 *  各支用到的名字必须有人声明，漏一个注入页面后就是 `ReferenceError`，而它只在真机那一瞬露头）。
 *  **旧档那一段的字节一个都不改**：搬的只是「住哪个文件」。
 */
import {
  DRAG_SORT_ATTR,
  DRAG_SORT_AT_ATTR,
  DRAG_SORT_BOUND_ATTR,
  DRAG_SORT_CANCEL_ATTR,
  DRAG_SORT_EVENT_CANCEL,
  DRAG_SORT_EVENT_DROP,
  DRAG_SORT_EVENT_PICK,
  DRAG_SORT_FORM_ATTR,
  DRAG_SORT_HANDLE_ATTR,
  DRAG_SORT_KEY_ATTR,
  DRAG_SORT_LIFT_ATTR,
  DRAG_SORT_LINE_ATTR,
  DRAG_SORT_LIST_ATTR,
  DRAG_SORT_MOVE_ATTR,
  DRAG_SORT_MOVE_DOWN,
  DRAG_SORT_MOVE_UP,
  DRAG_SORT_RUNTIME_ATTR,
  DRAG_SORT_SLOT_ATTR,
  DRAG_SORT_STATUS_ATTR,
  DRAG_SORT_TEXT,
  dragSortSlot,
} from './attrs.js';
import { dragSortTextFnLines, TEXT_FNS } from './runtime-text.js';

/** 产出 JS 里的换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** JSON 引号：产出文本里的字符串字面量一律经它。 */
const q = (s: string): string => JSON.stringify(s);

/** 地基声明的**常量名**（产出 JS 里的 `var 名=`）。 */
export const PRELUDE_CONSTS = [
  'A_ROOT', 'A_LIST', 'A_KEY', 'A_HANDLE', 'A_SLOT', 'A_LINE', 'A_STATUS', 'A_CANCEL', 'A_LIFT',
  'A_AT', 'A_BOUND', 'A_RT', 'A_FORM', 'A_MOVE', 'MV_UP', 'MV_DOWN', 'EV_PICK', 'EV_DROP',
  'EV_CANCEL', 'C_ROW', 'C_HANDLE', 'C_INDEX', 'C_NAME', 'C_POS', 'C_SLOT', 'C_DROP', 'C_TEXT',
  'C_MV', 'C_MVUP', 'C_MVDN', 'T_CANCEL', 'doc', 'docEl', 'suppressClick', 'press', 'drag',
] as const;

/** 地基声明的**函数名**（产出 JS 里的 `function 名(`）。 */
export const PRELUDE_FNS = [
  'runtimeOn', 'isButtons', 'fire', 'rootOf', 'listOf', 'rowsOf', 'rowOf', 'handleOf', 'labelOf',
  'statusOf', 'cancelOf', 'slotOf', 'lineOf', 'pointOf', 'atPointer', 'rowAt', 'replaceGrips',
  'repaint', 'buildSlot', 'buildLine', 'placeLine', 'maybeCancel',
] as const;

/** 地基里声明的名字（常量 ＋ 函数）。 */
export const PRELUDE_NAMES = [...PRELUDE_CONSTS, ...PRELUDE_FNS] as const;

/** 各支用到的名字的**登记表类型**：地基声明的 ＋ 本件其余各支声明的。
 *  为什么要一张全表：产出的 JS 是一整段 IIFE，一支里可以直呼另一支的名字（`runtime-lift.ts` 的 `drop`
 *  直呼 `runtime-buttons.ts` 的 `buttonsDrop`）。**谁声明**由各自报（`PRELUDE_NAMES`／`TEXT_FNS`
 *  ／各支自己的表），**谁用到**由各支的 DEPS 报；判据拿两张表对账（漏声明＝注入页面后 `ReferenceError`，
 *  而它只在真机那一瞬露头）。类型住在这一件（最底那一件）是为了不让各支互相 import 成运行时环。 */
export type DeclaredName<Extra extends string = never> =
  | (typeof PRELUDE_NAMES)[number]
  | (typeof TEXT_FNS)[number]['name']
  | 'pick' | 'drop'
  | Extra;

/** 地基那一段：常量 ＋ 幂等闸 ＋ 文案 ＋ 定位小件 ＋ 重写 ＋ 空槽／落点线 ＋ 取消。
 *  两档共用（**这段里只有一处问「哪一档」**：`repaint` 要按档写位置读数与把手名；形态差异其余全在
 *  `runtime-lift.ts`／`runtime-buttons.ts` 与 `runtime.ts` 的分派里）。 */
export function dragSortPreludeJs(): string {
  return ''
    /* ── 常量（全部来自 `attrs.ts`：渲染与运行时读的是同一份事实） ────────────── */
    + '  var A_ROOT=' + q(DRAG_SORT_ATTR) + ', A_LIST=' + q(DRAG_SORT_LIST_ATTR)
    + ', A_KEY=' + q(DRAG_SORT_KEY_ATTR) + ', A_HANDLE=' + q(DRAG_SORT_HANDLE_ATTR) + ';' + LF
    + '  var A_SLOT=' + q(DRAG_SORT_SLOT_ATTR) + ', A_LINE=' + q(DRAG_SORT_LINE_ATTR)
    + ', A_STATUS=' + q(DRAG_SORT_STATUS_ATTR) + ', A_CANCEL=' + q(DRAG_SORT_CANCEL_ATTR) + ';' + LF
    + '  var A_LIFT=' + q(DRAG_SORT_LIFT_ATTR) + ', A_AT=' + q(DRAG_SORT_AT_ATTR)
    + ', A_BOUND=' + q(DRAG_SORT_BOUND_ATTR) + ', A_RT=' + q(DRAG_SORT_RUNTIME_ATTR) + ';' + LF
    + '  var A_FORM=' + q(DRAG_SORT_FORM_ATTR) + ', A_MOVE=' + q(DRAG_SORT_MOVE_ATTR)
    + ', MV_UP=' + q(DRAG_SORT_MOVE_UP) + ', MV_DOWN=' + q(DRAG_SORT_MOVE_DOWN) + ';' + LF
    + '  var EV_PICK=' + q(DRAG_SORT_EVENT_PICK) + ', EV_DROP=' + q(DRAG_SORT_EVENT_DROP)
    + ', EV_CANCEL=' + q(DRAG_SORT_EVENT_CANCEL) + ';' + LF
    + '  var C_ROW=' + q(dragSortSlot('row')) + ', C_HANDLE=' + q(dragSortSlot('handle'))
    + ', C_INDEX=' + q(dragSortSlot('index')) + ', C_NAME=' + q(dragSortSlot('name')) + ';' + LF
    + '  var C_POS=' + q(dragSortSlot('pos')) + ', C_SLOT=' + q(dragSortSlot('slot'))
    + ', C_DROP=' + q(dragSortSlot('drop')) + ', C_TEXT=' + q(dragSortSlot('text')) + ';' + LF
    + '  var C_MV=' + q(dragSortSlot('move')) + ', C_MVUP=' + q(dragSortSlot('move-up'))
    + ', C_MVDN=' + q(dragSortSlot('move-down')) + ';' + LF
    + '  var T_CANCEL=' + q(DRAG_SORT_TEXT.cancel) + ';' + LF
    + '  var doc=document, docEl=doc.documentElement, suppressClick=false, press=null, drag=null;' + LF
    + '  function runtimeOn(){ return docEl.getAttribute(A_RT)==="1"; }' + LF
    + '  if (runtimeOn()) return;' + LF
    + '  docEl.setAttribute(A_RT,"1");' + LF
    /* ── 文案：**烘自 `attrs.ts` 的同一句**（`DRAG_SORT_TEXT` ＋ `dragSortText()`），不是另写一份 ── */
    + dragSortTextFnLines()
    /* ── 形态读数（**只有 `buttons` 档的根上写**：旧档的标记是已落地的契约，一个字节都不加） ── */
    + '  function isButtons(root){ return root.getAttribute(A_FORM)==="buttons"; }' + LF
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
    + '  function rowAt(root,p,lifted){'
    + ' if (!doc.elementFromPoint) return null;'
    + ' var el=doc.elementFromPoint(p.x,p.y);'
    + ' if (!el) return null;'
    /* 空槽就是「原位」：松手时正落在空槽上＝放回原位（与点被拿起那一行自己同一条路）。 */
    + ' if (el.getAttribute(A_SLOT)===lifted) return rowOf(root,lifted);'
    /* 指针下那一行：一路往上找到带行键的那个祖先（落在名称格／按钮／读数上也算它那一行）。 */
    + ' var row=el.closest ? el.closest("["+A_KEY+"]") : null;'
    + ' if (!row || rootOf(row)!==root || row.getAttribute(A_KEY)===lifted) return null;'
    + ' var handle=handleOf(row);'
    + ' return (handle && handle.disabled) ? null : row; }\n'
    /* ── 把手名／位置读数（两档各一套；`lift` 那一套是旧档的字节，原样搬过来） ───── */
    + '  function replaceGrips(root){\n'
    + '    var rows=rowsOf(root);\n'
    + '    for (var i=0;i<rows.length;i+=1){\n'
    + '      var row=rows[i], p=i+1, handle=handleOf(row), pos=row.querySelector("."+C_POS);\n'
    + '      if (pos) pos.textContent = isButtons(root) ? posOne(p) : "第 "+p+" 位，共 "+rows.length+" 步";\n'
    + '      if (handle && !handle.disabled){\n'
    + '        var picked=row.classList.contains("is-picked");\n'
    + '        var lifted=row.classList.contains("is-up");\n'
    + '        handle.setAttribute("aria-label", isButtons(root)\n'
    + '          ? (picked ? gripSelected(p,labelOf(row)) : gripSelect(p,labelOf(row)))\n'
    + '          : (lifted ? gripLift(p,labelOf(row)) : gripPick(p,labelOf(row))));\n'
    + '      }\n'
    + '    }\n'
    + '  }\n'
    /* ── 全列重写（重排之后位变了：序号、位置读数、把手名三处都跟上） ─────────── */
    + '  function repaint(root){\n'
    + '    var rows=rowsOf(root);\n'
    + '    for (var i=0;i<rows.length;i+=1){\n'
    + '      var idx=rows[i].querySelector("."+C_INDEX);\n'
    + '      if (idx) idx.textContent=String(i+1);\n'
    + '    }\n'
    + '    replaceGrips(root);\n'
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
    /* ── 落点线跟着指针挪（旧档拿起态：位随行走，标签与状态句一起跟上） ───────── */
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
    /* ── 取消（两档共用一支：点取消键／再点同一行都是它；顺序原样不动） ─────────
     *  旧档认根上那枚 `A_LIFT`，新档认行上那枚 `is-picked`（新档的根上不写 `A_LIFT`：那是旧档的标记）。 */
    + '  function maybeCancel(root){\n'
    + '    if (!root) return false;\n'
    + '    var key=root.getAttribute(A_LIFT), row=key ? rowOf(root,key) : null;\n'
    + '    if (!row) row=root.querySelector("."+C_ROW+".is-picked");\n'
    + '    if (!row) return false;\n'
    + '    key=row.getAttribute(A_KEY);\n'
    + '    var handle=handleOf(row);\n'
    + '    var slot=slotOf(root), line=lineOf(root);\n'
    + '    if (slot) slot.parentNode.removeChild(slot);\n'
    + '    if (line) line.parentNode.removeChild(line);\n'
    + '    row.classList.remove("is-up"); row.classList.remove("is-picked");'
    + ' row.removeAttribute("aria-current");\n'
    + '    var mv=row.querySelector("."+C_MV); if (mv) mv.parentNode.removeChild(mv);\n'
    + '    if (handle){ handle.removeAttribute("aria-pressed"); }\n'
    + '    root.removeAttribute(A_LIFT); root.removeAttribute(A_AT);\n'
    + '    repaint(root);\n'
    + '    var st=statusOf(root); if (st) st.textContent=idleStatus(rowsOf(root).length);\n'
    + '    var cancelBtn=cancelOf(root); if (cancelBtn) cancelBtn.setAttribute("hidden","");\n'
    + '    fire(root,EV_CANCEL,{id:root.getAttribute(A_ROOT),key:key});\n'
    + '    return true; }\n';
}
