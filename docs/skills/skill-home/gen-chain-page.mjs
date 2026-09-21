#!/usr/bin/env node
/** 居家管家链路总览页生成器（入仓件 · 无依赖 · 票 7）。
 *
 * 干什么：把「prompt → 唤醒词 → 命令 → HTML 绝对路径」这条链路铺成一张可点的总览页。
 * 每行：序｜域｜场景标题｜prompt｜唤醒词｜命令｜绝对产物路径。行内既印**绝对路径文本**，
 * 也把该文本做成 `file:///` **可点链接**，含「复制路径」按钮与 `<noscript>` 绝对路径兜底
 * （骨架照卡路里 `docs/skills/skill-calorie/t268-链路总览.build.mjs` 的卡片骨架重写为表格行，
 * 数据与文案不绑任何场景，全从清单读）。
 *
 * 用法：
 *   node gen-chain-page.mjs <产物目录> [输出名]
 *     node gen-chain-page.mjs . 链路总览.html
 *   缺省＝`.`／`链路总览.html`。清单固定为 `<产物目录>/manifest.json`（与墙生成器共用同一份，
 *   域与清单都来自参数，本件不写死任何域、任何场景、任何命令）。
 *   node gen-chain-page.mjs --manifest <清单路径> --out <输出路径>   显式路径写法
 *
 * 清单契约：与 `gen-scene-wall.mjs` 同一份 `manifest.json`。行级必填 `seq`／`wake`／`file`／
 * （`domain` 或 `kind`）；链路页另读 `title`（场景标题）／`prompt`（prompt）／`command`
 * （命令，`key`／`cli`／`cli_ran` 作同义备选）／`aliases`（别名附注数组，不占新行，
 * 只作宿主场景那一行的别名附注，口径见票 22「唤醒词层规格」④）／`bytes`（有即比对盘上大小，
 * 不等即红）。缺 `title`／`prompt`／`command` 的行照印「（清单未给）」，不 die——链路页是汇总页，
 * 不因一行缺文案就整批出不来；但缺必填（seq／wake／file／域）即 die(2)。
 *
 * 绝对路径的算法：`resolve(产物目录, file)` 现算，链接 `href` 由 `pathToFileURL(abs).href`
 * 现算——链接与数字同源，换机／换检出目录重跑即对上（卡路里 t268 把绝对路径存进清单，
 * 换机即全表死链，本件不存）。
 *
 * 自检（非 0 即红）：
 *   清单点名却没有文件 → exit 1 且点名那一行；`bytes` 对不上 → exit 1 且点名；
 *   成品含禁用串（`<link`／`@import`／`http://`／`https://`，自包含单文件要求）→ exit 1；
 *   表格行数 ≠ 清单行数 → exit 1；无脚本兜底路径数 ≠ 清单行数 → exit 1。
 *   正例打印「N 行；链接 M 条；缺失 0 -> 可发」exit 0。
 *
 * 清单字段若与 #183 已定的落点值冲突，当场补票，不在本脚本里私改（本件现状：无冲突——#183 定的是
 * HELP 文件的落点，场景页命名待票 2 契约，见说明文档）。
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const die = (code, msg) => { console.error(msg); process.exit(code); };
const num = (n) => Number(n).toLocaleString('en-US');

function parseArgs(argv) {
  let manifestPath = null, outPath = null;
  const mi = argv.indexOf('--manifest');
  if (mi >= 0) manifestPath = argv[mi + 1];
  const oi = argv.indexOf('--out');
  if (oi >= 0) outPath = argv[oi + 1];
  const positional = argv.filter((a) => !a.startsWith('-') && a !== manifestPath && a !== outPath);
  const dir = manifestPath ? dirname(resolve(manifestPath)) : resolve(positional[0] ?? '.');
  const mf = manifestPath ? resolve(manifestPath) : join(dir, 'manifest.json');
  const out = outPath ? resolve(outPath) : join(dir, positional[1] ?? '链路总览.html');
  return { dir, mf, out };
}

const { dir: DIR, mf: MANIFEST_PATH, out: OUT_PATH } = parseArgs(process.argv.slice(2));

if (!existsSync(MANIFEST_PATH)) die(2, `没有清单：${MANIFEST_PATH}（清单须入仓，别让链路页猜文件名）`);
let raw = readFileSync(MANIFEST_PATH, 'utf8');
if (raw.charCodeAt(0) === 0xfeff) {
  console.error('注意：清单带 BOM（仓规 §7：读出来会 Unexpected token）——本次已剥，请存不带签名的 UTF-8');
  raw = raw.replace(/^\uFEFF/, '');
}
const mf = JSON.parse(raw);
const rows = mf.rows;
if (!Array.isArray(rows) || rows.length === 0) die(2, `${MANIFEST_PATH} 的 rows 为空`);
for (const r of rows) {
  if (r.seq === undefined || !r.wake || !r.file || (!r.domain && !r.kind)) {
    die(2, `清单第 ${r.seq ?? '?'} 行缺字段（至少 seq／wake／file／domain 或 kind）：${JSON.stringify(r)}`);
  }
  if (r.aliases !== undefined && !Array.isArray(r.aliases)) {
    die(2, `清单第 ${r.seq} 行 aliases 不是数组（别名不占新行，只作附注）：${JSON.stringify(r.aliases)}`);
  }
}
const batch = typeof mf.batch === 'string' && mf.batch ? mf.batch : '居家管家';

/* ── 派生：绝对路径与字节现算（链接与数字同源） ── */
const cards = rows.map((r) => {
  const abs = resolve(DIR, r.file);
  if (!existsSync(abs)) die(1, `清单点名却没有文件：${r.seq} ${r.wake} -> ${r.file}`);
  let bytes = null;
  try { bytes = statSync(abs).size; } catch { bytes = null; }
  if (bytes === null) die(1, `清单点名却没有文件：${r.seq} ${r.wake} -> ${r.file}`);
  if (r.bytes !== undefined && r.bytes !== null && Number(r.bytes) !== bytes) {
    die(1, `字节对不上：${r.seq} ${r.wake} -> ${r.file}（清单 ${r.bytes} B，盘上 ${bytes} B）`);
  }
  return {
    seq: r.seq,
    domain: r.domain || r.kind,
    title: r.title || '（清单未给）',
    prompt: r.prompt || '（清单未给）',
    wake: r.wake,
    aliases: Array.isArray(r.aliases) ? r.aliases : [],
    command: r.command || r.key || r.cli || r.cli_ran || '（清单未给）',
    file: r.file,
    abs,
    href: pathToFileURL(abs).href,
    bytes,
  };
});
const maxBytes = Math.max(...cards.map((c) => c.bytes));

