// say-form · 判据件（#1114「票据纸保真」点名的两件缺件：`say-field` ／ `say-opt`）。
// 四类：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 判地几何逐条对账（含判据自证：改坏必红）。
// 判地＝`docs/skills/skill-bill/proto/say-collect/x01-记支出-采集-v2.3.html` 的内嵌 <style>；
// 期望值一律从组件自己的常量派生（`SAY_FIELD_*` ／ `SAY_OPT_*`），不抄字面量：改了名字这里跟着红。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SAY_FIELD_CLASS,
  SAY_FIELD_CONTROLS,
  SAY_FIELD_CONTROL_RADIUS_PX,
  SAY_FIELD_INPUT_TYPES,
  SAY_FIELD_LABEL_MIN_WIDTH_PX,
  SAY_FIELD_RADIUS_PX,
  SAY_FIELD_SLOTS,
  SAY_FIELD_TOUCH_PX,
  normalizeSayField,
  renderSayField,
  sayFieldCss,
  sayFieldSlot,
} from '../dist/components/say-field/index.js';
import {
  SAY_OPT_CLASS,
  SAY_OPT_GUTTER_X_PX,
  SAY_OPT_RADIUS_PX,
  SAY_OPT_SLOTS,
  SAY_OPT_TEXT,
  SAY_OPT_TOUCH_PX,
  normalizeSayOpt,
  renderSayOpt,
  sayOptCss,
  sayOptSlot,
} from '../dist/components/say-opt/index.js';
import { SKIN_TOKEN_NAMES, skinCss, skinVar } from '../dist/components/skin/index.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { styleSources } from './_style-sources.mjs';

const NAME_FIELD = 'say-field';
const NAME_OPT = 'say-opt';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const LF = String.fromCharCode(10);
/** 页作用域前缀（判据里写全选择器：样式段产出的选择器一律带它）。 */
const PAGE = '.ilife-page-ui .';

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

/** 判地授权照抄的那几颗色（#1114 逐处授权；每一处的上一行必须压着那句注释）。 */
const AUTHORIZED_HEX = ['#fbf7ec', '#ddd0b6', '#fff', '#f4efe2', '#a39c8e', '#fdfaf3'];

/* ── 判地几何（逐字来自 proto 的内嵌 <style>：只把选择器换成槽类、读法换成 skinVar） ── */

const FIELD_RULES = new Map([
  [PAGE + sayFieldSlot('form'), ['display: flex', 'flex-direction: column', 'gap: 10px', 'margin: 0 0 10px']],
  [PAGE + SAY_FIELD_CLASS, ['display: flex', 'flex-wrap: wrap', 'align-items: center', 'gap: 10px',
    'min-height: ' + SAY_FIELD_TOUCH_PX + 'px', 'background: #fbf7ec', 'border: 1px solid ' + skinVar('line'),
    'border-radius: ' + SAY_FIELD_RADIUS_PX + 'px', 'padding: 8px 12px', 'font-size: 14px']],
  [PAGE + sayFieldSlot('lbl'), ['flex: none', 'min-width: ' + SAY_FIELD_LABEL_MIN_WIDTH_PX + 'px',
    'color: ' + skinVar('ink-2'), 'font-weight: 700', 'white-space: nowrap']],
  [PAGE + sayFieldSlot('req'), ['color: ' + skinVar('danger'), 'font-style: normal', 'font-weight: 900']],
  [PAGE + sayFieldSlot('ctl'), ['flex: 1 1 0', 'min-width: 0', 'min-height: ' + SAY_FIELD_TOUCH_PX + 'px',
    'border: 1.5px solid #ddd0b6', 'border-radius: ' + SAY_FIELD_CONTROL_RADIUS_PX + 'px', 'background: #fff',
    'color: ' + skinVar('ink'), 'font-size: 15px', 'font-weight: 700', 'padding: 8px 10px',
    'font-family: ' + skinVar('font')]],
  [PAGE + sayFieldSlot('ctl') + ':focus', ['outline: 2px solid ' + skinVar('accent'), 'outline-offset: 1px',
    'border-color: ' + skinVar('accent')]],
  [PAGE + sayFieldSlot('ctl') + '.is-bad', ['border-color: ' + skinVar('danger'),
    'outline: 2px solid ' + skinVar('danger')]],
  [PAGE + sayFieldSlot('ctl') + ':disabled', ['background: #f4efe2', 'color: #a39c8e']],
  [PAGE + sayFieldSlot('hint'), ['flex: 1 1 100%', 'color: ' + skinVar('ink-3'), 'font-size: 12px',
    'line-height: 1.6', 'overflow-wrap: anywhere']],
]);

