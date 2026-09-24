/** sliderRow（组件 · 滑块行 · 形态 A「滑块＋常用档＋加减」）· **判据件**。
 *
 *  断言对象是本件**自己的唯一出口**：`dist/components/slider-row/index.js`
 *  （组件层不进冻结面、不从根出口；层出口 `base-paint/blocks` 那一行由接线席统一加）。
 *
 *  四类（契约 §五）＋ 本件特有的两条硬判据：
 *   ① **渲染契约**：右侧大数字／轨道（底＋已填＋原生 `range`）／两端键与常用档／状态字四档／
 *      转义面／**全部**非法入参走 `BlocksError`；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤／scope 在 `.ilife-page-ui` 之下／零 `:root`／
 *      零 `!important`／零自定义属性／宽度只由 `@container` 判／**触控目标 44 与间距 8 是样式段里的常量**；
 *   ③ **加法式**：不挂本件时同页产物逐字节不变；
 *   ④ **真机两档**（headless Chrome ＋ CDP）：容器宽 **390 与 1280** 下零横向溢出、每枚触控目标 ≥44×44、
 *      相邻间距 ≥8px、右侧大数字不被挤／截，且「拖动只同步读数不派发、落定才派发」真跑；
 *   ⑤ **皮肤矩阵**：三套皮肤下**标记逐字节相同**（换的只有样式段）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SLIDER_ROW_CLASS,
  SLIDER_ROW_EVENT_CHANGE,
  SLIDER_ROW_FORMS,
  SLIDER_ROW_GAP_PX,
  SLIDER_ROW_HIT_ATTR,
  SLIDER_ROW_LINE_PX,
  SLIDER_ROW_MISSING,
  SLIDER_ROW_NAME_ATTR,
  SLIDER_ROW_THUMB_PX,
  SLIDER_ROW_TOUCH_PX,
  SLIDER_ROW_TRACK_PX,
  SLIDER_ROW_VALUE_ATTR,
  buildSliderRowJs,
  fillPercent,
  formatSliderValue,
  renderSliderRow,
  sliderRowCss,
} from '../dist/components/slider-row/index.js';
import { SKINS, SKIN_NAMES, skinClass, skinCss, skinVar } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import * as root from '../dist/index.js';
import { sleep, startControlsPage } from './input-controls-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLS = SLIDER_ROW_CLASS;

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
    assert.ok(css.startsWith(expected, m.index),
      '`' + m[1] + '` 处的 var() 串与 skinVar() 走散：' + css.slice(m.index, m.index + 80));
    spans.push([m.index, m.index + expected.length]);
  }
  return spans;
};

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

/** 卡路里「热量目标」：原型 A 那一格的真实形状（1,200–3,000 卡，step 50，四档常用值）。 */
const CALORIE = {
  name: 'calorieGoal',
  value: 1800,
  min: 1200,
  max: 3000,
  step: 50,
  unit: '卡',
  label: '热量目标',
  presets: [1500, 1800, 2000, 2400],
  caliber: '区间 1,200–3,000 卡；常用四档是按目标体重算出来的推荐值。',
};

