#!/usr/bin/env node
/** #1079 · SAY 采集 16 页「判地 ／ 真跑产物」左右对照墙生成器（入仓，随票走）。
 *
 * 出什么：**两档墙**——手机档 `wall.html`（宽度缺省 390）× 桌面档 `wall-1280.html`（宽度 1280），
 *   每档 16 格；每格左＝判地原型（proto/say-collect/*-v2.3.html）、右＝当刻真跑产物，同一视口宽度并排嵌 iframe。
 *   **每格带打勾区**：满意／不满意（原因必填）＋ 工具条「导出清单JSON／复制」，导出形状
 *   `{wall,total,ok,no,unjudged,items:[…]}`（与 #1074／1075／1076／1077 四面墙同形，供负责人一次人眼终验）。
 *   它**不下机器判据**：像素判据只走 vision_html_screenshot ＋ vision_pixel_diff，读数是另外两件。
 *
 * 用法（仓根）：
 *   node docs/skills/skill-bill/1079-say-验收墙.mjs [--out <墙.html>] [--products <产物目录>] [--width 390] [--mutate-drop <seq>]
 * 缺省：产物目录 .scratch/1079-say/out、手机墙 .scratch/1079-say/wall.html、桌面墙 .scratch/1079-say/wall-1280.html。
 * `--mutate-drop <seq>`：只给自检演示用——把导出清单里那一格抽掉（**格子照旧在**），自检必红并点名；不带即为正例。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SAMPLES = join(ROOT, 'docs/skills/skill-bill/1079-say-样本集.json');

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const OUT = resolve(ROOT, argOf('--out', '.scratch/1079-say/wall.html'));
const OUT1280 = OUT.replace(/\.html$/i, '') + '-1280.html';
const PRODUCTS = resolve(ROOT, argOf('--products', '.scratch/1079-say/out'));
const WIDTH = Number(argOf('--width', '390'));
const WIDTH1280 = Number(argOf('--width-1280', '1280'));
const DROP = argOf('--mutate-drop', '');

const samples = JSON.parse(readFileSync(SAMPLES, 'utf8'));
const rel = (from, to) => relative(dirname(from), to).split(String.fromCharCode(92)).join('/');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let missing = 0;

/** 每格一行：序号／唤醒词／两侧路径（**格数只由样本集决定，本生成器不改格数**）。 */
const ROWS = samples.items.map((it) => {
  const product = join(PRODUCTS, it.wake + '.html');
  const ok = existsSync(product);
  if (!ok) missing += 1;
  return { seq: it.seq, wake: it.wake, proto: join(ROOT, it.proto), product, ok };
});
/** 导出清单的来源（正例＝与格子一一对应；`--mutate-drop` 只演示「导出少放一格」这一种坏法）。 */
const EXPORT_ROWS = DROP === '' ? ROWS : ROWS.filter((r) => String(r.seq) !== DROP);

