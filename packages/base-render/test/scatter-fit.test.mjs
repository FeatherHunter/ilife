/** scatter-fit（相关性散点 · 三个形态：散点／分箱／滞后）· 契约测试。
 *
 * 覆盖五组判据：
 *  ① **渲染契约**：三个形态各自的槽位与枚数／**刻度与坐标同一份真值**（从**印出来的刻度**反推轴域，
 *     再把每个点的坐标对回它自己的读数——轴域不整齐的样例也在里面）／r 算不出时**不出线与带**／
 *     三形态的缺槽分支／转义面／**全部**非法入参分支（每个都断 `BlocksError`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且**只出现一次**
 *     （含 `@container` 里的那几条）、零 `:root`／`!important`／零新 token／零 `@media` 宽度查询／
 *     零手写色值（只有 `skinVar()` 兜底链那一处）／零把 `ink` 系当面／零键盘语汇／零可点元素／
 *     **窄档阈值只有一处来源**；
 *  ③ **加法式**：本件只读自己的类名；不启用它的页面零命中、逐字节不变；
 *  ④ **三档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 320／390／1280 下零横向溢出
 *     （含长口径／长轴名／12 位金额三种压力样例）、点全在图区内、刻度零截断、零 `overflow-x`；
 *     **起不来就退确定性几何判据并打印原因**；
 *  ⑤ **皮肤纪律**：同一份入参渲染三次逐字节相同、标记不带皮肤类、真机上四套皮肤里的 `innerHTML`
 *     逐字节相同、最强那一档真取到取值表里的软底与字色。
 *
 * 期望值一律从组件自己的常量派生（`SCATTER_FIT_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SCATTER_FIT_AXIS_INSET,
  SCATTER_FIT_BIN_MAX,
  SCATTER_FIT_BIN_MIN,
  SCATTER_FIT_BIN_MIN_SAMPLE,
  SCATTER_FIT_BIN_PX,
  SCATTER_FIT_CLASS,
  SCATTER_FIT_FORMS,
  SCATTER_FIT_LAG_MAX,
  SCATTER_FIT_LAG_MIN,
  SCATTER_FIT_MAX_LAG_DAYS,
  SCATTER_FIT_MAX_POINTS,
  SCATTER_FIT_MIN_POINTS,
  SCATTER_FIT_MISSING,
  SCATTER_FIT_NARROW_PX,
  SCATTER_FIT_PLOT_PX,
  SCATTER_FIT_SLOTS,
  SCATTER_FIT_X_TICKS,
  SCATTER_FIT_Y_TICKS,
  renderScatterFit,
  scatterFitCss,
  scatterFitSlot,
} from '../dist/components/scatter-fit/index.js';
import { renderHeatGrid } from '../dist/components/heat-grid/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKINS, skinCss, skinClass } from '../dist/components/skin/index.js';
import { SKIN_NAMES } from '../dist/components/skin/contract.js';
import { startShapesPage } from './shapes-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'scatter-fit');

/** 四套皮肤的取值表（期望色**从表里读**，判据里不抄色字面量）。 */
const SKIN_VALUES = Object.fromEntries(SKIN_NAMES.map((s) => [s, SKINS[s].values]));

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

/** 入参里**每个 `number` 叶子**的路径（`points[0].x` 这种；数组元素与嵌套对象都进去）。 */
function numberPaths(root) {
  const out = [];
  const walk = (v, at) => {
    if (typeof v === 'number') { out.push(at); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, at + '[' + i + ']')); return; }
    if (v !== null && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], at + '.' + k);
  };
  walk(root, '');
  return [...new Set(out)];
}

/** 把某个路径上的数换成坏数（原入参不改：克隆一份，坏数在克隆之后写进去）。 */
function withBadAt(root, path, value) {
  const clone = JSON.parse(JSON.stringify(root));
  const tokens = [...path.matchAll(/([A-Za-z_$][\w$]*)|\[(\d+)\]/g)]
    .map((m) => (m[1] === undefined ? Number(m[2]) : m[1]));
  let at = clone;
  for (let i = 0; i < tokens.length - 1; i += 1) at = at[tokens[i]];
  at[tokens[tokens.length - 1]] = value;
  return clone;
}

/** 五个坏数（口径与跨件不变量门 ① 同：`NaN`／`±Infinity`／`±1e308`）。 */
const BAD_READINGS = [
  ['Infinity', Number.POSITIVE_INFINITY],
  ['-Infinity', Number.NEGATIVE_INFINITY],
  ['NaN', Number.NaN],
  ['1e308', 1e308],
  ['-1e308', -1e308],
];

/** 逐字符配平花括号抽选择器（`@container` 块里的规则也算；正则式抽取会漏掉它们）。 */
function ruleSelectors(css) {
  const out = [];
  let buf = '';
  for (const ch of css) {
    if (ch === '{') {
      const sel = buf.trim();
      buf = '';
      if (sel !== '' && !sel.startsWith('@')) out.push(sel);
    } else if (ch === '}') {
      buf = '';
    } else {
      buf += ch;
    }
  }
  return out;
}

/** 一条规则（选择器 → 声明块），用于"某槽必须带某声明"这类判据。 */
function ruleOf(css, selector) {
  const at = css.indexOf(selector + ' {');
  if (at < 0) return '';
  const close = css.indexOf('}', at);
  return css.slice(at, close < 0 ? css.length : close);
}

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
        else if (css[j] === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      i = j + 1;
      continue;
    }
    out += css[i];
    i += 1;
  }
  return out;
}

const countOf = (html, needle) => (html.match(new RegExp(needle, 'g')) || []).length;

/** 刻度文字 → 数（`1,200 卡` → 1200；`1e+21` 原样）。 */
const tickNum = (text) => Number(text.replace(/[^0-9.eE+-]/g, ''));

/** **从印出来的刻度反推轴域**：第一枚与最后一枚就是上下界（轴顶恒等于顶刻度）。 */
function axisFromTicks(ticks) {
  const nums = ticks.map(tickNum);
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  return { lo, hi, steps: nums.length - 1 };
}

/** 按（从刻度反推的）轴域算：某个读数该落在的百分比（与 `scale.ts` 的映射同一套口径）。 */
function expectPct(value, axis) {
  const t = (value - axis.lo) / (axis.hi - axis.lo);
  return Number((SCATTER_FIT_AXIS_INSET + t * (100 - 2 * SCATTER_FIT_AXIS_INSET)).toFixed(2));
}

