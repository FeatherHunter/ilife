#!/usr/bin/env node
/**
 * 票 #1241 · 手册像素对照台（冻结原型 ↔ 实装渲染）。
 *
 * 用法：node docs/plugins/plugin-manager/t1241-像素对照.mjs --root <工作树根> [--out <目录>]
 * 默认 --root .worktrees/integ、--out .scratch/t1241/wall。
 *
 * 出六张自足页（无外链、无网络）：
 *   proto-0/1/2.html  冻结原型逐字复制 ＋「自动开书／跳跨页／停动画」前奏（前奏外零改动，脚本自证）
 *   impl-0/1/2.html   实装渲染：真产物 dist/client.js ＋ 联调台页脚本（只把 go 从「只认 2」放宽成读数字）
 * 用法：把两边同一跨页的截图裁剪到书页区后逐像素比（vision_crop ＋ vision_pixel_diff）。
 * 窗口宽 700 时两边纸面宽本就同档：原型 --paper-w=min(1080, 100vw-40-2.25em)=624，弹框 width=min(620, 100vw-40)=620。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const root = resolve(arg('--root', '.worktrees/integ'));
const out = resolve(arg('--out', '.scratch/t1241/wall'));
const PROTO_REL = 'docs/plugins/plugin-manager/proto-manual-4scenes.html';
const PAGEJS_REL = 'packages/plugin-manager/scripts/manual-1195-page.js';
const CLIENT_REL = 'packages/plugin-manager/dist/client.js';

const MARK_BEGIN = '<!-- t1241-prelude -->';
const MARK_END = '<!-- /t1241-prelude -->';
/** 停动画：只把「进场／开书动画」定格到终态（终态与不停动画的稳态像素一致）。 */
const FREEZE_CSS = '<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>';
const PRELUDE = (jump) => MARK_BEGIN + FREEZE_CSS
  + '<script>window.addEventListener("load",function(){openBook();'
  + 'var j=' + jump + ';var el=document.querySelector("#pl [data-jump=\\""+j+"\\"]")||document.querySelector("#pr [data-jump=\\""+j+"\\"]");if(el)el.click();'
  + '});</scr' + 'ipt>' + MARK_END;

const proto = readFileSync(join(root, PROTO_REL), 'utf8');
const pageJsRaw = readFileSync(join(root, PAGEJS_REL), 'utf8');
const bundle = Buffer.from(readFileSync(join(root, CLIENT_REL), 'utf8'), 'utf8').toString('base64');

mkdirSync(out, { recursive: true });
const manifest = [];

/* ---- 原型侧：逐字复制 + 前奏 ---- */
const jumps = [0, 3, 5]; // 跨页 0＝首页；跨页 1＝第 3 页目录行；跨页 2＝第 5 页（合页）目录行
jumps.forEach((jump, i) => {
  const at = proto.lastIndexOf('</body>');
  if (at < 0) throw new Error('原型里找不到 </body>');
  const withPrelude = proto.slice(0, at) + PRELUDE(jump) + proto.slice(at);
  const file = join(out, 'proto-' + i + '.html');
  writeFileSync(file, withPrelude, 'utf8');
  // 自证：剥掉前奏后与冻结原型逐字一致
  const stripped = withPrelude.replace(new RegExp(MARK_BEGIN + '[\\s\\S]*?' + MARK_END), '');
  const same = stripped === proto;
  manifest.push('proto-' + i + '.html jump=' + jump + ' 逐字复制=' + same
    + ' sha256=' + createHash('sha256').update(withPrelude, 'utf8').digest('hex').slice(0, 12) + '…');
  if (!same) throw new Error('proto-' + i + '：剥前奏后与冻结原型不一致');
});

/* ---- 实装侧：真产物 + 联调台页脚本 ---- */
const pageJs = pageJsRaw
  .split('__BUNDLE_B64__').join(bundle)
  .split("var q = String(window.location.search || '');")
  .join("var q = String(window.__Q1195 || window.location.search || '');")
  .split("var go = q.indexOf('go=2') >= 0 ? 2 : (q.indexOf('shot=1') >= 0 ? 0 : -1);")
  .join("var goM = /go=(\\d+)/.exec(q); var go = goM ? parseInt(goM[1], 10) : (q.indexOf('shot=1') >= 0 ? 0 : -1);");
if (!pageJs.includes('window.__Q1195') || !pageJs.includes('goM')) throw new Error('联调台页脚本改写失败（脚本已变，先核对再改）');
[0, 1, 2].forEach((i) => {
  const html = '<!doctype html><html><head><meta charset=utf8>'
    + '<style>body{background:#15130f;padding:20px;margin:0}#panel{max-width:720px;margin:0 auto}#readout{display:none}</style>'
    + '</head><body><div id=panel></div><div id=readout></div>'
    + '<scr' + 'ipt>window.__Q1195="?shot=1&go=' + i + '";</scr' + 'ipt>'
    + '<scr' + 'ipt>' + pageJs + '</scr' + 'ipt></body></html>';
  const file = join(out, 'impl-' + i + '.html');
  writeFileSync(file, html, 'utf8');
  manifest.push('impl-' + i + '.html go=' + i + ' bytes=' + html.length
    + ' sha256=' + createHash('sha256').update(html, 'utf8').digest('hex').slice(0, 12) + '…');
});

