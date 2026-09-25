/** gap-band（差值带 · 两个形态：连续差值带／每日偏差柱）· 契约测试。
 *
 * 覆盖七组判据：
 *  ① **渲染契约**：两档各自的骨架与枚数／**刻度与轴域同一份真值**（从**印出来的刻度**反推轴域，
 *     再把计划线的 `top`／折线每个顶点／带子多边形／每枚锚点逐点对账；
 *     全等值、12 天、长串三种压力样例都在里面）／B 档柱高与最大偏差同比例／
 *     退化那两支（全等值只出一枚锚点、全达目标柱高为零）／转义面／
 *     **全部**非法入参分支（每个都断 `BlocksError`，含**闭集外的形态键**与缺 `plan`／缺 `target`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且**只出现一次**、
 *     零 `:root`／`!important`／零新 token／零 `@media` 宽度查询／零手写色值／零把 `ink` 系当面／
 *     零键盘语汇／零可点元素／**窄档阈值只有一处来源**／样式来源是两份 `style*.ts`；
 *  ③ **加法式**：本件只读自己的类名；不启用它的页面零命中、逐字节不变；
 *  ④ **四档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 320／390／620／1280 下零横向溢出
 *     （含长口径／长单位／长日子三种压力样例）、计划线落在算出来的位置、
 *     首末刻度**中心**对到轴顶与轴底（差 ≤1.5px）、窄档图区确实矮一档（`@container` 真在生效）、
 *     柱与锚点与标注不出图区、日子与数值零截断；
 *  ⑤ **皮肤纪律**：同一份入参渲染两次逐字节相同、标记不带皮肤类、真机上四套皮肤里的 `innerHTML`
 *     逐字节相同、超了的柱与计划线真取到取值表里的色；
 *  ⑥ **分隔符门**（`test/separator-probe.mjs` 的 R1–R3）：本件生成的字里不出现 `·`／`；`／并列顿号；
 *  ⑦ **说明书自证**：示例入参块是合法 JSON ＋ 直渲成功，一件只许有一块。
 *
 * 期望值一律从组件自己的常量派生（`GAP_BAND_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GAP_BAND_AXIS_TICKS,
  GAP_BAND_CLASS,
  GAP_BAND_DEV_MAX_PCT,
  GAP_BAND_FORMS,
  GAP_BAND_MAX_DAYS,
  GAP_BAND_MIN_DAYS,
  GAP_BAND_NARROW_PX,
  GAP_BAND_SLOTS,
  gapBandSlot,
  renderGapBand,
} from '../dist/components/gap-band/index.js';
import {
  GAP_BAND_COLS_PX,
  GAP_BAND_NARROW_COLS_PX,
  GAP_BAND_NARROW_PLOT_PX,
  GAP_BAND_PLOT_PX,
  GAP_BAND_WIDE_COLS_PX,
  gapBandCss,
} from '../dist/components/gap-band/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKINS, skinCss, skinClass } from '../dist/components/skin/index.js';
import { SKIN_NAMES } from '../dist/components/skin/contract.js';
import { auditHtml } from './separator-probe.mjs';
import { styleSource } from './_style-sources.mjs';
import { startShapesPage } from './shapes-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'gap-band');
/** 本件的样式源码：**经 `_style-sources.mjs` 取该件全部 `style*.ts`**（本件按规矩拆成两份，
 *  按单文件读会把 `style-forms.ts` 放进盲区）。 */
const STYLE_SRC = styleSource('gap-band');

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

