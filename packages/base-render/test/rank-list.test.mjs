// rank-list（榜单 · 形态 A「领奖台」）· 判据件。
//
// 断言对象是**消费方真走的那条出口**：`dist/components/rank-list/index.js`（层规：组件层不进冻结面、
// 不从根出口出，故按目录直达）。每组断四类：
//   ① 渲染契约（结构／条长同源／占比／副语／转义／**全部**非法入参分支）
//   ② 样式与零 DOM 纪律（scope、禁入 token、零 `:root`／`!important`／`@media`、剥字面量后零 DOM 名）
//   ③ 加法式（不挂这件时同页产物逐字节不变；只读自己的类名）
//   ④ 真机两档（390／1280 容器宽：零横向溢出、关键语义不截断、**名称不被挤成竖排**）＋ 三套皮肤下标记逐字节相同
//
// 期望值一律从组件自己的常量与槽位拼法派生（`RANK_LIST_*`／`rankListSlot`），不另抄字面量。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  RANK_LIST_BAR_MIN_PX,
  RANK_LIST_CALIBER_LABEL,
  RANK_LIST_CARD_MIN_EM,
  RANK_LIST_CLASS,
  RANK_LIST_FIRST_VALUE_SCALE,
  RANK_LIST_FORMS,
  RANK_LIST_NARROW_PX,
  RANK_LIST_PODIUM_SIZE,
  RANK_LIST_SLOTS,
  rankListCss,
  rankListPlaceClass,
  rankListSlot,
  renderRankList,
} from '../dist/components/rank-list/index.js';
import { SKIN_NAMES, skinClass, skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { CSS_VAR_TOKENS } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SRC = join(PKG, 'src', 'components', 'rank-list');

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

/** 判据用的入参（记账大额榜，与原型墙 10/A 同数）。 */
const INPUT = {
  unit: '元',
  rows: [
    { name: '超市买菜', note: '12 次 · 每周', value: 168, share: 31.7 },
    { name: '外卖', value: 126, share: 23.8 },
    { name: '打车', value: 95, share: 17.8 },
    { name: '网购', value: 76, share: 14.3 },
    { name: '咖啡', value: 42, share: 7.9 },
    { name: '其他 4 笔', value: 24, share: 4.5 },
  ],
  caliber: '大额榜 · 单位：元；占比按窗内 530.50 元合计。',
};

/** 槽类的类名（一律经组件自己的拼法，不抄字面量）。 */
const slot = (name) => rankListSlot(name);

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('rank-list ① 渲染契约（结构）', () => {
  it('骨架：类名根 ＋ 领奖台三张卡 ＋ 第 4 名起逐行 ＋ 每名都给条', () => {
    const html = renderRankList(INPUT);
    assert.ok(html.startsWith('<div class="' + RANK_LIST_CLASS + ' is-' + RANK_LIST_FORMS[0] + '">'),
      '根用类名根打头：' + html.slice(0, 80));
    assert.equal((html.match(new RegExp('class="' + slot('card') + ' ', 'g')) || []).length, RANK_LIST_PODIUM_SIZE,
      '领奖台恰好三张卡');
    assert.ok([1, 2, 3].every((rank) => html.includes(slot('card') + ' ' + rankListPlaceClass(rank) + '"')),
      '三张卡各有位次类名（宽档摆位用）');
    assert.equal((html.match(new RegExp('class="' + slot('row') + '"', 'g')) || []).length, 3,
      '六名减领奖台三名 ＝ 逐行区三行');
    assert.equal((html.match(new RegExp(slot('bar') + '"', 'g')) || []).length, 6, '每一名都给条');
    assert.equal((html.match(new RegExp(slot('share') + '"', 'g')) || []).length, 6, '每一名都给占比');
    assert.ok(html.includes('<p class="' + slot('caliber') + '"><b>' + RANK_LIST_CALIBER_LABEL + '</b>'), '口径行带标签');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
    assert.equal(html.includes('<h1') || html.includes('<h2') || html.includes('<h3'), false, '榜单名归小节头，本件不写标题');
  });

  it('名次文本：领奖台写「第 N 名」，逐行区写序号', () => {
    const html = renderRankList(INPUT);
    for (let n = 1; n <= RANK_LIST_PODIUM_SIZE; n += 1) {
      assert.ok(html.includes('<b class="' + slot('rank') + '">第 ' + String(n) + ' 名</b>'), '第 ' + String(n) + ' 名在卡里');
    }
    assert.ok(html.includes('<b class="' + slot('rank') + '">4</b>'), '逐行区第一名写序号 4');
    assert.ok(html.includes('<b class="' + slot('rank') + '">6</b>'), '末名写序号 6');
  });

  it('条长同源：榜首满条（100%），其余按「值 ÷ 榜首」折算', () => {
    const html = renderRankList(INPUT);
    assert.equal((html.match(/style="width: 100%"/g) || []).length, 1, '只有榜首满条');
    assert.ok(html.includes('style="width: 75%"'), '126 / 168 ＝ 75%');
    assert.ok(html.includes('style="width: 56.5%"'), '95 / 168 ＝ 56.5%');
    assert.ok(html.includes('style="width: 14.3%"'), '24 / 168 ＝ 14.3%');
  });

  it('显示串由本件出：值的千分位 ＋ 占比一位小数', () => {
    const html = renderRankList(INPUT);
    assert.ok(html.includes('>168<small class="' + slot('unit') + '">元</small>'), '值跟单位');
    assert.ok(html.includes('>31.7%</span>'), '占比一位小数（实际：' + html.slice(html.indexOf(slot('share'))).slice(0, 70) + '）');
    const big = renderRankList({ rows: [{ name: 'x', value: 12345.678, share: 100 }] });
    assert.ok(big.includes('>12,345.68<'), '千分位 ＋ 两位小数封顶');
    assert.ok(big.includes('>100.0%</span>'), '占比 100 也写一位小数');
  });

  it('副语：给了就出在名称那一格里（另起一行由样式管），不给就一个字都不出', () => {
    const withNote = renderRankList(INPUT);
    assert.ok(withNote.includes('<small class="' + slot('note') + '">12 次 · 每周</small>'), '副语在名称格内');
    const without = renderRankList({ rows: [{ name: 'x', value: 1, share: 100 }] });
    assert.equal(without.includes(slot('note')), false, '不给副语就不出这一行');
  });

  it('不足三名只有卡、超过三名只进前三张卡；空数组出不了一个字', () => {
    const two = renderRankList({ rows: [{ name: 'a', value: 2, share: 60 }, { name: 'b', value: 1, share: 40 }] });
    assert.equal((two.match(new RegExp('class="' + slot('card') + ' ', 'g')) || []).length, 2, '两名两张卡');
    assert.equal(two.includes(slot('list')), false, '没有第 4 名就不出逐行区');
    assert.equal(renderRankList({ rows: [] }), '');
    assert.equal(renderRankList({ rows: [], caliber: 'x', unit: '元' }), '');
  });

  it('转义：名称／副语／单位／口径行里的五个字符进实体，不进标记', () => {
    const html = renderRankList({
      unit: '"><script>', caliber: '<script>alert(1)</script>',
      rows: [{ name: '<b>&"\'', note: '<i>x', value: 1, share: 100 }],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;b&gt;'), '尖括号以实体上屏');
    assert.ok(html.includes('&amp;') && html.includes('&quot;') && html.includes('&#39;'), '三种引号与和号都转');
  });

  it('非法入参逐条 BlocksError（不静默降级）', () => {
    const base = { rows: [{ name: 'x', value: 1, share: 100 }] };
    const cases = [
      ['非对象', null],
      ['缺席', undefined],
      ['数组不是对象', []],
      ['rows 非数组', { ...base, rows: 'x' }],
      ['row 非对象', { ...base, rows: [null] }],
      ['name 空串', { ...base, rows: [{ name: '', value: 1, share: 1 }] }],
      ['value 负数', { ...base, rows: [{ name: 'x', value: -1, share: 1 }] }],
      ['value NaN', { ...base, rows: [{ name: 'x', value: Number.NaN, share: 1 }] }],
      ['value 给串', { ...base, rows: [{ name: 'x', value: '1', share: 1 }] }],
      ['share 越界（负）', { ...base, rows: [{ name: 'x', value: 1, share: -1 }] }],
      ['share 越界（>100）', { ...base, rows: [{ name: 'x', value: 1, share: 101 }] }],
      ['share 非数', { ...base, rows: [{ name: 'x', value: 1, share: '50%' }] }],
      ['share 缺席', { ...base, rows: [{ name: 'x', value: 1 }] }],
      ['note 非串', { ...base, rows: [{ name: 'x', value: 1, share: 1, note: 7 }] }],
      ['form 闭集外', { ...base, form: 'bars' }],
      ['unit 非串', { ...base, unit: 7 }],
      ['caliber 非串', { ...base, caliber: 7 }],
      ['extraClass 非法类名', { ...base, extraClass: 'a b!' }],
    ];
    for (const [why, input] of cases) {
      assert.equal(throwsBlocks(() => renderRankList(input)), true, '必须拒：' + why);
    }
    assert.equal(throwsBlocks(() => renderRankList({ ...base, extraClass: 'ok other' })), false, '合法附加类名照收');
  });
});

/* ── ② 样式与零 DOM 纪律 ─────────────────────────────────────────────── */

describe('rank-list ② 样式与零 DOM 纪律', () => {
  const css = () => stripComments(rankListCss());

  it('样式段非空，且全部规则 scope 在 `.ilife-page-ui` 之下、只读本件自己的类名', () => {
    const text = css();
    assert.ok(text.trim() !== '', '样式段必须非空');
    const selectors = (text.match(/^[ \t]*[^{\n]*\{/gm) || [])
      .map((s) => s.trim())
      .filter((s) => !s.startsWith('@') && !s.startsWith('/*'));
    assert.ok(selectors.length > 0, '必须至少有一条选择器规则');
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes(RANK_LIST_CLASS), '只许读本件自己的类名：' + sel);
    }
    assert.equal(text.includes('ilife-block-compare-columns'), false, '不得提别的组件');
  });

  it('不写 `:root`／`!important`／`@media`；不定义新 token；不截断关键语义', () => {
    const text = css();
    for (const banned of [':root', '!important', '@media', 'text-overflow', 'line-clamp', 'white-space: nowrap']) {
      assert.equal(text.includes(banned), false, '不得出现 ' + banned);
    }
    assert.deepEqual(text.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    assert.equal(text.includes('var(--ilife-'), true, '皮肤读法要经 skinVar（产出带兜底链的 var()）');
  });

  it('响应式一律容器驱动：本件自己是容器，窄档走 @container，条在名称下面另起一行', () => {
    const text = css();
    assert.ok(text.includes('container-type: inline-size'), '本件设 container-type');
    assert.ok(text.includes('@container (max-width: ' + RANK_LIST_NARROW_PX + 'px)'), '窄档阈值走 @container');
    assert.ok(text.includes(String(RANK_LIST_CARD_MIN_EM) + 'em'), '卡有最小宽度');
    assert.ok(text.includes(String(RANK_LIST_BAR_MIN_PX) + 'px'), '条有最小宽度');
    assert.ok(text.includes(' * ' + String(RANK_LIST_FIRST_VALUE_SCALE) + ')'), '第 1 名的字号倍数取常量');
    assert.ok(text.includes(slot('mid') + ' {'), '「名称 ＋ 条」那一格在（条不与名称抢宽度）');
  });

  it('源码级：`src/components/rank-list/**` 不手写 `var(--ilife-…)`（一律 skinVar）', () => {
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

  it('层红线：`dist/components/rank-list/**` 剥掉字面量与注释后零 DOM 名', () => {
    const dir = join(PKG, 'dist', 'components', 'rank-list');
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

describe('rank-list ③ 加法式（不挂这件即逐字节不变）', () => {
  it('renderDocShell 不带本件时产物里既没有本件的类名，也没有本件的样式；两次渲染逐字节相同', () => {
    const opts = { docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' };
    const base = renderDocShell(opts);
    assert.equal(base.includes(RANK_LIST_CLASS), false, '不带组件时不得出现它的类名');
    assert.equal(base, renderDocShell(opts), '两次渲染逐字节相同');
  });

  it('样式段是纯函数：同一入参两次调用逐字节相同（不依赖外部状态）', () => {
    assert.equal(rankListCss(), rankListCss());
    assert.equal(rankListCss(), rankListCss({ prefix: 'ilife-' }));
  });

  it('prefix 透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const text = rankListCss({ prefix: 'x-' });
    assert.ok(text.includes('.x-page-ui .x-block-rank-list'), '前缀必须作用到 scope 与类名两处');
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
  const dir = mkdtempSync(join(tmpdir(), 't-rl-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, html, 'utf8');
  const profile = mkdtempSync(join(tmpdir(), 't-rl-chrome-'));
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
    + skinCss() + '\n' + rankListCss() + '\n</style></head>\n<body>\n' + blocks.join('\n') + '\n</body></html>';
}

/** 三套皮肤 × 两个容器宽的六份夹具。 */
function matrixCases(markup) {
  const out = [];
  for (const skin of SKIN_NAMES) {
    for (const width of [390, 1280]) out.push({ key: skin + '-' + width, skin, width, markup });
  }
  return out;
}

/** 量一份夹具：容器／根盒、三张卡的盒子、名称的宽高与字号、条的宽度、关键文本是否被截。 */
function measureExpr(key) {
  const S = (cls) => JSON.stringify('.' + slot(cls));
  const caseSel = JSON.stringify('[data-case="' + key + '"]');
  const rootSel = JSON.stringify('.' + RANK_LIST_CLASS);
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
    return {
      box: { sw: sec.scrollWidth, cw: sec.clientWidth },
      root: { sw: root.scrollWidth, cw: root.clientWidth, r: Math.round(root.getBoundingClientRect().right),
        boxR: Math.round(sec.getBoundingClientRect().right) },
      cards: all(${S('card')}).map(rect),
      cardValues: all(${S('card')}).map(function (c) {
        return parseFloat(getComputedStyle(c.querySelector(${S('value')})).fontSize);
      }),
      cardRankColors: all(${S('card')}).map(function (c) {
        return getComputedStyle(c.querySelector(${S('rank')})).color;
      }),
      rows: all(${S('row')}).map(rect),
      names: all(${S('name')}).map(function (el) {
        var o = rect(el);
        o.fs = parseFloat(getComputedStyle(el).fontSize);
        o.text = (el.textContent || '').slice(0, 18);
        return o;
      }),
      bars: all(${S('bar')}).map(function (b) { return Math.round(b.getBoundingClientRect().width); }),
      keyed: all(${S('value')}).concat(all(${S('share')})).concat(all(${S('rank')}))
        .concat(all(${S('caliber')} + ' span')).concat(all(${S('caliber')} + ' b')).map(fit),
      doc: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth },
      markup: root.innerHTML
    };
  }())`;
}

describe('rank-list ④ 真机两档几何（390／1280）＋ 三套皮肤', () => {
  it('零横向溢出、名称不被挤成竖排、条够长、领奖台两档形状正确、三套皮肤下标记逐字节相同', async (t) => {
    const page = await startPage(fixtureHtml(matrixCases(renderRankList(INPUT))), 1400);
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
          assert.equal(r.bars.length, INPUT.rows.length, key + '：每一名都给条（' + r.bars.length + '）');
          for (const w of r.bars) {
            assert.ok(w >= RANK_LIST_BAR_MIN_PX, key + '：条不得细过 ' + RANK_LIST_BAR_MIN_PX + 'px（' + w + '）');
          }
          /* 名称不许被挤成竖排：宽度至少 4 个字，且最多三行（line-height 1.4 ⇒ 每行 ≈ 1.4 × 字号）。 */
          for (const n of r.names) {
            assert.ok(n.w >= n.fs * 4, key + '：名称宽度至少 4 个字（' + n.text + '：' + n.w + ' ≥ ' + Math.round(n.fs * 4) + '）');
            assert.ok(n.h <= n.fs * 1.4 * 3 + 2, key + '：名称最多三行（' + n.text + '：' + n.h + '）');
          }
          assert.equal(r.cards.length, RANK_LIST_PODIUM_SIZE, key + '：领奖台三张卡');
          if (width === 390) {
            assert.ok(r.cards[0].b <= r.cards[1].t + 1, key + '：窄档三张卡上下竖排（' + r.cards[0].b + ' ≤ ' + r.cards[1].t + '）');
            assert.ok(r.cards[1].b <= r.cards[2].t + 1, key + '：窄档名次按 1→2→3 竖排');
            assert.ok(r.cards[0].w >= r.root.cw - 2, key + '：窄档卡占满容器宽（' + r.cards[0].w + '／' + r.root.cw + '）');
          } else {
            assert.ok(r.cards[1].r <= r.cards[0].l + 1, key + '：宽档第 2 名在左、第 1 名居中（'
              + r.cards[1].r + ' ≤ ' + r.cards[0].l + '）');
            assert.ok(r.cards[0].r <= r.cards[2].l + 1, key + '：宽档第 1 名居中、第 3 名在右');
            assert.ok(r.cards[0].h > r.cards[1].h, key + '：第 1 名的卡更高（' + r.cards[0].h + ' > ' + r.cards[1].h + '）');
            assert.ok(r.cardValues[0] > r.cardValues[1],
              key + '：第 1 名的读数大一号（' + r.cardValues[0] + ' > ' + r.cardValues[1] + '）');
            assert.notEqual(r.cardRankColors[0], r.cardRankColors[1],
              key + '：第 1 名的名次走强调色的文本档（' + r.cardRankColors[0] + ' ≠ ' + r.cardRankColors[1] + '）');
          }
        }
      }
      for (const width of [390, 1280]) {
        const marks = SKIN_NAMES.map((skin) => readings[skin + '-' + width].markup);
        for (const m of marks) assert.equal(m, marks[0], width + ' 档：三套皮肤下标记必须逐字节相同');
      }
      for (const width of [390, 1280]) {
        const r = readings['paper-' + width];
        console.log('[rank-list ④ 读数] ' + width + 'px 容器：' + JSON.stringify({
          box: r.box, root: r.root, cards: r.cards, bars: r.bars,
          names: r.names.map((n) => ({ text: n.text, w: n.w, h: n.h })),
        }));
      }
    } finally { page.close(); }
  });

  it('长串兜底：长名称／大数／长口径行给进去，窄档仍零横向溢出且一个字都不少', async (t) => {
    const longName = '超市买菜与日用百货的合并采购项名称很长';
    const longCaliber = '大额榜 · 单位：元；占比按窗内合计折算，末尾那一行是聚合行。'.repeat(3);
    const markup = renderRankList({
      unit: '元', caliber: longCaliber,
      rows: [
        { name: longName, note: '12 次 · 每周', value: 1234567.89, share: 99.9 },
        { name: '外卖', value: 1, share: 0.1 },
      ],
    });
    const page = await startPage(fixtureHtml([{ key: 'long-390', skin: 'paper', width: 390, markup }]), 1400);
    if (page === null) return t.skip('本机无 Chrome／Chromium：长串兜底需真浏览器');
    try {
      const r = await page.ev(measureExpr('long-390'));
      assert.ok(r.box.sw <= r.box.cw, '长串下容器零横向溢出（' + r.box.sw + ' ≤ ' + r.box.cw + '）');
      assert.ok(r.root.sw <= r.root.cw, '长串下本件零横向溢出（' + r.root.sw + ' ≤ ' + r.root.cw + '）');
      assert.ok(r.doc.sw <= r.doc.cw, '长串下页级零横向溢出（' + r.doc.sw + ' ≤ ' + r.doc.cw + '）');
      for (const k of r.keyed) assert.ok(k.sw <= k.cw + 1, '关键文本不得被截断：' + k.text);
      const texts = await page.ev('(function(){var s=document.querySelector(\'[data-case="long-390"]\').textContent;'
        + 'return {name:s.indexOf(' + JSON.stringify(longName) + ')>=0,'
        + 'caliber:s.indexOf(' + JSON.stringify(longCaliber) + ')>=0};}())');
      assert.equal(texts.name, true, '长名称一个字都不少');
      assert.equal(texts.caliber, true, '长口径行一个字都不少');
      console.log('[rank-list ④ 读数] 长串 390px 容器：' + JSON.stringify({ box: r.box, root: r.root }));
    } finally { page.close(); }
  });
});

/* ── ⑤ 槽位名单与样式段对账 ─────────────────────────────────────────── */

describe('rank-list ⑤ 槽位名单', () => {
  it('名单里每个槽都能拼出类名，且都在样式段里被用到', () => {
    const css = rankListCss();
    for (const name of RANK_LIST_SLOTS) {
      const cls = rankListSlot(name);
      assert.ok(cls.startsWith(RANK_LIST_CLASS + '-'), cls);
      assert.ok(css.includes('.' + cls), '样式段里没有用到槽位 ' + name);
    }
  });
});
