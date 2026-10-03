/** lookup-index · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  只做一件事：点锚点行里那 8 枚锚时，把对应组滚到可视区（原生锚点本来就能跳，
 *  这里只补平滑滚动＋无障碍焦点；不开脚本时原生跳转照常成立）。
 */
import {
  LOOKUP_INDEX_ANCHOR_ATTR,
  LOOKUP_INDEX_BOUND_ATTR,
  lookupIndexSlot,
} from './render.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildLookupIndexJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const selGroup = q('.' + lookupIndexSlot('group'));
  return '(function(){' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute(' + q(LOOKUP_INDEX_BOUND_ATTR) + ')==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute(' + q(LOOKUP_INDEX_BOUND_ATTR) + ',"1");' + '\n'
    + '  var A_ANCHOR=' + q(LOOKUP_INDEX_ANCHOR_ATTR) + ', SEL_GROUP=' + selGroup + ';' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var a=e.target && e.target.closest ? e.target.closest("["+A_ANCHOR+"]") : null;' + '\n'
    + '    if (!a) return;' + '\n'
    + '    var id=a.getAttribute("href"); if (!id || id.charAt(0) !== "#") return;' + '\n'
    + '    var root=a.closest ? a.closest(SEL_GROUP + ", div") : null;' + '\n'
    + '    var scope=root && root.querySelector ? root : doc;' + '\n'
    + '    var hit=scope.querySelector ? scope.querySelector(id) : doc.getElementById(id.slice(1));' + '\n'
    + '    if (!hit) return;' + '\n'
    + '    e.preventDefault();' + '\n'
    /* #1122：折叠档的组是 `<details>`（默认收起）⇒ 点目录要先把它展开，否则跳过去是一片合着的壳。
       判地同一句：`if(t&&t.tagName==="DETAILS"){ t.open=true; }`。常显档没有 DETAILS ⇒ 这一句零命中。 */
    + '    if (hit.tagName === "DETAILS") hit.open = true;' + '\n'
    + '    if (hit.scrollIntoView) hit.scrollIntoView();' + '\n'
    + '    if (!hit.hasAttribute("tabindex")) hit.setAttribute("tabindex","-1");' + '\n'
    + '    hit.focus({preventScroll:true});' + '\n'
    + '  });' + '\n'
    + '}());';
}
