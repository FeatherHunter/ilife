/** heat-grid（热力格 · 形态 A「行时段 × 列星期」）· 契约测试。
 *
 * 覆盖四组判据：
 *  ① **渲染契约**：结构（类名与槽位）／**色键与实际着色同一份真值**／峰值符号／
 *     行列对齐（7 列）／转义面／**全部**非法入参分支（每个都断 `BlocksError`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下（含 `@container`
 *     里的那几条）、零 `:root`／`!important`／零新 token、零手写色值、零手写 `var(--ilife-…)`、
 *     列宽走 `minmax(0,1fr)`（不靠横滑）；
 *  ③ **加法式**：本件只读自己的类名；不启用它的页面零命中、逐字节不变；
 *  ④ **两档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 390 与 1280 下零横向溢出、
 *     **七列全在**（最后一列不跑出容器）、零 `overflow-x`（不藏横滑）、色键与行标签零截断。
 *
 * 期望值一律从组件自己的常量派生（`HEAT_GRID_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HEAT_GRID_CLASS,
  HEAT_GRID_COLUMNS,
  HEAT_GRID_FORMS,
  HEAT_GRID_LEVEL_COUNT,
  HEAT_GRID_LEVEL_STOPS,
  HEAT_GRID_MISSING,
  HEAT_GRID_PEAK_MARK,
  HEAT_GRID_ROW_PX,
  HEAT_GRID_WEEKDAYS,
  heatGridCss,
  heatGridLevel,
  heatGridSlot,
  renderHeatGrid,
} from '../dist/components/heat-grid/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { skinClass, skinCss, BROADSHEET_VALUES, NEUTRAL_VALUES, PAPER_VALUES } from '../dist/components/skin/index.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { startShapesPage } from './shapes-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/** 三套皮肤的取值表（期望色**从表里读**，判据里不抄色字面量）。 */
const SKIN_VALUES = { paper: PAPER_VALUES, broadsheet: BROADSHEET_VALUES, neutral: NEUTRAL_VALUES };

/** 取值表里的 `#rrggbb` → 浏览器 `getComputedStyle` 报出来的 `rgb(r, g, b)` 串。 */
const toRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return 'rgb(' + [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(', ') + ')';
};

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

