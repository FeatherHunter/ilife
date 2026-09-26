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
  REMINDER_SETTER_AT_ATTR,
  REMINDER_SETTER_ATTR,
  REMINDER_SETTER_BOUND_ATTR,
  REMINDER_SETTER_CHOSEN_ATTR,
  REMINDER_SETTER_DATE_STEP_DAYS,
  REMINDER_SETTER_DELTA_ATTR,
  REMINDER_SETTER_EVENT_CHANGE,
  REMINDER_SETTER_FORM_ATTR,
  REMINDER_SETTER_LEAD_ATTR,
  REMINDER_SETTER_PART_ATTR,
  REMINDER_SETTER_PICKED_ATTR,
  REMINDER_SETTER_READ_ATTR,
  REMINDER_SETTER_REPEAT_ATTR,
  REMINDER_SETTER_RUNTIME_ATTR,
  REMINDER_SETTER_START_ATTR,
  REMINDER_SETTER_STEP_ATTR,
  REMINDER_SETTER_TEXT,
  REMINDER_SETTER_TIME_ATTR,
  REMINDER_SETTER_TIME_STEP_MIN,
  REMINDER_SETTER_TOUCH_PX,
  REMINDER_SETTER_VALUE_ATTR,
  pad2,
  reminderSetterClock,
  reminderSetterPlace,
  reminderSetterRecap,
  reminderSetterSlot,
  reminderSetterStepAt,
  reminderSetterStepDate,
  reminderSetterStepTime,
  reminderSetterTrackTail,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进自己的脚本槽）。 */
