/** drag-sort · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `command-palette/runtime.ts` 同一处分工：模块代码零 DOM，DOM 只在产出的字符串里。
 *  本文件是**外壳**：幂等闸、动作分派、事件委派、指针手势、首次挂载，以及把几段拼成一段 IIFE：
 *  · `runtime-prelude.ts`＝两档共用的地基（常量／定位／全列重写／空槽与落点线／取消一支）；
 *  · `runtime-lift.ts`＝旧档（`lift` 拿起态：拖起行 ＋ 原位空槽 ＋ 落点粗线）；
 *  · `runtime-buttons.ts`＝新档（`buttons` 按钮排序：选中行 ＋ 两半控件 ＋ 贯穿行宽的虚线预告）；
 *  · `runtime-text.ts`＝文案烘法（`DRAG_SORT_TEXT` → 产出 JS 里那几句同名函数）。
 *
 *  行为契约（逐条对应判据）：
 *   · **点一下＝拿起／选中**（不是「按住才拿起」）：`pointerdown` 只记起点与那一行（不动状态），
 *     松手时（`pointerup`）才动——**tap 里不拿起就不会被同一手势的 `click` 取消掉**；
 *     真指针走完 `pointerdown → 动作(pointerup) → click`，浏览器随后合成的那一枚 click 被吞
 *     （`suppressClick`：出手动作那一下置位，紧随其后的合成 click 被它吃掉）。
 *   · **点选是主通路**（触屏上走得通）：旧档点把手拿起 → 再点另一行放下 → 点取消放回原位；
 *     新档点一行选中 → 点两半控件挪一位（再点选中那一行＝取消；点别的行＝改选中）。拖拽（Pointer Events）是
 *     同一份状态的另一条路，**两档都不是「按钮是唯一通路」**；运行时段一行没跑到，静态标记照常可读。
 *   · **放下＝整行**：旧档拿起之后**点哪一行都放**（名称格、读数格、空槽那一片都算那一行），
 *     点被拿起的那一行自己＝放回原位；拖到别的行松手＝放到那一行前面，拖出这一张＝什么都不做（拿起态留着）。
 *   · **同一次只拿起／选中一行、一块**：动作之前先把**别的实例**收掉（全页只许一块挂着）。
 *   · **拖拽按「按下那个根」绑定**：指针手势记的是按下时那个根元素，同 `id` 两张清单不会串。
 *   · **松手（放下／取消）才报数**：拿起报 `ilife:drag-sort-pick`，放下报
 *     `ilife:drag-sort-drop`（带放下后的全序 `keys`），取消报 `ilife:drag-sort-cancel`；
 *     **新档的「上移／下移」也报 `ilife:drag-sort-drop`**（带全序 `keys` 与 `move:"up"|"down"`）：
 *     一次挪位就是一次顺序改动，调用方按同一个事件写库。本件不写库。
 *   · **只动节点不重建**：拿起时建出空槽与落点线（位随行走），放下／取消时撤掉；
 *     放下后重排整列行节点的 DOM 顺序并重写序号与位置读数（不重建行节点——重建会把焦点打断）。
 *   · **文案同源**：状态句／空槽句／落点句／把手名／两半控件上那两个字都烘自 `attrs.ts` 的
 *     `dragSortText()`（渲染期读同一个函数），**这里不许再写一份字面量**。
 *   · **幂等**：`<html>` 上一枚 `data-ilife-drag-runtime` 拦住重复注入；根上记一枚 bound 读数。
 */
