/** task-list（勾选清单）· 契约测试。
 *
 *  四组判据：
 *   ① **渲染契约**：结构（表头／进度条／分组／行／错态）／机器属性（键、勾选态、计数锚）／**转义面**／
 *      **全部**非法入参分支（含本件两条特有不变量的：禁用必须写清为什么、键不许重复）；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤／scope 在 `.ilife-page-ui` 下／零 `:root`／`!important`／
 *      只动 `transform`／`opacity`／窄档走 `@container`；`dist/**` 的**代码**零 DOM（运行时是产出的文本）；
 *   ③ **加法式**：只读自己的类名、渲染确定（两次逐字节相同）；
 *   ④ **真机**：390／1280 两档零横向溢出与关键语义不截断 ＋ **状态矩阵逐档断**
 *      （`rest`／`:hover` 包在设备能力查询里且不是唯一通路／`:active` 真按下／`:focus-visible` 有可见焦点环／
 *      `disabled` 有 `cursor:not-allowed` ＋ 行上写明为什么／`busy` 挡写并回弹／`error` 挂在 `aria-describedby` 上／
 *      减动效下不卡）＋ 勾选真落账（键、次数、计数、进度条）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TASK_CHECK_CLASS, TASK_COUNTS_ATTR, TASK_COUNTS_SEPARATOR, TASK_DONE_ATTR, TASK_EVENT_TOGGLE,
  TASK_GROUP_ATTR, TASK_HIT_CLASS, TASK_KEY_ATTR, TASK_LABEL_CLASS,
  TASK_LIST_ATTR, TASK_LIST_CLASS, TASK_LIST_FORMS, TASK_LIST_HIT_MIN_HEIGHT_PX,
  TASK_ROW_CLASS, TASK_ROW_DONE_CLASS,
  buildTaskListJs, renderTaskList, taskListCss, taskListSlot,
} from '../dist/components/task-list/index.js';
import { SKIN_TOKEN_NAMES, skinTokenVar } from '../dist/components/skin/index.js';
import { startFamilyPage, sleep } from './_f5-probe.mjs';
import { styleSource } from './_style-sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT_SEL = '.' + TASK_LIST_CLASS;
const ROW_SEL = '.' + TASK_ROW_CLASS;
const HIT_SEL = '.' + TASK_HIT_CLASS;
const CHECK_SEL = '.' + TASK_CHECK_CLASS;
const BOX_SEL = '.' + TASK_CHECK_CLASS + '-box';
const LABEL_SEL = '.' + TASK_LABEL_CLASS;
const slot = (name) => '.' + taskListSlot(name);
const rowSel = (key) => '[' + TASK_KEY_ATTR + '="' + key + '"]';

/** 一张典型清单：两组、一条已勾、一条禁用、一条带错。 */
function sampleInput() {
  return {
    key: 'grocery', title: '买菜清单 · 今天 17:20', progressLabel: '已买', progressUnit: '样',
    foot: ['合计 ¥35.70', '待买 4 样'],
    rows: [
      { key: 'a1', label: '螺丝椒', note: '¥17.9 / 500g', amount: '¥9.00', group: '已买', done: true },
      { key: 'a2', label: '五花肉', amount: '¥18.00', group: '已买', done: true },
      { key: 'b1', label: '浏阳豆豉 15g', amount: '¥3.00', group: '待买' },
      { key: 'b2', label: '小米椒 10g', note: '家里还有 5g，只买 10g', amount: '¥1.40', group: '待买' },
      { key: 'b3', label: '生姜', amount: '¥0.30', group: '待买', disabled: true, note: '已下架：这一季市场没货' },
      { key: 'b4', label: '白萝卜', amount: '¥4.00', group: '待买', error: '没存上：网络错误' },
    ],
  };
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('task-list ① 渲染契约', () => {
  it('结构：表头（标题 ＋ 计数）＋ 进度条 ＋ 分组逐行 ＋ 脚注；计数锚两处（表头与组头）', () => {
    const html = renderTaskList(sampleInput());
    assert.ok(html.startsWith('<div class="' + TASK_LIST_CLASS + '"'), '根用类名根打头：' + html.slice(0, 90));
    assert.ok(html.includes(TASK_LIST_ATTR + '="grocery"'), '清单键上属性');
    assert.ok(html.includes(slot('title').slice(1) + '">买菜清单 · 今天 17:20<'), '标题');
    assert.ok(html.includes(slot('progress').slice(1) + '">已买 <b ' + TASK_COUNTS_ATTR + '="1">2'
      + TASK_COUNTS_SEPARATOR + '6</b> 样<'), '整单进度：标签 ＋ 计数锚 ＋ 量词');
    assert.ok(html.includes(slot('bar-fill').slice(1)), '进度条填充在');
    assert.ok(html.includes('transform:scaleX(0.3333)'), '进度条按现数给初值');
    assert.equal((html.match(new RegExp(TASK_COUNTS_ATTR + '="1"', 'g')) || []).length, 3, '计数锚：表头 1 ＋ 组头 2');
    assert.equal((html.match(new RegExp(slot('group-title').slice(1), 'g')) || []).length, 2, '两个组头');
    assert.ok(html.includes(slot('group-count').slice(1) + '" ' + TASK_COUNTS_ATTR + '="1">2'
      + TASK_COUNTS_SEPARATOR + '2<'), '组内计数：「这一组勾了几样」');
    assert.equal((html.match(new RegExp('class="' + TASK_ROW_CLASS + '[ "]', 'g')) || []).length, 6, '六行');
    assert.ok(html.includes(LABEL_SEL.slice(1) + '">白萝卜'), '行名');
    assert.ok(html.includes(slot('note').slice(1) + '">家里还有 5g，只买 10g<'), '行下小字');
    assert.ok(html.includes(slot('amount').slice(1) + '">¥1.40<'), '右侧读数');
    assert.ok(html.includes(slot('err').slice(1) + '" id="ilife-task-err-grocery-b4" role="alert">没存上：网络错误<'), '错态写在旁边');
    assert.ok(html.includes('aria-describedby="ilife-task-err-grocery-b4"'), '错态挂在 aria-describedby 上');
    assert.ok(html.includes(slot('foot').slice(1) + '"><span>合计 ¥35.70</span><span>待买 4 样</span>'), '脚注逐段一枚');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('机器属性：键／人类名／组键／勾选态／复选框 checked 三处同步', () => {
    const html = renderTaskList(sampleInput());
    assert.ok(html.includes(TASK_KEY_ATTR + '="a1" ' + 'data-ilife-task-label="螺丝椒"'), '键与人类名同落一行');
    assert.ok(html.includes(TASK_GROUP_ATTR + '="已买"'), '组键落上');
    assert.ok(html.includes(TASK_DONE_ATTR + '="1"'), '已勾行落勾选态属性');
    assert.ok(html.includes('checked'), '复选框照勾选态渲染');
    assert.equal((html.match(new RegExp(TASK_DONE_ATTR, 'g')) || []).length, 2, '只有两条已勾行带这个属性');
    assert.ok(html.includes('class="' + TASK_ROW_CLASS + ' ' + TASK_ROW_DONE_CLASS + '"'), '已勾行带修饰类');
  });

  it('禁用行：复选框 disabled ＋ aria-disabled，且行上写明为什么', () => {
    const html = renderTaskList({ rows: [{ key: 'k', label: '生姜', disabled: true, note: '已下架：这一季市场没货' }] });
    assert.ok(html.includes('disabled') && html.includes('aria-disabled="true"'), '禁用落 disabled ＋ aria-disabled');
    assert.ok(html.includes('已下架：这一季市场没货'), '为什么必须写在行上');
  });

  it('忙态：根上落忙态属性 ＋ aria-busy', () => {
    const html = renderTaskList({ rows: [{ key: 'k', label: 'x' }], busy: true });
    assert.ok(html.includes('data-ilife-task-busy="1"') && html.includes('aria-busy="true"'), '忙态可读');
  });

  it('空清单：不出一个字；给了空态那一句才出', () => {
    assert.equal(renderTaskList({ rows: [] }), '');
    assert.equal(renderTaskList({ rows: [], foot: ['合计 0'] }), '', '没行就没清单：脚注也留不住');
    const empty = renderTaskList({ rows: [], absentLine: '清单是空的' });
    assert.equal((empty.match(new RegExp(TASK_ROW_CLASS, 'g')) || []).length, 0, '空态不得被算成一行');
    assert.ok(empty.includes(slot('absent').slice(1) + '">清单是空的<'));
  });

  it('转义面：标题／行名／小字／读数／错态／脚注／键逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderTaskList({
      key: evil, title: evil, progressLabel: evil, progressUnit: evil, absentLine: evil, foot: [evil],
      rows: [{ key: evil, label: evil, group: evil, note: evil, amount: evil, error: evil }],
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.ok(!/[\s"]on[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('入参违规一律拒（含本件两条特有不变量）：逐条断 BlocksError', () => {
    const throws = (fn) => {
      try { fn(); } catch (e) { return e.name === 'BlocksError'; }
      return false;
    };
    assert.deepEqual([...TASK_LIST_FORMS], ['checklist'], '形态闭集只有形态 A');
    assert.equal(throws(() => renderTaskList(null)), true, '入参不是对象');
    assert.equal(throws(() => renderTaskList({ rows: 'x' })), true, 'rows 不是数组');
    assert.equal(throws(() => renderTaskList({ rows: [{ label: 'x' }] })), true, 'key 必填');
    assert.equal(throws(() => renderTaskList({ rows: [{ key: 'k' }] })), true, 'label 必填');
    assert.equal(throws(() => renderTaskList({ rows: [{ key: '', label: 'x' }] })), true, 'key 不许空串');
    assert.equal(throws(() => renderTaskList({ rows: [{ key: 'k', label: 'x' }, { key: 'k', label: 'y' }] })), true, '键不许重复');
    assert.equal(throws(() => renderTaskList({ rows: [{ key: 'k', label: 'x', disabled: true }] })), true, '禁用必须写清为什么');
    assert.equal(throws(() => renderTaskList({ rows: [{ key: 'k', label: 'x', done: '1' }] })), true, 'done 必须是布尔');
    assert.equal(throws(() => renderTaskList({ rows: [{ key: 'k', label: 'x', disabled: 1 }] })), true, 'disabled 必须是布尔');
    assert.equal(throws(() => renderTaskList({ rows: [{ key: 'k', label: 'x', group: 1 }] })), true, 'group 不是串');
    assert.equal(throws(() => renderTaskList({ rows: [{ key: 'k', label: 'x', error: 1 }] })), true, 'error 不是串');
    assert.equal(throws(() => renderTaskList({ rows: [], form: 'shop' })), true, '形态闭集外');
    assert.equal(throws(() => renderTaskList({ rows: [], busy: '1' })), true, 'busy 必须是布尔');
    assert.equal(throws(() => renderTaskList({ rows: [], foot: [''] })), true, 'foot 数组里的空串');
    assert.equal(throws(() => renderTaskList({ rows: [], extraClass: 'a b!' })), true, '附加类名不合法');
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('task-list ② 样式与零 DOM 纪律', () => {
  it('全部规则 scope 在 `.ilife-page-ui` 下、只读自己的类名、窄档走容器查询', () => {
    const css = stripComments(taskListCss());
    assert.ok(css.trim() !== '', '样式段必须非空');
    const selectors = (css.match(/^[^@\s][^{\n]*\{/gm) || []);
    assert.ok(selectors.length >= 25, '选择器条数太少：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '必须 scope 在 .ilife-page-ui：' + sel.trim());
      assert.ok(sel.includes(TASK_LIST_CLASS), '只许读自己的类名根：' + sel.trim());
    }
    assert.ok(css.includes('@container'), '窄档必须走容器查询');
    assert.equal(/@media[^{]*max-width/.test(css), false, '媒体查询不许判宽度');
    assert.ok(css.includes(String(TASK_LIST_HIT_MIN_HEIGHT_PX) + 'px'), '命中区高度取常量（44）');
  });

  it('只经 skinVar 读皮肤：零 `:root`／`!important`／新 token／手写 var(--ilife-…)', () => {
    const css = stripComments(taskListCss());
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.deepEqual(css.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    const src = styleSource('task-list')
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

  it('状态矩阵的样式面：设备能力查询、可见焦点环、禁用光标、减动效、只动 transform', () => {
    const css = stripComments(taskListCss());
    assert.ok(css.includes('@media (hover:hover) and (pointer:fine)'), '悬停必须包在设备能力查询里');
    assert.ok(css.includes(':focus-visible'), '必须有可见焦点');
    assert.ok(css.includes('outline: 2px solid'), '焦点环 ≥2px');
    assert.ok(css.includes('cursor: not-allowed'), '禁用要给禁用光标');
    assert.ok(css.includes('@media (prefers-reduced-motion:reduce)'), '减动效要有交代');
    assert.equal(/transition\s*:[^;]*(width|height|background)/.test(css), false, '不许过渡宽度／高度／底色');
    assert.equal(/transitionend/.test(css), false, '不许依赖 transitionend');
  });

  it('`dist/components/task-list/**` 的代码零 document.／window.／navigator.（DOM 只在产出文本里）', () => {
    const dir = join(PKG, 'dist', 'components', 'task-list');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 5, '至少应扫到本件的编译产物：' + files.length);
    for (const f of files) {
      let code = readFileSync(f, 'utf8');
      code = code.replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/`(?:[^`\\]|\\.)*`/g, '``').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.ok(!code.includes(needle), f.replace(PKG, '') + ' 的代码里出现 ' + needle);
      }
    }
  });

  it('运行时是**产出的 JS 文本**：幂等标记在、事件名对得上、且不含 `<script>`', () => {
    const js = buildTaskListJs();
    assert.ok(js.startsWith('(function(){'), '一段 IIFE');
    assert.ok(js.includes('data-ilife-task-runtime'), '幂等标记');
    assert.ok(js.includes(TASK_EVENT_TOGGLE), '事件名取常量');
    assert.ok(!/<script/i.test(js), '不含脚本标签');
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('task-list ③ 加法式（不碰公共选择器、渲染确定）', () => {
  it('标记只带自己的类名（顶多加档位修饰类 is-done 与一个 extraClass）', () => {
    const html = renderTaskList({ ...sampleInput(), extraClass: 'mine-extra' });
    const allowed = new Set([TASK_ROW_DONE_CLASS, 'mine-extra']);
    for (const cls of [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/))) {
      assert.ok(cls.startsWith(TASK_LIST_CLASS) || allowed.has(cls), '混进了别人的类名：' + cls);
    }
  });

  it('同样的入参渲染两次逐字节相同（纯函数、无全局状态）', () => {
    const input = sampleInput();
    assert.equal(renderTaskList(input), renderTaskList(input));
  });
});

/* ── ④ 真机：两档几何 ＋ 状态矩阵 ＋ 勾选真落账 ─────────────────────── */

describe('task-list ④ 真机（无头 Chrome）', () => {
  it('390／1280：零横向溢出、关键语义不截断、命中区 ≥44；勾选／键盘／悬停／按下／禁用／忙态／错态／减动效逐档', async (t) => {
    const input = sampleInput();
    const p = await startFamilyPage({
      css: taskListCss(), bodyHtml: renderTaskList(input), runtime: buildTaskListJs(), copies: 2,
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何与交互判据需真浏览器');
    try {
      await p.ev('window.__ev=[];document.addEventListener(' + JSON.stringify(TASK_EVENT_TOGGLE)
        + ',function(e){window.__ev.push(e.detail);});true');
      const keys = [slot('amount'), slot('title'), slot('progress'), LABEL_SEL, slot('err')];
      for (const w of [390, 1280]) {
        await p.setWidth(w);
        const m = await p.metrics({ roots: [ROOT_SEL], keys });
        assert.equal(m.stage.w, w);
        assert.ok(m.stage.sw <= m.stage.cw + 1, w + ' 档舞台横向溢出');
        assert.ok(m.page.sw <= m.page.cw + 1, w + ' 档页面横向溢出');
        for (const r of m.roots) assert.ok(r.sw <= r.cw + 1, w + ' 档件根横向溢出：' + r.sw + ' > ' + r.cw);
        for (const k of m.keys) {
          assert.ok(k.n > 0, w + ' 档关键语义没扫到：' + k.selector);
          for (const it of k.items) {
            assert.ok(it.sw <= it.cw + 1, w + ' 档 ' + k.selector + ' 被截断：' + it.text);
            assert.ok(it.right <= it.stageRight + 1, w + ' 档 ' + k.selector + ' 顶出舞台：' + it.right);
          }
        }
        /* 触控地板：整行命中区 ≥44 高。 */
        const hits = await p.ev('(function(){return [].slice.call(document.querySelectorAll('
          + JSON.stringify(HIT_SEL) + ')).map(function(el){return Math.round(el.getBoundingClientRect().height);});}())');
        assert.equal(hits.length, 6, w + ' 档六行命中区都在');
        for (const h of hits) assert.ok(h >= TASK_LIST_HIT_MIN_HEIGHT_PX, w + ' 档命中区只有 ' + h + ' 高');
      }

      /* rest：勾选态就是渲染时那一次（无脚本也读得出）。 */
      const read = (key) => p.ev('(function(){var r=document.querySelector(' + JSON.stringify(rowSel(key)) + ');'
        + 'var box=r.querySelector("input[type=checkbox]");return {attr:r.getAttribute(' + JSON.stringify(TASK_DONE_ATTR) + '),'
        + 'done:r.classList.contains(' + JSON.stringify(TASK_ROW_DONE_CLASS) + '),checked:box.checked};}())');
      assert.deepEqual(await read('a1'), { attr: '1', done: true, checked: true }, '已勾行的三处同步');
      assert.deepEqual(await read('b1'), { attr: null, done: false, checked: false }, '未勾行三处同步');

      /* 勾选真落账：点一次 → 属性／修饰类／复选框／计数／进度条／事件全对，且只派发一条。 */
      await p.setWidth(1280);
      await p.ev('document.querySelector(' + JSON.stringify(rowSel('b1') + ' ' + HIT_SEL) + ').click();true');
      await sleep(260);
      assert.deepEqual(await read('b1'), { attr: '1', done: true, checked: true }, '勾上后三处同步');
      assert.equal(await p.ev('window.__ev.length'), 1, '事件恰好一条（两份运行时只绑一次）');
      const detail = await p.ev('window.__ev[0]');
      assert.equal(detail.key, 'b1');
      assert.equal(detail.label, '浏阳豆豉 15g');
      assert.equal(detail.group, '待买');
      assert.equal(detail.done, true);
      assert.equal(detail.list, 'grocery');
      assert.equal(detail.doneCount, 3);
      assert.equal(detail.totalCount, 6);
      const counts = await p.ev('(function(){return [].slice.call(document.querySelectorAll('
        + JSON.stringify('[' + TASK_COUNTS_ATTR + ']') + ')).map(function(el){return el.textContent;});}())');
      assert.deepEqual(counts, ['3' + TASK_COUNTS_SEPARATOR + '6', '2' + TASK_COUNTS_SEPARATOR + '2',
        '1' + TASK_COUNTS_SEPARATOR + '4'], '表头与组头的数当场重数');
      assert.ok(await p.ev('document.querySelector(' + JSON.stringify(slot('bar-fill'))
        + ').style.transform.indexOf("scaleX(0.5)")===0'), '进度条按新比例走');
      assert.equal(await p.ev('getComputedStyle(document.querySelector(' + JSON.stringify(rowSel('b1') + ' ' + LABEL_SEL)
        + ')).textDecorationLine'), 'line-through', '勾上的行名带划线（第二样信息，不只靠色）');

      /* 键盘：Tab 到复选框 ⇒ 可见焦点环；空格 ⇒ 再勾回来。
         （先把焦点清掉，免得"上一段点过谁"决定 Tab 落到哪一格——判据不该依赖动作顺序。） */
      await p.ev('(document.activeElement && document.activeElement.blur ? document.activeElement.blur() : null),true');
      await p.pressTab();
      const focus = await p.focusRead();
      assert.equal(focus.tag, 'input', '第一枚可聚焦就是复选框：' + JSON.stringify(focus));
      assert.equal(focus.focusVisible, true, ':focus-visible 必须亮（真键盘路径）');
      const boxOutline = await p.ev('(function(){var el=document.activeElement;'
        + 'var b=el.nextElementSibling; if (!b || String(b.className).indexOf(' + JSON.stringify(TASK_CHECK_CLASS + '-box') + ')<0){'
        + ' b=el.parentNode.querySelector(' + JSON.stringify(BOX_SEL) + '); }'
        + 'var cs=getComputedStyle(b); return {style:cs.outlineStyle, width:cs.outlineWidth,'
        + ' box:!!b && String(b.className)};}())');
      assert.notEqual(boxOutline.style, 'none', '焦点环必须在框形上可见：' + JSON.stringify(boxOutline));
      assert.ok(parseFloat(boxOutline.width) >= 2, '焦点环 ≥2px：' + boxOutline.width);
      /* 空格切换的是**当前聚焦那一行**（Tab 的落点由浏览器的焦点导航起点定，判据不该赌它是哪一行）。 */
      const focusedKey = await p.ev('document.activeElement.closest(' + JSON.stringify('[' + TASK_KEY_ATTR + ']')
        + ').getAttribute(' + JSON.stringify(TASK_KEY_ATTR) + ')');
      const beforeSpace = await read(focusedKey);
      const evBefore = await p.ev('window.__ev.length');
      await p.pressSpace();
      await sleep(200);
      const afterSpace = await read(focusedKey);
      assert.equal(afterSpace.checked, !beforeSpace.checked, '空格能勾／取消勾（聚焦那一行：' + focusedKey + '）');
      assert.equal(afterSpace.attr, beforeSpace.attr === '1' ? null : '1', '勾选态属性跟着翻');
      assert.equal(afterSpace.done, !beforeSpace.done, '修饰类跟着翻');
      assert.equal(await p.ev('window.__ev.length'), evBefore + 1, '空格也派发（走 change 这一条通路）');

      /* 悬停：包在设备能力查询里；关掉悬停后勾选照样落（不是唯一通路）。 */
      const geo = await p.ev('(function(){var b=document.querySelector(' + JSON.stringify(rowSel('b2') + ' ' + HIT_SEL)
        + ').getBoundingClientRect(); return {x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2)};}())');
      await p.emulate({ hover: true });
      const restBg = await p.ev('getComputedStyle(document.querySelector(' + JSON.stringify(rowSel('b2') + ' ' + HIT_SEL) + ')).backgroundColor');
      await p.moveMouse(geo.x, geo.y);
      const hoverBg = await p.ev('getComputedStyle(document.querySelector(' + JSON.stringify(rowSel('b2') + ' ' + HIT_SEL) + ')).backgroundColor');
      assert.notEqual(hoverBg, restBg, '悬停要有可见变化：' + restBg + ' → ' + hoverBg);
      await p.emulate({ hover: false });
      const b2Before = await read('b2');
      await p.ev('document.querySelector(' + JSON.stringify(rowSel('b2') + ' ' + HIT_SEL) + ').click();true');
      await sleep(220);
      const b2After = await read('b2');
      assert.equal(b2After.checked, !b2Before.checked, '没有悬停的设备上照样能勾（悬停不是唯一通路）');

      /* 按下：真按下时框形缩到 .9（只动 transform）。 */
      await p.emulate({ hover: true });
      const geo2 = await p.ev('(function(){var b=document.querySelector(' + JSON.stringify(rowSel('b3') + ' ' + BOX_SEL)
        + ').getBoundingClientRect();'
        + ' return {x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2)};}())');
      await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: geo2.x, y: geo2.y, button: 'left', clickCount: 1 });
      await sleep(90);
      const pressed = await p.ev('getComputedStyle(document.querySelector(' + JSON.stringify(rowSel('b3') + ' ' + BOX_SEL) + ')).transform');
      await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: geo2.x, y: geo2.y, button: 'left', clickCount: 1 });
      assert.notEqual(pressed, 'none', '按下要有形状反馈（transform）：' + pressed);
      assert.ok(pressed.includes('0.9'), '按下缩到 .9：' + pressed);

      /* 禁用：not-allowed ＋ 点不动 ＋ 不派发。 */
      const before = await p.ev('window.__ev.length');
      assert.equal(await p.ev('(function(){var b=document.querySelector(' + JSON.stringify(rowSel('b3') + ' input')
        + '); return b.disabled===true;}())'), true, '禁用行的复选框落 disabled');
      assert.equal(await p.ev('getComputedStyle(document.querySelector(' + JSON.stringify(rowSel('b3') + ' ' + HIT_SEL)
        + ')).cursor'), 'not-allowed', '禁用光标');
      await p.ev('document.querySelector(' + JSON.stringify(rowSel('b3') + ' ' + HIT_SEL) + ').click();true');
      await sleep(150);
      assert.equal((await read('b3')).attr, null, '禁用行点不动');
      assert.equal(await p.ev('window.__ev.length'), before, '禁用行不派发事件');

      /* 再加量：再勾一条（清单还在长），事件里的数与界面上重数后的数一致。 */
      const domDone = () => p.ev('document.querySelectorAll(' + JSON.stringify('[' + TASK_KEY_ATTR + '][' + TASK_DONE_ATTR + ']')
        + ').length');
      const doneBeforeAdd = await domDone();
      await p.ev('document.querySelector(' + JSON.stringify(rowSel('a1') + ' ' + HIT_SEL) + ').click();true');
      await sleep(200);
      assert.equal(await p.ev('window.__ev.length'), before + 1, '勾一条派发一条');
      const lastEvent = await p.ev('window.__ev[window.__ev.length-1]');
      assert.equal(Math.abs(lastEvent.doneCount - doneBeforeAdd), 1, '界面上正好翻了一条');
      assert.equal(lastEvent.doneCount, await domDone(), '事件里的数＝重数后的数');

      /* 忙态：整单在写的时候勾选不落账、不回显、不派发（复选框回弹）。 */
      await p.ev('document.querySelector(' + JSON.stringify(ROOT_SEL) + ').setAttribute("data-ilife-task-busy","1");true');
      const busyBefore = await p.ev('window.__ev.length');
      await p.ev('document.querySelector(' + JSON.stringify(rowSel('b4') + ' ' + HIT_SEL) + ').click();true');
      await sleep(150);
      assert.deepEqual(await read('b4'), { attr: null, done: false, checked: false }, '忙态下勾选不落账（复选框回弹）');
      assert.equal(await p.ev('window.__ev.length'), busyBefore, '忙态下不派发');
      await p.ev('document.querySelector(' + JSON.stringify(ROOT_SEL) + ').removeAttribute("data-ilife-task-busy");true');

      /* 错态：错句挂在 aria-describedby 指到的那个节点上，且在勾选框旁边（同一行内）。 */
      const err = await p.ev('(function(){var box=document.querySelector(' + JSON.stringify(rowSel('b4') + ' input')
        + '); var id=box.getAttribute("aria-describedby"); var node=id?document.getElementById(id):null;'
        + 'if (!node) return null;'
        + 'return {id:id, text:node.textContent, inside:box.closest(' + JSON.stringify(rowSel('b4')) + ').contains(node)};}())');
      assert.ok(err !== null, '错态节点必须挂得上 aria-describedby');
      assert.equal(err.text, '没存上：网络错误');
      assert.equal(err.inside, true, '错句写在控件旁边（同一行内）');

      /* 减动效：过渡关掉、状态照落、不许有东西卡在半路。 */
      await p.emulate({ reducedMotion: true });
      assert.equal(await p.ev('getComputedStyle(document.querySelector(' + JSON.stringify(slot('bar-fill')) + ')).transitionDuration'),
        '0s', '减动效下进度条不许有过渡');
      const b1Before = await read('b1');
      await p.ev('document.querySelector(' + JSON.stringify(rowSel('b1') + ' ' + HIT_SEL) + ').click();true');
      await sleep(120);
      const b1After = await read('b1');
      assert.equal(b1After.checked, !b1Before.checked, '减动效下状态照落');
      assert.equal(await p.runningAnimations(), 0, '不许有东西卡在半路');
      assert.deepEqual(await p.errors(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
