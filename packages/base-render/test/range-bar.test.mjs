// range-bar（区间条）· 判据件。
//
// 断言对象＝`dist/components/range-bar/index.js`（本件自己的那条出口；层出口那一行由别的席加）。
// 四组同 `calendar-month.test.mjs`：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 两档几何。
//
// 本件多断三条自己的口径：
//   · **长度＝多久**：区间的 `left`／`width` 是算出来的百分比（判据直接读它，不信"看起来像"）；
//   · **段内时长字只在段够宽时上屏**（阈值 `RANGE_BAR_TEXT_MIN_FRACTION`）；
//   · **轴刻度与轨道左右对齐**（真机量：第一枚刻度左缘＝轨道左缘、末枚右缘＝轨道右缘）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RANGE_BAR_CLASS,
  RANGE_BAR_FORMS,
  RANGE_BAR_KEY_COLUMN_NARROW_PX,
  RANGE_BAR_KEY_COLUMN_PX,
  RANGE_BAR_NARROW_PX,
  RANGE_BAR_TICK_GAP_PX,
  RANGE_BAR_TONES,
  RANGE_BAR_TOTAL_COLUMN_NARROW_PX,
  RANGE_BAR_TOTAL_COLUMN_PX,
  RANGE_BAR_TEXT_HIDE_BELOW_PX,
  RANGE_BAR_TEXT_MIN_FRACTION,
  rangeBarCss,
  rangeBarSlot,
  renderRangeBar,
} from '../dist/components/range-bar/index.js';
import { skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { CSS_VAR_TOKENS } from '../dist/index.js';
import { openMeasurePage } from './time-group-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT = '.' + 'ilife-page-ui';
const S = (slot) => rangeBarSlot(slot);

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const throwsBlocks = (fn) => {
  try { fn(); } catch (e) { return e.name === 'BlocksError'; }
  return false;
};
function selectorsOf(css) {
  const out = [];
  for (const m of stripComments(css).matchAll(/([^{}]+)\{/g)) {
    const sel = m[1].trim();
    if (sel === '' || sel.startsWith('@')) continue;
    out.push(sel);
  }
  return out;
}
const classTokens = (sel) => [...sel.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((m) => m[1]);
const isOwnClass = (token, root) => token === 'ilife-page-ui' || token.startsWith(root) || /^is-[a-z0-9-]+$/.test(token);

/* ── 夹具：一天里的四类区间（作息管家的口径；跨午夜由调用方拆段） ─────────── */
const LANES = [
  { label: '睡眠', mark: '●', total: '7h20m', intervals: [{ from: 0, to: 400, text: '6h40m', tone: 3 }, { from: 1400, to: 1440, tone: 3 }] },
  { label: '工作', mark: '◆', total: '7h30m', intervals: [{ from: 570, to: 720, tone: 2 }, { from: 810, to: 1110, tone: 2 }] },
  { label: '运动', mark: '▲', total: '1h10m', intervals: [{ from: 1140, to: 1210, tone: 4 }] },
  { label: '空闲', mark: '○', total: '8h00m', intervals: [{ from: 400, to: 570, tone: 1 }, { from: 720, to: 810, tone: 1 }, { from: 1110, to: 1140, tone: 1 }, { from: 1210, to: 1400, tone: 1 }] },
];

function demoInput() {
  return {
    title: '5 月 14 日 周四',
    use: '作息管家 · 一天里的区间',
    domain: { min: 0, max: 1440 },
    axis: ['0', '6', '12', '18', '24'],
    summary: { label: '非空闲', value: '16h00m' },
    lanes: LANES,
    note: '跨午夜的两段由调用方拆',
  };
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('range-bar ① 渲染契约', () => {
  it('根：类名根 ＋ `is-<形态>`；刻度／泳道／轨道逐条到位', () => {
    const html = renderRangeBar(demoInput());
    assert.match(html, /^<div class="ilife-block-range-bar is-lanes">/);
    assert.equal((html.match(new RegExp('class="' + S('lane') + '"', 'g')) || []).length, 4, '四条泳道');
    assert.equal((html.match(new RegExp('class="' + S('key') + '"', 'g')) || []).length, 4);
    assert.equal((html.match(new RegExp('class="' + S('rail') + '"', 'g')) || []).length, 4);
    assert.equal((html.match(new RegExp('class="' + S('total') + '"', 'g')) || []).length, 4);
    assert.equal((html.match(new RegExp(S('ax-ticks') + '">', 'g')) || []).length, 1, '刻度行一套');
    assert.equal((html.match(/<i>6<\/i>/g) || []).length, 1, '刻度逐枚出');
  });

  it('**长度＝多久**：区间的位置与长度是算出来的轴百分比', () => {
    const html = renderRangeBar(demoInput());
    assert.match(html, /style="left:0%;width:27\.7778%"/, '0–400 分钟＝27.7778%');
    assert.match(html, /style="left:39\.5833%;width:10\.4167%"/, '570–720 分钟');
    assert.match(html, /style="left:97\.2222%;width:2\.7778%"/, '1400–1440 分钟');
    assert.equal((html.match(new RegExp('class="' + S('iv') + ' is-l', 'g')) || []).length, 9, '九段');
  });

  it('**段内时长字只在段够宽时上屏**（阈值 ' + String(RANGE_BAR_TEXT_MIN_FRACTION) + '）：窄段一个字都不写', () => {
    assert.equal(RANGE_BAR_TEXT_MIN_FRACTION, 0.22);
    const html = renderRangeBar(demoInput());
    // 夹具里只有 27.7778%（睡眠第一段）过线：20.8333%（工作第二段）差一点 ⇒ 不上屏
    assert.equal((html.match(new RegExp(S('iv-text') + '"', 'g')) || []).length, 1);
    assert.match(html, new RegExp(S('iv-text') + '">6h40m<'));
    assert.equal(html.includes('>5h00m<'), false, '窄段的长时字不许上屏（时长另有行尾合计）');
    // 刚好过线也算过线（阈值是 `>=`）
    const exact = renderRangeBar({
      title: 'T', domain: { min: 0, max: 100 }, lanes: [{ label: 'L', intervals: [{ from: 0, to: 22, text: '22m' }] }],
    });
    assert.match(exact, new RegExp(S('iv-text')));
    // 差一点点就不过线
    const just = renderRangeBar({
      title: 'T', domain: { min: 0, max: 100 }, lanes: [{ label: 'L', intervals: [{ from: 0, to: 21, text: '21m' }] }],
    });
    assert.equal(just.includes(S('iv-text')), false);
  });

  it('刻度对齐的三条静态口径：同一张网格 ＋ 刻度落第二轨 ＋ 8px 列距', () => {
    const css = stripComments(rangeBarCss());
    assert.match(css, new RegExp(S('ax') + ',\\s*\\n' + '\\.ilife-page-ui \\.' + S('lane') + ' \\{\\s*display: contents'));
    assert.match(css, new RegExp(S('ax-ticks') + ' \\{[^}]*grid-column: 2'));
    assert.ok(css.includes('gap: 4px ' + String(RANGE_BAR_TICK_GAP_PX) + 'px'), '刻度列距取常量');
  });

  it('缺槽就不出那一槽（无刻度／无合计／无脚注时一个字不出）', () => {
    const html = renderRangeBar({ title: 'T', domain: { min: 0, max: 10 }, lanes: [{ label: 'L', intervals: [{ from: 1, to: 2 }] }] });
    assert.equal(html.includes(S('ax')), false);
    assert.equal(html.includes(S('total')), false);
    assert.equal(html.includes(S('note')), false);
    assert.equal(html.includes(S('summary')), false);
  });

  it('0 条泳道＝空串（没内容不留空块）', () => {
    assert.equal(renderRangeBar({ title: 'T', domain: { min: 0, max: 10 }, lanes: [] }), '');
    assert.equal(renderRangeBar({ title: 'T', domain: { min: 0, max: 10 }, lanes: [], note: 'x' }), '');
  });

  it('转义：五个字符进实体，不进标记', () => {
    const html = renderRangeBar({
      title: '"><script>alert(1)</script>', use: 'a<b&c', note: '"\'',
      domain: { min: 0, max: 10 }, axis: ['<i>', '&'],
      summary: { label: '<b>', value: '&' },
      lanes: [{ label: '<u>', mark: '<s>', total: '"><x>', intervals: [{ from: 1, to: 6, text: '<em>' }] }],
    });
    assert.equal(/<script/i.test(html), false);
    assert.equal(/[<][a-z]+[>]/.test(html.replace(/<i>[^<]*<\/i>/g, '').replace(/<(b|div|span|p|u|em)[^>]*>/g, '')), false,
      '注入的标签必须变成实体，不许留下真标签');
    for (const entity of ['&lt;b&gt;', '&lt;i&gt;', '&lt;u&gt;', '&lt;s&gt;', '&lt;em&gt;']) {
      assert.ok(html.includes(entity), '缺实体：' + entity);
    }
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&amp;/);
    assert.match(html, /&quot;/);
  });

  it('边界：闭集与**全部**非法入参分支逐个 `BlocksError`', () => {
    assert.deepEqual([...RANGE_BAR_FORMS], ['lanes']);
    assert.deepEqual([...RANGE_BAR_TONES], [1, 2, 3, 4]);
    const base = () => ({ title: 'T', domain: { min: 0, max: 100 }, lanes: [{ label: 'L', intervals: [{ from: 1, to: 2 }] }] });

    assert.equal(throwsBlocks(() => renderRangeBar(undefined)), true);
    assert.equal(throwsBlocks(() => renderRangeBar(null)), true);
    assert.equal(throwsBlocks(() => renderRangeBar('x')), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ ...base(), form: 'band' })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ ...base(), title: '' })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ ...base(), title: 3 })), true);
    // domain
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', lanes: [] })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: 'x', lanes: [] })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: { min: 0 }, lanes: [] })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: { min: 0, max: 0 }, lanes: [] })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: { min: 5, max: 1 }, lanes: [] })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: { min: Number.NaN, max: 1 }, lanes: [] })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: { min: 0, max: Number.POSITIVE_INFINITY }, lanes: [] })), true);
    // lanes
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: { min: 0, max: 1 } })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: { min: 0, max: 1 }, lanes: 'x' })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: { min: 0, max: 1 }, lanes: [{ intervals: [] }] })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: { min: 0, max: 1 }, lanes: [{ label: '' , intervals: [] }] })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: { min: 0, max: 1 }, lanes: [{ label: 'L' }] })), true, 'intervals 必填');
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: { min: 0, max: 1 }, lanes: [{ label: 'L', intervals: 'x' }] })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ title: 'T', domain: { min: 0, max: 1 }, lanes: [{ label: 'L', intervals: [null] }] })), true);
    // interval
    const withIv = (iv) => ({ title: 'T', domain: { min: 0, max: 100 }, lanes: [{ label: 'L', intervals: [iv] }] });
    assert.equal(throwsBlocks(() => renderRangeBar(withIv({ to: 2 }))), true);
    assert.equal(throwsBlocks(() => renderRangeBar(withIv({ from: 0 }))), true);
    assert.equal(throwsBlocks(() => renderRangeBar(withIv({ from: '0', to: 2 }))), true);
    assert.equal(throwsBlocks(() => renderRangeBar(withIv({ from: 2, to: 2 }))), true);
    assert.equal(throwsBlocks(() => renderRangeBar(withIv({ from: 3, to: 2 }))), true);
    assert.equal(throwsBlocks(() => renderRangeBar(withIv({ from: -1, to: 2 }))), true, '出界（左）');
    assert.equal(throwsBlocks(() => renderRangeBar(withIv({ from: 1, to: 101 }))), true, '出界（右）');
    assert.equal(throwsBlocks(() => renderRangeBar(withIv({ from: 1, to: 2, tone: 0 }))), true);
    assert.equal(throwsBlocks(() => renderRangeBar(withIv({ from: 1, to: 2, tone: 5 }))), true);
    assert.equal(throwsBlocks(() => renderRangeBar(withIv({ from: 1, to: 2, tone: '2' }))), true);
    assert.equal(throwsBlocks(() => renderRangeBar(withIv({ from: 1, to: 2, text: 7 }))), true);
    // axis／summary／note／extraClass
    assert.equal(throwsBlocks(() => renderRangeBar({ ...base(), axis: '0' })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ ...base(), axis: ['0'] })), true, '一枚刻度指不出范围');
    assert.equal(throwsBlocks(() => renderRangeBar({ ...base(), axis: ['0', ''] })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ ...base(), axis: ['0', 1] })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ ...base(), summary: { label: 'x' } })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ ...base(), summary: { label: 'x', value: '' } })), true);
    assert.equal(throwsBlocks(() => renderRangeBar({ ...base(), note: 7 })), true);
    for (const bad of ['a"b', '.x', 'a b!']) {
      assert.equal(throwsBlocks(() => renderRangeBar({ ...base(), extraClass: bad })), true, '拒：' + bad);
    }
    assert.match(renderRangeBar({ ...base(), extraClass: 'ok-class' }), /^<div class="ilife-block-range-bar is-lanes ok-class">/);
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('range-bar ② 样式与零 DOM 纪律', () => {
  const css = stripComments(rangeBarCss());

  it('样式段非空，且**每一条**规则 scope 在 `.ilife-page-ui` 之下', () => {
    assert.ok(css.trim() !== '');
    const sels = selectorsOf(rangeBarCss());
    assert.ok(sels.length >= 20, '选择器条数太少：' + String(sels.length));
    for (const sel of sels) {
      assert.ok(sel.includes(ROOT), '选择器不在 scope 之下：' + sel);
      assert.ok(sel.trimStart().startsWith(ROOT), 'scope 必须是第一个复合选择器：' + sel);
      assert.equal((sel.match(/\.ilife-page-ui/g) || []).length, 1,
        'scope 只许出现一次（拼两个槽时写出 `.ilife-page-ui … .ilife-page-ui …` 的规则永远命中不到）：' + sel);
    }
  });

  it('零 `:root`、零 `!important`、不新造 token 名、不重定义那 11 个冻结 token', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.deepEqual(css.match(/--[a-z0-9-]+\s*:/g) || [], []);
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('源码级：`style.ts` 里不手写 `var(--ilife-…)`', () => {
    const src = readFileSync(join(PKG, 'src', 'components', 'range-bar', 'style.ts'), 'utf8');
    assert.equal(/var\(\s*--ilife-/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), false);
  });

  it('零 DOM：`dist/components/range-bar/**` 剥掉字面量与注释后不出现 DOM 名', () => {
    const dir = join(PKG, 'dist', 'components', 'range-bar');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
    assert.ok(files.length >= 5);
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

describe('range-bar ③ 加法式（不挂号＝零命中）', () => {
  it('本件只读自己的类名', () => {
    const alien = [];
    for (const sel of selectorsOf(rangeBarCss())) {
      for (const token of classTokens(sel)) if (!isOwnClass(token, RANGE_BAR_CLASS)) alien.push(token);
    }
    assert.deepEqual(alien, [], '碰了别人的类名：' + alien.join('、'));
  });

  it('标记里也只有自己的类名', () => {
    const html = renderRangeBar(demoInput());
    const alien = [];
    for (const m of html.matchAll(/class="([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/)) {
        if (token === '' || isOwnClass(token, RANGE_BAR_CLASS)) continue;
        alien.push(token);
      }
    }
    assert.deepEqual(alien, [], '标记里混进了别人的类名：' + alien.join('、'));
  });

  it('没挂本件样式的页面：产物逐字节相同，且不含本件一个字', () => {
    const a = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const b = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(a, b);
    assert.equal(a.includes(RANGE_BAR_CLASS), false);
  });
});

/* ── ④ 两档几何（390／1280） ────────────────────────────────────────── */

describe('range-bar ④a 几何契约（静态判据）', () => {
  const css = stripComments(rangeBarCss());

  it('轨道是**份数**（`minmax(0, 1fr)`），左右两栏是**定宽**（宽档／窄档各一套）', () => {
    assert.match(css, new RegExp('grid-template-columns: ' + String(RANGE_BAR_KEY_COLUMN_PX) + 'px minmax\\(0, 1fr\\) minmax\\(' + String(RANGE_BAR_TOTAL_COLUMN_PX) + 'px, auto\\)'));
    assert.ok(css.includes('@container (max-width: ' + String(RANGE_BAR_NARROW_PX) + 'px)'));
    assert.ok(css.includes(String(RANGE_BAR_KEY_COLUMN_NARROW_PX) + 'px minmax(0, 1fr) minmax(' + String(RANGE_BAR_TOTAL_COLUMN_NARROW_PX) + 'px, auto)'), '窄档两栏收一档');
    assert.equal(css.includes('@media (max-width'), false, '不许用视口宽判宽度');
  });

  it('关键读数不截断：时长的 `nowrap` 在、`…` 不在；刻度标签 `nowrap` ＋ 列距', () => {
    const totalRule = new RegExp(S('total') + ' \\{([^}]*)\\}').exec(css);
    assert.ok(totalRule !== null);
    assert.match(totalRule[1], /white-space: nowrap/);
    assert.equal(css.includes('text-overflow'), false, '本件不用 `…` 截断任何读数');
    const tickRule = new RegExp(S('ax-ticks') + ' > i \\{([^}]*)\\}').exec(css);
    assert.ok(tickRule !== null);
    assert.match(tickRule[1], /white-space: nowrap/);
    assert.match(css, new RegExp(S('ax-ticks') + ' \\{[^}]*flex-wrap: wrap'), '刻度换行而不溢出');
  });

  it('极窄档把段内时长字整条收掉（宁可少写一遍，不许压字）', () => {
    assert.ok(css.includes('@container (max-width: ' + String(RANGE_BAR_TEXT_HIDE_BELOW_PX - 1) + 'px)'));
    assert.match(css, new RegExp(S('iv-text') + ' \\{\\s*display: none'));
  });
});

describe('range-bar ④b 真机两档（headless Chrome ＋ CDP）', () => {
  const pageFor = () => '<div class="ilife-page-ui ilife-skin-paper">' + renderRangeBar(demoInput()) + '</div>';

  it('390 与 1280：零横向溢出 ＋ 刻度不压字 ＋ 刻度两端对得上轨道两端', async (t) => {
    const p = await openMeasurePage({
      css: skinCss() + '\n' + rangeBarCss(),
      frames: [{ name: 'w390', width: 390, html: pageFor() }, { name: 'w1280', width: 1280, html: pageFor() }],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何判据需真浏览器');
    try {
      for (const name of ['w390', 'w1280']) {
        const g = await p.measure(name, {
          pairSelector: '.' + S('ax-ticks') + ' > i',
          keySelector: '.' + S('total') + ', .' + S('iv-text'),
        });
        assert.equal(g.frameW, name === 'w390' ? 390 : 1280, name + '：框宽就是判据的那一档');
        assert.ok(g.overflowRightPx <= 0, name + '：右侧越界 ' + String(g.overflowRightPx) + 'px（' + JSON.stringify(g.rightMost) + '）');
        assert.ok(g.overflowLeftPx <= 0, name + '：左侧越界 ' + String(g.overflowLeftPx) + 'px（' + JSON.stringify(g.leftMost) + '）');
        assert.ok(g.targetScroll <= g.targetClient + 1, name + '：本件自己出了横滚');
        assert.ok(g.pageScroll <= g.pageClient, name + '：整页出了横滚');
        assert.deepEqual(g.overflows, [], name + '：有内容被盒子裁掉');
        assert.ok(g.minGapPx >= RANGE_BAR_TICK_GAP_PX, name + '：刻度最小空隙 ' + String(g.minGapPx) + 'px，小于 ' + String(RANGE_BAR_TICK_GAP_PX) + 'px ⇒ 压字');
        for (const k of g.keys) {
          assert.ok(k.sw <= k.cw + 1, name + '：读数位被裁 ' + k.cls + '=' + k.text);
          assert.notEqual(k.ellipsis, 'ellipsis', name + '：读数位不许 `…` 截断');
        }
        // 刻度两端＝轨道两端（同一张网格的直接后果）
        const align = await p.ev('(function(){var f=document.querySelector("[data-frame=\\"" + ' + JSON.stringify(name) + ' + "\\"]");'
          + 'var rail=f.querySelector(".' + S('rail') + '").getBoundingClientRect();'
          + 'var ticks=[].slice.call(f.querySelectorAll(".' + S('ax-ticks') + ' > i"));'
          + 'var first=ticks[0].getBoundingClientRect(), last=ticks[ticks.length-1].getBoundingClientRect();'
          + 'return {railLeft:rail.left,railRight:rail.right,firstLeft:first.left,lastRight:last.right};}())');
        assert.ok(Math.abs(align.firstLeft - align.railLeft) <= 1, name + '：第一枚刻度的左缘对不上轨道左缘');
        assert.ok(Math.abs(align.lastRight - align.railRight) <= 1, name + '：末枚刻度的右缘对不上轨道右缘');
      }
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });

  it('极窄档（260px）：段内时长字被收掉，读数仍不溢出', async (t) => {
    const p = await openMeasurePage({
      css: skinCss() + '\n' + rangeBarCss(),
      frames: [{ name: 'w260', width: 260, html: pageFor() }],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      const g = await p.measure('w260', { pairSelector: '.' + S('ax-ticks') + ' > i' });
      assert.ok(g.overflowRightPx <= 0, '260 档：右侧越界 ' + String(g.overflowRightPx) + 'px');
      assert.ok(g.targetScroll <= g.targetClient + 1);
      assert.ok(g.minGapPx >= RANGE_BAR_TICK_GAP_PX, '260 档刻度空隙 ' + String(g.minGapPx) + 'px');
      const shown = await p.ev('(function(){var f=document.querySelector("[data-frame=\\"w260\\"]");'
        + 'return [].slice.call(f.querySelectorAll(".' + S('iv-text') + '")).filter(function(u){'
        + 'return getComputedStyle(u).display !== "none";}).length;}())');
      assert.equal(shown, 0, '窄过 ' + String(RANGE_BAR_TEXT_HIDE_BELOW_PX) + 'px 时，段内时长字一律不上屏');
    } finally { p.close(); }
  });
});
