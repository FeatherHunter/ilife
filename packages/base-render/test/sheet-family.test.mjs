// 单据族（sheet-frame／summary-head／scale-bar／ledger-rows／entry-rows）· 判据件。
//
// 断言对象是**消费方真走的那条出口**：`dist/blocks.js`（组件层的对外路径，层规：
// 组件层不进冻结面、不从根出口）。每组断四类：
//   ① 形状（类名与结构）② 边界（空数组／越界值／非法枚举／非对象入参）
//   ③ 样式纪律（scope、禁入 token、零 `:root`／`!important`）④ 层红线（零 DOM、只留一条出口）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ENTRY_ROW_NOTE_INDENT_PX,
  ENTRY_ROW_TIME_MIN_WIDTH_PX,
  LEDGER_LEADERS,
  LEDGER_ROW_KINDS,
  SCALE_BAR_DEFAULT_CELLS,
  SCALE_BAR_VARIANTS,
  SHEET_VARIANTS,
  SUMMARY_HEAD_FACES,
  SUMMARY_HEAD_SIZES,
  SUMMARY_HEAD_VALUE_PX,
  entryRowsCss,
  ledgerRowsCss,
  renderEntryRows,
  renderLedgerRows,
  renderScaleBar,
  renderSheetFrame,
  renderSummaryHead,
  scaleBarCss,
  sheetCss,
  sheetFrameCss,
  summaryHeadCss,
} from '../dist/blocks.js';
import * as root from '../dist/index.js';

const CSS_FUNCS = { sheetFrameCss, summaryHeadCss, scaleBarCss, ledgerRowsCss, entryRowsCss, sheetCss };

/** 剥掉 CSS 注释再断规则（注释会**提到**类名，拿裸串断会把"解释"当"规则"）。 */
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

