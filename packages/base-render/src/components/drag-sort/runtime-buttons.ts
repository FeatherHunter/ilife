/** drag-sort · **第二形态（`buttons` 按钮排序）那一支的运行时段**（由 `runtime.ts` 拼进产出的那一大段 IIFE）。
 *
 *  这一档在屏上只做四件事（用户口径：一屏只留一层话、同一个数只印一次）：
 *   · **点一行选中**（把手只有字形）——选中那一行站起来（`is-picked`：投影 ＋ 强调描边，不许只靠颜色）；
 *   · 行尾长出**一颗两半控件**（「上移」｜「下移」各 58×44 的真按钮），点哪半边就哪半边生效；
 *   · 挪完顺序**真动**（相邻两行换位），整列序号与位置读数跟着重写；
 *   · 落点那一位上停一条**贯穿行宽的虚线预告**，写出会落到第几位（`role="status"` 的活读数）——
 *     按下之前先看得到结果，**不另写状态句、不画空槽、不搬原型上的旁白**。
 *
 *  **两条通路都在**：点两半控件是这一档的主路；把手那条**拖拽**（Pointer Events）同样走得通——
 *  拿起之后拖到别的行松手＝按那里重排（与旧档同一支 `drop`）。两半控件不是唯一通路。
 *
 *  **状态只有一份**：选中＝那一行挂 `is-picked`（两半控件按它现长出来，运行时段不另存一份序号——
 *  所以重排之后三处读数只能靠 `repaint()` 重写，不能各自记一份）。
 *  **`move` 的上下界现读 DOM**：上一位／下一位就是 `previousElementSibling`／`nextElementSibling`，
 *  自己锁定、或要换过去的那一行锁定＝按不动（那半边 `disabled`）。
 *  **根上不写 `A_LIFT`**（那是旧档的标记：写上去等于给旧档的读法加一个字节）——`maybeCancel` 按
 *  `is-picked` 找这一档被选中的行。
 */
import type { DeclaredName } from './runtime-prelude.js';

/** 这一支声明的**函数名**（判据拿它对账：谁用到的名字都要有人声明）。 */
export const DRAG_SORT_BUTTONS_FNS = [
  'prevRow', 'nextRow', 'buttonsPick', 'moveBoxOf', 'moveBox', 'halfEl', 'buttonsRig',
  'buttonsPreview', 'placeButtonsLine', 'buttonsMove', 'buttonsDrop',
] as const;

/** 这一支用到的名字（地基的 ＋ 兄弟支的；`runtime.ts` 的判据按这张表对账）。 */
export const DRAG_SORT_BUTTONS_DEPS: readonly DeclaredName[] = [
  'isButtons', 'repaint', 'listOf', 'rowsOf', 'rowOf', 'handleOf', 'lineOf', 'slotOf', 'cancelOf',
  'labelOf', 'buildLine', 'fire', 'gripSelected', 'previewText', 'moveUp', 'moveDown', 'moveUpName',
  'moveDownName', 'C_MV', 'C_MVUP', 'C_MVDN',
];

