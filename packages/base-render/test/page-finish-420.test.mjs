// #420 页面收尾三件（公共层增量）：页内导航 `renderTocBlock` ／ 口径说明行 `renderCaliberLine` ／
// 可打印版式 `renderPageShell({ printable })` ＋ `blocksCss()` 打印段。
//
// 判据（逐条对票面 #420「验收命令」）：
//   1. 导航区块与领域无关：锚点 `id` 由调用方给、区块不猜；空列表＝不出这一块（返回空串）。
//   2. 打印规则必须显式打开：不给 `printable` 的调用点产物逐字不变（类名不出现、规则不命中）。
//   3. 口径说明行纯文本单参，五字符转义表与区块层其余函数同源。
//   4. `blocksCss()` 含 `@media print`，且打印段里每条选择器都在 `.ilife-page-printable` 作用域下。
// 纪律（与 blocks.test.mjs 同口径）：断言只读冻结常量与产物字面量，不硬编码第二份 token 值。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BlocksError,
  blocksCss,
  renderCaliberLine,
  renderPageShell,
  renderTocBlock,
} from '../dist/blocks.js';
import { CSS_VAR_TOKENS } from '../dist/index.js';

/** 断言以 BlocksError（code bad-input）抛出（与 blocks.test.mjs 同口径）。 */
function assertBadInput(fn, label) {
  assert.throws(fn, (err) => err instanceof BlocksError
    && err.name === 'BlocksError'
    && err.code === 'bad-input', label);
}

/** 逐字取出 `@media print { … }` 段（花括号配对；段内含嵌套的 `@page`）。 */
function printSection(css) {
  const start = css.indexOf('@media print');
  assert.ok(start >= 0, 'blocksCss 缺 @media print 段');
  const open = css.indexOf('{', start);
  assert.ok(open > start, '@media print 段缺规则体');
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  assert.fail('@media print 段花括号不配对');
}

/** 打印段里的选择器行（行尾 `{` 且不是 at-rule；声明行与嵌套 at-rule 头不在内）。 */
function selectorLines(section) {
  return section.split(String.fromCharCode(10)).map((line) => line.trim())
    .filter((line) => line.endsWith('{') && !line.startsWith('@'));
}

describe('#420 页内导航 renderTocBlock', () => {
  it('两锚点：根类／逐项 href／aria-label 齐备', () => {
    const html = renderTocBlock({
      items: [{ id: 'sec-kpi', text: '指标' }, { id: 'sec-copy', text: '复制区' }],
    });
    assert.ok(html.includes('ilife-block-toc'), '缺 ilife-block-toc：' + html);
    assert.ok(html.startsWith('<nav '), '载体必须是 nav：' + html.slice(0, 40));
    assert.ok(html.includes('href="#sec-kpi"'), '缺锚点 sec-kpi');
    assert.ok(html.includes('href="#sec-copy"'), '缺锚点 sec-copy');
    assert.ok(/aria-label="[^"]+"/.test(html), '缺 aria-label：' + html);
    assert.ok(html.includes('指标') && html.includes('复制区'), '缺项文本');
    assert.equal((html.match(/<a /g) ?? []).length, 2, '逐项一个链接');
  });

  it('空列表＝不出这一块（返回空串）', () => {
    assert.equal(renderTocBlock({ items: [] }), '');
  });

  it('项文本与 id 走五字符转义（区块不猜锚点，但必须转义）', () => {
    const html = renderTocBlock({ items: [{ id: 'a"b', text: '<b>&' }] });
    assert.ok(html.includes('href="#a&quot;b"'), 'id 未转义：' + html);
    assert.ok(html.includes('&lt;b&gt;&amp;'), '项文本未转义：' + html);
    assert.ok(!html.includes('<b>'), '原始尖括号不得进产物');
  });

  it('items 非数组／项缺 id／项缺 text → bad-input', () => {
    assertBadInput(() => renderTocBlock({}), '缺 items');
    assertBadInput(() => renderTocBlock({ items: 'x' }), 'items 非数组');
    assertBadInput(() => renderTocBlock({ items: [{ text: '甲' }] }), '项缺 id');
    assertBadInput(() => renderTocBlock({ items: [{ id: 'a', text: '' }] }), '项 text 空串');
  });
});

