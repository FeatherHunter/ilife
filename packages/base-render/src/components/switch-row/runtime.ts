/** switch-row · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。**重做件**。
 *
 *  行为契约（逐条对应测试）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `change` 委派（原生 `checkbox` 自己管点击、键盘、`空格`）；
 *     重复注入只绑定一次（`data-ilife-switch-runtime`）。
 *   · **三样一起翻**：翻一下同时改 ① 轨道（实心／空心，由 `:checked` 的样式接）② 滑块位置（同上）
 *     ③ 状态字的文本（`已开`／`已关`，运行时段写）＋ 根上的 `data-…-checked`（机器读数）。
 *     **状态字与滑块位置都不依赖颜色**：把配色全抽掉，这两样照样分得开。
 *   · **只在真翻时派发**：`ilife:switch-change`（`detail = { name, label, checked, prev }`）。
 *   · **禁用与更新中一律回弹**：`disabled` 的原生控件本来就翻不动；`loading` 期间被翻到就把勾选状态
 *     拨回 `data-…-checked` 那个值（**不静默接受一次会被后端丢弃的改动**）。
 *   · **无脚本降级**：这段不跑时文案、状态字与开关的原生勾选态都在标记里（`checked` 属性），
 *     只是翻不动——这也是本件"非色"读法的底：`checked` 是标记里的事实，不是样式的产物。
 */
import {
  SWITCH_ROW_BOUND_ATTR,
  SWITCH_ROW_CHECKED_ATTR,
  SWITCH_ROW_CLASS,
  SWITCH_ROW_DISABLED_ATTR,
  SWITCH_ROW_EVENT_CHANGE,
  SWITCH_ROW_INPUT_ATTR,
  SWITCH_ROW_LABEL_ATTR,
  SWITCH_ROW_LOADING,
  SWITCH_ROW_LOADING_ATTR,
  SWITCH_ROW_NAME_ATTR,
  SWITCH_ROW_OFF,
  SWITCH_ROW_ON,
  SWITCH_ROW_STATE_ATTR,
  switchRowSlot,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。
 *  产出里两个写入口：`paint(root, on)`＝把机器读数／状态字／根上的开合类一次写全；
 *  `fire(...)`＝只在真翻时派发。 */
export function buildSwitchRowJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var ATTR_NAME=' + q(SWITCH_ROW_NAME_ATTR) + ', ATTR_CHECKED=' + q(SWITCH_ROW_CHECKED_ATTR)
    + ', ATTR_LABEL=' + q(SWITCH_ROW_LABEL_ATTR) + ';' + '\n'
    + '  var ATTR_INPUT=' + q(SWITCH_ROW_INPUT_ATTR) + ', ATTR_STATE=' + q(SWITCH_ROW_STATE_ATTR)
    + ', ATTR_DISABLED=' + q(SWITCH_ROW_DISABLED_ATTR) + ', ATTR_LOADING=' + q(SWITCH_ROW_LOADING_ATTR) + ';' + '\n'
    + '  var ATTR_BOUND=' + q(SWITCH_ROW_BOUND_ATTR) + ', EV_CHANGE=' + q(SWITCH_ROW_EVENT_CHANGE)
    + ', WORD_ON=' + q(SWITCH_ROW_ON) + ', WORD_OFF=' + q(SWITCH_ROW_OFF)
    + ', WORD_LOADING=' + q(SWITCH_ROW_LOADING) + ';' + '\n'
    + '  var CLS=' + q(SWITCH_ROW_CLASS) + ', CLS_STATE=' + q(switchRowSlot('state'))
    + ', CLASS_ON="is-on", CLASS_OFF="is-off";' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-switch-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-switch-runtime","1");' + '\n'
    + '  function isOn(root){ return root.getAttribute(ATTR_CHECKED)==="1"; }' + '\n'
    + '  function busy(root){ return root.getAttribute(ATTR_DISABLED)==="1" || root.getAttribute(ATTR_LOADING)==="1"; }' + '\n'
    + '  function rootOf(el){ var r=el&&el.closest?el.closest("["+ATTR_NAME+"]"):null; return r; }' + '\n'
    /* 上屏：机器读数 ＋ 状态字 ＋ 根上的开合类（形／字两样同时写，色由样式接）。 */
    + '  function paint(root, on){' + '\n'
    + '    root.setAttribute(ATTR_CHECKED, on?"1":"0");' + '\n'
    + '    root.classList.toggle(CLASS_ON, on);' + '\n'
    + '    root.classList.toggle(CLASS_OFF, !on);' + '\n'
    + '    var chip=root.querySelector("["+ATTR_STATE+"]");' + '\n'
    + '    if (chip) chip.textContent = root.getAttribute(ATTR_LOADING)==="1" ? WORD_LOADING : (on?WORD_ON:WORD_OFF);' + '\n'
    + '  }' + '\n'
    + '  function fire(root, on, prev){' + '\n'
    + '    root.dispatchEvent(new CustomEvent(EV_CHANGE,{bubbles:true,detail:{'
    + 'name:root.getAttribute(ATTR_NAME),label:root.getAttribute(ATTR_LABEL),checked:on,prev:prev}}));' + '\n'
    + '  }' + '\n'
    + '  doc.addEventListener("change", function(e){' + '\n'
    + '    var input=e.target;' + '\n'
    + '    if (!input||!input.getAttribute||input.getAttribute(ATTR_INPUT)===null) return;' + '\n'
    + '    var root=rootOf(input); if (!root) return;' + '\n'
    + '    var prev=isOn(root), on=!!input.checked;' + '\n'
    /* 禁用／更新中：把勾选状态拨回机器读数那个值（不接受一次会被丢弃的改动），也不派发。 */
    + '    if (busy(root)){ input.checked=prev; return; }' + '\n'
    + '    if (on===prev){ paint(root,prev); return; }' + '\n'
    + '    paint(root,on); fire(root,on,prev);' + '\n'
    + '  });' + '\n'
    + '  var all=doc.querySelectorAll("["+ATTR_NAME+"]");' + '\n'
    + '  for (var i=0;i<all.length;i+=1) all[i].setAttribute(ATTR_BOUND,"1");' + '\n'
    + '}());';
}
