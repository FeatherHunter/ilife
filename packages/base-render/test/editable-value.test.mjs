/** editableValue（组件层第一件）· 契约测试。
 *
 * 覆盖四组判据：
 *  ① **渲染契约**（纯函数）：形态／属性／单位／铅笔／三种形态档／禁用／显示字与机器值分离／**转义面**／
 *     入参违规一律 `bad-input`（不静默降级）；
 *  ② **样式与零 DOM 纪律**：CSS 只读冻结 token、无 `:root`／`!important`；`dist/**` 的**代码**零
 *     `document.`／`window.`／`navigator.`（剥字面量与注释后逐名扫，照 `test/blocks.test.mjs` 先例）；
 *  ③ **加法式**：`renderDocShell` 不启用该组件时产物不含它的样式／运行时，且两次渲染逐字节相同；
 *  ④ **真机（headless Chrome ＋ CDP）**：进出编辑**不变形**（列 x／行高逐值相等）＋ 提交／取消／失焦／
 *     select／必填拦截／重复注入只绑一次 —— 这些是版面与交互事实，静态文本查不出来。
 *  ⑤ **返修回归**（对抗式审查席的 P1／P2）：取消不得被重入成提交、退出后命中区必须回到可点（≥44×44）、
 *     无改动提交一个字节都不动、机器值编辑器承载不了就**拒开**、IME 组字回车不提交、step 容差按值域缩放 ——
 *     每一条都是「上一版真的错了」的回归，不是补覆盖率。
 *
 * 期望值一律从组件自己的常量派生（`EDIT_*`），不抄字面量：改了名字这里跟着红，不会两处走散。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildEditableValueJs, editableValueCss, renderEditableValue,
  EDIT_AFFORDANCE_ATTR, EDIT_EVENT_CANCEL, EDIT_EVENT_COMMIT, EDIT_HIT_ATTR, EDIT_KIND_ATTR,
  EDIT_NAME_ATTR, EDIT_OPTIONS_ATTR, EDIT_UNIT_ATTR, EDIT_VALUE_ATTR, EDIT_VALUE_CLASS,
  EDIT_VALUE_EDITOR_MAX_WIDTH_PX, EDIT_VALUE_MIN_HEIGHT_PX,
} from '../dist/components/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { CSS_VAR_TOKENS } from '../dist/index.js';
import { sleep, startEditablePage } from './editable-value-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('editableValue ① 渲染契约', () => {
  it('基本形态：类名根 ＋ 发现锚 ＋ 命中区 ＋ 值 ＋ 铅笔 ＋ aria-label', () => {
    const html = renderEditableValue({ name: 'heightCm', value: '177', unit: 'cm', label: '身高' });
    assert.ok(html.startsWith('<span class="' + EDIT_VALUE_CLASS), '根用类名根打头：' + html.slice(0, 80));
    assert.ok(html.includes(EDIT_NAME_ATTR + '="heightCm"'), '发现锚＝机器键');
    assert.ok(html.includes(EDIT_KIND_ATTR + '="text"'), '缺省 kind=text');
    assert.ok(html.includes(EDIT_VALUE_ATTR + '="177"'), '机器值落属性');
    assert.ok(html.includes(EDIT_HIT_ATTR + '=""'), '命中区标记');
    assert.ok(html.includes('aria-label="改身高"'), 'aria-label 取字段名');
    assert.ok(html.includes('>' + '177' + '<'), '值文本上屏');
    assert.ok(html.includes(EDIT_UNIT_ATTR + '="cm"') && html.includes('>cm<'), '单位独立成一位');
    assert.ok(html.includes(EDIT_VALUE_CLASS + '-pen'), '铅笔在');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('显示字与机器值分离（男／male、1,800／1800）', () => {
    const g = renderEditableValue({ name: 'gender', value: 'male', display: '男' });
    assert.ok(g.includes(EDIT_VALUE_ATTR + '="male"'), '机器值是 male');
    assert.ok(g.includes('>男<'), '显示字是 男');
    const n = renderEditableValue({ name: 'calorieGoal', value: '1800', display: '1,800' });
    assert.ok(n.includes('>1,800<') && n.includes(EDIT_VALUE_ATTR + '="1800"'), '千分位只影响显示');
  });

  it('select：候选项落 JSON 属性；机器值必须命中一项', () => {
    const html = renderEditableValue({
      name: 'activityLevel', value: '久坐', display: '久坐', kind: 'select', label: '活动量',
      options: ['久坐', '轻度活动', { value: 'very_active', label: '高度活跃' }],
    });
    assert.ok(html.includes(EDIT_KIND_ATTR + '="select"'), 'kind 上属性');
    const m = new RegExp(EDIT_OPTIONS_ATTR + '="([^"]*)"').exec(html);
    assert.ok(m !== null, 'options 落属性');
    const opts = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
    assert.deepEqual(opts, [
      { value: '久坐', label: '久坐' },
      { value: '轻度活动', label: '轻度活动' },
      { value: 'very_active', label: '高度活跃' },
    ], '字符串项＝机器值与显示字同值；对象项分离');
    assert.throws(() => renderEditableValue({ name: 'x', value: 'zzz', kind: 'select', options: ['a'] }), /不在 options 里/);
    assert.throws(() => renderEditableValue({ name: 'x', value: 'a', kind: 'select' }), /必须给 options/);
    assert.throws(() => renderEditableValue({ name: 'x', value: 'a', options: ['a'] }), /只对 kind=select 有效/);
    assert.throws(() => renderEditableValue({ name: 'x', value: 'a', kind: 'select', options: [] }), /非空数组/);
  });

  it('number：min／max／step 只对 number 有效，且逐条校验', () => {
    const ok = renderEditableValue({ name: 'age', value: '31', kind: 'number', min: 0, max: 120, step: 1 });
    assert.ok(ok.includes('data-ilife-edit-min="0"') && ok.includes('data-ilife-edit-max="120"') && ok.includes('data-ilife-edit-step="1"'), '三约束上属性');
    assert.throws(() => renderEditableValue({ name: 'a', value: '1', kind: 'number', min: 5, max: 1 }), /不得大于/);
    assert.throws(() => renderEditableValue({ name: 'a', value: '1', kind: 'number', step: 0 }), /必须大于 0/);
    assert.throws(() => renderEditableValue({ name: 'a', value: '1', step: 1 }), /只对 kind=number 有效/);
    assert.throws(() => renderEditableValue({ name: 'a', value: '1', kind: 'date', min: 1 }), /只对 kind=number 有效/);
  });

  it('转义面：值／显示字／单位／字段名／占位／类名逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderEditableValue({
      name: 'n1', value: evil, display: evil, unit: evil, label: evil, placeholder: evil,
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签：' + html.slice(0, 160));
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    const cls = renderEditableValue({ name: 'n2', value: 'v', extraClass: 'ok-class other' });
    assert.ok(cls.includes('ok-class other'), '合法附加类名照收');
    for (const bad of ['a"b', 'a>b', 'x{y}', '.x', 'a b!']) {
      assert.throws(() => renderEditableValue({ name: 'n3', value: 'v', extraClass: bad }), /只许空格分隔的类名/, '拒：' + bad);
    }
  });

  it('形态档／禁用／对齐：逐档上属性与类，disabled 不给铅笔且落 aria-disabled', () => {
    const hover = renderEditableValue({ name: 'a', value: '1', affordance: 'hover' });
    assert.ok(hover.includes(EDIT_AFFORDANCE_ATTR + '="hover"'), 'hover 档上属性');
    const none = renderEditableValue({ name: 'a', value: '1', affordance: 'none' });
    assert.ok(none.includes(EDIT_AFFORDANCE_ATTR + '="none"') && !none.includes('-pen'), 'none 档不出铅笔');
    const dis = renderEditableValue({ name: 'a', value: '1', disabled: true, label: '身高' });
    assert.ok(dis.includes('disabled') && dis.includes('aria-disabled="true"'), '禁用落 disabled ＋ aria-disabled');
    assert.ok(!dis.includes('-pen'), '禁用不出铅笔（"看着能点"不留中间档）');
    const right = renderEditableValue({ name: 'a', value: '1', align: 'right' });
    assert.ok(right.includes(EDIT_VALUE_CLASS + '--right'), '右对齐档上类');
    assert.throws(() => renderEditableValue({ name: 'a', value: '1', align: 'center' }), /只许 left／right/);
  });

  it('入参违规一律拒（不静默降级）；显式空态是唯一例外', () => {
    assert.throws(() => renderEditableValue(null), /必须是对象/);
    assert.throws(() => renderEditableValue({ name: '', value: '1' }), /name/);
    assert.throws(() => renderEditableValue({ name: 'a', value: '' }), /显式空态/);
    assert.throws(() => renderEditableValue({ name: 'a', value: 1 }), /value 必须是字符串/);
    assert.throws(() => renderEditableValue({ name: 'a', value: '1', kind: 'range' }), /kind 非法/);
    assert.throws(() => renderEditableValue({ name: 'a', value: '1', affordance: 'maybe' }), /affordance 非法/);
    assert.throws(() => renderEditableValue({ name: 'a', value: '1', display: 7 }), /display 必须是字符串/);
    const empty = renderEditableValue({ name: 'note', value: '', display: '未设置', label: '备注', required: true });
    assert.ok(empty.includes(EDIT_VALUE_ATTR + '=""') && empty.includes('>未设置<'), '显式空态：机器值空、显示字可读');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('editableValue ② 样式与零 DOM 纪律', () => {
  it('样式段只读冻结 token：出现的每个 CSS 变量名都在 CSS_VAR_TOKENS 里', () => {
    const css = editableValueCss();
    const names = new Set([...css.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]));
    const allowed = new Set(Object.keys(CSS_VAR_TOKENS));
    for (const n of names) assert.ok(allowed.has(n), '用了非冻结 token：' + n);
    assert.ok(!/:root/.test(css), '不得写 :root');
    assert.ok(!/!important/.test(css), '不得用 !important');
    assert.ok(css.includes(String(EDIT_VALUE_MIN_HEIGHT_PX) + 'px'), '命中区高度取常量（44）');
    assert.ok(css.includes(String(EDIT_VALUE_EDITOR_MAX_WIDTH_PX) + 'px'), '编辑器宽度上限取常量（250）');
  });

  it('dist/**（组件层）代码里零 document.／window.／navigator.（DOM 只在产出文本里）', () => {
    const roots = [join(PKG, 'dist', 'components')];
    const files = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.js')) files.push(p);
      }
    };
    for (const r of roots) walk(r);
    assert.ok(files.length >= 2, '至少应扫到组件层的编译产物');
    for (const f of files) {
      let code = readFileSync(f, 'utf8');
      code = code.replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/`(?:[^`\\]|\\.)*`/g, '``').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.ok(!code.includes(needle), f.replace(PKG, '') + ' 的代码里出现 ' + needle);
      }
    }
  });
});

/* ── ③ 加法式：不启用 = 零变化 ─────────────────────────────────────── */

