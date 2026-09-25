/** spread-dist（分布与分位 · 两个形态：逐日范围柱／分位尺）· 契约测试。
 *
 * 覆盖六组判据：
 *  ① **渲染契约**：两档各自的骨架与枚数／**刻度与轴域同一份真值**（从**印出来的刻度**反推轴域，
 *     再把每根柱的 `bottom`／`height`／每个中位块的 `bottom`／每枚刻度自己的 `bottom` 逐点对账；
 *     轴域不整齐、全等值、12 位金额三种压力样例都在里面）／缺中位数那一支／转义面／
 *     **全部**非法入参分支（每个都断 `BlocksError`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且**只出现一次**、
 *     零 `:root`／`!important`／零新 token／零 `@media` 宽度查询／零手写色值／零把 `ink` 系当面／
 *     零键盘语汇／零可点元素／**窄档阈值只有一处来源**；
 *  ③ **加法式**：本件只读自己的类名；不启用它的页面零命中、逐字节不变；
 *  ④ **四档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 320／390／620／1280 下零横向溢出
 *     （含长口径／长单位两种压力样例）、**每一枚**刻度**中心**对到它那个值的位置（差 ≤1.5px）、
 *     窄档柱区确实矮一档（`@container` 真在生效）、日子与刻度零截断；
 *  ⑤ **皮肤纪律**：同一份入参渲染三次逐字节相同、标记不带皮肤类、真机上四套皮肤里的 `innerHTML`
 *     逐字节相同、分位尺正中那一档真取到取值表里的软底与字色；
 *  ⑥ **分隔符门**（`test/separator-probe.mjs` 的 R1–R3）：本件生成的字里不出现 `·`／`；`／并列顿号。
 *
 * 期望值一律从组件自己的常量派生（`SPREAD_DIST_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SPREAD_DIST_DAYS_PX,
  SPREAD_DIST_MAX_DAYS,
  SPREAD_DIST_MAX_STOPS,
  SPREAD_DIST_MAX_TICKS,
  SPREAD_DIST_MIN_DAYS,
  SPREAD_DIST_MIN_STOPS,
  SPREAD_DIST_MISSING,
  SPREAD_DIST_NARROW_DAYS_PX,
  SPREAD_DIST_NARROW_PX,
  SPREAD_DIST_SLOTS,
  renderSpreadDist,
  spreadDistCss,
  spreadDistSlot,
} from '../dist/components/spread-dist/index.js';
import { SPREAD_DIST_CLASS, SPREAD_DIST_FORMS } from '../dist/components/spread-dist/attrs.js';
import { niceAxis, tickValues } from '../dist/components/spread-dist/scale.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKINS, skinCss, skinClass } from '../dist/components/skin/index.js';
import { SKIN_NAMES } from '../dist/components/skin/contract.js';
import { auditHtml } from './separator-probe.mjs';
import { styleSource } from './_style-sources.mjs';
import { startShapesPage } from './shapes-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
/** 本件的样式源码：**经 `_style-sources.mjs` 取该件全部 `style*.ts`**（一件的样式段不许按单文件读——
 *  按规矩拆出去的 `style-forms.ts` 会被放盲区）。本件今天只有一份 `style.ts`，读法照规矩走。 */
const STYLE_SRC = styleSource('spread-dist');

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

/** 一条规则（选择器 → 声明块）。**选择器列表也要认**（`A, B, C { … }` 里 B／C 不是以 ` {` 收尾的）。 */
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

/** 刻度文字 → 数（`10,000 卡` → 10000；`1e+21` 原样）。 */
const tickNum = (text) => Number(text.replace(/[^0-9.eE+-]/g, ''));

/** **从印出来的刻度反推轴域**：第一枚与最后一枚就是上下界（轴顶恒等于顶刻度、轴底恒等于底刻度）。 */
function axisFromTicks(ticks) {
  const nums = ticks.map(tickNum);
  return { lo: Math.min(...nums), hi: Math.max(...nums), ticks: nums.length };
}

/** 按（从刻度反推的）轴域算：某个读数该落在的百分比（与 `scale.ts` 的 `upPct` 同一套口径）。 */
function expectPct(value, axis) {
  const t = (value - axis.lo) / (axis.hi - axis.lo);
  return Number((Math.min(1, Math.max(0, t)) * 100).toFixed(2));
}

const slotTexts = (html, slot) => [...html.matchAll(new RegExp('class="' + spreadDistSlot(slot) + '"[^>]*>([^<]*)<', 'g'))]
  .map((m) => m[1]);

/** 纵轴刻度：文字 ＋ 它自己的 `bottom`（两样都从同一个轴域出）。 */
const yticksOf = (html) => [...html.matchAll(
  new RegExp('class="' + spreadDistSlot('ytick') + '" style="bottom: ([\\d.-]+)%">([^<]*)<', 'g'),
)].map((m) => ({ bottomPct: Number(m[1]), text: m[2] }));

/** 逐日柱：`bottom` ＋ `height`（区间条）。 */
const daysOf = (html) => [...html.matchAll(new RegExp(
  'class="' + spreadDistSlot('day-range') + '" aria-hidden="true" style="bottom: ([\\d.-]+)%; height: ([\\d.-]+)%"',
  'g'))].map((m) => ({ bottomPct: Number(m[1]), heightPct: Number(m[2]) }));

const mediansOf = (html) => [...html.matchAll(new RegExp(
  'class="' + spreadDistSlot('day-median') + '" aria-hidden="true" style="bottom: ([\\d.-]+)%"', 'g'))]
  .map((m) => Number(m[1]));

/* ── 样例（两档各一份；数字都用得上：轴的上下界、最宽那一天、拉得最开那一段） ─── */

const RANGE_INPUT = {
  title: '七天摄入波动', stamp: '每日 3 餐', unit: '百卡',
  days: [
    { label: '周一', low: 14, median: 38, high: 62 },
    { label: '周二', low: 18, median: 34, high: 58 },
    { label: '周三', low: 10, median: 52, high: 82 },
    { label: '周四', low: 22, median: 30, high: 54 },
    { label: '周五', low: 26, median: 32, high: 50 },
    { label: '周六', low: 24, median: 28, high: 48 },
    { label: '周日', low: 28, median: 36, high: 52 },
  ],
};
/** **轴域不整齐**：区间不整除、上下界都不落在整数上。 */
const ODD_INPUT = {
  title: '入睡时刻分布', days: [
    { label: '09-12', low: 1234, median: 2100, high: 3800 },
    { label: '09-13', low: 1567, median: 2903, high: 5678 },
    { label: '09-14', low: 1402, median: 2555, high: 4301 },
  ],
};
/** **全部读数同一个值**：轴域没有宽度（不许除零、也不许静默画成一条贴轴的线）。 */
const FLAT_INPUT = {
  title: '没有波动的一周', days: [
    { label: '周一', low: 7, median: 7, high: 7 },
    { label: '周二', low: 7, median: 7, high: 7 },
    { label: '周三', low: 7, median: 7, high: 7 },
  ],
};
/** 12 位金额：刻度最长那一档。 */
const HUGE_INPUT = {
  title: '大额分布', unit: '元', days: [
    { label: '周一', low: 123456789012, median: 555555555555, high: 987654321098 },
    { label: '周二', low: 123456789013, median: 555555555556, high: 987654321099 },
    { label: '周三', low: 123456789014, median: 555555555557, high: 987654321100 },
  ],
};
/** 五档这一份是**容量样例**（档数上限那一档）；README 的正例是**三档**（`P10`／`中位`／`P90`，
 *  照用户打 4 分的那一版），那一份由下面「正中那一档＝中位」与「说明句只说实话」两条覆盖。 */
