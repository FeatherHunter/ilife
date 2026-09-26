/** small-multiples（小倍数面板 · 形态 `columns`：期间并排迷你柱阵 ＋ 均值线）· 契约测试。
 *
 * 覆盖六组判据：
 *  ① **渲染契约**：槽位与枚数（一个期间一根柱 ＋ 一枚横轴标签）／**柱高与均值线是同一份真值**
 *     （逐柱按本件声明的映射公式验算；均值线的位置与它自己写出来的那个均值自洽）／
 *     **均值线永远在柱阵内**（读数极小／轴域极窄／和会溢出的那几档——2026-09 返修：量化过的均值
 *     曾喂进坐标映射，线跑出柱阵）／**均值取整口径逐档钉住**／
 *     本期那一列的**三样**（竖标 ＋ 字 ＋ 色）／转义面／**全部**非法入参分支（每个都断 `BlocksError`，
 *     含**两期同名**）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且**只出现一次**
 *     （含 `@container` 里的那几条）、零 `:root`／`!important`／零新 token／零 `@media` 宽度查询／
 *     零手写色值（只有 `skinVar()` 兜底链那一处）／零 `…` 截断写法／零键盘语汇／零可点元素；
 *     本期竖标走 `accent` **实底**（不是淡洗：淡洗对纸面过不了 3:1 的图形地板）；
 *  ③ **加法式**：本件只读自己的类名；不启用它的页面零命中、逐字节不变；
 *  ④ **三档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 320／390／1280 下零横向溢出、
 *     柱／均值线／**均值那枚标注**都在柱阵里、标签零截断、8 期横轴标签的列宽读数（触控那条建议的成立条件）、
 *     窄档图区确实矮一档（＝容器查询真在生效）；**起不来就退确定性几何判据并打印原因**；
 *  ⑤ **皮肤纪律**：同一份入参渲染三次逐字节相同、标记不带皮肤类、真机上四套皮肤里的 `innerHTML`
 *     逐字节相同；柱／竖标／「本期」那枚字的取值来自**皮肤取值表**（不写死色），
 *     且竖标的图形对比 ≥3:1 **逐套算出来**；轴上两行与卡头那枚胶囊照原型（`ink`／`ink-2`／`accent-text`）；
 *  ⑥ **文档与偏离留档**：README 写着均值取整口径、同名拒绝、触控那条的成立条件（门槛数与真机读数相容），
 *     且「与原型的有意偏离」逐条留档。
 *
 * 期望值一律从组件自己的常量派生（`SMALL_MULTIPLES_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SMALL_MULTIPLES_BAR_CEIL_PCT,
  SMALL_MULTIPLES_BAR_FLOOR_PCT,
  SMALL_MULTIPLES_CLASS,
  SMALL_MULTIPLES_FORMS,
  SMALL_MULTIPLES_MAX_PERIODS,
  SMALL_MULTIPLES_MIN_PERIODS,
  SMALL_MULTIPLES_PLOT_PX,
  SMALL_MULTIPLES_SLOTS,
  renderSmallMultiples,
  smallMultiplesCss,
  smallMultiplesSlot,
} from '../dist/components/small-multiples/index.js';
import { renderHeatGrid } from '../dist/components/heat-grid/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKINS, skinCss, skinClass } from '../dist/components/skin/index.js';
import { SKIN_NAMES } from '../dist/components/skin/contract.js';
import { startShapesPage } from './shapes-probe.mjs';
import { styleSource } from './_style-sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'small-multiples');

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

/** 入参里**每个 `number` 叶子**的路径（`periods[0].value` 这种；数组元素与嵌套对象都进去）。 */
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

/** **触控地板**（法条：命中盒 ≥44×44；出处 `docs/base/base-render/触屏优先.md`）。
 *  本件没有可点元素，所以它只在「调用方把某一列／某一枚标签包成入口」时才生效——
 *  列宽要够 44px，就得**容器宽 ≥ 44×期数 ＋ 4×(期数−1)**（列间距 4px 是窄档那一档）。 */
const TOUCH_FLOOR_PX = 44;

/** 列间距（窄档／宽档）：与 `style.ts` 的 `NARROW_COL_GAP_PX`／`COL_GAP_PX` 同口径
 *  （README 那条触控建议算门槛数用窄档那个：门槛 380px < 460px）。 */
const NARROW_COL_GAP_PX = 4;
const COL_GAP_PX = 6;
const NARROW_PX = 460;

/** 8 期时要多少容器宽，横轴标签那一列才够 44px 宽（README 里写着这个数，判据照同一条公式算）。 */
const TOUCH_MIN_CONTAINER_PX = TOUCH_FLOOR_PX * 8 + NARROW_COL_GAP_PX * 7;