describe('editableValue ③ 加法式（不启用即逐字节相同）', () => {
  it('renderDocShell 不带该组件时，产物不含它的样式与运行时', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.ok(!base.includes(EDIT_VALUE_CLASS), '不带组件时不得出现它的类名');
    assert.ok(!base.includes(EDIT_EVENT_COMMIT), '不带组件时不得出现它的运行时');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }), '两次渲染逐字节相同');
  });

  it('带 editableValue: true 时，样式段与运行时都在，且其它部分不变', () => {
    const off = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const on = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '', editableValue: true });
    assert.ok(on.includes('editableValue（就地可编辑值）'), '样式段随页挂上');
    assert.ok(on.includes(EDIT_EVENT_COMMIT), '运行时随页挂上');
    assert.ok(on.length > off.length, '启用后长于不启用');
    assert.ok(on.includes('<p>x</p>'), '正文不变');
  });
});

/* ── ④ 真机：几何不变量与交互 ───────────────────────────────────────── */

/** 夹具里的值（覆盖 text／number／select／显式空态／显示字分离／精度四档）。 */
function fixtureCells() {
  return [
    renderEditableValue({ name: 'heightCm', value: '177', unit: 'cm', label: '身高' }),
    renderEditableValue({ name: 'age', value: '31', unit: '岁', label: '年龄', kind: 'number', min: 0, max: 120, step: 1 }),
    renderEditableValue({
      name: 'activityLevel', value: 'sedentary', display: '久坐', label: '活动量', kind: 'select',
      options: [{ value: 'sedentary', label: '久坐' }, { value: 'moderate', label: '中度活动' }],
    }),
    renderEditableValue({ name: 'note', value: '', display: '未设置', label: '备注', required: true }),
    /* 显示字与机器值分离：无改动提交时这一格最容易被改坏（审查席 P1-4）。 */
    renderEditableValue({ name: 'calorieGoal', value: '1800', display: '1,800', label: '热量目标' }),
    /* 精度档：step=0.1 的容差（审查席 P2-6）。 */
    renderEditableValue({ name: 'precise', value: '1800.3', label: '精读值', kind: 'number', min: 0, step: 0.1 }),
    /* 机器值编辑器承载不了：属性在页内被改成 1,800，运行时必须**拒开**（审查席 P1-5）。 */
    renderEditableValue({ name: 'numComma', value: '1800', display: '1,800', label: '带千分位的数', kind: 'number' }),
  ];
}

