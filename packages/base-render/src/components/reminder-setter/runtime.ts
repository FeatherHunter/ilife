/** reminder-setter · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  行为契约（逐条对应判据）：
 *   · **点一下就改**：`document` 上一枚委派的 `click`——单选的胶囊（什么时候响／提前多久）在同一排内
 *     挪选中；多选的方框（走哪条通知）各自翻一次；两枚步进键按档走一步（时间 ±5 分钟、跨零点绕回；
 *     日期 ±1 天）。**没有键盘通路**：这一段不接任何键盘事件，`:focus-visible` 只是真实键盘用户的地板。
 *   · **屏上是真读数**：机器读数住在根上的 `data-ilife-reminder-time`／`-start`（**不从 DOM 文本反推**），
 *     改完把三处屏面一起重写：两枚读数格（时间／日期）＋**全件唯一那行复述**。
 *     复述里那句「没有通知，不会响」与渲染期**同一份源码**（`reminderSetterRecap` 原样嵌进来），
 *     两处各写一遍那句口径迟早走散（口径同 `relation-picker` 的 `HITS`／`FOOT`）。
 *   · **状态两处一起翻**：选中那枚挂 `is-on` ＋ `aria-pressed="true"`，同一排其余落回 `false`
 *     （只在渲染期写 `is-on` 的话，真机上点出来的选中态就没有那一档形——本批已有件栽在这上面）。
 *   · **一条通知都不勾是合法态**：勾掉的最后一枚照常能勾回来，屏上读成「没有通知，不会响」，
 *     不把控件变灰、也不弹一句解释。
 *   · **每次都派发一条**：`ilife:reminder-setter-change`，`detail={id,part,value,state}`
 *     （`part`＝`repeat`／`lead`／`route`／`time`／`start`；`state` 是改完之后的全量读数）。
 *     本件**不写库**：写库归页面（页面按 `detail.state` 落盘，再重渲染）。
 *   · **幂等**：`<html>` 上一枚 `data-ilife-reminder-runtime` 拦住重复注入；每张卡上记一枚 bound 读数。
 */
