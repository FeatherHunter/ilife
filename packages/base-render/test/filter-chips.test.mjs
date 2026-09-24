/** filterChips（筛选条 · 形态 A）· 契约判据。
 *
 * 四类（工艺书第六节）：① 渲染契约（含转义与全部非法入参分支）② 样式与零 DOM 纪律
 * ③ 加法式 ④ 真机两档几何 ＋ 触控目标 ＋ 真运行时（计数／合计／清除／空态／错态／载入态）。
 *
 * 这一件的硬要求：**chip 必须是原生 `<button>`**、集合**只换行不横滑不截断**、触控 ≥44×44。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildFilterChipsJs, filterChipsCss, renderFilterChips, chipsErrorId,
  CHIPS_DEFAULTS, CHIPS_FORMS, CHIPS_MAX_WIDTH_PX, CHIPS_NAME_ATTR, CHIPS_TOUCH_MIN_PX, CHIP_ATTR,
  CHIP_ITEM_ATTR, CHIP_ITEM_TAGS_ATTR, CHIP_ITEM_VALUE_ATTR, CHIP_N_ATTR,
} from '../dist/components/filter-chips/index.js';
import { PAGE_UI_CLASS } from '../dist/components/page-ui/index.js';
import { skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { buildF6Html, startF6Page } from './_f6-chrome-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const C = 'ilife-block-filter-chips';
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── 夹具：一批记录（每条带档标签与金额；命中数与合计都要算得出来）── */
const OPTIONS = [
  { value: 'meal', label: '餐费', count: 99, common: true },
  { value: 'traffic', label: '交通', count: 99, common: true },
  { value: 'daily', label: '日用', count: 99 },
  { value: 'sub', label: '订阅', count: 99 },
];
/** `[档标签, 金额]`；并集（选了 餐费＋交通）＝ 前三条，合计 88.5 + 12 + 20.25 ＝ 120.75。 */
const ROWS = [
  ['meal', '88.50'],
  ['meal traffic', '12'],
  ['traffic', '20.25'],
  ['daily', '5'],
  ['', '3'],
];
const ROWS_MEAL = 2;
const ROWS_ALL = 5;
const TOTAL_ALL = '128.75';

function rowsHtml() {
  return '<div data-ilife-chips-region="bills">'
    + ROWS.map(([tags, value], i) => '<div class="f6-row" ' + CHIP_ITEM_ATTR + '="" '
      + CHIP_ITEM_TAGS_ATTR + '="' + tags + '" ' + CHIP_ITEM_VALUE_ATTR + '="' + value + '">'
      + '第 ' + String(i + 1) + ' 笔</div>').join('')
    + '</div>';
}

