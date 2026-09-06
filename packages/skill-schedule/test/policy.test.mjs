import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  relativeToDate, relativeToRange, recentNDays,
  normalizeCategory, l1Of, healthDimScore, computeHealthScore, detectAnomalies,
  normalizeDate, normalizeTime, resolveRangeParam, validateAddInput, validateCompareInput,
  validateUpsertInput, assertCoverage24h, VALID_COMPLETIONS,
  routeWakeword, WAKE_TABLE, SchedulePolicyError,
} from '../dist/index.js';

const FRI = new Date(2026, 6, 24); // 周五

describe('作息口径 policy', () => {
  it('相对日期 7 表达（含大前/后天）', () => {
    assert.equal(relativeToDate('今天', FRI), '2026-07-24');
    assert.equal(relativeToDate('昨天', FRI), '2026-07-23');
    assert.equal(relativeToDate('前天', FRI), '2026-07-22');
    assert.equal(relativeToDate('大前天', FRI), '2026-07-21');
    assert.equal(relativeToDate('明天', FRI), '2026-07-25');
    assert.equal(relativeToDate('后天', FRI), '2026-07-26');
    assert.equal(relativeToDate('大后天', FRI), '2026-07-27');
    assert.throws(() => relativeToDate('上昨天', FRI));
  });
  it('相对范围跨月/跨年/闰年', () => {
    assert.deepEqual(relativeToRange('本周', FRI), { start: '2026-07-20', end: '2026-07-26' });
    assert.deepEqual(relativeToRange('上周', FRI), { start: '2026-07-13', end: '2026-07-19' });
    assert.deepEqual(relativeToRange('上上周', FRI), { start: '2026-07-06', end: '2026-07-12' });
    assert.deepEqual(relativeToRange('上月', FRI), { start: '2026-06-01', end: '2026-06-30' });
    assert.deepEqual(relativeToRange('上月', new Date(2026, 0, 15)), { start: '2025-12-01', end: '2025-12-31' });
    assert.deepEqual(relativeToRange('上月', new Date(2024, 2, 1)), { start: '2024-02-01', end: '2024-02-29' });
    assert.deepEqual(recentNDays(7, FRI), { start: '2026-07-18', end: '2026-07-24' });
    assert.deepEqual(resolveRangeParam({ range: '本周' }, FRI), { start: '2026-07-20', end: '2026-07-26' });
    assert.deepEqual(resolveRangeParam({ recentDays: 1 }, FRI), { start: '2026-07-24', end: '2026-07-24' });
    assert.throws(() => resolveRangeParam({}));
    assert.throws(() => resolveRangeParam({ start: '2026-07-02', end: '2026-07-01' }));
  });
  it('分类 8 一级 + 白名单二级 + 别名', () => {
    assert.equal(normalizeCategory('工作.AI调优'), '工作.AI调优');
    assert.equal(normalizeCategory('维持'), '维持');
    assert.throws(() => normalizeCategory(''), /不能为空/);
    assert.throws(() => normalizeCategory('玩.游戏'), /不在白名单/);
    assert.throws(() => normalizeCategory('工作.不存在的二级'), /提议新增/);
    assert.equal(l1Of('运动.跑步'), '健康');
    assert.equal(l1Of('工作.AI调优'), '工作');
    assert.equal(l1Of(''), '未知');
  });
  it('健康分口径（工作上限/分档衰减/7 维均值）', () => {
    assert.equal(healthDimScore('工作', 480), 100);
    assert.equal(healthDimScore('工作', 900), 0);
    assert.equal(healthDimScore('健康', 60), 100);
    assert.equal(healthDimScore('健康', 30), 35);
    const { score } = computeHealthScore({ '维持': 600, '健康': 60, '工作': 480, '学习': 60, '调整': 120, '日常': 120, '投入': 60 });
    assert.equal(score, 100);
    const bad = computeHealthScore({});
    assert.ok(bad.score < 20);
  });
  it('异常 ±20 红 ±10 黄', () => {
    const a = detectAnomalies({ '健康': 120 }, { '健康': 60 });
    assert.equal(a[0].level, 'red');
    const b = detectAnomalies({ '健康': 66 }, { '健康': 60 });
    assert.equal(b[0].level, 'yellow');
    assert.equal(detectAnomalies({ '健康': 62 }, { '健康': 60 }).length, 0);
  });
  it('日期/时间容错与 24:00 归一', () => {
    assert.equal(normalizeDate('20260703'), '2026-07-03');
    assert.equal(normalizeDate('2026/07/03'), '2026-07-03');
    assert.equal(normalizeTime('24:00'), '23:59');
    assert.throws(() => normalizeDate('2026-13-01'));
    assert.throws(() => normalizeTime('25:00'));
  });
  it('add 9 字段强校验 + compare 口径', () => {
    const ok = validateAddInput({ date: '2026-09-06', time_start: '09:00', time_end: '10:00', activity: '调优', category: '工作.AI调优' });
    assert.equal(ok.duration_minutes, 60);
    assert.throws(() => validateAddInput({ date: '2026-09-06', time_start: '10:00', time_end: '09:00', activity: 'x', category: '工作' }));
    assert.throws(() => validateAddInput({ date: '2026-09-06', time_start: '09:00', time_end: '10:00', activity: '', category: '工作' }));
    assert.throws(() => validateCompareInput({ kind: 'nope' }));
    assert.ok(validateCompareInput({ kind: 'months', monthA: '2026-06', monthB: '2026-07' }));
  });
  it('24h 覆盖 + completion 6 态', () => {
    const ev = (s, e) => ({ time_start: s, time_end: e, title: 'x' });
    assertCoverage24h([ev('00:00', '08:00'), ev('08:00', '23:59')]);
    assert.throws(() => assertCoverage24h([ev('01:00', '08:00')]), /00:00/);
    assert.throws(() => assertCoverage24h([ev('00:00', '08:00'), ev('09:00', '23:59')]), /不连续/);
    assert.equal(VALID_COMPLETIONS.length, 6);
    assert.ok(validateUpsertInput({ date: '2026-09-06', events: [ev('00:00', '12:00'), ev('12:00', '23:59')] }));
  });
  it('唤醒词最长匹配 + 废弃词无命中 + 缺槽位', () => {
    assert.equal(routeWakeword('帮我复盘今日情况').key, 'schedule.plan.write');
    assert.equal(routeWakeword('复盘一下今天').key, 'schedule.plan.write');
    assert.equal(routeWakeword('查作息时间轴看看').key, 'schedule.record.today');
    assert.equal(routeWakeword('查作息').key, 'schedule.record.today');
    assert.throws(() => routeWakeword('同步作息到今天'), /无命中/);
    assert.throws(() => routeWakeword('作息计划表'), /无命中/);
    assert.throws(() => routeWakeword('改计划'), /缺槽位 id/);
    assert.equal(routeWakeword('改计划', { id: 3 }).params.id, 3);
    assert.ok(WAKE_TABLE.length >= 40);
  });
  it('错误皆为 SchedulePolicyError', () => {
    try { routeWakeword(''); assert.fail('应抛'); }
    catch (e) { assert.equal(e.name, 'SchedulePolicyError'); }
  });
});