describe('#420 口径说明行 renderCaliberLine', () => {
  it('单参纯文本：根类＋文本逐字', () => {
    const html = renderCaliberLine('周目标口径＝每日目标 × 7');
    assert.ok(html.includes('ilife-block-caliber'), '缺 ilife-block-caliber：' + html);
    assert.ok(html.includes('周目标口径＝每日目标 × 7'), '文本必须逐字：' + html);
  });

  it('五字符转义：< 与 & 被转义（与区块层同源表）', () => {
    const html = renderCaliberLine('<b>&');
    assert.ok(html.includes('&lt;b&gt;&amp;'), '未按冻结表转义：' + html);
    assert.ok(!html.includes('<b>'), '原始尖括号不得进产物');
  });

  it('空串／非串 → bad-input', () => {
    assertBadInput(() => renderCaliberLine(''), '空串');
    assertBadInput(() => renderCaliberLine(7), '非串');
  });
});

describe('#420 可打印版式 renderPageShell({ printable })', () => {
  /** 今天（不给新参数）的产物逐字：新参数必须零变。 */
  const TODAY_SHELL = '<section class="ilife-block ilife-block-page-shell">'
    + '<h1 class="ilife-block-page-shell-title">T</h1>'
    + '<div class="ilife-block-page-shell-body">C</div>'
    + '</section>';

  it('不给 printable／给假：产物逐字同今天', () => {
    assert.equal(renderPageShell({ title: 'T', content: 'C' }), TODAY_SHELL, '新参数缺省必须零变');
    assert.equal(renderPageShell({ title: 'T', content: 'C', printable: false }), TODAY_SHELL, 'printable: false 必须零变');
    assert.ok(!renderPageShell({ title: 'T', content: 'C' }).includes('ilife-page-printable'), '缺省不得出打印类');
  });

  it('printable: true：版面根加 ilife-page-printable，其余三件套不变', () => {
    const html = renderPageShell({ title: 'T', content: 'C', printable: true });
    assert.ok(html.includes('ilife-page-printable'), '缺打印类：' + html);
    assert.ok(/^<section class="[^"]*\bilife-page-printable\b[^"]*">/.test(html), '打印类必须落在版面根：' + html.slice(0, 80));
    assert.ok(html.includes('ilife-block-page-shell-title">T<'), '标题件不变');
    assert.equal(html.replace(' ilife-page-printable', ''), TODAY_SHELL, '除打印类外逐字同今天');
  });
});

describe('#420 blocksCss 打印段（作用域纪律）', () => {
  it('含 @media print 与具名 @page，且隐藏页内导航与复制区', () => {
    const css = blocksCss();
    assert.ok(css.includes('@media print'), '缺 @media print');
    assert.ok(css.includes('@page printable'), '缺具名页规则（@page printable）');
    const section = printSection(css);
    assert.ok(new RegExp('\\.ilife-page-printable\\s+\\{[^}]*page:\\s*printable').test(section), '打印页名必须由 .ilife-page-printable 绑定');
    assert.ok(new RegExp('\\.ilife-page-printable\\s+\\.ilife-block-toc\\s*\\{[^}]*display:\\s*none').test(section), '打印时必须隐藏页内导航');
    assert.ok(new RegExp('\\.ilife-page-printable\\s+\\.ilife-block-copy-block\\s*\\{[^}]*display:\\s*none').test(section), '打印时必须隐藏复制区');
  });

  it('不得出现裸 @page（全局规则会让全部页面吃这 12mm 页边距）', () => {
    const css = blocksCss();
    assert.ok(!/@page\s*\{/.test(css), '裸 @page 是全局规则，不得出现');
    assert.ok(!/@page\s*:\s*/.test(css), '@page 不得带伪类选择器（全局面）');
  });

  it('打印段每条选择器都在 .ilife-page-printable 作用域下（无裸 body{／裸 .wrap）', () => {
    const section = printSection(blocksCss());
    const lines = selectorLines(section);
    assert.ok(lines.length >= 3, '打印段选择器异常偏少：' + lines.length);
    for (const line of lines) {
      assert.ok(line.includes('.ilife-page-printable'), '闭集外（未加打印作用域）的选择器：' + line);
    }
    assert.ok(!/(^|[},\s])body\s*\{/.test(section), '打印段不得出现裸 body 选择器');
    assert.ok(!section.includes('.wrap'), '打印段不得出现裸 .wrap 选择器');
  });

  it('打印段只读冻结 token（11 键闭集，未新增语义 token）', () => {
    const section = printSection(blocksCss());
    const used = new Set([...section.matchAll(/var\((--[A-Za-z0-9-]+)\)/g)].map((m) => m[1]));
    for (const name of used) {
      assert.ok(Object.hasOwn(CSS_VAR_TOKENS, name), '未冻结的 token：' + name);
    }
  });
});
