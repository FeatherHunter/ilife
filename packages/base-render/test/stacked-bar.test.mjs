/** stacked-bar（构成条 · 形态 A「100% 堆叠 ＋ 图例」）· 契约测试。
 *
 * 覆盖四组判据：
 *  ① **渲染契约**：结构（类名与槽位）／段宽之和恰好 1000 千分比／段内读数三档阈值（20%／12%）／
 *     图例必带数值／色不是唯一信息／转义面／**全部**非法入参分支（每个都断 `BlocksError`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下（含 `@container`
 *     里的那几条）、零 `:root`／`!important`／零新 token、零手写色值、零手写 `var(--ilife-…)`；
 *     `dist/components/stacked-bar/**` 剥掉字面量与注释后不出现 `document.`／`window.`／`navigator.`；
 *  ③ **加法式**：本件只读自己的类名；不启用它的页面零命中、逐字节不变；
 *  ④ **两档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 390 与 1280 下零横向溢出、
 *     图例两列数字零截断、零 `overflow-x`（不藏横滑）。
 *
 * 期望值一律从组件自己的常量派生（`STACKED_BAR_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  STACKED_BAR_CLASS,
  STACKED_BAR_FORMS,
  STACKED_BAR_HEIGHT_PX,
  STACKED_BAR_MAX_SEGMENTS,
  STACKED_BAR_MISSING,
  STACKED_BAR_NAME_MIN_PCT,
  STACKED_BAR_SERIES,
  STACKED_BAR_VALUE_MIN_PCT,
  renderStackedBar,
  stackedBarCss,
  stackedBarSlot,
} from '../dist/components/stacked-bar/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { skinClass, skinCss, BROADSHEET_VALUES, NEUTRAL_VALUES, PAPER_VALUES } from '../dist/components/skin/index.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { startShapesPage } from './shapes-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/** 三套皮肤的取值表（期望色**从表里读**，判据里不抄色字面量）。 */
const SKIN_VALUES = { paper: PAPER_VALUES, broadsheet: BROADSHEET_VALUES, neutral: NEUTRAL_VALUES };

/** 取值表里的 `#rrggbb` → 浏览器 `getComputedStyle` 报出来的 `rgb(r, g, b)` 串。 */
const toRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return 'rgb(' + [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(', ') + ')';
};

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把"解释"当"规则"）。 */
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

