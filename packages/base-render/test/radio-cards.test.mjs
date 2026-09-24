/** radioCards（单选卡组 · 形态 A「竖排卡」）· **判据件**。
 *
 *  断言对象是本件**自己的唯一出口**：`dist/components/radio-cards/index.js`
 *  （组件层不进冻结面、不从根出口；层出口那一行由接线席统一加）。
 *
 *  四类（契约 §五）＋ 三条本件特有的硬判据：
 *   ① **渲染契约**：槽位齐全／缺槽不出／空态／加载态／错态／**全部**非法入参分支走 `BlocksError`；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤（逐处与 `skinVar()` 的兜底链**逐字相同**）／
 *      scope 在 `.ilife-page-ui` 之下／零 `:root`／零 `!important`／零新 token 名／零宽度媒体查询／
 *      零 `…` 截断手段 ／**几何事实**（触控目标 ≥44）；
 *   ③ **加法式**：不挂本件时同页产物逐字节不变；本件不碰公共选择器；
 *   ④ **真机两档**（headless Chrome ＋ CDP）：容器宽 **390 与 1280** 零横向溢出、**触控目标 ≥44×44**、
 *      **选中态不只靠颜色**（在「大字报刊」皮肤下强调色＝墨黑时仍读得出）、键盘焦点可见、
 *      点了就派发事件、零未捕获错误；
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
  RADIO_CARDS_CARD_MIN_HEIGHT_PX,
  RADIO_CARDS_CLASS,
  RADIO_CARDS_FORMS,
  RADIO_CARDS_MIN_TARGET_PX,
  RADIO_CARDS_NARROW_PX,
  RADIO_CARDS_SLOTS,
  buildRadioCardsJs,
  radioCardsCss,
  radioCardsSlot,
  renderRadioCards,
} from '../dist/components/radio-cards/index.js';
import { SKIN_NAMES, SKIN_TOKEN_NAMES, skinClass, skinCss, skinTokenVar, skinVar } from '../dist/components/skin/index.js';

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
/** 一处 `var(--ilife-…)` 的边界：它必须与 `skinVar(名)` **逐字相同**。 */
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

/** 一页真实形状的账户单选（记账「这一笔记到哪儿」）。 */
const REAL = {
  name: 'acct',
  label: '账户',
  hint: '这一笔记到哪儿',
  value: 'card',
  options: [
    { value: 'cash', title: '现金', lead: '现', reading: '¥1,286.40', readingLabel: '余额', desc: '钱包里的现钞，找零、现金红包都记在这里。' },
    { value: 'card', title: '招行储蓄卡', lead: '卡', reading: '¥18,402.15', readingLabel: '余额', desc: '日常刷卡都走这张，工资也进这张。' },
    { value: 'wechat', title: '微信零钱', lead: '微', reading: '¥236.80', readingLabel: '余额', desc: '扫码付款、群里收红包；银行卡直付的不算这里。' },
  ],
};

/** 敌意入参：超长标题／读数／说明（零横向溢出与「不截断」都靠它压出来）。 */
const HOSTILE = {
  name: 'acct-hostile',
  label: '这一组账户的名字长到必须换行，不然窄容器里一屏放不下',
  hint: '这一笔记到哪儿，先看清余额再定',
  value: 'b',
  options: [
    { value: 'a', title: '余额特别长的那一张卡', lead: '卡', reading: '¥1,234,567,890.12', readingLabel: '可用余额', desc: '说明也可以很长：这句话故意写得很长很长，长到窄容器里必须折行，而且不许出现省略号。' },
    { value: 'b', title: '被停用的那张卡', lead: '停', reading: '¥0.00', readingLabel: '余额', desc: '这张卡挂失补办中。', disabled: true, disabledReason: '挂失补办中，暂时不能记账' },
  ],
  extraClass: 'ok-class other',
};

