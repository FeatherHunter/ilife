/** numberStepper（组件 · 数量步进 · 形态 A「标准：加减＋常用值排」）· **判据件**。
 *
 *  断言对象是本件**自己的唯一出口**：`dist/components/number-stepper/index.js`
 *  （组件层不进冻结面、不从根出口；层出口 `base-paint/blocks` 那一行由接线席统一加）。
 *
 *  四类（契约 §五）＋ 本件特有的两条硬判据：
 *   ① **渲染契约**：三枚可点区／值位即入口／状态字四档／常用值选中态／转义面／**全部**非法入参走 `BlocksError`；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤（逐处与 `skinVar()` 的兜底链**逐字相同**）／scope 在
 *      `.ilife-page-ui` 之下／零 `:root`／零 `!important`／零自定义属性／宽度只由 `@container` 判／
 *      **触控目标 44 与相邻间距 8 是样式段里的常量**（真机起不来时的等价判据）／文字色过对比地板；
 *   ③ **加法式**：不挂本件时同页产物逐字节不变；
 *   ④ **真机两档**（headless Chrome ＋ CDP）：容器宽 **390 与 1280** 下零横向溢出、**每枚触控目标 ≥44×44**、
 *      相邻目标间距 ≥8px、数字不被挤／截，且加减／常用值／行内编辑器／越界拦截／禁用／更新中逐条真跑；
 *   ⑤ **皮肤矩阵**：三套皮肤下**标记逐字节相同**（换的只有样式段）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NUMBER_STEPPER_CLASS,
  NUMBER_STEPPER_EVENT_CHANGE,
  NUMBER_STEPPER_FORMS,
  NUMBER_STEPPER_GAP_PX,
  NUMBER_STEPPER_HIT_ATTR,
  NUMBER_STEPPER_MISSING,
  NUMBER_STEPPER_NAME_ATTR,
  NUMBER_STEPPER_TOUCH_PX,
  NUMBER_STEPPER_VALUE_ATTR,
  NUMBER_STEPPER_VALUE_MIN_PX,
  buildNumberStepperJs,
  formatStepperValue,
  numberStepperCss,
  renderNumberStepper,
} from '../dist/components/number-stepper/index.js';
import { SKINS, SKIN_NAMES, skinClass, skinCss, skinVar } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import * as root from '../dist/index.js';
import { sleep, startControlsPage } from './input-controls-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLS = NUMBER_STEPPER_CLASS;

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把「解释」当「规则」）。 */
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

/** 逐条选择器（`@` 开头的 prelude 不算选择器；嵌在 at-rule 里的规则照样抓得到）。 */
const selectorsOf = (css) => {
  const out = [];
  for (const m of stripComments(css).matchAll(/([^{}]*)\{/g)) {
    const sel = m[1].split('}').pop().trim();
    if (sel === '' || sel.startsWith('@')) continue;
    out.push(sel);
  }
  return out;
};

/** 一处 `var(--ilife-…)` 的边界：它必须与 `skinVar(名)` **逐字相同**（兜底链只许住在 `skin/contract.ts`）。 */
const skinVarSpans = (css) => {
  const spans = [];
  for (const m of css.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)) {
    const expected = skinVar(m[1]); // 名单外的名字会当场抛 BlocksError ⇒ 判据红，不静默兜底
    assert.ok(css.startsWith(expected, m.index),
      '`' + m[1] + '` 处的 var() 串与 skinVar() 走散：' + css.slice(m.index, m.index + 80));
    spans.push([m.index, m.index + expected.length]);
  }
  return spans;
};

/** 把若干区间从串里挖掉（用于「剥掉合法读法后还剩什么」）。 */
const cutSpans = (text, spans) => {
  let out = '';
  let at = 0;
  for (const [from, to] of spans) {
    out += text.slice(at, from);
    at = to;
  }
  return out + text.slice(at);
};

/* ── 夹具入参 ───────────────────────────────────────────────────────── */

/** 卡路里「份数」：原型 A 那一格的真实形状（0.5–6 份，step 0.5，四枚常用值）。 */
const PORTION = {
  name: 'portion',
  value: 1.5,
  min: 0.5,
  max: 6,
  step: 0.5,
  unit: '份',
  label: '份数',
  presets: [0.5, 1, 1.5, 2],
  caliber: '加减每次 0.5 份，范围 0.5–6 份；常用值点了直接落到那一档。',
};