/** 点阵区里逐个点的行内坐标（顺序＝入参顺序）。 */
const dotsOf = (html) => [...html.matchAll(
  new RegExp('class="' + scatterFitSlot('dot') + '(?: is-outlier)?" style="left: ([\\d.-]+)%; bottom: ([\\d.-]+)%"', 'g'),
)].map((m) => ({ left: Number(m[1]), bottom: Number(m[2]) }));

const slotTexts = (html, slot) => [...html.matchAll(new RegExp('class="' + scatterFitSlot(slot) + '"[^>]*>([^<]*)<', 'g'))]
  .map((m) => m[1]);

/* ── 样例（三形态各一份；数字都用得上：轴的上下界、离群点、最强档） ─── */

const SCATTER_INPUT = {
  title: '体重 vs 每日摄入', xName: '每日摄入', yName: '体重', xUnit: '卡', yUnit: '公斤', stamp: '近 30 天',
  points: [
    { x: 1400, y: 66.4 }, { x: 1620, y: 66.8 }, { x: 1750, y: 66.6 }, { x: 1980, y: 67.1 },
    { x: 2150, y: 67.0 }, { x: 2380, y: 67.6 }, { x: 2520, y: 67.9 }, { x: 2700, y: 67.4 },
    { x: 2860, y: 68.2 }, { x: 1990, y: 68.6 },
    { x: 3000, y: 69.0, label: '08-30', outlier: '08-30 聚餐：一餐 1,400 卡' },
  ],
};
/** **轴域不整齐**的样例：区间不整除、上下界都不落在整数上（A1 的复现件）。 */
const ODD_INPUT = {
  title: '摄入 vs 体重', xName: '摄入', yName: '体重',
  points: [{ x: 1234, y: 1.05 }, { x: 3800, y: 1.51 }, { x: 5678, y: 2.05 }],
};
const BIN_INPUT = {
  title: '睡眠 vs 次日摄入', xName: '睡眠', yName: '次日摄入', yUnit: '卡', stamp: '近 60 天', form: 'bin',
  bins: [
    { label: '＜5.5 小时', low: 1560, median: 1980, high: 2380, count: 9 },
    { label: '5.5–6 小时', low: 1620, median: 2040, high: 2460, count: 12 },
    { label: '6–6.5 小时', low: 1480, median: 1900, high: 2320, count: 15 },
    { label: '6.5–7 小时', low: 1380, median: 1760, high: 2180, count: 14 },
    { label: '7–7.5 小时', low: 1320, median: 1700, high: 2120, count: 11 },
    { label: '＞7.5 小时', low: 1340, median: 1720, high: 2140, count: 7 },
  ],
};
const LAG_INPUT = {
  title: '训练 → 体重', xName: '训练', yName: '体重', yUnit: '公斤', stamp: '近 90 天', form: 'lag',
  lags: [
    { step: 0, r: 0.28 }, { step: 1, r: -0.46 }, { step: 2, r: -0.71 },
    { step: 3, r: -0.52 }, { step: 4, r: -0.31 }, { step: 5, r: 0.12 },
  ],
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('scatter-fit ① 渲染契约 · 形态 A 散点', () => {
  const html = renderScatterFit(SCATTER_INPUT);

  it('骨架：卡头 → 坐标框（纵轴刻度 ‖ 点阵区）＋ 横轴刻度 → 图例 → 脚注', () => {
    assert.match(html, new RegExp('^<div class="' + SCATTER_FIT_CLASS + ' is-scatter">'));
    assert.equal(countOf(html, 'class="[^"]*-ytick"'), SCATTER_FIT_Y_TICKS, '纵轴三档刻度');
    assert.equal(countOf(html, 'class="[^"]*-xtick"'), SCATTER_FIT_X_TICKS, '横轴五档刻度');
    assert.equal(countOf(html, 'class="' + scatterFitSlot('dot') + '( is-outlier)?"'),
      SCATTER_INPUT.points.length, '一个读数一个点');
    assert.equal(countOf(html, 'class="[^"]*-band"'), 1, '概率带');
    assert.equal(countOf(html, 'class="[^"]*-fitline"'), 1, '拟合线');
    assert.match(html, /role="img" aria-label="散点图：横轴 每日摄入 1,000 到 3,000 卡/);
    assert.match(html, /-tail">相关系数 \+0\.76，较强相关</, '卡头那句是**算出来**的');
    assert.ok(!/<script/i.test(html), '不产脚本');
    for (const slot of ['hd', 'title', 'stamp', 'plotbox', 'legend', 'note']) {
      assert.ok(html.includes(scatterFitSlot(slot)), '缺槽：' + slot);
    }
  });

  it('**轴域与刻度同一份真值**：从印出来的刻度反推轴域，每个点的坐标都对回它自己的读数', () => {
    for (const [name, input] of [['常规区间', SCATTER_INPUT], ['轴域不整齐', ODD_INPUT]]) {
      const h = renderScatterFit(input);
      const yTicks = slotTexts(h, 'ytick');
      const xTicks = slotTexts(h, 'xtick');
      assert.equal(yTicks.length, SCATTER_FIT_Y_TICKS, name + '：纵轴刻度枚数');
      assert.equal(xTicks.length, SCATTER_FIT_X_TICKS, name + '：横轴刻度枚数');
      const yAxis = axisFromTicks(yTicks);
      const xAxis = axisFromTicks(xTicks);
      /* 刻度等距（同一根轴上间隔一致）。 */
      const yNums = yTicks.map(tickNum);
      const yGap = (yNums[0] - yNums[yNums.length - 1]) / (SCATTER_FIT_Y_TICKS - 1);
      yNums.slice(0, -1).forEach((v, i) => assert.ok(Math.abs((v - yNums[i + 1]) - yGap) < 1e-6,
        name + '：纵轴刻度不等距 ' + JSON.stringify(yTicks)));
      /* 轴域必须盖得住数据，且**顶刻度就是轴顶**（否则读者按刻度读出来的值系统性偏小）。 */
      const ys = input.points.map((p) => p.y);
      const xs = input.points.map((p) => p.x);
      assert.ok(yAxis.lo <= Math.min(...ys) && yAxis.hi >= Math.max(...ys), name + '：纵轴域盖不住数据');
      assert.ok(xAxis.lo <= Math.min(...xs) && xAxis.hi >= Math.max(...xs), name + '：横轴域盖不住数据');
      assert.equal(expectPct(yAxis.hi, yAxis), 100 - SCATTER_FIT_AXIS_INSET, name + '：轴顶必须落在轴内距上');
      assert.equal(expectPct(yAxis.lo, yAxis), SCATTER_FIT_AXIS_INSET, name + '：轴底必须落在轴内距上');
      /* **逐点对账**：点的 `left`／`bottom` 必须等于「按刻度反推的轴域」算出来的位置。 */
      const dots = dotsOf(h);
      assert.equal(dots.length, input.points.length, name + '：点数');
      input.points.forEach((p, i) => {
        assert.equal(dots[i].bottom, expectPct(p.y, yAxis), name + '：第 ' + (i + 1) + ' 点的纵坐标与刻度对不上');
        assert.equal(dots[i].left, expectPct(p.x, xAxis), name + '：第 ' + (i + 1) + ' 点的横坐标与刻度对不上');
      });
    }
  });

  it('形状：概率带与拟合线都是百分比多边形（不写死像素），带的端点贴着轴内距', () => {
    const shapes = [...html.matchAll(/clip-path: (polygon\([^"]+\))"/g)].map((m) => m[1]);
    assert.equal(shapes.length, 2, '概率带一支、拟合线一支');
    for (const shape of shapes) {
      const nums = [...shape.matchAll(/([\d.]+)%/g)].map((m) => Number(m[1]));
      assert.equal(nums.length % 2, 0, '坐标成对');
      assert.equal(/px/.test(shape), false, '多边形里不许出现像素');
      assert.equal(nums[0], SCATTER_FIT_AXIS_INSET, '多边形左端在轴内距上：' + shape.slice(0, 60));
    }
  });

  it('离群点**点名**：画成圈（形）＋ 图例里写清原因（字），不静默丢掉', () => {
    assert.equal(countOf(html, 'class="' + scatterFitSlot('dot') + ' is-outlier"'), 1);
    assert.equal(countOf(html, 'legend-mark is-ring'), 1, '图例里那枚圈');
    assert.match(html, /离群点（08-30 聚餐：一餐 1,400 卡）/);
    assert.match(html, /title="08-30：每日摄入 3,000 卡，体重 69 公斤（08-30 聚餐：一餐 1,400 卡）"/);
  });

  it('**r 算不出就不画线与带**（形也断）：只画点 ＋ 脚注换成"只画点"的说明', () => {
    for (const [name, input, why] of [
      ['同一条竖线', { title: 'x', xName: 'A', yName: 'B', points: [{ x: 1, y: 2 }, { x: 1, y: 3 }] }, '横轴读数的值全相同'],
      ['同一条横线', { title: 'x', xName: 'A', yName: 'B', points: [{ x: 1, y: 1 }, { x: 2, y: 1 }] }, '纵轴读数的值全相同'],
      ['只有一个点', { title: 'x', xName: 'A', yName: 'B', points: [{ x: 1, y: 1 }] }, '只有一个点'],
    ]) {
      const h = renderScatterFit(input);
      assert.ok(h.includes('相关系数 ' + SCATTER_FIT_MISSING + '，' + why), name + '：卡头要说清原因');
      assert.equal(h.includes('+0.00'), false, name + '：不许把"算不出"写成 0');
      assert.equal(h.includes(scatterFitSlot('band')), false, name + '：算不出就不许画概率带');
      assert.equal(h.includes(scatterFitSlot('fitline')), false, name + '：算不出就不许画拟合线');
      assert.equal(/polygon\(/.test(h), false, name + '：不许留一条常数线的多边形');
      assert.ok(h.includes('所以只画点、不画线'), name + '：脚注口径要跟着换（不能一边不画线一边说线是最小二乘拟合）');
      assert.equal(h.includes('线是最小二乘拟合'), false, name + '：旧口径不许留在这一支里');
    }
    /* 有一个点就必须画出那一个点。 */
    assert.equal(countOf(renderScatterFit({ title: 'x', xName: 'A', yName: 'B', points: [{ x: 1, y: 1 }] }),
      'class="' + scatterFitSlot('dot') + '"'), 1);
  });
});

describe('scatter-fit ① 渲染契约 · 形态 B 分箱 / 形态 C 滞后', () => {
  const bin = renderScatterFit(BIN_INPUT);
  const lag = renderScatterFit(LAG_INPUT);

  it('B：每箱一根区间条 ＋ 一根中位线，箱标签对齐箱数，图例给「形 ＋ 字」', () => {
    assert.match(bin, new RegExp('^<div class="' + SCATTER_FIT_CLASS + ' is-bin">'));
    assert.equal(countOf(bin, 'class="[^"]*-bincol"'), BIN_INPUT.bins.length);
    assert.equal(countOf(bin, 'class="[^"]*-bin-range"'), BIN_INPUT.bins.length);
    assert.equal(countOf(bin, 'class="[^"]*-bin-median"'), BIN_INPUT.bins.length);
    assert.equal(countOf(bin, 'class="[^"]*-bintick"'), BIN_INPUT.bins.length, '箱标签与箱数一致');
    assert.match(bin, /-tail">按睡眠分 6 箱</);
    assert.match(bin, /legend-mark is-median"[^>]*><\/i>中位数/);
    assert.match(bin, /legend-mark is-range"[^>]*><\/i>下四分位到上四分位/);
    assert.match(bin, /title="＜5\.5 小时：中位数 1,980 卡，下四分位到上四分位 1,560 到 2,380 卡，9 个样本"/);
    const heights = [...bin.matchAll(/height: ([\d.]+)%/g)].map((m) => Number(m[1]));
    assert.equal(heights.length, BIN_INPUT.bins.length);
    for (const h of heights) assert.ok(h > 0, '区间条必须有高度：' + heights.join('、'));
    /* 分箱形态**没有**拟合线与概率带（那两段是散点形态的），图例两项、逐个有字。 */
    assert.equal(bin.includes(scatterFitSlot('band')), false);
    assert.equal(bin.includes(scatterFitSlot('fitline')), false);
    assert.equal(countOf(bin, 'class="[^"]*-legend-item"'), 2);
  });

  it('C：逐档一根条（宽 ＝ |r| × 50%），负号档往左，最强档**再写一遍字**；本形态不带图例', () => {
    assert.match(lag, new RegExp('^<div class="' + SCATTER_FIT_CLASS + ' is-lag">'));
    assert.equal(countOf(lag, 'class="[^"]*-lagrow[ "]'), LAG_INPUT.lags.length);
    const widths = [...lag.matchAll(/-lag-bar" aria-hidden="true" style="width: ([\d.]+)%"/g)].map((m) => Number(m[1]));
    assert.deepEqual(widths, LAG_INPUT.lags.map((g) => Number((Math.abs(g.r) * 50).toFixed(2))));
    assert.equal(countOf(lag, '-lagrow is-negative'), 4, '四个负号档（方向相反）');
    assert.match(lag, /-lagrow is-negative is-strong">/);
    assert.match(lag, /<b class="[^"]*-lag-strong">−0\.71 最强<\/b>/, '最强档写着字，不靠颜色');
    assert.match(lag, /-tail">最强在错开 2 天</);
    assert.equal(lag.includes('-laghead'), true, '表头那一行给「中线往左右各半 ＝ ±1」的口径');
    assert.equal(lag.includes(scatterFitSlot('legend')), false, '本形态不带图例（数字那一列就是读数）');
    assert.equal(lag.includes(scatterFitSlot('plot')), false, '本形态没有点阵区');
  });

  it('缺槽就不出那一槽（三形态各一支）：不给 stamp 就不出 stamp；bin／lag 的 dot／legend 段为空', () => {
    const bare = renderScatterFit({ title: 'x', xName: 'A', yName: 'B', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] });
    assert.equal(bare.includes(scatterFitSlot('stamp')), false);
    assert.match(bare, new RegExp('^<div class="' + SCATTER_FIT_CLASS + ' is-scatter">'));
    assert.ok(bare.includes('口径：线是最小二乘拟合'), '不给 note 就用本形态的口径句');
    const binBare = renderScatterFit({ title: 'x', xName: 'A', yName: 'B', form: 'bin', bins: BIN_INPUT.bins });
    assert.equal(binBare.includes(scatterFitSlot('stamp')), false);
    assert.equal(countOf(binBare, 'class="[^"]*-dot"'), 0, '分箱形态一个点都没有');
    const lagBare = renderScatterFit({ title: 'x', xName: 'A', yName: 'B', form: 'lag', lags: LAG_INPUT.lags });
    assert.equal(lagBare.includes(scatterFitSlot('stamp')), false);
    assert.equal(countOf(lagBare, 'class="[^"]*-dot"'), 0);
    const noted = renderScatterFit({
      title: 'x', xName: 'A', yName: 'B', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], note: '自定义口径',
    });
    assert.ok(noted.includes('>自定义口径</p>'));
    assert.equal(noted.includes('口径：线是最小二乘拟合'), false, '替换＝整句换掉');
  });
});

describe('scatter-fit ① 渲染契约 · 公共面与非法入参', () => {
  it('转义面：标题／轴名／单位／点名／口径逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderScatterFit({
      title: evil, xName: evil, yName: evil, xUnit: evil, yUnit: evil, stamp: evil, note: evil,
      points: [{ x: 1, y: 1, label: evil, outlier: evil }, { x: 2, y: 2 }],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    const binEvil = renderScatterFit({
      title: 'x', xName: evil, yName: 'B', form: 'bin',
      bins: [{ label: evil, low: 1, median: 2, high: 3, count: 5 }, { label: evil, low: 1, median: 2, high: 3, count: 5 }],
    });
    assert.equal(/<script/i.test(binEvil), false);
    assert.equal(/<span class="[^"]*"[^>]*>[^<]*<script/.test(binEvil), false);
  });

  it('**大到只给指数写法的刻度不许被三位分组切开**（`1e,+21` 那种）', () => {
    const huge = renderScatterFit({
      title: 'x', xName: 'A', yName: 'B',
      points: [{ x: 1e21, y: 1 }, { x: 2e21, y: 2 }],
    });
    assert.equal(/e,/.test(huge), false, '指数写法里不许插进逗号：' + (huge.match(/[^>]*e,[^<]*/) || [''])[0]);
    assert.equal(/,\+/.test(huge), false);
    assert.ok(huge.includes('e+21'), '量级大到只给指数时原样写：' + (huge.match(/class="[^"]*-xtick">[^<]*/) || [''])[0]);
    /* 小数量级不受影响（同一支函数的另一头）：刻度照常是数，轴域照常盖住数据。 */
    const tiny = renderScatterFit({
      title: 'x', xName: 'A', yName: 'B', points: [{ x: 1.05, y: 1.05 }, { x: 2.05, y: 2.05 }],
    });
    const tinyTicks = slotTexts(tiny, 'xtick').map(tickNum);
    assert.equal(tinyTicks.every((v) => Number.isFinite(v)), true, '小数刻度必须是可读的数：' + JSON.stringify(tinyTicks));
    assert.ok(Math.min(...tinyTicks) <= 1.05 && Math.max(...tinyTicks) >= 2.05,
      '小数轴域要盖住数据：' + JSON.stringify(tinyTicks));
  });

  it('入参违规一律拒（不静默降级）：形态／空白串／点数／轴名／箱／档 逐条', () => {
    assert.deepEqual([...SCATTER_FIT_FORMS], ['scatter', 'bin', 'lag']);
    const ok = { title: 'x', xName: 'A', yName: 'B', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] };
    assert.equal(throwsBlocks(() => renderScatterFit(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderScatterFit([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderScatterFit({ xName: 'A', yName: 'B', points: ok.points })), true, '缺标题');
    assert.equal(throwsBlocks(() => renderScatterFit({ title: 'x', yName: 'B', points: ok.points })), true, '缺横轴名');
    assert.equal(throwsBlocks(() => renderScatterFit({ title: 'x', xName: 'A', points: ok.points })), true, '缺纵轴名');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, title: '' })), true);
    /* **全空白串＝不是文本**（会在屏上留一块空白）：必填与可选两档都拒。 */
    for (const field of ['title', 'xName', 'yName']) {
      assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, [field]: '   ' })), true, field + ' 全空白应拒');
      assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, [field]: '\u3000\t' })), true, field + ' 全角空白也应拒');
    }
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, stamp: '   ' })), true, '可选文本全空白同样拒');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, note: ' \n ' })), true);
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, xUnit: '  ' })), true);
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, form: 'cloud' })), true, '形态闭集外');
    assert.equal(throwsBlocks(() => renderScatterFit({ title: 'x', xName: 'A', yName: 'B' })), true, '散点缺 points');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, points: [] })), true, '一条读数都没有');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, points: 'x' })), true, 'points 不是数组');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, points: [null, { x: 1, y: 1 }] })), true, '元素不是对象');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, points: [{ x: '1', y: 1 }, { x: 2, y: 2 }] })), true, 'x 不是数');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, points: [{ x: 1, y: Number.NaN }, { x: 2, y: 2 }] })), true, 'y 是 NaN');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, points: [{ x: 1, y: 1, outlier: '  ' }, { x: 2, y: 2 }] })), true,
      'outlier 全空白＝"点名了但没说原因"');
    /* 可选的文本字段：**空串＝未给**（与全层 `optText` 同口径），故空串的 `outlier` 不算点名。 */
    const blank = renderScatterFit({ ...ok, points: [{ x: 1, y: 1, outlier: '' }, { x: 2, y: 2 }] });
    assert.equal(blank.includes('is-outlier'), false, '空串＝未点名（不画成圈）');
    assert.equal(blank.includes('legend-mark is-ring'), false);
    /* 形态 B：缺 bins／箱数／次序／样本数。 */
    const binOk = { title: 'x', xName: 'A', yName: 'B', form: 'bin' };
    const one = { label: 'a', low: 1, median: 2, high: 3, count: SCATTER_FIT_BIN_MIN_SAMPLE };
    assert.equal(throwsBlocks(() => renderScatterFit(binOk)), true, '分箱缺 bins');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...binOk, bins: [one] })), true, '箱数低于下限');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...binOk, bins: new Array(SCATTER_FIT_BIN_MAX + 1).fill(one) })), true, '箱太多');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...binOk, bins: [one, null] })), true, '元素不是对象');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...binOk, bins: [one, { ...one, label: '' }] })), true, '箱标签空');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...binOk, bins: [one, { ...one, label: '\u3000' }] })), true, '箱标签全空白');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...binOk, bins: [one, { ...one, low: 9, median: 2 }] })), true,
      '次序反了（low ≤ median ≤ high）');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...binOk, bins: [one, { ...one, high: Number.POSITIVE_INFINITY }] })), true);
    assert.equal(throwsBlocks(() => renderScatterFit({
      ...binOk, bins: [one, { ...one, count: SCATTER_FIT_BIN_MIN_SAMPLE - 1 }],
    })), true, '样本太薄（每箱至少 ' + SCATTER_FIT_BIN_MIN_SAMPLE + ' 个）');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...binOk, bins: [one, { ...one, count: 5.5 }] })), true, '样本数不是整数');
    /* 形态 C：缺 lags／档数／天数／次序／r 越界。 */
    const lagOk = { title: 'x', xName: 'A', yName: 'B', form: 'lag' };
    const g0 = { step: 0, r: 0.2 };
    const g1 = { step: 1, r: -0.4 };
    assert.equal(throwsBlocks(() => renderScatterFit(lagOk)), true, '滞后缺 lags');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...lagOk, lags: [g0] })), true, '档数低于下限');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...lagOk, lags: new Array(SCATTER_FIT_LAG_MAX + 1).fill(g0) })), true, '档太多');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...lagOk, lags: [g0, { ...g1, step: SCATTER_FIT_MAX_LAG_DAYS + 1 }] })), true,
      '错开太多天');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...lagOk, lags: [g1, g0] })), true, '错开天数没递增');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...lagOk, lags: [g0, { ...g1, step: 0.5 }] })), true, '天数不是整数');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...lagOk, lags: [g0, { ...g1, r: 1.4 }] })), true, 'r 越界');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...lagOk, lags: [g0, { ...g1, r: 'x' }] })), true, 'r 不是数');
    /* 附加类名：类型不对一律拒。 */
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, extraClass: 'a"b' })), true);
    assert.equal(throwsBlocks(() => renderScatterFit({ ...ok, extraClass: '   ' })), true);
  });

  /* 返修 2026-09（跨件不变量门 ① · 非有限数一律拒）：三形态的样例里**每个** number 字段逐个换成五个坏数，
     渲染入口必须抛 `BlocksError`——收下就会在轴上写出 `9e+307`／`1.1e+308` 那种读不出来的数。
     `1e21` 那一档**不是**坏数（十进制写法与指数写法的分界，本层当读数写）：它由上一条判据守着。 */
  it('**非有限数与超量级读数一律拒**：五个坏数逐个打进每个 number 字段', () => {
    const inputs = [SCATTER_INPUT, BIN_INPUT, LAG_INPUT];
    let cases = 0;
    const got = [];
    for (const input of inputs) {
      /* 先证明这份样例本身是合法的（不然"抛错"可能来自别的字段，判据空转）。 */
      assert.equal(typeof renderScatterFit(input), 'string', '样例入参必须直渲成功');
      for (const path of numberPaths(input)) {
        for (const [text, value] of BAD_READINGS) {
          cases += 1;
          if (!throwsBlocks(() => renderScatterFit(withBadAt(input, path, value)))) {
            got.push(path + ' ← ' + text);
          }
        }
      }
    }
    assert.ok(cases >= 20, '扫到的 number 字段太少（判据会空转）：只有 ' + String(cases) + ' 例');
    assert.deepEqual(got, [], '这些坏数被收下了（入参违规一律拒，必须抛 BlocksError）：' + got.join('；'));
  });

  it('上限下限是**自证**的（边界值能过、越界一条就拒），不抄字面量', () => {
    const base = { title: 'x', xName: 'A', yName: 'B' };
    const p = (n) => new Array(n).fill({ x: 1, y: 1 });
    assert.ok(renderScatterFit({ ...base, points: p(SCATTER_FIT_MIN_POINTS) }).length > 0, '下限能过');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...base, points: p(SCATTER_FIT_MIN_POINTS - 1) })), true, '下限 −1 应拒');
    assert.ok(renderScatterFit({ ...base, points: p(SCATTER_FIT_MAX_POINTS) }).length > 0, '上限能过');
    assert.equal(throwsBlocks(() => renderScatterFit({ ...base, points: p(SCATTER_FIT_MAX_POINTS + 1) })), true, '上限 ＋1 应拒');
    const bin = (n) => new Array(n).fill({ label: 'a', low: 1, median: 2, high: 3, count: SCATTER_FIT_BIN_MIN_SAMPLE });
    assert.ok(renderScatterFit({ ...base, form: 'bin', bins: bin(SCATTER_FIT_BIN_MIN) }).length > 0);
    assert.equal(throwsBlocks(() => renderScatterFit({ ...base, form: 'bin', bins: bin(SCATTER_FIT_BIN_MIN - 1) })), true);
    assert.ok(renderScatterFit({ ...base, form: 'bin', bins: bin(SCATTER_FIT_BIN_MAX) }).length > 0);
    assert.equal(throwsBlocks(() => renderScatterFit({ ...base, form: 'bin', bins: bin(SCATTER_FIT_BIN_MAX + 1) })), true);
    const lag = (n) => new Array(n).fill(0).map((_, i) => ({ step: i, r: 0.1 }));
    assert.ok(renderScatterFit({ ...base, form: 'lag', lags: lag(SCATTER_FIT_LAG_MIN) }).length > 0);
    assert.equal(throwsBlocks(() => renderScatterFit({ ...base, form: 'lag', lags: lag(SCATTER_FIT_LAG_MIN - 1) })), true);
    assert.ok(renderScatterFit({ ...base, form: 'lag', lags: lag(SCATTER_FIT_LAG_MAX) }).length > 0);
    assert.equal(throwsBlocks(() => renderScatterFit({ ...base, form: 'lag', lags: lag(SCATTER_FIT_LAG_MAX + 1) })), true);
    assert.ok(renderScatterFit({ ...base, form: 'lag', lags: [{ step: SCATTER_FIT_MAX_LAG_DAYS, r: 0.1 }, { step: 0, r: 0.2 }].reverse() }).length > 0);
  });

  it('纯函数：同样的入参恒产同样的字节（三个形态各一遍）', () => {
    for (const input of [SCATTER_INPUT, ODD_INPUT, BIN_INPUT, LAG_INPUT]) {
      assert.equal(renderScatterFit(input), renderScatterFit(input));
    }
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('scatter-fit ② 样式与零 DOM 纪律', () => {
  const css = scatterFitCss();
  const clean = stripComments(css);

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且**只出现一次**', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = ruleSelectors(clean);
    assert.ok(selectors.length >= 25, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        assert.ok(one.includes(SCATTER_FIT_CLASS), '选择器必须只碰本件类名根：' + one);
        assert.equal((one.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次（拼两遍＝永不命中的死规则）：' + one);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零 `@media` 宽度查询／必带 `@container` 且自己声明了容器', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(clean.includes('@media'), false, '本件不判视口宽度（视口宽 ≠ 组件宽）');
    assert.ok(clean.includes('@container (max-width:'), '窄档必须由容器判');
    assert.ok(clean.includes('container-type: inline-size'), '写了 @container 就必须自己声明容器（否则永不生效）');
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
  });

  it('**窄档阈值只有一处来源**：两份样式源码里不出现那个数字的字面量，查询串由常量拼出', () => {
    const query = '@container (max-width: ' + String(SCATTER_FIT_NARROW_PX) + 'px)';
    assert.equal(countOf(css, query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 2,
      '两份样式文件各一条窄档查询，且都取同一个常量');
    for (const file of ['style.ts', 'style-forms.ts']) {
      const src = readFileSync(join(DIR, file), 'utf8');
      assert.equal(new RegExp('\\b' + String(SCATTER_FIT_NARROW_PX) + '\\b').test(src), false,
        file + ' 里写了阈值字面量（写两处必然走散：改常量时查询不跟）');
      assert.ok(src.includes('SCATTER_FIT_NARROW_PX'), file + ' 应当读 SCATTER_FIT_NARROW_PX 这个常量');
    }
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、**不拿 ink 系当面**', () => {
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外的颜色字面量：' + [...new Set(bare)].join('、'));
    for (const file of ['style.ts', 'style-forms.ts']) {
      const src = stripComments(readFileSync(join(DIR, file), 'utf8'));
      assert.deepEqual([...src.matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [], file + ' 里请改走 skinVar()');
    }
    /* 选中／填充四档：**有文字的选中面走软底**（最强那一档），无文字的条与点走 accent 实底；
       任何一处的 `background` 都不许整个就是文字墨色。 */
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了"面"：' + value);
    }
    assert.ok(clean.includes('accent-soft'), '最强那一档走强调软底');
    assert.ok(clean.includes('color-mix(in srgb,'), '概率带／区间条是强调色的淡洗');
    assert.equal(clean.includes('var(--ilife-danger,'), false, '本件没有语义档，不许借 danger');
  });

  it('**内容撑不宽容器**：会随调用方文本变长的槽带 `min-width: 0`＋可收窄，刻度行可换行', () => {
    /* A2 的根因是「内容拒绝收窄」：文本槽一律要给 `min-width: 0`，且不许用 `flex: none`
       （`flex-shrink: 0` 让这一项顶宽父行——320 档实测 384 > 320）。 */
    for (const slot of ['stamp', 'tail', 'title', 'xtick', 'ytick', 'bintick', 'legend-item', 'note', 'lag-label', 'lag-value']) {
      const body = ruleOf(clean, '.' + scatterFitSlot(slot));
      assert.ok(/min-width:\s*0/.test(body), slot + ' 少了 min-width: 0（长文本会顶宽容器）：' + body);
      assert.equal(/flex:\s*(none|0\s+0\s+auto)/.test(body), false,
        slot + ' 用了 flex: none（内容会顶宽父行，改 flex: 0 1 auto）：' + body);
    }
    for (const slot of ['stamp', 'tail']) {
      assert.ok(/flex:\s*0\s+1\s+auto/.test(ruleOf(clean, '.' + scatterFitSlot(slot))),
        slot + ' 必须可收窄（flex: 0 1 auto）');
    }
    assert.ok(/flex-wrap:\s*wrap/.test(ruleOf(clean, '.' + scatterFitSlot('xticks'))),
      '刻度行塞不下要换行，不许把每一枚压成一列竖字');
    assert.equal(clean.includes('overflow-x'), false, '不许出现 overflow-x（不藏横滑）');
    assert.equal(clean.includes('scroll'), false, '不许出现滚动容器');
  });

  it('尺寸事实写在一处：图区与分箱高度取常量', () => {
    assert.ok(clean.includes('height: ' + String(SCATTER_FIT_PLOT_PX) + 'px'));
    assert.ok(clean.includes('height: ' + String(SCATTER_FIT_BIN_PX) + 'px'));
  });

  it('零键盘语汇、零可点元素（本件是纯静态图）', () => {
    const words = ['快捷键', '键位', '方向键', '键帽', '键盘', '按 Enter', 'Tab'];
    const html = [SCATTER_INPUT, BIN_INPUT, LAG_INPUT].map((i) => renderScatterFit(i)).join('') + css;
    for (const w of words) assert.equal(html.includes(w), false, '出现键盘语汇：' + w);
    const interactive = [SCATTER_INPUT, BIN_INPUT, LAG_INPUT].map((i) => renderScatterFit(i)).join('');
    for (const needle of ['<button', '<a ', 'tabindex', 'onclick', '<input', '<select']) {
      assert.equal(interactive.includes(needle), false, '本件不带可点元素：' + needle);
    }
  });

  it('`dist/components/scatter-fit/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'scatter-fit');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 6, '至少该有 index／attrs／model／scale／forms／render／style 的产物：' + files.join('、'));
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
    assert.equal(scatterFitSlot('plot'), SCATTER_FIT_CLASS + '-plot');
    assert.equal(scatterFitSlot('plot', 'x-'), 'x-block-scatter-fit-plot');
    for (const slot of SCATTER_FIT_SLOTS) assert.ok(scatterFitSlot(slot).startsWith(SCATTER_FIT_CLASS + '-'));
  });

  it('两份样式源码里不留没人用的槽位助手（声明了 `c()` 就得真用到）', () => {
    for (const file of ['style.ts', 'style-forms.ts']) {
      const src = stripComments(readFileSync(join(DIR, file), 'utf8'));
      if (!src.includes('const c = (slot: ScatterFitSlot)')) continue;
      const uses = (src.match(/(?:^|[^\w.])c\(/g) || []).length;
      assert.ok(uses > 0, file + ' 声明了裸槽助手 c() 却一次没用（死代码，删掉它）');
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('scatter-fit ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(SCATTER_FIT_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderScaleBar({ value: 860, goal: 1850 });
    const heat = renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 2, 3, 4, 5, 6, 7] }] });
    renderScatterFit(SCATTER_INPUT);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), before, '别件的产物逐字节不变');
    assert.equal(renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 2, 3, 4, 5, 6, 7] }] }), heat);
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(scatterFitCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-scatter-fit'), '前缀必须作用到类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });
});

