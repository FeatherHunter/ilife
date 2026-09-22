#!/usr/bin/env node
/** #835 · 终审复核器「计算样式面」（零第三方依赖：headless Chrome ＋ CDP）。
 *
 * 为什么要它：票面第 4 步写死「**模型是提示器不是证据**」—— VLM 的每条结论都要能用
 * DOM／CSS 读数或 `文件:行` 复核，复核不了的写「未证」，模型误读的逐条剔除并写明。
 * 本件就是那把「DOM／CSS 读数」的尺：把逐页两个档宽下**只有算出来的样式才知道**的读数
 * 落成 JSON，供人核档逐条引用。
 *
 * 量什么（每一档）：
 *   ① 横向溢出：`documentElement.scrollWidth − innerWidth`（H5 入口）
 *   ② 版心与左半边：`main`/`body` 里最宽块的 `clientWidth` 与右边界「到视口右缘的余量」
 *      —— 用来复核「桌面档内容只占左半列」这类**肉眼结论**（VLM 最爱报、也最容易报错的一条）
 *   ③ 触摸目标：全部可点元素的 `getBoundingClientRect()`，标出 < 44px 的（H6 入口）
 *   ④ 正文最小字号与字号阶梯（D5 字腿）
 *   ⑤ 一屏可见文字：渲染后 DOM 的可见文本（剔 `display:none`）—— 用来复核「屏上写着什么」
 *
 * 用法（仓根）：
 *   node docs/skills/skill-memo-ilife/t835-计算样式面.mjs --pages <页群目录> --json <落点>
 * 读数：末行 `RESULT:`；逐页逐档一行。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PAGES = resolve(argOf('--pages', 'packages/skill-memo-ilife/.scratch/t834/源'));
const JSONOUT = resolve(argOf('--json', 'packages/skill-memo-ilife/.scratch/t835-读数/计算样式面.json'));
const WIDTHS = argOf('--widths', '390,1280').split(',').map(Number);

const BROWSER = [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined) { console.error('ABORT: no browser'); process.exit(2); }
if (!existsSync(PAGES)) { console.error('页群目录不存在：' + PAGES); process.exit(2); }

const pages = readdirSync(PAGES).filter((f) => f.endsWith('.html')).sort();
if (pages.length === 0) { console.error('页群目录里没有 .html'); process.exit(2); }

/** 页内探针：一档一次，把上面五类读数一次算完（`returnByValue`）。 */
const PROBE = `(function(){
  var W = window.innerWidth;
  var de = document.documentElement;
  var out = { width: W, scrollWidth: de.scrollWidth, scrollHeight: de.scrollHeight,
              overflowPx: de.scrollWidth - W };
  // ② 版心：把 body 里最宽的可视块找出来（带 class 便于回查）
  var best = null;
  var all = document.querySelectorAll('body *');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') continue;
    var st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') continue;
    var r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (best === null || r.width > best.w) best = { w: r.width, left: r.left, right: r.right, h: r.height,
      tag: el.tagName, cls: String(el.className || '').slice(0, 80) };
  }
  out.widest = best;
  out.rightGapPx = best === null ? null : Math.round(W - best.right);
  out.leftGapPx = best === null ? null : Math.round(best.left);
  out.viewportUsedPct = best === null ? null : +(best.w / W * 100).toFixed(1);
  // ③ 触摸目标：全部可点元素
  var tappable = document.querySelectorAll('a[href],button,input,select,textarea,label[for],[role="button"],[tabindex]:not([tabindex="-1"])');
  var small = [];
  var sizes = [];
  var hidden = [];
  for (var j = 0; j < tappable.length; j++) {
    var t = tappable[j];
    var st2 = getComputedStyle(t);
    if (st2.display === 'none' || st2.visibility === 'hidden') continue;
    var rr = t.getBoundingClientRect();
    if (rr.width < 1 || rr.height < 1) continue;
    /* 只读屏标签（sr-only，1×1 视觉隐藏）不是触摸目标：单列报出、不进 <44 判据（同 fmt.json 的口径）。 */
    var clipped = st2.clip !== 'auto' || st2.clipPath !== 'none' || st2.position === 'absolute' && rr.width <= 2 && rr.height <= 2;
    if (clipped) { hidden.push({ tag: t.tagName, cls: String(t.className || '').slice(0, 60),
      text: String(t.textContent || '').trim().slice(0, 24), w: Math.round(rr.width), h: Math.round(rr.height) }); continue; }
    var w = Math.round(rr.width), h = Math.round(rr.height);
    sizes.push({ tag: t.tagName, cls: String(t.className || '').slice(0, 60),
      text: String(t.textContent || '').trim().slice(0, 24), w: w, h: h });
    if (w < 44 || h < 44) small.push({ tag: t.tagName, cls: String(t.className || '').slice(0, 60),
      text: String(t.textContent || '').trim().slice(0, 24), w: w, h: h });
  }
  out.tapTotal = sizes.length;
  out.tapSmallCount = small.length;
  out.tapSmall = small.slice(0, 40);
  out.srOnlyCount = hidden.length;
  // ④ 字号阶梯：正文（p/li/td/span 里非空文本）的最小字号
  var fonts = {};
  var minFont = null, minFontWhere = null;
  var txtEls = document.querySelectorAll('body p,body li,body td,body span,body div,body dd,body dt,body h1,body h2,body h3,body h4');
  for (var k = 0; k < txtEls.length; k++) {
    var e3 = txtEls[k];
    var direct = Array.prototype.some.call(e3.childNodes, function(n){ return n.nodeType === 3 && n.textContent.trim() !== ''; });
    if (!direct) continue;
    var st3 = getComputedStyle(e3);
    if (st3.display === 'none' || st3.visibility === 'hidden') continue;
    if (e3.closest('svg')) continue;
    var fs = Math.round(parseFloat(st3.fontSize) * 10) / 10;
    fonts[fs] = (fonts[fs] || 0) + 1;
    if (minFont === null || fs < minFont) { minFont = fs; minFontWhere = { tag: e3.tagName, cls: String(e3.className || '').slice(0, 60), text: String(e3.textContent || '').trim().slice(0, 24) }; }
  }
  out.minFontPxNoSvg = minFont;
  out.minFontWhere = minFontWhere;
  out.fontSteps = Object.keys(fonts).map(Number).sort(function(a,b){return a-b;});
  // ⑤ 一屏可见文字：渲染后、剔 display:none
  var texts = [];
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function(n) {
      if (n.textContent.trim() === '') return NodeFilter.FILTER_REJECT;
      var p = n.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest('script,style,noscript,svg')) return NodeFilter.FILTER_REJECT;
      if (p.closest('[style*="display:none"],[style*="display: none"]')) return NodeFilter.FILTER_REJECT;
      var s4 = getComputedStyle(p);
      if (s4.display === 'none' || s4.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  var node;
  while ((node = walker.nextNode())) { var t2 = node.textContent.replace(/\\s+/g, ' ').trim(); if (t2 !== '') texts.push(t2); }
  out.visibleText = texts;
  out.visibleTextJoined = texts.join(' ｜ ');
  return out;
})()`;

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const PORT = 9701 + (process.pid % 280);
const profile = mkdtempSync(join(tmpdir(), 't835-css-profile-'));
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--force-device-scale-factor=1',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });

