/** due-row（到期行）· 契约测试。
 *
 *  四组判据：
 *   ① **渲染契约**：结构与槽位／三档形状类／动作按钮的机器属性／空态／**转义面**／
 *      **全部**非法入参分支（含"禁用必须写清为什么"与"行键不许重复"两条特有不变量）；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤／scope 在 `.ilife-page-ui` 下／零 `:root`／`!important`／
 *      **三档必须有形状差异**（左竖条实线／点线／双线）／只动 `transform`／窄档走 `@container`；
 *      `dist/**` 的**代码**零 DOM（运行时段是产出的文本）；
 *   ③ **加法式**：只读自己的类名、渲染两次逐字节相同；
 *   ④ **真机**：390／1280 两档零横向溢出 ＋ 倒计时与到期日不截断 ＋ **状态矩阵逐档断**
 *      （`rest`／`:hover`（设备能力查询里，且不是唯一通路）／`:active` 真按下／`:focus-visible` 焦点环／
 *      `disabled`（cursor ＋ 点不动 ＋ 不派发）／`loading`（原地换字、宽度不跳）／`error`（挂 `aria-describedby`）／
 *      `empty`）＋ 点一下真派发 `ilife:due-action`（键、名、档位、动作都对得上，且幂等只绑一次）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DUE_ACT_ATTR, DUE_EVENT_ACTION, DUE_KEY_ATTR, DUE_LOADING_ATTR, DUE_LOADING_LABEL, DUE_ROW_CLASS,
  DUE_ROW_BUTTON_MIN_HEIGHT_PX, DUE_ROW_BUTTON_MIN_WIDTH_PX, DUE_ROW_FORMS, DUE_ROW_MISSING,
  DUE_ROW_NARROW_MAX_PX, DUE_ROW_TONES, DUE_TONE_ATTR,
  buildDueRowJs, dueRowCss, dueRowSlot, renderDueRows,
} from '../dist/components/due-row/index.js';
import { SKIN_TOKEN_NAMES, skinTokenVar } from '../dist/components/skin/index.js';
import { startFamilyPage, sleep } from './_f5-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT_SEL = '.' + DUE_ROW_CLASS;
const slot = (name) => '.' + dueRowSlot(name);
const itemSel = (key) => '[' + DUE_KEY_ATTR + '="' + key + '"]';
const actSel = (key) => itemSel(key) + ' [' + DUE_ACT_ATTR + ']';

/** 三档各一行（正常／临近／已过期）＋ 一个带错的 ＋ 一个禁用的。 */
function sampleRows() {
  return [
    {
      key: 'warranty', name: '洗衣机整机保修', tone: 'warn', tag: '临近', countdown: '18', countdownLabel: '还剩',
      countUnit: '天', due: '2026-10-13 到期', meta: ['整机保修 2 年', '阳台'],
      note: '18 天内报修，工时费全免', action: { key: 'book', label: '现在约' },
    },
    {
      key: 'idcard', name: '身份证换领', tone: 'danger', tag: '已过期', countdown: '12', countdownLabel: '已逾期',
      countUnit: '天', due: '2026-09-13 到期', note: '带着旧证去派出所，办证 20 个工作日',
      action: { key: 'go', label: '去派出所' },
    },
    {
      key: 'ac', name: '空调保修', tone: 'ok', tag: '正常', countdown: '412', countdownLabel: '还剩',
      countUnit: '天', due: '2027-11-11 到期', note: '还早，到期前 30 天再提醒',
      action: { key: 'later', label: '设提醒', disabled: true, note: '这台已经设过提醒了' },
    },
    {
      key: 'card', name: '信用卡还款日', tone: 'warn', tag: '临近', countdown: '13', countdownLabel: '还剩',
      countUnit: '天', due: '2026-10-08 到期', action: { key: 'remind', label: '设提醒', loading: true },
      error: '没连上：再试一次',
    },
  ];
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('due-row ① 渲染契约', () => {
  it('结构：表头 ＋ 逐行（档位字／名称／倒计时／到期日／补充／该做什么／动作）＋ 脚注', () => {
    const html = renderDueRows({
      heading: '最该先办的', count: '按紧急度排 · 今天 09-25', rows: sampleRows(),
      foot: ['共 4 件', '最近的 10-08'],
    });
    assert.ok(html.startsWith('<div class="' + DUE_ROW_CLASS + '">'), '根用类名根打头：' + html.slice(0, 90));
    assert.ok(html.includes(slot('heading').slice(1) + '">最该先办的<'), '小标题');
    assert.ok(html.includes(slot('count').slice(1) + '">按紧急度排 · 今天 09-25<'), '右侧口径');
    assert.equal((html.match(new RegExp(dueRowSlot('item') + ' ', 'g')) || []).length, 4, '四行');
    assert.ok(html.includes(slot('tag').slice(1) + ' is-warn">'), '档位字带档位类');
    assert.ok(html.includes(DUE_TONE_ATTR + '="danger"'), '档位落在机器属性上（事件带回来）');
    assert.ok(html.includes(slot('count-value').slice(1) + '">18<'), '放大的是这个数');
    assert.ok(html.includes(slot('countdown-label').slice(1) + '">还剩<') && html.includes(slot('count-unit').slice(1) + '">天<'),
      '倒计时的前词与量词分槽');
    assert.ok(html.includes(slot('due').slice(1) + '">2026-10-13 到期<'), '到期日');
    assert.ok(html.includes(slot('meta').slice(1) + '"><span>整机保修 2 年</span><span>阳台</span>'), '补充逐段一枚');
    assert.ok(html.includes(slot('note').slice(1) + '">18 天内报修，工时费全免<'), '该做什么');
    assert.ok(html.includes('<button type="button" class="' + dueRowSlot('button') + '" ' + DUE_ACT_ATTR + '="book"'),
      '动作是真按钮');
    assert.ok(html.includes('aria-label="洗衣机整机保修：现在约"'), '按钮的可读名带行名（读屏知道是哪一件）');
    assert.ok(html.includes(slot('foot').slice(1) + '"><span>共 4 件</span><span>最近的 10-08</span>'), '脚注逐段一枚');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('三档闭集；档位字与点都有形状差异（形状差异归样式段）', () => {
    assert.deepEqual([...DUE_ROW_TONES], ['ok', 'warn', 'danger']);
    assert.deepEqual([...DUE_ROW_FORMS], ['countdown'], '形态闭集只有形态 B「倒计时放大 ＋ 动作」');
    const html = renderDueRows({ rows: sampleRows() });
    for (const tone of DUE_ROW_TONES) assert.ok(html.includes(' is-' + tone + '"'), '档类：' + tone);
    assert.equal((html.match(new RegExp(dueRowSlot('dot'), 'g')) || []).length, 4, '每行的档位字带一枚点');
  });

  it('动作的三档变体：禁用（disabled ＋ aria-disabled ＋ 说明）／处理中（换字 ＋ aria-busy）／错态', () => {
    const html = renderDueRows({ rows: sampleRows() });
    assert.ok(html.includes('disabled') && html.includes('aria-disabled="true"'), '禁用落 disabled ＋ aria-disabled');
    assert.ok(html.includes('这台已经设过提醒了'), '禁用为什么写在按钮旁');
    assert.ok(html.includes(DUE_LOADING_ATTR + '="1"') && html.includes('aria-busy="true"'), '处理中落标记');
    assert.ok(html.includes('>' + DUE_LOADING_LABEL + '<'), '处理中：原地换字');
    assert.ok(html.includes(slot('err').slice(1) + '" id="ilife-due-err-card" role="alert">没连上：再试一次<'), '错态写在按钮旁');
    assert.ok(html.includes('aria-describedby="ilife-due-err-card"'), '错态挂在 aria-describedby 上');
  });

  it('没有动作的行照样成立（只有倒计时与到期日，不出按钮）', () => {
    const html = renderDueRows({ rows: [{ key: 'k', name: 'x', tone: 'ok', tag: '正常', countdown: '9', due: '2026-10-01 到期' }] });
    assert.equal(html.includes('<button'), false, '没给 action 就不出按钮');
    assert.ok(html.includes(slot('count-value').slice(1) + '">9<'), '倒计时照出');
  });

  it('空行：不出一个字；给了空态那一句才出', () => {
    assert.equal(renderDueRows({ rows: [] }), '');
    assert.equal(renderDueRows({ rows: [], foot: ['共 0 件'] }), '', '没行就没台账：脚注也留不住');
    const empty = renderDueRows({ rows: [], absentLine: '没有快到期的' });
    assert.equal((empty.match(new RegExp(dueRowSlot('item'), 'g')) || []).length, 0, '空态不得被算成一行');
    assert.ok(empty.includes(slot('absent').slice(1) + '">没有快到期的<'));
  });

  it('缺值写法写在一处：`—`（缺值不许写 0、不许留空）', () => {
    assert.equal(DUE_ROW_MISSING, '—');
    const html = renderDueRows({ rows: [{ key: 'k', name: 'x', tone: 'ok', tag: '正常', countdown: DUE_ROW_MISSING }] });
    assert.ok(html.includes('>' + DUE_ROW_MISSING + '<'), '缺值由调用方按这条口径给串');
  });

  it('转义面：名称／档位字／倒计时／到期日／补充／说明／脚注／动作字逐位转义，塞不进属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderDueRows({
      heading: evil, count: evil, foot: [evil],
      rows: [{
        key: evil, name: evil, tone: 'warn', tag: evil, countdown: evil, countdownLabel: evil, countUnit: evil,
        due: evil, meta: [evil], note: evil, action: { key: evil, label: evil },
      }],
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
  });

  it('入参违规一律拒（含两条特有不变量）：逐条断 BlocksError', () => {
    const throws = (fn) => {
      try { fn(); } catch (e) { return e.name === 'BlocksError'; }
      return false;
    };
    const row = { key: 'k', name: 'n', tone: 'warn', tag: '临近', countdown: '3' };
    assert.equal(throws(() => renderDueRows(null)), true, '入参不是对象');
    assert.equal(throws(() => renderDueRows({ rows: 'x' })), true, 'rows 不是数组');
    assert.equal(throws(() => renderDueRows({ rows: [{ name: 'n', tone: 'warn', tag: 't', countdown: '1' }] })), true, 'key 必填');
    assert.equal(throws(() => renderDueRows({ rows: [{ key: 'k', tone: 'warn', tag: 't', countdown: '1' }] })), true, 'name 必填');
    assert.equal(throws(() => renderDueRows({ rows: [{ key: 'k', name: 'n', tag: 't', countdown: '1' }] })), true, 'tone 必填');
    assert.equal(throws(() => renderDueRows({ rows: [{ key: 'k', name: 'n', tone: 'later', tag: 't', countdown: '1' }] })), true, '档位闭集外');
    assert.equal(throws(() => renderDueRows({ rows: [{ key: 'k', name: 'n', tone: 'ok', countdown: '1' }] })), true, '档位字必填（状态必须带字）');
    assert.equal(throws(() => renderDueRows({ rows: [{ key: 'k', name: 'n', tone: 'ok', tag: 't' }] })), true, '倒计时必填');
    assert.equal(throws(() => renderDueRows({ rows: [row, { ...row }] })), true, '行键不许重复');
    assert.equal(throws(() => renderDueRows({ rows: [{ ...row, action: { label: '去' } }] })), true, '动作键必填');
    assert.equal(throws(() => renderDueRows({ rows: [{ ...row, action: { key: 'a' } }] })), true, '动作字必填');
    assert.equal(throws(() => renderDueRows({ rows: [{ ...row, action: { key: 'a', label: '去', disabled: true } }] })), true,
      '禁用必须写清为什么');
    assert.equal(throws(() => renderDueRows({ rows: [{ ...row, action: { key: 'a', label: '去', loading: '1' } }] })), true,
      'loading 必须是布尔');
    assert.equal(throws(() => renderDueRows({ rows: [{ ...row, meta: [''] }] })), true, 'meta 数组里的空串');
    assert.equal(throws(() => renderDueRows({ rows: [], form: 'axis' })), true, '形态闭集外');
    assert.equal(throws(() => renderDueRows({ rows: [], extraClass: 'a b!' })), true, '附加类名不合法');
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('due-row ② 样式与零 DOM 纪律', () => {
  it('全部规则 scope 在 `.ilife-page-ui` 下、只读自己的类名、窄档走容器查询', () => {
    const css = stripComments(dueRowCss());
    assert.ok(css.trim() !== '', '样式段必须非空');
    const selectors = (css.match(/^[^@\s][^{\n]*\{/gm) || []);
    assert.ok(selectors.length >= 25, '选择器条数太少：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '必须 scope 在 .ilife-page-ui：' + sel.trim());
      assert.ok(sel.includes(DUE_ROW_CLASS), '只许读自己的类名根：' + sel.trim());
    }
    assert.ok(css.includes('@container'), '窄档必须走容器查询');
    assert.equal(/@media[^{]*max-width/.test(css), false, '媒体查询不许判宽度');
    assert.ok(css.includes(String(DUE_ROW_NARROW_MAX_PX) + 'px'), '窄档断点取常量');
    assert.ok(css.includes(String(DUE_ROW_BUTTON_MIN_HEIGHT_PX) + 'px'), '按钮高度下限取常量（44）');
    assert.ok(css.includes(String(DUE_ROW_BUTTON_MIN_WIDTH_PX) + 'px'), '按钮宽度下限取常量（换字不跳版）');
  });

  it('**三档必须有形状差异**：左竖条实线／点线／双线；档位字底线／描边实底／双线框；点圆／方／菱', () => {
    const css = stripComments(dueRowCss());
    assert.ok(/\.is-ok \{ border-left: 3px solid/.test(css), '正常：实线左竖条');
    assert.ok(/\.is-warn \{ border-left: 3px dotted/.test(css), '临近：点线左竖条');
    assert.ok(/\.is-danger \{ border-left: 3px double/.test(css), '已过期：双线左竖条');
    assert.ok(/\.is-ok \{[^}]*border-bottom: 2px solid/.test(css), '正常档位字：只带底线');
    assert.ok(/\.is-warn \{[^}]*border: 1px solid/.test(css), '临近档位字：描边');
    assert.ok(/\.is-danger \{[^}]*border: 3px double/.test(css), '已过期档位字：双线框');
    assert.ok(/-dot \{[^}]*border-radius: 50%/.test(css), '点：圆');
    assert.ok(/\.is-warn [^{]*-dot \{[^}]*border-radius: 1px/.test(css), '点：方（临近）');
    assert.ok(/\.is-danger [^{]*-dot \{[^}]*transform: rotate\(45deg\)/.test(css), '点：菱（已过期）');
  });

  it('只经 skinVar 读皮肤：零 `:root`／`!important`／新 token／手写 var(--ilife-…)', () => {
    const css = stripComments(dueRowCss());
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.deepEqual(css.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    const src = readFileSync(join(PKG, 'src', 'components', 'due-row', 'style.ts'), 'utf8')
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

  it('状态矩阵的样式面：设备能力查询、可见焦点环、禁用光标、减动效、只动 transform', () => {
    const css = stripComments(dueRowCss());
    assert.ok(css.includes('@media (hover:hover) and (pointer:fine)'), '悬停必须包在设备能力查询里');
    assert.ok(css.includes(':focus-visible'), '必须有可见焦点');
    assert.ok(css.includes('outline: 2px solid'), '焦点环 ≥2px');
    assert.ok(css.includes('cursor: not-allowed'), '禁用要给禁用光标');
    assert.ok(css.includes('@media (prefers-reduced-motion:reduce)'), '减动效要有交代');
    assert.ok(css.includes(':active { transform: scale(.98); }'), '按下只动 transform（≤80ms）');
    assert.equal(/transition\s*:[^;]*(width|height|background)/.test(css), false, '不许过渡宽度／高度／底色');
    assert.equal(/transitionend/.test(css), false, '不许依赖 transitionend');
  });

  it('`dist/components/due-row/**` 的代码零 document.／window.／navigator.（DOM 只在产出文本里）', () => {
    const dir = join(PKG, 'dist', 'components', 'due-row');
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
    const js = buildDueRowJs();
    assert.ok(js.startsWith('(function(){'), '一段 IIFE');
    assert.ok(js.includes('data-ilife-due-runtime'), '幂等标记');
    assert.ok(js.includes(DUE_EVENT_ACTION), '事件名取常量');
    assert.ok(!/<script/i.test(js), '不含脚本标签');
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('due-row ③ 加法式（不碰公共选择器、渲染确定）', () => {
  it('标记只带自己的类名（顶多加档位修饰类 is-<档> 与一个 extraClass）', () => {
    const html = renderDueRows({ rows: sampleRows(), extraClass: 'mine-extra' });
    const modifiers = new Set(DUE_ROW_TONES.map((t) => 'is-' + t));
    for (const cls of [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/))) {
      assert.ok(cls.startsWith(DUE_ROW_CLASS) || modifiers.has(cls) || cls === 'mine-extra',
        '混进了别人的类名：' + cls);
    }
  });

  it('同样的入参渲染两次逐字节相同（纯函数、无全局状态）', () => {
    const input = { rows: sampleRows(), heading: '最该先办的' };
    assert.equal(renderDueRows(input), renderDueRows(input));
  });
});

/* ── ④ 真机：两档几何 ＋ 状态矩阵 ＋ 动作真派发 ─────────────────────── */

describe('due-row ④ 真机（无头 Chrome）', () => {
  it('390／1280 几何 ＋ 悬停／按下／焦点／禁用／处理中／错态／空态逐档 ＋ 动作真派发且幂等', async (t) => {
    const p = await startFamilyPage({
      css: dueRowCss(), bodyHtml: renderDueRows({ heading: '最该先办的', rows: sampleRows() }),
      runtime: buildDueRowJs(), copies: 2,
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何与交互判据需真浏览器');
    try {
      await p.ev('window.__acts=[];document.addEventListener(' + JSON.stringify(DUE_EVENT_ACTION)
        + ',function(e){window.__acts.push(e.detail);});true');
      const keys = [slot('count-value'), slot('due'), slot('tag'), slot('name'), slot('button'), slot('err')];
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
      }

      /* 触控地板：每颗按钮 ≥44 高、≥104 宽（宽度锁住 ⇒ 换字不跳版）。 */
      await p.setWidth(1280);
      const btn = await p.hitRead(actSel('warranty'));
      assert.equal(btn.tag, 'button', '动作必须是真按钮');
      assert.ok(btn.w >= DUE_ROW_BUTTON_MIN_WIDTH_PX && btn.h >= DUE_ROW_BUTTON_MIN_HEIGHT_PX,
        '按钮命中盒 ' + btn.w + '×' + btn.h + ' 小于 104×44');

      /* 点一下：事件带齐行键、行名、档位、动作键，且只派发一条（两份运行时只绑一次）。 */
      await p.ev('document.querySelector(' + JSON.stringify(actSel('idcard')) + ').click();true');
      await sleep(120);
      assert.equal(await p.ev('window.__acts.length'), 1, '点击恰好派发一条事件');
      const detail = await p.ev('window.__acts[0]');
      assert.deepEqual(detail, {
        key: 'idcard', name: '身份证换领', tone: 'danger', action: 'go', actionLabel: '去派出所',
      }, '事件 detail 逐字段对上');

      /* disabled：点不动、不派发，且光标是 not-allowed。 */
      assert.equal(await p.hitRead(actSel('ac')).then((r) => r.cursor), 'not-allowed', '禁用按钮的鼠标样式');
      await p.ev('document.querySelector(' + JSON.stringify(actSel('ac')) + ').click();true');
      await sleep(120);
      assert.equal(await p.ev('window.__acts.length'), 1, '禁用按钮不得派发');

      /* 处理中（loading）：原地换字，宽度与常态一致（不跳版）。 */
      const loading = await p.hitRead(actSel('card'));
      assert.equal(await p.ev('document.querySelector(' + JSON.stringify(actSel('card'))
        + ').textContent'), DUE_LOADING_LABEL, '处理中：原地换字');
      assert.equal(await p.ev('document.querySelector(' + JSON.stringify(actSel('card'))
        + ').getAttribute("aria-busy")'), 'true', '处理中：aria-busy');
      assert.equal(loading.w, btn.w, '换字不跳版（两颗按钮同宽）：' + loading.w + ' vs ' + btn.w);

      /* 三档的**形状与取值规则真的落地**（真机读法）：左竖条实线／点线／双线，倒计时三档不同色。 */
      const tones = await p.ev('(function(){'
        + 'var pick=function(sel){var el=document.querySelector(sel);'
        + 'var row=getComputedStyle(el);'
        + 'var value=getComputedStyle(el.querySelector(' + JSON.stringify('.' + dueRowSlot('count-value')) + '));'
        + 'var tag=getComputedStyle(el.querySelector(' + JSON.stringify('.' + dueRowSlot('tag')) + '));'
        /* 逐字取出来（活对象过不了 CDP 的 returnByValue：CSSStyleDeclaration 序列化成空壳）。 */
        + 'return {left:row.borderLeftStyle, leftWidth:row.borderLeftWidth, value:value.color,'
        + ' tagBottom:tag.borderBottomStyle, tagTop:tag.borderTopStyle, tagWidth:tag.borderTopWidth};};'
        + 'return {ok:pick(' + JSON.stringify(itemSel('ac')) + '),'
        + ' warn:pick(' + JSON.stringify(itemSel('warranty')) + '),'
        + ' danger:pick(' + JSON.stringify(itemSel('idcard')) + ')};}())');
      assert.equal(tones.ok.left, 'solid', '正常档：实线左竖条');
      assert.equal(tones.warn.left, 'dotted', '临近档：点线左竖条');
      assert.equal(tones.danger.left, 'double', '已过期档：双线左竖条');
      assert.notEqual(tones.danger.value, tones.ok.value, '三档倒计时不同色（取值规则真的落地）');
      assert.equal(tones.ok.tagBottom, 'solid', '正常档位字：只带底线');
      assert.equal(tones.warn.tagTop, 'solid', '临近档位字：描边');
      assert.equal(tones.danger.tagTop, 'double', '已过期档位字：双线框');

      /* error：错句挂在 aria-describedby 指到的节点上，且在按钮旁边（同一个动作块里）。 */
      const err = await p.ev('(function(){var b=document.querySelector(' + JSON.stringify(actSel('card'))
        + '); var id=b.getAttribute("aria-describedby"); var node=id?document.getElementById(id):null;'
        + 'if (!node) return null;'
        + 'return {text:node.textContent, near:b.parentNode.contains(node)};}())');
      assert.ok(err !== null, '错态节点必须挂得上 aria-describedby');
      assert.equal(err.text, '没连上：再试一次');
      assert.equal(err.near, true, '错句写在按钮旁边');

      /* hover：包在设备能力查询里（不是唯一通路——按下才是通路）。 */
      await p.emulate({ hover: true });
      const geo = await p.ev('(function(){var b=document.querySelector(' + JSON.stringify(actSel('warranty'))
        + ').getBoundingClientRect(); return {x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2)};}())');
      const restBg = await p.ev('getComputedStyle(document.querySelector(' + JSON.stringify(actSel('warranty'))
        + ')).backgroundColor');
      await p.moveMouse(geo.x, geo.y);
      const hoverBg = await p.ev('getComputedStyle(document.querySelector(' + JSON.stringify(actSel('warranty'))
        + ')).backgroundColor');
      assert.notEqual(hoverBg, restBg, '悬停要有可见变化：' + restBg + ' → ' + hoverBg);

      /* active：真按下时按钮缩到 .98（只动 transform）。 */
      await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: geo.x, y: geo.y, button: 'left', clickCount: 1 });
      await sleep(90);
      const pressed = await p.ev('getComputedStyle(document.querySelector(' + JSON.stringify(actSel('warranty'))
        + ')).transform');
      await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: geo.x, y: geo.y, button: 'left', clickCount: 1 });
      assert.ok(pressed.includes('0.98'), '按下缩到 .98：' + pressed);

      /* :focus-visible：真键盘 Tab，焦点环 ≥2px 且可见。 */
      await p.pressTab();
      const focus = await p.focusRead();
      assert.equal(focus.focusVisible, true, ':focus-visible 必须亮：' + JSON.stringify(focus));
      assert.ok(parseFloat(focus.outlineWidth) >= 2, '焦点环 ≥2px：' + focus.outlineWidth);
      assert.notEqual(focus.outlineStyle, 'none', '焦点环必须在');

      /* 空态与空态行：没给 action 的行不出按钮；空台账只出空态那一句。 */
      assert.equal(await p.ev('document.querySelectorAll(' + JSON.stringify(ROOT_SEL + ' ' + slot('absent')) + ').length'),
        0, '有行时不出空态那一句');

      /* 减动效：过渡关掉、状态照落、不许有东西卡在半路。 */
      await p.emulate({ reducedMotion: true });
      assert.equal(await p.ev('getComputedStyle(document.querySelector(' + JSON.stringify(actSel('warranty'))
        + ')).transitionDuration'), '0s', '减动效下按钮不许有过渡');
      assert.equal(await p.runningAnimations(), 0, '不许有东西卡在半路');
      assert.deepEqual(await p.errors(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
