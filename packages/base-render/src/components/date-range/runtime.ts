/** date-range · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  行为契约（逐条对应测试）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click`（快捷档／日格／翻月键）＋ 一枚 `change`（起止两格）
 *     ＋ 一枚 `keydown`（日历块内的方向键）；重复注入只绑定一次（`data-ilife-range-runtime`）。
 *   · **点一档＝把那段填进起止两格**：命中的那一枚 `aria-pressed="true"`（带 ✓ ＋ 实心反白），
 *     状态字换成「当前按 本周」，口径句重写成「本周：09-19 到 09-25，共 7 天（含首尾）」——
 *     **"按的是哪一档"三处同时给（形／字／句），不只靠颜色**。
 *   · **点日历里的一天＝改离它更近的那一端**（都没有则两端一起落到那一天）；两端始终 from ≤ to。
 *   · **翻月只看不动数据**（换的是"看哪个月"，不换窗口，故**不派发**事件）。
 *   · **起止两格**：`change` 时校验（真实日期、起点不晚于终点）；不合法就**留在输入格** ＋ 写在控件旁边的
 *     错误行（控件 `aria-describedby` 指向它），不改数据。
 *   · **键盘**：日历格用 roving tabindex（整块恰有一枚 `tabindex="0"`），方向键在格间移动、
 *     `Home`／`End` 到本行首尾、`PageUp`／`PageDown` 翻月；`Tab` 不被困在 42 个格子里。
 *   · **无脚本降级**：这段不跑时日历、两端实心／中间浅底、口径句都照常可读，只是点不动。
 */
