// compare-columns（双列对照 · 形态 A「背靠背条形」）· 判据件。
//
// 断言对象是**消费方真走的那条出口**：`dist/components/compare-columns/index.js`（层规：组件层不进冻结面、
// 不从根出口出，故按目录直达）。每组断四类：
//   ① 渲染契约（结构／条长同源／方向与语气／转义／**全部**非法入参分支）
//   ② 样式与零 DOM 纪律（scope、禁入 token、零 `:root`／`!important`／`@media`、剥字面量后零 DOM 名）
//   ③ 加法式（不挂这件时同页产物逐字节不变；只读自己的类名）
//   ④ 真机两档（390／1280 容器宽：零横向溢出、关键语义不截断、窄档确实改成每项三行）＋ 三套皮肤下标记逐字节相同
//
// 期望值一律从组件自己的常量与槽位拼法派生（`COMPARE_COLUMNS_*`／`compareColumnsSlot`），不另抄字面量。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  COMPARE_COLUMNS_BAR_MIN_PX,
  COMPARE_COLUMNS_BAR_THICKNESS_PX,
  COMPARE_COLUMNS_CALIBER_LABEL,
  COMPARE_COLUMNS_CLASS,
  COMPARE_COLUMNS_DIFF_LABEL,
  COMPARE_COLUMNS_DIRECTIONS,
  COMPARE_COLUMNS_DOWN,
  COMPARE_COLUMNS_FLAT,
  COMPARE_COLUMNS_FORMS,
  COMPARE_COLUMNS_LABEL_BAND_EM,
  COMPARE_COLUMNS_MINUS,
  COMPARE_COLUMNS_NARROW_PX,
  COMPARE_COLUMNS_PLUS,
  COMPARE_COLUMNS_SENSES,
  COMPARE_COLUMNS_SLOTS,
  COMPARE_COLUMNS_UP,
  compareColumnsCss,
  compareColumnsDirectionClass,
  compareColumnsSideClass,
  compareColumnsSlot,
  compareColumnsToneClass,
  renderCompareColumns,
} from '../dist/components/compare-columns/index.js';
import { SKIN_NAMES, skinClass, skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { CSS_VAR_TOKENS } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SRC = join(PKG, 'src', 'components', 'compare-columns');

/** 剥掉 CSS 注释再断规则（注释会**提到**类名，拿裸串断会把"解释"当"规则"）。 */
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

/** 判据用的入参（记账那三个分类，与原型墙 09/A 同数）。 */
const INPUT = {
  leftLabel: '上月',
  rightLabel: '本月',
  unit: '元',
  rows: [
    { label: '餐费', left: 1860, right: 2140 },
    { label: '日用', left: 905, right: 760 },
    { label: '交通', left: 410, right: 386.5 },
  ],
  caliber: '上月满月、本月未满月；只列两窗都有的项。',
};

/** 槽类的类名（一律经组件自己的拼法，不抄字面量）。 */
const slot = (name) => compareColumnsSlot(name);

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('compare-columns ① 渲染契约（结构）', () => {
  it('骨架：类名根 ＋ 表头行两窗名 ＋ 逐项三格 ＋ 差额单独一行 ＋ 口径行', () => {
    const html = renderCompareColumns(INPUT);
    assert.ok(html.startsWith('<div class="' + COMPARE_COLUMNS_CLASS + ' is-' + COMPARE_COLUMNS_FORMS[0] + '">'),
      '根用类名根打头：' + html.slice(0, 80));
    assert.ok(html.includes('<span class="' + slot('head-left') + '">上月</span>'), '左窗名在表头行左侧');
    assert.ok(html.includes('<span class="' + slot('head-right') + '">本月</span>'), '右窗名在表头行右侧');
    assert.equal((html.match(new RegExp('class="' + slot('row') + '"', 'g')) || []).length, 3, '三项三行');
    assert.equal((html.match(new RegExp(slot('side') + ' ' + compareColumnsSideClass('left'), 'g')) || []).length, 3);
    assert.equal((html.match(new RegExp(slot('side') + ' ' + compareColumnsSideClass('right'), 'g')) || []).length, 3);
    assert.ok(html.includes('<span class="' + slot('label') + '">餐费</span>'), '项名住中缝那一列');
    assert.ok(html.includes('<span class="' + slot('diff-label') + '">' + COMPARE_COLUMNS_DIFF_LABEL + '</span>'),
      '差额单独一行，标签恒为「差额合计」');
    assert.ok(html.includes('<p class="' + slot('caliber') + '"><b>' + COMPARE_COLUMNS_CALIBER_LABEL + '</b>'),
      '口径行带标签');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('两侧窗口名两处都给（宽档由表头行、窄档由每侧的窗口名），分档交给样式', () => {
    const html = renderCompareColumns(INPUT);
    assert.equal((html.match(new RegExp(slot('side-name'), 'g')) || []).length, 6, '三行 × 两侧');
    assert.ok(html.includes('<span class="' + slot('side-name') + '">上月</span>'));
    assert.ok(html.includes('<span class="' + slot('side-name') + '">本月</span>'));
  });

  it('缺槽就不出那一槽：不给 unit／caliber 时两处都不出现；差额行恒出', () => {
    const html = renderCompareColumns({ leftLabel: 'A', rightLabel: 'B', rows: [{ label: 'x', left: 1, right: 2 }] });
    assert.equal(html.includes(slot('unit')), false, '不给单位就不出单位格');
    assert.equal(html.includes(slot('caliber')), false, '不给口径就不出口径行');
    assert.equal(html.includes(slot('diff')), true, '差额单独一行是本形态的结论位，恒出');
  });

  it('空数组出不了一个字（两窗没有共同项时不留空壳）', () => {
    assert.equal(renderCompareColumns({ leftLabel: '上月', rightLabel: '本月', rows: [] }), '');
    assert.equal(renderCompareColumns({ leftLabel: '上月', rightLabel: '本月', rows: [], caliber: 'x' }), '');
  });
});

describe('compare-columns ① 渲染契约（条长同源 ＋ 差额）', () => {
  it('两窗共用一条刻度：最大值那一侧满条（100%），其余按比例', () => {
    const html = renderCompareColumns(INPUT);
    assert.equal((html.match(/style="width: 100%"/g) || []).length, 1, '只有最大值那一侧满条');
    assert.ok(html.includes('style="width: 86.9%"'), '1860 / 2140 ＝ 86.9%');
    assert.ok(html.includes('style="width: 35.5%"'), '760 / 2140 ＝ 35.5%');
    assert.ok(html.includes('style="width: 18.1%"'), '386.5 / 2140 ＝ 18.1%');
  });

  it('显示串由本件出：千分位 ＋ 最多两位小数（尾零去掉）', () => {
    const html = renderCompareColumns(INPUT);
    assert.ok(html.includes('>1,860<'), '千分位');
    assert.ok(html.includes('>386.5<'), '一位小数照出');
    const two = renderCompareColumns({ leftLabel: 'A', rightLabel: 'B', rows: [{ label: 'x', left: 1000, right: 1234.567 }] });
    assert.ok(two.includes('>1,234.57<'), '两位小数封顶');
  });

  it('差额 ＝ 各共同项「右 − 左」之和，带方向字形与正负号（色只是第三样）', () => {
    const html = renderCompareColumns(INPUT);
    assert.ok(html.includes('<b class="' + slot('diff-value') + ' ' + compareColumnsDirectionClass('up') + '">'
      + '<i aria-hidden="true">' + COMPARE_COLUMNS_UP + '</i>' + COMPARE_COLUMNS_PLUS + '111.5'
      + '<small class="' + slot('unit') + '">元</small></b>'), '涨：▲ ＋ 正号（实际：' + html.slice(html.indexOf(slot('diff-value'))) + '）');
    const down = renderCompareColumns({ leftLabel: 'A', rightLabel: 'B', rows: [{ label: 'x', left: 200, right: 100 }] });
    assert.ok(down.includes(' ' + compareColumnsDirectionClass('down') + '"'), '跌：方向状态类');
    assert.ok(down.includes(COMPARE_COLUMNS_DOWN) && down.includes(COMPARE_COLUMNS_MINUS + '100'), '▼ ＋ 负号');
    const flat = renderCompareColumns({ leftLabel: 'A', rightLabel: 'B', rows: [{ label: 'x', left: 67.2, right: 67.2 }] });
    assert.ok(flat.includes(' ' + compareColumnsDirectionClass('flat') + '"'), '持平：方向状态类');
    assert.ok(flat.includes('<i aria-hidden="true">' + COMPARE_COLUMNS_FLAT + '</i>0'), '＝ 0（不带号）');
  });

  it('语气闭集：缺省不上色；`up-good`／`down-good` 才给 good／bad（涨是好是坏归调用方）', () => {
    assert.deepEqual([...COMPARE_COLUMNS_SENSES], ['neutral', 'up-good', 'down-good']);
    assert.deepEqual([...COMPARE_COLUMNS_DIRECTIONS], ['up', 'down', 'flat']);
    assert.deepEqual([...COMPARE_COLUMNS_FORMS], ['back-to-back']);
    const good = compareColumnsToneClass('good');
    const bad = compareColumnsToneClass('bad');
    const neutral = renderCompareColumns(INPUT);
    assert.equal(neutral.includes(good), false, '缺省不上语义色');
    assert.equal(neutral.includes(bad), false);
    assert.ok(renderCompareColumns({ ...INPUT, sense: 'up-good' })
      .includes(slot('diff-value') + ' ' + compareColumnsDirectionClass('up') + ' ' + good + '"'));
    assert.ok(renderCompareColumns({ ...INPUT, sense: 'down-good' })
      .includes(slot('diff-value') + ' ' + compareColumnsDirectionClass('up') + ' ' + bad + '"'));
    assert.ok(renderCompareColumns({ ...INPUT, sense: 'up-good', rows: [{ label: 'x', left: 2, right: 1 }] })
      .includes(slot('diff-value') + ' ' + compareColumnsDirectionClass('down') + ' ' + bad + '"'), 'up-good 档里跌才是坏');
  });

  it('转义：窗口名／项名／单位／口径行里的五个字符进实体，不进标记', () => {
    const html = renderCompareColumns({
      leftLabel: '<b>上月', rightLabel: '本月&"', unit: '"><script>',
      caliber: '<script>alert(1)</script>', rows: [{ label: '<b>&"\'', left: 1, right: 2 }],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;b&gt;'), '尖括号以实体上屏');
    assert.ok(html.includes('&amp;') && html.includes('&quot;') && html.includes('&#39;'), '三种引号与和号都转');
  });

  it('非法入参逐条 BlocksError（不静默降级）', () => {
    const base = { leftLabel: '上月', rightLabel: '本月', rows: [{ label: 'x', left: 1, right: 2 }] };
    const cases = [
      ['非对象', null],
      ['缺席', undefined],
      ['数组不是对象', []],
      ['leftLabel 空串', { ...base, leftLabel: '' }],
      ['leftLabel 非串', { ...base, leftLabel: 7 }],
      ['rightLabel 空串', { ...base, rightLabel: '' }],
      ['rows 非数组', { ...base, rows: 'x' }],
      ['row 非对象', { ...base, rows: [null] }],
      ['label 空串', { ...base, rows: [{ label: '', left: 1, right: 2 }] }],
      ['left 负数', { ...base, rows: [{ label: 'x', left: -1, right: 2 }] }],
      ['left NaN', { ...base, rows: [{ label: 'x', left: Number.NaN, right: 2 }] }],
      ['right Infinity', { ...base, rows: [{ label: 'x', left: 1, right: Number.POSITIVE_INFINITY }] }],
      ['left 给串', { ...base, rows: [{ label: 'x', left: '1', right: 2 }] }],
      ['right 缺席', { ...base, rows: [{ label: 'x', left: 1 }] }],
      ['form 闭集外', { ...base, form: 'columns' }],
      ['sense 闭集外', { ...base, sense: 'up' }],
      ['unit 非串', { ...base, unit: 7 }],
      ['caliber 非串', { ...base, caliber: 7 }],
      ['extraClass 非法类名', { ...base, extraClass: 'a b!' }],
    ];
    for (const [why, input] of cases) {
      assert.equal(throwsBlocks(() => renderCompareColumns(input)), true, '必须拒：' + why);
    }
    assert.equal(throwsBlocks(() => renderCompareColumns({ ...base, extraClass: 'ok other' })), false, '合法附加类名照收');
  });
});

/* ── ② 样式与零 DOM 纪律 ─────────────────────────────────────────────── */

describe('compare-columns ② 样式与零 DOM 纪律', () => {
  const css = () => stripComments(compareColumnsCss());

  it('样式段非空，且全部规则 scope 在 `.ilife-page-ui` 之下、只读本件自己的类名', () => {
    const text = css();
    assert.ok(text.trim() !== '', '样式段必须非空');
    const selectors = (text.match(/^[ \t]*[^{\n]*\{/gm) || [])
      .map((s) => s.trim())
      .filter((s) => !s.startsWith('@') && !s.startsWith('/*'));
    assert.ok(selectors.length > 0, '必须至少有一条选择器规则');
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes(COMPARE_COLUMNS_CLASS), '只许读本件自己的类名：' + sel);
    }
    assert.equal(text.includes('ilife-block-rank-list'), false, '不得提别的组件');
  });

  it('不写 `:root`／`!important`／`@media`；不定义新 token；不截断关键语义', () => {
    const text = css();
    for (const banned of [':root', '!important', '@media', 'text-overflow', 'line-clamp', 'white-space: nowrap']) {
      assert.equal(text.includes(banned), false, '不得出现 ' + banned);
    }
    assert.deepEqual(text.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    assert.equal(text.includes('var(--ilife-'), true, '皮肤读法要经 skinVar（产出带兜底链的 var()）');
  });

  it('响应式一律容器驱动：本件自己是容器，窄档走 @container', () => {
    const text = css();
    assert.ok(text.includes('container-type: inline-size'), '本件设 container-type');
    assert.ok(text.includes('@container (max-width: ' + COMPARE_COLUMNS_NARROW_PX + 'px)'), '窄档阈值走 @container');
    assert.ok(text.includes(String(COMPARE_COLUMNS_LABEL_BAND_EM) + 'em'), '项名列是定宽带（两窗条长可比）');
    assert.ok(text.includes(String(COMPARE_COLUMNS_BAR_MIN_PX) + 'px'), '条有最小宽度');
    assert.ok(text.includes(String(COMPARE_COLUMNS_BAR_THICKNESS_PX) + 'px'), '条厚取常量');
  });

  it('源码级：`src/components/compare-columns/**` 不手写 `var(--ilife-…)`（一律 skinVar）', () => {
    const files = readdirSync(SRC).filter((f) => f.endsWith('.ts'));
    assert.ok(files.length >= 5, '本件五份源码文件该都在（实际 ' + files.length + '）');
    const bad = [];
    for (const f of files) {
      const src = stripComments(readFileSync(join(SRC, f), 'utf8'));
      if (/var\(\s*--ilife-/.test(src)) bad.push(f);
    }
    assert.deepEqual(bad, [], '手写了 var(--ilife-…)：' + bad.join('、'));
  });

  it('组合符右侧不许再带 scope 前缀（`.scope .a > .scope .b` 永不命中）', () => {
    const text = css();
    const bad = text.match(/[>+~][ \t]*\.ilife-page-ui/g) || [];
    assert.deepEqual(bad, [], '组合符右侧出现了 .ilife-page-ui（整条规则会静默失效）：' + bad.join('、'));
  });

  it('层红线：`dist/components/compare-columns/**` 剥掉字面量与注释后零 DOM 名', () => {
    const dir = join(PKG, 'dist', 'components', 'compare-columns');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
    assert.ok(files.length >= 5, '至少五份编译产物');
    const stripLiterals = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const f of files) {
      const code = stripLiterals(readFileSync(join(dir, f), 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f + ' 里出现了 ' + needle);
      }
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('compare-columns ③ 加法式（不挂这件即逐字节不变）', () => {
  it('renderDocShell 不带本件时产物里既没有本件的类名，也没有本件的样式；两次渲染逐字节相同', () => {
    const opts = { docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' };
    const base = renderDocShell(opts);
    assert.equal(base.includes(COMPARE_COLUMNS_CLASS), false, '不带组件时不得出现它的类名');
    assert.equal(base, renderDocShell(opts), '两次渲染逐字节相同');
  });

  it('样式段是纯函数：同一入参两次调用逐字节相同（不依赖外部状态）', () => {
    assert.equal(compareColumnsCss(), compareColumnsCss());
    assert.equal(compareColumnsCss(), compareColumnsCss({ prefix: 'ilife-' }));
  });

  it('prefix 透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const text = compareColumnsCss({ prefix: 'x-' });
    assert.ok(text.includes('.x-page-ui .x-block-compare-columns'), '前缀必须作用到 scope 与类名两处');
  });
});

/* ── ④ 真机（无头 Chrome ＋ CDP）：两档几何 ＋ 三套皮肤 ──────────────── */

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** 找本机浏览器（与 `test/editable-value-probe.mjs` 同一份候选表）。 */
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

/** 起一页真机夹具；本机没有 Chrome 就返回 null（调用方 `t.skip`）。
 *  调试端口取 Chrome 自己写的 `DevToolsActivePort`，不猜端口号（同工作区多席并行跑测时不撞端口）。 */
async function startPage(html, viewportWidth) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const dir = mkdtempSync(join(tmpdir(), 't-cc-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, html, 'utf8');
  const profile = mkdtempSync(join(tmpdir(), 't-cc-chrome-'));
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, '--window-size=' + viewportWidth + ',1200', 'about:blank'],
  { stdio: ['ignore', 'pipe', 'pipe'] });
  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    for (const d of [profile, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
  };
  try {
    const portFile = join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 200 && !existsSync(portFile); i += 1) await sleep(100);
    if (!existsSync(portFile)) throw new Error('CDP 未就绪（headless Chrome 起不来）');
    const port = readFileSync(portFile, 'utf8').split('\n')[0].trim();
    let devUrl = null;
    for (let i = 0; i < 120 && devUrl === null; i += 1) {
      try {
        const r = await fetch('http://127.0.0.1:' + port + '/json/version');
        if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl;
      } catch { /* 等端口 */ }
      if (devUrl === null) await sleep(250);
    }
    if (devUrl === null) throw new Error('CDP 未就绪（/json/version 拿不到）');
    const cdp = connectCdp(devUrl);
    await cdp.ready;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    const ev = async (expr) => {
      const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error('页内抛错：' + (r.exceptionDetails.exception
        ? r.exceptionDetails.exception.description : r.exceptionDetails.text));
      return r.result === undefined ? undefined : r.result.value;
    };
    await s('Page.enable');
    await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: viewportWidth, height: 1200, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(220);
    return { ev, close: () => { cdp.close(); cleanup(); } };
  } catch (e) {
    cleanup();
    throw e;
  }
}

/** 夹具页：`cases` 逐份 `{ key, skin, width, markup }`，每份一个定宽容器（三套皮肤共用一份样式段）。 */
function fixtureHtml(cases) {
  const tokens = Object.entries(CSS_VAR_TOKENS).map(([k, v]) => '  ' + k + ': ' + v + ';').join('\n');
  const blocks = cases.map((c) => '<section class="fx" data-case="' + c.key + '" data-skin="' + c.skin
    + '" data-width="' + String(c.width) + '" style="width:' + String(c.width) + 'px">'
    + '<div class="ilife-page-ui ' + skinClass(c.skin) + '">' + c.markup + '</div></section>');
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><style>\n'
    + ':root {\n' + tokens + '\n}\n'
    + 'body { margin: 0; background: #ffffff }\n'
    + '.fx { box-sizing: border-box; padding: 0; margin: 0 0 18px 0 }\n'
    + skinCss() + '\n' + compareColumnsCss() + '\n</style></head>\n<body>\n' + blocks.join('\n') + '\n</body></html>';
}

/** 三套皮肤 × 两个容器宽的六份夹具。 */
function matrixCases(markup) {
  const out = [];
  for (const skin of SKIN_NAMES) {
    for (const width of [390, 1280]) out.push({ key: skin + '-' + width, skin, width, markup });
  }
  return out;
}

/** 量一份夹具（容器盒、根盒、表头是否在、中缝与两侧的盒子、条的宽度、关键文本是否被截）。 */
function measureExpr(key) {
  const S = (cls) => JSON.stringify('.' + slot(cls));
  const caseSel = JSON.stringify('[data-case="' + key + '"]');
  const rootSel = JSON.stringify('.' + COMPARE_COLUMNS_CLASS);
  return `(function(){
    var sec = document.querySelector(${caseSel});
    var root = sec.querySelector(${rootSel});
    function rect(el) {
      var b = el.getBoundingClientRect();
      return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom),
        w: Math.round(b.width), h: Math.round(b.height) };
    }
    function fit(el) {
      return { text: (el.textContent || '').slice(0, 18), sw: el.scrollWidth, cw: el.clientWidth };
    }
    function all(s) { return Array.prototype.slice.call(root.querySelectorAll(s)); }
    var sides = all(${S('side')});
    return {
      box: { sw: sec.scrollWidth, cw: sec.clientWidth },
      root: { sw: root.scrollWidth, cw: root.clientWidth, r: Math.round(root.getBoundingClientRect().right),
        boxR: Math.round(sec.getBoundingClientRect().right) },
      head: rect(root.querySelector(${S('head')})).h > 0,
      label: rect(root.querySelector(${S('label')})),
      left: rect(sides[0]),
      right: rect(sides[1]),
      bars: all(${S('bar')}).map(function (b) { return Math.round(b.getBoundingClientRect().width); }),
      anchor: (function () {
        var rows = all(${S('row')});
        var r = rows[1] || rows[0];
        function one(side) {
          var b = side.querySelector(${S('bar')});
          var f = side.querySelector(${S('fill')});
          return { track: Math.round(b.getBoundingClientRect().width),
            fill: Math.round(f.getBoundingClientRect().width),
            off: Math.round(f.getBoundingClientRect().left - b.getBoundingClientRect().left) };
        }
        return { left: one(r.querySelector(${S('side')} + '.' + ${JSON.stringify(compareColumnsSideClass('left'))})),
          right: one(r.querySelector(${S('side')} + '.' + ${JSON.stringify(compareColumnsSideClass('right'))})) };
      })(),
      keyed: all(${S('value')}).concat(all(${S('label')})).concat(all(${S('diff-value')}))
        .concat(all(${S('caliber')} + ' span')).concat(all(${S('caliber')} + ' b')).map(fit),
      doc: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth },
      markup: root.innerHTML
    };
  }())`;
}

describe('compare-columns ④ 真机两档几何（390／1280）＋ 三套皮肤', () => {
  it('零横向溢出、关键语义不截断、窄档改成每项三行、三套皮肤下标记逐字节相同', async (t) => {
    const page = await startPage(fixtureHtml(matrixCases(renderCompareColumns(INPUT))), 1400);
    if (page === null) return t.skip('本机无 Chrome／Chromium：两档几何需真浏览器');
    try {
      const readings = {};
      for (const skin of SKIN_NAMES) {
        for (const width of [390, 1280]) {
          const key = skin + '-' + width;
          const r = await page.ev(measureExpr(key));
          readings[key] = r;
          assert.ok(r.box.sw <= r.box.cw, key + '：容器零横向溢出（' + r.box.sw + ' ≤ ' + r.box.cw + '）');
          assert.ok(r.root.sw <= r.root.cw, key + '：本件零横向溢出（' + r.root.sw + ' ≤ ' + r.root.cw + '）');
          assert.ok(r.root.r <= r.root.boxR + 1, key + '：本件右缘不越过容器（' + r.root.r + ' ≤ ' + r.root.boxR + '）');
          assert.ok(r.doc.sw <= r.doc.cw, key + '：页级零横向溢出（' + r.doc.sw + ' ≤ ' + r.doc.cw + '）');
          for (const k of r.keyed) {
            assert.ok(k.sw <= k.cw + 1, key + '：关键文本不得被截断（' + k.text + '：' + k.sw + ' ≤ ' + k.cw + '）');
          }
          assert.equal(r.bars.length, 6, key + '：三项两侧共六条（实际 ' + r.bars.length + '）');
          for (const w of r.bars) {
            assert.ok(w >= COMPARE_COLUMNS_BAR_MIN_PX, key + '：条不得细过 ' + COMPARE_COLUMNS_BAR_MIN_PX + 'px（' + w + '）');
          }
          /* 条的锚点（第二行＝非最大值那一行才看得出来）：宽档两条都从**外缘**起步、向中缝生长。 */
          assert.ok(r.anchor.left.off <= 1, key + '：左窗的条贴着自己的读数起步（off ' + r.anchor.left.off + ' ≤ 1）');
          if (width === 390) {
            assert.ok(r.anchor.right.off <= 1, key + '：窄档右窗的条也从头长（off ' + r.anchor.right.off + ' ≤ 1）');
          } else {
            assert.ok(r.anchor.right.off + r.anchor.right.fill >= r.anchor.right.track - 2,
              key + '：宽档右窗的条贴着外缘（' + (r.anchor.right.off + r.anchor.right.fill)
              + ' ≥ ' + (r.anchor.right.track - 2) + '）');
          }
          if (width === 390) {
            assert.equal(r.head, false, key + '：窄档表头行收起（改由每侧的窗口名领读）');
            assert.ok(r.label.b <= r.left.t + 1, key + '：窄档项名在两侧之上（' + r.label.b + ' ≤ ' + r.left.t + '）');
            assert.ok(r.left.b <= r.right.t + 1, key + '：窄档两窗上下两行（' + r.left.b + ' ≤ ' + r.right.t + '）');
          } else {
            assert.equal(r.head, true, key + '：宽档表头行在');
            assert.ok(r.left.r <= r.label.l + 1, key + '：宽档左窗在中缝左侧（' + r.left.r + ' ≤ ' + r.label.l + '）');
            assert.ok(r.label.r <= r.right.l + 1, key + '：宽档右窗在中缝右侧（' + r.label.r + ' ≤ ' + r.right.l + '）');
          }
        }
      }
      for (const width of [390, 1280]) {
        const marks = SKIN_NAMES.map((skin) => readings[skin + '-' + width].markup);
        for (const m of marks) assert.equal(m, marks[0], width + ' 档：三套皮肤下标记必须逐字节相同');
      }
      for (const width of [390, 1280]) {
        const r = readings['paper-' + width];
        console.log('[compare-columns ④ 读数] ' + width + 'px 容器：'
          + JSON.stringify({ box: r.box, root: r.root, label: r.label, left: r.left, right: r.right, bars: r.bars }));
      }
    } finally { page.close(); }
  });

  it('长串兜底：长项名／长读数／长口径行给进去，窄档仍零横向溢出且一个字都不少', async (t) => {
    const longLabel = '交通出行与车辆养护的杂项支出明细分类名称';
    const longCaliber = '上月满月、本月未满月；只列两窗都有的项；本月另有 1 类新出现，未计入对照。'.repeat(3);
    const markup = renderCompareColumns({
      leftLabel: '上一个三十天窗口', rightLabel: '最近三十天窗口', unit: '元',
      rows: [
        { label: longLabel, left: 1234567.89, right: 987654.32 },
        { label: '餐费', left: 1, right: 0 },
      ],
      caliber: longCaliber,
    });
    const cases = [{ key: 'long-390', skin: 'paper', width: 390, markup }];
    const page = await startPage(fixtureHtml(cases), 1400);
    if (page === null) return t.skip('本机无 Chrome／Chromium：长串兜底需真浏览器');
    try {
      const r = await page.ev(measureExpr('long-390'));
      assert.ok(r.box.sw <= r.box.cw, '长串下容器零横向溢出（' + r.box.sw + ' ≤ ' + r.box.cw + '）');
      assert.ok(r.root.sw <= r.root.cw, '长串下本件零横向溢出（' + r.root.sw + ' ≤ ' + r.root.cw + '）');
      assert.ok(r.doc.sw <= r.doc.cw, '长串下页级零横向溢出（' + r.doc.sw + ' ≤ ' + r.doc.cw + '）');
      for (const k of r.keyed) assert.ok(k.sw <= k.cw + 1, '关键文本不得被截断：' + k.text);
      const texts = await page.ev('(function(){var s=document.querySelector(\'[data-case="long-390"]\').textContent;'
        + 'return {label:s.indexOf(' + JSON.stringify(longLabel) + ')>=0,'
        + 'caliber:s.indexOf(' + JSON.stringify(longCaliber) + ')>=0};}())');
      assert.equal(texts.label, true, '长项名一个字都不少');
      assert.equal(texts.caliber, true, '长口径行一个字都不少');
      console.log('[compare-columns ④ 读数] 长串 390px 容器：' + JSON.stringify({ box: r.box, root: r.root }));
    } finally { page.close(); }
  });
});

/* ── ⑤ 槽位名单与样式段对账 ─────────────────────────────────────────── */

describe('compare-columns ⑤ 槽位名单', () => {
  it('名单里每个槽都能拼出类名，且都在样式段里被用到', () => {
    const css = compareColumnsCss();
    for (const name of COMPARE_COLUMNS_SLOTS) {
      const cls = compareColumnsSlot(name);
      assert.ok(cls.startsWith(COMPARE_COLUMNS_CLASS + '-'), cls);
      assert.ok(css.includes('.' + cls), '样式段里没有用到槽位 ' + name);
    }
  });
});
