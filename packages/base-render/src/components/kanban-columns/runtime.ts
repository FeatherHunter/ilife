/** kanban-columns · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `drag-sort/runtime.ts` 同一处分工：模块代码零 DOM，DOM 只在产出的字符串里。
 *
 *  行为契约（逐条对应判据）：
 *   · **点选是主通路**（触屏上走得通）：点一张卡拿起 → 点目标列那枚看得见的收纳键 → 卡落进那一列；
 *     再点同一张卡＝取消；点另一张卡＝改选。**全程零拖拽手势、零键盘依赖**。
 *   · **同一次只拿起一张卡**：拿起态挂在根的 `data-ilife-kanban-pick` 上（值＝那一张卡的机器键）。
 *   · **收纳键只在拿起态可点**：拿起卡所在列的那一枚按不动（卡本来就在这一列），其余各列可点。
 *   · **挪动落地后四处读数一起重写**：卡上 `data-ilife-kanban-state`／卡上那枚状态（形 ＋ 字）／
 *     两端列的计数／状态句——由 `paint()` 整块重画（幂等：同一份状态画几次都一样）。
 *   · **空列不消失**：列里最后一张被收走时，运行时段补出那一块空槽；卡收进来时撤掉。
 *   · **只动三样节点**：落点线（每列一条）、空槽、取消键——都由本段建出与撤掉，别处不碰。
 *   · **幂等**：`<html>` 上一枚 `data-ilife-kanban-runtime` 拦住重复注入；根上记一枚 bound 读数。
 */
