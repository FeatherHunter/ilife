/** portion-gauge（量感条 · 换算三栏）· 契约测试。
 *
 * 覆盖六组判据：
 *  ① **渲染契约**：骨架与行数／**换算链三栏同一份真值**（从**印出来的占比句**反推百分比，
 *     再把每一条的宽度逐点对账；克数串与菜谱串两处同引；小数占比与 0／100 两档边界也在里面）／
 *     缺换算那一支／指数写法的数不被打散（`1e+21`／`1e-7` 与缺换算计数同走一把分组）／
 *     转义面／**全部**非法入参分支（每个都断 `BlocksError`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且**只出现一次**、
 *     零 `:root`／`!important`／零新 token／零 `@media` 宽度查询／零手写色值／零把 `ink` 系当面／
 *     零可点元素／**窄档阈值只有一处来源**；
 *  ③ **加法式**：本件只读自己的类名；不启用它的页面零命中、逐字节不变；
 *  ④ **四档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 320／390／620／1280 下零横向溢出
 *     （含长口径／长单位／满 8 行三种压力样例）、**每一条**的宽度与占比句的百分比逐点对上
 *     （差 ≤2 个百分点）、窄档换算框改走单列（`@container` 真在生效）、数值零截断；
 *  ④b **宽档长占比句（真机）**：容器 481／620／1280 × 占比项名 32／64／128 字——占比条恒有宽
 *     （≥ `PORTION_GAUGE_BAR_MIN_PX`）且填充与那句占比同源（旧写法下真机读数 `"0px 473px"`、条 0 宽）；
 *  ⑤ **皮肤纪律**：同一份入参渲染四次逐字节相同、标记不带皮肤类、真机上四套皮肤里的 `innerHTML`
 *     逐字节相同、缺换算那一行真取到取值表里的提醒底与提醒字；
 *  ⑥ **分隔符门**（`test/separator-probe.mjs` 的 R1–R3）：本件生成的字里不出现 `·`／`；`／并列顿号。
 *
 * 期望值一律从组件自己的常量派生（`PORTION_GAUGE_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PORTION_GAUGE_BAR_MIN_PX,
  PORTION_GAUGE_CLASS,
  PORTION_GAUGE_FORMS,
  PORTION_GAUGE_MAX_ROWS,
  PORTION_GAUGE_MIN_ROWS,
  PORTION_GAUGE_NARROW_PX,
  PORTION_GAUGE_RAIL_PX,
  PORTION_GAUGE_SLOTS,
  portionGaugeCss,
  portionGaugeSlot,
  renderPortionGauge,
} from '../dist/components/portion-gauge/index.js';
import { renderSpreadDist } from '../dist/components/spread-dist/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKINS, skinCss, skinClass } from '../dist/components/skin/index.js';
import { SKIN_NAMES } from '../dist/components/skin/contract.js';
import { auditHtml } from './separator-probe.mjs';
import { styleSource } from './_style-sources.mjs';
import { startShapesPage } from './shapes-probe.mjs';
import * as root from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
/** 本件的样式源码：**经 `_style-sources.mjs` 取该件全部 `style*.ts`**（一件的样式段不许按单文件读——
 *  按规矩拆出去的那半会被放盲区）。本件今天只有一份 `style.ts`，读法照规矩走。 */
const STYLE_SRC = styleSource('portion-gauge');

/** 四套皮肤的取值表（期望色**从表里读**，判据里不抄色字面量）。 */
const SKIN_VALUES = Object.fromEntries(SKIN_NAMES.map((s) => [s, SKINS[s].values]));

/** 取值表里的 `#rrggbb` → 浏览器 `getComputedStyle` 报出来的 `rgb(r, g, b)` 串。 */
const toRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return 'rgb(' + [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(', ') + ')';
};

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把「解释」当「规则」）。 */
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

/* ── 样例（原型 B 档那三行；数字都用得上：两处同引的克数、两处同引的菜谱串、同源的占比） ─── */

const STANDARD_INPUT = {
  title: '份量换算', stamp: '菜谱 → 营养库', tail: '1 份 ＝ 350 g',
  rows: [
    { name: '红烧肉', kind: '主料', recipe: '2 份', grams: 700, shareOf: '蛋白', sharePct: 70 },
    { name: '米饭', kind: '主食', recipe: '2 碗', grams: 300, basis: '1 碗 ＝ 150 g', toLabel: '生重', shareOf: '碳水', sharePct: 46 },
    { name: '青菜', kind: '配菜', recipe: '1 把', grams: 250, basis: '1 把 ＝ 250 g', shareOf: '纤维', sharePct: 21 },
  ],
};
/** 一行也成立（最少行数那一档）。 */
const SINGLE_INPUT = {
  title: '份量换算',
  rows: [{ name: '红烧肉', recipe: '2 份', grams: 700, shareOf: '蛋白', sharePct: 70 }],
};
/** 满 8 行（行数上限那一档，窄容器里最高的那一页）。 */
const FULL_INPUT = {
  title: '份量换算', stamp: '菜谱 → 营养库',
  rows: [
    { name: '红烧肉', kind: '主料', recipe: '2 份', grams: 700, shareOf: '蛋白', sharePct: 70 },
    { name: '米饭', kind: '主食', recipe: '2 碗', grams: 300, shareOf: '碳水', sharePct: 46 },
    { name: '青菜', kind: '配菜', recipe: '1 把', grams: 250, shareOf: '纤维', sharePct: 21 },
    { name: '鸡蛋', recipe: '1 个', grams: 60, shareOf: '蛋白', sharePct: 12 },
    { name: '牛奶', recipe: '1 杯', grams: 250, shareOf: '钙', sharePct: 30 },
    { name: '苹果', recipe: '半个', grams: 120, shareOf: '维生素', sharePct: 8 },
    { name: '花生', recipe: '一小把', grams: 30, shareOf: '脂肪', sharePct: 15 },
    { name: '酸奶', recipe: '1 盒', grams: 135, shareOf: '钙', sharePct: 18 },
  ],
  missingCount: 1,
};
/** 小数占比与 0／100 两档边界（同一份真值取一位小数，两处同引）。 */
const EDGE_INPUT = {
  title: '份量换算',
  rows: [
    { name: '米饭', recipe: '2 碗', grams: 300, shareOf: '碳水', sharePct: 46.55 },
    { name: '青菜', recipe: '1 把', grams: 250, shareOf: '纤维', sharePct: 0 },
    { name: '红烧肉', recipe: '2 份', grams: 700, shareOf: '蛋白', sharePct: 100 },
  ],
};
/** 大克数：千分位分组最长的那一档。 */
const HUGE_INPUT = {
  title: '份量换算',
  rows: [{ name: '年夜饭', recipe: '10 份', grams: 1234567890, shareOf: '蛋白', sharePct: 100 }],
};
/** 长口径与长单位：内容撑宽的两种压力。 */
const LONG_INPUT = {
  title: '份量换算',
  stamp: '近 30 天菜谱合订本（含 3 版修订，2 版改过系数，口径见页脚）：修订那两版是按当日最后一版算的',
  tail: '1 份 ＝ 350 g（按每 100 克可食部折算，含烹调用油）',
  rows: [
    {
      name: '红烧肉红烧肉红烧肉红烧肉红烧肉', kind: '主料主料主料', recipe: '12 份家庭装大锅',
      grams: 4200, basis: '1 份 ＝ 350 g（按可食部折算）', toLabel: '营养库口径',
      shareOf: '膳食纤维蛋白质', sharePct: 100,
    },
    { name: '米饭', recipe: '2 碗', grams: 300, shareOf: '碳水', sharePct: 0 },
    { name: '青菜', kind: '配菜', recipe: '1 把', grams: 250, shareOf: '纤维', sharePct: 21 },
  ],
  note: '这是一句很长的口径，要在窄容器里换行：左边永远是菜谱写的单位，右边永远是营养库认的单位，'
    + '中间是这一份菜的换算系数，系数变了要写明是哪一版菜谱改的，不悄悄改数。',
  missingCount: 12,
};

/** 行头那句合计（`same` 槽的文字，逐行）。 */
const samesOf = (html) => [...html.matchAll(
  new RegExp('class="' + portionGaugeSlot('same') + '">([^<]*)<', 'g'))].map((m) => m[1]);
/** 换算两栏的数（逐行先左后右：偶数下标＝菜谱栏，奇数下标＝营养库栏）。 */
const sideValuesOf = (html) => [...html.matchAll(
  new RegExp('class="' + portionGaugeSlot('side-value') + '">([^<]*)<', 'g'))].map((m) => m[1]);
/** 出处那句（`sub` 槽的文字，逐行）。 */
const subsOf = (html) => [...html.matchAll(
  new RegExp('class="' + portionGaugeSlot('sub') + '">([^<]*)<', 'g'))].map((m) => m[1]);
/** 占比那句（`share` 槽的文字，逐行）。 */
const sharesOf = (html) => [...html.matchAll(
  new RegExp('class="' + portionGaugeSlot('share') + '">([^<]*)<', 'g'))].map((m) => m[1]);
/** 占比条的宽度（`fill` 的行内 `width`，逐行）。 */
const fillsOf = (html) => [...html.matchAll(
  new RegExp('class="' + portionGaugeSlot('fill') + '" style="width: ([\\d.]+)%"', 'g'))]
  .map((m) => Number(m[1]));

/* ── A 档（形态 `gauge` 量感条）的样例：数字都用得上 ──────────────────
   大字那个数、已用那一段的行内宽、无障碍名里那个数 —— 三处读的是**同一个** `usedPct`。 */

/** 原型的 A 档那一份（砍过字的那一版）：可见字 72 个的量级。 */
const GAUGE_INPUT = {
  title: '这一餐的量', form: 'gauge', tail: '≈ 350 g',
  gauge: {
    name: '红烧肉', usedPct: 58, capText: '2 份', refText: '1.2 份', refPct: 60,
    equiv: '≈ 1 个拳头 ＋ 2 汤勺',
  },
};
/** 只有上限那一枚（建议与它落的位置都不给＝那两处整块不出）。 */
const GAUGE_CAP_ONLY = {
  title: '这一餐的量', form: 'gauge', tail: '≈ 350 g',
  gauge: { name: '红烧肉', usedPct: 58, capText: '2 份' },
};
/** 长串压力：名字、上限、建议、换算句都写到最长（内容撑宽那一类）。 */
const GAUGE_LONG = {
  title: '这一餐的量这一餐的量这一餐的量', form: 'gauge',
  tail: '≈ 350 g（按可食部折算，含烹调用油）',
  gauge: {
    name: '红烧肉红烧肉红烧肉红烧肉红烧肉红烧肉',
    usedPct: 88.5,
    capText: '2 份家庭装（一天上限按营养库口径折算）',
    refText: '1.2 份（一餐建议按三顿均分折算）',
    refPct: 12.5,
    equiv: '≈ 1 个拳头 ＋ 2 汤勺（按家常器物折算，误差约一成）',
  },
};
/** 两档边界：已用 0（一条空尺子）／建议顶在尺子右端（与上限那枚重合的位置也要排得下）。 */
const GAUGE_EDGE = {
  title: '这一餐的量', form: 'gauge',
  gauge: { name: '红烧肉', usedPct: 0, capText: '1 份', refText: '0.5 份', refPct: 100 },
};
/** 满档：已用 100 且建议落在正中那一档（内距为空串——居中到正中不需要偏移）。 */
const GAUGE_FULL = {
  title: '这一餐的量', form: 'gauge',
  gauge: { name: '红烧肉', usedPct: 100, capText: '2 份', refText: '1 份', refPct: 50 },
};
/** A 档样例一览（名字 → 入参）：判据与真机几何共用一份。 */
const GAUGE_SAMPLES = [
  ['常规', GAUGE_INPUT], ['只有上限', GAUGE_CAP_ONLY], ['长串', GAUGE_LONG],
  ['边界 0', GAUGE_EDGE], ['满档 100', GAUGE_FULL],
];

