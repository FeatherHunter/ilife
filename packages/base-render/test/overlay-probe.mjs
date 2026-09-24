/** 「容器与浮层」族 · **真机夹具**（无头 Chrome ＋ CDP）：把「起浏览器／开页／按键／点鼠标／量几何」这套搬出测试件。
 *
 *  先例：`test/editable-value-probe.mjs`（组件层第一件）与 `test/page-head.test.mjs` 里那一段内联夹具。
 *  本族四件（dialog／drawer-sheet／popover-menu／tooltip）共用这一份：**它们全是浮层**，
 *  「开没开、贴没贴住、`Esc` 关不关得掉、关掉焦点回不回到触发键」只有真浏览器答得了。
 *
 *  探针（页面里注入的、只看不动的观察窗）：
 *   · `window.__errs`：页面级未捕获错误（`error` ＋ `unhandledrejection`）——「开浮层抛
 *     `InvalidStateError`」这类**看不见的坏**，只有把它当判据才拦得住；
 *   · `window.__evts`：`ilife:*` 事件逐条落账（`type` ＋ `detail`），页面用 `p.evts()` 取。
 *
 *  用法（测试件里）：
 *  ```js
 *  const p = await startBrowser();          // 起不来 → null，调用方 t.skip
 *  await p.at(html, { width: 390, height: 700 });
 *  await p.ev('document.querySelector("[data-ilife-dialog-open]").click()');
 *  await p.key('Escape');
 *  p.close();
 *  ```
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** 等一会儿（真机判据里每个动作之后都留一口气给浏览器）。 */
export const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把「解释」当「规则」）。 */
export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** 逐条选择器（`@` 开头的 prelude 不算选择器；嵌在 at-rule 里的照抓）。 */
export const selectorsOf = (css) => {
  const out = [];
  for (const m of stripComments(css).matchAll(/([^{}]*)\{/g)) {
    const sel = m[1].split('}').pop().trim();
    if (sel === '' || sel.startsWith('@')) continue;
    out.push(sel);
  }
  return out;
};

/** 抛错的入参（`BlocksError`：组件层与区块层共用同一个错误名）。 */
export const throwsBlocks = (fn) => {
  try { fn(); } catch (e) { return e.name === 'BlocksError'; }
  return false;
};

/** 一处 `var(--ilife-…)` 的边界：它必须与 `skinVar(名)` **逐字相同**（返回可挖掉的区间）。 */
export const skinVarSpans = (assert, css, skinVar) => {
  const spans = [];
  for (const m of css.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)) {
    const expected = skinVar(m[1]);
    assert.ok(css.startsWith(expected, m.index),
      '`' + m[1] + '` 处的 var() 串与 skinVar() 走散：' + css.slice(m.index, m.index + 80));
    spans.push([m.index, m.index + expected.length]);
  }
  return spans;
};

/** 把若干区间从串里挖掉。 */
export const cutSpans = (text, spans) => {
  let out = '';
  let at = 0;
  for (const [from, to] of spans) { out += text.slice(at, from); at = to; }
  return out + text.slice(at);
};

/** 肤色：`#rrggbb` → 相对亮度（WCAG 2.1）。 */
export const luminance = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const ch = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};

/** WCAG 对比度（1..21）。 */
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/** 本机的浏览器（找不到就 `null`：判据退化为确定性几何）。 */
export function findBrowser() {
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

/** 页面里那枚「把 `ilife:*` 事件逐条落账」的探针（每个页都要装一次）。 */
const PROBE = 'window.__errs=[];window.__evts=[];'
  + 'window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
  + 'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rejection:"+String(e.reason));});'
  + '["ilife:dialog-open","ilife:dialog-close","ilife:drawer-open","ilife:drawer-change",'
  + '"ilife:drawer-done","ilife:drawer-close","ilife:menu-select","ilife:menu-toggle"].forEach(function(n){'
  + 'document.addEventListener(n,function(e){window.__evts.push({type:n,detail:e.detail});});});true';

/** 起一台无头 Chrome（一份实例跑完整个测试件；起不来返回 `null`）。 */
export async function startBrowser(opts) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const dir = mkdtempSync(join(tmpdir(), 't-f10-'));
  const profileDir = mkdtempSync(join(tmpdir(), 't-f10-chrome-'));
  const base = (opts === undefined ? 0 : (opts.portOffset === undefined ? 0 : opts.portOffset));
  const port = 9910 + (process.pid % 80) + base;
  const width = opts === undefined || opts.width === undefined ? 1200 : opts.width;
  const height = opts === undefined || opts.height === undefined ? 900 : opts.height;
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profileDir,
    '--window-size=' + width + ',' + height, 'about:blank'],
  { stdio: ['ignore', 'ignore', 'ignore'] });
  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    for (const d of [profileDir, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
  };
  try {
    let devUrl = null;
    for (let i = 0; i < 120 && devUrl === null; i += 1) {
      try {
        const r = await fetch('http://127.0.0.1:' + port + '/json/version');
        if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl;
      } catch { /* 等端口 */ }
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
        const why = d.exception && d.exception.description ? d.exception.description : d.text;
        throw new Error('页内抛错：' + why + ' ｜ 表达式：' + String(expr).slice(0, 140));
      }
      return r.result === undefined ? undefined : r.result.value;
    };
    await s('Page.enable');
    await s('Runtime.enable');
    let seq = 0;
    return {
      ev,
      /** 开一页（写临时文件 → 设视口 → 导航 → 装探针）。 */
      async at(html, size) {
        seq += 1;
        const w = size === undefined || size.width === undefined ? 1200 : size.width;
        const h = size === undefined || size.height === undefined ? 900 : size.height;
        const file = join(dir, 'page-' + seq + '.html');
        writeFileSync(file, html, 'utf8');
        await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
        await s('Page.navigate', { url: pathToFileURL(file).href });
        for (let i = 0; i < 100; i += 1) {
          if (await ev('document.readyState === "complete"') === true) break;
          await sleep(40);
        }
        await sleep(120);
        await ev(PROBE);
        return { width: w, height: h };
      },
      /** 真按一次键（走 CDP 的输入通道：`Esc` 要浏览器自己处理，不能只派一个 `KeyboardEvent`）。 */
      async key(k) {
        const code = k === 'Escape' ? 'Escape' : (k === 'ArrowDown' ? 'ArrowDown' : (k === 'Tab' ? 'Tab' : k));
        const vk = k === 'Escape' ? 27 : (k === 'ArrowDown' ? 40 : (k === 'Tab' ? 9 : 0));
        await s('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
        await s('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
        await sleep(140);
      },
      /** 真点一下（走 CDP 的鼠标通道：light dismiss 与命中测试都要真的指针事件）。 */
      async mouse(x, y) {
        await s('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        await sleep(140);
      },
      /** 把指针挪到某点（只动不点：悬停通路要它）。 */
      async move(x, y) {
        await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
        await sleep(140);
      },
      evts: () => ev('window.__evts'),
      errs: () => ev('window.__errs'),
      close() { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}
