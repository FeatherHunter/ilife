/** photo-compare · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  要它干什么：竖线、把手（原生 `range` 的把手由浏览器画）、后一张的裁切**三处**都从
 *  **同一个**位置值算。位置值只有一处事实：根上的局部自定义属性 `--photo-compare-split`。
 *  这段做的事就一件：把 `range` 的当前值写回那个属性。
 *
 *  行为契约（逐条对应判据）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `input` 委派（拖动与键盘 `←`／`→` 都用它）；重复注入只绑一次。
 *   · **初始化**：进页时按 `range` 的**当前值**补画一次 —— 浏览器前进／后退或表单还原会把 `value`
 *     改回来（服务端渲的那一版只是初值），不补画就会出现「把手在 20%，竖线在 50%」这种自相矛盾。
 *   · **无脚本降级**：这段不跑时，服务端渲的初值照样成立（竖线／裁切都在初值上），只是拖不动。
 *   · **零 DOM 于模块代码**：`document` 只出现在本文件产出的字符串里。
 */
import { PHOTO_COMPARE_SPLIT_VAR, photoCompareSlot } from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildPhotoCompareJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  const rangeClass = photoCompareSlot('range');
  const rootSel = '[data-ilife-photo-compare]';
  return '(function(){' + '\n'
    + '  var SEL_RANGE=' + q('.' + rangeClass) + ', SEL_ROOT=' + q(rootSel) + ';' + '\n'
    + '  var CLASS_RANGE=' + q(rangeClass) + ', SPLIT=' + q(PHOTO_COMPARE_SPLIT_VAR) + ';' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-compare-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-compare-runtime","1");' + '\n'
    + '  function rootOf(el){ return el && el.closest ? el.closest(SEL_ROOT) : null; }' + '\n'
    + '  function paint(range){' + '\n'
    + '    var root=rootOf(range); if (!root) return;' + '\n'
    + '    var v=range.value; if (v==="" || v===null || v===undefined) v="50";' + '\n'
    + '    root.style.setProperty(SPLIT, v + "%");' + '\n'
    + '  }' + '\n'
    + '  function isRange(el){ return !!(el && el.classList && el.classList.contains(CLASS_RANGE)); }' + '\n'
    + '  doc.addEventListener("input", function(e){ if (isRange(e.target)) paint(e.target); });' + '\n'
    + '  doc.addEventListener("change", function(e){ if (isRange(e.target)) paint(e.target); });' + '\n'
    /* 初始化：按当前值补画一次（表单还原／前进后退之后也自洽）。 */
    + '  var all=doc.querySelectorAll(SEL_RANGE);' + '\n'
    + '  for (var i=0;i<all.length;i+=1) paint(all[i]);' + '\n'
    + '}());';
}
