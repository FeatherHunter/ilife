/** skeleton（加载骨架 · 形态 A「读数 ＋ 明细行骨架」）· 判据件。
 *
 *  断言对象是**本件自己的那条出口**：`dist/components/skeleton/index.js`
 *  （组件层一件一目录、目录内自足；本件不进冻结面、不从根出口）。五组：
 *   ① **渲染契约**：排头人话（`role="status"`）／`aria-busy`／读数位与 `rows` 条明细行／
 *      占位块全部 `aria-hidden`／转义面／**全部**非法入参分支（每个都断 `BlocksError`）；
 *   ② **样式与零 DOM 纪律**：scope 在 `.ilife-page-ui` 之下、零 `:root`／`!important`／新 token、
 *      皮肤只经 `skinVar` 读、**动效只动 `opacity`**、`prefers-reduced-motion` 必须停、
 *      占位底色从 token 算（`color-mix`）；
 *   ③ **加法式**：不用本件的页产物逐字节不变；三套皮肤下标记逐字节相同；
 *   ④ **真机两档几何**（headless Chrome ＋ CDP）：390／1280 零横向溢出 ＋ **行距 ＝ 34 ＋ 1** ＋
 *      高度是 `rows` 的线性式（「加载完不跳版」的可量之处）＋ 读数位高度 ＝ 2.2 × 当前皮肤字号档；
 *   ⑤ **真机动效纪律**：正常档 `animation-name` 是那支脉搏；`prefers-reduced-motion: reduce` 下
 *      `animation-name: none` 且占位块**仍看得见**（停住 ≠ 看不见）。
 *
 *  期望值一律从组件自己的常量派生（`SKELETON_*`），不抄字面量：改了名字这里跟着红，不会两处走散。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  SKELETON_CLASS, SKELETON_FORMS, SKELETON_FORM_ATTR, SKELETON_MAX_ROWS, SKELETON_NARROW_PX,
  SKELETON_PULSE_DURATION_MS, SKELETON_PULSE_MIN_OPACITY, SKELETON_PULSE_NAME, SKELETON_READING_SCALE,
  SKELETON_ROWS_ATTR, SKELETON_ROW_HEIGHT_PX, SKELETON_ROW_SEPARATOR_PX, SKELETON_STILL_OPACITY,
  SKELETON_VALUE_SLOT_PX, renderSkeleton, skeletonCss, skeletonSlot,
} from '../dist/components/skeleton/index.js';
import { ENTRY_ROW_TIME_MIN_WIDTH_PX } from '../dist/components/entry-rows/index.js';
import { SKIN_NAMES, skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把「解释」当「规则」）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** 抛错的入参（`BlocksError`：组件层与区块层共用同一个错误名）。 */
const throwsBlocks = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.name === 'BlocksError';
  }
  return false;
};

