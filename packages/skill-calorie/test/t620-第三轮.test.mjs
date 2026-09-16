/** #620 增量1：10–13 判词方向——偏慢不再误判偏快。改坏必红，还原必绿。 */
/** #620 增量5：18–20 补可见小节标题（R-60同形，标题==导航）。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { weightSimTarget, calorieGoalEta, calorieDeficitEta, calorieStability } from '../dist/analysis/simulate2.js';
import { buildSimTargetDoc, buildCalorieGoalDoc, buildCalorieDeficitDoc, buildCalorieStabilityDoc } from '../dist/render/trendPredictDocs.js';
import { foldedTable, tableOf } from '../dist/analysis/reportDocParts.js';

function series90() {
  const out = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(Date.UTC(2026, 5, 19 + (89 - i)));
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, weightKg: 75.1 - (89 - i) * 0.01, calories: 1800, deficit: 300, calorieGoal: 1800 });
  }
  return out;
}

function visible(html) {
  return html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<[^>]*>/g, ' ');
}

test('#620-1 慢速 2kg/30d（0.47<0.5）：结论与徽标说偏慢，不说偏快/超出', () => {
  const v = weightSimTarget(series90(), 2, 30, '模拟减重');
  assert.equal(v.feasible, false);
  assert.ok(v.weeklyRate < 0.5, '夹具应为慢速：' + v.weeklyRate);
  assert.ok(String(v.insight).includes('偏慢'), 'insight未指慢：' + v.insight);
  const text = visible(buildSimTargetDoc(v));
  assert.ok(text.includes('偏慢'), '页上未见偏慢');
  assert.ok(!text.includes('赶得偏快'), '慢速页误判偏快');
  assert.ok(!text.includes('超出健康范围'), '慢速页误判超出');
});

test('#620-1 快速 6kg/30d（1.4>1.0）：结论与徽标说偏快/超出，不说偏慢', () => {
  const v = weightSimTarget(series90(), 6, 30, '模拟减重');
  assert.equal(v.feasible, false);
  assert.ok(v.weeklyRate > 1.0, '夹具应为快速：' + v.weeklyRate);
  const text = visible(buildSimTargetDoc(v));
  assert.ok(text.includes('赶得偏快') || text.includes('超出健康范围'), '快速页未见偏快/超出');
  assert.ok(!text.includes('偏慢'), '快速页误判偏慢');
});

test('#620-1 可行 4kg/60d（0.47？按实际算 feasible）：健康范围内且赶得上', () => {
  const v = weightSimTarget(series90(), 4, 60, '模拟减重');
  const text = visible(buildSimTargetDoc(v));
  if (v.feasible) {
    assert.ok(text.includes('在健康范围内'), '可行页未见健康范围内');
    assert.ok(text.includes('赶得上'), '可行页未见赶得上');
  } else {
    assert.ok(text.includes('偏慢') || text.includes('偏快') || text.includes('超出'), '不可行页方向不明');
  }
});

function secHeadings(html) {
  const secs = [...html.matchAll(/<section id="([^"]+)">(?:<h2 class="tpd-sec-title">([^<]*)<\/h2>)?/g)]
    .map((m) => ({ id: m[1], h2: m[2] ?? null }));
  const nav = [...html.matchAll(/href="#([^"]+)">([^<]*)</g)].map((m) => ({ id: m[1], text: m[2] }));
  return { secs: secs.filter((s) => s.id.startsWith('sec-')), nav };
}

function assertHeadingsEqNav(html, what) {
  const { secs, nav } = secHeadings(html);
  assert.ok(secs.length > 0 && nav.length > 0, what + ' 无区块或无导航');
  assert.deepEqual(secs.map((s) => s.id), nav.map((n) => n.id), what + ' 区块≠导航项');
  secs.forEach((s, i) => {
    assert.ok(s.h2 !== null, what + ' ' + s.id + ' 无可见小节标题');
    assert.equal(s.h2, nav[i].text, what + ' ' + s.id + ' 标题≠导航：' + s.h2 + ' vs ' + nav[i].text);
  });
}

test('#620-5 18营养目标达成：小节标题数==导航项数且逐字一致', () => {
  assertHeadingsEqNav(buildCalorieGoalDoc(calorieGoalEta(series90(), '摄入预测')), 'buildCalorieGoalDoc');
});

test('#620-5 19缺口预测：小节标题数==导航项数且逐字一致', () => {
  assertHeadingsEqNav(buildCalorieDeficitDoc(calorieDeficitEta(series90(), '摄入预测')), 'buildCalorieDeficitDoc');
});

test('#620-5 20稳定性：小节标题数==导航项数且逐字一致', () => {
  assertHeadingsEqNav(buildCalorieStabilityDoc(calorieStability(series90(), '摄入预测')), 'buildCalorieStabilityDoc');
});

/* ── #620 增量2：长表折叠（首屏 10 行＋其余折叠；短表原样，数据一条不少） ── */

const FOLD_COLS = [{ key: 'date', label: '日期' }, { key: 'value', label: '值', align: 'right' }];
const foldRows = (n) => Array.from({ length: n }, (_, i) => ({ date: '2026-09-' + String(i + 1).padStart(2, '0'), value: i }));

test('#620-2 短表12行原样直出无折叠', () => {
  const html = foldedTable({ columns: FOLD_COLS, rows: foldRows(12), caption: '逐日明细' });
  assert.ok(!html.includes('<details'), '12行短表不应折叠');
});

test('#620-2 长表13行首屏10行其余3行折叠', () => {
  const html = foldedTable({ columns: FOLD_COLS, rows: foldRows(13), caption: '逐日明细' });
  assert.ok(html.includes('<details'), '13行应折叠');
  assert.ok(html.includes('其余 3 行（共 13 行）'), '折叠标题不明：' + html.slice(html.indexOf('<summary'), html.indexOf('<summary') + 120));
  for (const r of foldRows(13)) assert.ok(html.includes(r.date), '折叠丢数据：' + r.date);
});

test('#620-2 长表60行数据一条不少', () => {
  const html = foldedTable({ columns: FOLD_COLS, rows: foldRows(60), caption: '逐日体重与 BMI', emptyText: '无记录' });
  assert.ok(html.includes('其余 50 行（共 60 行）'), '折叠标题不明');
  for (const r of foldRows(60)) assert.ok(html.includes(r.date), '折叠丢数据：' + r.date);
  assert.ok(html.includes('逐日体重与 BMI（续）'), '续表题不明');
});

test('#620-2 空表走空态无折叠', () => {
  const html = foldedTable({ columns: FOLD_COLS, rows: [], caption: '逐日明细', emptyText: '无记录' });
  assert.ok(!html.includes('<details'), '空表不应折叠');
  assert.ok(html.includes('无记录'), '空态文案丢失');
});

test('#620-2 tableOf长表30行折叠且短表不折', () => {
  const pts = (n) => Array.from({ length: n }, (_, i) => ({ date: '2026-09-' + String(i + 1).padStart(2, '0'), value: 68 }));
  const longHtml = tableOf(pts(30), '蛋白（g）', '每日蛋白量');
  assert.ok(longHtml.includes('<details'), '30行应折叠');
  assert.ok(longHtml.includes('其余 20 行（共 30 行）'), '折叠标题不明');
  const shortHtml = tableOf(pts(5), '蛋白（g）', '每日蛋白量');
  assert.ok(!shortHtml.includes('<details'), '5行不应折叠');
});