/** 敌意形状：长单位 ＋ 大数 ＋ 长口径（零横向溢出与「数字不被挤」都靠它压出来）。 */
const HOSTILE = {
  name: 'gram',
  value: 999999,
  min: 0,
  max: 1000000,
  step: 1,
  unit: '毫摩尔每升当量克数',
  label: '库存下限用量（含包装折算与损耗）',
  presets: [0, 500000, 999999],
  caliber: '这一格按主料生重算，不含水与油；换单位会重算热量，不会改菜谱本身，缺值的那些天按 0 计。',
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('numberStepper ① 渲染契约', () => {
  it('基本形态：根类名／机器属性／三枚可点区（− n ＋）／单位／常用值选中态', () => {
    const html = renderNumberStepper(PORTION);
    assert.match(html, /^<div class="ilife-block-number-stepper is-standard/, '根类名与形态键：' + html.slice(0, 70));
    assert.ok(html.includes(NUMBER_STEPPER_NAME_ATTR + '="portion"'), '机器键落属性');
    assert.ok(html.includes(NUMBER_STEPPER_VALUE_ATTR + '="1.5"'), '机器值落属性');
    assert.ok(html.includes('data-ilife-stepper-min="0.5"') && html.includes('data-ilife-stepper-max="6"')
      && html.includes('data-ilife-stepper-step="0.5"'), '上下限与步长落属性（运行时读它们）');
    assert.ok(html.includes('data-ilife-stepper-decimals="1"'), '小数位由 step 推出来');
    const hits = [...html.matchAll(new RegExp(NUMBER_STEPPER_HIT_ATTR + '="([a-z]+)"', 'g'))].map((m) => m[1]);
    assert.deepEqual(hits.filter((h) => h === 'dec' || h === 'value' || h === 'inc'), ['dec', 'value', 'inc'],
      '三枚可点区按「− n ＋」的顺序在（第三个可点区是值位）');
    assert.ok(html.includes('aria-label="减 0.5 份"') && html.includes('aria-label="加 0.5 份"'), '两边键的读屏名带步长与单位');
    assert.match(html, /-value"[^>]*><b class="ilife-block-number-stepper-number">1\.5<\/b><small class="ilife-block-number-stepper-unit">份<\/small>/,
      '值位里是「值 ＋ 单位」，单位独立成一位');
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1, '当前值命中的常用值恰好一枚');
    assert.ok(html.includes('data-ilife-stepper-quick="1.5"'), '常用值带目标值');
    assert.ok(html.includes('常用'), '常用值那一排带小标签');
    assert.ok(html.includes('>加减每次 0.5 份'), '口径行上屏');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('状态字四档：已到下限／已到上限／未设置／（区间中不出这一行）——状态不只靠颜色', () => {
    assert.match(renderNumberStepper({ ...PORTION, value: 0.5 }), /data-ilife-stepper-state="已到下限"/);
    assert.match(renderNumberStepper({ ...PORTION, value: 6 }), /data-ilife-stepper-state="已到上限"/);
    assert.match(renderNumberStepper({ ...PORTION, value: null }), /data-ilife-stepper-state="未设置"/);
    assert.equal(renderNumberStepper(PORTION).includes('data-ilife-stepper-state'), false,
      '区间中间不出状态字（不留空签）');
    assert.match(renderNumberStepper({ ...PORTION, value: null }), new RegExp('>' + NUMBER_STEPPER_MISSING + '<'),
      '缺值写成 —（与 0 区分）');
  });

  it('禁用与更新中：禁用必须说明为什么；两者都不给可点区留下"看着能点"的中间档', () => {
    const dis = renderNumberStepper({ ...PORTION, disabled: true, disabledReason: '训练计划还没定，先定计划才能填份数' });
    assert.ok(dis.includes('data-ilife-stepper-disabled="1"'), '禁用落属性');
    assert.equal((dis.match(/ disabled/g) || []).length >= 3, true, '三枚可点区一起禁用');
    assert.ok(dis.includes('训练计划还没定'), '禁用原因上屏');
    assert.ok(dis.includes('aria-describedby="ilife-block-number-stepper-portion-error"'), '控件指得到那一行说明');
    const load = renderNumberStepper({ ...PORTION, loading: true });
    assert.ok(load.includes('data-ilife-stepper-loading="1"'), '更新中落属性');
    assert.match(load, /data-ilife-stepper-state="更新中"/, '更新中写在状态字位上（原地换字）');
    assert.equal((load.match(/ disabled/g) || []).length, 0, '更新中不落原生 disabled（由运行时段拦点击，防抖）');
    assert.ok(load.includes('aria-disabled="true"'), '更新中挂 aria-disabled');
  });

  it('缺槽不出那一槽：不给 presets／caliber／label／unit 时，那些槽一个字节都不出', () => {
    const bare = renderNumberStepper({ name: 'n', value: 2, min: 1, max: 3, step: 1 });
    /* 断的是**槽类**（不是裸子串：`aria-label` 里也含 `-label`，拿裸串断会把属性当槽位）。 */
    const hasSlot = (html, slot) => html.includes('"' + CLS + '-' + slot + '"');
    assert.equal(hasSlot(bare, 'quick'), false, '不给常用值 ⇒ 整排不出');
    assert.equal(hasSlot(bare, 'caliber'), false);
    assert.equal(hasSlot(bare, 'label'), false);
    assert.equal(hasSlot(bare, 'unit'), false);
    assert.equal(hasSlot(bare, 'state'), false, '区间中间没有状态字');
    assert.equal(hasSlot(renderNumberStepper({ name: 'n', value: 1, min: 1, max: 3, step: 1, presets: [] }), 'quick'),
      false, '空数组按「不给」处理（与区块层同口径）');
  });

  it('数字口径：显示字带千分位、去掉多余的 0；机器值不带千分位（显示与机器分离）', () => {
    assert.equal(formatStepperValue(1800, 0), '1,800');
    assert.equal(formatStepperValue(2, 1), '2');
    assert.equal(formatStepperValue(1.5, 1), '1.5');
    assert.equal(formatStepperValue(0.25, 2), '0.25');
    const html = renderNumberStepper({ ...HOSTILE, value: 999999 });
    assert.ok(html.includes('>999,999<') || html.includes('999,999'), '显示字分组');
    assert.ok(html.includes(NUMBER_STEPPER_VALUE_ATTR + '="999999"'), '机器值不带千分位');
  });

  it('转义：五个字符进实体，不进标记（名字／标签／单位／常用值／口径／错误／禁用原因逐位转义）', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderNumberStepper({
      name: evil, value: 1.5, min: 0.5, max: 6, step: 0.5, unit: evil, label: evil,
      caliber: evil, error: evil, disabled: false,
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.equal(/\son[a-z]+=/i.test(html), false, '不得出现内联事件处理器');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    const dis = renderNumberStepper({ ...PORTION, disabled: true, disabledReason: evil });
    assert.equal(/<script/i.test(dis), false, '禁用原因同样过转义');
  });

  it('形态键是闭集（闭集外一律 BlocksError），入参本体逐条拒', () => {
    assert.deepEqual([...NUMBER_STEPPER_FORMS], ['standard']);
    assert.ok(renderNumberStepper({ ...PORTION, form: 'standard' }).includes('is-standard'));
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, form: 'big' })), true);
    assert.equal(throwsBlocks(() => renderNumberStepper(undefined)), true);
    assert.equal(throwsBlocks(() => renderNumberStepper(null)), true);
    assert.equal(throwsBlocks(() => renderNumberStepper([])), true);
    assert.equal(throwsBlocks(() => renderNumberStepper('x')), true);
  });

  it('非法入参**逐条**走 BlocksError（不静默降级、不静默吸附）', () => {
    /* 名字 */
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, name: undefined })), true);
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, name: '' })), true);
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, name: 1 })), true);
    /* 值：缺席／非数／越界／不在格子上 */
    assert.equal(throwsBlocks(() => renderNumberStepper({ name: 'n', min: 0, max: 4, step: 1 })), true, 'value 缺席＝错');
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, value: 'x' })), true);
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, value: 7 })), true, '越上界');
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, value: 0 })), true, '越下界');
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, value: 1.7 })), true, '不在步长格子上');
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, value: Number.NaN })), true);
    /* 上下限与步长 */
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, min: undefined })), true);
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, max: undefined })), true);
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, step: undefined })), true);
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, step: 0 })), true);
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, step: -1 })), true);
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, max: 0.5 })), true, 'max ≤ min');
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, max: 6.2 })), true, 'max 不在格子上');
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, step: 0.0000001 })), true, '小数位超过 6 位');
    /* 常用值 */
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, presets: 1 })), true);
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, presets: [7] })), true, '常用值越界');
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, presets: [1.7] })), true, '常用值不在格子上');
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, presets: [1, 1] })), true, '常用值重复');
    /* 禁用／更新中／附加类名 */
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, disabled: true })), true, '禁用必须给原因');
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, disabled: 'yes' })), true);
    assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, loading: 1 })), true);
    for (const bad of ['a"b', 'x{y}', '.x', 'a b!']) {
      assert.equal(throwsBlocks(() => renderNumberStepper({ ...PORTION, extraClass: bad })), true, '拒：' + bad);
    }
    assert.match(renderNumberStepper({ ...PORTION, extraClass: 'ok-1 other' }), /is-standard ok-1 other"/);
  });

  it('纯函数：同入参两次逐字节相同（页面产物可缓存、可对账）', () => {
    assert.equal(renderNumberStepper(PORTION), renderNumberStepper(PORTION));
    assert.notEqual(renderNumberStepper(PORTION), renderNumberStepper(HOSTILE));
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('numberStepper ② 样式纪律', () => {
  const css = stripComments(numberStepperCss());

  it('样式段非空，且**全部**规则 scope 在 `.ilife-page-ui` 与本件根类之下', () => {
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 20, '本件规则数不对：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器没 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes('.' + CLS), '选择器必须挂在件根类之下：' + sel);
    }
  });

  it('零 `:root`／零 `!important`／零自定义属性／不用禁入 token', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.equal(css.includes('--r-xl'), false);
    assert.equal(css.includes('--pink'), false);
    const decls = css.match(/--[a-z0-9-]+\s*:/g) || [];
    assert.equal(decls.length, 0, '不得定义任何自定义属性：' + decls.join(' '));
  });

  it('**只经 `skinVar()` 读皮肤**：每一处 var() 都与 skinVar() 逐字相同，剥掉它后不剩一个 var()', () => {
    const spans = skinVarSpans(css);
    assert.ok(spans.length >= 8, '读皮肤的处数不对（判据可能空转）：' + spans.length);
    const rest = cutSpans(css, spans);
    assert.equal(rest.includes('var(--'), false, '手写了 var(--…)（兜底链只许住 skin/contract.ts）：'
      + rest.slice(Math.max(0, rest.indexOf('var(--') - 40), rest.indexOf('var(--') + 60));
  });

  it('**触控目标与间距是样式段里的常量**（真机起不来时的等价判据 ＋ 几何地板）', () => {
    assert.equal(NUMBER_STEPPER_TOUCH_PX, 44);
    assert.equal(NUMBER_STEPPER_GAP_PX, 8);
    assert.ok(css.includes('height: ' + String(NUMBER_STEPPER_TOUCH_PX) + 'px;'), '键高取常量 44');
    assert.ok(css.includes('width: ' + String(NUMBER_STEPPER_TOUCH_PX) + 'px;'), '键宽取常量 44');
    assert.ok(css.includes('gap: ' + String(NUMBER_STEPPER_GAP_PX) + 'px;'), '相邻目标留 8px 缝');
    assert.ok(css.includes('min-height: ' + String(NUMBER_STEPPER_TOUCH_PX) + 'px;'), '常用值也是 44 高');
    assert.ok(css.includes('min-width: ' + String(NUMBER_STEPPER_VALUE_MIN_PX) + 'px;'), '值位最小宽度钉住整排');
    assert.ok(css.includes('min-width: 5em;'), '状态字宽度锁住（四档词长短不一也不跳版）');
  });

  it('**宽度只许容器判**：本件自己是容器，`@media` 只判设备能力（没有一处判宽度）', () => {
    assert.match(css, /container-type: inline-size;/, '本件必须自己是容器');
    const at = [...numberStepperCss().matchAll(/@container \(([^)]*)\)/g)].map((m) => m[1]);
    assert.equal(at.length, 1, '容器查询数不对：' + at.join('｜'));
    assert.match(at[0], /^max-width: \d+px$/, '容器查询只许判宽度：' + at[0]);
    const medias = [...numberStepperCss().matchAll(/@media ([^{]*)\{/g)].map((m) => m[1].trim());
    assert.ok(medias.length >= 2, '两条设备能力查询（hover／reduced-motion）应在：' + medias.join('｜'));
    for (const m of medias) {
      assert.equal(/max-width|min-width/.test(m), false, '媒体查询只许判设备能力，不许判宽度：' + m);
      assert.ok(/hover|pointer|prefers-reduced-motion/.test(m), '媒体查询判的不是设备能力：' + m);
    }
  });

  it('**不许 `…` 截断**：样式段里没有截断手段，长串一律换行', () => {
    for (const bad of ['text-overflow', 'line-clamp', 'overflow: hidden', 'overflow-x: hidden']) {
      assert.equal(css.includes(bad), false, '出现了截断手段：' + bad);
    }
    assert.equal((css.match(/overflow-wrap: anywhere/g) || []).length >= 5, true, '长串折行覆盖不足');
    assert.equal(css.includes('min-width: 0;'), true, 'flex/grid 子件必须 min-width: 0（防压字）');
  });

  it('焦点地板：`:focus-visible` 有 ≥2px 可见描边，且没有「只写 outline:none」', () => {
    assert.match(css, /:focus-visible \{/);
    assert.match(css, /outline: 2px solid /);
    assert.equal(/outline:\s*(none|0)/.test(css), false);
  });

  it('状态矩阵齐：hover 只包在设备能力里、active 只动 transform（80ms）、禁用有 not-allowed、更新中有 progress', () => {
    const media = css.slice(css.indexOf('@media (hover:hover)'));
    assert.ok(css.includes('@media (hover:hover) and (pointer:fine) {'), 'hover 必须包在设备能力查询里');
    assert.ok(media.includes(':hover:not([disabled])'), 'hover 不许是唯一通路（要带 not([disabled])）');
    assert.match(css, /transform: scale\(\.98\)/, '真按下有 scale(.98)');
    assert.match(css, /transition: transform 80ms/, '按下反馈 ≤80ms');
    assert.match(css, /cursor: not-allowed;/, '禁用有 not-allowed');
    assert.match(css, /cursor: progress;/, '更新中有 progress');
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)/, '减动效档在');
  });

  it('文字色过对比地板（算出来不靠眼看）：三套皮肤下都 ≥4.5:1', () => {
    const luminance = (hex) => {
      const h = hex.replace('#', '');
      const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      const ch = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
      const lin = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    };
    const contrast = (a, b) => {
      const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    for (const name of SKIN_NAMES) {
      for (const t of ['ink', 'ink-2', 'ink-3', 'danger']) {
        for (const g of ['ground', 'surface', 'surface-2']) {
          const ratio = contrast(SKINS[name].values[t], SKINS[name].values[g]);
          assert.ok(ratio >= 4.5, name + '：' + t + ' 在 ' + g + ' 上只有 ' + ratio.toFixed(2) + ':1');
        }
      }
    }
    /* 实际用到的文字色只许这四档（`accent-ink` 是实心底上的字，另算）。 */
    const used = new Set([...css.matchAll(/(?:^|[;\s])color: ([^;]+);/g)].map((m) => m[1].trim()));
    for (const value of used) {
      assert.ok(value === skinVar('accent-ink') || ['ink', 'ink-2', 'ink-3', 'danger'].some((t) => value === skinVar(t)),
        '文字色只许取 ink／ink-2／ink-3／danger／accent-ink：' + value);
    }
  });

  it('层红线：`dist/components/number-stepper/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'number-stepper');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 6, '编译产物不全：' + files.length);
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

  it('缺省前缀 `ilife-`；换前缀时 scope 与槽类**一起**换', () => {
    assert.match(numberStepperCss(), /^\.ilife-page-ui \.ilife-block-number-stepper \{/m);
    const x = stripComments(numberStepperCss({ prefix: 'x-' }));
    assert.ok(x.includes('.x-page-ui .x-block-number-stepper {'));
    assert.ok(x.includes('.x-block-number-stepper-number'));
    assert.equal(x.includes('.ilife-'), false, '换前缀后不许残留旧前缀');
  });
});

/* ── ③ 加法式（不挂这件＝零变化）＋ ⑤ 皮肤矩阵 ─────────────────────── */

describe('numberStepper ③ 加法式（opt-in：不挂这件＝零变化）', () => {
  it('不挂本件的页：产物里一个本件字节都没有，两次渲染逐字节相同', () => {
    const shell = () => renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const off = shell();
    assert.equal(off.includes(CLS), false, '不挂本件时不得出现它的类名');
    assert.equal(off.includes(NUMBER_STEPPER_EVENT_CHANGE), false, '运行时也不得随页挂上');
    assert.equal(off, shell(), '两次渲染逐字节相同');
  });

  it('挂了本件的页＝原页 ＋ 本件那一段（页壳其余部分逐字节不变）', () => {
    const off = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const body = '<p>x</p>' + renderNumberStepper(PORTION);
    const on = renderDocShell({ docTitle: 'T', bodyHtml: body, extraCss: numberStepperCss() + buildNumberStepperJs() });
    assert.ok(on.includes(CLS), '挂上后类名在');
    assert.ok(on.includes('.ilife-page-ui .ilife-block-number-stepper'), '样式段随页挂上');
    assert.ok(on.indexOf(off.slice(0, 200)) === 0, '页壳头部逐字节不变');
  });

  it('出口唯一：本件不从根出口出；层出口若已转出，必须是**同一个**实现', () => {
    assert.equal(typeof renderNumberStepper, 'function');
    assert.equal(root.renderNumberStepper, undefined, '组件层不得从根出口出（冻结面签名不许动）');
  });
});

describe('numberStepper ⑤ 皮肤矩阵（三套皮肤下标记逐字节相同）', () => {
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderNumberStepper(PORTION) + '</div>';
  const withoutSkin = (name) => pageOf(name)
    .replace(skinCss({ skins: [name] }), '')
    .replace(skinClass(name), '');

  it('三套皮肤：差异只落在皮肤样式段与皮肤类上，标记面逐字节相同', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(renderNumberStepper(PORTION)), '挖掉皮肤后标记必须原样在');
    for (const name of SKIN_NAMES) {
      assert.equal(withoutSkin(name), bare, name + ' 的标记面与 ' + SKIN_NAMES[0] + ' 不同');
    }
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[1]), '两套皮肤的页产物必须真的不同（否则这条判据空转）');
    assert.equal(renderNumberStepper(PORTION).includes('skin-'), false, '标记里不许自带皮肤类（皮肤是页面挂的）');
  });
});

