/** editableValue · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `controls.buildSharedHelpersJs()`／`charts.buildChartsHelpersJs()` 同一处分工：
 *  模块代码零 DOM；DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应测试）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click`／`keydown`／`change`／`focusout` 委派；重复注入只绑定一次。
 *   · **进出编辑收在一处**（`setEditing`）：命中区与编辑器互斥显示，**任何**退出路径都恢复命中区
 *     （取消、提交、被拒提交后再退出、外部点击…）——"编辑态卡住／命中区消失"是不许出现的状态。
 *   · **拆除不重入**：移除编辑器会同步触发 `focusout`，拆除前先打 `data-ilife-closing` 标记，
 *     `focusout` 见标记即退——否则会把"取消"重入成"提交"（审查席 P1-1）。
 *   · **打开**：点命中区 → 同一格里换上 `input`／`select`（同盒模型），聚焦并全选；
 *     机器值编辑器承载不了（如 `number` 收到 `1,800`）时**拒绝打开**并把显示留在命中区（不静默清空）。
 *   · **提交**：`Enter`／失焦（`input` 与 `select` 一视同仁）／`select` 的 `change`（选定即确认）。
 *     校验不过 → **留在编辑态** ＋ `--invalid`，不派发。
 *   · **无改动**：一个字节都不动（显示字与机器值都保留），也不派发事件——"点开又关闭"不该改任何东西。
 *   · **取消**：`Esc` → 还原原值 ＋ 焦点回命中区 ＋ 派发 `EDIT_EVENT_CANCEL`。
 *   · **提交成功**：就地改写显示（显示字走 `display`；改为原值以外才重算显示字）＋ 焦点回命中区
 *     ＋ 派发 `EDIT_EVENT_COMMIT`（冒泡，`detail = { name, label, value, prev, unit }`）。
 *   · **IME**：组字中的回车不提交（`isComposing`／`keyCode 229`）。
 *   · **无脚本降级**：这段不跑时值照常可读（就是文本），只是不可改。
 */
