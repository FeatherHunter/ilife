import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCategory, validateAmount, validateTime, validateRecord, normalizeDate, l1Of, routeWakeword, WAKE_TABLE, BillPolicyError } from '../dist/index.js';

describe('饼干口径 policy', () => {
  it('L1 10支出+6收入+隔离三类 + 三级上限', () => {
    assert.equal(validateCategory('餐饮/外卖/午餐'), '餐饮/外卖/午餐');
    assert.equal(validateCategory('餐饮'), '餐饮');
    assert.equal(validateCategory('借贷/借出'), '借贷/借出');
    assert.equal(validateCategory('工资/基本工资'), '工资/基本工资');
    assert.equal(l1Of('餐饮/外卖'), '餐饮');
    assert.throws(() => validateCategory(''), /不能为空/);
    assert.throws(() => validateCategory('火星/探险'), /未知 L1/);
    assert.throws(() => validateCategory('餐饮/a/b/c'), /至多/);
  });
  it('amount 符号即方向 + 零阻断', () => {
    assert.equal(validateAmount(-35), -35);
    assert.equal(validateAmount('+5000'), 5000);
    assert.throws(() => validateAmount(0), /不得为 0/);
    assert.throws(() => validateAmount('abc'), /带符号数字/);
  });
  it('时间容错 + 整单默认', () => {
    assert.equal(validateTime('2026-09-06'), '2026-09-06 12:00:00');
    assert.equal(validateTime('2026-09-06 12:00:00'), '2026-09-06 12:00:00');
    assert.equal(normalizeDate('20260906'), '2026-09-06');
    assert.throws(() => validateTime('2026-13-01'), /真实日期|格式非法/);
    const r = validateRecord({ category: '餐饮', amount: -20, time: '2026-09-06 12:00:00' });
    assert.equal(r.ledger, '生活');
  });
  it('唤醒词 75 全量 + 最长匹配 + 缺槽位', () => {
    assert.equal(WAKE_TABLE.length, 75);
    assert.equal(routeWakeword('看分类对比一下').key, 'bill.analysis.compare');
    assert.equal(routeWakeword('看分类').key, 'bill.analysis.overview');
    assert.equal(routeWakeword('初始化状态看看').key, 'bill.setup.run');
    assert.equal(routeWakeword('报销到账了').key, 'bill.record.add');
    assert.equal(routeWakeword('帮我查今天花了多少').key, 'bill.record.today');
    assert.throws(() => routeWakeword('同步记账到云端'), /无命中/);
    assert.throws(() => routeWakeword('改记录'), /缺槽位 id/);
    assert.equal(routeWakeword('改记录', { id: 3 }).params.id, 3);
  });
  it('错误皆为 BillPolicyError', () => {
    try { routeWakeword(''); assert.fail('应抛'); }
    catch (e) { assert.equal(e.name, 'BillPolicyError'); }
  });
});
