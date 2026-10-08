// t1184 分析人话行：总览人话行＋对比/趋势保留断行＋三份同源＋纯文本无英文键（TDD 红-绿 tracer）
// 跑法：node node_modules/typescript/bin/tsc -b packages/skill-bill --force 之后 node --test packages/skill-bill/test/t1184-analysis-copy.test.mjs
// 旧行为对照：base buildDataText 把 stat metrics 原键直投纯文本（含 expense/l1.），analysis summary 的换行压成空格；
// 本票新人话门只进人话行（一行一期/一类），英文键只进 JSON/CSV 键位。
// 指纹：下文 9 份 EXPECT 金色字面量即指纹；改版式先 --declare-layout-change=1184（或 DECLARE_LAYOUT_CHANGE=1184），
// 此时不断言金色、只把当刻三份写进 .scratch/t1184/declare/ 供人肉合入。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildDataText } from 'base-paint';
import { buildAnalysisCopy } from '../dist/analysis/copyTextAnalysis.js';

const DECLARED = process.argv.includes('--declare-layout-change=1184')
  || process.env.DECLARE_LAYOUT_CHANGE === '1184';
function declareDump(name, actual) {
  if (!DECLARED) return;
  mkdirSync('.scratch/t1184/declare', { recursive: true });
  writeFileSync('.scratch/t1184/declare/' + name, actual);
}

// —— 夹具：手算定值（与实现无关的独立源） ——
const M = {
  kind: 'period', word: '看月度', label: '2026-05',
  kpi: { count: 4, expense: 830, income: 13000, net: 12170 },
  topKey: '餐饮/外卖', topValue: 150,
};
const EXPECT_M_TEXT = '饼干记账 看月度\n2026-05 共 4 笔：支出 830.00 元、收入 13000.00 元、净额 12170.00 元；花得最多的是「餐饮/外卖」150.00 元。';
const EXPECT_M_JSON = '{\n  "version": "1.0",\n  "skill": "bill",\n  "shape": "stat",\n  "key": "bill.analysis.overview",\n  "data": {\n    "label": "2026-05",\n    "count": 4,\n    "expense": 830,\n    "income": 13000,\n    "net": 12170,\n    "top": {\n      "key": "餐饮/外卖",\n      "value": 150\n    },\n    "lines": [\n      "饼干记账 看月度",\n      "2026-05 共 4 笔：支出 830.00 元、收入 13000.00 元、净额 12170.00 元；花得最多的是「餐饮/外卖」150.00 元。"\n    ]\n  }\n}';
const EXPECT_M_CSV = 'field,value\n结论,2026-05 共 4 笔：支出 830.00 元、收入 13000.00 元、净额 12170.00 元；花得最多的是「餐饮/外卖」150.00 元。\n期间,2026-05\n笔数,4\n支出,830.00\n收入,13000.00\n净额,12170.00\n最多分类,餐饮/外卖\n最多金额,150.00';

