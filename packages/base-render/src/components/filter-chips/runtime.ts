/** filterChips · **运行时**（产出 JS 文本；DOM 只允许出现在这段文字里）。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上 `click` ＋ `ilife:chips-loading` 两枚委派；`<html>` 挂载标记防重复绑定。
 *   · **计数是数出来的**：每档的计数＝页面上带该档标签的记录数；已选数＝被按下（`aria-pressed="true"`）
 *     的 chip 数；记录数与合计＝选中各档的**并集**（不是相加：一条记录落在两档里只算一次）。
 *   · **合计只算读得出来的**：记录的 `data-ilife-chip-value` 不是数就跳过，并在控件旁边**点名**
 *     有几条读不出来（错态 ＋ `aria-describedby`），**不**把读不出来的当 0 静默吞掉。
 *   · **没选中＝不筛**：状态行写「已选 全部」，记录数与合计覆盖全部记录。
 *   · **空态**：选中若干档而一条都没命中时，写「这组筛选没有命中记录」（设计过的空态）。
 *   · **载入态**：`ilife:chips-loading`（`detail={name,on}`）→ 状态行原地换字 ＋ 收起清除键；
 *     `on:false` 重算真读数（载入期间不写假的数）。
 *   · **无脚本降级**：这段不跑时，chip 仍是真 `<button>`、`aria-pressed` 仍在（读屏器照样读得出选中态），
 *     只是计数与合计停留在渲染期初值。
 */
