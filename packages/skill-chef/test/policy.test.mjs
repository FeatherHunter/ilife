import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateDifficulty, validateStatus, validateHeat, validateCategory, validateRating, routeWakeword, WAKE_TABLE, ChefPolicyError } from '../dist/index.js';

describe('私家大厨口径 policy', () => {
  it('难度 5 档', () => {
    for (const d of ['快手菜', '简单', '中等', '困难', '大师']) assert.equal(validateDifficulty(d), d);
    assert.throws(() => validateDifficulty(''), /难度/);
    assert.throws(() => validateDifficulty('地狱'), /难度/);
  });
  it('状态 4 种 + 火候 5 档', () => {
    for (const s of ['未做', '已做', '熟练', '已废弃']) assert.equal(validateStatus(s), s);
    assert.throws(() => validateStatus('删除'), /状态/);
    for (const h of ['微火', '小火', '中火', '大火', '猛火']) assert.equal(validateHeat(h), h);
    assert.throws(() => validateHeat('文火'), /火候/);
  });
  it('食材 11 类 + 评分 0-5', () => {
    assert.equal(WAKE_TABLE.length, 35);
    assert.equal(validateCategory('海鲜'), '海鲜');
    assert.equal(validateCategory('水产'), '海鲜');
    assert.throws(() => validateCategory('外星菜'), /分类/);
    assert.equal(validateRating(5), 5);
    assert.equal(validateRating(0), 0);
    assert.equal(validateRating(4.5), 4.5);
    assert.throws(() => validateRating(6), /评分/);
    assert.throws(() => validateRating('好'), /评分/);
  });
  it('唤醒词 35 全量 + 最长匹配 + 缺槽位', () => {
    assert.equal(WAKE_TABLE.length, 35);
    assert.equal(routeWakeword('查看食材宫保虾球', { name: '宫保虾球' }).key, 'chef.recipe.view');
    assert.equal(routeWakeword('查食材虾', { q: '虾' }).key, 'chef.recipe.search');
    assert.equal(routeWakeword('帮我搜菜找宫保虾球', { q: '宫保虾球' }).key, 'chef.recipe.search');
    assert.throws(() => routeWakeword('同步菜谱到云端'), /无命中/);
    assert.throws(() => routeWakeword('加菜'), /缺槽位 name/);
    assert.equal(routeWakeword('加菜', { name: '宫保虾球' }).params.name, '宫保虾球');
  });
  it('错误皆为 ChefPolicyError', () => {
    try { routeWakeword('', {}); assert.fail('应抛'); }
    catch (e) { assert.equal(e.name, 'ChefPolicyError'); }
  });
});