const OPT_RULES = new Map([
  [PAGE + SAY_OPT_CLASS, ['margin: 10px 0 0', 'border: 1px dashed #ddd0b6',
    'border-radius: ' + SAY_OPT_RADIUS_PX + 'px', 'background: #fdfaf3', 'overflow: hidden']],
  [PAGE + SAY_OPT_CLASS + ' > summary', ['list-style: none', 'cursor: pointer', 'display: flex',
    'align-items: center', 'gap: 8px', 'min-height: ' + SAY_OPT_TOUCH_PX + 'px',
    'padding: 10px ' + SAY_OPT_GUTTER_X_PX + 'px', 'font-size: 13px', 'font-weight: 700',
    'color: ' + skinVar('ink-2')]],
  [PAGE + SAY_OPT_CLASS + ' > summary::-webkit-details-marker', ['display: none']],
  [PAGE + sayOptSlot('lbl'), ['flex: none', 'white-space: nowrap']],
  [PAGE + sayOptSlot('plus'), ['flex: none', 'color: ' + skinVar('accent'), 'font-weight: 900',
    'font-size: 15px', 'line-height: 1']],
  [PAGE + sayOptSlot('sub'), ['flex: 1 1 auto', 'min-width: 0', 'font-weight: 400',
    'color: ' + skinVar('ink-3'), 'font-size: 12px', 'overflow-wrap: anywhere']],
  [PAGE + sayOptSlot('cnt'), ['flex: none', 'font-size: 12px', 'color: ' + skinVar('accent'),
    'font-weight: 800', 'white-space: nowrap']],
  [PAGE + SAY_OPT_CLASS + '[open] > summary', ['border-bottom: 1px dashed #ddd0b6', 'background: #fbf7ec']],
  [PAGE + sayOptSlot('form'), ['display: flex', 'flex-direction: column', 'gap: 10px',
    'margin: 10px ' + SAY_OPT_GUTTER_X_PX + 'px 0']],
  [PAGE + sayOptSlot('note'), ['margin: 6px ' + SAY_OPT_GUTTER_X_PX + 'px 12px', 'font-size: 12px',
    'line-height: 1.6', 'color: ' + skinVar('ink-3')]],
]);

/* ── 入参 ─────────────────────────────────────────────────────────── */

/** 一份最小合法入参（非法分支都从它改一处）。 */
const FIELD_OK = { label: '金额', control: 'input', name: 'amt' };
/** `select` 那一支（占位项就是 `value: ''` 那一条 —— 判地上它的初值也正是空串）。 */
const FIELD_SELECT = {
  label: '分类', required: true, control: 'select', name: 'cat', value: '',
  options: [{ value: '', label: '请选择分类' }, { value: '餐饮', label: '餐饮' }],
};
const OPT_OK = { label: '补充选填项', contentHtml: '<label class="x">备注(选填)</label>' };
const OPT_FULL = { ...OPT_OK, sub: '备注／时间／账户', countText: '已补 2 项', note: '不填就留空：助手照默认走。' };
/** 注入串（每个文本字段都塞一遍）。 */
const EVIL = '<img src=x onerror=alert(1)>&"\'<>';

/* ── ① 渲染契约 ───────────────────────────────────────────────────── */

