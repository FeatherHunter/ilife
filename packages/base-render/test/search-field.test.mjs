/** searchField（搜索框 · 形态 B）· 契约判据。
 *
 * 覆盖四类（工艺书第六节）：
 *  ① **渲染契约**：结构／形态键／转义面／**全部**非法入参分支；
 *  ② **样式与零 DOM 纪律**：样式段非空、scope 在 `.ilife-page-ui` 之下、零 `:root`／`!important`、
 *     不重定义 11 个冻结 token、不手写 `var(--ilife-…)`；`dist/components/search-field/**` 的**代码**零
 *     `document.`／`window.`／`navigator.`（DOM 只住在产出文本里）；
 *  ③ **加法式**：不挂这件＝零命中（`renderDocShell` 默认产物里一个字都没有），且只读自己的类名与 `data-*`；
 *  ④ **真机（headless Chrome ＋ CDP）**：390／1280 两档零横向溢出 ＋ 触控目标 ≥44×44 ＋
 *     **命中计数是真数**（能数、能清空、能跳下一处）。
 *
 * 期望值一律从组件自己的常量与夹具数据派生，不抄字面量：改了名字／改了数法这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSearchFieldJs, renderSearchField, searchFieldCss, searchErrorId,
  SEARCH_DEFAULTS, SEARCH_FORM_ATTR, SEARCH_FORMS, SEARCH_HIT_ATTR, SEARCH_INPUT_ATTR,
  SEARCH_ITEM_ATTR, SEARCH_LOADING_ATTR, SEARCH_NAME_ATTR, SEARCH_NEXT_ATTR, SEARCH_PREV_ATTR,
  SEARCH_ROOT_CLASS, SEARCH_TAGS_ATTR, SEARCH_TARGET_ATTR, SEARCH_TOUCH_MIN_PX,
} from '../dist/components/search-field/index.js';
import { PAGE_UI_CLASS } from '../dist/components/page-ui/index.js';
import { skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { buildF6Html, startF6Page } from './_f6-chrome-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const C = SEARCH_ROOT_CLASS;
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── 夹具：一批可搜的条目（命中数是算出来的，不是抄的） ─────────────── */
/** 每条：`[字面标题, 范围标签]`；`辣椒` 在四条里共出现 5 次（第 4 条 2 次）。 */
const DISHES = [
  ['辣椒炒肉', 'name'],
  ['擂辣椒皮蛋', 'note'],
  ['虎皮辣椒', 'name'],
  ['辣椒炒辣椒', 'name'],
  ['清炒时蔬', 'name'],
];
const TERM = '辣椒';
const HITS_ALL = 5;
const HITS_NAME = 4;
const HITS_NOTE = 1;

function regionHtml() {
  return '<div data-ilife-search-region="dishes">'
    + DISHES.map(([title, tag], i) => '<article class="f6-item" ' + SEARCH_ITEM_ATTR + '="" '
      + SEARCH_TAGS_ATTR + '="' + tag + '">' + title + ' · 第 ' + String(i + 1) + ' 条</article>').join('')
    + '</div>';
}
const itemTexts = () => DISHES.map(([title], i) => title + ' · 第 ' + String(i + 1) + ' 条');

