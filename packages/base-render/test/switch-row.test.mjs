/** switchRow（组件 · 开关行 · **重做件**）· **判据件**。
 *
 *  断言对象是本件**自己的唯一出口**：`dist/components/switch-row/index.js`
 *  （组件层不进冻结面、不从根出口；层出口 `base-paint/blocks` 那一行由接线席统一加）。
 *
 *  四类（契约 §五）＋ **本件因为是重做件而多出来的一组**（重做口径第 1／7 节）：
 *   ① **渲染契约**：形（实心／空心 ＋ 滑块位置）／字（固定状态字）／色（第三样）／说明句必填／
 *      禁用原因必填／转义面／**全部**非法入参走 `BlocksError`；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤／scope／零 `:root`／零 `!important`／零自定义属性／
 *      宽度只由 `@container` 判／触控 44 与轨道几何是样式段常量；
 *   ③ **加法式**：不挂本件时同页产物逐字节不变；
 *   ④ **真机两档**（390／1280）：零横向溢出、开关命中盒 ≥44×44、状态字不被截，翻动／禁用／更新中真跑；
 *   ⑤ **皮肤矩阵 ＋ 三档形态差异**（重做件的核心判据）：
 *      · 三套皮肤下**标记逐字节相同**（皮肤只改取值）；
 *      · 三套皮肤的**形状读数确实不同**（圆角／字面这些**非颜色**的取值差出来）；
 *      · **关掉颜色也读得出开合**：给页面注入一份"把所有颜色压平"的样式后重测，
 *        开合仍靠**滑块离左右边的距离**与**状态字**读出来，且三套皮肤下这两个读数**逐值相同**。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SWITCH_ROW_CHECKED_ATTR,
  SWITCH_ROW_CLASS,
  SWITCH_ROW_EVENT_CHANGE,
  SWITCH_ROW_FORMS,
  SWITCH_ROW_HIT_ATTR,
  SWITCH_ROW_LOADING,
  SWITCH_ROW_NAME_ATTR,
  SWITCH_ROW_OFF,
  SWITCH_ROW_ON,
  SWITCH_ROW_STATE_ATTR,
  SWITCH_ROW_THUMB_INSET_PX,
  SWITCH_ROW_THUMB_PX,
  SWITCH_ROW_THUMB_TRAVEL_PX,
  SWITCH_ROW_TOUCH_PX,
  SWITCH_ROW_TRACK_ATTR,
  SWITCH_ROW_TRACK_H_PX,
  SWITCH_ROW_TRACK_W_PX,
  buildSwitchRowJs,
  renderSwitchRow,
  switchRowCss,
} from '../dist/components/switch-row/index.js';
import { SKINS, SKIN_NAMES, skinClass, skinCss, skinVar } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import * as root from '../dist/index.js';
import { sleep, startControlsPage } from './input-controls-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLS = SWITCH_ROW_CLASS;

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

/** 记账设置页的一行：说明句写清"打开会怎样"（重做口径第 1 节）。 */
const SYNC = {
  name: 'feishuSync',
  checked: true,
  label: '记完自动同步飞书',
  note: '打开后：每记一笔就往多维表追一行，失败的下次打开重试。',
  caliber: '只推没推过的行；已同步的行不再重复推。',
};