async function devtoolsUrl() {
  for (let waited = 0; waited < 30000; waited += 250) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch { /* not ready */ }
    await sleep(250);
  }
  return null;
}
function connect(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve: res, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else res(msg.result);
    }
  });
  const ready = new Promise((res, reject) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => reject(new Error('CDP ws failed')));
  });
  return {
    ready,
    send(method, params, sessionId) {
      const id = nextId++;
      return new Promise((res, reject) => {
        pending.set(id, { resolve: res, reject });
        ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
      });
    },
    close() { ws.close(); },
  };
}

const devUrl = await devtoolsUrl();
if (devUrl === null) { chrome.kill(); console.error('ABORT: CDP not ready'); process.exit(2); }
const cdp = connect(devUrl);
await cdp.ready;
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => cdp.send(m, p, sessionId);
await s('Page.enable');
await s('Runtime.enable');

const out = { at: new Date().toISOString(), pages: PAGES, widths: WIDTHS, rows: [] };
for (const file of pages) {
  const stem = file.replace(/\.html$/, '');
  const row = { file, stem, byWidth: {} };
  for (const width of WIDTHS) {
    await s('Emulation.setDeviceMetricsOverride', { width, height: width <= 640 ? 844 : 900, deviceScaleFactor: 1, mobile: width <= 640 });
    await s('Page.navigate', { url: pathToFileURL(join(PAGES, file)).href });
    await sleep(1100);
    const r = await s('Runtime.evaluate', { returnByValue: true, expression: PROBE });
    const v = r.result.value;
    row.byWidth[String(width)] = v;
    console.log(`CSS ${stem} 【${width}】溢出=${v.overflowPx}px 版心占比=${v.viewportUsedPct}% 右余=${v.rightGapPx}px 最宽=${v.widest ? v.widest.tag + '.' + v.widest.cls : '—'} 触摸<44=${v.tapSmallCount}/${v.tapTotal} 最小字号=${v.minFontPxNoSvg}`);
  }
  out.rows.push(row);
}

mkdirSync(dirname(JSONOUT), { recursive: true });
writeFileSync(JSONOUT, JSON.stringify(out, null, 1), 'utf8');
cdp.close();
chrome.kill();
console.log(`RESULT: ${out.rows.length} 页 × ${WIDTHS.length} 档计算样式面读数落 ${JSONOUT}`);
process.exit(0);
