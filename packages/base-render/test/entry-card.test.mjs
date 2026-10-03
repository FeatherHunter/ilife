// entry-card · 判据件（#1114「票据纸保真」点名的缺件之一：纸内明细卡）。
// 四类：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 判地几何逐条对账（含判据自证：改坏必红）。
// 判地＝`docs/skills/skill-bill/proto/query/w01-查今天-v2.1.html` 的内嵌 <style>；
// 期望值一律从组件自己的常量派生（`ENTRY_CARD_*`），不抄字面量：改了名字这里跟着红。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ENTRY_CARD_CLASS,
  ENTRY_CARD_IDX_BOX_PX,
  ENTRY_CARD_IDX_RADIUS_PX,
  ENTRY_CARD_MONO_STACK,
  ENTRY_CARD_PAY_RADIUS_PX,
  ENTRY_CARD_RADIUS_PX,
  ENTRY_CARD_SLOTS,
  ENTRY_CARD_TOUCH_PX,
  entryCardCss,
  entryCardSlot,
  normalizeEntryCard,
  renderEntryCard,
} from '../dist/components/entry-card/index.js';
import { SKIN_TOKEN_NAMES, TICKET_VALUES, skinCss, skinVar } from '../dist/components/skin/index.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { styleSources } from './_style-sources.mjs';

const NAME = 'entry-card';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const LF = String.fromCharCode(10);
/** 页作用域前缀（判据里写全选择器：样式段产出的选择器一律带它）。 */
const PAGE = '.ilife-page-ui .';
/** 槽类名（带 scope 的与裸的各一份：嵌套选择器里用的是后者）。 */
const S = (slot) => PAGE + entryCardSlot(slot);
const B = (slot) => '.' + entryCardSlot(slot);
const ROW = S('rows') + ' > ' + B('row');

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
/** 剥掉注释与字面量（零 DOM 那条判据用：字符串里写着 document. 不算）。 */
const stripLiterals = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '')
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\]|\\.)*"/g, '""');
const throwsBlocks = (fn) => {
  try { fn(); } catch (e) { return e.name === 'BlocksError'; }
  return false;
};
/** 产出 CSS 里的规则（选择器 → 声明块原文；注释先剥掉、空白收成一格）。 */
function rulesOf(css) {
  const out = new Map();
  for (const m of stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    out.set(m[1].trim(), m[2].replace(/\s+/g, ' ').trim());
  }
  return out;
}
/** 逐条对账：产出的每条规则 ＝ 判地那条的声明序列（顺序照判地，一个字不差）。返回违规串。 */
function geometryViolations(css, expected) {
  const rules = rulesOf(css);
  const out = [];
  for (const [sel, decls] of expected) {
    const body = rules.get(sel);
    if (body === undefined) { out.push('缺规则：' + sel); continue; }
    const got = body.split(';').map((d) => d.trim()).filter((d) => d !== '');
    if (got.join(' | ') !== decls.join(' | ')) {
      out.push(sel + ' 声明对不上：期望 ' + decls.join(' | ') + '；实际 ' + got.join(' | '));
    }
  }
  return out;
}
const filesIn = (top, name) => {
  const dir = join(PKG, top, 'components', name);
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(dir, e.name));
};
/** 剥掉 `var(…)`（含嵌套的兜底链）后的剩余 —— 兜底链里的色值是皮肤读法自带的，不算"手写字面"。
 *  这一手照抄 `组件样式纪律.test.mjs` ⑦ 的剥壳器（那条判据判的正是"颜色字面量只许住在兜底链里"）。 */
