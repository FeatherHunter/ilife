import {
  RATING_ROW_BOUND_ATTR,
  RATING_ROW_EVENT_CHANGE,
  RATING_ROW_HALF_ATTR,
  RATING_ROW_LOADING_ATTR,
  RATING_ROW_MAX_ATTR,
  RATING_ROW_NAME_ATTR,
  RATING_ROW_MISSING,
  RATING_ROW_RUNTIME_ATTR,
  RATING_ROW_STAR_ATTR,
  RATING_ROW_VALUE_ATTR,
  ratingRowSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** rating-row · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  与 `editable-value/runtime.ts` 同一处分工：模块代码零 DOM；DOM 只出现在本文件产出的**字符串**里。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click` 与一枚 `keydown` 委派；重复注入只绑定一次。
 *   · **一处写（`paint`）**：`aria-checked`／半颗标记／漫游 `tabindex`／那枚大数字，
 *     全部由同一趟算出来——四处各写各的必然走散。
 *   · **点星**：分数＝那一颗的号（整星）；机器值落 `data-ilife-rating-value`；派发 `ilife:rating-change`。
 *   · **键盘**（`role="radio"` 该有的那一套）：左右／上下移动并**随即选中**、`Home` 到第一颗、`End` 到最后一颗；
 *     方向键 `preventDefault`（否则页面会跟着滚）。
 *   · **不评就是没评**：清空要由页面重渲染（本件不给"点已选中的星取消"这种隐藏手势——
 *     隐藏手势没人发现得了，值为 `null` 的入口在入参面）。
 *   · **禁用／加载不响应**：根上有标记时点了不派发（按钮自己也落 `disabled`）。
 *   · **无脚本降级**：这段不跑时，星与读数按标记里画好的那一份显示（可读），只是不能改。
 */
export function buildRatingRowJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + LF
    + '  var ATTR_NAME=' + q(RATING_ROW_NAME_ATTR) + ', ATTR_VALUE=' + q(RATING_ROW_VALUE_ATTR) + ';' + LF
    + '  var ATTR_MAX=' + q(RATING_ROW_MAX_ATTR) + ', ATTR_STAR=' + q(RATING_ROW_STAR_ATTR) + ';' + LF
    + '  var ATTR_LOADING=' + q(RATING_ROW_LOADING_ATTR) + ', ATTR_BOUND=' + q(RATING_ROW_BOUND_ATTR) + ';' + LF
    + '  var ATTR_HALF=' + q(RATING_ROW_HALF_ATTR) + ', ATTR_RUNTIME=' + q(RATING_ROW_RUNTIME_ATTR) + ';' + LF
    + '  var EV=' + q(RATING_ROW_EVENT_CHANGE) + ';' + LF
    + '  var SEL_NUM=' + q(ratingRowSlot('num')) + ', MISSING=' + q(RATING_ROW_MISSING) + ';' + LF
    + '  var doc=document;' + LF
    + '  if (doc.documentElement.getAttribute(ATTR_RUNTIME)==="1") return;' + LF
    + '  doc.documentElement.setAttribute(ATTR_RUNTIME,"1");' + LF
    + '  function rootOf(el){ return el && el.closest ? el.closest("["+ATTR_NAME+"]") : null; }' + LF
    + '  function starsOf(root){ return root.querySelectorAll("button["+ATTR_STAR+"]"); }' + LF
    + '  function valueOf(root){' + LF
    + '    var raw=root.getAttribute(ATTR_VALUE);' + LF
    + '    if (raw===null || raw==="") return null;' + LF
    + '    var n=Number(raw); return isFinite(n) ? n : null;' + LF
    + '  }' + LF
    /* 一处写：分数 → 星的三态（`aria-checked` ＋ 半颗标记）＋ 漫游焦点 ＋ 那枚大数字。
       状态只写这两处，不挂 `is-on`／`is-half` 这类修饰类：短类名会与别件撞名。 */
    + '  function paint(root, value){' + LF
    + '    var stars=starsOf(root), i, n=null;' + LF
    + '    var focusAt = value===null ? 1 : Math.max(1, Math.ceil(value));' + LF
    + '    for (i=0;i<stars.length;i+=1){' + LF
    + '      n=Number(stars[i].getAttribute(ATTR_STAR));' + LF
    + '      var on = value!==null && n<=value;' + LF
    + '      var half = !on && value!==null && (n-0.5)<=value;' + LF
    + '      stars[i].setAttribute("aria-checked", on ? "true" : "false");' + LF
    + '      if (half) stars[i].setAttribute(ATTR_HALF,"1"); else stars[i].removeAttribute(ATTR_HALF);' + LF
    + '      stars[i].setAttribute("tabindex", n===focusAt ? "0" : "-1");' + LF
    + '    }' + LF
    + '    if (value===null) root.removeAttribute(ATTR_VALUE); else root.setAttribute(ATTR_VALUE, String(value));' + LF
    + '    var num=root.querySelector("."+SEL_NUM);' + LF
    + '    if (num) num.textContent = value===null ? MISSING : String(value);' + LF
    + '  }' + LF
    + '  function pick(root, star, why){' + LF
    + '    if (root.getAttribute(ATTR_LOADING)==="1") return;' + LF
    + '    var prev=valueOf(root);' + LF
    + '    if (prev===star) return;' + LF
    + '    paint(root, star);' + LF
    + '    var focus=root.querySelector("button["+ATTR_STAR+"=\\""+star+"\\"]"); if (focus && why==="key") focus.focus();' + LF
    + '    root.dispatchEvent(new CustomEvent(EV,{bubbles:true,detail:{' + LF
    + '      name:root.getAttribute(ATTR_NAME), value:star, prev:prev}}));' + LF
    + '  }' + LF
    + '  function starOf(el){' + LF
    + '    if (!el || !el.closest) return null;' + LF
    + '    var b=el.closest("button["+ATTR_STAR+"]"); return b && !b.disabled ? b : null;' + LF
    + '  }' + LF
    + '  doc.addEventListener("click", function(e){' + LF
    + '    var btn=starOf(e.target); if (!btn) return;' + LF
    + '    var root=rootOf(btn); if (!root) return;' + LF
    + '    e.preventDefault();' + LF
    + '    pick(root, Number(btn.getAttribute(ATTR_STAR)), "click");' + LF
    + '  });' + LF
    + '  doc.addEventListener("keydown", function(e){' + LF
    + '    var btn=starOf(e.target); if (!btn) return;' + LF
    + '    var root=rootOf(btn); if (!root) return;' + LF
    + '    var max=Number(root.getAttribute(ATTR_MAX)||starsOf(root).length);' + LF
    + '    var at=Number(btn.getAttribute(ATTR_STAR)), next=null;' + LF
    + '    if (e.key==="ArrowRight" || e.key==="ArrowDown") next=Math.min(max, at+1);' + LF
    + '    else if (e.key==="ArrowLeft" || e.key==="ArrowUp") next=Math.max(1, at-1);' + LF
    + '    else if (e.key==="Home") next=1;' + LF
    + '    else if (e.key==="End") next=max;' + LF
    + '    else return;' + LF
    + '    e.preventDefault();' + LF
    + '    pick(root, next, "key");' + LF
    + '  });' + LF
    /* init 那一趟：打绑定标记 ＋ 按标记里那一份机器值把三态与读数收敛到一处。 */
    + '  var all=doc.querySelectorAll("["+ATTR_NAME+"]");' + LF
    + '  for (var i=0;i<all.length;i+=1){ all[i].setAttribute(ATTR_BOUND,"1"); paint(all[i], valueOf(all[i])); }' + LF
    + '}());';
}