const QUANTILE_INPUT = {
  title: '单笔金额分位', stamp: '38 笔', unit: '元', form: 'quantile',
  stops: [
    { name: 'P10', value: 18 }, { name: 'P25', value: 26 }, { name: 'P50', value: 58 },
    { name: 'P75', value: 142 }, { name: 'P90', value: 320 },
  ],
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('spread-dist ① 渲染契约 · 形态 range 逐日范围柱', () => {
  const html = renderSpreadDist(RANGE_INPUT);

  it('骨架：卡头 → 坐标框（纵轴刻度列 ‖ 逐日柱区）＋ 横轴日子行 → 图例 → 脚注', () => {
    assert.match(html, new RegExp('^<div class="' + SPREAD_DIST_CLASS + ' is-range">'));
    assert.equal(countOf(html, 'class="[^"]*-day"'), RANGE_INPUT.days.length, '一天一列');
    assert.equal(countOf(html, 'class="[^"]*-day-range"'), RANGE_INPUT.days.length);
    assert.equal(countOf(html, 'class="[^"]*-day-median"'), RANGE_INPUT.days.length);
    assert.equal(countOf(html, 'class="[^"]*-xlabel"'), RANGE_INPUT.days.length, '日子与列数一致');
    assert.ok(countOf(html, 'class="[^"]*-ytick"') >= 3, '纵轴至少三枚刻度');
    assert.ok(countOf(html, 'class="[^"]*-ytick"') <= SPREAD_DIST_MAX_TICKS,
      '刻度枚数不该超过 ' + SPREAD_DIST_MAX_TICKS);
    assert.match(html, /role="img" aria-label="逐日范围柱：7 天（周一，周二，周三，周四，周五，周六，周日）/);
    assert.match(html, /-tail">区间最宽的是周三（10 百卡 到 82 百卡）</, '卡头那句是**算出来**的');
    assert.equal(countOf(html, 'class="[^"]*-legend-item"'), 2, '图例两项：区间面 ＋ 中位条');
    assert.ok(!/<script/i.test(html), '不产脚本');
    for (const slot of ['hd', 'title', 'stamp', 'plotbox', 'legend', 'note']) {
      assert.ok(html.includes(spreadDistSlot(slot)), '缺槽：' + slot);
    }
    /* C 档那几槽在 B 档一个都不许出现（两个骨架不许串味）。 */
    for (const slot of ['lead', 'stops', 'stop', 'stop-name', 'stop-value']) {
      assert.equal(html.includes(spreadDistSlot(slot)), false, 'B 档不该有 ' + slot);
    }
  });

  it('**轴域与刻度同一份真值**：从印出来的刻度反推轴域，柱与刻度逐点对账', () => {
    for (const [name, input] of [['常规区间', RANGE_INPUT], ['轴域不整齐', ODD_INPUT],
      ['全部等值', FLAT_INPUT], ['12 位金额', HUGE_INPUT]]) {
      const h = renderSpreadDist(input);
      const ticks = yticksOf(h);
      assert.ok(ticks.length >= 3 && ticks.length <= SPREAD_DIST_MAX_TICKS,
        name + '：刻度枚数越界 ' + ticks.length);
      const axis = axisFromTicks(ticks.map((t) => t.text));
      assert.ok(Number.isFinite(axis.lo) && Number.isFinite(axis.hi), name + '：刻度读不回数');
      assert.ok(axis.hi > axis.lo, name + '：轴域没有宽度（除零）');
      /* 刻度等距、且轴顶与轴底就是首末两枚（不是"轴域另算一套"）。 */
      const nums = ticks.map((t) => tickNum(t.text));
      const step = (nums[0] - nums[nums.length - 1]) / (ticks.length - 1);
      assert.ok(step > 0, name + '：刻度间隔非正');
      nums.slice(0, -1).forEach((v, i) => assert.ok(Math.abs((v - nums[i + 1]) - step) < Math.max(1e-6, step * 1e-6),
        name + '：刻度不等距 ' + JSON.stringify(ticks.map((t) => t.text))));
      /* 轴域必须盖得住数据（读者按刻度读出来的值不许落在轴外）。 */
      const lows = input.days.map((d) => d.low);
      const highs = input.days.map((d) => d.high);
      assert.ok(axis.lo <= Math.min(...lows) && axis.hi >= Math.max(...highs), name + '：轴域盖不住数据');
      /* **每枚刻度自己的 `bottom` 必须等于它那个值在轴域里的位置**（文字与位置同一份真值）。 */
      for (const t of ticks) {
        assert.equal(t.bottomPct, expectPct(tickNum(t.text), axis),
          name + '：刻度「' + t.text + '」的位置与它自己的值对不上（' + t.bottomPct + '）');
      }
      /* **逐日对账**：每根范围条的底／顶与每个中位块，都等于「按刻度反推的轴域」算出来的位置。 */
      const bars = daysOf(h);
      const medians = mediansOf(h);
      assert.equal(bars.length, input.days.length, name + '：范围条枚数');
      assert.equal(medians.length, input.days.length, name + '：中位块枚数');
      input.days.forEach((d, i) => {
        assert.equal(bars[i].bottomPct, expectPct(d.low, axis), name + '：第 ' + (i + 1) + ' 天的条底与刻度对不上');
        assert.ok(Math.abs((bars[i].bottomPct + bars[i].heightPct) - expectPct(d.high, axis)) <= 0.01,
          name + '：第 ' + (i + 1) + ' 天的条顶与刻度对不上');
        assert.equal(medians[i], expectPct(d.median, axis), name + '：第 ' + (i + 1) + ' 天的中位块与刻度对不上');
      });
    }
  });

  it('**柱与中位块都落在框里**：百分比一律在 0…100（含 12 位金额与全等值那两档）', () => {
    for (const input of [RANGE_INPUT, ODD_INPUT, FLAT_INPUT, HUGE_INPUT]) {
      const h = renderSpreadDist(input);
      const percents = [...h.matchAll(/style="(?:bottom|top): ([\d.-]+)%/g)].map((m) => Number(m[1]));
      assert.ok(percents.length >= input.days.length * 2, '百分比读数太少（判据会空转）');
      for (const v of percents) assert.ok(v >= 0 && v <= 100, '百分比越界：' + v);
    }
  });

  it('**微小读数不画假图**：整批 `|读数|≲3e-6` 时刻度不印两个 `0`、柱不贴边、aria 不写 `最低 0，最高 0`', () => {
    const tiny = renderSpreadDist({
      title: '微量分布', unit: '克',
      days: [
        { label: 'a', low: 0.0000001, median: 0.0000002, high: 0.0000004 },
        { label: 'b', low: 0.00000015, median: 0.00000025, high: 0.00000045 },
        { label: 'c', low: 0.0000002, median: 0.0000003, high: 0.0000005 },
      ],
    });
    const ticks = yticksOf(tiny);
    assert.ok(ticks.length >= 3, '刻度枚数');
    const nums = ticks.map((t) => tickNum(t.text));
    assert.ok(nums.every((v) => Number.isFinite(v)), '刻度读回非有限数：' + JSON.stringify(ticks.map((t) => t.text)));
    assert.ok(new Set(nums).size >= 2, '刻度印重了（两个 `0`）：' + JSON.stringify(ticks.map((t) => t.text)));
    assert.ok(nums.some((v) => v !== 0), '刻度全是 `0`：' + JSON.stringify(ticks.map((t) => t.text)));
    /* 可见文本与无障碍名必须写出真值（旧实现 `toFixed(2)` 把 1e-7 写成 `0`）。 */
    assert.ok(tiny.includes('0.0000001'), 'title 里 1e-7 被写成 `0`：'
      + (tiny.match(/title="[^"]*/) || [''])[0]);
    assert.ok(tiny.includes('最高 0.0000006'), 'aria 把 6e-7 写成 `最高 0`：'
      + (tiny.match(/纵轴最低 [^。]*/) || [''])[0]);
    const bars = daysOf(tiny);
    assert.ok(bars.every((b) => b.bottomPct > 0 && b.bottomPct + b.heightPct < 100),
      '柱全夹到 0%／100%（真值被吞了）：' + JSON.stringify(bars));
  });

  it('**非零读数不写成 `0`**：`0.004` 不出 `最低 0 元`（同图刻度栏有三位小数时 title 必须跟上）', () => {
    const small = renderSpreadDist({
      title: '小额分布', unit: '元',
      days: [
        { label: 'a', low: 0.004, median: 0.006, high: 0.01 },
        { label: 'b', low: 0.005, median: 0.007, high: 0.011 },
        { label: 'c', low: 0.006, median: 0.008, high: 0.012 },
      ],
    });
    assert.ok(small.includes('0.004'), 'title／aria 里 0.004 被写成 `0`：'
      + (small.match(/title="[^"]*/) || [''])[0]);
    assert.equal(/最低 0[，，,]/.test(small), false, 'title 把 0.004 写成 `最低 0`：'
      + (small.match(/title="[^"]*/) || [''])[0]);
    const ticks = yticksOf(small);
    assert.ok(ticks.some((t) => /\.\d{3}/.test(t.text)), '刻度栏应有三位小数：'
      + JSON.stringify(ticks.map((t) => t.text)));
  });

  it('**缺中位数就不出中位块**：那一格只画区间，`title` 里写 `—`，不拿最低或最高顶替', () => {
    const bare = renderSpreadDist({
      title: 'x',
      days: [
        { label: '周一', low: 1, high: 9 },
        { label: '周二', low: 2, median: 5, high: 8 },
        { label: '周三', low: 3, high: 7 },
      ],
    });
    assert.equal(countOf(bare, 'class="[^"]*-day-median"'), 1, '只有给了中位数的那一天才有中位块');
    assert.match(bare, /title="周一：最低 1，最高 9，中位数 —"/);
    assert.equal(/最低 1，最高 9，中位数 1</.test(bare), false, '不许拿最低顶替中位数');
    assert.ok(bare.includes('中位数写 ' + SPREAD_DIST_MISSING), '脚注要说清缺值怎么写');
  });

  it('缺槽就不出那一槽：不给 stamp 就不出 stamp；不给 note 就用本形态的口径句', () => {
    const bare = renderSpreadDist({
      title: 'x',
      days: [{ label: 'a', low: 1, high: 2 }, { label: 'b', low: 1, high: 3 }, { label: 'c', low: 2, high: 4 }],
    });
    assert.equal(bare.includes(spreadDistSlot('stamp')), false);
    assert.ok(bare.includes('口径：竖条是当天最低到最高'), '不给 note 就用本形态的口径句');
    const noted = renderSpreadDist({
      title: 'x', note: '自定义口径',
      days: [{ label: 'a', low: 1, high: 2 }, { label: 'b', low: 1, high: 3 }, { label: 'c', low: 2, high: 4 }],
    });
    assert.ok(noted.includes('>自定义口径</p>'));
    assert.equal(noted.includes('口径：竖条是当天最低到最高'), false, '替换＝整句换掉');
  });

  it('每一天一样宽时照实说一样宽，不编一个「最宽的」出来', () => {
    const even = renderSpreadDist({
      title: 'x',
      days: [{ label: 'a', low: 1, high: 5 }, { label: 'b', low: 2, high: 6 }, { label: 'c', low: 3, high: 7 }],
    });
    assert.match(even, /-tail">每天区间一样宽</);
  });
});

describe('spread-dist ① 渲染契约 · 形态 quantile 分位尺', () => {
  const html = renderSpreadDist(QUANTILE_INPUT);

  it('骨架：卡头 → **结论一句话** → 读数一档一格 → 脚注（信息序照原型定稿版）', () => {
    assert.match(html, new RegExp('^<div class="' + SPREAD_DIST_CLASS + ' is-quantile">'));
    assert.equal(countOf(html, 'class="[^"]*-stop[ "]'), QUANTILE_INPUT.stops.length, '一档一格');
    assert.equal(countOf(html, 'class="[^"]*-stop-name"'), QUANTILE_INPUT.stops.length);
    assert.equal(countOf(html, 'class="[^"]*-stop-value"'), QUANTILE_INPUT.stops.length);
    /* **结论在上、读数在下**：`lead` 必须出现在 `stops` 之前。 */
    assert.ok(html.indexOf(spreadDistSlot('lead')) < html.indexOf(spreadDistSlot('stops')),
      '结论一句话必须在读数上面');
    assert.match(html, /-lead">一半的读数不超过 58 元，P90 是 320 元。</);
    assert.deepEqual(slotTexts(html, 'stop-name'), ['P10', 'P25', 'P50', 'P75', 'P90']);
    assert.deepEqual(slotTexts(html, 'stop-value'), ['18 元', '26 元', '58 元', '142 元', '320 元']);
    assert.match(html, /-tail">拉得最开的是 P75 到 P90（142 元 到 320 元）</, '卡头那句是**算出来**的');
    assert.equal(countOf(html, 'class="[^"]*-legend-item"'), 0, '本形态不带图例（档名就是坐标）');
    /* B 档那几槽在 C 档一个都不许出现。 */
    for (const slot of ['plotbox', 'days', 'day', 'xax', 'yticks']) {
      assert.equal(html.includes(spreadDistSlot(slot)), false, 'C 档不该有 ' + slot);
    }
  });

  it('**正中那一档＝中位**：它带选中面（`is-median`），其余几档不带', () => {
    assert.equal(countOf(html, 'class="[^"]*-stop is-median"'), 1, '恰好一档是正中');
    const order = [...html.matchAll(new RegExp('class="' + spreadDistSlot('stop') + '( is-median)?"', 'g'))]
      .map((m) => (m[1] === undefined ? 0 : 1));
    assert.deepEqual(order, [0, 0, 1, 0, 0], '正中那一档在三档／五档／七档的正中间');
    for (const n of [SPREAD_DIST_MIN_STOPS, 5, SPREAD_DIST_MAX_STOPS]) {
      const h = renderSpreadDist({
        ...QUANTILE_INPUT,
        stops: new Array(n).fill(0).map((_, i) => ({ name: 'P' + String(i * 5 + 5), value: i + 1 })),
      });
      const flags = [...h.matchAll(new RegExp('class="' + spreadDistSlot('stop') + '( is-median)?"', 'g'))]
        .map((m) => (m[1] === undefined ? 0 : 1));
      assert.equal(flags.filter((f) => f === 1).length, 1, n + ' 档时恰好一档是正中');
      assert.equal(flags[(n - 1) / 2], 1, n + ' 档时正中那一档在正中间');
    }
  });

  it('说明句只说实话：档名是 `P<数字>` 时给「不超过它的读数占 n%」，不是就不编', () => {
    assert.deepEqual(slotTexts(html, 'stop-label'),
      ['不超过它的读数占 10%', '不超过它的读数占 25%', '不超过它的读数占 50%',
        '不超过它的读数占 75%', '不超过它的读数占 90%']);
    const named = renderSpreadDist({
      ...QUANTILE_INPUT,
      stops: [{ name: '中位', value: 58 }, { name: '高位', value: 142 }, { name: '顶', value: 320 }],
    });
    assert.equal(countOf(named, 'class="[^"]*-stop-label"'), 0, '档名不是 P<数字> 时不给说明句（不编）');
    assert.match(named, /-lead">一半的读数不超过 142 元，顶是 320 元。</, '正中那一档的数就是结论里那个数');
  });

  it('每两档之间一样宽时照实说一样宽', () => {
    const even = renderSpreadDist({
      ...QUANTILE_INPUT,
      stops: [{ name: 'P10', value: 1 }, { name: 'P50', value: 2 }, { name: 'P90', value: 3 }],
    });
    assert.match(even, /-tail">每两档之间一样宽</);
  });
});

describe('spread-dist ① 渲染契约 · 公共面与非法入参', () => {
  it('转义面：标题／日子／单位／档名／口径逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderSpreadDist({
      title: evil, stamp: evil, unit: evil, note: evil,
      days: [{ label: evil, low: 1, median: 2, high: 3 }, { label: evil, low: 1, high: 2 },
        { label: evil, low: 2, high: 3 }],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    const evilStops = renderSpreadDist({
      title: evil, unit: evil, form: 'quantile',
      stops: [{ name: evil, value: 1 }, { name: evil + '2', value: 2 }, { name: evil + '3', value: 3 }],
    });
    assert.equal(/<script/i.test(html + evilStops), false);
  });

  it('**大到只给指数写法的刻度不许被三位分组切开**（`1e,+21` 那种）', () => {
    const huge = renderSpreadDist({
      title: 'x',
      days: [{ label: 'a', low: 1e21, median: 2e21, high: 3e21 },
        { label: 'b', low: 1.1e21, median: 2.1e21, high: 3.1e21 },
        { label: 'c', low: 1.2e21, median: 2.2e21, high: 3.2e21 }],
    });
    assert.equal(/e,/.test(huge), false, '指数写法里不许插进逗号：' + (huge.match(/[^>]*e,[^<]*/) || [''])[0]);
    assert.equal(/,\+/.test(huge), false);
    assert.ok(huge.includes('e+21'), '量级大到只给指数时原样写：' + (huge.match(/class="[^"]*-ytick"[^>]*>[^<]*/) || [''])[0]);
  });

  it('**±1e308 级区间不渲染**：轴域算不出来一律 `badInput`（旧实现 `ticks=Infinity` 无限 push 到 OOM）', () => {
    assert.equal(throwsBlocks(() => niceAxis(-1e308, 1e308)), true, 'niceAxis(±1e308) 应拒（旧实现回 ticks=Infinity）');
    const extreme = {
      title: 'x',
      days: [
        { label: 'a', low: -1e308, median: 0, high: 1e308 },
        { label: 'b', low: -1e308, median: 0, high: 1e308 },
        { label: 'c', low: -1e308, median: 0, high: 1e308 },
      ],
    };
    assert.equal(throwsBlocks(() => renderSpreadDist(extreme)), true, '整图 ±1e308 应拒');
    /* 枚数先夹常量再进循环：伪造超限轴域也只出 `MAX_TICKS` 枚（旧实现按数据出 100 枚）。 */
    assert.ok(tickValues({ lo: 0, hi: 99, step: 1, decimals: 0, ticks: 100 }).length <= SPREAD_DIST_MAX_TICKS,
      'tickValues 未夹到常量上限');
    /* 边界自证：`1e21` 与 12 位金额是合法输入，不许误杀。 */
    assert.ok(renderSpreadDist({
      title: 'x',
      days: [{ label: 'a', low: 1e21, median: 2e21, high: 3e21 },
        { label: 'b', low: 1.1e21, median: 2.1e21, high: 3.1e21 },
        { label: 'c', low: 1.2e21, median: 2.2e21, high: 3.2e21 }],
    }).length > 0, '1e21 应正常渲染');
  });

  it('入参违规一律拒（不静默降级）：形态／空白串／天数／日子／区间／档数／档名 逐条', () => {
    assert.deepEqual([...SPREAD_DIST_FORMS], ['range', 'quantile']);
    const ok = { title: 'x', days: [{ label: 'a', low: 1, high: 2 }, { label: 'b', low: 1, high: 3 },
      { label: 'c', low: 2, high: 4 }] };
    assert.equal(throwsBlocks(() => renderSpreadDist(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderSpreadDist([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderSpreadDist({ days: ok.days })), true, '缺标题');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, title: '' })), true);
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, title: '   ' })), true, '全空白标题应拒');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, title: '\u3000\t' })), true, '全角空白也应拒');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, stamp: '   ' })), true, '可选文本全空白同样拒');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, unit: ' ' })), true);
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, note: ' \n ' })), true);
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, form: 'box' })), true, '形态闭集外');
    assert.equal(throwsBlocks(() => renderSpreadDist({ title: 'x' })), true, 'range 缺 days');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, days: 'x' })), true, 'days 不是数组');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, days: [null, null, null] })), true, '元素不是对象');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, days: [{ label: '', low: 1, high: 2 },
      { label: 'b', low: 1, high: 3 }, { label: 'c', low: 2, high: 4 }] })), true, '日子空串');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, days: [{ label: '\u3000', low: 1, high: 2 },
      { label: 'b', low: 1, high: 3 }, { label: 'c', low: 2, high: 4 }] })), true, '日子全空白');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, days: [{ label: 'a', low: '1', high: 2 },
      { label: 'b', low: 1, high: 3 }, { label: 'c', low: 2, high: 4 }] })), true, '最低不是数');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, days: [{ label: 'a', low: 1, high: Number.NaN },
      { label: 'b', low: 1, high: 3 }, { label: 'c', low: 2, high: 4 }] })), true, '最高是 NaN');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, days: [{ label: 'a', low: 9, high: 2 },
      { label: 'b', low: 1, high: 3 }, { label: 'c', low: 2, high: 4 }] })), true, '最低比最高还大');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, days: [{ label: 'a', low: 1, median: 9, high: 2 },
      { label: 'b', low: 1, high: 3 }, { label: 'c', low: 2, high: 4 }] })), true, '中位数跑到区间外');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, days: [{ label: 'a', low: 1, median: '2', high: 3 },
      { label: 'b', low: 1, high: 3 }, { label: 'c', low: 2, high: 4 }] })), true, '中位数不是数');
    /* C 档。 */
    const q = { title: 'x', form: 'quantile' };
    const s3 = (v) => [{ name: 'P10', value: v }, { name: 'P50', value: v + 1 }, { name: 'P90', value: v + 2 }];
    assert.equal(throwsBlocks(() => renderSpreadDist(q)), true, 'quantile 缺 stops');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...q, stops: s3(1).slice(0, 2) })), true, '档数低于下限');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...q, stops: new Array(SPREAD_DIST_MAX_STOPS + 2)
      .fill(0).map((_, i) => ({ name: 'P' + String(i), value: i })) })), true, '档数超上限');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...q, stops: [
      { name: 'P10', value: 1 }, { name: 'P50', value: 2 }, { name: 'P90', value: 3 }, { name: 'P99', value: 4 },
    ] })), true, '**偶数档**没有正中（判据钉的就是这一条）');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...q, stops: [null, null, null] })), true, '元素不是对象');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...q, stops: [
      { name: 'P10', value: 1 }, { name: 'P10', value: 2 }, { name: 'P90', value: 3 },
    ] })), true, '档名重名');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...q, stops: [
      { name: 'P10', value: 3 }, { name: 'P50', value: 2 }, { name: 'P90', value: 1 },
    ] })), true, '分位读数反着走');
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...q, stops: [
      { name: 'P10', value: 1 }, { name: 'P50', value: 1 }, { name: 'P90', value: 1 },
    ] })), false, '读数相同是合法的（大量并列的读数就长这样）');
    /* 附加类名：类型不对一律拒。 */
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, extraClass: 'a"b' })), true);
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...ok, extraClass: '   ' })), true);
  });

  it('上限下限是**自证**的（边界值能过、越界一条就拒），不抄字面量', () => {
    const day = (n) => ({ days: new Array(n).fill(0).map((_, i) => ({ label: 'd' + String(i), low: 1, high: 2 })) });
    assert.ok(renderSpreadDist({ title: 'x', ...day(SPREAD_DIST_MIN_DAYS) }).length > 0, '下限能过');
    assert.equal(throwsBlocks(() => renderSpreadDist({ title: 'x', ...day(SPREAD_DIST_MIN_DAYS - 1) })), true, '下限 −1 应拒');
    assert.ok(renderSpreadDist({ title: 'x', ...day(SPREAD_DIST_MAX_DAYS) }).length > 0, '上限能过');
    assert.equal(throwsBlocks(() => renderSpreadDist({ title: 'x', ...day(SPREAD_DIST_MAX_DAYS + 1) })), true, '上限 ＋1 应拒');
    const stop = (n) => ({ stops: new Array(n).fill(0).map((_, i) => ({ name: 'P' + String(i + 1), value: i + 1 })) });
    const q = { title: 'x', form: 'quantile' };
    assert.ok(renderSpreadDist({ ...q, ...stop(SPREAD_DIST_MIN_STOPS) }).length > 0);
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...q, ...stop(SPREAD_DIST_MIN_STOPS - 1) })), true);
    assert.ok(renderSpreadDist({ ...q, ...stop(SPREAD_DIST_MAX_STOPS) }).length > 0);
    assert.equal(throwsBlocks(() => renderSpreadDist({ ...q, ...stop(SPREAD_DIST_MAX_STOPS + 1) })), true);
  });

  it('纯函数：同样的入参恒产同样的字节（两档各一遍）', () => {
    for (const input of [RANGE_INPUT, ODD_INPUT, FLAT_INPUT, HUGE_INPUT, QUANTILE_INPUT]) {
      assert.equal(renderSpreadDist(input), renderSpreadDist(input));
    }
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('spread-dist ② 样式与零 DOM 纪律', () => {
  const css = spreadDistCss();
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
        assert.ok(one.includes(SPREAD_DIST_CLASS), '选择器必须只碰本件类名根：' + one);
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

  it('**窄档阈值只有一处来源**：样式源码里不出现那个数字的字面量，查询串由常量拼出', () => {
    const query = '@container (max-width: ' + String(SPREAD_DIST_NARROW_PX) + 'px)';
    assert.equal(countOf(css, query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 1, '窄档查询只有一条');
    assert.equal(new RegExp('\\b' + String(SPREAD_DIST_NARROW_PX) + '\\b').test(STYLE_SRC), false,
      'style.ts 里写了阈值字面量（写两处必然走散：改常量时查询不跟）');
    assert.ok(STYLE_SRC.includes('SPREAD_DIST_NARROW_PX'), 'style.ts 应当读 SPREAD_DIST_NARROW_PX 这个常量');
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、**不拿 ink 系当面**', () => {
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外的颜色字面量：' + [...new Set(bare)].join('、'));
    assert.deepEqual([...stripComments(STYLE_SRC).matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [],
      'style.ts 里请改走 skinVar()');
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了"面"：' + value);
    }
    assert.ok(clean.includes('accent-soft'), '正中那一档走强调软底');
    assert.ok(clean.includes('color-mix(in srgb,'), '区间面／图例那枚面是强调色的淡洗');
  });

  it('选中态四档：有文字的面走软底、无文字的条走实底，两者同时在', () => {
    const mid = ruleOf(clean, '.' + spreadDistSlot('stop') + '.is-median');
    assert.ok(/background:\s*var\(--ilife-accent-soft/.test(mid), '正中那一档的底是 accent-soft：' + mid);
    assert.ok(/border-color:\s*var\(--ilife-accent/.test(mid), '正中那一档的描边是 accent：' + mid);
    for (const slot of ['stop-name', 'stop-label', 'stop-value']) {
      const body = ruleOf(clean, '.' + spreadDistSlot('stop') + '.is-median .' + spreadDistSlot(slot));
      assert.ok(/color:\s*var\(--ilife-accent-text/.test(body), slot + ' 走强调色的文本档：' + body);
    }
    const bar = ruleOf(clean, '.' + spreadDistSlot('day-median'));
    assert.ok(/background:\s*var\(--ilife-accent[,)]/.test(bar), '中位块是**无文字的条** ⇒ accent 实底：' + bar);
  });

  it('**内容撑不宽容器**：会随调用方文本变长的槽带 `min-width: 0`＋可收窄，刻度列有宽度上限', () => {
    for (const slot of ['stamp', 'tail', 'title', 'ytick', 'xlabel', 'stop-name', 'stop-label',
      'stop-value', 'legend-item', 'note']) {
      const body = ruleOf(clean, '.' + spreadDistSlot(slot));
      assert.ok(/min-width:\s*0/.test(body), slot + ' 少了 min-width: 0（长文本会顶宽容器）：' + body);
      assert.equal(/flex:\s*(none|0\s+0\s+auto)/.test(body), false,
        slot + ' 用了 flex: none（内容会顶宽父行，改 flex: 0 1 auto）：' + body);
    }
    assert.ok(/max-width:\s*\d+em/.test(ruleOf(clean, '.' + spreadDistSlot('ytick'))),
      '刻度列是 max-content 宽：刻度必须有个宽度上限，否则一句长单位会把柱子挤没');
    assert.ok(/flex-wrap:\s*wrap/.test(ruleOf(clean, '.' + spreadDistSlot('stop'))),
      '一档里的两行塞不下要换行，不许把字压扁');
    assert.equal(clean.includes('overflow-x'), false, '不许出现 overflow-x（不藏横滑）');
    assert.equal(clean.includes('scroll'), false, '不许出现滚动容器');
  });

  it('**关键语义永不 `…` 截断**：全件没有 text-overflow／line-clamp／nowrap', () => {
    for (const word of ['text-overflow', 'line-clamp', 'white-space', 'ellipsis']) {
      assert.equal(clean.includes(word), false, '出现了 ' + word + '（金额与日子不许截断）');
    }
  });

  it('**刻度位置由值算出来**：父级 `relative` ＋ 每枚 `absolute ＋ bottom`（行内 `top` 恒零枚）', () => {
    const ticksRule = ruleOf(clean, '.' + spreadDistSlot('yticks'));
    assert.ok(/position:\s*relative/.test(ticksRule), '刻度列必须是定位锚点（position: relative）：' + ticksRule);
    assert.equal(/space-between/.test(ticksRule), false,
      '刻度列不许靠 space-between 就位（行内 top 会被 static 忽略）：' + ticksRule);
    const tickRule = ruleOf(clean, '.' + spreadDistSlot('ytick'));
    assert.ok(/position:\s*absolute/.test(tickRule), '每枚刻度必须绝对定位（position: absolute）：' + tickRule);
    assert.ok(/transform:\s*translateY\(50%\)/.test(tickRule), '每枚刻度把中心对到值位置：' + tickRule);
    /* 隐形撑子：各枚绝对定位后列里没有在流内容，列宽由它撑住（同字同限，不上屏）。 */
    const sizerRule = ruleOf(clean, '.' + spreadDistSlot('yticks-sizer'));
    assert.ok(/visibility:\s*hidden/.test(sizerRule), '撑子不上屏：' + sizerRule);
    assert.ok(/max-width:\s*7em/.test(sizerRule), '撑子与刻度同限（7em）：' + sizerRule);
    for (const input of [RANGE_INPUT, ODD_INPUT, FLAT_INPUT, HUGE_INPUT]) {
      const h = renderSpreadDist(input);
      assert.equal(countOf(h, 'style="top: '), 0, '刻度行内不许再写 top（static 下被浏览器忽略）：'
        + (h.match(/style="top: [^"]*/) || [''])[0]);
      const found = yticksOf(h);
      assert.ok(found.length >= 3, '行内 bottom 解析不到（判据会空转）');
      /* 撑子逐行一份：每一枚刻度的文字在撑子里都有一行（列宽与在流时一致）。 */
      const sizer = h.match(new RegExp('class="' + spreadDistSlot('yticks-sizer') + '">(.*?)<\\/span>'));
      assert.ok(sizer !== null, '缺隐形撑子（列宽会塌成 0）');
      for (const t of found) assert.ok(sizer[1].includes(t.text), '撑子里缺刻度「' + t.text + '」那一行');
    }
  });

  it('尺寸事实写在一处：柱区两档高度取常量，宽窄由容器查询切换，刻度列**跟着柱区走**', () => {
    assert.ok(clean.includes('height: ' + String(SPREAD_DIST_DAYS_PX) + 'px'));
    assert.ok(clean.includes('height: ' + String(SPREAD_DIST_NARROW_DAYS_PX) + 'px'));
    /* 刻度列与柱区**同高**是几何契约的一半：两档各自取同一个常量（窄档实测过 22px 的错位）。 */
    const ticks = ruleOf(clean, '.' + spreadDistSlot('yticks'));
    assert.ok(ticks.includes('height: ' + String(SPREAD_DIST_DAYS_PX) + 'px'),
      '刻度列必须与柱区同高（不然刻度与柱子不是同一把尺）：' + ticks);
    /* 窄档按**选择器逐条读**：`@container` 块里 `.days` 与 `.yticks` 各自一条（子串级断言会被另一条的同字样顶包）。 */
    const narrow = clean.slice(clean.indexOf('@container'));
    const daysNarrow = ruleOf(narrow, '.' + spreadDistSlot('days'));
    assert.ok(daysNarrow.includes('height: ' + String(SPREAD_DIST_NARROW_DAYS_PX) + 'px'),
      '窄档柱区高度：' + daysNarrow);
    const ticksNarrow = ruleOf(narrow, '.' + spreadDistSlot('yticks'));
    assert.ok(ticksNarrow.includes('height: ' + String(SPREAD_DIST_NARROW_DAYS_PX) + 'px'),
      '窄档里刻度列也要跟着柱区矮一档：' + ticksNarrow);
    assert.equal(ticksNarrow.includes('height: ' + String(SPREAD_DIST_DAYS_PX) + 'px'), false,
      '窄档刻度列用了宽档高度（变异：128px 改回 150px 必须红）：' + ticksNarrow);
  });

  it('零键盘语汇、零可点元素（本件是纯静态图）', () => {
    const words = ['快捷键', '键位', '方向键', '键帽', '键盘', '按 Enter', 'Tab'];
    const html = [RANGE_INPUT, QUANTILE_INPUT].map((i) => renderSpreadDist(i)).join('') + css;
    for (const w of words) assert.equal(html.includes(w), false, '出现键盘语汇：' + w);
    const interactive = [RANGE_INPUT, QUANTILE_INPUT].map((i) => renderSpreadDist(i)).join('');
    for (const needle of ['<button', '<a ', 'tabindex', 'onclick', '<input', '<select']) {
      assert.equal(interactive.includes(needle), false, '本件不带可点元素：' + needle);
    }
  });

  it('`dist/components/spread-dist/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'spread-dist');
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

  it('槽位闭集与类名一致（判据不另抄一份字面量）；样式里声明了的裸槽助手真用到', () => {
    assert.equal(spreadDistSlot('day'), SPREAD_DIST_CLASS + '-day');
    assert.equal(spreadDistSlot('day', 'x-'), 'x-block-spread-dist-day');
    for (const slot of SPREAD_DIST_SLOTS) assert.ok(spreadDistSlot(slot).startsWith(SPREAD_DIST_CLASS + '-'));
    if (STYLE_SRC.includes('const c = (slot: SpreadDistSlot)')) {
      assert.ok((stripComments(STYLE_SRC).match(/(?:^|[^\w.])c\(/g) || []).length > 0,
        '声明了裸槽助手 c() 却一次没用（死代码，删掉它）');
    }
  });

  it('⑥ 分隔符门：本件生成的字里不出现 `·`／`；`／并列顿号（R1–R3 零命中）', () => {
    for (const [name, input] of [['range', RANGE_INPUT], ['odd', ODD_INPUT], ['flat', FLAT_INPUT],
      ['quantile', QUANTILE_INPUT]]) {
      const r = auditHtml(renderSpreadDist(input), name);
      assert.deepEqual(r.node.hits.map((h) => h.text), [], name + '：可见文本踩了分隔符门');
      assert.deepEqual(r.line.hits.map((h) => h.text), [], name + '：行级也踩了');
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('spread-dist ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(SPREAD_DIST_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderScaleBar({ value: 860, goal: 1850 });
    renderSpreadDist(RANGE_INPUT);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), before, '别件的产物逐字节不变');
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(spreadDistCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-spread-dist'), '前缀必须作用到类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });
});

/* ── ④ 四档几何（真机）＋ ⑤ 皮肤纪律 ───────────────────────────────── */

/** 四档**容器**宽度：320 是触屏最窄那一档，620 起过窄档阈值（`SPREAD_DIST_NARROW_PX`）。 */
const WIDTHS = [320, 390, 620, 1280];

/** 长口径与长单位：内容撑宽的两种压力。 */
const LONG_STAMP = '近 30 天（含 3 天补录、2 天跨月结转、1 天跨时区，口径见页脚）：补录那三天是按当日最后一笔算的';
const LONG_UNIT = '千卡路里（按每 100 克可食部折算，含烹调用油）';

/** 压力样例：两档常规 ＋ 全等值 ＋ 长口径 ＋ 长单位 ＋ 12 位金额。 */
function cases() {
  return [
    { name: 'range', html: renderSpreadDist(RANGE_INPUT) },
    { name: 'odd', html: renderSpreadDist(ODD_INPUT) },
    { name: 'flat', html: renderSpreadDist(FLAT_INPUT) },
    { name: 'quantile', html: renderSpreadDist(QUANTILE_INPUT) },
    { name: 'longstamp', html: renderSpreadDist({ ...RANGE_INPUT, stamp: LONG_STAMP }) },
    { name: 'longunit', html: renderSpreadDist({ ...RANGE_INPUT, unit: LONG_UNIT }) },
    { name: 'huge', html: renderSpreadDist(HUGE_INPUT) },
  ];
}

/** 真机起不来时的确定性几何判据（量不到"内容撑宽"，就断**形状上的那几条**）。 */
function assertStaticGeometry(css, html) {
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const wide = [...px(html), ...px(css)].filter((v) => v > WIDTHS[0]);
  assert.deepEqual(wide, [], '出现过不了最窄档（' + WIDTHS[0] + '）的固定宽度：' + wide.join('、'));
  const percents = [...html.matchAll(/style="(?:bottom|top): ([\d.]+)%/g)].map((m) => Number(m[1]));
  assert.ok(percents.length > 0, '柱子与刻度的坐标必须是百分比（判据会空转）');
  for (const v of percents) assert.ok(v >= 0 && v <= 100, '百分比越界：' + v);
  const clean = stripComments(css);
  for (const slot of ['stamp', 'tail', 'xlabel', 'stop-value']) {
    assert.ok(/min-width:\s*0/.test(ruleOf(clean, '.' + spreadDistSlot(slot))), slot + ' 少了 min-width: 0');
  }
}

describe('spread-dist ④⑤ 四档几何与皮肤纪律（真机 headless Chrome ＋ CDP）', () => {
  it('容器 320／390／620／1280：零横向溢出／首末刻度对到轴顶与轴底／窄档柱区矮一档／零截断', async (t) => {
    const css = spreadDistCss();
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n'),
      css: skinCss() + '\n' + css,
      height: 2400,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：'
        + '没有超过 ' + WIDTHS[0] + 'px 的固定宽度 ＋ 坐标是百分比 ＋ 长文本槽可收窄（min-width: 0）');
      assertStaticGeometry(css, casesHtml);
      return t.skip('本机无 Chrome／Chromium：四档几何判据需真浏览器');
    }
    try {
      const seen = [];
      /** 每一种「档 × 皮肤 × 样例」的溢出读数（每一格都进，不只 `range` 那一档）。 */
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
            const root = await page.read([scope + '.' + SPREAD_DIST_CLASS, scope + '.' + spreadDistSlot('hd'),
              scope + '.' + spreadDistSlot('plotbox')]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            for (const one of root) {
              assert.ok(one.maxScrollW <= one.maxClientW + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 横向溢出 '
                + one.maxScrollW + ' > ' + one.maxClientW);
              assert.equal(one.scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            }
            /* 金额／日子／状态**不被截断**（压字与省略号都不是本件的做法）；本形态没有的槽不要求出现。 */
            const slots = ['ytick', 'xlabel', 'stop-value', 'stamp', 'tail', 'lead']
              .filter((slot) => new RegExp('class="' + spreadDistSlot(slot) + '[ "]').test(c.html));
            const texts = await page.read(slots.map((slot) => scope + '.' + spreadDistSlot(slot)));
            for (const one of texts) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel
                + ' 有 ' + one.clipped + ' 处被截断');
              assert.ok(one.visible > 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 不见了');
            }
            over.push({ width, skin, name: c.name, scrollW: root[0].maxScrollW, clientW: root[0].maxClientW });
            if (c.name !== 'range') continue;
            /* **刻度与柱子同一把尺**（真机读数）：**每一枚**刻度的**中心**必须落在它那个值的位置上
               （旧判据只量首末——首末被 space-between 结构性钉死恒 0px，位移最大的中间枚从没被量过）。 */
            const box = await page.ev('(function(){var root=document.querySelector('
              + JSON.stringify(scope + '.' + SPREAD_DIST_CLASS) + ');'
              + 'var box=root.querySelector(' + JSON.stringify('.' + spreadDistSlot('days')) + ');'
              + 'var ticks=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + spreadDistSlot('ytick')) + '));'
              + 'var b=box.getBoundingClientRect();var cols=[].slice.call(box.querySelectorAll('
              + JSON.stringify('.' + spreadDistSlot('day')) + '));'
              + 'var cw=cols.length===0?0:Math.round(cols[0].getBoundingClientRect().width*10)/10;'
              + 'var pos=ticks.map(function(el){var r=el.getBoundingClientRect();'
              + 'var pct=parseFloat((el.style.bottom||"").replace("%",""));'
              + 'var expect=b.bottom-pct/100*b.height-r.height/2;'
              + 'return {pct:pct,delta:Math.round((r.top-expect)*10)/10,h:Math.round(r.height*10)/10};});'
              + 'var first=ticks[0].getBoundingClientRect();var last=ticks[ticks.length-1].getBoundingClientRect();'
              + 'return {n:ticks.length,daysH:Math.round(b.height),colW:cw,pos:pos,'
              + 'top:Math.round((first.top+first.height/2-b.top)*10)/10,'
              + 'bottom:Math.round((last.top+last.height/2-b.bottom)*10)/10};}())');
            assert.ok(box.n >= 3, width + ' 档 ' + skin + '：刻度枚数不对');
            assert.ok(Math.abs(box.top) <= 1.5, width + ' 档 ' + skin
              + '：轴顶刻度没落在柱区上沿（差 ' + box.top + 'px）');
            assert.ok(Math.abs(box.bottom) <= 1.5, width + ' 档 ' + skin
              + '：轴底刻度没落在柱区下沿（差 ' + box.bottom + 'px）');
            for (const p of box.pos) {
              assert.ok(Number.isFinite(p.pct) && p.pct >= 0 && p.pct <= 100,
                width + ' 档 ' + skin + '：刻度行内 bottom 不是百分比（' + JSON.stringify(p) + '）');
              assert.ok(Math.abs(p.delta) <= 1.5, width + ' 档 ' + skin
                + '：bottom=' + p.pct + '% 那枚刻度中心偏了 ' + p.delta + 'px（高 ' + p.h + 'px）');
            }
            seen.push({ width, skin, name: c.name, daysH: box.daysH, colW: box.colW,
              tickTop: box.top, tickBottom: box.bottom });
          }
        }
      }
      /* **窄档是容器驱动的**（视口没变，只改了夹具容器宽度）：320／390 矮一档，620／1280 高一档。 */
      for (const w of WIDTHS) {
        const hs = seen.filter((s) => s.width === w && s.name === 'range').map((s) => s.daysH);
        const want = w < SPREAD_DIST_NARROW_PX ? SPREAD_DIST_NARROW_DAYS_PX : SPREAD_DIST_DAYS_PX;
        assert.equal(hs.every((h) => h === want), true,
          w + ' 档柱区高度应为 ' + want + '：' + JSON.stringify(hs));
      }
      /* ⑤ 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const c of cases()) {
        for (const width of WIDTHS) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
            + 'for (var i = 0; i < skins.length; i += 1) {'
            + '  var el = document.querySelector("." + "ilife-skin-" + skins[i]'
            + ' + " [data-case=' + c.name + '] .' + SPREAD_DIST_CLASS + '");'
            + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
            + '} return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
          }
        }
      }
      /* 有文字的中位档：四套皮肤里都取到了取值表里的软底与字色。 */
      for (const skin of SKIN_NAMES) {
        const vals = SKIN_VALUES[skin];
        const colors = await page.ev('(function(){var cell=document.querySelector('
          + JSON.stringify('.' + skinClass(skin) + ' [data-case=quantile] .' + spreadDistSlot('stop') + '.is-median') + ');'
          + 'var val = cell === null ? null : cell.querySelector('
          + JSON.stringify('.' + spreadDistSlot('stop-value')) + ');'
          + 'return {bg: cell === null ? null : getComputedStyle(cell).backgroundColor,'
          + 'fg: val === null ? null : getComputedStyle(val).color};}())');
        assert.equal(colors.bg, toRgb(vals['accent-soft']), skin + '：正中那一档的底取 accent-soft');
        assert.equal(colors.fg, toRgb(vals['accent-text']), skin + '：正中那一档的字取 accent-text');
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of WIDTHS) {
        const rows = seen.filter((s) => s.width === w);
        const cells = over.filter((s) => s.width === w);
        const range = rows.filter((s) => s.name === 'range');
        console.log('READING spread-dist container=' + w
          + ' daysH=' + range[0].daysH + ' colW=' + range[0].colW
          + ' tickTopDelta=' + range[0].tickTop + ' tickBottomDelta=' + range[0].tickBottom
          + ' maxRootScrollW=' + Math.max(...cells.map((s) => s.scrollW))
          + ' maxRootClientW=' + Math.max(...cells.map((s) => s.clientW))
          + ' cells=' + cells.length);
      }
    } finally { page.close(); }
  });
});
