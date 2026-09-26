/** quick-capture · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  行为契约（逐条对应判据）：
 *   · **一句话变了**：输入框上一枚委派的 `input` ⇒ 把这句话的**机器读数**（根上的 `data-*`）与输入框里的字
 *     一起写，再派发 `ilife:quick-capture-change`（`detail={id,text}`）。**本件不猜词**：
 *     一句话怎么拆成几格由页面重算并重渲染（词表住在各技能里，件不重算别的格）。
 *   · **点某一格 ⇒ 摊开那一格的候选带**：其余格的带先收（一屏只留一层话，一次只摊开一格）；
 *     那一格挂 `is-open` ＋ `aria-expanded="true"`。再点一下＝收起。
 *   · **点一枚候选 ⇒ 那一格改掉**：机器读数（`data-value`）、屏上读数（`-to` 那一格的字）、
 *     候选带里那一枚的选中态（`is-on` ＋ `aria-current` ＋ 勾）**三处一起翻**，然后收起、派发
 *     `ilife:quick-capture-pick`（`detail={id,key,value,to}`）。
 *     「哪一枚是现在这一枚」与渲染期跑的是**同一份源码**（`quickCaptureChoiceOn()` 的 `toString()`）。
 *   · **点「不改」＝取消**：只收起那一格的带，**值一动不动、一条事件都不派**（没变化就不报数）。
 *   · **点「存」**：派发 `ilife:quick-capture-save`（`detail={id,text,cells}`，`cells` 顺序＝屏上顺序）；
 *     本件**不写库**，写库归页面。**点「分开填」**：形态 `oneline` 派发 `ilife:quick-capture-split`
 *     （`detail={id,text}`，开表单归页面）；形态 `drawer` 它就是**抽屉开关**——摊开／收起抽屉，
 *     再派发同一条事件（`detail` 多一枚 `open`＝现在摊开着没有），收起抽屉时先把摊开的候选带收掉。
 *   · **点记过的一条**：把那一句填回输入框（机器读数一起写）＋ 派发同一条 `change`（不用打字也能换一句话）。
 *   · **幂等**：`<html>` 上一枚 `data-ilife-quick-capture-runtime` 拦住重复注入；每张卡上记一枚 bound 读数。
 *   · **零键盘通路**：这一段不接任何键盘事件（`:focus-visible` 只是真实键盘用户的地板）。
 */
