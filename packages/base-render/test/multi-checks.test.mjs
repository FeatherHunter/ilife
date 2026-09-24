/** multiChecks（多选清单 · 形态 A「顶上全选 ＋ 分组复选 ＋ 底下动作」）· **判据件**。
 *
 *  断言对象是本件**自己的唯一出口**：`dist/components/multi-checks/index.js`
 *  （组件层不进冻结面、不从根出口；层出口那一行由接线席统一加）。
 *
 *  四类（契约 §五）＋ 三条本件特有的硬判据：
 *   ① **渲染契约**：全选头 ＋ 已选数 ＋ 分组 ＋ 动作条 ＋ 逐行原生复选；空态／加载态／错态；
 *      分组的组尾读数；**全部**非法入参分支走 `BlocksError`；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤／scope 在 `.ilife-page-ui` 之下／零 `:root`／
 *      零 `!important`／零新 token 名／媒体查询只判设备能力／零 `…` 截断手段／**触控目标 ≥44**；
 *   ③ **加法式**：不挂本件时同页产物逐字节相同；标记里不出现别件的类名；
 *   ④ **真机两档**（headless Chrome ＋ CDP）：容器宽 **390 与 1280** 零横向溢出、**触控目标 ≥44×44**、
 *      **勾选态不只靠颜色**（大字报刊下强调色＝墨黑仍读得出）、三态（勾／半勾／没勾）真的动、
 *      已选数与合计跟着改、没勾时动作按钮按不动且有说明、零未捕获错误。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  MULTI_CHECKS_CLASS,
  MULTI_CHECKS_FORMS,
  MULTI_CHECKS_MIN_TARGET_PX,
  MULTI_CHECKS_ROW_MIN_HEIGHT_PX,
  MULTI_CHECKS_SLOTS,
  buildMultiChecksJs,
  multiChecksCss,
  multiChecksSlot,
  renderMultiChecks,
} from '../dist/components/multi-checks/index.js';
import { SKIN_NAMES, SKIN_TOKEN_NAMES, skinClass, skinCss, skinTokenVar, skinVar } from '../dist/components/skin/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const throwsBlocks = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.name === 'BlocksError';
  }
  return false;
};
const selectorsOf = (css) => {
  const out = [];
  for (const m of stripComments(css).matchAll(/([^{}]*)\{/g)) {
    const sel = m[1].split('}').pop().trim();
    if (sel === '' || sel.startsWith('@')) continue;
    out.push(sel);
  }
  return out;
};
const skinVarSpans = (css) => {
  const spans = [];
  for (const m of css.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)) {
    const expected = skinVar(m[1]);
    assert.ok(css.startsWith(expected, m.index), '`' + m[1] + '` 处的 var() 串与 skinVar() 走散');
    spans.push([m.index, m.index + expected.length]);
  }
  return spans;
};
const cutSpans = (text, spans) => {
  let out = '';
  let at = 0;
  for (const [from, to] of spans) { out += text.slice(at, from); at = to; }
  return out + text.slice(at);
};

/* ── 夹具入参 ───────────────────────────────────────────────────────── */

/** 一页真实形状的清单：按日期分组 ＋ 金额 ＋ 两枚动作按钮（记账「批量改分类」）。 */
const REAL = {
  name: 'batch',
  label: '挑几条一起改分类',
  hint: '勾掉的不改',
  selected: ['r1', 'r2', 'r3'],
  actions: [
    { id: 'cancel', label: '取消' },
    { id: 'apply', label: '改分类', primary: true },
  ],
  rows: [
    { id: 'r1', title: '茶叶蛋 2 个', group: '09-25 周四', groupNote: '3 条 · ¥56.00', note: '早餐 · 未分类', amount: '-12.00' },
    { id: 'r2', title: '牛肉面', group: '09-25 周四', note: '午餐 · 未分类', amount: '-38.00' },
    { id: 'r3', title: '地铁 3 号线', group: '09-25 周四', note: '交通 · 已分类', amount: '-6.00' },
    { id: 'r4', title: '豆浆油条', group: '09-24 周三', groupNote: '2 条 · ¥50.50', note: '早餐 · 未分类', amount: '-8.00' },
    { id: 'r5', title: '买菜 番茄鸡蛋', group: '09-24 周三', note: '晚餐 · 未分类', amount: '-42.50' },
    { id: 'r6', title: '公司食堂', note: '午餐 · 已分类', amount: '-22.00' },
  ],
};

