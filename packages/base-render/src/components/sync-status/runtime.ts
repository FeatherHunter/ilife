/** sync-status · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editable-value`／`controls.buildSharedHelpersJs()` 同一处分工：模块代码零 DOM，
 *  DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click` 委派；重复注入只绑一次（`documentElement` 上的记号）。
 *   · **按下**：按钮进 `running` —— `data-ilife-sync-state="running"` ＋ `disabled` ＋ `aria-busy="true"`；
 *     按钮里那枚「同步中…」上屏（两枚字占同一格 ⇒ **宽度不跳**）；派发 `SYNC_STATUS_EVENT_RUN`
 *     （冒泡，`detail = { action, targets }` —— `targets` 是这份清单里各目标的名字）。
 *   · **跑完**：调用方派发 `SYNC_STATUS_EVENT_DONE`（`detail = { ok, message? }`）→ 出 `running`；
 *     `ok === false` ⇒ 错误行写在**控件旁边** ＋ `aria-describedby` 指过去（不只染色）。
 *   · **不许卡住**：`SYNC_STATUS_RUN_TIMEOUT_MS` 到点还没消息 ⇒ 出 `running` ＋ 错误行说「没收到回应」。
 *   · **无脚本降级**：这段不跑时清单照常可读，只是按不动（按钮是原生 `button`，键盘仍能聚焦）。
 *   · **只动 class／属性／一段文本**：不动版面尺寸（按钮宽度由两枚字中最宽的那枚决定）。
 */
import {
  SYNC_STATUS_ACTION_ATTR,
  SYNC_STATUS_ATTR,
  SYNC_STATUS_BOUND_ATTR,
  SYNC_STATUS_CLASS,
  SYNC_STATUS_ERROR_ATTR,
  SYNC_STATUS_EVENT_DONE,
  SYNC_STATUS_EVENT_RUN,
  SYNC_STATUS_FAILED_TEXT,
  SYNC_STATUS_RUN_TIMEOUT_MS,
  SYNC_STATUS_STATES,
  SYNC_STATUS_STATE_ATTR,
  SYNC_STATUS_TIMEOUT_TEXT,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildSyncStatusJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var ATTR=' + q(SYNC_STATUS_ATTR) + ', ATTR_ACTION=' + q(SYNC_STATUS_ACTION_ATTR) + ';' + '\n'
    + '  var ATTR_STATE=' + q(SYNC_STATUS_STATE_ATTR) + ', ATTR_BOUND=' + q(SYNC_STATUS_BOUND_ATTR) + ';' + '\n'
    + '  var ATTR_ERROR=' + q(SYNC_STATUS_ERROR_ATTR) + ', CLASS_ROOT=' + q(SYNC_STATUS_CLASS) + ';' + '\n'
    + '  var EV_RUN=' + q(SYNC_STATUS_EVENT_RUN) + ', EV_DONE=' + q(SYNC_STATUS_EVENT_DONE) + ';' + '\n'
    + '  var ST_RUNNING=' + q(SYNC_STATUS_STATES[1]) + ', ST_IDLE=' + q(SYNC_STATUS_STATES[0]) + ';' + '\n'
    + '  var ST_FAILED=' + q(SYNC_STATUS_STATES[2]) + ', TIMEOUT=' + String(SYNC_STATUS_RUN_TIMEOUT_MS) + ';' + '\n'
    + '  var TX_TIMEOUT=' + q(SYNC_STATUS_TIMEOUT_TEXT) + ', TX_FAILED=' + q(SYNC_STATUS_FAILED_TEXT) + ';' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-sync-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-sync-runtime","1");' + '\n'
    + '  function rootOf(el){ return el && el.closest ? el.closest("["+ATTR+"]") : null; }' + '\n'
    + '  function buttonOf(root){ return root.querySelector("["+ATTR_ACTION+"]"); }' + '\n'
    + '  function errorOf(root){ return root.querySelector("["+ATTR_ERROR+"]"); }' + '\n'
    + '  function namesOf(root){' + '\n'
    + '    var out=[], cells=root.querySelectorAll("."+CLASS_ROOT+"-name");' + '\n'
    + '    for (var i=0;i<cells.length;i+=1) out.push(cells[i].textContent);' + '\n'
    + '    return out;' + '\n'
    + '  }' + '\n'
    /* 错误行：写在控件旁边 ＋ 把 aria-describedby 指过去（没话说时把指向收回来）。 */
    + '  function fail(root, message){' + '\n'
    + '    var box=errorOf(root), btn=buttonOf(root);' + '\n'
    + '    root.setAttribute(ATTR_STATE, ST_FAILED);' + '\n'
    + '    if (box){ box.textContent=message; box.hidden=false;'
    + ' if (btn && box.id) btn.setAttribute("aria-describedby", box.id); }' + '\n'
    + '  }' + '\n'
    + '  function clearError(root){' + '\n'
    + '    var box=errorOf(root), btn=buttonOf(root);' + '\n'
    + '    if (box){ box.textContent=""; box.hidden=true; }' + '\n'
    + '    if (btn) btn.removeAttribute("aria-describedby");' + '\n'
    + '  }' + '\n'
    + '  function settle(root, state){' + '\n'
    + '    if (root.__ilifeSyncTimer){ clearTimeout(root.__ilifeSyncTimer); root.__ilifeSyncTimer=null; }' + '\n'
    + '    var btn=buttonOf(root);' + '\n'
    + '    root.setAttribute(ATTR_STATE, state);' + '\n'
    + '    if (btn){ btn.disabled=false; btn.removeAttribute("aria-busy"); }' + '\n'
    + '  }' + '\n'
    + '  function start(root){' + '\n'
    + '    var btn=buttonOf(root); if (!btn || btn.disabled) return;' + '\n'
    + '    clearError(root);' + '\n'
    + '    root.setAttribute(ATTR_STATE, ST_RUNNING);' + '\n'
    + '    btn.disabled=true; btn.setAttribute("aria-busy","true");' + '\n'
    + '    if (root.__ilifeSyncTimer) clearTimeout(root.__ilifeSyncTimer);' + '\n'
    + '    root.__ilifeSyncTimer=setTimeout(function(){ settle(root, ST_FAILED); fail(root, TX_TIMEOUT); }, TIMEOUT);' + '\n'
    + '    root.dispatchEvent(new CustomEvent(EV_RUN,{bubbles:true,detail:{'
    + 'action:btn.getAttribute(ATTR_ACTION),targets:namesOf(root)}}));' + '\n'
    + '  }' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var t=e.target; if (!t || !t.closest) return;' + '\n'
    + '    var btn=t.closest("["+ATTR_ACTION+"]"); if (!btn || btn.disabled) return;' + '\n'
    + '    var root=rootOf(btn); if (!root) return;' + '\n'
    + '    e.preventDefault(); start(root);' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener(EV_DONE, function(e){' + '\n'
    + '    var node=e.target; var root=rootOf(node); if (!root) return;' + '\n'
    + '    var d=(e.detail||{});' + '\n'
    + '    settle(root, ST_IDLE);' + '\n'
    + '    if (d.ok===false){ fail(root, d.message ? String(d.message) : TX_FAILED); } else { clearError(root); }' + '\n'
    + '  });' + '\n'
    + '  var all=doc.querySelectorAll("["+ATTR+"]");' + '\n'
    + '  for (var j=0;j<all.length;j+=1) all[j].setAttribute(ATTR_BOUND,"1");' + '\n'
    + '}());';
}
