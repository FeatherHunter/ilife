/** undo-timeline · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `bulk-bar/runtime.ts`／`command-palette/runtime.ts` 同一处分工：模块代码零 DOM，
 *  DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上两枚委派（`click`／`change`）；重复注入只绑定一次
 *     （文档根上的 `data-ilife-undo-runtime`），每根另外记一枚 bound 读数。
 *   · **撤销能用手点做完**：开合、勾选、撤销、恢复、取消、整段回滚**各有看得见的那一枚**；
 *     这一段一行都没跑到时，清单与按钮照旧在屏上（原生复选照常勾）。
 *   · **一次只开一块／再点收起／点外面关**：`track` 的行里最多摊开一块回滚单；
 *     点同一枚＝收起（焦点还给那一枚）；点那块之外的任何地方＝全部收起
 *     （含点别的按钮、含跨实例：五个分支先关后办，`togglePick` 关的是全场）。
 *   · **勾选一变，两处读数一起重算**：页脚那句结论与主按钮那枚字都按"勾了几项"现算
 *     （**一处刷新**：两处各算各的必然走散），并派发 `ilife:undo-timeline-pick` 报一次真读数。
 *   · **一项都没勾 ⇒ 主按钮按不动**（`disabled`）＋ 结论句换成"得先勾一项"。
 *   · **不写库**：撤销／恢复／整段回滚都只派发事件（真正落库归页面／技能命令）；
 *     主按钮**不自动收起**（页面按事件重渲染，或给那一行标 `busy`）。
 *   · **不依赖 `transitionend`**：所有状态切换都是属性与文本的同步改写。
 */
