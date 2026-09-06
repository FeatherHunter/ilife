import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { routeWakeword, normalizeTop, normalizeSub, MEMO_DEFAULT_TOP, routeRemind, normalizeRemindAt, routeWish, WISH_SYNC_OPS, crudCreate, crudUpdate, crudRemove, MemoPolicyError } from '../dist/index.js';

describe('memo 口径层', () => {
  it('9 查询唤醒词路由', () => {
    assert.equal(routeWakeword('帮我搜备忘跑步').key, 'memo.search');
    assert.equal(routeWakeword('查备忘').key, 'memo.search');
    assert.deepEqual(routeWakeword('看备忘', { id: 'n1' }), { key: 'memo.detail', params: { id: 'n1' } });
    assert.deepEqual(routeWakeword('按时间搜备忘', { timeRange: '2026-09' }).params, { timeRange: '2026-09' });
    assert.equal(routeWakeword('看提醒').key, 'memo.remind');
    assert.equal(routeWakeword('查已提醒备忘').key, 'memo.remind');
    assert.deepEqual(routeWakeword('查心愿'), { key: 'memo.wish', params: { category: '心愿' } });
    assert.deepEqual(routeWakeword('查打卡'), { key: 'memo.search', params: { category: '打卡' } });
    assert.deepEqual(routeWakeword('查情绪日记'), { key: 'memo.search', params: { category: '情绪日记' } });
  });
  it('写入与消歧：批量改分类走 batch，改子分类走 update', () => {
    assert.equal(routeWakeword('记一条开会').key, 'memo.create');
    assert.deepEqual(routeWakeword('记心愿学琴'), { key: 'memo.create', params: { category: '心愿' } });
    assert.equal(routeWakeword('进入批量改分类向导').key, 'memo.batch');
    assert.equal(routeWakeword('改子分类', { id: 'n2' }).key, 'memo.update');
    assert.equal(routeWakeword('废弃提醒').key, 'memo.remove');
    assert.deepEqual(routeWakeword('完成心愿', { id: 'n3' }).key, 'memo.update');
  });
  it('无命中与缺槽位 throw', () => {
    assert.throws(() => routeWakeword('打开冰箱'), (e) => e.code === 'POLICY_NO_MATCH');
    assert.throws(() => routeWakeword('看备忘'), (e) => e.code === 'POLICY_MISSING_SLOT');
    assert.throws(() => routeWakeword('设提醒'), (e) => e.code === 'POLICY_MISSING_SLOT');
  });
  it('分类：4 顶层+默认备忘+sub 归一', () => {
    assert.equal(normalizeTop(undefined), MEMO_DEFAULT_TOP);
    assert.equal(normalizeTop('打卡'), '打卡');
    assert.throws(() => normalizeTop('未知'), (e) => e instanceof MemoPolicyError);
    assert.equal(normalizeSub('  '), null);
    assert.equal(normalizeSub('跑步'), '跑步');
  });
  it('提醒：四向+日期校验+废弃留笔记', () => {
    assert.equal(routeRemind('set').key, 'memo.create');
    assert.deepEqual(routeRemind('abandon'), { key: 'memo.remove', mode: 'abandon' });
    assert.equal(normalizeRemindAt('2026-10-01'), '2026-10-01');
    assert.throws(() => normalizeRemindAt('明天'), (e) => e.code === 'POLICY_BAD_REMINDER');
  });
  it('心愿与 CRUD 政策', () => {
    assert.equal(routeWish('plan').key, 'memo.wish');
    assert.equal(WISH_SYNC_OPS.length, 5);
    assert.throws(() => crudCreate({}), (e) => e.code === 'POLICY_BAD_INPUT');
    assert.throws(() => crudUpdate({}), (e) => e.code === 'POLICY_BAD_INPUT');
    assert.throws(() => crudRemove({ id: 'n1' }), (e) => e.code === 'POLICY_BAD_INPUT');
    assert.deepEqual(crudRemove({ id: 'n1', confirm: true }), { id: 'n1' });
  });
});