function field(opts) {
  return renderSearchField(Object.assign({
    name: 'dish', label: '搜菜名、食材', placeholder: '搜菜名、食材…', target: 'dishes',
    scopes: [{ value: 'name', label: '菜名' }, { value: 'note', label: '备注' }],
  }, opts === undefined ? {} : opts));
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('searchField ① 渲染契约', () => {
  it('基本形态：类名根 ＋ 机器键 ＋ 形态键 ＋ 三档范围 ＋ 输入行 ＋ 读数行', () => {
    const html = field();
    assert.ok(html.startsWith('<div class="' + C), '根用类名根打头：' + html.slice(0, 90));
    assert.ok(html.includes(SEARCH_NAME_ATTR + '="dish"'), '机器键上属性');
    assert.ok(html.includes(SEARCH_FORM_ATTR + '="' + SEARCH_FORMS[0] + '"'), '形态键上属性');
    assert.ok(html.includes(SEARCH_TARGET_ATTR + '="dishes"'), '结果区键上属性');
    assert.ok(html.includes('<input ' + 'type="search"'), '输入框是真 input');
    assert.ok(html.includes(SEARCH_INPUT_ATTR), '输入框带运行时锚');
    assert.ok(html.includes('aria-label="搜菜名、食材"'), 'aria-label 取字段名');
    assert.ok(html.includes('aria-describedby="' + searchErrorId('dish') + '"'), '错态行有 id 可被描述');
    assert.equal((html.match(/<button /g) || []).length, 6, '范围三档 ＋ 清空 ＋ 前后跳 ＝ 6 颗键');
    assert.equal((html.match(/aria-pressed="false"/g) || []).length, 2, '两档未选中');
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1, '恰一档选中（单选）');
    assert.ok(html.includes('data-ilife-search-empty'), '空态行在标记里');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('命中数是运行时的真读数：渲染期一律写「—」，不给假初值', () => {
    const html = field({ query: TERM });
    const m = /data-ilife-search-count="">([^<]*)</.exec(html);
    assert.ok(m !== null, '计数位在');
    assert.equal(m[1], SEARCH_DEFAULTS.unset, '渲染期计数位是「—」，不是 0／不是任何数');
    assert.ok(html.includes(SEARCH_DEFAULTS.unset + '</b>'), '位置位同样是「—」');
    assert.ok(html.includes('value="' + TERM + '"'), '初始查询串照收');
  });

  it('范围分段的档计数是渲染期初值（给了就上屏，不给写「—」）', () => {
    const html = field({ scopes: [{ value: 'name', label: '菜名', count: 4 }, { value: 'note', label: '备注' }] });
    assert.ok(html.includes('data-ilife-search-n="">4</span>'), '给了 count 就上屏');
    assert.ok(html.includes('data-ilife-search-n="">' + SEARCH_DEFAULTS.unset + '</span>'), '没给写「—」');
  });

  it('载入态与禁用态：在原地换字，且三颗键一起禁用', () => {
    const loading = field({ loading: true });
    assert.ok(loading.includes(SEARCH_LOADING_ATTR + '="1"'), '载入态上根属性');
    assert.ok(loading.includes('正在找…'), '载入字在标记里（CSS 原地换字）');
    assert.ok(loading.includes(C + '-status-text'), '真读数位仍在（换字不重造）');
    assert.ok(loading.includes('data-ilife-search-count'), '计数位仍在（换字不重造）');
    const dis = field({ disabled: true });
    assert.equal((dis.match(/ disabled/g) || []).length, 7, '输入框 ＋ 范围三档 ＋ 清空 ＋ 前后跳，七处一起禁用');
    assert.ok(dis.includes('aria-disabled="true"'), '输入框落 aria-disabled');
  });

  it('错态：给了 error 就在控件旁边写一句 ＋ aria-invalid ＋ 不隐藏', () => {
    const html = field({ error: '这个词太长' });
    const errRow = new RegExp('data-ilife-search-error=""[^>]*>([^<]*)<').exec(html);
    assert.ok(errRow !== null && errRow[1] === '这个词太长', '错句写在错态行里');
    assert.ok(html.includes('aria-invalid="true"'), '输入框落 aria-invalid');
    assert.ok(!/data-ilife-search-error=""[^>]*hidden/.test(html), '有错时不许 hidden');
    assert.ok(/data-ilife-search-error=""[^>]*hidden/.test(field()), '没给 error 时错态行收起');
  });

  it('转义面：机器键／字段名／占位／查询串／范围名／空态句逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderSearchField({
      name: evil, label: evil, placeholder: evil, query: evil, target: evil, noun: evil,
      emptyText: evil, loadingText: evil, error: evil,
      scopes: [{ value: evil, label: evil, count: evil }, { value: 'b', label: 'b' }],
      extraClass: 'ok-class other',
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签：' + html.slice(0, 160));
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.ok(html.includes('ok-class other'), '合法附加类名照收');
  });

  it('入参违规一律拒（每个分支都断 BlocksError，不静默降级）', () => {
    const bad = (input, why) => assert.throws(() => renderSearchField(input), (e) => {
      assert.equal(e.name, 'BlocksError', why + '：抛的不是 BlocksError');
      return true;
    }, why);
    bad(null, 'null');
    bad('x', '不是对象');
    bad({}, '缺 name');
    bad({ name: '' }, '空 name');
    bad({ name: 'a', query: 1 }, 'query 不是字符串');
    bad({ name: 'a', scopes: 'x' }, 'scopes 不是数组');
    bad({ name: 'a', scopes: ['only'] }, 'scopes 只有一档');
    bad({ name: 'a', scopes: ['', 'b'] }, 'scopes 里空串');
    bad({ name: 'a', scopes: [{ label: 'x' }, 'b'] }, 'scopes 缺 value');
    bad({ name: 'a', scopes: [{ value: 'x', label: 'x', count: true }, 'b'] }, 'count 不是数也不是串');
    bad({ name: 'a', scopes: [{ value: 'x', label: 'x' }, 'x'] }, 'scopes 机器值重复');
    bad({ name: 'a', scopes: [SEARCH_DEFAULTS.scopeAll, 'b'] }, 'scopes 里重复给内置档');
    bad({ name: 'a', scope: 'name' }, '没给 scopes 却给 scope');
    bad({ name: 'a', scopes: ['x', 'y'], scope: 'z' }, 'scope 不在 scopes 里');
    bad({ name: 'a', form: 'A' }, '形态闭集外');
    bad({ name: 'a', disabled: 'yes' }, 'disabled 不是布尔');
    bad({ name: 'a', loading: 1 }, 'loading 不是布尔');
    bad({ name: 'a', label: 7 }, 'label 不是字符串');
    bad({ name: 'a', extraClass: 'a"b' }, '非法附加类名');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('searchField ② 样式与零 DOM 纪律', () => {
  const css = stripCss(searchFieldCss());

  it('样式段非空，且每条选择器都 scope 在 .ilife-page-ui 之下（容器驱动的前提）', () => {
    assert.ok(css.length > 0, '样式段不许为空');
    const selectors = [];
    for (const block of css.split('}')) {
      const at = block.indexOf('{');
      if (at < 0) continue;
      const head = block.slice(0, at).split('}').pop().trim();
      if (head === '' || head.startsWith('@')) continue;
      for (const one of head.split(',')) selectors.push(one.trim());
    }
    assert.ok(selectors.length >= 20, '选择器太少（判据可能空转）：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.startsWith('.' + PAGE_UI_CLASS), '不在 page-ui 作用域内：' + sel);
    }
  });

  it('零 :root／零 !important／零 @media (max-width)（宽度只许听容器）', () => {
    assert.ok(!css.includes(':root'), '不得写 :root');
    assert.ok(!css.includes('!important'), '不得用 !important');
    assert.ok(!/@media\s*\(max-width/.test(css), '宽度不许用视口判（听容器）');
  });

  it('只经 skinVar 读皮肤：源码零手写 var(--ilife-…)，产出里有兜底链', () => {
    const src = ['attrs.ts', 'style.ts', 'render.ts', 'runtime.ts', 'model.ts', 'index.ts']
      .map((f) => readFileSync(join(PKG, 'src', 'components', 'search-field', f), 'utf8')).join('\n');
    const srcNoComment = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.equal(/var\(\s*--ilife-/.test(srcNoComment), false, '源码里手写了 var(--ilife-…)：该走 skinVar()');
    assert.ok(css.includes('var(--ilife-ink,'), '样式里应出现 skinVar 产出的兜底链');
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('dist/components/search-field/** 的代码零 document.／window.／navigator.（DOM 只在产出文本里）', () => {
    const dir = join(PKG, 'dist', 'components', 'search-field');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 5, '编译产物应在（先跑 tsc -b）：' + files.length);
    for (const f of files) {
      const code = readFileSync(f, 'utf8')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/`(?:[^`\\]|\\.)*`/g, '``').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.ok(!code.includes(needle), f.replace(PKG, '') + ' 的代码里出现 ' + needle);
      }
    }
  });

  it('运行时段：语法可跑、委派幂等、DOM 只住在字符串里', () => {
    const js = buildSearchFieldJs();
    assert.doesNotThrow(() => { void new Function(js); }, '运行时段必须是可解析的 JS');
    assert.ok(js.includes('document'), '运行时段在页里用 document（这正是它住字符串里的原因）');
    assert.ok(js.includes('data-ilife-search-runtime'), '重复注入靠挂载标记只绑一次');
    assert.equal(js.includes('innerHTML'), false, '不靠 innerHTML 拼内容（用 createElement／createTextNode）');
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('searchField ③ 加法式（不挂这件＝零命中）', () => {
  it('renderDocShell 默认产物里没有本件的类名与运行时段，两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.ok(!base.includes(C), '不得出现本件类名');
    assert.ok(!base.includes('ilife:search'), '不得出现本件运行时段');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }), '两次逐字节相同');
  });

  it('样式只读自己的类名与自己的 data-*（不碰公共选择器）', () => {
    const tokens = [...stripCss(searchFieldCss()).matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]);
    for (const t of new Set(tokens)) {
      assert.ok(t === PAGE_UI_CLASS || t.startsWith(C), '样式里出现不属于本件的类名：' + t);
    }
    const attrs = [...stripCss(searchFieldCss()).matchAll(/\[(data-[a-z-]+)/g)].map((m) => m[1]);
    for (const a of new Set(attrs)) {
      assert.ok(a.startsWith('data-ilife-search'), '样式里出现不属于本件的属性名：' + a);
    }
  });

  it('渲染是纯函数：同一份入参两次调用逐字节相同', () => {
    assert.equal(field(), field(), '两次渲染必须逐字节相同');
  });
});

/* ── ④ 真机：几何 ＋ 触控 ＋ 真运行时 ───────────────────────────────── */

const KEYS = ['.' + C + '-status b', '.' + C + '-pos', '.' + C + '-n'];
const ROWS = ['.' + C + '-scope', '.' + C + '-readout'];

const countText = (p) => p.ev('(function(){var e=document.querySelector("#box [data-ilife-search-count]");'
  + 'return e?e.textContent:null}())');
const atText = (p) => p.ev('(function(){var e=document.querySelector("#box [data-ilife-search-at]");'
  + 'return e?e.textContent:null}())');
const shownItems = (p) => p.ev('document.querySelectorAll("#box [data-ilife-search-item]:not([hidden])").length');
const marks = (p) => p.ev('document.querySelectorAll("#box [' + SEARCH_HIT_ATTR + ']").length');
const scopeNs = (p) => p.ev('[].map.call(document.querySelectorAll("#box [data-ilife-search-n]"),function(e){return e.textContent})');
const isDisabled = (p, sel) => p.ev('(function(){var e=document.querySelector("#box ' + sel + '");return !!e&&e.disabled}())');

describe('searchField ④ 真机（headless Chrome）', () => {
  it('两档几何（390／1280）零横向溢出 ＋ 触控目标 ≥44×44 ＋ 命中计数真数', async (t) => {
    const html = buildF6Html({
      title: 'search-field', skin: 'ilife-skin-paper',
      css: skinCss() + searchFieldCss(),
      body: field() + regionHtml(),
      scripts: [buildSearchFieldJs()],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium：两档几何与真运行时判据需真浏览器');
    try {
      /* 首次挂载：渲染期的「—」被换成真读数（词为空 ⇒ 计数回「—」，条目全在） */
      assert.equal(await countText(p), SEARCH_DEFAULTS.unset, '空查询时计数位是「—」');
      assert.equal(await shownItems(p), DISHES.length, '空查询时条目全在');
      assert.equal(await isDisabled(p, '[data-ilife-search-next]'), true, '没词时下一处收起');

      /* 真打字 → 真数 */
      await p.type('#box [data-ilife-search-input]', TERM);
      assert.equal(await countText(p), String(HITS_ALL), '命中数＝结果区里真实标出来的词数');
      assert.equal(await atText(p), '1', '位置回到第 1 处');
      assert.equal(await shownItems(p), 4, '没有命中的那条被过滤掉');
      assert.equal(await marks(p), HITS_ALL, '标出来的 <mark> 数＝命中数');
      assert.deepEqual(await scopeNs(p), [String(HITS_ALL), String(HITS_NAME), String(HITS_NOTE)], '三档计数各自数出来');

      /* 换范围 → 只算这一档 */
      await p.click('#box [data-ilife-search-scope="note"]');
      assert.equal(await countText(p), String(HITS_NOTE), '备注档只有 1 处');
      assert.equal(await shownItems(p), 1, '只留备注档那条');
      await p.click('#box [data-ilife-search-scope="' + SEARCH_DEFAULTS.scopeAll + '"]');
      assert.equal(await countText(p), String(HITS_ALL), '切回全部又是 5 处');

      /* 跳下一处：位置变了、当前处跟着变 */
      await p.click('#box [data-ilife-search-next]');
      assert.equal(await atText(p), '2', '下一处 → 第 2 处');
      assert.equal(await p.ev('document.querySelectorAll("#box [data-ilife-search-current]").length'), 1, '当前处恰一处');
      assert.equal(await p.ev('(function(){var a=document.querySelectorAll("#box [' + SEARCH_HIT_ATTR + ']");'
        + 'return a[1]&&a[1].hasAttribute("data-ilife-search-current")}())'), true, '当前处就是第 2 处');
      await p.click('#box [data-ilife-search-prev]');
      assert.equal(await atText(p), '1', '上一处回到第 1 处');
      await p.enter('#box [data-ilife-search-input]');
      assert.equal(await atText(p), '2', '回车跳下一处（键盘通路）');
      await p.enter('#box [data-ilife-search-input]', { composing: true });
      assert.equal(await atText(p), '2', 'IME 组字中的回车不跳');
      await p.click('#box [data-ilife-search-scope="' + SEARCH_DEFAULTS.scopeAll + '"]');

      /* 事件真的派发（页面靠它接自己的重算） */
      await p.listen('ilife:search');
      await p.listen('ilife:search-jump');
      await p.click('#box [data-ilife-search-next]');
      const jumps = await p.events('ilife:search-jump');
      assert.equal(jumps.length, 1, '跳转事件恰好一条');
      assert.equal(jumps[0].detail.total, HITS_ALL, '事件带真总数');

      /* 载入态：原地换字、键收起、不写假数 */
      await p.ev('document.dispatchEvent(new CustomEvent("ilife:search-loading",{detail:{name:"dish",on:true}}));true');
      assert.equal(await p.ev('document.querySelector("#box [' + SEARCH_NAME_ATTR + ']").getAttribute("' + SEARCH_LOADING_ATTR + '")'), '1', '载入态上根属性');
      assert.equal(await p.ev('getComputedStyle(document.querySelector("#box .' + C + '-status-text")).display'), 'none', '真读数位收起');
      assert.equal(await p.ev('getComputedStyle(document.querySelector("#box .' + C + '-status-loading")).display'), 'inline', '载入字原地顶上来');
      assert.equal(await isDisabled(p, '[data-ilife-search-next]'), true, '载入中跳转收起');
      await p.ev('document.dispatchEvent(new CustomEvent("ilife:search-loading",{detail:{name:"dish",on:false}}));true');
      assert.equal(await countText(p), String(HITS_ALL), '载入结束后回到真读数');

      /* 清空：逐字还原 */
      await p.click('#box [data-ilife-search-clear]');
      assert.equal(await countText(p), SEARCH_DEFAULTS.unset, '清空后计数回「—」');
      assert.equal(await marks(p), 0, '标记全部拆掉');
      assert.equal(await shownItems(p), DISHES.length, '条目全回来');
      assert.deepEqual(await p.ev('[].map.call(document.querySelectorAll("#box .f6-item"),function(e){return e.textContent})'),
        itemTexts(), '清空后的文本与运行前逐字相同');

      /* 空态：命中 0 处 → 设计过的空态句，不是一片空白 */
      await p.type('#box [data-ilife-search-input]', '紫甘蓝');
      assert.equal(await countText(p), '0', '命中 0 处');
      assert.equal(await shownItems(p), 0, '条目全收起');
      assert.equal((await p.rectOf('#box [data-ilife-search-empty]')).hidden, false, '空态行顶上来');
      assert.equal(await isDisabled(p, '[data-ilife-search-next]'), true, '没命中时跳转收起');

      /* 两档几何：容器驱动（视口恒 1440，只改容器宽） */
      await p.click('#box [data-ilife-search-clear]');
      for (const w of [390, 1280]) {
        const m = await p.measure(w, { keys: KEYS, rows: ROWS });
        assert.equal(m.box.sw <= m.box.cw, true, w + ' 档：容器横向溢出 ' + m.box.sw + ' > ' + m.box.cw);
        assert.equal(m.doc.sw <= m.doc.cw, true, w + ' 档：整页横向溢出');
        assert.deepEqual(m.offenders, [], w + ' 档：有后代越出容器右缘');
        for (const row of m.rows) {
          assert.equal(row.flexWrap, 'wrap', w + ' 档：' + row.sel + ' 必须换行（不含横滑）');
          assert.ok(row.overflowX !== 'auto' && row.overflowX !== 'scroll', w + ' 档：' + row.sel + ' 藏了横滑');
        }
        for (const k of m.keys) {
          assert.ok(k.sw <= k.cw + 1, w + ' 档：关键语义位被截断「' + k.text + '」');
          assert.notEqual(k.textOverflow, 'ellipsis', w + ' 档：关键语义位用了省略号：' + k.sel);
        }
        for (const tg of m.targets) {
          assert.ok(tg.w >= SEARCH_TOUCH_MIN_PX && tg.h >= SEARCH_TOUCH_MIN_PX,
            w + ' 档：触控目标 ' + tg.cls + ' 只有 ' + tg.w + '×' + tg.h);
          assert.equal(tg.hit, true, w + ' 档：触控目标中心点命不中它自己：' + tg.cls);
        }
        const gaps = await p.ev('(function(){var box=document.getElementById("box");'
          + 'var ns=[].slice.call(box.querySelectorAll("button,input"));'
          + 'var rs=ns.map(function(e){return e.getBoundingClientRect()});var bad=[];'
          + 'for(var i=0;i<rs.length;i++)for(var j=i+1;j<rs.length;j++){'
          + 'var a=rs[i],b=rs[j];'
          + 'if(a.width===0||b.width===0)continue;'
          + 'if(a.bottom<=b.top+1||b.bottom<=a.top+1)continue;'
          + 'var gap=Math.max(b.left,a.left)-Math.min(b.right,a.right);'
          + 'if(gap>=0&&gap<8)bad.push(Math.round(gap));'
          + 'if(gap<0)bad.push(Math.round(gap));}'
          + 'return bad;}())');
        assert.deepEqual(gaps, [], w + ' 档：相邻触控目标间距 <8px');
      }
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { await p.close(); }
  });

  it('嵌套条目（卡片里再嵌一行结果）只算最外层：命中数不翻倍、不套嵌套 <mark>', async (t) => {
    /* 常见写法：卡片挂 `data-ilife-search-item`，卡里再放一段 `result-row`（它的每条也挂同一个锚）。
       两层都算会把同一条文本数两遍、还会标出 `<mark><mark>`（样张页上实测到过），故单独立一条回归。 */
    const nested = '<div data-ilife-search-region="n">'
      + '<article ' + SEARCH_ITEM_ATTR + '="" ' + SEARCH_TAGS_ATTR + '="name">'
      + '<p>辣椒炒肉</p><p ' + SEARCH_ITEM_ATTR + '="" ' + SEARCH_TAGS_ATTR + '="name">辣椒炒肉 · 内层</p>'
      + '</article>'
      + '<article ' + SEARCH_ITEM_ATTR + '="" ' + SEARCH_TAGS_ATTR + '="name"><p>清炒时蔬</p></article>'
      + '</div>';
    const html = buildF6Html({
      title: 'search-field-nested', skin: 'ilife-skin-paper',
      css: skinCss() + searchFieldCss(),
      body: field({ target: 'n' }) + nested,
      scripts: [buildSearchFieldJs()],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      await p.type('#box [data-ilife-search-input]', TERM);
      assert.equal(await p.ev('document.querySelectorAll("#box [data-ilife-search-item]").length'), 3,
        '夹具里三个元素都挂锚（两层）');
      assert.equal(await countText(p), '2', '最外层那一条的文本里两处「辣椒」各算一处（内层不再单独算——否则是 3）');
      assert.equal(await p.ev('document.querySelectorAll("#box [data-ilife-search-hit] mark").length'), 0, '不许套嵌套 <mark>');
      assert.equal(await p.ev('(function(){var a=document.querySelectorAll("#box [data-ilife-search-region=\\"n\\"] > [data-ilife-search-item]");'
        + 'var n=0;for(var i=0;i<a.length;i+=1) if(!a[i].hasAttribute("hidden")) n+=1;return n}())'), 1,
      '最外层只留命中那一条（清炒时蔬那条被过滤掉）');
      assert.deepEqual(await p.errs(), [], '不得留下未捕获错误');
    } finally { await p.close(); }
  });

  it('错态：结果区没接上就写在控件旁边（不只染色），且不带 aria-invalid 的假通过', async (t) => {
    const html = buildF6Html({
      title: 'search-field-unwired', skin: 'ilife-skin-neutral',
      css: skinCss() + searchFieldCss(),
      body: field({ target: undefined }),
      scripts: [buildSearchFieldJs()],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      assert.equal(await p.ev('document.querySelector("#box [' + SEARCH_NAME_ATTR + ']").hasAttribute("data-ilife-search-invalid")'), true, '没接上结果区 → 错态');
      const row = await p.rectOf('#box [data-ilife-search-error]');
      assert.equal(row.hidden, false, '错句顶上来');
      assert.ok((await p.ev('document.querySelector("#box [data-ilife-search-error]").textContent')).length > 0, '错句有字');
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-search-input]").getAttribute("aria-invalid")'), 'true', '输入框落 aria-invalid');
      assert.deepEqual(await p.errs(), [], '不得留下未捕获错误');
    } finally { await p.close(); }
  });

  it('三套皮肤下标记逐字节相同（皮肤只改取值，不改骨架）', async () => {
    const marksOf = (skin) => buildF6Html({ title: 's', skin, css: searchFieldCss(), body: field() + regionHtml() });
    const a = marksOf('ilife-skin-paper');
    const b = marksOf('ilife-skin-broadsheet');
    const c = marksOf('ilife-skin-neutral');
    const cut = (h) => h.slice(h.indexOf('<div id="box">'), h.indexOf('<script>'));
    assert.equal(cut(a), cut(b), 'paper 与 broadsheet 的标记必须逐字节相同');
    assert.equal(cut(a), cut(c), 'paper 与 neutral 的标记必须逐字节相同');
  });
});
