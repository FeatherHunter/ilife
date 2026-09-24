/** progress-ring（进度环 · 形态 A「半环 ＋ 环下大字 ＋ 右侧读数」）· 契约测试。
 *
 * 覆盖四组判据：
 *  ① **渲染契约**：结构（类名与槽位）／弧长与读数同一份真值／超目标态（换色 ＋ 一句人话）／
 *     转义面／**全部**非法入参分支（每个都断 `BlocksError`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下（含 `@container`
 *     里的那几条）、零 `:root`／`!important`／零新 token、**手写 `var(--ilife-…)` 一处都没有**；
 *     `dist/components/progress-ring/**` 剥掉字面量与注释后不出现 `document.`／`window.`／`navigator.`；
 *  ③ **加法式**：本件只读自己的类名（选择器全带类名根）；不启用它的页面零命中、逐字节不变；
 *  ④ **两档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 390 与 1280 下零横向溢出、
 *     关键数字零截断、零 `overflow-x`（不藏横滑），且窄档确实是**容器**驱动的（字号按档变）。
 *
 * 期望值一律从组件自己的常量派生（`PROGRESS_RING_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PROGRESS_RING_ARC_LEN,
  PROGRESS_RING_CLASS,
  PROGRESS_RING_FORMS,
  PROGRESS_RING_MISSING,
  PROGRESS_RING_RADIUS_PX,
  PROGRESS_RING_SLOTS,
  PROGRESS_RING_STROKE_PX,
  PROGRESS_RING_VALUE_PX,
  progressRingCss,
  progressRingSlot,
  renderProgressRing,
} from '../dist/components/progress-ring/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { skinClass, skinCss, BROADSHEET_VALUES, NEUTRAL_VALUES, PAPER_VALUES } from '../dist/components/skin/index.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { startShapesPage } from './shapes-probe.mjs';
import { styleSource } from './_style-sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把"解释"当"规则"）。 */
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