export function buildReminderSetterJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const T = REMINDER_SETTER_TEXT;
  /** 「哪一档现在被选中」的读数名（复述要那一档的名字，名字在按钮的文字里）。 */
  const READ_RECAP = 'recap';
  /** 形态 `track` 的三个读数名（住在图例那一行与编辑面板里：`at`＝这一条的时刻、`sel`＝选中那条的时刻、
   *  `tail`＝图例那一行的尾一截——重复档或那句「没有通知，不会响」）。 */
  const READ_AT = 'at';
  const READ_SEL = 'sel';
  const READ_TAIL = 'tail';
  /** 形态 `track` 里「点这一枚＝改这一条」的机器键（`data-*` 的 `pick`）。 */
  const PICK = 'pick';
  const FORM_TRACK = 'track';
  return '(function(){' + '\n'
    + '  var A_ROOT=' + q(REMINDER_SETTER_ATTR) + ', A_PART=' + q(REMINDER_SETTER_PART_ATTR)
    + ', A_VALUE=' + q(REMINDER_SETTER_VALUE_ATTR) + ';' + '\n'
    + '  var A_STEP=' + q(REMINDER_SETTER_STEP_ATTR) + ', A_DELTA=' + q(REMINDER_SETTER_DELTA_ATTR)
    + ', A_READ=' + q(REMINDER_SETTER_READ_ATTR) + ';' + '\n'
    + '  var A_TIME=' + q(REMINDER_SETTER_TIME_ATTR) + ', A_START=' + q(REMINDER_SETTER_START_ATTR)
    + ', A_BOUND=' + q(REMINDER_SETTER_BOUND_ATTR) + ', A_RT=' + q(REMINDER_SETTER_RUNTIME_ATTR) + ';' + '\n'
    + '  var A_FORM=' + q(REMINDER_SETTER_FORM_ATTR) + ', A_AT=' + q(REMINDER_SETTER_AT_ATTR)
    + ', A_PICKED=' + q(REMINDER_SETTER_PICKED_ATTR) + ', A_REPEAT=' + q(REMINDER_SETTER_REPEAT_ATTR)
    + ', A_LEAD=' + q(REMINDER_SETTER_LEAD_ATTR) + ', A_CHOSEN=' + q(REMINDER_SETTER_CHOSEN_ATTR) + ';' + '\n'
    + '  var EV=' + q(REMINDER_SETTER_EVENT_CHANGE) + ', READ_RECAP=' + q(READ_RECAP)
    + ', READ_AT=' + q(READ_AT) + ', READ_SEL=' + q(READ_SEL) + ', READ_TAIL=' + q(READ_TAIL) + ';' + '\n'
    + '  var PICK=' + q(PICK) + ', ROUTE="route", FORM_TRACK=' + q(FORM_TRACK) + ';' + '\n'
    + '  var STEP_MIN=' + String(REMINDER_SETTER_TIME_STEP_MIN) + ', STEP_DAY=' + String(REMINDER_SETTER_DATE_STEP_DAYS)
    + ', TOUCH=' + String(REMINDER_SETTER_TOUCH_PX) + ', ON="is-on";' + '\n'
    + '  var C_TRAY=' + q(reminderSetterSlot('tray')) + ', C_RACK=' + q(reminderSetterSlot('rack'))
    + ', C_DOT=' + q(reminderSetterSlot('dot')) + ';' + '\n'
    /* 两份口径的**唯一正本**：渲染期跑的就是这几个函数，这里嵌的也是同一份源码（`toString()`）。 */
    /* 名字必须叫 `pad2`：嵌进去的 `STEP_TIME`／`STEP_DATE`／`CLOCK` 里调的就是 `pad2(…)`，
     *  叫 `PAD2` 那一段就找不到它 —— 真机上每按一次步进键都抛 `ReferenceError`，读数一动不动。 */
    + '  var pad2=' + pad2.toString() + ';' + '\n'
    + '  var STEP_TIME=' + reminderSetterStepTime.toString() + ';' + '\n'
    + '  var STEP_DATE=' + reminderSetterStepDate.toString() + ';' + '\n'
    + '  var RECAP=' + reminderSetterRecap.toString() + ';' + '\n'
    + '  var CLOCK=' + reminderSetterClock.toString() + ';' + '\n'
    + '  var PLACE=' + reminderSetterPlace.toString() + ';' + '\n'
    + '  var STEP_AT=' + reminderSetterStepAt.toString() + ';' + '\n'
    + '  var TAIL=' + reminderSetterTrackTail.toString() + ';' + '\n'
    + '  var TEXT={silent:' + q(T.silent) + '};' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute(A_RT)==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute(A_RT,"1");' + '\n'
    + '  function fire(root,name,detail){ root.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail})); }\n'
    + '  function rootOf(el){ return (el && el.closest) ? el.closest("["+A_ROOT+"]") : null; }\n'
    + '  function isTrack(root){ return root.getAttribute(A_FORM)===FORM_TRACK; }\n'
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
    /* ── 形态 `track`：**一条提醒自己那几枚读数**（点与图例那一行都挂着同一份，两处一起改） ──────
     *  机器读数住在可点件自己的 `data-*` 上（`-at` ／ `-repeat` ／ `-lead` ／ `-chosen`），
     *  不从屏上的文字反推——时间那一格是 `CLOCK(at)` 算出来的另一种摆法。 */
    + '  function itemsOf(root){ return [].slice.call(root.querySelectorAll("["+A_PART+"=\\""+PICK+"\\"]")); }\n'
    + '  function pickedEl(root){\n'
    + '    var all=itemsOf(root), i;\n'
    + '    for (i=0;i<all.length;i+=1) if (all[i].getAttribute("aria-pressed")==="true") return all[i];\n'
    + '    return all.length>0 ? all[0] : null;\n'
    + '  }\n'
    + '  function setItems(root,id,attr,value){\n'
    + '    var all=itemsOf(root), i;\n'
    + '    for (i=0;i<all.length;i+=1) if (all[i].getAttribute(A_VALUE)===id) all[i].setAttribute(attr,value);\n'
    + '  }\n'
    + '  function keysOf(root,part){\n'
    + '    var all=root.querySelectorAll("["+A_PART+"=\\""+part+"\\"][aria-pressed=\\"true\\"]"), out=[], i;\n'
    + '    for (i=0;i<all.length;i+=1) out.push(all[i].getAttribute(A_VALUE));\n'
    + '    return out;\n'
    + '  }\n'
    + '  function wordOf(root,part){\n'
    + '    var all=root.querySelectorAll("["+A_PART+"=\\""+part+"\\"][aria-pressed=\\"true\\"]");\n'
    + '    return all.length>0 ? (all[0].textContent||"") : "";\n'
    + '  }\n'
    + '  function chosenOf(el){\n'
    + '    var raw=String(el.getAttribute(A_CHOSEN)||"").split(" "), out=[], i;\n'
    + '    for (i=0;i<raw.length;i+=1) if (raw[i]!=="") out.push(raw[i]);\n'
    + '    return out;\n'
    + '  }\n'
    + '  function placeCss(at){ return "calc((100% - "+TOUCH+"px) * "+PLACE(at)+" + "+(TOUCH/2)+"px)"; }\n'
    /* 一块状态的**唯一读法**（形态 `track`）：逐条念一遍这一天有哪几条、各自落在哪儿、各自三个决定。 */
    + '  function trackState(root){\n'
    + '    var all=itemsOf(root), seen={}, out=[], i, sel=pickedEl(root);\n'
    + '    for (i=0;i<all.length;i+=1){\n'
    + '      var id=all[i].getAttribute(A_VALUE);\n'
    + '      if (seen[id]===true) continue;\n'
    + '      seen[id]=true;\n'
    + '      var at=Number(all[i].getAttribute(A_AT));\n'
    + '      out.push({id:id,at:at,time:CLOCK(at),repeat:all[i].getAttribute(A_REPEAT),'
    + 'lead:all[i].getAttribute(A_LEAD),routes:chosenOf(all[i])});\n'
    + '    }\n'
    + '    return {picked: sel ? sel.getAttribute(A_VALUE) : "", items: out};\n'
    + '  }\n'
    /* 一处改动之后：这一条的三处屏面一起重写（刻度上那枚点的位置、图例那行的时刻、面板里那枚读数），
       图例的尾一截跟着选中那条的重复档／勾数走。 */
    + '  function paintTrack(root){\n'
    + '    var all=itemsOf(root), sel=null, i, at, cell;\n'
    + '    for (i=0;i<all.length;i+=1){\n'
    + '      if (sel===null && all[i].getAttribute("aria-pressed")==="true") sel=all[i];\n'
    + '      at=Number(all[i].getAttribute(A_AT));\n'
    + '      if ((" "+all[i].className+" ").indexOf(" "+C_DOT+" ")>=0) all[i].style.left=placeCss(at);\n'
    + '      cell=all[i].querySelector("["+A_READ+"=\\""+READ_AT+"\\"]");\n'
    + '      if (cell) cell.textContent=CLOCK(at);\n'
    + '    }\n'
    + '    if (!sel) sel=all[0];\n'
    + '    var id=sel.getAttribute(A_VALUE);\n'
    + '    root.setAttribute(A_PICKED,id);\n'
    + '    root.setAttribute(A_AT,sel.getAttribute(A_AT));\n'
    /* 尾一截住在**图例那一行**（不在刻度那枚点上）：按机器键找该改的那几处，不去点上找它。 */
    + '    var tail=TAIL(wordOf(root,"repeat"), keysOf(root,ROUTE).length, TEXT);\n'
    + '    for (i=0;i<all.length;i+=1){\n'
    + '      if (all[i].getAttribute(A_VALUE)!==id) continue;\n'
    + '      cell=all[i].querySelector("["+A_READ+"=\\""+READ_TAIL+"\\"]");\n'
    + '      if (cell) cell.textContent=tail;\n'
    + '    }\n'
    + '    var now=root.querySelector("["+A_READ+"=\\""+READ_SEL+"\\"]");\n'
    + '    if (now) now.textContent=CLOCK(Number(sel.getAttribute(A_AT)));\n'
    + '    return trackState(root);\n'
    + '  }\n'
    /* 选中那一条：**点与图例那一行两处一起翻**，面板里那三排换成这一条自己的三个决定
       （不换面板＝下面画的还是上一条的，用户看到的是别人的设定）。 */
    + '  function selectItem(root,id){\n'
    + '    var all=itemsOf(root), i, j;\n'
    + '    for (i=0;i<all.length;i+=1){\n'
    + '      var on=(all[i].getAttribute(A_VALUE)===id);\n'
    + '      if (on){ all[i].classList.add(ON); all[i].setAttribute("aria-pressed","true"); }\n'
    + '      else { all[i].classList.remove(ON); all[i].setAttribute("aria-pressed","false"); }\n'
    + '    }\n'
    + '    var anchor=null;\n'
    + '    for (i=0;i<all.length;i+=1) if (all[i].getAttribute(A_VALUE)===id){ anchor=all[i]; break; }\n'
    + '    if (!anchor) return;\n'
    + '    var rep=anchor.getAttribute(A_REPEAT), lead=anchor.getAttribute(A_LEAD), chosen=chosenOf(anchor);\n'
    + '    var list=root.querySelectorAll("["+A_PART+"]");\n'
    + '    for (j=0;j<list.length;j+=1){\n'
    + '      var part=list[j].getAttribute(A_PART);\n'
    + '      if (part===PICK) continue;\n'
    + '      var v=list[j].getAttribute(A_VALUE);\n'
    + '      var yes=part==="repeat" ? (v===rep) : (part==="lead" ? (v===lead) : chosen.indexOf(v)>=0);\n'
    + '      if (yes){ list[j].classList.add(ON); list[j].setAttribute("aria-pressed","true"); }\n'
    + '      else { list[j].classList.remove(ON); list[j].setAttribute("aria-pressed","false"); }\n'
    + '    }\n'
    + '  }\n'
    /* 面板上改完之后：把这一条自己的那几枚读数**回写**到它身上（切走再切回还是刚改的那样）。
       **写的是机器键**（`data-value`），不是屏上那个档名——档名会在下一次换皮／换文案时变。 */
    + '  function writeBack(root){\n'
    + '    var sel=pickedEl(root); if (!sel) return "";\n'
    + '    var id=sel.getAttribute(A_VALUE);\n'
    + '    var rep=keysOf(root,"repeat"), led=keysOf(root,"lead");\n'
    + '    setItems(root,id,A_REPEAT,rep.length>0 ? rep[0] : "");\n'
    + '    setItems(root,id,A_LEAD,led.length>0 ? led[0] : "");\n'
    + '    setItems(root,id,A_CHOSEN,keysOf(root,ROUTE).join(" "));\n'
    + '    return id;\n'
    + '  }\n'
    + '  doc.addEventListener("click",function(e){\n'
    + '    var t=e.target;\n'
    + '    if (!t || !t.closest) return;\n'
    + '    var key=t.closest("["+A_STEP+"]");\n'
    + '    if (key){\n'
    + '      var rk=rootOf(key); if (!rk) return;\n'
    + '      var which=key.getAttribute(A_STEP), d=Number(key.getAttribute(A_DELTA));\n'
    + '      if (isTrack(rk)){\n'
    + '        var sel0=pickedEl(rk); if (!sel0) return;\n'
    + '        var id0=sel0.getAttribute(A_VALUE), at0=Number(sel0.getAttribute(A_AT));\n'
    + '        var next=STEP_AT(at0, d, STEP_MIN);\n'
    + '        setItems(rk,id0,A_AT,String(next));\n'
    + '        var stA=paintTrack(rk);\n'
    + '        fire(rk,EV,{id:rk.getAttribute(A_ROOT),part:which,value:CLOCK(next),state:stA});\n'
    + '        return;\n'
    + '      }\n'
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
    /* 刻度上的一枚点／图例的一行：点哪个都是「改这一条」（两处都挂着 `pick` 这个机器键）。 */
    + '    if (part===PICK){\n'
    + '      selectItem(root,hit.getAttribute(A_VALUE));\n'
    + '      var stP=paintTrack(root);\n'
    + '      fire(root,EV,{id:root.getAttribute(A_ROOT),part:PICK,value:hit.getAttribute(A_VALUE),state:stP});\n'
    + '      return;\n'
    + '    }\n'
    + '    if (part==="route") toggle(hit); else pick(root,hit);\n'
    + '    if (isTrack(root)){\n'
    + '      writeBack(root);\n'
    + '      var stT=paintTrack(root);\n'
    + '      fire(root,EV,{id:root.getAttribute(A_ROOT),part:part,value:hit.getAttribute(A_VALUE),state:stT});\n'
    + '      return;\n'
    + '    }\n'
    + '    var st=paint(root);\n'
    + '    fire(root,EV,{id:root.getAttribute(A_ROOT),part:part,value:hit.getAttribute(A_VALUE),state:st});\n'
    + '  });\n'
    + '  var roots=doc.querySelectorAll("["+A_ROOT+"]");\n'
    + '  for (var m=0;m<roots.length;m+=1){\n'
    + '    roots[m].setAttribute(A_BOUND,"1");\n'
    + '    if (isTrack(roots[m])) paintTrack(roots[m]); else paint(roots[m]);\n'
    + '  }\n'
    + '}());';
}