import {
  UNDO_TIMELINE_ATTR,
  UNDO_TIMELINE_BOUND_ATTR,
  UNDO_TIMELINE_CANCEL_ATTR,
  UNDO_TIMELINE_CLOSE_ATTR,
  UNDO_TIMELINE_EVENT_CANCEL,
  UNDO_TIMELINE_EVENT_PICK,
  UNDO_TIMELINE_EVENT_RESTORE,
  UNDO_TIMELINE_EVENT_ROLLBACK,
  UNDO_TIMELINE_EVENT_UNDO,
  UNDO_TIMELINE_GO_ATTR,
  UNDO_TIMELINE_ITEM_ATTR,
  UNDO_TIMELINE_NOTE_ATTR,
  UNDO_TIMELINE_PICK_ATTR,
  UNDO_TIMELINE_RESTORE_ATTR,
  UNDO_TIMELINE_ROLL_ATTR,
  UNDO_TIMELINE_RUNTIME_ATTR,
  UNDO_TIMELINE_SUBMIT_ATTR,
  UNDO_TIMELINE_SUM_ATTR,
  UNDO_TIMELINE_SUM_MID,
  UNDO_TIMELINE_SUM_PRE,
  UNDO_TIMELINE_SUM_ZERO,
  UNDO_TIMELINE_SUBMIT_POST,
  UNDO_TIMELINE_SUBMIT_PRE,
  UNDO_TIMELINE_SUBMIT_ZERO,
  undoTimelineSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进自己的脚本槽）。 */
export function buildUndoTimelineJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  /* **带点的类选择器**：漏了那个点，`querySelector("ilife-block-…")` 找的是**标签名**，永远查不到。 */
  const CLS_LABEL = q('.' + undoTimelineSlot('label'));
  return '(function(){' + LF
    /* ── 常量（全部来自 `attrs.ts`：渲染与运行时读的是同一份事实） ────────────── */
    + '  var A_ROOT=' + q(UNDO_TIMELINE_ATTR) + ', A_GO=' + q(UNDO_TIMELINE_GO_ATTR)
    + ', A_PICK=' + q(UNDO_TIMELINE_PICK_ATTR) + ';' + LF
    + '  var A_ITEM=' + q(UNDO_TIMELINE_ITEM_ATTR) + ', A_SUM=' + q(UNDO_TIMELINE_SUM_ATTR)
    + ', A_NOTE=' + q(UNDO_TIMELINE_NOTE_ATTR) + ';' + LF
    + '  var A_SUBMIT=' + q(UNDO_TIMELINE_SUBMIT_ATTR) + ', A_CLOSE=' + q(UNDO_TIMELINE_CLOSE_ATTR)
    + ', A_CANCEL=' + q(UNDO_TIMELINE_CANCEL_ATTR) + ';' + LF
    + '  var A_RESTORE=' + q(UNDO_TIMELINE_RESTORE_ATTR) + ', A_ROLL=' + q(UNDO_TIMELINE_ROLL_ATTR)
    + ', A_BOUND=' + q(UNDO_TIMELINE_BOUND_ATTR) + ', A_RT=' + q(UNDO_TIMELINE_RUNTIME_ATTR) + ';' + LF
    + '  var EV_UNDO=' + q(UNDO_TIMELINE_EVENT_UNDO) + ', EV_RESTORE=' + q(UNDO_TIMELINE_EVENT_RESTORE)
    + ', EV_ROLL=' + q(UNDO_TIMELINE_EVENT_ROLLBACK) + ';' + LF
    + '  var EV_PICK=' + q(UNDO_TIMELINE_EVENT_PICK) + ', EV_CANCEL=' + q(UNDO_TIMELINE_EVENT_CANCEL)
    + ', CLS_LABEL=' + CLS_LABEL + ';' + LF
    + '  var SUM_PRE=' + q(UNDO_TIMELINE_SUM_PRE) + ', SUM_MID=' + q(UNDO_TIMELINE_SUM_MID)
    + ', SUM_ZERO=' + q(UNDO_TIMELINE_SUM_ZERO) + ';' + LF
    + '  var SUB_PRE=' + q(UNDO_TIMELINE_SUBMIT_PRE) + ', SUB_POST=' + q(UNDO_TIMELINE_SUBMIT_POST)
    + ', SUB_ZERO=' + q(UNDO_TIMELINE_SUBMIT_ZERO) + ';' + LF
    + '  var doc=document;' + LF
    + '  if (doc.documentElement.getAttribute(A_RT)==="1") return;' + LF
    + '  doc.documentElement.setAttribute(A_RT,"1");' + LF
    /* ── 定位小件 ─────────────────────────────────────────────────────────── */
    + '  function fire(el,name,detail){ el.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail})); }\n'
    + '  function rootOf(el){ return (el && el.closest) ? el.closest("["+A_ROOT+"]") : null; }\n'
    + '  function nameOf(root){ return root===null ? "" : String(root.getAttribute(A_ROOT)); }\n'
    /* 这一块回滚单：形态 `track` 里是 `[data-ilife-undo-pick]` 那块，形态 `impact` 里就是根自己。 */
    + '  function cardOf(el){' + LF
    + '    if (!el || !el.closest) return null;' + LF
    + '    var pick=el.closest("["+A_PICK+"]");' + LF
    + '    return pick===null ? el.closest("["+A_ROOT+"]") : pick;' + LF
    + '  }' + LF
    + '  function keyOf(card){' + LF
    + '    if (card===null) return "";' + LF
    + '    var k=card.getAttribute(A_PICK);' + LF
    + '    if (k!==null) return k;' + LF
    + '    var sub=card.querySelector("["+A_SUBMIT+"]");' + LF
    + '    return sub===null ? "" : String(sub.getAttribute(A_SUBMIT));' + LF
    + '  }' + LF
    + '  function picksOf(scope){ return scope.querySelectorAll("["+A_PICK+"]"); }\n'
    /* 按 `aria-controls` 找回那一枚开合按钮（收起来时焦点要还给它）。 */
    + '  function goOf(root,key){' + LF
    + '    if (root===null) return null;' + LF
    + '    var all=root.querySelectorAll("["+A_GO+"]");' + LF
    + '    for (var i=0;i<all.length;i+=1) if (all[i].getAttribute(A_GO)===key) return all[i];' + LF
    + '    return null;' + LF
    + '  }' + LF
    + '  function panelOf(btn){' + LF
    + '    var id=btn.getAttribute("aria-controls"); if (!id) return null;' + LF
    + '    return doc.getElementById(id);' + LF
    + '  }' + LF
    + '  function syncArrow(panel){' + LF
    + '    var btn=doc.querySelector("["+A_GO+"][aria-controls=\\""+panel.id+"\\"]");' + LF
    + '    if (btn) btn.setAttribute("aria-expanded", panel.hasAttribute("hidden") ? "false" : "true");' + LF
    + '  }' + LF
    /* 一处刷新：勾了几项 → 页脚那句结论 ＋ 主按钮那枚字 ＋ 主按钮按不按得动（三处同源）。
       勾不动的不算：`disabled` 的框即使被运行期标上 `checked` 也不进计数与事件（它撤不了）。 */
    + '  function refresh(card){' + LF
    + '    var boxes=card.querySelectorAll("input["+A_ITEM+"]"), items=[], count=0, i;' + LF
    + '    for (i=0;i<boxes.length;i+=1){' + LF
    + '      if (boxes[i].checked && !boxes[i].disabled){ count+=1; items.push(boxes[i].getAttribute(A_ITEM)); }' + LF
    + '    }' + LF
    + '    var sum=card.querySelector("["+A_SUM+"]");' + LF
    + '    if (sum){' + LF
    + '      var note=sum.getAttribute(A_NOTE);' + LF
    + '      sum.textContent = count===0 ? SUM_ZERO : (SUM_PRE+count+SUM_MID+(note===null?"":note));' + LF
    + '    }' + LF
    + '    var sub=card.querySelector("["+A_SUBMIT+"]");' + LF
    + '    if (sub){' + LF
    + '      var lb=sub.querySelector(CLS_LABEL);' + LF
    + '      if (lb) lb.textContent = count===0 ? SUB_ZERO : (SUB_PRE+count+SUB_POST);' + LF
    + '      if (count===0) sub.setAttribute("disabled",""); else sub.removeAttribute("disabled");' + LF
    + '    }' + LF
    + '    return {count:count, items:items};' + LF
    + '  }' + LF
    + '  function hide(panel){ panel.setAttribute("hidden",""); syncArrow(panel); }\n'
    /* 点外面关：全场每一块摊开着的回滚单，只要点的那一下不在它里面，就收起来
       （`target` 传 `null`＝全关：就地那枚「取消」自己就在块里，不传 `null` 关不掉自己）。 */
    + '  function closeOutside(target){' + LF
    + '    var ps=doc.querySelectorAll("["+A_PICK+"]"), i;' + LF
    + '    for (i=0;i<ps.length;i+=1){' + LF
    + '      if (target!==null && ps[i].contains(target)) continue;' + LF
    + '      if (!ps[i].hasAttribute("hidden")) hide(ps[i]);' + LF
    + '    }' + LF
    + '  }' + LF
    /* 开合：先记住自己开没开，再把**全场**（含别的实例）不含这一下的块全收，
       开着＝保持收起（`closeOutside` 已经收了，`hide` 再压一次是幂等），关着＝摊开。 */
    + '  function togglePick(btn){' + LF
    + '    var panel=panelOf(btn); if (!panel) return;' + LF
    + '    var wasOpen = !panel.hasAttribute("hidden");' + LF
    + '    closeOutside(btn);' + LF
    + '    if (wasOpen){ hide(panel); return; }' + LF
    + '    panel.removeAttribute("hidden");' + LF
    + '    syncArrow(panel);' + LF
    + '  }' + LF
    /* ── 两枚委派：点（开合／撤销／恢复／整段回滚／取消）与勾选 ───────────────
       点五个分支一律**先关后办**：先把点的这一下之外的块全收，再办自己的事
       （自己那块含这一下 ⇒ 原地保留：主按钮不自动收起；`close` 那枚自己就在块里 ⇒ 传 `null` 全关）。 */
    + '  doc.addEventListener("click", function(e){' + LF
    + '    var t=e.target; if (!t || !t.closest) return;' + LF
    + '    var close=t.closest("["+A_CLOSE+"]");' + LF
    + '    if (close){' + LF
    + '      var panel=close.closest("["+A_PICK+"]"); var root=rootOf(close);' + LF
    + '      closeOutside(null);' + LF
    + '      if (panel){ var back=goOf(root, panel.getAttribute(A_PICK)); if (back) back.focus(); }' + LF
    + '      return;' + LF
    + '    }' + LF
    + '    var cancel=t.closest("["+A_CANCEL+"]");' + LF
    + '    if (cancel){ var r1=rootOf(cancel); closeOutside(t); if (r1) fire(r1, EV_CANCEL, {name:nameOf(r1)}); return; }' + LF
    + '    var sub=t.closest("["+A_SUBMIT+"]");' + LF
    + '    if (sub){' + LF
    + '      if (sub.disabled) return;' + LF
    + '      closeOutside(sub);' + LF
    + '      var card=cardOf(sub), r2=rootOf(sub); if (!r2) return;' + LF
    + '      var info=card===null ? {items:[]} : refresh(card);' + LF
    + '      fire(r2, EV_UNDO, {name:nameOf(r2), key:String(sub.getAttribute(A_SUBMIT)), items:info.items});' + LF
    + '      return;' + LF
    + '    }' + LF
    + '    var res=t.closest("["+A_RESTORE+"]");' + LF
    + '    if (res){' + LF
    + '      if (res.disabled) return;' + LF
    + '      closeOutside(res);' + LF
    + '      var r3=rootOf(res); if (!r3) return;' + LF
    + '      fire(r3, EV_RESTORE, {name:nameOf(r3), key:String(res.getAttribute(A_RESTORE))});' + LF
    + '      return;' + LF
    + '    }' + LF
    + '    var roll=t.closest("["+A_ROLL+"]");' + LF
    + '    if (roll){' + LF
    + '      closeOutside(roll);' + LF
    + '      var r4=rootOf(roll); if (!r4) return;' + LF
    + '      fire(r4, EV_ROLL, {name:nameOf(r4), label:String(roll.getAttribute(A_ROLL))});' + LF
    + '      return;' + LF
    + '    }' + LF
    + '    var go=t.closest("["+A_GO+"]");' + LF
    + '    if (go){' + LF
    + '      if (go.disabled) return;' + LF
    + '      var p=panelOf(go), root5=rootOf(go); if (!root5) return;' + LF
    + '      if (p){ togglePick(go); return; }' + LF
    + '      closeOutside(go);' + LF
    + '      fire(root5, EV_UNDO, {name:nameOf(root5), key:String(go.getAttribute(A_GO)), items:[]});' + LF
    + '      return;' + LF
    + '    }' + LF
    + '    if (!t.closest("["+A_PICK+"]")) closeOutside(t);' + LF
    + '  });' + LF
    + '  doc.addEventListener("change", function(e){' + LF
    + '    var t=e.target;' + LF
    + '    if (!t || !t.hasAttribute || !t.hasAttribute(A_ITEM)) return;' + LF
    + '    var card=cardOf(t), root=rootOf(t);' + LF
    + '    if (card===null || root===null) return;' + LF
    + '    var info=refresh(card);' + LF
    + '    fire(root, EV_PICK, {name:nameOf(root), key:keyOf(card), items:info.items, count:info.count});' + LF
    + '  });' + LF
    /* ── 首次挂载：打绑定标记 ＋ 按真实勾选把两处读数再算一遍（幂等） ─────────── */
    + '  var all=doc.querySelectorAll("["+A_ROOT+"]");' + LF
    + '  for (var k=0;k<all.length;k+=1){' + LF
    + '    all[k].setAttribute(A_BOUND,"1");' + LF
    /* 形态 `track` 的回滚单在 pick 里、形态 `impact` 的整张卡就是那一块（没有 pick）。 */
    + '    var ps=picksOf(all[k]);' + LF
    + '    if (ps.length===0){ refresh(all[k]); }' + LF
    + '    else { for (var j=0;j<ps.length;j+=1) refresh(ps[j]); }' + LF
    + '  }' + LF
    + '}());';
}