/** 每套皮肤下强调色对墨黑的关系：这就是「选中态不许只靠颜色」那条判据的来由。 */

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('radioCards ① 渲染契约', () => {
  it('槽位齐全：组名行 ＋ 选项列（role=radiogroup）＋ 每张卡（原生 radio ＋ 标记位 ＋ 图标位 ＋ 标题 ＋ 读数 ＋ 说明）', () => {
    const html = renderRadioCards(REAL);
    assert.match(html, /^<div class="ilife-block-radio-cards is-cards" data-ilife-radio-name="acct"/, html.slice(0, 90));
    assert.match(html, /data-ilife-radio-form="cards"/);
    assert.match(html, /data-ilife-radio-value="card"/, '机器值落属性');
    assert.match(html, /-legend"><b class="ilife-block-radio-cards-legend-title">账户<\/b><span class="ilife-block-radio-cards-legend-hint">这一笔记到哪儿<\/span><\/p>/);
    assert.match(html, /role="radiogroup" aria-label="账户"/, '选项列是 radiogroup');
    assert.equal((html.match(/<input type="radio"/g) || []).length, 3, '逐项一个原生 radio');
    assert.equal((html.match(/ name="acct"/g) || []).length, 3, '同组同 name');
    assert.equal((html.match(/ checked/g) || []).length, 1, '恰好一项被勾上');
    assert.match(html, /value="card" checked/, '机器值命中那一项被勾上');
    assert.match(html, /-mk" aria-hidden="true">/, '标记位是装饰位');
    assert.match(html, /-lead" aria-hidden="true">卡</, '图标位是装饰位');
    assert.match(html, /-reading"><i class="ilife-block-radio-cards-reading-label">余额<\/i>¥18,402.15<\/span>/);
    assert.match(html, /-desc">日常刷卡都走这张/, '说明在');
    assert.equal(/<script/i.test(html), false, '不产脚本');
    assert.equal(/\son[a-z]+=/i.test(html), false, '不产内联事件处理器');
  });

  it('缺槽不出：不给 help 文字／读数／说明就不出那一槽（不留空位、不拿占位符顶替）', () => {
    const html = renderRadioCards({ name: 'n', label: '记法', options: [{ value: 'a', title: '按食材记' }] });
    assert.equal(html.includes('-legend-hint'), false, '不给 hint ⇒ 组名行只有主段');
    assert.equal(html.includes('-reading'), false, '不给读数 ⇒ 读数位一个字都不出');
    assert.equal(html.includes('-desc'), false);
    assert.equal(html.includes('-lead'), false);
    assert.equal(html.includes('role="radiogroup" aria-label="记法"'), true);
  });

  it('三个"没有正常内容"的状态各出各的骨架：空态／加载态（原地换字）／错态', () => {
    const empty = renderRadioCards({ name: 'n', label: '账户', options: [] });
    assert.match(empty, /-empty" role="status">没有可选项</, '空数组 ⇒ 设计过的空态');
    assert.equal(empty.includes('radiogroup'), false, '空态不出选项列');
    const loading = renderRadioCards({ name: 'n', label: '账户', loading: true, options: [] });
    assert.match(loading, /-loading" role="status">正在读取</);
    assert.equal(loading.includes('没有可选项'), false, '加载态不冒充空态');
    const withRows = renderRadioCards({ name: 'n', label: '账户', loading: true, options: REAL.options });
    assert.match(withRows, /data-ilife-radio-loading="1"/, '加载标记落根上');
    assert.match(withRows, /aria-busy="true"/, '选项列标 `aria-busy`');
    assert.equal((withRows.match(/正在读取/g) || []).length, 3, '读数**原地换字**（三项各换一处）');
    assert.equal(withRows.includes('¥1,286.40'), false, '加载态不再显示旧读数');
    assert.equal((withRows.match(/ disabled/g) || []).length, 3, '加载态三项不可点（原生 disabled 逐项落）');
    const err = renderRadioCards({ name: 'n', label: '账户', options: REAL.options, error: '先选一个账户' });
    assert.match(err, /-error" id="ilife-radio-err-n">先选一个账户</, '错态写在控件旁边');
    assert.match(err, /aria-invalid="true" aria-describedby="ilife-radio-err-n"/, '错态挂 `aria-describedby`');
  });

  it('禁用：原生 `disabled` ＋ 原因写在卡里（不只染色）；`required` 上 `aria-required`', () => {
    const html = renderRadioCards({
      name: 'n', label: '账户', required: true,
      options: [{ value: 'a', title: '现金', disabled: true, disabledReason: '这张卡挂失补办中' }],
    });
    assert.match(html, /<input type="radio" name="n" value="a" disabled/, '禁用落原生 `disabled`');
    assert.match(html, /<i class="ilife-block-radio-cards-why">这张卡挂失补办中<\/i>/, '原因写出来');
    assert.match(html, /aria-required="true"/);
  });

  it('转义：机器值／标题／读数／说明／图标位／组名逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderRadioCards({
      name: 'n1', label: evil, hint: evil,
      options: [{ value: evil, title: evil, desc: evil, reading: evil, readingLabel: evil, lead: '一' }],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.equal(/\son[a-z]+=/i.test(html), false, '不得出现内联事件处理器');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.throws(() => renderRadioCards({ ...REAL, extraClass: 'a"b' }), /只许空格分隔的类名/);
    assert.match(renderRadioCards({ ...REAL, extraClass: 'ok-1 other' }), /is-cards ok-1 other"/);
  });

  it('形态键是闭集：闭集外一律 BlocksError（不静默降级成另一种骨架）', () => {
    assert.deepEqual([...RADIO_CARDS_FORMS], ['cards']);
    assert.equal(throwsBlocks(() => renderRadioCards({ ...REAL, form: 'trio' })), true);
    assert.match(renderRadioCards({ ...REAL, form: 'cards' }), /is-cards/);
  });

  it('非法入参**逐条**走 BlocksError（不静默降级、不「尽量猜」）', () => {
    const ok = { name: 'n', label: '账户', options: [{ value: 'a', title: '现金' }] };
    assert.equal(throwsBlocks(() => renderRadioCards(undefined)), true);
    assert.equal(throwsBlocks(() => renderRadioCards(null)), true);
    assert.equal(throwsBlocks(() => renderRadioCards([])), true);
    assert.equal(throwsBlocks(() => renderRadioCards('x')), true);
    assert.equal(throwsBlocks(() => renderRadioCards({ label: '账户', options: ok.options })), true, 'name 必填');
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, name: '' })), true);
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, name: 1 })), true);
    assert.equal(throwsBlocks(() => renderRadioCards({ name: 'n', options: ok.options })), true, 'label 必填（没有组名的单选组读不出"在选什么"）');
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, label: '' })), true);
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, hint: 1 })), true);
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, options: 'x' })), true, 'options 非数组');
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, options: [{ value: 'a' }] })), true, '选项 title 必填');
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, options: [{ title: '现金' }] })), true, '选项 value 必填');
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, options: [{ value: '', title: 'x' }] })), true);
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, options: [{ value: 'a', title: '现金', lead: '三个字' }] })), true, '图标位只许 1–2 字');
    assert.equal(throwsBlocks(() => renderRadioCards({
      ...ok, options: [{ value: 'a', title: 'x' }, { value: 'a', title: 'y' }],
    })), true, '机器值重复');
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, value: '' })), true, '空串不是「未选」');
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, value: 1 })), true);
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, value: 'zzz' })), true, '机器值必须命中一项');
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, required: 'yes' })), true, '布尔只收真布尔');
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, loadingText: '稍等' })), true, 'loadingText 只在 loading 时给');
    assert.equal(throwsBlocks(() => renderRadioCards({
      ...ok, options: [{ value: 'a', title: '现金', disabledReason: '停用了' }],
    })), true, 'disabledReason 只在 disabled 时给');
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, error: 1 })), true);
    assert.equal(throwsBlocks(() => renderRadioCards({ ...ok, emptyText: 1 })), true);
    /* `null` 是**未选**的合法表达（不是错） */
    assert.equal(renderRadioCards({ ...ok, value: null }).includes('checked'), false, 'value: null ⇒ 一个都不勾');
  });

  it('纯函数：同入参两次逐字节相同（页面产物可缓存、可对账）', () => {
    assert.equal(renderRadioCards(REAL), renderRadioCards(REAL));
    assert.notEqual(renderRadioCards(REAL), renderRadioCards(HOSTILE));
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('radioCards ② 样式纪律', () => {
  const css = stripComments(radioCardsCss());

  it('样式段非空，且**全部**规则 scope 在 `.ilife-page-ui` 之下（不开配方的页零命中）', () => {
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 15, '本件规则数不对：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器没 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes('.' + RADIO_CARDS_CLASS), '选择器必须挂在件根类之下：' + sel);
    }
  });

  it('零 `:root`／零 `!important`／零新 token 名', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    const decls = css.match(/--[a-z0-9-]+\s*:/g) || [];
    assert.deepEqual(decls, [], '不得定义新 token：' + decls.join(' '));
  });

  it('复合选择器的拼法：**同一条选择器里 `.ilife-page-ui` 只许出现一次**（多一次＝要求"件里再套一层 page-ui"，永远是死规则）', () => {
    const bad = /(?:>|~|\+)\s*\.ilife-page-ui/.exec(css);
    assert.equal(bad, null, '拼错的复合选择器（规则会静默不生效）：'
      + (bad === null ? '' : css.slice(bad.index, bad.index + 60)));
    const twice = [];
    for (const sel of selectorsOf(radioCardsCss())) {
      for (const part of sel.split(',')) {
        const n = (part.match(/\.ilife-page-ui/g) || []).length;
        if (n > 1) twice.push(n + '× ' + part.trim().slice(0, 90));
      }
    }
    assert.deepEqual(twice, [], '这些选择器把作用域写了两遍（后半截必须是裸槽类）：' + twice.join('；'));
    /* 反面自证：本件确实有"接在组合器后面"的槽类（判据不是空转） */
    assert.match(css, /(?:>|~)\s*\.ilife-block-radio-cards-/);
  });

  it('**只经 `skinVar()` 读皮肤**：每一处 var() 都与 skinVar() 逐字相同，剥掉它后不剩一个 var()', () => {
    const spans = skinVarSpans(css);
    assert.ok(spans.length >= 10, '读皮肤的处数不对（判据可能空转）：' + spans.length);
    const rest = cutSpans(css, spans);
    assert.equal(rest.includes('var(--'), false, '手写了 var(--…)：' + rest.slice(Math.max(0, rest.indexOf('var(--') - 40), rest.indexOf('var(--') + 60));
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => skinTokenVar(k)));
    for (const n of new Set([...css.matchAll(/var\(\s*(--ilife-[a-z0-9-]+)/g)].map((m) => m[1]))) {
      assert.ok(known.has(n), '名单外的 token 名（会被静默兜底）：' + n);
    }
  });

  it('**宽度只许容器判**：媒体查询只判设备能力，窄档调整走 `@container`', () => {
    for (const m of css.matchAll(/@media\s*\(([^)]*)\)/g)) {
      assert.ok(/hover|pointer|prefers-reduced-motion/.test(m[1]), '媒体查询只许判设备能力：' + m[1]);
    }
    const at = [...css.matchAll(/@container\s*\(([^)]*)\)/g)].map((m) => m[1]);
    assert.deepEqual(at, ['max-width: ' + String(RADIO_CARDS_NARROW_PX) + 'px'], '容器查询只许一条、只判宽度：' + at.join('｜'));
    assert.match(css, /container-type: inline-size;/, '本件必须自己是容器');
  });

  it('**不许 `…` 截断**：样式段里没有截断手段（标题／读数／说明一律换行）', () => {
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

  it('几何事实：触控目标 ≥44×44（整卡是命中区），选中态有两重非颜色标记', () => {
    assert.ok(RADIO_CARDS_MIN_TARGET_PX >= 44, '触控目标地板必须 ≥44：' + RADIO_CARDS_MIN_TARGET_PX);
    assert.ok(RADIO_CARDS_CARD_MIN_HEIGHT_PX >= RADIO_CARDS_MIN_TARGET_PX, '卡高不得低于地板');
    assert.ok(css.includes('min-height: ' + String(RADIO_CARDS_CARD_MIN_HEIGHT_PX) + 'px'), '卡的最小高度取常量');
    assert.match(css, /content: "\\2713"/, '标记位里那个对钩（第一重：字）');
    assert.match(css, /box-shadow: inset \d+px 0 0 /, '选中卡左端那道竖条（第二重：形状）');
    assert.match(css, /:has\(input:checked\)/, '选中态判在**原生** `input:checked` 上');
    assert.equal(/\.is-on\b/.test(css), false, '不靠 `is-on` 这类短类名（会与别件撞名）');
  });

  it('缺省前缀 `ilife-`；换前缀时 scope 与槽类**一起**换', () => {
    assert.match(radioCardsCss(), /\.ilife-page-ui \.ilife-block-radio-cards \{/);
    const x = stripComments(radioCardsCss({ prefix: 'x-' }));
    assert.ok(x.includes('.x-page-ui .x-block-radio-cards {'));
    assert.ok(x.includes('.x-block-radio-cards-legend {'));
    assert.equal(x.includes('.ilife-'), false, '换前缀后不许残留旧前缀');
  });

  it('槽位闭集与类名拼法：逐槽都能拼出 `ilife-block-radio-cards-<槽>`', () => {
    for (const slot of RADIO_CARDS_SLOTS) {
      assert.equal(radioCardsSlot(slot), 'ilife-block-radio-cards-' + slot);
      assert.equal(radioCardsSlot(slot, 'x-'), 'x-block-radio-cards-' + slot);
    }
  });

  it('层红线：`dist/components/radio-cards/**` 零 DOM、零内联脚本（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'radio-cards');
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

/* ── ③ 加法式（不挂这件＝零变化）＋ ⑤ 皮肤矩阵 ─────────────────────── */

describe('radioCards ③ 加法式（opt-in：不挂这件＝零变化）', () => {
  it('本件是纯函数 ＋ 可选的样式/运行时段：不挂它，别人产物一个字节不变', () => {
    const a = renderRadioCards(REAL);
    const b = renderRadioCards(REAL);
    assert.equal(a, b, '两次渲染逐字节相同');
    assert.equal(a.includes('.ilife-page-ui'), false, '标记里不带任何选择器（样式段是另挂的）');
    assert.equal(a.includes('ilife-block-page-head'), false, '标记里不出现别件的类名');
    assert.equal(a.includes('ilife-block-sheet'), false, '标记里不出现别件的类名');
    assert.equal(typeof renderRadioCards, 'function');
    /* 层红线按**产物的字面**断：本件不从根出口出（冻结面签名不许动）。
       这里读文本而不 import 根出口：根出口会牵起整层别的件，别人一件写坏就红在别人身上。 */
    assert.equal(readFileSync(join(PKG, 'dist', 'index.js'), 'utf8').includes('renderRadioCards'), false,
      '组件层不得从根出口出：dist/index.js 里出现了 renderRadioCards');
  });

  it('样式段与运行时段都是**字符串**：页面不调它们就没有任何字节', () => {
    assert.equal(typeof radioCardsCss(), 'string');
    assert.ok(radioCardsCss().includes('.' + RADIO_CARDS_CLASS));
    assert.equal(typeof buildRadioCardsJs(), 'string');
    assert.ok(buildRadioCardsJs().includes('data-ilife-radio-runtime'));
  });
});

describe('radioCards ⑤ 皮肤矩阵（三套皮肤下标记逐字节相同）', () => {
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderRadioCards(REAL) + '</div>';
  const withoutSkin = (name) => pageOf(name)
    .replace(skinCss({ skins: [name] }), '')
    .replace(skinClass(name), '');

  it('三套皮肤：差异只落在皮肤样式段与皮肤类上，标记面逐字节相同', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(renderRadioCards(REAL)), '挖掉皮肤后标记必须原样在');
    for (const name of SKIN_NAMES) {
      assert.equal(withoutSkin(name), bare, name + ' 的标记面与 ' + SKIN_NAMES[0] + ' 不同');
    }
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[1]), '两套皮肤的页产物必须真的不同（否则这条判据空转）');
    assert.equal(renderRadioCards(REAL).includes('skin-'), false, '标记里不许自带皮肤类');
  });

  it('「大字报刊」皮肤下强调色＝墨黑：**只染色的选中态读不出来**，所以形状与字必须自己扛', () => {
    const broadsheet = skinCss({ skins: ['broadsheet'] });
    const accent = /--ilife-accent:\s*([^;\n]+)/.exec(broadsheet);
    assert.ok(accent !== null, '截不出大字报刊的强调色');
    assert.match(accent[1], /^#14110d\b/i, '前提变了：大字报刊的强调色不再是墨黑');
    /* 非颜色那两重必须在样式段里（颜色档之外的两处：对钩 ＋ 竖条） */
    assert.match(radioCardsCss(), /content: "\\2713"/);
    assert.match(radioCardsCss(), /box-shadow: inset/);
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

/** 夹具页：**视口恒 1440**，容器宽由 `style="width:Npx"` 给——390／1280 量的都是组件自己的宽度。
 *  皮肤挂在**页级根**上（大字报刊：强调色＝墨黑，正是「选中态不许只靠颜色」要压的那一档）。 */
function buildFixture(width, skin) {
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>radio-cards 两档</title>\n<style>\n'
    + 'html,body{margin:0;padding:0}\n'
    + 'body{padding:16px}\n'
    + skinCss() + '\n' + radioCardsCss() + '\n'
    + '</style></head>\n<body>\n'
    + '<div class="stage ilife-page-ui ' + skinClass(skin) + '" style="width:' + width + 'px">'
    + renderRadioCards(REAL) + renderRadioCards(HOSTILE)
    + renderRadioCards({ ...REAL, name: 'acct-loading', loading: true })
    + '</div>\n</body></html>';
}

/** 页内量测：容器与件根的溢出、每张卡的命中盒、选中卡的**两重非颜色标记**、原生框的可聚焦性。 */
const MEASURE = '(function(){'
  + 'var stage=document.querySelector(".stage");'
  + 'function box(el){var r=el.getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height)};}'
  + 'var roots=[].slice.call(document.querySelectorAll(".ilife-block-radio-cards"));'
  + 'var out={stageSw:stage.scrollWidth,stageCw:stage.clientWidth,docSw:document.documentElement.scrollWidth,'
  + 'docCw:document.documentElement.clientWidth,ellipsis:document.body.innerText.indexOf("\\u2026")>=0,roots:[],cards:[]};'
  + 'for(var i=0;i<roots.length;i++){var h=roots[i];'
  + 'out.roots.push({sw:h.scrollWidth,cw:h.clientWidth,box:box(h),val:h.getAttribute("data-ilife-radio-value"),'
  + 'loading:h.getAttribute("data-ilife-radio-loading")==="1",'
  /* 加载态那条规则的**活口**：读数的那一句在加载态下要换一档颜色（`ink-3`）——
     只断文本换字不够：规则若被拼死（多写一遍 scope），屏上会静默不变。 */
  + 'readingColor:(function(){var r=h.querySelector(".ilife-block-radio-cards-reading");return r?getComputedStyle(r).color:"";})(),'
  + 'readingText:(h.querySelector(".ilife-block-radio-cards-reading")||{}).textContent});'
  + 'var cards=[].slice.call(h.querySelectorAll(".ilife-block-radio-cards-card"));'
  + 'for(var j=0;j<cards.length;j++){var c=cards[j];var inp=c.querySelector("input[type=radio]");'
  + 'var mk=c.querySelector(".ilife-block-radio-cards-mk");var cs=getComputedStyle(c);var ms=getComputedStyle(mk);'
  + 'var glyph=(ms.content!=="" && ms.content.indexOf("\\u2713")>=0) || (getComputedStyle(mk,"::after").content.indexOf("\\u2713")>=0);'
  + 'out.cards.push({box:box(c),checked:!!inp&&inp.checked,disabled:!!inp&&inp.disabled,'
  + 'inputDisplay:inp?getComputedStyle(inp).display:"",inputOpacity:inp?getComputedStyle(inp).opacity:"",'
  + 'tabbable:!!inp&&inp.tabIndex>=0,focusable:!!inp&&typeof inp.focus==="function",'
  + 'inset:cs.boxShadow,bar:cs.boxShadow.indexOf("inset")>=0,checkMark:glyph,'
  + 'titleWeight:getComputedStyle(c.querySelector(".ilife-block-radio-cards-title")).fontWeight});}'
  + '}'
  + 'return out;}())';

async function startFixture() {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const dir = mkdtempSync(join(tmpdir(), 't-radio-cards-'));
  const profileDir = mkdtempSync(join(tmpdir(), 't-radio-cards-chrome-'));
  const pages = {};
  for (const w of WIDTHS) {
    const p = join(dir, 'fixture-' + w + '.html');
    writeFileSync(p, buildFixture(w, 'broadsheet'), 'utf8');
    pages[w] = p;
  }
  const port = 9760 + (process.pid % 200);
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
    const open = async (width) => {
      await s('Page.navigate', { url: pathToFileURL(pages[width]).href });
      for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
      await sleep(120);
      await ev('window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
        + 'window.__hits=[];document.addEventListener("ilife:radio-change",function(e){window.__hits.push(e.detail);});'
        + 'var s=document.createElement("script");s.textContent=' + JSON.stringify(buildRadioCardsJs()) + ';document.body.appendChild(s);true');
      await sleep(150);
      return ev(MEASURE);
    };
    /** 真点一张卡（用 CDP 的鼠标事件：走完整命中链路，不是 `element.click()`）。 */
    const clickCard = async (which, index) => {
      const box = await ev('(function(){var c=document.querySelectorAll(".ilife-block-radio-cards")[' + String(which)
        + '].querySelectorAll(".ilife-block-radio-cards-card")[' + String(index) + '];var r=c.getBoundingClientRect();'
        + 'return {x:r.left+r.width-8,y:r.top+r.height/2};}())');
      await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await sleep(120);
    };
    /** 焦点地板（真机量）：焦点态判在**原生框**上（`card:has(input:focus-visible)`），
     *  所以伪类也必须强制在原生的那一枚上——`CSS.forcePseudoState` 只对它自己那一个元素生效。 */
    const tabToCard = async () => {
      await ev('document.querySelectorAll(".ilife-block-radio-cards")[0].querySelector("input[type=radio]").focus();true');
      const { root: docRoot } = await s('DOM.getDocument', { depth: 1 });
      const { nodeId } = await s('DOM.querySelector', { nodeId: docRoot.nodeId, selector: '.ilife-block-radio-cards-card input[type=radio]' });
      await s('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus-visible'] });
      const out = await ev('(function(){var c=document.querySelector(".ilife-block-radio-cards .ilife-block-radio-cards-card");'
        + 'var cs=getComputedStyle(c);return {w:parseFloat(cs.outlineWidth),style:cs.outlineStyle};}())');
      await s('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      return out;
    };
    return {
      open, clickCard, tabToCard, widths: WIDTHS,
      hits: () => ev('window.__hits'),
      errs: () => ev('window.__errs'),
      narrowReading: () => ev('(function(){var r=document.querySelector(".ilife-block-radio-cards-line");'
        + 'return getComputedStyle(r).display;}())'),
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

describe('radioCards ④ 真机两档（390／1280 容器；视口恒 1440；皮肤＝大字报刊）', () => {
  it('零横向溢出 ＋ 触控目标 ≥44×44 ＋ 选中态有两重非颜色标记 ＋ 点了派发事件 ＋ 零未捕获错误', async (t) => {
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
        assert.equal(m.roots.length, 3, why + '夹具应有三组（真实形状／敌意形状／加载态）');
        assert.ok(m.cards.length >= 4, why + '卡片数不对：' + m.cards.length);
        for (const c of m.cards) {
          assert.ok(c.box.w >= 44 && c.box.h >= 44, why + '触控目标 ' + c.box.w + '×' + c.box.h + ' 小于 44×44');
          assert.ok(c.focusable && c.tabbable, why + '原生框必须可聚焦');
          assert.notEqual(c.inputDisplay, 'none', why + '原生框不许 display:none（键盘到不了）');
        }
        for (let i = 0; i < m.roots.length; i += 1) {
          const r = m.roots[i];
          assert.ok(r.sw <= r.cw, why + '第 ' + (i + 1) + ' 组横向溢出 ' + r.sw + ' > ' + r.cw);
          assert.ok(Math.abs(r.cw - width) <= 1, why + '第 ' + (i + 1) + ' 组的容器宽不是 ' + width + '：' + r.cw);
        }
        /* 选中态：**两重非颜色标记**（竖条 ＋ 对钩）——大字报刊下强调色＝墨黑也读得出 */
        const on = m.cards.filter((c) => c.checked);
        assert.ok(on.length >= 1, why + '夹具里应当有被选中的卡');
        for (const c of on) {
          assert.equal(c.bar, true, why + '选中卡缺左端竖条（形状那一重）：' + c.inset);
          assert.equal(c.checkMark, true, why + '选中卡的标记位缺对钩（字那一重）');
        }
        const off = m.cards.filter((c) => !c.checked);
        assert.ok(off.length >= 1 && off.every((c) => c.bar === false), why + '未选中的卡不该有竖条');
        /* 加载态：读数**原地换字**（文本换成那句）＋**换一档颜色**（证明那条规则真的活着，不是死规则） */
        assert.equal(m.roots[2].loading, true);
        assert.ok(m.roots[2].readingText.includes('正在读取'), '加载态读数换字：' + m.roots[2].readingText);
        assert.ok(m.roots[0].readingText.includes('¥1,286.40'), '常态读数照旧：' + m.roots[0].readingText);
        assert.notEqual(m.roots[2].readingColor, m.roots[0].readingColor,
          why + '加载态读数的颜色与常态一样 ⇒ 那条规则没生效（死规则）：' + m.roots[2].readingColor);
        readings.push(width + 'px: scrollWidth ' + m.stageSw + ' ≤ clientWidth ' + m.stageCw
          + '｜卡 ' + m.cards.length + ' 张，最小命中盒 '
          + Math.min(...m.cards.map((c) => c.box.h)) + 'px 高｜选中卡 ' + m.cards.filter((c) => c.checked).length + ' 张（竖条＋对钩齐）'
          + '｜加载态读数色 ' + m.roots[2].readingColor + ' ≠ 常态 ' + m.roots[0].readingColor);
      }
      /* 窄档差异**只可能来自容器查询**：两档视口都是 1440 */
      await p.open(390);
      assert.equal(await p.narrowReading(), 'grid', '390 容器：标题与读数改走两行（@container 命中）');
      await p.open(1280);
      assert.equal(await p.narrowReading(), 'flex', '1280 容器：标题与读数同排');

      /* 交互：真点一张卡 ⇒ 机器值落属性 ＋ 派发 `ilife:radio-change`；键盘焦点描边看得见 */
      await p.open(1280);
      const before = (await p.hits()).length;
      await p.clickCard(0, 2);
      const after = await p.hits();
      assert.equal(after.length, before + 1, '点卡必须派发一次事件');
      assert.equal(after[after.length - 1].name, 'acct');
      assert.equal(after[after.length - 1].value, 'wechat');
      assert.equal(after[after.length - 1].prev, 'card', '事件带改前值');
      const outline = await p.tabToCard();
      assert.ok(outline.w >= 2 && outline.style !== 'none', '焦点描边不可见：' + JSON.stringify(outline));
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
      console.log('  [真机读数] ' + readings.join('\n  [真机读数] '));
      console.log('  [真机读数] :focus-visible outline=' + outline.w + 'px ' + outline.style);
    } finally { p.close(); }
  });
});
