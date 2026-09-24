/** pageHead（组件 · 页头）· **判据件**（这是其余各件照抄的模板：四类断言 ＋ 皮肤矩阵 ＋ 真机两档）。
 *
 *  断言对象是本件**自己的唯一出口**：`dist/components/page-head/index.js`
 *  （组件层不进冻结面、不从根出口；层出口 `base-paint/blocks` 那一行由接线席统一加）。
 *
 *  四类（契约 §五）＋ 两处本件特有的硬判据：
 *   ① **渲染契约**：五段齐全／缺槽不出／缺值写成 `—`／转义面／**全部**非法入参分支走 `BlocksError`；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤（逐处与 `skinVar()` 的兜底链**逐字相同**）／
 *      scope 在 `.ilife-page-ui` 之下／零 `:root`／零 `!important`／零新 token 名／零 `@media` 判宽度／
 *      零 `…` 截断手段／正文对比地板（三套皮肤算得出数）／**确定性几何**（真机起不来时的等价判据）；
 *   ③ **加法式**：不挂本件时同页产物逐字节不变（本件是 opt-in 的风格段 ＋ 无副作用纯函数）；
 *   ④ **真机两档**（headless Chrome ＋ CDP）：容器宽 **390 与 1280** 下零横向溢出、主读数 > 标题字号、
 *      主读数不被裁、长标题换行不掉字，且折行差异**只可能来自 `@container`**（两档视口恒 1440）；
 *   ⑤ **皮肤矩阵**：三套皮肤下**标记逐字节相同**（换的只有样式段）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  PAGE_HEAD_CLASS,
  PAGE_HEAD_FORMS,
  PAGE_HEAD_READING_SCALE,
  pageHeadCss,
  renderPageHead,
} from '../dist/components/page-head/index.js';
import {
  SKINS,
  SKIN_NAMES,
  SKIN_TOKEN_NAMES,
  skinClass,
  skinCss,
  skinVar,
} from '../dist/components/skin/index.js';
import * as layer from '../dist/components/index.js';
import { renderDocShell } from '../dist/docShell.js';
import * as root from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

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

/** 逐条选择器（`@` 开头的预lude 不算选择器；嵌套在 at-rule 里的规则照样抓得到）。 */
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
    const name = m[1];
    const expected = skinVar(name); // 名单外的名字会当场抛 BlocksError ⇒ 判据红，不静默兜底
    assert.ok(css.startsWith(expected, m.index),
      '`' + name + '` 处的 var() 串与 skinVar() 走散：' + css.slice(m.index, m.index + 80));
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

/** 一页真实形状的页头（六个技能的每一页都长这样）。 */
const REAL = {
  skill: '卡路里',
  domain: '看本周饮食',
  title: '本周饮食',
  reading: { value: '1,189', unit: '卡', denominator: '/ 1,800 卡', note: '七日合计' },
  sub: ['2026-09-19 至 2026-09-25', '共 7 天', '有记录 6 天'],
  caliber: ['只算有记录的天', '缺值写成 —', '按发生时间归日，跨零点的睡眠记在入睡那天'],
  tool: '截至 2026-09-25',
};

/** 敌意入参：超长标题 ＋ 超长读数 ＋ 长口径行（零横向溢出与「不截断」都靠它压出来）。
 *  标题长到在两档（390 与 1280）都放不下 ⇒ 「换行而不是截断」这条判据在两档都真的跑着。 */