/** 起一份夹具页（两份运行时：顺带验幂等）。 */
function startFixture() {
  return startEditablePage({
    cells: fixtureCells(), runtime: buildEditableValueJs(), css: editableValueCss(), copies: 2,
    commitEvent: EDIT_EVENT_COMMIT, cancelEvent: EDIT_EVENT_CANCEL,
  });
}

/* 页内表达式的三个构造器：字符串拼接只在这里，断言里一律读得懂。 */
const qsel = (name, suffix) => JSON.stringify('[' + EDIT_NAME_ATTR + '="' + name + '"]' + (suffix === undefined ? '' : suffix));
const sel = (name) => qsel(name);
const edExpr = (name) => 'document.querySelectorAll('
  + JSON.stringify('[' + EDIT_NAME_ATTR + '="' + name + '"] input,[' + EDIT_NAME_ATTR + '="' + name + '"] select') + ').length';
const valExpr = (name) => 'document.querySelector(' + sel(name) + ').getAttribute(' + JSON.stringify(EDIT_VALUE_ATTR) + ')';
const txtExpr = (name) => 'document.querySelector(' + qsel(name, ' .' + EDIT_VALUE_CLASS + '-text') + ').textContent';
const clickExpr = (name) => 'document.querySelector(' + JSON.stringify('[' + EDIT_NAME_ATTR + '="' + name + '"] [' + EDIT_HIT_ATTR + ']') + ').click()';
const keyExpr = (name, key) => 'document.querySelector(' + JSON.stringify('[' + EDIT_NAME_ATTR + '="' + name + '"] input,[' + EDIT_NAME_ATTR + '="' + name + '"] select')
  + ').dispatchEvent(new KeyboardEvent("keydown",{key:' + JSON.stringify(key) + ',bubbles:true}))';