/** 一条规则（选择器 → 声明块）。**选择器列表也要认**（`A, B { … }` 里 B 不是以 ` {` 收尾的）。 */
function ruleOf(css, selector) {
  const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[\\s,{])');
  const m = re.exec(css);
  if (m === null) return '';
  const open = css.indexOf('{', m.index);
  const close = css.indexOf('}', open);
  return css.slice(m.index, close < 0 ? css.length : close);
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

/** 刻度文字 → 数（`1,800 卡` → 1800；`1e+21` 原样）。刻度文字只用 ASCII 数字写法。 */
const tickNum = (text) => Number(text.replace(/[^0-9.eE+-]/g, ''));

/** **从印出来的刻度反推轴域**：最小那一枚与最大那一枚就是上下界。 */
function axisFromTicks(ticks) {
  const nums = ticks.map(tickNum);
  return { lo: Math.min(...nums), hi: Math.max(...nums) };
}

/** 按（从刻度反推的）轴域算：某个读数该落在的从上往下百分比（与 `scale.ts` 的 `topPct` 同一套口径）。 */
function expectTop(value, axis) {
  const t = (value - axis.lo) / (axis.hi - axis.lo);
  return Number((100 - Math.min(1, Math.max(0, t)) * 100).toFixed(2));
}

/** 第 i 列（共 n 列）的中心横坐标（与 `forms.ts` 的 `xPct` 同一套口径，判据自己写一遍）。 */
const expectX = (i, n) => Number((((i + 0.5) / n) * 100).toFixed(2));

const slotCls = (slot) => gapBandSlot(slot);

/** 纵轴刻度文字（从大往小）。 */
const ticksOf = (html) => [...html.matchAll(
  new RegExp('class="' + slotCls('ytick') + '">([^<]*)<', 'g'),
)].map((m) => m[1]);

/** 计划线行内 `top`（真实绝对定位，浏览器照它画）。 */
const planOf = (html) => Number(/-plan" aria-hidden="true" style="top: ([\d.-]+)%"/.exec(html)[1]);

/** 折线与带子的 SVG 坐标串 → 顶点数组。 */
const ptsOf = (html, tag) => [...html.matchAll(
  new RegExp('<' + tag + ' class="[^"]*" points="([^"]*)"', 'g'),
)].map((m) => m[1].split(' ').map((p) => p.split(',').map(Number)))[0];

/** 图内锚点：`--ax`（精确列心）＋ `top`／`bottom` ＋ 两级字。 */
const anchorsOf = (html) => [...html.matchAll(
  new RegExp('class="' + slotCls('anchor') + ' is-(hi|lo|flat)" aria-hidden="true" style="--ax: ([\\d.-]+)%; (top|bottom): ([\\d.-]+)%"><b>([^<]*)<\\/b><em>([^<]*)<\\/em>', 'g'),
)].map((m) => ({ kind: m[1], ax: Number(m[2]), edge: m[3], at: Number(m[4]), day: m[5], diff: m[6] }));

/** 横轴日子（A 档日子名 ＋ 绝对读数两行）。 */
const xdaysOf = (html) => [...html.matchAll(
  new RegExp('class="' + slotCls('xday') + '">([^<]*)<', 'g'),
)].map((m) => m[1]);
const xvaluesOf = (html) => [...html.matchAll(
  new RegExp('class="' + slotCls('xvalue') + '">([^<]*)<', 'g'),
)].map((m) => m[1]);

/** 偏差柱：朝向（`bottom: 50%` 朝上／`top: 50%` 朝下）＋ 高度 ＋ 柱上那个数。 */
const devBarsOf = (html) => [...html.matchAll(
  new RegExp('class="' + slotCls('bar') + ' (is-up|is-down)" aria-hidden="true" style="(bottom|top): 50%; height: ([\\d.-]+)%"><b class="' + slotCls('barvalue') + '">([^<]*)<', 'g'),
)].map((m) => ({ cls: m[1], edge: m[2], height: Number(m[3]), text: m[4] }));

const sumOf = (html) => ({
  value: new RegExp('class="' + slotCls('sumvalue') + '">([^<]*)<').exec(html)[1],
  desc: new RegExp('class="' + slotCls('sumdesc') + '">([^<]*)<').exec(html)[1],
});

/* ── 样例（两档各一份；原型定稿版那 7 天 ＋ 退化 ＋ 压力） ─────────────── */

const BAND_INPUT = {
  title: '本周睡眠计划和实际', stamp: '本周', unit: 'h', plan: 7.5,
  days: [
    { label: '周一', value: 7.2 },
    { label: '周二', value: 7.9 },
    { label: '周三', value: 6.8 },
    { label: '周四', value: 6.5 },
    { label: '周五', value: 8.4 },
    { label: '周六', value: 7.0 },
    { label: '周日', value: 7.6 },
  ],
};
/** **全等值**：每天都和计划一样（带子面积为零、只出一枚「持平」锚点，不除零）。 */
const BAND_FLAT = {
  title: '每天都达计划', plan: 8, unit: 'h',
  days: [
    { label: '周一', value: 8 },
    { label: '周二', value: 8 },
    { label: '周三', value: 8 },
  ],
};
const DEV_INPUT = {
  title: '目标和摄入对比', form: 'deviation', target: 1800, unit: '卡', stamp: '目标 1,800 卡',
  days: [
    { label: '周一', value: 2200 },
    { label: '周二', value: 1100 },
    { label: '周三', value: 2700 },
    { label: '周四', value: 800 },
    { label: '周五', value: 2400 },
    { label: '周六', value: 1500 },
    { label: '周日', value: 1900 },
  ],
};
/** **全达目标**：每天都正好是目标（柱高为零、画成零位上的短条）。 */
const DEV_FLAT = {
  title: '每天都达目标', form: 'deviation', target: 1800, unit: '卡',
  days: [
    { label: '周一', value: 1800 },
    { label: '周二', value: 1800 },
    { label: '周三', value: 1800 },
  ],
};
/** 12 天（上限那一档）＋ 长日子名：窄容器里必须换行，不许 `…`、不许横溢。 */
const DEV_12 = {
  title: '十二天偏差', form: 'deviation', target: 100, unit: '元',
  days: new Array(12).fill(0).map((_, i) => ({
    label: '第 ' + String(i + 1) + ' 天（8 月 ' + String(i + 1) + ' 日到 8 月 ' + String(i + 2) + ' 日这一段）',
    value: 100 + (i % 2 === 0 ? 1 : -1) * (10 + i * 3),
  })),
};
/** 长口径与长单位：内容撑宽的两种压力（B 档日子只有名字，A 档日子名 ＋ 读数两行）。 */
const LONG_STAMP = '近 30 天（含 3 天补录、2 天跨月结转、1 天跨时区，口径见页脚）：补录那三天按当日最后一笔算';
const LONG_UNIT = '千卡路里（折算含油）';

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('gap-band ① 渲染契约 · 形态 band 连续差值带', () => {
  const html = renderGapBand(BAND_INPUT);

  it('骨架：卡头 → 坐标框（纵轴刻度列 ‖ 差值图区）＋ 横轴日子行 → 净差 → 图例 → 脚注', () => {
    assert.match(html, new RegExp('^<div class="' + GAP_BAND_CLASS + ' is-band">'));
    assert.ok(html.includes('<svg viewBox="0 0 100 100" preserveAspectRatio="none"'), '整块一张 SVG');
    assert.ok(html.includes('<polygon'), '带子是多边形（面积）');
    assert.ok(html.includes('<polyline'), '实际线是折线（不是色块）');
    assert.equal(countOf(html, 'class="[^"]*-ytick"') >= GAP_BAND_AXIS_TICKS - 1
      && countOf(html, 'class="[^"]*-ytick"') <= GAP_BAND_AXIS_TICKS + 2, true,
    '纵轴刻度 2…5 枚，实际 ' + countOf(html, 'class="[^"]*-ytick"'));
    assert.deepEqual(xdaysOf(html), BAND_INPUT.days.map((d) => d.label), '日子与天数一致');
    assert.equal(xvaluesOf(html).length, BAND_INPUT.days.length, '一天一枚绝对读数');
    assert.equal(countOf(html, 'class="[^"]*-legend-item"'), 3, '图例三项：实线 ＋ 虚线 ＋ 带子');
    assert.match(html, /role="img" aria-label="差值带：计划 7.5 h，周一 7.2/);
    assert.match(html, /-tail">计划 7.5 h</, '卡头那句是计划值');
    assert.ok(!/<script/i.test(html), '不产脚本');
    for (const slot of ['hd', 'title', 'stamp', 'plotbox', 'plot', 'plan', 'planlabel', 'sum', 'note']) {
      assert.ok(html.includes(slotCls(slot)), '缺槽：' + slot);
    }
    /* B 档那几槽在 A 档一个都不许出现（两个骨架不许串味）。 */
    for (const slot of ['cols', 'col', 'bar', 'barvalue', 'zero']) {
      assert.equal(html.includes(slotCls(slot)), false, 'A 档不该有 ' + slot);
    }
  });

  it('**轴域与刻度同一份真值**：从印出来的刻度反推轴域，计划线／顶点／带子／锚点逐点对账', () => {
    for (const [name, input, plan] of [['常规 7 天', BAND_INPUT, 7.5], ['全等值', BAND_FLAT, 8]]) {
      const h = renderGapBand(input);
      const ticks = ticksOf(h);
      assert.ok(ticks.length >= 2, name + '：刻度读不出来');
      const axis = axisFromTicks(ticks);
      assert.ok(Number.isFinite(axis.lo) && Number.isFinite(axis.hi), name + '：刻度读不回数');
      assert.ok(axis.hi > axis.lo, name + '：轴域没有宽度（除零）');
      /* 轴域必须盖得住计划与每天的读数（读者按刻度读出来的值不许落在轴外）。 */
      const cover = [plan, ...input.days.map((d) => d.value)];
      assert.ok(axis.lo <= Math.min(...cover) && axis.hi >= Math.max(...cover), name + '：轴域盖不住数据');
      /* **计划线的 `top` 必须等于它那个值在轴域里的位置**（文字与位置同一份真值）。 */
      assert.equal(planOf(h), expectTop(plan, axis),
        name + '：计划线的位置与它自己的值对不上（' + planOf(h) + '）');
      /* **折线每个顶点**：横坐标是列心，纵坐标是它那个读数的位置。 */
      const line = ptsOf(h, 'polyline');
      assert.equal(line.length, input.days.length, name + '：折线顶点数不对');
      input.days.forEach((d, i) => {
        assert.equal(line[i][0], expectX(i, input.days.length), name + '：第 ' + (i + 1) + ' 个顶点的横坐标不对');
        assert.equal(line[i][1], expectTop(d.value, axis), name + '：第 ' + (i + 1) + ' 个顶点的纵坐标与刻度对不上');
      });
      /* **带子多边形**：折线去（前 n 个点）、计划线回（后 n 个点倒序），两端连成一片。 */
      const band = ptsOf(h, 'polygon');
      assert.equal(band.length, input.days.length * 2, name + '：带子顶点数不是 2n（两端没连上）');
      band.slice(0, input.days.length).forEach((p, i) => assert.deepEqual(p, line[i], name + '：带子去程偏离折线'));
      band.slice(input.days.length).forEach((p, k) => {
        const i = input.days.length - 1 - k;
        assert.equal(p[0], expectX(i, input.days.length), name + '：带子回程横坐标不对');
        assert.equal(p[1], expectTop(plan, axis), name + '：带子回程不在计划线上');
      });
      /* **百分比一律在 0…100**（含全等值那一档）。 */
      for (const v of [...band.flat(), ...line.flat()]) assert.ok(v >= 0 && v <= 100, name + '：SVG 坐标越界 ' + v);
    }
  });

  it('样例那一张计划线恒在 50%（轴域 6 到 9、计划 7.5 —— 按公式验，不抄 50 这个数）', () => {
    const ticks = ticksOf(html);
    const axis = axisFromTicks(ticks);
    assert.deepEqual([axis.lo, axis.hi], [6, 9], '样例的轴域应整档到 6 到 9：' + JSON.stringify(axis));
    assert.equal(planOf(html), 50, '计划 7.5 在轴域 6 到 9 里就是 50%（返修点：曾画在 42%）');
  });

  it('**最深与最高两处各挂一枚图内锚点**：两级字、位置与它那天的差对得上', () => {
    const anchors = anchorsOf(html);
    assert.equal(anchors.length, 2, '两枚锚点');
    const axis = axisFromTicks(ticksOf(html));
    const byKind = Object.fromEntries(anchors.map((a) => [a.kind, a]));
    /* 最高＝周五多 0.9 h（锚点画在点的下方，`top` 出）；最深＝周四少 1.0 h（画在点的上方，`bottom` 出）。 */
    assert.deepEqual([byKind.hi.day, byKind.hi.diff], ['周五', '多 0.9 h']);
    assert.deepEqual([byKind.lo.day, byKind.lo.diff], ['周四', '少 1 h']);
    assert.equal(byKind.hi.edge, 'top');
    assert.equal(byKind.lo.edge, 'bottom');
    assert.equal(byKind.hi.ax, expectX(4, 7), '高处锚点的横坐标是它那一列的中心');
    assert.equal(byKind.lo.ax, expectX(3, 7), '低处锚点的横坐标是它那一列的中心');
    assert.equal(byKind.hi.at, expectTop(8.4, axis), '高处锚点的纵坐标是最高那个读数的位置');
    assert.equal(byKind.lo.at, 100 - expectTop(6.5, axis), '低处锚点的 `bottom` 是最低那个读数从下往上的位置');
  });

  it('**全等值只出一枚锚点**：三天都和计划一样，不叠在一起', () => {
    const flat = renderGapBand(BAND_FLAT);
    const anchors = anchorsOf(flat);
    assert.equal(anchors.length, 1, '差相等时只出一枚');
    assert.equal(anchors[0].kind, 'flat');
    assert.match(flat, /和计划持平/);
    assert.equal(/NaN|Infinity/.test(flat), false, '不许出现 NaN／Infinity');
  });

  it('**底部一行是净差**：主值一档大字、说明一档灰字（原型定稿版那一行）', () => {
    assert.deepEqual(sumOf(html), {
      value: '−1.1 h',
      desc: '净差，7 天合起来比计划少 1.1 h，4 天没达计划',
    });
  });

  it('缺槽就不出那一槽：不给 stamp 就不出 stamp；不给 note 就用本形态的口径句', () => {
    const bare = renderGapBand({
      title: 'x', plan: 1,
      days: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }, { label: 'c', value: 3 }],
    });
    assert.equal(bare.includes(slotCls('stamp')), false);
    assert.ok(bare.includes('口径：带子是实际线和计划线之间的面积'), '不给 note 就用本形态的口径句');
    const noted = renderGapBand({
      title: 'x', plan: 1, note: '自定义口径',
      days: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }, { label: 'c', value: 3 }],
    });
    assert.ok(noted.includes('>自定义口径</p>'));
    assert.equal(noted.includes('口径：带子是实际线和计划线之间的面积'), false, '替换＝整句换掉');
  });
});