const CSS = [
  'body{margin:0;background:#efe9dd;font:14px/1.5 "Microsoft YaHei",system-ui;color:#2b2620}',
  'header{padding:18px 22px;background:#fffdf7;border-bottom:1px solid #e9dfcd;position:sticky;top:0;z-index:9}',
  'h1{margin:0 0 6px;font-size:18px}p{margin:0;color:#665f57}',
  '.okbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 22px;background:#fff;border-bottom:1px solid #e9dfcd;font-size:12.5px}',
  '.okbar .cnt{font-weight:700;font-variant-numeric:tabular-nums}',
  '.okbar button{font:inherit;font-size:12px;background:#fff;border:1px solid #1d1d1f;border-radius:8px;padding:4px 10px;cursor:pointer}',
  '.okbar .msg{color:#665f57;font-size:12px}',
  '.cell{padding:16px 22px 6px;border-left:4px solid transparent}',
  '.cell.done{border-left-color:#1e784c}.cell.bad{border-left-color:#b42318}',
  'h3{margin:0 0 8px;font-size:15px}',
  '.verdict{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px;font-size:12.5px}',
  '.verdict a{color:#b4552d}',
  '.okbtn,.nobtn{font:inherit;font-size:12px;border-radius:8px;padding:3px 10px;cursor:pointer;background:#fff;white-space:nowrap}',
  '.okbtn{border:1px solid #1d1d1f}.okbtn.on{background:#1d1d1f;color:#fff}',
  '.nobtn{border:1px solid #b42318;color:#b42318}.nobtn.on{background:#b42318;color:#fff}',
  '.pair{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}',
  'figure{margin:0;background:#fff;border:1px solid #e9dfcd;border-radius:14px;overflow:hidden}',
  'figcaption{padding:6px 10px;font-size:12px;color:#665f57;border-bottom:1px solid #e9dfcd}',
  'iframe{display:block;border:0;background:#fff}',
  '.noveil{position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}',
  '.nobox{background:#fff;border-radius:12px;padding:14px 16px;max-width:420px;width:100%;font-size:13px}',
  '.nobox .t{font-weight:700;margin-bottom:6px}.nobox .hint{color:#665f57;font-size:12px;margin-bottom:8px}',
  '.nobox input{width:100%;font:inherit;font-size:13px;border:1px solid #1d1d1f;border-radius:8px;padding:6px 8px;margin-bottom:8px;box-sizing:border-box}',
  '.nobox .err{color:#b42318;font-size:12px;min-height:18px;margin-bottom:6px}',
  '.nobox .row{display:flex;gap:8px;justify-content:flex-end}',
  '.nobox .row button{font:inherit;font-size:12px;background:#fff;border:1px solid #1d1d1f;border-radius:8px;padding:4px 12px;cursor:pointer}',
  '.nobox .row button.primary{background:#1d1d1f;color:#fff}',
].join('');

function cellOf(r, width, outFile) {
  return '<section class="cell" data-seq="' + r.seq + '">'
    + '<h3>' + esc(r.seq) + ' ' + esc(r.wake) + (r.ok ? '' : '  <b>（产物缺失）</b>') + '</h3>'
    + '<div class="verdict">'
    + '<a href="' + esc(rel(outFile, r.proto)) + '" target="_blank" rel="noopener">判地原型整页</a>'
    + '<a href="' + esc(rel(outFile, r.product)) + '" target="_blank" rel="noopener">真跑产物整页</a>'
    + '<button type="button" class="okbtn" data-seq="' + r.seq + '" data-wake="' + esc(r.wake) + '" data-prod="' + esc(rel(outFile, r.product)) + '" data-proto="' + esc(rel(outFile, r.proto)) + '" aria-pressed="false">满意</button>'
    + '<button type="button" class="nobtn" data-seq="' + r.seq + '" data-wake="' + esc(r.wake) + '" data-prod="' + esc(rel(outFile, r.product)) + '" data-proto="' + esc(rel(outFile, r.proto)) + '" aria-pressed="false">不满意</button>'
    + '</div>'
    + '<div class="pair">'
    + '<figure><figcaption>判地原型 v2.3</figcaption><iframe src="' + esc(rel(outFile, r.proto)) + '" width="' + width + '" height="1180" title="' + esc(r.wake + ' 判地原型') + '"></iframe></figure>'
    + '<figure><figcaption>真跑产物</figcaption><iframe src="' + esc(rel(outFile, r.product)) + '" width="' + width + '" height="1180" title="' + esc(r.wake + ' 真跑产物') + '"></iframe></figure>'
    + '</div></section>';
}

function bar(wallName) {
  const n = ROWS.length;
  return '<div class="okbar" id="okbar"><span class="cnt" id="okcnt">满意 0 / 不满意 0 / 未判 ' + n + ' / 总数 ' + n + '</span>'
    + '<button type="button" id="okexp">导出清单JSON</button><button type="button" id="okcopy">复制</button>'
    + '<span class="msg" id="okmsg"></span></div>';
}

