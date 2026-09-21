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
    assert.equal(WAKE_TABLE.length, 50);
    assert.equal(validateCategory('海鲜'), '海鲜');
    assert.equal(validateCategory('水产'), '海鲜');
    assert.throws(() => validateCategory('外星菜'), /分类/);
    assert.equal(validateRating(5), 5);
    assert.equal(validateRating(0), 0);
    assert.equal(validateRating(4.5), 4.5);
    assert.throws(() => validateRating(6), /评分/);
    assert.throws(() => validateRating('好'), /评分/);
  });
  it('唤醒词 50 全量 + 最长匹配 + 缺槽位（#43 F1 看菜/看菜谱→view）', () => {
    assert.equal(WAKE_TABLE.length, 50);
    assert.equal(routeWakeword('查看食材宫保虾球', { name: '宫保虾球' }).key, 'chef.recipe.view');
    assert.equal(routeWakeword('查食材虾', { q: '虾' }).key, 'chef.recipe.search');
    assert.equal(routeWakeword('帮我搜菜找宫保虾球', { q: '宫保虾球' }).key, 'chef.recipe.search');
    assert.throws(() => routeWakeword('同步菜谱到云端'), /无命中/);
    assert.throws(() => routeWakeword('加菜'), /缺槽位 name/);
    assert.equal(routeWakeword('加菜', { name: '宫保虾球' }).params.name, '宫保虾球');
    assert.equal(routeWakeword('帮我看菜宫保虾球', { name: '宫保虾球' }).key, 'chef.recipe.view');
    assert.equal(routeWakeword('帮我看菜谱宫保虾球', { name: '宫保虾球' }).key, 'chef.recipe.view');
    assert.throws(() => routeWakeword('看菜'), /缺槽位 name/);
    assert.throws(() => routeWakeword('看菜谱'), /缺槽位 name/);
  });
  it('#841 接入的 13 条老组名：条条可路由到对的键，缺槽位照抛', () => {
    // 这 13 条在 #770–#776 就有了命令分支与页面，只是此前不在表里（说了不生效）；
    // #841 补进表。逐条钉死「词 → 键」，并证明槽位约束真在管（不是补了词却没约束）。
    const TO = {
      筛选难度: 'chef.recipe.search', 筛选时间: 'chef.recipe.search',
      筛选炊具: 'chef.recipe.search', 筛选状态: 'chef.recipe.search',
      修改步骤: 'chef.recipe.write', 修改食材: 'chef.recipe.write', 导入食谱: 'chef.recipe.write',
      添加派生关系: 'chef.relation.write', 从已有派生新菜: 'chef.relation.write',
      查看派生关系: 'chef.relation.query', 首次使用: 'chef.setup.init',
      批量改: 'chef.data.batch', 备份: 'chef.history.query',
    };
    for (const [phrase, key] of Object.entries(TO)) {
      const entry = WAKE_TABLE.find((e) => e.phrase === phrase);
      assert.ok(entry, phrase + ' 不在表里');
      const ctx = {};
      for (const n of (entry.needs || [])) ctx[n] = 'x';
      assert.equal(routeWakeword(phrase, ctx).key, key, phrase);
      // 缺槽位必须抛（拿掉第一个槽位试）
      if ((entry.needs || []).length) {
        const empty = { ...ctx };
        delete empty[entry.needs[0]];
        assert.throws(() => routeWakeword(phrase, empty), /缺槽位/, phrase + ' 缺 ' + entry.needs[0] + ' 应抛');
      }
    }
    // 预设值跟着词一起下发（筛选四条的维度键照卡面写，不经 `filter` 绕 `cuisine`）
    assert.deepEqual(routeWakeword('筛选难度', { difficulty: '简单' }).params, { difficulty: '简单' });
    assert.deepEqual(routeWakeword('备份', {}).params, { kind: 'backup' });
    assert.deepEqual(routeWakeword('修改食材', { name: '宫保虾球', ingredient: '盐' }).params,
      { op: 'update', target: 'ingredient', name: '宫保虾球', ingredient: '盐' });
  });
  it('错误皆为 ChefPolicyError', () => {
    try { routeWakeword('', {}); assert.fail('应抛'); }
    catch (e) { assert.equal(e.name, 'ChefPolicyError'); }
  });
});
