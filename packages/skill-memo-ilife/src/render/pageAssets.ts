// 渲染层·数据页兼容资产（#665 D-28）：六张交互数据页（INJECT-DATA＋整套前端交互）运行所需的最小资产。
//
// 为什么自持有这两份（而不直接用共享层资产）：
// ① 共享 CSS 是深色 token（`--bg:#16181d`）＋另一套 token 名，模板是浅色体系（`--bg:#f5f5f7`，
//    老 `公共组件/assets/base.css` token A 组），硬喂即六页全黑；
// ② 共享 helpers 是 HELP 壳运行时（搜索／data-t 复制），没有模板要的六个 `window.*` 全局
//   （`esc／copyText／toast／buildDataText／buildLogText／emptyState／errorReceipt`），硬接即六页交互全红；
// ③ 把老 `base.css／base.js`（47KB）整份搬进来即搬老公共组件——票面明令不搬。
// 故：模板一字不动，填充机制走共享 `fillTemplate`，资产只给“恰好够六页跑起来”的窄镜像
// （行为对照老 `base.js／base.css`，新鲜代码非拷贝；老文件仓外只读）。
// 视觉统一（深色／新控件）若以后要做，另开票按共享 blocks 模型重写六页，不在本票。

/** token A 组（老 `base.css` 逐字值）＋六全局输出要的三个组件样式（空态／错误回执／toast）。 */
export const MEMO_PAGE_CSS = [
  ':root{--fg:#1d1d1f;--fg2:#6e6e73;--fg3:#86868b;--bg:#f5f5f7;--card:#ffffff;--line:#d2d2d7;--blue:#007aff;--blue2:#0a63ce;--soft:#f5f8ff;--ok:#34c759;--shadow:0 1px 2px rgba(0,0,0,.04),0 12px 36px rgba(0,0,0,.06)}',
  '.hm-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;max-width:520px;margin-left:auto;margin-right:auto;box-sizing:border-box}',
  '.hm-actions .copy.wide{grid-column:1/-1;background:var(--blue);color:#fff;border:none}',
  '.hm-empty{background:#fafbfc;border:1px dashed var(--line);border-radius:12px;padding:26px 20px;text-align:center;color:var(--fg2);font-size:13.5px;line-height:1.7}',
  '.hm-empty-icon{font-size:32px;margin-bottom:8px}',
  '.hm-empty-text{font-weight:600;color:var(--fg)}',
  '.hm-empty-hint{font-size:12.5px;color:var(--fg3);margin-top:4px}',
  '.hm-empty-action{margin-top:14px}',
  '.hm-error{background:#fff0ee;border:1.5px solid #ffc4c0;border-radius:16px;padding:20px 22px;margin:12px 0}',
  '.hm-error-title{font-size:15px;font-weight:700;color:#a83228;margin-bottom:14px}',
  '.hm-error .hm-actions{margin-top:0}',
  '.hm-error .hm-actions+.hm-actions{margin-top:14px}',
  '@media(max-width:820px){.hm-error{padding:16px 14px}.hm-error-title{margin-bottom:12px}}',
  '.hm-toast-stack{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0));transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;z-index:9999;pointer-events:none}',
  '.hm-toast{position:relative;transform:scale(.9);opacity:0;background:rgba(28,28,30,.94);color:#f0f0f0;border-radius:14px;padding:13px 14px 13px 16px;display:flex;align-items:flex-start;gap:12px;max-width:480px;min-width:300px;box-shadow:0 10px 32px rgba(0,0,0,.32);pointer-events:none;transition:opacity .22s ease-out,transform .22s}',
  '.hm-toast.show{opacity:1;transform:scale(1);pointer-events:auto}',
  '.hm-toast-icon{font-size:20px;line-height:1;padding-top:1px;flex-shrink:0}',
  '.hm-toast-body{flex:1;min-width:0}',
  '.hm-toast-title-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
  '.hm-toast-title{font-weight:600;font-size:12.5px;line-height:1.4;color:#fff;margin-bottom:2px}',
  '.hm-toast-detail{font-size:12px;line-height:1.5;color:#c8c8cc}',
  '.hm-toast-chip{font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;flex-shrink:0}',
  '.hm-toast-chip.ok{background:rgba(52,199,89,.18);color:#4dd96b}',
  '.hm-toast-chip.warn{background:rgba(255,149,0,.18);color:#ffb340}',
  '.hm-toast-chip.danger{background:rgba(255,59,48,.18);color:#ff6961}',
  '.hm-toast-close{background:rgba(255,255,255,.10);color:#34c759;border:0;border-radius:8px;padding:5px 9px;min-height:44px;min-width:44px;font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;white-space:nowrap;margin-left:6px;flex-shrink:0}',
  '@media(max-width:820px){.hm-toast-stack{left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0));transform:none;align-items:stretch}.hm-toast{min-width:0}.hm-toast.show{transform:scale(1)}}',
].join('\n');