import {
  REMINDER_SETTER_ATTR,
  REMINDER_SETTER_BOUND_ATTR,
  REMINDER_SETTER_DATE_STEP_DAYS,
  REMINDER_SETTER_DELTA_ATTR,
  REMINDER_SETTER_EVENT_CHANGE,
  REMINDER_SETTER_PART_ATTR,
  REMINDER_SETTER_READ_ATTR,
  REMINDER_SETTER_RUNTIME_ATTR,
  REMINDER_SETTER_START_ATTR,
  REMINDER_SETTER_STEP_ATTR,
  REMINDER_SETTER_TEXT,
  REMINDER_SETTER_TIME_ATTR,
  REMINDER_SETTER_TIME_STEP_MIN,
  REMINDER_SETTER_VALUE_ATTR,
  pad2,
  reminderSetterRecap,
  reminderSetterSlot,
  reminderSetterStepDate,
  reminderSetterStepTime,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进自己的脚本槽）。 */
export function buildReminderSetterJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const T = REMINDER_SETTER_TEXT;
  /** 「哪一档现在被选中」的读数名（复述要那一档的名字，名字在按钮的文字里）。 */
  const READ_RECAP = 'recap';
  return '(function(){' + '\n'
    + '  var A_ROOT=' + q(REMINDER_SETTER_ATTR) + ', A_PART=' + q(REMINDER_SETTER_PART_ATTR)
    + ', A_VALUE=' + q(REMINDER_SETTER_VALUE_ATTR) + ';' + '\n'
    + '  var A_STEP=' + q(REMINDER_SETTER_STEP_ATTR) + ', A_DELTA=' + q(REMINDER_SETTER_DELTA_ATTR)
    + ', A_READ=' + q(REMINDER_SETTER_READ_ATTR) + ';' + '\n'
    + '  var A_TIME=' + q(REMINDER_SETTER_TIME_ATTR) + ', A_START=' + q(REMINDER_SETTER_START_ATTR)
    + ', A_BOUND=' + q(REMINDER_SETTER_BOUND_ATTR) + ', A_RT=' + q(REMINDER_SETTER_RUNTIME_ATTR) + ';' + '\n'
    + '  var EV=' + q(REMINDER_SETTER_EVENT_CHANGE) + ', READ_RECAP=' + q(READ_RECAP) + ';' + '\n'
    + '  var STEP_MIN=' + String(REMINDER_SETTER_TIME_STEP_MIN) + ', STEP_DAY=' + String(REMINDER_SETTER_DATE_STEP_DAYS)
    + ', ON="is-on";' + '\n'
    + '  var C_TRAY=' + q(reminderSetterSlot('tray')) + ', C_RACK=' + q(reminderSetterSlot('rack')) + ';' + '\n'
    /* 两份口径的**唯一正本**：渲染期跑的就是这四个函数，这里嵌的也是同一份源码（`toString()`）。 */
    /* 名字必须叫 `pad2`：嵌进去的 `STEP_TIME`／`STEP_DATE` 里调的就是 `pad2(…)`，
     *  叫 `PAD2` 那一段就找不到它 —— 真机上每按一次步进键都抛 `ReferenceError`，读数一动不动。 */
    + '  var pad2=' + pad2.toString() + ';' + '\n'
    + '  var STEP_TIME=' + reminderSetterStepTime.toString() + ';' + '\n'
    + '  var STEP_DATE=' + reminderSetterStepDate.toString() + ';' + '\n'
    + '  var RECAP=' + reminderSetterRecap.toString() + ';' + '\n'
    + '  var TEXT={silent:' + q(T.silent) + '};' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute(A_RT)==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute(A_RT,"1");' + '\n'
    + '  function fire(root,name,detail){ root.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail})); }\n'
    + '  function rootOf(el){ return (el && el.closest) ? el.closest("["+A_ROOT+"]") : null; }\n'
    /* 一份状态的**唯一读法**：机器读数从根上的 `data-*` 取，选中态从 `aria-pressed` 取
       （屏上的文字只用来读那一档的名字，不当机器读数使）。 */
    + '  function stateOf(root){\n'
    + '    var off=[].slice.call(root.querySelectorAll("["+A_PART+"]")), i, st={repeat:"",lead:"",routes:[]};\n'
    + '    for (i=0;i<off.length;i+=1){\n'
    + '      if (off[i].getAttribute("aria-pressed")!=="true") continue;\n'
    + '      var part=off[i].getAttribute(A_PART), key=off[i].getAttribute(A_VALUE);\n'
    + '      if (part==="repeat") st.repeat=(off[i].textContent||"");\n'
    + '      else if (part==="lead") st.lead=key;\n'
    + '      else if (part==="route") st.routes.push(key);\n'
    + '    }\n'
    + '    st.time=root.getAttribute(A_TIME)||"";\n'
    + '    st.startDate=root.getAttribute(A_START)||"";\n'
    + '    return st;\n'
    + '  }\n'
    /* 一处改动之后：三处屏面一起重写（两枚读数格 ＋ 唯一那行复述）。
       只重写字，不重建节点（重建会把屏读器的游标与动画一起打断）。 */
    + '  function paint(root){\n'
    + '    var st=stateOf(root);\n'
    + '    var t=root.querySelector("["+A_READ+"=\\"time\\"]"); if (t) t.textContent=st.time;\n'
    + '    var s=root.querySelector("["+A_READ+"=\\"start\\"]"); if (s) s.textContent=st.startDate;\n'
    + '    var r=root.querySelector("["+A_READ+"=\\""+READ_RECAP+"\\"]");\n'
    + '    if (r) r.textContent=RECAP(st.repeat, st.startDate, st.time, st.routes.length, TEXT);\n'
    + '    return st;\n'
    + '  }\n'
    /* 单选：同一排里只有被点的那一枚是选中（旧的那一枚必须先撤——两张都亮＝两张都像选中）。 */
    + '  function pick(root,hit){\n'
    + '    var part=hit.getAttribute(A_PART);\n'
    + '    var all=root.querySelectorAll("["+A_PART+"=\\""+part+"\\"]"), i;\n'
    + '    for (i=0;i<all.length;i+=1){\n'
    + '      var on=(all[i]===hit);\n'
    + '      if (on){ all[i].classList.add(ON); all[i].setAttribute("aria-pressed","true"); }\n'
    + '      else { all[i].classList.remove(ON); all[i].setAttribute("aria-pressed","false"); }\n'
    + '    }\n'
    + '  }\n'
    /* 多选：各自翻一次（勾上的那枚走主色实底＋勾，没勾的落回纸面）。 */
    + '  function toggle(hit){\n'
    + '    var on=hit.getAttribute("aria-pressed")==="true";\n'
    + '    if (on){ hit.classList.remove(ON); hit.setAttribute("aria-pressed","false"); }\n'
    + '    else { hit.classList.add(ON); hit.setAttribute("aria-pressed","true"); }\n'
    + '  }\n'
    + '  doc.addEventListener("click",function(e){\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.closest) return;\n'
    + '    var key=t.closest("["+A_STEP+"]");\n'
    + '    if (key){\n'
    + '      var rk=rootOf(key); if (!rk) return;\n'
    + '      var which=key.getAttribute(A_STEP), d=Number(key.getAttribute(A_DELTA));\n'
    + '      var value=which==="time"\n'
    + '        ? STEP_TIME(rk.getAttribute(A_TIME)||"", d, STEP_MIN)\n'
    + '        : STEP_DATE(rk.getAttribute(A_START)||"", d, STEP_DAY);\n'
    + '      if (which==="time") rk.setAttribute(A_TIME,value); else rk.setAttribute(A_START,value);\n'
    + '      var st1=paint(rk);\n'
    + '      fire(rk,EV,{id:rk.getAttribute(A_ROOT),part:which,value:value,state:st1});\n'
    + '      return;\n'
    + '    }\n'
    + '    var hit=t.closest("["+A_PART+"]");\n'
    + '    if (!hit) return;\n'
    + '    var root=rootOf(hit); if (!root) return;\n'
    + '    var part=hit.getAttribute(A_PART);\n'
    + '    if (part==="route") toggle(hit); else pick(root,hit);\n'
    + '    var st=paint(root);\n'
    + '    fire(root,EV,{id:root.getAttribute(A_ROOT),part:part,value:hit.getAttribute(A_VALUE),state:st});\n'
    + '  });\n'
    + '  var roots=doc.querySelectorAll("["+A_ROOT+"]");\n'
    + '  for (var m=0;m<roots.length;m+=1){\n'
    + '    roots[m].setAttribute(A_BOUND,"1");\n'
    + '    paint(roots[m]);\n'
    + '  }\n'
    + '}());';
}
