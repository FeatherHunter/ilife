/** resultRow（结果行 · 形态 A）· 契约判据。
 *
 * 四类（工艺书第六节）：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 真机两档几何 ＋
 * 命中词是 `<mark>`（不靠色块）＋ 与 `search-field` 共用同一套 `data-*`（接线一次到位）。
 *
 * 这一件**没有运行时段**（显示件）：判据里明确断「它不产脚本、不派发事件」。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  markTerms, renderResultRow, resultRowCss,
  RESULT_DEFAULTS, RESULT_FORMS, RESULT_MAX_WIDTH_PX, RESULT_ROW_MIN_PX, RESULT_TOUCH_MIN_PX,
} from '../dist/components/result-row/index.js';
import { SEARCH_HIT_ATTR, SEARCH_ITEM_ATTR, SEARCH_TAGS_ATTR } from '../dist/components/search-field/index.js';
import { PAGE_UI_CLASS } from '../dist/components/page-ui/index.js';
import { skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { buildF6Html, startF6Page } from './_f6-chrome-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const C = 'ilife-block-result-row';
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const ITEMS = [
  {
    title: '辣椒炒肉', highlights: ['辣椒'], subtitle: '25 分钟 · 中辣 · 做过 6 次',
    tags: ['湘菜', '快手'], value: '4.8', valueLabel: '评分', thumb: '菜',
  },
  { title: '擂辣椒皮蛋', highlights: ['辣椒'], subtitle: '12 分钟', tags: ['湘菜'], value: '4.5', valueLabel: '评分', thumb: '汤' },
  { title: '虎皮青椒', subtitle: '18 分钟 · 没做过', tags: ['家常'], valueLabel: '未评分', thumb: '蔬' },
];

function rows(opts) {
  return renderResultRow(Object.assign({ name: 'dishes', label: '菜谱结果', items: ITEMS },
    opts === undefined ? {} : opts));
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('resultRow ① 渲染契约', () => {
  it('形态 A：单行，值在右——缩略格 ＋（标题／副语）＋ 读数', () => {
    const html = rows();
    assert.ok(html.startsWith('<div class="' + C), '类名根打头：' + html.slice(0, 90));
    assert.ok(html.includes('data-ilife-result-form="' + RESULT_FORMS[0] + '"'), '形态键上属性');
    assert.equal((html.match(/<article /g) || []).length, ITEMS.length, '三条三条');
    assert.ok(html.includes(C + '-thumb'), '缩略格在（有一条给了 thumb）');
    assert.ok(html.includes(C + '-v-num') && html.includes('>4.8<'), '读数在右列');
    assert.ok(html.includes('>评分<'), '读数下面的小字在');
    assert.ok(html.indexOf(C + '-title') < html.indexOf(C + '-v'), '标题在读数之前（值在右）');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
    assert.ok(html.includes('aria-label="菜谱结果"'), '整批的 aria-label 在');
  });

  it('命中词用 <mark>（不许靠色块），且只标在给出的词上', () => {
    const html = rows();
    const marks = [...html.matchAll(new RegExp('<mark ' + SEARCH_HIT_ATTR + '="">([^<]*)</mark>', 'g'))].map((m) => m[1]);
    assert.deepEqual(marks, ['辣椒', '辣椒'], '两处命中词各一枚 <mark>');
    assert.ok(!html.includes('虎皮<mark'), '没给的词不标');
    assert.ok(!/style="[^"]*background/.test(html), '不许内联色块');
    const css = stripCss(resultRowCss());
    const hitRule = css.split('\n').find((l) => l.includes('[data-ilife-search-hit]{'));
    assert.ok(hitRule !== undefined && hitRule.includes('background:transparent'), '清掉浏览器默认的黄块：' + hitRule);
    assert.ok(hitRule.includes('font-weight:700'), '高亮不只靠色（加粗）');
    assert.ok(css.includes('box-shadow:inset 0 -2px'), '高亮不只靠色（下划线）');
  });

  it('大小写不敏感；同一处只标一次；一个词标多处', () => {
    assert.equal(markTerms('AAA aaa AAA', ['aaa']),
      '<mark ' + SEARCH_HIT_ATTR + '="">AAA</mark> <mark ' + SEARCH_HIT_ATTR + '="">aaa</mark> <mark '
      + SEARCH_HIT_ATTR + '="">AAA</mark>');
    assert.equal(markTerms('abc', ['x']), 'abc', '没命中就不标');
    assert.equal(markTerms('', ['a']), '', '空串原样');
  });

  it('缺值：不给 value 就写「—」并弱化（不许拿 0 冒充）', () => {
    const html = rows();
    assert.ok(html.includes(C + '-v-none'), '缺值那条带弱化类');
    assert.ok(html.includes('>' + RESULT_DEFAULTS.unset + '<'), '值位写「—」');
    assert.ok(html.includes('>未评分<'), 'valueLabel 照常上屏');
  });

  it('转义面：标题／副语／标签／读数／命中词／机器键逐位转义（标记不可能从词里漏出来）', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderResultRow({
      name: evil, label: evil, emptyText: evil, extraClass: 'ok other',
      items: [{ title: evil, highlights: [evil], subtitle: evil, tags: [evil], value: evil, valueLabel: evil, thumb: evil }],
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本：' + html.slice(0, 200));
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('ok other'), '合法附加类名照收');
    assert.equal((html.match(new RegExp('<mark ' + SEARCH_HIT_ATTR, 'g')) || []).length, 2, '命中词标在标题与副语两处');
  });

  it('空态：items 为空给一句设计过的话', () => {
    const html = renderResultRow({ name: 'x', items: [], emptyText: '没找到菜' });
    assert.ok(html.includes('没找到菜'), '空态句上屏');
    assert.ok(html.includes('data-ilife-result-empty'), '空态行带锚');
    assert.ok(!html.includes('<article'), '没有条目就不出 article');
  });

  it('与 search-field 共用同一套标记（接线一次到位）', () => {
    const html = rows();
    assert.ok(html.includes('data-ilife-search-region="dishes"'), '给了 name 就同时当结果区键');
    assert.ok(html.includes('data-ilife-result="dishes"'), '机器键也在');
    assert.equal((html.match(new RegExp(SEARCH_ITEM_ATTR, 'g')) || []).length, ITEMS.length, '每条都挂搜索锚');
    assert.ok(html.includes(SEARCH_TAGS_ATTR + '="湘菜 快手"'), '标签进搜索的范围面');
  });

  it('入参违规一律拒（每个分支都断 BlocksError）', () => {
    const bad = (input, why) => assert.throws(() => renderResultRow(input), (e) => {
      assert.equal(e.name, 'BlocksError', why);
      return true;
    }, why);
    bad(null, 'null');
    bad({}, '缺 items');
    bad({ items: 'x' }, 'items 不是数组');
    bad({ items: [null] }, '条目不是对象');
    bad({ items: [{}] }, '缺 title');
    bad({ items: [{ title: '' }] }, '空 title');
    bad({ items: [{ title: 'x', highlights: 'y' }] }, 'highlights 不是数组');
    bad({ items: [{ title: 'x', highlights: [''] }] }, 'highlights 里空串');
    bad({ items: [{ title: 'x', tags: [7] }] }, 'tags 不是字符串');
    bad({ items: [{ title: 'x', value: 7 }] }, 'value 不是字符串');
    bad({ items: [{ title: 'x', thumb: 7 }] }, 'thumb 不是字符串');
    bad({ items: [{ title: 'x', extraClass: 'a b!' }] }, '非法附加类名');
    bad({ items: [], form: 'B' }, '形态闭集外');
    bad({ items: [], name: 7 }, 'name 不是字符串');
    bad({ items: [], emptyText: 7 }, 'emptyText 不是字符串');
    bad({ items: [], extraClass: 'a>b' }, '顶层非法附加类名');
    assert.equal(RESULT_FORMS[0], 'A');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('resultRow ② 样式与零 DOM 纪律', () => {
  const css = stripCss(resultRowCss());

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
    assert.ok(sels.length >= 10, '选择器太少：' + sels.length);
    for (const s of sels) assert.ok(s.startsWith('.' + PAGE_UI_CLASS), '不在作用域内：' + s);
    assert.ok(!css.includes(':root') && !css.includes('!important'));
    assert.ok(!/@media\s*\(max-width/.test(css), '宽度不许用视口判');
    assert.ok(css.includes('overflow-wrap:anywhere'), '长标题折行不省略');
    assert.ok(!css.includes('text-overflow:ellipsis'), '不许硬截断');
    assert.ok(css.includes('min-height:' + RESULT_ROW_MIN_PX + 'px'), '行高常量上屏');
    assert.ok(RESULT_ROW_MIN_PX >= RESULT_TOUCH_MIN_PX, '行高 ≥44（整行可点时够用）');
    assert.ok(css.includes('max-width:' + RESULT_MAX_WIDTH_PX + 'px'), '宽档上限取常量');
  });

  it('只经 skinVar 读皮肤；不重定义冻结 token；源码零手写 var(--ilife-…)', () => {
    const src = readdirSync(join(PKG, 'src', 'components', 'result-row'))
      .filter((f) => f.endsWith('.ts')).sort()
      .map((f) => readFileSync(join(PKG, 'src', 'components', 'result-row', f), 'utf8')).join('\n');
    const srcNoComment = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.equal(/var\(\s*--ilife-/.test(srcNoComment), false, '手写了 var(--ilife-…)');
    assert.ok(css.includes('var(--ilife-ink,'), '样式里应出现兜底链');
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('显示件：没有 runtime.ts，dist 里也不产运行时段（不派发事件、不读 DOM）', () => {
    assert.equal(existsSync(join(PKG, 'src', 'components', 'result-row', 'runtime.ts')), false,
      '显示件不该有 runtime.ts（交互归 search-field）');
    const dir = join(PKG, 'dist', 'components', 'result-row');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 4, '编译产物应在：' + files.length);
    for (const f of files) {
      const code = readFileSync(f, 'utf8')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/`(?:[^`\\]|\\.)*`/g, '``').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const needle of ['document.', 'window.', 'navigator.', 'CustomEvent', 'querySelector']) {
        assert.ok(!code.includes(needle), f.replace(PKG, '') + ' 的代码里出现 ' + needle);
      }
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('resultRow ③ 加法式（不挂这件＝零命中）', () => {
  it('renderDocShell 默认产物里没有本件的类名，两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.ok(!base.includes(C), '不得出现本件类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('样式只读自己的类名；唯一例外的 `[data-ilife-search-hit]` 是搜索框的共用记号', () => {
    const css0 = stripCss(resultRowCss());
    for (const t of new Set([...css0.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]))) {
      assert.ok(t === PAGE_UI_CLASS || t.startsWith(C), '不属于本件的类名：' + t);
    }
    for (const a of new Set([...css0.matchAll(/\[(data-[a-z-]+)/g)].map((m) => m[1]))) {
      assert.equal(a, SEARCH_HIT_ATTR, '本件只共用搜索框的命中词记号，别的属性一概不碰：' + a);
    }
  });

  it('渲染是纯函数：同一份入参两次逐字节相同', () => {
    assert.equal(rows(), rows());
  });
});

/* ── ④ 真机 ───────────────────────────────────────────────────────── */