describe('say-form ① 渲染契约 · say-field', () => {
  it('一格 ＝ `<label>` 抱住字段名 ＋ 输入件；必填那枚星只在 `required` 时出', () => {
    assert.deepEqual([...SAY_FIELD_CONTROLS], ['input', 'select']);
    assert.deepEqual([...SAY_FIELD_SLOTS], ['form', 'lbl', 'req', 'ctl', 'hint']);
    const html = renderSayField({ ...FIELD_OK, required: true, value: '12.5' });
    assert.ok(html.startsWith('<label class="' + SAY_FIELD_CLASS + '">'), '根是 label');
    assert.ok(html.includes('<span class="' + sayFieldSlot('lbl') + '">金额 <i class="' + sayFieldSlot('req')
      + '">*</i></span>'), '字段名后面是那枚星（中间一个空格）');
    assert.ok(html.includes('<input class="' + sayFieldSlot('ctl')
      + '" type="text" value="12.5" name="amt" aria-label="金额">'), '输入件的属性一条不差');
    assert.ok(html.endsWith('</label>'));
    const plain = renderSayField(FIELD_OK);
    assert.equal(plain.includes(sayFieldSlot('req')), false, '没 required 就不出星');
    assert.ok(plain.includes('>金额</span>'), '没星时字段名后面不留空格');
  });

  it('`select` 那一支：候选逐条出、`value` 命中的那条带 `selected`（占位项的空串也算命中）', () => {
    const html = renderSayField(FIELD_SELECT);
    assert.ok(html.includes('<select class="' + sayFieldSlot('ctl') + '" name="cat" aria-label="分类">'));
    assert.ok(html.includes('<option value="" selected>请选择分类</option>'), '空串＝给了：占位项选中');
    assert.ok(html.includes('<option value="餐饮">餐饮</option>'), '没命中的候选不带 selected');
    assert.equal(html.includes('<input'), false, 'select 那一支不出 input');
  });

  it('禁用／填错／提示行三个状态各上各的钩子；`inputType` 照抄进 type', () => {
    const html = renderSayField({ ...FIELD_OK, disabled: true, bad: true, hint: '这一栏要重填', inputType: 'date' });
    assert.ok(html.includes('class="' + sayFieldSlot('ctl') + ' is-bad"'), 'bad 挂 is-bad（描边那一档）');
    assert.ok(html.includes('type="date" name="amt" disabled aria-label="金额"'), 'disabled 出属性 ＋ type 照抄');
    assert.ok(html.includes('<span class="' + sayFieldSlot('hint') + '">这一栏要重填</span>'));
    assert.equal(renderSayField(FIELD_OK).includes(sayFieldSlot('hint')), false, '不给 hint 就不出那一格');
    assert.deepEqual([...SAY_FIELD_INPUT_TYPES], ['text', 'number', 'date', 'time', 'tel', 'email', 'search']);
  });

  it('转义面：字段名／取值／件名／提示行／候选两列逐位转义', () => {
    const html = renderSayField({ label: EVIL, control: 'input', name: EVIL, value: EVIL, hint: EVIL });
    assert.equal(html.includes('<img'), false, '不得把注入的标签原样吐出来');
    assert.ok(html.includes('&lt;img'));
    assert.ok(html.includes('&quot;'));
    assert.ok(html.includes('&amp;'));
    const sel = renderSayField({ label: 'x', control: 'select', options: [{ value: EVIL, label: EVIL }] });
    assert.equal(sel.includes('<img'), false);
    assert.ok(sel.includes('&lt;img'));
  });

  it('全部非法入参分支 ⇒ BlocksError（缺省即抛，不静默返空）', () => {
    const sparse = Object.assign([{ value: 'a', label: '甲' }], { length: 2 });
    const bad = [undefined, null, [], 'say', 1,
      {}, { label: '' }, { label: '   ' }, { label: 1 },
      { label: 'x' },
      { label: 'x', control: 'textarea' },
      { label: 'x', control: 'input', nope: 1 },
      { label: 'x', control: 'input', onfocus: 'x' },
      { label: 'x', control: 'input', inputType: 'checkbox' },
      { label: 'x', control: 'input', inputType: 1 },
      { label: 'x', control: 'input', options: [{ value: 'a', label: '甲' }] },
      { label: 'x', control: 'input', required: 'yes' },
      { label: 'x', control: 'input', disabled: 1 },
      { label: 'x', control: 'input', bad: 'no' },
      { label: 'x', control: 'input', hint: 2 },
      { label: 'x', control: 'input', name: 3 },
      { label: 'x', control: 'input', value: 4 },
      { label: 'x', control: 'select' },
      { label: 'x', control: 'select', options: [] },
      { label: 'x', control: 'select', options: 'ab' },
      { label: 'x', control: 'select', options: [null] },
      { label: 'x', control: 'select', options: [{ value: 'a' }] },
      { label: 'x', control: 'select', options: [{ value: 'a', label: '' }] },
      { label: 'x', control: 'select', options: [{ value: 'a', label: '甲', mark: 'x' }] },
      { label: 'x', control: 'select', options: [{ value: 1, label: '甲' }] },
      { label: 'x', control: 'select', options: [{ value: 'a', label: '甲' }, { value: 'a', label: '乙' }] },
      { label: 'x', control: 'select', options: sparse },
      { label: 'x', control: 'select', options: [{ value: 'a', label: '甲' }], value: 'b' },
      { label: 'x', control: 'select', options: [{ value: 'a', label: '甲' }], inputType: 'text' }];
    for (const one of bad) assert.equal(throwsBlocks(() => renderSayField(one)), true, String(JSON.stringify(one)));
    assert.equal(throwsBlocks(() => renderSayField(FIELD_OK)), false, '最小合法入参要过');
    assert.equal(throwsBlocks(() => renderSayField({ ...FIELD_SELECT, value: '餐饮' })), false, '命中某条候选要过');
  });

  it('归一化出口：缺省值补齐、闭集外一律拒', () => {
    const m = normalizeSayField(FIELD_OK);
    assert.equal(m.control, 'input');
    assert.equal(m.inputType, 'text');
    assert.equal(m.required, false);
    assert.equal(m.disabled, false);
    assert.equal(m.bad, false);
    assert.deepEqual(m.options, []);
    assert.equal(m.value, undefined);
  });
});