const R = {
  kind: 'range', word: '看双区间',
  a: { label: '2026-01-01~2026-01-31', count: 2, expense: 768, income: 12500 },
  b: { label: '2026-02-01~2026-02-28', count: 2, expense: 850, income: 12500 },
  diff: -82, pct: -9.6, change: '下降',
  rows: [
    { key: '餐饮/外卖', a: 88, b: 170, diff: -82, aCount: 1, bCount: 1 },
    { key: '玩乐/演出', a: 680, b: 680, diff: 0, aCount: 1, bCount: 1 },
  ],
};
const EXPECT_R_TEXT = '饼干记账 看双区间\n区间一 2026-01-01~2026-01-31：共 2 笔，支出 768.00 元、收入 12500.00 元\n区间二 2026-02-01~2026-02-28：共 2 笔，支出 850.00 元、收入 12500.00 元\n支出变化：下降 82.00 元（-9.6%）。\n分类差异（2 类）：\n餐饮/外卖 88.00 → 170.00，差 -82.00（1 笔→1 笔）\n玩乐/演出 680.00 → 680.00，差 0.00（1 笔→1 笔）';
const EXPECT_R_JSON = '{\n  "version": "1.0",\n  "skill": "bill",\n  "shape": "analysis",\n  "key": "bill.analysis.compare",\n  "data": {\n    "labelA": "2026-01-01~2026-01-31",\n    "labelB": "2026-02-01~2026-02-28",\n    "a": {\n      "count": 2,\n      "expense": 768,\n      "income": 12500\n    },\n    "b": {\n      "count": 2,\n      "expense": 850,\n      "income": 12500\n    },\n    "diff": -82,\n    "pct": -9.6,\n    "change": "下降",\n    "rows": [\n      {\n        "key": "餐饮/外卖",\n        "a": 88,\n        "b": 170,\n        "diff": -82,\n        "aCount": 1,\n        "bCount": 1\n      },\n      {\n        "key": "玩乐/演出",\n        "a": 680,\n        "b": 680,\n        "diff": 0,\n        "aCount": 1,\n        "bCount": 1\n      }\n    ],\n    "lines": [\n      "饼干记账 看双区间",\n      "区间一 2026-01-01~2026-01-31：共 2 笔，支出 768.00 元、收入 12500.00 元",\n      "区间二 2026-02-01~2026-02-28：共 2 笔，支出 850.00 元、收入 12500.00 元",\n      "支出变化：下降 82.00 元（-9.6%）。",\n      "分类差异（2 类）：",\n      "餐饮/外卖 88.00 → 170.00，差 -82.00（1 笔→1 笔）",\n      "玩乐/演出 680.00 → 680.00，差 0.00（1 笔→1 笔）"\n    ]\n  }\n}';
const EXPECT_R_CSV = 'field,value\n结论,支出变化：下降 82.00 元（-9.6%）。\n区间一,2026-01-01~2026-01-31：共 2 笔，支出 768.00 元、收入 12500.00 元\n区间二,2026-02-01~2026-02-28：共 2 笔，支出 850.00 元、收入 12500.00 元\n分类 餐饮/外卖,88.00 → 170.00，差 -82.00（1 笔→1 笔）\n分类 玩乐/演出,680.00 → 680.00，差 0.00（1 笔→1 笔）';

const T = {
  kind: 'trend', word: '看趋势', months: 12,
  kpi: { count: 4, expense: 1618, income: 25000, net: 23382 },
  avg: 134.83, peakMonth: '2026-02', peak: 850,
  points: [
    { month: '2026-01', count: 2, expense: 768, income: 12500 },
    { month: '2026-02', count: 2, expense: 850, income: 12500 },
  ],
};
const EXPECT_T_TEXT = '饼干记账 看趋势\n近 12 个月共 4 笔：支出 1618.00 元、收入 25000.00 元，平均每月支出 134.83 元，最高的是 2026-02（850.00 元）。\n2026-01 共 2 笔：支出 768.00 元、收入 12500.00 元\n2026-02 共 2 笔：支出 850.00 元、收入 12500.00 元';
const EXPECT_T_JSON = '{\n  "version": "1.0",\n  "skill": "bill",\n  "shape": "analysis",\n  "key": "bill.analysis.trend",\n  "data": {\n    "months": 12,\n    "count": 4,\n    "expense": 1618,\n    "income": 25000,\n    "avg": 134.83,\n    "peakMonth": "2026-02",\n    "peak": 850,\n    "rows": [\n      {\n        "month": "2026-01",\n        "count": 2,\n        "expense": 768,\n        "income": 12500\n      },\n      {\n        "month": "2026-02",\n        "count": 2,\n        "expense": 850,\n        "income": 12500\n      }\n    ],\n    "lines": [\n      "饼干记账 看趋势",\n      "近 12 个月共 4 笔：支出 1618.00 元、收入 25000.00 元，平均每月支出 134.83 元，最高的是 2026-02（850.00 元）。",\n      "2026-01 共 2 笔：支出 768.00 元、收入 12500.00 元",\n      "2026-02 共 2 笔：支出 850.00 元、收入 12500.00 元"\n    ]\n  }\n}';
const EXPECT_T_CSV = 'field,value\n结论,近 12 个月共 4 笔：支出 1618.00 元、收入 25000.00 元，平均每月支出 134.83 元，最高的是 2026-02（850.00 元）。\n2026-01,共 2 笔：支出 768.00 元、收入 12500.00 元\n2026-02,共 2 笔：支出 850.00 元、收入 12500.00 元';

