#!/usr/bin/env node
/** #1117 · 写入域回执侧 16 页「真跑产物 vs 冻结原型」验收墙生成器（无依赖）。
 *
 * 输入：<产物目录>/manifest.json（本票 1117-write-渲染16页.mjs 落盘）。每行形状
 *   { seq, id, wake, key, params, file, proto, check, window, bytes, protoSha256, family, recordId, ... }
 *   —— file ＝ 真跑产物（左），proto ＝ 冻结原型副本（右），两件都住在**产物目录里**
 *      （不跨目录：iframe 相对路径必须落得到，见 #1117 票面「禁原型与真跑产物分处两目录」）。
 *
 * 出两份墙（同一格的两侧：左真跑、右原型）：
 *   ① 手机墙：390 宽 × 3 列，格高 820 一致，**无 loading=lazy**；
 *   ② 桌面墙：1280 宽 × 1 列，同一格上下两张（上真跑、下原型），各 1280×900。
 * 两份都带打勾区：满意 ／ 不满意（原因必填）＋ 导出 JSON（判定原文落盘，供逐格结论引用）。
 *
 * 自检（#1004 同形）：清单点名的件在盘上没有 → 逐件点名 ＋ exit 1；齐了 → 打印读数 ＋ exit 0。
 *   绿的样子：「墙 <名>：16 格；链接 N 条；缺失 0 -> <名> 可发」
 *
 * 用法：node docs/skills/skill-bill/1117-write-验收墙.mjs <产物目录> [墙输出名]
 *   正例：node docs/skills/skill-bill/1117-write-验收墙.mjs .scratch/1117-write compare-1117-write-16.html   # exit 0
 *   反例：node docs/skills/skill-bill/1117-write-验收墙.mjs .scratch/1117-write/坏清单 compare-坏.html       # exit 1 点名缺件
 * 红线：本脚本**只读** manifest 与两侧 HTML，只写墙文件；不改产物、不改原型、不改任何 packages/ 代码。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] ?? '.scratch/1117-write';
const OUT = process.argv[3] ?? 'compare-1117-write-16.html';
const W = 390, H = 820, COLS = 3;   // 手机墙：390 宽 × 3 列、格高 820
const DW = 1280, DH = 900;          // 桌面墙：1280 宽 × 1 列
const EXPECTED = 16;                // 写入域回执侧 16 页（偶数位 x02…x32），少一页即红

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const manifestPath = join(SRC, 'manifest.json');
if (!existsSync(manifestPath)) {
  console.log('RED 缺清单：' + manifestPath + '（本墙的清单由 docs/skills/skill-bill/1117-write-渲染16页.mjs 落盘）');
  process.exit(1);
}
const raw = JSON.parse(readFileSync(manifestPath, 'utf8'));
const rows = raw.rows ?? [];
const missing = [];
for (const r of rows) for (const k of ['file', 'proto']) if (!existsSync(join(SRC, r[k]))) missing.push(r.id + ' ' + r[k]);
if (rows.length !== EXPECTED) missing.push('清单格数 ' + rows.length + ' != ' + EXPECTED);
if (missing.length > 0) {
  console.log('墙 ' + OUT + '：' + rows.length + ' 格；链接 0 条；缺 ' + missing.length + ' 件 -> ' + missing.join('、'));
  process.exit(1);
}

const CSS = [
  '*{margin:0;padding:0;box-sizing:border-box}',
  'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}',
  '.wrap{padding:24px 20px 60px}h1{font-size:22px;font-weight:600;margin-bottom:6px}',
  '.sub{color:#6e6e73;font-size:13.5px;margin-bottom:18px;line-height:1.75;max-width:1500px}',
  '.okbar{position:sticky;top:0;z-index:50;background:#fff;border:1px dashed #1d1d1f;border-radius:10px;padding:8px 10px;margin-bottom:14px;font-size:12.5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
  '.okbar .cnt{font-weight:700;font-variant-numeric:tabular-nums}.okbar .msg{color:#6e6e73;font-size:12px}',
  '.okbar button{font:inherit;font-size:12px;background:#fff;border:1px solid #1d1d1f;border-radius:8px;padding:4px 10px;cursor:pointer}',
  '.okbtn,.nobtn{font:inherit;font-size:12px;border-radius:8px;padding:2px 8px;cursor:pointer;white-space:nowrap;background:#fff}',
  '.okbtn{border:1px solid #1d1d1f}.okbtn.on{background:#1d1d1f;color:#fff}',
  '.nobtn{border:1px solid #b42318;color:#b42318}.nobtn.on{background:#b42318;color:#fff}',
  'figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}',
  'figure.done{outline:2px solid #067647}figure.bad{outline:2px dashed #b42318}',
  'figcaption{padding:8px 10px;font-size:12.5px;border-bottom:1px solid #e8e8ed}',
  'figcaption .t{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;font-weight:600}',
  'figcaption .seq{background:#1d1d1f;color:#fff;border-radius:6px;padding:0 6px;font-size:12px}',
  'figure.done figcaption .seq{background:#067647}figure.bad figcaption .seq{background:#b42318}',
  'figcaption a{color:#007aff;text-decoration:none;font-size:12.5px}figcaption .key{color:#86868b;font-weight:400;font-size:11.5px}',
  'figcaption .c{color:#515154;font-weight:400;font-size:12px;margin-top:4px;line-height:1.6}',
  'figcaption .w{color:#86868b;font-weight:400;font-size:11.5px;margin-top:2px}',
  '.pair{display:flex;gap:8px;padding:8px;background:#f5f5f7}.stack{display:flex;flex-direction:column;gap:8px;padding:8px;background:#f5f5f7}',
  '.phone{background:#fff;border:1px solid #e8e8ed;border-radius:8px;overflow:hidden}',
  '.tag{font-size:11.5px;color:#86868b;padding:4px 8px;border-bottom:1px solid #e8e8ed}',
  'iframe{display:block;border:0;background:#fff}',
  '.noveil{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}',
  '.nobox{background:#fff;border:1px dashed #1d1d1f;border-radius:10px;padding:12px 14px;max-width:380px;width:100%;font-size:13px;line-height:1.7}',
  '.nobox .t{font-weight:700;margin-bottom:6px}.nobox .hint{color:#6e6e73;font-size:12px;margin-bottom:8px}',
  '.nobox input{width:100%;font:inherit;font-size:13px;border:1px solid #1d1d1f;border-radius:8px;padding:6px 8px;margin-bottom:8px}',
  '.nobox .err{color:#b42318;font-size:12px;min-height:18px;margin-bottom:6px}',
  '.nobox .row{display:flex;gap:8px;justify-content:flex-end}',
  '.nobox .row button{font:inherit;font-size:12px;background:#fff;border:1px solid #1d1d1f;border-radius:8px;padding:4px 12px;cursor:pointer}',
  '.nobox .row button.primary{background:#1d1d1f;color:#fff}',
].join('');

function caption(r) {
  return '<figcaption><div class="t"><span class="seq">' + String(r.seq).padStart(2, '0') + '</span> <span class="key">' + esc(r.id) + '</span> <span>' + esc(r.wake) + '</span>'
    + ' <span class="key">' + esc(r.key) + '</span>'
    + ' <a href="' + esc(r.file) + '" target="_blank" rel="noopener">真跑产物整页</a>'
    + ' <a href="' + esc(r.proto) + '" target="_blank" rel="noopener">冻结原型整页</a>'
    + ' <button type="button" class="okbtn" data-seq="' + r.seq + '" data-wake="' + esc(r.wake) + '" data-prod="' + esc(r.file) + '" data-proto="' + esc(r.proto) + '" aria-pressed="false">满意</button>'
    + ' <button type="button" class="nobtn" data-seq="' + r.seq + '" data-wake="' + esc(r.wake) + '" data-prod="' + esc(r.file) + '" data-proto="' + esc(r.proto) + '" aria-pressed="false">不满意</button></div>'
    + '<div class="c">该确认什么：' + esc(r.check) + '</div>'
    + '<div class="w">窗口：' + esc(r.window) + ' ｜ 记录编号 ' + esc(String(r.recordId ?? '—')) + ' ｜ 页族 ' + esc(r.family ?? '—') + ' ｜ 真跑字节 ' + r.bytes + ' ｜ 原型 sha256 ' + esc(String(r.protoSha256).slice(0, 16)) + '…</div>'
    + '<div class="w">骨架读数（机器面，只报不当判）：件套缺 ' + esc(JSON.stringify(r.anchorsMissing ?? [])) + ' ｜ 页内导航 ' + esc(String(r.nav ?? '—')) + ' ｜ 来源脚注 ' + esc(String(r.sourceNote ?? '—')) + ' ｜ undefined/NaN ' + esc(String(r.undefinedNaN)) + ' ｜ loading=lazy ' + esc(String(r.loadingLazy)) + '</div></figcaption>';
}

function render(kind) {
  const cells = rows.map((r) => {
    const pair = kind === 'mobile'
      ? '<div class="pair"><div class="phone"><div class="tag">左：真跑产物（说唤醒词拿到的）</div><iframe src="' + esc(r.file) + '" width="' + W + '" height="' + H + '" title="' + esc(r.wake + ' 真跑产物') + '"></iframe></div>'
        + '<div class="phone"><div class="tag">右：冻结原型（#1073，sha256 已核）</div><iframe src="' + esc(r.proto) + '" width="' + W + '" height="' + H + '" title="' + esc(r.wake + ' 冻结原型') + '"></iframe></div></div>'
      : '<div class="stack"><div class="phone"><div class="tag">上：真跑产物（说唤醒词拿到的）</div><iframe src="' + esc(r.file) + '" width="' + DW + '" height="' + DH + '" title="' + esc(r.wake + ' 真跑产物') + '"></iframe></div>'
        + '<div class="phone"><div class="tag">下：冻结原型（#1073）</div><iframe src="' + esc(r.proto) + '" width="' + DW + '" height="' + DH + '" title="' + esc(r.wake + ' 冻结原型') + '"></iframe></div></div>';
    return '  <figure data-seq="' + r.seq + '">' + caption(r) + pair + '</figure>';
  }).join('\n');
  const wallName = kind === 'mobile' ? '1117-write-16' : '1117-write-16-desktop';
  const gridCss = kind === 'mobile'
    ? '.grid{display:grid;grid-template-columns:repeat(' + COLS + ',' + (W * 2 + 26) + 'px);gap:18px;align-items:start;justify-content:start}'
    : '.grid{display:grid;grid-template-columns:repeat(1,' + (DW + 20) + 'px);gap:18px;align-items:start;justify-content:start}';
  const h1 = kind === 'mobile'
    ? '#1117 写入域回执侧 16 页 · 真跑产物 vs 冻结原型 · 手机墙'
    : '#1117 写入域回执侧 16 页 · 真跑产物 vs 冻结原型 · 桌面墙';
  const eight = (raw.criteria?.list ?? []).map((x, i) => (i + 1) + '. ' + x).join('；');
  const sub = kind === 'mobile'
    ? '<b>左＝真跑产物</b>（隔离家目录 $env:TEMP\\tick-1117 ＋ 本票样本集 1117-write-样本集.json 的 10 条垫位 ＋ 逐页写库；金额／分类／时间／记录编号逐条对得上右栏原型可见文本），<b>右＝ #1073 冻结原型</b>（write-receipt 16 件同目录副本，逐件 sha256 与 proto/manifest.json 登记值对上）。快照：' + esc(String(raw.snapshot?.gitHead ?? '').slice(0, 8)) + ' ＋ dist/cmd_read.js ' + esc(String(raw.snapshot?.cmdReadDistSha256 ?? '').slice(0, 12)) + '（渲染当刻；#1114 落地后须复跑）。每格「满意／不满意（原因必填）」，可导出 JSON 作为逐格结论原文。<br><b>本域判据（票据纸八件套，逐格照着判）</b>：' + esc(eight) + '。'
    : '同一格上下两张：<b>上＝真跑产物</b>（1280 宽）、<b>下＝ #1073 冻结原型</b>（1280 宽）；与手机墙成对，编号／唤醒词／该确认什么完全一致。判据同手机墙（票据纸八件套）。';
  return '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>' + h1 + '</title><style>' + CSS + gridCss + '</style></head>\n'
    + '<body><div class="wrap"><h1>' + h1 + '</h1>\n<div class="sub">' + sub + '</div>\n'
    + bar(wallName, rows.length) + '\n<div class="grid">\n' + cells + '\n</div></div>\n'
    + script(wallName) + '</body></html>\n';
}

function bar(wallName) {
  return '<div class="okbar" id="okbar"><span class="cnt" id="okcnt">满意 0 / 不满意 0 / 未判 16 / 总数 16</span>'
    + '<button type="button" id="okexp">导出清单JSON</button><button type="button" id="okcopy">复制</button>'
    + '<span class="msg" id="okmsg"></span></div>';
}

function script(wallName) {
  const lines = [
    '<' + 'script>',
    '(function(){',
    'var WALL=' + JSON.stringify(wallName) + ';',
    'function KEY(s){return "cmp1117-ok:"+WALL+":"+s;}',
    'function NOKEY(s){return "cmp1117-ok:"+WALL+":"+s+":no";}',
    'var MEM={};',
    'function get(k){try{var v=localStorage.getItem(k);return v===null?(MEM[k]||null):v;}catch(e){return MEM[k]||null;}}',
    'function set(k,v){try{localStorage.setItem(k,v);MEM[k]=v;}catch(e){MEM[k]=v;}}',
    'function del(k){try{localStorage.removeItem(k);}catch(e){}delete MEM[k];}',
    'function sel(c,s){return "."+c+String.fromCharCode(91)+"data-seq="+String.fromCharCode(34)+s+String.fromCharCode(34,93);}',
    'var okBtns=[].slice.call(document.querySelectorAll(".okbtn"));',
    'var noBtns=[].slice.call(document.querySelectorAll(".nobtn"));',
    'function seqOf(b){return b.getAttribute("data-seq");}',
    'function bySeq(s){return {ok:document.querySelector(sel("okbtn",s)),no:document.querySelector(sel("nobtn",s))};}',
    'function rowOf(b){var f=b.closest("figure");return f||b.closest("tr");}',
    'function getReason(s){return get(NOKEY(s))||"";}',
    'function isOk(s){return get(KEY(s))==="1";}',
    'function isNo(s){return !!getReason(s);}',
    'function paint(s){var p=bySeq(s),ok=isOk(s),no=isNo(s),reason=getReason(s);',
    '  if(p.ok){p.ok.classList.toggle("on",ok);p.ok.setAttribute("aria-pressed",ok?"true":"false");}',
    '  if(p.no){p.no.classList.toggle("on",no);p.no.setAttribute("aria-pressed",no?"true":"false");if(no&&reason)p.no.setAttribute("title","不满意原因："+reason+"（再点可改）");}',
    '  var r=rowOf(p.ok);if(r){r.classList.toggle("done",ok&&!no);r.classList.toggle("bad",!!no);}}',
    'function paintAll(){var seen={};okBtns.concat(noBtns).forEach(function(b){var s=seqOf(b);if(!seen[s]){seen[s]=1;paint(s);}});}',
    'function count(){var ok=0,no=0,seen={};okBtns.forEach(function(b){var s=seqOf(b);if(seen[s])return;seen[s]=1;if(isOk(s))ok++;else if(isNo(s))no++;});',
    '  var el=document.getElementById("okcnt");if(el)el.textContent="满意 "+ok+" / 不满意 "+no+" / 未判 "+(okBtns.length-ok-no)+" / 总数 "+okBtns.length;}',
    'function meta(seq){var b=document.querySelector(sel("okbtn",seq));return {wall:WALL,seq:+seq,wake:b.getAttribute("data-wake"),prod:b.getAttribute("data-prod"),proto:b.getAttribute("data-proto")};}',
    'function list(){var seen={},out=[];okBtns.forEach(function(b){var s=seqOf(b);if(seen[s])return;seen[s]=1;var m=meta(s);',
    '  if(isOk(s)){m.verdict="ok";m.reason="";}else if(isNo(s)){m.verdict="no";m.reason=getReason(s);}else{m.verdict="";m.reason="";}out.push(m);});',
    '  return out.sort(function(a,b){return a.seq-b.seq;});}',
    'function payload(){var it=list(),ok=it.filter(function(x){return x.verdict==="ok";}).length,no=it.filter(function(x){return x.verdict==="no";}).length;',
    '  return JSON.stringify({wall:WALL,total:okBtns.length,ok:ok,no:no,unjudged:okBtns.length-ok-no,items:it},null,2);}',
    'okBtns.forEach(function(b){b.addEventListener("click",function(){var s=seqOf(b),on=!isOk(s);if(on){set(KEY(s),"1");del(NOKEY(s));}else{del(KEY(s));}paint(s);count();});});',
    'var veil=null;',
    'function closeNo(){if(veil&&veil.parentNode)veil.parentNode.removeChild(veil);veil=null;}',
    'function openNo(seq){var cur=getReason(seq),b=document.querySelector(sel("okbtn",seq));closeNo();',
    '  veil=document.createElement("div");veil.className="noveil";',
    '  veil.innerHTML="<div class=\'nobox\' role=\'dialog\'><div class=\'t\'>不满意 · "+((b?b.getAttribute("data-wake"):"")+"（seq"+seq+"）")+"</div><div class=\'hint\'>哪一格、什么症状（必填；例：390 下占比条文字贴边／结论句折行／明细行高不对）</div><input type=\'text\' maxlength=\'200\' placeholder=\'哪一格 + 什么症状（必填）\'><div class=\'err\'></div><div class=\'row\'><button type=\'button\' class=\'cancel\'>取消</button><button type=\'button\' class=\'primary confirm\'>确认</button></div></div>";',
    '  document.body.appendChild(veil);var input=veil.querySelector("input"),err=veil.querySelector(".err");input.value=cur;setTimeout(function(){input.focus();input.select();},0);',
    '  function doConfirm(){var v=input.value.trim();if(!v){err.textContent="原因必填：请写哪一格 + 什么症状";input.focus();return;}set(NOKEY(seq),v);del(KEY(seq));closeNo();paint(seq);count();}',
    '  veil.querySelector(".cancel").addEventListener("click",closeNo);veil.addEventListener("click",function(e){if(e.target===veil)closeNo();});',
    '  input.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();doConfirm();}if(e.key==="Escape"){closeNo();}});',
    '  veil.querySelector(".confirm").addEventListener("click",doConfirm);}',
    'noBtns.forEach(function(b){b.addEventListener("click",function(){openNo(seqOf(b));});});',
    'paintAll();count();',
    'document.getElementById("okexp").addEventListener("click",function(){var s=payload(),blob=new Blob([s],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=WALL+"-verdict-list.json";document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},100);});',
    'document.getElementById("okcopy").addEventListener("click",function(){var s=payload(),msg=document.getElementById("okmsg");',
    '  function done(t){if(msg)msg.textContent=t;}',
    '  function fb(){var ta=document.createElement("textarea");ta.value=s;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");done("已复制清单 "+list().length+" 格");}catch(e){done("复制失败，请用导出JSON");}ta.remove();}',
    '  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(function(){done("已复制清单 "+list().length+" 格");},fb);}else{fb();}});',
    '})();',
    '<' + '/script>',
  ];
  return lines.join('\n');
}

const mobile = render('mobile');
const mobilePath = join(SRC, OUT);
writeFileSync(mobilePath, mobile, 'utf8');
const deskName = OUT.replace(/\.html$/i, '') + '-桌面.html';
writeFileSync(join(SRC, deskName), render('desktop'), 'utf8');

const refs = [...mobile.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1]);
const dead = refs.filter((r) => !existsSync(join(SRC, decodeURIComponent(r))));
const clean = dead.length === 0;
console.log('墙 ' + OUT + '：' + rows.length + ' 格；链接 ' + refs.length + ' 条；'
  + (clean ? '缺失 0 -> ' + OUT + ' 可发（桌面墙同出：' + deskName + '）' : '缺 ' + dead.length + ' 件 -> ' + dead.join('、')));
process.exit(clean ? 0 : 1);
