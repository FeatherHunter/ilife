/** bulk-bar · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editable-value/runtime.ts`／`multi-checks/runtime.ts` 同一处分工：模块代码零 DOM；
 *  DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `change` 与一枚 `click` 委派；重复注入只绑定一次
 *     （文档根上的 `data-ilife-bulk-runtime`）。
 *   · **一处刷新**（`refresh`）：已选条数、操作条的显隐、选中读数尾段，全部由**同一趟**算出来——
 *     三处各算各的必然走散（原型那条：**选中 0 条 ⇒ 整条移出可点范围**，就是这里的 `hidden`）。
 *   · **过期的读数不许留在屏上**：调用方给的尾段（如「合计 361.50」）是按**当时那份选择**算的；
 *     选择一变它就假了 ⇒ 换成 `—`（缺值写成 `—`），并派发 `ilife:bulk-change` 请调用方按新选择重渲染。
 *     勾回原样（每一行的勾选都与渲染时一致）⇒ 尾段复原。
 *   · **预演先于动作**：点带预演的按钮**只展开确认面**（同时只开一块：开第二块时先收起别的）；
 *     不带预演的直接派发 `ilife:bulk-action`。勾选一变，确认面自动收起（它是按旧选择算的）。
 *   · **不写库**：「取消」只收起；「改这 N 条」把 `{ action, keys, value }` 派发出去就完事——
 *     真正落库归页面／技能命令（本件不自动收起确认面：页面按事件重渲染，或给那一枚动作标 `busy`）。
 *   · **无脚本降级**：这段不跑时，勾选照常（原生复选）、条按渲染时那份选择显隐，只是不派发事件。
 *   · **不依赖 `transitionend`**：所有状态切换都是属性／文本的同步改写。
 */
