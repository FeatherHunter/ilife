/** cash-waterline（现金水位 · 三形态：`waterline` 逐日水位柱／`bullet` 每周子弹图／`flow` 进出水三栏）· 契约测试。
 *
 * 覆盖四组判据：
 *  ① **渲染契约**：三个形态的结构（类名与槽位）／柱高与条宽**从读数算出来**／跌破底线的判定与告急日点名／
 *     越过 100% 的读数点名／判定句／**横轴三条不变量**（枚数 ≤ 上限、首尾必出、今天必占一枚——1–31 天逐长度）／
 *     卡头第三格／净额零号／真笔数 vs 明细行数／转义面／**全部**非法入参分支（每个都断 `BlocksError`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下**且作用域恰一次**、
 *     零 `:root`／`!important`／零 `@media`（宽度只许 `@container`，且自己声明了容器）／
 *     零手写色值（兜底链那处除外）／源码级零手写 `var(--ilife-…)`／读皮肤一律带兜底链／
 *     **语义色当字 ≥4.5:1（四套皮肤逐套算）**／零键盘语汇／`dist/components/cash-waterline/**` 剥字面量后零 DOM；
 *  ③ **加法式**：不启用这件时页面产物逐字节不变；渲染本件不改动别件的产物；
 *  ④ **两档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 320／390／620／1280 四档零横向溢出、
 *     关键语义（钱数／日期／底线／判定）零截断、**轴刻度与柱子逐格对齐**、两档画布高度与三栏列数、
 *     **各套皮肤下标记逐字节相同**。
 *
 * 期望值一律从组件自己的常量与几何读数派生（`CASH_WATERLINE_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CASH_WATERLINE_CLASS,
  CASH_WATERLINE_DEFAULT_THRESHOLD_PCT,
  CASH_WATERLINE_FORMS,
  CASH_WATERLINE_MAX_AXIS_COLUMNS,
  CASH_WATERLINE_MAX_AXIS_LABELS,
  CASH_WATERLINE_MAX_DAYS,
  CASH_WATERLINE_MAX_LABEL_CHARS,
  CASH_WATERLINE_MAX_LINES,
  CASH_WATERLINE_MAX_WEEKS,
  CASH_WATERLINE_MISSING,
  CASH_WATERLINE_NARROW_PLOT_HEIGHT_PX,
  CASH_WATERLINE_PLOT_HEIGHT_PX,
  CASH_WATERLINE_SLOTS,
  cashWaterlineCss,
  cashWaterlineSlot,
  renderCashWaterline,
} from '../dist/components/cash-waterline/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderStackedBar } from '../dist/components/stacked-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKIN_NAMES, SKINS, skinClass, skinCss } from '../dist/components/skin/index.js';
import { startShapesPage } from './shapes-probe.mjs';

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

/** 一条选择器里 `.page-ui` 出现的次数（**至多一次**：拼两遍＝永不命中的死规则）。 */
const scopeHits = (sel) => (sel.match(/\.ilife-page-ui/g) || []).length;

/** 剥掉 `var(...)`（含嵌套与带括号的兜底）后的剩余 CSS：兜底链里的颜色字面量是允许的。 */
function stripVarFns(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    if (css.startsWith('var(', i)) {
      let depth = 0;
      let j = i + 3;
      for (; j < css.length; j += 1) {
        if (css[j] === '(') depth += 1;
        else if (css[j] === ')') { depth -= 1; if (depth === 0) break; }
      }
      i = j + 1;
      continue;
    }
    out += css[i];
    i += 1;
  }
  return out;
}

/** 抽出产出 CSS 里**每条规则的选择器**（配平花括号扫；`@container` 块里的也算）。 */
function ruleSelectors(css) {
  const out = [];
  let buf = '';
  for (const ch of stripComments(css)) {
    if (ch === '{') {
      const sel = buf.trim();
      buf = '';
      if (sel !== '' && !sel.startsWith('@')) out.push(sel);
    } else if (ch === '}') buf = '';
    else buf += ch;
  }
  return out;
}

/** 横轴逐格读数（**一格一天**：下标即那一天的序号；`is-range` 那一档是"一行区间读数"）。 */
function axisCells(html) {
  return [...html.matchAll(new RegExp('<span class="' + cashWaterlineSlot('xax-cell') + '([^"]*)">([^<]*)</span>', 'g'))]
    .map((m) => ({ cls: m[1], today: /is-today/.test(m[1]), range: /is-range/.test(m[1]), text: m[2] }));
}

/** 逐格水位柱的档（`is-low`／`is-keep`，可选 `is-today`）。 */
function colKinds(html) {
  return [...html.matchAll(new RegExp(cashWaterlineSlot('col') + ' (is-low|is-keep)( is-today)?"', 'g'))]
    .map((m) => ({ low: m[1] === 'is-low', today: m[2] !== undefined }));
}

/** 颜色对比度（WCAG 口径；判据自己算，不靠眼看）。 */
function ratioOf(fg, bg) {
  const hex = (v) => {
    const m = /^#([0-9a-f]{6})$/i.exec(String(v).trim());
    return m === null ? null : [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  };
  const lum = (rgb) => {
    const f = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  };
  const a = hex(fg);
  const b = hex(bg);
  if (a === null || b === null) return null;
  const la = lum(a);
  const lb = lum(b);
  return Math.round(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)) * 100) / 100;
}

/* ── 三份正例（读数与原型墙上那一件同值） ─────────────────────────────── */

/** 形态 A：09-15 余量 82% → 09-24 余量 22%，09-21 起跌破 30% 底线（4 天），今天＝最后一格。
 *  轴上那枚用短日期（原型那一格也是 `15`…`24`），告急日点名里是整日期 `09-21`。 */