/** **可见文本**：剥标签 ＋ 解实体 ＋ 去掉空白（「可见字几个」那条读它；无障碍名与行内样式天然不在里面）。 */
function visibleText(html) {
  return html.replace(/<[^>]*>/g, '\u0000')
    .replace(/\u0000+/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, '');
}

/** 一个串在可见文本里出现几次（「同一个数只印一次」那条读它）。 */
const timesInText = (html, needle) => visibleText(html).split(needle).length - 1;

/** 「条宽恒由占比算出」的**读数**：大字那句／已用那一段的行内宽／无障碍名里那个数。 */
function gaugeBarReadings(html) {
  const said = new RegExp('class="' + portionGaugeSlot('lead-value') + '">([^<]*)<').exec(html);
  const used = new RegExp('class="' + portionGaugeSlot('used')
    + '" aria-hidden="true" style="width: ([\\d.]+)%"').exec(html);
  const aria = new RegExp('class="' + portionGaugeSlot('rail')
    + '" role="img" aria-label="([^"]*)"').exec(html);
  if (said === null || used === null || aria === null) return null;
  return {
    said: parseFloat(said[1]),
    width: Number(used[1]),
    inAria: parseFloat((aria[1].match(/的([\d.]+)%/) || [])[1]),
  };
}

/** A 档那条头号几何契约：**三处同一个数**（大字、条宽、无障碍名）——判据与变异自证共用这一条。 */
function gaugeBarOk(html) {
  const r = gaugeBarReadings(html);
  return r !== null && r.said === r.width && r.width === r.inAria;
}

/** 砍字那一条的读数：可见字 ≤ 72 ＋ 不含「占一天上限」那句 ＋ 那个数只印一次。 */
function gaugeLeanOk(html, pctText) {
  const text = visibleText(html);
  return text.length <= 72 && !text.includes('占一天上限') && timesInText(html, pctText) === 1;
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('portion-gauge ① 渲染契约 · 形态 convert 换算三栏', () => {
  const html = renderPortionGauge(STANDARD_INPUT);

  it('骨架：卡头 → 一行一样（头 ＋ 换算 ＋ 占比）→ 脚注；缺换算另起一行', () => {
    assert.match(html, new RegExp('^<div class="' + PORTION_GAUGE_CLASS + ' is-convert">'));
    assert.equal(countOf(html, 'class="[^"]*-row"'), 3, '一行一样');
    assert.equal(countOf(html, 'class="[^"]*-side-value"'), 6, '一行两栏各一个数');
    assert.equal(countOf(html, 'class="[^"]*-fill"'), 3, '一行一条');
    assert.match(html, /<h4 class="ilife-block-portion-gauge-title">份量换算<\/h4>/, '卡头标题是 h4');
    assert.match(html, /-stamp">菜谱 → 营养库</, '口径那枚');
    assert.match(html, /-tail">1 份 ＝ 350 g</, '换算基准');
    assert.match(html, /-arrow" aria-hidden="true">→</, '方向标是装饰位，必须 aria-hidden');
    assert.match(html, /-note">口径：左边永远是/, '不给 note 就用本件的口径句');
    assert.equal(html.includes(portionGaugeSlot('missing')), false, '没有缺换算就不出那一行');
    assert.ok(!/<script/i.test(html), '不产脚本');
    for (const slot of ['hd', 'title', 'conv', 'row', 'head', 'eq', 'obj', 'note']) {
      assert.ok(html.includes(portionGaugeSlot(slot)), '缺槽：' + slot);
    }
  });

  it('**换算链三栏同一份真值**：克数串两处同引、菜谱串两处同引、占比字与条宽同源', () => {
    for (const [name, input] of [['常规三行', STANDARD_INPUT], ['一行', SINGLE_INPUT],
      ['满八行', FULL_INPUT], ['边界占比', EDGE_INPUT], ['大克数', HUGE_INPUT]]) {
      const h = renderPortionGauge(input);
      const sames = samesOf(h);
      const sides = sideValuesOf(h);
      const subs = subsOf(h);
      const shares = sharesOf(h);
      const fills = fillsOf(h);
      assert.equal(sames.length, input.rows.length, name + '：行头合计行数不对');
      assert.equal(sides.length, input.rows.length * 2, name + '：换算栏数不对');
      assert.equal(shares.length, input.rows.length, name + '：占比句数不对');
      assert.equal(fills.length, input.rows.length, name + '：占比条数不对');
      input.rows.forEach((row, i) => {
        /* 克数串：行头那句合计与右栏那个数是同一个串（判据不另拼一份期望串）。 */
        assert.equal(sides[i * 2 + 1], sames[i], name + ' 第 ' + (i + 1) + ' 行：右栏与行头走散');
        /* 菜谱串：出处句里有它，左栏就是它。 */
        assert.equal(sides[i * 2], row.recipe, name + ' 第 ' + (i + 1) + ' 行：左栏不是菜谱写的那一句');
        assert.ok(subs[i].includes(row.recipe), name + ' 第 ' + (i + 1) + ' 行：出处句里没有菜谱写法');
        /* 占比：那句的字与条的宽度是同一个数（一位小数）。 */
        const pct = Math.round(row.sharePct * 10) / 10;
        assert.equal(fills[i], pct, name + ' 第 ' + (i + 1) + ' 行：条宽不是占比本身');
        assert.equal(shares[i], '占一天' + row.shareOf + ' ' + String(pct) + '%',
          name + ' 第 ' + (i + 1) + ' 行：占比句与条宽走散');
      });
    }
  });

  it('右栏口径名与系数句分开给：缺省 `营养库口径`，给了系数就缀在后面', () => {
    const labels = [...html.matchAll(
      new RegExp('class="' + portionGaugeSlot('side-label') + '">([^<]*)<', 'g'))].map((m) => m[1]);
    assert.deepEqual(labels, ['菜谱单位', '营养库口径', '菜谱单位', '生重（1 碗 ＝ 150 g）',
      '菜谱单位', '营养库口径（1 把 ＝ 250 g）']);
    assert.match(renderPortionGauge(SINGLE_INPUT),
      new RegExp('-sub">菜谱写「2 份」<'), '不给分档＝出处那句只有菜谱写法');
    assert.match(html, new RegExp('-sub">主料，菜谱写「2 份」<'), '给了分档＝分档在前');
  });

  it('大克数分组、小数占比、四位缺数：写法各就各位', () => {
    assert.match(renderPortionGauge(HUGE_INPUT), /-same">1,234,567,890 g</);
    const edgeShares = sharesOf(renderPortionGauge(EDGE_INPUT));
    assert.deepEqual(edgeShares, ['占一天碳水 46.6%', '占一天纤维 0%', '占一天蛋白 100%']);
    assert.match(renderPortionGauge(LONG_INPUT), /-missing">还差 12 样没有换算</);
    assert.match(renderPortionGauge({ ...STANDARD_INPUT, missingCount: 2 }),
      /-missing">还差 2 样没有换算</);
  });

  it('**指数写法的数不许被三位分组切开**（`1e,+21` 那种），缺换算的计数同走一把分组', () => {
    const huge = renderPortionGauge({
      title: '份量换算',
      rows: [
        { name: '年夜饭', recipe: '10 份', grams: 1e21, shareOf: '蛋白', sharePct: 100 },
        { name: '味精', recipe: '一撮', grams: 1e-7, shareOf: '钠', sharePct: 0 },
      ],
      missingCount: 1234567,
    });
    assert.equal(/e,/.test(huge), false, '指数写法里不许插进逗号：'
      + (huge.match(/[^>]*e,[^<]*/) || [''])[0]);
    assert.equal(/,\+/.test(huge), false);
    assert.ok(huge.includes('e+21 g'), '量级大到只给指数时原样写：' + (huge.match(/[^>]*e[+-]?\d+[^<]*/) || [''])[0]);
    assert.ok(huge.includes('e-7 g'), '量级小到只给指数时原样写');
    assert.match(huge, /-missing">还差 1,234,567 样没有换算</, '缺换算的计数与克数走同一把分组');
    /* 非有限值一律 `badInput`（写不出数的东西不上屏；缺换算计数同办）。 */
    for (const [what, row] of [['grams=Infinity', { ...SINGLE_INPUT.rows[0], grams: Infinity }],
      ['grams=-Infinity', { ...SINGLE_INPUT.rows[0], grams: -Infinity }],
      ['grams=NaN', { ...SINGLE_INPUT.rows[0], grams: NaN }],
      ['sharePct=Infinity', { ...SINGLE_INPUT.rows[0], sharePct: Infinity }]]) {
      assert.equal(throwsBlocks(() => renderPortionGauge({ ...SINGLE_INPUT, rows: [row] })), true,
        '非有限值必须拒：' + what);
    }
    for (const bad of [Infinity, -Infinity, NaN]) {
      assert.equal(throwsBlocks(() => renderPortionGauge({ ...SINGLE_INPUT, missingCount: bad })), true,
        '缺换算计数非有限值必须拒：' + String(bad));
    }
    /* 边界自证：`1e21`／`1e-7` 是合法输入，不许误杀（值一样就一样大，不按量级分档）。 */
    assert.ok(renderPortionGauge({
      title: '份量换算', rows: [{ name: 'x', recipe: '1 份', grams: 1e21, shareOf: '蛋白', sharePct: 30 }],
    }).length > 0, '1e21 应正常渲染');
  });

  it('缺槽就不出那一槽（不留空位、不拿占位符顶替）', () => {
    const bare = renderPortionGauge(SINGLE_INPUT);
    assert.equal(bare.includes(portionGaugeSlot('stamp')), false, '不给口径＝不出那一枚');
    assert.equal(bare.includes(portionGaugeSlot('tail')), false);
    assert.equal(bare.includes(portionGaugeSlot('missing')), false);
    assert.match(bare, /-sub">菜谱写「2 份」</, '出处那句不拖小尾巴');
  });

  it('标记里**不写分隔符**、不写省略号：栏与栏之间不许出现文字', () => {
    const both = html + renderPortionGauge(LONG_INPUT);
    for (const bad of ['·', '；', '｜', '、', '~', '…']) {
      assert.equal(both.includes(bad), false, '标记里出现了分隔符或省略号：' + bad);
    }
    assert.equal(/<\/span>[^<]+<span/.test(both), false, '栏与栏之间不许出现文字');
    assert.equal(/<\/b>[^<]+<span/.test(both), false, '名与数之间不许出现文字');
  });

  it('转义：五个字符进实体，不进标记（标题／食材名／出处／口径逐位转义）', () => {
    const evil = '"><script>alert(1)</script>';
    const out = renderPortionGauge({
      title: evil, stamp: evil, tail: evil, note: evil,
      rows: [{ name: evil, kind: evil, recipe: evil, grams: 700, shareOf: evil, sharePct: 70 }],
    });
    assert.equal(/<script/i.test(out), false, '不得出现可执行脚本标签');
    assert.equal(/\son[a-z]+=/i.test(out), false, '不得出现内联事件处理器');
    assert.ok(out.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(out.includes('&quot;'), '引号转义');
  });

  it('形态键是闭集：闭集外一律 BlocksError（格号 `B` 不是键，不静默降级）', () => {
    assert.deepEqual([...PORTION_GAUGE_FORMS], ['convert', 'gauge'], '两档英文键；`convert` 在最前＝缺省');
    assert.match(renderPortionGauge({ ...SINGLE_INPUT, form: 'convert' }), /is-convert/);
    assert.match(renderPortionGauge(SINGLE_INPUT), /is-convert/, '缺省就是换算三栏');
    for (const bad of ['B', 'A', 'convert2', 'bar', '']) {
      assert.equal(throwsBlocks(() => renderPortionGauge({ ...SINGLE_INPUT, form: bad })), true,
        '拒：' + bad);
    }
  });

  it('附加类名：合法照收、非法一律拒（防注入任意选择器）', () => {
    assert.match(renderPortionGauge({ ...SINGLE_INPUT, extraClass: 'ok-1 other' }), /is-convert ok-1 other"/);
    for (const bad of ['a"b', 'x{y}', '.x', 'a b!']) {
      assert.equal(throwsBlocks(() => renderPortionGauge({ ...SINGLE_INPUT, extraClass: bad })), true,
        '拒：' + bad);
    }
  });

  it('非法入参**逐条**走 BlocksError（不静默降级、不「尽量猜」）', () => {
    const ok = SINGLE_INPUT;
    const row = SINGLE_INPUT.rows[0];
    /* 入参本体 */
    assert.equal(throwsBlocks(() => renderPortionGauge(undefined)), true);
    assert.equal(throwsBlocks(() => renderPortionGauge(null)), true);
    assert.equal(throwsBlocks(() => renderPortionGauge([])), true);
    assert.equal(throwsBlocks(() => renderPortionGauge('x')), true);
    /* 标题 */
    assert.equal(throwsBlocks(() => renderPortionGauge({ rows: ok.rows })), true, 'title 必填');
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, title: '' })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, title: '   ' })), true, '全空白不算');
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, title: 1 })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, stamp: 1 })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, tail: 1 })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, note: 1 })), true);
    /* 行数 */
    assert.equal(throwsBlocks(() => renderPortionGauge({ title: 't' })), true, 'rows 必填');
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [] })), true, '空数组不是一行');
    assert.equal(throwsBlocks(() => renderPortionGauge({
      ...ok, rows: new Array(PORTION_GAUGE_MAX_ROWS + 1).fill(row),
    })), true, '超过 ' + PORTION_GAUGE_MAX_ROWS + ' 行');
    /* 一行里的每一格 */
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, name: '' }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, name: '  ' }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, recipe: '' }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, grams: 0 }] })), true,
      '0 克不是一行菜的量');
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, grams: -5 }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, grams: '700' }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, grams: NaN }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, shareOf: '' }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, sharePct: -1 }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, sharePct: 101 }] })), true,
      '越界的占比会顶出轨道');
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, sharePct: '70' }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, sharePct: NaN }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, kind: 1 }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, basis: 1 }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ ...row, toLabel: 1 }] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [null] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, rows: [{ name: 'x' }] })), true, '缺格');
    /* 缺换算计数 */
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, missingCount: -1 })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, missingCount: 1.5 })), true, '须是整数');
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, missingCount: '2' })), true);
    /* 空串按「未给」处理，不算错 */
    assert.equal(renderPortionGauge({ ...ok, stamp: '' }).includes('-stamp'), false);
    assert.equal(renderPortionGauge({ ...ok, note: '' }).includes('口径：左边永远是'), true,
      '空口径＝用本件的口径句');
  });

  it('纯函数：同入参两次逐字节相同（页面产物可缓存、可对账）', () => {
    assert.equal(renderPortionGauge(STANDARD_INPUT), renderPortionGauge(STANDARD_INPUT));
    assert.notEqual(renderPortionGauge(STANDARD_INPUT), renderPortionGauge(LONG_INPUT));
  });
});

