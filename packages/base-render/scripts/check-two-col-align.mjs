#!/usr/bin/env node
/** 两列表「同列对位」几何门（公共层判据件，来源 #879；#884 是它的同族读数）。
 *
 * **为什么是几何门而不是文本判据**：#879 的缺陷（表头与同列的值落在两条对位线上）在四门
 * 全绿、机审六列全 0 的情况下漏到了人工收口 —— 静态文本里看不出「表头贴左、值贴右」。
 * 这类缺陷只有真浏览器量得出，判据就必须量在真浏览器里。
 *
 * 判什么（逐页逐表，按列的**实际对齐档**分派，不按列数猜）：
 *  · 表头可见时：每一列的 `<th>` 与同列每个 `<td>` 必须**同一条对位线** ——
 *    两枚都是 right 判**右缘**、都是 left 判**左缘**、都是 center 判**中心**；
 *    **两档不一致即判红**（那正是 #879 的缺陷形态：`td` 被单边规则右对齐、`th` 还是 left）；
 *    容差 2px（子像素与字体度量）。
 *  · 表头隐藏时（窄档卡片化，`thead{display:none}`）：不比表头与值的对位（表头都收起了），
 *    只判「值都在、没被裁」——这一档的对位口径见窄档卡片规则本身。
 *  · 表头隐藏时**另加两条内距读数**（#919，只对「一行一条事实」那一型 —— 表头收起 ＋ 首格没有
 *    标签回填）：① 表标题文字左缘与首格文字左缘必须落在同一条竖线（容差 2px）；② 行文字到卡片
 *    左右边框各留 ≥`MIN_INSET_PX`。为什么这两条只有真浏览器量得出：#919 实测这一型把行的左右
 *    内距写成了 0 ⇒ 文字压在卡片边框上，而同一张表的标题有 10px 内距；静态文本里只看得见
 *    「有没有写 padding」，看不见「看上去贴不贴边、标题和行对不对得齐」。
 *
 * 为什么要按档分派：只判右缘会把**左对齐的键值表**全部判红（表头右缘与值右缘天然相差
 * 「谁更长」那一段），那是误报。#879 改后实测：表头右缘 204.45 vs 值右缘 349（差 144.55），
 * 而两枚文字的左缘同为 167、差 0 —— 差在右缘、对在位，判据必须看得出这个区别。
 *
 * 用法（仓根）：
 *   node packages/base-render/scripts/check-two-col-align.mjs --dir <页群目录> [--widths 1280,768,390]
 *   （--dir 递归收页，含子目录；单文件直接列路径，可重复）
 *   node packages/base-render/scripts/check-two-col-align.mjs <a.html> <b.html> …
 *   加 `--json <文件>` 即多写一份逐页逐表机器读数（含零表页，不改变屏幕输出）。
 *
 * 退出码：0 ＝ 全绿；1 ＝ 有判红（逐条点名）；2 ＝ 输入缺失／无浏览器（不静默变绿）。
 * 依赖：本机 headless Chrome／Edge（`DSH_BROWSER=<路径>` 可指定）、Node ≥ 22。**零第三方依赖。**
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const P = 'ilife-';
const TOL_PX = 2;
/** 窄档「一行一条事实」那一型的左右内距下限（#919）：行文字到卡片边框的缝低于此即判红。 */
const MIN_INSET_PX = 8;
const DEFAULT_WIDTHS = [1280, 768, 390];
const LF = String.fromCharCode(10);

function argOf(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const WIDTHS = argOf('--widths', '').split(',').filter((s) => s !== '').map(Number);
if (WIDTHS.length === 0) WIDTHS.push(...DEFAULT_WIDTHS);
/** 机器输出（#884 批量汇总的输入）：逐页逐表行，不改变默认人类输出。 */
const JSON_OUT = argOf('--json', '');
const FLAGS = ['--dir', '--widths', '--timeout', '--json'];
const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !FLAGS.includes(all[i - 1]));
const DIR = argOf('--dir', '');
const TIMEOUT_MS = Number(argOf('--timeout', '30000'));

function die(code, msg) {
  console.log('RESULT: ABORT exit=' + code + ' :: ' + msg);
  process.exit(code);
}

const FILES = [...positional.map((p) => resolve(p))];
if (DIR !== '') {
  const dir = resolve(DIR);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) die(2, '目录不存在：' + dir);
  /** 递归收页（#884）：子目录页与顶层同等受检，不静默漏测。 */
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const abs = join(d, f);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (f.toLowerCase().endsWith('.html')) FILES.push(abs);
    }
  };
  walk(dir);
  FILES.sort();
}
if (FILES.length === 0) die(2, '没有输入页面：给一组 HTML 路径，或用 --dir <目录>');

const BROWSER = [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined) {
  die(2, '未找到 Chrome／Edge：本判据量的是**真浏览器里的版面事实**，静态 HTML 查不到。用 DSH_BROWSER=<路径> 指定。');
}

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const PORT = 9611 + (process.pid % 300);
const chrome = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--remote-debugging-port=' + PORT, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });

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
      if (msg.error) reject(new Error(msg.error.message)); else res(msg.result);
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => rej(new Error('CDP WebSocket 连接失败')));
  });
  return {
    ready,
    send(method, params, sessionId) {
      const id = nextId++;
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
      });
    },
    close() { ws.close(); },
  };
}