/** 样式段里的选择器（含 `@container` 里缩进的那几条）。 */
const selectorsOf = (css) => (stripComments(css).match(/^[ \t]*([^@\s{}][^{}\n]*)\{/gm) || [])
  .map((one) => one.replace(/\{$/, '').trim())
  .filter((one) => one !== '');

/** 一周作息（六行 × 七天；周三晚是峰值）。 */
const WEEK = [
  { label: '00–04', values: [0, 0, 0, 0, 0, 2, 1] },
  { label: '04–08', values: [1, 1, 0, 1, 1, 0, 0] },
  { label: '08–12', values: [3, 4, 4, 3, 3, 1, 1] },
  { label: '12–16', values: [2, 2, 3, 2, 2, 3, 3] },
  { label: '16–20', values: [4, 3, 5, 4, 4, 5, 4] },
  { label: '20–24', values: [2, 2, 3, 2, 3, 4, 2] },
];

/** 一格（含 `is-l<n>` 与 `is-peak`）在标记里的出现次数。 */
const countOf = (html, needle) => (html.match(new RegExp(needle, 'g')) || []).length;

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('heat-grid ① 渲染契约', () => {
  const base = { title: '作息 · 一周', stamp: '3 月 9–15 日', unit: '条', rows: WEEK };

  it('形态 A：七枚列头 ＋ 逐行「行标签 ＋ 七格」，格数 ＝ 行 × 列', () => {
    const html = renderHeatGrid({ ...base, facts: [{ label: '一周合计', value: '90 条', sub: '六个时段相加' }] });
    assert.match(html, new RegExp('^<div class="' + HEAT_GRID_CLASS + ' is-matrix">'));
    assert.equal(countOf(html, 'class="[^"]*-col-head"'), HEAT_GRID_COLUMNS, '恰好七枚列头');
    for (const day of HEAT_GRID_WEEKDAYS) assert.ok(html.includes('>' + day + '<'), '列头缺：' + day);
    assert.equal(countOf(html, 'class="[^"]*-row-label"'), WEEK.length, '逐行一枚行标签');
    assert.equal(countOf(html, 'class="[^"]*-cell '), WEEK.length * HEAT_GRID_COLUMNS, '格数 ＝ 行 × 七');
    assert.match(html, /role="img" aria-label="作息 · 一周：合计 90 条，峰值 16–20 周三 5 条"/,
      '读屏拿到合计与峰值那一格');
    assert.match(html, /-rank-label">一周合计</);
    assert.match(html, /-rank-value">90 条</);
    assert.match(html, /-rank-sub">六个时段相加</);
    assert.ok(!/<script/i.test(html), '不产脚本');
  });

  it('**色键与实际着色同一份真值**：每格 `is-l<n>` ＝ `heatGridLevel(值)`；色键区间逐档对上', () => {
    const html = renderHeatGrid(base);
    const levels = [...html.matchAll(/class="[^"]*-cell is-l(\d)( is-peak)?"/g)].map((m) => Number(m[1]));
    const flat = WEEK.flatMap((r) => r.values);
    assert.equal(levels.length, flat.length);
    levels.forEach((lv, i) => assert.equal(lv, heatGridLevel(flat[i]), '第 ' + i + ' 格的深浅'));
    /* 色键：五档 ＋ 逐档数字区间（缺省分档 [2,4,6] ⇒ 0／1–2／3–4／5–6／7 以上）。 */
    assert.equal(HEAT_GRID_LEVEL_COUNT, HEAT_GRID_LEVEL_STOPS.length + 2);
    assert.equal(countOf(html, 'class="[^"]*-swatch'), HEAT_GRID_LEVEL_COUNT, '色键逐档一枚色块');
    for (const text of ['0 条', '1–2 条', '3–4 条', '5–6 条', '7 条以上']) {
      assert.ok(html.includes('>' + text + '<'), '色键缺区间：' + text);
    }
    assert.ok(html.includes('>少<') && html.includes('>多<'), '色键两端点明深浅方向');
    /* 区间与着色一致：逐档取一个落在该档的值，断言它真的被画成那一档。 */
    assert.equal(heatGridLevel(0), 0);
    assert.equal(heatGridLevel(2), 1);
    assert.equal(heatGridLevel(4), 2);
    assert.equal(heatGridLevel(6), 3);
    assert.equal(heatGridLevel(7), 4);
    assert.equal(heatGridLevel(999), 4, '最高档是开区间（7 以上）');
  });

  it('用户给的分档上界会把色键区间一起改掉（两处同一份真值）', () => {
    const html = renderHeatGrid({ ...base, unit: '千卡', levelStops: [10, 20, 30] });
    for (const text of ['0 千卡', '1–10 千卡', '11–20 千卡', '21–30 千卡', '31 千卡以上']) {
      assert.ok(html.includes('>' + text + '<'), '色键缺区间：' + text);
    }
    assert.equal(heatGridLevel(10, [10, 20, 30]), 1);
    assert.equal(heatGridLevel(31, [10, 20, 30]), 4);
  });

  it('第一处峰值格带 ▲（深浅之外的形），全零的网格不点峰值符号', () => {
    const html = renderHeatGrid(base);
    const flat = WEEK.flatMap((r) => r.values);
    const max = Math.max(...flat);
    assert.ok(flat.filter((v) => v === max).length >= 1);
    assert.equal(countOf(html, '-peak-mark">' + HEAT_GRID_PEAK_MARK), 1, '▲ 只点在第一处峰值上（并列不点花网格）');
    assert.equal(countOf(html, 'is-peak'), 1, '峰值标记恰好一处');
    const zero = renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [0, 0, 0, 0, 0, 0, 0] }] });
    assert.equal(zero.includes('is-peak'), false, '没有峰值就不点符号');
    assert.equal(zero.includes(HEAT_GRID_PEAK_MARK + '</b>'), false);
  });

  it('每格带 `title`（哪一行 · 哪一天：多少）——窄到看不出深浅时靠它兜底', () => {
    const html = renderHeatGrid(base);
    assert.ok(html.includes('title="16–20 · 周三：5条"'), '格子的 title 带上行、列与值：'
      + (html.match(/title="[^"]*"/) || [''])[0]);
  });

  it('转义面：标题／口径／行标签／列头／读数逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderHeatGrid({
      title: evil, stamp: evil, unit: evil,
      rows: [{ label: evil, values: [1, 2, 3, 4, 5, 6, 7] }],
      weekdays: [evil, 'b', 'c', 'd', 'e', 'f', 'g'],
      facts: [{ label: evil, value: evil, sub: evil }],
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签：' + html.slice(0, 160));
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.ok(renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 1, 1, 1, 1, 1, 1] }], extraClass: 'ok-class other' })
      .includes('ok-class other'), '合法附加类名照收');
  });

  it('缺槽就不出那一槽：不给 facts 就不出右侧读数；不给 unit 色键就只有数字', () => {
    const html = renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 2, 3, 4, 5, 6, 7] }] });
    assert.equal(html.includes('-rank'), false);
    assert.equal(html.includes('-stamp'), false);
    assert.equal(html.includes('-note'), false);
    assert.ok(html.includes('>1–2<'), '不给单位时色键区间只有数字');
  });

  it('缺值写法与列头缺省', () => {
    assert.equal(HEAT_GRID_MISSING, '—');
    assert.equal(HEAT_GRID_COLUMNS, 7);
    assert.equal(HEAT_GRID_WEEKDAYS.length, HEAT_GRID_COLUMNS);
  });

  it('入参违规一律拒（不静默降级）：行列对不齐／非数组／分档／形态键／附加类名', () => {
    assert.deepEqual([...HEAT_GRID_FORMS], ['matrix']);
    assert.equal(throwsBlocks(() => renderHeatGrid(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderHeatGrid({ rows: WEEK })), true, '没有标题');
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: '', rows: WEEK })), true);
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x' })), true, '没有行');
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: [] })), true);
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: 'x' })), true);
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: [null] })), true);
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: [{ label: '', values: [1, 1, 1, 1, 1, 1, 1] }] })), true);
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: [{ label: 'a' }] })), true);
    /* 行列对不齐：七列里少一个数 ⇒ 当场报错（不静默补齐、不错位）。 */
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 1, 1, 1, 1, 1] }] })), true);
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 1, 1, 1, 1, 1, 1, 1] }] })), true);
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 1, 1, 1, 1, 1, -1] }] })), true);
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 1, 1, 1, 1, 1, Number.NaN] }] })), true);
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 1, 1, 1, 1, 1, '1'] }] })), true);
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: WEEK, weekdays: ['周一'] })), true, '列头枚数不对');
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: WEEK, weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', ''] })), true);
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: WEEK, levelStops: [1, 2] })), true, '分档枚数');
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: WEEK, levelStops: [4, 2, 6] })), true, '分档不递增');
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: WEEK, levelStops: [1.5, 2, 6] })), true, '分档非整数');
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: WEEK, form: 'calendar' })), true);
    assert.equal(throwsBlocks(() => renderHeatGrid({ title: 'x', rows: WEEK, extraClass: 'a"b' })), true);
  });

  it('纯函数：同样的入参恒产同样的字节', () => {
    assert.equal(renderHeatGrid(base), renderHeatGrid(base));
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('heat-grid ② 样式与零 DOM 纪律', () => {
  const css = heatGridCss();

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且带本件类名根', () => {
    assert.ok(stripComments(css).trim() !== '', '样式段必须非空');
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 10, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        assert.ok(part.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + part.trim());
        assert.ok(part.includes(HEAT_GRID_CLASS), '选择器必须只碰本件类名根：' + part.trim());
        /* 拼后代／兄弟选择器时**只许第一段带 scope**：`.page-ui .a .page-ui .b` 里第二条 `.page-ui`
           永远匹配不到 —— 规则「看着在、其实不生效」（样张页上抓到过一次真事：深格 ▲ 字色没生效）。 */
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
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(clean.includes(frozen + ':'), false, '不得重定义冻结 token：' + frozen);
    }
  });

  it('**零横向溢出的形状事实**：列宽 `minmax(0,1fr)`、行标签列 `max-content`、没有横滑容器', () => {
    const clean = stripComments(css);
    assert.ok(clean.includes('grid-template-columns: max-content repeat(7, minmax(0, 1fr))'),
      '第一列按行标签占位、其余七列等分剩余宽度');
    assert.equal(clean.includes('overflow-x'), false, '不许出现 overflow-x（不藏横滑）');
    assert.equal(clean.includes('scroll'), false, '不许出现滚动容器');
  });

  it('**数据色全部算出来**：零手写色值、**源码级**零手写 `var(--ilife-…)`，五档走 `color-mix()` ＋ `skinVar()`', () => {
    const clean = stripComments(css);
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const src = stripComments(readFileSync(join(PKG, 'src', 'components', 'heat-grid', 'style.ts'), 'utf8'));
    assert.deepEqual([...src.matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [], '源码里请改走 skinVar()');
    assert.equal(clean.includes('color-mix(in srgb,'), true, '五档深浅从 skinVar 算出来');
    assert.equal(clean.includes('var(--ilife-accent,'), true, '强调色经 skinVar 走兜底链');
  });

  it('尺寸事实写在一处：行高取常量', () => {
    assert.ok(stripComments(css).includes('minmax(' + String(HEAT_GRID_ROW_PX) + 'px, auto)'));
  });

  it('`dist/components/heat-grid/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'heat-grid');
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
    assert.equal(heatGridSlot('row-label'), HEAT_GRID_CLASS + '-row-label');
    assert.equal(heatGridSlot('cell', 'x-'), 'x-block-heat-grid-cell');
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('heat-grid ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(HEAT_GRID_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderScaleBar({ value: 860, goal: 1850 });
    renderHeatGrid({ title: 'x', rows: WEEK });
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), before, '别件的产物逐字节不变');
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(heatGridCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-heat-grid'), '前缀必须作用到 scope 与类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });
});

