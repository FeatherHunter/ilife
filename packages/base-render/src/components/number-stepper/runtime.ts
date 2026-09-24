/** number-stepper · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editable-value` 同一处分工：模块代码零 DOM；DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应测试）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click` 委派（外加 `keydown`／`focusout` 管行内编辑器）；
 *     重复注入只绑定一次（`data-ilife-stepper-runtime`）。
 *   · **三枚可点区**：−／＋ 各走一档（夹在 `[min, max]` 内、吸附到步长格子）；值位点开**行内编辑器**
 *     （同一格里换 `input`，与值位同盒模型 ⇒ 不跳版）；到下限／上限时对应那枚键落 `disabled`，
 *     并在状态字位写「已到下限／已到上限」（**不是靠变灰**）。
 *   · **常用值**：点一下直接落到那一档；当前值命中哪一枚，哪一枚 `aria-pressed="true"`。
 *   · **变更事件**：只有真变了才派发 `ilife:stepper-change`（夹到同值不派发、编辑器原样提交不派发）。
 *   · **拒绝说不清的值**：编辑器里的数越界或不在格子上时**留在编辑态** ＋ 写在控件旁边的错误行
 *     （控件 `aria-describedby` 指向它），不静默吸附、也不静默清空。
 *   · **更新中不接点击**：根上挂了 `data-ilife-stepper-loading="1"` 时一律不响应（原地换字期间防抖）。
 *   · **无脚本降级**：这段不跑时值照常可读（数字、单位、状态字都在标记里），只是不可改。
 */
