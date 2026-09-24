/** #950 回灌六件 · **两档几何真机探针**（headless Chrome ＋ CDP，`node:test` 之外的小件）。
 *
 *  为什么单独一件：两个判据件（`blocks.test.mjs`／`page-viz-421.test.mjs`）都要「390／1280 两个**容器**
 *  宽度下的零横向溢出」这条读数，机械只有一处（口径：能真量就真量，起不来则调用方退回确定性几何判据
 *  并把「真机未跑、原因」打出来）。
 *
 *  机械照 `test/皮肤矩阵.test.mjs` 那套（同一仓先例，`test/editable-value.test.mjs` 同源）：
 *   · 浏览器按 `DSH_BROWSER` → 三个 Windows 缺省路径 → macOS／Linux 路径逐个试；
 *   · Chrome 的 stdio 一律 `'ignore'`（它的输出不许与 `node:test` 的 IPC 搭线）；
 *   · 页面写临时文件、`file://` 打开；临时 profile 与临时目录收尾一并删。
 *
 *  **不**吃 `*.test.mjs` 通配（`node --test packages/base-render/test/*.test.mjs` 不会跑它）。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

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

/** 起一只 headless Chrome、把 `html` 装进一页，返回 `{ ev, close }`（`ev` 求值口）。 */
export async function openPage(html, opts = {}) {
  const browser = findBrowser();
  if (browser === undefined) throw new Error('本机没找到 Chrome（试过 DSH_BROWSER／Program Files／Applications）');
  const dir = mkdtempSync(join(tmpdir(), 't950-'));
  const page = join(dir, 'probe.html');
  writeFileSync(page, html, 'utf8');
  const profile = mkdtempSync(join(tmpdir(), 't950-chrome-'));
  const port = (opts.port ?? 9930) + (process.pid % 60);
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank'],
  { stdio: 'ignore', windowsHide: true });
  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    for (const d of [profile, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
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
        throw new Error('页内抛错：' + (d.exception && d.exception.description ? d.exception.description : d.text));
      }
      return r.result === undefined ? undefined : r.result.value;
    };
    await s('Page.enable');
    await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', {
      width: opts.viewportWidth ?? 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 80; i += 1) {
      if (await ev('document.readyState === "complete"') === true) break;
      await sleep(50);
    }
    await sleep(200);
    // 量「某个定宽容器里的根件与它的子件」：`scrollWidth ≤ clientWidth` 即零横向溢出。
    await ev(`window.__t950Box = function (rootSel, childSel) {
      var roots = [].slice.call(document.querySelectorAll(rootSel));
      return roots.map(function (r) {
        var kids = childSel === '' ? [] : [].slice.call(r.querySelectorAll(childSel));
        return {
          root: { client: r.clientWidth, scroll: r.scrollWidth },
          kids: kids.map(function (k) {
            return { cls: String(k.className), client: k.clientWidth, scroll: k.scrollWidth,
              text: String(k.textContent || '').slice(0, 40) };
          })
        };
      });
    }; true`);
    return { ev, close: () => { cdp.close(); cleanup(); } };
  } catch (e) {
    cleanup();
    throw e;
  }
}
