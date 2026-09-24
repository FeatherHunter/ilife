/** timer-card · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editableValue.buildEditableValueJs()`／`taskList.buildTaskListJs()` 同一处分工：
 *  模块代码零 DOM；DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click` 委派；重复注入只绑一次（根标记在 `documentElement`）。
 *   · **一个心跳驱动全页**：所有卡共用一个 `setInterval`（`TIMER_CARD_TICK_MS`）；没有在跑的卡就停表。
 *   · **按时间记账，不数 tick**：运行中记的是"到点时刻"（`Date.now() + 剩余`），
 *     标签页被节流也只跳到该在的位置（数 tick 会越走越慢）。
 *   · **状态机**：`idle → running ⇄ paused → done`；主按钮一枚按状态换字（开始／暂停／继续／重新开始）。
 *   · **重置**：回到 `idle`、剩余＝总时长、清掉到点时刻。
 *   · **到点**：剩余归零 ⇒ `done` ＋ 大数字停在 `00:00` ＋ 派发 `ilife:timer-done`。
 *   · **忙态／禁用／空态**：`busy` 时主按钮换字并锁住；禁用或总时长为 0（空态）时按钮按不动，点了不落账。
 *   · **无脚本降级**：这段不跑时卡上的读数就是渲染时那一刻（大数字、已过、还剩都印在页上），只是不走。
 */
