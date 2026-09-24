/** cash-waterline（现金水位 · 三形态：`waterline` 逐日水位柱／`bullet` 每周子弹图／`flow` 进出水三栏）· 契约测试。
 *
 * 覆盖四组判据：
 *  ① **渲染契约**：三个形态的结构（类名与槽位）／柱高与条宽**从读数算出来**／
 *     跌破底线的判定与告急日点名／越过 100% 的读数点名／判定句／转义面／
 *     **全部**非法入参分支（每个都断 `BlocksError`，含「形态与读数对不上」那一族）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且**作用域恰一次**、
 *     零 `:root`／`!important`／零 `@media`（宽度只许 `@container`，且自己声明了容器）／
 *     零手写色值（兜底链那处除外）／源码级零手写 `var(--ilife-…)`；
 *     `dist/components/cash-waterline/**` 剥掉字面量与注释后不出现 `document.`／`window.`／`navigator.`；
 *  ③ **加法式**：不启用这件时页面产物逐字节不变；渲染本件不改动别件的产物；
 *  ④ **两档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 390 与 1280 下零横向溢出、
 *     关键语义（钱数／日期／底线／判定）零截断、**各套皮肤下标记逐字节相同**。
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
  CASH_WATERLINE_MAX_AXIS_LABELS,
  CASH_WATERLINE_MAX_DAYS,
  CASH_WATERLINE_MAX_LINES,
  CASH_WATERLINE_MAX_WEEKS,
  CASH_WATERLINE_MISSING,
  CASH_WATERLINE_PLOT_HEIGHT_PX,
  CASH_WATERLINE_SLOTS,
  cashWaterlineCss,
  cashWaterlineSlot,
  renderCashWaterline,
} from '../dist/components/cash-waterline/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderStackedBar } from '../dist/components/stacked-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKIN_TOKEN_NAMES, skinClass, skinCss, skinTokenVar } from '../dist/components/skin/index.js';
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

/* ── 三份正例（读数与原型墙上那一件同值） ─────────────────────────────── */