function script(wallName) {
  const lines = [
    '<' + 'script>',
    '(function(){',
    'var WALL=' + JSON.stringify(wallName) + ';',
    'var EXPORTS=' + JSON.stringify(EXPORT_ROWS.map((r) => r.seq)) + ';',
    'function KEY(s){return "cmp1079-ok:"+WALL+":"+s;}',
    'function NOKEY(s){return "cmp1079-ok:"+WALL+":"+s+":no";}',
    'var MEM={};',
    'function get(k){try{var v=localStorage.getItem(k);return v===null?(MEM[k]||null):v;}catch(e){return MEM[k]||null;}}',
    'function set(k,v){try{localStorage.setItem(k,v);MEM[k]=v;}catch(e){MEM[k]=v;}}',
    'function del(k){try{localStorage.removeItem(k);}catch(e){}delete MEM[k];}',
    'function sel(c,s){return "."+c+String.fromCharCode(91)+"data-seq="+String.fromCharCode(34)+s+String.fromCharCode(34,93);}',
    'var okBtns=[].slice.call(document.querySelectorAll(".okbtn"));',
    'var noBtns=[].slice.call(document.querySelectorAll(".nobtn"));',
    'function seqOf(b){return b.getAttribute("data-seq");}',
    'function bySeq(s){return {ok:document.querySelector(sel("okbtn",s)),no:document.querySelector(sel("nobtn",s))};}',
    'function rowOf(b){return b.closest("section");}',
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
    'function meta(seq){var b=document.querySelector(sel("okbtn",seq));return {wall:WALL,seq:String(seq),wake:b.getAttribute("data-wake"),prod:b.getAttribute("data-prod"),proto:b.getAttribute("data-proto")};}',
    'function list(){var seen={},out=[];okBtns.forEach(function(b){var s=seqOf(b);if(seen[s])return;seen[s]=1;if(EXPORTS.indexOf(String(s))<0)return;var m=meta(s);',
    '  if(isOk(s)){m.verdict="ok";m.reason="";}else if(isNo(s)){m.verdict="no";m.reason=getReason(s);}else{m.verdict="";m.reason="";}out.push(m);});',
    '  return out.sort(function(a,b){return a.seq-b.seq;});}',
    'function payload(){var it=list(),ok=it.filter(function(x){return x.verdict==="ok";}).length,no=it.filter(function(x){return x.verdict==="no";}).length;',
    '  return JSON.stringify({wall:WALL,total:it.length,ok:ok,no:no,unjudged:it.length-ok-no,items:it},null,2);}',
    'okBtns.forEach(function(b){b.addEventListener("click",function(){var s=seqOf(b),on=!isOk(s);if(on){set(KEY(s),"1");del(NOKEY(s));}else{del(KEY(s));}paint(s);count();});});',
    'var veil=null;',
    'function closeNo(){if(veil&&veil.parentNode)veil.parentNode.removeChild(veil);veil=null;}',
    'function openNo(seq){var cur=getReason(seq),b=document.querySelector(sel("okbtn",seq));closeNo();',
    '  veil=document.createElement("div");veil.className="noveil";',
    '  veil.innerHTML="<div class=\'nobox\' role=\'dialog\'><div class=\'t\'>不满意 · "+((b?b.getAttribute("data-wake"):"")+"（seq"+seq+"）")+"</div><div class=\'hint\'>哪一格、什么症状（必填；例：390 下复制按钮没居中／缺口段字体不对／选填组折行）</div><input type=\'text\' maxlength=\'200\' placeholder=\'哪一格 + 什么症状（必填）\'><div class=\'err\'></div><div class=\'row\'><button type=\'button\' class=\'cancel\'>取消</button><button type=\'button\' class=\'primary confirm\'>确认</button></div></div>";',
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
  return lines.join(String.fromCharCode(10));
}

function render(width, outFile, suffix) {
  const wallName = '#1079-say-16' + suffix;
  const cells = ROWS.map((r) => cellOf(r, width, outFile)).join(String.fromCharCode(10));
  return '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">' + String.fromCharCode(10)
    + '<title>#1079 · SAY 采集 16 页：判地 ／ 产物 左右对照</title><style>' + CSS + '</style></head>' + String.fromCharCode(10)
    + '<body>' + String.fromCharCode(10)
    + '<header><h1>#1079 · SAY 采集 16 页：判地原型 ／ 真跑产物</h1>'
    + '<p>左＝判地原型（proto/say-collect/*-v2.3.html），右＝当刻 CLI 真跑产物，同一视口宽度 ' + width + '。'
    + '两栏看起来一样＝还原到位；哪一栏不一样就是还没收敛的地方（机器判据另跑，见本票证据件）。'
    + '每格「满意／不满意（原因必填）」，工具条可导出 JSON 作为逐格结论原文。</p></header>' + String.fromCharCode(10)
    + bar(wallName) + String.fromCharCode(10) + cells + String.fromCharCode(10) + script(wallName) + '</body></html>' + String.fromCharCode(10);
}

/** 墙面自检（**改坏必红**）：lazy 恒 0（下半墙空白）＋ 格数／iframe 数／产物在位 ＋ **打勾区与导出逐格对齐**。
 *  `--mutate-drop <seq>` 把导出清单里那一格抽掉 ⇒ 本自检当场红、点名该格。 */
function audit(html, wallName, cellsHtml) {
  const red = [];
  const lazyCount = html.split('loading="lazy"').length - 1;
  const cellSeqs = (cellsHtml.match(/<section class="cell" data-seq="[^"]+"/g) || []).map((s) => s.replace(/^.*data-seq="/, '').replace(/"$/, ''));
  const okSeqs = (html.match(/class="okbtn" data-seq="[^"]+"/g) || []).map((s) => s.replace(/^.*data-seq="/, '').replace(/"$/, ''));
  const noSeqs = (html.match(/class="nobtn" data-seq="[^"]+"/g) || []).map((s) => s.replace(/^.*data-seq="/, '').replace(/"$/, ''));
  const iframeCount = (html.match(/<iframe/g) || []).length;
  const wantCells = ROWS.length;
  const exportSeqs = EXPORT_ROWS.map((r) => String(r.seq));
  const cellSeqsUniq = [...new Set(cellSeqs)];
  if (lazyCount !== 0) red.push('墙面出现 loading="lazy" ' + lazyCount + ' 处（下半墙会空白）');
  if (cellSeqsUniq.length !== wantCells) red.push('格数 ' + cellSeqsUniq.length + ' != ' + wantCells);
  if (iframeCount !== wantCells * 2) red.push('iframe 数 ' + iframeCount + ' != ' + wantCells * 2);
  if (okSeqs.length !== wantCells) red.push('满意钮 .okbtn 数 ' + okSeqs.length + ' != ' + wantCells);
  if (noSeqs.length !== wantCells) red.push('不满意钮 .nobtn 数 ' + noSeqs.length + ' != ' + wantCells);
  for (const s of cellSeqsUniq) {
    if (!okSeqs.includes(s)) red.push('第 ' + s + ' 格缺满意钮');
    if (!noSeqs.includes(s)) red.push('第 ' + s + ' 格缺不满意钮');
  }
  if (!/id="okexp"/.test(html)) red.push('工具条缺 #okexp（导出清单JSON）');
  if (!/id="okcnt"/.test(html)) red.push('工具条缺 #okcnt（计数）');
  if (exportSeqs.length !== wantCells) red.push('导出清单 ' + exportSeqs.length + ' 项 != 格数 ' + wantCells + '（点名：' + cellSeqsUniq.filter((s) => !exportSeqs.includes(s)).map((s) => 'seq ' + s).join('、') + '）');
  if (missing !== 0) red.push('产物缺失 ' + missing + ' 件');
  return red;
}

mkdirSync(dirname(OUT), { recursive: true });
const mobile = render(WIDTH, OUT, '');
const desktop = render(WIDTH1280, OUT1280, '-桌面');
writeFileSync(OUT, mobile, 'utf8');
writeFileSync(OUT1280, desktop, 'utf8');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const redMobile = audit(mobile, '#1079-say-16', mobile);
const redDesk = audit(desktop, '#1079-say-16-桌面', desktop);
const red = redMobile.map((x) => '手机墙 ' + x).concat(redDesk.map((x) => '桌面墙 ' + x));
console.log('WALL: ' + OUT + '  sha256=' + sha(mobile));
console.log('WALL: ' + OUT1280 + '  sha256=' + sha(desktop));
console.log('RESULT: ' + (ROWS.length - missing) + '/' + ROWS.length + ' 格产物在位；lazy=0 格=' + ROWS.length
  + ' 打勾=' + ROWS.length + ' 导出项=' + EXPORT_ROWS.length + ' iframe=' + ROWS.length * 2 + '（每档）'
  + (DROP === '' ? '' : '（--mutate-drop ' + DROP + '）'));
if (red.length) {
  console.log('RED ' + OUT + '：' + red.join('；'));
  process.exit(1);
}
process.exit(0);