/** 敌意入参：超长标题／备注／金额（零横向溢出与「不截断」都靠它压出来）。 */
const HOSTILE = {
  name: 'batch-hostile',
  label: '这一句说明也可以很长：挑几条一起改分类，改之前先看清每一条是什么、多少钱',
  hint: '勾掉的不改，改之前会再问一次',
  selected: ['h1'],
  actions: [{ id: 'apply', label: '把这几条一起改成「工作」分类', primary: true }],
  rows: [
    {
      id: 'h1',
      title: '这一条的名字特别长特别长长到窄容器里必须折行而且不许出现省略号',
      group: '09-25 周四这一天要改的都在这里',
      groupNote: '2 条 · ¥1,234,567,890.12',
      note: '早餐 · 未分类 · 备注也可以很长很长很长',
      amount: '-1234567890.12',
      amountText: '-1,234,567,890.12',
    },
    { id: 'h2', title: '被停用的那一条', note: '已归档', amount: '-0.01', disabled: true, disabledReason: '已归档的记录不许批量改' },
  ],
  extraClass: 'ok-class other',
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('multiChecks ① 渲染契约', () => {
  it('骨架顺序：全选头（含已选数）→ 分组与行 → 动作条（按钮在**下面**）→ 可选的错态', () => {
    const html = renderMultiChecks(REAL);
    assert.match(html, /^<div class="ilife-block-multi-checks is-grouped" data-ilife-checks-name="batch"/, html.slice(0, 100));
    assert.match(html, /data-ilife-checks-form="grouped"/);
    assert.match(html, /data-ilife-checks-unit="条"/);
    assert.match(html, /data-ilife-checks-money="¥"/, '全部行都有金额 ⇒ 根上带金额前缀');
    assert.match(html, /-label"><b>挑几条一起改分类<\/b><span class="ilife-block-multi-checks-hint">勾掉的不改<\/span><\/p>/);
    assert.match(html, /-all"><input type="checkbox" data-ilife-checks-all=""/, '全选是原生复选');
    assert.match(html, /-count" id="ilife-checks-count-batch">已选 3 \/ 6 条</, '已选数：已选 N / M 条');
    assert.equal((html.match(/<input type="checkbox"/g) || []).length, 6 + 2 + 1, '逐行一枚 ＋ 两个组头各一枚 ＋ 顶上那枚全选（9 枚，全是原生复选）');
    assert.equal((html.match(/ checked/g) || []).length, 3 + 1, '三行预勾选 ＋ **那一组**的组头全勾（另一组没勾）');
    assert.match(html, /-gh"><input type="checkbox" data-ilife-checks-group="09-25 周四" checked/, '组头是原生复选');
    assert.match(html, /-gh-title">09-25 周四</, '组名在');
    assert.match(html, /-gh-note">3 条 · ¥56.00</, '组尾读数取组内第一份给了的');
    assert.match(html, /-nm">茶叶蛋 2 个<i class="ilife-block-multi-checks-note">早餐 · 未分类<\/i>/, '行主字 ＋ 副语');
    assert.match(html, /-amt">-12.00</, '行右端金额');
    assert.match(html, /-bar"><span class="ilife-block-multi-checks-sum" id="ilife-checks-sum-batch" aria-live="polite">合计 -¥56.00<\/span>/, '底下那句合计在（金额的符号写在货币号前）');
    assert.match(html, /<button type="button" class="ilife-block-multi-checks-act" data-ilife-checks-action="apply" data-ilife-checks-primary="1" aria-describedby="ilife-checks-sum-batch">改分类<\/button>/, '主按钮用 `data-*` 标记，不用修饰类');
    assert.ok(html.indexOf('-bar') > html.indexOf('-row'), '按钮排在**行之后**（本形态的样子）');
    assert.equal(/<script/i.test(html), false, '不产脚本');
    assert.equal(/\son[a-z]+=/i.test(html), false, '不产内联事件处理器');
  });

  it('三态写在标记里：全勾 ⇒ checked；勾一部分 ⇒ `aria-checked="mixed"` ＋ 半勾标记；没勾 ⇒ 都不带', () => {
    const partial = renderMultiChecks({ ...REAL, selected: ['r1'] });
    assert.match(partial, /data-ilife-checks-all="" data-ilife-checks-partial="1" aria-checked="mixed"/, '全选头：半勾');
    assert.match(partial, /data-ilife-checks-group="09-25 周四" data-ilife-checks-partial="1" aria-checked="mixed"/, '组头：半勾');
    assert.match(partial, /已选 1 \/ 6 条/);
    const none = renderMultiChecks({ ...REAL, selected: [] });
    assert.equal(none.includes('data-ilife-checks-partial'), false, '一条都没勾 ⇒ 不出半勾标记');
    assert.equal(none.includes('data-ilife-checks-value'), false);
    assert.match(none, /-sum" id="ilife-checks-sum-batch" aria-live="polite">一条都没勾</, '没勾时底下那句就是"为什么按不动"');
    assert.match(none, /data-ilife-checks-action="apply"[^>]* disabled/, '没勾 ⇒ 动作按钮按不动');
    assert.match(none, /aria-describedby="ilife-checks-sum-batch"[^>]* disabled|disabled[^>]*aria-describedby/, '按不动时把"为什么"指给底下那句读数');
  });

  it('缺槽不出：不给分组就不出组头；不给动作就只有合计那句；不给金额就不谈合计', () => {
    const flat = renderMultiChecks({ name: 'n', label: '清单', rows: [{ id: 'a', title: '甲' }] });
    assert.equal(flat.includes('-grp'), false, '不给 group ⇒ 不出分组');
    assert.equal(flat.includes('-gh'), false);
    assert.equal(flat.includes('-bar'), true, '底下那一排是形态的一部分（没有动作就只有合计）');
    assert.equal(flat.includes('data-ilife-checks-money'), false, '没给金额 ⇒ 不谈合计');
    assert.match(flat, /-sum"[^>]*>已勾 0 条|一条都没勾/, '没金额时那句走"已勾 N 条"／"一条都没勾"');
    assert.equal(flat.includes('<button'), false, '不给动作 ⇒ 一枚按钮都不出');
  });

  it('三个"没有正常内容"的状态各出各的骨架：空态／加载态（原地换字）／错态', () => {
    const empty = renderMultiChecks({ name: 'n', label: '清单', rows: [] });
    assert.match(empty, /-empty" role="status">没有可挑的条目</);
    assert.equal(empty.includes('-top'), false, '空态不出全选头');
    const loading = renderMultiChecks({ name: 'n', label: '清单', loading: true, rows: [] });
    assert.match(loading, /-loading" role="status">正在读取</);
    const withRows = renderMultiChecks({ ...REAL, loading: true });
    assert.match(withRows, /data-ilife-checks-loading="1"/, '加载标记落根上');
    assert.match(withRows, /-count"[^>]*>正在读取</, '已选数**原地换字**');
    assert.equal(withRows.includes('已选 3 / 6 条'), false, '加载态不再显示旧读数');
    assert.match(withRows, /data-ilife-checks-all="" disabled/, '加载态全选不可点');
    assert.match(withRows, /data-ilife-checks-action="apply"[^>]* disabled/, '加载态动作按钮按不动');
    const err = renderMultiChecks({ ...REAL, error: '至少要勾一条' });
    assert.match(err, /-error" id="ilife-checks-err-batch">至少要勾一条</, '错态写在控件旁边');
  });

  it('转义：机器键／标题／副语／金额／组名／按钮字逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderMultiChecks({
      name: 'n1', label: evil, hint: evil, allText: evil, moneyUnit: evil, countUnit: evil,
      actions: [{ id: 'a1', label: evil }],
      rows: [{ id: evil, title: evil, note: evil, group: evil, groupNote: evil, amount: '-1.00', amountText: evil }],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.equal(/\son[a-z]+=/i.test(html), false, '不得出现内联事件处理器');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.throws(() => renderMultiChecks({ ...REAL, extraClass: 'x{y}' }), /只许空格分隔的类名/);
    assert.match(renderMultiChecks({ ...REAL, extraClass: 'ok-1 other' }), /is-grouped ok-1 other"/);
  });

  it('形态键是闭集：闭集外一律 BlocksError', () => {
    assert.deepEqual([...MULTI_CHECKS_FORMS], ['grouped']);
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...REAL, form: 'table' })), true);
    assert.match(renderMultiChecks({ ...REAL, form: 'grouped' }), /is-grouped/);
  });

  it('非法入参**逐条**走 BlocksError（不静默降级、不「尽量猜」）', () => {
    const ok = { name: 'n', label: '清单', rows: [{ id: 'a', title: '甲' }] };
    assert.equal(throwsBlocks(() => renderMultiChecks(undefined)), true);
    assert.equal(throwsBlocks(() => renderMultiChecks(null)), true);
    assert.equal(throwsBlocks(() => renderMultiChecks([])), true);
    assert.equal(throwsBlocks(() => renderMultiChecks('x')), true);
    assert.equal(throwsBlocks(() => renderMultiChecks({ label: '清单', rows: ok.rows })), true, 'name 必填');
    assert.equal(throwsBlocks(() => renderMultiChecks({ name: '', ...{ label: '清单' }, rows: ok.rows })), true);
    assert.equal(throwsBlocks(() => renderMultiChecks({ name: 'n', rows: ok.rows })), true, 'label 必填');
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, label: '' })), true);
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, hint: 1 })), true);
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, rows: 'x' })), true);
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, rows: [{ title: '甲' }] })), true, '行 id 必填');
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, rows: [{ id: 'a', title: '' }] })), true, '行 title 必填');
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, rows: [{ id: 'a', title: '甲' }, { id: 'a', title: '乙' }] })), true, '机器键重复');
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, rows: [{ id: 'a', title: '甲', amount: 'abc' }] })), true, '金额必须是十进制串');
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, rows: [{ id: 'a', title: '甲', amount: '-1.234' }] })), true, '分以下不给');
    assert.equal(throwsBlocks(() => renderMultiChecks({
      ...ok, rows: [{ id: 'a', title: '甲', amount: '-1.00' }, { id: 'b', title: '乙' }],
    })), true, '金额要么每行都给、要么一行都不给');
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, selected: 'a' })), true, 'selected 必须是数组');
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, selected: ['zzz'] })), true, '预勾选必须命中行');
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, actions: [{ id: 'x' }] })), true, '动作 label 必填');
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, actions: [{ id: 'x', label: 'X', primary: 'yes' }] })), true);
    assert.equal(throwsBlocks(() => renderMultiChecks({
      ...ok, actions: [{ id: 'x', label: 'X', primary: true }, { id: 'y', label: 'Y', primary: true }],
    })), true, '至多一枚主按钮');
    assert.equal(throwsBlocks(() => renderMultiChecks({
      ...ok, actions: [{ id: 'x', label: 'X' }, { id: 'x', label: 'Y' }],
    })), true, '动作 id 重复');
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, required: 1 })), true);
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, loadingText: '稍等' })), true, 'loadingText 只在 loading 时给');
    assert.equal(throwsBlocks(() => renderMultiChecks({
      ...ok, rows: [{ id: 'a', title: '甲', disabledReason: '归档了' }],
    })), true, 'disabledReason 只在 disabled 时给');
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, error: 1 })), true);
    assert.equal(throwsBlocks(() => renderMultiChecks({ ...ok, emptyText: 1 })), true);
  });

  it('纯函数：同入参两次逐字节相同；`amount` 收整数分（`0.1 ＋ 0.2` 不许长出浮点尾巴）', () => {
    assert.equal(renderMultiChecks(REAL), renderMultiChecks(REAL));
    assert.notEqual(renderMultiChecks(REAL), renderMultiChecks(HOSTILE));
    const cents = renderMultiChecks({
      name: 'n', label: '清单', selected: ['a', 'b'],
      rows: [{ id: 'a', title: '甲', amount: '0.10' }, { id: 'b', title: '乙', amount: '0.20' }],
    });
    assert.match(cents, />合计 ¥0.30</, '整数分相加：0.30 而不是 0.30000000000000004');
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('multiChecks ② 样式纪律', () => {
  const css = stripComments(multiChecksCss());

  it('样式段非空，且**全部**规则 scope 在 `.ilife-page-ui` 之下', () => {
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 20, '本件规则数不对：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器没 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes('.' + MULTI_CHECKS_CLASS), '选择器必须挂在件根类之下：' + sel);
    }
  });

  it('零 `:root`／零 `!important`／零新 token 名', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.deepEqual(css.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
  });

  it('复合选择器的拼法：**同一条选择器里 `.ilife-page-ui` 只许出现一次**（多一次＝要求"件里再套一层 page-ui"，永远是死规则）', () => {
    const bad = /(?:>|~|\+)\s*\.ilife-page-ui/.exec(css);
    assert.equal(bad, null, '拼错的复合选择器（规则会静默不生效）：'
      + (bad === null ? '' : css.slice(bad.index, bad.index + 60)));
    const twice = [];
    for (const sel of selectorsOf(multiChecksCss())) {
      for (const part of sel.split(',')) {
        const n = (part.match(/\.ilife-page-ui/g) || []).length;
        if (n > 1) twice.push(n + '× ' + part.trim().slice(0, 90));
      }
    }
    assert.deepEqual(twice, [], '这些选择器把作用域写了两遍（后半截必须是裸槽类）：' + twice.join('；'));
    assert.match(css, /(?:>|~)\s*\.ilife-block-multi-checks-/);
  });

  it('**只经 `skinVar()` 读皮肤**：每一处 var() 都与 skinVar() 逐字相同', () => {
    const spans = skinVarSpans(css);
    assert.ok(spans.length >= 12, '读皮肤的处数不对（判据可能空转）：' + spans.length);
    const rest = cutSpans(css, spans);
    assert.equal(rest.includes('var(--'), false, '手写了 var(--…)');
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => skinTokenVar(k)));
    for (const n of new Set([...css.matchAll(/var\(\s*(--ilife-[a-z0-9-]+)/g)].map((m) => m[1]))) {
      assert.ok(known.has(n), '名单外的 token 名：' + n);
    }
  });

  it('**宽度只许容器判**：媒体查询只判设备能力，窄档走一条 `@container`', () => {
    for (const m of css.matchAll(/@media\s*\(([^)]*)\)/g)) {
      assert.ok(/hover|pointer|prefers-reduced-motion/.test(m[1]), '媒体查询只许判设备能力：' + m[1]);
    }
    assert.match(css, /@container \(max-width: \d+px\)/, '必须有窄档容器查询');
    assert.match(css, /container-type: inline-size;/, '本件必须自己是容器');
  });

  it('**不许 `…` 截断**：样式段里没有截断手段', () => {
    for (const bad of ['text-overflow', 'line-clamp', 'white-space: nowrap', 'overflow: hidden']) {
      assert.equal(css.includes(bad), false, '出现了截断手段：' + bad);
    }
    assert.ok((css.match(/overflow-wrap: anywhere/g) || []).length >= 6, '长串折行覆盖不足');
    assert.ok(css.includes('minmax(0, 1fr)'), '格子必须有 `minmax(0, 1fr)`（防压字）');
  });

  it('焦点地板：`:focus-visible` 有 ≥2px 可见描边，且没有「只写 outline:none」', () => {
    assert.match(css, /:focus-visible/, '必须有 :focus-visible 规则');
    assert.match(css, /outline: 2px solid /, '焦点描边 ≥2px 且可见');
    assert.equal(/outline:\s*(none|0)/.test(css), false, '不许只写 outline:none 而不给替代');
  });

  it('几何事实：触控目标 ≥44×44；勾选态有两重非颜色标记；不靠 `is-*` 短类名（会与别件撞名）', () => {
    assert.ok(MULTI_CHECKS_MIN_TARGET_PX >= 44, '触控目标地板必须 ≥44：' + MULTI_CHECKS_MIN_TARGET_PX);
    assert.ok(MULTI_CHECKS_ROW_MIN_HEIGHT_PX >= MULTI_CHECKS_MIN_TARGET_PX, '行高不得低于地板');
    assert.ok(css.includes('min-height: ' + String(MULTI_CHECKS_MIN_TARGET_PX) + 'px'), '全选块／组头／按钮取地板常量');
    assert.ok(css.includes('min-height: ' + String(MULTI_CHECKS_ROW_MIN_HEIGHT_PX) + 'px'), '行高取常量');
    assert.match(css, /content: "\\2713"/, '勾选框里的对钩（第一重：字）');
    assert.match(css, /box-shadow: inset \d+px 0 0 /, '勾中那一行左端的竖条（第二重：形状）');
    assert.match(css, /:has\(input:checked\)/, '勾选态判在**原生** `input:checked` 上');
    assert.match(css, /:indeterminate/, '半勾态判在**原生** `input:indeterminate` 上');
    for (const short of ['.is-on', '.is-primary', '.is-disabled', '.is-loading', '.is-ghost']) {
      assert.equal(css.includes(short), false, '不许用短类名修饰态：' + short);
    }
  });

  it('槽位闭集与类名拼法：逐槽都能拼出 `ilife-block-multi-checks-<槽>`', () => {
    for (const slot of MULTI_CHECKS_SLOTS) {
      assert.equal(multiChecksSlot(slot), 'ilife-block-multi-checks-' + slot);
    }
  });

  it('层红线：`dist/components/multi-checks/**` 零 DOM、零内联脚本', () => {
    const dir = join(PKG, 'dist', 'components', 'multi-checks');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 5, '编译产物不全：' + files.length);
    const strip = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const f of files) {
      const code = strip(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(PKG, '') + ' 的代码里出现 ' + needle);
      }
    }
  });
});

