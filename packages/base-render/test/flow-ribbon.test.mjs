/** flow-ribbon（流向带 · 三个形态：桑基带／交叉矩阵／两条构成轨）· 契约测试。
 *
 *  覆盖五组判据：
 *  ① **渲染契约**：三形态各自的槽位与枚数／**一把尺子**（从**印出来的读数**反推每一处几何：
 *     节点高、带子两端的高、矩阵条长、构成轨格宽——**两侧混着比**，这正是历史缺陷「左右两列各自归一」的落点）／
 *     每一条读数恰好印一次／矩阵的行合计＝列合计／构成轨格宽加起来恰好 100%／转义面／
 *     **全部**非法入参分支（每个都断 `BlocksError`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且**只出现一次**、
 *     零 `:root`／`!important`／零新 token／零按视口宽度的媒体查询／零手写色值（只有 `skinVar()` 兜底链那一处）／
 *     零把 `ink` 系当面／零键盘语汇／零可点元素（触屏地板的 44px 与焦点环仍在样式里）／
 *     **格宽写在 `width` 上**（不是靠内容撑——那是历史缺陷「格宽根本没按占比画」的落点）；
 *  ③ **加法式**：本件只读自己的类名；不启用它的页面零命中、逐字节不变；
 *  ④ **四档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 320／390／620／1280 下零横向溢出
 *     （含长口径／长名字／12 位金额三种压力样例）、关键读数零截断、**像素比 ＝ 读数比**；
 *     **起不来就退确定性几何判据并打印原因**；
 *  ⑤ **皮肤纪律**：同一份入参渲染三次逐字节相同、标记不带皮肤类、真机上四套皮肤里的 `innerHTML`
 *     逐字节相同。
 *
 *  期望值一律从组件自己的常量派生（`FLOW_RIBBON_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FLOW_RIBBON_CLASS,
  FLOW_RIBBON_FONT_PX,
  FLOW_RIBBON_FORMS,
  FLOW_RIBBON_GAP_PCT,
  FLOW_RIBBON_LABEL_MIN_PX,
  FLOW_RIBBON_MAX_LINKS,
  FLOW_RIBBON_MAX_NAME_CHARS,
  FLOW_RIBBON_MAX_SOURCES,
  FLOW_RIBBON_MAX_USES,
  FLOW_RIBBON_MISSING,
  FLOW_RIBBON_NARROW_PX,
  FLOW_RIBBON_NODE_COL_PX,
  FLOW_RIBBON_NODE_INNER_PX,
  FLOW_RIBBON_PLOT_MAX_PX,
  FLOW_RIBBON_PLOT_MIN_PX,
  FLOW_RIBBON_SEG_MIN_PCT,
  FLOW_RIBBON_SLOTS,
  flowRibbonCss,
  flowRibbonSlot,
  renderFlowRibbon,
} from '../dist/components/flow-ribbon/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderHeatGrid } from '../dist/components/heat-grid/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKINS, skinCss, skinClass } from '../dist/components/skin/index.js';
import { SKIN_NAMES } from '../dist/components/skin/contract.js';
import { startShapesPage } from './shapes-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'flow-ribbon');

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

/* ── 从**印出来的标记**里读回几何与读数（判据不 re-run 公式，只读屏上那份） ──── */

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const num = (text) => Number(String(text).replace(/[,\s]/g, ''));
const r2 = (n) => Math.round(n * 100) / 100;

/** 节点：`--flow-ribbon-t` / `--flow-ribbon-h` ＋ 框里印着的名字与金额（装不下时框里没有字）。 */
function nodesOf(html) {
  const re = new RegExp('class="' + esc(flowRibbonSlot('node')) + ' is-(src|use)( is-bare)?"[^>]*style="'
    + '--flow-ribbon-t: ([\\d.]+)%; --flow-ribbon-h: ([\\d.]+)%"[^>]*>', 'g');
  return [...html.matchAll(re)].map((m) => {
    const rest = html.slice(m.index);
    const text = /^(<b class="[^"]*-nd-name">([^<]*)<\/b><em class="[^"]*-nd-amount">([^<]*)<\/em>)?/
      .exec(rest.slice(m[0].length));
    return { side: m[1], bare: m[2] === ' is-bare', top: Number(m[3]), height: Number(m[4]),
      name: text[2] === undefined ? '' : text[2], amountText: text[3] === undefined ? '' : text[3] };
  });
}

/** 带子：左右两端的上下沿。 */
function lanesOf(html) {
  const re = new RegExp('class="' + esc(flowRibbonSlot('lane')) + ' is-s\\d"[^>]*title="([^"]*)"[^>]*style="'
    + '--flow-ribbon-l1: ([\\d.]+)%; --flow-ribbon-l2: ([\\d.]+)%; '
    + '--flow-ribbon-r1: ([\\d.]+)%; --flow-ribbon-r2: ([\\d.]+)%"', 'g');
  return [...html.matchAll(re)].map((m) => ({ title: m[1], l1: Number(m[2]), l2: Number(m[3]),
    r1: Number(m[4]), r2: Number(m[5]) }));
}

/** 读数名单（桑基装不下的那些；构成轨的逐条名单）。 */
function readoutsOf(html) {
  const re = new RegExp('class="' + esc(flowRibbonSlot('readout-row')) + '">'
    + '<i class="[^"]*-swatch [^"]*"[^>]*></i>'
    + '<b class="[^"]*-readout-name">([^<]*)</b>'
    + '<span class="[^"]*-readout-amount">([^<]*)</span>'
    + '<span class="[^"]*-readout-share">([^<]*)</span>', 'g');
  return [...html.matchAll(re)].map((m) => ({ name: m[1], amountText: m[2], shareText: m[3] }));
}

/** 矩阵的格（行／合计行都算；`--flow-ribbon-w` 是这一格 ÷ 全表最大格）。 */
function cellsOf(html) {
  const re = new RegExp('class="' + esc(flowRibbonSlot('mat-cell')) + '( is-empty)?" data-use="([^"]*)"[^>]*>'
    + '(?:<i class="[^"]*-cell-bar"[^>]*style="--flow-ribbon-w: ([\\d.]+)%; --flow-ribbon-mix: ([\\d.]+)%"><\\/i>)?'
    + '<b class="[^"]*-cell-num">([^<]*)</b>(?:<em class="[^"]*-cell-pct">([^<]*)</em>)?', 'g');
  return [...html.matchAll(re)].map((m) => ({ empty: m[1] === ' is-empty', use: m[2], barPct: m[3] === undefined ? 0 : Number(m[3]),
    mixPct: m[4] === undefined ? 0 : Number(m[4]), amountText: m[5], shareText: m[6] === undefined ? '' : m[6] }));
}