import {
  BULK_BAR_ACTION_ATTR,
  BULK_BAR_BOUND_ATTR,
  BULK_BAR_BUSY_ATTR,
  BULK_BAR_CANCEL_ATTR,
  BULK_BAR_EVENT_ACTION,
  BULK_BAR_EVENT_CHANGE,
  BULK_BAR_ITEM_ATTR,
  BULK_BAR_MISSING,
  BULK_BAR_NAME_ATTR,
  BULK_BAR_ON_ATTR,
  BULK_BAR_RECENT_ATTR,
  BULK_BAR_RUNTIME_ATTR,
  BULK_BAR_SUBMIT_ATTR,
  bulkBarSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildBulkBarJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  /* **带点的类选择器**：漏了那个点，`querySelector("ilife-block-…")` 找的是**标签名**，永远查不到。 */
  const CLS_BAR = q('.' + bulkBarSlot('bar'));
  const CLS_NUM = q('.' + bulkBarSlot('num'));
  const CLS_TAIL = q('.' + bulkBarSlot('tail'));
  const CLS_CONFIRM = q('.' + bulkBarSlot('confirm'));
  const CLS_INPUT = q('.' + bulkBarSlot('input'));
  return '(function(){' + LF
    + '  var ATTR_NAME=' + q(BULK_BAR_NAME_ATTR) + ', ATTR_ITEM=' + q(BULK_BAR_ITEM_ATTR) + ';' + LF
    + '  var ATTR_ON=' + q(BULK_BAR_ON_ATTR) + ', ATTR_ACTION=' + q(BULK_BAR_ACTION_ATTR) + ';' + LF
    + '  var ATTR_BUSY=' + q(BULK_BAR_BUSY_ATTR) + ', ATTR_CANCEL=' + q(BULK_BAR_CANCEL_ATTR) + ';' + LF
    + '  var ATTR_SUBMIT=' + q(BULK_BAR_SUBMIT_ATTR) + ', ATTR_RECENT=' + q(BULK_BAR_RECENT_ATTR) + ';' + LF
    + '  var ATTR_BOUND=' + q(BULK_BAR_BOUND_ATTR) + ', ATTR_RUNTIME=' + q(BULK_BAR_RUNTIME_ATTR) + ';' + LF
    + '  var EV_CHANGE=' + q(BULK_BAR_EVENT_CHANGE) + ', EV_ACTION=' + q(BULK_BAR_EVENT_ACTION) + ';' + LF
    + '  var MISSING=' + q(BULK_BAR_MISSING) + ', SEL_BAR=' + CLS_BAR + ', SEL_NUM=' + CLS_NUM + ';' + LF
    + '  var SEL_TAIL=' + CLS_TAIL + ', SEL_CONFIRM=' + CLS_CONFIRM + ', SEL_INPUT=' + CLS_INPUT + ';' + LF
    + '  var doc=document;' + LF
    + '  if (doc.documentElement.getAttribute(ATTR_RUNTIME)==="1") return;' + LF
    + '  doc.documentElement.setAttribute(ATTR_RUNTIME,"1");' + LF
    + '  function rootOf(el){ return el && el.closest ? el.closest("["+ATTR_NAME+"]") : null; }' + LF
    + '  function rowsOf(root){ return root.querySelectorAll("input[type=checkbox]["+ATTR_ITEM+"]"); }' + LF
    + '  function panelOf(btn){' + LF
    + '    var id=btn.getAttribute("aria-controls"); if (!id) return null;' + LF
    + '    var root=rootOf(btn); return root ? root.querySelector("[id=\\""+id+"\\"]") : null;' + LF
    + '  }' + LF
    /* 一处算清：已选数、条的显隐、尾段过没过期。 */
    + '  function refresh(root){' + LF
    + '    var bar=root.querySelector(SEL_BAR); if (!bar) return null;' + LF
    + '    var rows=rowsOf(root), total=rows.length, count=0, keys=[], same=true, i;' + LF
    + '    for (i=0;i<total;i+=1){' + LF
    + '      if (rows[i].checked){ count+=1; keys.push(rows[i].getAttribute(ATTR_ITEM)); }' + LF
    + '      if (rows[i].checked !== rows[i].hasAttribute(ATTR_ON)) same=false;' + LF
    + '    }' + LF
    + '    var numEl=bar.querySelector(SEL_NUM); if (numEl) numEl.textContent=String(count);' + LF
    + '    var tailEl=bar.querySelector(SEL_TAIL);' + LF
    + '    if (tailEl){' + LF
    + '      if (tailEl.getAttribute("data-ilife-bulk-tail")===null){' + LF
    + '        tailEl.setAttribute("data-ilife-bulk-tail", tailEl.textContent);' + LF
    + '      }' + LF
    + '      tailEl.textContent = same ? tailEl.getAttribute("data-ilife-bulk-tail") : MISSING;' + LF
    + '    }' + LF
    + '    if (count===0) bar.setAttribute("hidden",""); else bar.removeAttribute("hidden");' + LF
    + '    return {count:count, keys:keys};' + LF
    + '  }' + LF
    + '  function collapse(root){' + LF
    + '    var panels=root.querySelectorAll(SEL_CONFIRM), acts=root.querySelectorAll("["+ATTR_ACTION+"]"), i;' + LF
    + '    for (i=0;i<panels.length;i+=1) panels[i].setAttribute("hidden","");' + LF
    + '    for (i=0;i<acts.length;i+=1) acts[i].setAttribute("aria-expanded","false");' + LF
    + '  }' + LF
    + '  function openOf(root, btn){' + LF
    + '    var panel=panelOf(btn); if (!panel) return;' + LF
    + '    var wasOpen = !panel.hasAttribute("hidden");' + LF
    + '    collapse(root);' + LF
    + '    if (wasOpen) return;' + LF
    + '    panel.removeAttribute("hidden");' + LF
    + '    btn.setAttribute("aria-expanded","true");' + LF
    + '  }' + LF
    + '  function fire(root, name, detail){' + LF
    + '    detail.name=root.getAttribute(ATTR_NAME);' + LF
    + '    root.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail}));' + LF
    + '  }' + LF
    + '  doc.addEventListener("change", function(e){' + LF
    + '    var t=e.target;' + LF
    + '    if (!t || t.type!=="checkbox" || !t.hasAttribute(ATTR_ITEM)) return;' + LF
    + '    var root=rootOf(t); if (!root) return;' + LF
    /* 选择变了 ⇒ 展开着的确认面是按旧选择算的，当场收起（不留一份过期的预演）。 */
    + '    collapse(root);' + LF
    + '    var info=refresh(root); if (!info) return;' + LF
    + '    fire(root, EV_CHANGE, {keys:info.keys, count:info.count});' + LF
    + '  });' + LF
    + '  doc.addEventListener("click", function(e){' + LF
    + '    var t=e.target; if (!t || !t.closest) return;' + LF
    + '    var root=rootOf(t); if (!root) return;' + LF
    + '    var btn=t.closest("["+ATTR_CANCEL+"]");' + LF
    + '    if (btn){' + LF
    /* 收起后把焦点还给按它的那一枚动作（否则焦点掉在 `hidden` 的元素上，读屏读不到东西）。 */
    + '      var open=root.querySelector("["+ATTR_ACTION+"][aria-expanded=true]");' + LF
    + '      collapse(root);' + LF
    + '      if (open) open.focus();' + LF
    + '      e.preventDefault(); return;' + LF
    + '    }' + LF
    + '    btn=t.closest("["+ATTR_SUBMIT+"]");' + LF
    + '    if (btn){' + LF
    + '      if (btn.disabled) return;' + LF
    + '      var panel=btn.closest(SEL_CONFIRM);' + LF
    + '      var input=panel ? panel.querySelector(SEL_INPUT) : null;' + LF
    + '      var info=refresh(root);' + LF
    + '      fire(root, EV_ACTION, {action:btn.getAttribute(ATTR_SUBMIT), keys:info?info.keys:[],'
    + ' value:input ? String(input.value) : null});' + LF
    + '      return;' + LF
    + '    }' + LF
    + '    btn=t.closest("["+ATTR_RECENT+"]");' + LF
    + '    if (btn){' + LF
    + '      var p2=btn.closest(SEL_CONFIRM);' + LF
    + '      var input2=p2 ? p2.querySelector(SEL_INPUT) : null;' + LF
    + '      if (input2){ input2.value=btn.getAttribute(ATTR_RECENT); input2.focus(); }' + LF
    + '      e.preventDefault(); return;' + LF
    + '    }' + LF
    + '    btn=t.closest("["+ATTR_ACTION+"]");' + LF
    + '    if (!btn || btn.disabled || btn.getAttribute(ATTR_BUSY)==="1") return;' + LF
    + '    var p3=panelOf(btn);' + LF
    + '    if (p3){ openOf(root, btn); return; }' + LF
    + '    var info3=refresh(root);' + LF
    + '    fire(root, EV_ACTION, {action:btn.getAttribute(ATTR_ACTION), keys:info3?info3.keys:[], value:null});' + LF
    + '  });' + LF
    /* init 那一趟：打绑定标记 ＋ 把已选数与条的显隐按真实勾选对齐（SSR 面与机器面收敛到一处）。 */
    + '  var all=doc.querySelectorAll("["+ATTR_NAME+"]");' + LF
    + '  for (var k=0;k<all.length;k+=1){ all[k].setAttribute(ATTR_BOUND,"1"); refresh(all[k]); }' + LF
    + '}());';
}