describe('gap-band ① 渲染契约 · 形态 deviation 每日偏差柱', () => {
  const html = renderGapBand(DEV_INPUT);

  it('骨架：卡头 → 偏差柱区（零位线横贯）＋ 横轴日子行 → 净差 → 图例 → 脚注', () => {
    assert.match(html, new RegExp('^<div class="' + GAP_BAND_CLASS + ' is-deviation">'));
    assert.equal(countOf(html, 'class="[^"]*-col"'), DEV_INPUT.days.length, '一天一列');
    assert.equal(countOf(html, 'class="[^"]*-bar is-'), DEV_INPUT.days.length, '一列一根柱');
    assert.equal(countOf(html, 'class="[^"]*-barvalue"'), DEV_INPUT.days.length, '一根柱一个数');
    assert.equal(countOf(html, 'class="' + slotCls('zero') + '"'), 1, '零位线一根（就是目标）');
    assert.equal(countOf(html, 'class="[^"]*-legend-item"'), 3, '图例三项：朝上 ＋ 朝下 ＋ 零位线');
    assert.match(html, /role="img" aria-label="每日偏差柱：周一超 400 卡/);
    assert.match(html, /-tail">朝上超了目标</, '卡头那句是朝向说明');
    assert.ok(!/<script/i.test(html), '不产脚本');
    for (const slot of ['hd', 'title', 'stamp', 'cols', 'sum', 'legend', 'note']) {
      assert.ok(html.includes(slotCls(slot)), '缺槽：' + slot);
    }
    /* A 档那几槽在 B 档一个都不许出现。 */
    for (const slot of ['plotbox', 'plot', 'yticks', 'plan', 'anchor', 'xday']) {
      assert.equal(html.includes(slotCls(slot)), false, 'B 档不该有 ' + slot);
    }
  });

  it('**柱高与最大偏差同比例**：零位恒在 50%，最高的柱画到 34%', () => {
    const bars = devBarsOf(html);
    assert.equal(bars.length, DEV_INPUT.days.length);
    const devs = [400, -700, 900, -1000, 600, -300, 100];
    const maxAbs = 1000;
    assert.deepEqual(bars.map((b) => b.text), ['+400', '−700', '+900', '−1,000', '+600', '−300', '+100'],
      '柱上数字一律带符号（正数 ASCII `+`，负数 `−`）');
    bars.forEach((b, i) => {
      const want = Number((Math.abs(devs[i]) / maxAbs * GAP_BAND_DEV_MAX_PCT).toFixed(2));
      assert.equal(b.height, want, '第 ' + (i + 1) + ' 根柱的高度与它的偏差不成比例');
      assert.equal(b.cls, devs[i] >= 0 ? 'is-up' : 'is-down', '第 ' + (i + 1) + ' 根柱的朝向错了');
      assert.equal(b.edge, devs[i] >= 0 ? 'bottom' : 'top', '第 ' + (i + 1) + ' 根柱不是从零位起画的');
      assert.ok(b.height >= 0 && b.height <= GAP_BAND_DEV_MAX_PCT, '第 ' + (i + 1) + ' 根柱越出图区');
    });
    assert.equal(Math.max(...bars.map((b) => b.height)), GAP_BAND_DEV_MAX_PCT, '最高的柱画到上限那一档');
  });

  it('**累计净差写在底部**：七天合起来正好持平', () => {
    assert.deepEqual(sumOf(html), {
      value: '0 卡',
      desc: '净差 0 卡，7 天合起来和目标持平',
    });
  });

  it('**全达目标柱高为零**：每天都正好是目标，画成零位上的短条', () => {
    const flat = renderGapBand(DEV_FLAT);
    const bars = devBarsOf(flat);
    assert.equal(bars.length, 3);
    for (const b of bars) {
      assert.equal(b.height, 0, '偏差为零的柱高度就是零');
      assert.equal(b.text, '0', '偏差为零写成 0（不是 +0，也不是 —）');
    }
    assert.deepEqual(sumOf(flat).value, '0 卡');
    assert.equal(/NaN|Infinity/.test(flat), false);
  });

  it('12 天照收，一根柱都不减', () => {
    const twelve = renderGapBand(DEV_12);
    assert.equal(countOf(twelve, 'class="[^"]*-col"'), 12, '有几天就画几根（一根不减）');
    assert.equal(/NaN|Infinity/.test(twelve), false);
  });
});

describe('gap-band ① 渲染契约 · 公共面与非法入参', () => {
  it('转义面：标题／日子／单位／口径逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderGapBand({
      title: evil, stamp: evil, unit: evil, note: evil, plan: 1,
      days: [{ label: evil, value: 1 }, { label: evil + 'b', value: 2 }, { label: evil + 'c', value: 3 }],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    const evilDev = renderGapBand({
      title: evil, unit: evil, form: 'deviation', target: 1,
      days: [{ label: evil, value: 1 }, { label: evil + 'b', value: 2 }, { label: evil + 'c', value: 3 }],
    });
    assert.equal(/<script/i.test(evilDev), false);
  });

  it('**大到只给指数写法的刻度不许被三位分组切开**（`1e,+21` 那种）', () => {
    const huge = renderGapBand({
      title: 'x', plan: 2e21,
      days: [{ label: 'a', value: 1e21 }, { label: 'b', value: 2e21 }, { label: 'c', value: 3e21 }],
    });
    assert.equal(/e,/.test(huge), false, '指数写法里不许插进逗号');
    assert.equal(/,\+/.test(huge), false);
  });

  it('入参违规一律拒（不静默降级）：形态／空白串／天数／日子／计划／目标逐条', () => {
    assert.deepEqual([...GAP_BAND_FORMS], ['band', 'deviation']);
    const ok = {
      title: 'x', plan: 1,
      days: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }, { label: 'c', value: 3 }],
    };
    assert.equal(throwsBlocks(() => renderGapBand(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderGapBand([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderGapBand({ days: ok.days, plan: 1 })), true, '缺标题');
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, title: '' })), true);
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, title: '   ' })), true, '全空白标题应拒');
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, title: '　\t' })), true, '全角空白也应拒');
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, stamp: '   ' })), true, '可选文本全空白同样拒');
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, unit: ' ' })), true);
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, note: ' \n ' })), true);
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, form: 'line' })), true, '形态闭集外');
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, form: 'A' })), true, '闭集存的是骨架名，不是原型墙的格号');
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, form: 'B' })), true, '同上');
    assert.equal(throwsBlocks(() => renderGapBand({ title: 'x', plan: 1 })), true, '缺 days');
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, days: 'x' })), true, 'days 不是数组');
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, days: [null, null, null] })), true, '元素不是对象');
    assert.equal(throwsBlocks(() => renderGapBand({
      ...ok, days: [{ label: '', value: 1 }, { label: 'b', value: 2 }, { label: 'c', value: 3 }],
    })), true, '日子空串');
    assert.equal(throwsBlocks(() => renderGapBand({
      ...ok, days: [{ label: '　', value: 1 }, { label: 'b', value: 2 }, { label: 'c', value: 3 }],
    })), true, '日子全空白');
    assert.equal(throwsBlocks(() => renderGapBand({
      ...ok, days: [{ label: 'a', value: '1' }, { label: 'b', value: 2 }, { label: 'c', value: 3 }],
    })), true, '读数不是数');
    assert.equal(throwsBlocks(() => renderGapBand({
      ...ok, days: [{ label: 'a', value: Number.NaN }, { label: 'b', value: 2 }, { label: 'c', value: 3 }],
    })), true, '读数是 NaN');
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, plan: undefined })), true, 'band 缺 plan');
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, plan: '7.5' })), true, 'plan 不是数');
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, plan: Number.POSITIVE_INFINITY })), true, 'plan 无穷');
    /* B 档。 */
    const d = {
      title: 'x', form: 'deviation', target: 10,
      days: [{ label: 'a', value: 11 }, { label: 'b', value: 9 }, { label: 'c', value: 10 }],
    };
    assert.equal(throwsBlocks(() => renderGapBand({ title: 'x', form: 'deviation', days: d.days })), true,
      'deviation 缺 target');
    assert.equal(throwsBlocks(() => renderGapBand({ ...d, target: '10' })), true, 'target 不是数');
    /* 形态决定读哪个标量：另一个形态的字段只是多余字段（不认，也不影响），缺自己那一个才拒。 */
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, target: 1 })), false,
      'band 不认 target（多余字段忽略，plan 在就照画）');
    assert.ok(renderGapBand({ ...d, plan: 1 }).includes(GAP_BAND_CLASS), 'deviation 不认 plan（多余字段忽略）');
    /* 附加类名：类型不对一律拒。 */
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, extraClass: 'a"b' })), true);
    assert.equal(throwsBlocks(() => renderGapBand({ ...ok, extraClass: '   ' })), true);
  });

  it('上限下限是**自证**的（边界值能过、越界一条就拒），不抄字面量', () => {
    const day = (n) => ({ days: new Array(n).fill(0).map((_, i) => ({ label: 'd' + String(i), value: 1 })) });
    assert.ok(renderGapBand({ title: 'x', plan: 1, ...day(GAP_BAND_MIN_DAYS) }).length > 0, '下限能过');
    assert.equal(throwsBlocks(() => renderGapBand({ title: 'x', plan: 1, ...day(GAP_BAND_MIN_DAYS - 1) })), true,
      '下限 −1 应拒');
    assert.ok(renderGapBand({ title: 'x', plan: 1, ...day(GAP_BAND_MAX_DAYS) }).length > 0, '上限能过');
    assert.equal(throwsBlocks(() => renderGapBand({ title: 'x', plan: 1, ...day(GAP_BAND_MAX_DAYS + 1) })), true,
      '上限 ＋1 应拒');
    const dev = (n) => ({
      title: 'x', form: 'deviation', target: 1,
      days: new Array(n).fill(0).map((_, i) => ({ label: 'd' + String(i), value: 1 })),
    });
    assert.ok(renderGapBand(dev(GAP_BAND_MIN_DAYS)).length > 0);
    assert.equal(throwsBlocks(() => renderGapBand(dev(GAP_BAND_MIN_DAYS - 1))), true);
    assert.ok(renderGapBand(dev(GAP_BAND_MAX_DAYS)).length > 0);
    assert.equal(throwsBlocks(() => renderGapBand(dev(GAP_BAND_MAX_DAYS + 1))), true);
  });

  it('纯函数：同样的入参恒产同样的字节（两档各一遍）', () => {
    for (const input of [BAND_INPUT, BAND_FLAT, DEV_INPUT, DEV_FLAT, DEV_12]) {
      assert.equal(renderGapBand(input), renderGapBand(input));
    }
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('gap-band ② 样式与零 DOM 纪律', () => {
  const css = gapBandCss();
  const clean = stripComments(css);

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且**只出现一次**', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = ruleSelectors(clean);
    assert.ok(selectors.length >= 40, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        assert.ok(one.includes(GAP_BAND_CLASS), '选择器必须只碰本件类名根：' + one);
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
    assert.ok(clean.includes('container-type: inline-size'), '写了 @container 就必须自己声明容器（否则永不生效）');
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
  });

  it('**窄档阈值只有一处来源**：样式源码里不出现那个数字的字面量，查询串由常量拼出', () => {
    const query = '@container (max-width: ' + String(GAP_BAND_NARROW_PX) + 'px)';
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.equal(countOf(css, esc(query)), 2, '窄档查询应有两条（图区一份、柱区一份，都由常量拼出）');
    assert.equal(new RegExp('\\b' + String(GAP_BAND_NARROW_PX) + '\\b').test(STYLE_SRC), false,
      '样式源码里写了阈值字面量（写两处必然走散：改常量时查询不跟）');
    assert.ok(STYLE_SRC.includes('GAP_BAND_NARROW_PX'), '样式源码应当读 GAP_BAND_NARROW_PX 这个常量');
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、**不拿 ink 系当面**', () => {
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外的颜色字面量：' + [...new Set(bare)].join('、'));
    assert.deepEqual([...stripComments(STYLE_SRC).matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [],
      '样式源码里请改走 skinVar()');
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了"面"：' + value);
    }
    assert.ok(clean.includes('color-mix(in srgb,'), '带子面／还差的柱是强调色的淡洗');
  });

  it('正／负／计划线不只靠颜色区分：线型 ＋ 标注两样同时在', () => {
    const line = ruleOf(clean, '.' + slotCls('line'));
    assert.ok(/stroke:\s*var\(--ilife-accent[,)]/.test(line), '实际线走强调色：' + line);
    const plan = ruleOf(clean, '.' + slotCls('plan'));
    assert.ok(/border-top:\s*2px dashed/.test(plan), '计划线是虚线（线型与实线区分）：' + plan);
    const up = ruleOf(clean, '.' + slotCls('bar'));
    assert.ok(/background:\s*var\(--ilife-accent[,)]/.test(up), '超了的柱是**无文字的条** ⇒ accent 实底：' + up);
    const down = ruleOf(clean, '.' + slotCls('bar') + '.is-down');
    assert.ok(/color-mix\(in srgb, var\(--ilife-accent/.test(down), '还差的柱是淡洗面（深浅两档形）：' + down);
  });

  it('**内容撑不宽容器**：会随调用方文本变长的槽带 `min-width: 0`＋可收窄，刻度列有宽度上限', () => {
    for (const slot of ['stamp', 'tail', 'title', 'ytick', 'xlabel', 'xday', 'xvalue', 'sumvalue',
      'sumdesc', 'legend-item', 'note']) {
      const body = ruleOf(clean, '.' + slotCls(slot));
      assert.ok(/min-width:\s*0/.test(body), slot + ' 少了 min-width: 0（长文本会顶宽容器）：' + body);
      assert.equal(/flex:\s*(none|0\s+0\s+auto)/.test(body), false,
        slot + ' 用了 flex: none（内容会顶宽父行，改 flex: 0 1 auto）：' + body);
    }
    assert.ok(/max-width:\s*\d+em/.test(ruleOf(clean, '.' + slotCls('ytick'))),
      '刻度列是 max-content 宽：刻度必须有个宽度上限，否则一句长单位会把图区挤没');
    assert.equal(clean.includes('overflow-x'), false, '不许出现 overflow-x（不藏横滑）');
    assert.equal(clean.includes('scroll'), false, '不许出现滚动容器');
  });

  it('**关键语义永不 `…` 截断**：全件没有 text-overflow／line-clamp／ellipsis／white-space', () => {
    for (const word of ['text-overflow', 'line-clamp', 'white-space', 'ellipsis']) {
      assert.equal(clean.includes(word), false, '出现了 ' + word + '（数值与日期不许截断）');
    }
  });

  it('尺寸事实写在常量里：图区与柱区三档高度取常量，宽窄由容器查询切换，刻度列**跟着图区走**', () => {
    assert.ok(clean.includes('height: ' + String(GAP_BAND_PLOT_PX) + 'px'));
    assert.ok(clean.includes('height: ' + String(GAP_BAND_NARROW_PLOT_PX) + 'px'));
    assert.ok(clean.includes('height: ' + String(GAP_BAND_COLS_PX) + 'px'));
    assert.ok(clean.includes('height: ' + String(GAP_BAND_NARROW_COLS_PX) + 'px'));
    assert.ok(clean.includes('height: ' + String(GAP_BAND_WIDE_COLS_PX) + 'px'));
    const ticks = ruleOf(clean, '.' + slotCls('yticks'));
    assert.ok(ticks.includes('height: ' + String(GAP_BAND_PLOT_PX) + 'px'),
      '刻度列必须与图区同高（不然刻度与线不是同一把尺）：' + ticks);
    const narrow = clean.slice(clean.indexOf('@container'));
    assert.ok(narrow.includes('.' + slotCls('yticks')) && narrow.includes('height: '
      + String(GAP_BAND_NARROW_PLOT_PX) + 'px'), '窄档里刻度列也要跟着图区矮一档');
  });

  it('零键盘语汇、零可点元素（本件是纯静态图，没有运行时段）', () => {
    const words = ['快捷键', '键位', '方向键', '键帽', '键盘', '按 Enter', 'Tab'];
    const html = [BAND_INPUT, DEV_INPUT].map((i) => renderGapBand(i)).join('') + css;
    for (const w of words) assert.equal(html.includes(w), false, '出现键盘语汇：' + w);
    const interactive = [BAND_INPUT, DEV_INPUT].map((i) => renderGapBand(i)).join('');
    for (const needle of ['<button', '<a ', 'tabindex', 'onclick', '<input', '<select']) {
      assert.equal(interactive.includes(needle), false, '本件不带可点元素：' + needle);
    }
    assert.equal(readdirSync(DIR).includes('runtime.ts'), false, '纯静态图不该有运行时段');
  });

  it('`dist/components/gap-band/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'gap-band');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 7, '至少该有 index／attrs／model／scale／forms／render／style／style-forms 的产物：'
      + files.join('、'));
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

  it('槽位闭集与类名一致（判据不另抄一份字面量）；样式来源是两份 `style*.ts`', () => {
    assert.equal(slotCls('bar'), GAP_BAND_CLASS + '-bar');
    assert.equal(gapBandSlot('bar', 'x-'), 'x-block-gap-band-bar');
    for (const slot of GAP_BAND_SLOTS) assert.ok(slotCls(slot).startsWith(GAP_BAND_CLASS + '-'));
    const onDisk = readdirSync(DIR).filter((f) => /^style(?:-[^/]+)?\.ts$/.test(f)).sort();
    assert.deepEqual(onDisk, ['style-forms.ts', 'style.ts'], '本件的样式来源就是这两份（多一份少一份都红）');
  });

  it('⑥ 分隔符门：本件生成的字里不出现 `·`／`；`／并列顿号（R1–R3 零命中）', () => {
    for (const [name, input] of [['band', BAND_INPUT], ['bandflat', BAND_FLAT], ['dev', DEV_INPUT],
      ['devflat', DEV_FLAT], ['dev12', DEV_12]]) {
      const r = auditHtml(renderGapBand(input), name);
      assert.deepEqual(r.node.hits.map((h) => h.text), [], name + '：可见文本踩了分隔符门');
      assert.deepEqual(r.line.hits.map((h) => h.text), [], name + '：行级也踩了');
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('gap-band ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(GAP_BAND_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderScaleBar({ value: 860, goal: 1850 });
    renderGapBand(BAND_INPUT);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), before, '别件的产物逐字节不变');
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(gapBandCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-gap-band'), '前缀必须作用到类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });
});

/* ── ④ 四档几何（真机）＋ ⑤ 皮肤纪律 ────────────────────────────────── */

/** 四档**容器**宽度：320 是触屏最窄那一档，620 起过窄档阈值（`GAP_BAND_NARROW_PX`）。 */
const WIDTHS = [320, 390, 620, 1280];

/** 压力样例：两档常规 ＋ 两档退化 ＋ 12 天 ＋ 长口径 ＋ 长单位。 */
function cases() {
  return [
    { name: 'band', form: 'band', html: renderGapBand(BAND_INPUT) },
    { name: 'bandflat', form: 'band', html: renderGapBand(BAND_FLAT) },
    { name: 'dev', form: 'deviation', html: renderGapBand(DEV_INPUT) },
    { name: 'devflat', form: 'deviation', html: renderGapBand(DEV_FLAT) },
    { name: 'dev12', form: 'deviation', html: renderGapBand(DEV_12) },
    { name: 'longstamp', form: 'band', html: renderGapBand({ ...BAND_INPUT, stamp: LONG_STAMP }) },
    { name: 'longunit', form: 'band', html: renderGapBand({ ...BAND_INPUT, unit: LONG_UNIT }) },
  ];
}

/** 真机起不来时的确定性几何判据（量不到"内容撑宽"，就断**形状上的那几条**）。 */
function assertStaticGeometry(css, html) {
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const wide = [...px(html), ...px(css)].filter((v) => v > WIDTHS[0]);
  assert.deepEqual(wide, [], '出现过不了最窄档（' + WIDTHS[0] + '）的固定宽度：' + wide.join('、'));
  const percents = [...html.matchAll(/style="(?:bottom|top): ([\d.]+)%/g)].map((m) => Number(m[1]));
  assert.ok(percents.length > 0, '计划线与锚点的坐标必须是百分比（判据会空转）');
  for (const v of percents) assert.ok(v >= 0 && v <= 100, '百分比越界：' + v);
  const clean = stripComments(css);
  for (const slot of ['stamp', 'tail', 'xlabel', 'sumvalue']) {
    assert.ok(/min-width:\s*0/.test(ruleOf(clean, '.' + slotCls(slot))), slot + ' 少了 min-width: 0');
  }
}

describe('gap-band ④⑤ 四档几何与皮肤纪律（真机 headless Chrome ＋ CDP）', () => {
  it('容器 320／390／620／1280：零横向溢出／计划线落在算出来的位置／首末刻度对到轴顶与轴底／窄档图区矮一档／零截断', async (t) => {
    const css = gapBandCss();
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n'),
      css: skinCss() + '\n' + css,
      height: 2600,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：'
        + '没有超过 ' + WIDTHS[0] + 'px 的固定宽度 ＋ 坐标是百分比 ＋ 长文本槽可收窄（min-width: 0）');
      assertStaticGeometry(css, casesHtml);
      return t.skip('本机无 Chrome／Chromium：四档几何判据需真浏览器');
    }
    try {
      const seen = [];
      const over = [];
      for (const width of WIDTHS) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of SKIN_NAMES) {
          for (const c of cases()) {
            const scope = '.' + skinClass(skin) + ' [data-case=' + c.name + '] ';
            const root = await page.read([scope + '.' + GAP_BAND_CLASS, scope + '.' + slotCls('hd')]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            for (const one of root) {
              assert.ok(one.maxScrollW <= one.maxClientW + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 横向溢出 '
                + one.maxScrollW + ' > ' + one.maxClientW);
              assert.equal(one.scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            }
            /* 数值／日子／口径**不被截断**（压字与省略号都不是本件的做法）。 */
            const slots = (c.form === 'band'
              ? ['ytick', 'xday', 'xvalue', 'planlabel', 'anchor', 'sumvalue', 'sumdesc', 'stamp', 'tail']
              : ['xlabel', 'barvalue', 'sumvalue', 'sumdesc', 'stamp', 'tail'])
              .filter((slot) => new RegExp('class="' + slotCls(slot) + '[ "]').test(c.html));
            const texts = await page.read(slots.map((slot) => scope + '.' + slotCls(slot)));
            for (const one of texts) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel
                + ' 有 ' + one.clipped + ' 处被截断');
              assert.ok(one.visible > 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 不见了');
            }
            over.push({ width, skin, name: c.name, scrollW: root[0].maxScrollW, clientW: root[0].maxClientW });
            if (c.form === 'band') {
              /* **计划线落在算出来的位置**：行内 `top` 是真值，真机量的偏移必须就是它。 */
              const planPct = planOf(c.html);
              const geo = await page.ev('(function(){var root=document.querySelector('
                + JSON.stringify(scope + '.' + GAP_BAND_CLASS) + ');'
                + 'var plot=root.querySelector(' + JSON.stringify('.' + slotCls('plot')) + ');'
                + 'var plan=root.querySelector(' + JSON.stringify('.' + slotCls('plan')) + ');'
                + 'var ticks=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + slotCls('ytick')) + '));'
                + 'var b=plot.getBoundingClientRect();var p=plan.getBoundingClientRect();'
                + 'var first=ticks[0].getBoundingClientRect();'
                + 'var last=ticks[ticks.length-1].getBoundingClientRect();'
                + 'var ancs=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + slotCls('anchor')) + '));'
                + 'var plotW=Math.round(b.width*10)/10;'
                + 'return {n:ticks.length,plotH:Math.round(b.height),plotW:plotW,'
                + 'planDelta:Math.round((p.top-b.top-b.height*' + String(planPct) + '/100)*10)/10,'
                + 'top:Math.round((first.top+first.height/2-b.top)*10)/10,'
                + 'bottom:Math.round((last.top+last.height/2-b.bottom)*10)/10,'
                + 'ancs:ancs.map(function(a){var r=a.getBoundingClientRect();'
                + 'return {l:Math.round(r.left-b.left),r:Math.round(b.right-r.right),'
                + 't:Math.round(r.top-b.top),b:Math.round(b.bottom-r.bottom)}})};}())');
              assert.ok(geo.n >= 2, width + ' 档 ' + skin + '：刻度枚数不对');
              assert.ok(Math.abs(geo.planDelta) <= 1.5, width + ' 档 ' + skin + ' ' + c.name
                + '：计划线没落在算出来的位置（差 ' + geo.planDelta + 'px，行内 top ' + planPct + '%）');
              assert.ok(Math.abs(geo.top) <= 1.5, width + ' 档 ' + skin
                + '：轴顶刻度没落在图区上沿（差 ' + geo.top + 'px）');
              assert.ok(Math.abs(geo.bottom) <= 1.5, width + ' 档 ' + skin
                + '：轴底刻度没落在图区下沿（差 ' + geo.bottom + 'px）');
              for (const [ai, a] of geo.ancs.entries()) {
                assert.ok(a.l >= -1 && a.r >= -1, width + ' 档 ' + skin + ' ' + c.name
                  + '：第 ' + (ai + 1) + ' 枚锚点横向出框（左 ' + a.l + 'px／右 ' + a.r + 'px）');
                assert.ok(a.t >= -1 && a.b >= -1, width + ' 档 ' + skin + ' ' + c.name
                  + '：第 ' + (ai + 1) + ' 枚锚点纵向出框（上 ' + a.t + 'px／下 ' + a.b + 'px）');
              }
              seen.push({ width, skin, name: c.name, plotH: geo.plotH, plotW: geo.plotW,
                planDelta: geo.planDelta, tickTop: geo.top, tickBottom: geo.bottom });
            } else {
              /* **柱与标注都在柱区里**：柱顶不冒出图区、柱底不沉到基线下面、柱上那个数也在图区里。 */
              const box = await page.ev('(function(){var root=document.querySelector('
                + JSON.stringify(scope + '.' + GAP_BAND_CLASS) + ');'
                + 'var cols=root.querySelector(' + JSON.stringify('.' + slotCls('cols')) + ');'
                + 'var bars=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + slotCls('bar')) + '));'
                + 'var vals=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + slotCls('barvalue')) + '));'
                + 'var p=cols.getBoundingClientRect();'
                + 'var o={n:bars.length,colsH:Math.round(p.height),colsW:Math.round(p.width),'
                + 'minTop:1e9,maxBot:-1e9,minValTop:1e9,maxValBot:-1e9};'
                + 'for(var i=0;i<bars.length;i+=1){var r=bars[i].getBoundingClientRect();'
                + 'if(r.top<o.minTop)o.minTop=r.top; if(r.bottom>o.maxBot)o.maxBot=r.bottom;}'
                + 'for(var j=0;j<vals.length;j+=1){var q=vals[j].getBoundingClientRect();'
                + 'if(q.top<o.minValTop)o.minValTop=q.top; if(q.bottom>o.maxValBot)o.maxValBot=q.bottom;}'
                + 'return {n:o.n,colsH:o.colsH,colsW:o.colsW,'
                + 'barTop:Math.round(o.minTop-p.top),barBottom:Math.round(p.bottom-o.maxBot),'
                + 'valTop:Math.round(o.minValTop-p.top),valBottom:Math.round(p.bottom-o.maxValBot)};}())');
              assert.ok(box.barTop >= -1, width + ' 档 ' + skin + ' ' + c.name + '：有柱冒出柱区上边');
              assert.ok(box.barBottom >= -1, width + ' 档 ' + skin + ' ' + c.name + '：有柱沉到基线下面');
              assert.ok(box.valTop >= -1, width + ' 档 ' + skin + ' ' + c.name + '：柱上那个数冒出柱区上边');
              assert.ok(box.valBottom >= -1, width + ' 档 ' + skin + ' ' + c.name + '：柱上那个数沉到基线下面');
              seen.push({ width, skin, name: c.name, colsH: box.colsH, colsW: box.colsW });
            }
          }
        }
      }
      /* **窄档是容器驱动的**（视口没变，只改了夹具容器宽度）：320／390 矮一档，620／1280 高一档。 */
      for (const w of WIDTHS) {
        const plots = seen.filter((s) => s.width === w && s.plotH !== undefined).map((s) => s.plotH);
        const wantPlot = w < GAP_BAND_NARROW_PX ? GAP_BAND_NARROW_PLOT_PX : GAP_BAND_PLOT_PX;
        assert.equal(plots.every((h) => h === wantPlot), true,
          w + ' 档图区高度应为 ' + wantPlot + '：' + JSON.stringify(plots));
        const cols = seen.filter((s) => s.width === w && s.colsH !== undefined).map((s) => s.colsH);
        const wantCols = w < GAP_BAND_NARROW_PX ? GAP_BAND_NARROW_COLS_PX
          : (w >= 620 ? GAP_BAND_WIDE_COLS_PX : GAP_BAND_COLS_PX);
        assert.equal(cols.every((h) => h === wantCols), true,
          w + ' 档柱区高度应为 ' + wantCols + '：' + JSON.stringify(cols));
      }
      /* ⑤ 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const c of cases()) {
        for (const width of WIDTHS) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
            + 'for (var i = 0; i < skins.length; i += 1) {'
            + '  var el = document.querySelector("." + "ilife-skin-" + skins[i]'
            + ' + " [data-case=' + c.name + '] .' + GAP_BAND_CLASS + '");'
            + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
            + '} return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
          }
        }
      }
      /* 取值来自皮肤表：超了的柱＝`accent` 实底；计划线＝`ink-2` 虚线。 */
      for (const skin of SKIN_NAMES) {
        const vals = SKIN_VALUES[skin];
        const colors = await page.ev('(function(){var bar=document.querySelector('
          + JSON.stringify('.' + skinClass(skin) + ' [data-case=dev] .' + slotCls('bar') + '.is-up') + ');'
          + 'var plan=document.querySelector('
          + JSON.stringify('.' + skinClass(skin) + ' [data-case=band] .' + slotCls('plan')) + ');'
          + 'return {bar: bar === null ? null : getComputedStyle(bar).backgroundColor,'
          + 'plan: plan === null ? null : getComputedStyle(plan).borderTopColor};}())');
        assert.equal(colors.bar, toRgb(vals.accent), skin + '：超了的柱取 accent 实底');
        assert.equal(colors.plan, toRgb(vals['ink-2']), skin + '：计划线取 ink-2 虚线');
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of WIDTHS) {
        const cells = over.filter((s) => s.width === w);
        const band = seen.filter((s) => s.width === w && s.name === 'band');
        const dev = seen.filter((s) => s.width === w && s.name === 'dev');
        console.log('READING gap-band container=' + w
          + ' plotH=' + band[0].plotH + ' plotW=' + band[0].plotW
          + ' planDelta=' + band[0].planDelta + ' tickTopDelta=' + band[0].tickTop
          + ' tickBottomDelta=' + band[0].tickBottom + ' colsH=' + dev[0].colsH + ' colsW=' + dev[0].colsW
          + ' maxRootScrollW=' + Math.max(...cells.map((s) => s.scrollW))
          + ' maxRootClientW=' + Math.max(...cells.map((s) => s.clientW))
          + ' cells=' + cells.length);
      }
    } finally { page.close(); }
  });
});

