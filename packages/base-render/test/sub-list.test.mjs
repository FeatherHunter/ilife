// sub-list（分组清单）· 判据件。
//
// 断言对象＝`dist/components/sub-list/index.js`（本件自己的那条出口；层出口那一行由别的席加）。
// 四组同 `calendar-month.test.mjs`。本件多断三条自己的口径：
//   · **零脚本**：折叠是浏览器原生 `<details>`／`<summary>`（判据真机点一下折页头，看 `open` 翻不翻）；
//   · **计数与进度都是算出来的**（组内几项＝子项条数；几条已备＝`done` 的条数）；
//   · **折页头命中区 ≥ 44px**（本件唯一的可点元素；真机量）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SUB_LIST_CLASS,
  SUB_LIST_COUNT_UNIT,
  SUB_LIST_DONE_LABEL,
  SUB_LIST_FORMS,
  SUB_LIST_HEAD_MIN_HEIGHT_PX,
  SUB_LIST_NARROW_PX,
  renderSubList,
  subListCss,
  subListSlot,
} from '../dist/components/sub-list/index.js';
import { skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { CSS_VAR_TOKENS } from '../dist/index.js';
import { openMeasurePage } from './time-group-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT = '.' + 'ilife-page-ui';
const S = (slot) => subListSlot(slot);

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const throwsBlocks = (fn) => {
  try { fn(); } catch (e) { return e.name === 'BlocksError'; }
  return false;
};
function selectorsOf(css) {
  const out = [];
  for (const m of stripComments(css).matchAll(/([^{}]+)\{/g)) {
    const sel = m[1].trim();
    if (sel === '' || sel.startsWith('@')) continue;
    out.push(sel);
  }
  return out;
}
const classTokens = (sel) => [...sel.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((m) => m[1]);
const isOwnClass = (token, root) => token === 'ilife-page-ui' || token.startsWith(root) || /^is-[a-z0-9-]+$/.test(token);

/* ── 夹具：买菜清单（私家大厨口径：叶菜／肉蛋／干货／调味） ────────────────── */
const MARKET = [
  { label: '叶菜', sum: '\u00a523.5', open: true, items: [['小油菜', '300 g', '\u00a54.5', true], ['上海青', '200 g', '\u00a53.8', true], ['菠菜', '250 g', '\u00a55.2', true], ['生菜', '1 棵', '\u00a54.0', true], ['韭菜', '150 g', '\u00a53.6', true], ['香菜', '1 把', '\u00a52.4', true]] },
  { label: '肉蛋', sum: '\u00a5100.5', items: [['五花肉', '500 g', '\u00a528.0', true], ['鸡腿', '4 只', '\u00a522.0', true], ['鸡蛋', '10 枚', '\u00a512.5', false], ['基围虾', '300 g', '\u00a538.0', false]] },
  { label: '干货', sum: '\u00a547.0', items: [['干香菇', '80 g', '\u00a516.0', true], ['木耳', '60 g', '\u00a59.0', false], ['腐竹', '200 g', '\u00a57.5', false], ['粉丝', '2 卷', '\u00a56.0', false], ['虾皮', '50 g', '\u00a58.5', false]] },
  { label: '调味', sum: '\u00a558.0', items: [['生抽', '500 ml', '\u00a59.9', false], ['香醋', '500 ml', '\u00a57.5', false], ['蚝油', '300 ml', '\u00a512.0', false]] },
];

const group = (g) => ({
  label: g.label, sum: g.sum, open: g.open === true,
  items: g.items.map(([label, measure, value, done]) => ({ label, measure, value, done })),
});

function demoInput() {
  return {
    title: '买菜清单',
    use: '私家大厨 · 按类分组',
    summary: { label: '已备 9/18', value: '\u00a5229.0' },
    groups: MARKET.map(group),
    note: '备好的那一项名字转弱',
  };
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('sub-list ① 渲染契约', () => {
  it('根：类名根 ＋ `is-<形态>`；一组一枚 `<details>`，折页头是它的第一子元素', () => {
    const html = renderSubList(demoInput());
    assert.match(html, /^<div class="ilife-block-sub-list is-fold">/);
    assert.equal((html.match(/<details class="ilife-block-sub-list-g"/g) || []).length, 4, '四组');
    for (const m of html.matchAll(/<details class="ilife-block-sub-list-g"[^>]*>(<summary class="ilife-block-sub-list-head")/g)) {
      assert.ok(m[1].startsWith('<summary'), '折页头必须是 `<details>` 的第一子元素');
    }
    assert.equal((html.match(/ open>/g) || []).length, 1, '只有第一组给了 open');
    assert.equal((html.match(new RegExp('class="' + S('body') + '"', 'g')) || []).length, 4);
  });

  it('**计数是算出来的**：组内几项＝子项条数（调用方给不了）', () => {
    const html = renderSubList(demoInput());
    assert.match(html, new RegExp('class="' + S('count') + '">6 ' + SUB_LIST_COUNT_UNIT + '<'));
    assert.match(html, new RegExp('class="' + S('count') + '">4 ' + SUB_LIST_COUNT_UNIT + '<'));
    assert.equal((html.match(new RegExp(S('count') + '">', 'g')) || []).length, 4);
    // 0 项也出折页头（读数「0 项」），但没有子项区
    const one = renderSubList({ groups: [{ label: '空组', items: [] }] });
    assert.match(one, new RegExp(S('count') + '">0 ' + SUB_LIST_COUNT_UNIT + '<'));
    assert.equal(one.includes(S('body')), false);
  });

  it('**进度是算出来的**：有子项带 `done` 才出进度条 ＋「N/M 已备」', () => {
    const html = renderSubList(demoInput());
    assert.equal((html.match(new RegExp('class="' + S('pg') + '"', 'g')) || []).length, 4, '四组都带 done 标');
    assert.match(html, new RegExp(S('pg-fill') + '" style="width:100%"'), '叶菜 6/6');
    assert.match(html, new RegExp(S('pg-fill') + '" style="width:50%"'), '肉蛋 2/4');
    assert.match(html, new RegExp(S('pg-fill') + '" style="width:20%"'), '干货 1/5');
    assert.match(html, new RegExp(S('pg-fill') + '" style="width:0%"'), '调味 0/3');
    assert.match(html, new RegExp('class="' + S('st') + '">2/4 ' + SUB_LIST_DONE_LABEL + '<'));
    // 一组里没有任何 `done` 标 ⇒ 这一组不长进度条
    const noFlag = renderSubList({ groups: [{ label: '按分类', items: [{ label: 'a', value: '1' }, { label: 'b', value: '2' }] }] });
    assert.equal(noFlag.includes(S('pg')), false, '不带备货标的组不该凭空长出进度条');
    assert.equal(noFlag.includes(S('st')), false);
  });

  it('**状态不只靠色**：备好的行有 `is-done` ＋ 勾（形），名字转弱（色）；折页头有读数（字）', () => {
    const html = renderSubList(demoInput());
    assert.equal((html.match(/\u2713/g) || []).length, 9, '夹具里 9 项已备 ⇒ 9 枚勾');
    assert.equal((html.match(new RegExp(S('ck') + '" aria-hidden="true">\\u2713<', 'g')) || []).length, 9, '9 枚勾落在勾位里');
    assert.equal((html.match(new RegExp(S('ck') + '" aria-hidden="true"><\\/i>', 'g')) || []).length, 9, '9 枚空框（未备）');
    assert.match(stripComments(subListCss()), new RegExp(S('r') + '\\.is-done \\.' + S('n') + ' \\{[^}]*color'), '备好的那一项名字转弱（色）');
  });

  it('缺槽就不出那一槽（无小计／无用途／无脚注时一个字不出）', () => {
    const html = renderSubList({ groups: [{ label: 'G', items: [{ label: 'a', value: '1' }] }] });
    for (const slot of ['sum', 'use', 'note', 'title']) assert.equal(html.includes(S(slot)), false, slot + ' 不该出');
    assert.equal(html.includes(S('q')), false, '不给 measure 就不出那一栏');
  });

  it('0 组：不给 `emptyText` ＝空串；给了＝**设计过的空态**', () => {
    assert.equal(renderSubList({ groups: [] }), '');
    assert.equal(renderSubList({ groups: [], note: 'x' }), '');
    const empty = renderSubList({ groups: [], emptyText: '清单还是空的' });
    assert.match(empty, new RegExp('class="' + S('empty') + '">清单还是空的<'));
    assert.match(stripComments(subListCss()), new RegExp(S('empty') + ' \\{[^}]*border: 1px dashed'), '空态是设计过的（虚线卡）');
  });

  it('转义：五个字符进实体，不进标记', () => {
    const html = renderSubList({
      title: '"><script>alert(1)</script>', use: 'a<b&c', note: '"\'',
      summary: { label: '<b>', value: '&' },
      groups: [{ label: '<h3>', sum: '"><x>', items: [{ label: '<u>', measure: '<s>', value: '<i>', done: true }] }],
      emptyText: '<em>',
    });
    assert.equal(/<script/i.test(html), false);
    assert.ok(!html.includes('<b>') && !html.includes('<h3>') && !html.includes('<u>') && !html.includes('<i>') && !html.includes('<s>'));
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&amp;/);
    assert.match(html, /&quot;/);
  });

  it('边界：闭集与**全部**非法入参分支逐个 `BlocksError`', () => {
    assert.deepEqual([...SUB_LIST_FORMS], ['fold']);
    const base = () => ({ groups: [{ label: 'G', items: [{ label: 'a' }] }] });

    assert.equal(throwsBlocks(() => renderSubList(undefined)), true);
    assert.equal(throwsBlocks(() => renderSubList(null)), true);
    assert.equal(throwsBlocks(() => renderSubList([])), true);
    assert.equal(throwsBlocks(() => renderSubList({ ...base(), form: 'cards' })), true);
    assert.equal(throwsBlocks(() => renderSubList({ ...base(), form: 'B' })), true);
    // groups
    assert.equal(throwsBlocks(() => renderSubList({})), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: 'x' })), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: [null] })), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: [{ items: [] }] })), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: [{ label: '' , items: [] }] })), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: [{ label: 'G' }] })), true, 'items 必填');
    assert.equal(throwsBlocks(() => renderSubList({ groups: [{ label: 'G', items: 'x' }] })), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: [{ label: 'G', items: [null] }] })), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: [{ label: 'G', items: [{}] }] })), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: [{ label: 'G', items: [{ label: '' }] }] })), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: [{ label: 'G', items: [{ label: 'a', measure: 7 }] }] })), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: [{ label: 'G', items: [{ label: 'a', value: 7 }] }] })), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: [{ label: 'G', items: [{ label: 'a', done: 'yes' }] }] })), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: [{ label: 'G', items: [], open: 1 }] })), true);
    assert.equal(throwsBlocks(() => renderSubList({ groups: [{ label: 'G', items: [], sum: 7 }] })), true);
    // 头部／空态／脚注／附加类名
    assert.equal(throwsBlocks(() => renderSubList({ ...base(), title: 7 })), true);
    assert.equal(throwsBlocks(() => renderSubList({ ...base(), summary: { label: 'x' } })), true);
    assert.equal(throwsBlocks(() => renderSubList({ ...base(), summary: { label: '', value: '1' } })), true);
    assert.equal(throwsBlocks(() => renderSubList({ ...base(), summary: 'x' })), true);
    assert.equal(throwsBlocks(() => renderSubList({ ...base(), emptyText: 7 })), true);
    assert.equal(throwsBlocks(() => renderSubList({ ...base(), note: 7 })), true);
    for (const bad of ['a"b', '.x', 'a b!']) {
      assert.equal(throwsBlocks(() => renderSubList({ ...base(), extraClass: bad })), true, '拒：' + bad);
    }
    assert.match(renderSubList({ ...base(), extraClass: 'ok-class' }), /^<div class="ilife-block-sub-list is-fold ok-class">/);
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('sub-list ② 样式与零 DOM 纪律', () => {
  const css = stripComments(subListCss());

  it('样式段非空，且**每一条**规则 scope 在 `.ilife-page-ui` 之下', () => {
    assert.ok(css.trim() !== '');
    const sels = selectorsOf(subListCss());
    assert.ok(sels.length >= 20, '选择器条数太少：' + String(sels.length));
    for (const sel of sels) {
      assert.ok(sel.includes(ROOT), '选择器不在 scope 之下：' + sel);
      assert.ok(sel.trimStart().startsWith(ROOT), 'scope 必须是第一个复合选择器：' + sel);
      assert.equal((sel.match(/\.ilife-page-ui/g) || []).length, 1,
        'scope 只许出现一次（拼两个槽时写出 `.ilife-page-ui … .ilife-page-ui …` 的规则永远命中不到）：' + sel);
    }
  });

  it('零 `:root`、零 `!important`、不新造 token 名、不重定义那 11 个冻结 token', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.deepEqual(css.match(/--[a-z0-9-]+\s*:/g) || [], []);
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('源码级：`style.ts` 里不手写 `var(--ilife-…)`', () => {
    const src = readFileSync(join(PKG, 'src', 'components', 'sub-list', 'style.ts'), 'utf8');
    assert.equal(/var\(\s*--ilife-/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), false);
  });

  it('零 DOM 且**没有运行时段**：本件目录里只有六件文件（不产 JS 文本）', () => {
    const src = join(PKG, 'src', 'components', 'sub-list');
    assert.equal(readdirSync(src).includes('runtime.ts'), false, '本件零脚本：开合走原生 details');
    const dir = join(PKG, 'dist', 'components', 'sub-list');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
    assert.ok(files.length >= 5);
    const stripLiterals = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const f of files) {
      const code = stripLiterals(readFileSync(join(dir, f), 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f + ' 里出现了 ' + needle);
      }
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('sub-list ③ 加法式（不挂号＝零命中）', () => {
  it('本件只读自己的类名', () => {
    const alien = [];
    for (const sel of selectorsOf(subListCss())) {
      for (const token of classTokens(sel)) if (!isOwnClass(token, SUB_LIST_CLASS)) alien.push(token);
    }
    assert.deepEqual(alien, [], '碰了别人的类名：' + alien.join('、'));
  });

  it('标记里也只有自己的类名', () => {
    const html = renderSubList(demoInput());
    const alien = [];
    for (const m of html.matchAll(/class="([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/)) {
        if (token === '' || isOwnClass(token, SUB_LIST_CLASS)) continue;
        alien.push(token);
      }
    }
    assert.deepEqual(alien, [], '标记里混进了别人的类名：' + alien.join('、'));
  });

  it('没挂本件样式的页面：产物逐字节相同，且不含本件一个字', () => {
    const a = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const b = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(a, b);
    assert.equal(a.includes(SUB_LIST_CLASS), false);
    assert.equal(a.includes('<details'), false);
  });
});

/* ── ④ 两档几何（390／1280） ────────────────────────────────────────── */

describe('sub-list ④a 几何契约（静态判据）', () => {
  const css = stripComments(subListCss());

  it('子项四栏是**份数**（名字那一栏 `minmax(0, 1fr)`），数量与值 `nowrap`', () => {
    assert.match(css, new RegExp(S('r') + ' \\{[^}]*grid-template-columns: 16px minmax\\(0, 1fr\\) auto auto'));
    const n = new RegExp(S('n') + ' \\{([^}]*)\\}').exec(css);
    assert.ok(n !== null);
    assert.match(n[1], /overflow-wrap: anywhere/, '名字换行不截断');
    assert.match(css, new RegExp(S('v') + ' \\{[^}]*white-space: nowrap'), '值不许截断');
    assert.equal(css.includes('text-overflow'), false, '本件不用 `…` 截断任何读数');
  });

  it('折页头命中区不低于触摸地板（44px），窄档走**容器**查询', () => {
    assert.ok(SUB_LIST_HEAD_MIN_HEIGHT_PX >= 44);
    assert.match(css, new RegExp(S('head') + ' \\{[^}]*min-height: ' + String(SUB_LIST_HEAD_MIN_HEIGHT_PX) + 'px'));
    assert.ok(css.includes('@container (max-width: ' + String(SUB_LIST_NARROW_PX) + 'px)'));
    assert.equal(css.includes('@media (max-width'), false, '不许用视口宽判宽度');
  });

  it('交互件地板逐档在：hover 包在设备能力里、active 有、focus-visible 有、减动效有', () => {
    assert.ok(css.includes('@media (hover: hover) and (pointer: fine)'), '悬停包在设备能力里');
    assert.match(css, new RegExp(S('head') + ':hover \\{'), '悬停有底色');
    assert.match(css, new RegExp(S('head') + ':active \\{'), '按下有色阶');
    assert.match(css, new RegExp(':focus-visible \\{[^}]*outline: 2px solid'), '焦点可见');
    assert.equal(/outline:\s*(none|0)/.test(css), false, '不许 `outline:none` 而无替代');
    assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
    assert.match(css, new RegExp(S('head') + '::-webkit-details-marker'), '原生三角标已关（方向标自画）');
  });
});

describe('sub-list ④b 真机两档（headless Chrome ＋ CDP）', () => {
  const pageFor = () => '<div class="ilife-page-ui ilife-skin-paper">' + renderSubList(demoInput()) + '</div>';

  it('390 与 1280：零横向溢出 ＋ 读数不截断 ＋ 折页头命中区 ≥44px', async (t) => {
    const p = await openMeasurePage({
      css: skinCss() + '\n' + subListCss(),
      frames: [{ name: 'w390', width: 390, html: pageFor() }, { name: 'w1280', width: 1280, html: pageFor() }],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何判据需真浏览器');
    try {
      for (const name of ['w390', 'w1280']) {
        const g = await p.measure(name, {
          keySelector: [S('count'), S('sub'), S('st'), S('v'), S('q')].map((c) => '.' + c).join(', '),
        });
        assert.equal(g.frameW, name === 'w390' ? 390 : 1280, name + '：框宽就是判据的那一档');
        assert.ok(g.overflowRightPx <= 0, name + '：右侧越界 ' + String(g.overflowRightPx) + 'px（' + JSON.stringify(g.rightMost) + '）');
        assert.ok(g.overflowLeftPx <= 0, name + '：左侧越界 ' + String(g.overflowLeftPx) + 'px（' + JSON.stringify(g.leftMost) + '）');
        assert.ok(g.targetScroll <= g.targetClient + 1, name + '：本件自己出了横滚');
        assert.ok(g.pageScroll <= g.pageClient, name + '：整页出了横滚');
        assert.deepEqual(g.overflows, [], name + '：有内容被盒子裁掉');
        for (const k of g.keys) {
          assert.ok(k.sw <= k.cw + 1, name + '：读数位被裁 ' + k.cls + '=' + k.text);
          assert.notEqual(k.ellipsis, 'ellipsis', name + '：读数位不许 `…` 截断');
        }
        // 折页头命中区（本件唯一的可点元素）
        const heads = await p.ev('(function(){var f=document.querySelector("[data-frame=\\"" + ' + JSON.stringify(name) + ' + "\\"]");'
          + 'return [].slice.call(f.querySelectorAll(".' + S('head') + '")).map(function(h){'
          + 'var b=h.getBoundingClientRect();return Math.round(b.height);});}())');
        assert.equal(heads.length, 4, name + '：四个折页头');
        for (const h of heads) assert.ok(h >= 44, name + '：折页头命中区 ' + String(h) + 'px 小于 44px');
      }
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });

  it('零脚本的折叠真的能开合（原生 `<details>`：点折页头，`open` 翻面）', async (t) => {
    const p = await openMeasurePage({
      css: skinCss() + '\n' + subListCss(),
      frames: [{ name: 'w390', width: 390, html: pageFor() }],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      const openStates = () => p.ev('(function(){var f=document.querySelector("[data-frame=\\"w390\\"]");'
        + 'return [].slice.call(f.querySelectorAll("details")).map(function(d){return d.open;});}())');
      assert.deepEqual(await openStates(), [true, false, false, false], '初始：只有第一组是开的');
      await p.ev('document.querySelectorAll(".' + S('head') + '")[1].click();true');
      assert.deepEqual(await openStates(), [true, true, false, false], '点第二组的折页头 ⇒ 它开了');
      await p.ev('document.querySelectorAll(".' + S('head') + '")[0].click();true');
      assert.deepEqual(await openStates(), [false, true, false, false], '再点第一组 ⇒ 它收了');
      // 收起/展开都不影响版面宽度（没有运行时段，也没有 id 与内联事件）
      const g = await p.measure('w390');
      assert.ok(g.overflowRightPx <= 0 && g.targetScroll <= g.targetClient + 1);
      const html = renderSubList(demoInput());
      assert.equal(/\sid="/.test(html), false, '零脚本：不需要 id 接线');
      assert.equal(/\son[a-z]+=/i.test(html), false, '零脚本：不许内联事件处理器');
      assert.equal(/<script/i.test(html), false, '零脚本：不产脚本标签');
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