/* ── ③ 加法式 ＋ ⑤ 皮肤矩阵 ────────────────────────────────────────── */

describe('multiChecks ③ 加法式（opt-in：不挂这件＝零变化）', () => {
  it('纯函数 ＋ 可选的样式/运行时段：不挂它，别人产物一个字节不变', () => {
    const a = renderMultiChecks(REAL);
    assert.equal(a, renderMultiChecks(REAL), '两次渲染逐字节相同');
    assert.equal(a.includes('.ilife-page-ui'), false, '标记里不带任何选择器');
    assert.equal(a.includes('ilife-block-page-head'), false, '标记里不出现别件的类名');
    assert.equal(a.includes('ilife-block-radio-cards'), false, '标记里不出现别件的类名');
    assert.equal(typeof renderMultiChecks, 'function');
    /* 层红线按**产物的字面**断：本件不从根出口出（冻结面签名不许动）。
       这里读文本而不 import 根出口：根出口会牵起整层别的件，别人一件写坏就红在别人身上。 */
    assert.equal(readFileSync(join(PKG, 'dist', 'index.js'), 'utf8').includes('renderMultiChecks'), false,
      '组件层不得从根出口出：dist/index.js 里出现了 renderMultiChecks');
  });

  it('样式段与运行时段都是**字符串**：页面不调它们就没有任何字节', () => {
    assert.ok(multiChecksCss().includes('.' + MULTI_CHECKS_CLASS));
    assert.ok(buildMultiChecksJs().includes('data-ilife-checks-runtime'));
  });
});

