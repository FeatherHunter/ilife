/** radar-profile（多维画像雷达 · 三个形态：多边形雷达／极区扇图／展平成轴表）· 契约测试。
 *
 * 覆盖五组判据：
 *  ① **渲染契约**：三形态各自的槽位与枚数／**刻度与坐标同一份真值**（从**印出来的刻度**反推半径基准，
 *     再把每个顶点、每根扇区、轨道上那根竖线对回它自己的读数）／角度按"0 号轴在正中、顺时针"／
 *     缺测轴**整根不落图**且读数写 `—`／三形态的缺槽分支／转义面／**全部**非法入参分支（每个都断 `BlocksError`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且**只出现一次**
 *     （含 `@container` 里的那几条）、零 `:root`／`!important`／零新 token／零 `@media` 宽度查询／
 *     零手写色值（只有 `skinVar()` 兜底链那一处）／零把 `ink` 系当面／零键盘语汇／零可点元素／
 *     **两处容器阈值只有一处来源**；
 *  ③ **加法式**：本件只读自己的类名；不启用它的页面零命中、逐字节不变；
 *  ④ **四档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 320／390／620／1280 下零横向溢出
 *     （含长标题／六字轴名全开／全满分三种压力样例）、轴名与读数零截断、顶点全在图框里、
 *     窄档与宽档由**容器**判（视口没变，只改夹具容器宽度）；**起不来就退确定性几何判据并打印原因**；
 *  ⑤ **皮肤纪律**：同一份入参渲染三次逐字节相同、标记不带皮肤类、真机上四套皮肤里的 `innerHTML`
 *     逐字节相同、达标扇区真取到取值表里的 `ok`、未达标真取到 `warn`。
 *
 * 期望值一律从组件自己的常量派生（`RADAR_PROFILE_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RADAR_PROFILE_CLASS,
  RADAR_PROFILE_DEFAULT_GOAL,
  RADAR_PROFILE_FORMS,
  RADAR_PROFILE_MAX_AXES,
  RADAR_PROFILE_MAX_LABEL_CHARS,
  RADAR_PROFILE_MIN_AXES,
  RADAR_PROFILE_MISSING,
  RADAR_PROFILE_NARROW_PX,
  RADAR_PROFILE_RINGS,
  RADAR_PROFILE_SLOTS,
  RADAR_PROFILE_WIDE_PX,
  radarProfileCss,
  radarProfileSlot,
  renderRadarProfile,
} from '../dist/components/radar-profile/index.js';
import { renderHeatGrid } from '../dist/components/heat-grid/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKINS, skinCss, skinClass } from '../dist/components/skin/index.js';
import { SKIN_NAMES } from '../dist/components/skin/contract.js';
import { startShapesPage } from './shapes-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'radar-profile');

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

/** 某个槽在标记里出现的次数（`class="…-槽"` 或 `class="…-槽 is-…"`）。 */
const slotCount = (html, slot) => countOf(html, 'class="' + radarProfileSlot(slot) + '[ "]');

/** 一个槽的文本（逐个）：`class="…-槽[ is-…]"[^>]*>文本<`（状态类也认）。 */
const slotTexts = (html, slot) => [...html.matchAll(
  new RegExp('class="' + radarProfileSlot(slot) + '(?: [^"]*)?"[^>]*>([^<]*)<', 'g'))].map((m) => m[1]);

/** 一段文本出现的次数（**不当正则用**：查询串里有括号与点）。 */
const countText = (text, needle) => text.split(needle).length - 1;

/* ── 刻度与坐标：**从印出来的刻度反推**，不读组件里的半径常量 ────────────── */

/** 印在刻度条上的三个数（`里圈 33 分` → 33）：这一张图的尺子。 */
const printedRings = (html) => slotTexts(html, 'scale-item').map((t) => Number(/([\d.]+)/.exec(t)[1]));

/** 网格三圈的半径（画出来的那三个）。 */
const drawnRings = (html) => [...html.matchAll(
  new RegExp('class="' + radarProfileSlot('ring') + '[^"]*" cx="[\\d.]+" cy="[\\d.]+" r="([\\d.]+)"', 'g'))]
  .map((m) => Number(m[1]));

/** 一个读数该落在那根轴上哪里：**半径基准 ＝ 外圈半径 ÷ 印出来的外圈数**，方向 ＝ 正中起顺时针。 */
function expectPoint(index, count, value, ringRadius, ringValue) {
  const radius = (value / ringValue) * ringRadius;
  const rad = ((-90 + (index * 360) / count) * Math.PI) / 180;
  return { x: 100 + radius * Math.cos(rad), y: 100 + radius * Math.sin(rad), radius };
}

/** 顶点（`class="…-dot" cx cy`）按标记顺序取回来。 */
const dotsOf = (html, extra = '') => [...html.matchAll(
  new RegExp('class="' + radarProfileSlot('dot') + extra + '" cx="([\\d.-]+)" cy="([\\d.-]+)"', 'g'))]
  .map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));

/** 扇区与外沿弧的半径（路径里 `A r,r` 的那两个数）。 */
const arcRadiiOf = (html, slot) => [...html.matchAll(
  new RegExp('class="' + radarProfileSlot(slot) + '[^"]*" d="[^"]*A([\\d.]+),([\\d.]+) ', 'g'))]
  .map((m) => [Number(m[1]), Number(m[2])]);

/* ── 样例 ─────────────────────────────────────────────────────────── */

const AXES = [
  { label: '体重达标', score: 62, past: 48 },
  { label: '体脂', score: 58, past: 41 },
  { label: '肌肉量', score: 74, past: 70 },
  { label: '睡眠', score: 82, past: 63 },
  { label: '训练频次', score: 55, past: 62 },
  { label: '饮食打卡', score: 78, past: 52 },
];
const POLYGON = { title: '体测画像', axes: AXES, stamp: '09-24', pastStamp: '08-24' };
/** 六根轴、奇数根、最大根数各一份：角度与枚数的判据都拿它们走一遍。 */
const AXES_5 = [
  { label: '蛋白质', score: 70 }, { label: '饮水', score: 40 }, { label: '膳食纤维', score: 88 },
  { label: '盐分', score: 30 }, { label: '作息', score: 95 },
];
const AXES_8 = [
  { label: '蛋白质', score: 70 }, { label: '饮水', score: 40 }, { label: '膳食纤维', score: 88 },
  { label: '盐分', score: 30 }, { label: '作息', score: 95 }, { label: '步数', score: 51 },
  { label: '久坐', score: 66 }, { label: '心情', score: 77 },
];
const AXES_3 = [{ label: '体重', score: 62 }, { label: '体脂', score: 58 }, { label: '肌肉', score: 74 }];
const WEDGE = { title: '本周作息画像', axes: AXES.map(({ label, score }) => ({ label, score })), form: 'wedge', stamp: '满分 100' };
const RAIL = {
  title: '体测画像 · 展平',
  form: 'rail',
  stamp: '0–100 分位',
  axes: [
    { label: '体重达标', score: 62, note: 'BMI 18.5–24', band: { low: 40, high: 100 } },
    { label: '体脂', score: 58, note: '15–22%', band: { low: 30, high: 80 } },
    { label: '肌肉量', score: null, note: '高于同龄中位', band: { low: 50, high: 100 } },
    { label: '睡眠', score: 82, note: '7–9 小时', band: { low: 45, high: 95 } },
    { label: '训练频次', score: 55, note: '每周 3–5 次', band: { low: 52, high: 92 } },
    { label: '饮食打卡', score: 44, note: '每周 ≥6 天', band: { low: 60, high: 100 } },
  ],
};