describe('resultRow ④ 真机（headless Chrome）', () => {
  it('两档几何（390／1280）零横向溢出 ＋ 值位不截断 ＋ 行高 ≥44 ＋ 命中词是 <mark>', async (t) => {
    const html = buildF6Html({
      title: 'result-row', skin: 'ilife-skin-paper',
      css: skinCss() + resultRowCss(),
      body: rows() + renderResultRow({
        name: 'long', items: [{
          title: '一条特别长的菜名'.repeat(6), subtitle: '很长的副语'.repeat(8), value: '12345.6789',
          valueLabel: '评分', thumb: '长',
        }],
      }),
      scripts: [],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何判据需真浏览器');
    try {
      assert.equal(await p.ev('document.querySelectorAll("#box [data-ilife-search-hit]").length'), 2, '命中词两枚 <mark>');
      assert.equal(await p.ev('(function(){var m=document.querySelector("#box [data-ilife-search-hit]");'
        + 'return getComputedStyle(m).backgroundColor}())'), 'rgba(0, 0, 0, 0)', '不靠色块（背景透明）');
      assert.ok((await p.ev('(function(){var m=document.querySelector("#box [data-ilife-search-hit]");'
        + 'return parseInt(getComputedStyle(m).fontWeight,10)}())')) >= 700, '高亮有字重这一路');

      const KEYS = ['.' + C + '-v-num', '.' + C + '-v-lab', '.' + C + '-title'];
      for (const w of [390, 1280]) {
        const m = await p.measure(w, { keys: KEYS });
        assert.equal(m.box.sw <= m.box.cw, true, w + ' 档：容器横向溢出 ' + m.box.sw + ' > ' + m.box.cw);
        assert.equal(m.doc.sw <= m.doc.cw, true, w + ' 档：整页横向溢出');
        assert.deepEqual(m.offenders, [], w + ' 档：有后代越出容器右缘');
        for (const k of m.keys) {
          assert.ok(k.sw <= k.cw + 1, w + ' 档：关键语义位被截断「' + k.text + '」');
          assert.notEqual(k.textOverflow, 'ellipsis', w + ' 档：关键语义位用了省略号：' + k.sel);
        }
      }
      /* 行高 ≥44（整行可点时的触控下限） */
      for (const w of [390, 1280]) {
        await p.setWidth(w);
        const hs = await p.ev('[].map.call(document.querySelectorAll("#box .' + C + '-item"),'
          + 'function(e){return Math.round(e.getBoundingClientRect().height)})');
        assert.ok(hs.length >= 4, '应量到多行：' + hs.length);
        for (const h of hs) assert.ok(h >= RESULT_TOUCH_MIN_PX, w + ' 档：行高只有 ' + h + '（≥44 才够点）');
      }
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { await p.close(); }
  });

  it('与搜索框同页：搜索框能圈定本件的结果区并数出真命中数', async (t) => {
    const { buildSearchFieldJs, renderSearchField, searchFieldCss } =
      await import('../dist/components/search-field/index.js');
    const html = buildF6Html({
      title: 'result-row + search-field', skin: 'ilife-skin-neutral',
      css: skinCss() + resultRowCss() + searchFieldCss(),
      body: renderSearchField({ name: 'dish', label: '搜菜', target: 'dishes' }) + rows(),
      scripts: [buildSearchFieldJs()],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      await p.type('#box [data-ilife-search-input]', '辣椒');
      assert.equal(await p.ev('(function(){var e=document.querySelector("#box [data-ilife-search-count]");'
        + 'return e?e.textContent:null}())'), '2', '搜索框数出 2 处命中（本件产的两条结果）');
      assert.equal(await p.ev('document.querySelectorAll("#box .' + C + '-item:not([hidden])").length'), 2, '命中的两条留着');
      assert.deepEqual(await p.errs(), []);
    } finally { await p.close(); }
  });

  it('三套皮肤下标记逐字节相同', () => {
    const cut = (skin) => {
      const h = buildF6Html({ title: 's', skin, css: resultRowCss(), body: rows() });
      return h.slice(h.indexOf('<div id="box">'), h.indexOf('<script>'));
    };
    assert.equal(cut('ilife-skin-paper'), cut('ilife-skin-broadsheet'));
    assert.equal(cut('ilife-skin-paper'), cut('ilife-skin-neutral'));
  });
});