/** 第二形态那一支的产出 JS 文本段（**与地基按顺序相接**；它自己带自己的闭合括号）。 */
export function dragSortButtonsFnJs(): string {
  return ''
    /* ── 相邻两行：上一位／下一位（这一档的 move 按它认界） ─────────────────────
     *  **只认带行键的兄弟**：这一档会把虚线预告插进行区（选中行前面或后面），
     *  于是 `previousElementSibling` 可能是那条线而不是一行——不跳过它，「到头了」会错判成两半都按不动。 */
    + '  function prevRow(row){ var el=row.previousElementSibling;'
    + ' while (el && !(el.getAttribute && el.getAttribute(A_KEY))) el=el.previousElementSibling;'
    + ' return el || null; }\n'
    + '  function nextRow(row){ var el=row.nextElementSibling;'
    + ' while (el && !(el.getAttribute && el.getAttribute(A_KEY))) el=el.nextElementSibling;'
    + ' return el || null; }\n'
    /* ── 选中：点一行＝选中它（再点同一行＝取消）；两半控件在这一行上现长出来 ─────── */
    + '  function buttonsPick(root,key){'
    + ' if (!root || !key) return false;'
    + ' var row=rowOf(root,key);'
    + ' if (!row) return false;'
    + ' var handle=handleOf(row);'
    + ' if (!handle || handle.disabled) return false;'
    + ' cancelAllExcept(root);'
    + ' var rows=rowsOf(root), from=rows.indexOf(row)+1;'
    + ' root.setAttribute(A_LIFT,key);'
    + ' row.classList.add("is-picked"); row.setAttribute("aria-current","true");'
    + ' handle.setAttribute("aria-pressed","true");'
    + ' handle.setAttribute("aria-label",gripSelected(from,labelOf(row)));'
    + ' buttonsRig(root,row);'
    + ' buttonsPreview(root);'
    + ' fire(root,EV_PICK,{id:root.getAttribute(A_ROOT),key:key,from:from});'
    + ' return true; }\n'
    /* ── 两半控件：**一颗**（一个外框两半），只挂在被选中那一行上（不是每行都挂） ─── */
    + '  function moveBoxOf(row){ return row.querySelector("."+C_MV); }\n'
    + '  function moveBox(row){'
    + ' var box=moveBoxOf(row);'
    + ' if (box) return box;'
    + ' box=doc.createElement("span"); box.setAttribute("class",C_MV);'
    + ' row.appendChild(box);'
    + ' return box; }\n'
    + '  function halfEl(box,side,fn){'
    + ' var el=box.querySelector("."+(side===MV_UP ? C_MVUP : C_MVDN));'
    + ' if (el) return el;'
    + ' el=doc.createElement("button"); el.setAttribute("type","button");'
    + ' el.setAttribute("class", side===MV_UP ? C_MVUP : C_MVDN); el.setAttribute(A_MOVE,side);'
    + ' el.addEventListener("click",fn);'
    + ' box.appendChild(el);'
    + ' return el; }\n'
    /* 两半的可用性现读 DOM：相邻那一位在不在、自己与它锁没锁（按不动就 `disabled`）。 */
    + '  function buttonsRig(root,row){'
    + ' var up=prevRow(row), down=nextRow(row), handle=handleOf(row);'
    + ' var ok=handle && !handle.disabled;'
    + ' var upOk=!!(ok && up && !handleOf(up).disabled);'
    + ' var downOk=!!(ok && down && !handleOf(down).disabled);'
    + ' var box=moveBox(row), label=labelOf(row);'
    + ' var a=halfEl(box,MV_UP,function(){ buttonsMove(root,row,MV_UP); });'
    + ' var b=halfEl(box,MV_DOWN,function(){ buttonsMove(root,row,MV_DOWN); });'
    + ' a.textContent=moveUp(); b.textContent=moveDown();'
    + ' a.setAttribute("aria-label",moveUpName(label)); b.setAttribute("aria-label",moveDownName(label));'
    + ' if (upOk) a.removeAttribute("disabled"); else a.setAttribute("disabled","");'
    + ' if (downOk) b.removeAttribute("disabled"); else b.setAttribute("disabled","");'
    + ' return {upOk:upOk,downOk:downOk}; }\n'
    /* ── 虚线落点预告：停在「下一挪会落到的那一位」——能上移就停在选中行前面（第 n−1 位）， */
    /*    到头了就停在选中行后面（第 n+1 位），两边都挪不动就没有预告（撤掉那条线）。 */
    + '  function buttonsPreview(root){'
    + ' var row=rowOf(root,root.getAttribute(A_LIFT));'
    + ' if (!row) return;'
    + ' var pos=rowsOf(root).indexOf(row)+1, line=lineOf(root), list=listOf(root);'
    + ' var r=buttonsRig(root,row);'
    + ' var hit=null;'
    + ' if (r.upOk) hit={where:pos-1,before:row};'
    + ' else if (r.downOk) hit={where:pos+1,after:row};'
    + ' if (!hit){ if (line) line.parentNode.removeChild(line); root.removeAttribute(A_AT); return; }'
    + ' if (!line){ line=buildLine(doc,hit.where,previewText(hit.where)); list.appendChild(line); }'
    + ' line.setAttribute(A_LINE,String(hit.where));'
    + ' var cap=line.querySelector("b"); if (cap) cap.textContent=previewText(hit.where);'
    + ' if (hit.before) list.insertBefore(line,hit.before);'
    + ' else list.insertBefore(line,hit.after.nextSibling);'
    + ' root.setAttribute(A_AT,String(hit.where)); }\n'
    /* ── 拖拽那条路挪动时，虚线预告跟着指针停在落点那一位（与旧档同一处几何：停在那一行前面） ── */
    + '  function placeButtonsLine(root,at){'
    + ' var rows=rowsOf(root), line=lineOf(root);'
    + ' if (!line || at<1 || at>rows.length) return;'
    + ' line.setAttribute(A_LINE,String(at));'
    + ' var cap=line.querySelector("b"); if (cap) cap.textContent=previewText(at);'
    + ' listOf(root).insertBefore(line,rows[at-1]);'
    + ' root.setAttribute(A_AT,String(at)); }\n'
    /* ── 点哪半边就哪半边生效：相邻两行换位（顺序真动），整列重写后预告跟着走 ───── */
    + '  function buttonsMove(root,row,side){'
    + ' if (!root || !row) return false;'
    + ' var other = side===MV_UP ? prevRow(row) : nextRow(row);'
    + ' if (!other) return false;'
    + ' var hp=handleOf(row), ho=handleOf(other);'
    + ' if ((hp && hp.disabled) || (ho && ho.disabled)) return false;'
    + ' var list=listOf(root), from=rowsOf(root).indexOf(row)+1;'
    + ' var to = side===MV_UP ? from-1 : from+1;'
    + ' if (side===MV_UP) list.insertBefore(row,other); else list.insertBefore(other,row);'
    + ' repaint(root);'
    + ' buttonsPreview(root);'
    + ' fire(root,EV_DROP,{id:root.getAttribute(A_ROOT),keys:rowsOf(root).map(function(r){'
    + ' return r.getAttribute(A_KEY); }),from:from,to:to,move:side});'
    + ' return true; }\n'
    /* ── 拖拽那条路落在这一档：按落点那一位重排（与旧档同一支口径），收起选中 ─────── */
    + '  function buttonsDrop(root,targetKey){'
    + ' var row=rowOf(root,root.getAttribute(A_LIFT));'
    + ' if (!row) return false;'
    + ' var target=rowOf(root,targetKey);'
    + ' if (!target) return false;'
    + ' var th=handleOf(target);'
    + ' if (th && th.disabled) return false;'
    + ' var rows=rowsOf(root), from=rows.indexOf(row)+1;'
    + ' var rest=rows.filter(function(r){ return r.getAttribute(A_KEY)!==row.getAttribute(A_KEY); });'
    + ' var at=rest.indexOf(target);'
    + ' if (at<0) return false;'
    /* 放到**目标那一行前面**（与旧档 `drop` 同一处口径：`at` 是"去掉自己之后"的位）。
       原来这里是 `rest.push(row)` 再整列 append——往上一拖会掉到末位（真机 2026-09 实测读数）。 */
    + ' var order=rest.slice(0,at).concat([row],rest.slice(at));'
    + ' var to=at+1, list=listOf(root);'
    + ' for (var i=0;i<order.length;i+=1) list.appendChild(order[i]);'
    + ' row.classList.remove("is-picked"); row.removeAttribute("aria-current");'
    + ' var h=handleOf(row); if (h) h.removeAttribute("aria-pressed");'
    + ' var line=lineOf(root), slot=slotOf(root);'
    + ' if (line) line.parentNode.removeChild(line);'
    + ' if (slot) slot.parentNode.removeChild(slot);'
    + ' repaint(root);'
    + ' var cancel=cancelOf(root); if (cancel) cancel.setAttribute("hidden","");'
    + ' fire(root,EV_DROP,{id:root.getAttribute(A_ROOT),keys:rowsOf(root).map(function(r){'
    + ' return r.getAttribute(A_KEY); }),from:from,to:to});'
    + ' return true; }\n';
}
