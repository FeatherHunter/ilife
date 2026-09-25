/** drag-sort · **旧档（形态 `lift` 拖拽中）那一支的运行时段**（由 `runtime.ts` 拼进产出的那一大段 IIFE）。
 *
 *  这一档屏上原有的三样照旧：拿起的那一行自己站起来、原位留一个虚线空槽、落点画一条粗线并写出第几位。
 *  这一支里**只放与「拿起／放下」有关的那几个函数**（`pick`／`drop`／`cancelAllExcept`）；两档共用的
 *  「取消」（`maybeCancel`）与分派（`route`／`tryDrop`）住 `runtime.ts`——第二形态也要走它们。
 *
 *  **旧档那一档的字节一个都不改**：搬的只是「住哪个文件」（`runtime.ts` 曾 379 行，本包告警线 350）。
 */
import type { DeclaredName } from './runtime-prelude.js';

/** 这一支声明的**函数名**（判据拿它对账：谁用到的名字都要有人声明）。 */
export const DRAG_SORT_LIFT_FNS = ['pick', 'drop', 'cancelAllExcept'] as const;

/** 这一支用到的名字（地基的 ＋ 兄弟支的；`runtime.ts` 的判据按这张表对账）。 */
export const DRAG_SORT_LIFT_DEPS: readonly DeclaredName<'buttonsPick' | 'buttonsDrop'>[] = [
  'isButtons', 'repaint', 'listOf', 'rowsOf', 'rowOf', 'handleOf', 'statusOf', 'slotOf', 'lineOf',
  'cancelOf', 'labelOf', 'buildSlot', 'buildLine',
  'slotText', 'lineText', 'gripLift', 'buttonsDrop', 'C_DROP', 'C_MV',
];

/** 旧档那一支的产出 JS 文本段（**与地基按顺序相接**；它自己带自己的闭合括号）。 */
export function dragSortLiftFnJs(): string {
  return ''
    /* ── 拿起（真指针松手那一下／合成点击都是这一支；第二形态走 `buttonsPick`） ───── */
    + '  function pick(root,key){'
    + ' if (!root || root.getAttribute(A_LIFT)) return false;'
    + ' if (isButtons(root)) return buttonsPick(root,key);'
    + ' var row=rowOf(root,key);'
    + ' if (!row) return false;'
    + ' var handle=handleOf(row);'
    + ' if (!handle || handle.disabled) return false;'
    + ' cancelAllExcept(root);'
    + ' var rows=rowsOf(root), from=rows.indexOf(row)+1, label=labelOf(row);'
    + ' root.setAttribute(A_LIFT,key); root.setAttribute(A_AT,String(from));'
    + ' row.classList.add("is-up"); row.setAttribute("aria-current","true");'
    + ' handle.setAttribute("aria-pressed","true");'
    + ' handle.setAttribute("aria-label",gripLift(from,label));'
    + ' var list=listOf(root);'
    + ' list.insertBefore(buildLine(doc,from,lineText(from)),row);'
    + ' list.insertBefore(buildSlot(doc,key,slotText(from,label)),row.nextSibling);'
    + ' var st=statusOf(root); if (st) st.textContent=liftStatus(from,label,from);'
    + ' var cancel=cancelOf(root); if (cancel) cancel.removeAttribute("hidden");'
    + ' fire(root,EV_PICK,{id:root.getAttribute(A_ROOT),key:key,from:from});'
    + ' return true; }\n'
    /* ── 放下（点哪一行都放／拖到那一行松手；顺序真动，序号与读数整列重写） ─── */
    + '  function drop(root,targetKey){'
    + ' if (!root) return false;'
    + ' var key=root.getAttribute(A_LIFT);'
    + ' if (!key) return false;'
    + ' if (isButtons(root)){'
    + '  var line=lineOf(root); if (line) line.parentNode.removeChild(line);'
    + '  root.removeAttribute(A_AT);'
    + '  return buttonsDrop(root,targetKey); }'
    + ' var src=rowOf(root,key), target=rowOf(root,targetKey);'
    + ' if (!src || !target || targetKey===key) return false;'
    + ' var targetHandle=handleOf(target);'
    + ' if (targetHandle && targetHandle.disabled) return false;'
    + ' var rows=rowsOf(root), from=rows.indexOf(src)+1;'
    + ' var rest=rows.filter(function(r){ return r.getAttribute(A_KEY)!==key; });'
    + ' var at=rest.indexOf(target);'
    + ' if (at<0) return false;'
    + ' var to=at+1, order=rest.slice(0,at).concat([src],rest.slice(at));'
    + ' var slot=slotOf(root), line=lineOf(root), list=listOf(root);'
    + ' if (slot) slot.parentNode.removeChild(slot);'
    + ' if (line) line.parentNode.removeChild(line);'
    + ' for (var i=0;i<order.length;i+=1) list.appendChild(order[i]);'
    + ' var handle=handleOf(src);'
    + ' src.classList.remove("is-up"); src.removeAttribute("aria-current");'
    + ' if (handle){ handle.removeAttribute("aria-pressed"); }'
    + ' root.removeAttribute(A_LIFT); root.removeAttribute(A_AT);'
    + ' repaint(root);'
    + ' var st=statusOf(root); if (st) st.textContent=idleStatus(order.length);'
    + ' var cancel=cancelOf(root); if (cancel) cancel.setAttribute("hidden","");'
    + ' var keys=order.map(function(r){ return r.getAttribute(A_KEY); });'
    + ' fire(root,EV_DROP,{id:root.getAttribute(A_ROOT),keys:keys,from:from,to:to});'
    + ' return true; }\n'
    /* ── 一块一次：拿起之前先把**别的实例**收掉（全页只许一块挂拿起态） ──── */
    + '  function cancelAllExcept(keep){\n'
    + '    var all=doc.querySelectorAll("["+A_ROOT+"]"), hit=false;\n'
    + '    for (var i=0;i<all.length;i+=1){\n'
    + '      if (all[i]===keep) continue;\n'
    + '      if (maybeCancel(all[i])) hit=true;\n'
    + '    }\n'
    + '    return hit; }\n';
}
