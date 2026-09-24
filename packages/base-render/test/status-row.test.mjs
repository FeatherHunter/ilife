/** status-row（状态台账行）· 契约测试。
 *
 *  四组判据（与组件层其余件同一份）：
 *   ① **渲染契约**：结构与槽位 ／ 五档档位 ／ 缺的槽不留空位 ／ **转义面** ／ **全部**非法入参分支；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤（不手写 `var(--ilife-…)`）／scope 在 `.ilife-page-ui` 下／
 *      零 `:root`／`!important`／不新造 token／窄档走 `@container` 而非视口断点；`dist/**` 的**代码**零 DOM；
 *   ③ **加法式**：本件只读自己的类名（每条选择器都带自己的类名根）、渲染两次逐字节相同；
 *   ④ **真机两档（390／1280）**：零横向溢出（页／舞台／件三级）＋ 关键语义**不截断**（金额／日期／档位字）
 *      ＋ 行高 ≥44（触控地板）＋ 本件零动效零可点元素（静态件的"状态矩阵"读数：没有假按钮、没有半路的动画）。
 *
 *  期望值一律从组件自己的常量派生（`STATUS_ROW_*`／`statusRowSlot()`），不抄字面量：改名这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  STATUS_ROW_CLASS, STATUS_ROW_FORMS, STATUS_ROW_ITEM_MIN_HEIGHT_PX, STATUS_ROW_MISSING,
  STATUS_ROW_NARROW_MAX_PX, STATUS_ROW_SLOTS, STATUS_ROW_TONES,
  renderStatusRows, statusRowCss, statusRowSlot,
} from '../dist/components/status-row/index.js';
import { SKIN_TOKEN_NAMES, skinTokenVar } from '../dist/components/skin/index.js';
import { startFamilyPage } from './_f5-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT_SEL = '.' + STATUS_ROW_CLASS;
const slot = (name) => '.' + statusRowSlot(name);

/** 一块典型台账：五档各一行（档位形状差异是这一件的要害）。 */
function sampleRows() {
  return [
    { name: '手机分期 · 已还 3 期', phase: '已完成', tone: 'ok', amount: '¥1,860.00', amountUnit: '元', meta: '07-18 / 08-18 / 09-18 各扣 ¥620', due: '2026-09-18', dueTone: 'ok' },
    { name: '手机分期 · 第 4 期', phase: '本期待扣', tone: 'active', amount: '¥620.00', meta: ['招商信用卡', '自动扣款'], due: '2026-10-18', dueNote: '还剩 23 天', dueTone: 'warn' },
    { name: '手机分期 · 后续 8 期', phase: '未开始', amount: '¥4,960.00', meta: '每月 18 日 · 直到 2027-06-18' },
    { name: '借给老王', phase: '已逾期', tone: 'danger', amount: '¥500.00', due: '2026-09-13', dueNote: '已逾期 12 天', dueTone: 'danger' },
    { name: '洗衣机整机保修', phase: '临近到期', tone: 'warn', amount: '小天鹅 TG100', meta: '阳台 · 发票已归档', due: '2026-10-13', dueNote: '还剩 18 天', dueTone: 'warn' },
  ];
}