/** 相对亮度（WCAG 2.x）：`#rrggbb`（或 `#rgb`）→ 0–1。图形对比的地板是 3:1，文本档是 4.5:1。 */
function relLum(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const part = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [0, 2, 4].map((i) => part(parseInt(full.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 两个 `#rrggbb` 的对比度（判据自己算：**读数写在判据里**，不抄别处的结论）。 */
function contrast(a, b) {
  const [x, y] = [relLum(a), relLum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** 一条规则的声明块（按选择器里的一个片段找；找不到返回空串——判据会当场说"没找到这条规则"）。 */
function ruleBody(css, needle) {
  const at = css.indexOf(needle);
  if (at < 0) return '';
  const open = css.indexOf('{', at);
  const close = css.indexOf('}', open);
  return open < 0 || close < 0 ? '' : css.slice(open + 1, close);
}

/** 从均值那枚标注里读出上屏的那个数（`均值 1,810 卡` → `1810`）。 */
function shownMean(html) {
  const label = /-mean-label">([^<]+)</.exec(html)[1];
  return Number(label.replace(/[^\d.-]/g, ''));
}

/** 本件声明的映射（**判据自己写一遍公式**，不调组件内部函数）：读数 → 柱高百分比。 */
const expectPct = (value, lo, hi) => Number((SMALL_MULTIPLES_BAR_FLOOR_PCT
  + ((value - lo) / (hi - lo)) * (SMALL_MULTIPLES_BAR_CEIL_PCT - SMALL_MULTIPLES_BAR_FLOOR_PCT)).toFixed(2));

/** 全部相等时的那条分支：柱高一律画在中线。 */
const flatPct = Number(((SMALL_MULTIPLES_BAR_FLOOR_PCT + SMALL_MULTIPLES_BAR_CEIL_PCT) / 2).toFixed(2));

/* ── 三份样例（低压／高压／退化） ───────────────────────────────────── */

/** 原型墙那一档的六个期间（读数与期间名逐字取自原型 no.68 的 C 档）。 */
const WEEKS = [
  { label: '第 35 周', value: 1690 },
  { label: '第 36 周', value: 1842 },
  { label: '第 37 周', value: 1716 },
  { label: '第 38 周', value: 1940 },
  { label: '第 39 周', value: 1884 },
  { label: '第 40 周', value: 1786, now: true },
];
const SIX = { title: '日均摄入 · 六周并排', periods: WEEKS, unit: '卡', stamp: 'W35 – W40' };

/** 上限那一档（8 期）＋ 极长期间名 ＋ 七位读数：窄容器里必须换行，不许 `…`、不许横溢。 */
const EIGHT = {
  title: '每周支出 · 八周并排（含一段很长的期间名与一个很长的读数）',
  unit: '元',
  periods: [
    { label: '第 1 周', value: 123456.78 },
    { label: '第 2 周', value: 1288 },
    { label: '第 3 周', value: 1310 },
    { label: '第 4 周', value: 1299.5 },
    { label: '第 5 周', value: 1305 },
    { label: '第 6 周', value: 1340 },
    { label: '第 7 周', value: 1318 },
    { label: '第 8 周（8 月 24 日到 8 月 30 日这一段）', value: 1322, now: true },
  ],
};

/** 退化一份：全部相等（不除零、也不画 NaN）。 */
const FLAT = { title: '几条一样', periods: [{ label: 'A', value: 1800 }, { label: 'B', value: 1800 }], unit: '卡' };

/** **均值最高那一档**（8 期里 1 根触底 ⇒ 均值落到本件能达到的最高位 76%）＋ 长到换行的单位：
 *  均值标注会变两行——线在上半区时「只往上长」的那一版会顶出柱阵、压进卡头（返修点 G1）。 */
const HIGH = {
  title: '八周并排 · 一根触底', unit: '元'.repeat(30),
  periods: [
    { label: '第 1 周', value: 0 },
    ...['第 2 周', '第 3 周', '第 4 周', '第 5 周', '第 6 周', '第 7 周', '第 8 周'].map((l) => ({ label: l, value: 1000 })),
  ],
};

/** 轴域极窄／极大那几档：量化过的均值一旦喂进坐标映射，线就会跑出柱阵（返修点 S1）。 */
const EDGE_PERIODS = [
  { name: '两位小数以下', periods: [{ label: 'A', value: 0.001 }, { label: 'B', value: 0.002 }] },
  { name: '两位小数量级', periods: [{ label: 'A', value: 0.006 }, { label: 'B', value: 0.008 }] },
  { name: '微读数', periods: [{ label: 'A', value: 1e-7 }, { label: 'B', value: 2e-7 }] },
  /* 这一档「先求和再除」会先溢出成 Infinity（旧写法在这里吐的就是 `bottom: Infinity%`）。
     读数取 `Number.MAX_VALUE ÷ 2` 以下那一档（返修 2026-09：单笔读数超过它就一律 `badInput`，
     见 `model.ts` 的量级闸）——三笔加起来仍会溢出，所以这一档管的那件事照旧被测到。 */
  { name: '和会溢出', periods: [{ label: 'A', value: 8.9e307 }, { label: 'B', value: 4.6e307 }, { label: 'C', value: 4.6e307 }] },
];

/** 极端一份（对抗式审查会试的那几个）：200 字**不可断**的期间名 ＋ 15 位读数 ＋ 超长标题／范围／口径。
 *  这一份只有一个要求：**换行**，不截断、不横溢（`overflow-wrap: anywhere` 管的就是这一档）。 */
const STRESS = {
  title: '极端长串 · ' + 'X'.repeat(60), unit: '元', stamp: 'S'.repeat(40), note: 'N'.repeat(120),
  periods: [
    { label: 'Z'.repeat(200), value: 123456789012345.678 },
    { label: '第 2 期', value: 1 },
    { label: '第 3 期', value: 2 },
    { label: '第 4 期', value: 3 },
    { label: '第 5 期', value: 4 },
    { label: '第 6 期', value: 5 },
    { label: '第 7 期', value: 6 },
    { label: '第 8 期', value: 7, now: true },
  ],
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('small-multiples ① 渲染契约 · 骨架与枚数', () => {
  const html = renderSmallMultiples(SIX);

  it('骨架：卡头 → 柱阵（含均值线）→ 横轴标签行 → 脚注', () => {
    assert.match(html, new RegExp('^<div class="' + SMALL_MULTIPLES_CLASS + ' is-columns">'));
    assert.equal(countOf(html, 'class="' + smallMultiplesSlot('col') + '( is-now)?"'), SIX.periods.length, '一个期间一根柱');
    assert.equal(countOf(html, 'class="' + smallMultiplesSlot('bar') + '"'), SIX.periods.length, '一根柱一根条');
    assert.equal(countOf(html, 'class="[^"]*-xlabel[ "]'), SIX.periods.length, '一枚横轴标签');
    assert.equal(countOf(html, 'class="[^"]*-xperiod"'), SIX.periods.length);
    assert.equal(countOf(html, 'class="[^"]*-xvalue"'), SIX.periods.length);
    assert.equal(countOf(html, 'class="[^"]*-mean( is-under)?"'), 1, '一条均值线');
    assert.equal(countOf(html, 'class="[^"]*-mean-label"'), 1, '一枚均值标注');
    assert.match(html, /role="img" aria-label="柱阵：6 期并排（第 35 周，第 36 周，第 37 周，第 38 周，第 39 周，第 40 周）/);
    assert.ok(!/<script/i.test(html), '不产脚本');
    for (const slot of ['hd', 'title', 'stamp', 'tail', 'cols', 'note']) {
      assert.ok(html.includes(smallMultiplesSlot(slot)), '缺槽：' + slot);
    }
  });

  it('**柱高与均值线是同一份真值**：逐柱按声明的映射验算，线落在同一个映射算出的均值上', () => {
    const values = SIX.periods.map((p) => p.value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const heights = [...html.matchAll(/-bar" style="height: ([\d.]+)%"/g)].map((m) => Number(m[1]));
    assert.deepEqual(heights, values.map((v) => expectPct(v, lo, hi)), '柱高与读数不是同一份真值');
    assert.equal(Math.min(...heights), SMALL_MULTIPLES_BAR_FLOOR_PCT, '最低那一根落在下限上');
    assert.equal(Math.max(...heights), SMALL_MULTIPLES_BAR_CEIL_PCT, '最高那一根落在上限上');
    /* 均值：判据从**上屏那枚标注**里取数（不重写一遍取整口径）；线的位置由**未量化**的均值定
       （口径见 README 不变量 4：量化过的均值可能落到轴域外）——所以这里各断各的。 */
    const label = /-mean-label">([^<]+)</.exec(html)[1];
    const shown = shownMean(html);
    const truth = values.reduce((a, v) => a + v / values.length, 0);
    assert.ok(Math.abs(shown - truth) <= 0.5, '上屏的均值与真值差太多：' + shown + ' vs ' + truth);
    assert.ok(label.includes('均值') && label.endsWith('卡'), '均值标注要写清是什么、带上单位：' + label);
    assert.match(html, /-mean" aria-hidden="true" style="bottom: ([-\d.]+)%"/);
    const bottom = Number(/-mean" aria-hidden="true" style="bottom: ([-\d.]+)%"/.exec(html)[1]);
    assert.equal(bottom, expectPct(truth, lo, hi), '均值线的位置不是未量化均值算出来的那一位');
    assert.ok(Math.abs(bottom - expectPct(shown, lo, hi)) <= 0.5,
      '线（未量化均值）与上屏那枚（量化过）差得太远：' + bottom + ' vs ' + expectPct(shown, lo, hi));
    /* 卡头那句也是算出来的：期数与虚线一起说清，读者不靠颜色认线。 */
    assert.match(html, /-tail">虚线＝6 期均值</);
  });

  it('**均值线永远在柱阵内**：量化过的均值不许喂进坐标映射（读数极小／和会溢出那几档）', () => {
    const readings = [];
    for (const one of EDGE_PERIODS) {
      const values = one.periods.map((p) => p.value);
      const lo = Math.min(...values);
      const hi = Math.max(...values);
      const truth = values.reduce((a, v) => a + v / values.length, 0);
      const edge = renderSmallMultiples({ title: 'x', unit: '元', periods: one.periods });
      const at = /-mean" aria-hidden="true" style="bottom: ([-\d.]+)%"/.exec(edge);
      assert.ok(at !== null, one.name + '：均值线的位置读不出来（不是有限数）：' + edge.slice(0, 160));
      const bottom = Number(at[1]);
      assert.ok(bottom >= SMALL_MULTIPLES_BAR_FLOOR_PCT && bottom <= SMALL_MULTIPLES_BAR_CEIL_PCT,
        one.name + '：均值线跑出柱阵（' + bottom + '% 不在 '
        + SMALL_MULTIPLES_BAR_FLOOR_PCT + '–' + SMALL_MULTIPLES_BAR_CEIL_PCT + '% 之间）');
      /* 线压着「均值柱」该在的位置：同一个公式、**未量化**的均值算出来。 */
      assert.equal(bottom, expectPct(truth, lo, hi),
        one.name + '：线的位置不是未量化均值算出来的那一位（真值 ' + truth + '）');
      const shown = shownMean(edge);
      assert.ok(shown !== 0, one.name + '：上屏均值被量化成了 0（真值 ' + truth + '）');
      assert.ok(Math.abs(shown - truth) <= Math.abs(truth) * 0.5 + Number.EPSILON,
        one.name + '：上屏均值与真值不同量级：' + shown + ' vs ' + truth);
      readings.push(one.name + ' 线 ' + bottom + '%／上屏 ' + shown + '（真值 ' + truth + '）');
    }
    console.log('READING small-multiples 均值线在柱阵内：' + readings.join('；'));
  });

  it('均值取整口径逐档钉住：整数读数取整；非整数至多两位小数、且至少两位有效数字', () => {
    /* 口径住 `scale.ts` 的 `meanShown()`，写进 README 不变量 4——判据断言的是**上屏原文**。 */
    const cases = [
      { values: [1, 2], want: '均值 2' },
      { values: [1, 2, 3, 4], want: '均值 3' },
      { values: [1690, 1842, 1716, 1940, 1884, 1786], want: '均值 1,810' },
      { values: [1, 2.5], want: '均值 1.75' },
      { values: [0.1, 0.2], want: '均值 0.15' },
      { values: [0.006, 0.008], want: '均值 0.007' },
      { values: [0.001, 0.002], want: '均值 0.0015' },
    ];
    const readings = [];
    for (const one of cases) {
      const periods = one.values.map((v, i) => ({ label: 'P' + String(i), value: v }));
      const edge = renderSmallMultiples({ title: 'x', periods });
      const label = /-mean-label">([^<]+)</.exec(edge)[1];
      assert.equal(label, one.want, '均值上屏口径变了：' + JSON.stringify(one.values) + ' 上屏 ' + label);
      /* 无障碍名里那枚均值与标注同一档（两处不许各写一套）。 */
      assert.ok(edge.includes('，' + one.want + '。'), '无障碍名里的均值与标注不是同一档：' + label);
      readings.push(JSON.stringify(one.values) + ' → ' + label);
    }
    console.log('READING small-multiples 均值取整口径：' + readings.join('；'));
  });

  it('均值标注的落位：线在刻度中线之上时画到**线下**（标注朝柱阵里长）', () => {
    /* 线上／线下各占半个柱阵区 ⇒ 只要标注不高过半个区，四条边就恒在框内（真机读数见 ④）。 */
    const high = renderSmallMultiples(HIGH);
    const highBottom = Number(/-mean(?: is-under)?" aria-hidden="true" style="bottom: ([-\d.]+)%"/.exec(high)[1]);
    assert.ok(highBottom > flatPct, '这一档的线应当落在刻度中线之上：' + highBottom + '% ≤ ' + flatPct + '%');
    assert.match(high, /-mean is-under" aria-hidden="true"/,
      '线在刻度中线之上时标注要画到线下（否则两行的标注会顶出柱阵、压进卡头）');
    const flat = renderSmallMultiples(FLAT);
    assert.equal(/-mean is-under/.test(flat), false,
      '线在中线之下（含全平那一档）时标注照原型画在线上：' + flat.slice(0, 80));
    const six = renderSmallMultiples(SIX);
    assert.equal(/-mean is-under/.test(six), false);
  });

  it('本期那一列**三样同时在**：竖标（形）＋「本期」那枚字（字）＋ 强调色（色，样式段里断）', () => {
    assert.equal(countOf(html, '-col is-now"'), 1, '本期只标一列');
    assert.equal(countOf(html, '-xlabel is-now"'), 1);
    assert.equal(countOf(html, '-nowmark">本期</'), 1, '本期那一列要**写出字**来，不只靠颜色');
    assert.match(html, /-xperiod">第 40 周</);
  });

  it('口径句点名归一化的上下界与「均值不是目标」（不给 note 时）', () => {
    assert.match(html, /-note">口径：柱高只在最低 1,690 与最高 1,940 之间归一化/);
    assert.ok(html.includes('不做 0 起点'), '口径句要说清这不是 0 起点');
    assert.ok(html.includes('不比绝对量'), '口径句要说清比的是相对高低');
    assert.ok(html.includes('「均值」不是「目标」'), '均值不是目标，要写明白');
    assert.ok(countOf(html, '1,690') >= 2, '最低那一期的绝对读数要在（柱下那枚 ＋ 口径句／无障碍名里）');
  });

  it('退化（读数全部相等）：不除零、柱高画在中线、口径句改成「完全一样」', () => {
    const flat = renderSmallMultiples(FLAT);
    const heights = [...flat.matchAll(/-bar" style="height: ([\d.]+)%"/g)].map((m) => Number(m[1]));
    assert.deepEqual(heights, [flatPct, flatPct], '全部相等时柱高一律画在中线');
    assert.equal(/NaN|Infinity/.test(flat), false, '不许出现 NaN／Infinity');
    assert.ok(flat.includes('读数完全一样'), '退化那份要换口径句：' + flat.slice(0, 200));
    assert.match(flat, new RegExp('-mean" aria-hidden="true" style="bottom: ' + String(flatPct) + '%"'),
      '均值线也在中线');
  });

  it('缺省形态是 `columns`；`note` 给了就整句替换；多余字段不认也不影响', () => {
    assert.deepEqual([...SMALL_MULTIPLES_FORMS], ['columns']);
    const bare = renderSmallMultiples({ title: 'x', periods: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] });
    assert.match(bare, new RegExp('^<div class="' + SMALL_MULTIPLES_CLASS + ' is-columns">'));
    assert.equal(bare.includes('-stamp'), false, '不给 stamp 就不出那一槽');
    const noted = renderSmallMultiples({ ...FLAT, note: '自定义口径' });
    assert.ok(noted.includes('>自定义口径</p>'));
    assert.equal(noted.includes('口径：柱高只在最低'), false, '替换＝整句换掉');
    const extra = renderSmallMultiples({ ...FLAT, extraClass: 'ok-class other' });
    assert.ok(extra.includes('ok-class other'));
    const empty = renderSmallMultiples({ ...FLAT, unit: '', stamp: '' });
    assert.equal(empty.includes('卡'), false, '空串＝未给（与全层 optText 同口径）');
  });

  it('转义面：标题／期间名／单位／范围／口径逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderSmallMultiples({
      title: evil, unit: evil, stamp: evil, note: evil,
      /* 两期同名会被当场拒（见上面那条判据），故第二期的名字另给一个同样带刺的串。 */
      periods: [{ label: evil, value: 1 }, { label: evil + 'B', value: 2, now: true }],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.match(html, /aria-label="柱阵：2 期并排（&quot;&gt;&lt;script&gt;/);
  });

  it('纯函数：同样的入参恒产同样的字节', () => {
    for (const input of [SIX, EIGHT, FLAT]) assert.equal(renderSmallMultiples(input), renderSmallMultiples(input));
  });
});

describe('small-multiples ① 渲染契约 · 非法入参（每条都断 BlocksError）', () => {
  const ok = { title: 'x', periods: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] };

  it('入参本身：非对象一律拒', () => {
    assert.equal(throwsBlocks(() => renderSmallMultiples(undefined)), true);
    assert.equal(throwsBlocks(() => renderSmallMultiples(null)), true);
    assert.equal(throwsBlocks(() => renderSmallMultiples([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderSmallMultiples('x')), true);
    assert.equal(throwsBlocks(() => renderSmallMultiples(1)), true);
  });

  it('标题：缺／空串／不是串', () => {
    assert.equal(throwsBlocks(() => renderSmallMultiples({ periods: ok.periods })), true);
    assert.equal(throwsBlocks(() => renderSmallMultiples({ ...ok, title: '' })), true);
    assert.equal(throwsBlocks(() => renderSmallMultiples({ ...ok, title: 1 })), true);
  });

  it('期间个数：缺／不是数组／少于 2 期／多于上限', () => {
    assert.equal(throwsBlocks(() => renderSmallMultiples({ title: 'x' })), true, '缺 periods');
    assert.equal(throwsBlocks(() => renderSmallMultiples({ title: 'x', periods: 'x' })), true, 'periods 不是数组');
    assert.equal(throwsBlocks(() => renderSmallMultiples({ title: 'x', periods: [] })), true, '空数组＝一期都没有');
    assert.equal(throwsBlocks(() => renderSmallMultiples({ title: 'x', periods: [{ label: 'A', value: 1 }] })), true,
      '一期看不出跨期怎么变');
    const many = new Array(SMALL_MULTIPLES_MAX_PERIODS + 1).fill({ label: 'A', value: 1 });
    assert.equal(throwsBlocks(() => renderSmallMultiples({ title: 'x', periods: many })), true,
      '超过 ' + SMALL_MULTIPLES_MAX_PERIODS + ' 期：窄容器里只能压字，请调用方先合并期间');
    const top = renderSmallMultiples({
      title: 'x',
      periods: new Array(SMALL_MULTIPLES_MAX_PERIODS).fill(0).map((_, i) => ({ label: 'P' + String(i), value: 1 })),
    });
    assert.equal(countOf(top, 'class="[^"]*-col( is-now)?"'), SMALL_MULTIPLES_MAX_PERIODS,
      '上限那一档照收，且**一根柱都不减**（有几期就画几根）');
    assert.equal(SMALL_MULTIPLES_MIN_PERIODS, 2);
  });

  it('**两期同名一律拒**：期间名是这一列的坐标（同名那两列在轴上与读屏里分不出谁是谁）', () => {
    const on = (labels) => ({ title: 'x', periods: labels.map((l, i) => ({ label: l, value: i + 1 })) });
    assert.equal(throwsBlocks(() => renderSmallMultiples(on(['W35', 'W35']))), true, '两期同名');
    assert.equal(throwsBlocks(() => renderSmallMultiples(on(['W35', 'W36', 'W35']))), true, '三份里两份同名');
    assert.equal(renderSmallMultiples(on(['W35', 'W36'])).includes('W36'), true, '不同名照收');
    /* 报错文案点名**那两列**（`input.periods[i].label` 两条路径），且用「不许同名」这个说法：
       层的通用样例修补器（`皮肤矩阵.test.mjs` 的 `repairOnce`）认「不许同 ＋ 两条路径」——
       换一个说法它就在横切判据里把本件跳过（那正是这条判据要钉住的）。 */
    let message = '';
    try { renderSmallMultiples(on(['W35', 'W36', 'W35'])); } catch (e) { message = String(e.message); }
    assert.match(message, /input\.periods\[0\]\.label 与 input\.periods\[2\]\.label 不许同名/,
      '报错要点名是哪两列重名：' + message);
  });

  it('期间元素：不是对象／期间名空或不是串／读数不是有限数／now 不是布尔', () => {
    const one = { label: 'A', value: 1 };
    const at = (bad) => ({ title: 'x', periods: [one, bad] });
    assert.equal(throwsBlocks(() => renderSmallMultiples(at(null))), true, '元素不是对象');
    assert.equal(throwsBlocks(() => renderSmallMultiples(at([]))), true);
    assert.equal(throwsBlocks(() => renderSmallMultiples(at({ value: 1 }))), true, '缺期间名');
    assert.equal(throwsBlocks(() => renderSmallMultiples(at({ label: '', value: 1 }))), true, '期间名空串');
    assert.equal(throwsBlocks(() => renderSmallMultiples(at({ label: 1, value: 1 }))), true);
    assert.equal(throwsBlocks(() => renderSmallMultiples(at({ label: 'B' }))), true, '缺读数');
    assert.equal(throwsBlocks(() => renderSmallMultiples(at({ label: 'B', value: '1' }))), true, '读数是数字串');
    assert.equal(throwsBlocks(() => renderSmallMultiples(at({ label: 'B', value: Number.NaN }))), true, 'NaN');
    assert.equal(throwsBlocks(() => renderSmallMultiples(at({ label: 'B', value: Number.POSITIVE_INFINITY }))), true);
    assert.equal(throwsBlocks(() => renderSmallMultiples(at({ label: 'B', value: 1, now: 'yes' }))), true, 'now 不是布尔');
    assert.equal(throwsBlocks(() => renderSmallMultiples({
      title: 'x', periods: [{ label: 'A', value: 1, now: true }, { label: 'B', value: 2, now: true }],
    })), true, '本期只有一期：标两期说不出"这一列"是哪一列');
  });

  it('形态闭集与可选的三个串：闭集外／类型不对一律拒', () => {
    assert.equal(throwsBlocks(() => renderSmallMultiples({ ...ok, form: 'bars' })), true, '形态闭集外');
    assert.equal(throwsBlocks(() => renderSmallMultiples({ ...ok, form: 'A' })), true, '闭集存的是骨架名，不是原型墙的格号');
    assert.equal(renderSmallMultiples({ ...ok, form: 'columns' }).includes('is-columns'), true, '闭集内照收');
    assert.equal(throwsBlocks(() => renderSmallMultiples({ ...ok, note: 1 })), true);
    assert.equal(throwsBlocks(() => renderSmallMultiples({ ...ok, unit: 1 })), true);
    assert.equal(throwsBlocks(() => renderSmallMultiples({ ...ok, stamp: 1 })), true);
    assert.equal(throwsBlocks(() => renderSmallMultiples({ ...ok, extraClass: 'a"b' })), true);
    assert.equal(throwsBlocks(() => renderSmallMultiples({ ...ok, extraClass: '' })), true);
  });

  /* 返修 2026-09（跨件不变量门 ① · 非有限数一律拒）：样例里**每个** number 字段逐个换成五个坏数，
     渲染入口必须抛 `BlocksError`——收下就会在柱下写出 `1e+308` 那种读不出来的数。
     `1e21` 那一档**不是**坏数（十进制写法与指数写法的分界，本层当读数写）。 */
  it('**非有限数与超量级读数一律拒**：五个坏数逐个打进每个 number 字段', () => {
    const inputs = [SIX, EIGHT, FLAT, HIGH];
    let cases = 0;
    const got = [];
    for (const input of inputs) {
      assert.equal(typeof renderSmallMultiples(input), 'string', '样例入参必须直渲成功');
      for (const path of numberPaths(input)) {
        for (const [text, value] of BAD_READINGS) {
          cases += 1;
          if (!throwsBlocks(() => renderSmallMultiples(withBadAt(input, path, value)))) {
            got.push(path + ' ← ' + text);
          }
        }
      }
    }
    assert.ok(cases >= 20, '扫到的 number 字段太少（判据会空转）：只有 ' + String(cases) + ' 例');
    assert.deepEqual(got, [], '这些坏数被收下了（入参违规一律拒，必须抛 BlocksError）：' + got.join('；'));
  });

  /* 返修 2026-09（跨件不变量门 ③ · 未知键一律拒）：顶层与**每一期**各加一个 `zzUnknown: 1`，
     渲染入口必须抛 `BlocksError`——写错的键静默吞掉时，柱阵上只是**静静地少一点东西**，而调用方
     以为自己设上了。**继承来的与不可枚举的**键同样算（只走 `Object.keys` 会把这两类漏掉）。 */
  it('**入参表以外的键一律拒**：顶层与每一期都查（含继承来的与不可枚举的键）', () => {
    const withKey = (input, path, key) => {
      const clone = JSON.parse(JSON.stringify(input));
      let at = clone;
      for (const t of path) at = at[t];
      at[key] = 1;
      return clone;
    };
    const layers = [
      ['顶层', SIX, []],
      ['第一期（`periods[0]`）', SIX, ['periods', 0]],
      ['本期那一期（`periods[5]`，带 `now`）', SIX, ['periods', 5]],
    ];
    for (const [label, input, path] of layers) {
      assert.equal(typeof renderSmallMultiples(JSON.parse(JSON.stringify(input))), 'string', label + '：原样能渲出来');
      assert.equal(throwsBlocks(() => renderSmallMultiples(withKey(input, path, 'zzUnknown'))), true,
        label + ' 多给一个键（多半是打错名）必须拒，不许静默吞掉');
      /* 去掉那个未知键、其余一字不动 ⇒ 必须照常渲出来（拒的是未知键，不是这一层本身）。 */
      const clean = withKey(input, path, 'zzUnknown');
      let at = clean;
      for (const t of path) at = at[t];
      delete at.zzUnknown;
      assert.equal(throwsBlocks(() => renderSmallMultiples(clean)), false,
        label + '：把未知键去掉之后就得照常渲染（拒的是未知键，不是这一层本身）');
    }
    /* 可选键一个都不许被误拒（键表照 `attrs.ts` 的入参面逐字段列全：必填与可选都在表里）。 */
    assert.equal(throwsBlocks(() => renderSmallMultiples({
      title: 'T', form: 'columns', unit: '卡', stamp: 'W1 – W2', note: '口径', extraClass: 'a b',
      periods: [{ label: 'W1', value: 1, now: false }, { label: 'W2', value: 2, now: true }],
    })), false, '入参表里的可选键一个都不许误拒');
    /* 先例口径的两条路都要走：`Object.create({zzUnknown:1})`（**继承来的**）与
       `Object.defineProperty(…, {enumerable:false})`（**不可枚举的**）——`Object.keys` 两条都看不见。 */
    const inherited = Object.assign(Object.create({ zzUnknown: 1 }),
      { title: 'T', periods: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] });
    assert.equal(throwsBlocks(() => renderSmallMultiples(inherited)), true, '顶层继承来的未知键');
    const hidden = { title: 'T', periods: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] };
    Object.defineProperty(hidden, 'zzUnknown', { value: 1, enumerable: false });
    assert.equal(throwsBlocks(() => renderSmallMultiples(hidden)), true, '顶层不可枚举的未知键');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('small-multiples ② 样式与零 DOM 纪律', () => {
  const css = smallMultiplesCss();
  const clean = stripComments(css);

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且**只出现一次**', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = ruleSelectors(clean);
    assert.ok(selectors.length >= 16, '选择器数量不对：' + selectors.length);
    for (const raw of selectors) {
      for (const part of raw.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        assert.ok(one.includes(SMALL_MULTIPLES_CLASS), '选择器必须只碰本件类名根：' + one);
        assert.equal((one.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次（拼两遍＝永不命中的死规则）：' + one);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零 `@media`／必带 `@container` 且自己声明了容器', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(clean.includes('@media'), false, '本件不判视口宽度（视口宽 ≠ 组件宽）');
    assert.ok(clean.includes('@container (max-width:'), '窄档必须由容器判');
    assert.ok(clean.includes('container-type: inline-size'), '写了 @container 就必须自己声明容器（否则永不生效）');
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token／私有自定义属性');
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、**不拿 ink 系当面**', () => {
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外的颜色字面量：' + [...new Set(bare)].join('、'));
    const src = stripComments(styleSource('small-multiples'));
    assert.deepEqual([...src.matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [], 'style.ts 里请改走 skinVar()');
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了"面"：' + value);
    }
    /* 本期竖标＝「**无文字的点／格／条**」那一档 ⇒ `accent` **实底**（不是淡洗：淡洗对纸面过不了 3:1；
       四套实测见 ⑤ 那条判据打印的读数）。 */
    const nowRule = ruleBody(clean, '.is-now::before');
    assert.ok(nowRule !== '', '找不到本期竖标那条规则（`.is-now::before`）');
    assert.match(nowRule, /background:\s*var\(--ilife-accent\b/, '本期竖标要走 accent 实底：' + nowRule.replace(/\s+/g, ' '));
    assert.equal(/color-mix/.test(nowRule), false, '本期竖标不许是自算淡洗（既不是实底也不是 accent-soft）：'
      + nowRule.replace(/\s+/g, ' '));
    assert.equal(clean.includes('var(--ilife-danger,'), false, '本件没有语义档，不许借 danger');
  });

  it('尺寸事实写在一处：柱阵高度取常量；零 `…` 截断写法、零滚动容器', () => {
    assert.ok(clean.includes('height: ' + String(SMALL_MULTIPLES_PLOT_PX) + 'px'));
    for (const needle of ['text-overflow', 'line-clamp', 'overflow-x', 'overflow: hidden', 'overflow:hidden', 'nowrap']) {
      assert.equal(clean.includes(needle), false, '不许出现 ' + needle + '（关键语义不许截断，也不许藏横滑）');
    }
    assert.equal(clean.includes('scroll'), false, '不许出现滚动容器');
  });

  it('零键盘语汇、零可点元素（本件是纯静态图，没有运行时段）', () => {
    const words = ['快捷键', '键位', '方向键', '键帽', '键盘', '按 Enter', 'Tab'];
    const html = [SIX, EIGHT, FLAT].map((i) => renderSmallMultiples(i)).join('') + css;
    for (const w of words) assert.equal(html.includes(w), false, '出现键盘语汇：' + w);
    const interactive = [SIX, EIGHT, FLAT].map((i) => renderSmallMultiples(i)).join('');
    for (const needle of ['<button', '<a ', 'tabindex', 'onclick', '<input', '<select']) {
      assert.equal(interactive.includes(needle), false, '本件不带可点元素：' + needle);
    }
    assert.equal(readdirSync(DIR).includes('runtime.ts'), false, '纯静态图不该有运行时段（README 里写了原因）');
  });

  it('`dist/components/small-multiples/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'small-multiples');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 5, '至少该有 index／attrs／model／scale／render／style 的产物：' + files.join('、'));
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
    assert.equal(smallMultiplesSlot('col'), SMALL_MULTIPLES_CLASS + '-col');
    assert.equal(smallMultiplesSlot('col', 'x-'), 'x-block-small-multiples-col');
    for (const slot of SMALL_MULTIPLES_SLOTS) assert.ok(smallMultiplesSlot(slot).startsWith(SMALL_MULTIPLES_CLASS + '-'));
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('small-multiples ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(SMALL_MULTIPLES_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderScaleBar({ value: 860, goal: 1850 });
    const heat = renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 2, 3, 4, 5, 6, 7] }] });
    renderSmallMultiples(SIX);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), before, '别件的产物逐字节不变');
    assert.equal(renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 2, 3, 4, 5, 6, 7] }] }), heat);
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(smallMultiplesCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-small-multiples'), '前缀必须作用到 scope 与类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });
});

/* ── ④ 三档几何（真机）＋ ⑤ 皮肤纪律 ──────────────────────────────── */

/** 压力样例：六周（原型那一档）／八期（上限＋长串）／全部相等（退化）／极端长串（对抗面）／
 *  均值最高那一位＋长到换行的单位（返修点 G1：标注会不会顶出柱阵）。 */
function cases() {
  return [
    { name: 'six', html: renderSmallMultiples(SIX), bars: SIX.periods.length },
    { name: 'eight', html: renderSmallMultiples(EIGHT), bars: EIGHT.periods.length },
    { name: 'flat', html: renderSmallMultiples(FLAT), bars: FLAT.periods.length },
    { name: 'stress', html: renderSmallMultiples(STRESS), bars: STRESS.periods.length },
    { name: 'high', html: renderSmallMultiples(HIGH), bars: HIGH.periods.length },
  ];
}

/** 静态几何判据（真机起不来时的退路）：标记与样式段里不得有超过窄档的固定宽度。 */
function assertStaticGeometry(css, html) {
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const wide = [...px(html), ...px(css)].filter((v) => v > 390);
  assert.deepEqual(wide, [], '出现过不了窄档（390）的固定宽度：' + wide.join('、'));
  /* 百分比一律夹在 `[0, 100]`：**负百分比也认**（`bottom: -44%` 那类越界线曾经漏过这根正则）。 */
  const pct = [...html.matchAll(/(?:height|bottom): (-?[\d.]+)%/g)].map((m) => Number(m[1]));
  assert.ok(pct.length > 0, '柱高与均值线必须是百分比（判据会空转）');
  for (const v of pct) assert.ok(v >= 0 && v <= 100, '百分比越界：' + v);
}

describe('small-multiples ④⑤ 三档几何与皮肤纪律（真机 headless Chrome ＋ CDP）', () => {
  it('容器 320／390／1280：零横向溢出／柱、线与标注都在柱阵里／标签零截断／四套皮肤标记逐字节相同', async (t) => {
    const css = smallMultiplesCss();
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n'),
      css: skinCss() + '\n' + css,
      height: 1600,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：标记与样式段里没有超过 390px 的固定宽度');
      assertStaticGeometry(css, casesHtml);
      return t.skip('本机无 Chrome／Chromium：两档几何判据需真浏览器');
    }
    try {
      const seen = [];
      const touchReads = [];
      /* 三档：最窄（320）／窄档那一档（390）／宽档（1280）——**改的是夹具容器宽，不是视口**。 */
      for (const width of [320, 390, 1280]) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of SKIN_NAMES) {
          for (const c of cases()) {
            const scope = '.' + skinClass(skin) + ' [data-case="' + c.name + '"] ';
            const root = await page.read([scope + '.' + SMALL_MULTIPLES_CLASS]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            assert.ok(root[0].maxScrollW <= root[0].maxClientW + 1,
              width + ' 档 ' + skin + ' ' + c.name + '：根横向溢出 ' + root[0].maxScrollW + ' > ' + root[0].maxClientW);
            assert.equal(root[0].scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            /* 期间名／读数／均值标注／标题／尾注／脚注**一处都不许截断**（`…`／压字都不是本件的做法）。 */
            const texts = await page.read([smallMultiplesSlot('xperiod'), smallMultiplesSlot('xvalue'),
              smallMultiplesSlot('mean-label'), smallMultiplesSlot('title'), smallMultiplesSlot('stamp'),
              smallMultiplesSlot('tail'), smallMultiplesSlot('note')].map((slot) => scope + '.' + slot));
            for (const one of texts) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel
                + ' 有 ' + one.clipped + ' 处被截断');
            }
            /* **柱、均值线与均值那枚标注都在柱阵里**：柱顶不许冒出图区、柱底与线的两端不许跑出框、
               标注的四条边也不许越界（返修点 G1：标注曾经顶出柱阵 16px、压进卡头 6px）。 */
            if (skin === SKIN_NAMES[0]) {
              const box = await page.ev('(function(){var root=document.querySelector('
                + JSON.stringify(scope + '.' + SMALL_MULTIPLES_CLASS) + ');'
                + 'var cols=root.querySelector(' + JSON.stringify('.' + smallMultiplesSlot('cols')) + ');'
                + 'var bars=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + smallMultiplesSlot('bar')) + '));'
                + 'var mean=root.querySelector(' + JSON.stringify('.' + smallMultiplesSlot('mean')) + ');'
                + 'var lab=root.querySelector(' + JSON.stringify('.' + smallMultiplesSlot('mean-label')) + ');'
                + 'var p=cols.getBoundingClientRect();var m=mean.getBoundingClientRect();'
                + 'var l=lab===null?null:lab.getBoundingClientRect();'
                + 'var o={n:bars.length,plotW:Math.round(p.width),plotH:Math.round(p.height),'
                + 'maxRight:-1e9,minLeft:1e9,maxTop:-1e9,minBottom:1e9,'
                + 'innerW:Math.round(document.querySelector(' + JSON.stringify(scope.slice(0, -1)) + ').clientWidth)};'
                + 'for(var i=0;i<bars.length;i+=1){var r=bars[i].getBoundingClientRect();'
                + 'if(r.right>o.maxRight)o.maxRight=r.right; if(r.left<o.minLeft)o.minLeft=r.left;'
                + 'if(r.bottom>o.maxTop)o.maxTop=r.bottom; if(r.top<o.minBottom)o.minBottom=r.top;}'
                + 'return {n:o.n,plotW:o.plotW,plotH:o.plotH,innerW:o.innerW,'
                + 'plotLeft:Math.round(p.left),plotRight:Math.round(p.right),'
                + 'plotTop:Math.round(p.top),plotBottom:Math.round(p.bottom),'
                + 'maxRight:Math.round(o.maxRight),minLeft:Math.round(o.minLeft),'
                + 'maxBarBottom:Math.round(o.maxTop),minBarTop:Math.round(o.minBottom),'
                + 'meanTop:Math.round(m.top),meanBottom:Math.round(m.bottom),meanLeft:Math.round(m.left),meanRight:Math.round(m.right),'
                + 'labelTop:l===null?null:Math.round(l.top),labelBottom:l===null?null:Math.round(l.bottom),'
                + 'labelLeft:l===null?null:Math.round(l.left),labelRight:l===null?null:Math.round(l.right),'
                + 'labelH:l===null?null:Math.round(l.height)};}())');
              assert.equal(box.n, c.bars, width + ' 档 ' + skin + ' ' + c.name + '：柱数不对');
              assert.ok(box.maxRight <= box.plotRight + 1, width + ' 档 ' + skin + ' ' + c.name + '：有柱跑出柱阵右边');
              assert.ok(box.minLeft >= box.plotLeft - 1, width + ' 档 ' + skin + ' ' + c.name + '：有柱跑出柱阵左边');
              assert.ok(box.minBarTop >= box.plotTop - 1, width + ' 档 ' + skin + ' ' + c.name + '：有柱冒出柱阵上边');
              assert.ok(box.maxBarBottom <= box.plotBottom + 1, width + ' 档 ' + skin + ' ' + c.name + '：有柱沉到基线下面');
              assert.ok(box.meanTop >= box.plotTop - 1 && box.meanBottom <= box.plotBottom + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：均值线跑出柱阵');
              assert.ok(box.meanLeft >= box.plotLeft - 1 && box.meanRight <= box.plotRight + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：均值线两端出框');
              assert.ok(box.labelTop !== null, width + ' 档 ' + skin + ' ' + c.name + '：找不到均值那枚标注');
              assert.ok(box.labelTop >= box.plotTop - 1 && box.labelBottom <= box.plotBottom + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：均值标注越出柱阵（上 ' + (box.plotTop - box.labelTop)
                + 'px／下 ' + (box.labelBottom - box.plotBottom) + 'px，标注高 ' + box.labelH + 'px）');
              assert.ok(box.labelLeft >= box.plotLeft - 1 && box.labelRight <= box.plotRight + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：均值标注横向出框');
              seen.push({ width, name: c.name, plotH: box.plotH, plotW: box.plotW, innerW: box.innerW,
                labelH: box.labelH, rootScrollW: root[0].maxScrollW, rootClientW: root[0].maxClientW });
              /* 8 期那档的**列宽**（触控那条建议的成立条件）：横轴标签一枚＝一列。 */
              if (c.name === 'eight') {
                const touch = await page.ev('(function(){var els=[].slice.call(document.querySelectorAll('
                  + JSON.stringify(scope + '.' + smallMultiplesSlot('xlabel')) + '));'
                  + 'var w=1e9;var h=1e9;for(var i=0;i<els.length;i+=1){var r=els[i].getBoundingClientRect();'
                  + 'if(r.width<w)w=r.width; if(r.height<h)h=r.height;}'
                  + 'return {n:els.length,minW:Math.round(w*10)/10,minH:Math.round(h*10)/10};}())');
                assert.equal(touch.n, EIGHT.periods.length, width + ' 档：横轴标签枚数不对');
                touchReads.push({ width, minW: touch.minW, minH: touch.minH });
              }
            }
          }
        }
      }
      /* **窄档是容器驱动的**：同一份标记，320／390 档柱阵都比 1280 档矮一档（视口没变，只改了夹具容器宽）。 */
      const narrow = seen.filter((s) => s.width < 460).map((s) => s.plotH);
      const wide = seen.filter((s) => s.width === 1280).map((s) => s.plotH);
      assert.equal(wide.every((h) => h === SMALL_MULTIPLES_PLOT_PX), true,
        '1280 档柱阵高度应取常量 ' + SMALL_MULTIPLES_PLOT_PX + '：' + JSON.stringify(wide));
      assert.equal(narrow.every((h) => h < SMALL_MULTIPLES_PLOT_PX), true,
        '320／390 档柱阵应收一档（@container 判的是本件自己的宽度）：' + JSON.stringify(narrow));
      /* **触控那条建议的成立条件**（README 常见错法里写着）：8 期的列宽 ＝ (容器宽 − 间距) ÷ 期数，
         320 档不到 44px、390 档才够 ⇒ 门槛数必须落在 (320, 390]。 */
      const colW = (w) => (w - (w < NARROW_PX ? NARROW_COL_GAP_PX : COL_GAP_PX)
        * (EIGHT.periods.length - 1)) / EIGHT.periods.length;
      for (const t of touchReads) {
        assert.ok(Math.abs(t.minW - colW(t.width)) <= 1,
          t.width + ' 档：8 期列宽 ' + t.minW + 'px 与「(容器宽 − 间距) ÷ 期数」算出来的 ' + colW(t.width) + 'px 对不上');
      }
      const at320 = touchReads.find((t) => t.width === 320);
      const at390 = touchReads.find((t) => t.width === 390);
      assert.ok(at320 !== undefined && at390 !== undefined, '触控列宽读数缺档：' + JSON.stringify(touchReads));
      assert.ok(at320.minW < TOUCH_FLOOR_PX && at320.minH >= TOUCH_FLOOR_PX,
        '320 档 8 期的命中盒应当**宽不到 44px**（README 那条建议要写条件）：' + JSON.stringify(at320));
      assert.ok(at390.minW >= TOUCH_FLOOR_PX && at390.minH >= TOUCH_FLOOR_PX,
        '390 档 8 期的命中盒应当够 44×44：' + JSON.stringify(at390));
      assert.ok(TOUCH_MIN_CONTAINER_PX > at320.width && TOUCH_MIN_CONTAINER_PX <= at390.width,
        'README 里的门槛数 ' + TOUCH_MIN_CONTAINER_PX + 'px 与真机读数不相容（320 档不够、390 档够）');
      console.log('READING small-multiples 8 期触控命中盒（横轴标签一枚）＝ '
        + touchReads.map((t) => t.width + ' 档 ' + t.minW + '×' + t.minH).join('／')
        + '；门槛数 ' + TOUCH_MIN_CONTAINER_PX + 'px（44×8 ＋ 4×7）');
      /* ⑤ 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const c of cases()) {
        for (const width of [390, 1280]) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
            + 'for (var i = 0; i < skins.length; i += 1) {'
            + '  var el = document.querySelector("." + "ilife-skin-" + skins[i]'
            + ' + " [data-case=' + c.name + '] .' + SMALL_MULTIPLES_CLASS + '");'
            + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
            + '} return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
          }
        }
      }
      /* 取值来自皮肤表：柱与本期竖标＝`accent` **实底**（竖标的图形对比 ≥3:1 逐套算出来）；
         「本期」那枚字＝`accent-text`；轴上两行与卡头那枚胶囊的层级照原型。 */
      const contrastReads = [];
      for (const skin of SKIN_NAMES) {
        const vals = SKIN_VALUES[skin];
        /** 皮肤容器里 `[data-case=six]` 那件的某个槽（`JSON.stringify` 之后是**一个整体**的串）。 */
        const sel = (slot, extra = '') => JSON.stringify('.' + skinClass(skin) + ' [data-case=six] .'
          + smallMultiplesSlot(slot) + extra);
        const colors = await page.ev('(function(){var bar=document.querySelector(' + sel('bar') + ');'
          + 'var note=document.querySelector(' + sel('nowmark') + ');'
          + 'var nowCol=document.querySelector(' + sel('col', '.is-now') + ');'
          + 'var xp=document.querySelector(' + sel('xperiod') + ');'
          + 'var xv=document.querySelector(' + sel('xvalue') + ');'
          + 'var st=document.querySelector(' + sel('stamp') + ');'
          + 'var cs=nowCol===null?null:getComputedStyle(nowCol,"::before");'
          + 'var g=function(el){return el===null?null:getComputedStyle(el);};'
          + 'return {bar:g(bar)===null?null:g(bar).backgroundColor,'
          + 'note:g(note)===null?null:g(note).color,'
          + 'mark:cs===null?null:cs.width, markContent:cs===null?null:cs.content,'
          + 'markBg:cs===null?null:cs.backgroundColor,'
          + 'periodColor:g(xp)===null?null:g(xp).color, periodWeight:g(xp)===null?null:g(xp).fontWeight,'
          + 'valueColor:g(xv)===null?null:g(xv).color, valueWeight:g(xv)===null?null:g(xv).fontWeight,'
          + 'stampColor:g(st)===null?null:g(st).color, stampBorder:g(st)===null?null:g(st).borderTopWidth,'
          + 'stampMinH:g(st)===null?null:g(st).minHeight};}())');
        assert.equal(colors.bar, toRgb(vals['accent']), skin + '：柱取 accent 实底');
        assert.equal(colors.note, toRgb(vals['accent-text']), skin + '：「本期」那枚字取 accent-text');
        assert.equal(colors.mark, '2px', skin + '：本期那一列的竖标要在（形，不只靠色）');
        assert.ok(colors.markContent !== 'none', skin + '：竖标得真的画出来（不是 content:none 的空壳）');
        /* 竖标＝「无文字的点／格／条」那一档 ⇒ **accent 实底**；对比地板 3:1 逐套算（不抄别处的结论）。 */
        assert.equal(colors.markBg, toRgb(vals['accent']), skin + '：本期竖标取 accent 实底（不是自算淡洗）');
        const markContrast = contrast(vals['accent'], vals['surface']);
        assert.ok(markContrast >= 3, skin + '：竖标（accent 实底）对纸面 ' + markContrast.toFixed(2)
          + ':1 低于 3:1 的图形地板');
        contrastReads.push(skin + ' ' + markContrast.toFixed(2) + ':1');
        /* 原型那一档的层级（返修点 G6）：轴上**读数是最重的一行**、期间名退一档；卡头那枚是描边胶囊。 */
        assert.equal(colors.periodColor, toRgb(vals['ink-2']), skin + '：轴上期间名取 ink-2');
        assert.equal(colors.periodWeight, '600', skin + '：轴上期间名的字重 600');
        assert.equal(colors.valueColor, toRgb(vals['ink']), skin + '：轴上读数取 ink（那一列最重的一行）');
        assert.equal(colors.valueWeight, '700', skin + '：轴上读数的字重 700');
        assert.equal(colors.stampColor, toRgb(vals['accent-text']), skin + '：卡头期间范围的字取 accent-text');
        assert.equal(colors.stampBorder, '1px', skin + '：卡头期间范围要有描边（原型 `.chip` 那条发丝边）');
        assert.equal(colors.stampMinH, '30px', skin + '：卡头期间范围是 30px 高的胶囊（原型 `.chip`）');
      }
      console.log('READING small-multiples 本期竖标对纸面（accent 实底）：' + contrastReads.join('／'));
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of [320, 390, 1280]) {
        const rows = seen.filter((s) => s.width === w);
        console.log('READING small-multiples container=' + w
          + ' plotW=' + rows[0].plotW + ' plotH=' + rows[0].plotH
          + ' maxRootScrollW=' + Math.max(...rows.map((s) => s.rootScrollW))
          + ' maxRootClientW=' + Math.max(...rows.map((s) => s.rootClientW))
          + ' 标注高=' + rows.map((s) => s.name + ':' + s.labelH).join(',')
          + ' cases=' + rows.length);
      }
    } finally { page.close(); }
  });
});

/* ── ⑥ 文档与偏离留档 ─────────────────────────────────────────────── */

describe('small-multiples ⑥ 文档与偏离留档（README 与代码不许各说一套）', () => {
  const readme = readFileSync(join(DIR, 'README.md'), 'utf8');

  it('README 写着均值取整的两条分支、同名拒绝，以及触控那条的成立条件（门槛数与真机读数相容）', () => {
    for (const needle of ['取到整数', '两位小数', '两位有效数字', '0.0015', '0.007']) {
      assert.ok(readme.includes(needle), 'README 的均值取整口径缺一句：' + needle);
    }
    assert.ok(readme.includes('不许与别的期间同名'), 'README 入参表要写明期间名不许重复');
    assert.ok(readme.includes('两期同名'), 'README 常见错法要写同名那一档');
    /* 触控那条：门槛数＝`TOUCH_FLOOR_PX×期数 ＋ 间距×(期数−1)`（判据自己算，README 里那个数要与它逐字对上）。 */
    assert.ok(readme.includes(String(TOUCH_MIN_CONTAINER_PX)), 'README 要写清门槛容器宽 ' + TOUCH_MIN_CONTAINER_PX + 'px');
    assert.ok(/≥\s*380px/.test(readme), 'README 那条建议要有可判的条件（`≥380px`）');
    for (const w of ['320', '390', '1280']) {
      assert.ok(readme.includes(w), 'README 里要写清判据量的那几档容器宽：' + w);
    }
  });

  it('README 有「与原型的有意偏离」一节，逐条写清理由（改回原型的也点名）', () => {
    assert.ok(readme.includes('与原型的有意偏离'), '偏离表要在 README 里留档');
    for (const needle of ['left:-9px', 'nowrap', '颜色词']) {
      assert.ok(readme.includes(needle), '偏离表缺一条：' + needle);
    }
    assert.ok(readme.includes('已按原型改回'), '改回原型的也点个名（轴上层级与卡头那枚胶囊）');
  });
});
