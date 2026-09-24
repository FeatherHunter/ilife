/** wizard-shell · **运行时段**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `radio-cards/runtime.ts` 同一处分工：模块代码零 DOM；DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `change` 与一枚 `click` 委派；重复注入只绑定一次
 *     （文档根上 `data-ilife-wizard-runtime`），页面同时挂别家运行时也安全。
 *   · **原生语义优先**：选项的分组、互斥、选中态全用原生 `<input type="radio">`
 *     ——运行时不去重造一遍浏览器的行为（重造出来的那套必然是错的）。
 *   · **机器值落 DOM**：选中变化 ⇒ 根上的 `data-ilife-wizard-value` 就地改写（页面读属性即可拿值）。
 *   · **推进只报出去、不自己走**：按下三枚键之一 ⇒ 派发 `ilife:wizard-go`
 *     （`detail = { name, index, go, value, fields }`）——**走到哪一屏是页面的事**（页面握着那一趟的数据），
 *     运行时不改 `data-ilife-wizard-step`、不重排 DOM：改了就会和页面的数据源各说一套。
 *   · **空白由调动者接**：`fields` 是这一屏所有 `[data-ilife-wizard-field]` 的现值（键＝字段机器名）。
 *   · **无脚本降级**：这段不跑时，选项照样按 `checked` 显示选中态、三枚键照样是按钮，
 *     只是不派发事件、不写机器值属性。
 */

import {
  WIZARD_SHELL_BOUND_ATTR,
  WIZARD_SHELL_EVENT_GO,
  WIZARD_SHELL_EVENT_PICK,
  WIZARD_SHELL_FIELD_ATTR,
  WIZARD_SHELL_GO_ATTR,
  WIZARD_SHELL_NAME_ATTR,
  WIZARD_SHELL_OPTION_ATTR,
  WIZARD_SHELL_ROOT_ATTR,
  WIZARD_SHELL_RUNTIME_ATTR,
  WIZARD_SHELL_STEP_ATTR,
  WIZARD_SHELL_VALUE_ATTR,
  wizardShellSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildWizardShellJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + LF
    + '  var A_ROOT=' + q(WIZARD_SHELL_ROOT_ATTR) + ', A_NAME=' + q(WIZARD_SHELL_NAME_ATTR) + ';' + LF
    + '  var A_STEP=' + q(WIZARD_SHELL_STEP_ATTR) + ', A_VALUE=' + q(WIZARD_SHELL_VALUE_ATTR) + ';' + LF
    + '  var A_OPTION=' + q(WIZARD_SHELL_OPTION_ATTR) + ', A_FIELD=' + q(WIZARD_SHELL_FIELD_ATTR) + ';' + LF
    + '  var A_GO=' + q(WIZARD_SHELL_GO_ATTR) + ', A_BOUND=' + q(WIZARD_SHELL_BOUND_ATTR) + ';' + LF
    + '  var A_RUNTIME=' + q(WIZARD_SHELL_RUNTIME_ATTR) + ';' + LF
    + '  var EV_PICK=' + q(WIZARD_SHELL_EVENT_PICK) + ', EV_GO=' + q(WIZARD_SHELL_EVENT_GO) + ';' + LF
    + '  var CLASS_TITLE=' + q(wizardShellSlot('opt-title')) + ';' + LF
    + '  var doc=document;' + LF
    + '  if (doc.documentElement.getAttribute(A_RUNTIME)==="1") return;' + LF
    + '  doc.documentElement.setAttribute(A_RUNTIME,"1");' + LF
    + '  function rootOf(el){' + LF
    + '    return el && el.closest ? el.closest("["+A_ROOT+"]") : null;' + LF
    + '  }' + LF
    + '  function numOf(root, attr, fallback){' + LF
    + '    var n=Number(root.getAttribute(attr));' + LF
    + '    return isFinite(n) ? n : fallback;' + LF
    + '  }' + LF
    + '  function nameOf(root){' + LF
    + '    var v=root.getAttribute(A_NAME);' + LF
    + '    return v===null ? "" : v;' + LF
    + '  }' + LF
    + '  function titleOf(input){' + LF
    + '    var row=input.closest ? input.closest("["+A_OPTION+"]") : null;' + LF
    + '    if (!row) return String(input.value);' + LF
    + '    var t=row.querySelector("."+CLASS_TITLE);' + LF
    + '    return t ? t.textContent : String(input.value);' + LF
    + '  }' + LF
    + '  function fieldsOf(root){' + LF
    + '    var out={}, list=root.querySelectorAll("["+A_FIELD+"]");' + LF
    + '    for (var i=0;i<list.length;i+=1) out[list[i].getAttribute(A_FIELD)]=String(list[i].value);' + LF
    + '    return out;' + LF
    + '  }' + LF
    + '  function fire(root, type, detail){' + LF
    + '    root.dispatchEvent(new CustomEvent(type,{bubbles:true,detail:detail}));' + LF
    + '  }' + LF
    + '  doc.addEventListener("change", function(e){' + LF
    + '    var t=e.target;' + LF
    + '    if (!t || t.type!=="radio") return;' + LF
    + '    var root=rootOf(t); if (!root) return;' + LF
    + '    var prev=root.getAttribute(A_VALUE);' + LF
    + '    var next=String(t.value);' + LF
    + '    root.setAttribute(A_VALUE, next);' + LF
    + '    if (next===prev) return;' + LF
    + '    fire(root, EV_PICK, {name:nameOf(root), index:numOf(root,A_STEP,0),' + LF
    + '      value:next, title:titleOf(t), prev:prev});' + LF
    + '  });' + LF
    + '  doc.addEventListener("click", function(e){' + LF
    + '    var t=e.target;' + LF
    + '    var btn=t && t.closest ? t.closest("["+A_GO+"]") : null;' + LF
    + '    if (!btn || btn.disabled) return;' + LF
    + '    var root=rootOf(btn); if (!root) return;' + LF
    + '    var answered=root.getAttribute(A_VALUE);' + LF
    + '    fire(root, EV_GO, {name:nameOf(root), index:numOf(root,A_STEP,0),' + LF
    + '      go:btn.getAttribute(A_GO), answered:answered!==null, value:answered===null?undefined:answered,' + LF
    + '      fields:fieldsOf(root)});' + LF
    + '  });' + LF
    + '  var all=doc.querySelectorAll("["+A_ROOT+"]");' + LF
    + '  for (var i=0;i<all.length;i+=1) all[i].setAttribute(A_BOUND,"1");' + LF
    + '}());';
}