/** 构成轨的格（按轨分两组：来源轨在前、用途轨在后）。 */
function segsOf(html) {
  const split = html.indexOf(flowRibbonSlot('rails-hd') + '">钱到哪去');
  const before = split < 0 ? html : html.slice(0, split);
  const after = split < 0 ? '' : html.slice(split);
  const one = (part) => [...part.matchAll(new RegExp('class="' + esc(flowRibbonSlot('seg')) + '"[^>]*title="([^"]*)"'
    + '[^>]*style="--flow-ribbon-w: ([\\d.]+)%">(?:<b class="[^"]*-seg-pct">([^<]*)</b>)?', 'g'))]
    .map((m) => ({ title: m[1], widthPct: Number(m[2]), pctText: m[3] === undefined ? '' : m[3] }));
  return { src: one(before), use: one(after) };
}

/* ── 样例 ─────────────────────────────────────────────────────────── */

const SOURCES = [{ name: '工资' }, { name: '其他' }, { name: '上期' }];
const USES = [{ name: '餐饮' }, { name: '日用' }, { name: '储蓄' }, { name: '结余' }];
const LINKS = [
  { from: '工资', to: '餐饮', amount: 3180 }, { from: '工资', to: '日用', amount: 1960 },
  { from: '工资', to: '储蓄', amount: 2000 }, { from: '工资', to: '结余', amount: 860 },
  { from: '其他', to: '结余', amount: 1500 }, { from: '上期', to: '结余', amount: 2100 },
];
const TOTAL = LINKS.reduce((acc, l) => acc + l.amount, 0);
/** 两列共用的跨度：`100 − 缝 × (较多那一列 − 1)`（与 `attrs.ts` 的两个常量同源）。 */
const SPAN = 100 - FLOW_RIBBON_GAP_PCT * (Math.max(SOURCES.length, USES.length) - 1);
const BASE = { title: '钱从哪来、花到哪去', stamp: '09-01 – 09-24', sources: SOURCES, uses: USES, links: LINKS };

const SANKEY = renderFlowRibbon(BASE);
const MATRIX = renderFlowRibbon({ ...BASE, form: 'matrix' });
const RAILS = renderFlowRibbon({ ...BASE, form: 'rails' });
/** 一列里最细的一股（占 1%）：它的读数放不进框，必须整条搬到名单里。 */
const THIN = renderFlowRibbon({
  title: '细股', sources: [{ name: '临时接济' }, { name: '工资' }], uses: [{ name: '结余' }],
  links: [{ from: '工资', to: '结余', amount: 9900 }, { from: '临时接济', to: '结余', amount: 100 }],
});

/* ── ① 渲染契约：三形态的骨架 ───────────────────────────────────────── */

