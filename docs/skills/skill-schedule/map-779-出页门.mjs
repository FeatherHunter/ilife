#!/usr/bin/env node
/** 图 #779 · **出页门**（地图级工具，给八张「出页」票共用）：一条命令把一批产物页过四关。
 *
 *  哥在 `.scratch` 里跑，产物目录给谁量谁：
 *    node docs/skills/skill-schedule/map-779-出页门.mjs <产物目录> [--widths 390,768,1440] [--strict-column]
 *
 *  四关（前三条是硬关，任一破即 exit 1）：
 *    ① 整页：`<!doctype html>` 起、`</html>` 收、有 `<meta name="viewport">`
 *    ② 零外部引用：无 `http(s)://`／`<link`／`@import`（产物必须双击即看）
 *    ③ 双端横向溢出归零：真浏览器（headless Chrome ＋ CDP）在三档视口读 `documentElement.scrollWidth − innerWidth`
 *    ④ 列宽读数（默认只读不判）：≥1001 档正文直接子件的左右边界是否全同 —— 作息这三张页人裁的是
 *       **单一内容列**（见 `出页交接-页型配方怎么用.md` §四），加 `--strict-column` 即升级为硬关。
 *
 *  为什么要有这一件：`reason ①`「块在不在、文案在不在」由各票的样板脚本管；这一件管的是
 *  **每条票都要过、且与内容无关**的那几关——尤其是「样式有没有真的生效」这一类（#782 实测
 *  被抓出两处：分布行漏传色、宽块跳出内容列，两处都躲过了当时所有的门）。
 *
 *  依赖：本机 Chrome／Edge（`DSH_BROWSER=<路径>` 可指），Node ≥ 22（内建 WebSocket／fetch）。零第三方依赖。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const argOf = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const DIR = process.argv.slice(2).find((a) => !a.startsWith('--') && !process.argv[process.argv.indexOf(a) - 1]?.startsWith('--'));
const WIDTHS = argOf('--widths', '390,768,1440').split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0);
const STRICT_COLUMN = process.argv.includes('--strict-column');
if (DIR === undefined) { console.log('用法：map-779-出页门.mjs <产物目录> [--widths 390,768,1440] [--strict-column]'); process.exit(2); }
const ROOT = resolve(DIR);
if (!existsSync(ROOT)) { console.log('RESULT: ABORT 目录不存在：' + ROOT); process.exit(2); }

const BROWSER = [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome',
].filter((p) => typeof p === 'string' && p && existsSync(p))[0];
if (!BROWSER) { console.log('RESULT: ABORT 未找到 Chrome／Edge（用 DSH_BROWSER=<路径> 指定）'); process.exit(2); }

const PROBE = `(function(){
  var doc = document.documentElement;
  var body = document.querySelector('.ilife-block-page-shell-body');
  var cols = [];
  if (body) {
    for (var i = 0; i < body.children.length; i += 1) {
      var el = body.children[i];
      if (getComputedStyle(el).display === 'none') continue;
      var r = el.getBoundingClientRect();
      cols.push(Math.round(r.left) + '..' + Math.round(r.right));
    }
  }
  return { iw: window.innerWidth, overflow: doc.scrollWidth - window.innerWidth, columns: cols };
}())`;

const files = readdirSync(ROOT).filter((f) => f.toLowerCase().endsWith('.html')).map((f) => join(ROOT, f)).sort();
if (files.length === 0) { console.log('RESULT: ABORT 目录里没有 .html：' + ROOT); process.exit(2); }

const PORT = 9811 + (process.pid % 150);
const profile = mkdtempSync(join(tmpdir(), 't779-gate-'));
const chrome = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--hide-scrollbars', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + profile, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let dev = null;
for (let i = 0; i < 120 && dev === null; i += 1) {
  try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/version'); if (r.ok) dev = (await r.json()).webSocketDebuggerUrl; } catch { /* 未就绪 */ }
  if (dev === null) await sleep(250);
}
if (dev === null) { chrome.kill(); console.log('RESULT: ABORT CDP 未就绪'); process.exit(2); }
const ws = new WebSocket(dev);
const pending = new Map();
let seq = 1;
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id !== undefined && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
});
await new Promise((res) => ws.addEventListener('addEventListener' in ws ? 'open' : 'open', () => res()));
const send = (method, params, sessionId) => new Promise((res, rej) => {
  const id = seq++; pending.set(id, { resolve: res, reject: rej });
  ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
});
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
const evaluate = async (expression) => {
  const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 200));
  return r.result.value;
};
await s('Page.enable'); await s('Runtime.enable');

console.log('# 出页门 · 目录=' + ROOT + ' 宽=' + WIDTHS.join('/') + (STRICT_COLUMN ? '（列宽为硬关）' : ''));
let failed = 0;
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const red = [];
  if (!html.startsWith('<!doctype html>')) red.push('整页·doctype');
  if (!html.trimEnd().endsWith('</html>')) red.push('整页·收尾');
  if (!html.includes('<meta name="viewport"')) red.push('整页·viewport');
  if (/https?:\/\//.test(html)) red.push('外部引用·URL');
  if (html.includes('<link')) red.push('外部引用·link');
  if (html.includes('@import')) red.push('外部引用·import');
  const cells = [];
  for (const width of WIDTHS) {
    await s('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    await s('Page.navigate', { url: pathToFileURL(file).href });
    for (let i = 0; i < 60; i += 1) { if (await evaluate('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(200);
    const got = await evaluate(PROBE);
    cells.push(width + '档:' + (got.overflow > 0 ? '+' + got.overflow : '0') + (got.overflow > 0 ? ' ✗' : ' ✓'));
    if (got.overflow > 0) red.push('溢出@' + width + ' +' + got.overflow);
    const uniq = [...new Set(got.columns)];
    if (width >= 1001 && uniq.length > 1) {
      const line = '列宽@' + width + ' ' + uniq.slice(0, 4).join(' ／ ') + (uniq.length > 4 ? ' …（共 ' + uniq.length + ' 种）' : '');
      if (STRICT_COLUMN) red.push(line); else cells.push('[' + line + ']');
    }
  }
  const ok = red.length === 0;
  if (!ok) failed += 1;
  console.log((ok ? '  ✓ ' : '  ✗ ') + basename(file).padEnd(22) + cells.join('  ') + (ok ? '' : '  红条=' + red.join('｜')));
}
ws.close(); chrome.kill();
for (let i = 0; i < 10; i += 1) { try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(200); } }
console.log('RESULT: ' + (failed === 0 ? 'PASS' : 'FAIL') + ' pages=' + files.length + ' red=' + failed);
process.exit(failed === 0 ? 0 : 1);
