#!/usr/bin/env node
/** #877 · 列表查询页族空态卡满宽探针（**本票的判据工具**，入仓随证据走）。
 *
 * 为什么单写一件：本票的症状是「空态卡在桌面档只占两列栅格的第一列」，零溢出／`toc=1`／机审六列
 * 全绿都抓不到它——判据必须是**真浏览器里的几何事实**（卡宽 vs 版心宽），静态 HTML 文本比对查不出。
 * 形状照 `packages/skill-calorie/scripts/measure-responsive.mjs`（同一条 CDP 起法、同一条退出码约定）。
 *
 * 量什么（每件每档三个数，判据只看前两个）：
 *   ① `gridSpan`：`#list .ilife-empty` 的 `getComputedStyle().gridColumnStart/End` —— 跨满两列须为 `1`／`-1`；
 *   ② `rightGap`：空态卡右边缘到同页基准面板（首个 `.panel`）右边缘的距离 —— 满宽须 ≈ 0；
 *   ③ `cardW`／`panelW`：上两个数的原始宽度（人读）。
 *   `#list` 只存在于 `memo_query` 一族；**空态件必须真渲染出来**（`items` 为空的格），否则判「NA 不适用」。
 *
 * 用法（仓根）：
 *   node tooling/run-locked.mjs --ticket 877 -- node packages/skill-memo-ilife/scripts/check-listpage-empty-span.mjs --dir <批目录>
 *   node packages/skill-memo-ilife/scripts/check-listpage-empty-span.mjs <a.html> [b.html …] [--width 1280]
 * 选项：`--dir <目录>`（逐件 .html）／`--width <n>`（缺省 1280）／`--json <落点>`／`--label <名>`／`--timeout <毫秒>`。
 * 退出码：0 全绿（含「本批无适用的空态格」）；1 有格越线（逐格点名 ＋ 读数）；2 用法错／浏览器起不来。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const die = (code, msg) => { console.error(msg); process.exit(code); };
const argOf = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const WIDTH = Number(argOf('--width', '1280'));
const LABEL = argOf('--label', 'empty-span');
const TIMEOUT_MS = Number(argOf('--timeout', '30000'));
const JSON_OUT = argOf('--json', '');
if (!Number.isFinite(WIDTH) || WIDTH <= 0) die(2, '--width 必须是正数：' + argOf('--width', ''));

const dir = argOf('--dir', '');
/** 位置参数＝剩下的、带 .html 尾的实参（选项的取值天然不带该尾，故不必逐个排除）。 */
const OPT_WITH_VALUE = ['--dir', '--width', '--json', '--label', '--timeout'];
const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--')
  && !OPT_WITH_VALUE.includes(all[i - 1] ?? '') && /\.html?$/i.test(a));
const files = [...new Set([
  ...(dir === '' ? [] : readdirSync(resolve(dir)).filter((f) => f.toLowerCase().endsWith('.html')).map((f) => join(resolve(dir), f))),
  ...positional,
])].map((p) => resolve(p)).filter((p) => existsSync(p));
if (files.length === 0) die(2, '没有输入页面：给一组 HTML 路径，或用 --dir <目录>。');

/* ── 找浏览器（找不到即显式失败，不静默跳过） ───────────────────────────── */
const BROWSER = [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined) die(2, '未找到 Chrome／Edge：本票判据是**真浏览器里的版面事实**，静态 HTML 查不到 → 实证缺失。用 DSH_BROWSER=<路径> 指定。');

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const PORT = 9811 + (process.pid % 300);
const profile = mkdtempSync(join(tmpdir(), 't877-profile-'));
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });

async function devtoolsUrl() {
  for (let waited = 0; waited < TIMEOUT_MS; waited += 250) {
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

/** 页内读数（唯一事实源）：`#list` 里的空态卡几何 ＋ 同页基准面板右边缘。 */
const PROBE = `(function () {
  var list = document.getElementById('list');
  if (!list) return { state: 'no-list' };
  var empty = list.querySelector('.ilife-empty');
  if (!empty) return { state: 'no-empty', items: list.querySelectorAll('.item').length };
  var ref = document.querySelector('.panel');
  var e = empty.getBoundingClientRect();
  var r = ref ? ref.getBoundingClientRect() : null;
  var cs = getComputedStyle(empty);
  var g = list.getBoundingClientRect();
  var kids = Array.prototype.slice.call(list.children);
  var firstGcs = kids.length ? getComputedStyle(kids[0]).gridColumnStart : null;
  var colStr = cs2(list);
  // 数格子用正则数（'px' 出现次数）：**不用 split / filter** —— 页面脚本里有同名标识符会把这些数组方法遮住，
  // 实测被遮住后 filter 不生效、列数恒为 1，两列档被误判成单列档（判据静默失效）。
  var colCount = (String(colStr).match(/px/g) || []).length;
  var twoCol = colCount > 1;
  function cs2(el) { return getComputedStyle(el).gridTemplateColumns; }
  return {
    state: 'ok',
    gridColumnStart: cs.gridColumnStart, gridColumnEnd: cs.gridColumnEnd,
    twoCol: twoCol, colCount: colCount, firstChildGridColumnStart: firstGcs,
    cardW: Math.round(e.width), cardLeft: Math.round(e.left), cardRight: Math.round(e.right),
    panelW: r ? Math.round(r.width) : null, panelLeft: r ? Math.round(r.left) : null, panelRight: r ? Math.round(r.right) : null,
    listW: Math.round(g.width), innerWidth: window.innerWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    cols: colStr };
}())`;

const devUrl = await devtoolsUrl();
if (devUrl === null) { chrome.kill(); die(2, 'CDP 未建立：DevTools 端口未就绪（' + PORT + '）'); }
const cdp = connect(devUrl);
await cdp.ready;
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => cdp.send(m, p, sessionId);
async function evaluate(expression) {
  const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('Runtime.evaluate 抛错：' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result ? r.result.value : undefined;
}
await s('Page.enable');
await s('Runtime.enable');

console.log('# 空态卡满宽读数 label=' + LABEL + ' width=' + WIDTH + ' browser=' + BROWSER);
const rows = [];
let bad = 0;
let applicable = 0;
for (const file of files) {
  const name = basename(file);
  const html = readFileSync(file, 'utf8');
  const sha = html.length;
  const row = { name, bytes: sha, state: '', verdict: '', probe: null };
  if (!/#list\b/.test(html) || !/ilife-empty/.test(html)) {
    row.state = '无 #list／无空态件';
    row.verdict = 'NA 不适用（本页不带 #list 空态面）';
    rows.push(row);
    console.log('  ' + name + '  NA 不适用（不带 #list 空态面）');
    continue;
  }
  await s('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: WIDTH < 768 });
  await s('Page.navigate', { url: pathToFileURL(file).href });
  for (let i = 0; i < 80; i += 1) {
    if (await evaluate('document.readyState === "complete"') === true) break;
    await sleep(50);
  }
  await sleep(180);
  const probe = await evaluate(PROBE);
  if (process.env.T877_DUMP === '1') console.log('  DEBUG probe=' + JSON.stringify(probe));
  row.probe = probe;
  if (probe.state === 'no-list') { row.state = '无 #list'; row.verdict = 'NA 不适用'; rows.push(row); console.log('  ' + name + '  NA 不适用（无 #list）'); continue; }
  if (probe.state === 'no-empty') {
    row.state = '有 #list 无空态件（items=' + probe.items + '）';
    row.verdict = 'NA 不适用（本页有行，不走空分支）';
    rows.push(row);
    console.log('  ' + name + '  NA 不适用（有行 ' + probe.items + ' 条，不走空分支）');
    continue;
  }
  applicable += 1;
  const twoCol = probe.twoCol === true;
  const colCount = probe.colCount;
  const rightGap = probe.panelRight === null ? null : probe.panelRight - probe.cardRight;
  // 行判据分两档（**只看这一档算得出的那条**，别把虚条件当判据）：
  //   两列档（>820px，本票的病就长在这儿）：须跨满两列（`gridColumn:1/-1`）且右缘对齐基准面板；
  //   单列档（≤820px，`#list` 已塌成一列）：`1/-1` 在单列里恒成立＝**虚条件**，只判右缘对齐。
  // 右缘判据另加守卫：基准面板须与 `#list` 同宽（同一版心）才可用——不同宽时判据不成立，报 NA，不产假红/假绿。
  const colsSingle = colCount === 1;
  const colsTwo = colCount === 2;
  const sameWidth = probe.panelW !== null && Math.abs(probe.panelW - probe.listW) <= 1;
  const spanOk = twoCol ? (String(probe.gridColumnStart) === '1' && String(probe.gridColumnEnd) === '-1') : true;
  const gapOk = sameWidth && rightGap !== null && Math.abs(rightGap) <= 1;
  const ok = spanOk && gapOk;
  row.state = '空态件在位';
  row.verdict = ok ? 'PASS' : 'FAIL';
  row.metrics = {
    gridColumnStart: probe.gridColumnStart, gridColumnEnd: probe.gridColumnEnd,
    twoCol, colCount, firstChildGridColumnStart: probe.firstChildGridColumnStart,
    cardW: probe.cardW, panelW: probe.panelW, rightGap, listW: probe.listW, cols: probe.cols,
  };
  if (!ok) bad += 1;
  const why = [
    twoCol && !spanOk && colsTwo ? '两列档未跨满两列' : '',
    !sameWidth ? '基准面板与 #list 不同宽（' + probe.panelW + '≠' + probe.listW + '）⇒ 右缘判据不成立' : '',
    sameWidth && !gapOk ? '右缘未对齐' : '',
    !colsSingle && !colsTwo ? '栅格列数与两档都不符（' + colCount + ' 列：' + probe.cols + '）' : '',
  ].filter((x) => x !== '').join('；');
  console.log('  ' + name + '  ' + (ok ? 'PASS' : 'FAIL')
    + '  ' + (twoCol ? '两列档' : '单列档') + '  gridColumn=' + probe.gridColumnStart + '/' + probe.gridColumnEnd
    + '  卡宽=' + probe.cardW + ' 版心宽=' + probe.panelW + ' 右缝=' + rightGap
    + '  #list宽=' + probe.listW + ' 列=' + probe.cols
    + (why === '' ? '' : '  ✗ ' + why));
  rows.push(row);
}
writeFileSync(JSON_OUT === '' ? join(ROOT, '.scratch', 't877-' + LABEL + '.json') : resolve(JSON_OUT), JSON.stringify({ label: LABEL, width: WIDTH, browser: BROWSER, rows }, null, 2), 'utf8');
chrome.kill();
/** profile 清不掉不许盖住判据读数：Chrome 子进程退净要几十毫秒，EPERM 只是清理竞态，
 *  它是 OS 临时目录下的独占随机名，留给 OS 收即可——结论只由上面的 bad 计数决定。 */
try { await sleep(400); rmSync(profile, { recursive: true, force: true }); } catch { /* 清理失败不动结论 */ }
console.log('RESULT: 适用 ' + applicable + ' 件，越线 ' + bad + ' 件 —— ' + (bad === 0 ? 'PASS' : 'FAIL'));
process.exit(bad === 0 ? 0 : 1);