const DAYS = [
  { label: '09-15', axisLabel: '15', pct: 82 }, { label: '09-16', axisLabel: '16', pct: 74 },
  { label: '09-17', axisLabel: '17', pct: 66 }, { label: '09-18', axisLabel: '18', pct: 58 },
  { label: '09-19', axisLabel: '19', pct: 52 }, { label: '09-20', axisLabel: '20', pct: 44 },
  { label: '09-21', axisLabel: '21', pct: 29, spend: 240 }, { label: '09-22', axisLabel: '22', pct: 26, spend: 260 },
  { label: '09-23', axisLabel: '23', pct: 24, spend: 300 }, { label: '09-24', axisLabel: '24', pct: 22 },
];
const WATERLINE = { title: '本月可用余量 · 逐日', stamp: '预算 6 000 元', days: DAYS, todayIndex: 9 };
/** 形态 B：累计已用 20.7% / 53.7% / 94.7% / 135.7%（第 3 周起越过底线）。 */
const WEEKS = [
  { label: '第 1 周', inflow: 8000, outflow: 1240 }, { label: '第 2 周', inflow: 0, outflow: 1980 },
  { label: '第 3 周', inflow: 320, outflow: 2460 }, { label: '第 4 周', inflow: 0, outflow: 2460 },
];
const BULLET = { title: '分周进度', stamp: '4 周', form: 'bullet', weeks: WEEKS, budget: 6000 };
/** 形态 C：进 8 320／出 6 140／余 2 180（占预算 36.3%）。 */
const FLOW = {
  title: '本月进出水', stamp: '09-01 – 09-24', form: 'flow',
  inflow: [{ name: '工资', amount: 8000 }, { name: '退款', amount: 320 }],
  outflow: [{ name: '餐饮', amount: 3180 }, { name: '日用', amount: 1960 }, { name: '交通', amount: 1000 }],
  budget: 6000, elapsedDays: 24, remainDays: 6,
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('cash-waterline ① 渲染契约（形态 A 逐日水位柱）', () => {
  it('骨架：卡头（标题 ＋ 第三格 ＋ 印）→ 画布（底线 ＋ 逐日柱）→ 横轴 → 图例 → 点名 → 口径', () => {
    const html = renderCashWaterline(WATERLINE);
    assert.match(html, new RegExp('^<div class="' + CASH_WATERLINE_CLASS + ' is-waterline"'));
    assert.match(html, /-title">本月可用余量 · 逐日</);
    assert.match(html, /-stamp">预算 6 000 元</);
    assert.match(html, /-plot" role="img" aria-label="逐日水位柱：09-15 余量 82%，09-24 余量 22%，今天（09-24）余量 22%；底线 30%；09-21 起 4 天跌破底线"/,
      '整张水位是**一张图**：读屏拿到首尾余量、今天那一格与底线');
    assert.equal(colKinds(html).length, DAYS.length, '逐日出格');
    assert.match(html, /-thr" aria-hidden="true"><b class="[^"]*-thr-text">底线 30%<\/b>/,
      '底线那枚标签**有字**（不是只靠一条线）');
    assert.match(html, /-xax"/, '横轴在');
    assert.match(html, /-low-title">跌破底线的日子 · 4 天</, '点名那块写着几天');
    assert.ok(!/<script/i.test(html), '不产脚本');
  });

  it('柱高**从读数算出来**：逐日 `--cash-waterline-h` 与入参 pct 一一对上', () => {
    const html = renderCashWaterline(WATERLINE);
    const heights = [...html.matchAll(new RegExp('-col[^"]*" aria-hidden="true"><i class="[^"]*-fill" style="'
      + '--cash-waterline-h: ([0-9.]+)%"', 'g'))].map((m) => Number(m[1]));
    assert.deepEqual(heights, DAYS.map((d) => d.pct), '柱高＝当天余量（一处算、一处用）');
  });

  it('跌破底线＝**严格小于**底线：正好压在线上不算跌破，且**逐格**对得上', () => {
    const onLine = renderCashWaterline({ title: 'x', days: [{ label: 'a', pct: 30 }, { label: 'b', pct: 29 }] });
    assert.deepEqual(colKinds(onLine).map((c) => c.low), [false, true], '30% 与底线齐平＝还在线上；29% 才算跌破');
    /* 逐格点名（不是数全页出现几次）：跌破的正是 09-21 起的四格。 */
    const html = renderCashWaterline(WATERLINE);
    assert.deepEqual(colKinds(html).map((c) => c.low),
      DAYS.map((d) => d.pct < CASH_WATERLINE_DEFAULT_THRESHOLD_PCT), '低档逐格落在跌破的那几天上');
    assert.equal(colKinds(html).filter((c) => c.today).length, 1, '今天恰一格');
    assert.equal(colKinds(html)[9].today, true, '今天＝下标 9 那一格');
  });

  it('告急日**逐日点名**（日期 ＋ 那天花了多少 ＋ 余量）：缺 `spend` 写 `—`，不写 0', () => {
    const html = renderCashWaterline(WATERLINE);
    const rows = [...html.matchAll(/-low-row"><b class="[^"]*-low-day">([^<]*)<\/b><span class="[^"]*-low-spend">那天花 ([^<]*)<\/span><span class="[^"]*-low-pct">余量 ([^<]*)<\/span>/g)]
      .map((m) => ({ day: m[1], spend: m[2], pct: m[3] }));
    assert.deepEqual(rows.map((r) => r.day), ['09-21', '09-22', '09-23', '09-24']);
    assert.deepEqual(rows.map((r) => r.spend), ['240 元', '260 元', '300 元', CASH_WATERLINE_MISSING],
      '没给 spend 的那天写 `—`（**不猜**）');
    assert.deepEqual(rows.map((r) => r.pct), ['29%', '26%', '24%', '22%']);
  });

  it('不连着跌就说「共 N 天」，不拿「起 N 天」骗人；全程在线上时不出点名那块', () => {
    const apart = renderCashWaterline({ title: 'x', days: [{ label: 'a', pct: 29 }, { label: 'b', pct: 50 }, { label: 'c', pct: 20 }] });
    assert.match(apart, /跌破底线（共 2 天）/, '断开的低价日不许说成「a 起 2 天」');
    const safe = renderCashWaterline({ title: 'x', days: [{ label: 'a', pct: 80 }, { label: 'b', pct: 70 }] });
    assert.equal(safe.includes('-lowlist'), false, '一天都没跌破就不出点名那块');
    assert.match(safe, /跌破底线（全程在底线之上）/, '图例照实说「全程在线上」');
  });

  it('今天：竖游标（形）＋ 轴上的「今天」（字）＋ 强调色（色）；不给 todayIndex 就没有今天', () => {
    const html = renderCashWaterline(WATERLINE);
    assert.match(html, /-col is-low is-today"/, '那一天的柱子照常有它的低档/非低档标记');
    assert.equal(axisCells(html)[9].text, '今天', '今天那一格的字在轴上，**就在它自己那一列**');
    assert.match(html, /<i class="[^"]*-swatch is-today" aria-hidden="true"><\/i><span>今天<\/span>/);
    const none = renderCashWaterline({ title: 'x', days: [{ label: 'a', pct: 80 }] });
    assert.equal(none.includes('is-today'), false, '不给 todayIndex 就不标今天');
    assert.equal(axisCells(none)[0].text, 'a', '没有今天时那一格写日期');
  });

  it('横轴：**一格一天**（与画布同格数）；有字的至多 6 枚、第一枚必出、今天必出', () => {
    const html = renderCashWaterline(WATERLINE);
    const cells = axisCells(html);
    assert.equal(cells.length, DAYS.length, '轴格数＝画布格数（逐格对齐的前提）');
    const marked = cells.filter((c) => c.text !== '');
    assert.ok(marked.length <= CASH_WATERLINE_MAX_AXIS_LABELS, '刻度字至多 ' + CASH_WATERLINE_MAX_AXIS_LABELS + ' 枚，实际 ' + marked.length);
    assert.equal(cells[0].text, DAYS[0].axisLabel, '第一枚必出（给的是 axisLabel）');
    assert.equal(cells[DAYS.length - 1].text, '今天', '今天那一格写「今天」');
    /* 没有 axisLabel 的日子：轴上写整日期（缺省就是 label）。 */
    const raw = renderCashWaterline({ title: 'T', days: DAYS.map((d) => ({ label: d.label, pct: d.pct })), todayIndex: 9 });
    assert.equal(axisCells(raw)[0].text, DAYS[0].label, '不给 axisLabel 就用 label');
  });

  it('横轴枚数：**逐格刻度的每个长度**都不超上限（旧算法在 12 个长度上出 7 枚）', () => {
    for (let n = 1; n <= CASH_WATERLINE_MAX_AXIS_COLUMNS; n += 1) {
      const days = Array.from({ length: n }, (_, i) => ({ label: 'd' + i, pct: 90 }));
      const cells = axisCells(renderCashWaterline({ title: 'T', days, todayIndex: n - 1 }));
      const marked = cells.filter((c) => c.text !== '');
      assert.equal(cells.length, n, 'n=' + n + '：轴格数不对');
      assert.ok(marked.length <= CASH_WATERLINE_MAX_AXIS_LABELS,
        'n=' + n + ' 的刻度字有 ' + marked.length + ' 枚（上限 ' + CASH_WATERLINE_MAX_AXIS_LABELS + '）');
      assert.equal(cells[n - 1].text, '今天', 'n=' + n + '：今天那一枚必出');
      if (n > 1) assert.equal(cells[0].text, 'd0', 'n=' + n + '：首枚必出');
    }
  });

  it('超过逐格刻度的上限（' + CASH_WATERLINE_MAX_AXIS_COLUMNS + ' 天）：改出一行**区间读数**，不把字塞进 5px 的格子', () => {
    for (let n = CASH_WATERLINE_MAX_AXIS_COLUMNS + 1; n <= CASH_WATERLINE_MAX_DAYS; n += 1) {
      const days = Array.from({ length: n }, (_, i) => ({ label: 'd' + i, pct: 90 }));
      const html = renderCashWaterline({ title: 'T', days, todayIndex: n - 1 });
      const cells = axisCells(html);
      assert.equal(cells.length, 2, 'n=' + n + '：区间读数应当只有两枚（区间 ＋ 今天）');
      assert.equal(cells[0].text, 'd0 – d' + (n - 1), 'n=' + n + '：区间读数要写清首尾两天');
      assert.equal(cells[1].text, '今天 d' + (n - 1), 'n=' + n + '：今天那一格仍写着日期');
      assert.equal(cells[1].today, true, 'n=' + n + '：今天那枚要带今天档');
      assert.ok(html.includes('-xax is-range'), 'n=' + n + '：得是那一行区间读数的样式');
      const noToday = renderCashWaterline({ title: 'T', days });
      assert.equal(axisCells(noToday).length, 1, 'n=' + n + '：不给 todayIndex 就只出区间那一枚');
    }
  });

  it('今天落在**任何一列**都写得出「今天」（月中标今天是常态）', () => {
    for (const n of [1, 2, 5, 6, 10, 12, CASH_WATERLINE_MAX_AXIS_COLUMNS]) {
      for (let t = 0; t < n; t += 1) {
        const days = Array.from({ length: n }, (_, i) => ({ label: 'd' + i, pct: 90 }));
        const html = renderCashWaterline({ title: 'T', days, todayIndex: t });
        const cells = axisCells(html);
        assert.equal(cells[t].text, '今天', 'n=' + n + ' todayIndex=' + t + '：那一列的刻度字没了');
        assert.equal(cells[t].today, true, 'n=' + n + ' todayIndex=' + t + '：那一格没带今天档');
        assert.equal(cells.filter((c) => c.text === '今天').length, 1, 'n=' + n + '：屏上恰一处「今天」');
        assert.ok(cells.filter((c) => c.text !== '').length <= CASH_WATERLINE_MAX_AXIS_LABELS, 'n=' + n + '：枚数超上限');
      }
    }
    /* 区间读数那一档：今天写在哪一天都照实点名。 */
    const many = Array.from({ length: CASH_WATERLINE_MAX_DAYS }, (_, i) => ({ label: 'd' + i, pct: 90 }));
    for (const t of [0, 7, CASH_WATERLINE_MAX_DAYS - 1]) {
      const html = renderCashWaterline({ title: 'T', days: many, todayIndex: t });
      assert.equal(axisCells(html)[1].text, '今天 d' + t, 'todayIndex=' + t + '：区间读数里的今天要写对');
    }
  });

  it('底线可调：`thresholdPct` 上屏在标签与图上两处（同一份真值）', () => {
    const html = renderCashWaterline({ ...WATERLINE, thresholdPct: 45 });
    assert.match(html, /-thr-text">底线 45%<\/b>/);
    assert.match(html, /^<div class="[^"]*" style="--cash-waterline-thr: 45%">/, '画布上的位置与标签同源');
    assert.equal(CASH_WATERLINE_DEFAULT_THRESHOLD_PCT, 30, '缺省底线＝原型墙上的 30%');
    assert.match(renderCashWaterline(WATERLINE), /--cash-waterline-thr: 30%/, '不给就用缺省值');
  });

  it('口径行：不给就由本件按形态写一句（贴着自己的形态）', () => {
    assert.match(renderCashWaterline(WATERLINE), /-note">口径：柱高＝当天结束时「预算 − 已花」占预算的百分比/);
    assert.match(renderCashWaterline(BULLET), /-note">口径：横条＝本周结束时累计已用掉的比例/);
    assert.match(renderCashWaterline(FLOW), /-note">口径：进／出／余三栏同一口径/);
    const own = renderCashWaterline({ ...WATERLINE, note: '这是我自己写的口径。' });
    assert.match(own, /-note">这是我自己写的口径。</, '给了口径就用调用方的');
  });

  it('无障碍：水位那张**图**挂 `role="img"` ＋ 一句总述；逐周／三栏里全是字，**不许**挂 `role="img"`', () => {
    assert.match(renderCashWaterline(WATERLINE), /-plot" role="img" aria-label="逐日水位柱：/,
      '纯图形的画布是**一张图**，读屏拿一句总述');
    const bullet = renderCashWaterline(BULLET);
    assert.match(bullet, /-bullet" role="group" aria-label="[^"]*第 1 周 已用 20.7%/, '子弹图的字都在行里，整块只给一个组名');
    assert.equal(/role="img"/.test(bullet), false, '挂 role="img" 会把子树里的字从读屏里抹掉');
    const flow = renderCashWaterline(FLOW);
    assert.match(flow, /-three" role="group" aria-label="[^"]*进 8 320 元/);
    assert.equal(/role="img"/.test(flow), false);
  });

  it('卡头**第三格**是本件算的：三形态各写自己那一句（原型卡头那一格）', () => {
    assert.match(renderCashWaterline(WATERLINE), /-head-extra">底线 30%</, '不给预算时只报底线百分比');
    assert.match(renderCashWaterline({ ...WATERLINE, budget: 6000 }), /-head-extra">底线 6 000 元（30%）</,
      '给了预算就把底线写成钱数（原型那格是「底线 1 800（30%）」）');
    assert.match(renderCashWaterline(BULLET), /-head-extra">竖线＝底线 30%</);
    assert.match(renderCashWaterline(FLOW), /-head-extra">还剩 6 天</);
    /* 第三格与印同组（卡头右端那一组），不是跟标题挤在左边。 */
    assert.match(renderCashWaterline(FLOW),
      /-hd-tail"><span class="[^"]*-head-extra">还剩 6 天<\/span><span class="[^"]*-stamp">/);
  });
});

describe('cash-waterline ① 渲染契约（形态 B 每周子弹图）', () => {
  it('逐周一行：名字 ｜ 进 ｜ 出 ｜ 净（带符号）＋ 轨道（填充＋底线刻度）', () => {
    const html = renderCashWaterline(BULLET);
    assert.match(html, new RegExp('^<div class="' + CASH_WATERLINE_CLASS + ' is-bullet"'));
    assert.match(html, /-bhd-name">第 1 周</);
    assert.match(html, /进 8 000</);
    assert.match(html, /出 1 240</);
    assert.match(html, /-net">净 \+6 760</);
    assert.match(html, /-net">净 −2 460</, '净额为负时用减号，不是把符号吞掉');
    assert.match(html, /style="--cash-waterline-used-thr: 70%"/, '底线换算成「已用」＝100 − 30');
    assert.equal((html.match(/-rail-fill/g) || []).length, WEEKS.length, '逐周一条填充');
    assert.equal((html.match(/-rail-thr/g) || []).length, WEEKS.length, '逐周一枚底线刻度');
    assert.match(html, /-legend-item"><i class="[^"]*-swatch is-keep"[^>]*><\/i><span>本周结束时已用掉预算的比例<\/span>/);
  });

  it('越过 100%：**条形画到满格、读数里照实点名**，不缩回 100%', () => {
    const html = renderCashWaterline(BULLET);
    assert.match(html, /-over">已用 135.7%</, '超了就在读数里点名实际比例');
    const fills = [...html.matchAll(/-rail-fill" aria-hidden="true" style="--cash-waterline-w: ([0-9.]+)%"/g)]
      .map((m) => Number(m[1]));
    assert.deepEqual(fills, [20.7, 53.7, 94.7, 100], '条形封顶 100%（读数里写着 135.7%）');
  });

  it('越过底线的周：左侧 2px 侧标（形）＋ 图例点名（字）；`已用 > 100 − 底线` 才算越过', () => {
    const html = renderCashWaterline(BULLET);
    const lows = [...html.matchAll(/-brow( is-low)?">/g)].map((m) => (m[1] === undefined ? 'keep' : 'low'));
    assert.deepEqual(lows, ['keep', 'keep', 'low', 'low'], '第 3 周（已用 94.7% > 70%）起越过底线');
    assert.match(html, /跌破底线（第 3 周 越过底线）/, '哪一周越过的写出来');
    const safe = renderCashWaterline({ ...BULLET, budget: 100000 });
    assert.equal(/-brow is-low/.test(safe), false, '没越过就不该有低档标记');
    assert.match(safe, /跌破底线（全程在底线之上）/);
  });

  it('净额为 0 时不带正负号（`+0` 读起来像"有进账"，而它是不进不出）', () => {
    const net = (inflow, outflow) => renderCashWaterline({
      title: 'T', form: 'bullet', budget: 6000, weeks: [{ label: '第 1 周', inflow, outflow }],
    }).match(/-net">([^<]*)</)[1];
    assert.equal(net(0, 0), '净 0');
    assert.equal(net(5, 5), '净 0');
    assert.equal(net(1, 0), '净 +1');
    assert.equal(net(0, 1), '净 −1');
  });
});

describe('cash-waterline ① 渲染契约（形态 C 进出水三栏）', () => {
  it('三栏：进／出／余，栏头带笔数或项数与合计，逐行「条 ＋ 名字 ＋ 钱数」', () => {
    const html = renderCashWaterline(FLOW);
    assert.match(html, new RegExp('^<div class="' + CASH_WATERLINE_CLASS + ' is-flow"'));
    assert.match(html, /-card-name is-in">进</);
    assert.match(html, /-card-count">2 项</, '没给真笔数时照实写「项」（＝明细行数）');
    assert.match(html, /-card-total">8 320 元</);
    assert.match(html, /-card-name is-out">出</);
    assert.match(html, /-card-count">3 项</);
    assert.match(html, /-card-total">6 140 元</);
    assert.match(html, /-card-name is-left">余</);
    assert.match(html, /-card-count">占预算 36.3%</);
    assert.match(html, /-card-total">2 180 元</);
    assert.match(html, /-line-text">工资 8 000 元</);
    assert.match(html, /-line-text">日均 256 元</);
  });

  it('栏头写「笔」**只在调用方给了真笔数**时（明细行数不许冒名交易笔数）', () => {
    const html = renderCashWaterline({ ...FLOW, inflowCount: 38, outflowCount: 37 });
    const counts = [...html.matchAll(/-card-count">([^<]*)</g)].map((m) => m[1]);
    assert.deepEqual(counts, ['38 笔', '37 笔', '占预算 36.3%'], '屏上列 2 行明细、账上 38 笔：两个数都写得出来');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...FLOW, inflowCount: 0 })), true, '笔数 ≥ 1');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...FLOW, outflowCount: 2.5 })), true, '笔数是整数');
  });

  it('条宽按同行合计算（进栏 8 000/8 320＝96.2%；出栏 3 180/6 140＝51.8%）', () => {
    const html = renderCashWaterline(FLOW);
    const fills = [...html.matchAll(/-line-fill" aria-hidden="true" style="--cash-waterline-w: ([0-9.]+)%"/g)]
      .map((m) => Number(m[1]));
    assert.deepEqual(fills, [96.2, 3.8, 51.8, 31.9, 16.3, 36.3], '逐行条宽与读数同出一份真值');
  });

  it('判定**写成字**（撑得住／撑不住 ＋ 差多少），不只靠颜色；口径行与算式是同一件事', () => {
    const ok = renderCashWaterline(FLOW);
    assert.match(ok, /-verdict is-ok"><b class="[^"]*-verdict-word">✓ 撑得住<\/b>/);
    assert.match(ok, /按这 24 天的日均 256 元，剩下 6 天要花 1 536 元，还余 644 元。/);
    const bad = renderCashWaterline({
      ...FLOW, remainDays: 20, outflow: [{ name: '餐饮', amount: 6000 }],
    });
    assert.match(bad, /-verdict is-danger"><b class="[^"]*-verdict-word">！ 撑不住<\/b>/, '撑不住是**字**，不是只有红');
    assert.match(bad, /按这 24 天的日均 250 元，剩下 20 天要花 5 000 元，还差 2 680 元。/);
    assert.match(bad, /aria-label="[^"]*！ 撑不住——/, '读屏也拿到那句话');
    /* 口径行写的是"拿余去减要花的钱"，实现算的也是差额——文案与算式不许分家。 */
    const note = ok.match(/-note">([^<]*)</)[1];
    assert.equal(note.includes('÷'), false, '口径行不许再写成「相除」');
    assert.match(note, /还余多少|还差多少/, '口径行得说清算的是差额');
  });

  it('超支：占比照实写负数（U+2212），条宽夹在 0（不画负条）', () => {
    const html = renderCashWaterline({ ...FLOW, outflow: [{ name: '餐饮', amount: 9000 }] });
    assert.match(html, /-card-count">占预算 −11.3%</);
    assert.match(html, /-card-total">−680 元</);
    assert.match(html, /-line-fill" aria-hidden="true" style="--cash-waterline-w: 0%"/, '负占比不画成负条');
  });

  it('大数走指数记法时**不做千分位**（分组函数不许把 `1e+21` 打成「1. 797…e+ 308」）', () => {
    const one = (spend) => renderCashWaterline({ title: 'T', days: [{ label: 'a', pct: 10, spend }] })
      .match(/-low-spend">那天花 ([^<]*)</)[1];
    assert.equal(one(1e21), '1e+21 元', '指数记法原样上屏');
    assert.equal(one(Number.MAX_VALUE), '1.8e+308 元', '最大值也不许被分组打散');
    assert.equal(/[0-9] +[0-9]+e/.test(one(Number.MAX_VALUE)), false, '指数前面不许插空格');
    assert.equal(one(1234567), '1 234 567 元', '普通大数照旧走千分位');
    /* 百分比同理：大到走指数时原样，不许出现「1. 7e+ 21%」这种被打散的串。 */
    const pctText = renderCashWaterline({
      ...FLOW, budget: 1e-9, outflow: [{ name: '餐饮', amount: 1e21 }],
    }).match(/-card-count">占预算 ([^<]*)</)[1];
    assert.equal(/[0-9] +[0-9]+e/.test(pctText), false, '百分比不许被打散：' + pctText);
    assert.equal(/e\+ ?\d/.test(pctText) || /^\d/.test(pctText), true, '总得写出个读数：' + pctText);
  });
});

describe('cash-waterline ① 入参违规一律拒（不静默降级）', () => {
  it('形态闭集与共用字段', () => {
    assert.deepEqual([...CASH_WATERLINE_FORMS], ['waterline', 'bullet', 'flow']);
    assert.equal(throwsBlocks(() => renderCashWaterline(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderCashWaterline([])), true, '数组不算对象');
    assert.equal(throwsBlocks(() => renderCashWaterline({})), true, '没有标题');
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: '' })), true, '空标题');
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 1 })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, form: 'gantt' })), true, '闭集外的形态');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, thresholdPct: -1 })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, thresholdPct: 101 })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, thresholdPct: Number.NaN })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, stamp: 7 })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, extraClass: 'a"b' })), true);
  });

  it('形态 A：`days` 的形状与逐日字段（含**花费不许是负数**、刻度字不许超长）', () => {
    const day = (patch) => ({ title: 'T', days: [patch] });
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x' })), true, '没给 days');
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x', days: [] })), true, '空 days');
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x', days: 'x' })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline(day(null))), true, '一天不是对象');
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ pct: 50 }))), true, '缺日期');
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: '', pct: 50 }))), true, '空日期');
    assert.equal(throwsBlocks(() => renderCashWaterline(
      day({ label: '标'.repeat(CASH_WATERLINE_MAX_LABEL_CHARS + 1), pct: 50 }))), true,
    '刻度字超过上限（长了会在窄档压到隔壁）');
    assert.match(renderCashWaterline(day({ label: '标'.repeat(CASH_WATERLINE_MAX_LABEL_CHARS), pct: 50 })),
      /-xax-cell"/, '上限之内照收');
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: 'a' }))), true, '缺余量');
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: 'a', pct: -1 }))), true);
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: 'a', pct: 101 }))), true);
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: 'a', pct: '50' }))), true, '字符串不算数');
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: 'a', pct: 50, spend: -100 }))), true,
      '**负的花费不存在**：不许静默上屏「那天花 −100 元」');
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: 'a', pct: 50, spend: -0.01 }))), true);
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: 'a', pct: 50, spend: '1' }))), true);
    assert.equal(renderCashWaterline(day({ label: 'a', pct: 10, spend: 0 })).includes('那天花 0 元'), true, '花 0 元是合法读数');
    const tooMany = Array.from({ length: CASH_WATERLINE_MAX_DAYS + 1 }, (_, i) => ({ label: 'd' + i, pct: 50 }));
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x', days: tooMany })), true, '超过一天上限');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, todayIndex: 10 })), true, '今天下标越界');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, todayIndex: -1 })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, todayIndex: 1.5 })), true);
  });

  it('形态 B：`weeks` 与 `budget`（进／出都不许是负数）', () => {
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x', form: 'bullet', weeks: WEEKS })), true, '缺 budget');
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x', form: 'bullet', budget: 6000 })), true, '缺 weeks');
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x', form: 'bullet', budget: 0, weeks: WEEKS })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x', form: 'bullet', budget: 6000, weeks: [] })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({
      title: 'x', form: 'bullet', budget: 6000, weeks: [{ label: 'w', inflow: -1, outflow: 0 }],
    })), true, '进项不许是负数');
    assert.equal(throwsBlocks(() => renderCashWaterline({
      title: 'x', form: 'bullet', budget: 6000, weeks: [{ label: 'w', inflow: 0, outflow: -1 }],
    })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({
      title: 'x', form: 'bullet', budget: 6000, weeks: [{ label: 'w', inflow: 0 }],
    })), true, '缺 outflow');
    const tooMany = Array.from({ length: CASH_WATERLINE_MAX_WEEKS + 1 }, () => ({ label: 'w', inflow: 0, outflow: 0 }));
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x', form: 'bullet', budget: 6000, weeks: tooMany })), true);
  });

  it('形态 C：明细的形状、天数与 budget', () => {
    const base = { ...FLOW };
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...base, inflow: [] })), true, '空进项');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...base, outflow: [] })), true, '空出项');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...base, inflow: [{ name: 'a', amount: 0 }] })), true, '零金额的行不上屏');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...base, inflow: [{ name: 'a', amount: -1 }] })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...base, inflow: [{ name: '', amount: 1 }] })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...base, budget: -1 })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...base, elapsedDays: 0 })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...base, elapsedDays: 1.5 })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...base, remainDays: -1 })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...base, remainDays: undefined })), true, '缺 remainDays');
    const tooMany = Array.from({ length: CASH_WATERLINE_MAX_LINES + 1 }, (_, i) => ({ name: 'n' + i, amount: 1 }));
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...base, outflow: tooMany })), true);
  });

  it('**形态与读数对不上就拒**（给错读数＝拿错了骨架，本件不替你挑一个）', () => {
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, weeks: WEEKS })), true, '水位柱不吃 weeks');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, inflow: [{ name: 'a', amount: 1 }] })), true, '水位柱不吃 inflow');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...BULLET, days: DAYS })), true, '子弹图不吃 days');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...BULLET, todayIndex: 0 })), true, '子弹图不吃 todayIndex');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...FLOW, days: DAYS })), true, '三栏不吃 days');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...FLOW, weeks: WEEKS })), true, '三栏不吃 weeks');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...FLOW, todayIndex: 0 })), true);
    /* 水位柱**收**预算（卡头第三格要用它把底线写成钱数），但预算是正数。 */
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, budget: 0 })), true, '预算得是正数');
  });

  it('**入参表以外的键一律拒**：顶层／一天／一周／一行明细**四层**各加一个未知键都抛 `BlocksError`', () => {
    /* 写错的键名（`pctt`／`infloww`／`axisLable`）被静默吞掉时，屏上只是**静静地少一块**——
       少一根柱子、少一周的读数、少一行明细，而调用方以为自己设上了。四层逐层加一个未知键，每层都得拒。
       **继承来的与不可枚举的**键同样算（只走 `Object.keys` 会把这两类漏掉）。 */
    const one = {
      title: 'T',
      days: [{ label: '09-01', axisLabel: '1', pct: 50, spend: 1 }],
      weeks: [{ label: 'W1', inflow: 1, outflow: 1 }],
      inflow: [{ name: '工资', amount: 1 }],
    };
    /* 每个形态各起一份**只有自己那份读数**的入参（混着给会被 `forbid` 拦下——那是另一条口径，
       本条判的只是「表以外的键」）。 */
    const shapes = {
      waterline: () => ({ title: 'T', form: 'waterline', days: JSON.parse(JSON.stringify(one.days)) }),
      bullet: () => ({ title: 'T', form: 'bullet', budget: 100, weeks: JSON.parse(JSON.stringify(one.weeks)) }),
      flow: () => ({
        title: 'T', form: 'flow', budget: 100, elapsedDays: 1, remainDays: 1,
        inflow: JSON.parse(JSON.stringify(one.inflow)), outflow: [{ name: '餐饮', amount: 2 }],
      }),
    };
    const withKey = (build, path, key) => {
      const c = build();
      let at = c;
      for (const t of path) at = at[t];
      at[key] = 1;
      return c;
    };
    const layers = [
      ['顶层（水位柱）', shapes.waterline, []],
      ['顶层（子弹图）', shapes.bullet, []],
      ['顶层（三栏）', shapes.flow, []],
      ['一天（水位柱的 `days[0]`）', shapes.waterline, ['days', 0]],
      ['一周（子弹图的 `weeks[0]`）', shapes.bullet, ['weeks', 0]],
      ['进项一行（三栏的 `inflow[0]`）', shapes.flow, ['inflow', 0]],
      ['出项一行（三栏的 `outflow[0]`）', shapes.flow, ['outflow', 0]],
    ];
    for (const [label, build, path] of layers) {
      assert.equal(throwsBlocks(() => renderCashWaterline(build())), false, label + '：原样能渲出来');
      assert.equal(throwsBlocks(() => renderCashWaterline(withKey(build, path, 'zzUnknown'))), true,
        label + ' 多给一个键（多半是打错名）必须拒，不许静默吞掉');
      /* 去掉那个未知键、其余一字不动 ⇒ 必须照常渲出来（拒的是未知键，不是这一层本身）。 */
      const clean = withKey(build, path, 'zzUnknown');
      let at = clean;
      for (const t of path) at = at[t];
      delete at.zzUnknown;
      assert.equal(throwsBlocks(() => renderCashWaterline(clean)), false,
        label + '：把未知键去掉之后就得照常渲染（拒的是未知键，不是这一层本身）');
    }
    /* 先例口径的两条路都要走：`Object.create({zzUnknown:1})`（**继承来的**）与
       `Object.defineProperty(…, {enumerable:false})`（**不可枚举的**）——`Object.keys` 两条都看不见。 */
    const inherited = Object.assign(Object.create({ zzUnknown: 1 }), { title: 'T', days: [{ label: 'd', pct: 50 }] });
    assert.equal(throwsBlocks(() => renderCashWaterline(inherited)), true, '顶层继承来的未知键');
    const hidden = { title: 'T', days: [{ label: 'd', pct: 50 }] };
    Object.defineProperty(hidden, 'zzUnknown', { value: 1, enumerable: false });
    assert.equal(throwsBlocks(() => renderCashWaterline(hidden)), true, '顶层不可枚举的未知键');
    /* 可选键一个都不许被误拒（表按 `attrs.ts` 的入参面逐字段列全，必填与可选都在）：三形态各一遍。 */
    assert.equal(throwsBlocks(() => renderCashWaterline({
      title: 'T', stamp: '预算 6 000 元', form: 'waterline', thresholdPct: 30, budget: 6000, unit: '元',
      note: '口径', extraClass: 'a b', todayIndex: 0,
      days: [{ label: '09-01', axisLabel: '1', pct: 50, spend: 1 }],
    })), false, '水位柱：入参表里的可选键一个都不许误拒');
    assert.equal(throwsBlocks(() => renderCashWaterline({
      title: 'T', stamp: '4 周', form: 'bullet', thresholdPct: 30, budget: 6000, unit: '元',
      note: '口径', extraClass: 'a b', weeks: [{ label: 'W1', inflow: 1, outflow: 1 }],
    })), false, '子弹图：入参表里的可选键一个都不许误拒');
    assert.equal(throwsBlocks(() => renderCashWaterline({
      title: 'T', stamp: '本月', form: 'flow', thresholdPct: 30, budget: 6000, unit: '元', note: '口径',
      extraClass: 'a b', elapsedDays: 24, remainDays: 6, inflowCount: 3, outflowCount: 38,
      inflow: [{ name: '工资', amount: 1 }], outflow: [{ name: '餐饮', amount: 2 }],
    })), false, '三栏：入参表里的可选键一个都不许误拒');
  });

  it('转义面：标题／口径／日期／名字逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderCashWaterline({
      title: evil, stamp: evil, note: evil,
      days: [{ label: evil.slice(0, CASH_WATERLINE_MAX_LABEL_CHARS), pct: 10, spend: 1 }], todayIndex: 0,
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签：' + html.slice(0, 160));
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    const flow = renderCashWaterline({ ...FLOW, inflow: [{ name: evil, amount: 1 }] });
    assert.ok(!/<script/i.test(flow), '三栏同样要转义');
  });

  it('纯函数：同样的入参恒产同样的字节（三形态各测一遍）', () => {
    for (const one of [WATERLINE, BULLET, FLOW]) {
      assert.equal(renderCashWaterline(one), renderCashWaterline(one));
    }
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('cash-waterline ② 样式与零 DOM 纪律', () => {
  const css = cashWaterlineCss();
  const clean = stripComments(css);

  it('样式段非空；**每条**规则选择器都 scope 在 `.ilife-page-ui` 之下、作用域恰一次、只碰本件闭集里的类名', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = ruleSelectors(css);
    assert.ok(selectors.length > 0, '一条规则都没抽到，判据在空转');
    const slots = new Set(CASH_WATERLINE_SLOTS.map((slot) => cashWaterlineSlot(slot)));
    for (const raw of selectors) {
      for (const part of raw.split(',')) {
        const sel = part.trim();
        if (sel === '') continue;
        assert.ok(sel.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + sel);
        assert.equal(scopeHits(sel), 1, '作用域在一条选择器里只许出现一次（拼两遍＝永不命中）：' + sel);
        assert.ok(sel.includes(CASH_WATERLINE_CLASS), '选择器必须只碰本件类名：' + sel);
        /* 选择器里出现的槽类名**必须来自槽位闭集**（拼错一个字母就会静默不生效）。 */
        for (const m of sel.matchAll(/\.ilife-block-cash-waterline-([a-z0-9-]+)/g)) {
          assert.ok(slots.has(m[0].slice(1)), '选择器用了槽位闭集外的类名：' + m[0]);
        }
      }
    }
  });

  it('零 `:root`／`!important`／零 `@media`／零新 token；`@container` 有容器（宽度只许容器判）', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(clean.includes('@media'), false, '本件不判视口宽度（视口宽 ≠ 组件宽）');
    assert.equal(clean.includes('@container'), true, '窄档必须由容器判');
    assert.equal(clean.includes('container-type: inline-size'), true, '写了容器查询就得自己声明容器');
    /* 件里**只读**皮肤变量、不许自己定义 --ilife-*（取值住皮肤层的四份取值表）。 */
    const defined = [...clean.matchAll(/(?:^|[;{\s])(--ilife-[a-z0-9-]+\s*:)/g)].map((m) => m[1].trim());
    assert.deepEqual(defined, [], '件里定义了 --ilife-*：' + defined.join('；'));
    /* 几何走本件自己的变量名（先例 `photo-compare` 的 `--photo-compare-split`），不占皮肤命名空间。 */
    assert.equal(clean.includes('--cash-waterline-'), true, '几何变量住本件自己的名字面');
  });

  it('零手写色值（除兜底链那处）；源码级零手写 `var(--ilife-…)`；读皮肤**一律带兜底链**', () => {
    const hexes = [...clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)];
    for (const m of hexes) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外不许有颜色字面量');
    const src = ['style.ts', 'style-forms.ts'].map((f) => stripComments(
      readFileSync(join(PKG, 'src', 'components', 'cash-waterline', f), 'utf8'))).join('\n');
    assert.deepEqual([...src.matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [], '源码里请改走 skinVar()');
    /* **不写成"含某个字面串"**：这里断的是结构——每一处皮肤读法都得带兜底（`var(--ilife-x, …)`），
       一处裸读都不许有（裸读在老页面里会取不到值）。 */
    const reads = [...clean.matchAll(/var\(\s*--ilife-[a-z0-9-]+([^)]*)/g)];
    assert.ok(reads.length > 0, '一条皮肤读法都没抽到，判据在空转');
    for (const m of reads) {
      assert.ok(m[1].startsWith(','), '皮肤读法没有兜底链（老页面会取不到值）：' + m[0]);
    }
  });

  it('**选中与强调走强调色系**：今天＝`accent` 竖游标（柱是 `accent`／`danger` 实底）；没有一处拿墨色当面', () => {
    assert.match(clean, /\.is-today::before \{[^}]*background: var\(--ilife-accent,/, '今天那根游标走强调色');
    assert.match(clean, /\.is-today \{[^}]*border: 2px solid var\(--ilife-accent,/, '图例里今天那枚是描边框');
    assert.match(clean, /-fill \{[^}]*background: var\(--ilife-accent,/);
    assert.equal(clean.includes('--ilife-ink'), true, '墨色只做字（`color`），不做面');
    for (const m of clean.matchAll(/(background(?:-color)?)\s*:\s*([^;{}]+)/g)) {
      assert.equal(/^var\(\s*--(?:ilife-ink(?:-[23])?|fg[23]?)\s*[,)]/.test(m[2].trim()), false,
        '拿正文墨色当了"面"：' + m[2].trim());
    }
  });

  it('**语义色当字也算地板**：`ok`／`danger`／`accent-text` 对底 ≥4.5:1（四套皮肤逐套算）', () => {
    /** 本件把语义色当**字**用的那几处（面按各处的实际底取）。 */
    const text = [
      ['判定词「撑得住」', 'ok', 'surface', 4.5],
      ['判定词「撑不住」', 'danger', 'surface', 4.5],
      ['告急点名小标题／日期', 'danger', 'ground', 4.5],
      ['底线标签', 'danger', 'danger-soft', 4.5],
      ['轴上的「今天」', 'accent-text', 'ground', 4.5],
      ['口径行', 'ink-2', 'ground', 4.5],
      ['卡头第三格', 'ink-2', 'ground', 4.5],
    ];
    const graphic = [
      ['水位柱／游标', 'accent', 'ground', 3],
      ['跌破底线的柱', 'danger', 'ground', 3],
      ['子弹图轨道填充', 'accent', 'surface', 3],
      ['出栏条', 'accent-text', 'surface-2', 3],
    ];
    const bad = [];
    for (const skin of SKIN_NAMES) {
      const values = SKINS[skin].values;
      for (const [label, fg, bg, floor] of [...text, ...graphic]) {
        const r = ratioOf(values[fg], values[bg]);
        assert.notEqual(r, null, skin + '：' + label + ' 的取值不是六字符十六进制（'
          + fg + '=' + values[fg] + '／' + bg + '=' + values[bg] + '）');
        if (r < floor) bad.push(skin + ' ' + label + '（' + fg + ' on ' + bg + '）＝ ' + r + ' < ' + floor);
      }
    }
    assert.deepEqual(bad, [], '语义色对比度不达标（**不要在件里绕开**：修皮肤层的取值表）：\n  ' + bad.join('\n  '));
  });

  it('两档画布高度都写进样式段，且用的是导出的那张尺（删掉任一条都会红）', () => {
    assert.ok(clean.includes('height: ' + String(CASH_WATERLINE_PLOT_HEIGHT_PX) + 'px'), '宽档画布高度不在样式段里');
    assert.ok(clean.includes('height: ' + String(CASH_WATERLINE_NARROW_PLOT_HEIGHT_PX) + 'px'), '窄档画布高度不在样式段里');
    assert.notEqual(CASH_WATERLINE_PLOT_HEIGHT_PX, CASH_WATERLINE_NARROW_PLOT_HEIGHT_PX, '两档得是两个数');
    const cq = clean.slice(clean.indexOf('@container'));
    assert.ok(cq.includes('height: ' + String(CASH_WATERLINE_NARROW_PLOT_HEIGHT_PX) + 'px'), '窄档那条得住在 @container 里');
  });

  it('槽位闭集里的每个槽都真的用上了（防「声明了一堆没人用」与「用了没声明的」）', () => {
    const html = renderCashWaterline(WATERLINE) + renderCashWaterline(BULLET) + renderCashWaterline(FLOW);
    const unused = CASH_WATERLINE_SLOTS.filter((slot) => !html.includes(cashWaterlineSlot(slot)));
    assert.deepEqual(unused, [], '这些槽位声明了却没出标记：' + unused.join('、'));
    const extra = [...new Set([...html.matchAll(/class="(ilife-block-cash-waterline-[a-z0-9-]+)/g)].map((m) => m[1]))]
      .filter((cls) => !CASH_WATERLINE_SLOTS.some((slot) => cashWaterlineSlot(slot) === cls));
    assert.deepEqual(extra, [], '这些类名没在槽位闭集里：' + extra.join('、'));
  });

  it('`dist/components/cash-waterline/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'cash-waterline');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 4, '至少该有 index／attrs／model／fields／render／style 的产物：' + files.join('、'));
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

  it('**零键盘语汇**：标记与源码里不出现键帽／快捷键／键位／方向键那类词（含符号）', () => {
    const src = ['attrs.ts', 'fields.ts', 'model.ts', 'render.ts', 'style.ts', 'style-forms.ts', 'index.ts', 'README.md']
      .map((f) => readFileSync(join(PKG, 'src', 'components', 'cash-waterline', f), 'utf8')).join('\n');
    const words = ['键帽', '快捷键', '键位', '方向键', '键盘', 'kbd', 'keydown', 'keyup',
      '⌘', '⌥', '⇧', '↑', '↓', 'Esc', 'Escape', 'Tab', 'Enter',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Ctrl', 'ctrl', 'Shift', 'Alt'];
    /* 注：`→`／`←` 不在词表里——中文技术文里它们读作"映射到／来自"（件 → 那一件），
       不是键位；键位那六个词与四个键帽符号才是这条禁的东西。 */
    for (const word of words) {
      assert.equal(src.includes(word), false, '源码里不许出现键盘语汇：' + word);
    }
    const html = renderCashWaterline(WATERLINE) + renderCashWaterline(BULLET) + renderCashWaterline(FLOW);
    for (const word of words) {
      assert.equal(html.includes(word), false, '标记里不许出现键盘语汇：' + word);
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('cash-waterline ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(CASH_WATERLINE_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const scale = renderScaleBar({ value: 860, goal: 1850 });
    const stacked = renderStackedBar({ title: 'x', segments: [{ name: 'a', value: 1 }] });
    renderCashWaterline(WATERLINE);
    renderCashWaterline(BULLET);
    renderCashWaterline(FLOW);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), scale, '别件的产物逐字节不变');
    assert.equal(renderStackedBar({ title: 'x', segments: [{ name: 'a', value: 1 }] }), stacked);
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(cashWaterlineCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-cash-waterline'), '前缀必须作用到 scope 与类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });

  it('层出口可达：`base-paint` 的组件层出口能取到本件（消费方走 `blocks`）', async () => {
    const mod = await import(new URL('../dist/blocks.js', import.meta.url).href);
    assert.equal(typeof mod.renderCashWaterline, 'function', '组件层出口（→ blocks）必须能取到渲染入口');
    assert.equal(typeof mod.cashWaterlineCss, 'function');
    assert.equal(mod.renderCashWaterline(WATERLINE), renderCashWaterline(WATERLINE), '两条路必须是同一份实现');
  });
});

/* ── ④ 两档几何（真机） ─────────────────────────────────────────────── */

/** 关键语义槽：这些槽里的字**一个都不许被 `…` 截断**（钱数／日期／底线／判定）。 */
const KEY_SLOTS = ['line-text', 'card-total', 'low-day', 'low-spend', 'low-pct', 'net', 'thr-text', 'over', 'title', 'stamp', 'head-extra'];

/** 四档容器宽度：320（小屏）／390（手机）／620（窄宽边界，正好跨过 620 那道坎）／1280（桌面）。 */
const WIDTHS = [320, 390, 620, 1280];

/** 六种压力样例：水位柱（10 天，逐格刻度）／一个月满格／月中标今天／子弹图（4 周）／三栏／极端长串。
 *  `cols`＝柱子根数（0＝不是水位柱）；`perColumn`＝这一档是不是**逐格刻度**（≤14 天才逐格）。 */
function cases() {
  const month = Array.from({ length: 31 }, (_, i) => ({ label: '09-' + String(i + 1).padStart(2, '0'), pct: 100 - i * 3, spend: i }));
  return [
    { name: 'waterline', html: renderCashWaterline(WATERLINE), cols: DAYS.length, perColumn: true },
    { name: 'month', html: renderCashWaterline({ ...WATERLINE, days: month, todayIndex: 30 }), cols: 31, perColumn: false },
    { name: 'today-mid', html: renderCashWaterline({ ...WATERLINE, todayIndex: 5 }), cols: DAYS.length, perColumn: true },
    { name: 'bullet', html: renderCashWaterline(BULLET), cols: 0, perColumn: false },
    { name: 'flow', html: renderCashWaterline(FLOW), cols: 0, perColumn: false },
    /* 极端长串（200 字标题 ＋ 反复的印）：根**恒**不许比容器宽（旧写法在 320 档实测 927/320 就在这）。 */
    {
      name: 'long',
      html: renderCashWaterline({
        title: '标'.repeat(200), stamp: '预算 999 999 999 999 元 · '.repeat(6),
        days: month, todayIndex: 30, budget: 6000,
      }),
      cols: 31,
      perColumn: false,
    },
  ];
}

describe('cash-waterline ④ 两档几何（真机 headless Chrome ＋ CDP）', () => {
  it('容器 320／390／620／1280：零横向溢出、关键语义零截断、刻度逐格对齐、各套皮肤下标记逐字节相同', async (t) => {
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const html = SKIN_NAMES
      .map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n');
    const page = await startShapesPage({ html, css: skinCss() + '\n' + cashWaterlineCss() });
    if (page === null) return t.skip('本机无 Chrome／Chromium：两档几何判据需真浏览器');
    try {
      const seen = [];
      for (const width of WIDTHS) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of SKIN_NAMES) {
          for (const c of cases()) {
            const scope = '.' + skinClass(skin) + ' [data-case="' + c.name + '"] ';
            const root = await page.read([scope + '.' + CASH_WATERLINE_CLASS]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            assert.ok(root[0].maxScrollW <= root[0].maxClientW + 1,
              width + ' 档 ' + skin + ' ' + c.name + '：根横向溢出 ' + root[0].maxScrollW + ' > ' + root[0].maxClientW);
            assert.equal(root[0].scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            const keys = await page.read(KEY_SLOTS.map((slot) => scope + '.' + cashWaterlineSlot(slot)));
            for (const one of keys) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel
                + ' 有 ' + one.clipped + ' 处被截断（可见 ' + one.visible + ' 处）');
            }
            if (c.cols > 0) {
              const cols = await page.read([scope + '.' + cashWaterlineSlot('col')]);
              assert.equal(cols[0].visible, c.cols, width + ' 档 ' + skin + ' ' + c.name + '：柱子根数不对');
              /* **刻度字的文字框得整枚落在本件里**（折行不算截断：判据看的是文字框有没有出件）。 */
              const inside = await page.ev('(function(){var root=document.querySelector('
                + JSON.stringify(scope + '.' + CASH_WATERLINE_CLASS) + ');'
                + 'var rr=root.getBoundingClientRect();var cells=[].slice.call(root.querySelectorAll('
                + JSON.stringify('.' + cashWaterlineSlot('xax-cell')) + '));var outL=0,outR=0,marked=0;'
                + 'for(var i=0;i<cells.length;i+=1){if(cells[i].textContent==="")continue;'
                + 'var rng=document.createRange();rng.selectNodeContents(cells[i]);var rects=rng.getClientRects();'
                + 'if(rects.length===0)continue;marked+=1;'
                + 'for(var j=0;j<rects.length;j+=1){if(rects[j].left<rr.left-1)outL+=1;if(rects[j].right>rr.right+1)outR+=1;}}'
                + 'return {marked:marked,outL:outL,outR:outR};}())');
              assert.ok(inside.marked > 0, width + ' 档 ' + skin + ' ' + c.name + '：一格刻度字都没量到');
              assert.equal(inside.outL + inside.outR, 0, width + ' 档 ' + skin + ' ' + c.name
                + '：有刻度字跑出本件（左 ' + inside.outL + '／右 ' + inside.outR + ' 枚被切）');
              /* **逐格刻度才谈对齐**：一格一天时，刻度字所在的格子中心与它那一天的柱子中心对齐
                 （旧写法 `space-between` 在 390／620／1280 三档分别偏 31.8／43.3／67.6px ＝ 指错柱子）。 */
              if (c.perColumn) {
                const align = await page.ev('(function(){var root=document.querySelector('
                  + JSON.stringify(scope + '.' + CASH_WATERLINE_CLASS) + ');'
                  + 'function cs(el){var r=el.getBoundingClientRect();return (r.left+r.right)/2;}'
                  + 'var cols=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + cashWaterlineSlot('col')) + ')).map(cs);'
                  + 'var cells=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + cashWaterlineSlot('xax-cell')) + '));'
                  + 'var worst=0,marked=0;'
                  + 'for(var i=0;i<cells.length;i+=1){if(cells[i].textContent==="")continue;marked+=1;'
                  + 'worst=Math.max(worst,Math.round(Math.abs(cs(cells[i])-cols[i])*10)/10);}'
                  + 'return {worst:worst,marked:marked};}())');
                assert.ok(align.marked > 0, width + ' 档 ' + skin + ' ' + c.name + '：逐格刻度一枚都没量到');
                assert.ok(align.worst <= 1,
                  width + ' 档 ' + skin + ' ' + c.name + '：刻度离自己那根柱最远 ' + align.worst + 'px（超过 1px 就是指错柱子）');
              }
              /* 画布高度两档（派生的常量，不抄字面量）：620 及以下是窄档、620 以上是宽档。 */
              const h = await page.ev('(function(){return Math.round(document.querySelector('
                + JSON.stringify(scope + '.' + cashWaterlineSlot('plot')) + ').getBoundingClientRect().height);}())');
              const wantH = width <= 620 ? CASH_WATERLINE_NARROW_PLOT_HEIGHT_PX : CASH_WATERLINE_PLOT_HEIGHT_PX;
              assert.equal(h, wantH, width + ' 档：画布高度实测 ' + h + '（要 ' + wantH + '）');
            }
            if (c.name === 'bullet') {
              const rails = await page.read([scope + '.' + cashWaterlineSlot('rail'), scope + '.' + cashWaterlineSlot('rail-thr')]);
              assert.equal(rails[0].visible, WEEKS.length, width + ' 档 ' + skin + '：轨道数不对');
              assert.equal(rails[1].visible, WEEKS.length, width + ' 档 ' + skin + '：底线刻度数不对');
            }
            if (c.name === 'flow') {
              const three = await page.ev('(function(){var el=document.querySelector('
                + JSON.stringify(scope + '.' + cashWaterlineSlot('three')) + ');'
                + 'return getComputedStyle(el).gridTemplateColumns.split(" ").length;}())');
              assert.equal(three, width <= 620 ? 1 : 3, width + ' 档 ' + skin + '：三栏的列数不对（实测 ' + three + '）');
            }
            seen.push({ width, skin, name: c.name, rootScrollW: root[0].maxScrollW, rootClientW: root[0].maxClientW });
          }
        }
        /* **各套皮肤下标记逐字节相同**（换皮不换结构）：同一格里各只皮肤容器的 innerHTML 逐字节比。 */
        const markup = await page.ev('(function(){var out={};'
          + 'var skins=' + JSON.stringify([...SKIN_NAMES]) + ';'
          + 'for (var i=0;i<skins.length;i+=1){var box=document.querySelector("." + "ilife-skin-" + skins[i]);'
          + 'out[skins[i]]=box===null?"":box.innerHTML;}return out;}())');
        assert.ok(markup[SKIN_NAMES[0]].length > 0, width + ' 档：真机上拿不到标记');
        for (const skin of SKIN_NAMES.slice(1)) {
          assert.equal(markup[skin], markup[SKIN_NAMES[0]],
            width + ' 档：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同（只许样式不同）');
        }
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of WIDTHS) {
        const rows = seen.filter((s) => s.width === w);
        console.log('READING cash-waterline container=' + w
          + ' maxRootScrollW=' + Math.max(...rows.map((s) => s.rootScrollW))
          + ' maxRootClientW=' + Math.max(...rows.map((s) => s.rootClientW))
          + ' cells=' + rows.length);
      }
    } finally { page.close(); }
  });
});