/* ── ④ 真机两档（headless Chrome ＋ CDP）───────────────────────────── */

const WIDTHS = [390, 1280];

/** 夹具：真实形状 ＋ 敌意形状 ＋ 禁用 ＋ 更新中 ＋ 缺值（一页里五种都上，页面级读数才有意义）。 */
function fixture() {
  return renderNumberStepper(PORTION)
    + renderNumberStepper(HOSTILE)
    + renderNumberStepper({ ...PORTION, name: 'locked', value: 2, disabled: true, disabledReason: '训练计划还没定，先定计划才能填份数' })
    + renderNumberStepper({ ...PORTION, name: 'busy', value: 1, loading: true })
    + renderNumberStepper({ ...PORTION, name: 'unset', value: null });
}

const q = (attr, name) => JSON.stringify('[' + attr + '="' + name + '"]');
const sel = (name) => q(NUMBER_STEPPER_NAME_ATTR, name);

/** 页内读数：容器 ＋ 每件的溢出／触控目标／数字不被挤／状态字。 */
const MEASURE = '(function(){'
  + 'var stage=document.querySelector(".stage");'
  + 'function box(el){var r=el.getBoundingClientRect();return {l:r.left,r:r.right,w:r.width,h:r.height,t:r.top,b:r.bottom};}'
  + 'var roots=[].slice.call(document.querySelectorAll(' + JSON.stringify('.' + CLS) + '));'
  + 'var out={stageSw:stage.scrollWidth,stageCw:stage.clientWidth,stage:box(stage),'
  + 'docSw:document.documentElement.scrollWidth,docCw:document.documentElement.clientWidth,'
  + 'ellipsis:document.body.innerText.indexOf("\\u2026")>=0,roots:[]};'
  + 'for(var i=0;i<roots.length;i++){'
  + 'var root=roots[i];'
  + 'var hits=[].slice.call(root.querySelectorAll(' + JSON.stringify('[' + NUMBER_STEPPER_HIT_ATTR + ']') + ')).map(function(h){'
  + 'return {kind:h.getAttribute(' + JSON.stringify(NUMBER_STEPPER_HIT_ATTR) + '),box:box(h),'
  + 'disabled:h.hasAttribute("disabled"),aria:h.getAttribute("aria-disabled"),'
  + 'focusable:h.getAttribute("tabindex")};});'
  + 'var number=root.querySelector(' + JSON.stringify('.' + CLS + '-number') + ');'
  + 'var state=root.querySelector(' + JSON.stringify('[data-ilife-stepper-state]') + ');'
  + 'out.roots.push({name:root.getAttribute(' + JSON.stringify(NUMBER_STEPPER_NAME_ATTR) + '),'
  + 'sw:root.scrollWidth,cw:root.clientWidth,box:box(root),value:root.getAttribute(' + JSON.stringify(NUMBER_STEPPER_VALUE_ATTR) + '),'
  + 'state:state?state.textContent:"",hits:hits,'
  + 'number:{box:box(number),sw:number.scrollWidth,cw:number.clientWidth,text:number.textContent}});}'
  + 'return out;}())';