const EN_KEYS = ['count', 'expense', 'income', 'net', 'l1.', 'metrics', 'summary', ' vs ', 'TOP'];
function assertNoEnglishKeys(text, where) {
  assert.ok(!/[A-Za-z]/.test(text), where + ' 纯文本含英文字母：' + text.slice(0, 80));
  for (const k of EN_KEYS) assert.ok(!text.includes(k), where + ' 纯文本含英文键 ' + k);
}

describe('t1184 月度三份如金色（总览人话行）', () => {
  const got = buildAnalysisCopy(M);
  if (DECLARED) { declareDump('monthly.txt', got.text); declareDump('monthly.json', got.json); declareDump('monthly.csv', got.csv); }
  it('纯文本逐字节等于金色', () => {
    if (DECLARED) { console.warn('WARN 已声明 1184：跳过月度金色'); return; }
    assert.equal(got.text, EXPECT_M_TEXT);
  });
  it('JSON逐字节等于金色（数仍数）', () => {
    if (DECLARED) { console.warn('WARN 已声明 1184：跳过月度金色'); return; }
    assert.equal(got.json, EXPECT_M_JSON);
    const j = JSON.parse(got.json);
    assert.equal(typeof j.data.count, 'number');
    assert.equal(typeof j.data.expense, 'number');
  });
  it('CSV逐字节等于金色（field,value纵表）', () => {
    if (DECLARED) { console.warn('WARN 已声明 1184：跳过月度金色'); return; }
    assert.equal(got.csv, EXPECT_M_CSV);
  });
  it('数字同源：JSON数＝夹具数，文本/CSV含同一money串', () => {
    const j = JSON.parse(got.json);
    assert.equal(j.data.expense, M.kpi.expense);
    assert.equal(j.data.net, M.kpi.net);
    assert.ok(got.text.includes('830.00') && got.text.includes('12170.00'));
    assert.ok(got.csv.includes('830.00') && got.csv.includes('12170.00'));
    assert.deepEqual(j.data.lines, got.text.split('\n'));
  });
  it('纯文本无英文键', () => { assertNoEnglishKeys(got.text, '月度'); });
});

describe('t1184 双区间三份如金色（一行一期/一类）', () => {
  const got = buildAnalysisCopy(R);
  if (DECLARED) { declareDump('range.txt', got.text); declareDump('range.json', got.json); declareDump('range.csv', got.csv); }
  it('纯文本逐字节等于金色', () => {
    if (DECLARED) { console.warn('WARN 已声明 1184：跳过对比金色'); return; }
    assert.equal(got.text, EXPECT_R_TEXT);
  });
  it('JSON逐字节等于金色（数仍数）', () => {
    if (DECLARED) { console.warn('WARN 已声明 1184：跳过对比金色'); return; }
    assert.equal(got.json, EXPECT_R_JSON);
    const j = JSON.parse(got.json);
    assert.equal(typeof j.data.diff, 'number');
    assert.equal(j.data.rows.length, 2);
  });
  it('CSV逐字节等于金色', () => {
    if (DECLARED) { console.warn('WARN 已声明 1184：跳过对比金色'); return; }
    assert.equal(got.csv, EXPECT_R_CSV);
  });
  it('保留断行：一行一期＋一行一类', () => {
    const lines = got.text.split('\n');
    assert.equal(lines.length, 7);
    assert.ok(lines[1].startsWith('区间一 2026-01-01~2026-01-31'));
    assert.ok(lines[2].startsWith('区间二 2026-02-01~2026-02-28'));
    assert.ok(lines[5].startsWith('餐饮/外卖 '));
    assert.ok(lines[6].startsWith('玩乐/演出 '));
  });
  it('数字同源：JSON数＝夹具数，行数组与人话行同数', () => {
    const j = JSON.parse(got.json);
    assert.equal(j.data.a.expense, 768);
    assert.equal(j.data.rows[0].diff, -82);
    assert.ok(got.text.includes('768.00') && got.text.includes('-82.00'));
    assert.deepEqual(j.data.lines, got.text.split('\n'));
  });
  it('纯文本无英文键', () => { assertNoEnglishKeys(got.text, '双区间'); });
});