console.log('M1241-PIXEL-OUT=' + out);
manifest.forEach((line) => console.log('  ' + line));
const missing = ['proto-0.html', 'proto-1.html', 'proto-2.html', 'impl-0.html', 'impl-1.html', 'impl-2.html']
  .filter((f) => !existsSync(join(out, f)));
console.log('RESULT: ' + (missing.length === 0 ? 'PASS 6/6' : 'FAIL 缺 ' + missing.join('、')));

/* ---- 量尺：同一跨页两边的基准字号／页宽／徽记伪元素（机器读数，不靠肉眼） ---- */
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROBE = '<scr' + 'ipt>window.addEventListener("load",function(){'
  + 'var o={vw:window.innerWidth};'
  + 'function q(s){return document.querySelector(s);}'
  + 'function px(el){return el?Math.round(el.getBoundingClientRect().width):null;}'
  + 'function fs(el,pseudo){return el?getComputedStyle(el,pseudo||null).fontSize:null;}'
  + 'var pg=q(".pg");o.pgFont=fs(pg);o.pgW=px(pg);o.h2Font=fs(q(".pg h2"));o.liFont=fs(q(".pg .ol li"));'
  + 'o.paperW=px(q(".paper"));o.frameW=px(q("[data-ilife-manual=page-frame]"));o.dlgW=px(q("[role=dialog]"));'
  + 'var b=q(".dbadge");o.badges=document.querySelectorAll(".dbadge").length;'
  + 'if(b){var cs=getComputedStyle(b,"::before");o.badgeBefore=String(cs.content)+"|"+cs.width+"|"+(cs.backgroundImage||"").slice(0,20);}else{o.badgeBefore="无 .dbadge";}'
  + 'var li=q(".pg .ol li");o.liLines=li?Math.round(li.getBoundingClientRect().height/parseFloat(getComputedStyle(li).lineHeight||"1")):null;'
  + 'var d=document.createElement("div");d.id="metrics1241";d.textContent=JSON.stringify(o);document.body.appendChild(d);'
  + '});</scr' + 'ipt>';
if (existsSync(CHROME)) {
  const { execFileSync } = await import('node:child_process');
  const probe = (name) => {
    const src = readFileSync(join(out, name + '.html'), 'utf8');
    const at = src.lastIndexOf('</body>');
    const file = join(out, 'probe-' + name + '.html');
    writeFileSync(file, src.slice(0, at) + PROBE + src.slice(at), 'utf8');
    const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--virtual-time-budget=2000', '--dump-dom', 'file:///' + file.split('\\').join('/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const m = dom.match(/<div id="metrics1241">([^<]*)<\/div>/);
    return m ? m[1].replace(/&quot;/g, '"') : 'no-metrics';
  };
  for (const name of ['proto-1', 'impl-1']) console.log('M1241-METRICS ' + name + ' ' + probe(name));
} else {
  console.log('M1241-METRICS 跳过：找不到 Chrome（' + CHROME + '）');
}

/* ---- 对照页：把同一跨页的两张截图并排（人看用；截图由外部工具按同视口出，落在 --out 下） ---- */
const shots = [0, 1, 2].map((i) => ({ i, left: join(out, 'shot-proto-' + i + '.png'), right: join(out, 'shot-impl-' + i + '.png') }));
for (const s of shots) {
  if (!existsSync(s.left) || !existsSync(s.right)) continue;
  const cell = (file, title, sub) => '  <figure><figcaption><b>' + title + '</b><span>' + sub + '</span></figcaption>'
    + '<img src="' + file.split('\\').pop() + '" alt="' + title + '"></figure>';
  const page = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>票 #1241 像素对照 · 跨页 ' + s.i + '</title>'
    + '<style>body{margin:0;padding:16px;background:#f5f5f7;font-family:system-ui,"Microsoft YaHei",sans-serif}'
    + 'h1{font-size:16px;margin:0 0 4px}.sub{color:#6e6e73;font-size:12.5px;margin-bottom:12px}'
    + '.row{display:flex;gap:16px;align-items:flex-start}figure{margin:0;background:#fff;border:1px solid #d2d2d7;border-radius:10px;overflow:hidden}'
    + 'figcaption{display:flex;gap:8px;align-items:baseline;padding:6px 10px;border-bottom:1px solid #e8e8ed;font-size:12.5px}'
    + 'figcaption span{color:#86868b}img{display:block;width:700px}</style></head><body>'
    + '<h1>票 #1241 像素对照 · 跨页 ' + s.i + '（视口 700×1000）</h1>'
    + '<div class="sub">左＝甲入口四场景冻结原型（proto-manual-4scenes.html，逐字复制＋只加「自动开书／跳跨页／停动画」前奏）；右＝实装渲染（真产物 dist/client.js 经联调台挂载）。</div>'
    + '<div class="row">' + cell(s.left, '冻结原型', 'proto-' + s.i + '.html') + cell(s.right, '实装渲染', 'impl-' + s.i + '.html') + '</div>'
    + '</body></html>';
  writeFileSync(join(out, 'compare-' + s.i + '.html'), page, 'utf8');
  console.log('M1241-COMPARE=compare-' + s.i + '.html');
}
process.exit(missing.length === 0 ? 0 : 1);