const base = (over) => Object.assign({ label: '正在读取今日饮食…', rows: 3, eta: '通常 1 秒' }, over);

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('skeleton ① 渲染契约', () => {
  it('排头人话 ＋ aria-busy ＋ 行数落机器属性', () => {
    const html = renderSkeleton(base());
    assert.ok(html.startsWith('<div class="' + SKELETON_CLASS + ' is-reading-list"'), '根用类名根打头：' + html.slice(0, 80));
    assert.ok(html.includes('aria-busy="true"'), '根上标「还在变」');
    assert.ok(html.includes(SKELETON_FORM_ATTR + '="reading-list"'), '形态落属性');
    assert.ok(html.includes(SKELETON_ROWS_ATTR + '="3"'), '行数落机器属性');
    assert.ok(html.includes('<p class="' + skeletonSlot('cap') + '" role="status">'), '排头是 status（读屏会念）');
    assert.ok(html.includes('正在读取今日饮食…'), '正在读什么上屏');
    assert.ok(html.includes('>通常 1 秒<'), '还要多久上屏');
    assert.equal((html.match(new RegExp(skeletonSlot('row') + '"', 'g')) || []).length, 3, '三条明细行');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('按真实版式排：读数位（大字 ＋ 副行）＋ 明细行三列（时间／两行名称／值），不是几条灰杠', () => {
    const html = renderSkeleton(base({ rows: 1 }));
    assert.ok(html.includes(skeletonSlot('reading')), '有读数位');
    assert.ok(html.includes(skeletonSlot('reading-value')), '读数位里有大字占位');
    assert.ok(html.includes(skeletonSlot('reading-sub')), '读数位里有副行占位');
    assert.ok(html.includes(skeletonSlot('row-time')), '明细行有时间槽');
    assert.ok(html.includes(skeletonSlot('line')) && html.includes(skeletonSlot('line-short')), '名称位两行');
    assert.ok(html.includes(skeletonSlot('row-value')), '明细行有值位');
    assert.equal((html.match(new RegExp(skeletonSlot('row') + '"', 'g')) || []).length, 1, 'rows=1 只出一条');
    assert.ok(renderSkeleton(base({ rows: SKELETON_MAX_ROWS })).includes(SKELETON_ROWS_ATTR + '="' + SKELETON_MAX_ROWS + '"'), '上限行数照收');
  });

  it('占位块全部 aria-hidden（读屏只念排头那句），读数位与明细行组都不出声', () => {
    const html = renderSkeleton(base());
    const hidden = (html.match(/aria-hidden="true"/g) || []).length;
    assert.equal(hidden, 2, '读数位与明细行组各一枚 aria-hidden：' + hidden);
  });

  it('eta 不给就不出那一格；转义：排头逐位过实体', () => {
    assert.equal(renderSkeleton(base({ eta: undefined })).includes(skeletonSlot('cap-eta')), false, '不给 eta 就不出那一格');
    const evil = '"><script>alert(1)</script>';
    const html = renderSkeleton(base({ label: evil, eta: evil }));
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签：' + html.slice(0, 160));
    assert.ok(html.includes('&lt;script&gt;') && html.includes('&quot;'), '原文以实体上屏');
  });

  it('非法入参一律 badInput（每个分支都断；行数不许静默夹）', () => {
    assert.deepEqual([...SKELETON_FORMS], ['reading-list']);
    assert.equal(SKELETON_MAX_ROWS, 12);
    assert.equal(throwsBlocks(() => renderSkeleton(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderSkeleton([])), true, '数组');
    assert.equal(throwsBlocks(() => renderSkeleton(base({ form: 'table' }))), true, '形态闭集外');
    assert.equal(throwsBlocks(() => renderSkeleton(base({ label: '' }))), true, 'label 空');
    assert.equal(throwsBlocks(() => renderSkeleton(base({ label: 1 }))), true, 'label 非串');
    assert.equal(throwsBlocks(() => renderSkeleton(base({ rows: undefined }))), true, 'rows 必填');
    assert.equal(throwsBlocks(() => renderSkeleton(base({ rows: 0 }))), true, 'rows=0');
    assert.equal(throwsBlocks(() => renderSkeleton(base({ rows: -1 }))), true, 'rows 负数');
    assert.equal(throwsBlocks(() => renderSkeleton(base({ rows: 2.5 }))), true, 'rows 非整数');
    assert.equal(throwsBlocks(() => renderSkeleton(base({ rows: '3' }))), true, 'rows 是串');
    assert.equal(throwsBlocks(() => renderSkeleton(base({ rows: SKELETON_MAX_ROWS + 1 }))), true, '超上限不静默夹');
    assert.equal(throwsBlocks(() => renderSkeleton(base({ eta: 1 }))), true, 'eta 非串');
    assert.equal(throwsBlocks(() => renderSkeleton(base({ extraClass: 'a"b' }))), true, '类名正则');
    assert.equal(throwsBlocks(() => renderSkeleton(base({ extraClass: '' }))), true, '空类名');
    assert.equal(renderSkeleton(base({ extraClass: 'mine other' })).includes('mine other'), true, '合法附加类名照收');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

/** 样式段里的选择器行（跳过 at 规则行与 keyframes 的帧行）。 */
function selectors(css) {
  return (stripComments(css).match(/^[^\s@}][^{\n]*\{/gm) || [])
    .map((s) => s.trim())
    .filter((s) => !s.startsWith('@') && !/^(?:\d+%|from|to)\s*[,\s]/.test(s));
}

describe('skeleton ② 样式与零 DOM 纪律', () => {
  const css = skeletonCss();
  const clean = stripComments(css);

  it('样式段非空，每条规则的 scope 都在 `.ilife-page-ui` 之下', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const sels = selectors(css);
    assert.ok(sels.length >= 15, '规则数不对：' + sels.length);
    for (const sel of sels) assert.ok(sel.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + sel);
  });

  it('零 `:root`／`!important`／新 token；皮肤只经 skinVar 读；占位底色从 token 算（color-mix）', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(clean.includes('--r-xl'), false);
    assert.equal(clean.includes('--pink'), false);
    const decls = clean.match(/--[a-z0-9-]+\s*:/g) || [];
    assert.equal(decls.length, 0, '不得定义新 token：' + decls.join(' '));
    const naked = [...clean.matchAll(/var\(--ilife-[a-z0-9-]+\)/g)];
    assert.deepEqual(naked, [], '手写了没有兜底链的 var(--ilife-…)：' + naked.join(' '));
    assert.ok(/color-mix\(in srgb, var\(--ilife-ink,/.test(clean), '占位底色要从 ink 算出来');
    assert.ok(clean.includes('var(--ilife-surface,'), '占位底色另一头是 surface');
  });

  it('源码级：`style.ts` 里零硬编码颜色（配色一律从 token 读）', () => {
    const src = readFileSync(join(PKG, 'src', 'components', 'skeleton', 'style.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
    const hex = code.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    assert.deepEqual(hex, [], '样式源码里不许硬编码颜色：' + hex.join(' '));
    assert.equal(/rgba?\(/.test(code), false, '不许写裸色值函数');
  });

  it('动效只动 `opacity`：脉搏的每一帧只有 opacity 一条声明', () => {
    const at = clean.indexOf('@keyframes ' + SKELETON_PULSE_NAME);
    assert.ok(at > 0, '脉搏要住样式段');
    const frames = clean.slice(clean.indexOf('{', at) + 1, clean.indexOf('}\n', at));
    const decls = frames.match(/[\w-]+\s*:/g) || [];
    assert.ok(decls.length > 0, '帧里要有声明');
    for (const d of decls) assert.equal(d.replace(/\s*:$/, ''), 'opacity', '帧里只许动 opacity：' + d);
    assert.equal(/transform|background-position|width|height|left|top:/.test(frames), false, '帧里不许动别的属性');
    assert.ok(clean.includes('animation: ' + SKELETON_PULSE_NAME + ' ' + SKELETON_PULSE_DURATION_MS + 'ms'), '动画用常量拼');
    assert.ok(frames.includes(String(SKELETON_PULSE_MIN_OPACITY)), '最暗一帧取常量（不许低到看不见）');
  });

  it('`prefers-reduced-motion: reduce` 下必须停，且停住 ≠ 看不见', () => {
    const at = clean.indexOf('@media (prefers-reduced-motion:reduce)');
    assert.ok(at > 0, '要有 reduced-motion 档');
    const block = clean.slice(at);
    assert.ok(block.includes('animation: none'), 'reduced-motion 下 animation: none');
    assert.ok(block.includes('opacity: ' + String(SKELETON_STILL_OPACITY)), '停住时换成静止的可见度');
  });

  it('几何读数取常量：行高／发丝线／读数尺度／值位列宽／时间槽读 `entry-rows`', () => {
    assert.ok(clean.includes('min-height: ' + SKELETON_ROW_HEIGHT_PX + 'px'), '行盒高取常量');
    assert.ok(clean.includes('border-top: ' + SKELETON_ROW_SEPARATOR_PX + 'px solid'), '行间发丝线取常量');
    assert.ok(clean.includes('* ' + SKELETON_READING_SCALE + ')'), '读数位高度 ＝ 字号档 × 尺度');
    assert.ok(clean.includes(String(ENTRY_ROW_TIME_MIN_WIDTH_PX) + 'px minmax(0, 1fr) minmax(0, ' + SKELETON_VALUE_SLOT_PX + 'px)'),
      '三列：时间槽读 entry-rows 的常量、值位取本件常量');
    assert.ok(/@container \(max-width: \d+px\)/.test(clean), '窄档只用容器查询判宽度');
    assert.equal(clean.includes(String(SKELETON_NARROW_PX) + 'px'), true, '窄档阈值取常量');
    assert.equal(/@media \(max-width/.test(clean), false, '不许用视口宽判窄档');
    assert.equal(/@media \(min-width/.test(clean), false, '不许用视口宽判窄档');
  });

  it('零 DOM：`dist/components/skeleton/**` 剥掉字面量与注释后不出现 DOM 名；本件没有运行时段', () => {
    const dir = join(PKG, 'dist', 'components', 'skeleton');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
    assert.ok(files.length >= 5, '本件产物应有 5 份以上：' + files.join('、'));
    assert.equal(files.some((f) => f === 'runtime.js'), false, '本件不接事件，不该有运行时段');
    for (const f of files) {
      const code = readFileSync(join(dir, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/`(?:[^`\\]|\\.)*`/g, '``')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''")
        .replace(/"(?:[^"\\]|\\.)*"/g, '""');
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f + ' 里出现了 ' + needle);
      }
    }
  });
});

/* ── ③ 加法式 ──────────────────────────────────────────────────────── */

describe('skeleton ③ 加法式（不用本件即逐字节相同）', () => {
  it('不带本件的页产物里没有它的类名；两次渲染逐字节相同', () => {
    const one = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const two = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(one, two, '两次渲染逐字节相同');
    assert.equal(one.includes(SKELETON_CLASS), false, '不带本件时不得出现它的类名');
  });

  it('样式段里的选择器全部落在本件类名或 `.ilife-page-ui` 上（不碰公共选择器）', () => {
    for (const sel of selectors(skeletonCss())) {
      assert.ok(sel.includes('skeleton') || sel.includes('page-ui'), '选择器不得碰别人：' + sel);
    }
    const clean = stripComments(skeletonCss());
    assert.equal(/^div\s*\{/m.test(clean), false, '不出现裸元素选择器');
    assert.equal(/^span\s*\{/m.test(clean), false, '不出现裸元素选择器');
  });

  it('组合子右边不带 `.ilife-page-ui` 前缀（带上去那条规则会**静默不匹配**）', () => {
    /* 2026-09 真机判据抓到过这一处：`A + .ilife-page-ui .x` 里的 `+` 落在**页面壳**上，
       要求「页面壳」是前一项的兄弟 ⇒ 那条规则一个元素都命中不了（行间发丝线就这样丢过）。 */
    for (const sel of selectors(skeletonCss())) {
      const m = /[\s>+~]+\.ilife-page-ui/.exec(sel);
      assert.equal(m, null, '组合子右边又带了页面壳前缀：' + sel);
    }
  });

  it('三套皮肤下标记逐字节相同（皮肤只换样式段）', () => {
    for (const rows of [1, 3, SKELETON_MAX_ROWS]) {
      const html = renderSkeleton(base({ rows }));
      for (const _skin of SKIN_NAMES) assert.equal(renderSkeleton(base({ rows })), html, '同一入参逐字节相同');
    }
    assert.ok(skinCss().includes('.ilife-skin-broadsheet'), '皮肤段本身在（比对用）');
  });
});

/* ── 真机夹具（headless Chrome ＋ CDP）──────────────────────────────── */

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

/** 起一页真机夹具（页面里放两个骨架：3 行与 8 行 —— 高度线性就是拿它们比的）。 */
async function startPage(opts) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const body = '<div class="ilife-page-ui">' + opts.body + '</div>';
  const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"><style>' + opts.css + '</style></head>\n'
    + '<body class="' + (opts.skinClass === undefined ? 'ilife-skin-paper' : opts.skinClass) + '">' + body + '\n</body></html>';
  const dir = mkdtempSync(join(tmpdir(), 't-skel-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, html, 'utf8');
  const profileDir = mkdtempSync(join(tmpdir(), 't-skel-chrome-'));
  const port = 9710 + (process.pid % 90);
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profileDir, '--window-size=1200,900', 'about:blank'],
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
        throw new Error('页内抛错：' + (d.exception && d.exception.description ? d.exception.description : d.text));
      }
      return r.result === undefined ? undefined : r.result.value;
    };
    await s('Page.enable'); await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: opts.width === undefined ? 390 : opts.width, height: 1200, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(150);
    await ev('window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
      + 'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rejection:"+String(e.reason));});true');
    return {
      ev,
      setWidth: (w) => s('Emulation.setDeviceMetricsOverride', { width: w, height: 1200, deviceScaleFactor: 1, mobile: false }),
      setReducedMotion: (reduce) => s('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }],
      }),
      setSkin: (skin) => ev('document.body.className=' + JSON.stringify(skin) + ';true'),
      errs: () => ev('window.__errs'),
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

const FIXTURE_CSS = () => skinCss() + '\n' + skeletonCss() + '\nbody{margin:0;padding:0}.ilife-page-ui{width:100%}';

/** 几何读数：文档与本条都不许横向溢出；行距；总高；读数位高度与字号档；占位块是否都在纸面内。 */
const GEOM_EXPR = '(function(){'
  + 'var roots=[].slice.call(document.querySelectorAll(".' + SKELETON_CLASS + '"));'
  + 'function h(e){return e.getBoundingClientRect().height;}'
  + 'function rows(x){return [].slice.call(x.querySelectorAll(".' + skeletonSlot('row') + '"));}'
  + 'return {'
  + 'de:[document.documentElement.scrollWidth,document.documentElement.clientWidth],'
  + 'overflow:roots.map(function(x){return x.scrollWidth-x.clientWidth;}),'
  + 'heights:roots.map(function(x){return Math.round(h(x));}),'
  + 'pitch:rows(roots[1]).map(function(e){return e.getBoundingClientRect().top;}),'
  + 'rowCounts:roots.map(function(x){return rows(x).length;}),'
  + 'readingHeights:roots.map(function(x){return h(x.querySelector(".' + skeletonSlot('reading-value') + '"));}),'
  + 'fsH1:roots.map(function(x){return parseFloat(getComputedStyle(x).getPropertyValue("--ilife-fs-h1"));}),'
  + 'timeWidths:roots.map(function(x){return Math.round(x.querySelector(".' + skeletonSlot('row-time') + '").getBoundingClientRect().width);}),'
  + 'valueRight:roots.map(function(x){var v=x.querySelector(".' + skeletonSlot('row-value') + '");'
  + 'return Math.round(v.getBoundingClientRect().right);}),'
  + 'cardRight:roots.map(function(x){return Math.round(x.querySelector(".' + skeletonSlot('card') + '").getBoundingClientRect().right);}),'
  + 'blockColor:roots.map(function(x){return getComputedStyle(x.querySelector(".' + skeletonSlot('reading-value') + '")).backgroundColor;}),'
  + 'anim:roots.map(function(x){var s=getComputedStyle(x.querySelector(".' + skeletonSlot('reading-value') + '")).animationName;return s;}),'
  + 'opacity:roots.map(function(x){return getComputedStyle(x.querySelector(".' + skeletonSlot('reading-value') + '")).opacity;}),'
  + 'markup:roots.map(function(x){return x.outerHTML;})'
  + '};}())';

const body3 = renderSkeleton(base({ rows: 3 }));
const body8 = renderSkeleton(base({ label: '正在汇总本月分类对照…', rows: 8, eta: '大约还要 2 秒' }));

/* ── ④ 真机两档几何（不跳版的可量之处）────────────────────────────── */

describe('skeleton ④ 真机两档几何（无头 Chrome）', () => {
  it('390／1280：零横向溢出 ＋ 行距 ＝ 34＋1 ＋ 高度是 rows 的线性式 ＋ 读数位 ＝ 2.2×字号档', async (t) => {
    const p = await startPage({ css: FIXTURE_CSS(), body: body3 + body8, width: 390 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：两档几何与动效判据需真浏览器');
    try {
      for (const width of [390, 1280]) {
        await p.setWidth(width);
        await sleep(150);
        const g = await p.ev(GEOM_EXPR);
        assert.ok(g.de[0] <= g.de[1], width + '：文档零横向溢出（' + g.de[0] + ' ≤ ' + g.de[1] + '）');
        for (const over of g.overflow) assert.ok(over <= 0, width + '：本条零横向溢出，实为 ' + over);

        /* 行距：连续两行的间距逐值相等，且 ＝ 行盒高（发丝线画在行盒里）。 */
        const pitch = Math.round((g.pitch[g.pitch.length - 1] - g.pitch[0]) / (g.pitch.length - 1));
        assert.equal(pitch, SKELETON_ROW_HEIGHT_PX, width + '：行距必须 ＝ ' + SKELETON_ROW_HEIGHT_PX
          + '（行盒高，含 ' + SKELETON_ROW_SEPARATOR_PX + 'px 发丝线；实测 ' + pitch + '）');
        assert.deepEqual(g.rowCounts, [3, 8], width + '：行数按入参');

        /* 线性：8 行比 3 行正好高出 5 行 —— 「加载完不跳版」就落在这一条上。 */
        assert.equal(g.heights[1] - g.heights[0], 5 * SKELETON_ROW_HEIGHT_PX, width + '：高度必须是行数的线性式（'
          + g.heights[0] + ' → ' + g.heights[1] + '）');

        /* 读数位高度 ＝ 主读数尺度 × 当前皮肤的字号档（皮肤只换取值，尺度跟着走）。 */
        assert.ok(Math.abs(g.readingHeights[0] - g.fsH1[0] * SKELETON_READING_SCALE) <= 0.5,
          width + '：读数位高度 ＝ 2.2 × fs-h1（' + g.readingHeights[0] + ' vs ' + (g.fsH1[0] * SKELETON_READING_SCALE) + '）');

        /* 时间槽与 `entry-rows` 同宽；值位不出纸面。 */
        assert.equal(g.timeWidths[0], ENTRY_ROW_TIME_MIN_WIDTH_PX, width + '：时间槽与明细行同宽');
        assert.ok(g.valueRight[0] <= g.cardRight[0] + 1, width + '：值位不许出纸面（' + g.valueRight[0] + ' ≤ ' + g.cardRight[0] + '）');
        console.log('读数 skeleton ' + width + '档：文档 scroll/client＝' + g.de[0] + '/' + g.de[1]
          + '，两条 root 的 scrollWidth−clientWidth＝' + g.overflow.join('/')
          + '，行距 ' + pitch + '（3 行高 ' + g.heights[0] + '／8 行高 ' + g.heights[1] + '）'
          + '，读数位高 ' + g.readingHeights[0].toFixed(2) + '＝2.2×fs-h1(' + g.fsH1[0] + ')'
          + '，时间槽 ' + g.timeWidths[0] + '，值位右缘 ' + g.valueRight[0] + ' ≤ 纸面右缘 ' + g.cardRight[0]);
        assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
      }
    } finally { p.close(); }
  });
});

/* ── ⑤ 真机动效纪律与三皮肤 ───────────────────────────────────────── */

describe('skeleton ⑤ 动效纪律与三皮肤（无头 Chrome）', () => {
  it('正常档走那支脉搏；reduced-motion 下停住但照样看得见；三套皮肤标记逐字节相同', async (t) => {
    const p = await startPage({ css: FIXTURE_CSS(), body: body3 + body8, width: 390 });
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      const g = await p.ev(GEOM_EXPR);
      for (const name of g.anim) assert.equal(name, SKELETON_PULSE_NAME, '正常档的动效名就是那支脉搏');

      await p.setReducedMotion(true);
      await sleep(120);
      const still = await p.ev(GEOM_EXPR);
      for (const name of still.anim) assert.equal(name, 'none', 'prefers-reduced-motion 下必须停，实为 ' + name);
      for (const op of still.opacity) {
        assert.ok(Number(op) > 0.2, '停住 ≠ 看不见（占位块仍可见，实为 opacity ' + op + '）');
      }
      await p.setReducedMotion(false);

      /* 三套皮肤：标记逐字节相同，占位底色真的不同。 */
      const markup = g.markup[0];
      const colors = new Set();
      for (const skin of SKIN_NAMES) {
        await p.setSkin('ilife-skin-' + skin);
        await sleep(100);
        const gg = await p.ev(GEOM_EXPR);
        assert.equal(gg.markup[0], markup, skin + '：三套皮肤下标记必须逐字节相同');
        assert.equal(gg.heights[1] - gg.heights[0], 5 * SKELETON_ROW_HEIGHT_PX,
          skin + '：行距是硬事实，不随皮肤变');
        colors.add(gg.blockColor[0]);
      }
      assert.equal(colors.size, 3, '三套皮肤的占位底色必须真的不同（皮肤生效的证据）：' + [...colors].join(' / '));
      console.log('读数 skeleton 动效与皮肤：正常档 animation-name＝' + g.anim[0]
        + '，reduced-motion 下 animation-name＝' + still.anim[0] + '、opacity＝' + still.opacity[0]
        + '，三皮肤占位底色 ' + [...colors].join(' / '));
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