/* ── ① 渲染契约 · 形态 `polygon` ─────────────────────────────────────── */

describe('radar-profile ① 渲染契约 · 形态 polygon（多边形雷达）', () => {
  const html = renderRadarProfile(POLYGON);

  it('骨架：卡头 → （图 ＋ 读数表）→ 刻度条 → 图例 → 脚注', () => {
    assert.match(html, new RegExp('^<div class="' + RADAR_PROFILE_CLASS + ' is-polygon">'));
    assert.equal(countOf(html, 'class="[^"]*-ring[ "]'), RADAR_PROFILE_RINGS.length, '网格三圈');
    assert.equal(slotCount(html, 'spoke'), AXES.length, '一根轴一根辐条');
    assert.equal(slotCount(html, 'dot'), AXES.length, '一根轴一个顶点');
    assert.equal(slotCount(html, 'axlabel'), AXES.length, '一根轴一块轴名');
    assert.equal(countOf(html, radarProfileSlot('now') + '"'), 1, '本期轮廓');
    assert.equal(countOf(html, radarProfileSlot('past') + '"'), 1, '上期轮廓');
    assert.equal(slotCount(html, 'trow'), AXES.length + 1, '读数表＝表头 ＋ 每根轴一行');
    assert.equal(slotCount(html, 'tnum'), 3 + AXES.length * 2, '表头三个数（本期／上期／差）＋每行两个数');
    assert.equal(slotCount(html, 'tdelta'), AXES.length, '每行一个差');
    assert.equal(slotCount(html, 'scale-item'), RADAR_PROFILE_RINGS.length, '刻度条印三个数');
    assert.equal(slotCount(html, 'legend-item'), 2, '本期与上期两条图例');
    assert.match(html, /-tail">本期平均 68 分，比上期高 12 分</, '卡头那句是**算出来**的');
    assert.equal(/<script/i.test(html), false, '不产脚本');
    for (const slot of ['hd', 'title', 'stamp', 'body', 'stage', 'plot', 'svg', 'table', 'legend', 'note']) {
      assert.ok(html.includes(radarProfileSlot(slot)), '缺槽：' + slot);
    }
  });

  it('**刻度与坐标同一份真值**：从印出来的刻度反推半径基准，逐点对账（三／五／六／八根轴各一遍）', () => {
    for (const axes of [AXES_3, AXES_5, AXES, AXES_8]) {
      const h = renderRadarProfile({ title: 'x', axes });
      const printed = printedRings(h);
      const rings = drawnRings(h);
      assert.deepEqual(printed, [...RADAR_PROFILE_RINGS], '刻度条印的就是那三级');
      assert.equal(rings.length, printed.length);
      /* 网格半径与刻度**逐级成正比**（同一支映射；两处各写一套必然走散）。 */
      printed.forEach((value, i) => {
        assert.ok(Math.abs(rings[i] / rings[printed.length - 1] - value / printed[printed.length - 1]) < 1e-3,
          '第 ' + (i + 1) + ' 圈的半径与印出来的数不成比例：' + rings[i] + ' vs ' + value);
      });
      const outerR = rings[printed.length - 1];
      const outerV = printed[printed.length - 1];
      /* **逐点对账**：每个顶点的坐标 ＝ 按印出来的刻度算出来的位置。 */
      const dots = dotsOf(h);
      assert.equal(dots.length, axes.length, '顶点枚数');
      axes.forEach((a, i) => {
        const want = expectPoint(i, axes.length, a.score, outerR, outerV);
        assert.ok(Math.abs(dots[i].x - want.x) < 0.05, '第 ' + (i + 1) + ' 个顶点横坐标对不上：' + dots[i].x + ' vs ' + want.x);
        assert.ok(Math.abs(dots[i].y - want.y) < 0.05, '第 ' + (i + 1) + ' 个顶点纵坐标对不上：' + dots[i].y + ' vs ' + want.y);
      });
      /* 轮廓的点串与顶点是同一批数（两个形态共用一支映射）。 */
      const nowPoints = [...h.matchAll(new RegExp('class="' + radarProfileSlot('now') + '" points="([^"]+)"', 'g'))][0][1]
        .split(' ').map((pair) => pair.split(',').map(Number));
      assert.deepEqual(nowPoints, dots.map((d) => [d.x, d.y]), '轮廓的顶点与画出来的点必须是同一批坐标');
      /* 辐条长度 ＝ 外圈半径（辐条是**轴**，不随读数变短）。 */
      for (const m of h.matchAll(new RegExp('class="' + radarProfileSlot('spoke') + '" x1="100" y1="100" x2="([\\d.]+)" y2="([\\d.]+)"', 'g'))) {
        const r = Math.hypot(Number(m[1]) - 100, Number(m[2]) - 100);
        assert.ok(Math.abs(r - outerR) < 0.05, '辐条不落在外圈上：' + r + ' vs ' + outerR);
      }
      /* **外圈画在轴名锚点以内**：轴名的那几个百分比反推回画布坐标（200 单位那套）就是锚点半径，
         满分那一圈必须小于它——否则轴名压在网格上、读数落在圈外（"整张图换了一把尺子"就是这么露的）。 */
      const anchors = [...h.matchAll(new RegExp('class="' + radarProfileSlot('axlabel') + '[^"]*" style="left: ([\\d.]+)%; top: ([\\d.]+)%"', 'g'))]
        .map((m) => Math.hypot(Number(m[1]) * 2 - 100, Number(m[2]) * 2 - 100));
      assert.equal(anchors.length, axes.length, '轴名锚点枚数');
      for (const a of anchors) {
        assert.ok(a > outerR + 1, '满分那一圈（' + outerR + '）压到轴名锚点（' + a.toFixed(2) + '）上了');
      }
      /* 锚点**彼此半径相同**：轴名一律浮在同一圈上（不随读数里进里出）。 */
      for (const a of anchors) assert.ok(Math.abs(a - anchors[0]) < 0.05, '轴名锚点半径不一致：' + JSON.stringify(anchors));
    }
  });

  it('角度：0 号轴在正上方，序号递增即顺时针（八根轴那一份逐个对角度）', () => {
    const h = renderRadarProfile({ title: 'x', axes: AXES_8.map((a) => ({ label: a.label, score: 100 })) });
    const dots = dotsOf(h);
    dots.forEach((p, i) => {
      const deg = (Math.atan2(p.y - 100, p.x - 100) * 180) / Math.PI;
      const want = -90 + (i * 360) / AXES_8.length;
      const diff = Math.abs(((deg - want + 540) % 360) - 180);
      assert.ok(diff < 0.2, '第 ' + (i + 1) + ' 根轴的角度不对：' + deg.toFixed(2) + ' vs ' + want);
    });
  });

  it('缺测的轴**整根不画**（辐条与顶点一起不画），读数写 `—`，表里也是 `—`，不当 0 分算', () => {
    const h = renderRadarProfile({
      title: 'x',
      axes: [{ label: '甲', score: 80 }, { label: '乙', score: null }, { label: '丙', score: 40 }, { label: '丁', score: 60 }],
    });
    assert.equal(slotCount(h, 'spoke'), 3, '缺测那一根没有辐条');
    assert.equal(slotCount(h, 'dot'), 3, '缺测那一根没有顶点');
    assert.equal(slotCount(h, 'axlabel'), 4, '轴名照出（读者要知道这一根没测）');
    assert.match(h, /class="[^"]*-axlabel is-[a-z]+ is-missing"[^>]*><b[^>]*>乙<\/b><em[^>]*>—<\/em>/);
    assert.equal(slotTexts(h, 'axvalue').filter((t) => t === RADAR_PROFILE_MISSING).length, 1);
    /* 轮廓只连有读数的四根里的三根：乙 那个下标上没有顶点。 */
    const points = [...h.matchAll(new RegExp('class="' + radarProfileSlot('now') + '" points="([^"]+)"', 'g'))][0][1];
    assert.equal(points.split(' ').length, 3, '轮廓不拿缺测当 0 分算（0 分会落在圆心，形状被撕一个口子）');
    /* 表里那一行：本期 `—`。 */
    const rows = [...h.matchAll(new RegExp('<div class="' + radarProfileSlot('trow') + '">(.*?)</div>', 'g'))].map((m) => m[1]);
    const row = rows.find((r) => r.includes('>乙<'));
    assert.ok(row.includes('>' + RADAR_PROFILE_MISSING + '<'), '表里写 `—`：' + row);
  });

  it('没有上期就不出上期那一列／那条轮廓（不是画一条 0 轮廓）', () => {
    const h = renderRadarProfile({ title: 'x', axes: AXES_3 });
    assert.equal(h.includes(radarProfileSlot('past')), false);
    assert.equal(slotCount(h, 'tnum'), AXES_3.length + 1, '只有本期一列数');
    assert.equal(slotCount(h, 'legend-item'), 1);
    assert.match(h, /-tail">本期平均 [\d.]+ 分</, '没有上期就不说"比上期"');
  });

  it('差那一格：进／退给方向字形与正负号，持平与缺测各写各的字（不从颜色判方向）', () => {
    const h = renderRadarProfile({
      title: 'x',
      axes: [
        { label: '甲', score: 80, past: 60 }, { label: '乙', score: 40, past: 70 },
        { label: '丙', score: 50, past: 50 }, { label: '丁', score: 70, past: null },
      ],
    });
    assert.deepEqual(slotTexts(h, 'tdelta'), ['▲ +20', '▼ −30', '持平', RADAR_PROFILE_MISSING]);
    assert.match(h, new RegExp('class="' + radarProfileSlot('tdelta') + ' is-up"'));
    assert.match(h, new RegExp('class="' + radarProfileSlot('tdelta') + ' is-down"'));
    assert.match(h, new RegExp('class="' + radarProfileSlot('tdelta') + ' is-flat"'));
    assert.match(h, new RegExp('class="' + radarProfileSlot('tdelta') + ' is-none"'));
  });

  it('刻度条印的就是网格三级（三个槽各一枚数，判据与读者读同一份真值）', () => {
    assert.deepEqual(printedRings(renderRadarProfile(POLYGON)), [...RADAR_PROFILE_RINGS]);
    assert.deepEqual(slotTexts(renderRadarProfile(POLYGON), 'scale-item').map((t) => t.replace(/[\d.]+/, '#')),
      ['里圈 # 分', '中圈 # 分', '外圈 # 分']);
  });
});

/* ── ① 渲染契约 · 形态 `wedge` ──────────────────────────────────────── */

describe('radar-profile ① 渲染契约 · 形态 wedge（极区扇图）', () => {
  const html = renderRadarProfile(WEDGE);

  it('骨架：逐根扇区 ＋ 外沿弧 ＋ 达标环 ＋ 圆心平均分 ＋ 图例 ＋ 未达标点名', () => {
    assert.match(html, new RegExp('^<div class="' + RADAR_PROFILE_CLASS + ' is-wedge">'));
    assert.equal(slotCount(html, 'wedge'), AXES.length, '一根轴一片扇区');
    assert.equal(slotCount(html, 'warc'), AXES.length, '每片扇区一道外沿弧');
    assert.equal(slotCount(html, 'dot'), AXES.length);
    assert.equal(slotCount(html, 'goal'), 1, '达标环只有一条');
    assert.equal(slotCount(html, 'hub'), 1);
    assert.equal(slotTexts(html, 'hub-value')[0], '68', '圆心是**平均分**（62+58+74+82+55+78 = 409，÷6 ≈ 68）');
    assert.equal(slotTexts(html, 'hub-label')[0], '平均分');
    assert.match(html, /-tail">平均 68 分，达标 1 根轴</);
    assert.equal(slotCount(html, 'gap'), 5, '未达标 5 根逐根点名');
    assert.equal(html.includes(radarProfileSlot('table')), false, '本形态不带读数表');
  });

  it('**半径比例于得分**：从印出来的达标分反推半径基准，逐片扇区对账', () => {
    /* 达标环的半径与**印在图例里**的达标分是同一份真值：拿它当尺子。 */
    const goalR = Number(new RegExp('class="' + radarProfileSlot('goal') + '" cx="[\\d.]+" cy="[\\d.]+" r="([\\d.]+)"')
      .exec(html)[1]);
    const goalPrinted = Number(slotTexts(html, 'goal-num')[0]);
    assert.equal(goalPrinted, RADAR_PROFILE_DEFAULT_GOAL, '不给 goal 就是缺省的达标线');
    const arcRadii = arcRadiiOf(html, 'wedge');
    assert.equal(arcRadii.length, AXES.length);
    AXES.forEach((a, i) => {
      const want = (a.score / goalPrinted) * goalR;
      assert.ok(Math.abs(arcRadii[i][0] - want) < 0.05, '第 ' + (i + 1) + ' 片扇区的半径与读数对不上：'
        + arcRadii[i][0] + ' vs ' + want);
      assert.ok(Math.abs(arcRadii[i][1] - want) < 0.05, '弧的两个半径必须相同');
    });
    /* 外沿弧与扇区是同一批数（一个画边、一个画面）。 */
    assert.deepEqual(arcRadiiOf(html, 'warc'), arcRadii, '外沿弧与扇区的半径必须逐片相同');
    /* 顶点落在外沿弧的中点上：即"那根轴上的读数位置"。 */
    const dots = dotsOf(html);
    AXES.forEach((a, i) => {
      const r = Math.hypot(dots[i].x - 100, dots[i].y - 100);
      assert.ok(Math.abs(r - arcRadii[i][0]) < 0.05, '顶点不在外沿弧上：' + r + ' vs ' + arcRadii[i][0]);
    });
  });

  it('达标／未达标按印出来的达标分逐片判：达标走 `is-ok`，未达标走 `is-warn`', () => {
    const okFlags = [...html.matchAll(new RegExp('class="' + radarProfileSlot('wedge') + ' (is-ok|is-warn)"', 'g'))]
      .map((m) => m[1] === 'is-ok');
    assert.deepEqual(okFlags, AXES.map((a) => a.score >= RADAR_PROFILE_DEFAULT_GOAL));
    assert.match(html, /达标 1 根轴（评分 <b class="[^"]*-goal-num">80<\/b> 分及以上）/);
    assert.match(html, /未达标 5 根轴/);
  });

  it('未达标逐根点名：差的分数写成字，先给差得最多的那根', () => {
    assert.deepEqual(slotTexts(html, 'gap-name'), ['训练频次', '体脂', '体重达标', '肌肉量', '饮食打卡']);
    assert.deepEqual(slotTexts(html, 'gap-diff'), ['差 25 分', '差 22 分', '差 18 分', '差 6 分', '差 2 分']);
    assert.deepEqual(slotTexts(html, 'gap-num'), ['55 分', '58 分', '62 分', '74 分', '78 分']);
  });

  it('全都达标就不出点名清单（不是出一张空表）；达标线可以给别的数', () => {
    const all = renderRadarProfile({
      title: 'x', form: 'wedge', goal: 50, axes: AXES.map(({ label, score }) => ({ label, score })),
    });
    assert.equal(slotCount(all, 'gap'), 0);
    assert.equal(all.includes(radarProfileSlot('gaps')), false);
    assert.equal(slotTexts(all, 'goal-num')[0], '50');
    assert.match(all, /达标 6 根轴（评分 <b[^>]*>50<\/b> 分及以上）/);
    assert.equal(countOf(all, ' is-warn"'), 0, '没有未达标就不该有 warn 扇区');
  });
});

/* ── ① 渲染契约 · 形态 `rail` ───────────────────────────────────────── */

describe('radar-profile ① 渲染契约 · 形态 rail（展平成轴表）', () => {
  const html = renderRadarProfile(RAIL);

  it('骨架：每根轴一行（轴名 ｜ 轨道 ｜ 判定），轨道里是基线 ＋ 基准带 ＋ 当前位置 ＋ 读数', () => {
    assert.match(html, new RegExp('^<div class="' + RADAR_PROFILE_CLASS + ' is-rail">'));
    assert.equal(slotCount(html, 'row'), RAIL.axes.length);
    assert.equal(slotCount(html, 'track'), RAIL.axes.length);
    assert.equal(slotCount(html, 'base'), RAIL.axes.length, '每一行都有一条基线');
    assert.equal(slotCount(html, 'band'), 6, '六根都给了基准带');
    assert.equal(slotCount(html, 'mark'), 5, '缺测那一根不画竖线（画在 0 上就是拿缺测当 0 分算）');
    assert.equal(slotCount(html, 'rval'), RAIL.axes.length, '读数一个不缺');
    assert.equal(slotCount(html, 'verdict'), RAIL.axes.length);
    assert.equal(slotCount(html, 'rsub'), 6, '轴名下面那行小字（调用方给的说明）');
    assert.equal(html.includes(radarProfileSlot('svg')), false, '本形态不带图');
  });

  it('**位置与印出来的数一致**：竖线在读数那个位置，基准带的两端就是印出来的那两个数', () => {
    const ats = [...html.matchAll(/--radar-profile-at: ([\d.]+)%/g)].map((m) => Number(m[1]));
    const printeds = slotTexts(html, 'rval').filter((t) => t !== RADAR_PROFILE_MISSING).map(Number);
    assert.deepEqual(ats, printeds, '竖线的位置就是那个读数（0…100 分位 ↔ 0…100% 轨道）');
    const bands = [...html.matchAll(/--radar-profile-b1: ([\d.]+)%; --radar-profile-b2: ([\d.]+)%/g)]
      .map((m) => [Number(m[1]), Number(m[2])]);
    const printedBands = slotTexts(html, 'rband').map((t) => [...t.matchAll(/([\d.]+)/g)].map((m) => Number(m[1])));
    assert.deepEqual(bands, printedBands, '基准带的两端＝印在判定下面那两个数');
    assert.equal(slotTexts(html, 'rband')[0], '带 40–100 分');
  });

  it('判定四档：在带内走灰字、出带点名差多少分、未给带与未测各写各的字', () => {
    const kinds = [...html.matchAll(new RegExp('class="' + radarProfileSlot('verdict') + ' is-([a-z]+)"', 'g'))].map((m) => m[1]);
    assert.deepEqual(kinds, ['in', 'in', 'missing', 'in', 'in', 'low']);
    assert.deepEqual(slotTexts(html, 'verdict'),
      ['✓ 在带内', '✓ 在带内', RADAR_PROFILE_MISSING + ' 未测', '✓ 在带内', '✓ 在带内', '▼ 低于带 16 分']);
    assert.match(html, /-tail">在带内 4 根轴，出带 1 根轴，未测 1 根轴</);
    /* 高于带那一档：语义色只换字，不换结构。 */
    const high = renderRadarProfile({
      title: 'x', form: 'rail',
      axes: [{ label: '甲', score: 90, band: { low: 10, high: 50 } }, { label: '乙', score: 30, band: { low: 10, high: 50 } },
        { label: '丙', score: null, band: { low: 10, high: 50 } }],
    });
    assert.match(high, /▲ 高于带 40 分/);
    assert.ok(high.includes(' is-high"'));
  });

  it('不给基准带那一行照样出：只画基线与自己那根竖线，判定写「未给基准带」', () => {
    const h = renderRadarProfile({
      title: 'x', form: 'rail',
      axes: [{ label: '甲', score: 62 }, { label: '乙', score: 30, band: { low: 40, high: 90 } }, { label: '丙', score: 50 }],
    });
    assert.equal(slotCount(h, 'band'), 1);
    assert.equal(slotCount(h, 'base'), 3);
    assert.equal(slotTexts(h, 'verdict').filter((t) => t === '未给基准带').length, 2);
    assert.equal(slotCount(h, 'rband'), 1);
    assert.match(h, /-tail">在带内 0 根轴，出带 1 根轴，未给带 2 根轴</);
  });
});

/* ── ① 渲染契约 · 公共面与非法入参 ──────────────────────────────────── */

describe('radar-profile ① 渲染契约 · 公共面与非法入参', () => {
  it('转义面：标题／轴名／说明／时间窗／口径逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    /* 轴名另有字数上限（浮在图外侧），所以轴名那一格用一枚**短**的注入串——它照样得被转义。 */
    const evilLabel = '甲<&"';
    for (const form of RADAR_PROFILE_FORMS) {
      const extra = form === 'polygon' ? { past: 10 } : (form === 'rail' ? { note: evil, band: { low: 1, high: 2 } } : {});
      const html = renderRadarProfile({
        title: evil, form, stamp: evil, note: evil,
        ...(form === 'polygon' ? { pastStamp: evil } : {}),
        axes: [{ label: '甲', score: 10, ...extra }, { label: evilLabel, score: 20, ...extra }, { label: '丙', score: 30, ...extra }],
      });
      assert.equal(/<script/i.test(html), false, form + '：不得出现可执行脚本标签');
      assert.ok(html.includes('&lt;script&gt;'), form + '：原文以实体上屏');
      assert.ok(html.includes('&quot;'), form + '：引号转义');
      assert.ok(html.includes('甲&lt;&amp;&quot;'), form + '：轴名逐位转义');
      assert.equal(html.includes(evilLabel), false, form + '：注入串的原文一位都不许上屏');
    }
  });

  it('入参违规一律拒（不静默降级）：形态／轴数／轴名／得分／基准带／达标线／跨形态字段逐条', () => {
    assert.deepEqual([...RADAR_PROFILE_FORMS], ['polygon', 'wedge', 'rail']);
    const ok = { title: 'x', axes: AXES_3 };
    assert.equal(throwsBlocks(() => renderRadarProfile(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderRadarProfile([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderRadarProfile({ axes: AXES_3 })), true, '缺标题');
    assert.equal(throwsBlocks(() => renderRadarProfile({ title: 'x' })), true, '缺 axes');
    assert.equal(throwsBlocks(() => renderRadarProfile({ title: '', axes: AXES_3 })), true);
    assert.equal(throwsBlocks(() => renderRadarProfile({ title: '   ', axes: AXES_3 })), true);
    assert.equal(throwsBlocks(() => renderRadarProfile({ title: '\u3000', axes: AXES_3 })), true, '全角空白也是空白');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, form: 'cloud' })), true, '形态闭集外');
    /* 轴数：下限与上限各越一格。 */
    const many = (n) => new Array(n).fill({ label: '甲', score: 50 });
    assert.ok(renderRadarProfile({ ...ok, axes: many(RADAR_PROFILE_MIN_AXES) }).length > 0, '下限能过');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: many(RADAR_PROFILE_MIN_AXES - 1) })), true, '下限 −1 应拒');
    assert.ok(renderRadarProfile({ ...ok, axes: many(RADAR_PROFILE_MAX_AXES) }).length > 0, '上限能过');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: many(RADAR_PROFILE_MAX_AXES + 1) })), true, '上限 ＋1 应拒');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: 'x' })), true, '不是数组');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: new Array(RADAR_PROFILE_MIN_AXES) })), true, '稀疏数组（有洞）');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: [null, ...AXES_3] })), true, '元素不是对象');
    /* 轴名：必填、非空白、且**至多那几个字**。 */
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: [{ score: 1 }, ...AXES_3] })), true, '缺轴名');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: [{ label: '', score: 1 }, ...AXES_3] })), true);
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: [{ label: '   ', score: 1 }, ...AXES_3] })), true);
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: [{ label: '甲'.repeat(RADAR_PROFILE_MAX_LABEL_CHARS), score: 1 }, ...AXES_3] })), false,
      '正好到上限能过');
    assert.equal(throwsBlocks(() => renderRadarProfile({
      ...ok, axes: [{ label: '甲'.repeat(RADAR_PROFILE_MAX_LABEL_CHARS + 1), score: 1 }, ...AXES_3],
    })), true, '超一个字应拒（轴名浮在图外侧）');
    /* 得分：缺席、非数、越界、不是有限数。 */
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: [{ label: '甲' }, ...AXES_3] })), true, '缺 score');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: [{ label: '甲', score: '50' }, ...AXES_3] })), true);
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: [{ label: '甲', score: 101 }, ...AXES_3] })), true, '超过满分');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: [{ label: '甲', score: -1 }, ...AXES_3] })), true, '低于 0');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: [{ label: '甲', score: Number.NaN }, ...AXES_3] })), true);
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: [{ label: '甲', score: Number.POSITIVE_INFINITY }, ...AXES_3] })), true);
    /* 上期同办；全缺测没有形状可画。 */
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: [{ label: '甲', score: null, past: 200 }, ...AXES_3] })), true);
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: many(4).map((a) => ({ ...a, score: null })) })), true, '全缺测');
    assert.ok(renderRadarProfile({ ...ok, axes: [{ label: '甲', score: null }, ...many(3)] }).length > 0, '只有一根缺测照画');
    /* 跨形态字段：给别的形态才认的读数一律拒。 */
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...WEDGE, axes: [{ label: '甲', score: 1, past: 2 }, ...many(2)] })), true, 'wedge 不认 past');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...RAIL, axes: many(3).map((a) => ({ ...a, past: 2 })) })), true, 'rail 不认 past');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, form: 'wedge', axes: many(3).map((a) => ({ ...a, band: { low: 1, high: 2 } })) })), true, 'wedge 不认 band');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: many(3).map((a) => ({ ...a, note: 'x' })) })), true, 'polygon 不认 note');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, goal: 80 })), true, 'polygon 不认 goal');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, form: 'wedge', axes: many(3), pastStamp: '08-24' })), true,
      'polygon 之外的形态不认 pastStamp');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, form: 'wedge', axes: many(3), goal: 101 })), true, '达标线越界');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, form: 'wedge', axes: many(3), goal: '80' })), true);
    /* 基准带：上下界反了、越界、不是对象。 */
    const railOk = { title: 'x', form: 'rail', axes: many(3) };
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...railOk, axes: many(3).map((a) => ({ ...a, band: { low: 80, high: 20 } })) })), true, 'low ≤ high 反了');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...railOk, axes: many(3).map((a) => ({ ...a, band: { low: 0 } })) })), true, '缺上界');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...railOk, axes: many(3).map((a) => ({ ...a, band: 5 })) })), true, '不是对象');
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...railOk, axes: many(3).map((a) => ({ ...a, band: { low: -5, high: 50 } })) })), true, '下界越界');
    /* 可选文本与附加类名。 */
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, stamp: '   ' })), true);
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, note: ' \n ' })), true);
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, extraClass: 'a"b' })), true);
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, extraClass: '   ' })), true);
  });

  it('上限／下限是**自证**的（边界值能过、越界一条就拒），不抄字面量', () => {
    const ok = { title: 'x' };
    const one = (n) => new Array(n).fill({ label: '甲', score: 0 });
    assert.ok(renderRadarProfile({ ...ok, axes: one(RADAR_PROFILE_MIN_AXES) }).length > 0);
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: one(RADAR_PROFILE_MIN_AXES - 1) })), true);
    assert.ok(renderRadarProfile({ ...ok, axes: one(RADAR_PROFILE_MAX_AXES) }).length > 0);
    assert.equal(throwsBlocks(() => renderRadarProfile({ ...ok, axes: one(RADAR_PROFILE_MAX_AXES + 1) })), true);
    /* 0 与 100 都是合法读数（0 分会落在圆心上，那是有意义的读数）。 */
    assert.ok(renderRadarProfile({ ...ok, axes: [{ label: '甲', score: 0 }, { label: '乙', score: 100 }, { label: '丙', score: 0 }] }).length > 0);
  });

  it('缺槽就不出那一槽：不给 stamp／pastStamp／note 都各自不出；给了 note 就整句替换', () => {
    const bare = renderRadarProfile({ title: 'x', axes: AXES_3 });
    assert.equal(bare.includes(radarProfileSlot('stamp')), false);
    assert.equal(bare.includes('（09-24）'), false);
    const noted = renderRadarProfile({ title: 'x', axes: AXES_3, note: '自定义口径' });
    assert.ok(noted.includes('>自定义口径</p>'));
    assert.equal(noted.includes('口径：每根轴各自'), false, '替换＝整句换掉');
    for (const form of RADAR_PROFILE_FORMS) {
      const h = renderRadarProfile({ title: 'x', form, axes: AXES_3 });
      assert.equal(h.includes(radarProfileSlot('stamp')), false, form + '：不给时间窗就不出那一枚');
      assert.ok(new RegExp('-note">').test(h), form + '：脚注恒在（它说清这一张图怎么读）');
    }
  });

  it('纯函数：同样的入参恒产同样的字节（三形态各一遍）', () => {
    for (const input of [POLYGON, WEDGE, RAIL]) assert.equal(renderRadarProfile(input), renderRadarProfile(input));
  });

  it('槽位闭集与类名一致（判据不另抄一份字面量）', () => {
    assert.equal(radarProfileSlot('plot'), RADAR_PROFILE_CLASS + '-plot');
    assert.equal(radarProfileSlot('plot', 'x-'), 'x-block-radar-profile-plot');
    for (const slot of RADAR_PROFILE_SLOTS) assert.ok(radarProfileSlot(slot).startsWith(RADAR_PROFILE_CLASS + '-'));
    /* 标记里出现的每个 `ilife-block-radar-profile-*` 类名都必须在闭集里（防手写漏进闭集的槽）。 */
    const seen = new Set([...renderRadarProfile(POLYGON).matchAll(/ilife-block-radar-profile-([a-z-]+)/g)].map((m) => m[1]));
    for (const name of seen) assert.ok(RADAR_PROFILE_SLOTS.includes(name), '标记里出现了闭集外的槽：' + name);
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('radar-profile ② 样式与零 DOM 纪律', () => {
  const css = radarProfileCss();
  const clean = stripComments(css);
  const STYLE_FILES = ['style.ts', 'style-forms.ts'];

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且**只出现一次**', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = ruleSelectors(clean);
    assert.ok(selectors.length >= 40, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        assert.ok(one.includes(RADAR_PROFILE_CLASS), '选择器必须只碰本件类名根：' + one);
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
    assert.ok(clean.includes('@container (min-width:'), '宽档也必须由容器判');
    assert.ok(clean.includes('container-type: inline-size'), '写了 @container 就必须自己声明容器');
    assert.deepEqual(clean.match(/--ilife-[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
  });

  it('**两处容器阈值只有一处来源**：两份样式源码里不出现那两个数字的字面量', () => {
    for (const file of STYLE_FILES) {
      const src = stripComments(readFileSync(join(DIR, file), 'utf8'));
      for (const [name, value] of [['RADAR_PROFILE_NARROW_PX', RADAR_PROFILE_NARROW_PX], ['RADAR_PROFILE_WIDE_PX', RADAR_PROFILE_WIDE_PX]]) {
        assert.equal(new RegExp('\\b' + String(value) + '\\b').test(src), false,
          file + ' 里写了阈值字面量 ' + String(value) + '（写两处必然走散：改常量时查询不跟）');
        assert.ok(src.includes(name) || file === 'style-forms.ts' && name === 'RADAR_PROFILE_WIDE_PX',
          file + ' 应当读 ' + name + ' 这个常量');
      }
    }
    /* 窄档查询两份样式文件各一条、宽档一条——都取同一个常量。 */
    assert.equal(countText(clean, '@container (max-width: ' + String(RADAR_PROFILE_NARROW_PX) + 'px)'), 2);
    assert.equal(countText(clean, '@container (min-width: ' + String(RADAR_PROFILE_WIDE_PX) + 'px)'), 1);
    for (const file of STYLE_FILES) assert.ok(readFileSync(join(DIR, file), 'utf8').includes('RADAR_PROFILE_NARROW_PX'), file);
    assert.ok(readFileSync(join(DIR, 'attrs.ts'), 'utf8').includes('RADAR_PROFILE_NARROW_PX'));
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、**不拿 ink 系当面**', () => {
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外的颜色字面量：' + [...new Set(bare)].join('、'));
    for (const file of STYLE_FILES) {
      const src = stripComments(readFileSync(join(DIR, file), 'utf8'));
      assert.deepEqual([...src.matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [], file + ' 里请改走 skinVar()');
    }
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了"面"：' + value);
    }
    /* 语义档与强调色各就各位：达标／未达标走 ok／warn，本期轮廓走 accent，参照线走淡洗。 */
    assert.ok(clean.includes('color-mix(in srgb,'), '网格与带是 token 的淡洗');
    for (const token of ['var(--ilife-ok,', 'var(--ilife-warn,', 'var(--ilife-accent,', 'var(--ilife-ink-3,']) {
      assert.ok(clean.includes(token), '样式段应当读到 ' + token + '（语义档／强调色／参照线各就各位）');
    }
  });

  it('**内容撑不宽容器**：会随调用方文本变长的槽带 `min-width: 0`＋可收窄，轴名可换行', () => {
    for (const slot of ['title', 'stamp', 'tail', 'axlabel', 'axname', 'axvalue', 'tname', 'tnum', 'tdelta',
      'scale-item', 'legend-item', 'gap', 'gap-name', 'rname', 'rsub', 'rval', 'verdict']) {
      const body = ruleOf(clean, '.' + radarProfileSlot(slot));
      assert.ok(/min-width:\s*0/.test(body), slot + ' 少了 min-width: 0（长文本会顶宽容器）：' + body);
      assert.equal(/flex:\s*(none|0\s+0\s+auto)/.test(body), false,
        slot + ' 用了 flex: none（内容会顶宽父行，改 flex: 0 1 auto）：' + body);
    }
    for (const slot of ['stamp', 'tail']) {
      assert.ok(/flex:\s*0\s+1\s+auto/.test(ruleOf(clean, '.' + radarProfileSlot(slot))), slot + ' 必须可收窄');
    }
    /* 轴名那一块的宽度上限读的是**同一个常量**（改上限这里跟着走）。 */
    assert.ok(new RegExp('max-width: calc\\(' + String(RADAR_PROFILE_MAX_LABEL_CHARS) + ' \\* ').test(ruleOf(clean, '.' + radarProfileSlot('axlabel'))),
      '轴名的宽度上限应当按 RADAR_PROFILE_MAX_LABEL_CHARS 算');
    assert.ok(/width: max-content/.test(ruleOf(clean, '.' + radarProfileSlot('axlabel'))),
      '轴名必须 width: max-content（否则正右那几根会被压成一列孤字）');
    /* 图那两格的内距：留给轴名，且按同一个常量算。 */
    assert.ok(new RegExp('padding: [^;]*calc\\(' + String(RADAR_PROFILE_MAX_LABEL_CHARS - 1) + ' \\* ').test(ruleOf(clean, '.' + radarProfileSlot('stage'))));
    assert.ok(/overflow-wrap:\s*anywhere/.test(ruleOf(clean, '.' + radarProfileSlot('axname'))));
    assert.equal(clean.includes('overflow-x'), false, '不许出现 overflow-x（不藏横滑）');
    assert.equal(clean.includes('scroll'), false, '不许出现滚动容器');
    /* 读数永不截断：不许出现省略号截断的写法。 */
    assert.equal(/text-overflow\s*:/.test(clean), false, '本件任何一处都不许省略号截断');
  });

  it('**图表字一律是 HTML**：SVG 只画形状（`<text>` 一个字都没有）', () => {
    for (const input of [POLYGON, WEDGE, RAIL]) {
      const html = renderRadarProfile(input);
      const svg = /<svg[\s\S]*?<\/svg>/.exec(html);
      if (svg === null) continue;
      assert.equal(/<text|<tspan/.test(svg[0]), false, 'SVG 里不许有字（字号会随画布缩放，窄容器里读数先糊）');
    }
  });

  it('尺寸事实写在一处：图的边长上限与半径取常量', () => {
    assert.ok(new RegExp('max-width: ' + String(300) + 'px').test(ruleOf(clean, '.' + radarProfileSlot('plot'))));
  });

  it('零键盘语汇、零可点元素（本件是纯静态图）', () => {
    const words = ['快捷键', '键位', '方向键', '键帽', '键盘', '按 Enter', 'Tab'];
    const html = [POLYGON, WEDGE, RAIL].map((i) => renderRadarProfile(i)).join('') + css;
    for (const w of words) assert.equal(html.includes(w), false, '出现键盘语汇：' + w);
    const interactive = [POLYGON, WEDGE, RAIL].map((i) => renderRadarProfile(i)).join('');
    for (const needle of ['<button', '<a ', 'tabindex', 'onclick', '<input', '<select', 'title=']) {
      assert.equal(interactive.includes(needle), false, '本件不带可点元素／不给悬停提示：' + needle);
    }
  });

  it('`dist/components/radar-profile/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'radar-profile');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 7, '至少该有 index／attrs／model／scale／forms／render／style 的产物：' + files.join('、'));
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

  it('两份样式源码里不留没人用的槽位助手（声明了 `c()` 就得真用到）', () => {
    for (const file of STYLE_FILES) {
      const src = stripComments(readFileSync(join(DIR, file), 'utf8'));
      if (!src.includes('const c = (slot: RadarProfileSlot)')) continue;
      const uses = (src.match(/(?:^|[^\w.])c\(/g) || []).length;
      assert.ok(uses > 0, file + ' 声明了裸槽助手 c() 却一次没用（死代码，删掉它）');
    }
  });
});

/** 取值表里某个 token 的取值（判据不抄色字面量）。 */
function skinValue(name) {
  return SKIN_VALUES[SKIN_NAMES[0]][name];
}

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('radar-profile ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(RADAR_PROFILE_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderScaleBar({ value: 860, goal: 1850 });
    const heat = renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 2, 3, 4, 5, 6, 7] }] });
    renderRadarProfile(POLYGON);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), before, '别件的产物逐字节不变');
    assert.equal(renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 2, 3, 4, 5, 6, 7] }] }), heat);
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(radarProfileCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-radar-profile'), '前缀必须作用到类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
    assert.ok(css.includes('.x-block-radar-profile-track'), 'style-forms 那一份也要跟着换前缀');
  });
});