/* ── ④ 两档几何（真机） ─────────────────────────────────────────────── */

/** 关键语义槽：色键区间、行标签、右侧读数、格子的 `title` 载体（格子本身）。 */
const KEY_SELECTORS = ['key-item', 'row-label', 'rank-value', 'title'].map((slot) => slot === 'title'
  ? '.' + heatGridSlot('cell') + '[title]'
  : '.' + heatGridSlot(slot));

/** 三种压力样例：常规／十二行（行数上限）／大数 ＋ 长行标签（最容易被撑宽的就是最后一档）。 */
function cases() {
  return [
    { name: 'week', html: renderHeatGrid({
      title: '作息 · 一周', stamp: '3 月 9–15 日', unit: '条', rows: WEEK,
      facts: [{ label: '一周合计', value: '90 条' }, { label: '最忙一格', value: '16–20 周三 5 条' }],
    }) },
    { name: 'hours', html: renderHeatGrid({
      title: '一天 12 个时段', unit: '条',
      rows: Array.from({ length: 12 }, (_, i) => ({
        label: String(i * 2).padStart(2, '0') + '–' + String(i * 2 + 2).padStart(2, '0'),
        values: [1, 2, 3, 4, 5, 6, 7],
      })),
      facts: [{ label: '十二个时段合计', value: '336 条' }],
    }) },
    { name: 'long', html: renderHeatGrid({
      title: '摄入分布（按餐别与星期）', unit: '千卡',
      rows: [{ label: '上午加餐与下午茶（含零食）', values: [1234, 5678, 9012, 3456, 7890, 12345, 678] },
        { label: '夜宵', values: [1, 1, 1, 1, 1, 1, 1] }],
      facts: [{ label: '七天合计', value: '39 293 千卡' }],
    }) },
    /* 浅档峰值（最大值只到 2 ⇒ 峰值格是浅色）：深格与浅格的 ▲ 字色是两套，两档都要量到。 */
    { name: 'light', html: renderHeatGrid({
      title: '记录次数 · 早晚', unit: '次',
      rows: [{ label: '上午', values: [1, 2, 0, 1, 2, 1, 0] }, { label: '下午', values: [0, 1, 1, 2, 1, 0, 2] }],
      facts: [{ label: '合计', value: '15 次' }],
    }) },
  ];
}

