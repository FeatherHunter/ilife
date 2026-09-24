/** sortToggle（排序切换 · 形态 C）· 契约判据。
 *
 * 四类（工艺书第六节）：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 真机两档几何 ＋ 触控 ＋
 * **真运行时**：换视图／按反向键之后，条目顺序**真的**按新方向重排，条数是数出来的，口径句跟着换。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSortToggleJs, renderSortToggle, sortToggleCss, sortErrorId,
  SORT_DEFAULTS, SORT_FORMS, SORT_MAX_WIDTH_PX, SORT_TOUCH_MIN_PX,
} from '../dist/components/sort-toggle/index.js';
import { PAGE_UI_CLASS } from '../dist/components/page-ui/index.js';
import { skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { buildF6Html, startF6Page } from './_f6-chrome-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const C = 'ilife-block-sort-toggle';
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** 三个视图；条目带 `used`／`score` 两个数键（排序键）。 */
const VIEWS = [
  { value: 'all', label: '全部', count: 99, caliber: '不筛，按名字', field: 'name', dir: 'asc' },
  { value: 'used', label: '常做', count: 99, caliber: '用过几次从多到少，只看做过 ≥2 次的', field: 'used', dir: 'desc' },
  { value: 'score', label: '高分', count: 99, caliber: '评分从高到低', field: 'score', dir: 'desc' },
];
/** `[视图标签, 名字, 用过次数, 评分]`；常做档＝前三道；按 used 降序应为 丙(6) 甲(4) 乙(2)。 */
const ITEMS = [
  ['all used', '甲菜', '4', '4.2'],
  ['all used', '乙菜', '2', '4.8'],
  ['all used score', '丙菜', '6', '4.9'],
  ['all', '丁菜', '', ''],
];

function itemsHtml() {
  return '<div data-ilife-sort-region="dishes">'
    + ITEMS.map(([tags, name, used, score]) => '<article class="f6-item" data-ilife-sort-item="" '
      + 'data-ilife-sort-tags="' + tags + '" data-ilife-sort-name="' + name + '"'
      + (used === '' ? '' : ' data-ilife-sort-used="' + used + '"')
      + (score === '' ? '' : ' data-ilife-sort-score="' + score + '"') + '>' + name + '</article>').join('')
    + '</div>';
}