/* ── ④ 三档几何（真机）＋ ⑤ 皮肤纪律 ───────────────────────────────── */

/** 三档**容器**宽度：320 是触屏最窄那一档（手机分屏／小屏），也是内容撑宽最容易翻车的地方。 */
const WIDTHS = [320, 390, 1280];

/** 长口径（64 字）与长轴名（>40 字）：内容撑宽的两种压力。 */
const LONG_STAMP = '近 30 天（含 3 天补录、2 天跨月结转、1 天跨时区，口径见页脚）：补录那三天是按当日最后一笔算的，不是记账时间';
const LONG_XNAME = '睡眠时长（按入睡到起床算，含中途醒来，不含午睡）';

/** 压力样例：常规三形态 ＋ 长口径 ＋ 长轴名 ＋ 12 位金额（刻度最长那一档）。 */
function cases() {
  return [
    { name: 'scatter', html: renderScatterFit(SCATTER_INPUT) },
    { name: 'odd', html: renderScatterFit(ODD_INPUT) },
    { name: 'bin', html: renderScatterFit(BIN_INPUT) },
    { name: 'lag', html: renderScatterFit(LAG_INPUT) },
    { name: 'longstamp', html: renderScatterFit({ ...SCATTER_INPUT, stamp: LONG_STAMP }) },
    { name: 'longname', html: renderScatterFit({ ...BIN_INPUT, xName: LONG_XNAME }) },
    {
      name: 'widenum',
      html: renderScatterFit({
        title: '大额分布', xName: '金额', yName: '笔数', xUnit: '元',
        points: [{ x: 123456789012, y: 1 }, { x: 555555555555, y: 2 }, { x: 987654321098, y: 3 }],
      }),
    },
  ];
}

