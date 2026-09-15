#!/usr/bin/env node
/** #523 返修 R3 · **渲染面探针**：分布条类名截断 ＋ 记录表数值列对齐（视觉复评 R2 的两处硬伤）。
 *
 * 为什么必须是真浏览器：两处硬伤都不是 HTML 文本事实，而是**版面事实**——
 *   ① 类名截断＝`scrollWidth > clientWidth` 且 `overflow-x` 为 `hidden`／`clip`（悄悄丢字，不是横滑）；
 *   ② 列对齐＝`td` 的**计算样式**（`text-align` 与 `font-family`），源码里有没有那条类名只是必要条件。
 * 静态比对查不出这两条，故本探针走 headless Chrome ＋ CDP（零第三方依赖，做法照抄
 * `packages/skill-calorie/scripts/measure-responsive.mjs` 的浏览器夹具，只换判据与页集）。
 *
 * 判据（任一破即该页该档失败、退出码非 0）：
 *   T1 **无静默截断**：整页不得有「`scrollWidth > clientWidth+1` 且 `overflow-x:hidden|clip`」的元素。
 *   T2 **无横向溢出**：`documentElement.scrollWidth − innerWidth` ＝ 0（与 `measure-responsive` 同口径）。
 *   T3 **数值列右对齐且等宽**（只在最宽档判，窄屏表格行卡化后由公共层 #541 的交错轴承担）：
 *      带 `data-label` 的 `td`，标签在 数值列集 里 ⇒ `text-align:right` 且 `font-family` 含 `mono`；
 *      标签在 文字列集 里 ⇒ `text-align:left`。
 *
 * 用法（仓根）：
 *   node docs/skills/skill-calorie/t523-截断探针.mjs --dir .scratch/t523/out [--json 读数.json] [--widths 390,768,1440]
 *   DSH_BROWSER=<chrome 路径> 可指定浏览器；找不到浏览器即 exit 2（不静默变绿）。
 * 退出：0＝**本票 17 页**全绿；1＝本票有页面有档位破判据；2＝缺依赖／缺输入。
 * 范围外页（#524 回执族／#525 力量·有氧·类型分布·复盘·趋势族）**读数照打、标 `[范围外]`、不进退出码**
 * ——同 `measure-responsive.mjs` 的 `--exclude` 口径：放宽必须逐件写在明处，不当默认。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
/** 数值列 / 文字列（#523 记录级明细那八列；不在集合里的标签一律不判，别的页形不受牵连）。 */
const NUM_COLS = ['时长', '消耗', '距离', '心率'];
const TEXT_COLS = ['日期', '类型', '分类', '备注'];
/** 本票 17 页（票面：汇总 12 ＋ 记录级明细 5 ＋ 对照目标 2；逐字照证据件 §三 的页名清单）。 */
const IN_SCOPE = ['14-看今日运动', '15-看昨日运动', '16-看本周运动', '17-看上周运动', '18-看本月运动',
  '19-看上月运动', '20-看最近 7 天运动', '21-看最近 30 天运动', '22-看某段时间运动', '23-看今日运动（vs 目标）',
  '24-看本周运动（vs 目标）', '25-看运动记录（有备注）', '26-看运动记录（按力量筛选）', '27-看运动记录（按有氧筛选）',
  '28-看最近 60 天运动', '29-看最近 180 天运动', '30-看最近 365 天运动'];

function argOf(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const DIR = resolve(ROOT, argOf('--dir', '.scratch/t523/out'));
/** `--files a.html,b.html`：只量这几件（变异复核用，省得为两页跑满 39 件）。 */
const ONLY = argOf('--files', '').split(',').filter((s) => s !== '');
/** `--measure <选择器>`：逐档量这些元素的盒（宽／高／display／min-height），用来复核「触摸目标 ≥44px」。 */
const MEASURE = argOf('--measure', '');
const JSON_OUT = argOf('--json', '');
const WIDTHS = argOf('--widths', '390,768,1440').split(',').filter((s) => s !== '').map(Number);
if (WIDTHS.length === 0) { console.log('RESULT: ABORT exit=2 :: --widths 为空'); process.exit(2); }

function die(code, msg) { console.log('RESULT: ABORT exit=' + code + ' :: ' + msg); process.exit(code); }

const BROWSER = [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined) die(2, '未找到 Chrome／Edge：本探针的判据是渲染面事实，没有浏览器就是实证缺失。用 DSH_BROWSER=<路径> 指定。');

const files = existsSync(DIR)
  ? readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.html'))
    .filter((f) => ONLY.length === 0 || ONLY.includes(f)).map((f) => join(DIR, f))
  : [];
if (files.length === 0) die(2, '没有输入页面：--dir 下没有 .html（' + DIR + '）');

/* ── 页内读数：T1 截断 / T2 溢出 / T3 列对齐 ───────────────────────────── */
const PROBE = `(function () {
  var doc = document.documentElement;
  var trunc = [], cells = [], cols = ${JSON.stringify({ num: NUM_COLS, text: TEXT_COLS })};
  var els = document.querySelectorAll('body *');
  for (var i = 0; i < els.length; i += 1) {
    var el = els[i], cs = getComputedStyle(el);
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1
        && (cs.overflowX === 'hidden' || cs.overflowX === 'clip')) {
      trunc.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 60),
        text: String(el.textContent || '').slice(0, 24), cw: el.clientWidth, sw: el.scrollWidth });
    }
    if (el.tagName === 'TD' && el.dataset && el.dataset.label) {
      var lab = el.dataset.label;
      var kind = cols.num.indexOf(lab) >= 0 ? 'num' : (cols.text.indexOf(lab) >= 0 ? 'text' : '');
      if (kind !== '') cells.push({ label: lab, kind: kind, align: cs.textAlign,
        mono: /mono/i.test(cs.fontFamily), tnum: cs.fontVariantNumeric.indexOf('tabular-nums') >= 0 });
    }
  }
  return { innerWidth: window.innerWidth, docScrollWidth: doc.scrollWidth,
    trunc: trunc.slice(0, 6), truncCount: trunc.length, cells: cells.slice(0, 400), cellCount: cells.length };
}())`;

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const PORT = 9700 + (process.pid % 250);
const profile = mkdtempSync(join(tmpdir(), 't523-probe-'));
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });

async function devtoolsUrl() {
  for (let waited = 0; waited < 30000; waited += 250) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch { /* 端口未就绪 */ }
    await sleep(250);
  }
  return null;
}
function connect(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve: res, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else res(msg.result);
    }
  });
  const ready = new Promise((res, reject) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => reject(new Error('CDP WebSocket 连接失败')));
  });
  return {
    ready,
    send(method, params, sessionId) {
      const id = nextId++;
      return new Promise((res, reject) => {
        pending.set(id, { resolve: res, reject });
        ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
      });
    },
    close() { ws.close(); },
  };
}

const devUrl = await devtoolsUrl();
if (devUrl === null) { chrome.kill(); die(2, 'CDP 未建立：DevTools 端口未就绪（' + PORT + '）'); }
const cdp = connect(devUrl);
await cdp.ready;
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => cdp.send(m, p, sessionId);
const evaluate = async (expression) => {
  const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('Runtime.evaluate 抛错：' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result ? r.result.value : undefined;
};
await s('Page.enable');
await s('Runtime.enable');

console.log('# #523 截断／对齐探针 dir=' + DIR + ' widths=' + WIDTHS.join('/') + ' browser=' + BROWSER);
const rows = [];
let failed = 0;
let outFailed = 0;
for (const file of files) {
  const name = basename(file);
  const inScope = IN_SCOPE.some((x) => name.startsWith(x));
  const row = { name, inScope, widths: {} };
  const wide = Math.max(...WIDTHS);
  for (const width of WIDTHS) {
    await s('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    await s('Page.navigate', { url: pathToFileURL(file).href });
    for (let i = 0; i < 80; i += 1) { if (await evaluate('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(120);
    const probe = await evaluate(PROBE);
    const box = MEASURE === '' ? null : await evaluate(
      '(function(){var out=[];var els=document.querySelectorAll(' + JSON.stringify(MEASURE) + ');'
      + 'for(var i=0;i<els.length;i++){var r=els[i].getBoundingClientRect();var cs=getComputedStyle(els[i]);'
      + 'out.push({t:(els[i].textContent||"").trim().slice(0,12),w:Math.round(r.width),h:Math.round(r.height),'
      + 'd:cs.display,mh:cs.minHeight,pad:cs.paddingInlineStart+" "+cs.paddingInlineEnd});}return out;}())');
    const overflow = probe.docScrollWidth - probe.innerWidth;
    const why = [
      probe.truncCount > 0 ? 'T1-截断=' + probe.truncCount : '',
      overflow > 0 ? 'T2-溢出+' + overflow : '',
    ].filter((x) => x !== '').join('｜');
    // T3 只在**桌面档（≥641）**判：≤640 表格已行卡化（公共层 #541 把列对齐收回 left、值靠容器右缘），
    // 那一档量 `text-align` 必然 left —— 拿它当红就是**工具的假红**（`--widths 390` 单档跑过会中招）。
    const cellBad = width >= 641
      ? probe.cells.filter((c) => (c.kind === 'num' && (c.align !== 'right' || !c.mono)) || (c.kind === 'text' && c.align !== 'left'))
      : [];
    const all = [why, cellBad.length > 0 ? 'T3-列档=' + cellBad.length : ''].filter((x) => x !== '').join('｜');
    row.widths[width] = { overflow, truncCount: probe.truncCount, trunc: probe.trunc, cellCount: probe.cellCount,
      cellBad: cellBad.slice(0, 4), why: all, ok: all === '', box };
    if (all !== '') { if (inScope) failed += 1; else outFailed += 1; }
  }
  rows.push(row);
  const line = WIDTHS.map((w) => {
    const c = row.widths[w];
    return String(w).padStart(4) + '档:' + (c.ok ? '✓' : '✗ ' + c.why);
  }).join('  ');
  console.log('  ' + name.padEnd(40) + line + '  格=' + row.widths[wide].cellCount + (inScope ? '' : '  [范围外]'));
  for (const w of WIDTHS) {
    const c = row.widths[w];
    if (c.truncCount > 0) console.log('      截断@' + w + ' ' + JSON.stringify(c.trunc));
    if (c.cellBad.length > 0) console.log('      列档@' + w + ' ' + JSON.stringify(c.cellBad));
    if (c.box !== null && c.box.length > 0) console.log('      量@' + w + ' ' + JSON.stringify(c.box));
  }
}
cdp.close();
chrome.kill();
for (let i = 0; i < 10; i += 1) { try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(200); } }
if (JSON_OUT !== '') {
  const out = resolve(ROOT, JSON_OUT);
  writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), widths: WIDTHS, dir: DIR, rows }, null, 2) + String.fromCharCode(10), 'utf8');
  console.log('JSON-WROTE ' + out);
}
const cells = rows.length * WIDTHS.length;
console.log('TRUNC-SCAN pages=' + rows.length + ' cells=' + cells + ' failed=' + failed
  + ' scopeOutFailed=' + outFailed + ' RESULT: ' + (cells - failed - outFailed) + '/' + (cells - outFailed)
  + '（本票 ' + rows.filter((r) => r.inScope).length + ' 页）');
process.exit(failed === 0 ? 0 : 1);