import {
  CHIPS_BOUND_ATTR, CHIPS_CLEAR_ATTR, CHIPS_DEFAULTS, CHIPS_DISABLED_ATTR, CHIPS_EMPTY_ATTR,
  CHIPS_ERROR_ATTR, CHIPS_EVENT_CHANGE, CHIPS_EVENT_LOADING, CHIPS_INVALID_ATTR, CHIPS_LOADING_ATTR,
  CHIPS_NAME_ATTR, CHIPS_PICKED_ATTR, CHIPS_REGION_ATTR, CHIPS_ROOT_CLASS, CHIPS_ROWS_ATTR,
  CHIPS_RUNTIME_ATTR, CHIPS_STATUS_ATTR, CHIPS_TARGET_ATTR, CHIPS_TOTAL_ATTR, CHIP_ATTR, CHIP_ITEM_ATTR,
  CHIP_ITEM_TAGS_ATTR, CHIP_ITEM_VALUE_ATTR, CHIP_N_ATTR,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE）。 */
export function buildFilterChipsJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var A_ROOT=' + q(CHIPS_NAME_ATTR) + ', A_TARGET=' + q(CHIPS_TARGET_ATTR) + ', A_REGION=' + q(CHIPS_REGION_ATTR) + ';' + '\n'
    + '  var A_CHIP=' + q(CHIP_ATTR) + ', A_N=' + q(CHIP_N_ATTR) + ', A_CLEAR=' + q(CHIPS_CLEAR_ATTR) + ';' + '\n'
    + '  var A_STATUS=' + q(CHIPS_STATUS_ATTR) + ', A_PICKED=' + q(CHIPS_PICKED_ATTR) + ', A_ROWS=' + q(CHIPS_ROWS_ATTR) + ';' + '\n'
    + '  var A_TOTAL=' + q(CHIPS_TOTAL_ATTR) + ', A_EMPTY=' + q(CHIPS_EMPTY_ATTR) + ', A_ERR=' + q(CHIPS_ERROR_ATTR) + ';' + '\n'
    + '  var A_INVALID=' + q(CHIPS_INVALID_ATTR) + ', A_LOADING=' + q(CHIPS_LOADING_ATTR) + ', A_DISABLED=' + q(CHIPS_DISABLED_ATTR) + ';' + '\n'
    + '  var A_BOUND=' + q(CHIPS_BOUND_ATTR) + ', A_RUNTIME=' + q(CHIPS_RUNTIME_ATTR) + ';' + '\n'
    + '  var A_ITEM=' + q(CHIP_ITEM_ATTR) + ', A_TAGS=' + q(CHIP_ITEM_TAGS_ATTR) + ', A_VALUE=' + q(CHIP_ITEM_VALUE_ATTR) + ';' + '\n'
    + '  var EV_CHANGE=' + q(CHIPS_EVENT_CHANGE) + ', EV_LOADING=' + q(CHIPS_EVENT_LOADING) + ';' + '\n'
    + '  var D={unset:' + q(CHIPS_DEFAULTS.unset) + ', allText:' + q(CHIPS_DEFAULTS.allText)
    + ', noRowsText:' + q(CHIPS_DEFAULTS.noRowsText) + ', badValueText:' + q(CHIPS_DEFAULTS.badValueText)
    + ', unwiredText:' + q(CHIPS_DEFAULTS.unwiredText) + '};' + '\n'
    + '  var SEL_ROOT="["+A_ROOT+"]", doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute(A_RUNTIME)==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute(A_RUNTIME,"1");' + '\n'
    + '  function quoted(v){ return String(v).replace(/["\\\\]/g, "\\\\$&"); }' + '\n'
    + '  function pick(attr,value){ return "["+attr+"=\\""+quoted(value)+"\\"]"; }' + '\n'
    + '  function one(root,attr){ return root.querySelector("["+attr+"]"); }' + '\n'
    + '  function rootOf(el){ return el && el.closest ? el.closest(SEL_ROOT) : null; }' + '\n'
    /* 记录区：`target` 指向的记录区；不给就是整页 */
    + '  function rowsOf(root){' + '\n'
    + '    var key=root.getAttribute(A_TARGET);' + '\n'
    + '    var box=null;' + '\n'
    + '    if (key){ box=doc.querySelector(pick(A_REGION,key)); if (!box) return null; }' + '\n'
    + '    return (box||doc).querySelectorAll("["+A_ITEM+"]");' + '\n'
    + '  }' + '\n'
    + '  function hasTag(row,tag){' + '\n'
    + '    var raw=String(row.getAttribute(A_TAGS)||"").split(/\\s+/);' + '\n'
    + '    for (var i=0;i<raw.length;i+=1) if (raw[i]===tag) return true;' + '\n'
    + '    return false;' + '\n'
    + '  }' + '\n'
    + '  function chipsOf(root){ return root.querySelectorAll("["+A_CHIP+"]"); }' + '\n'
    + '  function pressed(chip){ return chip.getAttribute("aria-pressed")==="true"; }' + '\n'
    + '  function selectedOf(root){' + '\n'
    + '    var all=chipsOf(root), out=[];' + '\n'
    + '    for (var i=0;i<all.length;i+=1) if (pressed(all[i])) out.push(all[i].getAttribute(A_CHIP)||"");' + '\n'
    + '    return out;' + '\n'
    + '  }' + '\n'
    + '  function write(root,attr,text){ var el=one(root,attr); if (el) el.textContent=text; }' + '\n'
    + '  function setError(root,msg){' + '\n'
    + '    var el=one(root,A_ERR);' + '\n'
    + '    if (msg){ if (el){ el.textContent=msg; el.removeAttribute("hidden"); } root.setAttribute(A_INVALID,"1"); }' + '\n'
    + '    else { if (el){ el.textContent=""; el.setAttribute("hidden",""); } root.removeAttribute(A_INVALID); }' + '\n'
    + '  }' + '\n'
    + '  function money(n){' + '\n'
    + '    var s=n.toFixed(2), neg=s.charAt(0)==="-"; if (neg) s=s.slice(1);' + '\n'
    + '    var parts=s.split("."); var head=parts[0], out="", c=0;' + '\n'
    + '    for (var i=head.length-1;i>=0;i-=1){ out=head.charAt(i)+out; c+=1; if (c%3===0 && i>0) out=","+out; }' + '\n'
    + '    return (neg?"-":"")+out+"."+parts[1];' + '\n'
    + '  }' + '\n'
    /* 重算（唯一入口） */
    + '  function run(root){' + '\n'
    + '    var rows=rowsOf(root);' + '\n'
    + '    if (!rows || rows.length===0){ setError(root, D.unwiredText); return; }' + '\n'
    + '    var chips=chipsOf(root), i, j;' + '\n'
    + '    var sel=selectedOf(root);' + '\n'
    + '    for (i=0;i<chips.length;i+=1){' + '\n'
    + '      var v=chips[i].getAttribute(A_CHIP)||"", n=0;' + '\n'
    + '      for (j=0;j<rows.length;j+=1) if (hasTag(rows[j],v)) n+=1;' + '\n'
    + '      var slot=chips[i].querySelector("["+A_N+"]");' + '\n'
    + '      if (slot) slot.textContent=String(n);' + '\n'
    + '    }' + '\n'
    + '    var hit=0, total=0, bad=0;' + '\n'
    + '    for (j=0;j<rows.length;j+=1){' + '\n'
    + '      var inSet=sel.length===0;' + '\n'
    + '      for (i=0;i<sel.length && !inSet;i+=1) if (hasTag(rows[j],sel[i])) inSet=true;' + '\n'
    + '      if (!inSet) continue;' + '\n'
    + '      hit+=1;' + '\n'
    + '      var raw=rows[j].getAttribute(A_VALUE);' + '\n'
    + '      if (raw===null || raw==="") continue;' + '\n'
    + '      var num=Number(raw);' + '\n'
    + '      if (isFinite(num)) total+=num; else bad+=1;' + '\n'
    + '    }' + '\n'
    + '    var loading=root.getAttribute(A_LOADING)==="1";' + '\n'
    + '    if (loading){' + '\n'
    + '      var clear0=one(root,A_CLEAR); if (clear0) clear0.disabled=true;' + '\n'
    + '      fire(root,EV_CHANGE,{name:root.getAttribute(A_ROOT),selected:sel,rows:hit,total:money(total),loading:true});' + '\n'
    + '      return;' + '\n'
    + '    }' + '\n'
    + '    write(root,A_PICKED, sel.length===0 ? D.allText : String(sel.length));' + '\n'
    + '    write(root,A_ROWS, String(hit));' + '\n'
    + '    write(root,A_TOTAL, money(total));' + '\n'
    + '    var clear=one(root,A_CLEAR);' + '\n'
    + '    if (clear) clear.disabled = root.hasAttribute(A_DISABLED);' + '\n'
    + '    var emptyEl=one(root,A_EMPTY);' + '\n'
    + '    if (emptyEl){ if (sel.length>0 && hit===0) emptyEl.removeAttribute("hidden"); else emptyEl.setAttribute("hidden",""); }' + '\n'
    + '    if (bad>0) setError(root, D.badValueText.replace("{n}", String(bad))); else setError(root,"");' + '\n'
    + '    fire(root,EV_CHANGE,{name:root.getAttribute(A_ROOT),selected:sel,rows:hit,total:money(total),bad:bad});' + '\n'
    + '  }' + '\n'
    + '  function fire(root,name,detail){ root.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:detail})); }' + '\n'
    + '  function setBusy(root,on){' + '\n'
    + '    var clear=one(root,A_CLEAR);' + '\n'
    + '    if (on){ root.setAttribute(A_LOADING,"1"); if (clear) clear.disabled=true; }' + '\n'
    + '    else { root.removeAttribute(A_LOADING); run(root); }' + '\n'
    + '  }' + '\n'
    /* 委派 */
    + '  doc.addEventListener("click",function(e){' + '\n'
    + '    var t=e.target; if (!t || !t.closest) return;' + '\n'
    + '    var root=rootOf(t); if (!root) return;' + '\n'
    + '    var chip=t.closest("["+A_CHIP+"]");' + '\n'
    + '    if (chip){ if (chip.disabled) return;' + '\n'
    + '      chip.setAttribute("aria-pressed", pressed(chip) ? "false" : "true"); run(root); return; }' + '\n'
    + '    var clear=t.closest("["+A_CLEAR+"]");' + '\n'
    + '    if (clear){ if (clear.disabled) return;' + '\n'
    + '      var all=chipsOf(root);' + '\n'
    + '      for (var i=0;i<all.length;i+=1) all[i].setAttribute("aria-pressed","false");' + '\n'
    + '      run(root); }' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener(EV_LOADING,function(e){' + '\n'
    + '    var d=e.detail||{};' + '\n'
    + '    var root=(e.target && e.target.closest) ? e.target.closest(SEL_ROOT) : null;' + '\n'
    + '    if (!root && d.name) root=doc.querySelector(pick(A_ROOT,d.name));' + '\n'
    + '    if (!root) return;' + '\n'
    + '    setBusy(root, d.on!==false);' + '\n'
    + '  });' + '\n'
    + '  var roots=doc.querySelectorAll(SEL_ROOT);' + '\n'
    + '  for (var k=0;k<roots.length;k+=1){ roots[k].setAttribute(A_BOUND,"1"); run(roots[k]); }' + '\n'
    + '}());';
}