/** 样式段里的选择器（含 `@container` 里缩进的那几条）。 */
const selectorsOf = (css) => (stripComments(css).match(/^[ \t]*([^@\s{}][^{}\n]*)\{/gm) || [])
  .map((one) => one.replace(/\{$/, '').trim())
  .filter((one) => one !== '');

/** 段宽（行内 `flex` 的第一个数，千分比）：**各段之和必须恰好 1000**。 */
const flexesOf = (html) => [...html.matchAll(/class="[^"]*-seg[^"]*" style="flex: (\d+) 1 0"/g)].map((m) => Number(m[1]));

/** 三月消费结构（六段，占比 38／24／14／9／8／7）。 */
const MARCH = [
  { name: '餐饮', value: 2660 }, { name: '居住', value: 1680 }, { name: '交通', value: 980 },
  { name: '人情', value: 630 }, { name: '购物', value: 560 }, { name: '其他', value: 490 },
];

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('stacked-bar ① 渲染契约', () => {
  const base = { title: '3 月消费结构', stamp: '合计 7 000 元', segments: MARCH, unit: '元' };

  it('形态 A：一根构成条（段宽＝占比）＋ 图例（名字 ｜ 百分数 ｜ 数量）＋ 脚注', () => {
    const html = renderStackedBar({ ...base, note: '餐饮占了近四成。' });
    assert.match(html, new RegExp('^<div class="' + STACKED_BAR_CLASS + ' is-stack">'));
    assert.match(html, new RegExp('-title">3 月消费结构</'));
    assert.match(html, new RegExp('-stamp">合计 7 000 元</'));
    assert.match(html, /-bar" role="img" aria-label="3 月消费结构：餐饮 38%、居住 24%、交通 14%、人情 9%、购物 8%、其他 7%"/,
      '整条构成是一张图，读屏拿到逐段读数');
    assert.equal((html.match(/class="[^"]*-seg /g) || []).length >= MARCH.length, true, '逐段出标记');
    assert.equal((html.match(/-legend-item"/g) || []).length, MARCH.length, '逐段出图例行');
    for (const seg of MARCH) {
      assert.ok(html.includes('>' + seg.name + '<'), '图例里要有名字：' + seg.name);
    }
    assert.match(html, /-pct">38%</);
    assert.match(html, /-amount">2 660 元</, '图例的数量带单位与千分位');    assert.match(html, /-note">餐饮占了近四成。</);
    assert.ok(!/<script/i.test(html), '不产脚本');
  });

  it('**段宽之和恰好 1000 千分比**（＝100%），且与占比对得上', () => {
    for (const segs of [MARCH, [{ name: 'a', value: 1 }, { name: 'b', value: 2 }, { name: 'c', value: 3 }],
      [{ name: 'a', value: 1 }, { name: 'b', value: 1 }, { name: 'c', value: 1 }]]) {
      const html = renderStackedBar({ title: 'x', segments: segs });
      const flexes = flexesOf(html);
      assert.equal(flexes.length, segs.length, '逐段一个 flex');
      assert.equal(flexes.reduce((a, b) => a + b, 0), 1000, '段宽之和必须恰好 1000（末段吃下舍入余数）');
      const sum = segs.reduce((a, s) => a + s.value, 0);
      flexes.forEach((f, i) => {
        assert.ok(Math.abs(f - (segs[i].value / sum) * 1000) <= 1, '段宽＝占比（第 ' + i + ' 段）');
      });
    }
  });

  it('段内读数三档阈值：≥20% 连名字写／≥12% 只写百分数／更窄一个字都不写（数字退回图例）', () => {
    assert.equal(STACKED_BAR_NAME_MIN_PCT, 20);
    assert.equal(STACKED_BAR_VALUE_MIN_PCT, 12);
    const html = renderStackedBar({ title: 'x', segments: MARCH });
    assert.match(html, /is-name" style="flex: 380 1 0"><b class="[^"]*-seg-text">餐饮 38%<\/b>/);
    assert.match(html, /is-value" style="flex: 140 1 0"><b class="[^"]*-seg-text">14%<\/b>/, '14% 只写百分数');
    assert.match(html, /is-none" style="flex: 90 1 0"><\/span>/, '9% 那一段里一个字都不写');
    /* 段里字少不等于没数：那三段的数字都在图例里。 */
    for (const pct of ['9%', '8%', '7%']) assert.ok(html.includes('>' + pct + '<'), '窄段的数字退回图例：' + pct);
  });

  it('色不是唯一信息：每段一条图例、图例必带数字，色块只是第二次提醒', () => {
    const html = renderStackedBar({ title: 'x', segments: MARCH, unit: '元' });
    const legend = html.slice(html.indexOf('-legend"'));
    assert.equal((legend.match(/-swatch/g) || []).length, MARCH.length, '逐段一枚色块（纯装饰）');
    assert.equal((legend.match(/-pct"/g) || []).length, MARCH.length, '逐段一个百分数');
    assert.equal((legend.match(/-amount"/g) || []).length, MARCH.length, '逐段一个数量');
    for (let i = 1; i <= STACKED_BAR_SERIES; i += 1) assert.ok(html.includes('is-k' + i), '色档按段序发：is-k' + i);
    assert.equal(html.includes('is-k' + (STACKED_BAR_SERIES + 1)), false, '色档不发到第 7 档');
  });

  it('缺槽就不出那一槽：不给 stamp／unit／note 就不出那三处', () => {
    const html = renderStackedBar({ title: 'x', segments: [{ name: 'a', value: 1 }] });
    assert.equal(html.includes('-stamp'), false);
    assert.equal(html.includes('-note'), false);
    assert.match(html, /-amount">1</, '不给单位就不拼单位');
  });

  it('转义面：标题／口径／名字／单位逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderStackedBar({ title: evil, stamp: evil, unit: evil, segments: [{ name: evil, value: 1 }] });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签：' + html.slice(0, 160));
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.ok(renderStackedBar({ title: 'x', segments: [{ name: 'a', value: 1 }], extraClass: 'ok-class other' })
      .includes('ok-class other'), '合法附加类名照收');
  });

  it('缺值写法：没给的分段不存在；本件不认 `pct` 入参（占比只许算一次）', () => {
    assert.equal(STACKED_BAR_MISSING, '—');
    const html = renderStackedBar({ title: 'x', segments: [{ name: 'a', value: 1000 }] });
    assert.match(html, /-pct">100%</, '单段就是 100%');
    const twice = renderStackedBar({ title: 'x', segments: [{ name: 'a', value: 1, pct: 90 }, { name: 'b', value: 1 }] });
    assert.match(twice, /-pct">50%</, '调用方塞进来的 pct 一律忽略：占比由本件按各段之和算');
  });

  it('入参违规一律拒（不静默降级）：非对象／标题／分段／段数上限／形态键／附加类名', () => {
    assert.deepEqual([...STACKED_BAR_FORMS], ['stack']);
    assert.equal(STACKED_BAR_MAX_SEGMENTS, STACKED_BAR_SERIES);
    assert.equal(throwsBlocks(() => renderStackedBar(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderStackedBar({ title: 'x' })), true, '没有分段');
    assert.equal(throwsBlocks(() => renderStackedBar({ title: 'x', segments: [] })), true, '空分段');
    assert.equal(throwsBlocks(() => renderStackedBar({ title: 'x', segments: 'x' })), true);
    assert.equal(throwsBlocks(() => renderStackedBar({ title: '', segments: [{ name: 'a', value: 1 }] })), true);
    assert.equal(throwsBlocks(() => renderStackedBar({ title: 'x', segments: [null] })), true);
    assert.equal(throwsBlocks(() => renderStackedBar({ title: 'x', segments: [{ name: '', value: 1 }] })), true);
    assert.equal(throwsBlocks(() => renderStackedBar({ title: 'x', segments: [{ name: 'a', value: 0 }] })), true, '零段');
    assert.equal(throwsBlocks(() => renderStackedBar({ title: 'x', segments: [{ name: 'a', value: -1 }] })), true);
    assert.equal(throwsBlocks(() => renderStackedBar({ title: 'x', segments: [{ name: 'a', value: Number.NaN }] })), true);
    assert.equal(throwsBlocks(() => renderStackedBar({ title: 'x', segments: [{ name: 'a', value: '1' }] })), true);
    const seven = Array.from({ length: STACKED_BAR_MAX_SEGMENTS + 1 }, (_, i) => ({ name: 's' + i, value: i + 1 }));
    assert.equal(throwsBlocks(() => renderStackedBar({ title: 'x', segments: seven })), true, '超过色档数的段数');
    assert.equal(throwsBlocks(() => renderStackedBar({ title: 'x', segments: [{ name: 'a', value: 1 }], form: 'pie' })), true);
    assert.equal(throwsBlocks(() => renderStackedBar({ title: 'x', segments: [{ name: 'a', value: 1 }], extraClass: 'a"b' })), true);
  });

  it('纯函数：同样的入参恒产同样的字节', () => {
    assert.equal(renderStackedBar(base), renderStackedBar(base));
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('stacked-bar ② 样式与零 DOM 纪律', () => {
  const css = stackedBarCss();

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且带本件类名根', () => {
    assert.ok(stripComments(css).trim() !== '', '样式段必须非空');
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 10, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        assert.ok(part.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + part.trim());
        assert.ok(part.includes(STACKED_BAR_CLASS), '选择器必须只碰本件类名根：' + part.trim());
        /* 拼后代／兄弟选择器时**只许第一段带 scope**：`.page-ui .a .page-ui .b` 里第二条 `.page-ui`
           永远匹配不到 —— 规则「看着在、其实不生效」（样张页上抓到过一次真事：段内字让位没生效）。 */
        assert.equal((part.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次：' + part.trim());
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零 `@media`／必带 `@container`（宽度只许容器判）', () => {
    const clean = stripComments(css);
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(clean.includes('@media'), false, '本件不判视口宽度（视口宽 ≠ 组件宽）');
    assert.equal(clean.includes('@container'), true, '窄档必须由容器判');
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(clean.includes(frozen + ':'), false, '不得重定义冻结 token：' + frozen);
    }
  });

  it('**数据色全部算出来**：零手写色值、**源码级**零手写 `var(--ilife-…)`，色序走 `color-mix()` ＋ `skinVar()`', () => {
    const clean = stripComments(css);
    /* 样式段里的色值只许来自 `skinVar()` 的兜底链（`var(--ilife-…, …)`）；源码里写的色一律算硬编码。 */
    const hexes = [...clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)];
    for (const m of hexes) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const src = stripComments(readFileSync(join(PKG, 'src', 'components', 'stacked-bar', 'style.ts'), 'utf8'));
    assert.deepEqual([...src.matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [], '源码里请改走 skinVar()');
    assert.equal(clean.includes('color-mix(in srgb,'), true, '数据色从 skinVar 算出来');
    assert.equal(clean.includes('var(--ilife-accent,'), true, '强调色经 skinVar 走兜底链');
  });

  it('尺寸事实写在一处：条高取常量', () => {
    assert.ok(stripComments(css).includes('height: ' + String(STACKED_BAR_HEIGHT_PX) + 'px'));
  });

  it('`dist/components/stacked-bar/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'stacked-bar');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 4, '至少该有 index／attrs／model／render／style 的产物：' + files.join('、'));
    const stripLiterals = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const name of files) {
      const code = stripLiterals(readFileSync(join(dir, name), 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, name + ' 里出现了 ' + needle);
      }
    }
  });

  it('槽位闭集与类名一致（判据不另抄一份字面量）', () => {
    assert.equal(stackedBarSlot('legend-item'), STACKED_BAR_CLASS + '-legend-item');
    assert.equal(stackedBarSlot('pct', 'x-'), 'x-block-stacked-bar-pct');
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('stacked-bar ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(STACKED_BAR_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderScaleBar({ value: 860, goal: 1850 });
    renderStackedBar({ title: 'x', segments: [{ name: 'a', value: 1 }] });
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), before, '别件的产物逐字节不变');
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(stackedBarCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-stacked-bar'), '前缀必须作用到 scope 与类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });
});

/* ── ④ 两档几何（真机） ─────────────────────────────────────────────── */

/** 关键语义槽：图例两列数字与段内读数（可见的那些）都不许被截断。 */
const KEY_SELECTORS = ['pct', 'amount', 'seg-text', 'name'].map((slot) => '.' + stackedBarSlot(slot));

/** 三种压力样例：六段（含窄段）／四段营养／超长名 ＋ 大数（最容易被撑宽的就是最后一档）。 */
function cases() {
  return [
    { name: 'six', html: renderStackedBar({ title: '3 月消费结构', stamp: '合计 7 000 元', segments: MARCH, unit: '元' }) },
    { name: 'four', html: renderStackedBar({
      title: '营养结构 · 今天',
      segments: [{ name: '碳水', value: 45 }, { name: '蛋白', value: 27 }, { name: '脂肪', value: 23 },
        { name: '膳食纤维', value: 5 }],
      unit: '克',
    }) },
    { name: 'long', html: renderStackedBar({
      title: '支出结构（按用途归并）',
      segments: [{ name: '外出就餐与外卖（含同事聚餐分摊）', value: 1234567 }, { name: '其他', value: 234567 }],
      unit: '元',
    }) },
    /* 最小样例（件清单派生出来的那一份）：单段、短名——**边框那两像素**的最坏情形就在这里。 */
    { name: 'single', html: renderStackedBar({ title: '示例', segments: [{ name: '示例', value: 1 }] }) },
  ];
}

describe('stacked-bar ④ 两档几何（真机 headless Chrome ＋ CDP）', () => {
  it('容器 390 与 1280：零横向溢出、图例数字零截断、零 overflow-x', async (t) => {
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const html = ['paper', 'broadsheet', 'neutral']
      .map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n');
    const page = await startShapesPage({ html, css: skinCss() + '\n' + stackedBarCss() });
    if (page === null) return t.skip('本机无 Chrome／Chromium：两档几何判据需真浏览器');
    try {
      const seen = [];
      for (const width of [390, 1280]) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of ['paper', 'broadsheet', 'neutral']) {
          for (const c of cases()) {
            const scope = '.' + skinClass(skin) + ' [data-case="' + c.name + '"] ';
            const root = await page.read([scope + '.' + STACKED_BAR_CLASS]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            assert.ok(root[0].maxScrollW <= root[0].maxClientW + 1,
              width + ' 档 ' + skin + ' ' + c.name + '：根横向溢出 ' + root[0].maxScrollW + ' > ' + root[0].maxClientW);
            assert.equal(root[0].scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            const keys = await page.read(KEY_SELECTORS.map((sel) => scope + sel));
            for (const one of keys) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name
                + '：' + one.sel + ' 有 ' + one.clipped + ' 处被截断（可见 ' + one.visible + ' 处）');
              if (one.visible > 0) {
                assert.ok(one.maxRight <= root[0].maxRight + 1,
                  width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 跑出根');
              }
            }
            /* 图例两列数字：逐段都在（390 档也不许少）。 */
            const segs = c.name === 'six' ? MARCH.length : c.name === 'four' ? 4 : c.name === 'single' ? 1 : 2;
            const pct = keys.find((k) => k.sel.endsWith('-pct'));
            const amount = keys.find((k) => k.sel.endsWith('-amount'));
            assert.equal(pct.visible, segs, width + ' 档 ' + skin + '：图例百分数逐段都在');
            assert.equal(amount.visible, segs, width + ' 档 ' + skin + '：图例数量逐段都在');
            /* 那根条：段宽之和恒为 100% ⇒ 条宽就是根宽（不溢出、不留空）。 */
            const bar = await page.ev('(function(){var b=document.querySelector('
              + JSON.stringify(scope + '.' + stackedBarSlot('bar')) + ');'
              + 'return {w:Math.round(b.getBoundingClientRect().width),sw:b.scrollWidth,cw:b.clientWidth};}())');
            assert.ok(bar.sw <= bar.cw + 1, width + ' 档 ' + skin + '：构成条自身溢出');
            /* **段内字真的让位**（390 档）：`is-value` 那批的段内字必须 display:none（数字在图例里）——
               光看样式段里有那条规则不够：选择器拼错时规则看着在、其实不生效。 */
            if (c.name === 'six') {
              const mid = await page.ev('(function(){var el=document.querySelector('
                + JSON.stringify(scope + '.' + stackedBarSlot('seg') + '.is-value .' + stackedBarSlot('seg-text'))
                + ');return el===null?"missing":getComputedStyle(el).display;}())');
              assert.notEqual(mid, 'missing', width + ' 档 ' + skin + '：14% 那一段的段内字不见了（标记层就没了？）');
              assert.equal(mid === 'none', width === 390,
                width + ' 档 ' + skin + '：窄档才让位图例，宽档要写出来（实测 display=' + mid + '）');
              /* 深端两档的段内字用强调底上的字色，浅端用主文字色（色值取皮肤取值表，不抄字面量）。 */
              const vals = SKIN_VALUES[skin];
              const pair = await page.ev('(function(){var q=function(c){var el=document.querySelector('
                + JSON.stringify(scope) + '+c);return el===null?null:getComputedStyle(el).color;};'
                + 'return {dark:q(".' + stackedBarSlot('seg') + '.is-k1 .' + stackedBarSlot('seg-text') + '"),'
                + 'light:q(".' + stackedBarSlot('seg') + '.is-k3 .' + stackedBarSlot('seg-text') + '")};}())');
              assert.equal(pair.dark, toRgb(vals['accent-ink']), skin + '：深端段内字取 accent-ink');
              assert.equal(pair.light, toRgb(vals.ink), skin + '：浅端段内字取主文字色');
            }
            seen.push({ width, skin, name: c.name, barW: bar.w, rootScrollW: root[0].maxScrollW,
              rootClientW: root[0].maxClientW });
          }
        }
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of [390, 1280]) {
        const rows = seen.filter((s) => s.width === w);
        console.log('READING stacked-bar container=' + w
          + ' maxRootScrollW=' + Math.max(...rows.map((s) => s.rootScrollW))
          + ' maxRootClientW=' + Math.max(...rows.map((s) => s.rootClientW))
          + ' barW=' + Math.min(...rows.map((s) => s.barW)) + '..' + Math.max(...rows.map((s) => s.barW))
          + ' cases=' + rows.length);
      }
    } finally { page.close(); }
  });
});