/** 敌意形状：长名字 ＋ 长说明（零横向溢出与「状态字不被挤」都靠它压出来）。 */
const HOSTILE = {
  name: 'ledgerSyncAllAccounts',
  checked: false,
  label: '把这个账本里全部账户（含已归档与已转入储蓄的）的历史流水一次性推到多维表',
  note: '打开后：全部账户的历史流水会分页推送，中途断网的下次打开从断点继续；这条链路不会再写第二遍。',
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('switchRow ① 渲染契约', () => {
  it('基本形态：一行三格（文字／状态字／开关）＋ 机器读数 ＋ 原生 checkbox[role=switch]', () => {
    const html = renderSwitchRow(SYNC);
    assert.match(html, /^<div class="ilife-block-switch-row is-row is-on"/, '根类名／形态键／开合类：' + html.slice(0, 80));
    assert.ok(html.includes(SWITCH_ROW_NAME_ATTR + '="feishuSync"'), '机器键落属性');
    assert.ok(html.includes(SWITCH_ROW_CHECKED_ATTR + '="1"'), '开合态的机器读数落属性');
    assert.match(html, /-label">记完自动同步飞书<\/b>/, '名字上屏');
    assert.match(html, /-note" id="ilife-block-switch-row-feishuSync-note"[^>]*>打开后：每记一笔就往多维表追一行/,
      '说明句上屏并带自己的锚 id');
    assert.ok(html.includes('role="switch"') && html.includes('type="checkbox"'), '开关是真语义');
    assert.ok(html.includes('checked'), '开态落原生 checked 属性（**零脚本也读得出**）');
    assert.ok(html.includes('aria-describedby="ilife-block-switch-row-feishuSync-note"'), '读屏器念得出"打开会怎样"');
    assert.ok(html.includes(SWITCH_ROW_TRACK_ATTR + '=""') && html.includes(SWITCH_ROW_HIT_ATTR + '=""'),
      '轨道与命中盒的锚都在');
    assert.ok(html.includes('data-ilife-switch-thumb=""'), '滑块锚在');
    assert.ok(!/<script/i.test(html) && !/\son[a-z]+=/i.test(html), '不产脚本、不产内联事件');
  });

  it('**字**这一档：状态字固定一枚（已开／已关／更新中），不靠样式生成、不只在 hover 出现', () => {
    assert.match(renderSwitchRow(SYNC), new RegExp('-' + 'state" ' + SWITCH_ROW_STATE_ATTR + '="">' + SWITCH_ROW_ON + '<'));
    assert.match(renderSwitchRow({ ...SYNC, checked: false }), new RegExp('>' + SWITCH_ROW_OFF + '<'));
    assert.match(renderSwitchRow({ ...SYNC, loading: true }), new RegExp('>' + SWITCH_ROW_LOADING + '<'));
    assert.equal(renderSwitchRow(SYNC).includes('::before'), false, '状态字不许靠 CSS 生成内容');
    assert.match(renderSwitchRow({ ...SYNC, checked: false }), /is-row is-off/, '关态也带自己的类（形：空心轨道）');
  });

  it('**形**这一档写在样式段里：轨道关＝空心、开＝实心；滑块关贴左、开贴右（行程＝常量）', () => {
    const css = stripComments(switchRowCss());
    /** 取一条规则的声明块（按选择器原文抓，抓不到就是空串 ⇒ 断言当场红）。 */
    const decls = (pattern) => {
      const m = new RegExp(pattern + ' \\{([^}]*)\\}').exec(css);
      return m === null ? '' : m[1];
    };
    const track = decls('\\.ilife-block-switch-row-track');
    assert.match(track, /background: transparent/, '关态轨道是空心（透明底）');
    assert.match(track, /border: 1px solid var\(--ilife-line,/, '边界靠发丝线，不靠投影');
    assert.equal(/box-shadow/.test(track), false, '轨道不许用投影立边界：' + track);
    const onTrack = decls('\\.ilife-block-switch-row-input:checked \\+ \\.ilife-block-switch-row-track');
    assert.match(onTrack, /background: var\(--ilife-ok,/, '开态轨道实心');
    const thumb = decls('\\.ilife-block-switch-row-thumb');
    assert.match(thumb, new RegExp('left: ' + SWITCH_ROW_THUMB_INSET_PX + 'px'), '关态滑块贴左内距');
    const onThumb = decls('\\.ilife-block-switch-row-input:checked \\+ \\.ilife-block-switch-row-track \\.ilife-block-switch-row-thumb');
    assert.match(onThumb, new RegExp('transform: translateX\\(' + SWITCH_ROW_THUMB_TRAVEL_PX + 'px\\)'),
      '开态滑块贴右（行程＝形状读数）');
    assert.equal(SWITCH_ROW_THUMB_TRAVEL_PX, SWITCH_ROW_TRACK_W_PX - 2 - SWITCH_ROW_THUMB_PX - 2 * SWITCH_ROW_THUMB_INSET_PX,
      '行程＝轨道内宽 − 滑块 − 两侧内距');
    assert.equal(SWITCH_ROW_TOUCH_PX, 44);
    assert.ok(SWITCH_ROW_TRACK_H_PX < SWITCH_ROW_TOUCH_PX, '视觉盒可以比命中盒小');
  });

  it('禁用：原生 disabled ＋ 写清为什么不能开 ＋ 那一行被 aria-describedby 指到', () => {
    const dis = renderSwitchRow({ ...SYNC, checked: false, disabled: true, disabledReason: '还没定训练计划，先定计划才能开' });
    assert.ok(dis.includes('disabled aria-disabled="true"'), '原生 disabled（翻不动）');
    assert.ok(dis.includes('还没定训练计划'), '原因上屏');
    assert.ok(dis.includes('aria-describedby="ilife-block-switch-row-feishuSync-note ilife-block-switch-row-feishuSync-error"'),
      '说明句与原因都被指到');
    assert.match(dis, /class="ilife-block-switch-row is-row is-off is-disabled/);
  });

  it('更新中：状态字换「更新中」，输入不落原生 disabled（由运行时段回弹，防一次会被丢弃的改动）', () => {
    const load = renderSwitchRow({ ...SYNC, loading: true });
    assert.ok(load.includes(SWITCH_ROW_LOADING));
    assert.ok(load.includes('aria-disabled="true"'));
    assert.equal(load.includes(' disabled'), false, '更新中不落原生 disabled');
  });

  it('错误说明：写在控件旁边、被指到，且不只染色', () => {
    const err = renderSwitchRow({ ...SYNC, error: '多维表没有写权限：先在飞书里把这张表授权给应用' });
    assert.match(err, /-error" id="ilife-block-switch-row-feishuSync-error" role="alert">多维表没有写权限/);
    assert.ok(err.includes('ilife-block-switch-row-feishuSync-error'), '错误行被指到');
    assert.match(err, /is-invalid/, '带 is-invalid 类（边框另有一道色，但那不是唯一信息）');
  });

  it('说明句与名字是硬要求：`note`／`label`／`checked` 缺一不可', () => {
    assert.equal(throwsBlocks(() => renderSwitchRow({ ...SYNC, note: undefined })), true, '没有"打开会怎样"不许上屏');
    assert.equal(throwsBlocks(() => renderSwitchRow({ ...SYNC, note: '' })), true);
    assert.equal(throwsBlocks(() => renderSwitchRow({ ...SYNC, label: undefined })), true);
    assert.equal(throwsBlocks(() => renderSwitchRow({ ...SYNC, checked: undefined })), true, '开关没有"未设置"这一档');
    assert.equal(throwsBlocks(() => renderSwitchRow({ ...SYNC, checked: '1' })), true);
    assert.equal(throwsBlocks(() => renderSwitchRow({ ...SYNC, checked: 1 })), true);
    assert.equal(throwsBlocks(() => renderSwitchRow({ ...SYNC, disabled: true })), true, '禁用必须写清为什么');
  });

  it('转义：五个字符进实体，不进标记（名字／说明／口径／错误／禁用原因逐位转义）', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderSwitchRow({ name: evil, checked: true, label: evil, note: evil, caliber: evil, error: evil });
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    const dis = renderSwitchRow({ ...SYNC, disabled: true, disabledReason: evil });
    assert.equal(/<script/i.test(dis), false, '禁用原因同样过转义');
  });

  it('形态键是闭集（闭集外一律 BlocksError），入参本体逐条拒', () => {
    assert.deepEqual([...SWITCH_ROW_FORMS], ['row']);
    assert.ok(renderSwitchRow({ ...SYNC, form: 'row' }).includes('is-row'));
    assert.equal(throwsBlocks(() => renderSwitchRow({ ...SYNC, form: 'details' })), true);
    for (const bad of [undefined, null, [], 'x']) {
      assert.equal(throwsBlocks(() => renderSwitchRow(bad)), true, '拒：' + String(bad));
    }
    assert.equal(throwsBlocks(() => renderSwitchRow({ ...SYNC, name: '' })), true);
    assert.equal(throwsBlocks(() => renderSwitchRow({ ...SYNC, label: 1 })), true);
    assert.equal(throwsBlocks(() => renderSwitchRow({ ...SYNC, loading: 'yes' })), true);
    for (const bad of ['a"b', 'x{y}', '.x', 'a b!']) {
      assert.equal(throwsBlocks(() => renderSwitchRow({ ...SYNC, extraClass: bad })), true, '拒：' + bad);
    }
    assert.match(renderSwitchRow({ ...SYNC, extraClass: 'ok-1 other' }), /is-on ok-1 other"/);
  });

  it('纯函数：同入参两次逐字节相同', () => {
    assert.equal(renderSwitchRow(SYNC), renderSwitchRow(SYNC));
    assert.notEqual(renderSwitchRow(SYNC), renderSwitchRow({ ...SYNC, checked: false }));
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('switchRow ② 样式纪律', () => {
  const css = stripComments(switchRowCss());

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

  it('**宽度只许容器判**：本件自己是容器，`@media` 只判设备能力（没有一处判宽度）', () => {
    assert.match(css, /container-type: inline-size;/);
    const at = [...switchRowCss().matchAll(/@container \(([^)]*)\)/g)].map((m) => m[1]);
    assert.equal(at.length, 1, '容器查询数不对：' + at.join('｜'));
    assert.match(at[0], /^max-width: \d+px$/, '容器查询只许判宽度：' + at[0]);
    const medias = [...switchRowCss().matchAll(/@media ([^{]*)\{/g)].map((m) => m[1].trim());
    assert.ok(medias.length >= 2, '两条设备能力查询应在：' + medias.join('｜'));
    for (const m of medias) {
      assert.equal(/max-width|min-width/.test(m), false, '媒体查询只许判设备能力：' + m);
      assert.ok(/hover|pointer|prefers-reduced-motion/.test(m), '媒体查询判的不是设备能力：' + m);
    }
  });

  it('**不许 `…` 截断**＋ 状态字宽度锁住＋命中盒 ≥44', () => {
    for (const bad of ['text-overflow', 'line-clamp', 'overflow: hidden', 'overflow-x: hidden']) {
      assert.equal(css.includes(bad), false, '出现了截断手段：' + bad);
    }
    assert.equal((css.match(/overflow-wrap: anywhere/g) || []).length >= 3, true, '长串折行覆盖不足');
    assert.match(css, /-state \{[^}]*min-width: 4em;/, '状态字宽度锁住（已开／已关／更新中不跳版）');
    assert.ok(css.includes('height: ' + String(SWITCH_ROW_TOUCH_PX) + 'px;'), '命中盒高取常量 44');
    assert.ok(css.includes('width: ' + String(SWITCH_ROW_TRACK_W_PX) + 'px;'), '命中盒宽取常量 56');
    assert.ok(css.includes('min-height: ' + String(SWITCH_ROW_TOUCH_PX + 12) + 'px;'), '整行高 ≥56');
  });

  it('焦点地板 ＋ 状态矩阵：focus-visible／hover 只包设备能力／active 只动 transform／禁用与更新中光标', () => {
    assert.match(css, /:focus-visible \+ .*-track \{/);
    assert.match(css, /outline: 2px solid /);
    assert.equal(/outline:\s*(none|0)/.test(css), false);
    assert.ok(css.includes('@media (hover:hover) and (pointer:fine) {'));
    assert.ok(css.includes(':hover .'), 'hover 只改边界色（且不是唯一通路）');
    assert.match(css, /transform: scale\(\.98\)/);
    assert.match(css, /cursor: not-allowed;/);
    assert.match(css, /cursor: progress;/);
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
    /* 滑块滑动只碰 transform；加载态只碰 opacity。 */
    assert.match(css, /-thumb \{[^}]*transition: transform /, '滑块只动 transform');
    assert.match(css, /is-loading .*-thumb \{[^}]*opacity: /, '加载态只动 opacity');
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

  it('层红线：`dist/components/switch-row/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'switch-row');
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
    assert.match(switchRowCss(), /^\.ilife-page-ui \.ilife-block-switch-row \{/m);
    const x = stripComments(switchRowCss({ prefix: 'x-' }));
    assert.ok(x.includes('.x-page-ui .x-block-switch-row {'));
    assert.ok(x.includes('.x-block-switch-row-track'));
    assert.equal(x.includes('.ilife-'), false, '换前缀后不许残留旧前缀');
  });
});

/* ── ③ 加法式（不挂这件＝零变化）＋ ⑤ 皮肤矩阵与三档形态差异 ───────── */

describe('switchRow ③ 加法式（opt-in：不挂这件＝零变化）', () => {
  it('不挂本件的页：产物里一个本件字节都没有，两次渲染逐字节相同', () => {
    const shell = () => renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const off = shell();
    assert.equal(off.includes(CLS), false);
    assert.equal(off.includes(SWITCH_ROW_EVENT_CHANGE), false, '运行时也不得随页挂上');
    assert.equal(off, shell());
  });

  it('挂了本件的页＝原页 ＋ 本件那一段（页壳其余部分逐字节不变）', () => {
    const off = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const on = renderDocShell({
      docTitle: 'T', bodyHtml: '<p>x</p>' + renderSwitchRow(SYNC), extraCss: switchRowCss() + buildSwitchRowJs(),
    });
    assert.ok(on.includes(CLS));
    assert.ok(on.includes('.ilife-page-ui .ilife-block-switch-row'));
    assert.ok(on.indexOf(off.slice(0, 200)) === 0, '页壳头部逐字节不变');
  });

  it('出口唯一：本件不从根出口出', () => {
    assert.equal(typeof renderSwitchRow, 'function');
    assert.equal(root.renderSwitchRow, undefined, '组件层不得从根出口出');
  });
});

describe('switchRow ⑤ 皮肤矩阵 ＋ 三档形态差异（重做件的核心判据）', () => {
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderSwitchRow(SYNC) + renderSwitchRow(HOSTILE) + '</div>';
  const withoutSkin = (name) => pageOf(name).replace(skinCss({ skins: [name] }), '').replace(skinClass(name), '');

  it('三套皮肤下**标记逐字节相同**（皮肤只改取值，不改标记）', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(renderSwitchRow(SYNC)));
    for (const name of SKIN_NAMES) {
      assert.equal(withoutSkin(name), bare, name + ' 的标记面与 ' + SKIN_NAMES[0] + ' 不同');
    }
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[1]), '两套皮肤的页产物必须真的不同（否则这条判据空转）');
    assert.equal(renderSwitchRow(SYNC).includes('skin-'), false, '标记里不许自带皮肤类');
  });

  it('三套皮肤的**形状读数确实不同**（圆角／字面这些非颜色的取值差出来，不是靠颜色差）', () => {
    /* 这一条是重做件被扣分那一处的正面判据：原型三形态在三档皮肤下"看起来都一样"，
       重做后同一份标记在三档下**形状取值**必须真的分得开——而且分的是圆角与字面，不是颜色。 */
    const pills = SKIN_NAMES.map((n) => SKINS[n].values['radius-pill']);
    const sms = SKIN_NAMES.map((n) => SKINS[n].values['radius-sm']);
    const nums = SKIN_NAMES.map((n) => SKINS[n].values['font-num']);
    /* 「各皮肤间**取值真的不同**」——**不是**「恰好三种取值」：皮肤闭集是会随需要长的
       （2026-09-24 从三套扩到六套：terminal／ink／blueprint），写死 `=== 3` 会把这条判成红，
       而它要断的事实其实只有「不是所有皮肤都长一个样」。 */
    assert.ok(new Set(pills).size >= 2, '轨道圆角各皮肤间必须真的不同：' + pills.join('／'));
    assert.ok(new Set(sms).size >= 2, '状态字圆角各皮肤间必须真的不同：' + sms.join('／'));
    assert.ok(new Set(nums).size >= 2, '数字字面各皮肤间必须真的不同：' + nums.join('／'));
    /* 三档确实落到本件的两处形状上（轨道用 radius-pill、状态字签用 radius-sm）。 */
    const css = switchRowCss();
    assert.ok(css.includes('border-radius: ' + skinVar('radius-pill') + ';'), '轨道圆角读半径 token');
    assert.ok(css.includes('border-radius: ' + skinVar('radius-sm') + ';'), '状态字签读小圆角 token');
  });

  it('**开合读数不随皮肤变**：状态字与滑块行程都是标记／常量给的，不是皮肤给的', () => {
    /* 反过来钉一次：皮肤能改形状取值，但改不动"开还是关"。 */
    const css = switchRowCss();
    assert.ok(css.includes('transform: translateX(' + String(SWITCH_ROW_THUMB_TRAVEL_PX) + 'px)'),
      '滑块行程写的是常量，不是皮肤 token');
    assert.equal(/-thumb \{[^}]*translateX\(var\(/.test(css), false, '滑块行程不许随皮肤走');
    for (const name of SKIN_NAMES) {
      assert.equal(renderSwitchRow(SYNC).includes(SWITCH_ROW_ON), true, name + '：状态字在标记里');
    }
  });
});

/* ── ④ 真机两档（headless Chrome ＋ CDP）───────────────────────────── */

const WIDTHS = [390, 1280];

function fixture() {
  return renderSwitchRow(SYNC)
    + renderSwitchRow({ ...SYNC, name: 'autoBackup', checked: false })
    + renderSwitchRow({ ...SYNC, name: 'locked', checked: false, disabled: true, disabledReason: '还没定训练计划，先定计划才能开' })
    + renderSwitchRow({ ...SYNC, name: 'busy', checked: true, loading: true })
    + renderSwitchRow(HOSTILE);
}

const sel = (name) => JSON.stringify('[' + SWITCH_ROW_NAME_ATTR + '="' + name + '"]');
const inside = (name, sub) => JSON.stringify('[' + SWITCH_ROW_NAME_ATTR + '="' + name + '"] ' + sub);

/** 每一行的读数：状态字／机器读数／命中盒／轨道与滑块的矩形（**滑块离左右边的距离**就在这里面）。 */
const ROW_JS = '(function(root){'
  + 'function box(el){var r=el.getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};}'
  + 'var track=root.querySelector("[' + SWITCH_ROW_TRACK_ATTR + ']");'
  + 'var thumb=root.querySelector("[data-ilife-switch-thumb]");'
  + 'var hit=root.querySelector("[' + SWITCH_ROW_HIT_ATTR + ']");'
  + 'var state=root.querySelector("[' + SWITCH_ROW_STATE_ATTR + ']");'
  + 'var cs=getComputedStyle(track), ts=getComputedStyle(thumb);'
  + 'var tb=box(track), hb=box(thumb);'
  + 'return {name:root.getAttribute("' + SWITCH_ROW_NAME_ATTR + '"),checked:root.getAttribute("' + SWITCH_ROW_CHECKED_ATTR + '"),'
  + 'state:state?state.textContent:"",stateBox:state?box(state):null,stateSw:state?state.scrollWidth:0,stateCw:state?state.clientWidth:0,'
  + 'hit:hb2(hit),track:tb,thumb:hb,gapLeft:hb.l-tb.l,gapRight:tb.r-hb.r,'
  + 'trackRadius:cs.borderTopLeftRadius,trackBg:cs.backgroundColor,trackBorder:cs.borderTopWidth,thumbTransform:ts.transform,hitCursor:hb3(hit)};'
  + 'function hb2(el){var r=el.getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height)};}'
  + 'function hb3(el){return getComputedStyle(el).cursor;}})';

const MEASURE = '(function(){'
  + 'var stage=document.querySelector(".stage");'
  + 'function box(el){var r=el.getBoundingClientRect();return {l:r.left,r:r.right,w:r.width,h:r.height};}'
  + 'var roots=[].slice.call(document.querySelectorAll(' + JSON.stringify('.' + CLS) + '));'
  + 'var out={stageSw:stage.scrollWidth,stageCw:stage.clientWidth,stage:box(stage),'
  + 'docSw:document.documentElement.scrollWidth,docCw:document.documentElement.clientWidth,'
  + 'ellipsis:document.body.innerText.indexOf("\\u2026")>=0,rows:[]};'
  + 'var rowFn=' + ROW_JS + ';'
  + 'for (var i=0;i<roots.length;i+=1) out.rows.push(rowFn(roots[i]));'
  + 'return out;}())';

describe('switchRow ④ 真机两档（390／1280 容器；视口恒 1440）', () => {
  it('零横向溢出 ＋ 命中盒 ≥44×44 ＋ 状态字不被挤 ＋ 翻动／禁用／更新中真跑', async (t) => {
    const p = await startControlsPage({
      css: skinCss() + '\n' + switchRowCss(), runtime: buildSwitchRowJs(),
      body: fixture(), events: [SWITCH_ROW_EVENT_CHANGE],
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
        assert.equal(m.rows.length, 5, why + '夹具应有五行');
        for (const r of m.rows) {
          assert.ok(Math.round(r.hit.w) >= 44 && Math.round(r.hit.h) >= 44,
            why + r.name + ' 的开关命中盒 ' + r.hit.w + '×' + r.hit.h + ' 小于 44×44');
          assert.ok(r.stateSw <= r.stateCw + 1, why + r.name + ' 的状态字被挤');
          assert.ok(r.trackBorder === '1px', why + r.name + ' 的轨道没有发丝线（读到 ' + r.trackBorder + '）');
          /* 开合的形状读数：关＝滑块靠左（gapLeft < gapRight），开＝靠右。 */
          if (r.name === 'feishuSync') {
            assert.ok(r.gapLeft > r.gapRight, why + '开态的滑块应贴右：左隙 ' + r.gapLeft + '，右隙 ' + r.gapRight);
          }
          if (r.name === 'autoBackup') {
            assert.ok(r.gapLeft < r.gapRight, why + '关态的滑块应贴左：左隙 ' + r.gapLeft + '，右隙 ' + r.gapRight);
          }
        }
        const on = m.rows[0], off = m.rows[1];
        readings.push(width + 'px: scrollWidth ' + m.stageSw + ' ≤ clientWidth ' + m.stageCw
          + '｜命中盒 ' + on.hit.w + '×' + on.hit.h
          + '｜开：状态字「' + on.state + '」左隙 ' + on.gapLeft + ' 右隙 ' + on.gapRight
          + '／关：状态字「' + off.state + '」左隙 ' + off.gapLeft + ' 右隙 ' + off.gapRight
          + '｜轨道圆角 ' + on.trackRadius);
      }
      console.log('  [真机读数] ' + readings.join('\n  [真机读数] '));

      /* 翻动：状态字／机器读数／滑块位置一起变，并派发一条 */
      await p.at(WIDTHS[0], 'true');
      const clickSwitch = 'document.querySelector(' + inside('feishuSync', '[' + SWITCH_ROW_HIT_ATTR + '] input')
        + ').click()';
      await p.ev(clickSwitch);
      await sleep(80);
      const afterOff = await p.ev('(function(){var r=document.querySelector(' + sel('feishuSync') + ');return ' + ROW_JS + '(r);}())');
      assert.equal(afterOff.checked, '0', '机器读数翻成 0');
      assert.equal(afterOff.state, SWITCH_ROW_OFF, '状态字翻成「已关」（字这一档）');
      assert.ok(afterOff.gapLeft < afterOff.gapRight, '滑块翻到左边（形这一档）');
      const hits = await p.events(SWITCH_ROW_EVENT_CHANGE);
      assert.equal(hits.length, 1, '真翻一次派发一条');
      assert.equal(hits[0].checked, false);
      assert.equal(hits[0].prev, true);
      await p.ev(clickSwitch);
      await sleep(80);
      const afterOn = await p.ev('(function(){var r=document.querySelector(' + sel('feishuSync') + ');return ' + ROW_JS + '(r);}())');
      assert.equal(afterOn.state, SWITCH_ROW_ON);
      assert.ok(afterOn.gapLeft > afterOn.gapRight, '滑块翻回右边');
      assert.equal((await p.events(SWITCH_ROW_EVENT_CHANGE)).length, 2, '翻回来再派发一条');

      /* 禁用：点不动、不派发；光标 not-allowed；原因写在旁边 */
      const beforeLocked = (await p.events(SWITCH_ROW_EVENT_CHANGE)).length;
      await p.ev('document.querySelector(' + inside('locked', '[' + SWITCH_ROW_HIT_ATTR + '] input') + ').click()');
      await sleep(80);
      assert.equal(await p.ev('document.querySelector(' + sel('locked') + ').getAttribute("'
        + SWITCH_ROW_CHECKED_ATTR + '")'), '0', '禁用件点了不动');
      assert.equal((await p.events(SWITCH_ROW_EVENT_CHANGE)).length, beforeLocked, '禁用件不派发');
      assert.equal(await p.ev('getComputedStyle(document.querySelector(' + inside('locked', '[' + SWITCH_ROW_HIT_ATTR + '] input')
        + ')).cursor'), 'not-allowed', '禁用光标');
      assert.match(await p.ev('document.querySelector(' + inside('locked', '.' + CLS + '-error') + ').textContent'),
        /还没定训练计划/, '为什么不能开写在控件旁边');

      /* 更新中：被翻到就回弹、不派发 */
      const beforeBusy = (await p.events(SWITCH_ROW_EVENT_CHANGE)).length;
      await p.ev('document.querySelector(' + inside('busy', '[' + SWITCH_ROW_HIT_ATTR + '] input') + ').click()');
      await sleep(80);
      assert.equal(await p.ev('document.querySelector(' + sel('busy') + ').getAttribute("'
        + SWITCH_ROW_CHECKED_ATTR + '")'), '1', '更新中保持原状');
      assert.equal(await p.ev('document.querySelector(' + inside('busy', '[' + SWITCH_ROW_HIT_ATTR + '] input') + ').checked'),
        true, '被翻到的那一勾已回弹');
      assert.equal((await p.events(SWITCH_ROW_EVENT_CHANGE)).length, beforeBusy, '更新中不派发');

      /* 焦点地板：焦点在原生 checkbox 上，描边画在轨道那一圈（所以要量轨道，不是量 input）。 */
      const outline = await p.focusOutline('[' + SWITCH_ROW_NAME_ATTR + '="feishuSync"] [data-ilife-switch-input]',
        '[' + SWITCH_ROW_NAME_ATTR + '="feishuSync"] [' + SWITCH_ROW_TRACK_ATTR + ']');
      assert.ok(outline.w >= 2 && outline.style !== 'none', '焦点描边不可见：' + JSON.stringify(outline));
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });

  it('**关掉颜色也读得出开合**：三套皮肤 × 开关两态，颜色压平前后都量一遍', async (t) => {
    /* 一个页面里铺三档皮肤（各含开／关两行），一次量全；再注入"把所有颜色压平"的样式重测。 */
    const boxes = SKIN_NAMES.map((name) => '<div class="skinbox ilife-skin-' + name + '" data-skin="' + name + '">'
      + renderSwitchRow({ ...SYNC, name: 'off_' + name, checked: false })
      + renderSwitchRow({ ...SYNC, name: 'on_' + name, checked: true })
      + '</div>').join('');
    const p = await startControlsPage({
      css: skinCss() + '\n' + switchRowCss(), runtime: buildSwitchRowJs(), body: boxes, widths: [390],
      events: [SWITCH_ROW_EVENT_CHANGE],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      const read = '(function(){var out={};var rows=' + JSON.stringify('.' + CLS) + ';'
        + 'var rowFn=' + ROW_JS + ';'
        + 'var boxes=[].slice.call(document.querySelectorAll("[data-skin]"));'
        + 'for (var i=0;i<boxes.length;i+=1){var b=boxes[i], skin=b.getAttribute("data-skin"), list=[];'
        + 'var roots=[].slice.call(b.querySelectorAll(rows));'
        + 'for (var j=0;j<roots.length;j+=1) list.push(rowFn(roots[j]));'
        + 'out[skin]=list;}'
        + 'return out;}())';
      const before = await p.at(390, read);
      /* 各皮肤下形状取值确实不同（圆角），而开合读数一致。
         「不同」＝**各皮肤间不都一样**（同上：不写死"恰好三套"）。 */
      const radii = SKIN_NAMES.map((n) => before[n][0].trackRadius);
      assert.ok(new Set(radii).size >= 2, '各皮肤间的轨道圆角必须真的不同：' + radii.join('／'));
      for (const name of SKIN_NAMES) {
        const off = before[name][0], on = before[name][1];
        assert.equal(off.state, SWITCH_ROW_OFF, name + '：关态状态字');
        assert.equal(on.state, SWITCH_ROW_ON, name + '：开态状态字');
        assert.ok(off.gapLeft < off.gapRight, name + '：关态滑块贴左（' + off.gapLeft + ' / ' + off.gapRight + '）');
        assert.ok(on.gapLeft > on.gapRight, name + '：开态滑块贴右（' + on.gapLeft + ' / ' + on.gapRight + '）');
      }
      /* 开合读数**逐值相同**（皮肤改形状取值，改不动开还是关）。 */
      const base = before[SKIN_NAMES[0]];
      for (const name of SKIN_NAMES.slice(1)) {
        const box = before[name];
        assert.deepEqual([box[0].gapLeft, box[0].gapRight, box[1].gapLeft, box[1].gapRight],
          [base[0].gapLeft, base[0].gapRight, base[1].gapLeft, base[1].gapRight],
          name + ' 的开合几何读数与 ' + SKIN_NAMES[0] + ' 不同（滑块行程不该随皮肤走）');
      }
      /* 压平颜色：底全白、字全黑、边全黑、投影清零 —— 剩下的只有形与字。 */
      await p.ev('(function(){var s=document.createElement("style");'
        + 's.textContent="*{background:#fff;background-color:#fff;background-image:none;color:#000;'
        + 'border-color:#000;box-shadow:none;outline:none}";document.head.appendChild(s);return true}())');
      await sleep(120);
      const flat = await p.ev(read);
      for (const name of SKIN_NAMES) {
        const off = flat[name][0], on = flat[name][1];
        assert.equal(off.state, SWITCH_ROW_OFF, name + '：压平颜色后关态状态字还在');
        assert.equal(on.state, SWITCH_ROW_ON, name + '：压平颜色后开态状态字还在');
        assert.ok(off.gapLeft < off.gapRight,
          name + '：压平颜色后关态仍读得出（滑块贴左 ' + off.gapLeft + ' / ' + off.gapRight + '）');
        assert.ok(on.gapLeft > on.gapRight,
          name + '：压平颜色后开态仍读得出（滑块贴右 ' + on.gapLeft + ' / ' + on.gapRight + '）');
        assert.equal(Math.abs((on.gapRight) - (off.gapLeft)) <= 2, true,
          name + '：两态的滑块贴边距离应互为镜像（右 ' + on.gapRight + ' / 左 ' + off.gapLeft + '）');
      }
      console.log('  [三档读数] ' + SKIN_NAMES.map((n) => n + '：圆角 ' + before[n][0].trackRadius
        + '，压平颜色后 关=' + flat[n][0].gapLeft + '/' + flat[n][0].gapRight
        + ' 开=' + flat[n][1].gapLeft + '/' + flat[n][1].gapRight).join('｜'));
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