/** 敌意形状：长单位 ＋ 大数 ＋ 长口径（零横向溢出与「大数字不被挤」都靠它压出来）。 */
const HOSTILE = {
  name: 'budget',
  value: 9999999,
  min: 0,
  max: 10000000,
  step: 1,
  unit: '元（含全部子账户与分期在外）',
  label: '本月预算（含分期摊销与预估退款冲抵）',
  presets: [0, 5000000, 9999999],
  caliber: '预算按月滚动，未花完的不结转；分期按每期应还额落到当月，退款冲抵原分类而不单列一类。',
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('sliderRow ① 渲染契约', () => {
  it('基本形态：根类名／机器属性／右侧大数字／轨道（底＋已填＋原生 range）／两端键／常用档', () => {
    const html = renderSliderRow(CALORIE);
    assert.match(html, /^<div class="ilife-block-slider-row is-track/, '根类名与形态键：' + html.slice(0, 70));
    assert.ok(html.includes(SLIDER_ROW_NAME_ATTR + '="calorieGoal"'), '机器键落属性');
    assert.ok(html.includes(SLIDER_ROW_VALUE_ATTR + '="1800"'), '机器值落属性');
    assert.ok(html.includes('data-ilife-slider-min="1200"') && html.includes('data-ilife-slider-max="3000"')
      && html.includes('data-ilife-slider-step="50"'), '区间与步长落属性');
    assert.match(html, /-head">.*-label">热量目标<\/span>.*-value"[^>]*>.*<b class="ilife-block-slider-row-number">1,800<\/b>/,
      '大数字在 head 里、跟在标签之后（右侧那一枚）');
    assert.ok(html.includes('<small class="ilife-block-slider-row-unit">卡</small>'), '单位独立成一位');
    assert.ok(html.includes('-base" aria-hidden="true">') && html.includes('-fill" aria-hidden="true" style="width: '),
      '轨道自绘「底 ＋ 已填」两条（已填宽度内联写死）');
    assert.ok(html.includes('style="width: 33.3%"'), '1,800 在 1,200–3,000 里的位置＝33.3%');
    assert.match(html, /<input class="ilife-block-slider-row-input"[^>]*type="range"[^>]*value="1800"/,
      '轨道上是原生 range（键盘与读屏器走原生语义）');
    assert.ok(html.includes('aria-valuetext="1,800 卡"'), '原生控件带给人看的读数');
    const hits = [...html.matchAll(new RegExp(SLIDER_ROW_HIT_ATTR + '="([a-z]+)"', 'g'))].map((m) => m[1]);
    assert.deepEqual(hits.filter((h) => h === 'dec' || h === 'inc'), ['dec', 'inc'], '两端各一枚走一档的键');
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1, '当前值命中的常用档恰好一枚');
    assert.ok(html.includes('data-ilife-slider-preset="1800"'), '常用档带目标值');
    assert.ok(html.includes('>区间 1,200–3,000 卡'), '口径行上屏');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('状态字四档：未设置／已到下限／已到上限／（区间中不出）与更新中', () => {
    assert.match(renderSliderRow({ ...CALORIE, value: null }), /data-ilife-slider-state="未设置"/);
    assert.match(renderSliderRow({ ...CALORIE, value: 1200 }), /data-ilife-slider-state="已到下限"/);
    assert.match(renderSliderRow({ ...CALORIE, value: 3000 }), /data-ilife-slider-state="已到上限"/);
    assert.equal(renderSliderRow(CALORIE).includes('data-ilife-slider-state'), false, '区间中间不出状态字');
    assert.match(renderSliderRow({ ...CALORIE, loading: true }), /data-ilife-slider-state="更新中"/);
    assert.match(renderSliderRow({ ...CALORIE, value: null }), new RegExp('>' + SLIDER_ROW_MISSING + '<'),
      '未设置写 —（与 0 区分）');
  });

  it('禁用必须说明为什么；更新中不落原生 disabled（由运行时段拦输入，防抖）', () => {
    const dis = renderSliderRow({ ...CALORIE, disabled: true, disabledReason: '还没定训练计划，先定计划才能设热量目标' });
    assert.ok(dis.includes('data-ilife-slider-disabled="1"'), '禁用落属性');
    assert.ok(dis.includes('还没定训练计划'), '禁用原因上屏');
    assert.ok(dis.includes('aria-describedby="ilife-block-slider-row-calorieGoal-error"'), '控件指得到那一行说明');
    assert.ok(dis.includes('<input') && dis.includes(' disabled'), '轨道也禁用');
    const load = renderSliderRow({ ...CALORIE, loading: true });
    assert.equal(load.includes(' disabled'), false, '更新中不落原生 disabled');
    assert.ok(load.includes('aria-disabled="true"'), '更新中挂 aria-disabled');
  });

  it('缺槽不出那一槽：不给 presets／caliber／label／unit 时那些槽一个字节都不出', () => {
    const bare = renderSliderRow({ name: 'n', value: 2, min: 0, max: 4, step: 1 });
    const hasSlot = (html, slot) => html.includes('"' + CLS + '-' + slot + '"');
    assert.equal(hasSlot(bare, 'presets'), false);
    assert.equal(hasSlot(bare, 'caliber'), false);
    assert.equal(hasSlot(bare, 'label'), false);
    assert.equal(hasSlot(bare, 'unit'), false);
    assert.equal(hasSlot(bare, 'state'), false, '区间中间没有状态字');
    assert.equal(hasSlot(renderSliderRow({ name: 'n', value: 1, min: 0, max: 4, step: 1, presets: [] }), 'presets'),
      false, '空数组按「不给」处理');
  });

  it('数字口径：大数字带千分位、去掉多余的 0；机器值不带千分位；已填比例是固定点数', () => {
    assert.equal(formatSliderValue(1800, 0), '1,800');
    assert.equal(formatSliderValue(1800.5, 1), '1,800.5');
    assert.equal(formatSliderValue(2, 1), '2');
    assert.equal(fillPercent(333), '33.3');
    assert.equal(fillPercent(1000), '100');
    const html = renderSliderRow(HOSTILE);
    assert.ok(html.includes('9,999,999'), '大数字分组');
    assert.ok(html.includes(SLIDER_ROW_VALUE_ATTR + '="9999999"'), '机器值不带千分位');
  });

  it('转义：五个字符进实体，不进标记（名字／标签／单位／口径／错误／禁用原因逐位转义）', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderSliderRow({
      name: evil, value: 2, min: 0, max: 4, step: 1, unit: evil, label: evil, caliber: evil, error: evil,
    });
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.equal(/<script/i.test(renderSliderRow({ ...CALORIE, disabled: true, disabledReason: evil })), false);
  });

  it('形态键是闭集（闭集外一律 BlocksError），入参本体逐条拒', () => {
    assert.deepEqual([...SLIDER_ROW_FORMS], ['track']);
    assert.ok(renderSliderRow({ ...CALORIE, form: 'track' }).includes('is-track'));
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, form: 'double' })), true);
    for (const bad of [undefined, null, [], 'x']) {
      assert.equal(throwsBlocks(() => renderSliderRow(bad)), true, '拒：' + String(bad));
    }
  });

  it('非法入参**逐条**走 BlocksError（不静默降级、不静默吸附）', () => {
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, name: undefined })), true);
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, name: '' })), true);
    assert.equal(throwsBlocks(() => renderSliderRow({ name: 'n', min: 0, max: 4, step: 1 })), true, 'value 缺席＝错');
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, value: 'x' })), true);
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, value: 3100 })), true, '越上界');
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, value: 1100 })), true, '越下界');
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, value: 1830 })), true, '不在步长格子上');
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, value: Number.NaN })), true);
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, min: undefined })), true);
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, max: undefined })), true);
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, step: undefined })), true);
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, step: 0 })), true);
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, max: 1200 })), true, 'max ≤ min');
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, max: 3010 })), true, 'max 不在格子上');
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, step: 0.0000001 })), true, '小数位超过 6 位');
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, presets: 1 })), true);
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, presets: [3100] })), true, '常用档越界');
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, presets: [1830] })), true, '常用档不在格子上');
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, presets: [1800, 1800] })), true, '常用档重复');
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, disabled: true })), true, '禁用必须给原因');
    assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, loading: 1 })), true);
    for (const bad of ['a"b', 'x{y}', '.x', 'a b!']) {
      assert.equal(throwsBlocks(() => renderSliderRow({ ...CALORIE, extraClass: bad })), true, '拒：' + bad);
    }
    assert.match(renderSliderRow({ ...CALORIE, extraClass: 'ok-1 other' }), /is-track ok-1 other"/);
  });

  it('纯函数：同入参两次逐字节相同', () => {
    assert.equal(renderSliderRow(CALORIE), renderSliderRow(CALORIE));
    assert.notEqual(renderSliderRow(CALORIE), renderSliderRow(HOSTILE));
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('sliderRow ② 样式纪律', () => {
  const css = stripComments(sliderRowCss());

  it('样式段非空，且**全部**规则 scope 在 `.ilife-page-ui` 与本件根类之下', () => {
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 25, '本件规则数不对：' + selectors.length);
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

  it('**只经 `skinVar()` 读皮肤**：每一处 var() 都与 skinVar() 逐字相同', () => {
    const spans = skinVarSpans(css);
    assert.ok(spans.length >= 10, '读皮肤的处数不对：' + spans.length);
    const rest = cutSpans(css, spans);
    assert.equal(rest.includes('var(--'), false, '手写了 var(--…)：'
      + rest.slice(Math.max(0, rest.indexOf('var(--') - 40), rest.indexOf('var(--') + 60));
  });

  it('**触控目标与轨道几何是样式段里的常量**（真机起不来时的等价判据）', () => {
    assert.equal(SLIDER_ROW_TOUCH_PX, 44);
    assert.equal(SLIDER_ROW_GAP_PX, 8);
    assert.equal(SLIDER_ROW_TRACK_PX, 44);
    assert.equal(SLIDER_ROW_LINE_PX, 8);
    assert.equal(SLIDER_ROW_THUMB_PX, 26);
    for (const px of [SLIDER_ROW_TOUCH_PX, SLIDER_ROW_TRACK_PX]) {
      assert.ok(css.includes('height: ' + String(px) + 'px;'), '轨道／键高取常量 ' + px);
    }
    assert.ok(css.includes('gap: ' + String(SLIDER_ROW_GAP_PX) + 'px;'), '相邻目标留 8px 缝');
    assert.ok(css.includes('min-height: ' + String(SLIDER_ROW_TOUCH_PX) + 'px;'), '常用档也是 44 高');
    assert.ok(css.includes('min-width: 5em;'), '状态字宽度锁住（四档词长短不一也不跳版）');
    assert.ok(css.includes('height: ' + String(SLIDER_ROW_THUMB_PX) + 'px;'), '拇指直径取常量');
  });

  it('**宽度只许容器判**：本件自己是容器，`@media` 只判设备能力（没有一处判宽度）', () => {
    assert.match(css, /container-type: inline-size;/, '本件必须自己是容器');
    const at = [...sliderRowCss().matchAll(/@container \(([^)]*)\)/g)].map((m) => m[1]);
    assert.equal(at.length, 1, '容器查询数不对：' + at.join('｜'));
    assert.match(at[0], /^max-width: \d+px$/, '容器查询只许判宽度：' + at[0]);
    const medias = [...sliderRowCss().matchAll(/@media ([^{]*)\{/g)].map((m) => m[1].trim());
    assert.ok(medias.length >= 2, '两条设备能力查询（hover／reduced-motion）应在：' + medias.join('｜'));
    for (const m of medias) {
      assert.equal(/max-width|min-width/.test(m), false, '媒体查询只许判设备能力，不许判宽度：' + m);
      assert.ok(/hover|pointer|prefers-reduced-motion/.test(m), '媒体查询判的不是设备能力：' + m);
    }
  });

  it('**不许 `…` 截断**：样式段里没有截断手段', () => {
    for (const bad of ['text-overflow', 'line-clamp', 'overflow: hidden', 'overflow-x: hidden']) {
      assert.equal(css.includes(bad), false, '出现了截断手段：' + bad);
    }
    assert.equal((css.match(/overflow-wrap: anywhere/g) || []).length >= 4, true, '长串折行覆盖不足');
    assert.equal(css.includes('min-width: 0;'), true, 'flex/grid 子件必须 min-width: 0（防压字）');
  });

  it('焦点地板 ＋ 状态矩阵：focus-visible／hover 只包设备能力／active 只动 transform／禁用与更新中光标', () => {
    assert.match(css, /:focus-visible \{/);
    assert.match(css, /outline: 2px solid /);
    assert.equal(/outline:\s*(none|0)/.test(css), false);
    assert.ok(css.includes('@media (hover:hover) and (pointer:fine) {'));
    assert.ok(css.includes(':hover:not([disabled])'), 'hover 不许是唯一通路');
    assert.match(css, /transform: scale\(\.98\)/, '真按下有 scale(.98)');
    assert.match(css, /transition: transform 80ms/, '按下反馈 ≤80ms');
    assert.match(css, /cursor: not-allowed;/, '禁用有 not-allowed');
    assert.match(css, /cursor: progress;/, '更新中有 progress');
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
    /* 原生轨道的线是自绘的：这一条必须透明，否则两套线会叠在一起。 */
    assert.match(css, /::-webkit-slider-runnable-track \{[^}]*background: transparent/);
    assert.match(css, /::-webkit-slider-thumb \{[^}]*width: /);
    assert.match(css, /::-moz-range-thumb \{[^}]*width: /);
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
    const used = new Set([...css.matchAll(/(?:^|[;\s])color: ([^;]+);/g)].map((m) => m[1].trim()));
    for (const value of used) {
      assert.ok(value === skinVar('accent-ink') || ['ink', 'ink-2', 'ink-3', 'danger'].some((t) => value === skinVar(t)),
        '文字色只许取 ink／ink-2／ink-3／danger／accent-ink：' + value);
    }
  });

  it('层红线：`dist/components/slider-row/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'slider-row');
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
    assert.match(sliderRowCss(), /^\.ilife-page-ui \.ilife-block-slider-row \{/m);
    const x = stripComments(sliderRowCss({ prefix: 'x-' }));
    assert.ok(x.includes('.x-page-ui .x-block-slider-row {'));
    assert.ok(x.includes('.x-block-slider-row-number'));
    assert.equal(x.includes('.ilife-'), false, '换前缀后不许残留旧前缀');
  });
});

/* ── ③ 加法式（不挂这件＝零变化）＋ ⑤ 皮肤矩阵 ─────────────────────── */

describe('sliderRow ③ 加法式（opt-in：不挂这件＝零变化）', () => {
  it('不挂本件的页：产物里一个本件字节都没有，两次渲染逐字节相同', () => {
    const shell = () => renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const off = shell();
    assert.equal(off.includes(CLS), false);
    assert.equal(off.includes(SLIDER_ROW_EVENT_CHANGE), false, '运行时也不得随页挂上');
    assert.equal(off, shell());
  });

  it('挂了本件的页＝原页 ＋ 本件那一段（页壳其余部分逐字节不变）', () => {
    const off = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const on = renderDocShell({
      docTitle: 'T', bodyHtml: '<p>x</p>' + renderSliderRow(CALORIE), extraCss: sliderRowCss() + buildSliderRowJs(),
    });
    assert.ok(on.includes(CLS));
    assert.ok(on.includes('.ilife-page-ui .ilife-block-slider-row'));
    assert.ok(on.indexOf(off.slice(0, 200)) === 0, '页壳头部逐字节不变');
  });

  it('出口唯一：本件不从根出口出', () => {
    assert.equal(typeof renderSliderRow, 'function');
    assert.equal(root.renderSliderRow, undefined, '组件层不得从根出口出');
  });
});

describe('sliderRow ⑤ 皮肤矩阵（三套皮肤下标记逐字节相同）', () => {
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderSliderRow(CALORIE) + '</div>';
  const withoutSkin = (name) => pageOf(name).replace(skinCss({ skins: [name] }), '').replace(skinClass(name), '');

  it('三套皮肤：差异只落在皮肤样式段与皮肤类上，标记面逐字节相同', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(renderSliderRow(CALORIE)));
    for (const name of SKIN_NAMES) {
      assert.equal(withoutSkin(name), bare, name + ' 的标记面与 ' + SKIN_NAMES[0] + ' 不同');
    }
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[1]), '两套皮肤的页产物必须真的不同');
    assert.equal(renderSliderRow(CALORIE).includes('skin-'), false, '标记里不许自带皮肤类');
  });
});

/* ── ④ 真机两档（headless Chrome ＋ CDP）───────────────────────────── */

const WIDTHS = [390, 1280];

function fixture() {
  return renderSliderRow(CALORIE)
    + renderSliderRow(HOSTILE)
    + renderSliderRow({ ...CALORIE, name: 'locked', value: 2000, disabled: true, disabledReason: '还没定训练计划，先定计划才能设热量目标' })
    + renderSliderRow({ ...CALORIE, name: 'busy', value: 1500, loading: true })
    + renderSliderRow({ ...CALORIE, name: 'unset', value: null });
}

const sel = (name) => JSON.stringify('[' + SLIDER_ROW_NAME_ATTR + '="' + name + '"]');
const inside = (name, kind) => JSON.stringify('[' + SLIDER_ROW_NAME_ATTR + '="' + name + '"] ['
  + SLIDER_ROW_HIT_ATTR + '="' + kind + '"]');

const MEASURE = '(function(){'
  + 'var stage=document.querySelector(".stage");'
  + 'function box(el){var r=el.getBoundingClientRect();return {l:r.left,r:r.right,w:r.width,h:r.height};}'
  + 'var roots=[].slice.call(document.querySelectorAll(' + JSON.stringify('.' + CLS) + '));'
  + 'var out={stageSw:stage.scrollWidth,stageCw:stage.clientWidth,stage:box(stage),'
  + 'docSw:document.documentElement.scrollWidth,docCw:document.documentElement.clientWidth,'
  + 'ellipsis:document.body.innerText.indexOf("\\u2026")>=0,roots:[]};'
  + 'for(var i=0;i<roots.length;i++){var root=roots[i];'
  + 'var hits=[].slice.call(root.querySelectorAll(' + JSON.stringify('[' + SLIDER_ROW_HIT_ATTR + ']') + ')).map(function(h){'
  + 'var b=box(h);var cs=getComputedStyle(h);return {kind:h.getAttribute(' + JSON.stringify(SLIDER_ROW_HIT_ATTR) + '),'
  + 'box:b,disabled:h.hasAttribute("disabled")||h.getAttribute("aria-disabled")==="true",cursor:cs.cursor};});'
  + 'var number=root.querySelector(' + JSON.stringify('.' + CLS + '-number') + ');'
  + 'var input=root.querySelector(' + JSON.stringify('[data-ilife-slider-input]') + ');'
  + 'var fill=root.querySelector(' + JSON.stringify('.' + CLS + '-fill') + ');'
  + 'var state=root.querySelector(' + JSON.stringify('[data-ilife-slider-state]') + ');'
  + 'out.roots.push({name:root.getAttribute(' + JSON.stringify(SLIDER_ROW_NAME_ATTR) + '),'
  + 'sw:root.scrollWidth,cw:root.clientWidth,box:box(root),value:root.getAttribute(' + JSON.stringify(SLIDER_ROW_VALUE_ATTR) + '),'
  + 'fillWidth:fill?Math.round(fill.getBoundingClientRect().width):-1,'
  + 'inputValue:input?input.value:null,inputBox:input?box(input):null,'
  + 'state:state?state.textContent:"",hits:hits,'
  + 'number:{box:box(number),sw:number.scrollWidth,cw:number.clientWidth,text:number.textContent}});}'
  + 'return out;}())';

describe('sliderRow ④ 真机两档（390／1280 容器；视口恒 1440）', () => {
  it('零横向溢出 ＋ 每枚触控目标 ≥44×44 ＋ 相邻间距 ≥8px ＋ 大数字不被挤', async (t) => {
    const p = await startControlsPage({
      css: skinCss() + '\n' + sliderRowCss(), runtime: buildSliderRowJs(),
      body: fixture(), events: [SLIDER_ROW_EVENT_CHANGE],
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
          assert.ok(Math.abs(r.box.w - width) <= 1, why + r.name + ' 的边框盒宽不是 ' + width + '：' + r.box.w);
          assert.ok(r.box.r <= m.stage.r + 1, why + r.name + ' 右缘越过容器');
          assert.ok(r.number.sw <= r.number.cw + 1, why + r.name + ' 的大数字被挤（' + r.number.sw + ' > ' + r.number.cw + '）');
          assert.ok(r.number.box.h >= 12, why + r.name + ' 的大数字没有真实行盒');
          for (const h of r.hits) {
            assert.ok(Math.round(h.box.w) >= 44 && Math.round(h.box.h) >= 44,
              why + r.name + ' 的 ' + h.kind + ' 触控目标 ' + h.box.w + '×' + h.box.h + ' 小于 44×44');
          }
          const dec = r.hits.find((h) => h.kind === 'dec');
          const inc = r.hits.find((h) => h.kind === 'inc');
          assert.ok(r.inputBox.w > 0 && r.inputBox.h >= 44, why + r.name + ' 轨道的命中盒高 ' + r.inputBox.h + ' < 44');
          assert.ok(r.inputBox.l - dec.box.r >= 8 - 0.5, why + r.name + '：− 与轨道间距 ' + (r.inputBox.l - dec.box.r));
          assert.ok(inc.box.l - r.inputBox.r >= 8 - 0.5, why + r.name + '：轨道与 ＋ 间距 ' + (inc.box.l - r.inputBox.r));
        }
        const base = m.roots[0];
        readings.push(width + 'px: scrollWidth ' + m.stageSw + ' ≤ clientWidth ' + m.stageCw
          + '｜键 ' + Math.round(base.hits[0].box.w) + '×' + Math.round(base.hits[0].box.h)
          + '，轨道命中盒 ' + Math.round(base.inputBox.w) + '×' + Math.round(base.inputBox.h)
          + '，相邻间距 ' + Math.round(base.inputBox.l - base.hits[0].box.r) + 'px'
          + '｜大数字 ' + base.number.text + '（宽 ' + Math.round(base.number.box.w) + 'px，已填 ' + base.fillWidth + 'px）');
      }
      console.log('  [真机读数] ' + readings.join('\n  [真机读数] '));
    } finally { p.close(); }
  });

  it('拖动只同步读数不派发／落定才派发／按档与按 ± 落到正确的一档／未设置与禁用与更新中', async (t) => {
    const p = await startControlsPage({
      css: skinCss() + '\n' + sliderRowCss(), runtime: buildSliderRowJs(),
      body: fixture(), events: [SLIDER_ROW_EVENT_CHANGE],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      await p.at(WIDTHS[0], 'true');
      const valueOf = (name) => 'document.querySelector(' + sel(name) + ').getAttribute('
        + JSON.stringify(SLIDER_ROW_VALUE_ATTR) + ')';
      const numberText = (name) => 'document.querySelector(' + JSON.stringify('[' + SLIDER_ROW_NAME_ATTR + '="' + name + '"] .'
        + CLS + '-number') + ').textContent';
      const click = (name, kind) => 'document.querySelector(' + inside(name, kind) + ').click()';
      const drag = (name, v, evt) => '(function(){var i=document.querySelector('
        + JSON.stringify('[' + SLIDER_ROW_NAME_ATTR + '="' + name + '"] [data-ilife-slider-input]')
        + ');i.value="' + String(v) + '";i.dispatchEvent(new Event(' + JSON.stringify(evt) + ',{bubbles:true}));return true}())';

      /* 按 ＋：走一档并派发 */
      assert.equal(await p.ev(valueOf('calorieGoal')), '1800');
      assert.equal(await p.ev(numberText('calorieGoal')), '1,800');
      await p.ev(click('calorieGoal', 'inc'));
      await sleep(60);
      assert.equal(await p.ev(valueOf('calorieGoal')), '1850', '＋ 走一档（step=50）');
      assert.equal(await p.ev(numberText('calorieGoal')), '1,850', '右侧大数字同步');
      assert.equal((await p.events(SLIDER_ROW_EVENT_CHANGE)).length, 1, '按键落定派发一条');
      assert.equal((await p.events(SLIDER_ROW_EVENT_CHANGE))[0].prev, 1800, '事件带改前值');

      /* 拖动：只同步读数（大数字 ＋ 已填宽度），**不派发** */
      const before = (await p.events(SLIDER_ROW_EVENT_CHANGE)).length;
      await p.ev(drag('calorieGoal', 2400, 'input'));
      await sleep(60);
      assert.equal(await p.ev(numberText('calorieGoal')), '2,400', '拖动过程右侧大数字就同步');
      const fill = await p.ev('Math.round(document.querySelector(' + JSON.stringify('[' + SLIDER_ROW_NAME_ATTR
        + '="calorieGoal"] .' + CLS + '-fill') + ').getBoundingClientRect().width)');
      const track = await p.ev('Math.round(document.querySelector(' + JSON.stringify('[' + SLIDER_ROW_NAME_ATTR
        + '="calorieGoal"] .' + CLS + '-track') + ').getBoundingClientRect().width)');
      assert.ok(Math.abs(fill / track - (2400 - 1200) / 1800) < 0.02,
        '已填比例跟着走：' + fill + '/' + track + '（期望 ≈' + ((2400 - 1200) / 1800).toFixed(3) + '）');
      assert.equal((await p.events(SLIDER_ROW_EVENT_CHANGE)).length, before, '拖动过程不派发事件');

      /* 落定：派发，且 prev 是拖动前**已落定**的那个值（1850） */
      await p.ev(drag('calorieGoal', 2400, 'change'));
      await sleep(60);
      const hits = await p.events(SLIDER_ROW_EVENT_CHANGE);
      assert.equal(hits.length, before + 1, '落定派发一条');
      assert.equal(hits[hits.length - 1].value, 2400);
      assert.equal(hits[hits.length - 1].prev, 1850, 'prev 读已落定值，不是拖动过程中的中间值');

      /* 常用档：点一下落到那一档（1,500） */
      await p.ev('(function(){var b=document.querySelector(' + JSON.stringify('[' + SLIDER_ROW_NAME_ATTR
        + '="calorieGoal"] [data-ilife-slider-preset="1500"]') + ');b.click();return true}())');
      await sleep(60);
      assert.equal(await p.ev(valueOf('calorieGoal')), '1500');
      assert.equal(await p.ev(numberText('calorieGoal')), '1,500');
      assert.ok(await p.ev('document.querySelector(' + JSON.stringify('[' + SLIDER_ROW_NAME_ATTR
        + '="calorieGoal"] [data-ilife-slider-preset="1500"]') + ').getAttribute("aria-pressed")==="true"'),
      '命中的那一档就是 aria-pressed');
      /* 到下限：状态字与 − 的禁用一起给 */
      await p.ev('(function(){var b=document.querySelector(' + JSON.stringify('[' + SLIDER_ROW_NAME_ATTR
        + '="calorieGoal"] [data-ilife-slider-preset="0"]') + ');if(b)b.click();return true}())');
      await p.ev(drag('calorieGoal', 1200, 'change'));
      await sleep(60);
      assert.equal(await p.ev(valueOf('calorieGoal')), '1200');
      assert.equal(await p.ev('document.querySelector(' + JSON.stringify('[' + SLIDER_ROW_NAME_ATTR
        + '="calorieGoal"] [data-ilife-slider-state]') + ').textContent'), '已到下限');
      assert.ok(await p.ev('document.querySelector(' + inside('calorieGoal', 'dec') + ').hasAttribute("disabled")'),
        '到下限时 − 落 disabled');

      /* 未设置：点 ＋ 从下限定下来 */
      assert.equal(await p.ev(valueOf('unset')), '');
      assert.equal(await p.ev('document.querySelector(' + JSON.stringify('[' + SLIDER_ROW_NAME_ATTR
        + '="unset"] [data-ilife-slider-state]') + ').textContent'), '未设置');
      await p.ev(click('unset', 'inc'));
      await sleep(60);
      assert.equal(await p.ev(valueOf('unset')), '1200', '未设置时按 ＋ 落到下限');

      /* 禁用与更新中：一律不响应 */
      const beforeLocked = (await p.events(SLIDER_ROW_EVENT_CHANGE)).length;
      await p.ev(click('locked', 'inc'));
      await p.ev(drag('locked', 2500, 'change'));
      await p.ev(click('busy', 'inc'));
      await p.ev(drag('busy', 2500, 'change'));
      await sleep(60);
      assert.equal(await p.ev(valueOf('locked')), '2000', '禁用件不响应');
      assert.equal(await p.ev(valueOf('busy')), '1500', '更新中不响应');
      assert.equal((await p.events(SLIDER_ROW_EVENT_CHANGE)).length, beforeLocked, '两者都不派发');
      assert.equal(await p.ev('getComputedStyle(document.querySelector(' + inside('locked', 'inc') + ')).cursor'),
        'not-allowed', '禁用光标');

      /* 焦点地板（真机）：两端键与轨道 */
      const onKey = await p.focusOutline('[' + SLIDER_ROW_NAME_ATTR + '="calorieGoal"] ['
        + SLIDER_ROW_HIT_ATTR + '="inc"]');
      assert.ok(onKey.w >= 2 && onKey.style !== 'none', '键的焦点描边不可见：' + JSON.stringify(onKey));
      const onTrack = await p.focusOutline('[' + SLIDER_ROW_NAME_ATTR + '="calorieGoal"] [data-ilife-slider-input]');
      assert.ok(onTrack.w >= 2 && onTrack.style !== 'none', '轨道的焦点描边不可见：' + JSON.stringify(onTrack));

      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
