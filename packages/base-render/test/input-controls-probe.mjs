/** 表与输入族（number-stepper／slider-row／date-range／switch-row）· **共用真机夹具**（无头 Chrome ＋ CDP）。
 *
 *  先例：`test/editable-value-probe.mjs`（交互件把"起浏览器／开页／装探针"这套搬出测试件）、
 *  `test/page-head.test.mjs`（两档几何：**视口恒 1440**，容器宽由 `style="width:Npx"` 给 ⇒ 量到的差异
 *  只可能来自容器查询，视口宽 ≠ 组件宽）。
 *
 *  探针（页面里注入的、只看不动的观察窗）：
 *   · `window.__events[事件名]`：逐条落账（`detail` 原样收）；
 *   · `window.__errs`：页面级未捕获错误（`error` 事件 ＋ `unhandledrejection`）——"点了没反应"
 *     这类**看不见的坏**，只有把它当判据才拦得住。
 *
 *  用法：`startControlsPage({ css, runtime, body, widths, events })`；`body` 是舞台里的标记，
 *  `at(width)` 导航到该档并跑调用方给的读数表达式。本机没有 Chrome 时返回 `null`（调用方 `t.skip`）。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

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

/** 起一页真机夹具。`css`＝皮肤段 ＋ 本件样式段；`runtime`＝运行时 JS 文本（一份或多份）；`body`＝舞台里的标记。 */
export async function startControlsPage(opts) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const widths = opts.widths === undefined ? [390, 1280] : opts.widths;
  const skin = opts.skin === undefined ? 'paper' : opts.skin;
  const runtime = Array.isArray(opts.runtime) ? opts.runtime : [opts.runtime];
  const scripts = runtime.map((js) => '<script>' + js + '</script>').join('\n');
  const pageOf = (w) => '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>表与输入 · 两档</title>\n'
    + '<style>\nhtml,body{margin:0;padding:0}\nbody{padding:16px}\n' + opts.css + '\n</style></head>\n<body>\n'
    + '<div class="stage ilife-page-ui ilife-skin-' + skin + '" style="width:' + String(w) + 'px">'
    + opts.body + '</div>\n' + scripts + '\n</body></html>';
  const dir = mkdtempSync(join(tmpdir(), 't-controls-'));
  const profileDir = mkdtempSync(join(tmpdir(), 't-controls-chrome-'));
  const pages = {};
  for (const w of widths) {
    const p = join(dir, 'fixture-' + String(w) + '.html');
    writeFileSync(p, pageOf(w), 'utf8');
    pages[w] = p;
  }
  /* **端口不许猜**：`--remote-debugging-port=0` 让浏览器自己挑一个空闲端口，再读它写下的
     `<user-data-dir>/DevToolsActivePort`。全包并行跑时十几个测试件同时起 Chrome，
     「9700 + pid % 200」这种算法会撞车 —— 撞上就会连到别人的浏览器上，量出别人的页面（实测过的假红）。 */
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=0', '--user-data-dir=' + profileDir, '--window-size=1440,900', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'ignore'] });
  const portFile = join(profileDir, 'DevToolsActivePort');
  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    for (const d of [profileDir, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
  };
  try {
    let devUrl = null;
    for (let i = 0; i < 160 && devUrl === null; i += 1) {
      if (existsSync(portFile)) {
        const port = readFileSync(portFile, 'utf8').split('\n')[0].trim();
        if (/^\d+$/.test(port)) {
          try {
            const r = await fetch('http://127.0.0.1:' + port + '/json/version');
            if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl;
          } catch { /* 端口刚写下来，服务还没起 */ }
        }
      }
      if (devUrl === null) await sleep(250);
    }
    if (devUrl === null) throw new Error('CDP 未就绪（headless Chrome 起不来）');
    const cdp = connectCdp(devUrl);
    await cdp.ready;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    const ev = async (expr) => {
      const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        const d = r.exceptionDetails;
        throw new Error('页内抛错：' + (d.exception && d.exception.description ? d.exception.description : d.text)
          + ' ｜ 表达式：' + String(expr).slice(0, 130));
      }
      return r.result === undefined ? undefined : r.result.value;
    };
    await s('Page.enable');
    await s('Runtime.enable');
    await s('DOM.enable');
    await s('CSS.enable');
    /* 视口恒 1440：两档量到的差异**只可能来自容器查询**。 */
    await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const at = async (width, expr) => {
      await s('Page.navigate', { url: pathToFileURL(pages[width]).href });
      for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
      await sleep(120);
      await ev('window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
        + 'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rejection:"+String(e.reason));});'
        + 'window.__events={};' + (opts.events === undefined ? '' : opts.events.map((name) => 'window.__events['
          + JSON.stringify(name) + ']=[];document.addEventListener(' + JSON.stringify(name)
          + ',function(e){window.__events[' + JSON.stringify(name) + '].push(e.detail);});').join(''))
        + 'true');
      return expr === undefined ? undefined : ev(expr);
    };
    return {
      ev,
      at,
      /** 轮询一个页内表达式直到它等于期望值（默认最多 2s）——**全包并行跑时机器很忙**，
       *  固定 `sleep` 会假红：等的是"这一格真变了"，不是"过了多少毫秒"。返回最后一次读到的值。 */
      until: async (expr, want, timeoutMs) => {
        const cap = timeoutMs === undefined ? 2000 : timeoutMs;
        const deadline = Date.now() + cap;
        let got;
        for (;;) {
          got = await ev(expr);
          if (JSON.stringify(got) === JSON.stringify(want)) return got;
          if (Date.now() >= deadline) return got;
          await sleep(25);
        }
      },
      /** 页内强制某元素进 `:focus-visible` 后的描边读数（焦点地板的真机判据）。
       *  `readSelector` 不给＝量那个元素自己；给了＝量它（例如焦点在原生 `input` 上、描边画在轨道上）。 */
      focusOutline: async (selector, readSelector) => {
        const target = readSelector === undefined ? selector : readSelector;
        const { root: docRoot } = await s('DOM.getDocument', { depth: 1 });
        const { nodeId } = await s('DOM.querySelector', { nodeId: docRoot.nodeId, selector });
        await s('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus-visible'] });
        const out = await ev('(function(){var cs=getComputedStyle(document.querySelector(' + JSON.stringify(target)
          + '));return {w:parseFloat(cs.outlineWidth),style:cs.outlineStyle};}())');
        await s('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
        return out;
      },
      errs: () => ev('window.__errs'),
      events: (name) => ev('window.__events[' + JSON.stringify(name) + ']'),
      widths,
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}