/** 真机起不来时的确定性几何判据（量不到"内容撑宽"，就断**形状上的那几条**）。 */
function assertStaticGeometry(css, html) {
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const narrowest = WIDTHS[0];
  const wide = [...px(html), ...px(css)].filter((v) => v > narrowest);
  assert.deepEqual(wide, [], '出现过不了最窄档（' + narrowest + '）的固定宽度：' + wide.join('、'));
  const percents = [...html.matchAll(/(?:left|bottom): ([\d.]+)%/g)].map((m) => Number(m[1]));
  assert.ok(percents.length > 0, '点的坐标必须是百分比（判据会空转）');
  for (const v of percents) assert.ok(v >= 0 && v <= 100, '百分比越界：' + v);
  /* 内容撑宽的两条形状事实：长文本槽可收窄、刻度行可换行。 */
  const clean = stripComments(css);
  for (const slot of ['stamp', 'tail', 'xtick']) {
    assert.ok(/min-width:\s*0/.test(ruleOf(clean, '.' + scatterFitSlot(slot))), slot + ' 少了 min-width: 0');
  }
  assert.ok(/flex-wrap:\s*wrap/.test(ruleOf(clean, '.' + scatterFitSlot('xticks'))), '刻度行要能换行');
}

describe('scatter-fit ④⑤ 三档几何与皮肤纪律（真机 headless Chrome ＋ CDP）', () => {
  it('容器 320／390／1280：零横向溢出（含长口径／长轴名／12 位金额）／点全在图区里／刻度零截断', async (t) => {
    const css = scatterFitCss();
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n'),
      css: skinCss() + '\n' + css,
      height: 2000,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：'
        + '没有超过 ' + WIDTHS[0] + 'px 的固定宽度 ＋ 长文本槽可收窄（min-width: 0）＋ 刻度行可换行');
      assertStaticGeometry(css, casesHtml);
      return t.skip('本机无 Chrome／Chromium：三档几何判据需真浏览器');
    }
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
            const scope = '.' + skinClass(skin) + ' [data-case=' + c.name + '] ';
            const root = await page.read([scope + '.' + SCATTER_FIT_CLASS, scope + '.' + scatterFitSlot('hd')]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            for (const one of root) {
              assert.ok(one.maxScrollW <= one.maxClientW + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 横向溢出 '
                + one.maxScrollW + ' > ' + one.maxClientW);
              assert.equal(one.scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            }
            /* 刻度与读数**不被截断**（压字／省略号都不是本件的做法）；本形态没有的槽不要求出现。 */
            const slots = ['ytick', 'xtick', 'bintick', 'legend-item', 'lag-value', 'stamp', 'tail']
              .filter((slot) => new RegExp('class="' + scatterFitSlot(slot) + '[ "]').test(c.html));
            const texts = await page.read(slots.map((slot) => scope + '.' + scatterFitSlot(slot)));
            for (const one of texts) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel
                + ' 有 ' + one.clipped + ' 处被截断');
              assert.ok(one.visible > 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 不见了');
            }
            if (c.name !== 'scatter') continue;
            /* **点全在图区里**：最左／最右／最上／最下的点都不许跑出图区。 */
            const box = await page.ev('(function(){var root=document.querySelector('
              + JSON.stringify(scope + '.' + SCATTER_FIT_CLASS) + ');'
              + 'var plot=root.querySelector(' + JSON.stringify('.' + scatterFitSlot('plot')) + ');'
              + 'var dots=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + scatterFitSlot('dot')) + '));'
              + 'var p=plot.getBoundingClientRect();var o={n:dots.length,'
              + 'plotW:Math.round(p.width),plotH:Math.round(p.height),'
              + 'maxRight:-1e9,minLeft:1e9,maxBottom:-1e9,minTop:1e9};'
              + 'for(var i=0;i<dots.length;i+=1){var r=dots[i].getBoundingClientRect();'
              + 'if(r.right>o.maxRight)o.maxRight=r.right; if(r.left<o.minLeft)o.minLeft=r.left;'
              + 'if(r.bottom>o.maxBottom)o.maxBottom=r.bottom; if(r.top<o.minTop)o.minTop=r.top;}'
              + 'return {n:o.n,plotW:o.plotW,plotH:o.plotH,plotRight:Math.round(p.right),plotLeft:Math.round(p.left),'
              + 'plotTop:Math.round(p.top),plotBottom:Math.round(p.bottom),maxRight:Math.round(o.maxRight),'
              + 'minLeft:Math.round(o.minLeft),minTop:Math.round(o.minTop),maxBottom:Math.round(o.maxBottom)};}())');
            assert.equal(box.n, SCATTER_INPUT.points.length, width + ' 档 ' + skin + '：点数不对');
            assert.ok(box.maxRight <= box.plotRight + 1, width + ' 档 ' + skin + '：有点跑出图区右边 '
              + box.maxRight + ' > ' + box.plotRight);
            assert.ok(box.minLeft >= box.plotLeft - 1, width + ' 档 ' + skin + '：有点跑出图区左边 '
              + box.minLeft + ' < ' + box.plotLeft);
            assert.ok(box.minTop >= box.plotTop - 1, width + ' 档 ' + skin + '：有点跑出图区上边');
            assert.ok(box.maxBottom <= box.plotBottom + 1, width + ' 档 ' + skin + '：有点跑出图区下边');
            seen.push({ width, skin, name: c.name, plotH: box.plotH, plotW: box.plotW,
              rootScrollW: root[0].maxScrollW, rootClientW: root[0].maxClientW,
              hdScrollW: root[1].maxScrollW, hdClientW: root[1].maxClientW });
          }
        }
      }
      /* **窄档是容器驱动的**：320／390 档图区比 1280 档矮一档（视口没变，只改了夹具容器宽度）。 */
      const wide = seen.filter((s) => s.width === 1280 && s.name === 'scatter').map((s) => s.plotH);
      assert.equal(wide.every((h) => h === SCATTER_FIT_PLOT_PX), true,
        '1280 档图区高度应取常量 ' + SCATTER_FIT_PLOT_PX + '：' + JSON.stringify(wide));
      for (const w of [320, 390]) {
        const narrow = seen.filter((s) => s.width === w && s.name === 'scatter').map((s) => s.plotH);
        assert.equal(narrow.every((h) => h < SCATTER_FIT_PLOT_PX), true,
          w + ' 档图区应收一档（@container 判的是本件自己的宽度）：' + JSON.stringify(narrow));
      }
      /* ⑤ 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const c of cases()) {
        for (const width of WIDTHS) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
            + 'for (var i = 0; i < skins.length; i += 1) {'
            + '  var el = document.querySelector("." + "ilife-skin-" + skins[i]'
            + ' + " [data-case=' + c.name + '] .' + SCATTER_FIT_CLASS + '");'
            + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
            + '} return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
          }
        }
      }
      /* 强调实底那一档（最强那行）在四套皮肤里都取到了取值表里的软底与字色。 */
      for (const skin of SKIN_NAMES) {
        const vals = SKIN_VALUES[skin];
        const colors = await page.ev('(function(){var row=document.querySelector('
          + JSON.stringify('.' + skinClass(skin) + ' [data-case=lag] .' + scatterFitSlot('lagrow') + '.is-strong') + ');'
          + 'var val = row === null ? null : row.querySelector('
          + JSON.stringify('.' + scatterFitSlot('lag-value')) + ');'
          + 'return {bg: row === null ? null : getComputedStyle(row).backgroundColor,'
          + 'fg: val === null ? null : getComputedStyle(val).color};}())');
        assert.equal(colors.bg, toRgb(vals['accent-soft']), skin + '：最强那一档的底取 accent-soft');
        assert.equal(colors.fg, toRgb(vals['accent-text']), skin + '：最强那一档的字取 accent-text');
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of WIDTHS) {
        const rows = seen.filter((s) => s.width === w);
        const scat = rows.filter((s) => s.name === 'scatter');
        console.log('READING scatter-fit container=' + w
          + ' plotW=' + scat[0].plotW + ' plotH=' + scat[0].plotH
          + ' maxRootScrollW=' + Math.max(...rows.map((s) => s.rootScrollW))
          + ' maxRootClientW=' + Math.max(...rows.map((s) => s.rootClientW))
          + ' maxHdScrollW=' + Math.max(...rows.map((s) => s.hdScrollW))
          + ' maxHdClientW=' + Math.max(...rows.map((s) => s.hdClientW))
          + ' cases=' + rows.length);
      }
    } finally { page.close(); }
  });
});