const blurExpr = (name) => 'document.querySelector(' + JSON.stringify('[' + EDIT_NAME_ATTR + '="' + name + '"] input,[' + EDIT_NAME_ATTR + '="' + name + '"] select') + ').blur()';

/** 进入某格的编辑态，返回是否真的开了编辑器。 */
async function open(p, name) {
  await p.ev(clickExpr(name));
  await sleep(120);
  return (await p.ev(edExpr(name))) === 1;
}

/** 在编辑器里改字（不提交）。 */
async function typeIn(p, name, value) {
  await p.ev('(function(){var i=document.querySelector(' + JSON.stringify('[' + EDIT_NAME_ATTR + '="' + name + '"] input,[' + EDIT_NAME_ATTR + '="' + name + '"] select')
    + ');i.value=' + JSON.stringify(value) + ';return true}())');
}

/** 敲回车（`composing` 为真时带 `isComposing` ＝ IME 组字中）。 */
async function pressEnter(p, name, composing) {
  const init = '{key:"Enter",bubbles:true' + (composing === true ? ',isComposing:true' : '') + '}';
  await p.ev('(function(){var i=document.querySelector(' + JSON.stringify('[' + EDIT_NAME_ATTR + '="' + name + '"] input,[' + EDIT_NAME_ATTR + '="' + name + '"] select')
    + ');i.dispatchEvent(new KeyboardEvent("keydown",' + init + '));return true}())');
  await sleep(150);
}

