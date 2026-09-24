/** 「时间与分组」四件（calendar-month／range-bar／sub-list／hour-band）· **真机夹具**（无头 Chrome ＋ CDP）。
 *
 *  先例：`test/editable-value-probe.mjs`（同一套管子：起浏览器、开页、装探针）。测试件只管断言，夹具管管子。
 *
 *  为什么要真机：这四件的判据里有一条**几何**——「390 与 1280 两个容器宽度下零横向溢出、关键语义不被压」。
 *  它是**版面事实**，静态查文本查不出来（`minmax(0,1fr)` 写没写、折行有没有生效、刻度有没有重叠，
 *  都要浏览器算完才作数）。所以这里起一页真页：每档一个**固定宽度的框**，量三组读数：
 *
 *   · `overflowRightPx` / `overflowLeftPx`：**所有后代的外框**相对框边的最大越界量（≤0 才算不溢出）；
 *   · `pageScrollWidth` vs `pageClientWidth`：整页有没有横滚（0 ＝ 页级也不横滑）；
 *   · `minGapPx`：一组元素（如轴刻度标签）按左右排序后**相邻两枚之间的最小空隙**（<0 ＝ 压字）；
 *   · `overflows`：内容比盒子宽的后代（`overflow:hidden` 里被裁掉的那种，静态查不出来）；
 *   · `keys`：关键读数位的 `scrollWidth/clientWidth` 与 `text-overflow`（有没有 `…` 截断）。
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** 等一会儿（起浏览器要时间）。 */
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

/** 页里那段"量几何"的表达式（唯一一处；测试件不自己拼）。 */
const MEASURE_FN = '(function(name, pairSel, keySel){'
  + 'var f=document.querySelector("[data-frame=\\""+name+"\\"]");'
  + 'var scope=f.firstElementChild, target=scope.firstElementChild;'
  + 'var fb=f.getBoundingClientRect(), tb=target.getBoundingClientRect();'
  + 'var all=[target].concat([].slice.call(target.querySelectorAll("*")));'
  + 'var maxRight=tb.right, minLeft=tb.left, overflows=[], rightMost=null, leftMost=null;'
  + 'all.forEach(function(el){var b=el.getBoundingClientRect();'
  + 'if(b.width>0||b.height>0){'
  + 'if(b.right>maxRight){maxRight=b.right;rightMost={cls:String(el.className||el.tagName),px:Math.round(b.right-fb.right)};}'
  + 'if(b.left<minLeft){minLeft=b.left;leftMost={cls:String(el.className||el.tagName),px:Math.round(fb.left-b.left)};}}'
  + 'if(el.scrollWidth>el.clientWidth+1){overflows.push({cls:String(el.className||el.tagName),sw:el.scrollWidth,cw:el.clientWidth});}});'
  + 'var pairs=pairSel?[].slice.call(target.querySelectorAll(pairSel)).map(function(el){return el.getBoundingClientRect();}):[];'
  + 'var gap=null;'
  + 'if(pairs.length>1){pairs.sort(function(a,b){return a.left-b.left;});'
  + 'for(var i=1;i<pairs.length;i+=1){var g=pairs[i].left-pairs[i-1].right;if(gap===null||g<gap)gap=g;}}'
  + 'var keys=keySel?[].slice.call(target.querySelectorAll(keySel)).map(function(el){'
  + 'var cs=getComputedStyle(el);return {cls:String(el.className),text:String(el.textContent).slice(0,24),'
  + 'sw:el.scrollWidth,cw:el.clientWidth,ellipsis:cs.textOverflow,nowrap:cs.whiteSpace};}):[];'
  + 'return {frameW:Math.round(fb.width),targetW:Math.round(tb.width),'
  + 'frameScroll:f.scrollWidth,frameClient:f.clientWidth,targetScroll:target.scrollWidth,targetClient:target.clientWidth,'
  + 'pageScroll:document.documentElement.scrollWidth,pageClient:document.documentElement.clientWidth,'
  + 'overflowRightPx:Math.round(maxRight-fb.right),overflowLeftPx:Math.round(fb.left-minLeft),'
  + 'rightMost:rightMost,leftMost:leftMost,'
  + 'minGapPx:gap===null?null:Math.round(gap*10)/10,overflows:overflows,keys:keys};'
  + '})';

/**
 * 起一页真机夹具。`frames`＝`[{ name, width, html }]`（每档一个**固定宽度**的框；
 * `html` 是那一档要量的标记，外面自己套好 `<div class="ilife-page-ui …">`）。`css`＝皮肤段 ＋ 各件样式段。
 */
export async function openMeasurePage(opts) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const frames = opts.frames;
  const body = frames.map((f) => '  <div class="frame" data-frame="' + f.name + '" style="width:' + String(f.width) + 'px">\n'
    + '    ' + f.html + '\n  </div>').join('\n');
  const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">'
    + '<style>*,*::before,*::after{box-sizing:border-box}'
    + 'html,body{margin:0;padding:0;background:#fff}'
    + '.frame{margin:0 0 20px}'
    + '\n' + opts.css + '\n</style></head>\n<body>\n' + body + '\n</body></html>';
  const dir = mkdtempSync(join(tmpdir(), 't-timegroup-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, html, 'utf8');
  const profileDir = mkdtempSync(join(tmpdir(), 't-timegroup-chrome-'));
  /* **让浏览器自己挑端口**（`--remote-debugging-port=0`，端口写在 `DevToolsActivePort` 里）：
     自己算端口（如 `9700+pid%200`）在全量套件里会撞——别席的夹具同时起着好几个 Chrome，
     pid 差不到 200 就撞上了；撞了的表现是"等 30 秒然后 CDP 未就绪"，一路红一大片。 */
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=0', '--user-data-dir=' + profileDir, '--window-size=1400,1000', 'about:blank'],
  { stdio: ['ignore', 'pipe', 'pipe'] });

  const cleanup = () => {
    /* Windows 上 `child.kill()` 只带走直接子进程，还原生留着渲染／GPU 子进程（实测残留 20+ 个），
       所以再用 `taskkill /T` 收整棵树；收不掉也不算错（进程可能已经退了）。 */
    try { chrome.kill(); } catch { /* 已退出 */ }
    if (process.platform === 'win32' && typeof chrome.pid === 'number') {
      try { spawnSync('taskkill', ['/pid', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* 已退出 */ }
    }
    for (const d of [profileDir, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
  };
  try {
    let devUrl = null;
    for (let i = 0; i < 240 && devUrl === null; i += 1) {
      try {
        const portFile = readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim();
        if (portFile !== '') {
          const r = await fetch('http://127.0.0.1:' + portFile + '/json/version');
          if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl;
        }
      } catch { /* 还没写端口文件 */ }
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
    await s('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(250);
    await ev('window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
      + 'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rejection:"+String(e.reason));});true');
    return {
      ev,
      /** 量某一档的几何（`pairSelector`＝要两两量空隙的一组；`keySelector`＝关键读数位）。 */
      measure: (name, sel) => ev('(' + MEASURE_FN + ')(' + JSON.stringify(name) + ','
        + JSON.stringify(sel === undefined || sel.pairSelector === undefined ? null : sel.pairSelector) + ','
        + JSON.stringify(sel === undefined || sel.keySelector === undefined ? null : sel.keySelector) + ')'),
      errs: () => ev('window.__errs'),
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}