/* ── ①旧档：`convert` 逐字节不变（A 档是加法，一个字都不许动） ───────────── */

/** **补 A 档之前的 `convert` 原产物**（2026-09-26 从当时的 `dist` 抄下来，逐字节）。
 *  这条判据的用途：本件这一轮是**加一档**，先落地那一档的产物必须一个字节都不动
 *  （动了一个字节 ⇒ 六个技能既有页面产物跟着变）。变异自证：改 `model.ts` 里任何一句拼串，
 *  或者让 `render.ts` 的 `headHtml` 在 `convert` 形态下多吐一个节点，这条当场红。 */
const CONVERT_GOLDEN = [
  '<div class="ilife-block-portion-gauge is-convert">',
  '<div class="ilife-block-portion-gauge-hd"><h4 class="ilife-block-portion-gauge-title">份量换算</h4>',
  '<span class="ilife-block-portion-gauge-stamp">菜谱 → 营养库</span>',
  '<span class="ilife-block-portion-gauge-tail">1 份 ＝ 350 g</span></div>',
  '<div class="ilife-block-portion-gauge-conv">',
  '<div class="ilife-block-portion-gauge-row"><span class="ilife-block-portion-gauge-head">',
  '<b class="ilife-block-portion-gauge-name">红烧肉</b>',
  '<span class="ilife-block-portion-gauge-sub">主料，菜谱写「2 份」</span>',
  '<span class="ilife-block-portion-gauge-same">700 g</span></span>',
  '<span class="ilife-block-portion-gauge-eq"><span class="ilife-block-portion-gauge-side">',
  '<b class="ilife-block-portion-gauge-side-value">2 份</b>',
  '<em class="ilife-block-portion-gauge-side-label">菜谱单位</em></span>',
  '<span class="ilife-block-portion-gauge-arrow" aria-hidden="true">→</span>',
  '<span class="ilife-block-portion-gauge-side is-to">',
  '<b class="ilife-block-portion-gauge-side-value">700 g</b>',
  '<em class="ilife-block-portion-gauge-side-label">营养库口径</em></span></span>',
  '<span class="ilife-block-portion-gauge-obj"><span class="ilife-block-portion-gauge-bar" aria-hidden="true">',
  '<i class="ilife-block-portion-gauge-fill" style="width: 70%"></i></span>',
  '<span class="ilife-block-portion-gauge-share">占一天蛋白 70%</span></span></div>',
  '<div class="ilife-block-portion-gauge-row"><span class="ilife-block-portion-gauge-head">',
  '<b class="ilife-block-portion-gauge-name">米饭</b>',
  '<span class="ilife-block-portion-gauge-sub">主食，菜谱写「2 碗」</span>',
  '<span class="ilife-block-portion-gauge-same">300 g</span></span>',
  '<span class="ilife-block-portion-gauge-eq"><span class="ilife-block-portion-gauge-side">',
  '<b class="ilife-block-portion-gauge-side-value">2 碗</b>',
  '<em class="ilife-block-portion-gauge-side-label">菜谱单位</em></span>',
  '<span class="ilife-block-portion-gauge-arrow" aria-hidden="true">→</span>',
  '<span class="ilife-block-portion-gauge-side is-to">',
  '<b class="ilife-block-portion-gauge-side-value">300 g</b>',
  '<em class="ilife-block-portion-gauge-side-label">生重（1 碗 ＝ 150 g）</em></span></span>',
  '<span class="ilife-block-portion-gauge-obj"><span class="ilife-block-portion-gauge-bar" aria-hidden="true">',
  '<i class="ilife-block-portion-gauge-fill" style="width: 46%"></i></span>',
  '<span class="ilife-block-portion-gauge-share">占一天碳水 46%</span></span></div>',
  '</div>',
  '<p class="ilife-block-portion-gauge-note">',
  '口径：左边永远是菜谱写的单位（份，碗，把），右边永远是营养库认的单位（g）。',
  '中间是这一份菜的换算系数，系数变了要写明是哪一版菜谱改的，不悄悄改数。',
  '缺换算系数的食材整行不画，只在下面写还差几样没有换算。</p>',
  '<p class="ilife-block-portion-gauge-missing">还差 2 样没有换算</p>',
  '</div>',
].join('');

describe('portion-gauge ①旧档 convert 逐字节不变（A 档是加法）', () => {
  it('先落地那一档的产物与补 A 档之前逐字节相同', () => {
    const html = renderPortionGauge({
      title: '份量换算', stamp: '菜谱 → 营养库', tail: '1 份 ＝ 350 g',
      rows: [
        { name: '红烧肉', kind: '主料', recipe: '2 份', grams: 700, shareOf: '蛋白', sharePct: 70 },
        { name: '米饭', kind: '主食', recipe: '2 碗', grams: 300, basis: '1 碗 ＝ 150 g',
          toLabel: '生重', shareOf: '碳水', sharePct: 46 },
      ],
      missingCount: 2,
    });
    assert.equal(html, CONVERT_GOLDEN, '`convert` 的产物动了一个字节（A 档是加法，旧档不许改）');
    /* 变异自证：任何一个字节变了，上面那条就得红。 */
    assert.notEqual(html.replace('is-convert', 'is-convert '), CONVERT_GOLDEN);
    assert.notEqual(html + ' ', CONVERT_GOLDEN);
    assert.equal(renderPortionGauge(GAUGE_INPUT).includes('is-convert'), false,
      'A 档的产物里不许混进 `convert` 的骨架');
  });
});

/* ── ①A 渲染契约 · 形态 `gauge` 量感条 ───────────────────────────────── */