describe('editableValue ④ 真机（无头 Chrome）', () => {
  it('几何不变形 ＋ 提交／取消／失焦／select／必填拦截／重复注入只绑一次', async (t) => {
    const p = await startFixture();
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何与交互判据需真浏览器');
    try {
      const before = await p.geom();

      // 进编辑：同一格出现 input，且**版面不动**
      assert.equal(await open(p, 'heightCm'), true, '编辑器出现在同一格');
      assert.deepEqual(await p.geom(), before, '进入编辑不得改变任何行高与列位置');

      // Enter 提交：值就地更新 ＋ 事件冒泡到 document（重复注入也只绑一次 ⇒ 恰好 1 条）
      await typeIn(p, 'heightCm', '180');
      await pressEnter(p, 'heightCm');
      assert.equal(await p.ev(valExpr('heightCm')), '180', '机器值就地更新');
      assert.equal(await p.ev(txtExpr('heightCm')), '180', '显示文本就地更新');
      assert.equal((await p.hits()).length, 1, '提交事件恰好一条（两份运行时不得重复绑定）');
      assert.equal((await p.hits())[0].name, 'heightCm', '事件带机器键');
      assert.equal((await p.hits())[0].prev, '177', '事件带改前值');
      assert.deepEqual(await p.geom(), before, '提交后版面仍不得移动');

      // 失焦提交 ＋ 再进编辑不变形
      assert.equal(await open(p, 'age'), true);
      assert.deepEqual(await p.geom(), before, '第二个值进入编辑同样不变形');
      await typeIn(p, 'age', '32');
      await p.ev(blurExpr('age'));
      await sleep(160);
      assert.equal(await p.ev(valExpr('age')), '32', '失焦提交');

      // 数字约束：超上界 → 留在编辑态、不派发
      assert.equal(await open(p, 'age'), true);
      const hitsBefore = (await p.hits()).length;
      await typeIn(p, 'age', '999');
      await pressEnter(p, 'age');
      assert.equal(await p.ev(edExpr('age')), 1, '越界值留在编辑态');
      assert.equal((await p.hits()).length, hitsBefore, '越界不得派发提交事件');

      // Esc 取消：值还原 ＋ 取消事件
      await p.ev(keyExpr('age', 'Escape'));
      await sleep(150);
      assert.equal(await p.ev(valExpr('age')), '32', 'Esc 后值不变');
      assert.equal((await p.cancels()).length, 1, '取消事件恰好一条');

      // select：选定即提交，显示 label、机器值 value
      assert.equal(await open(p, 'activityLevel'), true);
      await typeIn(p, 'activityLevel', 'moderate');
      await p.ev('(function(){document.querySelector(' + JSON.stringify('[' + EDIT_NAME_ATTR + '="activityLevel"] select')
        + ').dispatchEvent(new Event("change",{bubbles:true}));return true}())');
      await sleep(150);
      assert.equal(await p.ev(valExpr('activityLevel')), 'moderate', 'select 机器值');
      assert.equal(await p.ev(txtExpr('activityLevel')), '中度活动', 'select 显示字取 label');

      // 必填：空值 → 留在编辑态、带 --invalid
      assert.equal(await open(p, 'note'), true);
      await typeIn(p, 'note', '');
      await pressEnter(p, 'note');
      assert.equal(await p.ev(edExpr('note')), 1, '必填空值留在编辑态');
      assert.ok(await p.ev('document.querySelector(' + sel('note') + ').className.indexOf(' + JSON.stringify(EDIT_VALUE_CLASS + '--invalid') + ') >= 0'), '带 --invalid 类');
      await p.ev(keyExpr('note', 'Escape'));
      await sleep(150);

      // 禁用值：点了不开编辑器
      await p.ev('document.querySelector(' + sel('heightCm') + ').setAttribute("data-ilife-edit-disabled","1");' + clickExpr('heightCm') + ';true');
      await sleep(130);
      assert.equal(await p.ev(edExpr('heightCm')), 0, '禁用值点不开');
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});

/* ── ⑤ 返修回归（审查席 P1×5／P2）────────────────────────────────────── */

/** 命中区在显示态必须"真的能点"：可见、可命中、且不小于 44×44（审查席 P1-2／P2-9）。 */
async function assertHitUsable(p, name, why) {
  const r = await p.ev('(function(){var h=document.querySelector(' + JSON.stringify('[' + EDIT_NAME_ATTR + '="' + name + '"] [' + EDIT_HIT_ATTR + ']') + ');'
    + 'var b=h.getBoundingClientRect();var el=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);'
    + 'return {w:Math.round(b.width),h:Math.round(b.height),disp:h.style.display,'
    + 'top:!!el && (el===h || h.contains(el))};}())');
  assert.equal(r.disp, '', why + '：命中区显示态（display 不得被留在 none）');
  assert.ok(r.w >= EDIT_VALUE_MIN_HEIGHT_PX && r.h >= EDIT_VALUE_MIN_HEIGHT_PX, why + '：命中区 ' + r.w + '×' + r.h + ' 小于 44×44');
  assert.equal(r.top, true, why + '：命中区必须是最上层可点元素（中心点命中自己或自己的子节点）');
}

describe('editableValue ⑤ 返修回归（审查席 P1／P2）', () => {
  it('Esc 只取消不提交；退出后命中区回到可点状态（P1-1／P1-2／P2-9）', async (t) => {
    const p = await startFixture();
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      assert.equal(await open(p, 'heightCm'), true);
      await typeIn(p, 'heightCm', '200');
      await p.ev(keyExpr('heightCm', 'Escape'));
      await sleep(170);
      assert.equal(await p.ev(valExpr('heightCm')), '177', 'Esc 后机器值还原');
      assert.equal(await p.ev(txtExpr('heightCm')), '177', 'Esc 后显示字还原');
      assert.equal(await p.ev(edExpr('heightCm')), 0, 'Esc 后编辑器收摊');
      assert.equal((await p.cancels()).length, 1, '取消事件一条');
      assert.equal((await p.hits()).length, 0, '取消**不得**被重入成提交（P1-1 的根因）');
      await assertHitUsable(p, 'heightCm', '取消之后');
      assert.deepEqual(await p.errs(), [], '不得留下未捕获错误');
      assert.equal(await open(p, 'heightCm'), true, '取消之后仍可再进编辑（不是"卡住"）');
    } finally { p.close(); }
  });

  it('按原样提交：显示字一个字节都不动、不派发事件（P1-4）', async (t) => {
    const p = await startFixture();
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      const before = (await p.hits()).length;
      assert.equal(await open(p, 'calorieGoal'), true);
      await pressEnter(p, 'calorieGoal');
      assert.equal(await p.ev(valExpr('calorieGoal')), '1800', '机器值不动');
      assert.equal(await p.ev(txtExpr('calorieGoal')), '1,800', '显示字不得被机器值覆盖');
      assert.equal((await p.hits()).length, before, '无改动不派发提交');
      assert.equal(await open(p, 'activityLevel'), true);
      await pressEnter(p, 'activityLevel');
      assert.equal(await p.ev(valExpr('activityLevel')), 'sedentary', 'select 机器值不动');
      assert.equal(await p.ev(txtExpr('activityLevel')), '久坐', 'select 显示字不得被 value 覆盖');
      assert.equal((await p.hits()).length, before, 'select 无改动同样不派发');
      await assertHitUsable(p, 'calorieGoal', '无改动提交之后');
      assert.deepEqual(await p.errs(), [], '不得留下未捕获错误');
    } finally { p.close(); }
  });

  it('select 失焦也提交并收摊（P1-3：不再有"卡住"的编辑态）', async (t) => {
    const p = await startFixture();
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      assert.equal(await open(p, 'activityLevel'), true);
      // 只改 DOM 值、**不派发 change**（键盘路径与原生控件都会出现这种中间态）
      await typeIn(p, 'activityLevel', 'moderate');
      await p.ev(blurExpr('activityLevel'));
      await sleep(190);
      assert.equal(await p.ev(edExpr('activityLevel')), 0, '失焦后编辑器必须收摊');
      assert.equal(await p.ev(valExpr('activityLevel')), 'moderate', '失焦提交机器值');
      assert.equal(await p.ev(txtExpr('activityLevel')), '中度活动', '显示字取 label');
      await assertHitUsable(p, 'activityLevel', 'select 失焦之后');
      assert.deepEqual(await p.errs(), [], '不得留下未捕获错误');
    } finally { p.close(); }
  });

  it('机器值编辑器承载不了：拒开，不静默清空（P1-5）', async (t) => {
    // 渲染期就拦：kind=number 只收数字输入能原样读回的值
    assert.throws(() => renderEditableValue({ name: 'x', value: '1,800', kind: 'number' }), /数字输入承载/);
    assert.throws(() => renderEditableValue({ name: 'x', value: '1800 kcal', kind: 'number' }), /数字输入承载/);
    assert.throws(() => renderEditableValue({ name: 'x', value: '2026-02-31', kind: 'date' }), /YYYY-MM-DD/);
    assert.doesNotThrow(() => renderEditableValue({ name: 'x', value: '', display: '未设置', kind: 'number' }));
    const p = await startFixture();
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      // 运行期兜底：属性被写进承载不了的值 → 点了不开编辑器，显示字与机器值都不动
      await p.ev('document.querySelector(' + sel('numComma') + ').setAttribute(' + JSON.stringify(EDIT_VALUE_ATTR) + ',"1,800");true');
      const before = (await p.hits()).length;
      await p.ev(clickExpr('numComma'));
      await sleep(150);
      assert.equal(await p.ev(edExpr('numComma')), 0, '承载不了就不开编辑器');
      assert.equal(await p.ev(valExpr('numComma')), '1,800', '机器值不得被清空');
      assert.equal(await p.ev(txtExpr('numComma')), '1,800', '显示字不得被清空');
      assert.equal((await p.hits()).length, before, '拒开不得派发提交');
      await assertHitUsable(p, 'numComma', '拒开之后');
      assert.deepEqual(await p.errs(), [], '不得留下未捕获错误');
    } finally { p.close(); }
  });

  it('IME 组字中的回车不提交；容差放得住精确小数（P2-6／P2-8）', async (t) => {
    const p = await startFixture();
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      const before = (await p.hits()).length;
      assert.equal(await open(p, 'precise'), true);
      await typeIn(p, 'precise', '1800.7');
      await pressEnter(p, 'precise', true);
      assert.equal(await p.ev(edExpr('precise')), 1, '组字中的回车不提交');
      assert.equal((await p.hits()).length, before, '组字中不得派发');
      await pressEnter(p, 'precise');
      assert.equal(await p.ev(valExpr('precise')), '1800.7', 'step=0.1 的合法值必须放行（容差按值域缩放）');
      assert.deepEqual(await p.errs(), [], '不得留下未捕获错误');
    } finally { p.close(); }
  });
});
