/** portion-gauge（量感条 · 换算三栏）· 契约测试。
 *
 * 覆盖六组判据：
 *  ① **渲染契约**：骨架与行数／**换算链三栏同一份真值**（从**印出来的占比句**反推百分比，
 *     再把每一条的宽度逐点对账；克数串与菜谱串两处同引；小数占比与 0／100 两档边界也在里面）／
 *     缺换算那一支／转义面／**全部**非法入参分支（每个都断 `BlocksError`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且**只出现一次**、
 *     零 `:root`／`!important`／零新 token／零 `@media` 宽度查询／零手写色值／零把 `ink` 系当面／
 *     零可点元素／**窄档阈值只有一处来源**；
 *  ③ **加法式**：本件只读自己的类名；不启用它的页面零命中、逐字节不变；
 *  ④ **四档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 320／390／620／1280 下零横向溢出
 *     （含长口径／长单位／满 8 行三种压力样例）、**每一条**的宽度与占比句的百分比逐点对上
 *     （差 ≤2 个百分点）、窄档换算框改走单列（`@container` 真在生效）、数值零截断；
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
  PORTION_GAUGE_CLASS,
  PORTION_GAUGE_FORMS,
  PORTION_GAUGE_MAX_ROWS,
  PORTION_GAUGE_MIN_ROWS,
  PORTION_GAUGE_NARROW_PX,
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
    assert.deepEqual([...PORTION_GAUGE_FORMS], ['convert']);
    assert.match(renderPortionGauge({ ...SINGLE_INPUT, form: 'convert' }), /is-convert/);
    assert.match(renderPortionGauge(SINGLE_INPUT), /is-convert/, '缺省就是换算三栏');
    for (const bad of ['B', 'A', 'gauge', 'convert2', '']) {
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

  it('⑥ 分隔符门：本件生成的字里不出现分隔符（R1–R3 零命中）', () => {
    for (const [name, input] of [['standard', STANDARD_INPUT], ['single', SINGLE_INPUT],
      ['full', FULL_INPUT], ['edge', EDGE_INPUT], ['long', LONG_INPUT]]) {
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