function chips(opts) {
  return renderFilterChips(Object.assign({
    name: 'kind', label: '按分类筛', commonLabel: '常用', moreLabel: '更多分类',
    options: OPTIONS, selected: ['meal'], target: 'bills',
  }, opts === undefined ? {} : opts));
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('filterChips ① 渲染契约', () => {
  it('chip 必须是原生 <button>：每颗都带 data-ilife-chip 与 aria-pressed', () => {
    const html = chips();
    const chipsHtml = [...html.matchAll(/<button[^>]*data-ilife-chip="([^"]+)"[^>]*>/g)];
    assert.equal(chipsHtml.length, OPTIONS.length, '四档四颗键');
    for (const m of chipsHtml) assert.ok(m[0].includes('type="button"'), '每颗都是原生按钮：' + m[0]);
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1, '恰一档选中');
    assert.equal((html.match(/aria-pressed="false"/g) || []).length, OPTIONS.length - 1, '其余未选中');
    assert.ok(!/<span[^>]*role="button"/.test(html), '不许拿 span 扮按钮');
  });

  it('形态 A：常用一行 ＋「更多」可展开（默认展开，集合默认全在页上）', () => {
    const html = chips();
    assert.ok(html.includes('class="' + C + '"'), '类名根打头');
    assert.ok(html.includes('常用'), '常用那一行的标头在');
    assert.ok(html.includes('<details class="' + C + '-more" open'), '「更多」默认展开');
    assert.ok(html.includes('更多分类'), '「更多」那一句在（名字由调用方给）');
    const rows = [...html.matchAll(/data-ilife-chips-row="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(rows, ['常用', '更多分类'], '两行各有自己的 aria-label 依据');
  });

  it('计数与合计渲染期只写初值或「—」，真数留给运行时', () => {
    const html = chips();
    const ns = [...html.matchAll(/data-ilife-chip-n="">([^<]*)</g)].map((m) => m[1]);
    assert.deepEqual(ns, ['99', '99', '99', '99'], '调用方给的初值照收');
    assert.ok(/data-ilife-chips-picked="">1</.test(html), '已选数按 selected 写');
    assert.ok(html.includes('data-ilife-chips-rows="">' + CHIPS_DEFAULTS.unset + '<'), '记录数写「—」（运行时才算）');
    assert.ok(html.includes('data-ilife-chips-total="">' + CHIPS_DEFAULTS.unset + '<'), '合计写「—」');
    const none = renderFilterChips({
      name: 'k', options: [
        { value: 'a', label: 'A' }, { value: 'b', label: 'B', count: 7 },
      ],
    });
    const ns2 = [...none.matchAll(/data-ilife-chip-n="">([^<]*)</g)].map((m) => m[1]);
    assert.deepEqual(ns2, [CHIPS_DEFAULTS.unset, '7'], '没给计数的档写「—」');
  });

  it('空态：没有可筛的档时给一句设计过的话（不是一片空白）', () => {
    const html = renderFilterChips({ name: 'k', options: [], emptyText: '这里还没有分类' });
    assert.ok(html.includes('这里还没有分类'), '空态句上屏');
    assert.ok(html.includes('data-ilife-chips-empty'), '空态行带锚');
    assert.ok(!html.includes('<button'), '没有档就不出按钮');
  });

  it('禁用／载入／错态：都在标记里可断', () => {
    const dis = chips({ disabled: true });
    assert.equal((dis.match(/ disabled/g) || []).length, OPTIONS.length + 1, '每颗 chip ＋ 清除键一起禁用');
    const loading = chips({ loading: true });
    assert.ok(loading.includes('data-ilife-chips-loading="1"'), '载入态上根属性');
    assert.ok(loading.includes(CHIPS_DEFAULTS.loadingText), '载入字在标记里（CSS 原地换字）');
    assert.ok(loading.includes('data-ilife-chips-status'), '状态行仍在（换字不重造）');
    const err = chips({ error: '这组筛选坏了' });
    assert.ok(err.includes('data-ilife-chips-invalid="1"'), '错态上根属性');
    assert.ok(new RegExp(chipsErrorId('kind')).test(err), '错态行有 id');
    assert.ok(err.includes('这组筛选坏了'), '错句上屏');
  });

  it('转义面：机器值／上屏字／标签／错句／附加类名逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderFilterChips({
      name: evil, label: evil, commonLabel: evil, moreLabel: evil, options: [
        { value: evil, label: evil, common: true }, { value: 'b', label: 'B' },
      ], selected: [evil], error: evil, extraClass: 'ok-class other',
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本：' + html.slice(0, 160));
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.ok(html.includes('ok-class other'), '合法附加类名照收');
  });

  it('入参违规一律拒（每个分支都断 BlocksError）', () => {
    const bad = (input, why) => assert.throws(() => renderFilterChips(input), (e) => {
      assert.equal(e.name, 'BlocksError', why);
      return true;
    }, why);
    bad(null, 'null');
    bad({}, '缺 name');
    bad({ name: '', options: [] }, '空 name');
    bad({ name: 'a', options: 'x' }, 'options 不是数组');
    bad({ name: 'a', options: [''] }, 'options 里空串');
    bad({ name: 'a', options: [{ label: 'x' }, 'b'] }, 'options 缺 value');
    bad({ name: 'a', options: [{ value: 'x', label: 'x', count: true }, 'b'] }, 'count 不是数也不是串');
    bad({ name: 'a', options: [{ value: 'x', label: 'x' }, 'x'] }, '机器值重复');
    bad({ name: 'a', options: ['x'], selected: 'x' }, 'selected 不是数组');
    bad({ name: 'a', options: ['x'], selected: ['y'] }, 'selected 里有 options 外的值');
    bad({ name: 'a', options: ['x'], selected: ['x', 'x'] }, 'selected 重复');
    bad({ name: 'a', options: ['x'], form: 'C' }, '形态闭集外');
    bad({ name: 'a', options: ['x'], moreOpen: 1 }, 'moreOpen 不是布尔');
    bad({ name: 'a', options: ['x'], disabled: 'yes' }, 'disabled 不是布尔');
    bad({ name: 'a', options: ['x'], loading: 1 }, 'loading 不是布尔');
    bad({ name: 'a', options: ['x'], label: 7 }, 'label 不是字符串');
    bad({ name: 'a', options: ['x'], extraClass: 'a>b' }, '非法附加类名');
    assert.equal(CHIPS_FORMS[0], 'A');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('filterChips ② 样式与零 DOM 纪律', () => {
  const css = stripCss(filterChipsCss());

  it('样式段非空，选择器全在 .ilife-page-ui 之下', () => {
    assert.ok(css.length > 0);
    const sels = [];
    for (const block of css.split('}')) {
      const at = block.indexOf('{');
      if (at < 0) continue;
      const head = block.slice(0, at).split('}').pop().trim();
      if (head === '' || head.startsWith('@')) continue;
      for (const one of head.split(',')) sels.push(one.trim());
    }
    assert.ok(sels.length >= 20, '选择器太少：' + sels.length);
    for (const s of sels) assert.ok(s.startsWith('.' + PAGE_UI_CLASS), '不在作用域内：' + s);
  });

  it('零 :root／零 !important／零 @media (max-width)；chip 行只换行不横滑', () => {
    assert.ok(!css.includes(':root'));
    assert.ok(!css.includes('!important'));
    assert.ok(!/@media\s*\(max-width/.test(css), '宽度不许用视口判');
    const rowRule = css.split('\n').find((l) => l.includes(C + '-row{'));
    assert.ok(rowRule !== undefined && rowRule.includes('flex-wrap:wrap'), 'chip 行必须换行：' + rowRule);
    assert.ok(!rowRule.includes('overflow-x'), 'chip 行不许横滑');
    assert.ok(!css.includes('text-overflow:ellipsis'), '不许硬截断（省略号）');
  });

  it('只经 skinVar 读皮肤；不重定义冻结 token；源码零手写 var(--ilife-…)', () => {
    const src = ['attrs.ts', 'style.ts', 'render.ts', 'runtime.ts', 'model.ts', 'index.ts']
      .map((f) => readFileSync(join(PKG, 'src', 'components', 'filter-chips', f), 'utf8')).join('\n');
    const srcNoComment = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.equal(/var\(\s*--ilife-/.test(srcNoComment), false, '手写了 var(--ilife-…)：该走 skinVar()');
    assert.ok(css.includes('var(--ilife-ink,'), '样式里应出现兜底链');
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
    assert.ok(css.includes('max-width:' + CHIPS_MAX_WIDTH_PX + 'px'), '宽档上限取常量');
  });

  it('dist/components/filter-chips/** 的代码零 document.／window.／navigator.', () => {
    const dir = join(PKG, 'dist', 'components', 'filter-chips');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 5, '编译产物应在（先跑 tsc -b）：' + files.length);
    for (const f of files) {
      const code = readFileSync(f, 'utf8')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/`(?:[^`\\]|\\.)*`/g, '``').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.ok(!code.includes(needle), f.replace(PKG, '') + ' 出现 ' + needle);
      }
    }
  });

  it('运行时段：可解析、幂等、DOM 只住字符串里', () => {
    const js = buildFilterChipsJs();
    assert.doesNotThrow(() => { void new Function(js); });
    assert.ok(js.includes('data-ilife-chips-runtime'), '重复注入只绑一次');
    assert.ok(js.includes('document'), '运行时段在页里用 document');
    assert.equal(js.includes('innerHTML'), false, '不靠 innerHTML 拼内容');
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('filterChips ③ 加法式（不挂这件＝零命中）', () => {
  it('renderDocShell 默认产物里没有本件的类名与运行时段', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.ok(!base.includes(C), '不得出现本件类名');
    assert.ok(!base.includes('ilife:filter-change'), '不得出现本件运行时段');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('样式只读自己的类名与自己的 data-*', () => {
    const css0 = stripCss(filterChipsCss());
    for (const t of new Set([...css0.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]))) {
      assert.ok(t === PAGE_UI_CLASS || t.startsWith(C), '样式里出现不属于本件的类名：' + t);
    }
    for (const a of new Set([...css0.matchAll(/\[(data-[a-z-]+)/g)].map((m) => m[1]))) {
      assert.ok(a.startsWith('data-ilife-chip'), '样式里出现不属于本件的属性名：' + a);
    }
  });

  it('渲染是纯函数：同一份入参两次逐字节相同', () => {
    assert.equal(chips(), chips());
  });
});

/* ── ④ 真机 ───────────────────────────────────────────────────────── */

const ROW_SEL = '.' + C + '-row';
const KEYS = ['.' + C + '-sum', '.f6-row'];
const scopeNs = (p) => p.ev('[].map.call(document.querySelectorAll("#box [data-ilife-chip-n]"),function(e){return e.textContent})');
const txt = (p, sel) => p.ev('(function(){var e=document.querySelector("#box ' + sel + '");return e?e.textContent:null}())');

describe('filterChips ④ 真机（headless Chrome）', () => {
  it('两档几何（390／1280）零横向溢出 ＋ 换行不横滑 ＋ 触控 ≥44×44 ＋ 计数与合计是真数', async (t) => {
    const html = buildF6Html({
      title: 'filter-chips', skin: 'ilife-skin-paper',
      css: skinCss() + filterChipsCss(),
      body: chips() + rowsHtml(),
      scripts: [buildFilterChipsJs()],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何与真运行时判据需真浏览器');
    try {
      /* 首次挂载：每档计数按真实记录数写实 */
      assert.deepEqual(await scopeNs(p), ['2', '2', '1', '0'], '每档计数＝带该档标签的记录数（订阅 0 条）');
      assert.equal(await txt(p, '[data-ilife-chips-picked]'), '1', '已选 1 档');
      assert.equal(await txt(p, '[data-ilife-chips-rows]'), String(ROWS_MEAL), '记录数＝餐费那两条');
      assert.equal(await txt(p, '[data-ilife-chips-total]'), '100.50', '合计＝88.50+12.00');

      /* 多选：并集不是相加（交通与餐费并起来 3 条；中间那条被两档命中只算一次） */
      await p.click('#box [data-ilife-chip="traffic"]');
      assert.equal(await txt(p, '[data-ilife-chips-picked]'), '2', '已选 2 档');
      assert.equal(await txt(p, '[data-ilife-chips-rows]'), '3', '并集 3 条（不是 2+2）');
      assert.equal(await txt(p, '[data-ilife-chips-total]'), '120.75', '合计＝88.50+12+20.25');

      /* 事件带真读数 */
      await p.listen('ilife:filter-change');
      await p.click('#box [data-ilife-chip="daily"]');
      const evs = await p.events('ilife:filter-change');
      assert.equal(evs.length, 1, '切换一次派发一条');
      assert.equal(evs[0].detail.rows, 4, '事件里的记录数是真的');
      assert.equal(evs[0].detail.total, '125.75', '事件里的合计是真的');

      /* 空集：只选订阅（0 条）→ 设计过的空态 */
      await p.click('#box [data-ilife-chips-clear]');
      await p.click('#box [data-ilife-chip="sub"]');
      assert.equal(await txt(p, '[data-ilife-chips-rows]'), '0', '订阅 0 条');
      assert.equal((await p.rectOf('#box [data-ilife-chips-empty]')).hidden, false, '空态行顶上来');

      /* 清除：回到不筛＝全部 */
      await p.click('#box [data-ilife-chips-clear]');
      assert.equal(await txt(p, '[data-ilife-chips-picked]'), CHIPS_DEFAULTS.allText, '没选＝全部');
      assert.equal(await txt(p, '[data-ilife-chips-rows]'), String(ROWS_ALL), '记录数＝全部 5 条');
      assert.equal(await txt(p, '[data-ilife-chips-total]'), TOTAL_ALL, '合计＝全部 128.75');
      assert.equal((await p.rectOf('#box [data-ilife-chips-empty]')).hidden, true, '空态行收起');
      assert.deepEqual(await scopeNs(p), ['2', '2', '1', '0'], '清除不改各档自己的计数');

      /* 坏金额被点名（错态 ＋ aria-describedby 指过去），不静默当 0 */
      await p.ev('(function(){var r=document.querySelectorAll("#box [' + CHIP_ITEM_ATTR + ']");'
        + 'r[0].setAttribute("' + CHIP_ITEM_VALUE_ATTR + '","—");return true}())');
      await p.click('#box [data-ilife-chip="meal"]');
      const errText = await txt(p, '[data-ilife-chips-error]');
      assert.ok(/[0-9]/.test(errText), '错句里点名了几条读不出来：' + errText);
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-chips]").hasAttribute("data-ilife-chips-invalid")'), true, '错态上根属性');
      assert.equal(await txt(p, '[data-ilife-chips-total]'), '12.00', '合计只算读得出来的那些');

      /* 载入态：原地换字、清除收起、不写假数 */
      await p.ev('document.dispatchEvent(new CustomEvent("ilife:chips-loading",{detail:{name:"kind",on:true}}));true');
      assert.equal(await p.ev('getComputedStyle(document.querySelector("#box .' + C + '-sum-text")).display'), 'none', '真读数位收起');
      assert.equal(await p.ev('getComputedStyle(document.querySelector("#box .' + C + '-loading")).display'), 'inline', '载入字顶上来');
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-chips-clear]").disabled'), true, '载入中清除收起');
      await p.ev('document.dispatchEvent(new CustomEvent("ilife:chips-loading",{detail:{name:"kind",on:false}}));true');
      assert.equal(await txt(p, '[data-ilife-chips-total]'), '12.00', '载入结束后回到真读数');

      /* 两档几何 */
      for (const w of [390, 1280]) {
        const m = await p.measure(w, { keys: KEYS, rows: [ROW_SEL] });
        assert.equal(m.box.sw <= m.box.cw, true, w + ' 档：容器横向溢出 ' + m.box.sw + ' > ' + m.box.cw);
        assert.equal(m.doc.sw <= m.doc.cw, true, w + ' 档：整页横向溢出');
        assert.deepEqual(m.offenders, [], w + ' 档：有后代越出容器右缘');
        for (const row of m.rows) {
          assert.equal(row.flexWrap, 'wrap', w + ' 档：chip 行必须换行');
          assert.ok(row.overflowX !== 'auto' && row.overflowX !== 'scroll', w + ' 档：chip 行藏了横滑');
        }
        for (const k of m.keys) {
          assert.ok(k.sw <= k.cw + 1, w + ' 档：关键语义位被截断「' + k.text + '」');
          assert.notEqual(k.textOverflow, 'ellipsis', w + ' 档：关键语义位用了省略号：' + k.sel);
        }
        for (const tg of m.targets) {
          assert.ok(tg.w >= CHIPS_TOUCH_MIN_PX && tg.h >= CHIPS_TOUCH_MIN_PX,
            w + ' 档：触控目标 ' + tg.cls + ' 只有 ' + tg.w + '×' + tg.h);
          assert.equal(tg.hit, true, w + ' 档：触控目标中心点命不中它自己：' + tg.cls);
        }
        const gaps = await p.ev('(function(){var box=document.getElementById("box");'
          + 'var ns=[].slice.call(box.querySelectorAll("button,input"));'
          + 'var rs=ns.map(function(e){return e.getBoundingClientRect()});var bad=[];'
          + 'for(var i=0;i<rs.length;i++)for(var j=i+1;j<rs.length;j++){'
          + 'var a=rs[i],b=rs[j]; if(a.width===0||b.width===0)continue;'
          + 'if(a.bottom<=b.top+1||b.bottom<=a.top+1)continue;'
          + 'var gap=Math.max(b.left,a.left)-Math.min(a.right,b.right); if(gap<8)bad.push(Math.round(gap));}'
          + 'return bad;}())');
        assert.deepEqual(gaps, [], w + ' 档：相邻触控目标间距 <8px');
      }
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { await p.close(); }
  });

  it('错态：记录区没接上就写在控件旁边', async (t) => {
    const html = buildF6Html({
      title: 'filter-chips-unwired', skin: 'ilife-skin-neutral',
      css: skinCss() + filterChipsCss(),
      body: chips({ target: 'nope' }),
      scripts: [buildFilterChipsJs()],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-chips]").hasAttribute("data-ilife-chips-invalid")'), true, '没接上记录区 → 错态');
      const row = await p.rectOf('#box [data-ilife-chips-error]');
      assert.equal(row.hidden, false, '错句顶上来');
      assert.ok((await txt(p, '[data-ilife-chips-error]')).length > 0, '错句有字');
      assert.deepEqual(await p.errs(), []);
    } finally { await p.close(); }
  });

  it('三套皮肤下标记逐字节相同（皮肤只改取值，不改骨架）', () => {
    const cut = (skin) => {
      const h = buildF6Html({ title: 's', skin, css: filterChipsCss(), body: chips() + rowsHtml() });
      return h.slice(h.indexOf('<div id="box">'), h.indexOf('<script>'));
    };
    assert.equal(cut('ilife-skin-paper'), cut('ilife-skin-broadsheet'), 'paper 与 broadsheet 必须逐字节相同');
    assert.equal(cut('ilife-skin-paper'), cut('ilife-skin-neutral'), 'paper 与 neutral 必须逐字节相同');
  });
});