describe('portion-gauge ①A 渲染契约 · 形态 gauge 量感条', () => {
  const html = renderPortionGauge(GAUGE_INPUT);

  it('骨架：卡头（标题＋这一份＋克数）→ 占比大字 → 尺子（两枚参照刻度值 ＋ 轨道）→ 实物参照', () => {
    assert.match(html, new RegExp('^<div class="' + PORTION_GAUGE_CLASS + ' is-gauge">'));
    assert.match(html, /<h4 class="ilife-block-portion-gauge-title">这一餐的量<\/h4>/, '卡头标题');
    assert.match(html, /-subject">红烧肉</, '这一份叫什么');
    assert.match(html, /-tail">≈ 350 g</, '克数在卡头右端');
    assert.match(html, /-lead-value">58%<\/b>/, '占比一档大字');
    assert.equal(countOf(html, 'class="[^"]*-mark-label'), 2, '两枚参照刻度值');
    assert.match(html, /-mark-label is-cap" aria-hidden="true">一天上限 2 份<\/span>/, '上限那枚在右端');
    assert.match(html, /-mark-label is-ref" aria-hidden="true" style="padding-left: 20%">一餐建议 1.2 份<\/span>/,
      '建议那枚居中到自己那枚刻度上（内距由 model 算）');
    assert.match(html, /-rail" role="img" aria-label="量感条：红烧肉用掉一天上限 2 份的58%/, '轨道是无障碍名的落点');
    assert.equal(countOf(html, 'class="[^"]*-tick'), 4, '四等分刻度竖线（右端那枚由上限收口）');
    assert.match(html, /-tick is-major" aria-hidden="true" style="left: 0%"/, '整份那一档画长');
    assert.equal(countOf(html, 'class="[^"]*-mark '), 2, '两枚参照刻度竖线');
    assert.match(html, /-mark is-ref" aria-hidden="true" style="left: 60%"/);
    assert.match(html, /-mark is-cap" aria-hidden="true" style="right: 0"/, '右端那枚靠 right 收口（left: 100% 会把描边推到轨道外）');
    assert.match(html, /-used" aria-hidden="true" style="width: 58%"/, '已用那一段');
    assert.match(html, /-equiv"><b>≈ 1 个拳头 ＋ 2 汤勺<\/b>/, '实物参照那一行');
    assert.equal(html.includes(portionGaugeSlot('note')), false, 'A 档缺省不出脚注（两条参照在图上自己报了名）');
    assert.equal(html.includes(portionGaugeSlot('conv')), false, 'A 档不带换算行区');
    assert.ok(!/<script/i.test(html), '不产脚本');
    for (const slot of ['hd', 'title', 'subject', 'lead', 'lead-value', 'gauge', 'mark-label',
      'rail', 'rest', 'used', 'tick', 'mark', 'equiv']) {
      assert.ok(html.includes(portionGaugeSlot(slot)), '缺槽：' + slot);
    }
  });

  it('**条宽恒由占比算出**：大字、已用那一段的行内宽、无障碍名三处同一个数', () => {
    for (const [name, input] of GAUGE_SAMPLES) {
      const h = renderPortionGauge(input);
      const r = gaugeBarReadings(h);
      assert.ok(r !== null, name + '：三处读数缺一处（判据会空转）');
      assert.equal(r.said, input.gauge.usedPct, name + '：大字不是 `usedPct`');
      assert.equal(r.width, input.gauge.usedPct, name + '：条宽不是 `usedPct`');
      assert.equal(r.inAria, input.gauge.usedPct, name + '：无障碍名里的数不是 `usedPct`');
      assert.equal(gaugeBarOk(h), true, name + '：三处没对上');
    }
  });

  it('**条宽恒由占比算出** · 变异自证（写死条宽／换一个数／压成 0 宽／无障碍名走散，都要红）', () => {
    const base = renderPortionGauge(GAUGE_INPUT);
    assert.equal(gaugeBarOk(base), true, '常规样例必须先过（不然变异自证在空转）');
    const muts = [
      ['条宽写死 100%', base.replace('style="width: 58%"', 'style="width: 100%"')],
      ['大字换成另一个数', base.replace('>58%<', '>70%<')],
      ['条被压成 0 宽（上一轮栽过的那一类）', base.replace('style="width: 58%"', 'style="width: 0%"')],
      ['无障碍名里的数走散', base.replace('的58%', '的70%')],
      ['已用那一段整块掉了', base.replace(/<span class="[^"]*-used"[^>]*><\/span>/, '')],
    ];
    for (const [why, bad] of muts) {
      assert.notEqual(bad, base, '变异没生效（判据自己有问题）：' + why);
      assert.equal(gaugeBarOk(bad), false, '变异没被抓住：' + why);
    }
  });

  it('**可见字不过 72、同一个数只印一次**：一屏只留一层话（砍字那一条的落点）', () => {
    const base = renderPortionGauge(GAUGE_INPUT);
    const text = visibleText(base);
    assert.ok(text.length <= 72, '标准样例可见字 ' + String(text.length) + ' 个（上限 72）：' + text);
    assert.equal(text.includes('占一天上限'), false, '「占一天上限」那句不写（轨道右端已经标着「一天上限 2 份」）');
    assert.equal(timesInText(base, '58%'), 1, '那个数在可见文本里只许出现一次：' + text);
    assert.equal(timesInText(base, '一天上限2份'), 1, '上限那枚刻度值的字只许出现一次：' + text);
    assert.equal(timesInText(base, '一餐建议1.2份'), 1, '建议那枚刻度值的字只许出现一次：' + text);
    assert.equal(gaugeLeanOk(base, '58%'), true);
    /* 变异自证：①塞回「占一天上限」那句 ②再印一遍那个数 —— 两条都得红。 */
    const muts = [
      ['塞回「占一天上限」那句', base.replace('</p>', '</p><p>占一天上限 2 份，比一餐建议的 1.2 份还差一点</p>')],
      ['那个数再印一遍', base.replace('</p>', '</p><p>58%</p>')],
      ['可见字撑到 72 个以上', base.replace('</p>', '</p><p>这一份已经用掉今天能吃的量的将近六成，'
        + '再吃两口就到一餐建议线了，晚上那顿要留点余地</p>')],
    ];
    for (const [why, bad] of muts) {
      assert.notEqual(bad, base, '变异没生效：' + why);
      assert.equal(gaugeLeanOk(bad, '58%'), false, '变异没被抓住：' + why);
    }
    /* 长串那一份：可见字上限是**标准样例**的纪律；长串只断「不截断、不横溢」（真机那一组），
       但「同一个数只印一次」对它一样成立。 */
    assert.equal(timesInText(renderPortionGauge(GAUGE_LONG), '88.5%'), 1, '长串样例同一个数也只印一次');
  });

  it('缺一块就不出那一块：不给建议＝那两处整块不出；脚注给了才出', () => {
    const cap = renderPortionGauge(GAUGE_CAP_ONLY);
    assert.equal(countOf(cap, 'class="[^"]*-mark-label'), 1, '只有上限那一枚');
    assert.match(cap, /-mark-label is-cap" aria-hidden="true">一天上限 2 份</);
    assert.equal(countOf(cap, 'class="[^"]*-mark '), 1, '只剩上限那枚刻度竖线');
    assert.equal(cap.includes('is-ref'), false, '没给建议＝不带 is-ref');
    assert.equal(cap.includes('一餐建议'), false);
    assert.equal(cap.includes('padding-'), false, '没给建议＝不写内距');
    assert.match(renderPortionGauge({ ...GAUGE_INPUT, note: '实线是一餐建议，虚线是一天上限' }),
      /-note">实线是一餐建议/, '给了脚注就出那一行');
    /* 正中那一档：居中到 50% 不需要偏移 ⇒ 不写 style（空内距不留一笔死声明）。 */
    const full = renderPortionGauge(GAUGE_FULL);
    assert.match(full, /-mark-label is-ref" aria-hidden="true">一餐建议 1 份</);
    assert.match(full, /-mark is-ref" aria-hidden="true" style="left: 50%"/);
  });

  it('参照刻度值的位置：过半压左边内距、不过半压右边内距（两侧都推不出轨道）', () => {
    const padAt = (pct) => {
      const m = new RegExp('class="' + portionGaugeSlot('mark-label')
        + ' is-ref" aria-hidden="true"(?: style="([^"]*)")?').exec(renderPortionGauge({
        ...GAUGE_INPUT, gauge: { ...GAUGE_INPUT.gauge, refPct: pct },
      }));
      return m === null ? null : (m[1] === undefined ? '' : m[1]);
    };
    assert.equal(padAt(60), 'padding-left: 20%', '60% 处：左边内距 20% ⇒ 话居中在 60%');
    assert.equal(padAt(12.5), 'padding-right: 75%', '12.5% 处：右边内距 75% ⇒ 话居中在 12.5%');
    assert.equal(padAt(50), '', '正中那一档不写内距');
    /* 尺子两端：内距压到 75% 那一档（再往两端去，可用宽会被压成 0，一个字居中在 0 宽里 ⇒ 半个字推出轨道）。 */
    assert.equal(padAt(0), 'padding-right: 75%', '0% 处：内距压到上限，话贴着左端');
    assert.equal(padAt(100), 'padding-left: 75%', '100% 处：内距压到上限，话贴着右端');
    assert.equal(padAt(75), 'padding-left: 50%', '75% 处不触上限');
  });

  it('尺子右端那一枚（上限／建议顶到 100%）用 `right: 0` 收口，不许把自己推到轨道外面', () => {
    assert.match(renderPortionGauge(GAUGE_INPUT), /-mark is-cap" aria-hidden="true" style="right: 0"/,
      '上限那枚在轨道右端');
    assert.match(renderPortionGauge(GAUGE_EDGE), /-mark is-ref" aria-hidden="true" style="right: 0"/,
      '建议顶到 100% 时同样 `right: 0`（`left: 100%` 会多出 1px 横溢）');
    assert.match(renderPortionGauge(GAUGE_INPUT), /-mark is-ref" aria-hidden="true" style="left: 60%"/,
      '内圈那枚照旧按 `left: p%` 摆');
  });

  it('转义：五个字符进实体，不进标记（名字／上限／建议／换算句逐位转义）', () => {
    const evil = '"><script>alert(1)</script>';
    const out = renderPortionGauge({
      title: evil, form: 'gauge', tail: evil, note: evil,
      gauge: { name: evil, usedPct: 58, capText: evil, refText: evil, refPct: 60, equiv: evil },
    });
    assert.equal(/<script/i.test(out), false, '不得出现可执行脚本标签');
    assert.equal(/\son[a-z]+=/i.test(out), false, '不得出现内联事件处理器');
    assert.ok(out.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(out.includes('&quot;'), '引号转义');
  });

  it('非法入参**逐条**走 BlocksError（含建议那两句只给一样）', () => {
    const ok = GAUGE_INPUT;
    const g = ok.gauge;
    assert.equal(throwsBlocks(() => renderPortionGauge({ title: 't', form: 'gauge' })), true, 'gauge 必填');
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, gauge: null })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, gauge: [] })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, gauge: { ...g, name: '' } })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, gauge: { ...g, name: '  ' } })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, gauge: { ...g, capText: '' } })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, gauge: { ...g, usedPct: -1 } })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, gauge: { ...g, usedPct: 101 } })), true,
      '越界的占比会顶出轨道');
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, gauge: { ...g, usedPct: '58' } })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, gauge: { ...g, usedPct: NaN } })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, gauge: { ...g, refPct: 101 } })), true);
    assert.equal(throwsBlocks(() => renderPortionGauge({ ...ok, gauge: { ...g, equiv: '  ' } })), true,
      '全空白不算文本');
    /* 建议那两句**成对给**：只给一样当场报错（一个没地方挂、一个挂在编出来的位置上）。 */
    assert.equal(throwsBlocks(() => renderPortionGauge({
      ...ok, gauge: { ...g, refPct: undefined },
    })), true, '只给 refText 不给 refPct');
    assert.equal(throwsBlocks(() => renderPortionGauge({
      ...ok, gauge: { name: '红烧肉', usedPct: 58, capText: '2 份', refPct: 60 },
    })), true, '只给 refPct 不给 refText');
    /* 空串按「未给」处理：与 `refPct` 一起缺 ⇒ 两个字面上都算没给，照常出（那一块整块不出）。 */
    assert.equal(renderPortionGauge({ ...ok, gauge: { ...g, refText: '', refPct: undefined } })
      .includes('is-ref'), false, '空串＝未给');
    /* 小数占比取一位（与 B 档同一把尺）：`88.55` → `88.6%`。 */
    assert.match(renderPortionGauge({ ...ok, gauge: { ...g, usedPct: 88.55 } }), /-lead-value">88.6%</);
  });

  it('纯函数：同入参两次逐字节相同；两档产物互不混入', () => {
    assert.equal(renderPortionGauge(GAUGE_INPUT), renderPortionGauge(GAUGE_INPUT));
    assert.notEqual(renderPortionGauge(GAUGE_INPUT), renderPortionGauge(GAUGE_LONG));
    /* 槽类名按**边界**找：`-eq` 不许被 `-equiv` 顶替（前缀吃掉后半段＝判据空转）。 */
    const hasSlot = (html, slot) => html.includes(portionGaugeSlot(slot) + '"')
      || html.includes(portionGaugeSlot(slot) + ' ');
    const a = renderPortionGauge(GAUGE_INPUT);
    for (const slot of ['conv', 'row', 'eq', 'obj', 'bar', 'fill', 'share']) {
      assert.equal(hasSlot(a, slot), false, 'A 档产物里不许有 B 档的槽：' + slot);
    }
    const b = renderPortionGauge(STANDARD_INPUT);
    for (const slot of ['lead', 'gauge', 'rail', 'used', 'tick', 'equiv', 'subject']) {
      assert.equal(hasSlot(b, slot), false, 'B 档产物里不许有 A 档的槽：' + slot);
    }
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('portion-gauge ② 样式纪律', () => {
  const css = stripComments(portionGaugeCss());

  it('样式段非空，且**全部**规则 scope 在 `.ilife-page-ui` 之下（不开配方的页零命中）', () => {
    const selectors = ruleSelectors(css);
    assert.ok(selectors.length >= 18, '本件规则数不对：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器没 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes('.ilife-block-portion-gauge'), '选择器必须挂在件根类之下：' + sel);
    }
  });

  it('选择器不许出现两次 scope（`.x > .ilife-page-ui .y` 是**死规则**：语法合法、编译不报错、永不命中）', () => {
    for (const sel of ruleSelectors(stripComments(portionGaugeCss()))) {
      const hits = (sel.match(/\.ilife-page-ui/g) || []).length;
      assert.equal(hits, 1, '`.ilife-page-ui` 在一条选择器里只许出现一次，出现 ' + hits + ' 次 ⇒ 拼了两遍前缀：' + sel);
    }
    for (const sel of ruleSelectors(stripComments(portionGaugeCss({ prefix: 'x-' })))) {
      assert.equal((sel.match(/\.x-page-ui/g) || []).length, 1, '换前缀后同样只许一次：' + sel);
    }
  });

  it('零 `:root`／零 `!important`／零新 token 名', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    const decls = css.match(/--[a-z0-9-]+\s*:/g) || [];
    assert.equal(decls.length, 0, '不得定义新 token：' + decls.join(' '));
  });

  it('**只经 `skinVar()` 读皮肤**：每一处 var() 都与取值表一致，剥掉它后不剩一个 var()', () => {
    const names = [...css.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)].map((m) => m[1]);
    assert.ok(names.length >= 20, '读皮肤的处数不对（判据可能空转）：' + names.length);
    const known = new Set(SKIN_NAMES.length > 0
      ? Object.keys(SKINS[SKIN_NAMES[0]].values).map((k) => '--ilife-' + k) : []);
    for (const n of new Set(names.map((x) => '--ilife-' + x))) {
      assert.ok(known.has(n), '名单外的 token 名（会被静默兜底）：' + n);
    }
    const bare = stripVarFns(css);
    assert.equal(bare.includes('var(--'), false, '手写了 var(--…)（兜底链只许住 skin/contract.ts）');
    assert.deepEqual([...new Set([...bare.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)]
      .map((m) => m[0]))], [], '产出里有不跟皮肤的颜色字面量（只有兜底链里那一处允许手写字面量）');
  });

  it('**宽度只许容器判**：本件一条 `@media` 都没有，窄档调整走 `@container`', () => {
    assert.equal(css.includes('@media'), false, '本件不许用媒体查询（视口宽 ≠ 组件宽）');
    const at = [...portionGaugeCss().matchAll(/@container \(([^)]*)\)/g)].map((m) => m[1]);
    assert.deepEqual(at.length, 1, '容器查询数不对：' + at.join('｜'));
    assert.match(at[0], /^max-width: \d+px$/, '容器查询只许判宽度：' + at[0]);
    assert.match(css, /container-type: inline-size;/, '本件必须自己是容器');
  });

  it('窄档阈值**只有一个来源**：样式段里的像素数就是 `attrs.ts` 那个常量', () => {
    assert.ok(css.includes('@container (max-width: ' + String(PORTION_GAUGE_NARROW_PX) + 'px)'),
      '容器查询必须读阈值常量（两处各写一个数必然走散）');
    assert.equal((stripComments(portionGaugeCss()).match(new RegExp(String(PORTION_GAUGE_NARROW_PX) + 'px', 'g')) || []).length,
      1, '阈值在样式段里只许出现一次');
  });

  it('**不许截断**：样式段里没有截断手段（数值与占比句一律换行）', () => {
    for (const bad of ['text-overflow', 'line-clamp', 'white-space: nowrap', 'overflow: hidden', 'overflow-x: hidden']) {
      assert.equal(css.includes(bad), false, '出现了截断手段：' + bad);
    }
    assert.ok((css.match(/overflow-wrap: anywhere/g) || []).length >= 8, '长串折行覆盖不足');
    const clean = stripComments(portionGaugeCss());
    for (const slot of ['stamp', 'tail', 'same', 'side-value', 'share']) {
      assert.ok(/min-width:\s*0/.test(ruleOf(clean, '.' + portionGaugeSlot(slot))), slot + ' 少了 min-width: 0');
    }
  });

  it('背景不许是正文墨色（选中／填充＝实心墨块＝红）；缺换算那一行走提醒色', () => {
    const bad = [];
    for (const m of css.matchAll(/(background(?:-color)?)\s*:\s*([^;{}]+)/g)) {
      if (/^var\(\s*--(?:ilife-ink(?:-[23])?|fg[23]?)\s*[,)]/.test(m[2].trim())) bad.push(m[1] + ': ' + m[2].trim());
    }
    assert.deepEqual(bad, [], '拿正文墨色当了“面”：\n  ' + bad.join('\n  '));
    assert.ok(css.includes('background: ' + 'var(--ilife-accent'), '占比填充走强调色实底');
    assert.ok(ruleOf(css, '.' + portionGaugeSlot('missing')).includes('warn'), '缺换算那一行走提醒色');
  });

  it('本件不带可点元素（判的是标记面，不是样式面）', () => {
    const joined = [STANDARD_INPUT, LONG_INPUT].map((i) => renderPortionGauge(i)).join('');
    for (const needle of ['<button', '<a ', 'tabindex', 'onclick', '<input', '<select']) {
      assert.equal(joined.includes(needle), false, '本件不带可点元素：' + needle);
    }
  });

  it('焦点地板：`:focus-visible` 有 ≥2px 可见描边，且没有「只写 outline:none」', () => {
    assert.match(css, /:focus-visible \{/, '必须有 :focus-visible 规则');
    assert.match(css, /outline: 2px solid /, '焦点描边 ≥2px 且可见');
    assert.equal(/outline:\s*(none|0)/.test(css), false, '不许只写 outline:none 而不给替代');
  });

  it('**占比条那一轨有最小宽**：宽档里那条 `auto` 轨吃不动它（条不许被长占比句挤成 0 宽）', () => {
    const clean = stripComments(portionGaugeCss());
    const obj = ruleOf(clean, '.' + portionGaugeSlot('obj'));
    assert.ok(obj.includes('minmax(' + String(PORTION_GAUGE_BAR_MIN_PX) + 'px, 1fr)'),
      '占比条那一轨没有最小宽（长占比句会把条压成 0：条 0 宽、那句还写着 70%）：' + obj);
    assert.ok(/grid-template-columns:\s*minmax\(\d+px, 1fr\) minmax\(0, auto\)/.test(obj),
      '占比条那一轨的最小宽写法不对（第二轨要 `minmax(0, auto)`：不留内容撑宽的下限）：' + obj);
    /* 那条最小宽**只有一个来源**：常量 → 样式段。 */
    assert.equal((stripComments(portionGaugeCss()).match(new RegExp(String(PORTION_GAUGE_BAR_MIN_PX) + 'px', 'g')) || []).length,
      1, '条的最小宽在样式段里只许出现一次（两处各写一个数必然走散）');
  });

  it('缺省前缀 `ilife-`；换前缀时 scope 与槽类**一起**换', () => {
    assert.match(portionGaugeCss(), /^\.ilife-page-ui \.ilife-block-portion-gauge \{/m);
    const x = stripComments(portionGaugeCss({ prefix: 'x-' }));
    assert.ok(x.includes('.x-page-ui .x-block-portion-gauge {'));
    assert.ok(x.includes('.x-block-portion-gauge-side-value'));
    assert.equal(x.includes('.ilife-'), false, '换前缀后不许残留旧前缀');
  });

  it('`dist/components/portion-gauge/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'portion-gauge');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 5, '至少该有 index／attrs／model／render／style 的产物：' + files.join('、'));
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
    assert.equal(portionGaugeSlot('row'), PORTION_GAUGE_CLASS + '-row');
    assert.equal(portionGaugeSlot('row', 'x-'), 'x-block-portion-gauge-row');
    for (const slot of PORTION_GAUGE_SLOTS) assert.ok(portionGaugeSlot(slot).startsWith(PORTION_GAUGE_CLASS + '-'));
    assert.ok(PORTION_GAUGE_MIN_ROWS === 1 && PORTION_GAUGE_MAX_ROWS === 8, '行数上下限走散');
    if (STYLE_SRC.includes('const c = (slot: PortionGaugeSlot)')) {
      assert.ok((stripComments(STYLE_SRC).match(/(?:^|[^\w.])c\(/g) || []).length > 0,
        '声明了裸槽助手 c() 却一次没用（死代码，删掉它）');
    }
  });

  it('**死声明门**：闭集里每个槽位都在标记里真出现、且样式段里有规则（两档都算进去）', () => {
    /* 标记面：两档的样例合起来 —— 一个槽在两档里的**任一档**上过屏，就不算死声明。 */
    const marked = [STANDARD_INPUT, SINGLE_INPUT, FULL_INPUT, LONG_INPUT, GAUGE_INPUT,
      GAUGE_CAP_ONLY, GAUGE_LONG, GAUGE_EDGE, GAUGE_FULL].map(renderPortionGauge).join('');
    const clean = stripComments(portionGaugeCss());
    const dead = [];
    for (const slot of PORTION_GAUGE_SLOTS) {
      const cls = portionGaugeSlot(slot);
      /* 类名要按**边界**匹配：`-mark` 不许被 `-mark-label` 顶替（前缀吃掉后半段＝判据空转）。 */
      if (!marked.includes(cls + '"') && !marked.includes(cls + ' ')) {
        dead.push(slot + '（标记里没有这个类）');
      } else if (!new RegExp('\\.' + cls + '(?=[\\s.,{])').test(clean)) {
        dead.push(slot + '（样式段里没有规则）');
      }
    }
    assert.deepEqual(dead, [], '这些槽位在闭集里，却上不了屏或没有规则（死声明）：\n  ' + dead.join('\n  '));
    /* 变异自证：闭集里加一个从没用过的名字 ⇒ 这条当场红。 */
    const fake = [...PORTION_GAUGE_SLOTS, 'never-used'];
    const stillDead = fake.filter((slot) => {
      const cls = portionGaugeSlot(slot);
      return !marked.includes(cls + '"') && !marked.includes(cls + ' ');
    });
    assert.deepEqual(stillDead, ['never-used'], '变异自证没生效：闭集里塞一个没上过屏的槽名必须被这条抓住');
  });

  it('A 档的样式段也在这一份出口里（拆到 `style-gauge.ts` 的那半不许漏扫）', () => {
    const clean = stripComments(portionGaugeCss());
    for (const slot of ['subject', 'lead', 'lead-value', 'gauge', 'mark-label', 'rail', 'rest', 'used', 'tick', 'mark', 'equiv']) {
      assert.ok(new RegExp('\\.' + portionGaugeSlot(slot) + '(?=[\\s.,{])').test(clean),
        'A 档槽位在样式段里没有规则：' + slot);
    }
    assert.ok(STYLE_SRC.includes(PORTION_GAUGE_RAIL_PX + 'px'), '轨道高只有一个来源（常量 → 样式段）');
    assert.ok(clean.includes('height: ' + String(PORTION_GAUGE_RAIL_PX) + 'px'),
      '轨道高就是命中盒那一档（' + String(PORTION_GAUGE_RAIL_PX) + 'px）');
  });

  it('⑥ 分隔符门：本件生成的字里不出现分隔符（R1–R3 零命中，两档的样例都过）', () => {
    for (const [name, input] of [['standard', STANDARD_INPUT], ['single', SINGLE_INPUT],
      ['full', FULL_INPUT], ['edge', EDGE_INPUT], ['long', LONG_INPUT],
      ['gauge', GAUGE_INPUT], ['gauge-cap-only', GAUGE_CAP_ONLY], ['gauge-long', GAUGE_LONG],
      ['gauge-zero', GAUGE_EDGE], ['gauge-full', GAUGE_FULL]]) {
      const r = auditHtml(renderPortionGauge(input), name);
      assert.deepEqual(r.node.hits.map((h) => h.text), [], name + '：可见文本踩了分隔符门');
      assert.deepEqual(r.line.hits.map((h) => h.text), [], name + '：行级也踩了');
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('portion-gauge ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(PORTION_GAUGE_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderSpreadDist({
      title: '七天摄入波动',
      days: [
        { label: '周一', low: 14, median: 38, high: 62 },
        { label: '周二', low: 18, median: 34, high: 58 },
        { label: '周三', low: 10, median: 52, high: 82 },
      ],
    });
    renderPortionGauge(STANDARD_INPUT);
    assert.equal(renderSpreadDist({
      title: '七天摄入波动',
      days: [
        { label: '周一', low: 14, median: 38, high: 62 },
        { label: '周二', low: 18, median: 34, high: 58 },
        { label: '周三', low: 10, median: 52, high: 82 },
      ],
    }), before, '别件的产物逐字节不变');
  });

  it('出口唯一：本件不从根出口出', () => {
    assert.equal(typeof renderPortionGauge, 'function');
    assert.equal(root.renderPortionGauge, undefined, '组件层不得从根出口出（冻结面签名不许动）');
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(portionGaugeCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-portion-gauge'), '前缀必须作用到类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });
});

/* ── ⑤ 皮肤纪律（静态面：标记与皮肤取值无关） ───────────────────────── */

describe('portion-gauge ⑤ 皮肤矩阵 · 静态面（三套皮肤下标记逐字节相同）', () => {
  /** 一页的产物：皮肤类挂在**页级根**上、皮肤样式段由页面挂（件自己不认皮肤，只出标记）。 */
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderPortionGauge(STANDARD_INPUT) + '</div>';
  /** 把「皮肤那一份」挖掉（样式段 ＋ 页级根上的皮肤类），剩下的就是标记面。 */
  const withoutSkin = (name) => pageOf(name)
    .replace(skinCss({ skins: [name] }), '')
    .replace(skinClass(name), '');

  it('四套皮肤：差异只落在皮肤样式段与皮肤类上，标记面逐字节相同', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(renderPortionGauge(STANDARD_INPUT)), '挖掉皮肤后标记必须原样在');
    for (const name of SKIN_NAMES) {
      assert.equal(withoutSkin(name), bare, name + ' 的标记面与 ' + SKIN_NAMES[0] + ' 不同');
    }
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[1]), '两套皮肤的页产物必须真的不同（否则这条判据空转）');
    assert.equal(renderPortionGauge(STANDARD_INPUT).includes('skin-'), false, '标记里不许自带皮肤类（皮肤是页面挂的）');
  });
});