describe('flow-ribbon ① 渲染契约 · 三形态骨架', () => {
  it('形态闭集是英文键（不是 A／B／C），缺省 sankey', () => {
    assert.deepEqual([...FLOW_RIBBON_FORMS], ['sankey', 'matrix', 'rails']);
    assert.match(renderFlowRibbon({ ...BASE }), new RegExp('^<div class="' + FLOW_RIBBON_CLASS + ' is-sankey"'));
    assert.match(MATRIX, new RegExp('^<div class="' + FLOW_RIBBON_CLASS + ' is-matrix"'));
    assert.match(RAILS, new RegExp('^<div class="' + FLOW_RIBBON_CLASS + ' is-rails"'));
  });

  it('sankey：卡头 ＋ 画布（带子 ＋ 两列节点）＋ 图例 ＋ 脚注，枚数逐项对得上', () => {
    assert.equal(countOf(SANKEY, 'class="[^"]*-lane '), LINKS.length, '一笔流量一条带子');
    assert.equal(nodesOf(SANKEY).length, SOURCES.length + USES.length, '两列节点＝来源 ＋ 用途');
    assert.equal(countOf(SANKEY, 'class="[^"]*-legend-item"'), SOURCES.length, '图例一股来源一项');
    assert.match(SANKEY, /role="img" aria-label="桑基图：左边 3 股来源/);
    assert.match(SANKEY, /tail">共 11,600 元</);
    assert.ok(!/<script/i.test(SANKEY), '不产脚本');
    for (const slot of ['hd', 'title', 'stamp', 'tail', 'plot', 'legend', 'note']) {
      assert.ok(SANKEY.includes(flowRibbonSlot(slot)), '缺槽：' + slot);
    }
    assert.ok(SANKEY.includes('--flow-ribbon-plot-h:'), '画布高由本件算出来（不是写死的）');
  });

  it('matrix：表头 ＋ 逐来源一行 ＋ 合计行；空格写 `—`（不是 0）', () => {
    const cells = cellsOf(MATRIX);
    assert.equal(cells.length, SOURCES.length * USES.length, '行 × 列');
    assert.equal(cells.filter((c) => c.empty).length, 6, '其他／上期各 3 格没往那里流');
    for (const c of cells.filter((x) => x.empty)) assert.equal(c.amountText, FLOW_RIBBON_MISSING);
    assert.equal(countOf(MATRIX, 'cell-num">0<'), 0, '空格不许写 0');
    assert.equal(countOf(MATRIX, 'class="[^"]*-mat-total"'), USES.length, '合计行逐列一格');
    assert.ok(MATRIX.includes('来源 ＼ 用途'), '左上角那格说清行与列是什么');
    assert.match(MATRIX, /mat-rowhd" scope="row">工资<em class="[^"]*-cell-num">8,000<\/em>/);
    /* 口径行是**屏上的字**：不许漏进 markdown 的强调号（`**` 会被当真字读出来）。 */
    for (const [name, html] of [['sankey', SANKEY], ['matrix', MATRIX], ['rails', RAILS], ['thin', THIN]]) {
      assert.equal(/\*\*/.test(html), false, name + ' 的标记里漏进了 markdown 强调号');
    }
  });

  it('rails：两条轨 ＋ 中间汇合读数 ＋ 逐条名单；格宽放不下百分数的格子不出字', () => {
    const segs = segsOf(RAILS);
    assert.equal(segs.src.length, SOURCES.length);
    assert.equal(segs.use.length, USES.length);
    assert.match(RAILS, /hub-eq">进 11,600 ＝ 出 11,600 元</);
    assert.match(RAILS, /hub-net">净 \+0 元</);
    assert.equal(readoutsOf(RAILS).length, SOURCES.length + USES.length, '两条轨的读数逐条写全');
    for (const seg of segs.src.concat(segs.use)) {
      if (seg.widthPct >= FLOW_RIBBON_SEG_MIN_PCT) assert.notEqual(seg.pctText, '', '够宽就要出百分数');
      else assert.equal(seg.pctText, '', '放不下就不出字（读数仍在名单里）');
    }
  });

  it('缺槽就不出那一槽：不给 stamp 就没有 stamp、单股时图例只有一项', () => {
    const bare = renderFlowRibbon({ title: 'x', sources: [{ name: 'A' }], uses: [{ name: 'B' }],
      links: [{ from: 'A', to: 'B', amount: 3 }] });
    assert.equal(bare.includes(flowRibbonSlot('stamp')), false);
    assert.equal(countOf(bare, 'class="[^"]*-legend-item"'), 1, '图例一股来源一项（不是"没来源就不出"）');
    assert.equal(bare.includes(flowRibbonSlot('readout')), false, '读数都放得进框就不出名单那一块');
    assert.ok(bare.includes('--flow-ribbon-plot-h: ' + String(FLOW_RIBBON_PLOT_MIN_PX) + 'px'),
      '单股时画布取到下限（' + String(FLOW_RIBBON_PLOT_MIN_PX) + 'px）');
  });
});

/* ── ① 渲染契约：一把尺子（本件的头号口径） ─────────────────────────── */

describe('flow-ribbon ① 一把尺子：三处几何与读数同源（从印出来的读数反推）', () => {
  it('桑基：**两侧混着比**——每股／每格的高 ÷ 它自己的金额，比值恒等（历史缺陷「两列各自归一」的落点）', () => {
    const nodes = nodesOf(SANKEY).filter((n) => !n.bare);
    assert.equal(nodes.length, SOURCES.length + USES.length, '本例每个读数都放得进框');
    /* 先从**屏上印的金额**推回机器数（判据不 re-run 公式，只读屏上那份。 */
    const per = nodes.map((n) => n.height / num(n.amountText));
    for (const v of per) {
      assert.ok(Math.abs(v - per[0]) / per[0] < 0.01,
        '同一把尺子破功：每元占的高不一致 ' + JSON.stringify(nodes.map((n) => n.name + '=' + n.height + '/' + n.amountText)));
    }
    /* 逐节点对账：高 ＝ 金额 ÷ 总额 × 跨度（跨度是两列共用的那个数）。 */
    for (const n of nodes) {
      const want = num(n.amountText) / TOTAL * SPAN;
      assert.ok(Math.abs(n.height - want) <= 0.05, n.name + ' 的高 ' + n.height + ' 与它的读数算出来的 ' + r2(want) + ' 对不上');
    }
    /* 左右各取一个大股：**带宽比 ＝ 读数比**（横着比，这正是「同一把尺子」要保证的事）。 */
    const left = nodes.find((n) => n.name === '工资');
    const right = nodes.find((n) => n.name === '结余');
    const got = left.height / right.height;
    const want = num(left.amountText) / num(right.amountText);
    assert.ok(Math.abs(got - want) / want < 0.01, '带宽比 ' + r2(got) + ' ≠ 读数比 ' + r2(want));
    /* 百分比恒在画布内；同一列相邻两个节点之间留出那段缝（缝不代表金额，但两列同一段缝）。 */
    for (const side of ['src', 'use']) {
      const col = nodes.filter((n) => n.side === side);
      for (const n of col) assert.ok(n.top >= 0 && r2(n.top + n.height) <= 100.05, n.name + ' 的框跑出画布：' + n.top + '+' + n.height);
      col.slice(0, -1).forEach((n, i) => {
        const gap = r2(col[i + 1].top - (n.top + n.height));
        assert.ok(Math.abs(gap - FLOW_RIBBON_GAP_PCT) <= 0.05, n.name + ' 与下一股之间的缝是 ' + gap + '，不是 ' + FLOW_RIBBON_GAP_PCT);
      });
    }
  });

  it('桑基：**一条带子两端一样高**，且那个高 ＝ 这笔金额 × 同一把尺子；同一节点的子带铺满它', () => {
    const lanes = lanesOf(SANKEY);
    assert.equal(lanes.length, LINKS.length);
    for (const lane of lanes) {
      const left = r2(lane.l2 - lane.l1);
      const right = r2(lane.r2 - lane.r1);
      assert.ok(Math.abs(left - right) <= 0.02, '两端不一样高：' + JSON.stringify(lane));
      const amount = num(/：([\d,]+) 元/.exec(lane.title)[1]);
      assert.ok(Math.abs(left - amount / TOTAL * SPAN) <= 0.05,
        lane.title + ' 的带宽 ' + left + ' 与它的金额算出来的 ' + r2(amount / TOTAL * SPAN) + ' 对不上');
    }
    /* 带子的高之比 ＝ 金额之比（从**印在 title 里的读数**反推）。 */
    const amounts = lanes.map((l) => num(/：([\d,]+) 元/.exec(l.title)[1]));
    const heights = lanes.map((l) => r2(l.l2 - l.l1));
    const iMax = amounts.indexOf(Math.max(...amounts));
    const iMin = amounts.indexOf(Math.min(...amounts));
    const got = heights[iMax] / heights[iMin];
    const want = amounts[iMax] / amounts[iMin];
    assert.ok(Math.abs(got - want) / want < 0.01, '带宽比 ' + r2(got) + ' ≠ 读数比 ' + r2(want));
    /* 每个节点的子带加起来 ＝ 它的框高（±0.05：逐条带子各自取整到两位小数）。 */
    const nodes = nodesOf(SANKEY);
    for (const node of nodes) {
      const tops = (l) => (node.side === 'src' ? [l.l1, l.l2] : [l.r1, l.r2]);
      const mine = lanes.filter((l) => tops(l)[0] >= node.top - 0.01
        && r2(tops(l)[1]) <= r2(node.top + node.height) + 0.01);
      if (mine.length === 0) continue;
      const sum = r2(mine.reduce((acc, l) => acc + (l.l2 - l.l1), 0));
      assert.ok(Math.abs(sum - node.height) <= 0.05, node.side + ' 侧某节点的子带 ' + sum + ' ≠ 框高 ' + node.height);
    }
  });

  it('矩阵：条长按**全表最大格**算（不是本行最大），条长比 ＝ 读数比；合计自洽', () => {
    const cells = cellsOf(MATRIX);
    const filled = cells.filter((c) => !c.empty);
    assert.equal(filled.reduce((acc, c) => (c.barPct === 100 ? acc + 1 : acc), 0), 1, '全表最大格恰好一格满格');
    const maxAmount = Math.max(...filled.map((c) => num(c.amountText)));
    for (const c of filled) {
      const want = num(c.amountText) / maxAmount * 100;
      assert.ok(Math.abs(c.barPct - want) <= 0.05, c.use + ' 的条长 ' + c.barPct + ' ≠ ' + r2(want) + '（按全表最大格算）');
    }
    /* 条长之比 ＝ 两条读数的比。 */
    const a = filled[0];
    const b = filled[1];
    assert.ok(Math.abs(a.barPct / b.barPct - num(a.amountText) / num(b.amountText)) / (num(a.amountText) / num(b.amountText)) < 0.01);
    /* 行合计 ＝ 该行各格之和；列合计 ＝ 全表对应列之和；两边都等于总额。 */
    const rows = [0, 1, 2].map((i) => cells.slice(i * USES.length, (i + 1) * USES.length));
    const rowTotals = [...MATRIX.matchAll(/mat-rowhd" scope="row">[^<]*<em class="[^"]*-cell-num">([^<]*)<\/em>/g)].map((m) => num(m[1]));
    rows.forEach((cellsOfRow, i) => {
      const sum = cellsOfRow.reduce((acc, c) => acc + (c.empty ? 0 : num(c.amountText)), 0);
      assert.equal(rowTotals[i], sum, '第 ' + String(i + 1) + ' 行的合计不是它各格之和');
    });
    assert.equal(rowTotals.reduce((acc, v) => acc + v, 0), TOTAL, '行合计加起来＝总额');
    const colTotals = [...MATRIX.matchAll(/class="[^"]*-mat-total" data-use="[^"]*"[^>]*>.*?cell-num">([^<]*)</g)].map((m) => num(m[1]));
    assert.equal(colTotals.length, USES.length);
    assert.equal(colTotals.reduce((acc, v) => acc + v, 0), TOTAL, '列合计加起来＝总额（进 ＝ 出）');
  });

  it('构成轨：格宽比 ＝ 读数比；两条轨各自拉满 100%（两轨横着比才是同一把尺子）', () => {
    const segs = segsOf(RAILS);
    for (const [name, list] of [['来源', segs.src], ['用途', segs.use]]) {
      const sum = list.reduce((acc, s) => acc + s.widthPct, 0);
      assert.equal(r2(sum), 100, name + '轨的格宽加起来是 ' + sum + '（不是 100——轨没拉满）');
      const amounts = list.map((s) => num(/ ([\d,]+)（占总额/.exec(s.title)[1]));
      list.forEach((s, i) => {
        const want = amounts[i] / TOTAL * 100;
        assert.ok(Math.abs(s.widthPct - want) <= 0.1, name + '轨第 ' + String(i + 1) + ' 格宽 ' + s.widthPct + ' ≠ ' + r2(want));
      });
      for (const s of list) if (s.pctText !== '') assert.equal(s.pctText, String(s.widthPct) + '%', '格上的百分数与它的宽度同源');
    }
    /* 两条轨**同一总额**：同一块钱在两条轨上占的宽相同（历史缺陷「各自归一」的另一处落点）。 */
    const ratio = (list, i, j) => list[i].widthPct / list[j].widthPct;
    assert.ok(Math.abs(ratio(segs.src, 0, 1) - TOTAL * 0.69 / (TOTAL * 0.129)) < 0.5, '来源轨内部宽度比');
    const srcPerPct = segs.src[0].widthPct / num(/ ([\d,]+)（占总额/.exec(segs.src[0].title)[1]);
    const usePerPct = segs.use[0].widthPct / num(/ ([\d,]+)（占总额/.exec(segs.use[0].title)[1]);
    assert.ok(Math.abs(srcPerPct - usePerPct) / srcPerPct < 0.01, '两条轨每元占的宽不同：上下两轨不能横着比');
  });

  it('**每一条读数恰好印一次**：装不进框的那条整条搬到名单里（不是压小、不是截断）', () => {
    const nodes = nodesOf(THIN);
    const bare = nodes.filter((n) => n.bare);
    const rows = readoutsOf(THIN);
    assert.equal(bare.length, 1, '最细那一股（1%）的框放不下读数');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, '临时接济');
    assert.equal(rows[0].amountText, '100');
    /* 名字在「框里 ∪ 名单里」恰好出现一次。 */
    const shown = nodes.filter((n) => !n.bare).map((n) => n.name).concat(rows.map((r) => r.name));
    for (const src of ['临时接济', '工资', '结余']) {
      assert.equal(shown.filter((s) => s === src).length, 1, src + ' 的读数印了 ' + shown.filter((s) => s === src).length + ' 次');
    }
    assert.ok(THIN.includes('--flow-ribbon-plot-h: ' + String(FLOW_RIBBON_PLOT_MAX_PX) + 'px'),
      '画布高顶到上限仍放不下 ⇒ 走名单（上限 ' + String(FLOW_RIBBON_PLOT_MAX_PX) + 'px）');
    /* 标着 `inside` 的框必须真的装得下两行读数。 */
    for (const node of nodesOf(SANKEY).filter((n) => !n.bare)) {
      const plotPx = Number(/--flow-ribbon-plot-h: (\d+)px/.exec(SANKEY)[1]);
      assert.ok(node.height / 100 * plotPx >= FLOW_RIBBON_LABEL_MIN_PX - 0.1,
        node.name + ' 的框只有 ' + r2(node.height / 100 * plotPx) + 'px，装不下两行读数');
    }
  });

  it('名字或金额比框宽时同样搬名单（框宽是常量给的，估宽只决定去留）', () => {
    const wide = renderFlowRibbon({
      title: '长金额', sources: [{ name: '工资' }], uses: [{ name: '结余' }],
      links: [{ from: '工资', to: '结余', amount: 123456789012 }],
    });
    const node = nodesOf(wide)[0];
    assert.equal(node.bare, true, '12 位金额比框宽（' + String(FLOW_RIBBON_NODE_INNER_PX) + 'px）⇒ 搬名单');
    assert.equal(readoutsOf(wide)[0].amountText, '123,456,789,012', '金额原样印在名单里（一位不少）');
    /* 名字：12 个中日韩字符 ≈ 144px，比框宽（内宽常量）大 ⇒ 同样搬名单。 */
    const longName = '工资奖金补贴报销退款结算'.slice(0, Math.max(FLOW_RIBBON_MAX_NAME_CHARS, 12));
    assert.ok(longName.length * FLOW_RIBBON_FONT_PX > FLOW_RIBBON_NODE_INNER_PX, '夹具本身要够长，否则这条判据在空转');
    const named = renderFlowRibbon({
      title: '长名字', sources: [{ name: longName }], uses: [{ name: '结余' }],
      links: [{ from: longName, to: '结余', amount: 10 }],
    });
    assert.equal(nodesOf(named)[0].bare, true, '名字比框宽 ⇒ 搬名单');
    assert.equal(readoutsOf(named).some((r) => r.name === longName), true, '长名字原样印在名单里');
  });
});

/* ── ① 渲染契约：公共面与非法入参 ───────────────────────────────────── */

describe('flow-ribbon ① 转义面与非法入参（逐条断 BlocksError）', () => {
  it('转义面：标题／名单／时间窗／口径／附加类名逐位转义，塞不进标签与属性', () => {
    const evil = '"><b>a(1)';
    const html = renderFlowRibbon({
      title: evil, stamp: evil, note: evil, unit: evil,
      sources: [{ name: evil }], uses: [{ name: 'x' }], links: [{ from: evil, to: 'x', amount: 1 }],
    });
    assert.equal(/<b>alert/.test(html), false, '不得出现可执行标记');
    assert.ok(html.includes('&lt;b&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
  });

  it('入参违规一律拒（不静默降级）：形态／名单／流量／名字 逐条', () => {
    const ok = { title: 'x', sources: [{ name: 'A' }], uses: [{ name: 'B' }], links: [{ from: 'A', to: 'B', amount: 1 }] };
    assert.equal(throwsBlocks(() => renderFlowRibbon(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderFlowRibbon([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderFlowRibbon('x')), true, '串不是入参');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ sources: ok.sources, uses: ok.uses, links: ok.links })), true, '缺标题');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, title: '' })), true, '空标题');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, title: '   ' })), true, '全空白标题');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, stamp: '   ' })), true, '可选文本全空白同样拒');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, note: ' \n ' })), true);
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, unit: '  ' })), true);
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, form: 'cloud' })), true, '形态闭集外');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, form: 'A' })), true, 'A／B／C 不是键');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, extraClass: 'a"b' })), true);
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, extraClass: '   ' })), true);
    /* 名单。 */
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, sources: undefined })), true, '缺 sources');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, sources: [] })), true, '空名单');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, sources: 'A' })), true, '名单不是数组');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, sources: [null] })), true, '元素不是对象');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, sources: [{ name: '' }] })), true, '名字空');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, sources: [{ name: '\u3000' }] })), true, '名字全空白');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, sources: [{ name: 'x'.repeat(FLOW_RIBBON_MAX_NAME_CHARS + 1) }] })), true, '名字太长');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, uses: [{ name: 'B' }, { name: 'B' }],
      links: [{ from: 'A', to: 'B', amount: 1 }] })), true, '名单里重名');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, uses: [{ name: 'B' }, { name: 'C' }],
      links: [{ from: 'A', to: 'B', amount: 1 }] })), true, '名单里有一项一笔流量都没有');
    /* 流量。 */
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, links: undefined })), true, '缺 links');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, links: [] })), true, '一笔都没有');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, links: [{ from: 'A', to: 'B', amount: 0 }] })), true, '零金额');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, links: [{ from: 'A', to: 'B', amount: -1 }] })), true, '负金额');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, links: [{ from: 'A', to: 'B', amount: Number.NaN }] })), true, 'NaN');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, links: [{ from: 'A', to: 'B', amount: '1' }] })), true, '金额不是数');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, links: [{ from: 'Z', to: 'B', amount: 1 }] })), true, 'from 不在来源名单');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, links: [{ from: 'A', to: 'Z', amount: 1 }] })), true, 'to 不在用途名单');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, links: [{ from: 'A', to: 'B', amount: 1 }, { from: 'A', to: 'B', amount: 2 }] })), true,
      '同一对两笔（请先并成一笔）');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...ok, links: [null] })), true, '流量元素不是对象');
  });

  it('上限下限是**自证**的（边界值能过、越界一条就拒），不抄字面量', () => {
    const many = (n, side) => new Array(n).fill(0).map((_, i) => ({ name: side + String(i) }));
    /* 每一股、每一类都要有流量（本件的硬口径）：第一股流给每一类，其余各股流给第一类。 */
    const at = (ns, nu) => {
      const sources = many(ns, 's');
      const uses = many(nu, 'u');
      const links = sources.map((s) => ({ from: s.name, to: uses[0].name, amount: 1 }));
      for (const u of uses.slice(1)) links.push({ from: sources[0].name, to: u.name, amount: 1 });
      return { title: 'x', sources, uses, links };
    };
    assert.ok(renderFlowRibbon(at(FLOW_RIBBON_MAX_SOURCES, 1)).length > 0, '来源上限能过');
    assert.equal(throwsBlocks(() => renderFlowRibbon(at(FLOW_RIBBON_MAX_SOURCES + 1, 1))), true, '来源上限 ＋1 应拒');
    assert.ok(renderFlowRibbon(at(1, FLOW_RIBBON_MAX_USES)).length > 0, '用途上限能过');
    assert.equal(throwsBlocks(() => renderFlowRibbon(at(1, FLOW_RIBBON_MAX_USES + 1))), true, '用途上限 ＋1 应拒');
    /* 流量条数上限：用「来源 × 用途」的组合撑满（每一股、每一类都真被连上）。 */
    const grid = { title: 'x', sources: many(FLOW_RIBBON_MAX_SOURCES, 's'), uses: many(FLOW_RIBBON_MAX_USES, 'u'),
      links: [] };
    for (const s of grid.sources) {
      for (const u of grid.uses) {
        if (grid.links.length < FLOW_RIBBON_MAX_LINKS) grid.links.push({ from: s.name, to: u.name, amount: 1 });
      }
    }
    assert.ok(renderFlowRibbon(grid).length > 0, '流量上限能过（' + String(grid.links.length) + ' 笔）');
    assert.equal(throwsBlocks(() => renderFlowRibbon({ ...grid, links: grid.links.concat([{ from: 's5', to: 'u3', amount: 1 }]) })), true,
      '流量上限 ＋1 应拒');
  });

  it('纯函数：同样的入参恒产同样的字节（三形态各一遍）', () => {
    for (const input of [BASE, { ...BASE, form: 'matrix' }, { ...BASE, form: 'rails' }]) {
      assert.equal(renderFlowRibbon(input), renderFlowRibbon(input));
    }
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('flow-ribbon ② 样式与零 DOM 纪律', () => {
  const css = flowRibbonCss();
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
        assert.ok(one.includes(FLOW_RIBBON_CLASS), '选择器必须只碰本件类名根：' + one);
        assert.equal((one.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次（拼两遍＝永不命中的死规则）：' + one);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零按视口宽度的媒体查询／必带 `@container` 且自己声明了容器', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(clean.includes('@media'), false, '本件不判视口宽度（视口宽 ≠ 组件宽）');
    assert.ok(clean.includes('@container (max-width: ' + String(FLOW_RIBBON_NARROW_PX) + 'px)'), '窄档必须由容器判');
    assert.ok(clean.includes('container-type: inline-size'), '写了 @container 就必须自己声明容器（否则永不生效）');
    assert.deepEqual(clean.match(/--ilife-[a-z0-9-]+\s*:/g) || [], [], '不得在组件里定义皮肤 token');
  });

  it('**窄档阈值只有一处来源**：两份样式源码里都不写那个数字的字面量，查询串由常量拼出', () => {
    const query = '@container (max-width: ' + String(FLOW_RIBBON_NARROW_PX) + 'px)';
    assert.equal(countOf(css, esc(query)), 3, '两份样式文件各一条窄档查询（矩阵与构成轨各一条），且都取同一个常量');
    for (const file of ['style.ts', 'style-forms.ts']) {
      const src = stripComments(readFileSync(join(DIR, file), 'utf8'));
      assert.equal(new RegExp('\\b' + String(FLOW_RIBBON_NARROW_PX) + '\\b').test(src), false,
        file + ' 里写了阈值字面量（写两处必然走散：改常量时查询不跟）');
      assert.ok(src.includes('FLOW_RIBBON_NARROW_PX'), file + ' 应当读 FLOW_RIBBON_NARROW_PX 这个常量');
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
    /* 选中／填充四档：无文字的点／格／条走 `accent` 实底；任何一处的 `background` 都不许整个就是文字墨色。 */
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了"面"：' + value);
    }
    assert.ok(/color-mix\(in srgb,/.test(clean), '来源色阶／矩阵深浅／构成轨两层都从 token 掺出来');
    assert.equal(clean.includes('var(--ilife-danger,'), false, '本件没有语义档，不许借 danger');
  });

  it('**格宽写在 `width` 上**（不是靠内容撑）：构成轨那一格与矩阵那一条都取算出来的百分比', () => {
    const seg = ruleOf(clean, '.' + flowRibbonSlot('seg'));
    assert.ok(/width:\s*var\(--flow-ribbon-w/.test(seg), '构成轨的格宽必须取算出来的占比：' + seg);
    assert.equal(/flex:\s*(none|0\s+0\s+auto)\s*;[^]*width:\s*auto/.test(seg), false, '格宽不许退回按内容撑');
    const bar = ruleOf(clean, '.' + flowRibbonSlot('cell-bar'));
    assert.ok(/width:\s*var\(--flow-ribbon-w/.test(bar), '矩阵的条宽必须取算出来的占比：' + bar);
  });

  it('**内容撑不宽容器**：会随调用方文本变长的槽带 `min-width: 0`，金额与占比永不截断', () => {
    for (const slot of ['stamp', 'tail', 'title', 'readout-name', 'readout-amount',
      'nd-name', 'nd-amount', 'mat-rowhd', 'hub-eq', 'note']) {
      const body = ruleOf(clean, '.' + flowRibbonSlot(slot));
      assert.ok(/min-width:\s*0/.test(body), slot + ' 少了 min-width: 0（长文本会顶宽容器）：' + body);
      assert.equal(/flex:\s*(none|0\s+0\s+auto)/.test(body), false,
        slot + ' 用了 flex: none（内容会顶宽父行，改 flex: 0 1 auto）：' + body);
    }
    for (const slot of ['stamp', 'tail']) {
      assert.ok(/flex:\s*0\s+1\s+auto/.test(ruleOf(clean, '.' + flowRibbonSlot(slot))),
        slot + ' 必须可收窄（flex: 0 1 auto）');
    }
    for (const slot of ['readout-amount', 'readout-share', 'nd-amount', 'cell-num', 'cell-pct', 'seg-pct']) {
      assert.ok(/white-space:\s*nowrap/.test(ruleOf(clean, '.' + flowRibbonSlot(slot))),
        slot + ' 是读数：不许折行到看不见，更不许被 `…` 截断');
    }
    assert.equal(clean.includes('overflow-x'), false, '不许出现 overflow-x（不藏横滑）');
    assert.equal(clean.includes('text-overflow'), false, '不许用省略号当"放不下"的出路');
    assert.equal(clean.includes('scroll'), false, '不许出现滚动容器');
  });

  it('触屏地板与焦点环（本件自身零可点元素，这两条是地板：调用方包成入口时成立）', () => {
    assert.ok(/min-width:\s*44px/.test(clean) && /min-height:\s*44px/.test(clean), '可点元素 44×44 地板');
    assert.ok(/focus-visible/.test(clean) && /outline:\s*2px solid/.test(clean), '焦点环必须可见');
  });

  it('尺寸事实写在一处：画布高与列宽都取常量（不写散落的字面量）', () => {
    assert.ok(clean.includes('--flow-ribbon-plot-h, '), '画布高取算出来的那个变量');
    assert.ok(clean.includes('max(' + String(FLOW_RIBBON_NODE_COL_PX) + 'px, 28%)'),
      '两列节点宽度取常量（判据读的是出口那个常量，不是抄一份字面量）');
    /* 节点内宽是「读数放不放得进框」那把尺子的分母（算数在 `model.ts`）：样式里不许再写一遍。 */
    for (const file of ['style.ts', 'style-forms.ts']) {
      const src = stripComments(readFileSync(join(DIR, file), 'utf8'));
      assert.equal(new RegExp('\\b' + String(FLOW_RIBBON_NODE_INNER_PX) + '\\b').test(src), false,
        file + ' 里写了节点内宽的字面量（那是估宽用的常量，样式只许用列宽常量）');
    }
  });

  it('零键盘语汇、零可点元素（本件是纯静态图）', () => {
    const words = ['快捷键', '键位', '方向键', '键帽', '键盘', '按 Enter'];
    const html = [SANKEY, MATRIX, RAILS].map((i) => String(i)).join('') + css;
    for (const w of words) assert.equal(html.includes(w), false, '出现键盘语汇：' + w);
    const interactive = [SANKEY, MATRIX, RAILS].join('');
    for (const needle of ['<button', '<a ', 'tabindex', 'onclick', '<input', '<select']) {
      assert.equal(interactive.includes(needle), false, '本件不带可点元素：' + needle);
    }
  });

  it('`dist/components/flow-ribbon/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'flow-ribbon');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 6, '至少该有 index／attrs／fields／model／render／style／style-forms 的产物：' + files.join('、'));
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
    assert.equal(flowRibbonSlot('plot'), FLOW_RIBBON_CLASS + '-plot');
    assert.equal(flowRibbonSlot('plot', 'x-'), 'x-block-flow-ribbon-plot');
    for (const slot of FLOW_RIBBON_SLOTS) assert.ok(flowRibbonSlot(slot).startsWith(FLOW_RIBBON_CLASS + '-'));
  });

  it('两份样式源码里不留没人用的槽位助手（声明了裸槽助手 `c()` 就得真用到）', () => {
    for (const file of ['style.ts', 'style-forms.ts']) {
      const src = stripComments(readFileSync(join(DIR, file), 'utf8'));
      if (!src.includes('const c = (slot: FlowRibbonSlot)')) continue;
      const uses = (src.match(/(?:^|[^\w.])c\(/g) || []).length;
      assert.ok(uses > 0, file + ' 声明了裸槽助手 c() 却一次没用（死代码，删掉它）');
    }
  });
});

/* ── ③ 加法式 ────────────────────────────────────────────────────── */

describe('flow-ribbon ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(FLOW_RIBBON_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderScaleBar({ value: 860, goal: 1850 });
    const heat = renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 2, 3, 4, 5, 6, 7] }] });
    renderFlowRibbon(BASE);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), before, '别件的产物逐字节不变');
    assert.equal(renderHeatGrid({ title: 'x', rows: [{ label: 'a', values: [1, 2, 3, 4, 5, 6, 7] }] }), heat);
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(flowRibbonCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-flow-ribbon'), '前缀必须作用到类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });
});

