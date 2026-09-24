// calendar-month（月历格）· 判据件。
//
// 断言对象是**本件自己的那条出口**：`dist/components/calendar-month/index.js`
// （层规：组件层不进冻结面、不从根出口；本盘 `src/components/index.ts` 由**别的席**加行，
//  所以本件判据直连自己的产物，不依赖那一行有没有落）。
//
// 四组（工艺书 §6）：
//   ① 渲染契约：结构（类名与槽位）＋ 转义 ＋ **全部**非法入参分支（逐个断 `BlocksError`）
//      ＋ 本件自己的两条不变量（格盘排满七列、缺值不写 0）
//   ② 样式与零 DOM 纪律：scope、禁入 token、零 `:root`／`!important`、源码不手写 `var(--ilife-…)`
//   ③ 加法式：本件只读自己的类名（不碰公共选择器）；不挂样式时别人产物逐字节不变
//   ④ 两档几何（390／1280）：真机量（headless Chrome ＋ CDP）＋ 一条静态几何判据兜底
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CALENDAR_MONTH_CLASS,
  CALENDAR_MONTH_FORMS,
  CALENDAR_MONTH_LEVELS,
  CALENDAR_MONTH_LEVEL_HEIGHTS_PX,
  CALENDAR_MONTH_MISSING,
  CALENDAR_MONTH_NARROW_PX,
  CALENDAR_MONTH_TODAY_MARK,
  CALENDAR_MONTH_WEEK_LENGTH,
  calendarMonthCss,
  calendarMonthSlot,
  renderCalendarMonth,
} from '../dist/components/calendar-month/index.js';
import { skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { CSS_VAR_TOKENS } from '../dist/index.js';
import { openMeasurePage } from './time-group-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT = '.' + 'ilife-page-ui';
const S = (slot) => calendarMonthSlot(slot);

/** 剥掉 CSS 注释再断规则（注释会**提到**类名，拿裸串断会把"解释"当"规则"）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** 抛错的入参（`BlocksError`：组件层与区块层共用同一个错误名）。 */
const throwsBlocks = (fn) => {
  try { fn(); } catch (e) { return e.name === 'BlocksError'; }
  return false;
};

/** 样式段里的选择器（跳过 `@` 开头的 at-rule 行；`@container` 里的规则照样逐条查）。 */
function selectorsOf(css) {
  const out = [];
  for (const m of stripComments(css).matchAll(/([^{}]+)\{/g)) {
    const sel = m[1].trim();
    if (sel === '' || sel.startsWith('@')) continue;
    out.push(sel);
  }
  return out;
}

/** 选择器里的类名 token。 */
const classTokens = (sel) => [...sel.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((m) => m[1]);

/** 本件自己的类名（含状态类 `is-*`）：别人的类名一个都不许出现在本件的选择器与标记里。 */
const isOwnClass = (token, root) => token === 'ilife-page-ui' || token.startsWith(root) || /^is-[a-z0-9-]+$/.test(token);

/* ── 夹具：2026 年 5 月（周一起首列，4 个前导空位 ＋ 31 天 ＝ 35 格） ───────── */
const DAYS = [
  128, 46, 320, 0, 62, 880, 55, 210, 0, 1240,
  38, 156, 470, 92, 74, 265, 1580, 0, 88, 133,
  640, 44, 205, 2480, 61, 97, 350, 128, 1050, 72,
  410,
];
const LEVEL_OF = (v) => (v === 0 ? 0 : v <= 100 ? 1 : v <= 300 ? 2 : v <= 900 ? 3 : 4);
const money = (v) => (v === 0 ? '\u2014' : v >= 1000 ? '\u00a5' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '\u00a5' + v);

function mayCells() {
  const cells = [null, null, null, null];
  for (let i = 0; i < DAYS.length; i += 1) {
    const v = DAYS[i];
    cells.push({
      day: String(i + 1),
      value: v === 0 ? null : money(v),
      level: LEVEL_OF(v),
      today: i + 1 === 14,
    });
  }
  return cells;
}

function demoInput() {
  return {
    title: '2026 年 5 月',
    use: '记账 · 每日支出',
    summary: { label: '本月合计', value: '\u00a512,340' },
    cells: mayCells(),
    legend: [
      { level: 0, label: '无记录' }, { level: 1, label: '≤\u00a5100' },
      { level: 2, label: '≤\u00a5300' }, { level: 3, label: '≤\u00a5900' }, { level: 4, label: '>\u00a5900' },
    ],
    note: '今天 14 日 · 3 笔 · \u00a592',
  };
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('calendar-month ① 渲染契约', () => {
  it('根：一个类名根 ＋ `is-<形态>`；七枚表头；格盘按输入逐格出', () => {
    const html = renderCalendarMonth(demoInput());
    assert.match(html, /^<div class="ilife-block-calendar-month is-grid">/);
    assert.equal((html.match(new RegExp('class="' + S('wk') + '"', 'g')) || []).length, 1, '表头一排');
    assert.equal((html.match(new RegExp('class="' + S('wd') + '"', 'g')) || []).length, CALENDAR_MONTH_WEEK_LENGTH, '七枚星期');
    assert.equal((html.match(new RegExp('class="' + S('c') + ' is-l', 'g')) || []).length, 31, '31 天');
    assert.equal((html.match(new RegExp(S('c') + ' is-blank', 'g')) || []).length, 4, '4 个前导空位');
  });

  it('五槽齐全：标题／用途／合计／图例／脚注，逐槽到位', () => {
    const html = renderCalendarMonth(demoInput());
    assert.match(html, new RegExp('class="' + S('title') + '">2026 年 5 月<'));
    assert.match(html, new RegExp('class="' + S('use') + '">记账 · 每日支出<'));
    assert.match(html, new RegExp('class="' + S('sum-label') + '">本月合计<'));
    assert.match(html, new RegExp('class="' + S('sum-value') + '">\u00a512,340<'));
    assert.equal((html.match(new RegExp('class="' + S('sw') + ' ', 'g')) || []).length, 5, '图例五档');
    assert.match(html, new RegExp('class="' + S('note') + '">今天 14 日'));
  });

  it('缺槽就不出那一槽（不留空位、不拿占位符顶替）', () => {
    const html = renderCalendarMonth({ title: 'T', cells: mayCells() });
    for (const slot of ['use', 'summary', 'legend', 'note']) {
      assert.equal(html.includes(S(slot)), false, slot + ' 不该出');
    }
  });

  it('今天：墨圈类 ＋「今」字两路都在（不只靠颜色）', () => {
    const html = renderCalendarMonth(demoInput());
    assert.equal((html.match(/is-today/g) || []).length, 1);
    assert.match(html, new RegExp('class="' + S('today-mark') + '">' + CALENDAR_MONTH_TODAY_MARK + '<'));
    assert.match(stripComments(calendarMonthCss()), new RegExp('\\.is-today \\{[^}]*outline: 2px solid'));
  });

  it('**缺值不写 0**：`value: null` ⇒ 格内 `—` ＋ 0 档；0 档的柱高是 0', () => {
    const html = renderCalendarMonth(demoInput());
    assert.equal((html.match(/is-missing/g) || []).length, 3, 'DAYS 里有 3 天是 0（＝无记录）');
    assert.match(html, new RegExp('is-missing"><span class="' + S('d') + '">4<'));
    assert.match(html, new RegExp('class="' + S('v') + '">' + CALENDAR_MONTH_MISSING + '<'));
    assert.equal(CALENDAR_MONTH_MISSING, '\u2014');
    assert.equal(CALENDAR_MONTH_LEVEL_HEIGHTS_PX[0], 0, '0 档不画柱');
    assert.equal(CALENDAR_MONTH_LEVEL_HEIGHTS_PX[4], 10, '4 档填满柱槽');
    // 缺值格的档位被压到 0：即便调用方给了 4，也不出 `is-l4`
    const forced = renderCalendarMonth({
      title: 'T', cells: [ { day: '1', value: null, level: 4 }, null, null, null, null, null, null ],
    });
    assert.match(forced, /is-l0 is-missing/);
    assert.equal(forced.includes('is-l4'), false);
  });

  it('转义：五个字符进实体，不进标记', () => {
    const html = renderCalendarMonth({
      title: '"><script>alert(1)</script>', use: 'a<b&c', note: '"\'',
      summary: { label: '<b>', value: '&' },
      legend: [{ level: 1, label: '<i>' }],
      cells: [{ day: '<u>', value: '"><x>' }, null, null, null, null, null, null],
    });
    assert.equal(/<script/i.test(html), false);
    assert.ok(!html.includes('<b>') && !html.includes('<i>') && !html.includes('<u>'));
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&amp;/);
    assert.match(html, /&quot;/);
  });

  it('边界：闭集与**全部**非法入参分支逐个 `BlocksError`', () => {
    assert.deepEqual([...CALENDAR_MONTH_FORMS], ['grid']);
    assert.deepEqual([...CALENDAR_MONTH_LEVELS], [0, 1, 2, 3, 4]);

    // 根入参
    assert.equal(throwsBlocks(() => renderCalendarMonth(undefined)), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth(null)), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth([])), true);
    // 形态闭集
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), form: 'dots' })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), form: 'B' })), true);
    // 标题
    assert.equal(throwsBlocks(() => renderCalendarMonth({ cells: mayCells() })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: '', cells: mayCells() })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 1, cells: mayCells() })), true);
    // 格盘
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T' })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: 'x' })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: [] })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: [null, null, null, null, null, null] })), true, '6 格不是 7 的倍数');
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: new Array(43).fill(null) })), true, '43 格超过 6 行');
    // 单格
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: [{ value: '1' }, null, null, null, null, null, null] })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: [{ day: '', value: '1' }, null, null, null, null, null, null] })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: [{ day: '1' }, null, null, null, null, null, null] })), true, 'value 必填（缺值要给 null）');
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: [{ day: '1', value: '' }, null, null, null, null, null, null] })), true, '空串不是缺值');
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: [{ day: '1', value: 0 }, null, null, null, null, null, null] })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: [{ day: '1', value: '1', level: 5 }, null, null, null, null, null, null] })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: [{ day: '1', value: '1', level: 1.5 }, null, null, null, null, null, null] })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: [{ day: '1', value: '1', level: '1' }, null, null, null, null, null, null] })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: ['x', null, null, null, null, null, null] })), true);
    // 表头
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), weekdays: ['一'] })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), weekdays: [1, 2, 3, 4, 5, 6, 7] })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), weekdays: '一二三四五六日' })), true);
    // 合计／图例／脚注／附加类名
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), summary: { label: 'x' } })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), summary: { label: '', value: '1' } })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), summary: 'x' })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), legend: 'x' })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), legend: [{ level: 9, label: 'x' }] })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), legend: [{ level: 1, label: '' }] })), true);
    assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), note: 7 })), true);
    for (const bad of ['a"b', '.x', 'a b!']) {
      assert.equal(throwsBlocks(() => renderCalendarMonth({ title: 'T', cells: mayCells(), extraClass: bad })), true, '拒：' + bad);
    }
    // 合法的一格：附类名照收、表头可换
    const ok = renderCalendarMonth({ title: 'T', cells: mayCells(), extraClass: 'ok-class other', weekdays: ['日', '一', '二', '三', '四', '五', '六'] });
    assert.match(ok, /^<div class="ilife-block-calendar-month is-grid ok-class other">/);
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('calendar-month ② 样式与零 DOM 纪律', () => {
  const css = stripComments(calendarMonthCss());

  it('样式段非空，且**每一条**规则 scope 在 `.ilife-page-ui` 之下（不开本配方的页零命中）', () => {
    assert.ok(css.trim() !== '');
    const sels = selectorsOf(calendarMonthCss());
    assert.ok(sels.length >= 20, '选择器条数太少：' + String(sels.length));
    for (const sel of sels) {
      assert.ok(sel.includes(ROOT), '选择器不在 scope 之下：' + sel);
      /* 一条规则里的**每一段**（逗号分隔）都要以 scope 打头，且**恰好带一次** scope：
         两段各自带一次是合法的（`.a, .b`），同一段里出现两次则永不命中（页里不会有嵌套 scope）。 */
      for (const one of sel.split(',')) {
        assert.ok(one.trimStart().startsWith(ROOT), 'scope 必须是这一段选择器的**第一个**复合选择器：' + one);
        assert.equal((one.match(/\.ilife-page-ui/g) || []).length, 1,
          'scope 在同一段里出现两次（`.ilife-page-ui … .ilife-page-ui …` 的规则永远命中不到）：' + one);
      }
    }
  });

  it('零 `:root`、零 `!important`、不新造 token 名、不重定义那 11 个冻结 token', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    const decls = css.match(/--[a-z0-9-]+\s*:/g) || [];
    assert.deepEqual(decls, [], '不得定义自定义属性：' + decls.join(' '));
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('源码级：`style.ts` 里不手写 `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）', () => {
    const src = readFileSync(join(PKG, 'src', 'components', 'calendar-month', 'style.ts'), 'utf8');
    assert.equal(/var\(\s*--ilife-/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), false);
  });

  it('零 DOM：`dist/components/calendar-month/**` 剥掉字面量与注释后不出现 DOM 名', () => {
    const dir = join(PKG, 'dist', 'components', 'calendar-month');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
    assert.ok(files.length >= 5, '至少应扫到本件的编译产物');
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

describe('calendar-month ③ 加法式（不挂号＝零命中）', () => {
  it('本件只读自己的类名：所有选择器的类名 token 都在 {page-ui, 本件类名, is-*} 里', () => {
    const alien = [];
    for (const sel of selectorsOf(calendarMonthCss())) {
      for (const token of classTokens(sel)) if (!isOwnClass(token, CALENDAR_MONTH_CLASS)) alien.push(token);
    }
    assert.deepEqual(alien, [], '碰了别人的类名：' + alien.join('、'));
  });

  it('标记里也只有自己的类名（别人产物逐字节不变）', () => {
    const html = renderCalendarMonth(demoInput());
    const alien = [];
    for (const m of html.matchAll(/class="([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/)) {
        if (token === '' || isOwnClass(token, CALENDAR_MONTH_CLASS)) continue;
        alien.push(token);
      }
    }
    assert.deepEqual(alien, [], '标记里混进了别人的类名：' + alien.join('、'));
  });

  it('没挂本件样式的页面：产物逐字节相同，且不含本件一个字', () => {
    const a = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const b = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(a, b, '两次渲染必须逐字节相同');
    assert.equal(a.includes(CALENDAR_MONTH_CLASS), false, '不挂本件时页产物里不该有它的类名');
    assert.equal(a.includes('-today-mark'), false);
  });
});

/* ── ④ 两档几何（390／1280） ────────────────────────────────────────── */

/** 静态几何判据（起不来浏览器时也守得住的那些**常量与写法**）。 */
describe('calendar-month ④a 几何契约（静态判据）', () => {
  const css = stripComments(calendarMonthCss());

  it('七列是**份数**：`repeat(7, minmax(0, 1fr))`（总宽恒等于容器宽，390 档不横滑）', () => {
    assert.match(css, /grid-template-columns: repeat\(7, minmax\(0, 1fr\)\)/);
    assert.equal(CALENDAR_MONTH_WEEK_LENGTH, 7);
  });

  it('读数位换行不截断：`overflow-wrap:anywhere` 在、`…` 不在', () => {
    const valRule = new RegExp(S('v') + ' \\{([^}]*)\\}').exec(css);
    assert.ok(valRule !== null, '读数位规则必须在');
    assert.match(valRule[1], /overflow-wrap: anywhere/);
    assert.equal(valRule[1].includes('text-overflow'), false, '读数位不许写 text-overflow');
    assert.equal(css.includes('line-clamp'), false);
  });

  it('窄档走**容器**查询（不是视口）＋ 字号随容器收一档', () => {
    assert.ok(css.includes('@container (max-width: ' + String(CALENDAR_MONTH_NARROW_PX) + 'px)'));
    assert.equal(css.includes('@media (max-width'), false, '不许用视口宽判宽度');
    assert.match(css, /font-size: min\(10\.5px, 2\.8cqi\)/, '读数位字号跟着**本件宽度**收');
  });

  it('格与柱的几何读数写在一处（样式段与判据同源）', () => {
    assert.equal(Object.keys(CALENDAR_MONTH_LEVEL_HEIGHTS_PX).length, 5);
    for (const level of CALENDAR_MONTH_LEVELS) {
      assert.ok(css.includes('.is-l' + String(level) + ' '), '缺 is-l' + String(level) + ' 规则');
    }
  });
});

describe('calendar-month ④b 真机两档（headless Chrome ＋ CDP）', () => {
  const pageFor = () => '<div class="ilife-page-ui ilife-skin-paper">' + renderCalendarMonth(demoInput()) + '</div>';

  it('390 与 1280：零横向溢出 ＋ 关键读数不截断 ＋ 七列一行', async (t) => {
    const p = await openMeasurePage({
      css: skinCss() + '\n' + calendarMonthCss(),
      frames: [{ name: 'w390', width: 390, html: pageFor() }, { name: 'w1280', width: 1280, html: pageFor() }],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何判据需真浏览器');
    try {
      for (const name of ['w390', 'w1280']) {
        const g = await p.measure(name, { keySelector: '.' + S('v') });
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
        // 七列一行：每一行恰好 7 格，且都在框内
        const rows = await p.ev('(function(){var f=document.querySelector("[data-frame=\\"" + ' + JSON.stringify(name) + ' + "\\"]");'
          + 'var cells=[].slice.call(f.querySelectorAll(".' + S('c') + '"));'
          + 'var tops={};cells.forEach(function(c){var t=Math.round(c.getBoundingClientRect().top);tops[t]=(tops[t]||0)+1;});'
          + 'return Object.keys(tops).map(function(k){return tops[k];});}())');
        assert.equal(rows.length, 5, name + '：35 格排成 5 行');
        for (const n of rows) assert.equal(n, 7, name + '：每行恰好 7 格');
      }
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });

  it('读数位字号随**本件宽度**收（`min(10.5px, 2.8cqi)`）：容器窄过约 375px 才真的收', async (t) => {
    const p = await openMeasurePage({
      css: skinCss() + '\n' + calendarMonthCss(),
      frames: [{ name: 'w300', width: 300, html: pageFor() }, { name: 'w390', width: 390, html: pageFor() },
        { name: 'w1280', width: 1280, html: pageFor() }],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      const size = (name) => p.ev('(function(){var f=document.querySelector("[data-frame=\\"" + ' + JSON.stringify(name) + ' + "\\"]");'
        + 'return parseFloat(getComputedStyle(f.querySelector(".' + S('v') + '")).fontSize);}())');
      const tiny = await size('w300');
      const at390 = await size('w390');
      const wide = await size('w1280');
      assert.ok(wide <= 10.5, '宽档不超过上限 10.5px：' + String(wide));
      assert.ok(at390 <= wide, '390 档不得大于宽档：' + String(at390) + ' vs ' + String(wide));
      assert.ok(tiny < wide, '300 档必须真的收一档（cqi 生效）：' + String(tiny) + ' vs ' + String(wide));
    } finally { p.close(); }
  });
});