/* ── ④ 四档几何（真机） ─────────────────────────────────────────────── */

/** 四档**容器**宽度：320 是触屏最窄那一档，620 起过窄档阈值（`PORTION_GAUGE_NARROW_PX`）。 */
const WIDTHS = [320, 390, 620, 1280];

/** 压力样例：常规 ＋ 一行 ＋ 满八行 ＋ 长口径 ＋ 边界占比。 */
function cases() {
  return [
    { name: 'standard', html: renderPortionGauge(STANDARD_INPUT), pcts: [70, 46, 21] },
    { name: 'single', html: renderPortionGauge(SINGLE_INPUT), pcts: [70] },
    { name: 'full', html: renderPortionGauge(FULL_INPUT), pcts: [70, 46, 21, 12, 30, 8, 15, 18] },
    { name: 'long', html: renderPortionGauge(LONG_INPUT), pcts: [100, 0, 21] },
    { name: 'edge', html: renderPortionGauge(EDGE_INPUT), pcts: [46.6, 0, 100] },
  ];
}

/** 真机起不来时的确定性几何判据（量不到“内容撑宽”，就断**形状上的那几条**）。 */
function assertStaticGeometry(css, html) {
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const wide = [...px(html), ...px(css)].filter((v) => v > WIDTHS[0]);
  assert.deepEqual(wide, [], '出现过不了最窄档（' + WIDTHS[0] + '）的固定宽度：' + wide.join('、'));
  const percents = [...html.matchAll(/style="width: ([\d.]+)%"/g)].map((m) => Number(m[1]));
  assert.ok(percents.length > 0, '占比条的坐标必须是百分比（判据会空转）');
  for (const v of percents) assert.ok(v >= 0 && v <= 100, '百分比越界：' + v);
  const clean = stripComments(css);
  for (const slot of ['stamp', 'tail', 'same', 'side-value', 'share']) {
    assert.ok(/min-width:\s*0/.test(ruleOf(clean, '.' + portionGaugeSlot(slot))), slot + ' 少了 min-width: 0');
  }
}

