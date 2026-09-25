/** 形状与比例族 · **真机几何夹具**（无头 Chrome ＋ CDP）：把"起浏览器／开页／改容器宽度／量几何"搬出测试件。
 *
 *  先例：`test/editable-value-probe.mjs`、`test/separator-probe.mjs`。测试件只管断言，夹具管管子。
 *
 *  为什么要有这一件：本族的四件（刻度条／进度环／构成条／热力格）判据里都有一条
 *  「390 与 1280 两个**容器宽度**下零横向溢出」——那是版面事实，静态文本查不出来；
 *  而且宽度必须改**夹具容器的宽度**、不是改视口（本层的窄档一律 `@container` 判，
 *  视口宽 ≠ 组件宽）。所以这一件做两件事：起页，以及**按容器宽度量一份几何读数**。
 *
 *  读数口径（`read(selectors)` 返回逐选择器的一行）：
 *   · `count`／`visible`：命中数／真正可见的数（`display:none` 的段内字不算可见，也就谈不上被截断）；
 *   · `maxScrollW`／`maxClientW`：可见节点里最大的 `scrollWidth`／`clientWidth`（**溢出＝前者大于后者**）；
 *   · `clipped`：可见节点里 `scrollWidth > clientWidth + 1` 的个数（**压字／截断**的机器读数）；
 *   · `maxRight`／`minLeft`：可见节点的左右边界（**有没有跑出容器**看它）；
 *   · `scrollsX`：`overflow-x` 是 `auto`／`scroll` 的节点个数（**藏横滑**的机器读数）。
 */
/** CDP 调用看门狗：超过这个毫秒数没回应就报错（别静默挂住整条判据）。 */
const CDP_TIMEOUT_MS = 15000;

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { freePort } from './_f6-chrome-probe.mjs';
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
        /* 看门狗：CDP 不回就当**错**，别静默挂住整条判据（实测挂过：真机段等十几分钟没动静）。 */
        const timer = setTimeout(() => {
          pending.delete(id);
          rej(new Error('CDP 超时：' + method + ' 在 ' + CDP_TIMEOUT_MS + 'ms 内没有回应'));
        }, CDP_TIMEOUT_MS);
        pending.set(id, {
          resolve: (v) => { clearTimeout(timer); res(v); },
          reject: (e) => { clearTimeout(timer); rej(e); },
        });
        ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
      });
    },
    close() { ws.close(); },
  };
}

/** 量一份几何读数（页内函数；选择器逐个量，聚合出"最坏的那一个"）。 */
const READ_FN = `(function (selectors) {
  var out = [];
  for (var i = 0; i < selectors.length; i += 1) {
    var sel = selectors[i];
    var nodes = [].slice.call(document.querySelectorAll(sel));
    var agg = { sel: sel, count: nodes.length, visible: 0, clipped: 0, scrollsX: 0,
      maxScrollW: 0, maxClientW: 0, maxRight: null, minLeft: null, sample: '' };
    for (var j = 0; j < nodes.length; j += 1) {
      var n = nodes[j];
      var r = n.getBoundingClientRect();
      var cs = getComputedStyle(n);
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') agg.scrollsX += 1;
      if (r.width <= 0 || r.height <= 0 || cs.display === 'none' || cs.visibility === 'hidden') continue;
      agg.visible += 1;
      if (n.scrollWidth > agg.maxScrollW) agg.maxScrollW = n.scrollWidth;
      if (n.clientWidth > agg.maxClientW) agg.maxClientW = n.clientWidth;
      if (n.scrollWidth > n.clientWidth + 1) agg.clipped += 1;
      if (agg.maxRight === null || r.right > agg.maxRight) agg.maxRight = Math.round(r.right * 100) / 100;
      if (agg.minLeft === null || r.left < agg.minLeft) agg.minLeft = Math.round(r.left * 100) / 100;
      if (agg.sample === '' && n.textContent) agg.sample = n.textContent.slice(0, 24);
    }
    out.push(agg);
  }
  return out;
})`;

/**
 * 起一页真机夹具。
 * @param {{ css: string, html: string, width?: number, height?: number, portOffset?: number }} opts
 *   `css`／`html` 由调用方（测试件）给；`html` 里每个 `[data-case]` 是一个被测件。
 * @returns 无浏览器时返回 `null`（调用方 `t.skip`）；否则返回探针对象。
 */
export async function startShapesPage(opts) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const width = opts.width === undefined ? 1440 : opts.width;
  const height = opts.height === undefined ? 1400 : opts.height;
  const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">'
    + '<style>' + opts.css + '\n'
    /* 夹具**不写全局 `box-sizing`**：真页面不保证是 border-box，本族判据要在默认 content-box 下量。
       （2026-09 实测：全局 border-box 的夹具会把「`width:100%` ＋ 1px 边框」那 2px 横溢盖过去。） */
    + 'html,body{margin:0;padding:0}'
    + '#fx{width:' + width + 'px;margin:0;padding:0}'
    + '[data-case]{display:block;min-width:0;margin:0 0 20px}'
    + '</style></head>\n'
    + '<body>\n<div id="fx">' + opts.html + '</div>\n'
    + '<script>window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
    + 'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rejection:"+String(e.reason));});</script>\n'
    + '</body></html>';
  const dir = mkdtempSync(join(tmpdir(), 't-shapes-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, html, 'utf8');
  const profileDir = mkdtempSync(join(tmpdir(), 't-shapes-chrome-'));
  /* 端口由内核给（`freePort()`）：按 `9910 + pid % N` 算会与别的判据件或系统服务撞车。 */
  const port = await freePort();
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profileDir,
    '--window-size=' + String(width + 80) + ',' + String(height), 'about:blank'],
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
    await s('Emulation.setDeviceMetricsOverride', { width: width + 80, height, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(200);
    return {
      ev,
      /** 把夹具容器改成 `px` 宽（**改的是容器，不是视口**：本层窄档一律 `@container` 判）。 */
      async setWidth(px) {
        await ev('document.getElementById("fx").style.width=' + JSON.stringify(px + 'px') + ';true');
        await sleep(60);
      },
      /** 逐选择器量一份几何读数（见文件头那段口径）。 */
      read: (selectors) => ev(READ_FN + '(' + JSON.stringify(selectors) + ')'),
      /** 夹具容器与页面的横向读数（根不留横向滚动的机器读数）。 */
      frame: () => ev('(function(){var fx=document.getElementById("fx");var de=document.documentElement;'
        + 'return {fxClientW:fx.clientWidth,fxScrollW:fx.scrollWidth,'
        + 'docScrollW:de.scrollWidth,innerW:window.innerWidth,docClientW:de.clientWidth};}())'),
      errs: () => ev('window.__errs'),
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

export { sleep };