const CSS = `*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#f2f2f7;color:#1d1d1f;font:400 13.5px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:24px 16px 60px}
.hero{background:#fff;border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 4px 14px rgba(0,0,0,.05);padding:18px}
.eyebrow{font-size:11px;font-weight:800;letter-spacing:.06em;color:#007aff;line-height:1.4}
.hero h1{font-size:20px;font-weight:800;line-height:1.25;margin:6px 0}
.lead{font-size:13px;color:#6e6e73;margin:0 0 8px}
.kv{display:flex;gap:8px;align-items:baseline;padding:6px 0;border-top:1px solid #f0f0f3}
.kv .k{flex:0 0 68px;font-size:11px;font-weight:700;color:#86868b}
.kv .v{font-size:12.5px;min-width:0;overflow-wrap:anywhere}
.tools{position:sticky;top:0;z-index:40;background:rgba(242,242,247,.94);padding:8px 0;margin-top:12px}
.tools input{width:100%;min-height:44px;border:1px solid #d1d1d6;border-radius:10px;padding:11px 12px;font-size:13px;font-family:inherit;background:#fff;outline:none}
.tools input:focus{border-color:#007aff;box-shadow:0 0 0 3px rgba(0,122,255,.13)}
.count{font-size:11.5px;color:#86868b;margin-top:6px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.04),0 4px 14px rgba(0,0,0,.05);margin-top:12px}
thead th{font-size:11.5px;font-weight:800;color:#6e6e73;text-align:left;padding:10px 10px;border-bottom:1px solid #e8e8ed;white-space:nowrap;background:#fafafa}
tbody td{font-size:12.5px;padding:10px;vertical-align:top;border-bottom:1px solid #f0f0f3;overflow-wrap:anywhere}
tbody tr:last-child td{border-bottom:0}
td.seq{font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums}
td.cmd code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;background:#f5f5f7;border-radius:5px;padding:1px 5px;overflow-wrap:anywhere}
.alias{font-size:11.5px;color:#6e6e73;margin-top:4px}
.abs{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;overflow-wrap:anywhere}
.bytes{font-size:11px;color:#86868b;white-space:nowrap}
.btn{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;background:#fff;color:#007aff;border:1px solid #007aff;margin-top:6px}
.pabs{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#6e6e73;margin-top:8px;overflow-wrap:anywhere;user-select:all}
.bar{height:6px;border-radius:999px;background:#ececf1;overflow:hidden;margin-top:6px}
.bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#007aff,#0a63ce);min-width:2px}
.empty{background:#fff;border:1.5px dashed #d1d1d6;border-radius:12px;padding:22px 12px;text-align:center;color:#86868b;font-size:12.5px;margin-top:12px}
.empty.hide{display:none}
tr.hide{display:none}
.foot{font-size:11.5px;line-height:1.7;color:#86868b;margin-top:22px;border-top:1px solid #d1d1d6;padding-top:12px}
:focus-visible{outline:2px solid #007aff;outline-offset:2px}
@media(max-width:860px){
.wrap{padding:14px 12px 44px}
table,thead,tbody,tr,td{display:block}
thead{display:none}
tbody tr{border-bottom:2px solid #e8e8ed;padding:6px 4px}
tbody td{border-bottom:0;padding:4px 10px}
td.seq{font-size:13px}
}`;