describe('heat-grid ④ 两档几何（真机 headless Chrome ＋ CDP）', () => {
  it('容器 390 与 1280：七列全在、零横向溢出、色键与行标签零截断、零 overflow-x', async (t) => {
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const html = ['paper', 'broadsheet', 'neutral']
      .map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n');
    const page = await startShapesPage({ html, css: skinCss() + '\n' + heatGridCss() });
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
            const root = await page.read([scope + '.' + HEAT_GRID_CLASS]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            assert.ok(root[0].maxScrollW <= root[0].maxClientW + 1,
              width + ' 档 ' + skin + ' ' + c.name + '：根横向溢出 ' + root[0].maxScrollW + ' > ' + root[0].maxClientW);
            assert.equal(root[0].scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            const keys = await page.read(KEY_SELECTORS.map((sel) => scope + sel));
            for (const one of keys) {
              assert.ok(one.visible > 0, width + ' 档 ' + skin + ' ' + c.name + '：关键槽不见了 ' + one.sel);
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name
                + '：' + one.sel + ' 有 ' + one.clipped + ' 处被截断');
            }
            /* **七列全在**：最后一列（周日那格）的右边界不得跑出根 —— 不靠横滑藏。 */
            const cells = await page.ev('(function(){var box=document.querySelector('
              + JSON.stringify(scope + '.' + HEAT_GRID_CLASS) + ');'
              + 'var cells=[].slice.call(box.querySelectorAll(' + JSON.stringify('.' + heatGridSlot('cell')) + '));'
              + 'var rb=box.getBoundingClientRect();var last=cells[cells.length-1].getBoundingClientRect();'
              + 'return {n:cells.length,rootW:Math.round(rb.width),lastRight:Math.round(last.right),'
              + 'rootRight:Math.round(rb.right),rowH:Math.round(cells[0].getBoundingClientRect().height),'
              + 'rows:box.querySelectorAll(' + JSON.stringify('.' + heatGridSlot('row-label')) + ').length};}())');
            const rows = c.name === 'week' ? WEEK.length : c.name === 'hours' ? 12 : 2;
            assert.equal(cells.n, rows * HEAT_GRID_COLUMNS, width + ' 档 ' + skin + '：格数不对（七列 × 行数）');
            assert.ok(cells.lastRight <= cells.rootRight + 1,
              width + ' 档 ' + skin + ' ' + c.name + '：最后一列跑出容器 ' + cells.lastRight + ' > ' + cells.rootRight);
            assert.ok(cells.rowH >= 20, width + ' 档 ' + skin + '：行高被压得太扁 ' + cells.rowH);
            seen.push({ width, skin, name: c.name, rootW: cells.rootW, lastRight: cells.lastRight,
              rootRight: cells.rootRight, rowH: cells.rowH, rootScrollW: root[0].maxScrollW,
              rootClientW: root[0].maxClientW });
          }
        }
      }
      /* 窄档确实是**容器**驱动的：390 档行高比 1280 档矮一档（视口没变，只改了容器宽度）。 */
      const narrowRowH = seen.filter((s) => s.width === 390).map((s) => s.rowH);
      const wideRowH = seen.filter((s) => s.width === 1280).map((s) => s.rowH);
      assert.equal(wideRowH.every((h) => h === HEAT_GRID_ROW_PX), true,
        '1280 档行高应取常量 ' + HEAT_GRID_ROW_PX + '：' + JSON.stringify(wideRowH));
      assert.equal(narrowRowH.every((h) => h < HEAT_GRID_ROW_PX), true,
        '390 档行高应收一档（@container 判的是本件自己的宽度）：' + JSON.stringify(narrowRowH));
      /* **深格与浅格上的 ▲ 各用一套字色**：光看样式段里有那条规则不够（选择器拼错时它看着在、其实不生效），
         真机上把两档的实测颜色与皮肤取值表逐名对上。 */
      for (const skin of ['paper', 'broadsheet', 'neutral']) {
        const vals = SKIN_VALUES[skin];
        const colors = await page.ev('(function(){var g=function(s){var el=document.querySelector(' + JSON.stringify('.'
          + skinClass(skin) + ' ') + '+s);return el===null?null:getComputedStyle(el).color;};'
          + 'return {dark:g(' + JSON.stringify(' [data-case="week"] .' + heatGridSlot('peak-mark')) + '),'
          + 'light:g(' + JSON.stringify(' [data-case="light"] .' + heatGridSlot('peak-mark')) + ')};}())');
        assert.equal(colors.dark, toRgb(vals['accent-ink']), skin + '：深格（l3）上的 ▲ 取 accent-ink');
        assert.equal(colors.light, toRgb(vals.ink), skin + '：浅格（l1）上的 ▲ 取主文字色');
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of [390, 1280]) {
        const rows = seen.filter((s) => s.width === w);
        console.log('READING heat-grid container=' + w
          + ' maxRootScrollW=' + Math.max(...rows.map((s) => s.rootScrollW))
          + ' maxRootClientW=' + Math.max(...rows.map((s) => s.rootClientW))
          + ' maxLastRight=' + Math.max(...rows.map((s) => s.lastRight))
          + ' maxRootRight=' + Math.max(...rows.map((s) => s.rootRight))
          + ' rowH=' + rows[0].rowH + 'px cases=' + rows.length);
      }
    } finally { page.close(); }
  });
});