describe('portion-gauge ④⑤ 四档几何与皮肤纪律（真机 headless Chrome ＋ CDP）', () => {
  it('容器 320／390／620／1280：零横向溢出／条宽与占比句逐点对上／窄档改走单列／零截断', async (t) => {
    const css = portionGaugeCss();
    const list = cases();
    const casesHtml = list.map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
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
      /** 每一种「档 × 皮肤 × 样例」的溢出读数（每一格都进）。 */
      const over = [];
      for (const width of WIDTHS) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of SKIN_NAMES) {
          for (const c of list) {
            const scope = '.' + skinClass(skin) + ' [data-case=' + c.name + '] ';
            const root = await page.read([scope + '.' + PORTION_GAUGE_CLASS, scope + '.' + portionGaugeSlot('hd'),
              scope + '.' + portionGaugeSlot('eq')]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            for (const one of root) {
              assert.ok(one.maxScrollW <= one.maxClientW + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 横向溢出 '
                + one.maxScrollW + ' > ' + one.maxClientW);
              assert.equal(one.scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            }
            /* 数值／占比／口径**不被截断**（压字与省略号都不是本件的做法）。 */
            const slots = ['side-value', 'share', 'same', 'stamp', 'tail', 'name', 'sub', 'note', 'missing']
              .filter((slot) => new RegExp('class="' + portionGaugeSlot(slot) + '[ "]').test(c.html));
            const texts = await page.read(slots.map((slot) => scope + '.' + portionGaugeSlot(slot)));
            for (const one of texts) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel
                + ' 有 ' + one.clipped + ' 处被截断');
              assert.ok(one.visible > 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 不见了');
            }
            over.push({ width, skin, name: c.name, scrollW: root[0].maxScrollW, clientW: root[0].maxClientW });
            /* **位置由值算出**（真机读数）：**每一条**的宽度占轨道的百分比必须等于占比句的百分比。 */
            const bars = await page.ev('(function(){var root=document.querySelector('
              + JSON.stringify(scope + '.' + PORTION_GAUGE_CLASS) + ');'
              + 'var rows=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + portionGaugeSlot('row')) + '));'
              + 'return rows.map(function(row){'
              + 'var bar=row.querySelector(' + JSON.stringify('.' + portionGaugeSlot('bar')) + ');'
              + 'var fill=row.querySelector(' + JSON.stringify('.' + portionGaugeSlot('fill')) + ');'
              + 'var share=row.querySelector(' + JSON.stringify('.' + portionGaugeSlot('share')) + ');'
              + 'var bw=bar.getBoundingClientRect().width,fw=fill.getBoundingClientRect().width;'
              + 'var pct=parseFloat((fill.style.width||"").replace("%",""));'
              + 'var said=parseFloat((share.textContent.match(/([\\d.]+)%/)||[])[1]);'
              + 'return {ratio:Math.round(fw/bw*1000)/10,pct:pct,said:said};});}())');
            assert.equal(bars.length, c.pcts.length, width + ' 档 ' + skin + ' ' + c.name + '：行数不对');
            bars.forEach((b, i) => {
              assert.equal(b.pct, c.pcts[i], width + ' 档 ' + skin + ' ' + c.name
                + ' 第 ' + (i + 1) + ' 行：行内宽度不是占比本身');
              assert.equal(b.said, c.pcts[i], width + ' 档 ' + skin + ' ' + c.name
                + ' 第 ' + (i + 1) + ' 行：占比句与条宽走散');
              if (c.pcts[i] === 0) {
                assert.equal(b.ratio, 0, width + ' 档 ' + skin + ' ' + c.name
                  + ' 第 ' + (i + 1) + ' 行：0 占比的条就该是空的');
              } else {
                assert.ok(Math.abs(b.ratio - c.pcts[i]) <= 2, width + ' 档 ' + skin + ' ' + c.name
                  + ' 第 ' + (i + 1) + ' 行：条宽占轨道 ' + b.ratio + '%，占比却是 ' + c.pcts[i] + '%');
              }
            });
            seen.push({ width, skin, name: c.name });
          }
        }
      }
      /* **窄档是容器驱动的**（视口没变，只改了夹具容器宽度）：换算框在窄档走单列、宽档走三列。 */
      const eqCols = await (async () => {
        const out = {};
        for (const width of WIDTHS) {
          await page.setWidth(width);
          const cols = await page.ev('(function(){var el=document.querySelector('
            + JSON.stringify('.' + portionGaugeSlot('eq')) + ');'
            + 'return getComputedStyle(el).gridTemplateColumns;}())');
          out[width] = cols.split(' ').filter((s) => s !== '').length;
        }
        return out;
      })();
      for (const w of WIDTHS) {
        const want = w <= PORTION_GAUGE_NARROW_PX ? 1 : 3;
        assert.equal(eqCols[w], want, w + ' 档换算框应走 ' + want + ' 列（@container '
          + (w <= PORTION_GAUGE_NARROW_PX ? '命中' : '未命中') + '）：' + eqCols[w]);
      }
      /* ⑤ 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const c of list) {
        for (const width of WIDTHS) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
            + 'for (var i = 0; i < skins.length; i += 1) {'
            + '  var el = document.querySelector("." + "ilife-skin-" + skins[i]'
            + ' + " [data-case=' + c.name + '] .' + PORTION_GAUGE_CLASS + '");'
            + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
            + '} return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
          }
        }
      }
      /* 缺换算那一行：四套皮肤里都取到了取值表里的提醒底与提醒字。 */
      for (const skin of SKIN_NAMES) {
        const vals = SKIN_VALUES[skin];
        const colors = await page.ev('(function(){var cell=document.querySelector('
          + JSON.stringify('.' + skinClass(skin) + ' [data-case=long] .' + portionGaugeSlot('missing')) + ');'
          + 'return {bg: cell === null ? null : getComputedStyle(cell).backgroundColor,'
          + 'fg: cell === null ? null : getComputedStyle(cell).color};}())');
        assert.equal(colors.bg, toRgb(vals['warn-soft']), skin + '：缺换算那一行的底取 warn-soft');
        assert.equal(colors.fg, toRgb(vals.warn), skin + '：缺换算那一行的字取 warn');
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of WIDTHS) {
        const cells = over.filter((s) => s.width === w);
        console.log('READING portion-gauge container=' + w
          + ' eqCols=' + eqCols[w]
          + ' maxRootScrollW=' + Math.max(...cells.map((s) => s.scrollW))
          + ' maxRootClientW=' + Math.max(...cells.map((s) => s.clientW))
          + ' cells=' + cells.length);
      }
    } finally { page.close(); }
  });
});

/* ── ④A A 档量感条的几何（真机）：四档零横溢、零截断、条宽与大字逐点对上 ──── */

/** A 档的几何样例（名字 → 产物 ＋ 要断的那个数）。 */
function gaugeCases() {
  return [
    { name: 'gauge-std', html: renderPortionGauge(GAUGE_INPUT), pct: 58 },
    { name: 'gauge-cap', html: renderPortionGauge(GAUGE_CAP_ONLY), pct: 58 },
    { name: 'gauge-long', html: renderPortionGauge(GAUGE_LONG), pct: 88.5 },
    { name: 'gauge-zero', html: renderPortionGauge(GAUGE_EDGE), pct: 0 },
    { name: 'gauge-full', html: renderPortionGauge(GAUGE_FULL), pct: 100 },
  ];
}

