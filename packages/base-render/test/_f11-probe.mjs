/** F11（加量池六件）· **真机量几何的夹具**（无头 Chrome ＋ CDP）。
 *
 *  先例：`test/editable-value-probe.mjs`（同一套管法：起浏览器／开页／注入，夹具管管子，判据管断言）。
 *
 *  这一件量的是**两档几何**（工艺书 §6 第④类）：对一个已经渲染好的标记，在**给定容器宽度**下量
 *   ① **零横向溢出**：页面级、宿主级、件根级三层 `scrollWidth ≤ clientWidth`；件根以下任何**自带裁切**
 *      （`overflow-x` 非 `visible`）的元素也不许内容比盒子宽；
 *   ② **不压字**：件内不出现 `text-overflow: ellipsis`（关键语义不许被 `…` 截断）；
 *   ③ **关键语义不出界**：给定的关键选择器（金额／日期／状态那些）必须落在件根的横向范围内；
 *   ④ **触控目标**：给定的选择器逐个量，取最小边（≥44 才是合格）。
 *
 *  起不来（没装 Chrome）时返回 `null`，判据自己退成确定性几何判据并在回执里写明「真机未跑」。
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

/** 逐格量的页内脚本（只读不动：拿 rect 与 scrollWidth，不写一个字节）。 */
function measureScript(cells) {
  return '(function(){'
    + 'var out=[], cells=' + JSON.stringify(cells) + ';'
    + 'var hosts=document.querySelectorAll(".f11-host");'
    + 'for (var i=0;i<hosts.length;i+=1){'
    + ' var spec=cells[i], host=hosts[i], rec={skin:spec.skin,width:spec.width,ok:false};'
    + ' var root=host.querySelector(spec.rootSel);'
    + ' if (!root){ rec.missing=spec.rootSel; out.push(rec); continue; }'
    + ' rec.ok=true;'
    + ' var rr=root.getBoundingClientRect();'
    + ' rec.root={w:Math.round(rr.width),h:Math.round(rr.height),scrollWidth:root.scrollWidth,clientWidth:root.clientWidth};'
    + ' rec.host={scrollWidth:host.scrollWidth,clientWidth:host.clientWidth};'
    + ' rec.page={scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};'
    + ' rec.clipped=[]; rec.ellipsis=[];'
    + ' var all=root.querySelectorAll("*");'
    + ' for (var j=0;j<all.length;j+=1){'
    + '  var el=all[j], cs=getComputedStyle(el), ov=cs.overflowX;'
    + '  if ((ov==="hidden"||ov==="auto"||ov==="scroll"||ov==="clip") && el.scrollWidth>el.clientWidth+1){'
    + '   rec.clipped.push({cls:String(el.className),sw:el.scrollWidth,cw:el.clientWidth}); }'
    + '  if (cs.textOverflow==="ellipsis") rec.ellipsis.push({cls:String(el.className)});'
    + ' }'
    + ' rec.keys=[];'
    + ' for (var k=0;k<spec.keySels.length;k+=1){'
    + '  var ks=spec.keySels[k], found=root.querySelectorAll(ks), bad=[];'
    + '  for (var m=0;m<found.length;m+=1){'
    + '   var r=found[m].getBoundingClientRect();'
    + '   if (r.left<rr.left-1||r.right>rr.right+1){'
    + '    bad.push({text:String(found[m].textContent||"").slice(0,24),left:Math.round(r.left),right:Math.round(r.right)}); }'
    + '  }'
    + '  rec.keys.push({sel:ks,n:found.length,bad:bad});'
    + ' }'
    + ' rec.touch=[];'
    + ' for (var t=0;t<spec.touchSels.length;t+=1){'
    + '  var ts=spec.touchSels[t], els=root.querySelectorAll(ts), mn=null, sizes=[];'
    + '  for (var q=0;q<els.length;q+=1){'
    + '   var b=els[q].getBoundingClientRect(), s=Math.min(b.width,b.height);'
    + '   sizes.push(Math.round(s)); if (mn===null||s<mn) mn=s; }'
    + '  rec.touch.push({sel:ts,n:els.length,minSide:mn===null?null:Math.round(mn),sizes:sizes});'
    + ' }'
    + ' out.push(rec);'
    + '}'
    + 'return out;}())';
}

/**
 * 起一次真机，量一批格（可选：先跑一段页内脚本，用来验交互）。
 * `cells`＝`[{ html, width, skin, rootSel, keySels, touchSels }]`；`css`＝要挂的样式段全文；
 * `script`＝可选的页内表达式（**一段返回 JSON 值的 IIFE**，在量几何之前跑）。
 * 返回 `{ readings, scriptValue }`；起不来时返回 `null`。
 */
export async function measureCells(opts) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const cells = opts.cells;
  const body = cells.map((c) => '<div class="f11-host">'
    + '<div class="ilife-page-ui ilife-skin-' + c.skin + '" style="width:' + String(c.width) + 'px">'
    + c.html + '</div></div>').join('\n');
  const runtime = typeof opts.script === 'string' && opts.script !== ''
    ? '\n<script>' + opts.runtime + '</script>' : '';
  const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">'
    + '<style>' + opts.css + '\nbody{margin:0;background:#fff;}\n.f11-host{display:block;}\n</style>'
    + '</head>\n<body>\n' + body + runtime + '\n</body></html>';
  const dir = mkdtempSync(join(tmpdir(), 't-f11-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, html, 'utf8');
  const profileDir = mkdtempSync(join(tmpdir(), 't-f11-chrome-'));
  const port = 9810 + (process.pid % 200) + (opts.portOffset === undefined ? 0 : opts.portOffset);
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profileDir, '--window-size=1400,900', 'about:blank'],
  { stdio: ['ignore', 'pipe', 'pipe'] });

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
    if (devUrl === null) { cleanup(); return null; }
    const cdp = connectCdp(devUrl); await cdp.ready;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    await s('Page.enable'); await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 100; i += 1) {
      const r = await s('Runtime.evaluate', { expression: 'document.readyState === "complete"', returnByValue: true });
      if (r.result !== undefined && r.result.value === true) break;
      await sleep(50);
    }
    await sleep(250);
    let scriptValue;
    if (typeof opts.script === 'string' && opts.script !== '') {
      const r0 = await s('Runtime.evaluate', { expression: opts.script, returnByValue: true, awaitPromise: true });
      if (r0.exceptionDetails !== undefined) {
        const d = r0.exceptionDetails;
        throw new Error('页内脚本抛错：' + (d.exception && d.exception.description ? d.exception.description : d.text));
      }
      scriptValue = r0.result === undefined ? undefined : r0.result.value;
      await sleep(80);
    }
    const res = await s('Runtime.evaluate', { expression: measureScript(cells), returnByValue: true });
    if (res.exceptionDetails !== undefined) {
      const d = res.exceptionDetails;
      throw new Error('量几何时页内抛错：' + (d.exception && d.exception.description ? d.exception.description : d.text));
    }
    const readings = res.result === undefined ? null : res.result.value;
    cdp.close(); cleanup();
    return { readings, scriptValue };
  } catch (e) {
    cleanup();
    throw e;
  }
}

export { sleep };