/* ── ④⑤ 四档几何（真机）＋ 皮肤纪律 ───────────────────────────────── */

/** 四档**容器**宽度：320 是触屏最窄那一档，620 正好踩在窄档阈值上。 */
const WIDTHS = [320, 390, 620, 1280];

/** 长口径（60 字）、长名字（上限）、12 位金额：内容撑宽的三种压力。 */
const LONG_STAMP = '09-01 – 09-24（含 3 天补录、2 天跨月结转、1 天跨时区）：补录那三天按当日最后一笔算，不是记账时间';
const LONG_NAME = 'x'.repeat(FLOW_RIBBON_MAX_NAME_CHARS);
const WIDE = {
  title: '大额流向', sources: [{ name: '工资' }, { name: LONG_NAME }], uses: [{ name: '餐饮' }, { name: '结余' }],
  links: [{ from: '工资', to: '餐饮', amount: 123456789012 }, { from: '工资', to: '结余', amount: 987654321098 },
    { from: LONG_NAME, to: '结余', amount: 555555555555 }],
};

function cases() {
  return [
    { name: 'sankey', html: SANKEY },
    { name: 'matrix', html: MATRIX },
    { name: 'rails', html: RAILS },
    { name: 'thin', html: THIN },
    { name: 'longstamp', html: renderFlowRibbon({ ...BASE, stamp: LONG_STAMP }) },
    { name: 'widenum', html: renderFlowRibbon(WIDE) },
    { name: 'widematrix', html: renderFlowRibbon({ ...WIDE, form: 'matrix' }) },
    { name: 'widerails', html: renderFlowRibbon({ ...WIDE, form: 'rails' }) },
  ];
}