const HOSTILE = {
  skill: '作息管家',
  domain: '按类别深挖这一个月的全部作息记录',
  title: '本月的睡眠、运动与饮食三条线一起看：跨零点的睡眠记在入睡那天，缺卡的那一段怎么写，运动与饮食各自按自己的时间窗统计不相加',
  reading: { value: '123456789012345678901234567890', unit: '卡', denominator: '/ 1,800,000,000 卡', note: '三十天合计' },
  sub: ['2026-08-27 至 2026-09-25', '共 30 天', '有记录 27 天', '缺 3 天'],
  caliber: ['按发生时间归日', '跨零点的睡眠记在入睡那天', '缺卡的那一段写成 —，不计入合计',
    '运动与饮食各自按自己的时间窗统计，不相加'],
  tool: '截至 2026-09-25 23:59',
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('pageHead ① 渲染契约', () => {
  it('五段齐全：眉标（技能 · 域）／页标题／主读数（值＋单位＋分母＋说明）／副题／口径行', () => {
    const html = renderPageHead(REAL);
    assert.match(html, /^<div class="ilife-block-page-head is-hero">/, '根类名与形态键：' + html.slice(0, 70));
    assert.match(html, /-eyebrow">/, '眉标在');
    assert.match(html, /-mark" aria-hidden="true">/, '眉标左端那枚方点是装饰位，必须 aria-hidden');
    assert.match(html, /-skill">卡路里</, '技能名');
    assert.match(html, /-domain">看本周饮食</, '域');
    assert.match(html, /<h1 class="ilife-block-page-head-title">本周饮食<\/h1>/, '页标题是 h1');
    assert.match(html, /-value">1,189<small class="ilife-block-page-head-unit">卡<\/small><\/b>/, '主读数（值＋单位）');
    assert.match(html, /-denominator">\/ 1,800 卡</, '分母');
    assert.match(html, /-note">七日合计</, '说明');
    assert.match(html, /-sub"><span>2026-09-19 至 2026-09-25<\/span><span>共 7 天<\/span><span>有记录 6 天<\/span><\/p>/, '副题逐段一枚 span');
    assert.match(html, /-caliber"><b>口径<\/b><span>只算有记录的天<\/span>/, '口径行带标签');
    assert.match(html, /-tool">截至 2026-09-25</, '右上工具位');
  });

  it('一页恰好一个 `<h1>`；眉标与标题住在同一排（`.top`）——这一步让读数是第二行', () => {
    const html = renderPageHead(REAL);
    assert.equal((html.match(/<h1/g) || []).length, 1, '恰好一个 h1');
    assert.equal((html.match(/<\/h1>/g) || []).length, 1);
    const top = html.slice(html.indexOf('-top'), html.indexOf('<h1'));
    assert.ok(top.includes('-eyebrow'), '眉标在 .top 里（与标题同一排）');
    assert.ok(html.indexOf('</div>') > html.indexOf('</h1>'), '标题在 .top 内');
    assert.ok(html.indexOf('-reading') > html.indexOf('</h1>'), '主读数排在标题之后（第二行）');
  });

  it('缺槽就不出那一槽（不留空位、不拿占位符顶替）', () => {
    const html = renderPageHead({ skill: '备忘录', title: '全部笔记', reading: { value: '128' } });
    assert.equal(html.includes('-domain'), false, '不给域 ⇒ 眉标只有技能名');
    assert.equal(html.includes('-tool'), false);
    assert.equal(html.includes('-sub'), false);
    assert.equal(html.includes('-caliber'), false);
    assert.equal(html.includes('-denominator'), false);
    assert.equal(html.includes('-note'), false);
    assert.match(html, /-value">128<\/b>/, '只给值时，值位不拖小尾巴');
  });

  it('缺值写成 `—`（与「0」区分）：`value: null` 是唯一表达缺值的入口', () => {
    assert.match(renderPageHead({ skill: 's', title: 't', reading: { value: null } }), /-value">—</);
    assert.match(renderPageHead({ skill: 's', title: 't', reading: { value: null, unit: '卡' } }), /—<small/);
  });

  it('标记里**不写分隔符**、不写省略号：段间那道缝由样式的列距／发丝线承担', () => {
    /* 判的是「件自己有没有往段间塞字」：夹具正文里本来就有的标点（调用方给的）不算。
       故：① 拿一份正文里没有任何分隔符的入参逐字符扫；② 再拿两份产物断「段与段之间没有文字」。 */
    const only = renderPageHead(REAL);
    for (const bad of ['·', '；', '｜', '、', '~', '…']) {
      assert.equal(only.includes(bad), false, '标记里出现了分隔符或省略号：' + bad);
    }
    const both = only + renderPageHead(HOSTILE);
    assert.equal(/<\/span>[^<]+<span/.test(both), false, '段与段之间不许出现文字（分隔由列距承担）');
    assert.equal(/<\/b>[^<]+<span/.test(both), false, '眉标／读数槽之间不许出现文字');
  });

  it('转义：五个字符进实体，不进标记（值／标题／眉标／副题／口径／工具位逐位转义）', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderPageHead({
      skill: evil, domain: evil, title: evil, tool: evil,
      reading: { value: evil, unit: evil, denominator: evil, note: evil },
      sub: [evil], caliber: [evil],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.equal(/\son[a-z]+=/i.test(html), false, '不得出现内联事件处理器');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
  });

  it('形态键是闭集：闭集外一律 BlocksError（不静默降级成另一种骨架）', () => {
    assert.deepEqual([...PAGE_HEAD_FORMS], ['hero']);
    assert.match(renderPageHead({ skill: 's', title: 't', reading: { value: '1' }, form: 'hero' }), /is-hero/);
    assert.equal(throwsBlocks(() => renderPageHead({ skill: 's', title: 't', reading: { value: '1' }, form: 'gauge' })), true);
  });

  it('附加类名：合法照收、非法一律拒（防注入任意选择器）', () => {
    assert.match(renderPageHead({ ...REAL, extraClass: 'ok-1 other' }), /is-hero ok-1 other"/);
    for (const bad of ['a"b', 'x{y}', '.x', 'a b!']) {
      assert.equal(throwsBlocks(() => renderPageHead({ ...REAL, extraClass: bad })), true, '拒：' + bad);
    }
  });

  it('非法入参**逐条**走 BlocksError（不静默降级、不「尽量猜」）', () => {
    const ok = { skill: 's', title: 't', reading: { value: '1' } };
    /* 入参本体 */
    assert.equal(throwsBlocks(() => renderPageHead(undefined)), true);
    assert.equal(throwsBlocks(() => renderPageHead(null)), true);
    assert.equal(throwsBlocks(() => renderPageHead([])), true);
    assert.equal(throwsBlocks(() => renderPageHead('x')), true);
    /* 眉标与标题 */
    assert.equal(throwsBlocks(() => renderPageHead({ title: 't', reading: { value: '1' } })), true, 'skill 必填');
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, skill: '' })), true);
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, skill: 1 })), true);
    assert.equal(throwsBlocks(() => renderPageHead({ skill: 's', reading: { value: '1' } })), true, 'title 必填');
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, title: '' })), true);
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, title: 1 })), true);
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, domain: 1 })), true);
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, tool: 1 })), true);
    /* 主读数：缺席／空串／非串都是错；只有 null 是缺值 */
    assert.equal(throwsBlocks(() => renderPageHead({ skill: 's', title: 't' })), true, 'reading 必填');
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, reading: null })), true);
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, reading: { } })), true, 'value 必填（缺值要显式给 null）');
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, reading: { value: '' } })), true, '空串不是缺值');
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, reading: { value: 0 } })), true, '0 不是「缺值」的表达');
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, reading: { value: '1', unit: 1 } })), true);
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, reading: { value: '1', denominator: 1 } })), true);
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, reading: { value: '1', note: 1 } })), true);
    /* 副题与口径行：串或串数组；数组里的空串与非串一律拒 */
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, sub: 1 })), true);
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, sub: ['a', ''] })), true);
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, sub: [1] })), true);
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, caliber: {} })), true);
    assert.equal(throwsBlocks(() => renderPageHead({ ...ok, caliber: [''] })), true);
    /* 串与空数组都按「不出这一行」处理，不算错 */
    assert.equal(renderPageHead({ ...ok, sub: '' }).includes('-sub'), false);
    assert.equal(renderPageHead({ ...ok, sub: [] }).includes('-sub'), false);
    assert.equal(renderPageHead({ ...ok, caliber: '' }).includes('-caliber'), false);
  });

  it('纯函数：同入参两次逐字节相同（页面产物可缓存、可对账）', () => {
    assert.equal(renderPageHead(REAL), renderPageHead(REAL));
    assert.notEqual(renderPageHead(REAL), renderPageHead(HOSTILE));
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('pageHead ② 样式纪律', () => {
  const css = stripComments(pageHeadCss());

  it('样式段非空，且**全部**规则 scope 在 `.ilife-page-ui` 之下（不开配方的页零命中）', () => {
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 15, '本件规则数不对：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器没 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes('.ilife-block-page-head'), '选择器必须挂在件根类之下：' + sel);
    }
  });

  it('选择器不许出现两次 scope（`.x > .ilife-page-ui .y` 是**死规则**：语法合法、编译不报错、永不命中）', () => {
    for (const sel of selectorsOf(stripComments(pageHeadCss()))) {
      const hits = (sel.match(/\.ilife-page-ui/g) || []).length;
      assert.equal(hits, 1, '`.ilife-page-ui` 在一条选择器里只许出现一次，出现 ' + hits + ' 次 ⇒ 拼了两遍前缀：' + sel);
    }
    for (const sel of selectorsOf(stripComments(pageHeadCss({ prefix: 'x-' })))) {
      assert.equal((sel.match(/\.x-page-ui/g) || []).length, 1, '换前缀后同样只许一次：' + sel);
    }
  });

  it('零 `:root`／零 `!important`／零新 token 名／不用禁入 token', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.equal(css.includes('--r-xl'), false);
    assert.equal(css.includes('--pink'), false);
    const decls = css.match(/--[a-z0-9-]+\s*:/g) || [];
    assert.equal(decls.length, 0, '不得定义新 token：' + decls.join(' '));
  });

  it('**只经 `skinVar()` 读皮肤**：每一处 var() 都与 skinVar() 逐字相同，剥掉它后不剩一个 var()', () => {
    const spans = skinVarSpans(css);
    assert.ok(spans.length >= 10, '读皮肤的处数不对（判据可能空转）：' + spans.length);
    const rest = cutSpans(css, spans);
    assert.equal(rest.includes('var(--'), false, '手写了 var(--…)（兜底链只许住 skin/contract.ts）：'
      + rest.slice(Math.max(0, rest.indexOf('var(--') - 40), rest.indexOf('var(--') + 60));
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => '--ilife-' + k));
    for (const n of new Set([...css.matchAll(/var\(\s*(--ilife-[a-z0-9-]+)/g)].map((m) => m[1]))) {
      assert.ok(known.has(n), '名单外的 token 名（会被静默兜底）：' + n);
    }
  });

  it('**宽度只许容器判**：本件一条 `@media` 都没有，窄档调整走 `@container`', () => {
    assert.equal(css.includes('@media'), false, '本件不许用媒体查询（视口宽 ≠ 组件宽）');
    const at = [...pageHeadCss().matchAll(/@container \(([^)]*)\)/g)].map((m) => m[1]);
    assert.deepEqual(at.length, 1, '容器查询数不对：' + at.join('｜'));
    assert.match(at[0], /^max-width: \d+px$/, '容器查询只许判宽度：' + at[0]);
    assert.match(css, /container-type: inline-size;/, '本件必须自己是容器');
  });

  it('**不许 `…` 截断**：样式段里没有截断手段（长标题／眉标／副题一律换行）', () => {
    for (const bad of ['text-overflow', 'line-clamp', 'white-space: nowrap', 'overflow: hidden', 'overflow-x: hidden']) {
      assert.equal(css.includes(bad), false, '出现了截断手段：' + bad);
    }
    assert.equal((css.match(/overflow-wrap: anywhere/g) || []).length >= 6, true, '长串折行覆盖不足');
    assert.equal(css.includes('min-width: 0;'), true, 'flex/grid 子件必须 min-width: 0（防压字）');
  });

  it('焦点地板：`:focus-visible` 有 ≥2px 可见描边，且没有「只写 outline:none」', () => {
    assert.match(css, /:focus-visible \{/, '必须有 :focus-visible 规则');
    assert.match(css, /outline: 2px solid /, '焦点描边 ≥2px 且可见');
    assert.equal(/outline:\s*(none|0)/.test(css), false, '不许只写 outline:none 而不给替代');
  });

  it('缺省前缀 `ilife-`；换前缀时 scope 与槽类**一起**换', () => {
    assert.match(pageHeadCss(), /^\.ilife-page-ui \.ilife-block-page-head \{/m);
    const x = stripComments(pageHeadCss({ prefix: 'x-' }));
    assert.ok(x.includes('.x-page-ui .x-block-page-head {'));
    assert.ok(x.includes('.x-block-page-head-value'));
    assert.equal(x.includes('.ilife-'), false, '换前缀后不许残留旧前缀');
  });

  it('确定性几何（真机起不来时的等价判据）：主读数 > 标题，且 ≥ 正文的 2 倍', () => {
    assert.ok(PAGE_HEAD_READING_SCALE > 1, '读数必须严格大于标题：' + PAGE_HEAD_READING_SCALE);
    assert.ok(css.includes('font-size: calc(' + skinVar('fs-h1') + ' * ' + String(PAGE_HEAD_READING_SCALE) + ')'),
      '主读数必须＝皮肤 h1 档 × 倍数（唯一一处尺寸事实）');
    assert.ok(css.includes('font-size: ' + skinVar('fs-h1') + ';'), '页标题取皮肤 h1 档');
    assert.ok(css.includes('font-size: ' + skinVar('fs-body') + ';'), '件根取皮肤正文档');
    const px = (s) => parseFloat(s);
    for (const name of SKIN_NAMES) {
      const v = SKINS[name].values;
      const title = px(v['fs-h1']);
      const body = px(v['fs-body']);
      const reading = title * PAGE_HEAD_READING_SCALE;
      assert.ok(reading > title, name + '：读数 ' + reading + ' 不大于标题 ' + title);
      assert.ok(reading >= 2 * body, name + '：读数 ' + reading + ' 不到正文 ' + body + ' 的 2 倍');
    }
  });

  it('对比地板（算出来不靠眼看）：文字色只取 ink／ink-2／accent-text，三套皮肤都对底 ≥4.5:1', () => {
    const ALLOWED = ['ink', 'ink-2', 'accent-text'];
    const allowedValues = new Set(ALLOWED.map((t) => skinVar(t)));
    const colorDecls = [...css.matchAll(/(?:^|[;\s])color:\s*([^;]+);/g)].map((m) => m[1].trim());
    assert.ok(colorDecls.length >= 6, '文字色处数不对：' + colorDecls.length);
    for (const value of colorDecls) {
      assert.ok(allowedValues.has(value), '文字色只许取 ink／ink-2／accent-text：' + value);
    }
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
      for (const t of ALLOWED) {
        for (const g of ['ground', 'surface']) {
          const ratio = contrast(SKINS[name].values[t], SKINS[name].values[g]);
          assert.ok(ratio >= 4.5, name + '：' + t + ' 在 ' + g + ' 上只有 ' + ratio.toFixed(2) + ':1');
        }
      }
    }
    /* 强调色 `accent` 是非文本档：只许出现在方点的底与焦点描边上，不许当文字色。 */
    assert.ok(css.includes('background: ' + skinVar('accent')), '方点用强调色做底');
  });

  it('层红线：`dist/components/page-head/**` 零 DOM、零内联脚本（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'page-head');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 4, '编译产物不全：' + files.length);
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

/* ── ③ 加法式（不挂这件＝零变化）＋ ⑤ 皮肤矩阵 ─────────────────────── */

describe('pageHead ③ 加法式（opt-in：不挂这件＝零变化）', () => {
  it('不挂本件的页：产物里一个本件字节都没有，两次渲染逐字节相同', () => {
    const shell = () => renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const off = shell();
    assert.equal(off.includes(PAGE_HEAD_CLASS), false, '不挂本件时不得出现它的类名');
    assert.equal(off.includes('page-head'), false, '样式段也不得随页挂上');
    assert.equal(off, shell(), '两次渲染逐字节相同');
  });

  it('挂了本件的页＝原页 ＋ 本件那一段（页壳其余部分逐字节不变）', () => {
    const off = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const body = '<p>x</p>' + renderPageHead(REAL);
    const on = renderDocShell({ docTitle: 'T', bodyHtml: body, extraCss: pageHeadCss() });
    assert.ok(on.includes(PAGE_HEAD_CLASS), '挂上后类名在');
    assert.ok(on.includes('.ilife-page-ui .ilife-block-page-head'), '样式段随页挂上');
    assert.ok(on.indexOf(off.slice(0, 200)) === 0, '页壳头部逐字节不变');
  });

  it('出口唯一：本件不从根出口出；层出口若已转出，必须是**同一个**实现', () => {
    assert.equal(typeof renderPageHead, 'function');
    assert.equal(root.renderPageHead, undefined, '组件层不得从根出口出（冻结面签名不许动）');
    assert.ok(layer.renderPageHead === undefined || layer.renderPageHead === renderPageHead,
      '层出口不许出现第二份实现');
  });
});

describe('pageHead ⑤ 皮肤矩阵（三套皮肤下标记逐字节相同）', () => {
  /** 一页的产物：皮肤类挂在**页级根**上、皮肤样式段由页面挂（件自己不认皮肤，只出标记）。 */
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderPageHead(REAL) + '</div>';
  /** 把「皮肤那一份」挖掉（样式段 ＋ 页级根上的皮肤类），剩下的就是标记面。 */
  const withoutSkin = (name) => pageOf(name)
    .replace(skinCss({ skins: [name] }), '')
    .replace(skinClass(name), '');

  it('三套皮肤：差异只落在皮肤样式段与皮肤类上，标记面逐字节相同', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(renderPageHead(REAL)), '挖掉皮肤后标记必须原样在');
    for (const name of SKIN_NAMES) {
      assert.equal(withoutSkin(name), bare, name + ' 的标记面与 ' + SKIN_NAMES[0] + ' 不同');
    }
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[1]), '两套皮肤的页产物必须真的不同（否则这条判据空转）');
    assert.equal(renderPageHead(REAL).includes('skin-'), false, '标记里不许自带皮肤类（皮肤是页面挂的）');
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

/** 夹具页：**视口恒 1440**，容器宽由 `style="width:Npx"` 给——390／1280 量的都是组件自己的宽度。 */
function buildFixture(width) {
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>page-head 两档</title>\n<style>\n'
    + 'html,body{margin:0;padding:0}\n'
    + 'body{padding:16px}\n'
    + '.stage{box-sizing:border-box}\n'
    + skinCss() + '\n' + pageHeadCss() + '\n'
    + '</style></head>\n<body>\n'
    + '<div class="page"><div class="stage ilife-page-ui ' + skinClass('paper') + '" style="width:' + width + 'px">'
    + renderPageHead(REAL) + renderPageHead(HOSTILE)
    + '</div></div>\n</body></html>';
}

/** 页内量测表达式（逐件读数；两件：真实形状 ＋ 敌意形状）。 */
const MEASURE = '(function(){'
  + 'var stage=document.querySelector(".stage");'
  + 'function box(el){var r=el.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height};}'
  + 'var heads=[].slice.call(document.querySelectorAll(".ilife-block-page-head"));'
  + 'var out={stage:box(stage),stageSw:stage.scrollWidth,stageCw:stage.clientWidth,'
  + 'docSw:document.documentElement.scrollWidth,docCw:document.documentElement.clientWidth,'
  + 'ellipsis:document.body.innerText.indexOf("\\u2026")>=0,heads:[]};'
  + 'for(var i=0;i<heads.length;i++){var h=heads[i];'
  + 'var title=h.querySelector(".ilife-block-page-head-title"),value=h.querySelector(".ilife-block-page-head-value"),'
  + 'reading=h.querySelector(".ilife-block-page-head-reading"),eyebrow=h.querySelector(".ilife-block-page-head-eyebrow"),'
  + 'sub=h.querySelector(".ilife-block-page-head-sub");'
  + 'var cs=getComputedStyle(h),ts=getComputedStyle(title),vs=getComputedStyle(value),rs=getComputedStyle(reading);'
  + 'out.heads.push({sw:h.scrollWidth,cw:h.clientWidth,box:box(h),'
  + 'rootFs:parseFloat(cs.fontSize),titleFs:parseFloat(ts.fontSize),valueFs:parseFloat(vs.fontSize),'
  + 'readingDisplay:rs.display,titleLineH:parseFloat(ts.lineHeight)||0,'
  + 'titleText:title.textContent,titleBox:box(title),titleSw:title.scrollWidth,titleCw:title.clientWidth,'
  + 'titleTextOverflow:ts.textOverflow,titleWhiteSpace:ts.whiteSpace,'
  + 'eyebrowText:eyebrow===null?"":eyebrow.textContent,eyebrowTextOverflow:eyebrow===null?"":getComputedStyle(eyebrow).textOverflow,'
  + 'subText:sub===null?"":sub.textContent,subTextOverflow:sub===null?"":getComputedStyle(sub).textOverflow,'
  + 'valueText:value.textContent,valueTextOverflow:vs.textOverflow,valueWhiteSpace:vs.whiteSpace,'
  + 'valueBox:box(value),valueSw:value.scrollWidth,valueCw:value.clientWidth,'
  + 'noteBox:(function(){var n=h.querySelector(".ilife-block-page-head-note");return n===null?null:box(n);}()),'
  + 'denomBox:(function(){var n=h.querySelector(".ilife-block-page-head-denominator");return n===null?null:box(n);}()),'
  + 'eyebrowBox:eyebrow===null?null:box(eyebrow),'
  + 'toolBox:(function(){var n=h.querySelector(".ilife-block-page-head-tool");return n===null?null:box(n);}()),'
  + 'hitInHead:(function(){var r=value.getBoundingClientRect();'
  + 'var el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);'
  + 'return !!el&&(el===value||value.contains(el)||h.contains(el));}())});}'
  + 'return out;}())';

/** 起一页两档夹具（一份 Chrome；两档各一个页面文件，逐个导航）。 */
async function startFixture() {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const dir = mkdtempSync(join(tmpdir(), 't-page-head-'));
  const profileDir = mkdtempSync(join(tmpdir(), 't-page-head-chrome-'));
  const pages = {};
  for (const w of WIDTHS) {
    const p = join(dir, 'fixture-' + w + '.html');
    writeFileSync(p, buildFixture(w), 'utf8');
    pages[w] = p;
  }
  const port = 9740 + (process.pid % 200);
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
    /* 视口恒 1440：两档量到的差异**只可能来自容器查询**（视口宽 ≠ 组件宽）。 */
    await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const at = async (width) => {
      await s('Page.navigate', { url: pathToFileURL(pages[width]).href });
      for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
      await sleep(120);
      return ev(MEASURE);
    };
    /** 焦点地板：注入一枚链接（调用方把工具位换成链接的情形），用 CDP 强制 `:focus-visible` 后量描边。 */
    const focusOutline = async () => {
      await ev('(function(){var h=document.querySelector(".ilife-block-page-head");'
        + 'var a=document.createElement("a");a.href="#";a.id="probe";a.textContent="x";h.appendChild(a);return true}())');
      const { root: docRoot } = await s('DOM.getDocument', { depth: 1 });
      const { nodeId } = await s('DOM.querySelector', { nodeId: docRoot.nodeId, selector: '#probe' });
      await s('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus-visible'] });
      const out = await ev('(function(){var cs=getComputedStyle(document.getElementById("probe"));'
        + 'return {w:parseFloat(cs.outlineWidth),style:cs.outlineStyle};}())');
      await s('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      return out;
    };
    return { at, focusOutline, widths: WIDTHS, close: () => { cdp.close(); cleanup(); } };
  } catch (e) {
    cleanup();
    throw e;
  }
}