const rowHtml = (c) => {
  const aliasLine = c.aliases.length
    ? `<div class="alias">别名：${esc(c.aliases.join('、'))}（不占新行）</div>`
    : '';
  const w = maxBytes > 0 ? Math.max(1.5, (c.bytes / maxBytes) * 100).toFixed(1) : '0';
  return `<tr data-s="${esc(String(c.seq + ' ' + c.wake + ' ' + c.prompt + ' ' + c.title).toLowerCase())}">
<td class="seq">${c.seq}</td>
<td>${esc(c.domain)}</td>
<td>${esc(c.title)}</td>
<td>${esc(c.prompt)}</td>
<td>${esc(c.wake)}${aliasLine}</td>
<td class="cmd"><code>${esc(c.command)}</code></td>
<td><a class="abs" href="${esc(c.href)}" title="打开产物页面">${esc(c.abs)}</a><div class="bytes">${num(c.bytes)} 字节</div><div class="bar" title="占本批最大那份的 ${w}%"><i style="width:${w}%"></i></div><button class="btn" type="button" data-copy="${esc(c.abs)}">复制路径</button><noscript><div class="pabs">${esc(c.abs)}</div></noscript></td>
</tr>`;
};

const JS = `(function(){
var rows=[].slice.call(document.querySelectorAll('tbody tr'));
var q=document.getElementById('q'),cnt=document.getElementById('cnt'),empty=document.getElementById('empty');
function apply(){
var s=(q&&q.value?q.value:'').trim().toLowerCase(),n=0;
rows.forEach(function(r){var show=!s||(r.getAttribute('data-s')||'').indexOf(s)>=0;r.classList.toggle('hide',!show);if(show)n++;});
if(cnt)cnt.textContent='显示 '+n+' 行（共 '+rows.length+' 行）';
if(empty)empty.classList.toggle('hide',n>0);
}
if(q)q.addEventListener('input',apply);
document.addEventListener('click',function(e){
var b=e.target&&e.target.closest?e.target.closest('[data-copy]'):null;if(!b)return;
var v=b.getAttribute('data-copy'),old=b.textContent;
function done(m){b.textContent=m;setTimeout(function(){b.textContent=old;},1600);}
function fb(){var a=document.createElement('textarea');a.value=v;a.setAttribute('readonly','');a.style.position='fixed';a.style.top='-1000px';document.body.appendChild(a);a.select();var ok=false;try{ok=document.execCommand('copy');}catch(err){ok=false;}document.body.removeChild(a);done(ok?'已复制路径':'请手动选中路径');}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(v).then(function(){done('已复制路径');},fb);}else{fb();}
});
})();`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>链路总览：${esc(batch)} ${rows.length} 条</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<header class="hero">
<div class="eyebrow">链路总览</div>
<h1>${esc(batch)}：${rows.length} 条唤醒词，${rows.length} 份产物</h1>
<p class="lead">一句人话怎么长成一份页面：prompt → 唤醒词 → 命令 → 产物 HTML。点绝对路径即跳转打开那一份产物。</p>
<div class="kv"><span class="k">范围</span><span class="v">${esc(batch)}，清单 <code>${esc(MANIFEST_PATH)}</code> 的 ${rows.length} 行各出一份产物页面</span></div>
<div class="kv"><span class="k">自包含</span><span class="v">本页零外部依赖，没有网络请求，也没有外链字体，双击就能看</span></div>
<div class="kv"><span class="k">绝对路径</span><span class="v">链接与字节都是生成当刻在盘上现算的（<code>resolve(产物目录, file)</code>），换机／换检出目录重跑即对上</span></div>
</header>
<div class="tools"><input id="q" type="search" placeholder="搜唤醒词、场景标题，或者搜你会说的那句话" aria-label="搜索链路"><div class="count" id="cnt" aria-live="polite">显示 ${rows.length} 行（共 ${rows.length} 行）</div><noscript><style>.tools input{display:none}</style><p class="count">脚本关掉了，搜索用不了，${rows.length} 行都平铺在下面。</p></noscript></div>
<table><thead><tr><th>序</th><th>域</th><th>场景标题</th><th>prompt</th><th>唤醒词</th><th>命令</th><th>绝对产物路径</th></tr></thead><tbody>${cards.map(rowHtml).join('')}</tbody></table>
<div class="empty hide" id="empty">没有匹配的行，换个词试试。</div>
<p class="foot">数字口径：字节数是生成当刻在盘上量出来的，不是从清单里抄的，所以和产物页始终对得上。别名不占新行，只作宿主场景那一行的附注（票 22 口径）。本页只讲结构与呈现。</p>
</div>
<script>${JS}</script>
</body>
</html>
`;

for (const bad of ['<link', '@import', 'http://', 'https://']) {
  if (html.includes(bad)) die(1, `生成结果里有禁用串：${bad}（自包含单文件要求）`);
}
const nRow = (html.match(/<tr data-s="/g) ?? []).length;
if (nRow !== rows.length) die(1, `生成结果不是 ${rows.length} 行：${nRow}`);
const nPath = (html.match(/<noscript><div class="pabs">/g) ?? []).length;
if (nPath !== rows.length) die(1, `无脚本兜底路径不是 ${rows.length} 条：${nPath}`);
const nHref = (html.match(/<a class="abs" href="file:/g) ?? []).length;
if (nHref !== rows.length) die(1, `file:/// 可点链接不是 ${rows.length} 条：${nHref}`);

writeFileSync(OUT_PATH, html, 'utf8');
console.log(`链路总览 ${OUT_PATH}：${rows.length} 行；链接 ${nHref} 条；缺失 0 -> 可发`);
console.log(`（字节当刻盘上，最小 ${num(Math.min(...cards.map((c) => c.bytes)))} 到最大 ${num(maxBytes)} 字节）`);