/* ── ④ 四档几何（真机）＋ ⑤ 皮肤纪律 ───────────────────────────────── */

/** 四档**容器**宽度：320 是触屏最窄那一档（手机分屏／小屏），也是内容撑宽最容易翻车的地方。 */
const WIDTHS = [320, 390, 620, 1280];

/** 压力样例：长标题与长时间窗（内容撑宽）／六字轴名全开（轴名顶宽）／八根轴（最密）／三根轴（最疏）。 */
const LONG = '体测画像（含 3 天补录、2 天跨月结转、1 天跨时区，口径见页脚）：补录那三天按当日最后一笔算';
const SIX = '膳食纤维摄入';
const caseOf = (name, html) => ({ name, html });

function cases() {
  const sixLabels = ['甲甲甲甲甲甲', '乙乙乙乙乙乙', '丙丙丙丙丙丙', '丁丁丁丁丁丁', '戊戊戊戊戊戊', '己己己己己己', '庚庚庚庚庚庚', '辛辛辛辛辛辛'];
  return [
    caseOf('polygon', renderRadarProfile(POLYGON)),
    caseOf('wedge', renderRadarProfile(WEDGE)),
    caseOf('rail', renderRadarProfile(RAIL)),
    caseOf('longtitle', renderRadarProfile({ ...POLYGON, title: LONG, stamp: LONG })),
    caseOf('sixchars', renderRadarProfile({ title: '六字轴名', axes: sixLabels.map((label) => ({ label, score: 100, past: 100 })) })),
    caseOf('three', renderRadarProfile({ title: '三根轴', axes: AXES_3 })),
    caseOf('missing', renderRadarProfile({ ...RAIL, title: '缺测', axes: RAIL.axes.map((a, i) => (i === 0 ? { ...a, score: null } : a)) })),
    caseOf('sixchars-rail', renderRadarProfile({ title: '六字轴名', form: 'rail', axes: sixLabels.map((label) => ({ label, score: 100, band: { low: 0, high: 100 } })) })),
  ];
}

