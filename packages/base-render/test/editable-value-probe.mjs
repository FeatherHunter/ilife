/** editableValue · **真机夹具**（无头 Chrome ＋ CDP）：把"起浏览器／开页／装探针"这套搬出测试件。
 *
 *  先例：`test/separator-probe.mjs`。测试件只管断言，夹具管管子。
 *
 *  探针（页面里注入的、只看不动的观察窗）：
 *   · `window.__hits`／`window.__cancels`：提交／取消事件逐条落账（`detail` 原样收）；
 *   · `window.__errs`：页面级未捕获错误（`error` 事件 ＋ `unhandledrejection`）——"Enter 提交抛
 *     `NotFoundError`"这类**看不见的坏**，只有把它当判据才拦得住（审查席 P1-1）。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

function findBrowser() {
  return [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter((p) => typeof p === 'string' && p !== '' && existsSync(p))[0];
}

function connectCdp(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => rej(new Error('CDP 连接失败')));
  });
  return {
    ready,
    send(method, params, sessionId) {
      const id = nextId; nextId += 1;
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
      });
    },
    close() { ws.close(); },
  };
}

/** 起一页真机夹具。`cells`＝已渲染好的值标记（各占一行），`runtime`＝运行时 JS 文本，`copies`＝注入份数。 */
export async function startEditablePage(opts) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const cells = opts.cells;
  const runtime = opts.runtime;
  const rows = cells.map((c, i) => '    <tr><td>f' + i + '</td><td>' + c + '</td></tr>').join('\n');
  const body = '<table class="fx"><colgroup><col style="width:90px"><col></colgroup>\n'
    + '  <tbody>\n' + rows + '\n  </tbody></table>';
  const scripts = new Array(opts.copies === undefined ? 1 : opts.copies)
    .fill('<script>' + runtime + '</script>').join('\n');
  const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">'
    + '<style>' + opts.css + '\n.fx{table-layout:fixed;width:600px;border-collapse:collapse}'
    + '.fx td{border:1px solid var(--line);padding:10px}</style></head>\n'
    + '<body>\n' + body + '\n' + scripts + '\n</body></html>';
  const dir = mkdtempSync(join(tmpdir(), 't-edit-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, html, 'utf8');
  const profileDir = mkdtempSync(join(tmpdir(), 't-edit-chrome-'));
  const port = 9710 + (process.pid % 200) + (opts.portOffset === undefined ? 0 : opts.portOffset);
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profileDir, '--window-size=1200,900', 'about:blank'],
  { stdio: ['ignore', 'pipe', 'pipe'] });

  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    for (const d of [profileDir, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
  };
  try {
    let devUrl = null;
    for (let i = 0; i < 120 && devUrl === null; i += 1) {
      try { const r = await fetch('http://127.0.0.1:' + port + '/json/version'); if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl; } catch { /* 等端口 */ }
      if (devUrl === null) await sleep(250);
    }
    if (devUrl === null) throw new Error('CDP 未就绪（headless Chrome 起不来）');
    const cdp = connectCdp(devUrl); await cdp.ready;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    const ev = async (expr) => {
      const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        const d = r.exceptionDetails;
        const why = d.exception && d.exception.description ? d.exception.description : d.text;
        throw new Error('页内抛错 表达式：' + expr.slice(0, 130) + ' ｜ 原因：' + why);
      }
      return r.result === undefined ? undefined : r.result.value;
    };
    await s('Page.enable'); await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(200);
    await ev('window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
      + 'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rejection:"+String(e.reason));});true');
    await ev('window.__hits=[];window.__cancels=[];'
      + 'document.addEventListener(' + JSON.stringify(opts.commitEvent) + ',function(e){window.__hits.push(e.detail);});'
      + 'document.addEventListener(' + JSON.stringify(opts.cancelEvent) + ',function(e){window.__cancels.push(e.detail);});true');
    return {
      ev,
      /** 行高 ＋ 第二列左右边界（"编辑不变形"的读数面）。 */
      geom: () => ev('(function(){var rows=[].slice.call(document.querySelectorAll(".fx tbody tr")).map(function(tr){'
        + 'return Math.round(tr.getBoundingClientRect().height);});'
        + 'var cells=[].slice.call(document.querySelectorAll(".fx tbody td:nth-child(2)")).map(function(td){'
        + 'return Math.round(td.getBoundingClientRect().left)+".."+Math.round(td.getBoundingClientRect().right);});'
        + 'return {heights:rows,cells:cells};}())'),
      hits: () => ev('window.__hits'),
      cancels: () => ev('window.__cancels'),
      errs: () => ev('window.__errs'),
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

export { sleep };
