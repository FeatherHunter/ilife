/** streak-badge（连记徽标）· 契约测试。
 *
 *  四组判据：
 *   ① **渲染契约**：结构（前词／数／量词／强弱档）／空态／**转义面**／**全部**非法入参分支；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤／scope 在 `.ilife-page-ui` 下／零 `:root`／`!important`／
 *      **强弱三档必须有形状差异**（实底／描边／底线——只靠变色在「大字报刊」那档会塌）／窄档走 `@container`；
 *      `dist/**` 的**代码**零 DOM；
 *   ③ **加法式**：只读自己的类名、渲染两次逐字节相同；
 *   ④ **真机两档（390／1280）**：零横向溢出 ＋ 数（`.value`）**不被 `…` 截断** ＋ 徽标高 ≥32（行内不塌）
 *      ＋ 静态件读数：零可点元素、零动效（没有可卡住的中间态，也不装作能点）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  STREAK_BADGE_CLASS, STREAK_BADGE_FORMS, STREAK_BADGE_MIN_HEIGHT_PX, STREAK_BADGE_MISSING,
  STREAK_BADGE_NARROW_MAX_PX, STREAK_BADGE_VALUE_PX, STREAK_STRENGTHS,
  renderStreakBadges, streakBadgeCss, streakBadgeSlot,
} from '../dist/components/streak-badge/index.js';
import { SKIN_TOKEN_NAMES, skinTokenVar } from '../dist/components/skin/index.js';
import { startFamilyPage } from './_f5-probe.mjs';
import { styleSource } from './_style-sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT_SEL = '.' + STREAK_BADGE_CLASS;
const slot = (name) => '.' + streakBadgeSlot(name);

/** 三档各一个（强弱形状差异是这一件的要害）。 */
function sampleBadges() {
  return [
    { strength: 'strong', label: '连续记录', value: '37', unit: '天' },
    { strength: 'mid', label: '本月', value: '21 / 30', unit: '天有记录' },
    { strength: 'weak', label: '上次断在', value: '08-14' },
  ];
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('streak-badge ① 渲染契约', () => {
  it('结构：小标题 ＋ 逐枚徽标（前词／数／量词），档位进类', () => {
    const html = renderStreakBadges({ heading: '连记', badges: sampleBadges() });
    assert.ok(html.startsWith('<div class="' + STREAK_BADGE_CLASS + '">'), '根用类名根打头：' + html.slice(0, 80));
    assert.ok(html.includes(slot('heading').slice(1) + '">连记<'), '小标题');
    assert.equal((html.match(new RegExp(streakBadgeSlot('badge'), 'g')) || []).length, 3, '三枚徽标');
    assert.ok(html.includes(slot('badge').slice(1) + ' is-strong"><span class="' + streakBadgeSlot('label')
      + '">连续记录</span><b class="' + streakBadgeSlot('value') + '">37</b><span class="'
      + streakBadgeSlot('unit') + '">天</span>'), '前词／数／量词三槽依次排开');
    for (const strength of STREAK_STRENGTHS) assert.ok(html.includes(' is-' + strength + '"'), '档类：' + strength);
    assert.deepEqual([...STREAK_STRENGTHS], ['strong', 'mid', 'weak']);
    assert.deepEqual([...STREAK_BADGE_FORMS], ['row'], '形态闭集只有形态 A「一行几个徽标」');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
    assert.ok(!html.includes('data-'), '本件不带机器属性（静态件）');
  });

  it('缺的槽不留空位：不给 unit 就只有前词与数', () => {
    const html = renderStreakBadges({ badges: [{ strength: 'weak', label: '上次断在', value: '08-14' }] });
    assert.equal(html.includes(streakBadgeSlot('unit')), false, '不给量词就不出这一槽');
    assert.equal(html.includes(streakBadgeSlot('heading')), false, '不给小标题就不出这一行');
  });

  it('空态：没有徽标且没有空态那一句 ⇒ 空串；给了才出（它是"没什么"，不是一个徽标）', () => {
    assert.equal(renderStreakBadges({ badges: [] }), '');
    const empty = renderStreakBadges({ badges: [], heading: '连记', absentLine: '还没有连记记录' });
    assert.equal((empty.match(new RegExp(streakBadgeSlot('badge'), 'g')) || []).length, 0, '空态不得被算成徽标');
    assert.ok(empty.includes(slot('absent').slice(1) + '">还没有连记记录<'));
  });

  it('缺值写法写在一处：`—`（数不许写 0、不许留空）', () => {
    assert.equal(STREAK_BADGE_MISSING, '—');
    const html = renderStreakBadges({ badges: [{ strength: 'mid', label: '本月', value: STREAK_BADGE_MISSING }] });
    assert.ok(html.includes('>' + STREAK_BADGE_MISSING + '<'), '缺值由调用方按这条口径给串');
  });

  it('转义面：小标题／前词／数／量词逐位转义，塞不进标签', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderStreakBadges({ heading: evil, badges: [{ strength: 'strong', label: evil, value: evil, unit: evil }] });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
  });

  it('入参违规一律拒（不静默降级）：逐条断 BlocksError', () => {
    const throws = (fn) => {
      try { fn(); } catch (e) { return e.name === 'BlocksError'; }
      return false;
    };
    assert.equal(throws(() => renderStreakBadges(null)), true, '入参不是对象');
    assert.equal(throws(() => renderStreakBadges({ badges: 'x' })), true, 'badges 不是数组');
    assert.equal(throws(() => renderStreakBadges({ badges: ['x'] })), true, '徽标不是对象');
    assert.equal(throws(() => renderStreakBadges({ badges: [{ label: 'a', value: '1' }] })), true, 'strength 必填');
    assert.equal(throws(() => renderStreakBadges({ badges: [{ strength: 'loud', label: 'a', value: '1' }] })), true, '档位闭集外');
    assert.equal(throws(() => renderStreakBadges({ badges: [{ strength: 'mid', value: '1' }] })), true, 'label 必填');
    assert.equal(throws(() => renderStreakBadges({ badges: [{ strength: 'mid', label: 'a' }] })), true, 'value 必填');
    assert.equal(throws(() => renderStreakBadges({ badges: [{ strength: 'mid', label: 'a', value: '' }] })), true, 'value 不许空串');
    assert.equal(throws(() => renderStreakBadges({ badges: [{ strength: 'mid', label: 'a', value: '1', unit: 2 }] })), true, 'unit 不是串');
    assert.equal(throws(() => renderStreakBadges({ badges: [], form: 'week' })), true, '形态闭集外');
    assert.equal(throws(() => renderStreakBadges({ badges: [], extraClass: 'a b!' })), true, '附加类名不合法');
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('streak-badge ② 样式与零 DOM 纪律', () => {
  it('全部规则 scope 在 `.ilife-page-ui` 下、只读自己的类名、窄档走容器查询', () => {
    const css = stripComments(streakBadgeCss());
    assert.ok(css.trim() !== '', '样式段必须非空');
    const selectors = (css.match(/^[^@\s][^{\n]*\{/gm) || []);
    assert.ok(selectors.length >= 15, '选择器条数太少：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '必须 scope 在 .ilife-page-ui：' + sel.trim());
      assert.ok(sel.includes(STREAK_BADGE_CLASS), '只许读自己的类名根：' + sel.trim());
    }
    assert.ok(css.includes('@container'), '窄档必须走容器查询');
    assert.equal(/@media[^{]*max-width/.test(css), false, '媒体查询不许判宽度');
    assert.ok(css.includes(String(STREAK_BADGE_NARROW_MAX_PX) + 'px'), '窄档断点取常量');
    assert.ok(css.includes(String(STREAK_BADGE_MIN_HEIGHT_PX) + 'px'), '徽标高度下限取常量');
    assert.ok(css.includes(String(STREAK_BADGE_VALUE_PX) + 'px'), '数的字号取常量（大一号）');
  });

  it('**三档必须有形状差异**：实底（无框）／描边（有框）／无框只带底线', () => {
    const css = stripComments(streakBadgeCss());
    assert.ok(/\.is-strong \{[^}]*border: 0;/.test(css), '强档：无框 ＋ 实底');
    assert.ok(/\.is-strong \{[^}]*background: var\(--ilife-accent/.test(css), '强档：实底取强调色 token');
    assert.ok(/\.is-mid \{[^}]*border: 1px solid/.test(css), '中档：描边空心');
    assert.ok(/\.is-weak \{[^}]*border: 0;/.test(css) && /\.is-weak \{[^}]*border-bottom: 2px solid/.test(css),
      '弱档：无框、只带底线');
    const weights = css.match(/font-weight: (800|700|600)/g) || [];
    assert.ok(weights.length >= 3, '三档字重依次不同：' + weights.join(' '));
  });

  it('只经 skinVar 读皮肤：零 `:root`／`!important`／新 token／手写 var(--ilife-…)', () => {
    const css = stripComments(streakBadgeCss());
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.deepEqual(css.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    const src = styleSource('streak-badge')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    assert.deepEqual(src.match(/var\(\s*--ilife-/g) || [], [], '手写了 var(--ilife-…)：请走 skinVar()');
    const produced = [...css.matchAll(/var\(--ilife-[a-z0-9-]+([^)]*)/g)].map((m) => m[1]);
    assert.ok(produced.length >= 8, '读的 token 太少：' + produced.length);
    for (const rest of produced) assert.ok(rest.startsWith(', '), 'skinVar 之外的字面 var(--ilife-…)：' + rest);
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => skinTokenVar(k)));
    for (const name of new Set([...css.matchAll(/var\((--ilife-[a-z0-9-]+),/g)].map((m) => m[1]))) {
      assert.ok(known.has(name), '名单外的 token：' + name);
    }
  });

  it('纯静态件：零 transition／animation／cursor:pointer', () => {
    const css = stripComments(streakBadgeCss());
    assert.equal(/transition\s*:/.test(css), false, '本件零动效');
    assert.equal(/animation\s*:/.test(css), false, '本件零动画');
    assert.equal(/cursor\s*:\s*pointer/.test(css), false, '本件没有可点元素，不许给手型');
  });

  it('`dist/components/streak-badge/**` 的代码零 document.／window.／navigator.', () => {
    const dir = join(PKG, 'dist', 'components', 'streak-badge');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 4, '至少应扫到本件的编译产物：' + files.length);
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

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('streak-badge ③ 加法式（不碰公共选择器、渲染确定）', () => {
  it('标记只带自己的类名（顶多加档位修饰类 is-<档> 与一个 extraClass）', () => {
    const html = renderStreakBadges({ badges: sampleBadges(), extraClass: 'mine-extra' });
    const modifiers = new Set(STREAK_STRENGTHS.map((s) => 'is-' + s));
    for (const cls of [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/))) {
      assert.ok(cls.startsWith(STREAK_BADGE_CLASS) || modifiers.has(cls) || cls === 'mine-extra',
        '混进了别人的类名：' + cls);
    }
  });

  it('同样的入参渲染两次逐字节相同（纯函数、无全局状态）', () => {
    const input = { heading: '连记', badges: sampleBadges() };
    assert.equal(renderStreakBadges(input), renderStreakBadges(input));
  });
});

/* ── ④ 真机两档 ─────────────────────────────────────────────────────── */

describe('streak-badge ④ 真机（无头 Chrome）', () => {
  it('390／1280 两档零横向溢出、数不截断、徽标高 ≥32、零动效零可点元素', async (t) => {
    const body = renderStreakBadges({ heading: '连记', badges: sampleBadges() })
      + renderStreakBadges({ heading: '记账', badges: [], absentLine: '还没有连记记录' });
    const p = await startFamilyPage({ css: streakBadgeCss(), bodyHtml: body });
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何判据需真浏览器');
    try {
      const keys = [slot('value'), slot('label'), slot('unit'), slot('heading')];
      for (const w of [390, 1280]) {
        await p.setWidth(w);
        const m = await p.metrics({ roots: [ROOT_SEL], keys });
        assert.equal(m.stage.w, w);
        assert.ok(m.stage.sw <= m.stage.cw + 1, w + ' 档舞台横向溢出');
        assert.ok(m.page.sw <= m.page.cw + 1, w + ' 档页面横向溢出');
        assert.equal(m.roots.length, 2, w + ' 档两块徽标组都在');
        for (const r of m.roots) assert.ok(r.sw <= r.cw + 1, w + ' 档件根横向溢出：' + r.sw + ' > ' + r.cw);
        for (const k of m.keys) {
          assert.ok(k.n > 0, w + ' 档关键语义没扫到：' + k.selector);
          for (const it of k.items) {
            assert.ok(it.sw <= it.cw + 1, w + ' 档 ' + k.selector + ' 被截断：' + it.text);
            assert.ok(it.right <= it.stageRight + 1, w + ' 档 ' + k.selector + ' 顶出舞台：' + it.right);
          }
        }
        const heights = await p.ev('(function(){return [].slice.call(document.querySelectorAll('
          + JSON.stringify(slot('badge')) + ')).map(function(el){return Math.round(el.getBoundingClientRect().height);});}())');
        assert.equal(heights.length, 3, w + ' 档三枚徽标都在');
        for (const h of heights) assert.ok(h >= STREAK_BADGE_MIN_HEIGHT_PX, w + ' 档徽标只有 ' + h + ' 高');
      }
      /* 强弱三档的**取值规则真的落地**（真机读法）：强档反白、弱档弱文字，两档的数不同色；
         形状差异（实底／描边／底线）也一并从浏览器里读回来。 */
      const tones = await p.ev('(function(){'
        + 'var pick=function(s){var el=document.querySelector(s); return el?getComputedStyle(el):null;};'
        + 'var strong=pick(' + JSON.stringify(slot('badge') + '.is-strong') + ');'
        + 'var mid=pick(' + JSON.stringify(slot('badge') + '.is-mid') + ');'
        + 'var weak=pick(' + JSON.stringify(slot('badge') + '.is-weak') + ');'
        + 'return {strongBg:strong.backgroundColor, midBg:mid.backgroundColor, weakBg:weak.backgroundColor,'
        + ' strongValue:pick(' + JSON.stringify(slot('badge') + '.is-strong ' + slot('value')) + ').color,'
        + ' weakValue:pick(' + JSON.stringify(slot('badge') + '.is-weak ' + slot('value')) + ').color,'
        + ' midBorder:mid.borderTopWidth, weakBorder:weak.borderTopWidth,'
        + ' strongWeight:strong.fontWeight, weakWeight:weak.fontWeight};}())');
      assert.notEqual(tones.strongBg, tones.midBg, '强档（实底）与中档（空心）必须不同：' + tones.strongBg + ' / ' + tones.midBg);
      assert.notEqual(tones.midBorder, tones.weakBorder, '中档有框、弱档无框（形状差异真的生效）');
      assert.notEqual(tones.strongWeight, tones.weakWeight, '三档字重不同：' + tones.strongWeight + ' / ' + tones.weakWeight);
      assert.notEqual(tones.strongValue, tones.weakValue, '两档的数不同色（取值规则真的落地）');
      await p.emulate({ reducedMotion: true });
      assert.equal(await p.ev('document.querySelectorAll(' + JSON.stringify(ROOT_SEL
        + ' a,' + ROOT_SEL + ' button,' + ROOT_SEL + ' input,'
        + ROOT_SEL + ' [tabindex]') + ').length'), 0, '本件不许有可点元素');
      assert.equal(await p.runningAnimations(), 0, '不许有东西卡在半路');
      assert.deepEqual(await p.errors(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