import {
  EDIT_AFFORDANCE_ATTR, EDIT_BOUND_ATTR, EDIT_DISABLED_ATTR, EDIT_DISPLAY_ATTR, EDIT_EVENT_CANCEL,
  EDIT_EVENT_COMMIT, EDIT_HIT_ATTR, EDIT_KIND_ATTR, EDIT_LABEL_ATTR, EDIT_MAX_ATTR, EDIT_MIN_ATTR,
  EDIT_NAME_ATTR, EDIT_OPTIONS_ATTR, EDIT_PLACEHOLDER_ATTR, EDIT_REQUIRED_ATTR, EDIT_STEP_ATTR,
  EDIT_UNIT_ATTR, EDIT_VALUE_ATTR, EDIT_VALUE_CLASS,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildEditableValueJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const C = q(EDIT_VALUE_CLASS);
  return '(function(){' + '\n'
    + '  var ATTR_NAME=' + q(EDIT_NAME_ATTR) + ', ATTR_KIND=' + q(EDIT_KIND_ATTR) + ', ATTR_VALUE=' + q(EDIT_VALUE_ATTR) + ';' + '\n'
    + '  var ATTR_DISPLAY=' + q(EDIT_DISPLAY_ATTR) + ', ATTR_UNIT=' + q(EDIT_UNIT_ATTR) + ', ATTR_LABEL=' + q(EDIT_LABEL_ATTR) + ';' + '\n'
    + '  var ATTR_OPTIONS=' + q(EDIT_OPTIONS_ATTR) + ', ATTR_AFF=' + q(EDIT_AFFORDANCE_ATTR) + ', ATTR_REQ=' + q(EDIT_REQUIRED_ATTR) + ';' + '\n'
    + '  var ATTR_PH=' + q(EDIT_PLACEHOLDER_ATTR) + ', ATTR_MIN=' + q(EDIT_MIN_ATTR) + ', ATTR_MAX=' + q(EDIT_MAX_ATTR) + ';' + '\n'
    + '  var ATTR_STEP=' + q(EDIT_STEP_ATTR) + ', ATTR_HIT=' + q(EDIT_HIT_ATTR) + ', ATTR_DISABLED=' + q(EDIT_DISABLED_ATTR) + ';' + '\n'
    + '  var ATTR_BOUND=' + q(EDIT_BOUND_ATTR) + ', CLASS_ROOT=' + C + ', ATTR_CLOSING="data-ilife-closing";' + '\n'
    + '  var CLASS_INVALID=CLASS_ROOT+"--invalid", SEL_EDITOR="."+CLASS_ROOT+"-input,."+CLASS_ROOT+"-select";' + '\n'
    + '  var SEL_INPUT="."+CLASS_ROOT+"-input", SEL_SELECT="."+CLASS_ROOT+"-select";' + '\n'
    + '  var EV_COMMIT=' + q(EDIT_EVENT_COMMIT) + ', EV_CANCEL=' + q(EDIT_EVENT_CANCEL) + ';' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-edit-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-edit-runtime","1");' + '\n'
    + '  function rootOf(el, sel){ var hit=el && el.closest ? el.closest(sel) : null;'
    + ' return hit && hit.closest ? hit.closest("["+ATTR_NAME+"]") : null; }' + '\n'
    + '  function editorOf(root){ return root.querySelector(SEL_EDITOR); }' + '\n'
    + '  function hitOf(root){ return root.querySelector("["+ATTR_HIT+"]"); }' + '\n'
    /* 显示态：只写"值文本 ＋ 单位 ＋ 铅笔"（唯一写入口） */
    + '  function paintDisplay(root, display){' + '\n'
    + '    var hit=hitOf(root); if (!hit) return;' + '\n'
    + '    hit.innerHTML="";' + '\n'
    + '    var text=doc.createElement("span"); text.className=CLASS_ROOT+"-text"; text.textContent=display; hit.appendChild(text);' + '\n'
    + '    var unit=root.getAttribute(ATTR_UNIT);' + '\n'
    + '    if (unit){ var u=doc.createElement("span"); u.className=CLASS_ROOT+"-unit"; u.textContent=unit; hit.appendChild(u); }' + '\n'
    + '    if (root.getAttribute(ATTR_AFF)!=="none" && !root.hasAttribute(ATTR_DISABLED)){' + '\n'
    + '      var NS="http://www.w3.org/2000/svg";' + '\n'
    + '      var pen=doc.createElementNS(NS,"svg"); pen.setAttribute("class",CLASS_ROOT+"-pen");' + '\n'
    + '      pen.setAttribute("viewBox","0 0 24 24"); pen.setAttribute("width","13"); pen.setAttribute("height","13");' + '\n'
    + '      pen.setAttribute("fill","none"); pen.setAttribute("stroke","currentColor"); pen.setAttribute("stroke-width","2");' + '\n'
    + '      pen.setAttribute("stroke-linecap","round"); pen.setAttribute("stroke-linejoin","round"); pen.setAttribute("aria-hidden","true");' + '\n'
    + '      var a=doc.createElementNS(NS,"path"); a.setAttribute("d","M12 20h9");' + '\n'
    + '      var b=doc.createElementNS(NS,"path"); b.setAttribute("d","M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z");' + '\n'
    + '      pen.appendChild(a); pen.appendChild(b); hit.appendChild(pen);' + '\n'
    + '    }' + '\n'
    + '  }' + '\n'
    /* 进出编辑的唯一开关：进＝藏命中区＋造编辑器；出＝拆编辑器（打标记防重入）＋显命中区 */
    + '  function setEditing(root, on){' + '\n'
    + '    var hit=hitOf(root), f=editorOf(root);' + '\n'
    + '    if (!on){' + '\n'
    + '      if (f){ f.setAttribute(ATTR_CLOSING,"1"); f.remove(); }' + '\n'
    + '      if (hit) hit.style.display="";' + '\n'
    + '      root.classList.remove(CLASS_INVALID);' + '\n'
    + '      return true;' + '\n'
    + '    }' + '\n'
    + '    if (f) return true;' + '\n'
    + '    if (root.hasAttribute(ATTR_DISABLED)) return false;' + '\n'
    + '    var kind=root.getAttribute(ATTR_KIND)||"text";' + '\n'
    + '    var cur=root.getAttribute(ATTR_VALUE)||"";' + '\n'
    + '    var next;' + '\n'
    + '    if (kind==="select"){' + '\n'
    + '      next=doc.createElement("select"); next.className=CLASS_ROOT+"-select";' + '\n'
    + '      var opts=[]; try{ opts=JSON.parse(root.getAttribute(ATTR_OPTIONS)||"[]"); }catch(e){ opts=[]; }' + '\n'
    + '      if (!opts.length) return false;' + '\n'
    + '      for (var i=0;i<opts.length;i+=1){ var o=doc.createElement("option"); o.value=opts[i].value;'
    + ' o.textContent=opts[i].label; if (opts[i].value===cur) o.selected=true; next.appendChild(o); }' + '\n'
    + '    } else {' + '\n'
    + '      next=doc.createElement("input"); next.className=CLASS_ROOT+"-input";' + '\n'
    + '      next.type=(kind==="number"?"number":(kind==="date"?"date":"text"));' + '\n'
    + '      next.value=cur;' + '\n'
    + '      /* 机器值编辑器承载不了（number 收到 1,800／date 收到非 ISO）⇒ **拒开**，不静默清空 */' + '\n'
    + '      if (kind==="number" || kind==="date"){ if (String(next.value)!==String(cur)) return false; }' + '\n'
    + '      var ph=root.getAttribute(ATTR_PH); if (ph) next.placeholder=ph;' + '\n'
    + '      var mn=root.getAttribute(ATTR_MIN); if (mn!==null) next.min=mn;' + '\n'
    + '      var mx=root.getAttribute(ATTR_MAX); if (mx!==null) next.max=mx;' + '\n'
    + '      var st=root.getAttribute(ATTR_STEP); if (st!==null) next.step=st;' + '\n'
    + '    }' + '\n'
    + '    var label=root.getAttribute(ATTR_LABEL); if (label) next.setAttribute("aria-label", label);' + '\n'
    + '    if (hit) hit.style.display="none";' + '\n'
    + '    root.appendChild(next); next.focus();' + '\n'
    + '    if (next.select){ try{ next.select(); }catch(e){} }' + '\n'
    + '    return true;' + '\n'
    + '  }' + '\n'
    /* 校验：必填／数字（min·max·step；容差按值域缩放，避免大数被误杀） */
    + '  function invalidReason(root, raw){' + '\n'
    + '    var kind=root.getAttribute(ATTR_KIND)||"text";' + '\n'
    + '    var s=String(raw).trim();' + '\n'
    + '    if (root.getAttribute(ATTR_REQ)==="1" && s==="") return "必填";' + '\n'
    + '    if (kind!=="number") return null;' + '\n'
    + '    if (s==="") return null;' + '\n'
    + '    var n=Number(s); if (!isFinite(n)) return "不是数字";' + '\n'
    + '    var mn=root.getAttribute(ATTR_MIN), mx=root.getAttribute(ATTR_MAX), st=root.getAttribute(ATTR_STEP);' + '\n'
    + '    if (mn!==null && n<Number(mn)) return "小于 " + mn;' + '\n'
    + '    if (mx!==null && n>Number(mx)) return "大于 " + mx;' + '\n'
    + '    if (st!==null && Number(st)>0){ var stv=Number(st), base=(mn!==null?Number(mn):0);' + '\n'
    + '      var nearest=base+Math.round((n-base)/stv)*stv, tol=1e-9*Math.max(1,Math.abs(n));' + '\n'
    + '      if (Math.abs(n-nearest)>tol) return "步长 " + st; }' + '\n'
    + '    return null;' + '\n'
    + '  }' + '\n'
    + '  function displayFor(root, raw){' + '\n'
    + '    if ((root.getAttribute(ATTR_KIND)||"text")!=="select") return raw;' + '\n'
    + '    var opts=[]; try{ opts=JSON.parse(root.getAttribute(ATTR_OPTIONS)||"[]"); }catch(e){ opts=[]; }' + '\n'
    + '    for (var i=0;i<opts.length;i+=1) if (opts[i].value===raw) return opts[i].label;' + '\n'
    + '    return raw;' + '\n'
    + '  }' + '\n'
    + '  function commit(root, opts){' + '\n'
    + '    var f=editorOf(root); if (!f) return;' + '\n'
    + '    var raw=String(f.value);' + '\n'
    + '    var prev=root.getAttribute(ATTR_VALUE)||"";' + '\n'
    + '    var reason=invalidReason(root, raw);' + '\n'
    + '    if (reason!==null){ root.classList.add(CLASS_INVALID); f.setAttribute("aria-invalid","true"); return; }' + '\n'
    + '    var same=(raw===prev);' + '\n'
    + '    setEditing(root,false);' + '\n'
    + '    if (!same){' + '\n'
    + '      var display=displayFor(root, raw);' + '\n'
    + '      root.setAttribute(ATTR_VALUE, raw); root.setAttribute(ATTR_DISPLAY, display); paintDisplay(root, display);' + '\n'
    + '    }' + '\n'
    + '    var hit=hitOf(root); if (hit && (!opts || opts.refocus!==false)) hit.focus();' + '\n'
    + '    if (!same){' + '\n'
    + '      root.dispatchEvent(new CustomEvent(EV_COMMIT,{bubbles:true,detail:{'
    + 'name:root.getAttribute(ATTR_NAME),label:root.getAttribute(ATTR_LABEL),value:raw,prev:prev,unit:root.getAttribute(ATTR_UNIT)}}));' + '\n'
    + '    }' + '\n'
    + '  }' + '\n'
    + '  function cancel(root){' + '\n'
    + '    if (!editorOf(root)) return;' + '\n'
    + '    var prev=root.getAttribute(ATTR_VALUE)||"";' + '\n'
    + '    setEditing(root,false);' + '\n'
    + '    var hit=hitOf(root); if (hit) hit.focus();' + '\n'
    + '    root.dispatchEvent(new CustomEvent(EV_CANCEL,{bubbles:true,detail:{name:root.getAttribute(ATTR_NAME),value:prev}}));' + '\n'
    + '  }' + '\n'
    + '  function isClosing(el){ return el.getAttribute(ATTR_CLOSING)==="1"; }' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var root=rootOf(e.target, "["+ATTR_HIT+"]"); if (!root) return;' + '\n'
    + '    e.preventDefault(); setEditing(root,true);' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("keydown", function(e){' + '\n'
    + '    var t=e.target; if (e.isComposing || e.keyCode===229) return;' + '\n'
    + '    var root=rootOf(t, SEL_EDITOR); if (!root) return;' + '\n'
    + '    if (e.key==="Enter"){ e.preventDefault(); commit(root); }' + '\n'
    + '    else if (e.key==="Escape"){ e.preventDefault(); cancel(root); }' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("focusout", function(e){' + '\n'
    + '    var t=e.target; if (!t || !t.classList) return;' + '\n'
    + '    if (isClosing(t)) return;' + '\n'
    + '    var isInput=t.classList.contains(CLASS_ROOT+"-input"), isSelect=t.classList.contains(CLASS_ROOT+"-select");' + '\n'
    + '    if (!isInput && !isSelect) return;' + '\n'
    + '    var root=t.closest ? t.closest("["+ATTR_NAME+"]") : null; if (!root) return;' + '\n'
    + '    if (e.relatedTarget && root.contains(e.relatedTarget)) return;' + '\n'
    + '    commit(root,{refocus:false});' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("change", function(e){' + '\n'
    + '    /* `select` 的 `change` 就是"用户选定了"这一步（原生语义），选定即确认；' + '\n'
    + '       另外两条路（回车、失焦）照样提交 —— 三条路都不许把编辑态卡住。 */' + '\n'
    + '    var t=e.target; if (!t || !t.classList || !t.classList.contains(CLASS_ROOT+"-select")) return;' + '\n'
    + '    if (isClosing(t)) return;' + '\n'
    + '    var root=t.closest ? t.closest("["+ATTR_NAME+"]") : null; if (!root) return;' + '\n'
    + '    commit(root);' + '\n'
    + '  });' + '\n'
    + '  var all=doc.querySelectorAll("["+ATTR_NAME+"]");' + '\n'
    + '  for (var j=0;j<all.length;j+=1) all[j].setAttribute(ATTR_BOUND,"1");' + '\n'
    + '}());';
}