/** 页内读数：逐表逐列拿表头与同列每个数据的**文字盒**（`Range.getClientRects` 的并集：
 *  多行折行时取能代表该列的那一枚 —— 左对齐取最小左缘、右对齐取最大右缘、居中取中心）。 */
const PROBE = `(function () {
  var P = ${JSON.stringify(P)};
  function textBox(el) {
    var rng = document.createRange(); rng.selectNodeContents(el);
    var rs = rng.getClientRects();
    if (rs.length === 0) { var b = el.getBoundingClientRect(); return { left: b.left, right: b.right, cx: (b.left + b.right) / 2, empty: true }; }
    var mn = rs[0], mx = rs[0];
    for (var i = 1; i < rs.length; i += 1) { if (rs[i].left < mn.left) mn = rs[i]; if (rs[i].right > mx.right) mx = rs[i]; }
    return { left: mn.left, right: mx.right, cx: (mn.left + mx.right) / 2, empty: false };
  }
  var out = [];
  var cards = document.querySelectorAll('.' + P + 'block-data-table');
  for (var ci = 0; ci < cards.length; ci += 1) {
    var t = cards[ci].querySelector('table');
    if (!t) continue;
    var ths = t.querySelectorAll('thead tr > th'), trs = t.querySelectorAll('tbody > tr');
    if (ths.length === 0 || trs.length === 0) continue;
    var thead = t.querySelector('thead');
    var headVisible = thead !== null && getComputedStyle(thead).display !== 'none' && ths[0].getBoundingClientRect().height > 0;
    /* #919 内距读数：表标题文字左缘、首/末格文字盒、卡片边框盒，以及首格是否带标签回填。 */
    var cap = cards[ci].querySelector('.' + P + 'block-data-table-caption');
    var capLeft = cap === null ? null : textBox(cap).left;
    var boxes = null;
    if (trs.length > 0) {
      var tds0 = trs[0].querySelectorAll('td');
      if (tds0.length > 0) {
        var cardBox = cards[ci].getBoundingClientRect();
        boxes = {
          cardLeft: cardBox.left, cardRight: cardBox.right,
          firstCellLeft: textBox(tds0[0]).left,
          lastCellRight: textBox(tds0[tds0.length - 1]).right,
          noLabel: getComputedStyle(tds0[0], '::before').content === 'none',
          /* 折叠体（details 收起）里的表全零盒：零盒不算读数，否则会把「没渲染」读成「内距 0」。 */
          rendered: cardBox.width > 1 && cardBox.height > 1 && tds0[0].getBoundingClientRect().height > 1,
          /* 再加一道可见性判据（Chrome 的 checkVisibility）：收起的 details 内容一律不参与内距判。
             老引擎没有这个方法时退回 true（不因此判红）。 */
          visible: typeof tds0[0].checkVisibility === 'function' ? tds0[0].checkVisibility() : true,
        };
      }
    }
    var cols = [];
    for (var c = 0; c < ths.length; c += 1) {
      var align = getComputedStyle(ths[c]).textAlign;
      var headBox = textBox(ths[c]);
      var worst = 0, worstRow = -1, mismatched = 0, rowsSeen = 0, cellAligns = {};
      for (var r = 0; r < trs.length; r += 1) {
      var tds = trs[r].querySelectorAll('td');
        if (tds.length !== ths.length) continue;
        var cs = getComputedStyle(tds[c]);
        cellAligns[cs.textAlign] = 1;
        rowsSeen += 1;
        if (!headVisible) continue;
        var cellBox = textBox(tds[c]);
        var d;
        if (align === 'right' && cs.textAlign === 'right') d = Math.abs(cellBox.right - headBox.right);
        else if (align === 'left' && cs.textAlign === 'left') d = Math.abs(cellBox.left - headBox.left);
        else if (align === 'center' && cs.textAlign === 'center') d = Math.abs(cellBox.cx - headBox.cx);
        else { mismatched += 1; d = 9999; }
        if (d > worst) { worst = d; worstRow = r; }
      }
      cols.push({
        col: c + 1, label: (ths[c].textContent || '').slice(0, 24),
        thAlign: align, cellAligns: Object.keys(cellAligns).join('/'),
        rowsSeen: rowsSeen, headVisible: headVisible, mismatched: mismatched,
        worst: Math.round(worst * 100) / 100, worstRow: worstRow,
      });
    }
    out.push({ card: ci + 1, cols: cols, rows: trs.length, colCount: ths.length, headVisible: headVisible,
      captionLeft: capLeft, boxes: boxes });
  }
  return { overflow: document.documentElement.scrollWidth - window.innerWidth, tables: out };
}())`;