/** 真机夹具要的那一份标记（含空态那一块，两档几何要连它一起量）。 */
function fixtureHtml() {
  return renderStatusRows({
    heading: '在途的事', count: '共 5 笔',
    rows: sampleRows(),
    foot: ['在途 ¥6,080.00', '最近一笔 10-18'],
  }) + renderStatusRows({ heading: '已结清', rows: [], absentLine: '这个月没有结清的事' });
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('status-row ① 渲染契约', () => {
  it('结构：头（小标题 ＋ 计数）＋ 台账逐行 ＋ 脚注，逐槽一位', () => {
    const html = renderStatusRows({
      heading: '在途的事', count: '共 2 笔', rows: sampleRows().slice(0, 2), foot: ['在途 ¥2,480.00'],
    });
    assert.ok(html.startsWith('<div class="' + STATUS_ROW_CLASS + '">'), '根用类名根打头：' + html.slice(0, 80));
    assert.ok(html.includes(slot('heading').slice(1) + '">在途的事<'), '小标题上屏');
    assert.ok(html.includes(slot('count').slice(1) + '">共 2 笔<'), '计数在头右侧');
    assert.equal((html.match(new RegExp('class="' + statusRowSlot('item') + ' ', 'g')) || []).length, 2, '两行');
    assert.ok(html.includes(slot('name').slice(1) + '">手机分期 · 已还 3 期<'), '名称');
    assert.ok(html.includes(slot('badge').slice(1) + ' is-ok">已完成<'), '阶段徽标带档位类');
    assert.ok(html.includes(slot('amount').slice(1) + '">¥1,860.00<small>元</small>'), '金额 ＋ 单位');
    assert.ok(html.includes(slot('due').slice(1) + ' is-warn">2026-10-18<em>还剩 23 天</em>'), '到期日 ＋ 注脚');
    assert.ok(html.includes(slot('foot').slice(1) + '"><span class="' + statusRowSlot('foot') + '">在途 ¥2,480.00</span>'),
      '脚注逐段一枚');
    const rail = (html.match(new RegExp('class="' + statusRowSlot('rail') + '" aria-hidden="true"', 'g')) || []).length;
    assert.equal(rail, 2, '每行一条左轨（纯装饰 ⇒ aria-hidden）');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('五档档位：档名进类、形状差异归样式段（标记只带 is-<档>）', () => {
    const html = renderStatusRows({ rows: STATUS_ROW_TONES.map((tone) => ({ name: 'n-' + tone, phase: 'p', tone })) });
    for (const tone of STATUS_ROW_TONES) {
      assert.ok(html.includes(' is-' + tone + '"'), '档位类落上：' + tone);
    }
    assert.deepEqual([...STATUS_ROW_TONES], ['neutral', 'active', 'ok', 'warn', 'danger']);
    assert.deepEqual([...STATUS_ROW_FORMS], ['ledger'], '形态闭集只有形态 A「单行台账」');
    for (const name of ['head', 'heading', 'count', 'list', 'item', 'rail', 'node', 'body', 'line1', 'name',
      'badge', 'amount', 'line2', 'meta', 'due', 'absent', 'foot']) {
      assert.ok(STATUS_ROW_SLOTS.includes(name), '槽位闭集里有：' + name);
    }
  });

  it('缺的槽不留空位：只给 name／phase 时，金额／第二行／到期日／脚注一个字都不出', () => {
    const html = renderStatusRows({ rows: [{ name: '只有名称', phase: '待办' }] });
    for (const name of ['amount', 'line2', 'meta', 'due', 'foot', 'head', 'absent']) {
      assert.equal(html.includes(statusRowSlot(name)), false, '不该出这一槽：' + name);
    }
    assert.ok(html.includes(statusRowSlot('item')), '行本体照出');
  });

  it('空台账：不出一个字；给了空态那一句才出头与空态（它是"没什么"，不是一行）', () => {
    assert.equal(renderStatusRows({ rows: [] }), '');
    assert.equal(renderStatusRows({ rows: [], foot: ['合计 0'] }), '', '没行就没账：脚注也留不住');
    const empty = renderStatusRows({ rows: [], heading: '在途', absentLine: '没有在途的事' });
    assert.equal((empty.match(new RegExp(statusRowSlot('item'), 'g')) || []).length, 0, '空态不得被算成一行');
    assert.ok(empty.includes(slot('absent').slice(1) + '">没有在途的事<'));
  });

  it('转义面：名称／阶段／金额／补充／到期日／小标题／计数／脚注逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderStatusRows({
      heading: evil, count: evil, foot: [evil],
      rows: [{ name: evil, phase: evil, amount: evil, amountUnit: evil, meta: [evil], due: evil, dueNote: evil }],
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.ok(!html.includes('data-'), '本件不带机器属性（静态件的状态就在类名与文本里）');
  });

  it('缺值写法写在一处：`—`（缺值不许写 0、不许留空）', () => {
    assert.equal(STATUS_ROW_MISSING, '—');
    const html = renderStatusRows({ rows: [{ name: '没到期日的', phase: '未开始', amount: STATUS_ROW_MISSING }] });
    assert.ok(html.includes('>' + STATUS_ROW_MISSING + '<'), '缺值由调用方按这条口径给串');
  });

  it('入参违规一律拒（不静默降级）：逐条断 BlocksError', () => {
    const throws = (fn) => {
      try { fn(); } catch (e) { return e.name === 'BlocksError'; }
      return false;
    };
    assert.equal(throws(() => renderStatusRows(null)), true, '入参不是对象');
    assert.equal(throws(() => renderStatusRows([])), true, '入参是数组');
    assert.equal(throws(() => renderStatusRows({ rows: null })), true, 'rows 不是数组');
    assert.equal(throws(() => renderStatusRows({ rows: [{ phase: 'p' }] })), true, 'name 必填');
    assert.equal(throws(() => renderStatusRows({ rows: [{ name: 'n' }] })), true, 'phase 必填（状态必须带字）');
    assert.equal(throws(() => renderStatusRows({ rows: [{ name: '', phase: 'p' }] })), true, 'name 不许空串');
    assert.equal(throws(() => renderStatusRows({ rows: [{ name: 'n', phase: 'p', tone: 'good' }] })), true, '档位闭集外');
    assert.equal(throws(() => renderStatusRows({ rows: [{ name: 'n', phase: 'p', dueTone: 1 }] })), true, 'dueTone 闭集外');
    assert.equal(throws(() => renderStatusRows({ rows: [{ name: 'n', phase: 'p', dueNote: '还剩 3 天' }] })), true, 'dueNote 必须有 due');
    assert.equal(throws(() => renderStatusRows({ rows: [{ name: 'n', phase: 'p', meta: 1 }] })), true, 'meta 不是串也不是数组');
    assert.equal(throws(() => renderStatusRows({ rows: [{ name: 'n', phase: 'p', meta: [''] }] })), true, 'meta 数组里的空串');
    assert.equal(throws(() => renderStatusRows({ rows: [{ name: 'n', phase: 'p', amount: 1 }] })), true, 'amount 不是串');
    assert.equal(throws(() => renderStatusRows({ rows: [], form: 'board' })), true, '形态闭集外');
    assert.equal(throws(() => renderStatusRows({ rows: [], foot: [''] })), true, 'foot 数组里的空串');
    assert.equal(throws(() => renderStatusRows({ rows: [], extraClass: 'a>b' })), true, '附加类名不合法');
    assert.equal(throws(() => renderStatusRows({ rows: [], count: 3 })), true, 'count 不是串');
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

/** 剥掉 CSS 注释再断规则（注释会**提到**类名，拿裸串断会把"解释"当"规则"）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('status-row ② 样式与零 DOM 纪律', () => {
  it('样式段非空、全部规则 scope 在 `.ilife-page-ui` 下、且只读自己的类名', () => {
    const css = stripComments(statusRowCss());
    assert.ok(css.trim() !== '', '样式段必须非空');
    const selectors = (css.match(/^[^@\s][^{\n]*\{/gm) || []);
    assert.ok(selectors.length >= 20, '选择器条数太少：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '必须 scope 在 .ilife-page-ui：' + sel.trim());
      assert.ok(sel.includes(ROOT_SEL), '只许读自己的类名根：' + sel.trim());
    }
    assert.ok(css.includes('@container'), '窄档必须走容器查询');
    assert.equal(/@media[^{]*max-width/.test(css), false, '媒体查询不许判宽度（只判设备能力）');
    assert.ok(css.includes(String(STATUS_ROW_NARROW_MAX_PX) + 'px'), '窄档断点取常量');
    assert.ok(css.includes(String(STATUS_ROW_ITEM_MIN_HEIGHT_PX) + 'px'), '行高下限取常量（44）');
  });

  it('不写 `:root`／`!important`／不新造 token／不手写 var(--ilife-…)：只经 skinVar 读', () => {
    const css = stripComments(statusRowCss());
    assert.equal(css.includes(':root'), false, '不得写 :root');
    assert.equal(css.includes('!important'), false, '不得用 !important');
    assert.deepEqual(css.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    /* 源码面：`style.ts` 里不许出现手写的 `var(--ilife-…)`（兜底链只许住在 skin/contract.ts）。 */
    const src = readFileSync(join(PKG, 'src', 'components', 'status-row', 'style.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    assert.deepEqual(src.match(/var\(\s*--ilife-/g) || [], [], '手写了 var(--ilife-…)：请走 skinVar()');
    /* 产物面：出现 `var(--ilife-…)` 的每一处都必须是 skinVar 产出的**带兜底链**的串。 */
    const produced = [...css.matchAll(/var\(--ilife-[a-z0-9-]+([^)]*)/g)].map((m) => m[1]);
    assert.ok(produced.length >= 8, '读的 token 太少，疑似硬编码：' + produced.length);
    for (const rest of produced) assert.ok(rest.startsWith(', '), 'skinVar 之外的字面 `var(--ilife-…)`：' + rest);
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => skinTokenVar(k)));
    const used = new Set([...css.matchAll(/var\((--ilife-[a-z0-9-]+),/g)].map((m) => m[1]));
    for (const name of used) assert.ok(known.has(name), '名单外的 token：' + name);
  });

  it('纯静态件：零 transition／animation／cursor:pointer（不许装作能点）', () => {
    const css = stripComments(statusRowCss());
    assert.equal(/transition\s*:/.test(css), false, '本件零动效');
    assert.equal(/animation\s*:/.test(css), false, '本件零动画');
    assert.equal(/cursor\s*:\s*pointer/.test(css), false, '本件没有可点元素，不许给手型');
    assert.equal(/transitionend/.test(css), false, '不许依赖 transitionend');
  });

  it('`dist/components/status-row/**` 的代码零 document.／window.／navigator.（DOM 只在产出文本里）', () => {
    const dir = join(PKG, 'dist', 'components', 'status-row');
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

describe('status-row ③ 加法式（不碰公共选择器、渲染确定）', () => {
  it('标记只带自己的类名（顶多加档位修饰类 is-<档> 与一个 extraClass）', () => {
    const html = renderStatusRows({ rows: [{ name: 'n', phase: 'p' }], extraClass: 'mine-extra' });
    const modifiers = new Set(STATUS_ROW_TONES.map((tone) => 'is-' + tone));
    for (const cls of [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/))) {
      assert.ok(cls === 'mine-extra' || cls.startsWith(STATUS_ROW_CLASS) || modifiers.has(cls),
        '混进了别人的类名：' + cls);
    }
  });

  it('同样的入参渲染两次逐字节相同（纯函数、无全局状态）', () => {
    const input = { heading: '在途', rows: sampleRows(), foot: ['合计'] };
    assert.equal(renderStatusRows(input), renderStatusRows(input));
  });
});

/* ── ④ 真机两档：几何 ＋ 静态件的状态矩阵读数 ────────────────────────── */

describe('status-row ④ 真机（无头 Chrome）', () => {
  it('390／1280 两档零横向溢出、关键语义不截断、行高 ≥44、零动效零可点元素', async (t) => {
    const p = await startFamilyPage({ css: statusRowCss(), bodyHtml: fixtureHtml() });
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何与交互判据需真浏览器');
    try {
      const keys = [slot('amount'), slot('due'), slot('badge'), slot('name'), slot('count')];
      for (const w of [390, 1280]) {
        await p.setWidth(w);
        const m = await p.metrics({ roots: [ROOT_SEL], keys });
        assert.equal(m.stage.w, w, '舞台宽就是这一档：' + w);
        assert.ok(m.stage.sw <= m.stage.cw + 1, w + ' 档舞台横向溢出：' + m.stage.sw + ' > ' + m.stage.cw);
        assert.ok(m.page.sw <= m.page.cw + 1, w + ' 档页面横向溢出：' + m.page.sw + ' > ' + m.page.cw);
        assert.equal(m.roots.length, 2, w + ' 档两个台账都在');
        for (const r of m.roots) {
          assert.ok(r.sw <= r.cw + 1, w + ' 档件根横向溢出：' + r.sw + ' > ' + r.cw);
        }
        for (const k of m.keys) {
          assert.ok(k.n > 0, w + ' 档关键语义没扫到：' + k.selector);
          for (const it of k.items) {
            assert.ok(it.sw <= it.cw + 1, w + ' 档 ' + k.selector + ' 被截断：' + it.sw + ' > ' + it.cw
              + '（' + it.text + '）');
            assert.ok(it.right <= it.stageRight + 1, w + ' 档 ' + k.selector + ' 顶出舞台右边界：'
              + it.right + ' > ' + it.stageRight);
          }
        }
        /* 触控地板：行高 ≥44（本件没有可点元素，但行高先钉在这个地板上）。 */
        const rows = await p.ev('(function(){return [].slice.call(document.querySelectorAll('
          + JSON.stringify(slot('item')) + ')).map(function(el){return Math.round(el.getBoundingClientRect().height);});}())');
        assert.equal(rows.length, 5, w + ' 档五行都在');
        for (const h of rows) assert.ok(h >= STATUS_ROW_ITEM_MIN_HEIGHT_PX, w + ' 档行高 ' + h + ' 小于 44');
      }
      /* 档位样式**真的落地**（真机读法：形状差异不是写在 CSS 里就算数）：
         已完成那一档的点填成实心、临近那档是方角、已过期那档是双线框的菱形。 */
      const toneShape = await p.ev('(function(){'
        + 'var rows=document.querySelectorAll(' + JSON.stringify(slot('item')) + ');'
        + 'var pick=function(tone){for (var i=0;i<rows.length;i+=1){ if (rows[i].className.indexOf("is-"+tone)>=0){'
        + ' return getComputedStyle(rows[i].querySelector(' + JSON.stringify('.' + statusRowSlot('node')) + ')); } } return null;};'
        + 'var ok=pick("ok"), warn=pick("warn"), danger=pick("danger"), base=pick("neutral");'
        + 'return {okBg:ok.backgroundColor, baseBg:base.backgroundColor, warnRadius:warn.borderRadius,'
        + ' dangerTransform:danger.transform, dangerStyle:danger.borderTopStyle};}())');
      assert.notEqual(toneShape.okBg, toneShape.baseBg, '已完成那一档的点必须填成实心（形状/填充真的生效）');
      assert.equal(toneShape.warnRadius, '2px', '临近那一档的点是方角（圆点／方点靠形状分）');
      assert.notEqual(toneShape.dangerTransform, 'none', '已过期那一档的点是菱形（transform 生效）');
      assert.equal(toneShape.dangerStyle, 'double', '已过期那一档的点是双线框');
      /* 静态件的"状态矩阵"读数：没有可点元素、没有半路的动画（减动效下就更没有）。 */
      await p.emulate({ reducedMotion: true });
      assert.equal(await p.ev('document.querySelectorAll(' + JSON.stringify(ROOT_SEL
        + ' a,' + ROOT_SEL + ' button,' + ROOT_SEL + ' input,' + ROOT_SEL + ' select,'
        + ROOT_SEL + ' textarea,' + ROOT_SEL + ' [tabindex]') + ').length'), 0, '本件不许有可点元素（假按钮）');
      assert.equal(await p.runningAnimations(), 0, '不许有东西卡在半路');
      assert.deepEqual(await p.errors(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
