import {
  MULTI_CHECKS_ACTION_ATTR,
  MULTI_CHECKS_ALL_ATTR,
  MULTI_CHECKS_AMOUNT_ATTR,
  MULTI_CHECKS_BOUND_ATTR,
  MULTI_CHECKS_EVENT_ACTION,
  MULTI_CHECKS_EVENT_CHANGE,
  MULTI_CHECKS_GROUP_ATTR,
  MULTI_CHECKS_ITEM_ATTR,
  MULTI_CHECKS_LOADING_ATTR,
  MULTI_CHECKS_MONEY_ATTR,
  MULTI_CHECKS_NAME_ATTR,
  MULTI_CHECKS_NONE_TEXT,
  MULTI_CHECKS_RUNTIME_ATTR,
  MULTI_CHECKS_UNIT_ATTR,
  multiChecksSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** multi-checks · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editable-value/runtime.ts` 同一处分工：模块代码零 DOM；DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `change` 与一枚 `click` 委派；重复注入只绑定一次。
 *   · **三态一处算**（`refresh`）：全选框与组头框的「勾／半勾／没勾」、顶上「已选 N / M 条」、
 *     底下「合计 ¥…」，全部由**同一趟**刷新算出来——三处各算各的必然走散。
 *   · **总开关往下走**：「全选」把每一行设成自己；组头把**本组**每一行设成自己（禁用的行不动）。
 *   · **半勾落成 `indeterminate`**：标记里只能给 `aria-checked="mixed"`（`indeterminate` 是 IDL 属性），
 *     init 那一趟按下它落成真状态；状态一变，`aria-checked` 跟着改回来。
 *   · **金额按整数分相加**：浮点相加会把 `0.1 ＋ 0.2` 变成 `0.30000000000000004`，读数就假了。
 *   · **加载态不改读数**：`data-ilife-checks-loading="1"` 时刷新直接退出（那句字是页面给的，不许被覆盖）。
 *   · **联动走事件**：`ilife:checks-change`（勾选面）与 `ilife:checks-action`（动作面）都冒泡到文档，
 *     页面用 `document.addEventListener(…)` 接自己的处理——**不引入任何全局**。
 *   · **无脚本降级**：这段不跑时，勾选照常（原生复选）、报数那句停在标记里算好的那一份快照。
 */
export function buildMultiChecksJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  /* **带点的类选择器**：下面按类找元素（`root.querySelector(SEL_COUNT)`）——漏了这个点，
     `querySelector("ilife-block-…-count")` 找的是**标签名**，永远查不到（2026-09 实拍：
     全选之后勾选框都变了、已选数那句却纹丝不动）。 */
  const CLS_COUNT = q('.' + multiChecksSlot('count'));
  const CLS_SUM = q('.' + multiChecksSlot('sum'));
  return '(function(){' + LF
    + '  var ATTR_NAME=' + q(MULTI_CHECKS_NAME_ATTR) + ', ATTR_ITEM=' + q(MULTI_CHECKS_ITEM_ATTR) + ';' + LF
    + '  var ATTR_GROUP=' + q(MULTI_CHECKS_GROUP_ATTR) + ', ATTR_ALL=' + q(MULTI_CHECKS_ALL_ATTR) + ';' + LF
    + '  var ATTR_ACTION=' + q(MULTI_CHECKS_ACTION_ATTR) + ', ATTR_AMOUNT=' + q(MULTI_CHECKS_AMOUNT_ATTR) + ';' + LF
    + '  var ATTR_MONEY=' + q(MULTI_CHECKS_MONEY_ATTR) + ', ATTR_UNIT=' + q(MULTI_CHECKS_UNIT_ATTR) + ';' + LF
    + '  var ATTR_LOADING=' + q(MULTI_CHECKS_LOADING_ATTR) + ', ATTR_BOUND=' + q(MULTI_CHECKS_BOUND_ATTR) + ';' + LF
    + '  var ATTR_RUNTIME=' + q(MULTI_CHECKS_RUNTIME_ATTR) + ';' + LF
    + '  var EV_CHANGE=' + q(MULTI_CHECKS_EVENT_CHANGE) + ', EV_ACTION=' + q(MULTI_CHECKS_EVENT_ACTION) + ';' + LF
    + '  var SEL_COUNT=' + CLS_COUNT + ', SEL_SUM=' + CLS_SUM + ', NONE_TEXT=' + q(MULTI_CHECKS_NONE_TEXT) + ';' + LF
    + '  var doc=document;' + LF
    + '  if (doc.documentElement.getAttribute(ATTR_RUNTIME)==="1") return;' + LF
    + '  doc.documentElement.setAttribute(ATTR_RUNTIME,"1");' + LF
    + '  function rootOf(el){ return el && el.closest ? el.closest("["+ATTR_NAME+"]") : null; }' + LF
    + '  function rowsOf(root){ return root.querySelectorAll("input[type=checkbox]["+ATTR_ITEM+"]"); }' + LF
    + '  function groupsOf(root){ return root.querySelectorAll("input[type=checkbox]["+ATTR_GROUP+"]"); }' + LF
    + '  function centsOf(input){' + LF
    + '    var v=input.getAttribute(ATTR_AMOUNT); if (v===null) return null;' + LF
    + '    var n=Number(v); return isFinite(n) ? Math.round(n) : null;' + LF
    + '  }' + LF
    /* 整数分 → `1,286.40`（与 render 期那份 formatCents 同一套算法；千分位用循环拼，不用正则）。 */
    + '  function fmt(cents){' + LF
    + '    var neg=cents<0, abs=Math.abs(cents), int=String(Math.floor(abs/100)), out="", n=0, i;' + LF
    + '    for (i=int.length-1;i>=0;i-=1){ out=int.charAt(i)+out; n+=1; if (n%3===0 && i>0) out=","+out; }' + LF
    + '    var frac=String(abs%100); if (frac.length<2) frac="0"+frac;' + LF
    + '    return (neg?"-":"")+out+"."+frac;' + LF
    + '  }' + LF
    /* 三态：`checked` ＋ `indeterminate` 一处写；`aria-checked` 跟着同一趟走（标记面与机器面不许打架）。 */
    + '  function paintBox(box, count, total){' + LF
    + '    box.checked = total>0 && count===total;' + LF
    + '    box.indeterminate = count>0 && count<total;' + LF
    + '    if (box.indeterminate) box.setAttribute("aria-checked","mixed"); else box.removeAttribute("aria-checked");' + LF
    + '  }' + LF
    + '  function refresh(root){' + LF
    + '    if (root.getAttribute(ATTR_LOADING)==="1") return;' + LF
    + '    var rows=rowsOf(root), total=rows.length, count=0, cents=0, i, j;' + LF
    + '    for (i=0;i<total;i+=1){ if (rows[i].checked){ count+=1; var c=centsOf(rows[i]); if (c!==null) cents+=c; } }' + LF
    + '    var all=root.querySelector("input[type=checkbox]["+ATTR_ALL+"]");' + LF
    + '    if (all) paintBox(all, count, total);' + LF
    + '    var heads=groupsOf(root), head=null;' + LF
    + '    for (i=0;i<heads.length;i+=1){' + LF
    + '      head=heads[i];' + LF
    + '      var gid=head.getAttribute(ATTR_GROUP), gn=0, gt=0;' + LF
    + '      for (j=0;j<total;j+=1){' + LF
    + '        if (rows[j].getAttribute(ATTR_GROUP)!==gid) continue;' + LF
    + '        gt+=1; if (rows[j].checked) gn+=1;' + LF
    + '      }' + LF
    + '      paintBox(head, gn, gt);' + LF
    + '    }' + LF
    + '    var unit=root.getAttribute(ATTR_UNIT)||"条", moneyUnit=root.getAttribute(ATTR_MONEY);' + LF
    + '    var countEl=root.querySelector(SEL_COUNT);' + LF
    + '    if (countEl) countEl.textContent="已选 "+count+" / "+total+" "+unit;' + LF
    + '    var sumEl=root.querySelector(SEL_SUM);' + LF
    /* 金额的符号写在**货币号前**（`-¥56.00`）：`¥-56.00` 读起来像"负的日元"，也不合账目习惯。 */
    + '    var sumText = count===0 ? NONE_TEXT' + LF
    + '      : (moneyUnit!==null ? "合计 "+(cents<0 ? "-" : "")+moneyUnit+fmt(Math.abs(cents)) : "已勾 "+count+" "+unit);' + LF
    + '    if (sumEl) sumEl.textContent=sumText;' + LF
    + '    var acts=root.querySelectorAll("["+ATTR_ACTION+"]");' + LF
    + '    for (i=0;i<acts.length;i+=1){ if (count===0) acts[i].setAttribute("disabled",""); else acts[i].removeAttribute("disabled"); }' + LF
    + '    var ids=[];' + LF
    + '    for (i=0;i<total;i+=1) if (rows[i].checked) ids.push(rows[i].getAttribute(ATTR_ITEM));' + LF
    + '    return {count:count, ids:ids, total:moneyUnit!==null ? cents : null};' + LF
    + '  }' + LF
    + '  function fire(root, name, payload){' + LF
    + '    payload.name=root.getAttribute(ATTR_NAME);' + LF
    + '    root.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:payload}));' + LF
    + '  }' + LF
    + '  doc.addEventListener("change", function(e){' + LF
    + '    var t=e.target;' + LF
    + '    if (!t || t.type!=="checkbox") return;' + LF
    + '    var root=rootOf(t); if (!root) return;' + LF
    + '    var i, rows=rowsOf(root), grp=null;' + LF
    + '    if (t.hasAttribute(ATTR_ITEM)) {' + LF
    + '      /* 单行勾选：什么也不用往下推，交给下面的统一刷新。 */' + LF
    + '    } else if (t.hasAttribute(ATTR_ALL)) {' + LF
    + '      for (i=0;i<rows.length;i+=1) if (!rows[i].disabled) rows[i].checked=t.checked;' + LF
    + '    } else if (t.hasAttribute(ATTR_GROUP)) {' + LF
    + '      grp=t.getAttribute(ATTR_GROUP);' + LF
    + '      for (i=0;i<rows.length;i+=1){' + LF
    + '        if (rows[i].getAttribute(ATTR_GROUP)!==grp) continue;' + LF
    + '        if (!rows[i].disabled) rows[i].checked=t.checked;' + LF
    + '      }' + LF
    + '    } else { return; }' + LF
    + '    var info=refresh(root); if (!info) return;' + LF
    + '    fire(root, EV_CHANGE, {ids:info.ids, count:info.count, total:info.total});' + LF
    + '  });' + LF
    + '  doc.addEventListener("click", function(e){' + LF
    + '    var t=e.target; if (!t || !t.closest) return;' + LF
    + '    var btn=t.closest("["+ATTR_ACTION+"]"); if (!btn || btn.disabled) return;' + LF
    + '    var root=rootOf(btn); if (!root) return;' + LF
    + '    var info=refresh(root); if (!info) return;' + LF
    + '    fire(root, EV_ACTION, {action:btn.getAttribute(ATTR_ACTION), ids:info.ids});' + LF
    + '  });' + LF
    /* init 那一趟：打绑定标记 ＋ 把三态与两句读数按真实勾选对齐（SSR 面与机器面收敛到一处）。 */
    + '  var all=doc.querySelectorAll("["+ATTR_NAME+"]");' + LF
    + '  for (var k=0;k<all.length;k+=1){ all[k].setAttribute(ATTR_BOUND,"1"); refresh(all[k]); }' + LF
    + '}());';
}