/** 一格的 A 档真机读数：轨道（宽／高）／已用那一段（宽／占比）／大字那个数／两枚参照刻度值的**文字**边界。
 *  参照刻度值那两行是**满宽**的（话靠内距摆到自己那枚刻度上），所以量的必须是**文字**的框
 *  （`Range` 取内容），不是元素的框——元素框永远贴着轨道两边，量它等于没量。 */
const GAUGE_MEASURE = '(function(){var root=document.querySelector(SEL);if(root===null)return null;'
  + 'var rail=root.querySelector(RAIL),used=root.querySelector(USED),lead=root.querySelector(LEAD);'
  + 'var labels=[].slice.call(root.querySelectorAll(LABEL));'
  + 'var rr=root.getBoundingClientRect(),rw=rail.getBoundingClientRect(),uw=used.getBoundingClientRect();'
  + 'return{scrollW:root.scrollWidth,clientW:root.clientWidth,'
  + 'railW:Math.round(rw.width*10)/10,railH:Math.round(rw.height*10)/10,'
  + 'usedW:Math.round(uw.width*10)/10,ratio:rw.width===0?null:Math.round(uw.width/rw.width*1000)/10,'
  + 'pct:parseFloat(used.style.width),said:parseFloat(lead.textContent),'
  + 'gapPx:labels.length===0?null:Math.round((rw.top-Math.max.apply(null,labels.map(function(n){'
  + 'return n.getBoundingClientRect().bottom;})))*10)/10,'
  + 'labels:labels.map(function(n){var rg=document.createRange();rg.selectNodeContents(n);'
  + 'var b=rg.getBoundingClientRect();'
  + 'return{left:Math.round((b.left-rr.left)*10)/10,right:Math.round((b.right-rr.right)*10)/10,'
  + 'w:Math.round(b.width*10)/10,text:n.textContent.length};})};}())';

/** 一格的选择器绑定（与上面那条表达式配对；两处各写一遍必然走散）。 */
function gaugeMeasureExpr(scope) {
  return GAUGE_MEASURE
    .replace('SEL', JSON.stringify(scope + '.' + PORTION_GAUGE_CLASS))
    .replace('RAIL', JSON.stringify('.' + portionGaugeSlot('rail')))
    .replace('USED', JSON.stringify('.' + portionGaugeSlot('used')))
    .replace('LEAD', JSON.stringify('.' + portionGaugeSlot('lead-value')))
    .replace('LABEL', JSON.stringify('.' + portionGaugeSlot('mark-label')));
}

/** 真机起不来时的确定性几何判据：三处同一个数 ＋ 参照刻度值的内距只往轨道里推。 */
function assertStaticGaugeGeometry(list) {
  for (const c of list) {
    assert.equal(gaugeBarOk(c.html), true, c.name + '：三处不是同一个数（真机未跑时的地板判据）');
    const pads = [...c.html.matchAll(/class="[^"]*-mark-label is-ref" aria-hidden="true" style="([^"]*)"/g)]
      .map((m) => m[1]);
    for (const pad of pads) {
      const m = /padding-(left|right): ([\d.]+)%/.exec(pad);
      if (m === null) continue;
      const v = Number(m[2]);
      assert.ok(v >= 0 && v < 100, c.name + '：内距越大越把话推出轨道：' + pad);
      /* 内距压在左边 ⇒ 那条话最远到 (100−v)%；压在右边 ⇒ 最远从 v% 起。两头都在轨道里。 */
      if (m[1] === 'left') assert.ok(100 - v <= 100, c.name + '：左边内距 ' + String(v) + '% 会推出右缘');
    }
  }
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const wide = px(portionGaugeCss()).filter((v) => v > WIDTHS[0]);
  assert.deepEqual(wide, [], '样式段里出现过不了最窄档（' + WIDTHS[0] + '）的固定宽度：' + wide.join('、'));
}

describe('portion-gauge ④A A 档量感条四档几何（真机 headless Chrome ＋ CDP）', () => {
  it('容器 320／390／620／1280：零横溢／大字与条宽逐点对上／参照刻度值都在轨道里／零截断', async (t) => {
    const list = gaugeCases();
    const casesHtml = list.map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n'),
      css: skinCss() + '\n' + portionGaugeCss(),
      height: 1400,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：A 档三处同一个数 '
        + '＋ 参照刻度值的内距只往轨道里推 ＋ 没有超过 ' + WIDTHS[0] + 'px 的固定宽度');
      assertStaticGaugeGeometry(list);
      return t.skip('本机无 Chrome／Chromium：A 档四档几何判据需真浏览器');
    }
    try {
      const over = [];
      for (const width of WIDTHS) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of SKIN_NAMES) {
          for (const c of list) {
            const scope = '.' + skinClass(skin) + ' [data-case=' + c.name + '] ';
            const at = width + ' 档 ' + skin + ' ' + c.name;
            const root = await page.read([scope + '.' + PORTION_GAUGE_CLASS, scope + '.' + portionGaugeSlot('rail')]);
            assert.equal(root[0].count, 1, at + '：找不到本件根');
            for (const one of root) {
              assert.ok(one.maxScrollW <= one.maxClientW + 1,
                at + '：' + one.sel + ' 横向溢出 ' + one.maxScrollW + ' > ' + one.maxClientW);
              assert.equal(one.scrollsX, 0, at + '：不许出现 overflow-x 滚动容器');
            }
            /* 每一个文本槽都看得见、都不被截断（数值与参照刻度值**永不** `…`）。 */
            const slots = ['subject', 'title', 'tail', 'lead-value', 'mark-label', 'equiv']
              .filter((slot) => new RegExp('class="' + portionGaugeSlot(slot) + '[ "]').test(c.html));
            const texts = await page.read(slots.map((slot) => scope + '.' + portionGaugeSlot(slot)));
            for (const one of texts) {
              assert.equal(one.clipped, 0, at + '：' + one.sel + ' 有 ' + String(one.clipped) + ' 处被截断');
              assert.ok(one.visible > 0, at + '：' + one.sel + ' 不见了');
            }
            /* **位置由值算出**（真机读数）＋ 命中盒：轨道高就是 `PORTION_GAUGE_RAIL_PX`。 */
            const m = await page.ev(gaugeMeasureExpr(scope));
            assert.ok(m !== null, at + '：找不到本件根');
            assert.ok(m.scrollW <= m.clientW + 1, at + '：横向溢出 ' + m.scrollW + ' > ' + m.clientW);
            assert.ok(m.railW >= PORTION_GAUGE_BAR_MIN_PX - 0.5,
              at + '：轨道只有 ' + String(m.railW) + ' 宽，比最小宽 ' + String(PORTION_GAUGE_BAR_MIN_PX) + 'px 还窄');
            assert.ok(m.railH >= PORTION_GAUGE_RAIL_PX - 1,
              at + '：轨道只有 ' + String(m.railH) + ' 高（命中盒那一档是 ' + String(PORTION_GAUGE_RAIL_PX) + 'px）');
            /* 命中盒的邻居：参照刻度值那一行与轨道之间是 8px 那一档（相邻 ≥8px）。 */
            assert.ok(m.gapPx !== null && m.gapPx >= 8 - 0.5,
              at + '：参照刻度值那一行与轨道只隔 ' + String(m.gapPx) + 'px（相邻要 ≥8px）');
            assert.equal(m.pct, c.pct, at + '：行内宽度不是占比本身');
            assert.equal(m.said, c.pct, at + '：大字与条宽走散');
            if (c.pct === 0) {
              assert.equal(m.ratio, 0, at + '：0 占比的条就该是空的');
            } else {
              assert.ok(Math.abs(m.ratio - c.pct) <= 2, at + '：条宽占轨道 ' + String(m.ratio)
                + '%，大字却写着 ' + String(c.pct) + '%');
            }
            /* 两枚参照刻度值：**话**（`Range` 量到的文字框）都落在轨道里，不压字、不推出边缘。 */
            assert.ok(m.labels.length >= 1, at + '：一枚参照刻度值都没读到');
            for (const b of m.labels) {
              assert.ok(b.text > 0, at + '：参照刻度值那一行是空的');
              assert.ok(b.left >= -1, at + '：参照刻度值左边跑出轨道 ' + String(b.left) + 'px');
              assert.ok(b.right <= 1, at + '：参照刻度值右边跑出轨道 ' + String(b.right) + 'px');
              assert.ok(b.w > 0, at + '：参照刻度值被压成 0 宽');
            }
            over.push({ width, skin, name: c.name, railW: m.railW, railH: m.railH, ratio: m.ratio });
          }
        }
      }
      /* ⑤ 换皮不换结构：四套皮肤里的标记逐字节相同。 */
      for (const c of list) {
        const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
          + 'for (var i = 0; i < skins.length; i += 1) {'
          + '  var el = document.querySelector("." + "ilife-skin-" + skins[i]'
          + ' + " [data-case=' + c.name + '] .' + PORTION_GAUGE_CLASS + '");'
          + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
          + '} return out;}())');
        const base = marks[SKIN_NAMES[0]];
        assert.ok(typeof base === 'string' && base.length > 0, c.name + '：真机上拿不到标记');
        for (const skin of SKIN_NAMES.slice(1)) {
          assert.equal(marks[skin], base, c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
        }
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of WIDTHS) {
        const cells = over.filter((s) => s.width === w);
        console.log('READING portion-gauge A 档 container=' + w
          + ' 轨道=' + cells.map((s) => s.railW + '×' + s.railH).join('／')
          + ' 条宽占比=' + cells.map((s) => s.ratio).join('／')
          + ' cells=' + cells.length);
      }
    } finally { page.close(); }
  });
});

/* ── ④b 宽档长占比句（真机）：占比条不许被长句挤成 0 宽 ──────────────── */

/** 宽档三档**容器**宽（481 是过窄档阈值 `PORTION_GAUGE_NARROW_PX` 的第一档；窄档走单列，不发生这条病）。 */
const WIDE_WIDTHS = [481, 620, 1280];
/** 占比项名的三种长度（字）：32／64／128。 */
const SHARE_LENGTHS = [32, 64, 128];
/** 长占比项名的料（中文长句在真机上按 max-content 吃宽——正是把条挤成 0 宽的那一类）。 */
const SHARE_FILLER = '一天需要的膳食纤维蛋白质维生素矿物质与微量元素合计摄入量'.repeat(8);
/** 长占比句压力样例：两行，占比 70／46（一行一个非零占比，逐点对账）。 */
const longShareInput = (len) => ({
  title: '份量换算', stamp: '菜谱 → 营养库', tail: '1 份 ＝ 350 g',
  rows: [
    { name: '红烧肉', kind: '主料', recipe: '2 份', grams: 700, shareOf: SHARE_FILLER.slice(0, len), sharePct: 70 },
    { name: '米饭', kind: '主食', recipe: '2 碗', grams: 300, basis: '1 碗 ＝ 150 g',
      toLabel: '生重', shareOf: SHARE_FILLER.slice(0, len), sharePct: 46 },
  ],
});
/** A 档那一侧的长串压力：两枚参照刻度值长到 32／64／128 字（占一行的长文本就是「位置由值算出」的对手）。 */
const longRefInput = (len) => ({
  title: '这一餐的量', form: 'gauge', tail: '≈ 350 g',
  gauge: {
    name: '红烧肉', usedPct: 58,
    capText: SHARE_FILLER.slice(0, len), refText: SHARE_FILLER.slice(0, len), refPct: 60,
  },
});
const LONG_REF_LENGTHS = [32, 64, 128];

