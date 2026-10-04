/** popover · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 * 与 `controls.buildSharedHelpersJs()`／`editable-value` 同一处分工：模块代码零 DOM。
 *
 * 它干的活只有一件：**把「眼下真被裁到」的长文本就地升级成气泡触发处**。
 *   · 扫描候选选择器（缺省三条**结构性**的落点，见 attrs.ts 的 POPOVER_DEFAULT_SELECTORS）；
 *   · 只有 computed 样式**真裁到了内容**（省略号类比 scrollWidth，多行 clamp 比 scrollHeight）才升级；
 *     文字短的零命中 ⇒ 页面不凭空多出一堆点得动的东西；
 *   · 升级＝**包一层 display:contents 的挂载点 ＋ 挂一张装全文的原生 popover 卡片**，
 *     触发处就是原来那个元素（它的类一个字不动）⇒ 版面一行不挪；
 *   · 卡片是 popover ＋ popovertarget ⇒ 开／关／Esc／点外面关全是浏览器给的。
 *
 * **不做什么（本件的安全底线）**：这段不跑时，style/popover.ts 的降级层让触发处**整行可见**，
 * 全文照常读得到——所以「有脚本」是增益（省地方），「没脚本」是**可读**（不丢信息），两头都不牺牲。
 *
 * 幂等：<html> 上打一枚 data-ilife-popover-bound；重复注入只绑一次。
 * 布局变了（resize／load）只**加**不撤：已包上的触发处文字若变短，省略号自然不再出现，卡片仍在。
 *
 * 文本里出现的一切类名／标记／数值都**读 attrs.ts 的常量**（铁律二：字面只住一处）；
 * 下面每一行源码都经 JSON.stringify 落成双引号字面量，值与引号都从同一处算出来。
 */
import {
  POPOVER_ANCHOR_PREFIX, POPOVER_ANCHOR_QUERY, POPOVER_AREA_QUERY, POPOVER_ATTR, POPOVER_BOUND_ATTR,
  POPOVER_CARD_ATTR, POPOVER_CARD_CLASS, POPOVER_CLASS, POPOVER_DEFAULT_SELECTORS, POPOVER_EDGE_PX,
  POPOVER_GAP_PX, POPOVER_MEASURE_ATTR, POPOVER_READY_ATTR, POPOVER_TRIGGER_ATTR, POPOVER_TRIGGER_CLASS,
} from './attrs.js';
import type { PopoverFullTextJsInput } from './model.js';

/** 触发处缺省的无障碍名（与渲染件同一句；页面可自己给 aria-label 覆盖）。 */
const DEFAULT_LABEL = '看全文';

/** 缺省候选选择器（本件唯一的「哪些落点算长文本」口径）。 */
export const POPOVER_TEXT_SELECTORS: readonly string[] = POPOVER_DEFAULT_SELECTORS;

/** 把一行 JS 源码落成产物数组里的一行（**原样**——产出的 IIFE 要能直接跑，
 *  所以这里返回的是源码行本身，TS 侧那一份双引号字面量是编译期就脱掉的）。 */