function stripVarFns(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    if (css.startsWith('var(', i)) {
      let depth = 0;
      let j = i + 3;
      for (; j < css.length; j += 1) {
        if (css[j] === '(') depth += 1;
        else if (css[j] === ')') { depth -= 1; if (depth === 0) break; }
      }
      i = j + 1;
      continue;
    }
    out += css[i];
    i += 1;
  }
  return out;
}
/** 产出 CSS 里**裸写**的颜色字面（授权照抄的那几颗是允许的，别处一颗都不许有）。 */
const hexesOf = (css) => [...new Set([...stripVarFns(stripComments(css)).matchAll(/#[0-9a-fA-F]{3,8}\b/g)]
  .map((m) => m[0]))].sort();

/** 判地授权照抄的那 6 颗色（#1114 逐处授权；每一处的上一行必须压着那句注释）。 */
const AUTHORIZED_HEX = ['#fbf7ec', '#eee6d2', '#fff8ee', '#f0d9bd', '#f4efe2', '#8a857a'];
/** 判地那支等宽栈（原型 `--mono` 的取值；规格 §5 第 5 组「照原型抄」）。 */
const MONO_FROM_JUDGE = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

/* ── 判地几何（逐字来自 proto 的内嵌 <style>：只把选择器换成槽类、读法换成 skinVar） ── */

const CARD_RULES = new Map([
  [PAGE + ENTRY_CARD_CLASS, ['background: #fbf7ec', 'border: 1px solid ' + skinVar('line'),
    'border-radius: ' + skinVar('radius-card'), 'padding: 12px 13px 11px']],
  [S('rows'), ['list-style: none', 'margin: 0', 'padding: 0']],
  [ROW, ['display: flex', 'gap: 12px', 'align-items: flex-start', 'padding: 10px 0',
    'border-bottom: 1px dotted #eee6d2', 'font-size: 14px', 'min-height: ' + ENTRY_CARD_TOUCH_PX + 'px',
    'line-height: 1.55']],
  [ROW + ':last-child', ['border-bottom: none']],
  [ROW + B('pay'), ['background: #fff8ee', 'border: 1px solid #f0d9bd',
    'border-radius: ' + ENTRY_CARD_PAY_RADIUS_PX + 'px', 'padding: 10px 12px', 'margin: 8px 0']],
  [S('idx'), ['flex: 0 0 ' + ENTRY_CARD_IDX_BOX_PX + 'px', 'height: ' + ENTRY_CARD_IDX_BOX_PX + 'px',
    'margin-top: 1px', 'border-radius: ' + skinVar('radius-tag'), 'background: #f4efe2',
    'border: 1px solid ' + skinVar('line'), 'color: #8a857a', 'font-size: 12px', 'font-weight: 700',
    'display: inline-flex', 'align-items: center', 'justify-content: center']],
  [S('text'), ['flex: 1 1 auto', 'min-width: 0', 'overflow-wrap: anywhere']],
  [S('sub'), ['display: block', 'font-size: 12px', 'color: ' + skinVar('ink-2'), 'margin-top: 2px']],
  [S('sub') + ' > ' + B('mono'), ['font-family: ' + MONO_FROM_JUDGE]],
  [S('amt'), ['font-family: ' + MONO_FROM_JUDGE, 'font-variant-numeric: tabular-nums',
    'font-weight: 800', 'white-space: nowrap']],
  [S('rows') + ' ' + B('text'), ['min-width: 0', 'flex: 1 1 auto']],
  [S('rows') + ' ' + B('sub'), ['display: block', 'white-space: nowrap', 'overflow: hidden',
    'text-overflow: ellipsis']],
  [S('rows') + ' ' + B('amt'), ['white-space: nowrap', 'flex: none']],
]);

/* ── 入参 ─────────────────────────────────────────────────────────── */

/** 一份最小合法入参（非法分支都从它改一处）。 */
const OK = { entries: [{ title: '备注 · 午饭' }] };
/** 一条四位都给全的明细。 */
const FULL = {
  entries: [{
    index: 1, title: '备注 · 午饭', sub: '餐饮/外卖/午餐 · 微信',
    subMono: '2026-10-02 12:00:00', amount: '-35.00',
  }],
};
/** 注入串（每个文本字段都塞一遍）。 */
const EVIL = '<img src=x onerror=alert(1)>&"\'<>';

/* ── ① 渲染契约 ───────────────────────────────────────────────────── */

describe('entry-card ① 渲染契约', () => {
  it('一张卡 ＝ `<div>` 抱住 `<ol>`；一行 ＝ 编号胶囊 ＋ 正文（主行 ＋ 次行）＋ 金额', () => {
    assert.deepEqual([...ENTRY_CARD_SLOTS], ['rows', 'row', 'pay', 'idx', 'text', 'sub', 'mono', 'amt']);
    const html = renderEntryCard(FULL);
    assert.ok(html.startsWith('<div class="' + ENTRY_CARD_CLASS + '"><ol class="' + entryCardSlot('rows') + '">'),
      '根是卡 div ＋ 表 ol');
    assert.ok(html.endsWith('</ol></div>'));
    assert.ok(html.includes('<li class="' + entryCardSlot('row') + '">'));
    assert.ok(html.includes('<span class="' + entryCardSlot('idx') + '">1</span>'), '编号是真实元素');
    assert.ok(html.includes('<span class="' + entryCardSlot('text') + '">备注 · 午饭'
      + '<span class="' + entryCardSlot('sub') + '">餐饮/外卖/午餐 · 微信'
      + '<span class="' + entryCardSlot('mono') + '">2026-10-02 12:00:00</span></span></span>'),
      '次行住在正文那一格里，等宽片段再住进次行');
    assert.ok(html.includes('<span class="' + entryCardSlot('amt') + '">-35.00</span>'));
  });

  it('次行与金额不给就不出那一格；给了 `sub` 没给 `subMono` 也不留空片段', () => {
    const bare = renderEntryCard(OK);
    assert.equal(bare.includes(entryCardSlot('sub')), false, '不给次行就不出');
    assert.equal(bare.includes(entryCardSlot('mono')), false);
    assert.equal(bare.includes(entryCardSlot('amt')), false, '不给金额就不出');
    const textOnly = renderEntryCard({ entries: [{ title: 'x', sub: '只给文本' }] });
    assert.ok(textOnly.includes('<span class="' + entryCardSlot('sub') + '">只给文本</span>'));
    const monoOnly = renderEntryCard({ entries: [{ title: 'x', subMono: '12:00' }] });
    assert.ok(monoOnly.includes('<span class="' + entryCardSlot('sub') + '"><span class="'
      + entryCardSlot('mono') + '">12:00</span></span>'), '只给等宽片段时次行里就那一格');
  });

  it('编号：不给＝按位次 1..n；给了照抄（整数与字符串都收）', () => {
    const auto = renderEntryCard({ entries: [{ title: 'a' }, { title: 'b' }, { title: 'c' }] });
    const idx = [...auto.matchAll(new RegExp('<span class="' + entryCardSlot('idx') + '">([^<]*)</span>', 'g'))]
      .map((m) => m[1]);
    assert.deepEqual(idx, ['1', '2', '3'], '不给就按位次');
    const mixed = renderEntryCard({ entries: [{ title: 'a' }, { title: 'b', index: 7 }, { title: 'c' }] });
    assert.ok(mixed.includes('<span class="' + entryCardSlot('idx') + '">7</span>'), '显式编号照抄');
    assert.ok(mixed.includes('<span class="' + entryCardSlot('idx') + '">3</span>'), '按位次的不受显式那一条影响');
    assert.ok(renderEntryCard({ entries: [{ title: 'x', index: 'a-9' }] })
      .includes('<span class="' + entryCardSlot('idx') + '">a-9</span>'), '字符串编号照抄');
  });

  it('实付行：同一条 `-row` 上多一个 `-pay` 槽；不给就不挂', () => {
    const pay = renderEntryCard({ entries: [{ title: '实付', amount: '35.00', pay: true }] });
    assert.ok(pay.includes('<li class="' + entryCardSlot('row') + ' ' + entryCardSlot('pay') + '">'));
    const plain = renderEntryCard(OK);
    assert.equal(plain.includes(entryCardSlot('pay')), false, '不给 pay 就不该出现那一格');
    assert.equal(renderEntryCard({ entries: [{ title: 'x', pay: false }] }).includes(entryCardSlot('pay')), false);
  });

  it('转义面：编号／主行／次行／等宽片段／金额逐位转义', () => {
    const html = renderEntryCard({ entries: [{
      index: EVIL, title: EVIL, sub: EVIL, subMono: EVIL, amount: EVIL,
    }] });
    assert.equal(html.includes('<img'), false, '不得把注入的标签原样吐出来');
    assert.ok(html.includes('&lt;img'));
    assert.ok(html.includes('&quot;'));
    assert.ok(html.includes('&amp;'));
    assert.equal((html.match(/&lt;img/g) || []).length, 5, '五个文本位逐位都要过转义');
  });

  it('`subHtml` 是受信透传（不转义），但不许含会提前关掉外层标签的闭合标签', () => {
    const raw = '<b>餐饮</b> · <span class="mono">12:00</span>';
    assert.ok(renderEntryCard({ entries: [{ title: 'x', subHtml: raw }] })
      .includes('>' + raw + '</span>'), '透传那一格原样进');
    assert.equal(throwsBlocks(() => renderEntryCard({ entries: [{ title: 'x', subHtml: raw }] })), false,
      '判地次行里本来就嵌着一个 <span class="mono">：配平的那种是正当透传');
    for (const evil of ['</li>', '</ol>', '</div>', '</LI>']) {
      assert.equal(throwsBlocks(() => renderEntryCard({ entries: [{ title: 'x', subHtml: 'a' + evil + 'b' }] })),
        true, evil + ' 会把外层标签提前关掉，必须拒');
    }
  });

  it('全部非法入参分支 ⇒ BlocksError（缺省即抛，不静默返空）', () => {
    const sparse = Object.assign([{ title: 'a' }], { length: 2 });
    const bad = [undefined, null, [], 'entry', 1,
      {}, { entries: undefined }, { entries: [] }, { entries: 'ab' }, { entries: 1 },
      { entries: [null] }, { entries: [undefined] }, { entries: ['x'] }, { entries: [{}] },
      { entries: [{ title: '' }] }, { entries: [{ title: 1 }] },
      { entries: [{ title: 'x' }], nope: 1 }, { nope: 1 }, { onclick: 'x' },
      { entries: [{ title: 'x', nope: 1 }] }, { entries: [{ title: 'x', onclick: 'x' }] },
      { entries: [{ title: 'x', index: 0 }] }, { entries: [{ title: 'x', index: -1 }] },
      { entries: [{ title: 'x', index: 1.5 }] }, { entries: [{ title: 'x', index: '' }] },
      { entries: [{ title: 'x', index: true }] },
      { entries: [{ title: 'x', pay: 'yes' }] }, { entries: [{ title: 'x', pay: 1 }] },
      { entries: [{ title: 'x', sub: 2 }] }, { entries: [{ title: 'x', subMono: 3 }] },
      { entries: [{ title: 'x', subHtml: 4 }] }, { entries: [{ title: 'x', amount: 5 }] },
      { entries: [{ title: 'x', sub: 'a', subHtml: '<b>b</b>' }] },
      { entries: [{ title: 'x', subMono: 'a', subHtml: '<b>b</b>' }] },
      { entries: sparse }];
    for (const one of bad) assert.equal(throwsBlocks(() => renderEntryCard(one)), true, String(JSON.stringify(one)));
    assert.equal(throwsBlocks(() => renderEntryCard(OK)), false, '最小合法入参要过');
    assert.equal(throwsBlocks(() => renderEntryCard({ entries: [{ title: 'x', subHtml: '<b>a</b>' }] })), false);
  });

  it('归一化出口：编号补齐、`pay` 补 false、没给的三格是 undefined', () => {
    const m = normalizeEntryCard(OK);
    assert.equal(m.entries.length, 1);
    assert.equal(m.entries[0].index, '1', '不给编号＝按位次');
    assert.equal(m.entries[0].pay, false);
    assert.equal(m.entries[0].sub, undefined);
    assert.equal(m.entries[0].subMono, undefined);
    assert.equal(m.entries[0].subHtml, undefined);
    assert.equal(m.entries[0].amount, undefined);
    assert.deepEqual(normalizeEntryCard({ entries: [{ title: 'a' }, { title: 'b' }] }).entries.map((e) => e.index),
      ['1', '2']);
  });
});

/* ── ② 样式与零 DOM 纪律 ─────────────────────────────────────────── */

describe('entry-card ② 样式与零 DOM 纪律', () => {
  it('样式段非空；每条规则都 scope 在 `.ilife-page-ui` 之下、且只出现一次（拼两遍＝死规则）', () => {
    const css = entryCardCss();
    assert.ok(stripComments(css).trim() !== '');
    const rules = rulesOf(css);
    assert.ok(rules.size > 0);
    for (const sel of rules.keys()) {
      assert.ok(sel.includes('.ilife-page-ui'), '没 scope：' + sel);
      assert.equal((sel.match(/\.ilife-page-ui/g) || []).length, 1, 'scope 拼了两遍：' + sel);
    }
  });

  it('零 `:root` ／零 `!important` ／零视口宽度查询；`--ilife-*` 全在名单里、冻结 token 一个不重定义', () => {
    const code = stripComments(entryCardCss());
    assert.equal(code.includes(':root'), false);
    assert.equal(code.includes('!important'), false);
    assert.equal(/@media[^{]*(?:max|min)-width/.test(code), false, '件宽 ≠ 视口宽，宽度只许容器判');
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => '--ilife-' + k));
    const unknown = [...new Set([...code.matchAll(/--ilife-[a-z0-9-]+/g)].map((m) => m[0]))].filter((n) => !known.has(n));
    assert.deepEqual(unknown, [], '名单外的 token 名（会被静默兜底）：' + unknown.join('、'));
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(code.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('皮肤只经 `skinVar()` 读：产物里每处 `var(--ilife-…)` 都在名单里、且都带兜底链', () => {
    const code = stripComments(entryCardCss());
    const names = [...new Set([...code.matchAll(/var\(--ilife-([a-z0-9-]+)/g)].map((m) => m[1]))].sort();
    assert.deepEqual(names, ['ink-2', 'line', 'radius-card', 'radius-tag'],
      '本件读的就是这四支（边线 ＋ 次行字色 ＋ 卡底圆角 ＋ 编号胶囊圆角；后两支 #1113 起从\n       「授权照抄」字面改成皮肤读法）');
    for (const n of names) {
      assert.ok(SKIN_TOKEN_NAMES.includes(n), '名单外的 token：' + n);
      assert.equal(code.includes('var(--ilife-' + n + ')'), false, '没兜底链（老页面里读不出来）：' + n);
    }
    console.log('读数：皮肤读法 ' + names.map((n) => 'skinVar(\'' + n + '\')').join(' ／ ') + '，逐处带兜底链');
  });

  it('源码级：样式来源不写手写的 `var(--ilife-…)`（一律 skinVar）', () => {
    const sources = styleSources(NAME);
    assert.equal(sources.length, 1, '本件只有一份样式来源');
    for (const { file, src } of sources) {
      const code = stripLiterals(src);
      assert.equal([...code.matchAll(/var\(\s*--ilife-/g)].length, 0, file + ' 里手写了 var(--ilife-…)');
      assert.ok(code.includes('skinVar('), file + ' 要经 skinVar 读皮肤');
    }
  });

  it('零 DOM：源码与产物剥掉注释／字面量后都不出现 document. ／ window. ／ navigator.，且没有运行时段', () => {
    const dist = filesIn('dist', NAME);
    assert.equal(dist.some((f) => f.endsWith('runtime.js')), false, '本件不该有运行时段');
    for (const f of filesIn('src', NAME).concat(dist)) {
      const code = stripLiterals(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(/.*(src|dist)/, '$1') + ' 里出现了 ' + needle);
      }
    }
  });

  it('编号是真实元素，不是 CSS counter（样式段里出现 counter／content 就该红）', () => {
    const code = stripComments(entryCardCss());
    assert.equal(/counter\s*\(/.test(code), false, '编号不许走 CSS counter');
    assert.equal(/(?:^|[;{\s])content\s*:/.test(code), false, '样式段不产内容（编号不许拿伪元素顶）');
    assert.ok(renderEntryCard(FULL).includes('<span class="' + entryCardSlot('idx') + '">1</span>'), '编号那一格里有字');
  });

  it('槽位助手是唯一拼法：前缀透传（闭集外的槽名在类型上就写不出来）', () => {
    assert.equal(entryCardSlot('idx'), 'ilife-block-entry-card-idx');
    assert.equal(entryCardSlot('idx', 'x-'), 'x-block-entry-card-idx');
    assert.equal(ENTRY_CARD_CLASS, 'ilife-block-entry-card');
  });
});

/* ── ③ 加法式 ─────────────────────────────────────────────────────── */

describe('entry-card ③ 加法式', () => {
  it('同一份入参两次渲染逐字节相同；标记不带皮肤类、不带脚本与内联事件', () => {
    assert.equal(renderEntryCard(FULL), renderEntryCard(FULL));
    for (const html of [renderEntryCard(FULL), renderEntryCard(OK)]) {
      assert.equal(/<script/i.test(html), false, '标记里带脚本');
      assert.equal(/\son[a-z]+=/i.test(html), false, '标记里带内联事件');
      assert.equal(html.includes('ilife-skin-'), false, '标记自带皮肤类（换皮要机械地不换结构）');
    }
  });

  it('调本件样式函数不动别处产物（`skinCss()` 逐字节不变）', () => {
    const before = skinCss();
    entryCardCss();
    assert.equal(skinCss(), before);
  });

  it('前缀透传：`{prefix}` 换掉 scope 与槽类名两头，规则条数不变', () => {
    const base = rulesOf(entryCardCss());
    const other = entryCardCss({ prefix: 'x-' });
    assert.equal(rulesOf(other).size, base.size);
    for (const sel of rulesOf(other).keys()) assert.ok(sel.startsWith('.x-page-ui '), '没换前缀：' + sel);
    assert.ok(other.includes('x-block-entry-card-sub'));
    assert.ok(other.includes('.x-page-ui .x-block-entry-card {'), '卡根那一格也要换前缀');
  });
});

/* ── ④ 判地几何（逐条对账 ＋ 授权字面记账 ＋ 判据自证） ────────────── */

describe('entry-card ④ 判地几何', () => {
  it('每条规则 ＝ 判地那条的声明序列（顺序照判地，一个字不差）', () => {
    assert.deepEqual(geometryViolations(entryCardCss(), CARD_RULES), []);
  });

  it('授权字面恰好那 6 颗色，且每一处的上一行都压着「判地字面 · 授权照抄」那句话', () => {
    const css = entryCardCss();
    assert.deepEqual(hexesOf(css), [...AUTHORIZED_HEX].sort(),
      '出现了授权之外的裸色值（皮肤兜底链里那些不算：它们住在 var(…) 里）');
    const lines = css.split(LF);
    const bad = [];
    let hits = 0;
    lines.forEach((line, i) => {
      const text = line.trim();
      if (text.startsWith('/*')) return; // 注释行自己也写值，不算一处字面
      if (!AUTHORIZED_HEX.some((hex) => new RegExp('(^|[^0-9a-zA-Z])' + hex + '\\b').test(stripVarFns(line)))) return;
      hits += 1;
      if (!/判地字面 · 授权照抄：/.test(lines[i - 1] === undefined ? '' : lines[i - 1])) {
        bad.push('第 ' + String(i + 1) + ' 行：' + text);
      }
    });
    assert.deepEqual(bad, [], '这些字面上头没有授权那句话：\n  ' + bad.join('\n  '));
    assert.equal(hits, AUTHORIZED_HEX.length, '一处授权字面被多写或少写（逐处记账）：' + String(hits));
    console.log('读数：授权照抄的字面 ' + String(hits) + ' 处（' + AUTHORIZED_HEX.join('、') + '），逐处上头都有授权那句话');
  });

  it('圆角只有判地那三档（12 ／ 10 ／ 7），没有第四个数', () => {
    const css = stripComments(entryCardCss());
    const radii = [...css.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim());
    /* #1113：卡底与编号胶囊两档改读皮肤号（`radius-card`／`radius-tag`），实付行仍是"授权照抄"字面；
       三处的**判定值**仍是判地那三档——判地值由下面那条向皮肤取值表对账。 */
    assert.deepEqual(radii, [skinVar('radius-card'), ENTRY_CARD_PAY_RADIUS_PX + 'px', skinVar('radius-tag')],
      '圆角三处：卡底 ／ 实付行 ／ 编号胶囊');
    console.log('读数：圆角三处 —— ' + radii.join(' ／ '));
  });

  it('#1113：`radius-card`／`radius-tag` 的票据纸取值与判地逐字节同（12px／7px），兜底尾巴也是它们', () => {
    assert.equal(TICKET_VALUES['radius-card'], ENTRY_CARD_RADIUS_PX + 'px',
      '票据纸的 radius-card 必须＝判地 `.entry-card{border-radius:12px}`');
    assert.equal(TICKET_VALUES['radius-tag'], ENTRY_CARD_IDX_RADIUS_PX + 'px',
      '票据纸的 radius-tag 必须＝判地 `.idx{border-radius:7px}`');
    /* 不挂皮肤的页读的是兜底尾巴：它必须与原「授权照抄」字面同值（加法式）。 */
    assert.equal(skinVar('radius-card'), 'var(--ilife-radius-card, ' + ENTRY_CARD_RADIUS_PX + 'px)',
      'radius-card 的兜底尾巴走样：不挂皮肤的页会跟着变');
    assert.equal(skinVar('radius-tag'), 'var(--ilife-radius-tag, ' + ENTRY_CARD_IDX_RADIUS_PX + 'px)',
      'radius-tag 的兜底尾巴走样');
    console.log('读数：radius-card＝' + TICKET_VALUES['radius-card'] + '、radius-tag＝' + TICKET_VALUES['radius-tag']
      + '（两号的兜底尾巴分别是 ' + ENTRY_CARD_RADIUS_PX + 'px／' + ENTRY_CARD_IDX_RADIUS_PX + 'px）');
  });

  it('等宽那一支按判地照抄：`.amt` 与次行的时间戳走同一支栈', () => {
    const rules = rulesOf(entryCardCss());
    assert.equal(rules.get(S('amt')).includes('font-family: ' + MONO_FROM_JUDGE), true);
    assert.equal(rules.get(S('sub') + ' > ' + B('mono')), 'font-family: ' + MONO_FROM_JUDGE + ';');
    assert.equal(ENTRY_CARD_MONO_STACK, MONO_FROM_JUDGE, '照抄的栈与判地那支逐字相等');
    assert.ok(rules.get(S('amt')).includes('font-variant-numeric: tabular-nums'), '金额位数字对齐');
  });

  it('判据自证：卡底 #fbf7ec 改成 #fffdf7 ⇒ 必红；行间点线去掉 ⇒ 必红；还原 ⇒ 必绿', () => {
    const css = entryCardCss();
    assert.deepEqual(geometryViolations(css, CARD_RULES), [], '判据前件：原样必须绿');
    const bgBroken = css.replace('background: #fbf7ec;', 'background: #fffdf7;');
    const lineBroken = css.replace('  border-bottom: 1px dotted #eee6d2;' + LF, '');
    assert.notEqual(bgBroken, css, '变异没落上（卡底那一行没找到）');
    assert.notEqual(lineBroken, css, '变异没落上（行间点线那一行没找到）');
    const a = geometryViolations(bgBroken, CARD_RULES);
    const b = geometryViolations(lineBroken, CARD_RULES);
    console.log('读数：变异前 —— 违规 0 条（逐条对上判地）');
    console.log('读数：变异后 —— ' + (a[0] === undefined ? '（没抓到！）' : a[0]) + ' ／ '
      + (b[0] === undefined ? '（没抓到！）' : b[0]));
    assert.notEqual(a.length, 0, '判据空转：把卡底 #fbf7ec 改成 #fffdf7 都不红');
    assert.notEqual(b.length, 0, '判据空转：把行间点线去掉都不红');
    assert.deepEqual(geometryViolations(css, CARD_RULES), [], '还原后必须绿（变异没落盘）');
    assert.deepEqual(geometryViolations(entryCardCss(), CARD_RULES), []);
  });
});
