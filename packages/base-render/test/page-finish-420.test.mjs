// #420 页面收尾三件（公共层增量）：页内导航 `renderTocBlock` ／ 口径说明行 `renderCaliberLine` ／
// 可打印版式 `renderPageShell({ printable })` ＋ `blocksCss()` 打印段。
//
// 判据（逐条对票面 #420「验收命令」，打印段与基线两条按 #428 硬化）：
//   1. 导航区块与领域无关：锚点 `id` 由调用方给、区块不猜；空列表＝不出这一块（返回空串）。
//   2. 打印规则必须显式打开：不给 `printable` 的调用点产物逐字同基线（类名不出现、规则不命中）。
//   3. 口径说明行纯文本单参，五字符转义表与区块层其余函数同源。
//   4. `blocksCss()` 含 `@media print`；打印段里的选择器**按 `,` 拆开后逐项**都在
//      `.ilife-page-printable` 作用域下；段内 at-rule 只允许具名页 `@page printable`。
// 纪律（与 blocks.test.mjs 同口径）：断言只读冻结常量与产物字面量，不硬编码第二份 token 值。
//
// #428 硬化两处（来源：#420 独立对抗审查 S3 记账 D1／D2）：
//   · D1：原先判「行尾 `{` 且该行含类名」，**不拆逗号** ⇒ `.ilife-page-printable, .ilife-page { … }`
//     这类并列全局选择器能全绿漏网。现在按 CSS 规则体逐条解析（`rules()`），选择器逗号拆开逐项判起头。
//   · D2：原先拿测试内硬编码整页字面量 `TODAY_SHELL` 当基线，属自证。基线改从 `dc16ba1^`
//     的编译产物取真值，落 `test/fixtures/page-finish-420-baseline.json`（取法与校验见「可追溯基线」段）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const CLASS = 'ilife-page-printable';

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

/** 跳过注释与字符串（解析时用；注释一律不参与判定）。 */
function skipTrivia(text, from) {
  let i = from;
  for (;;) {
    if (text[i] === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 2;
    } else if (text[i] === '"' || text[i] === "'") {
      const quote = text[i];
      i += 1;
      while (i < text.length && text[i] !== quote) i += text[i] === '\\' ? 2 : 1;
      i += 1;
    } else return i;
  }
}

/**
 * 把 CSS 文本按规则体解析成 `{ prelude, body }`（#428 D1）。
 * 只认真正的 `选择器 { 声明… }` 结构：前导符（选择器／at-rule 头）读到合规的 `{` 为止，
 * 注释与字符串里的花括号一律不算。声明块与嵌套 at-rule 块都不当规则。
 */
function rules(css) {
  const out = [];
  let pos = skipTrivia(css, 0);
  while (pos < css.length) {
    let i = pos;
    let nesting = 0;
    let quote = null;
    let preludeEnd = -1;
    for (; i < css.length; i += 1) {
      const ch = css[i];
      if (quote !== null) {
        if (ch === '\\') i += 1;
        else if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '/' && css[i + 1] === '*') i = skipTrivia(css, i) - 1;
      else if (ch === '(' || ch === '[') nesting += 1;
      else if (ch === ')' || ch === ']') nesting -= 1;
      else if (nesting === 0 && ch === '{') { preludeEnd = i; break; }
      else if (nesting === 0 && ch === ';') { preludeEnd = i; break; }
      else if (nesting === 0 && ch === '}') break;
    }
    if (preludeEnd < 0) break;
    const prelude = css.slice(pos, preludeEnd).trim();
    if (css[preludeEnd] === ';') { pos = skipTrivia(css, preludeEnd + 1); continue; }
    let depth = 0;
    let j = preludeEnd;
    for (; j < css.length; j += 1) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    out.push({ prelude, body: css.slice(preludeEnd + 1, j) });
    pos = skipTrivia(css, j + 1);
  }
  return out;
}

