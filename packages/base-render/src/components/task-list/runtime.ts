/** task-list · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editableValue.buildEditableValueJs()`／`controls`／`charts` 同一处分工：
 *  模块代码零 DOM；DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `change` 委派；重复注入只绑一次（根标记在 `documentElement`）。
 *     —— 勾选走 `change` 而不是 `click`：鼠标点、键盘空格、读屏触发三条路都汇到这一个事件。
 *   · **唯一事实**：`data-ilife-task-done` 是勾选态的唯一住处；改它就是改事实（类名与复选框跟着它走）。
 *   · **当场重数**：勾一下就把表头与组头的计数、进度条 `scaleX` 一起重画——页面上不留"数字不动"的中间态。
 *   · **忙态挡住写**：根上 `data-ilife-task-busy="1"` 时，勾选**不落账、不派发**，
 *     复选框回弹到 `data-ilife-task-done` 记着的那个态（界面不许显示一个没存上的勾）。
 *   · **禁用行**：复选框 `disabled` 由标记给定，运行时不给它开路（原生 `change` 本就不来）。
 *   · **无脚本降级**：这段不跑时清单照样读得全（勾选态就是渲染时那一次），只是勾不动。
 */
import {
  TASK_BOUND_ATTR, TASK_BAR_ATTR, TASK_BUSY_ATTR, TASK_COUNTS_ATTR, TASK_COUNTS_SEPARATOR,
  TASK_DONE_ATTR, TASK_EVENT_TOGGLE, TASK_GROUP_ATTR, TASK_KEY_ATTR, TASK_LABEL_ATTR,
  TASK_LIST_ATTR, TASK_LIST_CLASS, TASK_OF_ATTR, TASK_ROW_CLASS, TASK_ROW_DONE_CLASS,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildTaskListJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-task-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-task-runtime","1");' + '\n'
    + '  var A_LIST=' + q(TASK_LIST_ATTR) + ', A_KEY=' + q(TASK_KEY_ATTR) + ', A_DONE=' + q(TASK_DONE_ATTR) + ';' + '\n'
    + '  var A_LABEL=' + q(TASK_LABEL_ATTR) + ', A_GROUP=' + q(TASK_GROUP_ATTR) + ', A_COUNTS=' + q(TASK_COUNTS_ATTR) + ';' + '\n'
    + '  var A_OF=' + q(TASK_OF_ATTR) + ', A_BAR=' + q(TASK_BAR_ATTR) + ', A_BUSY=' + q(TASK_BUSY_ATTR) + ';' + '\n'
    + '  var A_BOUND=' + q(TASK_BOUND_ATTR) + ', SEP=' + q(TASK_COUNTS_SEPARATOR) + ';' + '\n'
    + '  var CLASS_DONE=' + q(TASK_ROW_DONE_CLASS) + ', EV=' + q(TASK_EVENT_TOGGLE) + ';' + '\n'
    + '  function rowsOf(root){ return [].slice.call(root.querySelectorAll("["+A_KEY+"]")); }' + '\n'
    + '  function isDone(row){ return row.getAttribute(A_DONE)==="1"; }' + '\n'
    /* 写事实的唯一入口：属性（唯一事实）＋ 修饰类（样式读它）＋ 复选框（原生读它） */
    + '  function setDone(row, on){' + '\n'
    + '    if (on) row.setAttribute(A_DONE,"1"); else row.removeAttribute(A_DONE);' + '\n'
    + '    if (on) row.classList.add(CLASS_DONE); else row.classList.remove(CLASS_DONE);' + '\n'
    + '    var box=row.querySelector("input[type=checkbox]");' + '\n'
    + '    if (box) box.checked=on;' + '\n'
    + '  }' + '\n'
    + '  function countIn(rows){ var n=0, i; for (i=0;i<rows.length;i+=1) if (isDone(rows[i])) n+=1; return n; }' + '\n'
    /* 重画：表头计数 ＋ 进度条（scaleX，只动 transform）＋ 各组分头计数 */
    + '  function paint(root){' + '\n'
    + '    var rows=rowsOf(root), done=countIn(rows), total=rows.length, i, j;' + '\n'
    + '    var bar=root.querySelector("["+A_BAR+"]");' + '\n'
    + '    if (bar){ var p=total===0?0:done/total; bar.style.transform="scaleX("+p.toFixed(4)+")"; }' + '\n'
    + '    var marks=root.querySelectorAll("["+A_COUNTS+"]");' + '\n'
    + '    for (j=0;j<marks.length;j+=1) marks[j].textContent=done+SEP+total;' + '\n'
    + '    var heads=root.querySelectorAll("["+A_OF+"]");' + '\n'
    + '    for (j=0;j<heads.length;j+=1){' + '\n'
    + '      var g=heads[j].getAttribute(A_OF), gd=0, gt=0;' + '\n'
    + '      for (i=0;i<rows.length;i+=1){ var rg=rows[i].getAttribute(A_GROUP); if (rg===null) rg="";' + '\n'
    + '        if (rg!==g) continue; gt+=1; if (isDone(rows[i])) gd+=1; }' + '\n'
    + '      var m=heads[j].querySelector("["+A_COUNTS+"]");' + '\n'
    + '      if (m) m.textContent=gd+SEP+gt;' + '\n'
    + '    }' + '\n'
    + '  }' + '\n'
    /* 忙态：不落账、不派发，把复选框拨回去（界面不许显示一个没存上的勾） */
    + '  function commit(row, on){' + '\n'
    + '    var root=row.closest ? row.closest("["+A_LIST+"]") : null; if (!root) return;' + '\n'
    + '    if (root.getAttribute(A_BUSY)==="1"){ setDone(row, isDone(row)); return; }' + '\n'
    + '    if (isDone(row)===on) return;' + '\n'
    + '    setDone(row, on); paint(root);' + '\n'
    + '    var rows=rowsOf(root);' + '\n'
    + '    root.dispatchEvent(new CustomEvent(EV,{bubbles:true,detail:{' + '\n'
    + '      list:root.getAttribute(A_LIST), key:row.getAttribute(A_KEY), label:row.getAttribute(A_LABEL),' + '\n'
    + '      group:row.getAttribute(A_GROUP), done:on, doneCount:countIn(rows), totalCount:rows.length}}));' + '\n'
    + '  }' + '\n'
    + '  doc.addEventListener("change", function(e){' + '\n'
    + '    var t=e.target; if (!t || t.type!=="checkbox") return;' + '\n'
    + '    var row=t.closest ? t.closest("["+A_KEY+"]") : null; if (!row) return;' + '\n'
    + '    commit(row, t.checked===true);' + '\n'
    + '  });' + '\n'
    /* 发现锚：给每张清单打幂等标记，并把进度先对齐一次（页面改了 data-* 而没重画时也对得上） */
    + '  var all=doc.querySelectorAll("["+A_LIST+"]"), k;' + '\n'
    + '  for (k=0;k<all.length;k+=1){ all[k].setAttribute(A_BOUND,"1"); paint(all[k]); }' + '\n'
    + '}());';
}
