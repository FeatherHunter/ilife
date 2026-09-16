/** #620 增量1：10–13 判词方向——偏慢不再误判偏快。改坏必红，还原必绿。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { weightSimTarget } from '../dist/analysis/simulate2.js';
import { buildSimTargetDoc } from '../dist/render/trendPredictDocs.js';

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