import {
  NUMBER_STEPPER_ACT_ATTR,
  NUMBER_STEPPER_BOUND_ATTR,
  NUMBER_STEPPER_CLASS,
  NUMBER_STEPPER_DECIMALS_ATTR,
  NUMBER_STEPPER_DISABLED_ATTR,
  NUMBER_STEPPER_EDITING_ATTR,
  NUMBER_STEPPER_EVENT_CHANGE,
  NUMBER_STEPPER_HIT_ATTR,
  NUMBER_STEPPER_LABEL_ATTR,
  NUMBER_STEPPER_LOADING_ATTR,
  NUMBER_STEPPER_MAX_ATTR,
  NUMBER_STEPPER_MIN_ATTR,
  NUMBER_STEPPER_MISSING,
  NUMBER_STEPPER_NAME_ATTR,
  NUMBER_STEPPER_QUICK_ATTR,
  NUMBER_STEPPER_STATE_ATTR,
  NUMBER_STEPPER_STEP_ATTR,
  NUMBER_STEPPER_AT_MAX,
  NUMBER_STEPPER_AT_MIN,
  NUMBER_STEPPER_UNIT_ATTR,
  NUMBER_STEPPER_UNSET,
  NUMBER_STEPPER_VALUE_ATTR,
  numberStepperSlot,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildNumberStepperJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var ATTR_NAME=' + q(NUMBER_STEPPER_NAME_ATTR) + ', ATTR_VALUE=' + q(NUMBER_STEPPER_VALUE_ATTR) + ';' + '\n'
    + '  var ATTR_MIN=' + q(NUMBER_STEPPER_MIN_ATTR) + ', ATTR_MAX=' + q(NUMBER_STEPPER_MAX_ATTR)
    + ', ATTR_STEP=' + q(NUMBER_STEPPER_STEP_ATTR) + ';' + '\n'
    + '  var ATTR_DEC=' + q(NUMBER_STEPPER_DECIMALS_ATTR) + ', ATTR_UNIT=' + q(NUMBER_STEPPER_UNIT_ATTR)
    + ', ATTR_LABEL=' + q(NUMBER_STEPPER_LABEL_ATTR) + ';' + '\n'
    + '  var ATTR_ACT=' + q(NUMBER_STEPPER_ACT_ATTR) + ', ATTR_QUICK=' + q(NUMBER_STEPPER_QUICK_ATTR)
    + ', ATTR_HIT=' + q(NUMBER_STEPPER_HIT_ATTR) + ';' + '\n'
    + '  var ATTR_STATE=' + q(NUMBER_STEPPER_STATE_ATTR) + ', ATTR_EDITING=' + q(NUMBER_STEPPER_EDITING_ATTR)
    + ', ATTR_DISABLED=' + q(NUMBER_STEPPER_DISABLED_ATTR) + ';' + '\n'
    + '  var ATTR_LOADING=' + q(NUMBER_STEPPER_LOADING_ATTR) + ', ATTR_BOUND=' + q(NUMBER_STEPPER_BOUND_ATTR) + ';' + '\n'
    + '  var EV_CHANGE=' + q(NUMBER_STEPPER_EVENT_CHANGE) + ', MISSING=' + q(NUMBER_STEPPER_MISSING) + ';' + '\n'
    + '  var WORD_MIN=' + q(NUMBER_STEPPER_AT_MIN) + ', WORD_MAX=' + q(NUMBER_STEPPER_AT_MAX)
    + ', WORD_UNSET=' + q(NUMBER_STEPPER_UNSET) + ';' + '\n'
    + '  var CLS=' + q(NUMBER_STEPPER_CLASS) + ', CLS_STATE=' + q(numberStepperSlot('state'))
    + ', CLS_NUMBER=' + q(numberStepperSlot('number')) + ';' + '\n'
    + '  var CLS_VALUE=' + q(numberStepperSlot('value')) + ', CLS_EDITOR=' + q(numberStepperSlot('editor'))
    + ', CLS_ERROR=' + q(numberStepperSlot('error')) + ', CLS_CALIBER=' + q(numberStepperSlot('caliber')) + ';' + '\n'
    + '  var CLS_INVALID="is-invalid", CLASS_DEC=' + q(numberStepperSlot('dec'))
    + ', CLASS_INC=' + q(numberStepperSlot('inc')) + ', CLASS_PRESET=' + q(numberStepperSlot('preset')) + ';' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-stepper-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-stepper-runtime","1");' + '\n'
    /* ── 读数面：一律从 `data-*` 读，不从 DOM 文本反推（文本是给人看的，属性是给机器看的） ── */
    + '  function num(v){ if (v===null||v===undefined||v==="") return null; var n=Number(v); return isFinite(n)?n:null; }' + '\n'
    + '  function minOf(root){ return num(root.getAttribute(ATTR_MIN)); }' + '\n'
    + '  function maxOf(root){ return num(root.getAttribute(ATTR_MAX)); }' + '\n'
    + '  function stepOf(root){ return num(root.getAttribute(ATTR_STEP)); }' + '\n'
    + '  function decimalsOf(root){ var d=num(root.getAttribute(ATTR_DEC)); return d===null?0:d; }' + '\n'
    + '  function valueOf(root){ return num(root.getAttribute(ATTR_VALUE)); }' + '\n'
    + '  function unitOf(root){ return root.getAttribute(ATTR_UNIT)||""; }' + '\n'
    + '  function grouped(s){ return s.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ","); }' + '\n'
    /* 显示字：与 `render.ts` 的 `formatStepperValue` 同一口径（两边各写一份是产出的 JS 没法 import）。 */
    + '  function fmt(v, decimals){' + '\n'
    + '    var fixed=v.toFixed(decimals);' + '\n'
    + '    if (decimals>0){ fixed=fixed.replace(/\\.0+$/,"").replace(/(\\.\\d*?)0+$/,"$1"); }' + '\n'
    + '    var dot=fixed.indexOf(".");' + '\n'
    + '    return dot<0 ? grouped(fixed) : grouped(fixed.slice(0,dot))+fixed.slice(dot);' + '\n'
    + '  }' + '\n'
    + '  function wordOf(root, v){ var u=unitOf(root); return (v===null?MISSING:fmt(v, decimalsOf(root)))+(u===""?"":" "+u); }' + '\n'
    + '  function snap(v, min, step){ return min+Math.round((v-min)/step)*step; }' + '\n'
    + '  function clamp(v, min, max){ return v<min?min:(v>max?max:v); }' + '\n'
    + '  function onGrid(v, min, step){ var k=(v-min)/step; return Math.abs(k-Math.round(k))<1e-9; }' + '\n'
    + '  function busy(root){ return root.getAttribute(ATTR_DISABLED)==="1" || root.getAttribute(ATTR_LOADING)==="1"; }' + '\n'
    + '  function rootOf(el, sel){ var hit=el&&el.closest?el.closest(sel):null;'
    + ' return hit&&hit.closest?hit.closest("["+ATTR_NAME+"]"):null; }' + '\n'
    /* ── 状态字：四档词的唯一写入口（没有词就把那一枚摘掉，不留下空签） ── */
    + '  function setState(root, word){' + '\n'
    + '    var el=root.querySelector("["+ATTR_STATE+"]");' + '\n'
    + '    if (word===""){ if (el) el.remove(); return; }' + '\n'
    + '    if (!el){' + '\n'
    + '      var head=root.querySelector("."+CLS+"-head"); if (!head) return;' + '\n'
    + '      el=doc.createElement("span"); el.className=CLS_STATE; el.setAttribute(ATTR_STATE,""); head.appendChild(el);' + '\n'
    + '    }' + '\n'
    + '    el.setAttribute(ATTR_STATE, word); el.textContent=word;' + '\n'
    + '  }' + '\n'
    /* ── 上屏：一次写全（值／可点区的可点性／常用值的选中态／状态字） ── */
    + '  function paint(root, v){' + '\n'
    + '    root.setAttribute(ATTR_VALUE, v===null?"":String(v));' + '\n'
    + '    var number=root.querySelector("."+CLS_NUMBER);' + '\n'
    + '    if (number) number.textContent = v===null?MISSING:fmt(v, decimalsOf(root));' + '\n'
    + '    var value=root.querySelector("."+CLS_VALUE);' + '\n'
    + '    if (value){ value.setAttribute("aria-label", (root.getAttribute(ATTR_LABEL)||"数值")+" "+wordOf(root,v)+"，点一下直接填一个数"); }' + '\n'
    + '    var min=minOf(root), max=maxOf(root);' + '\n'
    + '    var dec=root.querySelector("."+CLASS_DEC), inc=root.querySelector("."+CLASS_INC);' + '\n'
    + '    var locked=busy(root);' + '\n'
    + '    if (dec) dec.disabled = locked || (v!==null && min!==null && v<=min);' + '\n'
    + '    if (inc) inc.disabled = locked || (v!==null && max!==null && v>=max);' + '\n'
    + '    var presets=root.querySelectorAll("["+ATTR_QUICK+"]");' + '\n'
    + '    for (var i=0;i<presets.length;i+=1){' + '\n'
    + '      var one=num(presets[i].getAttribute(ATTR_QUICK));' + '\n'
    + '      presets[i].setAttribute("aria-pressed", (v!==null&&one!==null&&Math.abs(v-one)<1e-9)?"true":"false");' + '\n'
    + '    }' + '\n'
    + '    if (root.getAttribute(ATTR_LOADING)==="1") setState(root,"更新中");' + '\n'
    + '    else if (v===null) setState(root,WORD_UNSET);' + '\n'
    + '    else if (min!==null&&v<=min) setState(root,WORD_MIN);' + '\n'
    + '    else if (max!==null&&v>=max) setState(root,WORD_MAX);' + '\n'
    + '    else setState(root,"");' + '\n'
    + '  }' + '\n'
    + '  function fire(root, v, prev){' + '\n'
    + '    root.dispatchEvent(new CustomEvent(EV_CHANGE,{bubbles:true,detail:{name:root.getAttribute(ATTR_NAME),'
    + 'label:root.getAttribute(ATTR_LABEL),value:v,prev:prev,unit:unitOf(root)}}));' + '\n'
    + '  }' + '\n'
    + '  function setValue(root, v){' + '\n'
    + '    var prev=valueOf(root);' + '\n'
    + '    if (prev!==null && v!==null && Math.abs(prev-v)<1e-9) return;' + '\n'
    + '    paint(root, v); fire(root, v, prev);' + '\n'
    + '  }' + '\n'
    /* ── 行内编辑器：进出收在一处（任何退出路径都恢复值位） ── */
    + '  function errorOf(root){ return root.querySelector("."+CLS_ERROR); }' + '\n'
    + '  function errorIdOf(root){ return CLS+"-"+root.getAttribute(ATTR_NAME)+"-error"; }' + '\n'
    + '  function showError(root, text){' + '\n'
    + '    var el=errorOf(root); if (!el){ el=doc.createElement("p"); el.className=CLS_ERROR; el.id=errorIdOf(root);'
    + ' var cap=root.querySelector("."+CLS_CALIBER); if (cap) root.insertBefore(el,cap); else root.appendChild(el); }' + '\n'
    + '    el.setAttribute("role","alert"); el.textContent=text; root.classList.add(CLS_INVALID);' + '\n'
    + '    var editor=root.querySelector("."+CLS_EDITOR);' + '\n'
    + '    if (editor){ editor.setAttribute("aria-invalid","true"); editor.setAttribute("aria-describedby",errorIdOf(root)); }' + '\n'
    + '  }' + '\n'
    + '  function clearError(root){' + '\n'
    + '    var el=errorOf(root); if (el) el.remove();' + '\n'
    + '    root.classList.remove(CLS_INVALID);' + '\n'
    + '    var editor=root.querySelector("."+CLS_EDITOR);' + '\n'
    + '    if (editor){ editor.removeAttribute("aria-invalid"); editor.removeAttribute("aria-describedby"); }' + '\n'
    + '  }' + '\n'
    + '  function editorOf(root){ return root.querySelector("."+CLS_EDITOR); }' + '\n'
    + '  function closeEditor(root, back){' + '\n'
    + '    var editor=editorOf(root);' + '\n'
    + '    if (editor){ editor.setAttribute("data-ilife-closing","1"); editor.remove(); }' + '\n'
    + '    root.removeAttribute(ATTR_EDITING);' + '\n'
    + '    clearError(root);' + '\n'
    + '    if (back){ var hit=root.querySelector("."+CLS_VALUE); if (hit&&hit.focus) hit.focus(); }' + '\n'
    + '  }' + '\n'
    + '  function openEditor(root){' + '\n'
    + '    if (busy(root) || editorOf(root)) return;' + '\n'
    + '    var v=valueOf(root), min=minOf(root), max=maxOf(root), step=stepOf(root);' + '\n'
    + '    var input=doc.createElement("input");' + '\n'
    + '    input.className=CLS_EDITOR; input.type="number"; input.inputMode="decimal";' + '\n'
    + '    if (min!==null) input.min=String(min);' + '\n'
    + '    if (max!==null) input.max=String(max);' + '\n'
    + '    if (step!==null) input.step=String(step);' + '\n'
    + '    input.value = v===null?"":String(v);' + '\n'
    + '    input.setAttribute("aria-label",(root.getAttribute(ATTR_LABEL)||"数值")+"：填一个数");' + '\n'
    + '    root.setAttribute(ATTR_EDITING,"1");' + '\n'
    + '    root.appendChild(input);' + '\n'
    + '    input.focus(); if (input.select){ try{ input.select(); }catch(e){} }' + '\n'
    + '  }' + '\n'
    + '  function commit(root){' + '\n'
    + '    var editor=editorOf(root); if (!editor) return;' + '\n'
    + '    var raw=String(editor.value).trim();' + '\n'
    + '    var min=minOf(root), max=maxOf(root), step=stepOf(root);' + '\n'
    + '    if (raw===""){ showError(root,"这个数不能空着（要清空请换掉这一页的数据）"); return; }' + '\n'
    + '    var n=Number(raw);' + '\n'
    + '    if (!isFinite(n)){ showError(root,"请填一个数字"); return; }' + '\n'
    + '    if (min!==null && n<min){ showError(root,"不能小于 "+String(min)); return; }' + '\n'
    + '    if (max!==null && n>max){ showError(root,"不能大于 "+String(max)); return; }' + '\n'
    + '    if (step!==null && min!==null && !onGrid(n,min,step)){' + '\n'
    + '      showError(root,"只能按 "+String(step)+" 一档（从 "+String(min)+" 起算）"); return;' + '\n'
    + '    }' + '\n'
    + '    closeEditor(root,true); setValue(root,n);' + '\n'
    + '  }' + '\n'
    + '  function cancel(root){' + '\n'
    + '    if (!editorOf(root)) return;' + '\n'
    + '    closeEditor(root,true);' + '\n'
    + '  }' + '\n'
    + '  function isClosing(el){ return !!el && !!el.getAttribute && el.getAttribute("data-ilife-closing")==="1"; }' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var hit=e.target&&e.target.closest?e.target.closest("["+ATTR_HIT+"]"):null; if (!hit) return;' + '\n'
    + '    var root=rootOf(hit,"["+ATTR_HIT+"]"); if (!root) return;' + '\n'
    + '    if (busy(root)){ e.preventDefault(); return; }' + '\n'
    + '    var act=hit.getAttribute(ATTR_ACT);' + '\n'
    + '    var step=stepOf(root), min=minOf(root), max=maxOf(root);' + '\n'
    + '    var v=valueOf(root);' + '\n'
    + '    e.preventDefault();' + '\n'
    + '    if (act==="edit"){ openEditor(root); return; }' + '\n'
    /* 点别处＝先把行内编辑器收掉（不提交）：编辑态不许被留在页上过期。 */
    + '    if (editorOf(root)) closeEditor(root,false);' + '\n'
    + '    if (act==="quick"){ var qv=num(hit.getAttribute(ATTR_QUICK)); if (qv===null) return;'
    + ' clearError(root); setValue(root,qv); return; }' + '\n'
    + '    if (act!=="dec" && act!=="inc") return;' + '\n'
    + '    if (step===null || min===null || max===null) return;' + '\n'
    + '    if (v===null){ setValue(root,min); return; }' + '\n'
    + '    var next=clamp(snap(act==="dec"?v-step:v+step, min, step), min, max);' + '\n'
    + '    setValue(root, next);' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("keydown", function(e){' + '\n'
    + '    var editor=e.target; if (isClosing(editor)) return;' + '\n'
    + '    if (!editor||!editor.classList||!editor.classList.contains(CLS_EDITOR)) return;' + '\n'
    + '    if (e.isComposing||e.keyCode===229) return;' + '\n'
    + '    var root=rootOf(editor,"["+ATTR_NAME+"]"); if (!root) return;' + '\n'
    + '    if (e.key==="Enter"){ e.preventDefault(); commit(root); }' + '\n'
    + '    else if (e.key==="Escape"){ e.preventDefault(); cancel(root); }' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("focusout", function(e){' + '\n'
    + '    var editor=e.target; if (isClosing(editor)) return;' + '\n'
    + '    if (!editor||!editor.classList||!editor.classList.contains(CLS_EDITOR)) return;' + '\n'
    + '    var root=rootOf(editor,"["+ATTR_NAME+"]"); if (!root) return;' + '\n'
    + '    commit(root);' + '\n'
    + '  });' + '\n'
    + '  var all=doc.querySelectorAll("["+ATTR_NAME+"]");' + '\n'
    + '  for (var j=0;j<all.length;j+=1) all[j].setAttribute(ATTR_BOUND,"1");' + '\n'
    + '}());';
}