describe('multiChecks ⑤ 皮肤矩阵（三套皮肤下标记逐字节相同）', () => {
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderMultiChecks(REAL) + '</div>';
  const withoutSkin = (name) => pageOf(name)
    .replace(skinCss({ skins: [name] }), '')
    .replace(skinClass(name), '');

  it('三套皮肤：差异只落在皮肤样式段与皮肤类上，标记面逐字节相同', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(renderMultiChecks(REAL)), '挖掉皮肤后标记必须原样在');
    for (const name of SKIN_NAMES) {
      assert.equal(withoutSkin(name), bare, name + ' 的标记面与 ' + SKIN_NAMES[0] + ' 不同');
    }
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[1]), '两套皮肤的页产物必须真的不同');
    assert.equal(renderMultiChecks(REAL).includes('skin-'), false, '标记里不许自带皮肤类');
  });

  it('「大字报刊」皮肤下强调色＝墨黑：勾选态的形状与字必须自己扛', () => {
    const broadsheet = skinCss({ skins: ['broadsheet'] });
    const accent = /--ilife-accent:\s*([^;\n]+)/.exec(broadsheet);
    assert.ok(accent !== null, '截不出大字报刊的强调色');
    assert.match(accent[1], /^#14110d\b/i, '前提变了：大字报刊的强调色不再是墨黑');
    assert.match(multiChecksCss(), /content: "\\2713"/);
    assert.match(multiChecksCss(), /box-shadow: inset/);
  });
});