/* ── ⑦ 说明书自证 ───────────────────────────────────────────────────── */

describe('gap-band ⑦ 说明书自证（示例入参直渲成功，一件只许有一块）', () => {
  const readme = readFileSync(join(DIR, 'README.md'), 'utf8');

  it('首行是「# gap-band · 差值带」（派生器认这一行拿中文名）', () => {
    assert.match(readme.split('\n')[0].trim(), /^#\s*gap-band\s*·\s*差值带$/);
  });

  it('显式示例入参块恰好一块、是合法 JSON、直渲成功', () => {
    const fences = [];
    const lines = readme.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const m = /^\s*(`{3,}|~{3,})\s*(.*)$/.exec(lines[i]);
      if (m === null) continue;
      const fence = m[1];
      const body = [];
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        const close = /^\s*(`{3,}|~{3,})\s*$/.exec(lines[j]);
        if (close !== null && close[1].charAt(0) === fence.charAt(0) && close[1].length >= fence.length) break;
        body.push(lines[j]);
      }
      if (m[2].trim().includes('示例入参')) fences.push({ at: i + 1, text: body.join('\n') });
      i = j;
    }
    assert.equal(fences.length, 1, '一件只许有一份示例入参（两份就不知道拿哪一份渲染了）');
    const sample = JSON.parse(fences[0].text);
    assert.ok(typeof sample === 'object' && sample !== null && !Array.isArray(sample), '示例入参必须是一份 JSON 对象');
    const html = renderGapBand(sample);
    assert.ok(html.includes(GAP_BAND_CLASS), '示例入参必须能直接渲染成功');
    assert.ok(html.includes(sample.title), '渲染出来的是这一份样例');
  });

  it('偏离逐条留档、触控成立条件写清（回给人看的那几句）', () => {
    assert.ok(readme.includes('与原型的有意偏离'), '偏离表必须有');
    assert.ok(readme.includes('44'), '触控成立条件（44px）必须写清');
    assert.ok(readme.includes('GAP_BAND_FORMS'), '形态闭集必须点名');
  });
});