function emit(src: string): string {
  return src;
}

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildPopoverFullTextJs(input?: PopoverFullTextJsInput): string {
  const sel = input !== undefined && input !== null && input.selectors !== undefined && input.selectors.length > 0
    ? input.selectors : POPOVER_TEXT_SELECTORS;
  const start = input !== undefined && input !== null && typeof input.startIndex === 'number' && input.startIndex > 0
    ? Math.floor(input.startIndex) : 1;
  const q = (s: string): string => JSON.stringify(s);
  const out: string[] = [emit("(function(){")];
  const consts: string[] = [
    "var BOUND=" + q(POPOVER_BOUND_ATTR) + ", READY=" + q(POPOVER_READY_ATTR) + ", MEASURE=" + q(POPOVER_MEASURE_ATTR) + ";",
    "var SEQ=" + q(POPOVER_ANCHOR_PREFIX) + ";",
    "var ROOT=" + q(POPOVER_CLASS) + ", TRIG=" + q(POPOVER_TRIGGER_CLASS) + ", CARD=" + q(POPOVER_CARD_CLASS) + ";",
    "var A_ROOT=" + q(POPOVER_ATTR) + ", A_TRIG=" + q(POPOVER_TRIGGER_ATTR) + ", A_CARD=" + q(POPOVER_CARD_ATTR) + ";",
    "var GAP=" + q(String(POPOVER_GAP_PX)) + ", EDGE=" + q(String(POPOVER_EDGE_PX)) + ", LABEL=" + q(DEFAULT_LABEL) + ";",
  ];
  for (const c of consts) out.push(emit(c));
  out.push(emit("var doc=document;"));
  out.push(emit("var html=doc.documentElement;"));
  out.push(emit("if (html.getAttribute(BOUND)===" + JSON.stringify("1") + ") return;"));
  out.push(emit("html.setAttribute(BOUND," + JSON.stringify("1") + ");"));
  out.push(emit("var SEL=" + q(sel.join(",")) + ";"));
  out.push(emit("var seq=" + String(start - 1) + ";"));
  out.push(emit("var hasAnchor=!!(window.CSS&&CSS.supports&&CSS.supports(" + q(POPOVER_ANCHOR_QUERY)
    + ")&&CSS.supports(" + q(POPOVER_AREA_QUERY) + "));"));
  for (const b of [
    "function clipped(el){",
    /* 量之前**临时挂上测量标记**、量完摘掉：降级层默认把文字摊开（整行可见＝无 JS 时的安全底线），
       直接量永远量不到溢出 ⇒ 一次都不升级（真机读数：挂载点 0、找不到触发处）。
       挂上这一枚＝把单行省略号装回去量，摘掉后页面观感不变。 */
    "  html.setAttribute(MEASURE,\"1\");",
    "  try { return clippedNow(el); } finally { html.removeAttribute(MEASURE); }",
    "}",
    "function clippedNow(el){",
    "  var cs=getComputedStyle(el);",
    "  var clamp=cs.webkitLineClamp;",
    "  if (clamp && clamp!==\"none\" && parseInt(clamp,10)>0) return el.scrollHeight > el.clientHeight + 1;",
    "  if (cs.textOverflow===\"ellipsis\" && cs.overflowX!==\"visible\") return el.scrollWidth > el.clientWidth + 1;",
    "  if (cs.overflowY!==\"visible\" && cs.overflowY!==\"clip\") return el.scrollHeight > el.clientHeight + 1;",
    "  return false;",
    "}",
    "function place(card,trig){",
    "  if (hasAnchor) return;",
    "  var t=trig.getBoundingClientRect();",
    "  var h=card.offsetHeight||0, w=card.offsetWidth||0, g=parseFloat(GAP), e=parseFloat(EDGE);",
    "  var vh=doc.documentElement.clientHeight, vw=doc.documentElement.clientWidth;",
    "  var top=t.bottom+g;",
    "  if (top+h > vh-e) { var up=t.top-g-h; top = up>=e ? up : Math.max(e, vh-e-h); }",
    "  var left=t.left;",
    "  if (left+w > vw-e) left=vw-e-w;",
    "  if (left < e) left=e;",
    "  card.style.left=Math.round(left)+\"px\";",
    "  card.style.top=Math.round(top)+\"px\";",
    "}",
    "function upgrade(el){",
    "  if (el.getAttribute(A_TRIG)!==null) return;",
    "  var parent=el.parentNode;",
    "  if (!parent) return;",
    "  seq+=1;",
    "  var id=SEQ+seq;",
    "  var wrap=doc.createElement(\"span\");",
    "  wrap.className=ROOT;",
    "  wrap.setAttribute(A_ROOT,id);",
    "  parent.insertBefore(wrap,el);",
    /* 触发处必须是**真的 <button>**：原生 popover 的 invoker 命令（popovertarget）只对 button／
       input[submit] 生效，给 <span> 挂那个属性浏览器**不理**——实测点击后 :popover-open 仍 false、
       display 仍 none（真机读数：tag=SPAN，open 点击前后都是 false）。
       故这里**新建 button 把原元素搬进去**（原文与子节点原样搬，版面由 CSS 复位，见 style/popover.ts）。 */
    "  var btn=doc.createElement(\"button\");",
    "  btn.type=\"button\";",
    "  btn.className=TRIG;",
    "  btn.setAttribute(A_TRIG,\"\");",
    "  wrap.appendChild(btn);",
    "  btn.appendChild(el);",
    "  el.className = el.className ? el.className+\" \"+TRIG : TRIG;",
    "  btn.setAttribute(\"popovertarget\",id);",
    "  btn.setAttribute(\"popovertargetaction\",\"toggle\");",
    "  btn.setAttribute(\"aria-expanded\",\"false\");",
    "  if (!el.getAttribute(\"aria-label\")) el.setAttribute(\"aria-label\",LABEL);",
    "  btn.style.anchorName=id;",
    "  var card=doc.createElement(\"span\");",
    "  card.className=CARD;",
    "  card.id=id;",
    "  card.setAttribute(A_CARD,\"\");",
    "  card.setAttribute(\"popover\",\"auto\");",
    "  card.setAttribute(\"role\",\"note\");",
    "  card.style.positionAnchor=id;",
    "  card.textContent=el.textContent||\"\";",
    "  wrap.appendChild(card);",
    "  card.addEventListener(\"toggle\",function(ev){",
    "  if (ev.newState!==\"open\") return;",
    "  btn.setAttribute(\"aria-expanded\",\"true\");",
    "  place(card,btn);",
    "});",
    "  card.addEventListener(\"beforetoggle\",function(ev){",
    "  if (ev.newState!==\"closed\") return;",
    "  btn.setAttribute(\"aria-expanded\",\"false\");",
    "});",
    "}",
    "function scan(){",
    "  var list=doc.querySelectorAll(SEL), n=0;",
    "  for (var i=0;i<list.length;i+=1){",
    "    var el=list[i];",
    "    if (el.getAttribute(A_TRIG)!==null) continue;",
    "    if (el.closest(\"[\"+A_ROOT+\"]\")) continue;",
    "    if (!clipped(el)) continue;",
    "    if (!(el.textContent||\"\").trim()) continue;",
    "    upgrade(el); n+=1;",
    "  }",
    "  return n;",
    "}",
    "function boot(){",
    "  if (scan()>0) html.setAttribute(READY,\"1\");",
    "  window.addEventListener(\"load\",function(){ scan(); },{once:true});",
    "  var t=0;",
    "  window.addEventListener(\"resize\",function(){",
    "    if (t) clearTimeout(t);",
    "    t=setTimeout(function(){ if (scan()>0) html.setAttribute(READY,\"1\"); },150);",
    "  });",
    "}",
  ]) out.push(emit('  ' + b));
  out.push(emit("if (doc.readyState===" + JSON.stringify("loading") + ") doc.addEventListener(" + JSON.stringify("DOMContentLoaded") + ",boot); else boot();"));
  out.push(emit("})();"));
  return out.join(String.fromCharCode(10));
}