/* ── ④ 真机两档（headless Chrome ＋ CDP）───────────────────────────── */

const WIDTHS = [390, 1280];
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

function findBrowser() {
  return [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter((p) => typeof p === 'string' && p !== '' && existsSync(p))[0];
}

function connectCdp(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => rej(new Error('CDP 连接失败')));
  });
  return {
    ready,
    send(method, params, sessionId) {
      const id = nextId; nextId += 1;
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
      });
    },
    close() { ws.close(); },
  };
}

/** 夹具页：视口恒 1440，容器宽由 `style="width:Npx"` 给；皮肤＝**大字报刊**（强调色＝墨黑）。 */
function buildFixture(width) {
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>multi-checks 两档</title>\n<style>\n'
    + 'html,body{margin:0;padding:0}\n'
    + 'body{padding:16px}\n'
    + skinCss() + '\n' + multiChecksCss() + '\n'
    + '</style></head>\n<body>\n'
    + '<div class="stage ilife-page-ui ' + skinClass('broadsheet') + '" style="width:' + width + 'px">'
    + renderMultiChecks(REAL) + renderMultiChecks(HOSTILE)
    + '</div>\n</body></html>';
}

/** 页内量测：溢出、逐行与逐按钮的命中盒、勾选态的两重标记、三态读数。 */
const MEASURE = '(function(){'
  + 'var stage=document.querySelector(".stage");'
  + 'function box(el){var r=el.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};}'
  + 'var roots=[].slice.call(document.querySelectorAll(".ilife-block-multi-checks"));'
  + 'var out={stageSw:stage.scrollWidth,stageCw:stage.clientWidth,docSw:document.documentElement.scrollWidth,'
  + 'docCw:document.documentElement.clientWidth,ellipsis:document.body.innerText.indexOf("\\u2026")>=0,roots:[],rows:[],acts:[]};'
  + 'for(var i=0;i<roots.length;i++){var h=roots[i];'
  + 'out.roots.push({sw:h.scrollWidth,cw:h.clientWidth,box:box(h),'
  + 'count:(h.querySelector(".ilife-block-multi-checks-count")||{}).textContent,'
  + 'sum:(h.querySelector(".ilife-block-multi-checks-sum")||{}).textContent});'
  + 'var all=h.querySelector("input[data-ilife-checks-all]");'
  + 'if(all) out.roots[i].all={checked:all.checked,indeterminate:all.indeterminate,aria:all.getAttribute("aria-checked"),box:box(all.closest("label"))};'
  + 'var rows=[].slice.call(h.querySelectorAll(".ilife-block-multi-checks-row"));'
  + 'for(var j=0;j<rows.length;j++){var row=rows[j];var inp=row.querySelector("input[type=checkbox]");var cb=row.querySelector(".ilife-block-multi-checks-cb");'
  + 'var cs=getComputedStyle(row);'
  + 'out.rows.push({root:i,idx:j,box:box(row),checked:!!inp&&inp.checked,disabled:!!inp&&inp.disabled,'
  + 'focusable:!!inp&&typeof inp.focus==="function"&&getComputedStyle(inp).display!=="none",'
  + 'bar:cs.boxShadow.indexOf("inset")>=0,checkMark:getComputedStyle(cb,"::after").content.indexOf("\\u2713")>=0});}'
  + 'var acts=[].slice.call(h.querySelectorAll("[data-ilife-checks-action]"));'
  + 'for(var k=0;k<acts.length;k++)out.acts.push({root:i,id:acts[k].getAttribute("data-ilife-checks-action"),box:box(acts[k]),disabled:acts[k].disabled,desc:acts[k].getAttribute("aria-describedby")});'
  + '}'
  + 'return out;}())';