import {
  DATE_RANGE_ACT_ATTR,
  DATE_RANGE_BOUND_ATTR,
  DATE_RANGE_CELLS,
  DATE_RANGE_CLASS,
  DATE_RANGE_COLUMNS,
  DATE_RANGE_CUSTOM,
  DATE_RANGE_DAY_ATTR,
  DATE_RANGE_DAYS_ATTR,
  DATE_RANGE_DAYS_ATTR_ANCHOR,
  DATE_RANGE_DAYS_SUFFIX,
  DATE_RANGE_DISABLED_ATTR,
  DATE_RANGE_END_ATTR,
  DATE_RANGE_EVENT_CHANGE,
  DATE_RANGE_FROM_ATTR,
  DATE_RANGE_HIT_ATTR,
  DATE_RANGE_KEY_ATTR,
  DATE_RANGE_LABEL_ATTR,
  DATE_RANGE_LOADING,
  DATE_RANGE_LOADING_ATTR,
  DATE_RANGE_MONTH_ATTR,
  DATE_RANGE_MONTH_LABEL_ATTR,
  DATE_RANGE_NAME_ATTR,
  DATE_RANGE_PRESET_ATTR,
  DATE_RANGE_PRESET_FROM_ATTR,
  DATE_RANGE_PRESET_PREFIX,
  DATE_RANGE_PRESET_TO_ATTR,
  DATE_RANGE_SENTENCE_ATTR,
  DATE_RANGE_STATE_ATTR,
  DATE_RANGE_TODAY_ATTR,
  DATE_RANGE_TO_ATTR,
  DATE_RANGE_UNSET,
  dateRangeSlot,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildDateRangeJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var ATTR_NAME=' + q(DATE_RANGE_NAME_ATTR) + ', ATTR_FROM=' + q(DATE_RANGE_FROM_ATTR)
    + ', ATTR_TO=' + q(DATE_RANGE_TO_ATTR) + ', ATTR_DAYS=' + q(DATE_RANGE_DAYS_ATTR) + ';' + '\n'
    + '  var ATTR_PRESET=' + q(DATE_RANGE_PRESET_ATTR) + ', ATTR_MONTH=' + q(DATE_RANGE_MONTH_ATTR)
    + ', ATTR_MONTH_LABEL=' + q(DATE_RANGE_MONTH_LABEL_ATTR) + ', ATTR_STATE=' + q(DATE_RANGE_STATE_ATTR) + ';' + '\n'
    + '  var ATTR_TODAY=' + q(DATE_RANGE_TODAY_ATTR) + ', ATTR_LABEL=' + q(DATE_RANGE_LABEL_ATTR)
    + ', ATTR_SENTENCE=' + q(DATE_RANGE_SENTENCE_ATTR) + ';' + '\n'
    + '  var ATTR_ACT=' + q(DATE_RANGE_ACT_ATTR) + ', ATTR_HIT=' + q(DATE_RANGE_HIT_ATTR)
    + ', ATTR_KEY=' + q(DATE_RANGE_KEY_ATTR) + ', ATTR_PFROM=' + q(DATE_RANGE_PRESET_FROM_ATTR)
    + ', ATTR_PTO=' + q(DATE_RANGE_PRESET_TO_ATTR) + ';' + '\n'
    + '  var ATTR_DAY=' + q(DATE_RANGE_DAY_ATTR) + ', ATTR_END=' + q(DATE_RANGE_END_ATTR)
    + ', ATTR_ANCHOR=' + q(DATE_RANGE_DAYS_ATTR_ANCHOR) + ';' + '\n'
    + '  var ATTR_DISABLED=' + q(DATE_RANGE_DISABLED_ATTR) + ', ATTR_LOADING=' + q(DATE_RANGE_LOADING_ATTR)
    + ', ATTR_BOUND=' + q(DATE_RANGE_BOUND_ATTR) + ';' + '\n'
    + '  var EV_CHANGE=' + q(DATE_RANGE_EVENT_CHANGE) + ', WORD_UNSET=' + q(DATE_RANGE_UNSET)
    + ', WORD_CUSTOM=' + q(DATE_RANGE_CUSTOM) + ', WORD_LOADING=' + q(DATE_RANGE_LOADING) + ';' + '\n'
    + '  var PREFIX=' + q(DATE_RANGE_PRESET_PREFIX) + ', SUFFIX=' + q(DATE_RANGE_DAYS_SUFFIX)
    + ', CELLS=' + String(DATE_RANGE_CELLS) + ', COLS=' + String(DATE_RANGE_COLUMNS) + ';' + '\n'
    + '  var CLS=' + q(DATE_RANGE_CLASS) + ', CLS_DAY=' + q(dateRangeSlot('day'))
    + ', CLS_STATE=' + q(dateRangeSlot('state')) + ', CLS_ERROR=' + q(dateRangeSlot('error'))
    + ', CLS_WORD=' + q(dateRangeSlot('word')) + ', CLS_CALIBER=' + q(dateRangeSlot('caliber')) + ';' + '\n'
    + '  var WEEK=["周日","周一","周二","周三","周四","周五","周六"], DAY_MS=86400000;' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-range-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-range-runtime","1");' + '\n'
    /* ── 日期算术（与 model.ts 同一套口径：一律按 UTC 算，不受时区影响） ── */
    + '  function dayNumber(iso){ return Math.round(Date.parse(iso+"T00:00:00Z")/DAY_MS); }' + '\n'
    + '  function isoOfDay(day){ return new Date(day*DAY_MS).toISOString().slice(0,10); }' + '\n'
    + '  function isIso(v){ if (typeof v!=="string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(v)) return false;'
    + ' var t=Date.parse(v+"T00:00:00Z"); if (isNaN(t)) return false;'
    + ' return new Date(t).toISOString().slice(0,10)===v; }' + '\n'
    + '  function rangeDays(from,to){ return dayNumber(to)-dayNumber(from)+1; }' + '\n'
    + '  function monthOf(iso){ return iso.slice(0,7); }' + '\n'
    + '  function monthCells(month){' + '\n'
    + '    var first=month+"-01";' + '\n'
    + '    var off=(new Date(Date.parse(first+"T00:00:00Z")).getUTCDay()+6)%7;' + '\n'
    + '    var start=dayNumber(first)-off, out=[];' + '\n'
    + '    for (var i=0;i<CELLS;i+=1) out.push(isoOfDay(start+i));' + '\n'
    + '    return out;' + '\n'
    + '  }' + '\n'
    + '  function shiftMonth(month, delta){ var y=Number(month.slice(0,4)), m=Number(month.slice(5,7))-1+delta;'
    + ' return new Date(Date.UTC(y,m,1)).toISOString().slice(0,7); }' + '\n'
    + '  function monthLabel(month){ return Number(month.slice(0,4))+" 年 "+Number(month.slice(5,7))+" 月"; }' + '\n'
    + '  function shortDate(iso){ return iso.slice(5); }' + '\n'
    /* 一句口径：与 render.ts 的 `sentenceOf` 同一口径（产出的 JS 没法 import，两边各写一份）。 */
    + '  function sentenceOf(label, from, to, days){' + '\n'
    + '    if (!from || !to) return WORD_UNSET+"：按一档、填起止两格，或在日历里点两天";' + '\n'
    + '    return label+"："+shortDate(from)+" 到 "+shortDate(to)+"，共 "+days+" 天"+SUFFIX;' + '\n'
    + '  }' + '\n'
    + '  function busy(root){ return root.getAttribute(ATTR_DISABLED)==="1" || root.getAttribute(ATTR_LOADING)==="1"; }' + '\n'
    + '  function rootOf(el, sel){ var hit=el&&el.closest?el.closest(sel):null;'
    + ' return hit&&hit.closest?hit.closest("["+ATTR_NAME+"]"):null; }' + '\n'
    + '  function fromOf(root){ return root.getAttribute(ATTR_FROM)||""; }' + '\n'
    + '  function toOf(root){ return root.getAttribute(ATTR_TO)||""; }' + '\n'
    + '  function presetLabelOf(root){' + '\n'
    + '    var all=root.querySelectorAll("["+ATTR_KEY+"]");' + '\n'
    + '    for (var i=0;i<all.length;i+=1){' + '\n'
    + '      if (all[i].getAttribute("aria-pressed")==="true"){' + '\n'
    + '        var w=all[i].querySelector("."+CLS_WORD); return w?w.textContent:all[i].textContent;' + '\n'
    + '      }' + '\n'
    + '    }' + '\n'
    + '    var key=root.getAttribute(ATTR_PRESET);' + '\n'
    + '    return key==="none" ? WORD_UNSET : WORD_CUSTOM;' + '\n'
    + '  }' + '\n'
    /* ── 重铺日历：42 格一次生成（换月／换段都走它；焦点锚 roving tabindex） ── */
    + '  function paintDays(root){' + '\n'
    + '    var anchor=root.querySelector("["+ATTR_ANCHOR+"]"); var month=root.getAttribute(ATTR_MONTH);' + '\n'
    + '    if (!anchor || !month) return;' + '\n'
    + '    var from=fromOf(root), to=toOf(root), today=root.getAttribute(ATTR_TODAY)||"";' + '\n'
    + '    var cells=monthCells(month), html="";' + '\n'
    + '    for (var i=0;i<cells.length;i+=1){' + '\n'
    + '      var iso=cells[i], isEnd=(iso===from||iso===to), cls=CLS_DAY;' + '\n'
    + '      if (isEnd) cls+=" is-end"; else if (from && to && iso>=from && iso<=to) cls+=" is-in";' + '\n'
    + '      if (iso.slice(0,7)!==month) cls+=" is-adj";' + '\n'
    + '      if (today && iso===today) cls+=" is-today";' + '\n'
    + '      var who=iso+" "+WEEK[new Date(Date.parse(iso+"T00:00:00Z")).getUTCDay()]' + '\n'
    + '        +(today&&iso===today?"（今天）":"")' + '\n'
    + '        +(isEnd?"：这一段的一端":((from&&to&&iso>=from&&iso<=to)?"：这一段里的一天":""));' + '\n'
    + '      html+="<button type=\\"button\\" class=\\""+cls+"\\" "+ATTR_HIT+"=\\"day\\" "+ATTR_ACT+"=\\"day\\"'
    + ' "+ATTR_DAY+"=\\""+iso+"\\" aria-pressed=\\""+(isEnd?"true":"false")+"\\"'
    + ' aria-label=\\""+who+"\\" tabindex=\\"-1\\">"+Number(iso.slice(8,10))+"</button>";' + '\n'
    + '    }' + '\n'
    + '    anchor.innerHTML=html;' + '\n'
    + '    var want = from || today || cells[0];' + '\n'
    + '    var cell=anchor.querySelector("["+ATTR_DAY+"=\\""+want+"\\"]")||anchor.querySelector("["+ATTR_DAY+"]");' + '\n'
    + '    if (cell) cell.setAttribute("tabindex","0");' + '\n'
    + '  }' + '\n'
    /* ── 上屏：状态字／口径句／起止两格／快捷档选中态／日格／月份（一次写全） ── */
    + '  function repaint(root){' + '\n'
    + '    var from=fromOf(root), to=toOf(root);' + '\n'
    + '    var days=(from&&to)?rangeDays(from,to):0;' + '\n'
    + '    root.setAttribute(ATTR_DAYS, String(days));' + '\n'
    /* 先翻快捷档的按下态，再读"当前是哪一档"——顺序反了会把上一档的名字写进状态字。 */
    + '    var presets=root.querySelectorAll("["+ATTR_KEY+"]"), key=root.getAttribute(ATTR_PRESET);' + '\n'
    + '    for (var i=0;i<presets.length;i+=1){'
    + ' presets[i].setAttribute("aria-pressed", presets[i].getAttribute(ATTR_KEY)===key?"true":"false"); }' + '\n'
    + '    var label=presetLabelOf(root);' + '\n'
    + '    var chip=root.querySelector("["+ATTR_STATE+"]");' + '\n'
    + '    if (chip) chip.textContent = root.getAttribute(ATTR_LOADING)==="1" ? WORD_LOADING : PREFIX+label;' + '\n'
    + '    var sen=root.querySelector("["+ATTR_SENTENCE+"]"); if (sen) sen.textContent = sentenceOf(label, from, to, days);' + '\n'
    + '    var fi=root.querySelector("["+ATTR_END+"=\\"from\\"]"); if (fi) fi.value=from;' + '\n'
    + '    var ti=root.querySelector("["+ATTR_END+"=\\"to\\"]"); if (ti) ti.value=to;' + '\n'
    + '    var month=root.getAttribute(ATTR_MONTH);' + '\n'
    + '    var ml=root.querySelector("["+ATTR_MONTH_LABEL+"]"); if (ml&&month) ml.textContent=monthLabel(month);' + '\n'
    + '    paintDays(root);' + '\n'
    + '  }' + '\n'
    + '  function fire(root, from, to, prevFrom, prevTo){' + '\n'
    + '    root.dispatchEvent(new CustomEvent(EV_CHANGE,{bubbles:true,detail:{'
    + 'name:root.getAttribute(ATTR_NAME),label:root.getAttribute(ATTR_LABEL),'
    + 'from:from===""?null:from,to:to===""?null:to,'
    + 'days:(from&&to)?rangeDays(from,to):0,preset:root.getAttribute(ATTR_PRESET),'
    + 'prevFrom:prevFrom===""?null:prevFrom,prevTo:prevTo===""?null:prevTo}}));' + '\n'
    + '  }' + '\n'
    + '  function presetKeyOf(root, from, to){' + '\n'
    + '    var presets=root.querySelectorAll("["+ATTR_KEY+"]");' + '\n'
    + '    for (var i=0;i<presets.length;i+=1){' + '\n'
    + '      if (presets[i].getAttribute(ATTR_PFROM)===from && presets[i].getAttribute(ATTR_PTO)===to){'
    + ' return presets[i].getAttribute(ATTR_KEY); }' + '\n'
    + '    }' + '\n'
    + '    return "custom";' + '\n'
    + '  }' + '\n'
    /* 换段：数据（两端）＋ 命中的档 ＋ 锚月一起动，然后上屏并派发。 */
    + '  function setRange(root, from, to){' + '\n'
    + '    var prevFrom=fromOf(root), prevTo=toOf(root);' + '\n'
    + '    if (prevFrom===from && prevTo===to){ repaint(root); return; }' + '\n'
    + '    if (from) root.setAttribute(ATTR_FROM, from); else root.removeAttribute(ATTR_FROM);' + '\n'
    + '    if (to) root.setAttribute(ATTR_TO, to); else root.removeAttribute(ATTR_TO);' + '\n'
    + '    root.setAttribute(ATTR_PRESET, (from&&to)?presetKeyOf(root,from,to):"none");' + '\n'
    + '    if (from) root.setAttribute(ATTR_MONTH, monthOf(from));' + '\n'
    + '    clearError(root); repaint(root); fire(root, from, to, prevFrom, prevTo);' + '\n'
    + '  }' + '\n'
    + '  function errorOf(root){ return root.querySelector("."+CLS_ERROR); }' + '\n'
    + '  function errorIdOf(root){ return CLS+"-"+root.getAttribute(ATTR_NAME)+"-error"; }' + '\n'
    + '  function showError(root, input, text){' + '\n'
    + '    var el=errorOf(root);' + '\n'
    + '    if (!el){ el=doc.createElement("p"); el.className=CLS_ERROR; el.id=errorIdOf(root);'
    + ' var cap=root.querySelector("."+CLS_CALIBER); if (cap) root.insertBefore(el,cap); else root.appendChild(el); }' + '\n'
    + '    el.setAttribute("role","alert"); el.textContent=text;' + '\n'
    + '    if (input){ input.setAttribute("aria-invalid","true"); input.setAttribute("aria-describedby",errorIdOf(root)); }' + '\n'
    + '  }' + '\n'
    + '  function clearError(root){' + '\n'
    + '    var el=errorOf(root); if (el) el.remove();' + '\n'
    + '    var inputs=root.querySelectorAll("["+ATTR_END+"]");' + '\n'
    + '    for (var i=0;i<inputs.length;i+=1){ inputs[i].removeAttribute("aria-invalid"); inputs[i].removeAttribute("aria-describedby"); }' + '\n'
    + '  }' + '\n'
    + '  function moveFocus(anchor, from, step){' + '\n'
    + '    var cell=from, at=-1;' + '\n'
    + '    var all=anchor.querySelectorAll("["+ATTR_DAY+"]");' + '\n'
    + '    for (var i=0;i<all.length;i+=1) if (all[i]===from) at=i;' + '\n'
    + '    if (at<0) return;' + '\n'
    + '    var next=Math.min(all.length-1, Math.max(0, at+step));' + '\n'
    + '    for (var j=0;j<all.length;j+=1) all[j].setAttribute("tabindex", j===next?"0":"-1");' + '\n'
    + '    all[next].focus();' + '\n'
    + '  }' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var hit=e.target&&e.target.closest?e.target.closest("["+ATTR_HIT+"]"):null; if (!hit) return;' + '\n'
    + '    var root=rootOf(hit,"["+ATTR_HIT+"]"); if (!root) return;' + '\n'
    + '    if (busy(root)){ e.preventDefault(); return; }' + '\n'
    + '    var act=hit.getAttribute(ATTR_ACT);' + '\n'
    + '    e.preventDefault();' + '\n'
    + '    if (act==="preset"){ setRange(root, hit.getAttribute(ATTR_PFROM)||"", hit.getAttribute(ATTR_PTO)||""); return; }' + '\n'
    + '    if (act==="prev" || act==="next"){' + '\n'
    + '      var month=root.getAttribute(ATTR_MONTH); if (!month) return;' + '\n'
    + '      root.setAttribute(ATTR_MONTH, shiftMonth(month, act==="prev"?-1:1)); repaint(root); return;' + '\n'
    + '    }' + '\n'
    + '    if (act!=="day") return;' + '\n'
    + '    var iso=hit.getAttribute(ATTR_DAY); if (!iso) return;' + '\n'
    + '    var from=fromOf(root), to=toOf(root);' + '\n'
    + '    if (!from || !to){ setRange(root, iso, iso); return; }' + '\n'
    + '    if (dayNumber(iso) < dayNumber(from)){ setRange(root, iso, to); return; }' + '\n'
    + '    if (dayNumber(iso) > dayNumber(to)){ setRange(root, from, iso); return; }' + '\n'
    + '    var dFrom=Math.abs(dayNumber(iso)-dayNumber(from)), dTo=Math.abs(dayNumber(iso)-dayNumber(to));' + '\n'
    + '    if (dFrom<=dTo) setRange(root, iso, to); else setRange(root, from, iso);' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("change", function(e){' + '\n'
    + '    var input=e.target; if (!input||!input.getAttribute) return;' + '\n'
    + '    if (!input.getAttribute(ATTR_END)) return;' + '\n'
    + '    var root=rootOf(input,"["+ATTR_NAME+"]"); if (!root || busy(root)) return;' + '\n'
    + '    var end=input.getAttribute(ATTR_END), value=String(input.value||"");' + '\n'
    + '    var from=fromOf(root), to=toOf(root);' + '\n'
    + '    if (value!=="" && !isIso(value)){ input.value = end==="from"?from:to;'
    + ' showError(root,input,"请填一个真实存在的日期（YYYY-MM-DD）"); return; }' + '\n'
    + '    var nextFrom = end==="from" ? value : from;' + '\n'
    + '    var nextTo = end==="to" ? value : to;' + '\n'
    + '    if (nextFrom!=="" && nextTo!=="" && dayNumber(nextFrom)>dayNumber(nextTo)){' + '\n'
    + '      input.value = end==="from"?from:to;' + '\n'
    + '      showError(root,input,"起点不能晚于终点（"+nextFrom+" > "+nextTo+"）"); return;' + '\n'
    + '    }' + '\n'
    + '    setRange(root, nextFrom, nextTo);' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("keydown", function(e){' + '\n'
    + '    var cell=e.target;' + '\n'
    + '    if (!cell||!cell.classList||!cell.classList.contains(CLS_DAY)) return;' + '\n'
    + '    var root=rootOf(cell,"["+ATTR_NAME+"]"); if (!root || busy(root)) return;' + '\n'
    + '    var anchor=root.querySelector("["+ATTR_ANCHOR+"]"); if (!anchor) return;' + '\n'
    + '    var step=0;' + '\n'
    + '    if (e.key==="ArrowLeft") step=-1; else if (e.key==="ArrowRight") step=1;' + '\n'
    + '    else if (e.key==="ArrowUp") step=-COLS; else if (e.key==="ArrowDown") step=COLS;' + '\n'
    + '    else if (e.key==="Home" || e.key==="End"){' + '\n'
    + '      var all=anchor.querySelectorAll("["+ATTR_DAY+"]"), at=-1;' + '\n'
    + '      for (var i=0;i<all.length;i+=1) if (all[i]===cell) at=i;' + '\n'
    + '      if (at<0) return;' + '\n'
    + '      e.preventDefault();' + '\n'
    /* 本行首／本行尾（列数就是 `COLS`）。 */
    + '      moveFocus(anchor, cell, e.key==="Home" ? -(at%COLS) : (COLS-1-(at%COLS)));' + '\n'
    + '      return;' + '\n'
    + '    }' + '\n'
    + '    else if (e.key==="PageUp" || e.key==="PageDown"){' + '\n'
    + '      var month=root.getAttribute(ATTR_MONTH); if (!month) return;' + '\n'
    + '      e.preventDefault();' + '\n'
    + '      root.setAttribute(ATTR_MONTH, shiftMonth(month, e.key==="PageUp"?-1:1)); repaint(root);' + '\n'
    + '      var again=root.querySelector("["+ATTR_DAY+"]"); if (again){ again.setAttribute("tabindex","0"); again.focus(); }' + '\n'
    + '      return;' + '\n'
    + '    }' + '\n'
    + '    if (step!==0){ e.preventDefault(); moveFocus(anchor, cell, step); }' + '\n'
    + '  });' + '\n'
    + '  var all=doc.querySelectorAll("["+ATTR_NAME+"]");' + '\n'
    + '  for (var j=0;j<all.length;j+=1) all[j].setAttribute(ATTR_BOUND,"1");' + '\n'
    + '}());';
}
