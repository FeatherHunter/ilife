import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { routeWakeword } from '../dist/triggers/wakewords.js';
import { normalizeTop, normalizeSub, MEMO_DEFAULT_TOP } from '../dist/memo/category.js';
import { routeRemind, normalizeRemindAt, normalizeRepeatType, normalizeRepeatRule } from '../dist/remind/policy.js';
import { routeWish, WISH_SYNC_OPS } from '../dist/wish/policy.js';
import { crudCreate, crudUpdate, crudRemove } from '../dist/memo/crud.js';
import { MemoPolicyError } from '../dist/shared/errors.js';;

describe('memo 口径层', () => {
  it('9 查询唤醒词路由', () => {
    assert.equal(routeWakeword('帮我搜备忘跑步').key, 'memo.search');
    assert.equal(routeWakeword('查备忘').key, 'memo.search');
    assert.deepEqual(routeWakeword('看备忘', { id: 'n1' }), { key: 'memo.detail', params: { id: 'n1' } });
    // #850：`timeRange` 退役，改认 HELP 的 `start`＋`end`（双必填，按创建时间过滤倒序）。
    assert.deepEqual(routeWakeword('按时间搜备忘', { start: '2026-07-01', end: '2026-07-07' }).params, { start: '2026-07-01', end: '2026-07-07' });
    assert.equal(routeWakeword('看提醒').key, 'memo.remind');
    assert.equal(routeWakeword('查已提醒备忘').key, 'memo.remind');
    assert.deepEqual(routeWakeword('查心愿'), { key: 'memo.wish', params: { category: '心愿' } });
    assert.deepEqual(routeWakeword('查打卡'), { key: 'memo.search', params: { category: '打卡' } });
    assert.deepEqual(routeWakeword('查情绪日记'), { key: 'memo.search', params: { category: '情绪日记' } });
  });
  it('#850 四问路由：首次使用／设提醒／删备忘／删三族', () => {
    assert.equal(routeWakeword('首次使用').key, 'memo.init');
    assert.deepEqual(routeWakeword('设提醒', { remind_at: '2026-10-01 09:00' }), { key: 'memo.reminder', params: { remind_at: '2026-10-01 09:00' } });
    assert.equal(routeWakeword('记提醒', { remindAt: '2026-10-01 09:00' }).key, 'memo.create');
    assert.deepEqual(routeWakeword('删备忘', { id: 15 }), { key: 'memo.remove', params: { id: 15 } });
    // 删三族改指真删（此前误指 memo.update 只改分类不删）。
    assert.deepEqual(routeWakeword('删心愿', { id: 15 }), { key: 'memo.remove', params: { category: '心愿', id: 15 } });
    assert.deepEqual(routeWakeword('删打卡', { id: 15 }), { key: 'memo.remove', params: { category: '打卡', id: 15 } });
    assert.deepEqual(routeWakeword('删情绪日记', { id: 15 }), { key: 'memo.remove', params: { category: '情绪日记', id: 15 } });
    // 改三族仍走更新。
    assert.deepEqual(routeWakeword('改心愿', { id: 15 }), { key: 'memo.update', params: { category: '心愿', id: 15 } });
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
  it('提醒：四向+时间校验+重复口径（老 `_validate_*`）', () => {
    assert.equal(routeRemind('set').key, 'memo.create');
    assert.deepEqual(routeRemind('abandon'), { key: 'memo.remove', mode: 'abandon' });
    assert.equal(normalizeRemindAt('2026-10-01 09:00'), '2026-10-01 09:00');
    assert.throws(() => normalizeRemindAt('2026-10-01'), (e) => e.code === 'POLICY_BAD_REMINDER');
    assert.throws(() => normalizeRemindAt('明天'), (e) => e.code === 'POLICY_BAD_REMINDER');
    assert.equal(normalizeRepeatType(undefined), '一次性');
    assert.equal(normalizeRepeatRule('每天', '09:00', null), '09:00');
    assert.equal(normalizeRepeatRule('一次性', undefined, '2026-10-01 09:00'), null);
    assert.throws(() => normalizeRepeatRule('每周', '09:00', null), (e) => e.code === 'POLICY_BAD_REMINDER');
    assert.throws(() => normalizeRepeatRule('一次性', undefined, null), (e) => e.code === 'POLICY_BAD_REMINDER');
  });
  it('心愿与 CRUD 政策', () => {
    assert.equal(routeWish('plan').key, 'memo.wish');
    assert.equal(WISH_SYNC_OPS.length, 5);
    assert.throws(() => crudCreate({}), (e) => e.code === 'POLICY_BAD_INPUT');
    assert.throws(() => crudUpdate({}), (e) => e.code === 'POLICY_BAD_INPUT');
    assert.throws(() => crudRemove({ id: 15 }), (e) => e.code === 'POLICY_BAD_INPUT');
    assert.deepEqual(crudRemove({ id: 15, confirm: true }), { id: 15 });
    assert.deepEqual(crudRemove({ id: '16', confirm: true }), { id: 16 });
  });
});
