/** F6（搜索与筛选族）· **真机夹具**（无头 Chrome ＋ CDP）：起浏览器／开页／量几何，搬出测试件。
 *
 *  先例：`test/editable-value-probe.mjs`（同一套 CDP 管子）。测试件只管断言，夹具管管子。
 *
 *  这一族的几何判据有一个要害：**容器驱动**。所以夹具的量法不是「把视口缩到 390」，
 *  而是「视口保持 1440，把量具容器 `#box` 调到 390／1280」——正是工艺书第四节那条
 *  「听容器，不听视口」。量的是 `#box` 自己的溢出与它每个后代的越界。
 *
 *  读数面（都从真渲染结果里取，不读源码）：
 *   · `box`／`doc`：`scrollWidth ≤ clientWidth`（零横向溢出）；
 *   · `offenders`：**每个**后代右边界越出容器右缘（或左边界越出左缘）的清单；
 *   · `targets`：可点控件的命中盒（≥44×44）与"中心点真能命中它"；
 *   · `keys`：关键语义位（金额／日期／计数）有没有被 `…` 截断；
 *   · `rows`：该换行的行是不是 `flex-wrap:wrap`、有没有藏 `overflow-x`。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** 让内核给一个当前空闲的端口。并行跑多个判据件时，按 `pid % N` 算端口会撞车——
 *  实测撞过一次「CDP 未就绪（headless Chrome 起不来）」，整条判据白等 30 秒。 */
export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
  });
}

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

/** 真机夹具页：根类 `.ilife-page-ui`（本族样式的作用域）＋ 量具容器 `#box`（宽度可调）。 */
export function buildF6Html(opts) {
  const skin = opts.skin === undefined ? '' : ' ' + escapeAttr(opts.skin);
  const scripts = (opts.scripts === undefined ? [] : opts.scripts)
    .map((js) => '<script>' + js + '</script>').join('\n');
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + escapeText(opts.title === undefined ? 'f6' : opts.title) + '</title>'
    + '<style>' + (opts.css === undefined ? '' : opts.css) + '\n'
    + 'body{margin:0;padding:12px;background:var(--bg);color:var(--fg);'
    + 'font-family:"SF Pro Display",-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}'
    + '#box{width:390px;box-sizing:border-box}'
    + '.f6-raw{font:13px/1.6 monospace;white-space:pre-wrap}'
    + '</style></head>\n'
    + '<body class="ilife-page-ui' + skin + '">\n'
    + '<div id="box">' + (opts.body === undefined ? '' : opts.body) + '</div>\n'
    + scripts + '\n</body></html>';
}

const escapeAttr = (s) => String(s).replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]));
const escapeText = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** 页内量具表达式（一次往返把四类读数一起取回来）。 */
function measureExpr(opts) {
  const keys = JSON.stringify(opts.keys === undefined ? [] : opts.keys);
  const rows = JSON.stringify(opts.rows === undefined ? [] : opts.rows);
  return '(function(){'
    + 'var box=document.getElementById("box");var b=box.getBoundingClientRect();'
    + 'var all=box.querySelectorAll("*"),bad=[],targets=[],keyOut=[],rowOut=[];'
    + 'for(var i=0;i<all.length;i++){var e=all[i];var r=e.getBoundingClientRect();'
    + 'if(r.width===0&&r.height===0)continue;'
    + 'if(r.right>b.right+1||r.left<b.left-1){bad.push({cls:String(e.className||e.tagName).slice(0,60),'
    + 'overRight:Math.round(r.right-b.right),overLeft:Math.round(b.left-r.left)});}'
    + 'if(e.matches("button,input,select,summary,a[href]")){'
    + 'var cx=r.left+r.width/2,cy=r.top+r.height/2;var top=document.elementFromPoint(cx,cy);'
    + 'targets.push({cls:String(e.className||e.tagName).slice(0,60),w:Math.round(r.width),h:Math.round(r.height),'
    + 'disabled:e.disabled===true,hit:!!top&&(top===e||e.contains(top))});}}'
    + 'var ks=' + keys + ';for(var k=0;k<ks.length;k++){var els=box.querySelectorAll(ks[k]);'
    + 'for(var q=0;q<els.length;q++){var el=els[q],cs=getComputedStyle(el);'
    + 'keyOut.push({sel:ks[k],text:String(el.textContent||"").trim().slice(0,40),'
    + 'sw:el.scrollWidth,cw:el.clientWidth,textOverflow:cs.textOverflow,whiteSpace:cs.whiteSpace});}}'
    + 'var rs=' + rows + ';for(var m=0;m<rs.length;m++){var rl=box.querySelectorAll(rs[m]);'
    + 'for(var n=0;n<rl.length;n++){var rcs=getComputedStyle(rl[n]);'
    + 'rowOut.push({sel:rs[m],flexWrap:rcs.flexWrap,overflowX:rcs.overflowX,display:rcs.display,children:rl[n].children.length});}}'
    + 'return {box:{sw:box.scrollWidth,cw:box.clientWidth,w:Math.round(b.width)},'
    + 'doc:{sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth},'
    + 'offenders:bad.slice(0,8),targets:targets,keys:keyOut,rows:rowOut};}())';
}