/** 形态 A：09-15 余量 82% → 09-24 余量 22%，09-21 起跌破 30% 底线（4 天），今天＝最后一格。 */
const DAYS = [
  { label: '09-15', pct: 82 }, { label: '09-16', pct: 74 }, { label: '09-17', pct: 66 },
  { label: '09-18', pct: 58 }, { label: '09-19', pct: 52 }, { label: '09-20', pct: 44 },
  { label: '09-21', pct: 29, spend: 240 }, { label: '09-22', pct: 26, spend: 260 },
  { label: '09-23', pct: 24, spend: 300 }, { label: '09-24', pct: 22 },
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
  it('骨架：卡头 → 画布（底线 ＋ 逐日柱）→ 横轴 → 图例 → 点名 → 口径', () => {
    const html = renderCashWaterline(WATERLINE);
    assert.match(html, new RegExp('^<div class="' + CASH_WATERLINE_CLASS + ' is-waterline"'));
    assert.match(html, /-title">本月可用余量 · 逐日</);
    assert.match(html, /-stamp">预算 6 000 元</);
    assert.match(html, /-plot" role="img" aria-label="逐日水位柱：09-15 余量 82%，09-24 余量 22%；底线 30%；09-21 起 4 天跌破底线"/,
      '整张水位是**一张图**：读屏拿到首尾余量与底线');
    assert.equal((html.match(/-col /g) || []).length, DAYS.length, '逐日出格');
    assert.match(html, /-thr" aria-hidden="true"><b class="[^"]*-thr-text">底线 30%<\/b>/,
      '底线那枚标签**有字**（不是只靠一条线）');
    assert.equal((html.match(/is-low/g) || []).length >= 4, true, '跌破底线的那几天有低档标记');
    assert.match(html, /-xax"/, '横轴在');
    assert.match(html, /-low-title">跌破底线的日子 · 4 天</, '点名那块写着几天');
    assert.ok(!/<script/i.test(html), '不产脚本');
  });

  it('柱高**从读数算出来**：逐日 `--cash-waterline-h` 与入参 pct 一一对上', () => {
    const html = renderCashWaterline(WATERLINE);
    const heights = [...html.matchAll(new RegExp('-col[^"]*" aria-hidden="true"><i class="[^"]*-fill" style="'
      + '--cash-waterline-h: ([0-9.]+)%"', 'g'))].map((m) => Number(m[1]));
    assert.deepEqual(heights, DAYS.map((d) => d.pct), '柱高＝当天余量（一处算、一处用）');
    assert.equal(heights.length, DAYS.length);
  });

  it('跌破底线＝**严格小于**底线：正好压在线上不算跌破', () => {
    const onLine = renderCashWaterline({ title: 'x', days: [{ label: 'a', pct: 30 }, { label: 'b', pct: 29 }] });
    const lows = [...onLine.matchAll(/-col (is-low|is-keep)/g)].map((m) => m[1]);
    assert.deepEqual(lows, ['is-keep', 'is-low'], '30% 与底线齐平＝还在线上；29% 才算跌破');
    assert.match(onLine, /-low-title">跌破底线的日子 · 1 天</);
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

  it('今天：整列软底＋描边、轴上写「今天」——**形 ＋ 字 ＋ 色**三样都在', () => {
    const html = renderCashWaterline(WATERLINE);
    assert.match(html, /-col is-low is-today"/, '今天那一格照常有它的低档/非低档标记');
    assert.match(html, /-xax-cell is-today">今天</, '今天那一格的字在轴上');
    assert.match(html, /<i class="[^"]*-swatch is-today" aria-hidden="true"><\/i><span>今天<\/span>/);
    const none = renderCashWaterline({ title: 'x', days: [{ label: 'a', pct: 80 }] });
    assert.equal(none.includes('is-today'), false, '不给 todayIndex 就不标今天');
  });

  it('横轴刻度**算出来的**：至多 6 枚、首尾必出（多了就是压字）', () => {
    const html = renderCashWaterline(WATERLINE);
    const cells = [...html.matchAll(/-xax-cell[^>]*>([^<]*)</g)].map((m) => m[1]);
    assert.ok(cells.length <= CASH_WATERLINE_MAX_AXIS_LABELS, '刻度字至多 ' + CASH_WATERLINE_MAX_AXIS_LABELS + ' 枚，实际 ' + cells.length);
    assert.equal(cells[0], '09-15', '第一枚必出');
    assert.equal(cells[cells.length - 1], '今天', '最后一枚必出（今天那一格写「今天」）');
    const many = Array.from({ length: CASH_WATERLINE_MAX_DAYS }, (_, i) => ({ label: 'd' + i, pct: 90 - i }));
    const wide = renderCashWaterline({ title: 'x', days: many });
    assert.ok((wide.match(/-xax-cell/g) || []).length <= CASH_WATERLINE_MAX_AXIS_LABELS, '一个月也不许多出刻度字');
    assert.match(wide, />d0</, '首日仍要出');
    assert.match(wide, />d30</, '末日仍要出');
  });

  it('底线可调：`thresholdPct` 上屏在标签与图上两处（同一份真值）', () => {
    const html = renderCashWaterline({ ...WATERLINE, thresholdPct: 45 });
    assert.match(html, /-thr-text">底线 45%<\/b>/);
    assert.match(html, /^<div class="[^"]*" style="--cash-waterline-thr: 45%">/, '画布上的位置与标签同源');
    assert.equal(CASH_WATERLINE_DEFAULT_THRESHOLD_PCT, 30, '缺省底线＝原型墙上的 30%');
    assert.match(renderCashWaterline(WATERLINE), /--cash-waterline-thr: 30%/, '不给就用缺省值');
  });

  it('口径行：不给就由本件按形态写一句（贴着自己的形态）', () => {    const waterline = renderCashWaterline(WATERLINE);
    assert.match(waterline, /-note">口径：柱高＝当天结束时「预算 − 已花」占预算的百分比/);
    assert.match(renderCashWaterline(BULLET), /-note">口径：横条＝本周结束时累计已用掉的比例/);
    assert.match(renderCashWaterline(FLOW), /-note">口径：进／出／余三栏同一口径/);
    const own = renderCashWaterline({ ...WATERLINE, note: '这是我自己写的口径。' });
    assert.match(own, /-note">这是我自己写的口径。</, '给了口径就用调用方的');
  });

  it('无障碍：水位那张**图**挂 `role="img"` ＋ 一句总述；逐周／三栏里全是字，**不许**挂 `role="img"`', () => {
    assert.match(renderCashWaterline(WATERLINE), /-plot" role="img" aria-label="逐日水位柱：/,
      '纯图形的画布是**一张图**，读屏拿一句总述');
    const bullet = renderCashWaterline(BULLET);
    assert.match(bullet, /-bullet" role="group" aria-label="[^"]*第 1 周 已用 20.7%/,
      '子弹图的字都在行里，整块只给一个组名');
    assert.equal(/role="img"/.test(bullet), false, '挂 role="img" 会把子树里的字从读屏里抹掉');
    const flow = renderCashWaterline(FLOW);
    assert.match(flow, /-three" role="group" aria-label="[^"]*进 8 320 元/);
    assert.equal(/role="img"/.test(flow), false);
  });
});

describe('cash-waterline ① 渲染契约（形态 B 每周子弹图）', () => {  it('逐周一行：名字 ｜ 进 ｜ 出 ｜ 净（带符号）＋ 轨道（填充＋底线刻度）', () => {
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
});

describe('cash-waterline ① 渲染契约（形态 C 进出水三栏）', () => {
  it('三栏：进／出／余，栏头带笔数与合计，逐行「条 ＋ 名字 ＋ 钱数」', () => {
    const html = renderCashWaterline(FLOW);
    assert.match(html, new RegExp('^<div class="' + CASH_WATERLINE_CLASS + ' is-flow"'));
    assert.match(html, /-card-name is-in">进</);
    assert.match(html, /-card-count">2 笔</);
    assert.match(html, /-card-total">8 320 元</);
    assert.match(html, /-card-name is-out">出</);
    assert.match(html, /-card-count">3 笔</);
    assert.match(html, /-card-total">6 140 元</);
    assert.match(html, /-card-name is-left">余</);
    assert.match(html, /-card-count">占预算 36.3%</);
    assert.match(html, /-card-total">2 180 元</);
    assert.match(html, /-line-text">工资 8 000 元</);
    assert.match(html, /-line-text">日均 256 元</);
  });

  it('条宽按同行合计算（进栏 8 000/8 320＝96.2%；出栏 3 180/6 140＝51.8%）', () => {
    const html = renderCashWaterline(FLOW);
    const fills = [...html.matchAll(/-line-fill" aria-hidden="true" style="--cash-waterline-w: ([0-9.]+)%"/g)]
      .map((m) => Number(m[1]));
    assert.deepEqual(fills, [96.2, 3.8, 51.8, 31.9, 16.3, 36.3], '逐行条宽与读数同出一份真值');
  });

  it('判定**写成字**（撑得住／撑不住 ＋ 差多少），不只靠颜色', () => {
    const ok = renderCashWaterline(FLOW);
    assert.match(ok, /-verdict is-ok"><b class="[^"]*-verdict-word">✓ 撑得住<\/b>/);
    assert.match(ok, /按这 24 天的日均 256 元，剩下 6 天要花 1 536 元，还余 644 元。/);
    const bad = renderCashWaterline({
      ...FLOW, remainDays: 20, outflow: [{ name: '餐饮', amount: 6000 }],
    });
    assert.match(bad, /-verdict is-danger"><b class="[^"]*-verdict-word">！ 撑不住<\/b>/, '撑不住是**字**，不是只有红');
    assert.match(bad, /按这 24 天的日均 250 元，剩下 20 天要花 5 000 元，还差 2 680 元。/);
    assert.match(bad, /aria-label="[^"]*！ 撑不住——/, '读屏也拿到那句话');
  });

  it('超支：占比照实写负数（U+2212），条宽夹在 0（不画负条）', () => {
    const html = renderCashWaterline({ ...FLOW, outflow: [{ name: '餐饮', amount: 9000 }] });
    assert.match(html, /-card-count">占预算 −11.3%</);
    assert.match(html, /-card-total">−680 元</);
    assert.match(html, /-line-fill" aria-hidden="true" style="--cash-waterline-w: 0%"/, '负占比不画成负条');
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

  it('形态 A：`days` 的形状与逐日字段', () => {
    const day = (patch) => ({ ...WATERLINE, days: [patch] });
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x' })), true, '没给 days');
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x', days: [] })), true, '空 days');
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x', days: 'x' })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline(day(null))), true, '一天不是对象');
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ pct: 50 }))), true, '缺日期');
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: '', pct: 50 }))), true, '空日期');
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: 'a' }))), true, '缺余量');
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: 'a', pct: -1 }))), true);
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: 'a', pct: 101 }))), true);
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: 'a', pct: '50' }))), true, '字符串不算数');
    assert.equal(throwsBlocks(() => renderCashWaterline(day({ label: 'a', pct: 50, spend: '1' }))), true);
    const tooMany = Array.from({ length: CASH_WATERLINE_MAX_DAYS + 1 }, (_, i) => ({ label: 'd' + i, pct: 50 }));
    assert.equal(throwsBlocks(() => renderCashWaterline({ title: 'x', days: tooMany })), true, '超过一天上限');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, todayIndex: 10 })), true, '今天下标越界');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, todayIndex: -1 })), true);
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, todayIndex: 1.5 })), true);
  });

  it('形态 B：`weeks` 与 `budget`', () => {
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
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...WATERLINE, budget: 6000 })), true, '水位柱不吃 budget');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...BULLET, days: DAYS })), true, '子弹图不吃 days');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...BULLET, todayIndex: 0 })), true, '子弹图不吃 todayIndex');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...FLOW, days: DAYS })), true, '三栏不吃 days');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...FLOW, weeks: WEEKS })), true, '三栏不吃 weeks');
    assert.equal(throwsBlocks(() => renderCashWaterline({ ...FLOW, todayIndex: 0 })), true);
  });

  it('转义面：标题／口径／日期／名字逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderCashWaterline({
      title: evil, stamp: evil, note: evil, days: [{ label: evil, pct: 10, spend: 1 }], todayIndex: 0,
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签：' + html.slice(0, 160));
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    const flow = renderCashWaterline({
      ...FLOW, inflow: [{ name: evil, amount: 1 }],
    });
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

  it('样式段非空；槽位闭集与类名一致；每条选择器 scope 在 `.ilife-page-ui` 之下**且作用域恰一次**', () => {
    assert.ok(stripComments(css).trim() !== '', '样式段必须非空');
    assert.equal(cashWaterlineSlot('plot'), CASH_WATERLINE_CLASS + '-plot');
    assert.equal(cashWaterlineSlot('plot', 'x-'), 'x-block-cash-waterline-plot');
    /* 抽出**所有**规则的选择器（含 `@container` 块里缩进的那几条：配平花括号扫）。 */
    const selectors = [];
    let buf = '';
    for (const ch of stripComments(css)) {
      if (ch === '{') {
        const sel = buf.trim();
        buf = '';
        if (sel !== '' && !sel.startsWith('@')) selectors.push(sel);
      } else if (ch === '}') buf = '';
      else buf += ch;
    }
    assert.ok(selectors.length >= 20, '选择器数量不对：' + selectors.length);
    for (const raw of selectors) {
      for (const part of raw.split(',')) {
        const sel = part.trim();
        if (sel === '') continue;
        assert.ok(sel.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + sel);
        assert.equal(scopeHits(sel), 1, '作用域在一条选择器里只许出现一次（拼两遍＝永不命中）：' + sel);
        assert.ok(sel.includes(CASH_WATERLINE_CLASS), '选择器必须只碰本件类名：' + sel);
      }
    }
  });

  it('零 `:root`／`!important`／零 `@media`／零新 token；`@container` 有容器（宽度只许容器判）', () => {
    const clean = stripComments(css);
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
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => skinTokenVar(k)));
    const unknown = [...new Set([...clean.matchAll(/--ilife-[a-z0-9-]+/g)].map((m) => m[0]))].filter((n) => !known.has(n));
    assert.deepEqual(unknown, [], '名单外的 --ilife-* 名（拼错会被静默兜底）：' + unknown.join('、'));
  });

  it('零手写色值（除皮肤兜底链那处）；源码级零手写 `var(--ilife-…)`', () => {
    const clean = stripComments(css);
    const hexes = [...clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)];
    for (const m of hexes) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外不许有颜色字面量');
    const src = stripComments(readFileSync(join(PKG, 'src', 'components', 'cash-waterline', 'style.ts'), 'utf8'));
    assert.deepEqual([...src.matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [], '源码里请改走 skinVar()');
    assert.equal(clean.includes('var(--ilife-accent,'), true, '强调色经 skinVar 走兜底链');
  });

  it('**选中与强调走强调色系**：今天＝`accent` 竖游标（柱是 `accent`／`danger` 实底）；没有一处拿墨色当面', () => {
    const clean = stripComments(css);
    assert.match(clean, /\.is-today::before \{[^}]*background: var\(--ilife-accent,/, '今天那根游标走强调色');
    assert.match(clean, /\.is-today \{[^}]*border: 2px solid var\(--ilife-accent,/, '图例里今天那枚是描边框');
    assert.match(clean, /-fill \{[^}]*background: var\(--ilife-accent,/);
    assert.equal(clean.includes('--ilife-ink'), true, '墨色只做字（`color`），不做面');
    for (const m of clean.matchAll(/(background(?:-color)?)\s*:\s*([^;{}]+)/g)) {
      assert.equal(/^var\(\s*--(?:ilife-ink(?:-[23])?|fg[23]?)\s*[,)]/.test(m[2].trim()), false,
        '拿正文墨色当了"面"：' + m[2].trim());
    }
  });

  it('尺寸事实写在一处：画布高度取常量；两档高度都是常量派生的', () => {
    assert.ok(stripComments(css).includes('height: ' + String(CASH_WATERLINE_PLOT_HEIGHT_PX) + 'px'));
    assert.equal(CASH_WATERLINE_PLOT_HEIGHT_PX >= 150, true, '画布得够高，柱高才读得出差别');
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

  it('**零键盘语汇**：标记与样式里不出现键帽／快捷键／键位／方向键那类词', () => {
    const src = ['attrs.ts', 'model.ts', 'render.ts', 'style.ts', 'index.ts', 'README.md']
      .map((f) => readFileSync(join(PKG, 'src', 'components', 'cash-waterline', f), 'utf8')).join('\n');
    for (const word of ['键帽', '快捷键', '键位', '方向键', '按 ⌘', 'ctrl', 'Ctrl']) {
      assert.equal(src.includes(word), false, '不许出现键盘语汇：' + word);
    }
    const html = renderCashWaterline(WATERLINE) + renderCashWaterline(BULLET) + renderCashWaterline(FLOW);
    assert.equal(/kbd|keydown|keyup/.test(html), false, '标记里不该有键盘相关的东西');
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
const KEY_SLOTS = ['line-text', 'card-total', 'low-day', 'low-spend', 'low-pct', 'net', 'thr-text', 'xax-cell', 'over'];

/** 三种压力样例：水位柱（10 天）／子弹图（4 周）／三栏（3 笔出项）＋ 一个月满格的水位柱。 */
function cases() {
  const month = Array.from({ length: 31 }, (_, i) => ({ label: '09-' + String(i + 1).padStart(2, '0'), pct: 100 - i * 3, spend: i }));
  return [
    { name: 'waterline', html: renderCashWaterline(WATERLINE) },
    { name: 'month', html: renderCashWaterline({ ...WATERLINE, days: month, todayIndex: 30 }) },
    { name: 'bullet', html: renderCashWaterline(BULLET) },
    { name: 'flow', html: renderCashWaterline(FLOW) },
  ];
}

describe('cash-waterline ④ 两档几何（真机 headless Chrome ＋ CDP）', () => {
  it('容器 390 与 1280：零横向溢出、关键语义零截断、各套皮肤下标记逐字节相同', async (t) => {
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const html = ['paper', 'broadsheet', 'neutral']
      .map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n');
    const page = await startShapesPage({ html, css: skinCss() + '\n' + cashWaterlineCss() });
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
            const root = await page.read([scope + '.' + CASH_WATERLINE_CLASS]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            assert.ok(root[0].maxScrollW <= root[0].maxClientW + 1,
              width + ' 档 ' + skin + ' ' + c.name + '：根横向溢出 ' + root[0].maxScrollW + ' > ' + root[0].maxClientW);
            assert.equal(root[0].scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            const keys = await page.read(KEY_SLOTS.map((slot) => scope + '.' + cashWaterlineSlot(slot)));
            for (const one of keys) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel
                + ' 有 ' + one.clipped + ' 处被截断（可见 ' + one.visible + ' 处）');
              if (one.visible > 0 && one.sel.endsWith('-thr-text')) {
                assert.ok(one.maxRight <= root[0].maxRight + 1, width + ' 档：底线那枚标签跑出本件');
              }
            }
            /* 水位柱：柱子根根有（390 档也不许少），且都在本件框内。 */
            if (c.name === 'waterline' || c.name === 'month') {
              const cols = await page.read([scope + '.' + cashWaterlineSlot('col')]);
              const want = c.name === 'waterline' ? DAYS.length : 31;
              assert.equal(cols[0].visible, want, width + ' 档 ' + skin + ' ' + c.name + '：柱子根数不对');
              assert.ok(cols[0].maxRight <= root[0].maxRight + 1, width + ' 档：柱子跑出本件');
            }
            /* 子弹图：轨道与底线刻度都在（刻度是**形状**，不是可选装饰）。 */
            if (c.name === 'bullet') {
              const rails = await page.read([scope + '.' + cashWaterlineSlot('rail'), scope + '.' + cashWaterlineSlot('rail-thr')]);
              assert.equal(rails[0].visible, WEEKS.length, width + ' 档 ' + skin + '：轨道数不对');
              assert.equal(rails[1].visible, WEEKS.length, width + ' 档 ' + skin + '：底线刻度数不对');
            }
            /* 三栏：窄档成一列、宽档三列（**容器**判的档，不是视口）。 */
            if (c.name === 'flow') {
              const three = await page.ev('(function(){var el=document.querySelector('
                + JSON.stringify(scope + '.' + cashWaterlineSlot('three')) + ');'
                + 'return getComputedStyle(el).gridTemplateColumns.split(" ").length;}())');
              assert.equal(three, width === 390 ? 1 : 3, width + ' 档 ' + skin + '：三栏的列数不对（实测 ' + three + '）');
            }
            if (c.name === 'waterline') {
              /* 画布高度两档不同：窄档 150／宽档 190（派生的常量，不抄字面量）。 */
              const h = await page.ev('(function(){return Math.round(document.querySelector('
                + JSON.stringify(scope + '.' + cashWaterlineSlot('plot')) + ').getBoundingClientRect().height);}())');
              assert.ok(h > 0, width + ' 档：画布高度量不到');
            }
            seen.push({ width, skin, name: c.name, rootScrollW: root[0].maxScrollW, rootClientW: root[0].maxClientW });
          }
        }
        /* **各套皮肤下标记逐字节相同**（换皮不换结构）：同一格里三只皮肤容器的 innerHTML 逐字节比。 */
        const markup = await page.ev('(function(){var out={};'
          + 'var skins=' + JSON.stringify(['paper', 'broadsheet', 'neutral']) + ';'
          + 'var names=' + JSON.stringify(cases().map((c) => c.name)) + ';'
          + 'for (var i=0;i<skins.length;i+=1){var box=document.querySelector("." + "ilife-skin-" + skins[i]);'
          + 'out[skins[i]]=box===null?"":box.innerHTML;}return out;}())');
        assert.ok(markup.paper.length > 0, width + ' 档：真机上拿不到标记');
        assert.equal(markup.broadsheet, markup.paper, width + ' 档：broadsheet 下的标记与 paper 下不同（只许样式不同）');
        assert.equal(markup.neutral, markup.paper, width + ' 档：neutral 下的标记与 paper 下不同（只许样式不同）');
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of [390, 1280]) {
        const rows = seen.filter((s) => s.width === w);
        console.log('READING cash-waterline container=' + w
          + ' maxRootScrollW=' + Math.max(...rows.map((s) => s.rootScrollW))
          + ' maxRootClientW=' + Math.max(...rows.map((s) => s.rootClientW))
          + ' cases=' + rows.length);
      }
    } finally { page.close(); }
  });
});