/** 真机起不来时的确定性几何判据（量不到"内容撑宽"，就断**形状上的那几条**）。 */
function assertStaticGeometry(css, html) {
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const narrowest = WIDTHS[0];
  const wide = [...px(html), ...px(css.replace(/@container[^{]*\{[^}]*\}/g, ''))].filter((v) => v > narrowest);
  assert.deepEqual(wide, [], '出现过不了最窄档（' + narrowest + '）的固定宽度：' + wide.join('、'));
  const clean = stripComments(css);
  for (const slot of ['axlabel', 'axname', 'rval', 'tnum']) {
    assert.ok(/min-width:\s*0/.test(ruleOf(clean, '.' + radarProfileSlot(slot))), slot + ' 少了 min-width: 0');
  }
  assert.ok(/width: max-content/.test(ruleOf(clean, '.' + radarProfileSlot('axlabel'))), '轴名要 max-content');
}

/** 页内一次性量好：横向溢出的最坏值 ＋ 轴名与读数的截断／折行 ＋ 顶点是否全在图框里。 */
const MEASURE_FN = `(function (scopeSel, slots, plotCls, dotCls) {
  function agg(sel) {
    var nodes = [].slice.call(document.querySelectorAll(sel));
    var out = { sel: sel, count: nodes.length, clipped: 0, wrapped: 0, maxScrollW: 0, maxClientW: 0, sample: '' };
    for (var i = 0; i < nodes.length; i += 1) {
      var n = nodes[i];
      var r = n.getBoundingClientRect();
      var cs = getComputedStyle(n);
      if (r.width <= 0 || r.height <= 0 || cs.display === 'none') continue;
      if (n.scrollWidth > out.maxScrollW) out.maxScrollW = n.scrollWidth;
      if (n.clientWidth > out.maxClientW) out.maxClientW = n.clientWidth;
      if (n.scrollWidth > n.clientWidth + 1) out.clipped += 1;
      var lh = parseFloat(cs.lineHeight);
      if (lh > 0 && r.height > lh * 1.6) out.wrapped += 1;
      if (out.sample === '' && n.textContent) out.sample = n.textContent.slice(0, 20);
    }
    return out;
  }
  var out = { slots: [], box: null };
  for (var i = 0; i < slots.length; i += 1) out.slots.push(agg(slots[i]));
  /* **只看这一格自己的根**：整页上还有别的件、别的格子，按整页查会把隔壁的读数算进来。 */
  var root = document.querySelector(scopeSel);
  var plot = root === null ? null : root.querySelector('.' + plotCls);
  var dots = root === null ? [] : [].slice.call(root.querySelectorAll('.' + dotCls));
  if (plot !== null && dots.length > 0) {
    var p = plot.getBoundingClientRect();
    var maxRight = -1e9, minLeft = 1e9, maxBottom = -1e9, minTop = 1e9;
    for (var k = 0; k < dots.length; k += 1) {
      var d = dots[k].getBoundingClientRect();
      if (d.right > maxRight) maxRight = d.right;
      if (d.left < minLeft) minLeft = d.left;
      if (d.bottom > maxBottom) maxBottom = d.bottom;
      if (d.top < minTop) minTop = d.top;
    }
    out.box = { n: dots.length, plotW: Math.round(p.width), plotH: Math.round(p.height),
      plotRight: Math.round(p.right), plotLeft: Math.round(p.left), plotTop: Math.round(p.top), plotBottom: Math.round(p.bottom),
      maxRight: Math.round(maxRight), minLeft: Math.round(minLeft), minTop: Math.round(minTop), maxBottom: Math.round(maxBottom) };
  }
  return out;
})`;

