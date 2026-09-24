/** step-flow（步骤条）· 契约测试。
 *
 *  四组判据：
 *   ① **渲染契约**：结构（标题／节点记号／名称／状态字／估时实耗／说明／脚注）／**同一条步骤条只许一个"当前步"**／
 *      **转义面**／**全部**非法入参分支；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤／scope 在 `.ilife-page-ui` 下／零 `:root`／`!important`／
 *      **三态必须有形状差异**（实心圆／双环／虚线空圈，状态字底线／实底块／虚线框，连线实线／虚线）／
 *      窄档走 `@container`；`dist/**` 的**代码**零 DOM；
 *   ③ **加法式**：只读自己的类名、渲染两次逐字节相同；
 *   ④ **真机两档（390／1280）**：零横向溢出 ＋ 关键语义（名称／状态字／估时）不截断 ＋ 节点列竖排对齐
 *      （逐行节点 left 相同）＋ 静态件读数：零可点元素、零动效。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  STEP_FLOW_CLASS, STEP_FLOW_FORMS, STEP_FLOW_MARK_DONE, STEP_FLOW_MISSING,
  STEP_FLOW_NARROW_MAX_PX, STEP_FLOW_NODE_COLUMN_PX, STEP_FLOW_NODE_SIZE_PX, STEP_STATES, STEP_STATE_WORDS,
  renderStepFlow, stepFlowCss, stepFlowSlot,
} from '../dist/components/step-flow/index.js';
import { SKIN_TOKEN_NAMES, skinTokenVar } from '../dist/components/skin/index.js';
import { startFamilyPage } from './_f5-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT_SEL = '.' + STEP_FLOW_CLASS;
const slot = (name) => '.' + stepFlowSlot(name);

/** 一条典型步骤条：已完成两步、当前一步、未开始两步（三态齐）。 */
function sampleSteps() {
  return [
    { title: '备料', state: 'done', estimate: '估 6 分', actual: '实 7 分', description: '螺丝椒切段、五花肉切片。', note: '多花了 1 分钟剔猪皮', noteTone: 'warn' },
    { title: '热锅下油', state: 'done', estimate: '估 2 分', actual: '实 2 分', description: '中火，油面起细纹就够。' },
    { title: '下肉煸炒', state: 'now', estimate: '估 4 分', description: '煸到边缘微焦再下豆豉。' },
    { title: '下辣椒同炒', state: 'todo', estimate: '估 3 分' },
    { title: '调味出锅', state: 'todo', estimate: '估 1 分' },
  ];
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('step-flow ① 渲染契约', () => {
  it('结构：小标题 ＋ 逐步（节点／名称／状态字／估时实耗／说明／强调）＋ 脚注', () => {
    const html = renderStepFlow({
      title: '辣椒炒肉 · 第 3 / 5 步', count: '预计还要 6 分钟', steps: sampleSteps(),
      foot: ['总估时 16 分', '已用 9 分'],
    });
    assert.ok(html.startsWith('<div class="' + STEP_FLOW_CLASS + '">'), '根用类名根打头：' + html.slice(0, 80));
    assert.ok(html.includes(slot('title').slice(1) + '">辣椒炒肉 · 第 3 / 5 步<'), '标题');
    assert.ok(html.includes(slot('count').slice(1) + '">预计还要 6 分钟<'), '右侧读数');
    assert.equal((html.match(new RegExp(stepFlowSlot('step') + ' ', 'g')) || []).length, 5, '五步');
    assert.ok(html.includes(slot('node').slice(1) + '" aria-hidden="true">' + STEP_FLOW_MARK_DONE + '<'), '已完成节点带 ✓');
    assert.ok(html.includes(slot('node').slice(1) + '" aria-hidden="true">3<'), '未完成节点带序号（第三步是当前步）');
    assert.ok(html.includes(slot('name').slice(1) + '">下肉煸炒<'), '名称');
    assert.ok(html.includes(slot('state').slice(1) + ' is-done">' + STEP_STATE_WORDS.done + '<'), '已完成状态字');
    assert.ok(html.includes(slot('state').slice(1) + ' is-now">' + STEP_STATE_WORDS.now + '<'), '当前状态字');
    assert.ok(html.includes(slot('state').slice(1) + ' is-todo">' + STEP_STATE_WORDS.todo + '<'), '未开始状态字');
    assert.ok(html.includes(slot('estimate').slice(1) + '">估 6 分<') && html.includes(slot('actual').slice(1) + '">实 7 分<'),
      '估时与实耗分两槽');
    assert.ok(html.includes(slot('desc').slice(1) + '">中火，油面起细纹就够。<'), '说明');
    assert.ok(html.includes(slot('note').slice(1) + ' is-warn">多花了 1 分钟剔猪皮<'), '强调句带语气类');
    assert.ok(html.includes(slot('foot').slice(1) + '"><span>总估时 16 分</span><span>已用 9 分</span>'), '脚注逐段一枚');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
    assert.ok(!html.includes('data-'), '本件不带机器属性（静态件）');
  });

  it('状态字可覆盖；三态闭集写在一处', () => {
    const html = renderStepFlow({ steps: [{ title: '备料', state: 'now', stateWord: '手上正干这一步' }] });
    assert.ok(html.includes('>手上正干这一步<'), '自定义状态字上屏');
    assert.deepEqual([...STEP_STATES], ['done', 'now', 'todo']);
    assert.equal(STEP_STATE_WORDS.done, '已完成');
    assert.deepEqual([...STEP_FLOW_FORMS], ['vertical'], '形态闭集只有形态 A「竖排带说明」');
  });

  it('缺的槽不留空位：不给估时／实耗／说明／脚注时一个字都不出', () => {
    const html = renderStepFlow({ steps: [{ title: '只有一步', state: 'todo' }] });
    for (const name of ['time', 'estimate', 'actual', 'desc', 'note', 'foot', 'head', 'absent']) {
      assert.equal(html.includes(stepFlowSlot(name)), false, '不该出这一槽：' + name);
    }
    assert.ok(html.includes(stepFlowSlot('step')), '步本体照出');
  });

  it('空步骤：不出一个字；给了空态那一句才出', () => {
    assert.equal(renderStepFlow({ steps: [] }), '');
    assert.equal(renderStepFlow({ steps: [], foot: ['总估时 0 分'] }), '', '没步就没行程：脚注也留不住');
    const empty = renderStepFlow({ steps: [], absentLine: '这道菜还没有步骤' });
    assert.equal((empty.match(new RegExp(stepFlowSlot('step'), 'g')) || []).length, 0, '空态不得被算成一步');
    assert.ok(empty.includes(slot('absent').slice(1) + '">这道菜还没有步骤<'));
  });

  it('缺值写法写在一处：`—`（缺值不许写 0、不许留空）', () => {
    assert.equal(STEP_FLOW_MISSING, '—');
    const html = renderStepFlow({ steps: [{ title: 'x', state: 'todo', estimate: STEP_FLOW_MISSING }] });
    assert.ok(html.includes('>' + STEP_FLOW_MISSING + '<'), '缺值由调用方按这条口径给串');
  });

  it('转义面：标题／读数／步名／状态字／估时／说明／脚注逐位转义，塞不进标签', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderStepFlow({
      title: evil, count: evil, foot: [evil],
      steps: [{ title: evil, state: 'done', stateWord: evil, estimate: evil, actual: evil, description: evil, note: evil }],
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
  });

  it('入参违规一律拒（含"同时只能有一个当前步"这条特有不变量）：逐条断 BlocksError', () => {
    const throws = (fn) => {
      try { fn(); } catch (e) { return e.name === 'BlocksError'; }
      return false;
    };
    assert.equal(throws(() => renderStepFlow(null)), true, '入参不是对象');
    assert.equal(throws(() => renderStepFlow({ steps: 'x' })), true, 'steps 不是数组');
    assert.equal(throws(() => renderStepFlow({ steps: ['x'] })), true, '步不是对象');
    assert.equal(throws(() => renderStepFlow({ steps: [{ state: 'done' }] })), true, 'title 必填');
    assert.equal(throws(() => renderStepFlow({ steps: [{ title: 'x' }] })), true, 'state 必填');
    assert.equal(throws(() => renderStepFlow({ steps: [{ title: 'x', state: '' }] })), true, 'state 不许空串');
    assert.equal(throws(() => renderStepFlow({ steps: [{ title: 'x', state: 'doing' }] })), true, '状态闭集外');
    assert.equal(throws(() => renderStepFlow({
      steps: [{ title: 'a', state: 'now' }, { title: 'b', state: 'now' }],
    })), true, '两个当前步');
    assert.equal(throws(() => renderStepFlow({ steps: [{ title: 'x', state: 'now', noteTone: 'loud' }] })), true, 'noteTone 闭集外');
    assert.equal(throws(() => renderStepFlow({ steps: [{ title: 'x', state: 'now', estimate: 2 }] })), true, 'estimate 不是串');
    assert.equal(throws(() => renderStepFlow({ steps: [], form: 'segment' })), true, '形态闭集外');
    assert.equal(throws(() => renderStepFlow({ steps: [], foot: [''] })), true, 'foot 数组里的空串');
    assert.equal(throws(() => renderStepFlow({ steps: [], extraClass: 'a b!' })), true, '附加类名不合法');
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('step-flow ② 样式与零 DOM 纪律', () => {
  it('全部规则 scope 在 `.ilife-page-ui` 下、只读自己的类名、窄档走容器查询', () => {
    const css = stripComments(stepFlowCss());
    assert.ok(css.trim() !== '', '样式段必须非空');
    const selectors = (css.match(/^[^@\s][^{\n]*\{/gm) || []);
    assert.ok(selectors.length >= 20, '选择器条数太少：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '必须 scope 在 .ilife-page-ui：' + sel.trim());
      assert.ok(sel.includes(STEP_FLOW_CLASS), '只许读自己的类名根：' + sel.trim());
    }
    assert.ok(css.includes('@container'), '窄档必须走容器查询');
    assert.equal(/@media[^{]*max-width/.test(css), false, '媒体查询不许判宽度');
    assert.ok(css.includes(String(STEP_FLOW_NARROW_MAX_PX) + 'px'), '窄档断点取常量');
    assert.ok(css.includes(String(STEP_FLOW_NODE_SIZE_PX) + 'px'), '节点直径取常量');
    assert.ok(css.includes('left: ' + (STEP_FLOW_NODE_COLUMN_PX / 2 - 0.5) + 'px'),
      '连线走左列中线（左列宽取常量 ' + STEP_FLOW_NODE_COLUMN_PX + '）');
  });

  it('**三态必须有形状差异**：实心圆／双环内点／虚线空圈 ＋ 连线实线／虚线', () => {
    const css = stripComments(stepFlowCss());
    assert.ok(/\.is-done [^{]*-node \{[^}]*background: var\(--ilife-ink/.test(css), '已完成：实心圆');
    assert.ok(/\.is-now [^{]*-node::after \{[^}]*background: var\(--ilife-accent/.test(css), '当前：内点');
    assert.ok(/\.is-now [^{]*-node \{[^}]*border: 1\.5px solid/.test(css), '当前：描边');
    assert.ok(/-node \{[^}]*border: 1\.5px dashed/.test(css), '未开始：虚线空圈（节点缺省形状）');
    assert.ok(/\.is-done[^{]*::after \{ background: var\(--ilife-ink/.test(css), '走过的连线是实线（深色）');
    assert.ok(/\.is-todo[^{]*::after \{[^}]*border-left: 1px dashed/.test(css), '没走的连线是虚线');
    assert.ok(/\.is-now \{[^}]*background: var\(--ilife-accent/.test(css), '当前状态字：实底块');
    assert.ok(/\.is-done \{[\s\S]{0,120}?border-bottom: 2px solid/.test(css), '已完成状态字：底线');
  });

  it('只经 skinVar 读皮肤：零 `:root`／`!important`／新 token／手写 var(--ilife-…)', () => {
    const css = stripComments(stepFlowCss());
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.deepEqual(css.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    const src = readFileSync(join(PKG, 'src', 'components', 'step-flow', 'style.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    assert.deepEqual(src.match(/var\(\s*--ilife-/g) || [], [], '手写了 var(--ilife-…)：请走 skinVar()');
    const produced = [...css.matchAll(/var\(--ilife-[a-z0-9-]+([^)]*)/g)].map((m) => m[1]);
    assert.ok(produced.length >= 10, '读的 token 太少：' + produced.length);
    for (const rest of produced) assert.ok(rest.startsWith(', '), 'skinVar 之外的字面 var(--ilife-…)：' + rest);
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => skinTokenVar(k)));
    for (const name of new Set([...css.matchAll(/var\((--ilife-[a-z0-9-]+),/g)].map((m) => m[1]))) {
      assert.ok(known.has(name), '名单外的 token：' + name);
    }
  });

  it('纯静态件：零 transition／animation／cursor:pointer', () => {
    const css = stripComments(stepFlowCss());
    assert.equal(/transition\s*:/.test(css), false, '本件零动效');
    assert.equal(/animation\s*:/.test(css), false, '本件零动画');
    assert.equal(/cursor\s*:\s*pointer/.test(css), false, '本件没有可点元素，不许给手型');
  });

  it('`dist/components/step-flow/**` 的代码零 document.／window.／navigator.', () => {
    const dir = join(PKG, 'dist', 'components', 'step-flow');
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

describe('step-flow ③ 加法式（不碰公共选择器、渲染确定）', () => {
  it('标记只带自己的类名（顶多加三态修饰类 is-<态>／is-plain／is-warn 与一个 extraClass）', () => {
    const html = renderStepFlow({ steps: sampleSteps(), extraClass: 'mine-extra' });
    const modifiers = new Set(['plain', 'warn'].concat([...STEP_STATES]).map((s) => 'is-' + s));
    for (const cls of [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/))) {
      assert.ok(cls.startsWith(STEP_FLOW_CLASS) || modifiers.has(cls) || cls === 'mine-extra',
        '混进了别人的类名：' + cls);
    }
  });

  it('同样的入参渲染两次逐字节相同（纯函数、无全局状态）', () => {
    const input = { title: 'x', steps: sampleSteps() };
    assert.equal(renderStepFlow(input), renderStepFlow(input));
  });
});

/* ── ④ 真机两档 ─────────────────────────────────────────────────────── */

describe('step-flow ④ 真机（无头 Chrome）', () => {
  it('390／1280 两档零横向溢出、关键语义不截断、节点竖排同一列、零动效零可点元素', async (t) => {
    const body = renderStepFlow({ title: '辣椒炒肉 · 第 3 / 5 步', count: '预计还要 6 分钟', steps: sampleSteps() })
      + renderStepFlow({ steps: [], absentLine: '这道菜还没有步骤' });
    const p = await startFamilyPage({ css: stepFlowCss(), bodyHtml: body });
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何判据需真浏览器');
    try {
      const keys = [slot('name'), slot('state'), slot('time'), slot('estimate'), slot('count')];
      for (const w of [390, 1280]) {
        await p.setWidth(w);
        const m = await p.metrics({ roots: [ROOT_SEL], keys });
        assert.equal(m.stage.w, w);
        assert.ok(m.stage.sw <= m.stage.cw + 1, w + ' 档舞台横向溢出');
        assert.ok(m.page.sw <= m.page.cw + 1, w + ' 档页面横向溢出');
        assert.equal(m.roots.length, 2, w + ' 档两块都在');
        for (const r of m.roots) assert.ok(r.sw <= r.cw + 1, w + ' 档件根横向溢出：' + r.sw + ' > ' + r.cw);
        for (const k of m.keys) {
          assert.ok(k.n > 0, w + ' 档关键语义没扫到：' + k.selector);
          for (const it of k.items) {
            assert.ok(it.sw <= it.cw + 1, w + ' 档 ' + k.selector + ' 被截断：' + it.text);
            assert.ok(it.right <= it.stageRight + 1, w + ' 档 ' + k.selector + ' 顶出舞台：' + it.right);
          }
        }
        /* 节点列定宽：逐行节点竖排在同一 x（"连成一条线"的几何读法）。 */
        const lefts = await p.ev('(function(){return [].slice.call(document.querySelectorAll('
          + JSON.stringify(slot('node')) + ')).map(function(el){return Math.round(el.getBoundingClientRect().left);});}())');
        assert.equal(lefts.length, 5, w + ' 档五个节点都在');
        assert.equal(new Set(lefts).size, 1, w + ' 档节点没对齐同一列：' + lefts.join(','));
      }
      /* 三态的**形状规则真的落地**（真机读法）：已完成节点实心、未开始节点虚线空圈、
         当前节点双环内点（`::after` 有底色）。 */
      const nodeStates = await p.ev('(function(){'
        + 'var pick=function(state){var row=document.querySelector(' + JSON.stringify(ROOT_SEL + ' ' + slot('step') + '.is-')
        + '+state); var node=row.querySelector(' + JSON.stringify(slot('node')) + ');'
        + 'var cs=getComputedStyle(node); var inner=getComputedStyle(node,"::after");'
        + 'return {bg:cs.backgroundColor, style:cs.borderTopStyle, inner:inner.backgroundColor};};'
        + 'return {done:pick("done"), todo:pick("todo"), now:pick("now")};}())');
      assert.notEqual(nodeStates.done.bg, nodeStates.todo.bg, '已完成节点是实心（与未开始的空心不同色）');
      assert.equal(nodeStates.todo.style, 'dashed', '未开始节点是虚线空圈');
      assert.equal(nodeStates.done.style, 'solid', '已完成节点是实线圆');
      assert.notEqual(nodeStates.now.inner, 'rgba(0, 0, 0, 0)', '当前节点的内点有底色（双环内点生效）');
      await p.emulate({ reducedMotion: true });
      assert.equal(await p.ev('document.querySelectorAll(' + JSON.stringify(ROOT_SEL
        + ' a,' + ROOT_SEL + ' button,' + ROOT_SEL + ' input,'
        + ROOT_SEL + ' [tabindex]') + ').length'), 0, '本件不许有可点元素');
      assert.equal(await p.runningAnimations(), 0, '不许有东西卡在半路');
      assert.deepEqual(await p.errors(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