import {
  QUICK_CAPTURE_ATTR,
  QUICK_CAPTURE_BOUND_ATTR,
  QUICK_CAPTURE_BOX_ATTR,
  QUICK_CAPTURE_CELL_ATTR,
  QUICK_CAPTURE_DRAWER_ATTR,
  QUICK_CAPTURE_EVENT_CHANGE,
  QUICK_CAPTURE_EVENT_PICK,
  QUICK_CAPTURE_EVENT_SAVE,
  QUICK_CAPTURE_EVENT_SPLIT,
  QUICK_CAPTURE_KEEP_ATTR,
  QUICK_CAPTURE_PICK_ATTR,
  QUICK_CAPTURE_READ_ATTR,
  QUICK_CAPTURE_RECALL_ATTR,
  QUICK_CAPTURE_RUNTIME_ATTR,
  QUICK_CAPTURE_SAVE_ATTR,
  QUICK_CAPTURE_SPLIT_ATTR,
  QUICK_CAPTURE_TEXT_ATTR,
  QUICK_CAPTURE_TRAY_ATTR,
  QUICK_CAPTURE_VALUE_ATTR,
  quickCaptureChoiceOn,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进自己的脚本槽）。 */
export function buildQuickCaptureJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var A_ROOT=' + q(QUICK_CAPTURE_ATTR) + ', A_BOX=' + q(QUICK_CAPTURE_BOX_ATTR)
    + ', A_TEXT=' + q(QUICK_CAPTURE_TEXT_ATTR) + ';' + '\n'
    + '  var A_CELL=' + q(QUICK_CAPTURE_CELL_ATTR) + ', A_VALUE=' + q(QUICK_CAPTURE_VALUE_ATTR)
    + ', A_READ=' + q(QUICK_CAPTURE_READ_ATTR) + ';' + '\n'
    + '  var A_TRAY=' + q(QUICK_CAPTURE_TRAY_ATTR) + ', A_PICK=' + q(QUICK_CAPTURE_PICK_ATTR)
    + ', A_KEEP=' + q(QUICK_CAPTURE_KEEP_ATTR) + ';' + '\n'
    + '  var A_SAVE=' + q(QUICK_CAPTURE_SAVE_ATTR) + ', A_SPLIT=' + q(QUICK_CAPTURE_SPLIT_ATTR)
    + ', A_RECALL=' + q(QUICK_CAPTURE_RECALL_ATTR) + ';' + '\n'
    + '  var A_BOUND=' + q(QUICK_CAPTURE_BOUND_ATTR) + ', A_RT=' + q(QUICK_CAPTURE_RUNTIME_ATTR)
    + ', A_DRAWER=' + q(QUICK_CAPTURE_DRAWER_ATTR) + ';' + '\n'
    + '  var EV_TEXT=' + q(QUICK_CAPTURE_EVENT_CHANGE) + ', EV_PICK=' + q(QUICK_CAPTURE_EVENT_PICK)
    + ', EV_SAVE=' + q(QUICK_CAPTURE_EVENT_SAVE) + ', EV_SPLIT=' + q(QUICK_CAPTURE_EVENT_SPLIT) + ';' + '\n'
    + '  var ON="is-on", OPEN="is-open", HID="hidden", TRUE="true", FALSE="false";' + '\n'
    /* 这份口径的**唯一正本**：渲染期标「哪一枚是现在这一枚」跑的就是它，这里嵌的也是同一份源码。 */
    + '  var ON_OF=' + quickCaptureChoiceOn.toString() + ';' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute(A_RT)==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute(A_RT,"1");' + '\n'
    + '  function fire(el,name,detail){ el.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail})); }\n'
    + '  function rootOf(el){ return (el && el.closest) ? el.closest("["+A_ROOT+"]") : null; }\n'
    + '  function idOf(root){ return root.getAttribute(A_ROOT); }\n'
    + '  function list(root,sel){ return [].slice.call(root.querySelectorAll(sel)); }\n'
    /* 按 `data-*` 的值找元素（**不拼属性选择器**：那一路要在生成的串里套引号，极易写歪）。 */
    + '  function one(root,sel,attr,want){\n'
    + '    var found=list(root,sel), i;\n'
    + '    for (i=0;i<found.length;i+=1) if (found[i].getAttribute(attr)===want) return found[i];\n'
    + '    return null;\n'
    + '  }\n'
    /* 一句话的机器读数与输入框里的字是**同一件事的两处摆法**：一起写（渲染期也写这两处）。 */
    + '  function putText(root,text){\n'
    + '    root.setAttribute(A_TEXT,text);\n'
    + '    var box=root.querySelector("["+A_BOX+"]");\n'
    + '    if (box) box.value=text;\n'
    + '    return text;\n'
    + '  }\n'
    + '  function textOf(root){\n'
    + '    var box=root.querySelector("["+A_BOX+"]");\n'
    + '    return box ? String(box.value) : (root.getAttribute(A_TEXT)||"");\n'
    + '  }\n'
    /* 摊开一格：其余格的带先收（一屏只留一层话，一次只摊开一格）。空键＝一格都不摊。 */
    + '  function open(root,cellKey){\n'
    + '    var trays=list(root,"["+A_TRAY+"]"), cells=list(root,"["+A_CELL+"]"), i;\n'
    + '    for (i=0;i<trays.length;i+=1){\n'
    + '      if (trays[i].getAttribute(A_TRAY)===cellKey) trays[i].removeAttribute(HID);\n'
    + '      else trays[i].setAttribute(HID,"");\n'
    + '    }\n'
    + '    for (i=0;i<cells.length;i+=1){\n'
    + '      var here=(cells[i].getAttribute(A_CELL)===cellKey);\n'
    + '      cells[i].setAttribute("aria-expanded", here ? TRUE : FALSE);\n'
    + '      if (here) cells[i].classList.add(OPEN); else cells[i].classList.remove(OPEN);\n'
    + '    }\n'
    + '  }\n'
    + '  function shut(root){ open(root,""); }\n'
    /* 一格改成某一枚：机器读数、屏上读数、候选带里那一枚的选中态**三处一起翻**（只改一处 = 屏上自相矛盾）。 */
    + '  function pick(root,cell,key,label){\n'
    + '    cell.setAttribute(A_VALUE,key);\n'
    + '    var read=cell.querySelector("["+A_READ+"]");\n'
    + '    if (read) read.textContent=label;\n'
    + '    var tray=one(root,"["+A_TRAY+"]",A_TRAY,cell.getAttribute(A_CELL));\n'
    + '    if (tray){\n'
    + '      var btns=list(tray,"["+A_PICK+"]"), keys=[], i;\n'
    + '      for (i=0;i<btns.length;i+=1) keys.push(btns[i].getAttribute(A_PICK));\n'
    + '      var onChoice=ON_OF(keys,key);\n'
    + '      for (i=0;i<btns.length;i+=1){\n'
    + '        var here=(btns[i].getAttribute(A_PICK)===onChoice);\n'
    + '        if (here){ btns[i].classList.add(ON); btns[i].setAttribute("aria-current",TRUE); }\n'
    + '        else { btns[i].classList.remove(ON); btns[i].removeAttribute("aria-current"); }\n'
    + '      }\n'
    + '    }\n'
    + '    shut(root);\n'
    + '    fire(root,EV_PICK,{id:idOf(root),key:cell.getAttribute(A_CELL),value:key,to:label});\n'
    + '  }\n'
    /* 存出去的那一份读数：一句话 ＋ 每一格现在认成了什么（顺序＝屏上顺序，不从字面反推机器键）。 */
    + '  function draft(root){\n'
    + '    var cells=list(root,"["+A_CELL+"]"), out=[], i;\n'
    + '    for (i=0;i<cells.length;i+=1){\n'
    + '      var read=cells[i].querySelector("["+A_READ+"]");\n'
    + '      out.push({key:cells[i].getAttribute(A_CELL), value:cells[i].getAttribute(A_VALUE),'
    + ' to: read ? (read.textContent||"") : ""});\n'
    + '    }\n'
    + '    return out;\n'
    + '  }\n'
    + '  doc.addEventListener("input",function(e){\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.hasAttribute || !t.hasAttribute(A_BOX)) return;\n'
    + '    var root=rootOf(t); if (!root) return;\n'
    + '    var said=String(t.value);\n'
    + '    root.setAttribute(A_TEXT,said);\n'
    + '    fire(root,EV_TEXT,{id:idOf(root),text:said});\n'
    + '  });\n'
    + '  doc.addEventListener("click",function(e){\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.closest) return;\n'
    + '    var recall=t.closest("["+A_RECALL+"]");\n'
    + '    if (recall){\n'
    + '      var rr=rootOf(recall); if (!rr) return;\n'
    + '      fire(rr,EV_TEXT,{id:idOf(rr),text:putText(rr, recall.textContent||"")});\n'
    + '      return;\n'
    + '    }\n'
    + '    var save=t.closest("["+A_SAVE+"]");\n'
    + '    if (save){\n'
    + '      var rs=rootOf(save); if (!rs) return;\n'
    + '      fire(rs,EV_SAVE,{id:idOf(rs),text:textOf(rs),cells:draft(rs)});\n'
    + '      return;\n'
    + '    }\n'
    + '    var split=t.closest("["+A_SPLIT+"]");\n'
    + '    if (split){\n'
    + '      var rp=rootOf(split); if (!rp) return;\n'
    /* 形态 `drawer`：这一枚就是**抽屉开关**——摊开／收起抽屉、aria-expanded 与 is-open 一起翻，
       再派发同一条 split 事件（`detail` 多一枚 `open`＝现在摊开着没有）。形态 `oneline` 不带抽屉，
       照旧只报一件事（那一路的 `detail` 逐字不变）。 */
    + '      var drawer=rp.querySelector("["+A_DRAWER+"]");\n'
    + '      if (drawer){\n'
    + '        var now=drawer.hasAttribute(HID);\n'
    + '        if (now) drawer.removeAttribute(HID); else drawer.setAttribute(HID,"");\n'
    + '        split.setAttribute("aria-expanded", now ? TRUE : FALSE);\n'
    + '        if (now) split.classList.add(OPEN); else split.classList.remove(OPEN);\n'
    /* 摊开也好收起也好，先把摊开的候选带收掉（一屏只留一层话：抽屉一动，带子不留在半空）。 */
    + '        shut(rp);\n'
    + '        fire(rp,EV_SPLIT,{id:idOf(rp),text:textOf(rp),open:now});\n'
    + '        return;\n'
    + '      }\n'
    + '      fire(rp,EV_SPLIT,{id:idOf(rp),text:textOf(rp)});\n'
    + '      return;\n'
    + '    }\n'
    /* 「不改」＝取消：只收起那一格的带，值一动不动（没变化就不报数）。这一支要在候选之前认， */
    /* 因为「不改」与候选同住一条带里。 */
    + '    var keep=t.closest("["+A_KEEP+"]");\n'
    + '    if (keep){\n'
    + '      var rk=rootOf(keep); if (!rk) return;\n'
    + '      shut(rk);\n'
    + '      return;\n'
    + '    }\n'
    + '    var opt=t.closest("["+A_PICK+"]");\n'
    + '    if (opt){\n'
    + '      var ro=rootOf(opt); if (!ro) return;\n'
    + '      var tray=opt.closest("["+A_TRAY+"]"); if (!tray) return;\n'
    + '      var cell=one(ro,"["+A_CELL+"]",A_CELL,tray.getAttribute(A_TRAY));\n'
    + '      if (!cell) return;\n'
    /* 一枚候选屏上那一串就是它自己的字（运行时只搬这一处，不重算别的格）。 */
    + '      pick(ro,cell,opt.getAttribute(A_PICK),opt.textContent||"");\n'
    + '      return;\n'
    + '    }\n'
    + '    var chip=t.closest("["+A_CELL+"]");\n'
    + '    if (chip){\n'
    + '      var rc=rootOf(chip); if (!rc) return;\n'
    + '      var ck=chip.getAttribute(A_CELL);\n'
    + '      var mine=one(rc,"["+A_TRAY+"]",A_TRAY,ck);\n'
    + '      if (!mine) return;\n'
    + '      if (mine.hasAttribute(HID)) open(rc,ck); else shut(rc);\n'
    + '      return;\n'
    + '    }\n'
    + '  });\n'
    + '  var roots=doc.querySelectorAll("["+A_ROOT+"]");\n'
    + '  for (var i=0;i<roots.length;i+=1) roots[i].setAttribute(A_BOUND,"1");\n'
    + '}());';
}
