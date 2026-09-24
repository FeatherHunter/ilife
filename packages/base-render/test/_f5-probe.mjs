/** 状态与台账族 · **真机夹具**（无头 Chrome ＋ CDP）：把"起浏览器／开页／量几何／送键鼠"这套搬出测试件。
 *
 *  先例：`test/editable-value-probe.mjs`（单据族）与 `test/separator-probe.mjs`。测试件只管断言，夹具管管子。
 *
 *  它比先例多给三样（本族的判据要用）：
 *   · `metrics({roots, keys})` —— **两档几何读数**：零横向溢出（页／舞台／件三级）与关键语义不截断
 *     （逐节点比 `scrollWidth`／`clientWidth`，并检查它有没有顶出舞台右边界）；
 *   · `pressTab()`／`moveMouse()` —— 真键鼠（`:focus-visible` 只有真键盘路径才亮，脚本 `.focus()` 不算数）；
 *   · `emulate({reducedMotion, hover, width})` —— 设备能力模拟（`prefers-reduced-motion`／`hover:hover`），
 *     用来读"减动效下不卡"与"悬停不是唯一通路"。
 *
 *  探针（页面里注入的、只看不动的观察窗）：`window.__errs` 收页面级未捕获错误——
 *  "点一下抛了错但界面没变"这类看不见的坏，只有把它当判据才拦得住。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

/** 页内要跑的量几何脚本（拼成一段 IIFE，参数用 JSON 塞进去）。 */
const METRICS_FN = 'function(sel){'
  + 'var stage=document.getElementById("stage");'
  + 'var sr=stage.getBoundingClientRect();'
  + 'var de=document.documentElement;'
  + 'var one=function(node){ var b=node.getBoundingClientRect();'
  + ' return {sw:node.scrollWidth, cw:node.clientWidth,'
  + ' right:Math.round(b.right), stageRight:Math.round(sr.right),'
  + ' width:Math.round(b.width), height:Math.round(b.height), text:(node.textContent||"").slice(0,40)}; };'
  + 'var roots=[].slice.call(stage.querySelectorAll(sel.roots)).map(one);'
  + 'var keys=[];'
  + 'for (var i=0;i<sel.keys.length;i+=1){'
  + '  var nodes=[].slice.call(document.querySelectorAll(sel.keys[i]));'
  + '  keys.push({selector:sel.keys[i], n:nodes.length, items:nodes.map(one)}); }'
  + 'return {stage:{w:Math.round(sr.width), sw:stage.scrollWidth, cw:stage.clientWidth},'
  + ' page:{sw:de.scrollWidth, cw:de.clientWidth}, roots:roots, keys:keys};'
  + '}';

/**
 * 起一页真机夹具。
 * `opts.css`＝组件样式段；`opts.skinCss`＝皮肤取值表（可选）；`opts.bodyHtml`＝舞台里的标记；
 * `opts.runtime`／`opts.copies`＝运行时段与注入份数（幂等判据用）；`opts.skin`＝挂哪套皮肤类。
 */