describe('numberStepper ④ 真机两档（390／1280 容器；视口恒 1440）', () => {
  it('零横向溢出 ＋ 每枚触控目标 ≥44×44 ＋ 相邻目标间距 ≥8px ＋ 数字不被挤', async (t) => {
    const p = await startControlsPage({
      css: skinCss() + '\n' + numberStepperCss(), runtime: buildNumberStepperJs(),
      body: fixture(), events: [NUMBER_STEPPER_EVENT_CHANGE],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium：真机两条退化为 ② 的确定性几何判据');
    try {
      const readings = [];
      for (const width of WIDTHS) {
        const m = await p.at(width, MEASURE);
        const why = width + 'px 容器：';
        assert.ok(m.docSw <= m.docCw, why + '页面横向溢出 doc ' + m.docSw + ' > ' + m.docCw);
        assert.ok(m.stageSw <= m.stageCw, why + '容器横向溢出 ' + m.stageSw + ' > ' + m.stageCw);
        assert.equal(m.ellipsis, false, why + '页面上出现了省略号');
        assert.equal(m.roots.length, 5, why + '夹具应有五件');
        for (const r of m.roots) {
          assert.ok(r.sw <= r.cw, why + r.name + ' 横向溢出 ' + r.sw + ' > ' + r.cw);
          /* 本件根带 1px 发丝线边：clientWidth ＝ 容器宽 − 2，量**边框盒**才是"占满容器"。 */
          assert.ok(Math.abs(r.box.w - width) <= 1, why + r.name + ' 的边框盒宽不是 ' + width + '：' + r.box.w);
          assert.ok(Math.abs(r.cw - (width - 2)) <= 1, why + r.name + ' 的内宽不是 ' + (width - 2) + '：' + r.cw);
          assert.ok(r.box.r <= m.stage.r + 1, why + r.name + ' 右缘越过容器');
          assert.ok(r.number.sw <= r.number.cw + 1, why + r.name + ' 的数字被挤（' + r.number.sw + ' > ' + r.number.cw + '）');
          assert.ok(r.number.box.h >= 12, why + r.name + ' 的数字没有真实行盒（高 ' + r.number.box.h + '）');
          /* 值位是第三个可点区：最小宽度把整排钉住（数字位数变了也不跳版）。 */
          const valBox = r.hits.find((h) => h.kind === 'value');
          assert.ok(valBox.box.w >= NUMBER_STEPPER_VALUE_MIN_PX - 1,
            why + r.name + ' 的值位宽 ' + valBox.box.w + ' 小于最小宽 ' + NUMBER_STEPPER_VALUE_MIN_PX);
          /* 每枚触控目标 ≥44×44 */
          for (const h of r.hits) {
            assert.ok(Math.round(h.box.w) >= 44 && Math.round(h.box.h) >= 44,
              why + r.name + ' 的 ' + h.kind + ' 触控目标 ' + h.box.w + '×' + h.box.h + ' 小于 44×44');
          }
          /* 相邻触控目标间距 ≥8px（− 与值位、值位与 ＋） */
          const dec = r.hits.find((h) => h.kind === 'dec');
          const val = r.hits.find((h) => h.kind === 'value');
          const inc = r.hits.find((h) => h.kind === 'inc');
          assert.ok(val.box.l - dec.box.r >= 8 - 0.5, why + r.name + '：− 与值位间距 ' + (val.box.l - dec.box.r));
          assert.ok(inc.box.l - val.box.r >= 8 - 0.5, why + r.name + '：值位与 ＋ 间距 ' + (inc.box.l - val.box.r));
        }
        const base = m.roots[0];
        readings.push(width + 'px: scrollWidth ' + m.stageSw + ' ≤ clientWidth ' + m.stageCw
          + '｜键 ' + Math.round(base.hits[0].box.w) + '×' + Math.round(base.hits[0].box.h)
          + '，值位 ' + Math.round(base.hits[1].box.w) + '×' + Math.round(base.hits[1].box.h)
          + '，相邻间距 ' + Math.round(base.hits[1].box.l - base.hits[0].box.r) + 'px'
          + '｜数字 ' + Math.round(base.number.box.w) + 'px 宽（文本 ' + base.number.text + '）');
      }
      console.log('  [真机读数] ' + readings.join('\n  [真机读数] '));
    } finally { p.close(); }
  });

  it('加减／常用值／行内编辑器／越界拦截／禁用／更新中逐条真跑', async (t) => {
    const p = await startControlsPage({
      css: skinCss() + '\n' + numberStepperCss(), runtime: buildNumberStepperJs(),
      body: fixture(), events: [NUMBER_STEPPER_EVENT_CHANGE],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      await p.at(WIDTHS[0], 'true');
      const inside = (name, kind) => JSON.stringify('[' + NUMBER_STEPPER_NAME_ATTR + '="' + name + '"] ['
        + NUMBER_STEPPER_HIT_ATTR + '="' + kind + '"]');
      const click = (name, kind) => 'document.querySelector(' + inside(name, kind) + ').click()';
      const valueOf = (name) => 'document.querySelector(' + sel(name) + ').getAttribute('
        + JSON.stringify(NUMBER_STEPPER_VALUE_ATTR) + ')';
      const stateOf = (name) => '(function(){var r=document.querySelector(' + sel(name) + ');'
        + 'var s=r.querySelector(' + JSON.stringify('[data-ilife-stepper-state]') + ');return s?s.textContent:"";}())';
      const disabledOf = (name, kind) => 'document.querySelector(' + inside(name, kind) + ').hasAttribute("disabled")';

      /* 加减：各一档，事件逐条落账（等的是"这一格真变了"，不是固定毫秒——全包并行跑时机器很忙） */
      assert.equal(await p.ev(valueOf('portion')), '1.5');
      await p.ev(click('portion', 'inc'));
      assert.equal(await p.until(valueOf('portion'), '2'), '2', '＋ 走一档');
      await p.ev(click('portion', 'dec'));
      assert.equal(await p.until(valueOf('portion'), '1.5'), '1.5', '− 走一档');
      assert.equal((await p.events(NUMBER_STEPPER_EVENT_CHANGE))[0].value, 2, '变更事件带新值');
      assert.equal((await p.events(NUMBER_STEPPER_EVENT_CHANGE))[0].prev, 1.5, '变更事件带改前值');
      assert.equal((await p.events(NUMBER_STEPPER_EVENT_CHANGE)).length, 2, '两次真变两条事件');

      /* 常用值：点一下落到那一档 */
      await p.ev(click('portion', 'preset') /* 第一枚＝0.5 */);
      assert.equal(await p.until(valueOf('portion'), '0.5'), '0.5', '常用值落到那一档');
      assert.equal(await p.ev(stateOf('portion')), '已到下限', '到下限给状态字');
      assert.equal(await p.ev(disabledOf('portion', 'dec')), true, '到下限时 − 落 disabled');

      /* 行内编辑器：同一格里换 input，且进出不跳版 */
      const geomOf = (name) => '(function(){var r=document.querySelector(' + sel(name) + ');'
        + 'var v=r.querySelector(' + JSON.stringify('.' + CLS + '-value') + ');'
        + 'var e=r.querySelector(' + JSON.stringify('.' + CLS + '-editor') + ');'
        + 'function b(x){if(!x)return null;var q=x.getBoundingClientRect();return [Math.round(q.left),Math.round(q.width),Math.round(q.height)];}'
        + 'return {root:[Math.round(r.getBoundingClientRect().width)],value:b(v),editor:b(e)};}())';
      const before = await p.ev(geomOf('portion'));
      assert.equal(before.editor, null, '默认没有编辑器');
      await p.ev(click('portion', 'value'));
      assert.equal(await p.until('document.querySelector(' + JSON.stringify('.' + CLS + '-editor') + ')!==null', true), true,
        '点值位开出编辑器');
      const editing = await p.ev(geomOf('portion'));
      assert.equal(before.root[0], editing.root[0], '进出编辑不得改变件宽');
      assert.equal(editing.value[2], 0, '编辑期值位收起（盒高 0）');
      assert.ok(editing.editor !== null && editing.editor[1] >= before.value[1] - 1 && editing.editor[2] === before.value[2],
        '编辑器与值位同盒模型（宽不小于值位、高相等）：' + JSON.stringify([before.value, editing.editor]));

      /* 越界拦截：留在编辑态 ＋ 写在控件旁边的错误行 ＋ aria-describedby */
      await p.ev('(function(){var i=document.querySelector(' + JSON.stringify('.' + CLS + '-editor') + ');'
        + 'i.value="99";i.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));return true}())');
      assert.equal(await p.until('(function(){var r=document.querySelector(' + sel('portion') + ');'
        + 'return !!r.querySelector(' + JSON.stringify('.' + CLS + '-error') + ');}())', true), true, '错误行出现');
      const err = await p.ev('(function(){var r=document.querySelector(' + sel('portion') + ');'
        + 'var e=r.querySelector(' + JSON.stringify('.' + CLS + '-error') + ');'
        + 'var i=r.querySelector(' + JSON.stringify('.' + CLS + '-editor') + ');'
        + 'return {editing:r.getAttribute("data-ilife-stepper-editing")==="1",text:e?e.textContent:"",'
        + 'described:i?i.getAttribute("aria-describedby"):null,invalid:i?i.getAttribute("aria-invalid"):null};}())');
      assert.equal(err.editing, true, '越界值留在编辑态');
      assert.ok(err.text.includes('99') || err.text.includes('不能大于'), '错误说明写在控件旁边：' + err.text);
      assert.equal(err.invalid, 'true', '编辑器落 aria-invalid');
      assert.ok(err.described !== null && err.described.length > 0, '错误行被 aria-describedby 指到');

      /* Esc 取消：值不动、编辑态收起 */
      const beforeCancel = (await p.events(NUMBER_STEPPER_EVENT_CHANGE)).length;
      await p.ev('(function(){var i=document.querySelector(' + JSON.stringify('.' + CLS + '-editor') + ');'
        + 'i.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));return true}())');
      await sleep(80);
      assert.equal(await p.ev(valueOf('portion')), '0.5', 'Esc 后值不动');
      assert.equal((await p.events(NUMBER_STEPPER_EVENT_CHANGE)).length, beforeCancel, 'Esc 不派发变更');

      /* 合法输入提交 */
      await p.ev(click('portion', 'value'));
      assert.equal(await p.until('document.querySelector(' + JSON.stringify('.' + CLS + '-editor') + ')!==null', true), true,
        '再次开出编辑器');
      await p.ev('(function(){var i=document.querySelector(' + JSON.stringify('.' + CLS + '-editor') + ');'
        + 'i.value="2.5";i.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));return true}())');
      assert.equal(await p.until(valueOf('portion'), '2.5'), '2.5', '编辑器提交合法值');
      assert.equal(await p.ev(stateOf('portion')), '', '回到区间中间 ⇒ 状态字收起');
      assert.equal(await p.ev(disabledOf('portion', 'dec')), false, '离开下限 ⇒ − 恢复可点');

      /* 缺值：按任一加减键从下限起算 */
      assert.equal(await p.ev(valueOf('unset')), '', '缺值的机器值是空串');
      await p.ev(click('unset', 'inc'));
      await sleep(60);
      assert.equal(await p.ev(valueOf('unset')), '0.5', '从缺值按 ＋ 落到下限');

      /* 禁用：三枚都点不动，且没有派发 */
      const beforeLocked = (await p.events(NUMBER_STEPPER_EVENT_CHANGE)).length;
      await p.ev(click('locked', 'inc'));
      await p.ev(click('locked', 'preset'));
      await sleep(60);
      assert.equal(await p.ev(valueOf('locked')), '2', '禁用件点了不动');
      assert.equal((await p.events(NUMBER_STEPPER_EVENT_CHANGE)).length, beforeLocked, '禁用件不派发');

      /* 更新中：一律不响应（原地换字期间防抖） */
      await p.ev(click('busy', 'inc'));
      await p.ev(click('busy', 'preset'));
      await sleep(60);
      assert.equal(await p.ev(valueOf('busy')), '1', '更新中不响应点击');
      assert.equal(await p.ev(stateOf('busy')), '更新中', '更新中的状态字在');

      /* 焦点地板（真机）：强制 `:focus-visible` 后描边必须看得见 */
      const outline = await p.focusOutline('[' + NUMBER_STEPPER_NAME_ATTR + '="portion"] ['
        + NUMBER_STEPPER_HIT_ATTR + '="inc"]');
      assert.ok(outline.w >= 2 && outline.style !== 'none', '焦点描边不可见：' + JSON.stringify(outline));

      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