const devUrl = await devtoolsUrl();
if (devUrl === null) { chrome.kill(); die(2, 'CDP 未建立：DevTools 端口未就绪（' + PORT + '）'); }
const cdp = connect(devUrl);
await cdp.ready;
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => cdp.send(m, p, sessionId);
await s('Page.enable');
const evaluate = async (expression) => {
  const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('Runtime.evaluate 抛错：' + JSON.stringify(r.exceptionDetails).slice(0, 240));
  return r.result.value;
};

/** 一条判红：逐条点名（页面 ＋ 表序 ＋ 列序 ＋ 实际读数 ＋ 差多少）。 */
const reds = [];
/** 逐页逐表机器行（#884）：零表页也留一条空表记录，不静默丢页。 */
const report = [];
let checked = 0;
let tables = 0;
/** 受内距判据检的表数（#919，只数「一行一条事实」那一型）。 */
let insetChecked = 0;
for (const W of WIDTHS) {
  await s('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const f of FILES) {
    const page = basename(f);
    await s('Page.navigate', { url: 'file:///' + f.replace(/\\/g, '/') });
    await sleep(140);
    let r;
    try {
      r = await evaluate(PROBE);
    } catch (e) {
      reds.push('[' + W + '] ' + page + ' 读数失败：' + String(e.message).slice(0, 160));
      continue;
    }
    report.push({ page, width: W, tables: r.tables.map((t) => ({
      card: t.card, rows: t.rows, colCount: t.colCount, headVisible: t.headVisible, cols: t.cols,
      inset: t.boxes === null ? null : {
        left: Math.round((t.boxes.firstCellLeft - t.boxes.cardLeft) * 100) / 100,
        right: Math.round((t.boxes.cardRight - t.boxes.lastCellRight) * 100) / 100,
        captionToCellLeft: t.captionLeft === null
          ? null : Math.round(Math.abs(t.captionLeft - t.boxes.firstCellLeft) * 100) / 100,
      },
    })) });
    if (r.tables.length === 0) continue;
    tables += 1;
    for (const t of r.tables) {
      for (const c of t.cols) {
        if (!c.headVisible) continue;                       // 窄档卡片化：表头收起，不比表头对位
        checked += 1;
        if (c.mismatched > 0) {
          reds.push('[' + W + '] ' + page + ' 表' + t.card + ' 第' + c.col + '列「' + c.label + '」：表头档=' + c.thAlign
            + ' 数据档=' + c.cellAligns + '（同列两档不一致）');
        } else if (c.worst > TOL_PX) {
          reds.push('[' + W + '] ' + page + ' 表' + t.card + ' 第' + c.col + '列「' + c.label + '」：' + c.thAlign
            + ' 档对位线差 ' + c.worst + 'px（第' + (c.worstRow + 1) + ' 行最大，容差 ' + TOL_PX + 'px）');
        }
      }
      /* #919 内距（只判「一行一条事实」那一型：表头收起 ＋ 首格无标签回填 ＋ 恰两列）。 */
      if (!t.headVisible && t.colCount === 2 && t.boxes !== null && t.boxes.noLabel
        && t.boxes.rendered === true && t.boxes.visible === true) {
        if (t.captionLeft !== null) {
          const d = Math.abs(t.captionLeft - t.boxes.firstCellLeft);
          if (d > TOL_PX) {
            reds.push('[' + W + '] ' + page + ' 表' + t.card + '：表标题文字左缘与首格文字左缘差 '
              + Math.round(d * 100) / 100 + 'px（容差 ' + TOL_PX + 'px）');
          }
        }
        const insL = t.boxes.firstCellLeft - t.boxes.cardLeft;
        const insR = t.boxes.cardRight - t.boxes.lastCellRight;
        if (insL < MIN_INSET_PX || insR < MIN_INSET_PX) {
          reds.push('[' + W + '] ' + page + ' 表' + t.card + '：行文字到卡片边框内距 左 '
            + Math.round(insL * 100) / 100 + 'px／右 ' + Math.round(insR * 100) / 100 + 'px（下限 ' + MIN_INSET_PX + 'px）');
        }
        insetChecked += 1;
      }
    }
    if (r.overflow > 0) reds.push('[' + W + '] ' + page + ' 横向溢出 ' + r.overflow + 'px');
  }
}

for (const red of reds) console.log('✗ ' + red);
console.log('RESULT: ' + (reds.length === 0 ? '对位全绿' : '判红 ' + reds.length + ' 条')
  + '；页数=' + FILES.length + ' 档=' + WIDTHS.join('/') + ' 含表页=' + tables
  + ' 受检列=' + checked + ' 容差=' + TOL_PX + 'px 受检内距表=' + insetChecked);
if (JSON_OUT !== '') {
  const out = resolve(JSON_OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({
    gate: 'two-col-align', widths: WIDTHS, tolerancePx: TOL_PX, at: new Date().toISOString(),
    pages: report, reds,
  }, null, 2) + LF, 'utf8');
  console.log('JSON-WROTE ' + out);
}
cdp.close();
chrome.kill();
process.exit(reds.length === 0 ? 0 : 1);