/** 起一台无头浏览器（一族的判据共用一台；起不来返回 `null`，判据走 `t.skip`）。
 *  端口让内核分配（并行件不撞车），起不来再换一个端口重试一次。 */
export async function launchF6(opts) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const port = await freePort();
    const handle = await tryLaunch(browser, port);
    if (handle !== null) return handle;
    if (attempt === 0) await sleep(400);
  }
  return null;
}

/** 起一次：CDP 就绪返回句柄，否则清干净返回 `null`（交给外层换端口重试）。 */
async function tryLaunch(browser, port) {
  const profileDir = mkdtempSync(join(tmpdir(), 'f6-chrome-'));
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profileDir, '--window-size=1500,1000', 'about:blank'],
  { stdio: ['ignore', 'pipe', 'pipe'] });
  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* 临时目录 */ }
  };
  let devUrl = null;
  for (let i = 0; i < 80 && devUrl === null; i += 1) {
    try {
      const r = await fetch('http://127.0.0.1:' + port + '/json/version');
      if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl;
    } catch { /* 等端口 */ }
    if (devUrl === null) await sleep(250);
  }
  if (devUrl === null) { cleanup(); return null; }
  const cdp = connectCdp(devUrl);
  try { await cdp.ready; } catch { cleanup(); return null; }

  const pages = [];
  return {
    /** 开一页：写临时文件 → 新 target → 导航 → 装探针。 */
    async open(html, openOpts) {
      const dir = mkdtempSync(join(tmpdir(), 'f6-page-'));
      const page = join(dir, 'fixture.html');
      writeFileSync(page, html, 'utf8');
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
      await s('Emulation.setDeviceMetricsOverride', {
        width: (openOpts && openOpts.viewport) || 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
      });
      await s('Page.navigate', { url: pathToFileURL(page).href });
      for (let i = 0; i < 100; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
      await sleep(150);
      await ev('window.__errs=[];window.__events=[];'
        + 'window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
        + 'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rejection:"+String(e.reason));});true');
      const handle = {
        ev,
        /** 听事件（`type` 全名，如 `ilife:search`）：逐条落 `detail` 原样。 */
        listen: (type) => ev('document.addEventListener(' + JSON.stringify(type) + ','
          + 'function(e){window.__events.push({type:' + JSON.stringify(type) + ',detail:e.detail});});true'),
        events: (type) => ev('window.__events.filter(function(x){return !' + JSON.stringify(type === undefined ? '' : type)
          + '||x.type===' + JSON.stringify(type === undefined ? '' : type) + '})'),
        errs: () => ev('window.__errs'),
        setWidth: (w) => ev('document.getElementById("box").style.width=' + JSON.stringify(String(w) + 'px') + ';true'),
        html: (sel) => ev('(function(){var e=document.querySelector(' + JSON.stringify(sel === undefined ? '#box' : sel)
          + ');return e?e.outerHTML:""}())'),
        /** 容器宽度 → 四类读数（两档几何的读数面）。 */
        measure: async (w, mOpts) => { await handle.setWidth(w); return ev(measureExpr(mOpts || {})); },
        /** 量一条选择器的命中盒与可见性。 */
        rectOf: (sel) => ev('(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');'
          + 'if(!e)return null;var r=e.getBoundingClientRect();var cs=getComputedStyle(e);'
          + 'return {w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.left),y:Math.round(r.top),'
          + 'display:cs.display,visibility:cs.visibility,opacity:cs.opacity,'
          + 'hidden:!!e.hidden||cs.display==="none"};}())'),
        /** 真按一下（走原生 click：命中盒与事件路径一起验）。 */
        click: (sel) => ev('(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');'
          + 'if(!e)return false;e.click();return true;}())'),
        focus: (sel) => ev('(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');'
          + 'if(!e)return false;e.focus();return true;}())'),
        /** 真打字：设值 ＋ 派发 `input`（与用户键盘路径同一条事件）。 */
        type: (sel, text) => ev('(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');'
          + 'if(!e)return false;e.value=' + JSON.stringify(text) + ';'
          + 'e.dispatchEvent(new Event("input",{bubbles:true}));return true;}())'),
        /** 敲回车（可带修饰键；`composing` 为真时带 `isComposing` ＝ IME 组字中）。 */
        enter: (sel, mods) => ev('(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');'
          + 'if(!e)return false;e.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true'
          + (mods && mods.shift ? ',shiftKey:true' : '') + (mods && mods.composing ? ',isComposing:true' : '') + '}));return true;}())'),
        close: async () => {
          try { await cdp.send('Target.closeTarget', { targetId }); } catch { /* 已关 */ }
          try { rmSync(dir, { recursive: true, force: true }); } catch { /* 临时目录 */ }
        },
      };
      pages.push(handle);
      return handle;
    },
    close: () => {
      for (const p of pages) { try { void p.close(); } catch { /* 已关 */ } }
      cdp.close(); cleanup();
    },
  };
}

/** 一页一用的便利口（起浏览器 → 开页 → 跑 → 关）。起不来返回 `null`。 */
export async function startF6Page(html, opts) {
  const browser = await launchF6(opts);
  if (browser === null) return null;
  try {
    const page = await browser.open(html, opts);
    const origClose = page.close;
    page.close = async () => { await origClose(); browser.close(); };
    return page;
  } catch (e) { browser.close(); throw e; }
}

export { sleep };
