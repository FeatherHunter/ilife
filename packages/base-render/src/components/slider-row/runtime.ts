/** slider-row · **运行时**（产出 JS 文本；DOM 只允许出现在这段文本里）。
 *
 *  行为契约（逐条对应测试）：
 *   · **委派 ＋ 幂等**：`document` 上一枚 `click`（两端键与常用档）＋ 一枚 `input`（拖动同步读数）
 *     ＋ 一枚 `change`（松手／键盘落定）；重复注入只绑定一次（`data-ilife-slider-runtime`）。
 *   · **右侧大数字永远同步**：拖动过程（`input`）就写大数字、已填宽度与常用档选中态，
 *     只是**不派发事件**；落定（`change`）与按档／按键才派发 `ilife:slider-change`（`detail.prev` 读已落定值）。
 *   · **键盘与读屏器走原生**：`range` 是原生控件（`←`／`→` 各走一档），本段不改它的语义，
 *     只同步 `aria-valuetext`（给人看的「1,800 卡」）。
 *   · **未设置**：`value` 缺席（空属性）时大数字写 `—`；拖动／按键／点档都会把它定下来。
 *   · **更新中不接输入**：根上挂了 `data-ilife-slider-loading="1"` 时一律不响应。
 *   · **无脚本降级**：这段不跑时标记里仍有数字、单位、状态字与轨道（只是拖不动）。
 */
import {
  SLIDER_ROW_ACT_ATTR,
  SLIDER_ROW_AT_MAX,
  SLIDER_ROW_AT_MIN,
  SLIDER_ROW_BOUND_ATTR,
  SLIDER_ROW_CLASS,
  SLIDER_ROW_COMMIT_ATTR,
  SLIDER_ROW_DECIMALS_ATTR,
  SLIDER_ROW_DISABLED_ATTR,
  SLIDER_ROW_EVENT_CHANGE,
  SLIDER_ROW_FILL_ATTR,
  SLIDER_ROW_HIT_ATTR,
  SLIDER_ROW_INPUT_ATTR,
  SLIDER_ROW_LABEL_ATTR,
  SLIDER_ROW_LOADING,
  SLIDER_ROW_LOADING_ATTR,
  SLIDER_ROW_MAX_ATTR,
  SLIDER_ROW_MIN_ATTR,
  SLIDER_ROW_MISSING,
  SLIDER_ROW_NAME_ATTR,
  SLIDER_ROW_PRESET_ATTR,
  SLIDER_ROW_STATE_ATTR,
  SLIDER_ROW_STEP_ATTR,
  SLIDER_ROW_UNIT_ATTR,
  SLIDER_ROW_UNSET,
  SLIDER_ROW_VALUE_ATTR,
  sliderRowSlot,
} from './attrs.js';