import {
  KANBAN_COLUMNS_ADD_ATTR,
  KANBAN_COLUMNS_ATTR,
  KANBAN_COLUMNS_BOUND_ATTR,
  KANBAN_COLUMNS_CANCEL_ATTR,
  KANBAN_COLUMNS_CARD_ATTR,
  KANBAN_COLUMNS_COL_ATTR,
  KANBAN_COLUMNS_EVENT_ADD,
  KANBAN_COLUMNS_EVENT_CANCEL,
  KANBAN_COLUMNS_EVENT_MOVE,
  KANBAN_COLUMNS_EVENT_PICK,
  KANBAN_COLUMNS_MARKS,
  KANBAN_COLUMNS_PICK_ATTR,
  KANBAN_COLUMNS_RECEIVE_ATTR,
  KANBAN_COLUMNS_RUNTIME_ATTR,
  KANBAN_COLUMNS_SEG_ATTR,
  KANBAN_COLUMNS_SHOW_ATTR,
  KANBAN_COLUMNS_STATE_ATTR,
  KANBAN_COLUMNS_STATUS_ATTR,
  KANBAN_COLUMNS_TEXT,
  kanbanColumnsSlot,
  kanbanCountText,
  kanbanDropText,
  kanbanStatusText,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 计数那句里「数 与 单位」之间那一道缝：**从渲染期同一个函数上取回来**
 *  （`kanbanCountText(0, 'U')` 产 `'0 U'`），免得运行时段另写一个空格、与渲染期走散。 */
const COUNT_GAP = kanbanCountText(0, 'U').replace('0', '').replace('U', '');

/** 状态句两半：没选中那一句（渲染期给的就是它），与选中那一句的「前引 ＋ 后语」
 *  （拿一枚小标记切开，两半都取自 `kanbanStatusText()` 自己产的那一句）。 */
const STATUS_IDLE = kanbanStatusText(null);
const STATUS_PICKED = kanbanStatusText('\u0001').split('\u0001');

/** 落点线那句的前后半（`放这里＝标记为「` ＋ 列名 ＋ `」`）：同样从渲染期的那个函数上切出来。 */
const DROP_TEXT = kanbanDropText('\u0001').split('\u0001');

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进自己的脚本槽）。 */
export function buildKanbanColumnsJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const T = KANBAN_COLUMNS_TEXT;
  const slot = kanbanColumnsSlot;
  return ['(function(){',
    /* ── 常量（全部来自 `attrs.ts`：渲染与运行时读的是同一份事实） ─────────────── */
    '  var A_ROOT=' + q(KANBAN_COLUMNS_ATTR) + ', A_COL=' + q(KANBAN_COLUMNS_COL_ATTR)
      + ', A_CARD=' + q(KANBAN_COLUMNS_CARD_ATTR) + ';',
    '  var A_STATE=' + q(KANBAN_COLUMNS_STATE_ATTR) + ', A_PICK=' + q(KANBAN_COLUMNS_PICK_ATTR)
      + ', A_SHOW=' + q(KANBAN_COLUMNS_SHOW_ATTR) + ', A_SEG=' + q(KANBAN_COLUMNS_SEG_ATTR) + ';',
    '  var A_RECEIVE=' + q(KANBAN_COLUMNS_RECEIVE_ATTR) + ', A_ADD=' + q(KANBAN_COLUMNS_ADD_ATTR)
      + ', A_STATUS=' + q(KANBAN_COLUMNS_STATUS_ATTR) + ', A_CANCEL=' + q(KANBAN_COLUMNS_CANCEL_ATTR) + ';',
    '  var A_BOUND=' + q(KANBAN_COLUMNS_BOUND_ATTR) + ', A_RT=' + q(KANBAN_COLUMNS_RUNTIME_ATTR) + ';',
    '  var EV_PICK=' + q(KANBAN_COLUMNS_EVENT_PICK) + ', EV_MOVE=' + q(KANBAN_COLUMNS_EVENT_MOVE)
      + ', EV_CANCEL=' + q(KANBAN_COLUMNS_EVENT_CANCEL) + ', EV_ADD=' + q(KANBAN_COLUMNS_EVENT_ADD) + ';',
    '  var C_BODY=' + q(slot('body')) + ', C_NAME=' + q(slot('name')) + ', C_COUNT=' + q(slot('count'))
      + ', C_TITLE=' + q(slot('title')) + ';',
    '  var C_BADGE=' + q(slot('badge')) + ', C_MARK=' + q(slot('mark')) + ', C_DROP=' + q(slot('drop'))
      + ', C_SLOT=' + q(slot('slot')) + ', C_CANCEL=' + q(slot('cancel')) + ', C_HINT=' + q(slot('hint')) + ';',
    '  var T_CANCEL=' + q(T.cancel) + ', T_EMPTY_TITLE=' + q(T.emptyTitle) + ', T_EMPTY_NOTE=' + q(T.emptyNote) + ';',
    '  var T_DROP_PRE=' + q(DROP_TEXT[0]) + ', T_DROP_POST=' + q(DROP_TEXT[1]) + ';',
    '  var GAP=' + q(COUNT_GAP) + ', ST_IDLE=' + q(STATUS_IDLE) + ';',
    '  var ST_PICK_PRE=' + q(STATUS_PICKED[0]) + ', ST_PICK_POST=' + q(STATUS_PICKED[1]) + ';',
    '  var MARKS=' + JSON.stringify([...KANBAN_COLUMNS_MARKS]) + ';',
    '  var doc=document;',
    '  if (doc.documentElement.getAttribute(A_RT)==="1") return;',
    '  doc.documentElement.setAttribute(A_RT,"1");',
    /* ── 定位小件 ─────────────────────────────────────────────────────────── */
    '  function fire(el,name,detail){ el.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail})); }',
    '  function rootOf(el){ return (el&&el.closest)?el.closest("["+A_ROOT+"]"):null; }',
    '  function colsOf(root){ return [].slice.call(root.querySelectorAll("["+A_COL+"]")); }',
    '  function colOf(root,key){ var list=colsOf(root);',
    '    for (var i=0;i<list.length;i+=1){ if (list[i].getAttribute(A_COL)===key) return list[i]; } return null; }',
    '  function bodyOf(col){ return col.querySelector("."+C_BODY); }',
    '  function cardsOf(col){ var body=bodyOf(col);',
    '    return body?[].slice.call(body.querySelectorAll("["+A_CARD+"]")):[]; }',
    '  function cardOf(root,key){ var list=root.querySelectorAll("["+A_CARD+"]");',
    '    for (var i=0;i<list.length;i+=1){ if (list[i].getAttribute(A_CARD)===key) return list[i]; } return null; }',
    '  function textIn(el,cls){ var node=el?el.querySelector("."+cls):null; return node?(node.textContent||""):""; }',
    '  function unitOf(col){ var node=col.querySelector("."+C_COUNT), text=node?(node.textContent||""):"";',
    '    var at=text.indexOf(GAP); return at<0?"":text.slice(at+GAP.length); }',
    '  function countText(n,u){ return String(n)+GAP+u; }',
    '  function setOn(el,on){ if (!el.classList) return;',
    '    if (on) el.classList.add("is-on"); else el.classList.remove("is-on"); }',
    /* ── 建节点（与 `render.ts` 的标记一一对应：类名与属性都取自 `attrs.ts`） ───── */
    '  function buildBadge(doc,markCol,name){',
    '    var el=doc.createElement("span"); el.setAttribute("class",C_BADGE);',
    '    var mark=doc.createElement("i"); mark.setAttribute("class",C_MARK);',
    '    mark.setAttribute("aria-hidden","true"); mark.textContent=markCol;',
    '    el.appendChild(mark); el.appendChild(doc.createTextNode(name)); return el; }',
    '  function buildDrop(doc,name){',
    '    var el=doc.createElement("p"); el.setAttribute("class",C_DROP);',
    '    el.textContent=T_DROP_PRE+name+T_DROP_POST; return el; }',
    '  function buildSlot(doc){',
    '    var el=doc.createElement("p"); el.setAttribute("class",C_SLOT); el.textContent=T_EMPTY_TITLE;',
    '    el.appendChild(doc.createElement("br")); el.appendChild(doc.createTextNode(T_EMPTY_NOTE)); return el; }',
    '  function buildCancel(doc,id){',
    '    var el=doc.createElement("button"); el.setAttribute("type","button");',
    '    el.setAttribute("class",C_CANCEL); el.setAttribute(A_CANCEL,id);',
    '    el.textContent=T_CANCEL; return el; }',
    /* ── 整块重画（幂等：拿起／挪动／取消三处动作之后都只调它一次） ────────────── */
    '  function paint(root){',
    '    var raw=root.getAttribute(A_PICK), picked=raw?cardOf(root,raw):null;',
    '    if (picked===null&&raw!==null) root.removeAttribute(A_PICK);',
    '    var pickedCol=picked?picked.closest("["+A_COL+"]"):null;',
    '    var cols=colsOf(root);',
    '    for (var i=0;i<cols.length;i+=1){',
    '      var col=cols[i], key=col.getAttribute(A_COL)||"", name=textIn(col,C_NAME);',
    '      var mark=MARKS[i%MARKS.length], body=bodyOf(col);',
    '      var recv=col.querySelector("["+A_RECEIVE+"]"), cards=cardsOf(col);',
    '      var count=col.querySelector("."+C_COUNT);',
    '      if (count) count.textContent=countText(cards.length,unitOf(col));',
    '      var empty=body?body.querySelector("."+C_SLOT):null;',
    '      if (cards.length===0){ if (body&&!empty) body.insertBefore(buildSlot(doc),recv); }',
    '      else if (empty&&empty.parentNode) empty.parentNode.removeChild(empty);',
    '      var want=(picked!==null&&col!==pickedCol), drop=body?body.querySelector("."+C_DROP):null;',
    '      if (want){ if (body&&!drop) body.insertBefore(buildDrop(doc,name),body.firstChild); }',
    '      else if (drop&&drop.parentNode) drop.parentNode.removeChild(drop);',
    '      if (recv) recv.disabled=!want;',
    '      for (var j=0;j<cards.length;j+=1){',
    '        var card=cards[j], on=(card===picked);',
    '        card.setAttribute(A_STATE,key);',
    '        card.setAttribute("aria-pressed",on?"true":"false");',
    '        if (on) card.setAttribute("aria-current","true"); else card.removeAttribute("aria-current");',
    '        var badge=card.querySelector("."+C_BADGE);',
    '        if (badge&&(badge.textContent||"")!==mark+name) badge.parentNode.replaceChild(buildBadge(doc,mark,name),badge);',
    '      }',
    '    }',
    '    var cancelBtn=cancelOf(root);',
    '    if (picked!==null&&!cancelBtn){',
    '      var made=buildCancel(doc,root.getAttribute(A_ROOT)||""), hint=root.querySelector("."+C_HINT);',
    '      if (hint&&hint.parentNode===root) root.insertBefore(made,hint); else root.appendChild(made);',
    '    } else if (picked===null&&cancelBtn&&cancelBtn.parentNode) cancelBtn.parentNode.removeChild(cancelBtn);',
    '    var status=root.querySelector("["+A_STATUS+"]");',
    '    if (status) status.textContent=(picked===null)?ST_IDLE:(ST_PICK_PRE+textIn(picked,C_TITLE)+ST_PICK_POST);',
    '    return picked!==null;',
    '  }',
    '  function cancelOf(root){ return root.querySelector("["+A_CANCEL+"]"); }',
    /* ── 拿起一张卡（点它；已经拿起时点它就是取消，见 `toggle()`） ─────────────── */
    '  function pick(root,key){',
    '    var card=cardOf(root,key);',
    '    if (!card) return false;',
    '    var from=card.getAttribute(A_STATE);',
    '    root.setAttribute(A_PICK,key);',
    '    paint(root);',
    '    fire(root,EV_PICK,{id:root.getAttribute(A_ROOT),key:key,from:from});',
    '    return true; }',
    /* ── 收到另一列（点那一列的收纳键；卡排在那一列最后，两端计数一起重写） ───── */
    '  function receive(root,to){',
    '    var key=root.getAttribute(A_PICK);',
    '    if (!key) return false;',
    '    var card=cardOf(root,key), col=colOf(root,to), body=col?bodyOf(col):null;',
    '    if (!card||!body) return false;',
    '    var from=card.getAttribute(A_STATE);',
    '    if (from===to) return false;',
    '    body.insertBefore(card,col.querySelector("["+A_RECEIVE+"]"));',
    '    card.setAttribute(A_STATE,to);',
    '    root.removeAttribute(A_PICK);',
    '    paint(root);',
    '    fire(root,EV_MOVE,{id:root.getAttribute(A_ROOT),key:key,from:from,to:to});',
    '    return true; }',
    /* ── 取消选中（卡原样不动；点取消键或再点同一张卡都是这一支） ───────────── */
    '  function cancel(root){',
    '    var key=root.getAttribute(A_PICK);',
    '    if (!key) return false;',
    '    root.removeAttribute(A_PICK);',
    '    paint(root);',
    '    fire(root,EV_CANCEL,{id:root.getAttribute(A_ROOT),key:key});',
    '    return true; }',
    '  function toggle(root,key){',
    '    if (root.getAttribute(A_PICK)===key) return cancel(root);',
    '    return pick(root,key); }',
    /* ── 窄档的分段切换（只决定屏上看哪一列，不改数据、不派发事件） ───────────── */
    '  function show(root,at){',
    '    var want=String(at), segs=[].slice.call(root.querySelectorAll("["+A_SEG+"]")), hit=false;',
    '    for (var i=0;i<segs.length;i+=1){ if (segs[i].getAttribute(A_SEG)===want) hit=true; }',
    '    if (!hit) return false;',
    '    root.setAttribute(A_SHOW,want);',
    '    for (var j=0;j<segs.length;j+=1){',
    '      var on=(segs[j].getAttribute(A_SEG)===want);',
    '      segs[j].setAttribute("aria-pressed",on?"true":"false"); setOn(segs[j],on);',
    '    }',
    '    return true; }',
    /* ── 委派：点选主通路（点卡拿起／改选、点收纳键挪过去、点取消键取消、点加键报数） ── */
    '  doc.addEventListener("click",function(e){',
    '    var t=e.target;',
    '    if (!t||!t.closest) return;',
    '    var cancelBtn=t.closest("["+A_CANCEL+"]");',
    '    if (cancelBtn){ var rc=rootOf(cancelBtn); if (rc) cancel(rc); return; }',
    '    var seg=t.closest("["+A_SEG+"]");',
    '    if (seg){ var rs=rootOf(seg); if (rs) show(rs,seg.getAttribute(A_SEG)); return; }',
    '    var addBtn=t.closest("["+A_ADD+"]");',
    '    if (addBtn){',
    '      var ra=rootOf(addBtn);',
    '      if (ra) fire(ra,EV_ADD,{id:ra.getAttribute(A_ROOT),column:addBtn.getAttribute(A_ADD)});',
    '      return; }',
    '    var recv=t.closest("["+A_RECEIVE+"]");',
    '    if (recv&&!recv.disabled){ var rr=rootOf(recv); if (rr) receive(rr,recv.getAttribute(A_RECEIVE)); return; }',
    '    var card=t.closest("["+A_CARD+"]");',
    '    if (card){ var rk=rootOf(card); if (rk) toggle(rk,card.getAttribute(A_CARD)); return; }',
    '  });',
    /* ── 首次挂载：逐块重画一遍（渲染期已是拿起态的也归位），并记一枚 bound 读数 ── */
    '  var roots=doc.querySelectorAll("["+A_ROOT+"]");',
    '  for (var r=0;r<roots.length;r+=1){ roots[r].setAttribute(A_BOUND,"1"); paint(roots[r]); }',
    '}());'].join(LF);
}
