/** #1118 task-31 探针：采集页主按钮的运行时开关（CDP ＋ 无头 Chrome；形状照 test/_f5-probe.mjs）。
 *  读数三条：① 初始 disabled；② 填必需输入 ⇒ 可点且 data-t 已重算；③ 清空 ⇒ 回禁用；④ 开着时 click() ⇒ 复制通道真跑到。
 *  用法：node .scratch/1118/probe-collect-btn.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const findBrowser = () => [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')]
  .filter((p) => typeof p === 'string' && p !== '' && existsSync(p))[0];

function connectCdp(url) {
  const ws = new WebSocket(url);
  let nextId = 1; const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id !== undefined && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result); }
  });
  const ready = new Promise((res, rej) => { ws.addEventListener('open', () => res()); ws.addEventListener('error', () => rej(new Error('CDP 连接失败'))); });
  return { ready, send(method, params, sessionId) { const id = nextId; nextId += 1; return new Promise((res, rej) => { pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId })); }); }, close() { ws.close(); } };
}

const PAGES = [
  ['b01', 'collect', ['name']], ['b03', 'collect', ['name', 'new-name']], ['b05', 'collect', ['amount', 'from', 'to']],
  ['g01', 'collect', ['amount']], ['g03', 'collect', ['name', 'amount']], ['b02', 'receipt', []],
];

const browser = findBrowser();
if (browser === undefined) { console.log('RED CDP 未就绪（找不到 Chrome）'); process.exit(1); }
const profileDir = mkdtempSync(join(tmpdir(), 't-1118-chrome-'));
const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--hide-scrollbars', '--allow-file-access-from-files', '--remote-debugging-port=0', '--user-data-dir=' + profileDir,
  '--window-size=1400,900', 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
const bad = [];
try {
  const portFile = join(profileDir, 'DevToolsActivePort');
  let port = null;
  for (let i = 0; i < 160 && port === null; i += 1) {
    if (existsSync(portFile)) { const f = readFileSync(portFile, 'utf8').split('\n')[0].trim(); if (/^\d+$/.test(f)) port = Number(f); }
    if (port === null) await sleep(120);
  }
  if (port === null) throw new Error('CDP 未就绪（headless Chrome 起不来）');
  let devUrl = null;
  for (let i = 0; i < 80 && devUrl === null; i += 1) {
    try { const r = await fetch('http://127.0.0.1:' + port + '/json/version'); if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl; } catch { /* 等 */ }
    if (devUrl === null) await sleep(150);
  }
  const cdp = connectCdp(devUrl); await cdp.ready;
  for (const [id, kind, req] of PAGES) {
    const file = '.scratch/1118-acct/' + id + '-真跑.html';
    if (!existsSync(file)) { bad.push(id + ' 产物不在'); continue; }
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    const ev = async (expr) => { const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('页内抛错：' + (r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text)); return r.result === undefined ? undefined : r.result.value; };
    await s('Page.enable'); await s('Runtime.enable');
    await s('Page.navigate', { url: pathToFileURL(file).href });
    for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState') === 'complete') break; await sleep(80); }
    await sleep(150);
    const init = await ev('(function(){var b=document.querySelector("[data-action-id]");return b?{disabled:b.disabled,aria:b.getAttribute("aria-disabled"),tag:b.getAttribute("data-t").indexOf("____")>=0}:"NOBUTTON";})()');
    const filled = await ev('(function(){var names=' + JSON.stringify(req) + ';'
      + 'var setv=function(n){var i=document.getElementsByName(n)[0];if(!i)return "";if(i.tagName==="SELECT"){var o=[].slice.call(i.options).filter(function(x){return x.value;})[0];if(o)i.value=o.value;}else{i.value="测试值"+n.length;}i.dispatchEvent(new Event("input",{bubbles:true}));i.dispatchEvent(new Event("change",{bubbles:true}));return String(i.value||"");};var vals=names.map(setv).filter(function(v){return v;});'
      + 'var b=document.querySelector("[data-action-id]");var dt=b.getAttribute("data-t");'
      + 'return {disabled:b.disabled,aria:b.getAttribute("aria-disabled"),stale:vals.some(function(v){return dt.indexOf(v)<0;})};})()');
    const cleared = await ev('(function(){var names=' + JSON.stringify(req) + ';'
      + 'names.forEach(function(n){var i=document.getElementsByName(n)[0];if(i){i.value="";i.dispatchEvent(new Event("input",{bubbles:true}));}});'
      + 'var b=document.querySelector("[data-action-id]");return {disabled:b.disabled,aria:b.getAttribute("aria-disabled")};})()');
    const clicked = await ev('(function(){var names=' + JSON.stringify(req) + ';'
      + 'var setv=function(n){var i=document.getElementsByName(n)[0];if(!i)return "";if(i.tagName==="SELECT"){var o=[].slice.call(i.options).filter(function(x){return x.value;})[0];if(o)i.value=o.value;}else{i.value="测试值"+n.length;}i.dispatchEvent(new Event("input",{bubbles:true}));i.dispatchEvent(new Event("change",{bubbles:true}));return String(i.value||"");};var vals=names.map(setv).filter(function(v){return v;});'
      + 'var got=null;var real=null;try{real=navigator.clipboard&&navigator.clipboard.writeText;}catch(e){}'
      + 'if(navigator.clipboard){navigator.clipboard.writeText=function(t){got=String(t);return Promise.resolve();};}'
      + 'var b=document.querySelector("[data-action-id]");b.click();'
      + 'return {clicked:true,disabled:b.disabled,copied:got===null?null:got.indexOf("测试值")>=0,stale:b.getAttribute("data-t").indexOf("____")>=0};})()');
    console.log(id + ' [' + kind + '] 初始 disabled=' + (init === 'NOBUTTON' ? 'NOBUTTON' : init.disabled) + ' aria=' + (init === 'NOBUTTON' ? '-' : init.aria)
      + ' | 填必需 disabled=' + filled.disabled + ' aria=' + filled.aria + ' data-t 含____=' + filled.stale
      + ' | 清空 disabled=' + cleared.disabled
      + ' | click 后 copied=' + clicked.copied + ' disabled=' + clicked.disabled);
    const wantDisabled = kind === 'collect';
    if (init === 'NOBUTTON') bad.push(id + ' 找不到主按钮');
    else if (init.disabled !== wantDisabled) bad.push(id + ' 初始档位不对：' + String(init.disabled));
    if (kind === 'collect') {
      if (filled.disabled !== false) bad.push(id + ' 填必需后仍禁用');
      if (filled.stale !== false) bad.push(id + ' 填必需后 data-t 未重算（仍含 ____）');
      if (cleared.disabled !== true) bad.push(id + ' 清空后未回禁用');
      if (clicked.copied !== true) bad.push(id + ' click 后复制通道没跑到');
    }
    await cdp.send('Target.closeTarget', { targetId });
  }
  cdp.close();
} catch (e) {
  bad.push('探针异常：' + String(e && e.message ? e.message : e));
} finally {
  try { chrome.kill(); } catch { /* 已退出 */ }
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* 临时目录 */ }
}
if (bad.length > 0) { for (const b of bad) console.log('RED ' + b); console.log('RESULT: RED（' + bad.length + ' 处）'); process.exit(1); }
console.log('RESULT: PASS（6 页：初始档位／填必需可点／清空回禁用／click 复制通道全对上）');