function toggle(opts) {
  return renderSortToggle(Object.assign({
    name: 'sort', label: '视图', views: VIEWS, view: 'used', target: 'dishes', unit: '道',
  }, opts === undefined ? {} : opts));
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('sortToggle ① 渲染契约', () => {
  it('形态 C：视图条（每档带条数）＋ 口径句 ＋ 脚（反向键 ＋ 几条）', () => {
    const html = toggle();
    assert.ok(html.startsWith('<div class="' + C), '类名根打头：' + html.slice(0, 80));
    assert.ok(html.includes('data-ilife-sort-form="' + SORT_FORMS[0] + '"'), '形态键上属性');
    const views = [...html.matchAll(/<button[^>]*data-ilife-sort-view="([^"]+)"[^>]*>/g)].map((m) => m[1]);
    assert.deepEqual(views, VIEWS.map((v) => v.value), '三档视图都在');
    for (const m of html.matchAll(/<button[^>]*data-ilife-sort-view="[^"]+"[^>]*>/g)) {
      assert.ok(m[0].includes('type="button"'), '视图键是原生按钮：' + m[0]);
    }
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1, '恰一档选中（单选）');
    assert.ok(html.includes('data-ilife-sort-flip'), '反向键在');
    assert.ok(html.includes(SORT_DEFAULTS.flipLabel), '反向键字面根在');
    assert.ok(html.includes('data-ilife-sort-flip-label="' + SORT_DEFAULTS.flipLabel + '"'), '字面根上根属性（运行时不自造字面量）');
    assert.ok(html.includes('data-ilife-sort-caliber-line'), '口径行在');
    assert.ok(html.includes('data-ilife-sort-caliber-text'), '口径那一处有槽');
    assert.ok(html.includes('≥2 次'), '当前档的口径句上屏');
    assert.ok(html.includes('data-ilife-sort-shown'), '几条的数位在');
  });

  it('每档带上自己的排序字段与方向（运行时段按它排）', () => {
    const html = toggle();
    assert.ok(/data-ilife-sort-view="used"[^>]*data-ilife-sort-field="used"[^>]*data-ilife-sort-dir="desc"/.test(html), '常做档：字段＋方向');
    assert.ok(/data-ilife-sort-view="all"[^>]*data-ilife-sort-field="name"[^>]*data-ilife-sort-dir="asc"/.test(html), '全部档：字典序升');
  });

  it('条数与「几条」渲染期只写初值或「—」', () => {
    const html = toggle();
    const ns = [...html.matchAll(/data-ilife-sort-n="">([^<]*)</g)].map((m) => m[1]);
    assert.deepEqual(ns, ['99', '99', '99'], '调用方给的初值照收');
    assert.ok(html.includes('data-ilife-sort-shown="">' + SORT_DEFAULTS.unset + '<'), '「几条」写「—」');
    const none = renderSortToggle({ name: 's', views: ['a', 'b'] });
    const ns2 = [...none.matchAll(/data-ilife-sort-n="">([^<]*)</g)].map((m) => m[1]);
    assert.deepEqual(ns2, [SORT_DEFAULTS.unset, SORT_DEFAULTS.unset], '没给条数写「—」');
    assert.ok(none.includes(SORT_DEFAULTS.noCaliberText), '没给口径句时写一句「没写口径句」');
  });

  it('禁用／载入／错态都在标记里可断', () => {
    const dis = toggle({ disabled: true });
    assert.equal((dis.match(/ disabled/g) || []).length, VIEWS.length + 1, '三档 ＋ 反向键一起禁用');
    const loading = toggle({ loading: true });
    assert.ok(loading.includes('data-ilife-sort-loading="1"') && loading.includes(SORT_DEFAULTS.loadingText), '载入态');
    const err = toggle({ error: '这档排不了' });
    assert.ok(err.includes('data-ilife-sort-invalid="1"'), '错态上根属性');
    assert.ok(new RegExp(sortErrorId('sort')).test(err), '错态行有 id');
    assert.ok(err.includes('这档排不了'), '错句上屏');
  });

  it('转义面：机器键／视图名／口径句／单位逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderSortToggle({
      name: evil, label: evil, unit: evil, loadingText: evil, error: evil, extraClass: 'ok other',
      views: [{ value: evil, label: evil, caliber: evil, field: 'name' }, { value: 'b', label: 'B' }],
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本：' + html.slice(0, 160));
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('ok other'), '合法附加类名照收');
  });

  it('入参违规一律拒（每个分支都断 BlocksError）', () => {
    const bad = (input, why) => assert.throws(() => renderSortToggle(input), (e) => {
      assert.equal(e.name, 'BlocksError', why);
      return true;
    }, why);
    bad(null, 'null');
    bad({}, '缺 name');
    bad({ name: '', views: ['a'] }, '空 name');
    bad({ name: 'a' }, '缺 views');
    bad({ name: 'a', views: [] }, 'views 空数组');
    bad({ name: 'a', views: ['' ] }, 'views 里空串');
    bad({ name: 'a', views: [{ label: 'x' }, 'b'] }, 'views 缺 value');
    bad({ name: 'a', views: [{ value: 'x', label: 'x', count: true }, 'b'] }, 'count 不是数也不是串');
    bad({ name: 'a', views: ['x', 'x'] }, '机器值重复');
    bad({ name: 'a', views: ['x'], view: 'y' }, 'view 不在 views 里');
    bad({ name: 'a', views: [{ value: 'x', label: 'x', field: 'Bad' }] }, 'field 含大写');
    bad({ name: 'a', views: [{ value: 'x', label: 'x', field: '1x' }] }, 'field 数字开头');
    bad({ name: 'a', views: [{ value: 'x', label: 'x', dir: 'up' }] }, 'dir 闭集外');
    bad({ name: 'a', views: ['x'], form: 'A' }, '形态闭集外');
    bad({ name: 'a', views: ['x'], disabled: 1 }, 'disabled 不是布尔');
    bad({ name: 'a', views: ['x'], loading: 'x' }, 'loading 不是布尔');
    bad({ name: 'a', views: ['x'], unit: 7 }, 'unit 不是字符串');
    bad({ name: 'a', views: ['x'], extraClass: '.bad' }, '非法附加类名');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('sortToggle ② 样式与零 DOM 纪律', () => {
  const css = stripCss(sortToggleCss());

  it('样式段非空，选择器全在 .ilife-page-ui 之下，零 :root／!important／@media (max-width)', () => {
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
    assert.ok(!css.includes(':root') && !css.includes('!important'));
    assert.ok(!/@media\s*\(max-width/.test(css), '宽度不许用视口判');
    const bar = css.split('\n').find((l) => l.includes(C + '-viewbar{'));
    assert.ok(bar !== undefined && bar.includes('flex-wrap:wrap'), '视图条必须换行：' + bar);
    assert.ok(!css.includes('text-overflow:ellipsis'), '不许硬截断');
  });

  it('只经 skinVar 读皮肤；不重定义冻结 token；源码零手写 var(--ilife-…)', () => {
    const src = ['attrs.ts', 'style.ts', 'render.ts', 'runtime.ts', 'model.ts', 'index.ts']
      .map((f) => readFileSync(join(PKG, 'src', 'components', 'sort-toggle', f), 'utf8')).join('\n');
    const srcNoComment = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.equal(/var\(\s*--ilife-/.test(srcNoComment), false, '手写了 var(--ilife-…)');
    assert.ok(css.includes('var(--ilife-ink,'), '样式里应出现兜底链');
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
    assert.ok(css.includes('max-width:' + SORT_MAX_WIDTH_PX + 'px'), '宽档上限取常量');
  });

  it('dist/components/sort-toggle/** 的代码零 document.／window.／navigator.', () => {
    const dir = join(PKG, 'dist', 'components', 'sort-toggle');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 5, '编译产物应在：' + files.length);
    for (const f of files) {
      const code = readFileSync(f, 'utf8')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/`(?:[^`\\]|\\.)*`/g, '``').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.ok(!code.includes(needle), f.replace(PKG, '') + ' 出现 ' + needle);
      }
    }
  });

  it('运行时段：可解析、幂等、真排序（按字段 appendChild 重排）', () => {
    const js = buildSortToggleJs();
    assert.doesNotThrow(() => { void new Function(js); });
    assert.ok(js.includes('data-ilife-sort-runtime'), '重复注入只绑一次');
    assert.ok(js.includes('appendChild'), '真排序：按新顺序把条目放回去');
    assert.equal(js.includes('innerHTML'), false, '不靠 innerHTML 拼内容');
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('sortToggle ③ 加法式（不挂这件＝零命中）', () => {
  it('renderDocShell 默认产物里没有本件的类名与运行时段', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.ok(!base.includes(C) && !base.includes('ilife:sort-change'));
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('样式只读自己的类名与自己的 data-*', () => {
    const css0 = stripCss(sortToggleCss());
    for (const t of new Set([...css0.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]))) {
      assert.ok(t === PAGE_UI_CLASS || t.startsWith(C), '不属于本件的类名：' + t);
    }
    for (const a of new Set([...css0.matchAll(/\[(data-[a-z-]+)/g)].map((m) => m[1]))) {
      assert.ok(a.startsWith('data-ilife-sort'), '不属于本件的属性名：' + a);
    }
  });

  it('渲染是纯函数：同一份入参两次逐字节相同', () => {
    assert.equal(toggle(), toggle());
  });
});

/* ── ④ 真机 ───────────────────────────────────────────────────────── */

const order = (p) => p.ev('[].map.call(document.querySelectorAll("#box .f6-item"),function(e){return e.textContent})');
const txt = (p, sel) => p.ev('(function(){var e=document.querySelector("#box ' + sel + '");return e?e.textContent:null}())');
const KEYS = ['.' + C + '-status', '.' + C + '-caliber'];

describe('sortToggle ④ 真机（headless Chrome）', () => {
  it('两档几何（390／1280）零横向溢出 ＋ 触控 ≥44×44 ＋ 顺序真的重排 ＋ 条数真数', async (t) => {
    const html = buildF6Html({
      title: 'sort-toggle', skin: 'ilife-skin-paper',
      css: skinCss() + sortToggleCss(),
      body: toggle() + itemsHtml(),
      scripts: [buildSortToggleJs()],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何与真运行时判据需真浏览器');
    try {
      /* 首次挂载：常做档 3 条，按 used 降序 ⇒ 丙(6) 甲(4) 乙(2) */
      const ns = () => p.ev('[].map.call(document.querySelectorAll("#box [data-ilife-sort-n]"),function(e){return e.textContent})');
      assert.deepEqual(await ns(), ['4', '3', '1'], '每档条数＝属于该档的条目数');
      assert.equal(await txt(p, '[data-ilife-sort-shown]'), '3', '当前视图 3 条');
      assert.deepEqual(await order(p), ['丙菜', '甲菜', '乙菜', '丁菜'], '按用过次数从多到少重排过');

      /* 反向键：顺序真的反过来 */
      await p.click('#box [data-ilife-sort-flip]');
      assert.deepEqual(await order(p), ['乙菜', '甲菜', '丙菜', '丁菜'], '反向键把顺序翻过来');
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-sort-flip]").getAttribute("aria-pressed")'), 'true', '反向键自报已反向');
      assert.ok((await txt(p, '[data-ilife-sort-flip]')).includes(SORT_DEFAULTS.toDesc), '反向键字面跟着换（现在按下去＝从多到少）');

      /* 换视图：口径句与顺序都跟着换 */
      await p.listen('ilife:sort-change');
      await p.click('#box [data-ilife-sort-view="score"]');
      assert.equal(await txt(p, '[data-ilife-sort-shown]'), '1', '高分档 1 条');
      assert.ok((await txt(p, '[data-ilife-sort-ink]')).includes('高分'), '口径行里的视图名跟着换');
      assert.ok((await txt(p, '[data-ilife-sort-caliber-text]')).includes('评分从高到低'), '口径句跟着换');
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-sort-flip]").getAttribute("aria-pressed")'), 'false', '换视图后反向键归零');
      const evs = await p.events('ilife:sort-change');
      assert.equal(evs.length, 1, '换视图派发一条');
      assert.equal(evs[0].detail.view, 'score', '事件带当前视图');
      assert.equal(evs[0].detail.shown, 1, '事件带真条数');
      assert.equal(evs[0].detail.dir, 'desc', '事件带方向（字面字典序升的那一档除外）');

      /* 字典序那一档：全部档按名字升序 ⇒ 丁 丙 乙 甲 不成立（拼音不参与），按码位：丁/丙/乙/甲 */
      await p.click('#box [data-ilife-sort-view="all"]');
      assert.equal(await txt(p, '[data-ilife-sort-shown]'), '4', '全部档 4 条');
      assert.deepEqual(await order(p), ['丁菜', '丙菜', '乙菜', '甲菜'], '全部档按名字字面序升');

      /* 读不到排序键：点名（错态），不静默当排好了 */
      await p.ev('(function(){var it=document.querySelectorAll("#box [data-ilife-sort-item]");'
        + 'for(var i=0;i<it.length;i+=1) it[i].removeAttribute("data-ilife-sort-name");return true}())');
      await p.click('#box [data-ilife-sort-view="used"]');
      await p.click('#box [data-ilife-sort-view="all"]');
      const err = await txt(p, '[data-ilife-sort-error]');
      assert.ok(err.includes('name'), '错句点名是哪个键读不到：' + err);
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-sort]").hasAttribute("data-ilife-sort-invalid")'), true, '错态上根属性');

      /* 载入态：原地换字、反向键收起 */
      await p.ev('document.dispatchEvent(new CustomEvent("ilife:sort-loading",{detail:{name:"sort",on:true}}));true');
      assert.equal(await p.ev('getComputedStyle(document.querySelector("#box .' + C + '-status-text")).display'), 'none', '真读数位收起');
      assert.equal(await p.ev('getComputedStyle(document.querySelector("#box .' + C + '-loading")).display'), 'inline', '载入字顶上来');
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-sort-flip]").disabled'), true, '载入中反向键收起');
      await p.ev('document.dispatchEvent(new CustomEvent("ilife:sort-loading",{detail:{name:"sort",on:false}}));true');
      assert.equal(await txt(p, '[data-ilife-sort-shown]'), '4', '载入结束后回到真读数');

      /* 两档几何 */
      for (const w of [390, 1280]) {
        const m = await p.measure(w, { keys: KEYS, rows: ['.' + C + '-viewbar'] });
        assert.equal(m.box.sw <= m.box.cw, true, w + ' 档：容器横向溢出 ' + m.box.sw + ' > ' + m.box.cw);
        assert.equal(m.doc.sw <= m.doc.cw, true, w + ' 档：整页横向溢出');
        assert.deepEqual(m.offenders, [], w + ' 档：有后代越出容器右缘');
        for (const row of m.rows) {
          assert.equal(row.flexWrap, 'wrap', w + ' 档：视图条必须换行');
          assert.ok(row.overflowX !== 'auto' && row.overflowX !== 'scroll', w + ' 档：视图条藏了横滑');
        }
        for (const k of m.keys) {
          assert.ok(k.sw <= k.cw + 1, w + ' 档：关键语义位被截断「' + k.text + '」');
          assert.notEqual(k.textOverflow, 'ellipsis', w + ' 档：关键语义位用了省略号：' + k.sel);
        }
        for (const tg of m.targets) {
          assert.ok(tg.w >= SORT_TOUCH_MIN_PX && tg.h >= SORT_TOUCH_MIN_PX,
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

  it('错态：条目区没接上就写在控件旁边＋空态：视图里 0 条时给一句设计过的话', async (t) => {
    const html = buildF6Html({
      title: 'sort-toggle-unwired', skin: 'ilife-skin-broadsheet',
      css: skinCss() + sortToggleCss(),
      body: toggle({ target: 'nope' }),
      scripts: [buildSortToggleJs()],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-sort]").hasAttribute("data-ilife-sort-invalid")'), true, '没接上条目区 → 错态');
      assert.ok((await txt(p, '[data-ilife-sort-error]')).length > 0, '错句有字');
      assert.deepEqual(await p.errs(), []);
    } finally { await p.close(); }
  });

  it('空态：当前视图里 0 条 → 设计过的空态句顶上来', async (t) => {
    const html = buildF6Html({
      title: 'sort-toggle-empty', skin: 'ilife-skin-neutral',
      css: skinCss() + sortToggleCss(),
      body: toggle() + '<div data-ilife-sort-region="dishes">'
        + '<article class="f6-item" data-ilife-sort-item="" data-ilife-sort-tags="all" data-ilife-sort-name="甲">甲</article>'
        + '</div>',
      scripts: [buildSortToggleJs()],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      assert.equal(await txt(p, '[data-ilife-sort-shown]'), '0', '常做档 0 条');
      assert.equal((await p.rectOf('#box [data-ilife-sort-empty]')).hidden, false, '空态行顶上来');
      assert.deepEqual(await p.errs(), []);
    } finally { await p.close(); }
  });

  it('三套皮肤下标记逐字节相同', () => {
    const cut = (skin) => {
      const h = buildF6Html({ title: 's', skin, css: sortToggleCss(), body: toggle() + itemsHtml() });
      return h.slice(h.indexOf('<div id="box">'), h.indexOf('<script>'));
    };
    assert.equal(cut('ilife-skin-paper'), cut('ilife-skin-broadsheet'));
    assert.equal(cut('ilife-skin-paper'), cut('ilife-skin-neutral'));
  });
});