describe('单据族 ① 形状（纸面页框）', () => {
  it('素纸：一个 section ＋ 一个 body，不带撕口与裁线', () => {
    const html = renderSheetFrame({ content: '<p>x</p>' });
    assert.equal((html.match(/<section/g) || []).length, 1, '恰好一个 section');
    assert.equal((html.match(/ilife-block-sheet-body/g) || []).length, 1, '恰好一个 body');
    assert.equal(html.includes('is-plain'), true);
    assert.equal(html.includes('notch'), false, '缺省不出撕口');
    assert.equal(html.includes('-cut'), false, '缺省不出裁线');
    assert.match(html, /^<section class="ilife-block-sheet is-plain">/);
  });

  it('小票纸 ＋ 撕口 ＋ 裁线：两枚撕口（左右各一）与一条裁线，顺序固定', () => {
    const html = renderSheetFrame({ content: 'BODY', variant: 'receipt', notch: true, cutLine: true, id: 'sec-a' });
    assert.match(html, /^<section class="ilife-block-sheet is-receipt" id="sec-a">/);
    assert.equal((html.match(/ilife-block-sheet-notch/g) || []).length, 2);
    assert.match(html, /is-left/);
    assert.match(html, /is-right/);
    assert.ok(html.indexOf('notch') < html.indexOf('BODY'), '撕口在正文之前');
    assert.ok(html.indexOf('BODY') < html.indexOf('ilife-block-sheet-cut'), '裁线在正文之后');
  });

  it('正文受信透传（不再转义）：标记原样落地', () => {
    assert.ok(renderSheetFrame({ content: '<b>粗</b>' }).includes('<b>粗</b>'));
  });

  it('闭集与边界：非法 variant／非对象入参／content 非串 ⇒ BlocksError；空 content 可出空纸', () => {
    assert.deepEqual([...SHEET_VARIANTS], ['plain', 'receipt']);
    assert.equal(throwsBlocks(() => renderSheetFrame({ content: 'x', variant: 'paper' })), true);
    assert.equal(throwsBlocks(() => renderSheetFrame(undefined)), true);
    assert.equal(throwsBlocks(() => renderSheetFrame({ content: 1 })), true);
    assert.match(renderSheetFrame({ content: '' }), /ilife-block-sheet-body"><\/div>/);
  });
});

describe('单据族 ② 形状（主数字头）', () => {
  it('五槽齐全：eyebrow／主数字＋单位／分母／脚行两句', () => {
    const html = renderSummaryHead({
      eyebrow: '当日摄入', value: '860', unit: '卡', denominator: '/ 1850 卡',
      note: '已吃目标的 46%', stamp: { text: '还可吃 990 卡', tone: 'warn' },
    });
    assert.match(html, /^<div class="ilife-block-summary-head is-l is-sans">/);
    assert.match(html, /-eyebrow">当日摄入</);
    assert.match(html, /-value">860<small>卡<\/small>/);
    assert.match(html, /-denom">\/ 1850 卡</);
    assert.match(html, /-note">已吃目标的 46%/);
    assert.match(html, /-stamp is-warn">还可吃 990 卡</);
  });

  it('缺槽就不出那一槽（不留空位、不拿占位符顶替）', () => {
    const html = renderSummaryHead({ value: '200' });
    assert.equal(html.includes('eyebrow'), false);
    assert.equal(html.includes('denom'), false);
    assert.equal(html.includes('foot'), false, '既无 note 也无印章 ⇒ 整条脚行不出');
    assert.match(html, /-line"><span class="ilife-block-summary-head-value">200<\/span><\/span>/);
  });

  it('三档字号 × 两种字面是闭集；三档读数写在一处', () => {
    assert.deepEqual([...SUMMARY_HEAD_SIZES], ['m', 'l', 'xl']);
    assert.deepEqual([...SUMMARY_HEAD_FACES], ['sans', 'serif']);
    assert.deepEqual({ ...SUMMARY_HEAD_VALUE_PX }, { m: 46, l: 56, xl: 92 });
    assert.match(renderSummaryHead({ value: 'x', size: 'xl', face: 'serif' }), /is-xl is-serif/);
  });

  it('仅给一种脚行槽也出脚行；但**两槽都缺**时不出（避免空容器）', () => {
    assert.match(renderSummaryHead({ value: '1', note: 'n' }), /-foot">/);
    assert.match(renderSummaryHead({ value: '1', stamp: { text: 's' } }), /-foot">/);
  });

  it('边界：value 必填非空；非法 size／face／tone／非对象 ⇒ BlocksError', () => {
    assert.equal(throwsBlocks(() => renderSummaryHead({ value: '' })), true);
    assert.equal(throwsBlocks(() => renderSummaryHead({ value: 'x', size: 's' })), true);
    assert.equal(throwsBlocks(() => renderSummaryHead({ value: 'x', face: 'mono' })), true);
    assert.equal(throwsBlocks(() => renderSummaryHead({ value: 'x', stamp: { text: 's', tone: 'info' } })), true);
    assert.equal(throwsBlocks(() => renderSummaryHead({ value: 'x', stamp: { text: '' } })), true);
  });

  it('转义：五个字符进实体，不进标记', () => {
    const html = renderSummaryHead({ value: '<b>&"\'', eyebrow: 'a<b' });
    assert.ok(!html.includes('<b>'), '尖括号必须被转义');
    assert.match(html, /&lt;b&gt;/);
    assert.match(html, /&amp;/);
  });
});

describe('单据族 ③ 形状（刻度条）', () => {
  it('条形码：N 格逐格出，够几格实几格', () => {
    const html = renderScaleBar({ value: 860, goal: 1850, variant: 'cells', cells: 24, leftLabel: '46%', rightLabel: '差 990 卡' });
    assert.match(html, /^<div class="ilife-block-scale-bar is-cells">/);
    assert.equal((html.match(/ilife-block-scale-bar-cell/g) || []).length, 24);
    assert.equal((html.match(/is-on/g) || []).length, Math.round(860 / 1850 * 24));
    assert.match(html, /-cap-left">46%/);
    assert.match(html, /-cap-right">差 990 卡</);
  });

  it('细线：一条轨 ＋ 一条填充，宽度是比例（缺省形态）', () => {
    const html = renderScaleBar({ value: 500, goal: 1000 });
    assert.match(html, /^<div class="ilife-block-scale-bar is-line">/);
    assert.match(html, /-fill" style="width: 50%"/);
    assert.equal(html.includes('is-over'), false);
  });

  it('**"有"与"没有"必须看得出来**：吃了 5 卡也点亮 1 格；0 卡才全空', () => {
    assert.equal((renderScaleBar({ value: 5, goal: 100000, variant: 'cells' }).match(/is-on/g) || []).length, 1);
    assert.equal((renderScaleBar({ value: 0, goal: 1850, variant: 'cells' }).match(/is-on/g) || []).length, 0);
  });

  it('超目标：只加 is-over、形状仍是满格／满轨（不画第二圈）', () => {
    const cells = renderScaleBar({ value: 2000, goal: 1850, variant: 'cells', cells: 8 });
    assert.match(cells, /is-cells is-over/);
    assert.equal((cells.match(/is-on/g) || []).length, 8, '满格');
    const line = renderScaleBar({ value: 2000, goal: 1850 });
    assert.match(line, /width: 100%/);
    assert.match(line, /is-line is-over/);
  });

  it('两形态根高一致（样式段常量）：换形态不跳版', () => {
    assert.match(stripComments(scaleBarCss()), /-cell \{[^}]*height: 22px/);
    assert.match(stripComments(scaleBarCss()), /is-line [^{]*-track \{[^}]*height: 6px/);
  });

  it('边界：goal ≤ 0／非数／cells 出界或非整数／非法 variant ⇒ BlocksError', () => {
    assert.deepEqual([...SCALE_BAR_VARIANTS], ['cells', 'line']);
    assert.equal(SCALE_BAR_DEFAULT_CELLS, 24);
    assert.equal(throwsBlocks(() => renderScaleBar({ value: 1, goal: 0 })), true);
    assert.equal(throwsBlocks(() => renderScaleBar({ value: 1, goal: -5 })), true);
    assert.equal(throwsBlocks(() => renderScaleBar({ value: Number.NaN, goal: 1 })), true);
    assert.equal(throwsBlocks(() => renderScaleBar({ value: 1, goal: 1, cells: 3 })), true);
    assert.equal(throwsBlocks(() => renderScaleBar({ value: 1, goal: 1, cells: 8.5 })), true);
    assert.equal(throwsBlocks(() => renderScaleBar({ value: 1, goal: 1, variant: 'bar' })), true);
  });
});

describe('单据族 ④ 形状（账目行）', () => {
  const rows = [
    { label: '目标', value: '1850', unit: '卡' },
    { label: '餐别覆盖', value: '1/4' },
    { label: '蛋白 · 碳水 · 脂肪', value: '0 / 0 / 0', unit: 'g', kind: 'total' },
  ];

  it('小标题 ＋ 逐行：标签／引导线／值＋单位；合计行带 is-total', () => {
    const html = renderLedgerRows({ rows, heading: '账目' });
    assert.match(html, /-rows-heading">账目</);
    assert.equal((html.match(/ilife-block-ledger-row"/g) || []).length, 2);
    assert.equal((html.match(/is-total/g) || []).length, 1);
    assert.match(html, /-value">1850<small>卡<\/small>/);
    assert.equal((html.match(/-leader/g) || []).length, 3);
  });

  it('引导线可关（`none`）：行里不出 leader，其余一字不差', () => {
    const dots = renderLedgerRows({ rows: [{ label: 'a', value: '1' }] });
    const none = renderLedgerRows({ rows: [{ label: 'a', value: '1' }], leader: 'none' });
    assert.ok(dots.includes('-leader'));
    assert.equal(none.includes('-leader'), false);
    assert.equal(none.replace(/ilife-block-ledger-row/g, 'X'), dots.replace(/ilife-block-ledger-row/g, 'X')
      .replace('<span class="X-leader" aria-hidden="true"></span>', ''));
  });

  it('空数组出不了一个字（**小标题也留不住**：没有行就没有"账"，空标题是噪音）', () => {
    assert.equal(renderLedgerRows({ rows: [] }), '');
    assert.equal(renderLedgerRows({ rows: [], heading: '账目' }), '');
  });

  it('边界：label／value 必填非空；非法 kind／leader ⇒ BlocksError', () => {
    assert.deepEqual([...LEDGER_ROW_KINDS], ['item', 'total']);
    assert.deepEqual([...LEDGER_LEADERS], ['dots', 'none']);
    assert.equal(throwsBlocks(() => renderLedgerRows({ rows: [{ label: '', value: '1' }] })), true);
    assert.equal(throwsBlocks(() => renderLedgerRows({ rows: [{ label: 'a', value: '' }] })), true);
    assert.equal(throwsBlocks(() => renderLedgerRows({ rows: [{ label: 'a', value: '1', kind: 'sum' }] })), true);
    assert.equal(throwsBlocks(() => renderLedgerRows({ rows: 'x' })), true);
    assert.equal(throwsBlocks(() => renderLedgerRows({ rows: [{ label: 'a', value: '1' }], leader: 'dash' })), true);
  });
});

describe('单据族 ⑤ 形状（明细行）', () => {
  it('五槽 ＋ 备注：时间／类别／名称／数量／值＋单位，备注独占一行', () => {
    const html = renderEntryRows({
      heading: '吃了什么',
      rows: [{
        time: '13:55', badge: '午餐', name: '百事可乐', measure: '2000 g', value: '860', unit: '卡',
        note: '2L 按常规每 100ml 约 43kcal 估算',
      }],
      absentLine: '早餐 · 晚餐 · 加餐 未记录',
    });
    assert.match(html, /-rows-heading">吃了什么</);
    assert.match(html, /-time">13:55</);
    assert.match(html, /-badge">午餐</);
    assert.match(html, /-name">百事可乐</);
    assert.match(html, /-measure">2000 g</);
    assert.match(html, /-value">860<small>卡<\/small>/);
    assert.match(html, /-note">2L 按常规/);
    assert.match(html, /-rows-absent">早餐 · 晚餐 · 加餐 未记录</);
  });

  it('行下读数（`facts`）：逐项一个 span、**不写分隔符**（分隔由列距承担）', () => {
    const html = renderEntryRows({ rows: [{
      name: '鸡胸', value: '200', unit: '卡',
      facts: ['蛋白 35 g', '碳水 0 g', '脂肪 0 g'],
    }] });
    assert.match(html, /ilife-block-entry-row-facts"><span>蛋白 35 g<\/span><span>碳水 0 g<\/span><span>脂肪 0 g<\/span>/);
    assert.ok(!/·|；|｜|、|~/.test(html), '行下读数不许自带分隔符');
    assert.equal(renderEntryRows({ rows: [{ name: 'a', value: '1' }] }).includes('-facts'), false, '不给就不出这一行');
    assert.equal(throwsBlocks(() => renderEntryRows({ rows: [{ name: 'a', value: '1', facts: '蛋白 1 g' }] })), true);
    assert.equal(throwsBlocks(() => renderEntryRows({ rows: [{ name: 'a', value: '1', facts: [''] }] })), true);
  });

  it('缺的槽不留空位（只给名称与值时，时间／类别／数量三槽一个字都不出）', () => {
    const html = renderEntryRows({ rows: [{ name: '鸡胸', value: '200' }] });
    assert.equal(html.includes('-time'), false);
    assert.equal(html.includes('-badge'), false);
    assert.equal(html.includes('-measure'), false);
    assert.equal(html.includes('-note'), false);
  });

  it('缺记句单独住在 absentLine（不进 rows ⇒ 不会被算成一条记录）', () => {
    const html = renderEntryRows({ rows: [], absentLine: '昨天没有记录' });
    assert.equal((html.match(/ilife-block-entry-row"/g) || []).length, 0);
    assert.match(html, /-rows-absent">昨天没有记录</);
  });

  it('三槽全空（无 rows／无标题／无缺记句）⇒ 空串', () => {
    assert.equal(renderEntryRows({ rows: [] }), '');
  });

  it('边界：name／value 必填非空；rows 非数组 ⇒ BlocksError；两枚几何读数在样式段里对得上', () => {
    assert.equal(throwsBlocks(() => renderEntryRows({ rows: [{ name: '', value: '1' }] })), true);
    assert.equal(throwsBlocks(() => renderEntryRows({ rows: [{ name: 'a', value: '' }] })), true);
    assert.equal(throwsBlocks(() => renderEntryRows({ rows: null })), true);
    assert.match(stripComments(entryRowsCss()), new RegExp('-time \\{[^}]*min-width: ' + ENTRY_ROW_TIME_MIN_WIDTH_PX + 'px'));
    assert.match(stripComments(entryRowsCss()), new RegExp('-note \\{[^}]*padding-left: ' + ENTRY_ROW_NOTE_INDENT_PX + 'px'));
  });
});

describe('单据族 ⑥ 样式纪律与层红线', () => {
  it('每段样式都非空，且全部规则 scope 在 `.ilife-page-ui` 之下（不开 pageUi 的页零命中）', () => {
    for (const [name, fn] of Object.entries(CSS_FUNCS)) {
      const css = stripComments(fn());
      assert.ok(css.trim() !== '', name + ' 必须非空');
      // 逐**行**看选择器（不跨行贪婪匹配：跨行会把上一条规则的 `}` 与 `@media` 行拼成一个假选择器）。
      const selectors = (css.match(/^[^@\s][^{\n]*\{/gm) || []).filter((sel) => !sel.trim().startsWith('@'));
      assert.ok(selectors.length > 0, name + ' 必须至少有一条选择器规则');
      for (const sel of selectors) {
        assert.ok(sel.includes('.ilife-page-ui'), name + ' 的选择器必须 scope 在 .ilife-page-ui：' + sel.trim());
      }
    }
  });

  it('不写 `:root`／`!important`／Q14 禁入 token；不新造 token 名', () => {
    for (const [name, fn] of Object.entries(CSS_FUNCS)) {
      const css = stripComments(fn());
      assert.equal(css.includes(':root'), false, name + ' 不得写 :root');
      assert.equal(css.includes('!important'), false, name + ' 不得写 !important');
      assert.equal(css.includes('--r-xl'), false, name + ' 不得用禁入 token');
      assert.equal(css.includes('--pink'), false, name + ' 不得用禁入 token');
      const decls = css.match(/--[a-z0-9-]+\s*:/g) || [];
      assert.equal(decls.length, 0, name + ' 不得定义新 token：' + decls.join(' '));
    }
  });

  it('`sheetCss()` 是五段的汇总（顺序固定：纸 → 头 → 条 → 账 → 明细）', () => {
    const all = sheetCss();
    const order = [sheetFrameCss(), summaryHeadCss(), scaleBarCss(), ledgerRowsCss(), entryRowsCss()];
    let at = -1;
    for (const part of order) {
      const idx = all.indexOf(part);
      assert.ok(idx >= 0, '汇总里必须含这一段');
      assert.ok(idx > at, '段序必须是 纸 → 头 → 条 → 账 → 明细');
      at = idx;
    }
  });

  it('prefix 透传：换前缀时类名与 scope 一起换（不写死 `ilife-`）', () => {
    assert.match(renderSheetFrame({ content: '' }), /ilife-block-sheet/);
    const css = sheetCss({ prefix: 'x-' });
    assert.ok(css.includes('.x-page-ui .x-block-sheet'), '前缀必须作用到 scope 与类名两处');
    assert.ok(css.includes('.x-block-summary-head'), '本族每一段都要跟着换前缀');
  });

  it('层红线：`dist/components/**` 零 DOM（无 document.／window.／navigator.）', () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'components');
    const files = [];
    const walk = (at) => {
      for (const entry of readdirSync(at, { withFileTypes: true })) {
        const full = join(at, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.js')) files.push(full);
      }
    };
    walk(dir);
    assert.ok(files.length >= 15, '组件层 dist 至少该有本族五件的产物');
    // 层红线说的是「**剥离字面量与注释后**不得出现 DOM 名」——组件的运行时是**产出的 JS 文本**
    // （住在字符串字面量里），剥掉字面量才是在断"模块代码自己碰不碰 DOM"。
    const stripLiterals = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const file of files) {
      const code = stripLiterals(readFileSync(file, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, file.replace(/.*dist/, 'dist') + ' 里出现了 ' + needle);
      }
    }
  });

  it('只留一条出口：从 `base-paint/blocks` 取得到，根出口里没有（层规：组件层不入冻结面）', () => {
    assert.equal(typeof renderSheetFrame, 'function');
    assert.equal(typeof sheetCss, 'function');
    assert.equal(root.renderSheetFrame, undefined, '组件层不得从根出口出（否则冻结面签名要跟着动）');
    assert.equal(root.sheetCss, undefined);
    assert.equal(root.renderLedgerRows, undefined);
  });
});