/** 页内量到的「轴名/读数那一块的宽度」是否随容器变（窄档与宽档由容器判的机器读数）。 */
const PLOT_W_FN = '(function (sel) { var n = document.querySelector(sel);'
  + 'if (n === null) return -1; return Math.round(n.getBoundingClientRect().width); }())';

describe('radar-profile ④⑤ 四档几何与皮肤纪律（真机 headless Chrome ＋ CDP）', () => {
  it('容器 320／390／620／1280：零横向溢出／轴名与读数零截断零折行／顶点全在图框里', async (t) => {
    const css = radarProfileCss();
    const all = cases();
    const casesHtml = all.map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n'),
      css: skinCss() + '\n' + css,
      height: 2400,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：'
        + '没有超过 ' + WIDTHS[0] + 'px 的固定宽度 ＋ 轴名 max-content ＋ 长文本槽可收窄（min-width: 0）');
      assertStaticGeometry(css, casesHtml);
      return t.skip('本机无 Chrome／Chromium：四档几何判据需真浏览器');
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
          for (const c of all) {
            const scope = '.' + skinClass(skin) + ' [data-case=' + c.name + '] ';
            const root = await page.read([scope + '.' + RADAR_PROFILE_CLASS, scope + '.' + radarProfileSlot('hd')]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            for (const one of root) {
              assert.ok(one.maxScrollW <= one.maxClientW + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 横向溢出 '
                + one.maxScrollW + ' > ' + one.maxClientW);
              assert.equal(one.scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            }
            /* 文本槽：**零截断、零折行**（读数与轴名都是"一眼要读到"的；折了行就是没读好）。 */
            const slots = ['axname', 'axvalue', 'rval', 'tnum', 'tdelta', 'rname', 'verdict', 'rband',
              'gap-name', 'gap-num', 'gap-diff', 'scale-item', 'legend-item', 'stamp', 'tail']
              .filter((slot) => new RegExp('class="' + radarProfileSlot(slot) + '[ "]').test(c.html));
            const texts = await page.read(slots.map((slot) => scope + '.' + radarProfileSlot(slot)));
            for (const one of texts) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 有 ' + one.clipped + ' 处被截断');
              assert.ok(one.visible > 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 不见了');
            }
            /* 顶点的**最外圈**不许跑出图框：最外那一圈（满分）就是极限。 */
            const measured = await page.ev(MEASURE_FN + '('
              + JSON.stringify(scope + '.' + RADAR_PROFILE_CLASS) + ','
              + JSON.stringify([scope + '.' + radarProfileSlot('axlabel'), scope + '.' + radarProfileSlot('trow')]) + ','
              + JSON.stringify(radarProfileSlot('plot')) + ','
              + JSON.stringify(radarProfileSlot('dot')) + ')');
            for (const one of measured.slots) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 被截断 ' + one.clipped + ' 处');
            }
            if (measured.box !== null) {
              const b = measured.box;
              assert.ok(b.maxRight <= b.plotRight + Math.round(b.plotW * 0.02) + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：有点跑出图框右边 ' + b.maxRight + ' > ' + b.plotRight);
              assert.ok(b.minLeft >= b.plotLeft - Math.round(b.plotW * 0.02) - 1,
                width + ' 档 ' + skin + ' ' + c.name + '：有点跑出图框左边 ' + b.minLeft + ' < ' + b.plotLeft);
              assert.ok(b.minTop >= b.plotTop - 1, width + ' 档 ' + skin + ' ' + c.name + '：有点跑出图框上边');
              assert.ok(b.maxBottom <= b.plotBottom + 1, width + ' 档 ' + skin + ' ' + c.name + '：有点跑出图框下边');
              seen.push({ width, skin, name: c.name, plotW: b.plotW, n: b.n,
                rootScrollW: root[0].maxScrollW, rootClientW: root[0].maxClientW });
            }
          }
        }
      }
      /* **窄档是容器驱动的**：图的宽度随夹具容器变（视口没变，只改了容器）。 */
      for (const name of ['polygon', 'sixchars']) {
        const byWidth = WIDTHS.map((w) => (seen.find((s) => s.width === w && s.skin === SKIN_NAMES[0] && s.name === name) || {}).plotW);
        assert.ok(byWidth.every((v) => typeof v === 'number' && v > 100), name + '：图宽读数缺失 ' + JSON.stringify(byWidth));
        assert.ok(byWidth[0] < byWidth[3], name + '：图宽没跟着容器变（' + JSON.stringify(byWidth) + '）');
      }
      /* ⑤ 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const c of all) {
        for (const width of WIDTHS) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
            + 'for (var i = 0; i < skins.length; i += 1) {'
            + '  var el = document.querySelector("." + "ilife-skin-" + skins[i]'
            + ' + " [data-case=' + c.name + '] .' + RADAR_PROFILE_CLASS + '");'
            + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
            + '} return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
          }
        }
      }
      /* 达标／未达标两档真取到取值表里的 ok 与 warn（面是淡洗、外沿弧是实色）。 */
      for (const skin of SKIN_NAMES) {
        const vals = SKIN_VALUES[skin];
        const colors = await page.ev('(function(){'
          + 'var ok=document.querySelector(' + JSON.stringify('.ilife-skin-' + skin + ' [data-case=wedge] .' + radarProfileSlot('warc') + '.is-ok') + ');'
          + 'var warn=document.querySelector(' + JSON.stringify('.ilife-skin-' + skin + ' [data-case=wedge] .' + radarProfileSlot('warc') + '.is-warn') + ');'
          + 'var mark=document.querySelector(' + JSON.stringify('.ilife-skin-' + skin + ' [data-case=rail] .' + radarProfileSlot('mark')) + ');'
          + 'return {ok: ok===null?null:getComputedStyle(ok).stroke, warn: warn===null?null:getComputedStyle(warn).stroke,'
          + ' mark: mark===null?null:getComputedStyle(mark).borderLeftColor};}())');
        assert.equal(colors.ok, toRgb(vals.ok), skin + '：达标档的弧取 ok');
        assert.equal(colors.warn, toRgb(vals.warn), skin + '：未达标档的弧取 warn');
        assert.equal(colors.mark, toRgb(vals.accent), skin + '：轨道上那根竖线取 accent');
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      /* 四档读数原文（回执抄的就是这几行）：根的 scroll／client、图宽、顶点数。 */
      for (const w of WIDTHS) {
        const rows = seen.filter((s) => s.width === w);
        const mine = rows.filter((s) => s.skin === SKIN_NAMES[0]);
        console.log('READING radar-profile container=' + w
          + ' 根 scroll/client（四套皮肤八格取最坏）＝'
          + Math.max(...rows.map((s) => s.rootScrollW)) + '/' + Math.min(...rows.map((s) => s.rootClientW))
          + ' 图宽 polygon＝' + mine.filter((s) => s.name === 'polygon').map((s) => s.plotW).join('、')
          + ' 图宽 sixchars＝' + mine.filter((s) => s.name === 'sixchars').map((s) => s.plotW).join('、')
          + ' 顶点＝' + mine.filter((s) => s.name === 'polygon').map((s) => s.n).join('、')
          + ' 量到的格数＝' + rows.length);
      }
    } finally { page.close(); }
  });
});