describe('say-form ① 渲染契约 · say-opt', () => {
  it('一折 ＝ `<details>` ＋ 表头四格 ＋ 组内表单 ＋ 组尾提示行（顺序照判地）', () => {
    assert.deepEqual([...SAY_OPT_SLOTS], ['lbl', 'plus', 'sub', 'cnt', 'form', 'note']);
    const html = renderSayOpt(OPT_FULL);
    assert.ok(html.startsWith('<details class="' + SAY_OPT_CLASS + '">'));
    assert.ok(html.endsWith('</details>'));
    const head = '<summary><span class="' + sayOptSlot('plus') + '">' + SAY_OPT_TEXT.plus + '</span>'
      + '<span class="' + sayOptSlot('lbl') + '">补充选填项</span>'
      + '<span class="' + sayOptSlot('sub') + '">备注／时间／账户</span>'
      + '<span class="' + sayOptSlot('cnt') + '">已补 2 项</span></summary>';
    assert.ok(html.includes(head), '表头按判地那四格的顺序（＋ ／ 组名 ／ 副语 ／ 计数）');
    assert.ok(html.includes('<div class="' + sayOptSlot('form') + '">' + OPT_FULL.contentHtml + '</div>'),
      '组内表单原样住进 -form');
    assert.ok(html.includes('<p class="' + sayOptSlot('note') + '">不填就留空：助手照默认走。</p>'));
    assert.equal(SAY_OPT_TEXT.plus, '＋', '表头那一枚是全角加号（判地逐字）');
  });

  it('选填的三格不给就不出；`open` 出属性（展开／收起是原生行为，不接事件）', () => {
    const bare = renderSayOpt(OPT_OK);
    for (const slot of ['sub', 'cnt', 'note']) {
      assert.equal(bare.includes(sayOptSlot(slot)), false, slot + ' 不给就不该出那一格');
    }
    assert.ok(bare.includes('>' + SAY_OPT_TEXT.plus + '<'));
    assert.equal(bare.includes(' open>'), false, '缺省收起');
    assert.ok(renderSayOpt({ ...OPT_OK, open: true }).startsWith('<details class="' + SAY_OPT_CLASS + '" open>'));
  });

  it('`contentHtml` 是受信透传（不转义）；其余文本字段逐位转义', () => {
    const raw = '<b>甲</b>&';
    assert.ok(renderSayOpt({ ...OPT_OK, contentHtml: raw }).includes('>' + raw + '</div>'), '透传那一格原样进');
    const html = renderSayOpt({ ...OPT_OK, label: EVIL, sub: EVIL, countText: EVIL, note: EVIL });
    assert.equal(html.includes('<img'), false);
    assert.ok(html.includes('&lt;img'));
    assert.ok(html.includes('&amp;'));
  });

  it('透传也要挡一下：`contentHtml` 里混进 `</details>` ⇒ 拒（那一折会被提前关掉）', () => {
    assert.equal(throwsBlocks(() => renderSayOpt({ ...OPT_OK, contentHtml: '<div>x</div></details><p>y</p>' })), true);
    assert.equal(throwsBlocks(() => renderSayOpt({ ...OPT_OK, contentHtml: '</DETAILS>' })), true, '大小写不敏感');
    assert.equal(throwsBlocks(() => renderSayOpt({ ...OPT_OK, contentHtml: '<span>a</span>' })), false);
  });

  it('非法入参分支 ⇒ BlocksError', () => {
    const bad = [undefined, null, [], 'say', 1,
      {}, { label: 'x' }, { label: '', contentHtml: 'x' }, { label: 1, contentHtml: 'x' },
      { label: 'x', contentHtml: '' }, { label: 'x', contentHtml: 1 },
      { label: 'x', contentHtml: 'x', open: 'yes' }, { label: 'x', contentHtml: 'x', open: 1 },
      { label: 'x', contentHtml: 'x', sub: 2 }, { label: 'x', contentHtml: 'x', countText: 3 },
      { label: 'x', contentHtml: 'x', note: 4 }, { label: 'x', contentHtml: 'x', nope: 1 },
      { label: 'x', contentHtml: 'x', onclick: 'x' }];
    for (const one of bad) assert.equal(throwsBlocks(() => renderSayOpt(one)), true, String(JSON.stringify(one)));
  });

  it('归一化出口：缺省值补齐', () => {
    const m = normalizeSayOpt(OPT_OK);
    assert.equal(m.open, false);
    assert.equal(m.sub, undefined);
    assert.equal(m.countText, undefined);
    assert.equal(m.note, undefined);
    assert.equal(m.contentHtml, OPT_OK.contentHtml);
  });
});