describe('pageHead ④ 真机两档（390／1280 容器；视口恒 1440）', () => {
  it('零横向溢出 ＋ 主读数 > 标题字号 ＋ 主读数不被裁 ＋ 长标题换行不掉字', async (t) => {
    const p = await startFixture();
    if (p === null) return t.skip('本机无 Chrome／Chromium：真机两条退化为 ② 的确定性几何判据');
    try {
      const readings = [];
      for (const width of WIDTHS) {
        const m = await p.at(width);
        const why = width + 'px 容器：';

        /* 零横向溢出（页面级与件级两处都量） */
        assert.ok(m.docSw <= m.docCw, why + '页面横向溢出 doc ' + m.docSw + ' > ' + m.docCw);
        assert.ok(m.stageSw <= m.stageCw, why + '容器横向溢出 ' + m.stageSw + ' > ' + m.stageCw);
        assert.equal(m.ellipsis, false, why + '页面上出现了省略号');

        assert.equal(m.heads.length, 2, why + '夹具应有两份页头');
        assert.equal(m.heads.filter((_, i) => (i === 0 ? REAL : HOSTILE).title.length >= 20).length, 1,
          why + '夹具里必须恰有一件长标题（否则「换行不掉字」那条判据空转）');
        for (let i = 0; i < m.heads.length; i += 1) {
          const h = m.heads[i];
          const input = i === 0 ? REAL : HOSTILE;
          assert.ok(h.sw <= h.cw, why + '第 ' + (i + 1) + ' 件横向溢出 ' + h.sw + ' > ' + h.cw);
          assert.ok(Math.abs(h.cw - width) <= 1, why + '第 ' + (i + 1) + ' 件的容器宽不是 ' + width + '：' + h.cw);
          assert.ok(h.box.r <= m.stage.r + 1, why + '第 ' + (i + 1) + ' 件右缘越过容器');
          /* 主读数：字号关系 ＋ 不被裁
             （行内元素的 `scrollHeight` 天生大于 `clientHeight`——那是字体 ascent+descent 对紧 `line-height`
               的固有超出，不是裁切；真正的裁切判据是：横向量得到、盒子没被压扁、落点在件内、样式里零 overflow:hidden）。 */
          assert.ok(h.valueFs > h.titleFs, why + '主读数 ' + h.valueFs + 'px 不大于标题 ' + h.titleFs + 'px');
          assert.ok(h.valueFs >= 2 * h.rootFs, why + '主读数 ' + h.valueFs + 'px 不到正文 ' + h.rootFs + 'px 的 2 倍');
          assert.ok(h.valueSw <= h.valueCw + 1, why + '第 ' + (i + 1) + ' 件主读数被裁（宽 ' + h.valueSw + ' > ' + h.valueCw + '）');
          assert.ok(h.valueBox.h >= h.valueFs * 0.9, why + '第 ' + (i + 1) + ' 件主读数盒被压扁（高 ' + h.valueBox.h + ' < 字号 ' + h.valueFs + '）');
          assert.ok(h.valueBox.r <= m.stage.r + 1 && h.valueBox.l >= m.stage.l - 1, why + '第 ' + (i + 1) + ' 件主读数越出容器');
          assert.ok(h.valueBox.t >= h.box.t - 1 && h.valueBox.b <= h.box.b + 1, why + '第 ' + (i + 1) + ' 件主读数越出件框');
          assert.equal(h.hitInHead, true, why + '第 ' + (i + 1) + ' 件主读数中心点不在件内（被别的盒子盖住／裁掉）');
          /* 长标题：**逐字都在**（没有 `…`、没有少字），且真的换了行（换行是允许的，截断不是） */
          assert.equal(h.titleText, input.title, why + '第 ' + (i + 1) + ' 件标题少字了');
          assert.equal(h.titleTextOverflow, 'clip', why + '第 ' + (i + 1) + ' 件标题带省略号截断');
          assert.equal(h.titleWhiteSpace, 'normal', why + '第 ' + (i + 1) + ' 件标题不许 nowrap');
          assert.ok(h.titleBox.t >= h.box.t - 1 && h.titleBox.b <= h.box.b + 1, why + '第 ' + (i + 1) + ' 件标题越出件框');
          assert.ok(h.titleSw <= h.titleCw + 1, why + '第 ' + (i + 1) + ' 件标题横向溢出');
          /* 长标题必须**换行**（换行是允许的，截断不是）；短标题不强制换行，但夹具必须有一件长的。
             另断「标题盒由整行组成」：半行就是被裁掉的证据。 */
          if (input.title.length >= 20) {
            assert.ok(h.titleLineH > 0 && h.titleBox.h >= 1.8 * h.titleLineH,
              why + '第 ' + (i + 1) + ' 件长标题没有换行（高 ' + h.titleBox.h + '，行高 ' + h.titleLineH + '）');
            const lines = h.titleBox.h / h.titleLineH;
            assert.ok(Math.abs(lines - Math.round(lines)) < 0.05,
              why + '第 ' + (i + 1) + ' 件标题盒不是整行（' + lines.toFixed(2) + ' 行 ⇒ 有半行被裁）');
          }
          /* 眉标与副题同理：可换行、不许截断 */
          assert.equal(h.eyebrowTextOverflow, 'clip', why + '眉标带省略号截断');
          assert.equal(h.subTextOverflow, 'clip', why + '副题带省略号截断');
          assert.ok(h.eyebrowText.includes(input.skill), why + '眉标里没有技能名');
          assert.equal(h.subText, input.sub.join(''), why + '副题少字了');
          assert.equal(h.valueTextOverflow, 'clip', why + '主读数带省略号截断');
        }
        readings.push(width + 'px: scrollWidth ' + m.stageSw + ' ≤ clientWidth ' + m.stageCw
          + '｜读数 ' + m.heads[0].valueFs.toFixed(1) + 'px > 标题 ' + m.heads[0].titleFs.toFixed(1) + 'px'
          + '（正文 ' + m.heads[0].rootFs.toFixed(1) + 'px，比值 ' + (m.heads[0].valueFs / m.heads[0].titleFs).toFixed(2) + '）'
          + '｜读数行 display=' + m.heads[0].readingDisplay
          + '｜标题高 ' + m.heads[1].titleBox.h.toFixed(1) + 'px');
      }
      /* 折行差异**只可能来自容器查询**：两档视口都是 1440，只有组件自己的宽度不同。
         断的是**版面事实**（说明位与值框相不相交），不是 `display` 关键字——关键字一改版就废，版面事实不会。 */
      const narrow = await p.at(390);
      const wide = await p.at(1280);
      assert.equal(narrow.heads[0].readingDisplay, 'grid', '390 容器：附属位应另起一行（@container 命中）');
      assert.equal(wide.heads[0].readingDisplay, 'flex', '1280 容器：附属位与值同排');
      const overlaps = (a, b) => a.t < b.b && a.b > b.t;
      assert.equal(overlaps(narrow.heads[0].noteBox, narrow.heads[0].valueBox), false,
        '390 容器：说明位应与值**不同行**（' + JSON.stringify(narrow.heads[0].noteBox) + ' vs ' + JSON.stringify(narrow.heads[0].valueBox) + '）');
      assert.equal(overlaps(wide.heads[0].noteBox, wide.heads[0].valueBox), true,
        '1280 容器：说明位应与值**同行**（' + JSON.stringify(wide.heads[0].noteBox) + ' vs ' + JSON.stringify(wide.heads[0].valueBox) + '）');
      /* 分母同断一边：窄档它也在值下面一行（值独占一行），宽档与值同行。
         ——这一条是看图抓出来的：`grid-column: 1 / -1` 那条规则曾因选择器拼错而**永不命中**，
         分母于是挤在多行数字的右上角，几何断言却因为「说明位恰好在下一行」而照绿。 */
      assert.equal(overlaps(narrow.heads[0].denomBox, narrow.heads[0].valueBox), false,
        '390 容器：分母位应与值**不同行**（' + JSON.stringify(narrow.heads[0].denomBox) + ' vs ' + JSON.stringify(narrow.heads[0].valueBox) + '）');
      assert.equal(overlaps(wide.heads[0].denomBox, wide.heads[0].valueBox), true,
        '1280 容器：分母位应与值**同行**（' + JSON.stringify(wide.heads[0].denomBox) + ' vs ' + JSON.stringify(wide.heads[0].valueBox) + '）');
      /* 右上工具位：两档都必须与眉标／标题**同一排**，且不得落到主读数那一排或更低——
         它一旦插进标题与主读数之间，主读数就掉到第四行，本形态的识别特征（读数是第二行）当场没了。 */
      for (const [label, m] of [['390 容器', narrow], ['1280 容器', wide]]) {
        const h = m.heads[0];
        assert.equal(overlaps(h.toolBox, h.eyebrowBox) || overlaps(h.toolBox, h.titleBox), true,
          label + '：工具位必须与眉标或标题同一排（不许自成一行）');
        assert.ok(h.toolBox.b <= h.valueBox.t + 1,
          label + '：工具位不得落到主读数那一排或更低（工具底 ' + h.toolBox.b + '，读数顶 ' + h.valueBox.t + '）');
      }
      /* 焦点地板：注入链接后强制 :focus-visible，描边必须看得见 */
      const outline = await p.focusOutline();
      assert.ok(outline.w >= 2 && outline.style !== 'none', '焦点描边不可见：' + JSON.stringify(outline));
      console.log('  [真机读数] ' + readings.join('\n  [真机读数] '));
      console.log('  [真机读数] :focus-visible outline=' + outline.w + 'px ' + outline.style);
    } finally { p.close(); }
  });
});