describe('t1184 趋势三份如金色（一行一月）', () => {
  const got = buildAnalysisCopy(T);
  if (DECLARED) { declareDump('trend.txt', got.text); declareDump('trend.json', got.json); declareDump('trend.csv', got.csv); }
  it('纯文本逐字节等于金色', () => {
    if (DECLARED) { console.warn('WARN 已声明 1184：跳过趋势金色'); return; }
    assert.equal(got.text, EXPECT_T_TEXT);
  });
  it('JSON逐字节等于金色', () => {
    if (DECLARED) { console.warn('WARN 已声明 1184：跳过趋势金色'); return; }
    assert.equal(got.json, EXPECT_T_JSON);
  });
  it('CSV逐字节等于金色', () => {
    if (DECLARED) { console.warn('WARN 已声明 1184：跳过趋势金色'); return; }
    assert.equal(got.csv, EXPECT_T_CSV);
  });
  it('保留断行：一行一月', () => {
    const lines = got.text.split('\n');
    assert.equal(lines.length, 2 + T.points.length);
    assert.ok(lines[2].startsWith('2026-01 '));
    assert.ok(lines[3].startsWith('2026-02 '));
  });
  it('数字同源', () => {
    const j = JSON.parse(got.json);
    assert.equal(j.data.rows[1].expense, 850);
    assert.ok(got.text.includes('1618.00') && got.csv.includes('1618.00'));
    assert.deepEqual(j.data.lines, got.text.split('\n'));
  });
  it('纯文本无英文键', () => { assertNoEnglishKeys(got.text, '趋势'); });
});

describe('t1184 空态与变异', () => {
  it('月度空窗：人话不断言最多类，JSON top为null', () => {
    const got = buildAnalysisCopy({ ...M, kpi: { count: 0, expense: 0, income: 0, net: 0 }, topKey: null, topValue: 0 });
    assert.equal(got.text, '饼干记账 看月度\n2026-05 一笔都没有记。');
    assert.equal(JSON.parse(got.json).data.top, null);
    assertNoEnglishKeys(got.text, '月度空窗');
  });
  it('变异红：改一位数字即偏离金色（金色敏感）', () => {
    const mutant = buildAnalysisCopy({ ...M, kpi: { ...M.kpi, expense: 830.01 } });
    assert.notEqual(mutant.text, EXPECT_M_TEXT);
    assert.notEqual(mutant.csv, EXPECT_M_CSV);
    assert.notEqual(JSON.parse(mutant.json).data.expense, M.kpi.expense);
  });
  it('旧行为红对照：stat直投含英文键，analysis换行被压平', () => {
    const stat = buildDataText({ envelope: { version: '1', skill: 'bill', shape: 'stat', key: 'x', data: { metrics: { count: 4, expense: 830 } } }, format: 'text', title: 't' });
    assert.ok(/[A-Za-z]/.test(stat), '旧stat纯文本应含英文键：' + stat);
    const ana = buildDataText({ envelope: { version: '1', skill: 'bill', shape: 'analysis', key: 'x', data: { summary: 'a\nb' } }, format: 'text', title: 't' });
    assert.ok(!ana.includes('\n') || ana.split('\n').length < 3, '旧analysis纯文本应压平换行：' + JSON.stringify(ana));
  });
});