/** 产出运行时的 JS 文本（经典 script 作用域可跑的 IIFE；由页面拼进共享 helpers 槽）。 */
export function buildSliderRowJs(): string {
  const q = (s: string): string => JSON.stringify(s);
  return '(function(){' + '\n'
    + '  var ATTR_NAME=' + q(SLIDER_ROW_NAME_ATTR) + ', ATTR_VALUE=' + q(SLIDER_ROW_VALUE_ATTR)
    + ', ATTR_COMMIT=' + q(SLIDER_ROW_COMMIT_ATTR) + ';' + '\n'
    + '  var ATTR_MIN=' + q(SLIDER_ROW_MIN_ATTR) + ', ATTR_MAX=' + q(SLIDER_ROW_MAX_ATTR)
    + ', ATTR_STEP=' + q(SLIDER_ROW_STEP_ATTR) + ', ATTR_DEC=' + q(SLIDER_ROW_DECIMALS_ATTR) + ';' + '\n'
    + '  var ATTR_FILL=' + q(SLIDER_ROW_FILL_ATTR) + ', ATTR_UNIT=' + q(SLIDER_ROW_UNIT_ATTR)
    + ', ATTR_LABEL=' + q(SLIDER_ROW_LABEL_ATTR) + ';' + '\n'
    + '  var ATTR_ACT=' + q(SLIDER_ROW_ACT_ATTR) + ', ATTR_PRESET=' + q(SLIDER_ROW_PRESET_ATTR)
    + ', ATTR_HIT=' + q(SLIDER_ROW_HIT_ATTR) + ', ATTR_INPUT=' + q(SLIDER_ROW_INPUT_ATTR) + ';' + '\n'
    + '  var ATTR_STATE=' + q(SLIDER_ROW_STATE_ATTR)
    + ', ATTR_DISABLED=' + q(SLIDER_ROW_DISABLED_ATTR) + ', ATTR_LOADING=' + q(SLIDER_ROW_LOADING_ATTR)
    + ', ATTR_BOUND=' + q(SLIDER_ROW_BOUND_ATTR) + ';' + '\n'
    + '  var EV_CHANGE=' + q(SLIDER_ROW_EVENT_CHANGE) + ', MISSING=' + q(SLIDER_ROW_MISSING) + ';' + '\n'
    + '  var WORD_MIN=' + q(SLIDER_ROW_AT_MIN) + ', WORD_MAX=' + q(SLIDER_ROW_AT_MAX)
    + ', WORD_UNSET=' + q(SLIDER_ROW_UNSET) + ', WORD_LOADING=' + q(SLIDER_ROW_LOADING) + ';' + '\n'
    + '  var CLS=' + q(SLIDER_ROW_CLASS) + ', CLS_STATE=' + q(sliderRowSlot('state'))
    + ', CLS_NUMBER=' + q(sliderRowSlot('number')) + ', CLS_FILL=' + q(sliderRowSlot('fill')) + ';' + '\n'
    + '  var CLS_VALUE=' + q(sliderRowSlot('value')) + ', CLS_INPUT=' + q(sliderRowSlot('input'))
    + ', CLS_DEC=' + q(sliderRowSlot('dec')) + ', CLS_INC=' + q(sliderRowSlot('inc')) + ';' + '\n'
    + '  var CLS_PRESET=' + q(sliderRowSlot('preset')) + ', SEL_INPUT="["+ATTR_INPUT+"]";' + '\n'
    + '  var doc=document;' + '\n'
    + '  if (doc.documentElement.getAttribute("data-ilife-slider-runtime")==="1") return;' + '\n'
    + '  doc.documentElement.setAttribute("data-ilife-slider-runtime","1");' + '\n'
    + '  function num(v){ if (v===null||v===undefined||v==="") return null; var n=Number(v); return isFinite(n)?n:null; }' + '\n'
    + '  function minOf(root){ return num(root.getAttribute(ATTR_MIN)); }' + '\n'
    + '  function maxOf(root){ return num(root.getAttribute(ATTR_MAX)); }' + '\n'
    + '  function stepOf(root){ return num(root.getAttribute(ATTR_STEP)); }' + '\n'
    + '  function decimalsOf(root){ var d=num(root.getAttribute(ATTR_DEC)); return d===null?0:d; }' + '\n'
    + '  function valueOf(root){ return num(root.getAttribute(ATTR_VALUE)); }' + '\n'
    + '  function committedOf(root){ return num(root.getAttribute(ATTR_COMMIT)); }' + '\n'
    + '  function unitOf(root){ return root.getAttribute(ATTR_UNIT)||""; }' + '\n'
    + '  function busy(root){ return root.getAttribute(ATTR_DISABLED)==="1" || root.getAttribute(ATTR_LOADING)==="1"; }' + '\n'
    + '  function rootOf(el, sel){ var hit=el&&el.closest?el.closest(sel):null;'
    + ' return hit&&hit.closest?hit.closest("["+ATTR_NAME+"]"):null; }' + '\n'
    + '  function grouped(s){ return s.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ","); }' + '\n'
    /* 显示字：与 `render.ts` 的 `formatSliderValue` 同一口径（产出的 JS 没法 import，两边各写一份）。 */
    + '  function fmt(v, decimals){' + '\n'
    + '    var fixed=v.toFixed(decimals);' + '\n'
    + '    if (decimals>0){ fixed=fixed.replace(/\\.0+$/,"").replace(/(\\.\\d*?)0+$/,"$1"); }' + '\n'
    + '    var dot=fixed.indexOf(".");' + '\n'
    + '    return dot<0 ? grouped(fixed) : grouped(fixed.slice(0,dot))+fixed.slice(dot);' + '\n'
    + '  }' + '\n'
    + '  function wordOf(root, v){ var u=unitOf(root); return (v===null?MISSING:fmt(v,decimalsOf(root)))+(u===""?"":" "+u); }' + '\n'
    + '  function snap(v, min, step){ return min+Math.round((v-min)/step)*step; }' + '\n'
    + '  function clamp(v, min, max){ return v<min?min:(v>max?max:v); }' + '\n'
    + '  function same(a, b){ if (a===null||b===null) return a===b; return Math.abs(a-b)<1e-9; }' + '\n'
    + '  function setState(root, word){' + '\n'
    + '    var el=root.querySelector("["+ATTR_STATE+"]");' + '\n'
    + '    if (word===""){ if (el) el.remove(); return; }' + '\n'
    + '    if (!el){ var head=root.querySelector("."+CLS+"-head"); if (!head) return;'
    + ' el=doc.createElement("span"); el.className=CLS_STATE; el.setAttribute(ATTR_STATE,""); head.appendChild(el); }' + '\n'
    + '    el.setAttribute(ATTR_STATE, word); el.textContent=word;' + '\n'
    + '  }' + '\n'
    /* ── 上屏：一次写全（大数字／已填宽度／轨道值／常用档选中态／状态字／两端键的可点性） ── */
    + '  function paint(root, v){' + '\n'
    + '    var min=minOf(root), max=maxOf(root);' + '\n'
    + '    root.setAttribute(ATTR_VALUE, v===null?"":String(v));' + '\n'
    + '    var permille = (v===null||min===null||max===null||max<=min) ? 0 : Math.round(((v-min)/(max-min))*1000);' + '\n'
    + '    root.setAttribute(ATTR_FILL, String(permille));' + '\n'
    + '    var fill=root.querySelector("."+CLS_FILL); if (fill) fill.style.width = (permille/10)+"%";' + '\n'
    + '    var number=root.querySelector("."+CLS_NUMBER); if (number) number.textContent = v===null?MISSING:fmt(v,decimalsOf(root));' + '\n'
    + '    var input=root.querySelector(SEL_INPUT);' + '\n'
    + '    if (input){' + '\n'
    + '      var want = v===null ? (min===null?0:min) : v;' + '\n'
    + '      if (Number(input.value)!==Number(want)) input.value=String(want);' + '\n'
    + '      if (v===null) input.removeAttribute("aria-valuetext"); else input.setAttribute("aria-valuetext", wordOf(root,v));' + '\n'
    + '    }' + '\n'
    + '    var presets=root.querySelectorAll("["+ATTR_PRESET+"]");' + '\n'
    + '    for (var i=0;i<presets.length;i+=1){ var one=num(presets[i].getAttribute(ATTR_PRESET));'
    + ' presets[i].setAttribute("aria-pressed", (v!==null&&one!==null&&Math.abs(v-one)<1e-9)?"true":"false"); }' + '\n'
    + '    var dec=root.querySelector("."+CLS_DEC), inc=root.querySelector("."+CLS_INC), locked=busy(root);' + '\n'
    + '    if (dec) dec.disabled = locked || (v!==null&&min!==null&&v<=min);' + '\n'
    + '    if (inc) inc.disabled = locked || (v!==null&&max!==null&&v>=max);' + '\n'
    + '    if (root.getAttribute(ATTR_LOADING)==="1") setState(root,WORD_LOADING);' + '\n'
    + '    else if (v===null) setState(root,WORD_UNSET);' + '\n'
    + '    else if (min!==null&&v<=min) setState(root,WORD_MIN);' + '\n'
    + '    else if (max!==null&&v>=max) setState(root,WORD_MAX);' + '\n'
    + '    else setState(root,"");' + '\n'
    + '  }' + '\n'
    + '  function fire(root, v, prev){' + '\n'
    + '    root.dispatchEvent(new CustomEvent(EV_CHANGE,{bubbles:true,detail:{name:root.getAttribute(ATTR_NAME),'
    + 'label:root.getAttribute(ATTR_LABEL),value:v,prev:prev,unit:unitOf(root)}}));' + '\n'
    + '  }' + '\n'
    /* 落定：值没变就只上屏、不派发（"拖回原位"不该产生一条变更）。 */
    + '  function commit(root, v){' + '\n'
    + '    var prev=committedOf(root);' + '\n'
    + '    if (!same(prev,v)){' + '\n'
    + '      root.setAttribute(ATTR_COMMIT, v===null?"":String(v));' + '\n'
    + '      paint(root,v); fire(root,v,prev); return;' + '\n'
    + '    }' + '\n'
    + '    paint(root,v);' + '\n'
    + '  }' + '\n'
    + '  function isInput(el){ return !!el && !!el.classList && el.classList.contains(CLS_INPUT); }' + '\n'
    /* 拖动过程：只同步读数（大数字／宽度／选中态），不派发。 */
    + '  doc.addEventListener("input", function(e){' + '\n'
    + '    var input=e.target; if (!isInput(input)) return;' + '\n'
    + '    var root=rootOf(input,"["+ATTR_NAME+"]"); if (!root || busy(root)) return;' + '\n'
    + '    paint(root, num(input.value));' + '\n'
    + '  });' + '\n'
    /* 松手／键盘落定：这里才派发变更。 */
    + '  doc.addEventListener("change", function(e){' + '\n'
    + '    var input=e.target; if (!isInput(input)) return;' + '\n'
    + '    var root=rootOf(input,"["+ATTR_NAME+"]"); if (!root || busy(root)) return;' + '\n'
    + '    commit(root, num(input.value));' + '\n'
    + '  });' + '\n'
    + '  doc.addEventListener("click", function(e){' + '\n'
    + '    var hit=e.target&&e.target.closest?e.target.closest("["+ATTR_HIT+"]"):null; if (!hit) return;' + '\n'
    + '    var root=rootOf(hit,"["+ATTR_HIT+"]"); if (!root) return;' + '\n'
    + '    if (busy(root)){ e.preventDefault(); return; }' + '\n'
    + '    var act=hit.getAttribute(ATTR_ACT);' + '\n'
    + '    var min=minOf(root), max=maxOf(root), step=stepOf(root); if (min===null||max===null||step===null) return;' + '\n'
    + '    e.preventDefault();' + '\n'
    + '    if (act==="preset"){ var pv=num(hit.getAttribute(ATTR_PRESET)); if (pv===null) return; commit(root, clamp(snap(pv,min,step),min,max)); return; }' + '\n'
    + '    if (act!=="dec" && act!=="inc") return;' + '\n'
    + '    var v=valueOf(root);' + '\n'
    + '    if (v===null){ commit(root,min); return; }' + '\n'
    + '    commit(root, clamp(snap(act==="dec"?v-step:v+step, min, step), min, max));' + '\n'
    + '  });' + '\n'
    + '  var all=doc.querySelectorAll("["+ATTR_NAME+"]");' + '\n'
    + '  for (var j=0;j<all.length;j+=1) all[j].setAttribute(ATTR_BOUND,"1");' + '\n'
    + '}());';
}
