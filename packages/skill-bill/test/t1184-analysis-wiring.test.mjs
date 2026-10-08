// t1184 接线：三场景 facts 与页面复制区同源（真库 seedBillDb＋真渲染），余下 22 页零回归。
// 跑法：先 tsc -b packages/skill-bill，再 node --test packages/skill-bill/test/t1184-analysis-wiring.test.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seedBillDb } from './helpers/bill-seed.mjs';
import { openBillDb, closeBillDb } from '../dist/fetch/db.js';
import { sceneMonthly } from '../dist/analysis/scene-monthly.js';
import { sceneRangeCompare } from '../dist/analysis/scene-range-compare.js';
import { sceneTrend } from '../dist/analysis/scene-trend.js';
import { sceneYearly } from '../dist/analysis/scene-yearly.js';
import { viewAnalysisOverview, viewAnalysisCompare, viewAnalysisTrend } from '../dist/analysis/read.js';

let db = null;
let dir = '';
before(() => {
  dir = mkdtempSync(join(tmpdir(), 't1184-db-'));
  const dbPath = seedBillDb(dir);
  db = openBillDb(dbPath);
});
after(() => { if (db !== null) closeBillDb(db); });

function noEnglishKeys(text, where) {
  assert.ok(!/[A-Za-z]/.test(text), where + ' 含英文字母');
}

describe('t1184 看月度接线（真库 2026-05）', () => {
  const r = sceneMonthly.values({ key: 'bill.analysis.overview', kind: 'monthly', params: { month: '2026-05' }, db });
  it('copy 与 kpi 同源：笔数/最大类对手算', () => {
    assert.equal(r.kpi.count, 14);
    const lines = r.copy.text.split('\n');
    assert.ok(lines[1].startsWith('2026-05 共 14 笔'), lines[1]);
    assert.ok(lines[1].includes('「旅行/机票」1880.00 元'), lines[1]);
    assert.ok(lines[1].includes('5640.20') && lines[1].includes('13759.00'), lines[1]);
    noEnglishKeys(r.copy.text, '月度copy');
  });
  it('渲染页复制区含人话行', () => {
    const v = viewAnalysisOverview({ kind: 'monthly', month: '2026-05' }, db);
    const line2 = r.copy.text.split('\n')[1];
    assert.ok(v.html.includes(line2), '复制区应含人话行');
    assert.ok(v.html.includes('data-t='), '复制载荷位应在');
  });
});

describe('t1184 看双区间接线（2026-01 vs 2026-02）', () => {
  const params = { startA: '2026-01-01', endA: '2026-01-31', startB: '2026-02-01', endB: '2026-02-28' };
  const r = sceneRangeCompare.values({ key: 'bill.analysis.compare', kind: 'range', params, db });
  it('copy 行数组与页面条卡同序同键（数组与人话同源）', () => {
    const barLabels = r.page.barGroups[0].rows.map((x) => x.label);
    const copyKeys = r.copy.json ? JSON.parse(r.copy.json).data.rows.map((x) => x.key) : [];
    assert.deepEqual(copyKeys, barLabels);
    assert.deepEqual(copyKeys, ['玩乐', '餐饮']);
  });
  it('人话行一行一期一类、无英文键', () => {
    const lines = r.copy.text.split('\n');
    assert.ok(lines[1].startsWith('区间一 2026-01-01~2026-01-31'));
    assert.ok(lines[2].startsWith('区间二 2026-02-01~2026-02-28'));
    assert.ok(lines[3].startsWith('支出变化：下降 592.00 元（-87.1%）。'), lines[3]);
    assert.ok(lines[5].startsWith('玩乐 '));
    noEnglishKeys(r.copy.text, '双区间copy');
  });
  it('渲染页复制区含人话行', () => {
    const v = viewAnalysisCompare({ kind: 'range', ...params }, db);
    assert.ok(v.html.includes(r.copy.text.split('\n')[3]), '复制区应含变化行');
  });
});

describe('t1184 看趋势接线（近 12 个月）', () => {
  const r = sceneTrend.values({ key: 'bill.analysis.trend', kind: 'trend', params: { months: 12 }, db });
  it('copy 月行与逐月明细同源、峰值对手算', () => {
    const j = JSON.parse(r.copy.json);
    assert.equal(j.data.peakMonth, '2026-05');
    assert.equal(j.data.rows.length, 6);
    const listMonths = r.page.listCards[0].rows.map((x) => x.left);
    assert.deepEqual(j.data.rows.map((x) => x.month), listMonths);
    const lines = r.copy.text.split('\n');
    assert.equal(lines.length, 2 + 6);
    assert.ok(lines[1].includes('最高的是 2026-05（5640.20 元）'), lines[1]);
    noEnglishKeys(r.copy.text, '趋势copy');
  });
  it('渲染页复制区含人话行', () => {
    const v = viewAnalysisTrend({ kind: 'trend', months: 12 }, db);
    assert.ok(v.html.includes(r.copy.text.split('\n')[1]), '复制区应含总结行');
  });
});

describe('t1184 未覆盖页零回归（看年度仍走旧投影）', () => {
  it('yearly 无 copy，页面照出', () => {
    const r = sceneYearly.values({ key: 'bill.analysis.overview', kind: 'yearly', params: { year: 2026 }, db });
    assert.equal(r.copy, undefined);
    const v = viewAnalysisOverview({ kind: 'yearly', year: 2026 }, db);
    assert.ok(v.html.length > 1000);
  });
});
