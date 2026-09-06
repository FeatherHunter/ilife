import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLocation, normalizeStatus, isFoodItem,
  validateAddInput, parseUpdateOp, needId,
  routeWakeword, WAKE_TABLE, DEPRECATED_PHRASES, HomePolicyError,
} from '../dist/index.js';

describe('居家口径 policy', () => {
  it('位置两级 + 11 状态 + 食品判定', () => {
    assert.equal(normalizeLocation('客厅/冰箱'), '客厅/冰箱');
    assert.throws(() => normalizeLocation('客厅'), /两级/);
    assert.equal(normalizeStatus('在家'), '在家');
    assert.throws(() => normalizeStatus('在火星'), /非法状态/);
    assert.equal(isFoodItem('食物与饮品', '米'), true);
    assert.equal(isFoodItem('衣物与穿戴', '卫衣'), false);
  });
  it('add 强校验 + update op 分流', () => {
    const ok = validateAddInput({ name: '牛奶', category_id: 1, location: '客厅/冰箱' });
    assert.equal(ok.name, '牛奶');
    assert.throws(() => validateAddInput({ name: '', category_id: 1, location: '客厅/冰箱' }), /name/);
    assert.throws(() => validateAddInput({ name: 'x', location: '客厅/冰箱' }), /category_id/);
    assert.throws(() => validateAddInput({ name: 'x', category_id: 1, location: '客厅' }), /两级/);
    assert.equal(parseUpdateOp({ plus: 1, id: 1 }), 'qty');
    assert.equal(parseUpdateOp({ location_status: '在家', id: 1 }), 'status');
    assert.equal(needId({ id: 3 }), 3);
    assert.throws(() => needId({}), /id/);
  });
  it('唤醒词最长匹配 + 废弃词无命中 + 缺槽位', () => {
    assert.equal(routeWakeword('帮我查物品牛奶').key, 'home.item.search');
    assert.equal(routeWakeword('查物品(HTML)看看').key, 'home.item.search');
    assert.equal(routeWakeword('看物品', { id: 1 }).key, 'home.item.detail');
    assert.equal(routeWakeword('盘点记录看看').key, 'home.inventory.records');
    assert.equal(routeWakeword('盘点一下').key, 'home.inventory.round');
    assert.throws(() => routeWakeword('联动总览看看'), /无命中/);
    assert.throws(() => routeWakeword('记到卡路里'), /无命中/);
    assert.throws(() => routeWakeword('看物品'), /缺槽位 id/);
    assert.ok(WAKE_TABLE.length >= 88);
    assert.deepEqual(DEPRECATED_PHRASES, ['联动总览', '记到卡路里', '记到记账']);
  });
  it('错误皆为 HomePolicyError', () => {
    try { routeWakeword(''); assert.fail('应抛'); }
    catch (e) { assert.equal(e.name, 'HomePolicyError'); }
  });
});