export async function startFamilyPage(opts) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const width = opts.width === undefined ? 1000 : opts.width;
  const pageUi = '<div class="ilife-page-ui' + (opts.skin === undefined ? '' : ' ilife-skin-' + opts.skin) + '">';
  const scripts = new Array(opts.copies === undefined ? 1 : opts.copies)
    .fill('<script>' + (opts.runtime === undefined ? '' : opts.runtime) + '</script>').join('\n');
  const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">'
    + '<style>' + (opts.skinCss === undefined ? '' : opts.skinCss) + '\n' + opts.css + '\n'
    + 'html,body{margin:0;padding:0}\n'
    + '#stage{width:' + width + 'px}\n'
    + '#stage>*{margin:0 0 18px 0}\n'
    + '.fx-wrap{padding:20px}\n'
    + '</style></head>\n'
    + '<body>\n<div id="stage">' + pageUi + '<div class="fx-wrap">' + opts.bodyHtml + '</div>'
    + '</div></div>\n' + scripts + '\n</body></html>';
  const dir = mkdtempSync(join(tmpdir(), 't-f5-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, html, 'utf8');
  const profileDir = mkdtempSync(join(tmpdir(), 't-f5-chrome-'));
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=0', '--user-data-dir=' + profileDir, '--window-size=1400,900', 'about:blank'],
  { stdio: ['ignore', 'pipe', 'pipe'] });

  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    for (const d of [profileDir, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
  };
  try {
    /* 端口由 Chrome 自己挑（`--remote-debugging-port=0`），从 profile 里的 DevToolsActivePort 读回来：
       多个测试文件并行起浏览器时不会抢同一个端口。 */
    const portFile = join(profileDir, 'DevToolsActivePort');
    let port = null;
    for (let i = 0; i < 160 && port === null; i += 1) {
      if (existsSync(portFile)) {
        const first = readFileSync(portFile, 'utf8').split('\n')[0].trim();
        if (/^\d+$/.test(first)) port = Number(first);
      }
      if (port === null) await sleep(120);
    }
    if (port === null) throw new Error('CDP 未就绪（headless Chrome 起不来）');
    let devUrl = null;
    for (let i = 0; i < 80 && devUrl === null; i += 1) {
      try { const r = await fetch('http://127.0.0.1:' + port + '/json/version'); if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl; } catch { /* 等端口 */ }
      if (devUrl === null) await sleep(150);
    }
    if (devUrl === null) throw new Error('CDP 未就绪（DevTools 端点取不到）');
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
    await s('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(200);
    await ev('window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
      + 'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rejection:"+String(e.reason));});true');

    const key = async (name, code, vk) => {
      await s('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: name, code, windowsVirtualKeyCode: vk });
      await s('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: vk });
      await sleep(60);
    };
    return {
      ev,
      send: s,
      errors: () => ev('window.__errs'),
      /** 舞台宽度（两档几何就靠它）。 */
      setWidth: async (px) => { await ev('document.getElementById("stage").style.width=' + JSON.stringify(px + 'px')); await sleep(80); },
      /** 两档几何读数：件根零横向溢出 ＋ 关键语义节点不截断、不顶出舞台。 */
      metrics: (sel) => ev('(' + METRICS_FN + ')(' + JSON.stringify(sel) + ')'),
      pressTab: () => key('Tab', 'Tab', 9),
      pressSpace: () => key(' ', 'Space', 32),
      moveMouse: async (x, y) => {
        await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
        await sleep(80);
      },
      /** 设备能力模拟：`prefers-reduced-motion`／`hover`（媒体查询只许判设备能力，这两条就是它的读数面）。 */
      emulate: async (o) => {
        const features = [];
        if (o.reducedMotion !== undefined) {
          features.push({ name: 'prefers-reduced-motion', value: o.reducedMotion === true ? 'reduce' : 'no-preference' });
        }
        if (o.hover !== undefined) {
          features.push({ name: 'hover', value: o.hover === true ? 'hover' : 'none' });
          features.push({ name: 'pointer', value: o.hover === true ? 'fine' : 'coarse' });
        }
        if (features.length > 0) await s('Emulation.setEmulatedMedia', { features });
        if (o.width !== undefined) await s('Emulation.setDeviceMetricsOverride', { width: o.width, height: 900, deviceScaleFactor: 1, mobile: false });
        await sleep(80);
      },
      /** 当前活动元素的可点／可聚焦读数（触控地板与焦点可见性都用它）。 */
      focusRead: () => ev('(function(){var el=document.activeElement; if(!el) return null; var b=el.getBoundingClientRect();'
        + 'var cs=getComputedStyle(el); return {tag:el.tagName.toLowerCase(), cls:String(el.className),'
        + ' text:(el.textContent||"").slice(0,30), w:Math.round(b.width), h:Math.round(b.height),'
        + ' focusVisible:el.matches(":focus-visible"), outlineStyle:cs.outlineStyle, outlineWidth:cs.outlineWidth,'
        + ' transitionDuration:cs.transitionDuration};}())'),
      /** 触控目标读数：逐个比 44×44（视觉盒可以小，命中盒必须够）。 */
      hitRead: (selector) => ev('(function(sel){var el=document.querySelector(sel); if(!el) return null;'
        + 'var b=el.getBoundingClientRect(); var cs=getComputedStyle(el);'
        + 'return {w:Math.round(b.width), h:Math.round(b.height), cursor:cs.cursor, tag:el.tagName.toLowerCase()};}(' + JSON.stringify(selector) + '))'),
      /** 减动效下"不卡"的读数面：还在跑的那几条动画（0 条＝没有东西卡在半路）。 */
      runningAnimations: () => ev('document.getAnimations().filter(function(a){return a.playState==="running";}).length'),
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

export { sleep };