import { DRAG_SORT_ATTR, DRAG_SORT_BOUND_ATTR, DRAG_SORT_LIFT_ATTR } from './attrs.js';
import { dragSortButtonsFnJs } from './runtime-buttons.js';
import { dragSortLiftFnJs } from './runtime-lift.js';
import { dragSortPreludeJs } from './runtime-prelude.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进自己的脚本槽）。 */
export function buildDragSortJs(): string {
  return '(function(){' + '\n'
    + dragSortPreludeJs()
    + dragSortLiftFnJs()
    + dragSortButtonsFnJs()
    /* ── 动作分派（点／松手两条路都走它：拿起、放下、取消各只有一个入口） ───── */
    + '  function route(root,key,lifted){\n'
    + '    if (!lifted) return pick(root,key);\n'
    + '    if (lifted===key) return maybeCancel(root);\n'
    + '    return tryDrop(root,key,lifted); }\n'
    + '  function tryDrop(root,key,lifted){\n'
    + '    if (!key) return false;\n'
    + '    var target=rowOf(root,key);\n'
    + '    if (!target) return false;\n'
    + '    var handle=handleOf(target);\n'
    + '    if (handle && handle.disabled) return false;\n'
    + '    return drop(root,key); }\n'
    /* ── 真指针走完一段手势：松手那一下按「指针当下压在谁身上」决定干什么 ─────────
     *  **按下时记的是那一行**（原来记的是根：于是「松手还在这一张里」恒为真，同页拖到另一行松手
     *  被当成「点自己」→ 取消，拖拽那条路根本没落地）。四条出口：
     *   · 松手在**别的一行**上（点它／拖到它）＝放到那一行去（`tryDrop`）；
     *   · 松手在**空槽**上（＝原位）＝取消放回（空槽在 `rowAt` 里折成被拿起那一行）；
     *   · 松手在**被拿起那一行自己**身上、且这一路没挪过＝取消（再点同一行＝放回原位）；
     *   · 松手在这一张之外（别的实例／页面别处）＝什么都不做（拿起态留着）。
     *  新档那一档的「点另一行」不算放：那是**改选中**，由 `click` 那一支管（这里让路）。 */
    + '  function dragCommit(root,was,e){\n'
    + '    var lifted=root.getAttribute(A_LIFT);\n'
    + '    var moved=!!drag; drag=null;\n'
    + '    if (!lifted){ if (was.handle) return route(root,was.handle.getAttribute(A_HANDLE),null);'
    + ' return false; }\n'
    + '    var t=e.target, row=t&&t.closest ? t.closest("["+A_KEY+"]") : null;\n'
    + '    var onPressed=!!(was.row && row===was.row);\n'
    + '    if (was.cursor){\n'
    + '      var hit=rowAt(root,atPointer(was.cursor),lifted);\n'
    + '      if (hit){\n'
    + '        var hk=hit.getAttribute(A_KEY);\n'
    + '        return hk===lifted ? maybeCancel(root) : tryDrop(root,hk,lifted); }\n'
    + '    }\n'
    + '    if (moved || !onPressed) return false;\n'
    + '    if (was.row && was.row.getAttribute(A_KEY)===lifted) return maybeCancel(root);\n'
    + '    return isButtons(root) ? false : tryDrop(root,was.row.getAttribute(A_KEY),lifted); }\n'
    /* ── 委派：点选主通路（点一行拿起／选中；拿着之后点另一行＝放下或改选中） ───── */
    + '  doc.addEventListener("click",function(e){\n'
    + '    if (suppressClick){ suppressClick=false; return; }\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.closest) return;\n'
    + '    var cancelBtn=t.closest("["+A_CANCEL+"]");\n'
    + '    if (cancelBtn){ var rc=rootOf(cancelBtn); if (rc) maybeCancel(rc); return; }\n'
    + '    var row=t.closest("["+A_KEY+"]");\n'
    + '    if (!row) return;\n'
    + '    var root=rootOf(row), handle=t.closest("["+A_HANDLE+"]");\n'
    + '    if (!root) return;\n'
    + '    var moveBtn=t.closest("["+A_MOVE+"]");\n'
    + '    if (moveBtn){ buttonsMove(root,row,moveBtn.getAttribute(A_MOVE)); return; }\n'
    /* 新档那一路：点一行＝选中它（再点同一行＝取消）。**它不「点哪一行都放」**——那一档的放由拖拽那条路
       与两半控件给（把「点一行」留着改选中，才叫「选中一行 → 上下移」）。 */
    + '    if (isButtons(root)){\n'
    + '      if (root.getAttribute(A_LIFT)===row.getAttribute(A_KEY)) maybeCancel(root);\n'
    + '      else buttonsPick(root,row.getAttribute(A_KEY));\n'
    + '      return; }\n'
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
    + '    press={root:root,row:handle.closest("["+A_KEY+"]"),handle:handle,cursor:pointOf(e),lifted:root.getAttribute(A_LIFT)};\n'
    + '    if (e.pointerId!==undefined && handle.setPointerCapture){\n'
    + '      try{ handle.setPointerCapture(e.pointerId); }catch(c){}\n'
    + '    }\n'
    + '  });\n'
    + '  doc.addEventListener("pointermove",function(e){\n'
    + '    if (!press || (e.isPrimary!==undefined && !e.isPrimary)) return;\n'
    + '    var root=press.root;\n'
    + '    if (!root) return;\n'
    + '    var lifted=root.getAttribute(A_LIFT);\n'
    + '    if (!lifted) return;\n'
    + '    press.cursor={x:e.clientX,y:e.clientY};\n'
    + '    var row=rowAt(root,press.cursor,lifted);\n'
    /* 只认「指针下是这一张里的某一行」；`rowAt` 已经把别的实例、锁定的行、被拿起那一行自己滤掉了。
       原来这里还有一枚 `t.closest("["+A_HANDLE+"]")`（`t` 是**没声明的标识符**——它只在 click 那一支里
       `var t=e.target`）→ 真机上一落到行自己的裸区就抛 `ReferenceError: t is not defined`，
       落点线再也不跟手（2026-09 实测读数：`Uncaught ReferenceError: t is not defined`）。 */
    + '    if (!row) return;\n'
    /* 落在被拿起那一行自己／空槽上（`rowAt` 把空槽折成它上一行）＝原位，不画线。 */
    + '    if (row.getAttribute(A_KEY)===lifted) return;\n'
    + '    var rows=rowsOf(root);\n'
    + '    var rest=rows.filter(function(r){ return r.getAttribute(A_KEY)!==lifted; });\n'
    + '    var at=rest.indexOf(row)+1;\n'
    + '    if (at>=1 && String(at)!==root.getAttribute(A_AT)){'
    + ' drag=true;'
    + ' if (isButtons(root)) placeButtonsLine(root,at); else placeLine(root,at); }\n'
    + '  });\n'
    + '  function endPress(e){\n'
    + '    if (!press) return;\n'
    + '    var was=press; press=null;\n'
    + '    var root=was.root;\n'
    + '    if (!root) return;\n'
    + '    if (dragCommit(root,was,e)) suppressClick=true;\n'
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

/** 产出的 JS 文本会引用到的**本件锚**（判据按它对账：锚与 `attrs.ts` 同源，不另抄一份字面量）。 */
export const DRAG_SORT_RUNTIME_ANCHORS = [
  DRAG_SORT_ATTR, DRAG_SORT_BOUND_ATTR, DRAG_SORT_LIFT_ATTR,
] as const;

/** 外壳（本文件）声明的函数名 ＋ 它用到的各支名字：**给判据点名，不给产出文本加一个字节**。 */
export const DRAG_SORT_SHELL_FNS = [
  'route', 'tryDrop', 'dragCommit', 'endPress',
] as const;

/** 外壳用到的名字（各支的 ＋ 它自己声明的；`buildDragSortJs()` 里每一处引用都在这里报一次）。 */
export const DRAG_SORT_SHELL_DEPS: readonly string[] = [
  ...DRAG_SORT_SHELL_FNS,
  'doc', 'suppressClick', 'press', 'drag', 'A_KEY', 'A_LIFT', 'A_AT', 'A_CANCEL', 'A_HANDLE', 'A_MOVE',
  'A_ROOT', 'A_SLOT', 'A_BOUND', 'isButtons', 'rootOf', 'rowOf', 'handleOf', 'rowsOf', 'rowAt',
  'pointOf', 'atPointer', 'maybeCancel', 'placeLine', 'placeButtonsLine', 'repaint', 'pick', 'drop',
  'buttonsMove', 'buttonsPick', 'cancelAllExcept',
];