/** 选择器按 `,` 拆开（括号内逗号不算分隔；`#428 D1` 的核心就是这一步）。 */
function splitSelectors(prelude) {
  const parts = [];
  let current = '';
  let nesting = 0;
  for (const ch of prelude) {
    if (ch === '(' || ch === '[') nesting += 1;
    if (ch === ')' || ch === ']') nesting -= 1;
    if (ch === ',' && nesting === 0) { parts.push(current.trim()); current = ''; } else current += ch;
  }
  parts.push(current.trim());
  return parts.filter((part) => part !== '');
}

/** 打印段里具名作用域选择器：`.ilife-page-printable` 起头，后面只能是组合符、标签、类、伪类。 */
const SCOPED_SELECTOR = new RegExp('^\\.' + CLASS + '(?:$|[ >+~.:\\[#*])');

/** 取 `@page` 的页名（`@page printable {` ⇒ `printable`；裸 `@page {` ⇒ 空串）。 */
function pageName(prelude) {
  return prelude.slice('@page'.length).replace(/\{[^]*$/, '').replace(/;$/g, '').trim();
}

// ── 可追溯基线（#428 D2 去自证）───────────────────────────────────────────────────────────────
// 取法：夹具 `test/fixtures/page-finish-420-baseline.json` 的真值由 `.scratch/t428/gen-baseline.mjs`
// 在**落点窗口内直调**生成——窗口先把 `packages/base-render/src/blocks.ts` 换成
// `git show dc16ba1^:packages/base-render/src/blocks.ts` 的原始字节、编译、跑取值器，
// 随后逐文件还原源码并重编（读数见 `docs/base/base-render/t428-判据硬化.md` §2）。
// 本测试**不写死任何整页 HTML**：真值一律从夹具读，且夹具自证两件事——
//   ① 它记的基线提交 == 当刻仓库解的 `dc16ba1^`；
//   ② 它记的源码 blob 摘要 == 当刻仓库里该提交的 `blocks.ts` 字节摘要。
// 篡改夹具会被 ①／② 当场抓住，改成别的提交也过不了；这一条让基线可追溯、不自证。
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_CANDIDATES = [
  path.join(HERE, 'fixtures', 'page-finish-420-baseline.json'),
  path.resolve(HERE, '..', '..', 'packages', 'base-render', 'test', 'fixtures', 'page-finish-420-baseline.json'),
];
const BASELINE_PATH = BASELINE_CANDIDATES.find((candidate) => fs.existsSync(candidate))
  ?? BASELINE_CANDIDATES[0];
const BASELINE = Object.freeze(JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')));

let cachedRepoFacts = null;
/** 只读 git 查当刻仓库事实（一次进程内缓存；本测试对工作区零写入）。 */
function repoFacts() {
  if (cachedRepoFacts === null) {
    const repoRoot = path.resolve(HERE, '..', '..', '..');
    const git = (args) => execFileSync('git', args, { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
    cachedRepoFacts = {
      baselineCommit: git(['rev-parse', 'dc16ba1^']).toString('utf8').trim(),
      blobSha256: createHash('sha256')
        .update(git(['show', 'dc16ba1^:packages/base-render/src/blocks.ts'])).digest('hex'),
    };
  }
  return cachedRepoFacts;
}

/** 基线夹具里那条用例的真值（找不到即报红）。 */
function baselineShell(label) {
  const hit = BASELINE.cases.find((item) => item.label === label);
  assert.ok(hit, `基线夹具缺用例「${label}」（夹具＝${path.relative(process.cwd(), BASELINE_PATH)}）`);
  return hit.html;
}

describe('#428 可追溯基线（打印版式基线的来源与自证检查）', () => {
  it('夹具记的基线提交＝当刻仓库解的 dc16ba1^', () => {
    assert.equal(BASELINE.baselineCommit, repoFacts().baselineCommit, '基线提交对不上当刻仓库');
    assert.equal(BASELINE.sourcePath, 'packages/base-render/src/blocks.ts', '基线源码路径必须是 blocks.ts');
  });

  it('夹具记的源码 blob 摘要＝当刻仓库里 dc16ba1^ 的 blocks.ts 字节摘要', () => {
    assert.equal(BASELINE.sourceBlobSha256, repoFacts().blobSha256, '基线源码字节摘要对不上，夹具已陈旧或被改');
    assert.match(BASELINE.sourceBlobSha256, /^[0-9a-f]{64}$/, '摘要形状不对');
  });

  it('基线值是真产物：真值必须以版面根 `<section class="` 起头（不是抄回来的片段）', () => {
    assert.ok(BASELINE.cases.length >= 3, '基线用例太少：' + BASELINE.cases.length);
    for (const item of BASELINE.cases) {
      assert.ok(item.html.startsWith('<section class="'), '基线不是整页产物：' + item.label);
      assert.ok(item.html.endsWith('</section>'), '基线不是整页产物：' + item.label);
    }
  });

  it('本件不再留任何硬编码整页字面量（夹具是唯一来源）', () => {
    const source = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
    // 允许的碎片：标签名／类名／属性名／`.ilife-page-printable` 前缀（断言里比结构时用得到），
    // 以及示例值 T／C／E／S 与受信正文样例。**任何含真实文本或类名拼接的字面量都不在列**。
    const allowed = new Set([
      'ilife', 'block', 'page', 'printable', 'shell', 'title', 'body', 'section', 'nav', 'div', 'h1',
      'p', 'class', 'a', 'b', 'i', 'T', 'C', 'E', 'S', 'x', 'q',
    ]);
    const fragments = [...source.matchAll(/'([^'\r\n]*)'/g)].map((m) => m[1])
      .filter((lit) => /[<>]/.test(lit)).map((lit) => lit.split(/[^A-Za-z0-9]+/).filter(Boolean));
    const hardcoded = fragments.filter((tokens) => !tokens.every((token) => allowed.has(token)));
    assert.deepEqual(hardcoded, [], '本件出现了硬编码整页字面量：' + JSON.stringify(hardcoded));
    assert.ok(!source.includes('TODAY_SHELL'), '旧的硬编码基线常量 TODAY_SHELL 必须已删除');
  });
});

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
  it('不给 printable／给假：产物逐字同基线（dc16ba1^ 的真产物）', () => {
    const bare = baselineShell('标题＋正文');
    assert.equal(renderPageShell({ title: 'T', content: 'C' }), bare, '新参数缺省必须零变');
    assert.equal(renderPageShell({ title: 'T', content: 'C', printable: false }), bare, 'printable: false 必须零变');
    assert.equal(renderPageShell({ title: 'T', content: 'C', printable: false }),
      baselineShell('printable 给假'), '给假必须逐字同基线');
    assert.ok(!renderPageShell({ title: 'T', content: 'C' }).includes('ilife-page-printable'), '缺省不得出打印类');
  });

  it('三件套（eyebrow／subtitle）也不给 printable 时逐字同基线', () => {
    assert.equal(renderPageShell({ title: 'T', content: 'C', eyebrow: 'E', subtitle: 'S' }),
      baselineShell('三件套'), '三件套缺省必须零变');
  });

  it('受信正文与转义标题走基线同形（正文不转义、标题转义）', () => {
    assert.equal(renderPageShell({ title: '<b>&', content: '<i>x</i>', subtitle: '"q"' }),
      baselineShell('受信正文＋转义标题'), '转义面必须逐字同基线');
  });

  it('printable: true：版面根加 ilife-page-printable，其余三件套不变', () => {
    const html = renderPageShell({ title: 'T', content: 'C', printable: true });
    const bare = baselineShell('标题＋正文');
    assert.ok(html.includes('ilife-page-printable'), '缺打印类：' + html);
    assert.ok(/^<section class="[^"]*\bilife-page-printable\b[^"]*">/.test(html), '打印类必须落在版面根：' + html.slice(0, 80));
    assert.ok(html.includes('ilife-block-page-shell-title">T<'), '标题件不变');
    assert.equal(html.replace(' ilife-page-printable', ''), bare, '除打印类外逐字同基线');
  });
});

describe('#420 blocksCss 打印段（作用域纪律，按 #428 硬化）', () => {
  const printRules = () => rules(printSection(blocksCss())).filter((rule) => !rule.prelude.startsWith('@'));
  const scopedRules = () => printRules()
    .filter((rule) => splitSelectors(rule.prelude).every((sel) => SCOPED_SELECTOR.test(sel)));

  it('含 @media print 与具名 @page，且隐藏页内导航与复制区', () => {
    const css = blocksCss();
    const section = printSection(css);
    assert.ok(section.startsWith('@media print'), '缺 @media print：' + css.slice(0, 40));
    assert.ok(section.includes('@page printable'), '缺具名页规则（@page printable）');
    assert.ok(new RegExp('\\.' + CLASS + '\\s+\\{[^}]*page:\\s*printable').test(section), '打印页名必须由 .ilife-page-printable 绑定');
    assert.ok(new RegExp('\\.' + CLASS + '\\s+\\.ilife-block-toc\\s*\\{[^}]*display:\\s*none').test(section), '打印时必须隐藏页内导航');
    assert.ok(new RegExp('\\.' + CLASS + '\\s+\\.ilife-block-copy-block\\s*\\{[^}]*display:\\s*none').test(section), '打印时必须隐藏复制区');
  });

  it('不得出现裸 @page（全局规则会让全部页面吃这 12mm 页边距）', () => {
    const css = blocksCss();
    assert.ok(!/@page\s*\{/.test(css), '裸 @page 是全局规则，不得出现');
    assert.ok(!/@page\s*:\s*/.test(css), '@page 不得带伪类选择器（全局面）');
    assert.equal([...css.matchAll(/@page\b/g)].length, 1, '全表 @page 只许一处');
    assert.equal(pageName('@page printable {'), 'printable', '页名解析器自检');
    assert.equal(pageName('@page {'), '', '裸 @page 的页名必须是空串');
  });

  it('打印段每条规则的选择器**按 `,` 拆开后逐项**都在 .ilife-page-printable 作用域下', () => {
    const list = printRules();
    assert.ok(list.length >= 3, '打印段规则异常偏少：' + list.length);
    const bad = [];
    for (const rule of list) {
      for (const sel of splitSelectors(rule.prelude)) {
        if (!SCOPED_SELECTOR.test(sel)) bad.push(sel);
        if (/:is\(|:where\(|:not\(|:has\(/.test(sel)) bad.push('伪类透传：' + sel);
      }
    }
    assert.deepEqual(bad, [], '闭集外（未加打印作用域）的选择器：' + JSON.stringify(bad));
    assert.equal(splitSelectors('.' + CLASS + ', .ilife-page').length, 2, '拆选择器自检：逗号必须拆开');
  });

  it('打印段的 at-rule 只允许具名页 @page printable（裸 @page 与嵌套 at-rule 皆 0 处）', () => {
    const section = printSection(blocksCss());
    const atRules = rules(section).filter((rule) => rule.prelude.startsWith('@'));
    assert.ok(atRules.length >= 1, '打印段缺 @page（页边距无处承载）');
    const names = [];
    for (const rule of atRules) {
      const name = pageName(rule.prelude);
      names.push(name);
      assert.equal(rule.prelude.trim().replace(/\{$/, '').split(/\s+/)[0], '@page', '打印段只允许 @page：' + rule.prelude);
      assert.equal(name, 'printable', '必须是具名页 @page printable：' + JSON.stringify(rule.prelude));
    }
    assert.deepEqual(names, ['printable'], '打印段 @page 只许恰一条具名页');
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