async function startFixture() {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const dir = mkdtempSync(join(tmpdir(), 't-multi-checks-'));
  const profileDir = mkdtempSync(join(tmpdir(), 't-multi-checks-chrome-'));
  const pages = {};
  for (const w of WIDTHS) {
    const p = join(dir, 'fixture-' + w + '.html');
    writeFileSync(p, buildFixture(w), 'utf8');
    pages[w] = p;
  }
  const port = 9780 + (process.pid % 200);
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profileDir, '--window-size=1440,900', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'ignore'] });
  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    for (const d of [profileDir, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
  };
  try {
    let devUrl = null;
    for (let i = 0; i < 120 && devUrl === null; i += 1) {
      try {
        const r = await fetch('http://127.0.0.1:' + port + '/json/version');
        if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl;
      } catch { /* 等端口 */ }
      if (devUrl === null) await sleep(250);
    }
    if (devUrl === null) throw new Error('CDP 未就绪（headless Chrome 起不来）');
    const cdp = connectCdp(devUrl);
    await cdp.ready;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    const ev = async (expr) => {
      const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        const d = r.exceptionDetails;
        throw new Error('页内抛错：' + (d.exception && d.exception.description ? d.exception.description : d.text));
      }
      return r.result === undefined ? undefined : r.result.value;
    };
    await s('Page.enable');
    await s('Runtime.enable');
    await s('DOM.enable');
    await s('CSS.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const open = async (width) => {
      await s('Page.navigate', { url: pathToFileURL(pages[width]).href });
      for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
      await sleep(120);
      await ev('window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
        + 'window.__hits=[];window.__acts=[];'
        + 'document.addEventListener("ilife:checks-change",function(e){window.__hits.push(e.detail);});'
        + 'document.addEventListener("ilife:checks-action",function(e){window.__acts.push(e.detail);});'
        + 'var s=document.createElement("script");s.textContent=' + JSON.stringify(buildMultiChecksJs()) + ';document.body.appendChild(s);true');
      await sleep(150);
      return ev(MEASURE);
    };
    /** 真点某个元素（走完整命中链路）。 */
    const clickAt = async (selector, index) => {
      const box = await ev('(function(){var el=document.querySelectorAll(' + JSON.stringify(selector) + ')[' + String(index)
        + '];var r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}())');
      await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await sleep(120);
    };
    return {
      open, clickAt, widths: WIDTHS, measure: () => ev(MEASURE),
      hits: () => ev('window.__hits'),
      acts: () => ev('window.__acts'),
      errs: () => ev('window.__errs'),
      narrowAmt: () => ev('(function(){var a=document.querySelector(".ilife-block-multi-checks-amt");'
        + 'var cs=getComputedStyle(a);return {align:cs.textAlign,col:cs.gridColumnStart};}())'),
      focusOutline: async () => {
        const { root: docRoot } = await s('DOM.getDocument', { depth: 1 });
        /* 焦点态判在**原生框**上（`row:has(input:focus-visible)`）⇒ 伪类也必须强制在原生的那一枚上：
           `CSS.forcePseudoState` 只对它自己那一个元素生效，加在行上不算命中（这一条踩过一次）。 */
        const { nodeId } = await s('DOM.querySelector', { nodeId: docRoot.nodeId, selector: '.ilife-block-multi-checks-row input' });
        await s('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus-visible'] });
        const out = await ev('(function(){var r=document.querySelector(".ilife-block-multi-checks-row");'
          + 'var cs=getComputedStyle(r);return {w:parseFloat(cs.outlineWidth),style:cs.outlineStyle};}())');
        await s('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
        return out;
      },
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

describe('multiChecks ④ 真机两档（390／1280 容器；视口恒 1440；皮肤＝大字报刊）', () => {
  it('零横向溢出 ＋ 触控目标 ≥44×44 ＋ 勾选态两重标记 ＋ 三态／读数跟着动 ＋ 零未捕获错误', async (t) => {
    const p = await startFixture();
    if (p === null) return t.skip('本机无 Chrome／Chromium：真机几条退化为 ② 的确定性几何判据');
    try {
      const readings = [];
      for (const width of WIDTHS) {
        const m = await p.open(width);
        const why = width + 'px 容器：';
        assert.ok(m.docSw <= m.docCw, why + '页面横向溢出 doc ' + m.docSw + ' > ' + m.docCw);
        assert.ok(m.stageSw <= m.stageCw, why + '容器横向溢出 ' + m.stageSw + ' > ' + m.stageCw);
        assert.equal(m.ellipsis, false, why + '页面上出现了省略号');
        assert.equal(m.roots.length, 2, why + '夹具应有两组');
        for (const r of m.roots) {
          assert.ok(r.sw <= r.cw, why + '件根横向溢出 ' + r.sw + ' > ' + r.cw);
          assert.ok(Math.abs(r.cw - width) <= 1, why + '件根的容器宽不是 ' + width + '：' + r.cw);
        }
        for (const row of m.rows) {
          assert.ok(row.box.w >= 44 && row.box.h >= 44, why + '第 ' + (row.idx + 1) + ' 行命中盒 ' + row.box.w + '×' + row.box.h + ' 小于 44×44');
          assert.equal(row.focusable, true, why + '第 ' + (row.idx + 1) + ' 行的原生框不可聚焦');
          if (row.checked) {
            assert.equal(row.bar, true, why + '勾中的行缺左端竖条（形状那一重）');
            assert.equal(row.checkMark, true, why + '勾中的行勾选框里缺对钩（字那一重）');
          } else {
            assert.equal(row.bar, false, why + '没勾的行不该有竖条');
          }
        }
        for (const a of m.acts) assert.ok(a.box.h >= 44, why + '动作按钮 ' + a.id + ' 高 ' + a.box.h + ' 小于 44');
        assert.ok(Math.min(...m.rows.map((r) => r.box.h)) >= 44, why + '行高必须 ≥44');
        readings.push(width + 'px: scrollWidth ' + m.stageSw + ' ≤ clientWidth ' + m.stageCw
          + '｜行 ' + m.rows.length + ' 条，最小行高 ' + Math.min(...m.rows.map((r) => r.box.h)) + 'px'
          + '｜按钮 ' + m.acts.length + ' 枚，最小高 ' + Math.min(...m.acts.map((a) => a.box.h)) + 'px');
      }

      /* 窄档差异**只可能来自容器查询**：两档视口都是 1440 */
      await p.open(390);
      const narrow = await p.narrowAmt();
      assert.equal(narrow.align, 'left', '390 容器：金额另起一行、左对齐（@container 命中）');
      await p.open(1280);
      assert.equal((await p.narrowAmt()).align, 'right', '1280 容器：金额留在右端');

      /* 三态与读数：夹具里预勾了三行 ⇒ 底下那句是合计；按钮可点 */
      const m0 = await p.open(1280);
      assert.match(m0.roots[0].sum, /合计/, '夹具里预勾了三行 ⇒ 底下那句是合计');
      const acts0 = m0.acts.filter((a) => a.root === 0 && a.id === 'apply');
      assert.equal(acts0.length >= 1, true);
      assert.equal(acts0.every((a) => a.disabled === false), true, '勾着的时候主按钮可点');

      /* 全勾／取消全勾：点「全选」 */
      await p.clickAt('.ilife-block-multi-checks-all', 0);
      const mAll = await p.measure();
      assert.match(mAll.roots[0].count, /已选 6 \/ 6 条/, '全选之后计数到满档');
      assert.equal(mAll.roots[0].all.indeterminate, false, '全勾之后不得还停在半勾');
      const hitsAll = await p.hits();
      assert.ok(hitsAll.length >= 1 && hitsAll[hitsAll.length - 1].count === 6, '全选要派发一次 `ilife:checks-change`');
      await p.clickAt('.ilife-block-multi-checks-all', 0);
      const mNone = await p.measure();
      assert.match(mNone.roots[0].count, /已选 0 \/ 6 条/);
      assert.match(mNone.roots[0].sum, /一条都没勾/, '没勾时底下那句说明"为什么按不动"');
      assert.equal(mNone.acts.filter((a) => a.root === 0 && a.id === 'apply').every((a) => a.disabled), true, '没勾 ⇒ 主按钮 disabled');

      /* 组头：点一下把整组勾上；单条勾选让组头停到半勾 */
      await p.clickAt('.ilife-block-multi-checks-gh', 0);
      const mGroup = await p.measure();
      assert.match(mGroup.roots[0].count, /已选 3 \/ 6 条/, '组头勾上 ⇒ 本组三行全勾');
      await p.clickAt('.ilife-block-multi-checks-row', 3);
      const mRow = await p.measure();
      assert.match(mRow.roots[0].count, /已选 4 \/ 6 条/, '单条勾选 ⇒ 计数 +1');
      /* 计数的那个数必须与**屏上真的勾了哪几行**一致：单条勾选不许被"组头三态"那趟改写回去。 */
      assert.equal(mRow.rows.filter((r) => r.root === 0 && r.checked).length, 4, '计数与屏上勾选数必须一致');
      assert.equal(mRow.rows[3].checked, true);

      /* 动作按钮：勾着的时候可点，点了派发 `ilife:checks-action` 并带上选中的机器键 */
      await p.clickAt('[data-ilife-checks-action="apply"]', 0);
      const acts = await p.acts();
      assert.equal(acts.length, 1, '动作按钮必须派发一次事件');
      assert.equal(acts[0].action, 'apply');
      assert.deepEqual(acts[0].ids.slice().sort(), ['r1', 'r2', 'r3', 'r4'], '事件带选中的机器键');

      const outline = await p.focusOutline();
      assert.ok(outline.w >= 2 && outline.style !== 'none', '焦点描边不可见：' + JSON.stringify(outline));
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
      console.log('  [真机读数] ' + readings.join('\n  [真机读数] '));
      console.log('  [真机读数] 计数：' + mAll.roots[0].count + ' → ' + mNone.roots[0].count + ' → ' + mGroup.roots[0].count + ' → ' + mRow.roots[0].count
        + '；:focus-visible outline=' + outline.w + 'px ' + outline.style);
    } finally { p.close(); }
  });
});