/* ── ② 样式与零 DOM 纪律 ─────────────────────────────────────────── */

describe('say-form ② 样式与零 DOM 纪律', () => {
  it('样式段非空；每条规则都 scope 在 `.ilife-page-ui` 之下、且只出现一次（拼两遍＝死规则）', () => {
    for (const css of [sayFieldCss(), sayOptCss()]) {
      assert.ok(stripComments(css).trim() !== '');
      const rules = rulesOf(css);
      assert.ok(rules.size > 0);
      for (const sel of rules.keys()) {
        assert.ok(sel.includes('.ilife-page-ui'), '没 scope：' + sel);
        assert.equal((sel.match(/\.ilife-page-ui/g) || []).length, 1, 'scope 拼了两遍：' + sel);
      }
    }
  });

  it('零 `:root` ／零 `!important` ／零视口宽度查询；`--ilife-*` 全在名单里、冻结 token 一个不重定义', () => {
    for (const css of [sayFieldCss(), sayOptCss()]) {
      const code = stripComments(css);
      assert.equal(code.includes(':root'), false);
      assert.equal(code.includes('!important'), false);
      assert.equal(/@media[^{]*(?:max|min)-width/.test(code), false, '件宽 ≠ 视口宽，宽度只许容器判');
      const known = new Set(SKIN_TOKEN_NAMES.map((k) => '--ilife-' + k));
      const unknown = [...new Set([...code.matchAll(/--ilife-[a-z0-9-]+/g)].map((m) => m[0]))]
        .filter((n) => !known.has(n));
      assert.deepEqual(unknown, [], '名单外的 token 名（会被静默兜底）：' + unknown.join('、'));
      for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
        assert.equal(code.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
      }
    }
  });

  it('皮肤只经 `skinVar()` 读：产物里每处 `var(--ilife-…)` 都在名单里、且都带兜底链', () => {
    for (const css of [sayFieldCss(), sayOptCss()]) {
      const code = stripComments(css);
      const names = [...new Set([...code.matchAll(/var\(--ilife-([a-z0-9-]+)/g)].map((m) => m[1]))].sort();
      assert.ok(names.length > 0, '一处皮肤读法都没有 ⇒ 本件没在跟皮肤走');
      for (const n of names) {
        assert.ok(SKIN_TOKEN_NAMES.includes(n), '名单外的 token：' + n);
        assert.equal(code.includes('var(--ilife-' + n + ')'), false, '没兜底链（老页面里读不出来）：' + n);
      }
    }
  });

  it('源码级：两件的样式来源不写手写的 `var(--ilife-…)`（一律 skinVar）', () => {
    for (const name of [NAME_FIELD, NAME_OPT]) {
      for (const { file, src } of styleSources(name)) {
        const code = stripLiterals(src);
        assert.equal([...code.matchAll(/var\(\s*--ilife-/g)].length, 0, file + ' 里手写了 var(--ilife-…)');
        assert.ok(code.includes('skinVar('), file + ' 要经 skinVar 读皮肤');
      }
    }
  });

  it('零 DOM：两件的源码与产物剥掉注释／字面量后都不出现 document. ／ window. ／ navigator.，且都没有运行时段', () => {
    for (const name of [NAME_FIELD, NAME_OPT]) {
      const dist = filesIn('dist', name);
      assert.equal(dist.some((f) => f.endsWith('runtime.js')), false, name + ' 不该有运行时段');
      for (const f of filesIn('src', name).concat(dist)) {
        const code = stripLiterals(readFileSync(f, 'utf8'));
        for (const needle of ['document.', 'window.', 'navigator.']) {
          assert.equal(code.includes(needle), false, f.replace(/.*(src|dist)/, '$1') + ' 里出现了 ' + needle);
        }
      }
    }
  });

  it('槽位助手是唯一拼法：前缀透传（闭集外的槽名在类型上就写不出来）', () => {
    assert.equal(sayFieldSlot('ctl'), 'ilife-block-say-field-ctl');
    assert.equal(sayFieldSlot('ctl', 'x-'), 'x-block-say-field-ctl');
    assert.equal(sayOptSlot('note'), 'ilife-block-say-opt-note');
    assert.equal(sayOptSlot('note', 'x-'), 'x-block-say-opt-note');
  });
});

/* ── ③ 加法式 ─────────────────────────────────────────────────────── */

describe('say-form ③ 加法式', () => {
  it('同一份入参两次渲染逐字节相同；标记不带皮肤类、不带脚本与内联事件', () => {
    const a = renderSayField(FIELD_SELECT);
    const b = renderSayOpt(OPT_FULL);
    assert.equal(a, renderSayField(FIELD_SELECT));
    assert.equal(b, renderSayOpt(OPT_FULL));
    for (const html of [a, b, renderSayField(FIELD_OK), renderSayOpt(OPT_OK)]) {
      assert.equal(/<script/i.test(html), false, '标记里带脚本');
      assert.equal(/\son[a-z]+=/i.test(html), false, '标记里带内联事件');
      assert.equal(html.includes('ilife-skin-'), false, '标记自带皮肤类（换皮要机械地不换结构）');
    }
  });

  it('调本件样式函数不动别处产物（`skinCss()` 逐字节不变）', () => {
    const before = skinCss();
    sayFieldCss();
    sayOptCss();
    assert.equal(skinCss(), before);
  });

  it('前缀透传：`{prefix}` 换掉 scope 与槽类名两头，规则条数不变', () => {
    const base = rulesOf(sayFieldCss());
    const other = sayFieldCss({ prefix: 'x-' });
    assert.equal(rulesOf(other).size, base.size);
    for (const sel of rulesOf(other).keys()) assert.ok(sel.startsWith('.x-page-ui '), '没换前缀：' + sel);
    assert.ok(other.includes('x-block-say-field-lbl'));
    assert.ok(sayOptCss({ prefix: 'x-' }).includes('x-block-say-opt-note'));
  });
});

/* ── ④ 判地几何（逐条对账 ＋ 授权字面记账 ＋ 判据自证） ────────────── */

describe('say-form ④ 判地几何', () => {
  it('say-field：每条规则 ＝ 判地那条的声明序列（顺序照判地，一个字不差）', () => {
    assert.deepEqual(geometryViolations(sayFieldCss(), FIELD_RULES), []);
  });

  it('say-opt：每条规则 ＝ 判地那条的声明序列', () => {
    assert.deepEqual(geometryViolations(sayOptCss(), OPT_RULES), []);
  });

  it('授权字面恰好那 6 颗色，且每一处的上一行都压着「判地字面 · 授权照抄」那句话', () => {
    const both = sayFieldCss() + LF + sayOptCss();
    assert.deepEqual(hexesOf(both), [...AUTHORIZED_HEX].sort(),
      '出现了授权之外的裸色值（皮肤兜底链里那些不算：它们住在 var(…) 里）');
    const lines = both.split(LF);
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
    assert.ok(hits >= AUTHORIZED_HEX.length, '一处授权字面都没扫到 ⇒ 这条判据在空转：' + hits);
    console.log('读数：授权照抄的字面 ' + String(hits) + ' 处（' + AUTHORIZED_HEX.join('、') + '），逐处上头都有授权那句话');
  });

  it('圆角只许判地那两档（12 ／ 10）与皮肤读法，没有第三个数', () => {
    const css = stripComments(sayFieldCss() + LF + sayOptCss());
    const radii = [...css.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim());
    const ok = radii.filter((r) => r === SAY_FIELD_RADIUS_PX + 'px' || r === SAY_FIELD_CONTROL_RADIUS_PX + 'px'
      || r === SAY_OPT_RADIUS_PX + 'px' || r.startsWith('var(--ilife-radius'));
    assert.deepEqual(radii.filter((r) => !ok.includes(r)), [], '出现判地之外的圆角');
    assert.equal(radii.length, 3, '圆角应当只有三处（say-field 外框／输入件、say-opt 外框）：' + String(radii.length));
    console.log('读数：圆角三处 —— ' + radii.join(' ／ '));
  });

  it('判据自证：44px 改成 40px ⇒ 必红；say-opt 的 dashed 改成实线 ⇒ 必红；还原 ⇒ 必绿', () => {
    const field = sayFieldCss();
    const opt = sayOptCss();
    assert.deepEqual(geometryViolations(field, FIELD_RULES), [], '判据前件：原样必须绿');
    assert.deepEqual(geometryViolations(opt, OPT_RULES), [], '判据前件：原样必须绿');
    const touchBroken = field.replace('min-height: ' + SAY_FIELD_TOUCH_PX + 'px', 'min-height: 40px');
    const dashedBroken = opt.replace('1px dashed #ddd0b6', '1px solid #ddd0b6');
    const a = geometryViolations(touchBroken, FIELD_RULES);
    const b = geometryViolations(dashedBroken, OPT_RULES);
    console.log('读数：变异前 —— 违规 0 条（两件逐条对上判地）');
    console.log('读数：变异后 —— ' + (a[0] === undefined ? '（没抓到！）' : a[0]) + ' ／ '
      + (b[0] === undefined ? '（没抓到！）' : b[0]));
    assert.notEqual(a.length, 0, '判据空转：把 ' + SAY_FIELD_TOUCH_PX + 'px 改成 40px 都不红');
    assert.notEqual(b.length, 0, '判据空转：把 say-opt 的虚线边改成实线都不红');
    assert.deepEqual(geometryViolations(field, FIELD_RULES), [], '还原后必须绿（变异没落盘）');
    assert.deepEqual(geometryViolations(opt, OPT_RULES), [], '还原后必须绿（变异没落盘）');
  });
});