/** 六全局的窄行为镜像（经典脚本：顶层函数直挂全局，模板以 `window.*` 取用）。
 *  签名与可见行为对照老 `base.js`：`copyText(s,opts?)`（剪贴板＋fallback＋silent）、
 *  `toast(msg,detail?,{icon?,badge?,timeout?})`（底部堆叠／先进后出／独立计时）、
 *  `buildDataText(p)`／`buildLogText(p)`（读 `scene.snapshot`，残缺即抛）、
 *  `emptyState({icon?,text?,hint?,action?})`、`errorReceipt({message?,retryPrompt?,data?,log?,payload?})`。 */
export const MEMO_PAGE_RUNTIME = [
  'function esc(s){return String(s==null?"":s).replace(/[&<>"\']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",\'"\':"&quot;","\'":"&#39;"}[c];});}',
  'function _fbCopy(s){var ok=false;try{var t=document.createElement("textarea");t.value=s;t.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";document.body.appendChild(t);t.focus();t.select();ok=document.execCommand("copy");document.body.removeChild(t);}catch(e){ok=false;}return ok;}',
  'function copyText(s,opts){opts=opts||{};if(!s)return;function done(ok){if(!opts.silent){if(ok){toast("已复制","粘贴给 AI",{icon:"copy"});}else{toast("复制失败","长按选择文本手动复制",{badge:{text:"失败",type:"danger"}});}}}if(navigator.clipboard&&navigator.clipboard.writeText){try{var pr=navigator.clipboard.writeText(s);if(pr&&pr.then){pr.then(function(){done(true);},function(){done(_fbCopy(s));});}else{done(true);}}catch(e){done(_fbCopy(s));}}else{done(_fbCopy(s));}}',
  '(function(){var stack=null,styleInjected=false;var ICONS={copy:"\\uD83D\\uDCCB",ok:"\\u2705",warn:"\\u26A0\\uFE0F",danger:"\\u274C",info:"\\uD83D\\uDCA1"};',
  'function ensureStyle(){if(styleInjected)return;styleInjected=true;}',
  'function getStack(){if(!stack){stack=document.createElement("div");stack.className="hm-toast-stack";document.body.appendChild(stack);}return stack;}',
  'function cap(){var n=5;if(window.matchMedia&&window.matchMedia("(max-width: 820px)").matches)n=3;return n;}',
  'function dismiss(t){if(!t||!t.parentNode)return;try{clearTimeout(t._timer);}catch(e){}t.remove();}',
  'function show(msg,detail,opts){opts=opts||{};var c=getStack();var t=document.createElement("div");t.className="hm-toast";t.setAttribute("role","status");',
  'var icon=ICONS[opts.icon]||opts.icon||"\\uD83D\\uDCCB";var row="<span class=\\"hm-toast-title\\">"+esc(msg)+"</span>";',
  'if(opts.badge){var b=opts.badge;var bt=(b.type==="ok"||b.type==="warn"||b.type==="danger")?b.type:"ok";row+="<span class=\\"hm-toast-chip "+bt+"\\">"+esc(b.text)+"</span>";}',
  'var html="<div class=\\"hm-toast-title-row\\">"+row+"</div>";if(detail){html+="<div class=\\"hm-toast-detail\\">"+esc(detail)+"</div>";}',
  't.innerHTML="<div class=\\"hm-toast-icon\\">"+icon+"</div><div class=\\"hm-toast-body\\">"+html+"</div><button class=\\"hm-toast-close\\">\\u2713 \\u77E5\\u9053\\u4E86</button>";',
  'c.appendChild(t);var all=c.querySelectorAll(".hm-toast");while(all.length>cap()){dismiss(all[0]);all=c.querySelectorAll(".hm-toast");}',
  't.querySelector(".hm-toast-close").addEventListener("click",function(){dismiss(t);});',
  't._timer=setTimeout(function(){dismiss(t);},opts.timeout||4500);requestAnimationFrame(function(){t.classList.add("show");});}',
  'window.toast=function(msg,detail,options){show(msg,detail||"",options||{});};',
  'window.__hmToastFlush=function(){if(!stack)return;stack.querySelectorAll(".hm-toast").forEach(function(t){try{clearTimeout(t._timer);}catch(e){}t.remove();});};})();',
  'function _rowText(r){if(r&&typeof r==="object"&&!Array.isArray(r)){if(r.sensitive)return "****";return String(r.text==null?"":r.text);}return String(r==null?"":r);}',
  'function _snapOf(p){var d=(p&&p.data)||{};var s=d.scene||{};var snap=s.snapshot;if(!snap||typeof snap!=="object")throw new Error("snapshot 违规");if(typeof snap.title!=="string"||!snap.title.trim())throw new Error("snapshot 违规");if(!Array.isArray(snap.summary)||!Array.isArray(snap.sections))throw new Error("snapshot 违规");return {meta:d.meta||{},scene:s,snap:snap};}',
  'function buildDataText(p){var v=_snapOf(p);var me=v.meta,s=v.scene,snap=v.snap;var L=["\\u3010"+(me.skill_name||me.command_cn||"")+" \\u00B7 "+(me.command_cn||"")+"\\u3011"];L.push("\\u573A\\u666F: "+(me.command_cn||"")+(s.scene_id?("("+s.scene_id+")"):"")+(me.wake_word?(" \\u00B7 \\u5524\\u9192\\u8BCD\\u300C"+me.wake_word+"\\u300D"):""));L.push("\\u65F6\\u95F4: "+(me.occurred_at||""));snap.summary.forEach(function(x){L.push(_rowText(x));});snap.sections.forEach(function(sec){if(!sec.rows.length)return;L.push("\\u2595"+sec.heading);sec.rows.forEach(function(r){L.push("  \\u00B7 "+_rowText(r));});});return L.join("\\n");}',
  'function buildLogText(p){var v=_snapOf(p);var me=v.meta,s=v.scene;var d=(p&&p.data)||{};var cl=d.copy_log||s.copy_log||{};var L=["\\u2460 \\u573A\\u666F\\u6807\\u8BC6"];L.push("  \\u547D  \\u4EE4: "+(me.command_cn||""));L.push("  \\u5524\\u9192\\u8BCD: "+(me.wake_word||"(\\u672A\\u77E5)"));L.push("  \\u573A\\u666F\\u540D: "+(me.command_cn||"")+(s.scene_id?("("+s.scene_id+")"):""));L.push("");L.push("\\u2461 AI \\u601D\\u8003\\u94FE");L.push("  "+(cl.thinking||"(\\u672C\\u5730\\u6E32\\u67D3 \\u00B7 \\u65E0 AI \\u94FE)"));L.push("");L.push("\\u2462 \\u5E95\\u5C42\\u6570\\u636E\\u7ED3\\u6784");L.push("  "+(cl.data_structure||"(\\u53EA\\u8BFB\\u67E5\\u8BE2)"));L.push("");L.push("\\u2463 \\u8C03\\u7528\\u94FE");L.push("  "+(cl.call_chain||"(\\u672A\\u77E5)"));L.push("");L.push("\\u2464 \\u65F6\\u95F4\\u6233 + \\u7248\\u672C");L.push("  \\u672C\\u5730\\u65F6\\u95F4: "+(cl.timestamp||me.occurred_at||"(\\u672A\\u77E5)"));L.push("  \\u7248  \\u672C: "+(me.skill_version||"(\\u672A\\u77E5)"));L.push("");L.push("\\u2465 \\u5F02\\u5E38\\u4FE1\\u606F");L.push("  "+(cl.exception||"\\u65E0"));return L.join("\\n");}',
  'function emptyState(cfg){cfg=cfg||{};return "<div class=\\"hm-empty\\">"+(cfg.icon?"<div class=\\"hm-empty-icon\\">"+esc(cfg.icon)+"</div>":"")+"<div class=\\"hm-empty-text\\">"+esc(cfg.text||"\\u6682\\u65E0\\u6570\\u636E")+"</div>"+(cfg.hint?"<div class=\\"hm-empty-hint\\">"+esc(cfg.hint)+"</div>":"")+(cfg.action?("<div class=\\"hm-empty-action\\">"+cfg.action+"</div>"):"")+"</div>";}',
  'function errorReceipt(cfg){cfg=cfg||{};var payload=cfg.payload||window.__hmPayload||null;var dataText=cfg.data!=null?String(cfg.data):"";var logText=cfg.log!=null?String(cfg.log):"";var ok=!!(payload&&payload.data&&payload.data.scene&&payload.data.scene.snapshot);if(!dataText&&ok){try{dataText=buildDataText(payload);}catch(e){dataText="";}}if(!logText&&ok){try{logText=buildLogText(payload);}catch(e){logText="";}}var html="<div class=\\"hm-error\\"><div class=\\"hm-error-title\\">\\u274C "+esc(cfg.message||"\\u64CD\\u4F5C\\u5931\\u8D25")+"</div>";if(cfg.retryPrompt){html+="<div class=\\"hm-actions\\"><button class=\\"copy primary wide\\" onclick=\\"copyText(this.dataset.t)\\" data-t=\\""+esc(cfg.retryPrompt).replace(/"/g,"&quot;")+"\\">\\u4FEE\\u6B63\\u91CD\\u8BD5</button></div>";}var btns="";if(dataText)btns+="<button class=\\"copy ghost\\" onclick=\\"copyText(this.dataset.t)\\" data-t=\\""+esc(dataText).replace(/"/g,"&quot;")+"\\">\\u590D\\u5236\\u6570\\u636E</button>";if(logText)btns+="<button class=\\"copy ghost\\" onclick=\\"copyText(this.dataset.t)\\" data-t=\\""+esc(logText).replace(/"/g,"&quot;")+"\\">\\u590D\\u5236\\u65E5\\u5FD7</button>";if(btns)html+="<div class=\\"hm-actions\\">"+btns+"</div>";return html+"</div>";}',
].join('\n');