/** 样式段里的选择器（含 `@container` 里缩进的那几条 —— 只扫行首顶格的会把它们漏掉）。 */
const selectorsOf = (css) => (stripComments(css).match(/^[ \t]*([^@\s{}][^{}\n]*)\{/gm) || [])
  .map((one) => one.replace(/\{$/, '').trim())
  .filter((one) => one !== '');

/** 内联 SVG 里那条填充弧的 `stroke-dasharray`（两个数：实线长 ＋ 整条弧长）。 */
const dashOf = (html) => {
  const m = /-fil"[^>]*stroke-dasharray="([0-9.]+) ([0-9.]+)"/.exec(html);
  assert.ok(m !== null, '填充弧必须带 stroke-dasharray：' + html.slice(0, 200));
  return { dash: Number(m[1]), gap: Number(m[2]) };
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('progress-ring ① 渲染契约', () => {
  const base = { title: '今日热量预算', value: 1260, goal: 1680, unit: '千卡' };

  it('形态 A：一个环（底轨 ＋ 填充弧）＋ 环下大字 ＋ 百分数 ＋ 右侧读数 ＋ 脚注', () => {
    const html = renderProgressRing({
      ...base, stamp: '3 月 14 日 · 周六',
      rows: [{ label: '还能吃', value: '420 千卡' }, { label: '运动补回', value: '210 千卡' }],
    });
    assert.match(html, new RegExp('^<div class="' + PROGRESS_RING_CLASS + ' is-arc">'));
    assert.equal((html.match(/<svg /g) || []).length, 1, '恰好一张内联 SVG');
    assert.equal((html.match(/<path /g) || []).length, 2, '底轨 ＋ 填充弧');
    assert.match(html, new RegExp('class="' + progressRingSlot('trk') + '"'));
    assert.match(html, new RegExp('class="' + progressRingSlot('fil') + '"'));
    assert.match(html, new RegExp('-title">今日热量预算</'));
    assert.match(html, new RegExp('-stamp">3 月 14 日 · 周六</'));
    assert.match(html, /-value">1 260</, '大字带千分位');
    assert.match(html, /-unit">千卡</);
    assert.match(html, /-denom">／1 680 千卡</);
    assert.match(html, /-pct">75%</, '百分数就写在那条弧旁边');
    assert.equal((html.match(/-kv"/g) || []).length, 2, '右侧两行读数');
    assert.match(html, /-note">已用 75%/);
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('**弧长与读数同一份真值**：dash ÷ 整条弧长 ＝ 那句百分数（三种比例逐条对）', () => {
    for (const [value, goal] of [[1260, 1680], [840, 1680], [0, 1680]]) {
      const html = renderProgressRing({ ...base, value, goal });
      const { dash, gap } = dashOf(html);
      assert.equal(gap, PROGRESS_RING_ARC_LEN, '整条弧长就是半环弧长 πr');
      assert.equal(dash, Math.round((value / goal) * PROGRESS_RING_ARC_LEN * 100) / 100, '实线长 ＝ 比例 × 弧长');
      assert.equal(Math.round((dash / gap) * 100), Math.round((value / goal) * 100), '弧长比 ＝ 读数比');
    }
  });

  it('几何常量就是画在图上的那两个数（半径／描边取自常量，不抄字面量）', () => {
    const html = renderProgressRing(base);
    assert.equal(html.includes('A' + String(PROGRESS_RING_RADIUS_PX) + ' ' + String(PROGRESS_RING_RADIUS_PX)), true);
    assert.equal(html.includes('stroke-width="' + String(PROGRESS_RING_STROKE_PX) + '"'), true);
    assert.match(html, /viewBox="0 0 /, 'viewBox 由常量算出来');
  });

  it('超目标态：`is-over` ＋ 弧画满 ＋ 一句人话（调用方不给就本件按差额与百分比算）', () => {
    const html = renderProgressRing({ ...base, value: 1810 });
    assert.match(html, new RegExp('^<div class="' + PROGRESS_RING_CLASS + ' is-arc is-over">'));
    const { dash, gap } = dashOf(html);
    assert.equal(dash, gap, '超目标时弧画满（形状不变，只换色——与 scale-bar 的"满格"同一条口径）');
    assert.match(html, /-pct">107.7%</, '百分数照实说（107.7%），不截在 100%');
    assert.match(html, /-note">已超出目标 7.7%（多 130 千卡）。/);
    assert.ok(html.includes('aria-label="今日热量预算已完成 107.7%：1 810 千卡 / 1 680 千卡（超目标）"'),
      '无障碍名带上"超目标"与两个数：' + html.slice(0, 260));
    const custom = renderProgressRing({ ...base, value: 1810, overNote: '今天到此为止，明天早餐清淡点。' });
    assert.match(custom, /-note">今天到此为止，明天早餐清淡点。</);
  });

  it('缺省文案按读数算：未超目标时说「已用 …，还剩 …」；正好用满时说「正好用满目标」', () => {
    assert.match(renderProgressRing(base), /-note">已用 75%，还剩 420 千卡。</);
    assert.match(renderProgressRing({ ...base, value: 1680 }), /-note">正好用满目标（1 680 千卡）。/);
    assert.match(renderProgressRing({ ...base, note: '自己那句。' }), /-note">自己那句。</);
  });

  it('缺槽就不出那一槽：不给 rows 就不出读数那一列；不给 stamp 就不出卡头右端', () => {
    const html = renderProgressRing(base);
    assert.equal(html.includes('-kvs'), false);
    assert.equal(html.includes('-stamp'), false);
    assert.equal(html.includes('-kv-'), false);
  });

  it('转义面：标题／口径／单位／读数名与值逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderProgressRing({
      title: evil, stamp: evil, unit: evil, value: 1, goal: 2, rows: [{ label: evil, value: evil }],
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签：' + html.slice(0, 160));
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.equal(html.includes('<script'), false);
    const cls = renderProgressRing({ ...base, extraClass: 'ok-class other' });
    assert.ok(cls.includes('ok-class other'), '合法附加类名照收');
  });

  it('缺值写法：右侧读数的缺值写 `—`，不是 0 也不是空串', () => {
    assert.equal(PROGRESS_RING_MISSING, '—');
    assert.match(renderProgressRing({ ...base, rows: [{ label: '照此收尾', value: PROGRESS_RING_MISSING }] }),
      /-kv-value">—</);
  });

  it('入参违规一律拒（不静默降级）：非对象／标题／数域／形态键／读数列／附加类名', () => {
    assert.deepEqual([...PROGRESS_RING_FORMS], ['arc']);
    assert.equal(throwsBlocks(() => renderProgressRing(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderProgressRing(null)), true);
    assert.equal(throwsBlocks(() => renderProgressRing('x')), true);
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, title: '' })), true, '空标题');
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, title: 1 })), true);
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, value: Number.NaN })), true, 'NaN');
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, value: '1' })), true);
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, value: -1 })), true, '负的已完成量');
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, goal: 0 })), true, '分母为零');
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, goal: -5 })), true);
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, goal: Infinity })), true);
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, form: 'pie' })), true, '闭集外的形态');
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, rows: 'x' })), true);
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, rows: [null] })), true);
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, rows: [{ label: '', value: '1' }] })), true);
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, rows: [{ label: 'a', value: '' }] })), true);
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, rows: [{ label: 'a' }] })), true);
    assert.equal(throwsBlocks(() => renderProgressRing({ ...base, extraClass: 'a"b' })), true);
  });

  it('纯函数：同样的入参恒产同样的字节', () => {
    assert.equal(renderProgressRing(base), renderProgressRing(base));
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('progress-ring ② 样式与零 DOM 纪律', () => {
  const css = progressRingCss();

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且带本件类名根', () => {
    const clean = stripComments(css);
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 10, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        assert.ok(part.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + part.trim());
        assert.ok(part.includes(PROGRESS_RING_CLASS), '选择器必须只碰本件类名根：' + part.trim());
        /* 拼后代／兄弟选择器时**只许第一段带 scope**：`.page-ui .a .page-ui .b` 里第二条 `.page-ui`
           永远匹配不到 —— 规则「看着在、其实不生效」（样张页上抓到过一次真事：超目标态漏换色）。 */
        assert.equal((part.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次：' + part.trim());
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零 `@media`／必带 `@container`（宽度只许容器判）', () => {
    const clean = stripComments(css);
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(clean.includes('@media'), false, '本件不判视口宽度（视口宽 ≠ 组件宽）');
    assert.equal(clean.includes('@container'), true, '窄档必须由容器判');
    const decls = clean.match(/--[a-z0-9-]+\s*:/g) || [];
    assert.deepEqual(decls, [], '不得定义新 token：' + decls.join(' '));
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(clean.includes(frozen + ':'), false, '不得重定义冻结 token：' + frozen);
    }
  });

  it('**源码级**：本件样式不手写 `var(--ilife-…)`（兜底链只许住在 skin/contract.ts）；产出的色值只来自那条链', () => {
    const src = stripComments(styleSource('progress-ring'));
    assert.deepEqual([...src.matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [], '源码里请改走 skinVar()');
    const clean = stripComments(css);
    assert.ok(clean.includes('var(--ilife-ink,'), '皮肤色必须经 skinVar 走兜底链');
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    assert.equal(clean.includes('color-mix(in srgb,'), true, '底轨的灰是算出来的（主文字往卡面混）');
  });

  it('尺寸事实写在一处：大字字号与环上限取常量', () => {
    const clean = stripComments(css);
    assert.ok(clean.includes('font-size: ' + String(PROGRESS_RING_VALUE_PX) + 'px'), '大字取 PROGRESS_RING_VALUE_PX');
    assert.ok(clean.includes('max-width: 280px'), '环的上限写在样式段里');
  });

  it('`dist/components/progress-ring/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'progress-ring');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 4, '至少该有 index／attrs／model／render／style 的产物：' + files.join('、'));
    const stripLiterals = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const name of files) {
      const code = stripLiterals(readFileSync(join(dir, name), 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, name + ' 里出现了 ' + needle);
      }
    }
  });

  it('槽位闭集与类名一致（判据不另抄一份字面量）', () => {
    assert.equal(new Set(PROGRESS_RING_SLOTS).size, PROGRESS_RING_SLOTS.length, '槽名不许重复');
    assert.equal(progressRingSlot('value'), PROGRESS_RING_CLASS + '-value');
    assert.equal(progressRingSlot('value', 'x-'), 'x-block-progress-ring-value');
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('progress-ring ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(PROGRESS_RING_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物（不碰公共选择器、不写全局状态）', () => {
    const before = renderScaleBar({ value: 860, goal: 1850 });
    renderProgressRing({ title: 'x', value: 1, goal: 2 });
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), before, '别件的产物逐字节不变');
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(progressRingCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-progress-ring'), '前缀必须作用到 scope 与类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });
});

/* ── ④ 两档几何（真机） ─────────────────────────────────────────────── */

/** 三种压力样例：常规／超目标／长标题 ＋ 大数（最容易被撑宽的就是最后一档）。 */
function cases() {
  return [
    { name: 'normal', html: renderProgressRing({
      title: '今日热量预算', stamp: '3 月 14 日 · 周六', value: 1260, goal: 1680, unit: '千卡',
      rows: [{ label: '还能吃', value: '420 千卡' }, { label: '运动补回', value: '210 千卡' },
        { label: '照此收尾', value: '1 690 千卡' }],
    }) },
    { name: 'over', html: renderProgressRing({
      title: '本月支出', value: 1810, goal: 1680, unit: '元', rows: [{ label: '超出预算', value: '130 元' }],
    }) },
    { name: 'long', html: renderProgressRing({
      title: '居家管家 · 本轮盘点进度（含未登记位置的物品）', value: 1234567, goal: 2000000, unit: '件',
      rows: [{ label: '找不到位置的物品（需要人工核对）', value: '123 456 件' }],
    }) },
  ];
}

/** 关键语义槽（数字／脚注）：两档下都不许被截断。选择器从槽位常量拼，不另抄类名字面量。 */
const KEY_SELECTORS = ['value', 'pct', 'denom', 'kv-value', 'note']
  .map((slot) => '.' + progressRingSlot(slot));

describe('progress-ring ④ 两档几何（真机 headless Chrome ＋ CDP）', () => {
  it('容器 390 与 1280：零横向溢出、关键数字零截断、零 overflow-x，且窄档是容器驱动的', async (t) => {
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    /* 三套皮肤各一块（同一份标记、只挂不同的皮肤类）：几何读数逐套皮肤取。 */
    const html = ['paper', 'broadsheet', 'neutral']
      .map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n');
    const page = await startShapesPage({ html, css: skinCss() + '\n' + progressRingCss() });
    if (page === null) return t.skip('本机无 Chrome／Chromium：两档几何判据需真浏览器');
    try {
      const seen = [];
      for (const width of [390, 1280]) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of ['paper', 'broadsheet', 'neutral']) {
          for (const c of cases()) {
            const scope = '.' + skinClass(skin) + ' [data-case="' + c.name + '"] ';
            const root = await page.read([scope + '.' + PROGRESS_RING_CLASS]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            assert.equal(root[0].visible, 1);
            assert.ok(root[0].maxScrollW <= root[0].maxClientW + 1,
              width + ' 档 ' + skin + ' ' + c.name + '：根横向溢出 ' + root[0].maxScrollW + ' > ' + root[0].maxClientW);
            assert.equal(root[0].scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            const keys = await page.read(KEY_SELECTORS.map((sel) => scope + sel));
            for (const one of keys) {
              assert.ok(one.visible > 0, width + ' 档 ' + skin + ' ' + c.name + '：关键槽不见了 ' + one.sel);
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：关键数字被截断 ' + one.sel);
              assert.ok(one.maxRight <= root[0].maxRight + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：关键槽跑出根 ' + one.sel);
            }
            const size = await page.ev('parseFloat(getComputedStyle(document.querySelector('
              + JSON.stringify(scope + '.' + progressRingSlot('value')) + ')).fontSize)');
            seen.push({ width, skin, name: c.name, rootScrollW: root[0].maxScrollW,
              rootClientW: root[0].maxClientW, valuePx: size });
          }
        }
      }
      /* 窄档确实是**容器**驱动的：390 档的大字比 1280 档小一档（视口没变，只改了容器宽度）。 */
      const narrow = seen.filter((s) => s.width === 390);
      const wide = seen.filter((s) => s.width === 1280);
      assert.equal(wide.every((s) => s.valuePx === PROGRESS_RING_VALUE_PX), true,
        '1280 档大字应取常量 ' + PROGRESS_RING_VALUE_PX + '：' + JSON.stringify(wide.map((s) => s.valuePx)));
      assert.equal(narrow.every((s) => s.valuePx < PROGRESS_RING_VALUE_PX), true,
        '390 档大字应收一档（@container 判的是本件自己的宽度）：' + JSON.stringify(narrow.map((s) => s.valuePx)));
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      /* **超目标态真的换色**：三处（填充弧／百分数胶囊／脚注）都要与正常态不同 ——
         光看标记里有 `is-over` 不够（选择器拼错时规则看着在、其实不生效）。 */
      for (const skin of ['paper', 'broadsheet', 'neutral']) {
        const state = await page.ev('(function(){var s=' + JSON.stringify('.' + skinClass(skin) + ' ') + ';'
          + 'var n=document.querySelector(s+' + JSON.stringify(' [data-case="normal"] .' + PROGRESS_RING_CLASS) + ');'
          + 'var o=document.querySelector(s+' + JSON.stringify(' [data-case="over"] .' + PROGRESS_RING_CLASS) + ');'
          + 'var f=function(root,cls){var cs=getComputedStyle(root.querySelector("."+cls));'
          + 'return {stroke:cs.stroke,color:cs.color,bg:cs.backgroundColor,weight:cs.fontWeight};};'
          + 'return {nFil:f(n,"' + progressRingSlot('fil') + '"),oFil:f(o,"' + progressRingSlot('fil') + '"),'
          + 'nPct:f(n,"' + progressRingSlot('pct') + '"),oPct:f(o,"' + progressRingSlot('pct') + '"),'
          + 'nNote:f(n,"' + progressRingSlot('note') + '"),oNote:f(o,"' + progressRingSlot('note') + '")};}())');
        assert.notEqual(state.oFil.stroke, state.nFil.stroke, skin + '：超目标的填充弧必须换色');
        assert.notEqual(state.oPct.color, state.nPct.color, skin + '：超目标的百分数胶囊必须换色');
        assert.notEqual(state.oPct.bg, state.nPct.bg, skin + '：超目标的百分数胶囊必须换底');
        assert.notEqual(state.oNote.color, state.nNote.color, skin + '：超目标的脚注必须换色');
        assert.notEqual(state.oNote.weight, state.nNote.weight, skin + '：超目标的脚注必须加重（色不是唯一信息）');
      }
      /* 机器读数行（回执里引它）：两档的最大横向读数。 */
      for (const w of [390, 1280]) {
        const rows = seen.filter((s) => s.width === w);
        console.log('READING progress-ring container=' + w
          + ' maxRootScrollW=' + Math.max(...rows.map((s) => s.rootScrollW))
          + ' maxRootClientW=' + Math.max(...rows.map((s) => s.rootClientW))
          + ' fontSize=' + rows[0].valuePx + 'px cases=' + rows.length);
      }
    } finally { page.close(); }
  });
});