/** 真机起不来时的确定性几何判据（量不到像素，就断**形状上的那几条**）。 */
function assertStaticGeometry(css, html) {
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const narrowest = WIDTHS[0];
  const wide = [...px(html), ...px(css)].filter((v) => v > narrowest);
  assert.deepEqual(wide, [], '出现过不了最窄档（' + narrowest + '）的固定宽度：' + wide.join('、'));
  const percents = [...html.matchAll(/--flow-ribbon-(?:l|r|t|h)[12]?: ([\d.]+)%/g)].map((m) => Number(m[1]));
  assert.ok(percents.length > 0, '几何必须是百分比（判据会空转）');
  for (const v of percents) assert.ok(v >= 0 && v <= 100 + 0.05, '百分比越界：' + v);
  const clean = stripComments(css);
  for (const slot of ['readout-amount', 'readout-share', 'nd-amount', 'cell-num', 'seg-pct']) {
    assert.ok(/white-space:\s*nowrap/.test(ruleOf(clean, '.' + flowRibbonSlot(slot))), slot + ' 必须 nowrap');
  }
  assert.ok(/width:\s*var\(--flow-ribbon-w/.test(ruleOf(clean, '.' + flowRibbonSlot('seg'))));
}

describe('flow-ribbon ④⑤ 四档几何与皮肤纪律（真机 headless Chrome ＋ CDP）', () => {
  it('容器 320／390／620／1280：零横向溢出／读数零截断／**像素比 ＝ 读数比**／换皮不换结构', async (t) => {
    const css = flowRibbonCss();
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n'),
      css: skinCss() + '\n' + css,
      height: 2400,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：'
        + '没有超过 ' + WIDTHS[0] + 'px 的固定宽度 ＋ 几何全是 0–100 的百分比 ＋ 读数槽 nowrap ＋ 格宽取 --flow-ribbon-w');
      assertStaticGeometry(css, casesHtml);
      return t.skip('本机无 Chrome／Chromium：四档几何判据需真浏览器');
    }
    try {
      const seen = [];
      const skinReads = [];
      for (const width of WIDTHS) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1, width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of SKIN_NAMES) {
          for (const c of cases()) {
            const scope = '.' + skinClass(skin) + ' [data-case=' + c.name + '] ';
            const root = await page.read([scope + '.' + FLOW_RIBBON_CLASS, scope + '.' + flowRibbonSlot('hd')]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            for (const one of root) {
              assert.ok(one.maxScrollW <= one.maxClientW + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 横向溢出 ' + one.maxScrollW + ' > ' + one.maxClientW);
              assert.equal(one.scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            }
            const slots = ['nd-amount', 'readout-amount', 'readout-share', 'cell-num', 'cell-pct', 'seg-pct', 'hub-eq', 'tail']
              .filter((slot) => new RegExp('class="' + flowRibbonSlot(slot) + '[ "]').test(c.html));
            const texts = await page.read(slots.map((slot) => scope + '.' + flowRibbonSlot(slot)));
            for (const one of texts) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 有 ' + one.clipped + ' 处被截断');
              assert.ok(one.visible > 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel + ' 不见了');
            }
          }
          /* ④ **像素比 ＝ 读数比**（桑基）：两列的每元像素数必须一致——这正是「两侧同一把尺子」。 */
          const geo = await page.ev('(function(){'
            + 'var root=document.querySelector(' + JSON.stringify('.' + skinClass(skin) + ' [data-case=sankey] .' + FLOW_RIBBON_CLASS) + ');'
            + 'var plot=root.querySelector(' + JSON.stringify('.' + flowRibbonSlot('plot')) + ');'
            + 'var out={plotH:Math.round(plot.getBoundingClientRect().height*100)/100,nodes:[],lanes:[],bars:[],segs:[]};'
            + 'var ns=root.querySelectorAll(' + JSON.stringify('.' + flowRibbonSlot('node')) + ');'
            + 'for (var i=0;i<ns.length;i+=1){ var n=ns[i];'
            + '  out.nodes.push({side:n.className.indexOf("is-src")>=0?"src":"use",bare:n.className.indexOf("is-bare")>=0,'
            + '    h:Math.round(n.getBoundingClientRect().height*100)/100,'
            + '    text:(n.querySelector("b")?n.querySelector("b").textContent:"")+(n.querySelector("em")?n.querySelector("em").textContent:"")}); }'
            + 'var ls=root.querySelectorAll(' + JSON.stringify('.' + flowRibbonSlot('lane')) + ');'
            + 'for (var j=0;j<ls.length;j+=1){ var p=getComputedStyle(ls[j]).clipPath;'
            + '  var m=p.match(/[\\d.]+/g).map(Number); out.lanes.push({nums:m,title:ls[j].getAttribute("title")}); }'
            + 'var mr=document.querySelector(' + JSON.stringify('.' + skinClass(skin) + ' [data-case=matrix] .' + FLOW_RIBBON_CLASS) + ');'
            + 'var bs=mr.querySelectorAll(' + JSON.stringify('.' + flowRibbonSlot('cell-bar')) + ');'
            + 'for (var k=0;k<bs.length;k+=1){ var cell=bs[k].parentNode;'
            + '  out.bars.push({bar:Math.round(bs[k].getBoundingClientRect().width*100)/100,cell:cell.clientWidth,'
            + '    text:cell.querySelector("b").textContent,use:cell.getAttribute("data-use")}); }'
            + 'var rr=document.querySelector(' + JSON.stringify('.' + skinClass(skin) + ' [data-case=rails] .' + FLOW_RIBBON_CLASS) + ');'
            + 'var rails=rr.querySelectorAll(' + JSON.stringify('.' + flowRibbonSlot('rail')) + ');'
            + 'for (var x=0;x<rails.length;x+=1){ var one={inner:rails[x].clientWidth,segs:[]};'
            + '  var ss=rails[x].querySelectorAll(' + JSON.stringify('.' + flowRibbonSlot('seg')) + ');'
            + '  for (var y=0;y<ss.length;y+=1){ one.segs.push({w:Math.round(ss[y].getBoundingClientRect().width*100)/100,'
            + '    title:ss[y].getAttribute("title")}); } out.segs.push(one); }'
            + 'return out;}())');
          const plotH = geo.plotH;
          const amountOf = (text) => Number(String(text).replace(/[^\d]/g, ''));
          /* 每个节点的**像素高 ÷ 它框里印的金额**：两列一起比（src 与 use 混在一个数组里）。 */
          const per = geo.nodes.filter((n) => !n.bare).map((n) => ({ side: n.side, text: n.text,
            per: n.h / amountOf(n.text.replace(/[^\d,]/g, '')) }));
          for (const one of per) {
            assert.ok(Math.abs(one.per - per[0].per) / per[0].per < 0.02,
              width + ' 档 ' + skin + '：像素比 ≠ 读数比（' + one.text + ' 每元 ' + one.per.toFixed(6)
              + '，对照 ' + per[0].text + ' 每元 ' + per[0].per.toFixed(6) + '）');
          }
          /* 带子两端的像素高相等，且 ＝ 它的读数 × 同一把尺子。 */
          for (const lane of geo.lanes) {
            /* computed `clip-path` 报的是百分比多边形：`polygon(0% l1, 100% r1, 100% r2, 0% l2)`。 */
            const l1 = lane.nums[1];
            const r1 = lane.nums[3];
            const r2 = lane.nums[5];
            const l2 = lane.nums[7];
            const leftPx = (l2 - l1) / 100 * plotH;
            const rightPx = (r2 - r1) / 100 * plotH;
            assert.ok(Math.abs(leftPx - rightPx) <= 0.5, width + ' 档 ' + skin + '：带子两端像素高不同 ' + leftPx + '／' + rightPx);
            const amount = amountOf(/：([\d,]+) 元/.exec(lane.title)[1]);
            assert.ok(Math.abs(leftPx / amount - per[0].per) / per[0].per < 0.02,
              width + ' 档 ' + skin + '：带子 ' + lane.title + ' 的像素／读数与节点那把尺子不同');
          }
          /* 矩阵：条宽 ÷ 格内宽 ＝ 印出来的占比（一格满宽时那个参照就是格宽本身）。 */
          for (const bar of geo.bars) {
            const ratio = bar.bar / bar.cell;
            const want = amountOf(bar.text) / Math.max(...geo.bars.map((b) => amountOf(b.text)));
            assert.ok(Math.abs(ratio - want) < 0.02, width + ' 档 ' + skin + '：' + bar.use + ' 的条宽比 ' + ratio.toFixed(3)
              + ' ≠ 读数比 ' + want.toFixed(3));
          }
          /* 构成轨：格宽 ÷ 轨内宽 ＝ 占比；两条轨同一把尺子（每元占的宽相同）。 */
          for (const rail of geo.segs) {
            const sum = rail.segs.reduce((acc, s) => acc + s.w, 0);
            assert.ok(Math.abs(sum - rail.inner) <= 1.5, width + ' 档 ' + skin + '：轨没拉满 ' + sum + '／' + rail.inner);
            for (const seg of rail.segs) {
              const amount = amountOf(/ ([\d,]+)（占总额/.exec(seg.title)[1]);
              const perPx = seg.w / amount;
              assert.ok(Math.abs(perPx - rail.segs[0].w / amountOf(/ ([\d,]+)（占总额/.exec(rail.segs[0].title)[1]))
                / perPx < 0.02, width + ' 档 ' + skin + '：同一轨里每元占的宽不同：' + seg.title);
            }
          }
          seen.push({ width, skin, plotH, nodes: geo.nodes.length, bars: geo.bars.length, rails: geo.segs.length });
        }
      }
      /* ⑤ 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const c of cases()) {
        for (const width of WIDTHS) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
            + 'for (var i = 0; i < skins.length; i += 1) {'
            + '  var el = document.querySelector("." + "ilife-skin-" + skins[i]'
            + ' + " [data-case=' + c.name + '] .' + FLOW_RIBBON_CLASS + '");'
            + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
            + '} return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
          }
        }
      }
      /* 肤色阶与矩阵深浅真取到了取值表里掺出来的颜色（换皮只换取值）。 */
      for (const skin of SKIN_NAMES) {
        const vals = SKIN_VALUES[skin];
        const colors = await page.ev('(function(){'
          + 'var lane=document.querySelector(' + JSON.stringify('.' + skinClass(skin) + ' [data-case=sankey] .' + FLOW_RIBBON_CLASS + ' .is-s1') + ');'
          + 'var hub=document.querySelector(' + JSON.stringify('.' + skinClass(skin) + ' [data-case=rails] .' + flowRibbonSlot('hub-eq')) + ');'
          + 'return {lane:lane===null?null:getComputedStyle(lane).backgroundColor,'
          + 'hub:hub===null?null:getComputedStyle(hub).color};}())');
        assert.ok(typeof colors.lane === 'string' && colors.lane !== '',
          skin + '：带子底色取不到（应是从 accent 掺出来的淡洗）');
        assert.notEqual(colors.lane, toRgb(vals.surface), skin + '：带子底色＝卡面（色阶没生效）');
        assert.notEqual(colors.lane, toRgb(vals.accent), skin + '：带子底色＝强调色实底（读数压在上面会掉对比）');
        assert.equal(colors.hub, toRgb(vals.ink), skin + '：汇合读数取 ink');
        skinReads.push(skin + ' 带子底色 ' + colors.lane);
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of WIDTHS) {
        const rows = seen.filter((s) => s.width === w);
        console.log('READING flow-ribbon container=' + w + ' plotH=' + rows[0].plotH
          + ' nodes=' + rows[0].nodes + ' bars@matrix=' + rows[0].bars + ' rails=' + rows[0].rails
          + ' skins=' + rows.length);
      }
      console.log('READING flow-ribbon 带子底色（四套皮肤，从 accent 掺出来）：' + skinReads.join('；'));
    } finally { page.close(); }
  });
});
