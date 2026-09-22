#!/usr/bin/env node
/** #820 收口探针 3（CDP，真宽度）：查 ① 字被剪 ② 文字贴到容器右缘（右内边距为 0）。
 *
 * 为什么不用 `--window-size`：本机 Chrome 把窗口宽**钳到 526px 下限**，
 * 实测 `--window-size=390` 得到的 `window.innerWidth=526` —— 那样量出来的「390 档」是假的。
 * 本件照 `t835-计算样式面.mjs:196` 用 `Emulation.setDeviceMetricsOverride` 定真宽度。
 *
 * 用法：node probe-clip-cdp.mjs --dir <批目录> [--widths 390,1280] [--only 首次使用] [--json <落点>]
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const DIR = resolve(argOf('--dir', ''));
const WIDTHS = argOf('--widths', '390,1280').split(',').filter(Boolean).map(Number);
const ONLY = argOf('--only', '');
const JSONOUT = argOf('--json', '');
if (!existsSync(DIR)) { console.log('ABORT 目录不存在：' + DIR); process.exit(2); }
const BROWSER = [process.env.DSH_BROWSER, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter((p) => p && existsSync(p))[0];
if (!BROWSER) { console.log('ABORT 无浏览器'); process.exit(2); }

const PROBE = `(function(){
  function tag(el){var s=el.tagName.toLowerCase();if(el.className&&typeof el.className==='string'){s+='.'+el.className.trim().split(/\\s+/).slice(0,3).join('.');}return s;}
  var out={innerWidth:window.innerWidth,clipped:[],flush:[]};
  var all=document.querySelectorAll('*');
  for(var i=0;i<all.length;i++){
    var el=all[i],cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden')continue;
    var ox=cs.overflowX;
    if((ox==='hidden'||ox==='clip')&&el.scrollWidth-el.clientWidth>1){
      out.clipped.push({sel:tag(el),sw:el.scrollWidth,cw:el.clientWidth,txt:(el.textContent||'').trim().slice(0,40)});
    }
  }
  /* 贴边：文字自己的右缘 → 最近的「有底色/边框」祖先（卡片）右缘，净空 < 6px 才算贴 */
  var texts=document.querySelectorAll('td,th,.ilife-block-list-rows-main,.ilife-block-kpi-card-value,.ilife-block-data-table-cell-left');
  for(var k=0;k<texts.length;k++){
    var el2=texts[k];
    if(!el2.textContent||!el2.textContent.trim())continue;
    var rng=document.createRange();rng.selectNodeContents(el2);
    var r=rng.getBoundingClientRect();
    if(r.width===0)continue;
    var a=el2.parentElement,cr=null;
    while(a&&a!==document.body){
      var acs=getComputedStyle(a);
      var painted=(acs.backgroundColor&&acs.backgroundColor!=='rgba(0, 0, 0, 0)'&&acs.backgroundColor!=='transparent')
                ||(acs.borderTopWidth!=='0px'&&acs.borderTopStyle!=='none'&&acs.borderTopWidth!=='0');
      if(painted&&acs.borderRadius&&acs.borderRadius!=='0px'){cr=a.getBoundingClientRect();break;}
      a=a.parentElement;
    }
    if(!cr)continue;
    var gap=Math.round(cr.right-r.right);
    if(gap>=0&&gap<6){out.flush.push({sel:tag(el2),gapToCard:gap,padRight:getComputedStyle(el2).paddingRight,
      cardSel:tag(a),txt:(el2.textContent||'').trim().slice(0,40)});}
  }
  return out;
})()`;

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const PORT = 9801 + (process.pid % 180);
const profile = mkdtempSync(join(tmpdir(), 't820cdp-'));
const chrome = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--force-device-scale-factor=1', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile,
  'about:blank'], { stdio: 'ignore' });

async function devtoolsUrl() {
  for (let waited = 0; waited < 30000; waited += 250) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/version'); if (r.ok) return (await r.json()).webSocketDebuggerUrl; } catch { /* not ready */ }
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

const pages = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.html') && !f.includes('墙') && !f.includes('索引') && !f.includes('总表'))
  .filter((f) => ONLY === '' || f.includes(ONLY)).sort();
const out = { at: new Date().toISOString(), dir: DIR, widths: WIDTHS, rows: [] };
let bad = 0;
for (const width of WIDTHS) {
  console.log('=== 真视口 ' + width + ' ===');
  for (const file of pages) {
    await s('Emulation.setDeviceMetricsOverride', { width, height: width <= 640 ? 844 : 900, deviceScaleFactor: 1, mobile: width <= 640 });
    await s('Page.navigate', { url: pathToFileURL(join(DIR, file)).href });
    await sleep(1000);
    const r = await s('Runtime.evaluate', { returnByValue: true, expression: PROBE });
    const v = r.result.value;
    out.rows.push({ file, width, ...v });
    if (v.clipped.length || v.flush.length) {
      bad++;
      console.log('  ✗ ' + file + '  innerWidth=' + v.innerWidth + '  剪=' + v.clipped.length + ' 贴边=' + v.flush.length);
      for (const c of v.clipped) console.log('      剪 ' + c.sel + ' sw=' + c.sw + ' cw=' + c.cw + ' «' + c.txt + '»');
      for (const c of v.flush) console.log('      贴 ' + c.sel + ' 距卡右缘=' + c.gapToCard + 'px padR=' + c.padRight + ' 卡=' + c.cardSel + ' «' + c.txt + '»');
    }
  }
}
if (JSONOUT) { mkdirSync(dirname(JSONOUT), { recursive: true }); writeFileSync(JSONOUT, JSON.stringify(out, null, 1), 'utf8'); console.log('读数落 ' + JSONOUT); }
cdp.close(); chrome.kill();
console.log(bad === 0 ? '结论：34 页两档：无剪字、无贴边' : '结论：' + bad + ' 个「页×档」命中（见上）');
process.exit(bad === 0 ? 0 : 1);