import {
  TIMER_ACT_ATTR, TIMER_BAR_ATTR, TIMER_BOUND_ATTR, TIMER_BUSY_ATTR, TIMER_CARD_MISSING,
  TIMER_CARD_TICK_MS, TIMER_DISABLED_ATTR, TIMER_DISPLAY_ATTR, TIMER_ELAPSED_ATTR,
  TIMER_EVENT_DONE, TIMER_EVENT_STATE, TIMER_KEY_ATTR, TIMER_LOADING_LABEL, TIMER_PRIMARY_LABELS,
  TIMER_REMAIN_ATTR, TIMER_REST_ATTR, TIMER_STATE_ATTR, TIMER_STATE_WORDS, TIMER_TAG_ATTR,
  TIMER_TOTAL_ATTR, timerCardSlot,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildTimerCardJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const words = JSON.stringify(TIMER_STATE_WORDS);
  const labels = JSON.stringify(TIMER_PRIMARY_LABELS);
  /* 两枚按钮的选择器在**产出期**就拼好（值都是常量）⇒ 产出文本里不必再拼引号。 */
  const selToggle = q('[' + TIMER_ACT_ATTR + '="toggle"]');
  const selReset = q('[' + TIMER_ACT_ATTR + '="reset"]');
  return '(function(){' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-timer-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-timer-runtime","1");' + '\n'
    + '  var A_KEY=' + q(TIMER_KEY_ATTR) + ', A_STATE=' + q(TIMER_STATE_ATTR) + ', A_REMAIN=' + q(TIMER_REMAIN_ATTR) + ';' + '\n'
    + '  var A_TOTAL=' + q(TIMER_TOTAL_ATTR) + ', A_DISPLAY=' + q(TIMER_DISPLAY_ATTR) + ', A_BAR=' + q(TIMER_BAR_ATTR) + ';' + '\n'
    + '  var A_TAG=' + q(TIMER_TAG_ATTR) + ', A_ELAPSED=' + q(TIMER_ELAPSED_ATTR) + ', A_REST=' + q(TIMER_REST_ATTR) + ';' + '\n'
    + '  var A_ACT=' + q(TIMER_ACT_ATTR) + ', A_DISABLED=' + q(TIMER_DISABLED_ATTR) + ', A_BUSY=' + q(TIMER_BUSY_ATTR) + ';' + '\n'
    + '  var A_BOUND=' + q(TIMER_BOUND_ATTR) + ', TAG_CLASS=' + q(timerCardSlot('tag')) + ', MISSING=' + q(TIMER_CARD_MISSING) + ';' + '\n'
    + '  var WORDS=' + words + ', LABELS=' + labels + ', LOADING_LABEL=' + q(TIMER_LOADING_LABEL) + ';' + '\n'
    + '  var EV_STATE=' + q(TIMER_EVENT_STATE) + ', EV_DONE=' + q(TIMER_EVENT_DONE) + ', TICK=' + TIMER_CARD_TICK_MS + ';' + '\n'
    + '  function pad2(n){ return (n<10?"0":"")+n; }' + '\n'
    /* 与渲染段同一口径：MM:SS，≥1 小时才出小时位 */
    + '  function clock(sec){ sec=Math.max(0,Math.round(sec)); var h=Math.floor(sec/3600);' + '\n'
    + '    var m=Math.floor((sec-h*3600)/60), s=sec-h*3600-m*60;' + '\n'
    + '    return h>0 ? h+":"+pad2(m)+":"+pad2(s) : pad2(m)+":"+pad2(s); }' + '\n'
    + '  function roots(){ return [].slice.call(doc.querySelectorAll("["+A_KEY+"]")); }' + '\n'
    + '  function rootOf(el){ return el && el.closest ? el.closest("["+A_KEY+"]") : null; }' + '\n'
    + '  function totalMs(root){ return Number(root.getAttribute(A_TOTAL)||0); }' + '\n'
    + '  function remainMs(root){ var v=root.getAttribute(A_REMAIN); return v===null?totalMs(root):Number(v); }' + '\n'
    + '  function stateOf(root){ return root.getAttribute(A_STATE)||"idle"; }' + '\n'
    + '  function setAttr(root, name, value){ root.setAttribute(name, value); }' + '\n'
    /* 重画：大数字、状态字与形状类、进度条、已过／还剩、主按钮的字与可点性（唯一写入口） */
    + '  function paint(root){' + '\n'
    + '    var total=totalMs(root), remain=Math.max(0,Math.min(total,remainMs(root)));' + '\n'
    + '    var st=stateOf(root), empty=total<=0, off=empty||root.getAttribute(A_DISABLED)==="1";' + '\n'
    + '    var busy=root.getAttribute(A_BUSY)==="1";' + '\n'
    + '    var display=root.querySelector("["+A_DISPLAY+"]");' + '\n'
    + '    if (display) display.textContent = empty ? MISSING : clock(remain/1000);' + '\n'
    + '    var tag=root.querySelector("["+A_TAG+"]");' + '\n'
    + '    if (tag){ tag.textContent = WORDS[st]||WORDS.idle; tag.className = TAG_CLASS+" is-"+st; }' + '\n'
    + '    var bar=root.querySelector("["+A_BAR+"]");' + '\n'
    + '    if (bar) bar.style.transform="scaleX("+(empty?0:((total-remain)/total)).toFixed(4)+")";' + '\n'
    + '    var elapsed=root.querySelector("["+A_ELAPSED+"]");' + '\n'
    + '    if (elapsed) elapsed.textContent=clock((total-remain)/1000);' + '\n'
    + '    var rest=root.querySelector("["+A_REST+"]");' + '\n'
    + '    if (rest) rest.textContent=clock(remain/1000);' + '\n'
    + '    var main=root.querySelector(' + selToggle + ');' + '\n'
    + '    if (main){' + '\n'
    + '      main.textContent = busy ? LOADING_LABEL : (LABELS[st]||LABELS.idle);' + '\n'
    + '      if (busy) main.setAttribute("aria-busy","true"); else main.removeAttribute("aria-busy");' + '\n'
    + '      main.disabled = off || busy; if (main.disabled) main.setAttribute("aria-disabled","true"); else main.removeAttribute("aria-disabled");' + '\n'
    + '    }' + '\n'
    + '    var reset=root.querySelector(' + selReset + ');' + '\n'
    + '    if (reset){ reset.disabled = off; if (off) reset.setAttribute("aria-disabled","true"); else reset.removeAttribute("aria-disabled"); }' + '\n'
    + '  }' + '\n'
    + '  function emit(root, name){' + '\n'
    + '    var detail={key:root.getAttribute(A_KEY), state:stateOf(root),' + '\n'
    + '      remainingMs:Math.max(0,remainMs(root)), totalMs:totalMs(root)};' + '\n'
    + '    root.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail}));' + '\n'
    + '  }' + '\n'
    + '  function setState(root, st, quiet){' + '\n'
    + '    setAttr(root, A_STATE, st); paint(root);' + '\n'
    + '    if (!quiet) emit(root, EV_STATE);' + '\n'
    + '    if (st==="done") emit(root, EV_DONE);' + '\n'
    + '  }' + '\n'
    + '  var heartbeat=null;' + '\n'
    + '  function stop(){ if (heartbeat!==null){ clearInterval(heartbeat); heartbeat=null; } }' + '\n'
    + '  function tick(){' + '\n'
    + '    var all=roots(), alive=false, i;' + '\n'
    + '    for (i=0;i<all.length;i+=1){' + '\n'
    + '      var root=all[i];' + '\n'
    + '      if (stateOf(root)!=="running") continue;' + '\n'
    + '      var until=root.ilifeUntil;' + '\n'
    + '      if (typeof until!=="number"){ until=Date.now()+remainMs(root); root.ilifeUntil=until; }' + '\n'
    + '      var remain=until-Date.now();' + '\n'
    + '      if (remain<=0){ setAttr(root, A_REMAIN, "0"); root.ilifeUntil=null; setState(root,"done"); continue; }' + '\n'
    + '      setAttr(root, A_REMAIN, String(Math.round(remain))); paint(root); alive=true;' + '\n'
    + '    }' + '\n'
    + '    if (!alive) stop();' + '\n'
    + '  }' + '\n'
    + '  function ensureRunning(){ if (heartbeat===null) heartbeat=setInterval(tick, TICK); tick(); }' + '\n'
    + '  function play(root){' + '\n'
    + '    if (remainMs(root)<=0) setAttr(root, A_REMAIN, String(totalMs(root)));' + '\n'
    + '    root.ilifeUntil=Date.now()+Math.max(1,remainMs(root));' + '\n'
    + '    setState(root,"running"); ensureRunning();' + '\n'
    + '  }' + '\n'
    + '  function pause(root){' + '\n'
    + '    var until=root.ilifeUntil;' + '\n'
    + '    var remain=typeof until==="number" ? Math.max(0, until-Date.now()) : remainMs(root);' + '\n'
    + '    root.ilifeUntil=null; setAttr(root, A_REMAIN, String(Math.round(remain))); setState(root,"paused");' + '\n'
    + '  }' + '\n'
    + '  function reset(root){' + '\n'
    + '    root.ilifeUntil=null; setAttr(root, A_REMAIN, String(totalMs(root))); setState(root,"idle"); stop();' + '\n'
    + '  }' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var btn=e.target && e.target.closest ? e.target.closest("["+A_ACT+"]") : null; if (!btn) return;' + '\n'
    + '    var root=rootOf(btn); if (!root) return;' + '\n'
    /* 禁用／空态／忙态：不落账（按钮的 disabled 已经拦了一道，这里再拦一道属性被脚本改过的情况） */
    + '    if (root.getAttribute(A_DISABLED)==="1") return;' + '\n'
    + '    if (totalMs(root)<=0) return;' + '\n'
    + '    if (root.getAttribute(A_BUSY)==="1") return;' + '\n'
    + '    var act=btn.getAttribute(A_ACT);' + '\n'
    + '    if (act==="reset"){ reset(root); return; }' + '\n'
    + '    if (stateOf(root)==="running"){ pause(root); return; }' + '\n'
    + '    if (stateOf(root)==="done") setAttr(root, A_REMAIN, String(totalMs(root)));' + '\n'
    + '    play(root);' + '\n'
    + '  });' + '\n'
    /* 发现锚：打幂等标记；渲染成"运行中"的卡（页面预置的状态）也接着走 */
    + '  var all=roots(), k, anyRunning=false;' + '\n'
    + '  for (k=0;k<all.length;k+=1){' + '\n'
    + '    all[k].setAttribute(A_BOUND,"1"); paint(all[k]);' + '\n'
    + '    if (stateOf(all[k])==="running" && totalMs(all[k])>0){ all[k].ilifeUntil=Date.now()+remainMs(all[k]); anyRunning=true; }' + '\n'
    + '  }' + '\n'
    + '  if (anyRunning) ensureRunning();' + '\n'
    + '}());';
}