describe('portion-gauge ④b 宽档长占比句（真机 headless Chrome ＋ CDP）', () => {
  const list = SHARE_LENGTHS.map((len) => ({ name: 'len' + String(len), len, pcts: [70, 46] }));
  const gaugeList = LONG_REF_LENGTHS.map((len) => ({ name: 'glen' + String(len), len }));
  const casesHtml = list.map((c) => '<section data-case="' + c.name + '">'
    + renderPortionGauge(longShareInput(c.len)) + '</section>').join('')
    + gaugeList.map((c) => '<section data-case="' + c.name + '">'
      + renderPortionGauge(longRefInput(c.len)) + '</section>').join('');

  /** 一格的真机读数：本件根 ＋ 每一行的轨宽／条宽／填充宽／那句占比。 */
  const MEASURE = '(function(){var root=document.querySelector(SEL);'
    + 'if(root===null)return null;'
    + 'var rows=[].slice.call(root.querySelectorAll(ROW));'
    + 'return{scrollW:root.scrollWidth,clientW:root.clientWidth,rows:rows.map(function(row){'
    + 'var obj=row.querySelector(OBJ),bar=row.querySelector(BAR),fill=row.querySelector(FILL);'
    + 'var share=row.querySelector(SHARE);'
    + 'var bw=bar.getBoundingClientRect().width,fw=fill.getBoundingClientRect().width;'
    + 'return{cols:getComputedStyle(obj).gridTemplateColumns,'
    + 'barW:Math.round(bw*10)/10,fillW:Math.round(fw*10)/10,'
    + 'ratio:bw===0?null:Math.round(fw/bw*1000)/10,'
    + 'pct:parseFloat(fill.style.width),'
    + 'said:parseFloat((share.textContent.match(/([\\d.]+)%/)||[])[1]),'
    + 'shareLen:share.textContent.length};})};}())';

  it('容器 481／620／1280 × 占比句 32／64／128 字：条恒有宽（≥ 最小宽）且填充与那句同源', async (t) => {
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">'
        + casesHtml + '</div>').join('\n'),
      css: skinCss() + '\n' + portionGaugeCss(),
      height: 1600,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性判据：占比条那一轨带最小宽 '
        + String(PORTION_GAUGE_BAR_MIN_PX) + 'px（旧写法 `minmax(0, 1fr) auto` 会被长占比句压成 0 宽）');
      const obj = ruleOf(stripComments(portionGaugeCss()), '.' + portionGaugeSlot('obj'));
      assert.ok(obj.includes('minmax(' + String(PORTION_GAUGE_BAR_MIN_PX) + 'px, 1fr)'),
        '占比条那一轨没有最小宽（长占比句会把条压成 0：条 0 宽、那句还写着 70%）：' + obj);
      return t.skip('本机无 Chrome／Chromium：宽档长占比句判据需真浏览器');
    }
    try {
      for (const width of WIDE_WIDTHS) {
        await page.setWidth(width);
        for (const skin of SKIN_NAMES) {
          for (const c of list) {
            const scope = '.' + skinClass(skin) + ' [data-case=' + c.name + '] ';
            const expr = MEASURE
              .replace('SEL', JSON.stringify(scope + '.' + PORTION_GAUGE_CLASS))
              .replace('ROW', JSON.stringify('.' + portionGaugeSlot('row')))
              .replace('OBJ', JSON.stringify('.' + portionGaugeSlot('obj')))
              .replace('BAR', JSON.stringify('.' + portionGaugeSlot('bar')))
              .replace('FILL', JSON.stringify('.' + portionGaugeSlot('fill')))
              .replace('SHARE', JSON.stringify('.' + portionGaugeSlot('share')));
            const m = await page.ev(expr);
            const at = width + ' 档 ' + skin + ' ' + c.name + '（占比句 ' + String(c.len) + ' 字）';
            assert.ok(m !== null, at + '：找不到本件根');
            assert.ok(m.scrollW <= m.clientW + 1, at + '：横向溢出 ' + m.scrollW + ' > ' + m.clientW);
            assert.equal(m.rows.length, c.pcts.length, at + '：行数不对');
            m.rows.forEach((r, i) => {
              const line = at + ' 第 ' + String(i + 1) + ' 行';
              /* 夹具自证：占比句真有那么长（不然这条判据在空转——短句挤不动条）。 */
              assert.ok(r.shareLen >= c.len, line + '：占比句只读到 ' + r.shareLen
                + ' 字（应 ≥ ' + c.len + '）⇒ 这条判据在空转');
              /* **头号读数**：条非 0 宽（旧写法在这里读到 0，那句照写着占比）。 */
              assert.ok(r.barW > 0, line + '：占比条被挤成 ' + r.barW + ' 宽（那句还写着 '
                + String(c.pcts[i]) + '%）｜gridTemplateColumns = ' + r.cols);
              assert.ok(r.barW >= PORTION_GAUGE_BAR_MIN_PX - 0.5, line + '：条只有 ' + r.barW
                + ' 宽，比最小宽 ' + String(PORTION_GAUGE_BAR_MIN_PX) + 'px 还窄｜gridTemplateColumns = ' + r.cols);
              /* **同源**：条宽由占比算出——行内宽度、印出来的那句、真机量到的比值三处对得上。 */
              assert.equal(r.pct, c.pcts[i], line + '：行内宽度不是占比本身');
              assert.equal(r.said, c.pcts[i], line + '：占比句与条宽走散');
              assert.ok(Math.abs(r.ratio - c.pcts[i]) <= 2, line + '：条宽占轨道 ' + r.ratio
                + '%，占比却是 ' + String(c.pcts[i]) + '%');
            });
            if (skin === SKIN_NAMES[0]) {
              console.log('READING portion-gauge 宽档 w=' + String(width) + ' ' + c.name
                + ' cols=' + JSON.stringify(m.rows[0].cols) + ' barW=' + String(m.rows[0].barW)
                + ' fillW=' + String(m.rows[0].fillW) + ' ratio=' + String(m.rows[0].ratio)
                + ' pct=' + String(m.rows[0].pct) + ' 各行barW=[' + m.rows.map((r) => r.barW).join('、') + ']');
            }
          }
        }
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      /* ── A 档那一侧：**同一个病同一条判据**（长参照刻度值不许把轨道与已用那一段挤没）──
         真机读数：A 档的参照刻度值走**在流的两行**（长了自己换行），推不出轨道也压不扁轨道。 */
      const gaugeCells = [];
      for (const width of WIDE_WIDTHS) {
        await page.setWidth(width);
        for (const skin of SKIN_NAMES) {
          for (const c of gaugeList) {
            const scope = '.' + skinClass(skin) + ' [data-case=' + c.name + '] ';
            const m = await page.ev(gaugeMeasureExpr(scope));
            const at = width + ' 档 ' + skin + ' ' + c.name
              + '（A 档参照刻度值 ' + String(c.len) + ' 字）';
            assert.ok(m !== null, at + '：找不到本件根');
            assert.ok(m.scrollW <= m.clientW + 1, at + '：横向溢出 ' + m.scrollW + ' > ' + m.clientW);
            /* **头号读数**：轨道与已用那一段都没被长参照刻度值挤没。 */
            assert.ok(m.railW >= PORTION_GAUGE_BAR_MIN_PX - 0.5, at + '：轨道只有 ' + String(m.railW)
              + ' 宽，比最小宽 ' + String(PORTION_GAUGE_BAR_MIN_PX) + 'px 还窄');
            assert.ok(m.usedW > 0, at + '：已用那一段被挤成 ' + String(m.usedW) + ' 宽（大字还写着 58%）');
            /* **同源**：行内宽度、印出来的大字、真机量到的比值三处对得上。 */
            assert.equal(m.pct, 58, at + '：行内宽度不是占比本身');
            assert.equal(m.said, 58, at + '：大字与条宽走散');
            assert.ok(Math.abs(m.ratio - 58) <= 2, at + '：条宽占轨道 ' + String(m.ratio) + '%，大字却写着 58%');
            /* 两枚参照刻度值：长了自己换行，右边不许跑出轨道（左边同一把尺）。 */
            assert.equal(m.labels.length, 2, at + '：两枚参照刻度值都要在');
            for (const b of m.labels) {
              /* 夹具自证：那两行话真有那么长（不然这条判据在空转——短话挤不扁轨道）。 */
              assert.ok(b.text >= c.len, at + '：参照刻度值只读到 ' + String(b.text)
                + ' 字（应 ≥ ' + String(c.len) + '）⇒ 这条判据在空转');
              assert.ok(b.left >= -1, at + '：参照刻度值左边跑出轨道 ' + String(b.left) + 'px');
              assert.ok(b.right <= 1, at + '：参照刻度值右边跑出轨道 ' + String(b.right) + 'px');
              assert.ok(b.w > 0, at + '：参照刻度值被压成 0 宽');
            }
            gaugeCells.push({ width, railW: m.railW, ratio: m.ratio });
            if (skin === SKIN_NAMES[0]) {
              console.log('READING portion-gauge A 档宽档 w=' + String(width) + ' ' + c.name
                + ' 轨道宽=' + String(m.railW) + ' 已用宽=' + String(m.usedW)
                + ' ratio=' + String(m.ratio) + ' 参照刻度值边界=['
                + m.labels.map((b) => b.left + '…' + b.right).join('、') + ']');
            }
          }
        }
      }
      assert.ok(gaugeCells.length === WIDE_WIDTHS.length * SKIN_NAMES.length * gaugeList.length,
        'A 档宽档那一组没跑满（判据可能空转）');
    } finally { page.close(); }
  });
});

/* ── ⑦ 说明书自证：两块样例（带那四个字的那块给派生器，A 档那块的信息串不带那四个字） ── */

describe('portion-gauge ⑦ 说明书自证（两块样例都要直渲成功）', () => {
  const README = readFileSync(join(PKG, 'src', 'components', 'portion-gauge', 'README.md'), 'utf8');
  const blocks = (info) => [...README.matchAll(
    new RegExp('```json ' + info + '\\n([\\s\\S]*?)```', 'g'))].map((m) => m[1]);

  it('带「示例入参」四字的块恰好一块（派生器只认它），是合法 JSON 且直渲成功', () => {
    const derived = blocks('示例入参');
    assert.equal(derived.length, 1, '全仓一件只许一块带「示例入参」的块（两块就不知道拿哪一份渲染）');
    const sample = JSON.parse(derived[0]);
    assert.equal(typeof sample === 'object' && sample !== null && !Array.isArray(sample), true, '示例是一份 JSON 对象');
    const html = renderPortionGauge(sample);
    assert.match(html, new RegExp('^<div class="' + PORTION_GAUGE_CLASS + ' is-convert">'),
      '派生器那份样例是 B 档（先落地那一档不动）');
    assert.ok(html.includes(portionGaugeSlot('conv')), '示例渲染出换算行区');
  });

  it('A 档那块的信息串**不带**那四个字，是合法 JSON 且直渲成功', () => {
    const shown = blocks('形态 gauge 的入参');
    assert.equal(shown.length, 1, 'README 里要有一块 A 档的入参样例（信息串不带「示例入参」四字）');
    assert.equal(shown[0].includes('示例入参'), false);
    const sample = JSON.parse(shown[0]);
    assert.equal(sample.form, 'gauge', 'A 档样例自己写着形态键');
    const html = renderPortionGauge(sample);
    assert.match(html, new RegExp('^<div class="' + PORTION_GAUGE_CLASS + ' is-gauge">'));
    assert.ok(html.includes(portionGaugeSlot('rail')) && html.includes(portionGaugeSlot('used')),
      '样例渲染出尺度：轨道与已用那一段都在');
    assert.equal(gaugeBarOk(html), true, '样例自己也要过「条宽恒由占比算出」');
    assert.equal(gaugeLeanOk(html, String(sample.gauge.usedPct) + '%'), true,
      'README 上这一份样例就是砍过字的那一版（可见字 ≤ 72、那个数只印一次）');
  });
});
